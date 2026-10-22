import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";
import { GameService } from "../server/src/services/gameService.js";
import { SessionService } from "../server/src/services/sessionService.js";
import { autoSubmit, resolveTurn } from "../server/src/simulation/engine.js";
import type { StoredGame } from "../server/src/types/records.js";
import { MemoryGameStore, TEST_CONFIG } from "./helpers.js";

const services: GameService[] = [];

afterEach(async () => {
    await Promise.all(services.splice(0).map((service) => service.shutdown()));
});

async function serviceWithStore(): Promise<{
    service: GameService;
    store: MemoryGameStore;
    sessions: SessionService;
}> {
    const store = new MemoryGameStore();
    const service = new GameService(store);
    await service.init();
    services.push(service);
    return { service, store, sessions: new SessionService() };
}

async function startDuel(service: GameService, sessions: SessionService) {
    const host = sessions.create("Host");
    const guest = sessions.create("Guest");
    const lobby = await service.createRoom(host.playerId, "Host", TEST_CONFIG);
    await service.joinRoom(lobby.code, guest.playerId, "Guest");
    await service.setReady(lobby.code, host.playerId, true);
    await service.setReady(lobby.code, guest.playerId, true);
    const view = await service.startRoom(lobby.code, host.playerId);
    return { host, guest, lobby, view };
}

function decisionFor(game: StoredGame, slot: 1 | 2, optionIndex = 0) {
    const prompt = game.pending?.prompts[slot];
    const option = prompt?.options[optionIndex];
    if (!prompt || !option) throw new Error(`Sin decisión para el jugador ${slot}.`);
    return {
        turn: game.pending!.turn,
        decisionId: prompt.id,
        optionId: option.id,
        idempotencyKey: `test-${slot}-${game.pending!.turn}-${randomUUID()}`,
    };
}

function fastForward(game: StoredGame): void {
    let guard = 0;
    while (game.status === "playing" && game.pending && guard < 160) {
        autoSubmit(game, 1);
        autoSubmit(game, 2);
        resolveTurn(game);
        guard += 1;
    }
}

describe("servicio de partidas en duelo", () => {
    it("crea la sala, comparte nacimiento y resuelve decisiones simultáneas", async () => {
        const { service } = await serviceWithStore();
        const sessions = new SessionService();
        const { host, guest, lobby, view } = await startDuel(service, sessions);

        expect(lobby.code).toHaveLength(6);
        const preview = await service.previewRoom(lobby.code);
        expect(preview.hostAlias).toBe("Host");
        expect(view.world.birth).toEqual(
            (await service.getGame(view.id, guest.playerId)).world.birth,
        );

        const record = await service.getGameRecordForMember(view.id, host.playerId);
        const hostDecision = decisionFor(record, 1, 0);
        const guestDecision = decisionFor(record, 2, record.pending!.prompts[2]!.options.length > 1 ? 1 : 0);

        const [hostResult, guestResult] = await Promise.all([
            service.submit(record.id, host.playerId, hostDecision),
            service.submit(record.id, guest.playerId, guestDecision),
        ]);
        expect(hostResult.duplicate).toBe(false);
        expect(guestResult.duplicate).toBe(false);
        expect(hostResult.game.turn.number + guestResult.game.turn.number).toBeGreaterThan(0);

        const after = await service.getGame(record.id, host.playerId);
        expect(after.turn.number).toBe(1);
        expect(after.me.character.stats).toBeDefined();
        expect(after.opponent?.character.stats).toBeDefined();
    });

    it("trata los envíos duplicados como idempotentes y no bloquea al rival", async () => {
        const { service } = await serviceWithStore();
        const sessions = new SessionService();
        const { host, guest, view } = await startDuel(service, sessions);
        const record = await service.getGameRecordForMember(view.id, host.playerId);
        const hostDecision = decisionFor(record, 1, 0);

        const first = await service.submit(record.id, host.playerId, hostDecision);
        expect(first.duplicate).toBe(false);
        const repeated = await service.submit(record.id, host.playerId, hostDecision);
        expect(repeated.duplicate).toBe(true);

        const guestDecision = decisionFor(
            await service.getGameRecordForMember(record.id, guest.playerId),
            2,
            0,
        );
        const resolved = await service.submit(record.id, guest.playerId, guestDecision);
        expect(resolved.turnResolved).toBe(true);
        expect(resolved.game.turn.number).toBe(1);
    });

    it("mantiene la presencia, permite abandonar y calcula la revancha al finalizar", async () => {
        const { service, store } = await serviceWithStore();
        const sessions = new SessionService();
        const { host, guest, view } = await startDuel(service, sessions);

        service.addPresence(view.id, 1, "socket-1");
        service.addPresence(view.id, 2, "socket-2");
        expect([...service.getConnectedSlots(view.id)].sort()).toEqual([1, 2]);
        service.removePresence(view.id, 2, "socket-2");
        expect([...service.getConnectedSlots(view.id)]).toEqual([1]);

        const record = await service.getGameRecordForMember(view.id, host.playerId);
        fastForward(record);
        expect(record.status).toBe("finished");
        expect(record.final?.winner).toBeDefined();
        await store.save(record);

        const rematch = await service.rematch(record.id, guest.playerId, DEFAULT_GAME_CONFIG);
        expect(rematch.id).not.toBe(record.id);
        expect(rematch.code).not.toBe((record as StoredGame).code);
        expect(rematch.players.map((player) => player.alias).sort()).toEqual(["Guest", "Host"]);
    });

    it("rechaza pagos y funerales cuando el resultado ya está cerrado", async () => {
        const { service, store } = await serviceWithStore();
        const sessions = new SessionService();
        const { host, view } = await startDuel(service, sessions);
        const record = await service.getGameRecordForMember(view.id, host.playerId);
        fastForward(record);
        expect(record.status).toBe("finished");
        await store.save(record);

        await expect(service.purchase(record.id, host.playerId, {
            action: "repay-debt",
            targetId: "other",
            amount: 1,
            idempotencyKey: "closed-game-payment-001",
        })).rejects.toThrow(/terminado/);
        await expect(service.funeral(record.id, host.playerId, {
            funeralId: "funeral-cerrado",
            choice: "intima",
            idempotencyKey: "closed-game-funeral-001",
        })).rejects.toThrow(/terminado/);
    });


    it("persiste y recupera el estado al reconstruir el servicio con el mismo almacén", async () => {
        const { service, store } = await serviceWithStore();
        const sessions = new SessionService();
        const { host, view } = await startDuel(service, sessions);
        const before = await service.getGame(view.id, host.playerId);

        const restarted = new GameService(store);
        await restarted.init();
        services.push(restarted);
        const after = await restarted.getGame(view.id, host.playerId);

        expect(after.world.birth).toEqual(before.world.birth);
        expect(after.turn.sharedEvents).toEqual(before.turn.sharedEvents);
        expect(after.me.character).toEqual(before.me.character);
    });
});

import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TurnRecord } from "@life-duel/shared";
import {
    JsonGameStore,
    MemoryGameStore,
} from "../server/src/persistence/index.js";
import {
    compactGame,
    decodeStoredGame,
    encodeStoredGame,
    estimateStoredBytes,
} from "../server/src/persistence/compact.js";
import { GameService } from "../server/src/services/gameService.js";
import { makeDuel, makeSolo, TEST_CONFIG } from "./helpers.js";

function longHistory(game: ReturnType<typeof makeDuel>["game"]): TurnRecord[] {
    const base = game.history.at(-1);
    return Array.from({ length: 40 }, (_, index) => ({
        turn: index + 1,
        age: index + 1,
        year: 2000 + index,
        sharedEvents: base?.sharedEvents ?? [],
        players: base?.players ?? {},
        resolvedAt: new Date().toISOString(),
    }));
}

describe("política de persistencia 2.5", () => {
    it("no guarda las vidas individuales y las conserva en memoria", async () => {
        const store = new MemoryGameStore();
        const service = new GameService(store);
        const view = await service.createSolo("solo-player", "Ana", TEST_CONFIG);

        expect(await store.get(view.id)).toBeNull();
        expect(await store.loadAll()).toHaveLength(0);
        expect((await service.getRecord(view.id))?.id).toBe(view.id);
        await service.shutdown();
    });

    it("guarda una sala de duelo y la recupera después de reiniciar", async () => {
        const store = new MemoryGameStore();
        const service = new GameService(store);
        const lobby = await service.createRoom("host-player", "Anfitrión", TEST_CONFIG);
        await service.joinRoom(lobby.code, "guest-player", "Invitada");

        expect(await store.get(lobby.id)).not.toBeNull();

        const restarted = new GameService(store);
        await restarted.init();
        const recovered = await restarted.getRecord(lobby.id);
        expect(recovered?.id).toBe(lobby.id);
        expect(recovered?.code).toBe(lobby.code);
        expect(recovered?.players).toHaveLength(2);
        await restarted.shutdown();
    });

    it("recorta el historial pero conserva todas las instantáneas de puntuación", () => {
        const { game } = makeDuel();
        game.history = longHistory(game);
        const snapshots = game.players.map((player) => player.snapshots.length);

        const compact = compactGame(game);
        expect(compact.history).toHaveLength(24);
        expect(compact.history.at(-1)?.age).toBe(40);
        expect(compact.players.map((player) => player.snapshots.length)).toEqual(snapshots);
    });

    it("comprime el estado y lo reconstruye sin perder el identificador", () => {
        const { game } = makeDuel();
        game.history = longHistory(game);
        const raw = Buffer.byteLength(JSON.stringify(game), "utf8");
        const encoded = encodeStoredGame(game);

        expect(encoded.zip.length).toBeLessThan(raw);
        expect(decodeStoredGame(encoded)?.id).toBe(game.id);
        expect(estimateStoredBytes(game)).toBeLessThan(raw);
        expect(decodeStoredGame({ id: game.id })).toBeNull();
    });

    it("sigue jugando en memoria si el almacén falla", async () => {
        class BrokenStore extends MemoryGameStore {
            override async save(): Promise<void> {
                throw new Error("cuota agotada");
            }
        }
        const service = new GameService(new BrokenStore());
        const lobby = await service.createRoom("host-player", "Anfitrión", TEST_CONFIG);

        expect(lobby.id).toBeTruthy();
        expect(service.getPersistenceInfo().degraded).toBe(true);
        expect((await service.getRecord(lobby.id))?.id).toBe(lobby.id);
        await service.shutdown();
    });

    it("lista solo salas de duelo de la sesión", async () => {
        const service = new GameService(new MemoryGameStore());
        await service.createSolo("host-player", "Anfitrión", TEST_CONFIG);
        const room = await service.createRoom("host-player", "Anfitrión", TEST_CONFIG);

        const list = await service.listMine("host-player");
        expect(list.map((summary) => summary.id)).toEqual([room.id]);
        await service.shutdown();
    });

    it("purga vidas individuales y salas terminadas antiguas sin tocar las activas", async () => {
        const dir = await mkdtemp(join(tmpdir(), "life-duel-prune-"));
        try {
            const store = new JsonGameStore(join(dir, "games.json"));
            await store.init();
            const solo = makeSolo();
            const finished = makeDuel().game;
            finished.status = "finished";
            finished.updatedAt = new Date(Date.now() - 48 * 3600_000).toISOString();
            const active = makeDuel().game;
            await store.save(solo);
            await store.save(finished);
            await store.save(active);

            const removed = await store.prune({
                solo: true,
                finishedBefore: new Date(Date.now() - 24 * 3600_000),
            });

            expect(removed).toBe(2);
            expect(await store.get(solo.id)).toBeNull();
            expect(await store.get(finished.id)).toBeNull();
            expect(await store.get(active.id)).not.toBeNull();
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});

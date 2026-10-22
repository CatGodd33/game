import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";
import { createApp } from "../server/src/app.js";
import { JsonGameStore } from "../server/src/persistence/jsonStore.js";
import { GameService } from "../server/src/services/gameService.js";
import { NarrativeService } from "../server/src/services/narrativeService.js";
import { SessionService } from "../server/src/services/sessionService.js";
import {
    autoSubmit,
    createSoloGame,
    resolveTurn,
} from "../server/src/simulation/engine.js";
import { MemoryGameStore, TEST_CONFIG, makeSolo } from "./helpers.js";

const temporaryDirectories: string[] = [];

async function temporaryStorePath(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), "life-duel-store-"));
    temporaryDirectories.push(directory);
    return join(directory, "games.json");
}

afterEach(async () => {
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) =>
            rm(directory, { recursive: true, force: true }),
        ),
    );
});

function playSoloToEnd(game: ReturnType<typeof makeSolo>): void {
    let guard = 0;
    while (game.status === "playing" && game.pending && guard < 150) {
        autoSubmit(game, 1);
        resolveTurn(game);
        guard += 1;
    }
}

function dependencies() {
    const store = new MemoryGameStore();
    const gameService = new GameService(store);
    const sessionService = new SessionService();
    const narrativeService = new NarrativeService(gameService);
    const app = createApp({ gameService, narrativeService, sessionService });
    return { app, store, gameService, sessionService, narrativeService };
}

describe("persistencia JSON", () => {
    it("recupera una partida completa después de reiniciar el almacén", async () => {
        const path = await temporaryStorePath();
        const original = makeSolo("persistencia-exacta-01");
        for (let turn = 0; turn < 3; turn += 1) {
            autoSubmit(original, 1);
            resolveTurn(original);
        }

        const first = new JsonGameStore(path);
        await first.init();
        await first.save(original);

        const second = new JsonGameStore(path);
        await second.init();
        const restored = await second.get(original.id);

        expect(restored).not.toBeNull();
        expect(restored?.seed).toBe(original.seed);
        expect(restored?.birth).toEqual(original.birth);
        expect(restored?.world).toEqual(original.world);
        expect(restored?.pending).toEqual(original.pending);
        expect(restored?.history).toEqual(original.history);
        const originalFinance = original.players[0]!.character!.finance;
        const restoredFinance = restored!.players[0]!.character!.finance;
        expect(restoredFinance.money).toBe(originalFinance.money);
        expect(restoredFinance.debt).toBe(originalFinance.debt);
        expect(restoredFinance.annualIncome).toBe(originalFinance.annualIncome);
        expect(restoredFinance.ledger).toHaveLength(originalFinance.ledger.length);
        expect(restoredFinance.ledger.map((entry) => entry.label)).toEqual(
            originalFinance.ledger.map((entry) => entry.label),
        );
        expect(restored?.players[0]?.decisions).toEqual(original.players[0]?.decisions);
    });

    it("preserva la partida al guardar de nuevo y permite borrarla", async () => {
        const path = await temporaryStorePath();
        const store = new JsonGameStore(path);
        await store.init();
        const game = makeSolo("persistencia-guardado-02");
        await store.save(game);
        await store.save(game);

        const reloaded = new JsonGameStore(path);
        await reloaded.init();
        expect(await reloaded.findByCode("NOEXISTE")).toBeNull();
        expect((await reloaded.get(game.id))?.id).toBe(game.id);

        await reloaded.delete(game.id);
        const afterDelete = new JsonGameStore(path);
        await afterDelete.init();
        expect(await afterDelete.get(game.id)).toBeNull();
    });

    it("conserva una copia del archivo si está corrupto y arranca vacío", async () => {
        const path = await temporaryStorePath();
        await writeFile(path, "{ esto no es json", "utf8");
        const store = new JsonGameStore(path);
        await store.init();

        expect(await store.loadAll()).toEqual([]);
        const files = await readdir(join(path, ".."));
        expect(files.some((file) => file.includes(".corrupt-"))).toBe(true);
        const recovered = JSON.parse(await readFile(path, "utf8")) as { games: unknown[] };
        expect(recovered.games).toEqual([]);
    });
});

describe("API HTTP y validación", () => {
    it("rechaza sesiones y entradas inválidas", async () => {
        const { app } = dependencies();

        const noSession = await request(app).post("/api/games").send({ config: DEFAULT_GAME_CONFIG });
        expect(noSession.status).toBe(401);
        expect(noSession.body.error.code).toBe("UNAUTHORIZED");

        const badAlias = await request(app).post("/api/session").send({ alias: "A" });
        expect(badAlias.status).toBe(400);
        expect(badAlias.body.error.code).toBe("VALIDATION_ERROR");

        const session = await request(app).post("/api/session").send({ alias: "Host" });
        expect(session.status).toBe(201);
        expect(typeof session.body.token).toBe("string");

        const invalidWeights = structuredClone(DEFAULT_GAME_CONFIG);
        invalidWeights.scoringWeights.health = 99;
        const badConfig = await request(app)
            .post("/api/games")
            .set("Authorization", `Bearer ${session.body.token}`)
            .send({ config: invalidWeights, alias: "Host" });
        expect(badConfig.status).toBe(400);
        expect(badConfig.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("crea una vida, impide el acceso ajeno y aplica la validación de decisiones", async () => {
        const { app } = dependencies();
        const host = await request(app).post("/api/session").send({ alias: "Host" });
        const intruder = await request(app).post("/api/session").send({ alias: "Intruso" });

        const created = await request(app)
            .post("/api/games")
            .set("Authorization", `Bearer ${host.body.token}`)
            .send({ config: TEST_CONFIG, alias: "Host" });
        expect(created.status).toBe(201);
        const gameId = created.body.game.id as string;
        expect(created.body.game.mode).toBe("solo");

        const foreignRead = await request(app)
            .get(`/api/games/${gameId}`)
            .set("Authorization", `Bearer ${intruder.body.token}`);
        expect(foreignRead.status).toBe(403);

        const invalidDecision = await request(app)
            .post(`/api/games/${gameId}/decision`)
            .set("Authorization", `Bearer ${host.body.token}`)
            .send({
                turn: 0,
                decisionId: "invalida",
                optionId: "invalida",
                idempotencyKey: "clave con espacios",
            });
        expect(invalidDecision.status).toBe(400);

        const history = await request(app)
            .get(`/api/games/${gameId}/history`)
            .set("Authorization", `Bearer ${host.body.token}`);
        expect(history.status).toBe(200);
    });

    it("sirve un epílogo local verificable al terminar la vida", async () => {
        const { app, store, sessionService } = dependencies();
        const host = await request(app).post("/api/session").send({ alias: "Host" });
        const claims = sessionService.verify(host.body.token);
        const finished = createSoloGame(
            randomUUID(),
            claims.playerId,
            "Host",
            { ...DEFAULT_GAME_CONFIG, maxAge: 60, fixedCountry: "ESP", countryMode: "fixed" },
            "epilogo-local-01",
        );
        playSoloToEnd(finished);
        expect(finished.status).toBe("finished");
        await store.save(finished);

        const narrative = await request(app)
            .post(`/api/games/${finished.id}/narrative`)
            .set("Authorization", `Bearer ${host.body.token}`)
            .send({ kind: "final" });
        expect(narrative.status).toBe(200);
        expect(narrative.body.source).toBe("local");
        expect(narrative.body.text.length).toBeGreaterThan(40);
    });
});

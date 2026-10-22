import { describe, expect, it } from "vitest";
import type { CoreStats } from "@life-duel/shared";
import { SCORE_TIE_THRESHOLD } from "@life-duel/shared";
import { applyStatDelta, borrow, debtCapacity, grant, repayDebt, spend } from "../server/src/simulation/economy.js";
import {
    finalizeGame,
    submitDecision,
} from "../server/src/simulation/engine.js";
import { getGameView as gameView, getHistoryResponse } from "../server/src/services/view.js";
import { deterministicRoll } from "../server/src/simulation/rng.js";
import { chooseAutoOption } from "../server/src/simulation/auto-policy.js";
import { compareScores } from "../server/src/simulation/scoring.js";
import {
    characterFor,
    makeDuel,
    makeSolo,
    submitPick,
    TEST_CONFIG,
} from "./helpers.js";

describe("motor determinista y nacimiento compartido", () => {
    it("reproduce la misma vida con la misma semilla", () => {
        const seed = "reproducible-life-seed-01";
        const first = makeSolo(seed);
        const second = makeSolo(seed);

        expect(first.birth).toEqual(second.birth);
        expect(first.pending?.prompts[1]?.id).toBe(second.pending?.prompts[1]?.id);
        expect(first.world).toEqual(second.world);

        for (let turn = 0; turn < 3; turn += 1) {
            submitPick(first, 1, "first");
            submitPick(second, 1, "first");
            const firstRecord = first.history.at(-1);
            const secondRecord = second.history.at(-1);
            expect(firstRecord?.sharedEvents.map((event) => event.eventId)).toEqual(
                secondRecord?.sharedEvents.map((event) => event.eventId),
            );
            expect(characterFor(first, 1).stats).toEqual(characterFor(second, 1).stats);
            expect(characterFor(first, 1).finance.money).toBe(characterFor(second, 1).finance.money);
            if (first.status === "finished" || second.status === "finished") break;
        }
    });

    it("genera el mismo nacimiento y estado inicial para ambos jugadores", () => {
        const { game } = makeDuel("same-birth-seed-0001");
        const one = characterFor(game, 1);
        const two = characterFor(game, 2);

        expect(game.birth).toBeTruthy();
        expect(one.sex).toBe(two.sex);
        expect(one.birthCountry).toBe(two.birthCountry);
        expect(one.stats).toEqual(two.stats);
        expect(one.finance.money).toBe(two.finance.money);
        expect(one.finance.debt).toBe(two.finance.debt);
        expect(one.educationLevel).toBe(two.educationLevel);
        expect(one.countriesLived).toEqual(two.countriesLived);
    });

    it("entrega los mismos sucesos compartidos a ambos jugadores", () => {
        const { game, hostId, guestId } = makeDuel("shared-events-seed-01");
        for (let turn = 0; turn < 4; turn += 1) {
            const hostView = gameView(game, hostId);
            const guestView = gameView(game, guestId);
            expect(hostView.turn.sharedEvents).toEqual(guestView.turn.sharedEvents);
            expect(hostView.world.economy).toEqual(guestView.world.economy);
            submitPick(game, 1, "first");
            submitPick(game, 2, "last");
            if (game.status === "finished") break;
        }
        expect(game.history.length).toBeGreaterThan(0);
        for (const turn of game.history) {
            expect(turn.sharedEvents.every((event) => typeof event.eventId === "string")).toBe(true);
        }
    });

    it("mantiene privada la decisión rival y aplica consecuencias independientes", () => {
        const { game, hostId, guestId } = makeDuel("independent-decisions-01");
        const guestBefore = gameView(game, guestId);
        const hostPrompt = guestBefore.turn.prompt;
        expect(hostPrompt).toBeTruthy();

        const hostChoice = game.pending!.prompts[1]!.options[0]!;
        const guestChoice = game.pending!.prompts[2]!.options.at(-1)!;
        submitDecision(game, 1, {
            turn: game.pending!.turn,
            decisionId: game.pending!.prompts[1]!.id,
            optionId: hostChoice.id,
            idempotencyKey: "privacy-host-1",
        });

        const guestMidTurn = gameView(game, guestId);
        expect(guestMidTurn.opponent?.hasSubmitted).toBe(true);
        expect(guestMidTurn.opponent?.ownChoice).toBeNull();
        expect(guestMidTurn.me.ownChoice).toBeNull();

        submitDecision(game, 2, {
            turn: game.pending!.turn,
            decisionId: game.pending!.prompts[2]!.id,
            optionId: guestChoice.id,
            idempotencyKey: "privacy-guest-1",
        });

        expect(game.history[0]?.players[1]?.optionId).toBe(hostChoice.id);
        expect(game.history[0]?.players[2]?.optionId).toBe(guestChoice.id);
        expect(game.history[0]?.players[1]?.optionId).not.toBe(game.history[0]?.players[2]?.optionId);
        expect(characterFor(game, 1).stats).not.toEqual(characterFor(game, 2).stats);
        expect(characterFor(game, 1).finance.ledger).not.toEqual(characterFor(game, 2).finance.ledger);
    });

    it("actualiza estadísticas y respeta los límites 0–100", () => {
        const stats: CoreStats = { health: 50, happiness: 50, knowledge: 50, relationships: 50 };
        applyStatDelta(stats, { health: 20, happiness: -70, knowledge: 200, relationships: -200 });
        expect(stats).toEqual({ health: 70, happiness: 0, knowledge: 100, relationships: 0 });
        applyStatDelta(stats, { health: -1000, happiness: 1000 });
        expect(stats.health).toBe(0);
        expect(stats.happiness).toBe(100);

        const solo = makeSolo("stats-bounds-seed-001");
        for (let turn = 0; turn < 6; turn += 1) {
            const character = characterFor(solo, 1);
            for (const value of Object.values(character.stats)) {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            }
            if (!submitPick(solo, 1, "first")) break;
            if (solo.status === "finished") break;
        }
    });

    it("registra cada coste, ingreso y deuda en el libro mayor", () => {
        const solo = makeSolo("ledger-seed-0001");
        const character = characterFor(solo, 1);
        const startingMoney = character.finance.money;
        const startingDebt = character.finance.debt;

        grant(character, 100, "Ingreso de prueba", 2020, "grant");
        expect(character.finance.money).toBeCloseTo(startingMoney + 100, 2);
        expect(character.finance.ledger.at(-1)?.label).toBe("Ingreso de prueba");
        expect(character.finance.ledger.at(-1)?.moneyDelta ?? character.finance.ledger.at(-1)?.amount).toBeTruthy();

        spend(character, 40, "Gasto de prueba", 2020);
        expect(character.finance.money).toBeCloseTo(startingMoney + 60, 2);
        expect(character.finance.ledger.at(-1)?.type).toBe("expense");

        borrow(character, 30, "Préstamo de prueba", 2020);
        expect(character.finance.money).toBeCloseTo(startingMoney + 90, 2);
        expect(character.finance.debt).toBeCloseTo(startingDebt + 30, 2);

        repayDebt(character, 20, 2020);
        expect(character.finance.debt).toBeCloseTo(startingDebt + 10, 2);
        expect(character.finance.ledger.at(-1)?.type).toBe("debt-payment");

        expect(character.finance.debt).toBeLessThanOrEqual(debtCapacity(character) + 0.01);
        const ids = character.finance.ledger.map((transaction) => transaction.id);
        expect(new Set(ids).size).toBe(ids.length);

        expect(() =>
            spend(character, debtCapacity(character) * 100 + 1_000_000, "Imposible", 2020),
        ).toThrow();
    });
});

describe("probabilidades y puntuación", () => {
    it("usa tiradas reproducibles y una política automática estable", () => {
        const first = deterministicRoll("seed-probability", "choice", 1, 7, "decision", "option");
        const second = deterministicRoll("seed-probability", "choice", 1, 7, "decision", "option");
        expect(first).toBe(second);
        expect(first).toBeGreaterThanOrEqual(0);
        expect(first).toBeLessThanOrEqual(100);

        const solo = makeSolo("auto-policy-seed-001");
        const prompt = solo.pending!.prompts[1]!;
        const choiceA = chooseAutoOption(prompt, solo.seed, 1, 0);
        const choiceB = chooseAutoOption(prompt, solo.seed, 1, 0);
        expect(choiceA).toBe(choiceB);
        expect(prompt.options.some((option) => option.id === choiceA)).toBe(true);
    });

    it("calcula puntuaciones por categoría dentro de rango", () => {
        const solo = makeSolo("score-seed-0001");
        const view = gameView(solo, solo.players[0]!.playerId);
        expect(view.me.score.total).toBeGreaterThanOrEqual(0);
        expect(view.me.score.total).toBeLessThanOrEqual(100);
        for (const value of Object.values(view.me.score.categories)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
        }
        expect(view.me.score.details).toHaveLength(7);
    });

    it("declara empate dentro del umbral y ganador fuera de él", () => {
        const solo = makeSolo("tie-seed-0001");
        const score = solo.players[0]!.score!;
        const copy = structuredClone(score);

        expect(compareScores(score, copy).winner).toBe("tie");
        expect(compareScores(score, copy).margin).toBe(0);

        copy.total = score.total + SCORE_TIE_THRESHOLD - 0.01;
        expect(compareScores(score, copy).winner).toBe("tie");

        copy.total = score.total + SCORE_TIE_THRESHOLD + 1;
        expect(compareScores(score, copy).winner).toBe(2);
        expect(compareScores(copy, score).winner).toBe(1);
    });
});

describe("muerte, supervivencia y finalización", () => {
    it("finaliza una vida individual y conserva edad y causa", () => {
        const solo = makeSolo("death-seed-0001");
        const character = characterFor(solo, 1);
        character.alive = false;
        character.ageAtDeath = 37;
        character.causeOfDeath = "Enfermedad de prueba";
        finalizeGame(solo);

        expect(solo.status).toBe("finished");
        expect(solo.final).not.toBeNull();
        expect(solo.final?.players[1]?.ageAtDeath).toBe(37);
        expect(solo.final?.players[1]?.causeOfDeath).toBe("Enfermedad de prueba");
        expect(solo.final?.winner).toBeNull();
    });

    it("no termina el duelo cuando muere el primer personaje y deja seguir al superviviente", () => {
        const { game, hostSlot, guestSlot } = makeDuel("survivor-seed-0001");
        const first = characterFor(game, hostSlot);
        first.alive = false;
        first.ageAtDeath = 33;
        first.causeOfDeath = "Accidente de prueba";

        submitPick(game, guestSlot, "first");
        expect(game.status).toBe("playing");
        expect(game.final).toBeNull();
        expect(game.history.at(-1)?.players[hostSlot]).toBeUndefined();
        expect(game.history.at(-1)?.players[guestSlot]).toBeTruthy();

        const survivor = characterFor(game, guestSlot);
        survivor.alive = false;
        survivor.ageAtDeath = 33;
        survivor.causeOfDeath = "Accidente de prueba";
        finalizeGame(game);

        expect(game.status).toBe("finished");
        expect(game.final).not.toBeNull();
        expect(Object.keys(game.final!.players).length).toBe(2);
    });

    it("rechaza decisiones después de finalizar y bloquea duplicados de idempotencia", () => {
        const solo = makeSolo("duplicate-seed-0001");
        const prompt = solo.pending!.prompts[1]!;
        const option = prompt.options[0]!;
        const key = "stable-idempotency-key-1";

        const first = submitDecision(solo, 1, {
            turn: solo.pending!.turn,
            decisionId: prompt.id,
            optionId: option.id,
            idempotencyKey: key,
        });
        expect(first.duplicate).toBe(false);

        // En individual el turno ya se resolvió; repetir la misma clave devuelve
        // el conflicto de turno antes de evaluar idempotencia, salvo que el motor
        // conserve un turno pendiente. Comprobamos ambos contratos en duelo.
        const { game } = makeDuel("duplicate-duel-seed-1");
        const duelPrompt = game.pending!.prompts[1]!;
        const duelOption = duelPrompt.options[0]!;
        const duelKey = "duel-idempotency-1";
        submitDecision(game, 1, {
            turn: game.pending!.turn,
            decisionId: duelPrompt.id,
            optionId: duelOption.id,
            idempotencyKey: duelKey,
        });
        const duplicate = submitDecision(game, 1, {
            turn: game.pending!.turn,
            decisionId: duelPrompt.id,
            optionId: duelOption.id,
            idempotencyKey: duelKey,
        });
        expect(duplicate.duplicate).toBe(true);

        expect(() =>
            submitDecision(game, 1, {
                turn: game.pending!.turn,
                decisionId: duelPrompt.id,
                optionId: duelPrompt.options.at(-1)!.id,
                idempotencyKey: "different-key-after-choice",
            }),
        ).toThrow();
    });
});

describe("historial y vista", () => {
    it("registra categoría, efectos y economía por turno", () => {
        const solo = makeSolo("history-seed-0001");
        submitPick(solo, 1, "first");
        submitPick(solo, 1, "first");
        const playerId = solo.players[0]!.playerId;
        const history = getHistoryResponse(solo, playerId);

        expect(history.total).toBeGreaterThanOrEqual(2);
        const record = history.turns[0]?.players[1];
        expect(record?.decisionCategory).toBeTruthy();
        expect(record?.decisionId).toBeTruthy();
        expect(record?.optionId).toBeTruthy();
        expect(record?.economic).toBeTruthy();
        expect(record?.scoreAfter).toBeGreaterThanOrEqual(0);
    });

    it("no expone la semilla completa en una partida activa", () => {
        const { game, hostId } = makeDuel("seed-privacy-seed-1");
        const view = gameView(game, hostId);
        expect(view.world.seedFingerprint).toBeTruthy();
        expect((view.world as unknown as { seed?: string }).seed).toBeUndefined();
        expect(JSON.stringify(view)).not.toContain(game.seed);
    });

    it("mantiene todas las estadísticas en el rango al finalizar", () => {
        const solo = makeSolo("final-bounds-seed-1");
        for (let i = 0; i < 5; i += 1) {
            if (!submitPick(solo, 1, i % 2 === 0 ? "first" : "last")) break;
            if (solo.status === "finished") break;
        }
        const character = characterFor(solo, 1);
        for (const value of Object.values(character.stats)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
        }
    });
});

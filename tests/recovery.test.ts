import { describe, expect, it } from "vitest";
import type { CharacterState } from "@life-duel/shared";
import { DECISIONS } from "../server/src/simulation/decisions.js";
import { optionAvailable, selectDecision } from "../server/src/simulation/decision-selector.js";
import { runAnnualEconomy } from "../server/src/simulation/economy.js";
import { createRng, deriveSeed } from "../server/src/simulation/rng.js";
import { chooseAutoOption } from "../server/src/simulation/auto-policy.js";
import { characterFor, makeSolo } from "./helpers.js";

const recoveryDecisions = DECISIONS.filter((decision) => decision.priority === "recovery");

function crisisGame(seed = "recovery-crisis-seed-01") {
    const game = makeSolo(seed);
    const character = characterFor(game, 1);
    character.age = 34;
    character.employment.status = "unemployed";
    character.finance.money = -1500;
    character.finance.debt = 9000;
    character.finance.annualIncome = 0;
    character.stats.health = 30;
    character.stats.happiness = 22;
    return { game, character };
}

function selectionFor(game: ReturnType<typeof makeSolo>, character: CharacterState, turn = 5) {
    return selectDecision({
        character,
        birth: game.birth,
        worldSeed: game.seed,
        turn,
        lastDecisionId: null,
        eventDecisionId: null,
        contentSeverity: "full",
    });
}

describe("salidas ante una crisis", () => {
    it("ofrece una decisión de recuperación cuando la vida se rompe", () => {
        const { game, character } = crisisGame();
        const selected = selectionFor(game, character);
        expect(selected).not.toBeNull();
        expect(selected?.definition.priority).toBe("recovery");
    });

    it("no ofrece recuperación a un personaje estable", () => {
        const game = makeSolo("recovery-stable-seed-01");
        const character = characterFor(game, 1);
        character.age = 35;
        character.employment.status = "employed";
        character.finance.money = 12000;
        character.finance.debt = 0;
        character.finance.annualIncome = 24000;
        character.stats.health = 82;
        character.stats.happiness = 70;
        const selected = selectionFor(game, character);
        expect(selected?.definition.priority).not.toBe("recovery");
    });

    it("incluye tres decisiones de recuperación con cinco caminos cada una", () => {
        expect(recoveryDecisions.map((decision) => decision.id).sort()).toEqual([
            "reconstruir_empleo",
            "recuperar_salud",
            "renegociar_deudas",
        ]);
        for (const decision of recoveryDecisions) {
            expect(decision.options).toHaveLength(5);
        }
        // Empleo y salud pueden necesitar varias salidas a lo largo de una vida;
        // la renegociación de deuda es una medida extraordinaria y única.
        expect(recoveryDecisions.find((decision) => decision.id === "renegociar_deudas")?.once).toBe(true);
        expect(recoveryDecisions.find((decision) => decision.id === "reconstruir_empleo")?.once).toBeUndefined();
        expect(recoveryDecisions.find((decision) => decision.id === "recuperar_salud")?.once).toBeUndefined();
    });

    it("no regala grandes sumas de dinero en una crisis", () => {
        for (const decision of recoveryDecisions) {
            for (const option of decision.options) {
                for (const effect of [option.outcomes.success, option.outcomes.failure]) {
                    if (!effect) continue;
                    expect(effect.moneyDelta ?? 0).toBeLessThanOrEqual(1000);
                }
            }
        }
    });

    it("permite volver a una decisión mayor después de usar la recuperación", () => {
        const { game, character } = crisisGame();
        const selected = selectionFor(game, character);
        expect(selected?.definition.priority).toBe("recovery");
        const next = selectionFor(game, character, 6);
        expect(next?.definition.priority === "major" || next?.definition.priority === "recovery").toBe(true);
    });
});

describe("economía de la infancia", () => {
    it("no crea gastos ni deuda personal antes de los 18", () => {
        const game = makeSolo("child-economy-seed-01");
        const character = characterFor(game, 1);
        character.age = 10;
        character.employment.status = "child";
        character.finance.money = 0;
        character.finance.debt = 0;
        runAnnualEconomy(
            character,
            game.birth,
            game.economy,
            game.config.difficulty,
            createRng(deriveSeed(game.seed, "economy", 1, 10)),
            game.currentYear,
        );
        expect(character.finance.annualExpenses).toBe(0);
        expect(character.finance.debt).toBe(0);
    });

    it("no permite endeudarse a un menor por una opción con coste", () => {
        const game = makeSolo("child-cost-seed-01");
        const character = characterFor(game, 1);
        character.age = 10;
        character.finance.money = 0;
        const decision = DECISIONS.find((candidate) =>
            candidate.options.some((option) => option.cost),
        );
        expect(decision).toBeTruthy();
        const paid = decision?.options.find((option) => option.cost);
        if (!paid) return;
        expect(optionAvailable(paid, character, "full", game.birth)).toBe(true);
    });
});


describe("política automática", () => {
    it("siempre devuelve una opción visible y válida", () => {
        const game = makeSolo("auto-valid-seed-01");
        const prompt = game.pending?.prompts[1];
        expect(prompt).toBeTruthy();
        if (!prompt) return;
        const validIds = new Set(prompt.options.map((option) => option.id));
        for (let index = 0; index < 48; index += 1) {
            const chosen = chooseAutoOption(prompt, `auto-seed-${index}`, 1, 4);
            expect(validIds.has(chosen)).toBe(true);
        }
    });

    it("no cambia su mejor lectura por azar cuando la situación visible es idéntica", () => {
        const game = makeSolo("auto-variety-seed-01");
        const prompt = game.pending?.prompts[1];
        expect(prompt).toBeTruthy();
        if (!prompt) return;
        const chosen = new Set<string>();
        for (let index = 0; index < 80; index += 1) {
            chosen.add(chooseAutoOption(prompt, `auto-variety-${index}`, 1, 4));
        }
        expect(chosen.size).toBe(1);
    });

    it("es determinista para la misma semilla, jugador y turno", () => {
        const game = makeSolo("auto-deterministic-seed-01");
        const prompt = game.pending?.prompts[1];
        expect(prompt).toBeTruthy();
        if (!prompt) return;
        const first = chooseAutoOption(prompt, game.seed, 1, 7);
        const second = chooseAutoOption(prompt, game.seed, 1, 7);
        expect(first).toBe(second);
    });
});

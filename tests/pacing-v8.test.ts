import { describe, expect, it } from "vitest";
import { submitDecision } from "../server/src/simulation/engine.js";
import { createSoloGame, resolveTurn } from "../server/src/simulation/engine.js";
import {
    EVENT_DECISION_GAP_YEARS,
    buildPrompt,
    decisionEligible,
    selectDecision,
} from "../server/src/simulation/decision-selector.js";
import { DECISION_VARIANTS, chooseDecisionVariant } from "../server/src/simulation/decision-variants.js";
import { getDecision } from "../server/src/simulation/decisions.js";
import {
    businessOpportunityPool,
    lastBusinessAge,
} from "../server/src/simulation/monthly-opportunities.js";
import { TEST_CONFIG, characterFor, makeSolo } from "./helpers.js";

describe("ritmo narrativo v8", () => {
    it("usa el banco de variantes y elige la misma redacción para ambos jugadores", () => {
        const game = makeSolo("pacing-variant-seed");
        const character = characterFor(game, 1);
        character.age = 30;
        const decision = getDecision("primer_negocio")!;

        const first = buildPrompt(decision, character, "full", undefined, game.birth, {
            worldSeed: "pacing-variant-seed",
            turn: 9,
            slot: 1,
        })!;
        const second = buildPrompt(decision, character, "full", undefined, game.birth, {
            worldSeed: "pacing-variant-seed",
            turn: 9,
            slot: 2,
        })!;

        expect(first.title).toBe(second.title);
        expect(first.title).not.toBe(decision.title);
        expect(first.options.map((option) => option.id)).toEqual(
            second.options.map((option) => option.id),
        );
        expect(
            DECISION_VARIANTS[decision.id]?.some((variant) => variant.title === first.title),
        ).toBe(true);
        expect(chooseDecisionVariant(decision, "pacing-variant-seed", 9)).toEqual(
            chooseDecisionVariant(decision, "pacing-variant-seed", 9),
        );
    });

    it("describe el suceso concreto, no solo el tipo de decisión compartida", () => {
        const game = makeSolo("pacing-event-variant-seed");
        const character = characterFor(game, 1);
        character.age = 40;
        const decision = getDecision("respuesta_desastre")!;

        const storm = buildPrompt(decision, character, "full", "desastre_natural", game.birth, {
            worldSeed: "pacing-event-variant-seed",
            turn: 12,
        })!;
        const earthquake = buildPrompt(decision, character, "full", "terremoto", game.birth, {
            worldSeed: "pacing-event-variant-seed",
            turn: 12,
        })!;

        expect(storm.title).not.toBe(decision.title);
        expect(earthquake.title).not.toBe(decision.title);
        expect(storm.title).not.toBe(earthquake.title);
        expect(storm.options.map((option) => option.id)).toEqual(
            earthquake.options.map((option) => option.id),
        );
    });

    it("aplica cooldown por decisión de evento y un intervalo global entre eventos", () => {
        const game = makeSolo("pacing-event-cooldown-seed");
        const character = characterFor(game, 1);
        character.age = 34;
        const crisis = getDecision("respuesta_crisis")!;
        const dismissal = getDecision("respuesta_despido")!;

        character.lastDecisionAges = { respuesta_crisis: 30 };
        expect(decisionEligible(crisis, character, "full", true, game.birth)).toBe(false);

        character.lastDecisionAges = { respuesta_crisis: 15 };
        expect(decisionEligible(crisis, character, "full", true, game.birth)).toBe(true);

        character.lastDecisionAges = { respuesta_crisis: 33 };
        const selected = selectDecision({
            character,
            birth: game.birth,
            worldSeed: "pacing-event-cooldown-seed",
            turn: 34,
            lastDecisionId: null,
            eventDecisionId: "respuesta_despido",
            contentSeverity: "full",
        });
        expect(EVENT_DECISION_GAP_YEARS).toBeGreaterThanOrEqual(3);
        expect(selected?.definition.id).not.toBe(dismissal.id);
    });

    it("mantiene un calendario de infancia y adolescencia con hitos repartidos", () => {
        const game = createSoloGame(
            "pacing-calendar",
            "calendar-player",
            "Calendario",
            { ...TEST_CONFIG, storyMode: true, monthlyMode: false, maxAge: 60 },
            "pacing-calendar-seed",
        );
        const promptAges: number[] = [];

        for (let guard = 0; guard < 40 && game.status === "playing" && game.age <= 18; guard += 1) {
            const prompt = game.pending?.prompts[1];
            if (prompt) {
                promptAges.push(game.age);
                submitDecision(game, 1, {
                    turn: game.pending!.turn,
                    decisionId: prompt.id,
                    optionId: prompt.options[0]!.id,
                    idempotencyKey: `calendar-${guard}`,
                });
            }
            resolveTurn(game);
        }

        expect(promptAges).toEqual(expect.arrayContaining([2, 4, 6, 8, 10, 12, 14, 16, 18]));
    });

    it("amplía el pool de empresa y comparte el espaciado entre negocios", () => {
        const gastronomy = businessOpportunityPool("gastronomia", false);
        expect(gastronomy).toEqual(
            expect.arrayContaining(["company_food_margin", "company_partner_review", "empresa_crecer"]),
        );
        expect(gastronomy).not.toContain("clinica_cobros");

        const exportRoute = businessOpportunityPool("comercio", true);
        expect(exportRoute).toContain("exportacion_condiciones");
        expect(exportRoute).toContain("empresa_crisis");

        const character = characterFor(makeSolo("pacing-business-seed"), 1);
        character.lastDecisionAges = { company_food_margin: 20, empresa_crecer: 25 };
        expect(lastBusinessAge(character)).toBe(25);
    });

    it("el banco narrativo de empresa también está conectado", () => {
        const decision = getDecision("company_food_margin")!;
        const variant = chooseDecisionVariant(decision, "pacing-company-variant", 4);
        expect(variant).toBeDefined();
        expect(variant?.title).not.toBe(decision.title);
        expect(
            DECISION_VARIANTS[decision.id]?.some((entry) => entry.title === variant?.title),
        ).toBe(true);
    });
});

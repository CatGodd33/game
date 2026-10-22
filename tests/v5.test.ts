import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "@life-duel/shared";
import { chooseAutoOption } from "../server/src/simulation/auto-policy.js";
import { advanceBusiness, endBusiness, startBusiness } from "../server/src/simulation/business.js";
import { buildPrompt, decisionEligible, requirementsMet } from "../server/src/simulation/decision-selector.js";
import { getDecision } from "../server/src/simulation/decisions.js";
import { DECISION_VARIANTS, chooseDecisionVariant } from "../server/src/simulation/decision-variants.js";
import { createPet, advancePets } from "../server/src/simulation/pets.js";
import { createRng } from "../server/src/simulation/rng.js";
import { characterFor, makeSolo } from "./helpers.js";

function businessReadyCharacter(seed = "v5-business-seed") {
    const game = makeSolo(seed);
    const character = characterFor(game, 1);
    character.age = 30;
    character.finance.money = 50_000;
    character.finance.annualIncome = 24_000;
    character.finance.annualExpenses = 16_000;
    character.employment.status = "employed";
    character.employment.occupation = "administrativa";
    return { game, character };
}

describe("variantes narrativas y elegibilidad v5", () => {
    it("no sustituye la situación por variantes antiguas sin respuestas revisadas", () => {
        const { game, character } = businessReadyCharacter("variant-seed");
        const decision = getDecision("primer_negocio")!;
        expect(decision).toBeTruthy();

        const variants = new Set<string>();
        let referenceOptions: string[] | null = null;
        let slotsDiffer = false;

        for (let turn = 1; turn <= 12; turn += 1) {
            const titles: string[] = [];
            for (const slot of [1, 2] as const) {
                const prompt = buildPrompt(decision, character, "full", undefined, game.birth, {
                    worldSeed: game.seed,
                    turn,
                    slot,
                });
                expect(prompt).toBeTruthy();
                const ids = prompt!.options.map((option) => option.id);
                if (referenceOptions === null) referenceOptions = ids;
                expect(ids).toEqual(referenceOptions);
                variants.add(prompt!.title);
                titles.push(prompt!.title);
            }
            if (titles[0] !== titles[1]) slotsDiffer = true;
        }

        const authored = new Set([
            decision.title,
            ...(DECISION_VARIANTS[decision.id] ?? []).map((variant) => variant.title),
        ]);
        expect([...variants].every((title) => authored.has(title))).toBe(true);
        expect(variants.size).toBeGreaterThan(1);
        expect(slotsDiffer).toBe(false);
    });

    it("es determinista para la misma semilla y turno", () => {
        const { game, character } = businessReadyCharacter("variant-deterministic-seed");
        const decision = getDecision("primer_negocio")!;
        const context = { worldSeed: game.seed, turn: 7, slot: 2 };
        const first = buildPrompt(decision, character, "full", undefined, game.birth, context);
        const second = buildPrompt(decision, character, "full", undefined, game.birth, context);
        expect(first).toEqual(second);
        expect(chooseDecisionVariant(decision, game.seed, 7, "ESP")).toEqual(
            chooseDecisionVariant(decision, game.seed, 7, "ESP"),
        );
    });

    it("no cambia arbitrariamente el problema por pasar un código de país al redactor", () => {
        const { game, character } = businessReadyCharacter("variant-country-seed");
        const decision = getDecision("primer_negocio")!;
        let differs = false;

        for (let turn = 1; turn <= 12; turn += 1) {
            const base = { worldSeed: game.seed, turn, slot: 1 };
            const spain = buildPrompt(decision, character, "full", undefined, game.birth, {
                ...base,
                countryCode: "ESP",
            })!;
            const france = buildPrompt(decision, character, "full", undefined, game.birth, {
                ...base,
                countryCode: "FRA",
            })!;
            expect(spain.options.map((option) => option.id)).toEqual(
                france.options.map((option) => option.id),
            );
            if (spain.title !== france.title) differs = true;
        }

        expect(differs).toBe(false);
    });

    it("respeta el cooldown de las decisiones de empresa", () => {
        const { game, character } = businessReadyCharacter("cooldown-seed");
        const decision = getDecision("empresa_crecer")!;
        startBusiness(character, "tecnologia", 2026, 2_000);
        character.age = 33;

        expect(decisionEligible(decision, character, "full", false, game.birth)).toBe(true);

        character.lastDecisionAges = { empresa_crecer: 31 };
        expect(decisionEligible(decision, character, "full", false, game.birth)).toBe(false);

        character.lastDecisionAges = { empresa_crecer: 20 };
        expect(decisionEligible(decision, character, "full", false, game.birth)).toBe(true);
    });

    it("usa los padres del registro de nacimiento cuando aún no existe historia familiar", () => {
        const game = makeSolo("parents-fallback-seed");
        const character = characterFor(game, 1);
        const birth = structuredClone(game.birth);
        birth.details!.mother.alive = false;
        birth.details!.father.alive = false;

        expect(requirementsMet(character, { parentsAlive: true }, "full", birth)).toBe(false);
        expect(requirementsMet(character, { parentsAlive: false }, "full", birth)).toBe(true);

        birth.details!.mother.alive = true;
        expect(requirementsMet(character, { parentsAlive: true }, "full", birth)).toBe(true);
    });

    it("detecta mascotas por estado real y por bandera heredada", () => {
        const game = makeSolo("pet-requirement-seed");
        const character = characterFor(game, 1);
        character.pets = [];
        character.flags = (character.flags ?? []).filter((flag) => flag !== "mascota");
        expect(requirementsMet(character, { hasPet: true }, "full", game.birth)).toBe(false);

        createPet(character, { name: "Luna", species: "perro" }, 2026);
        expect(requirementsMet(character, { hasPet: true }, "full", game.birth)).toBe(true);

        const inherited = characterFor(makeSolo("pet-flag-seed"), 1);
        inherited.pets = [];
        inherited.flags = [...new Set([...(inherited.flags ?? []), "mascota"])];
        expect(requirementsMet(inherited, { hasPet: true }, "full")).toBe(true);
    });
});

describe("negocio, mascotas y política automática v5", () => {
    it("ofrece emprender y la política automática elige una apertura con liquidez", () => {
        const { game, character } = businessReadyCharacter("auto-business-seed");
        const decision = getDecision("primer_negocio")!;
        const prompt = buildPrompt(decision, character, "full", undefined, game.birth, {
            worldSeed: game.seed,
            turn: 1,
            slot: 1,
        })!;
        expect(prompt.options.some((option) => option.id === "seguir_sin_negocio")).toBe(true);

        const picks = Array.from({ length: 24 }, (_, index) =>
            chooseAutoOption(prompt, game.seed, 1, index + 1, character),
        );
        expect(picks.some((id) => id.startsWith("abrir_"))).toBe(true);
        expect(picks.every((id) => prompt.options.some((option) => option.id === id))).toBe(true);
    });

    it("genera ingresos de empresa, registra la venta y cierra el negocio", () => {
        const { game, character } = businessReadyCharacter("business-cycle-seed");
        startBusiness(character, "tecnologia", 2026, 2_000);
        expect(character.business?.active).toBe(true);
        expect(character.flags).toContain("negocio_activo");

        const result = advanceBusiness(
            character,
            game.economy,
            2027,
            createRng("business-cycle-market"),
        );
        expect(result).not.toBeNull();
        expect(result!.revenue).toBeGreaterThan(0);
        expect(character.business?.annualRevenue).toBe(result!.revenue);
        expect(character.finance.ledger.some((entry) => entry.label.includes("Beneficio") || entry.label.includes("Pérdidas"))).toBe(true);

        const beforeSale = character.finance.money;
        endBusiness(character, 2028, "Prueba de venta", 5_000);
        expect(character.business?.active).toBe(false);
        expect(character.flags).not.toContain("negocio_activo");
        expect(character.flags).toContain("negocio_cerrado");
        expect(character.finance.money).toBeCloseTo(beforeSale + 5_000, 2);
        expect(character.milestones.some((milestone) => milestone.title.includes("Vendió"))).toBe(true);
    });

    it("crea mascotas y las envejece sin salir de los límites", () => {
        const game = makeSolo("pet-life-seed");
        const character = characterFor(game, 1);
        const pet = createPet(character, { name: "Milo", species: "gato" }, 2026);
        expect(character.pets).toHaveLength(1);
        expect(character.flags).toContain("mascota");
        expect(character.milestones.some((milestone) => milestone.title.includes("Milo"))).toBe(true);

        const rng = createRng("pet-life-rng");
        advancePets(character, rng);
        advancePets(character, rng);
        advancePets(character, rng);
        expect(pet.age).toBe(3);
        expect(pet.health).toBeGreaterThanOrEqual(0);
        expect(pet.health).toBeLessThanOrEqual(100);
    });

    it("arranca con decisiones manuales por defecto", () => {
        expect(DEFAULT_GAME_CONFIG.autoDecisions).toBe(false);
        expect(DEFAULT_GAME_CONFIG.decisionTimerSeconds).toBeGreaterThan(0);
    });
});

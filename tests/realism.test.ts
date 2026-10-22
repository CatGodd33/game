import { describe, expect, it } from "vitest";
import type { LifeStory } from "@life-duel/shared";
import { getCountry } from "../server/src/demographics/dataset.js";
import {
    generateHousehold,
    type HouseholdGenerationInput,
} from "../server/src/simulation/household.js";
import { countryContext } from "../server/src/simulation/realism.js";
import { applyPsychologyDelta, createPsychology } from "../server/src/simulation/psychology.js";
import { advanceBusiness, startBusiness } from "../server/src/simulation/business.js";
import { ensureCredit, updateCredit } from "../server/src/simulation/loans.js";
import { familyYear, settleInheritance } from "../server/src/simulation/family.js";
import { DECISIONS } from "../server/src/simulation/decisions.js";
import { createRng, deriveSeed } from "../server/src/simulation/rng.js";
import { finalizeGame } from "../server/src/simulation/engine.js";
import { characterFor, makeSolo, TEST_CONFIG } from "./helpers.js";

function householdInput(seed: string, code = "ESP", storyMode = true): HouseholdGenerationInput {
    return {
        seed,
        country: getCountry(code),
        year: 2026,
        tier: 3,
        householdSize: 5,
        rural: false,
        motherAge: 31,
        fatherAge: 34,
        motherName: "Elena Prueba",
        fatherName: "Mateo Prueba",
        surname: "Prueba",
        storyMode,
    };
}

describe("modelo de vida realista v2", () => {
    it("genera hogares reproducibles y presupuestos coherentes", () => {
        const first = generateHousehold(householdInput("realism-household-01"));
        const second = generateHousehold(householdInput("realism-household-01"));
        expect(first).toEqual(second);
        expect(first.mother.occupation.length).toBeGreaterThan(0);
        expect(first.father.occupation.length).toBeGreaterThan(0);
        expect(first.annualHouseholdIncome).toBe(first.household.budget.annualIncome);
        expect(first.household.budget.disposableIncome).toBe(
            first.household.budget.annualIncome - first.household.budget.annualExpenses,
        );
        expect(first.household.budget.annualExpenses).toBeLessThanOrEqual(
            first.household.budget.annualIncome,
        );
        expect(first.household.support.level).toBeGreaterThanOrEqual(0);
        expect(first.household.support.level).toBeLessThanOrEqual(100);
        expect(first.household.religiosity).toBeGreaterThanOrEqual(0);
        expect(first.household.religiosity).toBeLessThanOrEqual(100);
    });

    it("solo permite hogares poligínicos en contextos legales y con la religión modelada", () => {
        expect(countryContext("ESP").polygynyLegal).toBe(false);
        expect(countryContext("NGA").polygynyLegal).toBe(true);
        for (let index = 0; index < 24; index += 1) {
            const spain = generateHousehold(householdInput(`poly-spain-${index}`, "ESP"));
            expect(spain.household.structure).not.toBe("compuesta");
            const nigeria = generateHousehold(householdInput(`poly-nigeria-${index}`, "NGA"));
            if (nigeria.household.structure === "compuesta") {
                expect(nigeria.household.context.polygynyLegal).toBe(true);
                expect(nigeria.household.religion).toBe("Islam");
                expect(nigeria.household.additionalMembers.some((member) => member.role === "co-esposa")).toBe(true);
            }
        }
    });

    it("mantiene la psicología dentro de 0 y 100 y responde a los cambios", () => {
        const character = characterFor(makeSolo("psychology-bounds-01"), 1);
        character.psychology = createPsychology(character, 5, 100);
        for (const [key, value] of Object.entries(character.psychology)) {
            expect(value, key).toBeGreaterThanOrEqual(0);
            expect(value, key).toBeLessThanOrEqual(100);
        }
        applyPsychologyDelta(character, {
            resilience: 500,
            selfEsteem: -500,
            stress: 500,
            grief: -500,
        });
        expect(character.psychology?.resilience).toBe(100);
        expect(character.psychology?.selfEsteem).toBe(0);
        expect(character.psychology?.stress).toBe(100);
        expect(character.psychology?.grief).toBe(0);
    });

    it("limita las quiebras personales y no duplica sus banderas", () => {
        const character = characterFor(makeSolo("bankruptcy-cooldown-01"), 1);
        character.finance.debt = 50000;
        character.finance.annualIncome = 10000;
        ensureCredit(character);
        for (let year = 2026; year < 2046; year += 1) {
            updateCredit(character, { insolvent: true, unpaid: 500 }, year);
        }
        expect(character.credit?.bankruptcies).toBeLessThanOrEqual(2);
        expect(character.flags?.filter((flag) => flag === "quiebra_personal")).toHaveLength(1);
        expect(new Set(character.flags ?? []).size).toBe((character.flags ?? []).length);
        expect(character.milestones.filter((milestone) => milestone.title === "Declaró una quiebra personal").length).toBeLessThanOrEqual(2);
    });

    it("registra ingresos y costes del negocio en el libro mayor", () => {
        const character = characterFor(makeSolo("business-ledger-01"), 1);
        character.age = 30;
        character.finance.money = 100000;
        character.finance.annualIncome = 12000;
        const business = startBusiness(character, "comercio", 2026, 40000, "Comercio de prueba");
        expect(business.active).toBe(true);
        expect(character.employment.status).toBe("self-employed");
        expect(character.flags).toContain("negocio_activo");
        const economy = { costOfLivingIndex: 100, unemploymentRate: 8, phase: "estable" as const, inflationRate: 2 };
        const result = advanceBusiness(
            character,
            economy,
            2027,
            createRng(deriveSeed("business-ledger-01", "market")),
        );
        expect(result).not.toBeNull();
        expect(result!.revenue).toBeGreaterThan(0);
        expect(result!.costs).toBeGreaterThan(0);
        expect(
            character.finance.ledger.some(
                (transaction) =>
                    transaction.year === 2027 &&
                    (transaction.label.includes("Beneficio") || transaction.label.includes("Pérdidas")),
            ),
        ).toBe(true);
    });

    it("paga la herencia solo una vez y conserva el historial", () => {
        const game = makeSolo("inheritance-once-01", { ...TEST_CONFIG, storyMode: true });
        const character = characterFor(game, 1);
        const story = character.story as LifeStory;
        for (const relative of story.relatives) {
            if (relative.role === "mother" || relative.role === "father") relative.alive = false;
        }
        story.familySettled = false;
        character.age = 25;
        const year = game.birth.year + 25;
        settleInheritance(character, game.birth, story, year);
        const moneyAfterFirst = character.finance.money;
        const ledgerAfterFirst = character.finance.ledger.length;
        expect(story.familySettled).toBe(true);
        settleInheritance(character, game.birth, story, year + 1);
        expect(character.finance.money).toBe(moneyAfterFirst);
        expect(character.finance.ledger).toHaveLength(ledgerAfterFirst);
    });

    it("no vuelve a cobrar el funeral del mismo pariente", () => {
        const game = makeSolo("funeral-idempotent-01", { ...TEST_CONFIG, storyMode: true });
        const character = characterFor(game, 1);
        const story = character.story as LifeStory;
        const relative = story.relatives.find((entry) => entry.role === "grandmother");
        expect(relative).toBeTruthy();
        relative!.health = 5;
        relative!.bornYear = game.birth.year - 110;
        const year = game.birth.year + 20;
        let funeralCount = 0;
        let deathYear = year;
        for (let offset = 0; offset < 12 && relative!.alive; offset += 1) {
            deathYear = year + offset;
            familyYear(game.seed, game.birth, character, deathYear, TEST_CONFIG);
        }
        expect(relative!.alive).toBe(false);
        expect(relative!.funeralSettled).toBe(true);
        funeralCount = character.finance.ledger.filter((entry) => entry.label.includes("funeral de")).length;
        relative!.alive = true;
        familyYear(game.seed, game.birth, character, deathYear, TEST_CONFIG);
        expect(character.finance.ledger.filter((entry) => entry.label.includes("funeral de"))).toHaveLength(funeralCount);
    });

    it("todas las decisiones ofrecen al menos dos opciones y tienen identificadores únicos", () => {
        const ids = DECISIONS.map((decision) => decision.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const decision of DECISIONS) {
            expect(decision.options.length, decision.id).toBeGreaterThanOrEqual(3);
            expect(decision.title.length, decision.id).toBeGreaterThan(0);
            expect(decision.description.length, decision.id).toBeGreaterThan(0);
        }
        for (const id of [
            "camino_profesional",
            "profesion_medica_caso",
            "profesion_musica_gira",
            "crear_negocio",
            "gestion_negocio",
            "prestamo_familia",
            "padre_en_apuros",
            "prestamo_bancario",
            "oferta_tentadora",
            "robo_oportunidad",
            "conduccion_riesgo",
            "cuidar_padres_mayores",
            "enfermedad_grave",
        ]) {
            expect(ids, id).toContain(id);
        }
    });

    it("incluye psicología, negocio y hogar en el resultado final", () => {
        const game = makeSolo("final-v2-fields-01");
        const character = characterFor(game, 1);
        character.age = 30;
        startBusiness(character, "tecnologia", 2026, 10000, "Estudio final");
        finalizeGame(game);
        const result = game.final?.players[1];
        expect(result?.psychology).toBeDefined();
        expect(result?.business?.name).toBe("Estudio final");
        expect(result?.household).toBeDefined();
        expect(Array.isArray(result?.flags)).toBe(true);
        expect(typeof result?.loanBalance).toBe("number");
        expect(result?.finalMood).toBeTruthy();
    });
});

import { describe, expect, it } from "vitest";
import type { MonthlyStatement } from "@life-duel/shared";
import { characterFor, makeSolo, TEST_CONFIG } from "./helpers.js";
import { applyManualAction } from "../server/src/simulation/spending.js";
import { ensureCredit, takeLoan } from "../server/src/simulation/loans.js";
import { familyYear } from "../server/src/simulation/family.js";
import { resolveFuneral } from "../server/src/simulation/funerals.js";
import { createStory } from "../server/src/simulation/story.js";
import { monthlyStory } from "../server/src/simulation/monthly-story.js";
import { RELATIONSHIP_SCENARIOS } from "../server/src/simulation/relationship-scenarios.js";

function adultCharacter(seed: string) {
    const game = makeSolo(seed);
    const character = characterFor(game, 1);
    character.age = 30;
    character.finance.money = 1000;
    character.finance.annualIncome = 12000;
    character.finance.annualExpenses = 8000;
    character.finance.debt = 0;
    ensureCredit(character);
    return { game, character };
}

describe("deudas y despedidas", () => {
    it("permite pagar una deuda concreta de forma parcial y total", () => {
        const { game, character } = adultCharacter("debt-targeted-payment");
        const loan = takeLoan(character, 500, "banco", "Préstamo de prueba", game.currentYear, 0)!;
        expect(character.finance.money).toBe(1500);
        expect(character.finance.debt).toBe(500);

        applyManualAction(game, character, {
            action: "repay-debt",
            targetId: `loan:${loan.id}`,
            amount: 200,
            idempotencyKey: "repay-partial-001",
        });
        expect(loan.balance).toBe(300);
        expect(character.finance.money).toBe(1300);
        expect(character.finance.debt).toBe(300);
        expect(character.finance.ledger.at(-1)?.type).toBe("debt-payment");

        applyManualAction(game, character, {
            action: "repay-debt",
            targetId: `loan:${loan.id}`,
            amount: 300,
            idempotencyKey: "repay-total-001",
        });
        expect(loan.balance).toBe(0);
        expect(loan.active).toBe(false);
        expect(character.finance.debt).toBe(0);
        expect(character.finance.money).toBe(1000);
    });

    it("rechaza pagos por encima del saldo o del saldo pendiente", () => {
        const { game, character } = adultCharacter("debt-invalid-payment");
        const loan = takeLoan(character, 5000, "banco", "Préstamo grande", game.currentYear, 0)!;
        character.finance.money = 100;
        expect(() => applyManualAction(game, character, {
            action: "repay-debt",
            targetId: `loan:${loan.id}`,
            amount: 5000,
            idempotencyKey: "repay-no-cash-001",
        })).toThrow(/Saldo insuficiente/);

        character.finance.money = 10000;
        expect(() => applyManualAction(game, character, {
            action: "repay-debt",
            targetId: `loan:${loan.id}`,
            amount: 6000,
            idempotencyKey: "repay-too-much-001",
        })).toThrow(/supera el saldo pendiente/);

        expect(loan.balance).toBe(5000);
        expect(character.finance.debt).toBe(5000);
    });

    it("condona un préstamo familiar cuando muere el pariente acreedor", () => {
        const { game, character } = adultCharacter("family-debt-forgiveness");
        character.story = createStory(game.seed, game.birth, game.config);
        const story = character.story;
        const mother = story.relatives.find((relative) => relative.role === "mother")!;
        mother.health = 5;
        mother.bornYear = game.birth.year - 110;
        takeLoan(character, 700, "familia", "Préstamo de la familia", game.birth.year + 10, 0, {
            id: mother.id,
            name: mother.name,
        });
        const bank = takeLoan(character, 200, "banco", "Préstamo bancario", game.birth.year + 10, 0)!;
        expect(character.finance.debt).toBe(900);

        for (let offset = 0; offset < 10 && mother.alive; offset += 1) {
            familyYear(game.seed, game.birth, character, game.birth.year + 30 + offset, TEST_CONFIG);
        }

        expect(mother.alive).toBe(false);
        const family = character.loans!.find((loan) => loan.lender === "familia")!;
        expect(family.active).toBe(false);
        expect(family.balance).toBe(0);
        expect(bank.active).toBe(true);
        expect(character.finance.debt).toBe(200);
        expect(character.finance.ledger.some((entry) => entry.label.includes("Deuda condonada"))).toBe(true);
        expect(character.pendingFunerals?.some((funeral) => funeral.relativeId === mother.id)).toBe(true);
    });

    it("no cobra el funeral hasta que el jugador elige y aplica el coste correcto", () => {
        const { game, character } = adultCharacter("funeral-explicit-choice");
        character.story = createStory(game.seed, game.birth, game.config);
        const mother = character.story.relatives.find((relative) => relative.role === "mother")!;
        mother.health = 5;
        mother.bornYear = game.birth.year - 110;
        for (let offset = 0; offset < 10 && mother.alive; offset += 1) {
            familyYear(game.seed, game.birth, character, game.birth.year + 30 + offset, TEST_CONFIG);
        }
        expect(mother.alive).toBe(false);
        const pending = character.pendingFunerals?.find((funeral) => funeral.relativeId === mother.id)!;
        expect(pending).toBeTruthy();
        expect(character.finance.ledger.some((entry) => entry.label.toLowerCase().includes("funeral"))).toBe(false);

        character.finance.money = 30000;
        character.finance.debt = 0;
        character.stats.happiness = 50;
        const result = resolveFuneral(character, {
            funeralId: pending.id,
            choice: "grande",
            idempotencyKey: "funeral-grande-001",
        }, pending.year);
        expect(result.cost).toBe(Math.max(150, Math.round(pending.baseCost * 1.8)));
        expect(character.finance.money).toBe(30000 - result.cost);
        expect(character.stats.happiness).toBe(52);
        expect(character.pendingFunerals?.some((funeral) => funeral.id === pending.id)).toBe(false);
        expect(character.finance.ledger.some((entry) => entry.label.includes("Funeral"))).toBe(true);

        const duplicate = resolveFuneral(character, {
            funeralId: pending.id,
            choice: "grande",
            idempotencyKey: "funeral-grande-001",
        }, pending.year);
        expect(duplicate.duplicate).toBe(true);
        expect(character.finance.money).toBe(30000 - result.cost);
        expect(() => resolveFuneral(character, {
            funeralId: pending.id,
            choice: "intima",
            idempotencyKey: "funeral-grande-001",
        }, pending.year)).toThrow(/otra decisión/);
    });

    it("una despedida sin ceremonia no cuesta dinero pero afecta al bienestar", () => {
        const { game, character } = adultCharacter("funeral-no-ceremony");
        character.pendingFunerals = [{
            id: "funeral-test-sin",
            relativeId: "grandfather",
            relativeName: "Abuelo de prueba",
            relationship: "tu abuelo",
            year: game.currentYear,
            baseCost: 1000,
        }];
        character.finance.money = 3000;
        character.finance.debt = 0;
        character.stats.happiness = 50;
        character.stats.relationships = 50;
        resolveFuneral(character, {
            funeralId: "funeral-test-sin",
            choice: "sin_ceremonia",
            idempotencyKey: "funeral-none-001",
        }, game.currentYear);
        expect(character.finance.money).toBe(3000);
        expect(character.finance.debt).toBe(0);
        expect(character.stats.happiness).toBe(45);
        expect(character.stats.relationships).toBe(47);
    });

    it("convierte en deuda la parte del funeral que el saldo no cubre", () => {
        const { game, character } = adultCharacter("funeral-partial-debt");
        character.pendingFunerals = [{
            id: "funeral-test-debt",
            relativeId: "grandmother",
            relativeName: "Abuela de prueba",
            relationship: "tu abuela",
            year: game.currentYear,
            baseCost: 600,
        }];
        character.finance.money = 300;
        character.finance.debt = 0;
        character.stats.happiness = 50;

        const result = resolveFuneral(character, {
            funeralId: "funeral-test-debt",
            choice: "grande",
            idempotencyKey: "funeral-debt-001",
        }, game.currentYear);

        expect(result.cost).toBe(1080);
        expect(result.debt).toBe(780);
        expect(character.finance.money).toBe(0);
        expect(character.finance.debt).toBe(780);
        expect(character.stats.happiness).toBe(52);
        expect(character.finance.ledger.some((entry) => entry.label === "Deuda por el funeral de Abuela de prueba")).toBe(true);
    });
});

describe("diario narrativo", () => {
    it("no mezcla resúmenes financieros con la historia y escribe una escena cada mes", () => {
        const { game, character } = adultCharacter("diary-no-finance");
        character.employment.status = "employed";
        character.employment.occupation = "Diseñador/a";
        character.partnerName = "Luis";
        character.manualActions = [];
        for (let month = 1; month <= 12; month += 1) {
            monthlyStory(game, character, { month } as unknown as MonthlyStatement);
        }
        const entries = character.manualActions!.filter((entry) => entry.action === "chronicle");
        expect(entries).toHaveLength(12);
        expect(new Set(entries.map((entry) => entry.month)).size).toBe(12);
        for (const entry of entries) {
            expect(entry.text.length).toBeGreaterThan(80);
            expect(entry.text).not.toMatch(/Entraron \d|origen y cada cargo|Quedaron facturas pendientes|saldo personal no recibe|Ordenaste un rincón/i);
        }
    });
});

describe("encuentros a distancia", () => {
    it("son mucho menos frecuentes que los encuentros presenciales", () => {
        const online = RELATIONSHIP_SCENARIOS.filter((decision) =>
            decision.id === "encuentro_red" || decision.id === "encuentro_intercambio",
        );
        const local = RELATIONSHIP_SCENARIOS.filter((decision) =>
            decision.id.startsWith("encuentro_") && !online.includes(decision),
        );
        expect(online).toHaveLength(2);
        expect(Math.max(...online.map((decision) => decision.weight ?? 1))).toBeLessThan(0.2);
        expect(Math.min(...local.map((decision) => decision.weight ?? 1)) / Math.max(...online.map((decision) => decision.weight ?? 1))).toBeGreaterThan(15);
        expect(Math.min(...local.map((decision) => decision.weight ?? 1))).toBeGreaterThan(3);
        expect(online.every((decision) => decision.requirements?.minEducation === "secondary")).toBe(true);
    });
});

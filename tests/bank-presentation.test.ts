import { describe, expect, it } from "vitest";
import type { MonthlyStatement, Transaction, TransactionType } from "@life-duel/shared";
import {
    balanceAtProgress,
    buildMonthTimeline,
    cashOf,
    monthTotalsAt,
    recentBankMovements,
    toBankMovement,
} from "../client/src/features/bank/bankPresentation";

function transaction(input: {
    id: string;
    label: string;
    type: TransactionType;
    amount: number;
    moneyDelta?: number;
    debtDelta?: number;
    debtAfter?: number;
    month?: number;
}): Transaction {
    const cash = input.moneyDelta ?? input.amount;
    return {
        id: input.id,
        year: 2026,
        age: 30,
        type: input.type,
        label: input.label,
        amount: input.amount,
        moneyDelta: cash,
        debtDelta: input.debtDelta ?? 0,
        month: input.month ?? 3,
        balanceAfter: 10_000 + cash,
        debtAfter: input.debtAfter ?? 0,
    };
}

function statement(): MonthlyStatement {
    return {
        month: 3,
        income: 2500,
        taxes: 300,
        housing: 800,
        food: 300,
        utilities: 120,
        transport: 60,
        health: 40,
        education: 0,
        other: 50,
        debtPayment: 100,
        balance: 2730,
        debt: 1000,
        unpaid: 0,
    };
}

const salary = transaction({
    id: "salary",
    label: "Salario · arquitecta · mes 3",
    type: "income",
    amount: 2500,
    month: 3,
});
const housing = transaction({
    id: "housing",
    label: "Vivienda · mes 3",
    type: "expense",
    amount: -800,
    month: 3,
});
const food = transaction({
    id: "food",
    label: "Alimentación del hogar · mes 3",
    type: "expense",
    amount: -300,
    month: 3,
});
const utilities = transaction({
    id: "utilities",
    label: "Electricidad · mes 3",
    type: "expense",
    amount: -120,
    month: 3,
});
const taxes = transaction({
    id: "taxes",
    label: "Impuestos · mes 3",
    type: "expense",
    amount: -300,
    month: 3,
});
const transport = transaction({
    id: "transport",
    label: "Transporte · mes 3",
    type: "expense",
    amount: -60,
    month: 3,
});
const health = transaction({
    id: "health",
    label: "Salud · mes 3",
    type: "expense",
    amount: -40,
    month: 3,
});
const other = transaction({
    id: "other",
    label: "Otros gastos del hogar · mes 3",
    type: "expense",
    amount: -50,
    month: 3,
});
const debt = transaction({
    id: "debt",
    label: "Cuota hipotecaria · piso · mes 3",
    type: "debt-payment",
    amount: -100,
    moneyDelta: -100,
    debtDelta: -100,
    debtAfter: 1000,
    month: 3,
});

describe("presentación del banco", () => {
    it("extrae el oficio de la nómina sin mostrar el sufijo técnico del mes", () => {
        const movement = toBankMovement(salary);
        expect(movement.title).toBe("Nómina · arquitecta");
        expect(movement.detail).toBe("Salario mensual");
        expect(movement.category).toBe("salary");
        expect(movement.direction).toBe("in");
        expect(movement.value).toBe(2500);
        expect(movement.cash).toBe(2500);
        expect(cashOf(salary)).toBe(2500);
    });

    it("clasifica suministros y empresa con su color de entrada o salida", () => {
        const electricity = toBankMovement(utilities);
        expect(electricity.category).toBe("utilities");
        expect(electricity.direction).toBe("out");
        expect(electricity.title).toBe("Electricidad");
        expect(electricity.value).toBe(120);

        const profit = toBankMovement(transaction({
            id: "business-profit",
            label: "Beneficio de Taller Norte",
            type: "income",
            amount: 900,
        }));
        expect(profit.category).toBe("business");
        expect(profit.direction).toBe("in");
        expect(profit.title).toBe("Beneficio · Taller Norte");

        const loss = toBankMovement(transaction({
            id: "business-loss",
            label: "Pérdidas de Taller Norte",
            type: "expense",
            amount: -250,
        }));
        expect(loss.category).toBe("business");
        expect(loss.direction).toBe("out");
        expect(loss.title).toBe("Pérdidas · Taller Norte");
    });

    it("marca la deuda financiada y las cuotas sin confundirlas con gastos normales", () => {
        const loan = toBankMovement(transaction({
            id: "loan",
            label: "Préstamo personal",
            type: "debt",
            amount: 0,
            moneyDelta: 0,
            debtDelta: 500,
            debtAfter: 1500,
        }));
        expect(loan.category).toBe("debt");
        expect(loan.direction).toBe("debt");
        expect(loan.value).toBe(500);
        expect(loan.detail).toContain("Deuda pendiente");

        const mortgage = toBankMovement(debt);
        expect(mortgage.category).toBe("debt");
        expect(mortgage.direction).toBe("debt");
        expect(mortgage.title).toBe("Hipoteca");
        expect(mortgage.detail).toContain("Cuota de deuda");
    });

    it("construye un cierre con saldo inicial derivado del extracto y saldo final exacto", () => {
        const transactions = [salary, taxes, housing, food, utilities, transport, health, other, debt];
        const timeline = buildMonthTimeline(transactions, statement(), 2026);

        expect(timeline).not.toBeNull();
        expect(timeline!.startBalance).toBe(2000);
        expect(timeline!.endBalance).toBe(2730);
        expect(balanceAtProgress(timeline!, 0)).toBe(2000);
        expect(balanceAtProgress(timeline!, 0.05)).toBe(4500);
        expect(balanceAtProgress(timeline!, 1)).toBe(2730);
        expect(monthTotalsAt(timeline!, 1)).toEqual({ income: 2500, expenses: 1770 });
    });

    it("ordena nómina, vivienda y recibos antes de la cuota de deuda", () => {
        const timeline = buildMonthTimeline(
            [salary, taxes, housing, food, utilities, transport, health, other, debt],
            statement(),
            2026,
        )!;
        const salaryAt = timeline.movements.find((movement) => movement.id === "salary")!.at;
        const housingAt = timeline.movements.find((movement) => movement.id === "housing")!.at;
        const debtAt = timeline.movements.find((movement) => movement.id === "debt")!.at;
        expect(salaryAt).toBeLessThan(housingAt);
        expect(housingAt).toBeLessThan(debtAt);
    });

    it("nunca muestra más de cinco movimientos y revela el cierre progresivamente", () => {
        const transactions = [salary, taxes, housing, food, utilities, transport, health, other, debt];
        const timeline = buildMonthTimeline(transactions, statement(), 2026)!;

        const early = recentBankMovements(transactions, timeline, 0.05);
        expect(early).toHaveLength(1);
        expect(early[0].title).toContain("Nómina");

        const middle = recentBankMovements(transactions, timeline, 0.3);
        expect(middle.length).toBeLessThanOrEqual(5);
        expect(middle.some((movement) => movement.id === "debt")).toBe(false);

        const closed = recentBankMovements(transactions, timeline, 1);
        expect(closed).toHaveLength(5);
        expect(closed[0].id).toBe("debt");
    });

    it("mantiene los movimientos de meses anteriores visibles aunque el cierre actual empiece", () => {
        const previous = transaction({
            id: "previous",
            label: "Alimentación del hogar · mes 2",
            type: "expense",
            amount: -80,
            month: 2,
        });
        const timeline = buildMonthTimeline([salary, taxes], statement(), 2026)!;
        const rows = recentBankMovements([previous, salary, taxes], timeline, 0);
        expect(rows.some((movement) => movement.id === "previous")).toBe(true);
        expect(rows.some((movement) => movement.id === "salary")).toBe(false);
    });
});

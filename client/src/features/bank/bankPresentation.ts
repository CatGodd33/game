import type { MonthlyStatement, Transaction } from "@life-duel/shared";

/**
 * Capa de presentación del banco. No modifica el estado económico: recibe los
 * movimientos que ya ha registrado el servidor y los convierte en una secuencia
 * legible y reproducible para la interfaz.
 */

export type BankCategory =
    | "salary"
    | "business"
    | "partner"
    | "pension"
    | "benefit"
    | "housing"
    | "utilities"
    | "food"
    | "transport"
    | "health"
    | "education"
    | "tax"
    | "debt"
    | "pet"
    | "transfer"
    | "other";

export type BankDirection = "in" | "out" | "debt";

export interface BankMovementView {
    id: string;
    title: string;
    detail: string;
    category: BankCategory;
    direction: BankDirection;
    /** Cantidad que se muestra en la fila, siempre en valor absoluto. */
    value: number;
    cash: number;
    /** Peso interno para que el saldo animado cierre exactamente en el extracto. */
    balanceWeight: number;
    debtDelta: number;
    debtAfter: number;
    month?: number;
    year: number;
    /** Momento del ciclo mensual en el que aparece (0–1). */
    at: number;
}

export interface BankMonthTimeline {
    monthKey: string;
    month: number;
    year: number;
    startBalance: number;
    endBalance: number;
    income: number;
    expenses: number;
    debtPayment: number;
    movements: BankMovementView[];
}

interface TransactionDescription {
    title: string;
    detail: string;
    category: BankCategory;
}

const MONTH_NAMES = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
];

const PHASES: Record<BankCategory, number> = {
    salary: 0.04,
    pension: 0.045,
    benefit: 0.05,
    partner: 0.055,
    business: 0.06,
    housing: 0.12,
    tax: 0.16,
    food: 0.22,
    utilities: 0.26,
    transport: 0.44,
    health: 0.52,
    education: 0.6,
    pet: 0.64,
    other: 0.68,
    debt: 0.8,
    transfer: 0.88,
};

const MAX_PER_CATEGORY_OFFSET = 0.08;

export function monthShortName(month: number | undefined): string {
    if (!month) return "";
    return MONTH_NAMES[Math.max(0, Math.min(11, month - 1))] ?? "";
}

export function cleanTransactionLabel(label: string): string {
    return label
        .replace(/\s*·\s*mes\s+\d+\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalized(label: string): string {
    return cleanTransactionLabel(label).toLocaleLowerCase("es");
}

function lastAmountAfterDebt(transaction: Transaction): number {
    return Math.max(0, Number(transaction.debtAfter ?? 0));
}

function classify(transaction: Transaction): BankCategory {
    const label = normalized(transaction.label);

    if (transaction.type === "debt" || transaction.type === "debt-payment") return "debt";
    if (/^beneficio de |^pérdidas de |^perdidas de |^venta de .*empresa/.test(label)) return "business";
    if (/^ingreso de .*hogar compartido/.test(label)) return "partner";
    if (/^salario\b|^honorarios\b/.test(label)) return "salary";
    if (/^pensión\b|^pension\b/.test(label)) return "pension";
    if (/^prestación\b|^prestacion\b|^apoyo familiar|^beca|^subvención|^subvencion/.test(label)) return "benefit";
    if (/^impuesto|^liquidación fiscal|^liquidacion fiscal|^retención|^retencion/.test(label)) return "tax";
    if (/^vivienda\b|^alquiler\b|^hipoteca\b/.test(label)) return "housing";
    if (/^electricidad\b|^agua\b|^gas\b|^internet\b|^luz\b|^calefacción\b|^calefaccion\b/.test(label)) return "utilities";
    if (/^alimento y cuidados\b/.test(label)) return "pet";
    if (/^alimentación\b|^alimentacion\b|^leche\b|^pañales\b|^panales\b|^supermercado\b/.test(label)) return "food";
    if (/^transporte\b|^gasolina\b|^coche\b|^vehículo\b|^vehiculo\b/.test(label)) return "transport";
    if (/^salud\b|^médic|^medic|^farmacia\b|^seguro médico|^seguro medico/.test(label)) return "health";
    if (/^educación\b|^educacion\b|^matrícula\b|^matricula\b|^estudios\b|^materiales y educación|^materiales y educacion/.test(label)) return "education";
    if (/^venta de /.test(label)) return "transfer";
    return "other";
}

function describe(transaction: Transaction): TransactionDescription {
    const category = classify(transaction);
    const label = cleanTransactionLabel(transaction.label);
    const lower = label.toLocaleLowerCase("es");

    switch (category) {
        case "salary": {
            const occupation = label.replace(/^(salario|honorarios)\s*·\s*/i, "").trim();
            return {
                title: occupation ? `Nómina · ${occupation}` : "Nómina",
                detail: /^honorarios/i.test(label) ? "Trabajo por cuenta propia" : "Salario mensual",
                category,
            };
        }
        case "business": {
            const businessName = label.replace(/^(beneficio|pérdidas|perdidas) de\s+/i, "").trim();
            const loss = /^pérdidas|^perdidas/i.test(label);
            return {
                title: loss ? `Pérdidas · ${businessName}` : `Beneficio · ${businessName}`,
                detail: loss ? "Cargo de la empresa" : "Ingreso de la empresa",
                category,
            };
        }
        case "partner":
            return { title: "Ingreso de pareja", detail: "Aportación al hogar compartido", category };
        case "pension":
            return { title: "Pensión", detail: "Ingreso de jubilación", category };
        case "benefit":
            return { title: label, detail: "Prestación o apoyo", category };
        case "housing":
            return { title: "Vivienda", detail: "Alquiler o hipoteca", category };
        case "utilities":
            return { title: label, detail: "Suministro del hogar", category };
        case "food":
            return { title: label, detail: "Gasto esencial", category };
        case "transport":
            return { title: label, detail: "Movilidad", category };
        case "health":
            return { title: label, detail: "Cuidado de la salud", category };
        case "education":
            return { title: label, detail: "Formación", category };
        case "tax":
            return { title: label, detail: "Impuestos y contribuciones", category };
        case "pet":
            return { title: label, detail: "Cuidado de la mascota", category };
        case "transfer":
            return { title: label, detail: "Movimiento de patrimonio", category };
        case "debt": {
            const debtAfter = lastAmountAfterDebt(transaction);
            const cash = cashOf(transaction);
            if (transaction.type === "debt-payment") {
                return {
                    title: /hipoteca/i.test(label) ? "Hipoteca" : "Pago de deuda",
                    detail: `Cuota de deuda · quedan ${money(debtAfter)}`,
                    category,
                };
            }
            if (cash > 0.01) {
                return {
                    title: label,
                    detail: `Entrada financiada · deuda ${money(debtAfter)}`,
                    category,
                };
            }
            return {
                title: label,
                detail: `Deuda pendiente ${money(debtAfter)}`,
                category,
            };
        }
        case "other":
        default:
            return {
                title: label || "Movimiento",
                detail: /^otros gastos|^contribución|^contribucion/i.test(lower) ? "Gasto del hogar" : "Movimiento de cuenta",
                category,
            };
    }
}

export function cashOf(transaction: Transaction): number {
    return transaction.moneyDelta ?? (
        transaction.amount < 0
            ? Math.min(0, transaction.amount + (transaction.debtDelta ?? 0))
            : transaction.amount
    );
}

export function directionOf(transaction: Transaction, cash = cashOf(transaction)): BankDirection {
    if (transaction.type === "debt" || transaction.type === "debt-payment") return "debt";
    if (cash > 0.01) return "in";
    if (cash < -0.01) return "out";
    return "debt";
}

function valueOf(transaction: Transaction, direction: BankDirection, cash: number): number {
    if (Math.abs(cash) > 0.01) return Math.abs(cash);
    const debt = Math.abs(transaction.debtDelta ?? 0);
    if (debt > 0.01) return debt;
    if (direction === "in") return Math.abs(transaction.amount);
    return Math.abs(transaction.amount);
}

export function toBankMovement(transaction: Transaction, at = 0): BankMovementView {
    const description = describe(transaction);
    const cash = cashOf(transaction);
    const direction = directionOf(transaction, cash);
    return {
        id: transaction.id,
        title: description.title,
        detail: description.detail,
        category: description.category,
        direction,
        value: valueOf(transaction, direction, cash),
        cash,
        balanceWeight: cash,
        debtDelta: transaction.debtDelta ?? 0,
        debtAfter: transaction.debtAfter ?? 0,
        month: transaction.month,
        year: transaction.year,
        at,
    };
}

function isMeaningful(transaction: Transaction): boolean {
    return Math.abs(transaction.amount) > 0.001 || Math.abs(transaction.debtDelta ?? 0) > 0.001;
}

function sameMonth(transaction: Transaction, year: number, month: number): boolean {
    return transaction.year === year && transaction.month === month;
}

function expenseTotal(statement: MonthlyStatement): number {
    return statement.taxes + statement.housing + statement.food + statement.utilities +
        statement.transport + statement.health + statement.education + statement.other +
        statement.debtPayment;
}

/**
 * Construye la línea temporal del último cierre. El saldo inicial se deriva
 * del extracto del servidor, no de una estimación del cliente, para que la
 * animación termine siempre en el saldo autoritativo.
 */
export function buildMonthTimeline(
    transactions: Transaction[],
    statement: MonthlyStatement | undefined,
    year: number,
): BankMonthTimeline | null {
    if (!statement) return null;

    const month = statement.month;
    const monthTransactions = transactions
        .filter((transaction) => sameMonth(transaction, year, month) && isMeaningful(transaction));

    const net = statement.income - expenseTotal(statement);
    const startBalance = statement.balance - net;
    const positions = new Map<BankCategory, number>();
    const movements = monthTransactions.map((transaction) => {
        const description = describe(transaction);
        const position = positions.get(description.category) ?? 0;
        positions.set(description.category, position + 1);
        const at = Math.min(
            0.94,
            PHASES[description.category] + Math.min(position, 4) * 0.015,
        );
        return toBankMovement(transaction, at);
    });

    // Reparte cualquier diferencia de redondeo en los pesos de saldo, nunca en
    // los importes visibles, para que el último fotograma coincida exactamente.
    const cashSum = movements.reduce((total, movement) => total + movement.cash, 0);
    if (Math.abs(cashSum) > 0.01 && Math.abs(net) > 0.01) {
        const scale = net / cashSum;
        for (const movement of movements) movement.balanceWeight = movement.cash * scale;
    } else if (movements.length) {
        movements[movements.length - 1].balanceWeight += net - cashSum;
    }

    return {
        monthKey: `${year}-${month}`,
        month,
        year,
        startBalance,
        endBalance: statement.balance,
        income: statement.income,
        expenses: expenseTotal(statement),
        debtPayment: statement.debtPayment,
        movements,
    };
}

export function balanceAtProgress(timeline: BankMonthTimeline, progress: number): number {
    if (progress >= 0.999) return timeline.endBalance;
    let balance = timeline.startBalance;
    for (const movement of timeline.movements) {
        if (movement.at <= progress) balance += movement.balanceWeight;
    }
    return balance;
}

export function monthTotalsAt(timeline: BankMonthTimeline, progress: number): {
    income: number;
    expenses: number;
} {
    if (progress >= 0.999) {
        return { income: timeline.income, expenses: timeline.expenses };
    }
    let income = 0;
    let expenses = 0;
    for (const movement of timeline.movements) {
        if (movement.at > progress) continue;
        if (movement.direction === "in") income += Math.abs(movement.cash);
        else if (movement.direction === "out" || movement.cash < 0) expenses += Math.abs(movement.cash);
    }
    return { income, expenses };
}

/**
 * Devuelve solo los movimientos que ya pueden mostrarse según el avance del
 * ciclo. Los movimientos de meses anteriores son siempre visibles; los del
 * cierre actual aparecen escalonados. El límite se aplica después de revelar,
 * así que la tarjeta nunca contiene más de cinco filas.
 */
export function recentBankMovements(
    transactions: Transaction[],
    timeline: BankMonthTimeline | null,
    progress: number,
    limit = 5,
): BankMovementView[] {
    if (limit <= 0) return [];
    const atById = new Map(timeline?.movements.map((movement) => [movement.id, movement.at]) ?? []);
    const rows: { movement: BankMovementView; index: number }[] = [];

    transactions.forEach((transaction, index) => {
        if (!isMeaningful(transaction)) return;
        const currentMonth = timeline
            ? sameMonth(transaction, timeline.year, timeline.month)
            : false;
        if (currentMonth) {
            const at = atById.get(transaction.id);
            if (at === undefined || progress + 0.0001 < at) return;
            rows.push({ movement: toBankMovement(transaction, at), index });
            return;
        }
        rows.push({ movement: toBankMovement(transaction), index });
    });

    return rows
        .sort((left, right) => {
            const yearDiff = (right.movement.year ?? 0) - (left.movement.year ?? 0);
            if (yearDiff) return yearDiff;
            const monthDiff = (right.movement.month ?? 0) - (left.movement.month ?? 0);
            if (monthDiff) return monthDiff;
            return right.index - left.index;
        })
        .slice(0, limit)
        .map((row) => row.movement);
}

export function money(value: number): string {
    return new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
}

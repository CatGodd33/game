import { tuitionAnnual } from "./education.js";
import { annualChildSupport, annualSchoolFees, dependentCostUnits, dependentChildren, petAnnualCost } from "./household-care.js";
import type {
    BirthProfile,
    CharacterState,
    CoreStats,
    Difficulty,
    MonthlyStatement,
    EconomyState,
    EducationLevel,
    Transaction,
    TransactionType,
} from "@life-duel/shared";
import {
    clamp,
    DIFFICULTY_META,
    EDUCATION_META,
    MAX_LEDGER_ENTRIES,
} from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { economyModel } from "./models.js";
import { countryContext } from "./realism.js";
import { countryProfile } from "./country-context.js";
import type { Rng } from "./rng.js";

export class InsufficientFundsError extends Error {
    constructor(
        public readonly needed: number,
        public readonly available: number,
    ) {
        super("No hay fondos ni crédito suficiente para esta decisión.");
        this.name = "InsufficientFundsError";
    }
}

function round(value: number, decimals = 0): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function trimLedger(character: CharacterState): void {
    if (character.finance.ledger.length > MAX_LEDGER_ENTRIES) {
        character.finance.ledger.splice(0, character.finance.ledger.length - MAX_LEDGER_ENTRIES);
    }
}

interface LedgerMovement {
    moneyDelta?: number;
    debtDelta?: number;
    amount?: number;
}

/**
 * Registra un movimiento. `amount` es el importe económico mostrado
 * (gasto/ingreso); `moneyDelta` y `debtDelta` reflejan cómo se financió
 * y garantizan que todo cambio de saldo o deuda quede auditado.
 */
function record(
    character: CharacterState,
    year: number,
    type: TransactionType,
    label: string,
    movement: LedgerMovement,
): Transaction {
    const moneyDelta = round(movement.moneyDelta ?? 0, 2);
    const debtDelta = round(movement.debtDelta ?? 0, 2);
    const transaction: Transaction = {
        month: character.liveEconomy ? Math.min(12, character.liveEconomy.month + 1) : undefined,
        id: `txv7-${character.id}-${year}-${character.finance.transactionSequence = (character.finance.transactionSequence ?? 0) + 1}`,
        year,
        age: character.age,
        type,
        label,
        amount: round(movement.amount ?? moneyDelta, 2),
        debtDelta,
        moneyDelta,
        balanceAfter: round(character.finance.money, 2),
        debtAfter: round(character.finance.debt, 2),
    };
    character.finance.ledger.push(transaction);
    trimLedger(character);
    return transaction;
}

export function debtCapacity(character: CharacterState): number {
    const country = getCountry(character.currentCountry);
    const model = economyModel();
    // La capacidad de crédito se ancla a los ingresos reales del personaje.
    // El PIB del país solo actúa como suelo cuando aún no tiene ingresos
    // propios (estudiante, desempleado de larga duración), para no inflar la
    // deuda de alguien con un salario bajo en un país rico.
    const referenceIncome =
        character.finance.annualIncome > 0
            ? Math.max(character.finance.annualIncome, character.finance.annualExpenses)
            : Math.max(country.gdpPerCapitaPpp * 0.45, character.finance.annualExpenses);
    return round(referenceIncome * model.debt.maxDebtToIncomeRatio, 2);
}

export function availableCredit(character: CharacterState): number {
    return Math.max(0, debtCapacity(character) - character.finance.debt);
}

export function canAfford(character: CharacterState, cost: number): boolean {
    return character.finance.money + availableCredit(character) >= cost;
}

/** Aplica un coste usando saldo y, si hace falta, crédito disponible. */
export function spend(
    character: CharacterState,
    cost: number,
    label: string,
    year: number,
    allowDebt = true,
): Transaction {
    if (cost <= 0) {
        return record(character, year, "expense", label, { amount: 0 });
    }
    const fromMoney = Math.min(Math.max(0, character.finance.money), cost);
    const remaining = cost - fromMoney;
    const fromDebt = allowDebt ? Math.min(availableCredit(character), remaining) : 0;
    if (remaining - fromDebt > 0.01) {
        throw new InsufficientFundsError(cost, character.finance.money + availableCredit(character));
    }
    character.finance.money = round(character.finance.money - fromMoney, 2);
    character.finance.debt = round(character.finance.debt + fromDebt, 2);
    return record(character, year, "expense", label, {
        moneyDelta: -fromMoney,
        debtDelta: fromDebt,
        amount: -cost,
    });
}

/** Aumenta deuda y saldo en la misma cuantía (préstamo recibido). */
export function borrow(
    character: CharacterState,
    amount: number,
    label: string,
    year: number,
): Transaction {
    if (amount <= 0) return record(character, year, "debt", label, { amount: 0 });
    character.finance.money = round(character.finance.money + amount, 2);
    character.finance.debt = round(character.finance.debt + amount, 2);
    return record(character, year, "debt", label, {
        moneyDelta: amount,
        debtDelta: amount,
        amount,
    });
}

/** Ajusta la deuda sin mover saldo (condonación o recargo). */
export function adjustDebt(
    character: CharacterState,
    delta: number,
    label: string,
    year: number,
): Transaction {
    const nextDebt = Math.max(0, character.finance.debt + delta);
    const change = round(nextDebt - character.finance.debt, 2);
    character.finance.debt = round(nextDebt, 2);
    return record(character, year, "debt", label, { debtDelta: change, amount: 0 });
}


export function grant(
    character: CharacterState,
    amount: number,
    label: string,
    year: number,
    type: TransactionType = "grant",
): Transaction {
    if (amount === 0) return record(character, year, type, label, { amount: 0 });
    if (amount > 0) {
        character.finance.money = round(character.finance.money + amount, 2);
        return record(character, year, type, label, { moneyDelta: amount, amount });
    }
    return spend(character, Math.abs(amount), label, year);
}

export function repayDebt(
    character: CharacterState,
    amount: number,
    year: number,
    label = "Amortización de deuda",
): number {
    const payment = Math.min(amount, character.finance.debt, character.finance.money);
    if (payment <= 0) return 0;
    character.finance.money = round(character.finance.money - payment, 2);
    character.finance.debt = round(character.finance.debt - payment, 2);
    record(character, year, "debt-payment", label, {
        moneyDelta: -payment,
        debtDelta: -payment,
        amount: -payment,
    });
    return payment;
}

export function migrate(character: CharacterState, countryCode: string, location: string, year?: number): void {
    const country = getCountry(countryCode);
    if (country.code === character.currentCountry) {
        character.currentLocation = location;
        const latest = character.residenceHistory?.at(-1);
        if (latest && latest.country === country.code) latest.city = location;
        return;
    }
    character.currentCountry = country.code;
    character.currentLocation = location;
    character.currentCurrency = {
        code: country.currency.code,
        symbol: country.currency.symbol,
        localPerIntlDollar: country.currency.localPerIntlDollar,
    };
    if (!character.countriesLived.includes(country.code)) {
        character.countriesLived.push(country.code);
    }
    const moveYear = year ?? new Date().getFullYear() - character.age;
    character.residenceHistory ??= [];
    const previous = character.residenceHistory.at(-1);
    if (previous) previous.toYear = moveYear;
    character.residenceHistory.push({ country: country.code, city: location, fromYear: moveYear });
}

export function incomeTax(grossIncome: number, gdpPerCapitaPpp: number): number {
    const model = economyModel();
    const allowance = gdpPerCapitaPpp * model.tax.personalAllowanceShareOfGdp;
    const taxable = Math.max(0, grossIncome - allowance);
    let previousUpper = 0;
    let tax = 0;
    for (const bracket of model.tax.brackets) {
        const upper = gdpPerCapitaPpp * bracket.upToGdpMultiple;
        const slice = Math.max(0, Math.min(taxable, upper - previousUpper));
        tax += slice * bracket.rate;
        previousUpper = upper;
        if (taxable <= upper) break;
    }
    tax += grossIncome * model.tax.socialContributionRate;
    return round(Math.max(0, tax), 2);
}

export function educationMultiplier(level: EducationLevel): number {
    return economyModel().income.educationMultipliers[level] ?? 1;
}

export function ageIncomeFactor(age: number): number {
    const model = economyModel();
    if (age < 18) return 0;
    if (age < 25) return clamp(0.7 + (age - 18) * 0.018, 0.7, 1);
    if (age <= model.income.agePeak) return 1;
    const decline = Math.min(
        model.income.ageDeclineCap,
        (age - model.income.agePeak) * model.income.ageDeclinePerYearAfterPeak,
    );
    return 1 - decline;
}

export function economyPhaseMultiplier(phase: EconomyState["phase"]): number {
    return phase === "expansion" ? 1.06 : phase === "recesion" ? 0.9 : phase === "crisis" ? 0.76 : 1;
}

export function computeGrossIncome(
    character: CharacterState,
    birth: BirthProfile,
    economy: EconomyState,
    rng: Rng,
): number {
    const model = economyModel();
    const country = getCountry(character.currentCountry);
    const status = character.employment.status;
    const familySupport =
        birth.details?.household?.support.annualSupport ??
        model.family.parentSupportByTier[String(birth.family.tier)] ??
        0;
    const gdp = country.gdpPerCapitaPpp;

    if (status === "child" || character.age < 16) {
        // La infancia no genera ingresos ni deudas propias: el hogar cubre sus necesidades.
        return 0;
    }
    if (status === "student") {
        const parents = character.story?.relatives.filter(r => r.role === "mother" || r.role === "father");
        const support = (character.age <= 25 ? familySupport * .65 : 0) * (parents?.length ? parents.filter(r => r.alive).length / parents.length : 1);
        if (support > 0) return round(support);
        return round(support * (country.derived.socialSafetyNet / 80));
    }
    if (status === "retired") {
        initializePension(character);
        return character.employment.pensionAnnual!;
    }
    if (status === "disabled") {
        return round(gdp * 0.28 * (0.4 + country.derived.socialSafetyNet / 160));
    }
    if (status === "unemployed") {
        const support = gdp * model.income.unemploymentSupportShare * (country.derived.socialSafetyNet / 100);
        return round(Math.max(0, support));
    }

    if (character.business?.active && status === "self-employed") {
        // El beneficio de la empresa se contabiliza en su propio módulo.
        return 0;
    }

    const genderGap = countryContext(character.currentCountry).genderWageGapPct;
    const genderFactor = character.sex === "female" ? 1 - (genderGap / 100) * 0.55 : 1;
    const employmentFactor = clamp(character.employment.contractQuality / 90, 0.45, 1.35);
    const experienceBonus = Math.min(
        model.income.experienceBonusCap,
        character.employment.yearsInRole * model.income.experienceBonusPerYear,
    );
    const base =
        gdp *
        model.income.baseShareOfGdpPerCapita *
        educationMultiplier(character.educationLevel) *
        ageIncomeFactor(character.age) *
        employmentFactor *
        (1 + experienceBonus) *
        character.incomeModifier *
        genderFactor *
        economyPhaseMultiplier(economy.phase);

    const volatility =
        status === "self-employed"
            ? clamp(rng.normal(1, model.income.selfEmploymentVolatility), 0.55, 1.5)
            : 1;
    return round(Math.max(0, base * volatility));
}

export interface EssentialBreakdown {
    childcare?: number;
    total: number;
    housing: number;
    food: number;
    utilities: number;
    transport: number;
    health: number;
    education: number;
    other: number;
}

/** Desglose del gasto esencial por categorías reales del presupuesto. */
export function computeEssentialBreakdown(
    character: CharacterState,
    _birth: BirthProfile,
    economy: EconomyState,
    difficulty: Difficulty,
): EssentialBreakdown {
    const model = economyModel();
    const country = getCountry(character.currentCountry);
    const status = character.employment.status;
    const householdShare =
        character.age < 16
            ? 0
            : character.age < 18
                ? 0.25
                : status === "student" && character.age <= 25
                    ? 0.42
                    : character.age < 22
                        ? 0.65
                        : 1;
    if (householdShare === 0) {
        return { total: 0, housing: 0, food: 0, utilities: 0, transport: 0, health: 0, education: 0, other: 0 };
    }
    const base =
        country.derived.costOfLivingIndex *
        economy.costOfLivingIndex *
        DIFFICULTY_META[difficulty].costMultiplier *
        character.expenseModifier;
    const housingMultiplier =
        model.housingQualityExpense.min +
        (character.housingQuality / 100) *
        (model.housingQualityExpense.max - model.housingQualityExpense.min);
    const weighted =
        model.expenseWeights.food +
        model.expenseWeights.housing * housingMultiplier +
        model.expenseWeights.transport +
        model.expenseWeights.health +
        model.expenseWeights.other +
        model.expenseWeights.education * (character.employment.status === "student" ? 1 : 0.25);
    const core = base * weighted * householdShare;
    const shares = countryProfile(character.currentCountry).monthlyShares;
    const shareTotal = Object.values(shares).reduce((sum, value) => sum + value, 0) || 1;
    const parts: EssentialBreakdown = { total: 0, housing: 0, food: 0, utilities: 0, transport: 0, health: 0, education: 0, other: 0 };
    for (const key of ["housing", "food", "utilities", "transport", "health", "education", "other"] as const) {
        parts[key] = round((core * shares[key]) / shareTotal);
    }
    const childCost = base * model.income.childCostShareOfEssentials * dependentCostUnits(character, _birth.year + character.age);
    parts.childcare = childCost;
    const schoolFees = annualSchoolFees(character, _birth.year + character.age);
    parts.education += schoolFees;
    const partnerCost = character.partnerName && (character.partnerProfile?.sharedHousehold ?? true) ? base * model.income.partnerCostShareOfEssentials : 0;
    parts.food = round(parts.food + (childCost + partnerCost) * 0.62);
    parts.other = round(parts.other + (childCost + partnerCost) * 0.38);
    if (character.healthPlan === "premium") {
        parts.health = round(parts.health + base * model.healthCare.premiumAnnualCostShareOfEssentials);
    } else if (character.healthPlan === "basico") {
        parts.health = round(parts.health + base * model.healthCare.basicAnnualCostShareOfEssentials);
    }
    const homes = (character.assets ?? []).filter(asset => asset.kind === "home");
    const ownHere = homes.some(asset => (!asset.country || asset.country === character.currentCountry) && (!asset.location || asset.location === character.currentLocation));
    const propertyUpkeep = homes.reduce((sum, asset) => sum + asset.value * .00375, 0);
    parts.housing = round((ownHere ? 0 : parts.housing) + propertyUpkeep);
    parts.other += petAnnualCost(character, country.gdpPerCapitaPpp) + annualChildSupport(character, _birth.year + character.age) + (character.assets ?? []).filter(a => a.kind === "car").reduce((sum, a) => sum + a.value * .025, 0);
    parts.education += tuitionAnnual(character);
    parts.total = round(Math.max(0, parts.housing + parts.food + parts.utilities + parts.transport + parts.health + parts.education + parts.other));
    return parts;
}

export function computeEssentials(
    character: CharacterState,
    birth: BirthProfile,
    economy: EconomyState,
    difficulty: Difficulty,
): number {
    return computeEssentialBreakdown(character, birth, economy, difficulty).total;
}

export function computeLivingStandard(character: CharacterState): number {
    const model = economyModel();
    const country = getCountry(character.currentCountry);
    const gdp = country.gdpPerCapitaPpp;
    const incomeRatio = clamp(character.finance.annualIncome / Math.max(gdp * 1.1, 1), 0, 1.8);
    const incomePoints = incomeRatio * model.livingStandard.incomeToGdpRatioWeight;
    const housingPoints = (character.housingQuality / 100) * model.livingStandard.housingWeight;
    const savingsMonths = clamp(
        character.finance.money / Math.max(character.finance.annualExpenses, 1),
        0,
        24,
    );
    const savingsPoints = Math.min(18, savingsMonths * model.livingStandard.savingsMonthsWeight);
    const debtShare = clamp(
        character.finance.debt / Math.max(character.finance.annualIncome * 2.5, 1),
        0,
        1,
    );
    const debtPenalty = debtShare * 22 * model.livingStandard.debtPenalty + debtShare * 8;
    const raw = 15 + incomePoints + housingPoints + savingsPoints - debtPenalty;
    return round(clamp(raw, model.livingStandard.floor, model.livingStandard.ceiling));
}

export interface AnnualEconomyResult {
    grossIncome: number;
    taxes: number;
    essentials: number;
    expenses: number;
    debtInterest: number;
    debtRepayment: number;
    unpaid: number;
    net: number;
    insolvent: boolean;
    businessRevenue?: number;
    businessNet?: number;
    monthly: MonthlyStatement[];
}

const MONTH_FACTORS = {
    utilities: [1.15, 1.12, 1.03, 0.94, 0.88, 0.93, 1.12, 1.14, 1.02, 0.94, 0.98, 1.06],
    education: [1.35, 0.78, 0.82, 0.85, 0.88, 0.7, 0.72, 0.8, 1.85, 1.1, 1.0, 0.95],
    other: [0.9, 0.88, 0.95, 1.0, 1.02, 1.04, 1.12, 1.1, 1.0, 1.0, 1.02, 1.37],
};

function distribute(amount: number, factors: number[]): number[] {
    const total = factors.reduce((sum, value) => sum + value, 0) || 1;
    const values = factors.map((factor) => round((amount * factor) / total));
    const difference = round(amount - values.reduce((sum, value) => sum + value, 0));
    values[values.length - 1] = round((values[values.length - 1] ?? 0) + difference);
    return values;
}

/** Extracto mensual del año; el saldo final coincide con el saldo autoritativo. */
export function buildMonthlyStatements(
    character: CharacterState,
    breakdown: EssentialBreakdown,
    grossIncome: number,
    taxes: number,
    debtRepayment: number,
    year: number,
): MonthlyStatement[] {
    const equal = (value: number) => distribute(value, Array.from({ length: 12 }, () => 1));
    const income = equal(grossIncome);
    const tax = equal(taxes);
    const debt = equal(debtRepayment);
    const housing = equal(breakdown.housing);
    const food = equal(breakdown.food);
    const utilities = distribute(breakdown.utilities, MONTH_FACTORS.utilities);
    const transport = equal(breakdown.transport);
    const health = equal(breakdown.health);
    const tuition = Math.min(breakdown.education, tuitionAnnual(character) + annualSchoolFees(character, year));
    const tuitionPayments = equal(tuition);
    const education = distribute(Math.max(0, breakdown.education - tuition), MONTH_FACTORS.education).map((value, i) => value + tuitionPayments[i]!);
    const fixedCare = Math.min(breakdown.other, petAnnualCost(character, getCountry(character.currentCountry).gdpPerCapitaPpp) + annualChildSupport(character, year) + (breakdown.childcare ?? 0) * .38);
    const carePayments = equal(fixedCare);
    const other = distribute(Math.max(0, breakdown.other - fixedCare), MONTH_FACTORS.other).map((value, i) => value + carePayments[i]!);
    const netByMonth = Array.from({ length: 12 }, (_, index) =>
        round(
            (income[index] ?? 0) -
            (tax[index] ?? 0) -
            (debt[index] ?? 0) -
            (housing[index] ?? 0) -
            (food[index] ?? 0) -
            (utilities[index] ?? 0) -
            (transport[index] ?? 0) -
            (health[index] ?? 0) -
            (education[index] ?? 0) -
            (other[index] ?? 0),
        ),
    );
    const startingBalance = round(character.finance.money - netByMonth.reduce((sum, value) => sum + value, 0));
    let running = startingBalance;
    return Array.from({ length: 12 }, (_, index) => {
        running = index === 11 ? character.finance.money : round(running + (netByMonth[index] ?? 0));
        const month = index + 1;
        const notes: string[] = [];
        if (month === 9 && breakdown.education > 0) notes.push("Matrícula y material escolar");
        if (month === 12) notes.push("Cierre del año y gastos de invierno");
        if (month === 1 && breakdown.utilities > 0) notes.push("Factura de energía de invierno");
        if (month === 7 && breakdown.utilities > 0) notes.push("Aire acondicionado y agua");
        return {
            month,
            income: income[index] ?? 0,
            taxes: tax[index] ?? 0,
            housing: housing[index] ?? 0,
            food: food[index] ?? 0,
            utilities: utilities[index] ?? 0,
            transport: transport[index] ?? 0,
            health: health[index] ?? 0,
            education: education[index] ?? 0,
            other: other[index] ?? 0,
            debtPayment: debt[index] ?? 0,
            balance: running,
            debt: character.finance.debt,
            note: notes.length ? `${year}: ${notes.join(" · ")}` : undefined,
        };
    });
}

/** Ejecuta el ciclo económico anual y deja rastro de cada movimiento. */
export function runAnnualEconomy(
    character: CharacterState,
    birth: BirthProfile,
    economy: EconomyState,
    difficulty: Difficulty,
    rng: Rng,
    year: number,
): AnnualEconomyResult {
    const model = economyModel();
    const country = getCountry(character.currentCountry);
    const toolBoost = character.employment.status === "employed" ? 1 + Math.min(2, (character.assets ?? []).filter(a => a.kind === "equipment").length) * .04 : 1;
    const partnerIncome = character.partnerName && character.partnerProfile?.sharedHousehold ? character.partnerProfile.annualIncome * economyPhaseMultiplier(economy.phase) : 0;
    const grossIncome = round(computeGrossIncome(character, birth, economy, rng) * toolBoost + partnerIncome);
    const taxes = incomeTax(grossIncome, country.gdpPerCapitaPpp);
    const breakdown = computeEssentialBreakdown(character, birth, economy, difficulty);
    let essentials = breakdown.total;
    const parts = ["housing", "food", "utilities", "transport", "health", "education", "other"] as const;
    // Un hogar no puede sostener indefinidamente una cesta por encima de sus
    // ingresos: se ajusta el consumo a la capacidad real para evitar una
    // espiral de deuda infinita. Es una aproximación de simulación, no una
    // encuesta de pobreza.
    if (character.age < 18) {
        for (const key of parts) breakdown[key] = 0;
        breakdown.total = 0;
        essentials = 0;
    } else {
        const spendingPower =
            Math.max(grossIncome * 0.82, country.gdpPerCapitaPpp * 0.12) +
            Math.min(character.finance.money, grossIncome * 1.5) * 0.35;
        if (essentials > spendingPower && essentials > 0) {
            // Care obligations cannot disappear when disposable income falls.
            const fixedOther = petAnnualCost(character, country.gdpPerCapitaPpp) + annualChildSupport(character, year) + (breakdown.childcare ?? 0) * .38;
            const fixedFood = (breakdown.childcare ?? 0) * .62;
            const fixedEducation = tuitionAnnual(character) + annualSchoolFees(character, year);
            const fixedCare = fixedOther + fixedFood + fixedEducation;
            const factor = Math.min(1, Math.max(0, spendingPower - fixedCare) / Math.max(1, essentials - fixedCare));
            for (const key of parts) {
                const fixed = key === "other" ? fixedOther : key === "food" ? fixedFood : key === "education" ? fixedEducation : 0;
                breakdown[key] = round(Math.max(0, breakdown[key] - fixed) * factor + fixed);
            }
            breakdown.total = round(parts.reduce((sum, key) => sum + breakdown[key], 0));
            essentials = breakdown.total;
        }
    }

    character.finance.annualIncome = grossIncome;
    character.finance.annualExpenses = round(essentials + taxes);

    if (grossIncome > 0) {
        character.finance.money = round(character.finance.money + grossIncome, 2);
        record(character, year, "income", "Ingresos anuales", {
            moneyDelta: grossIncome,
            amount: grossIncome,
        });
    }

    // El modelo aplica un techo de crédito explícito. Si una deuda antigua o
    // los intereses superan la capacidad, se reestructura de forma registrada
    // para no generar pasivos exponenciales imposibles.
    const capacity = debtCapacity(character);
    if (character.finance.debt > capacity + 0.01) {
        const excess = round(character.finance.debt - capacity, 2);
        character.finance.debt = capacity;
        record(character, year, "debt", "Reestructuración de deuda por límite de crédito", {
            debtDelta: -excess,
            amount: 0,
        });
    }
    const accruedInterest = round(character.finance.debt * model.debt.annualInterestRate, 2);
    const interestHeadroom = Math.max(0, debtCapacity(character) - character.finance.debt);
    const debtInterest = Math.min(accruedInterest, interestHeadroom);
    if (debtInterest > 0.01) {
        character.finance.debt = round(character.finance.debt + debtInterest, 2);
        record(character, year, "debt", "Intereses de deuda", {
            debtDelta: debtInterest,
            amount: 0,
        });
    }

    const totalOutflow = taxes + essentials;
    const fromMoney = Math.min(character.finance.money, totalOutflow);
    const remaining = round(totalOutflow - fromMoney, 2);
    const fromDebt = Math.min(availableCredit(character), remaining);
    const unpaid = round(remaining - fromDebt, 2);

    character.finance.money = round(character.finance.money - fromMoney, 2);
    character.finance.debt = round(character.finance.debt + fromDebt, 2);

    const taxMoney = Math.min(taxes, fromMoney);
    const taxDebt = Math.min(fromDebt, taxes - taxMoney);
    if (taxes > 0) {
        record(character, year, "expense", "Impuestos y cotizaciones", {
            moneyDelta: -taxMoney,
            debtDelta: taxDebt,
            amount: -taxes,
        });
    }
    const livingMoney = fromMoney - taxMoney;
    const livingDebt = fromDebt - taxDebt;
    record(character, year, "expense", "Gastos esenciales", {
        moneyDelta: -livingMoney,
        debtDelta: livingDebt,
        amount: -essentials,
    });

    const reserve = essentials * 1.25;
    const debtRepayment =
        character.finance.debt > 0 && character.finance.money > reserve
            ? repayDebt(
                character,
                Math.min(character.finance.debt, (character.finance.money - reserve) * 0.45),
                year,
            )
            : 0;

    const net = round(grossIncome - taxes - essentials - debtRepayment, 2);
    const monthly = buildMonthlyStatements(character, breakdown, grossIncome, taxes, debtRepayment, year);
    character.livingStandard = computeLivingStandard(character);

    return {
        grossIncome,
        taxes,
        essentials,
        expenses: round(essentials + taxes + debtInterest),
        debtInterest,
        debtRepayment,
        unpaid,
        net,
        insolvent: character.finance.money <= 0.01 || fromDebt > 0 || unpaid > 0,
        monthly,
    };
}

export function applyStatDelta(stats: CoreStats, delta: Partial<CoreStats>): void {
    for (const key of Object.keys(delta) as (keyof CoreStats)[]) {
        stats[key] = round(clamp(stats[key] + (delta[key] ?? 0)), 1);
    }
}

export function educationRank(level: EducationLevel): number {
    return EDUCATION_META[level]?.rank ?? 0;
}

export function initializePension(c: CharacterState): void {
    if (c.employment.status !== "retired" || c.employment.pensionAnnual !== undefined) return;
    const gdp = getCountry(c.currentCountry).gdpPerCapitaPpp;
    const partner = c.partnerName && c.partnerProfile?.sharedHousehold ? c.partnerProfile.annualIncome : 0;
    const reference = Math.max(0, c.finance.annualIncome - partner) || gdp * .8;
    c.employment.pensionAnnual = round(Math.min(reference, gdp * 2.5) * economyModel().income.pensionReplacementRate);
}

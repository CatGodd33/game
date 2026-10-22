import type { CharacterState, CreditState, LoanState } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { adjustDebt, borrow } from "./economy.js";

export function createCredit(): CreditState {
    return { score: 58, missedPayments: 0, bankruptcies: 0 };
}

export function ensureCredit(character: CharacterState): CreditState {
    character.credit ??= createCredit();
    character.loans ??= [];
    return character.credit;
}

export function takeLoan(
    character: CharacterState,
    amount: number,
    lender: LoanState["lender"],
    label: string,
    year: number,
    annualInterestRate = lender === "banco" ? 0.13 : 0,
    creditor?: { id: string; name: string },
): LoanState | null {
    if (amount <= 0) return null;
    ensureCredit(character);
    const rounded = Math.round(amount);
    borrow(character, rounded, label, year);
    const loan: LoanState = {
        id: `loan-${character.id}-${year}-${character.loans!.length + 1}`,
        lender,
        label,
        principal: rounded,
        balance: rounded,
        annualInterestRate,
        originYear: year,
        active: true,
        ...(creditor ? { creditorRelativeId: creditor.id, creditorRelativeName: creditor.name } : {}),
    };
    character.loans!.push(loan);
    // Pedir crédito no es gratis para la reputación financiera, pero tampoco
    // impide por sí solo volver a financiarse.
    character.credit!.score = Math.round(clamp(character.credit!.score - (lender === "familia" ? 0 : 2), 0, 100));
    return loan;
}

export interface CreditUpdate {
    score: number;
    missedPayments: number;
    bankrupt: boolean;
    relievedDebt: number;
}

/**
 * Actualiza el historial crediticio. Una insolvencia aislada no arruina la
 * vida; la persistencia sí puede terminar en una quiebra personal registrada.
 */
export function updateCredit(
    character: CharacterState,
    options: { insolvent: boolean; unpaid: number },
    year: number,
): CreditUpdate {
    const credit = ensureCredit(character);
    let bankrupt = false;
    let relievedDebt = 0;
    if (options.insolvent || options.unpaid > 0.01) {
        credit.missedPayments += 1;
        credit.score = Math.round(clamp(credit.score - 7, 0, 100));
    } else {
        credit.missedPayments = Math.max(0, credit.missedPayments - 1);
        credit.score = Math.round(clamp(credit.score + 2.2, 0, 100));
    }

    const cooldownElapsed =
        credit.lastBankruptcyYear === undefined || year - credit.lastBankruptcyYear >= 10;
    const canDeclareBankruptcy = credit.bankruptcies < 2 && cooldownElapsed;

    if (credit.missedPayments >= 4 && character.finance.debt > 0 && canDeclareBankruptcy) {
        relievedDebt = Math.round(character.finance.debt * 0.45);
        adjustDebt(character, -relievedDebt, "Quiebra personal: condonación parcial", year);
        credit.bankruptcies += 1;
        credit.lastBankruptcyYear = year;
        credit.missedPayments = 0;
        credit.score = Math.round(clamp(credit.score - 18, 0, 100));
        character.flags = [...new Set([...(character.flags ?? []), "quiebra_personal"])];
        for (const loan of character.loans ?? []) loan.active = false;
        bankrupt = true;
        character.milestones.push({
            id: `ms-bankrupt-${character.id}-${year}`,
            age: character.age,
            year,
            title: "Declaró una quiebra personal",
            category: "dinero",
        });
    } else if (credit.missedPayments >= 4) {
        // Sin nueva quiebra disponible, la deuda se renegocia sin borrar el
        // historial. Se evita que el mismo impago se repita cada año.
        credit.missedPayments = 0;
        credit.score = Math.round(clamp(credit.score - 4, 0, 100));
    }
    return { score: credit.score, missedPayments: credit.missedPayments, bankrupt, relievedDebt };
}

export function debtPressure(character: CharacterState): number {
    return clamp(character.finance.debt / Math.max(character.finance.annualIncome * 2.5, 1), 0, 1);
}

export function canBorrow(character: CharacterState, amount: number): boolean {
    const credit = ensureCredit(character);
    return credit.score >= 25 && amount <= character.finance.money + character.finance.debt + Math.max(character.finance.annualIncome, 1) * 3;
}

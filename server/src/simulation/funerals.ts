import type { CharacterState, FuneralChoice } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { Errors } from "../errors.js";
import { adjustDebt, spend } from "./economy.js";
import { applyPsychologyDelta } from "./psychology.js";

export interface ResolveFuneralInput {
    funeralId: string;
    choice: FuneralChoice;
    idempotencyKey: string;
}

export interface FuneralResult {
    message: string;
    cost: number;
    debt: number;
    duplicate: boolean;
}

const CHOICE_LABEL: Record<FuneralChoice, string> = {
    intima: "ceremonia íntima",
    grande: "despedida a lo grande",
    sin_ceremonia: "sin ceremonia",
};

export function funeralCost(baseCost: number, choice: FuneralChoice): number {
    if (choice === "intima") return Math.max(80, Math.round(baseCost * 0.65));
    if (choice === "grande") return Math.max(150, Math.round(baseCost * 1.8));
    return 0;
}

/**
 * Cobra una despedida solo cuando el jugador la elige. El pago se divide entre
 * saldo y deuda y siempre queda auditado en el libro mayor.
 */
export function resolveFuneral(
    character: CharacterState,
    input: ResolveFuneralInput,
    year: number,
): FuneralResult {
    character.actionKeys ??= {};
    const fingerprint = `${input.funeralId}:${input.choice}`;
    const stored = character.actionKeys[`funeral:${input.idempotencyKey}`];
    if (stored) {
        if (stored !== fingerprint) throw Errors.conflict("Esta clave ya identifica otra decisión.");
        return { message: "La decisión sobre el funeral ya estaba registrada.", cost: 0, debt: 0, duplicate: true };
    }
    const funeral = character.pendingFunerals?.find((entry) => entry.id === input.funeralId);
    if (!funeral) throw Errors.conflict("Este funeral ya no tiene una decisión pendiente.");
    if (funeral.year > year) throw Errors.conflict("Este funeral todavía no puede resolverse.");

    const cost = funeralCost(funeral.baseCost, input.choice);
    let charged = cost;
    let debt = 0;
    if (character.age < 18) {
        charged = 0;
        debt = 0;
    } else if (cost > 0) {
        const cash = Math.min(Math.max(0, character.finance.money), cost);
        if (cash > 0) spend(character, cash, `Funeral de ${funeral.relativeName} · pago en efectivo`, year);
        debt = Math.max(0, Math.round((cost - cash) * 100) / 100);
        if (debt > 0) {
            adjustDebt(character, debt, `Deuda por el funeral de ${funeral.relativeName}`, year);
            applyPsychologyDelta(character, { stress: 2 });
        }
    }

    if (input.choice === "intima") {
        character.stats.happiness = clamp(character.stats.happiness + 1);
        character.stats.relationships = clamp(character.stats.relationships + 2);
        applyPsychologyDelta(character, { grief: -3, stress: -1 });
    } else if (input.choice === "grande") {
        character.stats.happiness = clamp(character.stats.happiness + 2);
        character.stats.relationships = clamp(character.stats.relationships + 5);
        applyPsychologyDelta(character, { grief: -6, stress: debt > 0 ? 3 : 1 });
    } else {
        character.stats.happiness = clamp(character.stats.happiness - 5);
        character.stats.relationships = clamp(character.stats.relationships - 3);
        applyPsychologyDelta(character, { grief: 2, stress: 4 });
    }

    character.pendingFunerals = (character.pendingFunerals ?? []).filter((entry) => entry.id !== funeral.id);
    const relative = character.story?.relatives.find((entry) => entry.id === funeral.relativeId);
    if (relative) relative.funeralSettled = true;

    const moneyPhrase = character.age < 18
        ? "Los gastos los asumió el hogar."
        : charged > 0
            ? `El coste quedó registrado en la cuenta${debt > 0 ? " y una parte pasó a deuda" : ""}.`
            : "Elegiste no destinar dinero a una ceremonia.";
    const text = `${funeral.relativeName} murió. Te despediste con una ${CHOICE_LABEL[input.choice]}. ${moneyPhrase}`;
    character.manualActions = [
        ...(character.manualActions ?? []),
        { year, month: character.liveEconomy?.month ?? 0, action: "funeral", text },
    ];
    character.milestones.push({
        id: `ms-funeral-${character.id}-${funeral.id}`,
        age: character.age,
        year,
        title: `Despedida de ${funeral.relativeName}`,
        category: "familia",
    });
    character.actionKeys[`funeral:${input.idempotencyKey}`] = fingerprint;

    return { message: `Despedida registrada: ${CHOICE_LABEL[input.choice]}.`, cost: charged, debt, duplicate: false };
}

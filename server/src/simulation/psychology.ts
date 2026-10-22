import type { CharacterState, PsychologyState } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";

function round(value: number): number {
    return Math.round(clamp(value, 0, 100) * 10) / 10;
}

export function createPsychology(character: CharacterState, tier = 3, support = 45): PsychologyState {
    return {
        resilience: round(35 + tier * 3 + support * 0.1),
        selfEsteem: round(40 + tier * 3 + support * 0.08),
        stress: round(clamp(55 - support * 0.2 - tier * 2, 10, 90)),
        grief: 0,
        burnout: 0,
        lifeSatisfaction: round(character.stats.happiness),
    };
}

export function applyPsychologyDelta(
    character: CharacterState,
    delta: Partial<PsychologyState>,
): void {
    if (!character.psychology) character.psychology = createPsychology(character);
    const current = character.psychology;
    for (const key of Object.keys(delta) as (keyof PsychologyState)[]) {
        current[key] = round(current[key] + (delta[key] ?? 0));
    }
}

/**
 * La psicología no es una segunda barra de felicidad: resume recursos
 * emocionales, tensión acumulada y duelo. Influye en la salud y la felicidad
 * con una fuerza limitada, para que una decisión no pueda borrar una vida.
 */
export function advancePsychology(
    character: CharacterState,
    year: number,
): string[] {
    if (!character.psychology) character.psychology = createPsychology(character);
    const p = character.psychology;
    const notes: string[] = [];
    const employed = character.employment.status === "employed" || character.employment.status === "self-employed";
    const unemployed = character.employment.status === "unemployed";
    const debtPressure = clamp(
        character.finance.debt / Math.max(character.finance.annualIncome * 2, 1),
        0,
        1.5,
    );
    const savingsBuffer = clamp(
        character.finance.money / Math.max(character.finance.annualExpenses, 1),
        0,
        12,
    );

    const targetStress = clamp(
        20 +
        debtPressure * 34 +
        (unemployed ? 19 : 0) +
        (character.healthPlan === "ninguno" ? 5 : 0) +
        (character.chronicConditions.length > 0 ? 8 : 0) +
        (character.age < 18 ? 4 : 0) -
        savingsBuffer * 1.2 -
        (character.partnerName ? 4 : 0),
        0,
        100,
    );
    p.stress = round(p.stress + (targetStress - p.stress) * 0.18);
    p.grief = round(Math.max(0, p.grief - 3.5));

    const targetResilience = clamp(
        35 +
        (character.story?.temperament && ["Persistente", "Tranquilo", "Curioso"].includes(character.story.temperament) ? 8 : 0) +
        (character.age > 25 ? 8 : 0) +
        (character.stats.relationships - 50) * 0.18 +
        (character.stats.knowledge - 50) * 0.12 -
        debtPressure * 7,
        10,
        95,
    );
    p.resilience = round(p.resilience + (targetResilience - p.resilience) * 0.1);

    const targetEsteem = clamp(
        42 +
        (employed ? 8 : 0) +
        (character.educationLevel === "university" || character.educationLevel === "postgraduate" ? 8 : 0) +
        (character.milestones.length > 4 ? 5 : 0) -
        (unemployed ? 9 : 0) -
        debtPressure * 8,
        0,
        100,
    );
    p.selfEsteem = round(p.selfEsteem + (targetEsteem - p.selfEsteem) * 0.12);

    const workIntensity = employed ? 1 : 0;
    const targetBurnout = clamp(
        workIntensity * (p.stress * 0.42 + (character.employment.contractQuality < 45 ? 12 : 0)) +
        (character.children > 2 ? 5 : 0) -
        (character.story?.focus === "health" ? 8 : 0) -
        (character.story?.focus === "hobbies" ? 4 : 0),
        0,
        100,
    );
    p.burnout = round(p.burnout + (targetBurnout - p.burnout) * 0.16);

    const targetSatisfaction = clamp(
        character.stats.happiness * 0.45 +
        character.stats.relationships * 0.2 +
        character.stats.health * 0.15 +
        (100 - p.stress) * 0.12 +
        (100 - p.burnout) * 0.08 -
        p.grief * 0.25,
        0,
        100,
    );
    p.lifeSatisfaction = round(p.lifeSatisfaction + (targetSatisfaction - p.lifeSatisfaction) * 0.2);

    if (p.stress > 75) {
        character.stats.health = round(character.stats.health - 0.35);
        character.stats.happiness = round(character.stats.happiness - 0.5);
        if (p.stress > 88) notes.push("El estrés empezó a afectar al sueño y al cuerpo.");
    }
    if (p.grief > 45) {
        character.stats.happiness = round(character.stats.happiness - 0.55);
    }
    if (p.burnout > 70) {
        character.stats.health = round(character.stats.health - 0.25);
        character.stats.happiness = round(character.stats.happiness - 0.35);
    }
    if (p.lifeSatisfaction > 68 && p.stress < 42) {
        character.stats.happiness = round(character.stats.happiness + 0.35);
    }
    if (year > 0 && p.stress > 82 && character.age >= 18 && character.age <= 70 && (year % 5 === 0)) {
        notes.push("Un año de tensión sostenida te dejó más cerca del agotamiento que de tus proyectos.");
    }
    return notes;
}

export function griefFromLoss(
    character: CharacterState,
    closeness: number,
    sudden: boolean,
): void {
    if (!character.psychology) character.psychology = createPsychology(character);
    const shock = sudden ? 14 : 8;
    applyPsychologyDelta(character, {
        grief: clamp(18 + closeness * 0.35 + shock, 0, 100),
        stress: sudden ? 9 : 4,
        selfEsteem: -2,
    });
    character.stats.happiness = round(character.stats.happiness - clamp(3 + closeness * 0.05, 0, 9));
    character.stats.relationships = round(character.stats.relationships - 1.5);
}

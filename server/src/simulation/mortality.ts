import type { CharacterState, Difficulty, Sex } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { getCountry, type CountryData } from "../demographics/dataset.js";
import { DIFFICULTY_META } from "@life-duel/shared";
import { mortalityModel } from "./models.js";
import { realismModel } from "./realism.js";
import type { Rng } from "./rng.js";

const calibrationCache = new Map<string, number>();

export function lifeExpectancyFor(code: string, sex: Sex): number {
    const country = getCountry(code);
    return sex === "female" ? country.lifeExpectancy.female : country.lifeExpectancy.male;
}

function baselineHazard(age: number): number {
    const model = mortalityModel();
    if (age <= 0) return 0;
    return model.gompertz.adultHazardA * Math.exp(model.gompertz.adultHazardB * age);
}

function survivalLifeExpectancy(country: CountryData, sex: Sex, factor: number): number {
    const model = mortalityModel();
    const infantRisk = clamp(country.infantMortalityPer1000 / 1000, 0, 0.4);
    let survival = 1 - infantRisk;
    let expected = survival;
    for (let age = 1; age <= model.gompertz.ageCap; age += 1) {
        const hazard = baselineHazard(age) * factor;
        const deathProbability = 1 - Math.exp(-hazard);
        survival *= 1 - deathProbability;
        expected += survival;
    }
    return expected;
}

/**
 * Calibra el multiplicador de Gompertz para acercar la esperanza de vida
 * simulada a la del país/sexo. La tabla completa no está disponible: el
 * resultado es una aproximación explícitamente provisional.
 */
export function calibratedHazardFactor(code: string, sex: Sex): number {
    const cacheKey = `${code}-${sex}`;
    const cached = calibrationCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const country = getCountry(code);
    const target = sex === "female" ? country.lifeExpectancy.female : country.lifeExpectancy.male;
    const model = mortalityModel();
    let low = model.gompertz.calibrationMin;
    let high = model.gompertz.calibrationMax;
    for (let iteration = 0; iteration < model.gompertz.calibrationIterations; iteration += 1) {
        const middle = (low + high) / 2;
        const expected = survivalLifeExpectancy(country, sex, middle);
        if (expected > target) low = middle;
        else high = middle;
    }
    const factor = (low + high) / 2;
    calibrationCache.set(cacheKey, factor);
    return factor;
}

export function annualMortalityRisk(
    character: CharacterState,
    difficulty: Difficulty,
): number {
    if (!character.alive) return 0;
    const model = mortalityModel();
    const country = getCountry(character.currentCountry);
    const factor = calibratedHazardFactor(character.currentCountry, character.sex);
    const age = character.age;

    if (age <= 0) {
        const infantRisk = clamp(country.infantMortalityPer1000 / 1000, 0, 0.4);
        return clamp(infantRisk * DIFFICULTY_META[difficulty].mortalityMultiplier * (character.flags?.includes("duelo_infancia_protegida")?.025:1), 0, character.flags?.includes("duelo_infancia_protegida")?.001:.9);
    }

    if(age<18&&character.flags?.includes("duelo_infancia_protegida"))return Math.min(.0005,baselineHazard(age)*factor*.05);
    const baseHazard = baselineHazard(age) * factor;
    const healthMultiplier = clamp(
        1 + (60 - character.stats.health) * model.healthRisk.perHealthPointBelow,
        model.healthRisk.minHealthMultiplier,
        model.healthRisk.maxHealthMultiplier,
    );
    const chronicMultiplier = Math.min(
        model.healthRisk.maxChronicMultiplier,
        1 + character.chronicConditions.length * (model.healthRisk.chronicConditionMultiplier - 1),
    );
    const accessMultiplier =
        1 - (country.derived.healthcareAccess / 100) * model.healthRisk.healthcareAccessBenefit * 100;
    const povertyMultiplier =
        character.finance.money < character.finance.annualExpenses * 0.35
            ? model.healthRisk.povertyMultiplier
            : 1;
    const frailtyMultiplier =
        age > model.healthRisk.frailtyOnsetAge
            ? 1 + (age - model.healthRisk.frailtyOnsetAge) * model.healthRisk.frailtyPerYear
            : 1;
    const premiumMultiplier = character.healthPlan === "premium" ? 1 - 0.08 : 1;
    const occupation = realismModel().occupations.find(
        (candidate) => candidate.id === character.employment.occupationId,
    );
    const occupationMultiplier = occupation ? clamp(1 + (occupation.risk - 25) / 450, 0.9, 1.22) : 1;
    const flags = new Set(character.flags ?? []);
    const lifestyleMultiplier =
        (flags.has("conduccion_temeraria") ? 1.16 : 1) *
        (flags.has("adiccion") ? 1.22 : 1) *
        (flags.has("delito_violento") ? 1.14 : 1) *
        (flags.has("exposicion_accidente") ? 1.12 : 1);
    const difficultyMultiplier = DIFFICULTY_META[difficulty].mortalityMultiplier;
    const hazard =
        baseHazard *
        healthMultiplier *
        chronicMultiplier *
        Math.max(0.55, accessMultiplier) *
        povertyMultiplier *
        frailtyMultiplier *
        occupationMultiplier *
        lifestyleMultiplier *
        premiumMultiplier *
        difficultyMultiplier;
    return clamp(1 - Math.exp(-hazard), 0, 0.95);
}

export interface DeathRoll {
    died: boolean;
    risk: number;
    cause: string | null;
}

export function rollDeath(
    character: CharacterState,
    difficulty: Difficulty,
    rng: Rng,
): DeathRoll {
    const risk = annualMortalityRisk(character, difficulty);
    character.mortalityRisk = Math.round(risk * 10000) / 100;
    if (!rng.chance(risk * 100)) {
        return { died: false, risk, cause: null };
    }
    const flags = new Set(character.flags ?? []);
    const occupation = realismModel().occupations.find(
        (candidate) => candidate.id === character.employment.occupationId,
    );
    let cause = pickCause(character.age, rng);
    if (flags.has("conduccion_temeraria") && rng.chance(32)) cause = "Accidente de tráfico";
    else if (flags.has("delito_violento") && rng.chance(24)) cause = "Herida por violencia";
    else if (occupation && occupation.risk >= 55 && rng.chance(18)) cause = "Accidente laboral";
    else if (flags.has("adiccion") && rng.chance(20)) cause = "Complicaciones asociadas al consumo";
    return { died: true, risk, cause };
}

export function pickCause(age: number, rng: Rng): string {
    const model = mortalityModel();
    const group =
        model.causeWeights.find((entry) => age >= entry.minAge && age <= entry.maxAge) ??
        model.causeWeights[model.causeWeights.length - 1];
    if (!group) return "Causa no determinada";
    return rng.weighted(group.causes, (cause) => cause.weight).name;
}

/** Desgaste anual de salud y efecto de hábitos, acceso sanitario y dinero. */
export function applyHealthDecline(
    character: CharacterState,
    difficulty: Difficulty,
): number {
    const country = getCountry(character.currentCountry);
    const age = character.age;
    let decline = 0.05;
    if (age > 30) decline += 0.16 + Math.max(0, age - 60) * 0.04;
    if (character.chronicConditions.length > 0) {
        decline += character.chronicConditions.length * 0.32;
    }
    const accessBonus = (country.derived.healthcareAccess / 100) * 0.32;
    decline -= accessBonus;
    if (character.healthPlan === "premium") decline -= 0.55;
    if (character.healthPlan === "basico") decline -= 0.18;
    if (character.finance.money < character.finance.annualExpenses * 0.35) decline += 0.42;
    if (character.stats.happiness > 65) decline -= 0.08;
    if (character.stats.happiness < 30) decline += 0.16;
    decline *= DIFFICULTY_META[difficulty].mortalityMultiplier;
    const rounded = Math.round(decline * 100) / 100;
    character.stats.health = Math.round(clamp(character.stats.health - rounded) * 10) / 10;
    return rounded;
}

/** Riesgo anual en porcentaje para mostrar en la interfaz. */
export function mortalityRiskPercent(character: CharacterState, difficulty: Difficulty): number {
    return Math.round(annualMortalityRisk(character, difficulty) * 10000) / 100;
}

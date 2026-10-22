import type { CharacterState, CoreStatKey, DecisionPrompt } from "@life-duel/shared";
import { EDUCATION_META } from "@life-duel/shared";
import { getDecision } from "./decisions.js";
import { resolveDecisionOption } from "./decision-selector.js";
import type { OutcomeEffect } from "./decision-types.js";

const STAT_WEIGHTS: Record<CoreStatKey, number> = {
    health: 1.35,
    happiness: 1.15,
    knowledge: 1,
    relationships: 0.95,
};

const PSYCHOLOGY_WEIGHTS: Record<string, number> = {
    resilience: 0.16,
    selfEsteem: 0.14,
    stress: -0.2,
    grief: -0.16,
    burnout: -0.2,
    lifeSatisfaction: 0.16,
};

const FLAG_VALUE: Record<string, number> = {
    casa_propia: 3,
    vivienda_pagada: 2.5,
    alquiler: -0.4,
    migrante: 0.5,
    estatus_irregular: -3,
    migracion_preparada: 1.5,
    visado_rechazado: -2.5,
    estafa_migratoria: -3,
    segunda_oportunidad: 2,
    beca_escolar: 1.5,
    dejo_estudios: -2.5,
    contrato_negociado: 1.5,
    contrato_firmado_sin_leer: -1,
    despido_realizado: -2,
    empresa_familiar: 0.3,
    socio_empresa: 1.5,
    sin_hijos_elegido: 0.3,
    negocio_quebrado: -2.5,
    negocio_activo: 2,
    empresa_expandida: 3,
    empresa_exportadora: 3,
    empresa_vendida: 2,
    equipo_estable: 2,
    incentivos_equipo: 2,
    cuentas_regulares: 1.5,
    sancion_empresa: -3,
    inspeccion_pendiente: -1.5,
    hipoteca: -0.5,
    deuda_medica: -2,
    terapia: 2,
    red_apoyo: 2,
    testamento_firmado: 2,
    legado_solidario: 2,
    testamento_pendiente: -1.5,
    apoyo_padres: 2,
    cuidador_familiar: 1,
    boda_financiada: 1,
    boda_apoyo: 1,
    limite_familiar: -0.5,
    donante: 1.5,
    voluntariado: 1.5,
    mascota: 1.5,
    mascota_cuidada: 1,
    vida_transnacional: 1,
};

function psychologyValue(psychology: OutcomeEffect["psychology"] | undefined): number {
    if (!psychology) return 0;
    let value = 0;
    for (const [key, weight] of Object.entries(PSYCHOLOGY_WEIGHTS)) {
        value += (psychology[key as keyof typeof psychology] ?? 0) * weight;
    }
    return value;
}

function flagsValue(flags: string[] | undefined): number {
    if (!flags) return 0;
    return flags.reduce((sum, flag) => sum + (FLAG_VALUE[flag] ?? 0), 0);
}

function businessHealth(character?: CharacterState): number {
    if (!character?.business?.active) return 0;
    return character.business.annualRevenue - character.business.annualCosts;
}

function effectValue(effect: OutcomeEffect | undefined, character?: CharacterState): number {
    if (!effect) return 0;
    let value = 0;
    for (const key of Object.keys(STAT_WEIGHTS) as CoreStatKey[]) {
        const delta = effect.stats?.[key] ?? 0;
        let weight = STAT_WEIGHTS[key];
        if (character) {
            if (key === "health") {
                if (character.stats.health < 45) weight *= 2.6;
                if (delta < 0 && character.stats.health < 30) weight *= 3.2;
            }
            if (key === "happiness" && character.stats.happiness < 40) weight *= 2.2;
            if (key === "relationships" && character.stats.relationships < 35) weight *= 1.7;
        }
        value += delta * weight;
    }
    value += psychologyValue(effect.psychology);
    value += flagsValue(effect.flags);

    // Dinero: el objetivo por defecto es riqueza equilibrada. Un dólar PPP no
    // vale lo mismo a los 20 que a los 60, pero el motor no conoce la tirada
    // futura; solo valora el flujo declarado de la opción.
    const liquid = character?.finance.money ?? 0;
    const expenses = Math.max(character?.finance.annualExpenses ?? 1, 1);
    const cashPressure = liquid < expenses ? 2.2 : liquid < expenses * 3 ? 1.4 : 1;
    value += ((effect.moneyDelta ?? 0) / 250) * cashPressure;
    value -= (effect.debtDelta ?? 0) / 70;

    if (effect.incomeModifierDelta) value += effect.incomeModifierDelta * 40;
    if (effect.expenseModifierDelta) value -= effect.expenseModifierDelta * 16;
    if (effect.studyProgram) value += character && character.age<35 && liquid>expenses ? 16 : 2;
    if (effect.shareHousehold && character?.partnerProfile && !character.partnerProfile.sharedHousehold) value += 10;
    if (effect.education) value += EDUCATION_META[effect.education].rank * 4.5;
    if (effect.employment === "employed" || effect.employment === "self-employed") {
        value += character?.employment.status === "unemployed" ? 24 : 5;
    }
    if (effect.employment === "unemployed") value -= 9;
    if (effect.employment === "retired") value += 2;
    if (effect.contractQuality) value += effect.contractQuality * 0.05;
    if (effect.setPartner) value += character && !character.partnerName && character.age >= 20 ? 22 : 3;
    if (effect.clearPartner) value -= 4;
    if(character&&character.age<45&&character.children<2&&effect.flags?.some(f=>["no_nueva_crianza","sin_hijos_elegido"].includes(f)))value-=30;
    if (effect.childrenDelta) value += effect.childrenDelta * (character && character.children < 2 && character.finance.money > Math.max(0,character.finance.annualExpenses / 4) ? 22 : 2);
    if (effect.grandchildrenDelta) value += effect.grandchildrenDelta * 1.5;
    if (effect.housingDelta) value += effect.housingDelta * 0.55;
    if (effect.healthPlan === "premium") value += 3;
    if (effect.healthPlan === "basico") value += 1;
    if (effect.chronicCondition) value -= 5;
    if (effect.medical?.severity === "grave") value -= 4;
    else if (effect.medical?.severity === "moderada") value -= 2;
    else if (effect.medical?.severity === "leve") value -= 0.5;
    if (effect.milestone) value += 1.2;
    if (effect.creditDelta) value += effect.creditDelta * 0.04;
    if (effect.pet) value += 3;

    // Empresa: se valora el flujo y el control, no solo la reputación.
    if (effect.businessStart) {
        const reserve = (character?.finance.money ?? 0) > expenses * 2;
        value += reserve ? 32 : 3;
        if (character?.employment.status === "unemployed") value += 8;
        if (character && character.age > 55) value -= 10;
        if (character && character.stats.health < 35) value -= 8;
    }
    if (effect.businessChange) {
        value += (effect.businessChange.revenueDeltaPct ?? 0) * 35;
        value += (effect.businessChange.reputationDelta ?? 0) * 0.3;
        value += (effect.businessChange.employeesDelta ?? 0) * 2.2;
        value -= (effect.businessChange.costDelta ?? 0) / 450;
        value -= (effect.businessChange.marketingSpendDelta ?? 0) / 900;
    }
    if (effect.endBusiness) {
        value += (effect.endBusiness.salePrice ?? 0) / 300;
        value += character && character.age >= 60 ? 8 : 2;
        // Vender una empresa rentable no es la primera opción; vender una que
        // pierde dinero sí puede ser una salida racional.
        value += businessHealth(character) < 0 ? 8 : -2;
    }

    for (const future of effect.schedule ?? []) {
        value += psychologyValue(future.psychology);
        value += flagsValue(future.flags);
        value += (future.moneyDelta ?? 0) / 500;
        value += (future.incomeModifierDelta ?? 0) * 7;
        value -= (future.expenseModifierDelta ?? 0) * 6;
        if (future.education) value += EDUCATION_META[future.education].rank * 1.5;
        if (future.employment === "employed" || future.employment === "self-employed") value += 2;
        if (future.childrenDelta) value += future.childrenDelta;
        if (future.grandchildrenDelta) value += future.grandchildrenDelta * 0.8;
        if (future.housingDelta) value += future.housingDelta * 0.35;
        if (future.healthPlan === "premium") value += 1;
        if (future.chronicCondition) value -= 3;
    }
    return value;
}

/**
 * Política automática documentada y orientada a objetivos.
 *
 * Objetivo: construir patrimonio y un negocio viable sin destruir salud,
 * felicidad ni vínculos. La política:
 * - penaliza los repliegues cuando existe una acción real;
 * - reserva liquidez antes de invertir;
 * - prioriza salud cuando está por debajo de 45;
 * - valora ingresos recurrentes, educación y crecimiento de empresa;
 * - no conoce la tirada del año ni el mercado futuro.
 *
 * Sigue siendo determinista y no siempre acierta: la opción con mayor utilidad
 * esperada se elige el 90 % de las veces; las alternativas razonables conservan
 * un pequeño margen. Así el automático es competente, no una calculadora omnisciente.
 */
export function chooseAutoOption(
    prompt: DecisionPrompt,
    worldSeed: string,
    slot: number,
    turn: number,
    character?: CharacterState,
): string {
    const decision = getDecision(prompt.id);
    if (!decision) return prompt.options[0]?.id ?? "";
    const scored: { id: string; score: number }[] = [];

    for (const view of prompt.options) {
        const option = resolveDecisionOption(decision, view.id);
        if (!option) continue;
        const chance = (view.successChance ?? 100) / 100;
        const successValue = effectValue(option.outcomes.success, character);
        const failureValue = effectValue(option.outcomes.failure ?? option.outcomes.success, character);
        let score = successValue * chance + failureValue * (1 - chance);
        const cost = view.cost ?? 0;
        if (cost > 0) {
            const liquid = character?.finance.money ?? 0;
            const reserve = Math.max(character?.finance.annualExpenses ?? 0, 1) * 1.5;
            const startsBusiness = Boolean(option.outcomes.success.businessStart);
            score -= cost / (startsBusiness ? 1200 : 350);
            if (startsBusiness && cost > liquid - reserve*.5) score -= 35;
            if (!startsBusiness) {
                if (liquid < reserve) score -= (reserve - liquid) / 250;
                if (liquid > 0 && cost > liquid * 0.65) score -= 6;
            }
        }
        if (option.id.startsWith("repliegue_")) score -= 24;
        if (option.id === "no_donar_ahora" && character && character.finance.money > character.finance.annualExpenses * 4) {
            score -= 2;
        }
        scored.push({ id: option.id, score });
    }

    if (scored.length === 0) return prompt.options[0]?.id ?? "";
    scored.sort((a, b) => b.score - a.score);

    // Choose the best expected outcome from information visible to the player.
    // Checks and future events remain uncertain; autoplay gets no future RNG.
    return scored[0]!.id;
}

import { relationshipProgress, relationshipSummary } from "./relationship-progress.js";
import { contextMatches } from "./context-gates.js";
import { monthlyInstallment, mortgageRate } from "./mortgage.js";
import { UNIVERSITY_PROGRAMS, universityBlocked } from "./education.js";
import { personalize } from "./personalization.js";
import { parentingBlocked } from "./household-care.js";
import type {
    BirthProfile,
    CharacterState,
    ContentSeverity,
    DecisionOptionView,
    DecisionPrompt,
    RiskLevel,
} from "@life-duel/shared";
import {
    clamp,
    DECISION_CATEGORY_META,
    EDUCATION_META,
    riskLabel as riskLevel,
} from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { migrationCost } from "./country-context.js";
import { canAfford } from "./economy.js";
import { DECISIONS, getDecision } from "./decisions.js";
import type {
    DecisionContext,
    DecisionDefinition,
    DecisionOptionDefinition,
    SelectedDecision,
} from "./decision-types.js";
import { getFallbackOption } from "./fallback-options.js";
import { chooseDecisionVariant } from "./decision-variants.js";
import { createRng, deriveSeed } from "./rng.js";

/** Evita que una decisión de suceso sea la pregunta principal cada año. */
export const EVENT_DECISION_GAP_YEARS = 3;
const EVENT_DECISION_IDS = new Set(
    DECISIONS.filter((decision) => decision.priority === "event").map((decision) => decision.id),
);

function lastEventDecisionAge(character: CharacterState): number {
    return Math.max(
        -100,
        ...Object.entries(character.lastDecisionAges ?? {})
            .filter(([id]) => EVENT_DECISION_IDS.has(id))
            .map(([, age]) => age),
    );
}

function educationRank(level: CharacterState["educationLevel"]): number {
    return EDUCATION_META[level]?.rank ?? 0;
}

export function hasPartner(character: CharacterState): boolean {
    return (
        character.partnerName !== null ||
        character.maritalStatus === "married" ||
        character.maritalStatus === "dating"
    );
}

export function requirementsMet(
    character: CharacterState,
    requirements: DecisionDefinition["requirements"],
    contentSeverity: ContentSeverity,
    birth?: BirthProfile,
): boolean {
    if (!requirements) return true;
    if (requirements.severity === "full" && contentSeverity === "moderate") return false;
    if (requirements.minAge !== undefined && character.age < requirements.minAge) return false;
    if (requirements.maxAge !== undefined && character.age > requirements.maxAge) return false;
    if (
        requirements.minEducation &&
        educationRank(character.educationLevel) < EDUCATION_META[requirements.minEducation].rank
    ) {
        return false;
    }
    if (
        requirements.maxEducation &&
        educationRank(character.educationLevel) > EDUCATION_META[requirements.maxEducation].rank
    ) {
        return false;
    }
    if (requirements.employment && !requirements.employment.includes(character.employment.status)) {
        return false;
    }
    if (requirements.maritalStatus && !requirements.maritalStatus.includes(character.maritalStatus)) return false;
    if (requirements.hasPartner === true && !hasPartner(character)) return false;
    if (requirements.hasPartner === false && hasPartner(character)) return false;
    if (requirements.adultChildrenMin !== undefined) {
        const adults = character.story?.relatives.filter(r => r.role === "child" && r.generation !== "grandchild" && r.alive && (birth?.year ?? 2000) + character.age - r.bornYear >= 18).length ?? 0;
        if (adults < requirements.adultChildrenMin) return false;
    }
    if (requirements.childrenMin !== undefined && character.children < requirements.childrenMin) {
        return false;
    }
    if (requirements.childrenMax !== undefined && character.children > requirements.childrenMax) {
        return false;
    }
    if (requirements.grandchildrenMin !== undefined && (character.grandchildren ?? 0) < requirements.grandchildrenMin) {
        return false;
    }
    if (requirements.relativeRoleAlive) { const relative = character.story?.relatives.find(r => r.role === requirements.relativeRoleAlive && r.alive); if (!relative) return false; if (requirements.maxRelativeHealth !== undefined && (relative.health ?? 70) > requirements.maxRelativeHealth) return false; }
    if (requirements.parentsAlive !== undefined) {
        const parentsAlive = character.story
            ? character.story.relatives.some(
                (relative) =>
                    (relative.role === "mother" || relative.role === "father") && relative.alive,
            )
            : Boolean(
                (birth?.details?.mother.alive !== false && birth?.details?.mother) ||
                (birth?.details?.father.alive !== false && birth?.details?.father),
            );
        if (parentsAlive !== requirements.parentsAlive) return false;
    }
    if (requirements.hasPet !== undefined) {
        const hasPet = Boolean(character.pets?.some((pet) => pet.alive)) ||
            Boolean(character.flags?.includes("mascota"));
        if (hasPet !== requirements.hasPet) return false;
    }
    if (requirements.minMoney !== undefined && character.finance.money < requirements.minMoney) return false;
    if (requirements.minIncome !== undefined && character.finance.annualIncome < requirements.minIncome) {
        return false;
    }
    if (requirements.minDebt !== undefined && character.finance.debt < requirements.minDebt) return false;
    if (requirements.maxDebt !== undefined && character.finance.debt > requirements.maxDebt) return false;
    if (requirements.minHealth !== undefined && character.stats.health < requirements.minHealth) return false;
    if (requirements.maxHealth !== undefined && character.stats.health > requirements.maxHealth) return false;
    if (requirements.maxHappiness !== undefined && character.stats.happiness > requirements.maxHappiness) return false;
    const country = getCountry(character.currentCountry);
    if (requirements.incomeGroup && !requirements.incomeGroup.includes(country.incomeGroup)) return false;
    if (requirements.country && !requirements.country.includes(country.code)) return false;
    if (requirements.notCountry && requirements.notCountry.includes(country.code)) return false;
    const flags = new Set(character.flags ?? []);
    if (requirements.flagsAll?.some((flag) => !flags.has(flag))) return false;
    if (requirements.flagsAny && !requirements.flagsAny.some((flag) => flags.has(flag))) return false;
    if (requirements.flagsNone?.some((flag) => flags.has(flag))) return false;
    if (requirements.hasBusiness !== undefined && Boolean(character.business?.active) !== requirements.hasBusiness) return false;
    if (requirements.businessKind && (!character.business || !requirements.businessKind.includes(character.business.kind))) return false;
    if (requirements.sex && !requirements.sex.includes(character.sex)) return false;
    if (requirements.familyTierMin !== undefined && (birth?.family.tier ?? 0) < requirements.familyTierMin) return false;
    if (requirements.familyTierMax !== undefined && (birth?.family.tier ?? 6) > requirements.familyTierMax) return false;
    if (requirements.householdStructure && !requirements.householdStructure.includes(birth?.details?.household?.structure ?? "nuclear")) return false;
    if (requirements.religionAny && !requirements.religionAny.some((religion) => birth?.details?.religion?.toLowerCase().includes(religion.toLowerCase()))) return false;
    if (requirements.rural !== undefined && (birth?.details?.rural ?? false) !== requirements.rural) return false;
    if (requirements.migrated !== undefined && (character.birthCountry !== character.currentCountry) !== requirements.migrated) return false;
    if (requirements.minLivingStandard !== undefined && character.livingStandard < requirements.minLivingStandard) return false;
    if (requirements.maxLivingStandard !== undefined && character.livingStandard > requirements.maxLivingStandard) return false;
    return true;
}

export function resolveCostRule(rule: NonNullable<DecisionOptionDefinition["cost"]>, character: CharacterState): number {
    const country = getCountry(character.currentCountry);
    if (rule.destinationCountry) {
        return migrationCost(country, getCountry(rule.destinationCountry));
    }
    const gdp = country.gdpPerCapitaPpp;
    const income = character.finance.annualIncome > 0 ? character.finance.annualIncome : gdp * 0.4;
    const essentials =
        character.finance.annualExpenses > 0
            ? character.finance.annualExpenses
            : country.derived.costOfLivingIndex * 1.2;
    const value =
        (rule.fixed ?? 0) +
        (rule.shareOfAnnualIncome ?? 0) * income +
        (rule.shareOfGdp ?? 0) * gdp +
        (rule.shareOfEssentials ?? 0) * essentials;
    return Math.max(0, Math.round(value));
}

export function optionCost(
    option: DecisionOptionDefinition,
    character: CharacterState,
): number {
    return option.cost ? resolveCostRule(option.cost, character) : 0;
}

export function successChance(
    option: DecisionOptionDefinition,
    character: CharacterState,
): number | null {
    if (!option.check) return null;
    const { base, type } = option.check;
    let modifier = 0;
    switch (type) {
        case "educacion":
            modifier = (character.stats.knowledge - 50) * 0.3 + educationRank(character.educationLevel) * 1.5;
            break;
        case "trabajo":
            modifier =
                (character.stats.knowledge - 50) * 0.15 +
                (character.stats.relationships - 50) * 0.1 +
                educationRank(character.educationLevel) * 2 +
                (character.employment.status === "employed" ? 4 : 0);
            break;
        case "salud":
            modifier = (character.stats.health - 50) * 0.3 + (character.finance.money > 0 ? 3 : -4);
            break;
        case "social":
            modifier = (character.stats.relationships - 50) * 0.32 + (character.stats.happiness - 50) * 0.12;
            break;
        case "riesgo":
            modifier = (character.stats.knowledge - 50) * 0.1 + (character.stats.health - 50) * 0.2;
            break;
        default:
            modifier = 0;
    }
    return Math.round(clamp(base + modifier, 5, 95));
}

export function optionAvailable(
    option: DecisionOptionDefinition,
    character: CharacterState,
    contentSeverity: ContentSeverity,
    birth?: BirthProfile,
): boolean {
    if (!requirementsMet(character, option.requirements, contentSeverity, birth)) return false;
    if (option.outcomes.success.maritalStatus === "married" && relationshipProgress(character, (birth?.year ?? 2000) + character.age)?.stage !== "engaged") return false;
    if ((option.outcomes.success.childrenDelta ?? 0) > 0 && parentingBlocked(character, (birth?.year ?? 2000) + character.age)) return false;
    if (option.outcomes.success.studyProgram) {
        const program = UNIVERSITY_PROGRAMS.find(p => p.id === option.outcomes.success.studyProgram);
        if (!program || universityBlocked(character, program)) return false;
    }
    const cost = optionCost(option, character);
    // En la infancia el hogar cubre el coste de la decisión; el personaje no
    // puede endeudarse por una actividad escolar o familiar.
    if (character.age < 18) return true;
    return cost <= 0 || canAfford(character, cost);
}

function impactOf(option: DecisionOptionDefinition): string[] {
    const effect = option.outcomes.success;
    const parts: string[] = [];
    const labels = { health: "Salud", happiness: "Felicidad", knowledge: "Conocimiento", relationships: "Relaciones" } as const;
    for (const [key, label] of Object.entries(labels)) {
        const value = effect.stats?.[key as keyof typeof labels] ?? 0;
        if (value) parts.push(`${label} ${value > 0 ? "+" : ""}${Math.round(value)}`);
    }
    if (effect.moneyDelta) parts.push(`Dinero ${effect.moneyDelta > 0 ? "+" : ""}${Math.round(effect.moneyDelta)}`);
    if (effect.debtDelta) parts.push(`Deuda ${effect.debtDelta > 0 ? "+" : ""}${Math.round(effect.debtDelta)}`);
    if (effect.employment) {
        parts.push(
            effect.employment === "employed" ? "Empleo" :
                effect.employment === "self-employed" ? "Autoempleo" :
                    effect.employment === "student" ? "Estudios" : "Cambio laboral",
        );
    }
    if (effect.education) parts.push(`Formación: ${EDUCATION_META[effect.education].label}`);
    if (effect.setPartner) parts.push("Pareja");
    if (effect.studyProgram) parts.push("Matrícula y estudios mensuales");
    if (effect.childrenDelta) parts.push(`Hijos ${effect.childrenDelta > 0 ? "+" : ""}${effect.childrenDelta}`);
    if (effect.grandchildrenDelta) parts.push(`Nietos ${effect.grandchildrenDelta > 0 ? "+" : ""}${effect.grandchildrenDelta}`);
    if (effect.migrateTo) parts.push("Migración");
    if (effect.businessStart) parts.push("Nuevo negocio");
    if (effect.businessChange?.revenueDeltaPct) parts.push(`Ingresos del negocio ${effect.businessChange.revenueDeltaPct > 0 ? "+" : ""}${Math.round(effect.businessChange.revenueDeltaPct * 100)}%`);
    if (effect.endBusiness) parts.push("Vender o cerrar el negocio");
    if (effect.pet) parts.push("Mascota");
    if (effect.incomeModifierDelta) parts.push(`Ingresos ${effect.incomeModifierDelta > 0 ? "+" : ""}${Math.round(effect.incomeModifierDelta * 100)}%`);
    return parts.slice(0, 5);
}

/**
 * Resuelve una opción visible a su definición. Incluye las opciones de
 * repliegue que el servidor añade para garantizar tres caminos. El cliente
 * nunca puede inventar una opción: si no está aquí, el servidor la rechaza.
 */
export function resolveDecisionOption(
    decision: DecisionDefinition,
    optionId: string,
): DecisionOptionDefinition | undefined {
    return decision.options.find((option) => option.id === optionId) ??
        getFallbackOption(decision, optionId);
}

function promptForDecision(
    decision: DecisionDefinition,
    character: CharacterState,
    contentSeverity: ContentSeverity,
    eventId?: string,
    birth?: BirthProfile,
    variantContext?: { worldSeed?: string; turn?: number; slot?: number; countryCode?: string },
): DecisionPrompt | null {
    if (!contextMatches(decision, character, birth ? birth.year + character.age : undefined)) return null;
    const variant = ["acuerdo_pareja", "crianza_dialogo"].includes(decision.id) ? undefined : chooseDecisionVariant(
        decision,
        variantContext?.worldSeed,
        variantContext?.turn,
        variantContext?.countryCode,
        eventId ?? decision.eventId,
    );
    const options: DecisionOptionView[] = [];
    for (const option of decision.options) {
        if (!optionAvailable(option, character, contentSeverity, birth)) continue;
        const chance = successChance(option, character);
        options.push({
            id: option.id,
            label: personalize(variant?.optionLabels?.[option.id] ?? option.label, character, birth),
            description: personalize(variant?.optionDescriptions?.[option.id] ?? option.description, character, birth) + (option.outcomes.success.mortgage ? ` Cuota inicial estimada: ${monthlyInstallment(resolveCostRule(option.outcomes.success.mortgage.amountRule, character), mortgageRate(character), option.outcomes.success.mortgage.years)} PPP/mes · ${(mortgageRate(character) * 100).toFixed(1)} % anual del modelo.` : ""),
            cost: optionCost(option, character) || null,
            recurringCost: option.outcomes.success.childPlan ? Math.round(getCountry(character.currentCountry).gdpPerCapitaPpp * option.outcomes.success.childPlan.feeGdp / 12) : undefined,
            successChance: chance,
            risk: riskLevel(chance) as RiskLevel,
            requiresNote: null,
            impact: impactOf(option),
        });
    }
    // Only authored options belong to this situation. Never add generic answers
    // just to fill a fixed number of cards.
    if (options.length === 0) return null;
    const romanticDecision = decision.id.startsWith("relationship_") || decision.id === "acuerdo_pareja";
    const relationshipNote = romanticDecision && birth ? relationshipSummary(character, birth.year + character.age) : undefined;
    const baseContextNote = (variant?.contextNote ?? decision.contextNote) ? personalize((variant?.contextNote ?? decision.contextNote)!, character, birth) : undefined;

    return {
        id: decision.id,
        source: eventId ? "evento" : "vida",
        category: decision.category,
        title: personalize(variant?.title ?? decision.title, character, birth),
        description: personalize(variant?.description ?? decision.description, character, birth),
        age: character.age,
        eventId,
        contextNote: [baseContextNote, relationshipNote].filter(Boolean).join(" ") || undefined,
        options,
    };
}

export function decisionEligible(
    decision: DecisionDefinition,
    character: CharacterState,
    contentSeverity: ContentSeverity,
    eventOnly: boolean,
    birth?: BirthProfile,
): boolean {
    if (!contextMatches(decision, character, birth ? birth.year + character.age : undefined)) return false;
    if (decision.id.startsWith("embarazo_") && character.familyPlans?.length) return false;
    if (character.age < decision.minAge || character.age > decision.maxAge) return false;
    if (eventOnly && decision.priority !== "event") return false;
    if (eventOnly && !decision.options.some((option) => optionAvailable(option, character, contentSeverity, birth))) {
        return false;
    }
    if (!requirementsMet(character, decision.requirements, contentSeverity, birth)) return false;
    if (decision.once && character.usedDecisionIds.includes(decision.id)) return false;
    const lastAge = character.lastDecisionAges?.[decision.id];
    const cooldown = decision.cooldownYears ?? 0;
    if (lastAge !== undefined && cooldown > 0 && character.age - lastAge < cooldown) return false;
    return decision.options.some((option) => optionAvailable(option, character, contentSeverity, birth));
}

function pickWeighted(
    candidates: DecisionDefinition[],
    rng: ReturnType<typeof createRng>,
): DecisionDefinition {
    return rng.weighted(candidates, (decision) => decision.weight ?? 1);
}

function recoveryCrisis(character: CharacterState): boolean {
    if (character.age < 20) return false;
    const status = character.employment.status;
    const workCrisis = (status === "unemployed" || status === "disabled") && character.age < 65;
    const financialPressure =
        status !== "student" &&
        (character.finance.money < 0 ||
            character.finance.debt > Math.max(character.finance.annualIncome * 1.25, 2000));
    const healthCrisis = character.stats.health < 36;
    const moodCrisis = character.stats.happiness < 24 && character.finance.money < 0;
    return workCrisis || financialPressure || healthCrisis || moodCrisis;
}

/**
 * Elige la decisión del año con un flujo derivado de la semilla. La selección
 * ya no es "la primera disponible": pesa contexto, país, familia y etapa, y
 * evita repetir la última pregunta. Ambos jugadores reciben la misma pregunta
 * compartida cuando sus circunstancias lo permiten; las oportunidades
 * personales pueden diferir solo cuando una decisión previa las desbloquea.
 */
export function selectDecision(context: DecisionContext): SelectedDecision | null {
    const { character, birth, worldSeed, turn, lastDecisionId, eventDecisionId, contentSeverity } = context;
    const rng = createRng(deriveSeed(worldSeed, "decision", turn));

    // Una crisis severa merece una respuesta directa antes que la reacción
    // opcional al suceso del año. Así una racha mala no deja al personaje sin
    // ninguna salida real durante décadas.
    if (character.age >= 20) {
        const status = character.employment.status;
        const debtPressure =
            character.finance.money <= 0 &&
            character.finance.debt > Math.max(character.finance.annualIncome * 2, 5000);
        const urgentId =
            character.stats.health < 32
                ? "recuperar_salud"
                : debtPressure
                    ? "renegociar_deudas"
                    : status === "unemployed" && character.age < 65
                        ? "reconstruir_empleo"
                        : null;
        if (urgentId) {
            const urgent = getDecision(urgentId);
            if (urgent && decisionEligible(urgent, character, contentSeverity, false, birth)) {
                return { definition: urgent, source: "vida" };
            }
        }
    }

    if (eventDecisionId) {
        const eventDecision = getDecision(eventDecisionId);
        if (
            eventDecision &&
            eventDecision.priority === "event" &&
            eventDecision.id !== lastDecisionId &&
            character.age - lastEventDecisionAge(character) >= EVENT_DECISION_GAP_YEARS &&
            decisionEligible(eventDecision, character, contentSeverity, true, birth)
        ) {
            return { definition: eventDecision, source: "evento" };
        }
    }

    const childhood = DECISIONS.find(d => d.id.startsWith("infancia_ruta_") && decisionEligible(d, character, contentSeverity, false, birth));
    if (childhood) return { definition: childhood, source: "vida" };

    if (recoveryCrisis(character)) {
        const recoveryCandidates = DECISIONS.filter(
            (decision) =>
                decision.priority === "recovery" &&
                decision.id !== lastDecisionId &&
                decisionEligible(decision, character, contentSeverity, false, birth),
        );
        if (recoveryCandidates.length > 0) {
            return { definition: pickWeighted(recoveryCandidates, rng), source: "vida" };
        }
    }

    // Family opportunities share a cooldown across scenes, so eight encounters
    // neither disappear in the general bank nor repeat every year.
    const familyIds = ["crianza_dialogo"];
    const lastFamily = Math.max(-100, ...Object.entries(character.lastDecisionAges ?? {}).filter(([id]) => id.startsWith("encuentro_") || familyIds.includes(id)).map(([, age]) => age));
    // Las conversaciones de pareja no deben convertirse en la pregunta anual.
    const familyGap = character.partnerName ? 6 : 5;
    if (character.age >= 20 && character.age - lastFamily >= familyGap) {
        const family = DECISIONS.filter(d => (character.partnerName ? familyIds.includes(d.id) : d.id.startsWith("encuentro_")) && d.id !== lastDecisionId && decisionEligible(d, character, contentSeverity, false, birth));
        if (family.length && (character.age - lastFamily >= familyGap + 2 || rng.chance(55))) return { definition: pickWeighted(family, rng), source: "vida" };
    }

    const majorCandidates = DECISIONS.filter(
        (decision) =>
            !decision.monthlyOnly && decision.priority === "major" &&
            decision.id !== lastDecisionId &&
            decisionEligible(decision, character, contentSeverity, false, birth),
    );
    if (majorCandidates.length > 0) {
        return { definition: pickWeighted(majorCandidates, rng), source: "vida" };
    }

    const focusCandidates = DECISIONS.filter(
        (decision) =>
            decision.priority === "focus" &&
            decision.id !== lastDecisionId &&
            decisionEligible(decision, character, contentSeverity, false, birth),
    );
    if (focusCandidates.length > 0) {
        return { definition: pickWeighted(focusCandidates, rng), source: "vida" };
    }

    const fallback = getDecision("enfoque_anual");
    if (fallback && decisionEligible(fallback, character, contentSeverity, false, birth)) {
        return { definition: fallback, source: "vida" };
    }
    return null;
}

export function buildPrompt(
    decision: DecisionDefinition,
    character: CharacterState,
    contentSeverity: ContentSeverity,
    eventId?: string,
    birth?: BirthProfile,
    variantContext?: { worldSeed?: string; turn?: number; slot?: number; countryCode?: string },
): DecisionPrompt | null {
    return promptForDecision(decision, character, contentSeverity, eventId, birth, variantContext);
}

export function decisionCategoryLabel(decision: DecisionDefinition): string {
    return DECISION_CATEGORY_META[decision.category]?.label ?? decision.category;
}

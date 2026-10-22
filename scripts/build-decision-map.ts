/**
 * Genera el mapa interactivo de decisiones a partir de las definiciones
 * reales del servidor. El HTML resultante es autocontenido: no llama a la
 * API ni necesita un servidor para consultar el catálogo.
 *
 * Uso:
 *   npm run map:build
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DECISION_CATEGORY_META, EDUCATION_META } from "../shared/src/index.js";
import { DECISIONS } from "../server/src/simulation/decisions.js";
import { listEvents } from "../server/src/simulation/events.js";
import { loadDemographics } from "../server/src/demographics/dataset.js";
import type {
    DecisionDefinition,
    DecisionOptionDefinition,
    OutcomeEffect,
    Requirements,
} from "../server/src/simulation/decision-types.js";

const root = resolve(import.meta.dirname, "..");
const templatePath = resolve(root, "client/decision-map/template.html");
const appPath = resolve(root, "client/decision-map/app.js");
const outputPath = resolve(root, "client/public/mapa-decisiones.html");

const PRIORITY_LABEL: Record<DecisionDefinition["priority"], string> = {
    event: "Suceso del mundo",
    major: "Decisión de vida",
    focus: "Hábito o enfoque",
    recovery: "Salida de crisis",
};

function stageFor(decision: DecisionDefinition): string {
    if (decision.minAge <= 12 && decision.maxAge <= 17) return "Infancia y adolescencia";
    if (decision.minAge <= 12) return "Infancia";
    if (decision.minAge <= 17) return "Adolescencia";
    if (decision.minAge >= 65) return "Vejez";
    if (decision.maxAge >= 100) return "Toda la vida";
    return "Adultez";
}

function costLabel(option: DecisionOptionDefinition): string {
    const cost = option.cost;
    if (!cost) return "Sin coste directo";
    const parts: string[] = [];
    if (cost.fixed) parts.push(`${cost.fixed.toLocaleString("es-ES")} USD`);
    if (cost.shareOfGdp) parts.push(`${Math.round(cost.shareOfGdp * 100)} % del PIB per cápita`);
    if (cost.shareOfAnnualIncome) parts.push(`${Math.round(cost.shareOfAnnualIncome * 100)} % de tus ingresos anuales`);
    if (cost.shareOfEssentials) parts.push(`${Math.round(cost.shareOfEssentials * 100)} % de tus gastos esenciales`);
    if (cost.destinationCountry) parts.push(`coste de mudanza a ${cost.destinationCountry}`);
    return parts.length ? `≈ ${parts.join(" + ")}` : "Coste contextual";
}

function effectSummary(effect: OutcomeEffect | undefined) {
    if (!effect) return null;
    return {
        narrative: effect.narrative,
        stats: effect.stats ?? null,
        psychology: effect.psychology ?? null,
        moneyDelta: effect.moneyDelta ?? null,
        debtDelta: effect.debtDelta ?? null,
        flags: effect.flags ?? null,
        clearFlags: effect.clearFlags ?? null,
        education: effect.education ?? null,
        employment: effect.employment ?? null,
        occupation: effect.occupation ?? null,
        incomeModifierDelta: effect.incomeModifierDelta ?? null,
        expenseModifierDelta: effect.expenseModifierDelta ?? null,
        setPartner: effect.setPartner ?? false,
        childrenDelta: effect.childrenDelta ?? null,
        migrateTo: effect.migrateTo ?? null,
        returnToBirthCountry: effect.returnToBirthCountry ?? false,
        businessStart: effect.businessStart ?? null,
        studyProgram: effect.studyProgram ?? null,
        milestone: effect.milestone ?? null,
        loan: effect.loan
            ? { label: effect.loan.label, lender: effect.loan.lender }
            : null,
        businessChange: effect.businessChange ?? null,
        schedule: effect.schedule?.length ?? 0,
    };
}

function requirementSummary(requirements: Requirements | undefined) {
    if (!requirements) return null;
    return requirements;
}

function mapDecision(decision: DecisionDefinition) {
    return {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        contextNote: decision.contextNote ?? null,
        category: decision.category,
        categoryLabel:
            DECISION_CATEGORY_META[decision.category]?.label ?? decision.category,
        categoryColor:
            DECISION_CATEGORY_META[decision.category]?.color ?? "#8b9a91",
        priority: decision.priority,
        priorityLabel: PRIORITY_LABEL[decision.priority],
        minAge: decision.minAge,
        maxAge: decision.maxAge,
        once: Boolean(decision.once),
        cooldownYears: decision.cooldownYears ?? 0,
        weight: decision.weight ?? 1,
        stage: stageFor(decision),
        requirements: requirementSummary(decision.requirements),
        options: decision.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
            costLabel: costLabel(option),
            check: option.check
                ? {
                    type: option.check.type,
                    base: option.check.base,
                }
                : null,
            requirements: requirementSummary(option.requirements),
            success: effectSummary(option.outcomes.success),
            failure: effectSummary(option.outcomes.failure),
        })),
    };
}

const demographics = loadDemographics();
const countries = demographics.countries
    .map((country) => ({
        code: country.code,
        name: country.name,
        incomeGroup: country.incomeGroup,
        currency: country.currency,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

const events = listEvents().map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    minAge: event.minAge,
    maxAge: event.maxAge,
    decisionId: event.decisionId ?? null,
}));

const mappedDecisions = DECISIONS.map(mapDecision);
const options = mappedDecisions.reduce((sum, decision) => sum + decision.options.length, 0);

const guide = {
    start: "story_first_encounter",
    childhoodByFlag: {
        infancia_curioso: "infancia_ruta_curioso",
        infancia_aventurero: "infancia_ruta_aventurero",
        infancia_empatico: "infancia_ruta_empatico",
        infancia_persistente: "infancia_ruta_persistente",
    },
    adultDecision: "tiempo_propio",
    adultByOption: {
        aprender: "ruta_curso_proyecto",
        comunidad: "ruta_red_apoyo",
        hogar: "ruta_hogar_acuerdos",
    },
    learningByOption: {
        acreditar: "ruta_beca_exterior",
    },
    roots: [
        {
            decisionId: "story_first_encounter",
            label: "Entrada A · Infancia",
            sublabel: "La primera mirada",
            x: -460,
            y: 0,
        },
        {
            decisionId: "tiempo_propio",
            label: "Entrada B · Adultez",
            sublabel: "Un hueco en tu semana",
            x: 460,
            y: 0,
        },
    ],
};

// Estas comprobaciones fallan en el build, no en el navegador: si una decisión
// cambia de identificador, el mapa no se genera con enlaces muertos.
for (const decisionId of [
    guide.start,
    guide.adultDecision,
    ...Object.values(guide.childhoodByFlag),
    ...Object.values(guide.adultByOption),
    ...Object.values(guide.learningByOption),
]) {
    if (!DECISIONS.some((decision) => decision.id === decisionId)) {
        throw new Error(`El mapa apunta a una decisión inexistente: ${decisionId}`);
    }
}

const payload = {
    version: "1.0",
    generatedBy: "scripts/build-decision-map.ts",
    totals: {
        decisions: mappedDecisions.length,
        options,
        events: events.length,
        countries: countries.length,
        once: mappedDecisions.filter((decision) => decision.once).length,
        cooldown: mappedDecisions.filter((decision) => decision.cooldownYears > 0).length,
        flagGated: mappedDecisions.filter(
            (decision) =>
                decision.requirements?.flagsAll?.length ||
                decision.requirements?.flagsAny?.length,
        ).length,
    },
    education: EDUCATION_META,
    categories: DECISION_CATEGORY_META,
    countries,
    events,
    guide,
    decisions: mappedDecisions,
};

const template = readFileSync(templatePath, "utf8");
const app = readFileSync(appPath, "utf8");
const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
if (!template.includes("__DECISION_MAP_DATA__")) {
    throw new Error("La plantilla no contiene el marcador __DECISION_MAP_DATA__.");
}
if (!template.includes("__DECISION_MAP_APP__")) {
    throw new Error("La plantilla no contiene el marcador __DECISION_MAP_APP__.");
}
const html = template
    .replace("__DECISION_MAP_DATA__", serialized)
    .replace("__DECISION_MAP_APP__", app);
mkdirSync(resolve(root, "client/public"), { recursive: true });
writeFileSync(outputPath, html, "utf8");
console.log(
    `Mapa generado: ${outputPath} · ${payload.totals.decisions} decisiones · ${options} opciones · ${events.length} sucesos`,
);

import { relationshipDecision } from "./relationship-progress.js";
import { activeBusinesses, selectBusiness } from "./portfolio.js";
import type { CharacterState, DecisionPrompt, PlayerSlot } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { getDecision, DECISIONS } from "./decisions.js";
import { buildPrompt, decisionEligible } from "./decision-selector.js";
import { createRng, deriveSeed } from "./rng.js";
import { parentingBlocked } from "./household-care.js";

/** Decisiones que pertenecen a la vida de una empresa y comparten un espaciado global. */
const BUSINESS_POOLS: Record<string, string[]> = {
    clinica: ["clinica_cobros", "company_partner_review"],
    comercio: ["comercio_inventario", "company_partner_review"],
    tecnologia: ["company_tech_contract", "company_partner_review"],
    taller: ["company_workshop_supplier", "company_partner_review"],
    gastronomia: ["company_food_margin", "company_partner_review"],
    "estudio-musica": ["company_music_rights", "company_partner_review"],
};
const BUSINESS_DECISION_IDS = new Set([
    ...Object.values(BUSINESS_POOLS).flat(),
    "exportacion_condiciones",
    "company_trade_profile",
    "empresa_crecer",
    "empresa_contratar",
    "empresa_crisis",
]);

/**
 * Devuelve las situaciones de empresa compatibles con el negocio actual.
 * La lista es deliberadamente más amplia que dos opciones para que una vida
 * con empresa no repita siempre la misma conversación.
 */
export function businessOpportunityPool(kind: string, hasTradeRoute: boolean): string[] {
    const pool = hasTradeRoute
        ? ["exportacion_condiciones", "company_partner_review", "empresa_crecer", "empresa_contratar", "empresa_crisis"]
        : [...(BUSINESS_POOLS[kind] ?? []), "empresa_crecer", "empresa_contratar", "empresa_crisis"];
    return [...new Set(pool)];
}

/** La última edad en la que se ofreció o resolvió cualquier situación de empresa. */
export function lastBusinessAge(character: CharacterState): number {
    return Math.max(
        -100,
        ...Object.entries(character.lastDecisionAges ?? {})
            .filter(([id]) => BUSINESS_DECISION_IDS.has(id))
            .map(([, age]) => age),
    );
}

/** A separate monthly opportunity preserves the main year's decision and its outcome. */
export function offerMonthlyOpportunity(game: StoredGame, slot: PlayerSlot, c: CharacterState): void {
    const p = game.pending, month = c.liveEconomy?.month ?? 0;
    if (!p || p.secondary?.[slot] || month >= 12 || !game.config.storyMode || game.mode !== "solo") return;
    if (p.prompts[slot] && !p.submitted[slot]) return;
    const rng = createRng(deriveSeed(game.seed, "monthly-opportunity", c.id, game.currentYear, month));
    let id: string | undefined, key: string | undefined, relativeId: string | undefined, assetId: string | undefined, businessId: string | undefined;
    const stamp = c.age * 12 + month;
    const unmanaged = activeBusinesses(c).find(b => !b.delegated);
    const academicReady = c.age < 65 && !unmanaged;
    if (c.familyCase?.stage === "agreement") id = "family_separation_agreement";
    else if (c.familyCase?.stage === "hearing" && stamp - c.familyCase.openedMonth >= 3) id = "family_hearing";
    else if (unmanaged && (c.employment.status === "employed" || c.educationPlan && !c.educationPlan.paused)) { selectBusiness(c, unmanaged.id); businessId = unmanaged.id; id = "capacity_conflict"; }
    else if (academicReady && c.flags?.includes("orientacion_universitaria") && !c.educationPlan) id = "degree_field_choice";
    else if (academicReady && c.flags?.some(f => ["campo_tech", "campo_business", "campo_medicine"].includes(f)) && !c.educationPlan) id = "university_institution_choice";
    else if (c.partnerName && (c.partnerBond ?? 70) < 35 && month === 5 && c.age - (c.lastDecisionAges?.relationship_strain ?? -100) >= 2) id = "relationship_strain";
    if (!id) id = relationshipDecision(c, game.currentYear);
    if (!id && c.age >= 65 && activeBusinesses(c).length && !c.flags?.includes("plan_etapa_tardia")) { const target = unmanaged ?? activeBusinesses(c)[0]!; selectBusiness(c, target.id); businessId = target.id; id = "later_life_work"; }
    if (!id && [3, 9].includes(month)) {
        const home = (c.assets ?? []).find(a => a.rental && stamp - (a.rental.lastDecisionMonth ?? -1000) >= 6 && (a.rental.arrears > 0 || a.rental.condition < 60));
        if (home) { assetId = home.id; id = home.rental!.arrears > 0 ? "property_arrears" : "property_maintenance"; }
    }
    for (const child of (id ? [] : c.story?.relatives ?? [])) {
        if (child.role !== "child" || child.generation === "grandchild" || !child.alive) continue;
        const age = game.currentYear - child.bornYear, done = new Set(child.milestones ?? []);
        if (age < 2 && !done.has("care")) { id = "child_care_plan"; key = "care"; }
        else if (age >= 5 && age < 18 && !done.has("school")) { id = "child_school_plan"; key = "school"; }
        else if (age >= 18 && age < 24 && !done.has("higher")) { id = "child_adult_study"; key = "higher"; }
        else if (age >= 21 && age < 30 && c.business?.active && !done.has("job")) { id = "child_family_company"; key = "job"; }
        if (id) { relativeId = child.id; break; }
    }
    if (!id && c.business?.active && c.business.kind === "comercio" && !c.business.segment) id = "company_trade_profile";
    if (!id && month === 4 && c.age >= 18) {
        const socialIds = Object.entries(c.lastDecisionAges ?? {}).filter(([k]) => k.startsWith("encuentro_")).map(([, age]) => age);
        if (!c.partnerName && c.age - Math.max(-100, ...socialIds) >= 2) { const encounters = DECISIONS.filter(d => d.id.startsWith("encuentro_") && decisionEligible(d, c, game.config.content.severity, false, game.birth)); if (encounters.length) id = rng.pick(encounters).id; }
    }
    if (!id && month === 8 && c.partnerName) {
        const familyIds = ["crianza_dialogo"];
        const lastFamilyAge = Math.max(
            -100,
            ...Object.entries(c.lastDecisionAges ?? {})
                .filter(([id]) => familyIds.includes(id))
                .map(([, age]) => age),
        );
        // Una conversación de pareja o crianza cada cinco años como máximo.
        // Sin este límite global, dos cooldowns distintos podían alternarse y
        // producir una pregunta familiar casi todos los años.
        if (c.age - lastFamilyAge >= 5) {
            if (!parentingBlocked(c, game.currentYear) && !(c.flags ?? []).some(f => ["no_nueva_crianza", "sin_hijos_elegido"].includes(f)) && c.age - (c.lastDecisionAges?.crianza_dialogo ?? -100) >= 3) id = "crianza_dialogo";
        }
    }
    const companies = activeBusinesses(c);
    if (!id && ([6, ...(companies.length > 2 ? [10] : [])].includes(month)) && companies.length) {
        const business = companies.filter(b => stamp - (b.lastDecisionMonth ?? -1000) >= (companies.length > 1 ? 12 : 42)).sort((a, b) => (a.lastDecisionMonth ?? -1000) - (b.lastDecisionMonth ?? -1000))[0];
        if (business && rng.chance(Math.min(90, 40 + companies.length * 12))) {
            selectBusiness(c, business.id);
            const eligible = businessOpportunityPool(business.kind, !!business.trade).map(getDecision).filter(d => d && decisionEligible(d, c, game.config.content.severity, false, game.birth));
            if (eligible.length) { id = rng.pick(eligible)!.id; businessId = business.id; }
        }
    }
    if (!id) return;
    const d = getDecision(id); if (!d || !decisionEligible(d, c, game.config.content.severity, false, game.birth)) return;
    if (d.requirements?.hasBusiness || d.requirements?.businessKind) businessId = c.business?.id;
    let prompt = buildPrompt(d, c, game.config.content.severity, undefined, game.birth, { worldSeed: game.seed, turn: game.turnNumber, slot, countryCode: c.currentCountry });
    if (!prompt) return;
    if (relativeId) {
        const child = c.story!.relatives.find(r => r.id === relativeId)!;
        // Build against the target child instead of whichever child is first in a list.
        const proxy = { ...c, story: { ...c.story!, relatives: [child, ...c.story!.relatives.filter(r => r.id !== child.id && r.role !== "child")] } };
        prompt = buildPrompt(d, proxy, game.config.content.severity, undefined, game.birth)!;
    }
    if (assetId) { const home = c.assets!.find(a => a.id === assetId)!; prompt.title = prompt.title.replaceAll("{property}", home.name); prompt.description += ` Vivienda: ${home.location ?? c.currentLocation}. Pendiente: ${Math.round(home.rental!.arrears)} PPP; estado ${Math.round(home.rental!.condition)}/100.`; }
    if (c.familyCase && ["family_separation_agreement", "family_hearing"].includes(id)) prompt.contextNote = `Patrimonio en discusión: ${Math.round(c.familyCase.claim)} PPP · saldo disponible: ${Math.round(c.finance.money)} PPP · alimentos previstos: ${Math.round(c.childSupport?.annualAmount ?? 0)} PPP/año. Importes simulados, sujetos al resultado del acuerdo.`;
    if (businessId) prompt.contextNote = `${c.business!.name} · ${c.business!.segment ?? c.business!.kind} · ${c.currentLocation}`;
    p.secondary ??= {}; p.secondary[slot] = { key: key ?? id, relativeId, assetId, businessId, primaryPrompt: p.prompts[slot], primaryChoice: p.submitted[slot], primaryApplied: p.appliedChoices?.[slot] };
    p.prompts[slot] = prompt; delete p.submitted[slot]; if (p.appliedChoices) delete p.appliedChoices[slot];
}

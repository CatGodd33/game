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
    let id: string | undefined, key: string | undefined, relativeId: string | undefined;
    for (const child of c.story?.relatives ?? []) {
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
        const familyIds = ["acuerdo_pareja", "crianza_dialogo"];
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
            if (c.maritalStatus === "dating" && c.age - (c.lastDecisionAges?.acuerdo_pareja ?? -100) >= 3) id = "acuerdo_pareja";
            else if (!parentingBlocked(c, game.currentYear) && !(c.flags ?? []).some(f => ["no_nueva_crianza", "sin_hijos_elegido"].includes(f)) && c.age - (c.lastDecisionAges?.crianza_dialogo ?? -100) >= 3) id = "crianza_dialogo";
        }
    }
    if (!id && month === 6 && c.business?.active) {
        // Una oportunidad de empresa al año como máximo, y no cada año: la vida del
        // negocio compite con el resto de la vida y no debe convertirse en un bucle.
        const lastBusiness = lastBusinessAge(c);
        if (c.age - lastBusiness >= 4 && rng.chance(45)) {
            const eligible = businessOpportunityPool(c.business.kind, Boolean(c.business.trade)).map(getDecision).filter(d => d && decisionEligible(d, c, game.config.content.severity, false, game.birth));
            if (eligible.length) id = rng.pick(eligible)!.id;
        }
    }
    if (!id) return;
    const d = getDecision(id); if (!d || !decisionEligible(d, c, game.config.content.severity, false, game.birth)) return;
    let prompt = buildPrompt(d, c, game.config.content.severity, undefined, game.birth, { worldSeed: game.seed, turn: game.turnNumber, slot, countryCode: c.currentCountry });
    if (!prompt) return;
    if (relativeId) {
        const child = c.story!.relatives.find(r => r.id === relativeId)!;
        // Build against the target child instead of whichever child is first in a list.
        const proxy = { ...c, story: { ...c.story!, relatives: [child, ...c.story!.relatives.filter(r => r.id !== child.id && r.role !== "child")] } };
        prompt = buildPrompt(d, proxy, game.config.content.severity, undefined, game.birth)!;
    }
    p.secondary ??= {}; p.secondary[slot] = { key: key ?? id, relativeId, primaryPrompt: p.prompts[slot], primaryChoice: p.submitted[slot], primaryApplied: p.appliedChoices?.[slot] };
    p.prompts[slot] = prompt; delete p.submitted[slot]; if (p.appliedChoices) delete p.appliedChoices[slot];
}

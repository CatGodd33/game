import { proposalBlocked, relationshipProgress } from "./relationship-progress.js";
import { activeBusinesses } from "./portfolio.js";
import type { CharacterState } from "@life-duel/shared";
import type { DecisionDefinition } from "./decision-types.js";
/** Shared by selection, prompt rebuilding and validation: scenes require actual activities. */
export function contextMatches(d: DecisionDefinition, c: CharacterState, year?: number): boolean {
    if (d.requirements?.businessKind && !d.requirements.businessKind.includes(c.business?.kind!)) return false;
    if (d.id === "educacion_hijos" && !(c.story?.relatives ?? []).some(r => r.role === "child" && r.generation !== "grandchild" && r.alive && r.school)) return false;
    if (["acuerdo_pareja", "relationship_define", "relationship_commit", "relationship_proposal", "relationship_proposal_received", "relationship_wedding", "crianza_dialogo", "hijos_decision", "convivencia"].includes(d.id)) {
        const actualYear = year ?? 2000 + c.age;
        const r = relationshipProgress(c, actualYear);
        if (!r) return false;
        if (["acuerdo_pareja", "relationship_proposal", "relationship_proposal_received"].includes(d.id) && proposalBlocked(c, actualYear)) return false;
        if (d.id === "relationship_define" && (r.stage !== "seeing" || r.memories.length < 2 || actualYear * 12 + (c.liveEconomy?.month ?? 0) - r.startedMonth < 3)) return false;
        if (d.id === "relationship_commit" && (r.stage !== "committed" || (c.flags ?? []).includes("futuro_hablado") || actualYear * 12 + (c.liveEconomy?.month ?? 0) - r.startedMonth < 6)) return false;
        if (d.id === "relationship_wedding" && (r.stage !== "engaged" || actualYear * 12 + (c.liveEconomy?.month ?? 0) - (r.engagedMonth ?? actualYear * 12) < 3)) return false;
        if (["crianza_dialogo", "hijos_decision", "convivencia"].includes(d.id) && r.stage === "seeing") return false;
    }
    const month = c.age * 12 + (c.liveEconomy?.month ?? 0);
    if (d.id === "encuentro_curso" && (!c.activities?.languageUntilAgeMonth || c.activities.languageUntilAgeMonth <= month)) return false;
    if (["encuentro_campus", "encuentro_biblioteca"].includes(d.id) && (!c.educationPlan || c.educationPlan.paused)) return false;
    if (d.id === "encuentro_colegas" && (c.employment.status !== "employed" || !c.employment.occupation)) return false;
    if (d.id.startsWith("encuentro_") && c.maritalStatus === "widowed") {
        // The family module stores a real bereavement age; one year without new dating proposals.
        if (c.relationshipLossAge !== undefined && c.age - c.relationshipLossAge < 1) return false;
    }
    if (c.age >= 65 && d.category === "educacion" && !d.id.startsWith("child_") && !d.id.includes("hijo")) return false;
    if (d.options.some(o => o.outcomes.success.studyProgram) && activeBusinesses(c).some(b => !b.delegated)) return false;
    return true;
}

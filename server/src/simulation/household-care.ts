import { relationshipProgress } from "./relationship-progress.js";
import { activeBusinesses } from "./portfolio.js";
import { clamp, type CharacterState } from "@life-duel/shared";

/** Costs and care use living dependants, never the lifetime number of births. */
export function dependentChildren(c: CharacterState, year: number): number {
    const children = c.story?.relatives.filter(r => r.role === "child" && r.generation !== "grandchild");
    return children?.length ? children.filter(r => r.alive && year - r.bornYear < 18).length : c.children;
}

/** Relative costs within the game's country-scaled budget, not a statutory tariff. */
export function childCostWeight(age: number): number { return age < 3 ? 1.25 : age < 6 ? 1.1 : age < 12 ? 1 : 1.2; }
export function dependentCostUnits(c: CharacterState, year: number): number {
    const children = c.story?.relatives.filter(r => r.role === "child" && r.generation !== "grandchild");
    return children?.length ? children.filter(r => r.alive && year - r.bornYear < 18).reduce((n, r) => n + childCostWeight(year - r.bornYear), 0) : c.children;
}

export function parentingBlocked(c: CharacterState, year: number): string | undefined {
    if (c.age < 18 || c.age > 49) return "La etapa de nueva crianza de esta simulación va de los 18 a los 49 años";
    if (!c.partnerName) return "Necesitas una pareja y un proyecto compartido";
    if (relationshipProgress(c, year)?.stage === "seeing") return "Primero hablad de una relación estable antes de planear la crianza";
    const partner = c.story?.relatives.find(r => r.role === "partner" && r.alive && r.name === c.partnerName);
    const oldest = Math.max(c.age, partner ? year - partner.bornYear : c.partnerProfile?.bornYear ? year - c.partnerProfile.bornYear : c.age);
    if (oldest > 49) return "La etapa de nueva crianza de esta simulación va de los 18 a los 49 años";
    if (c.familyPlans?.length) return "Ya hay una llegada al hogar en preparación";
    return undefined;
}
export function petAnnualCost(c: CharacterState, gdp: number): number {
    return (c.pets ?? []).filter(p => p.alive).reduce((sum, p) => sum + gdp * (p.kind === "caballo" ? .036 : p.kind === "pez" ? .002 : p.kind === "ave" ? .004 : .008), 0);
}
export function careLoad(c: CharacterState, year: number): number {
    const pets = (c.pets ?? []).filter(p => p.alive);
    return dependentChildren(c, year) * 1.2 + pets.reduce((n, p) => n + (p.kind === "caballo" ? 2.5 : p.kind === "pez" ? .15 : .55), 0);
}
/** Small monthly movement towards a sustainable quality of life, not points per purchase. */
export function settleCare(c: CharacterState, year: number, unpaid: number): void {
    if (c.age < 18) return;
    if (c.partnerName) {
        const interactions = (c.manualActions ?? []).filter(a => ["time-together", "gift", "birthday", "travel"].includes(a.action ?? "") && year * 12 + (c.liveEconomy?.month ?? 0) - (a.year * 12 + a.month) <= 2);
        c.partnerBond = clamp((c.partnerBond ?? 72) + (interactions.length ? .25 : -.35) - (unpaid > 0 ? .35 : 0));
    }

    const pets = (c.pets ?? []).filter(p => p.alive);
    const load = careLoad(c, year);
    const overload = Math.max(0, load - (c.partnerName ? 4.5 : 2.5));
    const healthyPets = pets.filter(p => p.health >= 40).length;
    const company = Math.min(3, healthyPets) * 2;
    const comfort = c.assets?.some(a => a.kind === "car") ? 1 : 0;
    if (c.assets?.some(a => a.kind === "bicycle") && c.stats.health < 75) c.stats.health = clamp(c.stats.health + .08);
    const target = clamp(52 + comfort + company + (c.partnerName ? 4 : 0) + Math.min(2, dependentChildren(c, year)) * 2 - overload * 4 - (unpaid > 0 ? 12 : 0) - (c.psychology?.stress ?? 30) * .1, 15, 80);
    c.stats.happiness = clamp(c.stats.happiness + (target - c.stats.happiness) * .025);
    if (c.psychology) c.psychology.stress = clamp(c.psychology.stress + overload * .25 + (unpaid > 0 ? .8 : -.2));
    for (const pet of pets) pet.health = clamp(pet.health + (overload > 0 ? -overload * .2 : .1));
}

export function annualChildSupport(c: CharacterState, year: number): number {
    const plan = c.childSupport;
    if (!plan) return 0;
    if (!plan.birthYears?.length) return year < plan.untilYear ? plan.annualAmount : 0;
    const eligible = plan.birthYears.filter(born => { const child = c.story?.relatives.find(r => r.role === "child" && r.generation !== "grandchild" && r.alive && r.bornYear === born); return year - born < 18 || !!child?.school && child.school.kind === "university" && year - born < child.school.untilAge; });
    return plan.annualAmount * eligible.length / plan.birthYears.length;
}

export const ACTIVITY_HOURS: Record<string, number> = { birthday: 8, "business-pause": 16, language: 24, scholarship: 12, marry: 16, "study-toggle": 4, travel: 32, training: 24, "job-search": 12, date: 8, "family-plan": 8, "time-together": 8, hobby: 8, therapy: 4, healthcare: 4, vet: 4, advertise: 8, "business-start": 32, separate: 16 };
export function freeHours(c: CharacterState, year: number, month: number): number {
    const studyTime = c.educationPlan && !c.educationPlan.paused ? c.employment.status === "employed" ? 16 : 32 : 0;
    const overhead = Math.max(0, activeBusinesses(c).length - 1) * 8 + (c.assets ?? []).filter(a => a.rental?.occupied).length * 2;
    const capacity = Math.max(8, 72 - overhead + (c.flags?.includes("empresa_delegada") ? 16 : 0) - careLoad(c, year) * 6 - studyTime);
    const used = (c.manualActions ?? []).filter(a => a.year === year && a.month === month).reduce((n, a) => n + (a.hours ?? 0), 0);
    return Math.max(0, capacity - used);
}

export const ACTION_COOLDOWNS: Record<string, number> = { training: 3, language: 6, scholarship: 12, "family-plan": 12, restructure: 36, travel: 1, healthcare: 1, therapy: 1, "job-search": 1, donate: 1, gift: 1, date: 1, vet: 1, marry: 1, "time-together": 1, hobby: 1, rehome: 1, advertise: 1, "study-toggle": 1 };

export function annualSchoolFees(c: CharacterState, year: number): number {
    return (c.story?.relatives ?? []).filter(r => r.role === "child" && r.alive && r.school && year - r.bornYear < r.school.untilAge).reduce((sum, r) => sum + r.school!.annualFee, 0);
}
export function petCapacity(c: CharacterState, rural: boolean): number { return rural ? 8 : 4; }

import { describe, it, expect } from "vitest";
import { makeSolo, TEST_CONFIG } from "./helpers.js";
import { planParenthood } from "../server/src/simulation/parenthood.js";
import { createRng } from "../server/src/simulation/rng.js";
import { settleMonth } from "../server/src/simulation/monthly.js";
import { startBusiness, advanceBusiness } from "../server/src/simulation/business.js";
import { openExportRoute, settleTrade } from "../server/src/simulation/trade.js";
import { spendingOptions, applyManualAction } from "../server/src/simulation/spending.js";
import { selectDecision } from "../server/src/simulation/decision-selector.js";
import { UNIVERSITY_PROGRAMS, universityBlocked, universityVisible } from "../server/src/simulation/education.js";
function setup(country = "ITA") {
    const g = makeSolo("country-details", { ...TEST_CONFIG, fixedCountry: country, monthlyMode: true, storyMode: true });
    const c = g.players[0]!.character!; c.age = g.age = 30; g.currentYear = g.birth.year + 30; c.educationLevel = "secondary"; c.employment.status = "employed"; c.finance.money = 200000; c.liveEconomy = { month: 0, statements: [], unpaid: 0, interest: 0 }; return { g, c };
}
describe("rutas de país y familias", () => {
    it("las oportunidades familiares no se pierden entre las preguntas generales", () => {
        const { g, c } = setup(); c.partnerName = null; c.employment.status = "employed";
        const encounter = selectDecision({ character: c, birth: g.birth, worldSeed: g.seed, turn: 30, lastDecisionId: null, eventDecisionId: null, contentSeverity: "full" });
        expect(encounter!.definition.id).toMatch(/^encuentro_/);
        c.partnerName = "Sol"; c.maritalStatus = "married"; c.partnerProfile = { country: "ITA", annualIncome: 20000, metAt: "community", sinceYear: g.currentYear - 4, bornYear: g.currentYear - 29, sharedHousehold: true };
        expect(selectDecision({ character: c, birth: g.birth, worldSeed: g.seed, turn: 31, lastDecisionId: null, eventDecisionId: null, contentSeverity: "full" })!.definition.id).toBe("crianza_dialogo");
    });
    it("un embarazo múltiple crea identidades y pañales separados, con una sola fecha", () => {
        const { g, c } = setup(); const rng = createRng("multiples"); rng.next = () => .0001;
        expect(planParenthood(c, g.currentYear, 0, rng, "triplets", "Alba")).toBe(3);
        expect(new Set(c.familyPlans!.map(p => p.id)).size).toBe(3); expect(new Set(c.familyPlans!.map(p => p.name)).size).toBe(3);
        c.liveEconomy!.month = 9; settleMonth(g); expect(c.children).toBe(3); expect(c.familyPlans).toHaveLength(0);
        const items = c.liveEconomy!.statements[0]!.items!; expect(items.filter(i => i.label.startsWith("Pañales e higiene"))).toHaveLength(3);
    });
    it("Italia ofrece programas públicos y privados, con límites de residencia", () => {
        const { c } = setup(); const pub = UNIVERSITY_PROGRAMS.find(p => p.id === "bologna-tech")!, priv = UNIVERSITY_PROGRAMS.find(p => p.id === "bocconi-business")!;
        expect(pub.months).toBe(36); expect(priv.nominalFee).toBe(17000); expect(pub.annualFee(c)).toBeLessThan(priv.annualFee(c)); expect(universityBlocked(c, pub)).toBeUndefined(); c.currentCountry = "NGA"; expect(universityBlocked(c, pub)).toContain("residir");
    });
    it("India no ofrece campus extranjeros como si fueran locales", () => {
        const { c } = setup("IND"); const bologna = UNIVERSITY_PROGRAMS.find(p => p.id === "bologna-tech")!, tsinghua = UNIVERSITY_PROGRAMS.find(p => p.id === "tsinghua-cs")!;
        expect(universityVisible(c, bologna)).toBe(false); expect(universityVisible(c, tsinghua)).toBe(false); expect(universityBlocked(c, bologna)).toContain("residir");
        c.currentCountry = "ITA"; expect(universityVisible(c, bologna)).toBe(true); expect(universityBlocked(c, bologna)).toBeUndefined();
    });
    it("la ruta de exportación requiere un comercio y sus controles no se compran dos veces", () => {
        const { g, c } = setup("CHN"); expect(spendingOptions(g, c).find(o => o.id === "export-PER")!.blocked).toBeTruthy();
        startBusiness(c, "comercio", g.currentYear, 10000); c.business!.activity = "exportacion"; applyManualAction(g, c, { action: "export-PER", idempotencyKey: "peru" }); expect(c.business!.trade!.destination).toBe("PER");
        applyManualAction(g, c, { action: "trade-quality", idempotencyKey: "quality" }); expect(c.business!.trade!.qualityControl).toBe(true); expect(spendingOptions(g, c).find(o => o.id === "trade-quality")!.blocked).toBeTruthy();
    });
    it("los anticipos y controles cambian las pérdidas ante el mismo impago", () => {
        const { g, c } = setup("CHN"); startBusiness(c, "comercio", g.currentYear, 10000); openExportRoute(c, "PER");
        const allRisks = () => { const r = createRng("risk"); r.chance = () => true; return r; };
        const unprotected = settleTrade(c, 20000, allRisks()); Object.assign(c.business!.trade!, { advancePct: 60, insured: true, qualityControl: true, fxBuffer: true, diversified: true });
        const protectedResult = settleTrade(c, 20000, allRisks()); expect(protectedResult.revenue - protectedResult.costs).toBeGreaterThan(unprotected.revenue - unprotected.costs); expect(c.business!.trade!.lastResult).toContain("sol");
    });
    it("un envío se incluye una sola vez en las cuentas y deja su historia", () => {
        const { g, c } = setup("CHN"); startBusiness(c, "comercio", g.currentYear, 10000); openExportRoute(c, "ITA"); const before = c.finance.money;
        const result = advanceBusiness(c, g.economy, g.currentYear, createRng("trade-annual"))!;
        expect(c.business!.trade!.shipments).toBe(1); expect(result.net).toBe(result.revenue - result.costs); if (result.net > 0) expect(c.finance.money - before).toBe(result.net); expect(c.manualActions!.at(-1)!.text).toContain("Italia");
    });
});

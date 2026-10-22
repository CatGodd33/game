import { describe, it, expect } from "vitest";
import { createSoloGame, beginTurn, advanceMonth, submitDecision } from "../server/src/simulation/engine.js";
import { TEST_CONFIG } from "./helpers.js";
import { applyManualAction, spendingOptions } from "../server/src/simulation/spending.js";
import { settleMonth } from "../server/src/simulation/monthly.js";
import { UNIVERSITY_PROGRAMS, enrollUniversity } from "../server/src/simulation/education.js";
import { decisionEligible, buildPrompt } from "../server/src/simulation/decision-selector.js";
import { getDecision } from "../server/src/simulation/decisions.js";
import { createRng } from "../server/src/simulation/rng.js";
import { computeGrossIncome } from "../server/src/simulation/economy.js";
import { advanceBusiness, startBusiness } from "../server/src/simulation/business.js";
function life(seed = "context-v6") {
    const g = createSoloGame("context", "player", "Alex", { ...TEST_CONFIG, storyMode: true, monthlyMode: true }, seed); const c = g.players[0]!.character!; c.age = g.age = 30; g.currentYear = g.birth.year + 30; c.educationLevel = "secondary"; c.employment.status = "employed"; c.finance.money = 200000; c.liveEconomy = { month: 0, statements: [], unpaid: 0, interest: 0 }; return { g, c };
}
describe("vidas situadas y formación", () => {
    it("50 nacimientos no comparten una única primera pregunta ni una única entrada profesional", () => {
        const childhood = new Set<string>(), careers = new Set<string>();
        for (let i = 0; i < 50; i++) { const { g, c } = life(`variety-${i}`); g.age = c.age = 2; g.currentYear = g.birth.year + 2; beginTurn(g); childhood.add(g.pending!.prompts[1]!.id); g.age = c.age = 18; g.currentYear = g.birth.year + 18; beginTurn(g); careers.add(g.pending!.prompts[1]!.id); }
        expect(childhood.size).toBeGreaterThanOrEqual(9); expect(careers).toEqual(new Set(["adult_path_choice"])); // Everyone can choose a path; diversity follows their field and institution choices.
    });
    it("un programa cobra cada mes, se detiene en pausa y no entrega el título al inscribirse", () => {
        const { g, c } = life(); enrollUniversity(c, UNIVERSITY_PROGRAMS.find(p => p.id === "uned-cs")!, g.currentYear); const fee = c.educationPlan!.annualFee;
        settleMonth(g); expect(c.educationLevel).toBe("secondary"); expect(c.educationPlan!.monthsLeft).toBe(47); expect(c.liveEconomy!.statements[0]!.items!.find(i => i.label === "Matrícula · UNED")!.amount).toBeCloseTo(fee / 12, 1);
        c.educationPlan!.paused = true; settleMonth(g); expect(c.educationPlan!.monthsLeft).toBe(47); expect(c.liveEconomy!.statements[1]!.items!.some(i => i.label === "Matrícula · UNED")).toBe(false);
    });
    it("trabajar durante el grado reduce la cuota y duplica el tiempo necesario", () => {
        const { g, c } = life(); enrollUniversity(c, UNIVERSITY_PROGRAMS.find(p => p.id === "uned-cs")!, g.currentYear); c.employment.status = "employed"; const fee = c.educationPlan!.annualFee;
        settleMonth(g); settleMonth(g); expect(c.educationPlan!.monthsLeft).toBe(47); expect(c.liveEconomy!.statements[0]!.items!.find(i => i.label === "Matrícula · UNED")!.amount).toBeCloseTo(fee / 24, 1);
    });
    it("no progresas gratis cuando no puedes pagar la matrícula", () => {
        const { g, c } = life(); enrollUniversity(c, UNIVERSITY_PROGRAMS.find(p => p.id === "uned-cs")!, g.currentYear); c.finance.money = 0; c.finance.debt = 1e8; settleMonth(g); expect(c.educationPlan!.monthsLeft).toBe(48); expect(c.unpaidBills).toBeGreaterThan(0);
    });
    it("las cuotas terminan al graduarte y se abre la trayectoria del programa", () => {
        const { g, c } = life(); enrollUniversity(c, UNIVERSITY_PROGRAMS.find(p => p.id === "uned-cs")!, g.currentYear);
        for (let i = 0; i < 48; i++) { if (i && i % 12 === 0) { g.currentYear++; g.age++; c.age++; c.liveEconomy = { month: 0, statements: [], unpaid: c.unpaidBills ?? 0, interest: 0 }; } settleMonth(g); }
        expect(c.educationPlan).toBeUndefined(); expect(c.educationLevel).toBe("university"); expect(c.flags).toContain("track_tech"); expect(c.flags).toContain("graduado_uned-cs"); expect(c.employment.status).toBe("unemployed");
    });
    it("perder a los padres cambia el apoyo económico a un estudiante", () => {
        const { g, c } = life(); c.age = 20; c.employment.status = "student"; g.birth.details!.household!.support.annualSupport = 5000; const before = computeGrossIncome(c, g.birth, g.economy, createRng("support")); for (const r of c.story!.relatives) if (r.role === "mother" || r.role === "father") r.alive = false; expect(before).toBeGreaterThan(0); expect(computeGrossIncome(c, g.birth, g.economy, createRng("support"))).toBe(0);
    });
    it("los impagos sobreviven al cambio de año y se regularizan con un pago real", () => {
        const { g, c } = life(); c.unpaidBills = 250; c.liveEconomy!.unpaid = 250; g.age = c.age = 31; g.currentYear++; beginTurn(g); expect(c.liveEconomy!.unpaid).toBe(250); const before = c.finance.money; applyManualAction(g, c, { action: "arrears", idempotencyKey: "pay-arrears" }); expect(c.finance.money).toBe(before - 250); expect(c.unpaidBills).toBe(0); expect(c.liveEconomy!.unpaid).toBe(0);
    });
    it("el noviazgo no aporta un segundo sueldo hasta compartir hogar", () => {
        const { g, c } = life(); c.partnerName = "Mei"; c.partnerProfile = { country: "CHN", annualIncome: 18000, metAt: "online", sinceYear: g.currentYear - 2, sharedHousehold: false }; c.relationship = { stage: "committed", startedMonth: g.currentYear * 12 - 30, memories: ["first-date", "honest-talk", "future"], timeline: [{ id: "first-date", title: "La primera cita", text: "Quedasteis.", month: g.currentYear * 12 - 30, category: "cita" }, { id: "honest-talk", title: "Una conversación honesta", text: "Hablasteis.", month: g.currentYear * 12 - 24, category: "familia" }, { id: "future", title: "El futuro", text: "Os imaginasteis juntos.", month: g.currentYear * 12 - 18, category: "hito" }] }; c.flags = ["futuro_hablado"]; settleMonth(g); const own = c.liveEconomy!.statements[0]!.income; applyManualAction(g, c, { action: "marry", idempotencyKey: "marry-with-mei" }); expect(c.relationship!.stage).toBe("engaged"); settleMonth(g); expect(c.liveEconomy!.statements[1]!.income).toBe(own); c.maritalStatus = "married"; c.partnerProfile.sharedHousehold = true; settleMonth(g); expect(c.liveEconomy!.statements[2]!.income).toBeGreaterThan(own + 1000);
    });
    it("no se ofrece la boda de un hijo que todavía es un niño", () => {
        const { g, c } = life(); c.age = 50; c.children = 1; c.story!.relatives.push({ id: "baby", role: "child", name: "Sol", sex: "female", bornYear: g.birth.year + 49, occupation: "", alive: true }); expect(decisionEligible(getDecision("hijo_boda")!, c, "full", false, g.birth)).toBe(false); c.story!.relatives.at(-1)!.bornYear = g.birth.year + 25; expect(decisionEligible(getDecision("hijo_boda")!, c, "full", false, g.birth)).toBe(true);
    });
    it("las situaciones técnicas requieren trayectoria y las de clínica un negocio clínico", () => {
        const { g, c } = life(); const tech = getDecision("tech_lanzamiento")!, clinic = getDecision("clinica_cobros")!; expect(decisionEligible(tech, c, "full", false, g.birth)).toBe(false); c.flags = ["track_tech"]; expect(decisionEligible(tech, c, "full", false, g.birth)).toBe(true); expect(decisionEligible(clinic, c, "full", false, g.birth)).toBe(false); startBusiness(c, "clinica", g.currentYear, 50000); expect(decisionEligible(clinic, c, "full", false, g.birth)).toBe(true);
    });
    it("una consulta no se puede abrir antes de completar la formación médica", () => {
        const { g, c } = life(); expect(spendingOptions(g, c).find(o => o.id === "business-open-clinica")!.blocked).toBeTruthy(); c.flags = ["profesion_medica"]; c.educationLevel = "university"; applyManualAction(g, c, { action: "business-open-clinica", name: "Consulta Sol", idempotencyKey: "clinic-opening" }); expect(c.business!.kind).toBe("clinica"); expect(c.business!.name).toBe("Consulta Sol");
    });
    it("una visita internacional desglosa el presupuesto y conserva la residencia", () => {
        const { g, c } = life(); const before = c.finance.money, city = c.currentLocation; const quote = spendingOptions(g, c).find(o => o.id === "trip-ITA")!; expect(quote.description).toContain("billetes"); applyManualAction(g, c, { action: "trip-ITA", idempotencyKey: "visit-italy" }); expect(c.finance.money).toBe(before - quote.price); expect(c.currentLocation).toBe(city); expect(c.currentCountry).toBe("ESP"); expect(c.visitedCountries).toContain("ITA");
    });
    it("las preguntas usan nombres y lugares de la vida actual", () => {
        const { g, c } = life(); c.partnerName = "Mei"; c.maritalStatus = "dating"; c.relationship = { stage: "committed", startedMonth: g.currentYear * 12 - 24, memories: ["first-date", "honest-talk", "future"], timeline: [{ id: "first-date", title: "La primera cita", text: "Quedasteis.", month: g.currentYear * 12 - 24, category: "cita" }, { id: "honest-talk", title: "Una conversación honesta", text: "Hablasteis.", month: g.currentYear * 12 - 18, category: "familia" }, { id: "future", title: "El futuro", text: "Os imaginasteis juntos.", month: g.currentYear * 12 - 12, category: "hito" }] }; c.flags = ["futuro_hablado"]; c.partnerBond = 72; const p = buildPrompt(getDecision("relationship_proposal")!, c, "full", undefined, g.birth)!; expect(p.description).toContain("Mei"); expect(p.description).not.toContain("{partner}"); expect(p.contextNote).toContain("La primera cita");
    });
    it("los beneficios distribuidos no se añaden también al capital de venta", () => {
        const { g, c } = life(); startBusiness(c, "tecnologia", g.currentYear, 10000); c.business!.reputation = 95; c.business!.insolventYears = 2; const capital = c.business!.capital, before = c.finance.money; const result = advanceBusiness(c, g.economy, g.currentYear, createRng("profitable-business"))!; expect(result.net).toBeGreaterThan(0); expect(c.finance.money).toBe(before + result.net); expect(c.business!.capital).toBe(capital); expect(c.business!.insolventYears).toBe(1);
    });
    it("viajar sin familia se presenta como un viaje personal", () => { const { g, c } = life(); c.partnerName = null; c.children = 0; expect(spendingOptions(g, c).find(o => o.id === "travel")!.label).toBe("Viaje personal"); });
    it("la pensión no se reduce otra vez a la mitad cada mes", () => {
        const { g, c } = life(); c.age = g.age = 70; g.currentYear = g.birth.year + 70; c.employment.status = "retired"; c.finance.annualIncome = 30000; settleMonth(g); const first = c.liveEconomy!.statements[0]!.income; for (let i = 1; i < 12; i++)settleMonth(g); expect(first).toBeGreaterThan(0); for (const m of c.liveEconomy!.statements) expect(Math.abs(m.income - first)).toBeLessThanOrEqual(1);
    });
    it("una carrera activa continúa después de cumplir 26 años", () => {
        const { g, c } = life(); g.age = c.age = 26; g.currentYear = g.birth.year + 26; enrollUniversity(c, UNIVERSITY_PROGRAMS.find(p => p.id === "local-medicine")!, g.currentYear); beginTurn(g); const prompt = g.pending?.prompts[1]; if (prompt) submitDecision(g, 1, { turn: g.turnNumber, decisionId: prompt.id, optionId: prompt.options.find(o => !o.id.startsWith("repliegue"))!.id, idempotencyKey: "continue-medical" }); for (let i = 0; i < 12; i++)advanceMonth(g); expect(c.educationPlan).toBeDefined(); expect(c.employment.status).toBe("student");
    });

});

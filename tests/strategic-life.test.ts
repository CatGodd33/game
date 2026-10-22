import { describe,it,expect } from "vitest";
import { createSoloGame } from "../server/src/simulation/engine.js";
import { TEST_CONFIG } from "./helpers.js";
import { applyManualAction,spendingOptions } from "../server/src/simulation/spending.js";
import { annualChildSupport,dependentChildren,freeHours,petAnnualCost,settleCare } from "../server/src/simulation/household-care.js";
import { settleMonth } from "../server/src/simulation/monthly.js";
import { computeScore } from "../server/src/simulation/scoring.js";
import { getCountry } from "../server/src/demographics/dataset.js";
import { decisionEligible,optionAvailable,selectDecision } from "../server/src/simulation/decision-selector.js";
import { getDecision } from "../server/src/simulation/decisions.js";
function adult(){
 const g=createSoloGame("strategy","player","Alex",{...TEST_CONFIG,storyMode:true,monthlyMode:true},"strategy-seed");
 const c=g.players[0]!.character!;g.age=c.age=30;g.currentYear=g.birth.year+30;c.finance.money=100000;c.finance.annualExpenses=12000;c.employment.status="employed";c.partnerName=null;c.children=0;c.pets=[];c.liveEconomy={month:0,statements:[],unpaid:0,interest:0};return {g,c};
}
describe("estrategia sostenible",()=>{
 it("la compañía tiene beneficios limitados y una casa sobrecargada genera más estrés y gasto",()=>{
  const {g,c}=adult();g.birth.details!.rural=true;c.stats.happiness=50;if(c.psychology)c.psychology.stress=20;
  applyManualAction(g,c,{action:"pet-gato",quantity:2,idempotencyKey:"two-pets"});const crowded=structuredClone(c);
  applyManualAction(g,crowded,{action:"pet-gato",quantity:6,idempotencyKey:"eight-more"});
  settleCare(c,g.currentYear,0);settleCare(crowded,g.currentYear,0);
  expect(c.stats.happiness).toBeGreaterThan(50);expect(crowded.stats.happiness).toBeLessThan(c.stats.happiness);
  expect(crowded.psychology!.stress).toBeGreaterThan(c.psychology!.stress);
  expect(petAnnualCost(crowded,10000)).toBe(petAnnualCost(c,10000)*4);
 });
 it("las compras y adopciones no otorgan logros educativos",()=>{
  const {g,c}=adult();const score=()=>computeScore({character:c,weights:g.config.scoringWeights,snapshots:[],lifeExpectancyAtBirth:80,gdpPerCapitaPpp:40000}).categories.education;
  const before=score();applyManualAction(g,c,{action:"pet-gato",quantity:4,idempotencyKey:"many-pets"});applyManualAction(g,c,{action:"travel",idempotencyKey:"trip"});expect(score()).toBe(before);
 });
 it("el tiempo de actividades se comparte, aunque sobre dinero",()=>{
  const {g,c}=adult();applyManualAction(g,c,{action:"training",idempotencyKey:"course"});applyManualAction(g,c,{action:"travel",idempotencyKey:"travel"});applyManualAction(g,c,{action:"time-together",idempotencyKey:"family"});applyManualAction(g,c,{action:"hobby",idempotencyKey:"hobby"});expect(freeHours(c,g.currentYear,0)).toBe(0);expect(()=>applyManualAction(g,c,{action:"healthcare",idempotencyKey:"care"})).toThrow(/tiempo/);
 });
 it("a los 80 no aparecen opciones de nueva crianza, ni manuales ni obligatorias",()=>{
  const {g,c}=adult();c.age=g.age=80;g.currentYear=g.birth.year+80;c.partnerName="Sam";
  expect(spendingOptions(g,c).find(o=>o.id==="family-plan")?.blocked).toMatch(/49/);
  expect(()=>applyManualAction(g,c,{action:"family-plan",idempotencyKey:"late-parent"})).toThrow();
  const option=getDecision("tener_hijos")?.options.find(o=>(o.outcomes.success.childrenDelta??0)>0) ?? getDecision("presion_hijos")!.options[0]!;
  expect(optionAvailable(option,c,"full",g.birth)).toBe(false);
 });
 it("la contribución tras una separación baja al independizarse cada hijo",()=>{
  const {g,c}=adult();const year=g.currentYear;
  c.children=2;c.partnerName="Sam";c.story!.relatives=[{id:"a",role:"child",name:"A",sex:"female",bornYear:year-17,alive:true},{id:"b",role:"child",name:"B",sex:"male",bornYear:year-5,alive:true}];
  applyManualAction(g,c,{action:"separate",idempotencyKey:"separate"});
  expect(c.maritalStatus).toBe("divorced");expect(dependentChildren(c,year)).toBe(2);const initial=annualChildSupport(c,year);expect(initial).toBeGreaterThan(0);expect(annualChildSupport(c,year+1)).toBe(initial/2);expect(annualChildSupport(c,year+13)).toBe(0);
 });
 it("los cargos detallados cuadran con el saldo y no ocultan cuidados en una categoría genérica",()=>{
  const {g,c}=adult();applyManualAction(g,c,{action:"pet-gato",idempotencyKey:"cat"});const before=c.finance.money;settleMonth(g);const m=c.liveEconomy!.statements[0]!;
  expect(m.items!.some(i=>i.label.startsWith("Alimento y cuidados")&&i.amount>0)).toBe(true);expect(m.items!.some(i=>i.label==="Internet y teléfono")).toBe(true);
  expect(c.finance.money).toBeCloseTo(before+m.income-m.items!.filter(i=>!i.financed).reduce((n,i)=>n+i.amount,0),1);
 });
 it("los beneficios de donar no permiten comprar felicidad sin límite ni repetir durante el mes",()=>{
  const {g,c}=adult();c.stats.happiness=90;const before=c.stats.happiness;applyManualAction(g,c,{action:"donate",amount:100,idempotencyKey:"donate-one"});expect(c.stats.happiness).toBe(before);expect(()=>applyManualAction(g,c,{action:"donate",amount:100,idempotencyKey:"donate-two"})).toThrow();
 });
 it("las ramas dependen de decisiones previas y el exterior exige la acreditación",()=>{
  const {g,c}=adult();const course=getDecision("ruta_curso_proyecto")!,abroad=getDecision("ruta_beca_exterior")!,community=getDecision("ruta_red_apoyo")!;
  expect(decisionEligible(course,c,"full",false,g.birth)).toBe(false);c.flags=["ruta_aprendizaje"];expect(decisionEligible(course,c,"full",false,g.birth)).toBe(true);expect(decisionEligible(community,c,"full",false,g.birth)).toBe(false);expect(decisionEligible(abroad,c,"full",false,g.birth)).toBe(false);c.flags.push("ruta_acreditada");expect(decisionEligible(abroad,c,"full",false,g.birth)).toBe(true);c.currentCountry="DEU";expect(decisionEligible(abroad,c,"full",false,g.birth)).toBe(false);
 });
 it("los animales no se vuelven gratuitos al quedarse sin ingresos",()=>{
  const {g,c}=adult();applyManualAction(g,c,{action:"pet-gato",quantity:4,idempotencyKey:"twelve"});c.finance.money=0;c.finance.debt=1e8;c.employment.status="unemployed";settleMonth(g);expect(c.liveEconomy!.statements[0]!.items!.filter(i=>i.label.startsWith("Alimento y cuidados")).reduce((n,i)=>n+i.amount,0)+c.liveEconomy!.unpaid).toBeGreaterThanOrEqual(petAnnualCost(c,getCountry(c.currentCountry).gdpPerCapitaPpp)/12-1);
 });
 it("la elección de los dos años cambia la siguiente pregunta de infancia",()=>{
  const {g,c}=adult();c.age=6;c.flags=["infancia_curioso"];
  const select=()=>selectDecision({character:c,birth:g.birth,worldSeed:g.seed,turn:6,lastDecisionId:null,eventDecisionId:null,contentSeverity:"full"})!.definition.id;
  expect(select()).toBe("infancia_ruta_curioso");c.flags=["infancia_empatico"];expect(select()).toBe("infancia_ruta_empatico");
 });
 it("una nómina normal permite pagar vivienda y sostener una vida sin ser rico",()=>{
  const {g,c}=adult();c.finance.money=0;c.educationLevel="secondary";c.employment.status="employed";c.employment.occupation="Dependiente";
  for(let month=0;month<12;month++)settleMonth(g);
  expect(c.liveEconomy!.unpaid).toBe(0);expect(c.finance.debt).toBe(0);expect(c.finance.money).toBeGreaterThan(0);expect(c.liveEconomy!.statements.some(m=>m.housing>0)).toBe(true);
 });
 it("una vida equilibrada puntúa más que riqueza con todas las dimensiones personales abandonadas",()=>{
  const {g,c}=adult();c.stats={health:75,happiness:75,knowledge:75,relationships:75};c.finance.annualIncome=30000;c.finance.annualExpenses=20000;c.finance.money=20000;
  const score=()=>computeScore({character:c,weights:g.config.scoringWeights,snapshots:[],lifeExpectancyAtBirth:80,gdpPerCapitaPpp:40000}).total;
  const balanced=score();c.finance.money=1e9;c.finance.annualIncome=1e7;c.stats={health:20,happiness:20,knowledge:20,relationships:20};expect(score()).toBeLessThan(balanced);
 });
 it("cada menor tiene un cargo de cuidados reconocible en la cuenta",()=>{
  const {g,c}=adult();c.children=1;c.story!.relatives.push({id:"kid",role:"child",name:"Sol",sex:"female",alive:true,bornYear:g.currentYear-4,inHousehold:true});settleMonth(g);
  expect(c.liveEconomy!.statements[0]!.items!.find(i=>i.label==="Cuidados de Sol")!.amount).toBeGreaterThan(0);
 });

});

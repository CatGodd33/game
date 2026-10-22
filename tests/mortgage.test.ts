import {computeEssentialBreakdown,migrate} from "../server/src/simulation/economy.js";
import {describe,it,expect} from "vitest";
import {createSoloGame} from "../server/src/simulation/engine.js";
import {TEST_CONFIG} from "./helpers.js";
import {monthlyInstallment,settleDebtInterest} from "../server/src/simulation/mortgage.js";
import {applyManualAction} from "../server/src/simulation/spending.js";
import {settleMonth} from "../server/src/simulation/monthly.js";
function home(){const g=createSoloGame("mortgage","player","A",{...TEST_CONFIG,storyMode:true,monthlyMode:true},"mortgage-test");const c=g.players[0]!.character!;c.age=g.age=35;g.currentYear=g.birth.year+35;c.finance.money=50000;c.finance.debt=80000;c.finance.annualIncome=30000;c.employment.status="employed";c.assets=[{id:"home",kind:"home",name:"Casa",value:100000,purchasedYear:g.currentYear,loanBalance:80000,loanRate:.045,monthlyPayment:monthlyInstallment(80000,.045,25)}];c.liveEconomy={month:0,statements:[],unpaid:0,interest:0};return {g,c};}
describe("vivienda y deuda con trazabilidad",()=>{
 it("la hipoteca conserva el tipo pactado y reduce capital al pagar la cuota",()=>{const {g,c}=home();const interest=settleDebtInterest(c,g.currentYear);expect(interest).toBe(300);expect(c.finance.debt).toBe(80300);expect(c.assets![0]!.loanBalance).toBe(80300);});
 it("la cuota se cobra cada mes y aparece separada del mantenimiento",()=>{const {g,c}=home();settleMonth(g);const m=c.liveEconomy!.statements[0]!;expect(m.debtPayment).toBeGreaterThan(400);expect(m.items!.some(i=>i.label.includes("Cuota hipotecaria"))).toBe(true);expect(c.finance.debt).toBeLessThan(80000);expect(c.assets![0]!.loanBalance).toBeCloseTo(c.finance.debt,1);});
 it("vender cancela primero la hipoteca y solo libera el remanente",()=>{const {g,c}=home();applyManualAction(g,c,{action:"sell",assetId:"home",idempotencyKey:"sell-mortgage-home"});expect(c.finance.money).toBe(67000);expect(c.finance.debt).toBe(0);expect(c.assets).toHaveLength(0);});
 it("amortizar reduce también el saldo vinculado a la casa",()=>{const {g,c}=home();applyManualAction(g,c,{action:"repay",amount:5000,idempotencyKey:"pay-mortgage"});expect(c.finance.debt).toBe(75000);expect(c.assets![0]!.loanBalance).toBe(75000);});
 it("no permite vender bajo deuda sin cubrir la diferencia",()=>{const {g,c}=home();c.finance.money=0;c.assets![0]!.value=50000;expect(()=>applyManualAction(g,c,{action:"sell",assetId:"home",idempotencyKey:"underwater-sale"})).toThrow(/diferencia/);expect(c.assets).toHaveLength(1);expect(c.finance.debt).toBe(80000);});
 it("una casa no elimina el alquiler de otro país al emigrar",()=>{const {g,c}=home();c.assets![0]!.country=c.currentCountry;c.assets![0]!.location=c.currentLocation;const owned=computeEssentialBreakdown(c,g.birth,g.economy,g.config.difficulty).housing;migrate(c,"DEU","Berlín");const abroad=computeEssentialBreakdown(c,g.birth,g.economy,g.config.difficulty).housing;expect(abroad).toBeGreaterThan(owned+1000);});
 it("mantener dos propiedades cuesta más que mantener una",()=>{const {g,c}=home();const one=computeEssentialBreakdown(c,g.birth,g.economy,g.config.difficulty).housing;c.assets!.push({...c.assets![0]!,id:"second",loanBalance:undefined});expect(computeEssentialBreakdown(c,g.birth,g.economy,g.config.difficulty).housing).toBeGreaterThan(one);});

});

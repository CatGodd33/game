import { monthlyStory } from "./monthly-story.js";
import { settleDebtInterest, settleMortgagePayments } from "./mortgage.js";
import { progressUniversity, tuitionAnnual } from "./education.js";
import { annualChildSupport, childCostWeight, petAnnualCost, settleCare } from "./household-care.js";
import type { CharacterState, MonthlyStatement } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import type { StoredGame } from "../types/records.js";
import { initializePension, computeEssentialBreakdown, runAnnualEconomy, grant, spend, availableCredit, adjustDebt } from "./economy.js";
import { createRng, deriveSeed } from "./rng.js";
export function settleMonth(game: StoredGame): void {
  for (const player of game.players) {
    const c = player.character; if (!c?.alive) continue;
    c.liveEconomy ??= { month: 0, statements: [], unpaid: c.unpaidBills??0, interest: 0 };
    const live = c.liveEconomy; if (live.month >= 12) continue;
    const arrivals=(c.familyPlans??[]).filter(plan=>plan.dueYear*12+plan.dueMonth<=game.currentYear*12+live.month);
    for (const plan of arrivals) {
      c.children++;
      c.story?.relatives.push({id:`arrival-${plan.id}`,role:"child",name:plan.name,sex:plan.sex,bornYear:game.currentYear,occupation:"",alive:true,health:90,inHousehold:true,generation:"child"});
      c.manualActions=[...(c.manualActions??[]),{year:game.currentYear,month:live.month,text:`${plan.name} llegó a la familia. Empieza una nueva etapa de crianza y cuidados.`}];
    }
    c.familyPlans=(c.familyPlans??[]).filter(plan=>!arrivals.includes(plan));
    initializePension(c);
    const childcare = (computeEssentialBreakdown(c,game.birth,game.economy,game.config.difficulty).childcare??0)/12;
    const dependants = c.story?.relatives.filter(r=>r.role==="child"&&r.generation!=="grandchild"&&r.alive&&game.currentYear-r.bornYear<18)??[];
    const childBills = (share:number): [string,number][] => {
      const units=dependants.reduce((n,r)=>n+childCostWeight(game.currentYear-r.bornYear),0);
      if(!units)return childcare>0?[["Crianza de hijos",childcare*share]]:[];
      return dependants.flatMap(r=>{
        const age=game.currentYear-r.bornYear,cost=childcare*share*childCostWeight(age)/units;
        return age<3?[[`Cuidados de ${r.name}`,cost*.4],[`Pañales e higiene · ${r.name}`,cost*.35],[`Leche y alimentación infantil · ${r.name}`,cost*.25]] as [string,number][]:age>=12?[[`Cuidados de ${r.name}`,cost*.75],[`Materiales y transporte escolar · ${r.name}`,cost*.25]] as [string,number][]:[[ `Cuidados de ${r.name}`,cost]] as [string,number][];
      });
    };
    const forecast = runAnnualEconomy(structuredClone(c), game.birth, game.economy, game.config.difficulty, createRng(deriveSeed(game.seed,"monthly-budget",player.slot,game.currentYear)),game.currentYear);
    const estimate = forecast.monthly[live.month]!;
    const m: MonthlyStatement = { ...estimate, items: [], debtPayment: 0, month: live.month + 1 };
    c.finance.annualIncome = forecast.grossIncome; c.finance.annualExpenses = forecast.expenses;
    m.incomeItems=[];
    const phase=game.economy.phase==="expansion"?1.06:game.economy.phase==="recesion"?.9:game.economy.phase==="crisis"?.76:1;
    const partnerIncome=c.partnerName&&c.partnerProfile?.sharedHousehold?Math.min(m.income,Math.round(c.partnerProfile.annualIncome*phase/12*100)/100):0;
    const own=m.income-partnerIncome;
    const origin=c.employment.status==="student"?"Apoyo familiar para estudios":c.employment.status==="retired"?"Pensión de jubilación":c.employment.status==="unemployed"||c.employment.status==="disabled"?"Prestación y apoyo social":`${c.employment.status==="self-employed"?"Honorarios":"Salario"} · ${c.employment.occupation??"trabajo por cuenta propia"}`;
    for(const [label,amount] of [[origin,own],[`Ingreso de ${c.partnerName??"la pareja"} · hogar compartido`,partnerIncome]] as [string,number][]){
      if(amount<=0)continue;grant(c,amount,`${label} · mes ${m.month}`,game.currentYear,"income");m.incomeItems.push({label,amount});
    }
    let tuitionPaid=true;
    for (const [key,label] of Object.entries({taxes:"Impuestos",housing:"Vivienda",food:"Alimentación",utilities:"Luz, agua e internet",transport:"Transporte",health:"Salud",education:"Educación",other:"Hogar y animales"})) {
      const cost = m[key as keyof MonthlyStatement] as number;
      if (!cost) continue;
      const petBill = petAnnualCost(c,getCountry(c.currentCountry).gdpPerCapitaPpp)/12;
      const support = annualChildSupport(c,game.currentYear)/12;
      const bills: [string,number][] = key === "utilities" ? [["Electricidad",cost*.4],["Agua",cost*.15],["Gas y calefacción",cost*.25],["Internet y teléfono",cost*.2]]
        : key === "education" ? [
          ...(c.educationPlan?[[`Matrícula · ${c.educationPlan.institution}`,tuitionAnnual(c)/12]] as [string,number][]:[]),
          ...(c.story?.relatives??[]).filter(r=>r.alive&&r.role==="child"&&r.school&&game.currentYear-r.bornYear<r.school.untilAge&&r.school.annualFee>0).map(r=>[`Estudios de ${r.name} · ${r.school!.name}`,r.school!.annualFee/12] as [string,number]),
          ["Materiales y educación",Math.max(0,cost-tuitionAnnual(c)/12-(c.story?.relatives??[]).filter(r=>r.alive&&r.role==="child"&&r.school&&game.currentYear-r.bornYear<r.school.untilAge).reduce((n,r)=>n+r.school!.annualFee/12,0))]]
        : key === "food" ? [...childBills(.62),["Alimentación del hogar",Math.max(0,cost-childcare*.62)]]
        : key === "other" ? [...(c.pets??[]).filter(p=>p.alive).map(p=>[`Alimento y cuidados · ${p.name} (${p.kind??p.species})`,petAnnualCost({...c,pets:[p]},getCountry(c.currentCountry).gdpPerCapitaPpp)/12] as [string,number]),["Contribución a hijos tras separación",support],...childBills(.38),["Otros gastos del hogar",Math.max(0,cost-petBill-support-childcare*.38)]]
        : [[label,cost]];
      let paidTotal = 0;
      for (const [bill,part] of bills) {
        const due = Math.round(part*100)/100;
        const paid = Math.min(due, Math.max(0,c.finance.money + availableCredit(c)));
        if (paid > 0) { spend(c,paid,`${bill} · mes ${m.month}`,game.currentYear); m.items!.push({label:bill,amount:paid}); }
        if(key==="education"&&paid+.01<due)tuitionPaid=false;
        live.unpaid += due-paid;
        c.unpaidBills=(c.unpaidBills??0)+due-paid;
        paidTotal += paid;
      }
      m[key as "other"] = paidTotal;
    }
    const interest=settleDebtInterest(c,game.currentYear);
    if(interest){live.interest+=interest;m.items!.push({label:"Intereses añadidos a deuda",amount:interest,financed:true});}
    settleMortgagePayments(c,game.currentYear,m);
    for (const asset of c.assets ?? []) if (asset.kind === "investment") {
      const rng = createRng(deriveSeed(game.seed,"portfolio",asset.id,game.currentYear,m.month));
      asset.value = Math.max(0,Math.round(asset.value * (1 + rng.normal(.003,.025)) * 100)/100);
    }
    for(const asset of c.assets??[])if(["car","phone","bicycle","equipment"].includes(asset.kind))asset.value=Math.round(asset.value*(asset.kind==="phone"?.985:asset.kind==="car"?.993:.996)*100)/100;
    if (live.unpaid > 0 && c.finance.money <= 0) for (const pet of c.pets ?? []) if (pet.alive) pet.health = Math.max(0,pet.health-1);
    m.items = m.items!.reduce<NonNullable<MonthlyStatement["items"]>>((all,item)=>{const existing=all.find(i=>i.label===item.label);if(existing)existing.amount+=item.amount;else all.push({...item});return all;},[]);
    m.unpaid = live.unpaid;
    m.balance = c.finance.money; m.debt = c.finance.debt;
    settleCare(c,game.currentYear,live.unpaid);
    progressUniversity(c,game.currentYear,tuitionPaid);
    live.month++; live.statements.push(m);
    monthlyStory(game,c,m);
  }
}
export function closedMonthlyEconomy(c: CharacterState) {
  const live = c.liveEconomy!;
  const sum = (key: keyof MonthlyStatement) => live.statements.reduce((n,m)=>n+(typeof m[key] === "number" ? m[key] as number : 0),0);
  const essentials = sum("housing")+sum("food")+sum("utilities")+sum("transport")+sum("health")+sum("education")+sum("other");
  return { grossIncome:sum("income"), taxes:sum("taxes"), essentials, expenses:essentials+sum("taxes")+live.interest, debtInterest:live.interest, debtRepayment:sum("debtPayment"), unpaid:live.unpaid, net:sum("income")-essentials-sum("taxes")-sum("debtPayment"), insolvent:live.unpaid>0||c.finance.money<=0, monthly:live.statements };
}

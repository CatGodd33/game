import { parentingBlocked } from "./household-care.js";
import type { StoredGame } from "../types/records.js";
import { applyManualAction, spendingOptions } from "./spending.js";
/** A reserve-based policy. Same prices, time, cooldowns and uncertain outcomes as the player. */
export function automaticHousehold(game: StoredGame): void {
 const c=game.players[0]?.character;if(!c?.alive||c.age<18)return;
 const reserve=Math.max(c.finance.annualExpenses/4,1),cash=c.finance.money;
 if(c.story)c.story.focus=c.stats.health<45?"health":c.stats.relationships<40?"relationships":c.employment.status==="unemployed"?"study":"balanced";
 const candidates:{action:string;amount?:number}[]=[];
 const add=(condition:unknown,action:string,amount?:number)=>{if(condition)candidates.push({action,amount});};
 add(c.employment.status==="unemployed"&&c.age<70,"job-search");
 add(c.employment.status==="student"&&cash<reserve*2,"job-search");
 add(c.finance.debt>Math.max(c.finance.annualIncome*2,1000),"restructure");
 add((c.unpaidBills??0)>0&&cash>(c.unpaidBills??0)+reserve,"arrears");
 add(c.stats.health<50&&cash>reserve,"healthcare");
 add(c.psychology&&c.psychology.stress>65&&cash>reserve,"therapy");
 add(c.educationPlan&&!c.educationPlan.scholarshipPct,"scholarship");
 add(c.educationPlan?.paused&&cash>reserve*3,"study-toggle");
 add(!c.partnerName&&c.age>=21&&c.age<75&&cash>reserve,"date");
 add(c.partnerName&&c.maritalStatus!=="married"&&cash>reserve*1.5&&game.currentYear-(c.partnerProfile?.sinceYear??game.currentYear-2)>=2,"marry");
 const wantsChildren=!(c.flags??[]).some(f=>["sin_hijos_elegido","no_nueva_crianza"].includes(f));
 add(wantsChildren&&c.partnerName&&c.children+(c.familyPlans?.length??0)<2&&c.age>=25&&!parentingBlocked(c,game.currentYear)&&cash>reserve*2,"family-plan");
 add((c.pets??[]).filter(p=>p.alive).length<2&&cash>reserve*2.5,(c.pets??[]).some(p=>p.species==="perro")?"pet-gato":"pet-perro");
 add(c.finance.debt>0&&cash>reserve*2,"repay",Math.min(c.finance.debt,(cash-reserve*2)*.25));
 const career=(c.flags??[]).includes("profesion_medica")?"clinica":(c.flags??[]).includes("track_tech")?"tecnologia":(c.flags??[]).includes("track_music")?"estudio-musica":(c.flags??[]).includes("track_gastronomy")?"gastronomia":"taller";
 add(!c.business?.active&&c.age>=30&&c.age<55&&cash>reserve*2+Math.max(1000,c.finance.annualIncome*.18)&&c.stats.knowledge>50&&c.stats.health>55,`business-open-${career}`);
 if(c.business?.active&&c.business.trade){
  add(!c.business.trade.qualityControl&&cash>reserve*2,"trade-quality");
  add(c.business.trade.advancePct<60&&cash>reserve*2,"trade-advance");
  add(!c.business.trade.insured&&cash>reserve*2,"trade-insurance");
 }
 const invested=(c.assets??[]).filter(a=>a.kind==="investment").reduce((n,a)=>n+a.value,0);
 add(cash>reserve*4&&invested<cash*.5,"invest",Math.round((cash-reserve*4)*.2));
 add(c.age<60&&c.stats.knowledge<80&&cash>reserve*2,"training");
 add(c.stats.relationships<65,"time-together");
 add(c.stats.happiness<55&&cash>reserve,"hobby");
 const options=spendingOptions(game,c);
 for(const candidate of candidates){
  const option=options.find(o=>o.id===candidate.action);
  if(!option||option.blocked||option.price>cash||candidate.amount!==undefined&&candidate.amount<=0)continue;
  try{applyManualAction(game,c,{...candidate,idempotencyKey:`auto-${game.currentYear}-${c.liveEconomy?.month??0}-${candidate.action}`});return;}catch{ /* Continue to another feasible action; a blocked priority must not stall the household. */ }
 }
}

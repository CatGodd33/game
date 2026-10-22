import type {CharacterState} from "@life-duel/shared";
import type {StoredGame} from "../types/records.js";
import {getCountry} from "../demographics/dataset.js";
import {grant,spend,availableCredit,adjustDebt,repayDebt} from "./economy.js";
import {createRng,deriveSeed} from "./rng.js";
/** A disclosed game model, not an adjudication engine for national family law. */
export function familyAction(g:StoredGame,c:CharacterState,action:string):void{
 const stamp=c.age*12+(c.liveEconomy?.month??0),gdp=getCountry(c.currentCountry).gdpPerCapitaPpp;
 if(action==="open"){
  if(!c.partnerName||c.familyCase?.stage&&c.familyCase.stage!=="closed")return;
  const minors=(c.story?.relatives??[]).filter(r=>r.role==="child"&&r.generation!=="grandchild"&&r.alive&&g.currentYear-r.bornYear<18);
  const homes=(c.assets??[]).filter(a=>a.kind==="home"&&a.purchasedYear>=(c.partnerProfile?.sinceYear??g.currentYear));
  c.familyCase={stage:"agreement",openedMonth:stamp,partnerName:c.partnerName,claim:Math.round(homes.reduce((n,h)=>n+Math.max(0,h.value-(h.loanBalance??0)),0)*.5+Math.max(0,c.finance.money)*.25),homeIds:homes.map(h=>h.id),evidence:0};
  if(minors.length)c.childSupport={annualAmount:Math.round(gdp*.03*minors.length),untilYear:Math.max(...minors.map(r=>r.bornYear+23)),birthYears:minors.map(r=>r.bornYear)};
  for(const r of c.story?.relatives??[])if(r.role==="partner"&&r.name===c.partnerName)r.inHousehold=false;
  c.partnerName=null;c.partnerProfile=undefined;c.relationship=undefined;c.maritalStatus="divorced";return;
 }
 const dispute=c.familyCase;if(!dispute||dispute.stage==="closed")return;
 if(action==="prepare"||action==="rush"){dispute.stage="hearing";dispute.evidence=action==="prepare"?1:0;dispute.openedMonth=stamp;return;}
 let claim=dispute.claim;
 if(action==="review"){
  const rng=createRng(deriveSeed(g.seed,"family-hearing",c.id,g.currentYear));
  const favorable=rng.chance(45+dispute.evidence*20+Math.min(15,c.stats.knowledge*.15));
  claim*=favorable?.85:1.15;
  c.manualActions=[...(c.manualActions??[]),{year:g.currentYear,month:c.liveEconomy?.month??0,text:favorable?"La revisión documentada redujo la compensación patrimonial del acuerdo de juego. Las obligaciones de cuidado continúan.":"La revisión incrementó la compensación y los costes del acuerdo de juego. Las necesidades de los hijos siguen protegidas."}];
 }
 if(action==="sell"||claim>c.finance.money+availableCredit(c)){
  for(const home of [...(c.assets??[])].filter(a=>dispute.homeIds.includes(a.id))){
   const price=Math.round(home.value*.95),loan=Math.min(home.loanBalance??0,c.finance.debt);
   grant(c,price,`Venta por acuerdo familiar · ${home.name}`,g.currentYear,"transfer");if(loan)repayDebt(c,Math.min(c.finance.money,loan),g.currentYear,"Cancelar hipoteca al repartir patrimonio");
   c.assets=c.assets!.filter(a=>a.id!==home.id);if(c.finance.money>=claim)break;
  }
 }
 const paid=Math.min(claim,Math.max(0,c.finance.money+availableCredit(c)));if(paid>0)spend(c,paid,`Acuerdo patrimonial con ${dispute.partnerName}`,g.currentYear);
 if(claim>paid)adjustDebt(c,claim-paid,"Compensación familiar pendiente",g.currentYear);
 dispute.stage="closed";dispute.claim=Math.round(claim);c.stats.relationships=Math.max(0,c.stats.relationships-3);
}

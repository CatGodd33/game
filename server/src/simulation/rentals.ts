import type {CharacterState} from "@life-duel/shared";
import type {StoredGame} from "../types/records.js";
import {createRng,deriveSeed} from "./rng.js";
export function expectedAnnualRent(c:CharacterState):number{return (c.assets??[]).reduce((sum,a)=>sum+(a.kind==="home"&&a.rental?.occupied?a.rental.monthlyRent*12:0),0);}
export function settleRentals(g:StoredGame,c:CharacterState,month:number):{label:string;amount:number}[]{
 const income:{label:string;amount:number}[]=[];
 for(const home of c.assets??[]){const lease=home.rental;if(home.kind!=="home"||!lease?.occupied)continue;
  const rng=createRng(deriveSeed(g.seed,"tenant",home.id,g.currentYear,month));lease.condition=Math.max(0,lease.condition-.3);
  if(rng.chance(lease.condition<40?18:7)){lease.arrears=Math.round((lease.arrears+lease.monthlyRent)*100)/100;lease.unpaidMonths++;c.manualActions=[...(c.manualActions??[]),{year:g.currentYear,month:month-1,text:`${lease.tenantName} no pagó el alquiler de ${home.name}. Pendiente: ${Math.round(lease.arrears)} dólares PPP. No se ha añadido ese dinero a tu cuenta.`}];}
  else {lease.unpaidMonths=0;income.push({label:`Alquiler · ${home.name} · ${lease.tenantName}`,amount:lease.monthlyRent});}
 }
 return income;
}

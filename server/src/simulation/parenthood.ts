import type { CharacterState } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import type { Rng } from "./rng.js";
/** Rare multiples are a game assumption, not a country-specific medical forecast. */
export function planParenthood(c:CharacterState,year:number,month:number,rng:Rng,id:string,chosenName?:string):number {
 const roll=rng.next();
 const count=roll<.001?3:roll<.02?2:1;
 const due=month+9;
 const names=new Set<string>();
 for(let i=0;i<count;i++){
  const sex=rng.chance(51)?"male":"female";
  let name=i===0&&chosenName?.trim()?chosenName.trim():rng.pick(getCountry(c.currentCountry).names[sex==="female"?"female":"male"]);
  if(names.has(name))name+=` ${i+1}`;
  names.add(name);
  c.familyPlans=[...(c.familyPlans??[]),{id:`${id}-${i}`,dueYear:year+Math.floor(due/12),dueMonth:due%12,name,sex}];
 }
 return count;
}

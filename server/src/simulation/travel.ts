import type { CharacterState } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
/** Fictional trip budgets: never presented as airline fares or official visa charges. */
export function tripBudget(c:CharacterState,destination:string){
 const from=getCountry(c.currentCountry),to=getCountry(destination);
 const flight=Math.round(from.gdpPerCapitaPpp*(from.region===to.region?.009:.025));
 const eu=["ESP","ITA","DEU","FRA","SWE"];
 const documents=eu.includes(c.birthCountry)&&eu.includes(destination)?0:Math.round(to.gdpPerCapitaPpp*.0015);
 const stay=Math.round(to.gdpPerCapitaPpp*.007);
 return {flight,documents,stay,total:flight+documents+stay};
}

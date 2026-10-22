import type { BirthProfile, CharacterState } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
export function personalize(text:string,c:CharacterState,birth?:BirthProfile):string {
 const values:Record<string,string>={name:birth?.givenName??c.alias,city:c.currentLocation,country:getCountry(c.currentCountry).name,partner:c.partnerName??"tu pareja",mother:c.story?.relatives.find(r=>r.role==="mother")?.name??"tu madre",father:c.story?.relatives.find(r=>r.role==="father")?.name??"tu padre",child:(c.story?.relatives.find(r=>r.role==="child"&&r.generation!=="grandchild"&&r.alive&&(birth?.year??2000)+c.age-r.bornYear>=18)??c.story?.relatives.find(r=>r.role==="child"&&r.alive))?.name??"tu hijo o hija",pet:c.pets?.find(p=>p.alive)?.name??"tu animal",employer:`tu empresa en ${c.currentLocation}`,birthCountry:birth?.countryName??getCountry(c.birthCountry).name};
 return text.replace(/\{(\w+)\}/g,(token,key)=>values[key]??token);
}

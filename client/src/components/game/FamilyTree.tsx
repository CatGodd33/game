import type { BirthProfile, CharacterState, Relative } from "@life-duel/shared";
import { PixelPerson } from "../art/PixelLife";
export function FamilyTree({character:c,birth,year}:{character:CharacterState;birth:BirthProfile;year:number}){
 const relatives=c.story?.relatives??[];
 const node=(r:Relative,label:string)=> <div key={r.id} className={`tree-person ${r.alive?"":"remembered"}`} title={r.alive?`${r.name} · salud ${Math.round(r.health??60)}`:`${r.name} · ${r.causeOfDeath??"falleció"}`}>
  <svg viewBox="0 0 32 42" aria-hidden="true"><PixelPerson seed={r.id+r.name} country={r.role==="partner"?c.partnerProfile?.country??c.currentCountry:birth.countryCode} age={r.alive?year-r.bornYear:r.deathAge??0} sex={r.sex} x={0} y={0}/></svg>
  <small>{label}{!r.alive?" · ✧":""}</small><strong>{r.name}</strong><span>{r.alive?`${year-r.bornYear} años`:`${r.deathAge??"—"} años · en el recuerdo`}</span>
  {r.school&&r.alive&&year-r.bornYear<r.school.untilAge&&<em>{r.school.name}{r.school.annualFee?` · $${Math.round(r.school.annualFee/12)} PPP/mes`:""}</em>}
 </div>;
 const groups=[{label:"Tus raíces",people:relatives.filter(r=>r.role==="grandmother"||r.role==="grandfather")},{label:"Tus padres",people:relatives.filter(r=>r.role==="mother"||r.role==="father")}];
 const children=relatives.filter(r=>r.role==="child"&&r.generation!=="grandchild"),grandchildren=relatives.filter(r=>r.generation==="grandchild");
 return <div className="family-tree" aria-label="Árbol familiar">
  {groups.map(group=>group.people.length?<div className="tree-generation" key={group.label}><p>{group.label}</p><div>{group.people.map(r=>node(r,r.role==="mother"?"Madre":r.role==="father"?"Padre":r.role==="grandmother"?"Abuela":"Abuelo"))}</div></div>:null)}
  <div className="tree-generation"><p>Tu generación</p><div>
   <div className="tree-person tree-self"><svg viewBox="0 0 32 42" aria-hidden="true"><PixelPerson seed={c.id} country={birth.countryCode} age={c.age} sex={c.sex} x={0} y={0}/></svg><small>Tú</small><strong>{birth.givenName}</strong><span>{c.age} años</span></div>
   {relatives.filter(r=>r.role==="partner"&&r.name===c.partnerName).map(r=>node(r,c.maritalStatus==="married"?"Cónyuge":"Pareja"))}
   {c.partnerName&&!relatives.some(r=>r.role==="partner"&&r.name===c.partnerName)&&<div className="tree-person"><small>Tu pareja</small><strong>{c.partnerName}</strong><span>{c.partnerProfile?.sharedHousehold?"Compartís hogar":"Hogares separados"}</span></div>}
  </div></div>
  {!!children.length&&<div className="tree-generation"><p>Tus hijos</p><div>{children.map(r=>node(r,r.sex==="female"?"Hija":"Hijo"))}</div></div>}
  {!!relatives.filter(r=>r.role==="sibling").length&&<details className="tree-siblings"><summary>Tus hermanos · {relatives.filter(r=>r.role==="sibling").length}</summary><div>{relatives.filter(r=>r.role==="sibling").map(r=>node(r,"Hermano/a"))}</div></details>}
  {!!grandchildren.length&&<div className="tree-generation"><p>Tus nietos</p><div>{grandchildren.map(r=>node(r,r.sex==="female"?"Nieta":"Nieto"))}</div></div>}
 </div>;
}

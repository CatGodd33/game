import type { CharacterState } from "@life-duel/shared";
const titles:Record<string,string>={none:"Sin estudios formales",primary:"Primaria",secondary:"Secundaria",vocational:"Formación profesional",university:"Universidad",postgraduate:"Posgrado"};
const companyTypes:Record<string,string>={comercio:"Comercio local",tecnologia:"Tecnología",clinica:"Consulta médica","estudio-musica":"Producción musical",taller:"Taller y oficios",gastronomia:"Gastronomía"};
export function LifeResume({character:c}:{character:CharacterState}){
 return <section className="story-panel life-resume"><h2>Tu trayectoria</h2><p className="story-muted">Formación y experiencia que estás construyendo</p><dl>
  <div><dt>Formación completada</dt><dd>{titles[c.educationLevel]??c.educationLevel} · {Math.round(c.educationYears)} años</dd></div>
  {c.educationPlan&&<div><dt>{c.educationPlan.paused?"Estudios en pausa":"Actualmente estudias"}</dt><dd>{c.educationPlan.title}<small>{c.educationPlan.institution} · faltan {c.educationPlan.monthsLeft} meses</small></dd></div>}
  <div><dt>Actividad actual</dt><dd>{c.business?.active?`Diriges ${companyTypes[c.business.kind]}`:c.employment.occupation??(c.employment.status==="retired"?"Jubilación":c.age<18?"Aprender y crecer":"Búsqueda de una oportunidad")}<small>{c.employment.sector??c.currentLocation}{c.employment.yearsInRole>0?` · ${c.employment.yearsInRole} años en el puesto`:""}</small></dd></div>
 </dl>{c.milestones.filter(m=>m.category==="educacion"||m.category==="trabajo").slice(-4).map(m=><p className="resume-step" key={m.id}><span>{m.year}</span>{m.title}</p>)}</section>;
}

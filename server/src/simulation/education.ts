import type { CharacterState } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
export interface UniversityProgram {
 id:string; institution:string; title:string; field:string; country:string|null; months:number; nominalFee:number|null; currency:string|null; source:string; sourceLabel:string; annualFee:(c:CharacterState)=>number;
}
const unedSource="https://www.uned.es/universidad/inicio/dam/jcr%3A766628fe-d3e9-45d5-a5fc-e73c6202cbcc/precios-gradosUE2026-27.pdf";
const euroPpp=(fee:number)=>()=>Math.round(fee/getCountry("ESP").currency.localPerIntlDollar);
/** Published nominal fees are dated references, not future-price forecasts or admission guarantees. */
export const UNIVERSITY_PROGRAMS:UniversityProgram[]=[
 {id:"bologna-tech",institution:"Università di Bologna · pública",title:"Informática · grado de tres años",field:"tech",country:"ITA",months:36,nominalFee:null,currency:"EUR",source:"https://www.unibo.it/en/study/enrolment-fees-and-other-procedures/degree-programmes/tuition-fees-and-exemptions",sourceLabel:"Bologna 2026–27: tasas según ISEE y documentación. Cuota del juego estimada; no sustituye su calculadora oficial",annualFee:c=>Math.round((c.finance.money<5000?500:2500)/getCountry("ITA").currency.localPerIntlDollar)},
 {id:"bocconi-business",institution:"Università Bocconi · privada",title:"Economía y gestión · grado de tres años",field:"business",country:"ITA",months:36,nominalFee:17000,currency:"EUR",source:"https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/fees",sourceLabel:"Bocconi 2026–27: 17.000 € anuales para primer curso de grado; referencia fechada, sin alojamiento. Las ayudas requieren solicitud",annualFee:()=>Math.round(17000/getCountry("ITA").currency.localPerIntlDollar)},
 {id:"local-tech",institution:"Universidad local · simulación",title:"Tecnología e informática",field:"tech",country:null,months:48,nominalFee:null,currency:null,source:"",sourceLabel:"Matrícula estimada para la simulación; no es el precio oficial de una universidad",annualFee:c=>Math.round(getCountry(c.currentCountry).gdpPerCapitaPpp*.045)},
 {id:"local-business",institution:"Universidad local · simulación",title:"Gestión y empresa",field:"business",country:null,months:48,nominalFee:null,currency:null,source:"",sourceLabel:"Matrícula estimada para la simulación; no es el precio oficial de una universidad",annualFee:c=>Math.round(getCountry(c.currentCountry).gdpPerCapitaPpp*.04)},
 {id:"uned-cs",institution:"UNED",title:"Ingeniería Informática · a distancia",field:"tech",country:null,months:48,nominalFee:1296,currency:"EUR",source:unedSource,sourceLabel:"UNED 2026–27 · 60 ECTS × 21,60 €; tarifa UE, primera matrícula, sin tasas administrativas",annualFee:euroPpp(1296)},
 {id:"uned-business",institution:"UNED",title:"Administración de Empresas · a distancia",field:"business",country:null,months:48,nominalFee:792,currency:"EUR",source:unedSource,sourceLabel:"UNED 2026–27 · 60 ECTS × 13,20 €; tarifa UE, primera matrícula, sin tasas administrativas",annualFee:euroPpp(792)},
 {id:"uned-psychology",institution:"UNED",title:"Psicología · a distancia",field:"psychology",country:null,months:48,nominalFee:957,currency:"EUR",source:unedSource,sourceLabel:"UNED 2026–27 · 60 ECTS × 15,95 €; tarifa UE, primera matrícula, sin tasas administrativas",annualFee:euroPpp(957)},
 {id:"tsinghua-cs",institution:"Tsinghua University",title:"Computer Science · programa internacional",field:"tech",country:"CHN",months:48,nominalFee:30000,currency:"CNY",source:"https://international.join-tsinghua.edu.cn/Admission1/Fees.htm",sourceLabel:"Tsinghua · matrícula publicada para el programa internacional chino–inglés; no incluye alojamiento",annualFee:()=>Math.round(30000/getCountry("CHN").currency.localPerIntlDollar)},
 {id:"local-medicine",institution:"Facultad local · simulación",title:"Medicina · itinerario de seis años",field:"medicine",country:null,months:72,nominalFee:null,currency:null,source:"",sourceLabel:"Coste de juego estimado según el país; no corresponde a una matrícula oficial",annualFee:c=>Math.round(getCountry(c.currentCountry).gdpPerCapitaPpp*.12)},
];
export function universityBlocked(c:CharacterState,p:UniversityProgram):string|undefined {
 if(c.educationPlan)return "Ya estás cursando un programa";
 if(c.age<18||c.age>65)return "Admisión disponible entre los 18 y los 65 años en este modelo";
 if(["none","primary"].includes(c.educationLevel))return "Primero necesitas completar secundaria o una vía de acceso";
 if(c.flags?.includes(`graduado_${p.id}`))return "Ya terminaste este programa";
 if(p.id.startsWith("uned")&&!["ESP","ITA","DEU","FRA","SWE"].includes(c.birthCountry))return "La tarifa verificada corresponde a alumnado UE; para otras condiciones, elige un programa local estimado";
 if(p.id.startsWith("uned")&&!c.flags?.includes("idioma_espanol")&&!["ESP","MEX"].includes(c.currentCountry))return "Primero prepara español con un curso de idiomas";
 if(p.country&&c.currentCountry!==p.country)return "Necesitas residir en el país del programa y preparar la admisión";
 if(p.id==="tsinghua-cs"&&c.birthCountry==="CHN")return "Esta tarifa corresponde al programa internacional; no representa la matrícula nacional";
 if(p.id==="tsinghua-cs"&&c.stats.knowledge<65)return "Prepara antes la candidatura académica (conocimiento 65)";
 return undefined;
}
export function enrollUniversity(c:CharacterState,p:UniversityProgram,year:number):void {
 c.educationPlan={programId:p.id,institution:p.institution,title:p.title,field:p.field,monthsLeft:p.months,annualFee:p.annualFee(c),scholarshipPct:0,source:p.source,reference:p.sourceLabel};
 c.pendingEffects=c.pendingEffects.filter(effect=>!effect.education);
 c.employment.status="student";c.employment.occupation="Estudiante";
 c.flags=[...new Set([...(c.flags??[]),"universidad_matriculada"])];
 c.manualActions=[...(c.manualActions??[]),{year,month:c.liveEconomy?.month??0,text:`Te matriculaste en ${p.institution}: ${p.title}. La cuota se cargará cada mes; terminar exige ${p.months} meses de estudio y pagos sostenidos.`}];
}
export function progressUniversity(c:CharacterState,year:number,paid:boolean):void {
 const plan=c.educationPlan;if(!plan||plan.paused||!paid)return;
 if(c.employment.status==="employed"&&(c.liveEconomy?.month??0)%2===1)return;
 plan.monthsLeft--;c.stats.knowledge=Math.min(90,c.stats.knowledge+.18);
 if(plan.monthsLeft>0)return;
 c.educationLevel="university";c.educationYears+=plan.field==="medicine"?6:["bologna-tech","bocconi-business"].includes(plan.programId)?3:4;
 c.flags=[...new Set([...(c.flags??[]),`graduado_${plan.programId}`,`track_${plan.field}`,...(plan.field==="medicine"?["profesion_medica"]:[])])];
 c.milestones.push({id:`degree-${plan.programId}`,age:c.age,year,title:`Terminó ${plan.title} en ${plan.institution}`,category:"educacion"});
 c.manualActions=[...(c.manualActions??[]),{year,month:c.liveEconomy?.month??0,text:`Terminaste ${plan.title} en ${plan.institution}. La matrícula deja de cobrarse; ahora toca elegir cómo usar esa formación.`}];
 c.educationPlan=undefined;c.employment.status="unemployed";c.employment.occupation=null;
}

export function tuitionAnnual(c:CharacterState):number { return (c.educationPlan?.paused?0:c.educationPlan?.annualFee??0)*(c.employment.status==="employed"?.5:1); }

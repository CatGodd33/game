import type { CharacterState } from "@life-duel/shared";
import type { Rng } from "./rng.js";
export type ExportMarket = "PER" | "ITA";
export const EXPORT_MARKETS = {PER:{name:"Perú",currency:"PEN · sol"},ITA:{name:"Italia",currency:"EUR · euro"}} as const;
export function openExportRoute(c:CharacterState,destination:ExportMarket):void {
 if(!c.business?.active||c.business.kind!=="comercio")throw new Error("Necesitas un comercio activo");
 c.business.activity="exportacion";
 c.business.trade={destination,insured:false,advancePct:20,diversified:false,qualityControl:false,fxBuffer:false,shipments:0,lastResult:"Preparando el primer pedido. Los márgenes, fletes y cambios se simulan; no son cotizaciones comerciales."};
 c.flags=[...new Set([...(c.flags??[]).filter(f=>!f.startsWith("exporta_")),`exporta_${destination}`])];
}
/** Additional operating profit/costs, settled once with the company's annual accounts. */
export function settleTrade(c:CharacterState,gdp:number,rng:Rng):{revenue:number;costs:number} {
 const t=c.business?.trade;if(!t)return {revenue:0,costs:0};
 const market=EXPORT_MARKETS[t.destination];
 const order=gdp*.85;
 const delay=rng.chance(22),defaulted=rng.chance(t.diversified?5:16),defect=!t.qualityControl&&rng.chance(14),currencyLoss=!t.fxBuffer&&rng.chance(20);
 const revenue=order*(defaulted?t.advancePct/100:1)*(defect?.55:1);
 const costs=order*.62+order*(t.insured?.025:0)+(delay?order*(t.insured?.03:.2):0)+(currencyLoss?order*.12:0)+(t.qualityControl?order*.035:0)+(t.fxBuffer?order*.015:0)+(t.diversified?order*.025:0);
 t.shipments++;t.lastResult=`Envío a ${market.name} · cobro en ${market.currency}. ${delay?"Retraso marítimo y almacenaje. ":"Entrega sin retraso. "}${defaulted?"El comprador incumplió; solo se recuperó el anticipo. ":"Se cobró el pedido. "}${defect?"Una devolución redujo el cobro. ":""}${currencyLoss?"El cambio de moneda redujo el margen. ":""}Resultado del envío: ${Math.round(revenue-costs)} dólares PPP.`;
 return {revenue:Math.round(revenue),costs:Math.round(costs)};
}

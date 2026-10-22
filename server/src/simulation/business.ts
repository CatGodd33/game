import { activeBusinesses,businesses } from "./portfolio.js";
import { settleTrade } from "./trade.js";
import type { BusinessKind, BusinessState, CharacterState, EconomyState } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { adjustDebt, grant, spend } from "./economy.js";
import { applyPsychologyDelta } from "./psychology.js";
import type { Rng } from "./rng.js";

const BUSINESS_LABELS: Record<BusinessKind, string> = {
    "estudio-musica": "Estudio de música",
    clinica: "Consulta médica",
    tecnologia: "Estudio de tecnología",
    comercio: "Comercio",
    taller: "Taller artesanal",
    gastronomia: "Negocio de gastronomía",
};

const REVENUE_INDEX: Record<BusinessKind, number> = {
    "estudio-musica": 1.45,
    clinica: 2.65,
    tecnologia: 2.45,
    comercio: 1.38,
    taller: 1.18,
    gastronomia: 1.42,
};

const COST_INDEX: Record<BusinessKind, number> = {
    "estudio-musica": 0.38,
    clinica: 0.78,
    tecnologia: 0.64,
    comercio: 0.34,
    taller: 0.29,
    gastronomia: 0.42,
};

export function startBusiness(
    character: CharacterState,
    kind: BusinessKind,
    year: number,
    capital: number,
    customName?: string,
): BusinessState {
    const country = getCountry(character.currentCountry);
    const previous=character.business;
    const portfolio=businesses(character);
    if(previous)character.otherBusinesses=portfolio;
    const business: BusinessState = {
        delegated:portfolio.some(b=>b.active),
        activity:"local",
        id: `business-${character.id}-${year}-${portfolio.length+1}`,
        name: customName ?? `${BUSINESS_LABELS[kind]} de ${character.alias}`,
        kind,
        foundedAge: character.age,
        capital: Math.max(0, Math.round(capital)),
        annualRevenue: 0,
        annualCosts: 0,
        marketingSpend: Math.round(country.gdpPerCapitaPpp * 0.025),
        reputation: 35,
        employees: portfolio.some(b=>b.active)?1:0,
        active: true,
        insolventYears: 0,
    };
    character.business = business;
    if (!character.flags?.includes("negocio_activo")) {
        character.flags = [...(character.flags ?? []), "negocio_activo"];
    }
    character.employment.status = "self-employed";
    character.employment.occupation = character.employment.occupation ?? `Empresa propia: ${BUSINESS_LABELS[kind].toLowerCase()}`;
    character.employment.sector = character.employment.sector ?? "empresa propia";
    character.milestones.push({
        id: `ms-business-${character.id}-${year}`,
        age: character.age,
        year,
        title: `Abrió ${BUSINESS_LABELS[kind].toLowerCase()}`,
        category: "trabajo",
    });
    return business;
}

export interface BusinessAnnualResult {
    revenue: number;
    costs: number;
    net: number;
    bankrupt: boolean;
}

/**
 * La empresa tiene ingresos, costes, reputación y marketing. No es una
 * impresión narrativa: cada resultado se registra en el libro mayor personal.
 * Un negocio puede crecer, estancarse o quebrar según el mercado y la gestión.
 */
function advanceOneBusiness(
    character: CharacterState,
    economy: EconomyState,
    year: number,
    rng: Rng,
): BusinessAnnualResult | null {
    const business = character.business;
    if (!business?.active) return null;
    const country = getCountry(character.currentCountry);
    const phaseMultiplier =
        economy.phase === "expansion" ? 1.09 : economy.phase === "recesion" ? 0.86 : economy.phase === "crisis" ? 0.68 : 1;
    const reputationMultiplier = 0.55 + (business.reputation / 100) * 0.95;
    const marketingMultiplier = 1 + Math.sqrt(Math.max(0, business.marketingSpend) / Math.max(country.gdpPerCapitaPpp * 0.1, 1)) * 0.16;
    const employeeRevenue = 1 + Math.min(0.35, business.employees * 0.045);
    const randomMarket = clamp(rng.normal(1, 0.13), 0.68, 1.35);
    const yearsOperating=Math.max(0,character.age-business.foundedAge);
    const ramp=yearsOperating>=4?1:[.45,.62,.78,.9][yearsOperating]!;
    const concentrationShock=rng.chance(12)?.55:1;
    let revenue = Math.max(
        0,
        Math.round(
            country.gdpPerCapitaPpp *
            REVENUE_INDEX[business.kind] *
            reputationMultiplier *
            marketingMultiplier *
            employeeRevenue *
            phaseMultiplier *
            randomMarket * ramp * concentrationShock * (business.demandModifier??1),
        ),
    );
    const employeeCosts = Math.round(business.employees * country.gdpPerCapitaPpp * 0.18);
    let costs = Math.max(
        0,
        Math.round(
            country.gdpPerCapitaPpp * COST_INDEX[business.kind] * phaseMultiplier +
            business.marketingSpend +
            employeeCosts +
            business.capital * 0.02 + (business.operatingCostAdjustment??0),
        ),
    );
    const trade=settleTrade(character,country.gdpPerCapitaPpp,rng);
    revenue+=trade.revenue;costs+=trade.costs;
    if(business.trade) character.manualActions=[...(character.manualActions??[]),{year,month:11,text:business.trade.lastResult}];
    const net = revenue - costs;
    business.annualRevenue = revenue;
    business.annualCosts = costs;
    // Net profit is distributed to the owner below; it is not retained in capital as well.
    business.reputation = Math.round(
        clamp(
            business.reputation +
            (net > 0 ? 3 : -3) +
            Math.min(4, business.marketingSpend / Math.max(country.gdpPerCapitaPpp * 0.2, 1)),
            5,
            98,
        ),
    );
    if (net > 0) {
        business.insolventYears = Math.max(0,business.insolventYears-1);
        grant(character, net, `Beneficio de ${business.name}`, year, "income");
        applyPsychologyDelta(character, { selfEsteem: 2.2, stress: -1.5 });
    } else if (net < 0) {
        const loss = Math.abs(net);
        if (character.finance.money >= loss) {
            spend(character, loss, `Pérdidas de ${business.name}`, year, false);
        } else {
            adjustDebt(character, loss, `Pérdidas financiadas de ${business.name}`, year);
        }
        business.insolventYears += 1;
        applyPsychologyDelta(character, { stress: 5, selfEsteem: -2.5 });
    } else {
        business.insolventYears = Math.max(0, business.insolventYears - 1);
    }

    let bankrupt = false;
    if (business.insolventYears >= 3) {
        business.active = false;
        bankrupt = true;
        character.flags = (character.flags ?? []).filter((flag) => flag !== "negocio_activo");
        if (!character.flags.includes("negocio_quebrado")) character.flags.push("negocio_quebrado");
        character.employment.status = "unemployed";
        character.employment.occupation = null;
        character.employment.sector = null;
        applyPsychologyDelta(character, { stress: 15, selfEsteem: -8, grief: 3 });
        character.milestones.push({
            id: `ms-business-fail-${character.id}-${year}`,
            age: character.age,
            year,
            title: "Su empresa cerró",
            category: "trabajo",
        });
    }
    return { revenue, costs, net, bankrupt };
}

/** Each business owns its operating costs and settlement; results are aggregated once. */
export function advanceBusiness(character:CharacterState,economy:EconomyState,year:number,rng:Rng):BusinessAnnualResult|null{
 const list=activeBusinesses(character).sort((a,b)=>a.id.localeCompare(b.id));if(!list.length)return null;
 const wasRetired=character.employment.status==="retired";const selected=character.business,wasEmployed=character.employment.status==="employed",occupation=character.employment.occupation,sector=character.employment.sector;
 const total:BusinessAnnualResult={revenue:0,costs:0,net:0,bankrupt:false};
 for(const company of list){character.business=company;const result=advanceOneBusiness(character,economy,year,rng);if(result){total.revenue+=result.revenue;total.costs+=result.costs;total.net+=result.net;total.bankrupt ||=result.bankrupt;}}
 character.business=selected;
 if(list.some(b=>b.active)){character.flags=[...new Set([...(character.flags??[]),"negocio_activo"])];character.employment.status=wasRetired?"retired":wasEmployed?"employed":"self-employed";if(wasEmployed){character.employment.occupation=occupation;character.employment.sector=sector;}}
 return total;
}

export function applyBusinessChange(
    character: CharacterState,
    change: {
        marketingSpendDelta?: number;
        reputationDelta?: number;
        costDelta?: number;
        employeesDelta?: number;
        revenueDeltaPct?: number;
    },
): void {
    const business = character.business;
    if (!business) return;
    if (change.marketingSpendDelta) {
        business.marketingSpend = Math.max(0, Math.round(business.marketingSpend + change.marketingSpendDelta));
    }
    if (change.reputationDelta) {
        business.reputation = Math.round(clamp(business.reputation + change.reputationDelta, 0, 100));
    }
    if (change.costDelta) {
        business.operatingCostAdjustment=(business.operatingCostAdjustment??0)+change.costDelta;
        business.annualCosts = Math.max(0, Math.round(business.annualCosts + change.costDelta));
    }
    if (change.employeesDelta) {
        business.employees = Math.max(0, Math.min(20, business.employees + change.employeesDelta));
    }
    if (change.revenueDeltaPct) {
        business.demandModifier=clamp((business.demandModifier??1)*(1+change.revenueDeltaPct),.25,3);
        business.annualRevenue = Math.max(0, Math.round(business.annualRevenue * (1 + change.revenueDeltaPct)));
    }
}

export function businessLabel(kind: BusinessKind): string {
    return BUSINESS_LABELS[kind];
}

/** Cierra o vende la empresa y deja un registro explícito de la operación. */
export function endBusiness(
    character: CharacterState,
    year: number,
    reason: string,
    salePrice = 0,
): void {
    const business = character.business;
    if (!business?.active) return;
    business.active = false;
    character.flags = (character.flags ?? []).filter((flag) => flag !== "negocio_activo");
    character.flags = [...new Set([...(character.flags ?? []), "negocio_cerrado"])];
    if (salePrice > 0) {
        grant(character, salePrice, `Venta de ${business.name}`, year, "transfer");
        character.milestones.push({
            id: `ms-business-sale-${character.id}-${year}`,
            age: character.age,
            year,
            title: `Vendió ${business.name}`,
            category: "trabajo",
        });
    } else {
        character.milestones.push({
            id: `ms-business-close-${character.id}-${year}`,
            age: character.age,
            year,
            title: `Cerró ${business.name}`,
            category: "trabajo",
        });
    }
    character.employment.status = character.age >= 65 ? "retired" : "unemployed";
    character.employment.occupation = null;
    character.employment.sector = null;
    applyPsychologyDelta(character, { stress: 6, selfEsteem: salePrice > 0 ? 2 : -4, grief: 1 });
    void reason;
}

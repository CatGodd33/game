import type { CharacterState, WealthPressure, WealthTier } from "@life-duel/shared";
import { clamp, round } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";

function assetValue(character: CharacterState): number {
    return (character.assets ?? []).reduce((sum, asset) => sum + Math.max(0, asset.value), 0);
}

function loanBalance(character: CharacterState): number {
    return (character.loans ?? []).reduce((sum, loan) => sum + Math.max(0, loan.balance), 0);
}

/** Patrimonio neto contable del personaje, en dólares internacionales PPP. */
export function netWorth(character: CharacterState): number {
    return round(character.finance.money + assetValue(character) - character.finance.debt - loanBalance(character), 2);
}

function scaleOf(character: CharacterState): number {
    const gdp = getCountry(character.currentCountry).gdpPerCapitaPpp;
    return Math.max(1, character.finance.annualIncome, character.finance.annualExpenses, gdp * 0.5);
}

/**
 * Mantenimiento patrimonial: no es un impuesto inventado ni una multa por
 * tener dinero. Es el coste de conservar una estructura grande (viviendas,
 * inversiones y obligaciones) cuando el patrimonio supera cuatro veces la
 * capacidad económica anual. Se aplica con una transacción registrada.
 */
export function computeWealthUpkeep(character: CharacterState): number {
    if (character.age < 18) return 0;
    const worth = netWorth(character);
    const scale = scaleOf(character);
    const excess = worth - scale * 4;
    if (excess <= 0) return 0;
    const country = getCountry(character.currentCountry);
    const cap = Math.max(character.finance.annualIncome, country.gdpPerCapitaPpp * 0.4) * 0.15 + country.gdpPerCapitaPpp * 0.05;
    return round(Math.min(excess * 0.012, cap), 2);
}

function tierFor(worth: number, scale: number): WealthTier {
    if (worth < 0) return "en-riesgo";
    const multiple = worth / scale;
    if (multiple < 1) return "baja";
    if (multiple < 4) return "media";
    if (multiple < 10) return "alta";
    return "muy-alta";
}

export function computeWealthPressure(character: CharacterState): WealthPressure {
    const liquid = round(character.finance.money, 2);
    const assets = round(assetValue(character), 2);
    const obligations = round(character.finance.debt + loanBalance(character), 2);
    const worth = netWorth(character);
    const scale = scaleOf(character);
    const monthlyExpenses = Math.max(character.finance.annualExpenses / 12, 1);
    const monthsOfRunway = round(clamp(liquid / monthlyExpenses, 0, 36), 1);
    const leverage = obligations / scale;
    const concentration = worth > 0 ? assets / worth : 0;
    const pressure = round(
        clamp(
            leverage * 22 +
            (monthsOfRunway < 3 ? 22 : monthsOfRunway < 6 ? 10 : 0) +
            (worth > scale * 8 ? 18 : worth > scale * 4 ? 9 : 0) +
            concentration * 12,
            0,
            100,
        ),
    );

    const notes: string[] = [];
    if (worth < 0) {
        notes.push("Tu patrimonio neto es negativo. Cada nuevo gasto compite con la deuda.");
    } else if (worth > scale * 8) {
        notes.push("Tu patrimonio supera ocho veces tu capacidad económica anual: más activos, más mantenimiento y más decisiones que proteger.");
    } else if (worth > scale * 4) {
        notes.push("El patrimonio empieza a exigir mantenimiento, impuestos y acuerdos con otras personas.");
    } else {
        notes.push("Tu patrimonio todavía no genera una presión estructural relevante.");
    }
    if (obligations > 0) {
        notes.push(`La deuda equivale a ${round(obligations / Math.max(character.finance.annualIncome, 1), 1)} años de ingresos anuales.`);
    }
    if (monthsOfRunway < 3) notes.push("Tienes menos de tres meses de gastos en liquidez. Un imprevisto puede convertirse en deuda.");
    if (concentration > 0.8 && assets > 0) notes.push("Casi todo tu patrimonio está en activos poco líquidos: una casa no paga una factura médica.");

    return {
        netWorth: worth,
        liquid,
        assets,
        obligations,
        tier: tierFor(worth, scale),
        pressure,
        annualUpkeep: computeWealthUpkeep(character),
        monthsOfRunway,
        notes,
    };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { CountryData } from "../demographics/dataset.js";
import { config } from "../config.js";

const sharesSchema = z.object({
    housing: z.number().min(0).max(1),
    food: z.number().min(0).max(1),
    utilities: z.number().min(0).max(1),
    transport: z.number().min(0).max(1),
    health: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    other: z.number().min(0).max(1),
});

const profileSchema = z.object({
    monthlyShares: sharesSchema,
    mortgageRatePct: z.number().min(0).max(40),
    rentDepositMonths: z.number().min(0).max(12),
    visaDifficulty: z.number().min(0).max(100),
    migrationCostGdp: z.number().min(0).max(3),
    socialPressure: z.object({
        education: z.number().min(0).max(100),
        marriage: z.number().min(0).max(100),
        children: z.number().min(0).max(100),
    }),
    expectedChildren: z.number().min(0).max(12),
    inheritanceNorm: z.enum(["partible", "testamentaria", "mixta"]),
    provisional: z.boolean(),
});

const datasetSchema = z.object({
    version: z.string(),
    status: z.string(),
    description: z.string(),
    sources: z.array(z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().url(),
        license: z.string(),
        use: z.string(),
    })).min(1),
    notes: z.array(z.string()),
    defaults: profileSchema,
    countries: z.record(z.string(), profileSchema),
});

export type CountryContextProfile = z.infer<typeof profileSchema>;
export type CountryContextDataset = z.infer<typeof datasetSchema>;

let cached: CountryContextDataset | null = null;

export function countryContextDataset(): CountryContextDataset {
    if (cached) return cached;
    const path = join(config.dataDir, "country-context.json");
    const parsed = datasetSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    if (!parsed.success) {
        throw new Error(`Contexto de país inválido: ${JSON.stringify(parsed.error.issues)}`);
    }
    cached = parsed.data;
    return cached;
}

export function countryProfile(code: string): CountryContextProfile {
    const dataset = countryContextDataset();
    return dataset.countries[code.toUpperCase()] ?? dataset.defaults;
}

/**
 * Coste orientativo de una migración legal. Incluye solicitud, viaje,
 * instalación y depósito de vivienda. Se expresa en dólares PPP y es
 * deliberadamente provisional: no es una tarifa oficial de ningún visado.
 */
export function migrationCost(from: CountryData, to: CountryData): number {
    const origin = countryProfile(from.code);
    const destination = countryProfile(to.code);
    const visa = destination.visaDifficulty / 100;
    const distanceFactor = from.region === to.region ? 1 : 1.18;
    const incomeFactor = 0.85 + Math.min(1.5, to.gdpPerCapitaPpp / Math.max(1, from.gdpPerCapitaPpp)) * 0.15;
    const base = from.gdpPerCapitaPpp * (origin.migrationCostGdp + destination.migrationCostGdp) * 0.5;
    const deposit = destination.monthlyShares.housing * to.gdpPerCapitaPpp * destination.rentDepositMonths;
    return Math.round(base * (1 + visa) * distanceFactor * incomeFactor + deposit);
}

export interface SocialPressure {
    education: number;
    marriage: number;
    children: number;
    expectedChildren: number;
    inheritanceNorm: CountryContextProfile["inheritanceNorm"];
    provisional: boolean;
}

export function socialPressure(code: string): SocialPressure {
    const profile = countryProfile(code);
    return {
        ...profile.socialPressure,
        expectedChildren: profile.expectedChildren,
        inheritanceNorm: profile.inheritanceNorm,
        provisional: profile.provisional,
    };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { config } from "../config.js";
import type { CountryOption, DemographicsMeta } from "@life-duel/shared";

const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  license: z.string(),
  accessed: z.string(),
});

const countrySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
  region: z.string().min(1),
  incomeGroup: z.enum(["alto", "medio-alto", "medio-bajo", "bajo"]),
  populationMillions: z.number().positive(),
  birthsThousands: z.number().positive(),
  lifeExpectancy: z.object({
    female: z.number().min(30).max(100),
    male: z.number().min(30).max(100),
  }),
  infantMortalityPer1000: z.number().min(0).max(300),
  gdpPerCapitaPpp: z.number().positive(),
  gini: z.number().min(0).max(100),
  unemploymentRate: z.number().min(0).max(100),
  meanYearsSchooling: z.number().min(0).max(25),
  fertilityRate: z.number().min(0).max(12),
  urbanShare: z.number().min(0).max(100),
  currency: z.object({
    code: z.string().length(3),
    symbol: z.string().min(1),
    localPerIntlDollar: z.number().positive(),
    provisional: z.boolean(),
  }),
  cities: z.array(z.string().min(1)).min(1),
  names: z.object({
    female: z.array(z.string().min(1)).min(1),
    male: z.array(z.string().min(1)).min(1),
    surnames: z.array(z.string().min(1)).min(1),
  }),
  derived: z.object({
    costOfLivingIndex: z.number().positive(),
    healthcareAccess: z.number().min(0).max(100),
    educationQuality: z.number().min(0).max(100),
    environmentRisk: z.number().min(0).max(100),
    socialSafetyNet: z.number().min(0).max(100),
    provisional: z.boolean(),
  }),
});

const datasetSchema = z.object({
  datasetVersion: z.string(),
  retrievedAt: z.string(),
  description: z.string(),
  sources: z.array(sourceSchema).min(1),
  indicators: z.record(z.string(), z.unknown()),
  notes: z.array(z.string()),
  countries: z.array(countrySchema).min(1),
});

export type CountryData = z.infer<typeof countrySchema>;
export type DemographicsDataset = z.infer<typeof datasetSchema>;

let cached: DemographicsDataset | null = null;
const byCode = new Map<string, CountryData>();

export function loadDemographics(): DemographicsDataset {
  if (cached) return cached;
  const path = join(config.dataDir, "demographics.json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`No se pudo leer el conjunto demográfico en ${path}`);
  }
  const parsed = datasetSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Conjunto demográfico inválido: ${JSON.stringify(parsed.error.issues)}`);
  }
  cached = parsed.data;
  for (const country of cached.countries) {
    byCode.set(country.code, country);
  }
  return cached;
}

export function getCountry(code: string): CountryData {
  loadDemographics();
  const country = byCode.get(code.toUpperCase());
  if (!country) {
    throw new Error(`País no disponible en el conjunto demográfico: ${code}`);
  }
  return country;
}

export function listCountries(): CountryData[] {
  return loadDemographics().countries;
}

export function countryOptions(): CountryOption[] {
  return listCountries().map((country) => ({
    gdpPerCapitaPpp: country.gdpPerCapitaPpp,
    meanYearsSchooling: country.meanYearsSchooling,
    infantMortalityPer1000: country.infantMortalityPer1000,
    code: country.code,
    name: country.name,
    region: country.region,
    lifeExpectancy: country.lifeExpectancy,
    incomeGroup: country.incomeGroup,
    currencyCode: country.currency.code,
  }));
}

export function demographicsMeta(): DemographicsMeta {
  const dataset = loadDemographics();
  return {
    datasetVersion: dataset.datasetVersion,
    retrievedAt: dataset.retrievedAt,
    sources: dataset.sources,
    countries: countryOptions(),
    notes: dataset.notes,
  };
}

export function countryName(code: string): string {
  return getCountry(code).name;
}

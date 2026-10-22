import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { CountryContext, EducationLevel, OccupationProfile } from "@life-duel/shared";
import { EDUCATION_META } from "@life-duel/shared";
import { config } from "../config.js";
import { getCountry } from "../demographics/dataset.js";
import type { Rng } from "./rng.js";

const occupationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sector: z.string().min(1),
  minEducation: z.enum(["none", "primary", "secondary", "vocational", "university", "postgraduate"]),
  salaryIndex: z.number().positive(),
  formality: z.number().min(0).max(1),
  risk: z.number().min(0).max(100),
  tiers: z.array(z.number().int().min(1).max(5)).min(1),
  sexAffinity: z.enum(["neutral", "female", "male"]),
  ruralOnly: z.boolean(),
});

const countryContextSchema = z.object({
  femaleLaborParticipationPct: z.number().min(0).max(100),
  genderWageGapPct: z.number().min(0).max(100),
  marriageSystem: z.enum(["monogamia-legal", "monogamia", "poligamia-legal", "poligamia-consuetudinaria", "poligamia-restringida"]),
  polygynyLegal: z.boolean(),
  religionShares: z.record(z.string(), z.number().positive()),
  religiosity: z.number().min(0).max(100),
  contextSource: z.string(),
  provisional: z.boolean(),
});

const realismSchema = z.object({
  version: z.string(),
  status: z.literal("provisional"),
  description: z.string(),
  sources: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().url(),
    license: z.string(),
    use: z.string(),
  })).min(1),
  notes: z.array(z.string()),
  household: z.object({
    quintileIncomeMultipliers: z.record(z.string(), z.number().positive()),
    expenseShareByTier: z.record(z.string(), z.number().min(0).max(1)),
    savingsMonthsByTier: z.record(z.string(), z.number().nonnegative()),
    debtMonthsByTier: z.record(z.string(), z.number().nonnegative()),
    assetYearsByTier: z.record(z.string(), z.number().nonnegative()),
    housingTenureWeights: z.record(z.string(), z.record(z.string(), z.number().nonnegative())),
    structureWeights: z.record(z.string(), z.number().nonnegative()),
    funeralMonthsOfIncomeByTier: z.record(z.string(), z.number().positive()),
    funeralCostOfLivingMultiplier: z.number().positive(),
    supportLevelByTier: z.record(z.string(), z.number().min(0).max(100)),
    maxFamilyLoanMonthsOfIncome: z.number().positive(),
    parentSupportDisposableShare: z.number().min(0).max(1),
    householdOtherIncomeShare: z.number().min(0).max(1),
    coWifeProbabilityPct: z.number().min(0).max(100),
    grandparentInHouseholdProbabilityPct: z.number().min(0).max(100),
  }),
  occupations: z.array(occupationSchema).min(5),
  countries: z.record(z.string(), countryContextSchema),
});

export type RealismModel = z.infer<typeof realismSchema>;
export type OccupationDefinition = z.infer<typeof occupationSchema>;

let cached: RealismModel | null = null;
let genericContext: z.infer<typeof countryContextSchema> | null = null;

export function realismModel(): RealismModel {
  if (cached) return cached;
  const path = join(config.dataDir, "realism-model.json");
  const raw = readFileSync(path, "utf8");
  const parsed = realismSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Modelo de realismo inválido: ${JSON.stringify(parsed.error.issues)}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Contexto cultural y legal del país. Si falta un país se usa un contexto
 * conservador y se marca como provisional; nunca se inventa una estadística
 * presentándola como oficial.
 */
export function countryContext(countryCode: string): CountryContext & { contextSource: string } {
  const model = realismModel();
  const entry = model.countries[countryCode.toUpperCase()];
  if (entry) {
    return {
      countryCode: countryCode.toUpperCase(),
      ...entry,
      contextSource: entry.contextSource,
    };
  }
  genericContext ??= {
    femaleLaborParticipationPct: 50,
    genderWageGapPct: 15,
    marriageSystem: "monogamia-legal",
    polygynyLegal: false,
    religionShares: { "Sin afiliación religiosa": 50, "Otra religión": 50 },
    religiosity: 50,
    contextSource: "Contexto genérico provisional: no hay datos específicos para este país.",
    provisional: true,
  };
  return { countryCode: countryCode.toUpperCase(), ...genericContext, contextSource: genericContext.contextSource };
}

export function educationRank(level: EducationLevel): number {
  return EDUCATION_META[level]?.rank ?? 0;
}

export function eligibleOccupations(
  education: EducationLevel,
  tier: number,
  sex: "female" | "male",
  rural: boolean,
): OccupationDefinition[] {
  const rank = educationRank(education);
  return realismModel().occupations.filter((occupation) =>
    educationRank(occupation.minEducation) <= rank &&
    occupation.tiers.includes(tier) &&
    (!occupation.ruralOnly || rural) &&
    (occupation.sexAffinity === "neutral" || occupation.sexAffinity === sex),
  );
}

/**
 * Elige una ocupación compatible con educación, quintil, sexo y entorno.
 * La ponderación favorece sueldos cercanos al objetivo del hogar sin impedir
 * trayectorias atípicas. Es determinista para una misma semilla.
 */
export function pickOccupation(
  rng: Rng,
  education: EducationLevel,
  tier: number,
  sex: "female" | "male",
  rural: boolean,
  targetAnnualIncome: number,
  gdpPerCapitaPpp: number,
): OccupationDefinition {
  const eligible = eligibleOccupations(education, tier, sex, rural);
  const fallback = realismModel().occupations.filter((occupation) =>
    educationRank(occupation.minEducation) <= educationRank(education) &&
    (!occupation.ruralOnly || rural),
  );
  const pool = eligible.length > 0 ? eligible : fallback;
  if (pool.length === 0) {
    throw new Error(`No hay ocupaciones compatibles para ${education}/${tier}/${sex}.`);
  }
  const expectedIncome = Math.max(targetAnnualIncome, gdpPerCapitaPpp * 0.25);
  return rng.weighted(pool, (occupation) => {
    const salary = gdpPerCapitaPpp * occupation.salaryIndex;
    const ratio = salary / expectedIncome;
    const distance = Math.abs(Math.log(Math.max(0.08, ratio)));
    const tierBonus = occupation.tiers.includes(tier) ? 2.2 : 1;
    const sexBonus = occupation.sexAffinity === sex ? 1.25 : 1;
    return tierBonus * sexBonus * Math.exp(-distance * 1.7);
  });
}

export function weightedReligion(code: string, rng: Rng): string {
  const context = countryContext(code);
  const entries = Object.entries(context.religionShares);
  return rng.weighted(entries, ([, share]) => share)[0];
}

export function parentHealthEstimate(
  rng: Rng,
  countryCode: string,
  age: number,
): number {
  const country = getCountry(countryCode);
  const base = 58 + country.derived.healthcareAccess * 0.24 - Math.max(0, age - 45) * 0.32;
  return Math.round(Math.max(24, Math.min(94, base + rng.normal(0, 6))));
}

export function sourceSummary(): string[] {
  return realismModel().sources.map((source) => `${source.name} — ${source.license}`);
}

export function occupationCatalog(): OccupationProfile[] {
  return realismModel().occupations.map((occupation) => ({
    id: occupation.id,
    label: occupation.label,
    sector: occupation.sector,
    minEducation: occupation.minEducation,
    salaryIndex: occupation.salaryIndex,
    formality: occupation.formality,
    risk: occupation.risk,
    tiers: occupation.tiers,
  }));
}

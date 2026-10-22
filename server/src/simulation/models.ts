import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { config } from "../config.js";

const economySchema = z.object({
  version: z.string(),
  status: z.literal("provisional"),
  description: z.string(),
  currencyNote: z.string(),
  expenseWeights: z.object({
    food: z.number(),
    housing: z.number(),
    transport: z.number(),
    health: z.number(),
    education: z.number(),
    other: z.number(),
  }),
  housingQualityExpense: z.object({ min: z.number(), max: z.number() }),
  income: z.object({
    baseShareOfGdpPerCapita: z.number(),
    educationMultipliers: z.record(z.string(), z.number()),
    experienceBonusPerYear: z.number(),
    experienceBonusCap: z.number(),
    agePeak: z.number(),
    ageDeclinePerYearAfterPeak: z.number(),
    ageDeclineCap: z.number(),
    minimumIncomeShare: z.number(),
    selfEmploymentVolatility: z.number(),
    unemploymentSupportShare: z.number(),
    pensionReplacementRate: z.number(),
    retirementAge: z.number(),
    childCostShareOfEssentials: z.number(),
    partnerCostShareOfEssentials: z.number(),
  }),
  tax: z.object({
    model: z.string(),
    personalAllowanceShareOfGdp: z.number(),
    brackets: z.array(z.object({ upToGdpMultiple: z.number(), rate: z.number() })).min(1),
    socialContributionRate: z.number(),
  }),
  debt: z.object({
    annualInterestRate: z.number(),
    maxDebtToIncomeRatio: z.number(),
    debtReliefAfterYears: z.number(),
    debtReliefForgivenessShare: z.number(),
    stressHappinessPenaltyPerDebtShare: z.number(),
  }),
  healthCare: z.object({
    basicAnnualCostShareOfEssentials: z.number(),
    premiumAnnualCostShareOfEssentials: z.number(),
    premiumHealthBonus: z.number(),
    premiumMortalityReduction: z.number(),
    freeCareThresholdAccess: z.number(),
  }),
  family: z.object({
    initialMoneyByTier: z.record(z.string(), z.number()),
    housingQualityByTier: z.record(z.string(), z.number()),
    parentSupportByTier: z.record(z.string(), z.number()),
  }),
  livingStandard: z.object({
    floor: z.number(),
    ceiling: z.number(),
    incomeToGdpRatioWeight: z.number(),
    housingWeight: z.number(),
    savingsMonthsWeight: z.number(),
    debtPenalty: z.number(),
  }),
  notes: z.array(z.string()),
});

const mortalitySchema = z.object({
  version: z.string(),
  status: z.literal("provisional"),
  description: z.string(),
  sources: z.array(z.string()),
  gompertz: z.object({
    adultHazardA: z.number(),
    adultHazardB: z.number(),
    calibrationMin: z.number(),
    calibrationMax: z.number(),
    calibrationIterations: z.number().int(),
    ageCap: z.number().int(),
    infantHazardFactor: z.number(),
  }),
  healthRisk: z.object({
    perHealthPointBelow: z.number(),
    minHealthMultiplier: z.number(),
    maxHealthMultiplier: z.number(),
    chronicConditionMultiplier: z.number(),
    maxChronicMultiplier: z.number(),
    healthcareAccessBenefit: z.number(),
    povertyMultiplier: z.number(),
    difficultyMultiplier: z.number(),
    frailtyOnsetAge: z.number(),
    frailtyPerYear: z.number(),
  }),
  causeWeights: z
    .array(
      z.object({
        group: z.string(),
        minAge: z.number(),
        maxAge: z.number(),
        causes: z.array(z.object({ name: z.string(), weight: z.number().positive() })).min(1),
      }),
    )
    .min(1),
  notes: z.array(z.string()),
});

export type EconomyModel = z.infer<typeof economySchema>;
export type MortalityModel = z.infer<typeof mortalitySchema>;
export type CauseGroup = MortalityModel["causeWeights"][number];

let economyCache: EconomyModel | null = null;
let mortalityCache: MortalityModel | null = null;

function readModel<T>(file: string, schema: z.ZodType<T>): T {
  const path = join(config.dataDir, file);
  const raw = readFileSync(path, "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Modelo inválido ${file}: ${JSON.stringify(parsed.error.issues)}`);
  }
  return parsed.data;
}

export function economyModel(): EconomyModel {
  economyCache ??= readModel("economy-model.json", economySchema);
  return economyCache;
}

export function mortalityModel(): MortalityModel {
  mortalityCache ??= readModel("mortality-model.json", mortalitySchema);
  return mortalityCache;
}

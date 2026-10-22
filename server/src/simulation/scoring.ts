import {
  clamp,
  EDUCATION_META,
  SCORE_CATEGORY_META,
  SCORE_TIE_THRESHOLD,
} from "@life-duel/shared";
import type {
  CharacterState,
  ScoreBreakdown,
  ScoreCategoryKey,
  ScoreCategoryResult,
  ScoreWeights,
} from "@life-duel/shared";
import { economyModel } from "./models.js";

export interface LifeSnapshot {
  age: number;
  health: number;
  happiness: number;
  knowledge: number;
  relationships: number;
  income: number;
  expenses: number;
  debt: number;
  money: number;
  education: CharacterState["educationLevel"];
  milestones: number;
}

export interface ScoreInput {
  character: CharacterState;
  weights: ScoreWeights;
  snapshots: LifeSnapshot[];
  lifeExpectancyAtBirth: number;
  gdpPerCapitaPpp: number;
  ageOverride?: number;
}

function average(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function economicStability(snapshots: LifeSnapshot[], gdpPerCapitaPpp: number): number {
  const model = economyModel();
  if (snapshots.length === 0) return 0;
  const avgIncome = average(snapshots.map((snapshot) => snapshot.income));
  const avgExpenses = average(snapshots.map((snapshot) => snapshot.expenses));
  const avgSavings = average(snapshots.map((snapshot) => snapshot.money));
  const avgDebt = average(snapshots.map((snapshot) => snapshot.debt));
  const insolventYears = snapshots.filter((snapshot) => snapshot.money < 0).length;

  const level = clamp(avgIncome / Math.max(gdpPerCapitaPpp * 1.5, 1), 0, 1.5);
  const levelPoints = 35 * Math.sqrt(level / 1.5);
  const coverage = clamp(avgIncome / Math.max(avgExpenses, 1), 0, 2);
  const coveragePoints = 35 * Math.sqrt(coverage / 2);
  const savingsMonths = clamp(avgSavings * 12 / Math.max(avgExpenses, 1), 0, 24);
  const savingsPoints = 15 * Math.min(1, savingsMonths / 12);
  const debtShare = clamp(avgDebt / Math.max(avgIncome, 1) / model.debt.maxDebtToIncomeRatio, 0, 1);
  const debtPenalty = 30 * debtShare;
  const insolvencyPenalty = snapshots.length > 0 ? (insolventYears / snapshots.length) * 12 : 0;

  return round(clamp(15 + levelPoints + coveragePoints + savingsPoints - debtPenalty - insolvencyPenalty));
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const { character, weights, snapshots, lifeExpectancyAtBirth } = input;
  const age = input.ageOverride ?? (character.alive ? character.age : character.ageAtDeath ?? character.age);
  const finalAge = Math.max(0, age);
  const safeSnapshots = snapshots.length > 0 ? snapshots : [snapshotFromCharacter(character)];

  const healthFinal = character.alive ? character.stats.health : character.stats.health;
  const health = clamp(0.55 * average(safeSnapshots.map((snapshot) => snapshot.health), healthFinal) + 0.45 * healthFinal);
  const happiness = clamp(
    0.55 * average(safeSnapshots.map((snapshot) => snapshot.happiness), character.stats.happiness) +
      0.45 * character.stats.happiness,
  );
  const knowledgeFinal = Math.max(
    character.stats.knowledge,
    character.stats.knowledge * 0.92 + average(safeSnapshots.map((snapshot) => snapshot.knowledge)) * 0.08,
  );
  const knowledge = clamp(
    0.5 * average(safeSnapshots.map((snapshot) => snapshot.knowledge), knowledgeFinal) + 0.5 * knowledgeFinal,
  );
  const relationships = clamp(
    0.55 * average(safeSnapshots.map((snapshot) => snapshot.relationships), character.stats.relationships) +
      0.45 * character.stats.relationships,
  );

  const economic = economicStability(safeSnapshots, input.gdpPerCapitaPpp);

  const educationRank = EDUCATION_META[character.educationLevel]?.rank ?? 0;
  const educationBase = (educationRank / 5) * 100;
  // Purchases, pets and repeated transfers are diary entries, not education.
  const achievements = new Set(character.milestones.filter(m => m.category === "educacion").map(m => m.title)).size;
  const milestoneBonus = Math.min(100, 25 + Math.min(1, achievements / 4) * 75);
  const education = clamp(0.7 * educationBase + 0.3 * milestoneBonus);

  const lifeExpectancy = Math.max(30, lifeExpectancyAtBirth);
  const longevity = clamp((finalAge / lifeExpectancy) * 100);

  const categories: Record<ScoreCategoryKey, number> = {
    health: round(health),
    happiness: round(happiness),
    knowledge: round(knowledge),
    relationships: round(relationships),
    economic: round(economic),
    education: round(education),
    longevity: round(longevity),
  };

  const weightedRaw = (Object.keys(weights) as ScoreCategoryKey[]).reduce(
    (total, key) => total + categories[key] * (weights[key] / 100),
    0,
  );
  const wellbeingGate = round(0.75 + 0.25 * ((categories.health + categories.happiness) / 200), 3);
  const total = round(weightedRaw * wellbeingGate, 1);

  const details: ScoreCategoryResult[] = (Object.keys(weights) as ScoreCategoryKey[]).map((key) => ({
    key,
    label: SCORE_CATEGORY_META[key].label,
    value: categories[key],
    weight: weights[key],
    contribution: round(categories[key] * (weights[key] / 100) * wellbeingGate, 1),
    detail: SCORE_CATEGORY_META[key].description,
  }));

  const notes = [
    "Las categorías se normalizan a una escala 0-100 antes de combinarlas.",
    "La estabilidad económica usa ingresos, cobertura de gastos, ahorro y deuda con rendimientos decrecientes.",
    "La longevidad se mide en relación con la esperanza de vida al nacer y tiene un peso máximo del 5 %.",
    "La puerta de bienestar reduce la puntuación total entre un 0 % y un 25 % si la salud o la felicidad son bajas.",
  ];

  return {
    total,
    categories,
    weighted: round(weightedRaw),
    wellbeingGate,
    weights: { ...weights },
    details,
    notes,
  };
}

export function snapshotFromCharacter(character: CharacterState): LifeSnapshot {
  return {
    age: character.age,
    health: character.stats.health,
    happiness: character.stats.happiness,
    knowledge: character.stats.knowledge,
    relationships: character.stats.relationships,
    income: character.finance.annualIncome,
    expenses: character.finance.annualExpenses,
    debt: character.finance.debt+(character.unpaidBills??0),
    money: character.finance.money,
    education: character.educationLevel,
    milestones: character.milestones.length,
  };
}

export interface ComparisonResult {
  winner: 1 | 2 | "tie" | null;
  margin: number;
  categoryWinners: Partial<Record<ScoreCategoryKey, 1 | 2 | "tie">>;
}

export function compareScores(
  first: ScoreBreakdown | null,
  second: ScoreBreakdown | null,
): ComparisonResult {
  if (!first && !second) return { winner: null, margin: 0, categoryWinners: {} };
  if (!first) return { winner: 2, margin: 0, categoryWinners: {} };
  if (!second) return { winner: 1, margin: 0, categoryWinners: {} };

  const margin = round(Math.abs(first.total - second.total), 1);
  const winner = margin < SCORE_TIE_THRESHOLD ? "tie" : first.total > second.total ? 1 : 2;
  const categoryWinners: ComparisonResult["categoryWinners"] = {};
  for (const key of Object.keys(first.categories) as ScoreCategoryKey[]) {
    const difference = Math.abs(first.categories[key] - second.categories[key]);
    categoryWinners[key] =
      difference < SCORE_TIE_THRESHOLD
        ? "tie"
        : first.categories[key] > second.categories[key]
          ? 1
          : 2;
  }
  return { winner, margin, categoryWinners };
}

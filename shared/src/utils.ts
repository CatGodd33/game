import { LIFE_STAGES } from "./constants.js";
import type { CurrencyInfo, LifeStage, ScoreWeights } from "./types.js";

export const LOCALE = "es-ES";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function stageForAge(age: number): LifeStage {
  const match = LIFE_STAGES.find((stage) => age >= stage.min && age <= stage.max);
  return (match?.stage ?? "vejez") as LifeStage;
}

export function sumWeights(weights: ScoreWeights): number {
  return Object.values(weights).reduce((total, value) => total + value, 0);
}

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const total = sumWeights(weights);
  if (total <= 0) return weights;
  const keys = Object.keys(weights) as (keyof ScoreWeights)[];
  return Object.fromEntries(
    keys.map((key) => [key, round((weights[key] / total) * 100, 2)]),
  ) as unknown as ScoreWeights;
}

/** Convierte dólares internacionales (PPP) a la moneda local de forma aproximada. */
export function toLocalMoney(amountIntl: number, currency: CurrencyInfo): number {
  return amountIntl * currency.localPerIntlDollar;
}

export function formatMoney(amountIntl: number, currency: CurrencyInfo): string {
  const local = toLocalMoney(amountIntl, currency);
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: Math.abs(local) >= 1000 ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(local);
  } catch {
    return `${local.toFixed(0)} ${currency.symbol}`;
  }
}

export function formatCompactMoney(amountIntl: number, currency: CurrencyInfo): string {
  const local = toLocalMoney(amountIntl, currency);
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: currency.code,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(local);
  } catch {
    return `${Math.round(local)} ${currency.symbol}`;
  }
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatScore(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

export function riskLabel(chance: number | null): "bajo" | "medio" | "alto" | null {
  if (chance === null) return null;
  if (chance >= 70) return "bajo";
  if (chance >= 40) return "medio";
  return "alto";
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function ageLabel(age: number): string {
  return `${age} ${age === 1 ? "año" : "años"}`;
}

export function maskedSeed(fingerprint: string): string {
  return fingerprint.slice(0, 8).toUpperCase();
}

export function educationLabel(level: string): string {
  const labels: Record<string, string> = {
    none: "Sin escolarización",
    primary: "Educación primaria",
    secondary: "Educación secundaria",
    vocational: "Formación profesional",
    university: "Estudios universitarios",
    postgraduate: "Posgrado",
  };
  return labels[level] ?? level;
}

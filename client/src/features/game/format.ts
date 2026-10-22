import type {
  CharacterState,
  CurrencyInfo,
  EducationLevel,
  EmploymentStatus,
  LifeStage,
  MaritalStatus,
  Sex,
} from "@life-duel/shared";
import {
  EDUCATION_META,
  EMPLOYMENT_LABELS,
  MARITAL_LABELS,
  ageLabel,
  formatMoney,
  stageForAge,
} from "@life-duel/shared";

export const STAGE_LABELS: Record<LifeStage, string> = {
  infancia: "Infancia",
  adolescencia: "Adolescencia",
  adultez: "Adultez",
  madurez: "Madurez",
  vejez: "Vejez",
};

export function sexText(sex: Sex): string {
  return sex === "female" ? "Mujer" : "Hombre";
}

export function educationText(level: EducationLevel): string {
  return EDUCATION_META[level]?.label ?? level;
}

export function employmentText(status: EmploymentStatus, occupation: string | null): string {
  if (occupation) return occupation;
  return EMPLOYMENT_LABELS[status] ?? status;
}

export function maritalText(status: MaritalStatus): string {
  return MARITAL_LABELS[status] ?? status;
}

export function characterStage(character: Pick<CharacterState, "age" | "alive" | "ageAtDeath">): LifeStage {
  return stageForAge(character.ageAtDeath ?? character.age);
}

export function moneyText(amount: number, currency: CurrencyInfo): string {
  return formatMoney(amount, currency);
}

export function mortalityText(risk: number): string {
  if (risk < 0.35) return "Muy bajo";
  if (risk < 1) return "Bajo";
  if (risk < 3) return "Moderado";
  if (risk < 7) return "Alto";
  return "Muy alto";
}

export function riskTone(risk: number): "jade" | "amber" | "rose" | "danger" {
  if (risk < 1) return "jade";
  if (risk < 3) return "amber";
  if (risk < 7) return "rose";
  return "danger";
}

export function ageAndStage(age: number): string {
  return `${ageLabel(age)} · ${STAGE_LABELS[stageForAge(age)]}`;
}

export function lifeProgress(age: number, maxAge: number): number {
  return Math.max(0, Math.min(100, (age / Math.max(1, maxAge)) * 100));
}

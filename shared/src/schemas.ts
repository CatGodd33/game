import { z } from "zod";
import {
  DEFAULT_GAME_CONFIG,
  DEFAULT_SCORE_WEIGHTS,
  GAME_SPEEDS,
  MAX_ALIAS_LENGTH,
  MIN_ALIAS_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  SCORE_TIE_THRESHOLD,
} from "./constants.js";

const scorePart = z.number().min(0).max(100);

export const scoreWeightsSchema = z
  .object({
    health: scorePart,
    happiness: scorePart,
    knowledge: scorePart,
    relationships: scorePart,
    economic: scorePart,
    education: scorePart,
    longevity: scorePart,
  })
  .refine(
    (weights) =>
      Math.abs(
        Object.values(weights).reduce((total, value) => total + value, 0) - 100,
      ) < 0.01,
    { message: "Los pesos de puntuación deben sumar exactamente 100." },
  );

export const aliasSchema = z
  .string()
  .trim()
  .min(MIN_ALIAS_LENGTH, `El alias debe tener al menos ${MIN_ALIAS_LENGTH} caracteres.`)
  .max(MAX_ALIAS_LENGTH, `El alias no puede superar ${MAX_ALIAS_LENGTH} caracteres.`)
  .regex(
    /^[\p{L}\p{N} ._'-]+$/u,
    "El alias solo puede contener letras, números, espacios, puntos, guiones y apóstrofes.",
  )
  .refine((value) => !/\s{2,}/.test(value), "El alias no puede contener espacios dobles.")
  .transform((value) => value.replace(/\s+/g, " ").trim());

export const gameConfigSchema = z.object({
  storyMode: z.boolean().optional(),
  monthlyMode: z.boolean().optional(),
  era: z.enum(["past", "present", "future"]).default(DEFAULT_GAME_CONFIG.era),
  countryMode: z.enum(["weighted", "population", "random", "fixed"]).default(DEFAULT_GAME_CONFIG.countryMode),
  fixedCountry: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "El país debe usar un código ISO de tres letras.")
    .optional(),
  fixedYear: z.number().int().min(1950).max(2060).optional(),
  maxAge: z.union([z.literal(60), z.literal(85), z.literal(105)]).default(DEFAULT_GAME_CONFIG.maxAge),
  difficulty: z.enum(["relajada", "equilibrada", "exigente"]).default(DEFAULT_GAME_CONFIG.difficulty),
  autoDecisions: z.boolean().default(DEFAULT_GAME_CONFIG.autoDecisions),
  decisionTimerSeconds: z
    .number()
    .int()
    .min(0)
    .max(300)
    .refine((value) => value === 0 || value >= 15, "El temporizador debe ser 0 o al menos 15 segundos.")
    .default(DEFAULT_GAME_CONFIG.decisionTimerSeconds),
  speed: z
    .union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(12), z.literal(16)])
    .default(DEFAULT_GAME_CONFIG.speed),
  scoringWeights: scoreWeightsSchema.default(DEFAULT_SCORE_WEIGHTS),
  content: z
    .object({
      severity: z.enum(["full", "moderate"]).default(DEFAULT_GAME_CONFIG.content.severity),
    })
    .default(DEFAULT_GAME_CONFIG.content),
});

export const createSoloSchema = z.object({
  config: gameConfigSchema,
  alias: aliasSchema.optional(),
});

export const createRoomSchema = z.object({
  alias: aliasSchema,
  config: gameConfigSchema,
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(ROOM_CODE_LENGTH, `El código debe tener ${ROOM_CODE_LENGTH} caracteres.`)
    .refine(
      (value) => [...value].every((character) => ROOM_CODE_ALPHABET.includes(character)),
      "El código contiene caracteres no válidos.",
    ),
  alias: aliasSchema,
});

export const updateRoomConfigSchema = z.object({
  config: gameConfigSchema,
});

export const readySchema = z.object({
  ready: z.boolean(),
});

export const submitDecisionSchema = z.object({
  turn: z.number().int().min(0),
  decisionId: z.string().min(1).max(80),
  optionId: z.string().min(1).max(80),
  idempotencyKey: z.string().min(8).max(80).regex(/^[A-Za-z0-9:_-]+$/, "Clave de idempotencia no válida."),
});

export const setSpeedSchema = z.object({
  speed: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(12), z.literal(16)]),
});

export const setAutoSchema = z.object({
  enabled: z.boolean(),
  decisionTimerSeconds: z.number().int().min(0).max(300).optional(),
});

export const pauseSchema = z.object({
  paused: z.boolean(),
});

export const rematchSchema = z.object({
  config: gameConfigSchema.optional(),
});

export const sessionSchema = z.object({
  alias: aliasSchema.optional(),
});

export const narrativeSchema = z.object({
  kind: z.enum(["final", "turn"]).default("final"),
});

export const gameIdParamSchema = z.string().uuid("Identificador de partida no válido.");

export const roomCodeParamSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .refine((value) => [...value].every((character) => ROOM_CODE_ALPHABET.includes(character)));

export const historyQuerySchema = z.object({
  category: z.string().max(40).optional(),
  player: z.enum(["1", "2"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const SCORING_WEIGHT_KEYS = [
  "health",
  "happiness",
  "knowledge",
  "relationships",
  "economic",
  "education",
  "longevity",
] as const;

export const TIE_THRESHOLD = SCORE_TIE_THRESHOLD;
export { GAME_SPEEDS };

export type CreateSoloInput = z.infer<typeof createSoloSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type SubmitDecisionInput = z.infer<typeof submitDecisionSchema>;
export type SetSpeedInput = z.infer<typeof setSpeedSchema>;
export type SetAutoInput = z.infer<typeof setAutoSchema>;
export type UpdateRoomConfigInput = z.infer<typeof updateRoomConfigSchema>;

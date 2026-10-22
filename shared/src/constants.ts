import type {
    CoreStatKey,
    DecisionCategory,
    Difficulty,
    EducationLevel,
    EmploymentStatus,
    Era,
    EventCategory,
    GameConfig,
    GameSpeed,
    MaritalStatus,
    ScoreCategoryKey,
    ScoreWeights,
} from "./types.js";

export const APP_NAME = "LIFE DUEL";
export const APP_TAGLINE = "Dos vidas. Un mismo mundo. Una sola oportunidad.";
export const APP_VERSION = "2.2.0";

export const MIN_ALIAS_LENGTH = 2;
export const MAX_ALIAS_LENGTH = 18;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_EXPIRY_HOURS = 24;
export const MAX_LEDGER_ENTRIES = 400;
export const DECISION_TIMEOUT_OPTIONS = [0, 60, 180, 300] as const;
export const GAME_SPEEDS: GameSpeed[] = [1, 2, 4, 8, 12, 16];

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
    health: 20,
    happiness: 20,
    knowledge: 15,
    relationships: 15,
    economic: 15,
    education: 10,
    longevity: 5,
};

export const SCORE_CATEGORY_META: Record<
    ScoreCategoryKey,
    { label: string; short: string; description: string; color: string }
> = {
    health: {
        label: "Salud",
        short: "SAL",
        description: "Salud media y salud final a lo largo de la vida.",
        color: "#4ade80",
    },
    happiness: {
        label: "Felicidad",
        short: "FEL",
        description: "Bienestar subjetivo medio y final.",
        color: "#fbbf24",
    },
    knowledge: {
        label: "Conocimiento",
        short: "CON",
        description: "Aprendizaje acumulado y formación.",
        color: "#60a5fa",
    },
    relationships: {
        label: "Relaciones",
        short: "REL",
        description: "Vínculos, familia y apoyo social.",
        color: "#fb7185",
    },
    economic: {
        label: "Estabilidad económica",
        short: "ECO",
        description: "Ingresos, ahorro y deuda, con rendimientos decrecientes.",
        color: "#34d399",
    },
    education: {
        label: "Educación y logros",
        short: "EDU",
        description: "Nivel educativo e hitos vitales alcanzados.",
        color: "#a78bfa",
    },
    longevity: {
        label: "Longevidad",
        short: "LON",
        description: "Años vividos respecto a la esperanza de vida del país, con peso limitado.",
        color: "#94a3b8",
    },
};

export const CORE_STAT_META: Record<
    CoreStatKey,
    { label: string; short: string; description: string; color: string; icon: string }
> = {
    health: {
        label: "Salud",
        short: "Salud",
        description:
            "Estado físico y mental. Baja con la edad y las enfermedades, sube con hábitos y atención médica.",
        color: "#4ade80",
        icon: "heart-pulse",
    },
    happiness: {
        label: "Felicidad",
        short: "Felicidad",
        description:
            "Bienestar emocional. Depende de relaciones, salud, estabilidad y decisiones de ocio.",
        color: "#fbbf24",
        icon: "sun",
    },
    knowledge: {
        label: "Conocimiento",
        short: "Conocimiento",
        description:
            "Capital humano. Crece con educación, lectura y experiencia; se conserva mejor con hábitos.",
        color: "#60a5fa",
        icon: "book-open",
    },
    relationships: {
        label: "Relaciones",
        short: "Relaciones",
        description:
            "Calidad de los vínculos. Se construye con tiempo compartido y se deteriora con el aislamiento.",
        color: "#fb7185",
        icon: "users",
    },
};

export const ERA_META: Record<
    Era,
    { label: string; range: string; description: string }
> = {
    past: {
        label: "Mundo pasado",
        range: "1950 – 1989",
        description: "Nacimiento en el siglo XX, con economías y sistemas sanitarios anteriores a internet.",
    },
    present: {
        label: "Mundo actual",
        range: "1990 – 2034",
        description: "Un nacimiento contemporáneo, con la economía y la tecnología que conocemos.",
    },
    future: {
        label: "Mundo futuro",
        range: "2035 – 2050",
        description: "Un escenario especulativo marcado por el clima y la automatización.",
    },
};

export const ERA_YEAR_RANGES: Record<Era, [number, number]> = {
    past: [1950, 1989],
    present: [1990, 2034],
    future: [2035, 2050],
};

export const DIFFICULTY_META: Record<
    Difficulty,
    { label: string; description: string; mortalityMultiplier: number; costMultiplier: number }
> = {
    relajada: {
        label: "Relajada",
        description: "Mortalidad reducida y costes más amables. Ideal para descubrir el juego.",
        mortalityMultiplier: 0.75,
        costMultiplier: 0.92,
    },
    equilibrada: {
        label: "Equilibrada",
        description: "El comportamiento de referencia del modelo.",
        mortalityMultiplier: 1,
        costMultiplier: 1,
    },
    exigente: {
        label: "Exigente",
        description: "Economía más dura y mortalidad algo superior. Las decisiones importan más.",
        mortalityMultiplier: 1.25,
        costMultiplier: 1.1,
    },
};

export const EDUCATION_META: Record<
    EducationLevel,
    { label: string; rank: number; years: number }
> = {
    none: { label: "Sin escolarización", rank: 0, years: 0 },
    primary: { label: "Educación primaria", rank: 1, years: 6 },
    secondary: { label: "Educación secundaria", rank: 2, years: 12 },
    vocational: { label: "Formación profesional", rank: 3, years: 14 },
    university: { label: "Estudios universitarios", rank: 4, years: 17 },
    postgraduate: { label: "Posgrado", rank: 5, years: 20 },
};

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
    child: "Infancia",
    student: "Estudiante",
    unemployed: "En búsqueda de empleo",
    employed: "Empleado/a",
    "self-employed": "Trabajo por cuenta propia",
    retired: "Jubilado/a",
    disabled: "Incapacidad laboral",
};

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
    single: "Soltero/a",
    dating: "En pareja",
    married: "Casado/a",
    divorced: "Divorciado/a",
    widowed: "Viudo/a",
};

export const DECISION_CATEGORY_META: Record<
    DecisionCategory,
    { label: string; color: string }
> = {
    educacion: { label: "Educación", color: "#60a5fa" },
    salud: { label: "Salud", color: "#4ade80" },
    trabajo: { label: "Trabajo", color: "#f59e0b" },
    dinero: { label: "Dinero", color: "#34d399" },
    familia: { label: "Familia", color: "#fb7185" },
    relaciones: { label: "Relaciones", color: "#f472b6" },
    vivienda: { label: "Vivienda", color: "#c084fc" },
    migracion: { label: "Migración", color: "#38bdf8" },
    ocio: { label: "Ocio y hábitos", color: "#facc15" },
    riesgo: { label: "Riesgo", color: "#f87171" },
};

export const EVENT_CATEGORY_META: Record<
    EventCategory,
    { label: string; color: string; icon: string }
> = {
    economia: { label: "Economía", color: "#f59e0b", icon: "trending-down" },
    politica: { label: "Política", color: "#a78bfa", icon: "landmark" },
    salud: { label: "Salud pública", color: "#4ade80", icon: "activity" },
    medioambiente: { label: "Medio ambiente", color: "#38bdf8", icon: "cloud-lightning" },
    educacion: { label: "Educación", color: "#60a5fa", icon: "graduation-cap" },
    trabajo: { label: "Mercado laboral", color: "#fbbf24", icon: "briefcase" },
    sociedad: { label: "Sociedad", color: "#fb7185", icon: "users" },
    tecnologia: { label: "Tecnología", color: "#22d3ee", icon: "cpu" },
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
    era: "present",
    countryMode: "weighted",
    maxAge: 105,
    difficulty: "equilibrada",
    // Las decisiones son manuales por defecto: el reloj avanza y se detiene en cada
    // encrucijada. El anfitrión puede activar la estrategia automática en la sala.
    autoDecisions: false,
    decisionTimerSeconds: 60,
    speed: 1,
    scoringWeights: { ...DEFAULT_SCORE_WEIGHTS },
    content: { severity: "full" },
};

export const TIMER_AUTO_SOFT_LOCK_SECONDS = 20;
export const MIN_GAME_DECISION_SECONDS = 15;
export const MAX_GAME_DECISION_SECONDS = 300;
export const MAX_ACTIVE_GAMES_PER_PLAYER = 25;
export const SOCKET_RATE_LIMIT_PER_MINUTE = 120;
export const DUEL_MAX_TURN_NUMBER = 106;

export type StageRange = { min: number; max: number; stage: string };

export const LIFE_STAGES: StageRange[] = [
    { min: 0, max: 12, stage: "infancia" },
    { min: 13, max: 19, stage: "adolescencia" },
    { min: 20, max: 39, stage: "adultez" },
    { min: 40, max: 64, stage: "madurez" },
    { min: 65, max: 120, stage: "vejez" },
];

export const SCORE_TIE_THRESHOLD = 0.25;

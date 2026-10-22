/**
 * Modelo de dominio compartido entre cliente y servidor.
 * El servidor es la única autoridad sobre estas estructuras: el cliente
 * únicamente recibe vistas saneadas y envía intenciones validadas.
 */

export type GameMode = "solo" | "duel";
export type GameStatus = "playing" | "paused" | "finished";
export type RoomStatus = "waiting" | "ready" | "playing" | "paused" | "finished";
export type PlayerSlot = 1 | 2;
export type Era = "past" | "present" | "future";
export type Sex = "female" | "male";
export type CountryMode = "weighted" | "population" | "random" | "fixed";
export type Difficulty = "relajada" | "equilibrada" | "exigente";
export type ContentSeverity = "full" | "moderate";
export type GameSpeed = 1 | 2 | 4 | 8 | 12 | 16;

export type EducationLevel =
    | "none"
    | "primary"
    | "secondary"
    | "vocational"
    | "university"
    | "postgraduate";

export type EmploymentStatus =
    | "child"
    | "student"
    | "unemployed"
    | "employed"
    | "self-employed"
    | "retired"
    | "disabled";

export type MaritalStatus =
    | "single"
    | "dating"
    | "married"
    | "divorced"
    | "widowed";

export type CoreStatKey = "health" | "happiness" | "knowledge" | "relationships";
export type ScoreCategoryKey =
    | "health"
    | "happiness"
    | "knowledge"
    | "relationships"
    | "economic"
    | "education"
    | "longevity";

export type DecisionCategory =
    | "educacion"
    | "salud"
    | "trabajo"
    | "dinero"
    | "familia"
    | "relaciones"
    | "vivienda"
    | "migracion"
    | "ocio"
    | "riesgo";

export type EventCategory =
    | "economia"
    | "politica"
    | "salud"
    | "medioambiente"
    | "educacion"
    | "trabajo"
    | "sociedad"
    | "tecnologia";

export type TransactionType =
    | "income"
    | "expense"
    | "debt"
    | "debt-payment"
    | "grant"
    | "transfer";

export type LifeStage = "infancia" | "adolescencia" | "adultez" | "madurez" | "vejez";

export interface ScoreWeights {
    health: number;
    happiness: number;
    knowledge: number;
    relationships: number;
    economic: number;
    education: number;
    longevity: number;
}

export interface ContentOptions {
    severity: ContentSeverity;
}

export type LifeFocus = "balanced" | "study" | "relationships" | "health" | "work" | "hobbies";
export type HouseholdStructure = "nuclear" | "monoparental" | "extendida" | "compuesta";
export type HousingTenure = "propiedad" | "hipoteca" | "alquiler" | "compartida" | "informal";

export interface ParentDetails {
    name: string;
    age: number;
    /** Descripción legible del oficio; se conserva para partidas antiguas. */
    occupation: string;
    sex?: Sex;
    education?: EducationLevel;
    occupationId?: string;
    sector?: string;
    annualIncome?: number;
    employmentStatus?: EmploymentStatus;
    health?: number;
    alive?: boolean;
    deathAge?: number;
    causeOfDeath?: string;
    relationshipQuality?: number;
    inHousehold?: boolean;
    /** Si participa en el mercado laboral remunerado. */
    inLaborForce?: boolean;
    informal?: boolean;
    /** El ingreso procede de una aportación externa, no de un salario dentro del hogar. */
    incomeIsSupport?: boolean;
}

export interface HouseholdMember {
    id: string;
    role: "co-esposa" | "abuela" | "abuelo" | "otro-adulto" | "hijo";
    name: string;
    sex: Sex;
    age: number;
    occupation?: string;
    annualIncome?: number;
    health?: number;
    alive?: boolean;
}

export interface HouseholdBudget {
    annualIncome: number;
    annualExpenses: number;
    housingCost: number;
    foodCost: number;
    educationCost: number;
    healthCost: number;
    otherCost: number;
    taxes: number;
    disposableIncome: number;
    savings: number;
    debt: number;
    assets: number;
}

export interface HouseholdState {
    version: 2;
    structure: HouseholdStructure;
    structureLabel: string;
    housingTenure: HousingTenure;
    budget: HouseholdBudget;
    /** Miembros adicionales del hogar, como una co-esposa o abuelos. */
    additionalMembers: HouseholdMember[];
    religion: string;
    religiosity: number;
    context: {
        marriageSystem: "monogamia-legal" | "monogamia" | "poligamia-legal" | "poligamia-consuetudinaria" | "poligamia-restringida";
        polygynyLegal: boolean;
        genderWageGapPct: number;
        femaleLaborParticipationPct: number;
        source: string;
        provisional: boolean;
    };
    support: {
        /** 0–100: disposición y capacidad de ayudar económicamente. */
        level: number;
        annualSupport: number;
        canLend: boolean;
        maxLoan: number;
    };
    funeralCostEstimate: number;
    inheritanceEstimate: number;
}

export interface Relative {
    id: string;
    role: "mother" | "father" | "sibling" | "child" | "partner" | "grandmother" | "grandfather";
    name: string;
    sex: Sex;
    bornYear: number;
    occupation: string;
    alive: boolean;
    deathAge?: number;
    causeOfDeath?: string;
    /** Salud propia del familiar; nunca se copia la del jugador. */
    health?: number;
    annualIncome?: number;
    relationshipQuality?: number;
    /** Padres ausentes del hogar siguen existiendo como vínculo. */
    inHousehold?: boolean;
    /** El funeral ya se pagó y no debe volver a contabilizarse. */
    funeralSettled?: boolean;
    /** Parentesco con nietos y mascotas, para la escena familiar. */
    parentId?: string;
    school?: { kind: "public" | "private" | "vocational" | "university" | "family-business"; annualFee: number; untilAge: number; name: string };
    milestones?: string[];
    generation?: "child" | "grandchild";
}

/** Un animal del hogar. La salud y la edad evolucionan con los años. */
export interface PetState {
    kind?: string;
    id: string;
    name: string;
    species: "perro" | "gato" | "otro";
    age: number;
    health: number;
    alive: boolean;
}

export interface Companion { birth: BirthProfile; alive: boolean; age: number; deathAge?: number; causeOfDeath?: string; }
export interface LifeStory {
    focus: LifeFocus;
    relatives: Relative[];
    companions: Companion[];
    temperament: string;
    gift: string;
    /** Evita duplicar herencias y gastos funerarios en partidas guardadas. */
    familySettled?: boolean;
    lastFamilyEventAge?: number;
    lastGrandchildAge?: number;
}

export interface PsychologyState {
    resilience: number;
    selfEsteem: number;
    stress: number;
    grief: number;
    burnout: number;
    lifeSatisfaction: number;
}

export interface CreditState {
    score: number;
    missedPayments: number;
    bankruptcies: number;
    /** Año de la última quiebra, para aplicar un periodo de espera. */
    lastBankruptcyYear?: number;
}

export interface LoanState {
    id: string;
    lender: "banco" | "familia" | "empresa";
    label: string;
    principal: number;
    balance: number;
    annualInterestRate: number;
    originYear: number;
    active: boolean;
    /** Pariente acreedor, cuando el préstamo procede de la familia. */
    creditorRelativeId?: string;
    creditorRelativeName?: string;
}

export type FuneralChoice = "intima" | "grande" | "sin_ceremonia";

/** Gasto funeral pendiente de una decisión del jugador. */
export interface PendingFuneral {
    id: string;
    relativeId: string;
    relativeName: string;
    relationship: string;
    year: number;
    baseCost: number;
}

export type BusinessKind = "estudio-musica" | "clinica" | "tecnologia" | "comercio" | "taller" | "gastronomia";

export interface BusinessState {
    demandModifier?: number;
    operatingCostAdjustment?: number;
    activity?: "local" | "exportacion";
    segment?: string;
    trade?: { destination: "PER" | "ITA"; insured: boolean; advancePct: number; diversified: boolean; qualityControl: boolean; fxBuffer: boolean; shipments: number; lastResult: string };
    id: string;
    name: string;
    kind: BusinessKind;
    foundedAge: number;
    capital: number;
    annualRevenue: number;
    annualCosts: number;
    marketingSpend: number;
    reputation: number;
    employees: number;
    active: boolean;
    insolventYears: number;
}

export interface GameConfig {
    storyMode?: boolean;
    monthlyMode?: boolean;
    era: Era;
    countryMode: CountryMode;
    fixedCountry?: string;
    fixedYear?: number;
    maxAge: 60 | 85 | 105;
    difficulty: Difficulty;
    autoDecisions: boolean;
    decisionTimerSeconds: number;
    speed: GameSpeed;
    scoringWeights: ScoreWeights;
    content: ContentOptions;
}

export interface ScoreCategoryResult {
    key: ScoreCategoryKey;
    label: string;
    value: number;
    weight: number;
    contribution: number;
    detail: string;
}

export interface ScoreBreakdown {
    total: number;
    categories: Record<ScoreCategoryKey, number>;
    weighted: number;
    wellbeingGate: number;
    weights: ScoreWeights;
    details: ScoreCategoryResult[];
    notes: string[];
}

export interface CoreStats {
    health: number;
    happiness: number;
    knowledge: number;
    relationships: number;
}

export interface Transaction {
    moneyDelta?: number;
    month?: number;
    id: string;
    year: number;
    age: number;
    type: TransactionType;
    label: string;
    /** Importe con signo en dólares internacionales (PPP). */
    amount: number;
    /** Variación de deuda asociada al movimiento (positiva si aumenta). */
    debtDelta?: number;
    balanceAfter: number;
    debtAfter: number;
}

export interface FinanceState {
    transactionSequence?: number;
    /** Saldo en dólares internacionales (PPP). */
    money: number;
    annualIncome: number;
    annualExpenses: number;
    debt: number;
    ledger: Transaction[];
}

export interface MonthlyStatement {
    incomeItems?: { label: string; amount: number }[];
    unpaid?: number;
    items?: { label: string; amount: number; financed?: boolean }[];
    month: number;
    income: number;
    taxes: number;
    housing: number;
    food: number;
    utilities: number;
    transport: number;
    health: number;
    education: number;
    other: number;
    debtPayment: number;
    balance: number;
    debt: number;
    note?: string;
}

export interface MedicalRecord {
    age: number;
    year: number;
    condition: string;
    severity: "leve" | "moderada" | "grave";
    note: string;
}

export interface Milestone {
    id: string;
    age: number;
    year: number;
    title: string;
    category: DecisionCategory | EventCategory | "vida";
}

export interface DelayedEffect {
    id: string;
    appliesAtAge: number;
    sourceDecisionId: string;
    narrative: string;
    stats?: Partial<CoreStats>;
    psychology?: Partial<PsychologyState>;
    incomeModifierDelta?: number;
    expenseModifierDelta?: number;
    education?: EducationLevel;
    employment?: EmploymentStatus;
    occupation?: string;
    occupationId?: string;
    sector?: string;
    contractQuality?: number;
    milestone?: string;
    housingDelta?: number;
    healthPlan?: "ninguno" | "basico" | "premium";
    childrenDelta?: number;
    grandchildrenDelta?: number;
    moneyDelta?: number;
    incomeDeltaPct?: number;
    healthRiskDelta?: number;
    chronicCondition?: string;
    flags?: string[];
    clearFlags?: string[];
}

export interface BirthDetails {
    registrationId?: string;
    religion?: string;
    month: number;
    rural: boolean;
    mother: ParentDetails;
    father: ParentDetails;
    siblings: { name: string; age: number; sex: Sex }[];
    housing: string;
    annualHouseholdIncome: number;
    birthShare: number;
    /** Modelo de hogar v2. Opcional para poder abrir partidas antiguas. */
    household?: HouseholdState;
    country: { region: string; populationMillions: number; birthsThousands: number; infantMortalityPer1000: number; gdpPerCapitaPpp: number; gini: number; meanYearsSchooling: number; urbanShare: number };
}

export interface FamilyBackground {
    tier: 1 | 2 | 3 | 4 | 5;
    label: string;
    wealthLevel: number;
    parentEducation: EducationLevel;
    householdSize: number;
    story: string;
}

export interface BirthProfile {
    /** Optional for compatibility with previously saved lives. */
    details?: BirthDetails;
    countryCode: string;
    countryName: string;
    year: number;
    era: Era;
    sex: Sex;
    givenName: string;
    surname: string;
    location: string;
    family: FamilyBackground;
    initialStats: CoreStats;
    currencyCode: string;
    currencySymbol: string;
    localPerIntlDollar: number;
    lifeExpectancyAtBirth: number;
    lifeExpectancySource: string;
}

export interface EconomyState {
    costOfLivingIndex: number;
    unemploymentRate: number;
    phase: "expansion" | "estable" | "recesion" | "crisis";
    inflationRate: number;
}

export interface EmploymentState {
    pensionAnnual?: number;
    status: EmploymentStatus;
    occupation: string | null;
    sector: string | null;
    yearsInRole: number;
    contractQuality: number;
    occupationId?: string | null;
}

export interface ResidenceRecord {
    country: string;
    city: string;
    fromYear: number;
    toYear?: number;
    reason?: string;
}

export interface CurrencyInfo {
    code: string;
    symbol: string;
    localPerIntlDollar: number;
}

export interface OwnedAsset { country?: string; location?: string; loanBalance?: number; loanRate?: number; monthlyPayment?: number; missedPayments?: number; id: string; kind: "home" | "car" | "bicycle" | "phone" | "equipment" | "investment"; name: string; value: number; purchasedYear: number; }
export interface LiveEconomy { month: number; statements: MonthlyStatement[]; unpaid: number; interest: number; }
export interface ManualPurchase { action: string; idempotencyKey: string; amount?: number; quantity?: number; name?: string; assetId?: string; targetId?: string; }
export interface SpendingOption {
    timeHours?: number;
    availableHours?: number;
    reference?: { label: string; url: string }; id: string; label: string; category: "bienestar" | "educacion" | "familia" | "animales" | "patrimonio" | "empresa" | "finanzas"; description: string; price: number; maintenance: number; blocked?: string;
}
export interface CharacterState {
    lifeInsurance?: { expiresMonth: number; benefit: number; paidPremium: number };
    liveEconomy?: LiveEconomy;
    visitedCountries?: string[];
    unpaidBills?: number;
    educationPlan?: { paused?: boolean; programId: string; institution: string; title: string; field: string; monthsLeft: number; annualFee: number; scholarshipPct: number; source: string; reference: string };
    partnerProfile?: { country: string; annualIncome: number; metAt: string; sinceYear: number; bornYear?: number; sharedHousehold: boolean };
    childSupport?: { annualAmount: number; untilYear: number; birthYears?: number[] };
    familyPlans?: { id: string; dueYear: number; dueMonth: number; name: string; sex: Sex }[];
    assets?: OwnedAsset[];
    manualActions?: { year: number; month: number; text: string; action?: string; hours?: number }[];
    actionKeys?: Record<string, string>;
    actionCooldowns?: Record<string, number>;
    story?: LifeStory;
    id: string;
    slot: PlayerSlot;
    alias: string;
    sex: Sex;
    birthCountry: string;
    currentCountry: string;
    countriesLived: string[];
    currentCurrency: CurrencyInfo;
    currentLocation: string;
    /** Trayectoria de residencia; opcional en partidas anteriores. */
    residenceHistory?: ResidenceRecord[];
    age: number;
    stats: CoreStats;
    finance: FinanceState;
    educationLevel: EducationLevel;
    educationYears: number;
    employment: EmploymentState;
    maritalStatus: MaritalStatus;
    partnerName: string | null;
    children: number;
    housingQuality: number;
    livingStandard: number;
    chronicConditions: string[];
    medicalHistory: MedicalRecord[];
    milestones: Milestone[];
    pendingEffects: DelayedEffect[];
    mortalityRisk: number;
    alive: boolean;
    causeOfDeath: string | null;
    ageAtDeath: number | null;
    usedDecisionIds: string[];
    /** Edad de la última aparición de cada decisión, para cooldowns y variedad. */
    lastDecisionAges?: Record<string, number>;
    grandchildren?: number;
    pets?: PetState[];
    incomeModifier: number;
    expenseModifier: number;
    healthPlan: "ninguno" | "basico" | "premium";
    yearlyChoices: number;
    /** Campos del modelo v2; opcionales para conservar partidas antiguas. */
    flags?: string[];
    psychology?: PsychologyState;
    credit?: CreditState;
    loans?: LoanState[];
    business?: BusinessState | null;
    /** Funerales que esperan una decisión; nunca se cobran automáticamente. */
    pendingFunerals?: PendingFuneral[];
}

export interface SharedEventRecord {
    eventId: string;
    category: EventCategory;
    title: string;
    narrative: string;
    severity: 1 | 2 | 3;
    effectsSummary: string[];
    icon: string;
    decisionId?: string;
    dataRefs?: string[];
}

export type RiskLevel = "bajo" | "medio" | "alto";

export interface DecisionOptionView {
    recurringCost?: number;
    id: string;
    label: string;
    description: string;
    cost: number | null;
    successChance: number | null;
    risk: RiskLevel | null;
    requiresNote: string | null;
    /** Consecuencias visibles y breves para decidir sin leer párrafos. */
    impact?: string[];
}

export interface DecisionPrompt {
    id: string;
    source: "vida" | "evento";
    category: DecisionCategory;
    title: string;
    description: string;
    age: number;
    eventId?: string;
    /** Por qué esta pregunta aparece en este país, familia o etapa. */
    contextNote?: string;
    options: DecisionOptionView[];
}

export interface DecisionChoice {
    decisionId: string;
    optionId: string;
    idempotencyKey: string;
    submittedAt: string;
}

export interface TurnPlayerRecord {
    slot: PlayerSlot;
    alias: string;
    decisionId: string;
    decisionTitle: string;
    /** Categoría de la decisión; puede faltar en partidas antiguas exportadas. */
    decisionCategory?: DecisionCategory | null;
    optionId: string;
    optionLabel: string;
    success: boolean | null;
    chance: number | null;
    roll: number | null;
    narrative: string[];
    statDelta: Partial<CoreStats>;
    economic: {
        income: number;
        expenses: number;
        net: number;
        balance: number;
        debt: number;
    };
    milestones: string[];
    /** Extracto mensual del año; opcional en partidas antiguas. */
    bank?: MonthlyStatement[];
    death: { age: number; cause: string } | null;
    scoreAfter: number;
}

export interface TurnRecord {
    turn: number;
    age: number;
    year: number;
    sharedEvents: SharedEventRecord[];
    players: Partial<Record<PlayerSlot, TurnPlayerRecord>>;
    resolvedAt: string;
}

export type LifeMomentKind = "nacimiento" | "mundo" | "decision" | "diario" | "hito" | "salud" | "migracion" | "final";

/** Una escena legible del relato de una vida. El servidor la construye y la filtra por privacidad. */
export interface LifeMoment {
    id: string;
    kind: LifeMomentKind;
    year: number;
    age: number;
    month?: number;
    slot?: PlayerSlot;
    alias?: string;
    title: string;
    text: string;
    place?: string;
    category?: string;
    decision?: {
        id: string;
        optionId: string;
        optionLabel: string;
        success: boolean | null;
        chance: number | null;
        roll: number | null;
    };
    effects?: string[];
}


export interface FinalPlayerResult {
    familyInsuranceBenefit?: number;
    slot: PlayerSlot;
    alias: string;
    givenName: string;
    birthCountry: string;
    countriesLived: string[];
    ageAtDeath: number;
    causeOfDeath: string | null;
    education: EducationLevel;
    occupation: string | null;
    finalStats: CoreStats;
    finance: FinanceState;
    children: number;
    maritalStatus: MaritalStatus;
    milestoneTitles: string[];
    difficulties: string[];
    score: ScoreBreakdown;
    scoreHistory: { age: number; score: number }[];
    lifeSummary: string;
    /** Contexto del modelo v2; opcional para conservar resultados antiguos. */
    psychology?: PsychologyState;
    business?: BusinessState | null;
    household?: HouseholdState;
    flags?: string[];
    loanBalance?: number;
    finalMood?: string;
}

export interface FinalResult {
    finishedAt: string;
    players: Partial<Record<PlayerSlot, FinalPlayerResult>>;
    winner: PlayerSlot | "tie" | null;
    margin: number;
    reason: string;
    categoryWinners: Partial<Record<ScoreCategoryKey, PlayerSlot | "tie">>;
}

export interface GameClock {
    speed: GameSpeed;
    autoDecisions: boolean;
    decisionTimerSeconds: number;
    paused: boolean;
    deadlineAt: string | null;
}

export interface WorldView {
    currentYear: number;
    age: number;
    economy: EconomyState;
    birth: BirthProfile;
    seedFingerprint: string;
    currentEvents: SharedEventRecord[];
}

export interface PlayerView {
    slot: PlayerSlot;
    alias: string;
    connected: boolean;
    ready: boolean;
    left: boolean;
    isMe: boolean;
    character: CharacterState;
    score: ScoreBreakdown;
    hasSubmitted: boolean;
    ownChoice: DecisionChoice | null;
    lastTurn: TurnPlayerRecord | null;
    aiNarrative: string | null;
}

export interface ScorePoint {
    age: number;
    players: Partial<Record<PlayerSlot, number>>;
}

export interface GameView {
    id: string;
    mode: GameMode;
    status: GameStatus;
    roomCode: string | null;
    config: GameConfig;
    clock: GameClock;
    createdAt: string;
    updatedAt: string;
    turn: {
        number: number;
        month?: number;
        age: number;
        year: number;
        prompt: DecisionPrompt | null;
        sharedEvents: SharedEventRecord[];
        waitingFor: PlayerSlot[];
        deadlineAt: string | null;
    };
    world: WorldView;
    me: PlayerView;
    opponent: PlayerView | null;
    lastResolution: TurnRecord | null;
    scoreHistory: ScorePoint[];
    final: FinalResult | null;
    canRematch: boolean;
    /** En duelo solo el anfitrión puede cambiar el modo automático. */
    canControlAuto: boolean;
}

export interface RoomJoinPreview {
    code: string;
    hostAlias: string;
    status: RoomStatus;
    birthSummary: {
        countryName: string;
        year: number;
        sex: Sex;
        givenName: string;
        familyLabel: string;
    };
    config: GameConfig;
    expiresInHours: number;
}

export interface LobbyPlayer {
    slot: PlayerSlot;
    alias: string;
    connected: boolean;
    ready: boolean;
    left: boolean;
}

export interface LobbyView {
    id: string;
    code: string;
    status: RoomStatus;
    hostSlot: PlayerSlot;
    players: LobbyPlayer[];
    config: GameConfig;
    meSlot: PlayerSlot;
    birthSummary: RoomJoinPreview["birthSummary"];
    canStart: boolean;
    createdAt: string;
    updatedAt: string;
    gameId: string;
}

export interface GameSummary {
    id: string;
    mode: GameMode;
    status: RoomStatus;
    roomCode: string | null;
    alias: string;
    age: number;
    countryName: string;
    givenName: string;
    score: number;
    updatedAt: string;
    winner: string | null;
    alive: boolean;
    canResume: boolean;
}

export interface AuthSession {
    playerId: string;
    token: string;
    alias: string | null;
    expiresAt: string;
}

export interface OccupationProfile {
    id: string;
    label: string;
    sector: string;
    minEducation: EducationLevel;
    salaryIndex: number;
    formality: number;
    risk: number;
    tiers: number[];
}

export interface CountryContext {
    countryCode: string;
    femaleLaborParticipationPct: number;
    genderWageGapPct: number;
    marriageSystem: "monogamia-legal" | "monogamia" | "poligamia-legal" | "poligamia-consuetudinaria" | "poligamia-restringida";
    polygynyLegal: boolean;
    religionShares: Record<string, number>;
    religiosity: number;
    /** Origen y advertencia del contexto. */
    contextSource?: string;
    provisional: boolean;
}

export interface CountryOption {
    gdpPerCapitaPpp?: number;
    meanYearsSchooling?: number;
    infantMortalityPer1000?: number;
    code: string;
    name: string;
    region: string;
    lifeExpectancy: { female: number; male: number };
    incomeGroup: "alto" | "medio-alto" | "medio-bajo" | "bajo";
    currencyCode: string;
}

export interface DemographicsMeta {
    datasetVersion: string;
    retrievedAt: string;
    sources: {
        id: string;
        name: string;
        url: string;
        license: string;
        accessed: string;
    }[];
    countries: CountryOption[];
    notes: string[];
}

export interface ApiErrorBody {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface DecisionSubmittedResponse {
    accepted: boolean;
    duplicate: boolean;
    waitingFor: PlayerSlot[];
    turnResolved: boolean;
    game: GameView;
}

export interface AdvanceGameResponse {
    game: GameView;
}

export interface NarrativeResponse {
    text: string;
    source: "deepseek" | "local";
    notice?: string;
}

export type MobilityPurpose = "study" | "work" | "live";
export type MobilityFamilyMode = "solo" | "partner" | "family";

export interface MobilityCostLine {
    concept: string;
    amount: number;
    note?: string;
}

export interface MobilityFamilyCost {
    mode: MobilityFamilyMode;
    label: string;
    total: number;
    localTotal: number;
    extraPeople: number;
    lines: MobilityCostLine[];
    blockedReason?: string;
}

export interface MobilityOffer {
    id: string;
    countryCode: string;
    countryName: string;
    city: string;
    purpose: MobilityPurpose;
    purposeLabel: string;
    currency: { code: string; symbol: string; localPerIntlDollar: number };
    flight: number;
    visa: number;
    insurance: number;
    deposit: number;
    installation: number;
    tuition: number;
    monthlyLiving: number;
    successChance: number;
    requirements: string[];
    warnings: string[];
    eligible: boolean;
    blockedReason?: string;
    familyCosts: MobilityFamilyCost[];
}

export interface MobilityResponse {
    currentCountry: string;
    currentLocation: string;
    money: number;
    offers: MobilityOffer[];
}

export interface MobilityRequest {
    optionId: string;
    familyMode: MobilityFamilyMode;
    idempotencyKey: string;
}


export interface HistoryResponse {
    moments: LifeMoment[];
    gameId: string;
    mode: GameMode;
    alias: string;
    turns: TurnRecord[];
    total: number;
    totalMoments: number;
    categories: string[];
    playerSlots: PlayerSlot[];
    final: FinalResult | null;
}

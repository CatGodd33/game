import type {
    CharacterState,
    CoreStatKey,
    DecisionCategory,
    DecisionPrompt,
    EducationLevel,
    EmploymentStatus,
    MaritalStatus,
    ContentSeverity,
    BusinessKind,
    PsychologyState,
} from "@life-duel/shared";
import type { BirthProfile } from "@life-duel/shared";

export type CheckType = "educacion" | "trabajo" | "salud" | "social" | "riesgo" | "ninguna";

export interface CostRule {
    fixed?: number;
    shareOfAnnualIncome?: number;
    shareOfGdp?: number;
    shareOfEssentials?: number;
    /** Si se indica, el coste se calcula con el modelo de visado/mudanza del destino. */
    destinationCountry?: string;
}

export interface Requirements {
    minAge?: number;
    maxAge?: number;
    minEducation?: EducationLevel;
    maxEducation?: EducationLevel;
    employment?: EmploymentStatus[];
    hasPartner?: boolean;
    maritalStatus?: MaritalStatus[];
    childrenMin?: number;
    adultChildrenMin?: number;
    childrenMax?: number;
    grandchildrenMin?: number;
    parentsAlive?: boolean;
    relativeRoleAlive?: "mother" | "father" | "sibling";
    maxRelativeHealth?: number;
    hasPet?: boolean;
    minMoney?: number;
    minIncome?: number;
    minDebt?: number;
    maxDebt?: number;
    minHealth?: number;
    maxHealth?: number;
    maxHappiness?: number;
    incomeGroup?: ("alto" | "medio-alto" | "medio-bajo" | "bajo")[];
    notCountry?: string[];
    country?: string[];
    severity?: ContentSeverity;
    flagsAll?: string[];
    flagsAny?: string[];
    flagsNone?: string[];
    hasBusiness?: boolean;
    businessKind?: BusinessKind[];
    /** Contexto social del nacimiento. No determinan el destino: filtran oportunidades. */
    sex?: ("female" | "male")[];
    familyTierMin?: number;
    familyTierMax?: number;
    householdStructure?: ("nuclear" | "monoparental" | "extendida" | "compuesta")[];
    religionAny?: string[];
    rural?: boolean;
    migrated?: boolean;
    minLivingStandard?: number;
    maxLivingStandard?: number;
}

export interface BusinessStartSpec {
    kind: BusinessKind;
    name?: string;
    capital?: number;
}

export interface BusinessChangeSpec {
    marketingSpendDelta?: number;
    reputationDelta?: number;
    costDelta?: number;
    employeesDelta?: number;
    /** Variación relativa de los ingresos del negocio (0.15 = +15 %). */
    revenueDeltaPct?: number;
}

export interface LoanSpec {
    amountRule: CostRule;
    lender: "banco" | "familia" | "empresa";
    label: string;
    annualInterestRate?: number;
    /** Pariente concreto que presta el dinero, si procede. */
    creditorRelativeId?: string;
    creditorRelativeName?: string;
}

export interface FutureEffect {
    inYears: number;
    narrative: string;
    stats?: Partial<Record<CoreStatKey, number>>;
    psychology?: Partial<PsychologyState>;
    incomeModifierDelta?: number;
    expenseModifierDelta?: number;
    moneyDelta?: number;
    education?: EducationLevel;
    employment?: EmploymentStatus;
    occupation?: string;
    occupationId?: string;
    sector?: string;
    contractQuality?: number;
    milestone?: string;
    chronicCondition?: string;
    healthPlan?: "ninguno" | "basico" | "premium";
    housingDelta?: number;
    childrenDelta?: number;
    grandchildrenDelta?: number;
    flags?: string[];
    clearFlags?: string[];
}

export interface OutcomeEffect {
    businessFocus?: { label: string; activity: "local" | "exportacion" };
    childPlan?: { kind: "public" | "private" | "vocational" | "university" | "family-business"; feeGdp: number; untilAge: number; name: string };
    exportRoute?: "PER" | "ITA";
    tradeChange?: { insured?: boolean; advancePct?: number; qualityControl?: boolean; diversified?: boolean; fxBuffer?: boolean };
    studyProgram?: string;
    relativeChange?: { role: "mother" | "father" | "sibling"; healthDelta?: number; relationshipDelta?: number };
    temperament?: string;
    narrative: string;
    stats?: Partial<Record<CoreStatKey, number>>;
    psychology?: Partial<PsychologyState>;
    moneyDelta?: number;
    debtDelta?: number;
    incomeModifierDelta?: number;
    expenseModifierDelta?: number;
    education?: EducationLevel;
    employment?: EmploymentStatus;
    occupation?: string;
    occupationId?: string;
    sector?: string;
    contractQuality?: number;
    maritalStatus?: MaritalStatus;
    setPartner?: boolean;
    relationshipContext?: "university" | "work" | "online" | "community";
    partnerCountry?: string;
    shareHousehold?: boolean;
    clearPartner?: boolean;
    childrenDelta?: number;
    grandchildrenDelta?: number;
    housingDelta?: number;
    healthPlan?: "ninguno" | "basico" | "premium";
    chronicCondition?: string;
    medical?: {
        condition: string;
        severity: "leve" | "moderada" | "grave";
        note: string;
    };
    milestone?: string;
    migrateTo?: { countryCode: string; location: string };
    /** Regresa al país y localidad de nacimiento sin fijar un destino artificial. */
    returnToBirthCountry?: boolean;
    /** Hipoteca: suma deuda sin añadir efectivo al saldo (el banco paga la vivienda). */
    mortgage?: { amountRule: CostRule; annualInterestRate: number; years: number; label: string };
    flags?: string[];
    clearFlags?: string[];
    creditDelta?: number;
    businessStart?: BusinessStartSpec;
    businessChange?: BusinessChangeSpec;
    /** Cierra o vende el negocio activo. */
    endBusiness?: { reason: string; salePrice?: number };
    /** Crea una mascota con nombre y especie indicados por la decisión. */
    pet?: { name: string; species: "perro" | "gato" | "otro" };
    loan?: LoanSpec;
    schedule?: FutureEffect[];
}

export interface OptionCheck {
    type: CheckType;
    base: number;
}

export interface DecisionOptionDefinition {
    id: string;
    label: string;
    description: string;
    cost?: CostRule;
    requirements?: Requirements;
    check?: OptionCheck;
    outcomes: {
        success: OutcomeEffect;
        failure?: OutcomeEffect;
    };
}

export interface DecisionVariant {
    title: string;
    description: string;
    contextNote?: string;
    optionLabels?: Record<string, string>;
    optionDescriptions?: Record<string, string>;
}

export interface DecisionDefinition {
    id: string;
    title: string;
    description: string;
    category: DecisionCategory;
    priority: "major" | "focus" | "event" | "recovery";
    minAge: number;
    maxAge: number;
    once?: boolean;
    /** Explica en una frase por qué esta situación encaja con el contexto. */
    contextNote?: string;
    eventId?: string;
    requirements?: Requirements;
    /** Peso relativo dentro de su etapa; permite que el contexto cambie la frecuencia. */
    weight?: number;
    options: DecisionOptionDefinition[];
    /** Variantes de redacción; no alteran opciones, efectos ni probabilidades. */
    variants?: DecisionVariant[];
    /** Años mínimos antes de que esta decisión vuelva a aparecer. */
    cooldownYears?: number;
    dataRefs?: string[];
}

export interface DecisionContext {
    character: CharacterState;
    birth: BirthProfile;
    worldSeed: string;
    turn: number;
    lastDecisionId: string | null;
    eventDecisionId: string | null;
    contentSeverity: ContentSeverity;
}

export interface SelectedDecision {
    definition: DecisionDefinition;
    source: "vida" | "evento";
}

export type PromptBuilder = (
    decision: DecisionDefinition,
    character: CharacterState,
) => DecisionPrompt;

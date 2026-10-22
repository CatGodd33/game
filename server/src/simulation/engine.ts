import { offerMonthlyOpportunity } from "./monthly-opportunities.js";
import { openExportRoute } from "./trade.js";
import { planParenthood } from "./parenthood.js";
import { monthlyInstallment, mortgageRate } from "./mortgage.js";
import { UNIVERSITY_PROGRAMS, enrollUniversity } from "./education.js";
import { CAREER_OPENINGS } from "./career-scenarios.js";
import { personalize } from "./personalization.js";
import { OPENING_DECISIONS } from "./openings.js";
import { parentingBlocked } from "./household-care.js";
import type {
    CharacterState,
    DecisionChoice,
    DecisionPrompt,
    GameConfig,
    PlayerSlot,
    ScoreBreakdown,
    TurnPlayerRecord,
    TurnRecord,
} from "@life-duel/shared";
import {
    clamp,
    DECISION_CATEGORY_META,
    EDUCATION_META,
    SCORE_TIE_THRESHOLD,
    ROOM_EXPIRY_HOURS,
} from "@life-duel/shared";
import { randomUUID } from "node:crypto";
import { getCountry, loadDemographics } from "../demographics/dataset.js";
import { Errors } from "../errors.js";
import { economyModel } from "./models.js";
import { createBirth } from "./birth.js";
import {
    adjustDebt,
    applyStatDelta,
    borrow,
    canAfford,
    computeLivingStandard,
    incomeTax,
    grant,
    migrate,
    runAnnualEconomy,
    spend,
    type AnnualEconomyResult,
} from "./economy.js";
import { annualMortalityRisk, applyHealthDecline, rollDeath } from "./mortality.js";
import { advanceBusiness, applyBusinessChange, endBusiness, startBusiness } from "./business.js";
import { advancePets, createPet } from "./pets.js";
import { advancePsychology, applyPsychologyDelta, createPsychology } from "./psychology.js";
import { ensureCredit, takeLoan, updateCredit } from "./loans.js";
import { resolveCostRule, resolveDecisionOption } from "./decision-selector.js";
import {
    buildPrompt,
    optionAvailable,
    optionCost,
    selectDecision,
    decisionEligible,
    successChance,
} from "./decision-selector.js";
import { getDecision } from "./decisions.js";
import type { DecisionDefinition, FutureEffect, OutcomeEffect } from "./decision-types.js";
import {
    applyWorldEffects,
    getEvent,
    selectSharedEvents,
    toEventRecord,
} from "./events.js";
import { chooseAutoOption } from "./auto-policy.js";
import {
    compareScores,
    computeScore,
    snapshotFromCharacter,
    type LifeSnapshot,
} from "./scoring.js";
import {
    createRng,
    createWorldSeed,
    deriveSeed,
    deterministicRoll,
    seedFingerprint,
} from "./rng.js";
import type { PendingTurn, StoredGame, StoredPlayer } from "../types/records.js";

import { createStory, storyYear } from "./story.js";

import { settleMonth, closedMonthlyEconomy } from "./monthly.js";

export const ENGINE_VERSION = "1.0.0";

function nowIso(): string {
    return new Date().toISOString();
}

function addHours(date: Date, hours: number): string {
    return new Date(date.getTime() + hours * 3600_000).toISOString();
}

function touch(game: StoredGame): void {
    game.updatedAt = nowIso();
}

export function newGameId(): string {
    return randomUUID();
}

function baseScore(
    game: StoredGame,
    character: CharacterState,
    snapshots: LifeSnapshot[],
): ScoreBreakdown {
    const birthCountry = getCountry(game.birth.countryCode);
    return computeScore({
        character,
        weights: game.config.scoringWeights,
        snapshots,
        lifeExpectancyAtBirth: game.birth.lifeExpectancyAtBirth,
        gdpPerCapitaPpp: birthCountry.gdpPerCapitaPpp,
    });
}

function initialEconomy(code: string) {
    const country = getCountry(code);
    return {
        costOfLivingIndex: 1,
        unemploymentRate: country.unemploymentRate,
        phase: "estable" as const,
        inflationRate: 2,
    };
}

function makeGameShell(options: {
    id: string;
    mode: "solo" | "duel";
    code: string | null;
    config: GameConfig;
    seed?: string;
}): StoredGame {
    const seed = options.seed ?? createWorldSeed();
    const birth = createBirth(seed, options.config);
    const created = new Date();
    const dataset = loadDemographics();
    return {
        id: options.id,
        mode: options.mode,
        code: options.code,
        status: options.mode === "solo" ? "playing" : "waiting",
        hostSlot: 1,
        config: structuredClone({ ...options.config, monthlyMode: options.mode === "solo" && options.config.monthlyMode }),
        seed,
        seedFingerprint: seedFingerprint(seed),
        birth,
        economy: initialEconomy(birth.countryCode),
        currentYear: birth.year,
        age: 0,
        turnNumber: 0,
        createdAt: created.toISOString(),
        updatedAt: created.toISOString(),
        finishedAt: null,
        clock: {
            speed: options.config.speed,
            autoDecisions: options.config.autoDecisions,
            decisionTimerSeconds: options.config.decisionTimerSeconds,
            paused: false,
            deadlineAt: null,
        },
        autoVotes: {},
        players: [],
        pending: null,
        history: [],
        scoreHistory: [],
        final: null,
        idempotency: {},
        world: {
            usedEventIds: [],
            lastEventAges: {},
            turnsSinceEvent: 0,
        },
        inviteExpiresAt: addHours(created, ROOM_EXPIRY_HOURS),
        rematchOf: null,
        meta: {
            engineVersion: ENGINE_VERSION,
            datasetVersion: dataset.datasetVersion,
            provisionalModels: ["mortality-model.json", "economy-model.json", "realism-model.json"],
        },
    };
}

function initialCharacter(
    game: StoredGame,
    playerId: string,
    slot: PlayerSlot,
    alias: string,
): CharacterState {
    const country = getCountry(game.birth.countryCode);
    const model = economyModel();
    const tier = game.birth.family.tier;
    const support = game.birth.details?.household?.support.annualSupport ?? model.family.parentSupportByTier[String(tier)] ?? 0;
    const supportLevel = game.birth.details?.household?.support.level ?? 50;
    const housing = model.family.housingQualityByTier[String(tier)] ?? 40;
    const character: CharacterState = {
        id: `char-${game.id.slice(0, 8)}-${slot}`,
        slot,
        alias,
        sex: game.birth.sex,
        birthCountry: game.birth.countryCode,
        currentCountry: game.birth.countryCode,
        countriesLived: [game.birth.countryCode],
        currentCurrency: {
            code: game.birth.currencyCode,
            symbol: game.birth.currencySymbol,
            localPerIntlDollar: game.birth.localPerIntlDollar,
        },
        currentLocation: game.birth.location,
        residenceHistory: [
            { country: game.birth.countryCode, city: game.birth.location, fromYear: game.birth.year },
        ],
        age: 0,
        stats: { ...game.birth.initialStats },
        finance: {
            money: 0,
            annualIncome: support,
            annualExpenses: 0,
            debt: 0,
            ledger: [],
        },
        educationLevel: "none",
        educationYears: 0,
        employment: {
            status: "child",
            occupation: null,
            sector: null,
            yearsInRole: 0,
            contractQuality: 50,
            occupationId: null,
        },
        maritalStatus: "single",
        partnerName: null,
        children: 0,
        housingQuality: housing,
        livingStandard: 20,
        chronicConditions: [],
        medicalHistory: [],
        milestones: [],
        pendingEffects: [],
        mortalityRisk: 0,
        alive: true,
        causeOfDeath: null,
        ageAtDeath: null,
        usedDecisionIds: [],
        lastDecisionAges: {},
        grandchildren: 0,
        pets: [],
        incomeModifier: 1,
        expenseModifier: 1,
        healthPlan: country.derived.healthcareAccess >= 80 ? "basico" : "ninguno",
        yearlyChoices: 0,
    };

    character.flags = [];
    if (game.birth.details?.household?.support.canLend) character.flags.push("familia_puede_ayudar");
    character.loans = [];
    character.business = null;
    ensureCredit(character);
    character.psychology = createPsychology(character, tier, supportLevel);

    character.milestones.push({
        id: `birth-${character.id}`,
        age: 0,
        year: game.birth.year,
        title: `Nacimiento en ${game.birth.countryName}`,
        category: "vida",
    });
    character.livingStandard = computeLivingStandard(character);
    character.mortalityRisk =
        Math.round(annualMortalityRisk(character, game.config.difficulty) * 10000) / 100;
    return character;
}

function makeStoredPlayer(
    playerId: string,
    slot: PlayerSlot,
    alias: string,
    character: CharacterState | null,
): StoredPlayer {
    const now = nowIso();
    return {
        playerId,
        character,
        slot,
        alias,
        ready: false,
        left: false,
        joinedAt: now,
        lastSeenAt: now,
        decisions: [],
        snapshots: [],
        scoreHistory: [],
        score: null,
        lastTurn: null,
        aiNarrative: null,
        aiNarrativeSource: null,
    };
}

function addMilestone(
    character: CharacterState,
    title: string,
    category: DecisionDefinition["category"] | "vida" | "economia",
    year: number,
): void {
    if (character.milestones.some((milestone) => milestone.title === title)) return;
    character.milestones.push({
        id: `ms-${character.id}-${character.milestones.length + 1}`,
        age: character.age,
        year,
        title,
        category,
    });
}

function addMedicalRecord(
    character: CharacterState,
    year: number,
    condition: string,
    severity: "leve" | "moderada" | "grave",
    note: string,
): void {
    character.medicalHistory.push({ age: character.age, year, condition, severity, note });
}

function partnerName(game: StoredGame, character: CharacterState): string {
    const country = getCountry(character.currentCountry);
    const pool = character.sex === "female" ? country.names.male : country.names.female;
    const rng = createRng(deriveSeed(game.seed, "partner", character.id, character.age));
    return rng.pick(pool);
}

function clampModifiers(character: CharacterState): void {
    character.incomeModifier = Math.round(clamp(character.incomeModifier, 0.4, 3) * 1000) / 1000;
    character.expenseModifier = Math.round(clamp(character.expenseModifier, 0.3, 3) * 1000) / 1000;
}

function applySafeSpend(
    character: CharacterState,
    amount: number,
    label: string,
    year: number,
): void {
    if (amount <= 0) return;
    // La infancia no genera deuda propia: el hogar cubre el gasto.
    if (character.age < 18) return;
    if (canAfford(character, amount)) {
        spend(character, amount, label, year);
    } else {
        adjustDebt(character, amount, `${label} (impago convertido en deuda)`, year);
        character.stats.happiness = clamp(character.stats.happiness - 2);
    }
}

function applyFutureEffect(
    game: StoredGame,
    character: CharacterState,
    effect: FutureEffect,
    sourceDecisionId: string,
    index: number,
): void {
    character.pendingEffects.push({
        id: `delay-${character.id}-${character.age}-${index}-${sourceDecisionId}`,
        appliesAtAge: character.age + Math.max(1, effect.inYears),
        sourceDecisionId,
        narrative: effect.narrative,
        stats: effect.stats as CharacterState["stats"] | undefined,
        psychology: effect.psychology,
        moneyDelta: effect.moneyDelta,
        incomeModifierDelta: effect.incomeModifierDelta,
        expenseModifierDelta: effect.expenseModifierDelta,
        education: effect.education,
        employment: effect.employment,
        occupation: effect.occupation,
        occupationId: effect.occupationId,
        sector: effect.sector,
        contractQuality: effect.contractQuality,
        milestone: effect.milestone,
        chronicCondition: effect.chronicCondition,
        healthPlan: effect.healthPlan,
        housingDelta: effect.housingDelta,
        grandchildrenDelta: effect.grandchildrenDelta,
        childrenDelta: effect.childrenDelta,
        flags: effect.flags,
        clearFlags: effect.clearFlags,
    });
}

function applyOutcome(
    game: StoredGame,
    character: CharacterState,
    decision: DecisionDefinition,
    effect: OutcomeEffect,
    year: number,
): void {
    const label = decision.title;
    if (effect.stats) applyStatDelta(character.stats, effect.stats);
    if (effect.psychology) applyPsychologyDelta(character, effect.psychology);

    const debtDelta = effect.debtDelta ?? 0;
    const moneyDelta = effect.moneyDelta ?? 0;
    if (debtDelta > 0 && character.age >= 18) {
        if (moneyDelta > 0) {
            const loan = Math.min(debtDelta, moneyDelta);
            borrow(character, loan, `Préstamo: ${label}`, year);
            if (moneyDelta > loan) grant(character, moneyDelta - loan, label, year, "grant");
            if (debtDelta > loan) adjustDebt(character, debtDelta - loan, `Cargo: ${label}`, year);
        } else {
            adjustDebt(character, debtDelta, `Deuda: ${label}`, year);
        }
    } else {
        if (moneyDelta > 0) grant(character, moneyDelta, label, year, "grant");
        else if (moneyDelta < 0) applySafeSpend(character, Math.abs(moneyDelta), label, year);
        if (debtDelta < 0) adjustDebt(character, debtDelta, `Condonación: ${label}`, year);
    }

    if (effect.incomeModifierDelta) character.incomeModifier += effect.incomeModifierDelta;
    if (effect.expenseModifierDelta) character.expenseModifier += effect.expenseModifierDelta;
    clampModifiers(character);

    if (effect.education) {
        const currentRank = EDUCATION_META[character.educationLevel]?.rank ?? 0;
        const nextRank = EDUCATION_META[effect.education]?.rank ?? 0;
        if (nextRank >= currentRank) {
            character.educationLevel = effect.education;
            character.educationYears = Math.max(
                character.educationYears,
                EDUCATION_META[effect.education]?.years ?? character.educationYears,
            );
        }
    }

    if (effect.employment) {
        character.employment.status = effect.employment;
        if (effect.occupation) character.employment.occupation = effect.occupation;
        if (effect.occupationId !== undefined) character.employment.occupationId = effect.occupationId;
        if (effect.sector) character.employment.sector = effect.sector;
        if (effect.contractQuality !== undefined) {
            character.employment.contractQuality = clamp(effect.contractQuality, 0, 100);
        }
        if (effect.employment === "unemployed" || effect.employment === "retired") {
            character.employment.yearsInRole = 0;
        } else {
            character.employment.yearsInRole = 0;
        }
    } else if (effect.contractQuality !== undefined) {
        character.employment.contractQuality = clamp(effect.contractQuality, 0, 100);
    }

    if (effect.relativeChange) { const change = effect.relativeChange; const relative = character.story?.relatives.find(r => r.role === change.role && r.alive); if (relative) { relative.health = clamp((relative.health ?? 60) + (change.healthDelta ?? 0)); relative.relationshipQuality = clamp((relative.relationshipQuality ?? 55) + (change.relationshipDelta ?? 0)); } }
    if (effect.studyProgram) { const program = UNIVERSITY_PROGRAMS.find(p => p.id === effect.studyProgram); if (program) enrollUniversity(character, program, year); }
    if (effect.temperament && character.story) character.story.temperament = effect.temperament;
    if (effect.setPartner && !character.partnerName) {
        const origin = effect.partnerCountry ?? character.currentCountry;
        const country = getCountry(origin);
        const rng = createRng(deriveSeed(game.seed, "relationship", character.id, year));
        character.partnerName = rng.pick(character.sex === "female" ? country.names.male : country.names.female);
        character.flags = (character.flags ?? []).filter(f => f !== "pareja_internacional");
        if (origin !== character.currentCountry) character.flags = [...new Set([...(character.flags ?? []), "pareja_internacional"])];
        character.partnerProfile = { country: origin, annualIncome: Math.round(getCountry(character.currentCountry).gdpPerCapitaPpp * (rng.int(18, 42) / 100)), metAt: effect.relationshipContext ?? "community", sinceYear: year, bornYear: year - Math.max(18, character.age + rng.int(-3, 3)), sharedHousehold: false };
        if (!effect.maritalStatus && character.maritalStatus === "single") {
            character.maritalStatus = "dating";
        }
    }
    if (effect.shareHousehold || effect.maritalStatus === "married" || effect.milestone === "Primera convivencia") {
        if (character.partnerProfile) character.partnerProfile.sharedHousehold = true;
        for (const r of character.story?.relatives ?? []) if (r.role === "partner" && r.name === character.partnerName) r.inHousehold = true;
    }
    if (effect.clearPartner) {
        const minors = character.story?.relatives.filter(r => r.role === "child" && r.generation !== "grandchild" && r.alive && game.currentYear - r.bornYear < 18) ?? [];
        if (minors.length) character.childSupport = { annualAmount: getCountry(character.currentCountry).gdpPerCapitaPpp * .035 * minors.length, untilYear: Math.max(...minors.map(r => r.bornYear + 18)), birthYears: minors.map(r => r.bornYear) };
        for (const r of character.story?.relatives ?? []) if (r.role === "partner" && r.name === character.partnerName) r.inHousehold = false;
        character.partnerName = null;
        character.partnerProfile = undefined;
        character.flags = (character.flags ?? []).filter(f => f !== "pareja_internacional");
        if (!effect.maritalStatus && (character.maritalStatus === "dating" || character.maritalStatus === "married")) {
            character.maritalStatus = "divorced";
        }
    }
    if (effect.maritalStatus) character.maritalStatus = effect.maritalStatus;
    if (effect.childrenDelta && (effect.childrenDelta < 0 || !parentingBlocked(character, game.currentYear))) {
        if (game.config.monthlyMode && effect.childrenDelta > 0) {
            const due = (character.liveEconomy?.month ?? 0) + 9;
            const rng = createRng(deriveSeed(game.seed, "planned-parenting", character.id, game.currentYear));
            planParenthood(character, game.currentYear, character.liveEconomy?.month ?? 0, rng, `decision-${character.id}-${game.currentYear}`);
        } else character.children = clamp(character.children + effect.childrenDelta, 0, 8);
    }
    if (effect.grandchildrenDelta) character.grandchildren = clamp((character.grandchildren ?? 0) + effect.grandchildrenDelta, 0, 16);
    if (effect.housingDelta) character.housingQuality = clamp(character.housingQuality + effect.housingDelta);
    if (effect.healthPlan) character.healthPlan = effect.healthPlan;
    if (effect.chronicCondition && !character.chronicConditions.includes(effect.chronicCondition)) {
        character.chronicConditions.push(effect.chronicCondition);
        addMedicalRecord(character, year, effect.chronicCondition, "grave", "Condición crónica diagnosticada.");
    }
    if (effect.medical) {
        addMedicalRecord(character, year, effect.medical.condition, effect.medical.severity, effect.medical.note);
    }
    if (effect.milestone) addMilestone(character, effect.milestone, decision.category, year);
    if (effect.migrateTo) {
        migrate(character, effect.migrateTo.countryCode, effect.migrateTo.location, year);
        addMilestone(character, `Nueva vida en ${effect.migrateTo.location}`, "migracion", year);
    }
    if (effect.returnToBirthCountry) {
        migrate(character, game.birth.countryCode, game.birth.location, year);
        addMilestone(character, `Regresó a ${game.birth.countryName}`, "migracion", year);
    }
    if (effect.flags?.length) {
        character.flags = [...new Set([...(character.flags ?? []), ...effect.flags])];
    }
    if (effect.clearFlags?.length) {
        character.flags = (character.flags ?? []).filter((flag) => !effect.clearFlags!.includes(flag));
    }
    if (effect.creditDelta) {
        ensureCredit(character);
        character.credit!.score = clamp(character.credit!.score + effect.creditDelta, 0, 100);
    }
    if (effect.mortgage) {
        const amount = resolveCostRule(effect.mortgage.amountRule, character);
        adjustDebt(character, amount, effect.mortgage.label, year);
        const selectedOption = decision.options.find(o => o.outcomes.success === effect || o.outcomes.failure === effect);
        const deposit = selectedOption ? optionCost(selectedOption, character) : 0;
        character.assets = [...(character.assets ?? []), { id: randomUUID(), kind: "home", country: character.currentCountry, location: character.currentLocation, name: effect.mortgage.label, value: amount + deposit, purchasedYear: year, ...(game.config.monthlyMode ? { loanBalance: amount, loanRate: mortgageRate(character), monthlyPayment: monthlyInstallment(amount, mortgageRate(character), effect.mortgage.years) } : {}) }];
        addMilestone(character, effect.mortgage.label, "vivienda", year);
    }
    if (effect.loan) {
        const explicitCreditor = effect.loan.creditorRelativeId && effect.loan.creditorRelativeName
            ? { id: effect.loan.creditorRelativeId, name: effect.loan.creditorRelativeName }
            : undefined;
        const familyCreditor = effect.loan.lender === "familia"
            ? character.story?.relatives.find((relative) => (relative.role === "mother" || relative.role === "father") && relative.alive)
            : undefined;
        const creditor = explicitCreditor ?? (familyCreditor ? { id: familyCreditor.id, name: familyCreditor.name } : undefined);
        const amount = resolveCostRule(effect.loan.amountRule, character);
        takeLoan(
            character,
            amount,
            effect.loan.lender,
            effect.loan.label,
            year,
            effect.loan.annualInterestRate ?? (effect.loan.lender === "banco" ? 0.13 : 0),
            creditor,
        );
        addMilestone(character, effect.loan.label, "dinero", year);
    }
    if (effect.businessStart) {
        startBusiness(
            character,
            effect.businessStart.kind,
            year,
            effect.businessStart.capital ?? 0,
            effect.businessStart.name,
        );
    }
    if (effect.businessFocus && character.business?.active) { character.business.segment = effect.businessFocus.label; character.business.activity = effect.businessFocus.activity; }
    if (effect.businessChange) applyBusinessChange(character, effect.businessChange);
    if (effect.exportRoute && character.business?.active && character.business.kind === "comercio") openExportRoute(character, effect.exportRoute);
    if (effect.tradeChange && character.business?.trade) Object.assign(character.business.trade, effect.tradeChange);
    if (effect.endBusiness) {
        endBusiness(character, year, effect.endBusiness.reason, effect.endBusiness.salePrice ?? 0);
    }
    if (effect.pet) createPet(character, effect.pet, year);
    effect.schedule?.forEach((future, index) => {
        applyFutureEffect(game, character, future, decision.id, index);
    });
}

function automaticEducation(character: CharacterState): void {
    const rank = EDUCATION_META[character.educationLevel]?.rank ?? 0;
    if (character.flags?.includes("dejo_estudios") || character.age < 18 && character.employment.status === "employed") return;
    if (character.age >= 6 && rank < 1) {
        character.educationLevel = "primary";
        character.educationYears = Math.max(character.educationYears, Math.min(6, character.age - 5));
    }
    if (character.age >= 12 && rank < 2 && character.educationLevel !== "none") {
        character.educationLevel = "secondary";
        character.educationYears = Math.max(character.educationYears, Math.min(12, character.age - 5));
    }
}

function automaticEmployment(character: CharacterState): void {
    if (character.age >= 18 && character.employment.status === "child") {
        character.employment.status = "unemployed";
    }
    if (
        character.age >= 26 &&
        !character.educationPlan &&
        character.employment.status === "student" &&
        (EDUCATION_META[character.educationLevel]?.rank ?? 0) <= 2
    ) {
        character.employment.status = "unemployed";
    }
    if (
        character.age >= 70 &&
        (character.employment.status === "employed" || character.employment.status === "self-employed")
    ) {
        character.employment.status = "retired";
        character.employment.yearsInRole = 0;
    }
}

function applyLifeDrift(
    character: CharacterState,
    difficulty: GameConfig["difficulty"],
): number {
    const healthDecline = applyHealthDecline(character, difficulty);
    const employed = character.employment.status === "employed" || character.employment.status === "self-employed";
    const unemployed = character.employment.status === "unemployed";
    const partnerBonus = character.partnerName ? 5 : 0;
    const children = character.story?.relatives.filter(r => r.role === "child" && r.generation !== "grandchild");
    const livingChildren = children?.length ? children.filter(r => r.alive).length : character.children;
    const childBonus = Math.min(livingChildren, 3) * 2;
    const debtShare = clamp(
        character.finance.debt / Math.max(character.finance.annualIncome * 2, 1),
        0,
        1,
    );
    const moneyComfort =
        character.finance.money > character.finance.annualExpenses ? 5 : -4 - debtShare * 4;
    const happinessTarget =
        42 +
        character.stats.health * 0.2 +
        character.stats.relationships * 0.18 +
        partnerBonus +
        childBonus +
        moneyComfort -
        (unemployed ? 7 : 0) -
        (employed ? 0 : 1);
    character.stats.happiness = clamp(
        character.stats.happiness + (happinessTarget - character.stats.happiness) * 0.13,
    );

    const relationshipTarget =
        34 +
        (character.partnerName ? 18 : 0) +
        Math.min(livingChildren, 3) * 4 +
        (character.age < 35 ? 5 : 0);
    character.stats.relationships = clamp(
        character.stats.relationships + (relationshipTarget - character.stats.relationships) * 0.07,
    );
    if (!character.partnerName && character.age > 48) {
        character.stats.relationships = clamp(character.stats.relationships - 0.35);
    }
    if (character.age > 78) {
        character.stats.relationships = clamp(character.stats.relationships - 0.25);
    }

    if (character.employment.status === "student") {
        character.stats.knowledge = clamp(character.stats.knowledge + 1);
    } else {
        character.stats.knowledge = clamp(character.stats.knowledge + (character.age < 70 ? 0.2 : -0.3));
    }
    return healthDecline;
}

function applyAnnualLifecycle(
    game: StoredGame,
    character: CharacterState,
    year: number,
): AnnualEconomyResult {
    automaticEducation(character);
    automaticEmployment(character);
    if (
        character.employment.status === "employed" ||
        character.employment.status === "self-employed"
    ) {
        character.employment.yearsInRole += 1;
    }
    applyLifeDrift(character, game.config.difficulty);
    const economyRng = createRng(
        deriveSeed(game.seed, "economy", character.slot, game.turnNumber, year),
    );
    const result: AnnualEconomyResult = game.config.monthlyMode && character.liveEconomy?.month === 12 ? closedMonthlyEconomy(character) : runAnnualEconomy(
        character,
        game.birth,
        game.economy,
        game.config.difficulty,
        economyRng,
        year,
    );
    if (game.config.monthlyMode) { character.finance.annualIncome = result.grossIncome; character.finance.annualExpenses = result.expenses; }
    const beforeBusiness = character.finance.money;
    const businessResult = advanceBusiness(character, game.economy, year, economyRng);
    if (businessResult) {
        const cashLoss = Math.max(0, beforeBusiness - character.finance.money);
        const profit = Math.max(0, businessResult.net);
        const gdp = getCountry(character.currentCountry).gdpPerCapitaPpp;
        const extraTax = Math.max(0, incomeTax(character.finance.annualIncome + profit, gdp) - incomeTax(character.finance.annualIncome, gdp));
        if (extraTax > 0) spend(character, extraTax, "Liquidación fiscal de beneficios empresariales", year);
        result.taxes += extraTax; result.expenses += extraTax + cashLoss; result.net += profit - cashLoss - extraTax;
        character.finance.annualExpenses += extraTax + cashLoss;
        const last = game.config.monthlyMode ? character.liveEconomy?.statements.at(-1) : undefined;
        if (last) {
            last.income += profit; last.taxes += extraTax; last.other += cashLoss;
            last.items ??= [];
            if (extraTax > 0) last.items.push({ label: "Liquidación fiscal de la empresa", amount: extraTax });
            if (businessResult.net < 0) last.items.push({ label: "Pérdidas de la empresa", amount: -businessResult.net, financed: cashLoss === 0 });
            last.balance = character.finance.money; last.debt = character.finance.debt;
        }
        result.businessRevenue = businessResult.revenue;
        result.businessNet = businessResult.net;
        // El resultado del negocio forma parte de la renta personal del año.
        // Sin esto, una persona autoempleada podría tener beneficios reales y
        // una renta declarada de cero para la puntuación y el nivel de vida.
        character.finance.annualIncome = Math.max(
            0,
            Math.round(character.finance.annualIncome + businessResult.net),
        );
    }
    updateCredit(character, { insolvent: result.insolvent, unpaid: result.unpaid }, year);
    advancePsychology(character, year);
    if (result.insolvent) {
        character.stats.happiness = clamp(character.stats.happiness - 3);
        character.stats.health = clamp(character.stats.health - 1);
    }
    if (result.unpaid > 0) {
        character.stats.health = clamp(character.stats.health - 1);
        character.stats.relationships = clamp(character.stats.relationships - 1);
    }
    if (character.employment.status === "unemployed") {
        character.stats.happiness = clamp(character.stats.happiness - 2);
    }
    if (
        character.finance.debt >
        Math.max(character.finance.annualIncome, getCountry(character.currentCountry).gdpPerCapitaPpp * 0.4)
    ) {
        character.stats.happiness = clamp(character.stats.happiness - 2);
    }
    if (character.children > 0) {
        character.stats.happiness = clamp(character.stats.happiness + 1);
    }
    character.livingStandard = computeLivingStandard(character);
    return result;
}

function applyDueEffects(
    game: StoredGame,
    player: StoredPlayer,
    notes: Partial<Record<PlayerSlot, string[]>>,
): void {
    const character = player.character;
    if (!character?.alive) return;
    const due = character.pendingEffects.filter((effect) => effect.appliesAtAge <= character.age);
    if (due.length === 0) return;
    character.pendingEffects = character.pendingEffects.filter(
        (effect) => effect.appliesAtAge > character.age,
    );
    const playerNotes = notes[player.slot] ?? [];
    for (const effect of due) {
        playerNotes.push(effect.narrative);
        if (effect.stats) applyStatDelta(character.stats, effect.stats);
        if (effect.psychology) applyPsychologyDelta(character, effect.psychology);
        if (effect.moneyDelta && effect.moneyDelta !== 0) {
            if (effect.moneyDelta > 0) {
                grant(character, effect.moneyDelta, "Efecto de una decisión pasada", game.currentYear, "grant");
            } else {
                applySafeSpend(
                    character,
                    Math.abs(effect.moneyDelta),
                    "Efecto de una decisión pasada",
                    game.currentYear,
                );
            }
        }
        if (effect.incomeModifierDelta) character.incomeModifier += effect.incomeModifierDelta;
        if (effect.expenseModifierDelta) character.expenseModifier += effect.expenseModifierDelta;
        clampModifiers(character);
        if (effect.education) {
            const currentRank = EDUCATION_META[character.educationLevel]?.rank ?? 0;
            if ((EDUCATION_META[effect.education]?.rank ?? 0) >= currentRank) {
                character.educationLevel = effect.education;
                character.educationYears = Math.max(
                    character.educationYears,
                    EDUCATION_META[effect.education]?.years ?? character.educationYears,
                );
            }
        }
        if (effect.employment) character.employment.status = effect.employment;
        if (effect.occupation) character.employment.occupation = effect.occupation;
        if (effect.occupationId !== undefined) character.employment.occupationId = effect.occupationId;
        if (effect.sector) character.employment.sector = effect.sector;
        if (effect.contractQuality !== undefined) character.employment.contractQuality = clamp(effect.contractQuality, 0, 100);
        if (effect.milestone) addMilestone(character, effect.milestone, "vida", game.currentYear);
        if (effect.housingDelta) character.housingQuality = clamp(character.housingQuality + effect.housingDelta);
        if (effect.healthPlan) character.healthPlan = effect.healthPlan;
        if (effect.childrenDelta && (effect.childrenDelta < 0 || !parentingBlocked(character, game.currentYear))) {
            if (game.config.monthlyMode && effect.childrenDelta > 0) {
                const due = (character.liveEconomy?.month ?? 0) + 9;
                const rng = createRng(deriveSeed(game.seed, "planned-parenting", character.id, game.currentYear));
                planParenthood(character, game.currentYear, character.liveEconomy?.month ?? 0, rng, `decision-${character.id}-${game.currentYear}`);
            } else character.children = clamp(character.children + effect.childrenDelta, 0, 8);
        }
        if (effect.grandchildrenDelta) character.grandchildren = clamp((character.grandchildren ?? 0) + effect.grandchildrenDelta, 0, 16);
        if (effect.chronicCondition && !character.chronicConditions.includes(effect.chronicCondition)) {
            character.chronicConditions.push(effect.chronicCondition);
            addMedicalRecord(character, game.currentYear, effect.chronicCondition, "grave", "Consecuencia diferida.");
        }
        if (effect.flags?.length) character.flags = [...new Set([...(character.flags ?? []), ...effect.flags])];
        if (effect.clearFlags?.length) character.flags = (character.flags ?? []).filter((flag) => !effect.clearFlags!.includes(flag));
    }
    notes[player.slot] = playerNotes;
}

export function createSoloGame(
    id: string,
    playerId: string,
    alias: string,
    config: GameConfig,
    seed?: string,
): StoredGame {
    const game = makeGameShell({ id, mode: "solo", code: null, config, seed });
    game.status = "playing";
    const player = makeStoredPlayer(playerId, 1, alias, null);
    player.ready = true;
    player.character = initialCharacter(game, playerId, 1, alias);
    player.snapshots = [snapshotFromCharacter(player.character)];
    player.score = baseScore(game, player.character, player.snapshots);
    player.scoreHistory = [{ age: 0, score: player.score.total }];
    if (config.storyMode) player.character.story = createStory(game.seed, game.birth, config);
    game.players.push(player);
    if (config.autoDecisions) {
        game.autoVotes = { 1: true };
        game.clock.autoDecisions = true;
    }
    game.scoreHistory = [{ age: 0, players: { 1: player.score.total } }];
    beginTurn(game);
    touch(game);
    return game;
}

export function createDuelRoom(
    id: string,
    code: string,
    hostPlayerId: string,
    hostAlias: string,
    config: GameConfig,
    seed?: string,
): StoredGame {
    const game = makeGameShell({ id, mode: "duel", code, config, seed });
    game.players.push(makeStoredPlayer(hostPlayerId, 1, hostAlias, null));
    game.status = "waiting";
    touch(game);
    return game;
}

export function findPlayerByPlayerId(
    game: StoredGame,
    playerId: string,
): StoredPlayer | undefined {
    return game.players.find((player) => player.playerId === playerId);
}

export function ensureMember(game: StoredGame, playerId: string): StoredPlayer {
    const player = findPlayerByPlayerId(game, playerId);
    if (!player) throw Errors.forbidden("No participas en esta partida.");
    return player;
}

export function joinDuelRoom(
    game: StoredGame,
    playerId: string,
    alias: string,
): StoredPlayer {
    if (game.mode !== "duel") throw Errors.validation("Esta partida no es un duelo.");
    if (game.status !== "waiting" && game.status !== "ready") {
        throw Errors.conflict("La sala ya ha comenzado o ha finalizado.");
    }
    if (new Date(game.inviteExpiresAt).getTime() < Date.now()) {
        throw Errors.conflict("La invitación ha caducado.");
    }
    const existing = findPlayerByPlayerId(game, playerId);
    if (existing) {
        existing.left = false;
        existing.alias = alias;
        existing.lastSeenAt = nowIso();
        touch(game);
        return existing;
    }
    if (game.players.filter((player) => !player.left).length >= 2) {
        throw Errors.conflict("La sala ya está llena.");
    }
    const slot: PlayerSlot = game.players.some((player) => player.slot === 1) ? 2 : 1;
    const player = makeStoredPlayer(playerId, slot, alias, null);
    game.players.push(player);
    game.status = "ready";
    if (game.config.autoDecisions) game.autoVotes[slot] = true;
    touch(game);
    return player;
}

export function setPlayerReady(game: StoredGame, slot: PlayerSlot, ready: boolean): void {
    const player = game.players.find((candidate) => candidate.slot === slot);
    if (!player) throw Errors.notFound("Jugador no encontrado.");
    if (game.status !== "waiting" && game.status !== "ready") {
        throw Errors.conflict("La sala ya no admite cambios de preparación.");
    }
    player.ready = ready;
    if (game.players.filter((candidate) => !candidate.left).length === 2) {
        game.status = "ready";
    }
    touch(game);
}

export function canStartDuel(game: StoredGame): boolean {
    return (
        game.mode === "duel" &&
        (game.status === "waiting" || game.status === "ready") &&
        game.players.filter((player) => !player.left).length === 2 &&
        game.players.filter((player) => !player.left).every((player) => player.ready)
    );
}

export function startDuel(game: StoredGame): void {
    if (!canStartDuel(game)) {
        throw Errors.conflict(
            "Solo se puede comenzar cuando ambos jugadores están presentes y listos.",
        );
    }
    game.status = "playing";
    game.age = 0;
    game.turnNumber = 0;
    game.currentYear = game.birth.year;
    game.history = [];
    game.scoreHistory = [];
    game.final = null;
    game.pending = null;
    game.economy = initialEconomy(game.birth.countryCode);
    game.world = { usedEventIds: [], lastEventAges: {}, turnsSinceEvent: 0 };
    game.clock.paused = false;
    game.clock.deadlineAt = null;
    game.idempotency = {};
    for (const player of game.players) {
        if (player.left) continue;
        player.character = initialCharacter(game, player.playerId, player.slot, player.alias);
        if (game.config.storyMode) player.character.story = createStory(game.seed, game.birth, game.config);
        player.snapshots = [snapshotFromCharacter(player.character)];
        player.score = baseScore(game, player.character, player.snapshots);
        player.scoreHistory = [{ age: 0, score: player.score.total }];
        player.lastTurn = null;
        player.decisions = [];
        player.aiNarrative = null;
        player.ready = true;
    }
    if (game.config.autoDecisions) {
        game.autoVotes = {};
        for (const player of game.players) game.autoVotes[player.slot] = true;
        game.clock.autoDecisions = true;
    }
    game.scoreHistory = [{ age: 0, players: {} }];
    for (const player of game.players) {
        if (player.score) game.scoreHistory[0]!.players[player.slot] = player.score.total;
    }
    beginTurn(game);
    touch(game);
}

export function waitingFor(game: StoredGame): PlayerSlot[] {
    if (!game.pending) return [];
    return game.players
        .filter(
            (player) =>
                player.character?.alive &&
                game.pending?.prompts[player.slot] &&
                !game.pending?.submitted[player.slot],
        )
        .map((player) => player.slot);
}

function autoDelayMs(game: StoredGame): number {
    if (game.clock.decisionTimerSeconds > 0) return Math.max(150, game.clock.decisionTimerSeconds * 1000 / game.clock.speed);
    return Math.max(450, Math.round(3200 / game.clock.speed));
}

export function refreshDeadline(game: StoredGame): void {
    if (!game.pending) return;
    if (game.status === "playing" && (game.clock.autoDecisions || (game.mode === "solo" && game.config.storyMode && waitingFor(game).length === 0))) {
        game.pending.deadlineAt = new Date(Date.now() + (game.config.monthlyMode ? Math.max(80, autoDelayMs(game) / 12) : autoDelayMs(game))).toISOString();
    } else {
        game.pending.deadlineAt = null;
    }
    game.clock.deadlineAt = game.pending.deadlineAt;
}

export function beginTurn(
    game: StoredGame,
    notes: Partial<Record<PlayerSlot, string[]>> = {},
): void {
    if (game.status !== "playing") return;
    const alivePlayers = game.players.filter((player) => player.character?.alive);
    if (alivePlayers.length === 0) {
        finalizeGame(game);
        return;
    }
    const age = game.age;
    const year = game.currentYear;
    if (game.config.monthlyMode) for (const p of game.players) if (p.character) p.character.liveEconomy = { month: 0, statements: [], unpaid: p.character.unpaidBills ?? 0, interest: 0 };
    const eventDefinitions = selectSharedEvents({
        worldSeed: game.seed,
        turn: game.turnNumber,
        age,
        countryCode: game.birth.countryCode,
        era: game.birth.era,
        contentSeverity: game.config.content.severity,
        lastEventAges: game.world.lastEventAges,
        usedEventIds: game.world.usedEventIds,
        turnsSinceEvent: game.world.turnsSinceEvent,
    });
    game.economy = applyWorldEffects(game.economy, eventDefinitions);
    const records = eventDefinitions.map((event) => toEventRecord(event));
    const eventDecisionId = eventDefinitions.find((event) => event.decisionId)?.decisionId ?? null;
    const prompts: Partial<Record<PlayerSlot, DecisionPrompt>> = {};
    for (const player of alivePlayers) {
        if (!player.character) continue;
        if (game.config.storyMode) {
            if (age === 6 && player.character.educationLevel === "none") player.character.educationLevel = "primary";
            if (age === 12 && player.character.educationLevel === "primary" && !player.character.flags?.includes("dejo_estudios") && player.character.employment.status !== "employed") player.character.educationLevel = "secondary";
        }
        const lastDecisionId = player.decisions.at(-1)?.decisionId ?? null;
        let selected = selectDecision({
            character: player.character,
            birth: game.birth,
            worldSeed: game.seed,
            turn: game.turnNumber,
            lastDecisionId,
            eventDecisionId,
            contentSeverity: game.config.content.severity,
        });
        if (game.config.storyMode && age === 2) {
            const encounter = createRng(deriveSeed(game.seed, "opening-scene")).pick([getDecision("story_first_encounter")!, ...OPENING_DECISIONS]);
            if (encounter) selected = { definition: encounter, source: "vida" };
        }
        if (game.config.storyMode) {
            const used = new Set(player.character.usedDecisionIds);
            const flags = new Set(player.character.flags ?? []);
            let forcedId: string | null = null;
            if (age === 18) {
                const entries = CAREER_OPENINGS.filter(d => decisionEligible(d, player.character!, game.config.content.severity, false, game.birth));
                if (entries.length) forcedId = createRng(deriveSeed(game.seed, "career-opening")).pick(entries).id;
            }
            else if (age >= 20 && (flags.has("father_en_apuros") || flags.has("mother_en_apuros")) && !used.has("padre_en_apuros")) forcedId = "padre_en_apuros";
            else if (age === 22 && flags.has("familia_puede_ayudar") && !used.has("prestamo_familia") && createRng(deriveSeed(game.seed, "family-loan-beat", 22)).chance(38)) forcedId = "prestamo_familia";
            else if (age === 22 && flags.has("profesion_musica") && !used.has("profesion_musica_gira")) forcedId = "profesion_musica_gira";
            else if (age === 26 && flags.has("profesion_medica") && !used.has("profesion_medica_caso")) forcedId = "profesion_medica_caso";
            else if (age === 45 && flags.has("parents_mayores") && !used.has("cuidar_padres_mayores") && createRng(deriveSeed(game.seed, "parents-care-beat", 45)).chance(45)) forcedId = "cuidar_padres_mayores";
            if (forcedId) {
                const forced = getDecision(forcedId);
                if (forced) selected = { definition: forced, source: "vida" };
            }
        }
        if (!selected) continue;
        if (game.config.storyMode && game.mode === "solo") {
            const importantAge = [2, 4, 6, 8, 10, 12, 14, 16, 18, 22, 26, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].includes(age);
            const lastChoiceAge = (game.history.filter(t => t.players[player.slot]?.decisionId !== "sin_decision").at(-1)?.age ?? -10);
            const contextualOpportunity = age >= 20 && age - lastChoiceAge >= 2 && createRng(deriveSeed(game.seed, "opportunity", age)).chance(32);
            const urgent = selected.definition.priority === "recovery" || selected.source === "evento";
            const focusOpportunity = selected.definition.priority === "focus" && age - lastChoiceAge >= 3;
            if ((!importantAge && !contextualOpportunity && !urgent) || (selected.definition.priority === "focus" && !focusOpportunity)) continue;
        }
        const prompt = buildPrompt(
            selected.definition,
            player.character,
            game.config.content.severity,
            selected.source === "evento" ? eventDecisionId ?? undefined : undefined,
            game.birth,
            { worldSeed: game.seed, turn: game.turnNumber, slot: player.slot, countryCode: player.character.currentCountry },
        );
        if (prompt) prompts[player.slot] = prompt;
    }
    const pending: PendingTurn = {
        turn: game.turnNumber,
        age,
        year,
        events: records,
        prompts,
        submitted: {},
        notes,
        deadlineAt: null,
        startedAt: nowIso(),
    };
    game.pending = pending;
    for (const event of eventDefinitions) {
        if (!game.world.usedEventIds.includes(event.id)) game.world.usedEventIds.push(event.id);
        game.world.lastEventAges[event.id] = age;
    }
    game.world.turnsSinceEvent = eventDefinitions.length > 0 ? 0 : game.world.turnsSinceEvent + 1;
    refreshDeadline(game);
    if (Object.keys(prompts).length === 0 && !(game.config.storyMode)) {
        resolveTurn(game);
    }
    touch(game);
}

export interface SubmitDecisionInput {
    turn: number;
    decisionId: string;
    optionId: string;
    idempotencyKey: string;
}

export interface SubmitDecisionResult {
    duplicate: boolean;
    resolved: boolean;
}

export function submitDecision(
    game: StoredGame,
    slot: PlayerSlot,
    input: SubmitDecisionInput,
): SubmitDecisionResult {
    if (game.status !== "playing") {
        throw Errors.conflict("La partida no está en curso.");
    }
    const pending = game.pending;
    if (!pending) throw Errors.conflict("No hay un turno pendiente.");
    if (pending.turn !== input.turn) {
        throw Errors.conflict("El turno ya ha avanzado. Recarga el estado de la partida.");
    }
    const player = game.players.find((candidate) => candidate.slot === slot);
    if (!player?.character?.alive) throw Errors.conflict("Tu personaje ya no está vivo.");
    const prompt = pending.prompts[slot];
    if (!prompt) throw Errors.conflict("No hay una decisión pendiente para ti.");
    const existingKey = game.idempotency[input.idempotencyKey];
    if (existingKey) {
        if (
            existingKey.slot === slot &&
            existingKey.turn === input.turn &&
            existingKey.decisionId === input.decisionId &&
            existingKey.optionId === input.optionId
        ) {
            return { duplicate: true, resolved: false };
        }
        throw Errors.conflict("Clave de idempotencia reutilizada con otra decisión.");
    }
    if (prompt.id !== input.decisionId) {
        throw Errors.conflict("La decisión no coincide con la ofrecida por el servidor.");
    }
    if (pending.submitted[slot]) {
        throw Errors.conflict("Ya has enviado una decisión para este año.");
    }
    const decision = getDecision(prompt.id);
    if (!prompt.options.some(o => o.id === input.optionId)) throw Errors.conflict("La opción no pertenece a la pregunta actual. Actualiza la partida.");
    const option = decision ? resolveDecisionOption(decision, input.optionId) : undefined;
    if (!decision || !option) throw Errors.validation("Opción no válida.");
    if (!optionAvailable(option, player.character, game.config.content.severity, game.birth)) {
        throw Errors.conflict("La opción ya no está disponible.");
    }
    const choice: DecisionChoice = {
        decisionId: input.decisionId,
        optionId: input.optionId,
        idempotencyKey: input.idempotencyKey,
        submittedAt: nowIso(),
    };
    pending.submitted[slot] = choice;
    player.decisions.push(choice);
    player.character.yearlyChoices += 1;
    if (!player.character.usedDecisionIds.includes(prompt.id)) {
        player.character.usedDecisionIds.push(prompt.id);
    }
    player.character.lastDecisionAges = {
        ...(player.character.lastDecisionAges ?? {}),
        [prompt.id]: player.character.age,
    };
    game.idempotency[input.idempotencyKey] = {
        slot,
        turn: input.turn,
        decisionId: input.decisionId,
        optionId: input.optionId,
    };
    if (game.config.monthlyMode) {
        const c = player.character;
        const cost = optionCost(option, c);
        const chance = successChance(option, c);
        const roll = chance === null ? null : Math.round(deterministicRoll(game.seed, "choice", player.slot, pending.turn, decision.id, option.id) * 10) / 10;
        const success = chance === null || roll === null ? null : roll < chance;
        if (cost > 0 && c.age >= 18) spend(c, cost, `Coste: ${decision.title}`, game.currentYear);
        const effect = success === false ? option.outcomes.failure ?? option.outcomes.success : option.outcomes.success;
        applyOutcome(game, c, decision, effect, game.currentYear);
        pending.appliedChoices ??= {}; pending.appliedChoices[slot] = { chance, roll, success };
        const secondary = pending.secondary?.[slot];
        if (!secondary) c.manualActions = [...(c.manualActions ?? []), { year: game.currentYear, month: c.liveEconomy?.month ?? 0, action: "decision", text: `${prompt.title}. Elegiste: ${option.label}.\n${personalize(effect.narrative, c, game.birth)}` }];
        if (secondary) {
            const child = c.story?.relatives.find(r => r.id === secondary.relativeId);
            if (child) {
                child.milestones = [...new Set([...(child.milestones ?? []), secondary.key])];
                if (effect.childPlan) child.school = { kind: effect.childPlan.kind, annualFee: Math.round(getCountry(c.currentCountry).gdpPerCapitaPpp * effect.childPlan.feeGdp), untilAge: effect.childPlan.untilAge, name: effect.childPlan.name };
            }
            const narration = personalize(effect.narrative, { ...c, story: c.story ? { ...c.story, relatives: child ? [child, ...c.story.relatives.filter(r => r.role !== "child")] : c.story.relatives } : undefined }, game.birth);
            c.manualActions = [...(c.manualActions ?? []), { year: game.currentYear, month: c.liveEconomy?.month ?? 0, action: "decision", text: `${prompt.title}. Elegiste: ${option.label}.\n${narration}` }];
            if (secondary.primaryPrompt) pending.prompts[slot] = secondary.primaryPrompt; else delete pending.prompts[slot];
            if (secondary.primaryChoice) pending.submitted[slot] = secondary.primaryChoice; else delete pending.submitted[slot];
            if (secondary.primaryApplied) pending.appliedChoices[slot] = secondary.primaryApplied; else delete pending.appliedChoices[slot];
            delete pending.secondary![slot];
        }
    }
    touch(game);
    if (waitingFor(game).length === 0) {
        if (game.config.monthlyMode) { refreshDeadline(game); return { duplicate: false, resolved: false }; }
        resolveTurn(game);
        return { duplicate: false, resolved: true };
    }
    return { duplicate: false, resolved: false };
}

export function autoSubmit(game: StoredGame, slot: PlayerSlot): boolean {
    if (game.status !== "playing" || !game.pending) return false;
    const prompt = game.pending.prompts[slot];
    if (!prompt || game.pending.submitted[slot]) return false;
    const player = game.players.find((candidate) => candidate.slot === slot);
    if (!player?.character?.alive) return false;
    const optionId = chooseAutoOption(prompt, game.seed, slot, game.pending.turn, player.character);
    if (!optionId) return false;
    submitDecision(game, slot, {
        turn: game.pending.turn,
        decisionId: prompt.id,
        optionId,
        idempotencyKey: `auto-${game.pending.turn}-${slot}-${prompt.id}-${game.pending.secondary?.[slot]?.relativeId ?? "main"}-${player.character.liveEconomy?.month ?? 0}-${optionId}`,
    });
    return true;
}

function sharedEventEffectsForPlayer(
    game: StoredGame,
    player: StoredPlayer,
): void {
    const character = player.character;
    if (!character?.alive) return;
    for (const record of game.pending?.events ?? []) {
        const event = getEvent(record.eventId);
        if (!event) continue;
        const stats = event.effects;
        applyStatDelta(character.stats, {
            health: stats.health ?? 0,
            happiness: stats.happiness ?? 0,
            knowledge: stats.knowledge ?? 0,
            relationships: stats.relationships ?? 0,
        });
        if (stats.housing) {
            character.housingQuality = clamp(character.housingQuality + stats.housing);
        }
        if (stats.moneyDelta) {
            if (stats.moneyDelta > 0) {
                grant(character, stats.moneyDelta, `Suceso: ${event.title}`, game.currentYear, "grant");
            } else {
                applySafeSpend(character, Math.abs(stats.moneyDelta), `Suceso: ${event.title}`, game.currentYear);
            }
        }
    }
}

export function refreshAvailableDecisions(game: StoredGame): void {
    if (!game.pending) return;
    for (const player of game.players) {
        const old = game.pending.prompts[player.slot];
        if (!old || !player.character || game.pending.submitted[player.slot]) continue;
        const decision = getDecision(old.id); if (!decision) continue;
        const target = player.character.story?.relatives.find(r => r.id === game.pending!.secondary?.[player.slot]?.relativeId);
        const character = target ? { ...player.character, story: { ...player.character.story!, relatives: [target, ...player.character.story!.relatives.filter(r => r.role !== "child")] } } : player.character;
        const refreshed = buildPrompt(decision, character, game.config.content.severity, old.eventId, game.birth, { worldSeed: game.seed, turn: game.turnNumber, slot: player.slot, countryCode: player.character.currentCountry });
        if (refreshed) game.pending.prompts[player.slot] = refreshed;
    }
}

export function advanceMonth(game: StoredGame): void {
    if (game.status !== "playing" || !game.pending || waitingFor(game).length) return;
    settleMonth(game);
    if (game.players.every(p => !p.character?.alive || (p.character.liveEconomy?.month ?? 0) >= 12)) resolveTurn(game);
    else {
        for (const player of game.players) if (player.character?.alive) offerMonthlyOpportunity(game, player.slot, player.character);
        refreshDeadline(game); touch(game);
    }
}

export function resolveTurn(game: StoredGame): TurnRecord | null {
    if (game.status !== "playing" || !game.pending) return null;
    if (waitingFor(game).length > 0) return null;
    if (game.config.monthlyMode && game.players.some(p => p.character?.alive && (p.character.liveEconomy?.month ?? 0) < 12)) return null;
    const pending = game.pending;
    const eventDefinitions = pending.events
        .map((record) => getEvent(record.eventId))
        .filter((event): event is NonNullable<typeof event> => Boolean(event));

    const turnPlayers: Partial<Record<PlayerSlot, TurnPlayerRecord>> = {};
    const newNotes: Partial<Record<PlayerSlot, string[]>> = {};

    for (const player of game.players) {
        const character = player.character;
        if (!character?.alive) continue;
        const beforeStats = { ...character.stats };
        const narrative: string[] = [...(pending.notes[player.slot] ?? [])];
        const milestones: string[] = [];
        const prompt = pending.prompts[player.slot];
        const choice = pending.submitted[player.slot];
        let economic: AnnualEconomyResult | null = null;
        let chance: number | null = null;
        let roll: number | null = null;
        let success: boolean | null = null;

        sharedEventEffectsForPlayer(game, player);

        let decisionTitle = "Continuidad";
        let decisionCategory: DecisionDefinition["category"] | null = null;
        let optionLabel = "Sin decisión específica";
        let decisionId = "sin_decision";
        let optionId = "continuidad";

        if (prompt && choice) {
            const decision = getDecision(prompt.id);
            const option = decision ? resolveDecisionOption(decision, choice.optionId) : undefined;
            if (!decision || !option) {
                throw Errors.internal("La decisión registrada ya no existe en el catálogo.");
            }
            decisionTitle = decision.title;
            decisionCategory = decision.category;
            decisionId = decision.id;
            optionLabel = option.label;
            optionId = option.id;
            const cost = optionCost(option, character);
            if (cost > 0 && !pending.appliedChoices?.[player.slot]) {
                if (character.age >= 18) {
                    spend(character, cost, `Coste: ${decision.title}`, game.currentYear);
                    narrative.push(`La decisión tuvo un coste económico registrado en el libro mayor.`);
                } else {
                    narrative.push(`El coste lo asumió tu familia, no tu economía personal.`);
                }
            }
            chance = pending.appliedChoices?.[player.slot] ? pending.appliedChoices[player.slot]!.chance : successChance(option, character);
            if (chance !== null) {
                roll =
                    Math.round(
                        deterministicRoll(
                            game.seed,
                            "choice",
                            player.slot,
                            pending.turn,
                            decision.id,
                            option.id,
                        ) * 10,
                    ) / 10;
                success = roll < chance;
                narrative.push(success ? `La apuesta salió bien.` : `La apuesta no salió como esperabas.`);
            }
            const applied = pending.appliedChoices?.[player.slot];
            if (applied) { chance = applied.chance; roll = applied.roll; success = applied.success; }
            const effect = success === false ? option.outcomes.failure ?? option.outcomes.success : option.outcomes.success;
            if (!applied) applyOutcome(game, character, decision, effect, game.currentYear);
            narrative.push(personalize(effect.narrative.replaceAll("{alias}", player.alias), character, game.birth));
            if (effect.milestone) milestones.push(effect.milestone);
        } else {
            narrative.push(
                "Este año no trajo una encrucijada decisiva. La vida siguió su curso entre lo cotidiano y lo imprevisto.",
            );
        }

        if (game.config.storyMode) narrative.push(...storyYear(game.seed, game.birth, character, game.currentYear, game.config, game.history.slice(-3).flatMap(turn => turn.players[player.slot]?.narrative ?? [])));
        economic = applyAnnualLifecycle(game, character, game.currentYear);
        const petLines = advancePets(
            character,
            createRng(deriveSeed(game.seed, "pets", player.slot, game.turnNumber, game.currentYear)),
        );
        narrative.push(...petLines);

        const deathRng = createRng(
            deriveSeed(game.seed, "mortality", player.slot, pending.turn, game.currentYear),
        );
        const death = rollDeath(character, game.config.difficulty, deathRng);
        let deathRecord: { age: number; cause: string } | null = null;
        if (death.died) {
            character.alive = false;
            character.ageAtDeath = character.age;
            character.causeOfDeath = death.cause;
            addMedicalRecord(
                character,
                game.currentYear,
                death.cause ?? "Causa no determinada",
                "grave",
                "Fallecimiento registrado por el modelo de mortalidad.",
            );
            deathRecord = { age: character.age, cause: death.cause ?? "Causa no determinada" };
            narrative.push(`El final llegó a los ${character.age} años: ${deathRecord.cause}.`);
        }

        const statDelta: Partial<typeof character.stats> = {
            health: Math.round((character.stats.health - beforeStats.health) * 10) / 10,
            happiness: Math.round((character.stats.happiness - beforeStats.happiness) * 10) / 10,
            knowledge: Math.round((character.stats.knowledge - beforeStats.knowledge) * 10) / 10,
            relationships: Math.round((character.stats.relationships - beforeStats.relationships) * 10) / 10,
        };
        player.snapshots.push(snapshotFromCharacter(character));
        if (player.snapshots.length > 130) player.snapshots.shift();
        player.score = baseScore(game, character, player.snapshots);
        player.scoreHistory.push({ age: character.age, score: player.score.total });

        const record: TurnPlayerRecord = {
            slot: player.slot,
            alias: player.alias,
            decisionId,
            decisionTitle,
            decisionCategory,
            optionId,
            optionLabel,
            success,
            chance,
            roll,
            narrative,
            statDelta,
            economic: {
                income: economic.grossIncome,
                expenses: economic.expenses,
                net: economic.net,
                balance: character.finance.money,
                debt: character.finance.debt,
            },
            milestones,
            bank: economic.monthly,
            death: deathRecord,
            scoreAfter: player.score.total,
        };
        player.lastTurn = record;
        turnPlayers[player.slot] = record;
    }

    const record: TurnRecord = {
        turn: pending.turn,
        age: pending.age,
        year: pending.year,
        sharedEvents: pending.events,
        players: turnPlayers,
        resolvedAt: nowIso(),
    };
    game.history.push(record);
    game.scoreHistory.push({
        age: pending.age,
        players: Object.fromEntries(
            Object.entries(turnPlayers).map(([slot, entry]) => [slot, entry?.scoreAfter ?? 0]),
        ),
    });

    for (const player of game.players) {
        if (player.character?.alive) player.character.age += 1;
    }
    game.age += 1;
    game.currentYear += 1;
    game.turnNumber += 1;
    game.pending = null;
    game.clock.deadlineAt = null;

    for (const player of game.players) {
        applyDueEffects(game, player, newNotes);
    }

    const alivePlayers = game.players.filter((player) => player.character?.alive);
    if (alivePlayers.length === 0 || game.age >= game.config.maxAge) {
        finalizeGame(game);
    } else {
        beginTurn(game, newNotes);
    }
    touch(game);
    return record;
}

export function finalizeGame(game: StoredGame): void {
    if (game.status === "finished" && game.final) return;
    const results: Record<number, import("@life-duel/shared").FinalPlayerResult> = {};
    const playerEntries = game.players.filter(
        (player): player is StoredPlayer & { character: CharacterState } => Boolean(player.character),
    );
    for (const player of playerEntries) {
        const character = player.character;
        const finalSnapshots = [...player.snapshots, snapshotFromCharacter(character)];
        const score = computeScore({
            character,
            weights: game.config.scoringWeights,
            snapshots: finalSnapshots,
            lifeExpectancyAtBirth: game.birth.lifeExpectancyAtBirth,
            gdpPerCapitaPpp: getCountry(game.birth.countryCode).gdpPerCapitaPpp,
            ageOverride: character.ageAtDeath ?? character.age,
        });
        player.score = score;
        const birth = game.birth;
        const education = EDUCATION_META[character.educationLevel]?.label ?? character.educationLevel;
        const occupation = character.employment.occupation ?? null;
        const difficulties: string[] = [];
        if (character.chronicConditions.length > 0) {
            difficulties.push(`Condiciones crónicas: ${character.chronicConditions.join(", ")}.`);
        }
        if (character.finance.debt > character.finance.annualIncome) {
            difficulties.push("Cerró su vida con una deuda superior a sus ingresos anuales.");
        }
        const lowHappiness = player.snapshots.filter((snapshot) => snapshot.happiness < 30).length;
        if (lowHappiness >= 3) {
            difficulties.push(`Pasó ${lowHappiness} años con una felicidad inferior a 30/100.`);
        }
        if (player.snapshots.some((snapshot) => snapshot.money <= 0)) {
            difficulties.push("Atravesó etapas sin margen económico.");
        }
        const countriesLived = character.countriesLived.map((code) => getCountry(code).name);
        const lifeSummary = `${birth.givenName} nació en ${birth.countryName} en ${birth.year}. ${character.ageAtDeath !== null ? `Murió a los ${character.ageAtDeath} años.` : `La simulación terminó a los ${character.age} años.`
            } ${education}. ${occupation ? `Trabajó como ${occupation.toLowerCase()}.` : "Su trayectoria laboral fue discontinua."
            } ${character.children > 0 ? `Tuvo ${character.children} ${character.children === 1 ? "hijo" : "hijos"}.` : "No tuvo hijos."} ${character.countriesLived.length > 1 ? `Vivió en ${countriesLived.join(", ")}.` : `Vivió en ${countriesLived[0]}.`
            }`;
        const activeLoanBalance = (character.loans ?? [])
            .filter((loan) => loan.active)
            .reduce((total, loan) => total + loan.balance, 0);
        const psychology = character.psychology;
        const finalMood = !psychology
            ? undefined
            : psychology.grief >= 55
                ? "Marcado por las pérdidas, pero capaz de seguir"
                : psychology.stress >= 65
                    ? "Cansado, con una vida que pesa"
                    : psychology.lifeSatisfaction >= 68
                        ? "En paz con lo vivido"
                        : "Con luces y sombras";
        const insurance = character.lifeInsurance;
        const familyInsuranceBenefit = character.ageAtDeath !== null && insurance && insurance.expiresMonth >= game.currentYear * 12 + (character.liveEconomy?.month ?? 0) && (character.partnerName || character.story?.relatives.some(r => r.alive && ["child", "partner", "mother", "father"].includes(r.role))) ? insurance.benefit : 0;
        results[player.slot] = {
            familyInsuranceBenefit,
            slot: player.slot,
            alias: player.alias,
            givenName: birth.givenName,
            birthCountry: birth.countryName,
            countriesLived,
            ageAtDeath: character.ageAtDeath ?? character.age,
            causeOfDeath: character.causeOfDeath,
            education: character.educationLevel,
            occupation,
            finalStats: { ...character.stats },
            finance: structuredClone(character.finance),
            children: character.children,
            maritalStatus: character.maritalStatus,
            milestoneTitles: character.milestones.map((milestone) => milestone.title),
            difficulties,
            score,
            scoreHistory: [...player.scoreHistory],
            lifeSummary,
            psychology: character.psychology ? { ...character.psychology } : undefined,
            business: character.business ? { ...character.business } : null,
            household: game.birth.details?.household,
            flags: [...(character.flags ?? [])],
            loanBalance: activeLoanBalance,
            finalMood,
        };
    }

    const first = playerEntries.find((player) => player.slot === 1);
    const second = playerEntries.find((player) => player.slot === 2);
    const comparison = compareScores(first?.score ?? null, second?.score ?? null);
    let winner: 1 | 2 | "tie" | null = comparison.winner;
    let margin = comparison.margin;
    let reason = "";
    if (game.mode === "solo") {
        winner = null;
        margin = 0;
        reason = "Vida individual completada.";
    } else if (!first || !second) {
        winner = first ? 1 : second ? 2 : null;
        reason = winner
            ? `Gana el jugador ${winner} porque el rival no completó la partida.`
            : "No hubo jugadores con vida registrada.";
    } else if (comparison.winner === "tie") {
        reason = `Empate técnico con una diferencia de ${comparison.margin} puntos (umbral ${SCORE_TIE_THRESHOLD}).`;
    } else {
        reason = `Gana el jugador ${comparison.winner} por ${comparison.margin} puntos.`;
    }

    const categoryWinners: import("@life-duel/shared").FinalResult["categoryWinners"] = {};
    for (const [key, value] of Object.entries(comparison.categoryWinners)) {
        categoryWinners[key as keyof typeof categoryWinners] = value;
    }

    game.final = {
        finishedAt: nowIso(),
        players: results,
        winner,
        margin,
        reason,
        categoryWinners,
    };
    game.status = "finished";
    game.finishedAt = nowIso();
    game.clock.paused = true;
    game.clock.deadlineAt = null;
    game.pending = null;
    touch(game);
}

export function setPaused(game: StoredGame, paused: boolean): void {
    if (game.status === "finished") throw Errors.conflict("La partida ya ha terminado.");
    if (paused) {
        if (game.status !== "playing") return;
        game.status = "paused";
        game.clock.paused = true;
        if (game.pending) game.pending.deadlineAt = null;
        game.clock.deadlineAt = null;
    } else {
        if (game.status !== "paused") return;
        game.status = "playing";
        game.clock.paused = false;
        refreshDeadline(game);
    }
    touch(game);
}

export function setGameSpeed(game: StoredGame, speed: GameConfig["speed"]): void {
    game.clock.speed = speed;
    refreshDeadline(game);
    touch(game);
}

export function setAutomaticDecisions(game: StoredGame, enabled: boolean): void {
    game.clock.autoDecisions = enabled;
    game.autoVotes = {};
    if (enabled) {
        for (const player of game.players) {
            if (!player.left && player.character?.alive !== false) game.autoVotes[player.slot] = true;
        }
    }
    refreshDeadline(game);
    touch(game);
}

export function setDecisionTimer(game: StoredGame, seconds: number): void {
    game.clock.decisionTimerSeconds = seconds;
    refreshDeadline(game);
    touch(game);
}

export function markPlayerLeft(game: StoredGame, slot: PlayerSlot): void {
    const player = game.players.find((candidate) => candidate.slot === slot);
    if (!player) return;
    player.left = true;
    player.ready = false;
    player.lastSeenAt = nowIso();
    if (game.status === "waiting" || game.status === "ready") {
        const remaining = game.players.filter((candidate) => !candidate.left);
        game.status = remaining.length === 2 ? "ready" : "waiting";
    } else if (game.status === "playing" || game.status === "paused") {
        game.status = "paused";
        game.clock.paused = true;
        if (game.pending) game.pending.deadlineAt = null;
        game.clock.deadlineAt = null;
    }
    if (game.players.every((candidate) => candidate.left)) {
        finalizeGame(game);
    }
    touch(game);
}

export function setAiNarrative(game: StoredGame, slot: PlayerSlot, text: string): void {
    const player = game.players.find((candidate) => candidate.slot === slot);
    if (player) {
        player.aiNarrative = text;
        touch(game);
    }
}

export function canRematch(game: StoredGame): boolean {
    return game.mode === "duel" && game.status === "finished";
}

export function gamePlayerSlots(game: StoredGame): PlayerSlot[] {
    return game.players.map((player) => player.slot);
}

export function decisionForPrompt(prompt: DecisionPrompt): DecisionDefinition | undefined {
    return getDecision(prompt.id);
}

export function categoryLabelForDecision(prompt: DecisionPrompt): string {
    return DECISION_CATEGORY_META[prompt.category]?.label ?? prompt.category;
}

export function buildArchiveSummary(game: StoredGame, player: StoredPlayer) {
    const character = player.character;
    const country = getCountry(game.birth.countryCode);
    return {
        id: game.id,
        mode: game.mode,
        status: game.status === "finished" ? "finished" : game.status === "paused" ? "paused" : "playing",
        roomCode: game.code,
        alias: player.alias,
        age: character?.ageAtDeath ?? character?.age ?? game.age,
        countryName: country.name,
        givenName: game.birth.givenName,
        score: player.score?.total ?? 0,
        updatedAt: game.updatedAt,
        winner:
            game.final?.winner === "tie"
                ? "Empate"
                : game.final?.winner
                    ? `Jugador ${game.final.winner}`
                    : null,
        alive: character?.alive ?? false,
    };
}

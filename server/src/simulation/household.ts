import type {
    EducationLevel,
    HouseholdBudget,
    HouseholdMember,
    HouseholdState,
    ParentDetails,
    Sex,
} from "@life-duel/shared";
import { clamp, EDUCATION_META } from "@life-duel/shared";
import type { CountryData } from "../demographics/dataset.js";
import {
    countryContext,
    educationRank,
    parentHealthEstimate,
    pickOccupation,
    realismModel,
    weightedReligion,
} from "./realism.js";
import { createRng, deriveSeed, type Rng } from "./rng.js";

export interface HouseholdGenerationInput {
    seed: string;
    country: CountryData;
    year: number;
    tier: 1 | 2 | 3 | 4 | 5;
    householdSize: number;
    rural: boolean;
    motherAge: number;
    fatherAge: number;
    motherName: string;
    fatherName: string;
    surname: string;
    storyMode: boolean;
}

export interface HouseholdGeneration {
    mother: ParentDetails;
    father: ParentDetails;
    household: HouseholdState;
    religion: string;
    annualHouseholdIncome: number;
    parentEducation: EducationLevel;
    housingDescription: string;
}

function parentEducation(
    tier: number,
    meanYears: number,
    rng: Rng,
    sex: Sex,
): EducationLevel {
    const levels: EducationLevel[] = ["none", "primary", "secondary", "vocational", "university", "postgraduate"];
    const weightsByTier: Record<number, number[]> = {
        1: [30, 43, 20, 5, 2, 0],
        2: [14, 39, 31, 10, 5, 1],
        3: [5, 23, 35, 17, 16, 4],
        4: [1, 10, 27, 18, 32, 12],
        5: [0, 4, 17, 14, 43, 22],
    };
    const weights = [...(weightsByTier[tier] ?? weightsByTier[3]!)];
    if (sex === "female") {
        // La brecha educativa es un fenómeno histórico y varía por generación.
        // Se modela una ligera desventaja solo en países con escolarización media baja.
        if (meanYears < 7) {
            weights[4] = Math.max(0, weights[4] - 2);
            weights[1] += 2;
        }
    }
    if (meanYears < 7) {
        weights[4] = Math.max(0, weights[4] - 10);
        weights[5] = 0;
        weights[0] += 10;
    } else if (meanYears > 12) {
        weights[4] += 8;
        weights[1] = Math.max(0, weights[1] - 8);
    }
    return rng.weighted(levels, (level) => weights[levels.indexOf(level)] ?? 0);
}

function ageIncomeFactor(age: number): number {
    if (age < 28) return 0.72 + (age - 20) * 0.015;
    if (age <= 52) return 1;
    return Math.max(0.72, 1 - (age - 52) * 0.008);
}

function weightedKey<T extends string>(rng: Rng, weights: Record<string, number>, fallback: T): T {
    const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
    if (entries.length === 0) return fallback;
    return rng.weighted(entries, ([, weight]) => weight)[0] as T;
}

function makeAdditionalMember(
    id: string,
    role: HouseholdMember["role"],
    name: string,
    sex: Sex,
    age: number,
    country: CountryData,
    occupation: string,
    annualIncome: number,
    rng: Rng,
): HouseholdMember {
    return {
        id,
        role,
        name,
        sex,
        age,
        occupation,
        annualIncome,
        health: parentHealthEstimate(rng, country.code, age),
        alive: true,
    };
}

/**
 * Genera un hogar de nacimiento coherente a partir de la misma semilla.
 *
 * Los ingresos parentales no se eligen a mano: se derivan de una ocupación
 * compatible con educación, sexo, quintil y entorno. La suma del hogar se
 * calibra al quintil para que una familia rica no tenga oficios incompatibles
 * con sus recursos y una familia pobre no reciba salarios de élite.
 */
export function generateHousehold(input: HouseholdGenerationInput): HouseholdGeneration {
    const rng = createRng(deriveSeed(input.seed, "household-v2"));
    const model = realismModel();
    const country = input.country;
    const context = countryContext(country.code);
    const tierKey = String(input.tier);
    const motherEducation = parentEducation(input.tier, country.meanYearsSchooling, rng, "female");
    const fatherEducation = parentEducation(input.tier, country.meanYearsSchooling, rng, "male");
    const religion = weightedReligion(country.code, rng);
    const religiosity = Math.round(clamp(context.religiosity + rng.int(-13, 13), 0, 100));

    const baseTarget =
        country.gdpPerCapitaPpp *
        (model.household.quintileIncomeMultipliers[tierKey] ?? 0.7) *
        Math.sqrt(Math.max(2, input.householdSize)) *
        (0.9 + rng.next() * 0.2);

    const motherLaborProbability = clamp(
        (context.femaleLaborParticipationPct / 100) *
        (0.72 + educationRank(motherEducation) * 0.055) *
        (input.rural ? 0.82 : 1) *
        (input.tier >= 4 ? 1.08 : 1),
        0.08,
        0.92,
    );
    const inLaborForce = rng.chance(motherLaborProbability * 100);

    const polygynyPossible =
        input.storyMode &&
        context.polygynyLegal &&
        (country.code === "ZAF" || religion === "Islam");
    const polygynous = polygynyPossible && rng.chance(model.household.coWifeProbabilityPct);
    const additionalMembers: HouseholdMember[] = [];
    let coWifeIncome = 0;

    const parentPoolShare = polygynous ? 0.78 : 0.94;
    const fatherTarget = baseTarget * parentPoolShare * (inLaborForce ? 0.55 : 1);
    const fatherOccupation = pickOccupation(
        rng,
        fatherEducation,
        input.tier,
        "male",
        input.rural,
        fatherTarget,
        country.gdpPerCapitaPpp,
    );
    const motherOccupation = inLaborForce
        ? pickOccupation(
            rng,
            motherEducation,
            input.tier,
            "female",
            input.rural,
            baseTarget * parentPoolShare * 0.45,
            country.gdpPerCapitaPpp,
        )
        : null;

    const fatherRaw =
        country.gdpPerCapitaPpp *
        fatherOccupation.salaryIndex *
        ageIncomeFactor(input.fatherAge) *
        (1 + educationRank(fatherEducation) * 0.012);
    const motherRaw = motherOccupation
        ? country.gdpPerCapitaPpp *
        motherOccupation.salaryIndex *
        ageIncomeFactor(input.motherAge) *
        (1 + educationRank(motherEducation) * 0.012) *
        (1 - context.genderWageGapPct / 100)
        : 0;
    const rawTotal = fatherRaw + motherRaw;
    const parentPool = baseTarget * parentPoolShare;
    const fatherIncome = inLaborForce && rawTotal > 0
        ? Math.round(parentPool * (fatherRaw / rawTotal))
        : Math.round(parentPool);
    const motherIncome = inLaborForce && rawTotal > 0
        ? Math.round(parentPool * (motherRaw / rawTotal))
        : 0;

    if (polygynous) {
        coWifeIncome = Math.round(baseTarget * 0.16);
        const coWifeAge = rng.int(20, 39);
        const coWifeOccupation = pickOccupation(
            rng,
            motherEducation,
            input.tier,
            "female",
            input.rural,
            coWifeIncome,
            country.gdpPerCapitaPpp,
        );
        const coWifeName = `${rng.pick(country.names.female)} ${input.surname}`;
        additionalMembers.push(
            makeAdditionalMember(
                "co-esposa",
                "co-esposa",
                coWifeName,
                "female",
                coWifeAge,
                country,
                coWifeOccupation.label,
                coWifeIncome,
                rng,
            ),
        );
    }

    const structureKey: string = weightedKey(rng, model.household.structureWeights, "nuclear");
    let structure: HouseholdState["structure"] = "nuclear";
    if (polygynous) structure = "compuesta";
    else if (structureKey === "monoparental") structure = "monoparental";
    else if (structureKey === "extendida") structure = "extendida";
    else if (structureKey === "compuesta") structure = "compuesta";

    const motherAbsent = structure === "monoparental" && rng.chance(22);
    const fatherAbsent = structure === "monoparental" && !motherAbsent;
    const effectiveFatherIncome = fatherAbsent ? Math.round(fatherIncome * 0.15) : fatherIncome;
    const effectiveMotherIncome = motherAbsent ? Math.round(motherIncome * 0.15) : motherIncome;

    if (structure === "extendida" && rng.chance(model.household.grandparentInHouseholdProbabilityPct)) {
        const grandparentSex: Sex = rng.chance(52) ? "female" : "male";
        const grandparentAge = rng.int(58, 79);
        additionalMembers.push(
            makeAdditionalMember(
                `abuelo-${grandparentSex}`,
                grandparentSex === "female" ? "abuela" : "abuelo",
                `${rng.pick(grandparentSex === "female" ? country.names.female : country.names.male)} ${input.surname}`,
                grandparentSex,
                grandparentAge,
                country,
                grandparentAge >= 65 ? "jubilación" : rng.pick(["apoyo en el hogar", "pequeño comercio", "trabajo agrícola"]),
                grandparentAge >= 65 ? Math.round(country.gdpPerCapitaPpp * 0.12) : Math.round(country.gdpPerCapitaPpp * 0.2),
                rng,
            ),
        );
    }

    const fatherStatus: ParentDetails["employmentStatus"] = fatherOccupation.id === "farm-owner" || fatherOccupation.id === "shop-owner" || fatherOccupation.id === "artist"
        ? "self-employed"
        : "employed";
    const motherStatus: ParentDetails["employmentStatus"] = motherOccupation
        ? (motherOccupation.id === "shop-owner" || motherOccupation.id === "artist" ? "self-employed" : "employed")
        : "unemployed";

    const father: ParentDetails = {
        name: input.fatherName,
        age: input.fatherAge,
        occupation: fatherAbsent ? `${fatherOccupation.label} (fuera del hogar)` : fatherOccupation.label,
        sex: "male",
        education: fatherEducation,
        occupationId: fatherOccupation.id,
        sector: fatherOccupation.sector,
        annualIncome: effectiveFatherIncome,
        employmentStatus: fatherStatus,
        health: parentHealthEstimate(rng, country.code, input.fatherAge),
        alive: true,
        relationshipQuality: rng.int(42, 86),
        inHousehold: !fatherAbsent,
        inLaborForce: true,
        informal: rng.chance((1 - fatherOccupation.formality) * 100),
        incomeIsSupport: fatherAbsent,
    };
    const mother: ParentDetails = {
        name: input.motherName,
        age: input.motherAge,
        occupation: motherOccupation?.label ?? (motherAbsent ? "fuera del hogar" : "trabajo de cuidados no remunerado"),
        sex: "female",
        education: motherEducation,
        occupationId: motherOccupation?.id,
        sector: motherOccupation?.sector ?? "cuidados",
        annualIncome: effectiveMotherIncome,
        employmentStatus: motherStatus,
        health: parentHealthEstimate(rng, country.code, input.motherAge),
        alive: true,
        relationshipQuality: rng.int(44, 89),
        inHousehold: !motherAbsent,
        inLaborForce,
        informal: motherOccupation ? rng.chance((1 - motherOccupation.formality) * 100) : false,
        incomeIsSupport: motherAbsent,
    };

    const annualHouseholdIncome = Math.max(
        1,
        Math.round(effectiveFatherIncome + effectiveMotherIncome + coWifeIncome + baseTarget * 0.06),
    );
    const expenseShare = model.household.expenseShareByTier[tierKey] ?? 0.7;
    const annualExpenses = Math.round(annualHouseholdIncome * expenseShare);
    const monthlyIncome = annualHouseholdIncome / 12;
    const taxes = Math.round(annualExpenses * 0.18);
    const cashExpenses = Math.max(0, annualExpenses - taxes);
    const housingCost = Math.round(cashExpenses * 0.32);
    const foodCost = Math.round(cashExpenses * 0.27);
    const educationCost = Math.round(cashExpenses * 0.1);
    const healthCost = Math.round(cashExpenses * 0.08);
    const otherCost = Math.max(0, cashExpenses - housingCost - foodCost - educationCost - healthCost);
    const savings = Math.round(monthlyIncome * (model.household.savingsMonthsByTier[tierKey] ?? 0.6) * (0.6 + rng.next() * 0.8));
    const debt = Math.round(monthlyIncome * (model.household.debtMonthsByTier[tierKey] ?? 0.5) * (rng.chance(58) ? 1 : 0));
    const assets = Math.round(annualHouseholdIncome * (model.household.assetYearsByTier[tierKey] ?? 1));
    const budget: HouseholdBudget = {
        annualIncome: annualHouseholdIncome,
        annualExpenses,
        housingCost,
        foodCost,
        educationCost,
        healthCost,
        otherCost,
        taxes,
        disposableIncome: annualHouseholdIncome - annualExpenses,
        savings,
        debt,
        assets,
    };

    const tenure = weightedKey(rng, model.household.housingTenureWeights[tierKey] ?? {}, "alquiler") as HouseholdState["housingTenure"];
    const housingDescription: Record<HouseholdState["housingTenure"], string> = {
        propiedad: "Vivienda en propiedad",
        hipoteca: "Vivienda en propiedad con hipoteca",
        alquiler: "Vivienda alquilada",
        compartida: "Vivienda compartida con otros hogares",
        informal: "Vivienda precaria o autoconstruida",
    };

    const structureLabels: Record<HouseholdState["structure"], string> = {
        nuclear: "Familia nuclear",
        monoparental: "Familia monoparental",
        extendida: "Hogar extendido",
        compuesta: "Hogar poligínico",
    };
    const siblingCount = Math.max(1, input.householdSize - 2);
    const inheritanceEstimate = Math.round(
        (budget.assets * 0.72) / Math.max(1, siblingCount),
    );
    const supportLevel = Math.round(
        clamp((model.household.supportLevelByTier[tierKey] ?? 50) + rng.int(-12, 12), 0, 100),
    );
    const supportCapacity = Math.max(0, budget.disposableIncome);
    const household: HouseholdState = {
        version: 2,
        structure,
        structureLabel: polygynous ? "Hogar poligínico" : structureLabels[structure],
        housingTenure: tenure,
        budget,
        additionalMembers,
        religion,
        religiosity,
        context: {
            marriageSystem: context.marriageSystem,
            polygynyLegal: context.polygynyLegal,
            genderWageGapPct: context.genderWageGapPct,
            femaleLaborParticipationPct: context.femaleLaborParticipationPct,
            source: context.contextSource,
            provisional: context.provisional,
        },
        support: {
            level: supportLevel,
            annualSupport: Math.round(supportCapacity * model.household.parentSupportDisposableShare * (supportLevel / 100)),
            canLend: budget.savings > monthlyIncome * 0.5 && tierKey !== "1",
            maxLoan: Math.round(
                monthlyIncome *
                model.household.maxFamilyLoanMonthsOfIncome *
                (supportLevel / 100),
            ),
        },
        funeralCostEstimate: Math.round(
            Math.max(250, monthlyIncome * (model.household.funeralMonthsOfIncomeByTier[tierKey] ?? 1.2)),
        ),
        inheritanceEstimate,
    };

    const parentEducationResult =
        educationRank(fatherEducation) >= educationRank(motherEducation) ? fatherEducation : motherEducation;

    return {
        mother,
        father,
        household,
        religion,
        annualHouseholdIncome,
        parentEducation: parentEducationResult,
        housingDescription: housingDescription[tenure],
    };
}

export function householdSourceSummary(): { version: string; status: string; sources: string[]; notes: string[] } {
    const model = realismModel();
    return {
        version: model.version,
        status: model.status,
        sources: model.sources.map((source) => `${source.name} (${source.license})`),
        notes: model.notes,
    };
}

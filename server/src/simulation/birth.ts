import type {
    BirthProfile,
    Era,
    GameConfig,
    Sex,
} from "@life-duel/shared";
import { clamp, EDUCATION_META, ERA_META, ERA_YEAR_RANGES } from "@life-duel/shared";
import { countryName, getCountry, listCountries } from "../demographics/dataset.js";
import { createRng, deriveSeed } from "./rng.js";
import { generateHousehold } from "./household.js";

const FAMILY_LABELS = [
    "Recursos muy limitados",
    "Clase trabajadora",
    "Clase media",
    "Clase media-alta",
    "Recursos holgados",
] as const;

const FAMILY_STORY: Record<number, string> = {
    1: "La casa es pequeña y el mes se organiza con lo justo. Aun así, hay normas, afecto y una red de vecinos que se ayudan.",
    2: "Se trabaja mucho y se habla poco de dinero. La familia conoce el valor de cada factura y la importancia de no deber favores.",
    3: "Hay una mesa compartida, libros en casa y la sensación de que un imprevisto se puede resolver con esfuerzo.",
    4: "La familia tiene ahorros, contactos y planes. No todo está resuelto, pero las puertas suelen abrirse con una llamada.",
    5: "Creciste entre recursos, viajes y expectativas altas. La abundancia también tiene sus propias reglas y silencios.",
};

function pickFamilyTier(incomeGroup: string, rng: ReturnType<typeof createRng>): 1 | 2 | 3 | 4 | 5 {
    const weights: Record<string, number[]> = {
        alto: [5, 11, 27, 33, 24],
        "medio-alto": [11, 21, 31, 25, 12],
        "medio-bajo": [27, 31, 25, 13, 4],
        bajo: [39, 31, 19, 8, 3],
    };
    const tiers = [1, 2, 3, 4, 5] as const;
    const selected = rng.weighted(tiers, (tier) => weights[incomeGroup]?.[tier - 1] ?? 20);
    return selected;
}


function pickSex(rng: ReturnType<typeof createRng>): Sex {
    // Proporción de nacimientos ligeramente favorable a los varones.
    return rng.chance(51) ? "male" : "female";
}

function eraForYear(year: number): Era {
    if (year < 1990) return "past";
    if (year < 2035) return "present";
    return "future";
}

export function createBirth(worldSeed: string, config: GameConfig): BirthProfile {
    const countries = listCountries();
    if (countries.length === 0) throw new Error("No hay países disponibles en el conjunto demográfico.");

    const countryRng = createRng(deriveSeed(worldSeed, "birth", "country"));
    let country;
    if (config.countryMode === "fixed") {
        if (!config.fixedCountry) throw new Error("La configuración fija requiere un país.");
        country = getCountry(config.fixedCountry);
    } else if (config.countryMode === "random") {
        country = countryRng.pick(countries);
    } else {
        country = countryRng.weighted(countries, (entry) => config.countryMode === "population" ? entry.populationMillions : entry.birthsThousands);
    }

    const yearRng = createRng(deriveSeed(worldSeed, "birth", "year"));
    const range = ERA_YEAR_RANGES[config.era];
    const year = config.fixedYear ?? yearRng.int(range[0], range[1]);
    const era = config.fixedYear ? eraForYear(config.fixedYear) : config.era;

    const sexRng = createRng(deriveSeed(worldSeed, "birth", "sex"));
    const sex = pickSex(sexRng);

    const familyRng = createRng(deriveSeed(worldSeed, "birth", "family"));
    const tier = config.storyMode ? familyRng.pick([1, 2, 3, 4, 5] as const) : pickFamilyTier(country.incomeGroup, familyRng);
    const householdSize = clamp(familyRng.int(2, 5) + (5 - tier), 3, 9);
    const wealthLevel = Math.round(clamp(tier * 18 + familyRng.int(-8, 8), 2, 98));

    const nameRng = createRng(deriveSeed(worldSeed, "birth", "names"));
    const givenName = nameRng.pick(sex === "female" ? country.names.female : country.names.male);
    const surname = nameRng.pick(country.names.surnames);
    const city = nameRng.pick(country.cities);

    const statsRng = createRng(deriveSeed(worldSeed, "birth", "stats"));
    const initialStats = {
        health: Math.round(
            clamp(
                46 + tier * 5 + country.derived.healthcareAccess * 0.16 + statsRng.normal(0, 4),
                22,
                92,
            ),
        ),
        happiness: Math.round(
            clamp(42 + tier * 4 + statsRng.normal(0, 6) + (country.derived.socialSafetyNet - 50) * 0.06, 18, 90),
        ),
        knowledge: Math.round(
            clamp(
                12 +
                tier * 3 +
                country.derived.educationQuality * 0.16 +
                country.meanYearsSchooling * 0.9 +
                statsRng.normal(0, 3),
                8,
                78,
            ),
        ),
        relationships: Math.round(
            clamp(42 + householdSize * 2.2 + tier * 1.6 + statsRng.normal(0, 5), 18, 90),
        ),
    };

    const familyLabel = FAMILY_LABELS[tier - 1] ?? FAMILY_LABELS[2];

    const detailRng = createRng(deriveSeed(worldSeed, "birth", "details"));
    const rural = !detailRng.chance(country.urbanShare);
    const motherAge = detailRng.int(20, 39);
    const usedNames = new Set([givenName]);
    const siblings = Array.from({ length: Math.max(0, householdSize - 3) }, () => {
        const siblingSex = pickSex(detailRng);
        const pool = siblingSex === "female" ? country.names.female : country.names.male;
        const available = pool.filter(name => !usedNames.has(name));
        const siblingName = detailRng.pick(available.length ? available : pool);
        usedNames.add(siblingName);
        return { name: siblingName, age: detailRng.int(1, Math.min(16, motherAge - 17)), sex: siblingSex };
    }).sort((a, b) => b.age - a.age);
    const motherName = `${detailRng.pick(country.names.female)} ${surname}`;
    const fatherName = `${detailRng.pick(country.names.male)} ${surname}`;
    const fatherAge = motherAge + detailRng.int(0, 8);
    const generated = generateHousehold({
        seed: worldSeed,
        country,
        year,
        tier,
        householdSize,
        rural,
        motherAge,
        fatherAge,
        motherName,
        fatherName,
        surname,
        storyMode: Boolean(config.storyMode),
    });

    return {
        details: {
            registrationId: `${country.code}-${year}-${detailRng.int(1000000, 9999999)}`,
            religion: generated.religion,
            month: detailRng.int(1, 12), rural,
            mother: generated.mother,
            father: generated.father,
            siblings, housing: generated.housingDescription,
            annualHouseholdIncome: generated.annualHouseholdIncome,
            household: generated.household,
            birthShare: country.birthsThousands / countries.reduce((sum, entry) => sum + entry.birthsThousands, 0),
            country: { region: country.region, populationMillions: country.populationMillions, birthsThousands: country.birthsThousands, infantMortalityPer1000: country.infantMortalityPer1000, gdpPerCapitaPpp: country.gdpPerCapitaPpp, gini: country.gini, meanYearsSchooling: country.meanYearsSchooling, urbanShare: country.urbanShare },
        },
        countryCode: country.code,
        countryName: country.name,
        year,
        era,
        sex,
        givenName,
        surname,
        location: rural ? `Zona rural de ${country.name}` : city,
        family: {
            tier,
            label: familyLabel,
            wealthLevel,
            parentEducation: generated.parentEducation,
            householdSize,
            story: `${FAMILY_STORY[tier]} La familia vive en ${rural ? `una zona rural de ${country.name}` : `${city}, ${country.name}`}. ${generated.parentEducation === "none"
                ? "Ninguno de tus cuidadores terminó la escuela primaria."
                : `Uno de tus cuidadores alcanzó ${EDUCATION_META[generated.parentEducation].label.toLowerCase()}.`}`,
        },
        initialStats,
        currencyCode: country.currency.code,
        currencySymbol: country.currency.symbol,
        localPerIntlDollar: country.currency.localPerIntlDollar,
        lifeExpectancyAtBirth:
            sex === "female" ? country.lifeExpectancy.female : country.lifeExpectancy.male,
        lifeExpectancySource: "UN World Population Prospects 2024 (dataset 2024.1-demo)",
    };
}

export function birthSummary(birth: BirthProfile): string {
    return `${birth.givenName} nace en ${birth.location}, ${countryName(birth.countryCode)}, en ${birth.year}. ${ERA_META[birth.era].label}, familia ${birth.family.label.toLowerCase()}.`;
}

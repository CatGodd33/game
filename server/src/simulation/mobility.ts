import type {
    CharacterState,
    MobilityCostLine,
    MobilityFamilyCost,
    MobilityFamilyMode,
    MobilityOffer,
    MobilityPurpose,
    MobilityRequest,
    MobilityResponse,
} from "@life-duel/shared";
import { clamp, EDUCATION_META } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { getCountry, listCountries } from "../demographics/dataset.js";
import { countryProfile } from "./country-context.js";
import { migrate, spend } from "./economy.js";
import { createRng, deriveSeed } from "./rng.js";

const PURPOSE_META: Record<MobilityPurpose, { label: string; minAge: number; maxAge: number }> = {
    study: { label: "Estudiar fuera", minAge: 17, maxAge: 55 },
    work: { label: "Trabajar fuera", minAge: 18, maxAge: 64 },
    live: { label: "Vivir fuera", minAge: 18, maxAge: 78 },
};

const PURPOSE_ICON: Record<MobilityPurpose, string> = {
    study: "graduation-cap",
    work: "briefcase",
    live: "home",
};

function costLine(concept: string, amount: number, note?: string): MobilityCostLine {
    return { concept, amount: Math.max(0, Math.round(amount)), ...(note ? { note } : {}) };
}

function dependentChildren(character: CharacterState): number {
    return Math.max(
        character.children,
        (character.story?.relatives ?? []).filter(
            (relative) => relative.role === "child" && relative.alive && relative.generation !== "grandchild",
        ).length,
    );
}

function opportunityChance(character: CharacterState, purpose: MobilityPurpose): number {
    const rank = EDUCATION_META[character.educationLevel].rank;
    const language = character.flags?.includes("idioma_ingles") || character.flags?.includes("idioma_estudiado") ? 7 : 0;
    const agePenalty = character.age > 40 ? (character.age - 40) * 0.8 : 0;
    const base =
        purpose === "study"
            ? 48 + rank * 6 + character.stats.knowledge * 0.22
            : purpose === "work"
                ? 38 + rank * 5 + character.stats.knowledge * 0.25 + Math.min(12, character.employment.yearsInRole * 1.4)
                : 42 + character.stats.knowledge * 0.12 + Math.min(10, character.finance.money / 1200);
    return Math.round(clamp(base + language - agePenalty, 18, 92));
}

function familyLines(
    character: CharacterState,
    base: MobilityCostLine[],
    mode: MobilityFamilyMode,
    travelPerPerson: number,
    monthlyLiving: number,
    deposit: number,
): MobilityFamilyCost {
    const partnerExists = Boolean(character.partnerName);
    const children = dependentChildren(character);
    const lines = [...base];
    let extraPeople = 0;
    let blockedReason: string | undefined;

    if (mode === "partner") {
        if (!partnerExists) blockedReason = "No tienes pareja para acompañarte.";
        else {
            extraPeople = 1;
            lines.push(
                costLine(
                    "Billete, visado y seguro de tu pareja",
                    travelPerPerson,
                    "El viaje y los trámites se cobran por persona.",
                ),
                costLine("Colchón de dos meses para la pareja", monthlyLiving * 2),
            );
        }
    }

    if (mode === "family") {
        if (!partnerExists && children === 0) {
            blockedReason = "No hay pareja ni hijos que puedan acompañarte.";
        } else if (children === 0) {
            blockedReason = "La modalidad familiar requiere al menos un hijo.";
        } else {
            extraPeople = (partnerExists ? 1 : 0) + children;
            if (partnerExists) lines.push(costLine("Billete, visado y seguro de tu pareja", travelPerPerson));
            if (children > 0) {
                lines.push(
                    costLine(
                        `Billetes, visados y seguros de ${children} hijo${children === 1 ? "" : "s"}`,
                        travelPerPerson * children,
                    ),
                    costLine("Habitación y vida familiar", deposit * 0.35 + monthlyLiving * children * 1.8),
                );
            }
        }
    }

    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    return {
        mode,
        label: mode === "solo" ? "Solo/a" : mode === "partner" ? "Con tu pareja" : "Con toda la familia",
        total,
        localTotal: Math.round(total * character.currentCurrency.localPerIntlDollar),
        extraPeople,
        lines,
        ...(blockedReason ? { blockedReason } : {}),
    };
}

function buildOffer(
    game: StoredGame,
    character: CharacterState,
    countryCode: string,
    purpose: MobilityPurpose,
): MobilityOffer | null {
    const destination = getCountry(countryCode);
    const origin = getCountry(character.currentCountry);
    if (destination.code === origin.code) return null;
    const profile = countryProfile(destination.code);
    const meta = PURPOSE_META[purpose];
    const sameRegion = origin.region === destination.region;
    const flight = Math.round(origin.gdpPerCapitaPpp * (sameRegion ? 0.014 : 0.032));
    const visa = Math.round(destination.gdpPerCapitaPpp * (0.0025 + (profile.visaDifficulty / 100) * 0.009));
    const insurance = Math.round(destination.gdpPerCapitaPpp * 0.003);
    const deposit = Math.round(
        destination.gdpPerCapitaPpp * profile.monthlyShares.housing * profile.rentDepositMonths,
    );
    const installation = Math.round(destination.gdpPerCapitaPpp * 0.006);
    const tuition =
        purpose === "study" ? Math.round(destination.gdpPerCapitaPpp * (profile.socialPressure.education > 65 ? 0.055 : 0.075)) : 0;
    const monthlyLiving = Math.round(
        (destination.gdpPerCapitaPpp / 12) *
        (profile.monthlyShares.housing +
            profile.monthlyShares.food +
            profile.monthlyShares.utilities +
            profile.monthlyShares.transport +
            profile.monthlyShares.health),
    );
    const buffer = monthlyLiving * 3;
    const base: MobilityCostLine[] = [
        costLine("Vuelo internacional", flight, "Estimación de juego, no una tarifa aérea real."),
        costLine("Visado, tasas y documentación", visa, "Coste administrativo estimado; no garantiza la aprobación."),
        costLine("Seguro médico inicial", insurance),
        costLine("Depósito y primer mes de vivienda", deposit + monthlyLiving),
        costLine("Instalación, transporte local y trámites", installation),
        ...(tuition > 0 ? [costLine("Matrícula estimada del primer año", tuition)] : []),
        costLine("Colchón para tres meses", buffer, "Necesario para no llegar sin margen."),
    ];
    const travelPerPerson = flight + visa + insurance;
    const familyCosts = (["solo", "partner", "family"] as MobilityFamilyMode[]).map((mode) => {
        const cost = familyLines(character, base, mode, travelPerPerson, monthlyLiving, deposit);
        if (character.finance.money < cost.total) {
            cost.blockedReason = `Te faltan ${Math.round(cost.total - character.finance.money).toLocaleString("es")} USD PPP para este traslado.`;
        }
        return cost;
    });

    const rank = EDUCATION_META[character.educationLevel].rank;
    const requirements: string[] = [];
    const warnings = [
        "Presupuesto de simulación en dólares internacionales (PPP); no es una oferta real de viaje, visado ni matrícula.",
        "La residencia cambia, pero la ciudadanía y el país de nacimiento no.",
    ];
    if (purpose === "study") {
        requirements.push("Educación secundaria o superior.");
        if (rank < 2) requirements.push("Necesitas completar la secundaria.");
    }
    if (purpose === "work") {
        requirements.push("Formación profesional o conocimiento suficiente.");
        if (rank < 3 && character.stats.knowledge < 45) {
            requirements.push("Necesitas formación o experiencia demostrable.");
        }
    }
    if (purpose === "live") requirements.push("Ser adulto y disponer de un colchón económico.");
    if (character.age < meta.minAge) requirements.push(`Edad mínima: ${meta.minAge} años.`);
    if (character.age > meta.maxAge) requirements.push(`Edad máxima orientativa: ${meta.maxAge} años.`);

    let blockedReason: string | undefined;
    if (character.age < meta.minAge) blockedReason = `Este proyecto empieza a los ${meta.minAge} años.`;
    else if (character.age > meta.maxAge) blockedReason = "La edad hace inviable este proyecto en el modelo actual.";
    else if (purpose === "study" && rank < 2) blockedReason = "Primero necesitas completar la educación secundaria.";
    else if (purpose === "work" && rank < 3 && character.stats.knowledge < 45) {
        blockedReason = "Necesitas formación profesional o más conocimiento para optar a un empleo cualificado.";
    } else if (character.finance.money < familyCosts[0]!.total) {
        blockedReason = `Te faltan ${Math.round(familyCosts[0]!.total - character.finance.money).toLocaleString("es")} USD PPP para viajar solo/a.`;
    }

    const city = destination.cities[0] ?? destination.name;

    return {
        id: `${purpose}:${destination.code}`,
        countryCode: destination.code,
        countryName: destination.name,
        city,
        purpose,
        purposeLabel: meta.label,
        currency: {
            code: destination.currency.code,
            symbol: destination.currency.symbol,
            localPerIntlDollar: destination.currency.localPerIntlDollar,
        },
        flight,
        visa,
        insurance,
        deposit,
        installation,
        tuition,
        monthlyLiving,
        successChance: opportunityChance(character, purpose),
        requirements,
        warnings,
        eligible: !blockedReason,
        ...(blockedReason ? { blockedReason } : {}),
        familyCosts,
    };
}

export function mobilityOptions(game: StoredGame, character: CharacterState): MobilityResponse {
    const offers: MobilityOffer[] = [];
    for (const country of listCountries()) {
        for (const purpose of Object.keys(PURPOSE_META) as MobilityPurpose[]) {
            const offer = buildOffer(game, character, country.code, purpose);
            if (offer) offers.push(offer);
        }
    }
    offers.sort((first, second) => {
        if (first.purpose !== second.purpose) return first.purpose.localeCompare(second.purpose);
        return first.countryName.localeCompare(second.countryName, "es");
    });
    return {
        currentCountry: character.currentCountry,
        currentLocation: character.currentLocation,
        money: character.finance.money,
        offers,
    };
}

export interface MobilityResult {
    text: string;
    success: boolean;
    offer: MobilityOffer;
    family: MobilityFamilyCost;
}

export function executeMobility(
    game: StoredGame,
    character: CharacterState,
    input: MobilityRequest,
): MobilityResult {
    const response = mobilityOptions(game, character);
    const offer = response.offers.find((candidate) => candidate.id === input.optionId);
    if (!offer) throw new Error("El destino ya no está disponible.");
    const family = offer.familyCosts.find((candidate) => candidate.mode === input.familyMode);
    if (!family) throw new Error("Modalidad familiar no válida.");
    if (family.blockedReason) throw new Error(family.blockedReason);
    if (!offer.eligible) throw new Error(offer.blockedReason ?? "Este proyecto no cumple los requisitos.");
    if (character.finance.money < family.total) throw new Error("No tienes fondos suficientes para esta mudanza.");

    const fingerprint = JSON.stringify({
        optionId: input.optionId,
        familyMode: input.familyMode,
    });
    character.actionKeys ??= {};
    const previous = character.actionKeys[input.idempotencyKey];
    if (previous) {
        if (previous !== fingerprint) throw new Error("Esta clave ya identifica otra operación.");
        return { text: "La mudanza ya estaba registrada.", success: true, offer, family };
    }

    const year = game.currentYear;
    const month = character.liveEconomy?.month ?? 0;
    // Cada intento pagado abre una nueva evaluación, nunca una repetición gratuita del mismo sorteo.
    const attempt = (character.manualActions ?? []).filter((action) => action.action === "mobility").length;
    const rng = createRng(
        deriveSeed(game.seed, "mobility", character.id, offer.id, input.familyMode, year, month, attempt),
    );
    const success = rng.chance(offer.successChance);
    const destination = getCountry(offer.countryCode);

    if (success) {
        spend(character, family.total, `Traslado y proyectos en ${destination.name}`, year, false);
        migrate(character, destination.code, offer.city, year);
        character.flags ??= [];
        character.flags.push(`migracion_${destination.code.toLowerCase()}`, "experiencia_internacional");
        character.manualActions = [
            ...(character.manualActions ?? []),
            {
                year,
                month,
                action: "mobility",
                text: `Te mudaste a ${offer.city}, ${destination.name}. El proyecto era ${offer.purposeLabel.toLowerCase()}. El coste total fue ${family.total.toLocaleString("es")} USD PPP; viajaste ${family.extraPeople > 0 ? `con ${family.extraPeople} persona${family.extraPeople === 1 ? "" : "s"}` : "solo/a"}.`,
            },
        ];
        character.milestones.push({
            id: `mobility-${character.id}-${year}-${destination.code}`,
            age: character.age,
            year,
            title: `Nueva vida en ${destination.name}`,
            category: "migracion",
        });

        if (offer.purpose === "study") {
            character.employment = {
                ...character.employment,
                status: "student",
                occupation: `Estudios en ${destination.name}`,
                sector: "Educación",
                yearsInRole: 0,
                contractQuality: 50,
            };
            character.stats = {
                ...character.stats,
                knowledge: clamp(character.stats.knowledge + 7),
                relationships: clamp(character.stats.relationships + (input.familyMode === "solo" ? -2 : 3)),
                happiness: clamp(character.stats.happiness + 3),
            };
            character.flags.push("estudios_exterior");
        } else if (offer.purpose === "work") {
            character.employment = {
                status: "employed",
                occupation: `${offer.purposeLabel} · ${destination.name}`,
                sector: "Servicios",
                yearsInRole: 0,
                contractQuality: 64,
                occupationId: "international",
            };
            character.incomeModifier = Math.round((character.incomeModifier + 0.08) * 100) / 100;
            character.stats = {
                ...character.stats,
                happiness: clamp(character.stats.happiness + 2),
                relationships: clamp(character.stats.relationships + (input.familyMode === "solo" ? -3 : 2)),
            };
            character.flags.push("trabajo_exterior");
        } else {
            character.employment = {
                status: "unemployed",
                occupation: null,
                sector: null,
                yearsInRole: 0,
                contractQuality: 45,
            };
            character.stats = {
                ...character.stats,
                happiness: clamp(character.stats.happiness + 4),
                relationships: clamp(character.stats.relationships + (input.familyMode === "solo" ? -3 : 4)),
                knowledge: clamp(character.stats.knowledge + 2),
            };
            character.flags.push("residencia_exterior");
        }

        if (input.familyMode === "solo" && character.partnerName) {
            character.partnerProfile = character.partnerProfile
                ? { ...character.partnerProfile, sharedHousehold: false }
                : undefined;
            character.manualActions!.push({
                year,
                month,
                text: `${character.partnerName} se quedó en el país de origen. La relación entra en una etapa a distancia que exigirá viajes, horarios y conversaciones incómodas.`,
            });
        }
    } else {
        const lost = offer.visa + offer.insurance;
        spend(character, lost, `Trámites de movilidad a ${destination.name}`, year, false);
        character.flags ??= [];
        character.flags.push("visa_rechazada");
        character.manualActions = [
            ...(character.manualActions ?? []),
            {
                year,
                month,
                action: "mobility",
                text: `El expediente para ${offer.city}, ${destination.name}, no prosperó. Perdiste ${lost.toLocaleString("es")} USD PPP en tasas y seguro. La vida sigue donde estaba, con una puerta que no se cerró del todo.`,
            },
        ];
        character.stats = {
            ...character.stats,
            happiness: clamp(character.stats.happiness - 3),
        };
        if (character.psychology) character.psychology.stress = clamp(character.psychology.stress + 3);
    }

    character.actionKeys[input.idempotencyKey] = fingerprint;
    return {
        text: success
            ? `Te has mudado a ${offer.city}, ${destination.name}.`
            : `No pudiste completar el traslado a ${destination.name}. Los trámites no salieron adelante.`,
        success,
        offer,
        family,
    };
}

export const MOBILITY_PURPOSE_ICON = PURPOSE_ICON;

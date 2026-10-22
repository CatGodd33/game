import type {
    BirthProfile,
    CharacterState,
    GameConfig,
    LifeStory,
    Relative,
} from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { adjustDebt, grant } from "./economy.js";
import { rollDeath } from "./mortality.js";
import { griefFromLoss } from "./psychology.js";
import { createRng, deriveSeed } from "./rng.js";

const ROLE_LABELS: Record<Relative["role"], string> = {
    mother: "tu madre",
    father: "tu padre",
    sibling: "tu hermano o hermana",
    child: "tu hijo o hija",
    partner: "tu pareja",
    grandmother: "tu abuela",
    grandfather: "tu abuelo",
};

const CLOSENESS: Record<Relative["role"], number> = {
    mother: 90,
    father: 82,
    sibling: 68,
    child: 95,
    partner: 88,
    grandmother: 58,
    grandfather: 58,
};

export function relativeCurrentAge(relative: Relative, year: number): number {
    return Math.max(0, year - relative.bornYear);
}

function relativeProxy(character: CharacterState, birth: BirthProfile, relative: Relative, age: number): CharacterState {
    const country = getCountry(birth.countryCode);
    const health = clamp(relative.health ?? 68, 5, 100);
    // Un pariente no hereda el empleo, las banderas, los negocios ni la
    // psicología del jugador. La mortalidad solo debe leer sus circunstancias
    // demográficas y su propia salud.
    return {
        ...character,
        age,
        sex: relative.sex,
        currentCountry: birth.countryCode,
        birthCountry: birth.countryCode,
        countriesLived: [birth.countryCode],
        finance: {
            money: 1500,
            annualIncome: 1500,
            annualExpenses: 1200,
            debt: 0,
            ledger: [],
        },
        employment: {
            status: age < 18 ? "child" : age < 65 ? "employed" : "retired",
            occupation: null,
            sector: null,
            yearsInRole: 0,
            contractQuality: 0.5,
            occupationId: null,
        },
        stats: { ...character.stats, health, happiness: 55, knowledge: 50, relationships: 55 },
        chronicConditions: health < 32 ? ["fragilidad"] : [],
        medicalHistory: [],
        milestones: [],
        pendingEffects: [],
        flags: [],
        psychology: undefined,
        credit: undefined,
        business: null,
        loans: [],
        usedDecisionIds: [],
        incomeModifier: 1,
        expenseModifier: 1,
        healthPlan: country.derived.healthcareAccess >= 70 ? "basico" : "ninguno",
        alive: true,
        causeOfDeath: null,
        ageAtDeath: null,
        story: undefined,
    };
}

function parentRole(relative: Relative): "mother" | "father" | null {
    if (relative.role === "mother" || relative.role === "father") return relative.role;
    return null;
}

function queueFuneral(
    character: CharacterState,
    birth: BirthProfile,
    relative: Relative,
    year: number,
    lines: string[],
): void {
    if (relative.funeralSettled) return;
    // La muerte no cobra nada por sí sola: el jugador decide después cómo
    // despedirse. `funeralSettled` evita volver a encolar el mismo deceso.
    relative.funeralSettled = true;
    const household = birth.details?.household;
    const country = getCountry(character.currentCountry);
    const factor =
        relative.role === "child" ? 0.7 :
            relative.role === "partner" ? 0.9 :
                relative.role === "sibling" || relative.role === "grandmother" || relative.role === "grandfather" ? 0.5 : 1;
    // El presupuesto doméstico puede ser alto en algunos hogares, pero una
    // ceremonia no debe costar varias veces el PIB anual. El límite es una
    // regla de juego explícita, no una estadística oficial.
    const reference = Math.max(120, Math.round(country.gdpPerCapitaPpp * 0.16));
    const estimate = Math.min(household?.funeralCostEstimate ?? reference, reference * 2);
    const cost = Math.max(120, Math.round(estimate * factor));
    character.pendingFunerals = [
        ...(character.pendingFunerals ?? []),
        {
            id: `funeral-${character.id}-${relative.id}-${year}`,
            relativeId: relative.id,
            relativeName: relative.name,
            relationship: ROLE_LABELS[relative.role],
            year,
            baseCost: cost,
        },
    ];
    if (character.age < 18) {
        lines.push("Los preparativos del funeral quedaron en manos de tu familia. Cuando seas mayor recordarás el silencio de aquellos días.");
    } else {
        lines.push(`${relative.name} ha muerto. La familia espera una decisión sobre la despedida; todavía no se ha cargado ningún gasto.`);
    }
}

function forgiveFamilyDebt(
    character: CharacterState,
    relative: Relative,
    year: number,
    lines: string[],
): void {
    let forgiven = 0;
    for (const loan of character.loans ?? []) {
        if (!loan.active || loan.balance <= 0) continue;
        // Si el préstamo identifica a su acreedor, solo esa muerte lo condona.
        // El vínculo genérico con un progenitor es el respaldo para partidas
        // antiguas que no guardaban `creditorRelativeId`.
        const linked = loan.creditorRelativeId
            ? loan.creditorRelativeId === relative.id
            : loan.lender === "familia" && (relative.role === "mother" || relative.role === "father");
        if (!linked) continue;
        forgiven += loan.balance;
        adjustDebt(character, -loan.balance, `Deuda condonada por el fallecimiento de ${relative.name}`, year);
        loan.balance = 0;
        loan.active = false;
    }
    if (forgiven > 0) {
        lines.push(`La deuda que tenías con ${relative.name} quedó cancelada. Nadie de su familia volvió a reclamártela.`);
        character.flags = [...new Set([...(character.flags ?? []), "deuda_familiar_condonada"])];
        character.milestones.push({
            id: `ms-forgiven-${character.id}-${relative.id}-${year}`,
            age: character.age,
            year,
            title: `Deuda familiar condonada por ${relative.name}`,
            category: "dinero",
        });
    }
}

function markParentDead(birth: BirthProfile, relative: Relative): void {
    const role = parentRole(relative);
    if (!role || !birth.details) return;
    const parent = birth.details[role];
    parent.alive = false;
    parent.deathAge = relative.deathAge;
    parent.causeOfDeath = relative.causeOfDeath;
}

export function settleInheritance(
    character: CharacterState,
    birth: BirthProfile,
    story: LifeStory,
    year: number,
): string[] {
    if (story.familySettled) return [];
    const mother = story.relatives.find((relative) => relative.role === "mother");
    const father = story.relatives.find((relative) => relative.role === "father");
    if (mother?.alive !== false || father?.alive !== false) return [];
    if (character.age < 18) {
        if (!(character.flags ?? []).includes("herencia_pendiente")) {
            character.flags = [...(character.flags ?? []), "herencia_pendiente"];
            return ["La herencia de tus padres queda en manos de tus tutores hasta que cumplas la mayoría de edad."];
        }
        return [];
    }
    story.familySettled = true;
    const estimate = birth.details?.household?.inheritanceEstimate ?? 0;
    character.flags = (character.flags ?? []).filter((flag) => flag !== "herencia_pendiente");
    if (estimate <= 0) {
        return ["No hubo bienes que heredar. Sí quedaron recuerdos, papeles y una casa que otros decidieron vender."];
    }
    grant(character, estimate, "Herencia familiar", year, "transfer");
    character.milestones.push({
        id: `ms-inheritance-${character.id}-${year}`,
        age: character.age,
        year,
        title: "Recibió la herencia familiar",
        category: "familia",
    });
    return [`La herencia de tus padres llegó a tu cuenta: ${estimate.toLocaleString("es")} USD PPP. No era solo dinero; también era una forma de cerrar una etapa.`];
}

/**
 * Evolución anual de la familia. La salud y la muerte de cada pariente se
 * calculan con su propia edad, sexo y salud, no con las del jugador. Los
 * fallecimientos generan duelo, funeral y, cuando corresponde, herencia.
 */
export function familyYear(
    seed: string,
    birth: BirthProfile,
    character: CharacterState,
    year: number,
    config: GameConfig,
): string[] {
    const story = character.story;
    const details = birth.details;
    if (!story || !details) return [];
    const country = getCountry(birth.countryCode);
    const lines: string[] = [];
    const household = details.household;

    for (const relative of story.relatives) {
        if (!relative.alive) continue;
        const age = relativeCurrentAge(relative, year);
        if (relative.role === "child" && relative.generation !== "grandchild" && age === 18) {
            relative.inHousehold = false;
            lines.push(`${relative.name} cumplió 18 años. Los cuidados infantiles dejan de formar parte del presupuesto; ayudar en su nueva etapa será una decisión propia.`);
        }
        const rng = createRng(deriveSeed(seed, "family-year", relative.id, year));
        const healthBase = relative.health ?? (relative.role === "mother" || relative.role === "father" ? 68 : 64);
        const ageDecline =
            age < 1 ? 0.3 :
                age < 18 ? 0.08 :
                    age < 45 ? 0.16 :
                        age < 65 ? 0.35 + (age - 45) * 0.03 :
                            0.8 + (age - 65) * 0.08;
        const access = country.derived.healthcareAccess / 100;
        relative.health = Math.round(clamp(healthBase - ageDecline + (access - 0.55) * 0.5 + rng.normal(0, 1.1), 5, 100) * 10) / 10;
        relative.relationshipQuality ??= Math.round(clamp(55 + rng.int(-15, 25), 0, 100));

        // Enfermedades y deterioro visible. No se inventan diagnósticos concretos
        // para cada año: solo se narran episodios cuando la salud ya es frágil.
        if (relative.health < 34 && rng.chance(22)) {
            const condition = country.derived.healthcareAccess >= 70 ? "un problema de salud tratable" : "una enfermedad sin tratamiento suficiente";
            lines.push(`${relative.name} atravesó ${condition}. La familia se organizó alrededor de las citas y los cuidados.`);
            relative.health = Math.round(clamp(relative.health - rng.int(1, 4), 5, 100) * 10) / 10;
        }

        const proxy = relativeProxy(character, birth, relative, age);
        const death = rollDeath(proxy, config.difficulty, createRng(deriveSeed(seed, "family-mortality", relative.id, year)));
        if (death.died) {
            relative.alive = false;
            relative.deathAge = age;
            relative.causeOfDeath = death.cause ?? "Causas naturales";
            markParentDead(birth, relative);
            const closeness = CLOSENESS[relative.role];
            griefFromLoss(character, closeness, age < 55);
            const label = relative.generation === "grandchild" ? "tu nieto o nieta" : ROLE_LABELS[relative.role];
            lines.push(`${relative.name}, ${label}, falleció a los ${age} años. ${relative.causeOfDeath}.`);
            if (relative.role === "partner" && relative.name === character.partnerName) {
                character.partnerName = null;
                character.partnerProfile = undefined;
                character.maritalStatus = "widowed";
                lines.push("La casa compartida se quedó con una sola voz. Aprendiste a llamar a otras personas para no hablarle al silencio.");
            }
            forgiveFamilyDebt(character, relative, year, lines);
            queueFuneral(character, birth, relative, year, lines);
            if (relative.role === "mother" || relative.role === "father") {
                character.flags = [...new Set([...(character.flags ?? []), `${relative.role}_fallecida`])];
                if (character.age < 18) {
                    character.flags = [...new Set([...(character.flags ?? []), "tutela_familiar"])];
                    lines.push("Tuviste que crecer con la ausencia y con decisiones que ya no podían consultarse.");
                }
            }
            if (relative.role === "child") {
                character.flags = [...new Set([...(character.flags ?? []), "hijo_fallecido"])];
            }
        } else if (relative.role === "child" && relative.generation !== "grandchild" && age >= 24 && age <= 44) {
            const last = story.lastGrandchildAge ?? -99;
            if (year - last >= 2 && rng.chance(16)) {
                character.grandchildren = Math.min(16, (character.grandchildren ?? 0) + 1);
                story.lastGrandchildAge = year;
                const sex = rng.chance(51) ? "male" : "female";
                const name = rng.pick(getCountry(character.currentCountry).names[sex === "female" ? "female" : "male"]);
                story.relatives.push({ id: `grandchild-${character.id}-${year}-${relative.id}`, role: "child", generation: "grandchild", parentId: relative.id, name, sex, bornYear: year, occupation: "", alive: true, health: 90, inHousehold: false });
                lines.push(`${relative.name} te dio un nieto. La familia volvió a organizarse alrededor de una vida que empezaba.`);
                character.stats.happiness = clamp(character.stats.happiness + 2);
                character.stats.relationships = clamp(character.stats.relationships + 2);
            }
        } else if (relative.health < 24 && rng.chance(35)) {
            lines.push(`${relative.name} necesitó ayuda para las tareas cotidianas. La familia aprendió a repartir el tiempo de otra manera.`);
        }

        const role = parentRole(relative);
        if (role) {
            const parent = details[role];
            const parentAge = age;
            if (parent && parent.alive !== false) {
                if (parentAge >= 65 && parent.employmentStatus !== "retired" && parent.inLaborForce) {
                    parent.employmentStatus = "retired";
                    parent.annualIncome = Math.round((parent.annualIncome ?? 0) * 0.42);
                    lines.push(`${parent.name} se jubiló. El ingreso del hogar cambió, aunque la casa siguió funcionando con otras rutinas.`);
                }
                if ((parentAge >= 70 || (relative.health ?? 100) < 38) && !(character.flags ?? []).includes("parents_mayores")) {
                    character.flags = [...new Set([...(character.flags ?? []), "parents_mayores"])];
                    lines.push(`${parent.name} empezó a necesitar ayuda para tareas que antes hacía sin pensar. La familia habló de turnos, dinero y paciencia.`);
                }
                const jobLossChance = clamp(country.unemploymentRate * 0.15 + (parent.informal ? 1.2 : 0), 0.4, 7);
                if (
                    parentAge < 64 &&
                    parent.inLaborForce &&
                    (parent.employmentStatus === "employed" || parent.employmentStatus === "self-employed") &&
                    rng.chance(jobLossChance)
                ) {
                    parent.employmentStatus = "unemployed";
                    parent.annualIncome = Math.round((parent.annualIncome ?? 0) * 0.18);
                    character.flags = [...new Set([...(character.flags ?? []), `${role}_en_apuros`])];
                    lines.push(`${parent.name} perdió su trabajo. En casa empezaron a revisarse las facturas antes de que llegaran.`);
                }
                if (
                    parent.inLaborForce &&
                    parent.employmentStatus === "unemployed" &&
                    rng.chance(24)
                ) {
                    parent.employmentStatus = "employed";
                    parent.annualIncome = Math.round(Math.max(parent.annualIncome ?? 0, country.gdpPerCapitaPpp * 0.3));
                    character.flags = (character.flags ?? []).filter((flag) => flag !== `${role}_en_apuros`);
                    lines.push(`${parent.name} encontró un trabajo nuevo. No resolvió todos los problemas, pero devolvió algo de aire a la casa.`);
                }
            }
        }
    }

    if (character.age >= 18) {
        lines.push(...settleInheritance(character, birth, story, year));
    } else if ((character.flags ?? []).includes("herencia_pendiente") && character.age >= 18) {
        lines.push(...settleInheritance(character, birth, story, year));
    }

    if (household?.structure === "compuesta" && story.relatives.some((relative) => relative.role === "father" && relative.alive) && character.age < 18) {
        // La estructura se muestra en el registro; no se convierte en un juicio
        // moral. Solo se narra cuando aporta contexto a la vida cotidiana.
        if (!(character.flags ?? []).includes("contexto_poliginia_explicado")) {
            character.flags = [...(character.flags ?? []), "contexto_poliginia_explicado"];
            lines.push("Tu hogar tiene una organización familiar que no es la de todas las casas del barrio. Con el tiempo entenderás sus acuerdos, sus silencios y sus costes.");
        }
    }

    return lines;
}

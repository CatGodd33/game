import type { BirthProfile, CharacterState, GameConfig, LifeFocus, LifeStory, Relative } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import { createBirth } from "./birth.js";
import { createRng, deriveSeed } from "./rng.js";
import { getCountry } from "../demographics/dataset.js";
import { rollDeath } from "./mortality.js";
import { familyYear } from "./family.js";
import { chronicleYear } from "./chronicle.js";

export function createStory(seed: string, birth: BirthProfile, config: GameConfig): LifeStory {
    const d = birth.details;
    const relatives: Relative[] = [];
    if (d) {
        relatives.push({ id: "mother", role: "mother", name: d.mother.name, sex: "female", bornYear: birth.year - d.mother.age, occupation: d.mother.occupation, alive: true, health: d.mother.health ?? 68, annualIncome: d.mother.annualIncome ?? 0, relationshipQuality: d.mother.relationshipQuality ?? 60, inHousehold: d.mother.inHousehold !== false });
        relatives.push({ id: "father", role: "father", name: d.father.name, sex: "male", bornYear: birth.year - d.father.age, occupation: d.father.occupation, alive: true, health: d.father.health ?? 68, annualIncome: d.father.annualIncome ?? 0, relationshipQuality: d.father.relationshipQuality ?? 60, inHousehold: d.father.inHousehold !== false });
        d.siblings.forEach((s, i) => relatives.push({ id: `sibling-${i}`, role: "sibling", name: s.name, sex: s.sex, bornYear: birth.year - s.age, occupation: "", alive: true, health: 72, relationshipQuality: 62, inHousehold: true }));
        const country = getCountry(birth.countryCode);
        const rng = createRng(deriveSeed(seed, "grandparents"));
        // Los nombres de los parientes deben ser únicos dentro de la historia.
        // Si dos personas distintas comparten nombre, el diario y los funerales
        // se vuelven ambiguos y parecen un cobro duplicado del mismo familiar.
        const usedNames = new Set(relatives.map((relative) => relative.name));
        usedNames.add(`${birth.givenName} ${birth.surname}`);
        const uniqueName = (pool: readonly string[]): string => {
            const candidates = [...new Set(pool.map((given) => `${given} ${birth.surname}`))]
                .filter((name) => !usedNames.has(name));
            const name = candidates.length > 0 ? rng.pick(candidates) : `${rng.pick(pool)} ${birth.surname}`;
            usedNames.add(name);
            return name;
        };
        relatives.push({ id: "grandmother", role: "grandmother", name: uniqueName(country.names.female), sex: "female", bornYear: birth.year - d.mother.age - rng.int(21, 30), occupation: "Abuela materna", alive: true, health: 58, relationshipQuality: 60, inHousehold: false });
        relatives.push({ id: "grandfather", role: "grandfather", name: uniqueName(country.names.male), sex: "male", bornYear: birth.year - d.father.age - rng.int(23, 32), occupation: "Abuelo paterno", alive: true, health: 56, relationshipQuality: 58, inHousehold: false });
    }
    return {
        focus: "balanced", relatives, temperament: "Por descubrir", gift: "Por descubrir",
        companions: Array.from({ length: 4 }, (_, i) => ({ birth: createBirth(deriveSeed(seed, "companion", i), { ...config, countryMode: "weighted", fixedCountry: undefined, fixedYear: birth.year }), alive: true, age: 0 })),
    };
}

const CHILDHOOD = [
    "Pasaste una tarde haciendo dibujos hasta llenar todas las hojas de la casa.",
    "Jugaste en el barro y volviste a casa con la ropa completamente sucia.",
    "Una tormenta te despertó. Alguien vino a sentarse a tu lado hasta que te dormiste.",
    "Inventaste un juego con tus vecinos. Nadie se ponía de acuerdo sobre las reglas.",
    "Un resfriado te dejó en cama unos días. Después volviste a corretear por la casa.",
    "Preguntaste por qué el cielo cambiaba de color al caer la tarde.",
    "Te aprendiste una canción y la cantaste tantas veces que todos la sabían de memoria.",
    "Te quedaste mirando a los mayores cocinar e intentaste ayudar.",
    "Una persona de tu familia te contó una historia de cuando era pequeña.",
    "Encontraste una piedra que te pareció un tesoro y la guardaste durante meses.",
    "Un amigo compartió su merienda contigo. Recordarías aquel gesto mucho tiempo.",
    "Tuviste miedo en tu primera noche lejos de casa, pero por la mañana te sentiste mayor.",
];
const TEEN = ["Un profesor te dijo que confiaba en ti. Sus palabras te acompañaron toda la semana.", "Una discusión con tus amigos te hizo pensar en lo que esperabas de una amistad.", "Descubriste música que parecía hablar exactamente de lo que sentías.", "Pasaste una tarde imaginando cómo sería tu vida fuera de tu ciudad.", "Ayudaste en casa más de lo habitual y empezaste a comprender el esfuerzo de tu familia."];
const ADULT = ["Coincidiste con alguien de tu infancia y hablasteis de todo lo que había cambiado.", "Una semana difícil terminó con una conversación que necesitabas.", "Te concediste una tarde sin obligaciones y caminaste por tu barrio.", "Un gasto inesperado te obligó a revisar tus planes para el mes.", "Volviste a un lugar de tu infancia. Te pareció más pequeño de lo que recordabas.", "Cocinaste para las personas que quieres y la sobremesa se alargó.", "Alguien cercano te pidió consejo. Te sorprendió ser ahora esa persona."];
const ELDER = ["Una fotografía antigua te devolvió a un día que creías olvidado.", "Contaste una historia de tu juventud y alguien te pidió que la repitieras.", "Dedicaste una mañana tranquila a cuidar tus plantas y mirar por la ventana.", "Te reuniste con una persona querida. El tiempo juntos te hizo bien."];
const CULTURE: Record<string, string[]> = {
    IND: ["El aroma de las especias de la cocina de tu familia se convirtió en un recuerdo de casa.", "Jugaste con otros niños en la calle hasta que os llamaron para cenar."],
    MEX: ["Tu familia se reunió alrededor de una mesa llena de comida y conversaciones."],
    JPN: ["Viste los árboles florecer y saliste a caminar con tu familia."],
    BRA: ["Jugaste a la pelota con los niños del barrio hasta que anocheció."],
    NGA: ["La música de una celebración en tu barrio llenó la tarde."],
};
const FOCUS: Record<LifeFocus, Partial<CharacterState["stats"]>> = {
    balanced: { happiness: 0.5 }, study: { knowledge: 2, happiness: -0.4 }, relationships: { relationships: 2, happiness: 0.6 },
    health: { health: 1.5 }, work: { knowledge: 0.6, happiness: -0.3 }, hobbies: { happiness: 1.5, knowledge: 0.4 },
};
export function storyYear(seed: string, birth: BirthProfile, c: CharacterState, year: number, config: GameConfig, recent: string[] = []): string[] {
    if (!c.story) c.story = createStory(seed, birth, config);
    const story = c.story;
    const rng = createRng(deriveSeed(seed, "daily-life", c.age));
    const country = getCountry(c.currentCountry);
    const lines: string[] = [];
    const age = c.age;
    if (age === 0) lines.push("Recibiste tus primeros cuidados. Tu familia aprendía tus gestos, tu llanto y tus horarios.", "Te dormías al escuchar una voz familiar.");
    else if (age === 1) lines.push("Diste tus primeros pasos. Tu familia te animó a intentarlo otra vez.", "Dijiste tu primera palabra. En casa nadie se puso de acuerdo sobre quién la escuchó antes.");
    else {
        const pool = age < 13 ? CHILDHOOD : age < 20 ? TEEN : age < 65 ? ADULT : ELDER;
        const fresh = pool.filter(line => !recent.includes(line));
        const available = fresh.length >= 2 ? fresh : pool;
        const first = rng.pick(available); lines.push(first);
        if (age < 13) lines.push(rng.pick(available.filter(line => line !== first)));
        if (rng.chance(25) && CULTURE[birth.countryCode]) { const freshCulture = CULTURE[birth.countryCode].filter(line => !recent.includes(line)); if (freshCulture.length) lines.push(rng.pick(freshCulture)); }
    }
    if (age === 4) { story.temperament = story.temperament === "Por descubrir" ? rng.pick(["Curioso", "Tranquilo", "Sociable", "Persistente", "Imaginativo"]) : story.temperament; lines.push(`Los mayores empezaron a describirte como una persona de temperamento ${story.temperament.toLowerCase()}.`); }
    if (age === 5) { story.gift = rng.pick(["Dibujo", "Música", "Números", "Deporte", "Contar historias", "Habilidad manual"]); lines.push(`Apareció una facilidad especial para ${story.gift.toLowerCase()}.`, "Cumpliste cinco años. La primera infancia queda atrás; tu mundo empieza a hacerse más grande."); }
    if (age === 6) { c.educationLevel = "primary"; lines.push("Empezaste la escuela primaria. Una mochila, caras nuevas y una rutina diferente."); }
    if (age === 12 && c.educationLevel === "primary") { c.educationLevel = "secondary"; lines.push("Comenzaste la educación secundaria. Las expectativas y las preguntas crecieron contigo."); }
    if (age === 18) lines.push("Cumpliste dieciocho años. Tu futuro empezó a sentirse más tuyo, aunque no todas las puertas estaban abiertas.");
    if (age === 65) lines.push("Sesenta y cinco años. Pensaste en todo lo que has vivido y en cómo quieres pasar los años que vienen.");
    if (age >= 6) for (const [key, delta] of Object.entries(FOCUS[story.focus])) { const k = key as keyof typeof c.stats; c.stats[k] = clamp(c.stats[k] + (delta ?? 0)); }
    if (age >= 18 && story.focus === "work" && c.employment.status === "employed") c.incomeModifier = Math.min(3, c.incomeModifier + 0.015);
    const mother = story.relatives.find(r => r.role === "mother");
    if (age >= 1 && age <= 12 && mother?.alive && year - mother.bornYear < 44 && rng.chance(6)) {
        const sex = rng.chance(51) ? "male" : "female";
        const pool = sex === "female" ? country.names.female : country.names.male;
        const available = pool.filter(name => name !== birth.givenName && !story.relatives.some(r => r.name === name));
        const name = rng.pick(available.length ? available : pool);
        story.relatives.push({ id: `sibling-born-${year}`, role: "sibling", name, sex, bornYear: year, occupation: "", alive: true });
        lines.push(`Nació ${name}, ${sex === "female" ? "tu hermana" : "tu hermano"}. La casa cambió de ritmo con su llegada.`);
    }
    const knownChildren = story.relatives.filter(r => r.role === "child" && r.generation !== "grandchild").length;
    for (let i = knownChildren; i < c.children; i++) {
        const sex = rng.chance(51) ? "male" : "female";
        const pool = sex === "female" ? country.names.female : country.names.male;
        const available = pool.filter(name => name !== birth.givenName && !story.relatives.some(r => r.name === name));
        const name = rng.pick(available.length ? available : pool);
        story.relatives.push({ id: `child-${i}`, role: "child", name, sex, bornYear: year, occupation: "", alive: true, inHousehold:true, generation:"child" });
        lines.push(`Nació ${name}, ${sex === "female" ? "tu hija" : "tu hijo"}. La primera vez que le sostuviste, todo pareció detenerse.`);
    }
    if (c.partnerName && !story.relatives.some(r => r.role === "partner" && r.name === c.partnerName)) story.relatives.push({ id: `partner-${year}`, role: "partner", name: c.partnerName, sex: c.sex === "female" ? "male" : "female", bornYear: c.partnerProfile?.bornYear??year - Math.max(18, age + rng.int(-3, 3)), occupation: "", alive: true, inHousehold:c.partnerProfile?.sharedHousehold??true });
    lines.push(...chronicleYear(seed, birth, c, year, recent));

    lines.push(...familyYear(seed, birth, c, year, config));

    for (const companion of story.companions) {
        if (!companion.alive) continue;
        companion.age = age;
        // La vida paralela se resuelve con su propio cuerpo y su propio país.
        // No debe heredar banderas, negocio, deudas ni psicología del jugador.
        const proxy: CharacterState = {
            ...c,
            age,
            sex: companion.birth.sex,
            birthCountry: companion.birth.countryCode,
            currentCountry: companion.birth.countryCode,
            countriesLived: [companion.birth.countryCode],
            finance: { money: 1000, annualIncome: 1000, annualExpenses: 0, debt: 0, ledger: [] },
            stats: { ...companion.birth.initialStats },
            employment: {
                status: age < 18 ? "child" : age < 65 ? "employed" : "retired",
                occupation: null,
                sector: null,
                yearsInRole: 0,
                contractQuality: 0.5,
                occupationId: null,
            },
            chronicConditions: [],
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
            healthPlan: "ninguno",
            alive: true,
            causeOfDeath: null,
            ageAtDeath: null,
            story: undefined,
        };
        const death = rollDeath(proxy, config.difficulty, createRng(deriveSeed(seed, "companion-mortality", companion.birth.givenName, year)));
        if (death.died) { companion.alive = false; companion.deathAge = age; companion.causeOfDeath = death.cause ?? "Causas naturales"; }
    }
    return lines;
}

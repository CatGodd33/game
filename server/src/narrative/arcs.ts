import type { CharacterState } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import type { Rng } from "../simulation/rng.js";

interface ArcChapter {
    title: string;
    text: string;
}

interface LifeArc {
    id: string;
    title: string;
    minAge: number;
    maxAge: number;
    requiresPartner?: boolean;
    requiresChild?: boolean;
    requiresEmployment?: boolean;
    requiresMigration?: boolean;
    chapters: ArcChapter[];
}

/**
 * Arcos serializados: no son sucesos aislados, sino capítulos que vuelven.
 * Los nombres concretos salen de la familia y la pareja del personaje, de modo
 * que dos vidas nunca lean exactamente la misma novela.
 */
const ARCS: LifeArc[] = [
    {
        id: "secreto_deuda",
        title: "El sobre bajo la cama",
        minAge: 8,
        maxAge: 25,
        chapters: [
            {
                title: "Una puerta que se cierra",
                text: "En {city}, encontraste un sobre con recibos y una palabra que no entendías. Preguntaste en la cena; la conversación se apagó antes de empezar. Alguien de tu familia sabe más de lo que cuenta.",
            },
            {
                title: "La llamada de un desconocido",
                text: "Una voz preguntó por tu {parent}. Al oír tu nombre, colgó. Esa noche descubriste que la deuda familiar no era una metáfora: había fechas, intereses y una persona que amenazaba con contar la verdad.",
            },
            {
                title: "Elegir qué verdad sostener",
                text: "Tu familia se reunió para hablar del sobre. Había culpa, orgullo y una propuesta que habría resuelto todo a cambio de silencio. No tomaste la decisión por ellos; decidiste qué clase de adulto querías ser cuando saliera a la luz.",
            },
        ],
    },
    {
        id: "herencia",
        title: "Lo que queda de la abuela",
        minAge: 24,
        maxAge: 70,
        chapters: [
            {
                title: "La casa huele a medicina",
                text: "Tu abuela pidió que la visitaras sola. Habló de la casa, de un hermano que no ve desde hace años y de un testamento que nadie ha leído. Antes de despedirte, te hizo prometer que no dejarías que la familia convirtiera el cariño en una subasta.",
            },
            {
                title: "Una firma, dos versiones",
                text: "Apareció una copia del testamento con una firma distinta. Tu {parent} asegura que es la buena; un primo niega haber estado allí. La casa vale dinero, pero lo que se rompió en la cocina esa tarde vale más.",
            },
            {
                title: "La herencia que nadie esperaba",
                text: "La verdad salió en una carpeta de cartón: una deuda pagada a medias y una carta para ti. No había fortuna. Había una historia familiar que por fin tenía nombre, y la posibilidad de elegir qué hacer con ella.",
            },
        ],
    },
    {
        id: "confianza_pareja",
        title: "La grieta de la confianza",
        minAge: 20,
        maxAge: 75,
        requiresPartner: true,
        chapters: [
            {
                title: "Un mensaje a la hora equivocada",
                text: "Viste una notificación en el teléfono de {partner}. No la abriste. Esa noche todo fue normal, demasiado normal. La duda no necesitaba pruebas para instalarse entre los dos.",
            },
            {
                title: "La versión que no cuadra",
                text: "{partner} contó una historia distinta a la que te habían contado. Puede ser un malentendido; también puede ser una puerta que lleva años entreabierta. Hablasteis hasta tarde, pero ninguno dijo la frase que hacía falta.",
            },
            {
                title: "Quedarse o abrir la puerta",
                text: "La crisis ya no cabía en una conversación de pasillo. {partner} propuso terapia, tiempo o una pausa. Tú pensaste en la vida construida y en la que todavía podrías construir. Elegir no era lo mismo que castigar.",
            },
        ],
    },
    {
        id: "traicion_trabajo",
        title: "El ascenso que no era tuyo",
        minAge: 22,
        maxAge: 63,
        requiresEmployment: true,
        chapters: [
            {
                title: "El nombre en la lista",
                text: "En {city}, tu nombre apareció tachado en la lista de ascensos. La persona elegida había presentado como suyo un informe que tú escribiste. Sonreíste en la reunión y guardaste el original en una carpeta.",
            },
            {
                title: "El favor que tiene precio",
                text: "Un superior te ofreció reparar la injusticia a cambio de una firma cómoda. No era ilegal, solo sucio. Mientras lo pensabas, alguien de tu equipo te pidió que no le dejaras fuera de la decisión.",
            },
            {
                title: "Lo que aprendiste del poder",
                text: "La verdad salió, pero no como esperabas. No hubo aplausos: hubo una reunión tensa, un límite nuevo y la certeza de que tu trabajo ya no necesitaba el permiso de esa persona. El precio fue una amistad y una versión de ti que se quedó en el pasillo.",
            },
        ],
    },
    {
        id: "amistad_dinero",
        title: "El préstamo de toda la vida",
        minAge: 18,
        maxAge: 70,
        chapters: [
            {
                title: "Una llamada que empieza con disculpa",
                text: "Tu amistad de siempre llamó con una voz que no reconocías. Necesitaba dinero y prometió devolverlo en tres meses. No preguntaste para qué; preguntaste cuánto. Esa fue la primera equivocación.",
            },
            {
                title: "La deuda invisible",
                text: "Pasaron los meses. Viste una foto suya en un viaje que no cuadraba con la historia. No dijiste nada delante de los demás. La amistad seguía ahí, pero ya no era gratis para ti.",
            },
            {
                title: "Una mesa, dos verdades",
                text: "Os sentasteis a hablar sin testigos. La deuda era real, también el miedo. Podías reclamar el dinero, condonarlo o cambiar el vínculo por una forma más honesta de estar. Ninguna opción te devolvía la conversación de aquel primer teléfono.",
            },
        ],
    },
    {
        id: "rumor_barrio",
        title: "Lo que se dice en la escalera",
        minAge: 10,
        maxAge: 80,
        chapters: [
            {
                title: "Una frase en el rellano",
                text: "En {city}, una vecina bajó la voz al verte. Al día siguiente, alguien te preguntó si era verdad lo de tu familia. No lo era, pero la pregunta ya estaba haciendo su trabajo.",
            },
            {
                title: "El origen del rumor",
                text: "Descubriste que la historia salió de una persona que apreciabas. No había maldad, solo miedo y una necesidad de pertenecer. Enfrentarla te costaría una amistad; ignorarlo, parte de tu reputación.",
            },
            {
                title: "La versión que eliges contar",
                text: "El barrio siguió hablando durante semanas. Tú decidiste qué parte de tu vida era pública y qué parte no. No todos entendieron el límite. Algunos sí, y esos fueron los que se quedaron.",
            },
        ],
    },
    {
        id: "cuidado_familiar",
        title: "El año en que todo se detuvo",
        minAge: 30,
        maxAge: 85,
        chapters: [
            {
                title: "Una habitación de hospital",
                text: "Una llamada cambió el ritmo de la semana. Tu {parent} estaba ingresado. En la sala de espera coincidiste con un familiar con el que apenas hablabas; ninguno de los dos sabía cómo empezar.",
            },
            {
                title: "Repartir lo que no se puede repartir",
                text: "El alta llegó con instrucciones, facturas y una pregunta incómoda: quién iba a cuidar a quién. Tu trabajo, tu pareja y tu salud cabían en la misma agenda solo si alguien cedía. No había una respuesta limpia.",
            },
            {
                title: "La forma de despedirse",
                text: "El desenlace fue lento y sin epílogo. Después de los trámites quedó el silencio de la casa y una conversación pendiente con tu familia. Aprendiste que el cuidado también se hereda, para bien y para mal.",
            },
        ],
    },
    {
        id: "retorno",
        title: "El país que dejaste atrás",
        minAge: 18,
        maxAge: 90,
        requiresMigration: true,
        chapters: [
            {
                title: "Una llamada desde el origen",
                text: "Vivir en {city} no te hacía menos de donde naciste. Una llamada desde tu país trajo noticias, una petición y la sensación de que la distancia tenía factura. No podías resolverlo todo con una transferencia.",
            },
            {
                title: "La culpa de estar lejos",
                text: "Te perdiste una boda, un entierro o una versión de tu familia que ya no volverás a ver. En la pantalla todos parecían estar de acuerdo en que tú eras la persona que se había ido. La frase dolía porque era cierta.",
            },
            {
                title: "Volver sin retroceder",
                text: "Organizaste un viaje de regreso con una fecha de vuelta. La casa olía igual; las conversaciones, no. Descubriste que volver no era deshacer el camino, sino elegir qué parte del origen querías llevar contigo.",
            },
        ],
    },
];

const PLACEHOLDER_PARTNER = "{partner}";
const PLACEHOLDER_PARENT = "{parent}";

function fill(text: string, game: StoredGame, character: CharacterState): string {
    const partner = character.partnerName ?? (character.sex === "female" ? "tu pareja" : "tu pareja");
    const aliveParent = character.story?.relatives.find(
        (relative) => (relative.role === "mother" || relative.role === "father") && relative.alive,
    );
    return text
        .replaceAll(PLACEHOLDER_PARTNER, partner)
        .replaceAll(PLACEHOLDER_PARENT, aliveParent?.role === "mother" ? "madre" : "padre")
        .replaceAll("{city}", character.currentLocation)
        .replaceAll("{year}", String(game.currentYear));
}

function eligible(arc: LifeArc, character: CharacterState): boolean {
    if (character.age < arc.minAge || character.age > arc.maxAge) return false;
    if (arc.requiresPartner && !character.partnerName) return false;
    if (arc.requiresChild && character.children < 1) return false;
    if (arc.requiresEmployment && character.employment.status !== "employed") return false;
    if (arc.requiresMigration && character.currentCountry === character.birthCountry) return false;
    return true;
}

function startedYear(character: CharacterState, arcId: string): number | null {
    const found = (character.flags ?? []).find((flag) => flag.startsWith(`arco_${arcId}_inicio_`));
    if (!found) return null;
    const year = Number(found.split("_").at(-1));
    return Number.isFinite(year) ? year : null;
}

function currentChapter(character: CharacterState, arcId: string): number {
    const flag = (character.flags ?? []).find((entry) => entry.startsWith(`arco_${arcId}_cap_`));
    if (!flag) return 0;
    const chapter = Number(flag.split("_").at(-1));
    return Number.isFinite(chapter) ? chapter : 0;
}

function ensureFlags(character: CharacterState): string[] {
    character.flags ??= [];
    return character.flags;
}

/**
 * Devuelve la escena de arco que toca este mes, si alguna. Es determinista:
 * la semilla del mes decide cuándo arranca un arco, y luego los capítulos
 * avanzan como máximo una vez por año.
 */
export function advanceArcChapter(
    game: StoredGame,
    character: CharacterState,
    rng: Rng,
): string | null {
    const flags = ensureFlags(character);
    const active = ARCS.map((arc) => ({ arc, start: startedYear(character, arc.id) }))
        .filter((entry): entry is { arc: LifeArc; start: number } => entry.start !== null)
        .filter((entry) => !flags.includes(`arco_${entry.arc.id}_fin`))
        .sort((first, second) => second.start - first.start);

    if (active.length > 0) {
        const { arc, start } = active[0]!;
        if (game.currentYear <= start) return null;
        const chapter = currentChapter(character, arc.id);
        const next = chapter;
        const content = arc.chapters[next];
        if (!content) {
            flags.push(`arco_${arc.id}_fin`);
            return null;
        }
        flags.push(`arco_${arc.id}_cap_${next + 1}`);
        if (next + 1 >= arc.chapters.length) flags.push(`arco_${arc.id}_fin`);
        return `«${arc.title} · ${content.title}». ${fill(content.text, game, character)}`;
    }

    // Un nuevo arco no aparece todos los meses: solo cuando la semilla lo pide.
    if (!rng.chance(2.4)) return null;
    const candidates = ARCS.filter(
        (arc) =>
            eligible(arc, character) &&
            !flags.includes(`arco_${arc.id}_fin`) &&
            startedYear(character, arc.id) === null,
    );
    if (candidates.length === 0) return null;
    const arc = rng.pick(candidates);
    const content = arc.chapters[0]!;
    flags.push(`arco_${arc.id}_inicio_${game.currentYear}`, `arco_${arc.id}_cap_1`);
    if (arc.chapters.length === 1) flags.push(`arco_${arc.id}_fin`);
    return `«${arc.title} · ${content.title}». ${fill(content.text, game, character)}`;
}

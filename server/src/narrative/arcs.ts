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
    /** Peso relativo; las historias no aparecen con la misma frecuencia. */
    weight?: number;
    minFamilyTier?: number;
    maxFamilyTier?: number;
    requiresPartner?: boolean;
    requiresChild?: boolean;
    requiresEmployment?: boolean;
    requiresMigration?: boolean;
    requiresParentsAlive?: boolean;
    requiresBusiness?: boolean;
    chapters: ArcChapter[];
}

/**
 * Arcos serializados: no son sucesos aislados, sino capítulos que vuelven.
 * El mazo de una vida es limitado. Una misma partida no debe convertir una
 * única historia familiar en el centro de ochenta años.
 */
const ARCS: LifeArc[] = [
    {
        id: "herencia",
        title: "Lo que queda de la abuela",
        minAge: 24,
        maxAge: 70,
        weight: 0.9,
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
        weight: 1.2,
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
        weight: 1,
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
                text: "La reunión terminó sin aplausos. Conservaste el trabajo, perdiste una versión ingenua de la empresa y supiste que el siguiente ascenso no se pediría con un favor.",
            },
        ],
    },
    {
        id: "retorno",
        title: "El país que dejaste atrás",
        minAge: 18,
        maxAge: 90,
        requiresMigration: true,
        weight: 0.8,
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
    {
        id: "primer_turno",
        title: "El turno que nadie quería",
        minAge: 18,
        maxAge: 30,
        requiresEmployment: true,
        weight: 0.9,
        chapters: [
            {
                title: "La primera nómina",
                text: "Tu primer sueldo llegó con más descuentos de los que esperabas. En {city}, compraste algo pequeño y miraste el recibo como si fuera una prueba de que ya eras adulto.",
            },
            {
                title: "El favor que te costó horas",
                text: "Un compañero te pidió cubrir su turno. Dijiste que sí para caer bien. La fatiga llegó antes que el favor, y nadie te lo devolvió.",
            },
            {
                title: "Poner un límite",
                text: "Aprendiste a decir que no sin pedir perdón. No fue un ascenso, pero fue la primera vez que tu tiempo tuvo un precio distinto.",
            },
        ],
    },
    {
        id: "silla_ventana",
        title: "La silla junto a la ventana",
        minAge: 35,
        maxAge: 68,
        requiresParentsAlive: true,
        weight: 0.8,
        chapters: [
            {
                title: "La salud de tu {parent}",
                text: "Tu {parent} empezó a repetir la misma pregunta y a olvidar el nombre de una calle. La consulta tenía una lista de espera larga; la conversación familiar, todavía más.",
            },
            {
                title: "Repartir los cuidados",
                text: "Una reunión familiar terminó con una tabla de turnos y dos silencios. Todos querían ayudar; nadie quería cambiar su vida del todo. Tú tampoco.",
            },
            {
                title: "La silla vacía",
                text: "La casa quedó en silencio. Encontraste una libreta con recetas y una foto que no recordabas. El duelo no se resolvió en un día; se quedó en los objetos que nadie sabía dónde poner.",
            },
        ],
    },
    {
        id: "llave_nueva",
        title: "La llave que no era de casa",
        minAge: 18,
        maxAge: 45,
        weight: 0.7,
        chapters: [
            {
                title: "Un piso demasiado caro",
                text: "Viste un piso en {city} con una ventana que daba a un árbol. El alquiler se comía media nómina. La decisión no era solo dónde dormir, sino cuánto margen querías conservar.",
            },
            {
                title: "La convivencia cambia las reglas",
                text: "Compartir piso trajo facturas, tareas y una discusión por una taza. Descubriste que la independencia también se negocia con otras personas.",
            },
            {
                title: "Un hogar, no una inversión",
                text: "La llave nueva no resolvió la vida. Solo te dio una puerta que podías cerrar. A veces eso fue suficiente.",
            },
        ],
    },
    {
        id: "mensaje_sin_responder",
        title: "El mensaje que no contestaste",
        minAge: 12,
        maxAge: 35,
        weight: 0.7,
        chapters: [
            {
                title: "Una notificación incómoda",
                text: "Un amigo te escribió después de una discusión. Viste el mensaje y lo dejaste para luego. Luego se convirtió en semanas.",
            },
            {
                title: "La distancia creció sola",
                text: "Os visteis en una calle y hablasteis de cosas pequeñas. Ninguno mencionó el mensaje. La amistad siguió, pero con una habitación cerrada dentro.",
            },
            {
                title: "Una conversación pendiente",
                text: "Finalmente preguntaste por qué había dolido. La respuesta no arregló el pasado, pero os permitió dejar de fingir que no había ocurrido.",
            },
        ],
    },
    {
        id: "vocacion_tardia",
        title: "Lo que dejaste de hacer",
        minAge: 38,
        maxAge: 72,
        weight: 0.7,
        chapters: [
            {
                title: "Una clase en el centro",
                text: "Pasaste frente a un cartel de clases nocturnas. Pensaste en lo que te gustaba antes de que la vida se llenara de horarios. La inscripción cerraba el viernes.",
            },
            {
                title: "El coste de empezar tarde",
                text: "No eras el más joven del grupo. Tampoco el que menos preguntaba. El cansancio competía con una curiosidad que llevabas años guardando.",
            },
            {
                title: "Una versión más tuya",
                text: "No cambiaste de vida de un día para otro. Pero empezaste a reservar un hueco semanal para algo que no daba dinero ni estatus. Ese hueco se volvió necesario.",
            },
        ],
    },
    {
        id: "negocio_presion",
        title: "La nómina que no llega",
        minAge: 25,
        maxAge: 66,
        requiresBusiness: true,
        weight: 0.8,
        chapters: [
            {
                title: "Una factura sin pagar",
                text: "Un cliente importante retrasó el pago. En {city}, la nómina de tu equipo llegaba antes que el dinero. La mesa de la oficina se llenó de cálculos.",
            },
            {
                title: "Elegir a quién proteger",
                text: "Podías pagar a una persona, negociar con los proveedores o pedir un préstamo. Cada opción salvaba una parte del negocio y sacrificaba otra.",
            },
            {
                title: "El precio de sostener algo",
                text: "El negocio sobrevivió, pero no salió indemne. Aprendiste que dirigir también era decidir quién recibía una mala noticia y en qué orden.",
            },
        ],
    },
];

const PLACEHOLDER_PARTNER = "{partner}";
const PLACEHOLDER_PARENT = "{parent}";
const MAX_ARCS_PER_LIFE = 3;

function fill(text: string, game: StoredGame, character: CharacterState): string {
    const partner = character.partnerName ?? "tu pareja";
    const aliveParent = character.story?.relatives.find(
        (relative) => (relative.role === "mother" || relative.role === "father") && relative.alive,
    );
    return text
        .replaceAll(PLACEHOLDER_PARTNER, partner)
        .replaceAll(PLACEHOLDER_PARENT, aliveParent?.role === "mother" ? "madre" : "padre")
        .replaceAll("{city}", character.currentLocation)
        .replaceAll("{year}", String(game.currentYear));
}

function eligible(arc: LifeArc, character: CharacterState, game: StoredGame): boolean {
    if (character.age < arc.minAge || character.age > arc.maxAge) return false;
    const familyTier = game.birth.family?.tier ?? 3;
    if (arc.minFamilyTier !== undefined && familyTier < arc.minFamilyTier) return false;
    if (arc.maxFamilyTier !== undefined && familyTier > arc.maxFamilyTier) return false;
    if (arc.requiresPartner && !character.partnerName) return false;
    if (arc.requiresChild && character.children < 1) return false;
    if (arc.requiresEmployment && character.employment.status !== "employed") return false;
    if (arc.requiresMigration && character.currentCountry === character.birthCountry) return false;
    if (arc.requiresParentsAlive && !character.story?.relatives.some((relative) => (relative.role === "mother" || relative.role === "father") && relative.alive)) {
        return false;
    }
    if (arc.requiresBusiness && !character.business?.active) return false;
    return true;
}

function startedYear(character: CharacterState, arcId: string): number | null {
    const found = (character.flags ?? []).find((flag) => flag.startsWith(`arco_${arcId}_inicio_`));
    if (!found) return null;
    const year = Number(found.split("_").at(-1));
    return Number.isFinite(year) ? year : null;
}

function currentChapter(character: CharacterState, arcId: string): number {
    const chapters = (character.flags ?? [])
        .filter((flag) => flag.startsWith(`arco_${arcId}_cap_`))
        .map((flag) => Number(flag.split("_").at(-1)))
        .filter((chapter) => Number.isFinite(chapter));
    return chapters.length ? Math.max(...chapters) : 0;
}

function ensureFlags(character: CharacterState): string[] {
    character.flags ??= [];
    return character.flags;
}

/**
 * Devuelve la escena de arco que toca este mes, si alguna. Es determinista:
 * la semilla del mes decide cuándo arranca un arco, y cada capítulo avanza
 * como máximo una vez por año. El mazo se limita a tres arcos por vida para
 * que una única historia no monopolice la biografía.
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
        if (flags.includes(`arco_${arc.id}_ultimo_${game.currentYear}`)) return null;
        const next = currentChapter(character, arc.id);
        const content = arc.chapters[next];
        if (!content) {
            flags.push(`arco_${arc.id}_fin`);
            return null;
        }
        flags.push(`arco_${arc.id}_cap_${next + 1}`, `arco_${arc.id}_ultimo_${game.currentYear}`);
        if (next + 1 >= arc.chapters.length) flags.push(`arco_${arc.id}_fin`);
        return `«${arc.title} · ${content.title}». ${fill(content.text, game, character)}`;
    }

    const started = ARCS.filter((arc) => startedYear(character, arc.id) !== null).length;
    if (started >= MAX_ARCS_PER_LIFE) return null;

    // Un arco nuevo no aparece todos los meses: solo cuando la semilla lo pide.
    if (!rng.chance(1.1)) return null;
    const candidates = ARCS.filter(
        (arc) =>
            eligible(arc, character, game) &&
            !flags.includes(`arco_${arc.id}_fin`) &&
            startedYear(character, arc.id) === null,
    );
    if (candidates.length === 0) return null;
    const arc = rng.weighted(candidates, (candidate) => candidate.weight ?? 1);
    const content = arc.chapters[0]!;
    flags.push(`arco_${arc.id}_inicio_${game.currentYear}`, `arco_${arc.id}_cap_1`, `arco_${arc.id}_ultimo_${game.currentYear}`);
    if (arc.chapters.length === 1) flags.push(`arco_${arc.id}_fin`);
    return `«${arc.title} · ${content.title}». ${fill(content.text, game, character)}`;
}

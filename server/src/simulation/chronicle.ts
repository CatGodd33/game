import type { BirthProfile, CharacterState } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { createRng, deriveSeed } from "./rng.js";

/**
 * Crónica cotidiana.
 *
 * No decide nada ni cambia estadísticas: añade la textura que falta entre los
 * grandes acontecimientos. Cada año se generan varias escenas deterministas a
 * partir de la edad, el trabajo, el dinero, la familia, la salud y el lugar.
 * Las escenas son personales; los sucesos compartidos viven en `events.ts`.
 */

const INFANT = [
    "Te quedaste dormido en brazos de alguien y la casa entera bajó la voz sin que nadie lo pidiera.",
    "Descubriste que una cuchara podía hacer ruido contra la mesa. Repetiste el experimento hasta que te la quitaron.",
    "Una cara conocida apareció sobre tu cuna y tu cuerpo entero se tranquilizó antes de que pudieras nombrarla.",
];

const EARLY = [
    "Pasaste la tarde guardando piedras en un bolsillo como si fueran un tesoro.",
    "Te dieron una tarea pequeña y la hiciste con una seriedad desproporcionada.",
    "Preguntaste por qué las cosas eran como eran y nadie tuvo una respuesta completa.",
    "Un ruido en la calle te asustó. Al rato, la mano de un adulto te devolvió al mundo.",
    "Te quedaste mirando cómo trabajaba alguien y aprendiste más de lo que te explicaron.",
    "Compartiste algo tuyo sin que te lo pidieran y te sentiste raro y bien a la vez.",
];


const CHILDHOOD = [
    "Una tarde de lluvia se convirtió en una carrera de barcos de papel por el pasillo.",
    "Ayudaste a preparar la comida y te dejaron probar la salsa antes que nadie.",
    "Descubriste una palabra nueva y la repetiste hasta que todos se rieron.",
    "Un amigo te guardó el sitio en la fila sin que se lo pidieras.",
    "Te costó dormir por una película que no era para tu edad. Al final, alguien dejó la luz encendida.",
    "Cambiaste de profesor y tardaste semanas en acostumbrarte a su voz.",
    "En el patio inventasteis un juego con reglas que solo vosotros entendíais.",
    "Un familiar te enseñó a hacer algo con las manos y te sentiste mayor.",
    "Perdiste un juguete y lo buscaste durante días. Apareció donde nadie miraba.",
    "La ciudad cambió de estación y tú cambiaste de altura sin darte cuenta.",
];

const TEEN = [
    "Pasaste una tarde entera decidiendo qué música poner y no pusiste casi ninguna canción completa.",
    "Un examen te salió mejor de lo que esperabas. No se lo contaste a nadie para no gafarlo.",
    "Discutiste por algo pequeño y aprendiste que una disculpa también puede ser un gesto.",
    "Empezaste a fijarte en cómo visten los demás y luego te olvidaste de eso durante meses.",
    "Volviste a casa más tarde de lo acordado. La conversación fue más larga que el castigo.",
    "Una amistad se enfrió sin una pelea clara. Nunca supiste exactamente cuándo empezó.",
    "Te ofrecieron tu primer trabajo pequeño y descubriste lo que cuesta una hora.",
    "Pensaste en irte de tu ciudad. La idea te duró todo el viaje de vuelta.",
    "Alguien te pidió ayuda con una tarea y te sorprendió saber más de lo que creías.",
    "La familia hizo planes sin preguntarte. Aun así, acabaste yendo.",
];

const ADULT = [
    "La rutina se acomodó en pequeños gestos: el mismo café, la misma esquina, la misma prisa.",
    "Un compañero nuevo llegó con otra manera de hacer las cosas y te obligó a repensar la tuya.",
    "El transporte se retrasó. Esperaste de pie y viste el barrio con otra luz.",
    "Una factura inesperada te obligó a revisar el mes. No era una catástrofe, pero sí un aviso.",
    "Quedaste con alguien que hacía tiempo que no veías. La conversación retomó donde se había quedado.",
    "Te llevaste trabajo a casa y luego no lo hiciste. Aun así, la culpa ocupó la tarde.",
    "El cuerpo te pidió una pausa: un dolor de espalda, una siesta más larga, menos ruido.",
    "Celebraste algo pequeño con gente que no sabía que necesitabas celebrarlo.",
    "Ordenaste un armario y encontraste objetos de una vida que ya no era la tuya.",
    "Un desconocido te ayudó sin pedir nada. Lo recordarías más que la avería.",
];

const ELDER = [
    "Una mañana tranquila se alargó hasta la hora de comer sin que hicieras nada especial.",
    "Recordaste una cara que llevaba años sin aparecer en tus pensamientos.",
    "Regaste las plantas y te quedaste mirando cómo cambiaba la luz en la pared.",
    "Alguien joven te preguntó por una época que tú viviste y que para ellos es historia.",
    "Fuiste a una revisión rutinaria. El trayecto te cansó más que la consulta.",
    "Pusiste en orden unas fotografías y decidiste no tirar ninguna.",
    "La casa hizo un ruido conocido. Ya sabías de dónde venía.",
    "Una visita se marchó y el silencio después no fue triste, solo distinto.",
    "Volviste a un lugar de tu juventud y comprobaste que la memoria lo había hecho más grande.",
    "Te costó recordar un nombre. Minutos después apareció, como si hubiera estado esperando.",
];

const INNER = [
    "Te sorprendió descubrir que ya no te importaba algo que antes ocupaba toda tu cabeza.",
    "Hubo un momento del día en que todo pareció estar en su sitio, aunque nada hubiera cambiado.",
    "Pensaste en una decisión que no tomaste y en la persona que podrías haber sido.",
    "Te reíste solo y alguien te preguntó de qué. No supiste explicarlo bien.",
    "Sentiste que el año pasaba más deprisa de lo que querías.",
    "Una noticia ajena te afectó más de lo esperado. No hiciste nada, pero seguiste pensando en ella.",
    "Te diste cuenta de que estabas cansado de una forma que dormir no arreglaba del todo.",
    "Hubo gratitud, sin discurso ni ocasión especial.",
];

const PLACE_LINES = [
    "El barrio amaneció con otro ritmo: obras, una tienda nueva, una casa vacía.",
    "La gente de tu calle se saludó más que de costumbre. Algo había cambiado en el ambiente.",
    "El precio de las cosas volvió a ser tema de conversación en la cola del mercado.",
    "Un edificio viejo desapareció. Durante unos días el paisaje pareció mentira.",
    "La televisión hablaba del país y tú mirabas por la ventana, donde la vida seguía igual.",
    "Un vecino cambió de trabajo y otro se mudó. La comunidad se rehízo sin ceremonia.",
    "La ciudad se volvió más cómoda en unas cosas y más cara en otras.",
    "Una costumbre local se repitió como cada año, con menos gente y más nostalgia.",
];

function stageLines(age: number): string[] {
    if (age < 2) return INFANT;
    if (age < 6) return EARLY;
    if (age <= 12) return CHILDHOOD;
    if (age <= 19) return TEEN;
    if (age <= 64) return ADULT;
    return ELDER;
}

function familyLines(character: CharacterState): string[] {
    const lines: string[] = [];
    const relatives = character.story?.relatives ?? [];
    const partner = relatives.find((relative) => relative.role === "partner" && relative.alive);
    const children = relatives.filter((relative) => relative.role === "child" && relative.alive);
    const mother = relatives.find((relative) => relative.role === "mother");
    const father = relatives.find((relative) => relative.role === "father");
    if (partner) {
        lines.push(
            `Con ${partner.name}, la convivencia se midió en tareas pequeñas y conversaciones que no hacían falta.`,
            `Una noche, ${partner.name} y tú hablasteis de planes que no teníais del todo claros.`,
            `Discutisteis por algo doméstico. Al día siguiente funcionaba sin que nadie mencionara la pelea.`,
        );
    }
    if (children.length > 0) {
        const child = children[children.length - 1]!;
        lines.push(
            `Con ${child.name}, el tiempo se organizó alrededor de horarios, comidas y preguntas difíciles.`,
            `Te quedaste mirando a ${child.name} y pensaste en la velocidad con la que cambian las personas.`,
            `${children.length === 1 ? "Tu hijo o hija" : "Tus hijos"} ocuparon una parte de la semana que antes era solo tuya.`,
        );
    }
    if (mother?.alive) {
        lines.push(
            `Llamaste a ${mother.name}. La conversación empezó por lo práctico y terminó en recuerdos.`,
            `Tu madre te contó una historia que ya conocías. La escuchaste igual.`,
        );
    }
    if (father?.alive) {
        lines.push(
            `Tu padre y tú hablasteis de trabajo, de dinero y, sin querer, de otras cosas.`,
            `${father.name} te dio un consejo que no habías pedido. Días después entendiste por qué.`,
        );
    }
    if (relativeParentLost(character)) lines.push("Hubo un día en que la ausencia de alguien se notó en una costumbre pequeña.");
    return lines;
}

function relativeParentLost(character: CharacterState): boolean {
    return (character.story?.relatives ?? []).some((relative) => (relative.role === "mother" || relative.role === "father") && !relative.alive);
}

function workLines(character: CharacterState): string[] {
    if (character.business?.active) {
        return [
            `La empresa te dio una semana de clientes irregulares y otra de demasiadas horas.`,
            `Revisaste las cuentas de ${character.business.name}. Los números no eran una opinión.`,
            `Un empleado o proveedor te hizo una pregunta que no tenías prevista.`,
            `Trabajaste más de lo que querías y menos de lo que necesitabas, como casi siempre.`,
        ];
    }
    if (character.employment.status === "unemployed") {
        return [
            "Enviaste otra solicitud y recibiste el silencio habitual. Aun así, seguiste revisando ofertas.",
            "Un conocido te dio una pista de trabajo. No era una promesa, pero sí una puerta entreabierta.",
            "El día se organizó alrededor de una búsqueda que no siempre tenía respuesta.",
        ];
    }
    if (character.employment.status === "student") {
        return [
            "Una asignatura te costó más que las demás. Cambiaste la forma de estudiarla.",
            "Pasaste una tarde en la biblioteca y descubriste que el silencio también ayuda.",
            "Un compañero te explicó algo que llevabas días sin entender. Se lo debías.",
        ];
    }
    if (character.employment.status === "retired") {
        return [
            "La jubilación te dio un día sin horario. Al principio parecía un regalo; luego, una pregunta.",
            "Recordaste el trabajo con una mezcla de alivio y distancia.",
            "Organizaste la semana con más cuidado que cuando cobrabas por hacerlo.",
        ];
    }
    if (character.employment.occupation) {
        return [
            `En tu trabajo como ${character.employment.occupation}, una tarea repetida te salió mejor que nunca.`,
            `Un compañero te pidió ayuda y descubriste que sabías explicar lo que hacías.`,
            `La jornada terminó con la sensación de haber hecho mucho y, a la vez, nada visible.`,
            `Pensaste en cambiar de trabajo. La idea no llegó a convertirse en una decisión.`,
        ];
    }
    return [];
}

function moneyLines(character: CharacterState, age: number): string[] {
    if (age < 16) return [];
    const lines: string[] = [];
    if (character.finance.debt > 0) {
        lines.push("La deuda siguió presente en los cálculos del mes, incluso en los días en que no se hablaba de ella.");
    }
    if (character.finance.money <= 0) {
        lines.push("El saldo no daba para improvisar. Aprendiste a distinguir lo que querías de lo que podías sostener.");
    } else if (character.finance.money > character.finance.annualExpenses * 0.6 && character.finance.annualExpenses > 0) {
        lines.push("La cuenta tenía margen. No era riqueza, pero por primera vez una urgencia no obligaba a pedir ayuda.");
    }
    lines.push(
        "Revisaste gastos pequeños y descubriste que sumaban más de lo que parecía.",
        "Una compra que parecía necesaria esperó unos días. Al final, no la hiciste.",
    );
    return lines;
}

function healthLines(character: CharacterState): string[] {
    const lines: string[] = [];
    if (character.stats.health < 45) {
        lines.push("El cuerpo te recordó sus límites varias veces esta semana. Tuviste que elegir qué dejar para otro día.");
    } else if (character.stats.health > 75) {
        lines.push("Te sentiste con energía suficiente para hacer una cosa más de la prevista.");
    }
    lines.push(
        "Dormiste irregularmente unos días y notaste el efecto en el humor antes que en el cuerpo.",
        "Caminaste más de lo habitual y volviste con esa fatiga buena que ayuda a dormir.",
    );
    if ((character.chronicConditions ?? []).length > 0) {
        lines.push("Una condición que ya conocías se dejó notar sin convertirse en una emergencia.");
    }
    return lines;
}

function educationLines(character: CharacterState): string[] {
    if (character.age < 6) return [];
    if (character.employment.status === "student") return [];
    if (character.age < 25 && character.educationLevel !== "university" && character.educationLevel !== "postgraduate") {
        return [
            "Viste una convocatoria de formación y guardaste el enlace sin decidir nada.",
            "Alguien te habló de un oficio que no habías considerado. La curiosidad se quedó contigo.",
        ];
    }
    return [
        "Aprendiste algo nuevo por tu cuenta, sin examen ni certificado.",
        "Leíste sobre un tema que no tenía nada que ver con tu trabajo y te sirvió para pensar distinto.",
    ];
}

function migrationLines(character: CharacterState, birth: BirthProfile): string[] {
    if (character.currentCountry === character.birthCountry) return [];
    return [
        `Vivir en ${getCountry(character.currentCountry).name} seguía teniendo cosas que no entendías del todo.`,
        `Una llamada con alguien de ${birth.countryName} te dejó una nostalgia difícil de explicar.`,
        "Hiciste un trámite que llevaba meses pendiente y sentiste que la vida se ordenaba un poco.",
        "Alguien te preguntó de dónde eras. Respondiste con dos lugares a la vez.",
    ];
}

function leisureLines(character: CharacterState): string[] {
    return [
        "Dedicaste una hora a algo que no servía para pagar facturas ni para mejorar tu currículum.",
        "Viste una película, leíste unas páginas o escuchaste música sin hacer otra cosa a la vez.",
        "Una afición que tenías abandonada volvió por una tarde.",
        "Pasaste tiempo con alguien sin mirar el reloj.",
    ];
}

function pickFresh(
    pool: string[],
    count: number,
    rng: ReturnType<typeof createRng>,
    used: Set<string>,
): string[] {
    const fresh = pool.filter((line) => line && !used.has(line));
    const source = fresh.length >= count ? fresh : pool.filter((line) => line && !used.has(line)).concat(pool);
    const shuffled = rng.shuffle([...new Set(source)]);
    const selected = shuffled.slice(0, count);
    selected.forEach((line) => used.add(line));
    return selected;
}

export function chronicleYear(
    seed: string,
    birth: BirthProfile,
    character: CharacterState,
    year: number,
    recent: string[] = [],
): string[] {
    const rng = createRng(deriveSeed(seed, "chronicle", character.age, year));
    const used = new Set(recent);
    const lines: string[] = [];

    lines.push(...pickFresh(stageLines(character.age), 2, rng, used));

    const contextPools = character.age < 2
        ? [{ lines: familyLines(character), weight: 1 }]
        : character.age < 6
            ? [
                { lines: familyLines(character), weight: 1.1 },
                { lines: leisureLines(character), weight: 0.7 },
            ]
            : character.age < 16
                ? [
                    { lines: familyLines(character), weight: 1.1 },
                    { lines: educationLines(character), weight: 1 },
                    { lines: leisureLines(character), weight: 0.8 },
                ]
                : [
                    { lines: workLines(character), weight: 1.5 },
                    { lines: familyLines(character), weight: 1.35 },
                    { lines: moneyLines(character, character.age), weight: 1.3 },
                    { lines: healthLines(character), weight: 1.1 },
                    { lines: educationLines(character), weight: 0.65 },
                    { lines: migrationLines(character, birth), weight: 0.9 },
                    { lines: leisureLines(character), weight: 0.8 },
                ];
    const active = contextPools.filter((pool) => pool.lines.length > 0);
    const selectedPools = rng.shuffle(active).slice(0, 2);
    for (const pool of selectedPools) lines.push(...pickFresh(pool.lines, 1, rng, used));

    lines.push(...pickFresh(PLACE_LINES, 1, rng, used));
    if (rng.chance(55)) lines.push(...pickFresh(INNER, 1, rng, used));

    // El lugar concreto aparece de vez en cuando para que la crónica no sea
    // intercambiable entre países.
    if (rng.chance(40)) {
        const place = character.currentLocation || getCountry(character.currentCountry).name;
        lines.push(`En ${place}, la vida siguió mezclando lo cotidiano con lo que todavía no tenía nombre.`);
    }

    return [...new Set(lines)].filter((line) => !recent.includes(line));
}

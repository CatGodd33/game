import type { CharacterState, MonthlyStatement } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { createRng, deriveSeed } from "./rng.js";
import { relationshipMemory } from "./relationship-progress.js";

type StoryCategory = "amor" | "familia" | "amistad" | "trabajo" | "dinero" | "salud" | "lugar" | "chisme" | "educacion" | "vida";
type Importance = "alta" | "media";

interface StoryScene {
    id: string;
    category: StoryCategory;
    importance: Importance;
    minAge: number;
    maxAge: number;
    when?: (c: CharacterState, game: StoredGame) => boolean;
    text: (c: CharacterState, game: StoredGame) => string;
}

const STORY_SCENES: StoryScene[] = [
    {
        id: "first-word", category: "familia", importance: "alta", minAge: 0, maxAge: 3,
        text: (c) => `Dijiste una palabra que nadie esperaba y la casa entera se detuvo. Alguien la repitió para asegurarse; tú la dijiste otra vez, solo para ver qué pasaba.`,
    },
    {
        id: "night-fever", category: "salud", importance: "alta", minAge: 0, maxAge: 5,
        text: (c) => `Tuviste fiebre de madrugada en ${c.currentLocation}. Alguien pasó la noche en una silla, contando las horas y mojándote la frente. Por la mañana el mundo volvió a ser pequeño y seguro.`,
    },
    {
        id: "spoon-orchestra", category: "vida", importance: "media", minAge: 1, maxAge: 4,
        text: () => "Descubriste que una cuchara podía hacer ruido contra la mesa. Repetiste el concierto hasta que te la quitaron, y entonces descubriste la palabra «no».",
    },
    {
        id: "hiding-visitor", category: "familia", importance: "media", minAge: 1, maxAge: 4,
        text: () => "Una visita intentó cogerte en brazos. Te escondiste primero y, diez minutos después, ya no querías que se marchara. Los adultos llamaron a eso timidez; tú solo estabas decidiendo.",
    },
    {
        id: "lost-treasure", category: "vida", importance: "media", minAge: 3, maxAge: 8,
        text: () => "Perdiste una piedra que para ti era un tesoro. Alguien se sentó contigo a buscarla hasta que apareció detrás de un mueble. Nunca olvidaste que se quedó.",
    },
    {
        id: "first-friend", category: "amistad", importance: "alta", minAge: 3, maxAge: 8,
        text: (c) => `Conociste a alguien en una tarde cualquiera de ${c.currentLocation}. Al principio solo compartisteis un columpio; al final, ya estabais inventando un mundo que solo entendíais vosotros dos.`,
    },
    {
        id: "scraped-knee", category: "salud", importance: "media", minAge: 2, maxAge: 7,
        text: () => "Te caíste corriendo y te rasgaste la rodilla. Lloraste más por la sorpresa que por el dolor. Alguien te curó con paciencia y, esa noche, la herida ya era una historia que querías contar.",
    },
    {
        id: "question-why", category: "educacion", importance: "alta", minAge: 2, maxAge: 6,
        text: () => "Preguntaste por qué el cielo cambiaba de color. La primera respuesta no te convenció y seguiste preguntando hasta que un adulto se sentó a mirarlo contigo. Aprendiste que una pregunta también puede ser una forma de compañía.",
    },
    {
        id: "library-card", category: "educacion", importance: "alta", minAge: 5, maxAge: 10,
        text: (c) => `Tuviste tu primer carné de la biblioteca de ${c.currentLocation}. Elegiste un libro por la portada y otro por el lomo; el segundo te cambió más. Desde entonces, una parte de tu vida empezó a ocurrir en las páginas de otras personas.`,
    },
    {
        id: "rainy-afternoon", category: "vida", importance: "media", minAge: 3, maxAge: 9,
        text: (c) => `Una tarde de lluvia canceló los planes de ${c.currentLocation}. Construiste una fortaleza con mantas y sillas. Nadie vino a corregirla; por unas horas, el salón fue un lugar que habías inventado tú.`,
    },
    {
        id: "family-move", category: "lugar", importance: "alta", minAge: 4, maxAge: 12,
        text: (c) => `En casa se habló de mudarse de ${c.currentLocation}. No viste las cajas, pero sí los mapas y las conversaciones a media voz. Aprendiste que los adultos también pueden tener miedo de empezar otra vez.`,
    },
    {
        id: "class-unfair", category: "amistad", importance: "alta", minAge: 6, maxAge: 12,
        text: () => "En clase, alguien se llevó el mérito de una idea tuya. La persona que se sentaba detrás sí se acordaba de quién la había dicho primero, y te lo dijo al salir.",
    },
    {
        id: "family-money-child", category: "dinero", importance: "alta", minAge: 6, maxAge: 14,
        text: (c) => `Oíste a tu familia hablar de una factura que no sabían cómo pagar. Nadie te explicó los números, pero aprendiste a mirar el precio de las cosas antes de pedirlas.`,
        when: (c) => c.finance.annualIncome < 9000 || c.finance.money < 1000,
    },
    {
        id: "teacher-belief", category: "vida", importance: "alta", minAge: 8, maxAge: 16,
        text: () => "Una profesora te dijo que confiaba en ti. No fue una nota ni un premio: fue una frase que te acompañó toda la semana y, sin que ella lo supiera, varios años.",
    },
    {
        id: "friend-betrayal", category: "amistad", importance: "alta", minAge: 10, maxAge: 18,
        text: () => "Una amistad contó algo que le habías confiado. No hubo una pelea épica; hubo un silencio nuevo en el pasillo y la certeza de que algunas confianzas no vuelven igual.",
    },
    {
        id: "first-job-pay", category: "trabajo", importance: "alta", minAge: 14, maxAge: 20,
        text: (c) => `Cobraste tu primer trabajo pequeño en ${c.currentLocation}. El dinero no era mucho, pero la cuenta era tuya y por primera vez entendiste lo que costaba una hora.`,
        when: (c) => c.employment.status === "employed" || (c.manualActions ?? []).some(a => /trabajo|turno|aprendiz/i.test(a.text)),
    },
    {
        id: "teen-secret", category: "chisme", importance: "alta", minAge: 12, maxAge: 18,
        text: () => "Un rumor sobre ti empezó a circular por el instituto. La versión que llegó al final tenía poco que ver contigo. Descubriste que corregir cada frase era imposible; elegir a quién escuchar, no.",
    },
    {
        id: "leaving-town", category: "lugar", importance: "alta", minAge: 15, maxAge: 22,
        text: (c) => `Pensaste en irte de ${c.currentLocation}. La idea te duró todo el viaje de vuelta y volvió cada vez que el horizonte parecía demasiado conocido.`,
    },
    {
        id: "family-secret", category: "familia", importance: "alta", minAge: 16, maxAge: 40,
        text: () => "Una conversación familiar destapó una historia que llevaba años debajo de la mesa. No cambió lo que había pasado, pero cambió la forma en que mirabas a quien la había callado.",
    },
    {
        id: "mentor-work", category: "trabajo", importance: "alta", minAge: 20, maxAge: 62,
        text: (c) => `En ${c.currentLocation}, alguien con más experiencia te enseñó algo que no estaba en ningún manual: cómo decir que no sin cerrar una puerta.`,
        when: (c) => c.employment.status === "employed" || c.employment.status === "self-employed",
    },
    {
        id: "layoff-rumor", category: "trabajo", importance: "alta", minAge: 20, maxAge: 62,
        text: (c) => `Corrió el rumor de una reorganización en ${c.employment.occupation ?? "tu trabajo"}. Nadie confirmó nada. Pasaste la semana leyendo entre líneas y decidiendo qué parte de tu futuro dependía de una reunión.`,
        when: (c) => c.employment.status === "employed",
    },
    {
        id: "unethical-request", category: "trabajo", importance: "alta", minAge: 22, maxAge: 62,
        text: () => "Un superior te pidió algo que no estaba del todo bien. No era un delito evidente, solo una zona gris con un plazo muy corto. Dijiste que sí, que no o que necesitabas hablarlo; la respuesta te definió más de lo que esperabas.",
        when: (c) => c.employment.status === "employed",
    },
    {
        id: "first-customer", category: "trabajo", importance: "alta", minAge: 18, maxAge: 75,
        text: (c) => `El primer cliente de ${c.business?.name ?? "tu proyecto"} pagó tarde, pero pagó. Contaste el dinero dos veces y entendiste que una empresa también se construye con paciencia.`,
        when: (c) => Boolean(c.business?.active),
    },
    {
        id: "late-payment", category: "dinero", importance: "alta", minAge: 18, maxAge: 80,
        text: (c) => `Un cliente de ${c.business?.name ?? "tu negocio"} prometió pagar la semana siguiente. La semana se convirtió en un mes y tu cuenta empezó a notar la diferencia entre facturar y cobrar.`,
        when: (c) => Boolean(c.business?.active),
    },
    {
        id: "parent-aging", category: "familia", importance: "alta", minAge: 25, maxAge: 75,
        text: (c) => `${c.story?.relatives.find(r => (r.role === "mother" || r.role === "father") && r.alive)?.name ?? "Uno de tus padres"} olvidó una cita importante. No fue grave, pero la conversación siguiente tuvo otro tono: el cuidado empezaba a cambiar de dirección.`,
        when: (c) => (c.story?.relatives ?? []).some(r => (r.role === "mother" || r.role === "father") && r.alive),
    },
    {
        id: "sibling-loan", category: "dinero", importance: "alta", minAge: 22, maxAge: 70,
        text: (c) => `Una persona de tu familia te pidió dinero. No era una cifra enorme, pero sí lo bastante grande para cambiar la relación si no volvía. Prestaste, dijiste que no o buscaste otra forma de ayudar.`,
        when: (c) => (c.story?.relatives ?? []).some(r => ["sibling", "mother", "father"].includes(r.role) && r.alive),
    },
    {
        id: "friend-crisis", category: "amistad", importance: "alta", minAge: 20, maxAge: 80,
        text: () => "Una amistad te llamó a una hora rara. No quería consejos; quería que alguien estuviera al otro lado. Al día siguiente no mencionó la llamada, pero tú tampoco la olvidaste.",
    },
    {
        id: "gossip-work", category: "chisme", importance: "alta", minAge: 20, maxAge: 65,
        text: (c) => `En ${c.employment.occupation ?? "el trabajo"} alguien contó una versión exagerada de una decisión tuya. Lo curioso no fue el rumor, sino descubrir quién lo había repetido con más entusiasmo.`,
        when: (c) => c.employment.status === "employed",
    },
    {
        id: "gossip-neighborhood", category: "chisme", importance: "media", minAge: 18, maxAge: 90,
        text: (c) => `Una persona de ${c.currentLocation} contó una versión de tu vida que no reconocías. En lugar de corregirla, te preguntaste qué parte de ti había elegido inventarse.`,
    },
    {
        id: "neighborhood-change", category: "lugar", importance: "media", minAge: 18, maxAge: 90,
        text: (c) => `El barrio de ${c.currentLocation} cambió otra vez: una tienda cerró, otra abrió. La ciudad seguía tomando decisiones que nadie te preguntaba.`,
    },
    {
        id: "migration-belonging", category: "lugar", importance: "alta", minAge: 18, maxAge: 80,
        text: (c) => `Alguien te preguntó de dónde eras. Respondiste con dos lugares a la vez y notaste que la pregunta no era solo geográfica.`,
        when: (c) => c.currentCountry !== c.birthCountry,
    },
    {
        id: "migration-return", category: "lugar", importance: "alta", minAge: 25, maxAge: 85,
        text: (c) => `Volviste a ${c.birthCountry} por unos días. La casa era más pequeña, la calle más corta y la nostalgia menos simple de lo que recordabas.`,
        when: (c) => c.currentCountry !== c.birthCountry,
    },
    {
        id: "health-scare", category: "salud", importance: "alta", minAge: 25, maxAge: 85,
        text: () => "Una revisión rutinaria terminó con una prueba adicional. Los días de espera fueron un paréntesis en los que ninguna otra cosa parecía urgente. El resultado llegó; la forma de mirar el cuerpo, también.",
    },
    {
        id: "sleep-debt", category: "salud", importance: "media", minAge: 18, maxAge: 65,
        text: () => "Dormiste mal varias noches seguidas. No fue una crisis, solo una deuda pequeña que el cuerpo empezó a cobrar en forma de paciencia y errores.",
    },
    {
        id: "scam-call", category: "dinero", importance: "alta", minAge: 18, maxAge: 85,
        text: () => "Una llamada ofrecía una inversión con una rentabilidad imposible. La voz sonaba segura y el plazo era corto. Antes de decidir, preguntaste de dónde salía el beneficio; la respuesta perdió seguridad.",
    },
    {
        id: "unexpected-bill", category: "dinero", importance: "media", minAge: 18, maxAge: 85,
        text: () => "Una factura inesperada llegó el mismo mes que otro gasto. No era una catástrofe, pero te obligó a revisar lo que considerabas esencial y lo que solo era costumbre.",
    },
    {
        id: "inheritance-talk", category: "familia", importance: "alta", minAge: 35, maxAge: 85,
        text: () => "La familia habló de una herencia. Nadie discutió todavía; solo se repartieron silencios y expectativas. Descubriste que el dinero también puede ser una forma de hablar del pasado.",
        when: (c) => (c.story?.relatives ?? []).some(r => !r.alive),
    },
    {
        id: "child-school", category: "familia", importance: "alta", minAge: 25, maxAge: 70,
        text: (c) => `${c.story?.relatives.find(r => r.role === "child" && r.alive && r.generation !== "grandchild")?.name ?? "Tu hijo"} llegó a casa con una pregunta que no esperabas. La respuesta que diste no estaba en ningún libro; la pensaste mientras hablabas.`,
        when: (c) => c.children > 0,
    },
    {
        id: "child-distance", category: "familia", importance: "alta", minAge: 35, maxAge: 85,
        text: (c) => `${c.story?.relatives.find(r => r.role === "child" && r.alive && r.generation !== "grandchild")?.name ?? "Tu hijo"} hizo un plan sin consultarte. No era una traición; era la prueba de que había crecido. Aun así, tardaste en acostumbrarte.`,
        when: (c) => c.children > 0,
    },
    {
        id: "friend-reconnect", category: "amistad", importance: "media", minAge: 30, maxAge: 90,
        text: () => "Una amistad que hacía años que no veías te escribió. La conversación retomó donde se había quedado, como si el tiempo hubiera sido solo una pausa larga.",
    },
    {
        id: "friend-wedding", category: "amor", importance: "media", minAge: 20, maxAge: 60,
        text: (c) => `Te invitaron a una boda en ${c.currentLocation}. Viste a dos personas prometerse cosas grandes y, de vuelta a casa, pensaste en qué promesas estabas dispuesto/a a sostener tú.`,
    },
    {
        id: "ex-reappears", category: "amor", importance: "alta", minAge: 22, maxAge: 70,
        text: () => "Una persona del pasado reapareció con un mensaje breve. No pedía volver; solo saludaba. Aun así, la conversación ocupó más espacio del que esperabas.",
        when: (c) => !c.partnerName || (c.relationship?.timeline?.length ?? 0) > 2,
    },
    {
        id: "single-dating", category: "amor", importance: "media", minAge: 20, maxAge: 70,
        text: (c) => `Una cita en ${c.currentLocation} empezó con una anécdota y terminó antes de lo previsto. No hubo chispa, pero sí una conversación honesta sobre lo que cada uno buscaba.`,
        when: (c) => !c.partnerName,
    },
    {
        id: "business-partner", category: "trabajo", importance: "alta", minAge: 20, maxAge: 80,
        text: (c) => `Un socio o colaborador de ${c.business?.name ?? "tu proyecto"} propuso cambiar el reparto de beneficios. La propuesta tenía lógica y también una parte que no encajaba. La próxima conversación importaba más que la primera.`,
        when: (c) => Boolean(c.business?.active),
    },
    {
        id: "employee-problem", category: "trabajo", importance: "alta", minAge: 22, maxAge: 80,
        text: (c) => `Una persona del equipo de ${c.business?.name ?? "tu negocio"} llegó tarde otra vez. La tercera vez ya no era un accidente, sino una decisión que afectaba a los demás.`,
        when: (c) => Boolean(c.business?.active) && (c.business?.employees ?? 0) > 0,
    },
    {
        id: "volunteer", category: "vida", importance: "media", minAge: 25, maxAge: 90,
        text: (c) => `Dedicaste una tarde a una causa de ${c.currentLocation}. No cambió el mundo; cambió la forma en que recordabas que el mundo también estaba formado por otras personas.`,
    },
    {
        id: "retirement-empty", category: "vida", importance: "alta", minAge: 60, maxAge: 95,
        text: () => "Alguien te preguntó a qué te dedicabas y tardaste en responder. Por primera vez, el nombre de un trabajo no parecía suficiente y el día tenía un hueco que nadie había llenado por ti.",
    },
    {
        id: "grandchild-question", category: "familia", importance: "alta", minAge: 55, maxAge: 95,
        text: (c) => `${c.story?.relatives.find(r => r.role === "child" && r.alive && r.generation === "grandchild")?.name ?? "Un nieto"} te preguntó por una época que tú viviste y que para él ya es historia. Le contaste una parte; el resto lo guardaste para otro día.`,
        when: (c) => (c.story?.relatives ?? []).some(r => r.role === "child" && r.generation === "grandchild" && r.alive),
    },
    {
        id: "old-photo", category: "vida", importance: "media", minAge: 45, maxAge: 95,
        text: () => "Una foto antigua reapareció en una conversación. Te fijaste en la persona que quedó en una esquina y en todo lo que no sabías de ella entonces. Ahora tampoco lo sabías, pero la mirabas de otra forma.",
    },
    {
        id: "body-limit", category: "salud", importance: "alta", minAge: 55, maxAge: 95,
        text: () => "Una tarea que antes hacías sin pensar te obligó a parar. No fue una derrota; fue una información. A partir de ahí, pedir ayuda dejó de ser una excepción.",
    },
    {
        id: "will-conversation", category: "familia", importance: "alta", minAge: 50, maxAge: 95,
        text: () => "Hablaste con tu familia de lo que dejarías y de lo que querías que se hiciera. La conversación fue incómoda, pero alguien agradeció que la empezaras.",
    },
    {
        id: "old-friend-funeral", category: "amistad", importance: "alta", minAge: 55, maxAge: 100,
        text: (c) => `Fuiste al funeral de alguien en ${c.currentLocation}. No eras su mejor amigo, pero su ausencia te hizo repasar una lista de personas a las que quizá llamar antes de que sea tarde.`,
    },
    {
        id: "quiet-pride", category: "vida", importance: "media", minAge: 30, maxAge: 100,
        text: () => "Hiciste una cosa bien sin que nadie te felicitara. No hubo premio ni titular; solo la satisfacción de saber que estaba hecho como querías.",
    },
    {
        id: "business-rebuild", category: "trabajo", importance: "alta", minAge: 25, maxAge: 80,
        text: (c) => `Después de un negocio que no salió, alguien te pidió consejo para abrir el suyo. Descubriste que tu experiencia también valía algo, aunque no apareciera en una cuenta de resultados.`,
        when: (c) => (c.flags ?? []).some(f => ["negocio_quebrado", "quiebra_personal"].includes(f)),
    },
    {
        id: "scholarship-return", category: "educacion", importance: "alta", minAge: 22, maxAge: 85,
        text: (c) => `Una persona joven de ${c.currentLocation} te preguntó cómo conseguiste estudiar. Le contaste lo que nadie te había contado: las solicitudes, el miedo y las horas que no se ven en un título.`,
        when: (c) => (c.flags ?? []).some(f => ["beca_escolar", "estudios_exterior", "ruta_acreditada"].includes(f)),
    },
    {
        id: "return-to-study", category: "educacion", importance: "alta", minAge: 25, maxAge: 70,
        text: () => `Volviste a mirar una convocatoria de estudios que habías dejado pasar. La edad ya no era el obstáculo que imaginabas; el tiempo y el dinero, sí.`,
        when: (c) => (c.flags ?? []).includes("dejo_estudios"),
    },
    {
        id: "shared-home", category: "amor", importance: "alta", minAge: 20, maxAge: 80,
        text: (c) => `Repartir la casa con ${c.partnerName} hizo visible lo que ninguna cita mostraba: quién cocina, quién paga y quién cede espacio. No era romántico; era la relación de verdad.`,
        when: (c) => Boolean(c.partnerName && c.partnerProfile?.sharedHousehold),
    },
    {
        id: "future-pressure", category: "amor", importance: "alta", minAge: 24, maxAge: 70,
        text: (c) => `Una conversación con ${c.partnerName} volvió al tema del futuro. No había una boda decidida; había dos personas comprobando si querían lo mismo.`,
        when: (c) => Boolean(c.partnerName && (c.relationship?.timeline?.length ?? 0) >= 3 && c.relationship?.stage !== "engaged" && c.relationship?.stage !== "married"),
    },
    {
        id: "gossip-repair", category: "chisme", importance: "media", minAge: 18, maxAge: 90,
        text: (c) => `Un rumor sobre ti se había convertido en la versión oficial de una historia que no era la tuya. Elegiste a quién corregir y a quién dejar hablar; no era cobardía, era administrar energía.`,
        when: (c) => (c.flags ?? []).some(f => ["estafado", "denunciante", "antecedente_penal", "delito_menor"].includes(f)),
    },

];

function sceneText(scene: StoryScene, c: CharacterState, game: StoredGame): string {
    return scene.text(c, game)
        .replaceAll("{city}", c.currentLocation)
        .replaceAll("{country}", c.currentCountry)
        .replaceAll("{partner}", c.partnerName ?? "alguien")
        .replaceAll("{business}", c.business?.name ?? "tu proyecto");
}

/** El diario no es un contador de meses: es una selección de escenas con peso. */
export function monthlyStory(game: StoredGame, c: CharacterState, statement: MonthlyStatement): void {
    const rng = createRng(deriveSeed(game.seed, "ordinary-month", c.id, game.currentYear, statement.month));
    const relationshipBeat = relationshipMemory(c, game.currentYear);
    if (relationshipBeat) {
        c.manualActions = [...(c.manualActions ?? []), {
            year: game.currentYear,
            month: statement.month - 1,
            action: "chronicle",
            category: "amor",
            importance: "alta",
            text: relationshipBeat,
        }];
        return;
    }
    // Cuatro escenas al año, no doce frases de relleno. Los acontecimientos
    // importantes del motor se siguen registrando aparte.
    if (![1, 4, 7, 10].includes(statement.month)) return;
    const eligible = STORY_SCENES.filter(scene =>
        c.age >= scene.minAge && c.age <= scene.maxAge && (!scene.when || scene.when(c, game)),
    );
    if (!eligible.length) return;
    const seen = new Set((c.manualActions ?? []).filter(a => a.action === "chronicle").slice(-48).map(a => a.text));
    const fresh = eligible.filter(scene => !seen.has(sceneText(scene, c, game)));
    // Si la franja de edad no tiene escenas nuevas, es mejor un diario más corto
    // que repetir la misma frase tres veces en el mismo año.
    if (!fresh.length) return;
    const scene = rng.pick(fresh);
    const text = sceneText(scene, c, game);
    c.manualActions = [...(c.manualActions ?? []), {
        year: game.currentYear,
        month: statement.month - 1,
        action: "chronicle",
        category: scene.category,
        importance: scene.importance,
        text,
    }];
}

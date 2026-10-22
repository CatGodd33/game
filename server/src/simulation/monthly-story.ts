import type { CharacterState, MonthlyStatement } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { createRng, deriveSeed } from "./rng.js";
import { advanceArcChapter } from "../narrative/arcs.js";

/**
 * Diario mensual: escenas narrativas, nunca un resumen contable. El banco es
 * la fuente de verdad de saldos y movimientos. Las escenas se eligen con la
 * semilla del mundo y evitan repetir las últimas entradas.
 */
export function monthlyStory(game: StoredGame, c: CharacterState, statement: MonthlyStatement): void {
    const rng = createRng(deriveSeed(game.seed, "ordinary-month", c.id, game.currentYear, statement.month));
    const arcScene = advanceArcChapter(game, c, rng);
    const city = c.currentLocation;
    const partner = c.partnerName;
    const children = (c.story?.relatives ?? []).filter(
        (relative) => relative.role === "child" && relative.generation !== "grandchild" && relative.alive && game.currentYear - relative.bornYear < 18,
    );
    const recent = (c.manualActions ?? []).slice(-24).map((entry) => entry.text);
    const lastIndexOf = (line: string): number => {
        let last = -1;
        recent.forEach((entry, index) => {
            if (entry.startsWith(line)) last = index;
        });
        return last;
    };
    const lastChronicle = [...(c.manualActions ?? [])].reverse().find((entry) => entry.action === "chronicle")?.text ?? "";
    const pickFresh = (pool: string[]): string => {
        const fresh = pool.filter((line) => lastIndexOf(line) === -1);
        if (fresh.length) return rng.pick(fresh);
        // Todas las escenas ya aparecieron: recuperar la que lleva más tiempo sin usarse.
        const oldest = [...pool].sort((first, second) => lastIndexOf(first) - lastIndexOf(second));
        const candidate = oldest.find((line) => !lastChronicle.startsWith(line)) ?? oldest[0] ?? pool[0]!;
        return candidate;
    };
    const scenes: string[] = [];

    if (c.age < 3) {
        scenes.push(
            `En ${city}, una voz conocida te calmó después de una noche de llanto. Alguien se quedó despierto hasta que volviste a dormir.`,
            `Gateaste hasta una puerta y esperaste. Cuando se abrió, levantaste los brazos: ya sabías que había personas que volvían.`,
            `Una cuchara, una caja y una tela se convirtieron en tu juguete favorito. El mundo todavía cabía en una habitación.`,
        );
        scenes.push(
            `La primera vez que probaste una fruta nueva, arrugaste la cara y luego pediste más.`,
            `Una visita trajo un regalo y una discusión que se apagó cuando entró en la habitación.`,
            `Aprendiste a señalar lo que querías. No siempre te entendieron, pero alguien se agachó a mirar.`,
            `En ${city}, una tormenta te despertó. Una mano encontró la tuya en la oscuridad.`,
            `Descubriste tu reflejo en una cuchara y te reíste hasta quedarte sin aire.`,
            `La fiebre subió de madrugada. Alguien pasó la noche en una silla, contando las horas.`,
        );

    } else if (c.age < 6) {
        scenes.push(
            `En ${city}, inventaste una historia con dos muñecos y se la contaste a quien quisiera escucharla. La historia terminó distinta cada vez.`,
            `Te enfadaste porque un juego no salió como querías. Después de un rato, alguien te ayudó a poner palabras a la rabia.`,
            `Descubriste una palabra nueva y la usaste toda la tarde. En casa se turnaron para responderte con paciencia.`,
        );
        scenes.push(
            `En el patio, alguien no quiso compartir. Aprendiste que decir «no» también puede doler.`,
            `Un familiar prometió venir y no llegó. Al día siguiente trajo una excusa y un dulce.`,
            `Te escondiste detrás de una cortina para escuchar una conversación de adultos. Solo entendiste una palabra.`,
            `Perdiste un juguete en la calle. Alguien lo dejó en la portería sin dejar nota.`,
            `En la escuela, una maestra se agachó hasta tu altura para explicarte algo dos veces.`,
            `Un niño mayor te puso un apodo. Un amigo se sentó a tu lado sin decir nada.`,
        );

    } else if (c.age < 18) {
        if (c.employment.status === "employed" || c.flags?.includes("dejo_estudios")) {
            scenes.push(
                `Después del trabajo en ${city}, todavía encontrabas un rato para repasar. La fatiga y la esperanza ocupaban el mismo escritorio.`,
                `Una amistad te escribió mientras volvías a casa. Responder tarde no era lo mismo que haber desaparecido.`,
                `Un adulto de tu entorno habló de una formación compatible con tus horas. No era una promesa, pero abría una puerta.`,
            );
        } else {
            scenes.push(
                `En clase de ${city}, una discusión sobre una película terminó hablando de algo más personal. Nadie lo dijo en voz alta.`,
                `Suspendiste una tarea que esperabas aprobar. La vergüenza duró menos que la conversación con la persona que te ayudó a repasarla.`,
                `Un grupo de amigos hizo planes sin consultarte. Lo dejaste pasar, aunque te quedó una pregunta que no te atreviste a hacer.`,
                `Ensayaste una respuesta frente al espejo. Cuando llegó el momento real, dijiste algo completamente distinto y sobreviviste.`,
            );
            scenes.push(
                `En el instituto, alguien contó algo tuyo que no era suyo. La risa se apagó cuando entraste.`,
                `Un profesor dijo que no servías para una asignatura. Guardaste el comentario más de lo que admitiste.`,
                `El grupo de clase hizo un plan para el sábado. Te enteraste el lunes.`,
                `Una amistad te pidió dinero prestado. Dijiste que sí antes de pensar si podías.`,
                `En ${city}, dos personas que querías dejaron de hablarse. Te pidieron que eligieras un lado.`,
                `Volviste a casa con una nota mala. Tu madre firmó sin preguntar y luego preguntó en la cocina.`,
                `Alguien te besó en una fiesta. Al día siguiente ninguno de los dos sabía qué había cambiado.`,
                `Un rumor sobre tu familia llegó al colegio. Contestaste con una verdad a medias.`,
            );

        }
    } else {
        if (c.educationPlan && !c.educationPlan.paused) {
            scenes.push(
                `En ${c.educationPlan.institution}, un trabajo en grupo avanzó gracias a una conversación que empezó siendo una queja.`,
                `Revisaste el calendario de ${c.educationPlan.title} y sentiste a la vez alivio y cansancio: aún quedaba camino.`,
                `Compartiste apuntes con alguien que apenas conocías. La ayuda fue pequeña; el gesto, no.`,
            );
        }
        if (c.employment.status === "employed") {
            scenes.push(
                `Como ${c.employment.occupation ?? "trabajador/a"} en ${city}, asumiste una tarea que nadie había reclamado. Después pediste que se reconociera en el reparto.`,
                `Una compañera de trabajo te contó un problema personal entre dos reuniones. Escuchaste sin convertir la conversación en un informe.`,
                `Un error tuyo retrasó una entrega. Lo reconociste, lo corrigieron juntos y la jornada siguió; no todo se hundió.`,
            );
        }
        if (c.employment.status === "unemployed") {
            scenes.push(
                `Una respuesta negativa llegó un martes por la mañana. Cerrar el correo y salir a caminar por ${city} fue la decisión más difícil del día.`,
                `Alguien de tu entorno mencionó una oportunidad. Antes de ilusionarte, revisaste los requisitos y lo que tendrías que aprender.`,
                `Reorganizaste tus horas como si el trabajo todavía existiera. Buscar también cansa, aunque nadie lo vea.`,
            );
        }
        if (c.employment.status === "retired") {
            scenes.push(
                `Un paseo por ${city} te devolvió a una calle que recordabas distinta. Te detuviste a mirar una obra que ya no reconocías.`,
                `Compartiste una historia de tu juventud con alguien más joven. Esa persona hizo una pregunta que te obligó a pensarla otra vez.`,
                `Una mañana sin obligaciones se volvió larga. Llamaste a alguien solo para no dejar que el silencio decidiera por ti.`,
            );
        }
        if (c.business?.active) {
            scenes.push(
                `En ${c.business.name}, un cliente exigió algo que no estabas dispuesto/a a prometer. Explicarlo con calma costó más que aceptar.`,
                `Revisaste las cuentas del negocio sin mirar solo el total. Había una decisión pequeña que llevabas semanas aplazando.`,
                `Alguien te propuso crecer más rápido. Pensaste en el tiempo que eso te quitaría y no respondiste de inmediato.`,
            );
        }
        if (partner) {
            scenes.push(
                `${partner} y tú discutisteis por algo doméstico que no era el verdadero motivo. Por la noche, una conversación más honesta encontró el problema real.`,
                `Compartiste con ${partner} una noticia que no sabías cómo contar. La respuesta no fue perfecta, pero no te dejó solo/a.`,
                `Un plan con ${partner} se canceló a última hora. En vez de fingir indiferencia, dijiste que te había decepcionado.`,
            );
        }
        if (children.length) {
            const child = rng.pick(children);
            const childAge = game.currentYear - child.bornYear;
            scenes.push(
                childAge < 3
                    ? `Con ${child.name}, el mes se midió en siestas y cambios de planes. Descubriste que el cansancio también puede venir con ternura.`
                    : childAge < 6
                        ? `${child.name} insistió en hacer algo sin ayuda. Salieron mal tres intentos antes de que el cuarto funcionara; su orgullo fue mayor que el desorden.`
                        : `${child.name} llegó de la escuela con una preocupación que no quiso contar de inmediato. Esperaste sin presionar hasta que empezó a hablar.`,
            );
        }
        if (c.healthPlan !== "ninguno") {
            scenes.push(
                `Una revisión médica te dejó una recomendación que no querías escuchar. Guardaste el papel y, días después, decidiste no ignorarlo.`,
                `Un síntoma pequeño te hizo pensar en todo lo que podía salir mal. La conversación con un profesional devolvió el problema a su tamaño real.`,
            );
        }
        if (c.finance.debt > Math.max(c.finance.annualIncome * 0.8, 1)) {
            scenes.push(
                `Una carta de deuda llegó junto a una factura cualquiera. La dejaste cerrada un rato antes de abrirla; el miedo también ocupaba espacio en la mesa.`,
                `Renunciaste a un gasto que te apetecía y no se lo contaste a nadie. A veces la responsabilidad se parece a una habitación más vacía.`,
                `Hiciste una lista de problemas pendientes y tachaste uno. No resolvió la situación, pero dejó de parecer un bloque imposible.`,
            );
        }
        if ((c.psychology?.stress ?? 0) > 62) {
            scenes.push(
                `Dormiste mal varias noches seguidas. Una mañana entendiste que no era solo cansancio y pediste ayuda antes de que el cuerpo decidiera por ti.`,
                `Una obligación pequeña se sintió enorme. Paraste, respiraste y dividiste el día en partes manejables; no era una solución, pero era un comienzo.`,
                `Alguien te preguntó cómo estabas y respondiste “bien” por costumbre. Luego, casi sin querer, contaste una parte de la verdad.`,
            );
        }
        if ((c.psychology?.grief ?? 0) > 30) {
            const lost = c.story?.relatives.find((relative) => !relative.alive);
            scenes.push(
                lost
                    ? `Pensaste en ${lost.name} al ver algo que le habría gustado. La tristeza no llegó con fuerza, sino como una compañía silenciosa.`
                    : `Un recuerdo de una persona que ya no está apareció sin aviso. No intentaste apartarlo; lo dejaste quedarse un rato.`,
            );
        }
        if (c.age >= 65) {
            scenes.push(
                `Una conversación sobre el futuro terminó hablando del pasado. Descubriste que recordar también es una forma de ordenar lo que queda.`,
                `Pediste ayuda para algo que antes hacías sin pensar. La persona que ayudó no lo convirtió en un favor; simplemente se quedó.`,
                `Una fotografía antigua mostró una versión de ti que casi habías olvidado. Te sorprendió no echar de menos a esa persona, sino reconocerla.`,
            );
        }
        scenes.push(
            `En ${city}, una conversación con alguien desconocido te dejó una idea que siguió contigo el resto del día.`,
            `Ordenaste un cajón y encontraste una nota que no recordabas haber guardado. La leíste dos veces y no la tiraste.`,
            `Cocinaste algo sencillo y comiste sin prisa por primera vez en semanas. El día no cambió; tu manera de estar en él, un poco.`,
            `Viste a alguien reír en la calle y, sin motivo claro, también te sentiste mejor. La felicidad a veces no pide permiso.`,
            `Un plan de última hora salió bien. No todo lo que no estaba previsto tenía que ser una amenaza.`,
        );
        scenes.push(
            `Una vecina contó en la escalera una versión de tu vida que no reconocías. Al día siguiente alguien te miró distinto.`,
            `En una cena familiar, una discusión antigua volvió a la mesa. Nadie mencionó el verdadero motivo.`,
            `Un amigo desapareció durante semanas y volvió sin explicación. Te pidió que no preguntaras.`,
            `En el trabajo, alguien se atribuyó una idea tuya. Lo supiste por cómo la contó.`,
            `Una carta de un pariente lejano pidió dinero. La foto que envió era de otra época.`,
            `En ${city}, te encontraste con alguien del pasado. Hablaste diez minutos y luego mentiste sobre tu vida.`,
            `Una discusión por un gasto pequeño escondía una decisión más grande.`,
            `Alguien de la familia enfermó y todos esperaban que tú organizaras las visitas.`,
        );

    }

    if (c.age >= 18) {
        const declared = c.story?.relatives.find((relative) => !relative.alive && relative.role === "mother");
        const support = c.story?.relatives.find((relative) => relative.alive && (relative.role === "sibling" || relative.role === "grandmother"));
        if (declared && rng.chance(16)) {
            scenes.push(`Una costumbre que aprendiste de ${declared.name} reapareció en tu casa sin que lo buscaras. Hacerla te acercó a su ausencia.`);
        }
        if (support && rng.chance(18)) {
            scenes.push(`${support.name} llamó para saber de ti. La conversación empezó por una tontería y terminó siendo necesaria.`);
        }
    }

    const scene = arcScene ?? pickFresh(scenes);
    const closing = pickFresh([
        "El mes terminó sin grandes noticias. No todos los cambios necesitan un titular para dejar huella.",
        "Hubo cosas que quedaron pendientes. También hubo una conversación que no se puede borrar de la memoria.",
        "La vida siguió su curso, mezclando lo que decidiste con lo que simplemente ocurrió.",
        "No era un mes para conclusiones. Era uno de esos meses que sostienen la historia sin ocupar el centro.",
    ]);
    const text = `${scene} ${closing}`;
    c.manualActions = [
        ...(c.manualActions ?? []),
        { year: game.currentYear, month: statement.month - 1, action: "chronicle", text },
    ];
}

import type { DecisionDefinition, DecisionOptionDefinition } from "./decision-types.js";

type EncounterContext = "university" | "work" | "online" | "community";

interface EncounterScene {
    id: string;
    title: string;
    description: string;
    context: EncounterContext;
    employment?: ("student" | "employed")[];
    /** El país se sortea con la semilla; nunca se fija en la escena. */
    partnerCountry?: "RANDOM";
    approach: {
        label: string;
        description: string;
        success: string;
        failure: string;
    };
    friendship: {
        label: string;
        description: string;
        narrative: string;
    };
    pause: {
        label: string;
        description: string;
        narrative: string;
    };
}

/**
 * Escenas breves y concretas. Cada opción responde a la situación que se
 * acaba de describir: no se reutiliza la misma frase de "cita" para una
 * biblioteca, una oficina o una conversación a distancia.
 */
const encounters: EncounterScene[] = [
    {
        id: "campus",
        title: "Una conversación después de clase",
        description:
            "Un trabajo en grupo en {city} os deja solos frente a una mesa llena de apuntes. La conversación se alarga más de lo necesario.",
        context: "university",
        employment: ["student"],
        approach: {
            label: "Proponer seguir la conversación fuera del aula",
            description: "Un café después de entregar el trabajo. Sin prometer más de lo que sentís.",
            success:
                "El café duró hasta que cerraron. No hubo una declaración, solo la sensación de que queríais volver a veros.",
            failure:
                "Dijo que tenía otros planes. La tarde quedó en un gesto amable y en la duda de si habías leído bien la conversación.",
        },
        friendship: {
            label: "Quedaros con la amistad y el trabajo en grupo",
            description: "Cuidar el vínculo sin convertirlo en una cita.",
            narrative:
                "Seguisteis compartiendo apuntes y alguna comida. La amistad encontró su sitio sin necesidad de nombrarlo todo.",
        },
        pause: {
            label: "Dejar que el semestre decida",
            description: "No forzar nada ahora; el trabajo en grupo todavía tiene semanas por delante.",
            narrative:
                "No hiciste ningún movimiento. La vida siguió y la oportunidad quedó en el aire, ni perdida ni prometida.",
        },
    },
    {
        id: "biblioteca",
        title: "La misma mesa de la biblioteca",
        description:
            "Lleváis semanas compartiendo apuntes y silencios en la misma mesa. Hoy el silencio pesa de otra manera.",
        context: "university",
        employment: ["student"],
        approach: {
            label: "Proponerle un café al terminar el examen",
            description: "Una pausa breve. Si dice que no, la mesa puede seguir siendo vuestra.",
            success:
                "El café se alargó más que el examen. Hablasteis de libros, de miedos y de lo que haríais si no tuvierais que aprobar nada.",
            failure:
                "Dijo que no con amabilidad y volvió a sus apuntes. La mesa siguió siendo vuestra, aunque ya no era lo mismo.",
        },
        friendship: {
            label: "Dejar la relación en apuntes y amistad",
            description: "El gesto de compartir mesa ya tiene valor sin convertirse en romance.",
            narrative:
                "Seguisteis pasando apuntes y cuidando el silencio. No era una historia de amor, pero era una forma de no estar solo.",
        },
        pause: {
            label: "Esperar al siguiente trabajo en grupo",
            description: "No interpretar cada silencio como una invitación.",
            narrative:
                "Dejaste que el curso avanzara. La mesa siguió ahí y tú también, con una pregunta que no llegaste a hacer.",
        },
    },
    {
        id: "colegas",
        title: "Fuera del horario de trabajo",
        description:
            "Una persona de tu equipo propone quedar al acabar el turno. Hay afinidad, pero mañana tendréis que volver a trabajar juntos.",
        context: "work",
        employment: ["employed"],
        approach: {
            label: "Aceptar la quedada y hablar de límites",
            description: "Una cita sin convertir el trabajo en un secreto ni en un problema para el equipo.",
            success:
                "Quedasteis fuera de la oficina y hablasteis de lo que cada uno esperaba. La relación empezó con una regla sencilla: el trabajo no sería el lugar para resolverla.",
            failure:
                "La quedada se sintió como una entrevista. No hubo una segunda cita, pero tampoco un conflicto en el equipo.",
        },
        friendship: {
            label: "Mantener una amistad profesional",
            description: "Cuidar la confianza sin mezclar salario, evaluación y afecto.",
            narrative:
                "Seguisteis siendo aliados en el trabajo. La amistad no necesitaba una etiqueta para sostener las mañanas difíciles.",
        },
        pause: {
            label: "No mezclar trabajo y vida personal",
            description: "Dejar la puerta cerrada por ahora, sin dramatismo.",
            narrative:
                "Elegiste no cruzar esa línea. El equipo siguió funcionando y la atracción se quedó en una anécdota que no llegó a ocurrir.",
        },
    },
    {
        id: "curso",
        title: "Alguien en el curso de idiomas",
        description:
            "Entre ejercicios y errores compartidos, una persona empieza a buscarte en los descansos. No sabes si es amistad o algo más.",
        context: "community",
        approach: {
            label: "Proponer practicar juntos fuera de clase",
            description: "Un plan pequeño, con tiempo para comprobar si la complicidad es real.",
            success:
                "La práctica se convirtió en paseos y en conversaciones que ya no necesitaban el libro. Empezasteis a conoceros de verdad.",
            failure:
                "El plan no llegó a cuajar. La clase siguió, pero los descansos volvieron a ser tuyos.",
        },
        friendship: {
            label: "Quedaros como compañeros de clase",
            description: "Disfrutar la complicidad sin exigirle una dirección romántica.",
            narrative:
                "Seguisteis corrigiendo los errores del otro. La amistad era suficiente y no necesitaba una prueba de amor.",
        },
        pause: {
            label: "Terminar el curso antes de decidir",
            description: "No confundir la cercanía del aula con una promesa.",
            narrative:
                "Dejaste que el curso terminara. El último día os despedisteis con un hasta luego que ninguno de los dos concretó.",
        },
    },
    {
        id: "red",
        title: "Una conexión que empezó por internet",
        description:
            "Una conversación online se ha vuelto importante. Hay risas, horarios raros y una identidad que todavía no has visto en persona.",
        context: "online",
        approach: {
            label: "Verificar la identidad y conoceros con calma",
            description: "Una videollamada, una dirección comprobable y ninguna transferencia de dinero.",
            success:
                "La videollamada despejó las dudas. Empezasteis a hablar de un encuentro real, con plazos y sin secretos.",
            failure:
                "La historia no encajaba. Bloqueaste el contacto con más alivio que tristeza y conservaste tus datos.",
        },
        friendship: {
            label: "Mantener una amistad a distancia",
            description: "Compartir conversaciones sin cruzar hacia una relación o una promesa económica.",
            narrative:
                "La amistad siguió por mensajes. No hubo una historia romántica, pero sí alguien que aparecía cuando el día se torcía.",
        },
        pause: {
            label: "Cerrar la conversación",
            description: "Proteger tu tiempo y tu dinero cuando la información no alcanza.",
            narrative:
                "Dejaste de responder. No fue una tragedia; fue una frontera pequeña y necesaria.",
        },
    },
    {
        id: "intercambio",
        title: "Una voz antes del amanecer",
        description:
            "Una conversación con alguien que vive en otro país se ha vuelto cotidiana. La distancia todavía es una promesa; también puede convertirse en una factura.",
        context: "online",
        partnerCountry: "RANDOM",
        approach: {
            label: "Conoceros en persona cuando sea posible",
            description: "Ahorrar para un viaje, comprobar la identidad y hablar de expectativas antes de mover la vida.",
            success:
                "El primer encuentro fue torpe y real. Descubriste manías que la pantalla escondía y decidisteis seguir con los pies en el suelo.",
            failure:
                "El viaje no salió como esperabais. Volviste con menos dinero y una certeza incómoda: la distancia no arregla lo que no se habla.",
        },
        friendship: {
            label: "Cuidar una amistad internacional",
            description: "Mantener el vínculo sin convertirlo en una relación a distancia ni en una deuda.",
            narrative:
                "Seguisteis hablando de madrugada. La amistad cruzó fronteras sin pedir una mudanza ni una promesa que no podíais sostener.",
        },
        pause: {
            label: "No cruzar todavía esa frontera",
            description: "Dejar la conversación en un lugar amable y seguir con tu vida presente.",
            narrative:
                "No hiciste las maletas. La conversación quedó en un hilo abierto, con cariño y sin obligación.",
        },
    },
    {
        id: "amistad",
        title: "Una amistad empieza a sentirse distinta",
        description:
            "Alguien de tu círculo propone una cita. La amistad tiene historia y también una pregunta que ninguno ha dicho en voz alta.",
        context: "community",
        approach: {
            label: "Explorar el vínculo sin prometer una boda",
            description: "Una cita honesta, con espacio para volver a la amistad si no funciona.",
            success:
                "La cita no borró la amistad: la puso a prueba y la cambió. Empezasteis una relación sin fingir que todo seguía igual.",
            failure:
                "Intentasteis algo más y no encajó. La amistad quedó herida, aunque ninguno había mentido.",
        },
        friendship: {
            label: "Conservar la amistad",
            description: "Decir que no a la cita sin decir que no a la persona.",
            narrative:
                "Pusiste una frontera clara y cariñosa. La amistad siguió, con una conversación incómoda que os hizo más honestos.",
        },
        pause: {
            label: "Darte tiempo antes de responder",
            description: "No convertir la duda en una respuesta precipitada.",
            narrative:
                "Pediste tiempo. La otra persona esperó sin presión y tú pudiste escuchar lo que querías de verdad.",
        },
    },
    {
        id: "vecindario",
        title: "Una invitación en {city}",
        description:
            "Después de colaborar en una actividad del barrio, alguien quiere volver a verte. No hace falta convertir cada encuentro en una relación.",
        context: "community",
        approach: {
            label: "Aceptar un plan pequeño y sin etiquetas",
            description: "Un paseo o un café para ver si hay algo más que la actividad compartida.",
            success:
                "El plan fue sencillo y sincero. Empezasteis a veros sin la excusa del barrio y sin prisa por definir lo que era.",
            failure:
                "El encuentro se quedó en una tarde agradable. No hubo segunda invitación y no pasó nada grave.",
        },
        friendship: {
            label: "Quedar como vecinos y amigos",
            description: "Mantener el vínculo comunitario sin añadir una expectativa romántica.",
            narrative:
                "Seguisteis coincidiendo en las actividades del barrio. La confianza creció sin necesidad de una cita.",
        },
        pause: {
            label: "Agradecer la invitación y no ir",
            description: "Reconocer el gesto sin comprometerte con algo que no buscas.",
            narrative:
                "Dijiste que no con claridad. El barrio siguió igual y la persona encontró otro plan para el sábado.",
        },
    },
];

function encounterDecision(scene: EncounterScene): DecisionDefinition {
    const options: DecisionOptionDefinition[] = [
        {
            id: "conocer",
            label: scene.approach.label,
            description: scene.approach.description,
            cost: { shareOfGdp: 0.002 },
            check: { type: "social", base: scene.context === "online" ? 55 : 65 },
            outcomes: {
                success: {
                    narrative: scene.approach.success,
                    setPartner: true,
                    relationshipContext: scene.context,
                    partnerCountry: scene.partnerCountry,
                    maritalStatus: "dating",
                    stats: { happiness: 4, relationships: 4 },
                },
                failure: {
                    narrative: scene.approach.failure,
                    stats: { happiness: -1, relationships: 1 },
                },
            },
        },
        {
            id: "amistad",
            label: scene.friendship.label,
            description: scene.friendship.description,
            outcomes: {
                success: {
                    narrative: scene.friendship.narrative,
                    stats: { relationships: 3, happiness: 1 },
                    flags: ["red_amigos"],
                },
            },
        },
        {
            id: "tiempo",
            label: scene.pause.label,
            description: scene.pause.description,
            outcomes: {
                success: {
                    narrative: scene.pause.narrative,
                    stats: { knowledge: 1, happiness: 1 },
                    psychology: { stress: -2 },
                },
            },
        },
    ];

    return {
        id: `encuentro_${scene.id}`,
        title: scene.title,
        description: scene.description,
        category: "familia",
        priority: "major",
        minAge: 18,
        maxAge: 79,
        cooldownYears: 6,
        weight: scene.context === "online" ? 0.14 : 3.2,
        requirements: {
            hasPartner: false,
            ...(scene.employment ? { employment: scene.employment } : {}),
            ...(scene.context === "online" ? { minEducation: "secondary" as const } : {}),
        },
        contextNote:
            scene.context === "online"
                ? "La identidad y el país de la otra persona se comprueban con calma. Ninguna escena fija Italia ni otro destino concreto."
                : undefined,
        options,
    };
}

export const RELATIONSHIP_SCENARIOS: DecisionDefinition[] = encounters.map(encounterDecision);

RELATIONSHIP_SCENARIOS.push(
    {
        id: "acuerdo_pareja", monthlyOnly: true,
        title: "¿Quieres pedirle matrimonio a {partner}?",
        description: "Después de las citas, los desacuerdos y los planes compartidos, te imaginas una vida con {partner}. Aún no hay una boda decidida: hoy puedes proponer el compromiso, hablar de convivencia o decir que todavía no estás preparado/a.",
        category: "familia", priority: "major", minAge: 20, maxAge: 85, cooldownYears: 1,
        requirements: { hasPartner: true, maritalStatus: ["dating"] },
        options: [
            {
                id: "civil", label: "Proponerle matrimonio a {partner}", description: "Decir por qué quieres compartir la vida y escuchar su respuesta. Si acepta, la celebración se decidirá más adelante.", check: { type: "social", base: 78 }, outcomes: {
                    success: { narrative: "Le pediste matrimonio a {partner}. Aceptó emocionado/a y os quedasteis hablando hasta tarde. Ahora estáis comprometidos; todavía no hay una boda ni cuentas compartidas por ese gesto.", relationshipStep: "engaged", stats: { happiness: 4, relationships: 3 } },
                    failure: { narrative: "{partner} te dijo que te quiere, pero que aún no está preparado/a para casarse. No hubo ruptura: acordasteis no convertir la espera en una deuda emocional.", relationshipStep: "wait", stats: { happiness: -2 }, psychology: { stress: 2 } }
                }
            },
            { id: "convivir", label: "Proponer vivir juntos antes de decidir una boda", description: "Hablar de tareas, gastos y espacio personal. Compartir el hogar cambia el presupuesto; no os convierte en matrimonio.", cost: { shareOfGdp: .015 }, outcomes: { success: { narrative: "{partner} y tú acordasteis probar la convivencia en {city}. Repartisteis tareas y gastos antes de entregar las llaves; el matrimonio quedó para otra conversación.", shareHousehold: true, relationshipStep: "wait", stats: { relationships: 3 }, flags: ["convivencia_acordada"] } } },
            { id: "espacio", label: "Decir que todavía no quieres dar ese paso", description: "Explicar tus dudas sin prometer una fecha. Podéis seguir juntos conservando los acuerdos actuales.", outcomes: { success: { narrative: "Dijiste a {partner} que quieres seguir juntos, pero no prometer una boda todavía. La conversación no fue fácil; al menos ninguno tuvo que adivinar al otro.", relationshipStep: "wait", stats: { relationships: 1 } } } }
        ]
    },
    {
        id: "relationship_define", monthlyOnly: true, title: "¿Qué está naciendo entre {partner} y tú?",
        description: "Os habéis vuelto a ver y ya hay confianza, pero nunca habéis hablado de qué significa lo vuestro. {partner} te pregunta si quieres intentar una relación estable o seguir conociéndoos sin compromiso.",
        category: "familia", priority: "major", minAge: 18, maxAge: 85, requirements: { hasPartner: true }, options: [
            { id: "commit", label: "Decir que quieres una relación estable", description: "Escuchar qué espera la otra persona y acordar tiempo y límites. No implica convivencia, boda ni hijos.", outcomes: { success: { narrative: "{partner} y tú decidisteis ser pareja. Hablasteis de lo que cada uno necesita y acordasteis cuidar la relación sin correr hacia una boda.", relationshipStep: "committed", stats: { happiness: 3, relationships: 3 } } } },
            { id: "slow", label: "Seguir conociéndoos, con sinceridad", description: "Pedir tiempo y dejar claro que todavía no puedes prometer una relación estable.", outcomes: { success: { narrative: "Le explicaste a {partner} que necesitas ir más despacio. Acordasteis seguir viéndoos sin fingir un compromiso que todavía no sentís.", relationshipStep: "wait", stats: { relationships: 1 } } } },
            { id: "stop", label: "Explicar que no sientes lo mismo", description: "Cerrar el romance con respeto antes de alimentar expectativas.", outcomes: { success: { narrative: "Hablaste con {partner} antes de que la ilusión creciera más. La despedida dolió, pero no dejaste una promesa que no ibas a cumplir.", clearPartner: true, maritalStatus: "single", stats: { happiness: -1, relationships: 1 } } } }
        ]
    },
    {
        id: "relationship_commit", monthlyOnly: true, title: "El futuro que queréis construir con {partner}",
        description: "Lleváis tiempo juntos y ya no basta con dejar que los días pasen. No es una boda: es hablar de convivencia, proyectos y límites. {partner} espera una respuesta honesta, no una promesa grandiosa.",
        category: "familia", priority: "major", minAge: 20, maxAge: 85, requirements: { hasPartner: true }, options: [
            { id: "project", label: "Hablar de un proyecto de vida común", description: "Poner sobre la mesa dónde queréis vivir, cómo repartiréis tiempo y dinero y qué no estáis dispuestos a sacrificar. Sin fecha de boda.", outcomes: { success: { narrative: "{partner} y tú hablasteis de un proyecto común: dónde vivir, cómo repartir gastos y qué espacio necesita cada uno. No salió una boda de esa conversación, pero sí un futuro que ambos reconocíais.", relationshipStep: "wait", flags: ["futuro_hablado"], stats: { relationships: 3, happiness: 2 } } } },
            { id: "cohabit", label: "Probar la convivencia con acuerdos", description: "Compartir hogar no es casarse. Acordad tareas, gastos y una salida digna si no funciona.", cost: { shareOfGdp: .015 }, outcomes: { success: { narrative: "{partner} y tú acordasteis probar la convivencia. Antes de las llaves hablasteis de tareas, gastos y espacio personal; el matrimonio quedó fuera de la conversación.", shareHousehold: true, relationshipStep: "wait", flags: ["futuro_hablado", "convivencia_acordada"], stats: { relationships: 3 } } } },
            { id: "separate", label: "Mantener dos hogares por ahora", description: "Reconocer que todavía necesitáis vuestra independencia. No es rechazar a la otra persona.", outcomes: { success: { narrative: "Le dijiste a {partner} que todavía querías conservar tu casa y tus rutinas. La conversación fue sincera; el vínculo siguió, sin convertir la independencia en una amenaza.", relationshipStep: "wait", flags: ["futuro_hablado"], stats: { relationships: 2, knowledge: 1 } } } }
        ]
    },
    {
        id: "relationship_proposal", monthlyOnly: true, title: "¿Quieres proponerle matrimonio a {partner}?",
        description: "Ya habéis compartido una historia con {partner} y hablado de vuestro futuro. Hoy puedes dar un paso más: proponer un compromiso, esperar o decir que no es el momento. Comprometerse no es celebrar la boda hoy.",
        category: "familia", priority: "major", minAge: 20, maxAge: 85, requirements: { hasPartner: true, maritalStatus: ["dating"] }, options: [
            { id: "propose", label: "Proponerle matrimonio a {partner}", description: "Decir por qué quieres compartir la vida y escuchar su respuesta. Si acepta, la celebración se decidirá más adelante.", check: { type: "social", base: 78 }, outcomes: { success: { narrative: "Le pediste matrimonio a {partner}. Aceptó emocionado/a y os quedasteis hablando hasta tarde. Ahora estáis comprometidos; todavía no hay una boda ni cuentas compartidas por ese gesto.", relationshipStep: "engaged", stats: { happiness: 4, relationships: 3 } }, failure: { narrative: "{partner} te dijo que te quiere, pero que aún no está preparado/a para casarse. No hubo ruptura: acordasteis no convertir la espera en una deuda emocional.", relationshipStep: "wait", stats: { happiness: -2 }, psychology: { stress: 2 } } } },
            { id: "wait", label: "Esperar y seguir construyendo la relación", description: "No confundir el miedo a perder a la otra persona con la certeza de querer casarte.", outcomes: { success: { narrative: "Decidiste esperar. {partner} y tú siguisteis juntos, con una conversación pendiente que ya no ocultabais.", relationshipStep: "wait", stats: { relationships: 1, knowledge: 1 } } } },
            { id: "no", label: "No proponer matrimonio", description: "Ser claro/a sobre lo que quieres, aunque eso pueda cambiar la relación.", outcomes: { success: { narrative: "Elegiste no proponer matrimonio. Lo hablasteis sin convertir el amor en una obligación; la relación tendría que encontrar otra forma de seguir.", relationshipStep: "wait", stats: { relationships: -1, happiness: -1 } } } }
        ]
    },

    {
        id: "relationship_proposal_received", monthlyOnly: true, title: "{partner} te ha pedido matrimonio",
        description: "Después de vuestra historia compartida, {partner} te dice que quiere construir una vida contigo y te pregunta si quieres casarte. No tienes que responder por presión: aceptar es comprometerse, no celebrar una boda hoy.",
        category: "familia", priority: "major", minAge: 20, maxAge: 85, requirements: { hasPartner: true, maritalStatus: ["dating"] }, options: [
            { id: "accept", label: "Aceptar y empezar a preparar el compromiso", description: "Compartir la ilusión. Más adelante decidiréis presupuesto, fecha y tipo de celebración.", outcomes: { success: { narrative: "Aceptaste la propuesta de {partner}. Os abrazasteis y llamasteis a alguien querido. La boda podía esperar: esa noche celebrasteis haber dicho que sí.", relationshipStep: "engaged", stats: { happiness: 4, relationships: 3 } } } },
            { id: "time", label: "Pedir tiempo y explicar tus dudas", description: "No convertir la emoción del momento en una obligación.", outcomes: { success: { narrative: "Pediste tiempo a {partner}. Hubo decepción, pero también una conversación sincera sobre dinero, proyectos y miedo a equivocarse.", relationshipStep: "wait", stats: { happiness: -1, knowledge: 1 } } } },
            { id: "no", label: "Decir que no quieres casarte", description: "Ser claro/a sobre el matrimonio y escuchar si vuestra relación puede continuar con esa diferencia.", outcomes: { success: { narrative: "Dijiste a {partner} que no quieres casarte por ahora. La diferencia quedó sobre la mesa; continuar juntos requerirá respetarla, no esconderla.", relationshipStep: "wait", stats: { relationships: -2 } } } }
        ]
    },
    {
        id: "relationship_wedding", monthlyOnly: true, title: "La boda que podéis y queréis celebrar",
        description: "Han pasado meses desde el compromiso con {partner}. Ahora toca decidir si celebrar el matrimonio y con qué presupuesto. Una fiesta grande no mide lo que os queréis; las cuentas seguirán existiendo al día siguiente.",
        category: "familia", priority: "major", minAge: 20, maxAge: 90, requirements: { hasPartner: true, maritalStatus: ["dating"] }, options: [
            { id: "civil", label: "Celebrar una boda sencilla con los más cercanos", description: "Pagar la celebración y formalizar el matrimonio. Acordaréis cómo compartir ingresos y gastos.", cost: { shareOfGdp: .025 }, outcomes: { success: { narrative: "Celebrasteis una boda sencilla. Al volver a casa con {partner}, todavía vestidos para la ocasión, os reísteis buscando algo para cenar. Empezó el matrimonio, con un presupuesto compartido y una vida cotidiana por construir.", maritalStatus: "married", relationshipStep: "married", shareHousehold: true, stats: { happiness: 3, relationships: 4 } } } },
            { id: "save", label: "Aplazar la boda y proteger la reserva", description: "Conservar el compromiso mientras ahorráis. No se cobra ninguna celebración.", outcomes: { success: { narrative: "{partner} y tú aplazasteis la boda para no empezar endeudados. Guardasteis las ideas para otro momento; el compromiso seguía intacto.", relationshipStep: "wait", stats: { knowledge: 1 } } } },
            { id: "private", label: "Preferir la convivencia sin matrimonio", description: "Revisar juntos el compromiso; compartir hogar no obliga a casarse.", cost: { shareOfGdp: .015 }, outcomes: { success: { narrative: "Tras hablarlo con {partner}, elegisteis convivir sin celebrar el matrimonio. No fue cancelar vuestra historia, sino darle una forma que ambos aceptabais.", relationshipStep: "committed", shareHousehold: true, stats: { relationships: 2 } } } }
        ]
    },
    {
        id: "crianza_dialogo",
        title: "Volver a hablar de la crianza",
        description:
            "{partner} y tú habláis de tener un hijo o ampliar la familia. Importan el deseo de ambos, el tiempo de cuidados y los gastos que se mantendrán durante años.",
        category: "familia",
        priority: "major",
        minAge: 23,
        maxAge: 44,
        cooldownYears: 6,
        weight: 5,
        requirements: { hasPartner: true, childrenMax: 5, flagsNone: ["no_nueva_crianza", "sin_hijos_elegido"] },
        options: [
            {
                id: "preparar",
                label: "Preparar la llegada de un hijo",
                description: "Iniciar un proyecto de crianza con nueve meses de preparación en el modo mensual; no es una compra de puntos.",
                cost: { shareOfGdp: 0.025 },
                outcomes: {
                    success: {
                        narrative:
                            "Iniciasteis un proyecto de crianza. Reservasteis dinero y hablasteis de cómo repartir el cuidado antes de la llegada.",
                        childrenDelta: 1,
                        familyTargetChildren: 1,
                        stats: { relationships: 2 },
                        psychology: { stress: 3 },
                    },
                },
            },
            { id: "plan_dos", label: "Intentar un primer hijo y proyectar una familia de dos", description: "Una llegada cada vez, con revisión de salud, dinero y cuidados antes de intentar otra. No garantiza un embarazo ni dos nacimientos.", requirements: { childrenMax: 0 }, cost: { shareOfGdp: .025 }, outcomes: { success: { narrative: "Acordasteis intentar una primera llegada y volver a evaluar si ampliar la familia más adelante. El plan de dos hijos no elimina la incertidumbre ni los gastos.", childrenDelta: 1, familyTargetChildren: 2, stats: { relationships: 2 }, psychology: { stress: 3 } } } },
            {
                id: "ahorro",
                label: "Esperar y preparar una reserva",
                description: "Mantener abierta la conversación sin asumir todavía gastos de crianza.",
                outcomes: {
                    success: {
                        narrative:
                            "Decidisteis esperar. Queríais que el deseo y las condiciones tuvieran espacio en la misma conversación.",
                        stats: { knowledge: 1, relationships: 2 },
                        psychology: { stress: -2 },
                        flags: ["crianza_pospuesta"],
                    },
                },
            },
            {
                id: "sin_hijos",
                label: "Elegir una vida sin nueva crianza",
                description: "Amistades, pareja y proyectos también pueden formar una vida plena.",
                outcomes: {
                    success: {
                        narrative:
                            "Acordasteis no ampliar la familia en esta etapa. El proyecto compartido siguió teniendo sentido.",
                        stats: { happiness: 2, relationships: 2 },
                        flags: ["no_nueva_crianza"],
                    },
                },
            },
        ],
    },
    {
        id: "pareja_distancia",
        title: "La distancia empieza a pesar",
        description:
            "Tu relación con {partner} requiere viajes, trámites y planes. Una mudanza precipitada puede dejarte sin empleo ni red de apoyo.",
        category: "familia",
        priority: "major",
        minAge: 20,
        maxAge: 65,
        cooldownYears: 5,
        weight: 5,
        requirements: { hasPartner: true, flagsAny: ["pareja_internacional"] },
        options: [
            {
                id: "visita",
                label: "Pagar una visita y comprobar la convivencia",
                description: "Billetes y documentación con un presupuesto limitado. Conservas tu empleo y tu residencia.",
                cost: { shareOfGdp: 0.06 },
                outcomes: {
                    success: {
                        narrative:
                            "Visitaste a {partner}. Compartir días normales os ayudó a evaluar la relación sin una mudanza irreversible.",
                        stats: { relationships: 4, happiness: 2 },
                        flags: ["visita_pareja_realizada"],
                    },
                },
            },
            {
                id: "plan",
                label: "Preparar idioma y un plan de empleo",
                description: "La mudanza esperará hasta contar con una vía de estudios o trabajo.",
                cost: { shareOfGdp: 0.008 },
                outcomes: {
                    success: {
                        narrative:
                            "Cambiasteis la prisa por un plan de idioma, trabajo y trámites. La espera tuvo una dirección.",
                        stats: { knowledge: 3, relationships: 2 },
                        flags: ["migracion_preparada", "idioma_estudiado"],
                    },
                },
            },
            {
                id: "terminar",
                label: "Terminar la relación con honestidad",
                description: "Una pérdida afectiva real, pero sin comprometer todos tus ahorros.",
                outcomes: {
                    success: {
                        narrative:
                            "La relación terminó. Hubo tristeza y también alivio al dejar de prometer una vida que no podíais sostener.",
                        clearPartner: true,
                        stats: { happiness: -3, relationships: -2 },
                        psychology: { stress: -2 },
                    },
                },
            },
        ],
    },
    {
        id: "familia_pareja_exterior",
        title: "Una conversación difícil con tu familia",
        description:
            "Tu familia concreta expresa dudas sobre tu relación con una persona extranjera. Hablan del idioma, la distancia y sus expectativas; no todas las familias de {country} reaccionarían igual.",
        category: "familia",
        priority: "major",
        minAge: 20,
        maxAge: 42,
        once: true,
        weight: 4,
        requirements: { country: ["CHN"], hasPartner: true, parentsAlive: true, flagsAll: ["pareja_internacional"] },
        options: [
            {
                id: "presentar",
                label: "Organizar un encuentro y traducir con paciencia",
                description: "Acercar a personas concretas, sin garantizar una aprobación inmediata.",
                cost: { shareOfGdp: 0.01 },
                check: { type: "social", base: 65 },
                outcomes: {
                    success: {
                        narrative:
                            "El encuentro no borró todas las dudas, pero tu familia empezó a conocer a {partner} como persona.",
                        stats: { relationships: 4 },
                        psychology: { stress: -2 },
                    },
                    failure: {
                        narrative:
                            "El encuentro fue tenso. Dejasteis abierta la conversación, aunque harían falta límites más claros.",
                        stats: { relationships: -1 },
                        psychology: { stress: 3 },
                    },
                },
            },
            {
                id: "limites",
                label: "Escuchar y mantener tu decisión",
                description: "Cuidar el vínculo familiar sin entregar a otros el control de tu vida afectiva.",
                outcomes: {
                    success: {
                        narrative:
                            "Escuchaste los temores y marcaste un límite. La relación siguió, aunque las sobremesas cambiaron durante un tiempo.",
                        stats: { happiness: 2, relationships: -1 },
                        psychology: { resilience: 2 },
                    },
                },
            },
            {
                id: "esperar",
                label: "Posponer el compromiso y seguir conociéndoos",
                description: "Reducir presión ahora sin prometer una boda ni una ruptura.",
                outcomes: {
                    success: {
                        narrative:
                            "Os disteis tiempo para aprender el idioma, hablar de expectativas y decidir por vuestra cuenta.",
                        stats: { knowledge: 2, relationships: 1 },
                    },
                },
            },
        ],
    },
);

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
        id: "acuerdo_pareja",
        title: "Qué queréis construir juntos",
        description:
            "La relación con {partner} ya tiene historia. Compartir una cuenta y una casa implica hablar también de ingresos, tareas y autonomía.",
        category: "familia",
        priority: "major",
        minAge: 20,
        maxAge: 85,
        once: true,
        cooldownYears: 8,
        weight: 5,
        requirements: { hasPartner: true, maritalStatus: ["dating"] },
        options: [
            {
                id: "civil",
                label: "Una boda civil sencilla",
                description: "Compromiso con una celebración contenida. Empezáis a compartir el presupuesto y los ingresos de ambos.",
                cost: { shareOfGdp: 0.025 },
                outcomes: {
                    success: {
                        narrative:
                            "Celebrasteis una boda sencilla. {partner} y tú empezasteis a compartir ingresos, gastos y responsabilidades.",
                        maritalStatus: "married",
                        shareHousehold: true,
                        stats: { happiness: 3, relationships: 4 },
                        flags: ["pareja_acuerdos"],
                    },
                },
            },
            {
                id: "convivir",
                label: "Probar la convivencia con acuerdos",
                description: "Compartir vivienda e ingresos sin casaros; repartir tareas y conservar un fondo de emergencia.",
                cost: { shareOfGdp: 0.015 },
                outcomes: {
                    success: {
                        narrative:
                            "Os mudasteis juntos en {city}. Acordasteis cómo pagar las facturas y cuánto reservar para imprevistos.",
                        shareHousehold: true,
                        stats: { relationships: 3 },
                        flags: ["convivencia_acordada"],
                    },
                },
            },
            {
                id: "espacio",
                label: "Mantener dos hogares por ahora",
                description: "Más autonomía; los ingresos de la otra persona todavía no entran en tu cuenta.",
                outcomes: {
                    success: {
                        narrative:
                            "Elegisteis continuar la relación sin unir las cuentas ni las llaves. No era una ruptura, sino un acuerdo.",
                        stats: { happiness: 2, relationships: 1 },
                    },
                },
            },
        ],
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
                        stats: { relationships: 2 },
                        psychology: { stress: 3 },
                    },
                },
            },
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

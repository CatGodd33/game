import type { DecisionDefinition } from "./decision-types.js";

/**
 * La movilidad no puede depender de un botón escondido. A los 17–19 años el
 * personaje recibe una pregunta explícita: estudiar fuera, trabajar fuera,
 * prepararlo o quedarse. Los destinos se sortean con la semilla del mundo.
 */
export const MOBILITY_DECISIONS: DecisionDefinition[] = [
    {
        id: "primer_billete",
        title: "Un billete que cambia el mapa",
        description:
            "Terminas una etapa y el mundo parece más grande que tu ciudad. Estudiar fuera, trabajar fuera o quedarte también son decisiones. Ninguna garantiza una vida mejor.",
        contextNote:
            "El destino no está fijado: se sortea con la semilla de la partida. La adaptación dependerá del idioma, el dinero y la red de apoyo.",
        category: "migracion",
        priority: "major",
        minAge: 17,
        maxAge: 19,
        once: true,
        weight: 8,
        cooldownYears: 0,
        options: [
            {
                id: "estudiar_fuera",
                label: "Solicitar estudios en otro país",
                description: "Matrícula, visado y una habitación compartida. El conocimiento crece; la red de apoyo se reconstruye desde cero.",
                cost: { shareOfGdp: 0.28 },
                check: { type: "educacion", base: 52 },
                outcomes: {
                    success: {
                        narrative:
                            "La carta de admisión llegó un martes. Hiciste la maleta con más miedo que entusiasmo y descubriste que estudiar lejos también era aprender a pedir ayuda.",
                        stats: { knowledge: 7, happiness: 2, relationships: -2 },
                        employment: "student",
                        education: "university",
                        migrateTo: { countryCode: "RANDOM", location: "RANDOM" },
                        flags: ["migrante", "estudiar_fuera"],
                        milestone: "Estudió fuera de su país",
                    },
                    failure: {
                        narrative:
                            "La plaza no llegó o el dinero no alcanzó. Guardaste los papeles en una carpeta y volviste a mirar el calendario.",
                        stats: { happiness: -3, knowledge: 2 },
                        psychology: { stress: 5 },
                        flags: ["estudios_exterior_fallidos"],
                    },
                },
            },
            {
                id: "trabajar_fuera",
                label: "Aceptar un trabajo fuera",
                description: "Un contrato con horarios y papeleo. El sueldo puede ser mejor; la soledad y los trámites también llegan.",
                cost: { shareOfGdp: 0.16 },
                check: { type: "trabajo", base: 46 },
                outcomes: {
                    success: {
                        narrative:
                            "El primer turno fue más duro de lo que decía la oferta. Aun así, la nómina llegó y con ella una vida que no habías imaginado.",
                        stats: { happiness: 1, knowledge: 2, relationships: -3 },
                        employment: "employed",
                        incomeModifierDelta: 0.05,
                        migrateTo: { countryCode: "RANDOM", location: "RANDOM" },
                        flags: ["migrante", "trabajar_fuera"],
                        milestone: "Emigró para trabajar",
                    },
                    failure: {
                        narrative:
                            "El contrato tenía letra pequeña y el alojamiento no era lo prometido. Volviste antes de lo previsto, con menos dinero y una lección cara.",
                        stats: { happiness: -4, health: -1 },
                        psychology: { stress: 8 },
                        flags: ["migracion_fallida"],
                    },
                },
            },
            {
                id: "preparar_salida",
                label: "Quedarte y preparar la salida",
                description: "Ahorrar, estudiar idiomas y reunir papeles antes de mover la vida entera.",
                outcomes: {
                    success: {
                        narrative:
                            "No te fuiste todavía. Abriste una carpeta con cursos, ahorros y direcciones. La puerta quedó abierta sin romper lo que ya tenías.",
                        stats: { knowledge: 4, happiness: 1, relationships: 1 },
                        flags: ["migracion_preparada"],
                    },
                },
            },
            {
                id: "quedarme",
                label: "Quedarte y construir aquí",
                description: "Elegir tu ciudad con los ojos abiertos, sin tratarla como un plan B.",
                outcomes: {
                    success: {
                        narrative:
                            "Decidiste quedarte. No era miedo: era una apuesta por la gente y los lugares que ya conocías. La duda no desapareció, pero dejó de decidir por ti.",
                        stats: { happiness: 2, relationships: 3 },
                        flags: ["decision_quedarse"],
                    },
                },
            },
        ],
    },
];

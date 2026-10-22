import type { DecisionDefinition } from "./decision-types.js";

/**
 * Decisiones de patrimonio. No castigan por tener dinero: introducen las
 * obligaciones que aparecen cuando una vida acumula activos, deuda, socios o
 * expectativas familiares. Cada coste y cada deuda pasan por el libro mayor.
 */
export const WEALTH_DECISIONS: DecisionDefinition[] = [
    {
        id: "presion_fiscal",
        title: "Una carta con membrete oficial",
        description:
            "La administración revisa tus últimas declaraciones. La carta no dice que seas culpable, pero exige papeles, tiempo y una decisión. Ignorarla también tiene consecuencias.",
        contextNote:
            "El patrimonio alto no elimina los errores fiscales. Los números son parámetros de simulación, no una liquidación real.",
        category: "dinero",
        priority: "major",
        minAge: 28,
        maxAge: 82,
        once: true,
        weight: 2.8,
        requirements: { minLivingStandard: 58 },
        options: [
            {
                id: "regularizar",
                label: "Revisar los papeles con un profesional",
                description: "Pagar la corrección y dejar el expediente cerrado. El coste duele, pero la incertidumbre baja.",
                cost: { shareOfAnnualIncome: 0.06 },
                outcomes: {
                    success: {
                        narrative:
                            "La revisión encontró un error pequeño y una factura grande. Regularizaste la situación y dormiste mejor, aunque el dinero no volvió.",
                        stats: { happiness: 1, knowledge: 2 },
                        creditDelta: 4,
                        psychology: { stress: -4 },
                        flags: ["finanzas_regularizadas"],
                    },
                },
            },
            {
                id: "recurrir",
                label: "Recurrir la liquidación",
                description: "Defender tu versión con abogados y documentación. Puede salir bien o alargar el problema.",
                cost: { shareOfAnnualIncome: 0.1 },
                check: { type: "trabajo", base: 45 },
                outcomes: {
                    success: {
                        narrative:
                            "El recurso prosperó en parte. No fue una victoria limpia, pero la sanción bajó y aprendiste a guardar cada recibo.",
                        stats: { knowledge: 4, happiness: 1 },
                        creditDelta: 3,
                        flags: ["recurso_fiscal_ganado"],
                    },
                    failure: {
                        narrative:
                            "El recurso añadió intereses y meses de espera. La deuda creció con una etiqueta que no podías ignorar.",
                        stats: { happiness: -3, knowledge: 2 },
                        psychology: { stress: 8 },
                        loan: { amountRule: { shareOfAnnualIncome: 0.09 }, lender: "banco", label: "Deuda fiscal tras recurso fallido", annualInterestRate: 0.07 },
                        flags: ["recurso_fiscal_perdido"],
                    },
                },
            },
            {
                id: "ignorar",
                label: "Dejar la carta en un cajón",
                description: "Esperar a que el problema se resuelva solo. A veces ocurre; otras, el silencio se convierte en recargo.",
                check: { type: "riesgo", base: 30 },
                outcomes: {
                    success: {
                        narrative:
                            "El expediente no avanzó. No hubo multa, pero la carta siguió en el cajón y tú también, con una parte de la cabeza puesta ahí.",
                        stats: { happiness: -2 },
                        psychology: { stress: 5 },
                    },
                    failure: {
                        narrative:
                            "El silencio se convirtió en una notificación nueva. La deuda llegó con intereses y menos margen para negociar.",
                        stats: { happiness: -5 },
                        psychology: { stress: 12 },
                        loan: { amountRule: { shareOfAnnualIncome: 0.14 }, lender: "banco", label: "Recargo por expediente ignorado", annualInterestRate: 0.09 },
                        flags: ["problema_fiscal"],
                    },
                },
            },
        ],
    },
    {
        id: "socio_capital",
        title: "Alguien quiere comprar parte de tu vida",
        description:
            "Un inversor ofrece capital para crecer. El dinero resolvería la caja, pero también traería un socio, reuniones y decisiones que ya no serían solo tuyas.",
        contextNote:
            "El tamaño del negocio cambia la complejidad. Un socio puede salvar una empresa o convertir cada desacuerdo en una crisis.",
        category: "trabajo",
        priority: "major",
        minAge: 25,
        maxAge: 68,
        once: true,
        weight: 2.2,
        requirements: { hasBusiness: true, minLivingStandard: 55 },
        options: [
            {
                id: "aceptar_socio",
                label: "Aceptar capital y compartir el control",
                description: "Entra dinero y experiencia. A cambio, las decisiones importantes tendrán otra firma.",
                outcomes: {
                    success: {
                        narrative:
                            "El capital llegó y la empresa respiró. La primera reunión con el socio fue civilizada; la segunda dejó claro que ya no decidías solo.",
                        stats: { happiness: 1, knowledge: 3 },
                        businessChange: { revenueDeltaPct: 0.12, reputationDelta: 3 },
                        flags: ["socio_capital"],
                    },
                    failure: {
                        narrative:
                            "El socio tenía prisa por crecer y tú por no perder lo construido. La empresa ganó dinero y perdió la relación que la había sostenido.",
                        stats: { happiness: -3, relationships: -2 },
                        businessChange: { costDelta: 800, reputationDelta: -2 },
                        psychology: { stress: 7 },
                        flags: ["socio_conflicto"],
                    },
                },
            },
            {
                id: "prestamo_crecimiento",
                label: "Pedir un préstamo y conservar el control",
                description: "Más deuda, pero las decisiones siguen siendo tuyas. La cuota no perdona un mal mes.",
                outcomes: {
                    success: {
                        loan: { amountRule: { shareOfAnnualIncome: 0.2 }, lender: "banco", label: "Préstamo para crecer sin socio", annualInterestRate: 0.08 },
                        narrative:
                            "El préstamo financió la expansión. La cuota pesó cada mes, pero no tuviste que explicarle a nadie por qué querías hacer las cosas a tu manera.",
                        stats: { happiness: 2, knowledge: 2 },
                        businessChange: { revenueDeltaPct: 0.08 },
                        flags: ["crecimiento_con_deuda"],
                    },
                },
            },
            {
                id: "rechazar_socio",
                label: "Rechazar la oferta y seguir pequeño",
                description: "Menos vértigo, menos capital y más control. El crecimiento tendrá que esperar.",
                outcomes: {
                    success: {
                        narrative:
                            "Dijiste que no. La empresa siguió siendo tuya y también sus noches difíciles. No era una derrota; era una escala elegida.",
                        stats: { happiness: 1, relationships: 1 },
                        businessChange: { reputationDelta: 1 },
                        flags: ["rechazo_inversor"],
                    },
                },
            },
        ],
    },
    {
        id: "seguridad_patrimonial",
        title: "La casa también se protege",
        description:
            "Una ausencia, una mudanza o una noticia del barrio te hacen pensar en lo que has acumulado. Asegurar, invertir en seguridad o no hacer nada son decisiones con costes distintos.",
        contextNote:
            "La seguridad no es una varita mágica. El modelo valora el gasto, la prevención y el azar sin convertir la delincuencia en un castigo automático.",
        category: "dinero",
        priority: "major",
        minAge: 30,
        maxAge: 85,
        once: true,
        weight: 1.9,
        requirements: { minLivingStandard: 62 },
        options: [
            {
                id: "asegurar",
                label: "Asegurar la vivienda y los objetos",
                description: "Pagar una prima anual y revisar las condiciones antes de confiar en la letra pequeña.",
                cost: { shareOfGdp: 0.02 },
                outcomes: {
                    success: {
                        narrative:
                            "La póliza no impidió el susto, pero cubrió lo esencial. Leer las exclusiones te ahorró una discusión con la aseguradora.",
                        stats: { happiness: 2, knowledge: 1 },
                        psychology: { stress: -3 },
                        flags: ["patrimonio_asegurado"],
                    },
                },
            },
            {
                id: "seguridad",
                label: "Invertir en prevención",
                description: "Cámaras, cerraduras y vecinos organizados. Menos glamour, más tranquilidad cotidiana.",
                cost: { shareOfGdp: 0.012 },
                outcomes: {
                    success: {
                        narrative:
                            "La casa no se volvió una fortaleza, solo un lugar menos fácil de sorprender. Los vecinos empezaron a saludarse con otro nombre.",
                        stats: { happiness: 1, relationships: 2 },
                        flags: ["seguridad_barrio"],
                    },
                },
            },
            {
                id: "confiar",
                label: "No gastar y confiar en la suerte",
                description: "El dinero se queda en la cuenta. La tranquilidad, en manos del azar.",
                check: { type: "riesgo", base: 42 },
                outcomes: {
                    success: {
                        narrative:
                            "No pasó nada. La casa siguió igual y tú también, con la sensación de haber esquivado una factura que nunca llegó.",
                        stats: { happiness: 1 },
                    },
                    failure: {
                        narrative:
                            "Un robo o una avería se llevó parte de lo que habías construido. El seguro no estaba y la reparación tampoco era opcional.",
                        stats: { happiness: -4, relationships: -1 },
                        moneyDelta: -1,
                        expenseModifierDelta: 0.03,
                        psychology: { stress: 6 },
                        flags: ["perdida_patrimonial"],
                    },
                },
            },
        ],
    },
    {
        id: "familia_pide_dinero",
        title: "La familia sabe cuánto tienes",
        description:
            "Una persona cercana necesita dinero. No es una cifra abstracta: hay una cara, una historia y una relación que puede cambiar según cómo respondas.",
        contextNote:
            "Prestar, regalar y decir que no son decisiones distintas. El juego registra el dinero y la deuda; no decide por ti qué es la lealtad.",
        category: "familia",
        priority: "major",
        minAge: 30,
        maxAge: 82,
        once: true,
        weight: 2.3,
        requirements: { minLivingStandard: 60, childrenMin: 0 },
        options: [
            {
                id: "prestar_familia",
                label: "Prestar con un acuerdo escrito",
                description: "Ayudar sin convertir la ayuda en un secreto. La relación y la devolución quedan claras.",
                cost: { shareOfAnnualIncome: 0.08 },
                outcomes: {
                    success: {
                        narrative:
                            "Firmasteis un papel sencillo. No fue desconfianza: fue la forma de que la ayuda no se convirtiera en una deuda invisible.",
                        stats: { relationships: 4, happiness: 1 },
                        flags: ["prestamo_familiar_acordado"],
                    },
                    failure: {
                        narrative:
                            "La otra persona se sintió examinada. El dinero salió igual, pero la conversación dejó una grieta que tardaría en cerrarse.",
                        stats: { relationships: -2, happiness: -1 },
                        psychology: { stress: 3 },
                    },
                },
            },
            {
                id: "regalar_familia",
                label: "Regalar el dinero sin condiciones",
                description: "Ayudar sin esperar devolución. El gesto puede aliviar o crear una expectativa para la próxima vez.",
                cost: { shareOfAnnualIncome: 0.1 },
                outcomes: {
                    success: {
                        narrative:
                            "No pediste nada a cambio. La persona pudo respirar y tú aprendiste que la generosidad también necesita un límite que no siempre se dice.",
                        stats: { relationships: 5, happiness: 2 },
                        flags: ["ayuda_familiar"],
                    },
                },
            },
            {
                id: "decir_no_familia",
                label: "Decir que no puedes",
                description: "Proteger tu margen y explicar que tu patrimonio también tiene obligaciones.",
                outcomes: {
                    success: {
                        narrative:
                            "Dijiste que no. La relación se enfrió unos meses, pero no perdiste la posibilidad de volver a hablar cuando la urgencia pasó.",
                        stats: { relationships: -2, happiness: -1, knowledge: 1 },
                        psychology: { stress: 2 },
                        flags: ["limite_familiar_dinero"],
                    },
                },
            },
        ],
    },
];

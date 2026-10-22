import type { DecisionCategory } from "@life-duel/shared";
import type { DecisionDefinition, DecisionOptionDefinition } from "./decision-types.js";

/**
 * Opciones de repliegue contextuales.
 *
 * El servidor garantiza que toda pregunta muestre al menos cinco caminos
 * visibles. Si los requisitos, el dinero o el contexto dejan menos opciones
 * específicas, se añaden estos caminos generales. No son botones decorativos:
 * cada uno tiene un coste social, psicológico o de oportunidad y queda
 * registrado en el historial.
 *
 * Nunca añaden ni retiran dinero directamente. Cualquier cambio económico
 * debe pasar por el libro mayor.
 */

type FallbackText = {
    rebuild: string;
    support: string;
    alternative: string;
    negotiate: string;
    stability: string;
};

const CATEGORY_TEXT: Record<DecisionCategory, FallbackText> = {
    educacion: {
        rebuild: "Aceptar una formación más corta o un empleo de apoyo mientras recuperas margen.",
        support: "Buscar a alguien que ya pasó por esto y pedirle orientación.",
        alternative: "Elegir una formación más corta o una vía menos ambiciosa.",
        negotiate: "Hablar con el centro, la empresa o la familia para negociar plazos y apoyos.",
        stability: "Priorizar terminar lo que ya tienes entre manos antes de añadir otra exigencia.",
    },
    salud: {
        rebuild: "Aceptar una atención básica y un plan de recuperación realista, aunque no sea lo ideal.",
        support: "Contárselo a alguien de confianza y no afrontarlo en soledad.",
        alternative: "Buscar una atención más modesta pero accesible.",
        negotiate: "Pedir una segunda opinión y discutir el tratamiento sin aceptar la primera respuesta.",
        stability: "Dormir, comer y bajar el ritmo antes de tomar una decisión médica precipitada.",
    },
    trabajo: {
        rebuild: "Aceptar un empleo modesto o una formación puente mientras reconstruyes ingresos.",
        support: "Pedir consejo a un compañero o a alguien con experiencia.",
        alternative: "Aceptar un empleo inferior al que querías para no quedarte sin nada.",
        negotiate: "Pedir por escrito mejores condiciones, horarios o formación antes de moverte.",
        stability: "Proteger tu salud y tu horario aunque el ascenso tenga que esperar.",
    },
    dinero: {
        rebuild: "Ordenar lo esencial, buscar apoyo y reconstruir el margen poco a poco.",
        support: "Explicar la situación a la familia o a una persona de confianza.",
        alternative: "Elegir una versión más pequeña y asumible de lo que planeabas.",
        negotiate: "Renegociar plazos, intereses o precios antes de firmar.",
        stability: "No comprometer tus gastos esenciales aunque la oportunidad parezca única.",
    },
    familia: {
        rebuild: "Proponer una tregua práctica y reconstruir la relación desde lo cotidiano.",
        support: "Buscar una persona mediadora que escuche a todas las partes.",
        alternative: "Proponer un acuerdo parcial que no contente del todo a nadie.",
        negotiate: "Poner límites claros y proponer un reparto explícito de tiempos y cuidados.",
        stability: "Cuidar primero tu casa y tu salud mental antes de asumir otra carga.",
    },
    relaciones: {
        rebuild: "Elegir una versión más honesta y modesta de la relación, sin exigencias imposibles.",
        support: "Hablar con una amistad antes de tomar una decisión que afecta a otros.",
        alternative: "Elegir el camino menos romántico pero más honesto contigo.",
        negotiate: "Decir lo que necesitas y escuchar lo que la otra persona también necesita.",
        stability: "Proteger tu independencia y no romper tu red de apoyo por una relación.",
    },
    vivienda: {
        rebuild: "Aceptar una vivienda más modesta y reconstruir desde un coste asumible.",
        support: "Compartir la decisión con quien vivirá contigo y repartir el riesgo.",
        alternative: "Buscar una vivienda más pequeña o en una zona menos céntrica.",
        negotiate: "Negociar precio, alquiler o condiciones antes de firmar.",
        stability: "Mantener un fondo de emergencia aunque eso retrase la mudanza.",
    },
    migracion: {
        rebuild: "Elegir un primer paso reversible y reconstruir desde una base más segura.",
        support: "Buscar una red migratoria o familiar en el destino.",
        alternative: "Elegir un destino más barato o una primera mudanza reversible.",
        negotiate: "Comparar visados y pedir asesoría antes de entregar dinero o documentos.",
        stability: "No quemar todos tus ahorros ni tu red actual en un único intento.",
    },
    ocio: {
        rebuild: "Sustituir el plan por una versión accesible que también te haga bien.",
        support: "Compartir el plan con alguien y ajustar expectativas.",
        alternative: "Hacer una versión más modesta de lo que imaginabas.",
        negotiate: "Buscar una forma de hacerlo sin comprometer el presupuesto familiar.",
        stability: "Elegir descanso y salud antes que una experiencia que te dejaría sin margen.",
    },
    riesgo: {
        rebuild: "Rechazar el riesgo y elegir una reconstrucción lenta pero verificable.",
        support: "Consultar con alguien que no gane nada con tu decisión.",
        alternative: "Rechazar lo arriesgado y buscar una vía más lenta pero segura.",
        negotiate: "Pedir garantías, pruebas o contratos antes de arriesgar lo que tienes.",
        stability: "Proteger lo que ya tienes y no poner en juego tu vivienda ni tus ingresos.",
    },
};

function createOptions(category: DecisionCategory): DecisionOptionDefinition[] {
    const text = CATEGORY_TEXT[category];
    return [
        {
            id: `repliegue_${category}_reconstruir`,
            label: "Elegir una salida modesta",
            description: text.rebuild,
            outcomes: {
                success: {
                    narrative:
                        "No era la solución que habías imaginado, pero dejaste de esperar a que todo se arreglara solo. Elegiste un paso pequeño, realista y tuyo.",
                    stats: { knowledge: 1, health: 1 },
                    psychology: { stress: -2, selfEsteem: 1 },
                    flags: ["segunda_oportunidad", "plan_recuperacion"],
                },
            },
        },
        {
            id: `repliegue_${category}_apoyo`,
            label: "Pedir consejo antes de mover ficha",
            description: text.support,
            outcomes: {
                success: {
                    narrative:
                        "Pusiste en palabras lo que te preocupaba. No salió una solución mágica, pero dejaste de cargar a solas con la incertidumbre.",
                    stats: { relationships: 2, happiness: 1 },
                    psychology: { stress: -2, selfEsteem: 1 },
                },
            },
        },
        {
            id: `repliegue_${category}_alternativa`,
            label: "Tomar una alternativa más modesta",
            description: text.alternative,
            outcomes: {
                success: {
                    narrative:
                        "Renunciaste a la versión grande de tus planes y elegiste una salida posible. No era lo que habías imaginado, pero seguía siendo tuya.",
                    stats: { knowledge: 1, happiness: -1 },
                    psychology: { stress: -1, selfEsteem: 1 },
                },
            },
        },
        {
            id: `repliegue_${category}_negociar`,
            label: "Negociar antes de aceptar",
            description: text.negotiate,
            outcomes: {
                success: {
                    narrative:
                        "No aceptaste la primera versión. Preguntaste, comparaste y pusiste condiciones. No conseguiste todo, pero la decisión dejó de ser algo que otros habían escrito por ti.",
                    stats: { knowledge: 2, relationships: 1, happiness: 1 },
                    psychology: { stress: 1, selfEsteem: 2 },
                },
            },
        },
        {
            id: `repliegue_${category}_estabilidad`,
            label: "Proteger tu estabilidad",
            description: text.stability,
            outcomes: {
                success: {
                    narrative:
                        "Elegiste no añadir más riesgo a una vida que ya tenía suficiente. Perdiste una oportunidad, pero conservaste margen para dormir, cuidarte y decidir otro día.",
                    stats: { health: 1, happiness: 1, relationships: -1 },
                    psychology: { stress: -2, lifeSatisfaction: 1 },
                },
            },
        },
    ];
}

const BY_CATEGORY = new Map<DecisionCategory, DecisionOptionDefinition[]>();

export function contextualFallbacks(decision: DecisionDefinition, eligibleCount: number): DecisionOptionDefinition[] {
    const missing = Math.max(0, 5 - eligibleCount);
    if (missing === 0) return [];
    let options = BY_CATEGORY.get(decision.category);
    if (!options) {
        options = createOptions(decision.category);
        BY_CATEGORY.set(decision.category, options);
    }
    return options.slice(0, missing);
}

export function getFallbackOption(
    decision: DecisionDefinition,
    optionId: string,
): DecisionOptionDefinition | undefined {
    const options = BY_CATEGORY.get(decision.category) ?? createOptions(decision.category);
    return options.find((option) => option.id === optionId);
}

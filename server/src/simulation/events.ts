import type {
  ContentSeverity,
  EconomyState,
  Era,
  EventCategory,
  SharedEventRecord,
} from "@life-duel/shared";
import { clamp, EVENT_CATEGORY_META } from "@life-duel/shared";
import { getCountry } from "../demographics/dataset.js";
import { createRng, deriveSeed } from "./rng.js";

export interface EventEffects {
  costOfLivingMultiplier?: number;
  unemploymentDelta?: number;
  phase?: EconomyState["phase"];
  health?: number;
  happiness?: number;
  knowledge?: number;
  relationships?: number;
  housing?: number;
  moneyDelta?: number;
}

export interface SharedEventDefinition {
  id: string;
  category: EventCategory;
  title: string;
  narrative: string;
  minAge: number;
  maxAge: number;
  chance: number;
  once?: boolean;
  cooldownYears?: number;
  severity: 1 | 2 | 3;
  eras?: Era[];
  incomeGroups?: ("alto" | "medio-alto" | "medio-bajo" | "bajo")[];
  effects: EventEffects;
  decisionId?: string;
  dataRefs?: string[];
}

export interface WorldEconomyState {
  economy: EconomyState;
}

const EVENTS: SharedEventDefinition[] = [
  {
    id: "crisis_economica",
    category: "economia",
    title: "El suelo se mueve bajo la economía",
    narrative:
      "Los titulares hablan de caídas, despidos y presupuestos que no llegan. En las tiendas, los precios no bajan. La incertidumbre entra en las casas.",
    minAge: 14,
    maxAge: 88,
    chance: 5,
    cooldownYears: 8,
    severity: 2,
    effects: {
      costOfLivingMultiplier: 1.09,
      unemploymentDelta: 2.4,
      phase: "recesion",
      happiness: -3,
    },
    decisionId: "respuesta_crisis",
    dataRefs: ["data/demographics.json#unemploymentRate", "data/economy-model.json"],
  },
  {
    id: "recesion",
    category: "economia",
    title: "La recesión llega al barrio",
    narrative:
      "Los pedidos disminuyen y las horas se recortan. No es una catástrofe, pero todos conocen a alguien que ha perdido algo.",
    minAge: 18,
    maxAge: 85,
    chance: 4,
    cooldownYears: 6,
    severity: 2,
    effects: {
      costOfLivingMultiplier: 1.04,
      unemploymentDelta: 1.6,
      phase: "recesion",
      happiness: -2,
    },
    decisionId: "respuesta_crisis",
  },
  {
    id: "auge_economico",
    category: "economia",
    title: "Un ciclo expansivo",
    narrative:
      "Las empresas contratan y los escaparates parecen más llenos. La sensación de que las cosas mejoran todavía no llega a todos, pero se nota en la calle.",
    minAge: 18,
    maxAge: 80,
    chance: 4,
    cooldownYears: 6,
    severity: 1,
    effects: {
      costOfLivingMultiplier: 1.015,
      unemploymentDelta: -1.2,
      phase: "expansion",
      happiness: 2,
    },
  },
  {
    id: "inflacion",
    category: "economia",
    title: "La cesta de la compra sube",
    narrative:
      "El mismo dinero compra menos. La energía, la comida y el alquiler se convierten en el tema de todas las conversaciones.",
    minAge: 18,
    maxAge: 92,
    chance: 6,
    cooldownYears: 4,
    severity: 2,
    effects: {
      costOfLivingMultiplier: 1.07,
      phase: "estable",
      happiness: -2,
    },
    decisionId: "presupuesto_inflacion",
    dataRefs: ["data/demographics.json#gdpPerCapitaPpp"],
  },
  {
    id: "deflacion",
    category: "economia",
    title: "Los precios se enfrían",
    narrative:
      "Los precios dejan de subir y algunos incluso bajan. La noticia alivia a las familias y preocupa a quienes viven de vender.",
    minAge: 20,
    maxAge: 85,
    chance: 2,
    cooldownYears: 10,
    severity: 1,
    effects: { costOfLivingMultiplier: 0.97, happiness: 1 },
  },
  {
    id: "epidemia",
    category: "salud",
    title: "Una epidemia cruza el país",
    narrative:
      "Los hospitales se llenan y las escuelas cierran por unos días. Cada familia decide cuánto cambia su vida y a quién protege.",
    minAge: 0,
    maxAge: 95,
    chance: 3,
    cooldownYears: 12,
    severity: 2,
    effects: { health: -3, happiness: -2 },
    decisionId: "respuesta_epidemia",
    dataRefs: ["data/demographics.json#lifeExpectancy", "data/mortality-model.json"],
  },
  {
    id: "pandemia_global",
    category: "salud",
    title: "Una pandemia global",
    narrative:
      "El mundo se detiene durante meses. Las fronteras se cierran y lo cotidiano se vuelve peligroso. Nadie sale ileso de una experiencia así.",
    minAge: 0,
    maxAge: 95,
    chance: 1.2,
    once: true,
    severity: 3,
    effects: {
      health: -5,
      happiness: -5,
      relationships: -2,
      costOfLivingMultiplier: 1.08,
      unemploymentDelta: 2,
      phase: "crisis",
    },
    decisionId: "respuesta_epidemia",
  },
  {
    id: "ola_calor",
    category: "medioambiente",
    title: "Una ola de calor",
    narrative:
      "El asfalto arde y las noches no refrescan. Los mayores y quienes trabajan fuera lo pasan peor.",
    minAge: 12,
    maxAge: 95,
    chance: 5,
    cooldownYears: 3,
    severity: 1,
    effects: { health: -2, costOfLivingMultiplier: 1.02 },
    dataRefs: ["dataset climático pendiente de integrar"],
  },
  {
    id: "ola_frio",
    category: "medioambiente",
    title: "Un invierno duro",
    narrative:
      "Las facturas de calefacción se disparan y las calles amanecen vacías. La salud de los más frágiles se resiente.",
    minAge: 35,
    maxAge: 95,
    chance: 3,
    cooldownYears: 4,
    severity: 1,
    effects: { health: -2, costOfLivingMultiplier: 1.04 },
  },
  {
    id: "desastre_natural",
    category: "medioambiente",
    title: "El agua se lleva parte del barrio",
    narrative:
      "Una tormenta deja calles cortadas y casas inundadas. Los servicios de emergencia llegan, pero la reconstrucción será cosa de meses.",
    minAge: 0,
    maxAge: 95,
    chance: 2.5,
    cooldownYears: 8,
    severity: 2,
    effects: { health: -2, happiness: -3, housing: -5, costOfLivingMultiplier: 1.03 },
    decisionId: "respuesta_desastre",
  },
  {
    id: "terremoto",
    category: "medioambiente",
    title: "La tierra tiembla",
    narrative:
      "Un terremoto daña edificios y corta suministros. La comunidad se organiza para rescatar y para comprobar quién sigue allí.",
    minAge: 0,
    maxAge: 95,
    chance: 1.2,
    cooldownYears: 20,
    severity: 3,
    effects: { health: -4, happiness: -5, housing: -10, costOfLivingMultiplier: 1.04 },
    decisionId: "respuesta_desastre",
  },
  {
    id: "sequia_global",
    category: "medioambiente",
    title: "La sequía cambia el paisaje",
    narrative:
      "Los embalses bajan, los campos se agrietan y el precio de los alimentos sube. El futuro ya no parece una amenaza lejana.",
    minAge: 5,
    maxAge: 100,
    chance: 2.5,
    cooldownYears: 7,
    severity: 2,
    eras: ["present", "future"],
    effects: { costOfLivingMultiplier: 1.06, health: -1, happiness: -2 },
  },
  {
    id: "oportunidad_educativa",
    category: "educacion",
    title: "Una beca llama a la puerta",
    narrative:
      "Un programa público ofrece formación con plazas limitadas. No garantiza un empleo, pero sí una credencial y una red de contactos.",
    minAge: 16,
    maxAge: 68,
    chance: 6,
    cooldownYears: 5,
    severity: 1,
    effects: { knowledge: 1, happiness: 2 },
    decisionId: "oportunidad_curso",
  },
  {
    id: "reforma_educativa",
    category: "educacion",
    title: "Cambian las reglas de la escuela",
    narrative:
      "Una reforma modifica horarios, exámenes y recursos. Algunos centros se adaptan mejor que otros.",
    minAge: 5,
    maxAge: 22,
    chance: 3,
    cooldownYears: 15,
    severity: 1,
    effects: { knowledge: 1 },
  },
  {
    id: "despido_colectivo",
    category: "trabajo",
    title: "Cierra la fábrica",
    narrative:
      "Una empresa importante anuncia un cierre. Cientos de familias dependen de esos salarios. La noticia se escucha en la panadería y en la escuela.",
    minAge: 20,
    maxAge: 68,
    chance: 2.5,
    cooldownYears: 8,
    severity: 2,
    effects: { happiness: -3, unemploymentDelta: 1.5, phase: "recesion" },
    decisionId: "respuesta_despido",
  },
  {
    id: "automatizacion",
    category: "trabajo",
    title: "Las máquinas aprenden tu tarea",
    narrative:
      "Un nuevo sistema hace en minutos lo que antes ocupaba a varias personas. La empresa dice que nadie sobra; el ambiente dice otra cosa.",
    minAge: 22,
    maxAge: 70,
    chance: 3,
    cooldownYears: 7,
    severity: 2,
    eras: ["present", "future"],
    effects: { happiness: -2, knowledge: 1 },
    decisionId: "respuesta_despido",
  },
  {
    id: "boom_tecnologico",
    category: "tecnologia",
    title: "Una tecnología cambia el trabajo",
    narrative:
      "Una herramienta nueva transforma la forma de producir y comunicarse. Quien aprende a usarla gana tiempo; quien no, compite con menos recursos.",
    minAge: 22,
    maxAge: 75,
    chance: 3,
    cooldownYears: 6,
    severity: 1,
    eras: ["present", "future"],
    effects: { knowledge: 2, happiness: 1 },
    decisionId: "oportunidad_curso",
  },
  {
    id: "ia_empleo",
    category: "tecnologia",
    title: "La inteligencia artificial llega a la oficina",
    narrative:
      "La dirección presenta un asistente que redacta, resume y responde correos. Nadie sabe exactamente qué puestos quedarán dentro de cinco años.",
    minAge: 23,
    maxAge: 70,
    chance: 3.5,
    cooldownYears: 5,
    severity: 2,
    eras: ["present", "future"],
    effects: { happiness: -2, knowledge: 2, unemploymentDelta: 0.8 },
    decisionId: "respuesta_despido",
  },
  {
    id: "reforma_sanitaria",
    category: "salud",
    title: "Cambia el sistema sanitario",
    narrative:
      "Se amplía la cobertura de algunas consultas y se recortan otras. Las listas de espera se mueven sin que nadie sepa muy bien hacia dónde.",
    minAge: 0,
    maxAge: 95,
    chance: 2,
    cooldownYears: 12,
    severity: 1,
    effects: { health: 2, costOfLivingMultiplier: 0.99 },
  },
  {
    id: "avance_medico",
    category: "salud",
    title: "Un avance médico",
    narrative:
      "Un tratamiento nuevo mejora el pronóstico de una enfermedad común. La noticia parece lejana hasta que alguien de tu entorno lo necesita.",
    minAge: 0,
    maxAge: 95,
    chance: 2,
    cooldownYears: 10,
    severity: 1,
    effects: { health: 3 },
  },
  {
    id: "crisis_sanitaria",
    category: "salud",
    title: "Una urgencia médica",
    narrative:
      "El cuerpo envía una señal que no se puede ignorar. El diagnóstico obliga a decidir entre tratamientos, costes y tiempo.",
    minAge: 28,
    maxAge: 94,
    chance: 2.5,
    cooldownYears: 6,
    severity: 2,
    effects: { health: -2 },
    decisionId: "crisis_salud",
  },
  {
    id: "movimiento_social",
    category: "sociedad",
    title: "La calle se organiza",
    narrative:
      "Una causa común lleva a vecinos y desconocidos a reunirse. Las conversaciones se vuelven más políticas y también más personales.",
    minAge: 14,
    maxAge: 85,
    chance: 3,
    cooldownYears: 5,
    severity: 1,
    effects: { relationships: 2, happiness: 2, knowledge: 1 },
  },
  {
    id: "polarizacion",
    category: "politica",
    title: "El país se divide",
    narrative:
      "Las discusiones se vuelven trincheras. Hay familias que dejan de hablar de política y otras que dejan de hablarse.",
    minAge: 18,
    maxAge: 90,
    chance: 3,
    cooldownYears: 6,
    severity: 2,
    effects: { relationships: -2, happiness: -2 },
  },
  {
    id: "guerra_regional",
    category: "politica",
    title: "Un conflicto armado cerca",
    narrative:
      "Las noticias muestran humo y desplazamientos. Aunque el frente esté lejos, el miedo, los precios y las ausencias llegan antes.",
    minAge: 5,
    maxAge: 88,
    chance: 1.4,
    cooldownYears: 15,
    severity: 3,
    effects: {
      health: -3,
      happiness: -6,
      relationships: -2,
      costOfLivingMultiplier: 1.12,
      unemploymentDelta: 2.5,
      phase: "crisis",
    },
    dataRefs: ["indicador de conflicto pendiente de integrar"],
  },
  {
    id: "crisis_vivienda",
    category: "economia",
    title: "La vivienda se vuelve inalcanzable",
    narrative:
      "Los alquileres suben más rápido que los salarios. Compartir piso deja de ser una etapa y se convierte en una estrategia.",
    minAge: 22,
    maxAge: 60,
    chance: 4,
    cooldownYears: 6,
    severity: 2,
    effects: { costOfLivingMultiplier: 1.05, happiness: -2 },
  },
  {
    id: "subida_salario_minimo",
    category: "trabajo",
    title: "Sube el salario mínimo",
    narrative:
      "Una medida eleva el suelo salarial. Para algunos supone un alivio inmediato; para otros, un argumento sobre el coste de contratar.",
    minAge: 18,
    maxAge: 80,
    chance: 2,
    cooldownYears: 8,
    severity: 1,
    effects: { happiness: 2, costOfLivingMultiplier: 1.01 },
  },
  {
    id: "festival_cultural",
    category: "sociedad",
    title: "El barrio se llena de música",
    narrative:
      "Un festival ocupa las calles durante un fin de semana. La rutina se interrumpe y los desconocidos se mezclan sin pedir permiso.",
    minAge: 4,
    maxAge: 95,
    chance: 4,
    cooldownYears: 3,
    severity: 1,
    effects: { happiness: 2, relationships: 2 },
  },
  {
    id: "recorte_servicios",
    category: "politica",
    title: "Recortan los servicios públicos",
    narrative:
      "El presupuesto se ajusta y las oficinas cierran antes. Las colas crecen y las personas que más necesitan ayuda son las que más esperan.",
    minAge: 0,
    maxAge: 95,
    chance: 2,
    cooldownYears: 10,
    severity: 2,
    effects: { health: -1, knowledge: -1, happiness: -2, costOfLivingMultiplier: 1.01 },
  },
  {
    id: "pandemia_futura",
    category: "salud",
    title: "Una nueva pandemia en el futuro",
    narrative:
      "La globalización y los ecosistemas alterados favorecen un nuevo salto viral. La respuesta sanitaria es más rápida, pero la fatiga social también es mayor.",
    minAge: 0,
    maxAge: 100,
    chance: 1.5,
    once: true,
    severity: 3,
    eras: ["future"],
    effects: { health: -4, happiness: -4, costOfLivingMultiplier: 1.06, phase: "recesion" },
    decisionId: "respuesta_epidemia",
  },
  {
    id: "longevidad_medica",
    category: "salud",
    title: "La medicina alarga la vida",
    narrative:
      "Nuevas terapias retrasan algunas enfermedades asociadas a la edad. La vejez se vuelve más larga y también más cara.",
    minAge: 40,
    maxAge: 90,
    chance: 2,
    cooldownYears: 12,
    severity: 1,
    eras: ["future"],
    effects: { health: 4, costOfLivingMultiplier: 1.02 },
  },
];

const eventById = new Map(EVENTS.map((event) => [event.id, event]));

export function getEvent(id: string): SharedEventDefinition | undefined {
  return eventById.get(id);
}

export function listEvents(): SharedEventDefinition[] {
  return EVENTS;
}

function effectsSummary(event: SharedEventDefinition): string[] {
  const summary: string[] = [];
  const effects = event.effects;
  if (effects.costOfLivingMultiplier) {
    const change = Math.round((effects.costOfLivingMultiplier - 1) * 100);
    summary.push(`Coste de vida ${change >= 0 ? "+" : ""}${change}%`);
  }
  if (effects.unemploymentDelta) {
    summary.push(`Desempleo ${effects.unemploymentDelta > 0 ? "+" : ""}${effects.unemploymentDelta} pp`);
  }
  for (const key of ["health", "happiness", "knowledge", "relationships"] as const) {
    const value = effects[key];
    if (value) summary.push(`${key === "health" ? "Salud" : key === "happiness" ? "Felicidad" : key === "knowledge" ? "Conocimiento" : "Relaciones"} ${value > 0 ? "+" : ""}${value}`);
  }
  if (effects.housing) summary.push(`Vivienda ${effects.housing > 0 ? "+" : ""}${effects.housing}`);
  if (effects.moneyDelta) summary.push(`Ingreso extraordinario ${effects.moneyDelta}`);
  return summary;
}

export function toEventRecord(event: SharedEventDefinition): SharedEventRecord {
  return {
    eventId: event.id,
    category: event.category,
    title: event.title,
    narrative: event.narrative,
    severity: event.severity,
    effectsSummary: effectsSummary(event),
    icon: EVENT_CATEGORY_META[event.category].icon,
    decisionId: event.decisionId,
    dataRefs: event.dataRefs,
  };
}

export interface SelectEventsOptions {
  worldSeed: string;
  turn: number;
  age: number;
  countryCode: string;
  era: Era;
  contentSeverity: ContentSeverity;
  lastEventAges: Record<string, number>;
  usedEventIds: string[];
  turnsSinceEvent: number;
}

export function selectSharedEvents(options: SelectEventsOptions): SharedEventDefinition[] {
  const country = getCountry(options.countryCode);
  const candidates = EVENTS.filter((event) => {
    if (options.age < event.minAge || options.age > event.maxAge) return false;
    if (event.eras && !event.eras.includes(options.era)) return false;
    if (event.incomeGroups && !event.incomeGroups.includes(country.incomeGroup)) return false;
    if (event.once && options.usedEventIds.includes(event.id)) return false;
    if (options.contentSeverity === "moderate" && event.severity === 3) return false;
    const lastAge = options.lastEventAges[event.id];
    if (lastAge !== undefined && event.cooldownYears) {
      if (options.age - lastAge < event.cooldownYears) return false;
    }
    return true;
  });
  if (candidates.length === 0) return [];

  const rng = createRng(deriveSeed(options.worldSeed, "world-events", options.turn));
  const shuffled = rng.shuffle(candidates);
  const chosen: SharedEventDefinition[] = [];
  for (const event of shuffled) {
    if (event.once && options.usedEventIds.includes(event.id)) continue;
    if (rng.chance(event.chance)) {
      chosen.push(event);
      if (chosen.length >= 2) break;
    }
  }
  if (chosen.length === 0 && rng.chance(options.turnsSinceEvent >= 2 ? 72 : 34)) {
    const fallbackPool = shuffled.filter((event) => !chosen.includes(event));
    if (fallbackPool.length > 0) {
      chosen.push(rng.weighted(fallbackPool, (event) => 1 / Math.max(event.chance, 0.5)));
    }
  }
  return chosen;
}

export function applyWorldEffects(
  economy: EconomyState,
  events: SharedEventDefinition[],
): EconomyState {
  let cost = economy.costOfLivingIndex;
  let unemployment = economy.unemploymentRate;
  let phase = economy.phase;
  for (const event of events) {
    if (event.effects.costOfLivingMultiplier) cost *= event.effects.costOfLivingMultiplier;
    if (event.effects.unemploymentDelta) unemployment += event.effects.unemploymentDelta;
    if (event.effects.phase) phase = event.effects.phase;
  }
  return {
    ...economy,
    costOfLivingIndex: Math.round(clamp(cost, 0.65, 2.2) * 1000) / 1000,
    unemploymentRate: Math.round(clamp(unemployment, 0, 55) * 10) / 10,
    phase,
  };
}

export function applyEventToCharacterStats(
  stats: { health: number; happiness: number; knowledge: number; relationships: number },
  events: SharedEventDefinition[],
): Partial<typeof stats> {
  const total = { health: 0, happiness: 0, knowledge: 0, relationships: 0 };
  for (const event of events) {
    total.health += event.effects.health ?? 0;
    total.happiness += event.effects.happiness ?? 0;
    total.knowledge += event.effects.knowledge ?? 0;
    total.relationships += event.effects.relationships ?? 0;
  }
  stats.health = clamp(stats.health + total.health);
  stats.happiness = clamp(stats.happiness + total.happiness);
  stats.knowledge = clamp(stats.knowledge + total.knowledge);
  stats.relationships = clamp(stats.relationships + total.relationships);
  return total;
}

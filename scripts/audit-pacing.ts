import { DEFAULT_GAME_CONFIG } from "../shared/src/index.js";
import {
    advanceMonth,
    autoSubmit,
    createSoloGame,
    waitingFor,
} from "../server/src/simulation/engine.js";
import { automaticHousehold } from "../server/src/simulation/automatic-household.js";

/**
 * Auditoría rápida de ritmo narrativo.
 *
 * No es una prueba estadística: sirve para detectar bucles, medir cuántas
 * situaciones distintas ve una vida y comparar revisiones del selector.
 *
 * Uso:
 *   npm run audit:pacing
 *   LIVES=50 COUNTRY=ITA npm run audit:pacing
 */
const lives = Math.max(1, Number(process.env.LIVES ?? 20));
const country = (process.env.COUNTRY ?? "ESP").toUpperCase();
const maxAge = Number(process.env.MAX_AGE ?? 85);

interface LifeAudit {
    age: number;
    total: number;
    distinct: number;
    promptYears: number;
    titles: number;
    events: number;
    business: number;
    family: number;
    maxRepeat: number;
}

const eventIds = new Set([
    "respuesta_crisis",
    "respuesta_epidemia",
    "respuesta_desastre",
    "presupuesto_inflacion",
    "oportunidad_curso",
    "respuesta_despido",
    "crisis_salud",
]);
const familyIds = new Set([
    "prestamo_familia",
    "cuidar_padres_mayores",
    "acuerdo_pareja",
    "crianza_dialogo",
]);

const results: LifeAudit[] = [];

for (let index = 0; index < lives; index += 1) {
    const game = createSoloGame(
        `pacing-audit-${index}`,
        "audit-player",
        "Auditoría",
        {
            ...DEFAULT_GAME_CONFIG,
            countryMode: "fixed",
            fixedCountry: country,
            storyMode: true,
            monthlyMode: true,
            maxAge: maxAge as 60 | 85 | 105,
            autoDecisions: true,
        },
        `pacing-audit-${country}-${index}`,
    );

    const promptAges = new Set<number>();
    const titles = new Set<string>();
    let guard = 0;

    while (game.status === "playing" && guard < 1_500) {
        for (const slot of waitingFor(game)) {
            const prompt = game.pending?.prompts[slot];
            if (prompt) {
                promptAges.add(game.age);
                titles.add(prompt.title);
            }
            autoSubmit(game, slot);
        }
        automaticHousehold(game);
        advanceMonth(game);
        guard += 1;
    }

    const player = game.players[0]!;
    const ids = player.decisions.map((decision) => decision.decisionId);
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);

    results.push({
        age: player.character?.age ?? 0,
        total: ids.length,
        distinct: counts.size,
        promptYears: promptAges.size,
        titles: titles.size,
        events: ids.filter((id) => eventIds.has(id)).length,
        business: ids.filter(
            (id) =>
                id.startsWith("company_") ||
                id.startsWith("empresa_") ||
                id === "comercio_inventario" ||
                id === "clinica_cobros",
        ).length,
        family: ids.filter((id) => familyIds.has(id)).length,
        maxRepeat: Math.max(0, ...counts.values()),
    });
}

const average = (key: keyof LifeAudit) =>
    results.reduce((sum, result) => sum + result[key], 0) / results.length;

console.log(`Ritmo narrativo · ${lives} vidas · ${country} · máximo ${maxAge} años`);
console.log("─".repeat(62));
console.log(`Edad media al morir:              ${average("age").toFixed(1)}`);
console.log(`Decisiones totales medias:        ${average("total").toFixed(1)}`);
console.log(`Situaciones distintas medias:     ${average("distinct").toFixed(1)}`);
console.log(`Años con al menos una pregunta:   ${average("promptYears").toFixed(1)}`);
console.log(`Títulos distintos medios:         ${average("titles").toFixed(1)}`);
console.log(`Decisiones de evento medias:      ${average("events").toFixed(1)}`);
console.log(`Decisiones de empresa medias:     ${average("business").toFixed(1)}`);
console.log(`Decisiones familiares medias:     ${average("family").toFixed(1)}`);
console.log(`Máximo de repeticiones:           ${Math.max(...results.map((result) => result.maxRepeat))}`);
console.log("─".repeat(62));
console.log("La muestra es orientativa; no sustituye una prueba estadística.");

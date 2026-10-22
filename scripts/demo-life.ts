/**
 * Simulación de demostración por consola.
 *
 * Uso:
 *   npm run sim:demo
 *   npm run sim:demo -- semilla-personalizada
 *
 * Se ejecuta con la política automática reproducible del servidor. No necesita
 * navegador, base de datos ni API key.
 */
import { DEFAULT_GAME_CONFIG, EDUCATION_META } from "@life-duel/shared";
import {
    autoSubmit,
    createSoloGame,
    newGameId,
    resolveTurn,
} from "../server/src/simulation/engine.js";
import { getGameView } from "../server/src/services/view.js";

const seed = process.argv[2] ?? "demo-vida-2026";
const playerId = "demo-player";
const game = createSoloGame(newGameId(), playerId, "Demo", {
    ...DEFAULT_GAME_CONFIG,
    countryMode: "weighted",
    era: "present",
    maxAge: 85,
    autoDecisions: true,
    speed: 16,
}, seed);

let guard = 0;
while (game.status === "playing" && game.pending && guard < 160) {
    autoSubmit(game, 1);
    resolveTurn(game);
    guard += 1;
}

const view = getGameView(game, playerId);
const me = view.me;
const birth = view.world.birth;
const final = game.final?.players[1];
const money = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: me.character.currentCurrency.code,
    maximumFractionDigits: 0,
}).format(me.character.finance.money);

console.log("");
console.log("LIFE DUEL · simulación de demostración");
console.log("──────────────────────────────────────");
console.log(`Semilla del mundo: ${seed}`);
console.log(`Huella pública:   ${view.world.seedFingerprint}`);
console.log(`Nacimiento:       ${birth.givenName} ${birth.surname}, ${birth.year}, ${birth.countryName}`);
console.log(`Familia:          ${birth.family.label}`);
console.log(`Años simulados:   ${guard} · edad final ${me.character.ageAtDeath ?? me.character.age}`);
console.log(`Causa:            ${me.character.causeOfDeath ?? "fin de la simulación"}`);
console.log(`Educación:        ${EDUCATION_META[me.character.educationLevel]?.label ?? me.character.educationLevel}`);
console.log(`Ocupación:        ${me.character.employment.occupation ?? "sin empleo estable"}`);
console.log(`Salud/Felicidad:  ${Math.round(me.character.stats.health)} / ${Math.round(me.character.stats.happiness)}`);
console.log(`Conocimiento/Rel: ${Math.round(me.character.stats.knowledge)} / ${Math.round(me.character.stats.relationships)}`);
console.log(`Dinero:           ${money}`);
console.log(`Deuda:            ${me.character.finance.debt.toFixed(0)}`);
console.log(`Puntuación final: ${me.score.total.toFixed(1)} / 100`);
console.log(`Hitos:            ${me.character.milestones.length}`);
console.log(`Decisiones:       ${me.character.yearlyChoices}`);
console.log("──────────────────────────────────────");
console.log(
    final?.lifeSummary ??
    "La simulación no alcanzó el estado final; revisa la configuración y la semilla.",
);
console.log("");

if (game.status !== "finished") {
    console.error("Aviso: la simulación no terminó dentro del límite de seguridad.");
    process.exitCode = 1;
}

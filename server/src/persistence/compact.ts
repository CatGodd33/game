import { gunzipSync, gzipSync } from "node:zlib";
import type { PlayerSlot, TurnPlayerRecord, TurnRecord } from "@life-duel/shared";
import type { StoredGame, StoredPlayer } from "../types/records.js";

/**
 * Persistencia compacta de LIFE DUEL.
 *
 * Solo se guardan las salas de duelo (el modo individual vive en memoria).
 * Aun así, una sala completa puede superar el megabyte por el historial
 * narrativo, así que antes de escribir se recorta lo que no hace falta para
 * reanudar la partida y se comprime con gzip.
 *
 * Reglas de recorte (no alteran la simulación):
 * - Se conservan TODAS las instantáneas de puntuación: la nota final depende
 *   de su media histórica y recortarlas cambiaría el resultado tras reiniciar.
 * - Se conservan los últimos turnos completos; los anteriores pierden el
 *   texto narrativo y los extractos bancarios, que solo alimentan la interfaz.
 * - Se limita el libro de transacciones, el historial de puntuación y las
 *   decisiones recordadas, que se usan para mostrar o para elegir la última
 *   decisión (se mantienen las 80 más recientes).
 */

const HISTORY_TURNS = 24;
const NARRATIVE_TURNS = 6;
const DECISION_LIMIT = 80;
const LEDGER_LIMIT = 40;
const SCORE_HISTORY_LIMIT = 40;
const IDEMPOTENCY_LIMIT = 80;
const BANK_LIMIT = 12;

export const STORAGE_ENVELOPE_KEY = "__lifeDuelZip";
export const STORAGE_COMPACT_VERSION = 1;

export interface StoredGameEnvelope {
    [STORAGE_ENVELOPE_KEY]: number;
    zip: string;
    /** Tamaño del JSON original, para diagnósticos. */
    bytes: number;
}

function slimTurn(turn: TurnRecord, keepNarrative: boolean): TurnRecord {
    if (keepNarrative) return turn;
    const players: Partial<Record<PlayerSlot, TurnPlayerRecord>> = {};
    for (const [slot, record] of Object.entries(turn.players) as [string, TurnPlayerRecord | undefined][]) {
        if (!record) continue;
        players[Number(slot) as PlayerSlot] = {
            ...record,
            narrative: [],
            bank: record.bank?.slice(-BANK_LIMIT),
        };
    }
    return {
        ...turn,
        sharedEvents: turn.sharedEvents.map((event) => ({ ...event, narrative: "" })),
        players,
    };
}

function compactPlayer(player: StoredPlayer, monthlyMode: boolean): StoredPlayer {
    const copy = structuredClone(player);
    copy.decisions = copy.decisions.slice(-DECISION_LIMIT);
    copy.scoreHistory = copy.scoreHistory.slice(-SCORE_HISTORY_LIMIT);
    if (copy.character) {
        copy.character.finance.ledger = copy.character.finance.ledger.slice(-LEDGER_LIMIT);
        copy.character.milestones = copy.character.milestones.slice(-60);
        // En el reloj mensual los extractos se suman para el informe anual:
        // recortarlos cambiaría cifras visibles, así que solo se limitan los
        // de partidas anuales (donde la lista ya está vacía).
        if (!monthlyMode && copy.character.liveEconomy) {
            copy.character.liveEconomy.statements = copy.character.liveEconomy.statements.slice(-36);
        }
    }
    return copy;
}

/** Copia recortada del estado autoritativo, lista para persistir. */
export function compactGame(game: StoredGame): StoredGame {
    const copy = structuredClone(game);
    const keepFrom = Math.max(0, copy.history.length - HISTORY_TURNS);
    copy.history = copy.history.map((turn, index) =>
        slimTurn(turn, index >= copy.history.length - NARRATIVE_TURNS),
    );
    copy.history = copy.history.slice(keepFrom);
    copy.players = copy.players.map((player) => compactPlayer(player, Boolean(copy.config.monthlyMode)));
    copy.scoreHistory = copy.scoreHistory.slice(-SCORE_HISTORY_LIMIT);
    copy.idempotency = Object.fromEntries(
        Object.entries(copy.idempotency).slice(-IDEMPOTENCY_LIMIT),
    );
    if (copy.independentRuns) {
        const runs: Partial<Record<PlayerSlot, StoredGame>> = {};
        for (const [slot, run] of Object.entries(copy.independentRuns)) {
            if (run) runs[Number(slot) as PlayerSlot] = compactGame(run);
        }
        copy.independentRuns = runs;
    }
    return copy;
}

/** Envoltorio comprimido compatible con la columna `data` ya existente. */
export function encodeStoredGame(game: StoredGame): StoredGameEnvelope {
    const compact = compactGame(game);
    const json = JSON.stringify(compact);
    const zip = gzipSync(Buffer.from(json, "utf8"), { level: 6 }).toString("base64");
    return {
        [STORAGE_ENVELOPE_KEY]: STORAGE_COMPACT_VERSION,
        zip,
        bytes: Buffer.byteLength(json, "utf8"),
    };
}

export function isStoredGameEnvelope(value: unknown): value is StoredGameEnvelope {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Partial<StoredGameEnvelope>;
    return typeof candidate[STORAGE_ENVELOPE_KEY] === "number" && typeof candidate.zip === "string";
}

/** Acepta tanto el formato comprimido nuevo como las filas antiguas en claro. */
export function decodeStoredGame(value: unknown): StoredGame | null {
    if (typeof value !== "object" || value === null) return null;
    if (isStoredGameEnvelope(value)) {
        try {
            const json = gunzipSync(Buffer.from(value.zip, "base64")).toString("utf8");
            return normalizeStoredGame(JSON.parse(json));
        } catch {
            return null;
        }
    }
    return normalizeStoredGame(value);
}

function normalizeStoredGame(value: unknown): StoredGame | null {
    if (typeof value !== "object" || value === null) return null;
    const candidate = value as Partial<StoredGame>;
    if (typeof candidate.id !== "string" || typeof candidate.seed !== "string") return null;
    return candidate as StoredGame;
}

/** Bytes aproximados que ocupará una partida al persistirse. */
export function estimateStoredBytes(game: StoredGame): number {
    const json = JSON.stringify(compactGame(game));
    return gzipSync(Buffer.from(json, "utf8"), { level: 1 }).byteLength;
}

import type { StoredGame } from "../types/records.js";
import type { GameStore } from "./types.js";

/**
 * Almacén volátil de último recurso.
 *
 * LIFE DUEL solo persiste salas de duelo; el modo individual vive siempre en
 * memoria. Si PostgreSQL no está disponible (cuota agotada, red caída o
 * mantenimiento) el servidor arranca con este almacén para que se pueda jugar,
 * avisando en `/api/health` de que la recuperación tras reinicio está apagada.
 */
export class MemoryGameStore implements GameStore {
    private readonly games = new Map<string, StoredGame>();

    async init(): Promise<void> {
        // Nada que inicializar.
    }

    async get(id: string): Promise<StoredGame | null> {
        const game = this.games.get(id);
        return game ? structuredClone(game) : null;
    }

    async findByCode(code: string): Promise<StoredGame | null> {
        const normalized = code.toUpperCase();
        for (const game of this.games.values()) {
            if (game.code === normalized) return structuredClone(game);
        }
        return null;
    }

    async loadAll(): Promise<StoredGame[]> {
        return [...this.games.values()].map((game) => structuredClone(game));
    }

    async loadActive(): Promise<StoredGame[]> {
        return [...this.games.values()]
            .filter((game) => game.mode === "duel" && game.status !== "finished")
            .map((game) => structuredClone(game));
    }

    async save(game: StoredGame): Promise<void> {
        this.games.set(game.id, structuredClone(game));
    }

    async delete(id: string): Promise<void> {
        this.games.delete(id);
    }

    async prune(): Promise<number> {
        return 0;
    }
}

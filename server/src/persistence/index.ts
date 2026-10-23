import { config } from "../config.js";
import { logger } from "../logger.js";
import { JsonGameStore } from "./jsonStore.js";
import { MemoryGameStore } from "./memoryStore.js";
import { PostgresGameStore } from "./postgresStore.js";
import type { GameStore } from "./types.js";

export type PersistenceMode = "json" | "postgres" | "memory";

export interface GameStoreSetup {
    store: GameStore;
    /** Modo realmente activo (`memory` si el configurado no respondió). */
    mode: PersistenceMode;
    requested: "json" | "postgres";
    degraded: boolean;
    error: string | null;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} superó ${ms} ms.`)), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function createGameStore(): Promise<GameStore> {
    const store: GameStore =
        config.persistence === "postgres"
            ? new PostgresGameStore(config.databaseUrl ?? "")
            : new JsonGameStore();
    await store.init();
    return store;
}

/**
 * Crea el almacén configurado y, si no está disponible, cae a memoria.
 *
 * LIFE DUEL solo guarda salas de duelo: el modo individual funciona sin base
 * de datos. Así una cuota agotada o una caída de PostgreSQL no impide jugar;
 * solo se pierde la recuperación de salas tras un reinicio.
 */
export async function createGameStoreSafe(): Promise<GameStoreSetup> {
    const requested = config.persistence;
    try {
        const store: GameStore =
            requested === "postgres"
                ? new PostgresGameStore(config.databaseUrl ?? "")
                : new JsonGameStore();
        await withTimeout(store.init(), 10_000, "La conexión de persistencia");
        return { store, mode: requested, requested, degraded: false, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido de persistencia.";
        logger.warn("Persistencia no disponible; se continúa en memoria.", {
            requested,
            error: message,
        });
        return {
            store: new MemoryGameStore(),
            mode: "memory",
            requested,
            degraded: true,
            error: message,
        };
    }
}

export { JsonGameStore, MemoryGameStore, PostgresGameStore };
export type { GameStore } from "./types.js";

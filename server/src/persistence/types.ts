import type { StoredGame } from "../types/records.js";

export interface GameStore {
    init(): Promise<void>;
    get(id: string): Promise<StoredGame | null>;
    findByCode(code: string): Promise<StoredGame | null>;
    loadAll(): Promise<StoredGame[]>;
    /** Partidas que necesitan reloj o temporizador al arrancar. */
    loadActive?(): Promise<StoredGame[]>;
    save(game: StoredGame): Promise<void>;
    delete(id: string): Promise<void>;
    flush?(): Promise<void>;
    close?(): Promise<void>;
}

export class StoreCorruptionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StoreCorruptionError";
    }
}

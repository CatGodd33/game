import type { StoredGame } from "../types/records.js";

export interface PruneOptions {
    /** Elimina las partidas individuales antiguas: el modo individual ya no se persiste. */
    solo?: boolean;
    /** Salas terminadas anteriores a esta fecha. */
    finishedBefore?: Date;
    /** Salas abandonadas en espera anteriores a esta fecha. */
    waitingBefore?: Date;
}

export interface GameStore {
    init(): Promise<void>;
    get(id: string): Promise<StoredGame | null>;
    findByCode(code: string): Promise<StoredGame | null>;
    loadAll(): Promise<StoredGame[]>;
    /** Salas abiertas (espera, preparada o en curso) que deben recuperarse al arrancar. */
    loadActive?(): Promise<StoredGame[]>;
    /** Borra filas que ya no aportan nada, sin leer su contenido. */
    prune?(options?: PruneOptions): Promise<number>;
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

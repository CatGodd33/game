import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { StoredGame } from "../types/records.js";
import type { GameStore, PruneOptions } from "./types.js";

interface StoreFile {
    version: 1;
    savedAt: string;
    games: StoredGame[];
}

/**
 * Persistencia local en un único archivo JSON con escritura atómica.
 * Es una implementación real y duradera para desarrollo/pruebas; el adaptador
 * PostgreSQL (Prisma) se activa con PERSISTENCE=postgres.
 */
export class JsonGameStore implements GameStore {
    private readonly filePath: string;
    private readonly games = new Map<string, StoredGame>();
    private loaded = false;
    private writeChain: Promise<void> = Promise.resolve();

    constructor(filePath = join(config.persistDir, "games.json")) {
        this.filePath = filePath;
    }

    async init(): Promise<void> {
        if (this.loaded) return;
        await mkdir(dirname(this.filePath), { recursive: true });
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw) as Partial<StoreFile>;
            if (!parsed || !Array.isArray(parsed.games)) {
                throw new Error("El archivo de partidas no tiene el formato esperado.");
            }
            for (const game of parsed.games) {
                if (game && typeof game.id === "string") {
                    this.games.set(game.id, game);
                }
            }
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
                await this.writeNow();
            } else {
                const backup = `${this.filePath}.corrupt-${Date.now()}`;
                logger.error("Archivo de persistencia corrupto; se conserva una copia.", {
                    backup,
                    error: (error as Error).message,
                });
                await rename(this.filePath, backup).catch(() => undefined);
                await this.writeNow();
            }
        }
        this.loaded = true;
    }

    private ensureLoaded(): void {
        if (!this.loaded) throw new Error("El almacén JSON no se ha inicializado.");
    }

    async get(id: string): Promise<StoredGame | null> {
        this.ensureLoaded();
        const game = this.games.get(id);
        return game ? structuredClone(game) : null;
    }

    async findByCode(code: string): Promise<StoredGame | null> {
        this.ensureLoaded();
        const normalized = code.toUpperCase();
        for (const game of this.games.values()) {
            if (game.code === normalized) return structuredClone(game);
        }
        return null;
    }

    async loadAll(): Promise<StoredGame[]> {
        this.ensureLoaded();
        return [...this.games.values()].map((game) => structuredClone(game));
    }

    async loadActive(): Promise<StoredGame[]> {
        this.ensureLoaded();
        return [...this.games.values()]
            .filter((game) => game.mode === "duel" && game.status !== "finished")
            .map((game) => structuredClone(game));
    }

    async save(game: StoredGame): Promise<void> {
        this.ensureLoaded();
        this.games.set(game.id, structuredClone(game));
        this.writeChain = this.writeChain.then(() => this.writeNow());
        await this.writeChain;
    }

    async delete(id: string): Promise<void> {
        this.ensureLoaded();
        this.games.delete(id);
        this.writeChain = this.writeChain.then(() => this.writeNow());
        await this.writeChain;
    }

    async prune(options: PruneOptions = {}): Promise<number> {
        this.ensureLoaded();
        let removed = 0;
        for (const [id, game] of this.games) {
            const updated = new Date(game.updatedAt).getTime();
            const finished = Boolean(options.finishedBefore) && game.status === "finished" && updated < options.finishedBefore!.getTime();
            const waiting = Boolean(options.waitingBefore) && (game.status === "waiting" || game.status === "ready") && updated < options.waitingBefore!.getTime();
            if ((options.solo && game.mode === "solo") || finished || waiting) {
                this.games.delete(id);
                removed += 1;
            }
        }
        if (removed > 0) {
            this.writeChain = this.writeChain.then(() => this.writeNow());
            await this.writeChain;
            logger.info("Persistencia JSON: partidas antiguas eliminadas.", { removed });
        }
        return removed;
    }

    async flush(): Promise<void> {
        await this.writeChain;
    }

    private async writeNow(): Promise<void> {
        const payload: StoreFile = {
            version: 1,
            savedAt: new Date().toISOString(),
            games: [...this.games.values()],
        };
        const temporary = `${this.filePath}.${process.pid}.tmp`;
        await writeFile(temporary, JSON.stringify(payload), "utf8");
        await rename(temporary, this.filePath);
    }
}

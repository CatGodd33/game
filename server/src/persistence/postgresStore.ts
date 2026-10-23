import { logger } from "../logger.js";
import type { StoredGame } from "../types/records.js";
import { decodeStoredGame, encodeStoredGame } from "./compact.js";
import type { GameStore, PruneOptions } from "./types.js";

type PrismaLike = {
    gameRecord: {
        findUnique(args: unknown): Promise<{ data: unknown } | null>;
        findMany(args?: unknown): Promise<{ data: unknown }[]>;
        upsert(args: unknown): Promise<unknown>;
        delete(args: unknown): Promise<unknown>;
        deleteMany(args: unknown): Promise<{ count: number }>;
    };
    $connect(): Promise<void>;
    $queryRawUnsafe(query: string): Promise<unknown>;
    $disconnect(): Promise<void>;
};

export interface StoreStats {
    reads: number;
    writes: number;
    bytesRead: number;
    bytesWritten: number;
}

/**
 * Adaptador PostgreSQL con Prisma 7 y el driver adapter oficial `pg`.
 *
 * Solo se persisten salas de duelo. Antes de escribir, el estado se recorta y
 * se comprime con gzip dentro de la columna JSON `data` (ver `compact.ts`), de
 * modo que no hace falta migrar el esquema y las filas antiguas siguen
 * leyéndose. Las consultas de arranque se limitan a salas abiertas.
 */
export class PostgresGameStore implements GameStore {
    private prisma: PrismaLike | null = null;
    private initialized = false;
    private readonly stats: StoreStats = { reads: 0, writes: 0, bytesRead: 0, bytesWritten: 0 };

    constructor(private readonly connectionString: string) { }

    async init(): Promise<void> {
        if (this.initialized) return;
        if (!this.connectionString) throw new Error("DATABASE_URL no está definida.");
        const clientModule = (await import("@prisma/client")) as unknown as {
            PrismaClient: new (options: unknown) => PrismaLike;
        };
        const adapterModule = (await import("@prisma/adapter-pg")) as {
            PrismaPg: new (options: { connectionString: string }) => unknown;
        };
        const adapter = new adapterModule.PrismaPg({ connectionString: this.connectionString });
        this.prisma = new clientModule.PrismaClient({ adapter });
        await this.prisma.$connect();
        // El driver `pg` conecta de forma perezosa: $connect() puede resolver
        // aunque la base esté caída. Una consulta mínima confirma que responde
        // antes de activar PostgreSQL y permite caer a memoria con claridad.
        await this.prisma.$queryRawUnsafe("SELECT 1");
        this.initialized = true;
        logger.info("Persistencia PostgreSQL conectada mediante Prisma.");
    }

    private client(): PrismaLike {
        if (!this.prisma) throw new Error("PostgreSQL no se ha inicializado.");
        return this.prisma;
    }

    private decodeRow(row: { data: unknown }): StoredGame | null {
        const game = decodeStoredGame(row.data);
        if (game) {
            this.stats.reads += 1;
            this.stats.bytesRead += Buffer.byteLength(JSON.stringify(row.data), "utf8");
        }
        return game;
    }

    async get(id: string): Promise<StoredGame | null> {
        const row = await this.client().gameRecord.findUnique({ where: { id } });
        return row ? this.decodeRow(row) : null;
    }

    async findByCode(code: string): Promise<StoredGame | null> {
        const row = await this.client().gameRecord.findUnique({
            where: { code: code.toUpperCase() },
        });
        return row ? this.decodeRow(row) : null;
    }

    async loadAll(): Promise<StoredGame[]> {
        const rows = await this.client().gameRecord.findMany({ where: { mode: "duel" } });
        return rows
            .map((row) => this.decodeRow(row))
            .filter((game): game is StoredGame => Boolean(game));
    }

    /**
     * Salas que deben recuperarse al arrancar. Se piden solo las más recientes
     * para acotar la transferencia si quedan salas abandonadas antiguas; la
     * limpieza periódica se encarga del resto.
     */
    async loadActive(): Promise<StoredGame[]> {
        const rows = await this.client().gameRecord.findMany({
            where: { mode: "duel", status: { in: ["waiting", "ready", "playing"] } },
            orderBy: { updatedAt: "desc" },
            take: 200,
        });
        return rows
            .map((row) => this.decodeRow(row))
            .filter((game): game is StoredGame => Boolean(game));
    }

    async save(game: StoredGame): Promise<void> {
        const payload = encodeStoredGame(game);
        this.stats.writes += 1;
        this.stats.bytesWritten += payload.zip.length;
        await this.client().gameRecord.upsert({
            where: { id: game.id },
            create: {
                id: game.id,
                mode: game.mode,
                code: game.code,
                status: game.status,
                data: payload,
            },
            update: {
                mode: game.mode,
                code: game.code,
                status: game.status,
                data: payload,
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.client().gameRecord.delete({ where: { id } });
    }

    /**
     * Limpieza sin leer snapshots: borra las vidas individuales antiguas
     * (dejaron de persistirse), las salas terminadas y las abandonadas.
     */
    async prune(options: PruneOptions = {}): Promise<number> {
        let removed = 0;
        const client = this.client();
        if (options.solo) {
            const solo = await client.gameRecord.deleteMany({ where: { mode: "solo" } });
            removed += solo.count;
        }
        if (options.finishedBefore) {
            const finished = await client.gameRecord.deleteMany({
                where: { status: "finished", updatedAt: { lt: options.finishedBefore } },
            });
            removed += finished.count;
        }
        if (options.waitingBefore) {
            const waiting = await client.gameRecord.deleteMany({
                where: {
                    status: { in: ["waiting", "ready"] },
                    updatedAt: { lt: options.waitingBefore },
                },
            });
            removed += waiting.count;
        }
        if (removed > 0) logger.info("Persistencia: filas antiguas eliminadas.", { removed });
        return removed;
    }

    getStats(): StoreStats {
        return { ...this.stats };
    }

    async close(): Promise<void> {
        await this.prisma?.$disconnect();
    }
}

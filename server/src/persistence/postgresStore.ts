import { logger } from "../logger.js";
import type { StoredGame } from "../types/records.js";
import type { GameStore } from "./types.js";

type PrismaLike = {
    gameRecord: {
        findUnique(args: unknown): Promise<{ data: unknown } | null>;
        findMany(args?: unknown): Promise<{ data: unknown }[]>;
        upsert(args: unknown): Promise<unknown>;
        delete(args: unknown): Promise<unknown>;
    };
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
};

/**
 * Adaptador PostgreSQL con Prisma 7 y el driver adapter oficial `pg`.
 * El cliente generado no está versionado: ejecuta `npm run prisma:generate`
 * y aplica `npm run prisma:migrate` antes de activar PERSISTENCE=postgres.
 */
export class PostgresGameStore implements GameStore {
    private prisma: PrismaLike | null = null;
    private initialized = false;

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
        this.initialized = true;
        logger.info("Persistencia PostgreSQL conectada mediante Prisma.");
    }

    private client(): PrismaLike {
        if (!this.prisma) throw new Error("PostgreSQL no se ha inicializado.");
        return this.prisma;
    }

    private toGame(data: unknown): StoredGame | null {
        if (typeof data !== "object" || data === null) return null;
        const candidate = data as Partial<StoredGame>;
        if (typeof candidate.id !== "string" || typeof candidate.seed !== "string") return null;
        return candidate as StoredGame;
    }

    async get(id: string): Promise<StoredGame | null> {
        const row = await this.client().gameRecord.findUnique({ where: { id } });
        return row ? this.toGame(row.data) : null;
    }

    async findByCode(code: string): Promise<StoredGame | null> {
        const row = await this.client().gameRecord.findUnique({
            where: { code: code.toUpperCase() },
        });
        return row ? this.toGame(row.data) : null;
    }

    async loadAll(): Promise<StoredGame[]> {
        const rows = await this.client().gameRecord.findMany();
        return rows
            .map((row) => this.toGame(row.data))
            .filter((game): game is StoredGame => Boolean(game));
    }

    async loadActive(): Promise<StoredGame[]> {
        const rows = await this.client().gameRecord.findMany({ where: { status: "playing" } });
        return rows
            .map((row) => this.toGame(row.data))
            .filter((game): game is StoredGame => Boolean(game));
    }

    async save(game: StoredGame): Promise<void> {
        await this.client().gameRecord.upsert({
            where: { id: game.id },
            create: {
                id: game.id,
                mode: game.mode,
                code: game.code,
                status: game.status,
                data: game,
            },
            update: {
                mode: game.mode,
                code: game.code,
                status: game.status,
                data: game,
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.client().gameRecord.delete({ where: { id } });
    }

    async close(): Promise<void> {
        await this.prisma?.$disconnect();
    }
}

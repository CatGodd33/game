import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { z } from "zod";

export const ROOT_DIR = resolve(fileURLToPath(new URL("../../", import.meta.url)));

for (const envPath of [resolve(ROOT_DIR, ".env"), resolve(ROOT_DIR, "server/.env")]) {
    if (existsSync(envPath)) {
        dotenv.config({ path: envPath, quiet: true });
    }
}

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
    RENDER_EXTERNAL_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(24).optional(),
    PERSISTENCE: z.enum(["json", "postgres"]).default("json"),
    DATABASE_URL: z.string().url().optional(),
    DATA_DIR: z.string().optional(),
    PERSIST_DIR: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
    DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
    DEEPSEEK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(9000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Configuración de entorno inválida:", parsed.error.issues);
    throw new Error("Revisa las variables de entorno del servidor.");
}

const env = parsed.data;
const configuredOrigins = env.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
// Render expone la URL pública del servicio en RENDER_EXTERNAL_URL. Se añade
// junto con el propio origen local para que el modo producción de un solo
// servicio no dependa de configurar CLIENT_ORIGIN a mano.
const platformOrigins = [
    env.RENDER_EXTERNAL_URL?.replace(/\/+$/, ""),
    `http://localhost:${env.PORT}`,
    `http://127.0.0.1:${env.PORT}`,
].filter((origin): origin is string => Boolean(origin));
const clientOrigins = [...new Set([...configuredOrigins, ...platformOrigins])];
const persistDir = env.PERSIST_DIR ? resolve(ROOT_DIR, env.PERSIST_DIR) : resolve(ROOT_DIR, "server/.data");

/**
 * Sin SESSION_SECRET explícito, se conserva un secreto local con permisos
 * restringidos para que las sesiones sobrevivan a un reinicio en desarrollo.
 * En producción el secreto es obligatorio y nunca se genera en disco.
 */
function resolveSessionSecret(): {
    secret: string;
    source: "env" | "file" | "ephemeral";
} {
    if (env.SESSION_SECRET) return { secret: env.SESSION_SECRET, source: "env" };
    if (env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET es obligatorio en producción.");
    }
    const secretPath = resolve(persistDir, ".session-secret");
    try {
        mkdirSync(persistDir, { recursive: true });
        if (existsSync(secretPath)) {
            const stored = readFileSync(secretPath, "utf8").trim();
            if (stored.length >= 24) return { secret: stored, source: "file" };
        }
        const secret = crypto.randomBytes(48).toString("hex");
        writeFileSync(secretPath, secret, { encoding: "utf8", mode: 0o600 });
        chmodSync(secretPath, 0o600);
        console.warn(
            "[config] SESSION_SECRET no definido. Se ha creado un secreto local persistente en server/.data/.session-secret.",
        );
        return { secret, source: "file" };
    } catch {
        console.warn(
            "[config] SESSION_SECRET no definido y no se pudo persistir un secreto local. Las sesiones serán efímeras.",
        );
        return { secret: crypto.randomBytes(48).toString("hex"), source: "ephemeral" };
    }
}

const sessionSecretState = resolveSessionSecret();
const generatedSecret = sessionSecretState.source !== "env";

if (env.PERSISTENCE === "postgres" && !env.DATABASE_URL) {
    throw new Error("PERSISTENCE=postgres requiere DATABASE_URL.");
}

export const config = {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    port: env.PORT,
    clientOrigin: env.CLIENT_ORIGIN,
    clientOrigins,
    sessionSecret: sessionSecretState.secret,
    generatedSecret,
    sessionSecretSource: sessionSecretState.source,
    persistence: env.PERSISTENCE,
    databaseUrl: env.DATABASE_URL,
    dataDir: env.DATA_DIR ? resolve(ROOT_DIR, env.DATA_DIR) : resolve(ROOT_DIR, "data"),
    persistDir,
    clientDist: resolve(ROOT_DIR, "client/dist"),
    deepseek: {
        apiKey: env.DEEPSEEK_API_KEY ?? null,
        baseUrl: env.DEEPSEEK_BASE_URL.replace(/\/+$/, ""),
        model: env.DEEPSEEK_MODEL,
        timeoutMs: env.DEEPSEEK_TIMEOUT_MS,
        enabled: Boolean(env.DEEPSEEK_API_KEY),
    },
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY,
    version: "2.5.0",
} as const;

export type AppConfig = typeof config;

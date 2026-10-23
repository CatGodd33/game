#!/usr/bin/env node
/**
 * Arranque de producción de LIFE DUEL.
 *
 * En Render no hay una fase de release separada en el plan gratuito, así que
 * este wrapper aplica las migraciones de Prisma (solo si PERSISTENCE=postgres)
 * y después arranca el servidor compilado. Es idempotente: `migrate deploy`
 * no vuelve a aplicar migraciones ya registradas.
 *
 * Para omitir las migraciones (por ejemplo, si se ejecutan en un job aparte)
 * define SKIP_MIGRATIONS=1.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

for (const envPath of [resolve(root, ".env"), resolve(root, "server/.env")]) {
    if (existsSync(envPath)) {
        dotenv.config({ path: envPath, quiet: true });
    }
}

const persistence = (process.env.PERSISTENCE ?? "json").trim().toLowerCase();
const skipMigrations = process.env.SKIP_MIGRATIONS === "1";

if (persistence === "postgres" && !skipMigrations) {
    if (!process.env.DATABASE_URL) {
        console.error("[start] PERSISTENCE=postgres requiere DATABASE_URL. Configúrala en Render o en .env.");
        process.exit(1);
    }

    const prismaBinary = resolve(
        root,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "prisma.cmd" : "prisma",
    );

    console.log("[start] Aplicando migraciones de Prisma...");
    try {
        if (existsSync(prismaBinary)) {
            execFileSync(prismaBinary, ["migrate", "deploy"], {
                cwd: root,
                stdio: "inherit",
                env: process.env,
            });
        } else {
            // Render instala las devDependencies para compilar, así que el CLI
            // de Prisma está disponible; este fallback cubre instalaciones
            // globales o layouts de npm distintos.
            execFileSync("npx", ["prisma", "migrate", "deploy"], {
                cwd: root,
                stdio: "inherit",
                env: process.env,
                shell: process.platform === "win32",
            });
        }
    } catch {
        const requireDatabase = process.env.REQUIRE_DATABASE === "1";
        console.error(
            "[start] No se pudieron aplicar las migraciones o conectar con PostgreSQL.",
        );
        if (requireDatabase) {
            console.error(
                "[start] REQUIRE_DATABASE=1: se detiene el arranque. Revisa DATABASE_URL y que la base esté activa.",
            );
            process.exit(1);
        }
        console.error(
            "[start] Se continúa en modo memoria: el modo individual funciona igual y las salas de duelo no sobrevivirán a un reinicio. Define REQUIRE_DATABASE=1 si prefieres fallar en este caso.",
        );
    }
}

const entryPoint = resolve(root, "server", "dist", "index.js");
if (!existsSync(entryPoint)) {
    console.error("[start] Falta server/dist/index.js. Ejecuta `npm run build` antes de arrancar.");
    process.exit(1);
}

await import(pathToFileURL(entryPoint).href);

import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createGameStore } from "./persistence/index.js";
import { GameService } from "./services/gameService.js";
import { NarrativeService } from "./services/narrativeService.js";
import { SessionService } from "./services/sessionService.js";
import { attachSocketServer } from "./sockets/index.js";

async function main(): Promise<void> {
    const store = await createGameStore();
    const gameService = new GameService(store);
    await gameService.init();
    const sessionService = new SessionService();
    const narrativeService = new NarrativeService(gameService);
    const app = createApp({ gameService, narrativeService, sessionService });
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: config.clientOrigins,
            methods: ["GET", "POST"],
        },
        serveClient: false,
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: false,
        },
    });
    attachSocketServer(io, gameService, sessionService);

    httpServer.listen(config.port, () => {
        logger.info("LIFE DUEL escuchando", {
            port: config.port,
            url: `http://localhost:${config.port}`,
            client: config.clientOrigin,
            persistence: config.persistence,
            ai: config.deepseek.enabled ? "deepseek" : "local",
        });
        if (config.sessionSecretSource === "file") {
            logger.warn("Sesiones firmadas con secreto local persistente; define SESSION_SECRET en producción.");
        } else if (config.sessionSecretSource === "ephemeral") {
            logger.warn("No se pudo persistir SESSION_SECRET: las sesiones se perderán al reiniciar.");
        }
    });

    httpServer.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
            logger.error(`El puerto ${config.port} ya está ocupado.`, { port: config.port });
        } else {
            logger.error("Error del servidor HTTP", { error: error.message });
        }
        process.exitCode = 1;
    });

    let closing = false;
    const shutdown = async (signal: string): Promise<void> => {
        if (closing) return;
        closing = true;
        logger.info("Cerrando servidor", { signal });
        await new Promise<void>((resolve) => {
            httpServer.close(() => resolve());
            setTimeout(resolve, 4000).unref();
        });
        await gameService.shutdown();
        io.close();
        process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
    logger.error("No se pudo arrancar LIFE DUEL", {
        error: error instanceof Error ? error.message : "desconocido",
    });
    process.exitCode = 1;
});

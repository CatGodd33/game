import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import { AppError } from "./errors.js";
import { createGameRouter } from "./routes/games.js";
import { createMetaRouter } from "./routes/meta.js";
import { createRoomRouter } from "./routes/rooms.js";
import { createSessionRouter } from "./routes/session.js";
import type { GameService } from "./services/gameService.js";
import type { NarrativeService } from "./services/narrativeService.js";
import type { SessionService } from "./services/sessionService.js";
import { errorHandler } from "./validation/http.js";
import { localeMiddleware } from "./i18n.js";

export interface AppDependencies {
    gameService: GameService;
    narrativeService: NarrativeService;
    sessionService: SessionService;
}

export function createApp(dependencies: AppDependencies): Express {
    const app = express();
    app.disable("x-powered-by");
    app.disable("etag");
    if (config.trustProxy > 0) app.set("trust proxy", config.trustProxy);

    app.use(
        helmet({
            contentSecurityPolicy: config.isProduction
                ? {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", "data:"],
                        fontSrc: ["'self'"],
                        connectSrc: ["'self'", "ws:", "wss:"],
                        objectSrc: ["'none'"],
                        frameAncestors: ["'none'"],
                        baseUri: ["'self'"],
                    },
                }
                : false,
            crossOriginEmbedderPolicy: false,
        }),
    );
    app.use(
        cors({
            origin(origin, callback) {
                if (!origin || config.clientOrigins.includes(origin)) {
                    callback(null, true);
                    return;
                }
                callback(new AppError(403, "CORS_FORBIDDEN", "Origen no permitido."));
            },
            methods: ["GET", "POST", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Locale"],
            credentials: false,
            maxAge: 3600,
        }),
    );
    app.use(express.json({ limit: "64kb" }));
    app.use("/api", localeMiddleware());

    app.use("/api", (_req, res, next) => {
        res.setHeader("Cache-Control", "no-store");
        next();
    });

    const limiter = rateLimit({
        windowMs: 60_000,
        // 10 peticiones/s por IP: holgado para dos jugadores tras un NAT,
        // suficiente para frenar abusos en una instancia gratuita.
        limit: config.isTest ? 10_000 : 600,
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => config.isTest,
        handler: (_req, res) => {
            res.status(429).json({
                error: { code: "RATE_LIMITED", message: "Demasiadas peticiones. Espera un momento." },
            });
        },
    });
    app.use("/api", limiter);

    app.get("/api/health", (_req, res) => {
        res.json({
            status: "ok",
            name: "LIFE DUEL",
            version: config.version,
            persistence: config.persistence,
            ai: config.deepseek.enabled ? "deepseek-configurado" : "local",
            time: new Date().toISOString(),
        });
    });

    app.use("/api", createSessionRouter(dependencies.sessionService));
    app.use("/api/meta", createMetaRouter());
    app.use(
        "/api/games",
        createGameRouter(
            dependencies.gameService,
            dependencies.narrativeService,
            dependencies.sessionService,
        ),
    );
    app.use(
        "/api/rooms",
        createRoomRouter(dependencies.gameService, dependencies.sessionService),
    );

    app.use("/api", (_req, res) => {
        res.status(404).json({
            error: { code: "NOT_FOUND", message: "Ruta de API no encontrada." },
        });
    });

    const indexFile = join(config.clientDist, "index.html");
    const clientAvailable = existsSync(indexFile);
    if (clientAvailable) {
        app.use(express.static(config.clientDist, { index: false, maxAge: "1h" }));
        app.use((req, res, next) => {
            if (req.method !== "GET" || req.path.startsWith("/api")) {
                next();
                return;
            }
            res.sendFile(indexFile);
        });
    } else {
        app.get("/", (_req, res) => {
            res.json({
                name: "LIFE DUEL API",
                version: config.version,
                message: "El cliente no está compilado. Usa Vite en desarrollo o ejecuta npm run build.",
                health: "/api/health",
            });
        });
    }

    app.use(errorHandler());

    return app;
}

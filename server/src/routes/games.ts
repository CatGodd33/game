import { Router } from "express";
import { z } from "zod";
import {
    createSoloSchema,
    gameIdParamSchema,
    narrativeSchema,
    pauseSchema,
    rematchSchema,
    setAutoSchema,
    setSpeedSchema,
    submitDecisionSchema,
} from "@life-duel/shared";
import type { GameService } from "../services/gameService.js";
import type { NarrativeService } from "../services/narrativeService.js";
import type { SessionService } from "../services/sessionService.js";
import { authFromRequest, authMiddleware } from "../validation/auth.js";
import {
    asyncHandler,
    getPathParam,
    validateBody,
    validateParams,
} from "../validation/http.js";

const idParams = z.object({ id: gameIdParamSchema });

export function createGameRouter(
    gameService: GameService,
    narrativeService: NarrativeService,
    sessionService: SessionService,
): Router {
    const router = Router();
    const auth = authMiddleware(sessionService);

    router.post(
        "/",
        auth,
        validateBody(createSoloSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const game = await gameService.createSolo(
                authData.playerId,
                req.body.alias ?? "Jugador",
                req.body.config,
            );
            res.status(201).json({ game });
        }),
    );

    router.get(
        "/",
        auth,
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            res.json({ games: await gameService.listMine(authData.playerId) });
        }),
    );

    router.get(
        "/:id",
        auth,
        validateParams(idParams),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            res.json({ game: await gameService.getGame(getPathParam(req, "id"), authData.playerId) });
        }),
    );

    router.post("/:id/monthly", auth, validateParams(idParams), asyncHandler(async (req, res) => { res.json({ game: await gameService.enableMonthly(getPathParam(req, "id"), authFromRequest(req).playerId) }); }));
    router.get("/:id/spending", auth, validateParams(idParams), asyncHandler(async (req, res) => {
        res.json(await gameService.spending(getPathParam(req, "id"), authFromRequest(req).playerId));
    }));
    router.post("/:id/spending", auth, validateParams(idParams), validateBody(z.object({ action: z.string().min(1).max(50), idempotencyKey: z.string().min(8).max(120), amount: z.number().finite().positive().max(1e12).optional(), quantity: z.number().int().min(1).max(100).optional(), name: z.string().trim().max(40).optional(), assetId: z.string().max(150).optional(), targetId: z.string().max(150).optional() })), asyncHandler(async (req, res) => {
        res.json(await gameService.purchase(getPathParam(req, "id"), authFromRequest(req).playerId, req.body));
    }));
    router.get("/:id/mobility", auth, validateParams(idParams), asyncHandler(async (req, res) => {
        res.json(await gameService.mobility(getPathParam(req, "id"), authFromRequest(req).playerId));
    }));
    router.post(
        "/:id/mobility",
        auth,
        validateParams(idParams),
        validateBody(
            z.object({
                optionId: z.string().min(3).max(80),
                familyMode: z.enum(["solo", "partner", "family"]),
                idempotencyKey: z.string().min(8).max(120),
            }),
        ),
        asyncHandler(async (req, res) => {
            res.json(await gameService.move(getPathParam(req, "id"), authFromRequest(req).playerId, req.body));
        }),
    );


    router.post(
        "/:id/funeral",
        auth,
        validateParams(idParams),
        validateBody(z.object({
            funeralId: z.string().min(3).max(180),
            choice: z.enum(["intima", "grande", "sin_ceremonia"]),
            idempotencyKey: z.string().min(8).max(120),
        })),
        asyncHandler(async (req, res) => {
            res.json(await gameService.funeral(getPathParam(req, "id"), authFromRequest(req).playerId, req.body));
        }),
    );

    router.post("/:id/advance", auth, validateParams(idParams), asyncHandler(async (req, res) => {
        res.json({ game: await gameService.advanceStory(getPathParam(req, "id"), authFromRequest(req).playerId) });
    }));
    router.post("/:id/focus", auth, validateParams(idParams), validateBody(z.object({ focus: z.enum(["balanced", "study", "relationships", "health", "work", "hobbies"]) })), asyncHandler(async (req, res) => {
        res.json({ game: await gameService.setFocus(getPathParam(req, "id"), authFromRequest(req).playerId, req.body.focus) });
    }));

    router.post(
        "/:id/decision",
        auth,
        validateParams(idParams),
        validateBody(submitDecisionSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const result = await gameService.submit(
                getPathParam(req, "id"),
                authData.playerId,
                req.body,
            );
            res.json(result);
        }),
    );

    router.post(
        "/:id/pause",
        auth,
        validateParams(idParams),
        validateBody(pauseSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const game = await gameService.setPaused(
                getPathParam(req, "id"),
                authData.playerId,
                req.body.paused,
            );
            res.json({ game });
        }),
    );

    router.post(
        "/:id/speed",
        auth,
        validateParams(idParams),
        validateBody(setSpeedSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const game = await gameService.setSpeed(
                getPathParam(req, "id"),
                authData.playerId,
                req.body.speed,
            );
            res.json({ game });
        }),
    );

    router.post(
        "/:id/auto",
        auth,
        validateParams(idParams),
        validateBody(setAutoSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const game = await gameService.setAuto(
                getPathParam(req, "id"),
                authData.playerId,
                req.body.enabled,
                req.body.decisionTimerSeconds,
            );
            res.json({ game });
        }),
    );

    router.post(
        "/:id/leave",
        auth,
        validateParams(idParams),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            await gameService.leave(getPathParam(req, "id"), authData.playerId);
            res.status(204).end();
        }),
    );

    router.get(
        "/:id/history",
        auth,
        validateParams(idParams),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            res.json(await gameService.history(getPathParam(req, "id"), authData.playerId));
        }),
    );

    router.get(
        "/:id/export",
        auth,
        validateParams(idParams),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const { fileName, data } = await gameService.exportGame(
                getPathParam(req, "id"),
                authData.playerId,
            );
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            res.setHeader("Cache-Control", "no-store");
            res.send(JSON.stringify(data, null, 2));
        }),
    );

    router.post(
        "/:id/narrative",
        auth,
        validateParams(idParams),
        validateBody(narrativeSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            res.json(await narrativeService.generate(getPathParam(req, "id"), authData.playerId));
        }),
    );

    router.post(
        "/:id/rematch",
        auth,
        validateParams(idParams),
        validateBody(rematchSchema),
        asyncHandler(async (req, res) => {
            const authData = authFromRequest(req);
            const record = await gameService.getRecord(getPathParam(req, "id"));
            if (!record) {
                res.status(404).json({ error: { code: "NOT_FOUND", message: "Partida no encontrada." } });
                return;
            }
            const lobby = await gameService.rematch(
                getPathParam(req, "id"),
                authData.playerId,
                req.body.config ?? record.config,
            );
            res.status(201).json({ lobby });
        }),
    );

    return router;
}

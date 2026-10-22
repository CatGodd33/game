import { Router } from "express";
import { z } from "zod";
import {
  createRoomSchema,
  joinRoomSchema,
  readySchema,
  roomCodeParamSchema,
  updateRoomConfigSchema,
} from "@life-duel/shared";
import type { GameService } from "../services/gameService.js";
import type { SessionService } from "../services/sessionService.js";
import { authFromRequest, authMiddleware } from "../validation/auth.js";
import {
  asyncHandler,
  getPathParam,
  validateBody,
  validateParams,
} from "../validation/http.js";

const codeParams = z.object({ code: roomCodeParamSchema });

export function createRoomRouter(
  gameService: GameService,
  sessionService: SessionService,
): Router {
  const router = Router();
  const auth = authMiddleware(sessionService);

  router.post(
    "/",
    auth,
    validateBody(createRoomSchema),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      const lobby = await gameService.createRoom(
        authData.playerId,
        req.body.alias,
        req.body.config,
      );
      res.status(201).json({ lobby });
    }),
  );

  router.get(
    "/:code",
    validateParams(codeParams),
    asyncHandler(async (req, res) => {
      res.json(await gameService.previewRoom(getPathParam(req, "code")));
    }),
  );

  router.post(
    "/join",
    auth,
    validateBody(joinRoomSchema),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      const lobby = await gameService.joinRoom(
        req.body.code,
        authData.playerId,
        req.body.alias,
      );
      res.json({ lobby });
    }),
  );

  router.get(
    "/:code/lobby",
    auth,
    validateParams(codeParams),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      res.json({ lobby: await gameService.getLobbyByCode(getPathParam(req, "code"), authData.playerId) });
    }),
  );

  router.patch(
    "/:code/config",
    auth,
    validateParams(codeParams),
    validateBody(updateRoomConfigSchema),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      const lobby = await gameService.updateRoomConfig(
        getPathParam(req, "code"),
        authData.playerId,
        req.body.config,
      );
      res.json({ lobby });
    }),
  );

  router.post(
    "/:code/ready",
    auth,
    validateParams(codeParams),
    validateBody(readySchema),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      const lobby = await gameService.setReady(
        getPathParam(req, "code"),
        authData.playerId,
        req.body.ready,
      );
      res.json({ lobby });
    }),
  );

  router.post(
    "/:code/start",
    auth,
    validateParams(codeParams),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      res.json({ game: await gameService.startRoom(getPathParam(req, "code"), authData.playerId) });
    }),
  );

  router.post(
    "/:code/leave",
    auth,
    validateParams(codeParams),
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      const record = await gameService.getRoomRecord(getPathParam(req, "code"));
      if (!record) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Sala no encontrada." } });
        return;
      }
      await gameService.leave(record.id, authData.playerId);
      res.status(204).end();
    }),
  );

  return router;
}

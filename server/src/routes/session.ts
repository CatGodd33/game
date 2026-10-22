import { Router } from "express";
import { sessionSchema } from "@life-duel/shared";
import type { SessionService } from "../services/sessionService.js";
import { authFromRequest, authMiddleware } from "../validation/auth.js";
import { asyncHandler, validateBody } from "../validation/http.js";

export function createSessionRouter(sessionService: SessionService): Router {
  const router = Router();
  const auth = authMiddleware(sessionService);

  router.post(
    "/session",
    validateBody(sessionSchema),
    asyncHandler(async (req, res) => {
      const session = sessionService.create(req.body.alias);
      res.status(201).json(session);
    }),
  );

  router.get(
    "/me",
    auth,
    asyncHandler(async (req, res) => {
      const authData = authFromRequest(req);
      res.json({
        playerId: authData.playerId,
        alias: authData.alias,
        expiresAt: new Date(authData.expiresAt * 1000).toISOString(),
      });
    }),
  );

  return router;
}

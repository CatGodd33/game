import { Router } from "express";
import { demographicsMeta } from "../demographics/dataset.js";
import { asyncHandler } from "../validation/http.js";

export function createMetaRouter(): Router {
  const router = Router();

  router.get(
    "/demographics",
    asyncHandler(async (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.json(demographicsMeta());
    }),
  );

  return router;
}

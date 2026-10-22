import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { AppError, Errors } from "../errors.js";

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      next(
        Errors.validation(
          "Los datos enviados no son válidos.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      next(Errors.validation("Parámetros no válidos.", parsed.error.issues));
      return;
    }
    req.params = parsed.data as Request["params"];
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(Errors.validation("Parámetros de consulta no válidos.", parsed.error.issues));
      return;
    }
    req.query = parsed.data as Request["query"];
    next();
  };
}

export function errorHandler() {
  return (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof AppError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
      return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }
    if ((error as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({
        error: { code: "INVALID_JSON", message: "El cuerpo de la petición no es JSON válido." },
      });
      return;
    }
    const maybeCode = (error as { code?: string }).code;
    if (maybeCode === "P2021" || maybeCode === "P1001" || maybeCode === "P1000") {
      res.status(503).json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "La base de datos no está disponible. Revisa la configuración de PostgreSQL.",
        },
      });
      return;
    }
    console.error("[error]", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Ha ocurrido un error interno." },
    });
  };
}

export function getPathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

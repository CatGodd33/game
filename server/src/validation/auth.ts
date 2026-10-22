import type { NextFunction, Request, Response } from "express";
import type { SessionService, SessionClaims } from "../services/sessionService.js";
import { Errors } from "../errors.js";

declare global {
  namespace Express {
    interface Request {
      auth?: SessionClaims;
    }
  }
}

export function authMiddleware(sessionService: SessionService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const token = sessionService.extractToken(req.headers.authorization);
      req.auth = sessionService.verify(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authFromRequest(req: Request): SessionClaims {
  if (!req.auth) throw Errors.unauthorized();
  return req.auth;
}

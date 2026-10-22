import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import type { AuthSession } from "@life-duel/shared";
import { config } from "../config.js";
import { Errors } from "../errors.js";

export interface SessionClaims {
  playerId: string;
  alias: string | null;
  issuedAt: number;
  expiresAt: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export class SessionService {
  create(alias?: string): AuthSession {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + TOKEN_TTL_SECONDS;
    const playerId = randomUUID();
    const payload = base64url(
      JSON.stringify({
        v: 1,
        pid: playerId,
        alias: alias ?? null,
        iat: issuedAt,
        exp: expiresAt,
      }),
    );
    return {
      playerId,
      token: `${payload}.${sign(payload)}`,
      alias: alias ?? null,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  verify(token: string | undefined | null): SessionClaims {
    if (!token || typeof token !== "string") throw Errors.unauthorized();
    const parts = token.split(".");
    if (parts.length !== 2) throw Errors.unauthorized("Sesión no válida.");
    const [payload, signature] = parts as [string, string];
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw Errors.unauthorized("Sesión no válida.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      throw Errors.unauthorized("Sesión no válida.");
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).pid !== "string" ||
      typeof (parsed as Record<string, unknown>).exp !== "number"
    ) {
      throw Errors.unauthorized("Sesión no válida.");
    }
    const record = parsed as {
      pid: string;
      alias?: unknown;
      iat?: unknown;
      exp: number;
    };
    if (record.exp * 1000 < Date.now()) {
      throw Errors.unauthorized("La sesión ha caducado. Inicia una nueva.");
    }
    return {
      playerId: record.pid,
      alias: typeof record.alias === "string" ? record.alias : null,
      issuedAt: typeof record.iat === "number" ? record.iat : 0,
      expiresAt: record.exp,
    };
  }

  extractToken(authorizationHeader: string | undefined, fallback?: string): string | null {
    if (authorizationHeader?.startsWith("Bearer ")) {
      return authorizationHeader.slice("Bearer ".length).trim();
    }
    return fallback ?? null;
  }
}

import type { AuthSession } from "@life-duel/shared";

const SESSION_KEY = "life-duel.session.v1";
const ALIAS_KEY = "life-duel.alias.v1";

let memoryToken: string | null = null;

export interface StoredSession {
  token: string;
  playerId: string;
  expiresAt: string | null;
}

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.token || !parsed.playerId) return null;
    memoryToken = parsed.token;
    return {
      token: parsed.token,
      playerId: parsed.playerId,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession): void {
  memoryToken = session.token;
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: session.token, playerId: session.playerId, expiresAt: session.expiresAt }),
  );
  if (session.alias) saveAlias(session.alias);
}

export function clearSession(): void {
  memoryToken = null;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  return loadSession()?.token ?? null;
}

export function saveAlias(alias: string): void {
  window.localStorage.setItem(ALIAS_KEY, alias);
}

export function loadAlias(): string {
  return window.localStorage.getItem(ALIAS_KEY) ?? "";
}

import { create } from "zustand";
import type { AuthSession } from "@life-duel/shared";
import { api } from "../../services/api";
import {
  clearSession,
  loadAlias,
  loadSession,
  persistSession,
  saveAlias,
} from "../../services/auth";
import { resetSocket } from "../../services/socket";

interface SessionState {
  token: string | null;
  playerId: string | null;
  expiresAt: string | null;
  lastAlias: string;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  ensureSession: (alias?: string) => Promise<void>;
  setAlias: (alias: string) => void;
  reset: () => void;
}

let ensurePromise: Promise<void> | null = null;
const stored = typeof window !== "undefined" ? loadSession() : null;

export const useSessionStore = create<SessionState>((set, get) => ({
  token: stored?.token ?? null,
  playerId: stored?.playerId ?? null,
  expiresAt: stored?.expiresAt ?? null,
  lastAlias: typeof window !== "undefined" ? loadAlias() : "",
  status: stored ? "ready" : "idle",
  error: null,

  ensureSession: async (alias?: string) => {
    if (alias) {
      saveAlias(alias);
      set({ lastAlias: alias });
    }
    if (get().token) {
      if (get().status !== "ready") set({ status: "ready" });
      return;
    }
    if (ensurePromise) return ensurePromise;
    set({ status: "loading", error: null });
    ensurePromise = (async () => {
      try {
        const session: AuthSession = await api.createSession(alias ?? get().lastAlias ?? undefined);
        persistSession(session);
        set({
          token: session.token,
          playerId: session.playerId,
          expiresAt: session.expiresAt,
          status: "ready",
          error: null,
        });
      } catch (error) {
        set({
          status: "error",
          error: error instanceof Error ? error.message : "No se pudo iniciar la sesión.",
        });
        throw error;
      } finally {
        ensurePromise = null;
      }
    })();
    return ensurePromise;
  },

  setAlias: (alias: string) => {
    saveAlias(alias);
    set({ lastAlias: alias });
  },

  reset: () => {
    clearSession();
    resetSocket();
    set({
      token: null,
      playerId: null,
      expiresAt: null,
      status: "idle",
      error: null,
    });
  },
}));

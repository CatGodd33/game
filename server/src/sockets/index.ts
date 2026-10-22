import type { Server, Socket } from "socket.io";
import { z } from "zod";
import {
  SOCKET_RATE_LIMIT_PER_MINUTE,
  submitDecisionSchema,
} from "@life-duel/shared";
import { config } from "../config.js";
import { AppError, isAppError } from "../errors.js";
import { logger } from "../logger.js";
import type { GameService } from "../services/gameService.js";
import type { SessionService } from "../services/sessionService.js";
import {
  getGameView,
  getLobbyView,
} from "../services/view.js";
import type { StoredGame } from "../types/records.js";

const subscribeSchema = z.object({
  gameId: z.string().uuid(),
});

const socketDecisionSchema = submitDecisionSchema.extend({
  gameId: z.string().uuid(),
});

type Ack = (payload: unknown) => void;

interface SocketData {
  playerId: string;
  alias: string | null;
  subscribed: Set<string>;
}

function roomName(gameId: string): string {
  return `game:${gameId}`;
}

function safeAck(ack: unknown): Ack {
  return typeof ack === "function" ? (ack as Ack) : () => undefined;
}

function errorPayload(error: unknown): { code: string; message: string } {
  if (isAppError(error)) return { code: error.code, message: error.message };
  return { code: "INTERNAL_ERROR", message: "No se pudo completar la acción." };
}

async function sendState(
  socket: Socket,
  gameService: GameService,
  game: StoredGame,
  playerId: string,
): Promise<void> {
  const connected = gameService.getConnectedSlots(game.id);
  if (game.status === "waiting" || game.status === "ready") {
    socket.emit("room:update", getLobbyView(game, playerId, connected));
    return;
  }
  socket.emit("game:update", getGameView(game, playerId, connected));
  // El lobby también se actualiza para que una pestaña en la sala detecte el inicio.
  socket.emit("room:update", getLobbyView(game, playerId, connected));
}

/**
 * Emite vistas personalizadas: la decisión pendiente del rival jamás se envía
 * a otro socket. No se utiliza broadcast con el mismo payload.
 */
async function broadcastGame(io: Server, gameService: GameService, gameId: string): Promise<void> {
  const game = await gameService.getRecord(gameId);
  if (!game) return;
  const sockets = await io.in(roomName(gameId)).fetchSockets();
  for (const remote of sockets) {
    const playerId = remote.data.playerId as string | undefined;
    if (!playerId) continue;
    if (!game.players.some((player) => player.playerId === playerId)) continue;
    const target = remote as unknown as Socket;
    try {
      await sendState(target, gameService, game, playerId);
    } catch (error) {
      logger.debug("No se pudo emitir el estado personalizado", {
        gameId,
        error: error instanceof Error ? error.message : "desconocido",
      });
    }
  }
}

export function attachSocketServer(
  io: Server,
  gameService: GameService,
  sessionService: SessionService,
): void {
  io.use((socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token;
      const token = typeof rawToken === "string" ? rawToken : null;
      const claims = sessionService.verify(token);
      socket.data.playerId = claims.playerId;
      socket.data.alias = claims.alias;
      socket.data.subscribed = new Set<string>();
      next();
    } catch {
      next(new Error("No autorizado."));
    }
  });

  io.on("connection", (socket) => {
    let windowStart = Date.now();
    let actionCount = 0;

    const allowAction = (): boolean => {
      const now = Date.now();
      if (now - windowStart > 60_000) {
        windowStart = now;
        actionCount = 0;
      }
      actionCount += 1;
      return actionCount <= SOCKET_RATE_LIMIT_PER_MINUTE;
    };

    const playerId = socket.data.playerId as string;
    const data = socket.data as SocketData;

    socket.on("game:subscribe", async (payload: unknown, ack?: unknown) => {
      const respond = safeAck(ack);
      if (!allowAction()) {
        socket.emit("app:error", {
          code: "RATE_LIMITED",
          message: "Demasiadas acciones. Espera un momento.",
        });
        respond({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = subscribeSchema.safeParse(payload);
      if (!parsed.success) {
        respond({ ok: false, code: "VALIDATION_ERROR" });
        return;
      }
      try {
        const game = await gameService.getGameRecordForMember(parsed.data.gameId, playerId);
        await socket.join(roomName(game.id));
        data.subscribed.add(game.id);
        gameService.addPresence(game.id, thisSlot(game, playerId), socket.id);
        await sendState(socket, gameService, game, playerId);
        respond({ ok: true });
      } catch (error) {
        socket.emit("app:error", errorPayload(error));
        respond({ ok: false, ...errorPayload(error) });
      }
    });

    socket.on("game:unsubscribe", async (payload: unknown) => {
      const parsed = subscribeSchema.safeParse(payload);
      if (!parsed.success) return;
      const game = await gameService.getRecord(parsed.data.gameId);
      if (!game) return;
      await socket.leave(roomName(game.id));
      data.subscribed.delete(game.id);
      const slot = game.players.find((player) => player.playerId === playerId)?.slot;
      if (slot) gameService.removePresence(game.id, slot, socket.id);
    });

    socket.on("game:decision", async (payload: unknown, ack?: unknown) => {
      const respond = safeAck(ack);
      if (!allowAction()) {
        socket.emit("app:error", {
          code: "RATE_LIMITED",
          message: "Demasiadas acciones. Espera un momento.",
        });
        respond({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = socketDecisionSchema.safeParse(payload);
      if (!parsed.success) {
        const validation = {
          code: "VALIDATION_ERROR",
          message: "La decisión enviada no es válida.",
        };
        socket.emit("app:error", validation);
        respond({ ok: false, ...validation });
        return;
      }
      try {
        const { gameId, ...decision } = parsed.data;
        const result = await gameService.submit(gameId, playerId, decision);
        respond({ ok: true, result });
      } catch (error) {
        const payloadError = errorPayload(error);
        socket.emit("app:error", payloadError);
        respond({ ok: false, ...payloadError });
      }
    });

    socket.on("room:subscribe", async (payload: unknown, ack?: unknown) => {
      const respond = safeAck(ack);
      if (!allowAction()) {
        respond({ ok: false, code: "RATE_LIMITED" });
        return;
      }
      const parsed = subscribeSchema.safeParse(payload);
      if (!parsed.success) {
        respond({ ok: false, code: "VALIDATION_ERROR" });
        return;
      }
      try {
        const game = await gameService.getGameRecordForMember(parsed.data.gameId, playerId);
        await socket.join(roomName(game.id));
        data.subscribed.add(game.id);
        gameService.addPresence(game.id, thisSlot(game, playerId), socket.id);
        await sendState(socket, gameService, game, playerId);
        respond({ ok: true });
      } catch (error) {
        respond({ ok: false, ...errorPayload(error) });
      }
    });

    socket.on("disconnect", async () => {
      for (const gameId of data.subscribed) {
        const game = await gameService.getRecord(gameId);
        const slot = game?.players.find((player) => player.playerId === playerId)?.slot;
        if (slot) gameService.removePresence(gameId, slot, socket.id);
        await gameService.touchSeen(gameId, playerId).catch(() => undefined);
      }
      data.subscribed.clear();
    });
  });

  gameService.events.on("game:changed", ({ gameId }: { gameId: string }) => {
    void broadcastGame(io, gameService, gameId);
  });
  gameService.events.on("room:changed", ({ gameId }: { gameId: string }) => {
    void broadcastGame(io, gameService, gameId);
  });
  gameService.events.on(
    "rematch:created",
    ({ oldGameId, gameId, code }: { oldGameId: string; gameId: string; code: string }) => {
      io.to(roomName(oldGameId)).emit("rematch:created", { gameId, code });
    },
  );

  logger.info("Socket.IO conectado.", { origins: config.clientOrigins });
}

function thisSlot(game: StoredGame, playerId: string) {
  const player = game.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new AppError(403, "FORBIDDEN", "No participas en esta partida.");
  return player.slot;
}

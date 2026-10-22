import { createServer, type Server as HttpServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { io as connectClient, type Socket as ClientSocket } from "socket.io-client";
import { Server as SocketServer } from "socket.io";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameView, PlayerSlot } from "@life-duel/shared";
import { attachSocketServer } from "../server/src/sockets/index.js";
import { GameService } from "../server/src/services/gameService.js";
import { SessionService } from "../server/src/services/sessionService.js";
import type { StoredGame } from "../server/src/types/records.js";
import { MemoryGameStore, TEST_CONFIG } from "./helpers.js";

function nextGame(socket: ClientSocket, timeoutMs = 4000): Promise<GameView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No llegó game:update")), timeoutMs);
    socket.once("game:update", (view: GameView) => {
      clearTimeout(timer);
      resolve(view);
    });
  });
}

function connect(url: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = connectClient(url, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
      timeout: 3000,
    });
    const timer = setTimeout(() => reject(new Error("No se pudo conectar el socket")), 4000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function subscribe(socket: ClientSocket, gameId: string, timeoutMs = 4000): Promise<GameView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No se pudo suscribir al juego")), timeoutMs);
    const onUpdate = (view: GameView) => {
      clearTimeout(timer);
      resolve(view);
    };
    socket.once("game:update", onUpdate);
    socket.emit(
      "game:subscribe",
      { gameId },
      (ack?: { ok?: boolean; message?: string }) => {
        if (!ack?.ok) {
          clearTimeout(timer);
          socket.off("game:update", onUpdate);
          reject(new Error(ack?.message ?? "Suscripción rechazada"));
        }
      },
    );
  });
}

function emitAck<T>(
  socket: ClientSocket,
  event: string,
  payload: unknown,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Sin respuesta a ${event}`)), timeoutMs);
    socket.emit(event, payload, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Condición no alcanzada a tiempo");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function decisionFor(game: StoredGame, slot: PlayerSlot, index = 0) {
  const prompt = game.pending?.prompts[slot];
  const option = prompt?.options[index];
  if (!prompt || !option) throw new Error(`Sin prompt para el jugador ${slot}`);
  return {
    turn: game.pending!.turn,
    decisionId: prompt.id,
    optionId: option.id,
    idempotencyKey: `socket-${slot}-${prompt.id}-${randomUUID()}`,
  };
}

describe("sincronización Socket.IO del duelo", () => {
  let httpServer: HttpServer;
  let io: SocketServer;
  let service: GameService;
  let sessions: SessionService;
  let url: string;
  let gameId: string;
  let hostToken: string;
  let guestToken: string;
  let hostSocket: ClientSocket;
  let guestSocket: ClientSocket;
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    const store = new MemoryGameStore();
    service = new GameService(store);
    sessions = new SessionService();
    await service.init();

    const host = sessions.create("Host");
    const guest = sessions.create("Guest");
    hostToken = host.token;
    guestToken = guest.token;
    const room = await service.createRoom(host.playerId, "Host", TEST_CONFIG);
    await service.joinRoom(room.code, guest.playerId, "Guest");
    await service.setReady(room.code, host.playerId, true);
    await service.setReady(room.code, guest.playerId, true);
    const view = await service.startRoom(room.code, host.playerId);
    gameId = view.id;

    httpServer = createServer();
    io = new SocketServer(httpServer, { cors: { origin: true } });
    attachSocketServer(io, service, sessions);
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;

    hostSocket = await connect(url, hostToken);
    guestSocket = await connect(url, guestToken);
    sockets.push(hostSocket, guestSocket);
  });

  afterAll(async () => {
    for (const socket of sockets) socket.close();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    httpServer.closeAllConnections?.();
    await service.shutdown();
  });

  it("rechaza sockets sin sesión válida", async () => {
    const anonymous = connectClient(url, { transports: ["websocket"], reconnection: false });
    const error = await new Promise<Error>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("El socket anónimo no fue rechazado")), 3000);
      anonymous.once("connect_error", (reason) => {
        clearTimeout(timer);
        resolve(reason);
      });
    });
    expect(error.message).toBe("No autorizado.");
    anonymous.close();
  });

  it("entrega vistas privadas, resuelve decisiones y recupera la reconexión", async () => {
    const hostView = await subscribe(hostSocket, gameId);
    const guestView = await subscribe(guestSocket, gameId);
    expect(hostView.world.birth).toEqual(guestView.world.birth);
    await waitFor(() => service.getConnectedSlots(gameId).size === 2);
    expect([...service.getConnectedSlots(gameId)].sort()).toEqual([1, 2]);

    const before = await service.getRecord(gameId);
    const hostDecision = decisionFor(before!, 1, 0);
    const guestUpdatePromise = nextGame(guestSocket);
    const hostAck = await emitAck<{ ok: boolean }>(hostSocket, "game:decision", {
      gameId,
      ...hostDecision,
    });
    expect(hostAck.ok).toBe(true);

    const privateView = await guestUpdatePromise;
    expect(privateView.opponent?.hasSubmitted).toBe(true);
    expect(privateView.opponent?.ownChoice).toBeNull();

    const guestDecision = decisionFor(
      (await service.getRecord(gameId))!,
      2,
      (await service.getRecord(gameId))!.pending!.prompts[2]!.options.length > 1 ? 1 : 0,
    );
    const hostUpdatePromise = nextGame(hostSocket);
    const guestAck = await emitAck<{ ok: boolean; result?: { turnResolved: boolean } }>(
      guestSocket,
      "game:decision",
      { gameId, ...guestDecision },
    );
    expect(guestAck.ok).toBe(true);
    expect(guestAck.result?.turnResolved).toBe(true);
    const resolvedView = await hostUpdatePromise;
    expect(resolvedView.turn.number).toBe(1);

    const invalid = await emitAck<{ ok: boolean; code?: string }>(
      guestSocket,
      "game:decision",
      { gameId, turn: -1, decisionId: "x", optionId: "y", idempotencyKey: "clave-invalida" },
    );
    expect(invalid.ok).toBe(false);
    expect(invalid.code).toBe("VALIDATION_ERROR");

    guestSocket.disconnect();
    await waitFor(() => !service.getConnectedSlots(gameId).has(2));
    const reconnected = await connect(url, guestToken);
    sockets.push(reconnected);
    const reconnectedView = await subscribe(reconnected, gameId);
    expect(reconnectedView.id).toBe(gameId);
    await waitFor(() => service.getConnectedSlots(gameId).size === 2);

    const current = (await service.getRecord(gameId))!;
    const duplicateDecision = decisionFor(current, 2, 0);
    const first = await emitAck<{ ok: boolean; result?: { duplicate: boolean } }>(
      reconnected,
      "game:decision",
      { gameId, ...duplicateDecision },
    );
    const second = await emitAck<{ ok: boolean; result?: { duplicate: boolean } }>(
      reconnected,
      "game:decision",
      { gameId, ...duplicateDecision },
    );
    expect(first.ok).toBe(true);
    expect(first.result?.duplicate).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.result?.duplicate).toBe(true);

    const hostCurrent = (await service.getRecord(gameId))!;
    const hostFinish = decisionFor(hostCurrent, 1, 0);
    const finishAck = await emitAck<{ ok: boolean }>(hostSocket, "game:decision", {
      gameId,
      ...hostFinish,
    });
    expect(finishAck.ok).toBe(true);
  });
});

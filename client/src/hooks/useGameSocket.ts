import { useEffect, useRef, useState } from "react";
import type { GameView, LobbyView, PlayerSlot } from "@life-duel/shared";
import { getSocket } from "../services/socket";
import { useSessionStore } from "../features/session/sessionStore";
import { safeErrorMessage } from "../lib/utils";

export type SocketState = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

interface UseGameSocketOptions {
  gameId: string | null | undefined;
  onGame?: (game: GameView) => void;
  onRoom?: (lobby: LobbyView) => void;
  onError?: (message: string) => void;
  onRematch?: (payload: { gameId: string; code: string }) => void;
}

/**
 * Suscripción autenticada a una partida. El servidor envía una vista distinta
 * a cada socket: la decisión pendiente del rival nunca viaja al navegador.
 */
export function useGameSocket({
  gameId,
  onGame,
  onRoom,
  onError,
  onRematch,
}: UseGameSocketOptions): SocketState {
  const token = useSessionStore((state) => state.token);
  const [state, setState] = useState<SocketState>("idle");
  const gameRef = useRef(onGame);
  const roomRef = useRef(onRoom);
  const errorRef = useRef(onError);
  const rematchRef = useRef(onRematch);

  useEffect(() => {
    gameRef.current = onGame;
    roomRef.current = onRoom;
    errorRef.current = onError;
    rematchRef.current = onRematch;
  }, [onGame, onRoom, onError, onRematch]);

  useEffect(() => {
    if (!gameId || !token) {
      setState("idle");
      return;
    }

    let socket;
    try {
      socket = getSocket();
    } catch (error) {
      errorRef.current?.(safeErrorMessage(error));
      setState("offline");
      return;
    }

    setState(socket.connected ? "connected" : "connecting");

    const subscribe = () => {
      socket?.emit("game:subscribe", { gameId }, (ack?: { ok?: boolean; message?: string }) => {
        if (ack && ack.ok === false) {
          errorRef.current?.(ack.message ?? "No se pudo sincronizar la partida.");
        }
      });
    };

    const onConnect = () => {
      setState("connected");
      subscribe();
    };
    const onDisconnect = (reason: string) => {
      setState(reason === "io client disconnect" ? "offline" : "reconnecting");
    };
    const onConnectError = () => {
      setState("reconnecting");
    };
    const onGameUpdate = (game: GameView) => {
      if (game.id !== gameId) return;
      setState("connected");
      gameRef.current?.(game);
    };
    const onRoomUpdate = (lobby: LobbyView) => {
      if (lobby.id !== gameId) return;
      roomRef.current?.(lobby);
    };
    const onAppError = (payload: { message?: string }) => {
      errorRef.current?.(payload.message ?? "La partida rechazó la última acción.");
    };
    const onRematchCreated = (payload: { gameId: string; code: string }) => {
      if (!payload?.gameId || !payload.code) return;
      rematchRef.current?.(payload);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("game:update", onGameUpdate);
    socket.on("room:update", onRoomUpdate);
    socket.on("app:error", onAppError);
    socket.on("rematch:created", onRematchCreated);

    if (socket.connected) subscribe();
    else socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("game:update", onGameUpdate);
      socket.off("room:update", onRoomUpdate);
      socket.off("app:error", onAppError);
      socket.off("rematch:created", onRematchCreated);
      if (socket.connected) socket.emit("game:unsubscribe", { gameId });
    };
  }, [gameId, token]);

  return state;
}

export function connectionLabel(state: SocketState): string {
  switch (state) {
    case "connected":
      return "En tiempo real";
    case "connecting":
      return "Conectando";
    case "reconnecting":
      return "Reconectando";
    case "offline":
      return "Sin conexión";
    default:
      return "Local";
  }
}

export function useCountdown(deadlineAt: string | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineAt) {
      setRemaining(null);
      return;
    }
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);

  return remaining;
}

export function slotLabel(slot: PlayerSlot): string {
  return `Jugador ${slot}`;
}

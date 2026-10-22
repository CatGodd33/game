import { io, type Socket } from "socket.io-client";
import { getToken } from "./auth";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(): Socket {
  const token = getToken();
  if (!token) throw new Error("No hay una sesión activa.");
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 700,
    reconnectionDelayMax: 5000,
    timeout: 8000,
    autoConnect: true,
  });
  return socket;
}

export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

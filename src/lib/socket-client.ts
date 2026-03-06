"use client";

import { io, Socket } from "socket.io-client";
import { authClient } from "./auth-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const session = await authClient.getSession();
  const token = session?.data?.session?.token;
  if (!token) {
    throw new Error("No active session");
  }

  socket = io({
    path: "/api/socketio",
    auth: { token },
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

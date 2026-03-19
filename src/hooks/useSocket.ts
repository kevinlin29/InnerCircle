"use client";

import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket-client";

interface SocketNotification {
  id: string;
  type: string;
  message: string;
  referenceId?: string | null;
  createdAt: string;
}

interface UseSocketOptions {
  onNotification?: (notification: SocketNotification) => void;
  onNewPost?: () => void;
}

/**
 * Manages Socket.io connection lifecycle for authenticated pages.
 * Automatically connects on mount and disconnects on unmount.
 */
export function useSocket({ onNotification, onNewPost }: UseSocketOptions = {}) {
  const callbacksRef = useRef({ onNotification, onNewPost });
  callbacksRef.current = { onNotification, onNewPost };

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const socket = await connectSocket();
        if (!mounted) return;

        socket.on("notification:new", (data: SocketNotification) => {
          callbacksRef.current.onNotification?.(data);

          if (data.type === "NEW_POST") {
            callbacksRef.current.onNewPost?.();
          }
        });
      } catch {
        // Session may not be ready yet — silently ignore
      }
    }

    init();

    return () => {
      mounted = false;
      const socket = getSocket();
      if (socket) {
        socket.off("notification:new");
      }
      disconnectSocket();
    };
  }, []);
}

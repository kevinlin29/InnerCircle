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

export interface PostUpdateEvent {
  postId: string;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  actorId?: string;
}

interface UseSocketOptions {
  onNotification?: (notification: SocketNotification) => void;
  onNewPost?: () => void;
  onPostUpdate?: (data: PostUpdateEvent) => void;
}

/**
 * Manages Socket.io connection lifecycle for authenticated pages.
 * Automatically connects on mount and disconnects on unmount.
 */
export function useSocket({ onNotification, onNewPost, onPostUpdate }: UseSocketOptions = {}) {
  const callbacksRef = useRef({ onNotification, onNewPost, onPostUpdate });
  callbacksRef.current = { onNotification, onNewPost, onPostUpdate };

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

        socket.on("post:updated", (data: PostUpdateEvent) => {
          callbacksRef.current.onPostUpdate?.(data);
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
        socket.off("post:updated");
      }
      disconnectSocket();
    };
  }, []);
}

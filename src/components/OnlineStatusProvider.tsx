"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { connectSocket, getSocket } from "@/lib/socket-client";

interface OnlineStatusContextValue {
  onlineUserIds: Set<string>;
  isOnline: (userId: string) => boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextValue>({
  onlineUserIds: new Set(),
  isOnline: () => false,
});

export function useOnlineStatus() {
  return useContext(OnlineStatusContext);
}

export default function OnlineStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const socket = await connectSocket();
        if (!mounted) return;

        socket.on("user:online", (data: { userId: string }) => {
          setOnlineUserIds((prev) => new Set(prev).add(data.userId));
        });

        socket.on("user:offline", (data: { userId: string }) => {
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
        });
      } catch {
        // socket failed
      }
    }

    setup();

    return () => {
      mounted = false;
      const socket = getSocket();
      socket?.off("user:online");
      socket?.off("user:offline");
    };
  }, []);

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  return (
    <OnlineStatusContext.Provider value={{ onlineUserIds, isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

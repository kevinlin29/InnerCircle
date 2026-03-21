"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  FileText,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { connectSocket, getSocket } from "@/lib/socket-client";
import type { NotificationItem, NotificationType } from "@/types/api";

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Heart; href: (refId: string | null) => string }
> = {
  LIKE: { icon: Heart, href: () => "/home" },
  COMMENT: { icon: MessageCircle, href: () => "/home" },
  FRIEND_REQUEST: { icon: UserPlus, href: () => "/friends" },
  FRIEND_ACCEPT: { icon: UserCheck, href: () => "/friends" },
  NEW_POST: { icon: FileText, href: () => "/home" },
  MESSAGE: {
    icon: MessageCircle,
    href: () => "/chat",
  },
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // error
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for real-time notifications
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const socket = await connectSocket();
        if (!mounted) return;

        socket.on("notification:new", (notification: NotificationItem) => {
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((c) => c + 1);
        });
      } catch {
        // socket failed
      }
    }

    setup();

    return () => {
      mounted = false;
      const socket = getSocket();
      socket?.off("notification:new");
    };
  }, []);

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch {
      // error
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={markAllRead}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            notifications.map((n) => {
              const config = TYPE_CONFIG[n.type];
              const Icon = config?.icon ?? Bell;
              const href = config?.href(n.referenceId) ?? "/home";

              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent ${
                    !n.read ? "bg-accent/30" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

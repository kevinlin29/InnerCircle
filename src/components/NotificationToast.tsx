"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X } from "lucide-react";

interface ToastItem {
  id: string;
  message: string;
  type: string;
  referenceId?: string | null;
  createdAt: string;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((notification: ToastItem) => {
    setToasts((prev) => [...prev, notification]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== notification.id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClick = useCallback((toast: ToastItem) => {
    const postTypes = ["LIKE", "COMMENT", "NEW_POST"];
    if (toast.referenceId && postTypes.includes(toast.type)) {
      const openPost = (window as unknown as Record<string, unknown>)
        .__openPost as ((postId: string) => void) | undefined;
      openPost?.(toast.referenceId);
    }
    removeToast(toast.id);
  }, [removeToast]);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__addToast = addToast;
    return () => {
      delete (window as unknown as Record<string, unknown>).__addToast;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-2 rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right cursor-pointer transition-colors hover:bg-background"
          onClick={() => handleClick(toast)}
        >
          <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm">{toast.message}</p>
            {toast.referenceId && ["LIKE", "COMMENT", "NEW_POST"].includes(toast.type) && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">Click to view</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = String(++nextId);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const value: ToastContextValue = {
    toast: add,
    success: useCallback((msg: string) => add(msg, "success"), [add]),
    error: useCallback((msg: string) => add(msg, "error"), [add]),
    info: useCallback((msg: string) => add(msg, "info"), [add]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "bg-popover text-popover-foreground border-border",
  success: "bg-emerald-950 text-emerald-100 border-emerald-800",
  error: "bg-red-950 text-red-100 border-red-800",
  info: "bg-blue-950 text-blue-100 border-blue-800",
};

const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle | null> = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const Icon = VARIANT_ICONS[toast.variant];

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 min-w-[240px] max-w-sm",
        VARIANT_STYLES[toast.variant],
        show ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-sm opacity-60 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["g", "h"], label: "Go to home feed" },
  { keys: ["g", "f"], label: "Go to friends" },
  { keys: ["g", "c"], label: "Go to chat" },
  { keys: ["g", "p"], label: "Go to profile" },
  { keys: ["g", "m"], label: "Go to globe map" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
] as const;

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (e.key === "g" && !pendingG) {
        setPendingG(true);
        setTimeout(() => setPendingG(false), 800);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        switch (e.key) {
          case "h": router.push("/home"); break;
          case "f": router.push("/friends"); break;
          case "c": router.push("/chat"); break;
          case "p": router.push("/profile"); break;
          case "m": router.push("/feed"); break;
        }
      }
    },
    [pendingG, router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Press these key combinations to navigate quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {SHORTCUTS.map(({ keys, label }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

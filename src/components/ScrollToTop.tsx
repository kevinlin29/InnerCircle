"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollToTopProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function ScrollToTop({ containerRef }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onScroll() {
      setVisible((el?.scrollTop ?? 0) > 400);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  if (!visible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-full shadow-lg opacity-90 hover:opacity-100"
      onClick={() =>
        containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      }
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}

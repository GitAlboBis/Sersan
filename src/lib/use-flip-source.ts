"use client";

import { useCallback } from "react";
import { armFlip } from "@/lib/flip-handoff-store";

/**
 * useFlipSource — returns an onClick that PASSIVELY arms the Flip handoff store
 * with the clicked card's rect + image src. It NEVER calls preventDefault: the
 * <Link> navigates exactly as normal (a prior attempt that intercepted the
 * click + router.push caused a navigate-to-home bug; this design avoids that).
 *
 * Arms only on a plain same-tab left click; modified clicks (cmd/ctrl/shift/alt,
 * non-primary buttons) open normally without a flight, and reduced-motion /
 * coarse (touch) pointers opt out entirely → the detail figure plays its normal
 * (or RM) entrance.
 */
export function useFlipSource(slug: string, src?: string) {
  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!src || typeof window === "undefined") return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return; // let modified clicks open normally
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(pointer: coarse)").matches) return; // touch → no flip
      const r = e.currentTarget.getBoundingClientRect();
      armFlip({
        slug,
        src,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        armedAt: Date.now(),
      });
      // NB: NO preventDefault — <Link> navigates as normal.
    },
    [slug, src],
  );
}

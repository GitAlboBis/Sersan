"use client";

import { useCallback } from "react";
import { armFlip } from "@/lib/flip-handoff-store";

/**
 * useFlipSource — returns an onClick that PASSIVELY arms the flip-handoff
 * store with the clicked card's rect (+ image src and border-radius when
 * available). It NEVER calls preventDefault: the <Link> navigates exactly as
 * normal (a prior attempt that intercepted the click + router.push caused a
 * navigate-to-home bug; this design avoids that). The persistent overlay
 * reacts to the arm and inflates the zoom-to-fullscreen clone WHILE the
 * native navigation proceeds beneath it.
 *
 * Every work card arms (src is optional): cards with a preview image inflate
 * their shot and land on the detail hero; the rest inflate as a navy panel
 * and cross-fade out over the detail header.
 *
 * Arms only on a plain same-tab left click; modified clicks (cmd/ctrl/shift/
 * alt, non-primary buttons) open normally without a flight, and reduced-motion
 * / coarse (touch) pointers opt out entirely → plain navigation with the
 * standard curtain, and the detail figure plays its normal (or RM) entrance.
 */
export function useFlipSource(slug: string, src?: string) {
  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (typeof window === "undefined") return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return; // let modified clicks open normally
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(pointer: coarse)").matches) return; // touch → no flip
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      armFlip({
        slug,
        src,
        radius: window.getComputedStyle(el).borderRadius || undefined,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        armedAt: Date.now(),
      });
      // NB: NO preventDefault — <Link> navigates as normal.
    },
    [slug, src],
  );
}

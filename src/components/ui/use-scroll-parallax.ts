"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * useScrollParallax — a TINY scroll-linked Y drift for below-the-hero
 * sections (P2). Returns a ref to attach to the element you want to parallax.
 *
 * Reuses the cinematic-spine pattern: a single ScrollTrigger whose `onUpdate`
 * reads its own normalized progress and writes the translate with `gsap.set`
 * (no tween). It uses `start`/`end` only — NO pin, NO scrub-tween, so it never
 * changes `document.scrollHeight` and never shifts the WebGL line's anchor
 * fractions (P2 hard constraint).
 *
 * The drift is intentionally small (default ±4px) so it reads as a subtle
 * layer-separation, not motion sickness. As the element travels through the
 * viewport, progress goes 0→1 and Y maps from +amp → -amp.
 *
 * Reduced-motion: the effect bails entirely (element stays at y:0).
 *
 * @param amplitude  peak Y offset in px (the element moves from +amp to -amp).
 */
export function useScrollParallax<T extends HTMLElement>(amplitude = 4) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      // gsap.set in onUpdate only — no tween, no pin, no scrub.
      onUpdate: (self) => {
        const y = (0.5 - self.progress) * 2 * amplitude;
        gsap.set(el, { y });
      },
    });

    return () => {
      st.kill();
      gsap.set(el, { y: 0 });
    };
  }, [amplitude]);

  return ref;
}

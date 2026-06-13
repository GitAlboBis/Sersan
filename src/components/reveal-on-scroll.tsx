"use client";

import { createElement, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

interface RevealOnScrollProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  as?: "div" | "section" | "article";
  className?: string;
}

/**
 * Small client utility that fades + slides children up when ~30% of the
 * element is in the viewport. Honors `prefers-reduced-motion` by rendering
 * the static element with no animation.
 *
 * Mechanism mirrors `ui/reveal.tsx`: a ref + IntersectionObserver (fires once
 * when the element is ~30% in view — `threshold: 0.3` reproduces the previous
 * framer `viewport={{ once: true, amount: 0.3 }}`) drives a one-shot
 * `gsap.set` → `gsap.to`. The entrance ease is `expo.out`, the GSAP analogue of
 * the `[0.16, 1, 0.3, 1]` cubic-bezier the framer version used (and of
 * `--ease-entrance` in globals.css), so reveals share one feel across the app.
 *
 * UNIT CONTRACT: `delay` is in SECONDS (the framer `transition={{ delay }}` was
 * seconds), so it is passed to GSAP `delay:` AS-IS. This is deliberately unlike
 * `ui/reveal.tsx`, whose `Reveal` takes ms and divides by 1000 — the ~40
 * consumers of RevealOnScroll rely on the seconds contract, so it is preserved.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  y = 24,
  duration = 0.6,
  as = "div",
  className,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Static element, no animation — same as the previous framer behavior
      // (which short-circuited to the plain tag under reduced motion).
      gsap.set(el, { opacity: 1, y: 0 });
      playedRef.current = true;
      return;
    }

    gsap.set(el, { opacity: 0, y });

    const play = () => {
      if (playedRef.current) return;
      playedRef.current = true;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration,
        // delay is SECONDS by contract — pass through unchanged.
        delay,
        ease: "expo.out",
      });
    };

    // IntersectionObserver (not ScrollTrigger): fires when intersecting at
    // observe time too, so SPA-navigated content that mounts already in view
    // still reveals. threshold 0.3 == the old framer `amount: 0.3`, `once`.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);

    return () => io.disconnect();
  }, [delay, y, duration]);

  return createElement(
    as,
    { ref, className, style: { opacity: 0 } },
    children,
  );
}

export default RevealOnScroll;

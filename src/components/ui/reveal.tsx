"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Optional directional entrance. Default ("up") reproduces today's exact
 * vertical fade/construct/rise — only the new opt-in values shift the axis.
 *   - "up"     (default): rises from below (current behavior)
 *   - "left"   : slides in from the left
 *   - "right"  : slides in from the right
 *   - "bottom" : alias of "up" (explicit, for wave configs)
 */
type RevealFrom = "up" | "left" | "right" | "bottom";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  variant?: "fade" | "construct" | "rise";
  /** Entrance direction. Default "up" = today's vertical reveal (unchanged). */
  from?: RevealFrom;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
}

export function Reveal({
  children,
  delay = 0,
  variant = "fade",
  from = "up",
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;
    playedRef.current = true;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(el, { opacity: 1, x: 0, y: 0, clipPath: "inset(0%)" });
      return;
    }

    // Vertical magnitude preserves today's behavior exactly: rise=40, else 24.
    const yMag = variant === "rise" ? 40 : 24;
    // Horizontal magnitude for the opt-in left/right wave directions.
    const xMag = 36;

    const initial: gsap.TweenVars = { opacity: 0 };
    if (from === "left") {
      initial.x = -xMag;
      initial.y = 0;
    } else if (from === "right") {
      initial.x = xMag;
      initial.y = 0;
    } else {
      // "up" / "bottom" — identical to the original vertical reveal.
      initial.y = yMag;
    }
    if (variant === "construct") {
      initial.clipPath = "inset(0% 100% 0% 0%)";
    }
    gsap.set(el, initial);

    const st = ScrollTrigger.create({
      trigger: el,
      // Fire a touch earlier so the reveal has room to breathe before the
      // element is fully on screen (was "top 88%" — too late, near exit).
      start: "top 82%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          clipPath: "inset(0%)",
          duration: 0.85,
          ease: "expo.out",
          delay: delay / 1000,
        });
      },
    });

    return () => st.kill();
  }, [delay, variant, from]);

  return (
    // @ts-expect-error — Tag is a union of HTML tag names
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

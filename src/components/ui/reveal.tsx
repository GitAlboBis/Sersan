"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

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

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(el, { opacity: 1, x: 0, y: 0, clipPath: "inset(0%)" });
      playedRef.current = true;
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

    const play = () => {
      if (playedRef.current) return;
      playedRef.current = true;
      gsap.to(el, {
        opacity: 1,
        x: 0,
        y: 0,
        clipPath: "inset(0%)",
        duration: 0.85,
        ease: "expo.out",
        delay: delay / 1000,
      });
    };

    // Trigger via IntersectionObserver rather than GSAP ScrollTrigger. IO
    // fires its callback when the element is intersecting AT OBSERVE TIME —
    // including immediately after a client-side (SPA) navigation, where the
    // element mounts already in view. A ScrollTrigger created already-in-view
    // does NOT fire its onEnter (and the root ScrollTrigger.refresh() only runs
    // once, at first load), which left SPA-navigated content stuck at
    // opacity:0 until a hard refresh. The -18% bottom rootMargin reproduces the
    // old "top 82%" start point (reveal once the top crosses 82% of the view).
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
      { rootMargin: "0px 0px -18% 0px", threshold: 0 },
    );
    io.observe(el);

    return () => io.disconnect();
  }, [delay, variant, from]);

  return (
    // @ts-expect-error — Tag is a union of HTML tag names
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

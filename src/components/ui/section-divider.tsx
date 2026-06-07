"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * SectionDivider — the thin centred rule (with accent dot) between homepage
 * sections, extracted out of page.tsx (P2) so it can animate while keeping
 * page.tsx a Server Component.
 *
 * The inner rule draws from center outward: it starts collapsed
 * (`scaleX: 0`, transform-origin center) and tweens to full width on
 * scroll-enter via a `gsap.set` inside a batched ScrollTrigger `onEnter`.
 * This adds NO pin and NO scrub — it never changes document.scrollHeight, so
 * the WebGL signature line's anchor fractions stay glued.
 *
 * Reduced-motion: the rule is shown at its final state immediately and no
 * trigger is created.
 */
export function SectionDivider() {
  const ruleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ruleRef.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Final state immediately — no motion, no trigger.
      gsap.set(el, { scaleX: 1 });
      return;
    }

    gsap.set(el, { scaleX: 0, transformOrigin: "center center" });

    const st = ScrollTrigger.create({
      trigger: el,
      // Same "enter" threshold family as Reveal — no pin, no scrub.
      start: "top 92%",
      once: true,
      onEnter: () => {
        gsap.to(el, {
          scaleX: 1,
          duration: 0.7,
          ease: "expo.out",
        });
      },
    });

    return () => st.kill();
  }, []);

  return (
    <div aria-hidden="true" className="container-px py-1 relative z-10">
      <div ref={ruleRef} className="section-rule mx-auto max-w-3xl" />
    </div>
  );
}

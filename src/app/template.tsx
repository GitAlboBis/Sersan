"use client";

/**
 * Route-enter transition (M3).
 *
 * App Router remounts template.tsx on every navigation, which makes it the
 * natural hook for page-enter choreography — WITHOUT touching the canvas:
 * the persistent WebGL layer lives in layout.tsx and never remounts; only
 * the DOM content fades up. The signature line's own re-curve fade runs in
 * parallel (Scene.tsx keys uReveal on the pathname), so the whole page —
 * DOM and WebGL — breathes in together on one beat.
 *
 * prefers-reduced-motion: no animation, content appears immediately.
 */
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (
        typeof window === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      gsap.fromTo(
        ref.current,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "expo.out",
          // Leave no inline styles behind — sticky/fixed descendants must
          // not live inside a transformed ancestor after the intro.
          clearProps: "all",
        },
      );
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}

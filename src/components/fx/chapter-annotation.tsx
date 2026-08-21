"use client";

/**
 * ChapterAnnotation — the right-hung ~320px annotation paragraph the two
 * signal-stream sections hang beside their chapter h2 (Noomo/Lusion pairing).
 * Extracted verbatim from fx/stream-pane.tsx in the round-3 de-card pass
 * (2026-08-21) when the glass panes were deleted; this shared bit survives.
 *
 * Entrance: blur-fade-up ~0.3s after it scrolls in — i.e. just behind the
 * title's masked line-rise (HeadingChoreographer owns the h2; this owns only
 * the annotation). Language-safe by construction: no SplitText, the element's
 * own autoAlpha/filter animate, so an EN/IT swap just rewrites the text in
 * place. RM/no-JS/SSR: never primed hidden — the paragraph simply exists.
 */
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ChapterAnnotation({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) return;
      gsap.set(el, { autoAlpha: 0, y: 14, filter: "blur(8px)" });
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          gsap.to(el, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.8,
            delay: 0.3,
            ease: "expo.out",
            clearProps: "filter",
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.3 },
      );
      obs.observe(el);
      return () => obs.disconnect();
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className="max-w-[320px] text-[13px] leading-relaxed text-ink-mute">
      {children}
    </p>
  );
}

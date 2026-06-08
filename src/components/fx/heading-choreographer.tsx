"use client";

/**
 * HeadingChoreographer — editorial line-mask reveals (award sprint, Phase B).
 *
 * Every element marked `data-split-reveal` gets a GSAP SplitText line
 * reveal: lines rise out of a mask, staggered, on scroll-enter. Splits are
 * rebuilt whenever the language or route changes (the EN/IT swap replaces
 * text in place — re-splitting by construction kills the recon's stale-
 * splits risk). Reduced-motion: no split, headings just exist.
 *
 * SplitText is free since GSAP joined Webflow; `mask: "lines"` wraps each
 * line in an overflow clip so no CSS is needed.
 */
import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useLanguage } from "@/components/language-provider";
import { useScrollStore } from "@/webgl/store/scrollStore";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// Base reveal feel (the design tokens — these stay fixed; only stagger/offset/
// duration are modulated by scroll velocity within tight, clamped bounds).
const BASE_Y_PERCENT = 115;
const BASE_DURATION = 0.85;
const BASE_STAGGER = 0.09;

/**
 * Velocity → motion-factor mapping. Lenis velocity is roughly px/frame; at a
 * gentle scroll it sits near 0–10, a brisk flick reaches the tens. We normalise
 * |velocity| into a 0..1 band and lerp the reveal between a "calm" and a
 * "snappy" feel. The factor is computed ONCE, at the moment the heading enters
 * (in the ScrollTrigger onEnter), so there is no per-frame work and the reveal
 * stays a single, self-contained tween.
 */
const VELOCITY_FULL = 45; // |velocity| at/above which the snappy end is reached
function velocityFactor(velocity: number): number {
  return gsap.utils.clamp(0, 1, Math.abs(velocity) / VELOCITY_FULL);
}

export function HeadingChoreographer() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const targets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-split-reveal]"),
      );
      if (targets.length === 0) return;

      const splits: SplitText[] = [];
      const triggers: ScrollTrigger[] = [];
      const tweens: gsap.core.Tween[] = [];
      // The split + trigger creation happens inside an async fonts.ready
      // callback — after useGSAP has already snapshotted its context — so these
      // are NOT auto-collected by gsap.context. Track and tear them down by hand
      // in the returned cleanup (mirrors SectionHeading's manual revert/kill).
      let cancelled = false;
      // Fonts must be settled or line boxes split wrong mid-swap.
      document.fonts?.ready.then(() => {
        if (cancelled) return;
        targets.forEach((el) => {
          const split = new SplitText(el, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
          splits.push(split);
          // Created paused; the velocity sample is taken the instant the heading
          // reveals (onEnter) — not at split-build time. Faster scroll → a
          // snappier, slightly larger stagger + offset + a hair quicker duration;
          // slow/idle → the gentle baseline. The clamp keeps fast scroll premium,
          // never chaotic. Easing token (expo.out) is untouched.
          const tween = gsap.from(split.lines, {
            yPercent: BASE_Y_PERCENT,
            duration: BASE_DURATION,
            stagger: BASE_STAGGER,
            ease: "expo.out",
            paused: true,
          });
          tweens.push(tween);
          const st = ScrollTrigger.create({
            trigger: el,
            start: "top 88%",
            once: true,
            onEnter: () => {
              const f = velocityFactor(useScrollStore.getState().velocity);
              tween.vars.yPercent = BASE_Y_PERCENT * (1 + 0.18 * f); // 115 → ~136
              tween.vars.stagger = BASE_STAGGER * (1 + 0.55 * f); // 0.09 → ~0.14
              tween.vars.duration = BASE_DURATION * (1 - 0.12 * f); // 0.85 → ~0.75
              tween.invalidate().restart();
            },
          });
          triggers.push(st);
        });
      });

      return () => {
        cancelled = true;
        triggers.forEach((t) => t.kill());
        tweens.forEach((t) => t.kill());
        splits.forEach((s) => s.revert());
      };
    },
    { scope: scopeRef, dependencies: [language, pathname] },
  );

  return <div ref={scopeRef} className="hidden" aria-hidden />;
}

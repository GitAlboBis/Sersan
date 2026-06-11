"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  BRAND_WORDMARKS,
  type BrandName,
} from "@/components/trust-wordmarks";
import { useLanguage } from "@/components/language-provider";
import { useScrollStore } from "@/webgl/store/scrollStore";
import { useScrollParallax } from "@/components/ui/use-scroll-parallax";

/**
 * CredibilityStrip — calm row of tier-1 institutions where the SerSan team
 * trained. Single line, no stats noise. The work proves itself elsewhere.
 */

const LOGOS: BrandName[] = [
  "Revolut",
  "JPMorgan",
  "Deloitte",
  "Brevan Howard",
  "Accenture",
];

export default function CredibilityStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Tiny scroll-linked Y drift on the inner content (NOT the marquee track,
  // which GSAP already drives via xPercent/timeScale). Separate element, so
  // the two transforms never fight.
  const parallaxRef = useScrollParallax<HTMLDivElement>(4);

  // Scroll-velocity coupling: convert the steady CSS keyframe loop into a GSAP
  // xPercent tween whose timeScale rides the scroll velocity, so the marquee
  // surges as the reader flicks and settles back to the baseline loop when the
  // page is still. Under prefers-reduced-motion the CSS rule (animation:none in
  // RM) stays the source of truth and this effect bails — no coupling, no GSAP.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // GSAP takes over the transform — stop the CSS keyframe loop so the two
    // don't fight (CSS animation-duration can't be smoothly retimed; timeScale
    // can). The CSS rule remains the SSR / no-JS / reduced-motion fallback.
    track.style.animation = "none";

    // Same -50% sweep as the CSS keyframe (two LOGOS copies → seamless wrap),
    // matched 28s baseline so the steady-state speed is identical to before.
    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 28,
      ease: "none",
      repeat: -1,
    });

    const MAX_TIMESCALE = 5; // cap the surge so a fast flick stays tasteful
    let current = 1;
    let rafId = 0;

    // One rAF loop reads the transient scroll velocity and eases timeScale
    // toward the mapped target — never thrashing per scroll event. When
    // velocity is 0 (idle / native scroll) the target is 1, so timeScale
    // settles to the steady baseline loop.
    const loop = () => {
      const v = Math.abs(useScrollStore.getState().velocity);
      const target = 1 + Math.min(v * 0.05, MAX_TIMESCALE - 1);
      current += (target - current) * 0.08;
      tween.timeScale(current);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      tween.kill();
      // Hand the loop back to CSS if the component remounts without RM.
      track.style.animation = "";
    };
  }, []);

  // Borderless + transparent on purpose (restyle step 2): the strip sits
  // right after the spine's camera-descent beat and must fuse into the top
  // of Problem — the old border-y divider broke that 3D handoff.
  return (
    <section
      id="credibility"
      aria-label={
        isEn
          ? "Trust band: audience and tier-1 institutions"
          : "Fascia di fiducia: pubblico e istituzioni di primo livello"
      }
      className="relative"
    >
      <div
        ref={parallaxRef}
        className="container-px py-7 sm:py-9 flex flex-col gap-5 sm:gap-6"
      >
        {/* Audience trust band — names the buyer types in a single
            scannable line. Sits above the marquee so visitors see who
            this is for before they see where the team trained. */}
        <p className="text-center sm:text-left text-[11px] sm:text-[12px] font-mono uppercase tracking-[0.18em] text-ink-mute">
          <span className="text-ink/80">{isEn ? "Built for" : "Pensato per"}</span>{" "}
          <span className="text-ink">SaaS</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">fintech</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">{isEn ? "regulated teams" : "team regolamentati"}</span>
          <span aria-hidden="true" className="text-ink-mute/40">{" · "}</span>
          <span className="text-ink">{isEn ? "technical founders" : "founder tecnici"}</span>
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-ink-mute shrink-0">
            {isEn ? "Where our team trained" : "Dove si è formato il nostro team"}
          </span>

          <div className="relative flex-1 overflow-hidden marquee-mask">
            <div ref={trackRef} className="marquee-track">
              {[...LOGOS, ...LOGOS].map((name, i) => {
                const Wordmark = BRAND_WORDMARKS[name];
                return (
                  <span
                    key={`${name}-${i}`}
                    className="inline-flex items-center gap-x-14 shrink-0"
                    aria-hidden={i >= LOGOS.length}
                    aria-label={i < LOGOS.length ? name : undefined}
                  >
                    <span className="text-ink/80 inline-flex items-baseline">
                      <Wordmark />
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-block h-px w-5 bg-[hsl(var(--rule))]"
                    />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .marquee-mask {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
                  mask-image: linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%);
        }
      `}</style>
    </section>
  );
}

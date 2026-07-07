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
 *
 * Motion (V4 package M): velocity-reactive infinite marquee. The wordmark row
 * is duplicated once (clones aria-hidden) and translateX advances on a
 * gsap.ticker at ~28px/s base speed, boosted up to ~4× by the transient
 * scrollStore velocity (damped, λ≈3) with a subtle skewX shear (clamp ±3°,
 * damped to 0 at rest — same idiom as the work rail). Wrap is a modulo on the
 * measured loop period (re-measured on resize + fonts.ready). Speed eases to 0
 * while hovered or when the document is hidden, and the ticker early-returns
 * once parked with no residual scroll energy — zero writes at rest.
 *
 * SSR renders the static row (inline animation:none defeats the legacy CSS
 * keyframe); the marquee arms client-side. Reduced motion: the effect bails —
 * exactly today's static row (clones stay aria-hidden, so AT never perceives
 * duplicate content either way).
 */

const LOGOS: BrandName[] = [
  "Revolut",
  "JPMorgan",
  "Deloitte",
  "Brevan Howard",
  "Accenture",
];

/** Marquee base speed (px/s) — matches the felt pace of the old 28s CSS loop. */
const BASE_SPEED_PX_S = 28;
/** Peak total speed multiplier under a hard scroll flick (~4×). */
const MAX_BOOST = 4;
/** Boost per unit of |Lenis velocity| (px/frame-ish, from scrollStore). */
const BOOST_PER_VEL = 0.05;
/** Damping rate for the velocity boost envelope (plan spec: λ≈3). */
const BOOST_LAMBDA = 3;
/** Damping for the hover / document.hidden pause envelope (snappier). */
const RUN_LAMBDA = 6;
/** Velocity skew (rail idiom): max shear in degrees, and deg per velocity unit
 *  (store velocity is px/frame-ish ≈ px/s ÷ 60, hence the ×60 of the rails'
 *  per-px/s constants — ±3° lands around a firm flick). */
const SKEW_MAX_DEG = 3;
const SKEW_DEG_PER_VEL = 0.09;

export default function CredibilityStrip() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const trackRef = useRef<HTMLDivElement | null>(null);
  const skewRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  // Tiny scroll-linked Y drift on the inner content (NOT the marquee track,
  // which the ticker drives via translateX). Separate element, so the two
  // transforms never fight.
  const parallaxRef = useScrollParallax<HTMLDivElement>(4);

  // Velocity-reactive marquee — one gsap.ticker owns ALL motion state:
  //   x    : track translateX, wrapped by modulo on the measured loop period
  //   run  : 0..1 pause envelope (hover / document.hidden ease the speed to 0)
  //   boost: 1..MAX_BOOST speed multiplier fed by |scroll velocity| (λ≈3)
  //   skew : ±3° shear on a dedicated wrapper, damped to 0 at rest
  // Scroll velocity is read transiently via useScrollStore.getState() inside
  // the tick — never through the reactive hook (repo invariant). Under
  // prefers-reduced-motion the effect bails: static row, no ticker, no GSAP.
  useEffect(() => {
    const track = trackRef.current;
    const skewWrap = skewRef.current;
    const mask = maskRef.current;
    if (!track || !skewWrap || !mask) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const setX = gsap.quickSetter(track, "x", "px");
    const setSkew = gsap.quickSetter(skewWrap, "skewX", "deg");

    // ---- Measurement (mount + resize + fonts.ready; NEVER in the tick).
    // The loop period is the exact start-to-start distance between the two
    // row copies (offsetLeft delta — layout reads, transform-immune), so the
    // wrap seam is gap-perfect. scrollWidth/2 is only the degenerate fallback.
    let period = 0;
    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined;
      const clone = track.children[LOGOS.length] as HTMLElement | undefined;
      period =
        first && clone
          ? clone.offsetLeft - first.offsetLeft
          : track.scrollWidth / 2;
      if (!(period > 0)) {
        period = 0; // guard vs zero/NaN width — the tick skips advancing
        return;
      }
      x = -((-x) % period); // re-fold the phase into the fresh period
    };

    // ---- Ticker state.
    let x = 0;
    let lastX = 0;
    let run = 1; // pause envelope (1 running → 0 paused)
    let boost = 1;
    let skewValue = 0;
    let hovered = false;
    let hidden = document.hidden;

    const tick = (_time: number, deltaTime: number) => {
      const dt = Math.min(0.05, deltaTime / 1000);
      const v = useScrollStore.getState().velocity;
      const av = Math.abs(v);
      const runTarget = hovered || hidden ? 0 : 1;

      // Park early-return: pause envelope fully settled AND no scroll energy
      // AND the shear already snapped — zero writes, no idle churn.
      if (runTarget === 0 && run === 0 && av < 0.01 && skewValue === 0) return;

      // Pause envelope (ease speed to 0 on hover / hidden, back to 1 after).
      run += (runTarget - run) * (1 - Math.exp(-RUN_LAMBDA * dt));
      if (runTarget === 0 && run < 0.001) run = 0;
      else if (runTarget === 1 && run > 0.999) run = 1;

      // Velocity boost — |v| only (the marquee always flows forward), damped
      // so a flick surges and settles back to the 28px/s baseline.
      const boostTarget = 1 + Math.min(av * BOOST_PER_VEL, MAX_BOOST - 1);
      boost += (boostTarget - boost) * (1 - Math.exp(-BOOST_LAMBDA * dt));

      // Advance + modulo wrap (identical-value skip on the write).
      if (period > 0 && run > 0) {
        x -= BASE_SPEED_PX_S * boost * run * dt;
        if (x <= -period) x = -((-x) % period);
        if (x !== lastX) {
          lastX = x;
          setX(x);
        }
      }

      // Velocity skew (rail idiom): signed target, damped, snap-to-0 once at
      // rest so the wrapper stops receiving writes entirely.
      const skewTarget = gsap.utils.clamp(
        -SKEW_MAX_DEG,
        SKEW_MAX_DEG,
        v * SKEW_DEG_PER_VEL,
      );
      const nextSkew =
        skewValue + (skewTarget - skewValue) * (1 - Math.exp(-10 * dt));
      if (Math.abs(nextSkew) < 0.005 && Math.abs(skewTarget) < 0.005) {
        if (skewValue !== 0) {
          skewValue = 0;
          setSkew(0); // snap to exactly 0 once, then stop writing
        }
        return;
      }
      skewValue = nextSkew;
      setSkew(skewValue);
    };

    measure();
    gsap.ticker.add(tick);

    // ---- Listeners: hover pause (mouse/pen only — a touch tap must not
    // freeze the strip), visibility pause, re-measure on resize + webfonts.
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "touch") hovered = true;
    };
    const onLeave = () => {
      hovered = false;
    };
    const onVisibility = () => {
      hidden = document.hidden;
    };
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(measure);
    };
    mask.addEventListener("pointerenter", onEnter);
    mask.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) measure();
      })
      .catch(() => {});

    return () => {
      fontsCancelled = true;
      gsap.ticker.remove(tick);
      mask.removeEventListener("pointerenter", onEnter);
      mask.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeRaf);
      gsap.set(track, { clearProps: "transform" });
      gsap.set(skewWrap, { clearProps: "transform" });
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

          <div
            ref={maskRef}
            className="relative flex-1 overflow-hidden marquee-mask"
          >
            {/* Velocity-skew wrapper: the transient shear lives here, NEVER
                on the translated track (rail idiom — transforms never fight,
                and the track's layout reads stay clean). */}
            <div ref={skewRef} className="will-change-transform">
              {/* Inline animation:none defeats the legacy CSS keyframe so SSR
                  (and reduced motion) shows the static row; the gsap.ticker
                  above owns translateX once armed client-side. */}
              <div
                ref={trackRef}
                className="marquee-track"
                style={{ animation: "none" }}
              >
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

"use client";

/**
 * Preloader — the first-load curtain that resolves into the signature line.
 *
 * Shown ONCE per hard page load (it lives in the persistent root layout, which
 * App Router never remounts on soft navigations — so route changes keep using
 * the template.tsx curtain and never see this again). It is a sober, regulated-
 * brand load-in: a full-viewport navy sheet with the SERSAN MARK as the hero of
 * the screen (the two stencil S's flanking the vertical signal divider, centered
 * large — our equivalent of Lusion's centered "L"). The mono PERCENTAGE counter
 * and a thin progress BAR sit subordinate beneath it; SerSan's own accent
 * (cyan→violet) plus the divider's violet are the only colors.
 *
 * The mark's SVG is INLINED here (same path data + token colors as
 * src/components/sersan-logo.tsx — SymbolMark) so the two S `<path>`s and the
 * divider `<rect>` can be animated independently with GSAP.
 *
 * Progress is driven by REAL readiness, not a fake timer:
 *   - document.fonts.ready        (brand type swapped in — no FOUT flash)
 *   - window "load"               (the static SSR'd page + LCP poster painted)
 *   - tierStore.resolved          (WebGL tier decided; on "off" there's no scene
 *                                  to wait on, on full/lite the canvas mounts)
 * Each resolved signal advances a target; a per-frame rAF eases the displayed
 * counter toward that target. A MIN visible time (~700ms) prevents a flash; a
 * MAX cap (~3.5s) guarantees a slow signal never traps the user.
 *
 * Hand-off (curtain approach): at 100% the overlay wipes UP (clip-path) while
 * introStore.complete() flips — SignatureLine listens for that edge and re-kicks
 * its uReveal 0→1 draw-in, so the line visibly "becomes" what the loader showed
 * on one beat. We coordinate with the existing uReveal rather than rewriting the
 * line. The conceptual bridge: the mark's vertical signal DIVIDER brightens to
 * the cyan→violet accent and streaks/elongates downward as the curtain lifts —
 * the eye reads the logo's signal-bar turning into the scroll line.
 *
 * SSR-safe: the overlay only renders AFTER mount (a client effect sets `mounted`),
 * so the server HTML never contains it → no hydration mismatch, no layout shift.
 * Body scroll is locked while visible (Lenis is stopped + html overflow hidden)
 * and released on reveal.
 *
 * prefers-reduced-motion: NO counter animation / no morph. The overlay never
 * mounts; introStore is completed immediately so the line draws in normally and
 * scroll is never locked. The page just appears.
 *
 * Removable: delete this file + its <Preloader /> mount in layout.tsx and its
 * store subscriber in SignatureLine; the site loads exactly as before (the
 * poster→planet crossfade remains the hero load-in).
 */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useTierStore } from "@/webgl/store/tierStore";
import { useIntroStore } from "@/webgl/store/introStore";
import { getLenis } from "@/lib/lenis-singleton";

// Timing envelope (ms). MIN keeps the loader from flashing on a warm cache;
// MAX is the safety cap so a stuck signal never traps the visitor.
const MIN_VISIBLE_MS = 700;
const MAX_VISIBLE_MS = 3500;
// Counter easing toward its target each frame (fraction per ~16ms frame). Low
// enough to read as a smooth tick-up, high enough to feel responsive.
const COUNTER_EASE = 0.12;
// Curtain wipe duration (s) — close to template.tsx's 0.62s so first-load and
// route-change wipes feel like one motion language.
const WIPE_DURATION = 0.7;

// The exact left-S outline from src/components/sersan-logo.tsx (SymbolMark).
// Inlined so the two S `<path>`s and the divider `<rect>` can be animated
// separately; the right S is the same path mirrored. Kept byte-identical to the
// brand mark so the centered logo IS the logo, not a redraw.
const LEFT_S_PATH = `
  M 12 0 L 120 0 L 120 200 L 12 200 L 0 188 L 0 12 Z
  M 24 24 L 120 24 L 120 88 L 24 88 Z
  M 0 112 L 96 112 L 96 176 L 0 176 Z
`;

export function Preloader() {
  // Render nothing on the server / first client paint; mount after hydration so
  // the SSR HTML is identical with and without JS (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  // null while we decide whether to show at all (reduced-motion skips entirely).
  const [active, setActive] = useState<boolean | null>(null);
  // Displayed counter (0..100), integer for the digit-roll readout.
  const [display, setDisplay] = useState(0);

  const overlayRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  // Logo pieces — animated independently. The two S paths fade/scale in; the
  // divider rect draws from center (scaleY) on intro and streaks/brightens into
  // the signature line on reveal.
  const logoRef = useRef<HTMLDivElement>(null);
  const leftSRef = useRef<SVGPathElement>(null);
  const rightSRef = useRef<SVGGElement>(null);
  const dividerRef = useRef<SVGRectElement>(null);

  // Mount gate — runs once after hydration.
  useEffect(() => {
    setMounted(true);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // No overlay, no scroll lock, no animation: hand off immediately so the
      // line draws in on the normal beat and the page just appears.
      useIntroStore.getState().complete();
      setActive(false);
      return;
    }
    setActive(true);
  }, []);

  // The whole load → count → reveal lifecycle. Only arms when active === true.
  useEffect(() => {
    if (active !== true) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let rafId = 0;
    let revealed = false;
    const startedAt = performance.now();

    // ----- Logo intro: S's fade in, divider draws from center, mark scales -----
    // A short, refined entrance for the centered mark. Reduced-motion never
    // reaches here (active is false), so this is desktop/standard-motion only.
    // GSAP cleans these up automatically when killed in the teardown below.
    //
    // Note: the scale entrance is applied to the SVG's container DIV (logoRef),
    // NOT to the SVG sub-nodes. The right S `<g>` already carries a mirror
    // `transform="… scale(-1 1)"` presentation attribute; writing an inline
    // `style.transform` onto it via GSAP would override and flip it back. So we
    // only ever animate OPACITY on the S's, scaleY on the divider rect (no
    // pre-existing transform), and the scale on the wrapper div.
    const introTweens: gsap.core.Tween[] = [];
    if (
      leftSRef.current &&
      rightSRef.current &&
      dividerRef.current &&
      logoRef.current
    ) {
      gsap.set([leftSRef.current, rightSRef.current], { opacity: 0 });
      // The divider draws in vertically from its center.
      gsap.set(dividerRef.current, {
        scaleY: 0,
        transformOrigin: "50% 50%",
        transformBox: "fill-box",
      });
      introTweens.push(
        gsap.to([leftSRef.current, rightSRef.current], {
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.08,
        }),
        gsap.fromTo(
          logoRef.current,
          { scale: 0.94 },
          { scale: 1, duration: 0.95, ease: "power3.out", transformOrigin: "50% 50%" },
        ),
        gsap.to(dividerRef.current, {
          scaleY: 1,
          duration: 0.85,
          ease: "power2.inOut",
          delay: 0.18,
        }),
      );
    }

    // ----- Lock scroll while the overlay covers the page -----
    // Pin the document so nothing scrolls underneath the navy sheet. Both this
    // and Lenis are restored at reveal().
    //
    // Note on ordering: this Preloader is a CHILD of SmoothScrollProvider, so
    // React runs this effect BEFORE the provider's acquireLenis() — getLenis()
    // can be null here. The html `overflow:hidden` below blocks native scroll
    // immediately regardless; the rAF frame loop then calls lenisStop() each
    // tick until the singleton exists, so Lenis is reliably parked while the
    // overlay is up no matter the effect order.
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    let lenisStopped = false;
    const lenisStop = () => {
      if (lenisStopped) return;
      const l = getLenis();
      if (l) {
        l.stop();
        lenisStopped = true;
      }
    };
    lenisStop();

    // ----- Real-readiness target (0..1) -----
    // Three independent signals; each contributes a weighted slice. The counter
    // never EXCEEDS the resolved fraction (capped at 90% until all resolve), so
    // it can't show 100 before the page is genuinely ready — then it eases home.
    const signals = { fonts: false, load: false, tier: false };
    const targetFraction = () => {
      const resolved =
        (signals.fonts ? 0.34 : 0) +
        (signals.load ? 0.33 : 0) +
        (signals.tier ? 0.33 : 0);
      const allReady = signals.fonts && signals.load && signals.tier;
      const elapsed = performance.now() - startedAt;
      const minElapsed = Math.min(elapsed / MIN_VISIBLE_MS, 1);
      if (allReady && minElapsed >= 1) return 1;
      // Hold below 100 until everything (incl. min time) is satisfied so the
      // "100" only ever appears at genuine readiness.
      return Math.min(resolved * 0.9 + minElapsed * 0.1, 0.95);
    };

    // fonts.ready resolves when brand type is swapped (avoids the loader handing
    // off into a font-swap flash). Falls back gracefully if unsupported.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) signals.fonts = true;
      });
    } else {
      signals.fonts = true;
    }

    // window "load": the static page + LCP poster have painted.
    if (document.readyState === "complete") {
      signals.load = true;
    } else {
      const onLoad = () => {
        signals.load = true;
      };
      window.addEventListener("load", onLoad, { once: true });
    }

    // WebGL tier resolved (CanvasHost's effect runs detectTier). On "off" there
    // is no scene to wait for; on full/lite the canvas has mounted. We treat
    // `resolved` as the signal — heroReady is NOT required (it would couple the
    // loader to a planet that may legitimately take longer, and lite/off never
    // set it).
    if (useTierStore.getState().resolved) {
      signals.tier = true;
    }
    const unsubTier = useTierStore.subscribe((s) => {
      if (s.resolved) signals.tier = true;
    });

    // ----- Counter ease + reveal trigger (single rAF) -----
    let current = 0; // 0..1
    const frame = () => {
      if (cancelled) return;
      // Keep parking Lenis until the provider has created it (effect-order
      // safety, see the lock note above) — no-op once stopped.
      lenisStop();
      const elapsed = performance.now() - startedAt;
      const forced = elapsed >= MAX_VISIBLE_MS; // safety cap
      const target = forced ? 1 : targetFraction();
      current += (target - current) * COUNTER_EASE;
      // Snap the last sliver so we land cleanly on 100 (otherwise the ease
      // asymptotes at 99 forever).
      if (target >= 1 && current > 0.999) current = 1;

      const pct = Math.round(current * 100);
      setDisplay(pct);
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${current})`;
      }

      if (current >= 1 && !revealed) {
        revealed = true;
        reveal();
        return;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    // ----- Hand-off: curtain wipe up + line draw-in -----
    function reveal() {
      // Flip the shared flag FIRST so SignatureLine re-kicks its uReveal 0→1 on
      // this exact beat — the wipe below uncovers the line as it draws in.
      useIntroStore.getState().complete();

      const finish = () => {
        if (revealed && overlayRef.current) {
          // Belt-and-suspenders: never leave the overlay covering or capturing.
          gsap.set(overlayRef.current, {
            clipPath: "inset(0% 0 100% 0)",
            pointerEvents: "none",
          });
        }
        restoreScroll();
        setActive(false); // unmount the overlay entirely
      };

      const node = overlayRef.current;
      if (!node) {
        finish();
        return;
      }

      // Divider → signature line: the mark's vertical signal-bar brightens to
      // the cyan→violet accent and streaks/elongates downward as the curtain
      // lifts — the eye reads the logo's bar becoming the scroll line. The line
      // itself draws in via SignatureLine's uReveal (already kicked above).
      if (dividerRef.current) {
        gsap.to(dividerRef.current, {
          scaleY: 6,
          y: 120,
          fill: "hsl(189 100% 62%)", // --accent cyan head of the signature line
          duration: WIPE_DURATION,
          ease: "expo.in",
          transformOrigin: "50% 50%",
          transformBox: "fill-box",
        });
      }
      // The two S's recede slightly so the divider/streak owns the moment.
      if (leftSRef.current && rightSRef.current) {
        gsap.to([leftSRef.current, rightSRef.current], {
          opacity: 0,
          duration: WIPE_DURATION * 0.55,
          ease: "power2.in",
        });
      }

      // Wipe UP: the navy sheet lifts from the bottom, uncovering the page (and
      // the freshly-drawing line) from the bottom edge upward — same motion as
      // the route curtain so the language is consistent.
      gsap.fromTo(
        node,
        { clipPath: "inset(0% 0 0% 0)" },
        {
          clipPath: "inset(0% 0 100% 0)",
          duration: WIPE_DURATION,
          ease: "expo.inOut",
          onComplete: finish,
        },
      );
    }

    function restoreScroll() {
      document.documentElement.style.overflow = prevHtmlOverflow;
      // Only re-start Lenis if we actually parked it (otherwise we'd start a
      // singleton the provider hasn't finished wiring, or that is intentionally
      // absent under native-scroll fallback).
      if (lenisStopped) getLenis()?.start();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      unsubTier();
      introTweens.forEach((t) => t.kill());
      // If we tear down before revealing (e.g. fast HMR in dev), restore scroll
      // and complete the intro so the line is never left hidden.
      if (!revealed) {
        restoreScroll();
        useIntroStore.getState().complete();
      }
    };
  }, [active]);

  if (!mounted || active !== true) return null;

  // Split the percentage into individual cells for a tabular digit-roll look.
  const pctStr = String(display).padStart(2, "0");

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg"
      style={{ clipPath: "inset(0% 0 0% 0)" }}
    >
      {/* Corner index mark — the sober "52." / SERSAN tag, mono, dim. */}
      <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-2 sm:left-10 sm:top-10">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-mute"
          style={{ fontFamily: "var(--font-jbm), ui-monospace, monospace" }}
        >
          52.&nbsp;SERSAN
        </span>
      </div>

      {/* HERO: the SERSAN mark, centered and large — the focal point of the
          screen. Inlined SVG (same paths + tokens as SymbolMark) so the two S
          paths and the divider rect animate independently. The divider is the
          signal-bar that streaks into the scroll line on hand-off. */}
      <div ref={logoRef} className="flex flex-col items-center">
        <svg
          viewBox="0 0 264 200"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="SERSAN"
          className="h-[clamp(96px,18vw,140px)] w-auto drop-shadow-[0_0_28px_hsl(var(--accent-warm)/0.25)]"
          style={{ aspectRatio: "264 / 200", overflow: "visible" }}
        >
          <path
            ref={leftSRef}
            d={LEFT_S_PATH}
            fill="hsl(var(--ink))"
            fillRule="evenodd"
          />
          <rect
            ref={dividerRef}
            x="130"
            y="0"
            width="4"
            height="200"
            fill="hsl(var(--accent-warm))"
          />
          <g ref={rightSRef} transform="translate(264 0) scale(-1 1)">
            <path d={LEFT_S_PATH} fill="hsl(var(--ink))" fillRule="evenodd" />
          </g>
        </svg>

        {/* Subordinate readout: mono % counter beneath the mark. */}
        <div
          className="mt-9 flex items-baseline tabular-nums leading-none text-ink-mute"
          style={{
            fontFamily: "var(--font-jbm), ui-monospace, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span className="text-[clamp(1.5rem,4.5vw,2.25rem)] font-medium tracking-[-0.01em] text-ink">
            {pctStr}
          </span>
          <span className="ml-1 text-[clamp(0.8rem,2vw,1rem)] font-medium">
            %
          </span>
        </div>

        {/* Progress bar — a thin rule with a cyan→violet fill that scales from
            the left. It echoes the divider and seeds the signature line. */}
        <div className="mt-5 h-px w-[min(60vw,260px)] overflow-hidden bg-[hsl(var(--ink)/0.12)]">
          <div
            ref={barFillRef}
            className="h-full w-full origin-left"
            style={{
              transform: "scaleX(0)",
              background:
                "linear-gradient(90deg, hsl(var(--accent)) 0%, hsl(var(--accent-2)) 100%)",
              boxShadow:
                "0 0 12px hsl(var(--accent) / 0.5), 0 0 24px hsl(var(--accent-2) / 0.3)",
            }}
          />
        </div>

        <div
          className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--ink-dim))]"
          style={{ fontFamily: "var(--font-jbm), ui-monospace, monospace" }}
        >
          Initialising signal
        </div>
      </div>
    </div>
  );
}

export default Preloader;

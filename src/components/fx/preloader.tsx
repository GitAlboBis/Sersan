"use client";

/**
 * Preloader — the first-load curtain that resolves into the signature line.
 *
 * Shown ONCE per hard page load (it lives in the persistent root layout, which
 * App Router never remounts on soft navigations — so route changes keep using
 * the template.tsx curtain and never see this again). It is a deep-space load-in
 * for a regulated AI brand: a self-contained animated STARFIELD background
 * (drifting + twinkling stars over a near-black navy→black radial, with faint
 * cyan/violet nebula glows from the brand tokens) sits behind the SERSAN MARK.
 *
 * THE MARK IS THE PROGRESS BAR. During load the two stencil S's are shown in an
 * OPEN, ~90°-rotated horizontal pose (laid wide and flat, side by side — the
 * "loading bar"). Two stacked layers of that rotated mark are drawn:
 *   (a) a GHOST layer — the rotated letter paths at low opacity (the unfilled
 *       portion of the bar);
 *   (b) a LIT layer — the same rotated paths filled with a cyan→violet linear
 *       gradient + accent glow, CLIPPED by a horizontal reveal <rect> whose
 *       width is driven L→R every frame by the eased `current` progress (0..1).
 * As the % climbs the cyan→violet fill sweeps left→right across the whole wide
 * rotated mark, "filling the letters". There is no separate thin progress bar.
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
 *   - introStore.warmReady        (WebGL pipelines compiled — keeps 100% honest)
 * Each resolved signal advances a target; a per-frame rAF eases the displayed
 * counter toward that target. A MIN visible time (~700ms) prevents a flash; a
 * MAX watchdog (~30s) guarantees a stuck GPU never traps the user.
 *
 * Hand-off (close → zoom → streak): at 100% the mark folds CLOSED (the two
 * rotated S's animate back from the OPEN horizontal pose to the UPRIGHT compact
 * mark — the SymbolMark layout, two vertical S's flanking the centered divider),
 * fully lit. The compact mark then ZOOMS toward the viewer (scale-up + slight
 * blur/opacity fade). Through that beat introStore.complete() flips (SignatureLine
 * listens for the false→true edge and re-kicks its uReveal 0→1 draw-in), the
 * vertical DIVIDER brightens to accent cyan and streaks/elongates downward into
 * the signature line, and the navy curtain wipes UP (clip-path) as the final
 * uncover — the eye reads the logo's signal-bar becoming the scroll line.
 *
 * SSR-safe: the overlay only renders AFTER mount (a client effect sets `mounted`),
 * so the server HTML never contains it → no hydration mismatch, no layout shift.
 * Body scroll is locked while visible (Lenis is stopped + html overflow hidden)
 * and released on reveal.
 *
 * prefers-reduced-motion: NO counter animation / no morph / no starfield. The
 * overlay never mounts; introStore is completed immediately so the line draws in
 * normally and scroll is never locked. The page just appears.
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

// Timing envelope (ms). MIN keeps the loader from flashing on a warm cache.
const MIN_VISIBLE_MS = 700;
// LAST-RESORT safety only: if the scene never reports `warm` (a truly stuck GPU),
// reveal anyway so the visitor is never trapped. This is NOT the normal reveal
// path — the truthful `warm` signal completes the counter well before this. It is
// deliberately long so the loader stays HONEST (waits for real shader readiness)
// rather than revealing on a fixed timer (the old fake-100% behaviour).
const WATCHDOG_MS = 30000;
// Counter easing toward its target each frame (fraction per ~16ms frame). Low
// enough to read as a smooth tick-up, high enough to feel responsive.
const COUNTER_EASE = 0.12;
// Curtain wipe duration (s) — close to template.tsx's 0.62s so first-load and
// route-change wipes feel like one motion language. The close+zoom choreography
// runs ~1.0–1.2s total, ending with this curtain wipe.
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

// ---- Mark geometry: OPEN (horizontal bar) → CLOSED (upright SERSAN mark) ----
// A wide viewBox holds both states. CLOSED is the normal mark — two S's flanking
// the violet divider, the RIGHT S MIRRORED — centred. OPEN lays both S's FLAT &
// LEVEL on one row (each rotated 90°), the loading bar. Each glyph is drawn
// CENTRED at its own local origin, so ONE `translate(cx CY) rotate(angle)`
// transform both rotates it about its centre AND positions it. The close beat
// animates cx (open→compact) and angle (OPEN_ANGLE→0) the SAME way for both
// glyphs, so the bar "stands up" together — never one above the other — and
// lands on the exact SERSAN mark.
const VB_W = 480;
const VB_H = 240;
const CY = VB_H / 2; // 120 — BOTH glyphs sit on this one row.
// Closed: centres 144 apart (matches SymbolMark's 60↔204), divider between.
const LEFT_CLOSED_CX = VB_W / 2 - 72; // 168
const RIGHT_CLOSED_CX = VB_W / 2 + 72; // 312
const DIVIDER_X = VB_W / 2; // 240
// Open: a 90°-rotated S spans 200 wide, so spread the centres clear of overlap.
const LEFT_OPEN_CX = VB_W / 2 - 115; // 125
const RIGHT_OPEN_CX = VB_W / 2 + 115; // 355
// Open rotation (deg) — folds to 0° on close so the mark "stands up" (verso
// l'alto). Both glyphs use the SAME sign; the right glyph's mirror is what makes
// the closed pair the correct SERSAN symbol.
const OPEN_ANGLE = -90;
// Glyph-local centring inside each rotating group. The right S is MIRRORED
// (scale -1) so the closed mark is the real symbol, not a doubled left-S.
const LEFT_INNER = "translate(-60 -100)";
const RIGHT_INNER = "translate(60 -100) scale(-1 1)";
const glyphTF = (cx: number, angle: number) =>
  `translate(${cx} ${CY}) rotate(${angle})`;
const LEFT_OPEN_TF = glyphTF(LEFT_OPEN_CX, OPEN_ANGLE);
const RIGHT_OPEN_TF = glyphTF(RIGHT_OPEN_CX, OPEN_ANGLE);

// ---- Starfield --------------------------------------------------------------
interface Star {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  r: number; // base radius (css px)
  a: number; // base alpha
  tw: number; // twinkle phase
  tws: number; // twinkle speed
  dx: number; // drift per second (css px), x
  dy: number; // drift per second (css px), y
  c: 0 | 1 | 2; // 0 white, 1 cyan-ish, 2 violet-ish
}

export function Preloader() {
  // Render nothing on the server / first client paint; mount after hydration so
  // the SSR HTML is identical with and without JS (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  // null while we decide whether to show at all (reduced-motion skips entirely).
  const [active, setActive] = useState<boolean | null>(null);
  // Displayed counter (0..100), integer for the digit-roll readout.
  const [display, setDisplay] = useState(0);

  const overlayRef = useRef<HTMLDivElement>(null);
  // Starfield canvas (sibling layer behind the logo, driven by the same rAF).
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  // The horizontal reveal rect inside the clipPath: its width is the bar fill.
  const fillRectRef = useRef<SVGRectElement>(null);
  // Logo pieces — animated independently across the open→closed→zoom beats.
  // The four rotating INNER groups (ghost L/R + lit L/R) are GSAP-rotated from
  // their open ±90° pose to 0° on close; their outer groups carry static
  // placement.
  const logoRef = useRef<HTMLDivElement>(null);
  const leftGhostRotRef = useRef<SVGGElement>(null);
  const rightGhostRotRef = useRef<SVGGElement>(null);
  const leftLitRotRef = useRef<SVGGElement>(null);
  const rightLitRotRef = useRef<SVGGElement>(null);
  const ghostWrapRef = useRef<SVGGElement>(null); // both ghost glyphs (fade on close)
  const litWrapRef = useRef<SVGGElement>(null); // both lit glyphs (fade on zoom)
  const readoutRef = useRef<HTMLDivElement>(null); // % counter + label (fade on zoom)
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

    // Guard against (somehow) running under reduced motion — never animate the
    // twinkle/drift if so (active is normally false under RM, but be defensive).
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // ----- Starfield setup (drawn by the SAME single rAF loop below) ---------
    // Precompute star positions ONCE; the draw loop only advances cheap phases.
    const stars: Star[] = [];
    {
      const count = 320;
      // Deterministic-ish PRNG so the field is stable across the frame loop but
      // varied; Math.random is fine here (positions computed once).
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const c: 0 | 1 | 2 = roll < 0.78 ? 0 : roll < 0.9 ? 1 : 2;
        stars.push({
          x: Math.random(),
          y: Math.random(),
          r: 0.4 + Math.random() * 1.3,
          a: 0.25 + Math.random() * 0.6,
          tw: Math.random() * Math.PI * 2,
          tws: 0.6 + Math.random() * 2.2,
          dx: (Math.random() - 0.5) * 3,
          dy: (Math.random() - 0.5) * 3,
          c,
        });
      }
    }
    let starCtx: CanvasRenderingContext2D | null = null;
    let starW = 0;
    let starH = 0;
    let starDpr = 1;
    const sizeStarCanvas = () => {
      const cv = starCanvasRef.current;
      if (!cv) return;
      starDpr = Math.min(window.devicePixelRatio || 1, 2);
      starW = window.innerWidth;
      starH = window.innerHeight;
      cv.width = Math.round(starW * starDpr);
      cv.height = Math.round(starH * starDpr);
      cv.style.width = `${starW}px`;
      cv.style.height = `${starH}px`;
      starCtx = cv.getContext("2d");
      if (starCtx) starCtx.scale(starDpr, starDpr);
    };
    sizeStarCanvas();
    const onResize = () => sizeStarCanvas();
    window.addEventListener("resize", onResize);

    const drawStarfield = (tSec: number) => {
      const ctx = starCtx;
      if (!ctx || starW === 0 || starH === 0) return;
      // Near-black deep-space base: navy→black radial.
      ctx.clearRect(0, 0, starW, starH);
      const base = ctx.createRadialGradient(
        starW * 0.5,
        starH * 0.42,
        0,
        starW * 0.5,
        starH * 0.42,
        Math.max(starW, starH) * 0.75,
      );
      base.addColorStop(0, "#0B1422");
      base.addColorStop(0.55, "#070d18");
      base.addColorStop(1, "#02040a");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, starW, starH);

      // Faint cyan + violet nebula glows (brand tokens), low alpha, additive.
      ctx.globalCompositeOperation = "lighter";
      const neb = (
        cx: number,
        cy: number,
        rad: number,
        rgb: string,
        alpha: number,
      ) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, starW, starH);
      };
      // #3BE1FF cyan, #7C5CFF violet — slow breathe via tSec.
      const breathe = reducedMotion ? 0 : Math.sin(tSec * 0.25) * 0.5 + 0.5;
      neb(
        starW * 0.32,
        starH * 0.34,
        Math.max(starW, starH) * 0.42,
        "59, 225, 255",
        0.05 + breathe * 0.03,
      );
      neb(
        starW * 0.72,
        starH * 0.66,
        Math.max(starW, starH) * 0.46,
        "124, 92, 255",
        0.05 + (1 - breathe) * 0.03,
      );

      // Stars — small arcs, twinkle + slow drift. Additive so the brightest
      // catch the eye like signal sparks.
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // Drift (wraps around the viewport). Static under reduced motion.
        const driftX = reducedMotion ? 0 : s.dx * tSec;
        const driftY = reducedMotion ? 0 : s.dy * tSec;
        let px = s.x * starW + driftX;
        let py = s.y * starH + driftY;
        // Wrap.
        px = ((px % starW) + starW) % starW;
        py = ((py % starH) + starH) % starH;
        const twinkle = reducedMotion
          ? 1
          : 0.55 + 0.45 * Math.sin(tSec * s.tws + s.tw);
        const alpha = s.a * twinkle;
        const rgb =
          s.c === 0 ? "230, 240, 255" : s.c === 1 ? "59, 225, 255" : "124, 92, 255";
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    // ----- Logo intro: open mark fades in, rotated into the OPEN pose --------
    // A short, refined entrance for the open (horizontal) mark. Reduced-motion
    // never reaches here (active is false), so this is desktop/standard-motion
    // only. GSAP cleans these up automatically when killed in teardown below.
    //
    // The four rotating inner groups are SET to their OPEN angle here (left
    // ghost/lit → +90°, right ghost/lit → -90°, each about its glyph centre),
    // then their wrappers fade in. The divider stays hidden (scaleY 0, opacity
    // 0) until the close beat where it becomes the compact mark's centre bar.
    const introTweens: gsap.core.Tween[] = [];
    if (dividerRef.current && logoRef.current && ghostWrapRef.current) {
      // The OPEN (rotated, level) pose is carried by the static `transform`
      // attributes in the JSX (LEFT_OPEN_TF / RIGHT_OPEN_TF) — no rotation set is
      // needed here. The divider stays hidden until the close beat builds the
      // compact mark's centre bar.
      gsap.set(dividerRef.current, {
        scaleY: 0,
        opacity: 0,
        transformOrigin: "50% 50%",
        transformBox: "fill-box",
      });
      // Fade the open mark in (the ghost; the lit layer is gated by the clip-rect,
      // width 0 → grows with %), with a gentle scale settle on the wrapper.
      gsap.set(ghostWrapRef.current, { opacity: 0 });
      introTweens.push(
        gsap.to(ghostWrapRef.current, {
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
        }),
        gsap.fromTo(
          logoRef.current,
          { scale: 0.94 },
          {
            scale: 1,
            duration: 0.95,
            ease: "power3.out",
            transformOrigin: "50% 50%",
          },
        ),
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
    const signals = { fonts: false, load: false, tier: false, warm: false };
    const targetFraction = () => {
      // `warm` = the WebGL scene is actually rendering smoothly (WebGPU pipelines
      // compiled) — read live from introStore (set by PipelineWarmup). This is
      // what makes 100% TRUTHFUL: the counter rises to the high-80s on
      // fonts/load/tier, then HOLDS there while the shaders compile, and only
      // completes to 100 once they are genuinely warm.
      signals.warm = useIntroStore.getState().warmReady;
      const resolved =
        (signals.fonts ? 0.3 : 0) +
        (signals.load ? 0.29 : 0) +
        (signals.tier ? 0.29 : 0) +
        (signals.warm ? 0.12 : 0);
      const allReady =
        signals.fonts && signals.load && signals.tier && signals.warm;
      const elapsed = performance.now() - startedAt;
      const minElapsed = Math.min(elapsed / MIN_VISIBLE_MS, 1);
      if (allReady && minElapsed >= 1) return 1;
      // Never exceed ~90% until the shaders are genuinely warm — the counter
      // holds at the fonts/load/tier ceiling (~0.88) during compilation.
      return Math.min(resolved, 0.9);
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

      // Draw the starfield each frame from this single loop (no second rAF).
      drawStarfield((performance.now() - startedAt) / 1000);

      // Truthful target: driven ONLY by real readiness signals (incl. `warm`),
      // never a fixed timer — the counter genuinely waits for shader compilation.
      const target = targetFraction();
      current += (target - current) * COUNTER_EASE;
      // Snap the last sliver so we land cleanly on 100 (otherwise the ease
      // asymptotes at 99 forever). Relaxed from 0.999 → 0.99 so the readout
      // lands on 100 fast once the target is fully resolved.
      if (target >= 1 && current > 0.99) current = 1;

      const pct = Math.round(current * 100);
      setDisplay(pct);
      // Drive the LIT-layer reveal: the clipPath rect grows L→R across the wide
      // rotated mark, so the cyan→violet fill sweeps over the letters with %.
      if (fillRectRef.current) {
        fillRectRef.current.setAttribute("width", String(VB_W * current));
      }

      // Reveal as soon as the readout reads 100 AND the target is genuinely 1
      // (all readiness signals — fonts/load/tier/warm — plus min time satisfied).
      // We do NOT wait for the asymptotic `current >= 1` tail: under rAF
      // throttling (backgrounded tab, slow device, automation), rAF drops toward
      // ~1fps and the ease (`current += (target - current) * 0.12`) crawls across
      // the last sliver — so "100" would display while the overlay stayed up for
      // seconds (or until refocus). Triggering on `target >= 1` + rounded-100
      // makes the reveal fire the instant "100" shows, frame-rate-independent,
      // and never before genuine readiness (target < 1 ⇒ no reveal).
      if (target >= 1 && Math.round(current * 100) >= 100 && !revealed) {
        current = 1;
        if (fillRectRef.current) {
          fillRectRef.current.setAttribute("width", String(VB_W));
        }
        revealed = true;
        reveal();
        return;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    // ----- Last-resort watchdog (insurance, NOT the normal path) -----
    // The truthful `warm` signal completes the counter once the scene is
    // rendering smoothly. But if a device NEVER gets there (a GPU that genuinely
    // can't compile/render the scene), setTimeout fires off the macrotask queue —
    // independent of the (possibly starved) rAF — and hard-reveals so the visitor
    // is never trapped behind the curtain forever. It does NOT fake the counter to
    // 100 (honest): it just lifts the curtain at whatever the readout reached.
    const revealTimer = window.setTimeout(() => {
      if (cancelled || revealed) return;
      revealed = true;
      useIntroStore.getState().complete();
      restoreScroll();
      setActive(false); // unmount the overlay immediately (no wipe)
    }, WATCHDOG_MS);

    // ----- Hand-off: close → zoom → divider streak → curtain wipe up ---------
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

      // Make sure the fill is fully lit before we fold closed.
      if (fillRectRef.current) {
        fillRectRef.current.setAttribute("width", String(VB_W));
      }

      // The choreography master timeline. Each piece is null-guarded; if a ref
      // is missing the timeline still runs the curtain wipe via the final tween.
      const tl = gsap.timeline();

      // (a) CLOSE — fold the OPEN bar UP into the upright mark. ONE proxy drives
      //     BOTH glyphs identically: the centre slides open→compact and the angle
      //     rotates OPEN_ANGLE→0, so the pair "stands up" together (verso l'alto),
      //     stays level, and lands on the exact SERSAN mark (left S, divider,
      //     mirrored right S). No re-render fires during the close (the rAF
      //     counter has stopped), so these setAttribute writes are not clobbered.
      const fold = { t: 0 };
      const applyFold = () => {
        const t = fold.t;
        const lt = glyphTF(
          LEFT_OPEN_CX + (LEFT_CLOSED_CX - LEFT_OPEN_CX) * t,
          OPEN_ANGLE * (1 - t),
        );
        const rt = glyphTF(
          RIGHT_OPEN_CX + (RIGHT_CLOSED_CX - RIGHT_OPEN_CX) * t,
          OPEN_ANGLE * (1 - t),
        );
        leftLitRotRef.current?.setAttribute("transform", lt);
        rightLitRotRef.current?.setAttribute("transform", rt);
        leftGhostRotRef.current?.setAttribute("transform", lt);
        rightGhostRotRef.current?.setAttribute("transform", rt);
      };
      tl.to(
        fold,
        { t: 1, duration: 0.62, ease: "power3.inOut", onUpdate: applyFold },
        0,
      );
      if (ghostWrapRef.current) {
        tl.to(
          ghostWrapRef.current,
          { opacity: 0, duration: 0.32, ease: "power1.out" },
          0.22,
        );
      }

      // Bring the divider in as the closed mark's centre signal-bar.
      if (dividerRef.current) {
        tl.to(
          dividerRef.current,
          { scaleY: 1, opacity: 1, duration: 0.32, ease: "power2.out" },
          0.42,
        );
      }

      // (b) ZOOM — once closed, scale the whole compact mark UP toward the
      //     viewer (scale + slight blur on the wrapper). The OPACITY fade is
      //     applied to the lit glyphs + readout only (NOT the wrapper), so the
      //     divider streak — a sibling inside the same SVG — survives the zoom
      //     and stays visible into the curtain wipe (preserving the brand bridge
      //     into the scroll line).
      if (logoRef.current) {
        tl.to(
          logoRef.current,
          {
            scale: 2.4,
            filter: "blur(6px)",
            duration: 0.62,
            ease: "power2.in",
            transformOrigin: "50% 50%",
          },
          0.66,
        );
      }
      const fadeOnZoom = [litWrapRef.current, readoutRef.current].filter(
        Boolean,
      ) as (SVGGElement | HTMLDivElement)[];
      if (fadeOnZoom.length) {
        tl.to(
          fadeOnZoom,
          { opacity: 0, duration: 0.5, ease: "power2.in" },
          0.74,
        );
      }

      // (c) DIVIDER → signature line: brighten to accent cyan and streak/elongate
      //     downward as the curtain lifts — the eye reads the logo's signal-bar
      //     becoming the scroll line. Fires during/after the zoom.
      if (dividerRef.current) {
        tl.to(
          dividerRef.current,
          {
            scaleY: 6,
            y: 120,
            fill: "hsl(189 100% 62%)", // --accent cyan head of the signature line
            duration: WIPE_DURATION,
            ease: "expo.in",
            transformOrigin: "50% 50%",
            transformBox: "fill-box",
          },
          0.7,
        );
      }

      // Curtain wipe UP: the navy sheet lifts from the bottom, uncovering the
      // page (and the freshly-drawing line) — same motion as the route curtain.
      tl.fromTo(
        node,
        { clipPath: "inset(0% 0 0% 0)" },
        {
          clipPath: "inset(0% 0 100% 0)",
          duration: WIPE_DURATION,
          ease: "expo.inOut",
          onComplete: finish,
        },
        0.74,
      );

      introTweens.push(tl as unknown as gsap.core.Tween);
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
      clearTimeout(revealTimer);
      window.removeEventListener("resize", onResize);
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-bg"
      style={{ clipPath: "inset(0% 0 0% 0)" }}
    >
      {/* STARFIELD — deep-space background drawn into a DPR-aware canvas by the
          component's single rAF loop. Sits behind the logo content. */}
      <canvas
        ref={starCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      />

      {/* Corner index mark — the sober "52." / SERSAN tag, mono, dim. */}
      <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-2 sm:left-10 sm:top-10">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-mute"
          style={{ fontFamily: "var(--font-jbm), ui-monospace, monospace" }}
        >
          52.&nbsp;SERSAN
        </span>
      </div>

      {/* HERO: the SERSAN mark in its OPEN (horizontal) pose — the loading bar.
          Two stacked layers of the rotated mark: a dim GHOST (unfilled) and a
          cyan→violet LIT layer clipped by a L→R reveal rect driven by %.
          On hand-off the lit mark folds CLOSED back to upright, then zooms. */}
      <div ref={logoRef} className="flex flex-col items-center will-change-transform">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="SERSAN"
          className="h-[clamp(80px,17vw,124px)] w-auto"
          style={{ aspectRatio: `${VB_W} / ${VB_H}`, overflow: "visible" }}
        >
          <defs>
            <linearGradient id="preloader-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--accent))" />
              <stop offset="100%" stopColor="hsl(var(--accent-2))" />
            </linearGradient>
            <filter
              id="preloader-glow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="6"
                floodColor="hsl(189 100% 62%)"
                floodOpacity="0.55"
              />
            </filter>
            {/* Horizontal reveal: a rect grown L→R by `current` each frame. */}
            <clipPath id="preloader-reveal">
              <rect ref={fillRectRef} x="0" y="0" width="0" height={VB_H} />
            </clipPath>
          </defs>

          {/* Each glyph is ONE group carrying `translate(cx CY) rotate(angle)`
              (open pose = *_OPEN_TF; the close beat rewrites it), wrapping a
              static inner group that CENTRES the glyph at its own origin. The
              RIGHT inner group is mirrored (scale -1) so the closed pair is the
              real SERSAN symbol, not a doubled left-S. */}

          {/* GHOST layer — the unfilled rotated letters (dim). Hidden on first
              paint (opacity 0), faded in by the intro. */}
          <g ref={ghostWrapRef} style={{ opacity: 0 }}>
            <g ref={leftGhostRotRef} transform={LEFT_OPEN_TF}>
              <g transform={LEFT_INNER}>
                <path
                  d={LEFT_S_PATH}
                  fill="hsl(var(--ink) / 0.14)"
                  fillRule="evenodd"
                />
              </g>
            </g>
            <g ref={rightGhostRotRef} transform={RIGHT_OPEN_TF}>
              <g transform={RIGHT_INNER}>
                <path
                  d={LEFT_S_PATH}
                  fill="hsl(var(--ink) / 0.14)"
                  fillRule="evenodd"
                />
              </g>
            </g>
          </g>

          {/* LIT layer — same letters, cyan→violet gradient + glow, clipped by
              the L→R reveal so the fill sweeps with progress. Wrapped (litWrapRef)
              so it fades on the zoom while the divider streak — a SIBLING below —
              stays visible into the curtain wipe. */}
          <g
            ref={litWrapRef}
            clipPath="url(#preloader-reveal)"
            filter="url(#preloader-glow)"
          >
            <g ref={leftLitRotRef} transform={LEFT_OPEN_TF}>
              <g transform={LEFT_INNER}>
                <path
                  d={LEFT_S_PATH}
                  fill="url(#preloader-fill)"
                  fillRule="evenodd"
                />
              </g>
            </g>
            <g ref={rightLitRotRef} transform={RIGHT_OPEN_TF}>
              <g transform={RIGHT_INNER}>
                <path
                  d={LEFT_S_PATH}
                  fill="url(#preloader-fill)"
                  fillRule="evenodd"
                />
              </g>
            </g>
          </g>

          {/* Centre signal divider — hidden during the open pose (scaleY:0 +
              opacity:0 via intro set), brought in on close as the compact mark's
              bar, then streaks into the signature line on hand-off. */}
          <rect
            ref={dividerRef}
            x={DIVIDER_X - 2}
            y={CY - 100}
            width="4"
            height="200"
            fill="hsl(var(--accent-warm))"
            opacity="0"
          />
        </svg>

        {/* Subordinate readout: mono % counter + label beneath the mark. Wrapped
            (readoutRef) so it fades out on the zoom alongside the lit glyphs,
            leaving only the divider streak + curtain wipe. */}
        <div ref={readoutRef} className="flex flex-col items-center">
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

          <div
            className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--ink-dim))]"
            style={{ fontFamily: "var(--font-jbm), ui-monospace, monospace" }}
          >
            Initialising signal
          </div>
        </div>
      </div>
    </div>
  );
}

export default Preloader;

"use client";

/**
 * Preloader — the first-load curtain that resolves into the signature line.
 *
 * Shown ONCE per hard page load (it lives in the persistent root layout, which
 * App Router never remounts on soft navigations — so route changes keep using
 * the template.tsx curtain and never see this again). It is a deep-space load-in
 * for a regulated AI brand: a raw-WebGL PARTICLE TUNNEL backdrop (GreenSock
 * YzbPYMx TroisJS tunnel, ported raw-WebGL — see ./preloader-tunnel.ts; NO
 * three import, three stays in the lazy Scene chunk) sits behind the SERSAN
 * MARK: 50k additive soft-sprite points looping infinitely through z over a
 * navy→black radial base, pointer-tilted, zoom-blurred, in brand off-white/
 * cyan/blue. The tunnel's time coefficient breathes with load progress
 * (1 + eased·2) and slams to 100 inside the reveal (THE WARP) so tunnel
 * streak + zoom blur + mark zoom-through + overlay fade read as one jump into
 * the hero. If WebGL is unavailable, the previous 2D-canvas starfield (drifting +
 * twinkling stars + faint cyan/blue nebula glows) draws on the same canvas as
 * the fallback backdrop.
 *
 * THE MARK IS THE PROGRESS BAR. During load the two stencil S's are shown in an
 * OPEN, ~90°-rotated horizontal pose (laid wide and flat, side by side — the
 * "loading bar"). Two stacked layers of that rotated mark are drawn:
 *   (a) a GHOST layer — the rotated letter paths at low opacity (the unfilled
 *       portion of the bar);
 *   (b) a LIT layer — the same rotated paths filled with a cyan→blue linear
 *       gradient + accent glow, CLIPPED by a horizontal reveal <rect> whose
 *       width is driven L→R every frame by the eased `current` progress (0..1).
 * As the % climbs the cyan→blue fill sweeps left→right across the whole wide
 * rotated mark, "filling the letters". There is no separate thin progress bar.
 *
 * The mark's SVG is INLINED here (same path data + token colors as
 * src/components/sersan-logo.tsx — SymbolMark) so the two S `<path>`s and the
 * divider `<rect>` can be animated independently with GSAP.
 *
 * Progress is driven by REAL readiness, not a fake timer (mobile-parity plan
 * Phase 3.2 — "assets 0.70 + warm 0.30", Lusion's 70/30 split):
 *   - document.fonts.ready   0.25  (brand type swapped in — no FOUT flash)
 *   - window "load"          0.20  (the static SSR'd page + LCP poster painted)
 *   - tierStore.resolved     0.25  (WebGL tier decided; on full/lite the canvas
 *                                   mounts. On "off" WITHOUT reduced motion —
 *                                   no WebGL — there is no scene to wait on, so
 *                                   a RESOLVED "off" tier also counts as warm,
 *                                   Phase 3.1.1; the `resolved` flag is
 *                                   mandatory because tier defaults to "off"
 *                                   before resolve() runs)
 *   - introStore.warmProgress 0.30 × progress (0.5 once the scene's render
 *                                   objects are compiled via gl.compileAsync,
 *                                   1 once the smooth-frame heuristic flips
 *                                   introStore.warmReady — the TRUTH gate that
 *                                   keeps 100% honest)
 * Each resolved signal advances a target; a per-frame rAF eases the displayed
 * counter toward that target. The counter therefore climbs to ~70% on
 * assets/tier and BREATHES 70→100 with the warm-up instead of parking at one
 * value. NOTE: this changes the counter's RHYTHM on desktop too — the preloader
 * window is the one declared cross-device exception to "desktop byte-identical"
 * (plans/2026-08-17-mobile-parity.md, head + Phase 3.2); the render path after
 * the lift is untouched. A MIN visible time (~700ms; 350ms on a repeat visit in
 * the same tab session, see SESSION_SHORT) prevents a flash; a MAX watchdog
 * (~14s) guarantees a stuck GPU never traps the user.
 *
 * Hand-off (close → zoom-through → fade): at 100% the mark folds CLOSED (the
 * two rotated S's animate back from the OPEN horizontal pose to the UPRIGHT
 * compact mark — the SymbolMark layout, two vertical S's flanking the centered
 * divider), fully lit. The compact mark then ZOOMS toward the viewer and never
 * stops — one continuous power2.in acceleration (scale 1 → ~4, slight blur)
 * that flies PAST the camera while the ENTIRE overlay crossfades to
 * transparent, the tunnel still warping beneath the fade. The exit reads as
 * flying THROUGH the mark into the site: warp + zoom + crossfade, no wipe, no
 * hard edge. Through that beat introStore.complete() flips (SignatureLine
 * listens for the false→true edge and re-kicks its uReveal 0→1 draw-in), and
 * the vertical DIVIDER brightens to accent cyan and streaks/elongates downward
 * into the signature line, dissolving with the overlay — the eye reads the
 * logo's signal-bar becoming the scroll line.
 *
 * SSR-safe: the overlay only renders AFTER mount (a client effect sets `mounted`),
 * so the server HTML never contains it → no hydration mismatch, no layout shift.
 * Body scroll is locked while visible (Lenis is stopped + html overflow hidden)
 * and released on reveal.
 *
 * prefers-reduced-motion: NO counter animation / no morph / no tunnel or
 * starfield. The overlay never mounts; introStore is completed immediately so
 * the line draws in normally and scroll is never locked. The page just appears.
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
import {
  createPreloaderTunnel,
  type PreloaderTunnel,
} from "./preloader-tunnel";

// Timing envelope (ms). MIN keeps the loader from flashing on a warm cache.
const MIN_VISIBLE_MS = 700;
// Session-short (ERA's `sessionStorage.hasVisited`): a REPEAT hard load in the
// same tab session lowers the minimum visible time to MIN_VISIBLE_SHORT_MS —
// the readiness signals still gate 100% truthfully and the exit choreography
// (fold → zoom-through → divider streak → fade) is IDENTICAL; only the floor
// shrinks. Applies on desktop too (declared preloader-window exception).
// Owner decision 3 in plans/2026-08-17-mobile-parity.md — flip SESSION_SHORT to
// false to always play the full minimum. The key is separate from
// `sersan_skip_intro` (src/lib/intro-skip.ts), which has another purpose.
const SESSION_SHORT = true;
const SESSION_KEY = "sersan_seen";
const MIN_VISIBLE_SHORT_MS = 350;
// Bounded fallbacks for the two NETWORK-DEPENDENT polish signals. `fonts`
// (document.fonts.ready) and `load` (window "load") each depend on sub-resources
// that can stay PENDING forever on a single stuck request — a font woff2 the dev
// server is slow to compile, an image/iframe that never settles. When that
// happens the counter is trapped in the ~70s (only 3 of 4 signals resolve) until
// the watchdog. These signals are NICE-TO-HAVE (avoid a font-swap flash / confirm
// the static paint landed), NOT correctness gates — so each ALSO self-resolves
// after a short wait. `warm` (real GPU readiness) remains the only truthful gate
// on reaching 100%, so this does not reintroduce a fake 100%.
const FONTS_MAX_MS = 3000;
const LOAD_MAX_MS = 3500;
// LAST-RESORT safety only: if the scene never reports `warm` (a truly stuck GPU),
// reveal anyway so the visitor is never trapped. This is NOT the normal reveal
// path — the truthful `warm` signal completes the counter well before this. Now
// that fonts/load can no longer hang the counter (bounded above), the loader is
// only ever waiting on `warm` here, so this no longer needs the old 30s honesty
// budget — a still-cold GPU is uncovered at 90% well before a full minute of
// staring. Kept comfortably above MIN_WARM_MS + a few seconds of compile.
const WATCHDOG_MS = 14000;
// Counter easing toward its target each frame (fraction per ~16ms frame). Low
// enough to read as a smooth tick-up, high enough to feel responsive.
const COUNTER_EASE = 0.12;
// Exit fade duration (s) — the overlay's opacity 1→0 crossfade that uncovers
// the page while the mark keeps zooming through. Sized near template.tsx's
// 0.62s curtain beat so first-load and route-change hand-offs still share one
// motion tempo, even though this exit dissolves rather than wipes. The
// close+zoom choreography runs ~1.4s total, ending under this fade.
const FADE_DURATION = 0.7;

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
// the centre divider, the RIGHT S MIRRORED — centred. OPEN lays both S's FLAT &
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

// ---- Starfield (2D fallback backdrop — WebGL-unavailable path only) ---------
interface Star {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  r: number; // base radius (css px)
  a: number; // base alpha
  tw: number; // twinkle phase
  tws: number; // twinkle speed
  dx: number; // drift per second (css px), x
  dy: number; // drift per second (css px), y
  c: 0 | 1 | 2; // 0 white, 1 cyan-ish, 2 blue-ish
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
  // Backdrop canvas (sibling layer behind the logo, driven by the same rAF):
  // WebGL particle tunnel, or the 2D starfield when WebGL is unavailable.
  const backdropCanvasRef = useRef<HTMLCanvasElement>(null);
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

    // ----- Backdrop setup (drawn by the SAME single rAF loop below) ----------
    // Primary: raw-WebGL particle tunnel, a faithful port of the GreenSock
    // TroisJS pen (see ./preloader-tunnel.ts — no three import; three stays in
    // the lazy Scene chunk). Fallback: if `getContext("webgl")` is null, the
    // original 2D starfield draws on the same canvas element instead.
    const tunnel: PreloaderTunnel | null = backdropCanvasRef.current
      ? createPreloaderTunnel(backdropCanvasRef.current)
      : null;

    // 2D starfield fallback — precompute star positions ONCE; the draw loop
    // only advances cheap phases. Skipped entirely while the tunnel is live.
    const stars: Star[] = [];
    if (!tunnel) {
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
      const cv = backdropCanvasRef.current;
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
    if (!tunnel) sizeStarCanvas();
    // One resize handler for both backdrop paths: the tunnel refits its
    // drawing buffer + projection + FBO; the starfield re-sizes its 2d canvas.
    const onResize = () => (tunnel ? tunnel.resize() : sizeStarCanvas());
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

      // Faint cyan + blue nebula glows (brand tokens), low alpha, additive.
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
      // #3BE1FF cyan, #2A7FFF blue — slow breathe via tSec.
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
        "42, 127, 255", // was violet "124, 92, 255"; blue #2A7FFF
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
          s.c === 0 ? "230, 240, 255" : s.c === 1 ? "59, 225, 255" : "42, 127, 255"; // was violet "124, 92, 255"; blue #2A7FFF
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

    // ----- Session-short floor (see SESSION_SHORT) -----
    // Read ONCE on arm, try/catch-guarded for privacy mode / disabled storage
    // (treated as a first visit). The key is written inside reveal() below.
    let minVisibleMs = MIN_VISIBLE_MS;
    if (SESSION_SHORT) {
      try {
        if (window.sessionStorage.getItem(SESSION_KEY) === "1") {
          minVisibleMs = MIN_VISIBLE_SHORT_MS;
        }
      } catch {
        // Storage unavailable — full minimum.
      }
    }

    // ----- Real-readiness target (0..1) -----
    // Four independent signals; each contributes a weighted slice — assets 0.70
    // (fonts .25 + load .20 + tier .25) + warm 0.30 × warmProgress (plan Phase
    // 3.2, Lusion's 70/30). The counter never EXCEEDS the resolved fraction
    // (capped at 90% until all resolve), so it can't show 100 before the page
    // is genuinely ready — then it eases home. This is the declared
    // preloader-window rhythm change on desktop too.
    const signals = { fonts: false, load: false, tier: false, warm: false };
    const targetFraction = () => {
      // Phase 3.1.1: a RESOLVED `tier === "off"` without reduced motion (WebGL
      // unavailable — RM never mounts this overlay) has no Canvas, so
      // PipelineWarmup never runs and nothing would ever set warm: treat it as
      // warm. `resolved` is MANDATORY — tier defaults to "off" BEFORE resolve()
      // runs, and without the flag the counter would complete instantly on
      // every device.
      const ts = useTierStore.getState();
      const tierOff = ts.resolved && ts.tier === "off";
      // `warm` = the WebGL scene is actually rendering smoothly (WebGPU pipelines
      // compiled) — read live from introStore (set by PipelineWarmup). This is
      // what makes 100% TRUTHFUL: the counter rises to ~70% on fonts/load/tier,
      // BREATHES 70→100 with warmProgress (0.5 once gl.compileAsync resolved,
      // 1 once the smooth-frame heuristic fires) while the shaders compile, and
      // only completes to 100 once they are genuinely warm (warmReady).
      const intro = useIntroStore.getState();
      signals.warm = tierOff || intro.warmReady;
      const warmProgress = tierOff ? 1 : intro.warmProgress;
      const resolved =
        (signals.fonts ? 0.25 : 0) +
        (signals.load ? 0.2 : 0) +
        (signals.tier ? 0.25 : 0) +
        0.3 * warmProgress;
      const allReady =
        signals.fonts && signals.load && signals.tier && signals.warm;
      const elapsed = performance.now() - startedAt;
      const minElapsed = Math.min(elapsed / minVisibleMs, 1);
      if (allReady && minElapsed >= 1) return 1;
      // Never exceed ~90% until the shaders are genuinely warm — the counter
      // tops out at the assets ceiling (0.70) + the partial warm slice (0.85
      // once compileAsync resolved) during compilation.
      return Math.min(resolved, 0.9);
    };

    // Bounded fallbacks so a single stuck sub-resource (a font request the dev
    // server is slow to serve, an image/iframe that never settles) can never
    // trap the counter below 90% forever. Cleared in teardown.
    const fallbackTimers: number[] = [];

    // fonts.ready resolves when brand type is swapped (avoids the loader handing
    // off into a font-swap flash). Falls back gracefully if unsupported, and
    // self-resolves after FONTS_MAX_MS if the promise never settles.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) signals.fonts = true;
      });
      fallbackTimers.push(
        window.setTimeout(() => {
          signals.fonts = true;
        }, FONTS_MAX_MS),
      );
    } else {
      signals.fonts = true;
    }

    // window "load": the static SSR'd page has painted. Self-resolves after
    // LOAD_MAX_MS so a pending sub-resource can't hold the "load" event — and
    // with it the counter — hostage indefinitely.
    if (document.readyState === "complete") {
      signals.load = true;
    } else {
      const onLoad = () => {
        signals.load = true;
      };
      window.addEventListener("load", onLoad, { once: true });
      fallbackTimers.push(
        window.setTimeout(() => {
          signals.load = true;
        }, LOAD_MAX_MS),
      );
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

    // ----- Counter ease + reveal trigger + backdrop render (single rAF) -----
    let current = 0; // 0..1
    // Delta clock for the tunnel, clamped to 1/30s max (repo convention) so a
    // background-tab return never teleports the tunnel forward.
    let lastFrameT = performance.now();
    const frame = () => {
      if (cancelled) return;
      // Keep parking Lenis until the provider has created it (effect-order
      // safety, see the lock note above) — no-op once stopped.
      lenisStop();

      const now = performance.now();
      const delta = Math.min((now - lastFrameT) / 1000, 1 / 30);
      lastFrameT = now;

      if (!revealed) {
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
        // rotated mark, so the cyan→blue fill sweeps over the letters with %.
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
        if (target >= 1 && Math.round(current * 100) >= 100) {
          current = 1;
          if (fillRectRef.current) {
            fillRectRef.current.setAttribute("width", String(VB_W));
          }
          revealed = true;
          reveal();
          // NOTE: the loop deliberately KEEPS RUNNING (no return) so the
          // tunnel renders through the close/zoom/warp/curtain beats. Once
          // `revealed`, this branch never re-enters — no setDisplay, no fill
          // writes — so GSAP's setAttribute choreography in reveal() is never
          // clobbered by the counter.
        }
      }

      // Backdrop — SAME single loop, never a second rAF. During load the
      // tunnel breathes faster as the counter climbs (targetTimeCoef =
      // 1 + eased·2, subtle kinetic progress); reveal() slams the target to
      // 100 (THE WARP) on its own beat, so post-reveal frames only render.
      if (tunnel) {
        if (!revealed) tunnel.setTargetTimeCoef(1 + current * 2);
        tunnel.render(delta);
      } else {
        drawStarfield((now - startedAt) / 1000);
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
      // The visitor has already sat through the full watchdog window: mark the
      // session like a normal reveal would, so a repeat hard load in this tab
      // at least gets the shorter minimum floor (SESSION_SHORT) rather than
      // paying twice. Best effort.
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Storage unavailable — nothing to remember.
      }
      restoreScroll();
      setActive(false); // unmount the overlay immediately (no wipe)
    }, WATCHDOG_MS);

    // ----- Hand-off: close → zoom-through → divider streak → overlay fade ----
    function reveal() {
      // Flip the shared flag FIRST so SignatureLine re-kicks its uReveal 0→1 on
      // this exact beat — the fade below uncovers the line as it draws in.
      useIntroStore.getState().complete();

      // Session-short: remember that this tab session has seen the full
      // preloader once, so a repeat hard load uses the shorter minimum floor
      // (SESSION_SHORT). Best effort — privacy mode / disabled storage just
      // means the next load plays the full minimum again.
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Storage unavailable — nothing to remember.
      }

      const finish = () => {
        if (revealed && overlayRef.current) {
          // Belt-and-suspenders: never leave the overlay covering or capturing.
          gsap.set(overlayRef.current, {
            opacity: 0,
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
      // is missing the timeline still runs the overlay fade via the final tween.
      const tl = gsap.timeline();

      // (a) CLOSE — fold the OPEN bar UP into the upright mark. ONE proxy drives
      //     BOTH glyphs identically: the centre slides open→compact and the angle
      //     rotates OPEN_ANGLE→0, so the pair "stands up" together (verso l'alto),
      //     stays level, and lands on the exact SERSAN mark (left S, divider,
      //     mirrored right S). No re-render fires during the close (the rAF
      //     loop keeps rendering the tunnel but, once `revealed`, never writes
      //     counter/fill state), so these setAttribute writes are not clobbered.
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

      // THE WARP — the reference's hover behavior repurposed as the exit: at
      // 0.62, the moment the mark has folded closed and starts its zoom, the
      // tunnel's targetTimeCoef slams to 100. timeCoef lerps up at 0.02/frame,
      // so particle streaks + zoom blur (strength = timeCoef · 0.004) explode
      // together with the mark's zoom-through + overlay fade — one "jump into
      // the hero".
      tl.call(
        () => {
          tunnel?.setTargetTimeCoef(100);
        },
        undefined,
        0.62,
      );

      // (b) ZOOM-THROUGH — once closed, the compact mark accelerates toward
      //     the viewer in ONE continuous power2.in push (scale 1 → 4 + blur on
      //     the wrapper): it never settles on a landing scale, it flies PAST
      //     the camera while the overlay fade below dissolves everything — the
      //     exit is "flying through the mark into the site". The OPACITY fade
      //     here is applied to the lit glyphs + readout only (NOT the wrapper),
      //     so the divider streak — a sibling inside the same SVG — survives
      //     the zoom and stays visible into the overlay fade (preserving the
      //     brand bridge into the scroll line).
      if (logoRef.current) {
        tl.to(
          logoRef.current,
          {
            scale: 4,
            filter: "blur(10px)",
            duration: 0.78,
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
      //     downward as the overlay dissolves — the eye reads the logo's
      //     signal-bar becoming the scroll line. Fires during/after the zoom
      //     and fades out WITH the overlay (it is part of the sheet).
      if (dividerRef.current) {
        tl.to(
          dividerRef.current,
          {
            scaleY: 6,
            y: 120,
            fill: "hsl(189 100% 62%)", // --accent cyan head of the signature line
            duration: FADE_DURATION,
            ease: "expo.in",
            transformOrigin: "50% 50%",
            transformBox: "fill-box",
          },
          0.7,
        );
      }

      // EXIT FADE: the whole overlay (tunnel, mark, streak) crossfades to
      // transparent while the zoom keeps accelerating — no wipe, no hard edge.
      // The rAF loop keeps rendering the tunnel underneath this fade, so the
      // exit reads as warp + zoom + crossfade into the hero (and the
      // freshly-drawing line beneath).
      tl.to(
        node,
        {
          opacity: 0,
          duration: FADE_DURATION,
          ease: "power2.inOut",
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
      fallbackTimers.forEach((t) => clearTimeout(t));
      window.removeEventListener("resize", onResize);
      // Free every GL resource (buffers/textures/programs/FBO), remove the
      // pointer listener and lose the context — the tunnel never outlives the
      // overlay.
      tunnel?.dispose();
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
    >
      {/* BACKDROP — WebGL particle tunnel (2D starfield fallback) drawn into a
          DPR-capped canvas by the component's single rAF loop. The CSS radial
          beneath is the deep-space base the additive points composite over
          (the WebGL path clears transparent; the 2D fallback paints its own
          opaque base). Sits behind the logo content. */}
      <canvas
        ref={backdropCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #0B1422 0%, #070d18 55%, #02040a 100%)",
        }}
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
          cyan→blue LIT layer clipped by a L→R reveal rect driven by %.
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

          {/* LIT layer — same letters, cyan→blue gradient + glow, clipped by
              the L→R reveal so the fill sweeps with progress. Wrapped (litWrapRef)
              so it fades on the zoom while the divider streak — a SIBLING below —
              stays visible into the exit fade. */}
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
            leaving only the divider streak dissolving in the exit fade. */}
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

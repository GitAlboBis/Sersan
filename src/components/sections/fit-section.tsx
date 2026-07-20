"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * FitSection — "Verdict beats" (cards/scroll refactor, V3 addendum).
 *
 * A triage sequence: SIX scrubbed beats, one per GOOD-FIT / NOT-A-FIT pair
 * (index i pairs GOOD_FIT[i] with NOT_A_FIT[i]). "Selective on purpose"
 * made cinematic — every beat delivers one verdict:
 *
 *   - LEFT (the star): the good-fit statement in LARGE display serif,
 *     revealed with y/opacity inside the beat's window; its ✓ medallion
 *     boils open through an SVG displacement mask (feTurbulence →
 *     feDisplacementMap over a white circle whose radius is scrubbed
 *     0→final; cyan glow ring is a static box-shadow, no extra filter).
 *   - RIGHT (the judgment): the counterpart in mono, appears mid-window
 *     already readable, then a TORN REDACTION BAR (same displacement chain
 *     + feMorphology dilate for the chunky edge) sweeps across it late in
 *     the window; the row tilts ~−2°, dims to ~0.45 and a small mono ✗
 *     medallion stamps in — struck.
 *   - ACCUMULATION (the payoff): when beat i completes, its pair collapses
 *     upward into two compact ledger rows (small mono, ✓ cyan / ✗ struck)
 *     stacked under the "Good fit" / "Not a fit" labels at the top of each
 *     half. By the final beat both ledgers are complete on screen — the
 *     section's final state IS the summary. Ledger entrances are filter-free.
 *
 * MECHANICS (same binding contract as case-studies-rail / services-section):
 *   - CSS `position: sticky` pins the viewport frame; the runway height is a
 *     px value set by measure() (100vh + 6×70vh — pure vh, content-agnostic,
 *     a font swap can never change document height). NO ScrollTrigger `pin:`
 *     (a pin-spacer would re-parent the section and break every
 *     [data-line-anchor] measurement). ONE runway ScrollTrigger, start
 *     "top top", end "bottom bottom", invalidateOnRefresh,
 *     onRefreshInit: measure, onRefresh → immediate snap.
 *   - POV smoothing (template-2 discipline, same idiom as the services POV
 *     pan): the scrub NEVER writes block transforms directly — it feeds
 *     windowed targets into per-block gsap.quickTo chasers (y/opacity/
 *     rotation/scale, ~0.8s expo) with identical-value skipping.
 *     Discontinuities (refresh, restored scroll) go through the immediate
 *     path (quickTo's `start` parameter parks the chaser AT the value).
 *   - SVG attribute writes (medallion radius, bar x) are integer-quantized
 *     direct writes with identical-value skipping — every accepted write
 *     re-rasterizes the displacement filter on the CPU. Windows are laid
 *     out so at most the ACTIVE beat's medallion OR bar animates at any
 *     playhead position (filter concurrency ≤ 2 site budget: honored with
 *     room to spare); completed beats' values park and stop writing.
 *   - ALL per-frame values derive analytically from the single trigger
 *     progress — zero getBoundingClientRect in the loop.
 *   - Velocity skew: the center stage shears skewX = clamp(v·k, ±3°),
 *     damped to 0 at rest by a gsap.ticker writer that early-returns once
 *     parked (velocity-derived → damped; position-derived → direct).
 *   - Chrome: big mono counter "01 / 06" + a thin scrub progress line with
 *     beat ticks track the active beat.
 *
 * SEMANTICS / A11Y: the LEDGER is the real, screen-reader-facing content
 * (two labelled lists — exactly the v1 structure); the center-stage theater
 * is aria-hidden (it duplicates the same 12 strings visually). SSR renders
 * the pinned markup with the beat-0 pose painted inline (good statement 0
 * visible, its medallion open; everything else parked hidden), so the first
 * pinned frame is never empty. Copy is byte-identical to v1 (12 statements,
 * eyebrow/title/description, column labels, closing line).
 *
 * MODES: pinned (SSR default — desktop, fine pointer, no reduced-motion) /
 * native (≤768px, coarse pointer, prefers-reduced-motion): the v1 static
 * two-column lists — medallions open, no bars, no filters animating, no
 * pinning. Keyboard: focusin inside a beat converts to the beat's lock
 * scroll position through Lenis (null-guarded) — same convention as the
 * rails. The `id="fit"` anchor + page.tsx [data-line-anchor="fit"] wrapper
 * semantics are unchanged.
 *
 * The title's italic span keeps the v1 pose transition (invisible centered
 * proxy → real layout slot, measured once per refresh, never per frame): the
 * heading lives in normal flow ABOVE the runway, so the pose scrub composes
 * cleanly with the pin.
 */

const GOOD_FIT_EN = [
  "You have a real workflow with cost or revenue tied to it.",
  "You have an internal owner who'll run the system after handover.",
  "You're moving prototype → production, or hardening live AI.",
  "You're regulated (or about to be) and want to be ready.",
  "You're technical, or have technical authority on the team.",
  "You can budget for senior engineering, not just license costs.",
];

const GOOD_FIT_IT = [
  "Avete un workflow reale con costi o ricavi che ne dipendono.",
  "Avete un referente interno che gestirà il sistema dopo il passaggio di consegne.",
  "State portando un prototipo in produzione, o irrobustendo un'AI già live.",
  "Siete regolamentati (o lo sarete a breve) e volete farvi trovare pronti.",
  "Siete tecnici, o avete autorità tecnica nel team.",
  "Potete mettere a budget ingegneria senior, non solo i costi di licenza.",
];

const NOT_A_FIT_EN = [
  "You want a chatbot gimmick for a press release.",
  "No internal owner, no roadmap, no operational plan.",
  "You're at the slide-deck stage with no engineering budget.",
  "You want to skip compliance to ship faster.",
  "You need a partner to convince your CTO this is a good idea.",
  "“Can you do it for equity?”",
];

const NOT_A_FIT_IT = [
  "Volete un chatbot d'effetto per un comunicato stampa.",
  "Nessun referente interno, nessuna roadmap, nessun piano operativo.",
  "Siete alla fase di slide-deck, senza budget per l'ingegneria.",
  "Volete saltare la compliance per rilasciare più in fretta.",
  "Vi serve un partner per convincere il vostro CTO che sia una buona idea.",
  "«Lo fareste in cambio di equity?»",
];

/* ------------------------------------------------------------------ *
 *  Beat choreography constants.
 *
 *  Beat space: progress × BP_MAX, where beat i owns [i, i+1] plus the
 *  shared overlap margins. TAIL gives beat 6's collapse room to finish
 *  before the sticky releases (it does NOT change the runway height —
 *  each beat simply gets 6/6.35 of its nominal 70vh of scroll).
 * ------------------------------------------------------------------ */

const BEATS = 6;
/** Runway = 100vh + BEATS×70vh, set in px by measure() (binding). */
const BEAT_VH = 0.7;
const TAIL = 0.35;
const BP_MAX = BEATS + TAIL;

/** Beat i's GOOD statement enters this early (overlaps the previous
 *  beat's collapse so the sequence flows rather than steps). Beat 0 is
 *  pre-entered (SSR paints it) — the stage is never empty at pin-in. */
const IN_LEAD = 0.12;
const IN_DUR = 0.4;
/** Medallion opens inside the enter window (after the block is moving). */
const MED_START = 0.04;
/** BAD statement appears mid-window, already readable... */
const BAD_IN_START = 0.2;
const BAD_IN_DUR = 0.28;
/** ...then the torn bar sweeps it late in the window. */
const STRIKE_START = 0.56;
const STRIKE_DUR = 0.3;
const STRIKE_DIM = 0.55; // struck row settles at opacity ≈ 0.45
const STRIKE_TILT_DEG = 2;
/** The mono ✗ stamps as the bar lands. */
const X_START = 0.68;
const X_DUR = 0.2;
/** Collapse window — overlaps the NEXT beat's enter ([0.88, 1.22] vs the
 *  next beat's [0.88, 1.28] enter span): crossfade, never a hard cut. */
const OUT_START = 0.88;
const OUT_DUR = 0.34;
/** Ledger rows pop as the pair flies out (filter-free entrances). */
const LEDGER_START = 0.96;
const LEDGER_DUR = 0.26;

/** Block travel (px): enter rises from below, collapse flies up toward
 *  the ledger at the top of the frame. */
const GOOD_Y_IN = 44;
const BAD_Y_IN = 28;
const Y_OUT = 52;
/** Blocks shrink slightly as they collapse into the ledger. */
const COLLAPSE_SCALE = 0.08;

/** Medallion viewBox is 200×200; the disc is r=88. Final mask radius must
 *  cover disc + stroke + the ±40 displacement excursion of the edge. */
const MEDALLION_R_FINAL = 140;

/** Redaction bar viewBox (stretched over the row pill, aspect-agnostic).
 *  The rect is wider than the viewBox by BAR_PAD per side so the resting
 *  cover clips straight at both viewBox edges; only the LEADING (right)
 *  edge is ever the visible torn one while it sweeps left→right in. */
const BAR_W = 400;
const BAR_H = 64;
const BAR_PAD = 48;
const BAR_RECT_W = BAR_W + BAR_PAD * 2;
/** Rest-out x: fully off-left including the displacement excursion. */
const BAR_X_START = -(BAR_RECT_W + 40);
/** Swept-in x: covers the viewBox with torn-edge margin on both sides. */
const BAR_X_END = -BAR_PAD;

/** Velocity skew on the center stage (rail idiom: clamped, ticker-damped). */
const SKEW_MAX_DEG = 3;
const SKEW_DEG_PER_PXS = 0.0015;

/** focusin → scroll lock point inside a beat (bad row revealed, pre-strike). */
const FOCUS_LOCK_AT = 0.5;

/** Title pose: starting scale of the italic span at the centered proxy. */
const POSE_SCALE = 1.4;
/** Pose scrub window as a viewport-height fraction (explicit px `end`). */
const POSE_WINDOW_VH = 0.35;

/** Clamped smoothstep — C1 at both ends of every window (repo convention:
 *  scrubbed beats must be C1 at their boundaries). */
function ss01(t: number) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/** Integer-quantized SVG attribute writer. Quantizing (a) matches the
 *  template's discrete attr interpolation and (b) lets us skip identical
 *  writes — every accepted write re-rasterizes the displacement filter. */
function quantizedAttrWriter(el: Element | null, attr: string) {
  if (!el) return () => {};
  let last = Number.NaN;
  return (value: number) => {
    const q = Math.round(value);
    if (q === last) return;
    last = q;
    el.setAttribute(attr, String(q));
  };
}

type ChaseWriter = (value: number, immediate?: boolean) => void;

/** POV chaser (template-2 discipline): the scrub re-targets a persistent
 *  gsap.quickTo; the chaser absorbs windowed-target discontinuities.
 *  Identical targets are skipped (the writer parks at rest). The immediate
 *  path passes the value as quickTo's `start` too, which parks the chaser
 *  AT the value in one render — no mid-flight tween can overwrite a snap. */
function makeChase(
  el: Element | null,
  prop: string,
  duration: number,
  ease: string,
): ChaseWriter {
  if (!el) return () => {};
  const to = gsap.quickTo(el, prop, { duration, ease });
  let last = Number.NaN;
  return (value, immediate = false) => {
    if (!immediate && Math.abs(value - last) < 0.001) return;
    last = value;
    if (immediate) to(value, value);
    else to(value);
  };
}

/**
 * ✓/✗ medallion. A white circle inside a <mask>, displaced by a static
 * fractal-noise field; the scrub grows `r` from `initialRadius` so the
 * medallion boils into existence. Ids sanitized from useId (duplicated ids
 * silently break masks). The native fallback keeps the default (open) —
 * only the pinned stage arms closed medallions (beats 1+).
 */
function FitMedallion({
  kind,
  className = "mt-2 h-[22px] w-[22px] shrink-0",
  initialRadius = MEDALLION_R_FINAL,
}: {
  kind: "good" | "warn";
  className?: string;
  initialRadius?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `fit-medal-f-${uid}`;
  const maskId = `fit-medal-m-${uid}`;
  const good = kind === "good";
  const tone = good ? "hsl(var(--accent))" : "hsl(36 84% 62%)";
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className}>
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="200"
          height="200"
        >
          <circle
            data-fit-mask
            cx="100"
            cy="100"
            r={initialRadius}
            style={{ fill: "#fff", filter: `url(#${filterId})` }}
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <circle
          cx="100"
          cy="100"
          r="88"
          strokeWidth="6"
          style={{
            fill: good ? "hsl(var(--accent) / 0.15)" : "hsl(36 84% 56% / 0.1)",
            stroke: good
              ? "hsl(var(--accent) / 0.5)"
              : "hsl(36 84% 56% / 0.32)",
          }}
        />
        {good ? (
          <path
            d="M62 104 L90 132 L140 72"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ fill: "none", stroke: tone }}
          />
        ) : (
          <path
            d="M72 72 L128 128 M128 72 L72 128"
            strokeWidth="12"
            strokeLinecap="round"
            style={{ fill: "none", stroke: tone }}
          />
        )}
      </g>
    </svg>
  );
}

/**
 * Torn redaction bar (built locally — the shared fx/redacted-reveal stays
 * untouched). An ink rect stretched over the bad statement; the scrub
 * slides `x` from off-left to covering, through turbulence → displacement
 * → feMorphology(dilate 2), so the advancing RIGHT edge reads as paper
 * tearing across the sentence. SSR ships x = BAR_X_START (bar off, text
 * readable — the beat block's own opacity hides it pre-window anyway).
 */
function TornStrikeBar() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `fit-tear-${uid}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${BAR_W} ${BAR_H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            result="noise"
          />
          {/* Displacement is tuned below the medallion's 40: the bar's
              viewBox is non-uniformly stretched over a shallow pill, so 40
              user-units would shred half the bar height. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displacement"
          />
          <feMorphology operator="dilate" radius="2" in="displacement" />
        </filter>
      </defs>
      <rect
        data-fit-bar
        x={BAR_X_START}
        y="3"
        width={BAR_RECT_W}
        height={BAR_H - 6}
        rx="4"
        style={{
          fill: "hsl(var(--ink) / 0.92)",
          filter: `url(#${filterId})`,
        }}
      />
    </svg>
  );
}

export default function FitSection() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const goodFit = isEn ? GOOD_FIT_EN : GOOD_FIT_IT;
  const notAFit = isEn ? NOT_A_FIT_EN : NOT_A_FIT_IT;

  // SSR default = pinned markup (beat-0 pose inline) so the statements are
  // in the initial HTML — same convention as the rails / services pan.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);

  const headingRef = useRef<HTMLDivElement | null>(null);
  const poseProxyRef = useRef<HTMLSpanElement | null>(null);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  // React detaches runwayRef on a pinned→native flip, but the DOM node itself
  // can survive (see the mode-flip effect below), and measure() writes an
  // inline px height that React never owns and therefore never clears. This
  // second ref is written only on attach, never nulled, so the flip handler
  // still has a handle on the node it must release.
  const runwayNodeRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const skewRef = useRef<HTMLDivElement | null>(null);

  // Subscribed, not sampled: a window resized under 768px (or devtools docked
  // sideways, or OS reduced-motion flipped mid-session) must flip the layout
  // mode, otherwise the pinned two-column theater stays on a viewport that has
  // no narrow-width variant.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    const sync = () => {
      setMode(qs.some((q) => q.matches) ? "native" : "pinned");
      setDetected(true);
    };
    sync();
    qs.forEach((q) => q.addEventListener("change", sync));
    return () => qs.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  // Verdict-beats scrub — pinned mode only, after detection settles.
  // isEn is a dep on purpose: the EN↔IT toggle swaps copy in place (and
  // remounts the SectionHeading <h2>), so the whole choreography rebuilds,
  // re-resolves the pose span and re-measures (cheap, rare).
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const headingWrap = headingRef.current;
    const proxy = poseProxyRef.current;
    const runway = runwayRef.current;
    const sticky = stickyRef.current;
    const skewWrap = skewRef.current;
    if (!headingWrap || !runway || !sticky || !skewWrap) return;

    /* ---- Collect targets ONCE (no per-frame queries) ----------------- */

    const beatEls = Array.from(
      sticky.querySelectorAll<HTMLElement>("[data-fit-beat]"),
    );
    const lgEls = Array.from(
      sticky.querySelectorAll<HTMLElement>("[data-fit-ledger-good]"),
    );
    const lwEls = Array.from(
      sticky.querySelectorAll<HTMLElement>("[data-fit-ledger-warn]"),
    );
    const counterEl = sticky.querySelector<HTMLElement>("[data-fit-counter]");
    const lineEl = sticky.querySelector<HTMLElement>("[data-fit-line]");
    if (beatEls.length === 0) return;

    interface BeatCtl {
      els: (HTMLElement | null)[];
      writeMask: (v: number) => void;
      writeBar: (v: number) => void;
      goodO: ChaseWriter;
      goodY: ChaseWriter;
      goodSX: ChaseWriter;
      goodSY: ChaseWriter;
      badO: ChaseWriter;
      badY: ChaseWriter;
      badR: ChaseWriter;
      badSX: ChaseWriter;
      badSY: ChaseWriter;
      xO: ChaseWriter;
      xSX: ChaseWriter;
      xSY: ChaseWriter;
      lgO: ChaseWriter;
      lgY: ChaseWriter;
      lwO: ChaseWriter;
      lwY: ChaseWriter;
    }

    const beats: BeatCtl[] = beatEls.map((el, i) => {
      const goodEl = el.querySelector<HTMLElement>("[data-fit-good]");
      const badEl = el.querySelector<HTMLElement>("[data-fit-bad]");
      const xEl = el.querySelector<HTMLElement>("[data-fit-x]");
      const mask = el.querySelector<SVGCircleElement>("[data-fit-mask]");
      const bar = el.querySelector<SVGRectElement>("[data-fit-bar]");
      const lgEl = lgEls[i] ?? null;
      const lwEl = lwEls[i] ?? null;

      // Prime the FULL transform of every chaser target BEFORE creating the
      // quickTo writers (repo convention: unrecorded components trip "not
      // eligible for reset"). This is also the arm: the SSR markup ships the
      // beat-0 pose; every other beat parks at its progress-0 pose here, and
      // the init snap below re-syncs any restored mid-page scroll position.
      if (goodEl) {
        gsap.set(goodEl, {
          y: i === 0 ? 0 : GOOD_Y_IN,
          opacity: i === 0 ? 1 : 0,
          scaleX: 1,
          scaleY: 1,
          transformOrigin: "50% 50%",
        });
      }
      if (badEl) {
        gsap.set(badEl, {
          y: BAD_Y_IN,
          opacity: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          transformOrigin: "50% 50%",
        });
      }
      if (xEl) {
        gsap.set(xEl, {
          opacity: 0,
          scaleX: 0.6,
          scaleY: 0.6,
          transformOrigin: "50% 50%",
        });
      }
      if (lgEl) gsap.set(lgEl, { y: 10, opacity: 0 });
      if (lwEl) gsap.set(lwEl, { y: 10, opacity: 0 });

      const writeMask = quantizedAttrWriter(mask, "r");
      const writeBar = quantizedAttrWriter(bar, "x");
      writeMask(i === 0 ? MEDALLION_R_FINAL : 0);
      writeBar(BAR_X_START);

      return {
        els: [goodEl, badEl, xEl, lgEl, lwEl],
        writeMask,
        writeBar,
        goodO: makeChase(goodEl, "opacity", 0.8, "expo"),
        goodY: makeChase(goodEl, "y", 0.8, "expo"),
        goodSX: makeChase(goodEl, "scaleX", 0.8, "expo"),
        goodSY: makeChase(goodEl, "scaleY", 0.8, "expo"),
        badO: makeChase(badEl, "opacity", 0.8, "expo"),
        badY: makeChase(badEl, "y", 0.8, "expo"),
        badR: makeChase(badEl, "rotation", 0.8, "expo"),
        badSX: makeChase(badEl, "scaleX", 0.8, "expo"),
        badSY: makeChase(badEl, "scaleY", 0.8, "expo"),
        xO: makeChase(xEl, "opacity", 0.4, "power2.out"),
        xSX: makeChase(xEl, "scaleX", 0.5, "back.out(2)"),
        xSY: makeChase(xEl, "scaleY", 0.5, "back.out(2)"),
        lgO: makeChase(lgEl, "opacity", 0.5, "power2.out"),
        lgY: makeChase(lgEl, "y", 0.5, "power2.out"),
        lwO: makeChase(lwEl, "opacity", 0.5, "power2.out"),
        lwY: makeChase(lwEl, "y", 0.5, "power2.out"),
      };
    });

    /* ---- Chrome writers (direct, identical-value skipped) ------------ */

    let lastActive = -1;
    const setLine = lineEl ? gsap.quickSetter(lineEl, "scaleX") : null;
    if (lineEl) gsap.set(lineEl, { transformOrigin: "0% 50%", scaleX: 0 });
    let lastLineQ = -1;

    /* ---- The one analytic frame function ------------------------------ *
     * Everything derives from the single trigger progress. quickTo chasers
     * + quantized attr writers both skip identical values, so parked beats
     * cost a handful of float compares per frame and zero writes.          */
    const applyAll = (progress: number, immediate: boolean) => {
      const bp = progress * BP_MAX;
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const u = bp - i;

        // GOOD — enter from below, hold, collapse up into the ledger.
        const eIn = i === 0 ? 1 : ss01((u + IN_LEAD) / IN_DUR);
        const eOut = ss01((u - OUT_START) / OUT_DUR);
        const collapse = 1 - COLLAPSE_SCALE * eOut;
        b.goodO(eIn * (1 - eOut), immediate);
        b.goodY((1 - eIn) * GOOD_Y_IN - eOut * Y_OUT, immediate);
        b.goodSX(collapse, immediate);
        b.goodSY(collapse, immediate);
        // Medallion boils open inside the enter window (beat 0 ships open —
        // its SSR pose is the painted first frame). Monotonic in u: it stays
        // open through the collapse and reverses cleanly when scrubbing up.
        b.writeMask(
          i === 0
            ? MEDALLION_R_FINAL
            : MEDALLION_R_FINAL * ss01((u - MED_START) / IN_DUR),
        );

        // BAD — readable mid-window, then torn-redacted + tilted + dimmed.
        const bIn = ss01((u - BAD_IN_START) / BAD_IN_DUR);
        const sT = ss01((u - STRIKE_START) / STRIKE_DUR);
        b.badO(bIn * (1 - STRIKE_DIM * sT) * (1 - eOut), immediate);
        b.badY((1 - bIn) * BAD_Y_IN - eOut * Y_OUT, immediate);
        b.badR(-STRIKE_TILT_DEG * sT, immediate);
        b.badSX(collapse, immediate);
        b.badSY(collapse, immediate);
        b.writeBar(BAR_X_START + (BAR_X_END - BAR_X_START) * sT);

        // ✗ stamp — filter-free pop as the bar lands.
        const xT = ss01((u - X_START) / X_DUR);
        b.xO(xT, immediate);
        b.xSX(0.6 + 0.4 * xT, immediate);
        b.xSY(0.6 + 0.4 * xT, immediate);

        // Ledger rows — the accumulation payoff (filter-free entrances).
        const lT = ss01((u - LEDGER_START) / LEDGER_DUR);
        b.lgO(lT, immediate);
        b.lgY((1 - lT) * 10, immediate);
        b.lwO(lT, immediate);
        b.lwY((1 - lT) * 10, immediate);
      }

      // Counter tracks the active beat; textContent swap only on change.
      const active = Math.min(BEATS - 1, Math.max(0, Math.floor(bp)));
      if (active !== lastActive && counterEl) {
        lastActive = active;
        counterEl.textContent = String(active + 1).padStart(2, "0");
      }
      // Progress line — quantized so parked frames write nothing.
      if (setLine) {
        const q = Math.round(progress * 512) / 512;
        if (q !== lastLineQ) {
          lastLineQ = q;
          setLine(q);
        }
      }
    };

    /* ---- Velocity skew (rail idiom: clamped target, ticker-damped) ---- */

    const setSkew = gsap.quickSetter(skewWrap, "skewX", "deg");
    gsap.set(skewWrap, { skewX: 0 });
    let skewValue = 0;
    let velTarget = 0;

    const skewTick = (_time: number, deltaTime: number) => {
      const dt = Math.min(0.05, deltaTime / 1000);
      // Decay the raw target: onUpdate re-feeds it while Lenis is moving, so
      // this only bites once scrolling stops.
      velTarget *= Math.exp(-5 * dt);
      const next =
        skewValue + (velTarget - skewValue) * (1 - Math.exp(-10 * dt));
      if (Math.abs(next) < 0.005 && Math.abs(velTarget) < 0.005) {
        if (skewValue !== 0) {
          skewValue = 0;
          setSkew(0); // snap to exactly 0 once, then stop writing
        }
        return;
      }
      skewValue = next;
      setSkew(skewValue);
    };
    gsap.ticker.add(skewTick);

    /* ---- Measurement (measure-time only; the loop reads caches) ------- */

    let travel = 0;
    let secTop = 0;

    const measure = () => {
      // Flatten the shear before anything reads layout.
      setSkew(0);
      skewValue = 0;
      velTarget = 0;
      const vh = window.innerHeight;
      // Content-agnostic runway: 100vh + 6×70vh in px (a font swap can
      // never change document height → no downstream anchor drift).
      travel = Math.round(vh * BEATS * BEAT_VH);
      runway.style.height = `${vh + travel}px`;
      secTop = runway.getBoundingClientRect().top + window.scrollY;
    };
    measure();

    /* ---- Title pose: centered/1.4× proxy → real layout slot ----------- */

    // The italic span lives inside SectionHeading's <h2>, which SplitText
    // temporarily rewraps (and may orphan on revert / language swap), so the
    // node is re-resolved whenever the cached one leaves the document —
    // an O(1) isConnected check per write, never a per-frame rect read.
    let poseSpan: HTMLElement | null = null;
    let setPose: ReturnType<typeof gsap.quickSetter> | null = null;
    const ensureSpan = () => {
      if (poseSpan && poseSpan.isConnected) return;
      poseSpan = headingWrap.querySelector<HTMLElement>("[data-fit-pose]");
      setPose = poseSpan ? gsap.quickSetter(poseSpan, "css") : null;
    };

    const pose = { dx: 0, dy: 0 };
    const poseProps = { x: 0, y: 0, scale: 1 };
    const applyPose = (p: number) => {
      ensureSpan();
      if (!setPose) return;
      const inv = 1 - p;
      poseProps.x = pose.dx * inv;
      poseProps.y = pose.dy * inv;
      poseProps.scale = 1 + (POSE_SCALE - 1) * inv;
      setPose(poseProps);
    };

    // Measured ONCE per refresh (onRefreshInit), with the span's transform
    // flattened first — rects include transforms. Scaling happens about the
    // span's center, so the deltas are scale-independent.
    const measurePose = () => {
      ensureSpan();
      if (!poseSpan || !proxy) return;
      gsap.set(poseSpan, { x: 0, y: 0, scale: 1 });
      const sr = poseSpan.getBoundingClientRect();
      const pr = proxy.getBoundingClientRect();
      pose.dx = pr.left + pr.width / 2 - (sr.left + sr.width / 2);
      pose.dy = pr.top + pr.height / 2 - (sr.top + sr.height / 2);
    };
    measurePose();

    // Arm the starting pose imperatively BEFORE the trigger exists — a scrub
    // sync onto a playhead already at the target progress never renders, so
    // applyPose would not run until the first tick past `start` (a visible
    // teleport of the italic span). The trigger below re-syncs any restored
    // mid-page scroll position.
    applyPose(0);

    const poseState = { p: 0 };
    const poseTween = gsap.fromTo(
      poseState,
      { p: 0 },
      { p: 1, ease: "none", onUpdate: () => applyPose(poseState.p) },
    );

    const stPose = ScrollTrigger.create({
      trigger: headingWrap,
      start: "clamp(top bottom-=10%)",
      end: () => "+=" + Math.round(window.innerHeight * POSE_WINDOW_VH),
      scrub: true, // raw — Lenis is the only smoother (double-smoothing gotcha)
      animation: poseTween,
      invalidateOnRefresh: true,
      onRefreshInit: measurePose,
      // measurePose flattens the span's transform to read clean rects; if the
      // refresh leaves progress unchanged the scrub never re-renders, so
      // re-apply the last scrubbed pose explicitly (idempotent with onUpdate).
      onRefresh: () => applyPose(poseState.p),
    });

    /* ---- The runway trigger (ONE, no pin:, no scrub tween) ------------ */

    const st = ScrollTrigger.create({
      trigger: runway,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      // Post-refresh (resize, spine bursts): snap — a smoothed glide across
      // a re-measured layout reads as drift, not intent.
      onRefresh: (self) => applyAll(self.progress, true),
      onUpdate: (self) => {
        applyAll(self.progress, false);
        // Velocity-skew target — re-fed on every scroll frame, decayed by
        // the ticker so the shear dies at rest. Gated to the active scrub
        // window (getVelocity is page-wide; a parked stage must never shear).
        const scrubbing = self.progress > 0.0005 && self.progress < 0.9995;
        velTarget = scrubbing
          ? gsap.utils.clamp(
              -SKEW_MAX_DEG,
              SKEW_MAX_DEG,
              self.getVelocity() * SKEW_DEG_PER_PXS,
            )
          : 0;
      },
    });
    // Init snap: covers a reload that restores a scroll position inside the
    // runway — no fly-in from the beat-0 pose.
    applyAll(st.progress, true);

    /* ---- Keyboard: focusin inside a beat → its lock scroll position ---- */

    const onFocusIn = (e: FocusEvent) => {
      const beat = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-fit-beat]",
      );
      if (!beat) return;
      // Undo the browser's auto-scroll of the overflow:hidden sticky frame
      // BEFORE anything reads layout.
      sticky.scrollTop = 0;
      sticky.scrollLeft = 0;
      const idx = Number(beat.dataset.fitBeat ?? 0);
      const targetY = secTop + travel * ((idx + FOCUS_LOCK_AT) / BP_MAX);
      if (Math.abs(window.scrollY - targetY) < 2) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    sticky.addEventListener("focusin", onFocusIn);

    // Late re-measure once webfonts land AND SectionHeading's SplitText
    // intro has reverted (~1.6s): the display serif changes both the pose
    // span's slot and the heading's height above the runway. The provider
    // deliberately never refreshes ScrollTrigger on "/", so the section owns
    // this one-shot (refresh() is global and idempotent — the rails' own
    // onRefreshInit measures self-heal on the same pass).
    let cancelled = false;
    let fontTimer = 0;
    document.fonts?.ready
      .then(() => {
        if (cancelled) return;
        fontTimer = window.setTimeout(() => {
          if (!cancelled) ScrollTrigger.refresh();
        }, 1800);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(fontTimer);
      sticky.removeEventListener("focusin", onFocusIn);
      gsap.ticker.remove(skewTick);
      st.kill();
      stPose.kill();
      poseTween.kill();
      // Settle to a readable state (masks open, bars off, writes cleared) —
      // the next arm (language toggle re-run) re-primes everything anyway.
      beats.forEach((b) => {
        b.writeMask(MEDALLION_R_FINAL);
        b.writeBar(BAR_X_START);
        b.els.forEach((el) => {
          if (!el) return;
          gsap.killTweensOf(el);
          gsap.set(el, { clearProps: "transform,opacity" });
        });
      });
      gsap.set(skewWrap, { skewX: 0 });
      if (lineEl) gsap.set(lineEl, { clearProps: "transform" });
      ensureSpan();
      if (poseSpan) gsap.set(poseSpan, { clearProps: "transform" });
      // NOTE: the measured runway height is deliberately NOT released here.
      // This cleanup also runs on a pure re-arm (EN↔IT toggle re-runs the
      // effect with the user parked mid-section). Clearing the inline height
      // drops the runway from ~520vh to the JSX minHeight of 100vh for the
      // window between destroy and the next measure(), and any layout-forcing
      // read in that window (gsap.set transform parsing, SplitText re-split)
      // makes the browser clamp scrollY against the shrunken document —
      // ejecting the reader out of the section. Keeping the stale px height
      // means the document never changes size; measure() overwrites it on the
      // next arm. This cleanup CANNOT distinguish a re-arm from a real
      // pinned→native flip, and on that flip the node is NOT reliably
      // discarded — React can reuse it as the native container, carrying the
      // stale height with it. So the flip case is handled explicitly in the
      // prevModeRef effect below, which clears the height off runwayNodeRef
      // before refreshing.
    };
  }, [detected, mode, isEn]);

  // A pinned→native flip discards the ~520vh runway with no guaranteed resize
  // event (an OS reduced-motion toggle fires none), so the rest of the page
  // must re-measure against the new document height once the new tree paints.
  const prevModeRef = useRef<"pinned" | "native" | null>(null);
  useEffect(() => {
    if (!detected) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === null || prev === mode) return;
    // Release the runway height HERE, not in the scrub cleanup: this effect is
    // the only place that can tell a genuine mode flip from an EN↔IT re-arm.
    // React may reuse the runway DOM node as the native container (both
    // branches render unkeyed children of the same host type at the same
    // index), and it only diffs the style props it owns — the px height
    // written by measure() would otherwise survive and lock the native layout
    // at ~520vh, which the refresh below would then bake into every
    // downstream trigger and [data-line-anchor] waypoint.
    if (runwayNodeRef.current) runwayNodeRef.current.style.height = "";
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [detected, mode]);

  /* ---- Shared blocks (heading / closing — copy byte-identical) -------- */

  const headingBlock = (
    <div ref={headingRef} className="relative mb-12 sm:mb-16">
      <SectionHeading
        eyebrow={isEn ? "Selective on purpose" : "Selettivi per scelta"}
        title={
          isEn ? (
            <>
              We are honest about{" "}
              <span
                data-fit-pose
                className="inline-block will-change-transform font-display italic text-ink"
              >
                who we work with.
              </span>
            </>
          ) : (
            <>
              Siamo onesti su{" "}
              <span
                data-fit-pose
                className="inline-block will-change-transform font-display italic text-ink"
              >
                con chi lavoriamo.
              </span>
            </>
          )
        }
        description={
          isEn
            ? "A clear no protects both of us. About a third of scoping calls end with us recommending you don't engage SerSan: sometimes because it's the wrong moment, sometimes because we're the wrong studio."
            : "Un no chiaro tutela entrambi. Circa un terzo delle scoping call si chiude con la nostra raccomandazione di non ingaggiare SerSan: a volte perché è il momento sbagliato, a volte perché siamo lo studio sbagliato."
        }
        className="max-w-3xl"
      />
      {/* Invisible proxy — the "before" pose the italic span scrubs in
          from. Measured, never shown; copy duplicated here is aria-hidden
          and invisible (not user-facing). */}
      <span
        ref={poseProxyRef}
        aria-hidden="true"
        className="invisible pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 whitespace-nowrap heading-2 font-display italic text-ink"
      >
        {isEn ? "who we work with." : "con chi lavoriamo."}
      </span>
    </div>
  );

  const closingBlock = (
    <p className="text-[14px] text-ink-mute max-w-md">
      {isEn ? (
        <>
          If you&apos;re unsure, book the call. We&apos;ll tell you quickly,
          and in writing.
        </>
      ) : (
        <>
          Se avete dubbi, prenotate la call. Ve lo diremo in fretta, e per
          iscritto.
        </>
      )}
    </p>
  );

  /* ---- Native fallback (≤768px / coarse / reduced-motion) ------------- *
   * The v1 static two-column lists: medallions open, no bars, no filters
   * animating, no pinning — the settled, fully readable state.             */
  if (detected && mode === "native") {
    return (
      <section
        id="fit"
        className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
      >
        <SectionGlow position="top-left" intensity={1} size="50rem" />
        <div className="container-px relative">
          {headingBlock}

          <div className="fit-grid grid grid-cols-1 lg:grid-cols-2 gap-px bg-[hsl(var(--rule))] border border-[hsl(var(--rule))] rounded-lg overflow-hidden">
            {/* Good fit column */}
            <div className="fit-col fit-col--good bg-[hsl(var(--bg))] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span
                  aria-hidden="true"
                  className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--accent)/0.15)] border border-[hsl(var(--accent)/0.5)] shadow-[0_0_0_0_hsl(var(--accent)/0)]"
                  style={{ ["--fit-glow" as string]: "var(--accent)" }}
                >
                  <Check
                    className="w-3 h-3 text-[hsl(var(--accent))]"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
                  {isEn ? "Good fit" : "Buon fit"}
                </h3>
              </div>
              <ul className="flex flex-col gap-3.5">
                {goodFit.map((line, i) => (
                  <li key={i}>
                    <div className="flex items-start gap-3">
                      <FitMedallion kind="good" />
                      <p className="fit-good flex-1 rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink leading-relaxed">
                        {line}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Not a fit column */}
            <div className="fit-col fit-col--warn bg-[hsl(var(--bg))] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span
                  aria-hidden="true"
                  className="fit-icon flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(36_84%_56%/0.1)] border border-[hsl(36_84%_56%/0.32)]"
                  style={{ ["--fit-glow" as string]: "36 84% 56%" }}
                >
                  <X
                    className="w-3 h-3 text-[hsl(36_84%_62%)]"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute">
                  {isEn ? "Not a fit" : "Non è un fit"}
                </h3>
              </div>
              <ul className="flex flex-col gap-3.5">
                {notAFit.map((line, i) => (
                  <li key={i}>
                    <div className="flex items-start gap-3">
                      <FitMedallion kind="warn" />
                      <p className="fit-warn flex-1 rounded-md px-3 py-2 text-[14px] sm:text-[15px] text-ink-mute leading-relaxed">
                        {line}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 sm:mt-12">{closingBlock}</div>
        </div>

        <style>{`
          /* Check / X icon scales up with a glow on mount. */
          .fit-icon {
            transform: scale(0.6);
            opacity: 0;
            animation: fit-icon-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
          }
          @keyframes fit-icon-in {
            0%   { transform: scale(0.6); opacity: 0; box-shadow: 0 0 0 0 hsl(var(--fit-glow) / 0); }
            60%  { transform: scale(1.12); opacity: 1; box-shadow: 0 0 14px 2px hsl(var(--fit-glow) / 0.45); }
            100% { transform: scale(1); opacity: 1; box-shadow: 0 0 8px 0 hsl(var(--fit-glow) / 0.25); }
          }

          /* Hovering one column dims the sibling column (focus the read). */
          .fit-col { transition: opacity 350ms cubic-bezier(0.215, 0.61, 0.355, 1); }
          @media (hover: hover) and (pointer: fine) {
            .fit-grid:has(.fit-col--good:hover) .fit-col--warn,
            .fit-grid:has(.fit-col--warn:hover) .fit-col--good {
              opacity: 0.45;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .fit-icon {
              transform: none;
              opacity: 1;
              animation: none;
              box-shadow: none;
            }
            .fit-col { transition: none; }
          }
        `}</style>
      </section>
    );
  }

  /* ---- Pinned "Verdict beats" layout (SSR default) --------------------- *
   * NO overflow-hidden on the section — an ancestor overflow-hidden would
   * defeat position: sticky; clipping lives on the sticky frame itself.     */
  return (
    <section id="fit" className="section-accent-tint relative scroll-mt-24">
      {/* Heading — normal flow, above the runway. */}
      <div className="container-px relative pt-20 sm:pt-[6.5rem] lg:pt-32">
        {headingBlock}
      </div>

      {/* The tall scroll runway: height = 100vh + 6×70vh, set in px by
          measure(). minHeight is the SSR placeholder before JS measures. */}
      <div
        key="fit-runway"
        ref={(el) => {
          runwayRef.current = el;
          if (el) runwayNodeRef.current = el;
        }}
        className="relative"
        style={{ minHeight: "100vh" }}
      >
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). */}
        <div ref={stickyRef} className="sticky top-0 h-screen overflow-hidden">
          <SectionGlow position="top-left" intensity={1} size="50rem" />

          <div className="container-px relative flex h-full flex-col pt-24 pb-8 sm:pt-28 sm:pb-10">
            {/* ---- Accumulation ledgers — the REAL (screen-reader-facing)
                 content: two labelled lists, exactly the v1 semantic
                 structure. Rows fade/slide in as their beat completes; the
                 empty ruled slots read as a checklist waiting to be filled. */}
            <div className="grid shrink-0 grid-cols-[1.15fr_1fr] gap-x-10 xl:gap-x-16">
              <div>
                <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
                  <Check
                    className="h-3 w-3 text-[hsl(var(--accent))]"
                    aria-hidden="true"
                  />
                  {isEn ? "Good fit" : "Buon fit"}
                </h3>
                <ul className="mt-3">
                  {goodFit.map((line, i) => (
                    <li
                      key={i}
                      className="border-b border-[hsl(var(--rule)/0.45)] py-[0.32rem]"
                    >
                      <div
                        data-fit-ledger-good
                        className="flex items-center gap-2 font-mono text-[11px] leading-snug text-ink-mute will-change-transform"
                        style={{ opacity: 0, transform: "translateY(10px)" }}
                      >
                        <Check
                          className="h-3 w-3 shrink-0 text-[hsl(var(--accent))]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate">{line}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-mute">
                  <X
                    className="h-3 w-3 text-[hsl(36_84%_62%)]"
                    aria-hidden="true"
                  />
                  {isEn ? "Not a fit" : "Non è un fit"}
                </h3>
                <ul className="mt-3">
                  {notAFit.map((line, i) => (
                    <li
                      key={i}
                      className="border-b border-[hsl(var(--rule)/0.45)] py-[0.32rem]"
                    >
                      <div
                        data-fit-ledger-warn
                        className="flex items-center gap-2 font-mono text-[11px] leading-snug text-ink-dim will-change-transform"
                        style={{ opacity: 0, transform: "translateY(10px)" }}
                      >
                        <X
                          className="h-3 w-3 shrink-0 text-[hsl(36_84%_62%/0.8)]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 truncate line-through decoration-[hsl(36_84%_56%/0.55)]">
                          {line}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ---- Center stage — the verdict theater (visual duplicate of
                 the ledger strings → aria-hidden). Velocity skew lives on
                 this wrapper only; beats are absolutely stacked and driven
                 by their windowed POV chasers. */}
            <div
              ref={skewRef}
              aria-hidden="true"
              className="relative min-h-0 flex-1 will-change-transform"
            >
              {goodFit.map((line, i) => (
                <div
                  key={i}
                  data-fit-beat={i}
                  className="absolute inset-0 grid grid-cols-[1.15fr_1fr] items-center gap-x-10 xl:gap-x-16"
                >
                  {/* GOOD — the star of the beat. Beat 0 pose ships in the
                      SSR HTML (visible, medallion open) so the first pinned
                      frame is never empty. */}
                  <div
                    data-fit-good
                    className="will-change-transform"
                    style={
                      i === 0
                        ? undefined
                        : { opacity: 0, transform: "translateY(44px)" }
                    }
                  >
                    <div className="mb-6 inline-flex items-center justify-center rounded-full shadow-[0_0_32px_-6px_hsl(var(--accent)/0.55)]">
                      <FitMedallion
                        kind="good"
                        className="h-12 w-12"
                        initialRadius={i === 0 ? MEDALLION_R_FINAL : 0}
                      />
                    </div>
                    <p className="max-w-[24ch] font-display text-[clamp(1.9rem,1.1rem+1.9vw,2.6rem)] leading-[1.14] tracking-[-0.02em] text-ink text-balance">
                      {line}
                    </p>
                  </div>

                  {/* BAD — revealed readable, then torn-redacted, tilted,
                      dimmed and stamped with the mono ✗. Static top margin
                      offsets the verdict below the statement's center line
                      (editorial asymmetry — margin, never transform: GSAP
                      owns the transform). */}
                  <div
                    data-fit-bad
                    className="relative mt-10 will-change-transform"
                    style={{ opacity: 0, transform: "translateY(28px)" }}
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        data-fit-x
                        className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[hsl(36_84%_56%/0.4)] bg-[hsl(36_84%_56%/0.08)] will-change-transform"
                        style={{ opacity: 0, transform: "scale(0.6)" }}
                      >
                        <X className="h-3 w-3 text-[hsl(36_84%_62%)]" />
                      </span>
                      <div className="relative min-w-0 flex-1">
                        <p className="fit-warn rounded-md px-3 py-2 font-mono text-[13px] sm:text-[14px] leading-relaxed text-ink-mute">
                          {notAFit[i]}
                        </p>
                        {/* The torn redaction bar sweeps in OVER the text —
                            the strike. Overlay only; the string stays in
                            the DOM untouched. */}
                        <TornStrikeBar />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ---- Chrome: big mono counter + scrub progress line with
                 beat ticks. Pure presentation → aria-hidden. */}
            <div
              aria-hidden="true"
              className="flex shrink-0 items-end gap-6 pb-1 pt-4 sm:gap-8"
            >
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                <span
                  data-fit-counter
                  className="text-[1.9rem] leading-none tracking-tight text-ink"
                >
                  01
                </span>
                <span className="text-[11px] tracking-[0.18em] text-ink-dim">
                  / {String(BEATS).padStart(2, "0")}
                </span>
              </div>
              <div className="relative mb-[0.4rem] h-px max-w-[26rem] flex-1 bg-[hsl(var(--rule))]">
                <div
                  data-fit-line
                  className="absolute inset-0 origin-left bg-[hsl(var(--accent))]"
                  style={{ transform: "scaleX(0)" }}
                />
                {Array.from({ length: BEATS }, (_, i) => (
                  <span
                    key={i}
                    className="absolute top-1/2 h-[5px] w-px -translate-y-1/2 bg-[hsl(var(--ink-dim)/0.6)]"
                    style={{
                      left: `${(((i + 1) / BP_MAX) * 100).toFixed(2)}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closing line — normal flow, below the runway. (The /start button
          that lived here was removed in the restyle-step-2 CTA dedupe —
          FinalCTA sits right below this section, past the gateway gap.) */}
      <div className="container-px relative pt-10 sm:pt-12 pb-20 sm:pb-[6.5rem] lg:pb-32">
        {closingBlock}
      </div>
    </section>
  );
}

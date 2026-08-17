"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionGlow } from "@/components/ui/section-glow";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";
import { snapPoint } from "@/lib/scroll-snap";
import { useCentreFocus } from "@/lib/use-centre-focus";

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
 * native (≤768px, coarse pointer, prefers-reduced-motion): no bars, no
 * filters animating, no pinning — the settled, fully readable state.
 * Keyboard: focusin inside a beat converts to the beat's lock scroll
 * position through Lenis (null-guarded) — same convention as the rails. The
 * `id="fit"` anchor + page.tsx [data-line-anchor="fit"] wrapper semantics
 * are unchanged.
 *
 * NATIVE LAYOUTS (MOBILE_HOME_SPEC §5.3 — the phone reads 1.90 viewports of
 * Fit and must read 1.30). The native branch serves two, chosen off a
 * SUBSCRIBED `(min-width: 1024px)` query, never a one-shot sample:
 *
 *   - `lg` and above (a coarse 1280px tablet, a reduced-motion desktop):
 *     the v1 two-column lists, UNCHANGED. This layout is not a mobile
 *     surface and does not pay for the mobile fix.
 *
 *   - below `lg`: SIX PAIRED ROWS. Stacking the two columns at
 *     `grid-cols-1` does not merely cost ~620px — it destroys the argument:
 *     the reader gets six good-fit lines, a column header, then the six
 *     counterparts ~700px later, with nothing to say that NOT_A_FIT[i] is
 *     the answer to GOOD_FIT[i] (the pairing contract documented at :21).
 *     Each row carries GOOD_FIT[i] over NOT_A_FIT[i], so the comparison is
 *     back inside one eyeful AND the section is shorter. A segmented
 *     control / two-card deck was explicitly rejected (spec §7): making the
 *     two halves of a comparison mutually exclusive is strictly worse at
 *     comparison than stacking them.
 *
 *     All 12 statements are in the DOM in source order — nothing behind a
 *     gesture, a toggle or a disclosure. `lib/use-centre-focus` supplies
 *     the `:hover` a phone cannot perform: the centred pair's ✓ medallion
 *     ignites and an amber bar sweeps the ✗ line, which settles struck.
 *     The bar is a 10%-alpha wash + a strike rule, NEVER a cover — under
 *     the hook's `static` mode (reduced motion) every row is focused at
 *     once, so a cover would redact all six counterparts permanently.
 *     Content reachability never depends on motion.
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
 * Torn redaction bar (built locally; the old shared fx/redacted-reveal it
 * deliberately did NOT reuse has since been deleted as dead code). An ink
 * rect stretched over the bad statement; the scrub
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
  // Layout axis INSIDE the native branch (see NATIVE LAYOUTS above): paired
  // rows below `lg`, the v1 two-column lists at `lg`+. Branching in JS rather
  // than shipping both trees behind `lg:hidden` keeps the ≥1024px markup
  // byte-identical and the 12 statements un-duplicated. It is a media-query
  // subscription — it flips at most when the viewport crosses 1024px, never
  // per scroll frame.
  const [wide, setWide] = useState(false);

  // The touch answer to `:hover` for the paired rows. Inert on a fine pointer,
  // `static` (every row focused) under reduced motion — one hook, six rows,
  // zero re-renders.
  const pairFocusRef = useCentreFocus();

  const headingRef = useRef<HTMLDivElement | null>(null);
  const poseProxyRef = useRef<HTMLSpanElement | null>(null);
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const skewRef = useRef<HTMLDivElement | null>(null);
  // The runway node captured at arm time. React detaches runwayRef during the
  // commit that unmounts the pinned branch, so the mode-flip effect below —
  // which runs AFTER that commit — needs its own handle to release the px
  // height it wrote.
  const runwayNodeRef = useRef<HTMLDivElement | null>(null);
  const prevModeRef = useRef<"pinned" | "native" | null>(null);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample: a window snapped
  // narrow, devtools docked, or an OS reduced-motion toggle must flip the path
  // live. Sampling once on mount kept the pinned path alive with measurements
  // taken against a viewport that no longer exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const queries = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    // Deliberately NOT part of the OR above: this one picks the native
    // branch's LAYOUT, it must never move the pinned/native decision.
    const wideQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setMode(queries.some((q) => q.matches) ? "native" : "pinned");
      setWide(wideQuery.matches);
      setDetected(true);
    };
    sync();
    const watched = [...queries, wideQuery];
    watched.forEach((q) => q.addEventListener("change", sync));
    return () => watched.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  // Runway release + re-measure on a MODE FLIP ONLY — deliberately NOT in the
  // scrub effect's cleanup below, whose deps include the language: that
  // cleanup also runs on every EN↔IT toggle, and collapsing the ~520vh runway
  // under the reader's feet clamps the scroll position and ejects them out of
  // the pinned section entirely. Here the height is released BEFORE a deferred
  // ScrollTrigger.refresh() measures the committed layout. An OS
  // reduced-motion toggle fires no resize event, so nothing else re-measures.
  //
  // `prev === null` is the FIRST detection. It is NOT a no-op: the server
  // renders `pinned`, so a phone landing on `native` here swaps the pinned
  // markup for the stacked lists and the document height moves — every
  // trigger below must re-measure. Landing on `pinned` changes nothing versus
  // SSR (and the scrub effect below arms right after and measures its own
  // fresh height), so only that case stays quiet.
  useEffect(() => {
    if (!detected) return;
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (prev === mode) return;
    if (prev === null && mode === "pinned") return;
    // Only on the way OUT of pinned: entering pinned, the scrub effect below
    // arms right after this one and measures a fresh height of its own.
    if (mode === "native" && runwayNodeRef.current) {
      runwayNodeRef.current.style.height = "";
      runwayNodeRef.current = null;
    }
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [detected, mode]);

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
    // Handle for the mode-flip effect above (React's ref is already detached
    // by the time that effect runs on a pinned→native flip).
    runwayNodeRef.current = runway;

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

    // Site-wide snap stations (lib/scroll-snap): the runway start + each
    // beat's LOCK position — the same Ys the focusin handler computes
    // (FOCUS_LOCK_AT inside the beat window), where the verdict row is fully
    // revealed. Lazy getters over the live measure() vars.
    const clearSnapPoints: Array<() => void> = [
      snapPoint(() => secTop),
      ...Array.from({ length: BEATS }, (_, i) =>
        snapPoint(() => secTop + travel * ((i + FOCUS_LOCK_AT) / BP_MAX)),
      ),
    ];

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
      clearSnapPoints.forEach((off) => off());
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
      // The px runway height is deliberately NOT cleared here. This cleanup
      // runs on every EN↔IT toggle too (isEn is a dep), and collapsing the
      // runway mid-read clamps the scroll position and ejects the reader out
      // of the section. Release lives in the mode-flip effect above; the
      // re-arm below re-measures it in place.
    };
  }, [detected, mode, isEn]);

  /* ---- Shared blocks (heading / closing — copy byte-identical) -------- */

  // `mb-6` is the base-only value: the pinned branch never renders below
  // 769px (its own media gate), so `sm:mb-16` is the only rule it can ever
  // see and the desktop rhythm is untouched. Below 640px the 48px gap under
  // the heading is a third of a paired row — chrome the phone cannot afford.
  const headingBlock = (
    <div ref={headingRef} className="relative mb-6 sm:mb-16">
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

  /* ---- Native layout A: the v1 two-column lists (`lg` and above) ------ *
   * Byte-identical to what shipped before the paired-rows work. A coarse
   * 1280px tablet and a reduced-motion desktop are not the surface the
   * mobile spec is fixing, and they do not pay for the fix.               */
  const twoColumnLists = (
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
            <X className="w-3 h-3 text-[hsl(36_84%_62%)]" aria-hidden="true" />
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
  );

  /* ---- Native layout B: six paired rows (below `lg`) ------------------ *
   * One row per GOOD_FIT[i] / NOT_A_FIT[i] pair — the verdict and its
   * counterpart in one eyeful, which is the argument the stacked columns
   * lose (see NATIVE LAYOUTS in the header). Every row is plain, static,
   * always-painted DOM; the centre-focus treatment is decoration ON TOP of
   * a fully readable row, never the thing that makes it readable.
   *
   * The visible legend is aria-hidden and each statement carries its own
   * sr-only label instead — reusing the section's existing "Good fit" /
   * "Not a fit" strings verbatim — so a screen reader hears the PAIRING
   * ("Good fit: … / Not a fit: …") rather than twelve unattributed
   * sentences under one header. That is the same information the two
   * labelled lists carried, delivered per pair.                          */
  const pairedRows = (
    <div>
      <div
        aria-hidden="true"
        className="flex items-center gap-2.5 border-b border-[hsl(var(--rule))] pb-2 font-mono text-[11px] tracking-[0.18em] uppercase"
      >
        <span className="flex items-center gap-1.5 text-ink">
          <Check
            className="h-3 w-3 text-[hsl(var(--accent))]"
            aria-hidden="true"
          />
          {isEn ? "Good fit" : "Buon fit"}
        </span>
        <span className="text-ink-dim">/</span>
        <span className="flex items-center gap-1.5 text-ink-mute">
          <X className="h-3 w-3 text-[hsl(36_84%_62%)]" aria-hidden="true" />
          {isEn ? "Not a fit" : "Non è un fit"}
        </span>
      </div>

      <ul className="border-b border-[hsl(var(--rule))]">
        {goodFit.map((line, i) => (
          <li
            key={i}
            ref={pairFocusRef}
            data-fit-pair={i}
            className="fit-pair border-t border-[hsl(var(--rule)/0.55)] py-2 first:border-t-0"
          >
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="fit-pair__medal mt-[3px] inline-flex shrink-0 rounded-full"
                style={{ ["--fit-glow" as string]: "var(--accent)" }}
              >
                <FitMedallion
                  kind="good"
                  className="h-[18px] w-[18px] shrink-0"
                />
              </span>
              <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
                <span className="sr-only">
                  {isEn ? "Good fit" : "Buon fit"}:{" "}
                </span>
                {line}
              </p>
            </div>

            <div className="mt-1.5 flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center"
              >
                <X className="h-3 w-3 text-[hsl(36_84%_62%/0.85)]" />
              </span>
              <p className="fit-pair__bad-text relative min-w-0 flex-1 font-mono text-[12px] leading-tight text-ink-mute">
                <span className="sr-only">
                  {isEn ? "Not a fit" : "Non è un fit"}:{" "}
                </span>
                {notAFit[i]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  /* ---- Native fallback (≤768px / coarse / reduced-motion) ------------- *
   * Medallions open, no bars, no filters animating, no pinning — the
   * settled, fully readable state. Two layouts, see NATIVE LAYOUTS in the
   * header: paired rows below `lg`, the v1 two-column lists at `lg`+.      */
  if (detected && mode === "native") {
    return (
      <section
        id="fit"
        className="section-accent-tint relative section-lg scroll-mt-24 overflow-hidden"
      >
        <SectionGlow position="top-left" intensity={1} size="50rem" />
        <div className="container-px relative">
          {headingBlock}

          {wide ? twoColumnLists : pairedRows}

          <div className="mt-8 sm:mt-12">{closingBlock}</div>
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

          /* ---- Paired rows: the centred pair ignites ------------------- *
           * [data-focus] is written by lib/use-centre-focus on whichever
           * pair the reader has scrolled to the middle of the viewport.
           * The ✗ treatment is a 10%-alpha wash plus a strike rule — a
           * SWEEP, never a cover: under the hook's "static" mode (reduced
           * motion) every row carries [data-focus] at once, and an opaque
           * bar would redact all six counterparts permanently.            */
          .fit-pair__medal {
            box-shadow: 0 0 0 0 hsl(var(--fit-glow) / 0);
            transition: box-shadow 420ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .fit-pair__bad-text {
            text-decoration-line: line-through;
            text-decoration-color: transparent;
            text-decoration-thickness: 1px;
            transition: text-decoration-color 420ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          .fit-pair__bad-text::after {
            content: "";
            position: absolute;
            inset: -2px -5px;
            border-radius: 3px;
            background: hsl(36 84% 56% / 0.1);
            border-right: 1px solid hsl(36 84% 62% / 0.45);
            transform: scaleX(0);
            transform-origin: 0% 50%;
            transition: transform 560ms cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
          }
          .fit-pair[data-focus="true"] .fit-pair__medal {
            box-shadow: 0 0 14px 1px hsl(var(--fit-glow) / 0.4);
          }
          .fit-pair[data-focus="true"] .fit-pair__bad-text {
            text-decoration-color: hsl(36 84% 56% / 0.6);
          }
          .fit-pair[data-focus="true"] .fit-pair__bad-text::after {
            transform: scaleX(1);
          }
          /* Two triggers, one per input class — same grammar as the
             founders portrait reveal. The hook is inert on a fine pointer,
             so :hover is the only one that can fire there. */
          @media (hover: hover) and (pointer: fine) {
            .fit-pair:hover .fit-pair__medal {
              box-shadow: 0 0 14px 1px hsl(var(--fit-glow) / 0.4);
            }
            .fit-pair:hover .fit-pair__bad-text {
              text-decoration-color: hsl(36 84% 56% / 0.6);
            }
            .fit-pair:hover .fit-pair__bad-text::after { transform: scaleX(1); }
          }

          @media (prefers-reduced-motion: reduce) {
            .fit-icon {
              transform: none;
              opacity: 1;
              animation: none;
              box-shadow: none;
            }
            .fit-col { transition: none; }
            /* Revealed, not animated: the focused state still paints, it
               simply arrives without a transition. */
            .fit-pair__medal,
            .fit-pair__bad-text,
            .fit-pair__bad-text::after { transition: none; }
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
          measure(). minHeight is the SSR placeholder before JS measures.
          The key is load-bearing: both branches render a <div> in this slot,
          so without it React would REUSE this node for the native layout's
          container and the imperatively-written px height (invisible to
          React) would leak onto a layout that must be content-sized. */}
      <div
        key="fit-runway"
        ref={runwayRef}
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

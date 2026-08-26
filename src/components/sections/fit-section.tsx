"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Check, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";
import { snapPoint } from "@/lib/scroll-snap";
import { useCentreFocus } from "@/lib/use-centre-focus";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * FitSection — "Verdict wall" (2026-08-21 home refactor, Noomo grammar).
 *
 * "Honest about fit" as a pinned chapter statement: the title holds the
 * frame in giant display serif while SIX frosted-glass panes — one per
 * GOOD-FIT / NOT-A-FIT pair (index i pairs GOOD_FIT[i] with NOT_A_FIT[i]) —
 * fly through the frame at depth, in FRONT of the type. The backdrop-blur
 * pane crossing the statement IS the money shot: the serif blurs behind the
 * glass as a pane passes. Reference: noomoagency.com "GREAT WORK CAN'T
 * HAPPEN WITHOUT TEAM A."
 *
 *   - THE STATEMENT (z-10): eyebrow + the section title re-set as chapter
 *     type (clamp(3rem, 6.5vw, 7.5rem), ~11ch so it breaks into 3–4 lines,
 *     left at the container gutter, sat slightly below center). It does NOT
 *     scrub or pose-morph — painted at full opacity from SSR. Its scrubbed
 *     life is ONE slow drift (y +14px → −14px across the runway via a
 *     quickTo chaser): parallax, not choreography. On the FIRST entry of
 *     the pinned frame (IO on the runway, once per arm — round-2 life
 *     pass) it additionally plays a masked SplitText line-rise: the SSR
 *     text is primed hidden ONLY inside play() (set → play in the same
 *     tick, so the statement is never parked hidden waiting on a trigger;
 *     RM never reaches the pinned path and is guarded anyway), and the
 *     annotation blur-fades in after it. The h2 carries key={language} —
 *     SplitText owns its subtree once split, so the EN↔IT toggle must
 *     remount it (heading-choreographer contract); cleanup revert()s.
 *     The eyebrow is a plain `.eyebrow` (no [data-eyebrow-text]), so the
 *     global LabelScrambler gives it the mono decode treatment for free.
 *   - THE ANNOTATION (z-10): the description string hung top-right as a
 *     small ~300px column (the Noomo/Lusion pairing). Static.
 *   - THE PANE FIELD (z-20, in front of the type): a perspective layer
 *     holding the six [data-fit-pane] glass panes (chrome-less: backdrop
 *     blur, top hairline, soft shadow, NO border). Each pane carries the
 *     REAL copy — ✓ + GOOD_FIT[i] over a hairline over the mono ✗-prefixed
 *     NOT_A_FIT[i] — and beat window i (u∈[i, i+1] of bp = progress ×
 *     (6 + 0.35)) drives it through ENTER u∈[−0.12, 0.28] (from off-frame,
 *     alternating sides, yaw/roll-rotated, transparent, 0.94 scale) → HOLD
 *     u∈[0.28, 0.72] (parked on a right-of-center slot over the statement's
 *     right half; `.is-held` toggles ONCE at the window's threshold
 *     crossings and a CSS rule draws the strike through the ✗ line. The
 *     FIRST hold also lands the add-only `.is-lit` at the same single
 *     write point, and a CSS transition-delay chain stagger-plays the
 *     pane's content: ✓ row masked-rise → divider scaleX draw → ✗ row
 *     rise → the existing strike → index fade. `.is-lit` is never
 *     removed, so scrub-out reverses NOTHING — the content stays; only
 *     the strike stays reversible on `.is-held`) → EXIT
 *     u∈[0.72, 1.12] (continues along its travel vector, up and out, fading
 *     to 1.02 scale — overlapping the next pane's enter: crossfade, never a
 *     hard cut). Panes alternate z-20/z-30 so consecutive panes cross at
 *     different depths. Blur is constant per pane (`backdrop-filter` is
 *     never animated — paint storm) and panes are small (≤30rem), so the
 *     blur-region budget holds; never blur a full-bleed layer.
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
 *     pan): the scrub NEVER writes pane transforms directly — it feeds
 *     windowed targets into per-pane gsap.quickTo chasers (x/y/rotation/
 *     rotationY/opacity/scaleX+scaleY — never the `scale` shorthand, ~0.8s
 *     expo) with identical-value skipping. Discontinuities (refresh,
 *     restored scroll) go through the immediate path (quickTo's `start`
 *     parameter parks the chaser AT the value).
 *   - ALL per-frame values derive analytically from the single trigger
 *     progress; vw/vh pose units are converted through measure()-cached
 *     viewport units — zero getBoundingClientRect in the loop. No SVG
 *     filters anywhere in the pinned path.
 *   - Velocity skew: the pane field (never the statement) shears
 *     skewX = clamp(v·k, ±3°), damped to 0 at rest by a gsap.ticker writer
 *     that early-returns once parked (velocity-derived → damped;
 *     position-derived → direct).
 *   - Chrome: big mono counter "01 / 06" + a thin scrub progress line with
 *     `+` beat ticks (AT/igloo garnish) track the active beat. The counter
 *     readout ROLLS vertically on beat change (the preloader's rolling-
 *     digit flavour, local): a clipped box with a current + incoming layer
 *     translateY-rolled by a transform-only helper — up on a forward beat,
 *     down on a backward scrub; init/refresh snaps hard-set. clip-path
 *     (not overflow:hidden) does the clipping so the box keeps a real text
 *     baseline against the "/ 06" label.
 *
 * SEMANTICS / A11Y: the PANES are the real, screen-reader-facing content —
 * no aria-hidden theater, no duplicate strings. Each pane row carries the
 * same sr-only "Good fit:" / "Not a fit:" prefixes as the native paired
 * rows, so AT hears the PAIRING. Counter/progress chrome stays aria-hidden.
 * SSR renders the pinned markup with the beat-0 pane at its HOLD pose
 * painted inline (statement fully visible, pane 0 parked with the strike
 * drawn; every other pane parked at enter-rest), so the first pinned frame
 * is never empty. Copy is byte-identical to v1 (12 statements,
 * eyebrow/title/description, column labels, closing line).
 *
 * MODES: pinned (SSR default — desktop, fine pointer, no reduced-motion) /
 * native (≤768px, coarse pointer, prefers-reduced-motion): no panes flying,
 * no filters animating, no pinning — the settled, fully readable state.
 * Keyboard: focusin inside a pane converts to the beat's lock scroll
 * position through Lenis (null-guarded) — same convention as the rails.
 * Panes contain no focusables today; the handler stays wired for future
 * links. The `id="fit"` anchor + page.tsx [data-line-anchor="fit"] wrapper
 * semantics are unchanged.
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
 */

const GOOD_FIT_EN = [
  "Something in the business costs you time or money today.",
  "You can explain the workflow, even if not the technology.",
  "You'd rather fix one real problem than buy another licence.",
  "You want it built properly, whether or not you're regulated.",
  "Someone on your side can decide and unblock us, technical or not.",
  "You can give us the people, data or access to understand it.",
];

const GOOD_FIT_IT = [
  "C'è qualcosa che oggi vi costa tempo o denaro davvero.",
  "Sapete spiegare il processo, anche se non la tecnologia.",
  "Preferite risolvere un problema vero che comprare un'altra licenza.",
  "Volete che sia costruito bene, che siate regolamentati o no.",
  "Qualcuno da parte vostra può decidere e sbloccarci, tecnico o no.",
  "Potete darci persone, dati o accessi per capire il problema.",
];

const NOT_A_FIT_EN = [
  "You want a chatbot gimmick for a press release.",
  "No one can explain what problem is actually being solved.",
  "You want a fixed price before anyone has defined the work.",
  "You want to skip compliance to ship faster.",
  "Nobody can actually decide, so nothing gets signed off.",
  "You won't give us the access or feedback the work needs.",
];

const NOT_A_FIT_IT = [
  "Volete un chatbot d'effetto per un comunicato stampa.",
  "Nessuno sa spiegare quale problema si stia davvero risolvendo.",
  "Volete un prezzo fisso prima che il lavoro sia definito.",
  "Volete saltare la compliance per rilasciare più in fretta.",
  "Nessuno può davvero decidere, quindi non si approva nulla.",
  "Non ci darete gli accessi o i riscontri necessari a lavorare.",
];

/* ------------------------------------------------------------------ *
 *  Pane choreography constants.
 *
 *  Beat space: progress × BP_MAX, where beat i owns [i, i+1] plus the
 *  shared overlap margins. TAIL gives pane 6's exit room to finish
 *  before the sticky releases (it does NOT change the runway height —
 *  each beat simply gets 6/6.35 of its nominal 70vh of scroll).
 * ------------------------------------------------------------------ */

const BEATS = 6;
/** Runway = 100vh + BEATS×70vh, set in px by measure() (binding). */
const BEAT_VH = 0.7;
const TAIL = 0.35;
const BP_MAX = BEATS + TAIL;

/** Pane windows in beat-local u. ENTER starts early (−0.12) so it overlaps
 *  the previous pane's EXIT tail (which runs to u=1.12 ≡ next-beat u=0.12):
 *  crossfade, never a hard cut. Pane 0's enter is pre-completed — SSR
 *  paints it at HOLD, so the first pinned frame is never empty. */
const ENTER_START = -0.12;
const ENTER_DUR = 0.4; // ENTER u∈[−0.12, 0.28]
const HOLD_START = 0.28;
const HOLD_END = 0.72; // HOLD u∈[0.28, 0.72] — `.is-held`, the strike draws
const EXIT_START = 0.72;
const EXIT_DUR = 0.4; // EXIT u∈[0.72, 1.12]

/** Pane poses, authored in vw/vh and converted to px through the
 *  measure()-cached viewport units (never a layout read in the frame
 *  loop). Even panes enter from the right/bottom, odd from the left;
 *  hold slots alternate around a right-of-center column so panes overlap
 *  the statement's right half (the Noomo money shot: the giant serif
 *  blurs behind the glass as a pane parks). EXIT continues each pane's
 *  travel vector — further across, up and out — while it fades. */
const PANE_ENTER_X_VW = 54;
const PANE_ENTER_Y_VH = 18;
const PANE_ENTER_ROT_Z = 4; // deg, roll (sign alternates per pane)
const PANE_ENTER_ROT_Y = 16; // deg, yaw (opposite sign to the roll)
const PANE_ENTER_SCALE = 0.94;
const PANE_HOLD_X_EVEN_VW = 8;
const PANE_HOLD_X_ODD_VW = -2;
const PANE_HOLD_Y_VH = -2;
const PANE_HOLD_ROT = 1.5; // deg — rotations decay here at hold
const PANE_EXIT_DRIFT_VW = 10;
const PANE_EXIT_Y_VH = -20;
const PANE_EXIT_SCALE = 1.02;

/** The statement's one scrub-driven drift: y +14px → −14px across the
 *  whole runway — parallax, not choreography. */
const STATEMENT_DRIFT_PX = 14;

/** Statement intro (round-2 life pass): masked line-rise on the first
 *  entry of the pinned frame. Same feel tokens as heading-choreographer
 *  (yPercent 115 rise, ~0.85s, 90ms stagger, expo.out). 115 is load-bearing:
 *  the `.split-line-mask` clip window is extended by 0.12em of padding
 *  (globals.css headroom rule), and only a rise ≥ 115% of the ~0.98 line
 *  height clears it — at 110 a sliver of each waiting line's top edge would
 *  peek through the extended window during the stagger. */
const INTRO_Y_PERCENT = 115;
const INTRO_DURATION = 0.85;
const INTRO_STAGGER = 0.09;
/** Annotation blur-fade starts this long after the title rise begins. */
const INTRO_ANNOT_DELAY = 0.35;

/** Beat-counter vertical digit roll (s). */
const COUNTER_ROLL_S = 0.5;

/** Medallion viewBox is 200×200; the disc is r=88. Final mask radius must
 *  cover disc + stroke + the ±40 displacement excursion of the edge.
 *  (Native branches only — the pinned path renders no medallions.) */
const MEDALLION_R_FINAL = 140;

/** Velocity skew on the pane field (rail idiom: clamped, ticker-damped). */
const SKEW_MAX_DEG = 3;
const SKEW_DEG_PER_PXS = 0.0015;

/** focusin → scroll lock point inside a beat (pane parked at HOLD). */
const FOCUS_LOCK_AT = 0.5;

/** Clamped smoothstep — C1 at both ends of every window (repo convention:
 *  scrubbed beats must be C1 at their boundaries). */
function ss01(t: number) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
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
 * fractal-noise field. Ids sanitized from useId (duplicated ids silently
 * break masks). NATIVE BRANCHES ONLY: nothing arms it closed or animates
 * the mask any more — the verdict wall's pinned path is filter-free.
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

  // Verdict-wall scrub — pinned mode only, after detection settles.
  // isEn is a dep on purpose: the EN↔IT toggle swaps copy in place, so the
  // whole choreography rebuilds and re-measures (cheap, rare).
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    const runway = runwayRef.current;
    const sticky = stickyRef.current;
    const skewWrap = skewRef.current;
    if (!runway || !sticky || !skewWrap) return;
    // Handle for the mode-flip effect above (React's ref is already detached
    // by the time that effect runs on a pinned→native flip).
    runwayNodeRef.current = runway;

    /* ---- Collect targets ONCE (no per-frame queries) ----------------- */

    const paneEls = Array.from(
      sticky.querySelectorAll<HTMLElement>("[data-fit-pane]"),
    );
    const statementEl =
      sticky.querySelector<HTMLElement>("[data-fit-statement]");
    const counterEl = sticky.querySelector<HTMLElement>("[data-fit-counter]");
    const counterCur =
      counterEl?.querySelector<HTMLElement>("[data-fit-counter-cur]") ?? null;
    const counterInc =
      counterEl?.querySelector<HTMLElement>("[data-fit-counter-inc]") ?? null;
    const lineEl = sticky.querySelector<HTMLElement>("[data-fit-line]");
    if (paneEls.length === 0) return;

    // Viewport units for the vw/vh-authored poses — cached here and
    // refreshed by measure(), never read in the frame loop.
    let vwUnit = window.innerWidth / 100;
    let vhUnit = window.innerHeight / 100;

    interface PaneCtl {
      el: HTMLElement;
      /** +1 = even pane (enters right), −1 = odd pane (enters left). */
      sign: 1 | -1;
      /** `.is-held` shadow — class writes happen on threshold crossings
       *  only, never per frame. */
      held: boolean;
      x: ChaseWriter;
      y: ChaseWriter;
      rz: ChaseWriter;
      ry: ChaseWriter;
      o: ChaseWriter;
      sx: ChaseWriter;
      sy: ChaseWriter;
    }

    const panes: PaneCtl[] = paneEls.map((el, i) => {
      const sign: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const holdX =
        (sign > 0 ? PANE_HOLD_X_EVEN_VW : PANE_HOLD_X_ODD_VW) * vwUnit;

      // Prime the FULL transform of every chaser target BEFORE creating the
      // quickTo writers (repo convention: unrecorded components trip "not
      // eligible for reset"; the REAL scaleX/scaleY props, never the `scale`
      // shorthand). xPercent/yPercent center the pane on its base slot —
      // the chasers compose x/y on top and never touch the percents. This
      // is also the arm: the SSR markup ships pane 0 at HOLD; every other
      // pane parks at enter-rest here, and the init snap below re-syncs any
      // restored mid-page scroll position.
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x: i === 0 ? holdX : PANE_ENTER_X_VW * sign * vwUnit,
        y: (i === 0 ? PANE_HOLD_Y_VH : PANE_ENTER_Y_VH) * vhUnit,
        rotation: (i === 0 ? PANE_HOLD_ROT : PANE_ENTER_ROT_Z) * sign,
        rotationY: (i === 0 ? -PANE_HOLD_ROT : -PANE_ENTER_ROT_Y) * sign,
        opacity: i === 0 ? 1 : 0,
        scaleX: i === 0 ? 1 : PANE_ENTER_SCALE,
        scaleY: i === 0 ? 1 : PANE_ENTER_SCALE,
        transformOrigin: "50% 50%",
      });

      return {
        el,
        sign,
        held: el.classList.contains("is-held"),
        x: makeChase(el, "x", 0.8, "expo"),
        y: makeChase(el, "y", 0.8, "expo"),
        rz: makeChase(el, "rotation", 0.8, "expo"),
        ry: makeChase(el, "rotationY", 0.8, "expo"),
        o: makeChase(el, "opacity", 0.8, "expo"),
        sx: makeChase(el, "scaleX", 0.8, "expo"),
        sy: makeChase(el, "scaleY", 0.8, "expo"),
      };
    });

    // The statement's single parallax drift (never a pose morph). Primed
    // to match the SSR inline translateY before its chaser is created.
    if (statementEl) gsap.set(statementEl, { y: STATEMENT_DRIFT_PX });
    const stmtY = makeChase(statementEl, "y", 0.8, "expo");

    /* ---- Chrome writers (direct, identical-value skipped) ------------ */

    let lastActive = -1;

    /** Counter digit roll (the preloader's rolling-digit flavour, local):
     *  the two-digit readout rolls vertically inside its clipped box —
     *  the current layer rolls out while the incoming layer (carrying the
     *  new value) rolls in, up on a forward beat, down on a backward
     *  scrub. Transform-only. An in-flight roll is killed and re-parked
     *  first, so a fast scrub across several beats can never stack
     *  tweens (worst case: the readout snaps to rest, then rolls to the
     *  newest value). The immediate path (init/refresh snaps) hard-sets —
     *  a restored scroll or a resize never plays a roll. */
    const rollCounter = (text: string, dir: 1 | -1, immediate: boolean) => {
      if (!counterCur || !counterInc) {
        if (counterEl) counterEl.textContent = text;
        return;
      }
      gsap.killTweensOf([counterCur, counterInc]);
      if (immediate) {
        counterCur.textContent = text;
        gsap.set(counterCur, { yPercent: 0 });
        gsap.set(counterInc, { yPercent: 100 });
        return;
      }
      counterInc.textContent = text;
      gsap.set(counterCur, { yPercent: 0 });
      gsap.set(counterInc, { yPercent: 100 * dir });
      gsap.to(counterCur, {
        yPercent: -100 * dir,
        duration: COUNTER_ROLL_S,
        ease: "expo.out",
      });
      gsap.to(counterInc, {
        yPercent: 0,
        duration: COUNTER_ROLL_S,
        ease: "expo.out",
        onComplete: () => {
          // Promote the incoming value to the in-flow layer and re-park
          // the roller so the next change starts from a clean rest state.
          counterCur.textContent = text;
          gsap.set(counterCur, { yPercent: 0 });
          gsap.set(counterInc, { yPercent: 100 });
        },
      });
    };

    const setLine = lineEl ? gsap.quickSetter(lineEl, "scaleX") : null;
    if (lineEl) gsap.set(lineEl, { transformOrigin: "0% 50%", scaleX: 0 });
    let lastLineQ = -1;

    /* ---- The one analytic frame function ------------------------------ *
     * Everything derives from the single trigger progress. quickTo chasers
     * skip identical values, so parked panes cost a handful of float
     * compares per frame and zero writes.                                  */
    const applyAll = (progress: number, immediate: boolean) => {
      const bp = progress * BP_MAX;
      for (let i = 0; i < panes.length; i++) {
        const p = panes[i];
        const u = bp - i;
        const s = p.sign;

        // Windowed pose scalars (C1 smoothstep at every boundary — repo
        // convention). Pane 0's enter is pre-completed: SSR paints it at
        // HOLD, so scrubbing to the very top parks it there, never empty.
        const eIn = i === 0 ? 1 : ss01((u - ENTER_START) / ENTER_DUR);
        const eOut = ss01((u - EXIT_START) / EXIT_DUR);

        // Poses in px from the measure()-cached viewport units. EXIT
        // continues the entry travel vector: further across, up and out.
        const xEnter = PANE_ENTER_X_VW * s * vwUnit;
        const xHold =
          (s > 0 ? PANE_HOLD_X_EVEN_VW : PANE_HOLD_X_ODD_VW) * vwUnit;
        const xExit = xHold - PANE_EXIT_DRIFT_VW * s * vwUnit;
        const yEnter = PANE_ENTER_Y_VH * vhUnit;
        const yHold = PANE_HOLD_Y_VH * vhUnit;
        const yExit = PANE_EXIT_Y_VH * vhUnit;

        p.x(xEnter + (xHold - xEnter) * eIn + (xExit - xHold) * eOut, immediate);
        p.y(yEnter + (yHold - yEnter) * eIn + (yExit - yHold) * eOut, immediate);
        // Rotations decay to ±PANE_HOLD_ROT at hold, then rotate back out
        // toward their entry attitude as the pane leaves.
        p.rz(
          s *
            (PANE_ENTER_ROT_Z +
              (PANE_HOLD_ROT - PANE_ENTER_ROT_Z) * eIn +
              (PANE_ENTER_ROT_Z - PANE_HOLD_ROT) * eOut),
          immediate,
        );
        p.ry(
          -s *
            (PANE_ENTER_ROT_Y +
              (PANE_HOLD_ROT - PANE_ENTER_ROT_Y) * eIn +
              (PANE_ENTER_ROT_Y - PANE_HOLD_ROT) * eOut),
          immediate,
        );
        p.o(eIn * (1 - eOut), immediate);
        const sc =
          PANE_ENTER_SCALE +
          (1 - PANE_ENTER_SCALE) * eIn +
          (PANE_EXIT_SCALE - 1) * eOut;
        p.sx(sc, immediate);
        p.sy(sc, immediate);

        // `.is-held` — written ONCE per threshold crossing (never per
        // frame): inside the HOLD window the CSS strike draws through the
        // ✗ line. Pane 0's window opens at u=0 (its enter is pre-done), so
        // the class agrees with the SSR markup at progress 0.
        const held = u < HOLD_END && (i === 0 || u >= HOLD_START);
        if (held !== p.held) {
          p.held = held;
          p.el.classList.toggle("is-held", held);
          // First-ever hold ALSO lands the add-only `.is-lit` at this same
          // single write point: the pane-content transition-delay chain
          // (✓ rise → divider → ✗ rise → index) plays ONCE and never
          // reverses — scrub-out keeps the content (round-2 §C2). A pure
          // `.is-held` keying cannot express "reverse nothing" (removing
          // the class reverts the computed styles), hence the companion.
          if (held) p.el.classList.add("is-lit");
        }
      }

      // Statement parallax: one slow drift across the whole runway.
      stmtY(STATEMENT_DRIFT_PX * (1 - 2 * progress), immediate);

      // Counter tracks the active beat; the roll fires only on change
      // (direction follows the scrub), and snaps on the immediate path.
      const active = Math.min(BEATS - 1, Math.max(0, Math.floor(bp)));
      if (active !== lastActive && counterEl) {
        const dir: 1 | -1 = active > lastActive ? 1 : -1;
        lastActive = active;
        rollCounter(String(active + 1).padStart(2, "0"), dir, immediate);
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
      // Refresh the pose units the frame loop converts through (its only
      // viewport dependency — never read inside the loop itself).
      vwUnit = window.innerWidth / 100;
      vhUnit = vh / 100;
      // Content-agnostic runway: 100vh + 6×70vh in px (a font swap can
      // never change document height → no downstream anchor drift).
      travel = Math.round(vh * BEATS * BEAT_VH);
      runway.style.height = `${vh + travel}px`;
      secTop = runway.getBoundingClientRect().top + window.scrollY;
    };
    measure();

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
    // (FOCUS_LOCK_AT inside the beat window), where the pane is parked at
    // HOLD with the strike drawn. Lazy getters over the live measure() vars.
    const clearSnapPoints: Array<() => void> = [
      snapPoint(() => secTop),
      ...Array.from({ length: BEATS }, (_, i) =>
        snapPoint(() => secTop + travel * ((i + FOCUS_LOCK_AT) / BP_MAX)),
      ),
    ];

    /* ---- Keyboard: focusin inside a pane → its lock scroll position --- *
     * Panes contain no focusables today (the strike row is plain text);
     * the handler stays wired so any future link inside a pane converts
     * focus into the pane's HOLD scroll position instead of the browser
     * scrolling the overflow:hidden sticky frame off its pin.             */

    const onFocusIn = (e: FocusEvent) => {
      const pane = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-fit-pane]",
      );
      if (!pane) return;
      // Undo the browser's auto-scroll of the overflow:hidden sticky frame
      // BEFORE anything reads layout.
      sticky.scrollTop = 0;
      sticky.scrollLeft = 0;
      const idx = Number(pane.dataset.fitPane ?? 0);
      const targetY = secTop + travel * ((idx + FOCUS_LOCK_AT) / BP_MAX);
      if (Math.abs(window.scrollY - targetY) < 2) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    sticky.addEventListener("focusin", onFocusIn);

    // Late re-measure once webfonts land (~1.6s guard for other sections'
    // SplitText intros): the runway itself is pure-vh, but the CONTENT ABOVE
    // this section reflows on the font swap, which moves secTop. The provider
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
      // Settle to a readable state — the next arm (language toggle re-run)
      // re-primes every pose anyway. `.is-held` classes are left as-is: the
      // re-arm's init snap re-derives them from the restored progress.
      panes.forEach((p) => {
        gsap.killTweensOf(p.el);
        gsap.set(p.el, { clearProps: "transform,opacity" });
      });
      if (statementEl) {
        gsap.killTweensOf(statementEl);
        gsap.set(statementEl, { clearProps: "transform" });
      }
      gsap.set(skewWrap, { skewX: 0 });
      if (lineEl) gsap.set(lineEl, { clearProps: "transform" });
      // Park the counter roller mid-flight or not: current layer in flow,
      // incoming layer off below (its SSR rest pose) — the re-arm's init
      // snap re-writes the text through the immediate path anyway.
      if (counterCur && counterInc) {
        gsap.killTweensOf([counterCur, counterInc]);
        gsap.set(counterCur, { clearProps: "transform" });
        gsap.set(counterInc, { yPercent: 100 });
      }
      // The px runway height is deliberately NOT cleared here. This cleanup
      // runs on every EN↔IT toggle too (isEn is a dep), and collapsing the
      // runway mid-read clamps the scroll position and ejects the reader out
      // of the section. Release lives in the mode-flip effect above; the
      // re-arm below re-measures it in place.
    };
  }, [detected, mode, isEn]);

  // Statement intro (round-2 life pass) — pinned mode only. On the FIRST
  // entry of the pinned frame (IO on the runway, once per arm) the giant
  // title plays a masked SplitText line-rise and the annotation blur-fades
  // in after it. The statement is SSR-painted at full opacity: the hidden
  // prime happens ONLY inside play() — set → play in the SAME tick — so the
  // SSR text is never parked hidden waiting on a trigger, and a no-JS page
  // never hides it at all. RM never reaches the pinned path (mode detection
  // flips it to native) but is guarded here anyway. The h2 carries
  // key={language}: SplitText owns the subtree once split (revert()
  // restores an innerHTML snapshot), so the EN↔IT toggle must remount it —
  // this effect's cleanup reverts the old (then detached) split harmlessly
  // and the re-arm splits the fresh node (heading-choreographer contract).
  useEffect(() => {
    if (!detected || mode !== "pinned") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const runway = runwayRef.current;
    if (!runway) return;

    let cancelled = false;
    let played = false;
    let split: SplitText | null = null;
    const tweens: gsap.core.Tween[] = [];

    const play = () => {
      if (played || cancelled) return;
      played = true;
      const title = runway.querySelector<HTMLElement>("[data-fit-title]");
      const annot = runway.querySelector<HTMLElement>("[data-fit-annotation]");
      if (title) {
        split = new SplitText(title, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
        });
        // Prime hidden and play in the SAME tick — no hidden rest state.
        gsap.set(split.lines, { yPercent: INTRO_Y_PERCENT });
        tweens.push(
          gsap.to(split.lines, {
            yPercent: 0,
            duration: INTRO_DURATION,
            stagger: INTRO_STAGGER,
            ease: "expo.out",
          }),
        );
      }
      if (annot) {
        tweens.push(
          gsap.fromTo(
            annot,
            { autoAlpha: 0, filter: "blur(10px)" },
            {
              autoAlpha: 1,
              filter: "blur(0px)",
              duration: 0.7,
              delay: INTRO_ANNOT_DELAY,
              ease: "power2.out",
            },
          ),
        );
      }
    };

    // Fire once the statement is actually ARRIVING in the frame: the runway
    // top crossing ~65% of the viewport puts the title's first lines in the
    // frame's lower third, so the rise is seen rather than spent off-screen.
    // A restored scroll / anchor jump landing inside the runway intersects
    // immediately and plays on arrival.
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        // Fonts must be settled or the line boxes split wrong mid-swap
        // (heading-choreographer rule). Already-loaded fonts resolve in a
        // microtask, so prime + play still land before the next paint.
        const ready = document.fonts?.ready;
        if (ready) {
          ready.then(() => play()).catch(() => play());
        } else {
          play();
        }
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(runway);

    return () => {
      cancelled = true;
      io.disconnect();
      tweens.forEach((t) => t.kill());
      split?.revert();
      const annot = runway.querySelector<HTMLElement>("[data-fit-annotation]");
      if (annot) gsap.set(annot, { clearProps: "opacity,visibility,filter" });
    };
  }, [detected, mode, isEn]);

  /* ---- Shared strings / blocks (copy byte-identical) ------------------ */

  // Single-sourced: the native branch renders it through SectionHeading,
  // the pinned branch hangs it top-right as the annotation.
  const description = isEn
    ? "What follows describes a good brief, not a hurdle. And if the honest answer is spend the money elsewhere, or wait, we'd rather say that on the first call than three weeks in."
    : "Quella che segue è la descrizione di un buon brief, non un esame. E se la risposta onesta è spendere altrove, o aspettare, preferiamo dirlo alla prima call, non dopo tre settimane.";

  // NATIVE BRANCHES ONLY (the pinned branch sets the title as the in-frame
  // chapter statement instead). `mb-6` is the base-only value: below 640px
  // the 48px `sm:mb-16` gap under the heading is a third of a paired row —
  // chrome the phone cannot afford.
  const headingBlock = (
    <div className="relative mb-6 sm:mb-16">
      <SectionHeading
        eyebrow={isEn ? "Honest about fit" : "Onesti sul fit"}
        title={
          isEn ? (
            <>
              We are honest about{" "}
              <span className="inline-block font-display italic text-ink">
                who we work with.
              </span>
            </>
          ) : (
            <>
              Siamo onesti su{" "}
              <span className="inline-block font-display italic text-ink">
                con chi lavoriamo.
              </span>
            </>
          )
        }
        description={description}
        className="max-w-3xl"
      />
    </div>
  );

  const closingBlock = (
    <p className="text-[14px] text-ink-mute max-w-md">
      {isEn ? (
        <>
          If you&apos;re unsure, send the brief. We&apos;ll tell you quickly,
          and in writing.
        </>
      ) : (
        <>
          Se avete dubbi, inviateci il brief. Ve lo diremo in fretta, e per
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
        // Round 7-3 (continuous-space spec §B.3): tint + glow removed at
        // BOTH variants (this native path and the pinned verdict wall below
        // stay twins). Pane hairlines (glass-pane grammar chrome) stay.
        className="relative section-lg scroll-mt-24 overflow-hidden"
      >
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

  /* ---- Pinned "Verdict wall" layout (SSR default) ---------------------- *
   * NO overflow-hidden on the section — an ancestor overflow-hidden would
   * defeat position: sticky; clipping lives on the sticky frame itself.
   * No heading above the runway: the title IS the pinned chapter statement
   * inside the frame.                                                       */
  return (
    // Round 7-3: tint removed (twin of the native variant above).
    <section id="fit" className="relative scroll-mt-24">
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
          {/* (Round 7-3: the SectionGlow that lived here was removed with
              the section tint — no floating wash edges in the verdict wall.) */}

          {/* ---- The statement (z-10) — the chapter type. Painted at full
               opacity from SSR; its only motion is the slow parallax drift
               the scrub feeds through [data-fit-statement]'s y chaser
               (SSR ships y = +14px, the drift's progress-0 value). Sat
               slightly below center — the Noomo pose. */}
          <div className="absolute inset-x-0 top-[52%] z-10 -translate-y-1/2">
            <div
              data-fit-statement
              className="container-px will-change-transform"
              style={{ transform: "translateY(14px)" }}
            >
              {/* Plain `.eyebrow` (no [data-eyebrow-text]) → the global
                  LabelScrambler owns its decode reveal. */}
              <p className="eyebrow mb-6">
                {isEn ? "Honest about fit" : "Onesti sul fit"}
              </p>
              {/* key={language}: SplitText remount discipline — see the
                  statement-intro effect. */}
              <h2
                key={language}
                data-fit-title
                className="max-w-[11ch] font-display font-medium text-[clamp(3rem,6.5vw,7.5rem)] leading-[0.98] tracking-[-0.02em] text-ink"
              >
                {isEn ? (
                  <>
                    We are honest about{" "}
                    <span className="font-display italic text-ink">
                      who we work with.
                    </span>
                  </>
                ) : (
                  <>
                    Siamo onesti su{" "}
                    <span className="font-display italic text-ink">
                      con chi lavoriamo.
                    </span>
                  </>
                )}
              </h2>
            </div>
          </div>

          {/* ---- The annotation (z-10) — the description hung top-right as
               a small column (the Noomo/Lusion pairing). Static in the
               scrub; blur-fades in after the statement's intro rise. */}
          <div className="container-px absolute inset-x-0 top-[12vh] z-10">
            <p
              data-fit-annotation
              className="ml-auto w-[300px] max-w-[38vw] text-[13px] leading-relaxed text-ink-mute"
            >
              {description}
            </p>
          </div>

          {/* ---- The pane field (z-20, in FRONT of the type) — REAL copy,
               NOT aria-hidden. Velocity skew lives on this wrapper only
               (never the statement); panes are absolutely stacked on the
               frame center (xPercent/yPercent −50) and driven by their
               windowed POV chasers. The constant perspective gives the yaw
               poses their depth; backdrop-blur is constant per pane (never
               animated). SSR paints pane 0 at HOLD, the rest at enter-rest,
               so the first pinned frame is never empty. */}
          <div
            ref={skewRef}
            className="absolute inset-0 z-20 will-change-transform"
            style={{ perspective: "1200px" }}
          >
            {goodFit.map((line, i) => (
              <div
                key={i}
                data-fit-pane={i}
                className={`fit-pane absolute left-1/2 top-1/2 w-[min(30rem,38vw)] rounded-2xl bg-[hsl(216_30%_10%/0.55)] p-6 shadow-[0_24px_80px_-32px_hsl(220_60%_2%/0.8)] backdrop-blur-xl will-change-transform ${
                  i % 2 === 0 ? "z-20" : "z-30"
                }${i === 0 ? " is-held is-lit" : ""}`}
                style={
                  i === 0
                    ? {
                        // Must agree with the runtime's u=0 pose (the arm's
                        // gsap.set + applyAll at progress 0): HOLD slot,
                        // rotations decayed to ±PANE_HOLD_ROT. GSAP's
                        // transform order is translate → rotate → rotateY.
                        transform:
                          "translate(calc(-50% + 8vw), calc(-50% - 2vh)) rotate(1.5deg) rotateY(-1.5deg)",
                      }
                    : {
                        opacity: 0,
                        transform: `translate(calc(-50% ${
                          i % 2 === 0 ? "+ 54vw" : "- 54vw"
                        }), calc(-50% + 18vh))`,
                      }
                }
              >
                {/* Top hairline — the pane's only chrome (NO border). */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)] via-[hsl(var(--accent)/0.25)] to-transparent"
                />
                {/* ✓ row — masked rise on first HOLD (the `.is-lit` chain).
                    The mask wrapper is layout-neutral; the inner row is the
                    riser. */}
                <div className="overflow-hidden">
                  <div className="fit-pane__rise flex items-start gap-3">
                    <Check
                      className="mt-[3px] h-4 w-4 shrink-0 text-[hsl(var(--accent))]"
                      aria-hidden="true"
                    />
                    <p className="text-[17px] leading-snug text-ink">
                      <span className="sr-only">
                        {isEn ? "Good fit" : "Buon fit"}:{" "}
                      </span>
                      {line}
                    </p>
                  </div>
                </div>
                <div
                  aria-hidden="true"
                  className="fit-pane__divider my-4 h-px bg-[hsl(var(--rule)/0.6)]"
                />
                {/* ✗ row — same masked rise, delayed. The mask pads out by
                    the strike wash's ::after excursion (−2px/−5px inset) so
                    the drawn strike never clips; padding + negative margin
                    cancel, so the layout is byte-identical. */}
                <div className="fit-pane__row--bad -mx-[5px] -my-[2px] overflow-hidden px-[5px] py-[2px]">
                  <p className="fit-pane__bad fit-pane__rise relative font-mono text-[12px] leading-tight text-ink-mute">
                    <span className="sr-only">
                      {isEn ? "Not a fit" : "Non è un fit"}:{" "}
                    </span>
                    <span aria-hidden="true">✗ </span>
                    {notAFit[i]}
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="fit-pane__index mt-4 text-right font-mono text-[10px] tracking-[0.18em] text-ink-dim"
                >
                  {`0${i + 1}`}
                </div>
              </div>
            ))}
          </div>

          {/* ---- Chrome: big mono counter + scrub progress line with `+`
               beat ticks (AT/igloo garnish). Pure presentation →
               aria-hidden. Above the pane plane so progress stays legible
               while a pane passes. */}
          <div
            aria-hidden="true"
            className="container-px absolute inset-x-0 bottom-8 z-40 sm:bottom-10"
          >
            <div className="flex items-end gap-6 sm:gap-8">
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                {/* Rolling readout: two stacked layers inside a clipped box.
                    clip-path (never overflow:hidden — that synthesizes the
                    baseline from the box bottom and would misalign the
                    "/ 06" label) keeps the real text baseline; the scrub's
                    rollCounter helper translateY-rolls the layers. */}
                <span
                  data-fit-counter
                  className="relative inline-block text-[1.9rem] leading-none tracking-tight text-ink"
                  style={{ clipPath: "inset(0)" }}
                >
                  <span
                    data-fit-counter-cur
                    className="block will-change-transform"
                  >
                    01
                  </span>
                  <span
                    data-fit-counter-inc
                    className="absolute inset-0 will-change-transform"
                    style={{ transform: "translateY(100%)" }}
                  >
                    01
                  </span>
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
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] leading-none text-ink-dim"
                    style={{
                      left: `${(((i + 1) / BP_MAX) * 100).toFixed(2)}%`,
                    }}
                  >
                    +
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Verdict strike — same grammar as the paired rows (a wash + a
              strike rule, never a cover). `.is-held` is toggled by the
              scrub at the HOLD window's threshold crossings (one class
              write per crossing, never per frame); the 560ms draw is
              CSS-owned, so scrubbing back up reverses it just as cleanly.
              Round-2 §C2: the FIRST hold also lands the add-only `.is-lit`
              (same write point), and a transition-delay chain stagger-plays
              the pane content — ✓ row masked-rise (0ms) → divider scaleX
              (140ms) → ✗ row rise (240ms) → the strike (620ms, forward
              only) → index fade (420ms). `.is-lit` never comes off, so
              scrub-out reverses nothing; only the strike stays reversible
              on `.is-held` (its reverse keeps the base zero delay). Pane 0
              ships `.is-lit` from SSR — parked at HOLD, content settled —
              so the first pinned frame (and the no-JS page) is never
              empty. */}
          <style>{`
            /* SplitText margin-collapse guard for the statement intro. The
               global headroom rule pads every .split-line-mask (0.12em block
               padding + equal negative margins), but its companion flex rule
               is keyed on [data-split-reveal], which this h2 deliberately
               does NOT carry (the intro is IO-timed locally, not owned by
               HeadingChoreographer). In normal block flow the adjacent
               masks' negative block margins would COLLAPSE (-0.12em +
               -0.12em -> a single -0.12em), growing the split statement by
               0.12em per line junction (~14px/line at 7.5rem) the moment
               the split lands. Flex items never collapse margins — same fix,
               same shape, scoped to this h2 while masks exist. */
            [data-fit-title]:has(> .split-line-mask) {
              display: flex;
              flex-direction: column;
            }
            .fit-pane__bad {
              text-decoration-line: line-through;
              text-decoration-color: transparent;
              text-decoration-thickness: 1px;
            }
            .fit-pane__bad::after {
              content: "";
              position: absolute;
              inset: -2px -5px;
              border-radius: 3px;
              background: hsl(36 84% 56% / 0.1);
              border-right: 1px solid hsl(36 84% 62% / 0.45);
              transform: scaleX(0);
              transform-origin: 0% 50%;
              transition: transform 560ms var(--ease-lusion);
              pointer-events: none;
            }
            /* The chain (forward-only, keyed on the add-only .is-lit). */
            .fit-pane__rise {
              transform: translateY(110%);
              transition: transform 640ms var(--ease-lusion);
            }
            /* The ✗ p carries BOTH .fit-pane__bad and .fit-pane__rise — one
               combined shorthand owns the element (two competing shorthands
               would drop whichever loses the cascade). Property order is
               load-bearing: the .is-held delay list below maps onto it. */
            .fit-pane__bad.fit-pane__rise {
              transition:
                transform 640ms var(--ease-lusion) 240ms,
                text-decoration-color 560ms var(--ease-lusion);
            }
            .fit-pane__divider {
              transform: scaleX(0);
              transform-origin: 0% 50%;
              transition: transform 560ms var(--ease-lusion) 140ms;
            }
            .fit-pane__index {
              opacity: 0;
              transition: opacity 480ms var(--ease-lusion) 420ms;
            }
            .fit-pane.is-lit .fit-pane__rise { transform: translateY(0); }
            .fit-pane.is-lit .fit-pane__divider { transform: scaleX(1); }
            .fit-pane.is-lit .fit-pane__index { opacity: 1; }
            /* Strike — reversible on .is-held (existing behavior). Forward
               draw waits for the ✗ row to land (620ms); the reverse keeps
               the base zero delay. The delay list is [transform 240ms,
               text-decoration-color 620ms] against the combined shorthand's
               property order, so the row's rise timing never inherits the
               strike's delay. */
            .fit-pane.is-held .fit-pane__bad {
              text-decoration-color: hsl(36 84% 56% / 0.6);
              transition-delay: 240ms, 620ms;
            }
            .fit-pane.is-held .fit-pane__bad::after {
              transform: scaleX(1);
              transition-delay: 620ms;
            }
            @media (prefers-reduced-motion: reduce) {
              .fit-pane__bad,
              .fit-pane__bad.fit-pane__rise,
              .fit-pane__bad::after,
              .fit-pane__rise,
              .fit-pane__divider,
              .fit-pane__index { transition: none; }
              /* Settled, visible, motionless — covers the pre-detection SSR
                 frame on an RM device (detection then flips to native). */
              .fit-pane__rise { transform: none; }
              .fit-pane__divider { transform: scaleX(1); }
              .fit-pane__index { opacity: 1; }
            }
          `}</style>
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

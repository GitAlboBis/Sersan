"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/ui/section-heading";
import { founders, type FounderProfile } from "@/data/founders";
import { POSITIONING, pick } from "@/data/copy";
import { useLanguage } from "@/components/language-provider";
import { getLenis } from "@/lib/lenis-singleton";
import { snapPoint } from "@/lib/scroll-snap";
import { useCentreFocus, type CentreFocusRef } from "@/lib/use-centre-focus";
import { DragRail } from "@/components/ui/drag-rail";
import {
  useFoundersMorphStore,
  foundersGateApi,
  MORPH_MAX,
  STAGE_TOTAL,
  stageIndex,
} from "@/webgl/store/foundersMorphStore";
import { useIntroStore } from "@/webgl/store/introStore";
import { founderCardMotion } from "@/webgl/store/founderMotion";
import { useTierStore } from "@/webgl/store/tierStore";
import { RAIL_ISLANDS_TOUCH } from "@/lib/spine";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * FoundersRail — the home founders block.
 *
 * THREE presentation modes (all copy verbatim from src/data/founders.ts):
 *
 *   1. MORPH (full tier + a RESOLVED WebGPU backend + a roomy pinned desktop):
 *      a VERTICAL CSS-sticky
 *      stage. The WebGL particle-portrait morph island (webgl/FounderPortraitMorph)
 *      renders a particle cloud over [data-founder-stage] that composes the first
 *      person, decomposes into a swarm mid-leg, and recomposes the next — for
 *      STAGE_TOTAL people chained A→B→C. Every DOM copy block hands off in
 *      lockstep with the island's live progress scalar (store.morph, 0..MORPH_MAX)
 *      — the departing block exits early in the leg, the swarm owns the stage
 *      alone through the middle, the arriving block enters child-by-child late —
 *      and a small gate chrome (stage counter + accent hairline + idle scroll
 *      hint, the fit-section grammar) tells the user the page is intentionally
 *      held. INTERIOR people (Michele and Alberto at N=4) both enter and exit; only the two
 *      sequence ENDS are one-sided, and that falls out of the leg-local math with
 *      no special-casing. The DOM portrait posters in the stage cross-fade too but
 *      are driven transparent once the cloud is live (they stay a graceful static
 *      poster on a flag-on WebGL2 fallback); kept in the a11y tree (img alt).
 *      Pure CSS sticky — NO ScrollTrigger `pin:`
 *      (a pin-spacer would break the [data-line-anchor="founders"] measurement of
 *      the signature line), section height = 100vh + travel set in px by measure().
 *
 *   2. HORIZONTAL RAIL (pinned desktop, NOT morph-eligible): the previous sticky
 *      horizontal set-piece, full DOM (SVG duotone portrait + hover clip reveal +
 *      windowed name sweep + portrait parallax). Complete fallback on its own.
 *
 *   3. NATIVE (mobile / coarse pointer / prefers-reduced-motion): a plain
 *      overflow-x snap scroller, no pinning, portraits simply visible. Its
 *      cards use the FLOW panel layout (see FounderPanel) — min-height instead
 *      of a fixed height, copy in normal flow — so a founder's bio, credential
 *      chips and LinkedIn link can never be clipped on a narrow phone (D-13).
 *
 *      3b. NATIVE + TOUCH MORPH (mobile-parity plan Phase 4d, lib/spine.ts
 *      RAIL_ISLANDS_TOUCH): on a CAPABLE PHONE (tier lite + fxBudget.level ≥ 2
 *      + a resolved true-WebGPU backend — never tier "full") the native
 *      scroller ALSO arms a continuous SCRUB source for the WebGL morph
 *      island: ONE passive `scroll` listener on the DragRail scroller writes
 *      `scrollLeft` + `scrub` (the focused card's offset from its snap-rest
 *      position, 0..MORPH_MAX, an exact integer at snap rest) into
 *      foundersMorphStore, with `native` as the liveness flag (`pinned` stays
 *      false; no gate, no scroll-jack, no preventDefault, no transforms). The
 *      island (FounderPortraitMorph, `touch` prop) scrubs its progress scalar
 *      straight from it and places the cloud over the focused card's media
 *      area (the card minus its `[data-founder-copy]` block). MUTUAL
 *      EXCLUSIVITY (the lattice rule): the DOM duotone→colour reveal stays the
 *      WHOLE visual until the island publishes `active` (all founders loaded
 *      + sampled + GPU-built); at that instant every card's [data-founder-media]
 *      is driven to opacity 0 and the article gets `data-morph-live` (its 45%
 *      navy bg goes transparent so the cloud painting BEHIND the page is not
 *      dimmed) — a DOM latch, so the island's rebuild flap of `active` never
 *      flashes the photo back. If the island never goes live within 12 s
 *      (`morphFailed`, same one-way door as mode 1), stays NOT live for 3 s
 *      after having been live (a rebuild that never returns — the bounded
 *      re-live door, same `morphFailed` exit) or the predicate drops
 *      (stepDownBudget, flag off) the effect cleanup restores the media and
 *      resets the store: no content-loss path exists. With the flag off, on
 *      level ≤ 1, on WebGL2 or on desktop the effect never arms and the DOM
 *      is byte-identical to today.
 *
 * PORTRAIT COLOUR REVEAL (modes 2 and 3, D-1): the duotone→colour clip reveal
 * has two triggers — `:hover` on a fine pointer, and `[data-focus="true"]` on
 * touch, written by lib/use-centre-focus on whichever card the reader has
 * scrolled to the middle of the viewport. The hook is inert on a fine pointer,
 * so desktop hover is untouched; under reduced motion it reveals every card at
 * once with no transition, because content must never be gated on motion.
 *
 * All three carry every founder's name/role/shortBio/credentials/previouslyAt/
 * LinkedIn as real, keyboard-focusable DOM. SSR renders modes 1/2's pinned
 * layout (all links in the initial HTML).
 */

/** Windowed counter-sweep travel for the big display name (px at |t| = 1). */
const SWEEP_PX = 150;
/** Portrait counter-parallax at |t| = 1, in % of the 112%-bleed media layer. */
const PARALLAX_PCT = 5;
/** SVG mask coordinate space (portrait-ish, cover-cropped via `slice`). */
const MASK_W = 800;
const MASK_H = 1000;
/**
 * Final reveal radius: covers the farthest corner from center
 * (√(400² + 500²) ≈ 640) plus the displacement's max inward excursion
 * (scale 70 → ±35), with margin.
 */
const MASK_FINAL_R = 700;
/** Panel-center viewport fraction at which the entry reveal completes. */
const REVEAL_END = 0.55;

// --- MORPH-mode navigation ---------------------------------------------------
// 2026-08-27 (owner): the scroll-jack gate that pinned the page and mapped
// wheel/touch gestures to stage changes is GONE. The page scrolls normally
// through the section; people change via the ← → buttons / keys (see the
// canMorph effect). The G_* / GATE_* constants that parameterised the gate
// were removed with it.
/* Max time (ms) the gate may hold the page before force-releasing (safety).
 * THIS BOUNDS SILENCE, NOT THE TOTAL SESSION. A per-session budget cannot be
 * made large enough: any fixed total ejects a slow reader mid-sequence, and at
 * N=4 (was N=3) the ejection is worse than it was at N=2 — the recovery path (scroll back
 * up → fromBottom → engage(MORPH_MAX)) lands on the LAST person, skipping the
 * one they were reading. With two stages every locked stage was an extreme end,
 * so either re-entry was legitimate.
 *
 * So `engageTime` is re-armed on REAL PROGRESS (a leg actually starting, inside
 * step()) and nowhere else. Deliberately NOT re-armed in consume()/noteInput():
 * step() early-returns while `!assembleDone`, so in the wedge case the user
 * wheels continuously and nothing advances — that is precisely when this timer
 * has to fire, and resetting on raw input would pin the page forever. The
 * scrollbar-fight case is covered independently by the `drift > 15%` release.
 *
 * Side benefit: the timer can no longer expire while a 1.4s leg is in flight,
 * which closes the largest entry point into the release()-mid-leg case
 * documented below.
 *
 * KNOWN, PRE-EXISTING: a force-release calls release(lastDir), which does NOT
 * touch morphTarget — so if Escape or the drift valve fires mid-leg the island
 * finishes that leg on its own clock while the page scrolls away. The leg
 * COMPLETES and lands on a locked, consistent stage (and the next engage()
 * reasserts the target with immediate:true), so this is a visible unowned
 * animation, not a broken state. Deliberately NOT fixed here.
 * (Historical note kept for the record — the gate no longer exists.) */

// --- MORPH-mode copy handoff (pure functions of the island's live progress
// scalar, so reverse legs mirror automatically) -------------------------------
//
// EVERY window below is LEG-LOCAL: it is evaluated against progress WITHIN one
// leg (0..1), not against the raw 0..MORPH_MAX scalar. applyStage derives the
// two leg-local coordinates per block — `local = m - i` (how far this block has
// DEPARTED) and `u = local + 1` (how far the leg that BRINGS it in has run) —
// so these constants keep their EXACT shipped values and the first leg is
// numerically byte-identical to what ships today. That is the whole reason the
// N-stage generalisation costs no retuning.
/** A departing block's copy EXITS over local∈[start,end] — it leaves BEFORE the
 * swarm owns the stage, instead of ghost-overlapping the next person at 50/50. */
const COPY_EXIT_START = 0.02;
const COPY_EXIT_END = 0.3;
/** Exit travel (px, upward — the copy lifts away with the dissolving face). */
const COPY_EXIT_Y = 16;
/** An arriving block's copy ENTERS over u∈[start,end], child by child (counter →
 * name → bio → chips → previously → link). The window ends at 0.98 — exactly
 * the island's per-leg lock threshold (1 − LOCK_EPS) — so a leg can never lock
 * with copy still mid-flight. */
const COPY_ENTER_START = 0.7;
const COPY_ENTER_END = 0.98;
/** Per-child window offset in m-space (the arrival stagger). */
const COPY_ENTER_STAGGER = 0.035;
/** Enter travel (px, from below). */
const COPY_ENTER_Y = 18;
/** MORPH-mode ← → buttons (the chrome). Same pill grammar as the LinkedIn
 * link; `aria-disabled` (not `disabled`) so the end buttons stay focusable
 * and announce their state. */
const NAV_BTN_CLASS =
  "grid h-7 w-7 place-items-center rounded-full border border-[hsl(var(--ink)/0.14)] bg-[hsl(var(--bg)/0.5)] font-mono text-[11px] leading-none text-ink-dim backdrop-blur transition-[border-color,background-color,opacity,transform,color] duration-300 hover:border-[hsl(var(--accent)/0.7)] hover:text-[hsl(var(--accent))] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] aria-disabled:pointer-events-none aria-disabled:opacity-30";
/** DOM label pool for the TeamOrbit island (≥ its ORBIT_MAX = 24). */
const ORBIT_LABEL_POOL = 24;
/** Auto-advance dwell at a locked stage (Lusion: 5 s via timeBaseChangeSpeed
 * 0.2). Paused while the pointer is over the stage (the reader is engaged)
 * and while a leg plays; any manual step resets it. */
const AUTO_ADVANCE_MS = 7000;
/** Pointer-cursor tuning (Lusion's #about-who-face-cursor). */
const CURSOR_FOLLOW = 14; // damp rate toward the pointer
const CURSOR_SCALE_MAX = 1.9; // at high pointer speed
const CURSOR_SPEED_REF = 900; // px/s that reads as "fast"

/** clamped smoothstep(edge0, edge1, x). */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1e-6)));
  return t * t * (3 - 2 * t);
}

/**
 * Duotone→color reveal treatment (shared visual contract with the About-page
 * portraits — about-client.tsx carries the same block; keep them in sync).
 * `--fr-hr` is a registered custom property so the clip-path radius (color
 * layer) and its +1.5px cyan annulus (ring layer) interpolate together from
 * one transition. `--fr-mx/--fr-my` are set once per pointerenter (JS writes
 * a CSS var — the animation itself is pure CSS). Without @property support
 * the reveal snaps instead of easing, which is an acceptable degradation.
 * `.founder-portrait` is the article ROOT (full-bleed card), so border-color
 * joins the transition here — the shorthand would otherwise reset Tailwind's
 * transition-colors longhands.
 *
 * TWO TRIGGERS, one per input class (D-1):
 *   - `:hover`, fine pointer only — unchanged.
 *   - `[data-focus="true"]`, touch only — written by lib/use-centre-focus on
 *     the card nearest the viewport centre. Without it `--fr-hr` stayed at 0px
 *     forever on a phone: the full-colour <img> was downloaded and never
 *     painted, and every founder read as a permanently grey photograph.
 * The reveal circle centres itself (`--fr-mx/--fr-my` default to 50%) because
 * onPortraitEnter deliberately ignores non-mouse pointers — the touch path must
 * never depend on it.
 *
 * The ONE line that is deliberately NOT identical to about-client's copy is the
 * touch selector: here the `.founder-portrait` article IS the registered card
 * (78vh — it owns the centre band for as long as it is on screen), while About
 * registers the surrounding `.card-steel` because its portrait is an 80px
 * circle that would cross the band in a beat. Do not "resync" them.
 */
const PORTRAIT_CSS = `
@property --fr-hr {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 0px;
}
.founder-portrait {
  --fr-hr: 0px;
  transition: --fr-hr 0.65s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease;
}
.founder-portrait__base {
  filter: grayscale(1) brightness(0.85);
}
.founder-portrait__color {
  clip-path: circle(var(--fr-hr) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
.founder-portrait__ring {
  background: #3BE1FF;
  opacity: 0;
  transition: opacity 0.25s ease;
  clip-path: circle(calc(var(--fr-hr) + 1.5px) at var(--fr-mx, 50%) var(--fr-my, 50%));
}
@media (hover: hover) and (pointer: fine) {
  .founder-portrait:hover { --fr-hr: 150%; }
  .founder-portrait:hover .founder-portrait__ring { opacity: 0.9; }
}
/* Touch: centre-focus is the reveal. Same radius, same transition, no pointer. */
.founder-portrait[data-focus="true"] { --fr-hr: 150%; }
.founder-portrait[data-focus="true"] .founder-portrait__ring { opacity: 0.9; }
@media (prefers-reduced-motion: reduce) {
  .founder-portrait,
  .founder-portrait__ring { transition: none; }
}
/* Morph-stage poster cross-fade easing (the two [data-founder-stage] portraits
   are driven imperatively via gsap.quickSetter; this softens the flip when the
   WebGL cloud goes live and the posters are driven transparent). */
[data-founder-stage] [data-founder-media] {
  transition: opacity 0.45s ease;
}
/* Touch morph live (Phase 4d): the WebGL cloud paints BEHIND the page, so the
   card's 45% navy bg would dim it — transparent while the island owns the
   visual. Written by the native touch writer, removed on any revert. */
.founder-portrait[data-morph-live="true"] { background: transparent; }
`;

/** Touch morph (Phase 4d): px deadband around each snap target inside which
 *  `scrub` snaps to the exact integer — keeps the face LOCKED (inside
 *  LOCK_EPS 0.02 ≈ 7px on a 359px pitch) under scroll-snap rounding at rest. */
const SCRUB_DEADBAND_PX = 2;
/** Touch morph: island-never-went-live grace before the DOM reveal is made
 *  the final visual (mirrors the mode-1 morphFailGrace; see that comment). */
const TOUCH_MORPH_FAIL_MS = 12000;
/** Touch morph: after the island HAS been live, how long `active` may stay
 *  false (rebuild in flight) before the media is handed back to the DOM via
 *  the same `morphFailed` door — bounds the "blank cards" window a rebuild
 *  that never returns would otherwise leave open for the whole mount. */
const TOUCH_MORPH_RELIVE_MS = 3000;

/** Per-panel elements + cached geometry driven by the single ScrollTrigger. */
type PanelFx = {
  li: HTMLElement;
  circle: SVGCircleElement;
  name: HTMLElement;
  media: HTMLElement;
  setName: (v: number) => void;
  setMedia: (v: number) => void;
  width: number;
  baseCenter: number;
  lastR: number;
};

/** Shared chip treatment: translucent bg + backdrop-blur so chips hold AA
 * contrast even where they overhang the scrim's fade zone. */
const CHIP_CLASS =
  "inline-flex items-center rounded-full border border-[hsl(var(--ink)/0.18)] bg-[hsl(var(--bg)/0.55)] px-2.5 py-1 backdrop-blur-sm";

/**
 * Standalone founder copy column — name / role / shortBio / credential chips /
 * previouslyAt / LinkedIn. Used by the MORPH stage (two of these overlaid,
 * cross-fading on scroll). Copy verbatim from src/data/founders.ts.
 */
function FounderCopy({
  f,
  index,
  total,
  isEn,
}: {
  f: FounderProfile;
  index: number;
  total: number;
  isEn: boolean;
}) {
  const role = isEn ? f.roleEn : f.roleIt;
  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </span>
      <div>
        <h3 className="font-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[0.95] text-ink">
          {f.name}
        </h3>
        <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
          {role}
        </p>
      </div>
      <p className="max-w-[52ch] text-[13px] sm:text-[14px] text-ink-mute leading-relaxed">
        {isEn ? f.shortBioEn : f.shortBioIt}
      </p>
      <ul className="flex flex-wrap gap-1.5 list-none">
        {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
          <li
            key={c}
            className={`${CHIP_CLASS} gap-2 text-[11px] text-ink leading-snug`}
          >
            <span
              aria-hidden="true"
              className="block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
            />
            <span>{c}</span>
          </li>
        ))}
      </ul>
      {f.previouslyAt && f.previouslyAt.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70">
            {isEn ? "Previously" : "In precedenza"}
          </span>
          <ul className="contents list-none">
            {f.previouslyAt.map((co) => (
              <li
                key={co}
                className={`${CHIP_CLASS} font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute`}
              >
                {co}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        href={f.linkedIn}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${f.name} on LinkedIn`}
        className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
      >
        {isEn ? "LinkedIn" : "LinkedIn"}
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/**
 * D-13 — the card's copy must never be clipped.
 *
 * The pinned horizontal rail sizes every panel to a FIXED height so the row
 * reads as one filmstrip inside its h-[100svh] frame, and its copy is absolutely
 * positioned on the scrim. That is correct there: the panels are ≤34rem wide on
 * a ≥769px fine-pointer viewport, where the name + role + bio + credential chips
 * + "Previously" chips + LinkedIn always fit the bottom half.
 *
 * On the native scroller they do not. At the ~343px a `w-[88vw]` card gets on a
 * 390px phone the same stack is roughly twice as tall, and because the article
 * was `h-[min(78vh,46rem)] overflow-hidden` with the copy pinned to
 * `bottom-0`, the block grew UPWARD past the top edge and was cut, with no
 * scroll able to reach it — the founder's bio and credentials simply did not
 * exist on a phone. (`78vh` also re-sized under the address bar.)
 *
 * So the native cards switch to `layout="flow"`: the article becomes a flex
 * column with a MIN height instead of a fixed one, and the copy is an ordinary
 * in-flow child pushed down by `mt-auto`. Short copy still sits on the bottom
 * edge exactly as before; long copy grows the card instead of being cut. The
 * media stays `absolute inset-y-0`, so it covers whatever height the card ends
 * up at. Because a taller card pushes the copy above the full-bleed scrim's
 * fade zone, the flow variant carries its own gradient behind the text block —
 * contrast can then never depend on how tall the copy happens to be.
 */
type PanelLayout = "fixed" | "flow";

/** The flow variant's own scrim: the card-level gradient is anchored to the
 *  card's height, this one to the text block's, so AA contrast holds at any
 *  copy length (and in either language — IT runs longer). */
const FLOW_COPY_SCRIM =
  "linear-gradient(to top, rgba(11,20,34,0.95) 0%, rgba(11,20,34,0.9) 55%, rgba(11,20,34,0.62) 82%, rgba(11,20,34,0) 100%)";

function FounderPanel({
  f,
  index,
  total,
  isEn,
  focusRef,
  layout = "fixed",
}: {
  f: FounderProfile;
  index: number;
  total: number;
  isEn: boolean;
  /** Centre-focus registration (touch only; inert on a fine pointer). */
  focusRef: CentreFocusRef;
  /** "fixed" = the pinned rail's filmstrip panel; "flow" = the native card
   *  that sizes to its own copy (see the block comment above). */
  layout?: PanelLayout;
}) {
  const flow = layout === "flow";
  // SVG filter/mask ids must be document-unique AND SSR-stable → useId.
  // The delimiter chars (":" / "«»") break unquoted CSS url() references,
  // so strip them.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `founder-boil-${uid}`;
  const maskId = `founder-mask-${uid}`;

  const role = isEn ? f.roleEn : f.roleIt;

  // One rect read per pointer ENTRY (event-driven — never in a frame loop):
  // anchors the CSS clip-path circle at the point the cursor came in.
  // MOUSE ONLY, and the touch reveal deliberately does not depend on it: with
  // no --fr-mx/--fr-my written, the clip circle falls back to 50%/50% and
  // expands from the portrait's centre, which is the right gesture-free reveal.
  const onPortraitEnter = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    el.style.setProperty(
      "--fr-mx",
      `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`,
    );
    el.style.setProperty(
      "--fr-my",
      `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`,
    );
  };

  return (
    <article
      id={`founder-${f.anchor}`}
      ref={focusRef}
      onPointerEnter={onPortraitEnter}
      className={`founder-portrait group relative w-full overflow-hidden rounded-lg border border-[hsl(var(--rule))] bg-[hsl(216_28%_10%/0.45)] hover:border-[hsl(var(--accent)/0.45)] ${
        flow
          ? "flex min-h-[min(78svh,46rem)] flex-col"
          : "h-[min(78svh,46rem)]"
      }`}
    >
      {/* Full-bleed media — covers the ENTIRE panel; the article's
          overflow-hidden clips the 112% bleed. Counter-parallax target:
          everything (masked base, ring, color layer) slides together so
          hover + reveal stay registered. */}
      <div
        data-founder-media
        className="absolute inset-y-0 left-[-6%] w-[112%] will-change-transform"
      >
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${MASK_W} ${MASK_H}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label={`${f.name}, ${role}`}
        >
          <defs>
            {/* Static noise field; only the circle animates through it.
                Region constrained (perf: CPU rasterization). */}
            <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.035"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="70"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            <mask id={maskId}>
              {/* SSR-final radius: the portrait is visible without JS;
                  the pinned scrub re-seeds it from rail progress. */}
              <circle
                data-founder-maskcircle
                cx={MASK_W / 2}
                cy={MASK_H / 2}
                r={MASK_FINAL_R}
                fill="#fff"
                style={{ filter: `url(#${filterId})` }}
              />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            {/* Duotone base: grayscale image under a navy scrim. */}
            <image
              href={f.image}
              x="0"
              y="0"
              width={MASK_W}
              height={MASK_H}
              preserveAspectRatio="xMidYMid slice"
              className="founder-portrait__base"
            />
            <rect
              x="0"
              y="0"
              width={MASK_W}
              height={MASK_H}
              fill="#0B1422"
              opacity="0.35"
            />
          </g>
        </svg>
        {/* Cyan annulus riding 1.5px outside the color layer's clip edge. */}
        <div aria-hidden="true" className="founder-portrait__ring absolute inset-0" />
        {/* Full-color layer, revealed by the expanding clip circle. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.image}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="lazy"
          className="founder-portrait__color absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Bottom scrim — paints ABOVE the media (including the hover color
          layer) so the overlaid copy keeps AA contrast in every state:
          #0B1422 at 90%+ under the text block, transparent ~55% up. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,20,34,0.92) 0%, rgba(11,20,34,0.82) 26%, rgba(11,20,34,0.4) 42%, rgba(11,20,34,0) 58%)",
        }}
      />

      {/* Counter — top-left, over the raw image (shadow for legibility). */}
      <span className="absolute left-6 top-6 z-10 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums [text-shadow:0_1px_10px_rgba(11,20,34,0.9)] sm:left-7 sm:top-7">
        {String(index + 1).padStart(2, "0")} /{" "}
        {String(total).padStart(2, "0")}
      </span>

      {/* Overlay stack — ALL copy rides the scrim, nothing beside the image.
          The huge display name carries the windowed counter-sweep (transform
          on the inner span, clipped by the article's overflow-hidden).
          pointer-events-none except LinkedIn, so the article owns hover.
          FLOW (native/touch): in normal flow, pushed to the bottom by mt-auto,
          so copy taller than the card's min height GROWS the card rather than
          overflowing its top edge (D-13). */}
      <div
        className={`pointer-events-none z-10 flex flex-col gap-3 p-6 sm:p-7 ${
          flow ? "relative mt-auto" : "absolute inset-x-0 bottom-0"
        }`}
        style={flow ? { background: FLOW_COPY_SCRIM } : undefined}
        /* Phase 4d: the touch morph island measures this block so the cloud's
           stage is the card MINUS its copy (flow layout only — the fixed
           panel's DOM stays byte-identical). */
        {...(flow ? { "data-founder-copy": "" } : {})}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[0.95] text-ink">
              <span data-founder-name className="inline-block will-change-transform">
                {f.name}
              </span>
            </h3>
            <p className="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
              {role}
            </p>
          </div>
          <Link
            href={f.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${f.name} on LinkedIn`}
            className="pointer-events-auto inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] text-ink-mute hover:text-ink hover:border-[hsl(var(--accent)/0.6)] transition-colors backdrop-blur"
          >
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="max-w-[52ch] text-[13px] sm:text-[14px] text-ink-mute leading-relaxed">
          {isEn ? f.shortBioEn : f.shortBioIt}
        </p>

        <ul className="flex flex-wrap gap-1.5 list-none">
          {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
            <li
              key={c}
              className={`${CHIP_CLASS} gap-2 text-[11px] text-ink leading-snug`}
            >
              <span
                aria-hidden="true"
                className="block w-1 h-1 rounded-full bg-[hsl(var(--accent)/0.8)] shrink-0"
              />
              <span>{c}</span>
            </li>
          ))}
        </ul>

        {f.previouslyAt && f.previouslyAt.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute/70">
              {isEn ? "Previously" : "In precedenza"}
            </span>
            <ul className="contents list-none">
              {f.previouslyAt.map((co) => (
                <li
                  key={co}
                  className={`${CHIP_CLASS} font-mono text-[10px] tracking-[0.1em] uppercase text-ink-mute`}
                >
                  {co}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function FoundersRail() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const tier = useTierStore((s) => s.tier);
  const tierResolved = useTierStore((s) => s.resolved);
  // The RESOLVED runtime backend (null until the Canvas exists). NOT the
  // build-time WebGPU flag — see canMorph below.
  const backend = useTierStore((s) => s.backend);

  // SSR default = pinned (desktop) layout so all links are in the initial
  // HTML — same convention as case-studies-rail.
  const [mode, setMode] = useState<"pinned" | "native">("pinned");
  const [detected, setDetected] = useState(false);
  // Enough room for the morph stage's TWO-COLUMN layout (see the mode effect).
  const [roomy, setRoomy] = useState(false);

  // Island liveness latch. `canMorph` goes true as soon as the RUNTIME backend
  // is webgpu, so the morph branch renders — but the island can still fail for
  // reasons that have nothing to do with the backend: any one of the N
  // loadFounder promises rejecting (Promise.all is all-or-nothing), or any
  // single readGrid returning null (which makes samplePortraitSet return null
  // for the WHOLE set). Then setActive(true) is never reached, `morph` stays 0,
  // and every copy block and poster past the first stays visibility:hidden —
  // i.e. all but the first person's name, bio and LinkedIn link are unreachable
  // to both mouse and screen reader. Each extra portrait adds another
  // independent failure input to this all-or-nothing path.
  //
  // Latch on "NEVER WENT LIVE", not on the instantaneous `active` flag: the
  // island's build cleanup calls setActive(false) on EVERY rebuild, so a
  // resize-triggered rebuild in flight at the grace deadline would eject a
  // perfectly healthy morph.
  const everLiveRef = useRef(false);
  const [morphFailed, setMorphFailed] = useState(false);

  // MORPH mode: the WebGL particle-portrait island is mounted (Scene.tsx). It
  // requires the RESOLVED pinned desktop path + full tier + a viewport with
  // room for the two-column stage + a TRUE-WebGPU runtime backend.
  // tierStore uses strict `innerWidth < 768` while the mode effect uses
  // matchMedia('(max-width: 768px)'), so gating on detected + mode==='pinned'
  // guarantees: whenever the section is native for ANY reason, the DOM portrait
  // shows and no store writes leak. On pinned-but-not-eligible it falls back
  // to the horizontal DOM rail (mode 2).
  //
  // `backend === "webgpu"` (NOT `webgpuEnabled()`): the flag is a build-time
  // env read, so on a flag-on build in a browser without WebGPU the renderer
  // resolves to the WebGL2 fallback and the island — which requires a compute
  // backend — never builds and never calls setActive(true). The gate then never
  // engages, `morph` never advances, and every copy block + poster past the
  // first (all rendered at opacity 0) stayed permanently invisible and
  // unreachable. The horizontal rail shows EVERY person, so it is the correct
  // fallback (and, unlike the morph stage, it has no engine target cap). `null`
  // (unresolved) is deliberately falsy: first paint must never show a layout
  // the island may turn out to be unable to drive.
  //
  // `roomy`: the morph stage stacks a 26rem portrait ABOVE the copy column
  // below the `lg` breakpoint, inside a `h-screen … overflow-hidden` sticky
  // frame — ~1360px of content that gets clipped at BOTH ends (heading, and the
  // credential chips / Previously row / LinkedIn link) on 769–1023px-wide or
  // short viewports, with no scroll position able to reveal it. Below the floor
  // the horizontal rail, which is sized for an h-screen frame, takes over.
  const canMorph =
    detected &&
    mode === "pinned" &&
    roomy &&
    tierResolved &&
    tier === "full" &&
    backend === "webgpu" &&
    // The island rendered but never went live → fall through to the horizontal
    // rail, which renders EVERY person as real focusable DOM. The gate effect is
    // keyed on [canMorph], so its cleanup restores lenis.start(), setPinned(false)
    // and the section height automatically.
    !morphFailed;

  // ...but `backend === null` means two different things, and only ONE of them
  // means "the rail is the answer". `backend` is written once from Scene.tsx's
  // `onCreated`, which sits behind next/dynamic(ssr:false) + `await
  // renderer.init()` (async adapter/device negotiation) — so on the primary
  // target machine there is a guaranteed multi-frame window where every morph
  // precondition holds and the backend simply hasn't reported yet. Rendering
  // the rail MARKUP through that window is correct and deliberate (it shows
  // every person as real, focusable DOM — the safe first paint). ARMING the
  // rail's machinery through it is not: measure() writes
  // `section.style.height = innerHeight + travel`, per-panel quickSetters are
  // built and a ScrollTrigger is created, all to be torn down a few frames
  // later when the backend resolves to webgpu.
  //
  // So: "undecided" = every OTHER morph precondition already holds and the
  // backend alone is outstanding. Any session where the rail is the FINAL
  // answer — WebGL2 (backend non-null), lite/off tier, a sub-1024px or short
  // viewport (roomy false), native mode — fails this predicate and arms the
  // rail immediately, exactly as before.
  const morphUndecided =
    detected &&
    mode === "pinned" &&
    roomy &&
    tierResolved &&
    tier === "full" &&
    backend === null;

  // D-1: on touch the duotone→colour portrait reveal has no pointer to fire it,
  // so the card nearest the viewport centre fires it instead. Inert on a fine
  // pointer — desktop keeps :hover, unchanged. One hook, every FounderPanel in
  // whichever mode renders (native scroller AND horizontal rail).
  const portraitFocusRef = useCentreFocus();

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLUListElement | null>(null);
  // The NATIVE branch's <section> — the touch morph writer (mode 3b) finds the
  // DragRail's [data-rail-scroller] and the founder articles beneath it.
  const nativeSectionRef = useRef<HTMLElement | null>(null);

  // Phase 4d touch predicate — the SAME shape as Scene.tsx's `railIslandsTouch`
  // (RAIL_ISLANDS_TOUCH && tier !== "full" && level ≥ 2 && backend webgpu) as
  // ONE boolean selector: a constant false on desktop (tier full — the pinned
  // morph/rail paths never see it), flips true once on a capable phone when
  // the backend resolves. `mode === "native"` is implied on level ≥ 2 (coarse
  // ⇒ native) but is asserted explicitly in the effect.
  const islandsTouch = useTierStore(
    (s) =>
      RAIL_ISLANDS_TOUCH &&
      s.tier !== "full" &&
      s.fxBudget.level >= 2 &&
      s.backend === "webgpu",
  );
  // One entry per morph stage, indexed by stage (0 = Alessandro, 1 = Michele,
  // 2 = Alberto, 3 = Mattia). NOT querySelectorAll: the gate effect reads these
  // synchronously below (refs are already committed there), and a query would
  // be order-fragile against the poster imgs that share [data-founder-media].
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageImgRefs = useRef<(HTMLImageElement | null)[]>([]);

  // Mode detection is a SUBSCRIPTION, not a one-shot sample (D-18): a window
  // snapped narrow, devtools docked, a stylus swapped for a mouse or an OS
  // reduced-motion toggle must flip the path live. Sampling once on mount kept
  // the pinned path — and its measurements — alive against a viewport that no
  // longer existed, while every sibling section (case-studies-rail, the spine)
  // already subscribed. `roomy` was the only query here that did.
  //
  // `roomy` is the viewport floor for the MORPH layout (see canMorph): below it
  // the two-column stage clips its own copy inside the overflow-hidden sticky
  // frame, so the horizontal rail takes over. Both queries resolve in this one
  // client effect alongside `detected`, so SSR markup is unaffected and no
  // store writes leak.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const modeQs = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    const roomQ = window.matchMedia(
      "(min-width: 1024px) and (min-height: 780px)",
    );
    const sync = () => {
      setMode(modeQs.some((q) => q.matches) ? "native" : "pinned");
      setRoomy(roomQ.matches);
      setDetected(true);
    };
    sync();
    modeQs.forEach((q) => q.addEventListener("change", sync));
    roomQ.addEventListener("change", sync);
    return () => {
      modeQs.forEach((q) => q.removeEventListener("change", sync));
      roomQ.removeEventListener("change", sync);
    };
  }, []);

  // === MORPH mode: pinned stage + GATED, self-playing morph ==================
  // Mirrors HeroIntroGate. When the section top reaches the viewport top the
  // gate ENGAGES: Lenis is stopped, the section snaps to top, and wheel/touch is
  // consumed here. Each scroll-down gesture triggers a ONE-SHOT auto-play of the
  // NEXT leg (the island plays it on its own clock, absorbing extra scroll);
  // only a gesture at a true sequence BOUNDARY releases the page. Reverse
  // symmetrically for scroll-up. NO
  // ScrollTrigger `pin:` — the section's own height is the runway, so the
  // [data-line-anchor="founders"] waypoint stays measurable. NEVER permanently
  // hijacks: a hard-delta cap, a max-engage timer, and Escape all force-release.
  useEffect(() => {
    if (!canMorph) return;
    const section = sectionRef.current;
    if (!section) return;

    const store = useFoundersMorphStore.getState();

    // --- Copy writers: ONE UNIFORM BUNDLE PER BLOCK ---------------------------
    // Every block gets BOTH a block-level exit writer (opacity + y) and
    // per-child enter writers. The two ENDS of the sequence need no
    // special-casing: block 0's enter term always evaluates to 1 (its `u` is
    // permanently past COPY_ENTER_END) and the last block's exit term always to
    // 0 (its `local` never goes positive) — they fall out of the leg-local math
    // in applyStage. INTERIOR blocks (Michele and Alberto at N=4) get both, which is the
    // only genuinely new DOM behaviour in the N-stage widening.
    //
    // Block opacity multiplies child opacity in the compositor, so exit-on-the-
    // block and enter-on-the-children compose without fighting — exactly how the
    // shipped A/B pair already behaves.
    //
    // NOTE: block 0's children are GSAP-driven for the FIRST TIME here (today
    // only block B's are). The VALUES are identical to today — every child rests
    // at opacity 1 / y 0 — but the WRITES are new: each child now carries an
    // explicit transform and so becomes a containing block. Watch the credential
    // chips' backdrop-blur at stage A; block B's chips already live under the
    // same treatment, so this is consistent rather than novel.
    //
    // Writers are built ONCE — the child elements are stable across language
    // toggles (only text nodes change). A block's inline opacity:0 (i > 0) is a
    // FIRST-CLIENT-PAINT contract, NOT an SSR/hydration one: this branch is
    // client-only (canMorph depends on `detected`, set in a client effect), so
    // the morph markup never appears in the server HTML and never renders on the
    // first client render either. The guard covers the frames between the
    // canMorph commit and this effect arming the children — without it all
    // STAGE_TOTAL copy blocks paint stacked on top of one another. It is
    // load-bearing; do not delete it on the belief that "there is no SSR here".
    // Once armed the block flips to opacity 1 and the children
    // own the presentation (applyStage below immediately re-poses everything for
    // the store's current morph value, so a mid-leg remount shows the right
    // block, not a flash). Priming the full transform BEFORE creating the writers
    // is the repo convention (unrecorded components trip "not eligible for
    // reset").
    type BlockFx = {
      el: HTMLElement;
      setOp: (v: number) => void;
      setY: (v: number) => void;
      children: {
        el: HTMLElement;
        start: number;
        dur: number;
        setO: (v: number) => void;
        setY: (v: number) => void;
      }[];
      lastHidden: boolean | null;
    };
    const blocks: BlockFx[] = [];
    copyRefs.current.slice(0, STAGE_TOTAL).forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { opacity: 1, y: 0 });
      const kids = Array.from(el.querySelectorAll<HTMLElement>(":scope > div > *"));
      // `dur` is PER BLOCK, not shared: FounderCopy renders a `previouslyAt` row
      // only when the data has one, so Michele has 6 children where Alessandro,
      // Alberto and Mattia have 5. A single shared dur would land the 5-child blocks'
      // last child at 0.945 instead of COPY_ENTER_END (0.98) — early, not late,
      // but still off the lock.
      const dur = Math.max(
        0.06,
        COPY_ENTER_END - COPY_ENTER_START - (kids.length - 1) * COPY_ENTER_STAGGER,
      );
      const children = kids.map((k, j) => {
        gsap.set(k, i === 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: COPY_ENTER_Y });
        return {
          el: k,
          start: COPY_ENTER_START + j * COPY_ENTER_STAGGER,
          dur,
          setO: gsap.quickSetter(k, "opacity") as (v: number) => void,
          setY: gsap.quickSetter(k, "y", "px") as (v: number) => void,
        };
      });
      blocks[i] = {
        el,
        setOp: gsap.quickSetter(el, "opacity") as (v: number) => void,
        setY: gsap.quickSetter(el, "y", "px") as (v: number) => void,
        children,
        lastHidden: null,
      };
    });
    const setImgs = stageImgRefs.current
      .slice(0, STAGE_TOTAL)
      .map((el) =>
        el ? (gsap.quickSetter(el, "opacity") as (v: number) => void) : null,
      );

    // --- Gate affordance chrome ---------------------------------------------
    // Same grammar as fit-section's counter + progress line: mono stage
    // counter, a 1px accent hairline whose scaleX tracks the live morph, and
    // a scroll hint that surfaces after idle at a locked stage. This is what
    // stops the hijack from reading as broken scroll. The cluster exists ONLY
    // in this canMorph JSX branch (zero on fallback paths), ships with inline
    // opacity 0, and only becomes visible while the gate holds the page.
    const chromeEl = section.querySelector<HTMLElement>(
      "[data-founders-chrome]",
    );
    const chromeCounterEl = section.querySelector<HTMLElement>(
      "[data-founders-counter]",
    );
    // One dwell hairline per person block (each overlay carries its own);
    // all are written together — only the visible block's shows.
    const chromeLineEls = Array.from(
      section.querySelectorAll<HTMLElement>("[data-founders-line]"),
    );
    const setChromeLines = chromeLineEls.map(
      (el) => gsap.quickSetter(el, "scaleX") as (v: number) => void,
    );
    chromeLineEls.forEach((el) =>
      gsap.set(el, { transformOrigin: "0% 50%", scaleX: 0 }),
    );
    let lastLineQ = -1;
    const setChromeLine = (v: number) => {
      const q = Math.round(v * 256) / 256;
      if (q === lastLineQ) return;
      lastLineQ = q;
      for (const s of setChromeLines) s(q);
    };
    let lastCounter = "";
    let chromeShown = false;
    /** Chrome (counter, hairline, ← → buttons) fades in once the cloud is
     * live and the section is in view; it stays for the section's lifetime
     * (there is no gate to hide it behind any more). */
    const showChrome = () => {
      if (!chromeEl || chromeShown) return;
      chromeShown = true;
      gsap.killTweensOf(chromeEl);
      gsap.to(chromeEl, { opacity: 1, duration: 0.5, ease: "expo.out" });
    };

    // Copy handoff + chrome FOLLOW the island's live progress scalar
    // (store.morph, 0..MORPH_MAX), NOT scroll. Three readable acts per leg, all
    // pure functions of m so reverse legs mirror automatically: the departing
    // block leaves over [EXIT_START, EXIT_END], the swarm owns the stage ALONE
    // through the middle, the arriving block enters child by child over
    // [ENTER_START, ENTER_END] — never the old 50/50 ghost overlay.
    //
    // The generalisation is TWO leg-local coordinates per block i:
    //   local = m - i   → how far block i has DEPARTED   (its leg is m∈[i, i+1])
    //   u     = local+1 → how far the leg that BRINGS IT IN has run (m∈[i-1, i])
    // Every COPY_* window is then evaluated in leg-local space and keeps its
    // exact shipped value. The edges need no branches:
    //   - block 0:   local = m ≥ 0 → u ≥ 1 > COPY_ENTER_END, so every child
    //                saturates at 1. Permanently "entered", exactly as today.
    //   - block N−1: local ≤ 0 → exitT = 0. Never exits, exactly as today.
    //   - blocks 1 and 2 at N=4 are MIDDLE blocks and correctly get both:
    //                block 1 enters over m∈[0.7, 0.98] and exits over
    //                m∈[1.02, 1.3]; block 2 one leg later.
    // At N=2 this is numerically identical to the shipped two-block form.
    //
    // Posters: the static portrait is ONLY a fallback (WebGL2 session / very slow
    // build). On a real WebGPU backend we want to go STRAIGHT to the particles
    // with no photo→particles flash, so the poster stays hidden unless the cloud
    // has NOT gone live by the grace deadline below (`posterShown`). Once it's a
    // confirmed fallback, the poster cross-fades on morph like before.
    let posterShown = false;
    const applyStage = (m: number) => {
      const hidePosters = useFoundersMorphStore.getState().active || !posterShown;
      for (let i = 0; i < STAGE_TOTAL; i++) {
        const local = m - i; // > 0 while this block is DEPARTING
        const u = local + 1; // 0..1 across the leg that BRINGS it in
        const exitT = smoothstep(COPY_EXIT_START, COPY_EXIT_END, local);
        const b = blocks[i];
        if (b) {
          b.setOp(1 - exitT);
          b.setY(-COPY_EXIT_Y * exitT);
          for (const c of b.children) {
            const e = smoothstep(c.start, c.start + c.dur, u);
            c.setO(e);
            c.setY(COPY_ENTER_Y * (1 - e));
          }
          // The blocks OVERLAY each other, so a fully-faded block must drop out
          // of hit-testing AND the tab order (visibility, not just opacity) — an
          // invisible LinkedIn link must never swallow a click or a Tab stop.
          // Driven directly by m (no tween to interrupt); mid-swarm EVERY block
          // is hidden by design — the swarm is the content there, and a leg
          // always plays through to a locked end on the island's own clock.
          const hidden = exitT >= 1 || u <= COPY_ENTER_START;
          if (hidden !== b.lastHidden) {
            b.lastHidden = hidden;
            b.el.style.visibility = hidden ? "hidden" : "";
          }
        }
        // Poster i = (entering weight) × (1 − exiting weight). Both legs use the
        // SAME 0.35/0.65 window, so the visible posters sum to exactly 1 at every
        // m and the seam at integer m is one poster at 1 — no flash, no dip.
        // Fallback-only (contract unchanged).
        const set = setImgs[i];
        if (set) {
          set(
            hidePosters
              ? 0
              : smoothstep(0.35, 0.65, u) * (1 - smoothstep(0.35, 0.65, local)),
          );
        }
      }
      // Counter flips at each leg MIDPOINT. (The hairline is the auto-advance
      // dwell timer now — written from the tick, not from m.)
      if (chromeCounterEl) {
        // Math.round is half-up, so this flips at each leg midpoint — exactly
        // reproducing the shipped `m >= 0.5 ? "02" : "01"` and extending it.
        const label = String(Math.min(Math.round(m), MORPH_MAX) + 1).padStart(
          2,
          "0",
        );
        if (label !== lastCounter) {
          lastCounter = label;
          chromeCounterEl.textContent = label;
        }
      }
    };

    const measure = () => {
      // No travel (gate model): the section is exactly one viewport tall — the
      // gate holds the page while a leg plays. secTop drives island placement.
      //
      // THE SECTION STAYS ONE VIEWPORT TALL REGARDLESS OF STAGE COUNT. `travel`
      // is literally 0: the hold is produced by lenis.stop() plus the per-frame
      // re-snap in tick(), NOT by a tall runway, so a third (or fourth) stage
      // costs ZERO extra scroll pixels. Do not "make room" by growing the
      // height — that creates dead space the gate immediately re-snaps away
      // from, and it moves the [data-line-anchor="founders"] waypoint the header
      // warns about. What lengthens with stage count is the TIME budget
      // (G_MAX_ENGAGE_MS), not the geometry.
      section.style.height = `${window.innerHeight}px`;
      const secTop = section.getBoundingClientRect().top + window.scrollY;
      store.setLayout(0, secTop);
      store.bumpMeasure();
    };

    measure();
    // `pinned` now means "the MORPH DOM mode is live" (the island renders
    // when it is set) — the page itself is never pinned any more.
    store.setPinned(true);
    applyStage(store.morph);

    // Poster hides the instant the cloud goes live; copy follows uMorph; the
    // ← → buttons follow the target so the ends read as disabled.
    const unsub = useFoundersMorphStore.subscribe((s, prev) => {
      // Sticky liveness latch — see everLiveRef. `active` alone flaps on rebuild.
      if (s.active) everLiveRef.current = true;
      if (s.morph !== prev.morph || s.active !== prev.active) applyStage(s.morph);
      if (s.morphTarget !== prev.morphTarget || s.stage !== prev.stage) {
        updateArrows();
      }
    });

    // Poster fallback grace: reveal the static poster ONLY if the WebGPU cloud
    // has not gone live shortly after mount (a WebGL2-fallback session, where
    // the island returns null and `active` never flips true). On a real WebGPU
    // backend `active` becomes true first, so the poster never shows and there is
    // no photo→particles flash — the section goes straight to the particles.
    const posterGrace = setTimeout(() => {
      const live = useFoundersMorphStore.getState();
      // Read the flag too, not just the latch: `active` can already have been
      // true before this effect subscribed.
      if (live.active) everLiveRef.current = true;
      if (!live.active) {
        posterShown = true;
        applyStage(live.morph);
      }
    }, 4000);

    // A11y failsafe, SEPARATE from the poster grace above and deliberately much
    // later. If the island NEVER goes live, blocks 1..N-1 stay visibility:hidden
    // forever and those people are unreachable to mouse and screen reader — so
    // drop the whole morph branch and fall through to the horizontal rail, which
    // renders everyone as real focusable DOM.
    //
    // WHY NOT REUSE THE 4s POSTER TIMER: the poster is REVERSIBLE (it hides the
    // instant `active` flips), whereas this is a ONE-WAY DOOR — once the branch
    // is dropped the morph does not come back this mount. The island's build is
    // a cold-cache network path (four headshots + the three/webgpu, three/tsl
    // and gpgpu dynamic chunks, then sampling and the GPU build), which can
    // legitimately exceed 4s on a slow connection; latching failure there would
    // cost a healthy session its flagship visual. 12s is past any plausible
    // honest build and still bounds the a11y hole to a few seconds.
    //
    // Checked against the LATCH, never the instantaneous `active` flag: the
    // island's build cleanup calls setActive(false) on EVERY rebuild, so a
    // resize-triggered rebuild in flight at this deadline would otherwise eject
    // a perfectly healthy morph.
    const morphFailGrace = setTimeout(() => {
      if (useFoundersMorphStore.getState().active) everLiveRef.current = true;
      if (!everLiveRef.current) setMorphFailed(true);
    }, 12000);

    // --- NAVIGATION — no scroll-jack (owner 2026-08-27) -----------------------
    // The page is NEVER held any more. Stage changes come from the ← → arrow
    // buttons in the chrome, the ← → keys while the section is centred, or
    // the dev hook (simulateGesture). A leg self-plays on the island's clock
    // (MORPH_DURATION) and locks; a gesture past either end is a no-op and
    // the corresponding button reads as disabled. Nothing here touches Lenis.
    let dwellMs = 0; // auto-advance timer (ms at the current locked stage)
    const step = (dir: number, wrap = false) => {
      const s = useFoundersMorphStore.getState();
      if (s.stage === "morphing" || !s.assembleDone) return; // absorb mid-play
      const i = stageIndex(s.stage);
      if (i < 0) return;
      let next = i + (dir > 0 ? 1 : -1);
      if (next < 0 || next > MORPH_MAX) {
        if (!wrap) return;
        // Auto-advance wraps: the chain is linear (A→B→C→D), so the way back
        // to the first person is a multi-leg rewind on the island's clock —
        // deliberately visible, like a film spooling back.
        next = next < 0 ? MORPH_MAX : 0;
      }
      dwellMs = 0;
      setChromeLine(0);
      s.setMorphTarget(next, false);
    };
    const getGate = () => {
      const s = useFoundersMorphStore.getState();
      return {
        engaged: false, // kept for the dev-handle shape; there is no gate
        stage: s.stage,
        stageIndex: stageIndex(s.stage),
        morphTarget: s.morphTarget,
        armed: s.stage !== "morphing" && s.assembleDone,
        accum: 0,
      };
    };
    // Dev hook: "down" = next person, "up" = previous (same names as before so
    // the island's __sersanFounderMorph.simulateGesture proxy keeps working).
    const simulateGesture = (dir: "up" | "down") => {
      step(dir === "down" ? 1 : -1);
      return getGate();
    };
    if (process.env.NODE_ENV !== "production") {
      foundersGateApi.current = { simulateGesture, getGate };
    }

    const prevBtn = section.querySelector<HTMLButtonElement>("[data-founders-prev]");
    const nextBtn = section.querySelector<HTMLButtonElement>("[data-founders-next]");
    function updateArrows() {
      const s = useFoundersMorphStore.getState();
      const atStart = s.morphTarget <= 0;
      const atEnd = s.morphTarget >= MORPH_MAX;
      prevBtn?.setAttribute("aria-disabled", String(atStart));
      nextBtn?.setAttribute("aria-disabled", String(atEnd));
    }
    const onPrev = () => step(-1);
    const onNext = () => step(1);
    prevBtn?.addEventListener("click", onPrev);
    nextBtn?.addEventListener("click", onNext);
    updateArrows();

    // ← → keys navigate while the section is centred in the viewport and no
    // editable element has focus. Nothing else is intercepted (Tab, PageDown,
    // Space, arrows up/down all keep their native meaning — the page scrolls).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return;
      const r = section.getBoundingClientRect();
      const ih = window.innerHeight;
      if (r.top > ih * 0.5 || r.bottom < ih * 0.5) return; // not centred
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };

    // --- Pointer-cursor (Lusion's face cursor) --------------------------------
    // Follows the pointer inside the stage (damped), scales with pointer
    // speed, arrow turns by the side of the stage centre the pointer is on;
    // click on the stage steps in that direction. Coordinates are frame-
    // relative (the cursor element is a child of the sticky frame).
    const cursorEl = section.querySelector<HTMLElement>("[data-founders-cursor]");
    const cursorArrowEl = section.querySelector<HTMLElement>(
      "[data-founders-cursor-arrow]",
    );
    const stageEl = section.querySelector<HTMLElement>("[data-founder-stage]");
    const frameEl = stickyRef.current;
    let curTargetX = 0;
    let curTargetY = 0;
    let curX = 0;
    let curY = 0;
    let curSpeed = 0; // px/s, decays
    let curLastT = 0;
    let curLastX = 0;
    let curLastY = 0;
    let curActive = 0; // eased 0..1 (visible)
    let curOver = false;
    let curDir = 1; // +1 = right half (next), −1 = left half (prev)
    let curRot = 0; // eased 0 (→) .. 1 (←)
    let curSeeded = false;
    const onCursorMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (!frameEl || !stageEl) return;
      const fr = frameEl.getBoundingClientRect();
      const sr = stageEl.getBoundingClientRect();
      curTargetX = e.clientX - fr.left;
      curTargetY = e.clientY - fr.top;
      const now = performance.now();
      if (curLastT > 0) {
        const dt = Math.max(1, now - curLastT) / 1000;
        const v = Math.hypot(e.clientX - curLastX, e.clientY - curLastY) / dt;
        curSpeed = Math.max(curSpeed, Math.min(v, CURSOR_SPEED_REF * 2.5));
      }
      curLastT = now;
      curLastX = e.clientX;
      curLastY = e.clientY;
      curDir = e.clientX > sr.left + sr.width / 2 ? 1 : -1;
      curOver = true;
      if (!curSeeded) {
        curSeeded = true;
        curX = curTargetX;
        curY = curTargetY;
      }
    };
    const onCursorLeave = () => {
      curOver = false;
    };
    const onStageClick = (e: MouseEvent) => {
      if (!stageEl) return;
      const sr = stageEl.getBoundingClientRect();
      step(e.clientX > sr.left + sr.width / 2 ? 1 : -1);
    };
    stageEl?.addEventListener("pointermove", onCursorMove);
    stageEl?.addEventListener("pointerleave", onCursorLeave);
    stageEl?.addEventListener("click", onStageClick);

    // Per-frame: keep the island's camera-lock docTop FRESH (cheap, no
    // rebuild — a layout shift above must never leave secTop stale), start
    // forming the first face as soon as the section peeks in, surface the
    // chrome once the cloud is live, run the auto-advance dwell timer, and
    // animate the pointer-cursor.
    let raf = 0;
    let lastTick = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;
      const rect = section.getBoundingClientRect();
      const top = rect.top;
      const ihNow = window.innerHeight;
      const live = useFoundersMorphStore.getState();
      const docTop = top + window.scrollY;
      if (Math.abs(live.secTop - docTop) > 0.5) live.setLayout(0, docTop);
      const peeking = top < ihNow && rect.bottom > 0;
      const centred = top < ihNow * 0.5 && rect.bottom > ihNow * 0.5;
      if (peeking) {
        live.setReveal(1);
        if (live.active) showChrome();
      }

      // Auto-advance: dwell only while centred, locked, live and not hovered.
      if (
        centred &&
        live.active &&
        live.assembleDone &&
        live.stage !== "morphing" &&
        !curOver
      ) {
        dwellMs += dt * 1000;
        if (dwellMs >= AUTO_ADVANCE_MS) step(1, true);
      }
      setChromeLine(Math.min(1, dwellMs / AUTO_ADVANCE_MS));

      // Pointer-cursor easing.
      if (cursorEl) {
        const k = 1 - Math.exp(-CURSOR_FOLLOW * dt);
        curX += (curTargetX - curX) * k;
        curY += (curTargetY - curY) * k;
        curSpeed *= Math.exp(-6 * dt);
        const wantActive = curOver && live.active && centred ? 1 : 0;
        curActive += (wantActive - curActive) * (1 - Math.exp(-10 * dt));
        curRot += ((curDir < 0 ? 1 : 0) - curRot) * (1 - Math.exp(-12 * dt));
        // backOut on the entry, speed-scaled like Lusion's
        // min(2.5, vel/5 + 1) · backOut(activeRatio).
        const a = curActive;
        const back = 1 + 2.7 * Math.pow(a - 1, 3) + 1.7 * Math.pow(a - 1, 2);
        const scale =
          Math.max(0.001, back) *
          (1 + (CURSOR_SCALE_MAX - 1) * Math.min(1, curSpeed / CURSOR_SPEED_REF));
        cursorEl.style.opacity = a < 0.01 ? "0" : "1";
        cursorEl.style.transform = `translate3d(${curX.toFixed(1)}px,${curY.toFixed(1)}px,0) translate3d(-50%,-50%,0) scale(${scale.toFixed(3)})`;
        if (cursorArrowEl) {
          // backInOut on the flip, plus a little overshoot from the pointer's
          // own horizontal speed direction.
          const r = curRot;
          const s = r < 0.5 ? 2 * r * r : 1 - Math.pow(-2 * r + 2, 2) / 2;
          cursorArrowEl.style.transform = `rotate(${(s * 180).toFixed(1)}deg)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("keydown", onKey);

    // Pointer bridge on the stage → subtle mid-flight parallax (getState only).
    const stage = section.querySelector<HTMLElement>("[data-founder-stage]");
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const rr = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (rr.width === 0 || rr.height === 0) return;
      const s = useFoundersMorphStore.getState();
      s.setMouse({
        x: (e.clientX - rr.left) / rr.width,
        y: (e.clientY - rr.top) / rr.height,
      });
      s.setHover(1);
    };
    const onLeave = () => useFoundersMorphStore.getState().setHover(0);
    stage?.addEventListener("pointermove", onMove);
    stage?.addEventListener("pointerleave", onLeave);

    // Resize fires per-frame during a window-edge drag, and measure() bumps
    // measureVersion — a REACTIVE subscription inside the Canvas island and a
    // dep of its build effect, so every raw event forced a dispose + O(count)
    // re-fit + fresh GPU storage allocation (and a blank frame while the
    // rebuild landed). Split the two costs: the layout write is cheap and must
    // stay live so the gate's runway/secTop are correct THIS frame; only the
    // SETTLED size gets to trigger a rebuild.
    // (Height stays exactly one viewport here too — see measure(): the stage
    // count never buys scroll pixels.)
    let resizeT: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      section.style.height = `${window.innerHeight}px`;
      store.setLayout(0, section.getBoundingClientRect().top + window.scrollY);
      clearTimeout(resizeT);
      resizeT = setTimeout(measure, 150);
    };
    window.addEventListener("resize", onResize);

    // Full re-measure (rebuild → fresh stage rect + docTop) when the layout
    // ABOVE can change the section's DOCUMENT position: the hero intro gate
    // completing collapses/settles the spine and pushes everything below. The
    // per-frame secTop refresh above keeps docTop live, but this also re-fits
    // the geometry to the settled layout.
    let introBumped = useIntroStore.getState().introComplete;
    if (introBumped) measure();
    const unsubIntro = useIntroStore.subscribe((st) => {
      if (st.introComplete && !introBumped) {
        introBumped = true;
        measure();
      }
    });

    // One-shot late refresh once webfonts land (copy column can reflow).
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) measure();
      })
      .catch(() => {});

    return () => {
      fontsCancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeT);
      clearTimeout(posterGrace);
      clearTimeout(morphFailGrace);
      // Chrome: kill any in-flight fade and re-assert hidden — the cluster
      // must never rest visible past this mode's lifetime.
      if (chromeEl) {
        gsap.killTweensOf(chromeEl);
        gsap.set(chromeEl, { opacity: 0 });
      }
      // Copy: settle to the STAGE-0 rest pose (matches the store reset below —
      // reset() puts morph back at 0). A stale visibility:hidden or a stale
      // opacity on a later block must never survive into a horizontal-rail /
      // native remount, where those blocks are real, visible DOM.
      blocks.forEach((b, i) => {
        if (!b) return;
        gsap.set(b.el, i === 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: 0 });
        b.el.style.visibility = "";
        b.children.forEach((c) => gsap.set(c.el, { clearProps: "opacity,transform" }));
      });
      window.removeEventListener("keydown", onKey);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      stageEl?.removeEventListener("pointermove", onCursorMove);
      stageEl?.removeEventListener("pointerleave", onCursorLeave);
      stageEl?.removeEventListener("click", onStageClick);
      if (cursorEl) cursorEl.style.opacity = "0";
      window.removeEventListener("resize", onResize);
      stage?.removeEventListener("pointermove", onMove);
      stage?.removeEventListener("pointerleave", onLeave);
      unsubIntro();
      unsub();
      foundersGateApi.current = null;
      section.style.height = "";
      // The store outlives routes — clear it so the island never reads a stale
      // section after this unmounts / the mode flips.
      useFoundersMorphStore.getState().reset();
    };
  }, [canMorph]);

  // Safety net: the morph store outlives routes, so clear it on every
  // active→inactive transition (route change, flip to native/horizontal rail).
  useEffect(() => {
    if (!canMorph) return;
    return () => {
      useFoundersMorphStore.getState().reset();
    };
  }, [canMorph]);

  // === NATIVE + TOUCH MORPH (mode 3b, Phase 4d): the scrub source ===========
  // See the header block. Store writes from ONE passive scroll listener + rect
  // reads on real geometry change; the only setState is the one-way
  // `setMorphFailed(true)` on the 12 s never-went-live door (as mode 1).
  useEffect(() => {
    if (!detected || mode !== "native" || !islandsTouch || morphFailed) return;
    const section = nativeSectionRef.current;
    const scroller = section?.querySelector<HTMLElement>("[data-rail-scroller]");
    if (!section || !scroller) return;

    const store = useFoundersMorphStore.getState();

    let max = 0;
    /** scrollWidth at the last measure — the free content-changed signal. */
    let lastWidth = -1;
    /** Geometry signature at the last HARD measure (dedupes RO/resize/fonts —
     *  a hard measure bumps measureVersion, which REBUILDS the GPU cloud, so
     *  an address-bar-only resize must never reach it). */
    let lastSig = "";
    /** scrollLeft at which panel j sits at the snapport start (≤ max). */
    let targets: number[] = [];
    let raf = 0;
    let fontsCancelled = false;

    /** Rigid-shift correction: republish the scroller's document top only.
     *  The island caches card offsets RELATIVE to secTop. */
    const syncTop = () => {
      store.setLayout(0, scroller.getBoundingClientRect().top + window.scrollY);
    };

    /** scrub = the focused card's snap-relative offset, 0..MORPH_MAX (see the
     *  store header). Snap targets, not vw/2: at ≥ 430px the end cards never
     *  reach the viewport centre, so a centre-offset formula could never lock.
     *  T_j is clamped to `max` at measure so the last leg completes even when
     *  the last card cannot reach the snap start; the ±deadband makes `scrub`
     *  an exact integer at snap rest (inside LOCK_EPS). */
    const publish = () => {
      const x = Math.min(Math.max(scroller.scrollLeft, 0), max);
      let scrub = 0;
      const n = Math.min(targets.length, STAGE_TOTAL);
      if (n >= 2) {
        let j = 0;
        while (j < n - 2 && x >= targets[j + 1]) j++;
        const t0 = targets[j];
        const t1 = targets[j + 1];
        const pitch = t1 - t0;
        let f = pitch > 0 ? (x - t0) / pitch : 0;
        if (Math.abs(x - t0) <= SCRUB_DEADBAND_PX) f = 0;
        else if (Math.abs(x - t1) <= SCRUB_DEADBAND_PX) f = 1;
        scrub = Math.min(Math.max(j + f, 0), MORPH_MAX);
      }
      store.setNativeScroll(x, scrub);
    };

    const measure = (force = false) => {
      const view = scroller.clientWidth;
      const total = scroller.scrollWidth;
      const panels = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-founders-panel]"),
      );
      const first = panels[0];
      const sig = `${total}|${view}|${first?.offsetWidth ?? 0}|${first?.offsetHeight ?? 0}|${panels.length}`;
      if (!force && sig === lastSig) {
        syncTop();
        return;
      }
      lastSig = sig;
      lastWidth = total;
      max = Math.max(0, total - view);
      // use-rail-progress' snap-start formula: child rect against the
      // scroller's content origin minus scroll-padding-inline-start.
      // `base` = the content origin in VIEWPORT space, scrollLeft-invariant:
      // child.getBoundingClientRect().left = scroller.left + contentOffset −
      // scrollLeft, so contentOffset = child.left − (scroller.left −
      // scrollLeft). Subtract, never add — this measure re-runs mid-rail (EN/IT
      // toggle, fonts.ready, orientation) with scrollLeft ≠ 0, and `+` would
      // shift every target by −2·scrollLeft (and every `scrub` leg with it).
      const base = scroller.getBoundingClientRect().left - scroller.scrollLeft;
      const padStart =
        parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
      targets = panels.map((p) =>
        Math.min(p.getBoundingClientRect().left - base - padStart, max),
      );
      syncTop();
      publish();
      // The island re-measures the card rects + rebuilds on this bump (reads
      // secTop / scrollLeft first — both already published above).
      store.bumpMeasure();
    };

    const onScroll = () => {
      // Content width moved (EN/IT toggle re-flows the copy) → re-measure.
      if (scroller.scrollWidth !== lastWidth) measure();
      publish();
    };

    // rAF-coalesced re-measure for resize / orientation / RO / fonts; the
    // signature dedupe makes an address-bar-only resize a pure secTop republish.
    const scheduleMeasure = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    // --- Mutual exclusivity: DOM reveal until the island is LIVE ----------
    // `active` = all founders loaded + sampled + GPU build done (the island
    // sets it at the end of buildNow). The instant it flips true every card's
    // media goes to 0 and the article gets data-morph-live; a DOM LATCH — the
    // island's build cleanup flaps `active` false on every rebuild and we
    // must never flash the photo back (a blank card for a few frames beats
    // a photo flash). Restored ONLY by this effect's cleanup.
    // Scoped to the cards the cloud actually draws (STAGE_TOTAL): if the team
    // ever outgrows WIRED_TARGETS, the truncated cards keep their photo instead
    // of turning into blank rectangles the cloud never replaces. At N=4 with
    // WIRED_TARGETS=4 this is every card.
    const articles = Array.from(
      section.querySelectorAll<HTMLElement>("[data-founders-panel] .founder-portrait"),
    ).slice(0, STAGE_TOTAL);
    const mediaFx = articles.map((article) => {
      const media = article.querySelector<HTMLElement>("[data-founder-media]");
      return {
        article,
        media,
        setOp: media
          ? (gsap.quickSetter(media, "opacity") as (v: number) => void)
          : null,
      };
    });
    // Local latch (NOT everLiveRef — that one belongs to the mode-1 grace and
    // must not be pre-satisfied by the touch island if the mode flips later).
    let live = false;
    let mediaHidden = false;
    const hideMedia = () => {
      if (mediaHidden) return;
      mediaHidden = true;
      for (const m of mediaFx) {
        m.setOp?.(0);
        m.article.setAttribute("data-morph-live", "true");
      }
    };
    const restoreMedia = () => {
      if (!mediaHidden) return;
      mediaHidden = false;
      for (const m of mediaFx) {
        if (m.media) gsap.set(m.media, { clearProps: "opacity" });
        m.article.removeAttribute("data-morph-live");
      }
    };
    // Bounded RE-LIVE door: the latch above tolerates the island's `active`
    // flapping false on a rebuild (a few blank frames beat a photo flash), but
    // a rebuild that never comes back — GPU device lost, texture reload
    // failing on a background tab, a stepped-down budget that stops the
    // build mid-way — would otherwise leave every card BLANK for the rest of
    // the mount, since only this effect's cleanup restores the media. So once
    // the island HAS been live, an `active: true → false` edge arms a
    // TOUCH_MORPH_RELIVE_MS timer; if `active` is still false when it fires,
    // the same one-way `morphFailed` door as the never-went-live case flips —
    // the dep re-run tears this effect down (restoreMedia + store reset) and
    // the DOM colour reveal is the final visual. `active` returning cancels
    // it, so an ordinary rebuild (hundreds of ms) never trips it.
    let reliveT: ReturnType<typeof setTimeout> | undefined;
    const cancelRelive = () => {
      if (reliveT !== undefined) {
        clearTimeout(reliveT);
        reliveT = undefined;
      }
    };
    const unsub = useFoundersMorphStore.subscribe((s, prev) => {
      if (s.active) {
        live = true;
        cancelRelive();
        hideMedia();
        return;
      }
      // Live → not live: start (or keep) the bounded wait for it to come back.
      if (live && prev.active && reliveT === undefined) {
        reliveT = setTimeout(() => {
          reliveT = undefined;
          if (!useFoundersMorphStore.getState().active) setMorphFailed(true);
        }, TOUCH_MORPH_RELIVE_MS);
      }
    });
    if (useFoundersMorphStore.getState().active) {
      live = true;
      hideMedia();
    }
    // Never-went-live door (mirrors mode 1's morphFailGrace): flips the
    // `morphFailed` dep, whose re-run cleans up below — media restored, store
    // reset — and the DOM colour reveal is the final visual this mount.
    const failGrace = setTimeout(() => {
      if (!live && !useFoundersMorphStore.getState().active) setMorphFailed(true);
    }, TOUCH_MORPH_FAIL_MS);

    // Entry reveal (fire-once, the touch replacement for engage()'s setReveal):
    // the island advances its one-shot entry assemble on it. Re-sync secTop
    // on the same edge — content above has settled by the time we get here.
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          syncTop();
          useFoundersMorphStore.getState().setReveal(1);
          revealIO.disconnect();
          break;
        }
      },
      { threshold: 0.15 },
    );
    revealIO.observe(scroller);

    measure(true);
    store.setNative(true);

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("orientationchange", scheduleMeasure);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;
    ro?.observe(scroller);
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) scheduleMeasure();
      })
      .catch(() => {});

    return () => {
      fontsCancelled = true;
      clearTimeout(failGrace);
      cancelRelive();
      revealIO.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("orientationchange", scheduleMeasure);
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      unsub();
      restoreMedia();
      // The store outlives routes — clear it (native/scrollLeft/scrub included)
      // so the island hides and never reads a stale rail; its build effect
      // re-fires on the zeroed measureVersion and finds no native stage.
      useFoundersMorphStore.getState().reset();
    };
  }, [detected, mode, islandsTouch, morphFailed]);

  // === HORIZONTAL RAIL mode: pinned desktop, NOT morph-eligible (pure DOM) ======
  useEffect(() => {
    if (!detected || mode !== "pinned" || canMorph) return;
    // Don't arm while the morph is still undecided (see morphUndecided): the
    // rail MARKUP is the correct first paint through that window, but its
    // machinery waits for the backend to report. `morphUndecided` is a dep, so
    // a backend that resolves to WebGL2 arms the rail on that same commit.
    if (morphUndecided) return;
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    const setX = gsap.quickSetter(track, "x", "px");
    let travel = 0;
    let secTop = 0;
    let trackX = 0;
    let vw = window.innerWidth;

    // Per-panel writer bundle: quickSetters built ONCE (elements are stable
    // across language toggles — only text nodes change), geometry refreshed
    // by measure().
    const fx: PanelFx[] = [];
    track
      .querySelectorAll<HTMLElement>("[data-founders-panel]")
      .forEach((li) => {
        const circle = li.querySelector<SVGCircleElement>(
          "[data-founder-maskcircle]",
        );
        const name = li.querySelector<HTMLElement>("[data-founder-name]");
        const media = li.querySelector<HTMLElement>("[data-founder-media]");
        if (!circle || !name || !media) return;
        fx.push({
          li,
          circle,
          name,
          media,
          setName: gsap.quickSetter(name, "x", "px") as (v: number) => void,
          setMedia: gsap.quickSetter(media, "xPercent") as (v: number) => void,
          width: 0,
          baseCenter: 0,
          lastR: -1,
        });
      });

    const measure = () => {
      vw = window.innerWidth;
      travel = Math.max(0, track.scrollWidth - vw);
      section.style.height = `${window.innerHeight + travel}px`;
      secTop = section.getBoundingClientRect().top + window.scrollY;
      const stickyLeft = sticky.getBoundingClientRect().left;
      const trackLeft = track.getBoundingClientRect().left;
      for (const p of fx) {
        const r = p.li.getBoundingClientRect();
        p.width = r.width;
        p.baseCenter = stickyLeft + (r.left - trackLeft) + r.width / 2;
      }
    };

    // Analytic per-panel pass — pure math over cached measurements + trackX.
    const applyFx = () => {
      for (const p of fx) {
        const centerX = p.baseCenter - trackX;
        // Shared analytic model (founderMotion.ts). Byte-identical output to
        // the previous inline clamp.
        const m = founderCardMotion(centerX, vw);
        p.setName(-m.t * SWEEP_PX);
        p.setMedia(-m.t * PARALLAX_PCT);
        // Entry reveal windowed to this panel's segment of the SAME rail
        // progress: 0 with the panel fully off the right edge → 1 by the
        // time its center reaches REVEAL_END·vw. Scrubbed both ways.
        const enterStart = vw + p.width / 2;
        const enterEnd = vw * REVEAL_END;
        const rev = Math.max(
          0,
          Math.min(1, (enterStart - centerX) / (enterStart - enterEnd)),
        );
        // Quantized to integers: every r change re-rasterizes the SVG
        // displacement filter, so skip sub-pixel churn.
        const r = Math.round(rev * MASK_FINAL_R);
        if (r !== p.lastR) {
          p.lastR = r;
          p.circle.setAttribute("r", String(r));
        }
      }
    };

    measure();

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom", // progress hits 1 exactly when sticky releases
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => {
        trackX = travel * self.progress;
        setX(-trackX);
        applyFx();
      },
    });
    trackX = travel * st.progress;
    setX(-trackX);
    applyFx();

    // Site-wide snap stations (lib/scroll-snap): the runway start (intro
    // heading panel) + the scrollY at which each founder panel sits
    // horizontally centered (clamped to the runway — founder 2 rests at the
    // release edge on wide viewports). Lazy getters over the live measure()
    // caches; same formula as the focusin handler.
    const clearSnapPoints: Array<() => void> = [
      snapPoint(() => (travel > 0 ? secTop : Number.NaN)),
      ...fx.map((p) =>
        snapPoint(() =>
          travel > 0
            ? secTop +
              Math.min(Math.max(p.baseCenter - vw / 2, 0), travel)
            : Number.NaN,
        ),
      ),
    ];

    // One-shot late refresh once webfonts land.
    let fontsCancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!fontsCancelled) ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Keyboard: convert focus on a link inside an off-screen panel into the
    // equivalent vertical scroll position (same contract as the work rail).
    const onFocusIn = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-founders-panel]",
      );
      if (!panel) return;
      sticky.scrollLeft = 0;
      const vwNow = window.innerWidth;
      const rect = panel.getBoundingClientRect();
      if (rect.left >= 0 && rect.right <= vwNow) return;
      const baseCenter = rect.left + trackX + rect.width / 2; // at trackX = 0
      const desired = Math.min(Math.max(baseCenter - vwNow / 2, 0), travel);
      const targetY = secTop + desired; // 1px scrolled = 1px translated
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(targetY, { duration: 0.6 });
      else window.scrollTo({ top: targetY });
    };
    track.addEventListener("focusin", onFocusIn);

    return () => {
      fontsCancelled = true;
      track.removeEventListener("focusin", onFocusIn);
      clearSnapPoints.forEach((off) => off());
      st.kill();
      gsap.set(track, { x: 0 });
      section.style.height = "";
      for (const p of fx) {
        gsap.set(p.name, { x: 0 });
        gsap.set(p.media, { xPercent: 0 });
        p.circle.setAttribute("r", String(MASK_FINAL_R));
      }
    };
  }, [detected, mode, canMorph, morphUndecided]);

  const total = founders.length;

  // Copy below is verbatim from the retired founders-section.tsx.
  const eyebrow = isEn
    ? "Founder-led software, AI & automation"
    : "Software, AI e automazione, guidati dai fondatori";

  const heading = (className?: string) => (
    <SectionHeading
      eyebrow={eyebrow}
      title={
        isEn ? (
          <>
            Built by the people who{" "}
            <span className="font-display italic text-ink">
              build and run it.
            </span>
          </>
        ) : (
          <>
            Costruito dalle persone che{" "}
            <span className="font-display italic text-ink">
              lo realizzano e lo gestiscono.
            </span>
          </>
        )
      }
      description={`${
        isEn ? "You work with the builders." : "Lavorate con chi costruisce."
      } ${pick(isEn, POSITIONING.accountabilityLong)}`}
      /* reveal='blur': soft CSS focus-in on the studio-intro heading, echoing
         the About page's manifesto beat (no WebGL, pure GPU-composited filter). */
      reveal="blur"
      className={className}
    />
  );

  const panels = (liClass: string, layout: PanelLayout = "fixed") => (
    <>
      {founders.map((f, i) => (
        <li key={f.anchor} data-founders-panel className={liClass}>
          <FounderPanel
            f={f}
            index={i}
            total={total}
            isEn={isEn}
            focusRef={portraitFocusRef}
            layout={layout}
          />
        </li>
      ))}
    </>
  );

  // Closer + CTA — carried over unchanged.
  // MOBILE_HOME_SPEC §5.5: `py-12` → `py-6` below `sm` (48 → 24px per side).
  // `sm:py-14` already owned 640px up, so the base value was only ever a phone
  // value. The section's §2 row-7 budget is 1316 → 1216 at 390px, and it lands
  // at 1222 as: −48 (§5.1 `.section-lg`) −48 here −16 (heading `mb`) −4
  // (scroller `pb`) +22 (the <DragRail> affordance's own box) = −94. The spec
  // budgets −52 for this file because it does not carry the affordance's cost
  // on this row; that is where the remaining 6px sits.
  const closing = (
    <div className="container-px flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-14">
      <p className="max-w-2xl text-[14px] text-ink-mute leading-relaxed">
        {isEn ? (
          <>
            Read by one of us, not a queue. Briefs sent through{" "}
            <span className="text-ink">/start</span> get a reply within one
            business day.
          </>
        ) : (
          <>
            Letto da uno di noi, non da una coda. I brief inviati tramite{" "}
            <span className="text-ink">/start</span> ricevono risposta entro un
            giorno lavorativo.
          </>
        )}
      </p>
      <Link
        href="/about"
        className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase text-ink hover:text-[hsl(var(--accent))] transition-colors shrink-0"
      >
        {isEn ? "Full team bios" : "Bio complete del team"}
        <ArrowUpRight
          className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );

  const portraitStyle = <style>{PORTRAIT_CSS}</style>;

  // Native fallback: normal-flow section, browser-owned horizontal scroll
  // with snap points. No pinning, no per-frame transforms; the reveal masks
  // keep their SSR final radius (portraits simply visible).
  if (detected && mode === "native") {
    return (
      <section
        id="founders"
        ref={nativeSectionRef}
        // Round 7-3 (continuous-space spec §B.3): tint + glows removed in
        // all THREE layout variants of this section (native / morph / rail —
        // they must not diverge). The DOM must not own section-sized
        // ambience; the portrait morph + rail chrome carry the band.
        className="relative section-lg scroll-mt-24 overflow-hidden"
      >
        {/* §5.5 chrome trim: 32 → 16px below `sm`; `sm:mb-10` unchanged. */}
        {/* TASK 6 — zero-height content-edge marker (section-cut driver). */}
        <div data-cut-edge="top" aria-hidden="true" />
        <div className="container-px relative mb-4 sm:mb-10">{heading()}</div>
        {/* MOBILE_HOME_SPEC §2 row 7 / §5.5 — <DragRail> adoption, AFFORDANCE
            ONLY. The mechanic is untouched: this was already a native
            `overflow-x-auto snap-x snap-mandatory` scroller carrying
            `data-lenis-prevent`, and that is precisely what <DragRail> is. What
            it adds is the progress bar and the masked edge fade — the same
            grammar the case-studies rail now speaks, which is the whole point
            of the primitive existing (three lateral surfaces, one vocabulary).
            `progress` and not `stations`: two founders is not a set you step
            through by index. */}
        <DragRail
          label={eyebrow}
          /* The native branch also renders on a fine pointer below ~768px and
             under reduced motion at ANY width, so the bar is scoped to a
             coarse pointer — see `.rail-affordance-touch` in globals.css. */
          railClassName="rail-affordance-touch"
          /* `relative` is carried over from the original <ul> so any
             absolutely-positioned descendant of a panel keeps this box as its
             containing block. */
          /* `pb-3` not `pb-4`: the progress bar now sits 20px below the
             scroller and supplies the separation the old bottom padding was
             carrying alone. `sm:pb-4` keeps the ≥640px box identical. */
          className="relative items-stretch gap-4 pb-3 sm:pb-4"
        >
          {/* layout="flow": the native card sizes to its own copy, so a long
              bio on a 343px-wide card can never be clipped (D-13). `flex` on
              the li + the scroller's stretch alignment keeps every card the
              height of the tallest one, so the rail still reads as one
              filmstrip. */}
          {panels("snap-start shrink-0 flex w-[88vw] max-w-[30rem]", "flow")}
        </DragRail>
        {closing}
        {portraitStyle}
      </section>
    );
  }

  // MORPH mode: vertical CSS-sticky stage. The WebGL particle cloud renders
  // over [data-founder-stage]; the DOM copy blocks cross-fade on the island's
  // live progress scalar, one block per morph stage.
  if (canMorph) {
    return (
      <section id="founders" className="relative scroll-mt-24">
        {/* TASK 6 — zero-height content-edge marker (section-cut driver). */}
        <div data-cut-edge="top" aria-hidden="true" />
        <div
          ref={sectionRef}
          // Round 7-3: tint + glows removed (twin of the native variant).
          className="relative"
          style={{ minHeight: "100vh" }}
        >
          <div
            ref={stickyRef}
            data-founders-morph-sticky
            className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
          >
            {/* LUSION-STYLE COMPOSITION (owner 2026-08-27): the head is the
                hero — a big centre-left stage; a tiny mono counter top-left;
                eyebrow + title top-right; per-person name/role bottom-left
                with the auto-advance hairline; per-person bio/chips/LinkedIn
                bottom-right. The big blue pointer-cursor lives in the frame
                and is driven by the effect. */}
            <div className="container-px pointer-events-none relative flex h-full w-full flex-col justify-between pb-[3.25rem] pt-[5.75rem] sm:pb-[3.75rem]">
              {/* top row */}
              <div className="flex items-start justify-between gap-8">
                <div
                  aria-hidden="true"
                  className="flex items-baseline gap-2 font-mono tabular-nums text-ink-dim"
                >
                  <span className="text-[10px] tracking-[0.18em]">[[</span>
                  <span
                    data-founders-counter
                    className="text-[11px] tracking-[0.18em] text-ink"
                  >
                    01
                  </span>
                  <span className="text-[10px] tracking-[0.18em]">
                    / {String(STAGE_TOTAL).padStart(2, "0")} ]]
                  </span>
                </div>
                <div className="pointer-events-auto max-w-[26rem] text-left">
                  <p className="mb-3 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-dim">
                    {eyebrow}
                  </p>
                  <h2 className="font-display text-[clamp(1.6rem,2.3vw,2.25rem)] leading-[1.05] text-ink">
                    {isEn ? (
                      <>
                        Built by the people who{" "}
                        <span className="italic">build and run it.</span>
                      </>
                    ) : (
                      <>
                        Costruito dalle persone che{" "}
                        <span className="italic">lo realizzano e lo gestiscono.</span>
                      </>
                    )}
                  </h2>
                </div>
              </div>
              {/* middle: the stage lives here (absolute, see below) */}
              <div className="min-h-0 flex-1" />
              {/* bottom row — per-person blocks are overlaid absolutely (see
                  the copy overlays below); this row only reserves the space. */}
              <div className="flex items-end justify-between gap-8">
                <div className="h-[6.5rem] w-[22rem]" />
                <div className="h-[9rem] w-[24rem]" />
              </div>
            </div>

            {/* Stage: the WebGL particle cloud (persistent canvas, behind the
                content) renders over this box — big, centre-left. The DOM
                portraits are a STATIC POSTER cross-fade — visible only while
                the cloud is not live (island still building), driven
                transparent once it renders. Kept in the a11y tree via alt.
                `f.image` is the DOM poster, NOT the sampler's `-headshot`
                asset. STAGE_TOTAL, not founders.length: the compute engine
                has a hard four-target cap. `cursor-none`: the frame's own
                pointer cursor replaces the system one here. */}
            <div
              data-founder-stage
              className="absolute left-[9%] top-[52%] aspect-[3/4] h-[min(74vh,58rem)] -translate-y-1/2 cursor-none"
            >
              {founders.slice(0, STAGE_TOTAL).map((f, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={f.anchor}
                  ref={(el) => {
                    stageImgRefs.current[i] = el;
                  }}
                  src={f.image}
                  alt={`${f.name}, ${isEn ? f.roleEn : f.roleIt}`}
                  data-founder-media
                  draggable={false}
                  style={{ opacity: 0 }}
                  className="absolute inset-0 h-full w-full rounded-lg object-cover"
                />
              ))}
            </div>

            {/* Copy overlays: one full-frame overlay per person, each holding
                the bottom-left name block and the bottom-right bio block,
                cross-fading on progress. The inline opacity:0 on i > 0 is a
                FIRST-CLIENT-PAINT contract (this branch is client-only) that
                covers the frames between the canMorph commit and the effect
                arming the children — load-bearing, see the writer
                construction (`:scope > div > *` = the children of BOTH
                blocks, staggered together). */}
            {founders.slice(0, STAGE_TOTAL).map((f, i) => (
              <div
                key={f.anchor}
                ref={(el) => {
                  copyRefs.current[i] = el;
                }}
                className="container-px pointer-events-none absolute inset-0 flex items-end justify-between gap-8 pb-[3.25rem] sm:pb-[3.75rem]"
                style={i === 0 ? undefined : { opacity: 0 }}
              >
                <div className="flex w-[22rem] flex-col gap-2">
                  <h3 className="flex items-center gap-2 font-display text-[clamp(1.5rem,2vw,2rem)] leading-none text-ink">
                    <span
                      aria-hidden="true"
                      className="inline-block h-[0.45em] w-[0.45em] rotate-45 border border-[hsl(var(--accent))]"
                    />
                    {f.name}
                  </h3>
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">
                    {isEn ? f.roleEn : f.roleIt}
                  </p>
                  {/* auto-advance hairline (Lusion's indicator): scaleX = the
                      dwell timer; resets on every manual step. */}
                  <div
                    aria-hidden="true"
                    className="relative mt-3 h-px w-[11rem] bg-[hsl(var(--rule))]"
                  >
                    <div
                      data-founders-line
                      className="absolute inset-0 origin-left bg-[hsl(var(--accent))]"
                      style={{ transform: "scaleX(0)" }}
                    />
                  </div>
                </div>
                <div className="pointer-events-auto flex w-[24rem] max-w-[38vw] flex-col gap-3">
                  <p className="text-[12.5px] leading-relaxed text-ink-mute sm:text-[13px]">
                    {isEn ? f.shortBioEn : f.shortBioIt}
                  </p>
                  <ul className="flex flex-wrap gap-1.5 list-none">
                    {(isEn ? f.credentialsEn : f.credentialsIt).map((c) => (
                      <li
                        key={c}
                        className={`${CHIP_CLASS} gap-2 text-[10.5px] text-ink leading-snug`}
                      >
                        <span
                          aria-hidden="true"
                          className="block h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--accent)/0.8)]"
                        />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                  {f.previouslyAt && f.previouslyAt.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-mono text-[9px] tracking-[0.18em] uppercase text-ink-mute/70">
                        {isEn ? "Previously" : "In precedenza"}
                      </span>
                      <ul className="contents list-none">
                        {f.previouslyAt.map((co) => (
                          <li
                            key={co}
                            className={`${CHIP_CLASS} font-mono text-[9px] tracking-[0.1em] uppercase text-ink-mute`}
                          >
                            {co}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <Link
                    href={f.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${f.name} on LinkedIn`}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--ink)/0.25)] bg-[hsl(var(--bg)/0.6)] px-3.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute backdrop-blur transition-colors hover:border-[hsl(var(--accent)/0.6)] hover:text-ink"
                  >
                    LinkedIn
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}

            {/* TeamOrbit labels: a pool of mono labels the WebGL island
                projects next to the orbiting satellites every frame (text +
                transform + opacity written by the island; see
                src/webgl/TeamOrbit.tsx). Presentation only. */}
            <div
              data-founders-orbit
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[1]"
            >
              {Array.from({ length: ORBIT_LABEL_POOL }).map((_, i) => (
                <span
                  key={i}
                  data-orbit-label
                  className="absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute will-change-transform"
                  style={{ opacity: 0 }}
                />
              ))}
            </div>

            {/* The pointer-cursor (Lusion's #about-who-face-cursor): a big
                accent disc that follows the pointer inside the stage, scales
                with pointer speed, and whose arrow turns ← / → by the side of
                the head the pointer is on. Click = that direction. Driven by
                the effect; hidden until the pointer enters the stage. */}
            <div
              data-founders-cursor
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 flex h-24 w-24 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--bg))] will-change-transform"
              style={{ opacity: 0, transform: "translate3d(-200px,-200px,0)" }}
            >
              <svg
                data-founders-cursor-arrow
                viewBox="0 0 24 24"
                className="h-8 w-8 will-change-transform"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12h16" />
                <path d="M13 5l7 7-7 7" />
              </svg>
            </div>

            {/* Chrome: fades in once the cloud is live. Holds the visually
                hidden but focusable ← → controls (keyboard / assistive tech):
                the visible affordance is the pointer-cursor + the ← → keys. */}
            <div
              data-founders-chrome
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
              style={{ opacity: 0 }}
            >
              <div
                role="group"
                aria-label={isEn ? "Team navigation" : "Navigazione team"}
                className="pointer-events-auto absolute bottom-[0.9rem] left-1/2 flex -translate-x-1/2 items-center gap-3"
              >
                <button
                  type="button"
                  data-founders-prev
                  aria-label={isEn ? "Previous person" : "Persona precedente"}
                  className={NAV_BTN_CLASS}
                >
                  ←
                </button>
                <span
                  aria-hidden="true"
                  className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-dim/70"
                >
                  {isEn ? "click the face · ← → keys" : "clicca il volto · tasti ← →"}
                </span>
                <button
                  type="button"
                  data-founders-next
                  aria-label={isEn ? "Next person" : "Persona successiva"}
                  className={NAV_BTN_CLASS}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
        {closing}
        {portraitStyle}
      </section>
    );
  }

  // HORIZONTAL RAIL mode: pinned desktop, NOT morph-eligible (pure DOM fallback).
  return (
    <section id="founders" className="relative scroll-mt-24">
      {/* TASK 6 — zero-height content-edge marker (section-cut driver). */}
      <div data-cut-edge="top" aria-hidden="true" />
      {/* The tall scroll runway: height = 100vh + travel, set in px by
          measure(). minHeight is the SSR placeholder before JS measures. */}
      <div
        ref={sectionRef}
        // Round 7-3: tint + glows removed (twin of the native + morph
        // variants — the three must not diverge).
        className="relative"
        style={{ minHeight: "100vh" }}
      >
        {/* Sticky viewport — this IS the pin (no pin-spacer, anchors stay
            valid). */}
        <div
          ref={stickyRef}
          data-founders-sticky
          className="sticky top-0 flex h-screen items-center overflow-hidden"
        >
          <ul
            ref={trackRef}
            className="relative flex w-max items-center gap-6 will-change-transform"
            style={{ paddingInline: "var(--margin)" }}
            aria-label={eyebrow}
          >
            {/* P0 — intro panel: the section heading rides the rail. */}
            <li className="flex w-[min(88vw,34rem)] shrink-0 items-center">
              {heading()}
            </li>
            {panels("w-[min(88vw,34rem)] shrink-0")}
          </ul>
        </div>
      </div>
      {closing}
      {portraitStyle}
    </section>
  );
}

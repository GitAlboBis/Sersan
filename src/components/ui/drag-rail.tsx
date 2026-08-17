"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { applyRailOverscroll } from "@/lib/rail-overscroll";
import { cn } from "@/lib/utils";
import { useRailProgress, type RailMetrics } from "@/lib/use-rail-progress";

/**
 * <DragRail> — the horizontal beat (MOBILE_AUDIT §4, primitive M-5;
 * MOBILE_HOME_SPEC §6 Wave 0, Chunk H).
 *
 * The home page ends up with three lateral surfaces — case studies, founders,
 * services — and they have to read as ONE grammar rather than as three
 * carousels somebody bolted on in three different weeks. This is that grammar,
 * in one component: a native snap scroller, an edge treatment that tells you
 * which way the content continues, and an affordance that tells you where you
 * are in it.
 *
 * THE ONE STRUCTURAL DECISION, AND IT IS NOT NEGOTIABLE
 *
 * The scroller is NATIVE. `overflow-x: auto`, `scroll-snap-type: x mandatory`,
 * and then the component gets out of the way. There is no pointer handler on
 * it, no `preventDefault` anywhere in this file, no `touch-action` declaration,
 * and nothing that writes `scrollLeft` except an explicit tap on a stepper
 * button. A custom drag translator was proposed and explicitly rejected
 * (MOBILE_HOME_SPEC §7): it cannot be built without contesting iOS momentum and
 * the OS edge-swipe, and it delivers nothing a native scroller does not.
 *
 * Three consequences worth naming, because each is a thing a later reader will
 * be tempted to "fix":
 *
 *   1. NO `touch-action: pan-x`. It looks like the right declaration for a
 *      horizontal rail and it is the exact bug M-5 exists to avoid: it hands
 *      the whole gesture to this element's axis, so a finger that starts on a
 *      card and means to scroll the PAGE gets nothing. Left at `auto`, the
 *      browser's own direction lock decides — and it decides correctly, on the
 *      compositor, before we could have had an opinion. A horizontal drag never
 *      swallows vertical intent because we never ask for it.
 *
 *   2. `overscroll-behavior-x` is written inline by a THREE-WAY rule
 *      (`lib/rail-overscroll`, shared with the services rail), with both media
 *      queries subscribed:
 *        coarse pointer               ⇒ `auto`    — ON PURPOSE. `contain` is
 *          the WRONG answer for a phone: blocking the chain also blocks the OS
 *          edge-swipe a reader uses to leave the page.
 *        fine pointer, motion OK      ⇒ `contain` — today's narrow-desktop
 *          behaviour: a trackpad flick past the end of a rail must not chain
 *          out into the browser's back navigation.
 *        fine pointer, reduced motion ⇒ cleared   — the cascade gives `auto`,
 *          exactly what a reduced-motion desktop had before this primitive
 *          existed (MOBILE_REVIEW.md A2: this file may not move that surface).
 *      Why inline, and why the fine/motion-OK branch cannot lean on the
 *      cascade: globals.css gives `[data-lenis-prevent]` a blunt
 *      `overscroll-behavior: contain` under `.lenis-smooth`, and in Lenis
 *      1.3.23 that class exists only WHILE a smooth wheel scroll is animating —
 *      a horizontal flick on an idle page never sees it. Inline is the only
 *      origin that beats that selector deterministically in either direction.
 *
 *   3. `data-lenis-prevent` by default. Lenis smooths the WHEEL; without the
 *      opt-out a wheel over a rail scrolls the page instead of the rail. It is
 *      the site-wide contract for any overflow child (see final-cta.tsx:33).
 *
 * TWO AFFORDANCES, DELIBERATELY DIFFERENT
 *
 *   `progress`  — a continuous bar whose thumb is sized by how much of the rail
 *                 fits and positioned by how far along you are. For the two
 *                 long, homogeneous rails (case studies, founders) where the
 *                 question is "how much more of this is there".
 *
 *   `stations`  — a discrete `01 / 04` stepper with one tappable tick per card.
 *                 For services, where there are four NAMED things and the
 *                 question is "which of the four am I on". A deliberately
 *                 distinct third register (MOBILE_HOME_SPEC §5.2): three rails
 *                 sharing one primitive should not mean three identical bars.
 *
 * Both take themselves away when the content fits — `data-rail-state="inert"`,
 * which is also the SSR default, so a rail that never becomes scrollable (or a
 * page where JS never runs) never shows a bar that measures nothing.
 *
 * ACCESSIBILITY
 *
 *   - The bar is decorative and `aria-hidden`: it duplicates nothing. Every
 *     card is in the DOM, in source order, always — nothing on this rail is
 *     gated behind the gesture.
 *   - The stepper's ticks are real `<button>`s, ≥44×44 CSS px (the tick you see
 *     is small, the target is not), keyboard-reachable, `aria-controls` the
 *     scroller, individually labelled by the CONSUMER — `stationLabel` is
 *     required rather than defaulted, because a default would be English and
 *     this site ships in two languages. The active one carries `aria-current`.
 *     Focus rings come from the site-wide `:focus-visible` rule.
 *   - The scroller gets no `tabIndex`. It contains focusable links, so the
 *     browser already scrolls each card into view as you tab through it, and an
 *     extra tab stop on the container would only add a keyboard dead end.
 *   - The edge fade is 1.25rem, under the 1.5rem `scroll-padding-inline`, so a
 *     card scrolled into view by focus lands with its ring clear of the fade.
 *     Both are coarse-only (next section), so they always agree.
 *
 * COARSE POINTER ONLY — THE THINGS THAT ARE NOT "JUST STATE"
 *
 * The scroller itself is unconditional. Two things around it live behind
 * `(pointer: coarse)` in the stylesheet below:
 *
 *   - the masked edge fade,
 *   - `scroll-padding-inline` (it moves where a focus-scrolled card lands).
 *
 * The third — the inline `overscroll-behavior-x` write — is NOT coarse-only:
 * it is the three-way rule of decision (2), and its fine-pointer branches are
 * split by `prefers-reduced-motion` (`contain` with motion, cleared under RM).
 *
 * Why: the adopting rails render their native branch on a fine pointer below
 * ~768px AND under `prefers-reduced-motion` at any width, and the site-wide
 * contract (globals.css, `.rail-affordance-touch`) is that a reduced-motion
 * desktop keeps exactly what it had before this primitive existed — a native
 * scroller with no bar, no fade, no scroll padding, overscroll from the
 * cascade. Gating the fade and padding on the input device rather than on
 * reduced-motion is the house construction (see the touch-ergonomics block in
 * globals.css): outside a coarse pointer neither declaration exists, which is
 * verifiable rather than merely intended. Overscroll needs the extra RM split
 * precisely because a fine-pointer rail with motion enabled DOES want
 * `contain` (the trackpad back-nav case) and the cascade cannot supply it.
 * The bar's own visibility is still the consumer's opt-in via
 * `.rail-affordance-touch`; this file scopes only what a consumer cannot opt
 * out of.
 *
 * REDUCED MOTION
 *
 * Everything here is state, not motion, so nothing switches off: a
 * reduced-motion reader needs "three more to your right" as much as anyone.
 * What changes is that globals.css neutralises the transitions site-wide under
 * RM (so ticks change instantly), and `scrollToIndex` jumps instead of smooth-
 * scrolling. Degraded, never at the cost of content.
 *
 * COST
 *
 * One shared scroll listener and one scheduled rAF for the whole page, however
 * many rails mount — see `lib/use-rail-progress.ts`, which owns all of it. This
 * component contributes no listener of its own beyond two subscribed media
 * queries (pointer, reduced motion) and the stepper's click handlers.
 */

/**
 * Mechanics only. Everything that can be a Tailwind class on JSX this file
 * owns IS one; what lands here is the arithmetic Tailwind cannot express
 * (gradient stops driven by a custom property, a thumb whose travel is a
 * function of its own width) plus the state selectors that would otherwise
 * need a Tailwind `group` on the root — which would collide with the
 * `group-hover:` the adopting rails' cards already use.
 */
const DRAG_RAIL_CSS = `
.drag-rail { position: relative; }

/* Coarse pointer only — see "COARSE POINTER ONLY" in the header. Outside this
   block a fine pointer (a narrow desktop window, a reduced-motion desktop at
   any width) gets a bare native scroller: no fade, no scroll padding. */
@media (pointer: coarse) {
  /* The edge treatment. --rail-start/--rail-end are published on the rail
     root by useRailProgress and inherit down here; each ramps over 24px, so
     the fade grows as the rail leaves a limit and collapses back to nothing
     as it returns to one. That collapse is what the eye reads as the rail
     giving at its ends — the native bounce underneath it is the platform's,
     untouched. Gated on :not([data-rail-state="inert"]) so a rail whose
     content fits never pays for the compositing layer a mask forces. */
  .drag-rail[data-rail-fade="true"]:not([data-rail-state="inert"]) > .drag-rail-scroller {
    --drag-rail-fade: 1.25rem;
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 calc(var(--rail-start, 0) * var(--drag-rail-fade)),
      #000 calc(100% - var(--rail-end, 0) * var(--drag-rail-fade)),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 calc(var(--rail-start, 0) * var(--drag-rail-fade)),
      #000 calc(100% - var(--rail-end, 0) * var(--drag-rail-fade)),
      transparent 100%
    );
  }

  /* The snapport inset. --drag-rail-gutter is the same value the scroller
     already carries as inline padding-inline, published inline as a custom
     property so ONE prop still drives both — a snapped card and a
     focus-scrolled card land in the same place. Declared here rather than
     inline so it exists only where the fade it is sized against exists. */
  .drag-rail-scroller {
    scroll-padding-inline: var(--drag-rail-gutter, 1.5rem);
  }
}

/* Nothing to say about a rail that fits. visibility rather than display so the
   affordance keeps its box and a rail cannot change height when it crosses. */
.drag-rail[data-rail-state="inert"] .drag-rail-affordance { visibility: hidden; }

.drag-rail-thumb {
  /* Sized by the visible fraction, travelling the remaining (1 - thumb).
     translateX(%) resolves against the thumb's OWN width, so the free travel
     expressed in thumb-widths is exactly (1/thumb - 1). --rail-thumb is floored
     at 0.12 by the hook, so the division can never be by zero. */
  width: calc(var(--rail-thumb, 1) * 100%);
  transform: translateX(calc(var(--rail-progress, 0) * (100% / var(--rail-thumb, 1) - 100%)));
  will-change: transform;
}

.drag-rail-tick {
  transition:
    width 240ms var(--ease-entrance),
    background-color 240ms var(--ease-entrance);
}
.drag-rail-step[data-rail-active="true"] .drag-rail-tick {
  width: 2rem;
  background-color: hsl(var(--accent));
}
`;

/** The scroller's own mechanics. Layout (gap, padding-block, item widths) is
 *  the consumer's — this is only what makes it a rail. */
const SCROLLER_CLASS =
  "flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

type DragRailCommon = {
  /** Accessible name for the scroller. Localised by the consumer. */
  label: string;
  /** The stations themselves — `<li>`s under the default `ul`. */
  children: ReactNode;
  /** Scroller element. `ul` (default) keeps the adopting rails' `<li>` markup. */
  as?: "ul" | "ol" | "div";
  /** Merged onto the SCROLLER (gap, padding-block, item alignment). */
  className?: string;
  /** Merged onto the rail ROOT. */
  railClassName?: string;
  /**
   * Inline gutter, applied as `padding-inline` (inline, everywhere) and — on a
   * coarse pointer only, via the `--drag-rail-gutter` custom property and the
   * stylesheet above — as `scroll-padding-inline`. One value, so a snapped
   * card and a focus-scrolled card land in the same place. Default 1.5rem =
   * the `px-6` the two existing rails already use.
   */
  gutter?: string;
  /** `data-lenis-prevent` on the scroller. Off only if a consumer WANTS Lenis. */
  lenisPrevent?: boolean;
  /** The masked edge fade. Off for a rail on a busy/tinted backdrop. */
  edgeFade?: boolean;
};

export type DragRailProps =
  | (DragRailCommon & { variant?: "progress" })
  | (DragRailCommon & {
      variant: "stations";
      /** Number of stations. Must match the scroller's element children. */
      count: number;
      /** Localised label per tick, e.g. `(i, n) => \`Service ${i + 1} of ${n}\``. */
      stationLabel: (index: number, total: number) => string;
    });

export function DragRail(props: DragRailProps) {
  const {
    label,
    children,
    as = "ul",
    className,
    railClassName,
    gutter = "1.5rem",
    lenisPrevent = true,
    edgeFade = true,
  } = props;
  const variant = props.variant ?? "progress";

  const scrollerId = useId();
  const scrollerRef = useRef<HTMLElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);

  // The stepper's read-out is the one thing CSS cannot paint. Written straight
  // to textContent from the shared frame — no state, so crossing a card never
  // re-renders four cards' worth of copy.
  const paintReadout = useCallback((_root: HTMLElement, m: RailMetrics) => {
    const el = readoutRef.current;
    if (el) el.textContent = pad2(Math.max(0, m.index) + 1);
  }, []);

  const { ref: railRef, scrollToIndex } = useRailProgress(
    variant === "stations" ? paintReadout : undefined,
  );

  // Three-way overscroll chaining — see decision (2) in the header; the rule
  // itself lives in `lib/rail-overscroll` so the services rail writes the
  // identical value. Written inline because globals.css's
  // `.lenis.lenis-smooth [data-lenis-prevent]` rule outweighs any class we
  // could add — and `.lenis-smooth` is only present WHILE a smooth wheel
  // scroll animates, so a fine pointer cannot lean on the cascade for
  // `contain`. Both queries are subscribed, never sampled once: a mouse
  // plugged into a tablet, a devtools emulation flip, or an OS motion-setting
  // change has to re-resolve without a reload (the D-18 bug).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      applyRailOverscroll(el, coarse.matches, reduced.matches);
    };
    apply();
    coarse.addEventListener("change", apply);
    reduced.addEventListener("change", apply);
    return () => {
      coarse.removeEventListener("change", apply);
      reduced.removeEventListener("change", apply);
      el.style.overscrollBehaviorX = "";
    };
  }, []);

  // Typed as `"ul"` rather than `ElementType`: a union of intrinsic tags
  // resolves its props to `never` in JSX. `ul`, `ol` and `div` accept the same
  // attribute surface for everything used here, so the cast is a naming
  // convenience, not a hole.
  const Scroller = as as "ul";

  // Built before the return, not inline in JSX: destructuring inside the
  // narrowed branch gives `count`/`stationLabel` as consts, and only a const
  // keeps its narrowed type inside the map callback below.
  let affordance: ReactNode;
  if (props.variant === "stations") {
    const { count, stationLabel } = props;
    affordance = (
      <div
        className="drag-rail-affordance mt-2 flex items-center justify-between gap-4"
        style={{ paddingInline: gutter }}
      >
        {/* -ml-2.5 pulls the first 44px target's optical edge back onto the
            gutter: the tick inside it is 20px, so the button overhangs by
            12px per side and the row would otherwise read as indented. */}
        <div className="-ml-2.5 flex items-center">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              data-rail-station={i}
              aria-controls={scrollerId}
              aria-label={stationLabel(i, count)}
              onClick={() => scrollToIndex(i)}
              className="drag-rail-step inline-flex h-11 w-11 items-center justify-center rounded-md [-webkit-tap-highlight-color:transparent]"
            >
              <span
                className="drag-rail-tick block h-[2px] w-5 rounded-full bg-[hsl(var(--rule-warm))]"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        {/* Decorative: the ticks above already carry the same information to
            assistive tech, with names, and a live counter re-announcing itself
            on every swipe would be noise. */}
        <p
          className="font-mono text-[11px] tracking-[0.16em] text-ink-mute tabular-nums"
          aria-hidden="true"
        >
          <span ref={readoutRef} className="text-ink">
            01
          </span>
          <span className="px-1 opacity-50">/</span>
          <span>{pad2(count)}</span>
        </p>
      </div>
    );
  } else {
    affordance = (
      <div
        className="drag-rail-affordance mt-5 h-[2px] overflow-hidden rounded-full bg-[hsl(var(--rule))]"
        style={{ marginInline: gutter }}
        aria-hidden="true"
      >
        <span className="drag-rail-thumb block h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--accent)),hsl(var(--accent-2)))]" />
      </div>
    );
  }

  return (
    <div
      ref={railRef}
      className={cn("drag-rail", railClassName)}
      /* SSR default: no bar until a measurement has proven there is something
         to measure. Also the no-JS resting state — the scroller still works. */
      data-rail-state="inert"
      data-rail-fade={edgeFade ? "true" : "false"}
      data-rail-variant={variant}
    >
      <Scroller
        id={scrollerId}
        data-rail-scroller=""
        {...(lenisPrevent ? { "data-lenis-prevent": "true" } : null)}
        ref={(el: HTMLElement | null) => {
          scrollerRef.current = el;
        }}
        aria-label={label}
        className={cn(SCROLLER_CLASS, "drag-rail-scroller", className)}
        /* padding-inline is unconditional; scroll-padding-inline is NOT
           written here — it is read from --drag-rail-gutter by the coarse-only
           rule in DRAG_RAIL_CSS, so a fine pointer never gets it. */
        style={
          {
            paddingInline: gutter,
            ["--drag-rail-gutter"]: gutter,
          } as CSSProperties
        }
      >
        {children}
      </Scroller>

      {affordance}

      {/* React 19 hoists + de-duplicates this by `href`, so three rails on one
          page still ship one copy of the sheet. */}
      <style href="sersan-drag-rail" precedence="default">
        {DRAG_RAIL_CSS}
      </style>
    </div>
  );
}

export default DragRail;

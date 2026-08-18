"use client";

import { useCallback, useRef } from "react";

/**
 * useRailProgress — the one scroll-linked paint loop behind every lateral rail
 * (MOBILE_AUDIT §4, primitive M-5; MOBILE_HOME_SPEC §6 Wave 0, Chunk H).
 *
 * The home page ends up with THREE horizontal rails (case studies, services,
 * founders). Each one wants the same four things painted from its own scroll
 * position: how far along it is, how much of it fits, whether there is content
 * hidden off each edge, and which card is currently the one you are looking at.
 * Written the obvious way that is three `scroll` listeners, three rAF loops and
 * three copies of the same arithmetic. This module is the one that exists
 * instead: N rails, ONE listener, ONE scheduled frame, one formula.
 *
 * CONTRACT
 *
 *   const { ref, scrollToIndex } = useRailProgress(paint?);
 *   <div ref={ref} data-rail-state="inert">
 *     <ul data-rail-scroller>…</ul>
 *     …affordance, painting from the vars below…
 *   </div>
 *
 * `ref` goes on the rail ROOT — the wrapper that owns both the scroller and the
 * affordance — and the hook finds the scroller beneath it via
 * `[data-rail-scroller]` (or uses the root itself if the root IS the scroller).
 * One ref, stable for the component's whole life, with a React 19 ref-cleanup
 * so detach is precise.
 *
 * This is a deliberate deviation from its two sibling primitives
 * (`useCentreFocus`, `usePressState`), which return a bare ref callback: a
 * stepper needs an imperative "go to station i", and the child-offset table
 * that answers it is measured HERE. Returning `scrollToIndex` keeps that
 * formula in one place instead of forking it into every consumer.
 *
 * WHAT IT PUBLISHES (all on the rail root, all inherited by the affordance)
 *
 *   --rail-progress   0→1, fraction of the scrollable distance consumed
 *   --rail-thumb      0→1, visible fraction (clientWidth / scrollWidth)
 *   --rail-start      0→1, "content is hidden off the START edge"
 *   --rail-end        0→1, "content is hidden off the END edge"
 *   data-rail-state   "inert" | "start" | "mid" | "end"
 *   data-rail-index   index of the child nearest the snapport start
 *   data-rail-count   number of element children of the scroller
 *
 * plus, on any descendant carrying `data-rail-station="<i>"`, the pair
 * `data-rail-active="true"` + `aria-current="true"` when `i` is the active
 * index. That write is the only reason the hook reaches past the root: CSS can
 * key off an attribute but it cannot compare one to a custom property, and
 * `aria-current` is not a CSS-reachable state at all.
 *
 * `--rail-start` / `--rail-end` ramp over EDGE_RAMP px rather than flipping, so
 * an edge treatment fades in as the rail leaves its limit and — the part that
 * reads as the rubber band — collapses smoothly back to nothing as it returns
 * to one. During an iOS overscroll bounce `scrollLeft` is already clamped, so
 * both scalars sit at their end values and nothing flickers.
 *
 * ONE LISTENER, FOR THREE RAILS
 *
 * `scroll` does not bubble — but it DOES dispatch through the capture phase on
 * `document`, so a single capturing listener sees every scroller on the page.
 * The handler's whole body is a Map lookup on `e.target`; the document's own
 * scroll (the common case, fired continuously by Lenis) misses and returns.
 *
 * ONE FRAME, AND NONE AT REST
 *
 * There is no loop. A scroll or a resize SCHEDULES a frame if one is not
 * already outstanding; the frame measures every registered rail, writes, and
 * stops. So the outstanding-rAF count is 0 or 1 for the whole page, never one
 * per rail, and a page nobody is touching costs literally nothing.
 *
 * The frame is split read-phase-then-write-phase across all rails, because
 * writing a custom property invalidates style and the next rail's `scrollLeft`
 * read would otherwise force a synchronous recalc — three rails would thrash
 * layout three times per frame.
 *
 * Per-child offsets are measured only when they can have changed (first paint,
 * a ResizeObserver hit, or a `scrollWidth` that moved since the last frame —
 * which is the free and exact signal that content width changed, e.g. the EN↔IT
 * toggle). A scroll frame reads three numbers off the scroller and nothing else.
 *
 * NOT REDUCED-MOTION-GATED, AND NOT POINTER-GATED
 *
 * Unlike `usePressState`, this hook stays on under `prefers-reduced-motion`: it
 * publishes STATE, not motion. "There are three more cards to your right" is
 * content, and a reduced-motion reader needs it at least as much as anyone —
 * the consuming CSS is what drops its transitions (globals.css already does
 * that site-wide), so the affordance jumps instead of easing. Revealed, not
 * animated, is the rule.
 *
 * It is not pointer-gated either, for the same reason: a trackpad user flicking
 * a rail wants the same read-out. The two existing rails only mount their native
 * branch on touch, but that is THEIR gate, not this primitive's.
 *
 * WHAT IT IS NOT
 *
 * Not a gesture handler. It never listens to a pointer, never calls
 * `preventDefault`, never touches `touch-action`, never writes `scrollLeft`
 * outside of an explicit `scrollToIndex()` tap. The scroller stays a plain
 * native scroller owned by the compositor — that is the whole point (see the
 * `<DragRail>` header, and MOBILE_HOME_SPEC §7: a custom drag translator was
 * explicitly rejected).
 *
 * LTR only. Both site languages are LTR; a RTL rail would need the negative
 * `scrollLeft` convention handled here and nowhere else.
 */

/** Marks the scrolling element inside a rail root. Also the hook's entry point. */
const SCROLLER_SELECTOR = "[data-rail-scroller]";

const VAR_PROGRESS = "--rail-progress";
const VAR_THUMB = "--rail-thumb";
const VAR_START = "--rail-start";
const VAR_END = "--rail-end";

const ATTR_STATE = "data-rail-state";
const ATTR_INDEX = "data-rail-index";
const ATTR_COUNT = "data-rail-count";
/** Opt-in on any descendant of the root: `data-rail-station="<index>"`. */
const ATTR_STATION = "data-rail-station";
const ATTR_ACTIVE = "data-rail-active";

/**
 * Distance (px) over which the edge scalars ramp 0→1. Deliberately kept UNDER
 * the rails' 1.5rem gutter: a card scrolled into view by keyboard focus lands
 * at the scroll-padding inset, so its focus ring must clear the fade entirely.
 */
const EDGE_RAMP = 24;
/**
 * Deadband (px) inside which each end counts as REACHED.
 *
 * `scrollWidth` and `clientWidth` are rounded to integers, so on a rail whose
 * cards are sized in vw the derived maximum is up to ~1px away from the real
 * one. Without this a fully-scrolled rail reports progress 0.9994 and never
 * publishes `state="end"`: the end fade stays faintly lit, and the stepper
 * hangs one card short, forever, with no scroll left to fix it. 2px is under
 * half a hairline — invisible, and comfortably clear of the rounding.
 */
const END_SNAP = 2;
/** Scalar delta below which the var is not rewritten (style invalidation). */
const EPSILON = 0.002;
/** Thumb floor — a twelve-card rail must still show a bar you can see. */
const MIN_THUMB = 0.12;

export type RailState = "inert" | "start" | "mid" | "end";

export type RailMetrics = {
  /** 0→1 fraction of the scrollable distance consumed. 0 when not scrollable. */
  progress: number;
  /** 0→1 visible fraction of the content. 1 when not scrollable. */
  thumb: number;
  /** 0→1 content hidden off the start edge, ramped over EDGE_RAMP px. */
  start: number;
  /** 0→1 content hidden off the end edge. */
  end: number;
  /** Element child nearest the snapport start. -1 when the rail is empty. */
  index: number;
  /** Element children of the scroller — the stations. */
  count: number;
  /** False when the content fits: every affordance must take itself away. */
  scrollable: boolean;
  /** Convenience read of the same thing `data-rail-state` carries. */
  state: RailState;
};

/**
 * Called after a frame in which something published actually changed — never
 * per scroll event, never when the numbers are identical. For the few things
 * CSS cannot do (writing a "01" into a stepper's read-out without a re-render).
 */
export type RailPaint = (root: HTMLElement, metrics: RailMetrics) => void;

export type RailProgressHandle = {
  /** Stable ref callback for the rail ROOT. */
  ref: (el: HTMLElement | null) => void | (() => void);
  /** Scroll station `index` to the snapport start. Honours reduced motion. */
  scrollToIndex: (index: number) => void;
};

type Entry = {
  root: HTMLElement;
  scroller: HTMLElement;
  /** Read through the ref so a consumer may re-declare its painter freely. */
  paint: { current: RailPaint | undefined };
  /** scrollLeft that brings each child to the snapport start. Null = stale. */
  targets: number[] | null;
  /** scrollWidth at the last measure — the free content-changed signal. */
  width: number;
  last: RailMetrics | null;
};

// ---------------------------------------------------------------------------
// The shared controller. Module scope on purpose: one listener and one frame
// for the whole document, however many rails are mounted.
// ---------------------------------------------------------------------------

/** Keyed by SCROLLER, which is what a captured scroll event targets. */
const entries = new Map<HTMLElement, Entry>();
let frame = 0;
let resizeObserver: ResizeObserver | null = null;
let bound = false;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(flush);
}

function onCapturedScroll(event: Event) {
  const target = event.target;
  // The document's own scroll lands here on every Lenis frame. One Map miss.
  if (target instanceof HTMLElement && entries.has(target)) schedule();
}

function onResize(records: ResizeObserverEntry[]) {
  for (const record of records) {
    const entry = entries.get(record.target as HTMLElement);
    if (entry) entry.targets = null;
  }
  schedule();
}

function bind() {
  if (bound) return;
  bound = true;
  // Capture phase: `scroll` does not bubble, but it does capture on document.
  document.addEventListener("scroll", onCapturedScroll, {
    capture: true,
    passive: true,
  });
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(onResize);
    for (const entry of entries.values()) resizeObserver.observe(entry.scroller);
  }
  // Webfonts land after first paint and move every card. One shot is enough:
  // anything later is a content change, which the scrollWidth check catches.
  document.fonts?.ready
    .then(() => {
      if (!entries.size) return;
      for (const entry of entries.values()) entry.targets = null;
      schedule();
    })
    .catch(() => {});
}

function unbind() {
  if (!bound) return;
  bound = false;
  document.removeEventListener("scroll", onCapturedScroll, { capture: true });
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/**
 * scrollLeft at which each element child sits at the snapport start. Subtracts
 * `scroll-padding-inline-start` so the answer matches where the browser's own
 * snapping and `scrollIntoView` put it — otherwise the stepper would land every
 * card one gutter out from where a swipe leaves it.
 */
function measureTargets(el: HTMLElement): number[] {
  // Content origin in viewport space, scrollLeft-INVARIANT: a child's
  // getBoundingClientRect().left = el.left + contentOffset − el.scrollLeft, so
  // contentOffset = child.left − (el.left − el.scrollLeft). Subtracting (not
  // adding) scrollLeft is what makes the targets correct when this runs with
  // the rail already scrolled (fonts.ready / a scrollWidth change mid-rail);
  // `+ scrollLeft` was only right at scrollLeft = 0.
  const base = el.getBoundingClientRect().left - el.scrollLeft;
  const padStart = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  const out: number[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i] as HTMLElement;
    out.push(child.getBoundingClientRect().left - base - padStart);
  }
  return out;
}

function measure(entry: Entry): RailMetrics {
  const el = entry.scroller;
  const view = el.clientWidth;
  const total = el.scrollWidth;
  const max = Math.max(0, total - view);
  const scrollable = max > END_SNAP;
  let x = Math.min(Math.max(el.scrollLeft, 0), max);
  // Snap both ends before anything is derived from x, so progress, the two
  // edge scalars, the state and the index all agree about where the ends are.
  if (x <= END_SNAP) x = 0;
  else if (x >= max - END_SNAP) x = max;

  if (entry.targets === null || entry.width !== total) {
    entry.targets = measureTargets(el);
    entry.width = total;
  }
  const targets = entry.targets;
  const count = targets.length;

  let index = count ? 0 : -1;
  let best = Infinity;
  for (let i = 0; i < count; i++) {
    const d = Math.abs(targets[i] - x);
    if (d < best) {
      best = d;
      index = i;
    }
  }
  // The last card usually cannot reach the snapport start — the rail runs out
  // of scroll first. Without this the stepper sticks on N-1 forever.
  if (scrollable && count && x === max) index = count - 1;

  const start = scrollable ? clamp01(x / EDGE_RAMP) : 0;
  const end = scrollable ? clamp01((max - x) / EDGE_RAMP) : 0;
  const state: RailState = !scrollable
    ? "inert"
    : start <= 0.001
      ? "start"
      : end <= 0.001
        ? "end"
        : "mid";

  return {
    progress: scrollable ? x / max : 0,
    thumb: scrollable ? Math.max(MIN_THUMB, Math.min(1, view / total)) : 1,
    start,
    end,
    index,
    count,
    scrollable,
    state,
  };
}

function commit(entry: Entry, m: RailMetrics) {
  const prev = entry.last;
  const root = entry.root;
  let changed = prev === null;

  if (prev === null || Math.abs(prev.progress - m.progress) > EPSILON) {
    root.style.setProperty(VAR_PROGRESS, m.progress.toFixed(4));
    changed = true;
  }
  if (prev === null || Math.abs(prev.thumb - m.thumb) > EPSILON) {
    root.style.setProperty(VAR_THUMB, m.thumb.toFixed(4));
    changed = true;
  }
  if (prev === null || Math.abs(prev.start - m.start) > EPSILON) {
    root.style.setProperty(VAR_START, m.start.toFixed(4));
    changed = true;
  }
  if (prev === null || Math.abs(prev.end - m.end) > EPSILON) {
    root.style.setProperty(VAR_END, m.end.toFixed(4));
    changed = true;
  }
  if (prev === null || prev.state !== m.state) {
    root.setAttribute(ATTR_STATE, m.state);
    changed = true;
  }
  if (prev === null || prev.count !== m.count) {
    root.setAttribute(ATTR_COUNT, String(m.count));
    changed = true;
  }
  if (prev === null || prev.index !== m.index) {
    root.setAttribute(ATTR_INDEX, String(m.index));
    // Rare (once per card crossed), so the query is cheaper than caching a
    // node list that a re-render would invalidate underneath us.
    const stations = root.querySelectorAll<HTMLElement>(`[${ATTR_STATION}]`);
    for (const station of stations) {
      if (Number(station.getAttribute(ATTR_STATION)) === m.index) {
        station.setAttribute(ATTR_ACTIVE, "true");
        station.setAttribute("aria-current", "true");
      } else {
        station.removeAttribute(ATTR_ACTIVE);
        station.removeAttribute("aria-current");
      }
    }
    changed = true;
  }

  entry.last = m;
  if (changed) entry.paint.current?.(root, m);
}

function flush() {
  frame = 0;
  if (!entries.size) return;
  // Read every rail, THEN write every rail: a var write invalidates style, and
  // the next rail's scrollLeft read would force a recalc per rail otherwise.
  const measured: Array<[Entry, RailMetrics]> = [];
  for (const entry of entries.values()) measured.push([entry, measure(entry)]);
  for (const [entry, m] of measured) commit(entry, m);
}

function register(
  root: HTMLElement,
  scroller: HTMLElement,
  paint: { current: RailPaint | undefined },
) {
  entries.set(scroller, {
    root,
    scroller,
    paint,
    targets: null,
    width: -1,
    last: null,
  });
  bind();
  resizeObserver?.observe(scroller);
  schedule();
}

function unregister(scroller: HTMLElement) {
  const entry = entries.get(scroller);
  if (!entry) return;
  entries.delete(scroller);
  resizeObserver?.unobserve(scroller);
  // Leave nothing behind: a rail that re-mounts must not inherit a stale
  // progress from its previous life for a frame.
  for (const name of [VAR_PROGRESS, VAR_THUMB, VAR_START, VAR_END]) {
    entry.root.style.removeProperty(name);
  }
  for (const name of [ATTR_STATE, ATTR_INDEX, ATTR_COUNT]) {
    entry.root.removeAttribute(name);
  }
  if (!entries.size) unbind();
}

export function useRailProgress(onPaint?: RailPaint): RailProgressHandle {
  // Read through a ref so a consumer's painter identity never re-registers the
  // rail (and never re-attaches a ref the EN/IT re-render already survived).
  const paintRef = useRef(onPaint);
  paintRef.current = onPaint;

  const scrollerRef = useRef<HTMLElement | null>(null);

  // Stable for the component's whole life: empty deps, refs only.
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return; // pre-19 detach path; React 19 uses the cleanup below
    const scroller = el.matches(SCROLLER_SELECTOR)
      ? el
      : el.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    if (!scroller) return;
    scrollerRef.current = scroller;
    register(el, scroller, paintRef);
    return () => {
      if (scrollerRef.current === scroller) scrollerRef.current = null;
      unregister(scroller);
    };
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Prefer the cached table; fall back to a fresh read if a tap somehow
    // arrives before the first frame. Either way this is a discrete gesture,
    // not a loop, so a rect read here costs nothing.
    const targets = entries.get(scroller)?.targets ?? measureTargets(scroller);
    const target = targets[index];
    if (target === undefined) return;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    // One-shot read, not a subscription: what matters is the preference at the
    // moment of the tap, and the tap re-reads it every time.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo({
      left: Math.min(Math.max(target, 0), max),
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return { ref, scrollToIndex };
}

export default useRailProgress;

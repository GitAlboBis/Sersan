/**
 * scroll-snap — the ONE site-wide snap engine on the Lenis singleton.
 *
 * Client request 2026-07-23: hard flicks must still come to rest ON a
 * section, and settles must land with the section CENTERED. The site is not
 * a flat page though — it has scroll-hijacking gates (hero intro, spine
 * exit, founders morph), sticky scrub runways with their own corrective
 * scrollTo's, drag bridges, FLIP route flights, and previously TWO separate
 * lenis/snap instances (home spine + audit timeline) issuing competing
 * debounced settles. This module replaces all of that with one engine the
 * whole app registers into:
 *
 *   - `snapElement(el, align)` — a DOM section. Measured LIVE at snap time
 *     (getBoundingClientRect), so font swaps, FLIP re-sorts, language
 *     toggles and IO reveals can never leave a stale target. Disconnected
 *     or zero-height elements (mode fallbacks) are skipped automatically.
 *   - `snapPoint(get)` — a lazy value getter for positions INSIDE a scrub
 *     runway (panel/card/beat lock scroll offsets). The getter closes over
 *     the owner's live measure() vars, so it is always fresh too.
 *   - `snapBarrier(get)` — a document Y a settle must never animate across
 *     (the spine pin-end and the founders gate top hijack plausible-speed
 *     crossings; a snap crossing them would trigger a beat the user never
 *     asked for). Keyboard steps ignore barriers — an explicit PageDown
 *     THROUGH a gate is user intent and the gate handles it.
 *   - `suspendSnap()` — refcounted pause, returns an idempotent release.
 *     Held while any gate is engaged, during drag scrubs, and across route
 *     resets. Suspending also cancels any pending debounce.
 *
 * Trigger discipline: only Lenis `virtual-scroll` (USER wheel input — the
 * gates consume their wheel at capture before Lenis, and programmatic
 * scrollTo's never emit it) arms a debounce; the debounced check re-waits
 * while Lenis is still moving (its own lerp tail, or a section's corrective
 * 0.6s focusin glide), so the snap only ever fires from a genuine rest.
 * Touch input never snaps (mobile layouts are stacked/native and the rails
 * ship their own CSS snap-x there).
 *
 * The settle is a plain duration-based lenis.scrollTo: it flows through the
 * normal Lenis → ScrollTrigger → scrollStore pipe, so the WebGL camera and
 * every scrub choreography glide exactly as with real scrolling (immediate
 * teleports would visibly whip the damped camera — never use them here).
 */
import type Lenis from "lenis";

export type SnapAlign = "start" | "center" | "end";

interface ElementEntry {
  el: HTMLElement;
  align: SnapAlign;
}

/** ~How much of a viewport a settle may travel: the capture radius. Sections
 * are ~1 viewport apart, so this reads as "almost always locks on", while a
 * rest deep inside a tall free-reading block stays untouched. */
const CAPTURE_FRAC = 0.42;
/** Debounce after the last user wheel event before evaluating. */
const DEBOUNCE_MS = 420;
/** Re-check cadence while Lenis is still easing (lerp tail / corrective
 * glides); bounded so an abandoned animation can't retry forever. */
const RETRY_MS = 240;
const MAX_RETRIES = 8;
/** Below this distance the page is already "on" the target — do nothing. */
const MIN_DELTA_PX = 4;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Stacked one-column layouts (below Tailwind md) are designed for straight
 * read-through — never snap them, regardless of input device. Checked live
 * so a window resize is always honored. */
const isStackedViewport = () =>
  window.matchMedia("(max-width: 767px)").matches;

let lenis: Lenis | null = null;
const elements = new Set<ElementEntry>();
const points = new Set<() => number>();
const barriers = new Set<() => number>();
let suspendCount = 0;
let timerId = 0;
let retries = 0;
let offVirtualScroll: (() => void) | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function clearPending() {
  if (timerId) {
    window.clearTimeout(timerId);
    timerId = 0;
  }
}

function maxScroll(): number {
  const l = lenis as unknown as { limit?: number } | null;
  if (l && typeof l.limit === "number" && Number.isFinite(l.limit)) {
    return Math.max(0, l.limit);
  }
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
}

/** All candidate document-Y targets, measured NOW. */
function candidates(): number[] {
  const ih = window.innerHeight;
  const y = window.scrollY;
  const limit = maxScroll();
  const out: number[] = [];
  const push = (v: number) => {
    if (Number.isFinite(v)) out.push(Math.round(Math.min(Math.max(v, 0), limit)));
  };
  for (const get of points) push(get());
  for (const entry of elements) {
    const { el, align } = entry;
    if (!el.isConnected) continue;
    const r = el.getBoundingClientRect();
    if (r.height <= 1) continue; // hidden / swapped-out mode
    // Centering a section much taller than the viewport is meaningless (and
    // on narrow layouts the same sections stack to multiples of the screen —
    // snapping there would trap the reader). Tall content reads free.
    if (align === "center" && r.height > ih * 1.75) continue;
    const top = y + r.top;
    push(
      align === "start"
        ? top
        : align === "end"
          ? top + r.height - ih
          : top + r.height / 2 - ih / 2,
    );
  }
  return out;
}

/** True when a focused form control should own the scroll (never yank a
 * visitor away from a field they are typing into). */
function formFocused(): boolean {
  const ae = document.activeElement;
  if (!ae || ae === document.body) return false;
  const tag = ae.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (ae as HTMLElement).isContentEditable
  );
}

function evaluate() {
  timerId = 0;
  if (!lenis || suspendCount > 0) return;
  const l = lenis as unknown as { isStopped?: boolean; velocity?: number };
  if (l.isStopped) return;
  // Still moving (user lerp tail, or a section's own corrective glide) —
  // wait for the genuine rest instead of retargeting mid-flight.
  if (Math.abs(l.velocity ?? 0) > 0.6) {
    if (retries++ < MAX_RETRIES) timerId = window.setTimeout(evaluate, RETRY_MS);
    return;
  }
  if (formFocused()) return;

  const y = window.scrollY;
  const all = candidates();
  if (all.length === 0) return;
  let best = all[0];
  for (const v of all) if (Math.abs(v - y) < Math.abs(best - y)) best = v;
  const d = best - y;
  if (Math.abs(d) < MIN_DELTA_PX) return;
  if (Math.abs(d) > window.innerHeight * CAPTURE_FRAC) return;
  // Never animate across a hijack boundary (spine exit / founders gate):
  // those gates treat any plausible-speed crossing as user scroll and would
  // seize the page mid-settle.
  for (const get of barriers) {
    const b = get();
    if (Number.isFinite(b) && y - b !== 0 && (y < b) !== (best < b)) return;
  }
  const duration = Math.min(1.05, 0.55 + Math.abs(d) / 2400);
  lenis.scrollTo(best, {
    duration,
    easing: easeInOutCubic,
    userData: { initiator: "sersan-snap" },
  });
}

function onVirtualScroll(e: {
  deltaY?: number;
  event?: { type?: string; ctrlKey?: boolean };
}) {
  if (!lenis || suspendCount > 0) return;
  // Touch never snaps: mobile is stacked/native layouts by design — and
  // stacked narrow-desktop layouts read straight through too. Lenis emits
  // virtual-scroll BEFORE its own ctrlKey bail, so pinch-zoom wheel gestures
  // (ctrl+wheel) must be ignored here — the page isn't scrolling, and a
  // settle would fight the zoom. Pure-horizontal wheel gestures (deltaY 0)
  // can't scroll a vertical Lenis either.
  const type = e?.event?.type ?? "";
  if (type.startsWith("touch")) return;
  if (e?.event?.ctrlKey) return;
  if ((e?.deltaY ?? 0) === 0) return;
  if (isStackedViewport()) return;
  retries = 0;
  clearPending();
  timerId = window.setTimeout(evaluate, DEBOUNCE_MS);
}

/** Keyboard station stepping: PageDown/PageUp glide to the next/previous
 * registered target. Barriers deliberately NOT applied — stepping into a
 * gate is explicit intent and the gate choreographs the crossing itself. */
function step(dir: 1 | -1): boolean {
  if (!lenis || suspendCount > 0) return false;
  if (isStackedViewport()) return false;
  const l = lenis as unknown as { isStopped?: boolean };
  if (l.isStopped) return false;
  const y = window.scrollY;
  const ih = window.innerHeight;
  const sorted = [...new Set(candidates())].sort((a, b) => a - b);
  let target: number | undefined;
  if (dir > 0) target = sorted.find((v) => v > y + 8);
  else target = [...sorted].reverse().find((v) => v < y - 8);
  // Never leap over unmarked content: when the next station is farther than
  // ~1.1 viewports (or absent), degrade to a plain one-viewport page glide —
  // same Lenis feel, no content skipped.
  if (target === undefined || Math.abs(target - y) > ih * 1.1) {
    target = Math.min(Math.max(y + dir * ih * 0.85, 0), maxScroll());
    if (Math.abs(target - y) < MIN_DELTA_PX) return false;
  }
  lenis.scrollTo(target, {
    duration: 0.8,
    easing: easeInOutCubic,
    userData: { initiator: "sersan-snap" },
  });
  return true;
}

/** Wire the engine to the (already created) Lenis singleton. Idempotent per
 * attach/detach pair; called by SmoothScrollProvider. */
export function attachSnap(instance: Lenis) {
  detachSnap();
  lenis = instance;
  // Dev-only introspection: lets QA verify the engine's live state from the
  // console (suspend refcount, registered targets, a forced evaluation).
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __sersanSnap?: unknown }).__sersanSnap = {
      get suspendCount() {
        return suspendCount;
      },
      get counts() {
        return { elements: elements.size, points: points.size, barriers: barriers.size };
      },
      candidates,
      evaluate,
    };
  }
  const handler = onVirtualScroll as (e: unknown) => void;
  // Lenis `on` returns an unsubscribe.
  offVirtualScroll = instance.on(
    "virtual-scroll",
    handler as never,
  ) as unknown as () => void;
  keyHandler = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== "PageDown" && e.key !== "PageUp") return;
    if (formFocused()) return;
    if (step(e.key === "PageDown" ? 1 : -1)) e.preventDefault();
  };
  window.addEventListener("keydown", keyHandler);
}

export function detachSnap() {
  clearPending();
  offVirtualScroll?.();
  offVirtualScroll = null;
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  lenis = null;
}

/** Register a section element. Returns an unsubscribe. */
export function snapElement(el: HTMLElement, align: SnapAlign = "center") {
  const entry: ElementEntry = { el, align };
  elements.add(entry);
  return () => elements.delete(entry);
}

/** Register a lazy value target (runway interior lock). Returns unsubscribe. */
export function snapPoint(get: () => number) {
  points.add(get);
  return () => points.delete(get);
}

/** Register a hijack boundary settles must never cross. Returns unsubscribe. */
export function snapBarrier(get: () => number) {
  barriers.add(get);
  return () => barriers.delete(get);
}

/** Refcounted pause. Returns an IDEMPOTENT release — safe to call from both
 * a drag's onDragEnd and onThrowComplete, or a cleanup that may run twice. */
export function suspendSnap(): () => void {
  suspendCount++;
  clearPending();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspendCount = Math.max(0, suspendCount - 1);
  };
}

/**
 * scroll-snap — the pinned-runway settle engine on the Lenis singleton.
 *
 * ROUND 8-A (2026-08-22) — SCOPE CUT. This module used to settle every
 * `[data-snap]` SECTION on every route (client request 2026-07-23: "hard
 * flicks must come to rest ON a section, centered"). The owner's round-8
 * verdict retired that: a free-reading page must rest exactly where the
 * reader leaves it. The scroll dossier
 * (research/2026-08-22-round8-scroll-dossier.md) reverses lusion.co — which
 * has NO snap of any kind, only λ=12/s wheel smoothing — and igloo, whose
 * auto-center only fires when a scene boundary is torn mid-screen. Ours fired
 * on ordinary reading rests, and three things fell out of that:
 *
 *   1. a settle ~0.4–2.3 s after the last wheel event ("si ferma dopo 1s");
 *   2. it centered the SECTION rect, ~100–170 px above the constellation band
 *      the reader was actually looking at ("si assesta troppo in alto" —
 *      §1.3 of the dossier has the geometry, should this ever be revived: the
 *      target would have to be the `[data-lattice-anchor]` band, not the
 *      section);
 *   3. its ≤900 px/s glide crossed `"top bottom"` entrance triggers the user
 *      never scrolled to, and direction-reversing settles hard-reset
 *      half-played row entrances via onLeaveBack → pause(0) ("non permette
 *      l'esperienza completa con gli effetti gsap delle scritte").
 *
 * So `snapElement` / `[data-snap]` / `ScrollSnapSections` are GONE, and with
 * them every free-section settle on every route. What survives is the one
 * correction igloo actually justifies and (a) alone would have re-opened:
 * never resting mid-pose inside a PINNED SCRUB RUNWAY, whose visual state is
 * a pure function of scroll offset — a rest halfway through a services
 * segment / fit beat / founders panel / spine station / audit day parks a
 * torn pose. Inside those ranges the settle glide IS the choreography.
 *
 *   - `snapPoint(get)` — a lazy value getter for positions INSIDE a scrub
 *     runway (panel/card/beat lock scroll offsets). The getter closes over
 *     the owner's live measure() vars, so it is always fresh.
 *   - `snapBarrier(get)` — a document Y a settle must never animate across
 *     (the spine pin-end and the founders gate top hijack plausible-speed
 *     crossings; a snap crossing them would trigger a beat the user never
 *     asked for). Keyboard steps ignore barriers — an explicit PageDown
 *     THROUGH a gate is user intent and the gate handles it.
 *   - `suspendSnap()` — refcounted pause, returns an idempotent release.
 *     Held while any gate is engaged, during drag scrubs, and across route
 *     resets. Suspending also cancels any pending debounce.
 *
 * Consequence of the cut: on a route with no runway (about, consulting,
 * contact, resources, case-studies, trust) there are now ZERO candidates and
 * the engine is inert — it arms a debounce, finds nothing, returns. Only the
 * PageDown/PageUp stepping stays useful there, via its page-glide fallback.
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

/** ~How much of a viewport a settle may travel: the capture radius. Runway
 * stations are well inside that, so a rest inside a pin locks on; a rest in
 * the free reading between runways has no candidate to reach for at all. */
const CAPTURE_FRAC = 0.42;
/** Debounce after the last user wheel event before evaluating.
 *
 * Round 8-A deliberately KEPT 420 and skipped the dossier's optional
 * §4.2 "igloo-parity" bump to 1000. Traced against the new `lerp: 0.2`
 * smoothing law (λ = 12 s⁻¹, so at 60 fps the per-frame step is
 * (1 − exp(−0.2)) = 0.181 of the remaining distance): `evaluate`'s velocity
 * gate (>0.6 px/frame) clears once
 * the wheel glide is within ~3.3 px of its own rest, i.e. at
 * t = ln(D/3.3)/12 — 0.28 s for a 100 px notch, 0.53 s for a 2000 px flick.
 * At 420 ms the settle therefore starts INSIDE the dying tail and reads as
 * one continuous motion (as it did under the old 0.9 s law, which fired at
 * 660–900 ms mid-glide). Bumping to 1000 ms would insert ~0.5 s of dead
 * stillness first and turn the whisper into a visible self-restart — the
 * exact "si ferma e poi si riassesta" pathology the round-8 cut exists to
 * kill. The companion refinement (`Math.min(1.2, 0.6 + |d|/1500)`) is also
 * skipped: capture is ≤0.42·ih, so |d| ≤ ~380 px and the LIVE formula
 * already tops out at ~0.71 s — the "cap" would never bind and would only
 * make the glide ~20 % slower. */
/** 2026-08-27 SCROLL FEEL (dossier scroll-feel.md §5.3): the wheel law moved
 * to lerp 0.1 ×0.7 (λ = 6 s⁻¹, 70 px/notch) in lenis-singleton.ts. The
 * velocity gate (>0.6 px/frame) now clears at t = ln(D/6.6)/6 — 0.39 s for a
 * 70 px notch, 0.95 s for a 1400 px flick — so at 420 ms the first evaluate
 * usually landed inside the notch's own tail and fell into the 240 ms retry
 * ladder. 520 ms puts the first evaluate past a single notch's tail so the
 * ladder is the exception; still far from the 1000 ms pathology above. The
 * settle floor rises 0.55 → 0.65 s so a ~380 px settle (peak ≈ 880 px/s at
 * 0.65) never reads brisker than the user's own wheel (≈ 360 px/s per
 * notch). KILL-SWITCH: SNAP_FOLLOW_SLOW_WHEEL=false restores 420 / 0.55. */
const SNAP_FOLLOW_SLOW_WHEEL = true;
const DEBOUNCE_MS = SNAP_FOLLOW_SLOW_WHEEL ? 520 : 420; // pre-2026-08-27: 420
/** Settle glide duration floor (s). pre-2026-08-27: 0.55. */
const SETTLE_MIN_S = SNAP_FOLLOW_SLOW_WHEEL ? 0.65 : 0.55;
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

/** All candidate document-Y targets, measured NOW. Runway points only since
 * round 8-A — a route with no pinned runway returns an empty list, which is
 * how "free sections never settle" is enforced at the source. */
function candidates(): number[] {
  const limit = maxScroll();
  const out: number[] = [];
  const push = (v: number) => {
    if (Number.isFinite(v)) out.push(Math.round(Math.min(Math.max(v, 0), limit)));
  };
  for (const get of points) push(get());
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
  // Nothing registered → nothing this engine can ever do on this route
  // (round 8-A: no runway, no candidates). Checked BEFORE the velocity
  // retry so a wheel gesture on about/consulting/contact/resources/
  // case-studies/trust cannot schedule the 8×240 ms retry ladder whose only
  // possible outcome is the `all.length === 0` return below — this is what
  // makes the header's "arms a debounce, finds nothing, returns" literal.
  // (A runway that registers DURING a retry window is no longer picked up;
  // a settle fired because a component happened to mount mid-tail was never
  // wanted anyway.)
  if (points.size === 0) return;
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
  const duration = Math.min(1.05, SETTLE_MIN_S + Math.abs(d) / 2400);
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
        // `elements` is a permanent 0 since round 8-A (element snapping was
        // removed) — reported explicitly so the QA contract and any existing
        // console snippet still read true rather than `undefined`.
        return { elements: 0, points: points.size, barriers: barriers.size };
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

// (`snapElement(el, align)` / `SnapAlign` / the `[data-snap]` markup contract
// were removed in round 8-A — see the header. Do NOT reintroduce a DOM-section
// target without reading dossier §1.3 first: the section rect is the wrong
// frame, the band is.)

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

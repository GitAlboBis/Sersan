/**
 * route-transition-store — a globalThis-pinned singleton coordinating the
 * exit-before-enter route cover ("cover → cross → resolve"). The pin (matching
 * flip-handoff-store, the repo convention for surviving Turbopack chunk-split +
 * App Router soft nav) means a flag armed on the OLD page's click is still
 * readable after the NEW route's template mounts in a freshly-imported module
 * instance.
 *
 * Three parties, three channels:
 *
 *   1. ARM (click → template). The persistent cover layer (navbar.tsx owns the
 *      document-level click listener AND the fixed cover twin) calls
 *      `armCover()` the moment an internal left-click starts its cover sweep.
 *      The new route's template.tsx consumes it ONCE (`consumeCoverHandoff`)
 *      and skips its own curtain wipe — the twin, already covering, IS the
 *      curtain for that navigation (same discipline as the flip zoom's
 *      `consumeCurtainSuppression`). Freshness-gated: a click that never
 *      navigated (preventDefault'd, route error) cannot eat a later, unrelated
 *      navigation's wipe.
 *
 *   2. RELEASE (template → cover layer). After consuming, template calls
 *      `releaseCover()` so the twin knows the new route committed and can play
 *      the lift (hold → open bottom-up). Routed through a registered listener
 *      because template remounts per navigation while the twin persists — the
 *      twin can't be reached by ref from a component that didn't render it.
 *
 *   3. LIFT (anyone → Scene). Whoever starts a visible lift — the twin on
 *      covered navigations, template's own wipe otherwise — calls
 *      `announceLift()`. Scene.tsx subscribes per navigation (`onLiftOnce`) to
 *      fire the signature line's `setReveal(1)` ON the lift beat, so the
 *      damped uReveal redraws the line THROUGH the uncovering viewport instead
 *      of finishing under an opaque sheet. `liftAt` + the recent-window check
 *      cover the effect-ordering race: template's layout effect can release
 *      (and, when the twin already force-opened, announce) BEFORE Scene's
 *      passive effect subscribes in the same commit.
 */

const KEY = "__sersan_route_transition__";

interface Holder {
  /** Timestamp of the last cover-armed click; 0 = none pending. */
  armedAt: number;
  /** Registered once by the persistent cover layer (navbar); null on unmount. */
  releaseListener: (() => void) | null;
  /** Timestamp of the last announced lift start; 0 = none yet. */
  liftAt: number;
  /** One-shot subscribers waiting for the next lift (flushed on announce). */
  liftListeners: Array<() => void>;
}

const g = globalThis as unknown as Record<string, Holder | undefined>;
const holder: Holder =
  g[KEY] ??
  (g[KEY] = { armedAt: 0, releaseListener: null, liftAt: 0, liftListeners: [] });
// An already-pinned holder from an older module instance (dev HMR /
// chunk-split) may predate some fields — normalize.
holder.releaseListener ??= null;
holder.liftAt ??= 0;
holder.liftListeners ??= [];

/** How long an armed cover stays consumable. Slightly longer than the cover
 *  layer's hard force-open timeout (1.2s), so a slow-but-successful commit in
 *  that window still gets its release (the twin no-ops if already open) —
 *  while a click that truly never navigated expires before the next click. */
const FRESH_MS = 1500;

/** How recently a lift must have been announced for `onLiftOnce` to fire the
 *  callback immediately instead of queueing. Covers the same-commit ordering
 *  where the announce (template layout effect) lands before the subscriber
 *  (Scene passive effect) — passive effects can trail a paint or two. */
const LIFT_RECENT_MS = 250;

/** Called by the cover layer the moment an internal click starts the cover
 *  sweep. Refreshing on a rapid second click is intentional — the newest click
 *  owns the pending navigation. */
export function armCover(): void {
  holder.armedAt = Date.now();
  // A new navigation invalidates the previous one's lift stamp: without this,
  // a commit landing within LIFT_RECENT_MS of the PRIOR route's lift-start
  // would fire `onLiftOnce` synchronously off that stale stamp — Scene would
  // redraw the line under this navigation's still-opaque sheet, the exact
  // under-cover redraw the store exists to eliminate. This navigation's own
  // announce re-stamps when its visible lift actually starts.
  holder.liftAt = 0;
}

/** Called by the cover layer's force-open failsafe: the click never navigated,
 *  so the pending arm must not survive to eat a later navigation's wipe. */
export function disarmCover(): void {
  holder.armedAt = 0;
}

/**
 * Consumed once per navigation by template.tsx: true → skip the template's own
 * curtain wipe (the cover twin is this navigation's curtain) and call
 * `releaseCover()`. Freshness-gated like the flip handoff.
 */
export function consumeCoverHandoff(): boolean {
  const t = holder.armedAt;
  holder.armedAt = 0;
  return t > 0 && Date.now() - t <= FRESH_MS;
}

/** Registered once by the persistent cover layer; null on unmount. */
export function setReleaseListener(fn: (() => void) | null): void {
  holder.releaseListener = fn;
}

/** Template → cover layer: the new route committed; lift when ready. Safe to
 *  call when no layer is listening (the template curtain then simply stays
 *  open — never a covered rest state, just no lift to hand off). */
export function releaseCover(): void {
  holder.releaseListener?.();
}

/** Stamp + flush: a visible lift is starting NOW. One-shot listeners are
 *  drained before invocation so a callback that re-subscribes (none today)
 *  could never be double-fired by the same announce. */
export function announceLift(): void {
  holder.liftAt = Date.now();
  const listeners = holder.liftListeners.splice(0, holder.liftListeners.length);
  for (const cb of listeners) cb();
}

/**
 * One-shot lift subscription for Scene.tsx. If a lift was announced within the
 * last LIFT_RECENT_MS the callback fires synchronously (the announce beat the
 * subscriber into the commit); otherwise it queues for the next announce.
 * Returns an unsubscribe — callers MUST call it on cleanup so an abandoned
 * navigation's subscriber can't leak into the next one.
 */
export function onLiftOnce(cb: () => void): () => void {
  if (holder.liftAt > 0 && Date.now() - holder.liftAt <= LIFT_RECENT_MS) {
    cb();
    return () => {};
  }
  holder.liftListeners.push(cb);
  return () => {
    const i = holder.liftListeners.indexOf(cb);
    if (i >= 0) holder.liftListeners.splice(i, 1);
  };
}

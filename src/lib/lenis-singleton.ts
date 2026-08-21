/**
 * Lenis smooth-scroll singleton.
 *
 * The scroll-driven camera path needs a stable rAF-driven scroll source —
 * not the browser's native bumpy wheel deltas. Lenis gives us that, but
 * we only ever want ONE instance per document (multiple instances stomp
 * each other's transforms). This module guarantees that.
 *
 * Consumers call getLenis() in an effect; the first caller spins it up,
 * subsequent callers share it, and a refcount tears it down when the
 * last consumer unmounts (e.g. when the homepage scene unmounts on
 * navigation away).
 *
 * NATIVE-TELEPORT RE-SYNC (B14): a native scroll teleport (Ctrl+Home/End,
 * scrollbar drag, find-in-page) moves window.scrollY without Lenis. Lenis's
 * own internal native-scroll handler usually re-syncs its virtual value, but
 * it has wedge paths (see resyncFromNative below) that leave `animatedScroll`
 * stale — and then every scrollStore consumer (hero lockup, eclipse fade,
 * signature line, W4 cut driver) reads a dead position until the next wheel.
 * A passive window scroll listener FLAGS; the check + forced re-sync run on
 * the next tick of the EXISTING frame pipeline (private tick or the R3F
 * external pump), never on a new rAF loop.
 *
 * TOUCH: smoothing is WHEEL-ONLY. `syncTouch` is deliberately off — see the
 * note on `smoothWheel` below. This is a decision, not an omission.
 */
import Lenis from "lenis";

let instance: Lenis | null = null;
let rafId: number | null = null;
let refcount = 0;
// When the persistent R3F canvas is mounted, ITS loop pumps Lenis (single
// RAF authority, AGENTS.md §3a) and the private tick below stays parked.
let externallyPumped = false;

// --- B14: native instant-scroll re-sync ------------------------------------
// Verified against the installed lenis 1.3.23 source, not docs:
//   - Lenis registers its own `onNativeScroll` window listener at
//     construction. It re-syncs `animatedScroll = targetScroll = actualScroll`
//     on a native scroll — EXCEPT when `_preventNextNativeScrollEvent` is
//     armed (set after every immediate/completed scrollTo, cleared on Lenis's
//     own requestAnimationFrame — under background-tab rAF throttling the
//     flag lingers and swallows a REAL teleport), or while
//     `isScrolling === "smooth"` (the in-flight glide keeps overwriting the
//     teleported position from its own animatedScroll).
//   - `scrollTo(..., { immediate: true })` WITHOUT `force` early-returns
//     while `isStopped || isLocked` — the scroll-hijack gates (hero-intro
//     gate, preloader, founders rail, navbar menu) call `lenis.stop()`, which
//     is why the repro's console `scrollTo(0, {immediate:true})` was ignored.
//
// The listener below cannot tell a Lenis-originated scroll event from a
// native teleport (Lenis writes scrollY via wrapper.scrollTo every animate
// frame), so it only sets a flag; resyncFromNative() — run at the top of BOTH
// pump paths, before `instance.raf(time)` — decides, gated so it can never
// feed back:
//   - `isStopped || isLocked` → skip. A hijack gate owns scroll there, and
//     `lenis.start()`'s internal reset() re-reads actualScroll on release,
//     so that path self-heals without us fighting the gate's re-asserts.
//   - `isScrolling === "smooth"` → skip. The glide is writing scrollY itself
//     (its completion reset() re-syncs), and this is what keeps a smooth
//     wheel scroll — which fires a native scroll event every frame — from
//     ever entering the sync path.
//   - `|actualScroll − animatedScroll| ≤ 1px` → skip. Every Lenis-originated
//     event lands here (Lenis just wrote exactly that value), so the epsilon
//     is the second, independent no-feedback guard.
// The forced immediate scrollTo re-syncs both virtual values, emits ONE
// Lenis scroll event with the corrected progress and velocity 0 (its
// reset() runs before the emit and zeroes velocity — no lingering spike
// into damped uScrollVel readers; progress is NaN/Inf-safe, Lenis guards
// `limit === 0`). Downstream one-frame consumers see a single big progress
// delta — by design (the W4 straddle detector fires its cut spike once).
// The chain terminates: the re-sync's setScroll writes the position the
// page is already at, so it fires NO native scroll event (only the
// stale-limit clamp corner can move the page and fire one — Lenis's armed
// _preventNextNativeScrollEvent swallows its side, our flag is dropped by
// the next tick's epsilon). Under reduced motion the provider never
// acquires an instance, so no listener exists and this whole path is inert.
let nativeScrollSeen = false;
const flagNativeScroll = () => {
  nativeScrollSeen = true;
};
// Hoisted so even the (rare) sync path allocates nothing of ours.
const RESYNC_OPTS = { immediate: true, force: true } as const;

function resyncFromNative() {
  if (!nativeScrollSeen || !instance) return;
  nativeScrollSeen = false;
  if (instance.isStopped || instance.isLocked) return;
  if (instance.isScrolling === "smooth") return;
  const actual = instance.actualScroll;
  if (Math.abs(actual - instance.animatedScroll) <= 1) return;
  instance.scrollTo(actual, RESYNC_OPTS);
}

function tick(time: number) {
  if (!instance || externallyPumped) return;
  resyncFromNative();
  instance.raf(time);
  rafId = requestAnimationFrame(tick);
}

/**
 * Hand the RAF baton to (or take it back from) an external loop — the R3F
 * FrameDriver. Switching off external pumping restarts the private tick so
 * scrolling survives the canvas unmounting (tier degradation).
 */
export function setExternalPump(on: boolean) {
  externallyPumped = on;
  if (on) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  } else if (instance && rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
}

/** Advance Lenis from the external loop. No-op unless external pumping is on. */
export function pumpLenis(time: number) {
  if (!instance || !externallyPumped) return;
  resyncFromNative();
  instance.raf(time);
}

export function acquireLenis(): Lenis {
  if (!instance) {
    instance = new Lenis({
      // Light easing — we don't want molasses, just rAF-smoothed scroll.
      duration: 0.9,
      // Default smooth easing curve (out-expo-ish).
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Wheel smoothing only — `syncTouch` stays OFF, on purpose.
      //
      // (The old reason here, "we don't run the scene on mobile anyway", is
      // no longer true and was never the real one: mobile is actively being
      // built out. The real reasons:)
      //
      //  1. syncTouch re-implements momentum in JS on top of the platform's
      //     own. On iOS the two fight: flings decelerate wrong, rubber-band
      //     overscroll and pull-to-refresh stop working, and the bounce at
      //     the document ends is lost.
      //  2. We do not need it to be CORRECT. Every choreographed beat on the
      //     site is driven by ScrollTrigger progress, which is a pure
      //     function of the scroll POSITION — it resolves identically
      //     against a native touch scroll and a smoothed one. Smoothing
      //     would only change how the input feels, and native touch inertia
      //     already feels better than anything we would synthesise.
      //  3. Touch scrolling stays on the compositor. syncTouch moves it onto
      //     the main thread, where it competes with the same rAF budget the
      //     WebGL beats need.
      //
      // So: native touch scrolling is the deliberate choice. Do not "fix"
      // this by adding syncTouch.
      smoothWheel: true,
    });
    // B14: flag native scroll events for the frame-pipeline re-sync above.
    // Passive + flag-only (no work, no allocation in the handler); lifecycle
    // matches the instance exactly, so reduced motion (which never acquires)
    // never installs it.
    nativeScrollSeen = false;
    window.addEventListener("scroll", flagNativeScroll, { passive: true });
    if (!externallyPumped) {
      rafId = requestAnimationFrame(tick);
    }
  }
  refcount++;
  return instance;
}

export function releaseLenis() {
  refcount = Math.max(0, refcount - 1);
  if (refcount === 0 && instance) {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("scroll", flagNativeScroll);
    nativeScrollSeen = false;
    instance.destroy();
    instance = null;
  }
}

export function getLenis(): Lenis | null {
  return instance;
}

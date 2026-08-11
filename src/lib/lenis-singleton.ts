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

function tick(time: number) {
  if (!instance || externallyPumped) return;
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
  if (instance && externallyPumped) instance.raf(time);
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
    instance.destroy();
    instance = null;
  }
}

export function getLenis(): Lenis | null {
  return instance;
}

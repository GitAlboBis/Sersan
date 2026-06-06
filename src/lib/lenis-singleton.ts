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
 */
import Lenis from "lenis";

let instance: Lenis | null = null;
let rafId: number | null = null;
let refcount = 0;

function tick(time: number) {
  if (!instance) return;
  instance.raf(time);
  rafId = requestAnimationFrame(tick);
}

export function acquireLenis(): Lenis {
  if (!instance) {
    instance = new Lenis({
      // Light easing — we don't want molasses, just rAF-smoothed scroll.
      duration: 0.9,
      // Default smooth easing curve (out-expo-ish).
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Let the camera path read scroll directly; no touch smoothing
      // on mobile where we don't run the scene anyway.
      smoothWheel: true,
    });
    rafId = requestAnimationFrame(tick);
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

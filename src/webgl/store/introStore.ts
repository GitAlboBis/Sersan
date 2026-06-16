/**
 * First-load intro coordination store.
 *
 * The preloader (src/components/fx/preloader.tsx) and the persistent WebGL
 * scene live in separate React trees (the canvas is lazy + ssr:false inside
 * CanvasHost), so they hand off through this tiny transient store rather than
 * props.
 *
 * Lifecycle on a HARD page load:
 *   1. `introComplete` starts false. The preloader covers the viewport while
 *      it counts real readiness up to 100%.
 *   2. When the counter reaches 100 the preloader sets `introComplete = true`
 *      AND lifts its curtain.
 *   3. SignatureLine subscribes to `introComplete`; on the false→true edge it
 *      re-kicks its own `uReveal` 0→1 draw-in so the line visibly "becomes"
 *      what the loader bar was — one shared beat with the curtain wipe.
 *
 * On a SOFT (client) route change the preloader never remounts (it lives in
 * the persistent layout and only shows once per hard load), so `introComplete`
 * simply stays true and the line keeps using its per-route re-curve beat.
 *
 * Read transiently via getState() inside useFrame, or subscribed to detect the
 * completion edge — never as a reactive hook in a hot render path.
 */
import { create } from "zustand";

interface IntroState {
  /** False until the first-load preloader hands off; true forever after. */
  introComplete: boolean;
  complete: () => void;
  /**
   * True once the WebGL scene is actually RENDERING SMOOTHLY — i.e. the WebGPU
   * pipelines/compute kernels have finished compiling (the heavy one-time cost
   * that otherwise stalls the first frames). Set by PipelineWarmup (in-Canvas)
   * once it has seen a run of smooth frames; READ by the preloader as its 4th
   * readiness signal so the counter only reaches 100% when the shaders are
   * genuinely warm (truthful loading), not on a fixed timer.
   */
  warmReady: boolean;
  setWarmReady: () => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  introComplete: false,
  complete: () => set({ introComplete: true }),
  warmReady: false,
  setWarmReady: () => set({ warmReady: true }),
}));

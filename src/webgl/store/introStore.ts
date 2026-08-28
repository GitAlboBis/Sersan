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

/**
 * Projected screen rect of the WebGL hero mark (CSS px, viewport space),
 * published per-frame by HeroLogo while the preloader is still up and read
 * ONCE by the preloader's reveal() to FLIP its DOM mark onto the exact spot
 * where the spore mark already sits — the Donprod-style shared-element
 * handoff. A MODULE-SCOPE REF, not store state: a per-frame zustand setState
 * would notify every listener 60×/s for a value nothing reads reactively
 * (the entryProgressRef / pointerStore precedent). `null` until the island
 * publishes (non-home routes never do — the preloader falls back to its
 * legacy zoom-through exit there). This module stays three-free so the
 * preloader chunk can import it.
 */
export const heroMarkRectRef: {
  current: { cx: number; cy: number; w: number; h: number } | null;
} = { current: null };

interface IntroState {
  /** False until the first-load preloader hands off; true forever after. */
  introComplete: boolean;
  complete: () => void;
  /**
   * Flipped by the preloader the moment the pipeline warm-up is genuinely
   * under way (warmProgress ≥ 0.5 — compileAsync resolved, the scene is
   * rendering under the curtain). HeroLogo keys its one-shot spore REFORM on
   * this pre-beat instead of `introComplete`, so the mark assembles BEHIND the
   * overlay (~2.07s) and the curtain lifts onto a mark that is already whole —
   * no "logo vanishes, then re-forms" gap. `introComplete` still starts the
   * reform on paths that never set this (watchdog hard-reveal, reduced-motion
   * teardown), so the flag is an accelerator, never a gate.
   */
  reformStart: boolean;
  startReform: () => void;
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
  /**
   * Fractional warm-up progress, 0..1, MONOTONIC (never lowers). Published by
   * PipelineWarmup in two steps — 0.5 once `gl.compileAsync(scene, camera)`
   * has resolved (the scene's render objects are compiled), 1 once the
   * smooth-frame heuristic declares the scene warm (`setWarmReady`, which
   * also writes 1 here). READ by the preloader as the `warm` slice of its
   * counter (mobile-parity plan Phase 3.2: assets 0.70 + warm 0.30) so the
   * readout breathes through the last stretch instead of parking at one
   * value while the pipelines compile. `warmReady` stays the boolean truth
   * gate — `warmProgress === 1` alone is never read as "warm".
   */
  warmProgress: number;
  setWarmProgress: (p: number) => void;
}

export const useIntroStore = create<IntroState>((set, get) => ({
  introComplete: false,
  complete: () => set({ introComplete: true }),
  reformStart: false,
  // Idempotent: the preloader's frame loop calls this every tick once the
  // warm threshold is crossed; only the first call writes.
  startReform: () => {
    if (!get().reformStart) set({ reformStart: true });
  },
  warmReady: false,
  // Ready ⇒ progress is 1 by definition (monotonic: never lowered afterwards).
  setWarmReady: () => set({ warmReady: true, warmProgress: 1 }),
  warmProgress: 0,
  // Clamped to [0,1] and monotonic: a late compileAsync resolution (0.5) after
  // the heuristic already set 1 must not pull the counter back.
  setWarmProgress: (p) => {
    const next = Math.min(1, Math.max(0, p));
    if (Number.isNaN(next) || next <= get().warmProgress) return;
    set({ warmProgress: next });
  },
}));

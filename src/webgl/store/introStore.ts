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
 * Live first-load counter fraction (0..1) — the eased value the preloader's
 * readout displays, published every rAF tick while the chrome overlay is up
 * (preloader v2, 2026-08-28: the loader has NO backdrop of its own — the
 * WebGL scene IS the stage, and HeroLogo scrubs the spore mark's
 * materialisation from this value so the mark literally grows with the
 * percentage). A MODULE-SCOPE REF, not store state: a per-frame zustand
 * setState would notify every listener 60×/s for a value nothing reads
 * reactively (the entryProgressRef / pointerStore precedent). Rests at 1:
 * soft entries and every post-intro frame read "fully materialised"; the
 * preloader writes 0 on arm and 1 again on its way out. This module stays
 * three-free so the preloader chunk can import it.
 */
export const introProgressRef: { current: number } = { current: 1 };

interface IntroState {
  /** False until the first-load preloader hands off; true forever after. */
  introComplete: boolean;
  complete: () => void;
  /**
   * True once the hero mark's STAGE ACTOR is genuinely ready to perform the
   * materialisation (preloader v2): the spore compute build has landed AND
   * its hidden PRIME kill has finished (HeroLogo), or the static-fallback
   * build is live. The preloader requires it (home route only, bounded) to
   * complete the counter — Oddity's principle: the loader gates on exactly
   * what the hero will play, so the reveal can never land before the mark
   * exists. Never reset (per hard load, like introComplete).
   */
  heroStageReady: boolean;
  setHeroStageReady: () => void;
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
  heroStageReady: false,
  setHeroStageReady: () => {
    if (!get().heroStageReady) set({ heroStageReady: true });
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

/**
 * Bridge between the WebGL hero TEXT-PARTICLE morph and the DOM hero panel.
 *
 * The intro is a Lusion-style pinned text sequence: on entry the headline
 * area shows "Sersan AI" as a particle field; the first scroll (inside the
 * already-pinned 520vh hero, so the PAGE doesn't move — only the text) makes
 * the particles scatter and recompose into the real headline, then the crisp
 * DOM H1 cross-fades in over the particle text.
 *
 * HeroTextParticles (R3F) writes here once per frame via setState — no React
 * subscribers, so no re-renders. The hero StagePanel in
 * cinematic-system-scroll.tsx reads getState() inside its own rAF tick and
 * multiplies `domReveal` into its opacity.
 *
 * `active` flips true ONLY after the WebGL build actually resolves (WebGPU
 * compute available, fonts ready, H1 found) — every fallback path (mobile,
 * reduced-motion, non-WebGPU, no-JS, build failure) leaves it false and the
 * DOM hero renders exactly as before, visible from first paint.
 */
import { create } from "zustand";

interface TextMorphState {
  /** True while the particle-text system owns the hero headline visuals. */
  active: boolean;
  /**
   * DOM hero panel opacity multiplier 0..1 — 0 during "Sersan AI" + the
   * scatter/recompose, easing to 1 as the particle headline settles and the
   * crisp DOM text takes over. 1 whenever the system is inactive.
   */
  domReveal: number;
}

export const useTextMorphStore = create<TextMorphState>(() => ({
  active: false,
  domReveal: 1,
}));

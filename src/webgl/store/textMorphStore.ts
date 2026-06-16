/**
 * Bridge between the WebGL hero TEXT-PARTICLE morph and the DOM hero panel.
 *
 * The intro is a Lusion-style pinned text sequence: on entry the headline
 * area shows "Sersan AI" as a particle field; the first scroll (inside the
 * already-pinned 390vh hero, so the PAGE doesn't move — only the text) makes
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
  /**
   * Scroll-gate progress 0..1 — the TRUE Lusion intro: while the gate is
   * engaged the PAGE DOES NOT SCROLL AT ALL (Lenis stopped, wheel/touch
   * consumed by HeroIntroGate); the consumed input accumulates here and is
   * the ONLY driver of the text transition. Camera, mark, line — everything
   * scroll-bound — stay perfectly still until this reaches 1 and the gate
   * releases the page.
   */
  gateProgress: number;
  /** True while the gate is consuming scroll input (page locked). */
  gateEngaged: boolean;
  /**
   * Raw wheel/touch impulse (px, signed) accumulated by HeroIntroGate while
   * the gate is engaged. The page never scrolls during the gate, but the
   * scene must not feel dead: SignatureLine's frame loop CONSUMES this each
   * frame (reads + zeroes it) and turns it into a small spring-back camera
   * bob + the same velocity-driven line breath/glow normal scrolling
   * produces. Only the gate ever writes it, so normal scroll is untouched.
   */
  gateKick: number;
  /**
   * True once the automatic entry assemble ("Sersan AI" forming out of the
   * particle field on site entry, ICS-style) has completed. Page-lifetime:
   * set by HeroTextParticles when its entry clock finishes and NEVER reset
   * by rebuilds — a language switch / resize / route round-trip must not
   * replay the entrance. While false the gate still locks the page and
   * shakes the camera, but does NOT advance gateProgress: the morph can
   * only start from a fully-formed brand.
   */
  assembleDone: boolean;
  /**
   * True while the SCROLL-TRIGGERED morph animation has fully composed the
   * headline ("We build..."). The morph is one-shot and TIME-driven like the
   * entry — scroll only flips its direction (forward past the trigger,
   * reverse back below it); it always plays to completion on its own. The
   * gate refuses to release the page until this is true, so the visitor can
   * never scroll past a half-formed headline.
   */
  morphDone: boolean;
  /**
   * True once the SECOND (and FINAL) morph leg — headline "We build…" → cue
   * "see what we build" (which travels to the BOTTOM) — has fully composed.
   * Time-driven like the first morph; scroll past MORPH2_TRIGGER flips it
   * forward, scrolling back flips it reverse. The gate refuses to release the
   * page until this is true, so the visitor always sees the full three-stage
   * chain ("Sersan AI" → headline → "see what we build").
   */
  morph2Done: boolean;
  /**
   * Camera-tilt phase progress 0..1 — the FINAL hijacked beat: one more
   * scroll after the headline has composed triggers a 3D "head looks down"
   * camera move (pitch dip, written by HeroTextParticles on its own clock,
   * APPLIED by SignatureLine — the single camera authority). The particle
   * headline sweeps up/out and fades as the head comes down, and the hero
   * panel's white texts cascade in near the end. Time-driven like the other
   * two phases; scroll only flips its direction.
   */
  camTilt: number;
  /**
   * Document scrollY (px) where the camera-descent beat anchored — the end
   * of the cinematic spine where SpineExitGate engaged. SignatureLine eases
   * the descent offset out by |scroll − anchor| so the camera↔document
   * mapping is restored within ~1.5 viewports on either side of the beat.
   */
  tiltAnchorY: number;
  /**
   * Current camera DESCENT offset (world units, ≥0) actually applied by
   * SignatureLine for the tilt beat. Camera-anchored hero objects (HeroLogo,
   * the particle text anchor) SUBTRACT this from camera.position.y so they
   * hold their pre-descent station and exit the top of the frame as the
   * camera dives — instead of riding along and "reappearing".
   */
  camDescend: number;
  /** True once the camera-tilt beat has fully played — the gate releases
   * the page only after this (morphDone alone is no longer enough). */
  tiltDone: boolean;
  /**
   * True once the visitor has SKIPPED the intro this tab session — either a
   * double wheel-flick while the gate was engaged (HeroIntroGate) or the
   * persisted sessionStorage flag on a later home visit (composed by
   * SmoothScrollProvider; see src/lib/intro-skip.ts). Readers:
   * HeroTextParticles jumps every morph clock to its end state once this is
   * true, and HeroIntroGate's canEngage refuses to re-engage. Unlike the
   * other journey flags this is NEVER reset by the provider's nav-into-home
   * replay reset — the skip wins for the rest of the session.
   */
  introSkipped: boolean;
}

const createTextMorphStore = () =>
  create<TextMorphState>(() => ({
    active: false,
    domReveal: 1,
    gateProgress: 0,
    gateEngaged: false,
    gateKick: 0,
    assembleDone: false,
    morphDone: false,
    morph2Done: false,
    camTilt: 0,
    tiltAnchorY: 0,
    camDescend: 0,
    tiltDone: false,
    introSkipped: false,
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanTextMorphStore:
    | ReturnType<typeof createTextMorphStore>
    | undefined;
}

/**
 * Pinned on globalThis: this module is imported from BOTH the route bundle
 * (HeroIntroGate, the hero panel) and the lazy WebGL island (HeroTextParticles,
 * SignatureLine). On the production build Turbopack inlined a separate copy of
 * this small module into each chunk — two live zustand instances, writers and
 * readers split, the whole intro silently dead (reproduced 2026-06-10; dev
 * shares one module graph, so it only broke in prod). The global pin makes
 * every bundled copy resolve to the single real store.
 */
export const useTextMorphStore = (globalThis.__sersanTextMorphStore ??=
  createTextMorphStore());

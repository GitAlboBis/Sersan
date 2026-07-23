/**
 * railMotion — the SINGLE analytic motion model for the home work rail.
 *
 * Both consumers of the rail's scrub state derive their per-card motion from
 * this one pure function so the DOM cards and their WebGL planes stay
 * pixel-registered by construction:
 *
 *   - components/sections/case-studies-rail.tsx applies it to each card's
 *     [data-rail-inner] wrapper (scale / opacity / translateY) from the rail's
 *     ScrollTrigger onUpdate, plus the windowed counter-sweep (−t·SWEEP px on
 *     [data-rail-sweep]), media counter-parallax (−t·MEDIA_SHIFT xPercent
 *     on [data-rail-media]) and the quantised depth-of-field filter falloff
 *     (railCardFilter — DOM-only, full tier);
 *   - webgl/RailPlanes.tsx mirrors the SAME scale/y offsets in its camera-
 *     locked billboard placement, and feeds t/f into the plane material's
 *     uParallax/uFocus uniforms.
 *
 * NO smoothing lives here on purpose: the input (card center = baseVpX −
 * trackX) is already Lenis-smoothed through the scrub, and adding a second
 * lerp on the DOM side only would lag the cards behind the analytically-placed
 * planes (the horizontal-parallax template's documented double-smoothing
 * gotcha). Velocity-derived motion (the track skew) is damped separately in
 * the rail component — it never routes through this model.
 *
 * All values are deliberately restrained ("engineered depth, not carousel
 * candy"): 6% scale falloff, 40% fade, a 12px pyramidal arc, 2.5px max blur.
 */

export interface RailCardMotion {
  /** Signed center distance: −1 (left edge) … 0 (viewport center) … +1. */
  t: number;
  /** Unsigned center-focus falloff |t| ∈ [0, 1]. */
  f: number;
  /** Inner-wrapper scale: 1 at center → 1 − RAIL_FOCUS_SCALE at the edges. */
  scale: number;
  /** Inner-wrapper opacity: 1 at center → 1 − RAIL_FOCUS_FADE at the edges. */
  opacity: number;
  /** Pyramidal y-arc in CSS px (positive = down): RAIL_ARC_PX · f². */
  y: number;
}

/** Pyramidal arc depth in CSS px at the viewport edges (y = ARC·f²). */
export const RAIL_ARC_PX = 12;
/** Scale falloff at the edges (scale = 1 − 0.06·f). */
export const RAIL_FOCUS_SCALE = 0.06;
/** Opacity falloff at the edges (opacity = 1 − 0.4·f). */
export const RAIL_FOCUS_FADE = 0.4;
/** Windowed counter-sweep of the card's metric block, px at |t| = 1. */
export const RAIL_SWEEP_PX = 60;
/** Media counter-parallax at |t| = 1, in % of the 112%-bleed media layer. */
export const RAIL_MEDIA_SHIFT = 5;
/** uParallax fed to the plane material: t · this (procedural-field shift). */
export const RAIL_PLANE_PARALLAX = 0.35;
/** Max depth-of-field blur at the viewport edges, CSS px (railCardFilter). */
export const RAIL_FOCUS_BLUR_PX = 2.5;
/** Blur quantisation step, px — the filter string only changes on a step. */
export const RAIL_BLUR_STEP = 0.25;
/** Brightness dim at the edges (brightness = 1 − 0.18·q, q = blur fraction). */
export const RAIL_FOCUS_DIM = 0.18;
/** Saturation falloff at the edges (saturate = 1 − 0.15·q). */
export const RAIL_FOCUS_DESAT = 0.15;

/**
 * Pure per-card motion from the card's live viewport center X. `centerX` is
 * derived analytically (cached un-translated center − live trackX) — NEVER
 * from getBoundingClientRect in a frame loop.
 */
export function railCardMotion(centerX: number, vw: number): RailCardMotion {
  const half = vw > 0 ? vw / 2 : 1;
  const t = Math.min(1, Math.max(-1, (centerX - half) / half));
  const f = Math.abs(t);
  return {
    t,
    f,
    scale: 1 - RAIL_FOCUS_SCALE * f,
    opacity: 1 - RAIL_FOCUS_FADE * f,
    y: RAIL_ARC_PX * f * f,
  };
}

/**
 * Depth-of-field filter string for a card at center falloff f — the DOM half
 * of the rail's focus model (the WebGL planes defocus procedurally via
 * uFocus). Quantised: blur snaps to RAIL_BLUR_STEP increments and brightness/
 * saturate derive from the SAME quantised fraction, so consecutive frames
 * yield byte-identical strings and the caller's change-guard only touches
 * style.filter on a step crossing (10 discrete states per card — no filter
 * churn). Returns "" below the first step: the centred card carries NO filter
 * property at all (crisp at center lock by construction; even a blur(0px)
 * would force an offscreen composite).
 */
export function railCardFilter(f: number): string {
  const blur =
    Math.round((RAIL_FOCUS_BLUR_PX * f) / RAIL_BLUR_STEP) * RAIL_BLUR_STEP;
  if (blur <= 0) return "";
  const q = blur / RAIL_FOCUS_BLUR_PX;
  const brightness = (1 - RAIL_FOCUS_DIM * q).toFixed(3);
  const saturate = (1 - RAIL_FOCUS_DESAT * q).toFixed(3);
  return `blur(${blur}px) brightness(${brightness}) saturate(${saturate})`;
}

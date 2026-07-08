/**
 * founderMotion — the SINGLE analytic motion model for the home founders rail.
 *
 * One pure function, two consumers (mirrors railMotion.ts), so the DOM cards and
 * their WebGL portrait planes stay registered by construction:
 *
 *   - components/sections/founders-rail.tsx derives the per-card `t` here for its
 *     existing windowed name counter-sweep and portrait counter-parallax (same
 *     value it computed inline before — byte-identical output);
 *   - webgl/FounderPlanes.tsx mirrors the SAME scale/y offsets in its camera-
 *     locked billboard placement and feeds `f` into the plane material's uFocus.
 *
 * NO smoothing lives here on purpose: the input (card center = baseCenter −
 * trackX) is already Lenis-smoothed through the scrub, and a second lerp on one
 * side only would lag it against the other (the horizontal-parallax template's
 * double-smoothing gotcha, documented in railMotion.ts).
 *
 * Values are deliberately restrained ("engineered depth, not carousel candy"):
 * 4% scale falloff, an 8px pyramidal arc.
 */

export interface FounderCardMotion {
  /** Signed center distance: −1 (left edge) … 0 (viewport center) … +1. */
  t: number;
  /** Unsigned center-focus falloff |t| ∈ [0, 1]. */
  f: number;
  /** Plane scale: 1 at center → 1 − FOUNDER_FOCUS_SCALE at the edges. */
  scale: number;
  /** Pyramidal y-arc in CSS px (positive = down): FOUNDER_ARC_PX · f². */
  y: number;
}

/** Pyramidal arc depth in CSS px at the viewport edges (y = ARC·f²). */
export const FOUNDER_ARC_PX = 8;
/** Scale falloff at the edges (scale = 1 − 0.04·f). */
export const FOUNDER_FOCUS_SCALE = 0.04;

/**
 * Max 3D tilt magnitude (rad) applied to a hovered card as it "looks toward" the
 * cursor — composed onto the camera quaternion in FounderPlanes for the
 * camera-move feel. Restrained so text overlaid by the DOM stays readable.
 */
export const FOUNDER_TILT_MAX = 0.12;

/**
 * Cursor-lens radius in card UV space (aspect-corrected). Within this distance of
 * the pointer the portrait crossfades to the neural node-graph look.
 */
export const FOUNDER_LENS_RADIUS = 0.42;

/**
 * Pure per-card motion from the card's live viewport center X. `centerX` is
 * derived analytically (cached un-translated center − live trackX) — NEVER from
 * getBoundingClientRect in a frame loop.
 */
export function founderCardMotion(centerX: number, vw: number): FounderCardMotion {
  const half = vw > 0 ? vw / 2 : 1;
  const t = Math.min(1, Math.max(-1, (centerX - half) / half));
  const f = Math.abs(t);
  return {
    t,
    f,
    scale: 1 - FOUNDER_FOCUS_SCALE * f,
    y: FOUNDER_ARC_PX * f * f,
  };
}

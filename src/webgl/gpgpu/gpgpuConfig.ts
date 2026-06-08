/**
 * Tunable parameters for the GPGPU dissolve hero (PRD §"Params").
 *
 * Shared by the GLSL (flag-OFF) and TSL (flag-ON) rigs so both backends run the
 * SAME numbers. HeroLogo overlays the few live-tunable knobs from fxStore
 * (LineDebug leva) onto a copy of DEFAULT_GPGPU_CONFIG each frame.
 *
 * Colors are [r,g,b] in 0..1 (passed straight to a THREE.Color in the render
 * material): COL_COLD = violet (slow particles), COL_HOT = cyan (fast particles).
 */
export interface GpgpuConfig {
  /** Grid edge → SIZE*SIZE particles. Tier-scaled (full 256, lite 128). */
  SIZE: number;
  /** Elastic spring constant pulling particles back to home. */
  SPRING: number;
  /** Exponential velocity damping rate. */
  DAMPING: number;
  /** Mouse-repulsion strength. */
  PUSH: number;
  /** Mouse-repulsion radius in MODEL space. */
  RADIUS: number;
  /** Velocity clamp. */
  MAX_SPEED: number;
  /** Turbulence amplitude at rest. */
  TURB_BASE: number;
  /** Extra turbulence amplitude when far from home. */
  TURB_MOVE: number;
  /** Sprite size in device px (before perspective scale). */
  POINT_SIZE: number;
  /** Violet — color of slow / at-rest particles. */
  COL_COLD: [number, number, number];
  /** Cyan — color of fast / dispersing particles. */
  COL_HOT: [number, number, number];
}

export const DEFAULT_GPGPU_CONFIG: GpgpuConfig = {
  SIZE: 256,
  SPRING: 26,
  DAMPING: 4.5,
  PUSH: 42,
  RADIUS: 0.52,
  MAX_SPEED: 4,
  TURB_BASE: 0.35,
  TURB_MOVE: 1.2,
  POINT_SIZE: 7,
  COL_COLD: [0.42, 0.3, 0.86],
  COL_HOT: [0.28, 0.95, 0.95],
};

/** Per-tier grid size. `off` never builds the rig (handled upstream). */
export const SIZE_BY_TIER: Record<"full" | "lite", number> = {
  full: 256,
  lite: 128,
};

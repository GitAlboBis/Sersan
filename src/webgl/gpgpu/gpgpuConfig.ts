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
  /**
   * Turbulence amplitude at rest. Kept ~0 so settled particles sit GLUED on
   * their home surface point (the mark must read razor-crisp), unlike the
   * earlier 0.35 that loosened every particle into a drifting cloud.
   */
  TURB_BASE: number;
  /** Extra turbulence amplitude when far from home (only disturbed particles). */
  TURB_MOVE: number;
  /**
   * How fast displacement ramps the turbulence/disp factor. `disp =
   * clamp(length(home-pos) * TURB_DISP_K, 0, 1)`; higher = only particles lifted
   * well off the surface get any shimmer, so the resting skin stays still.
   */
  TURB_DISP_K: number;
  /** Sprite size in device px (before perspective scale). */
  POINT_SIZE: number;
  /**
   * Sprite alpha at the disc center (before the radial falloff + scroll fade).
   * Raised from the old 0.55 so neighbouring sprites overlap into a continuous
   * velvety SKIN instead of reading as separate dots (DDD's particles touch).
   */
  POINT_ALPHA: number;
  /**
   * HDR emissive multiplier on the render color — the single source of truth
   * for the at-rest glow. Folded into the reference color relationship
   * (col *= … * EMISSIVE) so the resting violet mark crosses the cinematic
   * Bloom threshold (~1.0) and reads as a softly-glowing centerpiece, while
   * fast cyan motes go well above and bloom hard. Both backends identical.
   */
  EMISSIVE: number;
  /** Violet — color of slow / at-rest particles. */
  COL_COLD: [number, number, number];
  /** Cyan — color of fast / dispersing particles. */
  COL_HOT: [number, number, number];
}

export const DEFAULT_GPGPU_CONFIG: GpgpuConfig = {
  SIZE: 256,
  // STRONG spring + near-critical damping so displaced (hovered) particles snap
  // back TIGHT to the surface — the "glued/velvety return" — with no loose
  // overshoot or jitter. Was SPRING 26 / DAMPING 4.5 (soft, drifting).
  SPRING: 55,
  DAMPING: 9.0,
  PUSH: 42,
  RADIUS: 0.52,
  MAX_SPEED: 4,
  // ~0 at rest: settled particles get NO turbulence so the skin is crisp and
  // still. Was 0.35 (constant shimmer loosened the whole mark). A whisper (0.02)
  // keeps the skin alive without smearing the shape.
  TURB_BASE: 0.02,
  TURB_MOVE: 1.2,
  // Only particles lifted well off home (hovered) ramp into turbulence. Was an
  // inline ×3; raised to 6 so the resting skin contributes ~zero disp.
  TURB_DISP_K: 6.0,
  // Sprite size in device px. Reframed smaller now that the mark sits at a sober
  // heroScale 0.17 (was 0.32): at the smaller world size 12px bridged the "52"
  // counters into a blob. 9px keeps neighbouring sprites overlapping into a
  // continuous velvety SKIN while leaving the 5/2 counters and the central
  // divider OPEN so it reads as a dense "52", not a bridged slab. Live-tunable
  // via fxStore.gpgpuPointSize (LineDebug "point size").
  POINT_SIZE: 9,
  POINT_ALPHA: 0.88,
  // ~2.6 so the resting violet skin clears the Bloom threshold and glows softly
  // at the smaller/denser scale; fast cyan motes still bloom hard via
  // ×(1+vSpeed*0.35). Live-tunable via fxStore.gpgpuEmissive (LineDebug
  // "GPGPU emissive / glow").
  EMISSIVE: 2.6,
  COL_COLD: [0.42, 0.3, 0.86],
  COL_HOT: [0.28, 0.95, 0.95],
};

/** Per-tier grid size. `off` never builds the rig (handled upstream). */
export const SIZE_BY_TIER: Record<"full" | "lite", number> = {
  full: 256,
  lite: 128,
};

// ===========================================================================
// TWO-LAYER hero (Lusion DDD footer-D, verified 2026-06-09) — body + skin
// ===========================================================================
// The live DDD effect is TWO particle layers (see ParticleDissolve.md §1):
//   • BODY — a dense, calm, OPAQUE violet "D" that occludes (reads solid) and
//     barely reacts to the cursor. NormalBlending + depthWrite so it composites
//     as a solid base under the glow.
//   • SKIN — a reactive, ADDITIVE cyan particle skin sitting a hair OUTSIDE the
//     body (offset along +normal). UNDER-DAMPED spring (ζ≈0.39) so on hover it
//     sprays away from the cursor WITH MOMENTUM and eases back over ~1–2 s — the
//     "fly out, hang, return" feel, NOT the analytic snap of `particles-static`.
// Both run the SAME momentum sim (createGpgpuSim / createGpgpuNodeSim) with
// different force/render params; the model-space cursor is shared.

/** Blending mode for a layer's render material (mapped to THREE constants). */
export type GpgpuBlending = "additive" | "normal";

/** Render-material options that differ per layer (body occludes, skin glows). */
export interface GpgpuRenderOpts {
  blending: GpgpuBlending;
  depthWrite: boolean;
  transparent: boolean;
}

/** A full layer spec: sim/render config + how to sample its home field. */
export interface GpgpuLayerConfig {
  /** Force + render constants (same shape as the single-layer config). */
  config: GpgpuConfig;
  /** Surface-sampling options for this layer's home field (see MarkLayerOptions). */
  sampling: { frontBias: number; normalOffset: number; volumeJitter: number };
  /** Render-material blending/depth/transparency. */
  render: GpgpuRenderOpts;
}

/** ζ = DAMPING/(2·√SPRING). Body ≈0.58 (calm, tiny overshoot); skin ≈0.39 (drift). */
export const BODY_LAYER: GpgpuLayerConfig = {
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    // Calm + fairly stiff so the body barely moves and reads as a solid base.
    SPRING: 36,
    DAMPING: 7,
    PUSH: 26,
    RADIUS: 0.5,
    MAX_SPEED: 4,
    TURB_BASE: 0.02,
    TURB_MOVE: 0.9,
    TURB_DISP_K: 6,
    // BIG soft discs that overlap into a continuous violet mass (vs hard opaque
    // dots = grainy). With transparent NormalBlending below, the feathered alpha
    // blends neighbouring discs → a smooth solid-reading plate, no DOF needed.
    POINT_SIZE: 11,
    POINT_ALPHA: 0.85,
    // Lower emissive: the body is the dark violet solid, not the glow.
    EMISSIVE: 1.6,
    COL_COLD: [0.4, 0.28, 0.85], // violet
    COL_HOT: [0.55, 0.75, 1.0], // → azure/white when (rarely) moved
  },
  // STRONG front-bias so particles concentrate on the camera-facing plate (a
  // dense solid read), with only a whisper of inward jitter for depth.
  sampling: { frontBias: 0.82, normalOffset: 0, volumeJitter: 0.02 },
  // Transparent NormalBlending (NOT opaque): the feathered discs blend/overlap
  // into a smooth violet fill rather than hard grainy dots. Drawn first
  // (renderOrder 0); the additive cyan skin composites over it.
  render: { blending: "normal", depthWrite: false, transparent: true },
};

export const SKIN_LAYER: GpgpuLayerConfig = {
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    // UNDER-DAMPED: sprays far on hover, hangs, eases back over ~1–2 s.
    SPRING: 20,
    DAMPING: 3.5,
    PUSH: 60,
    RADIUS: 0.6,
    MAX_SPEED: 4.5,
    TURB_BASE: 0.04,
    TURB_MOVE: 1.8,
    TURB_DISP_K: 5,
    // Larger, semi-transparent additive sprites → a glowing cyan velvet skin.
    POINT_SIZE: 6.5,
    POINT_ALPHA: 0.55,
    EMISSIVE: 2.6,
    COL_COLD: [0.25, 0.95, 0.95], // cyan at rest
    COL_HOT: [0.9, 1.0, 1.0], // → white when fast/sprayed
  },
  // Front-biased like the original; offset OUT along +normal so the cyan glow
  // floats just outside the violet body surface.
  sampling: { frontBias: 0.12, normalOffset: 0.03, volumeJitter: 0 },
  render: { blending: "additive", depthWrite: false, transparent: true },
};

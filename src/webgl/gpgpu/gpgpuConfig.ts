/**
 * Tunable parameters for the GPGPU dissolve hero (PRD §"Params").
 *
 * Shared by the GLSL static fallback (flag-OFF, gpgpuRenderShader.ts) and the
 * TSL builds (flag-ON, gpgpuNodeSim.ts) so both backends run the SAME numbers.
 * HeroLogo overlays the few live-tunable knobs from fxStore (LineDebug leva)
 * onto a copy of DEFAULT_GPGPU_CONFIG each frame.
 *
 * Colors are [r,g,b] in 0..1 (passed straight to a THREE.Color in the render
 * material): COL_COLD = blue (slow particles), COL_HOT = cyan (fast particles).
 */
import type { Vector3 } from "three";

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
  /**
   * Cursor-attractor ORBIT (swirl) strength as a RATIO of PUSH — the
   * three.js attractors-example spin term (`axis × direction-to-attractor`)
   * that swirls displaced particles around the cursor while the radial push
   * throws them out. Scaling by the layer's own PUSH preserves the per-layer
   * balance automatically (the pinned core's whisper-push gets a whisper-
   * orbit). The term is gated by the same radius falloff, so the RESTING
   * crust (cursor parked at 1e9 → falloff 0) is unchanged by construction.
   * 0 disables the swirl entirely.
   */
  ORBIT: number;
  /**
   * Falloff exponent for the orbit term (higher hugs the cursor tighter).
   * The radial push keeps its approved push² shape independently.
   */
  ORBIT_FALLOFF: number;
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
   * (col *= … * EMISSIVE) so the resting blue mark crosses the cinematic
   * Bloom threshold (~1.0) and reads as a softly-glowing centerpiece, while
   * fast cyan motes go well above and bloom hard. Both backends identical.
   */
  EMISSIVE: number;
  /** Blue — color of slow / at-rest particles. */
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
  // Subordinate swirl: at the falloff midpoint the orbit acc is well under the
  // radial push, so hover still reads as "thrown out", now with rotation. Rest
  // state is unaffected at ANY value (falloff-gated). Live via
  // fxStore.sporeAttractor / sporeOrbitFalloff (LineDebug "GPGPU hero").
  ORBIT: 0.6,
  ORBIT_FALLOFF: 2.0,
  // Sprite size in device px. Reframed smaller now that the mark sits at a sober
  // heroScale 0.17 (was 0.32): at the smaller world size 12px bridged the "52"
  // counters into a blob. 9px keeps neighbouring sprites overlapping into a
  // continuous velvety SKIN while leaving the 5/2 counters and the central
  // divider OPEN so it reads as a dense "52", not a bridged slab. Live-tunable
  // via fxStore.gpgpuPointSize (LineDebug "point size").
  POINT_SIZE: 9,
  POINT_ALPHA: 0.88,
  // ~2.6 so the resting blue skin clears the Bloom threshold and glows softly
  // at the smaller/denser scale; fast cyan motes still bloom hard via
  // ×(1+vSpeed*0.35). Live-tunable via fxStore.gpgpuEmissive (LineDebug
  // "GPGPU emissive / glow").
  EMISSIVE: 2.6,
  // Blue (was violet [0.42,0.3,0.86]) — the brand palette is blue/cyan, no
  // purple. Only the NON-WebGPU static fallback mark reads these; the shipping
  // spores path takes its colours from the active variant (sporePresets.ts).
  COL_COLD: [0.16, 0.42, 0.95],
  COL_HOT: [0.28, 0.95, 0.95],
};

/** Per-tier grid size → SIZE*SIZE particles per layer. High count so the big
 * soft spores PACK edge-to-edge into a continuous mass (DDD look: spores touch,
 * no gaps) rather than reading as spaced dots. full 448² ≈ 200k/layer. */
export const SIZE_BY_TIER: Record<"full" | "lite", number> = {
  full: 448,
  lite: 224,
};

// ===========================================================================
// Shared sim-rig contracts (moved here from the deleted gpgpuSim.ts — C3
// consolidation 2026-06-13: the GLSL FBO ping-pong rig and the two-layer
// sprite presets that consumed it were retired; only the compute rigs in
// gpgpuNodeSim.ts implement these now). Type-only `three` import — erased at
// compile time, so this stays a pure-data module for the OFF bundle.
// ===========================================================================

export interface GpgpuTickParams {
  /** Clamped frame delta (seconds). */
  dt: number;
  /** Wall-clock-ish accumulator for turbulence animation. */
  time: number;
  /** Model-space cursor; set far away (1e9) to disable repulsion. */
  mouse: Vector3;
}

/** Minimal sim handle the integration shell (HeroLogo) drives per frame. */
export interface GpgpuSimRig {
  /** Edge of the SIZE×SIZE state grid. */
  size: number;
  /** Advance one sim step (one compute dispatch). Called once per frame. */
  tick: (p: GpgpuTickParams) => void;
  dispose: () => void;
}

// ===========================================================================
// SPORE hero (DDD production-bundle ground truth, 2026-06-09) — instanced
// shaded spheres, NOT sprites.
// ===========================================================================
// Reverse-engineering the shipped DDD bundle (see this task's
// research/ddd-bundle-teardown-spore-render.md) showed the real effect is:
//   • ONE particle system of ~51k (desktop) / ~29k (mobile, FEWER but BIGGER)
//     instanced low-poly LIT hemisphere meshes — per-vertex diffuse + AO —
//     opaque, depth-tested. NOT additive feathered discs: additive/feathered
//     can only brighten, never occlude or show a shadow side, so it reads as
//     fog. The "spore" read = per-ball shading + inter-ball occlusion + hard
//     silhouettes.
//   • Spore diameter ≈ letterHeight / 47 in WORLD space (not device px).
//   • A SOLID dark inner occluder mesh under the shell (so gaps read as mass).
//   • Albedo violet ×0.25 at rest (near-black); emission lerps violet→cyan and
//     only fast/regrowing spores cross the selective-bloom threshold.
//   • NO depth-of-field (their pipeline ships bokehAmount:0).
// Our `spores` mode mirrors that on the compute sim: one under-damped layer of
// instanced icospheres + the dark occluder mark mesh.

/** Spore-look render constants (separate from the sim force model). */
export interface SporeRenderConfig {
  /** Sphere DIAMETER as a fraction of the mark's model height (DDD ≈ 1/47). */
  DIAMETER_RATIO: number;
  /** Per-instance radius variance multipliers [min, max]. */
  VAR_MIN: number;
  VAR_MAX: number;
  /** Resting albedo (blue; was DDD's violet vec3(0.44,0.322,0.816)). */
  ALBEDO: [number, number, number];
  /** Resting albedo multiplier — DDD darkens the resting crust to ×0.25. */
  ALBEDO_MUL: number;
  /** Emission target color for fast spores (cyan). */
  EMISSION: [number, number, number];
  /** HDR emission strength — drives the selective Bloom on fast spores. */
  EMISSIVE: number;
  /** Cyan rim-light strength at the sphere silhouette. */
  RIM: number;
  /** Velocity → emission ramp factor (t = clamp(|vel|·K, 0, 1)). */
  SPEED_COLOR_K: number;
  /**
   * Resting HDR emission baseline (EMISSION color × this, always on). 0 for
   * the dark outer crust; >0 on the CORE shell so it carries its own light —
   * f_007 shows the revealed cyan layer GLOWING (bloom), not just tinted.
   */
  BASE_EMISSION: number;
  // --- Life state machine (DDD bundle ground truth) ------------------------
  // The cursor does NOT just push spores aside: excited spores DIE (shrink to
  // nothing mid-flight, exposing the azure core) and RESPAWN at home, regrowing
  // with a scale pulse. life ∈ (0,1] pinned/alive; (−1,0] dying ghost flight;
  // ≤−1 respawn with life=2; (1,2] regrow countdown (invisible 2→1.5, grows
  // 1.5→1 with an overshoot pulse at 1.25 — DDD's exact envelope).
  /** Velocity-gated decay rate — DDD: 50·min(1,|v|·0.35)⁵ per second. */
  LIFE_DECAY: number;
  /** Heal rate back toward 1 while alive & calm (DDD "regenerates otherwise"). */
  LIFE_HEAL: number;
  /** Dying-phase countdown rate (0 → −1): 1/rate s of shrinking ghost flight. */
  LIFE_DIE: number;
  /** Regrow countdown rate (2 → 1): the crust re-forms over ~1/rate·s ×2. */
  LIFE_REGROW: number;
}

/** Spore layer: under-damped momentum sim + sampling + sphere-render look. */
export const SPORE_LAYER: {
  config: GpgpuConfig;
  sampling: { frontBias: number; normalOffset: number; volumeJitter: number };
  spore: SporeRenderConfig;
} = {
  config: {
    ...DEFAULT_GPGPU_CONFIG,
    // UNDER-DAMPED (ζ = 3.5/(2·√20) ≈ 0.39): sprays on hover, hangs, eases back
    // over ~1–2 s — the whole layer is the protagonist now (no separate skin).
    SPRING: 30,
    DAMPING: 5,
    PUSH: 70,
    RADIUS: 0.5,
    MAX_SPEED: 5,
    TURB_BASE: 0.03,
    TURB_MOVE: 1.6,
    TURB_DISP_K: 5,
    // POINT_* / EMISSIVE / COL_* are unused by the sphere render (kept for the
    // shared GpgpuConfig shape; the spore look lives in `spore` below).
  },
  // Moderate front bias (cover the front plate AND wrap the sides a little so
  // the crust reads volumetric); centers pushed OUT along +normal ≈ one radius
  // so the crust sits PROUD of the cyan core shell beneath (and erodes off it).
  sampling: { frontBias: 0.3, normalOffset: 0.022, volumeJitter: 0.015 },
  spore: {
    DIAMETER_RATIO: 1 / 47,
    VAR_MIN: 0.7,
    VAR_MAX: 1.45,
    // Blue (was violet [0.44,0.322,0.816]) — hue shifted to blue, magnitude
    // preserved (matches DEFAULT_GPGPU_CONFIG.COL_COLD migration) so the
    // ALBEDO_MUL 0.25 near-black-crust brightness intent is unchanged.
    ALBEDO: [0.16, 0.42, 0.95],
    ALBEDO_MUL: 0.25,
    EMISSION: [0.0, 1.0, 1.0],
    EMISSIVE: 2.2,
    RIM: 0.5,
    SPEED_COLOR_K: 0.55,
    BASE_EMISSION: 0,
    LIFE_DECAY: 40,
    LIFE_HEAL: 0.2,
    // ≈0.83 s of ghost flight (was 1.5 → ≈0.67 s): paired with the gentler
    // ghost damping/drift in the kernel so dying spores sail a touch FARTHER
    // into space (user feedback) without lingering forever.
    LIFE_DIE: 1.2,
    LIFE_REGROW: 1.0,
  },
};

// NOTE — the CORE-shell spec (the glowing layer revealed when the crust erodes:
// bright azure albedo, always-on HDR emission, stiff calm spring, LIFE_DECAY 0
// → immortal, sampled just beneath the crust) is no longer a standalone export.
// The hero is now VARIANT-driven: every selectable look (and its core shell)
// lives in `sporePresets.ts` as a `SporePreset.layers[]` entry (see CORE_BASE
// there). SPORE_LAYER above is kept only because fxStore reads its EMISSIVE for
// the live `sporeEmissive` default.

/** Spore-mode grid edge per tier → SIZE² instances. DDD ships ~51k desktop /
 * ~29k mobile (mobile fewer but BIGGER — we scale radius up on lite). The
 * spores OVERLAP heavily (≈20× flat front-face tiling) into a bumpy crust. */
export const SPORE_SIZE_BY_TIER: Record<"full" | "lite", number> = {
  full: 192, // 36,864 instances
  lite: 128, // 16,384 instances (radius ×1.22 — see SPORE_LITE_RADIUS_SCALE)
};

/** Lite tier compensates lower density with bigger spores (DDD mobile does
 * exactly this: 0.015 → 0.0185). */
export const SPORE_LITE_RADIUS_SCALE = 1.22;

// NOTE — the inner-occluder colour (the solid mark behind the shells, what
// shows through eroded gaps: a dark navy-cyan well below bloom) is now per
// VARIANT: `SporePreset.occluder` in sporePresets.ts, written to the occluder
// material per-frame in HeroLogo. No standalone export here anymore.

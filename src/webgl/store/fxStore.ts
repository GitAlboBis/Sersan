/**
 * Tunable look parameters for the signature line + postprocessing.
 *
 * Defaults are the shipped look. In development the leva panel (LineDebug)
 * writes here live; SignatureLine reads per-frame via getState() (cheap),
 * PostFX reads reactively (re-render on change is fine for dev tuning).
 */
import { create } from "zustand";
import { DEFAULT_GPGPU_CONFIG, SPORE_LAYER } from "../gpgpu/gpgpuConfig";

interface FxState {
  // Line material
  colorA: string;
  colorB: string;
  colorHot: string;
  emissive: number;
  glowFalloff: number;
  headSharp: number;
  flowSpeed: number;
  /** Fresnel rim exponent for the "gel tube" grazing-edge glow. */
  fresnelPower: number;
  /** Strength of the fake-scatter glow added at grazing angles. */
  scatter: number;
  /** Tube radius as a fraction of viewport world height. */
  radiusFactor: number;
  /**
   * Global intensity for the faint curl-noise tube-field background
   * (CurlTubeField, full-tier only). Default low so it reads as soft haze
   * subordinate to the signature line; set to 0 to hide the field entirely.
   */
  curlTubeIntensity: number;
  // Postprocessing
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;
  noiseOpacity: number;
  vignetteDarkness: number;
  // Hero Signal Core
  heroEmissive: number;
  heroPulseSpeed: number;
  /**
   * Hero mark scale as a fraction of viewport world height. Raised to frame the
   * wide SERSAN mark (2.64×2 normalized) as a PROMINENT particle logo at rest
   * (HeroLogo: `WORLD_VIEW_HEIGHT * heroScale`).
   */
  heroScale: number;
  /**
   * Hero mark horizontal anchor as a fraction of `worldViewWidth` (HeroLogo:
   * `group.position.x = worldViewWidth * (heroOffsetX - hp*0.05)`). Sits the
   * mark on the right of the hero; lower = less far right so the wide mark is
   * fully visible (not clipped). The hp term keeps the gentle scroll drift left.
   */
  heroOffsetX: number;
  /**
   * Hero mark vertical anchor as a fraction of `WORLD_VIEW_HEIGHT`, relative to
   * the camera (HeroLogo: `group.position.y = camera.position.y -
   * WORLD_VIEW_HEIGHT*(heroOffsetY + hp*0.04)`). 0 = centered on the camera row;
   * the hp term keeps the gentle sink as the story advances.
   */
  heroOffsetY: number;
  /**
   * Hero mark rest depth in world Z (HeroLogo: `group.position.z = heroPosZ -
   * hp*2.2`). Much closer than the old -1.6 so the mark reads big & front-facing
   * at rest near the content plane; the hp term keeps the scroll recede.
   */
  heroPosZ: number;
  /**
   * DEBUG render mode for the hero mark (HeroLogo). Lets us verify the GLB's
   * size/position/orientation BEFORE the GPGPU particle engine is in play:
   *   "solid"     → draw the loaded, normalized mark as a plain unlit mesh,
   *                 NO particles (default while we debug the baseline).
   *   "particles" → the parked GPGPU FBO particle cloud (vertex-stage RT read
   *                 scrambles on WebGPU — kept gated for reference, not shipped).
   *   "both"      → solid + GPGPU particles, framed identically (sanity check).
   *   "particles-static" → THE CURRENT SHIPPING HERO: render the particle
   *                 billboards at their HOME positions (per-instance vec3
   *                 attribute) and ANALYTICALLY displace them near the cursor in
   *                 the vertex shader (lift + violet→cyan, eased hover). No FBO,
   *                 no sim, no vertex-stage texture read → robust on WebGPU.
   *   "particles-2layer" → the earlier two-layer sprite attempt (opaque violet
   *                 BODY + additive cyan SKIN, both on the momentum sim). Kept
   *                 for A/B reference — superseded by "spores" below once the
   *                 DDD production bundle was reverse-engineered and showed the
   *                 real effect is NOT additive sprites at all.
   *   "spores"    → THE DDD-CORRECT hero (bundle teardown 2026-06-09, see the
   *                 task's research/ddd-bundle-teardown-spore-render.md): ONE
   *                 under-damped momentum layer of ~37k instanced SHADED OPAQUE
   *                 icospheres (lambert + rim + per-spore AO darkening, depth-
   *                 tested, world-space radius ≈ markHeight/47) over a solid
   *                 dark occluder mark mesh. Resting crust = near-black violet;
   *                 fast spores lerp to cyan emission and bloom selectively.
   *                 WebGPU-backend only (compute); other backends keep the
   *                 static fallback. Candidate default once approved.
   * Live-settable from the console:
   *   window.__sersanFx.getState().set({ heroRenderMode: "spores" })
   */
  heroRenderMode:
    | "solid"
    | "particles"
    | "both"
    | "particles-static"
    | "particles-2layer"
    | "spores";
  /**
   * Spore-mode live knobs: base sphere radius multiplier (1 = DDD's
   * markHeight/47 diameter) and HDR emission strength on fast spores.
   */
  sporeSize: number;
  sporeEmissive: number;
  // Particle field
  particleOpacity: number;
  // GPGPU dissolve hero (HeroLogo) — the few live-tunable sim/render knobs.
  // Full param set + defaults live in gpgpu/gpgpuConfig.ts; these override it.
  /** Elastic spring constant pulling particles back to the mark (regeneration). */
  gpgpuSpring: number;
  /**
   * Exponential velocity damping rate — tune WITH spring for a tight, glued
   * snap-back (no loose overshoot/jitter).
   */
  gpgpuDamping: number;
  /** Mouse-repulsion strength. */
  gpgpuPush: number;
  /** Mouse-repulsion radius in model space. */
  gpgpuRadius: number;
  /**
   * At-rest turbulence amplitude. Keep ~0 so settled particles stay GLUED to the
   * surface and the mark reads razor-crisp; raise only for a livelier resting
   * skin.
   */
  gpgpuTurbBase: number;
  /** Sprite size in device px (before perspective scale). */
  gpgpuPointSize: number;
  /**
   * Disc-center sprite alpha. High (~0.85) so neighbouring sprites overlap into
   * a continuous velvety SKIN rather than reading as separate dots.
   */
  gpgpuPointAlpha: number;
  /**
   * HDR emissive / at-rest glow multiplier on the particle render color.
   * Pushes the resting violet mark across the Bloom threshold so it reads as a
   * softly-glowing centerpiece; fast cyan motes bloom harder. Default from
   * gpgpuConfig.EMISSIVE.
   */
  gpgpuEmissive: number;
  /**
   * Max mouse-parallax tilt in radians (~0.06–0.10 ≈ 3.5–6°). The ANCHORED mark
   * eases this many radians toward the cursor (yaw from pointer-X, pitch from
   * pointer-Y) on top of its fixed rest tilt, returning to rest when centered.
   * This is NOT drag/rotation — the mark stays put and only "looks" at the
   * cursor. Set 0 for a fully static mark.
   */
  gpgpuTilt: number;
  // Pointer fluid (WebGPU/TSL path only — see PostFXNodes). A barely-there
  // liquid-glass refraction of the scene around the cursor.
  /** Max UV displacement of the scene sample, in screen fraction (~0.004–0.01). */
  fluidStrength: number;
  /** Per-frame flowmap accumulation fade (ping-pong), ~0.92–0.97. */
  dissipation: number;
  /** Gaussian splat radius in flowmap-UV units (~0.04–0.12). */
  splatRadius: number;
  // Cinematic scroll camera (lookAt-ahead tilt — full tier only)
  /** How far AHEAD along the curve the camera aims, in curve-param units (0..1). */
  lookAhead: number;
  /**
   * Scales the look target's X/Z offset before lookAt, so the camera yaws/pitches
   * only a few degrees. Keeps hero/section text stable (1 = full curve offset).
   */
  lookTiltScale: number;
  set: (partial: Partial<Omit<FxState, "set">>) => void;
}

export const useFxStore = create<FxState>((set) => ({
  colorA: "#3BE1FF",
  colorB: "#7C5CFF",
  colorHot: "#EAF6FF",
  emissive: 2.8,
  glowFalloff: 1.6,
  headSharp: 0.012,
  flowSpeed: 0.06,
  fresnelPower: 2.5,
  scatter: 0.4,
  radiusFactor: 0.013,
  curlTubeIntensity: 0.5,
  bloomIntensity: 1.1,
  bloomThreshold: 1.0,
  bloomRadius: 0.7,
  noiseOpacity: 0.025,
  vignetteDarkness: 0.55,
  heroEmissive: 2.6,
  heroPulseSpeed: 0.45,
  // Framing the wide "52" mark as a sober, FULLY-VISIBLE particle logo on the
  // hero right. The old 0.32 rendered it ~9.5×7.2 world units pushed to x≈+3.7
  // (overflowing — only a corner showed). At 0.17 the 2.64w×2.0h mark renders
  // baseScale = WORLD_VIEW_HEIGHT(≈11.19)×0.17 ≈ 1.90 → ~5.0w×3.8h, sat at
  // world x = worldViewWidth×0.2, so the whole "52" sits inside the viewport
  // with margin across desktop aspect ratios (verified vs CAMERA_Z/FOV).
  heroScale: 0.17,
  heroOffsetX: 0.2,
  heroOffsetY: 0.0,
  heroPosZ: -0.3,
  // SHIPPING hero: the DDD spore mode (instanced shaded spheres — violet
  // erodible crust + glowing azure core — on the compute momentum sim). Loads
  // with the page like the rest of the WebGL scene; on browsers without true
  // WebGPU compute, HeroLogo degrades it to the robust static-particle mark
  // automatically. Other modes remain debug toggles via window.__sersanFx.
  heroRenderMode: "spores",
  sporeSize: 1.0,
  sporeEmissive: SPORE_LAYER.spore.EMISSIVE,
  particleOpacity: 0.35,
  gpgpuSpring: DEFAULT_GPGPU_CONFIG.SPRING,
  gpgpuDamping: DEFAULT_GPGPU_CONFIG.DAMPING,
  gpgpuPush: DEFAULT_GPGPU_CONFIG.PUSH,
  gpgpuRadius: DEFAULT_GPGPU_CONFIG.RADIUS,
  gpgpuTurbBase: DEFAULT_GPGPU_CONFIG.TURB_BASE,
  gpgpuPointSize: DEFAULT_GPGPU_CONFIG.POINT_SIZE,
  gpgpuPointAlpha: DEFAULT_GPGPU_CONFIG.POINT_ALPHA,
  gpgpuEmissive: DEFAULT_GPGPU_CONFIG.EMISSIVE,
  gpgpuTilt: 0.06, // ~3.4° max parallax tilt toward the cursor (sober)
  fluidStrength: 0.006,
  dissipation: 0.96,
  splatRadius: 0.07,
  lookAhead: 0.05,
  lookTiltScale: 0.2,
  set: (partial) => set(partial),
}));

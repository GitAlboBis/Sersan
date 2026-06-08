/**
 * Tunable look parameters for the signature line + postprocessing.
 *
 * Defaults are the shipped look. In development the leva panel (LineDebug)
 * writes here live; SignatureLine reads per-frame via getState() (cheap),
 * PostFX reads reactively (re-render on change is fine for dev tuning).
 */
import { create } from "zustand";
import { DEFAULT_GPGPU_CONFIG } from "../gpgpu/gpgpuConfig";

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
  /** Hero radius as a fraction of viewport world height. */
  heroScale: number;
  // Particle field
  particleOpacity: number;
  // GPGPU dissolve hero (HeroLogo) — the few live-tunable sim/render knobs.
  // Full param set + defaults live in gpgpu/gpgpuConfig.ts; these override it.
  /** Elastic spring constant pulling particles back to the mark (regeneration). */
  gpgpuSpring: number;
  /** Mouse-repulsion strength. */
  gpgpuPush: number;
  /** Mouse-repulsion radius in model space. */
  gpgpuRadius: number;
  /** Sprite size in device px (before perspective scale). */
  gpgpuPointSize: number;
  /**
   * HDR emissive / at-rest glow multiplier on the particle render color.
   * Pushes the resting violet mark across the Bloom threshold so it reads as a
   * softly-glowing centerpiece; fast cyan motes bloom harder. Default from
   * gpgpuConfig.EMISSIVE.
   */
  gpgpuEmissive: number;
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
  heroScale: 0.235,
  particleOpacity: 0.35,
  gpgpuSpring: 26,
  gpgpuPush: 42,
  gpgpuRadius: 0.52,
  gpgpuPointSize: 7,
  gpgpuEmissive: DEFAULT_GPGPU_CONFIG.EMISSIVE,
  fluidStrength: 0.006,
  dissipation: 0.96,
  splatRadius: 0.07,
  lookAhead: 0.05,
  lookTiltScale: 0.2,
  set: (partial) => set(partial),
}));

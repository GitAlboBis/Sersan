/**
 * Tunable look parameters for the signature line + postprocessing.
 *
 * Defaults are the shipped look. In development the leva panel (LineDebug)
 * writes here live; SignatureLine reads per-frame via getState() (cheap),
 * PostFX reads reactively (re-render on change is fine for dev tuning).
 */
import { create } from "zustand";

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
  bloomIntensity: 1.1,
  bloomThreshold: 1.0,
  bloomRadius: 0.7,
  noiseOpacity: 0.05,
  vignetteDarkness: 0.55,
  heroEmissive: 2.6,
  heroPulseSpeed: 0.45,
  heroScale: 0.235,
  particleOpacity: 0.35,
  set: (partial) => set(partial),
}));

/**
 * Route-aware FX tones for the persistent WebGL layer.
 *
 * Unlike `fxStore` (the dev-tuning override, written live by the leva panel),
 * this module is PURE DATA keyed by pathname: each route gets a subtly bespoke
 * bloom / particle / line tone while staying inside SerSan's monochrome-navy
 * restraint. The consumer (`PostFX`, `SignatureLine`, `DriftParticles`) reads
 * `routeFx(pathname)` and merges it OVER the live `fxStore` values — `fxStore`
 * wins for dev tuning; `routeFx` provides the per-route bias.
 *
 * Read pattern: `routeFx(pathname)` is a pure function. Consumers that re-read
 * per-frame call it inside `useFrame` (cheap, no allocation churn beyond a
 * small object); consumers that only change on navigation read it reactively
 * (a re-render on route change is fine).
 *
 * INVARIANT (P0): `'/'` and `'default'` MUST reproduce today's look exactly.
 * The multiply-scales (`lineEmissiveScale`, `tessellationScale`,
 * `particleCountScale`) are 1 and the colors equal the shipped fxStore /
 * shader defaults, so home is byte-identical: multiplying by 1 / lerping by 0
 * is a no-op. Interior routes carry small deltas, used by later phases.
 */

import { isDetailRoute } from "../curves/routeCurves";

export interface RouteFx {
  /** Bloom pass intensity (merged over fxStore.bloomIntensity). */
  bloomIntensity: number;
  /** Bloom luminance threshold (merged over fxStore.bloomThreshold). */
  bloomThreshold: number;
  /** Bloom blur radius (merged over fxStore.bloomRadius). */
  bloomRadius: number;
  /** Particle opacity (merged over fxStore.particleOpacity). */
  particleOpacity: number;
  /** Multiplier on the per-tier particle COUNT. 1 = unchanged. */
  particleCountScale: number;
  /** Line gradient head color. */
  lineColorA: string;
  /** Line gradient tail color. */
  lineColorB: string;
  /** Line "signal head" hot color. */
  lineColorHot: string;
  /** Multiplier on the line emissive uniform. 1 = unchanged. */
  lineEmissiveScale: number;
  /** Multiplier on tube tubularSegments. 1 = unchanged. */
  tessellationScale: number;
}

/**
 * The home / fallback tone. Every value mirrors the shipped defaults so that
 * `routeFx('/')` reproduces the current look exactly:
 *   - bloomIntensity/Threshold/Radius  → fxStore defaults (1.1 / 1.0 / 0.7)
 *   - particleOpacity                  → fxStore default (0.35)
 *   - lineColorA/B/Hot                 → fxStore + lineShader defaults
 *   - all scales                       → 1 (no-op)
 */
export const HOME_FX: RouteFx = {
  bloomIntensity: 1.1,
  bloomThreshold: 1.0,
  bloomRadius: 0.7,
  particleOpacity: 0.35,
  particleCountScale: 1,
  lineColorA: "#3BE1FF",
  lineColorB: "#2A7FFF", // was violet #7C5CFF; value now blue
  lineColorHot: "#EAF6FF",
  lineEmissiveScale: 1,
  tessellationScale: 1,
};

/**
 * Per-route tone overrides. Deltas are deliberately SMALL — the brand is
 * monochrome navy + the cyan→blue signal; routes differ in temperature and
 * density, never in identity. Only the fields a route wants to bias are
 * listed; the rest fall back to HOME_FX.
 */
const ROUTE_FX: Record<string, Partial<RouteFx>> = {
  // Compliance: cooler + crisper. Tighter bloom (lower threshold so the line
  // catches a touch more, higher intensity, smaller radius) reads as a
  // precise, governed signal.
  "/trust": {
    bloomThreshold: 0.92,
    bloomIntensity: 1.2,
    bloomRadius: 0.6,
    lineColorB: "#2A7FFF", // was violet-ish #6E7BFF; value now blue
  },
  // Consulting: warmer + denser. A faintly warmer tail and more dust suggest
  // an active, busy production floor.
  "/consulting": {
    bloomIntensity: 1.18,
    particleCountScale: 1.15,
    particleOpacity: 0.4,
    lineColorB: "#2A7FFF", // was violet-ish #8A6BFF; value now blue
  },
  // Audit: keep full tessellation even on lite (the six-surface curve has
  // tight beats that must stay smooth); otherwise home-like.
  "/audit": {
    tessellationScale: 1,
    bloomRadius: 0.65,
  },
  // About: sparser, quieter — the founding-pair page breathes.
  "/about": {
    particleCountScale: 0.8,
    particleOpacity: 0.3,
    bloomIntensity: 1.05,
  },
  // Case studies: a touch denser dust over the evidence floor; bloom stays
  // neutral so the metric cards read crisp.
  "/case-studies": {
    particleCountScale: 1.1,
    particleOpacity: 0.38,
  },
  // Resources: quiet reading room — sparser, dimmer dust, slightly softer
  // bloom under the long-form list.
  "/resources": {
    particleCountScale: 0.85,
    particleOpacity: 0.3,
    bloomIntensity: 1.05,
  },
  // Contact: warm-calm closing page — low density, gentle bloom, the same
  // faintly warmer tail as /consulting.
  "/contact": {
    particleCountScale: 0.8,
    particleOpacity: 0.3,
    bloomIntensity: 1.05,
    lineColorB: "#2A7FFF", // was violet-ish #8A6BFF; value now blue
  },
};

/**
 * Shared tone for the detail / reading routes ([slug] templates, /services/*,
 * /start — see isDetailRoute in curves/routeCurves.ts): the quietest of all,
 * sparse dim dust and neutral bloom that stay out of the way of long-form
 * reading.
 */
const DETAIL_FX: Partial<RouteFx> = {
  particleCountScale: 0.7,
  particleOpacity: 0.28,
  bloomIntensity: 1.0,
};

/**
 * Returns the resolved FX tone for a pathname. `'/'` and unknown paths return
 * the home/default tone verbatim; known interior routes merge their small
 * deltas over it, and detail / reading routes share the quiet DETAIL_FX tone.
 */
export function routeFx(pathname: string): RouteFx {
  if (pathname === "/" || pathname == null) return HOME_FX;
  const override =
    ROUTE_FX[pathname] ?? (isDetailRoute(pathname) ? DETAIL_FX : undefined);
  return override ? { ...HOME_FX, ...override } : HOME_FX;
}

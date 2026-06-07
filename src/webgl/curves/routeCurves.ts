/**
 * Per-route waypoint configs for the signature scroll line.
 *
 * Waypoints are layout-relative, not absolute world units: `anchor` glues a
 * waypoint to a [data-line-anchor="…"] DOM node (its measured document
 * fraction), `at` is the fallback document fraction when a page has no
 * anchors. `x` serpentines in viewport half-widths (-1..1), `z` biases
 * depth toward (+) / away (-) from the camera.
 *
 * The curve is re-derived from real section positions on every layout pass
 * (useSectionAnchors), so it adapts to variable page heights, responsive
 * reflow and EN/IT copy length differences automatically.
 */

export interface Waypoint {
  /** [data-line-anchor] id this waypoint glues to (preferred). */
  anchor?: string;
  /** Fallback document fraction 0..1 when no anchor exists. */
  at?: number;
  /** Horizontal serpentine offset in viewport half-widths, -1..1. */
  x: number;
  /** Depth bias in world units (positive = toward camera). */
  z?: number;
}

export interface RouteCurveConfig {
  waypoints: Waypoint[];
}

export const routeCurves: Record<string, RouteCurveConfig> = {
  // Amplitude rule (debugged live): |x| ≥ ~1.1 puts the serpentine's
  // TURN-AROUNDS beyond the viewport edges, so on screen the line only ever
  // reads as elegant sweeping diagonals — never a visible hairpin (tight
  // on-screen turns render as polygonal elbows and can self-intersect).
  "/": {
    waypoints: [
      // Hero: enter from beyond the right edge so the beam doesn't park
      // inside the planet's volume.
      { at: 0.0, x: 1.15, z: -1.0 },
      { anchor: "credibility", x: -1.2, z: 0.2 },
      { anchor: "problem", x: 1.15, z: -0.2 },
      { anchor: "services", x: -1.25, z: 0.1 },
      { anchor: "production", x: 1.1, z: 0.5 },
      { anchor: "use-cases", x: -1.2, z: -0.3 },
      { anchor: "case-studies", x: 1.25, z: 0.2 },
      { anchor: "work-in-progress", x: -1.15, z: 0.4 },
      { anchor: "founders", x: 1.2, z: -0.2 },
      { anchor: "process", x: -1.25, z: 0.3 },
      { anchor: "fit", x: 1.1, z: -0.4 },
      // The line resolves to center and THREADS THE GATEWAY (the Blender
      // portal world-anchors to the same "gateway" gap), then runs straight
      // down into the CTA.
      { anchor: "gateway", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Generic gentle serpentine for routes without a bespoke config.
  default: {
    waypoints: [
      { at: 0.0, x: 1.15, z: -0.4 },
      { at: 0.25, x: -1.2, z: 0.2 },
      { at: 0.5, x: 1.15, z: -0.2 },
      { at: 0.75, x: -1.2, z: 0.3 },
      { at: 1.0, x: 0.0, z: 0.5 },
    ],
  },
};

export function getRouteCurve(pathname: string): RouteCurveConfig {
  return routeCurves[pathname] ?? routeCurves.default;
}

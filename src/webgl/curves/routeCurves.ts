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
  "/": {
    waypoints: [
      { at: 0.0, x: 0.6, z: -0.6 }, // hero — enters from the right
      { anchor: "credibility", x: -0.55, z: 0.2 },
      { anchor: "problem", x: 0.6, z: -0.2 },
      { anchor: "services", x: -0.65, z: 0.1 },
      { anchor: "production", x: 0.55, z: 0.5 },
      { anchor: "use-cases", x: -0.6, z: -0.3 },
      { anchor: "case-studies", x: 0.65, z: 0.2 },
      { anchor: "work-in-progress", x: -0.55, z: 0.4 },
      { anchor: "founders", x: 0.6, z: -0.2 },
      { anchor: "process", x: -0.65, z: 0.3 },
      { anchor: "fit", x: 0.55, z: -0.4 },
      { anchor: "final-cta", x: 0.0, z: 0.6 }, // resolves to center at the CTA
    ],
  },
  // Generic gentle serpentine for routes without a bespoke config.
  default: {
    waypoints: [
      { at: 0.0, x: 0.55, z: -0.4 },
      { at: 0.25, x: -0.6, z: 0.2 },
      { at: 0.5, x: 0.55, z: -0.2 },
      { at: 0.75, x: -0.55, z: 0.3 },
      { at: 1.0, x: 0.0, z: 0.5 },
    ],
  },
};

export function getRouteCurve(pathname: string): RouteCurveConfig {
  return routeCurves[pathname] ?? routeCurves.default;
}

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
  // === Interior routes ====================================================
  // Each bespoke config is anchored to that route's P5a [data-line-anchor]
  // ids and resolves to CENTER (x:0) at the transparent "ritual" gap that
  // precedes the closing CTA, where the route's RouteHero ritual object
  // world-anchors — so the beam threads the object in clean negative space
  // (exactly like home's gateway gap), then continues straight down into the
  // CTA ("final-cta", also x:0). TONE is expressed via z-bias and waypoint
  // count/spacing ONLY; |x| of every TURN-AROUND stays ≥ ~1.1 so the
  // serpentine bends happen off-screen (never narrow |x| for "focus").
  //
  // Both "ritual" and "final-cta" sit at z:0.6 toward camera, matching
  // RouteHero's default z (0.6), so the line and the object share a plane.

  // Audit: six surfaces, one week — the most beats of any interior route.
  // Crisp, technical serpentine; modest depth weave.
  "/audit": {
    waypoints: [
      { at: 0.0, x: 1.2, z: -0.6 },
      { anchor: "hero", x: -1.2, z: 0.2 },
      { anchor: "surfaces", x: 1.25, z: -0.2 },
      { anchor: "deliverable", x: -1.2, z: 0.3 },
      { anchor: "timeline", x: 1.2, z: -0.3 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Consulting: warmer, denser feel — a touch more depth swing across the
  // practice/engage/process beats suggests an active production floor.
  "/consulting": {
    waypoints: [
      { at: 0.0, x: 1.2, z: -0.5 },
      { anchor: "hero", x: -1.25, z: 0.3 },
      { anchor: "practice", x: 1.2, z: -0.4 },
      { anchor: "engage", x: -1.2, z: 0.4 },
      { anchor: "process", x: 1.25, z: -0.3 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Trust: cool, precise, governed — shallower depth weave reads as a
  // controlled signal threading the compliance beats.
  "/trust": {
    waypoints: [
      { at: 0.0, x: 1.15, z: -0.3 },
      { anchor: "hero", x: -1.2, z: 0.2 },
      { anchor: "gdpr-roles", x: 1.2, z: -0.2 },
      { anchor: "pipeline", x: -1.25, z: 0.2 },
      { anchor: "controls", x: 1.2, z: -0.2 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Case studies: fewer beats, broad confident sweeps between the grid and
  // disclaimer; pronounced depth on the entry so the long grid reads as one
  // diagonal.
  "/case-studies": {
    waypoints: [
      { at: 0.0, x: 1.25, z: -0.6 },
      { anchor: "hero", x: -1.2, z: 0.3 },
      { anchor: "grid", x: 1.2, z: -0.3 },
      { anchor: "disclaimer", x: -1.25, z: 0.3 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Resources: the quietest route — a single calm sweep into the closing ring
  // (only hero + list before final-cta).
  "/resources": {
    waypoints: [
      { at: 0.0, x: 1.2, z: -0.4 },
      { anchor: "hero", x: -1.2, z: 0.2 },
      { anchor: "list", x: 1.2, z: -0.2 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // About: sparse, breathing — gentle low-amplitude depth across the founding
  // pair beats so the page feels unhurried.
  "/about": {
    waypoints: [
      { at: 0.0, x: 1.15, z: -0.3 },
      { anchor: "hero", x: -1.2, z: 0.2 },
      { anchor: "why", x: 1.2, z: -0.2 },
      { anchor: "founders", x: -1.25, z: 0.3 },
      { anchor: "rules", x: 1.2, z: -0.2 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Contact: short and direct — three beats then the closing ring.
  "/contact": {
    waypoints: [
      { at: 0.0, x: 1.2, z: -0.4 },
      { anchor: "hero", x: -1.2, z: 0.2 },
      { anchor: "reach", x: 1.25, z: -0.3 },
      { anchor: "intake", x: -1.2, z: 0.3 },
      { anchor: "ritual", x: 0.0, z: 0.6 },
      { anchor: "final-cta", x: 0.0, z: 0.6 },
    ],
  },
  // Detail / reading routes ([slug] templates, /services/*, /start): the
  // quietest serpentine of all — three calm sweeps, shallow depth, resolving
  // to center for the closing CTA. Pure `at` fractions: these pages carry no
  // [data-line-anchor] nodes, so the curve spreads by document fraction alone.
  detail: {
    waypoints: [
      { at: 0.0, x: 1.15, z: -0.3 },
      { at: 0.35, x: -1.2, z: 0.2 },
      { at: 0.7, x: 1.15, z: -0.2 },
      { at: 1.0, x: 0.0, z: 0.5 },
    ],
  },
  // Generic gentle serpentine for routes without a bespoke config (e.g. any
  // future [slug] detail pages).
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

/** Path prefixes (trailing slash = [slug] children only, never the index
 *  pages, which keep their bespoke configs above). */
const DETAIL_PREFIXES = ["/case-studies/", "/resources/", "/services/"];

/**
 * Detail / reading routes that share the quiet "detail" curve + FX tone:
 * the [slug] templates, the four /services pages and the /start intake.
 * Bespoke configs always win — this only catches what would otherwise
 * fall through to `default`.
 */
export function isDetailRoute(pathname: string): boolean {
  return (
    pathname === "/start" ||
    DETAIL_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function getRouteCurve(pathname: string): RouteCurveConfig {
  const bespoke = routeCurves[pathname];
  if (bespoke) return bespoke;
  return isDetailRoute(pathname) ? routeCurves.detail : routeCurves.default;
}

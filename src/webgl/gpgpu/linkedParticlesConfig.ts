/**
 * Shared LOCAL-space layout + look constants for the /trust CompliancePipeline3D
 * centerpiece (step 7). Both the TSL wireframe (compliancePipelineNodeMaterial /
 * CompliancePipeline3D's conduit) and the TSL linked-particle sim
 * (linkedParticlesNodeSim) import THESE so the stage frames and the particle
 * emitters land on the same six points.
 *
 * COORDINATE FRAME (the binding decision, integration plan §A + COORDINATION):
 * the centerpiece is a CAMERA-LOCKED group scaled to the SVG card rect (w·k ×
 * h·k). Everything here is authored in the group's LOCAL space — a unit-ish rect
 * roughly [-0.5,0.5] × [-0.5,0.5], with the 6 stage centers laid horizontally,
 * derived from the SVG's D_STAGE_X normalized to [-0.5, 0.5]. NOTHING here is in
 * document/world Y (no scroll fraction); the group transform maps local → screen.
 *
 * The SVG (compliance-pipeline.tsx) remains the legible diagram on every tier;
 * the 3D is a subtle bloomed echo BEHIND it (renderOrder -1), so the wireframe
 * is kept modest and the particle accent SUBORDINATE.
 */

export const STAGE_COUNT = 6;

/**
 * Six stage X centers in LOCAL space, [-0.5, 0.5]. Mirrors the SVG's D_STAGE_X
 * (margin 70 of an 880-wide viewbox → first/last inset ~0.41 of half-width)
 * normalized to the group's unit rect, so the 3D stage frames register to the
 * SVG station columns.
 */
const SVG_VB_W = 880;
const SVG_MARGIN = 70;
export const STAGE_X: number[] = Array.from({ length: STAGE_COUNT }, (_, i) => {
  const span = SVG_VB_W - SVG_MARGIN * 2;
  const px = SVG_MARGIN + (span * i) / (STAGE_COUNT - 1);
  return px / SVG_VB_W - 0.5; // 0..1 → -0.5..0.5
});

/**
 * Conduit half-length in LOCAL X. CONTAINMENT: inset well INSIDE the card's
 * ±0.5 local edges (|STAGE_X[0]| ≈ 0.42 sat right on the edge → its bloom halo
 * bled to the viewport). 0.78× the stage inset pulls the flow span to ≈ ±0.33,
 * leaving a clear margin so the emissive geometry + its bloom halo stay within /
 * just around the card, not bleeding to the viewport edges.
 */
export const CONDUIT_HALF = Math.abs(STAGE_X[0]) * 0.78;

/** Number of parallel particle lanes spread around LOCAL Y = 0. */
export const LANE_COUNT = 5;
/**
 * LOCAL-Y gap between adjacent lanes. Tightened so the lane band (±0.08 → ±0.05)
 * and its bloom halo sit inside the card's local height rather than spreading.
 */
export const LANE_GAP = 0.026;
/**
 * Fixed flow-phase offset to a particle's lane successor (the link target).
 * Each particle links to the next particle in its lane that sits LANE_STEP
 * further along the conduit — an O(1) analytic neighbour (no O(n²) search).
 */
export const LANE_STEP = 0.04;

/** Particle count per tier. Only `full` mounts (lite/off → SVG only). */
export const COUNT_BY_TIER: Record<string, number> = {
  full: 4096,
  lite: 0,
  off: 0,
};

/** Brand signal ramp endpoints (FIXED cyan→blue — NO hue cycling). */
export const COL_CYAN = "#3BE1FF"; // matches lineColorA / HOME_FX, Input.
/** Blue tail biased to routeFx['/trust'].lineColorB (cooler trust tone). */
export const COL_VIOLET = "#2A7FFF"; // name kept; value now blue — Output.

/**
 * HDR emissive multiplier (>1.0) so PostFXNodes selective bloom catches it.
 * Dialed DOWN (2.4 → 1.25) so the field reads as a quiet governed glow just
 * above the /trust bloom threshold (~0.92), not a blown-out white bleed. Still
 * >1.0 so the existing selective bloom still picks it out.
 */
export const EMISSIVE = 1.25;
/** Particle sprite size in LOCAL units. Trimmed (0.012 → 0.009) so the discs
 * read as fine motes, not bright blobs. */
export const PARTICLE_SIZE = 0.009;
/** Link ribbon half-width in LOCAL Y. Thinned (0.004 → 0.0026) so the lanes read
 * as fine threads, not thick bright bars. */
export const LINK_WIDTH = 0.0026;
/** Link opacity ceiling (the ribbon is a faint connective glow). Lowered
 * (0.5 → 0.3) to keep the threads quiet. */
export const LINK_OPACITY = 0.3;
/** Conduit traversal speed in flow-phase units / second (Input→Output). */
export const FLOW_SPEED = 0.16;

/** Seconds for one ignition head to walk the 6 stages (echoes the SVG streak). */
export const TOTAL_DURATION = 8;

/** Wireframe (conduit + stage frames) dashed-emissive look. Dialed DOWN
 * (1.8 → 1.15) to match the calmer particle glow — a soft signal just above the
 * /trust bloom threshold, still >1.0 for the selective bloom. */
export const WIRE_EMISSIVE = 1.15;
export const WIRE_DASH_SCALE = 14;
export const WIRE_DASH_SPEED = 0.35;

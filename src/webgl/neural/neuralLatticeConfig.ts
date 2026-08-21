/**
 * SIGNAL STREAM — shared LOCAL-space layout + look constants for the WebGL
 * island in NeuralLattice.tsx (2026-08-21 signal-stream refactor; the file
 * name is kept so the store / Scene wiring stays untouched).
 *
 * ONE visual vocabulary, two configs:
 *   - "broken"  → the Problem section. The stream flows laminar for the first
 *                 ~55% of the rect, hits the FRACTURE and disperses into slow
 *                 drifting debris; surges ride the stream and DIE at the
 *                 fracture — the demo that never survives production.
 *   - "healthy" → the ProductionGrade section. The same stream threaded
 *                 through THREE GUIDE RINGS (eval → trace → guardrail):
 *                 particles tighten as they pass each ring, rings ignite on
 *                 bumpCluster, and surges ride the whole stream and SURVIVE.
 *
 * COORDINATE FRAME (unchanged contract): the stream lives in a CAMERA-LOCKED
 * group scaled to the section's `[data-lattice-anchor]` rect (w·k × h·k).
 * Everything here is authored in the group's LOCAL space — a unit-ish rect
 * roughly [-0.5,0.5] × [-0.5,0.5], x → right, y → up. NOTHING here is in
 * document/world Y; the group transform maps local → screen.
 *
 * The DOM copy (the always-open glass panes) stays the legible, accessible
 * layer on every tier; the stream is a subordinate bloomed echo behind it
 * (renderOrder -1). Homes are computed IN-SHADER from the uC0..uC4 spline
 * control-point uniforms (the uHub-style uniform-homes pattern), so a resize
 * updates uniforms only — never a buffer rebuild.
 */

/** The two stream modes. */
export type LatticeMode = "broken" | "healthy";

/** Per-mode signal clusters — three panes, three rings, three pulse slots.
 * The neuralLatticeStore sizes its pulse arrays off this (contract kept). */
export const CLUSTER_COUNT = 3;

/** Brand signal ramp endpoints (FIXED cyan→blue — NO violet, ever). */
export const COL_CYAN = "#3BE1FF"; // stream core
export const COL_BLUE = "#2A7FFF"; // stream fringe
/** Ember-grey the fracture-side debris dims toward (desaturated, sub-bloom). */
export const COL_EMBER = "#4A443E";

/** Total particles in the stream on a full-tier desktop. */
export const NEURAL_PARTICLE_COUNT = 9000;
/**
 * Compact budget, selected when `tier === "lite"` (capable phones). Additive
 * fill is the real cost: 3,200 at DPR 1 ≈ one tenth the fill of 9,000 at
 * DPR 2. Same topology — the phone gets a thinner version of the same river.
 * Read via `useTierStore.getState()` in the BUILD path only, never as a
 * subscription inside the Canvas island (the R3F island commit wedge).
 */
export const NEURAL_PARTICLE_COUNT_COMPACT = 3200;

// --- The spline (5 uniform-driven control points, local space) --------------
/** Half-span of the spline along x — slightly past the rect edge so the river
 * visibly enters/exits the band instead of starting inside it. */
export const STREAM_SPAN_X = 0.58;
/**
 * Per-mode control points [x, y, z]. Evenly spaced in x (the in-shader
 * Catmull-Rom assumes 4 equal segments, so flow-t maps ~linearly to band x —
 * which is what keeps the DOM ghost callouts registered with the WebGL
 * fracture/rings). Gentle y meander (±0.07 ≈ ±35px on a 500px band) + a
 * little z weave for parallax depth.
 */
export const STREAM_CTRL: Record<LatticeMode, [number, number, number][]> = {
  broken: [
    [-STREAM_SPAN_X, 0.02, 0.0],
    [-STREAM_SPAN_X / 2, -0.07, 0.05],
    [0.0, 0.06, -0.04],
    [STREAM_SPAN_X / 2, -0.03, 0.05],
    [STREAM_SPAN_X, 0.04, -0.02],
  ],
  healthy: [
    [-STREAM_SPAN_X, -0.04, 0.0],
    [-STREAM_SPAN_X / 2, 0.06, 0.04],
    [0.0, -0.05, -0.03],
    [STREAM_SPAN_X / 2, 0.03, 0.04],
    [STREAM_SPAN_X, 0.0, 0.0],
  ],
};

// --- The braid --------------------------------------------------------------
/** Strand sub-tubes revolving around the spline center — a braid, not a line. */
export const STRAND_COUNT = 4;
/** Strand orbit radius around the spline center (local y units; the group's
 * y-scale is the rect HEIGHT, so 0.032 ≈ 16px on a 500px band → the braid's
 * rest thickness ≈ 2·(STRAND_RADIUS + STRAND_THICKNESS)·h ≈ 50px). */
export const STRAND_RADIUS = 0.032;
/** Per-particle jitter radius within a strand (thickness noise). */
export const STRAND_THICKNESS = 0.021;
/** Full braid twists across the stream length. */
export const BRAID_TURNS = 2.6;
/** Base flow speed — cycles/sec a particle advances along the stream. */
export const FLOW_SPEED = 0.055;

// --- Guide rings (healthy) --------------------------------------------------
/**
 * Ring positions as FLOW-T. The spline overshoots the rect by STREAM_SPAN_X
 * (±0.58 across a [-0.5,0.5] rect), so band-x fraction = 1.16·t − 0.08 —
 * flow-t is NOT the band fraction. These values are solved so the rings land
 * at 40% / 62% / 84% of the RECT, i.e. t = (frac + 0.08) / 1.16, which is
 * what the DOM ghost callouts (production-grade-section.tsx CALLOUT_POS) and
 * the SVG fallback twin (neural-graph-fallback.tsx RING_X) are registered
 * against — change all three together. The spec sketch said 25/50/75%, but
 * the panes overlay the LEFT third of the band on lg — a ring at 25% would
 * ignite behind frosted glass; shifted into the open right two-thirds,
 * pipeline order (eval → trace → guardrail) preserved.
 */
export const RING_T = [0.414, 0.603, 0.793] as const;
/** Guide-ring radius (local y units) — wider than the stream so the river
 * visibly threads THROUGH it. */
export const RING_RADIUS = 0.085;
/** Ring tube thickness (particle jitter across the ring's circle). */
export const RING_TUBE = 0.011;
/** Fraction of particles that are RING particles in healthy mode (broken
 * builds have zero — every particle is stream). */
export const RING_FRACTION = 0.16;
/** Slow particle drift around each ring (rad/sec). */
export const RING_SPIN = 0.25;
/** Stream width multiplier lost per ring passed (laminar tightening):
 * after all three rings the braid is ~0.34 of its entry width. */
export const TIGHTEN_PER_RING = 0.22;
/** Extra spring gain near a ring (compute tier — the sim visibly snaps
 * particles laminar as they cross). */
export const RING_SPRING_GAIN = 2.2;
/** Gaussian sharpness of the ring-proximity window (in flow-t). */
export const RING_PROX_K = 260;

// --- The fracture (broken) --------------------------------------------------
/** Flow-t (≈ band-x fraction) where the stream fractures. */
export const FRACTURE_T = 0.55;
/** Smoothstep window past FRACTURE_T over which a particle detaches. */
export const FRACTURE_WINDOW = 0.05;
/** How far debris drifts from the fracture point (local units). */
export const DEBRIS_SPREAD = 0.55;
/** Alpha fade of fully-drifted debris (leaves a ~15% ghost). */
export const DEBRIS_FADE = 0.85;
/** Wander acceleration on dispersing debris (compute extraAcc). */
export const DEBRIS_WANDER_ACC = 5.0;

// --- Surges -----------------------------------------------------------------
/** Seconds between automatic surges. */
export const SURGE_PERIOD_BROKEN = 4;
export const SURGE_PERIOD_HEALTHY = 6;
/** Surge head speed in flow-t units/sec (~2s to cross the whole band). */
export const SURGE_SPEED = 0.55;
/** Gaussian sharpness of the surge's brightness peak along flow-t. */
export const SURGE_K = 240;
/** Emissive gain at the surge peak (rides on top of the >1.0 floor). */
export const SURGE_GAIN = 2.2;
/** Fracture death-flash: decay damp rate + spatial sharpness + gain. */
export const FLASH_DECAY = 3.5;
export const FLASH_K = 500;
export const FLASH_GAIN = 3.0;

// --- Ring ignition / hover ---------------------------------------------------
/** Emissive gain of a ring's ignition flash (bumpCluster / surge crossing). */
export const RING_FLASH_GAIN = 2.4;
/** Hovered ring glow target (pane i hover → ring i flares). */
export const RING_GLOW_FLARE = 1.9;
/** Non-hovered rings while one is hovered (recede slightly, never dark). */
export const RING_GLOW_DIM = 0.85;
/** Damp rate of the per-ring glow toward its hover target. */
export const RING_GLOW_DAMP = 7.0;
/** Broken hover tease — the debris briefly re-coheres toward the spline then
 * falls apart again. Attack/decay damp rates of the one-shot envelope. */
export const RECOHERE_ATTACK = 14.0;
export const RECOHERE_DECAY = 1.6;

// --- Emissive / render (>1.0 selective-bloom contract) -----------------------
export const STREAM_EMISSIVE = 2.6;
export const RING_EMISSIVE = 3.0;
/** At-rest alpha of a stream particle disc. */
export const STREAM_ALPHA = 0.8;
/** Billboard size in device px (perspective-scaled in the shader). */
export const NEURAL_POINT_SIZE = 7.5;
/** Ring particles read slightly denser. */
export const RING_POINT_SIZE_BOOST = 1.3;
/** Depth size/brightness attenuation keyed on local z (aerial depth cue). */
export const NEURAL_DEPTH_ATTEN = 0.5;
/** Local z half-range the depth cue normalizes over. */
export const DEPTH_Z_RANGE = 0.12;

// --- Sim (compute tier) ------------------------------------------------------
export const NEURAL_SPRING = 60;
/** ζ = DAMPING / (2·√SPRING) ≈ 0.55 — settles cleanly, no buzz. */
export const NEURAL_DAMPING = 8.5;
export const NEURAL_MAX_SPEED = 8;

// --- Pointer bend (compute tier; existing unified force model) ---------------
/** Radial repulsion strength — the cursor locally bends the river. */
export const POINTER_PUSH = 26;
/** Influence radius (local units — anisotropic with the rect scale, fine). */
export const POINTER_RADIUS = 0.22;

// --- Reveal seed cloud --------------------------------------------------------
export const SEED_SCATTER_XY = 0.95;
export const SEED_SCATTER_Z = 0.7;

// --- Whole-group life (subtle — the stream is layout-registered) -------------
export const NEURAL_PARALLAX = 0.06;
export const NEURAL_AUTO_ORBIT = 0.03;
export const NEURAL_ORBIT_FREQ_Y = 0.18;
export const NEURAL_ORBIT_FREQ_X = 0.13;
export const NEURAL_Z_BREATHE = 0.015;
/** group.scale.z = rect-height·k · this factor (honest depth for the weave). */
export const NEURAL_DEPTH_SCALE_FACTOR = 1.0;

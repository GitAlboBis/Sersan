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

/** Brand signal ramp (FIXED white-cyan→cyan→blue — NO violet, ever).
 * 2026-08-21 round-2 beauty pass: three stops — the innermost radius reads
 * white-hot, the body is brand cyan, the fringe cools to blue and fades to
 * transparent navy (additive over the navy bg = transparency). */
export const COL_CORE = "#EAFBFF"; // white-cyan — innermost radius + surge head
export const COL_CYAN = "#3BE1FF"; // stream body
export const COL_BLUE = "#2A7FFF"; // stream fringe
/** Ember ramp the fracture-side debris dims through (desaturated, sub-bloom). */
export const COL_EMBER = "#4A443E";
export const COL_EMBER2 = "#6B5546";

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
 * y-scale is the rect HEIGHT, so the braid's rest thickness ≈
 * 2·(STRAND_RADIUS + STRAND_THICKNESS)·h ≈ 34px on a 500px band — the round-2
 * "legible river" envelope, tightened from the draft's ~50px blob). */
export const STRAND_RADIUS = 0.023;
/** Per-particle jitter radius within a strand (thickness noise). */
export const STRAND_THICKNESS = 0.012;
/** Full braid twists across the stream length. */
export const BRAID_TURNS = 2.6;
/**
 * PHASE SEPARATION (round-2): distinct, non-uniform twist phases per strand +
 * a per-strand tube-thickness bias, so the four filaments read as separate
 * braided threads instead of one fused tube. Defaults seed the uStrandPhase /
 * uStrandThick uniformArrays (live-tunable via the dev handle).
 */
export const STRAND_PHASES = [0.0, 2.4, 3.9, 5.7] as const;
export const STRAND_THICK_BIAS = [1.3, 0.75, 1.05, 0.6] as const;
/** Per-strand twist-RATE multiplier = BASE + STEP·strandIndex — slightly
 * different rates make the strands visibly cross (river braiding), not run
 * as parallel helices. */
export const STRAND_RATE_BASE = 0.82;
export const STRAND_RATE_STEP = 0.12;
/** Base flow speed — cycles/sec a particle advances along the stream. */
export const FLOW_SPEED = 0.055;

// --- Silhouette (round-2 beauty pass) ----------------------------------------
/** Alpha ramp along flow-t: fade-in over the first 8%, fade-out over the last
 * 6% — kills the hard band edges AND the recycle pop (a particle wraps flow-t
 * at zero alpha on both sides of the seam). */
export const EDGE_FADE_IN = 0.08;
export const EDGE_FADE_OUT = 0.06;
/** Slight z-bow of the spline toward the camera at t=0.5 (+local z) — gives
 * the river dimensionality instead of a flat ribbon. */
export const STREAM_Z_BOW = 0.06;
/** Radial size falloff: core particles up to this ×, fringe down to this ×. */
export const CORE_SIZE_BOOST = 1.6;
export const FRINGE_SIZE_DROP = 0.6;
/** Velocity-stretched sprites (AT streak look): total elongation =
 * 1 + min(|v|·GAIN, MAX) — caps at 3× at surge speed. Compute tier stretches
 * along the LIVE velocity; the static tier uses a mild fixed elongation along
 * the spline tangent (STATIC_ELONG) plus the surge advection. */
export const STRETCH_GAIN = 1.5;
export const STRETCH_MAX = 2.0;
export const STATIC_ELONG = 0.28;
/** Analytic along-tangent speed the surge head adds (drives streaking even
 * though the surge itself is a brightness wave, not a force). */
export const SURGE_ADVECT = 1.3;
/** Idle dignity: gentle envelope breathing (±amp, period s) + slow per-
 * particle brightness shimmer (±amp) so the stream never sits dead still. */
export const BREATHE_AMP = 0.06;
export const BREATHE_PERIOD = 7;
export const SHIMMER_AMP = 0.04;

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
/** Ring tube thickness (particle jitter across the ring's circle) — halved in
 * round-2 for the igloo "crisp icy ring" read. */
export const RING_TUBE = 0.006;
/** Radial jitter amplitude of a ring particle around RING_RADIUS (fraction) —
 * tightened with the tube for crispness. */
export const RING_RADIAL_JITTER = 0.05;
/** Fraction of particles that are RING particles in healthy mode (broken
 * builds have zero rings — every particle is stream or spark). Round-2:
 * ~×2 the draft's density — with the halved tube the torus reads crisp. */
export const RING_FRACTION = 0.3;
/** Slow particle drift around each ring (rad/sec). */
export const RING_SPIN = 0.25;
/** Ring particles read slightly whiter than the stream (0..1 mix → COL_CORE);
 * the ignition flash pushes further toward white. */
export const RING_WHITE = 0.35;
/** Radial shockwave: ring radius expands 1 → 1+this at full ignition flash
 * (the flash envelope decays over ~0.5s → the visible ripple). */
export const RING_SHOCKWAVE = 0.25;
/** Stream width multiplier lost per ring passed (laminar tightening):
 * stepwise 1 → ~0.61 of the entry width after all three rings (round-2 spec:
 * 1→0.62 stepwise — the draft's 0.34 over-pinched the river). */
export const TIGHTEN_PER_RING = 0.13;
/** Extra spring gain near a ring (compute tier — the sim visibly snaps
 * particles laminar as they cross). */
export const RING_SPRING_GAIN = 2.2;
/** Gaussian sharpness of the ring-proximity window (in flow-t). */
export const RING_PROX_K = 260;

// --- The fracture (broken) --------------------------------------------------
/** Flow-t (≈ band-x fraction) where the stream fractures. */
export const FRACTURE_T = 0.55;
/** Smoothstep window past FRACTURE_T over which a particle detaches —
 * round-2: near-instant so the break reads CLEAN (the gap hides the blend). */
export const FRACTURE_WINDOW = 0.02;
/** CLEAN BREAK gap (flow-t width ≈ 4% of the band): alpha is zero between the
 * last coherent x and the debris field — a break, not mush. */
export const FRACTURE_GAP_T = 0.035;
/** Spatial offset (local units) the debris field starts past the fracture
 * point — matches the alpha gap so debris appears BEYOND the empty band. */
export const DEBRIS_GAP = 0.05;
/** Max alpha of detached debris (round-2 spec: 0.35 ceiling). */
export const DEBRIS_ALPHA_MAX = 0.35;
/** How far debris drifts from the fracture point (local units). */
export const DEBRIS_SPREAD = 0.55;
/** Alpha fade of fully-drifted debris (leaves a faint ember ghost of the
 * DEBRIS_ALPHA_MAX ceiling). */
export const DEBRIS_FADE = 0.75;
/** Wander acceleration on dispersing debris (compute extraAcc). */
export const DEBRIS_WANDER_ACC = 5.0;
/** SPARK BURST on surge death (round-2): this many dedicated role-2 particles
 * get a ~0.5s outward kick + bright flash from the fracture point, then die.
 * BUILD-TIME (baked into the meta buffer) — changing it needs a rebuild. */
export const SPARK_COUNT = 32;
/** How far a spark flies from the fracture point (local units, ×kick var). */
export const SPARK_REACH = 0.22;

// --- Surges -----------------------------------------------------------------
/** Seconds between automatic surges. */
export const SURGE_PERIOD_BROKEN = 4;
export const SURGE_PERIOD_HEALTHY = 6;
/** Surge head speed in flow-t units/sec (~2s to cross the whole band). */
export const SURGE_SPEED = 0.55;
/** Gaussian sharpness of the surge's brightness peak along flow-t (the sharp
 * LEADING edge; the trailing side gets the SURGE_TAIL gradient instead). */
export const SURGE_K = 240;
/** Trailing-gradient length behind the surge head (flow-t units ≈ 40px visual
 * on the section band) — the white-cyan head drags a decaying comet tail. */
export const SURGE_TAIL = 0.035;
/** Emissive gain at the surge peak (rides on top of the >1.0 floor). */
export const SURGE_GAIN = 2.2;
/** Fracture death-flash: decay damp rate + spatial sharpness + gain.
 * Decay 4.0 ≈ the spark burst's 0.5s life (round-2). */
export const FLASH_DECAY = 4.0;
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
/** Billboard size in device px (perspective-scaled in the shader; the round-2
 * CORE_SIZE_BOOST/FRINGE_SIZE_DROP falloff rides on top). */
export const NEURAL_POINT_SIZE = 7.0;
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
/** RECYCLE-STREAK FIX (round-2): when a stream particle's flow-t wraps, its
 * anchor teleports across the whole band; instead of a bright spring-flight
 * streak the kernel hard-snaps pos to the anchor (legal per the unified-force
 * offset-reset contract) — the wrap happens at zero alpha (EDGE_FADE_*), so
 * the recycle is invisible. Threshold > every legitimate excursion (pointer
 * bend ≈ 0.43, reveal lag ≈ 0.15). */
export const WRAP_SNAP_DIST = 0.6;
/** Sparks track a fast analytic burst anchor — snap on the (invisible)
 * re-park jump between flashes so no backwards streak leaks. */
export const SPARK_SNAP_DIST = 0.12;

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

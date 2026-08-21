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
 * fracture/rings; x and z are round-2 values, UNCHANGED).
 *
 * ROUND-3 VERTICAL WEAVE (2026-08-21 de-card §B.1): with the glass panes gone
 * the band is the WHOLE rows-stack background, so the y column is now MODE-
 * AUTHORED story, up to ±0.30 of band height:
 *   broken  → the river enters high and DIPS accelerating into the fracture
 *             (t=0.55 sits between c2/c3) — a river losing its course. The
 *             post-fracture points only show through the re-cohere tease,
 *             where the "lost" downward course is exactly the point.
 *   healthy → the river enters low and RISES confidently through the three
 *             guide rings (t 0.414/0.603/0.793 land on the ascent).
 */
export const STREAM_CTRL: Record<LatticeMode, [number, number, number][]> = {
  broken: [
    [-STREAM_SPAN_X, 0.18, 0.0],
    [-STREAM_SPAN_X / 2, 0.1, 0.05],
    [0.0, -0.08, -0.04],
    [STREAM_SPAN_X / 2, -0.27, 0.05],
    [STREAM_SPAN_X, -0.3, -0.02],
  ],
  healthy: [
    [-STREAM_SPAN_X, -0.28, 0.0],
    [-STREAM_SPAN_X / 2, -0.14, 0.04],
    [0.0, 0.0, -0.03],
    [STREAM_SPAN_X / 2, 0.15, 0.04],
    [STREAM_SPAN_X, 0.27, 0.0],
  ],
};

// --- The braid --------------------------------------------------------------
/** Strand sub-tubes revolving around the spline center — a braid, not a line. */
export const STRAND_COUNT = 4;
/** Strand orbit radius around the spline center (local y units; the group's
 * y-scale is the rect HEIGHT, so the braid's rest thickness ≈
 * 2·(STRAND_RADIUS + STRAND_THICKNESS)·h. Round-3 de-card rescale: the band
 * is now the FULL rows-stack background (~650–700px vs the round-2 ~500px
 * pane band), so the local radii come DOWN slightly to land the spec's ~44px
 * rest envelope: 2·0.0325·680 ≈ 44px. Live-tunable via uEnvelope. */
export const STRAND_RADIUS = 0.0215;
/** Per-particle jitter radius within a strand (thickness noise). */
export const STRAND_THICKNESS = 0.011;
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

// --- Round-3 "de-card" — row-reactive current (§B.3) -------------------------
/**
 * The DOM panes are gone; the two sections are typographic LEDGER ROWS and the
 * river owns the whole band. uRowGlow[3] (driven from the EXISTING
 * setHovered store value — no store changes) makes the stream visibly answer
 * the ignited row:
 *   broken  → a gaussian brightness + thickness swell in the stream zone
 *             nearest row i (rows stack top→bottom; the weave descends, so
 *             row 0 ↔ the early/high stream, row 2 ↔ the fracture itself)
 *             PLUS a bigger one-shot re-cohere tease at the fracture.
 *   healthy → the segment between ring i-1 and ring i TIGHTENS + brightens.
 */
/** Broken row-zone centers in flow-t (row 2 = the fracture itself). */
export const ROW_ZONE_T = [0.2, 0.38, FRACTURE_T] as const;
/** Gaussian sharpness of a broken row zone (flow-t): half-width ≈ 0.12. */
export const ROW_ZONE_K = 70;
/** Healthy segment 0 starts here (just inside the entry edge fade). */
export const ROW_SEG_START = 0.06;
/** Smooth half-feather of the healthy segment box windows (flow-t). */
export const ROW_SEG_FEATHER = 0.04;
/** Emissive boost at full row glow (rides on STREAM_EMISSIVE; localized). */
export const ROW_GAIN = 1.0;
/** Width response at full row glow: broken SWELLS +this; healthy TIGHTENS
 * −this·ROW_TIGHTEN_RATIO (a laminar squeeze, not a pinch-off). */
export const ROW_SWELL = 0.45;
export const ROW_TIGHTEN_RATIO = 0.7;
/** Damp rate of uRowGlow[i] toward its hover target (driver-side). */
export const ROW_GLOW_DAMP = 7.0;
/** Broken: a row ignition fires the re-cohere one-shot at THIS target instead
 * of 1 — >1 saturates dispFactor's uRecohere·0.9 term, so the debris fully
 * re-coheres for a beat before falling apart (the "bigger tease", §B.3). */
export const RECOHERE_ROW_BOOST = 1.45;

// --- Round-3 curl-noise micro-turbulence (§B.2, compute tier only) -----------
/** Strand-offset displacement gain (× CURL_SCALE local units at |curl|=1).
 * Small by design — filaments SHRED organically, the river keeps its course.
 * Static tier keeps the analytic twist (no curl). Live-tunable via uCurl. */
export const CURL_GAIN = 0.15;
/** Displacement scale = the braid cross-section radius (local units). */
export const CURL_SCALE = STRAND_RADIUS + STRAND_THICKNESS;
/** Two octaves: base + ~2.1× frequency at half amplitude (AT nebula texture). */
export const CURL_FREQ = 22;
export const CURL_FREQ_2 = 47;
export const CURL_AMP_2 = 0.5;
/** Field drift speeds (rad/s into the potential phases, per octave). */
export const CURL_SPEED = 0.55;
export const CURL_SPEED_2 = 0.9;

// --- Round-4 §B.1 — ring forcefield MEMBRANES (healthy; igloo §5) ------------
/**
 * Each guide ring gets a translucent banded-noise membrane disc the stream
 * visibly pierces — the igloo forcefield recipe VERBATIM (dossier
 * 2026-08-21-igloo-tunnel-mining.md §5, pretty-bundle L41583):
 *   n    = sin(noise·13 + phase − y·10)·0.5 + 0.5      (banded noise)
 *   mask = aastep(0.2, n) · (1 − n·0.75)
 *   a    = mask·base + pow(mask,5)·0.5 + radialRim·0.5
 * with procedural 2D value noise standing in for igloo's tWind texture (the
 * no-textures contract) and the view-dependent tilt dropped (our quads are
 * camera-facing per the round-4 brief). LIFE: seals 0→1 on first ignition,
 * ripples on surge passage (band phase ×3 + alpha +40% via uRingFlash),
 * bulges +8% on row hover (uRowGlow).
 */
/** Quad half-size ÷ ring radius — margin covers the shockwave + hover bulge. */
export const MEMBRANE_MARGIN = 1.35;
/** Value-noise frequency over the disc (vUv units where r=1 = ring radius). */
export const MEMBRANE_NOISE_SCALE = 2.2;
/** aastep threshold of the band mask (igloo: aastep(0.2, n)). */
export const MEMBRANE_BAND_THRESH = 0.2;
/** The `mask·base` weight of the igloo alpha sum. */
export const MEMBRANE_BAND_BASE = 0.5;
/** Peak membrane alpha — subtle glass, not a wall (~0.22 per the brief). */
export const MEMBRANE_ALPHA = 0.22;
/** Membrane emissive — just over the bloom floor so the glass haloes faintly;
 * the ignition flash pushes it further. */
export const MEMBRANE_EMISSIVE = 1.35;
/** Band phase speed at rest (rad/s — driver-integrated so the surge ripple
 * never runs the phase backwards). */
export const MEMBRANE_PHASE_SPEED = 0.8;
/** Extra phase-speed × per unit ring flash (2 → ×3 total at full flash —
 * the brief's "band phase speed ×3" ripple). */
export const MEMBRANE_RIPPLE_SPEED = 2.0;
/** Alpha boost at full ring flash (+40%). */
export const MEMBRANE_RIPPLE_ALPHA = 0.4;
/** Radial-mask expansion at full row hover (+8% — the bulge). */
export const MEMBRANE_BULGE = 0.08;
/** Damp rate of the 0→1 seal envelope once ring i first ignites (the igloo
 * ring-seal read: the disc grows closed while the ignition flash decays). */
export const MEMBRANE_SEAL_DAMP = 5.0;

// --- Round-4 §B.2 — fracture NEBULA (broken; igloo §4) -----------------------
/**
 * The break smokes: soft quads clustered at the fracture point running the
 * igloo tunnel-smoke recipe VERBATIM (dossier §4, L41275):
 *   uv.x += uv.y (shear → streaking wisps)
 *   v = noise(uv·3+d) · noise(uv·4+d) · noise(uv·6+d),  d = (−t, 0.7t), t slow
 *   alpha = pow(v,3)·3 × radial falloff
 * again with procedural value noise for tWind. Ember-tinted (COL_EMBER2 core →
 * transparent) with a faint cyan rim on the upstream side (the last healthy
 * light). Flares on surge death (uFlash), thins on the row-2 re-cohere tease.
 */
/** Per-quad [dx, dy, size, seed] in LOCAL units, offsets from the fracture
 * point (downstream-biased — the smoke hangs over the debris side). */
export const NEBULA_QUADS: readonly [number, number, number, number][] = [
  [0.045, -0.015, 0.34, 0.13],
  [-0.02, 0.035, 0.26, 0.57],
  [0.095, -0.065, 0.42, 0.86],
];
/** Resting alpha ceiling (≤0.3 per the brief; the flare rides above it). */
export const NEBULA_ALPHA = 0.3;
/** Ember emissive — sub-bloom by design (smoke, not signal). */
export const NEBULA_EMISSIVE = 1.0;
/** uv.x += uv.y·this (igloo shear = 1). */
export const NEBULA_SHEAR = 1.0;
/** Wisp drift speed at rest (igloo t·0.05). */
export const NEBULA_DRIFT_SPEED = 0.05;
/** Drift-speed kick per unit uFlash (+0.3 while the death-flash burns —
 * FLASH_DECAY 4.0 ≈ the brief's 0.5s window). */
export const NEBULA_DRIFT_KICK = 0.3;
/** Alpha × (1 + this·uFlash) — the surge-death FLARE (×1.8 at peak). */
export const NEBULA_FLARE = 0.8;
/** Alpha × (1 − this·uRowGlow[2]) — the re-cohere tease thins the smoke 30%. */
export const NEBULA_THIN = 0.3;
/** Cyan mix weight of the upstream rim. */
export const NEBULA_RIM_GAIN = 0.35;

// --- Round-4 §B.3 — scroll-velocity reactive river (both modes) --------------
/**
 * uScrollVel (0..1) = damped min(|scrollStore.velocity| / VEL_NORM, 1). The
 * brief said /3000, but this codebase's Lenis velocity is px/FRAME-ish
 * (heading-choreographer.tsx norms at 45, SignatureLine.tsx at ×0.01 = 100) —
 * /3000 would never register. 100 matches the SignatureLine comet precedent:
 * reading-speed scrolls stay imperceptible, a genuine flick saturates.
 */
export const VEL_NORM = 100;
/** Damp λ of uScrollVel toward the normalized target (brief: ~6). */
export const VEL_DAMP = 6;
/** Braid thickness envelope +25%·vel (the river swells while you scroll). */
export const VEL_SWELL = 0.25;
/** Streak stretch gain +60%·vel (faster scroll = longer light streaks). */
export const VEL_STRETCH = 0.6;
/** Flow speed +40%·vel — applied by INTEGRATING a separate flow clock
 * driver-side (uFlowTime += dt·(1 + this·vel)), never by scaling uTime in-
 * shader (that would jump every particle's phase when vel changes). */
export const VEL_FLOW = 0.4;
/** Curl-turbulence gain +30%·vel (compute tier). */
export const VEL_CURL = 0.3;
/** Debris wander amplitude/acceleration +20%·vel (broken). */
export const VEL_DEBRIS = 0.2;

// --- Round-3 depth-DOF illusion (§B.4) ---------------------------------------
/** Alpha multiplier at the FAR extreme of the z-bow (far = smaller/dimmer). */
export const DOF_FAR_DIM = 0.55;
/** Soft-disc inner edge at full NEAR softness (rest edge is 0.12 → a wider,
 * bokeh-like falloff on near particles; no postprocessing involved). */
export const DOF_SOFT_MIN = 0.03;
/** Extra size gain across the z range (rides on NEURAL_DEPTH_ATTEN). */
export const DOF_SIZE_GAIN = 0.6;

// --- Emissive / render (>1.0 selective-bloom contract) -----------------------
export const STREAM_EMISSIVE = 2.6;
export const RING_EMISSIVE = 3.0;
/** At-rest alpha of a stream particle disc. */
export const STREAM_ALPHA = 0.8;
/** Billboard size in device px (perspective-scaled in the shader; the round-2
 * CORE_SIZE_BOOST/FRINGE_SIZE_DROP falloff rides on top). Round-3: bumped
 * 7 → 8 so the same particle count keeps its fill density across the taller
 * rows-stack band + the vertical weave's longer arc. */
export const NEURAL_POINT_SIZE = 8.0;
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

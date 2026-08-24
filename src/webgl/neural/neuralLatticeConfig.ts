/**
 * NEURAL CONSTELLATION — shared LOCAL-space layout + look constants for the
 * WebGL island in NeuralLattice.tsx (2026-08-21 round-6 re-author; the file
 * name is kept so the store / Scene wiring stays untouched).
 *
 * ROUND-6 (owner: "prima erano fatte tipo a triangolo, non una linea dritta
 * in orizzontale"): the demoted signal-stream RIVER is gone. The band now
 * holds a LAYERED CONSTELLATION — the canonical feed-forward network diagram
 * made cinematic: 12 nodes in 5 layers reading left→right, 21 living edge
 * filaments braiding between them, a bright orbiting halo per node. Adjacent
 * layers are vertically offset so the edges TRIANGULATE — no horizontal
 * centerline exists anywhere ("under the stone" is dead). The crystal
 * (CrystalCluster) floats WITHIN the net; node positions are authored to
 * clear its silhouette (see the round-6 spec §4).
 *
 * ONE visual vocabulary, two configs:
 *   - "broken"  → the Problem section. Layers past the FRACTURE (t=0.62,
 *                 between the 3rd and 4th layer) are DEGRADED: edges fray
 *                 into ember debris, their far endpoints drift off-station,
 *                 and the input→output PULSE dies at the fracture with the
 *                 flash + spark burst + nebula. Hover re-coheres for a beat.
 *   - "healthy" → the ProductionGrade section. All edges intact; the three
 *                 MIDDLE layers are eval → trace → guardrail (membrane discs
 *                 at their centroids); the pulse traverses the whole net and
 *                 SURVIVES, flashing each middle layer's halos as it passes.
 *
 * COORDINATE FRAME (unchanged contract): the net lives in a CAMERA-LOCKED
 * group scaled to the section's `[data-lattice-anchor]` rect (w·k × h·k).
 * Everything here is authored in the group's LOCAL space — x in fractions of
 * the rect WIDTH, y/z in fractions of the rect HEIGHT, x → right, y → up.
 * NOTHING here is in document/world Y; the group transform maps local →
 * screen.
 *
 * REGISTRATION SPINE: the uC0..uC4 spline control points are now the five
 * LAYER CENTROIDS (derived below from the node table — STREAM_CTRL export
 * name kept so the build seam stays byte-identical). No particles ride the
 * spline any more; it only registers the membranes (streamCenter(RING_T[i]) =
 * middle-layer centroids), the fracture nebula + spark origin
 * (streamCenter(uFracture)), and the row attention windows.
 *
 * Node/edge data rides in uniformArrays (uNodePos/uNodeT/uEdgeA/uEdgeB) —
 * legal in any stage, zero storage-buffer / vertex-slot cost — so a resize
 * (or live re-authoring of the layout) is a uniform update, NO rebuild.
 *
 * ROUND-7 (2026-08-22, owner: "la luce che passa più frequente + continua a
 * renderle più belle"): faster SURGE_PERIOD_*, plus a constant AMBIENT
 * PACKET TRAFFIC layer (small bright beads forever traveling the edges,
 * dying at the fracture on broken, kissing the node halos on arrival) and a
 * beauty pass (per-edge mid-span brightness profile, per-layer cool→warm
 * cyan tint, halo core/breath/variance, amber ember tips). See the round-7
 * sections below; all shader-side, zero driver changes.
 */

/** The two constellation modes. */
export type LatticeMode = "broken" | "healthy";

/** Per-mode signal clusters — three middle layers, three pulse slots.
 * The neuralLatticeStore sizes its pulse arrays off this (contract kept). */
export const CLUSTER_COUNT = 3;

/** Brand signal ramp (FIXED white-cyan→cyan→blue — NO violet, ever).
 * The innermost filament radius reads white-hot, the body is brand cyan, the
 * fringe cools to blue and fades to transparent navy (additive over the navy
 * bg = transparency). Node halos read whiter than edges (RING_WHITE). */
export const COL_CORE = "#EAFBFF"; // white-cyan — halo cores + pulse head
export const COL_CYAN = "#3BE1FF"; // edge body
export const COL_BLUE = "#2A7FFF"; // edge fringe
/** Ember ramp the degraded side dims through (desaturated, sub-bloom). */
export const COL_EMBER = "#4A443E";
export const COL_EMBER2 = "#6B5546";

/** Total particles in the constellation on a full-tier desktop. */
export const NEURAL_PARTICLE_COUNT = 9000;
/**
 * Compact budget, selected when `tier === "lite"` (capable phones). Additive
 * fill is the real cost: 3,200 at DPR 1 ≈ one tenth the fill of 9,000 at
 * DPR 2. Same topology — the phone gets a thinner version of the same net.
 * Read via `useTierStore.getState()` in the BUILD path only, never as a
 * subscription inside the Canvas island (the R3F island commit wedge).
 */
export const NEURAL_PARTICLE_COUNT_COMPACT = 3200;

// --- The graph (round-6 constellation layout) --------------------------------
/**
 * 5 layers at these x (width fractions; slight overshoot past ±0.5 so the
 * input/output columns sit at the band edges), node counts [2,3,3,2,2] = 12.
 * Topological depth t = layerIndex/4 → layers at t = [0, .25, .5, .75, 1].
 * ALL flow-t-parameterized machinery (surge, flash, rows, width envelope,
 * fracture) reads THIS t — flow-t is network depth now, not band x.
 */
export const NODE_LAYER_X = [-0.42, -0.18, 0.06, 0.3, 0.52] as const;
/** Layer index per node (layer-major node numbering, both modes). */
export const NODE_LAYER = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4] as const;
export const NODE_COUNT = NODE_LAYER.length; // 12
/** Topological depth per node (= layer/4) — seeds the uNodeT uniformArray. */
export const NODE_T: readonly number[] = NODE_LAYER.map((l) => l / 4);

/**
 * Per-mode node positions [x, y, z] (local space, y/z in height fractions).
 * DETERMINISTIC — authored, not seeded. Adjacent layers are vertically offset
 * (y ∈ ±0.28, z ∈ ±0.12) so edges triangulate. ANTI-CORRIDOR RULE (the
 * owner's dead "linea dritta in orizzontale"): no two CONSECUTIVE edges may
 * run near-horizontal (<~9°) in the SAME direction — hull runs must tent
 * (up-then-down / down-then-up); re-check when re-authoring any y.
 * The per-node x jitter is also
 * authored: it steers node cores clear of the crystal silhouettes
 * (crystalConfig CRYSTAL_POS — broken (+0.17,−0.05), healthy (+0.22,+0.06);
 * clearance rule + the two deliberate exceptions documented in the round-6
 * spec §4). Live-tunable via the uNodePos uniformArray on the dev handle.
 */
export const NODES: Record<LatticeMode, [number, number, number][]> = {
  broken: [
    [-0.43, 0.2, -0.05],
    [-0.42, -0.14, 0.08],
    [-0.19, 0.27, 0.06],
    [-0.18, 0.02, -0.1],
    [-0.2, -0.24, 0.03],
    [0.03, 0.28, -0.08],
    [0.02, -0.04, 0.1],
    [0.04, -0.28, -0.03],
    [0.31, 0.22, -0.12],
    [0.3, -0.2, 0.09],
    [0.52, 0.1, 0.05],
    [0.53, -0.18, -0.08],
  ],
  healthy: [
    [-0.44, 0.16, 0.04],
    [-0.41, -0.2, -0.06],
    [-0.2, 0.26, -0.1],
    [-0.17, 0.01, 0.12],
    [-0.19, -0.26, -0.04],
    [0.05, 0.24, 0.08],
    [0.07, -0.02, -0.12],
    [0.04, -0.24, 0.02],
    [0.3, -0.27, -0.08],
    [0.34, 0.27, 0.1],
    [0.52, 0.14, -0.05],
    [0.53, -0.15, 0.06],
  ],
};

/**
 * Per-mode edges [fromNode, toNode] — each node feeds 2–3 nodes of the next
 * layer (bounded by a steepness taste cap; one long diagonal kept per mid-gap
 * for drama). 21 edges per mode. MIN edge length ≈ 0.22 local (layer Δx) —
 * the WRAP_SNAP_DIST guard below keys on this; keep any new edge longer.
 */
export const EDGES: Record<LatticeMode, [number, number][]> = {
  broken: [
    [0, 2], [0, 3], [0, 4], [1, 3], [1, 4],
    [2, 5], [2, 6], [3, 5], [3, 6], [3, 7], [4, 6], [4, 7],
    [5, 8], [5, 9], [6, 8], [6, 9], [7, 9],
    [8, 10], [8, 11], [9, 10], [9, 11],
  ],
  healthy: [
    [0, 2], [0, 3], [0, 4], [1, 3], [1, 4],
    [2, 5], [2, 6], [3, 5], [3, 6], [3, 7], [4, 6], [4, 7],
    [5, 8], [5, 9], [6, 8], [6, 9], [7, 8],
    [8, 10], [8, 11], [9, 10], [9, 11],
  ],
};

/** Layer centroids of a node table (the uC0..4 registration spine). */
function layerCentroids(
  nodes: [number, number, number][],
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let l = 0; l < NODE_LAYER_X.length; l++) {
    let x = 0, y = 0, z = 0, n = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      if (NODE_LAYER[i] !== l) continue;
      x += nodes[i][0];
      y += nodes[i][1];
      z += nodes[i][2];
      n++;
    }
    out.push([x / n, y / n, z / n]);
  }
  return out;
}

/**
 * The 5 spline control points = LAYER CENTROIDS (derived — export name/type
 * kept so the createNeuralFieldBuild seam stays byte-identical). Catmull-Rom
 * passes THROUGH control points at segment boundaries, so
 * streamCenter(RING_T[i]) lands exactly on middle-layer centroid i+1 — the
 * membrane discs re-register onto the layers with zero shader change.
 */
export const STREAM_CTRL: Record<LatticeMode, [number, number, number][]> = {
  broken: layerCentroids(NODES.broken),
  healthy: layerCentroids(NODES.healthy),
};

// --- Edge filaments ----------------------------------------------------------
/** Braided strands per EDGE (was 4 per river) — two thin living filaments. */
export const STRAND_COUNT = 2;
/** Strand orbit radius around the edge line (height fractions) — with the
 * thickness jitter the rest filament reads ~24px on a ~680px band. Thinner
 * than the round-3 river by design (21 edges share the fill budget). */
export const STRAND_RADIUS = 0.012;
/** Per-particle jitter radius within a strand (thickness noise). */
export const STRAND_THICKNESS = 0.006;
/** Full braid twists along ONE edge. */
export const BRAID_TURNS = 1.4;
/**
 * PHASE SEPARATION: distinct twist phases + thickness biases per strand.
 * FOUR entries kept (dev-handle uStrandPhase/uStrandThick contract) — only
 * the first STRAND_COUNT are read; a per-edge golden-angle offset decorrelates
 * edges on top.
 */
export const STRAND_PHASES = [0.0, 2.4, 3.9, 5.7] as const;
export const STRAND_THICK_BIAS = [1.3, 0.75, 1.05, 0.6] as const;
/** Per-strand twist-RATE multiplier = BASE + STEP·strandIndex. */
export const STRAND_RATE_BASE = 0.82;
export const STRAND_RATE_STEP = 0.12;
/** Base flow speed — cycles/sec a particle advances along ITS EDGE (an edge
 * is ~¼ of the old river, so per-edge cycles run a touch faster). */
export const FLOW_SPEED = 0.09;

// --- Silhouette --------------------------------------------------------------
/** Alpha ramp along per-edge s: fade-in/out at the filament TIPS — the tips
 * dissolve into the node halos, which also hides the flow-wrap recycle (a
 * particle wraps s at near-zero alpha on both ends). */
export const EDGE_FADE_IN = 0.12;
export const EDGE_FADE_OUT = 0.1;
/** Slight z-bow of the registration SPINE toward the camera at t=0.5 — lifts
 * the mid-net membranes/nebula slightly off the band plane. */
export const STREAM_Z_BOW = 0.05;
/** Radial size falloff: core particles up to this ×, fringe down to this ×. */
export const CORE_SIZE_BOOST = 1.6;
export const FRINGE_SIZE_DROP = 0.6;
/** Velocity-stretched sprites (AT streak look): total elongation =
 * 1 + min(|v|·GAIN, MAX). Static tier uses a mild fixed elongation along the
 * EDGE direction (STATIC_ELONG) plus the surge advection. */
export const STRETCH_GAIN = 1.5;
export const STRETCH_MAX = 2.0;
export const STATIC_ELONG = 0.28;
/** Analytic along-edge speed the pulse head adds (drives streaking even
 * though the surge itself is a brightness wave, not a force). */
export const SURGE_ADVECT = 1.3;
/** Idle dignity: gentle envelope breathing (±amp, period s) + slow per-
 * particle brightness shimmer (±amp) so the net never sits dead still. */
export const BREATHE_AMP = 0.06;
export const BREATHE_PERIOD = 7;
export const SHIMMER_AMP = 0.04;

// --- Middle layers (eval → trace → guardrail) --------------------------------
/**
 * The three MIDDLE layers' topological depth (layers 1/2/3 of 0..4). This is
 * the uRingFlash/uRingGlow/membrane registration: the driver's surge-crossing
 * logic flashes index i when the pulse crosses RING_T[i], node halos read
 * flash/glow index = nodeT·4−1 (gated to the middle layers), and the membrane
 * discs sit at streamCenter(RING_T[i]) = the layer centroids.
 */
export const RING_T = [0.25, 0.5, 0.75] as const;
/** Membrane disc radius (height fractions) — a LAYER PLANE now, sized to the
 * node spread (±0.28), not the old river cross-section. */
export const RING_RADIUS = 0.2;
/** Node halos read whiter than the edges (0..1 mix → COL_CORE); the ignition
 * flash pushes further toward white. */
export const RING_WHITE = 0.35;
/** Radial shockwave: halo radius expands 1 → 1+this at full ignition flash
 * (the flash envelope decays over ~0.5s → the visible ripple). */
export const RING_SHOCKWAVE = 0.25;
/** Edge width multiplier lost per middle layer passed (filaments discipline
 * stepwise 1 → ~0.61 through eval/trace/guardrail; healthy only). */
export const TIGHTEN_PER_RING = 0.13;
/** Extra spring gain near a middle layer (compute tier — the sim visibly
 * snaps filaments laminar as they cross a processing layer). */
export const RING_SPRING_GAIN = 2.2;
/** Gaussian sharpness of the layer-proximity window (in flow-t). */
export const RING_PROX_K = 260;

// --- Node halos (role 1 — was the guide-ring role) ---------------------------
/** Halo orbit radius (height fractions ≈ 22px on a 680px band) — the crisp
 * icy-ring read at node scale. Camera-facing: the x component is aspect-
 * corrected by uPlaneAspect in-shader (the group is anisotropically scaled). */
export const NODE_RADIUS = 0.034;
/** z jitter across the halo (a thin torus, not a flat washer). */
export const NODE_TUBE = 0.006;
/** Radial jitter fraction around NODE_RADIUS (some particles orbit inside —
 * a soft filled core under the crisp rim). */
export const NODE_RADIAL_JITTER = 0.35;
/** Halo particle orbit rate (rad/s, ×spinVar 0.6..1.4). */
export const NODE_SPIN = 0.6;
/** Fraction of particles that are NODE-HALO particles (both modes). */
export const NODE_FRACTION = 0.2;
/** Coherent drift reach of a DEGRADED node (broken, t past the fracture) —
 * whole-node displacement, so the far layers read as a net knocked off
 * station, not dissolved. uRecohere pulls it back. */
export const NODE_DRIFT = 0.07;
/** Tone/alpha degrade of a drifted node's halo (0..1 — ember mix + dim). */
export const NODE_DEGRADE = 0.55;

// --- The fracture (broken) ---------------------------------------------------
/** Topological depth where the net breaks — between the 3rd layer (t=0.5)
 * and the 4th (t=0.75): everything from the 4th layer on is degraded, and
 * the pulse dies before the guardrail layer ever lights. The spine puts
 * streamCenter(0.62) ≈ local (+0.16, −0.00) — AT the broken crystal
 * (+0.17, −0.05): the smoking break and the fractured stone are one event. */
export const FRACTURE_T = 0.62;
/** Smoothstep window past FRACTURE_T over which an edge particle detaches. */
export const FRACTURE_WINDOW = 0.03;
/** CLEAN BREAK gap (flow-t width): alpha is zero right past the fracture on
 * every crossing filament — a visible cut, not mush. */
export const FRACTURE_GAP_T = 0.03;
/** Small forward push past the break before the fray spreads (local units —
 * the frayed side visibly starts beyond the cut). */
export const DEBRIS_GAP = 0.02;
/** Max alpha of frayed/detached particles (ember ceiling). */
export const DEBRIS_ALPHA_MAX = 0.35;
/** How far frayed particles scatter OFF their edge line (local units) —
 * small by design: frayed edges must still read as edges gone wrong, with
 * the drifted endpoints carrying the "network degraded" story. */
export const DEBRIS_SPREAD = 0.13;
/** Alpha fade of fully-frayed particles (leaves a faint ember ghost). */
export const DEBRIS_FADE = 0.6;
/** Wander acceleration on dispersing particles (compute extraAcc). */
export const DEBRIS_WANDER_ACC = 5.0;
/** SPARK BURST on pulse death: this many dedicated role-2 particles get a
 * ~0.5s outward kick + bright flash from the fracture point, then die.
 * BUILD-TIME (baked into the meta buffer) — changing it needs a rebuild. */
export const SPARK_COUNT = 32;
/** How far a spark flies from the fracture point (local units, ×kick var). */
export const SPARK_REACH = 0.22;

// --- The pulse (surges) ------------------------------------------------------
/** Seconds between automatic pulses. ROUND-7 (owner: "la luce nelle reti
 * neurali che passa vorrei sia più frequente"): 4 → 2.4 / 6 → 3.5 — the big
 * traveling pulse fires ~1.7× more often on both modes. The head still takes
 * ~2s input→output (SURGE_SPEED), so on broken the death-flash + spark burst
 * now land roughly every 2.4s, keeping the fracture visibly ALIVE; the
 * healthy net re-lights its layers before the previous glow fully settles.
 * Ambient PACKET traffic (below) carries the between-pulse life. */
export const SURGE_PERIOD_BROKEN = 2.4;
export const SURGE_PERIOD_HEALTHY = 3.5;
/** Pulse head speed in flow-t units/sec (~2s input→output). The head sweeps
 * topological depth, so the net lights LAYER BY LAYER left→right. */
export const SURGE_SPEED = 0.55;
/** Gaussian sharpness of the pulse's brightness peak along flow-t. */
export const SURGE_K = 240;
/** Trailing-gradient length behind the pulse head (flow-t units). */
export const SURGE_TAIL = 0.035;
/** Emissive gain at the pulse peak (rides on top of the >1.0 floor). */
export const SURGE_GAIN = 2.2;
/** Fracture death-flash: decay damp rate + spatial sharpness + gain.
 * Decay 4.0 ≈ the spark burst's 0.5s life. */
export const FLASH_DECAY = 4.0;
export const FLASH_K = 500;
export const FLASH_GAIN = 3.0;

// --- Round-7 — AMBIENT PACKET TRAFFIC ----------------------------------------
/**
 * The big pulse every few seconds is not enough life for a network: small
 * bright PACKETS constantly travel the edges (owner round-7: "più frequente
 * ... continua a renderle più belle"). Entirely shader-side + uFlowTime
 * driven — zero driver changes, zero new buffers; identical on the compute
 * AND static/analytic tiers (a pure function of uniforms). PACKET_COUNT
 * staggered clocks per RECEIVING node (hash(targetNode, k) — every edge
 * terminating at a node rides its clock, so incoming beads CONVERGE and
 * land together) each cycle at ~PACKET_RATE Hz; a packet occupies
 * 1/PACKET_SPAN of its cycle traveling s 0→1 (source halo → target halo,
 * WITH the flow direction), so expected visible traffic = COUNT·(1/SPAN)
 * ≈ 0.4 packets/edge — the brief's calm-but-alive "~1 packet per 2–3 edges
 * at any instant". Crossing time = 1/(RATE·SPAN) ≈ 0.9s: clearly faster
 * than the ambient drift (~11s), clearly calmer than the surge head. On
 * broken, traffic NEVER crosses the fracture — a packet reaching it
 * sputters out (micro-spark flicker) and dies; the uRecohere hover tease
 * briefly lets traffic through (the same gate grammar as dispFactor/
 * nodeDrift). On healthy (and pre-fracture), the halo kiss runs the SAME
 * per-node clock gaussian-centred on the arrival phase, so a halo swells +
 * brightens exactly as its beads land (causally, not just statistically;
 * the unfed input layer never kisses).
 * RATE/WIDTH/GAIN are live-tunable (uPacketRate/uPacketWidth/uPacketGain on
 * the dev-handle uniforms bag); the rest are shader-baked constants.
 */
/** Staggered packet clocks per RECEIVING node (shared by its incoming
 * edges AND its halo kiss — the arrival-correlation contract) —
 * BUILD-TIME shader unroll count. */
export const PACKET_COUNT = 2;
/** Packet clock rate (cycles/sec, ×0.75..1.25 per-packet hash variance).
 * Mean inter-packet interval per edge ≈ 1/(RATE·COUNT) ≈ 2.3s. */
export const PACKET_RATE = 0.22;
/** A packet travels its edge in 1/SPAN of the cycle (duty cycle — the rest
 * of the cycle the packet is off-edge and invisible). */
export const PACKET_SPAN = 5;
/** Gaussian half-width of the packet highlight along per-edge s (~13% of an
 * edge ≈ a ~15px bright bead on a 680px band). */
export const PACKET_WIDTH = 0.06;
/** Peak emissive gain: ×(1 + GAIN) at the packet center = ×2.2 — above the
 * >1.0 bloom floor, so packets BLOOM like little signals. */
export const PACKET_GAIN = 1.2;
/** Size swell at the packet center (rides beside the surge's 0.45). */
export const PACKET_SIZE = 0.3;
/** Tone push toward COL_CORE (white-cyan) at the packet center. */
export const PACKET_WHITE = 0.45;
/** Halo radius swell at a node-kiss peak (a packet "arriving"). */
export const PACKET_NODE_SWELL = 0.12;
/** Halo emissive gain at a node-kiss peak (subtler than an ignition flash). */
export const PACKET_NODE_GAIN = 0.5;
/** Kiss gaussian half-width in cycle units (~0.4s swell centred on the
 * bead's arrival phase, 1/PACKET_SPAN, at the mean rate). */
export const PACKET_KISS_WIDTH = 0.05;
/** Micro-spark sputter rate (rad/s of the flicker sine) where a packet dies
 * into the fracture (broken). */
export const PACKET_FLICKER_HZ = 43;

// --- Round-7 — beauty pass (taste constants) ---------------------------------
/** Per-edge brightness profile: emissive ×(1−this/2) at the tips rising to
 * ×(1+this/2) mid-span — filaments dim INTO the node halos and carry their
 * light in the middle, so each edge reads as a strand of light, not a bar.
 * Floor check: 2.1·0.85 ≈ 1.79 keeps the >1.0 bloom contract at the tips. */
export const EDGE_MID_BRIGHT = 0.3;
/** Per-layer tint within the navy→cyan family (NO violet): input layers run
 * COOLER (toward COL_BLUE), output layers WARMER-cyan (toward COL_CORE).
 * Max mixes at the extreme layers (t=0 / t=1). */
export const LAYER_TINT_COOL = 0.35;
export const LAYER_TINT_WARM = 0.22;
/** Halo quality: per-node size variance (±this/2 around 1), a slow radius
 * breath, a whiter CRISP core (inner-fill particles) and a softer fringe. */
export const HALO_SIZE_VAR = 0.3;
export const HALO_BREATH_AMP = 0.045;
export const HALO_BREATH_RATE = 0.55;
export const HALO_CORE_WHITE = 0.22;
export const HALO_FRINGE_SOFT = 0.25;
/** Fray embers warm toward amber at the VERY tips of the frayed side (the
 * existing failure tone, one step warmer — still desaturated, sub-bloom). */
export const COL_EMBER_TIP = "#8A5F3E";
/** How hard the tip-warm ramp bites (smoothstep 0.6→1 of fray progress ×this). */
export const EMBER_TIP_MIX = 0.75;

// --- Layer ignition / hover --------------------------------------------------
/** Emissive gain of a middle layer's ignition flash (bumpCluster / pulse
 * crossing) on its node halos. */
export const RING_FLASH_GAIN = 2.4;
/** Hovered layer's halo glow target (row i hover → layer i+1 flares). */
export const RING_GLOW_FLARE = 1.9;
/** Non-hovered middle layers while one is hovered (recede, never dark). */
export const RING_GLOW_DIM = 0.85;
/** Damp rate of the per-layer glow toward its hover target. */
export const RING_GLOW_DAMP = 7.0;
/** Broken hover tease — frayed edges briefly re-connect and drifted nodes
 * pull back on station, then fall apart again. Attack/decay damp rates. */
export const RECOHERE_ATTACK = 14.0;
export const RECOHERE_DECAY = 1.6;

// --- Row-reactive attention (uRowGlow) ---------------------------------------
/**
 * uRowGlow[3] (driven from the DOM ledger rows' setHovered) brightens a
 * REGION of the net:
 *   broken  → gaussian over flow-t at ROW_ZONE_T[i]: input layers / the mid
 *             net / the FRACTURE ZONE (row 2 = the fracture itself, which
 *             also thins the nebula) + the bigger re-cohere tease.
 *   healthy → gaussian at RING_T[i]: row i's attention attaches to layer
 *             i+1's nodes and the adjacent edge halves (eval → trace →
 *             guardrail).
 */
export const ROW_ZONE_T = [0.125, 0.4, FRACTURE_T] as const;
/** Gaussian sharpness of a broken row zone (flow-t): half-width ≈ 0.1. */
export const ROW_ZONE_K = 70;
/** Gaussian sharpness of a healthy LAYER zone (half-width ≈ 0.09 — a layer
 * plus the near halves of its edges). */
export const ROW_LAYER_K = 90;
/** Emissive boost at full row glow (rides on STREAM_EMISSIVE; localized). */
export const ROW_GAIN = 1.0;
/** Width response at full row glow: broken SWELLS +this; healthy TIGHTENS
 * −this·ROW_TIGHTEN_RATIO (a laminar squeeze, not a pinch-off). */
export const ROW_SWELL = 0.45;
export const ROW_TIGHTEN_RATIO = 0.7;
/** Damp rate of uRowGlow[i] toward its hover target (driver-side). */
export const ROW_GLOW_DAMP = 7.0;
/** Broken: a row ignition fires the re-cohere one-shot at THIS target instead
 * of 1 — >1 saturates the shader's uRecohere·0.9 term, so the frayed edges
 * fully re-connect for a beat before falling apart again. */
export const RECOHERE_ROW_BOOST = 1.45;

// --- Curl micro-turbulence (compute tier only) -------------------------------
/** Strand-offset displacement gain (× CURL_SCALE local units at |curl|=1).
 * Small by design — filaments SHRED organically, the edges keep their course.
 * Static tier keeps the analytic twist (no curl). Live-tunable via uCurl. */
export const CURL_GAIN = 0.15;
/** Displacement scale = the filament cross-section radius (local units). */
export const CURL_SCALE = STRAND_RADIUS + STRAND_THICKNESS;
/** Two octaves: base + ~2.1× frequency at half amplitude. */
export const CURL_FREQ = 22;
export const CURL_FREQ_2 = 47;
export const CURL_AMP_2 = 0.5;
/** Field drift speeds (rad/s into the potential phases, per octave). */
export const CURL_SPEED = 0.55;
export const CURL_SPEED_2 = 0.9;

// --- Round-4 §B.1 — layer MEMBRANES (healthy; igloo §5) ----------------------
/**
 * Each MIDDLE LAYER gets a translucent banded-noise membrane disc at its
 * centroid — the processing plane the filaments visibly pierce (igloo
 * forcefield recipe verbatim; see the round-4 dossier). Position derives from
 * the SAME streamCenter/RING_T math as ever — with the centroid spine the
 * discs land on the layers for free. Seal (0→1 on first ignition), ripple
 * (uRingFlash) and bulge (uRowGlow) are all uniform-driven.
 */
/** Quad half-size ÷ disc radius — margin covers the ripple + hover bulge. */
export const MEMBRANE_MARGIN = 1.35;
/** Value-noise frequency over the disc (vUv units where r=1 = disc radius) —
 * raised with the round-6 disc size so the bands stay fine. */
export const MEMBRANE_NOISE_SCALE = 3.0;
/** aastep threshold of the band mask (igloo: aastep(0.2, n)). */
export const MEMBRANE_BAND_THRESH = 0.2;
/** The `mask·base` weight of the igloo alpha sum. */
export const MEMBRANE_BAND_BASE = 0.5;
/** Peak membrane alpha — subtle glass, not a wall (round-6: eased 0.22 →
 * 0.18 for the larger layer-plane discs). */
export const MEMBRANE_ALPHA = 0.18;
/** Membrane emissive — just over the bloom floor so the glass haloes
 * faintly; the ignition flash pushes it further. */
export const MEMBRANE_EMISSIVE = 1.35;
/** Band phase speed at rest (rad/s — driver-integrated so the pulse ripple
 * never runs the phase backwards). */
export const MEMBRANE_PHASE_SPEED = 0.8;
/** Extra phase-speed × per unit layer flash (2 → ×3 total at full flash). */
export const MEMBRANE_RIPPLE_SPEED = 2.0;
/** Alpha boost at full layer flash (+40%). */
export const MEMBRANE_RIPPLE_ALPHA = 0.4;
/** Radial-mask expansion at full row hover (+8% — the bulge). */
export const MEMBRANE_BULGE = 0.08;
/** Damp rate of the 0→1 seal envelope once layer i first ignites. */
export const MEMBRANE_SEAL_DAMP = 5.0;

// --- Round-4 §B.2 — fracture NEBULA (broken; igloo §4) -----------------------
/**
 * The break smokes: soft quads clustered at streamCenter(uFracture) — which
 * the round-6 spine puts AT the broken crystal, so the smoke wraps the
 * fractured stone (intentional; spec §4). Igloo tunnel-smoke recipe verbatim.
 * Flares on pulse death (uFlash), thins on the row-2 re-cohere tease.
 */
/** Per-quad [dx, dy, size, seed] in LOCAL units, offsets from the fracture
 * point (downstream-biased — the smoke hangs over the degraded side). */
export const NEBULA_QUADS: readonly [number, number, number, number][] = [
  [0.045, -0.015, 0.34, 0.13],
  [-0.02, 0.035, 0.26, 0.57],
  [0.095, -0.065, 0.42, 0.86],
];
/** Resting alpha ceiling (≤0.3; the flare rides above it). */
export const NEBULA_ALPHA = 0.3;
/** Ember emissive — sub-bloom by design (smoke, not signal). */
export const NEBULA_EMISSIVE = 1.0;
/** uv.x += uv.y·this (igloo shear = 1). */
export const NEBULA_SHEAR = 1.0;
/** Wisp drift speed at rest (igloo t·0.05). */
export const NEBULA_DRIFT_SPEED = 0.05;
/** Drift-speed kick per unit uFlash (+0.3 while the death-flash burns). */
export const NEBULA_DRIFT_KICK = 0.3;
/** Alpha × (1 + this·uFlash) — the pulse-death FLARE (×1.8 at peak). */
export const NEBULA_FLARE = 0.8;
/** Alpha × (1 − this·uRowGlow[2]) — the re-cohere tease thins the smoke. */
export const NEBULA_THIN = 0.3;
/** Cyan mix weight of the upstream rim. */
export const NEBULA_RIM_GAIN = 0.35;

// --- Round-4 §B.3 — scroll-velocity reactive net (both modes) ----------------
/**
 * uScrollVel (0..1) = damped min(|scrollStore.velocity| / VEL_NORM, 1). This
 * codebase's Lenis velocity is px/frame-ish; 100 matches the SignatureLine
 * comet precedent: reading-speed scrolls stay imperceptible, a genuine flick
 * saturates.
 */
export const VEL_NORM = 100;
/** Damp λ of uScrollVel toward the normalized target. */
export const VEL_DAMP = 6;
/** Filament thickness envelope +25%·vel (the net swells while you scroll). */
export const VEL_SWELL = 0.25;
/** Streak stretch gain +60%·vel (faster scroll = longer light streaks). */
export const VEL_STRETCH = 0.6;
/** Flow speed +40%·vel — applied by INTEGRATING a separate flow clock
 * driver-side (uFlowTime += dt·(1 + this·vel)), never by scaling uTime in-
 * shader (that would jump every particle's phase when vel changes). */
export const VEL_FLOW = 0.4;
/** Curl-turbulence gain +30%·vel (compute tier). */
export const VEL_CURL = 0.3;
/** Fray/debris wander amplitude/acceleration +20%·vel (broken). */
export const VEL_DEBRIS = 0.2;

// --- Depth-DOF illusion ------------------------------------------------------
/** Alpha multiplier at the FAR extreme of the z range (far = smaller/dimmer). */
export const DOF_FAR_DIM = 0.55;
/** Soft-disc inner edge at full NEAR softness (bokeh-like falloff on near
 * particles; no postprocessing involved). */
export const DOF_SOFT_MIN = 0.03;
/** Extra size gain across the z range (rides on NEURAL_DEPTH_ATTEN). */
export const DOF_SIZE_GAIN = 0.6;

// --- Emissive / render (>1.0 selective-bloom contract) -----------------------
/** The crystal cluster stays the band's centerpiece (round-5 demotion
 * numbers kept): the net glows over the bloom floor but never competes with
 * the crystal's ignition rim. Live-tunable via the dev handle. */
export const STREAM_EMISSIVE = 2.1;
export const RING_EMISSIVE = 3.0;
/** At-rest alpha of an edge-particle disc. */
export const STREAM_ALPHA = 0.65;
/** Billboard size in device px (perspective-scaled in the shader; the
 * CORE_SIZE_BOOST/FRINGE_SIZE_DROP falloff rides on top). */
export const NEURAL_POINT_SIZE = 7.0;
/** Node-halo particles read slightly denser. */
export const RING_POINT_SIZE_BOOST = 1.3;
/** Depth size/brightness attenuation keyed on local z (aerial depth cue). */
export const NEURAL_DEPTH_ATTEN = 0.5;
/** Local z half-range the depth cue normalizes over (round-6: widened for
 * the node table's ±0.12 authored depth). */
export const DEPTH_Z_RANGE = 0.16;

// --- Sim (compute tier) ------------------------------------------------------
export const NEURAL_SPRING = 60;
/** ζ = DAMPING / (2·√SPRING) ≈ 0.55 — settles cleanly, no buzz. */
export const NEURAL_DAMPING = 8.5;
export const NEURAL_MAX_SPEED = 8;
/** RECYCLE-STREAK FIX: when an edge particle's flow-s wraps, its anchor
 * teleports ONE EDGE LENGTH (min ≈ 0.22 local — layer Δx; see EDGES). The
 * kernel hard-snaps pos to the anchor past this threshold, and the wrap
 * happens inside the EDGE_FADE tips (near-zero alpha). Must stay BELOW the
 * min edge length and ABOVE every legitimate excursion: reveal lag ≈ 0.15,
 * pointer bend ≈ 0.13 (POINTER_PUSH/RADIUS were reduced for exactly this),
 * curl ≈ 0.005. */
export const WRAP_SNAP_DIST = 0.17;
/** Sparks track a fast analytic burst anchor — snap on the (invisible)
 * re-park jump between flashes so no backwards streak leaks. */
export const SPARK_SNAP_DIST = 0.12;

// --- Pointer bend (compute tier; existing unified force model) ---------------
/** Radial repulsion strength — the cursor locally bends nearby filaments.
 * Round-6: reduced from the river's 26/0.22 so the max bend (~0.13) stays
 * under WRAP_SNAP_DIST (see above). */
export const POINTER_PUSH = 12;
/** Influence radius (local units — anisotropic with the rect scale, fine). */
export const POINTER_RADIUS = 0.14;

// --- Reveal seed cloud --------------------------------------------------------
export const SEED_SCATTER_XY = 0.95;
export const SEED_SCATTER_Z = 0.7;

// --- Whole-group life (subtle — the net is layout-registered) ----------------
export const NEURAL_PARALLAX = 0.06;
export const NEURAL_AUTO_ORBIT = 0.03;
export const NEURAL_ORBIT_FREQ_Y = 0.18;
export const NEURAL_ORBIT_FREQ_X = 0.13;
export const NEURAL_Z_BREATHE = 0.015;
/** group.scale.z = rect-height·k · this factor (honest depth for the net). */
export const NEURAL_DEPTH_SCALE_FACTOR = 1.0;

/**
 * Shared LOCAL-space layout + look constants for the NeuralLattice WebGL island
 * (FIX 3 — the unified neural-lattice that replaces the Problem section's
 * IncidentConsole and the ProductionGrade section's three file panels).
 *
 * ONE visual vocabulary, two configs:
 *   - "broken"  → the Problem section. Three pathways through the lattice that
 *                 go dark / where a signal packet dies (the 3 failure modes).
 *   - "healthy" → the ProductionGrade section. Three clusters that pulse in
 *                 sequence (eval baseline → trace propagation → guardrail clamp).
 *
 * COORDINATE FRAME (mirrors linkedParticlesConfig / CompliancePipeline3D): the
 * lattice is a CAMERA-LOCKED group scaled to the section's right-column rect
 * (w·k × h·k). Everything here is authored in the group's LOCAL space — a
 * unit-ish rect roughly [-0.5,0.5] × [-0.5,0.5]. NOTHING here is in
 * document/world Y (no scroll fraction); the group transform maps local → screen.
 *
 * The DOM copy (getFailures / getArtifacts) stays the legible, accessible,
 * selectable layer on every tier; the lattice is a subordinate bloomed echo
 * behind it (renderOrder -1), so node counts are modest and reduced on lite.
 */
import * as THREE from "three";

/** The two lattice modes. */
export type LatticeMode = "broken" | "healthy";

/** Three columns: input → hidden → output (the classic feed-forward graph). */
export const LAYER_COUNT = 3;
/** Per-mode "pathways"/clusters — both surfaces argue three things. */
export const CLUSTER_COUNT = 3;

/** Brand signal ramp endpoints (FIXED cyan→blue — NO hue cycling). */
export const COL_CYAN = "#3BE1FF"; // --accent, input side.
export const COL_VIOLET = "#2A7FFF"; // name kept; value now blue — --accent-2, output side.
/** Desaturated "dead" tone a broken pathway decays toward. */
export const COL_DEAD = "#2A3142";

/**
 * HDR emissive multiplier (>1.0) so the existing selective bloom (PostFXNodes /
 * PostFX, luminanceThreshold ≈ 1.0, toneMapped:false) catches ONLY the lattice
 * nodes/edges and not the navy DOM behind. Kept modest so the halo never rings
 * the DOM copy above the canvas.
 */
export const NODE_EMISSIVE = 2.4;
export const EDGE_EMISSIVE = 1.6;
export const PACKET_EMISSIVE = 3.0;

/** Node billboard size in LOCAL units (a small disc). */
export const NODE_SIZE = 0.018;
/** Signal-packet billboard size in LOCAL units (slightly larger than a node). */
export const PACKET_SIZE = 0.024;

/** Seconds for one signal packet to traverse a pathway (input→output). */
export const PACKET_PERIOD = 2.6;
/** Stagger between the three pathways' packets so they fire in sequence. */
export const PACKET_STAGGER = 0.55;

/** Node count per tier (sum across all clusters/layers). lite is leaner. */
export const NODE_COUNT_BY_TIER: Record<string, number> = {
  full: 27, // 3 clusters × 3 layers × 3 nodes
  lite: 27, // same graph; lite never mounts WebGL here (SVG fallback), kept for parity
};

/**
 * A single lattice node in LOCAL space.
 *   - layer:   0 input, 1 hidden, 2 output
 *   - cluster: 0..2 which pathway/failure-mode it belongs to
 *   - pos:     LOCAL xy (z = small per-node depth jitter for parallax)
 */
export interface LatticeNode {
  layer: number;
  cluster: number;
  pos: THREE.Vector3;
}

/** A directed edge between two node indices (input→hidden, hidden→output). */
export interface LatticeEdge {
  from: number;
  to: number;
  cluster: number;
  /** Parametric arc the signal packet rides (a.pos → b.pos). */
  a: THREE.Vector3;
  b: THREE.Vector3;
}

export interface LatticeLayout {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  /**
   * For each cluster, the index of the edge whose midpoint is the "break"
   * point in broken mode (where the packet dies and downstream goes dark).
   * In healthy mode every edge stays lit; this is ignored.
   */
  breakEdgeByCluster: number[];
}

/**
 * Build the shared lattice layout in LOCAL space. Three horizontal layers
 * (x = -0.34, 0, 0.34), three vertical clusters (y = +0.3, 0, -0.3), three
 * nodes fanned slightly within each layer/cluster cell. Deterministic — no
 * RNG — so the geometry is stable across rebuilds and matches the SVG fallback.
 */
export function buildLatticeLayout(): LatticeLayout {
  const nodes: LatticeNode[] = [];
  const edges: LatticeEdge[] = [];

  const LAYER_X = [-0.34, 0, 0.34];
  const CLUSTER_Y = [0.3, 0, -0.3];
  // Three nodes per (layer, cluster) cell, fanned vertically inside the cell.
  const FAN = [-0.06, 0, 0.06];

  // Index nodes by [cluster][layer][i] for edge wiring.
  const idx: number[][][] = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    idx[c] = [];
    for (let l = 0; l < LAYER_COUNT; l++) {
      idx[c][l] = [];
      for (let i = 0; i < FAN.length; i++) {
        const x = LAYER_X[l];
        const y = CLUSTER_Y[c] + FAN[i];
        // tiny per-node depth jitter for a touch of parallax under the line.
        const z = (((c * 7 + l * 3 + i) % 5) - 2) * 0.012;
        nodes.push({
          layer: l,
          cluster: c,
          pos: new THREE.Vector3(x, y, z),
        });
        idx[c][l][i] = nodes.length - 1;
      }
    }
  }

  // Wire a feed-forward subset (not fully dense — keep it readable): each node
  // in layer l connects to the SAME fan index + its neighbours in layer l+1.
  const breakEdgeByCluster: number[] = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    let firstHiddenEdge = -1;
    for (let l = 0; l < LAYER_COUNT - 1; l++) {
      for (let i = 0; i < FAN.length; i++) {
        const from = idx[c][l][i];
        // connect to fan i and its vertical neighbours (clamped).
        for (const dj of [-1, 0, 1]) {
          const j = i + dj;
          if (j < 0 || j >= FAN.length) continue;
          // thin the cross-links so the graph reads as a lattice, not a mesh.
          if (dj !== 0 && (i + j) % 2 === 1) continue;
          const to = idx[c][l + 1][j];
          edges.push({
            from,
            to,
            cluster: c,
            a: nodes[from].pos.clone(),
            b: nodes[to].pos.clone(),
          });
          // The break point for broken mode is the FIRST hidden→output edge of
          // the cluster's central node (where the packet "dies").
          if (l === 1 && i === 1 && dj === 0 && firstHiddenEdge < 0) {
            firstHiddenEdge = edges.length - 1;
          }
        }
      }
    }
    breakEdgeByCluster.push(firstHiddenEdge);
  }

  return { nodes, edges, breakEdgeByCluster };
}

// ===========================================================================
// FIX 3 v4 — RECONCEPTION: 3 card-anchored 3D hubs + hover-to-open
// ===========================================================================
// The v2/v3 dense-cloud topology (18/45 nodes tumbling in a blob) is superseded
// by a purposeful, layout-wired 3-HUB graph. The network is EXACTLY 3 nodes —
// one per card (1:1) — each a dense glowing particle ORB anchored to its card's
// measured screen position (fed in as uniforms uHub0/1/2). Arcs wire the hubs as
// a triangle (0→1, 1→2, 0→2). The 3D reads via: real-z SPHERE hubs that
// self-rotate, z-layered hub depths, depth-bowed Bézier arcs, and a subtle whole-
// group pointer parallax + auto-orbit (NOT free tumble — hubs stay pinned to
// their cards). Hover a card → its hub flares + incident arcs converge; others
// dim. All deterministic (index-hashed, no RNG); homes are built IN-SHADER from
// the uHub uniforms so resize updates uniforms only — NO buffer rebuild.

/** Number of hubs = number of cards per section (1:1). */
export const HUB_COUNT = 3;

/** Total particles in the field (single full tier that mounts the island).
 * v4: ~9000 across 3 hubs + 3 arcs — dense enough that each hub reads as a
 * distinct bright orb and each arc as a thin travelling-signal stream. */
export const NEURAL_PARTICLE_COUNT = 9000;
/** Fraction of particles that are NODE/hub particles (dense glowing orbs); the
 * rest are FLOW particles that ride the arcs. v4: ~0.55 node / ~0.45 flow so the
 * 3 hubs dominate as the structure and the arcs read as thin signal streams. */
export const NODE_FRACTION = 0.55;

// --- v4 hub default LOCAL positions + z-layering ----------------------------
/** Distinct LOCAL z-depths of the 3 hubs (STRONG-3D: front-to-back layering so
 * perspective + parallax make the network read as 3D, not flat). Indexed by hub.
 * Hub0 back, hub1 front, hub2 mid — derived from card order. */
export const HUB_Z = [-0.18, 0.12, -0.06] as const;
/** Total z span of the network (max − min hub z) for the cyan→blue depthT. */
export const HUB_Z_SPAN = 0.3; // (0.12 − (−0.18))
/** Min hub z (the cyan/back end of the depth gradient). */
export const HUB_Z_MIN = -0.18;
/** Fallback LOCAL xy for each hub when a [data-lattice-node] marker anchor is
 * missing. v5: the markers now live INSIDE the network centerpiece (not on the
 * cards), so the defaults read as a 3D GRAPH (a triangle/sweep, NOT collinear
 * with a card list): node 0 upper-left (back), node 1 lower-center (front),
 * node 2 upper-right (mid). z from HUB_Z. In local [-0.5,0.5] space. */
export const HUB_DEFAULT_XY: readonly [number, number][] = [
  [-0.32, 0.22],
  [0.04, -0.26],
  [0.34, 0.16],
];

/** Brand depth-gradient endpoints retained for in-shader mix (alias of the
 * COL_CYAN/COL_VIOLET above; depthT spans HUB_Z_MIN..HUB_Z_MIN+HUB_Z_SPAN).
 * Kept here so the LAYER_Z names below still resolve for any stale importer. */
export const LAYER_Z = HUB_Z;
/** @deprecated v4 uses HUB_Z_SPAN; alias kept so neuralFieldCompute imports
 * resolve without a churn (mapped to the hub depth span). */
export const LAYER_Z_SPAN = HUB_Z_SPAN;

/** Hub ORB radius in LOCAL units — particles distributed in a real-z SPHERE of
 * this radius (a clear glowing volume, not a flat disc). v4. */
export const HUB_SPHERE_RADIUS = 0.085;
/** Small extra gaussian jitter on top of the sphere shell so the orb is dense
 * (filled) rather than a hollow shell. */
export const NODE_JITTER = 0.022;

/** Base flow speed (cycles/sec along an arc) before per-hub modulation. */
export const FLOW_SPEED = 0.22;

// --- v4 arc geometry --------------------------------------------------------
/** Depth-bow of each arc's Bézier control point TOWARD the camera (+z, local
 * units). With the hubs' differing z this makes arcs read as clearly 3D curves,
 * not flat lines. STRONG-3D. */
export const NEURAL_ARC_BOW = 0.22;
/** Perpendicular jitter of flow particles off the Bézier (stream thickness).
 * Kept thin so each arc reads as a line, not a haze. */
export const FLOW_JITTER = 0.008;

// --- v4 hub→arc wiring (triangle) -------------------------------------------
/** The 3 arcs wiring the hubs as a triangle: [fromHub, toHub]. A connected
 * chain (0→1, 1→2) plus the span (0→2). */
export const HUB_ARCS: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

// --- assembly spring (particles must visibly ASSEMBLE onto the structure) ---
/** Spring stiffness pulling each particle toward its home/anchor. */
export const NEURAL_SPRING = 52;
/** Velocity damping. Tuned with NEURAL_SPRING for a damping ratio ζ≈0.55
 * (ζ = DAMPING / (2·√SPRING)); 8 / (2·√52) ≈ 0.55 → settles cleanly, no buzz. */
export const NEURAL_DAMPING = 8.0;
/** Max per-particle speed clamp (sim stability). */
export const NEURAL_MAX_SPEED = 8;

// --- broken-mode dispersal --------------------------------------------------
/** Outward dispersal distance scale for dead flow particles (broken mode).
 * v6: 1.4 → 1.8 — wider scatter so the severed span carves a visible gap. */
export const DISPERSE_SPREAD = 1.8;
/** Bézier parametric point past which a DEAD flow particle detaches.
 * v6: 0.5 → 0.46 — the dark/severed half occupies more of the arc → reads severed. */
export const BREAK_T = 0.46;
/** Width of the detach smoothstep window past BREAK_T (crisper severance edge).
 * v6: replaces the inline 0.12 at ALL THREE call sites (anchorNode flow dispersal,
 * compute simulate spring-weaken, compute/static render vAlive). */
export const DISPERSE_WINDOW = 0.08;
/** Resting dispersal floor (broken only) so the dead span reads SEVERED even with
 * NO in-view pulse. v6: replaces the inline 0.2 in NeuralLattice's disperseTarget.
 * Kept modest (0.38) so the dead arc reads severed-but-present, not blank. */
export const DISPERSE_BASELINE = 0.38;
/** How hard a fully-dispersed dead particle fades out (alpha *= 1 − disp·FADE).
 * v6: 0.9 leaves a ~10% ghost at the fracture so the severed line still hints
 * rather than hard-cutting. Replaces the inline 0.85 (compute) + brings the
 * static branch — which had NO fade at all — to parity. */
export const DISPERSE_FADE = 0.9;

// --- v3 travelling signal (a bright packet visibly runs hub→hub) ------------
/** Gaussian sharpness of the moving brightness peak along each arc. Higher K →
 * tighter, more defined packet. `signal = exp(-SIGNAL_K · fract(t − headT)²)`. */
export const SIGNAL_K = 26.0;
/** Baseline brightness floor of a flow particle OUTSIDE the travelling packet
 * (so the arc is faintly drawn everywhere; the packet is the bright peak ON
 * TOP). Total flow brightness factor = SIGNAL_FLOOR + signal. */
export const SIGNAL_FLOOR = 0.32;
/** Base advance speed (cycles/sec) of the signal head along the arc, before the
 * per-cluster uPulse boost. headT = fract(uTime·SIGNAL_HEAD_SPEED·clusterSpeed). */
export const SIGNAL_HEAD_SPEED = 0.5;
/** Extra head-speed multiplier added per unit of a cluster's eased pulse (the
 * healthy activation wave makes the packet race when the cluster fires). */
export const SIGNAL_PULSE_SPEED = 1.1;
/** Extra packet brightness added per unit of a cluster's eased pulse. */
export const SIGNAL_PULSE_GAIN = 1.4;

// --- v4 hover ignition ------------------------------------------------------
/** Emissive multiplier applied to the HOVERED hub (it flares).
 * v6: 1.8 → 2.0 — the hovered hub holds slightly brighter so the link to the
 * opening card persists after the burst transient decays. */
export const HOVER_FLARE = 2.0;
/** Emissive multiplier applied to the NON-hovered hubs while one is hovered
 * (they recede). */
export const HOVER_DIM = 0.5;
/** Hub radius pulse (fractional growth) of the hovered hub.
 * v6: 0.35 → 0.45 — the hovered orb holds a touch bigger under the burst. */
export const HOVER_RADIUS_PULSE = 0.45;
/** Extra signal-speed/brightness multiplier on the hovered hub's incident arcs.*/
export const HOVER_ARC_BOOST = 1.6;
/** Damp rate of the per-hub glow toward its hover target (smooth transition). */
export const HOVER_GLOW_DAMP = 7.0;

// --- v5 hover BURST (particle effect on open) -------------------------------
// On node-marker hover the hovered hub does a brief BURST: its node-sphere
// particles SURGE outward then re-settle (amplifies HOVER_RADIUS_PULSE into a
// real quick expansion), with an emissive spike. The burst is a one-shot
// envelope per hub (NOT the steady glow): NeuralLattice triggers it on the
// rising edge of a hover and lets it decay to 0 on its own. The shader reads it
// per-hub via uHubBurst.element(i) and pushes node particles along their sphere
// offset by (1 + uHubBurst·HOVER_BURST_AMP), plus an emissive add.
/** Peak outward expansion of node particles during the burst (fractional growth
 * of the sphere-offset radius). A real surge, well past the steady radius pulse.
 * v6: 1.15 → 1.7 — a real ~2× momentary orb expansion (a shockwave, not a nudge). */
export const HOVER_BURST_AMP = 1.7;
/** Emissive spike added at the burst peak (on top of the steady hub glow).
 * v6: 1.4 → 1.9 — brighter pop, kept under 2.2 so the bloom halo doesn't ring
 * the DOM card copy (tune UP under live QA only if it reads weak). */
export const HOVER_BURST_EMISSIVE = 1.9;
/** Burst attack damp rate (how fast it ramps to 1 on the rising edge). High =
 * a near-instant surge. v6: 16 → 22 — snappier pop on the rising edge. */
export const HOVER_BURST_ATTACK = 22.0;
/** Burst decay damp rate (how fast it re-settles toward 0 after the surge).
 * Lower than attack → quick out, gentle resettle. v6: 3.2 → 2.6 — the orb
 * breathes back over ~0.4s so the eye tracks expand→resettle as one gesture. */
export const HOVER_BURST_DECAY = 2.6;
/** Extra incident-arc signal speed/brightness boost toward the hovered hub's
 * card during the burst (on top of HOVER_ARC_BOOST). v6: 0.8 → 1.3 — the signal
 * visibly races toward the opening card (the WebGL half of the node→card scia). */
export const HOVER_BURST_ARC = 1.3;
/** v6 burst SHOCKWAVE: a brief extra emissive flash layered on top of
 * HOVER_BURST_EMISSIVE, gated by vBurst² so it spikes ONLY at the transient peak
 * (reads as a shockwave pop, not a soft hold). Reuses the existing vBurst varying
 * — NO new uniform/buffer. NOTE: this MULTIPLIES on top of HOVER_BURST_EMISSIVE,
 * so it's the PRODUCT that blooms — kept at 0.6 so the compounded burst peak
 * (~node 4.4 × flare × (1+vBurst·1.9) × (1+vBurst²·0.6)) stays near the v5 level
 * and the halo doesn't ring the offset marker label. Tune on the x86 desktop. */
export const HOVER_BURST_SHOCK = 0.6;

// --- v4 parallax / life (hubs are layout-pinned → subtle motion only) -------
/** Whole-group damped pointer-parallax amplitude (radians yaw/pitch). STRONG-3D
 * keeps the depth layering always legible in motion. */
export const NEURAL_PARALLAX = 0.1;
/** Continuous faint auto-orbit amplitude (radians) so depth reads even at rest.*/
export const NEURAL_AUTO_ORBIT = 0.06;
/** Auto-orbit frequencies (rad/sec) for yaw / pitch. */
export const NEURAL_ORBIT_FREQ_Y = 0.18;
export const NEURAL_ORBIT_FREQ_X = 0.13;
/** Self-rotation speed (rad/sec) of each hub orb about its own axis (near/far
 * particles parallax → obvious volume). STRONG-3D. */
export const HUB_SPIN_SPEED = 0.5;
/** Faint z-breathe amplitude (local units) of the whole group. */
export const NEURAL_Z_BREATHE = 0.02;

/** Seed-scatter half-extent of the loose start cloud (xy / z). The reveal
 * coalesces from this loose cloud INTO the 3-hub network. */
export const SEED_SCATTER_XY = 0.95;
export const SEED_SCATTER_Z = 0.7;

/** Per-particle emissive multipliers (>1.0 for the selective bloom). Node/hub
 * cores are pushed clearly BRIGHTER than the flow so the 3 orbs read first. */
export const FIELD_NODE_EMISSIVE = 4.6;
export const FIELD_FLOW_EMISSIVE = 3.6;

/** At-rest (no-pulse) alpha floor and emissive floor — how visible the field is
 * when assembled but idle. NODE floor > FLOW floor so the orbs dominate. */
export const FIELD_ALPHA_FLOOR = 0.85;
export const FIELD_NODE_EMIS_FLOOR = 0.95;
export const FIELD_FLOW_EMIS_FLOOR = 0.7;

/** Particle billboard size in device px (perspective-scaled in the shader).
 * Node particles get an extra size boost (NEURAL_NODE_SIZE_BOOST) so the orb
 * cores read as solid bright volumes. */
export const NEURAL_POINT_SIZE = 12.0;
/** Multiplier applied to node-particle point size (orb cores read denser). */
export const NEURAL_NODE_SIZE_BOOST = 1.35;
/** Depth size/brightness attenuation: nearer particles slightly larger/brighter
 * (aerial depth cue). Fractional swing around 1.0 keyed on local z. */
export const NEURAL_DEPTH_ATTEN = 0.5;

// --- v4 camera-lock scale (rect-mapped, NOT isotropic) ----------------------
/** Outer-group rect→local scale margin. The group is scaled to the SECTION rect
 * `(w·k, h·k, zScale)` because the hubs now map to actual card screen positions
 * inside that rect — no squish problem (the content is 3 compact orbs + arcs,
 * not a full-rect cloud). z uses NEURAL_DEPTH_SCALE so depth reads. */
export const NEURAL_DEPTH_SCALE_FACTOR = 1.0; // multiplies (h·k) for group.scale.z
/** Vertical nudge (LOCAL units) of the network center for fine centering. */
export const NEURAL_Y_OFFSET = 0.0;

/**
 * Convert a card center (measured in CSS px) to the group's LOCAL space and
 * return [localX, localY, hubZ] for a hub. Mirrors the spec math:
 *   localX = (cardCx − sectionCx) / w
 *   localY = (sectionCy − cardCy) / h   (flip: screen-y down → local-y up)
 *   z      = HUB_Z[hubIndex]
 */
export function cardCenterToLocal(
  cardCx: number,
  cardCy: number,
  sectionCx: number,
  sectionCy: number,
  w: number,
  h: number,
  hubIndex: number,
): [number, number, number] {
  const localX = w > 0 ? (cardCx - sectionCx) / w : 0;
  const localY = h > 0 ? (sectionCy - cardCy) / h : 0;
  return [localX, localY, HUB_Z[hubIndex] ?? 0];
}

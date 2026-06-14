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

/** Brand signal ramp endpoints (FIXED cyan→violet — NO hue cycling). */
export const COL_CYAN = "#3BE1FF"; // --accent, input side.
export const COL_VIOLET = "#7C5CFF"; // --accent-2, output side.
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

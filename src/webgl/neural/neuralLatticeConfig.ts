/**
 * NEURAL PLEXUS — shared LOCAL-space layout + look constants for the WebGL
 * island in NeuralLattice.tsx (2026-08-22 ROUND-8-D re-author; the file name
 * is kept so the store / Scene wiring stays untouched).
 *
 * ROUND-8-D (owner, with a reference image: "i cerchi delle reti neurali ci
 * sono ancora, le reti neurali sono fatte così" + "non hanno dei cerchi vuoti
 * dentro"): the round-6 LAYERED DIAGRAM (5 layers · 12 nodes · 21 edges) and
 * the orbiting node HALOS (a ring of dots with a hollow middle — the last
 * surviving "cerchi vuoti") are both gone. The band now holds a real 3D
 * BRAIN PLEXUS:
 *   - a DENSE VOLUMETRIC CLOUD of ~100 nodes (lite ~55) seeded deterministic-
 *     ally inside an organic ellipsoid that fills the anchor band, with real
 *     z spread so the mass reads as a volume, not a diagram;
 *   - every node is a FILLED STAR-GLOW — particles concentrate AT the node
 *     centre with a tight radial falloff plus a 4-ray flare cross, so the
 *     core is a solid luminous point that blooms into a star (NO ring, NO
 *     disc, NO hollow centre anywhere);
 *   - links are THIN PALE filaments between NEAR NEIGHBOURS (k-nearest with a
 *     distance cutoff, deduped and capped) — a dense irregular triangulation
 *     of triangles/tetrahedra, never columns or layers;
 *   - depth reads through the existing size/brightness attenuation + DOF.
 *
 * The old layer machinery survives as a WEAK left→right coordinate only:
 * `nodeT` ∈ [0,1] is a node's normalized x inside the cloud. It exists so the
 * pulse can propagate as a WAVEFRONT sweeping the cloud, so the fracture can
 * live at a position, and so the three ignition zones can be REGIONS. It is
 * never quantized — nothing reads as a column.
 *
 * ONE visual vocabulary, two configs:
 *   - "broken"  → the Problem section. Everything past the FRACTURE
 *                 (nodeT 0.62 — spatially at the broken crystal) is DEGRADED:
 *                 filaments fray into ember debris, their far endpoints drift
 *                 off-station, and the traveling PULSE dies at the fracture
 *                 with the flash + spark burst + nebula. Hover re-coheres for
 *                 a beat.
 *   - "healthy" → the ProductionGrade section. The whole cloud is intact; the
 *                 three ignition REGIONS (nodeT .25/.5/.75 — eval → trace →
 *                 guardrail) light in sequence; the pulse traverses the whole
 *                 cloud and SURVIVES, flashing each region's stars as it
 *                 crosses. (The round-4 membrane discs are retired since
 *                 round-8 — see §B.1.)
 *
 * COORDINATE FRAME (unchanged contract): the plexus lives in a CAMERA-LOCKED
 * group scaled to the section's `[data-lattice-anchor]` rect (w·k × h·k).
 * Everything here is authored in the group's LOCAL space — x in fractions of
 * the rect WIDTH, y/z in fractions of the rect HEIGHT, x → right, y → up.
 * NOTHING here is in document/world Y; the group transform maps local →
 * screen. Because x and y use different denominators, every DISTANCE measured
 * at build time (near-neighbour links, the crystal clearance well) converts x
 * to height units with BAND_ASPECT first — otherwise "nearest" would mean
 * something different horizontally than vertically.
 *
 * REGISTRATION SPINE: the uC0..uC4 spline control points are the five X-SLICE
 * CENTROIDS of the cloud (gaussian-weighted over nodeT — see buildPlexus). No
 * particles ride the spline; it only registers the fracture nebula + spark
 * origin (streamCenter(uFracture)), the row attention windows, and the
 * DORMANT membranes (retired round-8, off by default).
 *
 * TRANSPORT: node/edge data rides in the SAME four uniformArrays as before
 * (uNodePos/uNodeT/uEdgeA/uEdgeB) — `.element()` is legal in any stage and
 * costs zero storage buffers / zero vertex-buffer slots, and the round-8-D
 * cloud adds NO new binding. Each uniformArray element is padded to a vec4
 * (16 B) by three's UniformArrayNode, so the biggest array here is
 * EDGE_CAP·16 B ≈ 4 KB — an order of magnitude under both the WebGPU
 * maxUniformBufferBindingSize (64 KiB) and the WebGL2 MAX_UNIFORM_BLOCK_SIZE
 * floor (16 KiB). NODE/EDGE COUNTS ARE BUILD-TIME: they size the arrays and
 * the baked meta buffer, so changing PLEXUS_SEEDS / PLEXUS_EDGE_CAP needs a
 * rebuild, not a live uniform write.
 *
 * ROUND-7 (kept): AMBIENT PACKET TRAFFIC (small bright beads forever
 * traveling the filaments, dying at the fracture on broken, KISSING the star
 * core they arrive at) and the beauty pass (per-edge mid-span brightness
 * profile, cool→warm cyan tint across the cloud, star size variance/breath,
 * amber ember tips). All shader-side, zero driver changes.
 *
 * ROUND-8-F (2026-08-22) — BAKE THE LIVE TUNING. Round-8-D's LOOK numbers were
 * derived arithmetically and never eyeballed; shipped, the plexus read as faint
 * dust with dotted link trails instead of the reference's star-mesh. The owner
 * measured corrections at the console (`__sersanNeuralLattice_*.uniforms`) and
 * they are now the DEFAULTS: NEURAL_POINT_SIZE 3.6 → 7.5, NODE_ALPHA 0.8 → 1.0,
 * STAR_PUNCH 2.2, STAR_SPREAD 1.35, DOF_STRENGTH 0.45, ENVELOPE_BASE 1.8, plus
 * the three build-time link constants the console could not reach
 * (STRAND_RADIUS, STREAM_ALPHA, STREAM_EMISSIVE), derived at each constant's
 * own doc comment. The four knobs that used to be bare `uniform(1)` literals in
 * neuralFieldCompute (uStarPunch / uStarSpread / uDof / uEnvelope) are config
 * constants now, so the shipped look is authored in ONE file; the dev handle
 * still overrides every one of them at runtime, unchanged. NOTHING structural
 * moved — no geometry, no bindings, no per-frame work, no new draw calls; the
 * only cost delta is sprite fill (pointSize², see NEURAL_PARTICLE_COUNT_COMPACT
 * for the lite budget check).
 */

// crystalConfig only imports a TYPE from this module (`import type` is erased
// at emit), so this value import creates NO runtime cycle.
import { CRYSTAL_POS } from "./crystalConfig";

/** The two plexus modes. */
export type LatticeMode = "broken" | "healthy";

/** Per-mode signal clusters — three ignition REGIONS, three pulse slots.
 * The neuralLatticeStore sizes its pulse arrays off this (contract kept). */
export const CLUSTER_COUNT = 3;

/** Brand signal ramp (FIXED white-cyan→cyan→blue — NO violet, ever).
 * The star cores read white-hot, the link body is brand cyan, the filament
 * fringe cools to blue and fades to transparent navy (additive over the navy
 * bg = transparency). Stars read whiter than links (RING_WHITE) — the
 * reference's white-blue nodes on pale-blue threads. */
export const COL_CORE = "#EAFBFF"; // white-cyan — star cores + pulse head
export const COL_CYAN = "#3BE1FF"; // link body
export const COL_BLUE = "#2A7FFF"; // link fringe
/** Ember ramp the degraded side dims through (desaturated, sub-bloom). */
export const COL_EMBER = "#4A443E";
export const COL_EMBER2 = "#6B5546";

/** Total particles in the plexus on a full-tier desktop (unchanged across the
 * round-8-D re-author — the same budget now buys ~250 links + ~100 stars). */
export const NEURAL_PARTICLE_COUNT = 9000;
/**
 * Compact budget, selected when `tier === "lite"` (capable phones). Additive
 * fill is the real cost: 3,200 at DPR 1 ≈ one tenth the fill of 9,000 at
 * DPR 2. Same topology — the phone gets a thinner version of the same net.
 * Read via `useTierStore.getState()` in the BUILD path only, never as a
 * subscription inside the Canvas island (the R3F island commit wedge).
 *
 * ROUND-8-F LITE CHECK (NEURAL_POINT_SIZE 3.6 → 7.5 is the only change here
 * that touches cost — fill scales as pointSize², nothing else in this round
 * adds a particle or a draw):
 *   - vs ROUND-7, which shipped 7.0 on this same 3,200 budget: (7.5/7.0)² =
 *     **1.15×**. The lite tier has already carried this sprite size.
 *   - absolute: 3,200 × (7.5 · CORE_SIZE_BOOST 1.25)² at DPR 1 ≈ 281k px² of
 *     additive fill, against the round-8-D DESKTOP figure of 9,000 × 4.5² ×
 *     DPR2² ≈ 729k px² — the phone at the new size costs 39% of what the
 *     desktop was already running comfortably.
 *   - link continuity survives the thinner net: lite delivers ~2,272 link
 *     particles over ~110 links = 20.7 per link, and its sparser cloud
 *     (PLEXUS_SEEDS 74 vs 132 ⇒ ~1.22× the mean spacing) puts those at ~2.9px
 *     apart on a 480px-tall phone band — still 3.2× overlapped by the 9.4px
 *     core sprite and 1.4× by the 4.1px fringe. Sprites are px-fixed while the
 *     band shrinks, so the small screen HELPS here.
 *   - uDof 0.45 (DOF_STRENGTH) narrows the size spread from ±0.30 to ±0.135,
 *     which lowers the peak near-particle sprite area — a small credit back.
 */
export const NEURAL_PARTICLE_COUNT_COMPACT = 3200;

// --- THE PLEXUS (round-8-D volumetric node cloud) ----------------------------
/**
 * Build-time density presets. `full` = desktop island, `lite` = the compact
 * phone budget (NEURAL_PARTICLE_COUNT_COMPACT), `svg` = the DOM fallback twin
 * (neural-graph-fallback.tsx) which needs a far smaller element count.
 *
 * SEEDS is the number of CANDIDATE points; the crystal clearance well (below)
 * carves some away, so the delivered node count is a little lower and is
 * reported by `getPlexus(...).nodes.length`. Node/edge counts are BUILD-TIME
 * (they size the uniformArrays and the baked meta buffer) — changing any of
 * these needs a rebuild, never a live uniform write.
 */
export type PlexusDensity = "full" | "lite" | "svg";
export const PLEXUS_SEEDS: Record<PlexusDensity, number> = {
  full: 132,
  lite: 74,
  svg: 46,
};
/** k of the k-nearest-neighbour link pass (before dedupe + cap). */
export const PLEXUS_K: Record<PlexusDensity, number> = {
  full: 4,
  lite: 4,
  svg: 3,
};
/** Hard ceiling on the delivered edge list — sizes uEdgeA/uEdgeB. */
export const PLEXUS_EDGE_CAP: Record<PlexusDensity, number> = {
  full: 250,
  lite: 132,
  svg: 78,
};
/** Link cutoff as a multiple of the cloud's MEAN nearest-neighbour spacing
 * (screen-height units). Above ~2 the mesh starts drawing long chords that
 * read as a diagram again. */
export const PLEXUS_LINK_CUTOFF = 1.85;

/**
 * The band's assumed aspect (rect.h / rect.w), used ONLY at build time to put
 * x and y in the SAME (screen-height) units before measuring a distance. The
 * live rect aspect is uPlaneAspect (driver-written per frame) and is used
 * in-shader for the camera-facing star geometry; this constant only shapes the
 * static topology, so a real band that is a bit wider/narrower just stretches
 * the same plexus.
 */
export const BAND_ASPECT = 0.45;

/** Cloud centre + half-extents in LOCAL units (x = width fractions, y/z =
 * height fractions). x overshoots ±0.5 slightly at the right, exactly like
 * the retired layer table did, so the cloud reaches the band edges. */
export const PLEXUS_CX = 0.03;
export const PLEXUS_RX = 0.48;
export const PLEXUS_RY = 0.42;
export const PLEXUS_RZ = 0.2;
/** Radial density exponent: r = U^(1/POW). POW = 3 is volume-uniform; below
 * that the cloud gains a denser core (the reference image's bright middle). */
export const PLEXUS_RADIAL_POW = 2.2;
/** Low-frequency boundary warp — the cloud is an organic blob, not an
 * ellipsoid with a machined rim. */
export const PLEXUS_WARP = 0.22;
/** Per-point direction jitter that breaks the golden-spiral regularity (the
 * spiral alone reads as a woven shell). */
export const PLEXUS_DIR_JITTER = 0.55;
/** Gaussian sharpness of the x-slice weighting that derives the 5 spline
 * control points (half-width ≈ 0.10 of nodeT ≈ 10 nodes per slice). Tuned so
 * streamCenter(FRACTURE_T) lands on the broken crystal: at K = 70 the spine
 * puts it at local (+0.139, +0.023) with the stone at (+0.17, −0.05) — a
 * looser K compresses the spline toward the cloud centre and drags the smoke
 * off the stone. */
export const PLEXUS_CENTROID_K = 70;

/**
 * CRYSTAL CLEARANCE RULE. The CrystalCluster stone floats inside the plexus;
 * a uniform cloud would swallow it. Node seeding therefore runs through a
 * soft DENSITY WELL centred on the mode's crystal position (crystalConfig
 * CRYSTAL_POS — broken (+0.17,−0.05), healthy (+0.22,+0.06)), measured as a
 * SCREEN-ROUND 2D distance (x converted with BAND_ASPECT; z ignored, because
 * what must stay readable is the stone's SILHOUETTE):
 *
 *   d < INNER            → keep probability 0   (fully carved — the stone's
 *                          own body, ≈ ±0.25 height fractions, sits here)
 *   INNER ≤ d < OUTER    → keep probability = smoothstep(INNER, OUTER, d)
 *   d ≥ OUTER            → full density
 *
 * The ramp is what makes the stone sit IN the plexus instead of a hole: the
 * mesh thins toward it. NOTE the rule is purely 2D — z is ignored — so NO
 * node survives inside INNER, in front of or behind. Edges are filtered by
 * the same rule: a link whose MIDPOINT falls inside INNER would draw straight
 * across the stone and is dropped.
 *
 * TWO MEASURED SIDE-EFFECTS OF THIS WELL (2026-08-22 review — read before
 * retuning INNER/OUTER, CRYSTAL_POS, FRACTURE_T or RING_T):
 *
 *  (a) It carves the fracture's own x-slab on BROKEN. The stone sits at
 *      x +0.17 and FRACTURE_T 0.62 maps to x ≈ +0.143, i.e. INSIDE the well's
 *      x-range, so almost every link that would span the break has its
 *      midpoint in the well and is dropped. Delivered crossing links:
 *      2 of 227 (full), 1 of 110 (lite), 0 of 62 (svg). The FRACTURE_GAP_T
 *      "clean cut on every crossing filament" is therefore near-dormant — the
 *      break now reads as the clearance GAP itself plus the drifted ember
 *      side (22 nodes / 36 links past the fracture on full), the nebula and
 *      the spark burst, all of which are position-driven and unaffected.
 *
 *  (b) It carves ignition REGION 3 on HEALTHY. The stone at x +0.22 maps to
 *      nodeT 0.744 — essentially RING_T[2] (0.75), the guardrail beat. The
 *      healthy nodeT histogram has a literal hole there (bin 0.7–0.8 = 0 of
 *      101 nodes), so the region's gaussian star mass is 8.3 against 35.3 and
 *      42.0 for eval and trace: the third beat of the sequenced
 *      `bumpCluster("healthy", i)` lights a faint wash over the right of the
 *      cloud instead of a bright cluster. cloudZoneGate was widened to stop
 *      making this worse, but the imbalance itself is structural — closing it
 *      means moving the healthy stone, RING_T[2], or the cloud's x extent,
 *      all of which are owner/taste calls.
 */
export const CRYSTAL_CLEAR_INNER = 0.17;
export const CRYSTAL_CLEAR_OUTER = 0.4;

/**
 * Minimum LOCAL (raw, un-aspected) link length. This is the guard the
 * WRAP_SNAP_DIST recycle-snap keys on: a flow-s wrap teleports an edge
 * particle's anchor by ONE EDGE LENGTH, so the snap threshold must sit BELOW
 * the shortest edge. With a screen-metric triangulation the shortest links
 * are the near-horizontal ones (x is compressed by BAND_ASPECT), so we reject
 * anything under this — which doubles as an anti-corridor filter, since the
 * rejects are exactly the stubby horizontal chords. See WRAP_SNAP_DIST.
 */
export const EDGE_MIN_LOCAL = 0.055;

/** A deterministic [0,1) hash — same sin/fract family as the shader hashes. */
function ph(i: number, a: number, b: number): number {
  const s = Math.sin(i * a + b) * 43758.5453;
  return s - Math.floor(s);
}
function smooth01(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / Math.max(b - a, 1e-6)));
  return t * t * (3 - 2 * t);
}

export interface Plexus {
  /** Node centres [x, y, z] in LOCAL space — seeds uNodePos. */
  nodes: [number, number, number][];
  /** Per-node WEAK left→right coordinate (normalized x, 0..1) — seeds
   * uNodeT. Everything narrative (surge wavefront, fracture, ignition
   * regions, row windows, cool→warm tint) is parameterized on THIS. */
  nodeT: number[];
  /** Near-neighbour links [a, b], ORIENTED so nodeT[a] ≤ nodeT[b] (flow and
   * packet traffic therefore always run left→right and converge on the
   * right-hand star) — seeds uEdgeA/uEdgeB. */
  edges: [number, number][];
  /** The 5 x-slice centroids = the uC0..uC4 registration spine. */
  centroids: [number, number, number][];
  /** Diagnostics (dev handle / docs): mean nearest-neighbour spacing in
   * screen-height units, and the shortest delivered edge in LOCAL units
   * (must exceed WRAP_SNAP_DIST). */
  meanSpacing: number;
  minEdgeLocal: number;
}

const plexusCache = new Map<string, Plexus>();

/** Memoized deterministic plexus for a mode + density. Pure — same inputs
 * always give the same cloud, so the compute build, the static/analytic build
 * and the SVG twin all agree without sharing any runtime state. */
export function getPlexus(
  mode: LatticeMode,
  density: PlexusDensity = "full",
): Plexus {
  const key = `${mode}:${density}`;
  const hit = plexusCache.get(key);
  if (hit) return hit;
  const built = buildPlexus(mode, density);
  plexusCache.set(key, built);
  return built;
}

function buildPlexus(mode: LatticeMode, density: PlexusDensity): Plexus {
  const seeds = PLEXUS_SEEDS[density];
  const [ccx, ccy] = CRYSTAL_POS[mode];
  // Decorrelates the two modes so the Problem and ProductionGrade bands are
  // visibly different clouds telling the same story.
  const ms = mode === "broken" ? 11.37 : 57.19;
  const GOLD = Math.PI * (3 - Math.sqrt(5));

  // --- 1. Seed the volumetric cloud ----------------------------------------
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < seeds; i++) {
    // Golden-spiral direction on the unit sphere + a jitter that breaks its
    // regularity (organic, still deterministic).
    const u = (i + 0.5) / seeds;
    let dz = 1 - 2 * u;
    const sr = Math.sqrt(Math.max(0, 1 - dz * dz));
    const phi = i * GOLD + ms;
    let dx = sr * Math.cos(phi) + (ph(i + ms, 12.9898, 78.233) - 0.5) * PLEXUS_DIR_JITTER;
    let dy = sr * Math.sin(phi) + (ph(i + ms, 39.3467, 11.135) - 0.5) * PLEXUS_DIR_JITTER;
    dz += (ph(i + ms, 73.156, 52.235) - 0.5) * PLEXUS_DIR_JITTER;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl;
    dy /= dl;
    dz /= dl;
    // Centre-dense radius with a low-frequency organic boundary warp.
    const rr = Math.pow(ph(i + ms, 91.318, 27.719), 1 / PLEXUS_RADIAL_POW);
    const warp =
      1 + PLEXUS_WARP * Math.sin(dx * 3.1 + ms) * Math.cos(dy * 2.7 - ms);
    const r = Math.min(1, Math.max(0.05, rr * warp));
    const x = PLEXUS_CX + dx * r * PLEXUS_RX;
    const y = dy * r * PLEXUS_RY;
    const z = dz * r * PLEXUS_RZ;
    // Crystal density well (screen-round distance — silhouette clearance).
    const d = Math.hypot((x - ccx) / BAND_ASPECT, y - ccy);
    const keep = smooth01(d, CRYSTAL_CLEAR_INNER, CRYSTAL_CLEAR_OUTER);
    if (ph(i + ms, 127.1, 311.7) > keep) continue;
    nodes.push([x, y, z]);
  }

  // --- 2. The weak left→right coordinate -----------------------------------
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const n of nodes) {
    if (n[0] < xMin) xMin = n[0];
    if (n[0] > xMax) xMax = n[0];
  }
  const span = Math.max(xMax - xMin, 1e-3);
  const nodeT = nodes.map((n) => (n[0] - xMin) / span);

  // --- 3. Near-neighbour triangulation -------------------------------------
  const N = nodes.length;
  /** Distance in SCREEN-height units (x un-squashed by BAND_ASPECT). */
  const sd = (a: number, b: number) =>
    Math.hypot(
      (nodes[a][0] - nodes[b][0]) / BAND_ASPECT,
      nodes[a][1] - nodes[b][1],
      nodes[a][2] - nodes[b][2],
    );
  /** RAW local distance — what the compute kernel's snap threshold sees. */
  const ld = (a: number, b: number) =>
    Math.hypot(
      nodes[a][0] - nodes[b][0],
      nodes[a][1] - nodes[b][1],
      nodes[a][2] - nodes[b][2],
    );
  const midInWell = (a: number, b: number) => {
    const mx = (nodes[a][0] + nodes[b][0]) / 2;
    const my = (nodes[a][1] + nodes[b][1]) / 2;
    return Math.hypot((mx - ccx) / BAND_ASPECT, my - ccy) < CRYSTAL_CLEAR_INNER;
  };

  let nnSum = 0;
  const ranked: { j: number; d: number }[][] = [];
  for (let i = 0; i < N; i++) {
    const cand: { j: number; d: number }[] = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      if (ld(i, j) < EDGE_MIN_LOCAL) continue;
      if (midInWell(i, j)) continue;
      cand.push({ j, d: sd(i, j) });
    }
    cand.sort((p, q) => p.d - q.d || p.j - q.j);
    ranked.push(cand);
    nnSum += cand.length ? cand[0].d : 0;
  }
  const meanSpacing = N ? nnSum / N : 0;
  const cutoff = meanSpacing * PLEXUS_LINK_CUTOFF;

  const seen = new Set<number>();
  const must: { a: number; b: number; d: number }[] = [];
  const extra: { a: number; b: number; d: number }[] = [];
  const push = (
    bucket: { a: number; b: number; d: number }[],
    i: number,
    j: number,
    d: number,
  ) => {
    // Orient by nodeT so flow + packets always run left→right.
    const a = nodeT[i] <= nodeT[j] ? i : j;
    const b = a === i ? j : i;
    const key = a * 1024 + b;
    if (seen.has(key)) return;
    seen.add(key);
    bucket.push({ a, b, d });
  };
  // Pass A — every node keeps its single nearest link (no orphan stars).
  for (let i = 0; i < N; i++) {
    const c = ranked[i][0];
    if (c) push(must, i, c.j, c.d);
  }
  // Pass B — the remaining k-nearest inside the cutoff, shortest first.
  const k = PLEXUS_K[density];
  for (let i = 0; i < N; i++) {
    const cand = ranked[i];
    for (let c = 1; c < Math.min(k, cand.length); c++) {
      if (cand[c].d > cutoff) break;
      push(extra, i, cand[c].j, cand[c].d);
    }
  }
  extra.sort((p, q) => p.d - q.d || p.a - q.a || p.b - q.b);
  const cap = PLEXUS_EDGE_CAP[density];
  const chosen = must.concat(extra).slice(0, cap);
  const edges: [number, number][] = chosen.map((e) => [e.a, e.b]);
  let minEdgeLocal = Infinity;
  for (const [a, b] of edges) minEdgeLocal = Math.min(minEdgeLocal, ld(a, b));
  if (!edges.length) minEdgeLocal = 0;

  // --- 4. The 5 x-slice centroids (the uC0..uC4 registration spine) --------
  const centroids: [number, number, number][] = [];
  for (let s = 0; s < 5; s++) {
    const t0 = s / 4;
    let wx = 0;
    let wy = 0;
    let wz = 0;
    let ws = 1e-6;
    for (let i = 0; i < N; i++) {
      const dt = nodeT[i] - t0;
      const w = Math.exp(-PLEXUS_CENTROID_K * dt * dt);
      wx += nodes[i][0] * w;
      wy += nodes[i][1] * w;
      wz += nodes[i][2] * w;
      ws += w;
    }
    centroids.push([wx / ws, wy / ws, wz / ws]);
  }

  return { nodes, nodeT, edges, centroids, meanSpacing, minEdgeLocal };
}

// --- Link filaments ----------------------------------------------------------
/**
 * Strands per LINK. ROUND-8-D: 2 → 1. With ~250 links sharing the same
 * particle budget an edge gets ~27 particles; splitting those over two
 * strands made both dotted. One strand at ~4px spacing reads as a continuous
 * PALE THREAD — which is what the reference's plexus links are.
 */
export const STRAND_COUNT = 1;
/**
 * Strand offset radius around the link line (height fractions) — the helix a
 * filament's single strand traces, i.e. how much a link SAGS off its chord.
 * It is NOT the filament's visual width: that is the sprite (NEURAL_POINT_SIZE
 * × CORE_SIZE_BOOST = 9.4px), and it is not what made the links read dotted.
 *
 * ROUND-8-F: 0.0028 → 0.0034, and the number is derived at the point where it
 * is APPLIED, not where it is authored. The shader multiplies `strandOff+jit`
 * by widthEnvelope(), which now carries the live-measured ENVELOPE_BASE 1.8
 * (below), so the EFFECTIVE cross-section radius is
 *   STRAND_RADIUS × ENVELOPE_BASE = 0.0034 × 1.8 = **0.0061**
 * — the round-8-F brief's "~0.006" target, hit where it counts. Writing 0.006
 * into this constant would have delivered 0.0108 effective: 1.8× past the
 * target, ≈0.9× the pre-round-8-D 0.012, and 1.5× the star core blob radius
 * (STAR_CORE_R × STAR_SPREAD = 0.0074) — links sagging WIDER than the stars
 * they connect, which inverts the "stars are the subject" read. The owner's
 * live A/B was looking at 0.0028 × 1.8 = 0.00504, so ~0.006 is a +21% nudge on
 * what they saw, not a 2.1× jump. If the links want more slack, this is the
 * one knob (or raise uEnvelope live — same product).
 *
 * Continuity is unaffected either way, and the arithmetic says so: consecutive
 * particles on a link are 2.5px apart along the chord, and the helix adds only
 * R·Δθ perpendicular, where Δθ = 2π·BRAID_TURNS·STRAND_RATE_BASE·(2.5/71) =
 * 0.109 rad ⇒ 0.45px at the new radius. Neighbour gap √(2.5² + 0.45²) =
 * 2.54px against a 9.4px core / 4.1px fringe sprite. The dotted read was
 * NEURAL_POINT_SIZE, not this.
 */
export const STRAND_RADIUS = 0.0034;
/** Per-particle jitter radius within a strand (thickness noise). Also rides
 * widthEnvelope → effective 0.0018 × 1.8 = 0.0032 (≈2.2px). */
export const STRAND_THICKNESS = 0.0018;
/**
 * Master filament width envelope — the uEnvelope default (was a bare
 * `uniform(1)` literal in neuralFieldCompute). ROUND-8-F (LIVE-MEASURED):
 * 1.0 → 1.8. It multiplies widthEnvelope(), i.e. it scales `strandOff + jit`
 * for LINK particles only (stars are untouched — their spread is STAR_SPREAD),
 * on top of the healthy TIGHTEN_PER_RING ramp, the idle breathe, the row
 * response and the scroll-velocity swell. Cost: zero — it moves particles off
 * the chord, it does not resize sprites or add any.
 */
export const ENVELOPE_BASE = 1.8;
/** Full twists along ONE link — nearly straight now (0.6): a plexus link is a
 * thread between two stars, not a braid. */
export const BRAID_TURNS = 0.6;
/**
 * PHASE SEPARATION: distinct twist phases + thickness biases per strand.
 * FOUR entries kept (dev-handle uStrandPhase/uStrandThick contract) — only
 * the first STRAND_COUNT are read; a per-edge golden-angle offset decorrelates
 * edges on top.
 */
export const STRAND_PHASES = [0.0, 2.4, 3.9, 5.7] as const;
export const STRAND_THICK_BIAS = [1.0, 0.75, 1.05, 0.6] as const;
/** Per-strand twist-RATE multiplier = BASE + STEP·strandIndex. */
export const STRAND_RATE_BASE = 0.82;
export const STRAND_RATE_STEP = 0.12;
/** Base flow speed — cycles/sec a particle advances along ITS LINK. Links are
 * short now (≈ one mean node spacing), so this is a slow trickle along each
 * thread rather than a river current. */
export const FLOW_SPEED = 0.075;

// --- Silhouette --------------------------------------------------------------
/** Alpha ramp along per-edge s: fade-in/out at the filament TIPS — the tips
 * dissolve into the STAR CORES they connect (and it hides the flow-wrap
 * recycle: a particle wraps s at near-zero alpha on both ends). */
export const EDGE_FADE_IN = 0.12;
export const EDGE_FADE_OUT = 0.1;
/** Slight z-bow of the registration SPINE toward the camera at t=0.5 — lifts
 * the mid-net membranes/nebula slightly off the band plane. */
export const STREAM_Z_BOW = 0.05;
/** Radial size falloff across a filament's cross-section: core particles up
 * to this ×, fringe down to this ×. ROUND-8-D: 1.6/0.6 → 1.25/0.55 — the
 * cross-section is only a few px wide now, so a fat core sprite would swell
 * a thread back into a rope. */
export const CORE_SIZE_BOOST = 1.25;
export const FRINGE_SIZE_DROP = 0.55;
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

// --- Ignition REGIONS (eval → trace → guardrail) ------------------------------
/**
 * The three ignition zones' nodeT centres. ROUND-8-D remap: these used to be
 * LAYER depths (layer/4); they are now REGIONS of the cloud — three vertical
 * slabs of the plexus centred at nodeT .25/.5/.75. The driver contract is
 * UNCHANGED: it flashes uRingFlash[i] when the pulse head crosses RING_T[i]
 * and damps uRingGlow[i] toward the hover target, exactly as before. What
 * changed is only how a node picks up those three slots: instead of the old
 * hard `index = nodeT·4−1` quantization (which would re-introduce columns),
 * the shader blends the three slots with a GAUSSIAN over nodeT (ZONE_K), so
 * an ignition lights a soft REGION of the cloud — the reference image's
 * bright clusters. The dormant membrane discs still sit at
 * streamCenter(RING_T[i]) = x-slice centroids 1..3.
 */
export const RING_T = [0.25, 0.5, 0.75] as const;
/** Gaussian sharpness of a zone's nodeT window. Zones are 0.25 apart; K = 44
 * puts the half-weight point at ±0.125, i.e. exactly halfway to the next
 * zone — the three windows form a soft partition of the cloud with no seam. */
export const ZONE_K = 44;
/** Membrane disc radius (height fractions). Dormant since round-8 (membranes
 * off by default); kept for revival, now sized to the cloud's y half-extent. */
export const RING_RADIUS = 0.2;
/** Star cores read much whiter than the links (0..1 mix → COL_CORE) — the
 * reference is white-blue stars on pale-blue threads. ROUND-8-D: 0.35 → 0.55.
 * The ignition flash pushes further toward white. */
export const RING_WHITE = 0.55;
/** Radial shockwave: a star's flare radius expands 1 → 1+this at full
 * ignition flash (the flash envelope decays over ~0.5s → a visible ripple). */
export const RING_SHOCKWAVE = 0.25;
/** Link width multiplier lost per ignition zone passed (threads discipline
 * smoothly 1 → ~0.73 left→right; healthy only). ROUND-8-D: 0.13 → 0.09 —
 * with no layers to punctuate it this must read as a gentle maturity ramp,
 * never as three steps. */
export const TIGHTEN_PER_RING = 0.09;
/** Extra spring gain near an ignition zone (compute tier). ROUND-8-D: 2.2 →
 * 0.8 and the window widened (below) — a hard narrow lock at three x planes
 * would carve visible vertical seams into a continuous cloud. */
export const RING_SPRING_GAIN = 0.8;
/** Gaussian sharpness of the zone-proximity window in the sim. ROUND-8-D:
 * 260 → ZONE_K (44), so the laminar lock is as broad as the zone itself. */
export const RING_PROX_K = ZONE_K;

// --- Star cores (role 1 — was the node-halo role) -----------------------------
/**
 * ROUND-8-D — THE FIX FOR "cerchi vuoti". Node particles no longer ORBIT at a
 * fixed NODE_RADIUS (a ring of dots with a hollow middle). They now build a
 * FILLED STAR:
 *   - CORE (1 − STAR_FLARE_FRACTION of them): a tight blob at the node centre,
 *     radius STAR_CORE_R with a r = R·U^STAR_CORE_CONC concentration so the
 *     density piles up at the exact centre → a solid luminous point;
 *   - FLARE (STAR_FLARE_FRACTION of them): a 4-ray cross (two perpendicular
 *     axes, the reference's star spikes) reaching STAR_FLARE_LEN, with size
 *     and alpha falling off along the ray so the spikes taper to nothing.
 * Both are BAKED as a literal offset vector into the per-particle `aOff`
 * attribute (zero new buffers), and the shader only scales it — so the same
 * star renders identically on the compute and static tiers.
 *
 * RETIRED by this round (kept out of the file on purpose so nothing can read
 * a stale ring): NODE_RADIUS, NODE_TUBE, NODE_RADIAL_JITTER, NODE_SPIN,
 * HALO_CORE_WHITE, HALO_FRINGE_SOFT. HALO_SIZE_VAR / HALO_BREATH_* are
 * REPURPOSED below as the star's size variance / breath.
 */
/** Core blob radius (height fractions ≈ 3.7px on a 680px band as authored;
 * × the round-8-F STAR_SPREAD 1.35 the DELIVERED radius is 0.0074 ≈ 5.0px). */
export const STAR_CORE_R = 0.0055;
/** Radial concentration exponent of the core blob (higher = denser centre). */
export const STAR_CORE_CONC = 2.4;
/** Fraction of a star's particles that build the flare cross. */
export const STAR_FLARE_FRACTION = 0.42;
/** Flare ray reach (height fractions ≈ 20px on a 680px band as authored;
 * × STAR_SPREAD 1.35 the DELIVERED reach is 0.0405 ≈ 27.5px). */
export const STAR_FLARE_LEN = 0.03;
/** Distribution exponent along a ray (≈1 = even, tapered by size/alpha). */
export const STAR_FLARE_POW = 0.85;
/** Perpendicular jitter of a flare particle off its ray (keeps the spike from
 * reading as a hairline). */
export const STAR_SPIKE_JITTER = 0.0022;
/** z jitter of a star's particles (real depth, no washer). */
export const STAR_Z = 0.0035;
/** Size multiplier at the exact core → at a flare tip. */
export const STAR_CORE_SIZE = 1.75;
export const STAR_TIP_SIZE = 0.45;
/** Emissive multiplier at the core → at a tip (both × RING_EMISSIVE × the
 * round-8-F STAR_PUNCH, so the core lands at 3.0·2.2·1.25 = 8.25 and the tip
 * at 3.0·2.2·0.75 = 4.95). Post-blend the CORE blooms hard (0.889 tone × 8.25
 * × NODE_ALPHA 1.0 = 7.33) while a flare TIP stays at 0.794 × 4.95 ×
 * STAR_TIP_ALPHA 0.18 = 0.71 — under the ≈1.0 threshold, so the spikes stay
 * crisp instead of smearing into the core's halo. */
export const STAR_CORE_EMIS = 1.25;
export const STAR_TIP_EMIS = 0.75;
/** Alpha at a flare tip (core = 1) and the falloff exponent. */
export const STAR_TIP_ALPHA = 0.18;
export const STAR_ALPHA_POW = 1.4;
/** Extra whitening of the innermost core particles (on top of RING_WHITE). */
export const STAR_CORE_WHITE = 0.3;
/** At-rest alpha of a star particle — cores stay dense while the link
 * filaments stay paler (STREAM_ALPHA 0.62). ROUND-8-F (live-measured): 0.8 →
 * 1.0, the uNodeAlpha default. The star core is the one element in the band
 * that is allowed to be fully opaque additive white-cyan; at 0.8 it was
 * conceding 20% of its punch to a mesh it is supposed to dominate. */
export const NODE_ALPHA = 1.0;
/**
 * ROUND-8-F live-measured defaults for the three star knobs that used to be
 * bare `uniform(1)` literals in neuralFieldCompute (uStarPunch / uStarSpread).
 * They are config constants now so the shipped look is authored in ONE file
 * and the dev handle still overrides them at runtime exactly as before.
 *
 * STAR_PUNCH scales the star's >1.0 core emissive (see STAR_CORE_EMIS) — 2.2
 * is what made the cloud read as a star MESH rather than dust.
 * STAR_SPREAD stretches the whole BAKED star offset (core blob AND flare rays
 * together): at 1.35 the core blob radius is STAR_CORE_R 0.0055 × 1.35 =
 * 0.0074 (≈5.0px on a 680px band) and a flare ray reaches STAR_FLARE_LEN 0.03
 * × 1.35 = 0.0405 (≈27.5px). Node COUNT and the core/flare split stay
 * BUILD-TIME (PLEXUS_SEEDS / STAR_FLARE_FRACTION).
 * Neither knob changes fill cost — they move particles, they do not resize
 * sprites (that is NEURAL_POINT_SIZE).
 */
export const STAR_PUNCH = 2.2;
export const STAR_SPREAD = 1.35;
/** Fraction of particles that are STAR particles (both modes). ROUND-8-D:
 * 0.20 → 0.28 (the brief's edges ~70% / cores ~28% / sparks ~2% split — with
 * ~100 stars that is ~25 particles per star on the full tier). */
export const NODE_FRACTION = 0.28;
/** Coherent drift reach of a DEGRADED node (broken, nodeT past the fracture)
 * — whole-node displacement, so the far cloud reads knocked off station, not
 * dissolved. ROUND-8-D: 0.07 → 0.045 (the mesh is far denser; a big drift
 * turned the frayed side into mush). uRecohere pulls it back. */
export const NODE_DRIFT = 0.045;
/** Tone/alpha degrade of a drifted node's star (0..1 — ember mix + dim). */
export const NODE_DEGRADE = 0.55;

// --- The fracture (broken) ---------------------------------------------------
/** nodeT where the plexus breaks. Everything right of it is degraded, and the
 * pulse dies before the third ignition zone (guardrail) ever lights. With the
 * round-8-D cloud spanning x ≈ −0.45..+0.51, nodeT 0.62 lands at x ≈ +0.15,
 * and the x-slice spine puts streamCenter(0.62) there — still AT the broken
 * crystal (+0.17, −0.05), so the smoking break and the fractured stone remain
 * one event (the constant did not need to move). */
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
/** How far frayed particles scatter OFF their link line (local units) —
 * small by design: frayed links must still read as links gone wrong, with
 * the drifted endpoints carrying the "network degraded" story. ROUND-8-D:
 * 0.13 → 0.075, sized to the new (much shorter) mean link length. */
export const DEBRIS_SPREAD = 0.075;
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
/** Pulse head speed in flow-t units/sec (~2s across the cloud). The head
 * sweeps nodeT, so the plexus lights as a WAVEFRONT travelling left→right. */
export const SURGE_SPEED = 0.55;
/** Gaussian sharpness of the pulse's brightness peak along flow-t. ROUND-8-D:
 * 240 → 150 (half-width 0.054 → 0.068 of nodeT ≈ 70px on a 1100px band) — a
 * continuous cloud needs a slightly broader wavefront to read as a wave
 * crossing a volume rather than a scanline. */
export const SURGE_K = 150;
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
 * 1/PACKET_SPAN of its cycle traveling s 0→1 (source star → target star,
 * WITH the flow direction), so expected visible traffic = COUNT·(1/SPAN)
 * ≈ 0.17 packets/link at the round-8-D numbers (COUNT 1 / SPAN 6) — ≈40
 * beads over the ~230-link plexus, i.e. the same calm-but-alive read the
 * round-7 river got from 0.4/edge over 21 edges. Crossing time =
 * 1/(RATE·SPAN) ≈ 0.76s: clearly faster
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
 * links AND its star kiss — the arrival-correlation contract) — BUILD-TIME
 * shader unroll count. ROUND-8-D: 2 → 1. Traffic density is COUNT/SPAN per
 * LINK, and the link count went 21 → ~250: at the round-7 numbers the cloud
 * would carry ~100 simultaneous beads (soup). One clock at SPAN 6 gives
 * ~0.17 beads/link ≈ 40 on screen — the same calm-but-alive read at 12× the
 * mesh density, and one fewer shader unroll. */
export const PACKET_COUNT = 1;
/** Packet clock rate (cycles/sec, ×0.75..1.25 per-packet hash variance).
 * Mean inter-packet interval per link ≈ 1/(RATE·COUNT) ≈ 4.5s. */
export const PACKET_RATE = 0.22;
/** A packet travels its link in 1/SPAN of the cycle (duty cycle — the rest
 * of the cycle the packet is off-link and invisible). Crossing time =
 * 1/(RATE·SPAN) ≈ 0.76s. */
export const PACKET_SPAN = 6;
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
/** Star flare swell at a node-kiss peak (a packet "arriving" — the kiss now
 * lights a STAR, which is exactly the reference's read). */
export const PACKET_NODE_SWELL = 0.12;
/** Star emissive gain at a node-kiss peak (subtler than an ignition flash). */
export const PACKET_NODE_GAIN = 0.5;
/** Kiss gaussian half-width in cycle units (~0.4s swell centred on the
 * bead's arrival phase, 1/PACKET_SPAN, at the mean rate). */
export const PACKET_KISS_WIDTH = 0.05;
/** Micro-spark sputter rate (rad/s of the flicker sine) where a packet dies
 * into the fracture (broken). */
export const PACKET_FLICKER_HZ = 43;

// --- Round-7 — beauty pass (taste constants) ---------------------------------
/** Per-link brightness profile: emissive ×(1−this/2) at the tips rising to
 * ×(1+this/2) mid-span — threads dim INTO the star cores and carry their
 * light in the middle, so each link reads as a strand of light, not a bar.
 * ROUND-8-F ceiling check (the direction that matters now that STREAM_EMISSIVE
 * is 2.1): the MID-SPAN peak 2.1·1.15 = 2.415 is the term that has to stay out
 * of bloom, and it does — post-blend 0.928 (see STREAM_EMISSIVE). The tip floor
 * 2.1·0.85 = 1.785 keeps its faint halo. */
export const EDGE_MID_BRIGHT = 0.3;
/** Tint within the navy→cyan family (NO violet) across the cloud: the LEFT of
 * the plexus runs COOLER (toward COL_BLUE), the RIGHT warmer-cyan (toward
 * COL_CORE). Max mixes at nodeT 0 / 1; the middle stays pure brand cyan. */
export const LAYER_TINT_COOL = 0.35;
export const LAYER_TINT_WARM = 0.22;
/** Star quality (REPURPOSED from the retired halo): per-node size variance
 * (±this/2 around 1) and a slow breath of the whole star. */
export const HALO_SIZE_VAR = 0.3;
export const HALO_BREATH_AMP = 0.045;
export const HALO_BREATH_RATE = 0.55;
/** Fray embers warm toward amber at the VERY tips of the frayed side (the
 * existing failure tone, one step warmer — still desaturated, sub-bloom). */
export const COL_EMBER_TIP = "#8A5F3E";
/** How hard the tip-warm ramp bites (smoothstep 0.6→1 of fray progress ×this). */
export const EMBER_TIP_MIX = 0.75;

// --- Zone ignition / hover ---------------------------------------------------
/** Emissive gain of an ignition zone's flash (bumpCluster / pulse crossing)
 * on the STAR CORES inside that region of the cloud. */
export const RING_FLASH_GAIN = 2.4;
/** Hovered zone's star glow target (row i hover → region i flares). */
export const RING_GLOW_FLARE = 1.9;
/** Non-hovered zones while one is hovered (recede, never dark). */
export const RING_GLOW_DIM = 0.85;
/** Damp rate of the per-zone glow toward its hover target. */
export const RING_GLOW_DAMP = 7.0;
/** Broken hover tease — frayed links briefly re-connect and drifted nodes
 * pull back on station, then fall apart again. Attack/decay damp rates. */
export const RECOHERE_ATTACK = 14.0;
export const RECOHERE_DECAY = 1.6;

// --- Row-reactive attention (uRowGlow) ---------------------------------------
/**
 * uRowGlow[3] (driven from the DOM ledger rows' setHovered) brightens a
 * REGION of the cloud (flow-t = nodeT since round-8-D):
 *   broken  → gaussian at ROW_ZONE_T[i]: the left cloud / the mid cloud / the
 *             FRACTURE ZONE (row 2 = the fracture itself, which also thins
 *             the nebula) + the bigger re-cohere tease.
 *   healthy → gaussian at RING_T[i]: row i's attention attaches to ignition
 *             region i's stars and the links inside it (eval → trace →
 *             guardrail).
 */
export const ROW_ZONE_T = [0.125, 0.4, FRACTURE_T] as const;
/** Gaussian sharpness of a broken row zone (flow-t): half-width ≈ 0.1. */
export const ROW_ZONE_K = 70;
/** Gaussian sharpness of a healthy ignition REGION (half-width ≈ 0.09 — the
 * region's stars plus the links inside it). */
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
 *
 * ROUND-8 (2026-08-22, owner verbatim: "non capisco i cerchi che ci sono in
 * una delle reti neurali, e neanche le sfere"): the membrane discs ARE the
 * "cerchi" — big wavy topographic circles floating around the healthy
 * layers that read as unexplained blobs now that the crystal + constellation
 * + packet traffic carry the section. RETIRED BY DEFAULT: MEMBRANE_ALPHA = 0,
 * and the neuralFieldCompute build seam additionally SKIPS constructing the
 * membrane geometry/material (and so NeuralLattice never mounts the mesh)
 * whenever the alpha is 0 — an invisible layer must cost nothing. Everything
 * else is KEPT for a future owner revival: all constants below, the
 * uMembraneSeal/Phase/Alpha/Bulge uniforms, and the driver's seal-latch +
 * band-phase integration in NeuralLattice. To revive: set MEMBRANE_ALPHA
 * back to the round-6 taste value 0.18 (a rebuild is required — the live
 * uMembraneAlpha dev knob alone cannot revive a mesh that was never built).
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
/** Peak membrane alpha. ROUND-8: 0 — membranes are retired by default (see
 * the section header above); 0 ALSO gates the mesh build itself in
 * neuralFieldCompute. Revive: restore the round-6 taste value 0.18 (any >0
 * value makes the seam build + mount the layer again on the next rebuild). */
export const MEMBRANE_ALPHA = 0;
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
 *
 * ROUND-8 REVIEW: the nebula STAYS. Unlike the retired membrane discs it
 * never renders as a circle — alpha = pow(v1·v2·v3, 3)·3 keeps only the
 * peaks of three multiplied noise taps (sparse sheared WISPS; the radial
 * term merely contains them inside the quad, it is never a visible disc
 * edge), so it reads as narrative smoke at the fracture, not a floating blob.
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
/**
 * Master DOF strength — the uDof default (was a bare `uniform(1)` literal in
 * neuralFieldCompute). ROUND-8-F (LIVE-MEASURED): 1.0 → 0.45. At full strength
 * the depth cue was doing the opposite of its job on the round-8-D cloud: it
 * smeared the far half of the stars into dust instead of placing them behind
 * the near ones. At 0.45 all three DOF terms scale back proportionally —
 * far-half alpha dim 1 − 0.45·far01 (was 1 − 0.45·far01 at full, i.e. the
 * (1 − DOF_FAR_DIM) 0.45 factor now yields only 0.2025·far01), near-half disc
 * softening ×0.45, and the DOF_SIZE_GAIN size spread narrows from ±0.30 to
 * ±0.135 around 1. Depth still reads (NEURAL_DEPTH_ATTEN is untouched); it
 * just no longer erases the far stars. 0 = the flat round-2 look.
 */
export const DOF_STRENGTH = 0.45;
/** Alpha multiplier at the FAR extreme of the z range (far = smaller/dimmer). */
export const DOF_FAR_DIM = 0.55;
/** Soft-disc inner edge at full NEAR softness (bokeh-like falloff on near
 * particles; no postprocessing involved). */
export const DOF_SOFT_MIN = 0.03;
/** Extra size gain across the z range (rides on NEURAL_DEPTH_ATTEN). */
export const DOF_SIZE_GAIN = 0.6;

// --- Emissive / render (>1.0 selective-bloom contract) -----------------------
/**
 * The crystal cluster stays the band's centerpiece; the light lives in the
 * STARS, and the links are the mesh that carries it.
 *
 * ROUND-8-F (LIVE-MEASURED, not derived — the owner's visual pass in Chrome).
 * The round-8-D numbers below were computed arithmetically and never eyeballed;
 * shipped, the plexus read as faint dust with DOTTED link trails instead of the
 * reference's continuous pale filaments. STREAM_EMISSIVE 1.6 → 2.1.
 *
 * THE BLOOM CONTRACT IS UNCHANGED AND IT IS THE BINDING CONSTRAINT: PostFXNodes
 * thresholds Rec709 luminance ≈1.0 on the POST-BLEND framebuffer, i.e. on
 * `tone × emissive × alpha`, NOT on the emissive multiplier alone. Link body,
 * at rest, mid-span, core: lum(COL_CYAN) 0.6201 × (2.1 × midProfile 1.15) ×
 * STREAM_ALPHA 0.62 = **0.928**, and ×1.04 at the shimmer peak = **0.966** —
 * under 1.0, so LINKS STILL DO NOT BLOOM (they only halo). The traveling
 * signals deliberately cross it (a packet bead ×2.2 → 2.04, the surge head
 * ×3.2 → 2.97, a full row hover ×2 → 1.86), exactly as designed. Headroom is
 * thin by construction: the product STREAM_EMISSIVE × STREAM_ALPHA must stay
 * under 1.0/(0.6201·1.15·1.04) = **1.348**; we sit at 2.1 × 0.62 = 1.302.
 * Raising either past that puts the resting mesh into bloom soup.
 *
 * Star cores keep RING_EMISSIVE 3.0 but now ride uStarPunch (STAR_PUNCH 2.2):
 * 3.0 × 2.2 × STAR_CORE_EMIS 1.25 = 8.25 at the very centre → post-blend
 * 0.889 × 8.25 × 1.0 = 7.33, i.e. **7.9× the link body** (round-8-D: 5.2×).
 * Stars are the subject and pull further ahead of the mesh, which is the
 * round-8-F brief's contract. Live-tunable via the dev handle (`uniforms`).
 */
export const STREAM_EMISSIVE = 2.1;
export const RING_EMISSIVE = 3.0;
/** At-rest alpha of a LINK particle disc. ROUND-8-F (live): 0.45 → 0.62 — the
 * pale thread was TOO pale to read as a filament at all. Bounded by the
 * post-blend bloom product above (2.1 × 0.62 = 1.302 < 1.348). Star cores use
 * NODE_ALPHA instead. */
export const STREAM_ALPHA = 0.62;
/**
 * Billboard size in device px (perspective-scaled in the shader; the
 * CORE_SIZE_BOOST/FRINGE_SIZE_DROP falloff rides on top).
 *
 * ROUND-8-F (LIVE-MEASURED): 3.6 → 7.5. This is the constant that actually
 * fixed the "dotted trails", and the round-8-D arithmetic had it backwards.
 * Density on a 680px band: link particles = 9000 − floor(9000·NODE_FRACTION)
 * − SPARK_COUNT = 6448, spread length-proportionally over ~227 delivered
 * links ⇒ ~28.4 particles per ~71px link = **2.5px spacing**. Against that:
 *   - at 3.6 the FRINGE sprite was 3.6 × FRINGE_SIZE_DROP 0.55 = **1.98px** —
 *     0.79× the spacing, i.e. NO OVERLAP: the pale outer strand was literally
 *     a dotted line. The 4.5px core overlapped only 1.8×.
 *   - at 7.5 the core sprite is 7.5 × CORE_SIZE_BOOST 1.25 = **9.4px** (3.8×
 *     the spacing) and the fringe 7.5 × 0.55 = **4.1px** (1.65×). Every
 *     cross-section strand now overlaps its neighbour → one continuous
 *     filament.
 * Fill budget: fill scales as pointSize², so this is (7.5/7.0)² = **1.15× the
 * ROUND-7 shipped fill** at identical particle counts on BOTH tiers — the
 * round-8-D 3.6 was the anomaly, not this. See NEURAL_PARTICLE_COUNT_COMPACT
 * for the lite check.
 */
export const NEURAL_POINT_SIZE = 7.5;
/** Base multiplier for STAR particles (the STAR_CORE_SIZE→STAR_TIP_SIZE
 * falloff rides on top → 15.1px at the core, ~3.9px at a flare tip on the
 * round-8-F point size: a crisp bloom point with fine spikes, and comfortably
 * wider than the 9.4px link filament so the stars stay the subject). */
export const RING_POINT_SIZE_BOOST = 1.15;
/** Depth size/brightness attenuation keyed on local z (aerial depth cue) —
 * with a genuinely volumetric cloud this is now the main depth read. */
export const NEURAL_DEPTH_ATTEN = 0.5;
/** Local z half-range the depth cue normalizes over — matches PLEXUS_RZ. */
export const DEPTH_Z_RANGE = PLEXUS_RZ;

// --- Sim (compute tier) ------------------------------------------------------
export const NEURAL_SPRING = 60;
/** ζ = DAMPING / (2·√SPRING) ≈ 0.55 — settles cleanly, no buzz. */
export const NEURAL_DAMPING = 8.5;
export const NEURAL_MAX_SPEED = 8;
/**
 * RECYCLE-STREAK FIX: when a link particle's flow-s wraps, its anchor
 * teleports ONE LINK LENGTH. The kernel hard-snaps pos to the anchor past
 * this threshold, and the wrap happens inside the EDGE_FADE tips (near-zero
 * alpha) so the reset is invisible.
 *
 * ROUND-8-D: 0.17 → 0.038. The plexus links are near-neighbour threads, not
 * layer-to-layer spans: the shortest DELIVERED link is EDGE_MIN_LOCAL = 0.055
 * (enforced in buildPlexus; measured minimum across all six mode×density
 * builds = 0.0551), so the threshold had to come down with it. The two
 * legitimate excursions that used to sit between 0.038 and 0.17 are now
 * handled explicitly instead of by headroom:
 *   - pointer bend — POINTER_PUSH cut 12 → 1.6 below. The bound is the
 *     steady-state spring displacement under the peak cursor acceleration,
 *     POINTER_PUSH / NEURAL_SPRING = 1.6/60 = 0.0267 (the radial term peaks
 *     at f² = 1 and the neural attractor passes orbit = 0, so nothing rides
 *     on top). That clears 0.038 by 1.4×, NOT the 2× an earlier draft of this
 *     note claimed — raising POINTER_PUSH above 2.28 breaks the invariant.
 *   - reveal lag / fray / re-cohere — the kernel only ARMS the snap in the
 *     steady state (uReveal > 0.9, uRecohere < 0.02, not dispersing), see the
 *     `armed` gate in neuralFieldCompute's simulate(). uReveal is damped at
 *     λ = 2.5 toward `scrollStore.reveal × visibility`, and scrollStore.reveal
 *     is only ever 0 or 1 (default 1), so the gate is reached ~0.9 s after the
 *     section scrolls in — it can never latch off permanently.
 * Curl stays ≈ CURL_GAIN·CURL_SCALE ≈ 0.0008 (round-8-F: CURL_SCALE tracked
 * STRAND_RADIUS 0.0028 → 0.0034, so 0.0007 → 0.00078; the curl term is added
 * OUTSIDE widthEnvelope, so ENVELOPE_BASE 1.8 does not scale it). Total
 * steady-state excursion 0.0267 + 0.0008 = 0.0275 < 0.038 — the guard still
 * clears by 1.38×. Invariant to preserve:
 * POINTER_PUSH/NEURAL_SPRING < WRAP_SNAP_DIST < EDGE_MIN_LOCAL ≤ the shortest
 * delivered link, and WRAP_SNAP_DIST > every steady-state excursion.
 */
export const WRAP_SNAP_DIST = 0.038;
/** Sparks track a fast analytic burst anchor — snap on the (invisible)
 * re-park jump between flashes so no backwards streak leaks. */
export const SPARK_SNAP_DIST = 0.12;

// --- Pointer bend (compute tier; existing unified force model) ---------------
/** Radial repulsion strength — the cursor locally bends nearby filaments.
 * ROUND-8-D: 12 → 1.6 so the max bend (~0.017) stays well under the new
 * WRAP_SNAP_DIST (see above). A dense mesh should dimple under the cursor,
 * not tear open. */
export const POINTER_PUSH = 1.6;
/** Influence radius (local units — anisotropic with the rect scale, fine). */
export const POINTER_RADIUS = 0.1;

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

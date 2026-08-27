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
 *   - links are THIN PALE LINES between NEAR NEIGHBOURS (k-nearest with a
 *     distance cutoff, deduped and capped) — a dense irregular triangulation
 *     of triangles/tetrahedra, never columns or layers. Since ROUND-8-G they
 *     are real line geometry, not particles strung along an edge;
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
 * TRANSPORT: node/edge data rides in the SAME uniformArrays as before
 * (uNodePos/uNodeT plus the endpoint tables, which ROUND 12 · STAGE 0B packed
 * from uEdgeA+uEdgeB into the single vec4 uEdgePack) — `.element()` is legal
 * in any stage and
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
 * ROUND-8-G (2026-08-24) — THE LINKS BECOME REAL LINES. Live-verified with the
 * owner watching: the reference brain-plexus has thin crisp CONTINUOUS lines
 * between bright star nodes, and our particle-strung links never became that.
 * Pushed to NEURAL_POINT_SIZE 7.5 → 10 and the strand envelope to 3.2 they
 * became a chain of glowing BLOBS — a glowing sprite ≥4px cannot render a 1px
 * line; the two are different primitives, so no constant was ever going to fix
 * it. The links are now REAL LINE GEOMETRY (one `LineSegments`, one draw call,
 * baked by neuralLinkLines.ts from the SAME getPlexus tables, shaded by
 * neuralFieldCompute.buildLinkLineLayer — see the LINK LINE LAYER section).
 * Three consequences ripple through this file:
 *   1. the LOOK constants for the new layer (LINE_*, LINK_SEGMENTS);
 *   2. the BRAID is zeroed (STRAND_RADIUS 0) so the traveling packet beads ride
 *      the exact chord the line draws, and the freed particle budget moves to
 *      the stars (NODE_FRACTION 0.28 → 0.46, STAR_FLARE_FRACTION 0.42 → 0.70:
 *      the 4 flare rays go from 2.6 to 7.0 particles each);
 *   3. the surviving link particles are TRAFFIC, not thread — STREAM_ALPHA is
 *      a 0.06 dust floor (0.012 since round-8-I, see below) with BEAD_ALPHA 0.9
 *      as its traveling peak, and the beads got more frequent (PACKET_COUNT
 *      1 → 2, RATE 0.22 → 0.3) because they are now the only thing moving on
 *      the lines.
 * Totals are unchanged (9000 / 3200) and the fill budget goes DOWN ~7% (see
 * NODE_FRACTION). No new bindings, no new storage, no per-frame allocation.
 *
 * ROUND-8-I (2026-08-24) — KILL THE HAZE. Second live pass on the round-8-G
 * build (owner's Chrome, foregrounded, authored slab confirmed loading). With
 * the LineSegments layer carrying the structure, the ~4,800 link-traffic
 * particles sitting AT REST were painting a FOG across the band — the reference
 * image has lines and stars and nothing in between, and the haze was flattening
 * both. Two constants, both live-verified, nothing structural:
 *   STREAM_ALPHA (uDustAlpha) 0.06 → **0.012**  — the resting dust drops 5×
 *   STAR_PUNCH   (uStarPunch) 2.2  → **3.2**    — the stars take the band back
 * Measured effect: the integrated resting-dust light falls from ≈5.2k to ≈1.0k
 * px²·lum across the band while the star core rises 7.33 → 10.67 post-blend, so
 * the star-to-haze ratio improves **7.3×**. What is NOT touched, by
 * construction: the packet BEADS (they ride uBeadAlpha 0.9, the other end of the
 * traffic ramp — still 3.65 post-blend) and the fracture DEBRIS (an ABSOLUTE
 * branch since round-8-G — see DEBRIS_ALPHA_MAX, whose read actually gains,
 * landing at 18.3× the resting dust where it sat at 3.7×). One consequence to
 * watch: at punch 3.2 the star FLARE TIP crosses the bloom floor for the first
 * time (1.029 vs the 0.707 it had) — the derivation and the tie point are at
 * STAR_CORE_EMIS.
 *
 * ROUND 9-B (2026-08-24) — THE NET SITS UNDER THE COPY. Owner: "la rete
 * neurale ora sta sopra le scritte, deve stare sotto, le scritte non si
 * leggono." Round 8-G/8-I made the plexus crisp and bright, and it now runs
 * across the ledger copy. This is a CONTRAST fix, not a stacking one (the
 * canvas is behind the DOM): a single 2D MASK — an x ramp derived from the real
 * `container-px` / `max-w-[34em]` geometry, times a gentler y term over the
 * text band — multiplies the OUTPUT ALPHA of the star/dust particles and of the
 * LineSegments layer, with a separate floor per layer. Both layers evaluate the
 * IDENTICAL pure function of LOCAL x/y at their own live position, so they
 * cannot disagree. Right of the ramp the mask is exactly 1 and every number
 * below is byte-identical. The derivation, the per-viewport table and the WCAG
 * arithmetic (5.38:1 at the brightest remaining pixel, AA 4.5:1) live at the
 * COPY-COLUMN MASK section at the bottom of this file.
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

/** Total particles in the plexus on a full-tier desktop (unchanged since the
 * round-8-D re-author; round-8-G re-SPLIT it — ~4,140 star particles, ~4,828
 * link-traffic beads/dust, 32 sparks — see NODE_FRACTION). */
export const NEURAL_PARTICLE_COUNT = 9000;
/**
 * Compact budget, selected when `tier === "lite"` (capable phones). Additive
 * fill is the real cost: 3,200 at DPR 1 ≈ one tenth the fill of 9,000 at
 * DPR 2. Same topology — the phone gets a thinner version of the same net.
 * Read via `useTierStore.getState()` in the BUILD path only, never as a
 * subscription inside the Canvas island (the R3F island commit wedge).
 *
 * ROUND-8-G LITE CHECK (the round-8-F entry it replaces argued link CONTINUITY
 * out of sprite overlap; continuity is the LINE layer's job now, so the check
 * is purely cost + bead sampling):
 *   - split: 1,472 stars (26.3 over 56 nodes) · 1,696 link-traffic particles
 *     (15.4 over 110 links) · 32 sparks.
 *   - fill at DPR 1: stars 442 core × 15.1px² + 1,030 flare × 8.4px² ≈ 173k,
 *     resting dust 1,696 × 3.4px² ≈ 20k, live beads ≈ 12k, the LINE layer
 *     (110 links × ~50px × 1px) ≈ 6k ⇒ **≈211k px²**, against the round-8-F
 *     figure of 281k on this same budget. The phone gets CHEAPER.
 *   - bead sampling on the thinner net: 15.4 particles over a ~50px link on a
 *     480px band = 3.2px spacing, so a PACKET_WIDTH 0.07 bead still spans ~3
 *     sprites at ±1σ — the same smooth travelling dot the desktop gets.
 *   - flare rays: 4.6 per ray over a 19.4px reach = 4.2px spacing against an
 *     ~8.4px mean flare sprite ⇒ 2.0× overlapped, continuous.
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
/**
 * ROUND 11 STAGE 1.5 — the seed count for a STONE-LESS island (`well: false`).
 * The crystal density well rejects ~22 % of the seeds, so a cloud built
 * without it from `PLEXUS_SEEDS` would deliver 132 nodes where the approved
 * band delivers 103 — a 28 % denser constellation with 28 % fewer particles
 * per star. These are the DELIVERED counts of the welled build, measured from
 * the shipped generator (`__sersanNeuralLattice_problem.plexus.nodes`), so a
 * stone-less island lands on exactly the approved density and the five islands
 * differ ONLY in where their nodes are — which is the whole point of the seed.
 * `svg` is listed for completeness; the DOM fallback always keeps the well.
 */
export const PLEXUS_SEEDS_STONELESS: Record<PlexusDensity, number> = {
  full: 103,
  lite: 56,
  svg: 46,
};
/** k of the k-nearest-neighbour link pass (before dedupe + cap). */
export const PLEXUS_K: Record<PlexusDensity, number> = {
  full: 4,
  lite: 4,
  svg: 3,
};
/** Hard ceiling on the delivered edge list — sizes the endpoint table
 * (uEdgePack since ROUND 12 · STAGE 0B; uEdgeA/uEdgeB when EDGE_PACKED is
 * rolled back). */
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
function clamp01h(x: number): number {
  return x < 0 ? 0 : x > 0.5 ? 0.5 : x;
}

// --- ROUND 12 STAGE 0C · THE GENERATOR'S BUILD ARGUMENTS ---------------------
/**
 * THE SHAPE ARM.
 *
 * `"ellipsoid"` is the shipped seeder and the DEFAULT: a centre-dense
 * golden-spiral ball (§1 of buildPlexus). Every pre-round-12 call site gets it
 * byte-for-byte by passing nothing.
 *
 * `"ribbon"` is the ROUND 12 / D17 arm: a RECT FILL in ribbon coordinates
 * (u ∈ [0,1] along the run, v ∈ [−0.5,+0.5] across it, w in depth), uniform in
 * u so the per-frame density is FLAT down the whole lateral run. It exists
 * because cranking `seeds` on the ellipsoid does NOT give a rectangle — it
 * gives a LENS. Measured at 454 nodes over a 7270 px field the end bins hold
 * 18–20 nodes over 343 px and the per-frame count swings 2.6×, which
 * re-creates the "three separate pieces" reading inside a single band.
 *
 * NOTHING CALLS THE RIBBON ARM YET. Stage 2 wires it (the field mapping, the
 * driver, the consumer migration); this stage only guarantees it exists, is
 * correct, and is inert.
 */
export type PlexusShape = "ellipsoid" | "ribbon";

/**
 * Every build-time constant the D17 ribbon has to move, as a PER-BUILD
 * ARGUMENT. Each one defaults to the module constant of the same name, so
 * `getPlexus(mode, density)` is byte-for-byte the shipped cloud — that is the
 * whole gate of this stage.
 *
 * WHY EACH ONE IS HERE (every one of these is a SILENT failure if it is left
 * at its band-shaped value under a 7278 × 935 field):
 *
 *  - `edgeCap` — `PLEXUS_EDGE_CAP.full` is 250. A net that wants ~1250 links
 *    would simply TRUNCATE to 250. No error, no warning. (This build now warns
 *    in dev and reports `edgeCapHit`.)
 *  - `bandAspect` — 0.45 is the band's aspect; the D17 field's is
 *    935/7278 = 0.1285. Left at 0.45, "nearest neighbour" is 3.5× more
 *    permissive in x than in y and the topology comes out wrong.
 *  - `edgeMinLocal` — 0.055 of a 1927 px-wide band is 106 px; 0.055 of a
 *    7278 px field is 400 px, which rejects the ENTIRE short-link population.
 *  - `seeds` / `k` / `linkCutoff` — they set N and E/N.
 *  - `radialPow` / `rx,ry,rz` / `warp` / `cx,cy` — the seeder's shape.
 *  - `wellCentre` / `wellInner` / `wellOuter` — CRYSTAL_POS is authored in
 *    BAND-local coordinates; under the ribbon the stone's x is a ribbon `u`.
 *  - `centroidK` — the 5-slice gaussian half-width is ≈0.10 of nodeT; over a
 *    3.79-band-long field that is 2.8 frames wide.
 *  - `wrapSnapCeil` / `wrapSnapFrac` — see `wrapSnapDist` on the Plexus.
 */
export interface PlexusBuildParams {
  /** Seeder arm. Default `"ellipsoid"` (the shipped cloud). */
  shape: PlexusShape;
  /** Candidate seed count. Default `PLEXUS_SEEDS[density]`, or
   * `PLEXUS_SEEDS_STONELESS[density]` when `well` is false. */
  seeds: number;
  /** k of the k-nearest pass. Default `PLEXUS_K[density]`. */
  k: number;
  /** Hard ceiling on the delivered edge list. Default
   * `PLEXUS_EDGE_CAP[density]`. */
  edgeCap: number;
  /** Link cutoff × meanSpacing. Default `PLEXUS_LINK_CUTOFF`. */
  linkCutoff: number;
  /** Build-time aspect (field height / field length) used to put x and y in
   * the same units before measuring. Default `BAND_ASPECT`. */
  bandAspect: number;
  /** Minimum RAW local link length. Default `EDGE_MIN_LOCAL`. */
  edgeMinLocal: number;
  /** Ellipsoid radial density exponent (r = U^(1/POW)). Default
   * `PLEXUS_RADIAL_POW`. Ignored by the ribbon arm. */
  radialPow: number;
  /** Ellipsoid direction jitter. Default `PLEXUS_DIR_JITTER`. Ignored by the
   * ribbon arm. */
  dirJitter: number;
  /**
   * RIBBON ONLY — the across-ribbon taper exponent: |v| = 0.5·U^vTaper.
   * `1` is a TRUE RECT FILL (uniform across v) and is the default, because
   * "rect fill" is what the owner approved and it is the flattest thing
   * available. `> 1` tapers toward the centreline (a thinner, more organic
   * top/bottom edge); `< 1` pushes mass to the rails. The organic (non
   * machined) rim is supplied by `warp`, which modulates the ACROSS extent
   * only and therefore never disturbs the per-frame density.
   */
  vTaper: number;
  /** RIBBON ONLY — the same law in depth. Default = `vTaper`. */
  wTaper: number;
  /** Cloud/ribbon centre, LOCAL units. Defaults `PLEXUS_CX` / 0. */
  cx: number;
  cy: number;
  /** Half-extents, LOCAL units. Defaults `PLEXUS_RX/RY/RZ`. */
  rx: number;
  ry: number;
  rz: number;
  /** Low-frequency boundary warp. Default `PLEXUS_WARP`. */
  warp: number;
  /** Crystal clearance well centre, LOCAL units. Default `CRYSTAL_POS[mode]`.
   * Only consulted when the build is welled (`well === true`). */
  wellCentre: readonly [number, number];
  /** Well radii, screen-round units. Defaults `CRYSTAL_CLEAR_INNER/OUTER`. */
  wellInner: number;
  wellOuter: number;
  /** Gaussian sharpness of the 5-slice centroid spine. Default
   * `PLEXUS_CENTROID_K`. */
  centroidK: number;
  /**
   * Re-centre the DELIVERED cloud on its own y bbox-centre.
   *
   * `false` for the ellipsoid (the shipped cloud is NOT re-centred and must
   * not become so), `true` for the ribbon. Measured today: the delivered band
   * sits at y ∈ [−0.3363, +0.4175], bbox-centre **+0.0406**, which is exactly
   * the measured 77 px top gap against 153 px bottom — a 2:1 asymmetry on a
   * 935 px frame (0.0406 × 935 = 38 px = (153 − 77)/2). Subtracting the
   * delivered bbox-centre closes it BY CONSTRUCTION, at any seed and under
   * any well carve — which is why it must NOT be closed by raising `ry`
   * (that would make the net taller than the frame instead of centred in it).
   */
  recentre: boolean;
  /** Ceiling on the derived `wrapSnapDist`. Default `WRAP_SNAP_DIST` (0.038),
   * so the default build derives exactly the shipped number. */
  wrapSnapCeil: number;
  /** Fraction of the SHORTEST DELIVERED link the snap threshold may take.
   * Default 0.69 — 0.038 / 0.0551, i.e. the shipped ratio. */
  wrapSnapFrac: number;
  /**
   * ROUND 12 · STAGE 2 — the factor the CALLER applies to the steady-state
   * excursion (pointer push + curl) in `neuralFieldCompute`. Default 1 = the
   * shipped, unscaled forces.
   *
   * It exists so `wrapSnapOk` tells the truth. This file cannot scale
   * `POINTER_PUSH` (it is consumed in the kernel), so before Stage 2 the
   * ribbon build warned "invariant unsatisfiable" even when the kernel was
   * about to divide the force by `L`. Passing `1/L` here makes the check
   * measure the force the kernel will actually apply. It changes NOTHING that
   * reaches the GPU — it is a diagnostic argument, not a look constant.
   */
  excursionScale: number;
}
export type PlexusParams = Partial<PlexusBuildParams>;

/**
 * RIBBON DEFAULTS. Authored so that a caller can ask for `{ shape: "ribbon",
 * seeds: N }` and get something GEOMETRICALLY CORRECT rather than a band-shaped
 * cloud stretched over a field — every one of these is a trap if it is left at
 * its ellipsoid value (see PlexusBuildParams).
 *
 * THE UNIT RIBBON: x ∈ [−0.5, +0.5] spans the WHOLE FIELD LENGTH; y and z
 * stay in FRAME-HEIGHT fractions exactly as they are today, so `bandAspect` is
 * the field's own aspect and everything authored in height fractions (rz,
 * CRYSTAL_CLEAR_*, NEURAL_DEPTH_VIEWPORT_SPAN) keeps its physical meaning. At
 * the reference 1920 × 935 the field is 3.791 band-widths = 7278 px long,
 * hence 935/7278 = 0.1284694, TRUNCATED and FROZEN here as 0.12846.
 * ⚠ It is a captured reference measurement, not a function of any module
 * constant, so nothing upstream can move it — and nothing upstream will
 * update it either (see the `edgeMinLocal` note below, which has the same
 * property and the same hazard).
 *
 * `ry` STAYS AT `PLEXUS_RY` (0.42) AND THAT IS DELIBERATE. Unlike the
 * ellipsoid — whose radial law and well leave it far short of its own rails —
 * a rect fill APPROACHES ry: the across-ribbon extent is warped and then
 * NORMALISED BY THE WARP'S OWN PEAK (see the `av` note in §1-RIBBON of
 * buildPlexus), so `ry` is a bound the rim reaches for and never ties.
 * MEASURED, broken/full, well:false, seeds 391/454/662/720: delivered
 * half-extent 0.3921–0.3963 = 93.4–94.4 % of `ry`, with ZERO nodes on the rail
 * at any of them. On a 935 px frame that is a ≈99 px edge gap per side rather
 * than the ≈75 px an exact ±ry fill would give, and it is SYMMETRIC — which
 * was the real complaint behind the measured 77 px / 153 px: the asymmetry was
 * never `ry`, it was the delivered cloud's off-centre bbox (+0.0406), which
 * `recentre` removes. If Stage 2 wants the 75 px gap back, raise `ry` to
 * ≈0.448 (0.42 / 0.938) and the rim stays organic. **Do not raise `ry` to 0.5
 * to "fill the frame", and do not chase the gap by clamping the warp at ±ry**
 * — the clamp is exactly what put 23–44 nodes per build bit-exactly on the
 * rail before ROUND 12's review, and a rail is a cut edge, not an organic one.
 *
 * `edgeMinLocal` — ⚠ AN AUTHORED CONSTANT, NOT A LIVE DERIVATION, AND IT DOES
 * NOT TRACK `EDGE_MIN_LOCAL`. Its INTENT is the honest translation of today's
 * guard: reject the same physical chord the band rejects — 0.055 of a ~1927 px
 * band ≈ 106 px, and 106 px of the 7278 px field ≈ 0.0146. But 0.01457 is a
 * captured number, and no quotient of the two aspect constants reproduces it:
 * `EDGE_MIN_LOCAL · RIBBON_FIELD_ASPECT / BAND_ASPECT` = 0.015701, the inverse
 * = 0.192667, and even the prose ratio `0.055 · 1927/7278` = 0.014562 (0.01457
 * implies a 1928.0 px band). The aspects cannot compose because `BAND_ASPECT`
 * (0.45) is an AUTHORED approximation of the band's true 935/1927 = 0.4852 —
 * the correct relation is a LENGTH ratio, not an aspect quotient, and this
 * file has no constant for either frame's pixel length. So: **a retune of
 * `EDGE_MIN_LOCAL` will NOT propagate here.** Retune both by hand, or first
 * give this file the two reference pixel lengths and derive both arms from
 * them.
 *
 * `edgeCap` is a GUARD, not a target: 1600 clears the 1258–1406 links the
 * areal-parity band delivers and still stops a runaway. Stage 2 sets it per
 * density. It is far below the 4096-link ceiling of the index-packed uniform
 * array (Stage 0B) and far above anything this arm should ever produce.
 */
export const RIBBON_FIELD_ASPECT = 0.12846;
export const RIBBON_DEFAULTS: Readonly<
  Pick<
    PlexusBuildParams,
    | "bandAspect"
    | "edgeMinLocal"
    | "edgeCap"
    | "cx"
    | "cy"
    | "rx"
    | "ry"
    | "rz"
    | "vTaper"
    | "warp"
    | "recentre"
  >
> = {
  bandAspect: RIBBON_FIELD_ASPECT,
  edgeMinLocal: 0.01457,
  edgeCap: 1600,
  cx: 0,
  cy: 0,
  rx: 0.5,
  ry: PLEXUS_RY,
  rz: PLEXUS_RZ,
  vTaper: 1,
  warp: PLEXUS_WARP,
  recentre: true,
};

// --- ROUND 12 · STAGE 2 · THE SHIPPED RIBBON ---------------------------------
/**
 * Reference field length in BAND-WIDTH units at 1920×935: `Λ + 1` where
 * `Λ = R·secH/vw = 1.0 × 5358 / 1920 = 2.791` (45°, a 5358 px act).
 *
 * ⚠ IT IS A REFERENCE, NOT THE LIVE VALUE. The live one is `uFieldLen`,
 * recomputed per measure from the frozen `secH` and the real `rect.w`, and on
 * a phone it is **12.79**, not 3.791. This constant exists for the two things
 * that must be decided BEFORE any rect is measured: the seed count (a build
 * -time table) and the `excursionScale` the WRAP_SNAP audit is run at. Both
 * are conservative at the desktop value — the phone's field is longer, so its
 * links are longer in mapped units and its snap margin is wider, not thinner.
 */
export const RIBBON_FIELD_LEN_REF = 3.791;

/**
 * THE RIBBON'S ACROSS-EXTENT, and it is NOT `PLEXUS_RY`.
 *
 * `RIBBON_DEFAULTS.ry` keeps 0.42 because Stage 0C's gate was "the shipped
 * tables, byte-identical". The delivered half-extent of a rect fill is
 * 0.938 × `ry` (the across coordinate is warped and then normalised by the
 * warp's own peak, so `ry` is a bound the rim approaches and never ties), so
 * 0.42 delivers ±0.3939 = a **99 px** gap per side on a 935 px frame. The
 * owner asked for the net to be exactly frame height. 0.42/0.938 = **0.448**
 * delivers ±0.4192 = **76 px** per side, MEASURED, and it is the whole of the
 * correction: the top/bottom ASYMMETRY (the shipped band's 77/153) is closed
 * separately and by construction by `recentre`, never by `ry`.
 *
 * ⚠ Do NOT raise it to 0.5 to "fill the frame" and do NOT clamp the warp at
 * ±ry: the clamp is what put 23–44 nodes bit-exactly on the rail before ROUND
 * 12's review, and a rail is a cut edge, not an organic one.
 */
export const RIBBON_RY = 0.448;

/**
 * THE STONE'S POSITION ON THE RIBBON, in ribbon x (`u`-like, ∈ [−0.5, +0.5]).
 *
 * `CRYSTAL_POS.broken.x = 0.17` is a BAND-local fraction and means nothing on
 * a field 3.79 band-widths long — read as a ribbon x it lands the stone at
 * `p ∈ [0.382, 0.740]`, i.e. mid-act, when D3 asks for "first sighted late".
 *
 * A point at MAPPED local x `X` is on frame while
 * `X ∈ [Λ(p − ½) − ½, Λ(p − ½) + ½]`, so first sighting is at
 * `p = ½ + (X + ½)/Λ`. `X = Λ/2 − ½ = 0.8955` ⇒ first sighted at **p = 0.642**
 * and still on frame at p = 1. Expressed in ribbon x (which is what the
 * generator's well and everything else authored on the field take),
 * `0.8955 / 3.791 = 0.23621` — and because it is authored as a FRACTION of the
 * field it stays late at every viewport: on the phone (Λ = 11.79) the same
 * 0.23621 is first sighted at p = 0.714.
 */
export const RIBBON_STONE_U = 0.23621;

/**
 * THE RIBBON'S CRYSTAL WELL — an explicit decision, with the measurement.
 *
 * `resolvePlexusParams` THROWS on `shape:"ribbon"` + `well:true` without an
 * explicit centre, because inheriting the band's `CRYSTAL_CLEAR_OUTER` (0.40
 * frame-heights) punches a hole 0.80 frame-heights tall through a ribbon whose
 * own half-extent is 0.419 — it severs the net. MEASURED at the shipped ry and
 * the three candidate densities, `wellCentre` at the stone:
 *
 *   inner/outer   N=389        N=656        N=825
 *   0.14 / 0.22   1 comp 100%  3 comp 99%   5 comp 99%   x-swing 1.83/1.50/1.57
 *   0.10 / 0.16   1 comp 100%  4 comp 99%   5 comp 99%   x-swing 1.29/1.29/1.22
 *   off           1 comp 100%  4 comp 99%   5 comp 99%   x-swing 1.29/1.29/1.22
 *
 * 0.14/0.22 fully clears the stone's silhouette (half-width 1.3945 ×
 * CRYSTAL_SCALE, half-height 1.66 × CRYSTAL_SCALE ⇒ 0.138 × 0.164 at the
 * ribbon's 0.0989) but costs 0.2–0.5 of x-density swing — it is a visible
 * local thinning on a net whose whole brief is evenness. 0.10/0.16 removes the
 * nodes that would sit ON the stone's core and leaves the swing bit-identical
 * to the un-welled build. It is the shipped choice; both are one argument.
 */
export const RIBBON_WELL_INNER = 0.1;
export const RIBBON_WELL_OUTER = 0.16;

/**
 * THE OWNER'S DENSITY A/B (D23). Three honest definitions of "the same
 * density as today", built, measured and ALL SHIPPED — the owner picks by eye
 * at the same scroll position, live, via
 * `setTraverseConfig({ problem: { ribbonDensity: "areal" } })`.
 *
 * Measured, broken, ry 0.448, well 0.10/0.16, `L = 3.791` desktop / 12.79 phone:
 *
 *  | arm       | seeds | N   | E    | packed | comps | swing | on frame  |
 *  |-----------|-------|-----|------|--------|-------|-------|-----------|
 *  | onFrame   |   391 | 389 |  814 | 3.19KiB| 1     | 1.29  | 102.6 / 214.7 |
 *  | areal     |   662 | 656 | 1332 | 5.20KiB| 4     | 1.29  | 173.0 / 351.4 |
 *  | nearest   |   835 | 825 | 1709 | 6.69KiB| 5     | 1.22  | 217.6 / 450.8 |
 *  | lite/onFrame | 716 | 710 | 1478 | 5.78KiB| 3   | 1.37  |  55.5 / 115.6 |
 *
 * Today's band delivers 103 nodes / 227 links on frame, so `onFrame` is the
 * SAME READ the owner has already approved, spread over the whole frame
 * instead of a centre lens; `areal` is the same TEXTURE and 1.69× more net on
 * frame; `nearest` equalises nearest-neighbour spacing.
 *
 * ⚠ TWO MEASURED CEILINGS, not opinions:
 *  - `nearest` packs to **6.69 KiB**, over this stage's own 6 KiB gate (still
 *    41 % of the 16 KiB WebGL2 floor, so it RUNS — it just is not a gated
 *    default).
 *  - the PHONE can only take `onFrame`. Its field is 12.79 band-widths, so
 *    areal parity there is 1212 seeds and `buildPlexus` THROWS at
 *    `PLEXUS_DEDUP_MAX_NODES` (1024). The lite tier is pinned to `onFrame`
 *    and warns in dev if it is asked for anything else.
 */
export type RibbonDensity = "onFrame" | "areal" | "nearest";
export const RIBBON_SEEDS: Record<
  RibbonDensity,
  Record<Exclude<PlexusDensity, "svg">, number>
> = {
  onFrame: { full: 110, lite: 210 },
  areal: { full: 331, lite: 358 },
  nearest: { full: 418, lite: 358 },
};

/**
 * Ceiling on the PARTICLE-COUNT multiplier the ribbon may ask for.
 *
 * `seedBuffers` splits a FIXED `count` across the delivered nodes and links
 * (measured: 40.19 sprites per star, 21.27 per link at 9000/103/227). Leave
 * `count` alone and a 389-node ribbon gets **2.1 sprites per star** — the
 * filled star-glow core the owner approved becomes two dots. So the count
 * rides the node count, and this is the brake:
 *
 *   onFrame full  ×3.78 → 34 006  (uncapped: the allocation is EXACT)
 *   areal   full  ×6.37 → capped 36 000, allocation 0.63×
 *   nearest full  ×8.01 → capped 36 000, allocation 0.50×
 *   onFrame lite ×12.68 → capped  9 600, allocation 0.24×
 *
 * ⚠ THE PHONE'S 0.24× IS A REAL, MEASURED LIMITATION AND IT IS STAGE 3's
 * CALL, not a look constant to tune here: 12.7× the compact budget on a phone
 * is exactly the number PART 6's open question 1 says nothing in source can
 * answer. Stage 3's escalation ladder ((i) half the lite density, (ii) shorten
 * the phone field) is the place it gets decided, WITH a GPU capture.
 */
// ROUND 13d — full 2.2 → 2.7. The 2.2 brake was sized for the 1-D strand
// (it silently capped CONDUIT_FILL_RIBBON at ×2.2/1.874 = +17%); the
// volumetric conduit plus the wider κ-window (RIBBON_WINDOW_PAD 2.08,
// winE 81 → 99 = −18% perLink) needs the headroom. Delivered count
// 9000·min(1.874·2.0, 2.7) = 24 300 — measured 59/55 fps at 19 800 on this
// machine's two backends, and still far under the 36 000 hard budget.
export const RIBBON_PARTICLE_SCALE_MAX: Record<
  Exclude<PlexusDensity, "svg">,
  number
> = { full: 2.7, lite: 1.8 };

/**
 * ── ROUND 12 · THE LINKS CURVE ─────────────────────────────────────────────
 *
 * The owner's own diagnosis, looking at the first particle build:
 *
 *   "sembra piu una struttura di vetro che una rete neurale, troppi angoli
 *    simmetrici e retti. la rete neurale e curva, non sono linee rette."
 *
 * He is right, and it is structural rather than a tuning miss. Every link has
 * always been a STRAIGHT CHORD between two node centres, and straight chords
 * meeting at a point are a truss — the eye reads crystal, not dendrite. No
 * amount of particle sizing fixes a topology drawn in straight segments.
 *
 * So each link becomes an ARC. In `edgeFrame`:
 *
 *   p(s) = mix(A, B, s) + perp · amp · 4s(1−s)
 *
 * `4s(1−s)` is zero at both ends and 1 at mid-span, so the link still lands
 * EXACTLY on its two nodes — the topology is untouched, only the path between
 * is. `perp` is a unit vector perpendicular to the chord, rolled about it by a
 * per-link hash so successive links do not all bow in the same plane, and
 * `amp` is a per-link SIGNED fraction of the chord length: a field where every
 * link bows the same way is a fabric, not a net. The variance is the point.
 *
 * The tangent is the analytic derivative of the same expression and REPLACES
 * the chord direction everywhere `edgeFrame` publishes `dir` — so the braid
 * cross-section, the fray and (the one that would have shown) the velocity
 * streak all follow the curve instead of cutting its corner.
 *
 * Peak lateral excursion is `LINK_BEND · |chord|` at mid-span, uniform in
 * [−1, +1] × this — but SATURATED at `LINK_BEND_MAX_RIBBON` (see below),
 * because a bow proportional to length all the way up turns the long links
 * into wide loops that cross their neighbours, and a net whose links loop
 * over each other reads as tangled string rather than as tissue.
 *
 * ⚠ RIBBON ONLY, via the build-time `RIB` ternary — `#production` keeps its
 * straight chords and its byte-for-byte contract.
 */
export const LINK_BEND_RIBBON = 0.22;
/**
 * Absolute ceiling on the mid-span bow, in local units, before the per-link
 * sign and magnitude hash. The delivered link length spans roughly 4× between
 * the shortest and the longest, so an un-capped proportional bow spans 4× too:
 * the short links read almost straight while the long ones swing far enough to
 * cross two neighbours. Saturating at ~1.6× the median link's own bow keeps
 * every link visibly curved and stops any of them from looping.
 */
export const LINK_BEND_MAX_RIBBON = 0.042;
/**
 * How far out of the ribbon plane the bow may roll, in radians, ± about the
 * chord. Full 2π (the first pass) sends the arcs in every direction in 3-space
 * and the field reads as a ball of wire. Dendritic tissue is broadly laminar:
 * it curves within its sheet and only leans out of it. ~34° gives depth and
 * parallax without the tangle.
 */
export const LINK_BEND_ROLL_RIBBON = 0.6;
/**
 * Dendritic taper. A real process is thickest where it leaves the soma and
 * thinnest at mid-span between two of them; a constant-width tube is the
 * single strongest "this was drawn by a computer" cue left once the path
 * curves. Multiplies the resting sprite diameter by
 * `mix(1, LINK_TAPER_RIBBON, 4s(1−s))`, i.e. full width at both nodes and this
 * fraction of it at mid-span.
 */
export const LINK_TAPER_RIBBON = 0.62;

/**
 * THE EXIT FADE — a NEW BEAT, and the owner has to approve it (PART 5 §7).
 *
 * Under the ribbon the net's screen y is CONSTANT in `p` by construction, so
 * at `p = 1` the net is still dead centre of the frame. `frame.active` is
 * `sy < secTop + secH`, i.e. it goes false at exactly `p = 1`, and
 * ScrollTrigger stops calling `apply()` there — so the frozen frame never
 * advances past the end and the field would simply STOP, frame-centred,
 * forever. There is no natural exit to fall back on; it has to be authored.
 *
 * Value: viewport heights of scroll, at the END of the act, over which the
 * field's alpha (particles AND lines AND both discard thresholds — a fade that
 * one of them misses is a pop) rides a smoothstep to zero. 1.0 vh means the
 * net is fully gone by `p = 1` and the section-keyed cull can flip without
 * cutting anything. Set to 0 for a hard cut (the A/B that shows what it buys).
 */
export const FIELD_EXIT_VH = 1.0;

/**
 * The ribbon's build arguments, in ONE place. `getPlexus(mode, density)` is
 * still today to the bit — this is only ever reached through an explicit
 * `ribbon` request.
 */
export function ribbonPlexusParams(
  density: PlexusDensity,
  ribbonDensity: RibbonDensity,
): PlexusParams {
  const tier: Exclude<PlexusDensity, "svg"> =
    density === "lite" ? "lite" : "full";
  let arm = ribbonDensity;
  if (tier === "lite" && arm !== "onFrame") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[plexus] ribbonDensity "${arm}" is not available on the lite tier ` +
          `(the phone field is 12.79 band-widths, so areal parity is 1212 ` +
          `seeds and buildPlexus throws at PLEXUS_DEDUP_MAX_NODES 1024). ` +
          `Falling back to "onFrame".`,
      );
    }
    arm = "onFrame";
  }
  return {
    shape: "ribbon",
    seeds: RIBBON_SEEDS[arm][tier],
    ry: RIBBON_RY,
    // A guard, not a target: the largest arm delivers 1709.
    edgeCap: 4000,
    wellCentre: [RIBBON_STONE_U, CRYSTAL_POS.broken[1]],
    wellInner: RIBBON_WELL_INNER,
    wellOuter: RIBBON_WELL_OUTER,
    // The kernel divides the pointer push and the curl by L (see
    // `uFieldK` in neuralFieldCompute) — tell the audit so it measures the
    // force that will actually be applied.
    excursionScale: 1 / RIBBON_FIELD_LEN_REF,
  };
}

/** Fully-resolved build arguments — every field present, no optionals. */
type ResolvedPlexusParams = PlexusBuildParams;

function resolvePlexusParams(
  mode: LatticeMode,
  density: PlexusDensity,
  well: boolean,
  params?: PlexusParams,
): ResolvedPlexusParams {
  const shape: PlexusShape = params?.shape ?? "ellipsoid";
  const ribbon = shape === "ribbon";
  const d = RIBBON_DEFAULTS;
  // ⚠ THE CRYSTAL DENSITY WELL HAS NO RIBBON GEOMETRY, AND INHERITING THE
  // BAND'S SEVERS THE NET. `wellCentre` is authored in BAND local x
  // (CRYSTAL_POS) while the clearance radii are FRAME-HEIGHT fractions, and
  // the well test is screen-round — so on a field 7.8 frame-heights long it
  // carves a hole nearly as TALL as the ribbon and cuts it clean through.
  // MEASURED at the ribbon defaults, broken/full, with THIS guard lifted so
  // the well:true build could be run — seeds 391: 4 components, largest
  // 250/369 (68 %), 20-bin x-density swing 5.25×; seeds 662: 7 components,
  // largest 413/626 (66 %), swing 7.40×; seeds 720: 6 components, largest
  // 462/684 (68 %), swing 5.13× — each with a full-height hole at the well's
  // x. With `well:false` the same builds are 3/5/5 components, largest
  // 98.2/98.3/98.2 %, swing 1.11/1.23/1.24×. That is the
  // "confetti, not a net" failure mode by a second route, so it FAILS LOUDLY
  // rather than shipping a hole-punched ribbon. `RIBBON_DEFAULTS` deliberately
  // does NOT carry a substitute well: what radius clears which stone on which
  // island is a Stage 2 design decision, not a number this file may invent.
  if (ribbon && well && params?.wellCentre === undefined) {
    throw new Error(
      `resolvePlexusParams: shape "ribbon" with well=true and no explicit ` +
        `wellCentre. The crystal density well is authored for the BAND ` +
        `frame; on the ribbon it carves a screen-round hole nearly as tall ` +
        `as the field and severs the net (measured at seeds 391/662/720: ` +
        `4/7/6 components, largest 66-68 %, 20-bin x-density swing ` +
        `5.13-7.40x, against a 98 %-connected net at 1.11-1.24x with the ` +
        `well off). Pass well=false — an island ` +
        `with no stone in it needs no clearance — or author wellCentre / ` +
        `wellInner / wellOuter for the ribbon frame explicitly.`,
    );
  }
  const vTaper = params?.vTaper ?? (ribbon ? d.vTaper : 1);
  return {
    shape,
    seeds:
      params?.seeds ??
      (well ? PLEXUS_SEEDS[density] : PLEXUS_SEEDS_STONELESS[density]),
    k: params?.k ?? PLEXUS_K[density],
    edgeCap: params?.edgeCap ?? (ribbon ? d.edgeCap : PLEXUS_EDGE_CAP[density]),
    linkCutoff: params?.linkCutoff ?? PLEXUS_LINK_CUTOFF,
    bandAspect: params?.bandAspect ?? (ribbon ? d.bandAspect : BAND_ASPECT),
    edgeMinLocal:
      params?.edgeMinLocal ?? (ribbon ? d.edgeMinLocal : EDGE_MIN_LOCAL),
    radialPow: params?.radialPow ?? PLEXUS_RADIAL_POW,
    dirJitter: params?.dirJitter ?? PLEXUS_DIR_JITTER,
    vTaper,
    wTaper: params?.wTaper ?? vTaper,
    cx: params?.cx ?? (ribbon ? d.cx : PLEXUS_CX),
    cy: params?.cy ?? (ribbon ? d.cy : 0),
    rx: params?.rx ?? (ribbon ? d.rx : PLEXUS_RX),
    ry: params?.ry ?? (ribbon ? d.ry : PLEXUS_RY),
    rz: params?.rz ?? (ribbon ? d.rz : PLEXUS_RZ),
    warp: params?.warp ?? (ribbon ? d.warp : PLEXUS_WARP),
    wellCentre: params?.wellCentre ?? CRYSTAL_POS[mode],
    wellInner: params?.wellInner ?? CRYSTAL_CLEAR_INNER,
    wellOuter: params?.wellOuter ?? CRYSTAL_CLEAR_OUTER,
    centroidK: params?.centroidK ?? PLEXUS_CENTROID_K,
    recentre: params?.recentre ?? (ribbon ? d.recentre : false),
    wrapSnapCeil: params?.wrapSnapCeil ?? WRAP_SNAP_DIST,
    wrapSnapFrac: params?.wrapSnapFrac ?? WRAP_SNAP_FRAC,
    excursionScale: params?.excursionScale ?? 1,
  };
}

/** Deterministic signature of the resolved arguments — the memo key. */
function paramSig(p: ResolvedPlexusParams): string {
  return [
    p.shape,
    p.seeds,
    p.k,
    p.edgeCap,
    p.linkCutoff,
    p.bandAspect,
    p.edgeMinLocal,
    p.radialPow,
    p.dirJitter,
    p.vTaper,
    p.wTaper,
    p.cx,
    p.cy,
    p.rx,
    p.ry,
    p.rz,
    p.warp,
    p.wellCentre[0],
    p.wellCentre[1],
    p.wellInner,
    p.wellOuter,
    p.centroidK,
    p.recentre ? 1 : 0,
    p.wrapSnapCeil,
    p.wrapSnapFrac,
    p.excursionScale,
  ].join(",");
}

/**
 * The largest node count the edge de-duplication key `a * 1024 + b` can carry
 * INJECTIVELY. Above it the key collides and the builder SILENTLY DROPS edges
 * — it does not throw, it just delivers a thinner net than it built. The D17
 * band is 662–720 nodes so it clears this, but the phone's 716 and any future
 * density bump sit close enough that the failure has to be loud.
 */
export const PLEXUS_DEDUP_MAX_NODES = 1024;

/**
 * The shipped ratio of `WRAP_SNAP_DIST` to the shortest delivered link
 * (0.038 / 0.0551). See `Plexus.wrapSnapDist`.
 */
export const WRAP_SNAP_FRAC = 0.69;

export interface Plexus {
  /** Node centres [x, y, z] in LOCAL space — seeds uNodePos. */
  nodes: [number, number, number][];
  /** Per-node WEAK left→right coordinate (normalized x, 0..1) — seeds
   * uNodeT. Everything narrative (surge wavefront, fracture, ignition
   * regions, row windows, cool→warm tint) is parameterized on THIS. */
  nodeT: number[];
  /** Near-neighbour links [a, b], ORIENTED so nodeT[a] ≤ nodeT[b] (flow and
   * packet traffic therefore always run left→right and converge on the
   * right-hand star) — seeds the endpoint table (uEdgePack; uEdgeA/uEdgeB
   * under the EDGE_PACKED rollback). */
  edges: [number, number][];
  /** The 5 x-slice centroids = the uC0..uC4 registration spine. */
  centroids: [number, number, number][];
  /** Diagnostics (dev handle / docs): mean nearest-neighbour spacing in
   * screen-height units, and the shortest delivered edge in LOCAL units
   * (must exceed WRAP_SNAP_DIST). */
  meanSpacing: number;
  minEdgeLocal: number;
  /**
   * ROUND 11 STAGE 1.5 — a structural fingerprint, so an island sequence can
   * PROVE its constellations differ rather than assert it (QA gate 4). Node
   * and edge COUNTS are a weak test (two seeds can deliver the same counts and
   * a completely different cloud), so these are shape statistics: connected
   * components, the biggest one, the mean edge length, and a position
   * checksum over every node.
   */
  components: number;
  largestComponent: number;
  meanEdgeLocal: number;
  /**
   * ROUND 12 STAGE 0C — the arm this cloud came out of, and the arguments it
   * was built with. Inert diagnostics: nothing on the frame path reads them.
   */
  shape: PlexusShape;
  /**
   * ROUND 12 · STAGE 2 FIX — the metric this cloud's TOPOLOGY was built in,
   * published because `seedBuffers` needs it and was measuring in a different
   * one. `sd()` un-squashes x by this before asking "how far apart are these
   * two nodes ON SCREEN"; the per-link particle ALLOCATION was using raw
   * `hypot(dx, dy, dz)` instead. On the shipped band the two differ by
   * 1/0.45 = 2.2×; on the ribbon, whose `bandAspect` is 0.12846 BECAUSE
   * `fieldMap` then stretches x by `uFieldLen` = 3.791, they differ by
   * **7.784× — exactly the stretch** — so an x-dominant link is allocated
   * 7.8× fewer particles per delivered screen pixel than a y-dominant one,
   * and the delivered along-link spacing spreads instead of being uniform.
   * Publishing it lets the allocation use the SAME metric the topology was
   * chosen in, which is the only self-consistent choice available.
   */
  bandAspect: number;
  /** Delivered y bbox — `yMid` is the number the ribbon re-centres ON. Today's
   * shipped band reports −0.3363 / +0.4175 / **+0.0406**, and that +0.0406 IS
   * the measured 77 px-top / 153 px-bottom asymmetry on a 935 px frame. */
  yMin: number;
  yMax: number;
  yMid: number;
  /** True when `edgeCap` bit — i.e. the generator BUILT more links than it
   * delivered. Silent truncation is the sharpest trap in this generator, so it
   * is reported (and warned about in dev) rather than swallowed. */
  edgeCapHit: boolean;
  /**
   * PER-BUILD `WRAP_SNAP_DIST`, derived rather than assumed.
   *
   * The kernel's recycle snap teleports an edge particle's anchor by ONE EDGE
   * LENGTH on a flow-s wrap, so the threshold must sit BELOW the shortest
   * delivered link and ABOVE every steady-state excursion:
   *
   *   POINTER_PUSH/NEURAL_SPRING + curl < wrapSnapDist < shortest link
   *
   * `min(wrapSnapCeil, minEdgeLocal × wrapSnapFrac)`. On the default build
   * that is `min(0.038, 0.0551 × 0.69 = 0.038019)` = **0.038 exactly**, the
   * shipped constant — so wiring this up changes nothing today. Under the
   * ribbon the shortest delivered link falls to 0.0146–0.0201 LOCAL (x is
   * stretched 3.8×), the module constant 0.038 is 2× too large, the snap never
   * fires, and the bright spring-flight streak returns on the WebGPU tier.
   *
   * ⚠ `wrapSnapOk` false means the invariant CANNOT be satisfied at these
   * arguments — the pointer/curl excursion floor is above the derived
   * threshold. On the ribbon that is a real finding, not a rounding error:
   * POINTER_PUSH is a LOCAL-units force, so a 3.8×-longer local x-axis makes
   * the same constant push 3.8× further in pixels. It must be scaled by 1/L
   * in `neuralFieldCompute.ts` (Stage 2), which this file cannot do.
   */
  wrapSnapDist: number;
  wrapSnapOk: boolean;
  /** The steady-state excursion the snap threshold had to clear, AFTER the
   * caller's `excursionScale`. Reported so a `wrapSnapOk` verdict can be
   * audited without re-deriving it. */
  excursionFloor: number;
  /**
   * ROUND 12 · STAGE 2 — the delivered x bbox, published because `nodeT` is
   * `(x − xMin)/xSpan` and the ribbon has to invert that: `FRACTURE_T` is no
   * longer an authored 0.62 but "the stone's own `u`", and the only honest way
   * to name it is to run the stone's ribbon x through the SAME normalisation
   * the nodes went through. (On the ellipsoid arm nothing reads these.)
   */
  xMin: number;
  xSpan: number;
  /** Deterministic checksum of every node position, 6 significant digits. */
  checksum: number;
}

const plexusCache = new Map<string, Plexus>();

/**
 * The mode's DEFAULT master seed — the one number that decorrelates two clouds
 * built from identical code. These two values are the shipped constellations
 * (`broken` = the Problem band, `healthy` = the ProductionGrade band) and must
 * not move: every screenshot the owner has approved is of these.
 *
 * ROUND 11 STAGE 1.5 — `ms` is now an ARGUMENT rather than a literal, which is
 * the whole mechanism behind the island SEQUENCE (coverage-trilemma dossier
 * §7.1/§8①). Five islands of the same code, five seeds, five visibly different
 * constellations — and zero shader edits, because the seed only ever reaches
 * the GPU as the CONTENTS of the plexus tables that already exist — uNodePos /
 * uNodeT and the endpoint table (uEdgePack since ROUND 12 · STAGE 0B).
 */
export const PLEXUS_MASTER_SEED: Record<LatticeMode, number> = {
  broken: 11.37,
  healthy: 57.19,
};

/** Memoized deterministic plexus for a mode + density (+ seed / clearance /
 * build arguments).
 * Pure — same inputs always give the same cloud, so the compute build, the
 * static/analytic build and the SVG twin all agree without sharing any runtime
 * state. Omitting `seed`/`well` reproduces the shipped cloud EXACTLY, so every
 * pre-round-11 call site is byte-identical.
 *
 * ROUND 12 STAGE 0C — `params` is the fifth, optional argument: every build
 * constant the D17 ribbon needs to move, each defaulting to the module
 * constant it replaces (see PlexusBuildParams). **Omitting it is today, to the
 * bit** — that is the whole gate of the stage, and it is why the shipped
 * ellipsoid is the default arm rather than a flag anyone has to remember. */
export function getPlexus(
  mode: LatticeMode,
  density: PlexusDensity = "full",
  seed?: number,
  well = true,
  params?: PlexusParams,
): Plexus {
  const ms = Number.isFinite(seed as number)
    ? (seed as number)
    : PLEXUS_MASTER_SEED[mode];
  const p = resolvePlexusParams(mode, density, well, params);
  const key = `${mode}:${density}:${ms}:${well ? 1 : 0}:${paramSig(p)}`;
  const hit = plexusCache.get(key);
  if (hit) return hit;
  const built = buildPlexus(mode, density, ms, well, params);
  plexusCache.set(key, built);
  return built;
}

export function buildPlexus(
  mode: LatticeMode,
  density: PlexusDensity,
  // Decorrelates one cloud from another — the two modes by default, and since
  // round 11 the five Act-I islands from each other (see PLEXUS_MASTER_SEED).
  ms: number,
  // The CRYSTAL DENSITY WELL. It carves silhouette clearance for the stone, so
  // it belongs only to the band the stone actually rides. An island with no
  // stone in it would otherwise show an unexplained void — and, worse, the
  // SAME void in the same place on all five, which is repetition where the
  // seed is trying to buy variety.
  well: boolean,
  // ROUND 12 STAGE 0C — the per-build arguments. Every field defaults to the
  // module constant of the same name, so `buildPlexus(mode, density, ms, well)`
  // is byte-for-byte the shipped generator.
  params?: PlexusParams,
): Plexus {
  const P = resolvePlexusParams(mode, density, well, params);
  const seeds = P.seeds;
  const [ccx, ccy] = P.wellCentre;
  const GOLD = Math.PI * (3 - Math.sqrt(5));

  // --- 1. Seed the cloud ---------------------------------------------------
  const nodes: [number, number, number][] = [];
  // Well test, shared by both arms — a screen-ROUND 2D distance (x converted
  // with the build aspect, z ignored: what must stay readable is the stone's
  // SILHOUETTE). Skipped on a stone-less island: no stone, no clearance.
  const keptByWell = (i: number, x: number, y: number): boolean => {
    if (!well) return true;
    const d = Math.hypot((x - ccx) / P.bandAspect, y - ccy);
    const keep = smooth01(d, P.wellInner, P.wellOuter);
    return ph(i + ms, 127.1, 311.7) <= keep;
  };

  if (P.shape === "ribbon") {
    // --- 1-RIBBON. A RECT FILL in ribbon coordinates -----------------------
    // u ∈ [0,1] along the run, v ∈ [−0.5,+0.5] across it, w in depth.
    //
    // UNIFORM IN u is the entire point: the per-frame node count must not vary
    // down the run, or one band re-creates inside itself the "separate pieces"
    // reading the ellipsoid's lens produces when it is stretched. MEASURED —
    // 20 equal x-bins over the delivered bbox, max/min, broken/full,
    // well:false, seeds 391 / 662 / 720: this rect fill delivers
    // 1.11× / 1.23× / 1.24× (1.37× at 454, so call it 1.1–1.4× across the
    // range), against 9.20× / 12.0× / 9.43× for the ellipsoid seeder given the
    // SAME field, extents and guards. ⚠ The "2.98× against 1.03×" this note
    // used to carry reproduces in neither direction at 20 bins; these numbers
    // do. Re-measure the same way before quoting anything else.
    //
    // ⚠ THE STRATIFICATION MUST BE ISOTROPIC IN SCREEN UNITS, NOT IN RIBBON
    // UNITS. This is the trap that ate the first draft. Any [0,1]^d uniform
    // sequence (R2/R3, Halton, golden-angle) stratifies EQUALLY per axis, so
    // mapping it onto a 9.3 : 1 box gives cells 837 × 90 × 43 px — the point
    // set collapses into sheets normal to x and the "net" delivers ~35
    // disconnected components with a largest of 38 out of 662. Deriving the
    // strata counts from the field's own aspect A instead gives 93 × 87 px
    // cells and one net.
    //
    //   A    = physical length / physical height, in frame-height units
    //   nU   = round(sqrt(N·A)),  nV = N / nU  ⇒ square cells by construction
    //
    // Columns are then filled EVENLY (`floor(i·nU/N)`, never `i % nU`, which
    // would pile every remainder column at the left and re-introduce a density
    // gradient), each column stratifies its own members across v, and a
    // per-point jitter breaks the grid. The taper is radial ACROSS v ONLY
    // (`vTaper`; 1 = a true rect fill), and the organic, non-machined rim
    // comes from `warp`, which modulates the ACROSS extent and never u.
    const A = Math.max(
      1e-3,
      (P.rx * 2) / P.bandAspect / Math.max(P.ry * 2, 1e-6),
    );
    const nU = Math.max(1, Math.round(Math.sqrt(Math.max(seeds, 1) * A)));
    for (let i = 0; i < seeds; i++) {
      // Even column assignment + this point's index inside its column.
      const col = Math.min(nU - 1, Math.floor((i * nU) / seeds));
      const colLo = Math.ceil((col * seeds) / nU);
      const colHi = Math.ceil(((col + 1) * seeds) / nU);
      const m = Math.max(1, colHi - colLo);
      const row = i - colLo;
      // Jitter inside the cell — deterministic, and the only thing standing
      // between a stratified fill and a visible lattice.
      const ju = ph(i + ms, 12.9898, 78.233);
      const jv = ph(i + ms, 39.3467, 11.135);
      const jw = ph(i + ms, 73.156, 52.235);
      const u = (col + ju) / nU;
      // Signed across-ribbon coordinate, stratified within the column.
      const tv = 2 * ((row + jv) / m) - 1;
      const tw = 2 * jw - 1;
      const warpV =
        1 + P.warp * Math.sin(u * 12.9 + ms) * Math.cos(tv * 5.4 - ms);
      // ⚠ NORMALISED BY THE WARP'S PEAK, NOT CLAMPED AT THE RAIL. `warpV`
      // peaks at 1 + |warp| (1.22 at the shipped PLEXUS_WARP), so the first
      // draft's `clamp01h(0.5·|tv|^vTaper·warpV)` SATURATED: every point whose
      // warped extent passed 0.5 truncated to exactly 0.5 and landed on
      // y = ±ry BIT-EXACTLY. Measured before this fix: 23/391, 24/454, 36/662
      // and 44/720 delivered nodes sitting on the rail — precisely the
      // "machined, cut edge" the arm's own docstring above forbids, arrived at
      // through the back door. Dividing by the peak preserves the SAME
      // relative modulation (warpV/(1+|warp|) ∈ [(1−|w|)/(1+|w|), 1]) and makes
      // `ry` a bound the rim APPROACHES and never ties. `clamp01h` stays as a
      // guard for exotic caller arguments; it is no longer load-bearing here.
      const av = clamp01h(
        (0.5 * Math.pow(Math.abs(tv), P.vTaper) * warpV) /
          (1 + Math.abs(P.warp)),
      );
      const aw = clamp01h(0.5 * Math.pow(Math.abs(tw), P.wTaper));
      const v = tv < 0 ? -av : av;
      const w = tw < 0 ? -aw : aw;
      const x = P.cx + (u - 0.5) * 2 * P.rx;
      const y = P.cy + v * 2 * P.ry;
      const z = w * 2 * P.rz;
      if (!keptByWell(i, x, y)) continue;
      nodes.push([x, y, z]);
    }
  } else {
    // --- 1-ELLIPSOID. The shipped volumetric cloud, unchanged --------------
    for (let i = 0; i < seeds; i++) {
      // Golden-spiral direction on the unit sphere + a jitter that breaks its
      // regularity (organic, still deterministic).
      const u = (i + 0.5) / seeds;
      let dz = 1 - 2 * u;
      const sr = Math.sqrt(Math.max(0, 1 - dz * dz));
      const phi = i * GOLD + ms;
      let dx =
        sr * Math.cos(phi) + (ph(i + ms, 12.9898, 78.233) - 0.5) * P.dirJitter;
      let dy =
        sr * Math.sin(phi) + (ph(i + ms, 39.3467, 11.135) - 0.5) * P.dirJitter;
      dz += (ph(i + ms, 73.156, 52.235) - 0.5) * P.dirJitter;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      // Centre-dense radius with a low-frequency organic boundary warp.
      const rr = Math.pow(ph(i + ms, 91.318, 27.719), 1 / P.radialPow);
      const warp = 1 + P.warp * Math.sin(dx * 3.1 + ms) * Math.cos(dy * 2.7 - ms);
      const r = Math.min(1, Math.max(0.05, rr * warp));
      const x = P.cx + dx * r * P.rx;
      const y = P.cy + dy * r * P.ry;
      const z = dz * r * P.rz;
      if (!keptByWell(i, x, y)) continue;
      nodes.push([x, y, z]);
    }
  }

  // --- 1b. RE-CENTRE ON THE DELIVERED y BBOX-CENTRE ------------------------
  // Ribbon only (`recentre`); the ellipsoid ships un-recentred and must stay
  // that way. The delivered band sits at y ∈ [−0.3363, +0.4175] — bbox-centre
  // +0.0406 — because the well carves the stone's side, and that +0.0406 is
  // EXACTLY the measured 77 px top gap against 153 px at the bottom on a
  // 935 px frame. Subtracting the delivered centre closes the 2:1 asymmetry at
  // any seed and under any carve. It must NOT be closed by raising `ry`: that
  // makes the net taller than the frame instead of centred in it.
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const n of nodes) {
    if (n[1] < yLo) yLo = n[1];
    if (n[1] > yHi) yHi = n[1];
  }
  if (!nodes.length) {
    yLo = 0;
    yHi = 0;
  }
  let yMid = (yLo + yHi) / 2;
  if (P.recentre && nodes.length) {
    for (const n of nodes) n[1] -= yMid;
    yLo -= yMid;
    yHi -= yMid;
    yMid = 0;
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
  // ⚠ THE DE-DUP KEY IS `a * PLEXUS_DEDUP_MAX_NODES + b` (below). It is
  // injective only while N ≤ PLEXUS_DEDUP_MAX_NODES, and above that it
  // SILENTLY DROPS EDGES rather than throwing — the net would simply come out
  // thinner than it was built, with no error anywhere. Fail loudly instead.
  // (uNodePos also runs out of uniform-array elements one node past it, and
  // neuralFieldCompute's EDGE_PACK_RADIX packs against the SAME ceiling, so
  // this is the real limit three times over — see the throw's own text.)
  if (N > PLEXUS_DEDUP_MAX_NODES) {
    throw new Error(
      `buildPlexus: ${N} delivered nodes exceeds PLEXUS_DEDUP_MAX_NODES ` +
        `(${PLEXUS_DEDUP_MAX_NODES}). The edge de-dup key ` +
        `a*PLEXUS_DEDUP_MAX_NODES+b stops being injective above it and would ` +
        `drop edges silently. THREE sites carry this one ceiling and must be ` +
        `widened TOGETHER (e.g. all to 4096): PLEXUS_DEDUP_MAX_NODES here, ` +
        `the uNodePos uniform-array binding, AND \`EDGE_PACK_RADIX\` in ` +
        `neuralFieldCompute.ts — that last one packs both endpoints as ` +
        `a + EDGE_PACK_RADIX*b, so leaving it at 1024 does NOT throw: every ` +
        `link with an endpoint >= 1024 silently DECODES to two wrong nodes ` +
        `(nodeAt/nodeTAt clamp rather than fail). Or lower \`seeds\`.`,
    );
  }
  /** Distance in SCREEN-height units (x un-squashed by the build aspect). */
  const sd = (a: number, b: number) =>
    Math.hypot(
      (nodes[a][0] - nodes[b][0]) / P.bandAspect,
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
    if (!well) return false;
    const mx = (nodes[a][0] + nodes[b][0]) / 2;
    const my = (nodes[a][1] + nodes[b][1]) / 2;
    return Math.hypot((mx - ccx) / P.bandAspect, my - ccy) < P.wellInner;
  };

  let nnSum = 0;
  const ranked: { j: number; d: number }[][] = [];
  for (let i = 0; i < N; i++) {
    const cand: { j: number; d: number }[] = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      if (ld(i, j) < P.edgeMinLocal) continue;
      if (midInWell(i, j)) continue;
      cand.push({ j, d: sd(i, j) });
    }
    cand.sort((p, q) => p.d - q.d || p.j - q.j);
    ranked.push(cand);
    nnSum += cand.length ? cand[0].d : 0;
  }
  const meanSpacing = N ? nnSum / N : 0;
  const cutoff = meanSpacing * P.linkCutoff;

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
    const key = a * PLEXUS_DEDUP_MAX_NODES + b;
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
  const k = P.k;
  for (let i = 0; i < N; i++) {
    const cand = ranked[i];
    for (let c = 1; c < Math.min(k, cand.length); c++) {
      if (cand[c].d > cutoff) break;
      push(extra, i, cand[c].j, cand[c].d);
    }
  }
  extra.sort((p, q) => p.d - q.d || p.a - q.a || p.b - q.b);
  const cap = P.edgeCap;
  const built = must.length + extra.length;
  // ⚠ SILENT TRUNCATION. `slice(0, cap)` is the sharpest trap in this
  // generator: at PLEXUS_EDGE_CAP.full = 250 a net that wants ~1250 links just
  // becomes a 250-link net, with no error and no warning anywhere. Report it.
  const edgeCapHit = built > cap;
  if (edgeCapHit && process.env.NODE_ENV !== "production") {
    console.warn(
      `[plexus] ${mode}/${density} edgeCap ${cap} TRUNCATED ${built} built ` +
        `links to ${cap}. Raise \`edgeCap\` (and size the uniform arrays for ` +
        `it) or the delivered net is not the net you authored.`,
    );
  }
  const chosen = must.concat(extra).slice(0, cap);
  const edges: [number, number][] = chosen.map((e) => [e.a, e.b]);
  let minEdgeLocal = Infinity;
  for (const [a, b] of edges) minEdgeLocal = Math.min(minEdgeLocal, ld(a, b));
  if (!edges.length) minEdgeLocal = 0;

  // --- 3a. ROUND 12 · D — THE κ REORDER (RIBBON ONLY) ----------------------
  //
  // Sort nodes AND edges by the on-frame key `κ = u + dir·R·bandAspect·v`, so
  // that "on frame" is a CONTIGUOUS INDEX RANGE in both tables and the
  // rolling window in `seedBuffers` / `edgeFrame` becomes one integer
  // uniform each. See `RIBBON_WINDOW_PAD` for the derivation; the short form
  // is that κ is `mapped y ÷ μ`, and mapped y is an exact affine function of
  // SCREEN y for every point of a sheared band.
  //
  // ⚠ RIBBON ONLY, AND THAT IS A HARD GATE, not tidiness. Reordering nodes
  // changes `checksum` (it is index-weighted) and re-hashes every per-link
  // and per-node decorrelation in the shaders. `#production` is byte-for-byte
  // ({101, 229}, checksum −420.464007) and the SVG twin builds at the `svg`
  // density through this same function.
  //
  // ⚠ ORIENTATION SURVIVES. Edges are stored `[a, b]` with `nodeT[a] ≤
  // nodeT[b]` so flow and packets run left→right; this remaps INDICES only
  // and never re-pairs, so the invariant holds by construction.
  if (P.shape === "ribbon" && N > 0) {
    const kappa = (i: number) =>
      nodes[i][0] + RIBBON_KAPPA_K * P.bandAspect * nodes[i][1];
    const order = new Array<number>(N);
    for (let i = 0; i < N; i++) order[i] = i;
    order.sort((i, j) => kappa(i) - kappa(j) || i - j);
    const rank = new Array<number>(N);
    for (let r = 0; r < N; r++) rank[order[r]] = r;
    const nodesSorted = order.map((i) => nodes[i]);
    const nodeTSorted = order.map((i) => nodeT[i]);
    for (let i = 0; i < N; i++) {
      nodes[i] = nodesSorted[i];
      nodeT[i] = nodeTSorted[i];
    }
    for (let e = 0; e < edges.length; e++) {
      edges[e] = [rank[edges[e][0]], rank[edges[e][1]]];
    }
    // Edge key = the MIDPOINT's κ (the window's fade is keyed to each
    // particle's own live screen y, so a link straddling the boundary is
    // faded by geometry, not by its key).
    const edgeKappa = edges.map(
      ([a, b]) => (kappa(a) + kappa(b)) * 0.5,
    );
    const eOrder = edges.map((_, e) => e);
    eOrder.sort((i, j) => edgeKappa[i] - edgeKappa[j] || i - j);
    const edgesSorted = eOrder.map((e) => edges[e]);
    for (let e = 0; e < edges.length; e++) edges[e] = edgesSorted[e];
  }

  // --- 3b. THE PER-BUILD RECYCLE-SNAP THRESHOLD ----------------------------
  // Derived from the SHORTEST DELIVERED LINK, never assumed. See
  // `Plexus.wrapSnapDist`. Default build: min(0.038, 0.0551 × 0.69) = 0.038 —
  // the shipped constant, to the bit.
  const wrapSnapDist = Math.min(P.wrapSnapCeil, minEdgeLocal * P.wrapSnapFrac);
  // The steady-state excursion floor the threshold has to clear: the pointer
  // spring's displacement plus the curl term (both LOCAL units, both quoted in
  // WRAP_SNAP_DIST's own docstring).
  // ROUND 12 · STAGE 2: `excursionScale` is the 1/L the kernel applies to BOTH
  // terms (see PlexusBuildParams.excursionScale). Default 1 = the shipped,
  // unscaled forces, so the ellipsoid arm's verdict is unchanged to the bit.
  const excursionFloor =
    (POINTER_PUSH / NEURAL_SPRING + CURL_GAIN * CURL_SCALE) * P.excursionScale;
  const wrapSnapOk = wrapSnapDist > excursionFloor;
  if (!wrapSnapOk && process.env.NODE_ENV !== "production") {
    console.warn(
      `[plexus] ${mode}/${density} WRAP_SNAP invariant unsatisfiable: derived ` +
        `wrapSnapDist ${wrapSnapDist.toFixed(5)} ≤ steady-state excursion ` +
        `${excursionFloor.toFixed(5)}. POINTER_PUSH is a LOCAL-units force, so ` +
        `a longer local x-axis pushes further in pixels — scale it by 1/L.`,
    );
  }

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
      const w = Math.exp(-P.centroidK * dt * dt);
      wx += nodes[i][0] * w;
      wy += nodes[i][1] * w;
      wz += nodes[i][2] * w;
      ws += w;
    }
    centroids.push([wx / ws, wy / ws, wz / ws]);
  }

  // --- 5. The structural fingerprint (QA gate 4) ---------------------------
  // Union-find over the delivered edge list + a position checksum. O(N + E),
  // once, at build time.
  const parent = new Array<number>(N);
  for (let i = 0; i < N; i++) parent[i] = i;
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r];
    while (parent[i] !== r) {
      const n = parent[i];
      parent[i] = r;
      i = n;
    }
    return r;
  };
  let edgeLenSum = 0;
  for (const [a, b] of edges) {
    edgeLenSum += ld(a, b);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  const sizes = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    const r = find(i);
    sizes.set(r, (sizes.get(r) ?? 0) + 1);
  }
  let largestComponent = 0;
  sizes.forEach((v) => {
    if (v > largestComponent) largestComponent = v;
  });
  let checksum = 0;
  for (let i = 0; i < N; i++) {
    checksum +=
      nodes[i][0] * (i + 1.7) + nodes[i][1] * (i + 3.1) + nodes[i][2] * (i + 5.3);
  }

  return {
    nodes,
    nodeT,
    edges,
    centroids,
    meanSpacing,
    minEdgeLocal,
    components: sizes.size,
    largestComponent,
    meanEdgeLocal: edges.length ? edgeLenSum / edges.length : 0,
    shape: P.shape,
    bandAspect: P.bandAspect,
    yMin: yLo,
    yMax: yHi,
    yMid,
    edgeCapHit,
    wrapSnapDist,
    wrapSnapOk,
    excursionFloor,
    xMin,
    xSpan: span,
    checksum: Math.round(checksum * 1e6) / 1e6,
  };
}

// --- Link filaments ----------------------------------------------------------
/**
 * Strands per LINK. ROUND-8-D: 2 → 1. ROUND-8-G keeps 1: the thread is a LINE
 * now (see LINE_* below), and the surviving link PARTICLES are the traveling
 * traffic that rides it — traffic has no braid.
 */
export const STRAND_COUNT = 1;
/**
 * Strand offset radius around the link line (height fractions) — the helix a
 * link particle's strand traces, i.e. how far off the A→B chord it sags.
 *
 * ROUND-8-G: 0.0034 → **0**. THE BEAD MUST SIT ON THE LINE. The new
 * `LineSegments` layer draws the EXACT A→B chord (a straight segment is the
 * reference's grammar — crisp lines, not sagging ropes), so any strand offset
 * would park the traveling packet bead BESIDE its own line: at the round-8-F
 * numbers the effective radius was STRAND_RADIUS × ENVELOPE_BASE = 0.0061
 * ≈ 4.1px on a 680px band, i.e. a 10px bead visibly off a 1px line.
 *
 * The alternative — bending the LINE onto the braid — was rejected: it would
 * need the helix evaluated per line vertex (more ALU on a layer whose whole
 * point is to be cheap) and it still could not match the COMPUTE tier, where
 * the particle path also carries the curl shred that the line's vertex stage
 * has no access to. Zeroing the braid makes the two paths identical by
 * construction on BOTH backends instead of approximately equal on one.
 *
 * STRAND_THICKNESS keeps a sub-pixel residue so the dust is not perfectly
 * collinear (see below); the fray/debris scatter on `broken` is untouched —
 * that displacement is authored in DEBRIS_SPREAD, not here.
 */
export const STRAND_RADIUS = 0;
/** Per-particle jitter radius within a strand. ROUND-8-G: 0.0018 → 0.0006 —
 * effective 0.0006 × ENVELOPE_BASE 1.8 = 0.0011 ≈ **0.7px**, i.e. sub-pixel
 * against the 1px line, so the beads still read as ON it while the resting
 * dust keeps a hair of volume instead of a machined single-file queue. */
export const STRAND_THICKNESS = 0.0006;
/**
 * Master filament width envelope — the uEnvelope default (was a bare
 * `uniform(1)` literal in neuralFieldCompute). ROUND-8-F (LIVE-MEASURED):
 * 1.0 → 1.8. It multiplies widthEnvelope(), i.e. it scales `strandOff + jit`
 * for LINK particles only (stars are untouched — their spread is STAR_SPREAD),
 * on top of the healthy TIGHTEN_PER_RING ramp, the idle breathe, the row
 * response and the scroll-velocity swell. Cost: zero — it moves particles off
 * the chord, it does not resize sprites or add any.
 *
 * ⚠ ROUND-8-G: this knob and the whole widthEnvelope() family are now nearly
 * INERT. STRAND_RADIUS is 0 (the beads ride the line), so the only thing left
 * for the envelope to scale is the 0.0006 thickness jitter — 1.8 × that is
 * 0.7px. Kept at 1.8 so a revival of the braid lands where round-8-F left it.
 * Where the family's members went instead:
 *   VEL_SWELL      → the LINE's brightness (inside its capped emissive chain);
 *   ROW_SWELL      → LINE_ROW_GAIN, also brightness;
 *   TIGHTEN_PER_RING → NOT transferred. It was a left→right "discipline" ramp
 *     expressed as width; a 1px line has no width, and mapping it to alpha
 *     would fight the cool→warm tint that already carries the maturity read.
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

// ═══ ROUND 13 — THE LINK BECOMES A VOLUMETRIC CONDUIT (ribbon only) ══════════
/**
 * Owner brief, 2026-08-26: "vorrei che gli archi siano dei tunnel, tubi, scie
 * di particelle, non linee sottili, in modo tale che renda di più il 3d."
 *
 * The dormant round-8 braid machinery is revived AT RIBBON SCALE: the two
 * strands per link stop being collinear dust and become a counter-rotating
 * double helix around the round-12 arc — strand 0 a TIGHT BRIGHT CORE
 * (STRAND_CORE_R× the radius, full alpha), strand 1 a WIDE SOFT SHEATH
 * (full radius, STRAND_SHEATH_ALPHA× the alpha) — with the per-particle
 * thickness jitter filling the volume between them. The whole cross-section
 * slowly REVOLVES (STRAND_SWIRL, rad/s — strand 1 counter-revolves at
 * −0.6×) so the conduit reads as a current, not a printed rope, and the
 * radius PINCHES at mid-span on the same 4s(1−s) profile the arc and the
 * sprite taper already ride (an axon is widest where it leaves its somata).
 *
 * Radii are band-height fractions and are multiplied by widthEnvelope's
 * ENVELOPE_BASE 1.8 downstream, exactly like the round-8 braid was:
 * delivered helix radius ≈ 0.0055·1.8·935 ≈ 9 px, full tube ≈ 26 px wide.
 *
 * All of it is RIB-gated through build-time ternaries — `#production` bakes
 * the identical zero-radius graph it always has ({101, 229} unmoved).
 */
export const STRAND_RADIUS_RIBBON = 0.0062;
export const STRAND_THICKNESS_RIBBON = 0.0075;
export const BRAID_TURNS_RIBBON = 1.35;
/**
 * Extra particle budget for the conduit, multiplied into the node-ratio scale
 * in NeuralLattice (still braked by RIBBON_PARTICLE_SCALE_MAX, so the ceiling
 * stays 36 000 / 9 600). A volume needs more grain than a line: the same
 * perLink spread over a ~15 px cross-section is a swarm of countable dots;
 * at ×1.7 (≈29k total, ≈53/link) it closes into a continuous current.
 * The star budget is per-node (STAR_PER_NODE_RIBBON), so ALL of this lift
 * lands on the links — which is the point.
 */
export const CONDUIT_FILL_RIBBON = 2.0;
export const STRAND_RATE_BASE_RIBBON = 1.0;
/** −2.0 ⇒ strand 1 winds OPPOSITE (rate 1.0 / −1.0): a counter-helix crossing
 * pattern is the strongest cheap "this has a 3-D cross-section" cue. */
export const STRAND_RATE_STEP_RIBBON = -2.0;
/** Slow revolve of the whole cross-section, rad/s. Strand 1 counter-revolves
 * at −0.6× (two currents sliding past each other, not a rigid rotisserie). */
export const STRAND_SWIRL_RIBBON = 0.5;
/** Strand 0's radius factor — the bright core thread inside the sheath. */
export const STRAND_CORE_R_RIBBON = 0.22;
/** Strand 1's alpha factor — the sheath is atmosphere, not a second line.
 * ROUND 13b: 0.6 → 0.38. At 0.6 the two strands were peers and the conduit
 * read as an even dusty smear; the hierarchy IS the look — a bright compact
 * current inside a soft volumetric halo. */
export const STRAND_SHEATH_ALPHA_RIBBON = 0.38;
/** Per-strand sprite-size factors (core / sheath). The core carries the
 * line's continuity with slightly larger overlapping sprites; the sheath is
 * finer grain, so the volume reads as haze around a filament, not as a
 * second rope of countable dots. */
export const STRAND_CORE_SIZE_RIBBON = 1.22;
export const STRAND_SHEATH_SIZE_RIBBON = 0.8;
/** Mid-span radius pinch on the 4s(1−s) profile (1 = constant-radius tube —
 * the "drawn by a computer" cue the sprite taper already removes). */
export const STRAND_RADIUS_TAPER_RIBBON = 0.6;
/**
 * ROUND 13b — LIVE-TUNED IN CHROME (variant B, 2026-08-26). Ribbon-only
 * defaults for four uniforms whose non-ribbon defaults `#production` keeps:
 * a tighter cross-section envelope (1.8 → 0.95: the tube reads as a braided
 * CORD, not a dust cloud), a deeper DOF (0.45 → 0.75 — the volumetric read
 * needs the near-strand bokeh), and stars punched ×1.35 so the somata anchor
 * the brighter conduits.
 */
export const ENVELOPE_BASE_RIBBON = 0.95;
export const DOF_STRENGTH_RIBBON = 0.75;
export const STAR_PUNCH_RIBBON_K = 1.35;
/** Base flow speed — cycles/sec a particle advances along ITS LINK. Links are
 * short now (≈ one mean node spacing), so this is a slow trickle along each
 * thread rather than a river current. */
export const FLOW_SPEED = 0.075;

// --- ROUND-8-G — THE LINK LINE LAYER -----------------------------------------
/**
 * The links are REAL LINE GEOMETRY (one `LineSegments`, one draw call, built
 * by neuralLinkLines.bakeLinkLineGeometry from the SAME getPlexus tables the
 * particles read; material in neuralFieldCompute.buildLinkLineLayer).
 *
 * WHY (owner-visible, live-verified 2026-08-24): the reference brain-plexus
 * has thin crisp CONTINUOUS lines between bright stars. Particles strung along
 * an edge cannot be that — pushed to 7.5px and then 10px they became a chain
 * of glowing blobs, because a glowing sprite ≥4px and a 1px line are different
 * primitives. Structural, not a tuning problem.
 *
 * SIX of the constants below are live on the dev handle — `uniforms.uLineAlpha
 * / uLineEmissive / uLineLumMax / uLineBlue / uLineSurgeGain / uLineRowGain`
 * (plus the traffic pair `uDustAlpha` / `uBeadAlpha`). The REST — the surge
 * whitening, the flash gain, the dead alpha/dim, the dash triple and the
 * reveal stagger — are baked as `float()` literals in the node graph and need
 * an edit + reload, not a uniform write. LINK_SEGMENTS is BUILD-TIME (baked
 * geometry).
 */
/**
 * ═══ ROUND 12 · D — THE CHORD IS OFF. THE PARTICLES ARE THE LINE. ═══
 *
 * The owner reversed D22 the same day he approved it: *"no, la linea sotto
 * nitida non ci deve essere. sono le particelle che si illuminano in
 * movimento che fanno la linea illuminata."* Everything below this flag stays
 * in the tree — the baker, `buildLinkLineLayer`, all 20-odd `LINE_*`
 * constants and the ~150 lines of prose that justify them — because he has
 * reversed this decision once already and the next reversal must cost one
 * constant, not an archaeology dig.
 *
 * ⚠ `LINE_ALPHA = 0` IS NOT A ROLLBACK. Every fragment would fail
 * `Discard(alpha <= vLineCut)` so the fill goes to zero, but the draw call,
 * the ~20 500 unculled vertices, the 401 KiB VBO and the 6 UBO blocks all
 * remain. This flag skips the BUILD — the idiom `MEMBRANE_ALPHA` already
 * ships (neuralFieldCompute `buildMembraneLayer`), mount gate included.
 *
 * ⚠ `: boolean`, NOT the inferred literal type. A literal `false` narrows
 * `build.links` to `null` and the entire line branch STOPS BEING TYPE-CHECKED
 * by `npx tsc --noEmit`, which is the only static gate this repo has. The
 * price of the annotation is that the constant no longer guarantees a fold:
 * "tree-shaken out" is UNVERIFIED (no bundle analysis was run).
 *
 * ⚠ TWO THINGS THAT LOOK LINE-ONLY AND ARE NOT — do not delete them:
 *   - `copyMaskLineAt()` / `uCopyLineFloor` / `COPY_MASK_FLOOR_LINE` are read
 *     by the NEBULA, not only by the line.
 *   - `EDGE_FADE_IN/OUT`, `EDGE_MID_BRIGHT`, `DEBRIS_FADE` are read by the
 *     PARTICLE path.
 *
 * WHAT THE CHORD CARRIED AND WHERE IT WENT — see the ROUND 12 · D block below
 * (`DUST_SIZE_RIBBON`) for the replacement contract, and the round report for
 * the two items that are HONESTLY LOST (1-device-px crispness; independence
 * from the particle budget).
 */
export const LINE_LAYER: boolean = false;
/** Sub-segments per link in the baked LineSegments (⇒ 2× this vertices/link).
 * The chord is straight and would need 2; the subdivision is there so the
 * VERTEX-stage terms that vary along a link resolve — the surge wavefront
 * (SURGE_K 150 ⇒ half-width 0.068 of nodeT) and the fracture death-flash
 * (FLASH_K 500 ⇒ 0.037).
 *
 * SAMPLING, MEASURED (not the draft's "a link spans ≈0.05 of nodeT" — that
 * number was never taken off the real tables). Over all six mode×density
 * builds the per-link |ΔnodeT| is: full mean 0.035 / max 0.106, lite mean
 * 0.043 / max 0.122. Six sub-segments therefore sample the MEAN link every
 * 0.006 and the WORST-CASE (longest) link every 0.018, i.e.
 *   - surge  (half-width 0.068): 3.9 samples inside the half-width even on
 *     the longest link — linear-interp error ≈1% of peak;
 *   - flash  (half-width 0.037): 2.1 samples on the longest link — error
 *     ≈4% of peak.
 * Both are well under a visible stair-step, and the SHORT links (the dense
 * middle of the cloud) are sampled 3× finer still. Cost: 227 links × 12 =
 * 2,724 verts (lite 1,320) — one position + one vec2 attribute, no index
 * buffer. */
export const LINK_SEGMENTS = 6;
/**
 * At-rest master alpha of the line body. With LINE_EMISSIVE below this is the
 * pair that sets the whole layer's brightness, and it is bounded by the bloom
 * contract (see STREAM_EMISSIVE's ledger): the line must stay UNDER post-blend
 * luminance 1.0 at every moment, because the light in this band belongs to the
 * stars and the beads.
 */
export const LINE_ALPHA = 0.7;
/**
 * Resting emissive of the line body. THE ARITHMETIC (post-blend luminance,
 * bloom threshold 1.0):
 *   base tone = mix(COL_CYAN, COL_BLUE, LINE_BLUE_MIX 0.3) ⇒ lum
 *               0.7 × 0.6201 + 0.3 × 0.2289 = **0.5029**
 *   rest, mid-span, shimmer peak:
 *               0.5029 × 1.35 × midProfile 1.15 × shimmer 1.04 × LINE_ALPHA
 *               0.70 = **0.568**  ⇒ 43% headroom, and 1/12.9 of the 7.33 star
 *               core. (Round-8-F's particle thread sat at 0.966 with 3.5%
 *               headroom — the line is dimmer per pixel and reads BRIGHTER
 *               because it concentrates that energy in 1px instead of smearing
 *               it across a 9.4px sprite.)
 */
export const LINE_EMISSIVE = 1.35;
/**
 * ASYMPTOTIC CEILING on the line's POST-BLEND LUMINANCE — the quantity
 * PostFXNodes actually thresholds (≈1.0). The shader divides this by the
 * line's live `lum(tone) × alpha` and folds the result into the emissive chain
 * through the SOFT KNEE below, so the contract is tone-independent and
 * permanent: whatever the gains (row hover × surge × flash × shimmer ×
 * mid-span × scroll swell) and whatever the tone (the surge head whitens
 * toward COL_CORE, lum 0.9371, and the warm end of the nodeT tint adds more —
 * worst-case tone lum 0.768), THE LINE NEVER BLOOMS. A flat cap on the
 * emissive MULTIPLIER would not have held: sized on the 0.5029 body tone it
 * let a surge crossing a hovered region reach 1.48. 0.97 leaves a 3% guard
 * band under the threshold — and the knee means the line only ever
 * APPROACHES it, never lands on it.
 */
export const LINE_LUM_MAX = 0.97;
/**
 * Knee fraction of LINE_LUM_MAX under which the ceiling is EXACTLY inert.
 *
 * WHY THIS EXISTS (round-8-G check, 2026-08-24): the first cut clamped with a
 * hard `min(emissive, cap)`, and measured on the real numbers that clamp ate
 * the entire wavefront. With LINE_SURGE_GAIN 1.0 the cap engages at surge
 * 0.436 — i.e. everywhere within |ΔnodeT| 0.0744 of the head, WIDER than the
 * surge gaussian's own 0.068 half-width. So the whole visible head sat pinned
 * at a flat 0.970, and since a full-tier link spans only 0.035 of nodeT the
 * links flat-topped WHOLE: the "wavefront visibly sweeps each line" read
 * collapsed into "links switch to the ceiling and back". Worse, a hovered row
 * during a scroll (row 1 × vel 1) already sat above the cap at surge 0 — the
 * surge was completely invisible on hovered rows.
 *
 * The knee is the standard C1 soft-clip: exact below `knee × cap`, then
 * `knee + over·span/(over + span)` with `span = cap − knee`, which is
 * monotonic, has unit slope at the knee and tends to `cap` without reaching
 * it. Measured effect (mid-cloud tone, LINE_ALPHA 0.7):
 *   surge 0 / 0.2 / 0.5 / 1.0 → 0.568 / 0.730 / 0.839 / 0.902  (was
 *   0.568 / 0.741 / 0.970 / 0.970 — flat from 0.44 up)
 *   hover+scroll, surge 0 → 1 → 0.867 → 0.942  (was 0.970 → 0.970, dead)
 * The resting value is byte-identical (0.568) because rest sits far under the
 * knee. 0.7 is the largest knee that keeps the surge's first half untouched.
 *
 * Not a uniform on purpose: it is the SHAPE of the contract, not a look knob,
 * and uLineLumMax already gives the dev handle the axis that matters.
 */
export const LINE_LUM_KNEE = 0.7;
/** How far the line body sits toward COL_BLUE from brand cyan — "thin, PALE,
 * navy-cyan". The cool→warm nodeT tint (LAYER_TINT_COOL/WARM) still rides on
 * top, so the left of the cloud cools further and the right warms to
 * white-cyan, exactly as the link particles used to. */
export const LINE_BLUE_MIX = 0.3;
/** Emissive gain per unit surge — the wavefront visibly SWEEPS each line.
 * ×2 on the raw multiplier; DELIVERED post-blend (after the LINE_LUM_KNEE
 * soft ceiling and the head's own whitening) the head lands at 0.902 against
 * a 0.568 body = **×1.59**, still monotonic all the way up and still under
 * the ≈1.0 bloom threshold. */
export const LINE_SURGE_GAIN = 1.0;
/** Tone push toward COL_CORE (white-cyan) per unit surge at the head. */
export const LINE_SURGE_WHITE = 0.5;
/** Emissive gain at full row/zone attention (uRowGlow — broken: the row's
 * cloud region; healthy: ignition region i). Deliberately below the particle
 * ROW_GAIN 1.0: a lit REGION should read as its stars flaring with their mesh
 * warming, not as the mesh out-shouting the stars. */
export const LINE_ROW_GAIN = 0.7;
/** Emissive gain per unit fracture death-flash on the crossing lines. */
export const LINE_FLASH_GAIN = 1.2;
/** Alpha a frayed line keeps at the moment of the break (it then fades with
 * the same DEBRIS_FADE ramp the debris particles use) — dying links dim,
 * dash and drift with their endpoints instead of vanishing on a frame. */
export const LINE_DEAD_ALPHA = 0.5;
/** Emissive dim of a fully-frayed line (matches the particle deadMix 0.75). */
export const LINE_DEAD_DIM = 0.75;
/**
 * FRAY DASH (broken). crystalPlexus's broken-dash idiom verbatim — a product
 * of three sines of the REST position (so dashes are welded to the geometry
 * and do not crawl as endpoints drift), thresholded by smoothstep(LO, HI).
 * FREQ 210 puts ≈3.6 periods on a 0.107-long link ⇒ 3–5 dashes per link, the
 * same read as the SVG twin's `strokeDasharray="3 7"` ember links. Evaluated
 * per FRAGMENT: at 1px a vertex-interpolated dash is a smear.
 */
export const LINE_DASH_FREQ = 210;
export const LINE_DASH_LO = 0.36;
export const LINE_DASH_HI = 0.52;
/** Per-link reveal stagger: link i fades in over uReveal ∈ [h·this, h·this +
 * 0.45] with h a per-link hash — the net knits itself together as the section
 * arrives instead of switching on as one slab. */
export const LINE_REVEAL_STAGGER = 0.55;

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
/**
 * ROUND-8-G — RESTING SPRITE SCALE for LINK particles. The thread is a LINE
 * now; a link particle at rest is faint DUST riding it, and a 9.4px sprite
 * sitting on a 1px line is exactly the "chain of blobs" the owner rejected.
 * 0.55 puts the resting dust at mix(1.25, 0.55, fringe)·0.55·NEURAL_POINT_SIZE
 * ≈ **3.4px** — a grain that gives the line a soft core without competing with
 * it. PACKET_SIZE then swells the same sprite back up for a BEAD (≈10.3px).
 * Stars are untouched (they scale by RING_POINT_SIZE_BOOST, not this).
 */
export const DUST_SIZE = 0.55;

// ═══ ROUND 12 · D — THE PARTICLE-DRAWN LINE (RIBBON ONLY) ═══════════════════
//
// THE UNIT LAW, stated once, because ten months of this project were spent
// compensating for it by eye:
//
//     S_css = NEURAL_POINT_SIZE · sizeK / CAMERA_Z          CAMERA_Z = 12
//
// `buildVertex` computes a DEVICE-px diameter and divides by camera distance,
// so every "px" quoted in the ledgers above (`NEURAL_POINT_SIZE`'s 9.4 px
// core, `DUST_SIZE`'s 3.4 px grain, `PACKET_SIZE`'s 10.3 px bead) is **12×
// the delivered CSS px**. Measured on the shipped ribbon: the link dust is
// **0.283 CSS px** across at **3.95 CSS px** spacing — about 1.3 lit pixels
// on an 84 px link. Nothing in this repo has ever been a particle-drawn line.
//
// That is also why `f6cac67` failed live: at "7.5" and then "10" the team was
// compensating a 12× unit error by eye, and at that size a disc is a BEAD.
// The idea was never wrong; the units were. The escape is not diameter, it is
// ANISOTROPY — `buildVertex` scales only `corner.x` by the velocity stretch
// and `vQuadUv` is the UNROTATED quad, so a sprite stretched 3× along its own
// chord is a STREAK whose peak per-pixel alpha never moves, while the same
// sprite grown isotropically is a bigger blob.
//
// THE TWO-REGIME LAW everything below is sized to:
//
//     REST (structure, always present):  S_css / s_css ≥ 1.65   (comb)
//     LIT  (the travelling signal):      S_axial / s   ≥ 6.0
//     accumulated A = 0.624 · P · S_axial / s
//
// 1.65 is the COMB criterion (ripple 2·exp(−2π²(S/4s)²) ≤ 7 %); a Poisson
// train needs 6.0 for the same smoothness, which is why `basePhase` is
// stratified in `seedBuffers` and `speedVar` moved to a per-LINK hash. A thin
// line made of ABOVE-threshold sprites is arithmetically forced to read as
// beads (the bloom highpass is a blob detector on every core peak), so the
// resting strand is dense, overlapped and entirely SUB-threshold, and only
// the travelling crest crosses 1.0.
//
// ⚠ EVERY CONSTANT IN THIS BLOCK IS A RIBBON-ONLY COMPANION, and that is not
// tidiness: `#production` shares `DUST_SIZE`, `PACKET_SIZE`, `STREAM_ALPHA`,
// `BEAD_ALPHA`, `STATIC_ELONG`, `FLOW_SPEED`, `CORE_SIZE_BOOST` and
// `FRINGE_SIZE_DROP` with the ribbon, and its band is byte-for-byte gated
// ({101, 229}, checksum −420.464007). The selection is a BUILD-TIME JS
// ternary on `plexus.shape === "ribbon"`, so the non-ribbon node graph bakes
// the identical `float()` literals it baked before this block existed.
// `NEURAL_POINT_SIZE` is NOT touched — it scales the stars and the beads too.

/**
 * Resting sprite diameter carrier for RIBBON link particles.
 *
 * `sizeK = mix(CORE_SIZE_BOOST_RIBBON, FRINGE_SIZE_DROP_RIBBON, fringe) ·
 * DUST_SIZE_RIBBON`, mean factor 0.95 ⇒
 *   S_css = 7.5 · 0.95 · 4.72 / 12 = **2.80 CSS px**.
 * That is 5.6 device px at dpr 2 — **5× the chord's 1 device px**, and that
 * loss is real and not tunable: a 1-device-px particle line would need
 * ~107 000 link sprites against the ~31 000 the budget has.
 */
// ROUND 13 — 7.1 → 5.6 (2.80 → 2.21 CSS px): the conduit reads as a smooth
// current only if its grain is finer than its cross-section; the lost light
// comes back through CONDUIT_FILL_RIBBON (more grain) + STREAM_ALPHA_RIBBON.
export const DUST_SIZE_RIBBON = 6.6;
/**
 * F4 — narrow the per-particle size spread. A comb of UNEQUAL discs
 * re-introduces ripple at the ratio of the spread (today 1.25/0.55 = 2.27×);
 * ±15 % is invisible. Costs nothing.
 */
export const CORE_SIZE_BOOST_RIBBON = 1.15;
export const FRINGE_SIZE_DROP_RIBBON = 0.75;
/**
 * The bead's job has SHRUNK — from "the only light on the link" to "a glint
 * on a lit thread". As a ratio: bead = dust × (1 + this) = 1.35× ⇒ **3.8 CSS
 * px** at rest size 2.8. At the shipped 2.0 it would be 8.4 CSS px, which is
 * exactly the primitive `f6cac67` was killed for.
 */
export const PACKET_SIZE_RIBBON = 0.35;
/**
 * The analytic (WebGL2) tier has no `physVel`, so it fakes the streak with a
 * fixed elongation along the link. At 0.28 its REST stretch is 1.42 against
 * the compute tier's 1.01 — a 40 % brightness divergence between backends
 * that only becomes visible now that the sprite is bright. 0.05 ⇒ 7 %.
 */
export const STATIC_ELONG_RIBBON = 0.05;
/**
 * Ambient drift 8.4 → 28 px/s. Anchor speed 0.026 local/s against the RIBBON'S
 * OWN delivered snap threshold (`wrapSnapDist` 0.01060 ÷ damping/spring
 * 0.1417 = 0.0748 local/s) — 2.9× margin. ⚠ Do NOT audit this against the
 * `WRAP_SNAP_DIST` module constant: the ribbon's delivered value is 3.6×
 * tighter.
 */
export const FLOW_SPEED_RIBBON = 0.25;
/**
 * THE RESTING STRAND'S ALPHA, and it is the number the whole read hangs on.
 *
 * `P = lum(COL_CYAN 0.6201) × (STREAM_EMISSIVE 2.1 × midProfile 1.15 ×
 * rowBright 1.04 = 2.512) × alpha = 1.5577·alpha`. The rest target is
 * `A = 0.624 · P · S_ax/s = 0.24` post-blend at S/s ≈ 1.65 ⇒ P = 0.233 ⇒
 * **alpha = 0.150**. Sanity anchor: the chord the owner approved delivered
 * 0.568 × 0.5 CSS px of light per unit length; this strand delivers
 * 0.24 × 2.8 = **2.4× the chord**, and the river head ~15×.
 *
 * ⚠ THIS IS NOT THE ROUND-8-I HAZE COMING BACK. That fog was 4 800 sprites
 * smeared across a 44 px TUBE (`STRAND_RADIUS` non-zero). Here
 * `STRAND_RADIUS = 0` and `STRAND_THICKNESS = 0.0006` (0.56 px = 0.2 S), so
 * the train is effectively 1-D and the light is ON the line, not over the
 * band. The gate is localisation (L on axis ÷ L at ±3S ≥ 15), never an
 * integral.
 */
// ROUND 13 — 0.125 → 0.16: the tube spreads the same light over a cross-
// section, so the surface brightness of the resting conduit needed a lift to
// keep the "one continuous net" read. The DUST_A_MAX knee still holds the
// resting accumulation under the bloom threshold.
export const STREAM_ALPHA_RIBBON = 0.33;
/** Post-blend 3.65 → **1.80**. A 3.8 px sprite at 3.65 paints a bloom halo
 * peaking at 0.64 over a ~4 px radius; 46–97 of those on frame is the new
 * fog. A glint on a lit thread, not a lamp on a dark one. */
export const BEAD_ALPHA_RIBBON = 0.32;
/**
 * THE ROLLING κ-WINDOW — the only lever big enough to pay for the strand.
 *
 * The band is 3.791 band-widths long and rides a 45° screen diagonal, so at
 * any instant only `rect.h / (L · rect.w)` = `bandAspect` = **12.85 %** of it
 * is on frame — a divisor of 7.78, not the naive 1/Λ = 3.79. (A plain edge
 * -index window buys only the 3.79; at a given u only part of the v range is
 * on frame.)
 *
 * THE KEY. Write the mapping as `x = u·L`, `y = v + μ·x`, `μ = dir·(W/H)/R`.
 * A point's screen y is `C − y·rect.h` for every point, shear or no shear, so
 * "on frame vertically" is a FIXED window in mapped `y` — and `y/μ = u +
 * dir·R·bandAspect·v` is therefore the exact 1-D on-frame key. Its window is
 * `bandAspect` wide in u, v-independent, and (this is the part that makes it
 * buildable) **it is the same axis the light travels on**.
 *
 * Sort nodes and edges by κ once at build time; then a particle homes onto
 *
 *     idx = first + mod(baked − first, WINDOW)
 *
 * which is the IDENTITY for everything already inside the window and re-homes
 * exactly the 1/WINDOW of particles on the departing element to the arriving
 * one, both of them off frame. Every element keeps a FIXED residue class, so
 * its particle population is a build-time constant and the comb never
 * re-strides.
 *
 * PAD 1.45 ⇒ the window reaches 0.225 band-heights (≈210 px) past each frame
 * edge — comfortably past half the longest link (170 px), so a re-home is
 * always off frame. It is HYSTERESIS, not a visibility rule: the fade is keyed
 * to the particle's own live screen y (`screenYAt`), never to the index, so a
 * driver that mis-sets `first` loses links at the frame edge instead of
 * popping them in the middle of it.
 */
// ROUND 13d — 1.7 -> 2.08, re-derived from the pad inequality with the new
// WINDOW_FADE_OUT 1.55: excess past the edge 0.55·half + longest-link extent
// ~0.53·half = 1.08·half each side => pad = 1 + 2·0.54. CONDUIT_FILL_RIBBON
// compensates the perLink dilution (same edgeTotal over ~22% more windowed
// edges).
export const RIBBON_WINDOW_PAD = 2.08;
/** The REST regime's target geometric overlap `S_css / s_css`. 1.65 is the
 * COMB criterion — ripple `2·exp(−2π²(S/4s)²)` = 6.9 %, verified against the
 * shipped `smoothstep(0.5, 0.12, r)` disc profile at ±3 % peak-to-trough. A
 * POISSON train (a hashed `basePhase`) would need 6.0 for the same read, and
 * that factor of 3.6× in particle count is what F2/F3 buy. ⚠ It is never a
 * licence to raise alpha where the overlap is BELOW it — that is the bead
 * failure; below 1.65 the answer is more particles or a wider sprite. */
export const REST_OVERLAP = 1.65;
/** `dir · traverseRate` of the shipped traverse (`dir: -1`, rate 1). It is the
 * sign+scale of κ's `v` term. ⚠ Re-derive if the band's direction or rate
 * ever changes — the sort would otherwise key on the wrong diagonal and the
 * window would over-include ~1.9× (i.e. fall back to the naive 3.79). */
export const RIBBON_KAPPA_K = -1;
/** Star particles per WINDOWED node. The approved read is 40.19/star
 * (`NODE_FRACTION` 0.46 at 34 006/389); windowing keeps that intact while
 * paying for only the ~73 nodes on frame instead of all 389. `NODE_FRACTION`
 * is retired on the ribbon arm: the star and link budgets are computed
 * independently now. */
export const STAR_PER_NODE_RIBBON = 40;
/**
 * Where the window fade sits, as a MULTIPLE of the frame's own half-height in
 * mapped-local units (1.0 = the frame edge exactly). Fully lit across the
 * whole frame; gone by 1.16 half-frames, i.e. ≈75 px outside it.
 *
 * ⚠ A MULTIPLIER, NOT A CONSTANT IN BAND-HEIGHTS. The shader's y unit is
 * `rect.h` while the frame is `size.height`, and the band pin is `svh` — on a
 * phone with a collapsing URL bar the two differ by the toolbar, and a fixed
 * 0.5 would put the fade inside the frame for the whole act. `uWinHalf`
 * carries `ih / (2·rect.h)`; these ride it.
 *
 * ⚠ THE PAD INEQUALITY, and it is what sizes `RIBBON_WINDOW_PAD`:
 *     pad/2 − halfLinkExtent  ≥  WINDOW_FADE_OUT · half
 * A particle re-homes when its LINK's midpoint κ leaves the index window, and
 * at that instant the particle itself can be half a link nearer the frame.
 * Measured on the shipped band: longest delivered link 388 px on a 935 px
 * frame ⇒ halfExtent ≤ 0.208 → 0.85 − 0.208 = 0.642 ≥ 0.58. 58 px of margin.
 */
// ROUND 13d — 1.02/1.16 -> 1.30/1.55: the fade used to START essentially ON
// the frame edge (2% past) and complete ~60 px outside, so exiting filaments
// visibly dissolved in the top-left corner (half of the conveyor read the
// owner rejected). Now dimming starts 30% of a half-frame past the edge and
// completes ~55% past (~200 px off-frame). RIBBON_WINDOW_PAD grows with it
// (the pad inequality below).
export const WINDOW_FADE_IN = 1.3;
export const WINDOW_FADE_OUT = 1.55;
/**
 * Ceiling on the per-link SIZE normalisation (see the normaliser in
 * `particleScalars`). A link carries a fixed sprite count, so its delivered
 * spacing rides its own length; the strand answers by growing the sprite just
 * enough to keep `S/s = REST_OVERLAP` on EVERY link, and dropping the alpha in
 * exact compensation so the accumulated `A` is flat. 1.45 caps the growth at
 * 4.06 CSS px. MEASURED on the shipped band: only links past 291 px need any
 * growth at all (median 158 px, longest 388 px — a handful of the 129 on
 * frame), and the worst of them lands at 1.24 × 1.45 = **1.80**, clear of the
 * 1.65 law. Past the cap a link would ride a lower overlap and a rippled read
 * rather than a visibly fatter thread; that is the trade, and on the shipped
 * band it is not reached.
 */
export const SIZE_NORM_MAX = 1.45;
/** Star anchors JUMP now (they never did before), so the recycle snap has to
 * cover them or a re-homed star core spring-flies across the frame. Local
 * units; far above any legitimate star excursion (offsets are ≤
 * STAR_FLARE_LEN) and far below the ≈1.0-local window jump. Armed by the same
 * steady-state gate the link snap uses. RIBBON BUILDS ONLY — on every other
 * build the star bound stays 1e9, to the bit. */
export const STAR_WINDOW_SNAP = 0.25;
/** ROUND 14 — THE κ-WINDOW RE-HOME IS NEVER A FLIGHT. A second, ALWAYS-ARMED
 * snap threshold applied to every role on ribbon builds, independently of the
 * `armed` gate (`uRecohere` row ignition / post-fracture `dispersing`) that
 * can disarm the recycle snap for seconds at a time and let a re-home spring-
 * fly across the frame (bottom→top under reverse scroll). Sizing (ANCHOR-side
 * terms, i.e. how far the anchor itself strays from the rest lattice): a
 * frayed link under a recohere tease ≈ DEBRIS_SPREAD 0.075 + DEBRIS_GAP 0.02
 * + wander (three per-axis sines × u·0.06 × (1 + uScrollVel·VEL_DEBRIS 0.2)
 * ⇒ up to 0.06·√3·1.2 ≈ 0.125) + drifted-endpoint swing ≈ 2·NODE_DRIFT·1.05
 * ≈ 0.094 → ≈ 0.27 local worst case; a κ-window re-home moves the anchor
 * ≈ 1.0 local. 0.4 is 1.5× the former and 2.5× under the latter. (0.25 =
 * STAR_WINDOW_SNAP is fine for stars but too tight for frayed links.)
 * This constant does NOT cover the FORCE-side excursion of post-fracture
 * debris — see WINDOW_REHOME_SNAP_DEBRIS. Local units; ribbon builds only. */
export const WINDOW_REHOME_SNAP = 0.4;
/** ROUND 14 · REVIEW FIX — headroom for DISPERSING particles. Post-fracture
 * debris is driven by `DEBRIS_WANDER_ACC` 5.0 × (1 + uScrollVel·VEL_DEBRIS)
 * while its spring is cut to NEURAL_SPRING·(1 − 0.85) = 9 (damping 8.5):
 * quasi-static amplitude A/√((k−ω²)² + (cω)²) per axis ≈ 0.36 / 0.41 / 0.45
 * at ω = 1.4 / 1.1 / 0.9, phase-offset across the three axes ⇒ |pos − anchor|
 * routinely 0.5–0.7 local (×1.2 under scroll) on top of the frayed anchor's
 * own ≈ 0.27. At 0.4 a fully dispersed ember would be hard-snapped back onto
 * its anchor periodically — a new pop on the #problem tail, compute tier
 * only. The kernel blends `mix(WINDOW_REHOME_SNAP, WINDOW_REHOME_SNAP_DEBRIS,
 * dispersing)`, so intact links keep the tight 0.4 and debris gets 0.8 —
 * still under the ≈ 1.0 re-home (a coincident three-axis peak under full
 * scroll can brush ≈ 0.85 + 0.27; accepted: a rare snap on a 0.22-alpha ember
 * versus a guaranteed 1.0-local flight). Kill-switch: set this equal to
 * WINDOW_REHOME_SNAP (the mix collapses to the ROUND 14 constant). Local
 * units; ribbon builds only. */
export const WINDOW_REHOME_SNAP_DEBRIS = 0.8;
/** Kill-switch for the ROUND 14 unconditional re-home snap (false ⇒ the
 * kernel bakes exactly the pre-ROUND-14 graph). */
export const WINDOW_REHOME_SNAP_ON = true;

// --- ROUND 12 · D — MOTION IS LIGHT (the travelling signal) ------------------
//
// A CONSTANT speed→brightness law is fatal: `uFlowSpeed` is uniform, so every
// particle would lift equally and we would have re-derived the round-8-I haze
// by a new route. And `|physVel|` is FORBIDDEN as the driver — it spikes at
// every `fract()` wrap on the compute tier only, and does not exist at all on
// the analytic tier, so a `|physVel|`-driven emissive shows two different
// pictures on the two backends. Everything below rides ONE analytic scalar on
// the SAME κ axis the window uses.
//
//     phase(nT, y) = nT − y·uFrontKy
//     born(ph)     = smoothstep(ph, ph + uFrontW, uFront)     ← structure
//     river(ph)    = Σ_m max( exp(−K·dw²), TAIL-smear )       ← light
//
/** Crests on the field at once. Pitch 1/3 nodeT = 2426 px ⇒ ~0.8 crests per
 * 1920 px frame. */
export const RIVER_M = 3;
/** Gaussian sharpness. σ = 1/√(2K) = 0.0577 nodeT = **420 px** — deliberately
 * WIDER than the 152 px mean link, so a crest lights a link END TO END
 * instead of riding along it as a bead. ⚠ Do not narrow it toward
 * `PACKET_WIDTH` 0.07; that width IS the anti-blob guarantee. */
export const RIVER_K = 150;
/** Trailing comet smear (matches `SURGE_TAIL`). Combined with `max(head,
 * tail)`, never `min()` — a `min()` on a moving wavefront flat-tops it. */
export const RIVER_TAIL = 0.035;
/** Along-link advection added at a crest ⇒ `stretch = 1 + min(1.95, 2) =
 * 2.95`. The SAME saturation the surge already produces; no new cap
 * behaviour, and the stretch is anisotropic, so this is a streak. */
export const RIVER_ADVECT = 1.3;
/**
 * Transverse swell at the crest: S 2.80 → 3.14 CSS px.
 *
 * ⚠ MEASURED-DOWN FROM THE DRAFT'S 0.35, together with `RIVER_GAIN` and
 * `RIVER_TRAFFIC`. The draft's ledger sized the crest at `A = 1.24` assuming
 * `S_ax/s = 6.57` — the LONGEST link's value. But the overlap normaliser
 * holds `A_rest` FLAT across the net, so `A_lit / A_rest` is a pure product
 * of the crest's own factors and is the same on every link: at 0.35/0.30/0.16
 * it came out **1.83**, i.e. 48 % over the ledger, and the frame showed it —
 * blown-out white segments with a bloom wash measuring 0.247 linear at 20 px
 * off the axis. At 0.12/0.15/0.08 the product lands at **1.19**, which still
 * crosses the bloom threshold (that is the point) at a 4.9× lift over rest.
 */
export const RIVER_SIZE = 0.12;
/** Emissive lift into the existing additive chain. */
export const RIVER_GAIN = 0.15;
/** Whitening toward `COL_CORE` at the crest. Cyan→white only. NEVER violet. */
export const RIVER_WHITE = 0.25;
/** Lift into the dust→bead `traffic` ramp (so the strand thickens with the
 * light rather than only brightening). */
export const RIVER_TRAFFIC = 0.08;
/** Star-core lift inside a crest — `.mul(cGate)` is mandatory. */
export const RIVER_STAR = 0.45;
/**
 * ⚠ THE CRESTS MUST KEEP MOVING WHEN THE READER STOPS. `uRiver = uFront +
 * riverClock`, `riverClock += delta·this` ⇒ 655 px/s, a crest crosses the
 * frame in ~2.9 s. Without it a stopped reader sees FROZEN BRIGHT PATCHES —
 * the direct contradiction of the owner's sentence. `uFront` (structure)
 * stays a pure function of `p`; only the LIGHT gets its own clock.
 */
export const RIVER_RATE = 0.09;
/**
 * THE BIRTH front: `uFront = damp(prev, LEAD + p·SPAN, 10, delta)`, in nodeT.
 *
 * ⚠ `Math.max(prev, next)` would be a LATCH and violates D16 — the front must
 * be able to go back when the reader does.
 *
 * ⚠ LEAD IS 0.30, NOT THE DRAFT'S 0.05, AND THAT MAKES THE FRONT INERT ON
 * PURPOSE. MEASURED: the frame's own phase runs `≈ 0.92·p + 0.096` and spans
 * ±0.065 either side of its centre, so at LEAD 0.05 the front sat at 0.683
 * while the frame reached 0.713 — **the leading third of the picture was
 * unborn**, and a fast scroll (the damper is λ = 10) would have widened that
 * to most of the frame. At 0.30 the front clears `phase_hi + FRONT_W` by
 * ≥ 0.08 for every `p` in the act, so birth never eats the picture.
 *
 * The consequence is reported rather than hidden: the chord's per-link
 * STAGGERED REVEAL (`LINE_REVEAL_STAGGER`) is therefore NOT recovered — the
 * field still knits in on the flat `uReveal` coalesce. Drop this toward 0.10
 * and the front becomes visible again; that is the lever, and it costs
 * picture at the leading edge.
 */
// ROUND 13d — 0.3 -> 0.62. At 0.30 the front cleared the frame's leading
// phase edge by -0.024 at p = 0 (i.e. it was INSIDE the frame) and the
// driver's lambda=10 damp pulls it another ~0.033 in during a fast scroll:
// the owner watched the right half of the frame BUILD ITSELF while the
// trailing edge dissolved -- "si scompone quella prima e si sposta in
// quella dopo", the conveyor read. At 0.62 the birth clears the leading
// edge by a full ~0.27 phase (~1 frame) at p = 0, so building and
// dismantling (D14/D16 both stand) happen entirely OFF CAMERA and the
// on-frame net always reads as one persistent structure being travelled.
export const FRONT_LEAD = 0.62;
export const FRONT_SPAN = 1.0;
/** Birth knee width in nodeT — a C¹ knee, never a clamp. */
export const FRONT_W = 0.06;
/**
 * THE CONTRACT `LINE_LUM_MAX` USED TO CARRY, RE-HOMED — AND IT IS A CEILING
 * ON THE ACCUMULATED LUMINANCE, NOT ON THE SPRITE.
 *
 * `LINE_LUM_MAX` was the only place in this field where a layer was held
 * UNDER the bloom threshold, and it leaves with the chord. Its replacement is
 * a two-state contract: the RESTING strand caps at `DUST_A_MAX` (0.95 —
 * sub-threshold, nothing on it ever blooms) while a bead or a crest is
 * allowed up to `BEAD_A_MAX`.
 *
 * ⚠ MEASURED, AND THE FIRST ATTEMPT WAS WRONG IN A WAY WORTH RECORDING. The
 * draft capped the per-SPRITE peak `P = lum·emis·alpha`, exactly as the line
 * layer did. On a line made of sprites that is the wrong quantity: what the
 * eye and the bloom highpass see is
 *     A = 0.624 · P · (S_axial / s),
 * and `S_axial/s` runs from 1.65 to **20** once the crest's swell and the
 * anisotropic stretch are in. A surge sat at P = 0.62 — comfortably under a
 * 2.0 sprite cap — and delivered **A = 7.8**: blown-out white links with a
 * bloom wash reading 0.25 linear 20 px off the axis, and a 123× spread
 * between a resting link and a swept one. The cap therefore divides by the
 * delivered axial overlap, which the shader already computes for the
 * normaliser: `emisCap = A_MAX / (0.624 · ovLit · lum · alpha)`.
 *
 * Same C¹ soft knee as the line's — exact below 0.7·cap, then asymptotic.
 * ⚠ A hard `min()` on a moving wavefront FLAT-TOPS whole links and turns
 * "the wavefront sweeps the line" into "links switch to the ceiling".
 */
export const DUST_A_MAX = 0.95;
/** The other end of the same knee — a bead or a crest may reach this, and is
 * MEANT to: over 1.0 is what makes the travelling segment bloom. */
export const BEAD_A_MAX = 1.8;
export const DUST_LUM_KNEE = 0.7;
/** The through-centre chord mean of the shipped disc profile
 * `smoothstep(0.5, inner, |vQuadUv|)` — the constant that turns a per-sprite
 * peak into an accumulated one. */
export const DISC_CHORD_MEAN = 0.624;
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
/**
 * Fraction of a star's particles that build the flare cross.
 *
 * ROUND-8-G: 0.42 → **0.70**, closing the round-8-D check's own flag ("the 4
 * flare rays are 2.6 particles each"). The freed link budget (below) raises a
 * full-tier star from ~25 to ~40 particles, and the split decides where those
 * go. Spending them on the CORE would be waste: the core blob is a 5.0px-radius
 * ball (STAR_CORE_R × STAR_SPREAD) drawn with 15.1px sprites, so it is already
 * saturated additive white at ~8 particles. The RAYS are what was starved.
 *   - was: 25 × 0.42 = 10.5 flare ÷ 4 rays = 2.6/ray over a 27.5px reach ⇒
 *     10.6px spacing against a ~8.4px mean flare sprite = a DOTTED spike.
 *   - now: 40 × 0.70 = 28 flare ÷ 4 rays = **7.0/ray** ⇒ 3.9px spacing, 2.1×
 *     overlapped = a CONTINUOUS tapered spike. Core keeps 12 (1.5× saturated).
 *   - lite: 26 × 0.70 = 18.4 ÷ 4 = 4.6/ray over a 19.4px reach on a 480px
 *     band ⇒ 4.2px spacing, still 2.0× overlapped.
 */
export const STAR_FLARE_FRACTION = 0.7;
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
 * round-8-I STAR_PUNCH, so the core lands at 3.0·3.2·1.25 = 12.0 and the tip
 * at 3.0·3.2·0.75 = 7.2). Post-blend the CORE blooms hard (0.889 tone × 12.0 ×
 * NODE_ALPHA 1.0 = **10.67**, was 7.33 at punch 2.2).
 *
 * ⚠ ROUND-8-I — THE FLARE TIP NOW CROSSES THE BLOOM FLOOR, reported rather than
 * silently accepted. A tip is 0.794 × 7.2 × STAR_TIP_ALPHA 0.18 = **1.029**
 * against the ≈1.0 threshold (it was 0.707 at punch 2.2, deliberately under it
 * so "the spikes stay crisp instead of smearing into the core's halo"). The
 * crossing is a hairline — 3% over — and the ray's product emis×alpha is
 * monotonic from 1.25×1.0 at the centre to 0.75×0.18 at the tip, so nothing on
 * the star is dimmer than the tip: at 3.2 the WHOLE star, spikes included, is
 * bloom input. The exact tie is
 *   STAR_PUNCH = 1 / (0.794 · 3.0 · STAR_TIP_EMIS 0.75 · STAR_TIP_ALPHA 0.18)
 *              = **3.110**
 * so 3.10 buys the old crisp-spike contract back for a 3% loss of punch, and
 * STAR_TIP_ALPHA 0.175 does the same without touching the core. Left at the
 * live-verified 3.2 on purpose: the owner's reference is bright white star
 * nodes, and a whisper of bloom on the spikes serves that read — but if the
 * next browser pass sees the four rays smearing into the core halo, those two
 * numbers are the fix, not the punch. */
export const STAR_CORE_EMIS = 1.25;
export const STAR_TIP_EMIS = 0.75;
/** Alpha at a flare tip (core = 1) and the falloff exponent. ROUND-8-I: this is
 * one of the two knobs that decides whether the flare rays bloom — see the tie
 * derivation at STAR_CORE_EMIS (0.175 keeps them under the threshold at
 * STAR_PUNCH 3.2). */
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
 *
 * ROUND-8-I (LIVE-VERIFIED, the haze pass): 2.2 → **3.2**. This is the second
 * half of the STREAM_ALPHA cut and it only works BECAUSE of it: with ~4,800
 * resting link particles fogging the band, punching the stars harder just made
 * a brighter fog: the eye reads the star/surround RATIO, not the star. With the
 * dust at 0.012 the same punch lands on near-black and the reference grammar
 * finally appears — crisp blue triangles with bright white nodes at the
 * vertices. Post-blend: core 0.889 × (RING_EMISSIVE 3.0 × 3.2 × STAR_CORE_EMIS
 * 1.25 = 12.0) × NODE_ALPHA 1.0 = **10.67** (was 7.33) = 18.8× the link line's
 * 0.568 and 593× the resting dust. Cost: ZERO — this scales emissive, it does
 * not resize or add sprites. Ceiling to know before raising it further: at 3.11
 * the star FLARE TIPS cross the bloom threshold (STAR_CORE_EMIS).
 *
 * STAR_SPREAD stretches the whole BAKED star offset (core blob AND flare rays
 * together): at 1.35 the core blob radius is STAR_CORE_R 0.0055 × 1.35 =
 * 0.0074 (≈5.0px on a 680px band) and a flare ray reaches STAR_FLARE_LEN 0.03
 * × 1.35 = 0.0405 (≈27.5px). Node COUNT and the core/flare split stay
 * BUILD-TIME (PLEXUS_SEEDS / STAR_FLARE_FRACTION).
 * Neither knob changes fill cost — they move particles, they do not resize
 * sprites (that is NEURAL_POINT_SIZE).
 */
export const STAR_PUNCH = 3.2;
export const STAR_SPREAD = 1.35;
/**
 * Fraction of particles that are STAR particles (both modes).
 *
 * ROUND-8-G — THE RE-ALLOCATION. Links no longer need particles to BE a line
 * (the LineSegments layer draws them), so the ~70% they held is redistributed.
 * 0.28 → **0.46**. Totals are unchanged (9000 / 3200):
 *
 *   full 9000 : stars 4140 (46%) · link traffic 4828 (53.6%) · sparks 32
 *               ⇒ 40.2 particles/star over 103 nodes (was 25)
 *               ⇒ 21.3 particles/link over 227 links (was 28.4)
 *   lite 3200 : stars 1472 (46%) · link traffic 1696 (53%) · sparks 32
 *               ⇒ 26.3/star over 56 nodes · 15.4/link over 110 links
 *
 * The link share stays high ON PURPOSE — those particles are now the ambient
 * PACKET BEADS (round-7, owner: "la luce che passa vorrei sia più frequente"),
 * the only thing that MOVES along the lines, and a bead needs enough samples
 * inside its PACKET_WIDTH gaussian to read as a smooth travelling dot instead
 * of a strobing sprite: at 21.3/link the spacing is 3.3px, so a bead spans ~3
 * particles at ±1σ and ~6 at ±2σ. Dropping the link share further would bring
 * back the very stutter this round removes, one primitive down.
 *
 * FILL BUDGET (the only real cost, ∝ sprite px²; desktop, DPR-independent
 * comparison at identical totals):
 *   round-8-F : stars 2520 (1462 core × 15.1px² + 1058 flare × 8.4px²) 407k
 *               + links 6448 × 6.2px² 250k                    = **657k px²**
 *   round-8-G : stars 4140 (1242 core + 2898 flare)           = 486k
 *               + resting dust 4828 × 3.4px² (DUST_SIZE)      =  58k
 *               + ~76 live beads × ~6 lit particles × 10.3px² =  52k
 *               + the LINE layer 227 links × 71px × 1px       =  16k
 *                                                             = **612k px²**
 * i.e. ~7% CHEAPER than what already ran, with the stars 64% denser. The lite
 * tier drops harder (≈211k vs the round-8-F 281k — the itemised ledger is on
 * NEURAL_PARTICLE_COUNT_COMPACT) because the dust shrinks before the phone's
 * smaller band shrinks anything else.
 */
export const NODE_FRACTION = 0.46;
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
/**
 * Max alpha of frayed/detached particles (ember ceiling). ROUND-8-G: 0.35 →
 * **0.22**, a NO-OP re-basing, not a dim. Until this round the shader read
 * `mix(fringeA, debrisA, disp) × STREAM_ALPHA`, so a frayed particle shipped
 * at 0.35 × 0.62 = 0.217. STREAM_ALPHA is now the DUST FLOOR (0.06) with
 * BEAD_ALPHA as its travelling peak, and multiplying the debris by either
 * would be wrong — dead links carry no traffic. The debris branch therefore
 * became ABSOLUTE, and the constant re-baked to the 0.217 that shipped.
 *
 * ROUND-8-I — RE-CHECKED, DELIBERATELY UNCHANGED. The haze pass cut the resting
 * dust 5× (STREAM_ALPHA 0.06 → 0.012) and the question was whether the fracture
 * debris rides the same alpha. It does not — that is exactly what "the debris
 * branch is ABSOLUTE" above buys — so the fray/debris story keeps its full
 * level while the healthy dust around it drops, and the break goes from 3.7× to
 * **18.3×** its surroundings. No split of the constant is owed; the round makes
 * the fracture read louder, not quieter.
 */
export const DEBRIS_ALPHA_MAX = 0.22;
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
export const PACKET_COUNT = 2;
/** Packet clock rate (cycles/sec, ×0.75..1.25 per-packet hash variance).
 * Mean inter-packet interval per link ≈ 1/(RATE·COUNT) ≈ 1.7s. */
export const PACKET_RATE = 0.3;
/** A packet travels its link in 1/SPAN of the cycle (duty cycle — the rest
 * of the cycle the packet is off-link and invisible). Crossing time =
 * 1/(RATE·SPAN) ≈ 0.56s. */
export const PACKET_SPAN = 6;
/** Gaussian half-width of the packet highlight along per-edge s. ROUND-8-G:
 * 0.06 → 0.07 (≈10px at ±1σ on a 680px band) — with 21.3 particles per link
 * that is ~3 sprites inside 1σ and ~6 inside 2σ, so the bead reads as one
 * smooth travelling dot rather than a sprite handing off to a sprite. */
export const PACKET_WIDTH = 0.07;
/** Peak emissive gain: ×(1 + GAIN) at the packet center = ×2.2 — above the
 * >1.0 bloom floor, so packets BLOOM like little signals. */
export const PACKET_GAIN = 1.2;
/** Size swell at the packet center (rides beside the surge's 0.45).
 * ROUND-8-G: 0.3 → **2.0**. It now has to lift the RESTING dust (DUST_SIZE
 * 0.55 ⇒ ≈3.4px) back into a bead: 0.83 × 0.55 × (1 + 2.0) × NEURAL_POINT_SIZE
 * 7.5 = **10.3px** at the bead centre, 3× its own dust and comfortably under
 * the 15.1px star core it is travelling toward. */
export const PACKET_SIZE = 2.0;
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
/** Displacement scale (local units). It USED to derive from the filament
 * cross-section (STRAND_RADIUS + STRAND_THICKNESS); round-8-G zeroed the braid
 * so the beads ride the line, which would have silently killed the curl with
 * it. Frozen here at the round-8-F value 0.0034 + 0.0018 = **0.0052** so the
 * fray still shreds organically and the WRAP_SNAP_DIST arithmetic below (curl
 * excursion ≈ CURL_GAIN × CURL_SCALE ≈ 0.0008) is unchanged. */
export const CURL_SCALE = 0.0052;
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
/** +25%·vel while you scroll. ROUND-8-G re-homed it: it used to thicken the
 * particle filament through widthEnvelope (now inert — see ENVELOPE_BASE); it
 * now rides the LINE's capped emissive chain, so the net ENERGISES while you
 * scroll instead of fattening. Same constant, same damped uScrollVel. */
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

/**
 * ═══ ROUND 13 — THE SCROLL-VELOCITY BOOSTS ARE KILLED ON THE RIBBON ═════════
 *
 * Owner, 2026-08-26: the construction particles "passano sopra e si vedono"
 * during a fast scroll — and they must NOT be seen. The streaks he named are
 * these four boosts. They were authored in round 4/8 for dust at STREAM_ALPHA
 * 0.012 and 0.28 CSS px, where "the net energises under velocity" was a
 * subliminal shimmer; round 12 · D made the same particles THE LINE (0.125,
 * 2.8 px, 10× the light), so a flick now sends visible motes racing along and
 * off the filaments — read, correctly, as particles flying ahead to build the
 * next stretch. On the ribbon the flow keeps its calm 1×/s clock, the curl
 * keeps its resting amplitude, and only a whisper of the stretch survives
 * (the river/surge advection streak is authored light and is NOT part of
 * this — it stays). `#production` keeps the round-8 values.
 */
export const VEL_SWELL_RIBBON = 0;
export const VEL_STRETCH_RIBBON = 0.1;
export const VEL_FLOW_RIBBON = 0.05;
export const VEL_CURL_RIBBON = 0;

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
 * STARS, the LINE layer is the mesh that connects them, and the link particles
 * are the traffic that travels it.
 *
 * THE BLOOM CONTRACT (unchanged, and it is the binding constraint on every
 * number in this section): PostFXNodes thresholds Rec709 luminance ≈1.0 on the
 * POST-BLEND framebuffer, i.e. on `tone × emissive × alpha`, NOT on the
 * emissive multiplier alone. Luminance is measured in LINEAR space, the way
 * three converts a hex Color: lum(COL_CYAN #3BE1FF) = 0.6201, lum(COL_BLUE
 * #2A7FFF) = 0.2289, lum(COL_CORE #EAFBFF) = 0.9371.
 *
 * ROUND-8-I LEDGER (post-blend luminance, threshold = 1.0; 8-G value in
 * brackets where it moved):
 *   star CORE  10.67  blooms hard   (3.0 × STAR_PUNCH 3.2 × STAR_CORE_EMIS
 *                                    1.25 = 12.0, tone 0.889, NODE_ALPHA 1.0)
 *                                   [7.33]
 *   packet BEAD 3.65  blooms        UNCHANGED — beads ride uBeadAlpha, not the
 *                                   dust floor (see BEAD_ALPHA)
 *   star flare tip 1.029            [0.71] ⚠ now just over the floor — see the
 *                                   tie derivation at STAR_CORE_EMIS
 *   LINK LINE  0.568  NEVER blooms  UNCHANGED (see LINE_EMISSIVE; capped 0.968)
 *   resting dust 0.018              [0.090] — 3.2% of the line it rides, i.e.
 *                                   a grain ON the line instead of a fog over
 *                                   the band (see STREAM_ALPHA)
 *   fracture debris 0.22 alpha      UNCHANGED (absolute branch — DEBRIS_ALPHA_MAX)
 * The star core therefore sits **18.8× the link line** at rest (was 12.9×),
 * 11.0× at the line's absolute ceiling, and **593× the resting dust** (was
 * 81×): stars are the subject by an order of magnitude, which is what the
 * owner's reference image actually looks like.
 *
 * ROUND-8-F was LIVE-MEASURED (the owner's Chrome pass) and lifted
 * STREAM_EMISSIVE 1.6 → 2.1 to stop the particle-drawn links reading as dust.
 * ROUND-8-G keeps 2.1 but re-purposes it: it is the TRAFFIC's emissive now
 * (the thread it used to draw is real geometry), so the old razor-thin
 * headroom ("STREAM_EMISSIVE × STREAM_ALPHA < 1.348; we sit at 1.302") is
 * gone — the product is 2.1 × 0.06 = 0.126 at rest and deliberately over the
 * threshold only where a bead or the surge head is passing.
 */
export const STREAM_EMISSIVE = 2.1;
export const RING_EMISSIVE = 3.0;
/**
 * RESTING alpha of a LINK particle — the DUST FLOOR since round-8-G (0.62 →
 * 0.06). These particles no longer draw the thread, so at rest they must not
 * pretend to. BEAD_ALPHA is the other end of the same ramp; star cores use
 * NODE_ALPHA instead. Live: `uniforms.uDustAlpha`.
 *
 * ═══ ROUND-8-I (LIVE-VERIFIED) — 0.06 → **0.012**. THE HAZE. ═══
 *
 * Round-8-G sized this as "the line's soft core" (post-blend 0.6201 × (2.1 ×
 * midProfile 1.15) × 0.06 = 0.090, 16% of the line's own 0.568) and checked it
 * PER PARTICLE. That was the error: the quantity the eye integrates is the
 * COVERAGE. 4,828 resting link particles × a 3.4px² DUST_SIZE sprite ≈ 58k px²
 * of additive fill at 0.090 each ⇒ **≈5.2k px²·lum smeared over the whole
 * band** — a fog, and the reference image has no fog in it, only lines and
 * stars. Live, dropping this one number transformed the read: crisp blue
 * triangles + bright white star nodes, i.e. the owner's grammar.
 *   post-blend per particle  0.090 → **0.018** (3.2% of the line, was 16%)
 *   integrated band haze     ≈5.2k → **≈1.0k** px²·lum (−80%)
 * Still VISIBLE, deliberately: 0.018 lumLin encodes to ~36/255 of cyan added
 * over the near-black page navy, so the line keeps a soft core and the traffic
 * keeps a trail — it just stops being a veil.
 *
 * WHAT THIS DOES NOT TOUCH (both checked in neuralFieldCompute, not assumed):
 *   - the packet BEADS. `mix(uDustAlpha, uBeadAlpha, traffic)` — a bead sits at
 *     traffic ≈ 1, i.e. on BEAD_ALPHA 0.9, so its 3.65 post-blend is untouched.
 *     The beads are the owner-loved feature and they now stand **50× above the
 *     dust they travel through** instead of 15×.
 *   - the FRACTURE DEBRIS / fray story, which rides the SAME particles but NOT
 *     this constant: since round-8-G the debris branch is ABSOLUTE
 *     (`mix(liveA, debrisA, disp)` with debrisA = DEBRIS_ALPHA_MAX 0.22 × the
 *     fade ramp), because a dead link carries no traffic. So no split is owed —
 *     and the fracture actually reads STRONGER, the debris going from 3.7× to
 *     **18.3×** the healthy resting dust.
 */
export const STREAM_ALPHA = 0.012;
/**
 * PEAK alpha of a LINK particle at a packet bead / under the surge head — the
 * top of the `mix(STREAM_ALPHA, BEAD_ALPHA, traffic)` ramp, where traffic =
 * clamp(packet + 0.8·surge, 0, 1).
 *
 * Post-blend at a bead centre: tone = mix(COL_CYAN, COL_CORE, PACKET_WHITE
 * 0.45) ⇒ lum 0.7629; emissive = (1 + packet × uPacketGain 1.2) × 2.1 ×
 * midProfile 1.15 = 5.313; × 0.9 = **3.648** — 3.6× the bloom threshold, so
 * beads BLOOM (half a star core, which is right: a bead is what a star eats).
 * Under a full surge head it is brighter still (≈4.96) — the wavefront is
 * meant to blaze through the mesh. Live: `uniforms.uBeadAlpha`.
 */
export const BEAD_ALPHA = 0.9;
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
 *   - pointer bend — POINTER_PUSH cut 12 → 1.6 (round-8-D) → **0.6**
 *     (round-8-G, see the constant: the particles are the travelling beads
 *     now, and an 18px fling would park a lit bead beside its own line). The
 *     bound is the steady-state spring displacement under the peak cursor
 *     acceleration, POINTER_PUSH / NEURAL_SPRING = 0.6/60 = **0.010** (the
 *     radial term peaks at f² = 1 and the neural attractor passes orbit = 0,
 *     so nothing rides on top; lockGain only ever RAISES the spring, which
 *     shrinks the excursion further). Raising POINTER_PUSH above 2.28 breaks
 *     the invariant — round-8-D sat at 1.6, i.e. a 1.4× clearance; 0.6 is a
 *     3.8× one.
 *   - reveal lag / fray / re-cohere — the kernel only ARMS the snap in the
 *     steady state (uReveal > 0.9, uRecohere < 0.02, not dispersing), see the
 *     `armed` gate in neuralFieldCompute's simulate(). uReveal is damped at
 *     λ = 2.5 toward `scrollStore.reveal × visibility`, and scrollStore.reveal
 *     is only ever 0 or 1 (default 1), so the gate is reached ~0.9 s after the
 *     section scrolls in — it can never latch off permanently.
 * Curl stays ≈ CURL_GAIN·CURL_SCALE ≈ 0.0008 (round-8-G FROZE CURL_SCALE at
 * the round-8-F value 0.0052 instead of letting it track STRAND_RADIUS, which
 * went to 0 — see the constant; the curl term is added OUTSIDE widthEnvelope,
 * so ENVELOPE_BASE 1.8 does not scale it). Total steady-state excursion
 * 0.010 + 0.0008 = **0.0108** < 0.038 — the guard clears by **3.5×** (it was
 * 1.38× at round-8-D's 1.6). Invariant to preserve:
 * POINTER_PUSH/NEURAL_SPRING < WRAP_SNAP_DIST < EDGE_MIN_LOCAL ≤ the shortest
 * delivered link, and WRAP_SNAP_DIST > every steady-state excursion.
 */
export const WRAP_SNAP_DIST = 0.038;
/** Sparks track a fast analytic burst anchor — snap on the (invisible)
 * re-park jump between flashes so no backwards streak leaks. */
export const SPARK_SNAP_DIST = 0.12;

// --- Pointer bend (compute tier; existing unified force model) ---------------
/**
 * Radial repulsion strength — the cursor locally pushes nearby particles.
 * ROUND-8-D: 12 → 1.6 so the max bend stays under WRAP_SNAP_DIST.
 *
 * ROUND-8-G: 1.6 → **0.6**. The thing the cursor used to bend WAS the link —
 * the filament was made of these particles, so the mesh dimpled. The mesh is
 * rigid line geometry now, and the particles on it are the travelling beads,
 * so the old steady-state excursion (POINTER_PUSH / NEURAL_SPRING = 1.6/60 =
 * 0.0267 local ≈ 18px on a 680px band) would fling a bright bead half a link
 * AWAY from the line it is supposed to be riding — the exact "beside the line"
 * failure this round exists to remove. At 0.6 the peak excursion is 0.010
 * (≈6.8px, under one bead diameter) and the cursor still visibly disturbs the
 * traffic where it passes.
 *
 * Bending the LINE to match was considered and rejected: the bend is a spring
 * steady state inside the COMPUTE kernel, so an analytic copy in the line's
 * vertex stage would bend the lines on the static tier where the particles do
 * not bend at all — trading a small mismatch on one backend for a guaranteed
 * one on the other.
 *
 * The WRAP_SNAP invariant gains margin: 0.010 + curl 0.0008 = 0.0108 against
 * WRAP_SNAP_DIST 0.038 — a 3.5× clearance where round-8-D had 1.38×.
 */
export const POINTER_PUSH = 0.6;
/** Influence radius (local units — anisotropic with the rect scale, fine). */
export const POINTER_RADIUS = 0.1;

// --- Reveal seed cloud --------------------------------------------------------
export const SEED_SCATTER_XY = 0.95;
export const SEED_SCATTER_Z = 0.7;
/**
 * ═══ ROUND 13c — THE RIBBON MATERIALISES IN PLACE ════════════════════════════
 *
 * Owner (with screenshot, 2026-08-26): "vedo ancora la rete neurale che si
 * sposta sopra con lo scroll, per andare nella posizione attuale della pagina
 * e costruirsi". What he photographed is the REVEAL COALESCE: seeds are
 * scattered about the FIELD ORIGIN (±SEED_SCATTER_XY/2 ≈ ±0.47 local), which
 * covered the old one-frame ellipsoid band but on a 3.79-frame ribbon means a
 * particle can fly ~2 local units ACROSS THE PAGE to reach its anchor — a
 * condensing cloud, visible for the whole λ=2.5 ramp.
 *
 * On the ribbon the seed is reinterpreted as a SMALL OFFSET FROM THE
 * PARTICLE'S OWN ANCHOR (`anchor + seed·(1−rv)` on both tiers), so the net
 * fades in already assembled — each mote drifts ≤ ~30 px into place — and the
 * driver's reveal damp quickens (2.5 → 9). Nothing flies anywhere.
 * `#production` keeps the round-2 origin-scatter coalesce untouched.
 */
export const SEED_SCATTER_RIBBON = 0.07;
export const SEED_SCATTER_Z_RIBBON = 0.05;
/** Ribbon reveal damp λ (driver-side; non-ribbon keeps 2.5). */
export const REVEAL_DAMP_RIBBON = 9;

// --- Whole-group life (subtle — the net is layout-registered) ----------------
export const NEURAL_PARALLAX = 0.06;
export const NEURAL_AUTO_ORBIT = 0.03;
export const NEURAL_ORBIT_FREQ_Y = 0.18;
export const NEURAL_ORBIT_FREQ_X = 0.13;
export const NEURAL_Z_BREATHE = 0.015;
/** group.scale.z = rect-height·k · this factor (honest depth for the net). */
export const NEURAL_DEPTH_SCALE_FACTOR = 1.0;
/**
 * ROUND 11 — THE DEPTH, MADE A CONSTANT OF THE SITE INSTEAD OF AN ACCIDENT OF
 * ONE SECTION'S HEIGHT (mechanism §4.2-1).
 *
 * `zWorld = rect.h · k · NEURAL_DEPTH_SCALE_FACTOR` ties the cloud's DEPTH to
 * the anchor's HEIGHT, which is fine at today's 619 px band and catastrophic
 * once a section grows: at a 4392 px anchor `zWorld` reaches 68.26, node
 * world-z ±13.65, camera distances **[−1.65, 25.65] — nodes BEHIND the
 * camera**, and the cloud inverts.
 *
 * A band whose height is viewport-relative is measured against
 * WORLD_VIEW_HEIGHT instead, so `ih` cancels and the depth spread of the
 * shipped look becomes exact at every viewport and every runway:
 *
 *     zWorld = WORLD_VIEW_HEIGHT · NEURAL_DEPTH_VIEWPORT_SPAN = 9.6215
 *     node world-z = ±1.9243, camera distance ∈ [10.076, 13.924]
 *
 * 0.8597 = 619/720 — today's `#problem` band on the 1280×720 reference. Only
 * a band the traverse owns takes this path; every other band keeps the shipped
 * formula byte-for-byte.
 *
 * ⚠ It makes the depth a CONSTANT, which is not the same as making it
 * UNCHANGED. Measured HEAD `zWorld` (= rect.h·k) against this 9.6212:
 * 1280×720 9.617 · 1440×900 7.979 · 768×1024 5.634 · 390×844 6.397. So a
 * traversed band is 20–71 % DEEPER than it was at every non-reference
 * viewport — deliberate (it is now viewport-invariant, and `minNodeDist`
 * measures 10.076 ≥ 10.0 everywhere, verified 1280/1440/768/390), but it is a
 * look change, not a preservation.
 */
export const NEURAL_DEPTH_VIEWPORT_SPAN = 0.8597;

// === ROUND 9-B — THE COPY-COLUMN MASK =======================================
// Owner, verbatim (2026-08-24): "la rete neurale ora sta sopra le scritte, deve
// stare sotto, le scritte non si leggono."
//
// NOT A STACKING BUG. The canvas is behind the DOM; this is a CONTRAST bug that
// round 8-G/8-I created by design — the plexus became crisp and bright (star
// core post-blend 10.67, links 0.568 under a soft knee) and it runs straight
// across the ledger copy in both neural bands.
//
// THE GEOMETRY, DERIVED FROM THE DOM (not guessed). The `[data-lattice-anchor]`
// band is FULL-BLEED — `left-[calc(50%-50vw)] right-[calc(50%-50vw)]` on a
// container that is itself centred — so rect.w = 100vw and LOCAL x = 0 is the
// viewport centre-line. The ledger body copy is `max-w-[34em]`, left-aligned
// inside `container-px` (`padding-inline: --margin`, 10rem ≥1280; `max-width:
// 1600px`, `margin-inline: auto`) at `clamp(0.95rem, 1.05vw, 1.15rem)`. Its
// RIGHT bound, as a fraction of the band width (the same derivation crystalFog
// / FOG_CLEAR runs, re-run here for the copy box instead of the fog radius):
//
//   W      --margin  content-left  font px  34em px  copy right  Δ vs centre   local x
//   1280   160       160           15.20    516.8    676.8       +36.8  CROSSES  +0.0287
//   1366   160       160           15.20    516.8    676.8        −6.2           −0.0045
//   1440   160       160           15.20    516.8    676.8       −43.2           −0.0300
//   1500   160       160           15.75    535.5    695.5       −54.5           −0.0363
//   1600   160       160           16.80    571.2    731.2       −68.8           −0.0430
//   1728   160       224           18.14    616.9    840.9       −23.1           −0.0134
//   1920   160       320           18.40    625.6    945.6       −14.4           −0.0075
//
// (font px = clamp(15.2, 1.05·W/100, 18.4) — note 1.05vw is still UNDER the
// 0.95rem floor at 1440, which is why the measure does not move until 1500;
// content-left = (W − min(W,1600))/2 + 160; centre = W/2. Assumes overlay
// scrollbars — a classic 15 px scrollbar shifts every Δ by ≈ ±7 px ≈ ±0.006 of
// local x, which COPY_EDGE_PAD absorbs.)
//
// CROSS-CHECK: this column reproduces crystalConfig's FOG_CLEAR table EXACTLY
// (−37 / +6 / +43 / +55 / +69 / +23 / +14 px) — same derivation, same measure,
// independently re-run for the copy box rather than the fog radius.
//
// So the copy is NOT always left of the centre-line: at 1280 it CROSSES it by
// 37 px. Among DESKTOP widths the worst case is therefore local x **+0.029**,
// and the mask's floor bound has to sit right of THAT, not of the centre-line.
// The table does NOT stop there, though — see WHAT IT COSTS below: the gutter
// narrows under 1280 and the copy keeps growing rightward (+0.098 at 1024,
// +0.256 at 768, +0.418 at 390). The driver measures the real
// `[data-row-body]` boxes per band and writes the result into `uCopyEdge`;
// `copyEdgeFallback(bandWidth)` re-derives this same table in code for the case
// where no body box is measurable, and COPY_EDGE_LOCAL is only the build-time
// uniform default.
//
// THE MASK (one pure function of LOCAL x/y, evaluated by BOTH layers at their
// own live local position — `posL` on the LineSegments layer, the simulated /
// analytic particle position on the particle layer — so the two cannot
// disagree by construction):
//
//   gate   = smoothstep(uCopyEdge, uCopyEdge + uCopySoft, x)     // 0 → 1
//   yTerm  = mix(1, uCopyYFloor, 1 − smoothstep(Y_IN, Y_OUT, |y|))
//   mask   = mix(FLOOR, 1, gate) · yTerm
//
// with a SEPARATE floor per layer (same ramp, different depth — see
// COPY_MASK_FLOOR vs COPY_MASK_FLOOR_LINE; the star cores are 18.8× the lines,
// so one shared floor would either blind the copy or delete the mesh).
//
// THE ACCEPTANCE TEST IS ARITHMETIC, NOT TASTE. `--ink-mute` #8A94A6 has
// relative luminance 0.2935; `--bg` #0B1422 has 0.00686 ⇒ the bare page is
// 6.04:1. The canvas composites ADDITIVELY under the DOM, so WCAG AA (4.5:1)
// breaks when the mesh adds
//     ΔL_max = (0.29336 + 0.05)/4.5 − 0.05 − 0.00687 = **0.01943**.
// Delivered at the floor (yTerm taken as 1 — the conservative end):
//     star node CENTRE   6.5 · 10.67 · 1e-4 = 0.00694   (the overlap is real:
//        12.05 core particles/node, 70.6 % of them inside one 2.19 px sprite
//        radius, mean disc 0.73 ⇒ ≈6.5 sprites on the centre pixel)
//     single star fragment  10.67 · 1e-4    = 0.00107
//     link LINE (own floor, own LINE_LUM_MAX ceiling): rest 0.568 · 3e-3 =
//        0.0017, ABSOLUTE ceiling 0.97 · 3e-3 = 0.00291
//     resting dust 0.018 · 1e-4 = 1.8e-6, resting packet bead 3.65 · 1e-4 =
//        0.00037 — but a bead is NOT gated the way the star's ignition is, so
//        its reachable peak is the honest number: under the surge head, on a
//        HOVERED row, emissive (1 + surge·2.2 + packet·1.2)·2.1·mid 1.15·
//        shimmer 1.04·rowBright 2.0 = 22.1 at COL_CORE (lum 0.9371) × bead
//        alpha 0.9 ⇒ **18.6 post-blend**, i.e. 0.00186 at the floor. Left
//        ungated on purpose: at 1/10 of the AA budget the traffic reads as a
//        faint travelling grain instead of vanishing, and the row-reactive
//        current stays legible where the reader's own hover put it.
//   ⇒ brightest remaining pixel 0.00694  →  **5.38:1** (AA pass, 2.80× the
//     added light still available before the gate). 6.5 is a deliberate
//     OVER-estimate of the sprite overlap: re-derived from the real chain
//     (ρ = STAR_CORE_R·STAR_SPREAD·U^2.4 in local units × band height for the
//     aspect-corrected star, against a sprite whose device-px diameter is
//     uPointSize·sizeK/CAMERA_Z) the sum of disc at the centre pixel is ≈3.9
//     on the full tier and ≈2.5 on lite (fewer stars per node, same sprite
//     size), i.e. the real figure is 0.0040 → 5.65:1.
//   ⇒ pathological superposition (a capped line crossing a node centre, a bead
//     riding it) 0.00694 + 0.00291 + 0.00186 = 0.0117  →  **5.05:1**
//     (AA pass, 1.66× headroom on the conservative overlap; 5.32:1 on the
//     re-derived one)
//   ⇒ the nebula smoke (broken only) rides the LINE floor too — 1.6e-4 — and
//     since it is a QUAD, not a point, its mask is evaluated per FRAGMENT (see
//     neuralFieldCompute C5): per-vertex it would be a chord through the ramp,
//     which at phone aspects reads gate 0.80 where the truth is 0.
// Nothing in the copy column reaches 1/150 of the ≈1.0 bloom threshold either,
// so the column receives no smeared bloom light on top.
//
// WHAT STAYS INTACT: right of the ramp the GATE is exactly 1 and every round-8
// ratio is preserved — crisp lines, bright stars, the fracture (measured
// streamCenter(FRACTURE_T).x = +0.139 → gate 0.85 at 1280, 1.0 at ≥1366), the
// debris and the packet beads. The vertical term still multiplies on top
// (0.6 across the reading zone), so "gate 1" is "mask 0.6" at the band's
// middle — a uniform 40 % ceiling drop that scales every element identically.
// Set COPY_MASK_FLOOR / COPY_MASK_FLOOR_LINE / COPY_Y_FLOOR to 1 for exactly
// the round-8-I look.
//
// The CRYSTAL is NOT masked — CrystalCluster is a separate island with its own
// build and reads none of these uniforms. At desktop widths it sits at local x
// ∈ [+0.08, +0.26], entirely right of the copy, so that is free. It is NOT
// free below ~1100 px (next paragraph).
//
// WHAT IT COSTS — MEASURED, not estimated (per-viewport, broken/full: 103
// nodes, 227 links; "@floor" = gate exactly 0, "<full" = anywhere in the ramp):
//
//   W      uCopyEdge   nodes@floor   links@floor   mean node mask   mean link
//   390      0.4529      97 %          98 %          0.002           0.003
//   768      0.2912      84 %          85 %          0.066           0.059
//   1024     0.1334      78 %          82 %          0.125           0.098
//   1280     0.0637      70 %          74 %          0.147           0.108
//   1366     0.0305      66 %          70 %          0.172           0.126
//   1440     0.0050      60 %          65 %          0.199           0.150
//   1600    −0.0080      59 %          63 %          0.215           0.165
//   1920     0.0275      63 %          68 %          0.174           0.128
//
// (healthy/full and broken/lite are within ±6 points of these at every width.)
// So the trade is 59–70 % of the cloud at desktop widths, not half — and it is
// NOT bounded there. `container-px` narrows the gutter and the copy stops being
// a left column: at 768 the copy ends at local +0.256 and at 390 at +0.418,
// where the mask floors essentially the ENTIRE plexus (mean node mask 0.002 —
// invisible). A capable phone mounts this island (fxBudget level 2), so on a
// phone the Problem/ProductionGrade bands keep the dot-grid and the (unmasked)
// crystal and lose the net.
//
// THAT IS THE DECLARED DESIGN'S HONEST CONSEQUENCE, NOT AN IMPLEMENTATION BUG:
// where the copy spans the band, "dim everything left of the copy" means "dim
// everything". Fixing it needs a DIFFERENT instrument below ~1100 px (a global
// dim + the vertical term rather than an x gate, or a narrow-viewport cloud) —
// an owner call, not a constant tweak. Recorded here so the next reader is not
// surprised by an empty phone band.
/** BUILD-TIME default for `uCopyEdge` — the 1280 case from the table above, so
 * a field that is built but never driven (no NeuralLattice, a measure that has
 * not run yet) starts SAFE at desktop widths rather than at full strength. The
 * driver overwrites it on every measure: the real `[data-row-body]` bound when
 * one is measurable, `copyEdgeFallback(bandWidth)` when none is. */
export const COPY_EDGE_LOCAL = 0.03;
/**
 * The copy bound DERIVED from the viewport — the fallback the driver uses when
 * no `[data-row-body]` box is measurable (a section rename, an anchor that is
 * not inside its `<section>`). It re-runs the table above in code:
 * `container-px` = `padding-inline: --margin` (2/4/6/10 rem at 0/768/1024/1280),
 * `max-width: 1600px`, `margin-inline: auto`; the ledger body is `max-w-[34em]`
 * at `clamp(0.95rem, 1.05vw, 1.15rem)`, stepping down to `0.875rem` under
 * Tailwind's `sm` (640 px). Root font-size is assumed 16 px (the site never
 * changes it).
 *
 * WHY NOT JUST COPY_EDGE_LOCAL: +0.029 is the worst case only among DESKTOP
 * widths. Below 1280 the gutter narrows and the copy keeps growing rightward —
 * +0.098 at 1024, +0.256 at 768, +0.418 at 390 — so a constant fallback would
 * leave the net at FULL strength over the copy on exactly the viewports where
 * the copy fills the band. Under-protecting is the one direction a readability
 * guard must never fail in, and this costs one arithmetic call per measure.
 *
 * Accuracy: `bandWidth` is the full-bleed band (100vw), while the container's
 * centring uses `clientWidth`; with a classic scrollbar the two differ by ~15 px
 * ⇒ ~0.012 of local x, comfortably inside COPY_EDGE_PAD. This is a fallback,
 * not the measure — when the DOM box exists it always wins.
 */
export function copyEdgeFallback(bandWidth: number): number {
  const W = Math.max(bandWidth, 1);
  const margin = W >= 1280 ? 160 : W >= 1024 ? 96 : W >= 768 ? 64 : 32;
  const contentW = Math.min(W, 1600);
  const left = (W - contentW) / 2 + margin;
  const avail = Math.max(contentW - 2 * margin, 0);
  const fontPx = W < 640 ? 14 : Math.min(18.4, Math.max(15.2, 0.0105 * W));
  return (left + Math.min(34 * fontPx, avail) - W / 2) / W;
}
/**
 * Safety margin added to the MEASURED copy edge before it becomes the mask's
 * floor bound. It pays for two things:
 *   - the inner group's LIFE. `inner.rotation.y` reaches NEURAL_AUTO_ORBIT +
 *     NEURAL_PARALLAX = 0.09 rad, and the mask is evaluated on the UNROTATED
 *     local position, so a node at local z = PLEXUS_RZ 0.2 can DRAW up to
 *     0.2·sin(0.09) = **0.018** of band width left of where it is masked. (The
 *     drift is identical for both layers — the group rotates rigidly — so this
 *     is a DOM-registration margin, never a line/particle disagreement.)
 *   - measure slack: scrollbar presence (±0.006), sub-pixel layout, font
 *     fallback before Switzer lands.
 * 0.035 clears the steady-state drift by 1.9×. During the ~0.9 s reveal
 * coalesce a seed-scattered particle sits at |z| ≤ SEED_SCATTER_Z/2 = 0.35 and
 * can drift 0.031 — still inside the pad, and its alpha is scaled by uReveal
 * the whole way in.
 */
export const COPY_EDGE_PAD = 0.035;
/**
 * Width of the floor→full ramp in local x (band-width fractions). Checked at
 * the shipped edge (measured copy bound + COPY_EDGE_PAD) across the table
 * above — the thing that must survive and the one that must not start. The
 * numbers below are the GATE (the x term); the vertical term multiplies 0.6–1.0
 * on top, so the delivered mask at the band's middle is 0.6× these:
 *
 *   W      uCopyEdge   gate at the fracture (x = +0.139)   bloom onset
 *   1280     0.0637              0.850                      +69 px
 *   1366     0.0305              0.997                      +74 px
 *   1440     0.0050              1.000                      +78 px
 *   1600    −0.0080              1.000                      +86 px
 *   1728     0.0216              1.000                      +93 px
 *   1920     0.0275              1.000                     +103 px
 *
 * "bloom onset" is the first x at which a star core can exceed the ≈1.0
 * threshold (mask ≥ 1/10.67 = 0.0937 ⇒ gate ≥ 0.0937 ⇒ x ≥ uCopyEdge +
 * 0.021·SOFT/0.1), expressed as its distance RIGHT of the measured copy edge.
 * It is 69–103 px at every width — and it is the CONSERVATIVE end, because the
 * vertical term pushes the real onset further right across the reading zone —
 * so the copy column receives no smeared bloom light either; the AA ledger is
 * the whole story, not half of it.
 *
 * Widening this softens the transition but pulls the fracture down at 1280;
 * narrowing it sharpens the boundary into something the eye can find.
 */
export const COPY_RAMP_SOFT = 0.1;
/**
 * ROUND 11 — THE HALF-PLANE, EXPRESSED AS A LANE.
 *
 * Under the diagonal traverse the copy translates relative to the net, so the
 * shipped half-plane gate ("dim everything left of the copy") goes DEGENERATE:
 * swept to local x ≈ +1.5 it dims the entire cloud, swept to −1.5 it dims
 * nothing — round 9-B's narrow-viewport failure reached by translation instead
 * of by width. So the gate is now a two-sided LANE centred on the copy
 * (`uCopyLaneC` ± `uCopyLaneW`, same `uCopySoft` ramp, mechanism §2B.4).
 *
 * THIS CONSTANT IS THE BACKWARD-COMPATIBILITY HINGE. A lane whose half-width
 * is far wider than the band reproduces the half-plane EXACTLY:
 *
 *     laneC = edge − W,  laneW = W
 *     ⇒ gate = smoothstep(W, W+soft, |x − laneC|) ≡ smoothstep(edge, edge+soft, x)
 *
 * for every x > laneC, which is every point in the band. 2.0 puts the lane's
 * unused left wall at local x ≈ −1.5, far outside the cloud's [−0.45, +0.51]
 * extent at every viewport, and keeps the fp32 error of the `+W … −W` round
 * trip at ~2e-7 of local x — six orders of magnitude inside the 0.1 ramp.
 * The un-traversed band (`#production`) is driven with exactly this pair and
 * is therefore byte-identical to the shipped half-plane.
 */
export const COPY_LANE_OPEN_W = 2.0;
/**
 * ROUND 12 · STAGE 2 — THE SAME HINGE, SIZED FOR THE RIBBON.
 *
 * The identity above holds only while EVERY point of the field sits right of
 * the lane's unused left wall at `laneC − W = edge + pad − W`. On the shipped
 * band that wall is at local x ≈ −1.5 against a [−0.45, +0.51] cloud: five
 * band-widths of margin. Under the D17 ribbon the field spans ±L/2 = **±1.895
 * band-widths** at 1920×935 (±6.4 on the phone), so at the worst measured
 * `edge + pad` (≈0.48) the wall lands at −1.52 — **inside** the field — and
 * every node left of it reads UNMASKED. 4.0 puts the wall at ≈−3.5, clear of
 * the desktop field; the phone never uses this value (its lane is driven per
 * frame from the tracked block, where the half-width is ~0.2 and the wall
 * question does not arise). This is the FALLBACK / pre-first-frame pair only.
 */
export const COPY_LANE_OPEN_W_RIBBON = 4.0;
/**
 * Mask floor for the PARTICLE layer (stars, link dust/beads, debris, sparks).
 * Sized on the star core, which is the brightest thing in the band and the
 * acceptance test's subject: 6.5 (centre overlap) × 10.67 (post-blend) × this
 * = 0.00694 ⇒ 5.38:1. There is no gentler number available. An UNMASKED star
 * centre pixel delivers 6.5 × 10.67 = 69.4 against an AA budget of 0.01943 —
 * **3,570×** (549× for a single fragment) — so the ceiling on this constant is
 * 0.01943/69.4 = 2.8e-4 and anything above it fails outright. (Re-derived from
 * the seeding chain the overlap is ≈3.9 on the full tier and ≈2.5 on lite,
 * which would put the ceiling at 4.7e-4; 6.5 is kept as the conservative end.)
 *
 * The ignition machinery is gated OFF at the floor rather than being paid for
 * here (see neuralFieldCompute's `cGate` on zGate / surge / kiss): a fully
 * ignited star core reaches ≈165 post-blend (×15.5 its rest value — glow 1.9 ×
 * flash 3.4 × surge 1.6 × kiss 1.5), and sizing this floor for THAT would have
 * cost the resting star field its last 15× of visibility.
 */
export const COPY_MASK_FLOOR = 1;
/**
 * ROUND 12 · D — THE LINK ROLE'S OWN FLOOR, and the 2.8e-4 ceiling quoted
 * above does NOT bind it.
 *
 * That ceiling belongs to `COPY_MASK_FLOOR` alone and is derived from an
 * UNMASKED STAR CENTRE of 69.4. A link role whose covered-pixel luminance is
 * O(1) is bounded by the ledger's own worst-pixel rule instead:
 *   ΔL_max 0.01943 − star centre 0.00694 − bead 0.00186 = **0.01063**, which
 * is 3.65× what the chord delivered (0.00291) into the same column.
 * At 0.017 the in-column strand delivers 0.24 × 0.017 = 0.0041 (1.4× the
 * chord's) and the pathological superposition 0.0110 ⇒ **≈5.1:1**, above AA.
 *
 * ⚠ IT MUST RIDE REST-NESS, NOT ROLE: `mix(COPY_MASK_FLOOR, this,
 * (1−traffic)·(1−river))`. A bead at post-blend 1.80 on a 0.017 floor would
 * deliver 0.031 — 1.6× the ENTIRE AA budget. Only the RESTING dust gets the
 * high floor; every lift term is `.mul(cGate)` and vanishes in the column
 * anyway.
 * ⚠ AND IT MUST BE FOLDED INTO `cMask` AT ITS SINGLE CONSTRUCTION SITE,
 * because `cMask` feeds BOTH the output alpha AND the discard threshold.
 * Raise the alpha alone and you get a fill regression plus a hard edge at the
 * role boundary; scale the alpha without the cut and particles DELETE instead
 * of fading.
 */
export const COPY_MASK_FLOOR_STREAM = 0.017;
/**
 * Mask floor for the LINE layer. 30× the particle floor ON PURPOSE: the star
 * core is 18.8× the link line, so a single shared floor either blinds the copy
 * column (sized on the line) or deletes the mesh from it (sized on the star).
 * Two floors on ONE ramp keep the reference grammar — faint threads with faint
 * nodes — at ~1 % strength instead of collapsing it to points.
 *
 * Bounded by construction, not by hope: the line's delivered post-blend
 * luminance is already ≤ LINE_LUM_MAX 0.97 at every gain and every tone (the
 * round-8-G soft knee), and the mask multiplies the OUTPUT alpha only — the
 * cap arithmetic upstream is untouched — so the copy column's line ceiling is
 * exactly 0.97 × this = 0.00291.
 */
export const COPY_MASK_FLOOR_LINE = 1;
/**
 * The gentler VERTICAL term (task item 2 — "even outside the copy column the
 * mesh should read as background"). A broad bell centred on the band's middle,
 * where the ledger rows are densest: mask ×= mix(1, this, bell). 0.6 is a 40 %
 * reduction across the reading zone, relaxing to 1.0 at the band's top/bottom
 * edges — a falloff, NOT a global dim: it scales every element by the same
 * factor at a given y, so the star/line/dust ratios (18.8× / 593×) that the
 * owner just approved are preserved exactly, and the star core stays 6.4×
 * the bloom threshold at the band centre.
 */
export const COPY_Y_FLOOR = 0.6;
/** Bell bounds of the vertical term in |local y| (band-height fractions). The
 * cloud reaches PLEXUS_RY 0.42, so its vertical extremes keep 98 % while the
 * middle takes the full COPY_Y_FLOOR. Baked as shader literals (shape, not a
 * look knob) — an edit + reload, unlike the four uniforms above. */
export const COPY_Y_IN = 0.18;
export const COPY_Y_OUT = 0.46;
/**
 * ─── ROUND 12 · STAGE 2 FIX — THE DEEP FLOOR GETS A CEILING AND A SILL ──────
 *
 * THE DEFECT THIS CLOSES, MEASURED. The shipped copy mask is a **1-D wall in
 * x**: `copyGateAt` floors everything within `laneHalfPx + COPY_EDGE_PAD` of
 * the tracked block's centre column to `COPY_MASK_FLOOR` (1e-4) **at every
 * y**. On the shipped band that wall shadowed a cloud NARROWER than the frame
 * which could translate out from under it — `#production` measures
 * `meanL 21.27 / 15.73 %` of its band above L24 with the wall live. The D17
 * ribbon is WIDER than the frame and cannot move out from under it, and the
 * wall is `2 × (636.81 + 0.035 × 1920) = 1408 px` of a 1920 px frame: **73 %
 * of every frame, for the whole act, at 1/10000 brightness.** Measured at
 * `p = 0.45`, 1920×935: `meanL 3.95 / 1.45 %` — **10.8× below the approved
 * `#production` bar**, i.e. the black frame.
 *
 * The wall is 1408 px wide because it protects the block's CONTAINER width
 * (`copyW = 1274` for the ledger `h3`, against 762 px of rendered glyphs —
 * flagged in the build plan as its own owner decision, NOT fixed here). It is
 * 935 px TALL for no reason at all: the reading unit measures **154 px** and
 * never leaves `ih/2 ± 359 px` while its window is saturated. So the fix is
 * not to weaken the floor — the legibility chain that sized 1e-4 is intact —
 * it is to stop applying it 781 px away from any glyph.
 *
 * `COPY_ROW_PAD` is added above and below the reading unit's own box
 * (`opH`, the PAIRED box — the unit, never the half-statement), and
 * `COPY_ROW_SOFT` is the ramp out of it. Both in band-height fractions.
 * 0.05 = 47 px at 935: comfortably past the descenders and the block's own
 * leading, well inside the 154 px unit's own half-height + pad = 124 px.
 *
 * ⚠ THESE ARE INERT OFF THE RIBBON, BY CONSTRUCTION AND NOT BY TUNING. The
 * driver writes `uCopyRowLocal = 0` on every non-ribbon band, and the shader
 * multiplies the row gate by it before the `mix` — so `#production` and the
 * `ribbon: false` rollback evaluate `mix(uCopyFloor, 1, 0)`, which is
 * `uCopyFloor + (1 − uCopyFloor)·0` = `uCopyFloor` to the bit.
 */
export const COPY_ROW_PAD = 0.05;
export const COPY_ROW_SOFT = 0.06;
/**
 * ROUND 12 · STAGE 2 FIX — the vertical term's coordinate, corrected.
 *
 * Stage 2 moved `copyYAt` onto the ACROSS-ribbon `v` (`y − μ·x`) because the
 * mapped `y` spans ±4.34 band-heights under the shear and `|y|` is past
 * `COPY_Y_OUT` everywhere except a sliver. That reasoning is right about the
 * symptom and wrong about the cure: `v` is constant ALONG the 45° ribbon, so a
 * bell on `v` is a **45° diagonal stripe**, and the reading zone is a
 * HORIZONTAL screen band. The two coincide only at the frame's centre column;
 * 637 px away — the tracked block's own half-width — they are 637 px apart.
 *
 * The mapped `y` is in fact a pure affine function of SCREEN y
 * (`screen_y = C − y·rect.h`, `C = cy − yRegPx`), so the honest fix is to keep
 * `copyYAt` on `y` and hand the driver the one number that re-centres it on
 * the frame: `uCopyYc = (C − ih/2) / rect.h`. On frame that puts
 * `y − uCopyYc` in exactly ±0.5 — the frame, in band-height units — and
 * `copyYAt` becomes the "broad bell over the reading zone" its own docstring
 * has always promised. Off the ribbon the driver writes 0 and `y.sub(0)` is
 * bit-exact.
 *
 * This constant is the bell's CENTRE, as a fraction of the frame measured
 * DOWN from the top: 0.5 = `ih/2`, which is where `centreScreenY()` pins the
 * ribbon and where the traverse's reading band sits.
 */
export const COPY_ROW_SCREEN_C = 0.5;

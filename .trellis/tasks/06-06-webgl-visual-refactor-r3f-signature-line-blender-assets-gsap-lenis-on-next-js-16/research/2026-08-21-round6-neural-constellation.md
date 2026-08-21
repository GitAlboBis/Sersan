# Round 6-B — NEURAL CONSTELLATION (2026-08-21)

Owner verdict on the demoted stream: "stanno sotto la pietra… prima erano fatte tipo a
triangolo, non una linea dritta in orizzontale." The river reads as a flat horizontal LINE
under the crystal. This round re-authors the HOME layout into a **layered feed-forward
constellation** — the canonical NN diagram made cinematic — ON the existing foundation:
same compute sim, same stores, same uniform bag, same camera-locked band anchoring, crystals
untouched.

## 1. Graph layout (LOCAL band space: x = width fractions, y/z = height fractions)

**5 layers, 12 nodes, 21 edges per mode.** Layer x = `[−0.42, −0.18, +0.06, +0.30, +0.52]`,
node counts `[2, 3, 3, 2, 2]`. Topological depth t = layerIndex/4 → layers at
t = `[0, 0.25, 0.5, 0.75, 1.0]`. Adjacent layers are vertically OFFSET (y ∈ ±0.28,
z ∈ ±0.12) so edges triangulate — no horizontal centerline exists anywhere.

NODE tables (config `NODES`, per-node dx jitter is authored, not random — it steers around
the crystals). ANTI-CORRIDOR RULE (check round: healthy 4→7→8 and broken 2→5→8 originally
ran near-horizontal in the same direction — healthy 7 y −0.27→−0.24 and broken 5 y
+0.25→+0.28 tent them; no two consecutive edges may run <~9° in the same direction):

```
HEALTHY                                BROKEN
L0  0 (−0.44,+0.16,+0.04)              0 (−0.43,+0.20,−0.05)
    1 (−0.41,−0.20,−0.06)              1 (−0.42,−0.14,+0.08)
L1  2 (−0.20,+0.26,−0.10)              2 (−0.19,+0.27,+0.06)
    3 (−0.17,+0.01,+0.12)              3 (−0.18,+0.02,−0.10)
    4 (−0.19,−0.26,−0.04)              4 (−0.20,−0.24,+0.03)
L2  5 (+0.05,+0.24,+0.08)              5 (+0.03,+0.28,−0.08)
    6 (+0.07,−0.02,−0.12)              6 (+0.02,−0.04,+0.10)
    7 (+0.04,−0.24,+0.02)              7 (+0.04,−0.28,−0.03)
L3  8 (+0.30,−0.27,−0.08)              8 (+0.31,+0.22,−0.12)
    9 (+0.34,+0.27,+0.10)              9 (+0.30,−0.20,+0.09)
L4 10 (+0.52,+0.14,−0.05)             10 (+0.52,+0.10,+0.05)
   11 (+0.53,−0.15,+0.06)             11 (+0.53,−0.18,−0.08)
```

EDGE tables (config `EDGES`, `[from, to]` node indices, 2–3 outgoing per node subject to a
steepness taste cap; one long diagonal kept per mid-gap for drama):

```
HEALTHY: (0,2)(0,3)(0,4)(1,3)(1,4) | (2,5)(2,6)(3,5)(3,6)(3,7)(4,6)(4,7)
         | (5,8)(5,9)(6,8)(6,9)(7,8) | (8,10)(8,11)(9,10)(9,11)          = 21
BROKEN:  same except L2→L3 = (5,8)(5,9)(6,8)(6,9)(7,9)                   = 21
```

Min edge length ≈ 0.22 local (Δx between layers is 0.22–0.24). This is what the wrap-snap
threshold keys on (see §5).

## 2. Particle role budget (9000 full / 3200 lite)

| role | share | full | lite | what |
|---|---|---|---|---|
| 0 edge filaments | 80% (healthy) / 80%−32 (broken) | 7200 | 2560 | 2 thin braided strands per edge, ∝-edge-length distribution (~340/edge full) |
| 1 node halos | 20% | 1800 | 640 | crisp orbiting ring per node (150/node full), camera-facing (x·uPlaneAspect corrected), whiter than edges |
| 2 sparks (broken) | 32 baked | 32 | 32 | unchanged surge-death burst |

The brief's "~15% debris on broken" is achieved **by construction**, not by a fourth role:
edges crossing/past uFracture (9 of 21 edges ≈ 43% of edge length) carry the fray — their
post-fracture flight portion (~half their lifetime) ≈ 15–17% of all particles reading as
ember debris at any instant.

Per-particle baking (SAME buffers, zero new bindings): edge → `meta=[0, edgeIdx·2+strand,
speedVar, rnd]`, `off=[basePhase, jitterMag, jitterAngle]`; node → `meta=[1, nodeIdx,
spinVar, rnd]`, `off=[baseAngle, radialJitter, tubeAngle]`; spark unchanged. Node
positions/depths and edge endpoints live in four NEW uniformArrays (`uNodePos` 12·vec3,
`uNodeT` 12·float, `uEdgeA`/`uEdgeB` 21·float) — uniformArray `.element()` is legal in any
stage and costs no storage/vertex slot: buffer budget stays 4 storage / 5 vertex slots.

## 3. What remapped onto what

| old machinery | new meaning |
|---|---|
| uC0..uC4 spline ctrl | the 5 **layer centroids** (derived in config from NODES → `STREAM_CTRL` export kept). The spline is now an invisible registration SPINE — no particles ride it. |
| flow-t | **topological depth** t = mix(nodeT_A, nodeT_B, s) per edge particle; s = per-edge flow 0→1 (flowParam unchanged) |
| RING_T `[.414,.603,.793]` | `[0.25, 0.5, 0.75]` = the three MIDDLE layers (L1 eval → L2 trace → L3 guardrail). Surge-crossing flashes, uRingGlow hover flares and the tighten-per-ring width steps all transfer verbatim. |
| ring particles (torus at RING_T) | **node halos** at all 12 nodes; uRingFlash/uRingGlow index = nodeT·4−1 gated to the middle layers (L0/L4 stay neutral); shockwave = halo radius ripple; surge adds an emissive kiss as the pulse passes the node's t |
| membranes (streamCenter(RING_T)) | **zero shader change** — with centroid ctrl points they land exactly on the three middle-layer centroids (Catmull-Rom passes through ctrl points at segment boundaries). Disc radius RING_RADIUS 0.085 → 0.20 (a layer plane), noise scale 2.2 → 3.0, alpha 0.22 → 0.18. |
| FRACTURE_T 0.55 | **0.62** — between L2 (t .5) and L3 (t .75): "layers past the 4th layer are degraded". Broken pulse dies before the guardrail layer ever lights. |
| debris (teleport to fracPt) | **fray in place**: degraded edge particles stay on their edge line, far ENDPOINTS drift with a per-node coherent wander (nodeDrift), plus per-particle scatter (DEBRIS_SPREAD 0.55 → 0.13) and the existing ember ramp/alpha ceiling. The clean-break alpha gap now cuts each crossing filament. uRecohere re-connects frayed edges AND un-drifts nodes (both gated by 1−uRecohere·0.9). |
| nebula (streamCenter(uFracture)) | zero change — spline(0.62) ≈ local (+0.16, −0.00), i.e. AT the broken crystal (+0.17, −0.05): the smoke wraps the fractured stone. Intentional. |
| ROW_ZONE_T `[.2,.38,.55]` (broken) | `[0.125, 0.40, 0.62]` — input region / mid pre-fracture / the fracture zone (row 2 = FRACTURE_T keeps the nebula-thin wiring). |
| healthy row segment windows | gaussian at RING_T[i] (ROW_LAYER_K 90) — row i's glow attaches to layer i+1's nodes + adjacent edge halves. ROW_SEG_START/FEATHER retired. |
| EDGE_FADE (band entry/exit) | per-EDGE s-fades (0.12 in / 0.10 out) — filament tips dissolve into the node halos, which also hides the flow-wrap. The constellation never pops at band limits because nodes are authored inside ±0.53. |
| braid (4 strands, r .0215) | 2 strands per edge, r 0.012 / thickness 0.006 / 1.4 turns — living filaments ~24px thick, framed by a real perpendicular basis (cross(dir, z)) instead of the fixed y/z frame. uStrandPhase/uStrandThick keep 4 entries (dev-handle contract); only the first 2 are read. |

Kept verbatim: surge gaussian+comet (surgeAt), death flash (flashAt), spark burst, curl
turbulence, uScrollVel coupling (swell/stretch/flow/curl/debris), DOF, breathing/shimmer,
widthEnvelope, membrane seal/ripple/bulge grammar, nebula flare/thin, camera-locked
anchoring, EDGE compute contract, >1.0 bloom, no violet, store API, every driver state
machine (mapping constants only).

## 4. Crystal coexistence

Rule applied: every node CORE ≥ 0.10 rect-width in x OR ≥ 0.32 rect-height in y from the
crystal center (crystal core half-extents ≈ 0.09 w × 0.31 h; broken exploded reach ≈ 0.14 w).

- **healthy** (crystal +0.22, +0.06): node 8 authored at y −0.27 (dy 0.33 — passes below),
  node 9 pushed to x +0.34 (dx 0.12 — passes right). Guardrail membrane (centroid +0.32, 0.0)
  partially overlaps the stone's right edge — accepted: additive glass BEHIND the crystal
  reads as depth, not clutter.
- **broken** (crystal +0.17, −0.05): L2 nodes pulled left to x ≤ +0.04 (dx ≥ 0.13), L3 nodes
  at dx ≥ 0.13. Node 7 (+0.04, −0.28) clears on x only (dy 0.23) — inside the OR rule.
  The fracture/nebula intentionally sits AT the stone: the break in the network and the
  broken crystal are one event. Outermost shard excursions may graze L2/L3 halos at drift
  peaks — accepted (additive, behind the stone's renderOrder).

The constellation occupies the full band (y ±0.28, z ±0.12 → DEPTH_Z_RANGE 0.16) and the
crystal floats within it. No horizontal centerline survives.

## 5. Sim guards (why these constants moved)

- `WRAP_SNAP_DIST 0.6 → 0.17`: a wrap jump now equals ONE EDGE's length (min ≈ 0.22), not
  the whole band. Legit excursions must stay under it: reveal lag ≈ 0.15 ✓; pointer bend
  re-scoped `POINTER_PUSH 26 → 12`, `POINTER_RADIUS 0.22 → 0.14` (max bend ≈ 0.13 ✓); curl
  ≈ 0.005 ✓. Residual risk: a pointer-bent particle wrapping a short edge can miss the snap —
  the resulting spring-flight happens at s < 0.12 where the edge fade holds alpha ≈ 0.1;
  accepted.
- `FLOW_SPEED 0.055 → 0.09`: cycles are per-EDGE now (~11 s per traversal at rest).
- `SPARK/NEURAL_SPRING/DAMP/MAX_SPEED` unchanged.

## 6. Registration / callouts

The DOM ghost callouts are crystal-anchored since W3 (`--callout-N-*` CSS vars written by
CrystalCluster) — RING_T's change does NOT move them on WebGL tiers. The var() FALLBACK
positions (fallback tier / SSR / RM) vs the new fallback SVG:
- problem `[30%, 45%, 62%]` left ↔ features at L1 32%, mid-band ~48%, fracture ~65% — close.
- production `[40%, 62%, 84%]` left ↔ middle layers at 32% / 56% / 82% — each callout sits
  slightly right of its layer; acceptable drift, sections untouched (copy freeze).

## 7. SVG fallback twin

`neural-graph-fallback.tsx` redrawn as the SAME layered triangular graph, importing
NODES/EDGES/RING_T/FRACTURE_T from the config (single source of truth): gradient edge
strokes (underlay glow + core, filter-free), node discs with halo fills, three layer-ring
circles (healthy) that dash-draw in pipeline order on mount and pulse as the packet passes,
packet rail = polyline through the layer centroids; broken = edges past L2 fray dashed to
drifted ember nodes with the scatter burst at the fracture point (~x 646 viewBox). Hover
echo (data-strand-core width/opacity bump) and RM resting-state idioms kept verbatim.

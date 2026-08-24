/**
 * CRYSTAL CLUSTER — layout + look constants for the ROUND-5 W3 "3D stones"
 * island (CrystalCluster.tsx / crystalBuild.ts). Igloo-mined recipes per
 * research/2026-08-21-igloo-stones-dossier.md (TRANSPLANT PLAN, procedural
 * path); the Blender-GLB silhouette upgrade is a later round.
 *
 * ONE hero crystal per neural section, floating in the open right two-thirds
 * of the `[data-lattice-anchor]` band (the display type owns the left column):
 *   - "broken"  (Problem)        → a FRACTURED CLUSTER of shards, exploded at
 *     rest by igloo's exact recipe (pos += centr·(gap + rand.y·sin(rand.x·5 +
 *     t·0.5)·0.05) + per-shard rotate3D), gap breathing with the fracture
 *     surges; row hover → a brief RE-COHERE (gap→~0, the NeuralLattice
 *     recohereEnv grammar, driven from the SAME store.hovered).
 *   - "healthy" (ProductionGrade) → ONE intact displaced-icosahedron crystal,
 *     flat-shaded facets, slowly rotating upright at section center (igloo
 *     tumble: k·(centeredProgress − progress) per axis, k = (11,14,6)·sign);
 *     ring ignitions flash the cyan rim.
 *
 * COORDINATE FRAME: unlike the stream (anisotropic rect-scaled group), the
 * crystal group is UNIFORMLY scaled — scale = rect.h·k·CRYSTAL_SCALE — so the
 * mesh is never stretched by the band's aspect and normals stay honest under
 * modelViewMatrix. Position offsets below are FRACTIONS of the rect (x of
 * width, y of height, + = up), from the band center. All crystal-local
 * dimensions are in "crystal units" (unit icosahedron radius before the
 * squash / noise displacement).
 *
 * BINDING BUDGET: zero storage buffers. Vertex-buffer slots: broken uses 5
 * (position, normal, aCentr, aRand, aFacet), healthy 3 (position, normal,
 * aFacet) — well inside the 8-slot wall (gpgpuNodeSim.ts). ROUND 8-H keeps
 * both counts exactly (the authored GLB ships those same attributes and the
 * intact file's all-zero `_CENTR` / single-value `_RAND` are dropped on load).
 * aFacet is a random vec3 constant across a facet — per TRIANGLE on the
 * procedural fallback, per PLANAR PATCH on the authored asset, which is the
 * whole point: re-baking it per triangle would speckle each large plane and
 * undo the coherence the slab was authored for. Attributes are vertex-buffer
 * slots, NOT bindings. No compute: the same node material compiles on the
 * WebGL2 fallback backend of three/webgpu.
 *
 * ROUND 7-2b (§B-a, 2026-08-22-round7-stones-v2-anatomy.md): the HEALTHY
 * crystal on the FULL tier + true-WebGPU backend adds the SERSAN-mark
 * transmission RT — exactly +1 sampled texture +1 sampler = +2 FRAGMENT
 * bindings on that one build (base TextureNode tapped via `.sample().level()`
 * reference chaining, so the count stays 2 regardless of tap count — and since
 * ROUND 9-C there is exactly ONE tap). Storage wall (8) and vertex slots
 * (5/3 of 8) UNTOUCHED.
 * Broken / lite / WebGL2-fallback builds stay zero-texture (the ember core is
 * pure ALU). The plexus (§B-c) is 2 extra position-only draw calls on its own
 * geometries — no crystal slots, no bindings beyond its own material uniforms.
 *
 * ROUND 8-E — THE VALUE WORLD (research/2026-08-22-round8-stone-source-
 * anatomy.md). The owner: "le pietre non mi sembrano per niente come quelle
 * nel sito igloo." The measured verdict is arithmetic, not taste: igloo's
 * whole stone lives inside a 7.9:1 value window sitting ON a mid-value fog
 * (body = a 20 %-darkened copy of its surround, 1.22:1); ours spanned 54.6:1
 * on a near-black page (body 1.03:1 = invisible, sparkle 54:1 = blinding).
 * Two defects, only two: the absolute floor was 54× too low and the
 * highlight-to-body ratio 167× too wide. This round fixes both, plus the two
 * cheap refinements the same measurements exposed:
 *   1. A luminous NAVY FOG VOLUME behind each stone (crystalFog.ts) giving the
 *      silhouette something to be darker than, COUPLED to `BACKDROP_GAIN` on
 *      the crystal's procedural backdrop — the crystal never samples the
 *      framebuffer (its body comes from `backdrop()` and it composites at
 *      alpha 0.94), so a glow behind it would otherwise do nothing to the
 *      BODY. One driver value writes both, so the 0.79 body/surround ratio is
 *      CONSTRUCTED rather than coincidental (§B3's ⚠).
 *   2. Highlight compression + a value CEILING (igloo's `clamp(…,0,1)`
 *      mechanism at a level that keeps the site's >1.0 selective-bloom
 *      contract as a hairline whisper — see CRYSTAL_CEIL / RIM_EDGE_*).
 *   3. TEXTURE BAND SEPARATION (§A2): our ripple and frost sat 1.45× apart
 *      and mudded into one corrugation; igloo separates relief from roughness
 *      zoning by ~32×. Five constants, zero new code.
 *   4. An ANALYTIC AMBIENT HEMISPHERE (§D3) — we had no ambient term at all,
 *      which is why facets read binary lit/unlit and the body could go fully
 *      black. ~6 ALU, zero bindings, zero assets.
 * NOTHING from igloo's asset set enters this repo: what transferred is the
 * NUMBERS in that document (frequencies, luminance percentiles, ratios).
 *
 * ROUND 8-F — BAKE THE LIVE TUNING. Round 8-E's value world was DERIVED; this
 * round is the first time it was looked at. The owner ran a matte A/B at
 * `__sersanCrystal_problem.uniforms` and the matte variant won clearly, so four
 * constants become defaults: BODY_DARKEN 0.5 → 0.30, SPEC_GAIN 0.5 → 0.32,
 * CA_EDGE_BOOST 2.5 → 1.6, SPARKLE_GAIN 0.5 → 0.30. Re-derived value table
 * (lumLin; ratios WCAG-form, the doc's convention — 8-E → 8-F, igloo):
 *   body typical          0.0566 → **0.0396**   (igloo 0.291 @ 5× the level)
 *   body ÷ fog core       0.786  → **0.550**    (igloo 0.794)
 *   body vs fog contrast  1.14:1 → **1.36:1**   (igloo 1.22:1) ← the read
 *   brightest ÷ body      7.6×   → **7.0×**     (igloo caps at 3.4×)
 *   brightest vs fog      3.96:1 → **2.68:1**   (igloo 2.5:1)
 *   stone dynamic range   6.28:1 → **4.74:1**   (igloo 7.9:1) ← the cost
 * The 0.79 ratio is deliberately abandoned and BACKDROP_GAIN is NOT used to
 * compensate — the full argument (and the one-number path back) lives at
 * BACKDROP_GAIN. Short version: at one fifth igloo's absolute fog level the
 * RATIO no longer reproduces the PERCEPTION, and 0.30 lands us on the dense
 * side of igloo's separation instead of 35% short of it.
 * MARK_GAIN is deliberately NOT raised — the mark's illegibility is a GEOMETRY
 * problem (see the ═══ block there), not a level problem. [SUPERSEDED BY 8-H
 * BELOW: the geometry problem is now fixed, and the gain moved with it.]
 *
 * ROUND 8-H — THE AUTHORED SLAB LANDS (research/2026-08-22-round8-blender-
 * slab-log.md). The owner, sharpened: "è completamente diversa da quella di
 * ghiaccio del sito igloo." The measured cause was the mesh, not the material:
 * `IcosahedronGeometry(1,12) + smooth radial noise` has **no coplanar patches
 * at all**, so every one of its 3 380 triangles refracts its own patch of the
 * inner world and the in-ice mark shatters into per-facet confetti. [⚠ ROUND
 * 9-C AMENDS THE MARK HALF OF THAT SENTENCE: the confetti was the mark's
 * SAMPLING MAP, and patch size only compensated for it — see the ROUND 9-C
 * block below and MARK_GAIN. The material half stands.] The
 * Blender-authored replacement (`public/models/crystal-intact.glb` 450 tris /
 * `crystal-fractured.glb` 1 114 tris, loaded by crystalBuild's module-cached
 * non-suspending loader) hits all four igloo silhouette gates AND carries 34
 * planar patches with six covering half the surface. Consequences here — all
 * derived, all live-tunable, none of them redesigns:
 *   1. The per-facet constants were micro-facet devices and now act on whole
 *      planes: FACET_JITTER 0.35 → 0.12, FACET_SPEC_JIT 0.8 → 0.45,
 *      FACET_VALUE_JIT 0.3 → 0.18, SPEC_GAIN 0.32 → 0.26. Net effect on the
 *      8-F value table: the brightest ordinary pixel stays at 0.276 lumLin —
 *      now including the per-patch jitter, which the old ceiling silently
 *      pushed to 0.388. Body typical unchanged at 0.0396.
 *   2. MARK_GAIN is UNBLOCKED and doubles to 0.70 (2.01:1 → 3.03:1 WCAG-form
 *      against the body, capped by the ordering rule — this line used to say
 *      "~0.88", the 8-H first pass's bound-with-a-margin; the solved ties are
 *      0.91 typical-body and **0.82** on the brightest frost vein, and 0.82 is
 *      the operational ceiling. See MARK_GAIN check 1). The ═══ block
 *      below is replaced accordingly.
 *   3. HEALTHY_CALLOUT_ANCHORS re-fitted to the new surface (one of the three
 *      was floating 27 % OUTSIDE it) and BROKEN_CALLOUT_SHARDS re-picked for
 *      screen separation on the new fracture, keeping the large/mid/chip
 *      classes. Both measured off the shipped GLBs, not eyeballed.
 *   4. Geometry constants (CRYSTAL_DETAIL*, SHARD_*, CRYSTAL_SQUASH,
 *      CRYSTAL_NOISE_*) are now FALLBACK-ONLY — nothing but an asset failure
 *      builds the procedural mesh. Both tiers load the authored asset: at 450
 *      / 1 114 tris it is cheaper than the procedural LITE build.
 * Provenance unchanged: nothing from igloo entered this repo — the GLBs are
 * authored from primitives, plane cuts and booleans; only NUMBERS transferred.
 *
 * ROUND 8-I — THE SECOND LIVE PASS (2026-08-24, owner's Chrome on the shipped
 * authored slab: `authored:true, tris:450`). Three findings, two fixed here:
 *
 *  1. THE STONE WAS MOIRÉING — a checkerboard/corduroy across every plane.
 *     Proven live NOT to be the in-ice mark (it survives `uMarkGain = 0`): it is
 *     the round-8-E/F ripple carrier ALIASING, i.e. exactly the size dependency
 *     the round-8-E check flagged and then mis-sized. The retune assumed a
 *     1 470 px band (250 px per crystal unit); the LIVE band is **~725 px**, so
 *     the stone spans **123 px/unit** and RIPPLE_FREQ 26 was running at **4.7
 *     px/cycle** — train 2 at **4.1**, which is the check's own "~4.2" warning
 *     arriving. Below ~8 px/cycle an analytic sine has nothing to filter it
 *     (a mip-mapped normal map filters itself; ours cannot), and on the
 *     round-8-H slab's LARGE FLAT planes two crossed trains at a constant
 *     normal are a perfectly regular screen-space lattice: literally a
 *     checkerboard. That is why this appeared only after the authored geometry
 *     landed — on the procedural potato, curvature swept the screen frequency
 *     continuously and the same aliasing read as noise. Fixed at the FREQUENCY,
 *     not hidden in the amplitude: RIPPLE_FREQ 26 → **12** (10.3 / 8.9
 *     px/cycle for the two trains) with RIPPLE_AMP re-derived 0.018 → **0.0385**
 *     so the DELIVERED surface tilt stays igloo's 25°.
 *  2. Two more live-verified cuts, both the same story — the authored slab's big
 *     coherent planes want less noise ON them: FROST_AMP 1.0 → **0.35** (the
 *     veins were fighting the planes the slab exists to provide) and CRYSTAL_CA
 *     0.16 → **0.10** (dispersion spread on a flat plane reads as colour
 *     speckle, not as glass — and 0.10 is igloo's measured value, the return
 *     §D4 predicted).
 *  3. The in-ice MARK still does not read as the SERSAN mark even on coherent
 *     planes. That is now an OWNER decision, not a tuning one — MARK_GAIN stays
 *     at 0.70 and the honest options are written out there.
 *
 * RE-DERIVED VALUE TABLE (8-H → 8-I; lumLin, ratios WCAG-form as in the doc):
 *   body typical          0.0396 → 0.0396   UNCHANGED (frost's mean factor is
 *                                           1.0 at any amplitude)
 *   body ÷ fog core       0.550  → 0.550    UNCHANGED
 *   body vs fog contrast  1.36:1 → 1.36:1   UNCHANGED (igloo 1.22:1)
 *   brightest ordinary px 0.276  → 0.276    UNCHANGED
 *   brightest ÷ body      7.0×   → 7.0×     UNCHANGED (igloo caps at 3.4×)
 *   brightest vs fog      2.68:1 → 2.68:1   UNCHANGED (igloo 2.5:1)
 *   darkest body          0.0199 → **0.0230**  the frost's dark vein shallows
 *   stone dynamic range   4.66:1 → **4.47:1**  ← the ONLY row that moves, and
 *                                           the price of the frost cut
 *                                           (igloo 7.9:1)
 * The ripple pair and the CA cannot move the table by construction: the first
 * re-distributes normals at CONSTANT tilt (only their screen frequency changed),
 * the second re-distributes channels without scaling luminance. That is the
 * whole point of re-deriving the amplitude instead of just lowering it — a round
 * that changes the stone's entire texture read leaves the value world of rounds
 * 8-E/F/H standing.
 * BONUS, measured while re-deriving: the frost cut also closes a latent ordering
 * violation the 8-H mark level had on the brightest frost vein — see MARK_GAIN.
 *
 * ROUND 9-C — THE IN-ICE MARK: IT WAS THE SAMPLING MAP, NOT THE SUBJECT
 * (research/2026-08-22-round9-inner-object-mechanism.md; owner, verbatim: "no,
 * voglio che si veda il logo, devi capire come è fatto quello di igloo").
 * 8-I closed with "the mark is a FORM problem — 34 planes = 34 independent
 * refracted images, a hairline logo cannot survive being cut into 34 pieces".
 * **That conclusion is now RETRACTED.** The bundle forensics settle it: igloo
 * refracts the view ray, walks `thickness`, and PROJECTS the exit point through
 * proj·view, /w, *0.5+0.5 — it samples its transmission RT in SCREEN SPACE. The
 * projection cancels the along-ray component EXACTLY (project(p + λ·Î) ≡
 * project(p)), so only `T·sin δ` survives and the base map is the projective
 * IDENTITY: the penguin lands where the penguin is. 34 facets then give 34
 * slightly-SHIFTED copies of the same correctly-placed image, never 34
 * independent ones — coherence there is structural, not a property of the
 * subject's mass. Our map was `uv = vLocal.xy·0.22 + refrDirView.xy·0.495 +
 * 0.5`: an ORTHOGRAPHIC projection along the crystal's LOCAL Z (on a mesh that
 * tumbles to 90° off the view axis, where that map FOLDS) plus an
 * un-cancelled view-space direction, in mixed bases — ±117 px facet jumps on a
 * ~500 px mark. That is the confetti, and it was ours alone.
 * The fix (Variant A, implemented at MARK_THICKNESS / MARK_WORLD_HALF /
 * MARK_FLIP_Y): project BOTH the refracted exit point AND the crystal origin,
 * take the difference, normalise by the mark's projected half-extent — which is
 * exactly "intersect each fragment's view ray with a screen-facing billboard of
 * half-extent uMarkHalf pinned at the crystal's centre". Model scale, fov,
 * aspect, viewport and DPR all cancel; the depth RATIO does not (that is the
 * perspective, and the off-axis parallax it gives the mark is wanted), and the
 * refraction survives as ONE dimensionless displacement,
 * `Δ(markUv) = uMarkThick·sin δ / (2·uMarkHalf)` ≤ 0.152 uv. **The value world
 * is untouched** — the compositing site (additive into `trans`, PRE
 * `uBodyDarken`) and MARK_GAIN 0.70 are both unchanged, so every row of the
 * table above still stands. The one number that MOVES is the sampling-loss
 * floor (MARK_GAIN check 3): the 3-tap ladder spread is gone, so any stroke
 * wider than the lod-1.17 mip footprint now reaches full coverage and the
 * realistic contrast rises 2.42:1 → the full 3.03:1.
 * ⚠ CHECK-ROUND: the round-9 doc's §3.6 y-flip reasoning did NOT survive
 * re-derivation from the three source — the flag ships at **−1**, not +1. See
 * MARK_FLIP_Y; +1 would have shipped the logo upside-down.
 */
import type { LatticeMode } from "./neuralLatticeConfig";

// --- Placement (fractions of the anchor rect, from center; + y = up) --------
/** Per-mode crystal center in the band. Broken sits between the fracture
 * (x 55%) and the debris field; healthy floats over the rising weave between
 * ring 2 and ring 3 (rings at 40/62/84%). Both clear the left type column. */
export const CRYSTAL_POS: Record<LatticeMode, [number, number]> = {
  broken: [0.17, -0.05],
  healthy: [0.22, 0.06],
};
/** Uniform group scale = rect.h·k·this — crystal radius ≈ 17% of band height
 * (the squashed silhouette spans ~½ band height; the exploded broken cluster
 * reads wider). Live-tunable via the dev handle. */
export const CRYSTAL_SCALE = 0.17;

// --- Geometry ---------------------------------------------------------------
// ⚠ ROUND 8-H — EVERYTHING IN THIS BLOCK IS FALLBACK-ONLY. The shipped mesh is
// the Blender-authored slab (`/models/crystal-intact.glb` +
// `/models/crystal-fractured.glb`, paths in crystalBuild's CRYSTAL_GLB); these
// constants only build a mesh when that asset fails to load. In particular
// CRYSTAL_DETAIL_LITE / SHARD_DETAIL_LITE / SHARD_COUNT_LITE are dead on the
// primary path — BOTH tiers load the same authored files, which at 450 / 1 114
// triangles are cheaper than the procedural LITE build (1 620 / 1 920) and far
// cheaper than the full one (3 380 / 4 000). CRYSTAL_SQUASH is NOT re-applied
// to the authored geometry: its .84/1/.65 proportions (igloo cube1's) are
// baked, and a post-hoc anisotropic scale would shear every facet normal.
// SHARD_SIZES still documents the fracture's volume family — the authored
// partition's piece volumes were solved to match SHARD_SIZES³.
/** Icosahedron subdivision detail — tris = 20·(detail+1)². Facets sell
 * crystal: flat normals from the non-indexed PolyhedronGeometry. */
export const CRYSTAL_DETAIL = 12; // healthy intact crystal (~3.4k tris)
export const CRYSTAL_DETAIL_LITE = 8;
export const SHARD_DETAIL = 4; // per shard (~500 tris each)
export const SHARD_DETAIL_LITE = 3;
/** Fractured-cluster shard count (dossier: 6–10). */
export const SHARD_COUNT = 8;
export const SHARD_COUNT_LITE = 6;
/** 2-octave fractal displacement: n = noise(p·FREQ) + AMP2·noise(p·FREQ·2.1)
 * (lite drops the second octave), radius ×(1 + AMP·n). Round 7 (igloo realism
 * pass, §5 silhouette): low octave AMPLIFIED 0.25→0.34 and micro octave
 * FLATTENED 0.5→0.22 — the washed "bland pebble" read came from micro-noise
 * eating the big angular moves. */
export const CRYSTAL_NOISE_FREQ = 1.6;
export const CRYSTAL_NOISE_AMP = 0.34;
export const CRYSTAL_NOISE_AMP2 = 0.22;
/** Round 7 — TERRACED low octave: the low-frequency noise is quantized into
 * QUANT ledges per noise unit and blended in by MIX, so the silhouette gets
 * chiseled voronoi-ish plateaus (hard value ledges between vertex rings)
 * instead of a smooth potato. Deterministic f(position) → coincident soup
 * vertices still displace identically (no cracks). */
export const CRYSTAL_FACET_QUANT = 2.5;
export const CRYSTAL_FACET_MIX = 0.65;
/** Shard-silhouette squash of the intact crystal (dossier: (1, 1.45, 0.85)). */
export const CRYSTAL_SQUASH: [number, number, number] = [1, 1.45, 0.85];
/** Per-shard icosahedron radius (crystal units) before displacement. */
export const SHARD_RADIUS = 0.62;
/** Round 7 — per-shard SIZE VARIANCE (§5): radius multiplier per shard index
 * so the broken cluster reads as a real fractured meteorite family — 2 large
 * bodies + mids + small chips — instead of 8 equal pebbles. The lite build
 * (SHARD_COUNT_LITE=6) keeps the first 6 → still 2 large + mid + chips.
 * BROKEN_CALLOUT_SHARDS [1,3,5] land on large/mid/chip — all visible sizes.
 * NOTE the centroid RADIUS is no longer size-independent (CHIP_SCATTER
 * stretches chip centroids below), but the callout-anchor twin stays exact by
 * construction: the driver reads build.shardCentrs, pushed from the SAME
 * `centr` that translates the shard verts and fills aCentr — one source. */
export const SHARD_SIZES: readonly number[] = [
  1.45, 1.22, 0.95, 0.78, 0.6, 0.5, 0.42, 0.36,
];
/** Round 7 — chips fling further than bodies: spread ×(1 + (1−size)·this)
 * for sizes < 1 (large shards keep the mined spread). */
export const CHIP_SCATTER = 0.35;
/** Shard centroid distance from the cluster center: MIN + rnd·(MAX−MIN),
 * golden-spiral directions, then squashed by CRYSTAL_SQUASH so the cluster
 * keeps the intact crystal's tall silhouette. */
export const SHARD_SPREAD_MIN = 0.28;
export const SHARD_SPREAD_MAX = 0.58;

// --- Fracture (broken) ------------------------------------------------------
/** Rest gap — the cluster sits EXPLODED (igloo `gap`; explode offset =
 * centr·gap). Breathes outward with the fracture surges, collapses to ~0 on
 * the row-hover re-cohere. ⚠ FALLBACK-ONLY since round 8-H: this value is
 * levelled against the PROCEDURAL shard centroids (|centr| 0.42–0.85). The
 * authored partition's centroids are ~1.9× longer, so it uses its own constant
 * below — crystalBuild picks per build and publishes it as `build.restGap`. */
export const FRACTURE_REST_GAP = 1.0;
/**
 * ROUND 8-H (CHECK) — the same rest gap, re-levelled for the AUTHORED
 * partition. The explode offset is `centr·gap`, so it is only meaningful
 * relative to how long `centr` is, and the swap moved that a lot:
 *   procedural shard centroids  |centr| 0.416 … 0.835  (mean 0.60)
 *   authored piece centroids    |centr| 0.698 … 1.576  (mean 1.16)  = ~1.9×
 * Left at 1.0 the fractured cluster's exploded silhouette measures (bbox of
 * `position + centr·gap` over the shipped file) **4.07 × 4.93 × 3.55** against
 * the round-7 procedural cluster's 2.65 × 4.21 × 2.24 — 54 % wider and
 * reaching y = −3.04, i.e. 465 px below the crystal centre at the doc's
 * reference band (900 px, 153 px/unit), where the centre already sits 5 % low
 * (CRYSTAL_POS.broken.y). The bottom chips would render OUTSIDE the
 * `[data-lattice-anchor]` band, and the third callout — piece 5, projected to
 * a 90.5 % edge offset — would PIN against CALLOUT_EDGE_MAX (88) and stop
 * tracking its shard, breaking the leader-line contract the round re-fitted
 * BROKEN_CALLOUT_SHARDS for.
 * **0.55** is the value that restores the round-7 exploded envelope: y-extent
 * 4.201 vs the procedural 4.211 (x 3.49 / z 2.92, honestly wider because the
 * authored intact slab itself is 15 % wider in x and 6 % in z — that part is
 * the new silhouette, not the explode). At 0.55 the three callout anchors
 * project to 56.3 / 25.3 / 81.3 % — all inside the clamps — with 131 / 244 /
 * 375 px separation, still far past the ~71 px collision that got [1,3,5]
 * rejected. Nearest-neighbour piece separation is 0.55·|Δcentr| ≈ 0.78 units
 * between the two large bodies, ~28 % of the slab width: reads fractured, not
 * flung. Surge peak (×1.5 → 0.825) reaches y-extent 4.65, a transient.
 * ⚠ This is an ARITHMETIC fit to the round-7 envelope, not a live A/B — if the
 * browser pass wants a wider blast, raise it here (uGap is on the dev handle);
 * past ~0.75 the third callout starts pinning again.
 */
export const FRACTURE_REST_GAP_AUTHORED = 0.55;
/** Gap boost per unit (eased) store pulse — the fracture-surge breathing. */
export const FRACTURE_SURGE_GAIN = 0.5;
/** Igloo idle sine drift amplitude (verbatim 0.05):
 * += centr·rand.y·sin(rand.x·5 + t·0.5)·this. */
export const CRYSTAL_IDLE_DRIFT = 0.05;
/** Slow continuous per-shard tumble rate (rad/s, ×(rand−.5)·2 per shard) —
 * the vertex-path rotate3D; the group wobble rides on top. */
export const SHARD_SPIN = 0.15;

// --- Material — TSL fake transmission (igloo WL numbers, dossier §2) --------
export const CRYSTAL_IOR = 1.18;
/** Round 7 — dispersion visibility up (igloo's fringes are clearly visible):
 * base uCA 0.1→0.16; igloo's 0.1 rode a real screen RT, our low-frequency
 * procedural backdrop needs more per-channel eta spread to show fringes.
 *
 * ROUND 8-I (LIVE-VERIFIED on the authored slab): 0.16 → **0.10** — back to
 * igloo's measured value, for the reason §D4 predicted ("ours higher by design,
 * compensating a low-contrast procedural backdrop — re-check after
 * BACKDROP_GAIN"). The round-7 boost was compensation for a mesh with NO
 * coplanar patches, where every micro-facet tapped its own patch of the backdrop
 * and needed extra eta spread to show a fringe at all. On the round-8-H slab a
 * single plane refracts ONE coherent image, and 0.16 stopped reading as
 * dispersion and started reading as colour SPECKLE across the plane. Delivered:
 * grazing effective CA = 0.10 × (1 + 1·CA_EDGE_BOOST 1.6) = **0.26** (was
 * 0.416), face-on **0.10** (was 0.16). Chroma only — it re-distributes the
 * body's channels without scaling luminance, so like CA_EDGE_BOOST it appears
 * NOWHERE in the value table. */
export const CRYSTAL_CA = 0.1; // uChromaticAberration
/** Round 7 — fresnel-weighted CA boost: effective CA = uCA·(1 + fres·this),
 * so the fringes concentrate on the SILHOUETTE (igloo's read) while the body
 * stays coherent. Dev-tunable (uCAEdge).
 *
 * ROUND 8-F (LIVE-MEASURED — the matte A/B): 2.5 → **1.6**. At grazing the
 * effective CA goes 0.16 × 3.5 = 0.56 → 0.16 × 2.6 = **0.416** (−26%);
 * face-on is unchanged at 0.16 by construction. This is a CHROMA constant, not
 * a value one — it re-distributes the body's channels, it does not scale
 * luminance, so it appears nowhere in the value table. It is also the direction
 * the source doc predicted: §D4 flagged our 0.16 (+2.5 edge) against igloo's
 * measured 0.10 as "ours higher by design, compensating a low-contrast
 * procedural backdrop — re-check after BACKDROP_GAIN". With the field now 8×
 * up, the over-spread reads as rainbow fringing rather than dispersion. */
export const CA_EDGE_BOOST = 1.6;
export const CRYSTAL_THICKNESS = 2.0; // refraction-offset scale
/** ROUND 8-E §D2 — roughness LEVEL. igloo's effective roughness is
 * `0.65 × G` on its roughness map = 0.19 / 0.36 / 0.44 at p10/p50/p90 (the
 * widely-repeated "roughness .65" is the multiplier, NOT the value); ours ran
 * 0.6 modulated ×(1 ± 0.45) → 0.33–0.87, ~1.7× rougher at the median and
 * nearly double their max. 0.6 → 0.36; with FROST_ROUGH_K 0.5 the frost
 * veining now yields ≈ 0.27 / 0.36 / 0.45 — igloo's distribution. */
export const CRYSTAL_ROUGH = 0.36;
/** Dispersion samples: 3 full / 1 lite (igloo AWESOME_SAMPLES=3). */
export const CRYSTAL_SAMPLES = 3;
export const CRYSTAL_SAMPLES_LITE = 1;
/** How far the refracted direction's view-xy shifts the backdrop coordinate
 * per unit thickness (the "screen sample offset" of the mined loop, re-scoped
 * to the procedural backdrop's coordinate space). Round 7: 0.35→0.45 — more
 * visible bend so tumbling actually swims the internal world. */
export const REFR_OFFSET_SCALE = 0.45;
/** Backdrop coordinate scale over the crystal-local xy. */
export const BACKDROP_COORD_SCALE = 0.4;
/** Procedural refraction backdrop — the structural substitution for igloo's
 * transmission RT: navy diagonal gradient, noise-modulated like the mined
 * `diagonalGradient`, with two soft cyan bloom spots. NO RT, NO textures.
 * Round 7 — CONTRAST UP so refraction has something to bend: deeper navy
 * floor (#0B1422→#060D18), brighter ceiling (#16233A→#1C2E4E). */
export const BACKDROP_NAVY = "#060D18";
export const BACKDROP_NAVY2 = "#1C2E4E";
export const BACKDROP_CYAN = "#3BE1FF";
/** Two bloom spots: [x, y, gaussian sharpness] in backdrop-coordinate units
 * + the shared additive gain (sub-1.0 — the spots glow, never bloom).
 * Round 7: sharper (2.2/3.0→4.0/5.5) + brighter (0.45→0.75, peak channel
 * still 0.75 < 1.0) — crisp internal highlights the dispersion can split.
 * ROUND 8-E: 0.75 → 0.5. The spots are added AFTER `uBackdropGain` (they are
 * authored ABSOLUTE internal highlights, not part of the navy field — gaining
 * them ×8 would put a spot centre at lumLin ≈ 3.8, a hard bloom star, exactly
 * the failure this round removes). At 0.5 a spot centre lands at 0.31 lumLin
 * pre-darken → ROUND 8-F, × BODY_DARKEN 0.30: **0.093 post-darken ≈ 2.3× the
 * body** (8-E: 0.155 ≈ 2.7×). The spots ride the same multiply as the body, so
 * the matte cut preserves their relationship almost exactly — they stay bright
 * internal highlights inside the compressed window, no re-levelling owed. */
export const BACKDROP_SPOTS: readonly [number, number, number][] = [
  [0.55, 0.35, 4.0],
  [-0.6, -0.5, 5.5],
];
export const BACKDROP_SPOT_GAIN = 0.5;

// --- Round 7 — 2-lobe procedural environment (realism pass §1) --------------
/** Key lobe direction (view-space fixed) — the soft white-cyan "sun".
 * ROUND 8-E §D3: RE-AIMED to the measured sun of igloo's environment map —
 * its single ~3411× pixel sits at equirect y 87/256 ⇒ **≈ 29° above the
 * horizon** (the azimuth depends on three's equirect convention + their
 * `envMapRotation.y = π`, so only the elevation is treated as solid). Old
 * [0.42, 0.62, 0.66] was 38.4° up; the azimuth is preserved and the xz
 * magnitude renormalised to cos 29° = 0.875. */
export const FACET_KEY_DIR: [number, number, number] = [0.47, 0.485, 0.74];
/** Fill lobe direction (view-space fixed) — cool navy from low-left-front. */
export const FACET_FILL_DIR: [number, number, number] = [-0.45, -0.4, 0.55];
/** Lobe colors — white-cyan key / navy fill (NO violet, round-7 contract). */
export const FACET_KEY_COLOR = "#D8F4FF";
export const FACET_FILL_COLOR = "#14283F";
/** Key lobe: specular-ish pow(max(dot(N,H),0), SPEC_POW) with a LOWISH
 * exponent (real spread — whole facets flash, not pinpricks) × SPEC_GAIN.
 * Dev-tunable (uSpecPow / uSpecGain). */
export const SPEC_POW = 14.0;
/** ROUND 8-E §B4.2 part 3 — HIGHLIGHT COMPRESSION. 1.15 → 0.5, keyC (#D8F4FF)
 * having Rec709 linear luminance 0.865.
 *
 * ═══ ROUND 8-H (THE AUTHORED SLAB) — 0.32 → **0.26**. The peak did not move;
 * the AREA did. ═══
 * On the procedural icosahedron a lit facet was one of ~3 380 micro-triangles
 * and the eye integrated a mottled highlight; on the authored slab ONE patch
 * can be 19 % of the surface and lights as a single value. Two coupled cuts
 * hold the round-8-F window while that area grows:
 *   SPEC_GAIN      0.32 → 0.26
 *   FACET_SPEC_JIT 0.8  → 0.45  (per-patch amp span ±22.5 %, was ±40 %)
 * Peak lit plane = 0.865 × 0.26 × 1.225 = **0.276 lumLin** — i.e. exactly the
 * 8-F "brightest ordinary pixel" of 0.277, except that 8-F computed it at
 * amp = 1 and the old ±40 % ceiling actually reached 0.865 × 0.32 × 1.4 =
 * 0.388. So this is a strict FIDELITY gain, not a new level: the documented
 * number is now the true maximum. The whole 8-F table therefore still holds —
 * brightest ÷ body 7.0×, brightest vs fog 2.68:1, dynamic range 4.66:1 (4.74
 * before, the hair of difference being FACET_VALUE_JIT lifting the darkest
 * body 0.0190 → 0.0199).
 * (ROUND 8-I: this constant and the peak it sets are UNCHANGED; only the
 * darkest body moved again — 0.0199 → 0.0230 as FROST_AMP dropped to 0.35 —
 * so the dynamic range reads **4.47:1**. Full table in the file header.)
 * ⚠ The ±40 % spec jitter was itself a micro-facet device: between two LARGE
 * planes at the same angle to the key light it reads as a shading error, not
 * as mineral variation. That is why the jitter had to come down with the gain
 * rather than the gain alone. ═══
 *
 * ROUND 8-F (LIVE-MEASURED — the matte A/B): 0.5 → 0.32. Peak 0.865 × 0.32
 * = 0.277 lumLin. Against the body (0.0396) and the unchanged fog core
 * (0.072), all WCAG-form ((L+0.05) quotients) as in the doc:
 *   brightest ÷ body      7.0×      (8-E 7.6×; igloo hard-caps at 3.4×)
 *   stone dynamic range   4.74:1    (8-E 6.28:1; igloo 7.9:1)
 *   brightest vs surround 2.68:1    (8-E 3.96:1; igloo 2.5:1, band 2.5–4.2:1)
 * The middle row is the cost of this round: cutting the ceiling while the floor
 * also drops NARROWS the stone's own window away from igloo's 7.9:1. The other
 * two rows improve — brightest-vs-surround lands almost exactly on igloo's 2.5,
 * which is the ratio that governs whether the stone reads matte or lit.
 * ⚠ COUPLING: RIM_BASE was NOT cut this round, so the broad rim now peaks at
 * 0.277 too — the key lobe and the rim are TIED as the brightest ordinary
 * pixel, where 8-E had the lobe clearly ahead (0.433 vs 0.277). If the stone
 * starts reading as an outline again, cut RIM_BASE before raising this.
 * (8-H note on that coupling: at SPEC_GAIN 0.26 the RIM would out-read the key
 * lobe — 0.277 vs 0.225 at amp = 1 — were it not for the per-patch jitter,
 * which takes the brightest plane to 0.276 and keeps them tied. The rim is
 * still the first thing to cut if the outline read returns.) */
export const SPEC_GAIN = 0.26;
/** Fill lobe gain on max(dot(N, FILL), 0) — dev-tunable (uFillGain).
 * ROUND 8-E: 0.5 → 0.25. The analytic ambient hemisphere (§D3, AMBIENT_*)
 * now owns the cool floor this lobe was standing in for; keeping both at full
 * strength double-counts it and lifts the body off its 0.79× fog ratio. */
export const FILL_GAIN = 0.25;
/**
 * Per-FACET normal tilt (view-space, from the baked aFacet random) fed to the
 * key lobe only — facets catch the sun independently, the #1 flatness killer.
 * Dev-tunable (uFacetJit).
 *
 * ROUND 8-H — 0.35 → **0.12**. This constant existed to FAKE normal variety on
 * a mesh that had none: the procedural icosahedron's neighbours are near
 * co-oriented (measured dihedral p99 **70°** against igloo's 97–124°, with
 * every one of its 3 380 triangles its own facet), so a large stochastic tilt
 * was the only source of facet-to-facet value separation. The authored slab
 * supplies the real thing (34 planar patches; measured dihedral p50 0.7°
 * WITHIN patches, p90 66.8° and p99 123.5° BETWEEN them), and the tilt now
 * acts on whole planes rather than on invisible micro-triangles.
 * Geometry of the knob: the offset is a vec3 of independent uniforms in
 * ±J/2, so RMS|offset| = J/2 and max|offset| = √3·J/2 ⇒
 *   J 0.35 → RMS tilt 9.9°, max 16.9°   (a visible mis-orientation on a plane)
 *   J 0.12 → RMS tilt  3.4°, max  5.9°  (a break-up, not a wrong normal)
 * Conservative on purpose: 0 would make every patch a perfect mirror of its
 * geometric normal (and re-flatten coplanar neighbours into one value), while
 * anything past ~0.2 starts to read as "this plane is facing the wrong way",
 * which is exactly the credibility the authored silhouette was bought for. */
export const FACET_JITTER = 0.12;
/** Per-facet key-lobe brightness jitter span: amp = 1−span/2 + span·rand —
 * the mineral sparkle igloo's roughness map provides.
 * ROUND 8-H: 0.8 → **0.45** (amp span 0.6–1.4 → 0.775–1.225). Coupled to the
 * SPEC_GAIN cut — see the derivation there. ±40 % between two LARGE planes at
 * the same angle to the key light reads as a shading error; ±22.5 % reads as
 * micro-roughness variation, which is what it is meant to be. */
export const FACET_SPEC_JIT = 0.45;
/** Per-facet BODY value jitter: body ×(1 − this/2 + this·rand) — value
 * separation survives even where the key lobe misses.
 * ROUND 8-H: 0.3 → **0.18** (×0.85–1.15 → ×0.91–1.09). Two reasons, the second
 * load-bearing: (a) per-patch steps of ±15 % across planes covering up to 19 %
 * of the stone read as patchy paint, not as mineral; (b) the in-ice MARK is
 * added PRE `uBodyDarken`, so it rides this exact multiply — at ±15 % the
 * wordmark's own brightness would step from plane to plane, re-introducing
 * incoherence in the image this round exists to make legible. The MEAN factor
 * is 1.0 either way, so the body's typical value is untouched (0.0396); only
 * the darkest body moves, 0.0190 → 0.0199. */
export const FACET_VALUE_JIT = 0.18;
/**
 * Round 7 — dark glass body (§2): transmitted color × this. The stone reads
 * DARKER than the backdrop mid-tone (the "meteorite" read); brightness comes
 * from lobes/rim/glints instead. Dev-tunable (uBodyDarken).
 *
 * ROUND 8-F (LIVE-MEASURED at `__sersanCrystal_problem.uniforms`, not derived):
 * 0.5 → 0.30. The round-8-E stone still read GLASSY-BRIGHT; a matte A/B at the
 * console read markedly closer to igloo, and this is the constant that carries
 * it. Transmission body 0.0848 × 0.30 = **0.0254 lumLin**, + the ambient floor
 * 0.0142 ⇒ **body 0.0396** against the unchanged 0.072 fog core.
 *
 * That is body/fog **0.55**, not igloo's 0.79 — a deliberate, argued deviation,
 * NOT compensated with BACKDROP_GAIN. See BACKDROP_GAIN for the full reasoning;
 * the one-line version: the 0.79 RATIO is not the perception. At igloo's
 * absolute fog (0.366) a 0.79 ratio yields 1.22:1 of WCAG-form body-vs-surround
 * separation; at OUR fog (0.072, one fifth the level) the same ratio yields only
 * 1.14:1, because the +0.05 offset dominates down here. 0.30 puts us at
 * **1.36:1** — on the DENSE side of igloo's perceived separation rather than
 * 35% short of it, which is exactly what the owner measured as "closer to
 * igloo". Terms that ride this multiply (MARK_GAIN) keep their ratio to the
 * body; terms added AFTER it (EMBER_GAIN) gain ~1.4× relative weight — see
 * each. */
export const BODY_DARKEN = 0.3;

// --- Round 7 — sparkle glints (igloo's triangle-sparkle layer, §3) ----------
/** Hash-cell frequency over crystal-local position (cells ≈ 1/15 unit). */
export const SPARKLE_FREQ = 15.0;
/** Per-cell micro-normal spread around the facet normal. */
export const SPARKLE_TILT = 0.8;
/** Glint alignment exponent (view/normal/light gate) — high & tight. */
export const SPARKLE_POW = 90.0;
/** Fraction of cells DISABLED (gate = smoothstep(this, this+.08, hash)) —
 * sparse: a few winks per second, not glitter. */
export const SPARKLE_DENSITY = 0.72;
/** Slow time wink (rad/s phase per cell) so glints breathe even at rest. */
export const SPARKLE_TWINKLE = 1.7;
/** Glint intensity. ROUND 8-E §B4.2 part 3: 3.5 → 0.5 — the single widest
 * defect in the old value world (peak 3.03 lumLin = **569× the body**; igloo
 * caps every pixel at 3.4× its body).
 *
 * ROUND 8-F (LIVE-MEASURED — the matte A/B): 0.5 → **0.30**. Peak 0.865 × 0.30
 * = **0.260 lumLin** = 6.6× the new body, and now deliberately BELOW the key
 * lobe (0.277) instead of level with it: on a matte stone the sun-facing facet
 * should out-read a micro-glint, or the surface goes back to glitter. Still
 * sub-bloom by construction (post-blend 0.26 × CRYSTAL_ALPHA 0.94 = 0.24,
 * nowhere near the ≈1.0 threshold). Dev-tunable (uSparkleGain); the lite build
 * never compiles the branch. */
export const SPARKLE_GAIN = 0.3;

// --- Round 7 — frost grain (internal structure, §4) -------------------------
/** 3D value-noise frequency over crystal-local position — the ROUGHNESS
 * ZONING band. ROUND 8-E §A2/§D1 (band separation, priority 2): igloo's
 * roughness map saturates its structure function at 256 px ÷ ~228 texels per
 * object unit ⇒ **≈ 0.9 cycles / unit** — a broad, slow patchwork that zones
 * the stone into glassy regions and frosted regions. Ours sat at 5.5, i.e.
 * only 1.45× away from the relief band (RIPPLE_FREQ 8) — the two mudded into
 * a single mid-frequency corrugation. 5.5 → 0.9 separates them by 28.9×
 * (igloo ≈ 32×): frost becomes zoning, ripple becomes wet shimmer.
 *
 * ROUND 8-I — the separation NARROWS and is left alone, deliberately. The
 * anti-aliasing retune takes the relief band to RIPPLE_FREQ 12, so the two are
 * now **13.3×** apart, not 28.9×. Still more than an order of magnitude, so the
 * §A2 defect (one mudded mid-frequency corrugation at 1.45×) is nowhere near
 * returning, and the frost's own amplitude is cut 65% this round on top. If the
 * frost ever starts reading as RELIEF rather than as zoning, the one-knob fix is
 * here (0.9 → 0.4 restores ~30×), not on the carrier — the carrier is pinned by
 * the pixel grid (see RIPPLE_FREQ). */
export const FROST_FREQ = 0.9;
/** Master frost amplitude (signed noise ×this) — dev-tunable (uFrostAmp);
 * 0 = uniform glass. Lite never compiles the frost octave.
 *
 * ROUND 8-I (LIVE-VERIFIED on the authored slab): 1.0 → **0.35**. The frost
 * veins were FIGHTING the large planes the round-8-H slab exists to provide:
 * a full-amplitude vein sweeping across a single 19%-of-the-surface plane
 * breaks it into patches, which is the incoherence the authored geometry was
 * bought to remove. `frost` is signed, so the amplitude is the whole span —
 * ±0.5·this — and every downstream K scales with it:
 *   roughEff  0.27 … 0.45   →  **0.329 … 0.392**  (FROST_ROUGH_K)
 *   thickEff  1.20 … 2.80   →  **1.72 … 2.28**    (FROST_THICK_K)
 *   body ×    0.725 … 1.275 →  **0.904 … 1.096**  (FROST_DENSITY_K)
 * Value-table effect: the MEAN factor is 1.0 either way, so body typical is
 * untouched at 0.0396; only the extremes close in — darkest body 0.0199 →
 * 0.0230, i.e. dynamic range 4.66:1 → **4.47:1**. That narrowing is the price
 * of this cut and it is the only row of the table that moves.
 * ⚠ COST TO KNOW: the roughness ZONING is largely surrendered — the delivered
 * spread is now ±9% around CRYSTAL_ROUGH where igloo measures p10/p90
 * 0.19/0.44. If the stone starts reading as ONE uniform material, raise
 * FROST_ROUGH_K (0.5 → 1.43 restores the old roughness range at this
 * amplitude) rather than raising this — the thickness and density veins are the
 * ones that were breaking the planes. */
export const FROST_AMP = 0.35;
/** Frost → roughness modulation: roughEff = rough·(1 + frost·this).
 * ROUND 8-E §D2: 0.9 → 0.5. With CRYSTAL_ROUGH 0.36 and the then-current
 * FROST_AMP 1.0 the veined range was 0.36·[0.75, 1.25] = 0.27 … 0.45 — igloo's
 * measured p10/p50/p90 of 0.19/0.36/0.44 (their `0.65 × G` effective
 * roughness). ROUND 8-I leaves this constant alone but FROST_AMP 1.0 → 0.35
 * tightens the delivered range to **0.329 … 0.392**; 1.43 here would restore
 * the igloo distribution without re-introducing the density/thickness veining
 * that the amplitude cut removed. */
export const FROST_ROUGH_K = 0.5;
/** Frost → thickness modulation (refraction depth veins). */
export const FROST_THICK_K = 0.8;
/** Frost → body density veining: body ×(1 + frost·this). */
export const FROST_DENSITY_K = 0.55;

/** Fresnel rim. Round 7 (§2) took RIM_BASE 0.55→1.6 so the whole grazing band
 * crossed 1.0 into bloom. ROUND 8-E §B4.2 part 3 REVERSES that: at 1.6 the rim
 * peaked at 1.27 lumLin = **238× the body**, and with the sparkle at 569× the
 * eye could see nothing BUT the highlights — the literal arithmetic of
 * "glowing white outline on black". 1.6 → **0.35**: the whitened rim's Rec709
 * linear luminance is 0.791 at f1 = 1, so the broad rim now peaks at 0.277
 * lumLin. The >1.0 bloom is not lost, it is re-scoped to a hairline: see
 * RIM_EDGE_START / RIM_EDGE_GAIN.
 *
 * ⚠ ROUND 8-F — NOT CUT (it was not in the owner's live A/B), but its STANDING
 * changed and the next taste pass should know it. The body fell to 0.0396 and
 * SPEC_GAIN to 0.32, so this rim is now **7.0× the body** (was 4.9×) and it
 * TIES the key lobe (0.277 vs 0.277) as the brightest ordinary pixel, where
 * 8-E deliberately kept the lobe ahead — "env-lit facets, not a glowing
 * outline" is the igloo read, and we are one nudge from losing it. If the stone
 * reads as an outline again, cut THIS before touching SPEC_GAIN; ≈0.28 restores
 * the 8-E ordering (rim 0.222 = 0.80× the lobe). */
export const FRESNEL_POW = 3.0;
export const RIM_BASE = 0.35;
/** Ignition flash gain on the rim. ROUND 8-E: 2.2 → 1.2 — with the value
 * CEILING in place (CRYSTAL_CEIL) a 2.2 flash pinned a wide band flat at the
 * clamp; 1.2 keeps the mid-rim proportionate and lets only the outer edge
 * saturate (igloo's own `clamp(…,0,1)` behaviour). */
export const RIM_FLASH_GAIN = 1.2;
/** Round 7 — per-channel fresnel exponent ratio (R×this / G / B÷this): blue
 * reaches further inward than red → a spectral dispersion fringe on the
 * silhouette with zero extra refraction samples. */
export const RIM_DISPERSION = 1.45;
/** Round 7 — rim whitening toward extreme grazing: mix(cyan, white,
 * f·this) — the outermost edge reads white-hot, the inner fringe cyan-blue. */
export const RIM_WHITEN = 0.45;
/** Body alpha ceiling (the depth fade + reveal ride under it). Round 7:
 * 0.92→0.94 — the darker glass body needs a touch more presence so it never
 * dissolves into the page navy (§6: the rim/glints carry the silhouette;
 * fade floor 0.94·(1−FADE_MAX) ≈ 0.047 still sits under the 0.05 Discard). */
export const CRYSTAL_ALPHA = 0.94;

// --- Depth fade (igloo §5 fog-mix, ADAPTED to alpha) ------------------------
/**
 * Igloo repaints distant rocks with the OPAQUE background gradient
 * (mix(bg, color, vFade)). Our canvas is TRANSPARENT over the DOM's navy —
 * that repaint would paint solid navy over the page — so the SAME
 * falloffsmooth window fades ALPHA instead: deep/back shards dissolve into
 * the page navy. Domain: dRel = (camDist − distToClusterCenter) / groupScale,
 * i.e. crystal-local units centered on the cluster (scale-independent; the
 * mined absolute-distance window assumed free-floating rocks).
 */
export const FADE_FROM = -2.0;
export const FADE_TO = 4.0;
export const FADE_MARGIN = 2.0;
export const FADE_PROGRESS = 0.6;
/** mined `vFade·0.95` → alpha = uAlpha·(fade·this + (1−this)). */
export const FADE_MAX = 0.95;

// --- Motion (igloo nF grammar, dossier §3) ----------------------------------
/** Scroll tumble k per axis — igloo verbatim: rotation.(x,y,z) =
 * (14, 11, 6)·rand·(centeredProgress − progress). Scaled by the per-mode gain
 * (our centering scalar spans ~±0.85 viewport-heights across the band, vs
 * igloo's per-cube scroll unit). Settles upright at section center. */
export const TUMBLE_K: [number, number, number] = [14, 11, 6]; // x, y, z
/** Healthy carries the visible scroll tumble (the crystal that "rotates
 * upright at center"); broken keeps the group motion gentler — its life
 * comes from the per-shard rotate3D in the vertex path (round-5 brief). */
export const TUMBLE_GAIN: Record<LatticeMode, number> = {
  broken: 0.18,
  healthy: 0.25,
};
/** Per-mode signed per-axis multipliers (igloo's deterministic per-cube
 * rands) — magnitude 0.5..1, signs differ so the two crystals counter-spin. */
export const TUMBLE_RAND: Record<LatticeMode, [number, number, number]> = {
  broken: [0.83, -0.61, 0.47],
  healthy: [-0.57, 0.71, -0.39],
};
/** Idle wobble (igloo verbatim): += sin(t·0.3 + seed)·0.1 per axis. */
export const WOBBLE_AMP = 0.1;
export const WOBBLE_FREQ = 0.3;
export const WOBBLE_SEEDS: [number, number, number] = [1.7, 4.3, 8.9];

// --- Ignition (store link — read-only, same channel as NeuralLattice) -------
/** Damp λ easing the crystal's own read of the store pulses (NeuralLattice
 * owns the pulse DECAY write-back; this island only eases toward the
 * targets — never a second setPulse writer). */
export const CRYSTAL_PULSE_DAMP = 6.0;
/** Broken re-cohere envelope attack/decay — the NeuralLattice recohereEnv
 * grammar exactly (its RECOHERE_ATTACK/DECAY are 14/1.6; kept as own
 * constants so the two islands stay independently tunable). */
export const CRYSTAL_RECOHERE_ATTACK = 14.0;
export const CRYSTAL_RECOHERE_DECAY = 1.6;

// --- Callout re-anchoring (round-5 W3, DOM-first) ---------------------------
/**
 * The DOM ghost callouts keep their strings + markup; the crystal driver
 * projects three anchor points (igloo §4 bbox-lerp grammar) through the
 * group transform to percentages OF THE ANCHOR RECT and writes
 * `--callout-N-left` / `--callout-N-top` custom properties on the
 * `[data-lattice-anchor]` element. The sections read them with the historic
 * hardcoded positions as fallbacks (SSR / fallback tier / RM keep today's
 * placement). `--callout-N-top` feeds whichever edge property the callout
 * uses (`top:` or `bottom:` — see CALLOUT_EDGE).
 */
/** Edge orientation per callout index — MUST match the sections' CALLOUT_POS
 * edge column (problem-section.tsx / production-grade-section.tsx): the
 * driver converts the projected anchor into a top- or bottom-relative offset
 * accordingly. Both sections currently run top/bottom/top. */
export const CALLOUT_EDGE: readonly ("top" | "bottom")[] = [
  "top",
  "bottom",
  "top",
];
/** Label-block offset from the leader-line TIP to the positioned edge:
 * ~15px label line + 4px gap + 28px leader (`h-7` + `mt-1`/`mb-1`). */
export const CALLOUT_LABEL_OFFSET_PX = 47;
/**
 * Healthy anchors: fixed crystal-local points on the intact crystal; they ride
 * its tumble (the driver applies `mesh.rotation`, so each stays the same
 * MATERIAL point on the stone).
 *
 * ROUND 8-H — RE-FITTED TO THE AUTHORED SLAB, measured not guessed. The old
 * values were written against a bbox the previous comment recorded as
 * "x ±1.25, y ±1.8"; the shipped slab measures **x ±1.3945, y ±1.6600,
 * z ±1.0790**. Ray-casting each old anchor's direction from the crystal centre
 * against the shipped mesh:
 *   [-0.55, 1.15, 0.40]  |p| 1.336 vs surface 1.054 → **1.27× — 27 % OUTSIDE
 *                         the stone**, i.e. its leader line pointed at air
 *   [ 0.20,-1.30, 0.30]  |p| 1.349 vs surface 1.445 → 0.93×, already right
 *   [ 0.90, 0.50, 0.20]  |p| 1.049 vs surface 1.524 → 0.69×, buried in the body
 * Each is re-placed at **0.97 × the surface radius along its own direction** —
 * on the stone, a hair inside the silhouette, which is what an anchor is for.
 * Directions (and therefore the three callouts' relative screen placement) are
 * preserved exactly; only the radii moved. Re-run this fit if the GLB is
 * re-authored: cast from the origin, take the FIRST hit, multiply by 0.97.
 */
export const HEALTHY_CALLOUT_ANCHORS: readonly [number, number, number][] = [
  [-0.42, 0.88, 0.31],
  [0.21, -1.35, 0.31],
  [1.27, 0.71, 0.28],
];
/**
 * Broken anchors ride these piece indices: anchor = centr·(1 + gap + drift).
 * Indices are into the AUTHORED partition (crystalBuild reads the GLB's 8
 * unique `_CENTR`/`_RAND` values in authoring = volume-descending order), so
 * 0/1 are the two large bodies, 2/3 mid, 4-7 chips.
 *
 * ROUND 8-H — [1, 3, 5] → **[1, 2, 5]**, measured. The size-class INTENT is
 * unchanged (large 30.4 % / mid 10.2 % / chip 2.4 %); what changed is that the
 * authored fracture seeds its chips near one impact shoulder instead of on a
 * golden spiral, which stacked two of the old three anchors on top of each
 * other. Projected screen offsets from the crystal centre at rest gap
 * (px at a 900 px band, 153 px per crystal unit, +y up), anchor = centr·(1+gap)
 * at the re-levelled FRACTURE_REST_GAP_AUTHORED 0.55, i.e. centr·1.55:
 *   piece 1 (−148, −59)   piece 2 (−38, −130)   piece 3 (+111, −245)
 *   piece 5 (+151, −284)  piece 4 (−118, −293)  piece 0 (+155, +53)
 * [1,3,5] puts pieces 3 and 5 **40 px apart in x, 39 px in y** — and after the
 * CALLOUT_EDGE ±47 px label offsets their label blocks cross. [1,2,5] spreads
 * to 131 / 244 / 375 px separations across three quadrants, which is the
 * relationship the old golden-spiral cluster had. Their edge-relative offsets
 * land at 56.3 / 25.3 / 81.3 %, all inside CALLOUT_EDGE_MIN/MAX (2…88) — the
 * check that forced the gap re-level: at the un-levelled gap 1.0 piece 5
 * projected to 90.5 % and PINNED against the clamp, i.e. its leader line
 * stopped pointing at its shard. All three stay < SHARD_COUNT_LITE (harmless
 * now — every tier gets all 8 authored pieces).
 * ⚠ QA: this is the one round-8-H change with no arithmetic gate behind it,
 * only geometry. If the browser pass prefers the old mid piece, [1,3,5] is a
 * one-token revert (it clears the clamps too at gap 0.55: piece 3 lands at
 * 77.0 %; only its 40 px proximity to piece 5 argues against it).
 */
export const BROKEN_CALLOUT_SHARDS: readonly [number, number, number] = [
  1, 2, 5,
];
/** Damp λ of the projected callout values (labels must not jitter with the
 * wobble/tumble) + the write threshold in % (skip sub-0.1% churn). */
export const CALLOUT_DAMP = 8.0;
export const CALLOUT_WRITE_EPS = 0.1;
/** Clamp windows (% of the rect) so labels never leave the band. */
export const CALLOUT_LEFT_MIN = 4;
export const CALLOUT_LEFT_MAX = 96;
export const CALLOUT_EDGE_MIN = 2;
export const CALLOUT_EDGE_MAX = 88;

// === ROUND 7-2b — igloo stones v2 anatomy transplant ========================
// research/2026-08-22-round7-stones-v2-anatomy.md, Part B. Everything below is
// full-tier only unless noted; the ember + mark are the "inner object" pair.

// --- §B-a (i) — healthy: the SERSAN mark inside the ice (transmission RT) ---
/**
 * RT edge (square, power-of-two for the mip chain).
 *
 * ROUND 9-C — the comment that used to live here read "NOT canvas-coupled: the
 * mark is sampled in CRYSTAL-LOCAL space (not screen space like igloo)". The
 * first clause survives and is now a VIRTUE; the parenthesis WAS the bug (see
 * the ROUND 9-C block in the file header and MARK_THICKNESS below). The mark is
 * now sampled through igloo's projective map, re-centred on the crystal origin
 * — and precisely because our RT holds ONLY the subject (igloo's holds the
 * whole scene) the map needs no viewport coupling at all: viewport, DPR, fov,
 * depth and model scale ALL cancel in the shader, so this stays a 512² ortho
 * image rendered ONCE per session.
 * 512 still out-resolves what the igloo lod law ever asks for. At roughEff 0.36
 * the lod is log2(512)·0.36·0.36 = 1.17, a ~2.25-texel footprint. The mark's
 * content spans 0.87 uv = 445 texels; at the 8-I LIVE-MEASURED band (123 px per
 * crystal unit) it lands on 246 screen px, so 1 RT texel = 0.55 px — the RT is
 * **1.81× oversampled** and the lod blur is a ~1.2 px soft edge. Crisp, with
 * mip headroom left over.
 */
export const MARK_RT_SIZE = 512;
/** Ortho half-extent framing the ~2-unit-tall normalized mark (margin so the
 * clamp-to-edge border texels stay transparent black). `sersan-mark.glb`
 * normalizes to ±1.0 tall × ±0.814 wide, so at 1.15 the frame keeps 0.15 /
 * 0.336 of transparent margin on every side — the shader's out-of-frame
 * samples clamp to additive-zero instead of smearing an edge texel.
 * ⚠ This is the RT-SIDE half-extent (what is IN the texture). Its shader-side
 * twin is MARK_WORLD_HALF (how big that texture reads on the stone); they are
 * independent knobs and are only equal by choice at the shipped default. */
export const MARK_RT_FRAME = 1.15;
/** Unlit mark tint — white-cyan ≤ 1.0 (palette contract; toneMapped:false).
 * The RT content never crosses 1.0 → the mark itself can't trip bloom; the
 * body/rim keep owning the bloom budget. */
export const MARK_COLOR = "#D8F4FF";
/** Additive gain on the mark tap (ROUND 9-C: ONE tap, outside the dispersion
 * ladder, which is the backdrop's alone; pre uBodyDarken — the mark rides the
 * dark-glass multiply + frost veining like igloo's transmission sample).
 * ROUND 8-E re-levelling (the round-8 doc flags
 * MARK_* and EMBER_* as additive terms that must be re-levelled once the body
 * rises ~8×): at 1.6 the mark landed at ~0.71 lumLin post-darken against a
 * 0.005 body — a **133×** blob, one of the terms making the stone read as a
 * lamp. 1.6 → 0.35 puts it at 0.155 lumLin ≈ 2.7× the raised body: an object
 * clearly visible INSIDE the ice (igloo's penguin read) without leaving the
 * compressed window or approaching the ceiling.
 *
 * ═══ ROUND 8-H — 0.35 → **0.70**. THE LEVEL SURVIVES; ITS STATED CAUSE DOES
 * NOT — SEE THE 9-C AMENDMENT AT THE END OF THIS PARAGRAPH. ═══
 *
 * The history this replaces: the owner A/B'd 0.35 → 1.4 → 2.4 live at
 * `__sersanCrystal_healthy.uniforms` and at NO gain did the mark become
 * legible — it only filled the stone with confetti. The cause was never LEVEL.
 * 8-H diagnosed it as SPATIAL COHERENCE: the mark is sampled through the
 * per-fragment refracted direction, so every facet taps a different patch of
 * the RT, and the procedural icosahedron had **zero coplanar patches** (all
 * 3 380 triangles are their own facet, largest-1 %-faces 2.3 % vs igloo's
 * 6–20 %), where the authored slab (`crystal-intact.glb`) carries **34 planar
 * patches, six of which cover half the surface, the largest 19 %** — "each of
 * those refracts ONE coherent image. That is the fix."
 * ⚠ **ROUND 9-C AMENDS THAT LAST SENTENCE.** Patch size was never the
 * mechanism, only a partial COMPENSATION for a broken base map: under a
 * projective base map (which is what igloo has and what 9-C implements) the
 * patches are not independent images at all — each shows the same,
 * correctly-placed image displaced by a bounded `T·sin δ`, so coherence is
 * structural and survives even a 3 380-facet mesh (which is why the procedural
 * fallback is no longer a disaster; see the NOTE at the end). What 8-H got
 * right is that the OLD map's per-facet re-indexing was the confetti, and that
 * bigger patches reduced it. The slab still earns its keep on the MATERIAL
 * (dihedral variety, facet flashes) — just not as the mark's fix.
 * Either way this constant is free to move, and the arithmetic below stands.
 *
 * WHY 0.70 (the arithmetic, since this was levelled without a browser — the
 * main session owns the visual A/B). The mark is added PRE `uBodyDarken`, so
 * a full-coverage stroke contributes lum(#D8F4FF) 0.865 × G × BODY_DARKEN 0.30
 * = 0.2595·G on top of the 0.0396 body:
 *   G = 0.35 → stroke 0.130 lumLin, WCAG-form vs body (0.180/0.0896) = 2.01:1
 *   G = 0.70 → stroke 0.221 lumLin, WCAG-form vs body (0.271/0.0896) = 3.03:1
 * 3:1 is the standards threshold at which a graphical object is deemed to read
 * against its background, and 2:1 is not — so the old level was ALSO under the
 * bar, independently of the geometry defect. Three checks bound it from above:
 *   1. ORDERING. The brightest ordinary pixel on the stone is 0.276 (key lobe
 *      / rim). At 0.70 the mark peaks at 0.221 = 0.80× that, so the surface
 *      still out-reads its inclusion — a lit stone with a mark inside, not a
 *      lamp with a logo. The TIE is at G = (0.276 − 0.0396)/0.2595 = **0.91**
 *      (CHECK re-derivation; the first pass wrote 0.88, which is the same
 *      bound with a margin rather than the solution). That typical-body tie is
 *      only half the story: the frost density factor multiplies BOTH the mark
 *      and the body, so the binding case is the brightest frost VEIN. ROUND 8-I
 *      re-derived it after the FROST_AMP cut and found a latent violation:
 *        frost span ×1.275 (8-H): vein tie at G = (0.276 − 0.0466)/(0.2595 ×
 *          1.275) = **0.693** — the shipped 0.70 was a hair OVER the ordering
 *          bound wherever the frost peaked;
 *        frost span ×1.096 (8-I): vein tie at G = (0.276 − 0.0420)/(0.2595 ×
 *          1.096) = **0.822** — 0.70 now clears it by 17.5 %.
 *      So the operational ceiling for any live A/B is **0.82** (0.91 is the
 *      typical-body tie, reachable only where the frost is neutral).
 *   2. BLOOM. Per channel the addition is (0.144, 0.190, 0.210) — post-blend
 *      ×0.94 = 0.197 peak, nowhere near the ≈1.0 selective-bloom threshold, so
 *      MARK_COLOR's "the mark itself can never trip bloom" contract survives
 *      (and CRYSTAL_CEIL 1.35 is never reached: mark + key lobe = 0.50).
 *   3. SAMPLING LOSS. The 3-sample ladder taps the RT at coords that differ by
 *      Δuv ≈ 0.024 (≈12 px of the 512 RT) and blurs at lod ≈ 1.17, so a stroke
 *      narrower than that spread lands at ~0.7 of full coverage: 2.42:1 rather
 *      than 3.03:1. That is the realistic floor, and it is why the value was
 *      not set at the 3:1 minimum. **ROUND 9-C RETIRES THIS CLAUSE**: the mark
 *      now takes exactly ONE tap (the dispersion ladder is the backdrop's
 *      alone), so there is no 0.024-uv ladder spread to lose coverage to and
 *      the realistic floor rises back to the full **3.03:1**. What REMAINS is
 *      the lod-1.17 mip blur alone — a ~2.25-texel footprint on the 512² — so
 *      the honest condition is "any stroke wider than ~4 RT texels
 *      (≈0.008 uv ≈ 2 screen px at the measured band) reaches full coverage";
 *      below that the peak still rolls off with the kernel. Checks 1 and 2 are
 *      untouched — the peak, and therefore the ordering tie (0.822 on the
 *      brightest frost vein) and the bloom headroom (0.197 post-blend), are
 *      identical, because at full coverage the mean of three saturated taps IS
 *      the single tap (and BELOW full coverage the single tap is strictly
 *      BRIGHTER than the old 3-tap mean — the change can only move the mark up
 *      toward its ceiling, never past the peak checks 1/2 bound).
 * ═══ ROUND 8-I (LIVE) — "THE SUBJECT IS WRONG". **RETRACTED BY ROUND 9-C.** ═══
 *
 * The 8-H bet was that spatial coherence would make the mark legible and that
 * the gain was then free to move. Half of it held: on the authored slab the
 * mark is a coherent luminous presence instead of confetti. The other half did
 * not. A/B'd live on the clean stone at **uMarkGain 0.7 → 1.1 with uMarkScale
 * 0.6**, it was still NOT recognizable as the SERSAN mark — and 8-I concluded
 * that this was a FORM problem: "34 planar patches means 34 independent
 * refracted images … cut a hairline stroke into 34 offset pieces and there is
 * no stroke left to follow."
 *
 * THAT DIAGNOSIS WAS WRONG, and the bundle forensics say so precisely
 * (research/2026-08-22-round9-inner-object-mechanism.md §1.5): under igloo's
 * SCREEN-SPACE map the patches are NOT independent images. Because the exit
 * point is projected, the base map is the projective identity and every patch
 * shows a slightly-SHIFTED copy of the SAME, correctly-placed image; the
 * per-patch perturbation is bounded by `T·sin δ` and cannot re-index the
 * subject. "34 independent images" was a true description of OUR map — an
 * orthographic projection along the tumbling crystal's LOCAL Z, plus an
 * un-cancelled view-space direction — and of nothing else. Coplanar patch size
 * was a partial compensation for a broken base map, never the mechanism.
 * The three options 8-I put to the owner (accept / swap the subject for a
 * chunky solid / drop the inner object) are therefore NOT the live decision any
 * more. Option (b) survives only as an optional legibility upgrade (see
 * MARK_THICKNESS's "levers still on the shelf"), not as the fix.
 *
 * MARK_GAIN STAYS AT 0.70 THROUGH ROUND 9-C — and this time because nothing in
 * its derivation moved: the compositing site is byte-identical (additive into
 * `trans`, PRE `uBodyDarken`, riding the dark-glass multiply and the frost
 * density veining), so checks 1 and 2 above hold verbatim and the live A/B
 * range stands at 0.55 – 0.82 (ceiling per check 1). Unlike 8-I, spending a
 * browser pass on this knob IS now worth it: the map underneath it changed.
 *
 * NOTE the fallback: if the GLB ever fails to load, crystalBuild rebuilds the
 * procedural icosahedron. ROUND 9-C makes that path far less bad than it was —
 * the base map no longer depends on the mesh having coplanar patches at all, so
 * the fallback loses only the per-patch coherence of the PERTURBATION (a
 * per-triangle 5–18 px jitter), not the placement of the image. */
export const MARK_GAIN = 0.7;
/* ─── REMOVED IN ROUND 9-C: `MARK_COORD_SCALE` (was 0.55) ────────────────────
 * It was the second half of the broken map, `uv = vLocal.xy·BACKDROP_COORD_
 * SCALE(0.4)·MARK_COORD_SCALE(0.55) + refrDirView.xy·thickEff·REFR_OFFSET_
 * SCALE + 0.5` = `vLocal.xy·0.22 + refrDirView.xy·0.495 + 0.5`. Both terms are
 * gone from the mark path (the BACKDROP keeps its own, unchanged):
 *   · `vLocal.xy·0.22` was an ORTHOGRAPHIC projection along the crystal's LOCAL
 *     Z. `CrystalCluster` writes the tumble on the MESH (group.quaternion is
 *     the camera's), and the tumble swings local +Z to ~29° off the view axis
 *     at band position a = ±0.25, ~67° at ±0.5 and 90° at ±0.79 — all of them
 *     INSIDE the cull window. Past ~75° the visible cap stops being a graph
 *     over local XY and the map FOLDS: two screen-separated pieces of the
 *     surface index the same uv from opposite sides. Mirrored, creased pieces.
 *   · `refrDirView.xy·0.495` never had its along-ray component cancelled
 *     (nothing was projected), so it carried the whole obliquity of the view
 *     ray — a constant 0.31 floor from the stone's 18.2° off-axis placement
 *     plus the deviation term, reaching 0.168 uv ≈ **±117 px** of facet-to-
 *     facet jump on a ~500 px mark. And it was a VIEW-space direction added to
 *     a CRYSTAL-LOCAL position: mixed bases, so the perturbation field rotated
 *     relative to the image it was perturbing.
 * Its doc-comment also claimed the mapping sized "the mark to ~0.9 crystal
 * units inside the body", which does not follow from `uv = vLocal.xy·0.22 +
 * 0.5` — that mapping showed the stone a 0.73-uv window of a 0.87-uv-tall mark,
 * i.e. the mark rendered 19 % LARGER than the window and cropped top and
 * bottom. Its replacement, MARK_WORLD_HALF, is a real world half-extent with a
 * derivation, and lands the mark at 60 % of the slab's height, inside it.
 * The mark's use of REFR_OFFSET_SCALE is likewise removed — MARK_THICKNESS is
 * an independent length, see there. ─────────────────────────────────────────*/
/**
 * ROUND 9-C — the mark's transmission-ray length, in CRYSTAL units, and THE one
 * knob that sets how much the logo swims inside the ice.
 *
 * igloo's `getVolumeTransmissionRay` returns `normalize(refract(…)) · thickness
 * · modelScale`; we do the same in view space, then project both the exit point
 * and the crystal origin and take the difference (crystalBuild, the mark
 * block). Model scale, fov, aspect, viewport and DPR all cancel, leaving
 *
 *     Δ(markUv)  =  MARK_THICKNESS · sin δ / (2 · MARK_WORLD_HALF)
 *
 * a dimensionless DISPLACEMENT, where δ is the facet's refractive deviation.
 * ⚠ Read the symbol: this is the amount the refraction MOVES the sample, not
 * `markUv − 0.5` itself. `markUv` is the projective identity — the fragment's
 * own view ray intersected with a billboard of half-extent MARK_WORLD_HALF at
 * the crystal's centre — so it sweeps the whole 0…1 range across the stone and
 * the term above rides on top of it (full algebra in crystalBuild's mark
 * block). The only depth term that does NOT cancel is the ratio D/(D−d), the
 * ordinary perspective of a mid-depth inclusion seen through the near cap.
 * At CRYSTAL_IOR 1.18: δ = 4.9° at 30° incidence, 8.2° at 45°, 12.8° at 60°,
 * 20.1° at 75°, 32.1° at grazing (eta = 1/1.18 < 1 ⇒ no TIR, so 32.1° is the
 * hard maximum and Δ ≤ 0.35·0.531/2.30 = 0.081 uv in any REACHABLE pose;
 * 0.152 uv is the unreachable sin δ = 1 bound).
 *
 * NOTE the on-screen displacement is `MARK_THICKNESS · sin δ` CRYSTAL UNITS —
 * MARK_WORLD_HALF cancels out of it (it only rescales the image, not the
 * lateral ray), which is why these two knobs are genuinely independent.
 *
 * WHY IT IS DECOUPLED FROM CRYSTAL_THICKNESS (2.0) AND REFR_OFFSET_SCALE
 * (0.45). Those two drive the PROCEDURAL BACKDROP, whose "subject" is a
 * low-frequency navy gradient that wants a long ray; the mark is a
 * thin-stroked logo. At the 8-I LIVE-MEASURED band (123 px per crystal unit,
 * mark 246 px tall) the old effective 0.9 swims 9.7 / 24 / 38 px at δ = 5 / 13
 * / 20° — 4 / 10 / 15 % of the mark's own height, and strokes break between
 * patches. At 0.35 it is **3.8 / 9.4 / 14.8 px = 1.5 / 3.8 / 6.0 %** — clearly
 * legible and still visibly refracted. (Those percentages are the
 * viewport-invariant form; the round-9 doc quotes 12/30/47 and 4.6/12/18 px on
 * a 305-px mark because it assumed a 1440×900 canvas. Same ratios.)
 * Physically this is not a fudge: the mark is an INCLUSION near the stone's
 * mid-depth, not the far wall, and a shorter transmission ray is the more
 * correct model for it (igloo's `uThickness = 2` is calibrated to a subject
 * that fills its cube).
 *
 * ⚠ The HIGH-FREQUENCY half of the swim is the wet-ice ripple, not the facets:
 * RIPPLE_AMP delivers ~25° of surface tilt at ~10 screen px per cycle, which
 * rotates and rescales the lateral term by roughly ±4 px at 0.35 (it would have
 * been ±10 px at 0.9). That is the intended "seen through rippled ice" read;
 * `uRippleAmp` is the knob if the owner wants the logo flatter.
 * Dev-tunable 0.15 (reads like a decal, ice character lost) … 0.9 (today's
 * effective, strokes break) via `__sersanCrystal_healthy.uniforms.uMarkThick`.
 *
 * LEVERS STILL ON THE SHELF if the owner wants more legibility after the live
 * pass, cheapest first: (1) RT DILATE — render the mark mesh twice into the
 * 512², once at scale 1.06 at ~0.3 gain (a soft shoulder ≈7 screen px, i.e.
 * most of the worst-case swim) then once at 1.0 at full gain; still
 * render-once, one extra draw, and it cannot raise the peak because the second
 * draw overwrites the first (the RT has no depth buffer). (2) A solid-silhouette
 * variant of the mark authored as a second GLB used only by the RT. (3) Variant
 * B of the round-9 doc — a full-viewport, per-frame, main-camera RT, which buys
 * real 3D tumble and perspective of the mark for ~0.1–0.3 ms/frame.
 */
export const MARK_THICKNESS = 0.35;
/**
 * ROUND 9-C — the crystal-space half-extent that maps to the RT's uv edge; the
 * shader-side twin of MARK_RT_FRAME. LOWER = BIGGER MARK.
 *
 * At 1.15 (= MARK_RT_FRAME) one mark unit is one crystal unit, so the
 * height-2-normalized mark is 2 of the slab's 3.32 units = **60 % of the
 * slab's height** (and its ±0.814 width is 58 % of the slab's ±1.3945), with
 * margin at every tumble angle on the axis-wise test: the slab's smallest
 * support half-extent over all rotations is its z half-depth 1.079, still
 * larger than the mark's 1.0.
 * ⚠ That test is axis-wise, not a containment PROOF — the mark's bounding-box
 * CORNER sits at 1.29, and the off-axis parallax term (see MARK_THICKNESS)
 * slides the sampled window by up to ~0.5 crystal units on the near cap. So at
 * some poses the outermost few percent of the mark's frame falls outside the
 * silhouette. Nothing clips it — there is simply no geometry there to sample
 * (the `Discard` in crystalBuild is the alpha/fade guard, NOT a silhouette
 * cut) — the mark just runs off the edge of the stone, which is what looking
 * through a stone does. The logo's own strokes stay well inside; keep the mark
 * at ≲0.75 of the slab's height if that margin is ever spent.
 * (The old map, for the record, ran the mark at 119 % of the window it was
 * shown through — cropped top and bottom. See the MARK_COORD_SCALE removal
 * note above.)
 * Dev-tunable 0.7 … 1.6 via `…uniforms.uMarkHalf`.
 */
export const MARK_WORLD_HALF = 1.15;
/**
 * ROUND 9-C — the y-flip. **SETTLED FROM THE THREE SOURCE, NOT LEFT TO THE
 * BROWSER: it is −1.** (`markUv.y = 0.5 − dNdc.y/(2·halfNdc.y)`.)
 *
 * ⚠ CHECK-ROUND CORRECTION. The round-9 doc §3.6 — and the comment that used to
 * sit here — reasoned: "three flips y on the WebGPU path because it samples a
 * FRAMEBUFFER COPY whose origin convention is flipped; igloo, on WebGL against
 * its own RenderTarget, does not flip; we sample our OWN RenderTarget.texture,
 * so no flip, +1." Every clause of that is wrong for three 0.184, and the
 * source settles it three ways:
 *   1. `nodes/functions/PhysicalLightingModel.js:133-136` — three's own
 *      `getIBLVolumeRefraction` does `ndc.xy/w`, `+1`, `/2`, then
 *      `vec2(x, y.oneMinus())  // webgpu`. That flip is in the TSL GRAPH, i.e.
 *      it runs on BOTH backends — it is not a WebGPU-only correction.
 *   2. `nodes/accessors/TextureNode.js:853` — the compensating uv flip is
 *      enabled for `isRenderTargetTexture === true` **and**
 *      `isFramebufferTexture === true` in the SAME predicate. A framebuffer
 *      copy and our own RenderTarget are the same case; the distinction the
 *      doc leaned on does not exist.
 *   3. `WGSLNodeBuilder.isFlipY() → false`, `GLSLNodeBuilder.isFlipY() → true`
 *      (which then applies `uv.y → 1 − uv.y` for RT textures), and
 *      `ScreenNode.generate` flips `screenCoordinate` on GL "// follow webgpu
 *      standards". Net: on BOTH backends three's convention for an RT texture
 *      is **uv.y = 0 at the TOP of the rendered image** (NDC y = +1), y-DOWN —
 *      while `ndc·0.5 + 0.5` is y-UP. So the flip is required, backend-
 *      independently, and it stays required if MARK_RT_WEBGL2 is ever flipped
 *      on. `RenderTarget` sets `texture.isRenderTargetTexture = true`
 *      (`core/RenderTarget.js:142`), so we are squarely in that predicate.
 * Shipping +1 would have put the logo UPSIDE-DOWN — i.e. it would have failed
 * the owner's one acceptance test ("voglio che si veda il logo") for a reason
 * that has nothing to do with the map this round fixed.
 *
 * The knob survives as a knob (console: `…uniforms.uMarkFlipY`) because it
 * costs nothing, but its value is derived, not guessed: −1.
 */
export const MARK_FLIP_Y = -1;
/**
 * ROUND 9-C — the documented re-enable path for a mark that TUMBLES in 3D with
 * the stone instead of standing screen-upright.
 *
 * Variant A's one design consequence: because the RT is a subject-local ortho
 * image and all the camera/placement dependence lives in the shader's
 * projection, the mark is screen-upright. That is deliberate, not a
 * limitation-by-accident — the tumble reaches 90° off the view axis inside a
 * normal scroll pass (see the MARK_COORD_SCALE removal note), and a logo
 * rotated 90° is unreadable however correct its refraction is. "Si vede il
 * logo" requires screen-upright.
 * Flip this to `true` and crystalMarkRT copies the crystal mesh's quaternion
 * into the RT scene each frame (`mesh.quaternion.copy(q)`), which turns the RT
 * from render-once into a per-frame 512² render: one clear + one draw of a
 * ~15 KB unlit mesh + mip gen, ≈0.05 ms — real, but far under the 0.8 ms QA
 * budget. The full-3D-with-perspective version is Variant B of the round-9 doc
 * and is a different (per-frame, viewport-sized) rig.
 */
export const MARK_TUMBLE: boolean = false;
/** Igloo lod law (§A1 verbatim): lod = log2(rtSize)·roughness·clamp(2·ior−2,
 * 0,1); at ior 1.18 the ior factor is 0.36 — folded in here. roughEff (frost-
 * veined) drives it, so the veins modulate the mark's softness for free. */
export const MARK_LOD_K = 0.36;
/** Yaw of the mark INSIDE the ice (rad/s). 0 = igloo-rigid (the penguin
 * never spins in the cube) → the RT renders ONCE and per-frame cost is zero;
 * > 0 re-renders per visible frame (≤ the 0.8 ms QA budget). Dev-tunable. */
export const MARK_SPIN = 0;
/** GATE — the three/webgpu WebGL2 fallback backend. RT + texture().level()
 * are core on that path too, but the repo-wide `?backend=webgl2` proof is
 * still open (memory: round-7 QA item): until it passes, the mark branch is
 * NOT BUILT on the fallback backend — procedural backdrop only, today's look,
 * no black frame. Flip to true after the proof. */
export const MARK_RT_WEBGL2 = false;

// --- §B-a (ii) — broken: the amber ember core (procedural SDF, zero
// bindings). Colored the sanctioned desaturated amber (#886a3d — §A3 pinned
// igloo's interior warmth as env-side amber), sub-bloom by construction. ----
export const EMBER_COLOR = "#886a3d";
/** Master ember gain (uEmberGain). ROUND 8-E re-levelling in the OPPOSITE
 * direction to MARK_GAIN: the ember is added AFTER uBodyDarken, so raising
 * the body ~8× would have buried it (0.3 → 0.048 lumLin = 0.85× the new
 * body). 0.3 → 0.5 restores its relationship to the body — 0.05 lumLin at
 * rest gap (breathe 0.625) ≈ 0.9× body, 0.079 ≈ 1.4× body on the hover
 * re-cohere: a warm density you read INSIDE the shard, never a glow. Peak
 * channel 0.5·0.246 = 0.12 — far under the bloom threshold at any phase.
 *
 * ROUND 8-F — UNCHANGED at 0.5, but it is the one term the matte cut makes
 * RELATIVELY STRONGER: the ember is added AFTER `uBodyDarken`, so BODY_DARKEN
 * 0.5 → 0.30 leaves its absolute value alone while the body around it falls.
 * Ratios go 0.9× → **1.25× body** at rest gap and 1.4× → **2.0×** on the hover
 * re-cohere. That is desirable (a warm density is easier to read inside a
 * darker shard) and it is still absolutely sub-bloom — peak channel 0.12
 * against the ≈1.0 threshold — so it is left alone deliberately, not by
 * omission. Cut toward 0.35 only if the broken cluster starts reading as a
 * lantern rather than a stone with something alive in it. */
export const EMBER_GAIN = 0.5;
/** How far the k=0 refracted direction pushes the ember sample point into the
 * body (crystal units) — the "inside, not painted on" parallax. */
export const EMBER_DEPTH = 0.35;
/** Blob radii (crystal units): center ellipsoid + the two shard-riders. */
export const EMBER_R0 = 0.55;
export const EMBER_R1 = 0.32;
/** Which shards the two small blobs ride (indices into shardCentrs — 0/1 are
 * the two LARGE bodies of SHARD_SIZES; both < SHARD_COUNT_LITE).
 * ROUND 8-H: still correct on the authored partition — crystalBuild reads the
 * GLB's pieces in volume-descending order, where 0/1 carry **46.06 % + 30.40 %
 * of the slab's volume**. Blob placement re-checked (CHECK, correcting the
 * first pass, which compared `centr` to the piece's VERTEX MEAN and concluded
 * the blob was off by up to 0.234): `_CENTR` is the piece's exact VOLUME
 * centroid — ∫p dV / ∫dV integrated per piece off the shipped file agrees to
 * float precision on all eight — and the blob sits at centr·(1 + gap + drift),
 * which is exactly where the vertex path puts that centroid. The offset is
 * ZERO, so the gaussian peaks dead centre of the piece: the "inside the shard,
 * not painted on" read is stronger here than on the procedural cluster, not
 * weaker. */
export const EMBER_SHARDS: readonly [number, number] = [0, 1];
/** Gap → dimming: env = 1/(1 + gap·this). Exploded wide = dim ember, hover
 * re-cohere (gap→0) = brightest — "something still alive inside". */
export const EMBER_GAP_DIM = 0.6;
/** Slow two-sine flicker amplitude around 1.0 (life at rest). */
export const EMBER_FLICKER = 0.15;

// --- §B-b — wet-ice ripple (procedural normal band, full tier only) ---------
/**
 * Ripple carrier frequency over vLocal — the RELIEF band.
 *
 * ROUND 8-E §A2/§D1 (band separation, priority 2 — promoted ABOVE the Blender
 * silhouette because it is five constants and no new code). igloo's normal
 * maps carry their dominant energy at an 8–16 px period over ~456 texels per
 * object unit ⇒ **28–57 cycles / unit**, at 20–33° RMS tilt. Ours ran 8
 * cycles/unit at ~44° — one visible ripple every ~31 screen px and twice too
 * steep: we built a *rippled* stone, not a *wet* one.
 *
 * 8 → 26 (the doc's 24–30 window). At CRYSTAL_SCALE 0.17 the stone spans
 * ~250 screen px per crystal unit, so 26 puts one cycle every ~9.6 px — a
 * shimmer near the resolution limit, which is exactly what reads as WET.
 *
 * ALIASING WALL — do not exceed ~30. igloo gets away with 57 because a
 * mip-mapped normal map filters itself; an analytic sine does not. This is
 * the one place where "match the measurement exactly" is the wrong
 * instruction (doc §D1).
 *
 * ═══ ROUND 8-I — 26 → **12**. THE WALL WAS ALREADY BREACHED; THE 250 px/unit
 * ABOVE WAS NEVER MEASURED. ═══
 *
 * Live: every plane of the stone carried a checkerboard/corduroy. Proven not to
 * be the mark (survives `uMarkGain = 0`), and dropping uRippleAmp cleaned it
 * completely — so it is this carrier, aliasing. The size arithmetic, done
 * properly this time:
 *   px per crystal unit = rect.h · CRYSTAL_SCALE · scaleMul   (CrystalCluster
 *   L667 — the group's world scale is rect.h·k·CRYSTAL_SCALE·scaleMul and k is
 *   world-units-per-pixel, so k cancels and the on-screen size is pure CSS px).
 *   The 8-E entry implies rect.h·scaleMul = 1 470 px. The MEASURED live band is
 *   **~725 px** at scaleMul 1.0 (= (0.8 + 0.2·reveal)·(1 − 0.03·vel), i.e. 1.0
 *   at rest and fully revealed) ⇒ **123.25 px/unit**, half the assumption.
 *   ⇒ at 26: 123.25/26     = **4.74 px/cycle**  (train 1)
 *   ⇒ at 26: 123.25/29.9   = **4.12 px/cycle**  (train 2, ×RIPPLE_F2 1.15)
 * 4.1 px/cycle is two samples per cycle at DPR 1 (tierStore dprMin = 1, and
 * AdaptiveResolution sits there on any GPU under pressure): Nyquist itself. The
 * round-8-E check predicted this number — "a short band could halve px/unit →
 * ~4.2 px/cycle for train 2" — and it is exactly what shipped.
 * WHY IT ONLY APPEARED NOW: the round-8-H authored slab. On the procedural
 * potato, curvature swept the screen-space frequency continuously and the
 * aliasing read as noise; on 34 planar patches the normal is CONSTANT across a
 * plane, so two crossed sine trains project to a perfectly regular lattice —
 * a checkerboard, by construction, not by chance.
 * THE NEW VALUE. Gate: ≳8 screen px per cycle for BOTH trains at the real band
 *   size ⇒ F ≤ rect.h·CRYSTAL_SCALE / (8·RIPPLE_F2) = 123.25/9.2 = **13.4**.
 *   12 delivers **10.27 px/cycle** (train 1) and **8.93** (train 2) with ~12%
 *   margin on the gate. Fixed at the frequency, not by hiding it in the
 *   amplitude — RIPPLE_AMP is re-derived to hold the same 25° tilt.
 * BAND-HEIGHT FLOOR (the size dependency, stated so it is never implicit
 *   again): train 2 stays ≥ 8 px/cycle while `rect.h ≥ 54.12·F`, i.e. **≥ 649
 *   px at F = 12**. Under a fast scroll-in (reveal 0.0 ⇒ scaleMul 0.8) the same
 *   floor rises to ~811 px, a transient while the stone is still fading in.
 *   Below that the fix is to lower F further, in this ratio.
 * LITE / MOBILE: not applicable by construction — the whole ripple branch is
 *   `if (!lite)` in crystalBuild, so the compact tier never compiles a carrier
 *   to alias. The far-fade does not shrink the stone either (camera-locked
 *   uniform scale; only scaleMul moves it, ≤20%).
 * ⚠ THE CEILING IS NOT A CONSTANT — it is `band height ÷ 9.2`. Any future
 *   re-tune of CRYSTAL_SCALE or of the section band height moves it. ═══
 */
export const RIPPLE_FREQ = 12.0;
/** Normal-perturbation amplitude (uRippleAmp). ROUND 8-E: 0.12 → 0.018.
 * The perturbation is N + gradT·amp with |gradT| ∝ frequency, so holding a
 * tilt while tripling the frequency needs amp ÷ 3 — and the target tilt drops
 * too (44° → ~25°, igloo's measured 20–33°): amp = tan 25° / (1.01·F) =
 * 0.4663 / 26.26 ≈ 0.018. 0 = off.
 *
 * ROUND 8-I — RE-DERIVED, NOT RE-TUNED: 0.018 → **0.0385**. The carrier drops
 * 26 → 12 to stop aliasing, and |gradT| ∝ F, so holding the DELIVERED tilt
 * needs amp × 26/12: amp = tan 25° / (1.01 · 12) = 0.46631 / 12.12 =
 * **0.0385** ⇒ atan(1.01 · 12 · 0.0385) = **25.0°**, igloo's band (20–33°),
 * unchanged from what 8-E/8-F delivered. This is why the value table does not
 * move: the stone keeps exactly the same surface tilt, it just spends it at
 * half the screen frequency. (Relation checked against the pre-8-E state:
 * F 8 · amp 0.12 ⇒ atan(0.9696) = 44.1°, which is the "~44°" the 8-E entry
 * measured. The 1.01 is the RMS tangential-gradient factor of the two crossed
 * trains.)
 *
 * ⚠ SANITY BOUND, stated because it is the one number here NOT covered by the
 * live pass. What was verified live is that amp **0.004 at F 26** was clean —
 * a 6.0° tilt. The artifact scales with the per-pixel normal step
 * (tan θ · 2π/px-per-cycle), so on that metric:
 *   F 26 / amp 0.018 (moiréd)      0.4663 × 1.325 = **0.618**
 *   F 12 / amp 0.0385 (SHIPPED)    0.4663 × 0.612 = **0.285**   ← 54% below it
 *   F 26 / amp 0.004 (live-clean)  0.1050 × 1.325 = **0.139**
 * i.e. the shipped setting sits between the two, 2.05× the proven-clean point
 * and less than half the artifact point, with the sampling itself fixed (10.3
 * px/cycle vs 4.7). If any corduroy survives the browser pass, this uniform is
 * on the dev handle and two values are pre-derived: **0.0188** reproduces the
 * live-clean per-pixel step exactly (12.8° tilt) and **0.030** lands on igloo's
 * LOW edge (20°). Do not go back up on the frequency to get relief. */
export const RIPPLE_AMP = 0.0385;
/** vnoise3 phase-warp of the first wave train (breaks the straight rulings).
 * ROUND 8-I — unchanged and re-checked, because on the authored slab's flat
 * planes this is the ONLY thing standing between the carrier and a machined
 * grating. Its authority is measured in PIXELS, and the retune helps it: the
 * warp wanders the rulings by ±(RIPPLE_WARP/2π) = ±0.24 cycles, which was
 * ±1.1 px at F 26 and is **±2.5 px at F 12** — the same wander, now visible.
 * Train 2 still carries no warp (a fixed +2.7 phase), which is what makes the
 * pair read as a crossed weave rather than as noise. */
export const RIPPLE_WARP = 1.5;
/** ROUND 8-E — the warp NOISE frequency, previously derived as
 * RIPPLE_FREQ·0.6 and therefore dragged from 4.8 to 15.6 by the carrier
 * retune. Decoupled and frozen at its historic value: the phase warp belongs
 * in the FORM band (it makes the wave trains wander), not on top of the
 * carrier — at 15.6 it turned the shimmer into high-frequency chaos.
 * ROUND 8-I — the decoupling pays off again, in the other direction: at the
 * new carrier the warp sits **2.5× below it** (12 / 4.8), between the historic
 * 1.67× and 8-E's 5.4×, so it still reads as a wander of the rulings and not as
 * a third train. Nothing to change; it is only ever wrong when it is derived. */
export const RIPPLE_WARP_FREQ = 4.8;
/** Two fixed skew directions (normalized at build) — the crossed wave trains. */
export const RIPPLE_DIR1: [number, number, number] = [0.81, 0.33, 0.48];
export const RIPPLE_DIR2: [number, number, number] = [-0.29, 0.77, -0.56];
/** Second train: frequency ratio + amplitude (round 7 spec: ×1.7, ×0.6).
 * ROUND 8-E: 1.7 → 1.15 — the ALIASING WALL guard. At the new carrier the old
 * ratio would put train 2 at 44 cycles/unit (5.7 px/cycle: crawl + shimmer);
 * 1.15 lands it at 29.9, just inside the ~30 ceiling.
 *
 * ROUND 8-I — RE-CHECKED AGAINST THE REAL PIXEL GRID, KEPT AT 1.15. This ratio
 * is the binding train, so the round-8-I frequency gate was solved on IT, not
 * on the carrier: F ≤ px-per-unit / (8·this). At the measured 123.25 px/unit
 * that is F ≤ 13.4, hence RIPPLE_FREQ 12 and a delivered **13.8 cycles/unit ⇒
 * 8.93 px/cycle** for this train (it was 29.9 ⇒ 4.12 px/cycle, i.e. AT Nyquist
 * — the round-8-E "just inside the ~30 ceiling" was measured against a band
 * twice the real size). Raising this ratio now costs frequency headroom
 * one-for-one: 1.3 would take train 2 to 15.6 cycles/unit ⇒ 7.9 px/cycle,
 * through the gate. The smallest on-screen size that still clears it is
 * rect.h ≥ 8·this·F/CRYSTAL_SCALE = 649 px (see RIPPLE_FREQ); lite/mobile never
 * compile the branch at all. */
export const RIPPLE_F2 = 1.15;
export const RIPPLE_A2 = 0.6;

// --- Rollout item 4 — warm glint lobe (§A3 mechanism twin, full tier) -------
/** View-space direction of the warm env patch — deliberately far from
 * FACET_KEY_DIR so the amber flash fires at DIFFERENT tumble angles. */
export const WARM_DIR: [number, number, number] = [-0.58, 0.18, 0.62];
/** Desaturated amber (#886a3d family — the sanctioned warm allowance). */
export const WARM_COLOR = "#886a3d";
/** Narrow gate: pow(max(dot(Nf, WARM_DIR), 0), this) — spec verbatim 24. */
export const WARM_POW = 24.0;
/** Warm gain (uWarmGain; spec ≤ 0.25) — sub-bloom at any angle. */
export const WARM_GAIN = 0.25;

// --- §B-c — plexus (HEALTHY only, full tier; restraint: broken already
// carries shards + chips + the fracture field — a second net there muds).
// Igloo's sF/ZL/$L construction scaled to 12 points; all in crystal units. --
export const PLEXUS_POINTS = 12;
/** Cylinder radius ≈ 0.9 × crystal bound (~1.6 units).
 * ROUND 8-H — re-checked, deliberately UNCHANGED. The "crystal bound" this was
 * authored against is the Y half-height 1.66, which the authored slab
 * reproduces EXACTLY by construction (bbox height 3.32 was chosen to preserve
 * CRYSTAL_SCALE's on-screen size), so the intended 0.87× relationship still
 * holds. The slab is 15 % wider in x (half-width 1.205 → 1.3945) and 6 % in z,
 * so orbit points on the jittered inner radius (1.45 × [0.8,1] = 1.16) now
 * pass closer to the silhouette in x — but PLEXUS_MASK_IN 1.1 already fades
 * those segments to nearly nothing (smoothstep(1.1, 1.9, 1.16) ≈ 0.02), which
 * is exactly the case the radial mask exists for. Nothing to retune. */
export const PLEXUS_RADIUS = 1.45;
/** Per-point radius jitter: r × [1−this, 1] (igloo ×[0.8, 1]). */
export const PLEXUS_RADIUS_JIT = 0.2;
/** Vertical treadmill span (wrap into ±half). */
export const PLEXUS_TREADMILL = 3.0;
/** Orbit rate: (rand − .5)·this rad/s (igloo verbatim .5). */
export const PLEXUS_ORBIT = 0.5;
/** xz wobble: ±this·sin(t·0.5 + seed) (igloo verbatim .1). */
export const PLEXUS_WOBBLE = 0.1;
/** Climb rate: rand·this /s, treadmill-wrapped (igloo verbatim .25). */
export const PLEXUS_CLIMB = 0.25;
/** Connection rules (igloo: dist < 3, SHUFFLED candidates, max 3/point,
 * 0.35 s linear connect/disconnect tweens). */
export const PLEXUS_CONNECT_DIST = 3.0;
export const PLEXUS_BREAK_DIST = 3.2;
export const PLEXUS_MAX_PER_POINT = 3;
export const PLEXUS_MAX_LINES = 24;
export const PLEXUS_TWEEN = 0.35;
/** Connection eligibility: |treadmill y| < this (igloo 1.125) + a short
 * block after a wrap (igloo's not-just-wrapped rule). */
export const PLEXUS_Y_GATE = 1.125;
export const PLEXUS_WRAP_BLOCK = 0.3;
/** Scroll gate: _canConnect only while |a| < this (igloo |r|<1.25 ≈ ±0.30
 * viewport) — the net dissolves itself between sections via the tweens. */
export const PLEXUS_CONNECT_WINDOW = 0.3;
/** White-cyan linework (palette contract) + alpha ceilings. Igloo's additive
 * black-mask trick is replaced by the SAME masks driving ALPHA (transparent
 * canvas — honest fade over any DOM). */
export const PLEXUS_COLOR = "#D8F4FF";
export const PLEXUS_LINE_ALPHA = 0.5;
export const PLEXUS_CROSS_ALPHA = 0.85;
/** Plus-sign marker arm half-length (igloo point sprite size .1). Igloo's
 * screen-facing POINT sprites don't exist on WebGPU (no point size in WGSL) —
 * the markers are 2-segment crosses in the camera-locked group frame, same
 * read, one draw call. */
export const PLEXUS_CROSS_SIZE = 0.1;
/** Radial fade — segments near the crystal body dissolve (igloo's
 * mix-to-black + additive; here the same smoothstep drives alpha). */
export const PLEXUS_MASK_IN = 1.1;
export const PLEXUS_MASK_OUT = 1.9;
/** Broken-dash mask frequency: smoothstep(.4,.5, sinenoise(pos·this)). */
export const PLEXUS_DASH_FREQ = 10.1;

// --- §B-d — callout gating windows (staggered arrive/leave) -----------------
/**
 * Per-callout visibility window over the SAME centering scalar `a` the tumble
 * uses — visible while a ∈ (min, max). SIGN NOTE: our `a` is positive while
 * the band is BELOW viewport center (approaching) and negative once passed —
 * the OPPOSITE of igloo's r — so the spec's widened igloo windows (r-space
 * (−0.55,+0.25) / (−0.30,+0.45) / (−0.45,+0.25)) are sign-flipped here to
 * keep igloo's temporal asymmetry (long approach lead, short exit tail).
 * Start values; tune by feel via the dev handle (`feel.visWindows`).
 */
export const CALLOUT_VIS_WINDOWS: readonly [number, number][] = [
  [-0.25, 0.55],
  [-0.45, 0.3],
  [-0.25, 0.45],
];
/** Asymmetric damp: reveal ~0.4 s (λ 8), hide ~0.2 s (λ 16) — igloo's
 * 0.4 s in / 0.2 s out, done driver-side (no CSS transitions to fight). */
export const CALLOUT_VIS_IN_LAMBDA = 8;
export const CALLOUT_VIS_OUT_LAMBDA = 16;
/** Write-on-change threshold for the --callout-N-vis var (opacity units). */
export const CALLOUT_VIS_EPS = 0.015;

// --- §B-f — scroll feel (no-hijack transfers) -------------------------------
/** Settle deadzone (viewport fractions): a′ = sign(a)·max(|a|−DZ,0)/(1−DZ)
 * feeds the tumble, so the crystal reads "settled upright" through a window
 * around center — the native-scroll twin of igloo's autoCenter outcome. */
export const TUMBLE_DEADZONE = 0.08;
/** |lenis velocity| mapping to full strength — the PostFXNodes velNorm scale
 * (its default 50), so the two speed-compressions read as one system. */
export const CRYSTAL_VEL_NORM = 50;
/** Group scale × (1 − this·vel) — the camera-write-free twin of igloo's
 * fov = 45 − 5·velocity (SignatureLine owns the camera; never write it). */
export const CRYSTAL_VEL_SCALE_K = 0.03;
/** Velocity damp λ (rising/falling — the PostFXNodes 6/3 grammar). */
export const CRYSTAL_VEL_LAMBDA_UP = 6;
export const CRYSTAL_VEL_LAMBDA_DOWN = 3;

// === ROUND 8-E — THE STONE'S VALUE WORLD ====================================
// research/2026-08-22-round8-stone-source-anatomy.md, Part B + §D3.
// All values below are LIVE-TUNABLE from the dev handle
// (`__sersanCrystal_<anchor>.feel` for the JS-side geometry knobs,
// `.uniforms` for the shader-side ones). The doc is explicit that the targets
// are DERIVED, not tuned — expect the owner to move them.

// --- §B4.2 part 1 — THE FOG VOLUME (crystalFog.ts) --------------------------
/**
 * Why a fog at all (the arithmetic, not the taste): ice is TRANSMISSIVE, so
 * its body value is (backdrop value) × (losses < 1). Against a near-black
 * page the body can only ever be ≤ near-black, and the only way to brighten
 * it is an ADDITIVE term — which on a dark body is a glow BY DEFINITION, i.e.
 * the exact failure we are escaping. To read "dense" a solid must be
 * measurably DARKER than its surround across most of its silhouette, and
 * there is no room below lumLin 0.0069. So the stone needs a local light
 * world to be darker than. That is the whole fix.
 *
 * SIZED FOR SERSAN, NOT COPIED: igloo's `k3` fog sits at lumLin 0.366 — a
 * light grey-blue page. We take the RELATIONSHIPS at one fifth the absolute
 * level: fog core ≈ 0.07 lumLin (≈10× the page). Sanity check from round 7-3
 * §B.5: the DOM `section-accent-tint` cores just deleted measured L ≈ 0.128
 * blended — **this fog is DIMMER than the washes the owner had removed**. It
 * is not a return to page-blocks: same energy, world-scoped, in the right
 * shape, in the right place, with a falloff that reaches exactly 0 inside its
 * own quad (round 7-3 §A.6 hygiene rule — no rectangles, no visible edges).
 */
/** Navy-tinted luminous air. Rec709 LINEAR luminance 0.066, B/R ≈ 5.7 —
 * unmistakably navy, no violet (logo-variant palette contract). */
export const CRYSTAL_FOG_COLOR = "#2E4A6E";
/** Multiplier on the fog colour (uFogGain). Composited peak luminance =
 * lum(colour)·FOG_GAIN·FOG_OPACITY = 0.066·1.9·0.55 ≈ 0.069 ≈ the 0.07
 * target. Split into gain × opacity on purpose: gain is "how much light",
 * opacity is "how much of the page it occludes" — the fog stays a
 * TRANSLUCENT volume (45 % of the page still reads through its core) instead
 * of a paint-over. */
export const FOG_GAIN = 1.9;
/** Peak alpha at the fog core, before the reveal ramp. */
export const FOG_OPACITY = 0.55;
/**
 * ⚠ ACCESSIBILITY — HARD GATE (doc §B4.3). `--ink-mute` (#8A94A6, rel-lum
 * 0.2934) over the fog CORE (composited L 0.0721) is **2.8:1 — WCAG AA
 * FAIL**. The fog therefore must not sit under the copy column. This constant
 * is the multiplier on the crystal's OWN distance from the band centre-line
 * (|CRYSTAL_POS[mode].x| of the rect width) used as the fog's INWARD x
 * radius, so at 1.0 the falloff reaches exactly 0 AT the centre-line BY
 * CONSTRUCTION, for both modes and every viewport width.
 *
 * RE-DERIVED FROM THE DOM (the round-8 doc's "83–167 px of clearance" does
 * NOT survive measurement — do not trust it, this does): the
 * `[data-lattice-anchor]` band is full-bleed, so rect.w = viewport width and
 * its centre IS the viewport centre. The ledger/production body copy is
 * `max-w-[34em]` left-aligned inside `container-px` (padding = --margin 10rem
 * ≥1280, max-width 1600) at `clamp(0.95rem, 1.05vw, 1.15rem)`. Its right
 * bound vs the centre-line: **−37 px at 1280** (it CROSSES), +6 px at 1366,
 * +43 px at 1440, +55 px at 1500, +69 px at 1600, +23 px at 1728, +14 px at
 * 1920 and above. So the copy is NOT always left of the centre-line and the
 * gate is not a geometric no-overlap — it is a VALUE gate, and it holds with
 * a wide margin:
 *   worst case 1280 / broken, copy edge 37 px past the centre → local
 *   x −0.471 → compressed r 0.831 → alpha 0.017 → composited L 0.0089 →
 *   **5.8:1** (vs 6.0:1 on the bare page). AA breaks only above alpha 0.164,
 *   i.e. 9.6× more fog than the worst pixel any copy ever sees.
 * Lower this below 1.0 to buy geometric clearance too. Above 1.0 would break
 * the gate (the asymmetry saturates at SYMMETRIC and alpha under the 1280
 * copy edge jumps to 0.24, 1.5× the AA break point), so the driver CLAMPS it
 * to [0,1] — the constraint is enforced, not merely written here. If the copy
 * measure, the gutter or FOG_GAIN/FOG_OPACITY move, re-run this derivation:
 * the 9.6× headroom is what makes 1.0 safe, not the shape.
 *
 * ⚠ NOTE, NOT A FIX (owner call): the ghost callouts inside the band
 * (`.eyebrow`, 10 px, `text-ink-mute/80`) are positioned ON the crystal, i.e.
 * on the fog core — their contrast falls from ~6:1 to ~3:1. They live inside
 * the `aria-hidden` decorative band and every string is duplicated verbatim
 * in the ledger row above them, so this is incidental text, not content. It
 * is recorded here rather than fixed because the section files are frozen.
 */
export const FOG_CLEAR = 1.0;
/** OUTWARD x radius, a fraction of the rect WIDTH (not half-width), away from
 * the type column. The quad's right bound is 0.30 + CRYSTAL_POS.x (0.17 /
 * 0.22) = 0.47 / 0.52 of the width from centre, against a 0.50 viewport
 * half-width — so on `healthy` the geometry's last 0.02·w is off-screen. The
 * hygiene rule (a) still holds on the VISIBLE output: alpha at the screen
 * edge is 0.0015, under the shader's 0.002 Discard floor, so the last painted
 * fog pixel sits at 0.4978·w from centre — 0.0022·w (≈3 px at 1280, 4 px at
 * 1920) INSIDE the viewport. Raising this, FOG_FALLOFF or FOG_OPACITY without
 * re-checking that margin would terminate the falloff on the viewport edge —
 * a straight vertical cut, the "vecchi blocchi pagina" failure. */
export const FOG_RADIUS_OUT = 0.3;
/** Y radius (fraction of the rect height). 0.46 + |CRYSTAL_POS.y| (0.05 /
 * 0.06) ≈ 0.51–0.52, i.e. the quad's zero-alpha bound lands essentially ON
 * the band bounds: nothing bleeds a visible value into the chapter block
 * above (whose right cell carries `--ink-mute` copy) or the next section. */
export const FOG_RADIUS_Y = 0.46;
/** Exponent on the `smoothstep(1,0,r)` radial falloff. The round-7-3 §B.4
 * spec names `smoothstep(1,0,r)²`; at 2.0 the mass concentrates inside
 * r < 0.4 and the stone (which spans out to r ≈ 0.7) sits almost entirely on
 * the bright core with nothing left over for a surround. 1.35 spreads value
 * across the footprint so the stone's mid-body sits on the core (darker than
 * its surround, igloo's 0.79 ratio) while its extremities cross onto the dim
 * tail (brighter than its surround) — igloo's own read: "across the frame it
 * swings from lighter-than to darker-than, which is why it reads as MASS"
 * (§B1). Set 2.0 to restore the spec-verbatim curve. */
export const FOG_FALLOFF = 1.35;
/** Master coupling scalar (dev handle `feel.fogEnergy`). ONE knob drives BOTH
 * halves — the fog quad's opacity and the crystal's BACKDROP_GAIN — so body
 * and surround always track (see BACKDROP_GAIN). 0 = exactly today's look. */
export const FOG_ENERGY = 1.0;

// --- §B4.2 part 2 — BACKDROP_GAIN (the load-bearing half) -------------------
/**
 * The subtlety that sinks a naive implementation: `crystalBuild` does NOT
 * read the scene behind it. The body comes from the procedural `backdrop()`
 * and the crystal composites at CRYSTAL_ALPHA 0.94, so only 6 % of whatever
 * is behind it shows through — **putting a glow behind the crystal does
 * almost nothing to the BODY**. Both halves are required.
 *
 * This gain multiplies `backdrop()`'s NAVY FIELD (not its cyan spots — see
 * BACKDROP_SPOT_GAIN). It is preferred over re-tuning BACKDROP_NAVY/NAVY2
 * because it preserves the authored palette, gives the dev handle one knob,
 * and keeps the coupling explicit. (For reference, the equivalent static
 * palette lift would be `#060D18 → ~#253A57` and `#1C2E4E → ~#6291E6` —
 * visibly off-brand as literals.)
 *
 * 8.0 rather than the doc's derived ≈10 because the doc's figure assumed NO
 * ambient term; the analytic hemisphere (§D3) below now contributes ≈ 0.014
 * lumLin of the body budget. Round-8-E arithmetic: backdrop typical 0.0106 × 8
 * = 0.0848 pre-darken → × BODY_DARKEN 0.5 = 0.0424, + ambient 0.0142 = 0.057
 * body against a 0.072 fog core ⇒ body/surround 0.79 — igloo's ratio (0.794).
 *
 * ═══ ROUND 8-F DECISION — STAYS AT 8.0. The stone gets DARKER, and the 0.79
 * ratio is deliberately abandoned. ═══
 *
 * BODY_DARKEN 0.5 → 0.30 (live-measured) drops the body to 0.0254 + 0.0142 =
 * **0.0396**, i.e. body/fog **0.55**. The doc's §B4.2 coupling rule says the
 * two halves must track — so the question was posed correctly: compensate with
 * this gain (13.3 restores 0.79) or accept a darker stone? ACCEPT. Four
 * reasons, in order of weight:
 *
 *  1. THE RATIO IS NOT THE PERCEPTION AT OUR ABSOLUTE LEVEL. Our fog core is
 *     0.072 against igloo's 0.366 — one fifth, by brand design (§B4.1). In
 *     WCAG form ((L+0.05) quotients — the doc's own convention) igloo's 0.794
 *     ratio buys 0.416/0.341 = **1.22:1** of body-vs-surround separation. The
 *     SAME 0.794 ratio at our level buys only 0.122/0.1066 = **1.14:1**,
 *     because the +0.05 offset dominates down here: copying the ratio delivers
 *     ~64% of igloo's perceived density. To REPRODUCE 1.22:1 at our fog the
 *     body must sit at 0.050, i.e. body/fog **0.694** — already below 0.79.
 *     At 0.0396 we get **1.36:1**, on the dense side of igloo rather than 35%
 *     short of it. That overshoot is precisely what the owner measured as
 *     "markedly closer to igloo".
 *  2. COMPENSATING WOULD UNDO THE MEASUREMENT. G = 13.3 restores the body to
 *     0.0566 — the exact value the live A/B rejected — and re-brightens the
 *     navy FIELD the dispersion bends by 1.67×, i.e. it walks back toward the
 *     lamp read that round 8-E exists to remove.
 *  3. IT WOULD ALSO NARROW THE STONE FURTHER. With the highlights already cut
 *     (SPEC_GAIN/SPARKLE_GAIN), raising the floor back gives a dynamic range of
 *     (0.277+0.05)/(0.0268+0.05) = **4.26:1** versus **4.74:1** for the darker
 *     stone. igloo is 7.9:1, so not compensating is the closer of the two.
 *  4. THE MASS READ SURVIVES AND STRENGTHENS. igloo's §B1 signature is a stone
 *     that swings from darker-than to lighter-than across a varying fog. The
 *     crossover radius (where fog(r) = body, under FOG_FALLOFF 1.35) moves from
 *     r = 0.26 to **r = 0.41** of the fog footprint while the stone still spans
 *     to r ≈ 0.7 — so the swing is intact, and a larger fraction of the
 *     silhouette now does the "denser than its surround" work.
 *
 * Unchanged by this: the fog itself (FOG_GAIN / FOG_OPACITY / FOG_CLEAR), and
 * therefore the entire §B4.3 accessibility derivation under FOG_CLEAR. To
 * revert to the 8-E look it is still one number here (13.3) plus BODY_DARKEN.
 */
export const BACKDROP_GAIN = 8.0;

// --- §B4.2 part 3 — the value CEILING + the bloom whisper -------------------
/**
 * igloo hard-caps every stone pixel: `outgoingLight = clamp(…, 0, 1)`
 * (bundle L38013), which is why its brightest pixel is at most 3.4× its body
 * and its whole stone lives in a 7.9:1 window. We had no ceiling at all.
 *
 * ⚠ OWNER DECISION (doc §B4.2 part 3 leaves it open; taken conservatively
 * here, documented so it can be flipped in one number):
 *   - **1.35 (SHIPPED)** — the site's >1.0 selective-bloom contract is a house
 *     signature (PostFXNodes thresholds Rec709 luminance ≈1.0 on the
 *     post-blend framebuffer, i.e. col×alpha). At 1.35 everything on the
 *     stone is compressed EXCEPT a hairline at extreme grazing
 *     (RIM_EDGE_*), which survives the ceiling at 1.176 col-lum → 1.110
 *     post-blend: a bloom INPUT of ~0.11, a genuine whisper. The ignition
 *     flash saturates against the ceiling exactly as igloo's clamp does.
 *   - **1.0 + RIM_EDGE_GAIN 0 (the igloo-faithful alternative)** — verbatim
 *     igloo: no pinpoint bloom anywhere on the crystal, its glow being a soft
 *     global haze from a 0.2 threshold we do not run. Flip both numbers to
 *     get it; nothing else changes.
 */
export const CRYSTAL_CEIL = 1.35;
/** Where the bloom hairline starts, on f1 = 1 − dot(N,V). 0.90 ⇒ only
 * surfaces within ~5.7° of grazing (on a smooth silhouette that is the outer
 * ~0.5 % of the radius; on our faceted soup it also catches the few facets
 * turned edge-on). Below this the rim is the compressed RIM_BASE band. */
export const RIM_EDGE_START = 0.9;
/** Gain of that hairline, on the same whitened rim colour (linear luminance
 * 0.791). Total at f1 = 1: RIM_BASE·0.791 + this·0.791 = 0.277 + 0.910 =
 * 1.187 col-lum — but the CEILING bites first, and per CHANNEL: the whitened
 * rim is (0.474, 0.864, 1.000), so ×1.5 clips only BLUE (1.50 → 1.35) and the
 * luminance lands at **1.176** (blue is weighted 0.0722, hence the small
 * loss). ×CRYSTAL_ALPHA 0.94 + 6 % of the fog behind = **1.110** post-blend,
 * still over the ≈1.0 threshold with ~0.11 of bloom input. Note the coupling:
 * below CRYSTAL_CEIL 1.296 the ceiling starts clipping GREEN as well, and the
 * hairline falls back through the bloom threshold at **CRYSTAL_CEIL ≈ 1.16**
 * (post-blend 1.005 at 1.16, 0.998 at 1.15). The two constants are one
 * decision; moving either alone can silently delete the whisper.
 * 0 = no crystal bloom at all (the igloo-faithful option).
 *
 * ROUND 8-F — the whisper SURVIVES, verified rather than assumed. None of the
 * four cuts touches this pair: the hairline is `RIM_BASE + RIM_EDGE_GAIN` =
 * 0.35 + 1.15 = 1.50 on the whitened rim colour, whose BLUE channel clips at
 * CRYSTAL_CEIL 1.35 exactly as before, giving the same 1.176 col-lum → 1.110
 * post-blend. The only coupling is second-order and in the SAFE direction: at
 * grazing the body/spec/sparkle terms that stack under the clamp are all
 * smaller now, so slightly less is being thrown away by the ceiling — the
 * clipped result is unchanged, and green (1.296) still sits just under it. */
export const RIM_EDGE_GAIN = 1.15;

// --- §D3 — ANALYTIC AMBIENT HEMISPHERE (priority 4) -------------------------
/**
 * We had NO ambient term: two hard analytic lobes added directly, no Fresnel
 * weighting, no wrap, no floor — hence facets reading binary lit/unlit and a
 * body that could go fully black. igloo's stone is lit by a real IBL whose
 * DOMINANT contribution is a broad cool ambient, not the sun: their env map
 * runs p25 0.272 → p75 0.798 (a ~3× vertical gradient) with 73.7 % of pixels
 * cool (B > 1.1·R) and 8.7 % warm; the ~3411× sun is a small source whose
 * integrated power (≈0.33 sr·radiance) is merely comparable to that base.
 *
 * Encoded here as ~6 ALU with ZERO bindings, zero PMREM, zero repo assets:
 *   ambient(N) = AMBIENT_GAIN · mix(DOWN, UP, N.y·0.5 + 0.5) · tint
 * evaluated on the VIEW-space normal (consistent with FACET_KEY_DIR /
 * FACET_FILL_DIR, which are already view-space-fixed directions).
 *
 * ⚠ TRAP, documented for whoever revisits this (doc §D3 fallback v2): if a
 * texture path is ever taken — a runtime 64×32 equirect DataTexture, the only
 * sane upgrade — the sun texel must be written as **≈53, NOT 3411**. One
 * texel of a 64×32 equirect subtends 6.1e-3 sr against the source's 9.6e-5,
 * so writing the source value would inject ~64× igloo's actual sun energy.
 * That is the classic env-map downsampling trap. We are analytic, so it does
 * not bite today — but it costs +2 fragment bindings if it ever does.
 */
export const AMBIENT_DOWN = 0.272; // measured p25
export const AMBIENT_UP = 0.798; // measured p75
/** Cool tint — linear B/R ≈ 1.22 (measured 1.25 over 73.7 % cool pixels). */
export const AMBIENT_COOL = "#EAF3FF";
/** Warm fraction folded into the tint at build time (measured 8.7 %), using
 * the sanctioned desaturated amber. Zero shader cost — it is a JS mix. */
export const AMBIENT_WARM_MIX = 0.087;
/**
 * Master gain (uAmbGain). Scales igloo's ABSOLUTE env radiance into our
 * one-fifth-level world AND into a shader that has no diffuse albedo to
 * multiply it by. 0.032 gives: floor (N.y = −1) 0.0072 lumLin — the body can
 * no longer go black; typical (N.y ≈ 0) 0.0142; ceiling (N.y = +1) 0.0211.
 *
 * ROUND 8-F re-derivation (BODY_DARKEN 0.5 → 0.30, this constant UNCHANGED):
 * the transmission half drops 0.0424 → 0.0254, so the body is now **0.0396
 * typical / 0.0190 darkest** (8-E: 0.057 / 0.027; doc §B4.1 targets 0.055 /
 * ≈0.02). Note what this term is now doing: it supplies **36%** of the typical
 * body (was 25%) and **38%** of the darkest, so the analytic hemisphere — not
 * the transmission — is what keeps the matte stone off black. Do not cut it
 * while chasing "matte"; below ≈0.02 the facets go binary lit/unlit again,
 * which is the §D3 defect this term exists to fix.
 */
export const AMBIENT_GAIN = 0.032;

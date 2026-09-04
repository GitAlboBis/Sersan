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
 *
 * ROUND 10-A — THE STONE COMES DOWN (owner, live: "the crystal is too big").
 * CRYSTAL_SCALE 0.17 → **0.115**, i.e. the authored 3.32-unit slab goes from
 * 56.4 % of band height to **38.2 %** — a linear ratio ρ = 0.115/0.17 =
 * **0.67647**, area 0.458×. Full arithmetic at CRYSTAL_SCALE. This entry is the
 * INDEX of everything that had been fitted against the old size; each constant
 * carries its own re-derivation.
 *
 *  1. SCALE-INVARIANT BY CONSTRUCTION — nothing to do, verified not assumed:
 *     · the silhouette proportions (.84/1/.65, igloo cube1's) — the group scale
 *       is UNIFORM and CRYSTAL_SQUASH is still fallback-only (crystalBuild
 *       L830 sits inside the procedural branch), so no facet normal shears;
 *     · THE ENTIRE VALUE WORLD (rounds 8-E/8-F/8-H/8-I). Every shading term is
 *       per-fragment and angle-based — lobes, fresnel/rim, ambient hemisphere,
 *       body darken, ceiling. A uniform scale changes no dot product, so the
 *       lumLin table, the >1.0 bloom contract and MARK_GAIN's three checks all
 *       stand verbatim. (The stone emits LESS total light, not more: same value
 *       per pixel over 0.458× the area.)
 *     · the plexus (all crystal-local, §B-c), the ember SDF, the fracture
 *       nearest-neighbour separation, the frost ZONING count across the stone.
 *  2. RE-DERIVED, RATIO PRESERVED — the fog quad radii (FOG_RADIUS_OUT 0.30 →
 *     0.203, FOG_RADIUS_Y 0.46 → 0.311, both ×ρ) so the stone occupies exactly
 *     the same fraction of the fog footprint: the corner radius stays r = 0.731
 *     and the whole §B4.2 crossover argument is untouched. A11Y IMPROVES from a
 *     value gate to a GEOMETRIC one on `healthy` — see FOG_CLEAR.
 *  3. RE-DERIVED AGAINST THE PIXEL GRID — every crystal-local SPATIAL frequency
 *     is 1/ρ = 1.48× finer on screen at the same constant. Held at their fitted
 *     ON-SCREEN size: RIPPLE_FREQ 12 → **8** (with RIPPLE_AMP 0.0385 → 0.0577
 *     re-derived to keep igloo's 25° delivered tilt) and SPARKLE_FREQ 15 →
 *     **10.15** (hash cells stay 8.2 screen px, not 5.6). FROST_FREQ is left
 *     alone — at ~93 px per cycle it is zoning, nowhere near the grid.
 *     ⚠ AND A UNIT CORRECTION THE 8-I ENTRY GOT WRONG — see RIPPLE_FREQ: the
 *     shader is `sin(x·F)`, so the period is 2π/F units, and every historic
 *     "px/cycle" figure in this file was 2π× too small. The RELATIONSHIP the
 *     8-I round fitted (screen period, moiré at ~30 px, clean at ~65 px) is
 *     unaffected; only the labels were.
 *  4. RE-FITTED, GEOMETRY MOVED — the callouts. `CALLOUT_LABEL_OFFSET_PX = 47`
 *     is a FIXED DOM measurement (label line + gap + leader) that does NOT
 *     shrink with the stone, so a 0.68× anchor field lets the ±47 px label
 *     offsets dominate: the shipped BROKEN_CALLOUT_SHARDS [1,2,5] INVERTED the
 *     vertical order of callouts 1 and 2 and overlapped their label blocks.
 *     → BROKEN_CALLOUT_SHARDS [1,2,5] → **[1,6,3]**, HEALTHY_CALLOUT_ANCHORS[2]
 *     re-cast to the lower-right flank. Both measured off the shipped GLBs with
 *     the driver's own projection maths, swept over `a`, the wobble phase, 8
 *     viewports × 7 band heights × EN/IT. Numbers on each constant.
 *     ⚠ BONUS FINDING: the shipped [1,2,5] ALREADY collided in Italian at band
 *     heights ≲ 790 px (re-measured in the check round; the first pass said
 *     725) — the round-8-H fit was computed at a 900 px band and in English
 *     only. This round fixes a latent bug, it does not introduce one.
 *  5. VERIFIED, NOT CHANGED — the mark. It is 60 % of the silhouette BY
 *     CONSTRUCTION, so it shrinks with it: 246 → **167 screen px** at the
 *     8-I-measured 725 px band. Every legibility relationship in the round-9
 *     mechanism is expressed in uv and is therefore scale-free (swim ≤ 0.0809
 *     RT-uv reachable, mip footprint 0.0044 RT-uv — ⚠ read MARK_WORLD_HALF's
 *     check 2 for the RT-uv vs mark-height unit fix; the first pass of this
 *     round mixed them and over-reported the p5 margin by 1.15×); the RT goes
 *     from 1.81× to 2.67× oversampled. Measured on the shipped
 *     `sersan-mark.glb`: it is NOT a hairline — 33 % ink coverage, local
 *     stroke thickness p5 = 41 texels and p50 = 90 texels (0.0801 / 0.1758
 *     RT-uv), i.e. the MEDIAN stroke is 2.2× the worst reachable refractive
 *     displacement (p5 is 0.99× it, so the thinnest twentieth is displaced by
 *     about its own width at the grazing maximum), and 15.4 screen px wide at
 *     the new size. MARK_WORLD_HALF stays 1.15.
 */
import type { LatticeMode } from "./neuralLatticeConfig";

// --- Placement (fractions of the anchor rect, from center; + y = up) --------
/** Per-mode crystal center in the band. Broken sits between the fracture
 * (x 55%) and the debris field; healthy floats over the rising weave between
 * ring 2 and ring 3 (rings at 40/62/84%). Both clear the left type column.
 * ROUND 10-A — unchanged and now clearing it by MORE: at CRYSTAL_SCALE 0.115
 * the healthy stone's inward edge sits at 0.22·w − 1.3945·0.115·rect.h from the
 * centre-line (204 px right of it at 1440×725, was 151 px), and the fog quad
 * that used to reach the centre-line no longer does — see FOG_CLEAR. */
export const CRYSTAL_POS: Record<LatticeMode, [number, number]> = {
  broken: [0.17, -0.05],
  healthy: [0.22, 0.06],
};
/**
 * Uniform group scale = rect.h·k·this·scaleMul (CrystalCluster L487), and the
 * px-per-crystal-unit twin the callout projection rides is rect.h·this·scaleMul
 * (L677 — `k` is world-units-per-pixel, so it cancels and the on-screen size is
 * pure CSS px).
 *
 * ═══ ROUND 10-A — 0.17 → **0.115**. THE OWNER: "the crystal is too big." ═══
 *
 * THE ARITHMETIC. The shipped mesh is the authored slab, bbox **2.789 × 3.320 ×
 * 2.158** (re-measured off `public/models/crystal-intact.glb` this round, not
 * quoted: half-extents 1.3945 / 1.6600 / 1.0790, 450 tris, 34 planar patches —
 * exactly the round-8-H log). Its on-screen height is
 *
 *     slabPx = 3.32 · rect.h · CRYSTAL_SCALE · scaleMul
 *     ⇒ fraction of band height = 3.32 · CRYSTAL_SCALE · scaleMul
 *
 * — note rect.h cancels, so this fraction is the SAME at every viewport and
 * every band height. That is what makes the target a single number:
 *     0.170 → 3.32 · 0.170 = **0.564**  (56.4 % of band height — the complaint)
 *     0.115 → 3.32 · 0.115 = **0.382**  (38.2 %, inside the 0.35–0.40 window)
 * At the arrival end of the ramp (reveal 0 ⇒ scaleMul 0.8) it reads 30.5 %, and
 * at the §B-f velocity floor (scaleMul 0.97) 37.0 %. Linear ratio
 * ρ = 0.115/0.17 = **0.676471**, area **0.4576×**.
 * In pixels at the 8-I LIVE-MEASURED band (rect.h ≈ 725 px, scaleMul 1):
 *     px per crystal unit  123.25 → **83.375**
 *     slab height (3.32 u) 409.2 px → **276.8 px**
 *     slab width  (2.789u) 343.7 px → **232.5 px**
 *     exploded broken cluster (y-extent 4.201 units at the re-levelled gap)
 *                          517.8 px (71.4 % of band) → **350.3 px (48.3 %)**
 * At the round-9 doc's 900 px reference band: 153.0 → **103.5** px/unit, slab
 * 507.9 → **343.6 px**.
 *
 * WHY 0.115 AND NOT THE MIDDLE OF THE WINDOW. Three constraints meet here and
 * 0.115 is the value that satisfies all three rather than the arithmetic mean:
 *   · the owner's read wants a decisive cut — a 32 % linear reduction is one;
 *   · the in-ice mark is 60 % of the silhouette by construction (see
 *     MARK_WORLD_HALF), so the stone's size is the mark's size: 0.115 leaves it
 *     at 167 px with p5 strokes 15.4 px wide, 0.105 would take it to 152 px;
 *   · RIPPLE_FREQ's ceiling is `px-per-unit ÷ 9.2` (the constant is pinned to
 *     the pixel grid, not to the stone), and 0.115 lands the retuned carrier on
 *     a clean **8.0** with 13.3 % of margin — slightly more than the 11.7 % the
 *     8-I fit shipped with.
 *
 * WHAT DOES *NOT* MOVE, verified rather than assumed:
 *   · THE SILHOUETTE. The group scale is UNIFORM (that is the whole reason the
 *     header insists on it), so .84/1/.65 — igloo cube1's proportions, baked
 *     into the GLB — is untouched, and **CRYSTAL_SQUASH is NOT re-applied**:
 *     `displaceAndSquash(…, CRYSTAL_SQUASH, …)` lives inside crystalBuild's
 *     PROCEDURAL branch (L830) and the authored path never reaches it. A
 *     post-hoc anisotropic scale here would shear every facet normal.
 *   · THE VALUE WORLD. Every shading term is per-fragment and angle-based, so a
 *     uniform scale changes no dot product: the 8-F/8-H/8-I lumLin table, the
 *     >1.0 selective-bloom contract and MARK_GAIN's ordering/bloom checks all
 *     hold verbatim. (Total emitted light DROPS with the area — the stone
 *     cannot read "hotter" from this change; only its per-pixel values could do
 *     that, and none of them moved.)
 *     CHECK-ROUND, re-derived rather than accepted, in Rec709 LINEAR weights
 *     (0.2126/0.7152/0.0722): the only thing on the stone that crosses the
 *     ≈1.0 bloom threshold is still the grazing rim hairline, and it crosses by
 *     the same amount — whitened rim (0.474, 0.864, 1.000) × (RIM_BASE 0.35 +
 *     RIM_EDGE_GAIN 1.15) = (0.711, 1.296, 1.500), CRYSTAL_CEIL 1.35 clips BLUE
 *     only ⇒ col-lum **1.176**, × CRYSTAL_ALPHA 0.94 + 6 % of the fog behind ⇒
 *     **1.110** post-blend. Nothing new crosses 1.0 and nothing that crossed
 *     stops crossing; the trigger is `f1 = 1 − dot(N,V)` and the slab's normals
 *     are flat per patch, so it is whole facets that light, not a sub-pixel
 *     ring. The 6 %-of-fog term is preserved specifically because the fog radii
 *     were scaled by the same ρ (r = 0.7314 — see FOG_RADIUS_OUT); had they not
 *     been, THIS is the number that would have moved.
 *     ⚠ THE ONE VALUE-SIDE THING THAT IS NOT PER-PIXEL, recorded because "the
 *     value world is scale-invariant" is otherwise read as absolute: the bloom
 *     is a mip-pyramid over the DRAWING BUFFER, so its kernel is fixed in
 *     screen px while the stone's silhouette shrank by ρ. The halo is therefore
 *     1/ρ = 1.48× wider RELATIVE to the stone than it was. From a whisper-level
 *     0.11 bloom input on a grazing hairline that is not a "lamp" risk, but it
 *     is the one axis on which a smaller stone can read hotter, and it is where
 *     to look first if the live pass says it glows.
 * ROUND 10-A also WIRES THIS TO THE DEV HANDLE (`…feel.scale`), which it was
 * not before — the owner judges this number by eye and had to edit + reload to
 * move it. The driver reads `feelC.scale` in BOTH places (the group's world
 * scale AND the callout projection's px-per-unit twin), so the twin can never
 * desync from the render: `__sersanCrystal_healthy.feel.scale = 0.13`.
 * ⚠ If it is moved live, RIPPLE_FREQ / RIPPLE_AMP / SPARKLE_FREQ do NOT follow
 * (they are baked graph constants) — see the ceiling note on RIPPLE_FREQ.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║ ⚠⚠ PREPARED CHANGE — READ BEFORE THE §problem / §trust SECTIONS GROW.     ║
 * ║ THIS CONSTANT IS A FRACTION OF THE BAND, AND THE BAND IS ABOUT TO TRIPLE. ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * NOT APPLIED — the sections are still 1330 / 1475 px today and the owner has
 * to be able to judge the 0.17 → 0.115 shrink live, at today's size. This block
 * is the answer written down so nobody re-derives it under time pressure.
 *
 * THE COUPLING. `s = rect.h · k · CRYSTAL_SCALE · scaleMul` (CrystalCluster
 * L499) and its projection twin `pxScale = rect.h · CRYSTAL_SCALE · scaleMul`
 * (L702). `rect` is the `[data-lattice-anchor]` box — the ledger rows stack,
 * ~725 px today. The very property this entry celebrates — rect.h CANCELS, so
 * the stone is 3.32·0.115 = **38.2 % of band height at every viewport** — is
 * exactly what detonates: a constant fraction of a band that triples is a stone
 * that triples.
 *     band  725 px (today)  → slab **277 px**  (31 % of a 900 px viewport) ✓
 *     band 1330 px          → slab **508 px**  (56 %)
 *     band 1475 px          → slab **563 px**  (63 %)
 *     band 4392 px (round-11 §problem) → slab **1677 px — 186 % of the
 *       viewport**. The stone would be taller than the screen.
 * (Confirms the round-11 dossier's 1678 px. It is one of three band-keyed
 * constants that detonate; the other two, NEURAL_DEPTH_SCALE_FACTOR and
 * BAND_ASPECT, are not in this file.)
 *
 * THE FIX, one line in each of two places — BOTH must move together or the
 * callout projection detaches from the render (that twin rule is why L499 and
 * L702 read the same `feelC.scale`):
 *     const s       = ih * k * feelC.scale * scaleMul;   // was rect.h * k * …
 *     const pxScale = ih     * feelC.scale * scaleMul;   // was rect.h     * …
 * `ih` is `size.height`, already in scope at both sites. Note the pleasing
 * consequence: `k = WORLD_VIEW_HEIGHT / ih`, so `s` collapses to the CONSTANT
 * `WORLD_VIEW_HEIGHT · scale · scaleMul` = **1.0368 · scaleMul** — the stone
 * becomes a fixed world size, independent of viewport, band and DPR.
 *
 * THE CONSTANT. To reproduce today's approved 276.8 px slab on the repo's
 * reference 1440×900 canvas (the one MARK_THICKNESS and the fog corner-radius
 * derivations are quoted against):
 *     C_vp = CRYSTAL_SCALE · rect.h / ih = 0.115 · 725 / 900 = **0.0926**
 *     ⇒ slab = 3.32 · 0.0926 = **30.8 % of VIEWPORT height**, at every viewport
 *       and every band, forever.
 * If the shrink is re-judged on a different canvas first, re-base with the same
 * formula: ih 768 → 0.1086 · ih 800 → 0.1042 · ih 982 → 0.0849 · ih 1080 →
 * 0.0772. The two pinnings agree only where band/viewport = 725/900 = 0.806.
 *
 * WHAT ELSE MOVES — the audit, so the table is not rediscovered either. "Band"
 * = keyed to rect.h, "width" = keyed to rect.w (the band is FULL-BLEED, so
 * rect.w ≡ viewport width and nothing width-keyed is at risk), "units" =
 * crystal-local and carried by the group's uniform scale.
 *   CRYSTAL_SCALE          band   ✗ 3×  → viewport, C_vp 0.0926 (above)
 *   CRYSTAL_POS.y          band   ✗     → the +0.06 offset goes 44 px → 264 px.
 *                                         Viewport-keyed equivalent 0.0483.
 *                                         (CRYSTAL_POS.x is width-keyed ✓.)
 *   the `a` scalar         band   ✗✗    → `a = (vpTop + rect.h/2 − ih/2)/ih`
 *                                         spans ±0.90 today and ±2.94 at a
 *                                         4392 band, so the tumble runs to
 *                                         **355°** (was 102°) and the stone
 *                                         spins nearly a full turn. It also
 *                                         drags CALLOUT_VIS_WINDOWS and
 *                                         PLEXUS_CONNECT_WINDOW, which are
 *                                         windows ON `a`. This is the worst of
 *                                         the three and needs a decision, not
 *                                         just a constant: either clamp `a` or
 *                                         measure it from the STONE's own
 *                                         viewport-sized window instead of the
 *                                         band centre.
 *   FOG_RADIUS_Y           band   ✗     → 0.311·4392 = a 1366 px world-y
 *                                         radius. Worse, if the stone goes
 *                                         viewport-keyed and this does not, the
 *                                         fog corner radius r collapses 0.614 →
 *                                         0.101 on its y-term and the stone
 *                                         sits entirely on the bright core —
 *                                         the §B4.2 "glowing blob" failure,
 *                                         back. Move it with the stone:
 *                                         **FRY_vp = 0.311·725/900 = 0.2505**,
 *                                         which restores the y-term to 0.6138.
 *   FOG_RADIUS_OUT         width  ✓     → and its x-term of r is preserved
 *                                         automatically, because C_vp·ih ≡
 *                                         CRYSTAL_SCALE·rect.h at the reference
 *                                         (0.3976 either way).
 *   FOG_CLEAR + the a11y   width  ✓     → rxIn = |pos.x|·rect.w. The 0.017·w
 *     geometry                            healthy clearance is untouched.
 *   CALLOUT_LABEL_OFFSET_PX px    ✓     → 47 px is 47 px; `offPct` converts it
 *                                         per band and stays correct.
 *   CALLOUT_LEFT_MIN/MAX   width  ✓
 *   CALLOUT_EDGE_MIN/MAX   band   ~     → still correct as a %, but the guard
 *                                         band in px triples (2…88 % of 4392 =
 *                                         88…3865 px), i.e. it stops being a
 *                                         meaningful guard. Harmless, noted.
 *   BROKEN_CALLOUT_SHARDS  units  ✓✗    → the FIT is px-vs-px (47 px offsets
 *   HEALTHY_CALLOUT_ANCHORS               and ~110 px labels against projected
 *                                         anchor offsets ∝ pxScale). Band-keyed
 *                                         it triples and the labels scatter
 *                                         across 3× the area; VIEWPORT-keyed
 *                                         pxScale is unchanged and this round's
 *                                         whole sweep holds verbatim.
 *   RIPPLE_FREQ / _AMP     px/u   ✓✗    → same story: px-per-unit is
 *   SPARKLE_FREQ                          rect.h·scale = 505 band-keyed (the
 *                                         carrier's screen period triples to
 *                                         196 px — the pre-8-E "rippled stone,
 *                                         not a wet one"), vs ih·C_vp = 83.375
 *                                         viewport-keyed, i.e. IDENTICAL to
 *                                         today. Another reason the viewport
 *                                         re-base is the cheap answer: it is
 *                                         the only one under which none of the
 *                                         baked graph literals need re-tuning.
 *                                         ⚠ One regression to accept: the
 *                                         RIPPLE_F2 gate's floor becomes a
 *                                         VIEWPORT-height floor, ih ≥
 *                                         9.2·8/0.0926 = **794 px**, so a
 *                                         768-tall window sits 3 % through the
 *                                         gate. RIPPLE_FREQ 7.5 clears down to
 *                                         745 px if that ever matters.
 *   PLEXUS_* / MARK_* /    units  ✓     → all crystal-local, children of the
 *   FRACTURE_REST_GAP…                    uniformly-scaled group. They follow
 *                                         the stone whichever pinning wins.
 * RECOMMENDATION: pin to the VIEWPORT. It is one token in two lines, it makes
 * `s` a constant, and it is the only option under which the round-10 callout
 * fit and the three baked frequencies survive the growth untouched. The two
 * items it does NOT solve by itself are `CRYSTAL_POS.y` and the `a` scalar —
 * both need their own call when the redesign lands.
 */
export const CRYSTAL_SCALE = 0.115;

/**
 * ROUND 12 · STAGE 2 — `CRYSTAL_SCALE` AND `FOG_RADIUS_Y` ARE PER-MODE NOW,
 * AND THAT HAD TO HAPPEN BEFORE ANYTHING WAS REBASED.
 *
 * Both were plain scalars shared by `#problem` and `#production` (unlike
 * `CRYSTAL_POS`, which has always been a record). The Stage-2 band pin takes
 * `#problem`'s `bandVh` from 0.8597 to 1.0, i.e. its `rect.h` grows 16.3 %,
 * and `s = rect.h·k·scale` grows with it — so the stone had to be rebased.
 * Rebasing the SCALAR would have shrunk the `#production` stone by the same
 * 16.3 % on a band that never moved. Hence the records: `#production` keeps
 * the shipped number by construction, and a future per-mode value has a home.
 *
 * ⚠ THE REBASE ITSELF IS NOT IN THESE RECORDS, DELIBERATELY. It is a function
 * of the live band pin — `CRYSTAL_BAND_VH_REF / bandVh`, applied in
 * `CrystalCluster`'s driver to `feel.scale` AND `feel.fogRadiusY` in the same
 * expression. Two reasons:
 *   1. It is then exactly a no-op under the ROLLBACK (`bandVh` back to 0.8597
 *      ⇒ factor 1 ⇒ the shipped stone, to the bit) and on any band with no
 *      pin at all (`#production`: no traverse frame, factor 1).
 *   2. `s` and `pxScale` (the callout projection's px-per-unit twin) BOTH read
 *      `feel.scale`, so one factor moves both — which is the coupling the
 *      "PREPARED CHANGE" table says must never be broken. A fog radius that
 *      moves without the stone is §B4.2's "glowing blob" failure.
 */
export const CRYSTAL_SCALE_BY_MODE: Record<LatticeMode, number> = {
  broken: CRYSTAL_SCALE,
  healthy: CRYSTAL_SCALE,
};

/**
 * The band pin `CRYSTAL_SCALE` / `FOG_RADIUS_Y` were measured against — the
 * shipped `traverseConfig.bands.problem.bandVh`, 619/720 on the 1280×720
 * reference. The driver's rebase factor is `this / bandVh`; at 1.0 it is
 * 0.8597, which is exactly the 16.3 % the pin grew by.
 */
export const CRYSTAL_BAND_VH_REF = 0.8597;

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
 *
 * ROUND 10-A — RE-CHECKED AGAINST CRYSTAL_SCALE 0.115, DELIBERATELY UNCHANGED.
 * The quantity this was fitted to (the round-7 exploded envelope, y-extent
 * 4.201) and the read it buys ("nearest-neighbour separation 0.78 units ≈ 28 %
 * of the slab width: fractured, not flung") are both in CRYSTAL UNITS, i.e.
 * they are stone-relative and a uniform scale cannot move them. What moved is
 * the two BOUNDS that fitted it, and both loosened by 1/ρ = 1.48×:
 *   · band overflow — the lowest chip reaches y = −3.04 units = 465 px below
 *     the crystal centre at the doc's 900 px band; at 0.115 that is **315 px**,
 *     against 405 px of band below the (5 % low) centre.
 *     CHECK-ROUND, re-measured off `crystal-fractured.glb` so the ladder is
 *     exact: at rest (gap 0.55, no per-shard rotation) the lowest vertex is
 *     y = **−2.418**; the worst REACHABLE low point once the per-shard rotate3D
 *     is allowed any angle is **−2.80** at rest and **−3.14** at the full
 *     FRACTURE_SURGE_GAIN gap 0.825 — so −3.04 is a mid-surge figure and the
 *     honest verdict is stronger than "was marginal": at 0.170 the surge case
 *     reached 481 px against 405 px of band and **overflowed it by ~76 px**; at
 *     0.115 the same case reaches 325 px and clears. The shrink closed a real
 *     bleed, it did not merely widen a margin.
 *   · callout pinning — every projected offset shrank by ρ, so the "past ~0.75
 *     the third callout starts pinning" ceiling moves to **~1.11**.
 * So the head-room to raise it exists now; it is deliberately NOT spent. The
 * owner's complaint is size, and enlarging the blast to compensate the shrink
 * would hand back on the broken section exactly what this round takes: at 0.55
 * the exploded cluster reads 350 px on a 725 px band (48.3 %, was 71.4 %).
 * The re-fitted BROKEN_CALLOUT_SHARDS were solved AT this gap. */
export const FRACTURE_REST_GAP_AUTHORED = 0.55;

// ═══ ROUND 13e — D20: THE METEORITE SHATTERS AND RECOMPOSES ═══════════════════
/**
 * "il meteorite, che si frantuma e si ricompone" + "si apre e dentro il logo
 * sersan con qualche effetto di luce" — one arc, driven by the stone's own
 * centring scalar `a` (CrystalCluster: `(cy − ih/2)/ih`, ±~1.03 over the
 * stone's on-frame window). The stone arrives SEALED, shatters open through
 * the middle of its pass — revealing the mark lit inside — and reseals as it
 * leaves. Scroll back and the whole arc plays in reverse (a pure function of
 * `a`: no latch, no state). Broken band only; `#production`'s healthy slab
 * keeps its sealed-mark RT grammar (D20's "twice").
 *
 * openBell = 1 − smoothstep(OPEN_IN, OPEN_OUT, |a|):
 *   fully open within |a| < OPEN_IN, fully sealed beyond OPEN_OUT.
 */
// 13e-b: IN 0.25→0.18, OUT 0.78→0.58 — measured on camera: at OUT 0.78 the
// stone left the frame still open, so the RECOMPOSE half of the owner's
// sentence played off-screen. At 0.58 it reseals while still well inside
// the frame; the full-open beat is concentrated near dead centre.
export const METEOR_OPEN_IN = 0.18;
export const METEOR_OPEN_OUT = 0.58;
/** Peak-gap gain over the (sealed-era) rest gap: at 1.0 the "open" state is
 * the old authored rest — measured on camera as "cracked, not shattered",
 * with the mark 95% occluded behind the shards. 1.9 puts the peak at
 * gap ≈ 1.05: the shards genuinely part and the mark reads through the
 * aperture. The seal (bell → 0) is unaffected. */
export const METEOR_PEAK_GAIN = 2.6;
/** ROUND 13f — how far the APPROACH alone opens the stone (the bell is
 * multiplied by this before the hold's own scroll drives the rest): the
 * stone arrives at centre CRACKED, then the beat opens it fully. */
export const METEOR_OPEN_ARRIVE = 0.5;
/** ROUND 13f — the beat's zoom-in on the camera-locked group's uniform
 * scale (never the camera). Peaks with the mark's reveal, released before
 * the traverse resumes. */
export const METEOR_ZOOM = 0.3;
/**
 * ROUND 15 — THE APERTURE (owner 2026-09-04: "i frammenti del meteorite anche
 * dopo la piena apertura zoom con lo scroll coprono ancora troppo il logo").
 *
 * The explode is RADIAL IN `centr` (`aCentr·uGap`), so a piece travels in
 * proportion to how long its own centroid already is — and in the authored
 * partition the three pieces that sit ON the mark are exactly the three with
 * the SHORTEST centroids and the LARGEST bodies (piece 0 |centr| 0.698 /
 * R 1.611, piece 1 0.726 / 1.648, piece 2 0.877 / 1.144). At the full-open
 * gap 1.430 they reach |c| 1.70 / 1.76 / 2.13 while still measuring 1.6 / 1.6
 * / 1.1 units across — pieces 0 and 1 still reach back to the group origin —
 * so they stand on the 1.50 × 1.84 unit mark: measured over 16 spin phases
 * the ink is 45.9% veiled at full open (worst phase 50.8%). Raising
 * METEOR_PEAK_GAIN cannot fix that: it scales EVERY piece, so the offenders
 * keep their share of the frame while the whole cluster inflates.
 *
 * This is instead the MINIMUM LATERAL (screen-plane) RADIUS every centroid
 * holds at full open, in crystal units. It is a FLOOR ON THE MULTIPLIER — the
 * explode stays a pure radial scale of `centr`, so the callout twin and the
 * ember twin keep their `centr·m` form — and it is a RATE ON `uGap`, never on
 * `openK`: 0 when sealed, exactly this at the full-open gap, linear between.
 * So the D20 arc is untouched — the slab still recomposes bit-for-bit at gap
 * 0, the hover re-cohere still collapses, and the whole thing stays a pure,
 * stateless function of the stone's centring scalar `a`.
 *
 * LATERAL, not 3-D, on purpose: the mark is veiled in SCREEN space, and a
 * floor on |centr| would push the front lid straight at the camera without
 * shrinking its footprint (a 3-D floor needs ~3.4 units to do what 2.5 does
 * laterally). At 2.5 the veiling is 0.0% at every sampled phase; 2.2 leaves
 * 1.0% (worst 2.5%) with the front lid 0.34 units less forward — drop to 2.2
 * if piece 2 reads as "thrown at the viewer" rather than as a shattered lid.
 * Only pieces 0/1/2 move (m 2.43 → 3.61 / 3.72 / 4.37); 3–7 are byte-
 * identical, so the lowest vertex stays at y = −3.78 units and the silhouette
 * widens only 298 → 318 px — the band-overflow ladder is unchanged.
 */
export const METEOR_APERTURE = 2.5;
/**
 * The same floor for the PROCEDURAL fallback partition (used only when
 * `public/models/crystal-fractured.glb` fails to load). Its centroids are
 * ~1.9× shorter than the authored ones (|centr| 0.42–0.835, mean 0.60 vs
 * 1.16 — the same ratio FRACTURE_REST_GAP vs FRACTURE_REST_GAP_AUTHORED
 * already carries), so a flat 2.5 would fling its inner pieces far further
 * than intended. 2.5 × 0.60/1.16 ≈ 1.3.
 */
export const METEOR_APERTURE_PROCEDURAL = 1.3;
/**
 * The mark inside the ice — the SAME 552-triangle shared geometry
 * RouteHeroLogo loads (module singleton; never dispose it). Camera-locked
 * group, never the tumbling mesh (the tumble reaches ~55° and would make it
 * unreadable); renderOrder −3.5, between the fog (−4) and the crystal (−3),
 * so a sealed shard in front passes CRYSTAL_ALPHA's 6% and a moved shard
 * passes 100% — the opening IS the reveal, zero shader work.
 *
 * Scale/offset measured (ROUND 12 plan §3): at scale 1.0 / offset 0, 46 of
 * 468 vertices poke out of the slab's top bite — the offset is not optional.
 */
export const MARK_MESH_SCALE = 0.921;
export const MARK_MESH_Y = -0.5;
/** Mark brightness on cyan #3BE1FF: base 0.65 ⇒ luminance 0.40 (under the
 * bloom gate); full opening 2.0 ⇒ 1.24 — it blooms ONLY at the peak. */
export const MARK_LIT_BASE = 0.65;
export const MARK_LIT_PEAK = 2.0;
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
/** Hash-cell frequency over crystal-local position — the shader is
 * `floor(vLocal · this)`, so the cells are exactly 1/this crystal units (no 2π
 * here, unlike RIPPLE_FREQ — read its unit correction before comparing them).
 *
 * ROUND 10-A — 15 → **10.15**, the same rule as the ripple carrier and for the
 * same reason: this is a crystal-LOCAL frequency, so at a fixed constant the
 * stone's shrink would make it 1/ρ = 1.48× finer on screen. The fitted quantity
 * is the cell's ON-SCREEN size (the round-7/8-F live passes were judged at it):
 *     @ 0.170, 725 px band: 123.25/15    = **8.22 px** per cell  (accepted)
 *     @ 0.115 unchanged:     83.375/15   = **5.56 px** per cell  ← glitter, and
 *       a hard `floor()` boundary that close to the grid shimmers on any
 *       DPR-1 device (tierStore's dprMin, and where AdaptiveResolution sits
 *       under pressure)
 *     @ 0.115, this:         83.375/10.15 = **8.21 px** per cell  ← held
 * 15 · ρ = 10.147, shipped as 10.15. The cell COUNT across the stone falls
 * 50 → 33.7 in height, which is the honest cost: the glint field is sparser on
 * the stone. That is the correct trade — SPARKLE_GAIN was levelled (8-F) to sit
 * BELOW the key lobe precisely so the surface does not read as glitter, and
 * 1.48× denser cells at a fixed gain walk straight back into it.
 * Ratio to the relief band is preserved: 15/12 = 1.25 → 10.15/8 = 1.27.
 * ⚠ BAKED graph literal (like RIPPLE_FREQ) — an edit + reload, not a uniform;
 * only `uSparkleGain` is live. */
export const SPARKLE_FREQ = 10.15;
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
 * the pixel grid (see RIPPLE_FREQ).
 *
 * ROUND 10-A — LEFT ALONE, and this is the one frequency in the file where that
 * is the right answer, so the reasoning is recorded rather than assumed. The
 * ripple carrier and the sparkle cells were scaled with the stone because they
 * are pinned to the PIXEL GRID; the frost is not — its lattice cell is
 * **1/0.9 = 1.111 crystal units = ~93 screen px** at 0.115/725 (was 137 px),
 * roughly three cells across the 3.32-unit slab. Zoning is a STONE-relative
 * property: it must stay constant per stone, not per pixel, and that is exactly
 * what leaving it does.
 * ⚠ CHECK-ROUND UNIT FIX (twice, in one paragraph — read this before quoting
 * the separation figure). (a) The first pass of this entry wrote "one cycle
 * spans 2π/0.9 = 6.98 crystal units, i.e. ~93 screen px", which cannot both be
 * true. There is **no 2π here**: the shader is `vnoise3(vLocal·FROST_FREQ)`, a
 * value-noise LATTICE, so the cell is 1/F and the 93 px figure is the correct
 * one. The 2π convention belongs only to the `sin(x·F)` family — see
 * RIPPLE_FREQ. (b) The "band separation" numbers in this entry (28.9× → 13.3×
 * → 8.9×) are RAW CONSTANT RATIOS, F_ripple/F_frost, and have been throughout
 * — but the two constants live in different conventions, so that ratio
 * overstates the real spectral gap by 2π in every round. In actual SPATIAL
 * PERIOD (value noise peaks near 2 cells = 2.222 units; carrier period 2π/F):
 *     8-E   F 26  →  2.222 / 0.242 = **9.2×**
 *     8-I   F 12  →  2.222 / 0.524 = **4.2×**
 *     10-A  F 8   →  2.222 / 0.785 = **2.8×**   ← where we now are
 *     §A2 failure (frost 5.5, carrier 8) → 0.364 / 0.785 = 0.46×, i.e. the
 *       frost was 2.2× FINER than the carrier when the two mudded.
 * So the honest statement is NOT "still an order of magnitude": the gap is
 * **~1.5 octaves** and it has narrowed in each of the last two rounds. It is
 * still the right call to leave this alone, for two reasons the raw ratio does
 * not capture: the frost and the carrier are on DIFFERENT CHANNELS (frost
 * modulates roughEff/thickEff/body density; only the ripple perturbs the
 * normal), and FROST_AMP was cut to 0.35 in 8-I, delivering ±9 % of roughness
 * spread — a zoning that cannot read as relief whatever its frequency. But if
 * a future round takes the carrier below 8, THIS is the constant that has to
 * move with it (0.9 → 0.4 restores ~2 octaves), and the check is the period
 * ladder above, not the raw ratio. */
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
 * ~15px label line + 4px gap + 28px leader (`h-7` + `mt-1`/`mb-1`).
 *
 * ⚠ ROUND 10-A — THIS IS THE CONSTANT THAT MADE THE SHRINK NON-TRIVIAL, and it
 * is deliberately NOT re-derived: it is a MEASUREMENT OF THE DOM (the leader
 * span's own `h-7` + margin + line box), so it does not scale with the stone,
 * and lowering it would detach the leader's tip from the anchor it points at —
 * the leader-line contract. The consequence has to be absorbed on the ANCHORS
 * instead: `top` callouts place their label 47 px ABOVE the anchor and `bottom`
 * callouts 47 px BELOW it, so any (top, bottom) pair whose anchors are ordered
 * "bottom-edge one ABOVE top-edge one" CONVERGES by a fixed 94 px regardless of
 * size. At CRYSTAL_SCALE 0.17 the shipped broken pair had 154 px of raw anchor
 * separation at a 725 px band (94 px of convergence ⇒ 60 px of label gap); at
 * 0.115 it has 104 px ⇒ the two labels INVERT and overlap. Hence the re-fit at
 * BROKEN_CALLOUT_SHARDS / HEALTHY_CALLOUT_ANCHORS, whose rule is now explicit:
 * **the bottom-edge callout (index 1) must anchor BELOW the top-edge ones**, in
 * which case the ±47 px offsets DIVERGE and the pair can never close past
 * 64 px. Both re-fits obey it. */
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
 *
 * ═══ ROUND 10-A — ANCHOR 2 MOVES FROM THE UPPER-RIGHT SHOULDER TO THE
 * LOWER-RIGHT FLANK. `[1.27, 0.71, 0.28]` → `[1.30, −0.65, 0.33]`. ═══
 *
 * WHY (it is not taste). Anchors 0 and 2 are BOTH `top`-edge (CALLOUT_EDGE), so
 * their labels both sit exactly CALLOUT_LABEL_OFFSET_PX above their anchors —
 * i.e. their vertical separation is the anchors' separation, undiminished. The
 * shipped pair differ by only Δy = 0.17 crystal units, which bought 21 px of
 * vertical separation at 0.17/725 and was carried entirely by the 209 px of
 * HORIZONTAL separation. Horizontal separation scales with the stone; the label
 * WIDTHS do not (`.eyebrow` is unlayered CSS, so it wins the cascade against
 * the span's `text-[10px] tracking-[0.18em]`: 11 px JetBrains Mono at 0.12em ⇒
 * 7.92 px per char, and "GUARDRAIL CLAMP" / "CLAMP GUARDRAIL" is 118.8 px wide
 * against "EVAL BASELINE" / "BASELINE EVAL" at 103.0 px). At ρ = 0.676 the
 * 209 px becomes 141 px against 110.9 px of combined half-widths.
 * Swept the driver's own projection (rotation + perspective + clamps) over
 * a ∈ [−0.45, 0.55] inside the CALLOUT_VIS_WINDOWS, the full wobble phase, 8
 * viewports × 7 band heights (560…1100) × EN/IT — worst label-block clearance:
 *     shipped anchors @ 0.170   **+14.4 px**   (already thin; 8 clamp pins)
 *     shipped anchors @ 0.115   **−9.7 px**    ← OVERLAP, the naive change
 *     new anchors     @ 0.115   **+68.2 px**   ← 4.7× the shipped margin
 * The fix obeys CALLOUT_LABEL_OFFSET_PX's rule: index 1 (`bottom`) stays the
 * LOWEST anchor, and dropping index 2 below the equator gives the two `top`
 * callouts 1.53 units of Δy instead of 0.17 — vertical separation now does the
 * work that horizontal separation can no longer do at this size.
 *
 * MEASURED, NOT EYEBALLED, by the same rule as round 8-H. Direction (1, −0.5,
 * 0.25) ray-cast from the origin against the shipped `crystal-intact.glb`
 * (450 tris) hits its first surface at t = **1.5385**; × 0.97 = [1.303, −0.651,
 * 0.326], written rounded as [1.30, −0.65, 0.33] (|p| 1.4904 vs surface 1.5404
 * ⇒ **0.968** — the same "hair inside the silhouette"). Its radius is within
 * 0.6 % of the anchor it replaces (1.482), so the leader length is unchanged;
 * only the clock position moved. Anchors 0 and 1 are UNTOUCHED — re-cast this
 * round and both still sit at 0.970/0.969 of their surface radius.
 * ⚠ NOTE FOR THE NEXT RE-FIT: the slab is NOT star-shaped from its own origin —
 * a ray straight up (+Y) hits an interior wall at t = 0.474, not the 1.66 apex.
 * Always cast the exact direction you intend to use and check |p| against the
 * bbox before trusting it.
 * ⚠ RESIDUAL: one clamp-pin case survives (CALLOUT_LEFT_MAX, at viewport width
 * 768 with a band ≥ 1100 px). The shipped 0.17 configuration pinned in EIGHT
 * such cases, and at 768 px the measured band is ~670 px, so the combination is
 * not reachable — recorded, not fixed.
 */
export const HEALTHY_CALLOUT_ANCHORS: readonly [number, number, number][] = [
  [-0.42, 0.88, 0.31],
  [0.21, -1.35, 0.31],
  [1.3, -0.65, 0.33],
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
 *
 * ═══ ROUND 10-A — [1, 2, 5] → **[1, 6, 3]**. THE SHIPPED TRIPLE INVERTS AT THE
 * NEW SIZE, AND WAS ALREADY BROKEN IN ITALIAN AT SMALL BANDS. ═══
 *
 * THE DEFECT, exactly. Callout 1 is the `bottom`-edge one, so its label hangs
 * CALLOUT_LABEL_OFFSET_PX *below* its anchor; callouts 0 and 2 are `top`, so
 * theirs sit 47 px *above*. In [1,2,5] the bottom-edge callout rode piece 2
 * (centr y −0.549) while the third rode piece 5 (centr y −1.196) — i.e. the
 * bottom-edge label pointed DOWN from the HIGHER anchor and the top-edge label
 * pointed UP from the LOWER one. The two converge by a fixed 94 px:
 *     raw anchor Δy = 0.55-gap · (1.196 − 0.549) · px-per-unit
 *     @ 0.170, band 725 (123.25 px/u):  154 px − 94 = **60 px** of label gap
 *     @ 0.115, band 725 ( 83.375 px/u): 104 px − 94 = **10 px**, then the
 *       wobble tips it and the two labels INVERT their reading order.
 * Because the convergence is a CONSTANT and the separation is proportional,
 * this pair fails at ANY sufficiently small stone — and the same arithmetic run
 * back over the SHIPPED configuration shows it already failed there: at band
 * heights ≲ **790 px** in Italian ("NIENTE DEBUGGING" 126.7 px + "NIENTE
 * FIDUCIA" 110.9 px against 152 px of x separation) the round-8-H fit
 * overlaps. It was computed at a 900 px band, in English. This is a latent bug
 * being closed, not a new constraint. (CHECK-ROUND: re-swept independently —
 * the shipped triple at 0.170 in IT scores +0.3 px at an 800 px band, −9.4 at
 * 725, −16.5 at 650; the first pass of this entry quoted 725 px, which
 * understated the reach of the defect. In EN at 0.170 it clears everywhere
 * ≥ 560 px, which is how it survived 8-H.)
 *
 * THE FIT. Swept the driver's own projection (explode gap + idle drift +
 * rotation + perspective + both clamps) over a ∈ [−0.45, 0.55] within the
 * CALLOUT_VIS_WINDOWS, the full wobble phase, 8 viewports × 7 band heights
 * (560…1100) × EN/IT, scoring the worst label-block clearance over every pair
 * simultaneously visible. All 48 one-large/one-mid/one-chip permutations:
 *     [1,2,5] @ 0.170  **−16.0 px**  (the shipped triple, IT)
 *     [1,2,5] @ 0.115  **−16.0 px**  (the naive change)
 *     [1,6,3] @ 0.115  **+19.5 px**  ← shipped
 *     [1,5,3] +19.5 (ties, but see below) · [1,7,3] +4.3 · [1,4,3] −8.5 ·
 *     [1,3,6] −11.3 · [0,3,4] −16.0
 * ⚠ NOTE ON THE UNITS OF A NEGATIVE SCORE: the metric is AABB separation,
 * `max(gapX, gapY)`, so it saturates at −(label line height) once two blocks
 * fully coincide. −16.0 means "overlapping", not "overlapping by 16 px"; only
 * the positive numbers are distances. CHECK-ROUND re-derivation at a 16.5 px
 * line box reproduces the table within 1 px (−16.5 / −16.5 / +19.0, with
 * [1,5,3] tying at +19.0 and [1,7,3] landing at −3.8 rather than +4.3 — the
 * one row of the table that is line-height-sensitive, and not a shipped
 * candidate). The shipped pair holds +15.5 … +22.5 px across line boxes
 * 13…20 px, i.e. the choice does not depend on the line-height assumption.
 * TIE-BREAK ON ANCHOR SPREAD, which is the round-8-H criterion the label sweep
 * does not see: [1,5,3] ties on labels but puts pieces 5 and 3 only **30 px**
 * apart on screen — two leader lines annotating the same corner of the cluster,
 * which is exactly why 8-H rejected [1,3,5]. [1,6,3] separates the same three
 * labels across **161 / 174 / 90 px** in three quadrants (upper-left / lower-
 * centre / mid-right), against the shipped triple's 106 px minimum at the same
 * band. Same clearance, 3× the spread.
 * WHY IT HOLDS AT ANY SIZE (the structural half, not the sweep's): [1,6,3]
 * obeys CALLOUT_LABEL_OFFSET_PX's rule — the `bottom`-edge slot rides piece 6,
 * centr y −1.392, the LOWEST of the three (piece 1 −0.248, piece 3 −1.031). So
 * the ±47 px offsets DIVERGE instead of converging and the pair's label gap is
 * `Δy + 64 px`, floored at 64 px however small the stone gets. The shipped
 * triple had the sign the other way, which is why its margin was proportional
 * to the stone and this one's is not.
 * No clamp pinning in any case ([1,6,3]'s rest-pose edge offsets are 52.4 /
 * 18.0 / 63.9 % against CALLOUT_EDGE_MIN/MAX 2…88, and its left offsets 61.3 /
 * 65.3 / 70.5 % against 4…96) — the round-8-H pinning check is satisfied with
 * far more room than before, because every projected offset shrank by ρ.
 * SIZE-CLASS INTENT PRESERVED, slot order changed: piece 1 large (30.4 %),
 * piece 6 chip, piece 3 mid (10.2 %). No large/mid/chip SLOT ordering clears
 * the sweep — [1,3,6], the best of them, lands at −11.3 px — because the slot
 * order is what decides which callout hangs its label downward; the classes
 * stay, their slots swap.
 * ⚠ These are the piece indices into the AUTHORED partition, re-verified this
 * round by parsing `crystal-fractured.glb` directly (8 unique `_CENTR`:
 * 0 [0.655, 0.224, 0.087] · 1 [−0.625, −0.248, −0.273] · 2 [−0.160, −0.549,
 * 0.664] · 3 [0.470, −1.031, −0.569] · 4 [−0.499, −1.235, −0.008] · 5 [0.639,
 * −1.196, 0.061] · 6 [−0.129, −1.392, −0.729] · 7 [0.093, −1.136, 0.021]).
 */
export const BROKEN_CALLOUT_SHARDS: readonly [number, number, number] = [
  1, 6, 3,
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
 * ROUND 10-A — 512 stays, with MORE headroom, not less. CRYSTAL_SCALE 0.17 →
 * 0.115 takes the band to 83.375 px per crystal unit, so the mark lands on
 * **167 screen px**, 1 RT texel = **0.375 px**, and the RT is **2.67×
 * oversampled** (the lod blur is a ~0.84 px soft edge). Shrinking the stone can
 * only ever increase this ratio — the RT is a fixed-resolution subject-local
 * image and the screen footprint is what got smaller. Nothing to do; recorded
 * because the numbers above are quoted elsewhere.
 * ⚠ CHECK-ROUND, the other half of that coin, because "more headroom" is only
 * true of SHARPNESS. The lod is EXPLICIT — `roughEff · log2(512) · MARK_LOD_K`
 * fed to `.level()`, never a screen-space derivative — so the filter kernel is
 * fixed in TEXELS (2.25 at lod 1.17) while the screen footprint shrank. Against
 * the pixel footprint the sign flips: the RT frame spans 246·1.15 = 283 px at
 * 0.17 ⇒ 1.81 texels per screen px, a 2.25-texel kernel COVERS it; at 0.115 it
 * spans 192 px ⇒ 2.67 texels per px against the same 2.25-texel kernel, i.e.
 * the single tap now under-covers its pixel by ~19 %. Left alone deliberately:
 * the GPU's trilinear tap is a ~2-mip tent (≈4.5 texels ≈ 1.7 px) which still
 * covers, the mark is screen-UPRIGHT and render-once (MARK_TUMBLE false) so
 * there is no motion to crawl, and the correcting move — raising MARK_LOD_K —
 * would blur the mark, which is the exact opposite of what this round's
 * legibility argument is defending. If a live pass reports crunchy stroke
 * edges, MARK_LOD_K 0.36 → 0.50 is the one-knob fix (lod 1.17 → 1.62, kernel
 * 3.07 texels = exactly the new footprint).
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
 * per-triangle 5–18 px jitter), not the placement of the image.
 *
 * ROUND 10-A — 0.70 SURVIVES THE SHRINK UNTOUCHED, checked term by term rather
 * than assumed. This is a LEVEL, and CRYSTAL_SCALE is a uniform scale: the
 * compositing site (additive into `trans`, PRE `uBodyDarken`), the body it is
 * measured against (0.0396 lumLin), the brightest ordinary pixel it must not
 * out-read (0.276) and the frost span that binds the ordering tie (×1.096) are
 * all per-fragment quantities that no scale can move. So check 1's ceiling is
 * still **0.822** on the brightest frost vein (0.91 on typical body), check 2's
 * post-blend peak is still 0.197 against the ≈1.0 bloom threshold, and check 3
 * is still the single-tap full **3.03:1**. The live A/B range stands at
 * 0.55–0.82. What DID change is the mark's on-screen size — 246 → 167 px — and
 * that is a legibility question, answered with measurements at
 * MARK_WORLD_HALF, not a level question. */
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
 * ROUND 10-A — UNCHANGED, AND THAT IS A RESULT, NOT AN OMISSION. The swim is
 * `uMarkThick·sin δ /(2·uMarkHalf)` **uv** — dimensionless — so at CRYSTAL_SCALE
 * 0.115 it is still 1.5 / 3.8 / 6.0 % of the mark's own height at δ = 5 / 13 /
 * 20°, exactly as at 0.17. Only the pixel restatement moves, and it moves the
 * safe way: 3.8 / 9.4 / 14.8 px on a 246 px mark → **2.5 / 6.6 / 10.0 px on a
 * 167 px mark** (0.35 · sin δ · 83.375). The ripple's contribution likewise
 * scales with the same factor (±4 px → ±2.7 px), because RIPPLE_AMP was
 * re-derived to hold the SAME 25° delivered tilt. Nothing in this entry's
 * legibility ladder is a function of the stone's size.
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
 *
 * ═══ ROUND 10-A — STAYS AT 1.15. THE MARK SHRINKS WITH THE STONE BY
 * CONSTRUCTION, AND IT STILL CLEARS THE LEGIBILITY THRESHOLD — MEASURED. ═══
 *
 * At CRYSTAL_SCALE 0.115 the mark's on-screen height is 2 crystal units ×
 * 83.375 px/unit = **166.8 px** at the 8-I-measured 725 px band (was 246.5 px);
 * as a share of the band it is 2·CRYSTAL_SCALE = **23.0 %** (was 34.0 %), and
 * that share, not the pixel figure, is the viewport-invariant form. At the
 * round-9 doc's 900 px reference band it is 207 px.
 *
 * WHY IT STILL READS — three checks, and the first is the one that settles it:
 *  1. THE MARK IS NOT A HAIRLINE. Measured this round by rasterising the
 *     shipped `sersan-mark.glb` into the 512² RT frame (normalised exactly as
 *     RouteHeroLogo does: centre → height 2 → recentre; the result confirms the
 *     ±0.814 × ±1.000 × ±0.150 half-extents this file already claims — x, y, z
 *     in that order; the GLB ships ±0.8119 × ±0.9974 pre-normalisation):
 *         ink coverage                      **33.1 %** of the RT
 *         local stroke thickness (min of the h/v run through each ink texel)
 *           p5 **41 texels** · p25 88 · p50 **90 texels**
 *     The round-8-I "hairline logo cut into 34 pieces" framing — already
 *     retracted by 9-C on the mechanism — is also wrong about the SUBJECT: a
 *     fifth of the mark's own height is the median stroke.
 *  2. EVERY DISPLACEMENT THAT COULD BREAK IT IS IN uv, HENCE SCALE-FREE.
 *     ⚠ CHECK-ROUND UNIT FIX — the first pass of this entry compared two
 *     DIFFERENT uv's and reported a margin 1.15× too generous. There are two
 *     normalisations in play and they differ by MARK_RT_FRAME/1.0 = 1.15:
 *       · **RT-uv** (0…1 across the texture, which spans 2·MARK_RT_FRAME = 2.3
 *         mark units). `Δ(markUv)` from MARK_THICKNESS is in THIS unit.
 *       · **mark-height** (fraction of the mark's own 2-unit height) = RT-uv
 *         × 1.15. The "1.5 / 3.8 / 6.0 %" figures on MARK_THICKNESS are these.
 *     Everything below is stated in RT-uv, measured not quoted:
 *         p5 stroke   41/512 = **0.0801** RT-uv (= 0.0921 of mark height)
 *         p50 stroke  90/512 = **0.1758** RT-uv (= 0.2021 of mark height)
 *         worst reachable refractive swim **0.0809** RT-uv (MARK_THICKNESS;
 *           0.152 is the unreachable sin δ = 1 bound)
 *         lod-1.17 mip footprint 2.25 texels = **0.0044** RT-uv
 *     ⇒ the thinnest twentieth of the mark is **0.99×** the worst reachable
 *     swim — NOT 1.14× — i.e. at the hard grazing maximum (δ = 32.1°, and only
 *     on facets actually at grazing incidence) the p5 strokes are displaced by
 *     about their own width. The ratio that carries "not a hairline" is the
 *     MEDIAN: p50 is **2.17×** the worst swim, and at the ordinary deviations
 *     MARK_THICKNESS tabulates (δ = 5 / 13 / 20° ⇒ 0.0132 / 0.0342 / 0.0520
 *     RT-uv) even p5 clears at **6.1× / 2.3× / 1.5×**. Against the mip
 *     footprint p5 is **18×**.
 *     All four of these ratios are identical at 0.17 and at 0.115 — the swim is
 *     `uMarkThick·sin δ/(2·uMarkHalf)` (both crystal-unit lengths; the group's
 *     `mScale` multiplies the exit-point offset AND the half-extent and
 *     cancels — crystalBuild's mark block), and the mip lod is
 *     `roughEff·log2(512)·MARK_LOD_K`, an EXPLICIT `.level()` driven by
 *     roughness, never by a screen-space derivative. Neither has an absolute
 *     pixel or texel term. THAT is why the shrink cannot cost legibility.
 *     (The one term that is not scale-free, D/(D−d), moves the safe way: d ∝
 *     mScale, so a smaller stone drives the perspective factor toward 1.)
 *  3. ABSOLUTE SIZE. Restating check 1 in pixels at the new scale: p5 strokes
 *     are **15.4 px** wide and the median **33.7 px** (band 725); at a 620 px
 *     band, 13.1 / 28.8 px. Nowhere near a legibility floor.
 * So MARK_WORLD_HALF is NOT raised. Raising it (= a bigger mark) would spend
 * the containment margin this entry's ⚠ above documents — the mark's bbox
 * CORNER already sits at 1.29 against the slab's smallest support half-extent
 * 1.079 — to buy contrast the arithmetic says is not needed. The 60 %-of-height
 * relationship is preserved and remains ≤ the 0.75 ceiling stated above.
 * ⚠ WHERE THE MARK GENUINELY DOES NOT EXIST: the `lite` tier. The branch is
 * gated `healthy && !lite && (WebGPU || MARK_RT_WEBGL2)` (CrystalCluster), and
 * `lite` is `fxBudget.level ≤ 2`, which every coarse-pointer device and every
 * viewport under 768 px takes. At 390 px there is no in-ice mark to size — the
 * stone renders body + fog only. The callouts are `max-sm:hidden` there too. */
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
 *
 * ═══ ROUND 10-A — 12 → **8.0**. THE CEILING MOVED, EXACTLY AS THE ⚠ ABOVE SAID
 * IT WOULD. Plus a UNIT CORRECTION to every "px/cycle" figure above. ═══
 *
 * THE RETUNE. CRYSTAL_SCALE 0.17 → 0.115 takes the stone from 123.25 to
 * **83.375** px per crystal unit at the 8-I-measured 725 px band. The carrier
 * is a frequency over crystal-LOCAL position, so its screen frequency rises by
 * 1/ρ = 1.48× at a fixed constant. Holding the fitted ON-SCREEN period:
 *     F_new = F_old · ρ = 12 · 0.676471 = 8.118  →  shipped **8.0**
 * (8.0 rather than 8.118 because it is round and errs 1.5 % COARSER, i.e. on
 * the safe side of the gate.) The 8-I gate, restated in its own terms:
 *     F ≤ px-per-unit / (8 · RIPPLE_F2) = 83.375 / 9.2 = **9.06**
 *     8.0 ⇒ 13.3 % of margin (the 8-I fit had 11.7 %).
 * BAND-HEIGHT FLOOR, the size dependency this file insists on stating: train 2
 *     stays inside the gate while `rect.h ≥ 8·RIPPLE_F2·F/CRYSTAL_SCALE` =
 *     9.2·8/0.115 = **640 px** (was 649 px — unchanged in practice), rising to
 *     ~800 px transiently at the arrival scaleMul 0.8.
 * RIPPLE_AMP is re-derived (0.0385 → **0.0577**) to hold the SAME delivered
 *     25° surface tilt, so — exactly as in 8-I — the value table does not move:
 *     the stone keeps its surface tilt and spends it at the same SCREEN
 *     frequency it was fitted at. The artifact metric (tan θ · F / px-per-unit)
 *     goes 0.0454 → **0.0447**, 1.5 % better.
 *
 * ⚠ THE UNIT CORRECTION — READ THIS BEFORE TRUSTING ANY "px/cycle" NUMBER
 * ABOVE. The shader is `sin(dot(vLocal, d) · RIPPLE_FREQ)` (crystalBuild's
 * ripple block — no 2π anywhere), so F is RADIANS per crystal unit and the
 * spatial period is **2π/F units**, not 1/F. Every px/cycle figure in the 8-E
 * and 8-I entries above was computed as `px-per-unit ÷ F`, i.e. **2π× too
 * small**. The true screen periods are:
 *     F 8  (pre-8-E)          → 96.8 px   "a rippled stone, not a wet one" ✓
 *     F 26 (8-E/8-F, shipped) → 29.8 px   the moiré the owner saw ✓
 *     F 12 (8-I, shipped)     → 64.5 px   the clean state ✓
 *     F 8  @ 0.115 (this)     → **65.5 px** — the same clean state, held
 * The three live data points still order exactly as the 8-I entry says, so the
 * RELATIONSHIP it fitted (and this round preserves) is untouched; only its
 * labels were wrong. Note the corrected reading also explains the failure
 * honestly: two crossed trains on a flat plane are a regular screen lattice at
 * ANY frequency — what makes it read as moiré rather than as ripples is how
 * FINE that lattice is, and 30 px was fine, 65 px is not. The `≳8 px/cycle`
 * Nyquist framing was the wrong mechanism for the right number.
 * ⚠ AND THE GATE IS STILL NOT A CONSTANT: it is `band height × CRYSTAL_SCALE ÷
 * 9.2`. `feel.scale` is now a live dev knob (see CRYSTAL_SCALE) and this is a
 * BAKED graph literal — moving the stone live does not move the carrier, so a
 * live A/B that lands somewhere else must come back here and re-derive.
 */
export const RIPPLE_FREQ = 8.0;
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
 * LOW edge (20°). Do not go back up on the frequency to get relief.
 *
 * ROUND 10-A — RE-DERIVED AGAIN, SAME RULE: 0.0385 → **0.0577**. The carrier
 * drops 12 → 8 to hold its screen period against the smaller stone, |gradT| ∝ F
 * as before, so amp × 12/8:
 *     amp = tan 25° / (1.01 · 8) = 0.46631 / 8.08 = **0.05771**
 *     ⇒ atan(1.01 · 8 · 0.0577) = **25.0°**, igloo's band (20–33°), the SAME
 *       delivered tilt rounds 8-E/8-F/8-I shipped ⇒ the value table is untouched.
 * Per-pixel normal step (tan θ · F / px-per-unit — the artifact metric, now
 * written in a form that does not depend on the px/cycle convention the
 * RIPPLE_FREQ entry corrects):
 *     F 26 / amp 0.018   (moiréd)      0.46631 · 26/123.25 = **0.0984**
 *     F 12 / amp 0.0385  (8-I shipped) 0.46631 · 12/123.25 = **0.0454**
 *     F 8  / amp 0.0577  (SHIPPED)     0.46631 ·  8/ 83.375 = **0.0447**
 *     F 26 / amp 0.004   (live-clean)  0.10510 · 26/123.25 = **0.0222**
 * i.e. the shipped setting sits 1.5 % BELOW the state the owner accepted and
 * 55 % below the artifact point. The two pre-derived fallbacks carry over,
 * rescaled by 12/8: **0.0285** reproduces the live-clean step exactly (13.0°)
 * and **0.0451** lands on igloo's low edge (20°). `uRippleAmp` is live. */
export const RIPPLE_AMP = 0.0577;
/** vnoise3 phase-warp of the first wave train (breaks the straight rulings).
 * ROUND 8-I — unchanged and re-checked, because on the authored slab's flat
 * planes this is the ONLY thing standing between the carrier and a machined
 * grating. Its authority is measured in PIXELS, and the retune helps it: the
 * warp wanders the rulings by ±(RIPPLE_WARP/2π) = ±0.24 cycles, which was
 * ±1.1 px at F 26 and is **±2.5 px at F 12** — the same wander, now visible.
 * Train 2 still carries no warp (a fixed +2.7 phase), which is what makes the
 * pair read as a crossed weave rather than as noise.
 * ROUND 10-A — unchanged, and its pixel authority is unchanged with it: the
 * wander is ±(1.5/2π) = ±0.2387 of a CYCLE, and the cycle's screen length was
 * held constant by the carrier retune (64.5 → 65.5 px), so ±2.5 px stays ±2.5
 * px. (Under the corrected 2π convention of the RIPPLE_FREQ entry the absolute
 * numbers above are 2π× larger — ±15.4 px at F 12, ±15.6 px now — but the point
 * is the same and the RATIO to the ruling is exactly preserved.) */
export const RIPPLE_WARP = 1.5;
/** ROUND 8-E — the warp NOISE frequency, previously derived as
 * RIPPLE_FREQ·0.6 and therefore dragged from 4.8 to 15.6 by the carrier
 * retune. Decoupled and frozen at its historic value: the phase warp belongs
 * in the FORM band (it makes the wave trains wander), not on top of the
 * carrier — at 15.6 it turned the shimmer into high-frequency chaos.
 * ROUND 8-I — the decoupling pays off again, in the other direction: at the
 * new carrier the warp sits **2.5× below it** (12 / 4.8), between the historic
 * 1.67× and 8-E's 5.4×, so it still reads as a wander of the rulings and not as
 * a third train. Nothing to change; it is only ever wrong when it is derived.
 * ROUND 10-A — the carrier lands on **8.0**, i.e. the warp is back at exactly
 * its historic **1.67×** relationship (the pre-8-E state this constant was
 * frozen from), which is the one ratio in this family that has actually been
 * looked at in a browser and accepted. Still nothing to change — and it is
 * still only ever wrong when it is derived.
 * ⚠ CHECK-ROUND, same convention trap as FROST_FREQ: "1.67×" is the RAW ratio
 * of two constants in DIFFERENT conventions — this one is a `vnoise3` lattice
 * frequency (cell = 1/4.8 = 0.208 units, dominant λ ≈ 2 cells = 0.417 units),
 * the carrier is a `sin(x·F)` frequency (period 2π/8 = 0.785 units). So the
 * warp's own structure is in fact ~1.9× FINER than the ruling it wanders, not
 * 1.67× coarser. That is harmless HERE because the warp enters only as a PHASE
 * term — `grad` is the analytic derivative of the UNWARPED sine (crystalBuild's
 * ripple block), so no amount of warp changes the delivered normal amplitude —
 * but it does mean the read shifts from "the rulings wander" toward "the
 * rulings wobble" as the carrier comes down: the wander's own screen scale went
 * 51 px (F 12 @ 0.17) → **35 px** (F 8 @ 0.115) against a ruling spacing held
 * at ~65 px. If the live pass calls the surface busy rather than wet, LOWER
 * this (4.8 → ~3.2 restores the 8-I ratio of wander-scale to ruling). */
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
 * compile the branch at all.
 * ROUND 10-A — KEPT AT 1.15 and still the binding train: the gate was solved on
 * IT again at the new size (F ≤ 83.375/9.2 = 9.06 ⇒ RIPPLE_FREQ 8.0, delivering
 * 9.06 "px/cycle" in this entry's convention). The band-height floor moves 649
 * → **640 px**, i.e. unchanged in practice — F and CRYSTAL_SCALE fell together
 * by design, and 8·this·F/CRYSTAL_SCALE is invariant under that. ⚠ Read the
 * unit correction on RIPPLE_FREQ before quoting any px/cycle number here. */
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
 * the then-current CRYSTAL_SCALE's on-screen size — ROUND 10-A changes that
 * scale, which moves the on-screen size but NOT the 1.66 half-height this
 * ratio is taken against), so the intended 0.87× relationship still
 * holds. The slab is 15 % wider in x (half-width 1.205 → 1.3945) and 6 % in z,
 * so orbit points on the jittered inner radius (1.45 × [0.8,1] = 1.16) now
 * pass closer to the silhouette in x — but PLEXUS_MASK_IN 1.1 already fades
 * those segments to nearly nothing (smoothstep(1.1, 1.9, 1.16) ≈ 0.02), which
 * is exactly the case the radial mask exists for. Nothing to retune.
 *
 * ROUND 10-A — RE-DERIVED AND PROVEN INVARIANT, not merely left alone. The
 * concern the shrink raises is real ("does the mask still hug the stone, or is
 * there now a visible empty shell / a clipped silhouette?") and the answer is
 * structural: the plexus is mounted as a CHILD of the crystal group
 * (CrystalCluster mounts `plexus.lines`/`.cross` in the same group as the
 * mesh), the group's scale is UNIFORM, and this radius, PLEXUS_RADIUS_JIT,
 * PLEXUS_TREADMILL, PLEXUS_CONNECT_DIST/BREAK_DIST, PLEXUS_Y_GATE,
 * PLEXUS_CROSS_SIZE and PLEXUS_MASK_IN/OUT are ALL in crystal units. Every
 * ratio to the silhouette therefore survives a scale change bit-for-bit:
 *     radius ÷ slab half-height   1.45 / 1.66  = 0.873   ← unchanged
 *     jittered inner ÷ half-width 1.16 / 1.3945 = 0.832  ← unchanged
 *     mask-in ÷ half-height       1.10 / 1.66  = 0.663   ← unchanged
 * The mask still fades a segment at the x-flank to smoothstep(1.1,1.9,1.16) ≈
 * 0.02, and the net's outer edge still sits 0.873 of the way up the stone. What
 * DOES change is the whole net's on-screen size (1.45 units: 179 px → **121 px**
 * of radius at the 725 px band) — which is the point of the round, and it is
 * the one thing that must NOT be compensated here, or the net would grow
 * relative to the stone it wraps. Nothing to retune, arithmetically this time.
 * The only plexus quantity worth a pixel check is the dash mask — see
 * PLEXUS_DASH_FREQ. */
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
 * mix-to-black + additive; here the same smoothstep drives alpha).
 * ROUND 10-A — unchanged, and unchanged for a REASON, not by omission: both
 * bounds are crystal-local and evaluated PER FRAGMENT
 * (`smoothstep(MASK_IN, MASK_OUT, length(varying(positionLocal)))` in
 * crystalPlexus.makeMat), so the hollow they cut is a fixed shape in the
 * stone's own frame and scales with it exactly. Full derivation on
 * PLEXUS_RADIUS. Note the per-FRAGMENT evaluation is also why trap #12 (a
 * per-VERTEX smoothstep interpolated across a wide primitive) cannot bite here
 * — `positionLocal` interpolates linearly and is then fed to the smoothstep,
 * which is the correct order. */
export const PLEXUS_MASK_IN = 1.1;
export const PLEXUS_MASK_OUT = 1.9;
/** Broken-dash mask frequency: smoothstep(.4,.5, sinenoise(pos·this)).
 * ROUND 10-A — pixel-checked and kept. It is a product of three `sin(x·this)`,
 * so the period is 2π/10.1 = 0.622 crystal units (the same convention trap the
 * RIPPLE_FREQ entry corrects): **51.9 screen px** per dash cycle at 0.115/725,
 * down from 76.7 px. Coarse enough that the grid never enters it, so unlike the
 * ripple carrier and the sparkle cells this one does not need to follow the
 * stone. */
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
 *
 * ═══ ROUND 10-A — THE GATE STRENGTHENS, AND ON `healthy` IT STOPS BEING A
 * VALUE GATE AT ALL. This constant is UNCHANGED at 1.0; what changed under it
 * is FOG_RADIUS_OUT (0.30 → 0.203, scaled with the stone). ═══
 *
 * The asymmetry compresses local x < 0 by `uFogAsym = max(rxOut/rxIn, 1)`, and
 * since the quad's half-width IS rxOut, the inward falloff coordinate is
 * `x/rxOut · rxOut/rxIn = x/rxIn` — i.e. **while asym > 1 the inward geometry
 * depends only on rxIn, and rxIn did not move** (it is |CRYSTAL_POS.x|·clear·w,
 * keyed to the placement, not to the radius). So the whole derivation above
 * carries over verbatim wherever the clamp is inactive:
 *   · BROKEN: rxOut/rxIn = 0.203/0.17 = **1.194** (was 1.765). Still > 1, so
 *     the falloff still reaches exactly 0 AT the centre-line, and the worst
 *     case (1280, copy edge 37 px past centre) is the SAME alpha **0.017 ⇒
 *     5.8:1**, with the same 9.6× headroom to the 0.164 AA break point.
 *   · HEALTHY: rxOut/rxIn = 0.203/0.22 = **0.923 < 1**, so the driver's
 *     `Math.max(…, 1)` now pins it SYMMETRIC — and symmetric is no longer the
 *     dangerous state, because the radius is smaller than the placement: the
 *     quad's inward bound lands at 0.22 − 0.203 = **0.017·w RIGHT of the
 *     centre-line**. The quad never crosses the centre-line at any width.
 *     Alpha under the 1280 copy edge goes 0.0088 → **0.0011, below the
 *     shader's 0.002 Discard floor**, i.e. literally not painted there.
 * ⚠ CONSEQUENCE FOR THE DEV HANDLE: on `healthy`, `feel.fogClear` is inert for
 * any value ≥ 0.923 (asym stays pinned at 1) and only tightens below it. On
 * `broken` it behaves as documented. The clamp to [0,1] in the driver is
 * unchanged and still the enforcement.
 *
 * ⚠⚠ CHECK-ROUND — THE "GEOMETRIC GATE" ON `healthy` IS **CONDITIONAL ON
 * VIEWPORT WIDTH**, and the first pass of this entry stated it unconditionally.
 * What is unconditional is only that the QUAD stops 0.017·w right of the
 * centre-line. The COPY does not stop at the centre-line — it crosses it, and
 * how far it crosses is not a fixed fraction of w, because `--margin` steps
 * (2/4/6/10rem at 768/1024/1280) while the 34em measure is nearly constant
 * (the font clamp pins at 0.95rem below 1448 px). Re-deriving the same table
 * this entry already carries, but down through the steps — copy right edge vs
 * the centre-line, then the resulting healthy alpha and `--ink-mute` contrast:
 *       w     edge    α(0.203)  ratio      α(0.30, the old quad)  ratio
 *      768   +197 px   0.488    3.3:1            0.497            3.2:1
 *      900   +131 px   0.336    3.8:1            0.361            3.7:1
 *      958   +102 px   0.165    4.7:1            0.201            4.5:1
 *     1024   +101 px   0.135    4.9:1            0.171            4.6:1
 *     1152    +37 px   0.002    6.0:1            0.012            5.9:1
 *     1280    +37 px   0.001    6.0:1            0.009            5.9:1
 *    ≥1366   left of centre — nothing painted, either quad
 * So: the Discard floor is cleared for every width **≥ ~1152 px** (and the
 * ≥1280 branch clears it by construction — it would need w < 1272 to fail, and
 * that branch starts at 1280). Below that the fog IS painted under the copy's
 * right edge, and below **~958 px** it crosses the 0.164 AA break.
 * THREE THINGS THAT MATTER ABOUT THAT:
 *   (a) It is PRE-EXISTING, not introduced here. The right-hand columns are the
 *       shipped 0.30 quad and they are worse at every single width.
 *   (b) This round is a STRICT IMPROVEMENT everywhere, provably, not just in
 *       the sampled rows: with the clamp pinned symmetric the falloff
 *       coordinate is |x − 0.22w|/rxOut, and rxOut fell, so |q.x| rose at every
 *       width ⇒ alpha fell at every width. Same in the asymmetric regime,
 *       where the inward geometry depends only on rxIn (unchanged).
 *   (c) It is NOT fixable from this constant. Below ~807 px the copy's right
 *       edge is further right than the crystal's own centre (0.22·w), so no
 *       value of FOG_CLEAR — which can only walk the INWARD zero out to
 *       0.22·w — can clear it. It is a layout fact (a 34em measure inside a
 *       4rem gutter on a ~800 px viewport reaches two thirds across the page),
 *       and the section files are frozen. Recorded, not fixed.
 * Note the tier gate does NOT cover this: `lite` is `fxBudget.level ≤ 2` =
 * coarse pointer OR < 768 px, so a 768–1150 px FINE-POINTER window (a resized
 * desktop browser, 1024×768, 1152×864) mounts the full stone and its fog.
 * ⚠ AND THE STANDING WARNING STILL STANDS: this is keyed to the copy measure
 * (`max-w-[34em]` in `container-px`) and to FOG_GAIN/FOG_OPACITY, none of which
 * moved this round. Re-run the table if any of them do.
 */
export const FOG_CLEAR = 1.0;
/** OUTWARD x radius, a fraction of the rect WIDTH (not half-width), away from
 * the type column.
 *
 * ROUND 8-E (0.30): the quad's right bound was 0.30 + CRYSTAL_POS.x (0.17 /
 * 0.22) = 0.47 / 0.52 of the width from centre, against a 0.50 viewport
 * half-width — so on `healthy` the geometry's last 0.02·w was off-screen, and
 * hygiene rule (a) survived only because alpha at the screen edge was 0.0015,
 * under the shader's 0.002 Discard floor.
 *
 * ═══ ROUND 10-A — 0.30 → **0.203** (= 0.30 · ρ), scaled WITH the stone. ═══
 * The fog is not a page decoration whose size is free: its job is to give the
 * silhouette a graded surround, so what is fitted is the STONE's position on
 * the falloff, and that is a ratio. The fog quad's world size is deliberately
 * independent of the group scale (CrystalCluster divides by `s`), so a naive
 * CRYSTAL_SCALE change would have left a 0.30·w glow around a 0.68× stone —
 * the stone would have retreated onto the bright core and lost the swing that
 * makes it read as mass. Scaling both radii by ρ keeps it EXACT:
 *     stone corner radius in fog units, r = √[(1.3945·S·(h/w)/FRO)² +
 *                                             (1.6600·S/FRY)²]
 *     @ 0.170 / 0.30 / 0.46 (1440×725):  √(0.3979² + 0.6135²) = **0.7312**
 *     @ 0.115 / 0.203 / 0.311:           √(0.3978² + 0.6138²) = **0.7314**
 * — so BACKDROP_GAIN's whole §B4.2 argument (crossover at r = 0.41, stone
 * spanning to r ≈ 0.7, "darker-than in the middle, lighter-than at the
 * extremities") is preserved to 0.03 %, and the value table does not move.
 * QUAD-EDGE HYGIENE IMPROVES from "3 px of margin" to structural: the right
 * bound is now 0.203 + 0.17/0.22 = **0.373 / 0.423** of the width from centre
 * against the 0.50 half-width, i.e. the falloff terminates 0.077–0.127·w (≈99–
 * 163 px at 1280) INSIDE the viewport on both modes. Nothing can cut on the
 * screen edge any more. It also turns the a11y clearance on `healthy` from a
 * value gate into a geometric one — see FOG_CLEAR.
 * The standing warning is unchanged: raising this, FOG_FALLOFF or FOG_OPACITY
 * without re-checking the edge margin is how the "vecchi blocchi pagina"
 * failure comes back. */
export const FOG_RADIUS_OUT = 0.203;
/** Y radius (fraction of the rect height).
 * ROUND 8-E (0.46): 0.46 + |CRYSTAL_POS.y| (0.05 / 0.06) ≈ 0.51–0.52, i.e. the
 * quad's zero-alpha bound landed essentially ON the band bounds.
 * ROUND 10-A — 0.46 → **0.311** (= 0.46 · ρ), the y half of the same
 * ratio-preserving scale (derivation on FOG_RADIUS_OUT). The bound is now
 * 0.311 + 0.05/0.06 = **0.361 / 0.371** of band height from the band centre
 * against the 0.50 half-height, so the falloff reaches zero ~0.13·rect.h inside
 * the band instead of exactly on it: strictly more headroom against bleeding a
 * visible value into the chapter block above (whose right cell carries
 * `--ink-mute` copy) or into the next section.
 * ⚠ CHECK-ROUND — THIS IS THE ONLY BAND-KEYED CONSTANT IN THE FOG. Its twin
 * FOG_RADIUS_OUT keys off rect.w, and the band is full-bleed so rect.w ≡ the
 * viewport width and cannot grow; rect.h can, and is about to (round-11:
 * §problem 1330 → ~4392 px). Band-keyed, this becomes a 1366 px world-y radius.
 * Worse, it is HALF of the corner-radius identity r = 0.7314 that BACKDROP_GAIN
 * §B4.2 rests on, so it must move in the SAME commit as CRYSTAL_SCALE or the
 * pairing breaks: with the stone viewport-keyed (C_vp 0.0926) and this left
 * band-keyed at a 4392 px band, r's y-term collapses **0.614 → 0.101** and the
 * stone sits entirely inside the bright core — §B4.2's "glowing blob" failure,
 * back. The prepared value is **FRY_vp = 0.311 · 725/900 = 0.2505** against a
 * viewport-keyed `ry = ih · FRY_vp · k`, which restores the y-term to 0.6138
 * exactly. Full table on CRYSTAL_SCALE ("PREPARED CHANGE"). */
export const FOG_RADIUS_Y = 0.311;
/** Per-mode twin of `FOG_RADIUS_Y` — see `CRYSTAL_SCALE_BY_MODE` for why this
 * had to stop being a shared scalar before the band pin moved, and for where
 * the pin rebase actually lives (the driver, on the same factor as the
 * stone: `s` and the fog-y must move together or `r = 0.7314` breaks). */
export const FOG_RADIUS_Y_BY_MODE: Record<LatticeMode, number> = {
  broken: FOG_RADIUS_Y,
  healthy: FOG_RADIUS_Y,
};
/** Exponent on the `smoothstep(1,0,r)` radial falloff. The round-7-3 §B.4
 * spec names `smoothstep(1,0,r)²`; at 2.0 the mass concentrates inside
 * r < 0.4 and the stone (which spans out to r ≈ 0.7) sits almost entirely on
 * the bright core with nothing left over for a surround. 1.35 spreads value
 * across the footprint so the stone's mid-body sits on the core (darker than
 * its surround, igloo's 0.79 ratio) while its extremities cross onto the dim
 * tail (brighter than its surround) — igloo's own read: "across the frame it
 * swings from lighter-than to darker-than, which is why it reads as MASS"
 * (§B1). Set 2.0 to restore the spec-verbatim curve.
 * ROUND 10-A — unchanged, and the "spans out to r ≈ 0.7" it rests on is
 * unchanged with it: FOG_RADIUS_OUT/Y were scaled by the same ρ as the stone
 * precisely so this number stays put (0.7312 → 0.7314, derivation there). The
 * fog reads smaller on screen because the stone does; their relationship — the
 * only thing this exponent was fitted against — is untouched.
 * ⚠ TRAP #12 DOES NOT APPLY HERE, checked rather than assumed: crystalFog
 * varies `positionLocal.xy` and evaluates `smoothstep(1,0,r)` in the FRAGMENT,
 * so nothing interpolates a smoothstep across the quad. The quad also got
 * NARROWER this round — full width 2·FOG_RADIUS_OUT = 0.60·w → **0.406·w** —
 * which moves it further from the case that failed on phones, not closer. */
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
 *
 * ROUND 10-A — 8.0 STANDS, INCLUDING REASON 4, WHICH IS THE ONLY ONE THE
 * SHRINK COULD HAVE BROKEN. Reason 4 is geometric ("the crossover radius moves
 * to r = 0.41 while the stone still spans to r ≈ 0.7"), and it is stated in FOG
 * FOOTPRINT units — so it would have collapsed if the stone had shrunk inside a
 * fixed fog (the stone would have ended entirely inside r < 0.5, i.e. sitting
 * on the core with no lighter-than half to swing to). FOG_RADIUS_OUT/Y were
 * scaled by the same ρ as the stone precisely to stop that: the corner radius
 * is 0.7314 against 0.7312 before, and the crossover is untouched at 0.41
 * because nothing in the falloff, the gain, the opacity or the body moved.
 * Reasons 1–3 are pure value arithmetic and are scale-free by construction. */
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

// ═══════════════════════════════════════════════════════════════════════════
// === ROUND 14 — ICE UPGRADE (the igloo-grade ice pass) ======================
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Dossier: scratchpad/dossiers/crystal-ice.md §9 (staged proposal) on top of
 * research/2026-08-21-igloo-stones-dossier.md §2 (the measured anatomy). Six
 * stages, each behind its OWN one-line kill-switch below, each a new branch in
 * crystalBuild's `shade` Fn. The lite tier builds ONLY stage B's analytic
 * proxy / baked chord; everything else is `!lite`. Nothing in the meteor
 * hold, tumble, callouts, GLB silhouettes, render order, alpha/Discard
 * contract or the bloom threshold moves: the stages add uniforms and ALU,
 * not choreography.
 *
 * VALUE-WORLD RE-LEVEL (8-F / 8-H tables, lumLin): the ordering
 *   body (0.0396 typ) < lobe / rim (0.276) < ceiling (1.35) < hairline bloom
 * is preserved by construction. Every new term is either a MULTIPLY on the
 * body (stage B, mean 1.0 at the median chord by construction) or an ADDITIVE
 * sub-ceiling term bounded below the ceiling (C <= 0.29 worst case, D coat
 * 0.35 peak on a pinpoint, env <= 0.25 at grazing). Stage F's glints are
 * added AFTER the ceiling exactly like the hairline, >= 1.10 post-blend, on
 * ~4 % of the fine cells only.
 */

// --- Stage B — Beer–Lambert absorption / milky depth ------------------------
/** KILL-SWITCH — false restores the flat `uBodyDarken` multiply exactly. */
export const ICE_ABSORB = true;
/**
 * Transmittance colour AT THE REFERENCE CHORD (three's `attenuationColor`
 * convention: T = C^(dist / ref)). Chosen so its LINEAR luminance is ~0.30 =
 * BODY_DARKEN, i.e. a median-thickness path transmits exactly what the flat
 * multiply did, and the 8-F body row (0.0396) is unchanged at the median.
 * Hue: cool navy-cyan (0.107, 0.332, 0.552 linear → lum 0.300), so DEEP paths
 * go navy-blue and THIN edges (T → 1) go clear — the igloo "dark cool body,
 * bright thin rims" read.
 */
export const ABSORB_COLOR = "#5C9CC4";
/**
 * Reference chord per mode, in CRYSTAL UNITS: the MEDIAN baked chord of the
 * shipped GLB (measured 2026-08-27 by raycasting −normal from every vertex,
 * back faces only; intact p05/p50/p95 = 0.39 / 1.93 / 2.72, fractured 0.11 /
 * 0.93 / 2.16 — the pieces are half as thick as the slab). Per mode so BOTH
 * bodies sit at 0.30 mean transmittance at their own median; otherwise the
 * broken stone would run ×1.9 brighter than the healthy one.
 */
export const ABSORB_REF_CHORD: Record<"healthy" | "broken", number> = {
  healthy: 1.93,
  broken: 0.93,
};
/** 0 = today's flat multiply, 1 = pure Beer–Lambert. 0.7 keeps 30 % of the
 * flat term so the thinnest edges do not go fully clear. */
export const ABSORB_MIX = 0.7;
/** Milky depth: lerp T toward its own luminance (desaturate deep paths). */
export const ABSORB_MILK = 0.35;
/** Analytic thickness proxy (procedural FALLBACK geometry only — the authored
 * slab carries a baked `aThick` on both tiers): thick = ref·(A + B·(N·V)²).
 * At the typical N·V ~0.7 that is 0.99·ref, so the proxy's median matches the
 * baked one. */
export const THICK_PROXY_A = 0.35;
export const THICK_PROXY_B = 1.3;

// --- Stage A — screen-space blurred refraction + RGB dispersion --------------
/** KILL-SWITCH — the framebuffer branch is not BUILT when false. */
export const REFR_SCREEN = true;
/** GATE — the three/webgpu WebGL2 fallback backend (the MARK_RT_WEBGL2
 * idiom): the copy path exists there (WebGLTextureUtils copyTexSubImage2D +
 * generateMipmaps) but the repo-wide `?backend=webgl2` proof is still open.
 * Until it passes the branch is built on true WebGPU only. */
export const REFR_SCREEN_WEBGL2 = false;
/** Transmission-ray length in crystal units (igloo `thickness` 2 on a ~2-unit
 * cube; the mark uses 0.35 for a MID-depth inclusion — the far wall wants
 * more). Scaled by modelScale in-shader. */
export const REFR_SCREEN_THICK = 1.2;
/** igloo's lod law: log2(size)·roughness·clamp(2·ior − 2) = 0.36 at ior 1.18. */
export const REFR_SCREEN_LOD_K = 0.36;
/** Vogel-disk tap radius in PIXELS at roughness 1 (× roughEff). */
export const REFR_SCREEN_BLUR_PX = 6;
/** Taps per channel (BAKED — the loop is unrolled at build). 3 channels × 4 =
 * 12 fetches/fragment; three's own dispersion does 3 bicubic = 12. */
export const REFR_SCREEN_TAPS = 4;
/** Blend of the framebuffer over the procedural backdrop where the
 * framebuffer's own alpha says something was drawn (fog quad, broken mark).
 * The DOM is NOT in the framebuffer (transparent canvas), so `backdrop()`
 * stays the floor (dossier §8). Live on the dev handle (0 = off). */
export const REFR_SCREEN_MIX = 0.85;

// --- Stage D — PMREM env specular + Schlick fresnel + GGX clearcoat ---------
/** KILL-SWITCH for the env-specular + clearcoat terms. */
export const ICE_ENV = true;
/** Env-specular gain on F_Schlick(f0 = ENV_F0) × pmremTexture(gradient env,
 * R_world, roughEff). The env is the mark's asset-free 16×256 canvas equirect
 * (cyan/blue/navy vertical band), so reflections read as a cool sky band;
 * worst case at grazing ~0.7 lum × F~1 × 0.35 = 0.25 < the rim 0.277. */
export const ENV_GAIN = 0.35;
/** Dielectric f0 for ice (n = 1.31 → 0.018). */
export const ENV_F0 = 0.02;
/** Clearcoat lobe: GGX alpha = COAT_ROUGH², NORMALISED to peak 1 (D·π·α²) on
 * the UN-jittered N against the key half-vector — the wet pinpoint. */
export const COAT_ROUGH = 0.06;
/** Peak 0.35 lumLin on a sub-pixel highlight: above the broad lobe (0.276),
 * far under the ceiling. */
export const COAT_GAIN = 0.35;

// --- Stage C — internal frost / crack parallax layers ------------------------
/** KILL-SWITCH for the inner layers. */
export const ICE_INNER = true;
/** Depths along the k=0 refracted ray (crystal units): the ember-core idiom
 * generalised; the mark sits at 0.35, between layers 1 and 2. */
export const FROST_LAYER_DEPTHS: readonly number[] = [0.25, 0.6, 1.1];
/** Fractal-noise frequency per layer (mx_fractal_noise_float, 3 octaves). */
export const FROST_LAYER_FREQ: readonly number[] = [2.2, 3.1, 4.6];
/** Which layers carry the (27-cell) worley milk; the deepest skips it. */
export const FROST_LAYER_MILK: readonly boolean[] = [true, true, false];
export const FROST_MILK_FREQ = 1.4;
/** Navy-tinted white (the transplant plan's frost colour). */
export const FROST_LAYER_COLOR = "#CFE2F0";
/** Master gain. Worst case (milk 1, cracks 1, all layers): (0.35 + 0.22) ×
 * Σ e^(−depth·1.2) = 0.57 × 1.50 × 0.45 × 0.75 lum = 0.29, under the lobe. */
export const INNER_GAIN = 0.45;
/** Deeper = dimmer: w = exp(−depth·INNER_ATTEN). */
export const INNER_ATTEN = 1.2;
/** Ridged-noise seam window → thin bright cracks (sub-bloom by construction). */
export const CRACK_LO = 0.86;
export const CRACK_HI = 0.97;
export const CRACK_GAIN = 0.22;
export const MILK_GAIN = 0.35;

// --- Stage E — finer screen-stable micro-facet glints ------------------------
/** KILL-SWITCH for the second sparkle layer. */
export const ICE_SPARKLE2 = true;
/** Cells per crystal unit (~3 px at the measured 83 px/unit band). */
export const SPARKLE_FREQ2 = 27;
export const SPARKLE2_TILT = 0.6;
export const SPARKLE2_POW = 120;
export const SPARKLE2_DENSITY = 0.8;
/** Sub-bloom (<= the key lobe). */
export const SPARKLE2_GAIN = 0.22;
/** fwidth fade: cells narrower than FADE_PX[0] screen px vanish, fully in by
 * FADE_PX[1]: no shimmer at the far scroll positions. */
export const SPARKLE2_FADE_PX: readonly [number, number] = [2, 5];

// --- Stage F — sparse bloom glints + env-edge hairline (post-ceiling) --------
/** KILL-SWITCH — off (with ENV_EDGE_GAIN 0) is the igloo-faithful variant. */
export const ICE_BLOOM_GLINTS = true;
/** Added AFTER the uCeil clamp on the fine cells: keyC (lum 0.90) × 1.3 =
 * 1.17 col-lum → 1.10 post-blend > threshold 1.0 (the hairline's exact
 * arithmetic, RIM_EDGE_GAIN). */
export const GLINT_BLOOM_GAIN = 1.3;
/** smoothstep(D, D + 0.03, hash) ⇒ ~4 % of the fine cells. */
export const GLINT_BLOOM_DENSITY = 0.93;
/** Second hairline: env specular on the extreme-grazing band (same
 * uRimEdgeStart gate), post-ceiling. */
export const ENV_EDGE_GAIN = 0.6;

// ═══════════════════════════════════════════════════════════════════════════
// === ROUND 14 WAVE 2 — THE FROSTED METEORITE (igloo hero-block read) =======
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Owner reference: igloo.inc's hero slab — a chunky frosted block, white
 * fibrous striations on the crust, whiter ridges, and a 3-D logo mesh INSIDE
 * seen only through refraction (blurred by the frost, strongly dispersed).
 * Ours: the same construction with a space / meteorite mood — dark navy body,
 * cool blue-white frost, sparse dark mineral inclusions, and the SerSan mark
 * glowing cyan inside as the single bright accent. Four features, each behind
 * its own one-line kill-switch, each a live gain on the dev handle:
 *   1. MARK_INSIDE_MESH — the mark is a REAL mesh inside BOTH stones (the
 *      broken band already had it; the healthy band drops its render-once RT
 *      for the same mesh), drawn BEFORE the crystal so stage A refracts it.
 *   2. ICE_TWO_PASS — igloo's own trick: the inner object rendered into its
 *      OWN mipmapped RT (crystalInnerRT.ts) and sampled through the SAME
 *      projective ray walk as stage A, per channel, with the thickness smear
 *      and the roughness-driven lod — so the mark blurs under the crust.
 *   3. ICE_CRUST — ridge whitening from a baked per-vertex curvature (`aCurv`,
 *      one float slot: healthy 5, broken 7, ≤ 8) + anisotropic striations
 *      stretched along a per-patch tangent (aFacet-seeded), modulating the
 *      frost albedo, the normal, the local roughness and the opacity.
 *   4. ICE_METEORITE — absorption hue re-aimed at navy-charcoal at the SAME
 *      luminance as wave 1 (mean body unchanged), worley inclusions inside.
 * VALUE WORLD: body 0.04 < frost (≤ CRUST_LEVEL 0.2 at a ridge) < lobe/rim
 * 0.276 < ceiling 1.35 < hairline. The mark core (MARK_CORE_HDR) is the ONE
 * new term allowed past 1.0, and only after the body multiply on thin chords.
 */

// --- 1. The mark as a mesh inside both stones -------------------------------
/** KILL-SWITCH — false restores wave 1: healthy samples the render-once mark
 * RT in-shader (crystalMarkRT), broken keeps its mesh. */
export const MARK_INSIDE_MESH = true;
/** Healthy-band vertical offset of the mesh (crystal units). The intact slab
 * is the SAME block the fractured file partitions, so the broken band's
 * measured −0.5 (MARK_MESH_Y) is the starting point; separate so the two can
 * be judged independently. */
export const MARK_MESH_Y_HEALTHY = -0.5;
/** Healthy-band emissive intensity of the cyan core (HDR, ≥ 1.0 so the mark
 * blooms SOFTLY through the ice: ×body ≈ 0.3 at the median chord ⇒ ~0.9–1.2
 * lum only where the chord is thin). The broken band keeps its meteor-hold
 * ride (MARK_LIT_BASE → MARK_LIT_PEAK) untouched. Live: `feel.markCoreHdr`. */
// 3.0 -> 8.0, MEASURED ON THE WEBGPU RENDER, not derived (owner 2026-09-04:
// "nel secondo meteorite, quello pieno non frammentato, non si vede bene il
// logo dentro"). The desk analysis said 4.0 was the ceiling — blue leaves the
// body multiply at ~1.45, clipping against CRYSTAL_CEIL 1.35 and blooming —
// and predicted a glowing blob past it. On the actual stone that is not what
// happens: the ceiling CLAMPS the flooded surround instead of haloing it, so
// the mark's own silhouette gains contrast while the crystal keeps its
// facets. A/B at 3.6 / 6 / 8 / 10 / 12 on the live uniform: 3.6 is a mushy
// dark form, 6 is legible but soft, 8 is the read the owner asked for, 10
// starts flooding the glow out to the silhouette edge and 12 pushes it past.
// Verified at 8 with bloom on, full reveal, band entry and exit: no halo
// outside the stone. Lower toward 6 if a future bloom-threshold change makes
// it bleed. Sharpness (INNER_LOD_K) and dispersion (INNER_CA) do the rest.
export const MARK_CORE_HDR = 8.0;

// --- 2. Two-pass inner transmission (igloo's transmission RT) ---------------
/** KILL-SWITCH — the inner-RT branch is not built and the RT never allocated
 * when false. Full tier only (lite never gets an RT). */
export const ICE_TWO_PASS = true;
/** GATE — the WebGL2 fallback backend. The rig is the crystalMarkRT rig
 * (proven on both backends). WAVE 2.1: false — parity with MARK_RT_WEBGL2
 * (the same rig class, same unproven half-float mip chain on the fallback);
 * the sample branch was compile-proved on the fallback while this was true.
 * Flip true only after the `?backend=webgl2` LOOK proof passes. */
export const INNER_RT_WEBGL2 = false;
/** RT size CAP (px, longest side); the RT is screen × INNER_RT_SCALE clamped
 * to this, resized with the canvas (never per frame). */
// 1024/0.5 -> 1536/0.75 (owner 2026-09-04: "nel secondo meteorite, quello
// pieno non frammentato, non si vede bene il logo dentro"). The on-screen
// blur of the inner tap goes as 2^lod / rtSize, so a 1.5x linear RT cuts the
// kernel by ~1.4x for the same lod. Deliberately NOT 2048/1.0: that
// quadruples the HalfFloat clear + mip regeneration every frame the stone is
// on screen, and both stones can be on frame during the traverse. Watch
// `__sersanCrystal_*.innerRt.lastMs` against the 0.8 ms QA budget.
export const INNER_RT_SIZE = 1536;
export const INNER_RT_SCALE = 0.75;
/** Samples of the inner ladder (BAKED — unrolled). igloo AWESOME_SAMPLES 3:
 * 3 × RGB = 9 fetches on a ~0.4 MP RT. */
export const INNER_SAMPLES = 3;
/** igloo's lod law on the inner RT: lod = log2(size)·roughEff·this. 0.36 =
 * clamp(2·ior − 2) at ior 1.18; the crust raises roughEff on top. */
// 0.36 -> 0.22 (the biggest single lever on legibility, and it touches only
// the mark). lod = log2(rtSize)·roughEff·this; at roughEff 0.41 that is
// 1.46 -> 0.89 (2.75 -> 1.85 texels), and on the crust ridges (roughEff ~0.60)
// 2.14 -> 1.31. 0.22 is the CONSERVATIVE middle: it keeps the "penguin in
// ice" coupling where the frost veins and the crust still modulate the mark's
// softness, instead of 0.16, which reads crisper than the ice around it and
// starts to look like a decal rather than something embedded. The ice's own
// screen refraction keeps REFR_SCREEN_LOD_K 0.36, so the stone's surface
// blur, frost, crust and env are byte-identical.
export const INNER_LOD_K = 0.22;
/** Transmission-ray length to the inner object (crystal units, × modelScale
 * in-shader). The mark sits at mid-depth: 0.6 + the smear reaches the far
 * half. */
// 0.6 -> 0.4: the lateral displacement is len·sin(delta), so at 0.6 crystal
// units and delta up to 32 deg the mark warped by up to ~0.32 units (~40 CSS
// px) near the silhouette, and `smearI` rides the same constant so the three
// samples ghosted by the same order. The mark sits at y -0.5 in a +/-1.66
// slab, so 0.4 still lands on it: -33% warp and -33% ghost for nothing.
export const INNER_THICK = 0.4;
/** Chromatic spread of the inner ladder — igloo uChromaticAberration 0.1;
 * higher than the body's CRYSTAL_CA because the mark is where the owner wants
 * to SEE the fringes ("strong chromatic dispersion"). Fresnel-boosted by
 * CA_EDGE_BOOST like the body's. */
// 0.16 -> 0.09. caI is fresnel-boosted by (1 + fres·CA_EDGE_BOOST 1.6), so
// near the silhouette the effective spread reached 0.42 of the eta step and
// the strokes split into three coloured copies. 0.09 keeps a visible fringe —
// the owner's "strong chromatic dispersion" for the inner object survives —
// while the three ladders re-converge ON the strokes.
export const INNER_CA = 0.09;
/** Blend of the inner RT over `trans` by its own alpha (mix, not add — an
 * opaque object inside replaces what was behind it). 0 = live off. */
// 0.9 -> 1.0 — free, and the only change here with no downside: at full RT
// alpha this stops 10% of the navy-cyan backdrop being mixed back over the
// mark (+11% on the core, a harder silhouette edge). At the blurred rim,
// where alpha is partial, the composite is unchanged.
export const INNER_MIX = 1.0;
/** When the two-pass branch is live on the HEALTHY band, the mark is hidden
 * from the main pass (it is already in the RT — igloo hides its inner object
 * in pass 2). The broken band keeps it visible: the shards' gaps ARE the
 * reveal and the crystal never covers them. */
export const INNER_HIDE_MAIN_HEALTHY = true;
/** WAVE 2.1 — treat the mipmapped inner-RT tap as PREMULTIPLIED: the RT is a
 * straight-alpha opaque mark over a (0,0,0,0) clear, so the mip average darkens
 * the colour wherever alpha < 1 (a dark halo around the blurred mark). The
 * shader divides the ladder's colour by max(alpha, 1e-3) before the mix-by-
 * alpha composite. false = wave-2 raw tap. */
export const INNER_UNPREMUL = true;

// --- 3. Frost crust ---------------------------------------------------------
/** KILL-SWITCH — no `aCurv` bake / slot, no crust branch. */
export const ICE_CRUST = true;
/** Master frost gain (0…1.5). */
export const CRUST_GAIN = 0.85;
/** Sharpens the baked curvature toward the ridges: crust ∝ curv^pow. */
export const CRUST_RIDGE_POW = 1.6;
/** Frost floor on a flat face interior (fraction of the ridge value) — the
 * "faces more translucent, ridges whiter" split of the reference. */
export const CRUST_FACE_FLOOR = 0.22;
/** Frost albedo LEVEL (lumLin at crust = 1): under the lobe/rim (0.276),
 * well above the body (0.04) — it is what makes the crust read WHITE. */
export const CRUST_LEVEL = 0.2;
/** Body (transmission) reduction where the crust is high — the crust makes
 * faces more opaque: col·(1 − crust·this). */
export const CRUST_BODY_K = 0.55;
/** Alpha lift where the crust is high (× uAlpha, clamped ≤ 1). */
export const CRUST_ALPHA_K = 0.05;
/** Frost albedo pair (cool blue-white): face → ridge. */
export const CRUST_COLOR_FACE = "#CFE2F0";
export const CRUST_COLOR_RIDGE = "#EAF3FF";
/** Broken band: fracture (inward-facing cut) faces keep this fraction of the
 * crust — fresh ice over rock. Outwardness = dot(N_local, p̂). */
export const CRUST_FRACTURE_K = 0.35;
/** WAVE 2.1 — the curvature bake groups coincident vertices PER SHARD (key =
 * position + aCentr) on the broken band. Shards touch at rest, so a position-
 * only group pairs a fracture face with its neighbour's back-to-back face
 * (dot = −1 ⇒ a fake 1.0 ridge on every fracture-face vertex and along every
 * outer-skin crack line). false = wave-2 position-only grouping. */
export const CRUST_CURV_PER_SHARD = true;
/** Striations: anisotropic fractal noise stretched STRETCH× along the
 * per-patch tangent (k1 = FREQ/STRETCH along, k2 = FREQ across). Full tier. */
export const GRAIN_STRETCH = 8;
export const GRAIN_FREQ = 14;
/** Normal perturbation along the bitangent by the striation signal. */
export const GRAIN_NORMAL_AMP = 0.12;
/** Local roughness raise under the crust: roughEff·(1 + crust·this) — the
 * interior blurs more under the frost (igloo's roughness-map effect). */
export const GRAIN_ROUGH_K = 0.9;

// --- 4. Meteorite mood ------------------------------------------------------
/** KILL-SWITCH — absorption hue and inclusions. */
export const ICE_METEORITE = true;
/** Absorption HUE target. ⚠ Used as a CHROMATICITY only: re-levelled in JS to
 * ABSORB_COLOR's luminance (0.30 at the reference chord) so the mean body is
 * byte-for-byte wave 1's re-level — the stone is navy, not a black hole. */
export const METEORITE_ABSORB = "#0F1B2E";
/** 0 = wave-1 hue, 1 = pure METEORITE_ABSORB chromaticity. */
export const METEORITE_ABSORB_MIX = 0.65;
/** Dark mineral inclusions: worley cells at the stage-C layer depths, dark
 * where the cell distance < INCLUSION_R (sparse dots), darkening the body by
 * this gain. Full tier (rides innerOn). */
export const INCLUSION_GAIN = 0.7;
export const INCLUSION_FREQ = 3.4;
export const INCLUSION_R = 0.16;

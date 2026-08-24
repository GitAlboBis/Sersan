# Round 8 — Blender slab authoring log (SERSAN's own crystal, not a procedural ball)

- **Job**: author `crystal-intact.glb` + `crystal-fractured.glb` to the silhouette statistics measured off igloo's real Draco meshes in `2026-08-22-round8-stone-source-anatomy.md` §A1/§C2.
- **Date**: 2026-08-24. Repo HEAD at dispatch `17b49e7`. **No repo source file was modified** — this task produced assets + this document only.
- **Blender**: 5.1.2, driven live over the Blender MCP (port 9876). Scene was the unsaved default (`bpy.data.filepath == ""`); only the default Cube was removed. Nothing of the owner's was saved over.
- **Owner's complaint this answers** (verbatim, 2026-08-22): *"le pietre non mi sembrano per niente come quelle nel sito igloo"*, sharpened mid-task to *"è completamente diversa da quella di ghiaccio del sito igloo"* — ours read as a lumpy potato, igloo's as an angular slab.

---

## 1. HEADLINE — the four gate statistics, final

Measured on the **shipped** geometry (welded, triangulated, after the final re-fit), with the same metric definitions the anatomy doc used.

| statistic | igloo band | doc target | **INTACT (shipped)** | **FRACTURED (shipped)** | old procedural |
|---|---|---|---|---|---|
| **fillRatio** (mesh vol ÷ bbox vol) | 0.434–0.547 | 0.45–0.55 | **0.4725** ✅ | **0.4811** ✅ | 0.339 ✗ |
| **concave area share** | 0.9–9.3 % | 3–9 % | **6.33 %** ✅ | 22.4 % ¹ | **0.0 %** ✗ |
| **largest-1%-faces area share** | 6.1–20.4 % | 6–12 % | **6.22 %** ✅ | **10.78 %** ✅ | 2.3 % ✗ |
| **dihedral p99** | 97.2–124.4° | 97–124° | **123.5°** ✅ | **113.2°** ✅ | 70.0° ✗ |

¹ Expected and correct for the fractured variant: the Voronoi cut faces are interior-facing by construction, so "faces pointing away from the cluster centroid" counts every internal split. The 3–9 % band describes an *intact* stone; the intact variant hits it.

**Secondary statistics** (context, not gates — igloo's own spread in brackets):

| | igloo | INTACT | FRACTURED |
|---|---|---|---|
| bbox (glTF X,Y,Z) | 2.03×2.40×1.57 (cube1) | **2.789 × 3.32 × 2.158** | same |
| proportions | .84 / 1 / .65 (cube1) | **.84 / 1 / .65** exact | same |
| axis-aligned area ±5° | [3.7–14.9 %] | 6.77 % | 4.07 % |
| axis-aligned area ±15° | [19.1–22.4 %] | 41.8 % ² | 27.8 % |
| areaTop5% | [20.7–40.1 %] | 17.5 % | 29.2 % |
| dihedral p50 / p90 | [13–28 / 44–75] | 0.7 / 66.8 ³ | 0.4 / 44.4 |
| % edges > 60° | [4.6–17.5 %] | 11.4 % | 7.4 % |
| chipDepth p50 / p90 | [.084–.123 / .166–.202] | .057 / .164 | .061 / .178 |
| vol ÷ convex-hull vol | — | 0.893 | 0.909 |
| **folded edges (>150°)** | — | **0.00 %** | **0.00 %** |

² The one statistic materially outside igloo's range. Driven down from 74 % by tilting the base block, but pushing further (more/deeper cuts) traded away fillRatio and the large planar facets — which per the mid-task correction outrank it. Stated, not hidden.
³ p50 is near zero *because* the mesh is genuinely piecewise planar: most edges are interior to a flat facet. That is the goal, not a defect — see §2.

## 2. FACET COHERENCE — the mid-task priority, and the metric that actually captures it

The correction was that facet size is doubly load-bearing: `MARK_GAIN` 0.35 → 2.4 never made the in-ice mark legible, because high-frequency faceting shreds the refracted image.

**Triangle size is the wrong proxy.** Our shader flat-shades a non-indexed soup, so 200 *coplanar* triangles refract as one coherent plane. What matters is contiguous regions of constant normal. So the harness measures **planar patches**: connected components of faces joined across edges whose dihedral is ≤ 8°.

| | INTACT | FRACTURED |
|---|---|---|
| planar patches, total | **34** | 76 |
| patches covering 50 % of surface area | **6** | 12 |
| largest single patch | **19.0 %** of area | 11.4 % |
| top-5 patches | **49.4 %** of area | 30.0 % |
| triangles covering 50 % of area | 116 | 144 |

For contrast, the shipped `IcosahedronGeometry(1,12) + smooth radial noise` has **no coplanar patches at all** — every one of its 3 380 triangles is its own facet, which is precisely why refraction reads as confetti.

**Six flat planes carry half the intact stone's surface.** That is the structural fix for the mark legibility.

## 3. THE RECIPE AS BUILT (reproducible)

Working scripts live outside the repo, in this session's scratchpad:
`…\e6f8ce14-f3d9-4bfa-b773-dfa7c49b3425\scratchpad\` — `slabbuild.py` (block + erosion), `slabfracture.py` (fracture + attributes), `slabstats.py` (the metric harness), `verify-glb.mjs` (container-level export check).

```
base            box 2.03 × 1.57 × 2.40, tilted (7°, 5°, 6°… see below), re-fit
tilt            (7, 5, 4) degrees XYZ, then axes rescaled back to the target box
cleave          20 half-space cuts, offset ∈ [0.76, 0.97] of the support range
                 └ 5 of them "preferred cleavage": normal = a principal axis
                   perturbed by 20°, offset ∈ [0.78, 0.95]
                 cleave_seed 3        (bbox guard OFF — see §4.3)
subdivide       Triangulate → Subsurf SIMPLE ×3
erosion         Displace, VECTOR (RGB_TO_XYZ), Clouds COLOR, size 2.5,
                 noise_depth 0, strength 0.22, coords LOCAL
bite            6 attempted / 2 accepted. Boolean DIFFERENCE, solver EXACT,
                 cutter = randomly-rotated CUBE, half-size ∈ [0.18, 0.34],
                 axis jitter ±0.35, depth ∈ [0.85, 1.10] × R, bite_seed 5
                 └ rejection-sampled: a cutter that adds > 14 folded edges is
                   rolled back and re-rolled
re-tile         Decimate COLLAPSE, ratio 0.07  →  450 triangles
finalize        weld 1e-6, triangulate EAR_CLIP, recentre on bbox,
                 anisotropic re-fit to 2.789 × 2.158 × 3.32 (Blender XYZ)
```

Everything before `finalize` is either an affine map or a plane cut, so **planes stay planes** through the whole chain — that is what makes the anisotropic re-fit legitimate.

## 4. DEVIATIONS FROM THE DOC'S §C3 PLAN — all measured, none silent

### 4.1 `Decimate (Planar/DISSOLVE)` → `Decimate (COLLAPSE)`
The doc calls Planar the load-bearing operator. Measured: DISSOLVE **doubled the folded-edge count** (1.6 % → 3.3 %). It merges across creases into non-convex n-gons that no tessellator triangulates cleanly — and the glTF exporter has to triangulate them anyway. COLLAPSE yields the same non-uniform area distribution, emits triangles directly, and is quadric shape-preserving. `areaTop1` and the patch structure both land in band with it.

### 4.2 Negative-strength Voronoi displace → exact boolean bites
The doc names a negative Voronoi displace as the only route to real concavity. It does produce concavity — and it **folds the surface** wherever the inward step exceeds the local radius of curvature. Measured at 1.2 % of edges sitting at 175–180°, which alone pinned dihedral p99 at 147–165° (target 97–124). An exact boolean cannot self-intersect and leaves a hard rim, which is the crease igloo actually has. Concavity target hit with folds at **0.00 %**.

Two sub-findings worth keeping:
- **Cutter shape matters.** Icosphere cutters produced round craters — the viewport read was golf-ball dimples, not chipped ice. Rotated **cube** cutters remove a wedge bounded by flat faces: a conchoidal chip with straight rims.
- **Rim sharpness is governed by depth ÷ R, inversely.** A *shallow* cap grazes the surface and leaves a near-180° rim; a *deep* one (depth ≈ R) meets it at ~90°. Depth 0.85–1.10 × R with a small R is what brought dihedral p99 from 135° into band while keeping the bite small.

### 4.3 Extra stages the doc does not have, added because the four statistics were otherwise unreachable
- **Planar cleaving.** A displaced cube cannot reach fillRatio 0.45–0.55 *and* large facets: erosion alone parked fill at 0.57–0.66 with `areaTop1` ~4 %. Each half-space cut leaves one big planar facet, a hard crease, removes volume without shrinking the bbox, and pulls vertices off the bbox surface — all four gates at once.
- **Tilt + anisotropic re-fit.** With the bbox guard on, the six original box faces survive every cut and the silhouette stays a warped box (`ax15` stuck at 66–73 %). Tilting the base and re-fitting afterwards is affine, so facet coherence is untouched.
- **Preferred cleavage directions.** A purely random cut set drove `ax5`/`ax15` to ~1 % — a shapeless chip pile. Five axis-biased cuts (20° jitter) restore the principal-plane character real minerals have.

### 4.4 Displacement is VECTOR, not along the normal
On a hard-edged block a per-vertex NORMAL displace tears the surface open at every cleavage crease (the two sides move in different directions): 0.8 % of edges folded. A smooth vector field `p → p + d(p)` is injective while `|∇d| < 1`; the field's Jacobian was measured at 0.16 (max over 1 500 samples), so it warps the block without folding it.

### 4.5 Stage ORDER: bites come **last**, after the erosion
A bite rim meeting a cleavage edge at a grazing angle leaves a thin wedge — not folded, but only hundredths of a unit thick. The erosion field then flips it. Measured: 0 folds before the displace, **298 (0.36 %)** immediately after, with the field Jacobian only 0.16. Displacing the convex block first and cutting afterwards keeps the exact-boolean result exact.

### 4.6 No UV sets
§C2 asks for 2 UV sets (uv1 reserved for a future frost RT). Nothing in `crystalBuild.ts` samples a UV, and the GLB is already the largest asset in `public/models/`. Omitted deliberately; re-add with two `Smart UV Project` passes if the frost RT ever lands.

### 4.7 Triangle budget: 450 (intact) / 1 114 (fractured), against igloo's 6.2–8.0 k
Deliberate, and the direct consequence of the mid-task instruction to bias toward fewer, bigger faces. igloo's 6–8 k triangles mostly *tile* flat regions; ours are the facets themselves. Pushing the collapse ratio up to ~1 600 triangles kept the identical patch structure (still 19.3 % largest patch) but dropped `areaTop1` to 3.8 %, out of band. Cheaper than the current build (3 380 tris) and every triangle is a real facet.

---

## 5. ⚠ CELL FRACTURE IS NOT AVAILABLE IN BLENDER 5.1.2 — precise finding

`bpy.ops.object.add_fracture_cell_objects` **appears** to resolve because `bpy.ops` is a lazy namespace, but it does not exist:

```
op.poll()            -> RuntimeError: Polling operator "..." error, could not be found
op.get_rna_type()    -> 'OBJECT_OT_add_fracture_cell_objects' not found
addon_utils.modules()-> 14 modules, none containing "fracture"
addons_core/         -> bl_pkg, cycles, hydra_storm, io_anim_bvh, io_curve_svg,
                        io_mesh_uv_layout, io_scene_fbx, io_scene_gltf2,
                        node_wrangler, pose_library, rigify, ui_translate,
                        viewport_vr_preview        (no cell fracture)
addon_enable("object_fracture_cell")               -> No module named ...
addon_enable("bl_ext.blender_org.cell_fracture")   -> No module named ...
addon_enable("bl_ext.system.object_fracture_cell") -> No module named ...
```

It is not a disabled add-on the owner can tick on — **it is not installed**. In Blender 4.2+ it moved out of the bundled set; it would have to be installed from extensions.blender.org (or the legacy add-on dropped into the scripts folder).

**Fallback taken** (the task's documented option, implemented as the thing Cell Fracture computes internally): an exact **power / Laguerre diagram** built from half-space bisections.

```
cell_i = slab ∩ { x : |x−p_i|² − w_i ≤ |x−p_j|² − w_j  ∀ j }
       = slab ∩ half-spaces  x·n ≤ c
         n = normalize(p_j − p_i)
         c = (|p_j|² − |p_i|² + w_i − w_j) / (2 |p_j − p_i|)
```

The **weights** `w_i` are solved (Monte-Carlo, 900 interior samples, ~140 iterations) so the piece volumes match `SHARD_SIZES³`. A plain unweighted Voronoi gives roughly equal cells and cannot express our 2-large-bodies family. Sites are seeded with a shoulder bias so the chips cluster near one "impact" region, as a real fracture does.

Result — the pieces tile the slab exactly (Σ piece volume = slab volume, 9.4417):

| piece | volume | share | target (SHARD_SIZES³) | tris | patches | `centr` (glTF frame) |
|---|---|---|---|---|---|---|
| 0 | 4.3490 | 46.06 % | 45.79 % | 304 | 28 | ( 0.6552,  0.2236,  0.0870) |
| 1 | 2.8707 | 30.40 % | 27.27 % | 240 | 21 | (−0.6251, −0.2482, −0.2735) |
| 2 | 0.9664 | 10.24 % | 12.88 % | 136 | 12 | (−0.1599, −0.5492,  0.6641) |
| 3 | 0.5919 |  6.27 % |  7.13 % |  98 | 13 | (−0.4988, −1.2348, −0.0082) |
| 4 | 0.2576 |  2.73 % |  3.24 % | 122 |  9 | ( 0.4699, −1.0314, −0.5690) |
| 5 | 0.2259 |  2.39 % |  1.88 % |  84 | 11 | ( 0.6386, −1.1963,  0.0614) |
| 6 | 0.1158 |  1.23 % |  1.11 % |  84 |  9 | (−0.1289, −1.3918, −0.7286) |
| 7 | 0.0644 |  0.68 % |  0.70 % |  46 |  8 | ( 0.0934, −1.1362,  0.0208) |

Pieces are **ordered by volume, descending**, so index 0/1 are the two large bodies — `EMBER_SHARDS [0,1]` and `BROKEN_CALLOUT_SHARDS [1,3,5]` (large / mid / chip) land exactly as `crystalConfig.ts` intends.

---

## 6. THE ATTRIBUTE CONTRACT — read this before wiring the GLBs in

### 6.1 Names as they survived export

| glTF accessor | type | domain authored | semantics |
|---|---|---|---|
| `POSITION` | VEC3 f32 | — | glTF +Y-up |
| `NORMAL` | VEC3 f32 | — | flat, per facet |
| `_CENTR` | VEC3 f32 | Blender POINT | piece centroid offset from cluster centre → `aCentr` |
| `_RAND` | VEC3 f32 | Blender POINT | stable per-piece random ∈ [0,1]³ → `aRand` |
| `_FACET` | VEC3 f32 | Blender **CORNER** | per **planar patch** random ∈ [0,1]³ → `aFacet` |

three's `GLTFLoader` exposes these as `geometry.attributes._CENTR` / `._RAND` / `._FACET` — rename to `aCentr` / `aRand` / `aFacet` on load.

### 6.2 ⚠ TRAP, measured not assumed — the exporter does NOT rotate custom vector attributes

Blender's glTF exporter converts `POSITION` and `NORMAL` to +Y-up but leaves **custom** vector attributes in Blender's Z-up frame. Caught on the first export: piece 6 came out with `_CENTR (−0.129, 0.729, −1.392)` against a mean POSITION of `(−0.101, −1.460, −0.713)` — exactly the un-rotated value.

**Already fixed in the shipped files.** `_CENTR` is pre-rotated at authoring time, Blender `(x,y,z)` → glTF `(x, z, −y)`, so it lands in the same frame as `POSITION`. Verified after re-export: `max |centr − meanPos| = 0.234`, which is just volume-centroid vs vertex-mean, not a frame error.

`_RAND` and `_FACET` are unitless randoms, not scene directions, and are deliberately **not** permuted.

### 6.3 `_RAND` is bit-compatible with today's shipped values
Generated by a Python twin of `crystalBuild.ts`'s own `h()`:
`h(i, mulA, addB) = fract(sin(i·mulA + addB) · 43758.545)`, with the same three constant pairs `(12.9898, 78.233) / (39.3467, 11.135) / (73.156, 52.235)` and `i` = piece index. So the explode/idle-drift/spin phases are the ones the build already produces for shard `s` — the motion grammar does not change when the geometry does.

### 6.4 `_FACET` is per PLANAR PATCH, not per triangle — and this is the important one
`bakeFacetRand()` in `crystalBuild.ts` assigns a random per **triangle** (`fIdx = i/3` over a non-indexed soup). On the shipped icosahedron every triangle *is* a facet, so that is correct there. On an authored slab a single flat plane is tiled by many triangles, and a per-triangle random would speckle that plane with different `FACET_SPEC_JIT` / `FACET_VALUE_JIT` brightness — **destroying exactly the coherent-facet read the large planes exist to provide, i.e. re-introducing the mark-legibility failure at the shading level instead of the geometry level.**

The GLB therefore ships `_FACET` already baked per planar patch (34 patches intact / 76 fractured, ≤ 8° merge angle).
**The integration must use the exported `_FACET` and must NOT call `bakeFacetRand()` on these geometries.**

### 6.5 Normalisation, and what it means on screen
- Both files are centred on their **bounding box**, bbox `2.789 × 3.32 × 2.158` (glTF X, Y, Z).
- Height (Y) is **3.32**, deliberately identical to the current procedural build's measured bbox height, so `CRYSTAL_SCALE 0.17` and the whole `rect.h·k·scale` chain give the **same on-screen size**. §A1's "on-screen size already matches — do not chase" is preserved by construction.
- Width changes: X 2.41 → **2.789** (+15 %), Z 2.04 → **2.158** (+6 %). That is the move from our `.72/1/.61` to igloo cube1's `.84/1/.65`. Half-width in band-height fractions goes 0.205 → 0.237, i.e. ~3 % of band height further toward the type column on each side. Worth one look against `FOG_CLEAR`'s accessibility derivation, which is keyed to `CRYSTAL_POS.x`, not to the mesh width — so it is unaffected, but the stone now reaches slightly further inward.
- `HEALTHY_CALLOUT_ANCHORS` are specified in post-squash units (x ±1.25, y ±1.8) and still sit inside the new bounds (x ±1.395, y ±1.66) — except `y = ±1.8` which now exceeds the half-height 1.66. **The anchors need a re-check**; they were written against a bbox the comment records as ≈ x ±1.25 / y ±1.8 while the actual old mesh measured y ±1.66.
- The fractured file ships at **gap = 0**, i.e. the pieces tile the intact slab exactly. The shader's `pos += centr·(gap + …)` then explodes them; at `FRACTURE_REST_GAP 1.0` each piece sits at 2× its centroid offset — the same relationship the current build has.
- **Cluster drift**: the volume-weighted mean of `centr` is `(0.126, −0.181, −0.018)` in glTF units, magnitude 0.22 (6.6 % of the bbox height). At gap = 1 the exploded cluster's centre of mass shifts by that much. Subtract it from every `centr` at load if the drift is unwanted — the pieces stay a partition either way.

---

## 7. EXPORT + COMPRESSION RESULTS

`C:\Users\alber\Desktop\sersan-v2-main\public\models\`

| file | raw | gzip | verts | tris | note |
|---|---|---|---|---|---|
| **`crystal-intact.glb`** | **83 672 B** | 13 900 B | 1 328 | 450 | **primary — loads with the repo's current loader** |
| **`crystal-fractured.glb`** | **159 960 B** | 24 717 B | 2 533 | 1 114 | **primary** |
| `crystal-intact.draco.glb` | 4 088 B | 3 348 B | 1 328 | 450 | Draco, needs a `DRACOLoader` |
| `crystal-fractured.draco.glb` | 8 288 B | 7 310 B | 2 550 | 1 114 | Draco, needs a `DRACOLoader` |

Export settings: glTF 2.0 GLB, `export_yup=True`, `export_attributes=True`, materials/UV/tangents/cameras/lights/skins/animations all off.

The glTF vertex counts exceed the Blender ones (227 → 1 328) because flat normals plus a CORNER-domain `_FACET` split every corner. That is what our runtime wants anyway.

**Draco preserved all three custom attributes** — verified by round-tripping `crystal-fractured.draco.glb` back through `gltf-transform copy` and diffing: `_CENTR` 8 unique values matching to 1e-4, `_RAND` 8 unique values, `_FACET` 57 unique values, bounds identical, triangle count identical. (Draco re-emitted 2 550 vertices instead of 2 533 — a quantisation-boundary artefact, geometrically identical.)

**Why the uncompressed files are the primary ones anyway.** The repo has **no Draco wiring**: `HeroLogo.tsx` / `RouteHeroGlb.tsx` use drei's `useGLTF`, `RouteHeroLogo.tsx` constructs a bare `new GLTFLoader()`, none call `setDRACOLoader`, and the existing `sersan-mark.glb` is itself uncompressed (`extensionsUsed: none`). Enabling Draco would mean shipping the ~200 KB decoder and wiring it in three places to save 35 KB gzipped — a net loss on first load. The Draco variants are shipped alongside so the decision can be flipped in one line if a decoder ever lands for other reasons; the command is
`npx @gltf-transform/cli draco <in>.glb <out>.glb`.

Verification tool: `scratchpad/verify-glb.mjs` parses the GLB container directly (no loader, no DOM shim) and prints counts, bounds, and per-attribute range / unique-value count / coordinate-frame cross-check.

---

## 8. WHAT THE INTEGRATION STEP MUST HANDLE

1. **Rename on load**: `_CENTR` → `aCentr`, `_RAND` → `aRand`, `_FACET` → `aFacet`.
2. **`toNonIndexed()` before use.** The GLBs are indexed; `crystalBuild.ts` assumes a non-indexed soup for flat facets. `BufferGeometry.toNonIndexed()` expands *all* attributes including the custom ones, so the contract survives.
3. **Do NOT call `bakeFacetRand()`** on these geometries — see §6.4. It would overwrite the per-patch randoms with per-triangle ones and re-break the in-ice mark.
4. **Do NOT call `displaceAndSquash()`** or apply `CRYSTAL_SQUASH`. The squash is already baked into the authored proportions; applying it again would stretch the slab to .84/1.45/.65 and, worse, an anisotropic scale after authoring shears every facet normal.
5. **Normals**: exported flat and correct. If recomputing, `computeVertexNormals()` on the non-indexed soup reproduces them.
6. **`shardCentrs` / `shardRands`** (consumed by the callout driver and the ember SDF) must now be read back from the GLB's 8 unique `_CENTR` / `_RAND` values **in volume-descending order** — see the §5 table — not re-derived from `SHARD_SIZES` / the golden-spiral code. `EMBER_SHARDS [0,1]` and `BROKEN_CALLOUT_SHARDS [1,3,5]` keep their intended large/mid/chip meaning under that order.
7. **`HEALTHY_CALLOUT_ANCHORS` need a re-check** — `y = ±1.8` now sits outside the half-height 1.66 (§6.5).
8. **Shading constants will want a re-level.** The stone is now piecewise planar: whole facets catch the key lobe as single values instead of a smooth gradient. `FACET_JITTER 0.35` (which tilts the lobe normal per facet) is now acting on genuinely large facets, so it is far more visible than it was on micro-triangles. Expect to reduce it, and to re-check `SPEC_GAIN` / `FACET_SPEC_JIT` / `FACET_VALUE_JIT` against the round-8 value window.
9. **`MARK_GAIN` should be re-tested from 0.35 upward** only *after* the geometry swap — the mid-task finding was that gain was never the limiter, facet frequency was.
10. **Lite tier**: there is no reduced-poly variant. At 450 / 1 114 triangles the assets are already below the procedural build's 3 380, so the lite branch can load the same files; `CRYSTAL_DETAIL_LITE` / `SHARD_COUNT_LITE` become dead for the GLB path.
11. **Asset provenance**: nothing from igloo entered this repo. The GLBs are authored from primitives, plane cuts and boolean operations in Blender; what transferred is the numbers in the anatomy doc. `git log -p | grep -i "cube1\|cubes_env\|igloo-assets"` stays clean.

## 9. Open / not done

- `ax15` at 41.8 % vs igloo's 19–22 % (§1 note ²) — the one materially out-of-band secondary statistic, traded away deliberately for fillRatio and facet size.
- No baked normal/roughness maps — §C5 recommends against them for v1 and nothing here changes that.
- No UV sets (§4.6).
- Cell Fracture remains uninstalled; if the owner ever wants the stock operator's output for comparison it must be installed from extensions.blender.org first.
- Both objects (`SLAB`, `FRAC`) are left in the live Blender scene for inspection. The scene is still unsaved (`filepath == ""`); nothing was written over.

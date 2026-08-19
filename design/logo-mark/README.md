# SERSAN mark — 3D source (2026-08-19)

The hexagon mark that replaced the old two-S plate in `public/models/sersan-mark.glb`.

## Pipeline

1. **`fit2.mjs`** — fits a parametric model to the brand reference raster
   (`~/Downloads/loh.jpeg`, 230×177). The mark sits on a hexagonal grid: every
   edge is vertical or ±30° from horizontal, and the blue half is the navy half
   rotated 180° about the centre. 11 parameters (centre, half-width, half-height,
   6 channel lengths) are coordinate-descended on silhouette IoU.
   Result: **IoU 0.958**, **99.7%** navy/blue split accuracy.
   Outputs `mark-geometry.json` (the outline, in the site's model space:
   centred, height 2, y up) + `sersan-hex-mark.svg` (clean vector, usable for
   favicon/OG) + `_overlay.png` / `_recon.png` proofs.
   → `node design/logo-mark/fit2.mjs`
2. **`build-mark.py`** — Blender: extrudes the outline, bevels, joins the two
   halves into ONE mesh, exports the GLB and saves `sersan-mark.blend`.
   Run via the Blender MCP `execute_blender_code` tool.
3. **`inspect.mjs`** — parses any mark GLB and prints its bbox + an ASCII
   rasterisation of the +Z (front) silhouette.
   → `node design/logo-mark/inspect.mjs public/models/sersan-mark.glb`
4. **`sample-proof.mjs`/`.mts`** — runs the SITE's own `sampleMarkHomePositions`
   on the shipped GLB for both spore layers and rasterises the particle home
   field (`_samples_crust.png`, `_samples_core.png`).
   → `node --experimental-strip-types design/logo-mark/sample-proof.mts`

## Shipped GLB

`public/models/sersan-mark.glb` — 468 verts / 552 tris / 15.4 KB
(the old mark: 448 / 884 / 16.9 KB). Envelope **1.624 W × 2.000 H × 0.300 D**
(the old plate was 2.640 × 2.000 × 0.440 — same height, 38% narrower).

Contract the site depends on: ONE mesh, front face at **+Z**, centred, ~2 tall.
Consumers: `src/webgl/HeroLogo.tsx` (home hero — sampled into spores, never
drawn) and `src/webgl/RouteHeroLogo.tsx` (interior routes — drawn as a glowing
emissive mesh). Both load the same path, so the file swap covers every use.

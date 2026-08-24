# Research: Round 8-C — Stone SOURCE anatomy (real assets measured) + the value-world verdict

- **Query**: owner (2026-08-22, verbatim): *"le pietre non mi sembrano per niente come quelle nel sito igloo. devi risalire al codice sorgente del sito per poter capire al meglio come sono fatte."* — ours reads GLOWING WHITE ICE ON BLACK; igloo's reads MATTE DENSE GREY-BLUE ICE IN LIGHT FOG.
- **Scope**: mixed — igloo's real production assets fetched and DECODED NUMERICALLY (Draco meshes, KTX2 normal/roughness, EXR env, bg.png), our geometry measured with the identical metrics, plus the value arithmetic of both worlds.
- **Date**: 2026-08-24 (task round dated 2026-08-22)
- **Our HEAD**: code at `2c87dcd` (`ad0917e` on top is docs-only). Files diagnosed: `src/webgl/neural/crystalBuild.ts`, `src/webgl/neural/crystalConfig.ts`, `src/webgl/PostFXNodes.tsx`, `src/app/globals.css:17`.
- **Extends, does not repeat**: `2026-08-21-igloo-stones-dossier.md` and `2026-08-22-round7-stones-v2-anatomy.md` already mined the material chunks, the two-pass RT, the plexus, the callouts and the motion grammar. This document adds ONLY what the binary assets and the value arithmetic reveal. Where it corrects a prior claim it is flagged `⚠ CORRECTION`; where it confirms one, `✔ VERIFIED`.

---

## ⚠️ ASSET RULE — STUDY ONLY, NON-NEGOTIABLE

**The igloo assets fetched for this analysis are REFERENCE MATERIAL FOR MEASUREMENT ONLY. Not one byte of them may enter this repository, be committed, be re-hosted, be shipped in a bundle, or be used as a source for a derived asset.** They are third-party production assets belonging to igloo.inc.

- They live **outside the repo**, in the prior session scratchpad:
  `C:\Users\alber\AppData\Local\Temp\claude\C--Users-alber-Desktop-sersan-v2-main\5042dfcb-dc07-4454-a8cc-9bef33d8c714\scratchpad\igloo-assets\`
- What transfers into SERSAN is **numbers in this document** — frequencies, ratios, luminance percentiles, polygon statistics. Everything we ship must be authored by us (Blender + procedural shaders) to hit those numbers.
- Any implement agent that finds an `igloo-assets` path inside `src/`, `public/`, or a commit diff must treat it as a **blocking defect**.
- Suggested QA gate: `git log -p | grep -i "cube1\|cubes_env\|igloo-assets"` must return nothing.

---

## 0. HEADLINE — the two numbers that explain the owner's sentence

| | igloo | OURS (HEAD) |
|---|---|---|
| **Stone's own dynamic range** (darkest→brightest pixel, WCAG contrast ratio) | **7.9 : 1** | **54.6 : 1** |
| **Brightest stone pixel vs its surround** | **2.5 : 1** | **54.1 : 1** |
| **Stone BODY vs its surround** | **1.22 : 1** (and 2.0:1 the other way over bright fog) | **1.03 : 1 — invisible** |

igloo's entire stone — body, facets, rim, sparkle, everything — lives inside a **~8:1 value window** that sits **on top of a mid-value fog**. That is the literal definition of "matte" and "dense".

Ours spans **55:1** on a **near-black page**: the body is at 1.03:1 against the background (mathematically invisible) and the *only* thing above the noise floor is the rim (23:1) and the sparkle (54:1). That is the literal definition of "glowing white outline on black".

**The owner is describing a value-world problem, not a material problem.**

---

# PART A — THE ASSETS, DECODED

## A0. Where they actually live (loader base paths, bundle-verified)

Two separate `setPath` roots, which is why the EXR is *not* under `cubes/`:

| line | call | root |
|---|---|---|
| `igloo-app3d.pretty.js:27349` | `hd.setPath(\`${q.absolutePath}/assets/geometries/\`)` (Draco) | `/assets/geometries/` |
| `igloo-app3d.pretty.js:28200` | `In.setPath(…/assets/images/)`, `gg.setPath(…/assets/images/)` (KTX2, EXR) | `/assets/images/` |

Resolved URLs (all verified by successful fetch):

| bundle reference | line | resolved URL |
|---|---|---|
| `zt.load("cubes/cube{1,2,3}.drc")` | `39026` | `https://www.igloo.inc/assets/geometries/cubes/cubeN.drc` |
| `cubes/cubeN_{normal,roughness}.ktx2` | `39028` | `https://www.igloo.inc/assets/images/cubes/cubeN_*.ktx2` |
| `le.load("cubes/bg.png", "srgb")` | `39238` | `https://www.igloo.inc/assets/images/cubes/bg.png` |
| **`le.load("cubes_env.exr")`** | **`39297`** | **`https://www.igloo.inc/assets/images/cubes_env.exr`** — ⚠ **NOT** under `cubes/`. The round-7 dossier's `.../cubes/cubes_env.exr` in its source list is a typo; the decoded numbers it reported were nonetheless from the correct file. |

Tooling used (all in `…/5042dfcb-…/scratchpad/analysis/`, outside the repo): `drc-stats.js` (draco3d decoder + polygon statistics), `ktx-stats.js` (ktx-parse headers), `tex-freq.js` (three's Basis transcoder → RGBA32 → structure functions + octave band energy), `exr-stats.js` (hand-rolled scanline/ZIP/HALF EXR parser), `ours-stats.mjs` (our `crystalBuild` recipe measured with the identical metrics), `value-world.js` (the colour arithmetic in §B).

## A1. The meshes — `cubeN.drc` (measured)

Decoded with draco3d. All three carry **POSITION, NORMAL, TEX_COORD, TEX_COORD** — i.e. the **second UV set (`uv1`) is real and confirmed** (the frost-RT unwrap; ✔ VERIFIED against the round-7 claim).

| metric | cube1 | cube2 | cube3 | **OURS** (healthy, detail 12) |
|---|---|---|---|---|
| file bytes | 28 025 | 29 217 | 40 339 | n/a (procedural) |
| vertices | 5 271 | 5 939 | 7 866 | 10 140 soup / **1 692 welded** |
| faces | 6 494 | 6 186 | 8 038 | **3 380** |
| bbox (units) | 2.03 × 2.40 × 1.57 | 2.14 × 2.13 × 1.73 | 1.58 × 2.46 × 1.43 | 2.41 × 3.32 × 2.04 |
| proportions | .84 / 1 / .65 | 1 / .99 / .81 | .64 / 1 / .58 | **.72 / 1 / .61** ✔ |
| **fillRatio** (mesh vol ÷ bbox vol) | **0.473** | **0.547** | **0.434** | **0.339** ✗ |
| **areaTop1%Faces** (% of surface area in the largest 1% of triangles) | **6.1 %** | **20.4 %** | **10.2 %** | **2.3 %** ✗✗ |
| areaTop5%Faces | 20.7 % | 40.1 % | 30.6 % | — |
| **axis-aligned area, ±5°** | **3.7 %** | **14.9 %** | **5.5 %** | **1.4 %** ✗ |
| axis-aligned area, ±15° | 22.0 % | 22.4 % | 19.1 % | 12.7 % |
| **concave area** (faces pointing away from the centroid) | **0.9 %** | **5.8 %** | **9.3 %** | **0.0 %** ✗✗ |
| chipDepth p50 (÷ mean bbox edge) | 0.105 | 0.084 | 0.123 | 0.138 |
| chipDepth p90 | 0.177 | 0.166 | 0.202 | 0.215 |
| **dihedral p50** | 13.1° | 28.1° | 20.6° | **9.2°** |
| dihedral p90 | 44.5° | 75.3° | 54.7° | 43.8° |
| **dihedral p99** | **97.6°** | **124.4°** | **97.2°** | **70.0°** ✗ |
| % edges > 30° | 22.1 | 47.2 | 33.4 | 20.9 |
| % edges > 60° | 4.6 | 17.5 | 7.1 | 2.8 |

### What the numbers say about silhouette character

1. **They are eroded BLOCKS; ours is a spiky BALL.** `fillRatio` for a perfect cube is 1.00, for a sphere 0.52. igloo sits at **0.43–0.55** — right at or above sphere-fill, i.e. genuinely chunky, filling roughly half its bounding box. Ours is **0.339**, well *below* sphere-fill: our noise carves volume away, producing a spiky, inset form. Corroborated by `chipDepth p50` (ours 0.138 vs their 0.084–0.123 — our median vertex sits deeper inside the bbox).
2. **They have BIG CLEAVAGE FACETS; we have uniform micro-triangles.** `areaTop1%Faces` is the decisive statistic: on cube2 the largest 1% of triangles carry **20.4%** of the surface. On ours: **2.3%** — and structurally it *cannot* be much more, because `IcosahedronGeometry(1, 12)` produces near-equal triangles by construction. igloo's meshes were remeshed/decimated so flat regions collapse into single large planes. A big planar facet catches the environment as **one value**; that is what makes a shape read "ice block" rather than "noise blob".
3. **They have real CONCAVITY; we have literally none.** `concaveArea` is 0.9 / 5.8 / **9.3 %** for igloo, and **exactly 0.0 %** for ours — because `crystalBuild`'s displacement is purely radial-outward (`k = 1 + AMP·n`, `AMP·n` never ≤ −1), so the result is star-shaped about its centre: every point is visible from the middle. Chips, dents and bites out of the block are the "broken ice" signature and we have zero of them.
4. **They have hard cleavage edges; we have rolling terraces.** dihedral p99 **97–124°** vs our **70°**; % edges > 60° **4.6–17.5 %** vs **2.8 %**. Our `CRYSTAL_FACET_QUANT/MIX` terracing produces value ledges but not crease angles.
5. **Proportion and on-screen size are ALREADY RIGHT — not the gap.** Our `.72/1/.61` sits between cube1 and cube3. On-screen: igloo's stone is `2.40 / 4.14` = **58 % of viewport height** (camera z 5, fov 45); ours is `3.32 × CRYSTAL_SCALE 0.17` = **56.5 % of band height**. Do not spend effort here.
6. Triangle budget: igloo runs **6.2–8.0 k faces** to our **3.4 k**, i.e. ~2× — but with a *highly non-uniform* area distribution (big planes AND fine detail). Raw count is secondary to distribution.

## A2. The textures — `cubeN_{normal,roughness}.ktx2` (measured)

Headers via ktx-parse; pixels via three's Basis transcoder → RGBA32.

| | normal | roughness |
|---|---|---|
| resolution | **2048 × 2048** | **1024 × 1024** |
| mip levels | 12 | 11 |
| codec | ETC1S / BasisLZ | ETC1S / BasisLZ |
| encoder args | `--clevel 5 --qlevel 255 **--no-endpoint-rdo --no-selector-rdo**` | `--clevel 5 --qlevel 255` |
| bytes | 1.08–1.13 MB | 237–248 KB |

The `--no-*-rdo` flags on the normal maps confirm they are treated as **data, not colour** — igloo deliberately disabled rate-distortion optimisation there. Texel density measured from the UV/position ratio: **402–467 texels per object unit** on the normal map (≈ 201–233 on the roughness map).

### The two bands — and the thing we got backwards

Channel statistics (transcoded RGBA32):

| | cube1 | cube2 | cube3 |
|---|---|---|---|
| normal X mean / std | .488 / **.190** | .497 / **.116** | .496 / **.143** |
| normal Y mean / std | .492 / .200 | .498 / .122 | .496 / .150 |
| flat fraction (\|XY−.5\| < .008) | 16.5 % | 18.0 % | 12.4 % |
| **normal dominant band (px period)** | **16** (rms .087) | **16** (rms .058) | **8** (rms .074) |
| roughness G mean / std | .524 / .157 | .542 / .122 | .556 / .139 |
| roughness G p10 / p50 / p90 | .29 / .56 / .68 | .38 / .56 / .68 | .41 / .58 / .69 |
| **roughness structure fn saturates at** | **256 px** | 256 px | 256 px |

Converting both to **cycles per object unit** — the only frame in which our procedural constants are comparable:

| band | igloo (measured) | OURS (HEAD) | gap |
|---|---|---|---|
| **relief / "wet ripple" (normal map)** | 8–16 px ÷ ~456 texels·unit⁻¹ → **28–57 cycles / unit** | `RIPPLE_FREQ` = **8** | **3.5–7× too coarse** |
| relief slope, RMS tilt | **20°** (cube2) – **33°** (cube1) | ≈ **44°** typical, up to 63° | **1.5–2× too steep** |
| **roughness zoning** | 256 px ÷ ~228 texels·unit⁻¹ → **≈ 0.9 cycles / unit** | `FROST_FREQ` = **5.5** | **6× too fine** |
| **separation between the two bands** | **≈ 32 ×** | **1.45 ×** | the two bands are **on top of each other** |

**This is the texture verdict.** igloo's "wet ice" is two bands a decade and a half apart:
- a **broad, slow roughness patchwork** (~1 cycle per object unit) that zones the stone into glassy regions and frosted regions, and
- a **dense, moderate fine relief** (~28–57 cycles per unit at ~20–33° tilt) that at screen scale puts one ripple cycle every **4–9 px** — a shimmer right at the resolution limit, which is exactly why it reads *wet* rather than *wavy*.

Our two bands sit at 5.5 and 8.0 cycles/unit — 1.45× apart. They mud into a single mid-frequency corrugation: one visible ripple every **~31 screen px**, far too coarse and ~2× too steep. We built a *rippled* stone, not a *wet* one.

Also: igloo's **effective roughness** is `0.65 × G` = **0.19 / 0.36 / 0.44** at p10/p50/p90 — ⚠ **CORRECTION** to the widely-repeated "roughness .65": the map pulls the median down to **~0.36**. Ours is `CRYSTAL_ROUGH 0.6` modulated `×(1 ± 0.45)` → **0.33–0.87**, i.e. ~1.7× rougher at the median and reaching nearly double their maximum.

## A3. The environment — `cubes_env.exr` (decoded, round-7 claim VERIFIED and refined)

512 × 256 equirect, ZIP compression, **HALF** float, channels **A, B, G, R** (it carries an alpha channel — unusual for an env map; not investigated).

Linear luminance distribution (Rec709):

| p05 | p25 | p50 | p75 | p90 | p99 | p99.9 | max |
|---|---|---|---|---|---|---|---|
| 0.153 | 0.272 | **0.458** | 0.798 | 1.891 | 5.623 | 15.88 | **3411.2** |

- mean **0.908**; mean with the top 0.1 % removed **0.814**
- the max is a **single pixel at equirect (x 240, y 87)** with RGB ≈ **(3398, 3428, 3284)** — near-neutral, R/B = 1.035
- **73.7 %** of pixels are cool (`B > 1.1·R`); **8.7 %** are warm (`R > 1.05·B`)

✔ **VERIFIED**: the round-7 mine's "one ~3400× sun + a cool base" is exactly right. Refinements: the warm fraction is **8.7 %** at the `R > 1.05·B` threshold (round 7 reported 3.6 % using a narrower `R/B ∈ 1.10–1.14` window — both are true, different thresholds); the base is not merely "cool" but **structured**, running p25 0.272 → p75 0.798, i.e. a ~3× vertical gradient.

Sun geometry: `v = 87/256` → **≈ 29° above the horizon**; `u = 240/512` → azimuth 169°, which with `envMapRotation.y = π` (bundle L39028) lands roughly camera-facing. *(Azimuth depends on three's equirect convention — treat the elevation as solid and the azimuth as approximate.)*

**Integrated sun power** — the number that actually matters for reproducing it at low resolution: one texel of a 512×256 equirect subtends `4π/131072` = **9.6 × 10⁻⁵ sr**, so the sun contributes ≈ `3411 × 9.6e-5` = **0.33 sr·radiance**. It is a *small, very bright* source whose total energy is comparable to the ambient base — not an overwhelming key.

## A4. `cubes/bg.png` — ✔ verified, 4 × 4 uniform `#A6ABB7`

Re-confirmed: all 16 pixels identical. Linear luminance **0.407**, perceptual luma **0.670**. This is the entire "world beyond the ice" during the back-face pass. `uTransmissionSamplerSize = (4,4)` is literally the texture's size.

---

# PART B — THE VALUE-WORLD INVERSION (the core deliverable)

All arithmetic in `analysis/value-world.js`. Two conventions are used and always labelled:
**`lumLin`** = Rec709 luminance in *linear* light (what the shader computes on);
**`luma`** = Rec709 weights applied in *sRGB* space (what an eyedropper reads off a screenshot).

## B1. igloo's value world

| element | hex | lumLin | luma |
|---|---|---|---|
| `k3` fog, bright end | `#c9d0df` | 0.629 | 0.814 |
| `k3` fog, dark end | `#545b6b` | 0.104 | 0.356 |
| `k3` fog, mid | `#9da3b2` | **0.366** | **0.639** |
| transmission bg (`bg.png`) | `#a6abb7` | 0.407 | 0.670 |
| **stone body over mid fog** | **`#8994a6`** | **0.291** | **0.575** |
| stone body over dark fog | `#485263` | 0.083 | 0.318 |
| stone body over bright fog | `#b0bcd0` | 0.499 | 0.734 |

The stone's body is the **transmission sample × the ice's own multiplier**. In three's physical transmission the returned colour is `(1 − F) · attenuatedColor · diffuseColor`; with `ior 1.18` the normal-incidence Fresnel is `F0 = ((1.18−1)/(1.18+1))² = 0.0068` (negligible), and `diffuseColor` = `#e0e8ef` linear. Net per-channel multiplier: **(0.740, 0.802, 0.857)**, luminance ratio **0.793**.

**So igloo's stone is, quite literally, a 20 %-darkened, heavily distorted copy of the fog immediately around it.** That single sentence is the whole aesthetic:

- Over the *bright* parts of the fog it is **2.0:1 darker** than its surround.
- Over the *dark* parts it is **2.2:1 brighter** than its surround.
- Across the frame it therefore swings from *lighter-than* to *darker-than*, which is exactly what a dense translucent solid does inside a varying fog — and is why it reads as **mass**.
- Highlights: `outgoingLight = clamp(…, 0, 1)` (bundle L38013) hard-caps every pixel at **1.0**, i.e. at most **3.4×** the body. Bloom threshold **0.2** is *below* the body luminance (0.291), so the **entire stone blooms slightly** — a uniform soft haze, never pinpoint stars.

## B2. Our value world (HEAD)

| element | hex | lumLin | luma |
|---|---|---|---|
| page background (`--bg`, `globals.css:17`) | `#0B1422` | **0.0069** | 0.075 |
| `backdrop()` darkest reachable | `#070f1c` | 0.0049 | 0.057 |
| **`backdrop()` typical** (g ≈ 0.244) | **`#0f1b2f`** | **0.0106** | 0.100 |
| `backdrop()` brightest reachable | `#1b2d4d` | 0.0266 | 0.171 |
| `backdrop()` at a `BACKDROP_SPOTS` centre | `#36c8e4` | **0.476** | 0.670 |
| **stone body, typical** (`× BODY_DARKEN 0.5`) | **`#08101f`** | **0.0053** | 0.061 |
| stone body at a cyan spot | `#2592a8` | 0.238 | 0.488 |

And the highlight stack, with `PostFXNodes` bloom threshold ≈ **1.0** (the selective-bloom contract, `PostFXNodes.tsx:43,820`):

| term | config | peak lumLin | **× the body** |
|---|---|---|---|
| spec key lobe | `SPEC_GAIN 1.15` | 0.995 | 188 × |
| **rim** | `RIM_BASE 1.6` | **1.266** | **238 ×** |
| **sparkle** | `SPARKLE_GAIN 3.5` | **3.028** | **569 ×** |

## B3. The inversion, quantified

| | igloo | OURS | ratio |
|---|---|---|---|
| surround lumLin | 0.366 | 0.0069 | **53 × dimmer** |
| body lumLin | 0.291 | 0.0053 | **55 × dimmer** |
| body ÷ surround | 0.794 | 0.775 | ≈ equal |
| body-vs-surround contrast | **1.22 : 1** | **1.03 : 1** | |
| brightest pixel ÷ body | **3.4 ×** (hard clamp) | **569 ×** | **167 × too wide** |
| brightest pixel vs surround | **2.5 : 1** | **54 : 1** | |
| stone's own dynamic range | **7.9 : 1** | **54.6 : 1** | |

**Read the third row carefully.** The body/surround *ratio* is nearly identical (0.775 vs 0.794). Our transmission darkening is not the problem.

⚠ But this near-match is a **coincidence of two independent constants**, not a property of the design: our `backdrop()` happens to sit 1.55× above the page, and `BODY_DARKEN 0.5` happens to halve it. Nothing couples them. **The moment a fog is introduced, the surround changes and the coincidence breaks** — which is precisely why the fix below must drive the backdrop from the *same* value the fog is drawn at.

**What is actually broken is two things, and only two:**
1. **The absolute floor is ~54× too low.** Both body and surround.
2. **The highlight-to-body ratio is ~167× too wide.** igloo caps at 3.4×; we run to 569×.

Together: a body pinned at 1.03:1 against the page (invisible) with a rim at 23:1 and sparkles at 54:1 (blinding). The eye can only see the highlights. **"Glowing white ice on black"** is not a subjective impression — it is the arithmetic.

## B4. VERDICT — can material tuning alone fix it? **NO. The light-fog world is required.**

Three independent proofs, all from the table above:

1. **Ice is a transmissive material: its body value is (backdrop value) × (transmission losses < 1).** Against a near-black backdrop the body can only ever be ≤ near-black. Any attempt to brighten it must be **additive** (emission, specular, sparkle) — and an additive term on a dark body is, by definition, a **glow**, which is the exact failure we are trying to escape.
2. **To read "dense", an object must be measurably DARKER than its surround across most of its silhouette.** Our surround is at lumLin 0.0069. There is **no room below it** — the floor is 0. igloo's stone gets its mass from being 2.0:1 darker than the bright fog; we cannot be 2:1 darker than 0.0069 in any way a display can show.
3. **The remaining lever — raising the body — makes it brighter than the page, and the page is still black.** A brighter object on black is a lamp. You cannot make a dark object read dark against black.

**Therefore: the production band needs a LOCAL LIGHT-FOG WORLD behind the stone — the igloo `k3` grammar — a soft luminous navy-tinted volume that gives the stone something to be darker than.** This is not a stylistic preference; it is the only way to create the value headroom the read depends on.

### B4.1 Sizing it for the SERSAN brand (we do NOT copy igloo's absolute values)

igloo's fog sits at lumLin 0.366 (`luma` 0.64) — a **light grey-blue page**. SERSAN is dark-first navy (`AGENTS.md §2`). Copying that would destroy the brand. What transfers is the **relationships**, applied at a level navy can carry.

Recommended target: a fog core at **lumLin ≈ 0.07** — about **10× the page**, roughly **1/5 of igloo's absolute level**.

Sanity check against what round 7-3 just deleted: `2026-08-22-round7-continuous-space-spec.md` §B.5 measured the removed DOM `section-accent-tint` cores at blended **L ≈ 0.128**. **The proposed fog core is dimmer than the washes we just removed** — it is not a return to page-blocks; it is the same energy, world-anchored, in the right shape, in the right place.

Derived targets (all lumLin):

| quantity | target | note |
|---|---|---|
| fog core | **0.07** | ≈ 10× the page (0.0069) |
| stone body (typical) | **0.055** | = 0.79 × fog — igloo's ratio, preserved |
| stone body (darkest) | ≈ 0.02 | over the fog's dim edge |
| brightest stone pixel | **0.25 – 0.45** | see the ratio table below |
| stone dynamic range | **≈ 7 – 8 : 1** | igloo 7.9 : 1 |
| brightest pixel vs fog | **2.5 – 4.2 : 1** | igloo 2.5 : 1 (pick 0.25 for exact parity) |

### B4.2 Mechanism — TWO coupled parts, because our stone does not sample the framebuffer

This is the subtlety that will sink a naive implementation. `crystalBuild.ts` does **not** read the scene behind it: the body comes from the procedural `backdrop()` function (`crystalBuild.ts:649`), and the crystal composites at `CRYSTAL_ALPHA 0.94`, so only **6 %** of whatever is behind it shows through. **Putting a glow behind the crystal does almost nothing to the body.** Both halves are required:

**Part 1 — the fog quad (gives the SILHOUETTE something to sit against).**
Extend the layer that `2026-08-22-round7-continuous-space-spec.md` §B.4 already specified: `src/webgl/AmbientGlows.tsx`, an `InstancedBufferGeometry` of billboarded unit quads following the DriftParticles instancing pattern (shared corners + per-instance `aOffset/aScale/aTint`), fragment = `smoothstep(1,0,r)²` reaching **exactly 0 at r = 1** (the §A.6 quad-edge hygiene rule), additive, `depthWrite:false`, `renderOrder −2`, world-anchored so it pans with `pan01`, descends with the camera, and is swept by the W4 cut exactly like igloo scene light.
- **Change from §B.4**: that spec sizes glows at peak alpha **0.05–0.08 `--accent`** — a whisper, ~10× too dim for this job. The crystal band needs **one dedicated instance** at the crystal's world position, peak lumLin **0.07**, radius ≈ **0.7 × band height**.
- **Zero new bindings**: instanced attributes + fragment uniforms only. Both WebGPU binding walls documented in `gpgpuNodeSim.ts` untouched.

**Part 2 — `BACKDROP_GAIN` (gives the BODY its value). This is the load-bearing half.**
Add **one uniform** multiplying `backdrop()`'s output in `crystalBuild.ts:665` (`return col` → `return col.mul(uBackdropGain)`), default **1.0** for exact back-compat, target **≈ 10**.
- **It must be written by the SAME driver value that sets the fog quad's intensity**, so body and surround track and the 0.79 ratio is *constructed* rather than coincidental (see the ⚠ in §B3).
- Prefer this over re-tuning `BACKDROP_NAVY`/`NAVY2`: it preserves the authored palette, gives the dev handle one knob, and keeps the coupling explicit. *(For reference, the equivalent static palette lift would be `#060D18 → ~#253A57` and `#1C2E4E → ~#6291E6` — visibly off-brand as literals, which is the second reason to use a gain.)*
- **Palette**: navy / cyan only. **NO violet** (memory: logo-variant contract).

**Part 3 — compress the highlights (igloo's clamp).**
- Add `col = clamp(col, 0, 1)` before alpha — **igloo verbatim** (`bundle L38013`), currently absent from `crystalBuild.ts`.
- Bring the three gains down so the peak lands at ~6–8× the body instead of 569×. Starting points, to be tuned on the dev handle: `RIM_BASE 1.6 → ~0.35`, `SPARKLE_GAIN 3.5 → ~0.5`, `SPEC_GAIN 1.15 → ~0.6`.
- **Consequence to flag to the owner**: with the global bloom threshold at ≈1.0 (a page-wide contract — do **not** change it here), the stone then **stops blooming entirely** except the ignition flash. That is igloo-*correct* in read (their bloom is a soft global haze at threshold 0.2, not stars) but it removes all glow from the crystal. If the owner wants a trace of it back, keep the extreme-grazing band (`f1 ≳ 0.97`) just above 1.0 so a hairline edge still blooms. **Owner decision — do not pick silently.**

### B4.3 Composition with the existing world

- **With round 7-3 (`2026-08-22-round7-continuous-space-spec.md`)**: fully compatible, and arguably its §B.4 "option (c)" arriving on schedule. That spec removes **DOM** section washes and says ambience returns as **world-anchored GL light**. This is that, at the one band that provably needs it. Ship order per §B.6 puts problem + production first — the same two bands the crystals sit in.
- **With the constellation** (`2026-08-21-round6-neural-constellation.md`): the fog sits at `renderOrder −2`, behind both crystal (−3 … verify ordering at implementation) and constellation linework. The constellation is additive white-cyan hairlines; on a lifted field they lose a little contrast — expected and acceptable, but worth one visual check.
- **⚠ ACCESSIBILITY — hard constraint, must be a QA gate.** `--ink-mute` `#8A94A6` has rel-lum 0.293. Over a fog core at L 0.08 the contrast is `(0.293+0.05)/(0.08+0.05)` = **2.6 : 1 — FAILS WCAG AA**. Therefore:
  - The fog **must be confined to the right two-thirds**, centred on the crystal (`CRYSTAL_POS` x = +0.17 / +0.22 of rect width from centre) and falling to zero **before it crosses the band centre-line**, where the display type column lives.
  - Gate: axe / DevTools contrast pass on `problem` and `production` at desktop **and** 390×844, plus one manual check of the worst muted string over the brightest fog frame. This is the same discipline §B.5 of the round-7 spec applies to the deleted tints.

---

# PART C — GEOMETRY GAP → BLENDER AUTHORING PLAN

## C1. The gap in one line

We ship a **convex, spiky, uniformly-tessellated ball** (fill 0.34, concavity 0.0 %, largest-1% area 2.3 %, dihedral p99 70°). igloo ships a **chunky, chipped, non-uniformly-faceted block** (fill 0.43–0.55, concavity 1–9 %, largest-1% area 6–20 %, dihedral p99 97–124°). Three of those four statistics are **structurally unreachable** from `IcosahedronGeometry + radial noise` — no constant in `crystalConfig.ts` can produce concavity or large planar facets. **Authoring is required.**

## C2. Target statistics for the authored asset

| statistic | target | why |
|---|---|---|
| bbox | ≈ 2.0 × 2.4 × 1.6 (proportions ~.84/1/.65) | cube1's profile; our current `.72/1/.61` already close |
| faces / verts | 6 000 – 8 000 / 5 000 – 8 000 (indexed) | igloo's range |
| Draco size | 28 – 40 KB | igloo's range |
| **fillRatio** | **0.45 – 0.55** | chunky, not spiky |
| **areaTop1%Faces** | **6 – 12 %** | big cleavage planes |
| **axis-aligned ±5°** | **4 – 8 %** | keeps block-ness |
| **concave area** | **3 – 9 %** | real chips and dents |
| dihedral p50 / p90 / p99 | 13–21° / 45–55° / ~100° | hard creases |
| % edges > 60° | 5 – 8 % | |
| chipDepth p50 / p90 | 0.10–0.12 / 0.17–0.20 | |
| UV sets | **2** (uv0 tiling relief, uv1 non-overlapping) | igloo's TEX_COORD ×2 |
| attributes (broken variant) | `centr` (piece centroid), `rand` (vec3) | matches the existing `aCentr`/`aRand` contract in `crystalBuild.ts` |

## C3. Recipe — Blender via the wired MCP

**Base is a CUBE, not an icosphere.** The `axis-aligned ±5%` statistic (3.7–14.9 %) says these are eroded blocks that retain their principal planes; an icosphere throws that away on step one.

1. **Base** — Cube, 2 m. `Subdivide` (simple) to ≈ 6–8 k tris. Do *not* use Subdivision Surface (it rounds the corners we need).
2. **Displacement stack** — three `Displace` modifiers, frequencies chosen to hit the measured bands (§A2), all sizes in **object units**:
   - **A — form** (`Clouds`, size ≈ 0.9 units, strength ≈ 0.22). ≈ 1.1 cycles/unit → the large lobes. This is the same band as igloo's roughness zoning.
   - **B — chips** (`Voronoi`, *Distance to Edge* / Crackle, size ≈ 0.35 units, strength ≈ **−0.12**, i.e. **negative**). This is the operator that produces `concaveArea` and the hard dihedrals. Without a negative-strength layer the mesh stays convex and the statistic stays at 0.
   - **C — grain** (`Noise`/`Musgrave`, size ≈ 0.035 units, strength ≈ 0.015). ≈ 28 cycles/unit — the measured relief band. **Only needed if baking (§C5); otherwise omit and let the re-tuned procedural ripple carry it.**
3. **`Decimate` (Planar mode, angle 5–8°)** — **the single most important operator.** Collapsing coplanar regions is what moves `areaTop1%Faces` from ~1 % to 6–20 % and pushes `dihedral p99` past 90°. Skip this and the asset will still read as a noise blob despite the new silhouette.
4. **Shade Auto Smooth ≈ 30°** + Weighted Normal — hard creases where the planar decimation left them.
5. **UVs** — `Smart UV Project` → `uv0`; second `Smart UV Project` with island margin → `uv1` (non-overlapping, reserved for a future frost RT; igloo's `uv1` exists for exactly this).
6. **Broken variant** — duplicate → **Cell Fracture** add-on (`Object ▸ Cell Fracture`), source Particles/Vertices, noise ≈ 0.3, **8 cells** sized to mirror `SHARD_SIZES` (`[1.45, 1.22, 0.95, 0.78, 0.6, 0.5, 0.42, 0.36]`). Then a short `bpy` script writes, per piece, `centr` = piece median and `rand` = a deterministic vec3 into generic float attributes, then Join. This reproduces igloo's `centr`/`primrand` contract *and* our existing `aCentr`/`aRand` vertex path with no shader change.
7. **Export** — glTF 2.0, `+Y up`, **Draco** compression → `public/models/`. Optionally `gltf-transform inspect` to confirm size/attribute layout, and `gltfjsx` for a typed R3F component (`AGENTS.md §1` pipeline).
8. **Verify** — re-run `drc-stats.js` (or its glTF equivalent) on the export and check every row of §C2 before wiring it in. **Do not accept the asset on visual impression alone; the statistics are the contract.**

## C4. What the OWNER must do manually

Claude cannot install or launch Blender. Before an implement agent can run step 1:

1. **Open Blender** (3.0+) with the BlenderMCP add-on installed.
2. In the 3D viewport press **`N`** → BlenderMCP sidebar → **"Connect to Claude"**. Blender must stay open and connected for the whole authoring session.
3. **Enable the Cell Fracture add-on**: `Edit ▸ Preferences ▸ Add-ons` → search "Cell Fracture" → tick `Object: Cell Fracture`. It ships with Blender but is **off by default** — step 6 fails silently without it.
4. Nothing else. No Hyper3D / Poly Haven keys are needed: this is a modelled asset, not text-to-3D, and the environment is generated at runtime (§D).

## C5. Baked textures — recommended **NO** for v1

Baking normal + roughness from a hi-poly (igloo's approach) would cost **+4 fragment bindings** (2 textures + 2 samplers) on top of the mark RT's +2, plus ~1.3 MB of KTX2, plus a bake pipeline. Given §E's ranking puts the texture *frequencies* above the *authoring method*, and both frequency corrections are **pure constant changes** (§D1), the recommendation is:

**v1: authored geometry only (Draco GLB, no baked maps), procedural relief re-tuned per §D1.** Revisit baking only if the re-tuned procedural ripple still reads wrong after the value world lands.

---

# PART D — TEXTURE & MATERIAL DELTAS

## D1. Texture bands — three constants, near-zero cost, large payoff

| constant | HEAD | target | derivation |
|---|---|---|---|
| `RIPPLE_FREQ` | 8.0 | **24 – 30** | measured band 28–57 cycles/unit; the low end avoids aliasing (see below) |
| `RIPPLE_AMP` | 0.12 | **≈ 0.016** | to hold ~25° RMS tilt: `\|gradT\| ≈ 1.01·F` = 28.3 at F=28, so `amp = tan(25°)/28.3` |
| `FROST_FREQ` | 5.5 | **≈ 0.9** | measured roughness correlation length 256 px ÷ 228 texels·unit⁻¹ = 1.12 units/cycle |

Effect: the two bands separate from **1.45×** to **≈ 30×**, matching igloo's ~32×. The ripple becomes a fine wet shimmer (one cycle per ~9 screen px) instead of a visible corrugation (one per ~31 px); the frost becomes broad glassy/frosted zoning instead of fine veins.

**Aliasing wall — do not exceed ~30.** At `CRYSTAL_SCALE 0.17` the stone spans ~250 screen px per crystal unit. `F = 28` → 8.9 px/cycle (safe). `F = 57` (igloo's upper measured band) → 4.4 px/cycle, which will shimmer and crawl without derivative-based filtering. igloo gets away with 57 because a **mip-mapped normal map filters itself**; an analytic sine does not. This is the one place where "match the measurement exactly" is the wrong instruction.

## D2. Roughness level

| | igloo effective (`0.65 × G`) | ours | target |
|---|---|---|---|
| p10 | 0.19 | 0.33 | `CRYSTAL_ROUGH` **0.6 → ~0.36** |
| p50 | 0.36 | 0.60 | `FROST_ROUGH_K` **0.9 → ~0.5** |
| p90 | 0.44 | 0.87 | → yields ≈ 0.27 / 0.36 / 0.45 |

## D3. Environment — we have no ambient term at all

igloo's stone is lit by a **real IBL** whose dominant contribution is a broad cool ambient (p25 0.272 → p75 0.798), *not* the sun. We have two **hard analytic lobes** (`FACET_KEY_DIR` gain 1.15, `FACET_FILL_DIR` gain 0.5) added directly — no Fresnel weighting, no wrap, no ambient floor. Result: a binary lit/unlit split across facets instead of a soft graded field.

**Recommended (v1) — analytic hemisphere, ZERO bindings.** Encode the measured distribution directly:

```
ambient(N) = mix(L_down, L_up, N.y·0.5 + 0.5)
   L_down ≈ 0.27   (measured p25)
   L_up   ≈ 0.80   (measured p75)
   tint: cool, B/R ≈ 1.25   (73.7 % of the EXR is B > 1.1·R)
+ a narrow warm lobe, desaturated amber, ≈ 8.7 % weight   (measured warm fraction)
+ the existing key lobe re-aimed to ~29° elevation (the measured sun)
```
≈ 6 ALU, no textures, no PMREM, no repo asset, fully dev-handle tunable. This also finally gives the body a **floor**, which is half of why igloo's stone never goes fully black.

**Fallback (v2) — runtime equirect `DataTexture`, if the analytic version reads too smooth.**
- 64 × 32 RGBA16F equirect = **16 KB**, generated once in JS, PMREM'd at mount, zero per-frame cost, **zero repo assets**.
- Fill with the measured elevation ramp + the cool tint + a few warm blobs in the mid/lower band.
- **The sun: use `≈ 53`, not `3411`.** At 64 × 32 one texel subtends `4π/2048` = 6.1 × 10⁻³ sr; to carry igloo's integrated sun power (0.33 sr·radiance, §A3) the texel value must be `0.33 / 6.1e-3` ≈ **53**. Writing 3411 into a low-res map would be ~64× too much energy — the classic env-map downsampling trap.
- Cost: **+2 fragment bindings**. Check against the mark RT's +2 before committing.
- A tiny baked `.hdr` in-repo (~10 KB) is the third option; the runtime texture is preferred because it stays tunable and adds no asset.

## D4. Material deltas — full uniform-level summary

| uniform / constant | HEAD | igloo (measured or mined) | delta |
|---|---|---|---|
| backdrop luminance | 0.0106 lumLin | 0.366 lumLin (`k3` mid) | **35× dim** → `BACKDROP_GAIN ≈ 10` (scaled to brand) |
| body multiplier | `BODY_DARKEN` 0.5 | 0.793 (from `(1−F)·#e0e8ef`) | ours darker, but see §B3 — drive it from the fog |
| outgoing clamp | **absent** | `clamp(…, 0, 1)` (L38013) | **add it** |
| rim | `RIM_BASE` 1.6 → 1.27 lumLin | ≤ 1.0 by clamp | → ~0.35 |
| sparkle | `SPARKLE_GAIN` 3.5 → 3.03 lumLin | ≤ 1.0 by clamp; **rest-state sparkle is OFF** in igloo (frost-gated only) | → ~0.5 |
| spec | `SPEC_GAIN` 1.15 → 1.00 lumLin | GGX under the clamp | → ~0.6 |
| roughness | 0.6 (→ 0.33–0.87) | 0.19 / 0.36 / 0.44 | → 0.36 |
| relief frequency | 8 cycles/unit | 28–57 | → 24–30 |
| relief tilt | ~44° | 20–33° | → ~25° (`RIPPLE_AMP` ≈ 0.016) |
| roughness zoning freq | 5.5 cycles/unit | ~0.9 | → 0.9 |
| ambient env | **none** | p25 0.272 → p75 0.798, 74 % cool | add analytic hemisphere |
| ior | 1.18 | 1.18 | ✔ match |
| chromatic aberration | 0.16 (+ edge boost 2.5) | 0.10 | ours higher by design (round-7 note: compensates for a low-contrast procedural backdrop). **Re-check after `BACKDROP_GAIN`** — with a proper field it may want to come back toward 0.10. |

---

# PART E — PRIORITY RANKING

The task's hypothesis was **fog #1, silhouette #2, env #3**. Measured result:

## ✅ #1 — THE VALUE WORLD. Confirmed, and by a much larger margin than expected.

Fog quad + `BACKDROP_GAIN` + highlight clamp, shipped as **one coupled change**. Justification is arithmetic, not taste: the body/surround ratio is *already* 0.775 against igloo's 0.794 — the geometry of the material is right and the **only** defects are a 54× absolute floor and a 167×-too-wide highlight ratio. Nothing else on this list is visible until the stone is a mass instead of an outline. Every subsequent item is a refinement on top of a currently-invisible object.

## 🔄 #2 — TEXTURE BANDS. **Promoted above geometry** (hypothesis refuted on effort-adjusted order).

Three constants (`RIPPLE_FREQ`, `RIPPLE_AMP`, `FROST_FREQ`) plus two roughness constants. **Zero new code, zero bindings, zero assets, one commit.** It closes a measured 3.5–7× frequency error and a 20× band-separation error — the entire "wet ice" read. Delivering this *before* the Blender pipeline is strictly better sequencing: it is cheaper, it is reversible, and it changes the surface the new silhouette will be judged against.

## 🔨 #3 — AUTHORED SILHOUETTE (Blender). Confirmed as #2 *visually*, demoted to #3 on effort.

Three of the four silhouette statistics (concavity 0 %, largest-1%-area 2.3 %, dihedral p99 70°) are **structurally unreachable** from our procedural recipe, so this is genuinely required — it just costs an asset pipeline, an owner-in-the-loop Blender session, and a new GLB, versus five constants for #2.

## 🌍 #4 — ENVIRONMENT. Confirmed as last, but it is not optional.

Our stone has **no ambient term at all**, which is why facets read binary lit/unlit and why the body can go fully black. The analytic hemisphere (§D3) is ~6 ALU and closes most of it. Ranked last only because on a near-black field the difference is unobservable — it becomes clearly visible once #1 lands.

### One-line answer to the owner

*Our stone isn't made of the wrong material — it's standing in the wrong world. igloo's ice is a 20 %-darkened copy of a bright fog; ours is a 50 %-darkened copy of black, with the highlights turned up 170× to compensate. Build the fog and the ice appears.*

---

## Caveats / Not Found

- **No live screenshot.** This session had no browser, so igloo's rendered appearance is reconstructed **analytically** from the shader chunks (quoted verbatim in the two prior dossiers) plus the decoded assets. The arithmetic assumes stock three.js physical transmission composition `(1−F)·attenuatedColor·diffuseColor`; the prior dossiers confirm igloo's chunk replacements preserve that structure (they short-circuit `volumeAttenuation` to `vec3(1)` and swap the sampler, not the composition), but I did not re-derive every substituted line. **Recommended confirmation: one Playwright screenshot of igloo.inc's cubes section, eyedropper the stone body and the fog, and check them against §B1's `#8994a6` / `#9da3b2`.** If they match, every number downstream holds.
- **KTX2 statistics are of the TRANSCODED image.** ETC1S/BasisLZ is a lossy 4×4 block codec, so band energy at `pxPeriod ≤ 4` is partly codec artifact. The dominant 8–16 px band is well above the block size and is trustworthy; the RMS *magnitudes* are lower bounds.
- **`texelsPerObjectUnit`** is derived from the UV-area / world-area ratio and assumes a roughly area-preserving unwrap. If igloo's unwrap is strongly non-uniform, the cycles-per-unit figures shift proportionally. The **band separation ratio (~32×) is unaffected** by this, since both maps share the unwrap — and the separation is the load-bearing conclusion.
- **EXR sun azimuth** depends on three's equirect convention combined with `envMapRotation.y = π`. The **elevation (~29°)** is solid; treat the azimuth as approximate.
- The EXR carries an **alpha channel** — unusual for an environment map. Not investigated; may be an authoring artifact.
- **`BACKDROP_GAIN ≈ 10` and the fog core at lumLin 0.07 are derived targets, not tuned values.** They are the arithmetic that reproduces igloo's *ratios* at one-fifth its absolute level. Expect the owner to move them; the dev handle should expose both, coupled.
- **Not re-mined** (covered by the prior dossiers, deliberately not repeated): the two-pass transmission RT mechanics, the plexus construction, the callout gating windows, the frost wave sim, the scroll/tumble grammar, the `k3` fog layer construction. See `2026-08-22-round7-stones-v2-anatomy.md` §A1–A7.
- **Untouched by this document**: `MARK_*` (the mark-in-ice RT) and `EMBER_*`. Both are additive terms and will need re-levelling once the body rises 10× — flag for the implement agent, not analysed here.
- **Open owner decision** (§B4.2 Part 3): whether the crystal keeps *any* bloom after the highlight compression. igloo-faithful = no pinpoint bloom. Do not decide silently.

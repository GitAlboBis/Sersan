# Research: Round 7-2b — Igloo stones v2 DEEP anatomy + transplant spec

- **Query**: owner (2026-08-22): our stones must become igloo.inc's ice-cubes-with-the-penguin-INSIDE — re-reverse-engineer how they're made, what effects exist, how they move, how the scroll works; then spec the transplant ON TOP of the in-tree R7-2 realism pass.
- **Scope**: mixed — bundle re-mining (verbatim, line-ref'd) + live-asset decoding (bg.png / cubes_env.exr fetched & measured) + repo grounding (crystalBuild/crystalConfig/CrystalCluster as of HEAD 0cb67b1).
- **Date**: 2026-08-24 (task round dated 2026-08-22)
- **Sources**:
  - `igloo-app3d.pretty.js` (45,006 lines) — `C:\Users\alber\AppData\Local\Temp\claude\C--Users-alber-Desktop-sersan-v2-main\5042dfcb-dc07-4454-a8cc-9bef33d8c714\scratchpad\igloo-app3d.pretty.js`
  - Prior dossier `research/2026-08-21-igloo-stones-dossier.md` (this doc EXTENDS it; corrections are flagged `⚠ CORRECTION`)
  - Cuts spec `research/2026-08-21-igloo-cuts-spec.md` (§A-EXT scroll math — consolidated here in §A7)
  - Live assets fetched 2026-08-24: `https://www.igloo.inc/assets/images/cubes/bg.png`, `.../cubes_env.exr` (decoded numerically, see §A3)
  - Repo: `src/webgl/neural/crystalBuild.ts`, `src/webgl/neural/crystalConfig.ts`, `src/webgl/CrystalCluster.tsx`, `src/webgl/PostFXNodes.tsx` header, `src/webgl/gpgpu/gpgpuNodeSim.ts` binding notes
  - NOTE: `research/2026-08-22-round7-continuous-space-spec.md` did NOT exist at write time — §B-e hands parameters to it in prose instead of cross-referencing content.

---

# PART A — RE-MINED ANATOMY (bundle-verified, quotes where load-bearing)

## A1. The INNER OBJECT pipeline (mesh3) — "the soul"

**Loading & material** (`nF.init`, L39026-31):
```js
const [e, t] = await Promise.all([zt.load(`cubes/${obj}.drc`), zt.load(`${innerobject}.drc`)]);
...
this.mesh3 = new Ce(t, new or({ map: le.load(`cubes/${innerobject}_color.ktx2`) })),
this.mesh3.renderOrder = 10, this.add(this.mesh3)
```
- The inner object is its OWN Draco mesh (`pudgy.drc` / `overpass_logo.drc` / …, config L32091-97) with a baked KTX2 color texture on a **`MeshBasicMaterial` — completely UNLIT**. No lights, no PBR, no rim: the "soft-diffuse lit form" is 100% post-hoc blur (below).
- **No transform is ever set** — position/scale inside the cube are BAKED into the DRC (the detail scene separately uses `interior.objScale: 1.1`, L32124). It is added as a sibling in the tumbling cube group, so it tumbles rigidly with the ice.

**The two-pass render** (`aF.update`, L39304-09 — mechanics verbatim):
- Pass 1 (into `_transmissionRT`): every cube's ice material flips `side = BackSide`, `tTransmissionSamplerMap = bg.png`, `uTransmissionSamplerSize = (4,4)`; `mesh3.visible = true`; smoke (`mesh2`), plexus, `textsGroup`, `blurrytext`, `backgroundshapes` all hidden. **The `k3` fog background stays VISIBLE** → the RT contains: animated fog bg + back-face-refracting ice + the unlit inner objects. Whole scene rendered once into the RT.
- Pass 2 (to screen): `side = FrontSide`, `tTransmissionSamplerMap = _transmissionRT.texture`, sampler size = RT size; `mesh3.visible = false`; everything else back on. Front faces refract an image that already contains the refracted back faces + the inner object → double refraction from ONE extra scene render.
- ⚠ CORRECTION to the dossier perf note: the RT is **FULL canvas resolution** (`resize()` L39373: `_transmissionRT.setSize(resolution.x, resolution.y)`), `generateMipmaps: true`, HalfFloat, `samples: 0`. The initial `new vt(2,2,…)` (L39238) is just a placeholder size.

**Where the softness comes from** (WL, L37847-57): the refraction sample is
`textureLod(tTransmissionSamplerMap, coords, lod)` with
`lod = log2(samplerSize.x) · roughness · clamp(2·ior − 2, 0, 1)`.
At `ior 1.18` the ior factor is **0.36**; with full-res RT (`log2 ≈ 11`) and `roughnessFactor = 0.65 × roughnessMap.g × (1 − mousefrost)` the lod lands ≈ 0–2.6 — mip levels 0–3 of the RT. Add the per-sample `distortionNormal` jitter + the per-channel IOR ladder and you get the dreamy, grainy diffusion of the penguin. **Hover-sharpen is free**: frost sets `roughnessFactor *= 1 − mousefrost` → lod → 0 → the inner object snaps into focus along the pointer trail. The entire "lit soft form inside the ice" is: unlit baked texture + RT mip chain + refraction jitter + bloom. Nothing else.

**Why it darkens mid-tumble / brightens at rest**: no brightness uniform exists. Tumble angle is multi-revolution (`11/14/6 rad` per progress unit, §A7); mid-flight the big faces rarely align with the env map's giant white sun (§A3) → the body shows mostly dispersed refraction of grey fog = dark glass with occasional warm patch glints. At rest the authored orientation parks the large bevels on the sun + the penguin sits upright in the RT. Purely alignment.

**Render order ladder** (igloo cube scene): bg −99 · ice 3 · blurrytext 5 · background shapes 9 · inner mesh 10 (RT-only) · smoke 15 · plexus 20 · callout texts 999.

## A2. Surface relief — the wet-ice ripple

From `nF.init` (L39028) + WL chunk replacements:
- `_roughness.ktx2`: sampled at uv0, **GREEN channel only** — `roughnessFactor *= texelRoughness.g` (L37984-87), after the frost suppression `roughnessFactor *= 1.0 − mousefrost` (L37981-82).
- `_normal.ktx2`: tangent-space, `normalScale (1,1)`, and the load-bearing line `mapN.xy *= 1.0 − mousefrost;` (L38002) — **frost polishing flattens the ripple relief itself**, not just the roughness. The perturbed normal then feeds BOTH the env specular (the micro-shimmer as light sweeps) AND `n` used by the refraction (`n = inverseTransformDirection(normal, viewMatrix)`, L37907) — the ripple literally bends the view of the penguin.
- The ripple's frequency character is authored in the KTX2 (not decodable numerically here): visually a chunky low-frequency wave train + fine grain, co-varying with the roughness map (crests rougher). Procedural twin spec'd in §B-b.
- **Sparkle triangles are interaction-only** (L38007-13, verbatim):
```glsl
totalEmissiveRadiance += mousefrostrim * uColorFrost;
float triangles = texture2D(tTriangles, vNormalMapUv * (9.0 * min(1.0, uResolution.y / 1300.0))).r;
totalEmissiveRadiance += triangles * mousefrostrim * 10.0;
totalEmissiveRadiance += triangles * pow(mousefrost, 2.0);
```
  i.e. the glitter layer only ignites on the frost wave-front (`mousefrostrim × 10`) and in steadily-polished areas (`mousefrost²`). The tiling is resolution-adaptive (×9 · min(1, h/1300)). At rest the cube has NO sparkle — rest-state life is env alignment only. (Our R7-2 sparkle is always-on; different choice, documented, not judged.)
- Final ceiling: `outgoingLight = clamp(…, 0, 1)` (L38013) — bloom (threshold .2, intensity 1, radius .85, levels 6) is driven by broad areas near 1.0, never HDR spikes.

## A3. The warm bronze/petrol iridescence — PINNED (measured)

Candidates eliminated/confirmed by decoding the live assets:
- **`cubes/bg.png` is a 4×4-pixel UNIFORM `#A6ABB7`** (all 16 pixels identical, measured). The entire "world beyond the ice" in pass 1 is one flat grey-blue. Zero structure, zero warmth. (This is why `uTransmissionSamplerSize` is set to (4,4) — it's the literal texture size.)
- **`cubes_env.exr`** (512×256 equirect, decoded): dim-half median `#838D9D`, 74% of pixels cool (B > 1.1·R); ONE extreme HDR sun at equirect (x≈240, y≈87) with RGB ≈ **(3398, 3428, 3284)** — ~3400× white, near-neutral; and ≈**3.6% mildly WARM pixels (R/B ≈ 1.10–1.14, luminance 5–165)** concentrated in the mid/lower band — bright desaturated-amber patches. `envMapIntensity 0.91`, `envMapRotation.y = π` (L39028).
- No scene lights exist (the only light code in the bundle is stock three.js chunks; the cube scene builds only `createEnvironmentMap`).
- Corroborating palette evidence: the smoke billboard declares (but never uses) `uColor1: #886a3d` (L39040) — the bronze family was art-directed into this system.

**Mechanism, pinned**: mid-tumble bronze = the physical material's env-IBL specular sweeping the EXR's warm bright patches through the rippled normal; petrol/teal = the 3-sample per-channel IOR ladder splitting the cool refraction (fog + flat #A6ABB7). The warm note is **asset-side (env map)**, not a shader constant. Transplant hook: a low-gain warm glint lobe (§B rollout item 5) reproduces it without textures, inside our sanctioned desaturated-amber allowance.

## A4. Plexus — full construction (`sF` L38905, points `ZL` L38681, lines `$L` L38789)

- **18 points** on a vertical cylinder around the cube: radius = `boundingSphere.radius · 0.9`, per-point radius jitter ×[0.8, 1]; height treadmill over `treadmillDist = 3` (wrap into ±1.5 via `tF`, L38897).
- **Drift law** (L38925-27): angle orbits at `(rand − .5) · .5 rad/s`; xz wobble `± 0.1·sin(t·0.5 + seed)`; y climbs `rand · 0.25/s`, treadmill-wrapped.
- **Connection rule** (L38964-97): candidates = other points within **distance < 3**, then **Fisher-Yates SHUFFLED** (`iF`, L38899 — ⚠ random pick, NOT nearest-first), max **3 connections/point**, max 18 shown points; connect AND disconnect tween `progress` linearly over **0.35 s**; a line draws from pt1 toward `lerp(pt1, pt2, progress)`.
- **Scroll gating** (L38921-29): `_canConnect` requires the cube near screen center (**|worldΔ| < 1.25**, world units — see §A5 for the variable) AND point |y| < 1.125 AND not-just-wrapped. Scrolling away flips it false → every connection tweens out in 0.35 s — the plexus dissolves between stones automatically, no opacity uniform.
- **Materials**: points = gl.Points, `#666666`, `gl_PointSize = 50/viewDist · (res.y/1300)`, PLUS-sign sprite (aastep cross, size .1) that rotates 1.3 rad → 0 as it pops in; lines = `#7f7f7f` with a dash mask `smoothstep(0.4, 0.5, sinenoise(wPos·10.1))` (broken dashes). BOTH use `mix(vec3(0), color, smoothstep(0.75, 1.5, length(wPos)))` — segments near the cube fade to black, and with **additive blending** black = invisible → the net visually "keeps its distance" from the stone. depthTest on / depthWrite off, renderOrder 20.
- Group copies the cube's full tumble rotation each frame (L38998); hidden during the RT pass; on detail-open the lines flash (uHoverMix ±1 tween chain) and points fade (uHover 1→0, .35 s).

## A5. Callouts — gating windows + the TEMP truth

**⚠ CORRECTION (units)**: the gate variable is **NOT the progress delta** — `KL.update` forwards `nF`'s `r = scrollPosition − cameraY` (WORLD units; cube spacing = 5.75; visible viewport ≈ 4.14 world units at fov 45, dist 5, zoom 1). Negative r = cube approaching from below, positive = passed.
- Show/hide condition per element: visible while `1 − |fit(r, lo, hi, −1, 1)| ≠ 0`, i.e. while r ∈ (lo, hi):
  | element | window (world units) | window (fractions of a viewport ≈ 4.14) |
  |---|---|---|
  | title + leader (`YL`) | (−1.6, +0.5) | (−0.39, +0.12) |
  | date/CLICK (`qL`) | (−0.6, +1.25) | (−0.14, +0.30) |
  | TEMP (`XL`) | (−1.2, +0.5) | (−0.29, +0.12) |
  | frost interaction enable | \|r\| < 2 | ±0.48 |
  | plexus connect enable | \|r\| < 1.25 | ±0.30 |
- Timings: hide 0.2 s; reveal = leader draw 0.2 s + alpha (`uShow1`) 0.4 s + glyph scramble (`uShow2`) 0.75 s, all `ease:"none"`; beep on reveal, throttled 0.4 s, random pick of 3 samples (L38497-508).
- Anchors (bbox-lerp through `mesh.matrixWorld`, verbatim factors): title `(x .35, y-from-top .15, z .93)` → elbow `+LEFT·(−.3)+UP·(.3)` → tail `+LEFT·(−.5)`, drawn anchor→elbow over animationProgress 0–.5, elbow→tail .5–1; date `(.7, .75, .95)` + single segment `LEFT·(+.7)`; TEMP `(.7, .15, .93)` + offset `LEFT·(.3)`, no leader. Text scale `min(0.8, 0.5/(screen.h/1300))` — resolution-adaptive.
- Scramble verbatim: `vUv.x = mod(uv.x + 0.125 * mod(floor((1.0 − tr2) * 5.753), 8.0), 1.0)` with per-char stagger via `textWeights.x` (falloff margin 1.0), atlas column shuffling; numbers use the same trick on a 10-column digit atlas.

**THE TEMP↔FROST COUPLING DOES NOT EXIST** — negative finding, grep-verified (only two `targetTemp` references in the whole bundle):
```js
this.temp = this.targetTemp + Math.sin(Fe.time * .05 + this.random1) * 2;   // L38459 — the ONLY writer
```
±2 °C (= ±3.6 °F) at period 2π/0.05 ≈ **126 s**. The observed live drop 32.28→29.08 °F while hovering is exactly a mid-descent of this slow sine (3.2 °F ≈ 30–40 s of drift) — a coincidence, not interactivity. °F digits `(temp·1.8+32).toFixed(2)` fill quads [4,5,7,8], °C digits quads [10,11,13,14], sign quad −2/−3, via an `isNum` int attribute; updated EVERY frame. Do NOT build a frost coupling "to match igloo" — there is nothing to match.

## A6. The fog world — layers between stones (all GL, zero DOM)

1. **`k3` bg** (L35446-553, fullscreen triangle, opaque, renderOrder −99): duo-octave perlin mix `#c9d0df → #545b6b` over `screenUv·aspect·0.3`, drifting at `time·0.075`, scroll-coupled `offset1.y −= uProgress·0.65` total; **dot-matrix layer**: `dot_pattern.ktx2` tiled ×45, scrolled `−uProgress·10` (≈15× the perlin's scroll speed — strong parallax), per-cell twinkle `1 − |fract(hash(cell) + time·0.1) − .5|·2` (triangle wave, 10 s period); blue-noise dither `+ noise.rgb · 0.05`.
2. **`z3` ghost HUD text** (L35559-660): **GL, and the blur is BAKED** — a Draco mesh of text quads (`blurrytext.drc`, per-quad `centr` attribute) textured from `cubes/blurrytext_atlas.ktx2`, an atlas of PRE-BLURRED strings. No DoF pass anywhere. Placed in CLIP SPACE (`gl_Position = vec4(pos, 1)`): depth = `centr.z·.5+.5`; scale `×2.5·mix(1, 2, depth)` (deeper = bigger = softer, selling distance); scroll `offset.y = fract(base + uProgress·1.25·depth)·2−1` — per-depth parallax + infinite vertical treadmill; alpha = `smoothstep(0.1, 0.6, perlin(pos·3 + t·0.075))·tex.r·1.2` — text patches fade through the fog. White, transparent, depthTest off, renderOrder 5.
3. **`rF` background shapes** (L39120-229): pre-fractured billboard shards (`background_shapes.drc`, per-piece `centr`/`primrand`) textured with `shapes_blurred.ktx2` (blur baked AGAIN), additive; alpha = product of three traveling sines ×0.9+0.1, ×0.65; z-rotation `uProgress·5·mix(.1,.5,primrand) + time·.2·primrand`; y-translate `uProgress·10`; rendered through a FIXED viewMatrix (identity rotation @ z −5) so camera displacement/shake never parallaxes them.
4. **Empty-beat pacing** (scene stack heights, L35044/L39238/L42043): intro/rocks h = **2.35** → cubes h = **3** (= cube count) → tunnel h = **5.5**. Inside the cubes scene, progress runs over `height+1 = 4` scroll units; cubes sit at progress .25/.5/.75 → camera travel 23 world units, spacing 5.75 world ≈ **1.39 viewport-heights** between stones (at the midpoint each stone is ≥ 58% of a viewport off-center — the screen is essentially fog + dots + ghost text). The scene's FIRST and LAST progress quarters contain **no cube at all** — it enters and exits on a full empty fog beat.

## A7. Scroll feel — the consolidated FEEL table

| parameter | value | source |
|---|---|---|
| wheel→scroll units | `delta.y × 0.00075` (1 unit = 1 viewport) | L44612/44799 |
| smoothing | cascade: `targetY1 = lerpFPSLimited(→targetY2, .075, maxStep .075/frame)`; `y = lerpFPS(→targetY1, .15)` | L44645 |
| max lead clamp | `targetY2` clamped to `y ± 0.5625` units | L44646-47 |
| settle snap | \|y − targetY2\| < 7.5e-5 → hard snap, kill both targets | L44647 |
| velocity | `+= \|Δy\|`, × `frictionFPS(0.98)`, clamp [0,1], deadzone .001 | L44647 |
| velocity→FOV | `fov = 45 − 5·velocity` | L39310 |
| responsive zoom | `camera.zoom = min(1, aspect·1.25)` (portrait zooms OUT) | L39373 |
| camera life | mouse displacement (.1, .05); shake .02 @ speed .1 | L39260 |
| autoCenter trigger | 1.4 s idle after last input | L44671 |
| autoCenter (boundary on screen) | tween to boundary alignment, 2 s + per-scene extension, ease `inOut3` | L44690-99 |
| autoCenter (inside cubes scene) | `r = nearestCubeOffset × (height+1)`; duration `clamp(\|r\|·6, 1.6, 2.4)` s | L39323-33 (`aF.autoCenter`) |
| per-scene autocenter anchors | rocks .495/.495 · tunnel .2/.76 | L35046/L42043 |
| scroll tumble | `rot.(y,x,z) = (11,14,6)·sign·(1−rand[.1–.3])·(centered−progress) + wobble` | L39099-117 |
| idle wobble | `sin(t·0.3 + seed)·0.1·sign(rand−.5)` per axis | L39113-16 |
| detail open/close | zoom → −3.5 (1.25 s power3.in) / back (1.45 s power3.out); wobble amp → 0/1 | L39335-71 |
| frost sim cadence | ≥ 0.015 s between steps; splat vel `+= dist·6, ×0.88`, radius `0.05·smoothstep(.1,1,vel)` | L38671-75 |

---

# PART B — TRANSPLANT SPEC (on top of the in-tree R7-2 pass)

**Our frame** (verified at HEAD): band-anchored crystals (`CrystalCluster.tsx` — camera-locked group per `[data-lattice-anchor]`, uniform scale `rect.h·k·0.17`, centering scalar `a = (vpTop + rect.h/2 − ih/2)/ih`); transparent canvas over DOM navy; `crystalBuild.ts` = zero textures/RT/storage, vertex slots 5 (broken)/3 (healthy) of 8; R7-2 already ships 2-lobe facet env, dark body (`uBodyDarken .5`), rim dispersion, sparkle cells, frost vnoise3, terraced silhouette; PostFXNodes owns the single post chain (scenePass → bloom(threshold≈1) → vignette → grade), one `useFrame(…,1)` render; SignatureLine is the only camera authority; NO violet — white-cyan + sanctioned desaturated amber only.

## B-a. INNER OBJECT — the decision

| | (i) transmission-RT (igloo-faithful) | (ii) procedural SDF inside the refraction | (iii) plain inner mesh + glass overlay |
|---|---|---|---|
| mechanism | render the inner mesh into a mipmapped RT; sample it in the dispersion ladder at the refracted coords with roughness-driven `textureLod` (igloo lod law §A1) | evaluate a small SDF along the refracted direction in crystal-local space; shade flat + distance-fog into the body | mount the GLB inside the group, drawn before the crystal; crystal body alpha (0.94) + rim layer over it |
| what it buys | the REAL brand-in-ice read: parallax-correct, swims with tumble, blurs with roughness, sharpens under future frost-polish — the penguin twin | "something luminous inside": magical glow, correct refraction swim, zero bindings, works on lite | 3D parallax only; no refraction swim (the mark stays rigid while the backdrop swims → visibly "behind glass", not "in ice") |
| cost | 1 extra render of a ~15 KB mesh + mip gen per frame ≈ 0.3–0.8 ms GPU at half-res; +2 fragment bindings (texture+sampler — NOT storage/vertex slots, both walls untouched); code: RT plumbing in the island + a `texture()` branch in `backdrop()` | ~10–20 ALU per sample (bounded: evaluate once with the k=0 direction, reuse offset per channel); zero bindings, zero passes | ~0: one small mesh + a basic node material |
| risks | must run on BOTH backends (three/webgpu WebGL2 fallback: RT + texture() is supported core — still gate behind the `?backend=webgl2` proof); RT must not exist on lite | an arbitrary logo is NOT expressible as a cheap SDF — fidelity collapses to "glowing blob" unless the mark is geometrically simple | reads cheap next to the swimming backdrop; least "igloo!" |

**Recommendation**:
- **healthy → (i), single-pass variant**: render ONLY `public/models/sersan-mark.glb` (15 KB, already in-repo — the brand-in-ice is the literal twin of penguin-in-ice) into ONE shared **half-res** RT (HalfFloat, `generateMipmaps: true`), unlit emissive white-cyan ≤1.0 `toneMapped:false`, transparent-black clear. Sample it ADDITIVELY over the existing procedural backdrop inside the dispersion ladder: `inner = textureLod(tMark, refrCoord, log2(rtSize)·roughEff·0.36)` — igloo's exact lod law with our `roughEff` (frost-veined) driving the blur, so the frost veins already modulate its softness. Skip igloo's back-face pass in v1 (the double-refraction is a later flag; the single-pass RT alone delivers the read). Render the RT only while a healthy band is within the cull window; **lite tier / WebGL2-unproven: branch not built — procedural backdrop only** (today's look, graceful).
  - Driver shape: the RT render belongs in the island's existing single `useFrame` (before PostFXNodes' priority-1 render — CrystalCluster's frame runs at priority 0), rendering a dedicated micro-scene (mark mesh + orthographic or the main camera with the mark placed at the crystal's local origin, scaled ~0.9 crystal units, counter-rotated by the mesh tumble so it appears rigid INSIDE the tumbling crystal exactly like igloo's sibling-mesh arrangement — simpler: put the mark in the crystal group in a `layers`-masked channel and render the main scene with that camera+layer into the RT, igloo-style visibility toggling is the WebGL idiom; the micro-scene is the cleaner three/webgpu idiom).
- **broken → (ii), dim ember core**: a 2–3-term SDF — one soft ellipsoid at the cluster center + two smaller blobs riding `aCentr` of shards 0/1 (the large bodies) — evaluated at the refracted direction, colored **desaturated amber** (`#886a3d` family — §A3 pinned igloo's interior warmth as env-side amber, so this is the faithful hue), low gain (≤0.35), breathing with `uGap`/the fracture surges (dimmer when exploded wide, brighter on re-cohere — "something still alive inside"). Mark fragments would read as noise at broken's on-screen size; the ember is the honest broken-mode soul.

## B-b. Ripple surface normals (procedural band on top of R7-2's frost)

igloo's relief is an authored normal map feeding BOTH shading and refraction, suppressed by frost (§A2). Procedural twin, full tier only:
- `ripple(p) = sin(dot(p, d1)·F + vnoise3(p·F·0.6)·W) + 0.6·sin(dot(p, d2)·F·1.7 + …)` over `vLocal`, with `F ≈ 7–9` (a clearly SEPARATE band above `CRYSTAL_NOISE_FREQ 1.6` and below `SPARKLE_FREQ 15`), `d1/d2` two fixed skew directions, warp `W ≈ 1.5`.
- Apply as a **normal-space perturbation to the SHARED `N` before fresnel/lobes/refraction** (igloo's map feeds both): analytic gradient `grad = cos(arg)·F·d1 + …`, `N' = normalize(N + (grad − N·dot(N, grad)) · RIPPLE_AMP)` with `RIPPLE_AMP ≈ 0.10–0.15`. Keep the existing refraction-only jitter `Nj` ON TOP (igloo's blue-noise grain twin).
- Cost: 1 vnoise3 + ~12 ALU; zero bindings; lite skips the branch. Config: `RIPPLE_FREQ / RIPPLE_AMP / RIPPLE_WARP` + `uRippleAmp` in the dev handle.
- Payoff: the key lobe shimmers across facets as the crystal tumbles (wet-ice micro-shimmer) and the inner world (backdrop AND the §B-a mark) wobbles through the relief.

## B-c. Plexus around our crystals

- **Restraint recommendation: healthy crystal ONLY, and small.** The neural constellation already provides ambient linework, and broken already carries shards + chips + the fracture field — a second net there muds. (Owner-visible choice; flag in review.)
- Construction (igloo law, scaled): **10–12 points** (not 18) on a cylinder radius `0.9 × crystal bound (~1.6 crystal units)`, treadmill height 3 crystal units; drift law verbatim (§A4: orbit `(rand−.5)·.5`, wobble `.1·sin(t·.5+seed)`, climb `.25/s` wrapped); connection distance < 3 crystal units, shuffled candidates, max 3/point, 0.35 s linear connect/disconnect tweens.
- **Scroll-gating for free**: reuse igloo's rule with our centering scalar — `_canConnect` only when `|a| < 0.30` (the plexus twin of igloo's |r|<1.25 ≈ ±0.30 viewport) → the net dissolves itself between sections with zero opacity plumbing.
- Rendering: ONE `LineSegments` (maxLines·2 = 72 verts, positions rewritten CPU-side per frame — trivial) + ONE `Points` (12), `LineBasicNodeMaterial`/`PointsNodeMaterial` with a small `colorNode`: radial mask `smoothstep(0.75·R, 1.5·R, length(localPos))·white-cyan` and the dash mask `smoothstep(.4, .5, vnoise3(pos·10.1))`; our canvas is transparent so replace igloo's additive-black-mask trick with the SAME expression driving **alpha** (additive-over-DOM works too, but alpha keeps the fade honest over light DOM if themes ever change). Group copies the crystal mesh rotation each frame; renderOrder −2 (between crystal −3 and the constellation). Position attribute only — zero storage bindings, one vertex slot.
- Budget: 2 draw calls, < 0.1 ms. Lite tier: not mounted.

## B-d. Callout gating + live readout

- Our callouts are DOM with driver-written CSS vars (`--callout-N-left/top`). ADD one var per callout: **`--callout-N-vis`** (0|1), gated on the same `a` the tumble uses, with igloo's windows mapped to viewport fractions and widened for our slower band traversal (start values, tune by feel):
  | callout | igloo window (viewport fr.) | ours (start) |
  |---|---|---|
  | 0 (title-like) | (−0.39, +0.12) | (−0.55, +0.25) |
  | 1 (date-like) | (−0.14, +0.30) | (−0.30, +0.45) |
  | 2 (temp-like) | (−0.29, +0.12) | (−0.45, +0.25) |
  Staggered windows are the igloo life-giver: elements arrive/leave at DIFFERENT scroll moments, with the asymmetric 0.2 s out / 0.4 s in CSS transitions on opacity (+ a 2–4 px translate). Rising edge also re-triggers the existing LabelScrambler (our glyph-shuffle twin — do not port igloo's atlas-column trick; we already own the effect in DOM).
  Driver cost: 3 more damped write-on-change CSS vars in the existing loop — the `CALLOUT_DAMP/WRITE_EPS` machinery extends as-is.
- **Live TEMP-style readout = NEW COPY → OWNER DECISION (do not ship copy from this spec).** Mechanism if approved: value = `base + sin(t·0.05 + φ)·amp` (igloo verbatim — and per §A5 there is NO interaction coupling to replicate), formatted to 2 decimals in JetBrains Mono, written to a `<span>` at ≤10 Hz via the existing driver. Candidate semantics for the owner: a drifting "SIGNAL/LOAD/UPTIME" metric per crystal. Until decided, the gating windows alone (above) capture most of the igloo callout feel.

## B-e. Fog/depth layers + empty beats — parameters handed to the continuous-space work

(`2026-08-22-round7-continuous-space-spec.md` did not exist when this was written — these are the measured igloo numbers for that spec to consume; it owns layer placement/ownership. Do not double-implement.)
- Layer recipe (§A6): slow perlin duo-octave bg drifting at `t·0.075`, scroll-coupled ×0.65; **dot-matrix at ×45 tiling scrolled 15× faster than the fog** (the parallax ratio is the depth-seller), per-dot triangle-wave twinkle period 10 s; ghost text with **BAKED blur** (igloo pre-blurs the atlas — the lesson for us: if ghost HUD strings go in, pre-blur them as textures/SVG or accept crisp-but-dim DOM text; do NOT put CSS `filter: blur()` on large live text — paint storm, and no runtime DoF exists in igloo either), per-depth parallax `×1.25·depth` + treadmill wrap, perlin-gated alpha `smoothstep(0.1, 0.6, n)`.
- Empty beats: igloo gives **1.39 viewports between stones** and a FULL empty viewport before the first/after the last (§A6.4). Our equivalent: the two crystal bands should keep ≥ 0.5 viewport of low-content navy above/below (a DOM spacing/section-layout decision — flag to the continuous-space owner), so each stone gets its solo beat.

## B-f. Scroll feel — what transfers to native scroll + Lenis (NO scene-stacking, NO hijack)

- **Smoothing**: igloo's cascade (.075 limited → .15) ≈ a single effective lerp ~0.06–0.08 at 60 fps. Action: verify our Lenis `lerp` sits in 0.08–0.10; the stones' heavy-smooth feel is Lenis config, not new code.
- **Settle-upright**: igloo's tumble reaches exactly 0 only at exact center. Ours never rests at exact center (native scroll) — add a **deadzone remap** so the crystal reads "settled" through a window: `a′ = sign(a)·max(|a| − DZ, 0)/(1 − DZ)` with `DZ ≈ 0.08` (viewport fr.) feeding the tumble. This is the no-hijack twin of autoCenter's visual outcome. (The cuts spec already recommended shipping WITHOUT scroll snapping on a DOM page; unchanged here. If the owner ever wants true snap: Lenis `scrollTo(bandCenter, {duration: clamp(|Δ|·6, 1.6, 2.4), ease: inOut3})` after 1.4 s idle — igloo's exact numbers — behind a flag.)
- **Velocity coupling**: igloo's `fov = 45 − 5·vel` is a camera write — FORBIDDEN here (SignatureLine owns the camera). Faithful substitutes on existing authorities: crystal group scale `s·(1 − 0.03·vel)` + feed `vel` into the existing PostFXNodes velocity uniforms (the warp/vignette already have the channel). Same read (speed compresses the world), zero contract breaks.
- **Idle wobble/tumble grammar**: already in-tree verbatim (TUMBLE_K/RAND, WOBBLE_*) — no change.

## Rollout order (biggest "igloo!" first) + QA gates

1. **Inner object** — healthy mark-in-RT + broken amber ember (§B-a). The owner's literal ask ("the penguin INSIDE").
2. **Ripple normal band** (§B-b) — the wet-ice surface, the second-most-cited live observation.
3. **Callout gating windows** (§B-d vis vars) — cheapest life-per-line in the whole spec.
4. **Warm glint lobe** — third env lobe, desaturated amber `#886a3d`-family, gain ≤0.25, gated on a narrow `pow(max(dot(Nf, WARM_DIR), 0), 24)` so it flashes only at specific tumble angles (§A3 mechanism twin).
5. **Plexus** (healthy only, §B-c).
6. **Scroll feel** — deadzone settle + velocity→scale/postFX (§B-f).
7. **Fog/dot/ghost parameters** → hand §B-e numbers to the continuous-space implementation.

**QA gates**
- Backend proof: `?backend=webgl2` renders the mark-RT path OR cleanly falls back (branch un-built ⇒ no black frame, no console errors) — the R7 open item from memory applies to every new branch here.
- Binding recount: crystal fragment +2 (texture+sampler) — storage walls (8) and vertex slots (5/3 of 8) untouched; assert in the crystalConfig budget comment.
- Perf: mark RT ≤ 0.8 ms desktop (measure via the dev handle timer); phone/lite tier compiles NO new branches (RT, ripple, plexus, warm lobe all full-tier).
- Depth/compose: the RT is a separate target (never stamps main depth); crystal `Discard(alpha<0.05)` contract unchanged; SignatureLine camera authority untouched (grep: no `camera.` writes added).
- Island discipline: all new per-frame work refs+getState inside the existing `useFrame` (commit-wedge rule); CSS-var writes stay damped + write-on-change.
- Visual proof (Playwright, desktop+mobile): healthy band at a = −0.3 / 0 / +0.3 (tumble sweep — mark swims, settles upright, callouts stagger in); broken hover re-cohere with the ember breathing; console clean.

---

## Caveats / Not Found

- The ripple normal map's exact frequency spectrum is inside `cube*_normal.ktx2` (binary KTX2/Basis — not decoded); §B-b's F≈7–9 is calibrated from the live visual read, tune via `uRippleAmp`/`RIPPLE_FREQ`.
- `Er` (the raycast interaction manager) and the audio controller were not re-mined beyond what §A4/A7 needed.
- The igloo frost wave-sim itself (jL/JL) was verified but its transplant is deliberately NOT re-spec'd here — the dossier's §5 recipe stands; hover-polish becomes valuable AFTER §B-a lands (it is what the polish reveals).
- `2026-08-22-round7-continuous-space-spec.md` absent at write time — if it lands with conflicting fog-layer ownership, ITS placement wins; only the measured igloo numbers in §B-e are load-bearing.

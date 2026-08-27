# SYNTHESIS — SerSan founders particle portrait vs. lusion.co/about "TEAM"

Date: 2026-08-27 (evening). Synthesis of 14 dossiers in this folder (`local-sampler`, `local-kernel`, `local-island`, `local-rail`, `local-prior-research`, `lusion-live-reverse`, `web-lusion-bundle`, `web-lusion-threads`, `web-lusion-look`, `web-codrops`, `web-repos`, `web-physics`, `web-3d-from-photo`, `web-gaps`) plus a re-read of the **current working tree** of `C:/Users/alber/Desktop/Sersan`. Every number below carries its source (dossier §, file:line, or URL). Where dossiers disagree the discrepancy is named and resolved.

> **Repo-state warning (read first).** The five `local-*` dossiers describe the code as of **HEAD `f38e08f`** (= production on Vercel). Between 16:11 and 16:13 the main session landed an **uncommitted** first implementation of the depth-matte + lit path in the working tree: `scripts/generate-founder-depth.mjs` (97 lines), four `public/founders/<anchor>-depth.webp` twins, `+280` lines in `sampleImagePoints.ts`, `+270` in `FounderPortraitMorph.tsx`, `+463` in `gpgpuNodeSim.ts` (`git diff --stat`). All `gpgpuNodeSim.ts` line numbers quoted from the local dossiers are therefore shifted in the tree (e.g. `PORTRAIT_SIZE_MIN` 1575 → 1716; the eight `instancedArray` declarations 1208-1216 → 1296-1304, 1426, 1444). §1.7 evaluates that in-tree work; §4B and §5 are written as "finish and verify it", not "start it". The tree also carries unrelated in-progress edits (positioning, hero beats, crystal, N=4 Alberto placeholder), so the commit strategy in §5 matters.

---

## 0. Executive summary

1. **Root cause of the empty patches (production):** the sampler's `ink` — the scalar that drives disc DIAMETER, the alpha knee, the sub-pixel `cov²` term and the `Discard` — is the luma-weighted **colour distance from the white studio wall**. On a white-wall headshot that is numerically *darkness*: `corr(ink, 1−lum) = +0.948 / +0.952 / +0.886` on Alessandro / Michele / Mattia (`local-sampler` §6.2a). Bald scalp, forehead and cheek highlights are inside the (correct) flood-fill mask but sit 0.02–0.11 from the wall in that metric → ink 0–0.34 → discs 0.15–0.8 × the lattice pitch → 3–45 % of each cell painted; Michele's brightest band (592 cells) has **median ink 0.000** and is discarded outright (`gpgpuNodeSim.ts` `Discard(alpha < 0.02)`). The flood fill fixed *masking* holes; nobody changed the *tonal* model (HANDOFF contract 12 says it verbatim: "ink è distanza dallo sfondo misurato, non oscurità").
2. **Root cause of the "flat dithered photo":** the render is an amplitude-modulated halftone by construction — one crisp disc per cell of a regular 290×405 lattice (±0.45-cell jitter), tone carried by disc size, `NormalBlending`, `depthTest/depthWrite:false`, no normal, no light, z-relief capped at 4 % of face height, `antialias:false`, full-ink disc 2.1× a pitch of 1.9 devpx (dpr 1) / 3.9 devpx (dpr 2). Nothing in the pipeline knows a surface exists.
3. **Lusion's TEAM head is not a photo effect.** It is a pre-baked **8,192-point front-hemisphere point set per person** (`team/<id>.buf`, 82 KB) with a **per-point normal + baked shade**, drawn as instanced quads, additive One/One, lit in real time by a point light attached to the mouse, with per-particle depth-of-field, a sweeping scanline, a front-face gate, and a two-mesh cross-dissolve for person changes; glyph rain and contour lines are separate baked layers; colour comes from a burn/dodge post grade + bloom (all confirmed from the shipped bundle, §2). Brightness never depends on photo luminance, so "white skin = white wall" cannot happen.
4. **The gap is data + rendering regime, not shader polish:** SerSan needs (a) a geometric matte and per-particle depth/normals, and (b) *fewer, larger, softer, additive* discs — Lusion draws ~6k visible points at ≥12 px; SerSan draws 52–80k points at 2–4 px.
5. **The working tree already contains Approach B's core** (§1.7): Depth Anything V2 twins, ink = presence (depth cut 0.3 AND flood fill), z from depth (relief 0.34 of face height, parked at 0.2 at rest), normals from the depth gradient packed into the existing tint vec4 (`[rgb24, nx, ny, ink]`, **zero new bindings**), vertex-stage lighting (ambient 0.08 + wrap-Lambert 1.0 + rim 0.55 + scanline 0.35), DoF/bokeh, front-face gate, additive blending, pointer light, rest parallax 0.16/0.10 rad. It has been live-tuned on the WebGPU laptop (per the `DEFAULT_LOOK` comment) but is **uncommitted, undocumented in the HANDOFF, not agent-QA'd, still in the tiny-disc regime (1.15× pitch), still relief-capped at rest because of comb tearing, and the depth twins were generated with the CC-BY-NC-4.0 `base` model** (verified on the HF API today).
6. **Recommendation:** ship **B** — finish the in-tree lit path with six concrete steps (§5): regenerate depth with the Apache-2.0 `small` model (or Depth Anything 3), move to the Lusion disc regime (≈15–25k particles, ≈2× pitch, soft edge, additive, bloom), remove the comb with a perspective pre-divide and/or silhouette depth dilation so `REST_RELIEF` can rise, bake AO into the colour lane, cap DPR at 1.5, then run the WebGPU QA protocol and commit engine and content halves separately. Glyph rain, contour lines and HUD accents are three optional, independent islands (§5.3), each with Lusion's exact parameters as a starting point.
7. **Do not copy** Lusion's cross-fade-with-glitch (SerSan's spring-flight morph with HDR travel tint is an established signature and works with index pairing), the acid-green grade, or violet (permanent brand directive). Copy the *physics*: normals + light + bokeh + energy conservation + front gate.

---

## 1. DIAGNOSIS

### 1.1 What production renders (HEAD `f38e08f`) — the pipeline

```
headshot 1200×1800 ─cover-crop→ canvas 290×405 (117,450 cells)            sampleImagePoints.ts (HEAD L184-209)
  r,g,b,lum per cell; wall colour = median of two 14×14 TOP corner patches    L224-257
  dist = sqrt(.299dr² + .587dg² + .114db²)   (luma-weighted distance from wall) L259-266
  bgMask = border-seeded flood fill over {dist < 0.055}, no descent below row 0.62·H   L268-311
  ink = 0 if bgMask else ((dist·1.7 − 0.03)/0.97)^0.62 · fade(y)                L313-340
  UNION over portraits of {ink > 0.03} → shared cell list (same j in every image)   L437-451
  emit: xy (+hashed ±0.45-cell jitter), rgb→linear, z = (lum−0.5)·90, ink        L345-403
─→ FounderPortraitMorph.tsx: world fit (STAGE_FILL 0.92), z × zFactor with Z_RELIEF_MAX_FRAC 0.04, pointSize so full-ink disc = 2.1 × pitch
─→ gpgpuNodeSim.ts createTextMorphComputeBuild: compute (8/8 storage) spring 52 / damping 7.5 / maxSpeed 16 / turb 9;
   render: instanced quads, size = uPointSize·dpr·(0.06 + 0.94·ink)·(0.85+0.3·rand)/dist,
   colour = photo linear rgb × 1.18 (no lighting), alpha = disc · smoothstep(0,0.1,ink) · cov², Discard(alpha < 0.02),
   NormalBlending, depthTest/Write OFF.
```
(Sources: `local-sampler` §1–§5, `local-kernel` §1–§2, `local-island` §3–§6.)

### 1.2 Root cause 1 — `ink` is chromatic, so bright skin is starved

- **Mechanism.** The backdrop is removed *spatially* (the flood fill is correct: `michele_bgmask.png` is a clean silhouette with no hole in scalp/forehead/cheeks — `local-sampler` §4), but the tonal scalar is still `g(dist-from-wall)`. Against a neutral white wall "far from the wall" ≡ "dark". The curve is therefore an inverted halftone: beard/brows → ink 1.0 → disc 2.0× pitch; lit skin → ink 0.3–0.47 → disc 0.76–1.0× pitch; scalp highlight → ink 0.02–0.18 → disc 0.15–0.47× pitch (`local-sampler` §3 table, §6.2b).
- **Per-luminance-band evidence** (subject cells only, above the fade band; `local-sampler` §6.2b):

| lum band | Alessandro ink → disc/pitch | Michele ink → disc/pitch |
|---|---|---|
| < 0.30 (hair, beard) | 1.000 → 2.00 | 1.000 → 2.00 |
| 0.72–0.80 (lit skin) | 0.463 → 0.99 | 0.468 → 1.00 |
| 0.80–0.88 (lit cheek/forehead) | 0.339 → 0.76 (37 % of cells < 0.7 pitch) | 0.339 → 0.76 (25 %) |
| 0.88–1.0 (scalp highlight) | 0.079 → 0.27 (100 % < 0.5 pitch) | **0.016 → 0.15 (99.8 % < 0.5; median ink 0.000)** |

- **Where the sub-pitch cells are** (`local-island` §9, independent Python port of `readGrid`, union 51,249 vs 51,751 in-browser, −1 %): Michele **20.0 %** of face cells below the pitch (4,136 / 20,664), Alessandro **15.2 %**; Michele rows 80–99 (scalp) **59.4 %** sub-pitch, rows 100–119 (forehead) 43.5 %, rows 160–179 (cheeks/glasses) 23.8 %; a second void at the collar/throat (subject cells with ink < 0.2 cluster in the y 0.5–0.62 band: Michele 201, Alessandro 179 — `local-sampler` §6.2e).
- **The GPU chain that turns small ink into nothing** (`local-kernel` §2.4, worked at pitch 4.48 devpx): ink 0.31 → 3.3 devpx disc, 43 % area coverage → visible gaps; ink 0.056 → 1.06 devpx, `cov² = 0.46`, knee 0.63 → alpha 0.29; ink 0 (pixel within 0.018 of the wall) → `smoothstep(0,0.1,ink) = 0` → **Discard**. Working-tree locations: alpha knee `gpgpuNodeSim.ts:2274`, `cov²` `:2282-2287`, `Discard(alpha < 0.02)` `:2305`.
- **Why the flood fill cannot help:** any subject cell with `dist < BG_FILL_TOL = 0.055` is by construction "saved" by the mask and by the same construction capped at `ink(0.055) = 0.184` → 0.47 × pitch → ≤ 22 % of the cell painted (`local-sampler` §6.2d: 505 / 577 / 624 such cells per real headshot).
- **Why gain/gamma/thresholds could not fix it:** `inkGain`/`inkGamma` reshape `g(dist)` but cannot flip the sign of a +0.95 correlation; every gate ever tried (`lumCeil/neutralSat` in `69e49a6`, `inkGateLo/Hi` in `065104c`) was a threshold on the *same* chromatic axis and "bucò la testa" twice (`4abdabc`, HANDOFF contract 2; `local-prior-research` §2, §7).

### 1.3 Root cause 2 — the render is a halftone by construction

- Tone = disc diameter on a regular lattice (`sizeNode = uPointSize·dpr·(0.06 + 0.94·ink)·(0.85+0.3·rand)/dist`, `gpgpuNodeSim.ts:2083-2095` in tree), crisp edge `smoothstep(0.5, 0.34, rr)`, `NormalBlending`, `depthTest/depthWrite:false` (painter's order = cell scan order), `toneMapped:false`, no normal/light/rim anywhere in the portrait fragment (`local-kernel` §2.5, §3.3, §4.4).
- z is "luminance relief" `(lum − 0.5)·90` grid-px, then crushed to **±4 % of face height** (`Z_RELIEF_MAX_FRAC = 0.04`, `FounderPortraitMorph.tsx:228`) because a regular grid + perspective + z-from-luminance tears every luminance edge into a comb ("0 = clean, 0.3 = visible tearing, 1 = severe comb", live-verified — `local-island` §5.3). Luminance ≠ depth (a dark beard next to lit skin is at the same depth), so the cap was the only option with that data.
- At every locked stage the orbit/dolly/parallax terms are multiplied by `env = sin(legFract·π) = 0`; the only rest motion is a 0.02 rad yaw / 0.012 rad pitch sway and a 0.4 % breath (`local-rail` §5.5). The visitor reads a frozen halftone print.
- `antialias:false` (`createRenderer.ts:109`) + pitch 1.94 px at dpr 1 (416×555 stage, 51,751 particles) → every disc is a hard 1–2 px dot; at dpr 2 the pitch is 3.9 px and full discs 7.8 px — still a visible dot lattice at 26 rem (`local-island` §5.5, §9).
- The lineage is explicit: the sampler header cites brunoimbrizi/interactive-particles (`psize *= max(grey, 0.2)`, a 2-D brightness→size halftone; https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/) and *inverts it for a light backdrop* — while the stage is `#0B1422`. On a dark stage "bright = small" punches holes into exactly the pixels that carry the face's form (`local-sampler` §7.3).

### 1.4 Root cause 3 — the disc regime (many tiny crisp discs vs. few large soft ones)

Lusion: 8,192 points/person, ~6,100 visible, quad size `0.009` local units (≈ 0.25 world units after the 27.5 container scale), **never below 12 px** (`max(basePointSize, 12/u_resolution.y)`) with energy compensation, additive, bloom amount 12.5 in the team view. SerSan (legacy and lit tree alike): 52k–80k points at 1.15–2.1 × a 1.9–4.5 devpx pitch, normal (legacy) or additive (lit) blending, bloom threshold 1.0. Every dossier that compared the two reached the same conclusion: *density is not the lever, lighting and disc size are* (`web-3d-from-photo` §6.3, `web-physics` §7 "the head reads solid because of the defocus/size law + back-face culling, not density", `lusion-live-reverse` §2 "density on screen comes from point SIZE, not count"). This root cause is **not** addressed by the in-tree lit path (`DISC_PITCH_LIT = 1.15`, `FounderPortraitMorph.tsx:305`).

### 1.5 Contributing factors

- Residual wall/shirt halo below the flood-fill row limit: 12.1 % of kept cells (4,446 in Alessandro's shoulder band) — HANDOFF "Aperto §2", `local-prior-research` §7.
- Stride cliff: `MAX_COUNT_BY_TIER.full` (60,000 at HEAD, **80,000 in the tree**) vs a union that now covers "the whole bust area of the four frames" — not re-measured (`FounderPortraitMorph.tsx:170-177`).
- DPR: SerSan caps at 2 (`min(devicePixelRatio, 2)`), Lusion at 1.5 with a 2560×1440 pixel cap (`web-lusion-bundle` §1).
- The 4th target's headshot is still the placeholder monogram (`alberto-headshot.webp` = `alberto-tuveri.webp`, 15,674 B), so any in-browser union/stride number is provisional.

### 1.6 What the previous rounds got right (keep)

Shared grid + union cell list + index pairing (free A↔B↔C↔D correspondence), border-seeded flood fill, vec4 tint packing read with `.element(instanceIndex)`, chained `mix` morph with per-particle stagger `clamp((uMorphN − 0.55·hash)/0.45)`, clock termination toward the target, `cov²` sub-pixel compensation, the gate/DOM/touch machinery — all representation-agnostic and reused by every approach below (`local-island` §10.4, `local-rail` §8).

### 1.7 State of the working tree (uncommitted, 2026-08-27) — the in-progress fix, evaluated

| Component | In tree (file:line) | Verdict vs. the diagnosis |
|---|---|---|
| Depth twins | `scripts/generate-founder-depth.mjs` → `public/founders/{alessandro,michele,mattia,alberto}-depth.webp` (47–52 KB, 600×900, lossless, WHITE = NEAR, min-max normalised per map) | Correct shape of data. **Licence problem:** the script defaults to `--model base` = `onnx-community/depth-anything-v2-base`, **CC-BY-NC-4.0** (HF API, checked 2026-08-27); `small` is Apache-2.0. Regenerate with `--model small` (or Depth Anything 3, Apache-2.0) and re-measure `depthCut`. |
| Presence ink | `sampleImagePoints.ts:397-438`: `ink = smoothstep(depthCut ± depthEdge)(dep) · fade`, `depthCut 0.3`, `depthEdge 0.05`, AND-ed with the flood-fill mask (`bgMask` still zeroes the border-connected wall) | **Fixes root cause 1.** Inside the bust ink ≡ 1 → every cell draws a full disc. The union grows to the whole bust (ceiling raised to 80,000; `TOUCH_GRID_SCALE` 0.58 → 0.52). Must be re-measured in-browser (`getSampler().stride === 1`). |
| z from depth | `reliefField()` `:447-496`: 3×3 box blur, `z = ((sm − depthCut)/(1 − depthCut) − 0.5)·90` grid-px; island `Z_RELIEF_DEPTH_FRAC = 0.34` (`:234`), kernel `target.z *= uRelief` (`gpgpuNodeSim.ts:1517`), `REST_RELIEF = 0.2` at locked stages → 1 mid-leg (`FounderPortraitMorph.tsx:240, 1232`) | Real depth; comb no longer comes from luminance edges, but the front-facing lattice **still combs at steep depth ramps (ear/jaw) from ~0.3 up** (comment at `:236-240`), so at rest only 0.2 × 0.34 ≈ **7 % of face height** is projected. Volume at rest is carried by lighting only. See §4B step B3 for the fix. |
| Normals | `emit()` `:536-549`: central differences of the same relief field, model-space (x right, y up), stored as `nx, ny`; z rebuilt in the shader | Correct and consistent with z (same scale). Equivalent to the Codrops relighting recipe (`web-codrops` §5.1) minus the luminance-detail term. |
| Packing | `packTint` `gpgpuNodeSim.ts:1361-1386`: lit layout `[rgb24, nx, ny, ink]` — sRGB-encoded 8-bit rgb packed as `r·65536 + g·256 + b` (exact in f32), decoded in the vertex stage (`unpackTintColor` `:1850-1858`, `pow(…, 2.2)`) | **Zero new bindings**: compute stays 8/8, vertex 4 vb + 4 storage — the very option the local-kernel dossier ranked best (§6.2 "Option B"). Colour precision 8-bit sRGB is adequate. |
| Lighting | `litLightExpr` `:1920-1950`: `min(ambient + diffuse·smoothstep(−0.2,1,n·l) + rim·(1−max(n.z,0))², 1) + scan`, light = local-space uniform `uLightPos` driven from the pointer (`LIGHT_BASE [−2.4,2.6,3.4]`, `LIGHT_SWING [3.5,2.5]`, damped 5), scanline `smoothstep(0.06,0,fract(−0.08t − 0.12y + 0.5))·scan·(0.4 + rim)` | Structurally Lusion's model (`local` vs Lusion: Lusion multiplies a **baked shade** and divides by `sqrt(0.1·d)`; SerSan has no baked AO — see B5). Tuned defaults `ambient 0.08, diffuse 1.0, rim 0.55, scan 0.35, mono 0.8, monoTint (0.8,0.9,1.0), photo 0.35` (`FounderPortraitMorph.tsx:282-296`). |
| Front-face gate | `litFrontExpr = smoothstep(frontLo −0.35, frontHi 0.15, n.z)` on disc size `:1885-1891` | Lusion's `linearStep(−0.2, 0, viewN.z)`; fine. |
| DoF / bokeh | `litBlurExpr = clamp(|dist − uFocusDist| / focusRange 1.4)` `:1893-1901`; size × `(1 + b^1.5·bokeh 1.2)`; energy `1/(1 + b·bokeh)` `:1914-1918`; edge `smoothstep(0.5, 0.34 − 0.3b, rr)` `:2225-2231`; alpha × `(1 − 0.55b)` `:2304`; focus plane = group view distance every frame (`FounderPortraitMorph.tsx:1229`) | Lusion: size × `(1 + 8·b^1.5)`, alpha × `(1−b)³·0.8`, edge `range = 5b`, energy `(base/clamped)^1.5`, plus a **12-px minimum**. SerSan's bokeh gain is 7× smaller and there is no pixel floor — with `REST_RELIEF` 0.2 the blur is ≈0 at rest anyway. |
| Tone | `tone = mix(chroma·lumC, monoTint·lumC, mono)`, `lumC = mix(1, lum, photo)` `:2170-2196`, emissive `DEFAULT_EMISSIVE_LIT 0.72` | Cool monochrome with photo chroma reading through — the right family (Lusion is greyscale + blue grade). |
| Blending / size regime | `blending: additive` when lit (`FounderPortraitMorph.tsx:909`), `DISC_PITCH_LIT = 1.15`, `depthTest/Write: false` | Additive is right. **Disc regime is not** (root cause 3): at 416×555, dpr 2 and ~70k particles the pitch is ≈3.3 devpx → discs ≈3.8 devpx (≈1.9 px at dpr 1). Still a dither. |
| Rest motion | `REST_PARALLAX_YAW 0.16 / PITCH 0.10` × `hover`, sway 0.02/0.012, breath 0.004 (`:334-336, 1193-1199`) | Larger than Lusion's ±0.05 rad, justified by the parked relief. OK. |
| Docs / QA | HANDOFF diff adds only the N=4 addendum — **nothing about the depth matte**; `docs/recon-2026-08-27/lusion-team-reverse.md` = the live reverse dossier | Must be documented (contract-level changes: contracts 1, 2, 12 change meaning). Agent QA was impossible (Chrome extension cannot reach localhost — HANDOFF merge gate); the `DEFAULT_LOOK` comment says the owner tuned it live. Needs the §5 protocol. |

**Net:** the tree fixes root cause 1 completely and root cause 2 partially (normals + light + DoF exist; real relief is parked). Root cause 3 (disc regime), the comb at steep ramps, baked AO, the depth-model licence, DPR, documentation and verification remain.

---

## 2. HOW LUSION DOES IT — reconstructed pipeline, evidence-graded

Evidence grades: **[C]** confirmed from the shipped bundle `https://lusion.co/_astro/hoisted.CUO_IjfL.js` (1,251,728 B; prettified copy `lusion-bundle/hoisted.pretty.js`, line numbers below) and the downloaded assets (`https://lusion.dev/assets/...`, parsed with `lusion-bundle/parsebuf.js`); **[I]** inferred from data statistics; **[S]** speculative. Four dossiers reverse-engineered the same bundle independently (`web-lusion-bundle`, `web-lusion-threads`, `web-lusion-look`, `web-physics`) and agree on every constant quoted here; `lusion-live-reverse` (main session) agrees.

### 2.1 Architecture [C]
- One Astro bundle for the whole site, three.js WebGL2 (not WebGPU), `DPR = min(1.5, devicePixelRatio)`, `MAX_PIXEL_COUNT = 2560·1440` (pretty.js:19773-19776). Version string not quoted in any dossier; `local-prior-research` §6.1 records r158 from an earlier analysis **[I]**.
- The TEAM section lives inside the about-page hero stage: `AboutHero.preInit()` creates `aboutPageHeroEfxPrepass, aboutPageHeroEfx, light, sim, lightField, aboutHeroParticles, aboutHeroRocks, aboutHeroGround, aboutHeroLines, aboutHeroPerson, aboutHeroFog, aboutHeroHalo, aboutHeroFaces, aboutHeroLetters` (`web-lusion-look` §1.1). Stage params: `cameraFov 60, bloomAmount 4, bloomRadius .25, bloomThreshold .8, bloomSmoothWidth .3`.
- DOM: `#about-who-team-faces` (hit rect 70 % × 90 %), `[[ 001 ]]` counter, name/role with a matrix-decode scramble, compass tick rulers, an 11×3 dot grid; the WebGL canvas is global and `cameraViewportOffsetX` shifts the projection so the head sits left of the copy (`web-lusion-bundle` §3.3).

### 2.2 Asset — `team/<id>.buf` [C]
- 7 people (`team.json`: edan, ffi, pierre, yannic, paul, andrii, sunny), 82,280 B each (andrii 131,308 B, unpacked Float32).
- Format: `uint32 headerLen` + JSON + blobs. Header: `vertexCount 8192`, attributes `position` (Uint16 ×3, `packedComponents` from/delta → **x,y ∈ [−1,1], z ∈ [0,1]**, decode `from + u16/65535·delta`) and `nShade` (Uint8 ×4 = **normal·0.5+0.5 in xyz, baked shade in w**), `meshType "Points"` (`web-lusion-bundle` §2.1 with the verbatim `BufItem` decoder, pretty.js:37611-37709).
- Measured on `edan.buf`: z histogram (0.1 bins) `[1527,80,117,200,452,604,460,820,2060,1872]`, mean 0.62, percentiles p5/25/50/75/95 = 0.00/0.44/0.79/0.90/0.96; normal.z histogram `[0,0,0,3,85,391,1131,1503,2002,3077]` → **98.9 % front-facing** (88 back-facing); shade histogram `[3425,1518,1677,1199,320,37,8,3,2,3]`, **2,061 points with shade 0**, ~6,131 valid, shade p50 0.15 / p95 0.40; **not a grid** (974 distinct x bins; nearest-neighbour spacing median 0.0118 per `web-lusion-threads` §2.1, mean 0.020 per `lusion-live-reverse` §2 — both non-lattice). Points outside the scan are parked at z = 0 with shade 0 and collapsed by `step(0.003, light)`.
- Provenance **[I]**: a front depth capture / photogrammetry scan re-sampled with blue-noise density — consistent with the data, but no public statement exists (`web-gaps` §8 documents the negative; the Awwwards case study only says "every single visual on our website uses some custom assets … we pre-rendered the normal, ambient-occlusion, thickness and 2 sets of diffused illuminations"). Tool that baked `nShade.w` **[S]**.

### 2.3 Head render — `AboutHeroFaces` [C] (pretty.js:31955-32090)
- `PARTICLE_COUNT 8192, SIM_TEXTURE_WIDTH 128, SIM_TEXTURE_HEIGHT 64, MAX_FACE_NUM 2`. Positions → float RGBA 128×64 `DataTexture` (w = 1/8192), nShade → Uint8 RGBA; per-instance `a_simUv`, `a_rands1`, `a_rands2` (vec4 random). Geometry: `InstancedBufferGeometry` from `PlaneGeometry(1,1)` — **quads, not gl_Points**. Two meshes (current + next). Container `scale (27.5, 27.5, 16)` (z squashed to 0.58 of xy), `rotation.y π+0.2, rotation.x 0.1, position (0, 34, 25)`.
- Material: `depthTest:false, depthWrite:false, transparent, CustomBlending Add One/One` (also on alpha), `extensions.derivatives`.
- Vertex shader (essential lines, verbatim in `web-lusion-bundle` §3.1):
```glsl
float showRatio = smoothstep(a_rands1.x*0.2 + yRatio*0.4, 0.4 + a_rands1.y*0.2 + yRatio*0.4, u_showRatio); // bottom-up staggered reveal
pos *= 1.3;
pos += (simplexNoiseDerivatives(vec4(basePos*8., u_time)).yzw*0.2 + vec3(yRatio, 0., -1.)) * (1.-showRatio);  // drift while hidden
float depth = clamp(1.-pos.z, 0., 1.);  vec3 nor = norShade.xyz*2.-1.;
vec3 lightDir = normalize(u_mouse - worldPosition);  float distToLight = distance(u_mouse, worldPosition);
float light = norShade.w*1.25;                                                     // baked shade
float diff = linearStep(0.35, 1.0, dot(worldNormal, lightDir)) / sqrt(distToLight*0.1);
light *= diff + 0.6;  light += (0.05 + diff*0.15) * smoothstep(0.0, 0.005, norShade.w);
float frontFaceMultiplier = linearStep(-0.2, 0.0, viewNormal.z);  light *= frontFaceMultiplier;
v_blurriness = min(1.0, abs(depth - (1.-u_activeRatio*showRatio)*0.5) * 2.5) * (2.-showRatio); // DoF from a focal plane
float basePointSize = 0.009 * (1. + pow(v_blurriness,1.5)*8.) * frontFaceMultiplier;          // blurred → up to 9× bigger
float pointSize = max(basePointSize, 12./u_resolution.y);                                      // ≥ 12 px
float subpixelMultiplier = pow(basePointSize/pointSize, 1.5);                                  // energy conservation
pos.xy += position.xy * pointSize * step(0.003, light) * linearStep(0.0, 0.75, u_activeRatio);  // quad in MODEL space
// glitch rows (only while u_glitchThreshold < 0.9, i.e. while a head is inactive/transitioning)
vec4 verticalRands = hash42(vec2(floor(basePos.y*3.+cos(basePos.y*3.+u_glitchOffset)*2.+u_glitchOffset),0.))*u_glitchStrength;
float glitchWeight = verticalRands.x*step(u_glitchThreshold, verticalRands.y);
pos.x += verticalRands.z*verticalRands.z*glitchWeight*0.35*cos(basePos.y+u_glitchOffset);
float scanline = smoothstep(0.04, 0., abs(fract(u_time*-0.3 - basePos.y*.5 + .5)));            // band sweeping down at 0.3 Hz
light += scanline*(0.25*norShade.w*(1.0-light) + smoothstep(0.03, 0., abs(viewNormal.z)));     // + RIM where |viewN.z| ≈ 0
v_shade = min(1.0, light*(1.-v_blurriness*0.5)) * subpixelMultiplier * showRatio;
```
- Fragment: `range = v_blurriness*5; brightness = linearStep(1., 1.-range-fwidth(d), d); shade *= brightness*(1.25 - v_blurriness*v_shade); gl_FragColor = vec4(shade)*showRatio²; gl_FragColor.a *= pow(1.-v_blurriness,3.)*0.8*linearStep(0.8,1.0,showRatio²);` — **greyscale**; `v_color` is computed but unused.
- Per frame (pretty.js:32054-32089): mouse NDC unprojected, pushed **75 units** along the ray, transformed into face space → `u_mouse` = point-light position; tilt `clamp(local·0.03, ±0.05)` rad; `u_glitchOffset = random()·1000`, `u_glitchStrength = random()` **every frame**.

### 2.4 Person change = cross-dissolve, not a morph [C]
`t = transitionRatio`: current head `u_activeRatio = 1−t, x = −1.5t, z = −2t − 2(1−active), ry = −0.3t, rx = 0.4t`; next head mirrored with `(t−1)`; `u_glitchThreshold = fit(activeRatio, 0.4, 1, 0, 0.9)`; tween `1.25 + |Δindex|·0.25` s `cubicInOut`; auto-advance every 5 s (`faceIndexTimer += dt·0.2`); `showRatio` ramps at 1/1.5 s when the section is > 50 % in view (`WhoSubsectionTeam`, pretty.js:32662-32990). No point correspondence problem exists because there is no per-point morph.

### 2.5 Glyph rain — `AboutHeroLetters` [C] (pretty.js:32135-32240)
- 196 world-placed strips from `models/about/letter_placements.buf` (attrs `position` x∈[−86.8,82.6], y∈[−0.85,16.1], z∈[−8.1,97.0]; `density` 0/1; `dof` 0..1.64), split into 4 groups of 49 rendered into one RT with progressive blur **16 → 8 → 4 → 0 px** (separable 9-tap Gaussian, half res) = layered DoF; composited additively at `renderOrder 10`.
- Atlas `textures/font.png` **210×6 px, 1-bit = 42 glyphs of 5×6 px** (A–Z, 0–9, symbols).
- Vertex: `charCount = mix(50,100, rand)`, `pos.xy *= vec2(1, 6/5·charCount)`, `v_charUv.y -= u_time·mix(2,10, rand)` (fall 2–10 glyphs/s), `pos = pos·0.75 + instancePos`, `v_opacity = mix(.5,1,density)·u_showRatio`.
- Fragment: `charIdx = floor(mod(v_charUv.y, 42))`; re-rolled ≈2×/s via `hash43(charIdx, rand, floor(charTime·−2))`; brightness × `charRands.w·charRands.y`; strip-end fade `smoothstep(.5,.35,|uv.y−.5|)`; distance fade `1 − linearStep(15,66, z)`; drops `smoothstep(100,150, mod(v_charUv.y − 200·rand, 200))` (200-cell period, 50-cell ramp); `gl_FragColor.a *= 3`; additive One/One, no depth.

### 2.6 Contour lines — `AboutHeroLines` [C] (pretty.js:31556-31655)
- `models/about/terrain_lines.buf`: 11,832 vertices, **41 polylines** (index thresholds `[60,245,806,…,11832]`), y = integer height levels 1…19 → true marching-squares contours of the terrain exported offline (matches `about/terrain_shadow_light_height.webp`). Runtime extrudes each into a **3-sided tube** (`SEGMENT_COUNT 3`, frame rotated 2π/3), attrs `t` (arc length), `totalLength`, `lineId`; radius `mix(0.04, 0.10, thick)` with `thick = step(mod(yIndex,4), 0.5)` (every 4th level thicker); depth bias `gl_Position.z -= 0.1/w`.
- Fragment: `t = mod(v_t − u_time·2, totalLength)` (2 units/s), `n = pnoise(vec2(t·0.25, 0), vec2(totalLength·0.25, 100))` (periodic → seamless), `shade = mix(0.3 + smoothstep(0, −fwidth(n), n)·0.6, 1, thick)`, distance fade `linearStep(50, −20, z)`, draw-in `step(totalLength − v_t, totalLength·u_hudRatio)`, `.b = linearStep(15,66,z)` (depth for post blur), `.r *= 0.85`; blending `MaxEquation One/One`, `renderOrder 15`.
- Note: `web-3d-from-photo` §6.3 says "no contour-lines component found by name" — superseded; four dossiers located `AboutHeroLines` at the line numbers above.

### 2.7 Compositing and post [C]
- Channel convention across the hero: **R = luminance, G = linear depth, B = blur/distance** (`aboutHeroVisualFinal_frag`).
- `AboutPageHeroEfxPrepass` (renderOrder 5): 8-tap blue-noise disc blur with strength `0.006·tex.b·u_blurRatio` (+ optional 16-tap motion blur); then the faces + letters scene is rendered on top with `autoClear = false` — so the faces **do** pass through the grade and bloom (this supersedes `web-physics` §6.6's "no bloom on faces").
- `AboutPageHeroEfx` (renderOrder 20): `mix(colorBurn(u_colorBurn, tex), colorDodge(u_colorDodge, tex), tex.rgb)` with scene `#00f0ff` α.15 / `#005aff` α.12 and **team/HUD `#79a8ff` α1.0 / `#a5ff44` α0.7**, lerped by `hudRatio²`.
- Bloom: Gaussian pyramid + FFT-convolution kernel (star streaks), threshold 0.8, radius 0.25, smoothWidth 0.3, amount **4 default → 12.5 when hudRatio ≥ 0.5** (team view), ±0.25/255 RGB dither (`web-lusion-bundle` §6, `web-lusion-look` §1.6).
- Camera on `camera_spline.buf`; fog cards are soft particles against the G-channel depth.

### 2.8 What Lusion does NOT do [C]
No GPGPU for the faces (the 128×192 curl-noise sim belongs to the background particle stream — `local-prior-research` §6.3 discrepancy resolved), no runtime photo sampling, no per-point colour, no per-point morph, no depth test, no continuous auto-rotation at rest (only the ±0.05 rad mouse tilt, the scanline and the DoF breathe).

---

## 3. STATE OF THE ART — techniques, sources, starting values

### 3.1 Sampling (where particles exist)
| Technique | Source | Start values / notes |
|---|---|---|
| **Fixed grid, no threshold, depth decides** (Phantom.land 3D face particles) | https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/ | 280×280 = 78,400 particles per face from two 256×256 WebP (colour + depth, <15 KB each); `pos.z = (zDepth·2−1)·zScale`, depth 0 = background; **colour only modulates size** `pScale = mix(min, max, (r+g+b)/3)` (never zero); `NormalBlending`; morph = same grid index, `mix(tex1, tex2, smoothstep)` 1.6 s, mid-transition disturbance `abs(sin(speed·π))`; per-face `offset_z / z_depth_scale / face_size` |
| Presence from a **depth matte** (what the tree does) | `web-3d-from-photo` §1.4 (measured): wall ≈ 1.0–1.16 raw, scalp ≈ 3.1, nose 3.9, shirt 4.8 on Michele with DA-V2 small q8 | threshold ≈ wall + 1.0 raw; in the tree's 8-bit normalised maps: wall ≤ 0.19, bust ≥ 0.35 → `depthCut 0.3`, `depthEdge 0.05` |
| **Blue-noise / Poisson-disk in image space** | https://github.com/kchapelier/poisson-disk-sampling (MIT, N-D, `distanceFunction`) | `minDistance 9, maxDistance 18, tries 20` on 1200×1800 → 10–14k subject points; `distanceFunction = 1 − min(1, edge·3)` inside the matte (`web-3d-from-photo` §5.4, §7 script) |
| **Weighted Voronoi stippling** (Secord 2002; Bostock) | https://api.observablehq.com/@mbostock/voronoi-stippling.js ; https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf | rejection sampling on density (30 tries), 80 Lloyd iterations, over-relaxation 1.8, jitter `(k+1)^−0.8·10`; density = `mask·(0.6 + 0.4·|∇depth|)` — never luminance (`web-gaps` §5) |
| `MeshSurfaceSampler` (mesh route) | https://threejs.org/docs/pages/MeshSurfaceSampler.html ; https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ | area-weighted random (not Poisson) → oversample 4–8× and thin with a spatial hash, or `pcu.sample_mesh_poisson_disk` (point-cloud-utils) |
| Threshold-on-brightness (the anti-pattern) | brunoimbrizi 2019 (`> 34`), MisterPrada logo-particles (`> 200`), particle-saga (alpha) | documented cause of missing bright regions (`web-codrops` §2, `web-repos` §1) |

### 3.2 Depth from a single photo
| Route | Measured / cited | Licence |
|---|---|---|
| **Transformers.js `onnx-community/depth-anything-v2-small`, `dtype:'q8'`** (Node, this laptop, ARM64) | 27 MB model, **2.5 s** inference on 1200×1800 (fp32 27 s), output Float32 relative inverse depth at source size (true detail at 518 px), bilinear upsample (`web-3d-from-photo` §1.2-1.3) | **Apache-2.0** (verified HF API 2026-08-27) |
| `depth-anything-v2-base` / `-large` | 102 / 347 MB q8; Python CPU 77 s / 59 s per image | **CC-BY-NC-4.0** (verified) — the tree's twins used `base` |
| Depth Anything 3 (`ByteDance-Seed/Depth-Anything-3`) | used by the Aug-2026 Codrops relighting article; not benchmarked | Apache-2.0 |
| TF.js `ARPortraitDepth` | portrait-specialised, segmentation built in, `outputDepthRange [0,1]` (`web-gaps` §4) | browser-only, resolution/licence unstated |
| MediaPipe Face Landmarker | 478 3-D landmarks + facial transformation matrix; face only (no scalp/ears/shirt) — use as an alignment/relief-scale prior (`web-gaps` §3) | Apache-2.0 |
| FLAME/BFM (3DDFA_V2, DECA, MICA, HRN) | face-only meshes; DECA non-commercial, MICA/HRN GPU-only, 3DDFA needs C builds on Windows ARM (`web-3d-from-photo` §3) | mixed |
| Image-to-3D (Hunyuan3D 2.x, TripoSR, InstantMesh, Rodin, Meshy) | all GPU-only locally; **Hunyuan3D licence excludes the EU/UK** (Sersan is UK); hallucinate the back of the head (`web-3d-from-photo` §4) | blocked / paid |

Relief calibration (`web-3d-from-photo` §5.2): normalise *inside the head mask only* (the whole head spans ≈3.1–4.07 raw while the torso runs to 5.1 → otherwise a flat plate in front of a bulging shirt); apply `dNorm^0.7`; z extent ≈ 0.6–0.8 × head width (Lusion: 16/27.5 = 0.58); box-blur ≈1.3 % of width to kill 8-bit terracing (Codrops `smoothBands`).

### 3.3 Normals from depth
- Codrops *Relighting Images with Depth Maps and Three.js* (TSL/WebGPU, 2026-08-19): https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/ , repo https://github.com/DGFX/codrops-relightning-images — `depthGradient` central differences at `GRADIENT_TEXELS 3`, `uDisplacementScale 4 · uNormalScale 3`, plus a **luminance-gradient detail term** (`DETAIL_STEP_TEXELS 8`, LOD 3, gain 4) so pores/beard read as micro-relief; `shadow.js` ray-marches the depth toward the light (12 steps, intensity 0.86, softness 0.092) = a baked AO term (`web-codrops` §5.1, `web-3d-from-photo` §5.3).
- Discontinuity-aware reconstruction (3-tap Turánszki / 5-tap atyuwen): https://atyuwen.github.io/posts/normal-reconstruction/ , https://gist.github.com/bgolus/a07ed65602c009d5e2f753826e8078a0 (`web-physics` §6.5). Offline: `n = normalize(−dz/dx·k, −dz/dy·k, 1)` on the blurred field — exactly what `emit()` does in the tree.

### 3.4 Shading a point cloud so it reads solid
- Lusion (§2.3): `light = shade·1.25·(linearStep(.35,1,n·l)/sqrt(.1d) + .6) + …`, front gate `linearStep(−.2,0,viewN.z)`, rim `smoothstep(.03,0,|viewN.z|)` on the scanline pass.
- Rim classic: `rim = pow(1 − dot(V,N), k)`, gated by N·L (Roystan, https://roystan.net/articles/toon-shader/ ; `_RimAmount 0.716`).
- **Eye-Dome Lighting** (normal-free, screen-space): Potree `edl.fs` from CloudCompare qEDL — `shade = exp(−300·edlStrength·mean(max(0, depth − neighbourDepth)))` over ring neighbours at `radius` px (`web-gaps` §1, https://raw.githubusercontent.com/potree/potree/develop/src/materials/shaders/edl.fs). A 2-pass fallback if normals from a depth map prove too noisy.
- Sphere impostor per fragment: `n_s = (uv.x, uv.y, sqrt(1−r²))`, blend with the data normal (`local-kernel` §6.3) — gives each disc a ball highlight at zero data cost.
- three.js forum "3D point cloud for my head" (iPhone X TrueDepth → OBJ → `PointsMaterial` + additive): density naturally rises at grazing angles on a *projected* capture → rim look (https://discourse.threejs.org/t/3d-point-cloud-for-my-head/7367). For Lusion's *uniformly* sampled data the rim comes from the shader, not density (`web-gaps` §B).

### 3.5 Disc size, energy conservation, depth-of-field
- Lusion: size `0.009·(1 + 8·b^1.5)`, `max(size, 12/res.y)`, `subpixelMultiplier = (base/clamped)^1.5`, alpha × `(1−b)³·0.8`, edge `linearStep(1, 1−5b−fwidth(d), d)`, `b = min(1, |depth − focus|·2.5)`.
- Phantom: `gl_PointSize = pointSize·pScale·|focus + view.z|·blur`, alpha `1.04 − clamp(vDist·1.5)`.
- Blurry library (accumulation DoF): https://tympanus.net/codrops/2019/10/01/simulating-depth-of-field-with-particles-using-the-blurry-library/ (`bokehStrength 0.02, pointsPerFrame 50,000`).
- three.js addon `softParticles({opacity, distance: 1, contrast: 2})` (`three/addons/tsl/utils/SoftParticles.js`) if the head must fade against real geometry.

### 3.6 Physics (rest life, morph flight)
- Exact critically-damped spring, dt-independent (Juckett, Holden "Spring-It-On"): `y = (4·ln2/halflife)/2; e = exp(−y·dt); x = e·(j0 + j1·dt) + goal; v = e·(v − j1·y·dt)`; halflife 0.3–0.5 s natural, 0.1–0.2 responsive (`web-physics` §1.3). SerSan's `SPRING 52 / DAMPING 7.5` = ζ ≈ 0.52, settles in ≈0.4 s — fine; keep.
- Curl noise: Bridson 2007 (divergence-free), cabbibo finite differences (ε 0.1, 18 simplex calls), Edan Kwan's analytic `curl4` (The-Spirit, 3 octaves, `curlSize 0.02`) — Lusion's *faces* use only a 0.2-amplitude simplex-derivative drift while hidden and **zero flow once shown**; the perceived slow life is tilt + scanline + defocus (`web-physics` §2.4). Rule of thumb for a legible head: curl amplitude 0.02–0.05 × head radius/s, wavelength 0.5–1 × head radius, time 0.1–0.4.
- Pointer: as a **light**, not a force, for a portrait (`web-physics` §3.5).

### 3.7 Morph correspondence
Ranked (`web-physics` §5): (1) avoid it — cross-dissolve (Lusion); (2) **index-aligned shared parametrisation** (SerSan's shared grid; Phantom's shared 280×280; Journey lesson 40 duplicates vertices to equalise counts, https://threejs-journey.com/lessons/particles-morphing-shader , stagger `delay = (1−0.4)·noise; smoothstep(delay, delay+0.4, uProgress)`); (3) Hilbert-curve rank pairing; (4) luminance/depth sort; (5) NN/greedy; (6) OT offline. SerSan already has (2) plus the kernel's `hash·0.55 / 0.45` stagger — the only proven public attempt at a *2-D* two-photo morph without shared parametrisation reports failure (https://discourse.threejs.org/t/morph-image-particle-creating-a-particle-based-face-transition-effect/78794).

### 3.8 Rendering on three r184 WebGPU/TSL (SerSan's stack)
- WebGPU `Points` are 1 px; sized points need instanced quads: `SpriteNodeMaterial` on `Sprite` / `InstancedMesh(PlaneGeometry)` with `scaleNode` (`webgpu_compute_particles`, `webgpu_tsl_compute_attractors_particles`), or **`PointsNodeMaterial.sizeNode` + `Sprite.count`** in pixel units (`webgpu_instance_points`, `web-gaps` §6). SerSan's hand-rolled instanced quad is equivalent and already budgeted.
- Budget facts (`local-kernel` §5): compute 8/8 storage but six `"vec3"` buffers are padded to 16 B → **7 free `.w` floats per particle** (`position, velocity, homeA-D, start`); vertex stage 4/8 vertex buffers + 4/8 storage; 0/16 sampled textures in every stage; `requiredLimits` not requested (compat mode reports 0 vertex-stage storage — don't rely on raising limits). Struct storage (`instancedArray(count, struct({...}))`) could fold homeA-D into one binding but is unspiked in r184 examples.
- `alphaToCoverage: true` + `shapeCircle()` gives edge AA without sorting on WebGPU (official examples) — an alternative to `cov²` once MSAA is on; SerSan runs `antialias:false`.
- Makio64's TSL perf notes (vec4 loads, workgroup 64–256, `.toVar()` for reused expressions): https://github.com/Makio64/advanced-threejs-tsl-webgpu-rendering .

### 3.9 Background layers
- **Glyph rain:** Lusion recipe (§2.5); Rezmason/matrix (3.8k★, https://github.com/Rezmason/matrix : stationary glyph grid + travelling illumination, `numColumns 80`, `bloomSize 0.4`, `bloomStrength 0.7`, `ditherMagnitude 0.05`, `raindropLength`, `fallSpeed`, `cycleSpeed`, MSDF atlas); procedural per-cell rain GLSL (ghostty matrix theme: `grid (34,42)`, `activeColumn = step(0.34, hash)`, `speed mix(0.25,0.85)`, 18-cell tail, 2-cell head — `web-lusion-look` §3); Efecto luminance→glyph cells (5×7 procedural glyphs). No Codrops matrix-rain tutorial exists (`web-codrops` §8).
- **Contour lines:** baked polylines → tubes (Lusion §2.6; San Rita rejected procedural for art-direction control, https://tympanus.net/codrops/2026/03/24/digital-craft-wild-soul-building-san-ritas-topographic-web-experience/); procedural iso-lines: topolines `fbm(2 octaves) → c = v·uLevels; dist = 0.5 − |fract(c) − 0.5|; dd = dist/fwidth(c); line = 1 − smoothstep(w/2 − .5, w/2 + .5, dd); fade where fwidth > 1 px` (https://github.com/idleCyrex/topolines), Ridgeline `fwidth` major/minor contours (`uMajorEvery`, dither 0.0045; https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/), Greenberg product grid `fract(snoise·5)` dual smoothstep, thickness 0.03, drift 0.05 (https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/); AA theory: https://iquilezles.org/articles/filterableprocedurals/ .
- **HUD:** Lusion's matrix-decode text (`lettersPerSecond 1, maxRandLetters 3, refresh 1/30`, random chars `33 + rand·93`), `[[ 001 ]]`, tick rulers, 11×3 dots, a big atlas glyph with a 5 % dot grid at 0.3 alpha (`web-lusion-look` §1.7). SerSan already has `src/components/fx/label-scrambler.tsx` (A–Z0–9, `SCRAMBLE_MS 480`, `TICK_MS 40`, reduced-motion aware) and the gate chrome (`01 / 04` counter, accent hairline, hint).

### 3.10 Bloom / grade
Selective bloom by HDR threshold (pmndrs #496: threshold 1 + colours > 1) is what SerSan does (`fxStore.ts:279-281`: intensity 1.1, threshold 1.0, radius 0.7). Lusion: threshold 0.8, amount 12.5 in the team view, plus burn/dodge grade and 1-LSB dither. For a cool-mono head with additive overlap, keep threshold ≈1.0 and let rim/scanline peaks exceed 1 (as the tree's `DEFAULT_EMISSIVE_LIT 0.72` comment intends).

---

## 4. THREE CANDIDATE APPROACHES

Common invariants for all three: shared grid + union + integer stride, index pairing, the 12 HANDOFF contracts that still bind the TSL/WebGPU implementation (3, 4, 6, 7, 8, 9, 10), the one-viewport gate, `[data-line-anchor="founders"]` measurability, no camera moves, DOM completeness in every fallback (`local-rail` §8-§9). Binding budget today (tree): compute **8/8** storage, vertex **4/8** vertex buffers + **4/8** storage, fragment 0, textures 0/16 (`local-kernel` §5.1).

### 4A — 2-D fix: uniform coverage + tone by colour + fake volume (no new assets)

**Idea.** Keep the photo grid; make `ink` = mask membership (presence), carry tone in colour, and fake volume with a radial/luminance depth and a sphere-impostor normal. This is what `local-sampler` §7 proposed before the tree moved past it.

- `sampleImagePoints.ts` (`readGrid`, ink block `:397-438` in tree): on the legacy path replace `ink = v^gamma·fade` with `ink = fade · min(1, dist/EDGE_TOL)` (`EDGE_TOL ≈ 0.12`) — every non-`bgMask` cell gets ink ≈ 1, feathered at the silhouette; keep `fadeStart/fadeSpan`. Export `lum` and `bgMask` (already computed, currently discarded).
- `FounderPortraitMorph.tsx`: `centerZBias` from 0 → ~40 grid-px with a wider `BULGE_RADIUS` (bust bulge) and z = `mix(bulge, lum-relief, 0.3)`; keep `Z_RELIEF_MAX_FRAC` small (0.06–0.08) because luminance relief still combs; `DISC_PITCH` 2.1 → 1.6 with `blending: "additive"`.
- `gpgpuNodeSim.ts`: size = constant (`0.06 + 0.94·1`) inside the mask; tone = `col·mix(0.55, 1.25, lum)` (vertex), add the sphere-impostor rim per fragment `rim = pow(1 − sqrt(1 − rr²·4), 2)·uRim` (no data normal needed); key light fixed in view space as the spore path already does (`L = normalize(0.35, 0.55, 0.78)`, `gpgpuNodeSim.ts:837-848`).
- `founders-rail.tsx`: unchanged.
- Budget: 0 new bindings. Assets: none. Pipeline: none.
- Risks: still a flat plate — the sphere-impostor rim reads as "beads", not as a head; a luminance depth still combs, so relief stays ≤ 8 %; a white shirt inks at 1.0 and out-shines the face (the tree already had to raise `fadeStart` to 0.55 for this reason).
- Verify: `__sersanFounderMorph.resample({...})` + `getSampler()` (stride 1), Playwright screenshot at 1440×900 dpr 1 and 2 with `setStage('B')` (Michele scalp) — no sub-pitch band on rows 80–120.
- **Verdict:** superseded by the tree; only worth it as the *legacy fallback* when a depth twin is missing (which the tree already implements per-portrait).

### 4B — 2.5-D depth relief (in progress in the tree) — finish it

**Idea.** Offline monocular depth per headshot → per-particle presence, z and normals on the shared grid → rim-lit, DoF'd, additive point cloud with pointer light and slow parallax; the 4-way index-aligned morph is untouched. Lusion's data shape (front hemisphere, z ∈ [0,1], normal + shade) reproduced from photos.

**Done in the tree (keep):** depth script, twins, presence ink, `reliefField`, normals, `[rgb24, nx, ny, ink]` packing, lit uniforms, front gate, DoF, energy term, scanline, additive, pointer light, rest parallax, `setLook/getLook/setBlend` handles (§1.7).

**Remaining steps (ordered):**

- **B1 — Licence-clean depth.** `scripts/generate-founder-depth.mjs`: change the default to `--model small` (`onnx-community/depth-anything-v2-small`, Apache-2.0; 2.5 s/image with `dtype:'q8'`, 27 MB) or port to Depth Anything 3 (Apache-2.0). Regenerate the four twins, re-measure the bimodal gap (tree comment: wall ≤ 0.19 / bust ≥ 0.35 with `base`) and re-set `depthCut/depthEdge`. Optional quality step: normalise **head-only** (rows above the collar) with `dNorm^0.7` before writing, so the face is not a plate in front of a bulging shirt (`web-3d-from-photo` §5.2). Commit the twins; the site never runs the model.
  ```
  node scripts/generate-founder-depth.mjs --model small
  ```
- **B2 — Leave the halftone regime (root cause 3).** Target ≈15–25k particles at discs ≈2× pitch, soft edge, additive: in `FounderPortraitMorph.tsx` set `GRID_W/GRID_H` for the lit build to ≈150×210 (area ×0.27 → union ≈18–22k; live: `resample({gridW:150, gridH:210})`), `DISC_PITCH_LIT` 1.15 → 2.0–2.4 (live: `setPointSize`), and in `gpgpuNodeSim.ts` add a **pixel floor with energy compensation** in the lit `sizeNode`: `px = max(px, uMinPx)` with `uMinPx ≈ 6·dpr` and multiply the colour by `pow(pxBase/px, 1.5)` (Lusion's `subpixelMultiplier`; the existing `cov²` handles the opposite, sub-pixel, case). Re-tune `DEFAULT_EMISSIVE_LIT` (additive overlap rises with disc area) and `DEFAULT_LOOK.bokeh` toward Lusion's 8 with `focusRange` ≈ 1.0. The count ceiling logic (`MAX_COUNT_BY_TIER`) stays — it is a guard, not a target. Expected: the face reads as a glowing volume of overlapping soft points instead of a dither.
- **B3 — Kill the comb so `REST_RELIEF` can rise (0.2 → 0.6–1.0).** Two complementary, zero-binding fixes:
  1. *Perspective pre-divide at rest* (kernel, `gpgpuNodeSim.ts` after `target.z.mulAssign(reliefN)` at `:1517`): `target.xy.mulAssign(mix(1, (uViewDist − target.z)/uViewDist, uPrediv))` with `uViewDist = CAMERA_Z − dolly` and `uPrediv = 1 − env` written by the island. At a locked stage every disc then projects exactly onto its lattice cell whatever its z (no lateral separation → no comb), while z still feeds lighting, DoF and the pointer parallax; mid-leg the factor blends out so the orbit shows the true bust. Caveat: under the 0.16-rad rest parallax the pre-divided shell is slightly sheared — QA at `hover` extremes; if visible, scale `REST_PARALLAX_*` by `(1 − uPrediv·0.5)`.
  2. *Silhouette depth dilation* (sampler, `reliefField`): replace the 3×3 box blur with a **grey dilation (max filter, radius 2–3 cells) followed by the blur** for cells whose presence `t > 0` — the depth model's outward silhouette ramp then snaps to the bust's plateau instead of sinking toward the wall, so ramp cells stop spreading. Optionally clamp `v = max(v, vFloor ≈ 0.25)` inside the matte.
  With either, raise `REST_RELIEF` progressively via `setDepth()`; the `frontLo/frontHi` gate keeps steep side cells small.
- **B4 — DPR cap 1.5 for the lit build** (`FounderPortraitMorph.tsx` `dprNow = min(dpr, 2)` → 1.5; renderer stays as is) — Lusion's cap; halves fill cost of the bigger discs on retina.
- **B5 — Baked shade/AO (Lusion's `nShade.w`).** In `emit()` (the full-grid `field` is available) compute a horizon-based AO per cell (8 directions × 6 steps, `ao = 1 − k·mean(max(0, atan(slope)))`, ≈5.6 M ops for 117k cells) or Codrops' 12-step ray-march toward the key light; fold it into the packed colour (`rgb *= mix(1, ao, 0.7)` before `packTint`) — zero bindings, zero shader change — or pack `w = floor(presence·255)·256 + floor(ao·255)` (16 bits exact) and decode in the vertex stage. This is what separates a "lit plate" from a "scan": shadowed sides are present but dim.
- **B6 — Silhouette rim the Lusion way.** Add `smoothstep(0.03, 0, |n.z|)` on the scanline term (currently `0.4 + rim` with `rim = (1 − max(n.z,0))²·0.55`) so the sweep sparkles on the profile; keep it under the HDR cap so only the rim crosses 1.0 into bloom.
- **B7 — Optional: luminance-detail normals.** Add the Codrops detail term (`−∇lum` at a coarse step, gain ≈ 0.3) into `nrm` so beard/pores read as micro-relief (`web-codrops` §5.1).

**File-level map (tree):** `scripts/generate-founder-depth.mjs` (B1); `sampleImagePoints.ts` `reliefField :447-496` (B3.2), `emit :498-575` (B5, B7); `FounderPortraitMorph.tsx` constants `:196-336` (B2, B3, B4), build `:740-930` (grid/pitch), frame loop `:1225-1246` (`uPrediv`, light); `gpgpuNodeSim.ts` kernel `:1505-1520` (B3.1 `uPrediv`, `uViewDist` uniforms), lit expressions `:1885-1950` (B6), `sizeNode :2083-2095` + fragment `:2225-2305` (B2 pixel floor + energy), `PortraitLook` `:1071-1110` (new knobs); `founders-rail.tsx` unchanged; `HANDOFF_FOUNDER_MORPH.md` new section "Depth matte / lit path" (contracts 1, 2, 12 re-stated: *presence* by depth AND fill; tone by colour × light; garments no longer washed — check whether Mattia's PCHIP wash is still wanted now that the shirt inks at 1 and is dissolved by `fadeStart 0.55`).

**Budget:** unchanged — compute 8/8 (two new uniforms only), vertex 4 + 4, 0 textures. A 5th person remains impossible without §4C's texture/struct repack.

**Asset pipeline:** `node scripts/generate-founder-depth.mjs --model small [anchor]` → `public/founders/<anchor>-depth.webp` (600×900 lossless ≈50 KB) → commit. When the real Alberto headshot lands: re-run for `alberto`, then measure `getSampler()`.

**Risks:** union/stride cliff at 80k (measure); the `photo 0.35` compression can make all four faces look alike (tune per QA); additive + bigger discs can blow out at the pointer-light extreme (the `min(…,1)` cap exists — keep `LIGHT_SWING` small); the touch island (`lite` 20,000, `TOUCH_GRID_SCALE 0.52`) is unmeasured on a device; `base`-model twins must not ship (licence).

**Verification (browser-only, per HANDOFF contract 6/7):** Chrome WebGPU, `NEXT_PUBLIC_WEBGPU=1`, home, section in view, hard reload: console free of `CreateRenderPipeline` / `Vertex buffer count`; `__sersanFounderMorph.getSampler()` → `stride 1`, `sharedCells`, `count`; `getLook().lit === true`, `depthTwins` all true; `setStage('B')` then screenshot at 1440×900 dpr 1 and 2 — Michele rows 80–120 (scalp) fully covered, no collar void, discs visibly overlapping (Playwright harness in the previous session's scratchpad `pw/` works against `next dev` per memory); `setLook({bokeh: 3, focusRange: 1})`, `setDepth(1)` with B3 on → no comb at the ears at rest; `simulateGesture('down')` ×4 → A→B→C→D then release; hover extremes → no shear; frame timing `p95 ≤ 8 ms` at the new count (was 7.3 ms at 51,751).

### 4C — True 3-D head (scan / image-to-3D) — Lusion-exact data

**Idea.** Replace the photo sampler with a loader for a per-person **point set with normals + baked shade** (Lusion's `.buf` layout: Uint16 xyz + Uint8 nShade ≈ 80 KB) produced offline from a real capture (RealityScan/Polycam on iPhone as Phantom.land did; TrueDepth; photogrammetry; Gaussian splat → points) or, if no session is possible, from a face mesh + depth shell hybrid. Render exactly as in B; a real scan also allows the full ±0.7 rad orbit to show a true profile.

- `sampleImagePoints.ts`: new `loadPortraitCloudSet(urls)` returning the same `PortraitSet` shape (`xy` in "grid px" or world units with `worldPerGrid = 1`, `z` real, `rgb` = baked shade × tint, `ink = 1`, `nrm`, `halfExtentX/Y` from the bbox) so `FounderPortraitMorph.tsx` `toWorld`/fit and the engine call are untouched.
- **Correspondence** (the part the shared grid gave for free): resample every head to the same N with a deterministic ordering — Poisson sample on a **common template UV** (FLAME/MediaPipe canonical mesh registered to each scan) so index j is the same anatomical point in every person, or pair offline by Hilbert rank / partial OT and bake the permutation (`web-physics` §5). Without this the morph looks like a mechanical cross-fade.
- `gpgpuNodeSim.ts`: B's lit path as is; optionally `depthTest/Write: true` with back-to-front instance order for a solid head with occlusion.
- Count: 8–32k points; disc regime as in B2.
- Budget: unchanged if the data still fits `[rgb24, nx, ny, ink]`; if a 5th person is wanted, move per-target data to **textures** read with `textureLoad` in compute/vertex (0/16 used) or spike the r184 struct storage (`local-kernel` §6.2 D/E).
- Pipeline: capture → clean mesh (Blender via the Blender MCP in AGENTS.md §4) → Geometry Nodes "Distribute Points on Faces" 8–16k, keep `n.z > −0.2`, bake AO → export `.buf` (Node writer in `web-3d-from-photo` §7).
- Risks: needs a photo/scan session per founder (four people, one still a placeholder); FLAME/DECA licences are non-commercial; Hunyuan3D is licence-blocked for a UK company; generated heads hallucinate the back and drift from the real person — "a depth shell from the real photo is more faithful" (`web-3d-from-photo` §4); highest engineering cost (correspondence + new loader).
- Verify: as B plus profile screenshots at `setMorph(0.5)` (orbit) — ear/jaw geometry must be real, not a relief plaque.

---

## 5. RECOMMENDATION

**Ship B now, as "finish the in-tree lit path", in this order.** It removes both root causes the owner sees (holes: done; halftone: B2 + B3 + B5), stays at zero new bindings, needs no photo session, keeps the 4-way index-aligned morph and every fallback mode, and reproduces the *shape* of Lusion's data (front hemisphere + normals + shade) from assets that exist today. C is the ceiling to aim at after B, only if the owner books scans — B's renderer is C's renderer.

### 5.1 Ordered checklist (gates in bold)
1. **Freeze scope of the working tree**: commit the founders lit work as its own engine commit (`gpgpuNodeSim.ts`, `sampleImagePoints.ts`, `FounderPortraitMorph.tsx`, `foundersMorphStore.ts`, the script, the twins); keep the N=4 *content* half (Alberto entry, `WIRED_TARGETS 4`, placeholder webps) out of production until the real headshot lands (HANDOFF merge gate); keep unrelated in-progress edits (positioning, hero beats, crystal) in their own commits.
2. B1 — regenerate depth twins with the Apache-2.0 `small` model (or DA3); **gate: no `base`/`large` twin in `public/`**; re-set `depthCut/depthEdge` from the measured gap.
3. B2 — grid ≈150×210, `DISC_PITCH_LIT` ≈2.0–2.4, pixel floor + energy compensation, retune emissive/bokeh; **gate: `getSampler().stride === 1`, discs overlap at dpr 1 and 2 (screenshots)**.
4. B3 — `uPrediv` pre-divide (+ silhouette dilation); raise `REST_RELIEF` to ≥0.6; **gate: no comb at ears/jaw at rest, no shear at hover extremes**.
5. B5 — AO baked into the colour lane; B6 — silhouette rim on the scanline; B4 — DPR cap 1.5.
6. **QA protocol (§4B "Verification") on Chrome WebGPU by the owner** (agents cannot reach localhost); record `sharedCells / stride / count / p95` in `MAX_COUNT_BY_TIER`; measure the touch island on a phone (`TOUCH_GRID_SCALE`, `lite` ceiling).
7. Update `HANDOFF_FOUNDER_MORPH.md` (new section; contracts 1/2/12 re-worded; new handles `setLook/getLook/setBlend`; the licence rule for depth models); update memory.
8. Only then: real Alberto headshot → depth twin → re-measure → ship the content half.

### 5.2 What not to copy from Lusion
Two-mesh cross-dissolve with glitch rows (SerSan's index-paired spring flight with HDR-cyan travel tint is its own signature and needs no correspondence work); auto-advance (the gate is gesture-driven by design); the `#a5ff44` acid-green dodge (brand is navy + cyan `#3BE1FF` → blue `#2A7FFF`; violet is forbidden); depth-off *normal* blending for the faces (additive is the right regime for a glowing cloud).

### 5.3 Background layers — optional, independent islands (after B ships)
All three follow the repo's backdrop convention: a sibling island mounted from `Scene.tsx:465` next to `<FounderPortraitMorph>`, camera-locked to the sticky frame rect via `useFoundersMorphStore.getState()` (`pinned`, `secTop`, `measureVersion`, `morph`), `renderOrder` between −1 (`DriftParticles`) and 0, own build (the portrait compute is 8/8), driven by the island clock (`timeRef`, `env`/`restEnv`), mirroring `uFade`/`CULL_PAD 120`, gated exactly like the island (`tier full && backend webgpu`; touch variant if `RAIL_ISLANDS_TOUCH`), emitting > 1.0 only where glow is wanted (bloom threshold 1.0). A DOM layer inside `[data-founders-morph-sticky]` would paint **in front of** the cloud and contradicts the "DOM must not own section-sized ambience" rule (`local-rail` §7.2) — use WebGL.

- **G1 Glyph rain** (Lusion §2.5 numbers): 120–200 instanced vertical strips placed in a shallow 3-D field behind the head (x across the frame, z −8…+90 world-scaled), `charCount 50–100`, fall `2–10` glyphs/s, per-cell glyph re-roll ≈2 Hz via `hash43`, 200-cell period with a 50-cell ramp (sparse drops), strip-end fade `smoothstep(.5,.35,|uv.y−.5|)`, 4 depth groups blurred 16/8/4/0 px (or, cheaper on WebGPU without RTs: per-group `scale`+alpha as fake DoF), additive One/One, `depthTest:false`. Atlas: render **JetBrains Mono** A–Z0–9 at build time into a 1-channel 64×(8×12 px) atlas (brand mono voice; `label-scrambler.tsx` already defines the vocabulary). Rezmason defaults for taste: `bloomStrength 0.7`, `dither 0.05`. Tint navy-cyan via the same HDR-threshold bloom, brightness ≤ 0.6 so it never competes with the face.
- **G2 Contour lines**: procedural first (topolines/Ridgeline recipe on a floor plane under the bust: `fbm` 2 octaves + time as 3rd axis, `uLevels ≈ 12`, `fwidth`-AA lines 1 px, `uMajorEvery 4` brighter, anti-moiré fade where bands < 1 px, drift 0.05, flowing dash `smoothstep(0, −fwidth(n), pnoise(t·0.25 − time·0.5))` along the line coordinate), blended with `CustomBlending` + `MaxEquation` + `OneFactor/OneFactor` exactly as Lusion (three r184's WebGPU backend maps `MaxEquation` → `'max'`, `node_modules/three/src/renderers/webgpu/utils/WebGPUPipelineUtils.js:713`) so crossings never over-accumulate, written into the bloom range only on the pulses. Bake Lusion-style polylines → 3-sided tubes (r 0.04 / 0.10 every 4th) later if art direction needs control (San Rita's conclusion).
- **G3 HUD accents**: reuse the existing gate chrome (counter `01 / 04`, hairline, hint) and `label-scrambler` for a matrix-decode on the founder name at each lock (`lettersPerSecond` ≈ 30 in / 60 out as Lusion), add tick rulers + a 5 %-pitch dot grid behind the stage as DOM (these *may* be DOM: they are chrome, not ambience), all reduced-motion aware.

### 5.4 Quick reference — constants in the tree today (lit path)
`GRID 290×405` · `STAGE_FILL 0.92` · `Z_RELIEF_MAX_FRAC 0.04` (legacy) · `Z_RELIEF_DEPTH_FRAC 0.34` · `REST_RELIEF 0.2` · `DISC_PITCH_LEGACY 2.1` / `DISC_PITCH_LIT 1.15` · `DEFAULT_EMISSIVE 1.18` / `DEFAULT_EMISSIVE_LIT 0.72` · `LIGHT_BASE (−2.4, 2.6, 3.4)` · `LIGHT_SWING (3.5, 2.5)` · `DEFAULT_LOOK {ambient .08, diffuse 1, rim .55, mono .8, monoTint (.8,.9,1), focusRange 1.4, bokeh 1.2, scan .35, photo .35, frontLo −.35, frontHi .15}` · `SAMPLE_SPEC {depth 90, centerZBias 0, inkGain 1.7, inkFloor .03, inkGamma .62, fadeStart .55, fadeSpan .3, inkCut .03, extentInk .15, depthCut .3, depthEdge .05}` · `MAX_COUNT full 80,000 / lite 20,000` · `TOUCH_GRID_SCALE 0.52` · `REST_PARALLAX yaw .16 / pitch .10 (× hover)` · sway `.02/.012 rad`, breath `.004` · kernel `SPRING 52, DAMPING 7.5 (ζ≈.52), MAX_SPEED 16, TURB 9`, stagger `hash·.55 / .45`, `MORPH_DURATION 1.4 s`, `ENTRY 1.8 s` · render `PORTRAIT_SIZE_MIN .06 / INK .94`, edge `smoothstep(.5, .34 − .3b)`, knee `smoothstep(0,.1,ink)`, `cov²` with `covPx = max(1.25, .35·spacing)`, `Discard < .02`, additive, depth off · bloom `1.1 / threshold 1.0 / radius .7` · camera `fov 50, z 12`, `antialias:false`, dpr ≤ 2.

Dev handles: `__sersanFounderMorph.{getSampler, getUniforms, getGate, getLook, setLook, setBlend, setDepth, setPointSize, setSpread, setEmissive, setMorph, setStage, playMorph, simulateGesture, resample, project, bbox}`; store `__sersanFoundersMorph` (plural). Scroll with `__lenis.scrollTo`, Esc ends the intro, section must be in view (cull early-return).

Depth-model licences (HF API, 2026-08-27): `onnx-community/depth-anything-v2-small` **apache-2.0**; `…-base` and `depth-anything/Depth-Anything-V2-Base-hf` **cc-by-nc-4.0**.

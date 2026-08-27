# critic-visual — adversarial review of SYNTHESIS.md (lens: visual fidelity vs lusion.co/about TEAM)

Date 2026-08-27. Inputs: `SYNTHESIS.md`, working tree of `C:/Users/alber/Desktop/Sersan` (uncommitted, 39 files), the four `public/founders/<anchor>-depth.webp` twins (measured with PIL/numpy today), and the shipped Lusion vertex shader (`dossiers/lusion_faces_chunk.js`, verbatim). Question: will the recommended plan (§4B, B1–B7) actually remove the empty patches AND produce a volumetric premium look, or will it still read as a halftone photo?

Short answer: **the empty-patch fix is real for Michele and Alessandro and will NOT work for Mattia as shipped; the "volumetric" half of the plan is aimed at the wrong regime** — the synthesis mis-reads Lusion's disc size (a units error), so B2 as written ("fewer, larger discs ≈2× pitch, 12-px floor") moves SerSan toward a *smooth lit relief plate*, not toward Lusion's *sparse sharp dots + heavy bokeh + bloom* look. Details and proof below.

---

## Confirmed

**C1. Root cause 1 (chromatic `ink`) is correctly diagnosed and the in-tree presence-ink fixes it — for two of four portraits.**
- Tree code (`src/webgl/image/sampleImagePoints.ts:418-432`): with a depth twin, `ink = smoothstep(depthCut±depthEdge)(dep) · fade`, AND-ed with the flood-fill `bgMask`. Inside the matte ink ≡ 1, so `sizeNode = uPointSize·dpr·(0.06+0.94·ink)…` (`src/webgl/gpgpu/gpgpuNodeSim.ts:2083-2095`) gives every bust cell a full disc and `Discard(alpha<0.02)` at `:2305` can no longer trigger on bright skin.
- Depth twins measured today (600×900, 8-bit, normalised per map):

| twin | histogram (10 bins 0→1) | pixels in the 0.19–0.35 "gap" | enclosed holes in `d>0.3` mask |
|---|---|---|---|
| michele | [160365,104361,1053,3719,14011,37835,74292,71769,44040,28555] | **0.5 %** | 0 |
| alessandro | [119777,133117,2893,6927,24619,35195,70854,71377,45122,30119] | **1.1 %** | 0 |
| mattia | [85723,90763,46467,56334,89451,79579,38081,31979,15250,6373] | **14.3 %** | 0 |
| alberto (placeholder monogram) | [102981,72044,66588,49532,55600,64355,46009,33306,30537,19048] | 18.4 % | 0 |

  Michele/Alessandro are cleanly bimodal → `depthCut 0.3` sits in an empty gap; scalp, forehead, cheeks and glasses are inside the matte (visual check `dossiers/critic_depth_check.png`, panels 2–3: glasses frames and beard resolved, no hole anywhere). **"No more empty patches" holds for these two.**

**C2. Lusion's head is baked geometry, not a photo effect** — verified verbatim in `lusion_faces_chunk.js`: `texture2D(u_positionTexture)`, `u_norShadeTexture`, `light = norShade.w*1.25; diff = linearStep(0.35,1,dot(worldNormal,lightDir))/sqrt(distToLight*0.1); light *= diff+0.6; frontFaceMultiplier = linearStep(-0.2,0,viewNormal.z)`; quads offset in **model space** (`pos.xy += position.xy*pointSize…; gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1)`); One/One; scanline `smoothstep(0.04,0,abs(fract(u_time*-0.3-basePos.y*.5+.5)))` with rim `smoothstep(0.03,0,abs(viewNormal.z))`. Brightness never depends on photo luminance. Agrees with SYNTHESIS §2.3.

**C3. Root cause 2 ("halftone by construction") is correct for production**: tone = disc diameter on a 290×405 lattice, `NormalBlending`, no normal, `Z_RELIEF_MAX_FRAC 0.04` (`src/webgl/FounderPortraitMorph.tsx:228`), `antialias:false`. Confirmed in the tree.

**C4. The tree's lit path exists as described** (`gpgpuNodeSim.ts:1850-1950`, `:2160-2196`, `:2225-2305`; `FounderPortraitMorph.tsx:281-336, 1225-1246`): `[rgb24,nx,ny,ink]` packing, wrap-Lambert + rim + scanline, `min(…,1)` cap, front gate, DoF `bokeh 1.2 / focusRange 1.4`, additive, `DISC_PITCH_LIT 1.15`, `REST_RELIEF 0.2`, `Z_RELIEF_DEPTH_FRAC 0.34`, `target.z.mulAssign(reliefN)` in the kernel (`:1517`).

**C5. Licence finding (B1) is real**: `scripts/generate-founder-depth.mjs` defaults to `base` (CC-BY-NC-4.0 per the synthesis's HF check). Regenerating with `small` is cheap and necessary.

**C6. "Volume at rest is carried by lighting only" — confirmed and quantified; it is worse than stated.** Displayed relief at a locked stage = `Z_RELIEF_DEPTH_FRAC 0.34 × REST_RELIEF 0.2 = 6.8 %` of face height *for the max-|z| cell*. But `zNorm` normalises against `maxAbsZ` over ALL portraits and ALL cells (`FounderPortraitMorph.tsx:755-768`), and the nearest cells are the **shirt/collar**, not the face: Michele head band (rows 8–42 %, d>0.3) p5/50/95 = 0.48/0.64/0.74 while torso (rows >60 %) = 0.49/0.77/0.96; Alessandro 0.48/0.69/0.82 vs 0.44/0.75/0.96. After `(d−0.3)/0.7` the face spans ≈0.26–0.63 of the range → the face gets ≈37 % of the 6.8 % ≈ **2.5 % of face height of projected relief at rest**. Normals are flatter for the same reason (face gradient ≈ 1/3 of the collar's). The "flat plate in front of a bulging shirt" risk (`web-3d-from-photo` §5.2) is not optional — it is what the tree renders today (see `critic_depth_check.png` panel 2: the collar is the brightest = nearest region).

---

## Refuted / wrong

**R1. Mattia's depth twin does not satisfy the tree's own premise ("four twins bimodal, wall ≤ 0.19 / bust ≥ 0.35", `FounderPortraitMorph.tsx:273-277`).**
Proof: `critic_depth_check.png` panels 4–6 and the table above. Mattia's headshot is the PCHIP-washed/faded asset; Depth Anything reads the faded gradient as a sloping backdrop: top-left/top-right background is 0.3–0.45, the lower frame is a bright ramp, 14.3 % of pixels sit in the "gap". The `d>0.3` mask is a blob that merges the head with the top of the frame and includes the whole lower half. The flood fill (`dist<0.055` from the measured wall colour) rescues the border-connected wall where it is still near-white, but (a) the washed lower band is neither wall-coloured nor below `depthCut`, so cells there ink at 1 and are only tamed by `fadeStart 0.55`; (b) the head band p5 = 0.325 means `smoothstep(0.25,0.35)` starts eating the hair/forehead fringe of Mattia's own head → **new empty patches on target C**, the very class of bug the plan claims to close. Alberto's placeholder shows the same non-bimodality (18.4 %) — irrelevant until the real headshot lands, but every union/stride number measured with it is provisional.

**R2. "Lusion draws ~6k visible points at ≥12 px, ≈2× pitch" (§0.4, §1.4, §3.5, B2) — units error; Lusion's in-focus discs are SUB-pitch.**
Shader (verbatim): `basePointSize = 0.009*(1+pow(v_blurriness,1.5)*8)*frontFaceMultiplier; pointSize = max(basePointSize, 12./u_resolution.y); pos.xy += position.xy*pointSize` **in model space, before `modelViewMatrix`**. So `12./u_resolution.y` is a resolution-dependent *model-space* size, not "12 pixels". The head spans x ∈ [−1,1]·1.3 = 2.6 model units; measured NN spacing 0.0118 (raw) × 1.3 = **0.0153 model units**. Base disc 0.009 = **0.59 × pitch**; floor at 900 px = 0.0133 = 0.87 × pitch; at 1350–1440 px the floor ≈ base. Only out-of-focus points grow (×9 → 5.3 × pitch) and they are simultaneously dimmed (`v_shade *= (1−b·0.5)`, fragment `shade *= (1.25 − b·v_shade)`, alpha `×(1−b)³·0.8`).
Consequence: the "solid, volumetric" reading on lusion.co is **sharp sub-pitch dots on the in-focus front + big dim bokeh discs behind + One/One accumulation + bloom amount 12.5 at threshold 0.8**, on a *non-lattice* point set. It is not "fewer, larger, fused discs". Root cause 3 is half-right (the lever is DoF + bloom + lighting, not count), but B2 as written (`DISC_PITCH_LIT → 2.0–2.4`, "pixel floor ≈ 6·dpr", grid 150×210) pushes SerSan toward a continuous-tone *lit relief plaque* — a sculpted photo — which the owner will read as "still a photo", just smoother. Individually glowing points (what the owner literally asked for) vanish at 2.4 × pitch.

**R3. Focus placement in the tree is inverted relative to Lusion, and the plan keeps it.** Lusion: `v_blurriness = min(1, |depth − 0|·2.5)` when active (`depth = clamp(1 − pos.z)`), i.e. **in focus at the front (nose/cheeks, raw z ≥ 0.77 ≈ 3.9k points) and fully blurred by raw z ≈ 0.46** (sides/ears/neck). SerSan: focus plane = the group's own view distance (`uFocusDist = CAMERA_Z − dolly`, `FounderPortraitMorph.tsx:1231`) = the *mid* plane of the relief; `focusRange 1.4` world units on a face ≈5 units tall whose projected relief at rest is ≈0.12 units (C6) → `b ≤ 0.09`, growth `1 + 0.09^1.5·1.2 ≈ 1.03`. **The DoF is numerically absent at rest**; the synthesis notes "≈0 at rest anyway" yet lists bokeh under "done — keep". Nothing in B1–B7 moves the focus plane to the front or scales `focusRange` to the relief.

**R4. B3.1 (perspective pre-divide) contradicts the owner's goal and the plan's own rest parallax.** The pre-divide makes every disc project onto its lattice cell *at the centre of projection only*; under `REST_PARALLAX_YAW 0.16 rad` the group rotates and lateral separation between neighbours of different z returns as `Δz·sin(0.16)`: a jaw/ear ramp of Δz ≈ 0.3 units over 2 cells (full relief, face 5 units, pitch ≈0.012 units) gives ≈0.048 units ≈ **4 cells** — the comb it was meant to remove, plus the acknowledged shear. And if it *worked* (no parallax) the section is exactly what the owner is complaining about: a flat picture that lights up. The comb is a **lattice-aliasing** artefact (regular columns shifted by non-integer cell amounts); the geometric fix is to stop using a lattice (Lusion: 974 distinct x bins, blue-noise-like) and to let side discs blur/overlap so a 1–3-cell shift has no gap to reveal. Cheap in the current pipeline: full-cell jitter (`JITTER 0.45 → 1.0`) plus a hashed dropout ≈ 40 % — index pairing survives because the shared cell list is unchanged.

**R5. "Additive + bigger discs blow out at the pointer-light extreme — the cap exists" — true, but the cap is why the face cannot glow.** `min(ambient + diffuse·diff + rim, 1) × emissive 0.72 × tone ≤ 0.72` against a bloom threshold of 1.0 (`fxStore` 1.1/1.0/0.7). Only the scanline (`+scan` outside the cap) crosses 1.0. Lusion's lit points are individually inside bloom (amount 12.5, threshold 0.8); that halo is a large part of the "volumetric glow". With the tree's numbers the head is below the bloom threshold except during the sweep and will read matte.

**R6. "Normals: same scale as z, so light and geometry agree" (§1.7).** `emit()` takes the gradient of `field` in *sampler* units (depth 90 grid-px over the bust) while displayed z is `field × zFactor × uRelief` — at rest ≈0.6× the sampler scale, mid-leg ≈3×. Lighting and displayed geometry never agree. Harmless at rest (intended: lighting carries the volume) but wrong as stated, and relevant to A3/A4 where relief is raised.

**R7. §5.1's gates are blind to the look.** Every gate ("discs overlap", "no comb", "stride 1", "p95 ≤ 8 ms") is measurable-but-blind; none asks "do individual points read? does the front glow? do the sides recede?" — the three things that separate the two screenshots. A plan that passes every §5.1 gate can still render a smooth grey bas-relief.

---

## Amendments

**A1. Per-portrait presence cut + head-only depth normalisation (replaces the fixed `depthCut 0.3`).** In `generate-founder-depth.mjs` (or `readGrid`): cut per map by Otsu on raw depth *after* the flood-fill mask removes the wall (fallback 0.3); then `d' = ((d − cut)/(headMax − cut))^0.7`, `headMax` = p98 of depth **inside the head band only** (rows above the collar — first full-width bust row of the mask, or 0.42·H for these framings); clamp torso to ≤ 1. Effect: the face takes the whole relief range (Michele 0.48–0.74 → 0–1) and the shirt stops being the nearest surface (fixes C6). For Mattia regenerate from the **unwashed** source (`mattia-scattu.webp`, 40 KB — check resolution); the wash is a DOM concern and must not feed the depth model. Gate: pixels within ±0.05 of the cut **< 2 %** on all four twins, enforced by a script committed next to the generator.

**A2. Rewrite B2 around Lusion's actual regime** (all live-tunable via `resample / setPointSize / setLook`):
- count ≈ 20–30k at stride 1 via a smaller grid (≈190×265) **and** full-cell jitter + hashed dropout so no row/column alignment survives (R4);
- `DISC_PITCH_LIT` 1.15 → **0.9–1.1** in focus (points stay individually visible); floor as a *fraction of stage height* (Lusion: 12/res.y ≈ 1.3 % of viewport height), not `6·dpr` px;
- DoF: focus plane at the **front** of the bust (`uFocusDist = CAMERA_Z − dolly − extentRef.hz`), `focusRange ≈ 0.4·hz` at full relief, `bokeh` 1.2 → **6–8**, keep the energy term, use Lusion's cubic alpha fall-off `(1−b)³·0.8` instead of `1−0.55b`;
- emissive 0.72 → **1.4–1.8** with the light cap raised to ≈1.3 so lit front dots exceed the 1.0 bloom threshold and a halo forms; keep `LIGHT_SWING` small;
- DPR 1.5 cap (B4) — keep.
Gate (visual): at `setStage('B')`, 1440×900 dpr 1.5, a 200 % crop of the cheek shows **distinct dots**, ear/neck shows **larger, dimmer, softer** dots, the forehead highlight has a bloom halo; compare with a lusion.co crop at the same scale.

**A3. Drop B3.1 (pre-divide); do B3.2 (silhouette dilation) + non-lattice sampling + front gate, then raise `REST_RELIEF` to ≥ 0.6 on A1's head-normalised depth.** Re-measure the comb *after* A2 (bokeh side discs + dropout + jitter remove most of it); if the ear ramp still tears, widen `frontLo/frontHi` (−0.35/0.15 → −0.5/0.3) so steep cells shrink earlier — Lusion's `linearStep(−0.2,0,viewN.z)` on real side geometry.

**A4. Baked shade (B5) must multiply the *ambient+diffuse* term, not the colour.** Lusion: `light = shade·1.25·(diff+0.6)`, shade p50 = 0.15 (most points dim; only lit, unoccluded, front points bright). Folding AO into the colour lane keeps the lit floor (`ambient 0.08 + diffuse`) and so keeps the plate uniformly lit. Pack `ao` in the ink lane (`w = presence·256 + ao`, 16-bit exact) and use `light = ao·(ambient + diffuse·diff) + rim`. Horizon AO on the head-normalised field suffices; a 12-step ray-march toward `LIGHT_BASE` adds the brow/nose cast shadow that is the strongest "3-D head" cue in the Lusion screenshot.

**A5. Tone: stop compressing everything toward grey.** `photo 0.35 + mono 0.8 + monoTint (0.8,0.9,1)` make the four faces converge (the synthesis lists it as a risk; treat it as a constraint). Keep `mono`, but let hair/beard/brows be darker through `photo ≈ 0.6` — on a lit, additive, front-focused cloud dark regions read *sparse*, which is how Lusion's beards read (shade-0 points collapse).

**A6. Background layers are not optional for parity.** Half the difference between the two screenshots is context: Lusion's head sits in glyph rain (196 strips, 4 blur levels) over contour lines, bloom 12.5. A perfectly lit SerSan head on flat `#0B1422` still feels like "a picture". Ship G1 (glyph rain, brightness ≤ 0.6) with B, not after.

**A7. Keep `REST_PARALLAX` (0.16/0.10)** — the only true 3-D cue on hover — but only once A3 makes the relief real; until then it exposes the flatness (a plate turning).

**A8. Add three visual gates to §5.1** (Chrome WebGPU screenshots, owner-run): (i) distinct dots visible at 100 % on the cheek; (ii) ear/jaw silhouette visible at hover extreme (`mouse.x = 0.95`) — the head *turns*, not shears; (iii) bloom halo on the highlight without the shirt blowing out. Reference: `lusion.co/about`, section 50 % in view, same viewport.

---

## Open questions

1. **Head pixel size on lusion.co** — the model→px conversion assumes the head ≈400 px tall at a 900 px viewport (fov 60, container (0,34,25), camera on a spline). Measure once in the browser (`AboutHeroFaces` container bounds → screen). The "sub-pitch in focus" conclusion is a model-space ratio and does not depend on it; the *absolute* target dot size does.
2. Does `u_resolution` carry device px (×dpr 1.5) or CSS px? Shifts the floor by 1.5× — irrelevant to R2, relevant to A2's floor fraction.
3. Mattia: is an unwashed 1200×1800 source available (`mattia-scattu.webp` is 40 KB), or must depth run on the washed 2:3 asset with a manual matte?
4. With ≈20–30k particles and A2's smaller in-focus discs, does the union/stride logic still land at stride 1 with the whole-bust matte (`MAX_COUNT_BY_TIER.full 80,000` guard)? Needs `getSampler()` in-browser.
5. Is per-layer bloom feasible on the r184 WebGPU post chain (`src/webgl/PostFXNodes.tsx`), or must the head rely on exceeding the global 1.0 threshold (A2)? Lusion raises the *global* amount to 12.5 only while `hudRatio ≥ 0.5`; an equivalent intensity ramp gated by the founders section's `pinned` state is the cheapest parity move.
6. Will the owner accept a *sparser, dimmer* face (Lusion shade p50 = 0.15)? The brief says "photographic at rest" (`DEFAULT_EMISSIVE` comment) and that instinct produced the halftone. The two goals are in tension; one must win.

Artifacts: `dossiers/critic_depth_check.png` (headshot / depth / `d>0.3` mask for Michele and Mattia, 6 panels).

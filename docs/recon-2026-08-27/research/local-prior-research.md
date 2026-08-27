# local-prior-research — what the repo already knows about the founder particle portraits, Lusion, and point-cloud faces

Date: 2026-08-27. Scope: read-only synthesis of prior research and decisions already in `C:/Users/alber/Desktop/Sersan` (the live repo), the stale twin `C:/Users/alber/sersan` (where the gitignored `.refs/` clones still live), the memory notes, the previous session's scratchpad dossiers, and the current implementation source. Every claim cites a path, commit, or URL. Nothing here is invented; where I add my own analysis it is marked **[analysis]**.

Sibling work in this same session: `scratchpad/dossiers/lusion-live-reverse.md` (+ `lusion_hoisted.js`, `lusion_about.html`, `lusion_team.json`, `lusion-bundle/`) is the LIVE reverse-engineering of lusion.co/about by the main session. I do not duplicate it; §6.3 cross-references it and flags one discrepancy with the older local dossier.

---

## 0. TL;DR for the synthesis agent

1. **The current founders effect is a 2-D photograph sampled onto a regular jittered grid** (290×405 cells, 51,751 shared cells at N=3, one particle per cell, disc size = "ink"), rendered with `depthTest/depthWrite: false`, z-relief capped at **4 % of face height** (`Z_RELIEF_MAX_FRAC = 0.04`) and a crisp disc edge. That is, by construction, a **halftone**. The docs say so themselves: "the resting cloud is effectively flat" (`src/webgl/FounderPortraitMorph.tsx:210-221`). Lusion's TEAM heads are **8,192 points sampled from a photogrammetry head scan with baked normals + AO, lit by a mouse-driven point light, additive + bloom** (sibling dossier §2-3). The gap is **data (3-D geometry + normals), not shader polish**.
2. **The "empty patches on bright skin" have a structural cause that the prior research only half-solved.** Two rounds of per-pixel colour thresholds were rejected because they deleted Michele's lit scalp (commits `69e49a6` → `065104c` → `4abdabc`; HANDOFF contract 2). The fix was a border-seeded flood fill for the *mask*. But the **ink term that drives disc size and alpha is still `dist(pixel, backdropColour)`** (`src/webgl/image/sampleImagePoints.ts` "Ink" block; `alpha *= smoothstep(0, 0.1, ink)`; `Discard(alpha < 0.02)`, `gpgpuNodeSim.ts` ~1900-1950). **[analysis]** Any skin pixel whose colour is within `inkFloor/inkGain = 0.03/1.7 ≈ 0.018` (luma-weighted RGB distance) of the white wall gets ink ≈ 0 → disc ≈ 6 % size → alpha 0 → discarded. Bald scalp, forehead highlights, cheek highlights and the white of the glasses' reflections are exactly those pixels. The flood fill stops the *wall* from being kept; nothing stops *wall-coloured skin* from being dropped. This is the owner's screenshot.
3. **What was explicitly decided/rejected** (details §7): weighted-random sampling (holes+duplicates) ✗; per-pixel luminance/chroma backdrop tests ✗ (twice); z-relief > 4 % and the centre bulge ✗ (perspective "comb tearing" on a regular grid); depth-tested overlapping discs ✗ (mottling); additive soft motes for faces ✗ (mush); the timid "backdrop plane behind DOM cards" plan (§4 of WEBGL_UPGRADE_PLAN) ✗; global camera moves ✗ (SignatureLine is the single camera authority); ScrollTrigger `pin:` ✗; violet ✗; FBO ping-pong GPGPU on WebGPU ✗ (scrambles → compute + storage buffers); morph on phones ✗ then partially reversed (Phase 4d touch island, stretch, kill-switch `RAIL_ISLANDS_TOUCH`).
4. **Hard technical walls recorded in the repo** that any redesign must respect: WebGPU **8 vertex buffers** max (was hit; now colour+ink packed as `vec4` per target and read via `.element(instanceIndex)`), compute kernel at **8/8 storage buffers** (position, velocity, homeA-D, start, delay → a 5th person is impossible without re-architecture), TSL `varying()` hoisting trap, `antialias:false` sub-pixel discs, stride-cliff at `MAX_COUNT_BY_TIER.full = 60000`.
5. **Nothing in the repo researches matrix-style glyph rain, luminous contour lines, or 3-D head reconstruction from a photo.** Only depth-map *parallax* for case-study cards was studied (`ANALISI_LUSION_WORK.md §2.2`, Depth-Anything via transformers.js suggested; `PIANO_RESTYLE.md:88-90,175`). Those three pillars of the Lusion TEAM section are **greenfield** for this project.

---

## 1. Sources read (paths)

| File | What it is | Relevance |
|---|---|---|
| `WEBGL_UPGRADE_PLAN.md` (342 lines) | Codrops-derived upgrade plan; §1 references table; **§4R** particle-portrait morph plan (supersedes §4) | Origin of the morph concept, reuse of hero compute engine, fallback matrix |
| `ParticleDissolve.md` (479 lines) | Plan v2 for the hero mark two-layer spore dissolve, incl. live inspection of Lusion DDD footer, spring physics, ζ tuning, WebGPU compute lesson | Physics model + Lusion two-layer observation + WebGPU pitfalls |
| `CODROPS_REFERENCES.md` | Index of the 6 cloned reference repos + re-clone commands | Where the refs are, what each contributed |
| `ANALISI_LUSION.md` (151 lines) | Live analysis of lusion.co home (Chrome MCP, 2026-06) + effect catalogue → replication plan | Lusion stack/journey; explicitly does NOT cover /about |
| `ANALISI_LUSION_WORK.md` | 2026-08-20 deep dive into Featured Work + project page shaders | Depth-map raymarched parallax (12 steps) + DOF for cards |
| `docs/recon-2026-08-17/LUSION_DOSSIER.md` | Static reverse-engineering of `hoisted.CUO_IjfL.js` (preloader + mobile matrix), with about-page rows | Confirms about page has a particles sim, rocks, capability lines, per-device counts |
| `docs/recon-2026-08-17/SERSAN_PRIOR_ART.md`, `SERSAN_INVENTORY.md`, `ERA_DOSSIER.md`, `PHASE0_*` | Mobile-parity recon | Founders morph gating history on phones |
| `plans/2026-08-17-mobile-parity.md`, `plans/2026-07-23-wow-wave.md` | Plans | Phase 4d touch morph (stretch), camera-lock rule |
| `IMPROVEMENT_BACKLOG.md` | Continuous-improvement loop | A5 (portrait coverage threshold vs DPR), A8 (binding budget walls) |
| `HANDOFF_FOUNDER_MORPH.md` (the "bible", per memory) | 12 contracts, 4th-target procedure, debug handles, open items | Everything learned the hard way |
| `.trellis/tasks/06-06-*/research/mattia-*.md`, `portrait-calibration/wash_mattia.py`, `mattia-headshot.ORIGINAL.webp` | Third-target research (5 specs, 3 critiques, review, corrections) + offline sampler port | Sampler internals, hazards, offline calibration method |
| `src/webgl/image/sampleImagePoints.ts` (469 lines), `src/webgl/FounderPortraitMorph.tsx` (1277 lines), `src/webgl/gpgpu/gpgpuNodeSim.ts` (portrait branch), `src/components/sections/founders-rail.tsx` (header + gates) | As-built implementation | Exact parameters, formulas |
| `~/.claude/projects/C--Users-alber-sersan/memory/*.md` | Memory notes 2026-07-09 → 2026-08-27 | Chronology of what was tried |
| Previous session scratchpad `…/fcd51dc0-…/scratchpad/dossiers/team-fourth.md` + `CHANGELOG-team-fourth.md` | 4th member recon (2026-08-27) | Union/stride projections at N=4 |
| `C:/Users/alber/sersan/.refs/` (gitignored, only in the STALE twin) | `codrops/{animate-shaders-with-gsap, horizontal-parallax-gallery, onscrollfilter, r3f-image-reveal-effect, webgl-carousel}`, `misterprada-logo-particles` | Reference code (read §5) |

**Missing on disk (cited by docs but not present anywhere):** `.refs/interactive-particles` (brunoimbrizi) and `thebeautyofcoding/particlesImagesVideosThreeJs` — commit `e6b160e` says "both cloned to .refs/" but neither exists in `Desktop/Sersan/.refs` (dir absent) nor `~/sersan/.refs`; `_refs/DOSSIERS.md` referenced by `IMPROVEMENT_BACKLOG.md` is also absent. Re-clone from GitHub if needed: https://github.com/brunoimbrizi/interactive-particles , https://github.com/thebeautyofcoding/particlesImagesVideosThreeJs (URLs as named in the commit message; not re-verified live in this task).

---

## 2. Chronology of the founder portrait effect (what was tried, in order)

All commits in `C:/Users/alber/Desktop/Sersan` (`git log`), messages quoted.

| Date / commit | Attempt | Outcome |
|---|---|---|
| 2026-07 (pre-`69e49a6`) — `WEBGL_UPGRADE_PLAN.md §4` | "Backdrop" plan: WebGL plane behind DOM cards with noisy radial reveal (Codrops #3), cursor neural lens (Codrops #2 demo 2), 3-D tilt, contour particles | **Rejected by owner as "troppo timida"** → superseded by §4R |
| §4R plan | Single ~26k-particle cloud sampled from the photo (position + colour, z from luminance), explode mid-scroll, recompose into next founder; group orbit+dolly; reuse hero `createTextMorphComputeBuild`; MisterPrada as sampling reference | Adopted |
| 2026-07-09 memory `founder-headshots-landed.md` | Real studio headshots (3464×5196, near-white wall) processed to 1200×1800 webp + tight `-headshot` crops; `DEFAULT_SAT_FLOOR 0→0.06` (chroma floor to drop the white wall) | Shipped, then owner: **"fatto male, voglio molto più definito e reale"** |
| `7f0eea1` "denser, more defined particle portraits" | satFloor → bright-neutral drop (`bgLumCeil 0.62 / bgChromaCeil 0.06`); COUNT 26k→60k; grid 300×420→420×588; `lumGamma 1.15→0.7`; `lumFloor 0.1→0.05`; radial falloff 1.7/0.72→1.1/0.92 | Better, still weighted-random sampling |
| `a96f712` | Entry assemble fix + **shadow lift** (`uShadowLift 0.16 / uShadowKnee 0.28`) so near-black hair/beard doesn't vanish on navy | Shipped |
| `69e49a6` "founder particle portraits + 20 defects" | Headshot files actually sampled (were falling back to env photos with bad crops); `lumCeil + neutralSat` backdrop test ("lowering ceiling past 0.8 eats Michele's lit scalp, so 0.8 stays"); grid 420×588, 26k→42k; **tighter disc edge on portrait path** (hero's soft mote "averaged overlapping photographic discs into mush"); `MORPH_DURATION 2.6→1.4 s`, spring 34→52 | Shipped |
| `e6b160e` "rebuild portrait sampler — one particle per cell, tone from size" | **Owner rejected "blocky voids punched through the faces, worst on Michele."** Measured: candidate cells 17,545; particles 42,000; **1,902 empty cells (11 %)**; **26,357 duplicates (63 %)**; max 12 picks on one cell. Root cause: weighted picks WITH replacement (tone by density) + per-pixel wall threshold. Rebuilt after brunoimbrizi (`psize *= max(grey, 0.2)`): one particle per cell, tone by SIZE via `ink`, shared grid + union cell list (index-paired morph replaces radial-sector sort). Grid 290×405 → 42,087 shared cells | Architecture that is still live |
| `56b77c1` | TSL `varying()` hoisting trap: `vMorphColorF ≡ 0`, `vInkF ≡ 0` (face never became Michele; fringe never faded). Proof against r184 `VaryingNode.js:162-182`, `NodeBuilder.js:2572-2600` | Fixed; contract 3 |
| `60075f4` | Backdrop particles must collapse to nothing: `PORTRAIT_SIZE_MIN 0.32→0.06`, `PORTRAIT_SIZE_INK 0.66→0.94`, alpha `clamp(0.35+0.9·ink)` → `smoothstep(0, 0.14, ink)`. Measured population: 22,034 cells subject in both (52 %), 3,889 A-only, 4,915 B-only, 11,249 faint → **48 % of the cloud should be invisible at any instant** | Fixed |
| `065104c` | Sub-pixel ghost band: `antialias:false` → discs < 1 devpx shade at full intensity. **Coverage compensation** `alpha *= cov²`, `cov = clamp(diam / max(1.25, 0.35·spacingDev), 0, 1)`; alpha knee widened to `smoothstep(0.03,0.35,ink)²`; **noise gate `inkGateLo 0.05 / inkGateHi 0.22`** before gamma | Over-corrected → next |
| `4abdabc` "separate backdrop SPATIALLY — border flood fill, not a colour test" | **"Michele had a hole in his head and Alessandro was less defined"** — the noise gate deleted the lit scalp again ("REPEAT OFFENCE"). Border-seeded flood fill (`BG_FILL_TOL 0.055`, seeds = top row + side columns above `BG_FILL_ROW_LIMIT 0.62`); gates deleted; knee back to `smoothstep(0, 0.10, ink)` unsquared; curve `inkFloor 0.03 / inkGamma 0.62 / dissolve 0.62+0.32` | Current sampler |
| `1083d42` (2026-07-20) | Third target (Mattia): colour/ink chain via uMorph2; **WebGPU vertex-buffer limit 8 hit (10 requested → nothing rendered)** → pack colour+ink into `vec4` per target, read with `.element(instanceIndex)`; clock termination on interior nodes; gate release generalised | Shipped, `HANDOFF_FOUNDER_MORPH.md` written |
| 2026-07-23 `e695b09` | Merge of founder-morph line with wow-wave line; morph requires `(min-width:1024px) and (min-height:780px)` + tier full + true WebGPU | In production |
| 2026-08-17/18 Phase 4d (`91704ee`) | Touch island on capable phones: native snap scroller publishes `scrub`; grid scaled by `TOUCH_GRID_SCALE 0.58`; ceiling `lite 20000` (unmeasured on device) | Shipped behind `RAIL_ISLANDS_TOUCH` (default true) |
| 2026-08-27 (uncommitted at the time of `six-task-wave` memory; now in `HANDOFF_FOUNDER_MORPH.md` "Quarto target") | Alberto as 4th target (`WIRED_TARGETS = 4`, tintD chain); **headshot is a placeholder monogram** (`alberto-headshot.webp` = `alberto-tuveri.webp`, 15,674 B, md5 `5734284b…`) | Engine half safe; content half must not ship until the real photo lands and `getSampler().stride === 1` is measured |

---

## 3. The as-built system (numbers and formulas)

### 3.1 Sampler — `src/webgl/image/sampleImagePoints.ts`

- Grid `GRID_W 290 × GRID_H 405` (5:7), cover-crop centred; `getImageData` once per portrait.
- Backdrop colour = per-channel **median of the two TOP 14×14 corner patches** (`CORNER_PATCH 14`).
- Per-cell distance: `dist = sqrt(0.299·dr² + 0.587·dg² + 0.114·db²)` (luma-weighted RGB distance to backdrop).
- **Backdrop mask = border-seeded flood fill**: admit cell if `dist < BG_FILL_TOL (0.055)`; seeds = whole top row + left/right columns for `y < 0.62·H` (`BG_FILL_ROW_LIMIT`); explicit stack; fill may not descend past the row limit (white shirt touches the bottom border; fill would eat the bust).
- Ink: `v = clamp((dist·inkGain − inkFloor)/(1 − inkFloor), 0, 1)`; `ink = v^inkGamma · fade`, with `inkGain 1.7`, `inkFloor 0.03`, `inkGamma 0.62`; masked cells → ink 0 unconditionally. Vertical dissolve `fade = smoothstep(1 − (ny − 0.62)/0.32)` (`fadeStart 0.62`, `fadeSpan 0.32`).
- Emit: xy = cell centre + hashed sub-cell jitter (`JITTER 0.9`, hash of the CELL index so all portraits jitter identically); rgb = **sRGB→linear** (exact three.js curve, mandatory because render is `toneMapped:false`); `z = (lum − 0.5)·depth + max(0, 1 − rad/0.75)·centerZBias` (`depth 90` grid-px, `centerZBias 0` — disabled, `FACE_CY 0.44`, `BULGE_RADIUS 0.75` inert); `halfExtentX/Y` = 99th percentile of |x|,|y| over cells with `ink > extentInk 0.15`.
- Shared cell list = **UNION** over portraits of `maxInk > inkCut 0.03`; `stride = ceil(sharedCells / maxCount)` (integer cliff), `count = ceil(sharedCells/stride)`.
- Measured: N=2 → 42,087 cells; **N=3 → 51,751 cells, stride 1** (ceiling 60,000, ~16 % margin); per-portrait own-ink cells Mattia 38,387 / Alessandro 38,555 / Michele 38,833 after the Mattia "wash"; mean ink 0.550 (at inkCut 0.03); halfExtent max = Alessandro 136.50 grid-px. N=4 estimate ~57-62k (unmeasured; placeholder asset).
- Offline port `research/portrait-calibration/sampler_port.py` (+ `evaluate.py`, `apply_wash.py`, not all present — only `wash_mattia.py` and the ORIGINAL webp survive on disk) under-predicted the browser union by 8.6 % → "order of magnitude only".
- Dark garment rule (contract 12): fix in the ASSET, not the threshold. `wash_mattia.py`: per-row blend toward white `c' = 255 + (c − 255)·k(y)` with a **monotone PCHIP** `k(y)` = 1.0 up to y 985 (beard bottom), 0.333 @1076, 0.102 @1159, 0.0516 @1242, 0.042 @1345, 0.030 @1448, 0.015 @1531, 0 @1601 (`max |dk/dy| = 0.0101/px`); first linear attempt left "a visible horizontal line across the shoulders".

### 3.2 Island — `src/webgl/FounderPortraitMorph.tsx`

- Gate: home + tier full + `webgpuEnabled()` (build-time `NEXT_PUBLIC_WEBGPU=1`, `.env.local`) + **true WebGPU compute backend** (`backendOf`: storage indexing is a no-op on the WebGL2 fallback, three #31221) + `roomy` = `(min-width:1024px) and (min-height:780px)`; else `null` and the DOM rail is the whole experience.
- World scale: face extent ≈ `STAGE_FILL 0.92` × `[data-founder-stage]` rect. `Z_RELIEF_MAX_FRAC 0.04` ("0 = clean, 0.3 = visible tearing, 1 = severe comb" via `setDepth()`).
- Density: `spacingDev = sqrt(stageW·stageH·dpr²·0.92² / count)`; `discDev = 2.1·spacingDev`; `defPointSize = clamp(discDev·CAMERA_Z / (dpr·1.05), 10, 96)`; face discs at full ink ≈ 1.7× spacing (touch → continuous tone), fringe < 1× spacing.
- Engine params passed to `createTextMorphComputeBuild`: `SPRING 52, DAMPING 7.5, MAX_SPEED 16, TURB 9, POINT_ALPHA 1.0`, `blending: "normal"`, `depthTest/depthWrite: false`, `emissive 1.18` (`DEFAULT_EMISSIVE`), `travelTint [0.16, 2.4, 3.0]` (HDR cyan mid-flight → selective bloom > 1.0).
- Motion: `SPREAD_MAX 1.1` world, `ORBIT_MAX 0.7` rad, `DOLLY 2.2` world, `PARALLAX_MAX 0.18` rad — all × `sin(g·π)` envelope so they are **exactly 0 at every locked stage**; rest-idle `REST_SWAY_YAW 0.02 rad @0.11 rad/s`, `REST_SWAY_PITCH 0.012 @0.07`, `REST_BREATH 0.004 @0.5`; `ENTRY_DURATION 1.8 s`, `MORPH_DURATION 1.4 s`. Group transform only — never the camera.
- Sequencing: `uMorph`, `uMorph2`, `uMorph3` all derived from one scalar `0..MORPH_MAX`; kernel blend is chained `mix(mix(mix(A,B,m1),C,m2),D,m3)`; per-particle stagger `clamp((morphN − hash·0.55)/0.45, 0, 1)` (delay window 0.55, duration 0.45).
- Debug: `__sersanFounderMorph.{getSampler,getUniforms,getGate,setStage,playMorph,simulateGesture,resample({inkGain,inkFloor,inkGamma,fadeStart,fadeSpan,inkCut,gridW,gridH}),setPointSize,setSpread,setEmissive,setDepth,setMorph,project,bbox}`; store is `__sersanFoundersMorph` (plural). Section must be in view (culling early-return) and use `__lenis.scrollTo` (teleport doesn't engage the gate); Esc ends the intro.

### 3.3 Render — `src/webgl/gpgpu/gpgpuNodeSim.ts` portrait branch

- Per target a `vec4` tint buffer `packTint(colors, size)` = linear rgb + ink, `instancedArray(...,"vec4")` read via `.element(instanceIndex)` in the VERTEX stage (never `.toAttribute()` — budget; never in the fragment — per-pixel storage read).
- Disc size `f = PORTRAIT_SIZE_MIN 0.06 + PORTRAIT_SIZE_INK 0.94 · inkNow` (× 0.85+0.3·rand); disc edge `smoothstep(0.5, 0.34, rr)` (hero: `0.5→0.12`).
- Alpha = `edge · POINT_ALPHA · uFade · assemble · smoothstep(0, 0.1, ink) · cov²`, `cov = clamp(diamDev / max(1.25 px, 0.35·spacingDev))`, `Discard(alpha < 0.02)`.
- Travel tint: `mix(colour, travelTint, clamp(speed·PORTRAIT_TRAVEL_K 0.16))` → bloom mid-flight only.
- Backlog A5 (open): `PORTRAIT_COV_MIN_PX` mixes device DPR with render DPR → soft-edge band over-dimmed up to 4× when `AdaptiveResolution` lowers render DPR.

### 3.4 Founders-rail DOM (`src/components/sections/founders-rail.tsx`)

Three modes: (1) MORPH vertical CSS-sticky stage with poster cross-fade, gate chrome, `lenis.stop()` hold; (2) HORIZONTAL RAIL (pinned desktop, non-WebGPU): SVG duotone portrait (`grayscale(1) brightness(0.85)` under navy scrim) + hover clip reveal via `feTurbulence`/`feDisplacementMap` filter `founder-boil-<uid>` (Codrops OnScrollFilter technique), name sweep 150 px, parallax 5 %; (3) NATIVE snap scroller (touch/RM) with `useCentreFocus` colour reveal, 3b touch morph. Hard rules: no ScrollTrigger `pin:` (breaks `[data-line-anchor="founders"]`), section height `100vh + travel`.

---

## 4. Contracts and walls (from `HANDOFF_FOUNDER_MORPH.md`, condensed)

1. Tone comes from SIZE, not count; never random subsample, never duplicate padding.
2. Subject/backdrop separation must be SPATIAL (flood fill), never chromatic — "lit scalp = white wall" (burned twice).
3. TSL varyings: pass a self-contained expression to `varying(expr)`; an outer `.toVar()` is captured at its initial value (three prepends flowCode at the top of vertex `main()`).
4. Below ~2 px size stops working (`antialias:false`) → `cov²` compensation; 2-D canvas previews cannot reveal it.
5. Camera roll: `rollGate` + `camRoll` publish + mark compensation.
6. Review the fix round after a fix round (parallel agents on disjoint files → 7 regressions once, 13 confirmed another time).
7. **WebGPU vertex-buffer budget = 8**; render now 4/8 vertex + 4/8 storage (N=4). **Compute kernel 8/8 storage** (position, velocity, homeA–D, start, delay). A 5th head is impossible without repacking homes. Fails silently in JS — only the console shows `CreateRenderPipeline` / `Vertex buffer count (10) exceeds…`.
8. `.toAttribute()` on a vec3 buffer yields 4 components (`.xyz` needed); `.element()` yields a true vec3. `instanceIndex` in the fragment silently becomes a varying → per-pixel storage read.
9. Clamp the clock toward the TARGET, not the rail bounds (interior nodes limit-cycled `0.994↔1.006`).
10. `uMorph` must reach exactly 1.0 before `uMorph2` leaves 0 (chained blend); do not copy the hero's 0.95 overlap.
11. Cell list is a UNION; stride is an integer cliff (one cell over → count halves for all faces, reads "uniformly soft", not sparse).
12. Dark clothing is fixed in the asset (PCHIP wash), not by threshold.

Framing contract for a new headshot (HANDOFF "Aggiungere un quarto ritratto"): 1200×1800, skull width ≈ 559 px, top of head ≈ y 306, light uniform backdrop in the TOP corners (sampler measures there), only the `-headshot` file is washed; DOM poster stays clean.

Backlog A8 (`IMPROVEMENT_BACKLOG.md`): "Binding-budget walls … founders cell union 51,751/60,000 … Any 5th home target or new per-particle buffer fails the pipeline silently."

---

## 5. Reference code already studied (and what was taken)

### 5.1 MisterPrada/logo-particles-template — `~/sersan/.refs/misterprada-logo-particles` (verified on disk)

- **Sampling** (`src/Experience/World/logo.js`): canvas `getImageData`; for every pixel `brightness = (r+g+b)/3`; keep if `brightness > 200`; position `((x − w/2)/100, −(y − h/2)/100, 0)`; colours commented out. Pure threshold, no colour, no depth.
- **Target texture** (`Utils/Helpers.js makeTexture`): positions are **shuffled in triples** (`shuffleArrayByThree`) then packed row-major into a `Float32 RGBA` DataTexture of size `ceil(sqrt(N))²`; particles start at random positions `x = ±3 + rand·2` (alternating left/right), `y = rand·5`, `z = 30 + rand·10`.
- **Morph** (`Shaders/Particles/vertex.glsl`): stateless, no GPGPU.
  ```glsl
  float inOutProgress(vec3 position, vec3 target, float progress) {
    float noiseOrigin = simplexNoise3d(position * uNoiseFrequencyParticles); // 0.653
    float noiseTarget = simplexNoise3d(target   * uNoiseFrequencyLogo);      // 0.870
    float noise = smoothstep(-1.0, 1.0, mix(noiseOrigin, noiseTarget, progress));
    float duration = 0.3; float delay = (1.0 - duration) * noise;
    return smoothstep(delay, delay + duration, progress);
  }
  transformed.xyz = mix(transformed.xyz, logoTexture.xyz, inOutProgress(...));
  ```
  `uProgress` is tweened by GSAP `0→1` over 10 s `power1.out`; the DoF `focusRange` tweens `0→0.2` after 4 s.
- **Material**: `PointsMaterial` `size 0.1`, `sizeAttenuation`, `alphaMap` sprite `textures/particles/1.png`, `alphaTest 0.2`, `AdditiveBlending`, `toneMapped:true`; fragment is the stock points fragment (custom bokeh function `0.05/d − 0.1` left commented).
- **Post**: `BokehPass { focus 1.0, aperture 5e-5, maxblur 0.01 }`; `UnrealBloomPass { strength 0.6, radius 1.9, threshold 0.362 }` **disabled by default** (`State.js`), tint composite `uTintStrength 0.15`; motion-blur pass also off.
- **GPGPU flow field** (`Shaders/Gpgpu/particles.glsl`): dead code — `simplexNoise4d` 3-axis flow field, `particle.a += dt·0.01` lifetime, respawn at `uBase` when `a ≥ 1`.
- What was taken (WEBGL_UPGRADE_PLAN §4R, CODROPS_REFERENCES #6): "image → particle cloud with morph; morph stateless `mix(start,target, staggered timing)`; sampling via getImageData threshold" → became the per-particle stagger `hash·0.55 / 0.45` in our compute kernel. The template's own sampling (threshold, no colour, no depth) is exactly the *flat* model we outgrew.

### 5.2 Codrops refs (`~/sersan/.refs/codrops/*`, CODROPS_REFERENCES.md + WEBGL_UPGRADE_PLAN §1)

| Ref | Article | Key formula reused / reusable |
|---|---|---|
| davidfaure horizontal-parallax-gallery | https://tympanus.net/codrops/?p=108925 | `uParallax = (elementCenter − vpCenter)/vw · intensity`; `uv.x += uParallax`; DOM variant img 125 % / `left:-12.5%` counter-translate (already in `railMotion.ts`) |
| biazo animate-shaders-with-gsap | https://tympanus.net/codrops/2025/10/08/how-to-animate-webgl-shaders-with-gsap-ripples-reveals-and-dynamic-blur-effects/ | GSAP tweens uniforms; hover lens `influence = 1 − smoothstep(0, 0.5, dist(uv, uMouse))` 2-texture crossfade; Kawase blur centre-focus (deferred: needs TSL `texture()/textureSize`) |
| colindmg r3f-image-reveal-effect | https://tympanus.net/codrops/?p=83030 | `alpha = 1 − clamp(noise(warp(uv)) + radial(uv, uProgress))`, vertex ripple × `(1 − uProgress)`, `CoverUV` |
| codrops OnScrollFilter | https://tympanus.net/codrops/?p=72802 | SVG `feTurbulence→feDisplacementMap` on a scrubbed mask — **this is the live DOM founder reveal** (`founder-boil` filter); landmine: global SVG ids → `useId()` |
| supahfunk webgl-carousel | https://tympanus.net/codrops/?p=71727 | per-frame `gsap.to` follower, click-to-fullscreen ripple `cos(angle)·sin(len(uv−.5)·15 + uProgress·12)`, `MeshTransmissionMaterial thickness = scrollSpeed` (WebGL-only) |

### 5.3 Other references named in the docs (URLs as recorded; not re-fetched here)

From `ParticleDissolve.md §9`: Three.js Journey *GPGPU Flow Field Particles* https://threejs-journey.com/lessons/gpgpu-flow-field-particles-shaders ; *Particles Morphing Shader* https://threejs-journey.com/lessons/particles-morphing-shader ; Codrops *Dreamy Particle Effect with GPGPU* https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/ ; Codrops *Dissolve Effect with Shaders and Particles* https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ ; Codrops *Surface Sampling* https://tympanus.net/codrops/2021/08/31/surface-sampling-in-three-js/ ; Codrops *WebGPU Gommage (TSL MSDF dissolve)* https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/ ; Wawa Sensei *TSL GPGPU* https://wawasensei.dev/courses/react-three-fiber/lessons/tsl-gpgpu ; Lusion *Surface Floater* (SDF + curl noise + velocity) https://experiments.withgoogle.com/surface-floater ; Lusion Awwwards case study https://www.awwwards.com/case-study-for-lusion-by-lusion-winner-of-site-of-the-month-may.html .
From `ANALISI_LUSION.md §6`: Codrops *Curly Tubes from the Lusion Website* https://tympanus.net/codrops/2021/05/17/curly-tubes-from-the-lusion-website-with-three-js/ ; akella curl-noise gist https://gist.github.com/akella/51667db48e6b0284dc51935936c776a3 ; cabbibo/glsl-curl-noise https://github.com/cabbibo/glsl-curl-noise ; Codrops *Mouse Flowmap Deformation (OGL)* https://tympanus.net/codrops/2019/09/25/mouse-flowmap-deformation-with-ogl/ ; Codrops *Motion Hover Effects with Image Distortions* https://tympanus.net/codrops/2019/10/21/how-to-create-motion-hover-effects-with-image-distortions-using-three-js/ ; pmndrs react-postprocessing https://react-postprocessing.docs.pmnd.rs/ ; DEPT *cinematic camera path* https://www.deptagency.com/insight/coding-a-cinematic-camera-path/ ; three.js `webgl_gpgpu_birds`.
From `PIANO_RESTYLE.md:88,175`: d3adrabbit *ScanningEffectWithDepthMap* https://github.com/d3adrabbit/ScanningEffectWithDepthMap (depth map offline via Depth-Anything, 8-bit quarter-res) — the only depth-from-photo idea in the repo, aimed at case-study cards, never at faces.
From `IMPROVEMENT_BACKLOG.md C14`: GreenSock/TroisJS 50k-point z-loop tunnel (`_refs/snippets/preloader-intro-troisjs.js`, file not on disk).

### 5.4 Physics model already validated for spores (ParticleDissolve.md §1, §5) — reusable for the head's "slowly moving" life

```
toHome = home − pos;            acc = SPRING · toHome
if d < RADIUS: acc += normalize(pos − mouse) · (1 − d/RADIUS)² · PUSH
acc += curl/turbulence · (TURB_BASE + TURB_MOVE · disp)
vel += acc·dt;  vel *= exp(−DAMPING·dt);  vel = clamp_len(vel, MAX_SPEED);  pos += vel·dt
ζ = DAMPING / (2·√SPRING)   // ζ≈0.3–0.4 "flies off, lingers, returns" (Lusion feel); ζ≈0.6 = snap
```
Layer presets recorded (body/skin): SPRING 30-40 / 18-22, DAMPING 5.5-7 / 3.2-3.8, PUSH 25-35 / 55-70, RADIUS 0.45-0.52 / 0.55-0.65, POINT_SIZE 4.5-5 / 6-7, POINT_ALPHA 1.0 / 0.5-0.6, EMISSIVE 1.6 / 2.6, Normal+depthWrite / Additive no-depth. Hero shipped at grid 448² (~200k/layer, ~400k sprites — flagged heavy). The founders island uses the same engine at `SPRING 52 / DAMPING 7.5` → ζ = 7.5/(2·√52) ≈ **0.52** (deliberately near-critical so faces pin crisply within 1.4 s).

WebGPU lesson (ParticleDissolve §11.2, `6ed17a6`): FBO ping-pong read in the vertex stage "scrambles" on the WebGPU backend; the fix is **compute + `instancedArray` storage buffers**, render reads `positionBuffer.element(instanceIndex)` — no sampler, no orientation bug. Backend probe: `backend.isWebGLBackend !== true && typeof gl.compute === 'function'` (WebGPU backend leaves `isWebGLBackend` undefined).

---

## 6. Lusion knowledge already in the repo

### 6.1 Stack facts (LUSION_DOSSIER.md, ANALISI_LUSION.md, ANALISI_LUSION_WORK.md)
- Astro static site, ONE 1.25 MB module `hoisted.CUO_IjfL.js` (three.js **r158**, WebGL2, `ColorManagement.enabled=false`, no WebGPU), assets on `https://lusion.dev` as custom **`.buf`** (uint32 JSON header + quantised typed arrays), no glTF/Draco/KTX2; renderer `{antialias:false, alpha:false, powerPreference:"high-performance"}`; custom post stack SMAA → Bloom (FFT convolution on desktop, 5-tap separable on mobile) → ScreenPaintDistortion → Final grade → FSR; custom virtual scroll (no Lenis/GSAP); `Settings` overridable by URL (`?SKIP_ANIMATION`, `?USE_HD`, `?DPR=1`, `?JUMP_SECTION=`); `DPR = min(1.5, dpr)`, pixel cap 2560×1440; blue-noise `LDR_RGB1_0.png` 128² loaded at boot (weight 55).
- **About page rows** (LUSION_DOSSIER §4, from the bundle): "hero particles sim `isMobile ? 128 : 192` → 128×192 = 24,576 desktop / 16,384 mobile" (`@951972`, re-found at byte 952008 in the sibling's copy); rocks `isMobile ? 48 : 64` (`@975753`); sphere LOD set l/m/s/xs skips the highest on `IS_SMALL_SCREEN`; capability lines `Line(2)`, `Line(3)` not created on mobile (`@1094894`); about assets `about/*.buf`, `terrain`, `person` loaded only on that route (not sized). **Correction vs ANALISI_LUSION.md**: the second full-screen canvas is a 2-D transition overlay, `_ld/_hd` are distance LODs, there is no click-to-enter, curly lines are pre-baked `.buf` tubes revealed by `u_showRatio`.
- Project cards (ANALISI_LUSION_WORK §2.2): still + `home_depth.webp`, **raymarched parallax 12 steps against the depth map**, `zMultiplier = domH·(0.15 + activeRatio·15)`, DOF; depth maps generatable offline with Depth-Anything (transformers.js).
- DDD footer (ParticleDissolve §1, §10, live 2026-06-09): two-layer solid "D" + additive cyan skin, momentum repulsion, ~1-2 s return, strong DOF/bokeh + bloom; intro "D" of radial fins is a different effect.

### 6.2 What the repo explicitly decided NOT to imitate (ANALISI_LUSION §4)
Sticker-bomb, rainbow palette, claymation, forced audio, 60 s preloader; keep navy + cyan→blue signal only. "The lever is direction + finishing, not inaccessible technology."

### 6.3 Cross-reference to the sibling live reverse (same session, `dossiers/lusion-live-reverse.md`) and one discrepancy
The sibling confirms from the decoded `team/edan.buf`: **8,192 points** (`vertexCount 8192`, `meshType "Points"`, SIM 128×64), quantised uint16 positions in a [-1,1]² × [0,1] box, `nShade` = packed normal + **baked shade/AO**, blue-noise surface sampling of a **photogrammetry head scan** (974 distinct x bins → not a grid), instanced `PlaneGeometry(1,1)`, two meshes cross-fading (`x = −1.5t, z = −2t, rot.y = −0.3t, rot.x = 0.4t`), `depthTest/depthWrite false`, additive `One,One`, bloom `amount 4, radius .25, threshold .8`, colour burn/dodge grade `#00f0ff`/`#005aff`, mouse unprojected 75 units along the ray as a **point light**, bottom→top reveal window per particle, `simplexNoiseDerivatives(vec4(basePos·8, u_time))·0.2` drift on hidden particles, `textures/font.png` 210×6 glyph atlas (42 chars, 5×6 px) for the rain, `letter_placements.buf`, `terrain_lines.buf` contour polylines.
**Discrepancy to resolve in synthesis:** the older local dossier's "about hero particles sim 128×192" (`isMobile?128:192` at byte ~952008) is a *different* sim than the 128×64 face sim the sibling decoded — likely the rain/letters or the terrain particles. Do not conflate; the face cloud is 8,192 points, and density on screen comes from point size (sibling §2), which agrees with our own contract 1.

---

## 7. Decision / rejection register (explicit, with the recorded reason)

| Decision | Status | Where | Why |
|---|---|---|---|
| WebGL plane "backdrop" behind DOM founder cards (reveal + neural lens + tilt) | **Rejected by owner** | `WEBGL_UPGRADE_PLAN.md §4` (marked SUPERSEDED) | "troppo timida" |
| Particle portrait morph reusing hero compute engine | Adopted | §4R | Matches hero text-particle signature |
| Weighted random sampling (tone by density) | **Rejected** | `e6b160e` | 11 % voids, 63 % duplicates, dark features starved |
| Per-pixel chroma/luma backdrop tests (`satFloor`, `lumCeil/neutralSat`, `inkGateLo/Hi`) | **Rejected twice** | `4abdabc`, HANDOFF contract 2 | Lit scalp/white shirt = wall colour → holes in the head |
| Border-seeded flood fill for the backdrop | Adopted | `4abdabc` | Spatial separation; row limit 0.62 load-bearing |
| Ink = distance-from-backdrop drives size/alpha | Adopted | `e6b160e` | Tone by size (brunoimbrizi) — **[analysis] but this is still a chromatic criterion for skin ≈ wall** (see §8) |
| Luminance z-relief / centre bulge as "3-D bust" | **Effectively disabled** (`Z_RELIEF_MAX_FRAC 0.04`, `centerZBias 0`) | `FounderPortraitMorph.tsx:210-238` | Regular grid + perspective = lateral separation of neighbours across luminance edges ("comb tearing"); "bought almost nothing" |
| Depth test/write on portrait discs | **Off** | build params | Overlapping discs at slightly different z mottle/tear edges |
| Additive soft mote for faces | **Rejected** | `69e49a6`, render `smoothstep(0.5,0.34)` | Averages overlapping photographic discs into mush |
| Portrait ink floors (`0.32 size / 0.35 alpha`) | **Rejected** | `60075f4` | ~20k backdrop particles drawn; fringe ghost |
| Wide squared alpha knee `smoothstep(0.03,0.35)²` | **Rejected** | `4abdabc` | Dims the mid band where facial detail lives |
| Padding to a fixed count / random subsample | **Forbidden** | contract 1, 11 | Duplicates/clumping; use integer stride |
| `.toAttribute()` for per-target colour/ink | **Rejected** | `1083d42` | 10/8 vertex buffers → pipeline rejected; use vec4 `.element()` |
| Colour blend in the fragment stage | **Rejected** | HANDOFF contract 8 | Per-pixel storage read |
| Overlapping morph legs (hero's 0.95) | **Rejected for faces** | contract 10 | Chained blend cuts the A→C corner, skips B |
| Global camera moves for the "camera feel" | **Forbidden** | §4R, `plans/2026-07-23-wow-wave.md:15` | SignatureLine is the single camera authority; islands are camera-locked billboards |
| ScrollTrigger `pin:` | **Forbidden** | WEBGL_UPGRADE_PLAN §3 | pin-spacer breaks `[data-line-anchor]` measures |
| Violet anywhere | **Forbidden** (permanent directive) | §0, `172a308` de-violet sweep | Brand: cyan `#3BE1FF` → blue `#2A7FFF` |
| FBO ping-pong GPGPU on WebGPU | **Rejected** | ParticleDissolve §11.2, `6ed17a6` | Vertex-stage RT read scrambles; use compute + storage |
| Morph on non-WebGPU / lite / RM / coarse | Off → DOM fallback | §4R, `SERSAN_PRIOR_ART.md:16` | Compute mandatory; DOM must stay complete |
| Morph on phones | "Deliberate NO" (`MOBILE_HOME_SPEC.md:352-353,509`) → **reversed as stretch** in Phase 4d (touch scrub island, `RAIL_ISLANDS_TOUCH`) | `plans/2026-08-17-mobile-parity.md` row 10 | Lusion keeps WebGL on phones; gate by measurement, not veto |
| Depth-of-field on the hero/portrait | **Deferred, never shipped** | ParticleDissolve §5 "DOF locale all'hero", memory `webgl-batch-pending-desktop-qa` | Global DOF would blur text/line; needs TSL texture pass |
| Kawase DoF on work rail, dual-texture blueprint lens | **Deferred** | same memory | Needs TSL `texture()/textureSize` |
| `NeuralLattice` N-hub constellation around founders | Follow-up (B), never done | WEBGL_UPGRADE_PLAN §6 | — |
| Re-encode portraits < 300 KB vertical | Done (1200×1800 webp, 48-177 KB) | memory 2026-07-09 | — |
| Real 3-D head data (scan / depth estimation / SMPL-style fit) | **Never evaluated** | — | Absent from every doc |
| Glyph rain / contour lines background | **Never evaluated** | grep of `*.md`, `docs/`, `plans/` → 0 hits | — |
| 5th team member | **Impossible** without kernel re-architecture | HANDOFF "Quarto target" | compute 8/8 storage |

Open items still listed as open in HANDOFF: Mattia's SHIPS WITH chips; residual wall halo (12.1 % of kept cells are wall/shirt; 4,446 cells in Alessandro's shoulder band — proposed: second flood-fill pass at wider tolerance seeded only from already-background cells, or morphological dilation of `bgMask`, never a colour threshold); mobile never verified; Alberto real headshot + re-measure; A5/A8 in backlog.

---

## 8. Why the owner's screenshot looks the way it does — mapped to the as-built code **[analysis, grounded in the cited lines]**

1. **Empty patches on bald scalp / forehead / cheeks / around glasses.** `ink` is `pow(clamp((dist·1.7 − 0.03)/0.97), 0.62)` where `dist` is the luma-weighted RGB distance from the top-corner wall median (`sampleImagePoints.ts` "Ink" block). Skin highlights on a white-wall studio shot sit at `dist ≲ 0.02-0.05` → ink 0-0.2 → disc `0.06 + 0.94·ink` ≈ 6-25 % of `2.1·spacing`, i.e. **sub-pixel**, then `cov²` and `smoothstep(0,0.1,ink)` push alpha to ~0 and `Discard(alpha < 0.02)` removes them. The flood fill (contract 2) only prevents those cells from being *masked as wall*; it does not give them ink. The HANDOFF's own acceptance criterion ("the face must be well defined; the shirt is expendable") was judged on the pre-N=4 desktop build and the "alone di muro" item shows the team was still fighting the *opposite* residual. So the *mask* is spatial, but the *tone* is still chromatic — the same failure class, one layer down.
2. **"Flat dithered/halftone photo" look.** One particle per regular cell + `JITTER 0.9` + size-by-ink + `depthTest:false` + relief 4 % + normal blending + emissive 1.18 is literally a jittered halftone of a photograph. Nothing in the pipeline has a normal, a light, or real depth. Lusion's cloud has per-point normals + baked AO and is lit by a moving point light (sibling §3) — that is what "volumetric / 3-D scan / rim glow" is.
3. **Why relief could not be turned up**: the docs measured that on a *regular grid* any z ≠ 0 across a luminance edge separates neighbours laterally under perspective (`Z_RELIEF_MAX_FRAC` comment). This is a property of "z from luminance on a 2-D grid", not of 3-D point clouds in general: a surface-sampled head (blue-noise on a mesh, as Lusion and the repo's own `MeshSurfaceSampler` hero path do) has coherent z and no such comb.
4. **"Slowly moving" life exists but is group-level only** (`REST_SWAY_*`, `REST_BREATH`) because per-particle motion at rest would erode the pixel-pinned silhouette that a 2-D sample depends on. With a true surface + normals, per-particle drift along the normal (Lusion: `simplexNoiseDerivatives·0.2` on hidden particles, skin layer ζ≈0.35 in ParticleDissolve §5) is safe.

Everything the repo built (compute kernel, chained 4-target morph, vec4 tint packing, stagger, coverage compensation, gate, DOM fallback, touch scrub) is engine work that survives a change of **input data** from "photo grid" to "surface-sampled 3-D head with normals + AO"; the sampler (`sampleImagePoints.ts`) and the ink/size/alpha chain are the parts that a Lusion-grade result would replace or augment. Binding budget note for that path: a per-particle normal/AO buffer is one more storage binding in the render (4/8 used) but the compute kernel is at 8/8 — normals should be render-only (not consumed by the kernel) or packed into the existing tint vec4 (ink already occupies `.w`).

---

## 9. Concrete numbers table (for quick lookup)

| Quantity | Value | Source |
|---|---|---|
| Sampler grid | 290 × 405 (117,450 cells) | `FounderPortraitMorph.tsx:206-207` |
| Shared cells N=2 / N=3 | 42,087 / 51,751 (stride 1) | commit `e6b160e`, `MAX_COUNT_BY_TIER` comment |
| Ceilings | full 60,000 · lite 20,000 · touch grid × 0.58 (≈168×235 → ~17.4k est.) | `:131-193` |
| Per-portrait own-ink cells | Mattia 38,387 · Alessandro 38,555 · Michele 38,833 | HANDOFF contract 12 |
| Frame timing at 51,751 | median 144.9 fps, p95 7.3 ms | `MAX_COUNT_BY_TIER` comment |
| Backdrop probe / fill | 14 px corners median · `BG_FILL_TOL 0.055` · row limit 0.62 | `sampleImagePoints.ts` |
| Ink curve | gain 1.7 · floor 0.03 · gamma 0.62 · fade 0.62 + 0.32 · inkCut 0.03 · extentInk 0.15 | `SAMPLE_SPEC_BASE` |
| Disc | size `0.06 + 0.94·ink` × (0.85+0.3·rand) · diameter `2.1·spacing` at full ink ≈ 8.4 devpx at dpr 2 · edge `smoothstep(0.5,0.34)` | gpgpuNodeSim, `065104c` |
| Alpha | `edge · smoothstep(0,0.1,ink) · cov²`, `cov = diam / max(1.25 px, 0.35·spacing)`, discard < 0.02 | gpgpuNodeSim ~1900-1950 |
| Spring | SPRING 52 · DAMPING 7.5 (ζ≈0.52) · MAX_SPEED 16 · TURB 9 | build params |
| Morph | 1.4 s per leg · stagger delay `hash·0.55`, window 0.45 · entry 1.8 s | constants |
| Group flight | spread 1.1 · orbit 0.7 rad · dolly 2.2 · parallax 0.18 rad · × sin(gπ) | constants |
| Rest life | yaw 0.02 rad @0.11 rad/s · pitch 0.012 @0.07 · breath 0.004 @0.5 | constants |
| Emissive / travel tint | 1.18 / `[0.16, 2.4, 3.0]` (bloom > 1.0) | constants |
| Relief cap | 4 % of face height; depth 90 grid-px before cap; bulge 0 | constants |
| WebGPU budgets | 8 vertex buffers (4 used) · 8 storage in vertex (4 used) · compute 8/8 | HANDOFF contract 7 |
| Morph viewport gate | `(min-width:1024px) and (min-height:780px)` + tier full + true WebGPU | founders-rail `roomy`, memory 2026-07-23 |
| Lusion head (sibling) | 8,192 pts, SIM 128×64, additive, bloom 4/.25/.8, point light from mouse at 75 u | `lusion-live-reverse.md` |
| Lusion about sims (older dossier) | `isMobile?128:192` sim (24,576 / 16,384), rocks 64/48 | `LUSION_DOSSIER.md §4` (@951972, @975753) |
| Assets | `public/founders/{alessandro,michele,mattia}-headshot.webp` 177/113/48 KB; `alberto-headshot.webp` 15.7 KB **placeholder** | `ls public/founders` |

---

## 10. Gaps the prior research leaves for the new direction

1. No pipeline or evaluation for obtaining a **3-D head** per founder (photogrammetry, monocular depth/normal estimation from the existing 1200×1800 headshots, or a scanned mesh) and surface-sampling it (the repo already has `MeshSurfaceSampler` + front-bias code in `src/webgl/geometry/sersanMark.ts` for the mark).
2. No per-point **normal / AO / rim-light** shading anywhere in the portrait path; the hero spore path has velocity-colour only.
3. No **matrix glyph rain** or **contour-line** system; the closest existing primitives are `DriftParticles`, `NeuralLattice`, the signature line (curl-noise ideas in ANALISI_LUSION §3.2), and the SVG boil filter.
4. **DoF/bokeh** repeatedly recommended (ParticleDissolve §5, ANALISI_LUSION §3.6, MisterPrada BokehPass values) and never shipped on WebGPU (needs a TSL pass; `PostFXNodes` bloom contract is emissive > 1.0 with `toneMapped:false`).
5. Mobile morph never measured on a device; `lite 20000` and `TOUCH_GRID_SCALE 0.58` are estimates.
6. `.refs` clones cited by `e6b160e` (brunoimbrizi, thebeautyofcoding) are gone from disk; `.refs` exists only in the stale `~/sersan`.

# Dossier `local-island` — FounderPortraitMorph: the shipped particle-portrait pipeline, end to end

Sources read in full (repo `C:/Users/alber/Desktop/Sersan`, branch `main`, HEAD `91704ee`):

- `src/webgl/FounderPortraitMorph.tsx` (1,277 lines) — the island
- `src/webgl/image/sampleImagePoints.ts` (469 lines) — the sampler (`samplePortraitSet`)
- `src/webgl/gpgpu/gpgpuNodeSim.ts` (2,260 lines; portrait path = `createTextMorphComputeBuild`, lines 1151–2003, plus `unifiedForceStep` 245–330)
- `src/webgl/store/foundersMorphStore.ts` (327 lines), `src/webgl/store/founderMotion.ts` (66 lines)
- `src/webgl/renderer/createRenderer.ts` (`webgpuEnabled`, `backendOf`), `src/webgl/Scene.tsx` (mount gate, lines 445–467), `src/webgl/constants.ts`, `src/webgl/store/tierStore.ts`
- `src/components/sections/founders-rail.tsx` (DOM writer: modes doc 40–80, `canMorph` 726–735, stage JSX 2295–2360)
- `HANDOFF_FOUNDER_MORPH.md` (294 lines, the "bible": 12 contracts + 4th-target notes)
- `public/founders/*.webp` (8 files, all 1200×1800 RGB) and `src/data/founders.ts`
- Offline measurement: I ported `readGrid()` to Python (`scratchpad/inkport/ink_port.py`) and ran it on the four shipped headshots — numbers in §9.

---

## 0. One-paragraph verdict for the synthesis agent

The founders "3D head" is NOT a 3D head. It is a **2.5D billboard-sprite halftone**: one particle per cell of a regular 290×405 grid laid over a centre-cropped 2D headshot, `z = (luma − 0.5) · 90 grid-px` then **capped to 4 % of the face height** (`Z_RELIEF_MAX_FRAC = 0.04`, effectively flat), rendered as camera-facing quads with **depthTest/depthWrite OFF**, NormalBlending, no lighting, no normals. Tone is carried by **disc size ∝ `ink`**, where `ink` = luma-weighted colour distance from the *white studio wall*. On a white-backdrop headshot that is an **inverted-luminance halftone**: bright skin (scalp, forehead, cheek highlights, around the glasses) sits close to the wall colour → low ink → discs shrink below the lattice pitch → the navy page shows through → "empty patches". My port of the sampler puts **20.0 % of Michele's face cells and 15.2 % of Alessandro's below the pitch** (disc diameter < grid spacing), concentrated in the scalp/forehead rows (Michele rows 80–119: 43–59 % sub-pitch). This is a property of the model, not a bug in it; the code comments say the flood-fill "fixed the holes", but it only fixed the *masking* holes (cells removed), not the *tonal* holes (cells kept but rendered at ~0.4× diameter). To reach the Lusion "volumetric point-cloud head, rim-lit, slowly moving" look, the representation has to change (real per-particle depth/normals or a scanned point cloud), not the knobs. §10 lists exactly where that plugs in and what the engine already supports.

---

## 1. Gating: where the island mounts and what backend it needs

| Layer | Condition | Source |
|---|---|---|
| Scene mount | `pathname === "/" && webgpu && (tier === "full" \|\| railIslandsTouch)` → `<FounderPortraitMorph touch={tier !== "full" && railIslandsTouch} />` | `Scene.tsx:465-467` |
| Build-time flag | `webgpuEnabled()` = `process.env.NEXT_PUBLIC_WEBGPU` truthy | `createRenderer.ts:50-53` |
| Runtime backend | `backendOf(gl) === "webgpu"` ⇔ `backend.isWebGLBackend !== true && typeof gl.compute === "function"` | `createRenderer.ts:196-211` |
| Island load effect | `if (!webgpuEnabled() \|\| backendOf(gl) !== "webgpu") return;` (does not even fetch the headshots on WebGL2) | `FounderPortraitMorph.tsx:487` |
| Island build | `if (backendOf(gl) !== "webgpu") return;` | `:538` |
| DOM writer `canMorph` | `detected && mode==="pinned" && roomy && tierResolved && tier==="full" && backend==="webgpu" && !morphFailed` | `founders-rail.tsx:726-735` |
| Tier `full` | fine pointer AND `innerWidth ≥ 768` (`tierStore.ts:218-219`); level 3 budget = `postFx:"full", particleScale:1` | `tierStore.ts:352-361` |
| Touch island | tier `lite` + `fxBudget.level ≥ 2` + true WebGPU, behind `RAIL_ISLANDS_TOUCH` (`src/lib/spine.ts`) | `Scene.tsx:295-302` |
| Reduced motion | never reaches the island: founders-rail only pins the store on the non-reduced pinned-desktop path; `prefers-reduced-motion` → NATIVE mode (mode 3) | `founders-rail.tsx:70, 815` |

**WebGL2 fallback: there is NONE for the morph.** The engine is TSL compute + storage buffers; `.element(instanceIndex)` reads no-op under three's WebGL2 emulation (three #31221, cited at `gpgpuNodeSim.ts:19-21`). On a flag-on WebGL2 session the DOM shows the static `<img>` posters (`[data-founder-media]`, opacity cross-fade) after a 4 s "poster grace" (`founders-rail.tsx:1146-1157`), and on pinned-but-not-eligible desktop it falls back to the horizontal DOM rail (mode 2). The island publishes `store.active = true` only after a real build (`:832`), and the DOM hides the posters only then.

Renderer facts that matter for any redesign: Canvas `antialias: false` (`Scene.tsx:372`), `camera fov 50 at z = 12` (`constants.ts`: `CAMERA_Z = 12`, `WORLD_VIEW_HEIGHT = 2·tan(25°)·12 ≈ 11.19`), material `toneMapped = false`, selective bloom by luminance threshold `1.0` (`fxStore.ts:280`; `routeFxStore.ts:64/87` has 1.0 and a 0.92 route override) so only HDR (>1) colours bloom — at rest the faces (emissive 1.18 × linear rgb ≤ 1) stay under threshold by design.

---

## 2. Asset loading

`loadFounder(idx)` (`:365-380`): for `founders[idx].anchor` tries `/founders/<anchor>-headshot.{webp,jpg,png}` in order (`HEADSHOT_EXTS`), falling back to `founders[idx].image` (the DOM poster). Loading uses a bare `new Image()` with `decoding = "async"` (native lazy-load never fires inside a sticky/transform frame, `:348-357`). All `TARGET_COUNT = MORPH_MAX + 1 = 4` images are loaded with `Promise.all` — **all-or-nothing**: one rejected promise or one `readGrid` returning null blanks the whole set (the DOM writer's `morphFailed` latch exists for this, `founders-rail.tsx:682-700`).

Shipped assets (`public/founders/`, all **1200×1800 RGB webp**): `alessandro-headshot` (177 KB), `michele-headshot` (113 KB), `mattia-headshot` (48 KB, torso washed to white per HANDOFF contract 12), `alberto-headshot` (15.7 KB — **PLACEHOLDER monogram card**, md5 identical to `alberto-tuveri.webp`). Framing contract from HANDOFF: skull ≈ 559 px wide, top of head ≈ y 306, uniform light backdrop in the top corners.

The two-image split matters: `<anchor>-headshot.webp` is consumed **only** by the sampler; `founders[].image` (`<name>.webp`) is the DOM poster/a11y image. Any depth map / point cloud asset would follow the same naming discovery.

---

## 3. Sampler: `samplePortraitSet(images, spec)` (`sampleImagePoints.ts`)

Called once, after all images decode (`:502`): `setRef.current = mod.samplePortraitSet(imgs, sampleSpec())`. Fully deterministic (no RNG; jitter is a hash of the cell index).

### 3.1 `readGrid(image, spec)` — one image → full-grid arrays
1. Cover-crop the source to the grid aspect (290/405 = 0.716 vs 1200/1800 = 0.667 → crops **height**: cropH = 1200/0.716 = 1676 px, centred, i.e. 62 px off top and bottom), `drawImage` into a 290×405 canvas, `getImageData`.
2. Per cell: `r,g,b` in 0..1 (sRGB), `lum = 0.299r + 0.587g + 0.114b`.
3. Backdrop colour = per-channel **median of two 14×14 top-corner patches** (`CORNER_PATCH = 14`; top corners only because shoulders reach the bottom ones).
4. `dist[i] = sqrt(0.299·dr² + 0.587·dg² + 0.114·db²)` — luma-weighted RGB distance from the backdrop.
5. **Backdrop mask = border-seeded flood fill**, seeds: whole top row + left/right columns above `rowLimit = floor(405·0.62) = 251`; admit if `dist < BG_FILL_TOL = 0.055`; 4-neighbour, explicit stack, may never step below `rowLimit`. Comment (`:269-285`): "a lit bald scalp and a white shirt are chromatically THE SAME as a white studio wall … Colour cannot separate them; POSITION can" and the row limit is "LOAD-BEARING" (white shirt vs white wall is separated only by a soft shoulder shadow).
6. Ink, per row `y` with `ny = y/405`: `f = clamp(1 − (ny − fadeStart)/fadeSpan)`, `fade = smoothstep(f)`; skip masked cells; `v = clamp((dist·inkGain − inkFloor)/(1 − inkFloor), 0, 1)`; **`ink = v^inkGamma · fade`**.

### 3.2 Union cell list + stride
`hits = { i : max_k ink_k[i] > inkCut }` over all portraits (UNION, monotone in image count). `stride = sharedCells > maxCount ? ceil(sharedCells/maxCount) : 1`; `count = ceil(sharedCells/stride)`; `cells[j] = hits[j·stride]` (uniform scan-order stride — an **integer cliff**: one cell over the ceiling halves every face; comments at `:196-205`, HANDOFF contract 11).

### 3.3 `emit(read, cells, spec)` — per-particle arrays (index `j` = same cell in every image)
- `xy[j] = (gx + 0.5 + jx − 145, −(gy + 0.5 + jy − 202.5))` grid-px, y-up, jitter `jx,jy = (hash01(i·12.9898|78.233) − 0.5)·JITTER(0.9)` cells.
- `rgb[j]` = per-channel `srgbToLinear` (exact three curve) — mandatory because the material is `toneMapped:false`.
- **`z[j] = (lum − 0.5)·depth + max(0, 1 − rad/BULGE_RADIUS)·centerZBias`**, with `depth = 90` grid-px, `centerZBias = 0` (disabled), `FACE_CY = 0.44`, `BULGE_RADIUS = 0.75`. So z is *luminance relief only*, in grid px, before the island caps it (§5).
- `ink[j]`, and `halfExtentX/Y` = 99th-percentile |x|,|y| over cells with `ink > extentInk (0.15)`.

### 3.4 Sampler knobs (`SAMPLE_SPEC_BASE`, `FounderPortraitMorph.tsx:231-251`) and the file's rationale

| Knob | Default | Why (verbatim gist from the file) |
|---|---|---|
| `gridW × gridH` | **290 × 405** | "5:7 portrait. Measured on the two shipped headshots: 290×405 → 42,087 shared cells at stride 1" ; retarget with `scale = sqrt(wanted/measured)` |
| `depth` | 90 grid-px | "luminance relief front-to-back (capped in toWorld)" |
| `centerZBias` | 0 | "DISABLED … produced a visible rounded bulge artifact around the chin/face centre, and it compounds the edge-tearing" |
| `inkGain` | 1.7 | "contrast gain on the backdrop distance"; every low-end gate ever tried here (`lumCeil/neutralSat`, `inkGateLo/Hi`) "deleted the lit scalp" — "do not reintroduce one" |
| `inkFloor` | 0.03 | "below this the cell is sensor noise → ink 0" |
| `inkGamma` | 0.62 | "<1 keeps mid-tones (cheeks, shirt folds) present" |
| `fadeStart / fadeSpan` | 0.62 / 0.32 | "the bust dissolves into darkness below this normalized y"; tuned for white-shirt subjects (HANDOFF c.12); shared across portraits — a per-portrait value "would break the shared-grid invariant" |
| `inkCut` | 0.03 | "union ink above which a cell joins the shared list" |
| `extentInk` | 0.15 | "only real ink counts toward the measured face extent" |
| `maxCount` | tier ceiling (§4) | uniform stride if exceeded |
| `TOUCH_GRID_SCALE` | 0.58 | touch island: grid 168×235 so the union lands ≈ 17.4k < 20,000 at stride 1 (estimate; "NOT MEASURED IN-BROWSER YET") |
| `BG_FILL_TOL` | 0.055 | flood-fill tolerance; "wide enough to walk the wall's own vignetting … far too tight to step across the shoulder shadow or a hairline" |
| `BG_FILL_ROW_LIMIT` | 0.62 | fill may not travel below this (shirt leak) |
| `CORNER_PATCH` | 14 px | backdrop probe patch |
| `JITTER` | 0.9 cell | "breaks the grid without blurring" |

Live: `__sersanFounderMorph.resample({ inkGain, inkFloor, inkGamma, fadeStart, fadeSpan, inkCut, gridW, gridH })` re-runs the set sampler and rebuilds in place preserving the morph position (`:838-848`).

---

## 4. Count ceilings — `MAX_COUNT_BY_TIER` (`:131-188`)

```ts
const MAX_COUNT_BY_TIER = { full: 60000, lite: 20000 };
```
- Measured in-browser at N=3 (Alessandro, Michele, Mattia): **sharedCells 51,751 · stride 1 · count 51,751**; frame timing at that count "median 144.9 fps, p95 7.3 ms — no performance concern here, the count is not what to economise on".
- Per-portrait own-ink cells (offline port): Mattia 38,387 · Alessandro 38,555 · Michele 38,833; mean ink 0.550 (at inkCut 0.03).
- WHY 60,000: "a PERF GUARD, not a target … at the previous 52,000 the margin was 249 cells — 0.5 %"; WHY NOT HIGHER: `count` feeds `spacingDev = sqrt(areaDev/count)` → `defPointSize` and `PORTRAIT_COV_MIN_PX`, so an unbounded count shrinks every disc.
- TODO in file: N=4 union not re-measured (Alberto is a placeholder); expected 57–62k. **My port (§9) gives 51,570 for the 4-image union** — the monogram placeholder adds almost nothing (its own ink cells 31,460 mostly overlap). A real 4th head will grow it.
- The count is NOT a budget: "THE INSTANCE COUNT FOLLOWS THE SAMPLER (cells found, strided down to the tier ceiling); it is never a fixed budget padded with duplicates" (`:29-30`).

---

## 5. Build (`buildNowRef.current(preserveState)`, `:523-833`) — grid-px → world, z model, point size, engine call

### 5.1 Stage rect
Pinned: `[data-founder-stage]` inside `[data-founders-morph-sticky]` — DOM box `aspect-[3/4] w-full max-w-[26rem]` (`founders-rail.tsx:2327`), i.e. up to **416 × 555 CSS px**. Touch: the focused card's media area (article minus tallest `[data-founder-copy]`). Measured only on `measureVersion` bumps (island rule, no rect reads in the frame loop).

### 5.2 World-scale fit (`:629-635`)
```
worldPerPx  = WORLD_VIEW_HEIGHT / size.height
halfX/halfY = max over portraits of halfExtentX/Y          // X-bound with all shipped heads: Alessandro 136.50
scaleX = stageW·worldPerPx·STAGE_FILL / (2·halfX);  scaleY likewise;  worldPerGrid = min(scaleX, scaleY)
```
`STAGE_FILL = 0.92`. Expected halfExtent ≈ [[136,134],[129,137],[136,135]]; "investigate only if max(halfExtentX) > 143".

### 5.3 z / depth model (`setDepth`) — THE flatness decision (`:210-221, 639-658`)
```
maxAbsZ  = max |p.z[i]| over all portraits & particles           // sampler z in grid-px (≈ 45 at depth 90)
zNorm    = min(1, Z_RELIEF_MAX_FRAC · (2·halfY) / maxAbsZ)        // Z_RELIEF_MAX_FRAC = 0.04
zFactor  = worldPerGrid · zNorm · depthScaleRef.current          // depthScaleRef = 1, live: setDepth(v)
world.z  = s.z[i] · zFactor
```
With face height 2·135 = 270 grid px, max relief = 0.04·270 = **10.8 grid px front-to-back (≈ ±5.4)**, i.e. ~4 % of the face height ≈ **~22 CSS px of total depth on a 555 px stage**. File rationale: "Kept DELIBERATELY tiny (0.04) — the resting cloud is effectively flat. WHY: … adjacent cells that straddle a luminance edge (hairline, beard edge, glasses rim) receive very different z. Under perspective those neighbours separate LATERALLY, which shreds every luminance edge into a vertical comb … Verified live via `__sersanFounderMorph.setDepth()`: 0 = clean, 0.3 = visible tearing, 1 = severe comb." The `hz` extent is exported for `bbox()`.

→ Consequence: **there is no 3D head to light or rotate.** The mid-flight orbit (`ORBIT_MAX = 0.7 rad`) rotates a flat plate of discs; at the locked stages the group is exactly camera-facing (envelope 0) and only a 0.02 rad sway remains.

### 5.4 Seeds (`:680-706`)
Fresh build: scatter around homeA at radius `(0.5 + rand·1.3) · stageWorldH · 0.55`, y ×0.85, z ±0.5·stageWorldH. Rebuild after the entry (`keepEntry`): seed = nearest locked home (`Math.round(morph)`), `uAssemble = 1`.

### 5.5 Point size (`:715-728`)
```
dpr        = min(devicePixelRatio, 2)
areaDev    = stageW·dpr · stageH·dpr · 0.92²
spacingDev = sqrt(areaDev / count)             // lattice pitch in device px
discDev    = spacingDev · 2.1                  // full-ink disc diameter
defPointSize = clamp(discDev · CAMERA_Z / (dpr · 1.05), 10, 96)
pointSize  = pointSizeRef.current ?? defPointSize   // live: setPointSize(v)
```
Worked example (416×555 stage, count 51,751): dpr 1 → spacingDev **1.94 px**, discDev 4.08, pointSize ≈ 46.6; dpr 2 → spacing 3.89, disc 8.16, pointSize ≈ 46.6 (identical by construction). The engine's vertex stage then makes the quad `sizeNode = pointSize·dpr·(0.06 + 0.94·ink)·(0.85 + 0.3·rand)/dist` device px wide (`gpgpuNodeSim.ts:1775-1783`; `dist = 12` at rest) → a full-ink disc ≈ 3.9 px (dpr 1) / 7.8 px (dpr 2) ≈ **2× the pitch**, so full-ink neighbours overlap into continuous tone; **a disc falls below the pitch when `ink < 0.443`** (`(0.06 + 0.94·ink)·2.1 < 1`).

### 5.6 Engine call (`:730-787`)
```ts
mod.createTextMorphComputeBuild(gl, webgpu, tsl, homeA, homeB, homeC, homeD, count,
  { SPRING: 52, DAMPING: 7.5, MAX_SPEED: 16, TURB: 9, POINT_SIZE: pointSize, POINT_ALPHA: 1.0,
    EMISSIVE: 1, COL_COLD: [1,1,1], COL_HOT: [0.4,1,1] },          // last three unused on the portrait path
  seed,
  { colorsA..D: pts[k].rgb, sizeA..D: pts[k].ink, blending: "normal",
    depthTest: false, depthWrite: false, emissive: emissiveRef.current /*1.18*/,
    travelTint: [0.16, 2.4, 3.0] /* HDR cyan → bloom */, spacingDev })
```
Then `uFade = 0`, `uSizeComp/2/3 = 1` ("PINNED AT 1, NEVER ANIMATED" — the coverage varying omits `sizeFD` and is exact only while these are 1), `uPointSize = pointSize`, `uAssemble` and `applyMorph` per the preserve rules. Old build disposed one rAF later; `store.setActive(true)`.

---

## 6. The engine (`createTextMorphComputeBuild`) — buffers, kernel, render

### 6.1 Storage buffers (compute kernel binds **8 of 8** `maxStorageBuffersPerShaderStage`)
`position` (seeded from `seed`), `velocity` (zero), `homeA..homeD` (vec3 world, z included), `start` (scatter), `delay` (normalised home-A x, left→right assemble wave). Render-only: `tintA..tintD` = packed `[r,g,b,ink]` vec4 read via `.element(instanceIndex)` in the vertex stage (**4 of 8** vertex-stage storage bindings; vertex buffers **4 of 8**: quad `position`, `positionBuffer/velocityBuffer/delayBuffer.toAttribute()`). Binding-budget table at `gpgpuNodeSim.ts:1667-1693`; HANDOFF contract 7 records the 10-of-8 failure that shipped an invisible 3-target build. **A 5th home target is impossible without repacking the kernel; 4 more vertex-stage storage bindings ARE still free** (relevant for normals/depth per target, §10).

### 6.2 Compute kernel (`simulate`, `:1352-1439`), per particle per frame
```
r  = hash(instanceIndex)
m1 = clamp((uMorph  − r·0.55)/0.45, 0, 1);  m2, m3 likewise from uMorph2/uMorph3   // staggered wave
target = mix(hA, hB, smoothstep(m1)); target = mix(target, hC, ss(m2)); target = mix(target, hD, ss(m3))
target += jdir · uSpread                          // jdir = hash-stable unit-ish vector, z ×0.5
aw = clamp((uAssemble·1.45 − delay)/0.45, 0, 1); target = mix(start, target, ss(aw))
transit = max(4m1(1−m1), 4m2(1−m2), 4m3(1−m3), 4aw(1−aw))      // 0 at rest, 1 mid-leg
turb = (sin(7y + 2.1t + 6.28r), sin(8x + 1.7t + 4.1r), 0.4·sin(5x + 5y + 1.3t))
acc  = (target − pos)·SPRING + turb·TURB·transit
vel += acc·dt;  vel *= exp(−DAMPING·dt);  |vel| ≤ MAX_SPEED;  pos += vel·dt
```
(`unifiedForceStep`, `:290-330`.) Determinism contract: the anchor is analytic in the uniforms, the spring only relaxes the offset, so any scrub state/rebuild is legal. At rest (`transit = 0`, `uSpread = 0`) every particle is pinned to its exact sampled cell — "the faces read crisply" — which is also why the rest state looks like a static dithered photo.

### 6.3 Vertex stage (`:1702-1794`)
Billboard quad (`QUAD_CORNERS ±0.5`), `clip.xy += corner·sizeNode/uViewport·2·clip.w` → quad width = `sizeNode` device px. `sizeNode` as in §5.5. Colour resolved in the vertex stage (`portraitColorExpr`, `:1854-1872`):
```
base = mix(mix(mix(tintA.rgb, tintB.rgb, m1'), tintC.rgb, m2'), tintD.rgb, m3')   // m' = same stagger as the kernel
base = mix(base, travelTint(0.16, 2.4, 3.0), clamp(|vel|·0.16, 0, 1))              // PORTRAIT_TRAVEL_K = 0.16
color = base · uEmissive                                                            // 1.18 default
```
Varyings: `vInkF` (blended ink), `vSizePxF` (diameter before perspective divide), `vPortraitDistF` (view-space distance), `vPortraitColorF`, `vAssembleF`, `vSpeedF`, `vRandF`, `vQuadUv`.

### 6.4 Fragment (`:1875-1955`)
```
a = smoothstep(0.5, 0.34, |uv|)                 // crisper disc edge than the hero's 0.5→0.12
alpha = a · POINT_ALPHA(1) · uFade · vAssembleF
alpha *= smoothstep(0.0, 0.1, ink)              // tonal knee: exactly 0 at ink 0, 1 for ink ≥ 0.1
cov = clamp((vSizePxF / vPortraitDistF) / covPx, 0, 1);  alpha *= cov²    // covPx = max(1.25, 0.35·spacingDev)
Discard(alpha < 0.02)
```
Material: `MeshBasicNodeMaterial`, `transparent`, **`depthTest = false`, `depthWrite = false`, `NormalBlending`** (portrait defaults, overridable via `PortraitMorphOpts.blending/depthTest/depthWrite`), `toneMapped = false`, `DoubleSide`. Engine constants: `PORTRAIT_SIZE_MIN = 0.06`, `PORTRAIT_SIZE_INK = 0.94`, `PORTRAIT_COV_MIN_PX = max(1.25, 0.35·spacingDev)`, `PORTRAIT_TRAVEL_K = 0.16`, `ASSEMBLE_WINDOW = 0.45`.

Why depth is OFF (file, `:1091-1097` and island `:773-778`): "one particle per cell → nothing to occlude; depth-testing overlapping discs at slightly different z mottles/tears luminance edges instead of reading as relief (the reference implementation, `.refs/interactive-particles Particles.js`, likewise sets depthTest:false)". Note: `.refs/` is **not present** in the repo checkout (`ls .refs` fails); the reference is brunoimbrizi/interactive-particles (Codrops 2019), whose tonal rule `psize *= max(grey, 0.2)` this pipeline inverted for a light backdrop.

---

## 7. Clocks, uniforms and per-frame state (`useFrame`, `:887-1086`)

| Uniform / ref | Writer | Default | Meaning |
|---|---|---|---|
| `morphRef` (progress 0..`MORPH_MAX`=3) | one-shot clock toward `store.morphTarget` at `delta / MORPH_DURATION` (1.4 s per leg), clamped **toward the target** (HANDOFF c.9); or dev override; or touch `store.scrub` | 0 | one unit = one leg |
| `uMorph/uMorph2/uMorph3` | `applyMorph(b, p)`: `clamp(p)`, `clamp(p−1)`, `clamp(p−2)` — the ONLY writer | 0 | chained legs; "uMorph reaches EXACTLY 1.0 before uMorph2 leaves 0" |
| `uSpread` | `sin(legFract(p)·π) · SPREAD_MAX` | `SPREAD_MAX = 1.1` world | diffuse-cloud radius mid-leg, 0 at every locked stage |
| `uAssemble` | `entryRef += delta / ENTRY_DURATION` once `store.reveal ≥ 1` | 0 → 1 over `ENTRY_DURATION = 1.8 s` | particles fly in from the scatter seed, left→right wave |
| `uFade` | `damp(fade, edge, 8, dt)`, edge ramp = 28 % of viewport height; 0 while off-screen (`CULL_PAD = 120` px, also skips the compute dispatch) | 0 | in-view cross-fade |
| `uEmissive` | `emissiveRef` (`DEFAULT_EMISSIVE = 1.18`, "task: ~1.0–1.3"), live `setEmissive` | 1.18 | colour multiplier |
| `uPointSize` | `pointSizeRef ?? defPointSize`, live `setPointSize` | ≈46.6 | see §5.5 |
| `uPixelRatio`, `uViewport` | per frame from `gl.getPixelRatio()` (≤2) and `size` | — | |
| `uSizeComp/2/3` | pinned 1 | 1 | never animate (coverage exactness) |
| `uHole*` | never written by portraits | off | hero-only flyby |
| group `position` | camera-relative: `((cx − vw/2)·k, (ih/2 − cy)·k, −(CAMERA_Z − dolly))` rotated by `camera.quaternion` + `camera.position`; `k = WORLD_VIEW_HEIGHT/ih` | — | camera-locked over the stage rect; camera itself never touched (SignatureLine is the camera authority) |
| group yaw/pitch | `env·(ORBIT_MAX 0.7 + (mouse.x−0.5)·PARALLAX_MAX 0.18) + (1−env)·sin(0.11t)·0.02`; pitch `env·(0.5−mouse.y)·0.108 + (1−env)·sin(0.07t)·0.012`; both `damp(…, 6, dt)` | — | orbit only mid-leg; rest sway ≤ 0.02 rad ("beyond ~0.02 rad the locked, crisp face contract erodes into wobble") |
| group dolly | `env · DOLLY 2.2` toward the camera | — | |
| group scale | `(1 + (1−env)·REST_BREATH 0.004·sin(0.5t)) · extentComp` | 1 | breath; `extentComp = ihBuild/ih` on touch only |
| `store.morph / stage / assembleDone` | written back each frame (`stageFromMorph`, `LOCK_EPS = 0.02`) | — | DOM copy cross-fade follows these |

`b.tick({dt, time})` → `uDelta`, `uTime`, `gl.compute(simulate)` once per visible frame.

---

## 8. Debug handle `window.__sersanFounderMorph` (dev only, `:1089-1264`)

`hasBuild`, `maxCount`, `touch`, `native`, `touchCards`, `count`, `stageRect`, `getSampler()` → `{gridW, gridH, sharedCells, stride, count, maxCount, inkCut, meanInk[], meanInkSubject[], halfExtent[]}`, `getUniforms()` → `{uAssemble, uMorph, uMorph2, uMorph3, progress, uFade, uSpread, emissive, pointSize}`, `getStage()`, `getGate()`, `simulateGesture('up'|'down')`, `setPointSize(v)`, `setSpread(v)`, `setEmissive(v)` (uniform write, rebuild if absent), `setDepth(v)` (multiplies `zFactor`, **rebuilds** preserving state), `setMorph(v|null)` (pin progress), `setStage('A'..'D')`, `playMorph(±1)`, `resample(opts)`, `project()` (group origin → CSS px), `bbox()` (projected 8-corner extent). Store handle is the *plural* `globalThis.__sersanFoundersMorph` (HANDOFF "trappola di nomi"). The section must be in view (culling early-returns before the clock).

---

## 9. Measured: why the faces read as "flat dithered photo with empty patches"

Offline port of `readGrid` (same crop, median, dist, flood fill, ink curve; `scratchpad/inkport/ink_port.py`), 290×405, defaults. Sanity: 3-image union (A, B, Mattia) = **51,249** vs **51,751** measured in-browser (−1 %, canvas resampling differences) — the port is faithful.

| Portrait | bg colour (median top corners) | subject cells above fade (rows < 251) | **ink < 0.443 → disc < pitch** | ink < 0.29 (< 0.7 pitch) | mean ink (subject) | bright skin cells (lum > 0.75): mean ink |
|---|---|---|---|---|---|---|
| Alessandro | (0.925, 0.933, 0.941) | 19,946 | **3,037 (15.2 %)** | 216 | 0.674 | 4,574 cells → **0.418** |
| Michele | (0.933, 0.937, 0.945) | 20,664 | **4,136 (20.0 %)** | 403 | 0.699 | 5,460 cells → **0.388** |
| Mattia | (1.0, 1.0, 1.0) | 22,573 | 1,267 (5.6 %) | 678 | 0.839 | 2,919 cells → 0.425 |
| Alberto (placeholder) | (0.859, 0.851, 0.863) | 12,996 | 1,685 (13.0 %) | 1,316 | 0.869 | 1,348 cells → 0.065 |

Row bands (grid rows, 20 each) where the sub-pitch fraction spikes — **exactly the regions the owner circled**:
- Michele rows 80–99 (**scalp**): 59.4 % sub-pitch, mean lum 0.75, mean ink 0.46; rows 100–119 (**forehead**): 43.5 %; rows 160–179 (cheeks/around glasses): 23.8 %; rows 240–259 (neck): 21.2 %.
- Alessandro rows 100–119 (forehead): 19.5 %; 160–259 (cheeks → chin): 18–24 %.
- Mattia only spikes at 240–259 (36.7 %, the washed torso band).

Mechanism in numbers: `ink = (dist·1.7 − 0.03)/0.97)^0.62`. Lit skin at sRGB ≈ (0.85, 0.72, 0.65) against wall (0.93, 0.94, 0.94) → `dist ≈ 0.19` → `v ≈ 0.30` → `ink ≈ 0.47`; a scalp highlight at (0.90, 0.80, 0.75) → `dist ≈ 0.12` → `ink ≈ 0.34` → disc diameter ≈ (0.06 + 0.94·0.34)·2.1 = **0.80 × pitch**, so between neighbouring discs ~20 % of the pitch is bare navy page. The eye integrates that as a darker, holey patch on the *brightest* part of the head — the halftone is inverted relative to the photo because the "ink" metric is distance-from-white, not darkness or "subject-ness". The ink maps I rendered (`scratchpad/inkport/michele-ink.png`, `alessandro-ink.png`) look like photographic negatives: the scalp and forehead are the darkest regions of the ink map.

Contributing facts:
1. The flood fill keeps the scalp cells (bgMask does NOT leak into the head — the mask is correct), so the holes are **tonal**, not masking holes. The comments' claim "no holes" is true only for coverage.
2. The 0.02 alpha `Discard` and the `smoothstep(0, 0.1, ink)` knee do not cull these cells (ink 0.3–0.45 → alpha 1); they are drawn, just small.
3. `depthTest:false` + flat z means nothing else fills the gaps; there is no volume behind the front layer.
4. `antialias:false` + sub-2 px discs on dpr-1 desktops (pitch 1.94 px) makes every disc a hard 1–2 px dot → the "dithered/halftone" texture. On dpr 2 the pitch is 3.9 px and full discs 7.8 px — still a visible dot lattice at 26 rem.
5. Colour is flat photographic sRGB→linear × 1.18, no lighting, no rim, no depth cue; at rest the only motion is a 0.02 rad sway + 0.4 % breath.

Also recorded in HANDOFF "Aperto §2": 12.1 % of kept cells are wall/shirt (4,446 in Alessandro's shoulder band) — the rowLimit leaves un-masked wall below 0.62 that dissolves via `fade`; visible as a grey block in the ink maps below y ≈ 251.

---

## 10. Where a richer representation plugs in (with what the engine already tolerates)

The pipeline has three clean seams: **(a) the sampler output contract** `PortraitPoints {xy, rgb, z, ink, halfExtentX/Y}` per target, index-paired across targets; **(b) `toWorld` + `zFactor` in the island**; **(c) the engine's per-target packed `tintX` vec4 + billboard fragment**. Everything else (gate, clocks, store, DOM cross-fade, touch scrub, bloom) is representation-agnostic.

### 10.1 Per-particle real depth (cheapest, keeps everything else)
- Replace `z[j] = (lum − 0.5)·depth` in `emit()` with a value read from a **depth map** (`/founders/<anchor>-depth.webp`, same 1200×1800 framing, from Depth-Anything/MiDaS or a photogrammetry bake) loaded alongside in `loadFounder`. `readGrid` already cover-crops; a second `readGrid` on the depth image gives a per-cell `lum` that IS the depth. No engine change: `homeA..D` are already vec3 with z.
- Then raise `Z_RELIEF_MAX_FRAC` (0.04 → ~0.5–0.8 of face height for a real bust) via `setDepth(v)` for live testing. The documented "comb tearing" at `setDepth(0.3)` comes from *luminance edges* becoming *depth cliffs* on a regular grid; a smooth true depth field has cliffs only at the silhouette, where tearing is correct (the ear is in front of the wall). Re-enable `depthTest/depthWrite` (`PortraitMorphOpts.depthTest/depthWrite: true`, island `:779-780`) so the front layer occludes, or switch to `blending: "additive"` for the Lusion glow-cloud look (both are already parameters).
- Keep the union/stride/index pairing untouched — only `z` changes.

### 10.2 Lighting / rim glow (needs normals or a baked light)
- **Baked** (zero engine change): compute a rim/fresnel term on the CPU from the depth-map gradient at `emit()` time and fold it into `rgb[j]` (or into `ink`) — valid because the resting head is camera-facing within 0.02 rad. A `uLightDir` could not move, but Lusion's rest state also barely rotates.
- **Dynamic** (engine change, budget OK): add a per-target packed `normA..D` vec4 (`oct-encoded normal xy, depth, spare`) read with `.element(instanceIndex)` in the vertex stage → vertex-stage storage bindings go from 4/8 to **8/8** (at the wall but legal); compute kernel untouched (render-only buffers, like the tints). Blend them with the same `portraitMorphExpr/2/3` stagger, output a `vNormalF` varying, and do `rim = pow(1 − max(0, n·viewDir), k)` in `shade`. Alternative that costs zero bindings: pack normal xy into `tint.w` together with ink (e.g. 8 bits each in one float) and decode in the vertex stage.
- The selective bloom threshold is 1.0, so any rim term > 1.0 in linear colour blooms for free (this is how `travelTint [0.16, 2.4, 3.0]` already glows mid-flight).

### 10.3 True 3D head point cloud (Lusion-class)
- Replace `samplePortraitSet` with a loader that yields the same `PortraitPoints` shape from a **PLY/GLB point cloud per person** (photogrammetry / Gaussian-splat export / Hyper3D via the Blender MCP): `xy` from projected x,y in "grid px" units (or just emit world units and set `worldPerGrid = 1`), `z` real, `rgb` from vertex colour, `ink` = 1 (or vertex-colour luminance if a tone term is wanted), `halfExtentX/Y` from the bbox — the world-fit code (§5.2) then still centres and scales it to the stage.
- **Index pairing** is the hard requirement the current design gets for free from the shared grid: every target needs the same `count` and particle `j` should correspond spatially. Options: resample every scan to N points with a deterministic ordering (sort by spherical angle around the head axis, then bucket), or pair by nearest-neighbour/optimal-transport once offline and bake the permutation into the asset. The morph kernel is agnostic (it just mixes `hA..hD` per index).
- Count: the engine ran 51.7k at 145 fps; a 100–150k point head is plausible on desktop (raise `MAX_COUNT_BY_TIER.full`; `spacingDev`/`defPointSize` are derived from stage area and count, so disc size self-adjusts; for a volumetric cloud `spacingDev` should instead be derived from the cloud's projected area or set explicitly via `setPointSize`).
- Render: turn depth ON or go additive; drop the `smoothstep(0, 0.1, ink)` knee (ink = 1); consider a depth-based size/alpha falloff (needs `vPortraitDistF`, which already exists) for the "volumetric" read; the group orbit/parallax machinery already rotates the group in 3D, so a real head will read as 3D immediately at `ORBIT_MAX`/`PARALLAX_MAX`, and the rest sway can be raised beyond 0.02 rad because the "pixel-pinned crisp face" contract no longer applies.
- Gate/UX untouched: `MORPH_MAX`, `STAGE_ORDER`, one-shot clock, DOM cross-fade, touch scrub.

### 10.4 Things that do NOT need to change
`applyMorph` sequencing, `unifiedForceStep` physics (SPRING 52 / DAMPING 7.5 / MAX_SPEED 16 / TURB 9), the scatter-seed entry, `uFade`/cull, the store (`pinned/native/scrub/morph/stage/active/measureVersion`), `founderMotion.ts` (only the DOM rail + retired `FounderPlanes` use it: `FOUNDER_ARC_PX = 8`, `FOUNDER_FOCUS_SCALE = 0.04`, `FOUNDER_TILT_MAX = 0.12`, `FOUNDER_LENS_RADIUS = 0.42`; **not consumed by `FounderPortraitMorph`**).

---

## 11. Store model (`foundersMorphStore.ts`) — summary

Zustand store pinned on `globalThis.__sersanFoundersMorph` (cross-bundle singleton). Fields: `pinned` (desktop sticky morph mode), `native` + `scrollLeft` + `scrub` (touch scrub source), `active` (island built on true WebGPU — DOM hides posters only then), `gateEngaged`, `stage: 'A'|'B'|'C'|'D'|'morphing'` (derived by the island via `stageFromMorph`, `LOCK_EPS = 0.02`), `morphTarget` (integer 0..3, gate steps by one), `morphImmediate` (jump, used to land on the last stage when arriving from below), `morph` (live scalar, DOM copy cross-fade reads it), `assembleDone`, `reveal` (0|1 fire-once), `hover`, `mouse {x,y}` (stage UV, 0.5/0.5 on touch), `secTop`, `travel` (0 in the gate model), `measureVersion`. Constants: `STAGE_ORDER = ["A","B","C","D"]`, `WIRED_TARGETS = 4` (the colour/ink chain ceiling = the engine's 4 home buffers; "THIS IS THE CEILING"), `MORPH_MAX = min(founders.length, 4) − 1 = 3`, `STAGE_TOTAL = 4`; helpers `legOf`, `legFract` (envelope must be leg-local: `sin(legFract·π)`), `stageIndex`. `foundersGateApi` is a non-reactive dev hook so the island can proxy `simulateGesture/getGate` from founders-rail's gate state machine (`G_MAX_ENGAGE_MS = 20000` safety valve, `COPY_ENTER_END = 0.98 = 1 − LOCK_EPS`).

Gate semantics (doc block `:11-31`): A locked → one scroll-down gesture → auto-play one leg (1.4 s) → B locked → … → D locked → next gesture releases the page; reverse symmetric; **interior stages never release** (Escape and the 20 s timer are the other outs).

---

## 12. Quick-reference: every knob, default, file:line

| Knob | Default | File:line |
|---|---|---|
| `MAX_COUNT_BY_TIER.full / .lite` | 60000 / 20000 | FounderPortraitMorph.tsx:177/187 |
| `TOUCH_GRID_SCALE` | 0.58 | :193 |
| `GRID_W / GRID_H` | 290 / 405 | :206-207 |
| `STAGE_FILL` | 0.92 | :209 |
| `Z_RELIEF_MAX_FRAC` | 0.04 | :221 |
| `DEFAULT_EMISSIVE` | 1.18 | :223 |
| `SAMPLE_SPEC_BASE` depth/centerZBias/inkGain/inkFloor/inkGamma/fadeStart/fadeSpan/inkCut/extentInk | 90 / 0 / 1.7 / 0.03 / 0.62 / 0.62 / 0.32 / 0.03 / 0.15 | :231-251 |
| `SPREAD_MAX / ORBIT_MAX / DOLLY / PARALLAX_MAX` | 1.1 / 0.7 rad / 2.2 / 0.18 rad | :255-261 |
| `REST_SWAY_YAW / PITCH / REST_BREATH` | 0.02 rad @0.11 rad/s / 0.012 @0.07 / 0.004 @0.5 | :267-269 |
| `ENTRY_DURATION / MORPH_DURATION / CULL_PAD` | 1.8 s / 1.4 s / 120 px | :271-275 |
| `HEADSHOT_EXTS` | webp, jpg, png | :278 |
| seed scatter radius | `(0.5 + rand·1.3)·stageWorldH·0.55`, y×0.85, z ±0.5·stageWorldH | :697-705 |
| `discDev = spacingDev·2.1`; `defPointSize = clamp(discDev·12/(dpr·1.05), 10, 96)` | — | :722-727 |
| engine params SPRING/DAMPING/MAX_SPEED/TURB/POINT_ALPHA | 52 / 7.5 / 16 / 9 / 1.0 | :740-745 |
| `travelTint` | [0.16, 2.4, 3.0] | :781 |
| `blending / depthTest / depthWrite` | normal / false / false | :773-779 |
| fade edge ramp / damp | `ih·0.28` / 8 | :1015-1023 |
| yaw/pitch damp | 6 | :1057-1063 |
| sampler `CORNER_PATCH / FACE_CY / BULGE_RADIUS / JITTER / BG_FILL_TOL / BG_FILL_ROW_LIMIT` | 14 / 0.44 / 0.75 / 0.9 / 0.055 / 0.62 | sampleImagePoints.ts:121-141 |
| engine `PORTRAIT_SIZE_MIN / PORTRAIT_SIZE_INK` | 0.06 / 0.94 | gpgpuNodeSim.ts:1575/1578 |
| `PORTRAIT_COV_MIN_PX` | max(1.25, 0.35·spacingDev) | :1601-1604 |
| `PORTRAIT_TRAVEL_K` | 0.16 | :1821 |
| stagger delay/window | `hash·0.55` / 0.45; `ASSEMBLE_WINDOW = 0.45` | :1350, 1365 |
| disc edge | `smoothstep(0.5, 0.34, rr)` | :1882 |
| alpha knee / cov² / Discard | `smoothstep(0, 0.1, ink)` / `cov²` / `< 0.02` | :1925-1953 |
| size random spread | `0.85 + 0.3·rand` | :1781 |
| bloom threshold | 1.0 (route override 0.92 exists) | fxStore.ts:280, routeFxStore.ts:64/87 |
| camera | fov 50, z 12, near 0.1, far 200; `antialias:false` | Scene.tsx:372/387, constants.ts |

Files produced by this task: `scratchpad/inkport/ink_port.py` (faithful Python port of `readGrid`, usable to pre-measure any new asset or depth map), `scratchpad/inkport/<name>-ink.png` / `<name>-bgmask.png` (ink and mask maps for the four headshots).

# ROUND 12 — BUILD PLAN
HEAD `cc10138`. Every line reference verified at HEAD. Repo root `C:/Users/alber/Desktop/sersan-v2-main`.

---

# PART 1 — THE VERDICT ON CAPACITY

**One continuous, rect-filling net 2.79 frame-widths of run + 1 frame-width of lead-in (7278 × 935 px at 1920×935) at today's areal density needs ~660–720 nodes and ~1250–1400 links, and at that size `uEdgeA`/`uEdgeB` are 19.7–21.9 KiB each — over the 16 KiB `MAX_UNIFORM_BLOCK_SIZE` min-spec floor and past the hard 1024-element ceiling — so it does NOT fit as drawn with the current binding strategy.** It fits, comfortably and with a UBO block to spare, the moment `uEdgeA`+`uEdgeB` are merged into one index-packed `uniformArray(Vector4[])` (`a + 1024·b`, four links per element): 1258 links → 315 elements → **4.92 KiB, 30 % of the floor, 3.3× margin**, particle vertex stage **12/12 → 11/12** — so index packing is a **prerequisite of the owner's drawing, not headroom to bank later**, and no data texture is needed (the packed ceiling is 4096 links; `uNodePos` at 720 nodes is 11.25 KiB and does not break until 1025 nodes).

**If packing were refused, the largest continuous band that fits is N ≈ 500 / E ≤ 1000** — measured first break across five master seeds is N = 513–544 — which at rect-fill density covers the **run-only** reading (5358 px × 935 px ⇒ 487 nodes / ~926 links / 14.47 KiB) but leaves the net's own left and right ends visible inside the frame at the start and the end of the run; it does **not** cover the honest continuous case. The phone is the binding case and settles it: at 390×844 the same construction is 716 nodes / ~1406 links (22.5 KiB unpacked, **5.5 KiB packed**), so **the lite tier cannot ship at all without packing.**

---

# PART 2 — THE CORRECTED FACT SHEET

## 2.1 Uniform capacity — mechanism

| fact | value | source | correction |
|---|---|---|---|
| `uniformArray` element padding | every element → vec4 = **16 B**, `float`/`vec2`/`vec3` alike | `three/src/nodes/accessors/UniformArrayNode.js` `getPaddedType()` (closes at :187), alloc `length*4` floats | — |
| one UBO block per `uniformArray` | confirmed | `GLSLNodeBuilder.js:750-757, 802-816`; plain `uniform()` → shared groups `:764-800, 820-828` | — |
| element ceiling per array | **1024**, hard (16384/16) | derived | — |
| particle vertex stage | **12/12 blocks** (9 arrays + 3 shared groups) | `neuralFieldCompute.ts:992-1008`; call sites `:1189,1192,1195,1198,1202,1208,1316,1317,1347,1352` | source says "9 + **up to** 3"; could be 10 or 11 — **UNVERIFIED without a `?backend=webgl2` compile** |
| line vertex stage | **8/12** | `neuralFieldCompute.ts:2606-2612`; arrays `:2641-2647` | — |
| the 12-block wall is **not** WebGL2-only | WebGPU default `maxUniformBuffersPerShaderStage` = 12 | `WGSLNodeBuilder.js:1149-1169, 1992-2009` | **corrects** the capacity finding's WebGL2-only framing |
| per-render full UBO re-upload | `gl.bufferData(UNIFORM_BUFFER, array, DYNAMIC_DRAW)`, no dirty range, **every render** | `UniformNode.js:55` → `UniformGroupNode.js:167` → `Node.js:177-185` → `NodeManager.js:123-129` → `Bindings.js:284-290` → `WebGLBackend.js:1922-1926` | **CONFIRMED**, was filed unverified. ≈43 KiB/render-object/render at 454/871 |
| `textureLoad` compiles on both backends | `texelFetch` (`GLSLNodeBuilder.js:471-497`) / `textureLoad` (`WGSLNodeBuilder.js:646-664`); export `TextureNode.js:949` | three r184 | legal, **zero UBO cost**, but **zero vertex-stage texture reads exist in `src/webgl/`**, and `MARK_RT_WEBGL2 = false` (`crystalConfig.ts:1751`) — unproven on the fallback backend |

## 2.2 Shipped tables (re-run generator, reproduced to the digit)

`broken/full` **N = 103, E = 227** (must 74 + extra 153), E/N 2.2039, meanSpacing 0.1052, meanDegree 4.408, x-span 0.9089, y ∈ **[−0.3363, +0.4175]** (span 0.7538, delivered y-mean +0.0406), x at nodeT 0.62 = 0.1428.
`healthy/full` 101/229 · `healthy/lite` **54/111** · `healthy/svg` **32/53** · `broken/lite` 56/110 · `broken/svg` 36/62.
Density: **174.9 nodes/frame² · 385.4 links/frame² · NN spacing 84.6 px · mean edge 114.3 px** over a 1745 × 606 px bbox at 1920×935.

## 2.3 The two "parity" definitions — they are different numbers, and the owner must pick one

| definition | what it means | nodes over 7278×935 | links | `uEdgeA` unpacked | packed |
|---|---|---|---|---|---|
| **areal parity** (same texture) | same nodes/Mpx² as today's cloud | **662–720** ᵃ | 1258–1400 | 19.7–21.9 KiB ✘ | 4.92–5.47 KiB ✔ |
| **on-frame parity** (same read) | exactly 103 nodes visible at any instant | **391** | 743–861 ᵇ | 11.9–13.8 KiB ✔ (thin) | 2.98–3.44 KiB ✔ |

ᵃ the spread is two honest measurements of "today's density": 97.4 nodes/Mpx² over the delivered **bbox** ⇒ 662; 105.4/Mpx² over the seeding **ellipse** ⇒ 717. Both are defensible; the number is not a single fact.
ᵇ E/N in a long thin slab measures **1.88–2.01**, not the welled band's 2.204 — the corpus's 2.204 over-counts.

**The brief's "4.8× the area" is wrong** — it compares the new band rect to today's cloud *bbox*. Band-to-band the multiplier is **3.24×** (5358 px run) / **4.40×** (7278 px continuous). **The brief's "500 nodes → 1100 links" also over-counts**: at N = 500 the generator delivers 939–964.

## 2.4 Geometry at 45°

| quantity | value | source |
|---|---|---|
| `R = tan 45°` | 1.0 (was `tan 23.61° = 0.437097`) | `traverseConfig.ts:274` |
| act, 1920×935 | `secTop 5563`, `secH 5358` = 5.730 vh | measured |
| lateral run | `R·secH` = **5358 px = 2.791 vw** | derived |
| field length `L` | `Λ + 1` = **3.791 band-widths = 7278 px** | swept-corridor |
| fraction of the FIELD on frame | **26.4 %** desktop / **7.8 %** phone (390×844, `secH` 4600, `L` 12.795) | derived |
| fraction of the act a **fixed point** is on frame | `1/Λ` = **35.8 %** / 8.5 % | corrects "26.4 %" for the crystal |
| ribbon slope | `μ = −(vw/**rect.h**)/R` — **`rect.h`, never `size.height`**, the band pin is `svh` (`use-diagonal-traverse.ts:206-209`) | corrected |
| field local-y bbox | **±4.39** frame-heights desktop / ±3.46 phone | corrects ±3.365 |
| lateral cull firing points at R=1 under the corrected centring | **`p < 0.101` and `p > 0.899`** | corrects "p = 0.40" (that is the uncompensated case) |
| top / bottom edge gaps at `PLEXUS_RY 0.42`, `rect.h = ih` | **77 px top / 153 px bottom** — asymmetric 2:1 | corrects "≈75 / ≈75" |

## 2.5 Build-time constants that must move (all silent failures if missed)

| constant | file:line | today | why it moves |
|---|---|---|---|
| `PLEXUS_EDGE_CAP.full` | `neuralLatticeConfig.ts:246` | 250 | **the net silently truncates to 250 links** |
| `PLEXUS_SEEDS` / `_STONELESS` | `:217-223` / `:233-237` | 132 / 103 | seed count sets N |
| `BAND_ASPECT` | `:263` | 0.45 | D17 band is 935/7278 = **0.1285**; left at 0.45 "nearest neighbour" means 3.5× different in x than y |
| `EDGE_MIN_LOCAL` | `:344` | 0.055 | at 7278 px that is 400 px, not 106 px — rejects the whole short-link population |
| **`WRAP_SNAP_DIST`** | `:1652` | 0.038 | **omitted from the capacity finding's list.** Invariant `WRAP_SNAP_DIST < EDGE_MIN_LOCAL ≤ shortest delivered link` (`:1649-1650`) is **violated in every configuration proposed**: measured shortest delivered link 0.0146–0.0201 vs 0.038 ⇒ recycle-snap never fires ⇒ the "bright spring-flight streak" returns on the WebGPU tier |
| `PLEXUS_RADIAL_POW` / `RX,RY,RZ` / `WARP` | `:269-280` | 2.2 / .48,.42,.2 / .22 | the seeder is a centre-dense **ellipsoid**; cranking seeds gives a **lens**, not a rect. Measured at 454 nodes over 7270: end bins 18–20 nodes, 343 px tall, per-frame density swings **2.6×** — the "3 pezzi" reading re-created inside one band |
| dedup key `a*1024 + b` | **`:544`** (not :546) | — | injective only for N ≤ 1024; **silently drops edges, does not throw** |
| `COPY_LANE_OPEN_W` | `:1975` | 2.0 | left wall at local x ≈ −1.5 lands **inside** a ±1.90 field; raise to ≥ 4.0 — but it is module-global and shared with `#production` |
| `MAX_TRAVERSE_ISLANDS` | `traverseConfig.ts:235` | 4 | dies with the ladder |
| `angleDeg` | `traverseConfig.ts:**274**` (not :273) | 23.61 | → 45 |
| `bandVh` | `traverseConfig.ts:298` | 0.8597 | → 1.0. ⚠ `NEURAL_DEPTH_VIEWPORT_SPAN` (`neuralLatticeConfig.ts:1726`) carries the **same numeral for an unrelated reason** — do not touch it |
| stale comment | `neuralFieldCompute.ts:**762**` | `aux ≤ ~500` | at E = 227 max aux = 452, **not stale today**; becomes stale at E > 250 |

## 2.6 Consumers the deletion/migration lists were missing

- `traverseConfig.islands.compensate` is read **on the frame path** at `CrystalCluster.tsx:489` (**the stone's own lateral**), `:942`, `NeuralLattice.tsx:591`. Deleting `islands` de-centres the stone by up to 5358 px.
- `traverseIslands()` consumers: `NeuralLattice.tsx:136`, `:1343-1348`, `:1362-1376`, and **`:1360` `strictCull={extras.length > 0}`** — removing the ladder flips `#problem` from strict to *padded* visibility. Behaviour change, not dead-code removal.
- `CrystalCluster.tsx:503` — stone y carries **no slope term**; under a diagonal ribbon the stone de-registers vertically (overlap with its own x-window falls to ~5 % of the act). `:505-508` is its own vertical cull, also missing from the list.
- `NeuralLattice.tsx:913-920` — `innerRef` orbit/parallax (0.09 rad about the field origin, inside `scaleRef`). On a ±1.90 × ±4.39 field this sweeps camera distance **[4.7, 19.3]** against the authored [10.08, 13.92] — the exact "nodes toward the camera" failure `NEURAL_DEPTH_VIEWPORT_SPAN` exists to prevent. Angles must scale as `1/L`.
- The **nebula** layer (`neuralFieldCompute.ts:2476-2530`, gated `:2888`, `NEBULA_ALPHA = 0.3`) is **live on `#problem`**, anchored on `streamCenter(uFracture)` and scaled by `uPlaneAspect`.
- The **dot grid** (`problem-section.tsx:556`) lives inside `[data-lattice-anchor]` — it scrolls off at ~p = 0.35 while the ribbon stays for the whole act.
- `laneCentreBackPx` (`NeuralLattice.tsx:1213`) reads raw `xScenePx` — mis-reports by the whole centring constant.
- `CRYSTAL_SCALE` (`crystalConfig.ts:506`) and `FOG_RADIUS_Y` (`:2372`) are **plain scalars shared with `#production`** (`Scene.tsx:508-511`), unlike `CRYSTAL_POS` which is per-mode. Rebasing them shrinks the `#production` stone 14 %. They must become per-mode records first. (`crystalConfig.ts:2350-2358`: a fog radius that moves without the stone produces the "glowing blob" failure.)
- `#production` identity mapping must be `x = u·uFieldLen + uFieldOrigin` with `(1, 0)` and `u` baked as **raw x** — bit-exact. `(u − 0.5)·L` is **not** bit-exact and cannot satisfy the byte-for-byte contract (`NeuralLattice.tsx:709-711`).

## 2.7 Particle budget

Today: `NEURAL_PARTICLE_COUNT = 9000` (`neuralLatticeConfig.ts:177`), `_COMPACT = 3200` (`:202`). Allocation `seedBuffers` (`neuralFieldCompute.ts:791-891`): 32 sparks + 4140 stars (`NODE_FRACTION 0.46`) + 4828 link = **40.19/star, 21.27/link**. The **104k figure in the corpus is the projection for a rejected corridor, never shipped.**

| band | N/E | particles | ×today alloc | ×today peak (2 islands = 18 000) | line verts |
|---|---|---|---|---|---|
| on-frame parity | 391/861 | **34 000** | 3.8× | 1.9× | 10 332 |
| areal parity | 662/1258 | **53 400** | 5.9× | 3.0× | 15 096 |
| phone, parity | 716/1406 | **58 700** | 18.3× compact | — | 16 872 |

`frustumCulled={false}` on all three meshes (`NeuralLattice.tsx:1265, 1273, 1286`); `object.frustumCulled = false` (`neuralFieldCompute.ts:2864`). The vertical cull is `:679-682`, lateral `:688-697`, `build.compute(delta)` at `:1016`. **Under D17 the one band is on frame for the entire act by construction, so no existing cull ever fires** — every particle is vertex-shaded every frame for 26.4 % (desktop) / 7.8 % (phone) of the pixels.

## 2.8 The river, quantified

| quantity | river (`47af6d8`) | HEAD | ratio |
|---|---|---|---|
| particles per px of filament | 5.03 | 0.30 | **17× sparser** |
| resting sprite ⌀ | 4.8–12.8 px | 2.3–5.2 px | 2.5× |
| resting post-blend | **1.29–1.95 (self-blooming)** | **0.018** | **72–108×** |
| along-path overlap | 4.2–16× | 1.0–1.55× | 4–10× |
| bulk flow | 96 px/s, every particle | 5.3 px/s | 18× |

**The gap is alpha (72×) and bulk motion (18×), not particle count** — HEAD is already at 1.0–1.55× geometric overlap, one alpha decision from a continuous filament. The 1.65× continuity threshold is the codebase's own (`neuralLatticeConfig.ts:1590-1594`).

**Bloom census discrepancy the owner has not been told:** the storyboard declares "5–8 sprites above 1.0 at any instant… and no link ever blooms" (`storyboard.md:342`). The shipped build has **~76 live packet beads at post-blend 3.648** (`PACKET_COUNT 2` `:1224` / `PACKET_SPAN 6` `:1231` × 227 links; ledger `:1500`). **An order of magnitude over the declared census. This is live today, not a D17 consequence.**

## 2.9 Copy — corrected

- `capPx = blk.h` (`use-diagonal-traverse.ts:395`) delivers **`2·capPx`** peak-to-peak because `dy = w.yc − y` is antisymmetric (`traverse-rate.ts:187-189`) — twice §B2b's authored law. **`blk.h / 2` is right.**
- The published corpus em/line figures are **UNCAPPED** plateau drifts labelled "after the cap" (`storyboard.md:609`) — **no shipped number reproduces the corpus table.**
- Ceiling after the fix is **`blk.h / (lines · fontSize)`**, which equals CSS leading only for the two body wrappers. Ledger `h3` wrapper = **1.10** (not 1.05, its inline index/arrow spans inflate the line boxes); chapter display wrapper ≈ **1.16** against `leading-[0.98]`.
- `opWin`/`opTop` (`:159-161`, spec `:128-158`, init `:326-327`) are **declared, initialised, never assigned or read**. `unitSpan` (`:304-307`) allocated, never used. `windowAt` imported (`:90`), **zero call sites in that file**. Silent because `tsconfig.json` sets no `noUnusedLocals` and **there is no ESLint config and no `lint` script**.
- `UNIT_SELECTOR = "[data-ledger-row],[data-traverse-unit]"` (`:112`) — **`[data-traverse-unit]` is already in the selector**; the chapter grid (`problem-section.tsx:465-468`) simply does not carry it.
- `frame.laneWindow` scales **four** uniforms, not three: `uCopyLaneW`, `uCopySoft`, `uCopyFloor`, **`uCopyLineFloor`** (`NeuralLattice.tsx:663-666`).
- **UNVERIFIED:** the chapter display block's `h` at 1920×935 (back-solves to ≈321 px from the finding's "6 %" claim; nothing measures it). At 250–310 px the loss is 14–21 %, not 6 %. **Measure before quoting.**
- **UNVERIFIED:** all 1280×720 line counts are derived, not measured. The chapter desc is ±1 line.
- **UNVERIFIED:** the IT ledger headline widths at 390 px were never measured in any round.

## 2.10 Census

`netOnFrame 100 % / nothing 0.0 %` does **not** follow by construction: `coverage()` culls **vertically first** on the anchor box (`use-diagonal-traverse.ts:771-772`). A frame-height anchor in a 5358 px act reports **≈34.9 %** — *worse* than the shipped 30.9 %. 100 % requires mechanism §4.4 shape **(c)** (decouple the group scale from the rect), which `traverseConfig.ts:58-60` states verbatim "has not been taken" and calls owner-visible. **`maxIslandsOnFrame 1` is by construction; everything else is contingent and must be published as open.** The coverage instrument's failure mode under the ribbon is a **false negative**, and 35 % is exactly the number that justified the ladder — it will read as a regression.

---

# PART 3 — THE PLAN

Global gates that apply to **every** stage (no stage is done without them):
- **G-TS** `npx tsc --noEmit` clean (the only static gate; there is no ESLint).
- **G-PROD** `#production` delivered plexus `{nodes:101, edges:229}` and its rendered band pixel-unchanged. (`NeuralLattice.tsx:709-711` byte-for-byte contract.)
- **G-FALLBACK** SVG twin `{32,53}`/`{36,62}`, lite `{54,111}`/`{56,110}` unchanged unless the stage owns them.
- **G-RM** prefers-reduced-motion / SSR / no-JS land settled and visible, zero timers, no canvas at tier "off".
- **G-COPY** every EN and IT string byte-identical (`git diff` shows zero changes inside string literals).
- **G-CAMERA** `src/webgl/SignatureLine.tsx` shows **zero** lines changed in `git diff` at every stage.
- **G-CLOCK** the frozen-clock instrument (`NeuralLattice.tsx:600-603`, `:1193-1240`, `use-diagonal-traverse.ts:474-486`) reports zero skew.

---

## STAGE 0 — three agents, fully parallel, disjoint files

### 0A · COPY FIXES (a)(b)(c) — ships visible, today, at 23.61°
**OWNS (exclusively):** `src/components/fx/use-diagonal-traverse.ts`, `src/components/fx/traverse-rate.ts`, `src/webgl/neural/traverseConfig.ts`, `src/components/sections/problem-section.tsx`.
**Content:** PART 4 diffs (a) wire the reading unit, (b) `capPx = blk.h/2`, (c) `capDisplayMultiline`, plus the a6 dev-handle mirrors and the `park()` docstring (D11).
**GATE:**
1. `coverage()` `copyOnly + netAndCopy` reproduces the pre-(a) figure **to the sample** (proof: for `unitH ≤ bandH` the unit window's support is exactly the union of its members' supports — the contiguity lemma requires the guard, so run the census with the guard active).
2. New `plateauDriftOf(w,r) = |rateAt(w,w.e1,r).x − rateAt(w,w.e2,r).x|` reports `emPerLine ≤ blk.h/(lines·fontSize)` for **every** block at 23.61° **and** at 45° (set `angleDeg` live via `setTraverseConfig`, do not commit it).
3. `laneCheck()` passes at every `park(index, edge)` — and `park` must be re-pointed at `b.opWin`/`b.opTop`.
4. Line-count detection: `round(copyBoxHeight / usedLineHeight)` matches the hand count on all 7 supplied measurements.
**ROLLBACK:** three independent levers — `windowOpacity: false` (kills (a)'s effect), `capBody: false` (kills (b)), `capDisplayMultiline: false` (kills (c)). All reachable through `setTraverseConfig` for free (`traverseConfig.ts:377-379`). Reverting the commit restores `capPx = blk.h` in one line.

### 0B · INDEX PACKING — ships invisible, pixel-identical
**OWNS (exclusively):** `src/webgl/neural/neuralFieldCompute.ts`.
**Content:** merge `uEdgeA`(`:1017`)+`uEdgeB`(`:1018`) into one `uniformArray(Vector4[])` packed `a + 1024·b`, four links per element. Decode = `b = floor(v/1024); a = v − 1024·b` (~3 ALU) + dynamic vec4 component selection via 3 nested `select()` (~6 ALU) at the two call sites (`:1316-1317`) and the two line call sites (`:2641-2647`). Exactness: max packed value 1,048,575 < 2²⁴ — **exact in fp32 with 16× margin at N ≤ 1024**.
**GATE (the whole point of putting this first):**
1. **`?backend=webgl2` compiles and renders the band with zero console errors.** `uniformArray(Vector4[])` is **unexercised anywhere in this repo** (11 declarations, all `Vector3[]` or `number[]`) — this is the proof, and it also settles the "9 + up to 3" block-count ambiguity.
2. Delivered constellation **pixel-identical** to HEAD at 1920×935 and 390×844, both backends (screenshot diff, zero non-AA pixels).
3. Block-count evidence: dump the generated GLSL and count `uniform … { … };` blocks in the particle vertex stage — must read **11**, was 12; line stage **7**, was 8.
**ROLLBACK:** keep both declarations behind `const EDGE_PACKED = true` in the module; flipping to `false` restores the two-array path byte-for-byte. Do not delete the old path until Stage 2 gates.

### 0C · GENERATOR PARAMETERISATION — ships invisible, tables identical
**OWNS (exclusively):** `src/webgl/neural/neuralLatticeConfig.ts`.
**Content:** `BAND_ASPECT`, `EDGE_MIN_LOCAL`, `PLEXUS_SEEDS*`, `PLEXUS_EDGE_CAP`, `PLEXUS_K`, `PLEXUS_RADIAL_POW`, `PLEXUS_RX/RY/RZ`, `PLEXUS_WARP`, `WRAP_SNAP_DIST` become **per-build arguments** to `buildPlexus` (`:431-639`) / `getPlexus` (`:414`) / `createNeuralFieldBuild`, **defaulting to today's module constants**. Add a `shape: "ellipsoid" | "ribbon"` arm; the ribbon arm is a **rect fill** (uniform in u, radial-tapered only across v, re-centred on the delivered y-mean **+0.0406** so the top/bottom gaps are symmetric), authored in ribbon coords `(u ∈ [0,1], v ∈ [−0.5,0.5], w)`. Nothing calls the ribbon arm yet.
**GATE:** all six delivered tables byte-identical — `healthy/full` 101/229, `broken/full` 103/227 (must 74 + extra 153, meanSpacing 0.1052, meanDegree 4.408, x-span 0.9089, y ∈ [−0.3363,+0.4175]), lite 54/111 & 56/110, svg 32/53 & 36/62. Read via `__sersanNeuralLattice_problem.plexus`. **`#production` must not change** — this is the whole gate.
**ROLLBACK:** the arguments default to the module constants; passing nothing is today. Revert = delete the ribbon arm.

> **Why these three are parallel-safe:** file sets are disjoint. 0B must not touch `neuralLatticeConfig.ts`; 0C must not touch `neuralFieldCompute.ts`; 0A must not touch either. **`traverseConfig.ts` and `problem-section.tsx` belong to 0A for the whole of Stage 0 — Stage 1 takes them afterwards.**

---

## STAGE 1 — DELETE THE LADDER (serial, single agent, after 0A merges)

**OWNS:** `src/webgl/neural/traverseConfig.ts`, `src/components/fx/use-diagonal-traverse.ts`, `src/components/sections/problem-section.tsx`, `src/webgl/NeuralLattice.tsx`, `src/webgl/CrystalCluster.tsx`.
**Deletion list** (all verified at HEAD):

- `traverseConfig.ts`: `TraverseIsland` `:101-112`, `TraverseIslandsConfig` `:114-157`, `TraverseLadderFit` `:159-172`, `fitTraverseLadder()` `:174-231`, `MAX_TRAVERSE_ISLANDS` `:233-235`, `.islands` field `:239-240`, the authored ladder literal + fit commentary `:301-340`, the `islands` merge arm `:377-387`, `traverseIslands()` `:393-398`. Delete the "⚠⚠ THE COMPOSITION HOLE" paragraph `:281-293` **with** the ladder.
- `use-diagonal-traverse.ts`: imports `:74-80`, `ladderFit` `:193-194`, `armCss` guard `:216`, `clearIslands()` `:219-226`, `placeIslands()` `:228-285`, its call `:398-401`, `coverage()`'s compensate/origin terms `:722, :749, :773`, the `ladder` getter `:827-848`, teardown `:874`.
- `problem-section.tsx`: import `:11`, the ISLAND LADDER CSS block `:317-359`, `ISLAND_SLOTS` `:383-386`, the four extra anchors `:587-603`.
- `NeuralLattice.tsx`: import `:136`, props `plexusSeed/plexusWell/primary/strictCull` `:232-262`, `anchorLive`/`buildGate` `:275-292, :339`, `setAnchorLive` arms `:348-363`, the compensate branch `:588-599`, `primary` guards `:613, :771-776`, the lateral cull `:683-697`, `strictCull` expression `:698-717`, dev getters `:1029-1060`, the `cfgRev`/`extras` wrapper `:1335-1349, :1362-1376`, `strictCull={…}` `:1360`.
- `CrystalCluster.tsx`: the compensate origin at `:485-497` and `:938-949`.
- `neuralLatticeConfig.ts` is **not** touched here — `PLEXUS_SEEDS_STONELESS` dies in Stage 2 with `plexusWell=false`.

**⚠ `compensate` does not disappear conceptually.** It collapses from a per-island function of that island's `docTop` into **one global constant** `lateralPx = tv.xScenePx − dir·R·secH/2`, applied identically in `NeuralLattice.tsx:739` **and** `CrystalCluster.tsx:489`. Do not delete the stone's re-centring.
**⚠ `strictCull` removal flips `#problem` to padded visibility** (`:1358-1359`). That is a behaviour change; assert it deliberately.
**GATE:** one band renders at `angleDeg 23.61` (unchanged); `coverage()` reports `maxIslandsOnFrame 1`; the stone's screen position at ten sampled `p` values is within 1 px of pre-deletion; G-CLOCK; G-PROD.
**ROLLBACK:** single revert commit. This state is a **checkpoint, not an owner review** — it has the known 40 % void.

---

## STAGE 2 — THE RIBBON FIELD (serial, single agent, after 0B + 0C + 1)

**OWNS:** `src/webgl/neural/neuralFieldCompute.ts`, `src/webgl/NeuralLattice.tsx`, `src/webgl/CrystalCluster.tsx`, `src/webgl/neural/traverseConfig.ts`, `src/webgl/neural/neuralLatticeConfig.ts`, `src/webgl/neural/crystalConfig.ts`.
**This cannot be split.** The coordinate change must land atomically or the band renders wrong.

Content, in order:
1. `angleDeg 23.61 → 45` (`traverseConfig.ts:274`), `bandVh 0.8597 → 1.0` (`:298`). **Do not touch `NEURAL_DEPTH_VIEWPORT_SPAN` (`neuralLatticeConfig.ts:1726`) — same numeral, unrelated.**
2. Field mapping inside the **single** accessor `nodeAt()` (`neuralFieldCompute.ts:1201-1205`): `x = u·uFieldLen + uFieldOrigin; y = v + uFieldSlope·x; z = w`. Identity for `#production` = `(1, 0, 0)` with `u` baked as **raw x** — bit-exact. Four consumers ride it unchanged: stars `:1695`, link particles `edgeFrame` `:1307`, the chord `:2643-2649`, the nebula.
3. `uFieldLen`/`uFieldOrigin`/`uFieldSlope` as **plain `uniform()` scalars** — they join a shared group, **zero UBO blocks** (precedent `:2618-2622`, `:1001-1003`).
4. Driver: `μ = −(vw/**rect.h**)/R` per measure; `rig.position.y = yReg·k`; the global centring constant in `NeuralLattice.tsx:739` and `CrystalCluster.tsx:489`.
5. Vertical cull re-keyed to the **section** (`frame.active`, `use-diagonal-traverse.ts:452`) with `CULL_PAD` hysteresis on `secTop/secH` — **plus an authored fade over the last ~1 vh**, because `screenY` is constant in `p` and a section-keyed flip cuts a **frame-centred** net (D2).
6. Consumer migration: `nodeT ≡ u` (so `FRACTURE_T` re-derived as the stone's `u`); `copyYAt` (`:1480-1486`) evaluated on the **across-ribbon** `v`; `PLEXUS_CENTROID_K` scaled ≈17× or made ribbon-local; `COPY_LANE_OPEN_W` ≥ 4.0 **per-band**; `innerRef` orbit/parallax angles ∝ `1/L` (`NeuralLattice.tsx:913-920`); stone y gains the `μ·u` term (`CrystalCluster.tsx:503`) and its own section cull (`:505-508`); `CRYSTAL_SCALE`/`FOG_RADIUS_Y` become **per-mode records first**, then rebased together (`crystalConfig.ts:553-558`: `s` and `pxScale` must move together); `CRYSTAL_POS.x` re-authored as a ribbon `u` — **for "first sighted late" it must be `u ≈ Λ/2 − 0.5`, not 0.17** (0.17 lands it at `p ∈ [0.382, 0.740]`, mid-act); `WRAP_SNAP_DIST` re-derived against the ribbon metric.
7. Ribbon shape is an **opt-in argument**; the SVG fallback (`neural-graph-fallback.tsx:107`) passes nothing and keeps the ellipsoid. Add the ribbon flag to the build-effect deps (`NeuralLattice.tsx:339`) — this is a rebuild+dispose.
8. RM path: `data-traverse` absent ⇒ `tv` null ⇒ the island must **not** have built a ribbon. Gate the build on the traverse being armed.

**GATE:**
1. **Node/link counts land at the chosen density** and `uEdgeA` (packed) reads ≤ 6 KiB — read from the dev getter, not asserted.
2. **Both backends compile and render**: `?backend=webgl2` and WebGPU, zero console errors, at 1920×935, 1280×720, 768×1024, 390×844.
3. `screenY` of the ribbon centreline is **constant in `p` to ≤ 2 px** across 20 samples (this is the algebra's own prediction and the sharpest available check that `μ` is right).
4. **G-PROD**, **G-FALLBACK**, **G-CLOCK**.
5. Frame-edge measurement: top gap and bottom gap within 20 px of each other (the 2:1 asymmetry is closed by re-centring on the delivered y-mean, **not** by raising `PLEXUS_RY`).
6. `laneCheck()` WCAG contract passes at every parked block.
7. No `getBoundingClientRect()` anywhere in the frame path; zero per-frame allocation (heap snapshot flat over 60 s).

**ROLLBACK:** two levers, both live — `setTraverseConfig({ bands:{ problem:{ angleDeg: 23.61, bandVh: 0.8597 }}})` restores the shipped geometry with the one band; the ribbon `shape` argument reverting to `"ellipsoid"` restores the shipped constellation. Commit revert restores Stage 1.

---

## STAGE 3 — THE INTRA-FIELD CULL + THE PERF VERDICT (serial, after 2)

**OWNS:** `src/webgl/neural/neuralFieldCompute.ts`, `src/webgl/neural/neuralLinkLines.ts`, `src/webgl/NeuralLattice.tsx`.
**Measure first, then build.** This stage decides whether D17 ships at all.

1. **Line layer — exact and free.** `bakeLinkLineGeometry` (`neuralLinkLines.ts:101-134`) lays 12 vertices per edge contiguously (`LINK_SEGMENTS = 6`). Sort the delivered edge list by min-u at build time (edge **set** unchanged; only `chosen`'s order at `:565` moves; `edgeIdx` is baked into `meta` so both layers stay consistent), then `setDrawRange(firstEdge*12, nEdges*12)` per frame — two integer writes, zero allocation. **⚠ needs a max-span pad:** edges are oriented `a = min-nodeT` (`:542-543`), so `{minU ≤ uR}` is a prefix but `{maxU ≥ uL}` is **not** a suffix. Start at the first edge with `minU ≥ uL − maxEdgeSpan` (measured max |ΔnodeT| 0.106 full / 0.122 lite).
2. **Particle layer — the correction that matters.** Chunked instancing (N sibling `InstancedBufferGeometry` over `subarray()` views, one shared material) **works only on the analytic/WebGL2 tier.** On the WebGPU compute tier the attributes are **material-owned storage buffers** (`neuralFieldCompute.ts:3131-3136` `positionBuffer.toAttribute()` …) and `getDrawParameters()` forces `firstInstance = 0` (`RenderObject.js:576-582`) — N siblings all read the **same first chunk**. Prerequisite either way: `seedBuffers` (`:791-870`) must be re-ordered, because star particles are round-robin interleaved (`:857 (i − edgeTotal) % nodeN`).
3. **The only cull that compiles on both backends** is a `wGate` in `particleScalars` zeroing `sizeK` outside the on-frame window ± pad, built on the shipped `copyGateAt`/`copyMaskAt` idiom (`:1926-1928`, applied `:2200`). ~4 ALU. **It saves fill, not vertex work.**

**GATE:** a GPU capture, not a feeling.
1. Frame time at 1920×935 desktop and on a real mid-tier phone, WebGPU **and** `?backend=webgl2`, ≥ 55 fps sustained across a full scrub of the act.
2. Draw-call and vertex-invocation counts before/after: line layer must show `nEdges·12` ≈ 26 % of total on desktop; particle layer must show the chunk reduction on the analytic tier.
3. Zero visual difference from Stage 2 at any `p` (screenshot diff at 20 samples) — a cull that changes the picture is a bug.
**ROLLBACK:** `const FIELD_CULL: "off" | "gate" | "chunks" = "off"` — three states, `off` is Stage 2 exactly.
**⚠ If gate 1 fails on the phone even with the cull**, the escalation ladder is, in cost order: (i) drop lite-tier density to half (227/436 over the phone ribbon), (ii) shorten the phone field to the run-only length and accept visible ends, (iii) go back to the owner. **Do not silently change the angle — D12 holds the angle.**

---

## STAGE 4 — THE BIRTH FRONT (D14 + D16) (serial, after 3)

**OWNS:** `src/webgl/neural/neuralFieldCompute.ts`, `src/webgl/NeuralLattice.tsx`.

`uReveal` **saturates before the act begins** — proved: target is `vis = clamp((ih + 110 − vpTop)/(0.7·ih),0,1)` (`NeuralLattice.tsx:745-749`), which reaches 1 at `scrollY = secTop − 262`, i.e. **262 px before `p = 0`**; the λ = 2.5 damp (`:750-755`) leaves it ≥ 0.9 by p ≈ 0.13 at a flick and p ≈ 0.02 at reading speed. The per-link stagger (`LINE_REVEAL_STAGGER 0.55`, window `[h·0.55, h·0.55+0.45]`) is **entirely spent on entry.** `uReveal` also **arms the recycle snap** (`:3051`) and drives the coalesce (`:3015`, `:2921`) — it **must keep its meaning**. The front is a **new** scalar.

Six plain `uniform()` scalars — `uBuild`, `uBuildW`, `uFrontKy`, `uFrontS`, `uFrontIW`, `uIgnGain` — **zero blocks, zero varyings, zero storage.** Phase = `nodeT` (already baked `:490`, already bound `uNodeT :1016`, already read in **both** stages `:1207-1209`, `:2645-2646`). Extend `edgeFrame`'s return (`:1342`) with `ia, tA, tB` rather than re-reading the index arrays.

**THE TWO TRAPS, both must be in the diff:**
- **`cut` must carry every factor `alpha` carries.** `cut: float(0.004).mul(cMask).mul(born)` (`:2225`), `vLineCut = varying(float(0.004).mul(maskL).mul(born))` (`:2812`). Without it the link dust — `STREAM_ALPHA 0.012` — pops in at **`born = 0.333`** and link tips at `born ≈ 1`; nodes would fade in and *then* their beads would appear. The scale-invariance proof is the shipped one at `:2214-2222`.
- **`smoothstep` returns exactly 0 ⇒ `0 < 0` is false ⇒ nothing discards.** The whole un-born field rasterises at zero contribution. Fix `:2249`/`:2857` to `lessThanEqual`.
- **Birth is VALUE-ONLY.** Touching `anchor` (`:3015`) trips `WRAP_SNAP_DIST 0.038` at any anchor speed above **0.268 local/s** (`lag = (DAMPING 8.5 / SPRING 60)·v = 0.1417·v`), and `armed` (`:3051`) is 1 on the healthy band ⇒ permanent teleport. It would also look **smooth on WebGL2 and popped on WebGPU** (the analytic tier has no spring, `:2920-2921`). **`simulate()` stays at zero lines changed.**
- **`vLineRest` stays `positionLocal`** (`:2807`) — change only `:2649`, never the baked attribute, or the fray dash crawls. **`tL` (`:2650`) stays on `sL`** or the surge crawls backwards.
- **`uBuild` comes from `p` (the frozen frame, `traverseStore.ts:41-44`), never from `uFlowTime`** — `uFlowTime` is driver-integrated real time (`:624-628`) and does not rewind. D16 forbids it.
- **A slew limiter is not a latch.** `THREE.MathUtils.damp(buildSmooth, f(p), 10, delta)` — converges from both sides, zero state at equilibrium, frame-rate independent (precedent `NeuralLattice.tsx:750-755` at λ = 2.5). **Never `Math.max(prev, next)`**, never a quantised deadband.
- **`cGate` every new brightness term** (`:1927`, template `:2126`) or the copy lane breaches the ROUND 9-B WCAG contract. Ignition is **emissive only, inside the line's soft knee** (`:2786-2792`) so `LINE_LUM_MAX 0.97` still holds.

**GATE:**
1. **Unlatched, provably:** scroll to `p = 0.6`, back to 0.4, forward to 0.6 — the rendered frame at 0.6 is **pixel-identical** both times (allowing AA).
2. `born` ramp: no discontinuity in measured luminance along a link as the front crosses it; the link dust and the chord fade **together**, not in sequence (the `cut` gate).
3. Zero fill from the un-born field (GPU capture: overdraw map shows nothing ahead of the front).
4. Both backends look the **same** across the front (this is the anchor-vs-value proof).
5. λ chosen live in Chrome with the owner.
**ROLLBACK:** `uIgnGain = 0` and `uBuildW` → ∞ (or a `BIRTH_FRONT = false` constant zeroing `born` to 1) restores Stage 3 exactly, in one uniform write.

---

## STAGE 5 — THE RIVER LOOK (D18) (serial, after 4)

**OWNS:** `src/webgl/neural/neuralFieldCompute.ts`, `src/webgl/neural/neuralLatticeConfig.ts`.

**The governing constraint, not to be re-litigated:** `f6cac67` proved live, in Chrome, against the owner's reference image, that a glowing sprite ≥ ~6 px on a 1 px chord reads as a **chain of glowing blobs** — at 7.5 px and again at 10 px. The river's light was never a chain; it was **~5 particles per pixel above the bloom floor**, which this budget cannot buy on a net 4.4× larger. Therefore: **draw the flowing light with the LINE primitive; demote the sprites to grain that rides it.** The line material is the only one with headroom (7/12 after Stage 0B).

Four changes:
- **(A) Continuous luminance on the line.** `riverAt(t) = Σ_{m<M} A_m·[exp(−K·d_m²) ⊕softknee 0.65·exp(d_m/TAIL)]`, M = 4–6 phase-staggered wavefronts at `A_m ≈ 0.35` (vs `SURGE_GAIN 2.2` for the hero surge), `d_m = t − fract(phase_m + uFront)`. Pure function of uniforms; **it IS D14 when `uFront` is the birth front.** Multiplies into `emisRawL` (`:2769-2778`) so **`LINE_LUM_MAX 0.97` still guarantees no link ever blooms.** Rest is byte-identical at `A_m = 0`.
  **⚠ Evaluate in the FRAGMENT stage** (existing `sF = vLineAux.w`, `:2806`) or as a link-constant varying. `LINK_SEGMENTS 6` samples `s` every 0.167; a 0.07-wide gaussian in the vertex stage gets **0.42 samples per σ** → strobe.
- **(B) Particles become grain, gated to the moving band.** Keep 21.3/link and the ∝-length allocation. Inside the band only: alpha `0.012 → ≈0.096` (×8), sprite `3.4 → 6.8 px` (×2) ⇒ overlap **2.04×**, above the codebase's own 1.65× continuity threshold (`:1590-1594`). Per-sprite post-blend at full head ≈ **0.46 — under 1.0, not one new blooming sprite**; the overlap accumulates to ≈0.8–0.9, the same order as the chord's 0.568. Lift `FLOW_SPEED` inside the band only (0.075 → ~0.35 ⇒ 25 px/s) so the shipped velocity-stretch (`:2260-2295`) has something to smear.
- **(C) The bead stops being a blob.** `PACKET_SIZE 2.0 → 0.6`, `BEAD_ALPHA 0.9 → 0.55` ⇒ **4.6 px**, post-blend 2.23 — still blooms, no longer the widest thing on a 1 px line.
- **(D) `STRAND_RADIUS` stays 0.** Non-negotiable (`:650-670`).

**Fill ledger:** +31k (grain) −42k (beads) = **−1.8 %** against the shipped 612k px².
**GATE — the anti-blob checklist, each a measurable predicate:**
1. **Widest sprite riding any link ≤ 5 px** at every `p`.
2. **≤ 1 sprite with post-blend > 1.0 per link** (bloom is `threshold 1.0, intensity 1.1, radius 0.7`, `routeFxStore.ts:63-66` — N bright sprites in a row = N blobs regardless of size).
3. Continuity test **at the LONGEST link, not the mean** — per-link max |ΔnodeT| 0.106 full / 0.122 lite. Requires the ∝-length allocation to stay (`:803-816`).
4. **Measured luminance ≥ 20 px off any chord ≈ 0** — this is the test that distinguishes filament from the round-8-I fog (4828 idle sprites at 0.090 flattened the composition).
5. No hard `min()`/clamp on the head — use the shipped C¹ knee (`LINE_LUM_KNEE 0.7`).
6. Highest-degree node: spokes **decorrelated in phase** even while beads converge (`packetClock` is keyed by the receiving node, `:1808`).
7. Total live beads above 1.0 counted and **reported to the owner** against the declared 5–8 census.
**ROLLBACK:** every change is a constant. `A_m = 0` + `PACKET_SIZE 2.0` + `BEAD_ALPHA 0.9` + band alpha/size gain 0 restores Stage 4 exactly. Put all five in `leva`.

---

## STAGE 6 — RE-DECLARE THE INSTRUMENTS (serial, last)

**OWNS:** `src/components/fx/use-diagonal-traverse.ts`, `src/components/fx/traverse-rate.ts`, `src/webgl/neural/traverseConfig.ts`, plus the research corpus.
- Replace `coverage()`'s presence census with a **vertical-distribution** instrument (the ribbon makes presence vacuous, and the anchor-box version under-reports at ≈35 %, which reads as a regression).
- Split QA gate 3: keep `excursionOf` (`traverse-rate.ts:204-218`) but add `plateauDriftOf` + `lines` + `emPerLine` to the block report (`:591-608`).
- Re-declare the gate text: **"plateau drift ≤ the block's own height, hence em/line ≤ `blk.h/(lines·fontSize)` — 1.50 desktop body, 1.45 phone body, 1.10 ledger display — by construction, at every viewport and at every angle."**
- Publish `geometry.lateralPxAtEnd` = `1.0·secH` = **5358 px = 2.79 screen widths @1920** ✓ D15.
- Publish `maxIslandsOnFrame 1` as by-construction and **`netOnFrame` as OPEN, contingent on mechanism §4.4 shape (c)**.
- Delete the stale `angleDeg 23.61` header block and the `leadVh 1.203` ladder commentary.

---

## PARALLELISM SUMMARY

| | can run concurrently | file set |
|---|---|---|
| **0A · copy** | ✅ with 0B, 0C | `use-diagonal-traverse.ts`, `traverse-rate.ts`, `traverseConfig.ts`, `problem-section.tsx` |
| **0B · packing** | ✅ with 0A, 0C | `neuralFieldCompute.ts` |
| **0C · generator** | ✅ with 0A, 0B | `neuralLatticeConfig.ts` |
| **1 · ladder deletion** | ❌ after 0A | `traverseConfig.ts`, `use-diagonal-traverse.ts`, `problem-section.tsx`, `NeuralLattice.tsx`, `CrystalCluster.tsx` |
| **2 · ribbon field** | ❌ after 0B+0C+1 — **not splittable** | `neuralFieldCompute.ts`, `NeuralLattice.tsx`, `CrystalCluster.tsx`, `traverseConfig.ts`, `neuralLatticeConfig.ts`, `crystalConfig.ts` |
| **3 · cull** | ❌ after 2 | `neuralFieldCompute.ts`, `neuralLinkLines.ts`, `NeuralLattice.tsx` |
| **4 · birth front** | ❌ after 3 | `neuralFieldCompute.ts`, `NeuralLattice.tsx` |
| **5 · river** | ❌ after 4 | `neuralFieldCompute.ts`, `neuralLatticeConfig.ts` |
| **6 · instruments** | ❌ last | `use-diagonal-traverse.ts`, `traverse-rate.ts`, `traverseConfig.ts` |

**The only parallel window is Stage 0.** Everything from Stage 1 on shares `neuralFieldCompute.ts` and/or `NeuralLattice.tsx` and must be serial. Do not dispatch 2–5 concurrently under any circumstances.

---

# PART 4 — THE THREE COPY FIXES

## (a) WIRE THE READING UNIT

**a1 · `problem-section.tsx:465-468`** — one attribute, zero copy bytes. (`UNIT_SELECTOR` at `use-diagonal-traverse.ts:112` already matches `[data-traverse-unit]`.)
```diff
           <div
             ref={chapterRef}
+            data-traverse-unit
             className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,30rem)] lg:items-end lg:gap-12"
           >
```

**a2 · `use-diagonal-traverse.ts`, after `secH` (`:365`)**
```diff
           secH = Math.max(sr.height, 1);
+          const bandH = Math.max(ih - 2 * cfg.bandInset * ih - headerPx, 1);
+          unitSpan.clear();
```

**a3 · inside the block loop, after `blk.win = buildRateWindow(…)` (`:396`), then a second pass**
```diff
               cap,
             );
+            // Accumulate the unit's union span from the values we just
+            // de-transformed. NEVER from the unit element's own rect: a rect
+            // read here is the TRANSFORMED box (the stage-1 P0).
+            if (blk.unit) {
+              const sp = unitSpan.get(blk.unit);
+              if (sp) {
+                if (blk.docTop < sp.top) sp.top = blk.docTop;
+                if (blk.docTop + blk.h > sp.bottom) sp.bottom = blk.docTop + blk.h;
+              } else {
+                unitSpan.set(blk.unit, { top: blk.docTop, bottom: blk.docTop + blk.h, win: null });
+              }
+            }
           }
+          // SECOND PASS — one window per UNIT. A unit taller than the band
+          // cannot satisfy the `opWin` guarantee (the union could cover the
+          // band while a member sits outside it), so it keeps per-block
+          // windows. Self-limiting; no viewport table. The census-invariance
+          // proof depends on this guard: member supports overlap only because
+          // t_j − t_i ≤ unitH − h_j ≤ bandH < bandH + h_i.
+          for (let i = 0; i < blocks.length; i++) {
+            const blk = blocks[i];
+            const sp = blk.unit ? unitSpan.get(blk.unit) : undefined;
+            const unitH = sp ? sp.bottom - sp.top : 0;
+            if (!sp || unitH > bandH) { blk.opWin = blk.win; blk.opTop = blk.docTop; continue; }
+            if (!sp.win) {
+              // Only `windowAt` is ever evaluated on this window — it reads
+              // d/e0..e3 only. NEVER call `rateAt` on it: `x` must stay the
+              // block's own or the two halves of a row move as one flat plane
+              // and §B2.3's two depths are gone.
+              sp.win = buildRateWindow(unitH, headerPx, ih, cfg.bandInset,
+                cfg.alphaReadBody, cfg.collapse ? cfg.alphaReadBody : cfg.alphaEdge, 0);
+            }
+            blk.opWin = sp.win; blk.opTop = sp.top;
+          }
```

**a4 · `apply()` (`:430`, `:439-440`) — the lane guard is load-bearing**
```diff
-            const op = wantOpacity ? s.vhat : 1;
+            // ⚠ THE UNIT'S WINDOW. A row is one statement; a statement with
+            // half of it invisible is a bug, not a beat.
+            //
+            // ⚠ `uv` IS EVALUATED UNCONDITIONALLY, AND THAT IS THE GUARD.
+            // The lane must ride `uv`, never `op`: with `windowOpacity:false`
+            // (or `angleDeg:0` ⇒ rate===0) every block reports op ≡ 1, pinning
+            // frame.laneWindow at 1 for the whole act — and NeuralLattice.tsx
+            // :663-666 scales uCopyLaneW, uCopySoft, uCopyFloor AND
+            // uCopyLineFloor by it. The rollback would carve the mask lane
+            // permanently open, i.e. stop being a rollback.
+            const uv = windowAt(blk.opWin, blk.opTop - sy);
+            const op = wantOpacity ? uv : 1;
@@
-            if (s.vhat > bestV + 1e-6 || (s.vhat > bestV - 1e-6 && u < bestU)) {
-              bestV = s.vhat;
+            if (uv > bestV + 1e-6 || (uv > bestV - 1e-6 && u < bestU)) {
+              bestV = uv;
```

**a5 · `onFocusIn` (`:542`) — WCAG 2.4.11 follows the unit**
```diff
-          const targetY = blk.docTop - blk.win.yc;
+          const targetY = blk.opTop - blk.opWin.yc;
```

**a6 · dev handles must mirror `apply()` or both gates lie** — `laneCheck()` `:679-685` and `coverage()` `:781` switch to `windowAt(b.opWin, b.opTop - sy)`; `park()` (`:646-656`) re-points to `b.opWin.e0/e3`.

**Owner-visible consequence:** a ledger row's headline and paragraph now appear and disappear **together**. Side effect to disclose, not hide: both halves tie at every scroll position, so the existing nearest-to-centre tie-break governs a much longer span, and `frame.laneHalfPx` steps between the `h3`'s full-container width and the `p`'s `max-w-[34em]` as the row crosses centre. (The step exists today; (a) lengthens it.) The coherent fix — publish the unit's **union** copy box — widens the mask carve-out and is a separate owner decision.

## (b) THE CAP IS TWICE THE AUTHORED LAW

**`use-diagonal-traverse.ts:391-395`**
```diff
-              // ⚠ The cap is the block's OWN HEIGHT — "a paragraph may drift
-              // sideways by at most its own height" (§B2b) …
-              cfg.capBody && blk.kind === "body" ? blk.h : 0,
+              // ⚠ HALF THE BLOCK'S HEIGHT, AND THE HALF IS THE WHOLE POINT.
+              // capPx is the tanh CEILING on |x_slow|, and
+              // x_slow = R·α_read·(y_c − y) is CENTRED and antisymmetric over
+              // the block's on-screen life (traverse-rate.ts:187-189; y_c is
+              // the exact midpoint of y ∈ [headerH − h, ih]). Peak-to-peak is
+              // therefore 2·capPx·tanh(…), NOT capPx. Passing blk.h bought
+              // TWICE §B2b's law. With blk.h/2 the ceiling is exactly
+              // blk.h/(lines·fontSize) — the block's own CSS leading for the
+              // two body wrappers — at every viewport AND every angle, because
+              // tanh saturates.
+              cap,
```

## (c) THE PHONE'S DISPLAY TYPE

**c1 · `traverseConfig.ts`** — new rollback lever (free through `setTraverseConfig`, `:377-379`)
```diff
   capBody: boolean;
+  /**
+   * D15-bis. Extend the §B2b cap to DISPLAY blocks that MEASURE more than one
+   * line. §C0's premise — "a single line has no return sweep, so display drift
+   * is free" — is true of the sweep and FALSE of the input: at 390×844 EN,
+   * `02· No traces` and `03· No boundaries` wrap to two lines (h 67 px at a
+   * 31.9 px line-height). `false` restores the uncapped display rate exactly.
+   */
+  capDisplayMultiline: boolean;
@@
   capBody: true,
+  capDisplayMultiline: true,
```

**c2 · `use-diagonal-traverse.ts`** — measure the lines at MEASURE time, never in a frame
```diff
+/** Used line-height in px. getComputedStyle returns the USED value for a
+ *  numeric line-height; `normal` is the one case that will not parse, and
+ *  1.2·font-size is its CSS default. MEASURE TIME ONLY. */
+function lineHeightPx(el: HTMLElement): number {
+  const cs = getComputedStyle(el);
+  const lh = parseFloat(cs.lineHeight);
+  if (Number.isFinite(lh) && lh > 0) return lh;
+  const fs = parseFloat(cs.fontSize);
+  return Number.isFinite(fs) && fs > 0 ? fs * 1.2 : 1;
+}
```
```diff
   copyW: number;
+  /** Measured line count of the COPY BOX. Drives the display cap and gate 3. */
+  lines: number;
@@
             blk.copyW = Math.max(cr.width, 1);
+            // From the COPY box (h3 / [data-chapter-h2] / p), not the wrapper —
+            // the chapter's display wrapper also carries the eyebrow.
+            blk.lines = Math.max(1, Math.round(cr.height / lineHeightPx(blk.copyEl)));
@@
             const alphaRead = blk.kind === "display" ? cfg.alphaReadDisplay : cfg.alphaReadBody;
+            const capOn = blk.kind === "body"
+              ? cfg.capBody
+              : cfg.capDisplayMultiline && blk.lines > 1;
+            const cap = capOn ? blk.h / 2 : 0;
```
Detection cross-checks **7/7** against every supplied live measurement (67/31.9→2, 35/31.9→1, 56/28.15→2, 84/28.15→3, 159/31.83→5, 61/20.3→3, 108/21.6→5).

## THE RECOMPUTED LEGIBILITY TABLE AT 45°

Constants resolved from the repo: `--header-h: 6.1rem` (`globals.css:85`) against `html{font-size:clamp(16px,0.85vw,18px)}` (`globals.css:333`) ⇒ root **16.32 px @1920**, 16 px @1280/@390 ⇒ `headerH` 99.552 / 97.600 / 97.600. `bandInset 0.12`, `α_read` 0.25 body / 0.50 display, `α_edge 3.5` (`traverseConfig.ts:341-345`). `bandH = 0.76·ih − headerH` = **611.05 / 449.60 / 543.84**.
**Drift is computed on the OPAQUE span** — `2C·tanh(R·α_read·(bandH − unitH)/(2C))` — because (a) makes opacity ride the unit window. This is the correction the first pass missed.

### BODY COPY

| viewport | block | h | ln | unitH | 45° shipped `C=h` | **45° after (a)+(b)** | ceiling | 23.61° today |
|---|---|---|---|---|---|---|---|---|
| 1920×935 | ledger body 2 ln | 56 | 2 | 143.2 | 2.522 ✗ | **1.447** ✓ | 1.50 | 1.474 |
| 1920×935 | ledger body 3 ln | 84 | 3 | 171.2 | 1.955 ✗ | **1.289** ✓ | 1.50 | 0.985 |
| 1920×935 | chapter desc 5 ln | 159 | 5 | — | 1.022 | **0.916** ✓ | 1.50 | 0.462 |
| 1280×720 ᵈ | ledger body 2 ln | 45.6 | 2 | ~114 | 2.409 ✗ | **1.426** ✓ | 1.50 | 1.348 |
| 1280×720 ᵈ | ledger body 3 ln | 68.4 | 3 | — | 1.807 ✗ | **~1.29** ✓ | 1.50 | 0.886 |
| 390×844 | ledger body 3 ln | 61 | 3 | 140 | 2.199 ✗ | **1.350** ✓ | 1.45 | 1.183 |
| 390×844 | chapter desc 5 ln | 108 | 5 | — | 1.397 | **1.148** ✓ | 1.50 | 0.651 |

ᵈ **derived, not measured** — no 1280 line counts exist. The ledger derivation is tight (both 1920 and 1280 paragraphs are limited by `max-w-[34em]`, not the column, so the em-measure and line counts are identical). The chapter desc is ±1 line and the verdict does not turn on it.

**Body copy passes at 45° after (a)+(b), with ~3.5 % margin** (worst 1.447). The reason is structural: after `blk.h/2` the ceiling is the block's own leading, so **the angle stops being a legibility lever for body copy** — going steeper still adds ≤1.4 %. Note out loud what the storyboard never states: **the 1.50 fail line and the leading-1.5 ceiling are the same number.** Body copy passes only because `tanh` never quite reaches 1. Real margin needs `cap < h/2` (0.40·h ⇒ 1.20 ceiling) — a **separate** owner decision.

### DISPLAY TYPE

| viewport | block | h | ln | 23.61° today | 45° uncapped (shipped law) | **45° after (c)(i)** |
|---|---|---|---|---|---|---|
| 390×844 | `02· No traces` / `03· No boundaries` | 67 | 2 | 1.714 ✗ | **3.32 em/line = 201.9 px = 51.8 % of frame, while fully opaque** | **1.10 ✓** (66.7 px) |
| 390×844 | `01· No evals` | 35 | 1 | 111.2 px | **207.9 px = 53.3 % of frame** | **not caught — one line** |
| 1920×935 ᵈ | ledger h3 | 66.8 | 1 | 118.9 px | 233.9 px (12 % of frame) | not caught |

### (c) — THE TWO OPTIONS AND THE RECOMMENDATION

**(i) Cap multi-line display type** (diffs c1/c2). 3.32 → **1.10 em/line**; drift 202 px → 67 px, the same order as the paragraph beneath it, so the row travels as one plane again.
*Costs:* the 0.50/0.25 depth differential is destroyed **inside the plateau, on the phone only** (the two-line headline saturates its cap at 99.8 %). Desktop ledger headlines are one line and are untouched. The chapter H2 is the only multi-line display block at desktop and loses some plateau drift — **the exact figure is UNVERIFIED** (its `h` is unmeasured; 6 % if `h ≈ 321 px`, 14–21 % at 250–310 px). One flag, `false` restores today exactly, inert under RM/SSR/no-JS/tier-off.

**(ii) Shrink the mobile display type so the headlines fit one line.** COPY FREEZE is satisfied (a font-size is not a character). Three objections:
1. **It suppresses the metric without fixing the motion.** Made one line, `03· No boundaries` drifts *more*: `h` 67 → ~35 ⇒ longer plateau ⇒ **~208 px on a 390 px frame.** "em/line" merely stops being defined.
2. **The size needed is not derivable from the repo and is probably brutal.** EN needs ≈≤23–24 px (−23 %) from today's 30.4 px (`problem-section.tsx:632`); **IT was never measured** and is longer on all three rows, likely ≤20 px (−34 %), at which point the display/body contrast on the phone falls from 2.17:1 toward 1.5:1 and the ledger stops reading as display type.
3. **It is not reversible by any traverse lever.** `angleDeg:0`, `gapVh:0`, `collapseWindow()` all leave the shrunken type in place, at every scroll position, in RM, in SSR, with WebGL off.

**RECOMMENDATION: (i).**

### THE RIDER — a third measured defect (i) does NOT close

`01· No evals` is one line, so `capDisplayMultiline` skips it: at 45° it slides **207.9 px (53.3 % of the frame) while opaque**, next to a paragraph sliding ~70 px. **After (a)+(b)+(c)(i) the phone's three ledger rows behave differently from one another** — 02/03 move as one plane, 01 tears — and that inconsistency reads as a bug faster than the original drift did. Two closures, both owner-visible:
- **cap ALL display at `h/2`** — uniform phone rows, but it also collapses the desktop headline/paragraph parallax (234 px → 67 px). That parallax **is** the visible depth of the ledger. Do not take it silently.
- **key the cap to the frame, not the line count**: cap display when the uncapped plateau drift exceeds `k·innerWidth`, `k ≈ 0.15` ⇒ 58 px @390, 288 px @1920. Catches both phone headlines (208 / 202 px), leaves desktop byte-identical (234 < 288). **One new authored constant, one measure-time branch. This is the better answer.**

---

# PART 5 — DA MOSTRARE AL PROPRIETARIO (in italiano, pronto da incollare)

> **ROUND 12 — otto cose da guardare o da decidere prima/durante la build**
>
> **1. La rete che hai disegnato non entra nei limiti del backend così com'è — ma la facciamo entrare.**
> Una rete unica, continua, alta quanto il frame e lunga quanto tutta la corsa laterale (7278 × 935 px a 1920×935) alla densità di oggi richiede circa 660–720 nodi e 1250–1400 collegamenti. Le tabelle dei collegamenti diventano ~20 KB ciascuna, contro un limite di 16 KB garantito dal browser: **non ci sta**. La soluzione è tecnica e invisibile: impacchettiamo i due indici di ogni link in un solo numero (4 link per slot). Risultato: **4,9 KB invece di 20 KB, il 30 % del limite, e in più liberiamo uno slot** che oggi non abbiamo. Non serve nessun trucco più esotico.
> **Cosa cambia per te: niente, visivamente.** Ma è un lavoro che va fatto *prima*, non dopo, ed è il motivo per cui la prima settimana produce poco di visibile.
> Nota onesta: **sul telefono è obbligatorio**. Lì la rete è ancora più lunga in proporzione (12,8 schermate contro 3,8) e senza l'impacchettamento non partirebbe proprio.
>
> **2. DENSITÀ — questa è una decisione tua, e va presa guardando, non leggendo.**
> Oggi la nuvola di nodi occupa poco più della metà del frame. Se la rete nuova riempie tutto il frame **alla stessa densità di oggi**, in ogni istante vedi **1,83× più rete** di quanta te ne sia mai stata approvata. Le due opzioni:
> - **A — stessa "texture"**: ~660 nodi. La grana è identica a oggi, ma ce n'è di più a schermo. Più fitto, più "denso".
> - **B — stessa lettura**: ~391 nodi. In ogni istante vedi esattamente i 103 nodi di oggi, distribuiti su tutto il frame invece che in una lente centrale. Più arioso.
> **Entrambe entrano** (dopo il punto 1). Ti prepariamo le due versioni affiancate in Chrome e scegli in trenta secondi.
>
> **3. I bordi alto e basso — li hai accettati, ma non sono simmetrici come pensavi.**
> Hai scelto "alta esattamente quanto il frame", accettando che si veda dove finisce sopra e sotto. Misurato: oggi il generatore lascia **77 px vuoti sopra e 153 px sotto** — il doppio. Non è un taglio netto, è una sfumatura organica (la rete si dirada e finisce), ma è **sbilanciata**. Lo correggiamo ri-centrando la distribuzione, non allargandola. **Va guardato**, perché il bordo è la parte più visibile della rete: la fascia di lettura al centro è volutamente più scura, quindi i bordi risultano *più luminosi* del centro.
>
> **4. LA LINEA NITIDA SOTTO IL FIUME — sì, resta. Ed è importante che tu confermi.**
> Ricordi quando siamo passati dalle "catene di palline luminose" alla linea sottile continua, live in Chrome, con la tua immagine di riferimento davanti? Quella linea **rimane**, sotto tutto. Il fiume di luce di agosto non torna come sciame di particelle grosse — torna come **luminosità che scorre dentro la linea stessa**, con le particelle declassate a grana fine che la accompagna.
> Tre motivi per cui la linea deve restare, non è un vezzo:
> - è l'unica cosa che esiste quando **niente sta scorrendo** — a riposo, quando scrolli all'indietro, con le animazioni ridotte, senza JavaScript, e sul motore grafico di riserva;
> - è la **garanzia anti-pallina**: con una linea continua sotto, un buco momentaneo nella grana non può leggersi come catena spezzata;
> - costa una chiamata di disegno e due slot su otto.
> **Confermami che va bene**, perché è l'unica decisione di questo round che ne riapre una già chiusa con te.
>
> **5. Le "perline" (i pacchetti che corrono sui link) sono già oggi il primitivo che hai bocciato.**
> Misurato sul build attuale: sono **10,3 px** di diametro su una linea da 1 px — esattamente la dimensione che a suo tempo hai rifiutato. Oggi non si nota solo perché ce n'è **0,33 per link**. Proposta: **4,6 px**, più scure ma comunque sopra la soglia di bagliore. Restano oggetti che brillano e corrono, smettono di essere la cosa più larga sulla linea.
> **Correlato, e va detto:** il documento di progetto dichiara "5–8 punti luminosi sopra soglia in ogni istante". Il build attuale ne ha **circa 76** (le perline). È così **già oggi**, non è una conseguenza di questo round. Va deciso esplicitamente: lo lasciamo, o lo riportiamo nel budget dichiarato? Abbiamo due leve pronte (ridurre a ~32 o a ~12).
>
> **6. Il "respiro" della rete quando torni indietro — questo devi vederlo, non te lo posso raccontare.**
> Hai chiesto che la rete si costruisca davanti al lettore e che **scrollando all'indietro si smonti** (niente memoria, tutto in funzione della posizione). Conseguenza esatta, in numeri: a 45° ogni pixel di scroll è un pixel di spostamento laterale, quindi **tornando su di 200 px una striscia verticale di 200 px — il 10 % dello schermo — si smonta**, e riscendendo si rimonta identica. Reversibile e simmetrico. Tutto ciò che sta più indietro del fronte è fermo: è un fenomeno **locale**, non un lampeggio globale.
> Con un trackpad nervoso il fronte trema di ±10 px: sulle linee è invisibile, **sulle stelle che superano la soglia di bagliore si vede**. Mettiamo un filtro morbido (non un blocco: si smonta lo stesso) e **la costante la scegli tu in Chrome**, come sempre.
>
> **7. La fine dell'atto ha bisogno di una dissolvenza scritta a mano.**
> Con una rete unica che resta a schermo per tutto l'atto, nel momento in cui la sezione finisce la rete è ancora **al centro del frame**. Se la spegniamo di colpo, è un taglio netto. Serve una dissolvenza autorata sull'ultima schermata circa. Non è un dettaglio tecnico: è **un beat in più da approvare**.
>
> **8. La pietra (il cristallo).** Con la geometria nuova la pietra entra in scena **a metà corsa** (dal 38 % al 74 % dell'atto), non "tardi" come nella storyboard. Se la vuoi tardi, la spostiamo — è un numero. E va **ri-agganciata alla rete anche in verticale**, altrimenti si sgancia (la rete resta ferma sullo schermo, la pietra scorre con la pagina).
>
> **9. Telefono, riga 01 del ledger.** Con la correzione che stiamo facendo alla deriva laterale del testo, sul telefono le righe `02· No traces` e `03· No boundaries` si muovono come un blocco unico con il loro paragrafo, mentre `01· No evals` (che sta su una riga sola) continua a scivolare di **208 px su uno schermo da 390** — cioè si stacca dal suo paragrafo. Due modi per chiudere: (a) frenare *tutti* i titoli — uniforme, ma perdiamo anche la profondità titolo/paragrafo sul desktop; (b) frenare in base alla **larghezza dello schermo** — chiude il telefono e lascia il desktop identico. **Consigliamo (b).**

---

# PART 6 — WHAT CANNOT BE ANSWERED WITHOUT A PROFILER OR A LIVE MEASUREMENT

**Requires a GPU capture (this is the list that decides whether D17 ships):**
1. **Whether ~34 000 (desktop, on-frame parity) / ~53 400 (areal parity) / ~58 700 (phone) particles × 4 quad verts × `anchorNode()` fit the frame budget on the WebGL2 analytic tier**, where there is no compute stage to amortise the anchor evaluation (`NeuralLattice.tsx:702-704` already prices this shape for 9 000). **This is the single number that decides the design.** Nothing in source answers it.
2. Actual GPU ms for the additive fill. The config's whole budget (`neuralLatticeConfig.ts:1092-1101`, 612k px²) is **px²-based, never measured in time**.
3. Bloom-pass cost at 3.8–5.9× the star count, and overdraw in the dense core.
4. WebGPU compute dispatch time at 34–59k particles.
5. Whether the added ~16 ALU/vertex for the birth front registers at all — the particle vertex stage is far more likely bound by uniform/storage fetch latency than by ALU. Unmeasurable from source.
6. Whether `select`-built branch divergence in the link self-draw costs anything at ~10–15k line vertices.
7. Whether the per-render `gl.bufferData` full re-upload (now **confirmed**, §2.1) shows up as a CPU stall at 43 KiB/render-object/render.

**Requires a compile on the fallback backend (`?backend=webgl2`) — Stage 0B's gate:**
8. Whether `uniformArray(Vector4[])` compiles. **Unexercised anywhere in this repo.** Everything in Part 1 depends on it.
9. The **true** particle-stage block count — the source says "9 + **up to** 3 = 12", and `objectGroup` is `shared = false`, so the stage could be 10 or 11. The 12/12 "zero headroom" claim is a hardening of the source, not a verified fact.

**Requires a live look in Chrome (owner is the instrument):**
10. Whether the star-core bloom ripple from the unlatched front is visible — depends on the PostFX threshold knee and the tonemapper, neither derivable from alpha arithmetic.
11. The follower λ for the birth front.
12. Whether the growing-tip soft fade (a happy accident of `sF = sL` feeding `EDGE_FADE_IN/OUT`) reads as a drawing head or as a defect.
13. Whether the grain-at-2.04×-overlap reads as a filament or as fog. The 20-px-off-chord luminance test is the objective proxy; the verdict is his.
14. Density: areal parity vs on-frame parity (§Part 5 point 2).

**Requires a live DOM measurement not present in any round:**
15. **The chapter display block's `h` at 1920×935 and 1280×720** — every claim about what (c) costs on desktop back-solves from it, and it has never been measured.
16. **All 1280×720 line counts** — derived, not measured.
17. **The IT ledger headline widths at 390 px**, both for the (c)(ii) option and to confirm (c)(i)'s two-line detection holds in Italian.
18. The delivered node/edge tables under the new ribbon generator at each shipping viewport — the E/N ratio measured 1.88–2.01 in a thin slab, and seed variation moved the first-break point by ±30 nodes across five seeds.

---

# STAGE 1 BLOCKER, MEASURED LIVE 2026-08-25 — the reading-unit fix silently disables itself below 530 px of viewport height

The Stage 0 adversarial review (finding 4.4) could not settle whether the `unitH > bandH`
guard in `use-diagonal-traverse.ts` is reachable, and asked for a live measurement before
Stage 1. **It is reachable, and it fires at an ordinary viewport.**

Measured in Chrome against the Stage 0 working tree, `#problem`, EN, 768 px wide:

| viewport height | `bandH` = 0.76·ih − 97.6 | chapter union = 305 px | guard |
|---|---|---|---|
| 620 | 373.6 | fits | quiet |
| 560 | 328.0 | fits | quiet |
| 540 | 312.8 | fits | quiet |
| 530 | 305.2 | fits (0.2 px) | quiet |
| **520** | **297.6** | **exceeds** | **FIRES** |
| 500 | 282.4 | exceeds | FIRES |
| 480 | 267.2 | exceeds | FIRES |

**Exact threshold: `ih = 529.7 px` at 768 px wide, in English.** Confirmed by the handle
directly at 768x480, where `__sersanTraverse_problem.blocks` reports `unit: false` on both
chapter blocks and their `unitH` collapses from the union (305) to their own heights
(209 and 72).

**Why this matters more than its severity suggests.** The failure mode is not an artifact —
it is HEAD's behaviour. When the guard fires, each block reverts to its own per-block
window, which is exactly what shipped before round 11.5, so the round-11.5 tear comes back:
a fully opaque paragraph under an invisible headline. **There is no signal of any kind**
except `unit: false` in a dev-only getter. A reader on a 13-inch laptop with a short window,
or any window with devtools docked at the bottom, gets the defect this round exists to fix,
and nothing reports it.

**Italian is worse and was not measured.** The chapter strings are longer in IT, so the
union box is taller and the threshold height is higher. Measure before choosing the fix.

**The fix is a Stage 1 item, not Stage 0** — its failure mode is a regression to HEAD rather
than a new defect, so the Stage 0 checkpoint is still safe to commit. Two shapes:
- a CONTINUOUS fallback (pair on the tallest sub-unit that fits, rather than falling all the
  way back to per-block), which removes the cliff entirely; or
- keep the cliff but make it visible: a dev warn plus a published `unitFallback` count on
  `coverage()`, so it can never again be silently true.
The first is preferable — a guard whose whole job is "the lemma's precondition failed"
should degrade, not switch off.

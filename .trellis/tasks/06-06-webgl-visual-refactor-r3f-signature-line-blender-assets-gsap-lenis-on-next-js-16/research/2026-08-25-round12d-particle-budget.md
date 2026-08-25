Files snapshotted at `neuralLatticeConfig.ts` md5 `5f1b7371896d4f8a9d23e7a47be94e09`, `neuralFieldCompute.ts` md5 `6af56eb47e73041509ba62ed1e5c4c4e` (both unchanged during this pass; HEAD is `581a174`, working tree dirty). Line numbers are that snapshot's.

# TASK A — THE BUDGET

## 0. THE UNIT ERROR THAT INVALIDATES THE EXISTING LEDGER (read this before the tables)

**Every "px" figure in `neuralLatticeConfig.ts`'s sprite ledger is `NEURAL_POINT_SIZE × sizeK`, not pixels.** The real diameter is that number divided by the view-space distance.

`neuralFieldCompute.ts:2559-2592` (`buildVertex`):
```
sizeNode = uPointSize · uPixelRatio · sizeK · depthK / max(dist, 0.001)
clip.xy += off · sizeNode / uViewport · 2 · clip.w
```
`QUAD_CORNERS` is ±0.5 (`:792`), so after the perspective divide the screen offset is `corner · sizeNode` and **`sizeNode` is the diameter in DEVICE px**. `dist` ≈ `CAMERA_Z` = 12 (`src/webgl/constants.ts:5`); the traversed branch's authored range is [10.08, 13.92].

The repo states this itself for the identical formula: `src/webgl/HeroTextParticles.tsx:462-476` — quadExtentDevicePx = POINT_SIZE × dpr / dist, "Every mote is therefore deeply SUB-PIXEL."

| element | config ledger | real CSS-px ⌀ (÷12) |
|---|---|---|
| link dust (mean fringe) | 3.4 | **0.283** |
| link core / fringe | 9.4 / 2.27 | 0.78 / 0.19 |
| packet bead | 10.3 | **0.849** |
| star core | 15.1 | **1.258** |
| star flare tip / mean ray | 3.88 / 8.4 | 0.32 / 0.70 |

Consequences, all load-bearing here:

1. **The 1.65× continuity check at `:2371-2390` compares ledger units to real CSS px.** It reads `3.4 px sprite ÷ 3.3 px spacing ≈ 1.0×`. The true ratio is `0.283 ÷ 3.95 = 0.072×` — **the link strand is 14× sparser than "dotted", i.e. invisible**, not "one alpha decision from continuous" (`2026-08-25-round12c-river.md` §3 is wrong on this).
2. **The 612k px² fill ledger (`:1882-1892`) mixes units** — the sprite terms are ledger-units², the line term (`227 × 71 px × 1 px`) is real px². In real CSS px² at dpr 2 the shipped band is:

| | CSS px² | share |
|---|---|---|
| star cores 1,242 × π(1.258)²/4 | 1,543 | 12.1% |
| star flares 2,898 × π(0.70)²/4 | 1,115 | 8.7% |
| resting dust 4,828 × π(0.283)²/4 | 303 | 2.4% |
| beads 76 × 6 × π(0.849)²/4 | 257 | 2.0% |
| **LineSegments 227 × 83.9 px × 0.5 CSS px** | **9,525** | **74.7%** |
| **total** | **12,743** | |

**Three quarters of the band's delivered light-bearing area is the 1-px chord the owner just deleted** (85.6% at dpr 1). That is the size of the hole the particles must fill, and it is the honest framing of D22's reversal.

## 1. TODAY'S BASELINE

Allocation, `seedBuffers` (`neuralFieldCompute.ts:897-999`, split at `:906-919`), `NODE_FRACTION 0.46` (`neuralLatticeConfig.ts:1896`), `SPARK_COUNT 32` (`:1951`):

```
9000 total = floor(9000·0.46) 4140 stars + 32 sparks + 4828 link particles
per star = 4140/103 = 40.19      per link = 4828/227 = 21.27  (∝ length, :917)
```
Mean link at 1920×935 (`rect.h` = 0.8597·935 = 803.8): `meanSpacing 0.1052 × 803.8` = **83.9 px** ⇒ spacing **3.95 px**, overlap **0.072×**.

**Sprites post-blend > 1.0 today:** the star emis×alpha product is monotonic from core to tip and the tip is 1.029 (`:1806-1814`), so nominally **all 4,140 star sprites**, plus the beads. Bead threshold, solved from the config's own chain (`lum = 0.6201+0.14265τ`, `emis = 2.415(1+1.2τ)`, `alpha = 0.012+0.888τ`): post-blend crosses 1.0 at **τ\* = 0.435** ⇒ the `exp(−d²)` packet window is |Δs| ≤ 0.0638 of a link = 0.128 ⇒ **2.71 sprites per bead**; 227·2/6 = 75.7 live beads ⇒ **205 bead sprites**.

**Total ≈ 4,345 sprites above the bloom threshold every frame** (conservative floor 1,447 if DOF/copy-mask push the 3%-over flare tips under). The storyboard's declared census is "5–8" (`2026-08-24-round11-diagonal-traverse-storyboard.md:342`); the corpus flagged the 76 beads but never counted that a "star" is 40 sprites. **The census is off by ~3 orders of magnitude and has been since round 8-G.**

## 2. THE CONTINUITY CONDITION

The codebase's own threshold, `neuralLatticeConfig.ts:2379-2385`:
- negative: at 1.98 px, "0.79× the spacing, i.e. NO OVERLAP … a dotted line"; the 4.5 px core "overlapped only 1.8×"
- positive: at "**4.1px** (1.65×). Every cross-section strand now overlaps its neighbour → one continuous filament."

⇒ **`d / s ≥ 1.65`**, s = along-link spacing, d = sprite diameter, both in the same real units.

With `n` sprites on a link of length `L`: `s = L/n` ⇒

```
n(L, d) ≥ 1.65 · L / d
```
and, because the allocation is ∝ length (`:917`), the field total is exactly `N_link = 1.65 · ΣL / d`.

Independent corroboration (not from the codebase): a 1-D train of Gaussians of width σ at pitch s has first-harmonic ripple `2·exp(−2π²σ²/s²)`. A uniform disc of diameter d has σ = d/4. Ripple ≤ 10% ⇒ `s ≤ 2.57σ = 0.64d` ⇒ **d/s ≥ 1.56**. The shipped 1.65 corresponds to ~7% ripple. The empirical threshold is right.

Lateral scatter does not dilute this: `STRAND_RADIUS = 0` (`:1463`) and `STRAND_THICKNESS = 0.0006` (`:1468`) = 0.56 px, so the distribution is effectively 1-D on the chord.

## 3. THE TABLE

**Geometry — measured, not modelled.** I transcribed `buildPlexus`'s ribbon arm verbatim (`neuralLatticeConfig.ts:1039-1330`, params from `RIBBON_DEFAULTS:554-578` + `ribbonPlexusParams:747-780`, ms 11.37, well 0.10/0.16) and it reproduces the committed measured table (`:669-673`) **exactly** — N/E = 389/814, 656/1332, 825/1709, 710/1478. Script: `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/ba6d249f-d877-410c-800b-3da371f4fd94/scratchpad/plexus.mjs`.

Two length measures, because the field is sheared: `nodeAt`→`fieldMap` (`neuralFieldCompute.ts:1428-1429`) applies `y = v + uFieldSlope·x` with μ = −(vw/ih)/R, so `μ·L·ih ≡ −vw` and **screen dy/dx = +1 exactly**. Screen length = `hypot(a, a−b)` with a = Δx·7278, b = Δy·935. The eye sees SCREEN.

| arm | N | E | mean link (screen) | **longest link (screen)** | ΣL (screen) | max·ΔnodeT· |
|---|---|---|---|---|---|---|
| onFrame 391 | 389 | 814 | **152.5 px** | **340.8 px** | 124.1k px | 0.0289 |
| areal 662 | 656 | 1332 | **122.2 px** | **279.1 px** | 162.7k px | 0.0239 |
| nearest 835 | 825 | 1709 | **111.6 px** | **256.0 px** | 190.7k px | 0.0215 |
| lite 716 (390×844) | 710 | 1478 | 90.0 px | 206.9 px | 133.0k px | 0.0229 |

Unsheared field-local means are 128.4 / 103.1 / 94.6 / 79.2 px; the shear adds 18–19% on the mean and up to 43% on the longest.

**Corrections to the brief:** E is 814/1332/1709, not 743/1258/1600. And max ·ΔnodeT· is **0.0215–0.0289** — the 0.106/0.122 figures are the OLD 103-node ellipsoid band and do not apply to the ribbon.

**n = 1.65·L/d** (CSS px), stars at today's 40.19:

| arm | d | per mean link | **per longest link** | link total | +stars | grand | vs 36 000 cap |
|---|---|---|---|---|---|---|---|
| onFrame | 1.5 | 168 | **375** | 136.5k | 15.6k | 152.1k | 4.23× |
| | 2.0 | 126 | **281** | 102.4k | 15.6k | 118.0k | 3.28× |
| | 2.5 | 101 | **225** | 81.9k | 15.6k | 97.5k | 2.71× |
| | 3.0 | 84 | **187** | 68.3k | 15.6k | 83.9k | 2.33× |
| | 4.0 | 63 | **141** | 51.2k | 15.6k | 66.8k | 1.86× |
| areal | 1.5 | 134 | 307 | 179.0k | 26.4k | 205.3k | 5.70× |
| | 2.0 | 101 | 230 | 134.2k | 26.4k | 160.6k | 4.46× |
| | 2.5 | 81 | 184 | 107.4k | 26.4k | 133.7k | 3.72× |
| | 3.0 | 67 | 154 | 89.5k | 26.4k | 115.8k | 3.22× |
| | 4.0 | 50 | 115 | 67.1k | 26.4k | 93.5k | 2.60× |
| nearest | 1.5 | 123 | 282 | 209.8k | 33.2k | 242.9k | 6.75× |
| | 2.0 | 92 | 211 | 157.3k | 33.2k | 190.5k | 5.29× |
| | 2.5 | 74 | 169 | 125.9k | 33.2k | 159.0k | 4.42× |
| | 3.0 | 61 | 141 | 104.9k | 33.2k | 138.0k | 3.83× |
| | 4.0 | 46 | 106 | 78.7k | 33.2k | 111.8k | 3.11× |

Cap = `RIBBON_PARTICLE_SCALE_MAX.full 4.0 × 9000` = 36 000 (`:718-722`); lite = 3.0 × 3200 = 9 600.

**Fill (real CSS px²).** Strand footprint = ΣL·d; raster/overdraw = n·πd²/4 = 1.296·ΣL·d.

| onFrame d | footprint (field) | raster | **on frame (÷3.791)** | % of 1920×935 |
|---|---|---|---|---|
| 1.5 | 186.2k | 241.2k | 49.1k | 2.74% |
| 2.0 | 248.2k | 321.6k | 65.5k | 3.65% |
| 2.5 | 310.3k | 402.1k | 81.8k | 4.56% |
| 3.0 | 372.3k | 482.5k | 98.2k | 5.47% |
| 4.0 | 496.4k | 643.3k | 130.9k | 7.29% |

Against today's real on-frame total of **12.7k CSS px²** (75% of it the chord). At d = 2 the new filament is 5.2× today's total delivered area — but it replaces a chord that was 9.5k of it, so the net rise in additive light is ~5×, not 5.2×.

**What the currently-authored counts actually deliver, if nothing but the field changes.** Under the shipped ∝-length split at the authored budgets:

| arm | count | link particles | spacing | d required for 1.65× |
|---|---|---|---|---|
| onFrame | 34 006 | 18 332 | 6.77 px | **11.2 CSS px** |
| areal | 36 000 | 19 408 | 8.38 px | **13.8 CSS px** |
| nearest | 36 000 | 19 408 | 9.83 px | **16.2 CSS px** |
| lite | 9 600 | 5 152 | 25.8 px | **42.6 CSS px** |

Those are all far past the primitive `f6cac67` rejected. **As currently budgeted, the particles cannot draw the line at any diameter that is not a blob.**

**Sizing lever.** `d_css = uPointSize · sizeK_link / dist`. To move link dust from 0.283 to d you need `NEURAL_POINT_SIZE` 39.8 / 53.0 / 66.3 / 79.5 / 106.0 — but that scales stars and beads too. Carry it on `DUST_SIZE` (`:1680`) instead, which multiplies only the stream branch (`neuralFieldCompute.ts:2374-2380`): 0.55 → **2.92 / 3.89 / 4.86 / 5.83 / 7.78**. The bead is `dust × (1 + PACKET_SIZE 2.0)` = 3× the dust, so at d = 2 the bead becomes 6 CSS px — **D24's `PACKET_SIZE 2.0 → 0.6` stops being a polish item and becomes a precondition**; with it the bead is 1.6 × d = 3.2 CSS px.

## 4. VERDICT — WHAT IS AFFORDABLE

**Nothing in the table above fits either tier.** The cheapest cell (onFrame, d = 4, the blob diameter) is 1.86× the cap and 7.4× the shipped 9 000.

Solving the other way: with stars kept, the 36 000 cap leaves 20.4k link particles ⇒ **d = 10.05 CSS px**. With stars deleted entirely ⇒ **d = 5.69 CSS px**. Both are the rejected primitive.

**The trade only closes if the particles stop paying for the 73.6% of the field that is off frame.** At any instant exactly 1/L = 1/3.791 of the ribbon is on frame (`2026-08-25-round12c-geometry.md` §3.3; measured on-frame 102.6 nodes / 214.7 links, `neuralLatticeConfig.ts:669`). Re-homing particles to a rolling on-frame edge window:

| arm | d | link particles | +stars | total | vs cap | vertices/frame |
|---|---|---|---|---|---|---|
| onFrame | 2.0 | 27.0k | 4.1k | **31.1k** | **0.86×** | 124.5k |
| | 2.5 | 21.6k | 4.1k | **25.7k** | 0.71× | 102.9k |
| | 3.0 | 18.0k | 4.1k | **22.1k** | 0.61× | 88.5k |
| | 1.5 | 36.0k | 4.1k | 40.1k | 1.11× | 160.5k |
| areal | 2.5 | 28.3k | 7.0k | **35.3k** | **0.98×** | 141.1k |
| | 3.0 | 23.6k | 7.0k | 30.6k | 0.85× | 122.2k |
| nearest | 3.0 | 27.7k | 8.7k | **36.4k** | 1.01× | 145.6k |
| | 4.0 | 20.8k | 8.7k | 29.5k | 0.82× | 118.0k |
| lite (390×844, cap 9600) | 2.5 | 6.9k | 2.2k | **9.1k** | 0.95× | 36.4k |
| | 3.0 | 5.7k | 2.2k | 8.0k | 0.83× | 31.8k |

**WebGPU compute tier:** affordable at onFrame d ≥ 2, areal d ≥ 2.5, nearest d ≥ 3, phone d ≥ 2.5 — all windowed. `anchorNode` is evaluated **once per particle** there (`neuralFieldCompute.ts:3329`, inside the compute kernel keyed on `instanceIndex`); the vertex stage reads the simulated position. Storage buffers unchanged; block counts unchanged (10/12 vertex, 8/12 fragment — `neuralFieldCompute.ts:1103-1140`), because a window offset is a plain `uniform()`, not a `uniformArray`.

**WebGL2 analytic tier: unpriced, and this is the decision.** `neuralFieldCompute.ts:3236-3265` — `const anchorS = anchorNode({ metaN: aMeta, offN: aOff })` at `:3244` feeds `centerS` which feeds `material.vertexNode` at `:3260`. `QUAD_CORNERS` is 4 verts (`:792`, `:1322-1331`), so **`anchorNode` runs 4× per sprite, per frame, with no compute stage to amortise it**. `anchorNode` (`:1881`) carries `edgeFrame` (packed `edgeEnds` = 6 nested `select()` + 2 divides), 2× `nodeAt`+`nodeDrift`, `widthEnvelope`, a `cross`/`normalize` perpendicular frame, and the star/spark branches — all with dynamic `uniformArray` indexing in the vertex stage.

The place the code already prices this shape: **`NeuralLattice.tsx:840`** — "~0.6 vh of scroll drawing 9 000 clipped sprites" — and `neuralFieldCompute.ts:1331` `geometry.instanceCount = count` is the only CPU handle (prefix-only; `object.frustumCulled = false` at `:2864`). Today that is 9 000 × 4 = **36 000** anchorNode evaluations/frame. The windowed onFrame d = 2 design is **124 500 — 3.5×**; un-windowed d = 2 is **472 000 — 13.1×**. `2026-08-25-round12-BUILD-PLAN.md:583` states this is "the single number that decides the design" and that "Nothing in source answers it."

**A risk the mean hides:** `dist` ranges [10.08, 13.92] (±16%), `depthAtten` adds ±25% (`NEURAL_DEPTH_ATTEN 0.5`) and DOF ±13.5%. Worst case the delivered diameter is ~0.65× the mean, so a link seeded at exactly 1.65× overlap on the mean sits at **1.07× at the far/dim end — dotted**. **Size the continuity condition at the far end, not the mean**, i.e. multiply every `n` above by ~1.5, or clamp `depthK` on the stream branch only.

## 5. THE BLOOM LEDGER

Measured from the installed `node_modules/three/examples/jsm/tsl/display/BloomNode.js` (r184): `_nMips = 5` (`:122`), mips at drawingBuffer/2 … /32 (`setSize:262-278`), `kernelSizeArray = [6,10,14,18,22]` (`:373`), `sigma = kernelRadius/3` in that mip's texels (`_getSeparableBlurMaterial`), `lerpBloomFactor = mix(f, 1.2−f, radius)` over `bloomFactors [1,.8,.6,.4,.2]` (`:383-392`). Knobs: threshold 1.0, intensity 1.1, radius 0.7 (`routeFxStore.ts` HOME_FX; `PostFXNodes.tsx:828-834`).

| mip | texel (dev px) | **σ (dev px)** | weight @ r=0.7 | halo peak per unit source energy |
|---|---|---|---|---|
| 0 | 2 | **4.0** | 0.440 | 4.81e-3 |
| 1 | 4 | 13.3 | 0.520 | 5.12e-4 |
| 2 | 8 | 37.3 | 0.600 | 7.54e-5 |
| 3 | 16 | 96.0 | 0.680 | 1.29e-5 |
| 4 | 32 | 234.7 | 0.760 | 2.42e-6 |

Σweights = 3.000 and is **invariant in radius** (Σf = Σ(1.2−f) = 3); radius only shifts energy from tight to broad mips.

**Finding 1 — bloom cannot fuse sprites into a line.** mip0 dominates the peak by 9.4×, and its peak is only `4.81e-3 × E`. For a d = 2 CSS px sprite at dpr 2 (4 dev px, area 12.57) at post-blend 1.2: E = 15.1, halo peak = **0.073 = 6% of the sprite's own peak**. The halos merge long before the cores do, so a chain of spaced bright sprites reads as *a continuous soft glow with a fully-modulated dotted core inside it* — which is the literal description of "chains of glowing blobs". **Therefore the answer is not a count ceiling; it is a spacing floor, and the binding one is the geometric 1.65×, not the bloom.**

Formally: continuity needs `s ≤ min(d/1.65, 2.5·σ₀/dpr)` = `min(d/1.65, 5 CSS px @dpr2)`. Over the whole requested range (d = 1.5…4 ⇒ d/1.65 = 0.91…2.42 px) **the core term always binds**; the bloom-halo term is slack. It only becomes binding at d ≥ 8.25 CSS px.

**Finding 2 — this is why `f6cac67` reads the way it does.** Today's isolated bead: 0.849 CSS px = 1.70 dev px, area 2.27, post-blend 3.648 ⇒ E = 8.28 ⇒ halo peak **0.040 lumLin** out to 2σ₀ = 8 dev px = **4 CSS px radius**. By the config's own conversion (0.018 lumLin ≈ 36/255 of cyan over the navy, `:2344-2348`) that is ≈80/255 — plainly visible. **Every >1.0 sprite paints a visible ball ~10× its own diameter.** The river doc's test "widest sprite riding a link ≤ 5 px" measures the wrong quantity; the right test is *no >1.0 sprite whose along-link neighbour is farther than d/1.65*.

**Finding 3 — the real ceiling on the >1.0 population is a WASH, and it is derivable.** Blur conserves the local mean, so bloom adds `intensity × Σweights × ⟨L⟩ = 3.30 × ⟨L⟩`, where ⟨L⟩ is the local area-average of above-threshold luminance.

- today: 4 140 star sprites × 4.97 dev px² = **0.287% of frame**, × 10.67 ⇒ ⟨L⟩ = 0.0306 ⇒ **wash 0.101 lumLin**.
- new, whole on-frame net lit at exactly the threshold (strand luminance = P·1.65 = 1.0, i.e. **P = 0.606 per sprite**):

| d | on-frame strand coverage | ⟨L⟩ | wash | vs today |
|---|---|---|---|---|
| 1.5 | 2.74% | 0.0274 | 0.090 | 0.89× |
| 2.0 | 3.65% | 0.0365 | 0.120 | **1.19×** |
| 2.5 | 4.56% | 0.0456 | 0.150 | 1.49× |
| 3.0 | 5.47% | 0.0547 | 0.181 | 1.79× |
| 4.0 | 7.29% | 0.0729 | 0.241 | **2.39×** |

⇒ **d ≤ 2.5 CSS px keeps the bloom wash inside 1.5× today's.** At d = 4 with the whole on-frame net lit you are at 2.4× — that is the round-8-I fog arriving by a new route. Gating to the D14 front band (storyboard `:342`: ±187 px @1280 ⇒ ±280 px @1920 = 29% of the on-frame run) divides all of it by 3.4, putting even d = 4 **below** today.

**The census, stated for the owner:** the design needs **~27 000 sprites above 1.0 on frame** (onFrame, d = 2, whole net lit) or **~7 800** with the front-band gate. Today's true number is ~4 345. The declared number is 5–8. The declared census cannot survive this instruction and must be renegotiated explicitly rather than quietly broken again.

**One consequence to plan for:** `PACKET_COUNT 2 / PACKET_SPAN 6` duty 1/3 (`:2017-2024`) applied to 814/1332/1709 links gives **271 / 444 / 570 live beads**, not 76. Gating traffic to the on-frame window restores 72 / 117 / 150.

## 6. WHAT MUST BE CUT

**The cheapest source of budget is not the stars — it is the 73.6% of every particle that is off frame.**

1. **The rolling on-frame edge window — 3.79× desktop, 12.79× phone, and it is the only lever big enough.** `meta.y` bakes `edgeIdx·2 + strand` (`neuralFieldCompute.ts:906-919`, `:762`); making it `uFirstEdge + (aux mod nWindow)` is one add and one mod in the vertex stage, a plain `uniform()` (zero UBO blocks, 10/12 and 6/12 untouched), and it works identically on both tiers. The edge list already has to be sorted by min-u for the line layer's `setDrawRange` (`2026-08-25-round12-BUILD-PLAN.md:231`), so the ordering is free. **Costs/risks, none of which are in the code today:** the two layers must share the same window or topology desynchronises; a particle re-homing mid-flight is a pop unless rotation happens only at the trailing edge where the strand is dark; `basePhase` and the `WRAP_SNAP_DIST < EDGE_MIN_LOCAL` recycle invariant (`:1649-1650`) both need re-checking against a moving edge index. **This is my proposal, not something the codebase does — flag it as unbuilt.**
2. **The bead — free, and already decided.** `PACKET_SIZE 2.0 → 0.6` (D24) frees no particles but removes the one primitive `f6cac67` actually named. It becomes mandatory the moment `DUST_SIZE` rises, because the bead is 3× the dust.
3. **Sparks — 32 particles, 0.09%. Nothing.**
4. **The stars — expensive, and it re-opens a closed defect.** They are 46% of the budget (4 124 windowed at onFrame). The core blob is saturated at ~8–12 particles (`:1766-1772`), so dropping `STAR_FLARE_FRACTION` 0.70 → 0 and per-star 40.19 → 12 frees 2 893 particles = **+11% of the link budget**. What it costs: the four rays go from 7.0 particles each to 2.1, i.e. `37.9 px reach / 2.1 = 18 px spacing` against a 0.70 CSS px sprite — the exact "the 4 flare rays are 2.6 particles each … a DOTTED spike" failure that round-8-G was written to close (`:1766-1778`), on the element the owner's reference image is built from. **11% is not worth the star spikes.**
5. **Raising the cap does not rescue the un-windowed design.** `RIBBON_PARTICLE_SCALE_MAX.full` 4.0 → 6.0 gives 54 000; the cheapest un-windowed cell is 66.8k. Windowing is not optional.

**Ordering, therefore:** window first (3.79×), shrink the bead (free), keep the stars whole, and let `d` land at **2.0–2.5 CSS px on onFrame / 2.5–3.0 on areal / 3.0–4.0 on nearest**, carried on `DUST_SIZE` not `NEURAL_POINT_SIZE`.

## WHAT I CANNOT KNOW WITHOUT A GPU CAPTURE

- **Whether 124.5k vertex invocations × `anchorNode` fit 16.6 ms on the WebGL2 analytic tier.** This is `2026-08-25-round12-BUILD-PLAN.md:583`'s open question 1, still open, and every affordability verdict in §4 is contingent on it.
- The real per-particle `dist`/`depthK` distribution, hence whether the far end of the field falls below 1.65× (§4 flags a plausible 1.07×).
- Whether a 1.65×-overlapped strand at P = 0.606 re-creates the round-8-I haze. The distinguishing test is already written and needs a capture: measured luminance ≥20 px off any chord ≈ 0.
- The true accumulated post-blend of the strand — my `P × d/s` is a 1-D model; the fringe/jitter spread across `STRAND_THICKNESS` 0.56 px will lower it somewhat.
- Fragment cost at 3.6–7.3% frame coverage with additive blending and `depthTest:false`, particularly on the lite tier.
- Whether the owner reads a 2 px continuous strand as "the particles making the line" at all. That is a look call, not arithmetic.
- The on-frame node/link figures (102.6/214.7 etc.) are the implement agent's committed measurements at `neuralLatticeConfig.ts:669-673`; I reproduced N and E exactly but did not independently re-derive the on-frame means.
Verified at working tree (`581a174` + implement-agent edits). Line numbers below are from that read; resolve by symbol, ±30 drift.

---

# PART 1 — THE VERDICT

**Yes, on both tiers, but only if the line stops being one thing:** the particles must draw a **permanently-present, geometrically-overlapped, SUB-threshold strand** (nothing on it blooms, ever) and the "illuminated" line must be a **travelling segment where the same particles stretch along their own chord until they overlap 6.6× and cross 1.0** — because a thin line made of above-threshold sprites is arithmetically forced to read as beads (a sprite's bloom halo peaks at 4.8e-3·E and is ~5× its own diameter, so the halo carpet fuses long before the cores do, and the threshold-1.0 highpass — `node_modules/three/examples/jsm/tsl/display/BloomNode.js`, `luminosityHighPass` = `smoothstep(threshold, threshold+smoothWidth, v)` — then acts as a *blob detector* on every core peak: that is what `f6cac67` actually killed, and no diameter fixes it).

**Density and size:** the `nearest` arm (835 seeds → **825 nodes / 1709 links**, which is the true on-frame-parity arm at **105.7 on-frame nodes**, not `onFrame`'s 49.9 — the on-frame divisor is **7.78**, not 3.791), with **~74 particles on a mean 111.6 px link** (`perEdge = 1.65·L_screen/S`), a mean delivered sprite diameter of **S = 2.5 CSS px**, and a **rolling κ-window** that keeps only ~17 % of the field alive → **≈27,000 particles = 0.75× the 36,000 cap**, which is *fewer* particles than the ribbon already authors (33,990) and therefore **0.80× today's analytic-tier vertex cost**, not 3.5× or 13× more.

**Where it does not close honestly:** the **lite/phone tier** fits only at **S = 2.5 with per-star 40 → 20 and a 0.09 window — 0.96× of its 9,600 cap, with zero headroom**, and it is the tier most likely to be WebGL2-analytic; if the GPU capture fails there, the honest fallback is **`LINE_LAYER = (tier === "lite")`** — keep the baked chord on the phone only, and tell the owner the phone shows a different grammar. Separately, **reduced-motion / tier-off / no-JS see no canvas at all** (`tierStore.ts:203`, `Scene.tsx:245/508`), so the SVG twin `neural-graph-fallback.tsx:445-475` remains the one surface still stroking crisp continuous lines — that divergence is not fixable in WebGL and must be declared, not hidden.

---

# PART 2 — THE CONSTANTS

## 2.0 The unit law, stated once (everything below is CSS px)

`buildVertex` (`neuralFieldCompute.ts:2627-2662`): `sizeNode = uPointSize·uPixelRatio·sizeK·depthK / max(dist,0.001)`; `QUAD_CORNERS` = ±0.5 (`:802`); `clip.xy += off·sizeNode/uViewport·2·clip.w` (`:2659`). `uViewport` is device px ⇒ **`sizeNode` is the DEVICE-px diameter**, and

> **S_css = NEURAL_POINT_SIZE · sizeK / CAMERA_Z**, `CAMERA_Z = 12` (`constants.ts:5`) — dpr-independent.

Every "px" in the config's sprite ledger (`neuralLatticeConfig.ts:1884-1892`, `:2379-2390`) is `POINT_SIZE·sizeK`, i.e. **12× too large**. The chord it is compared against is **1 device px = 1/dpr CSS px**. Today's link dust is **0.283 CSS px** at **3.95 CSS px** spacing — 0.07× overlap, ~1.3 lit pixels per 84 px link. **Nothing in this repo has ever been a particle-drawn line.**

## 2.1 The four free structural fixes — do these before spending one particle

| # | change | site | why |
|---|---|---|---|
| **F1** | `lens` must be measured in the **SCREEN** metric | `neuralFieldCompute.ts:920-925` — `Math.hypot(dx,dy,dz)` on raw `plexus.nodes` | The topology is built in the screen metric with x un-squashed by `bandAspect = 0.12846` (`neuralLatticeConfig.ts:1242-1248`, `:553`); `fieldMap` (`:1427-1431`) then stretches x by `uFieldLen` = 3.791. The two metrics are **exactly reciprocal: 1/0.12846 = 7.784 = Λ/(bandH/bandW)**. Result: delivered along-link spacing spreads **0.34 → 60.5 px (p90 17.8)** instead of being uniform. Fix: `dx/bandAspect`, drop `dz` from the length. Build-time, zero uniforms, zero UBO, both tiers, no fill change. **Post-fix spread ~1.4×.** The file already applied exactly this correction elsewhere and only elsewhere (`RIBBON_DEFAULTS.edgeMinLocal = 0.01457` vs `EDGE_MIN_LOCAL = 0.055`, justified at `:533-546`). |
| **F2** | **Stratify the flow phase.** `offA[i*3] = r2` (a hash) → `offA[i*3] = (edgeFill - 0.5)/perEdge[edgeIdx]` | `neuralFieldCompute.ts:964`; `edgeFill` is already live at `:935/:958` | Positions are `fract(basePhase + t·speed·speedVar)` (`:1874-1875`) off a **random** phase ⇒ a **Poisson** train, whose shot ripple is `σ/μ = 0.84/√Ω`. A Poisson strand needs **S/s ≥ 6.0** for a smooth line. A **comb** needs **S/s ≥ 1.65** (ripple `2exp(−2π²σ²/s²)` with σ = S/4 ⇒ 6.9 %; verified directly against the shipped `smoothstep(0.5,0.12,r)` profile: peak-to-trough ±3 %). **This one line is worth 3.6× in particle count.** |
| **F3** | `speedVar` must be per-**LINK**, not per-particle | `neuralFieldCompute.ts:961` — `meta[i*4+2] = 0.7 + r1*0.6` → hash on `edgeIdx` | Otherwise F2's comb shears back into Poisson within seconds. Per-link variance keeps the organic decorrelation between links. |
| **F4** | Narrow the per-particle size spread | `CORE_SIZE_BOOST 1.25 → 1.15`, `FRINGE_SIZE_DROP 0.55 → 0.75` (`neuralLatticeConfig.ts` ~`:1669-1680`) | A comb of *unequal* discs re-introduces ripple at the ratio of the spread (today 2.27×). ±15 % is invisible. |

**Also mandatory (scar, quantified):** `Discard(alpha.lessThan(v.vCut))` (`:2616`) with `alpha = disc·vAlpha·uReveal` and `vCut = 0.004·cMask` reduces to `disc·baseAlpha < 0.004`. At today's `STREAM_ALPHA 0.012` that discards `disc < 0.333` ⇒ **today's dust is cropped to 0.71× its nominal diameter**. At the new alpha the crop vanishes; budget the diameter as nominal. And change `lessThan` → **`lessThanEqual`** at `:2616` and `:3227` (method chain exists: `three/src/nodes/math/OperatorNode.js:718`) or the un-born half of the field rasterises at zero contribution forever — with D17's one continuous band there is no lateral cull to save you (`NeuralLattice.tsx:688-697`).

## 2.2 The continuity law — the number the whole design hangs on

```
REST (structure):   S_css / s_css  ≥ 1.65      (comb, ripple ≤ 7 %)
LIT  (the line):    S_axial / s    ≥ 6.0       wherever accumulated luminance > 1.0
accumulated A      = 0.624 · P · S_axial / s   (P = per-sprite post-blend peak)
```
`0.624` is the through-centre chord mean of the shipped disc `smoothstep(0.5, inner, |vQuadUv|)`; `S_axial = S · stretch`, and **stretch is anisotropic** — `buildVertex:2654` scales **only `corner.x`**, and `vQuadUv` is the **unrotated** quad (`:2665-2670`), so the peak per-pixel alpha never moves. **That is the escape from `f6cac67`: `f6cac67` grew the sprite isotropically (a bead); the stretch grows it only along its own chord (a streak).**

`stretch = 1 + min(|motion|·1.5·(1+uScrollVel·0.6), 2.0)` (`:2640-2647`; `STRETCH_GAIN 1.5`, `STRETCH_MAX 2.0`, `:1684-1685`) ⇒ **cap 3.0, saturating at |motion| ≥ 1.333**.

## 2.3 Geometry and the window

Measured (budget-doc transcription of `buildPlexus`, reproduced exactly against the committed table `neuralLatticeConfig.ts:669-673`), screen metric, 7278 × 935 band, screen dy/dx = +1 exactly:

| arm | N | E | mean link | longest | ΣL |
|---|---|---|---|---|---|
| onFrame 391 | 389 | 814 | 152.5 px | 340.8 | 124.1k |
| areal 662 | 656 | 1332 | 122.2 | 279.1 | 162.7k |
| **nearest 835** | **825** | **1709** | **111.6** | **256.0** | **190.7k** |
| lite 716 (390×844) | 710 | 1478 | 90.0 | 206.9 | 133.0k |

**On-frame fraction.** A band of vertical thickness h sheared 45° through a W×H frame puts `h·H` of its `W_band·h` area on frame ⇒ **H/W_band = 935/7278 = 12.85 %, divisor 7.78** — independent of band height, and measured at 49.9 / 84.2 / 105.7 / 53.6 nodes. **`nearest` is the on-frame-parity arm** (today's approved read is ~103); `onFrame`'s name is wrong and D23's premise fails.

**The window key (this is buildable and I have not seen it proposed).** With the frame at screen offset Δ along the 45° diagonal, a node with rest-screen position `(X₀,Y₀)`, `δ = Y₀−X₀ ∈ [−467.5, +467.5]`, is on frame exactly for
```
Δ ∈ [ min(X₀,Y₀) − (935 − max(0,δ)) ,  min(X₀,Y₀) ]
```
⇒ **sort edges (and nodes) by `κ = min(X₀, Y₀)` and window `κ ∈ [Δ, Δ+935]`.** That single 1-D key is a superset of the true on-frame set with only **14 % over-inclusion** (mean on-frame duration 818 px vs a 935 px window). With a 15 % hysteresis pad (`CULL_PAD` idiom — hysteresis, not a visibility rule):

> **window fraction = 0.1285 × 1.14 × 1.15 = 0.17 → divisor 5.9** (desktop). Phone: on-frame 5.7 %, over-inclusion 1.37, pad ⇒ **0.09**.

A plain edge-index (u-interval) window buys only **3.79×** — exactly the naive 1/Λ — because at a given u only part of the v range is on frame. The κ key is what recovers the other 2.06×. The edge list already has to be sorted for the line layer's `setDrawRange`, so the ordering is free; `meta.y` bakes `edgeIdx·2 + strand` (`:961-964`), so the re-home is `uFirstEdge + (aux mod nWindow)` — **a plain `uniform()`, zero UBO blocks in either stage** (measured counts stay 10/12 vertex, 8/12 fragment, `:1123-1136`).

## 2.4 THE BUDGET — count is an OUTPUT, not an input

Today the flow is `count → NODE_FRACTION → perEdge`. **Invert it.** The continuity law fixes `perEdge`; the count is what falls out:

```
perEdge(L) = round( 1.65 · L_screen_css / S_css )      # link particles, screen metric
starBudget = N_window · perStar
count      = starBudget + Σ_window perEdge
if count > cap:  RAISE S, never lower perEdge          # lowering perEdge breaks the line;
                                                        # raising S only thickens it
```

At **S = 2.5**: `perEdge = 0.66·L` → **74 on a mean 111.6 px link, 169 on the longest, ≥17 on the shortest** (requires the screen-metric edge-min: `edgeMinScreen ≥ 25 px`; today's `floor()` at `:927` can silently produce a **zero-particle = invisible link**, which the chord used to cover — add a build-time assert `min(perEdge) ≥ 8`).

| arm | S | link particles | stars (40.19/node) | **total** | vs cap 36 000 | analytic verts vs today's 136k |
|---|---|---|---|---|---|---|
| **nearest** | **2.5** | **21 400** | **5 637** | **27 037** | **0.75×** | **108k = 0.80×** |
| nearest | 2.0 | 26 750 | 5 637 | 32 387 | 0.90× | 130k = 0.95× |
| areal | 2.0 | 22 820 | 4 482 | 27 302 | 0.76× | 109k |
| areal | 2.5 | 18 250 | 4 482 | 22 732 | 0.63× | 91k |
| onFrame | 2.0 | 17 400 | 2 658 | 20 058 | 0.56× | 80k |
| **lite** (per-star 20) | **2.5** | **7 900** | **1 284** | **9 184** | **0.96× of 9 600** | 37k vs today's 38k |

Un-windowed, `nearest` at S = 2.5 is **125 900** link particles — 3.5× the cap. **Windowing is not optional.**

## 2.5 The sizing constants

| constant | site | today | **new** | derivation |
|---|---|---|---|---|
| `DUST_SIZE` | `neuralLatticeConfig.ts:1680` | 0.55 | **4.21** | `sizeK = S·12/7.5 = 4.0`; `sizeK = DUST_SIZE · mean(1.15,0.75) = 0.95·DUST_SIZE`. Carry the size on `DUST_SIZE`, **not** `NEURAL_POINT_SIZE` — the latter scales stars and beads too (`sizeStream` at `:2374-2380` is the stream-only branch). |
| `NEURAL_POINT_SIZE` | `:1099`-ish | 7.5 | **unchanged** | stars must not move. |
| `STRAND_RADIUS` / `STRAND_THICKNESS` | `:1463` / `:1468` | 0 / 0.0006 | **unchanged** | 0.0006 = 0.56 px = 0.22 S — keeps the train effectively 1-D so the comb criterion holds. **Do not restore a braid**: the August river's continuity came from 2-D areal density inside a 44 px tube plus bloom-halo carpet, not from axial overlap; that mechanism does not scale down to a thin filament. |
| `CORE_SIZE_BOOST`/`FRINGE_SIZE_DROP` | `:1669-1680` | 1.25/0.55 | **1.15/0.75** | F4. |
| `PACKET_SIZE` | `:2034` | 2.0 | **0.35** | bead = dust×(1+PACKET_SIZE). D24's intent restated as a ratio: 4.6/3.4 = 1.35×. At S = 2.5 the bead is **3.4 CSS px** — a glint on a lit thread, not the only light on a dark one. **This is now a precondition, not polish**: at PACKET_SIZE 2.0 the bead would be 7.5 CSS px, the exact primitive `f6cac67` rejected. |
| `STATIC_ELONG` | `:1686` | 0.28 | **0.05** | analytic tier has no `physVel`; at 0.28 its rest stretch is 1.42 vs the compute tier's 1.01 — a 40 % brightness divergence that only becomes visible now that the sprite is bright. At 0.05 the divergence is 7 %. |
| `FLOW_SPEED` | `:1507` | 0.075 | **0.25** | ambient drift 8.4 → 28 px/s. Anchor speed 0.026 local/s against the **ribbon's** snap threshold `build.field.wrapSnapDist 0.01060 / (NEURAL_DAMPING/NEURAL_SPRING 0.1417) = 0.0748` — 2.9× margin. **Do not use the `WRAP_SNAP_DIST 0.038` constant; the ribbon's delivered value is 3.6× tighter.** `uFlowSpeed` is already a uniform (`:1083`) and already in the bag (`:3606`). |

## 2.6 The brightness law — "si illuminano in movimento", with coefficients

**Principle.** A constant speed→brightness law is fatal (`FLOW_SPEED` is uniform ⇒ every particle lifts equally ⇒ the round-8-I haze by a new route). And **`|physVel|` is forbidden**: it spikes at every `fract()` wrap on the compute tier only (the spring-flight the snap exists to kill, `:3437-3439`) and does not exist on the analytic tier at all (`motionNode(…, null)`, `:3260`) — a `|physVel|`-driven emissive shows two different pictures on the two backends. **Drive everything from one analytic scalar** whose excess speed is *why* the particle is bright.

```ts
// ── R12 · MOTION IS LIGHT ── ten plain uniform() scalars, ZERO UBO blocks
// (precedent: :1224-1227, :1236-1246, :1290-1299 — a uniformArray would cost
//  a block in BOTH stages; a plain uniform costs none.)
const uFront   = uniform(0);      // BIRTH front, nodeT — pure function of p
const uRiver   = uniform(0);      // LIGHT phase = uFront + riverClock
const uFrontW  = uniform(0.06);   // birth knee width, nodeT (C¹, never a clamp)
const uFrontKy = uniform(0);      // y→phase slope (the 45° diagonal)

/** shared phase axis — structure and light read this and nothing else */
phaseAt(nT, y) = nT.sub(y.mul(uFrontKy))

/** STRUCTURE: 0→1 as the front passes. C¹ knee, never min()/clamp. */
bornAt(ph)   = smoothstep(ph, ph.add(uFrontW), uFront)

/** LIGHT: M staggered crests, gaussian head + comet tail — same asymmetry as
 *  surgeAt(:2057-2072): sharp leading edge, trailing smear. */
riverAt(ph)  = Σ_{m<M} max( exp(−K·dw²), 0.65·select(dw<0, exp(dw/TAIL), 0) )
               with d = ph − uRiver + m/M,  dw = d − floor(d+0.5)
```

| constant | value | derivation |
|---|---|---|
| `RIVER_M` | **3** | crest pitch 1/3 nodeT = 2426 px ⇒ ~0.8 crests per 1920 px frame. |
| `RIVER_K` | **150** | σ = 1/√(2K) = 0.0577 nodeT = **420 px** — comfortably wider than the 111.6 px mean link, so a crest lights a link **end to end** instead of riding it as a bead. **Do not narrow toward `PACKET_WIDTH` 0.07; that width is the anti-blob guarantee.** |
| `RIVER_TAIL` | **0.035** | matches `SURGE_TAIL`. Use `max(head, tail)` — `min()` on a moving wavefront flat-tops it. |
| `RIVER_ADVECT` | **1.30** | at a crest `spd = 1.30` ⇒ `stretch = 1+min(1.95,2) = 2.95`. Same saturation the surge already produces today; no new cap behaviour. Add into `motionNode` (`:2190-2208`) on **both** branches. |
| `RIVER_SIZE` | **0.35** | `sizeStream × (1 + river·0.35)` ⇒ S_trans 2.5 → 3.4 CSS px at the crest. |
| `RIVER_GAIN` | **0.30** | emissive lift into the existing additive chain at `emisStream` (`:2334-2343`). |
| `RIVER_WHITE` | **0.25** | into `headMix` (`:2308-2312`), toward `COL_CORE` (lum 0.9371). Cyan→white only. **Never violet.** |
| `RIVER_TRAFFIC` | **0.16** | into the `traffic` clamp (`:2357-2362`). |
| `RIVER_STAR` | **0.45** | into `emisRing` (`:2425`), `.mul(cGate)` **mandatory** — a fully ignited core is ×15.5 its rest. |
| `RIVER_RATE` | **0.09 nodeT/s** | **the crests must keep moving when the reader stops.** `uRiver = uFront + riverClock`, `riverClock += delta·RIVER_RATE` ⇒ 655 px/s, a crest crosses the frame in 2.9 s. Neither the mechanism nor the budget pass has this, and without it a stopped reader sees **frozen bright patches** — the direct contradiction of the owner's sentence. `uFront` (structure) stays a pure function of `p`; only the light gets its own clock. |
| `FRONT_LEAD/SPAN` | lead ~0.05, span 1.0 | `uFront = damp(prev, LEAD + p·SPAN, 10, delta)` beside `revealDamped` (`NeuralLattice.tsx:909-913`). **`Math.max(prev,next)` is a latch and violates D16.** `p` from the frozen frame only (`traverseStore.ts:41-44`). **Never repurpose `uReveal`** — it arms the recycle snap (`:3377`) and drives the coalesce (`:3340`, `:3245`), and saturates ~262 px before `p = 0`. |

### The luminance ledger — the whole design in one table

`P = lum(tone) · emis · alpha`; `A = 0.624·P·S_ax/s`; `S/s = 1.65` at rest.

| state | stretch | S_ax/s | P | **A (post-blend)** | blooms? |
|---|---|---|---|---|---|
| dust at rest, compute | 1.01 | 1.67 | 0.233 | **0.24** | no |
| dust at rest, analytic (`STATIC_ELONG 0.05`) | 1.08 | 1.78 | 0.233 | 0.26 | no |
| river body (river ≈ 0.5) | 2.0 | 4.45 | 0.268 | 0.74 | no |
| **river head (river = 1)** | **2.95** | **6.57** | **0.303** | **1.24** | **YES — and fused, because 6.57 ≫ 6.0** |
| packet bead | — | — | — | **1.80** | yes (a glint) |
| star core | — | — | — | 10.67 | yes (unchanged) |

⇒ **`STREAM_ALPHA` (`:2356`) 0.012 → 0.150.** Derivation: `P = 0.6201(COL_CYAN) × 2.512(STREAM_EMISSIVE 2.1 × midProfile 1.15 × rowBright 1.04) × alpha = 1.5577·alpha`; `A_rest = 1.03·P = 0.24` ⇒ `P = 0.233` ⇒ `alpha = 0.150`.
⇒ **`BEAD_ALPHA` 0.9 → 0.44** (post-blend 3.65 → 1.80). Its job has shrunk from "the only light on the link" to "a glint on a lit thread", and at 3.65 with a 3.4 px sprite its bloom halo peaks at **0.64 over a ~4 px radius** — 46–97 of those on frame is the new fog.

**Sanity anchor:** the chord the owner approved delivered `0.568 × 0.5 CSS px` of light per unit length. The rest strand delivers `0.24 × 2.5` = **2.1× the chord**, the river head `1.24 × 3.4` = **15× the chord**. That is the change he will see, and it is deliberate.

### Where each term lands (expression sites)

`motionNode:2196-2203` — `adv = surge·SURGE_ADVECT + river·uRiverAdv`, both branches.
`emisStream:2334-2343` — `.add(river.mul(uRiverGain).mul(cGate))` inside the existing additive chain, **then port the C¹ soft knee from `:3084-3090` verbatim** with `cap = mix(DUST_LUM_MAX 0.95, BEAD_LUM_MAX, traffic)`; requires hoisting `traffic` (`:2357`) and `alphaStream` (`:2370`) above `emisStream` — a pure expression DAG, legal, but keep every one self-contained (varying discipline, header `:99-110`). `min(x, knee)` is legal **only** as the knee's `underL` where the overflow is re-added; `min(x, CONST)` is the flat-top failure (`:3050-3062`).
`traffic:2357`, `sizeStream:2374-2383`, `headMix:2308-2312`, `emisRing:2425` — one added term each, all `.mul(cGate)`.
`abs` is not destructured — use `max(d, d.negate())` (`:1741`).

### ALU / cost

~80 ALU per particle vertex (riverAt at M = 3 dominates at ~45), ×4 corners. At 27 037 particles = 108k vertex invocations ≈ 8.6 MFLOP/frame. **Zero new varyings** (particle stays at 5, line at 4), **zero new storage buffers** (4), **zero new vertex slots** (5/8), **`simulate()` zero lines changed**. Fragment stage unchanged — the `Discard` test is algebraically identical (see 2.7).

## 2.7 The copy-mask contract — the numbers, corrected

The `2.8e-4` ceiling in the corpus belongs to **`COPY_MASK_FLOOR` alone** (`neuralLatticeConfig.ts:2789-2793`) and is derived from an **unmasked star centre of 69.4**. It has no bearing on a link role whose covered-pixel luminance is O(1). The binding constraint is the ledger's own worst-pixel rule: `ΔL_max = 0.01943` (`:2586`), star centre `0.00694`, bead `0.00186`.

> **link-role headroom = 0.01943 − 0.00694 − 0.00186 = 0.01063** — **3.65× what the chord delivered (0.00291).**

**Constant:** `COPY_MASK_FLOOR_STREAM = 0.017` ⇒ in-column strand delivers `0.24 × 0.017 = 0.0041` (1.4× the chord's), pathological superposition `0.0110` ⇒ **≈5.1:1**, above AA.

**Two mandatory wirings, both of which the corpus gets wrong in opposite directions:**
1. The floor must ride **rest-ness**, not role: `floor = mix(COPY_MASK_FLOOR, COPY_MASK_FLOOR_STREAM, (1−traffic)·(1−river))`. A bead at 1.80 on a 0.017 floor would deliver 0.031 — **1.6× the entire AA budget**. Only the *resting* dust gets the high floor; every lift term is `.mul(cGate)` and vanishes in the column anyway.
2. It must be folded into **`cMask` at its single construction site** (`:2295`-ish), because `cMask` feeds **both** `alpha` (`:2604`) and `cut` (`:2612`). `neuralFieldCompute.ts:2570-2590` states the invariant: identical factor on both ⇒ the surviving fragment SET is byte-identical at every point of the ramp. Raise `alpha` alone and you get a fill regression plus a hard edge at the role boundary; scale `alpha` without `cut` in the other direction and **particles delete instead of fading**. `cMask` also already carries `uFieldFade` (`:1782`, `:1788`) — assemble a role mask without it and `FIELD_EXIT_VH` misses the link role.
3. Fold `bornAt` into the **same** `cMask` at the same site. Proof it is free: the test becomes `disc·vAlpha·born·uReveal < 0.004·cMask·born` ⟺ the un-born test, for every `born > 0`. Birth must be **value-only** — an anchor-driven birth moves `|seedPos − liveAnchor| ≈ 0.7 local` against a **ribbon** snap threshold of 0.0748 local/s, needing a >9.4 s birth window, and `armed` is 1 on the healthy band ⇒ `pos.assign(anchor); vel = 0` every frame the front is on the node.

## 2.8 What gets cut to pay for it

| cut | saving | note |
|---|---|---|
| **the 83 % of the field that is off frame** (κ-window) | **5.9×** | the only lever big enough. |
| **the chord** | 1 draw call, 20 508 uncullable vertices (nearest arm, `frustumCulled=false` at `:3234`), 401 KiB VBO, 6 UBO blocks, ~0.93 % of frame fill @dpr2 | **none of the 6 blocks transfer** — the line's four arrays are a subset of the particle vertex stage's eight (`:1106-1109`). This is a look decision, not a perf win. |
| **`PACKET_SIZE` 2.0 → 0.35, `BEAD_ALPHA` 0.9 → 0.44** | no particles; removes the primitive `f6cac67` named and ~60 % of the new bloom wash | free. |
| **per-star 40 → 20 on LITE only** | 1 284 particles on the phone | desktop stars stay whole: `STAR_FLARE_FRACTION 0.70 → 0` would free only 11 % of the link budget and takes the four flare rays from 7.0 to 2.1 particles each — **the exact "DOTTED spike" defect round-8-G was written to close** (`:1766-1778`), on the element the owner's reference image is built from. Not worth 11 %. |
| **`NODE_FRACTION`** | — | **retire it.** The star and link budgets are now computed independently (§2.4). Its 0.28 → 0.46 raise was justified *because the line layer had taken over the thread job* (`:1896`, header L216-221); that justification is gone, but so is the constant. |
| sparks (32) | 0.09 % | nothing. Leave. |
| raising `RIBBON_PARTICLE_SCALE_MAX.full` 4.0 → 6.0 | 54 000 | **does not rescue the un-windowed design** (125.9k needed). |

---

# PART 3 — THE REMOVAL

## 3.1 The complete consumer set (verified; it is small)

`bakeLinkLineGeometry` (`neuralLinkLines.ts:101`) — **sole** importer `neuralFieldCompute.ts:300`. `buildLinkLineLayer()` `:3003`-ish, built unconditionally at `:3262`; type `NeuralFieldLines` `:698`; field `:716`; returned `:3288`/`:3513`; disposed `:3299-3300`/`:3527-3528`; mounted `NeuralLattice.tsx:1633`; dev handles `:1356-1363`. Symbols destructured for it alone: `BufferGeometry` `:1012`, `LineBasicNodeMaterial` `:1016`, `LineSegments` `:1017`.

**Three things that look line-only and are NOT — deleting them breaks other layers:**
- `copyMaskLineAt()` (`:1785-1789`) is read by the **NEBULA** at `:2841`, not only the line at `:3102`.
- `uCopyLineFloor` (`:618`, `:1257`, `NeuralLattice.tsx:783/:793/:1379`) and `COPY_MASK_FLOOR_LINE = 3e-3` therefore stay live for the nebula.
- `EDGE_FADE_IN/OUT`, `EDGE_MID_BRIGHT`, `DEBRIS_FADE` are read by the **particle** path (`:2245-2247`, `:2331`, `:2368`).

## 3.2 Feature-by-feature: replaced, or lost

| chord feature | disposition |
|---|---|
| structural spine | **replaced** — the sub-threshold comb strand (§2.2). This is the whole job. |
| ember tips · clean-break gap · `uRecohere` · zone ignition · surge sweep · death flash · mid-span profile · cool→warm tint · tip fades · DOF · `cut` | **already have byte-equivalent particle twins** at `emberCol :2302-2310`, `gap :2250-2262`, `rowBright :2326`, `surge :2274`/`headMix :2313`, `flash :2270`, `midProfile :2331-2333`, tint `:2287-2297`, `edge :2245-2247`, `dofAlphaAt`+`dofSoftAt`+`depthAtten`, `cut :2612`. The particle layer **out-samples** the line on the surge: 74 particles/link vs `LINK_SEGMENTS = 6`. |
| shimmer | **replaced, but the hash must move.** Line shimmer is per-LINK (`hLink :2974`); particle shimmer is per-PARTICLE (`metaN.w :2321`). On a particle-drawn line a per-particle shimmer reads as **boiling grain along the line**. Move it to the link index. |
| staggered reveal (`LINE_REVEAL_STAGGER 0.55`) | **replaced and improved** — `bornAt` is a spatial front, which is what D14/D16 asked for. `uReveal` on the particle path is flat (`:2616`, `:3245`, `:3340`). |
| fray dash (`LINE_DASH_*`, anchored by `vLineRest :3109`) | **recoverable, ~8 ALU** — a particle can evaluate the same triple-sine at `mix(nodeAt(ia), nodeAt(ib), s)` *without* `nodeDrift`. **Not free; budget it or lose the broken half's dash grammar.** |
| **`LINE_LUM_MAX 0.97` — "THE LINE NEVER BLOOMS"** (`:1571-1585`, cap `:3064` + C¹ knee `:3084-3090`) | **the invariant being deleted, and it must be named.** It is the only place in the file where a layer is held under the bloom threshold. **Replaced by a two-state contract**: rest strand `DUST_LUM_MAX = 0.95` (the same knee, ported), river head deliberately over. Anything that lifts a *resting* particle over 1.0 is a bug. |
| **1-device-px crispness** | **HONESTLY LOST.** The line is now 2.5 CSS px (5 device px at dpr 2) — **5× the chord's width**. No particle formulation recovers a 1-device-px line: at S = 0.5 CSS px the windowed `nearest` arm needs 107 000 link particles. This is the price of the reversal and it is not negotiable by tuning. |
| **independence from the particle budget** | **HONESTLY LOST**, and it bites hardest on the phone (§4e). |

## 3.3 The reversibility flag

**`LINE_ALPHA = 0` is NOT a rollback**: every fragment fails `Discard(alpha < vLineCut)` (`:3227`) so fill goes to zero, but the draw call, the 20 508 unculled vertices, the VBO and the 6 UBO blocks all remain.

Use the shipped idiom — `MEMBRANE_ALPHA`, documented at `:3179-3187` with the build seam `:3188-3189` and the mount gate `NeuralLattice.tsx:1612-1618`:

```ts
// neuralLatticeConfig.ts, immediately above LINK_SEGMENTS (:1548), inside the
// existing ROUND-8-G block so the constant and its 150 lines of prose stay together.
export const LINE_LAYER: boolean = false;   // ← `: boolean`, NOT a literal type
```
Four touch points, one line each:
1. `neuralFieldCompute.ts:3262` → `const links = LINE_LAYER ? buildLinkLineLayer() : null;`
2. `:716` → `links: NeuralFieldLines | null;`
3. `:3299-3300`, `:3527-3528` → `links?.geometry.dispose(); links?.material.dispose();`
4. `NeuralLattice.tsx:1633` → `{build.links && <primitive object={build.links.object} />}`; `:1356-1357` → `?.edgeCount ?? 0`.

**Annotate `: boolean` deliberately**: a literal `false` narrows `links` to `null` and the entire line branch **stops being type-checked** by `npx tsc --noEmit`, which is the only static gate. Cost: the constant no longer guarantees a fold, so **"tree-shaken out" is unverified** — no bundle analysis was run.

**Two guards in the flag's doc comment:** do not delete `copyMaskLineAt`/`uCopyLineFloor`/`COPY_MASK_FLOOR_LINE` (nebula); keep `EDGE_FADE_IN/OUT`, `EDGE_MID_BRIGHT`, `DEBRIS_FADE` (particles).

## 3.4 One live defect to fix while you are in there (implement agent owns the file)

`COPY_LANE_OPEN_W` is hardcoded at **two** sites in `NeuralLattice.tsx` — `:505-507` (a measure-time `useEffect`, fires on every ribbon build) and `:789-790` (the off-band restore). The ribbon default is `COPY_LANE_OPEN_W_RIBBON = 4.0` (`neuralFieldCompute.ts:1252-1254`); at 2.0 the lane's unused left wall lands at local x ≈ −1.52, **inside** a ±1.895 ribbon, and per `neuralLatticeConfig.ts:2775-2778` **every node left of it reads UNMASKED**. `COPY_LANE_OPEN_W_RIBBON` is not imported in `NeuralLattice.tsx`. Not latent — live from the first measure.

---

# PART 4 — THE AT-REST ANSWER

**The load-bearing decision that makes this answerable: the strand's continuity is a REST property, not a traffic property.** It is built from resting dust at `A = 0.24`, geometrically overlapped 1.65×. Nothing about it depends on packets, surges or scroll. That single choice disposes of the two worst at-rest failures in the corpus.

**(a) Reader stops scrolling — full tier, WebGPU or WebGL2.** A complete, continuous, dim 2.5 px net; star cores at 10.67; ~97 beads at 1.80 drifting at 28 px/s; the surge self-firing every 3.5 s (`SURGE_PERIOD_HEALTHY`, driver `NeuralLattice.tsx:942-982` — it does not need scroll); and **the river crests keep travelling at 655 px/s on `riverClock`** (§2.6, `RIVER_RATE`) so a ~456 px glowing segment sweeps the net roughly every 3.7 s. **Without `RIVER_RATE` this path shows frozen bright patches** — that is the single biggest at-rest risk of the reversal and the reason the light must not be a pure function of `p`. At a random instant ~24 % of the on-frame run is above threshold; the other 76 % is continuous but unlit — present, not absent. That is the whole difference from today.

**(b) `prefers-reduced-motion`.** `tierStore.ts:203` → tier `off` → `fxBudget.level 0` → `Scene.tsx:245/508` gate `level >= 2` false ⇒ **no canvas**. The SVG twin renders. Mechanically unaffected.

**(c) no-JS / SSR.** `useNeuralLatticeFallback` returns `false` until `resolved` (`:43`) ⇒ CSS dot-grid only (`problem-section.tsx:505-521`). Unaffected.

**(d) tier "off".** Same as (b).

**(e) lite / phone (level 2 — a capable phone DOES mount the island, `Scene.tsx:477-481`).** **Works, at 0.96× of the 9 600 cap**, with S = 2.5, window 0.09, per-star 20 (§2.4). This overturns the corpus's "arithmetically unreachable on the phone" — that verdict assumed no windowing. But there is **zero headroom**, and 98 % of links sit at the copy-mask floor at 390 px (`neuralLatticeConfig.ts:2650`), so the phone's net is largely masked behind the copy anyway. **Fallback if the capture fails: `LINE_LAYER = (tier === "lite")`.**

**(f) The SVG twin `neural-graph-fallback.tsx`.** Confirmed untouched — it imports only config constants (`:50-59`) and strokes its own paths (`:445` width 3 underlay, `:460/:473` width 0.9 core, `:475` `strokeDasharray="3 7"`). **The honesty cost:** it becomes the only surface still drawing crisp continuous strokes, so the reduced-motion / off-tier visitor sees exactly the grammar the owner just rejected. Either re-author its stroke to a 2.5 px beaded read, or declare the divergence. **Owner-visible; not a code decision.**

**(g) The post-fracture quarter — the corpus's D2, answered.** The traversed band is `mode="broken"` (`Scene.tsx:508`) and its `fractureT ≈ 0.7376` (`neuralFieldCompute.ts:3230-3232`, `wellCentre[0] = RIBBON_STONE_U = 0.23621`). Packets are zeroed past `fractureT + 0.03` (`:2125-2146`) and the surge is killed at `fractureT` (`NeuralLattice.tsx:969`) — so **traffic is identically 0 over the last 23 % ≈ 1 690 px ≈ 0.88 of a frame**. Because continuity is a rest property, **that stretch still shows a continuous strand**, now frayed, gapped and ember-tipped, with debris drifting on it. Gate the river crests by `(1 − past)` so the *lit* line dies at the fracture — that is the story, and it is what the chord's `LINE_DEAD_ALPHA 0.5` + fray dash used to show. **Trap:** debris particles *do* move (`DEBRIS_WANDER_ACC 5.0`), so a naïve speed-driven law would light the dying fray brightest and invert the narrative. Key on `river`/`traffic`, never on speed.

---

# PART 5 — THE ANTI-BLOB GATE

Each predicate is computable from constants before writing a shader, plus how to test it live.

## A. Continuity (compute these first)

| # | predicate | target | today | at kill (`f6cac67`) |
|---|---|---|---|---|
| **A1** | `S/s` at REST, on the **smallest** delivered sprite, screen metric | **≥ 1.65** | 0.072 | 0.14 |
| **A2** | phase distribution is a **comb**, not Poisson | `basePhase = (k+0.5)/perEdge`, `speedVar` per-LINK | Poisson (`:964`, `:961`) | Poisson |
| **A3** | `S_axial/s` wherever accumulated > 1.0 | **≥ 6.0** (delivered 6.57) | n/a (nothing over 1.0) | 0.14 |
| **A4** | spacing spread p90/median after the metric fix | **≤ 1.4×** | 2.8× (max 178×) | — |
| **A5** | `min(perEdge)` build-time assert | **≥ 8** | `floor()` can give 0 | 0 |

## B. Ripple / tininess

| # | predicate | target |
|---|---|---|
| **B1** | comb ripple `2·exp(−2π²(S/4s)²)` | **≤ 7 %** at S/s = 1.65 |
| **B2** | mean delivered diameter | **S ≤ 3 CSS px** at rest, **≤ 4 CSS px** at the crest (transverse) |
| **B3** | per-particle diameter spread | **≤ 1.6×** (F4) — a comb of unequal discs re-ripples at the spread ratio |
| **B4** | never buy continuity with size | at fixed continuity `n ∝ 1/S` and fill `∝ S`: **halving the sprite halves the fill and buys 2× the particles**. Any `DUST_SIZE` rise must be matched by a proportional `perEdge` rise. |
| **B5** | the transverse envelope is **orthogonal** to continuity | proven at the kill: `ENVELOPE_BASE 1.8 → 3.2` changed the overlap by **0.000** while `POINT_SIZE 7.5 → 10` moved it 0.14 → 0.19. **He made the blobs bigger without ever making them touch.** |

## C. THE BINARY LIVE TEST (this is the one that decides it)

> **Screenshot the frame. Threshold the linear-luminance buffer at 1.0. Inside the crest, the >1.0 mask along any link must be a CONNECTED ribbon. If it is a dotted set, it is beads.**

Unambiguous, matches exactly the language of `f6cac67`, and it is the only test that would have failed both of the owner's live attempts. Supporting measurements:
- **C1** — sample a 1-px line **along** a link inside the lit segment: `max/min ≤ 1.15`.
- **C2** — no >1.0 sprite whose along-link neighbour is farther than `S_axial/1.65`. The bead is the only sanctioned exception (1 per 3 links).
- **C3** — bloom-halo sanity: an isolated 3.4 px bead at 1.80 paints a halo peaking at **0.31 lumLin out to ~4 px radius** (`4.81e-3 × E`, E = P·πS²_dev; mip0 σ = 4 device px, `BloomNode.js:373` `kernelSizeArray[0]=6`, `sigma = kernelRadius/3`). Against the config's own visibility floor (0.018 lumLin ≈ 36/255 over navy) **that is a visible ball ~5× its own diameter.** Count them: ≤ 100 on frame.

## D. THE FOG TEST — separate, and the historical metric is not usable

The round-8-I "integrated band haze ~5.2k → ~1.0k px²·lum" is in **ledger units** (`POINT_SIZE·sizeK` squared, i.e. 144× a CSS px²) and is **not comparable** to any CSS-px ledger. Converted, the *rejected* fog is 36 CSS px²·lum while the *approved* chord was 5 410 — 150× more. **The fog was never about integrated light; it was about spatial spread** (4 800 sprites smeared across a tube, `STRAND_RADIUS` non-zero). Use localisation, not integral:

| # | predicate | target |
|---|---|---|
| **D1** | perpendicular contrast: `L(on axis) / L(±3S off axis)` | **≥ 15** (the repo's own accepted post-haze-kill ratios are 18.8× core:line, 18.3× fray:surround) |
| **D2** | total bloom wash `3.30 × ⟨L⟩` (Σ of 5 mip weights = **3.000, invariant in radius**; × intensity 1.1) | **≤ 1.5× today's 0.101.** Design delivers ~0.143: the rest strand contributes **zero** (sub-threshold ⇒ the highpass `mix(vec4(0), texel, smoothstep(thr, thr+w, v))` returns exactly 0), the lit segment ~0.042, stars/beads unchanged. **The design adds no bloom load at rest — that is its main defence against the fog scar.** |
| **D3** | star:strand contrast | **≥ 8:1** at rest (10.67 : 0.24 = 44:1 ✔; at the river head 10.67 : 1.24 = 8.6:1 — the trilemma resolves because the bright strand is confined to a moving 456 px segment, so the *static* picture is still stars on darkness) |
| **D4** | on-frame strand coverage | **≤ 3.5 %** of frame (design: `24 450 px × 2.5 px / 1 795 200` = **3.4 %**) |
| **D5** | WCAG worst pixel in the copy column | **≥ 4.5:1** (design ≈ **5.1:1**, budget `ΔL_max = 0.01943`, delivered 0.0110) |

## E. Scars that still bind

C¹ soft knee, never `min()`/clamp on a moving wavefront. Do not interpolate a smoothstep across a wide quad. `alpha` and `cut` scale together or particles delete instead of fading. `CULL_PAD` is hysteresis, not a visibility rule. Blue/cyan/navy only; whitening target is `COL_CORE`; the one sanctioned warm is `uColEmberTip` on the broken fray (hue 36).

---

# PART 6 — PER IL PROPRIETARIO (in italiano)

**Cosa cambia, in una frase.** La linea non è più un oggetto: è la *scia* delle particelle. A riposo il filo c'è sempre — continuo, sottile, spento. Quando l'onda passa, le stesse particelle si allungano lungo il proprio filo (non si ingrossano: si stirano nella direzione in cui viaggiano), si sovrappongono, e per un tratto di circa 450 px diventano una linea di luce vera che fiorisce nel bloom. Poi tornano spente. È esattamente la tua frase, e funziona perché lo stiramento è **anisotropo**: una particella stirata 3× lungo il filo è una scia, non una pallina — mentre nel commit `f6cac67` l'avevamo ingrossata in tondo, ed è per questo che erano "catene di palline luminose".

**Cosa ti costa questa inversione — e non lo minimizzo.** Stamattina hai approvato il filo netto per tre ragioni che restano tutte valide:

1. **La nitidezza.** Il filo era largo **1 pixel fisico**. Quello nuovo è largo **2,5 px CSS (5 px fisici): cinque volte tanto.** Non è un problema di tuning — per fare una linea da 1 px con le particelle servirebbero 107.000 particelle contro le 27.000 che abbiamo. **Questa è la perdita vera, ed è irreversibile finché la linea la fanno le particelle.**
2. **L'indipendenza dal budget.** Il filo era geometria cotta: costava uguale su desktop e su telefono. Ora la linea si paga in particelle, e **sul telefono siamo al 96 % del tetto, senza margine.** Se la misura sulla GPU va male, la mia proposta è tenere il filo **solo sul telefono**, e dirtelo apertamente invece di far finta che si veda uguale.
3. **Il contratto "la linea non brilla mai".** Esisteva perché la luce di quella fascia appartiene alle stelle e ai pacchetti. Ora la linea brilla — ma **solo nel tratto in movimento**. A riposo resta sotto la soglia del bloom, quindi la fotografia statica è ancora "stelle sul buio". Il rapporto stella:filo passa da 44:1 a 8,6:1 **solo dentro l'onda**.

**Due cose che scopriamo strada facendo, e che ti riguardano.**
- La densità che avevi approvato (≈103 nodi visibili) corrisponde all'opzione **835 nodi**, non a quella che chiamavamo "on-frame" (391 → solo 50 nodi visibili). La banda è inclinata a 45°, quindi in ogni istante se ne vede il **12,85 %**, non il 26 %. Cambia quale delle tre opzioni ti mettiamo davanti.
- Con la banda a 45° alta esattamente quanto lo schermo, **la rete copre solo il 44 % dell'inquadratura** in ogni istante. Le due decisioni (45° + altezza = schermo) non possono entrambe dare una rete che riempie il quadro. Va scelto.

**Cosa devi guardare tu, con gli occhi, e decidere.**
1. **La larghezza del filo.** 2,5 px è la scelta economica. 2,0 px costa il 20 % di particelle in più. 1,5 px non entra nel budget. Guarda i due e dimmi.
2. **La densità:** 825 nodi (parità con quello che hai approvato), 656 (−20 %), 389 (metà).
3. **Il tratto illuminato:** ora è lungo ~450 px e passa ogni ~3,7 secondi anche se non scrolli. Più lungo = più luce diffusa; più corto = più simile a un lampo.
4. **L'ultimo quarto della banda** (dopo la frattura) resta **continuo ma spento**: nessun pacchetto, nessuna onda. È la storia, ma va vista.
5. **Il fallback senza JavaScript / animazioni ridotte** continua a disegnare tratti netti in SVG: chi arriva da lì vede la grammatica che hai appena scartato. O la riscriviamo, o lo dichiariamo.

---

# PART 7 — WHAT NEEDS A GPU CAPTURE OR A LIVE LOOK

**Blocking (the design is contingent on these):**

1. **WebGL2 analytic-tier vertex time.** `anchorNode` (`:1881`) runs inside `material.vertexNode` (`:3244`, `:3260`), **4× per sprite, per frame, with no compute stage to amortise it** (`geometry.instanceCount` at `:1331` is the only CPU handle; `frustumCulled = false` at `:3166`). Baseline is **33 990 sprites = 135 960 evals**, not the 36 000 the corpus assumed (`NeuralLattice.tsx:347-364` already scales the count by the ribbon's node ratio). The design is **108 000 = 0.80×**, so this is now a **no-increase** question rather than a 3.5–13× one — but it has never been measured, and every affordability number in Part 2 rides on it. Measure on `?backend=webgl2` at 1920×935 and at 390×844.
2. **Does a 2.5 px sub-threshold comb read as "the particles making the line" at all?** Pure look call. Nothing in the arithmetic answers it.
3. **The `>1.0` connectivity mask (Part 5 §C).** Binary, and it is the test that would have caught `f6cac67` before the owner saw it. Capture the linear buffer, threshold at 1.0, look at the crest.

**Important (they move constants, not the design):**

4. **The real per-particle `dist`/`depthK` distribution.** Authored `dist` range [10.08, 13.92] (`NeuralLattice.tsx:1076`); perspective cancels inside a link (diameter and on-screen length both scale 1/dist), but `depthAtten` (±25 %, `NEURAL_DEPTH_ATTEN 0.5`) × DOF (±13.5 %) = **0.649×** worst case, so a link seeded at exactly 1.65× on the mean sits at **1.07× at the far/dim end — dotted.** Either size at the far end (×1.5 on every `perEdge`) or soft-knee `depthK` on the stream branch only — **soft knee, never a hard clamp**.
5. **The exact Δx:Δy ratio of the traverse.** The κ-window (§2.3) assumes the frame moves along the band's own 45° axis. `fieldMap` gives screen dy/dx = +1 exactly, and the commit history says the copy and the net ride one diagonal — but the driver's lateral-run-per-scroll-px has not been read here. If it is not 1:1, the κ key needs a slope term (still one scalar).
6. **`dpr` dependence.** `NeuralLattice.tsx:1227` caps `uPixelRatio` at 2 and `:731-736` **freezes whatever the perf monitor last set** for the act. Sprite diameters in CSS px are dpr-invariant, but the bloom σ is fixed in *device* px ⇒ **σ₀ is 2 CSS px at dpr 2 and 4 CSS px at dpr 1**, so the halo width and the fusion margin move by 2×. Check both.
7. **The stratified comb at the `fract()` wrap.** With per-link `speedVar`, one particle per link wraps every ~54 ms. Today the same happens at random phases and is masked by `EDGE_FADE`. Verify it stays masked with a comb.
8. **Fragment cost at 3.4 % coverage** with additive blending and `depthTest: false`, particularly on lite.
9. **`PLEXUS_EDGE_CAP`** — 250 today; it will silently truncate a 1 709-edge net. Read it before the first build.
10. **UBO block *size*** (not count): `uNodePos`/`uNodeT` are `uniformArray`s (`:1143-1146`); at 825 nodes each is 825 × 16 B = **13.2 KB = 81 % of the 16 KiB WebGL2 min-spec floor**. `PLEXUS_DEDUP_MAX_NODES` 1024 is exactly 16 KiB. The `nearest` arm is close to the wall.
11. **`PACKET_COUNT 2 / PACKET_SPAN 6`** duty 1/3 on 1 709 links gives **570 live beads**, not the ~76 D24 assumes; the κ-window restores it to **97**. Verify the window gates traffic too, or D24's census breaks silently.
12. **`packetClock` is keyed on the receiving node** (`:2107-2121`) and welded to `nodeKissAt` (`:2161-2181`), so every in-edge of a node fires in lockstep. `riverAt` must key on **phase**, not per node, or every spoke of a high-degree star lights identically and reads as a repeating motif.
# Research: ROUND 11 — the coverage trilemma, and whether a recycling field breaks it

- **Query**: verify the implementer's Stage-1 coverage arithmetic; assess a recycling / wrapping field against the real code; solve or disprove the link-seam problem; rank the options with numbers.
- **Scope**: internal (code + shipped dossiers), no browser run.
- **Date**: 2026-08-24
- **Reference viewport for every number below**: 1280 × 720 (`W = 1280`, `ih = 720`, `1 vh = 720 px`), the same reference the storyboard uses.

---

## 0. THE SHORT ANSWER

1. **The coverage arithmetic is exact.** Coverage `= (bandVh + 1) / runwayVh` is right, `30.5 %` is right, and all three rows of the table reproduce to the pixel. The binding constraint is **vertical**, not lateral — the lateral cull does not fire until 4.07 vh (66.7 % of the runway).
2. **The trilemma as stated is real but mis-framed.** It is not `{angle, lateral run, presence}`. The angle is not in it at all: at `runwayVh = 6.10` the coverage is 30.5 % **whatever the angle is**, including 0°. The true trilemma is `{runway length, ONE cloud, presence}`.
3. **Dropping "ONE cloud" breaks it**, and the code is unusually well shaped for it: there is exactly **one node-position accessor** (`nodeAt`, `neuralFieldCompute.ts:1168`) read by the particles *and* the lines on *both* backends, and the culled path returns **before** the compute dispatch (`NeuralLattice.tsx:473` vs `:823`), so an off-frame field costs literally zero.
4. **The link seam is solvable, and the best solutions never create one.** Tiling and a cluster sequence draw complete graphs and have no seam at all. Node-level `mod()` wrapping *does* create one, and the minimum-image fix is well-conditioned here (longest edge `|dx| = 0.0758` local against a `span/2 = 0.45` ambiguity threshold — **6× margin**), but it is strictly dominated.
5. **The implementer's rejection of "enlarge the cloud" reaches the right verdict on wrong numbers** — the honest multiplier is **11.5×**, not 60×; `uEdgeA` is **40.9 KiB**, not 218 KB; and with index packing `uEdge` drops to **10.2 KiB and fits**. What actually kills enlargement is `uNodePos` at **18.6 KiB** (1188 nodes × 16 B, over the 16 KiB floor) and a **~104,000-particle** budget. Same verdict, different cause — and the cause matters, because it says *which* wall to attack if the owner insists.
6. **A second, un-reported P0 rides on the same finding**: `CrystalCluster.tsx` does not read the traverse store at all (`grep traverseStore|traverseConfig|rigRef|lateralPx src/webgl/CrystalCluster.tsx` → **zero hits**). The stone shares the band's 30.5 % *and* stays put while the net slides 1920 px left. Beats **G4** and **M5** of the storyboard — "the stone crosses to centre", "THE WALL + the three callouts", 3246 → 4392 px — currently have **neither net nor stone**.

---

## 1. VERIFICATION OF THE ARITHMETIC

### 1.1 The constants, sourced

| quantity | value | source |
|---|---|---|
| `angleDeg` | 23.61° | `src/webgl/neural/traverseConfig.ts:97` |
| `R = tan(angleDeg)` | **0.437097** | `traverseConfig.ts:120-124` |
| `bandVh` | **0.8597** (= 619/720) | `traverseConfig.ts:103` |
| runway | `1.85 + 4 × 1.06 = 6.09 ≈ 6.10 vh` | `traverseConfig.ts:98-100`; storyboard §B3 uses `H = 4392 px` |
| band pin | `bottom: auto; height: calc(0.8597 * 100svh)` | `problem-section.tsx:307-310`, armed at `use-diagonal-traverse.ts:144-155` |
| anchor | `absolute inset-y-0` of `[data-traverse-stack]` | `problem-section.tsx:493-495` |
| `CULL_PAD` | 220 px | `NeuralLattice.tsx:178` |

### 1.2 The lateral run — confirmed

```
runwayPx  = 6.10 × 720                = 4392 px
lateralPx = 0.437097 × 4392           = 1919.7 px = 1.4998 W     ✓ "1920 px = 1.50 W"
```

### 1.3 The vertical presence — confirmed, and it is the binding constraint

`NeuralLattice.tsx:469-471` places the group from `vpTop = rect.docTop − scrollY`, i.e. the band **scrolls with the document**. `:473` culls when `vpTop + rect.h < −CULL_PAD || vpTop > ih + CULL_PAD`. A box of height `h` is therefore on frame across exactly `h + ih` of scroll:

```
presence  = 619 + 720 = 1339 px = 1.8597 vh
coverage  = 1.8597 / 6.10 = 30.49 %                              ✓ "30.5 %"
         ≡ (bandVh + 1) / runwayVh                               ✓ the closed form
```

The table reproduces exactly:

| `runwayVh` | lateral | as W | coverage |
|---|---|---|---|
| **6.10** | 1919.7 px | **1.500** | **30.5 %** ✓ |
| 5.00 | 1573.9 px | 1.229 | 37.2 % |
| 4.00 | 1259.1 px | 0.983 | 46.5 % |
| **3.10** | 975.8 px | **0.762** | **60.0 %** ✓ |
| 2.50 | 786.8 px | 0.615 | 74.4 % |
| **1.8597** | 585.4 px | **0.457** | **100.0 %** ✓ |

### 1.4 The lateral cull is NOT the limit — a correction worth carrying

`NeuralLattice.tsx:481-491` culls laterally when `|lateralPx| > (vw + rect.w)/2`. The band is full-bleed (`rect.w = 100vw`, `NeuralLattice.tsx:289`), so that is `|lateralPx| > W`, i.e.

```
travelled = 1280 / 0.437097 = 2928 px = 4.07 vh = 66.7 % of the runway
```

**Vertical exit at 30.5 % beats lateral exit at 66.7 % by 2.2×.** So:

> **The angle is not a term in the trilemma.** Set `angleDeg = 0` and the coverage is still 30.5 %.
> The trilemma is **`{6.10 vh runway, one finite cloud, presence throughout}` — pick two.**

This matters for how the choice is put to the owner: he is not being asked to give up the diagonal. He is being asked whether the net is *one object he walks past* or *a field that keeps coming*.

### 1.5 Where the band actually sits — the "rows 02 and 03 over empty page" claim

`[data-traverse-stack]` carries `margin-top: var(--tv-gap)` and `.plrow + .plrow { margin-top: var(--tv-gap) }` (`problem-section.tsx:304-305`), so the authored gaps live **inside** the stack while the anchor is `absolute` at the stack's **top** with a fixed 619 px height. Against the storyboard's §B3 beat table:

| beat | section-y | net on frame? |
|---|---|---|
| G0 ENTRY | 0 → 571 | partly |
| M1 CHAPTER PLATE | 571 → 951 | **yes** |
| G1 TRAVEL 1 (core 165) | 951 → 1522 | **yes** |
| M2 ROW 01 | 1522 → 1716 | leaving |
| G2 TRAVEL 2 (core 122, fray begins) | 1716 → 2287 | **no** |
| M3 ROW 02 | 2287 → 2481 | **no** |
| G3 TRAVEL 3 (core 88, stone first sighted) | 2481 → 3052 | **no** |
| M4 ROW 03 | 3052 → 3246 | **no** |
| G4 THE APPROACH (stone crosses to centre) | 3246 → 4089 | **no** |
| M5 THE WALL + callouts | 4089 → 4392 | **no** |

Storyboard §B3: *"Copy occupies 1021 px of 4392 = 23.2 %. The other 76.8 % — 4.7 viewports — is wordless net."* **2823 px of that 3371 px of "wordless net" is currently wordless page.** The implementer's report is correct and, if anything, understated: it is not only rows 02/03, it is the entire second half of the act including the stone's whole arc.

> ⚠ **Verification limit.** The band's `docTop` inside the section is derived from the CSS and the markup, not measured in a browser. The *presence formula* is exact regardless of where the band sits; only the beat-by-beat mapping above depends on the inferred `docTop`.

---

## 2. THE "ENLARGE THE CLOUD" REJECTION — right verdict, wrong numbers

### 2.1 What the cloud would have to cover

Two ways to size it, and they differ by 1.5×:

**(a) Bounding rectangle.** `runwayPx × (W + lateralPx)` = `4392 × 3200` = 14.05 Mpx² → **17.7×** today's band (`619 × 1280 = 0.792 Mpx²`).

**(b) The swept corridor** — the honest one, because the viewport sweeps a diagonal strip, not a rectangle. Perpendicular width needed is the viewport's own extent perpendicular to the travel direction:

```
crossing = ih·sin θ + W·cos θ = 720(0.4003) + 1280(0.9165) = 1461 px
```

— which is **the same 1461 px the storyboard already computed for the ignition front's crossing length** (§B6.2, 1280×720 row). The two are the same quantity; the front is perpendicular to the element paths by construction (§B6.1). Path length `= √(4392² + 1920²) = 4793 px`. Corridor area ≈ `(4793 + 1461) × 1461 = 9.14 Mpx²` → **11.5×**.

### 2.2 The corrected budget table

Edge/node ratio is measured, not assumed: **227 / 103 = 2.204** (`broken/full`, reproduced below in §3.1).

| | seeds→N | E | `uNodePos` | `uEdgeA` alone | `uEdge` merged+packed⁴ | particles for parity |
|---|---|---|---|---|---|---|
| shipped | 103 | 227 | 1.6 KiB | 3.5 KiB | 0.9 KiB | 9 000 |
| **corridor (11.5×)** | **1188** | **2618** | **18.6 KiB ✘** | **40.9 KiB ✘** | **10.2 KiB ✔** | **~103 800** |
| bounding rect (17.7×) | 1827 | 4026 | 28.5 KiB ✘ | 62.9 KiB ✘ | 15.7 KiB ✔ | ~159 600 |

The WebGL2 `MAX_UNIFORM_BLOCK_SIZE` floor is 16 KiB and `UniformArrayNode` pads **every** element to a vec4 = 16 B (verified in `node_modules/three/src/nodes/accessors/UniformArrayNode.js:161-186`, `getPaddedType()` returns `'vec4'` for float/vec2/vec3 alike) ⇒ **1024 elements per block, hard.**

### 2.3 Where the implementer's numbers came from, and why they should be corrected

- **"~5.1 vh × ~11.3 vw."** `5.1 / BAND_ASPECT(0.45) = 11.33` — that is 11.33 **viewport heights** of width, i.e. **6.37 vw**, not 11.3 vw. The aspect-preserving cloud is `5.1 vh × 6.37 vw`.
- **"~1.7 % of its area."** `(1/5.1) × (1/11.33) = 1.73 %` treats the 11.33 as vw. Consistently in vh²: `1.778 / (5.1 × 11.33) = 3.08 %`. Against the corridor (the shape that actually matters): `1.778 / 17.6 = 10.1 %`.
- **"~60× the nodes"** and **"218 KB"**: `60 × 227 × 16 B = 217 920 B` — internally consistent with the 60×, which comes from the same unit slip. The corridor figure is **11.5× / 40.9 KiB**.

**The verdict survives the correction, but the failure mode moves.** `uEdgeA` is *not* the wall — merge + pack (§5) puts 2618 edges in 10.2 KiB. The walls that actually hold are:

1. **`uNodePos` at 18.6 KiB** — 1188 vec3s, 1.14× the 16 KiB floor. There is no packing escape for vec3 positions through `uniformArray`.
2. **~104 000 particles.** On the WebGPU tier that is a bigger dispatch and a bigger draw; on the **WebGL2 analytic tier it is 104 000 vertex-stage evaluations of `anchorNode()`** (`neuralFieldCompute.ts:2870`, `:1553-1710` — `edgeFrame` + perpendicular frame + strand twist + fray, per particle, per frame). That is the real number to quote.
3. It buys, at that price, a field of which **~90 % is off screen at any instant**.

> **Framing for the owner:** enlarging is paying 11.5× for a thing he can only ever see 1/11.5 of. That is the argument — not a uniform-buffer number he cannot evaluate.

---

## 3. THE CODE, AS IT ACTUALLY IS

### 3.1 Where node positions come from — measured, by re-running the generator

`buildPlexus` (`neuralLatticeConfig.ts:377-525`) is pure and deterministic. I ported it verbatim to JS and ran it (scratchpad `plexus.js`; the port is line-for-line, including the `ph()` hash constants, the crystal clearance well, `EDGE_MIN_LOCAL`, the two-pass link selection and the cap).

| | `broken/full` | `healthy/full` | `broken/lite` |
|---|---|---|---|
| seeds → delivered nodes | 132 → **103** | 132 → **101** | 74 → **56** |
| edges (must + extra, capped) | **227** (74 + 153) | **229** | **110** |
| mean degree | 4.41 | 4.53 | 3.93 |
| isolated nodes | 0 | 0 | 0 |
| local x extent | [−0.4207, 0.4882] **span 0.9089** | [−0.3731, 0.4240] span 0.7971 | span 0.8757 |
| local y extent | [−0.3363, 0.4175] span 0.7538 | span 0.7642 | span 0.7434 |
| **edge \|dx\| p50 / max** | 0.0279 / **0.0758** (8.3 % of x-span) | 0.0272 / 0.0841 | 0.0359 / 0.1055 |
| **edge \|dy\| p50 / max** | 0.0686 / **0.1903** (**25.2 %** of y-span) | 0.0711 / 0.1791 | 0.0718 / 0.2163 |
| **connected components** | **3 — sizes 80, 20, 3** | 2 — sizes 86, 15 | 2 — sizes 47, 9 |

Positions are authored **once, at build time**, into `uNodePos = uniformArray(Vector3[])` (`neuralFieldCompute.ts:980-982`) and are then **static** — nothing animates them; `nodeDrift()` (`:1245`) adds a *hashed, time-varying* displacement on top, gated by `uBroken` and the fracture, but the table itself never changes. `uNodeT`, `uEdgeA`, `uEdgeB` likewise (`:983-985`).

**Both backends read the same table through the same function.** `nodeAt(idx)` (`:1168-1172`) is the single accessor:

- **stars** — `anchorNode` star branch, `:1660` (`nodeAt(aux).add(nodeDrift(...))`)
- **link particles** — `edgeFrame`, `:1287-1288` (`A = nodeAt(ia)…`, `B = nodeAt(ib)…`)
- **link LINES** — `buildLinkLineLayer`, `:2612-2616` (`AL = nodeAt(iaL)…`, `posL = mix(AL, BL, sL)`)
- **WebGPU compute tier** — `simulate()` calls `anchorNode({curl:true})` at `:2953`
- **WebGL2 analytic tier** — the same `anchorNode()` at `:2870`, evaluated in the vertex stage with no spring

> **This is the single most important structural fact in this dossier.** Any change to how a node's position is derived lands in **one function**, and propagates to particles, lines, WebGPU and WebGL2 for free. There is no second generator and no second topology (`:2560-2566` states the contract explicitly).

### 3.2 The rig

`NeuralLattice.tsx:508-515`:

```
group.position = camera.position + camera.quaternion·( (cx−vw/2)·k , (ih/2−cy)·k , −CAMERA_Z )
rig.position.x = lateralPx · k                     // WORLD units, outside the anisotropic scale
scaleGroup.scale.set(wWorld, hWorld, zWorld)
```

with `cy = vpTop + rect.h/2`. **The lateral is a rig translate; the vertical is the DOM box.** That asymmetry is the whole finding: the traverse gave the net a horizontal freedom it never gave it vertically.

`zWorld` is already viewport-relative on a traversed band (`:502-505`, `NEURAL_DEPTH_VIEWPORT_SPAN = 0.8597`), so the mechanism dossier's §4.2(1) catastrophe is already defused and depth is **independent of any band-height change**. Good news for every option below.

### 3.3 The uniform-block ceiling, verified

`neuralFieldCompute.ts:944-978` is the authoritative note and it is correct:

- **particle material, vertex stage: 9 `uniformArray` blocks** (`uNodePos`, `uNodeT`, `uEdgeA`, `uEdgeB`, `uRingGlow`, `uRingFlash`, `uRowGlow`, `uStrandPhase`, `uStrandThick`) **+ up to 3 of three's shared groups = 12 of the WebGL2 `MAX_VERTEX_UNIFORM_BLOCKS` floor of 12. Zero headroom.**
- **line material, vertex stage: 5 arrays + 3 = 8 of 12.** Four spare (`:2570-2582`).
- Plain `uniform()` scalars join an existing shared group and cost **no block** — this is how `uCopyLaneC/W/Soft/Floor` were added (`:2583-2589`).

### 3.4 The recycle snap already exists — and excludes stars

`neuralFieldCompute.ts:3000-3014`:

```
linkSnap = mix(1e9, WRAP_SNAP_DIST(0.038), armed)     // armed = reveal>0.9 ∧ !recohere ∧ !fraying
snapDist = select(role<0.5, linkSnap, select(role<1.5, 1e9, SPARK_SNAP_DIST))
If(length(anchor − pos) > snapDist) { pos = anchor; vel = 0 }
```

**Stars get `1e9` — they never snap.** The comment (`:2981`) says why: *"Star cores never jump (their anchor is continuous → huge bound)."* Any mechanism that teleports a node breaks that premise and produces a spring flight across the whole field on the compute tier. The fix is one `select` argument (a large-but-finite star threshold, e.g. `0.5 × span`); the analytic tier needs nothing because it has no spring.

---

## 4. THE THIRD OPTION, ASSESSED

> *"scrollando vai avanti … nella rete neurale che si illumina, poi viene una scritta animata, **poi si va avanti nella rete e ne appare un'altra**, la pietra meteorite eccetera."*

The owner's sentence has a structure the storyboard **already** encodes: §B6.4 specifies **5 ignition sweeps, one per gap G0–G4**, and §B3 lays out exactly **five wordless gaps**. He is describing a *sequence*, and the film is already scored for five of them.

### 4.1 Can the field wrap in x? Yes — and it is the wrong axis

`x_wrapped = mod(x + travel, span) − span/2` would live in **`nodeAt()` (`:1168`)** — one function, both backends, particles and lines. TSL cost: `floor`, `div`, `mul`, `sub` — all four already imported (`:882-912`); `mod` is not imported but `x.sub(span.mul(floor(x.div(span))))` is. Plus **one plain `uniform()` scalar** `uTravel` (shared group, **zero new blocks**). ~6 ALU per node read.

**But it does not solve the problem.** The deficit is vertical (§1.4). Wrapping x recycles the axis that already survives to 66.7 % and leaves the axis that dies at 30.5 % untouched. A y-wrap is far worse: measured edge `|dy|` reaches **25.2 % of the y-span** (vs 8.3 % in x), and a horizontal seam straddles **20.9–22.8 edges on average, 46–48 at worst (≈10 %)** at *every* seam position — there is **no** zero-straddle y window in any of the three builds.

### 4.2 The link seam — solved three ways, ranked

**(i) TILE THE WORLD — no seam exists.** Draw the *complete* field twice, at `x` and `x ± span` (or, correctly, offset along the traverse direction). Every link is intact inside each tile; nothing straddles anything. `buildVertex` uses `modelViewMatrix` (`:2229`) and the line stage uses `cameraProjectionMatrix.mul(modelViewMatrix.mul(...))` (`:2620`), so a second `Mesh`/`LineSegments` sharing the same geometry and material at a different parent position is **correct with zero shader changes**. (`<primitive object={build.links.object}>` cannot be mounted twice — an `Object3D` has one parent — so the second line tile needs `new LineSegments(build.links.geometry, build.links.material)`; the geometry and material are shared, so it is one extra object, not one extra build.)

- **Fill cost: unchanged.** Two tiles each half on frame present the same on-screen sprite area as one tile fully on frame. What doubles is *instance submission* and *vertex shading*, most of which is clipped.
- **UBO cost: zero.** Same material, same 12/12.
- **Compute cost: zero extra on WebGPU** (one dispatch, shared `positionBuffer`); the analytic tier pays a second `anchorNode()` pass.
- ⚠ **The one real cost, and it is not obvious:** tiles share the material, hence share `uCopyLaneC/uCopyLaneW` — which are expressed in the band's **LOCAL x** (`NeuralLattice.tsx:749-756`). Tile B sits at a different screen x, so the copy mask would land in the wrong place on it by exactly the tile offset. The same applies to the ignition front. **Rule: the moment more than one instance of one material exists, every screen-referenced field must be computed from `modelViewMatrix·center`, not from local coordinates.** For the front this is *already the specification* (§B6.1: `σ(px) = n·px − D(s)`, screen coordinates). For the mask it is a change in a hot path on both tiers.

**(ii) WRAP WHOLE CLUSTERS — viable, needs the generator re-authored.** The graph is **already disjoint**: `broken/full` splits into components of **80 / 20 / 3**, `healthy/full` into **86 / 15**. The 20-node lobe at local x ∈ [0.26, 0.49] is carved off by the crystal clearance well (`neuralLatticeConfig.ts:427-431`), and there is a genuine zero-straddle x window at **[0.186, 0.259]** (broken) / **[0.147, 0.293]** (healthy). So the topology *is* clusterable in principle — but into 3 wildly unequal pieces, one of which is 78 % of the mass. That is not a usable partition.

Authoring M *equal* clusters is a ~15-line change to `buildPlexus`: seed M blob centres along the strip, assign nodes, and restrict each node's candidate list (`:432-445`) to same-cluster nodes. Then no link can straddle, ever, by construction. The per-node cluster id costs **nothing**: `uNodeT` is a float array padded to vec4, so **three components per element are already allocated and unused** (§5.1). The wrap then lives in `nodeAt()` as `pos + clusterOffset(id)`.

**(iii) MINIMUM-IMAGE (wrap the edge, not the node) — mathematically clean, visually stubby.** In `edgeFrame` (`:1287-1288`) and the line chord (`:2612-2616`), replace `B` with `B' = A + Δ − span·floor(Δ/span + 0.5)`, `Δ = B − A`. No starburst: every link is drawn at its short length. **Well-conditioned here** — the longest edge `|dx|` is **0.0758** against an ambiguity threshold of `span/2 = 0.454`, a **6× margin** (and 4.3× on `lite`). Cost: 3 ALU, in the one place. **The residue**: a straddling link is drawn once as a stub poking past the field boundary with no terminating star, and its partner shows a matching stub on the far side. At **7.7 straddling edges on average (3.4 %), 28 at the worst seam (12 %)** for `broken/full`. Not a starburst — but visible if the seam is on screen, and a single-period wrap **cannot keep its seam off screen**: the seam is at a fixed local x and the field slides, so it sweeps the frame once per period. Superseded by (i) and (ii), both of which have no seam at all.

**(iv) CULL STRADDLING LINKS — cheap, leaves holes.** A per-vertex test in the line stage (`eIdx → straddle flag`, one `Discard` or an alpha zero) hides 3.4 % of links on average, 12 % at the worst seam. Cheapest of all, and the holes are small — but they appear precisely where the eye is (the seam is a moving vertical line) and it does nothing for the link *particles*, which would still fly the full chord.

### 4.3 The seam-off-screen question

For a **single-period node wrap**: impossible. The seam sits at a fixed field coordinate; as the field slides the seam sweeps the frame once per period, whatever the span.

For **tiling** and for a **cluster sequence**: the question does not arise. There is no seam, only a *join* — a density minimum where one cluster's tail meets the next's head. With today's ellipsoidal cloud (`PLEXUS_RADIAL_POW 2.2`, `PLEXUS_WARP 0.22`, `neuralLatticeConfig.ts:258-261`) that join is already a natural thinning, and thinning is exactly what "e ne appare un'altra" describes.

---

## 5. FREE HEADROOM FOUND ALONG THE WAY

These are independent of which option is chosen and each is verified against three r184 source, not assumed.

### 5.1 Every `uniformArray` element is 16 B, whatever its type

`UniformArrayNode.getPaddedType()` returns `'vec4'` for `float`, `vec2` and `vec3` identically (`node_modules/three/src/nodes/accessors/UniformArrayNode.js:161-186`), and `update()` writes floats at stride 4 (`:198-206`). Therefore:

- **`uNodeT` (103 floats) burns 1648 B and one block to carry 412 B of data. Three components per element are free**, right now, with no size or block cost. The `nodeKissAt` comment (`neuralFieldCompute.ts:1840`) says a per-node in-degree table *"would need a fifth uniformArray (a new binding)"* — **it would not.** It fits in `uNodeT.y`.
- **`uEdgeA` + `uEdgeB` (227 floats each) can merge into one `uniformArray(Vector4[])`** carrying `(a, b, spare, spare)`. That is **−1 UBO block on both programs**: particle vertex stage **12 → 11 of 12** (the first headroom it has ever had), line stage 8 → 7. Bytes halve, 7264 → 3632.
- **Index packing goes further.** Both endpoints fit in ONE float as `a + 1024·b`, decoded with `b = floor(v/1024); a = v − 1024·b`. Exact in float32 for `N ≤ 4096` (`4096² = 2²⁴`, the integer-exact limit; at `N ≤ 1024` there is 16× margin). Four edges per vec4 ⇒ **edge ceiling 1024 → 4096**, and `uEdge` for the 2618-edge corridor drops from 40.9 KiB to **10.2 KiB**.

> ⚠ **Not proven in this repo.** `uniformArray(Vector3[])` and `uniformArray(number[])` are both shipped here; `uniformArray(Vector4[])` takes the identical `getPaddedType` path but is not currently exercised. It should be compiled on the WebGL2 fallback before anything depends on it.

### 5.2 An off-frame island costs exactly zero

`NeuralLattice.tsx` culls and `return`s at `:473-475` (vertical) and `:481-491` (lateral). `build.compute(delta)` is at **`:823`**, and every uniform write is after the cull. So an off-frame island does **no compute dispatch, no draw, no uniform write** — one `useFrame` callback with two comparisons.

**This is what makes a *sequence* of islands nearly free**, and it is the fact that decides the ranking below.

---

## 6. WHAT A RECYCLING FIELD COSTS IN LOOK

### 6.1 The repetition arithmetic

For a repeating field of period `P` (in vh of scroll), the reader sees each cluster `6.10 / P` times, and on-frame node parity with today (103 nodes visible) requires `N = 119.8 · P` nodes per period.

| `P` (vh) | nodes | edges | `uNodePos` | `uEdge` packed⁴ | particles for parity | **appearances** |
|---|---|---|---|---|---|---|
| 1.00 | 120 | 264 | 1.9 KiB | 1.0 KiB | 10 469 | 6.10 |
| 1.50 | 180 | 396 | 2.8 KiB | 1.5 KiB | 15 703 | 4.07 |
| 1.86 | 223 | 491 | 3.5 KiB | 1.9 KiB | 19 469 | 3.28 |
| 2.50 | 300 | 660 | 4.7 KiB | 2.6 KiB | 26 172 | 2.44 |
| 3.00 | 359 | 792 | 5.6 KiB | 3.1 KiB | 31 406 | 2.03 |
| 3.50 | 419 | 924 | 6.5 KiB | 3.6 KiB | 36 641 | **1.74** |
| 5.00 | 599 | 1320 | 9.4 KiB | 5.2 KiB | 52 344 | 1.22 |

(That table assumes a *continuous* strip. With **air between clusters** — the owner's read — the particle cost collapses: at most two clusters are ever on frame, so the shaded budget is `2 × per-cluster`, independent of `P`. See §7.1.)

### 6.2 What decorrelates a repeating field — and it is already in the spec

The worry in the brief is exactly right: *"Act I's argument REQUIRES the light to fail as you advance, so a perfectly periodic field would fight the narrative."* Four things already specified break the periodicity **without touching the geometry**:

1. **The ignition front is screen-space and already specified that way.** §B6.1: `σ(px) = n·px − D(s)`, `n = (−0.9165, +0.4003)`, half-width `w = 0.15 × crossingLength = 219 px @1280`, `ign = smoothstep(w, 0, |σ|)`. A field element is lit by **where it is on the screen**, not by which cluster it belongs to. Two clusters at different screen positions therefore light differently **for free**, and a repeated cluster on its second pass is lit by a different sweep at a different phase.
2. **The sweeps and the field are on incommensurate periods.** §B6.4: **5 sweeps per act**, one per gap. A field at `P = 1.5 vh` cycles 4.07 times. 5 against 4.07 is quasi-periodic — the coincidence pattern never repeats inside the act.
3. **The value ladder is monotone and global.** §B6b: Act I steps **165 → 122 → 88** across G1/G2/G3 — a 2.6 dB drop per gap. The *same* constellation at 165 and at 88 does not read as the same event. **The argument is carried by the value world, and the value world is not periodic.**
4. **The link-fray is monotone too.** §B3 G2: *"link-fray begins"* — links whose far endpoint lies past the fracture drop their tail alpha, driven by `dispFactor(t)`/`uFracture`, which advances with the act. Later appearances of the same cluster are *structurally* more degraded than earlier ones.

**So the recommendation on look is: let the geometry repeat and never let the light repeat.** That is not a workaround — it is the storyboard's own thesis (§B6b: *"the argument carried in the value world rather than in a caption"*).

**What must NOT be used to decorrelate:** a per-tile mirror in y or x, or a 180° roll. `nodeT` is the left→right coordinate that carries the fracture, the ignition regions and the flow direction (`neuralLatticeConfig.ts:344-350`; links are oriented so flow runs left→right, `:451-453`), and D13 fixes the front's direction. Any mirror inverts one of them. Safe rigid decorrelations are **depth push, uniform scale, and a small yaw applied on the rig** (which is outside the anisotropic scale, so a yaw there is a genuine rotation — mechanism §5.3).

---

## 7. THE HONEST ALTERNATIVE, COSTED — and it turns out to be the best one

### 7.1 A sequence of authored clusters: N islands, N anchors, no new mechanism

Instead of one cloud, one wrap, or one tiled world: **mount `NeuralLattice` five times, at five `[data-lattice-anchor]` boxes placed at the five wordless gaps.** Each is today's island, unchanged.

The storyboard's own gap centres (§B3) are at section-y **285 / 1236 / 2001 / 2766 / 3667 px** — a pitch of **765–950 px = 1.06–1.32 vh**, which is exactly `gapVh = 1.06` because they *are* the authored gaps. Against a 619 px (0.8597 vh) cluster that leaves a **0.20–0.46 vh** hole between clusters, well under the 1.0 vh viewport, so **coverage is 100 % with no wrap at all** and at most **two clusters are on frame at once**.

| | value | why |
|---|---|---|
| nodes / edges **per cluster** | **103 / 227 — unchanged** | each island builds its own plexus |
| `uNodePos` / `uEdgeA` per program | 1.6 / 3.5 KiB | unchanged; **UBO pressure does not move at all** |
| UBO blocks | **12/12 per program, unchanged** | each island has its **own material** and its own 12 |
| particles allocated | 5 × 9000 = **45 000** | 5 × (`position`+`velocity`+`off`+`meta`) ≈ **2.3 MB** GPU |
| particles **shaded** | **≈ 18 000** (two clusters) | §5.2 — off-frame islands return before compute and before draw |
| draw calls | +2 while two are on frame | 2 meshes + 2 `LineSegments` |
| screen-referenced uniforms | **no change needed** | each island owns its own `uCopyLaneC/W`, written per frame from its own rect (`NeuralLattice.tsx:749-756`) |
| the stone | **its own anchor, at G4/M5** | fixes §0.6 in the same move |
| new shader code | **none** | |
| distinctness | **make the plexus seed a build arg** | `ms` is one number, `neuralLatticeConfig.ts:381` (`broken → 11.37`, `healthy → 57.19`); promoting it to an argument of `getPlexus`/`buildPlexus` is ~5 lines and yields arbitrarily many decorrelated clouds. **With 5 distinct seeds there is zero repetition.** |

**Shipping-safe variant:** drop `PLEXUS_SEEDS.full` 132 → ~90 and `NEURAL_PARTICLE_COUNT` 9000 → ~5400 per cluster. Two on frame is then ~10 800 shaded particles — **+20 % over today's 9000** — for a net that is present 100 % of the act instead of 30.5 %.

**What it costs that nothing else does:** five anchors in the DOM, five rect measures, and five reveal ramps to phase. And it is *more* DOM, which cuts against the "one scene" instinct — though D6's "one scene" is about the reader never seeing a seam between layers, and five clusters of one field are one scene in exactly the way five gaps are one act.

---

## 8. RANKED RECOMMENDATION

### ① A SEQUENCE OF AUTHORED CLUSTERS — recommended

**Numbers:** 5 islands × 103 nodes / 227 edges. UBO pressure **unmoved** (12/12 per program, each program its own). ~18 000 particles shaded (or ~10 800 in the trimmed variant), 45 000 allocated ≈ 2.3 MB. Coverage **30.5 % → 100 %**. Repetition **zero** once the plexus seed is a build argument. Draw calls +2 while two are on frame; **0 cost when off frame** (`NeuralLattice.tsx:473` returns before `:823`).

**Risk:** low. No shader edit, no seam, no teleport, no snap change, no minimum-image, no view-space rewrite of the mask, both backends untouched, `SignatureLine.tsx` untouched, no pin/sticky/snap. The 12/12 ceiling is not approached. Five reveal ramps must be phased so clusters do not all coalesce at once — a constant, not a mechanism.

**Why it wins:** it is the literal reading of *"si va avanti nella rete e ne appare un'altra"*; it maps 1:1 onto the storyboard's five gaps and five ignition sweeps; and the value ladder **165 → 122 → 88** becomes a property of the *sequence* rather than a global fade — the argument made structural. It also gives the stone its own anchor, fixing the second P0.

**Stage:** Stage 1.5. It is additive to what shipped — the existing island is the unit being repeated.

### ② TILE THE SAME CLUSTER (2 meshes, wrapped rig) — the cheap A/B

**Numbers:** 1 build, 2 meshes + 2 line objects, 18 000 instances submitted, on-screen fill unchanged, UBO unchanged, coverage 100 %, **3.3–4.1 appearances** of one constellation at `P = 1.5–1.86 vh`. Tile offset at `P = 1.5 vh` is `(Δx, Δy) = (472, 1080) px` — the replacement enters **bottom-right**, which is exactly the direction §B6 says content must enter.

**Risk:** medium. Requires moving `uCopyLaneC` (and the front) into **view space** — a hot-path change on both tiers — because the two tiles share one material. The 4 spare UBO blocks on the line program help; the particle program has none until the `uEdgeA/B` merge (§5.1) frees one.

**Use it as:** the one-evening proof that presence-throughout is the right call, before spending Stage 1.5 on ①.

### ③ CLUSTER-LEVEL WRAP IN THE SHADER

**Numbers:** ~15 lines in `buildPlexus`, cluster id free in `uNodeT`'s padding, one `uTravel` scalar (no new block), ~6 ALU in `nodeAt()`, one `select` argument on the star snap. No seam by construction. Node/edge budget unchanged.

**Risk:** medium-high. Re-authoring the link topology into disjoint clusters changes the *look* of the plexus (today's mean degree 4.41 and the 80-node giant component are what "a real 3D brain plexus" reads as). Worth doing only if ① is rejected for DOM reasons.

### ④ NODE-LEVEL WRAP + MINIMUM IMAGE

**Numbers:** 3 ALU, 6× conditioning margin (`0.0758` vs `0.454`). But: wraps the axis that is not failing, sweeps its seam across the frame once per period, leaves 3.4 %/12 % stub links, and needs the star-snap change. **Strictly dominated by ② and ③.** Documented here so it is not re-proposed.

### ⑤ ENLARGE THE CLOUD — rejected, on corrected numbers

11.5× (not 60×). `uNodePos` **18.6 KiB** over a 16 KiB floor with no packing escape; ~**104 000** particles, each running `anchorNode()` in the vertex stage on the WebGL2 tier; ~90 % of it off screen at any instant. `uEdgeA` is **not** the wall — say 40.9 KiB, and say that packing fixes it, so the argument is not later undone by someone who finds the packing.

### If the owner still wants "pick two" put to him

Then the honest framing is **not** `{angle, run, presence}` — the angle is free (§1.4). It is:

> **"The net can be one thing you walk past, or a field that keeps coming. If it is one thing, the act has to be one and a half viewports long — a third of what you approved — and you lose rows 02 and 03, the stone's approach and the wall. If it keeps coming, you keep all 6.1 viewports and the diagonal exactly as approved, and the price is five constellations instead of one."**

That is a choice about the film, which is his. The trilemma as first stated is a choice about a uniform buffer, which is not.

---

## 9. WHAT I COULD NOT VERIFY

- **No browser was run.** Every screen number is arithmetic from the constants and the CSS. The presence formula `(bandVh + 1)/runwayVh` is exact and viewport-invariant; the **beat-by-beat mapping in §1.5 depends on the band's inferred `docTop`** (from `absolute inset-y-0` + `bottom:auto` + `height: 0.8597·100svh`) and should be confirmed with one `getBoundingClientRect` in the console before it is quoted to the owner.
- **`uniformArray(Vector4[])` is not exercised in this repo.** The padding path is identical (`getPaddedType()` returns `'vec4'` for every non-matrix type) but the GLSL fallback should be compiled before §5.1's block saving is depended on.
- **The float index-packing trick (`a + 1024·b`) is arithmetically exact** for `N ≤ 4096` but is not used anywhere in this codebase; it needs a compile check on both backends.
- **No GPU measurement.** The claim that two tiles cost the same *fill* as one is a geometric argument, not a profile. The claim that off-frame islands are free is a **code-path** fact (`:473` returns before `:823`), which is stronger, but the per-frame cost of five extra `useFrame` callbacks and five rect effects is unmeasured.
- **The implementer's 60× / 1.7 % / 218 KB derivations** are reconstructed by inference (they reproduce exactly under a vh/vw unit slip). I could not confirm that is what they did; the corrected figures stand on their own.
- **`CrystalCluster`'s absence from the traverse** is established by a grep returning zero hits for `traverseStore|traverseConfig|rigRef|lateralPx`. Whether that is deliberate for Stage 1 or an omission, I do not know — but the stone and the net will visibly separate by up to 1920 px either way.

---

## 10. FILES READ

| file | what it settled |
|---|---|
| `src/webgl/neural/traverseConfig.ts` | the two authored numbers; `bandVh = 0.8597`; the rollback levers |
| `src/webgl/store/traverseStore.ts` | the frozen-clock contract; zero-allocation frame object |
| `src/components/fx/traverse-rate.ts` | the C² windowed rate; `R = tan θ` |
| `src/components/fx/use-diagonal-traverse.ts` | the band pin (`--tv-band-h`), `secTop`/`secH`, `xScenePx` publication |
| `src/components/sections/problem-section.tsx` | the anchor markup + the file-scoped traverse CSS |
| `src/webgl/NeuralLattice.tsx` | placement, both culls, the rig, the compute dispatch site, the lane writes |
| `src/webgl/neural/neuralFieldCompute.ts` | `nodeAt` / `edgeFrame` / `anchorNode` / the line layer / the snap / the UBO note |
| `src/webgl/neural/neuralLatticeConfig.ts` | `buildPlexus`, the density presets, `BAND_ASPECT`, `WRAP_SNAP_DIST`, depth spans |
| `src/webgl/CrystalCluster.tsx` | the stone rides the same anchor and has **no** traverse rig |
| `node_modules/three/src/nodes/accessors/UniformArrayNode.js` | vec4 padding for every element type; `.element()` formatting |
| `…/2026-08-24-round11-diagonal-traverse-mechanism.md` §4.2, §4.4, §5 | the §4.4(b) cost was **predicted**: *"the net is on frame for only ~2 of the 6.1 viewports"* |
| `…/2026-08-24-round11-diagonal-traverse-storyboard.md` §B3, §B6, §B6b | the beat table, the screen-space ignition front, the 5 sweeps, the value ladder |

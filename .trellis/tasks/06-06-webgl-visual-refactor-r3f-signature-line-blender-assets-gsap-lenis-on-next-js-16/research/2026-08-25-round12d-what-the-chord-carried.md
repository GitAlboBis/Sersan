TASK C — WHAT THE CHORD WAS CARRYING

Repo root `C:/Users/alber/Desktop/sersan-v2-main`. All paths absolute-relative to it. Numbers marked **(measured-in-repo)** are quoted from source comments/constants; **(derived)** are my arithmetic off those constants; **unverified** where I could not confirm.

---

## 0. THE COMPLETE CONSUMER SET OF THE LINE LAYER (it is smaller than feared)

Only ONE file imports the baker:
- `src/webgl/neural/neuralLinkLines.ts:101` `bakeLinkLineGeometry` — sole importer is `src/webgl/neural/neuralFieldCompute.ts:300`. Nothing else in `src/` references it.
- `src/webgl/neural/neuralFieldCompute.ts:2935-3177` `buildLinkLineLayer()`; built unconditionally at `:3194` (`const links = buildLinkLineLayer();`); typed `NeuralFieldLines` at `:698-703`; exposed on the build at `:716`, `:3288`, `:3513`; disposed at `:3299-3300` and `:3527-3528`.
- `src/webgl/NeuralLattice.tsx:1633` `<primitive object={build.links.object} />` (the only mount); dev-handle reads at `:1356-1357` (`linkLines`, `linkVerts`) and `:1358-1363` (`lineAlpha/lineEmissive/lineLumMax/lineBlue/lineSurgeGain/lineRowGain`).
- Symbols destructured for it alone: `BufferGeometry` `:1012`, `LineBasicNodeMaterial` `:1016`, `LineSegments` `:1017` (verified: `LineSegments` appears only at `:3165`, `BufferGeometry` only at `:2937`, `LineBasicNodeMaterial` only at `:2940`).
- Config block `src/webgl/neural/neuralLatticeConfig.ts:1508-1658` (`LINK_SEGMENTS` 1548 … `LINE_REVEAL_STAGGER` 1654).

**⚠ THREE THINGS THAT LOOK LINE-ONLY AND ARE NOT — deleting them breaks other layers:**
1. `copyMaskLineAt()` (`neuralFieldCompute.ts:1785-1789`) is read by the line at `:3102` **and by the NEBULA at `:2841`** (broken mode). It survives the line.
2. `uCopyLineFloor` (`:618`, `:1257`, driver `NeuralLattice.tsx:783`/`:793`, dev handle `:1379`) is therefore still live for the nebula, and `COPY_MASK_FLOOR_LINE = 3e-3` (`neuralLatticeConfig.ts:2815`) stays its floor.
3. `EDGE_FADE_IN/OUT` (`config:1660-1661`), `EDGE_MID_BRIGHT` (`config:2061`), `DEBRIS_FADE` (`config:1945`) are read by the **particle** path too (`neuralFieldCompute.ts:2243-2246`, `:2331`, `:2360`).

---

## 1. EVERYTHING THE CHORD PROVIDES — item by item

| # | Chord feature | Where (neuralFieldCompute.ts) | Particle equivalent |
|---|---|---|---|
| 1 | **Structural spine** — the continuous 1 px A→B chord | bake `:2936`, live chord `:2944-2952`, `LineSegments` `:3165`, `frustumCulled=false` `:3166`, `renderOrder=-2` `:3169` | **LOST — totally.** `STRAND_RADIUS = 0` (`config:1462`) already parks link particles *on* the chord, and `STREAM_ALPHA = 0.012` (`config:2356`, post-blend 0.018) is a dust floor deliberately sized *not* to draw the thread. This is the whole of task A. |
| 2 | **Fray dash** (broken) | fragment `:3143-3157`; `LINE_DASH_FREQ/LO/HI` `config:1648-1650`; blended by `dsp` | **Could have one.** Particles have positional fray (`DEBRIS_SPREAD` `config:1943`, `dispFactor` `:1850`) but no dash. The dash is a triple-sine of the *rest chord point*; a particle can evaluate the identical expression at its own analytic home node-pair midpoint. ~8 ALU. |
| 3 | **Ember tips** | `emberL` `:2990-3003` (`EMBER_TIP_MIX`, `uColEmberTip`) | **ALREADY HAS IT** — `emberCol` `:2299-2311`, byte-equivalent expression. |
| 4 | **Clean-break gap** | `gapF` `:3129-3141` | **ALREADY HAS IT** — `gap` `:2249-2262`, same expression, same `uGap`/`uFracture`. |
| 5 | **`uRecohere`** | only indirectly: `dispFactor(tL)` `:2959`, `nodeDrift` `:2949-2950` | **ALREADY HAS IT** — and more: `:2124` (packet gate), `:2179` (kiss), `:2412` (`nodePast`), plus the same `dispFactor`/`nodeDrift`. |
| 6 | **Zone ignition** | *the line only carries `rowResponse` (`uRowGlow`)* `:2971` + `uLineRowGain`. It **deliberately does not read `uRingGlow`/`uRingFlash`** — see the budget note `:2917-2923` | **ALREADY HAS IT** — `rowBright` `:2325` on link particles; full ring ignition on stars `:2381-2393`. What is lost is only the *net-wide* row brightening at `LINE_ROW_GAIN = 0.7` (`config:1631`); particles have `uRowGain` on the same `rowResponse`. |
| 7 | **Surge wavefront sweeping the line** | `surgeL` `:2970`, `uLineSurgeGain`, `LINE_SURGE_WHITE` head `:2999-3003`; **`LINK_SEGMENTS = 6` exists solely so this and #8 resolve along the link** (`neuralLinkLines.ts:37-42`, `config:1529-1547`) | **ALREADY HAS IT, at higher spatial resolution.** `surge` `:2274` → `headMix` `:2313`, `emisStream` `:2317`, and `traffic` `:2352` lifts dust→`BEAD_ALPHA`. 22.5 particles/link (derived, onFrame arm) vs 6 sub-segments — the particle layer *out-samples* the line here. |
| 8 | **Death flash** | `flashL` `:2971`, `LINE_FLASH_GAIN` `config:1633` | **ALREADY HAS IT** — `flash` `:2273`, `FLASH_GAIN` `:2320`. |
| 9 | **Mid-span profile** | `midL` `:3057-3058` | **ALREADY HAS IT** — `midProfile` `:2331-2333`, identical parabola, same `EDGE_MID_BRIGHT`. |
| 10 | **Cool→warm tint** | `coolK/warmK/bodyDepthL` `:2977-2988` | **ALREADY HAS IT** — `:2284-2298`, identical. |
| 11 | **Shimmer** | `shimmerL` `:3054-3056`, decorrelated by per-LINK hash `hLink` `:2974` | **ALREADY HAS IT** — `shimmer` `:2318-2320`, decorrelated per-PARTICLE (`metaN.w`). Note the *difference*: a per-particle shimmer on a particle-drawn line will read as **boiling grain along the line**, not as a link breathing. If the particles are now the line, the shimmer hash must move from `metaN.w` to the link index or the continuity will scintillate. |
| 12 | **Tip fades into the stars** | `fade` `:3124-3127` | **ALREADY HAS IT** — `edge` `:2243-2246`, same constants. |
| 13 | **DOF** | `dofAlphaAt(posL.z)` `:3022` | **ALREADY HAS IT, and more** — `dofAlphaAt` + `dofSoftAt` + `depthAtten` (`:1689-1697`, `:2598-2605`): size, alpha and disc-softness. |
| 14 | **Staggered reveal** | `revealL` `:3011-3015`, `LINE_REVEAL_STAGGER = 0.55` `config:1654`, per-link hash | **LOST (cheaply recoverable).** The particle path applies `uReveal` **flat**: `buildShade` `:2547`, and `rvS = smoothstep(0,1,uReveal)` `:3245`/`:3340`. There is no per-link stagger anywhere on the particle layer. Without it the net **switches on** instead of knitting in. Recover with the same `fract(sin(edgeIdx·57.31+11.7)·43758.545)` hash, ~5 ALU. |
| 15 | **`vLineRest`** | `:3109` (`varying(positionLocal)`) | **Purpose-built for one job**: the dash-phase anchor `:3146-3151`, so dashes stay welded to rest geometry instead of crawling with `nodeDrift`. A particle can rebuild the same anchor as `mix(nodeAt(ia), nodeAt(ib), s)` *without* `nodeDrift` — `nodeAt` `:1432`, `edgeEnds` `:1456` are already callable from `particleScalars`. Recoverable, ~6 ALU. |
| 16 | **`vLineCut`** | `:3114` (`0.004 × maskL`) | **ALREADY HAS IT** — the particle twin `cut: float(0.004).mul(cMask)` `:2523`, and the scale-invariance argument at `:2503-2521` is the same argument. |
| 17 | **`LINE_LUM_MAX` / `LINE_LUM_KNEE`** | cap `:3064`, C¹ soft knee `:3084-3090`; constants `config:1585`, `1613` | **🔴 LOST, AND THIS IS THE ONE THAT MATTERS.** This is the *only* place in the file where a layer is held **under** the bloom threshold. Everything on the particle layer is authored to go **over** it: beads 3.65 post-blend, under a surge 4.96 (`config:2369-2377`), star cores 7.33/10.67 (`config:2801-2810`). The chord's entire reason for existing at 0.568 post-blend (`:3038-3041`, 43 % under threshold) was *"the light in this band belongs to the stars and the beads"* (`config:1552-1555`). **If particles become the line, nothing carries that contract** — a continuous chain of overlapping sprites bright enough to read as a line will cross 1.0 and bloom, which is precisely the `f6cac67` "chains of glowing blobs" failure re-derived from the other end. A luminance ceiling on the *resting/continuity* end of the particle ramp has to be authored, and the soft-knee scar (`:3072-3083`: a hard `min()` engaged at surge 0.436 and flat-topped whole links) applies verbatim. |

Also gone with the layer: 6 dev-handle uniforms (`:589-601`, `:1227-1232`, `:3576-3581`), `LINE_ALPHA/EMISSIVE/BLUE_MIX/SURGE_GAIN/SURGE_WHITE/ROW_GAIN/FLASH_GAIN/DEAD_ALPHA/DEAD_DIM/DASH_*/REVEAL_STAGGER/LUM_MAX/LUM_KNEE/LINK_SEGMENTS`.

---

## 2. THE COPY MASK

**`laneCheck()`'s contract, verbatim** — `src/components/fx/use-diagonal-traverse.ts:990-1017`:

> *"QA gate 5 (R7 / R7c) — the published lane centre against where the tracked copy box ACTUALLY renders. This reads a rect on purpose: it is the only way to catch a lane derived from anything other than the applied transform. Park a block first (`park(i)`) so it is measured at its worst case, not at p = 0.5."*

and its returned contract (`:1013-1016`):
```
deltaPx:     Math.round((rendered - frame.laneCenterPx) * 100) / 100,
tolerancePx: 38,
```
with the selection rule at `:993-1004` marked *"MIRRORS `apply()` EXACTLY — the unit's window, not the block's. A dev handle that selected the tracked block by a different rule than the frame path would make the gate lie."*

**laneCheck is unaffected by removing the line.** It measures the DOM lane centre against the published `frame.laneCenterPx`; it never reads a WebGL layer. The mask *lane* (`uCopyLaneC/W/Soft/Floor/LineFloor`, `NeuralLattice.tsx:775-794`) is likewise layer-agnostic.

**What DOES change — the WCAG ledger** (`neuralLatticeConfig.ts:2581-2615`, all figures measured there):
- AA budget: `ΔL_max = (0.29336 + 0.05)/4.5 − 0.05 − 0.00687 = **0.01943**`.
- Line's contribution in the column: rest `0.568 × 3e-3 = 0.0017`; **absolute ceiling `0.97 × 3e-3 = 0.00291`** — i.e. the chord owns **15.0 %** of the whole AA budget (derived).
- Today's stated worst pixel: star centre `0.00694` → **5.38:1**. Pathological superposition (capped line over a node centre with a bead on it) `0.0117` → **5.05:1**.
- **Without the line**, pathological becomes `0.00694 + 0.00186 = 0.0088` → **5.23:1** (derived). The single-worst pixel is unchanged at 5.38:1.

So removing the chord **returns 0.00291 of ΔL — 15 % of the AA budget — to the column**, and that is *exactly* the headroom task A may spend there. Two consequences:

1. **The floors are 30× apart and the roles are about to swap.** Particles ride `COPY_MASK_FLOOR = 1e-4` (`config:2801`); the line rides `3e-3`. The 1e-4 floor is not a taste call — `config:2805-2810`: *an unmasked star centre is 3,570× the AA budget, so the ceiling on this constant is `0.01943/69.4 = 2.8e-4` and anything above it fails outright.* A particle-drawn line inside the column is therefore **30× dimmer than the chord was**, and cannot be raised past 2.8e-4 without failing AA. Practically: **the "one continuous net" will read as severed across the copy column.**
2. **How much of the net that is, measured** (`config:2647-2657`, per-viewport table, broken/full): links at gate-0 floor = **74 % at 1280 px, 68 % at 1920, 85 % at 768, 98 % at 390**. Today the chord carries the structure through that region at 0.0017 delivered; the particles at 1e-4 carry essentially nothing. The mask table's own closing note (`config:2660-2667`) already flags the narrow-viewport case as *"the declared design's honest consequence, not an implementation bug… on a phone the Problem/ProductionGrade bands keep the dot-grid and the (unmasked) crystal and lose the net."* After this change that sentence becomes true at **desktop** widths too.

**Minimum that preserves both contracts:** keep the particle mask floor at 1e-4 for the STAR role (it is what the 5.38:1 number is sized on) and give the *link/continuity* role its own floor — the `select(isStream, …)` at `:2492-2497` already branches by role, so a second floor uniform costs zero blocks (a plain `uniform()` scalar joining the existing shared group, exactly as ROUND 9-B's five did, `:236-249`). Ceiling on it: a particle-line pixel of post-blend luminance `P` at floor `F` delivers `P·F`; to stay inside the 0.00291 the chord vacated, `P·F ≤ 0.00291` **per covered pixel, counting sprite overlap** — and overlap is the whole point of a continuous particle line, so this is the number that must be measured, not the per-sprite one (the `STREAM_ALPHA 0.06 → 0.012` haze scar, `config:2328-2346`, is the same mistake: *"the quantity the eye integrates is the COVERAGE"*).

**Incidental defect found in the mask path** (not caused by this round, but live): `NeuralLattice.tsx:790` writes `u.uCopyLaneW.value = COPY_LANE_OPEN_W` (2.0) in the off-band restore branch, unconditionally. The build default for a ribbon build is `COPY_LANE_OPEN_W_RIBBON` = 4.0 (`neuralFieldCompute.ts:1252-1254`), and `config:2769-2782` states why: at 2.0 the lane's unused left wall lands at local x ≈ −1.5, **inside** a ±1.895 ribbon, and *"every node left of it reads UNMASKED"*. `COPY_LANE_OPEN_W_RIBBON` is not imported in `NeuralLattice.tsx`. Latent while the band is culled; live the moment a ribbon band is restored with lane driving off. `NeuralLattice.tsx` is owned by the running implement agent — flagging, not touching.

---

## 3. THE AT-REST PROBLEM, STATED HONESTLY

First, the clocks — because "at rest" does not mean "static":
- `uTime` `NeuralLattice.tsx:1121` and `uFlowTime` `:1153` advance from `delta`, not from scroll: `flowTime += delta·(1 + uVelFlow·scrollVel)` → **1×/s with the reader motionless**.
- The surge self-fires on a timer: `SURGE_PERIOD_BROKEN = 2.4 s` / `HEALTHY = 3.5 s` (`config:1963-1964`), `SURGE_SPEED = 0.55` nodeT/s (`config:1967`), state machine `NeuralLattice.tsx:942-982`. No scroll needed.
- `uScrollVel` damps to 0 (`:1140-1148`) → swell/streak/curl-boost/flow-boost all go to their rest values.

**So what fraction of the net is actually lit by motion at a random instant? (derived)**
- Beads: `PACKET_COUNT 2` × duty `1/PACKET_SPAN 6` ⇒ ~0.33 beads/link; on-frame links for the onFrame arm = **214.7** (`config:684`) ⇒ **~71 beads on frame**, matching D24's ~76. Each covers ±1σ = `PACKET_WIDTH 0.07` of `s` (`config:2029`) ⇒ **≈5 % of on-frame link length is above dust at 1σ, ~10 % at 2σ.**
- Surge: gaussian half-width 0.068 of nodeT (`neuralLinkLines.ts:39`) = 495 px on a 7278 px field, travelling 4003 px/s ⇒ it crosses a 1920 px frame in **0.48 s out of every 2.4 s (20 % duty)**, covering ~26 % of frame width while present.

**⇒ At a random instant, 69–95 % of the visible net is at the dust floor.** With no chord underneath, that is the picture.

Per path:

**(a) Reader stops scrolling — full tier, WebGPU or WebGL2.** The reader sees: bright star cores (post-blend 10.67 at a centre pixel), ~71 travelling beads, a surge sweeping through 20 % of the time — and, between them, **a dotted trail**. Derived spacing: onFrame arm `count = 34,006` (`config:721`), `starCount = floor(0.46·count) = 15,642`, `sparkCount = 32` (`config:1951`), `edgeTotal = 18,332` over 814 links = **22.5 particles/link**; mean on-frame link ≈ 130–200 px (from 102.6 on-frame nodes in 1920×935 ⇒ 132 px mean nn spacing, `PLEXUS_LINK_CUTOFF 1.85`; **derived, unverified against the real tables**) ⇒ **5.8–8.9 px spacing against a 3.2 px dust sprite** (`mix(1.25,0.55,fringe)·0.55·7.5`, `config:1669-1680`). That is **0.36–0.55× overlap — a dotted line**, which is the exact condition `config:2383-2391` identifies as the "dotted trails" failure (it needed ≥1× overlap; at 680 px the same 21.27/link gave 2.5 px spacing and it worked). **Minimum to keep it legible without a line primitive: ~3× the per-link particle allocation at desktop** (spacing ≤ sprite size), plus the #17 luminance ceiling so the resulting continuum does not bloom.

**(b) `prefers-reduced-motion`.** `tierStore.ts:203` → tier `off` → `fxBudget.level 0` → `Scene.tsx:509` gate `island = level >= 2` (`:245`) is false ⇒ **no canvas at all** (`tierStore.ts:11`). The SVG twin renders instead (`use-neural-lattice-fallback.ts:41-46`). **Unaffected by this change.**

**(c) no-JS / SSR.** `useNeuralLatticeFallback` returns `false` until `resolved` (`:43`), so the anchor renders only its CSS dot-grid (`problem-section.tsx:505-521`). No net, no line, today or after. **Unaffected.**

**(d) tier "off".** Same as (b). **Unaffected.**

**(e) lite / phone tier (level 2 — a capable phone DOES mount the island, `Scene.tsx:477-481`).** This is where it breaks hardest. Ribbon lite: `RIBBON_SEEDS.onFrame.lite = 716` → N 710 / **E 1478**, and `RIBBON_PARTICLE_SCALE_MAX.lite = 3.0` against a wanted ×12.68 ⇒ **allocation 0.24×** (`config:718-741`, measured there). Derived: `count = 9,600`, stars 4,416, sparks 32 ⇒ `edgeTotal = 5,152` over 1,478 links = **3.49 particles per link**. At a 130–200 px link that is **37–57 px between 3.2 px sprites**. A particle-made line is **arithmetically unreachable on the phone** — not dim, absent. Today the chord is *baked geometry*, so it is **independent of the particle budget**; that independence is the single most valuable thing the chord was carrying, and it is not recoverable by any constant. Compounded by the mask: at 390 px, 98 % of links sit at the floor (`config:2650`). *Minimum honest option on this path: keep the chord on the lite tier only, behind the same flag as §5 (`LINE_LAYER || tier === "lite"`), or accept that the phone band is stars + dot-grid + crystal and say so to the owner.*

**(f) The SVG twin `neural-graph-fallback.tsx` — CONFIRMED NOT AFFECTED AT ALL.** It is a separate DOM artifact: it imports only `getPlexus, FRACTURE_T, RING_T, COL_CORE, COL_CYAN, COL_BLUE, COL_EMBER2, PLEXUS_RZ` (`:50-60`), draws its own `<path>` strokes (`:437-479`: underlay `strokeWidth 3 / opacity 0.1`, core `strokeWidth 0.9 / opacity 0.5`, fray `strokeDasharray="3 7"`), and touches neither `neuralLinkLines.ts` nor `buildLinkLineLayer`. **But note the honesty cost:** the twin was authored as *"the DOM/SVG twin of the NEURAL PLEXUS WebGL island"* (`:4`), and after this round it will be the only surface still drawing crisp continuous strokes — the reduced-motion / off-tier / non-WebGPU visitor sees the grammar the owner just rejected, while the WebGL visitor does not. Either the twin's strokes get re-authored to a dotted/bead read, or the divergence is declared. **Owner-visible; not a code decision.**

---

## 4. THE BUDGET FREED — with numbers

Per build, onFrame arm (E = 814 links, `LINK_SEGMENTS = 6`, `config:684`, `1548`):

| Resource | Freed | Notes |
|---|---|---|
| **Draw calls** | **1** | one `LineSegments` (`:3165`). Scene-wide draw-call total: **unverified**. |
| **Vertices / vertex-shader invocations** | **9,768** (`814 × 6 × 2`), **all of them every frame** — `object.frustumCulled = false` (`:3166`), so there is no on-frame reduction | ≈ **2,442 particle-equivalents** at 4 verts per indexed quad (`:1322-1326`). areal: 15,984; nearest: 20,508; **lite: 17,736** (lite has *more* line vertices than desktop onFrame). |
| **VBO** | **190.8 KiB** (`9,768 × (3+2) × 4 B`), no index buffer | areal 312 KiB, nearest 401 KiB, lite 346 KiB. |
| **Vertex-buffer slots** | **2 of 8** | `position` + `aLink` (`:2938-2939`). Its own program, so nothing transfers. |
| **Storage bindings** | **0 of 8** | it never read one (`:2903-2905`) — which is also why it worked identically on the analytic tier. |
| **UBO blocks** | **6** — but **in a program that ceases to exist** | line VERTEX 6/12 = `uNodePos + uNodeT + uEdgePack + uRowGlow` + three's `object` + `render` (authority: `:1103-1139`). **ZERO of these transfer to the particle program.** The particle material stays at **VERTEX 10/12, FRAGMENT 8/12** — two spare, and `:1134-1136` already says *"Two spare is not licence — the ROUND 12 band needs one of them."* |
| **Fill** | **≈33,300 px²/frame ≈ 1.85 % of a 1920×935 frame** (derived: 214.7 on-frame links × ~155 px × 1 px) | Bracket 28k–43k px² for a 130–200 px mean link. |

**What that fill buys in particles (the number task A asked for):**
33,300 px² ÷ 10.4 px² per resting-dust quad (3.23 px square) = **≈3,190 extra dust sprites ON FRAME**, i.e. **≈12,100 field-wide** at the ribbon's 1/3.791 on-frame fraction.

**Put against the requirement:** current on-frame link dust is ~4,836 sprites (derived) at 5.8–8.9 px spacing; continuity needs spacing ≤ sprite size, i.e. **~3× the link-particle count → ~+9,700 on-frame sprites**. **The freed fill covers roughly one third of it.** The rest has to come from somewhere else — smaller sprites (D24's 10.3→4.6 px bead move already cuts bead fill 5×), or the exit-fade/cull, or the copy-mask discard (which is already fill-neutral by construction, `:2503-2521`).

Context for the fill number: total on-frame particle fill today is ≈593,000 px² ≈ **33 % of the frame** (derived). **The line is 5.6 % of the particle layer's fill.** It is cheap. Removing it is a *look* decision; it is not a performance win, and it should not be sold as one.

---

## 5. REVERSIBILITY — the cheapest flag, and the trap

**The trap first:** setting `LINE_ALPHA = 0` (`config:1556`) is **not** a rollback. `alphaL` → 0 makes every fragment fail `Discard(alpha.lessThan(vLineCut))` at `:3159`, so fill goes to zero — **but the draw call, the 9,768 unculled vertex invocations, the 190 KiB VBO and the 6 UBO blocks all remain.** Do not use an alpha as the switch.

**Use the idiom the file already ships.** `MEMBRANE_ALPHA` is exactly this pattern and it is documented as such at `neuralFieldCompute.ts:3179-3187` (*"MEMBRANE_ALPHA 0 skips the build entirely (no geometry/material, and NeuralLattice's `build.membrane &&` mount gate then never mounts a mesh), so the invisible layer costs nothing on either backend. Set the config alpha > 0 to revive (rebuild required)"*), with the build seam at `:3188-3189` and the mount gate at `NeuralLattice.tsx:1610-1618`.

**The flag:** `export const LINE_LAYER = false;` in `src/webgl/neural/neuralLatticeConfig.ts`, placed immediately above `LINK_SEGMENTS` at `:1548` inside the existing `ROUND-8-G — THE LINK LINE LAYER` block, so the constant and the ~150 lines of prose that justify it stay together.

Four touch points, one line each — this is the entire archaeology cost:
1. `neuralFieldCompute.ts:3194` → `const links = LINE_LAYER ? buildLinkLineLayer() : null;`
2. `neuralFieldCompute.ts:716` → `links: NeuralFieldLines | null;`
3. `neuralFieldCompute.ts:3299-3300` and `:3527-3528` → `links?.geometry.dispose(); links?.material.dispose();`
4. `NeuralLattice.tsx:1633` → `{build.links && <primitive object={build.links.object} />}` (mirrors `:1611`/`:1620`), and `:1356-1357` → `build?.links?.edgeCount ?? 0` / `?.vertexCount ?? 0`.

Everything else — `neuralLinkLines.ts` in full, `buildLinkLineLayer()` in full, all `LINE_*` constants, the 6 dev uniforms — **stays in the tree, untouched, tree-shaken out by the `false` branch**. Flipping the constant to `true` restores D22 exactly, with one rebuild and no dispose/mount surgery. That is the whole point given the owner reversed this once already today.

Two guards worth writing into the flag's doc comment:
- **Do not delete `copyMaskLineAt` / `uCopyLineFloor` / `COPY_MASK_FLOOR_LINE`** — the nebula reads them (`:2841`).
- **Keep `EDGE_FADE_IN/OUT`, `EDGE_MID_BRIGHT`, `DEBRIS_FADE`** — the particle layer reads them (`:2243-2246`, `:2331`, `:2360`).
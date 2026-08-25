## FILES READ

- OLD (recovered via `git show` into `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/ba6d249f-d877-410c-800b-3da371f4fd94/scratchpad/`): `compute-4d2eb52.ts` (833 L), `compute-3b1bb6a.ts` (1166 L), `compute-47af6d8.ts` (1779 L), `config-4d2eb52.ts` / `config-3b1bb6a.ts` / `config-47af6d8.ts`. Line numbers below are the file's own at that commit.
- HEAD: `C:/Users/alber/Desktop/sersan-v2-main/src/webgl/neural/neuralFieldCompute.ts` (3267 L), `neuralLinkLines.ts` (136 L), `neuralLatticeConfig.ts` (2024 L), `src/webgl/store/routeFxStore.ts`, `src/webgl/PostFXNodes.tsx`.
- Specs: `research/2026-08-21-signal-stream-spec.md`, `research/2026-08-21-round4-stream-v4-best-effects.md`, `research/2026-08-24-round11-diagonal-traverse-storyboard.md`, `research/2026-08-24-ROUND12-HANDOFF.md`.

`47af6d8` is the river's peak (it is a strict superset of `3b1bb6a` + `8d32d1a`; the only constants that moved between the beauty pass and v4 are `STRAND_RADIUS` 0.023→0.0215, `STRAND_THICKNESS` 0.012→0.011, `NEURAL_POINT_SIZE` 7.0→8.0). All "old" constants below are `47af6d8:src/webgl/neural/neuralLatticeConfig.ts`.

---

# 1. DEVICE INVENTORY — mechanism → status at HEAD

| # | device | old mechanism (file:line) | at HEAD |
|---|---|---|---|
| D1 | **Braided filaments** (4 phase-separated strands) | `anchorNode` stream branch, `compute-47af6d8.ts:844-880`: `strandAng = strandPhaseAt(aux) + t·2π·BRAID_TURNS·(STRAND_RATE_BASE + aux·STRAND_RATE_STEP)`; `strandOff = (0, sin·STRAND_RADIUS, cos·STRAND_RADIUS)` + per-strand `jit·strandThickAt(aux)`. `STRAND_COUNT 4`, `STRAND_PHASES [0,2.4,3.9,5.7]`, `STRAND_THICK_BIAS [1.3,0.75,1.05,0.6]`, rates 0.82 + 0.12·i | **GONE.** `STRAND_COUNT = 1` (`neuralLatticeConfig.ts:647`), `STRAND_RADIUS = 0` (:670), `BRAID_TURNS 2.6 → 0.6` (:699). The `widthEnvelope()` family is documented as "nearly INERT" (:679-696). |
| D2 | **Velocity-stretched streaks** | `buildVertex`, `compute-47af6d8.ts:1207-1240`: quad rotated onto the view-space motion axis, `stretch = 1 + min(|v|·uStretchGain·(1+uScrollVel·uVelStretch), uStretchMax)` → 3× at surge speed | **PRESENT, byte-equivalent** (`neuralFieldCompute.ts:2260-2295`), but it now stretches a 3.4 px sprite at alpha 0.012 — invisible except on a bead. |
| D3 | **Sparks on surge death** | `anchorNode` role-2 branch `:945-959` (`prog = pow(1−uFlash, 0.6)` → analytic outward flight) + `sparkDir :821`. `SPARK_COUNT 32`, `SPARK_REACH 0.22`, `FLASH_DECAY 4.0` | **PRESENT**, unchanged (`neuralFieldCompute.ts:1570`, `1741`; `SPARK_COUNT 32` config:1158). |
| D4 | **Ring shockwave** | ring branch `:926-944`: `rr = RING_RADIUS·(1+jitter)·(1 + ringFlashAt(aux)·RING_SHOCKWAVE)`, `RING_SHOCKWAVE 0.25` | **RE-HOMED, present.** Rings are gone as objects; the shockwave now expands a *star's* baked offset (`neuralFieldCompute.ts:1697-1714`). |
| D5 | **Ring membranes** (igloo banded-noise forcefield) | `buildMembraneLayer`, `compute-47af6d8.ts:1313-1420`: `n = sin(vnoise2·13 + phase − y·10)·.5+.5; mask = aastep(0.2,n)·(1−n·.75); a = mask·base + mask⁵·.5 + rim·.5`. `MEMBRANE_ALPHA 0.22` | **DEAD BY DEFAULT.** Machinery kept, `MEMBRANE_ALPHA = 0` (config:1386) and the build seam skips the layer entirely (`neuralFieldCompute.ts:2884-2890`). Owner: "non capisco i cerchi". |
| D6 | **Fracture nebula** (smoking wound) | `buildNebulaLayer`, `compute-47af6d8.ts:1421+`: sheared uv, `v = n(uv·3+d)·n(uv·4+d)·n(uv·6+d)`, `alpha = pow(v,3)·3 × radial`; flares on `uFlash`, thins on `uRowGlow[2]` | **PRESENT**, broken mode only (`neuralFieldCompute.ts:2476`, gated at :2891). |
| D7 | **The fracture** (clean break + debris + death flash) | `dispFactor :806`, debris in `anchorNode :880-925`, `flashAt :985`. `FRACTURE_T 0.55`, `FRACTURE_GAP_T 0.035`, `FLASH_K 500`, `FLASH_GAIN 3.0` | **PRESENT, re-homed** onto links/nodes: `dispFactor` :1555, `nodeDrift` :1278, gap in the line fragment stage :2830-2845. `FRACTURE_T 0.62`. |
| D8 | **Flow** (every particle advances) | `flowParam :765` = `fract(basePhase + uFlowTime·uFlowSpeed·speedVar)`, `FLOW_SPEED 0.055` cycles/s over the whole band, `speedVar 0.7..1.3` | **PRESENT but 18× slower in effect.** `FLOW_SPEED 0.075` (config:714) is now per *link*: 13.3 s to cross a 71 px link = **5.3 px/s** vs the river's ~96 px/s. Bulk motion is no longer perceptible; motion was delegated to the packet beads. |
| D9 | **Comet-tailed surge** | `surgeAt :968`: `max(exp(−SURGE_K·d²), 0.65·exp(d/SURGE_TAIL))`. `SURGE_K 240`, `SURGE_TAIL 0.035`, `SURGE_GAIN 2.2`, `SURGE_SPEED 0.55` | **PRESENT** (`neuralFieldCompute.ts:1758`), `SURGE_K 150`, same tail. One event every 2.4 s/3.5 s. |
| D10 | **Scroll response** | `uScrollVel` + `uFlowTime` integration; `VEL_SWELL .25 / VEL_STRETCH .6 / VEL_FLOW .4 / VEL_CURL .3 / VEL_DEBRIS .2`, `VEL_NORM 100`, `VEL_DAMP 6` | **PRESENT** (config:1446-1463; `uScrollVel` :1110). `VEL_SWELL` was **re-homed from width to LINE brightness** (`neuralFieldCompute.ts:2769-2775`) because a 1 px line has no width. |
| D11 | **Curl shred** | `curlAt :706` (2-octave analytic curl of a sin/cos potential, divergence-free). `CURL_GAIN 0.15 × CURL_SCALE 0.0325` → ±3.3 px | **PRESENT but 6.25× smaller**: `CURL_SCALE = 0.0052` (config:1341) → ≈0.5 px (header note :36). |
| D12 | **Idle breathing + shimmer** | `widthEnvelope :776` breathe ±0.06/7 s; `particleScalars :1147` shimmer ±0.04 | **PRESENT** (config:899-901); breathe rides an inert width path, shimmer rides both particles and the line. |
| D13 | **Depth-DOF** | `dofAlphaAt :739`, `dofSoftAt :745`, `depthAtten :1246`. `DOF_FAR_DIM .55`, `DOF_SOFT_MIN .03`, `DOF_SIZE_GAIN .6` | **PRESENT** (:1419/:1425/:2299), plus `DOF_STRENGTH 0.45`. |
| D14 | **Edge fades / recycle-pop killer** | `EDGE_FADE_IN .08 / OUT .06`, `WRAP_SNAP_DIST 0.6` | **PRESENT** (`0.12/0.10`, `WRAP_SNAP_DIST 0.038`). |
| D15 | **Three-stop radial ramp** white-cyan core → cyan → blue fringe, with size falloff | `particleScalars :1074-1126`: `coreMix`, `gradCol`, `fringeA 1→0.35`, `sizeStream = mix(1.6, 0.6, fringe)` | **PARTLY.** Still on particles (`neuralFieldCompute.ts:2020-2075`, `CORE_SIZE_BOOST 1.25 / FRINGE_SIZE_DROP 0.55`); on the *line* it is replaced by `LINE_BLUE_MIX 0.3` + the cool→warm `nodeT` tint (`LAYER_TINT_COOL .35 / WARM .22`) — a 1 px line has no cross-section (`neuralLinkLines.ts` header; compute header L206-210). |

---

# 2. WHAT MADE IT READ AS FLOWING LIGHT, NOT BEADS

Four things, all measurable, all reversed today.

**(a) Catastrophic sprite overlap.** Constants: `NEURAL_PARTICLE_COUNT 9000`, `STRAND_COUNT 4`, `NEURAL_POINT_SIZE 8.0`, `CORE_SIZE_BOOST 1.6`, `FRINGE_SIZE_DROP 0.6`. Roles (`seedBuffers`, `compute-47af6d8.ts:408-465`): healthy `floor(9000·(1−RING_FRACTION 0.3)) = 6300` stream + 2700 ring; broken `9000 − SPARK_COUNT 32 = 8968` stream. Every stream particle is uniformly distributed in flow-t (`offA[i·3] = r2`).

*Derived* (band `h ≈ 680 px` per the round-3 note at `config-47af6d8.ts:104-110`; `w = h / BAND_ASPECT 0.45 ≈ 1511 px`; spline x-span `2·STREAM_SPAN_X = 1.16` → 1753 px, plus the ±0.48/0.55 local-y weave → arc ≈ **1780 px**):

| | per-strand count | along-strand spacing | fringe sprite 4.8 px | core sprite 12.8 px |
|---|---|---|---|---|
| broken | 8968/4 = 2242 | **0.79 px** | **6.1× overlap** | 16× |
| healthy | 6300/4 = 1575 | **1.13 px** | **4.2× overlap** | 11× |

No individual sprite could ever resolve. Compare HEAD's own threshold derivation (`neuralLatticeConfig.ts:1580-1596`): 1.65× overlap was declared the point where "every cross-section strand now overlaps its neighbour → one continuous filament".

**(b) The body of the river was itself above the bloom floor.** `STREAM_EMISSIVE 2.6 × STREAM_ALPHA 0.8` with `lum(COL_CYAN #3BE1FF) = 0.6201` → post-blend **1.29**; the white-cyan core (`lum(COL_CORE) = 0.9371`) → **1.95**. Bloom threshold is 1.0 (`routeFxStore.ts:63-66`, `HOME_FX.bloomThreshold 1.0`, intensity 1.1, radius 0.7; identical at `47af6d8:src/webgl/PostFXNodes.tsx:459-471`). The river was a **self-blooming mass** — the bloom kernel is what fused the sprites into light. Note `47af6d8`'s config carries **no per-sprite luminance ledger at all**; that ledger only appears at round 8 (`neuralLatticeConfig.ts:1490-1527`). This is the single fact that today's grammar forbids.

**(c) Everything moved, all the time, and the sprites smeared.** `FLOW_SPEED 0.055` over a 1780 px arc = **~96 px/s** bulk drift (67–125 px/s with `speedVar 0.7..1.3`), on *every* particle. The surge rode at `SURGE_SPEED 0.55` t/s = **~960 px/s**, head half-width `1/√SURGE_K = 0.065 t ≈ 113 px`, tail e-fold `SURGE_TAIL 0.035 ≈ 61 px`, `SURGE_GAIN 2.2` → head emissive ×3.2 → post-blend ≈ 4.1. On top, `STRETCH_GAIN 1.5 / STRETCH_MAX 2.0` elongated each sprite up to **3×** along its motion axis at the surge (`compute-47af6d8.ts:1216-1240`).

**(d) The cross-section had internal structure and soft edges.** Four strands at different twist *rates* (0.82 + 0.12·i) visibly crossed; per-strand thickness bias made one lead filament and three satellites; rest envelope `2·(0.0215+0.011)·680 ≈ 44 px`; `fringeA` ramped alpha 1 → 0.35 and size 1.6 → 0.6 across the radius; `EDGE_FADE_IN/OUT` dissolved both ends; `CURL_GAIN 0.15 × 0.0325 ≈ ±3.3 px` of divergence-free shred made the strands bend coherently rather than fuzz per-particle.

Additive blending, `depthWrite:false`, `depthTest:false`, `DoubleSide`, `toneMapped:false` throughout (`configureMaterial`, `compute-47af6d8.ts:1255-1264` — identical at HEAD :2308).

---

# 3. TODAY'S LINK-PARTICLE CONSTANTS, AND THE DISTANCE

Quoted from `neuralLatticeConfig.ts` at HEAD:

- **Allocation** (:1103, `NODE_FRACTION 0.46`, ledger at :1073-1081): `full 9000 : stars 4140 (46%) · link traffic 4828 (53.6%) · sparks 32 ⇒ 40.2 particles/star over 103 nodes (was 25) ⇒ **21.3 particles/link over 227 links** (was 28.4)`; lite `3200 : 1472 stars · 1696 link · 32 sparks ⇒ 26.3/star · **15.4/link** over 110 links`. Assignment is ∝ link length (`seedBuffers`, `neuralFieldCompute.ts:803-816`), mean link **71 px** on a 680 px band.
- **Spacing**: `at 21.3/link the spacing is 3.3px` (:1088).
- **Resting sprite** (`DUST_SIZE 0.55`, :887): `mix(1.25, 0.55, fringe)·0.55·NEURAL_POINT_SIZE 7.5` ≈ **3.4 px** (core 5.16 px, fringe 2.27 px). ⇒ **overlap ≈ 1.0×** (core 1.55×).
- **Resting alpha** `STREAM_ALPHA = 0.012` (:1563) → post-blend **0.018**, "3.2% of the line it rides".
- **Bead**: `PACKET_SIZE 2.0` (:1245) → `0.83 × 0.55 × (1+2.0) × 7.5 = **10.3px**`; `BEAD_ALPHA 0.9` (:1576) → post-blend **3.648**; `PACKET_COUNT 2` (:1224), `PACKET_RATE 0.3` (:1227), `PACKET_SPAN 6` (:1231) ⇒ duty `2/6 = 0.333` beads/link ⇒ **~76 live beads** over 227 links; crossing time `1/(0.3·6) = 0.556 s` ⇒ bead speed **128 px/s**.
- **Bulk flow**: `FLOW_SPEED 0.075` (:714), per link ⇒ 13.3 s per traverse ⇒ **5.3 px/s** (config's own note: "ambient drift ~11s").
- **The chord**: `LINE_ALPHA 0.7`, `LINE_EMISSIVE 1.35`, tone lum 0.5029 ⇒ post-blend **0.568**, hard-capped at `LINE_LUM_MAX 0.97` by a C¹ soft knee (`LINE_LUM_KNEE 0.7`, `neuralFieldCompute.ts:2782-2790`). `LINK_SEGMENTS 6`, 227 links × 71 px × 1 px = **16k px²**.

**How far today is from the river:**

| quantity | river (`47af6d8`) | HEAD | ratio |
|---|---|---|---|
| particles per px of filament | 1.26/strand × 4 = **5.03/px** | **0.30/px** | **17× sparser** |
| resting sprite diameter | 4.8–12.8 px | 2.3–5.2 px | 2.5× smaller |
| resting per-sprite post-blend | **1.29–1.95** (blooms) | **0.018** | **72–108× dimmer** |
| along-path overlap | 4.2–16× | **1.0–1.55×** | 4–10× less |
| bulk flow speed | **96 px/s**, every particle | **5.3 px/s** | 18× slower |
| moving light per link | continuous | **0.33 beads** at 128 px/s | discrete |

The gap is not "particles per link". It is **alpha (72×) and bulk motion (18×)**. Geometrically HEAD's link particles are already at 1.0–1.55× overlap — one alpha decision away from being a continuous filament.

---

# 4. THE SYNTHESIS — the recipe

### 4.0 The governing finding

`f6cac67` is right and must not be re-litigated: *a glowing sprite ≥4 px cannot be a 1 px line.* But the river's light was never a *chain*; it was a **continuum drawn by ~5 particles per pixel above the bloom floor**. Today's budget cannot buy that on a net 11.5× larger (`ROUND12-HANDOFF.md:57-62` — `uNodePos` 18.6 KiB, ~104k particles). So:

> **Draw the flowing light with the LINE primitive; demote the sprites to grain that rides it.**

The line is the only primitive in the build with headroom: the particle material's vertex stage is **12/12 WebGL2 UBO blocks, zero free**; the line material is a separate program at **8/12** (`neuralFieldCompute.ts` header L216-221) — 4 blocks free, and it already carries `surgeAt`, `flashAt`, `rowResponse`, `dispFactor`, tint, shimmer, dash, DOF.

### 4.1 Does the crisp chord survive underneath? **YES — it is load-bearing three ways.**

1. **It is the owner-validated primitive.** Removing it re-opens the exact rejection of `f6cac67`, live in Chrome, against his reference image.
2. **It is the only thing that exists when nothing is flowing.** The dark-wire rest (`0.85` post-blend, storyboard §B6.5), D16's unlatched scrub-back, prefers-reduced-motion / SSR / no-JS "settled and visible", and the non-compute analytic tier (`buildLinkLineLayer` is built *before* the backend split, :2892-2895) all depend on a continuous structure existing with zero simulation. Particles alone at rest are either invisible (today) or fog (round-8-I).
3. **It is the anti-blob guarantee.** With a continuous 1 px line underneath, a momentary sprite gap cannot read as a broken chain. Cost: 16k px², one draw call, 2 of 8 vertex slots, 0 storage.

### 4.2 The four changes

**(A) The flow becomes CONTINUOUS LUMINANCE ON THE LINE — zero new sprites.**
Today one surge fires every 2.4/3.5 s (`SURGE_PERIOD_*`). Replace with **M = 4–6 concurrent, phase-staggered wavefronts** at lower gain plus the existing big one for the ignition beat:

```
riverAt(t) = Σ_{m<M} A_m · [ exp(−K·d_m²)  ⊕softmax  0.65·exp(d_m/TAIL) ],
   d_m = t − fract(phase_m + uFront)        // uFront = the D14 birth front (scroll-driven)
   A_m ≈ 0.35 (vs SURGE_GAIN 2.2 for the hero surge)
   K   = SURGE_K 150,  TAIL = SURGE_TAIL 0.035 (≈62 px in nodeT terms)
```
Pure function of uniforms; no state, no buffer, no latch (**D16-compatible**), and it *is* D14 when `uFront` is the birth front: light streams ahead of the reader through the structure that is forming. Multiplies into the existing capped chain `emisRawL` (:2769-2778) so **`LINE_LUM_MAX 0.97` still guarantees no link ever blooms.** Rest is byte-identical when all `A_m = 0`.

**Stage discipline (a trap, see §6.7):** compute it in the **fragment** stage using the existing `sF` varying (`vLineAux.w`, :2806), or carry each wavefront's phase as a **link-constant varying** (identical at both endpoints ⇒ interpolation is exact). `LINK_SEGMENTS 6` samples `s` every 0.167 — a `PACKET_WIDTH 0.07` gaussian in the vertex stage would be sampled 0.42× per σ and strobe.

**(B) The particles become GRAIN, gated to the moving band.**
Keep 21.3/link and the ∝-length allocation. Change only two numbers, and gate both by the same `riverAt` window that lights the line:

| | rest (outside the band) | inside the band |
|---|---|---|
| alpha | `STREAM_ALPHA 0.012` (unchanged — the dark wire, round-8-I intact) | `≈0.096` (×8) |
| sprite | 3.4 px (unchanged) | **6.8 px** (×2) |

At 6.8 px against 3.33 px spacing the overlap is **2.04×** — above the 1.65× continuity threshold the codebase already established (:1590-1594). Per-sprite post-blend inside the band, at full head: `0.6201 × (2.1 × midProfile 1.15 × 3.2) × 0.096 = **0.46**` — under 1.0, so **not one new blooming sprite**; the ~2× overlap accumulates to ≈0.8–0.9, i.e. the same order as the chord's 0.568. That is "a luminous filament", drawn without a single blob.

The velocity stretch (D2, still shipped, :2260-2295) then does the rest for free: give the dust real bulk motion again by lifting `FLOW_SPEED` inside the band only (0.075 → ~0.35 ⇒ 25 px/s, still ×4 slower than the river's 96 px/s but visible), and `STRETCH_GAIN 1.5 / STRETCH_MAX 2.0` elongates the grain along the wire.

**(C) The bead stops being a blob: 10.3 px → ~5 px.**
`PACKET_SIZE 2.0 → 0.6` and `BEAD_ALPHA 0.9 → 0.55` ⇒ bead ≈ **4.6 px**, post-blend `0.7629 × 5.313 × 0.55 = **2.23**` — still an object that blooms and rides the thread (the deliberate design at compute header L205), but no longer the widest thing on a 1 px line. Its *brightness* is inherited from (A), which is why it can shrink without losing presence.

**(D) `STRAND_RADIUS` stays 0.** Non-negotiable (:650-670).

### 4.3 The answers, stated plainly

- **particles per link:** **21.3 (full) / 15.4 (lite) — unchanged.** No re-allocation needed; the geometry is already continuous.
- **size in px:** **3.4 px at rest, 6.8 px inside the flowing band**, bead **≈4.6 px**. Never ≥7.5 px (the value `f6cac67` proved fails).
- **motion along the link:** two speeds, as the storyboard already separates them (§B6.6) — a *position*-driven front (`uFront`, scroll) that decides *where* light exists, and *time*-driven flow inside it (bulk drift ≈25 px/s + wavefronts at `SURGE_SPEED 0.55` ≈ 960 px/s + beads at 128 px/s).
- **composition with the chord:** the chord is the **spine and the only continuous element**; the light lives *in the chord's own emissive* (capped at 0.97, never blooms); the particles are grain *on* it; the bead is the one discrete object. Nothing above 1.0 except the bead and the stars.

---

# 5. COST

**Bloom rule, quoted verbatim** — `research/2026-08-24-round11-diagonal-traverse-storyboard.md:342`:

> "So the **visibly lit** band is ±0.855w = ±187 px @1280 around the front line, and inside it the shipped counts hold: **5–8 sprites above 1.0 at any instant** out of 103, and **no link ever blooms** — `LINE_LUM_MAX` 0.97 caps them below threshold by construction. The stars bloom, the lines stay crisp; that is the whole reference grammar and D13 does not touch it."

and `:856` — "*per-sprite post-blend; bloom threshold ≈ 1.0; **only emissive above 1.0 blooms***", with the per-moment table at `:858-871` capping `sprites > 1.0` at 5–8 (4–6 at 122, 3–5 at 88, ~9 at the M5 impact).

⚠ **Finding the parent must carry to the owner: the shipped build already exceeds that census by an order of magnitude, and the storyboard does not account for it.** "Out of 103" counts *stars*. The packet beads are unaccounted: `PACKET_COUNT 2 / PACKET_SPAN 6 × 227 links = **~76 live beads**, each at post-blend **3.648** (`neuralLatticeConfig.ts:1500`, "packet BEAD 3.65 blooms"). Whatever is decided, decide it explicitly. My recipe adds **zero** new sprites above 1.0 and gives two levers to bring the beads into compliance: gate traffic to the built/lit region (0.33 × ~98 lit links ≈ **32 beads**), and/or `PACKET_COUNT 2→1`, `SPAN 6→8` (duty 0.125 ⇒ **~12 beads**).

**Fill**, against the shipped ledger of **612k px²** (`neuralLatticeConfig.ts:1092-1101`):

| item | today | recipe | Δ |
|---|---|---|---|
| resting dust `4828 × 3.4px²` | 58k | 80% at 3.4² + 20% at 6.8² = 45k + 45k | **+31k** |
| beads `76 × ~6 lit × 10.3px²` | 52k | `76 × 6 × 4.6px²` | **−42k** |
| line layer `227 × 71 × 1px` | 16k | unchanged (ALU only) | 0 |
| stars | 486k | unchanged | 0 |
| **total** | **612k** | **≈601k** | **−1.8%** |

**ALU:** `riverAt` = M × (1 exp + 1 exp) per fragment on a 16k px² layer ≈ 200k transcendentals/frame — noise next to 9000 instanced quads.

**Bindings:** zero new storage buffers, zero new uniformArrays. `uFront` and the M phases are plain `uniform()` scalars on the **line** material (8/12 → 9/12 at worst if you add one array; prefer scalars). **The particle material at 12/12 is untouched** — (B) reuses `riverAt`'s window, which the particle stage can evaluate from the same scalars it already reads (`uFlowTime`, `uSurgeT`, `uFracture`).

---

# 6. TRAPS — the "chains of glowing blobs" checklist

Testable, in order of how likely each is to kill it:

1. **Sprite diameter on a 1 px chord.** Any travelling sprite ≥ ~6 px reads as a blob. `f6cac67` proved 7.5 px and 10 px fail live. Today's bead is **10.3 px** — it is *already* the rejected primitive, saved only by there being 0.33 of them per link. **Test:** the widest sprite riding a link ≤ 5 px. Raising `PACKET_SIZE` or `PACKET_COUNT` re-creates the chain literally.
2. **More than one blooming sprite per link.** Bloom is `threshold 1.0, intensity 1.1, radius 0.7` (`routeFxStore.ts:63-66`) — every >1.0 sprite is smeared into a soft ball far larger than itself, so N bright sprites in a row = N blobs *regardless of sprite size*. **Test:** count sprites with post-blend > 1.0 per link; must be ≤ 1.
3. **Spacing / size ratio.** Continuity needs `L/N ≤ sprite/1.65` (:1590). **Test at the LONGEST link, not the mean**: per-link `|ΔnodeT|` is mean 0.035 / **max 0.106** full, mean 0.043 / **max 0.122** lite (`neuralLinkLines.ts` header). This only holds while the allocation stays ∝ length (`neuralFieldCompute.ts:803-816`) — if that ever becomes uniform-per-link, the long links go dotted first.
4. **`STRAND_RADIUS` must stay 0** (:650-670). At `ENVELOPE_BASE 1.8` the old 0.0034 put the bead **4.1 px off** a 1 px line. Any braid revival re-separates bead from wire.
5. **Resting particles are not free.** Round-8-I: `4828 idle sprites × 3.4px² × 0.090 = 5.2k px²·lum` = a fog that flattened the composition. Any *global* alpha lift re-creates it. The lift must be gated by the same wavefront that lights the link. **Test (the one that distinguishes filament from fog):** measured luminance **≥20 px off any chord ≈ 0**. With `STRAND_RADIUS 0` and `STRAND_THICKNESS 0.0006` (0.7 px) all sprite area lies within ±(0.7 + size/2) ≈ ±4.1 px of the chord — light *on* geometry, not light *where there is none*.
6. **No hard `min()`/clamp on the moving head.** The `f6cac67` check found the flat ceiling engaging at surge 0.436 — *wider than the surge's own half-width* — flat-topping whole links and making the surge invisible on a hovered row. Use the shipped C¹ soft knee (`LINE_LUM_KNEE 0.7`, :2782-2790).
7. **Never evaluate a narrow travelling head in the LINE's vertex stage.** `LINK_SEGMENTS 6` ⇒ `Δs = 0.167`; a `PACKET_WIDTH 0.07` gaussian gets **0.42 samples per σ** → strobe + stair-step. Fragment stage, or a link-constant varying. (Related shipped trap: "interpolating a smoothstep across a wide quad is not the smoothstep" — the nebula masks per fragment for exactly this reason, `neuralLinkLines.ts` header.)
8. **Uniform phase across a node's spokes.** `packetClock` is keyed by the **receiving node** (:1808) — deliberately, so beads converge and `nodeKissAt` is causal. If the new wavefront is *also* per-node, every spoke of a high-degree star lights identically and the eye reads a repeating motif. **Test:** watch the highest-degree node; spokes must be decorrelated in phase even while they converge in arrival.
9. **The build front must be scroll-driven, not `uFlowTime`.** `uFlowTime` is driver-*integrated* real time (`+= dt·(1 + uVelFlow·uScrollVel)`, :624-628) — scrolling back up does **not** rewind it. D16 (unlatched, pure function of scroll) therefore forbids running the D14 birth front off `uFlowTime`. Ambient traffic may stay on time (it is life, not structure); **`uFront` must come from `p`.**
10. **Uniform brightness along a link** (no mid-span profile, no head/tail asymmetry) segments visually into repeats. Keep `EDGE_MID_BRIGHT 0.3` and the comet tail's asymmetry.
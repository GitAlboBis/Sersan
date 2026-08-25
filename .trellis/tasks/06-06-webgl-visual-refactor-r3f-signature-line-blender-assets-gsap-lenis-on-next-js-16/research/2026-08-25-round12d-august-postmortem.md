TASK D — AUGUST POST-MORTEM. All numbers below are quoted from source at the named commit, or derived arithmetic marked as such. Paths are repo-relative; `<sha>:path:line` means the file as of that commit.

---

# 0. WHAT THE COMMITS ACTUALLY ARE

| sha | date | what it did |
|---|---|---|
| `4d2eb52` | Aug 21 14:06 | the signal stream — braided particle river replaces the orb-triangle; 5-uniform spline, 4 storage buffers |
| `3b1bb6a` | Aug 21 15:56 | beauty pass — phase-separated strands, core/fringe falloffs, velocity-stretched sprites, white-cyan→blue ramp, comet-tail surges, spark bursts, ring shockwaves, breathe+shimmer |
| `8d32d1a` | Aug 21 17:06 | v3 — mode-authored vertical weave, curl turbulence, row-reactive current, z-bow DOF |
| `47af6d8` | Aug 21 20:04 | v4 — ring membranes, fracture nebula, `uScrollVel` reactive river. **This is the river at its peak; every constant in §1 is read off this commit.** |
| `f6cac67` | Aug 24 15:20 | THE KILL — links become `LineSegments` |
| `587a795` | (after the kill) | **the haze kill** — the leftover resting link particles were painting fog; `STREAM_ALPHA 0.06 → 0.012`. This is where the "resting particles are not free" scar comes from, with numbers. |

---

# 1. THE RIVER'S ACTUAL CONSTANTS (`47af6d8`)

All from `47af6d8:src/webgl/neural/neuralLatticeConfig.ts` unless noted.

**Count / geometry**
- `NEURAL_PARTICLE_COUNT = 9000` (`:48`), compact `3200` (`:56`)
- `STRAND_COUNT = 4` (`:97`), `STRAND_RADIUS = 0.0215` (`:104`), `STRAND_THICKNESS = 0.011` (`:106`), `BRAID_TURNS = 2.6` (`:108`), per-strand phases `[0, 2.4, 3.9, 5.7]`, thickness bias `[1.3, 0.75, 1.05, 0.6]`, rate `0.82 + 0.12·i` (`:115-121`)
- Rest envelope, authored: `2·(0.0215+0.011)·680 ≈ 44 px` (`:98-103`). Spec target was "40-60px visual thickness at rest" (`research/2026-08-21-signal-stream-spec.md:28`).
- `STREAM_SPAN_X = 0.58` (`:61`) ⇒ the spline spans **1.16 × the anchor rect width**. The anchor is full-bleed (`47af6d8:src/components/sections/problem-section.tsx:392-395`, `left-[calc(50%-50vw)] right-[calc(50%-50vw)]`), and local x/y map to `rect.w`/`rect.h` px (`47af6d8:src/webgl/NeuralLattice.tsx:289-297`).
- **Derived, unverified against a live measurement:** at 1920×935 the spline arc ≈ **2240 px** (1.16·1920 in x, plus the ±0.30·680 weave). Band height 680 px is the config's own figure; later live measurements give 725 px (`587a795` message) and 803.8 px (`research/2026-08-25-round12c-capacity.md:148`). A ±7% shift here does not move any conclusion.
- Allocation: healthy `RING_FRACTION = 0.3` (`:179`) ⇒ 6300 stream particles; broken = `9000 − SPARK_COUNT 32` = 8968 (`:222`, allocation at `47af6d8:src/webgl/neural/neuralFieldCompute.ts:414-450`).

**Sprite / alpha / blending**
- `NEURAL_POINT_SIZE = 8.0` px (`:427`), `CORE_SIZE_BOOST = 1.6` / `FRINGE_SIZE_DROP = 0.6` (`:135-136`) ⇒ **12.8 px core sprite, 4.8 px fringe sprite**, mean 8.8 px
- `STREAM_ALPHA = 0.8` (`:422`), `STREAM_EMISSIVE = 2.6` (`:419`), `RING_EMISSIVE = 3.0` (`:420`)
- Disc profile (`neuralFieldCompute.ts:1191-1192`): `alpha = smoothstep(0.5, inner, |quadUv|)`, `inner = mix(0.12, DOF_SOFT_MIN 0.03, vSoft)` — a flat plateau to 0.12·S then a smooth ramp to 0.5·S. Integrals of this profile: effective area `0.3246·S²`, squared-profile area `0.2294·S²` (numerically integrated by me).
- `material.blending = AdditiveBlending; depthWrite=false; depthTest=false; toneMapped=false; DoubleSide` (`neuralFieldCompute.ts:1258-1266`). **`toneMapped=false` ⇒ the framebuffer value IS `tone × emissive × alpha`**, which is what the bloom thresholds.

**The bloom, which is the load-bearing fact**
- Home route: `intensity 1.1, threshold 1.0, radius 0.7` (`src/webgl/store/routeFxStore.ts:63-65`); threshold is on Rec709 luminance of the post-blend framebuffer (`src/webgl/PostFXNodes.tsx:38-50`, `:820-832`).
- Linear-space Rec709 luminances: `COL_CYAN #3BE1FF = 0.6200`, `COL_CORE #EAFBFF = 0.9371`, `COL_BLUE #2A7FFF = 0.2289` (my computation; matches the codebase's own `0.6201` / `0.9371` figures at `f6cac67^:neuralLatticeConfig.ts:1053` and `f6cac67:neuralLatticeConfig.ts:661`).
- **River body, one particle, at rest: `0.6200 × 2.6 × 0.8 = 1.290` — 1.29× the bloom threshold. Every stream particle bloomed.** A core particle (`coreMix→COL_CORE`): `0.9371 × 2.6 × 0.8 = 1.949`. The outer fringe (`fringeA→0.35`, blue): `0.2289 × 2.6 × 0.8 × 0.35 = 0.167` — did not bloom, which is what made the braid have a soft edge and a hot spine.

**Motion → brightness (the mechanisms, `neuralFieldCompute.ts:1030-1180`)**
- `emisStream = (1 + surge·SURGE_GAIN 2.2 + flash·FLASH_GAIN 3.0) × STREAM_EMISSIVE 2.6 × shimmer × rowBright × (1 − deadMix·0.75)` (`:1100-1107`)
- Surge head **also fattens the sprite**: `sizeStream = mix(1.6, 0.6, fringe) × (1 + surge·0.45)` (`:1121-1125`)
- Surge head **whitens**: `headMix = clamp(surge·0.85)` toward `COL_CORE` (`:1090`)
- ⇒ surge-head post-blend luminance ≈ `0.889 × 8.32 × 0.8 = 5.92` = **4.6× the resting body, 5.9× the bloom threshold**, with a 45%-fatter sprite. Fracture death-flash: `(1+2.2+3.0)·2.6 = 16.1` ⇒ **11.5**, 8.9× rest.
- Shimmer `SHIMMER_AMP = 0.04` (`:151`), breathe `±0.06` over 7 s (`:149-150`).
- Surge shape: `SURGE_K 240` gaussian head + `SURGE_TAIL 0.035` comet tail, `SURGE_SPEED 0.55` flow-t/s (`:231-239`).

**Trail / streak mechanism (`neuralFieldCompute.ts:1207-1241`)**
- `stretch = 1 + min(|motion|·uStretchGain·(1 + uScrollVel·uVelStretch), uStretchMax)`; `STRETCH_GAIN 1.5`, `STRETCH_MAX 2.0` ⇒ **cap 3.0×** (`:141-142`). The quad's x-corner is scaled and rotated into the screen-space motion direction; the fragment evaluates the disc on the **unrotated** uv ⇒ the sprite becomes an ellipse `3S × S`, and **its axial line integral scales with `stretch`.** Analytic/WebGL2 tier gets a fixed `STATIC_ELONG = 0.28` along the tangent (`:143`).
- **Correction worth carrying forward:** ambient flow was *barely* stretched. `FLOW_SPEED 0.055` cycles/s over a 1.16-local-unit span = 0.064 local/s ⇒ `stretch = 1 + min(0.064·1.5, 2) = 1.10`. The 3× streak belonged to the **surge** (`SURGE_ADVECT = 1.3` local/s ⇒ 2.95×, `:146`). The static tier's fixed 1.28× was *more* elongation than the compute tier's ambient. The ambient river was continuous **on density alone**, not on streaking.

**Size-vs-distance falloff**
- `depthAtten(z) = (1 + (zn−0.5)·NEURAL_DEPTH_ATTEN 0.5) × (1 + (zn−0.5)·DOF_SIZE_GAIN 0.6·uDof)` (`neuralFieldCompute.ts:1245-1252`), `DEPTH_Z_RANGE 0.12` (`:433`); alpha `DOF_FAR_DIM 0.55` at the far extreme (`:411`), disc inner edge widens `0.12 → DOF_SOFT_MIN 0.03` near-camera (`:414`). Perspective divide `/max(dist,0.001)` on top.

**Scroll-reactive family (`:385-407`)** — `VEL_NORM 100`, `VEL_DAMP 6`, `VEL_SWELL 0.25` (width), `VEL_STRETCH 0.6` (streak), `VEL_FLOW 0.4` (flow clock, driver-integrated), `VEL_CURL 0.3`, `VEL_DEBRIS 0.2`.

---

# 2. THE STRAND LINKS' CONSTANTS AT THE MOMENT THEY WERE KILLED (`f6cac67^`)

From `f6cac67^:src/webgl/neural/neuralLatticeConfig.ts`:
- `STRAND_COUNT = 1` (`:476`) — round-8-D took it 2→1 because "splitting those over two strands made both dotted"
- `STRAND_RADIUS = 0.0034` (`:504`), `STRAND_THICKNESS = 0.0018` (`:507`), `ENVELOPE_BASE = 1.8` (`:517`) ⇒ effective helix radius `0.0061` ≈ **4.16 px**, jitter `0.0032` ≈ **2.2 px** on a 680 px band. `BRAID_TURNS = 0.6` (`:520`) × `STRAND_RATE_BASE 0.82` = **0.49 turns per link** — the particles sat on one smooth sagging arc, not scattered in a tube.
- `NEURAL_POINT_SIZE = 7.5` (`:1099`), `CORE_SIZE_BOOST 1.25` / `FRINGE_SIZE_DROP 0.55` (`:550-551`) ⇒ **9.4 px core, 4.1 px fringe**, mean 6.75 px
- `STREAM_ALPHA = 0.62` (`:1077`), `STREAM_EMISSIVE = 2.1` (`:1071`)
- `NODE_FRACTION = 0.28` (`:689`), `SPARK_COUNT = 32` (`:728`) ⇒ **link particles = 9000 − 2520 − 32 = 6448**, over **~227 delivered links** = **28.4 particles per link** (the config's own arithmetic, `:1078-1098`)
- Post-blend luminance the config itself computed: `0.6201 × (2.1 × midProfile 1.15) × 0.62 = 0.928`, `0.966` at the shimmer peak. **Deliberately under 1.0: "LINKS STILL DO NOT BLOOM (they only halo)"** (`:1044-1070`).
- **The owner's live attempts** (`f6cac67` message): point size `7.5 → 10`, strand envelope `1.8 → 3.2`.

### ERRATUM — the shipped spacing was 1.6× worse than the ledger claimed
`f6cac67^:neuralLatticeConfig.ts:1080-1090` derives "~28.4 particles per **~71 px** link ⇒ **2.5 px spacing**", and `:497-503` reuses 71 px. The later **measured** figure off the real tables is **mean edge 114.3 px** (`research/2026-08-25-round12c-capacity.md:150`: "mean NN spacing 84.6 px · mean edge 114.3 px"). At the real length the shipped spacing was **4.02 px**, not 2.5 — and the 4.1 px **fringe sprite was exactly one spacing (1.02× overlap, i.e. none)**, while the 9.4 px core overlapped only 2.3×, not the claimed 3.8×. The "every cross-section strand now overlaps its neighbour → one continuous filament" conclusion at `:1090-1092` was arithmetic on a wrong length. This is why round-8-F shipped and still read as dotted.

---

# 3. THE EXACT RATIO THAT SEPARATES "FILAMENT" FROM "CHAIN"

**The discriminating quantity is not spacing/diameter on its own. It is the mean accumulated post-blend luminance along the strand axis, measured against the bloom threshold 1.0.**

Model (mine, from the shipped disc profile): for particles at axial linear density `n/L` in a strip of transverse extent `W`, with sprite diameter `S`,

```
Ω   = 0.3246 · (n/L) · E[S²] / max(W, S)      "areal overlap" — sprites covering any point
σ/μ = 0.8407 / √Ω                              shot-noise ripple of a Poisson train
μ   = Ω · L_particle                           mean post-blend luminance on the axis
trough ≈ μ·(1 − σ/μ),  peak ≈ μ·(1 + σ/μ)
```
(`0.3246 S²` and `0.2294 S²` are the numerically-integrated area and squared-area of `smoothstep(0.5, 0.12, r)`; flow phase is `fract(basePhase + …)` off a random seed, `47af6d8:neuralFieldCompute.ts:765-767`, so positions are Poisson, not a comb.)

| | spacing `d` | mean `S` | **S/d** | Ω | σ/μ | **mean** | **trough** | **peak** |
|---|---|---|---|---|---|---|---|---|
| river v4 broken, **per strand** | 1.00 px | 8.80 | **8.81** | 2.69 | 0.51 | **3.47** | **1.69** | 5.25 |
| river v4 healthy, per strand | 1.42 px | 8.80 | **6.19** | 1.89 | 0.61 | 2.44 | 0.95 | 3.93 |
| river v4 broken, whole braid | 0.25 px | 8.80 | 35.2 | 2.43 | 0.54 | **3.14** | **1.45** | 4.83 |
| **links at the kill (7.5 px)** | 4.02 px | 6.75 | **1.68** | 0.57 | 1.11 | **0.53** | **≈0** | **1.12** |
| owner's live try: point size 10 | 4.02 px | 9.00 | **2.24** | 0.76 | 0.96 | 0.71 | 0.03 | 1.39 |
| owner's live try: 10 + envelope 3.2 | 4.02 px | 9.00 | **2.24** | 0.76 | 0.96 | 0.71 | 0.03 | 1.39 |
| HEAD today (`STREAM_ALPHA 0.012`) | 5.37 px | 3.71 | 0.69 | 0.24 | 1.73 | 0.004 | 0 | 0.01 |

### The threshold, stated three ways

**(a) The mechanism, in one sentence.** The bloom threshold 1.0 fell **between the river's trough (1.45–1.69) and the links' peak (1.12–1.39)**. On the river, even the darkest point of the strand was above threshold, so the whole strand bloomed as one continuous object → a line of light. On the links, only the sprite *centres* crossed threshold (mean 0.53, peak 1.12) → **the selective bloom acted as a blob detector, amplifying every peak and ignoring every trough. It did not merely fail to fuse the beads; it manufactured them.**

**(b) The number to design against.**
```
CONTINUITY:  Ω · L · (1 − 0.8407/√Ω)  ≥ 1.0      (the trough must bloom)
```
River braid: **1.45** ✔. Links at the kill: **−0.06** ✘. Solving for the minimum Ω: `L=1.29 → Ω ≥ 1.95`; `L=0.93 → Ω ≥ 2.37`; `L=0.57 (the LineSegments' own rest value) → Ω ≥ 3.28`.

**(c) The pocket version.** With `W ≤ S` the criterion collapses to a pure ratio:
> **`S/d ≥ 6.2`** — at least ~6 sprite diameters of overlap per particle spacing along the axis.

6.19 is the *healthy* river's value — the dimmest river configuration that shipped and read as light. The kill sat at **1.68**, and the owner's point-size-10 attempt reached **2.24**. **He was 2.8× short and the knob he was turning had a ceiling far below the target.** Reaching `S/d = 6.8` by sprite size alone at the kill's density would have required a **~27 px mean sprite** — self-evidently absurd, which is the formal proof that "many, tiny, fast" is the only direction.

### Why the two live knobs cancelled
`ENVELOPE_BASE` scales `strandOff + jit`; with `STRAND_COUNT = 1` and 0.49 turns per link, raising it 1.8→3.2 only made the single thread **sag** further (helix radius 4.16→7.4 px, jitter 2.2→3.9 px) — it did not scatter particles transversally enough to change `max(W,S)` once `S` was 9 px. So the envelope raise contributed **exactly nothing** (Ω 0.763 with and without it, row 5 vs row 6 above), while the point-size raise moved the mean 0.53→0.71 and **never reached 1.0** — and made each surviving blob 9.4→12.5 px across. **He made the blobs bigger without ever making them touch.** That is why no amount of tuning could have worked, and the commit's structural conclusion was correct *for a 1 px line target*.

---

# 4. WHAT `f6cac67` TRANSFERRED, WHAT IT COULD NOT, AND WHAT COMES BACK FREE

**Transferred** (commit message + `f6cac67:src/webgl/neural/neuralLinkLines.ts:1-52`): fray dash + ember tips, clean-break gap, `uRecohere`, zone ignition, the surge wavefront sweeping the line, death flash, mid-span profile, cool→warm tint, shimmer, tip fades into the stars, DOF, staggered reveal. One `LineSegments`, `LINK_SEGMENTS = 6` sub-segments (`:606`), chord re-derived live in the vertex stage from `uEdgeA/uEdgeB → uNodePos + nodeDrift`.

**Admitted NOT transferable — "cross-section properties a 1px line cannot have":**

1. **The radial ramp.** Three independent cross-section channels, all keyed on `fringe` (`47af6d8:neuralFieldCompute.ts:1073-1125`):
   - tone: `coreMix = 1 − smoothstep(0, 0.3, fringe)`; `body = mix(CYAN, BLUE, smoothstep(0.2,1,fringe))`; `grad = mix(body, CORE, coreMix)` — a white-hot spine cooling to blue at the edge
   - alpha: `fringeA = mix(1, 0.35, smoothstep(0.55,1,fringe))` — the edge dissolves into the navy
   - size: `sizeStream = mix(1.6, 0.6, fringe)` — fat core, fine fringe
   The line replaced all three with **one flat tone**, `mix(COL_CYAN, COL_BLUE, LINE_BLUE_MIX 0.3)`, luminance **0.5029**, constant across its whole 1 px (`f6cac67:neuralLatticeConfig.ts:628-641`, `:676`).
2. **The `widthEnvelope` family.** `f6cac67:neuralLatticeConfig.ts:536-546` is explicit: the family is "now nearly INERT"; `VEL_SWELL` and `ROW_SWELL` were **re-homed onto brightness**, and `TIGHTEN_PER_RING` was **not transferred at all** ("a 1 px line has no width, and mapping it to alpha would fight the cool→warm tint").
3. **`VEL_SWELL 0.25`** (the river swelling while you scroll) became a brightness term inside a **hard-capped** chain.

**Do they come back for free? Yes — and here is the concrete argument.**

- The particle band **has** a cross-section, so items 1–3 are literally the same code paths that already exist and are still in the file today (`src/webgl/neural/neuralLatticeConfig.ts:550-551` `CORE_SIZE_BOOST/FRINGE_SIZE_DROP`, the `fringe` ramp in `neuralFieldCompute.ts`). Nothing has to be invented; `STRAND_RADIUS` was set to `0` (`HEAD:1463`) and `STRAND_COUNT` to `1` (`HEAD:1440`) — restoring a cross-section is two constants plus a density budget.
- **The expressive range difference is 12×, and it is measurable.** The line's entire dynamic range is `rest 0.568 → asymptotic ceiling LINE_LUM_MAX 0.97` = **1.71×**, capped by contract and by a C¹ knee (`f6cac67:neuralLatticeConfig.ts:614-671`). The river's brightness channel alone ran `1.290 (rest) → 5.92 (surge head) → 11.5 (death flash)` = **4.6× / 8.9×**, uncapped, **plus** an orthogonal size channel (`×1.45` at the surge head) **plus** an orthogonal axial-stretch channel (`×3.0`) **plus** an orthogonal width channel (`VEL_SWELL`, `ROW_SWELL 0.45`, `TIGHTEN_PER_RING`, `BREATHE_AMP`). Four orthogonal channels against one capped one.
- **The line was forbidden to be light.** `LINE_LUM_MAX = 0.97` exists precisely so "THE LINE NEVER BLOOMS… the light in this band belongs to the stars and the beads" (`f6cac67:neuralLatticeConfig.ts:643-668`). The owner has now asked for the opposite — the particles *are* the lit line. **A line primitive cannot deliver that without breaking its own contract; particles deliver it by construction, because they can exceed 1.0 and the bloom then fuses them.** This is the strongest single argument for the reversal.
- **The one honest counter-argument the commit makes, restated:** "the line is dimmer per pixel and reads BRIGHTER because it concentrates that energy in 1 px instead of smearing it across a 9.4 px sprite" (`f6cac67:neuralLatticeConfig.ts:623-627`). That is true and it is the trap. The answer is not to re-smear across 9.4 px — it is to **shrink the sprite to the width you want the line to be**. The delivered line width *is* the sprite diameter; continuity is then paid for in count, not size. A 3–3.5 px sprite train at `S/d ≥ 6.8` is a 3–3.5 px line of light with all four channels intact.

---

# 5. THE ANTI-BLOB CHECKLIST — no chord underneath

Each item is a predicate computable from constants before writing a shader, plus how to test it live.

**A. Continuity (the three that actually decide it)**

1. **`S/d ≥ 6.8`** — mean sprite diameter ÷ mean axial particle spacing on a single strand.
   Reference points: river broken 8.81 ✔, river healthy 6.19 ✔ (marginal), **kill 1.68 ✘**, kill+pointsize10 2.24 ✘, HEAD 0.69 ✘.
2. **Mean accumulated post-blend luminance on the strand axis `μ = Ω·L ≥ 1.0`** — the *mean*, not the peak, must cross the bloom threshold. Below this the threshold-1.0 bloom **is** the bead generator. River braid **3.14** ✔; kill **0.53** ✘.
3. **Trough `μ·(1 − 0.8407/√Ω) ≥ 1.0`.** River braid **1.45** ✔; kill **−0.06** ✘. This is the binding one; targets: `Ω ≥ 1.95` at `L = 1.29`, `Ω ≥ 2.37` at `L = 0.93`.

**B. Ripple wavelength (what makes "tiny" mandatory)**

4. **Mean sprite diameter `S ≤ 4 px`.** The shot-noise beat period is ≈ `S`; the kill's beat was 6.75–9.0 px — squarely resolvable. HEAD's `DUST_SIZE 0.55 ⇒ 3.4 px` (`HEAD:1680`) is already in range. *Caveat:* the river got away with an 8.8 px per-strand beat only because **four** decorrelated strands averaged it down at band level (`STRAND_PHASES`/`STRAND_RATE_STEP`, `47af6d8:neuralLatticeConfig.ts:115-121`). A single thin filament has no such averaging and must earn continuity from Ω alone.
5. **Never buy continuity with sprite size.** At fixed Ω, `n ∝ 1/S` and **fill cost `n·S² ∝ S`** — i.e. at constant continuity, *halving the sprite halves the fill and buys 2× the particles*. Predicate: any `NEURAL_POINT_SIZE` increase must be matched by a ≥ proportional count increase, or Ω has fallen. Corollary predicate: **`W` (the transverse envelope) is orthogonal to continuity on a single strand** — proven by rows 5/6 of the §3 table (envelope 1.8→3.2 changed Ω by 0.000).

**C. The fog test — "measured luminance N px off the strand axis"**

6. **Integrated resting haze `Σ N_unlit · S² · L_unlit ≤ ~1.0k px²·lum` over the visible band.** These are the codebase's own shipped units: `587a795` moved `STREAM_ALPHA 0.06 → 0.012`, per-particle post-blend `0.090 → 0.018`, "integrated band haze **~5.2k → ~1.0k px²·lum**" — 4800 sprites × 3.4² × 0.018 = 1.00k reproduces the shipped figure exactly, and 5.2k is the *rejected fog*.
   **Consequence with numbers:** at 9000 sprites of 3.5 px, an unlit particle must sit under post-blend luminance **0.009** (≈ `alpha ≤ 0.007` at emissive 2.1, cyan) — a real OFF, not a dim floor. At 3.0 px the ceiling is 0.012. **A design that leaves the whole 9000 dimly lit re-creates the round-8-I fog before it lights a single line.**
7. **Perpendicular profile: `L(axis) / L(±3·S off axis) ≥ 15`.** Sample a 1 px line of pixels perpendicular to the strand. The codebase's own accepted subject:surround ratios after the haze kill are **18.8× core:line** and **18.3× fray:surround** (`587a795`). A filament passes; the round-8 fog failure had the energy *spread*, so this ratio collapses even when items 1–3 pass.

**D. Capacity — check this BEFORE tuning anything**

8. **`lit_run_px ≤ 0.3246 · S · N_particles / Ω`.**
   At `S = 3.5 px, Ω = 2.2`: **9000 particles light 4,648 px of run**. Measured mean edge is 114.3 px (`research/2026-08-25-round12c-capacity.md:150`) ⇒ **~41 links.**
   The on-frame net at D17 density parity is **227 links × 114.3 px = 25,946 px** (same on-frame count as today by construction, `research/2026-08-25-round12c-capacity.md:212`). **Lighting all of it at Ω 2.2 needs ~50,200 particles — 5.6× the budget.**
   ⇒ **At most ~18% of the on-frame net can be a lit line at any instant.** The moving-front architecture the owner asked for (D14/D16) is not a stylistic choice here; it is the only way the budget closes. Full table: `S=3.0 → 35 links`; `S=4.0 → 46 links`; compact tier 3200 → ~14 links at `S=3.5`.
   Also enforce `PLEXUS_EDGE_CAP` — it is 250 today (`research/2026-08-25-round12c-capacity.md:237`) and will silently truncate a D17 net.
9. **Motion credit is real but small at ambient.** Velocity stretch multiplies the axial line integral by `stretch`, so **Ω scales with `stretch`, up to 3×** (`47af6d8:neuralFieldCompute.ts:1220-1240`). Predicate: only bank it where the particle actually moves at surge speed — `FLOW_SPEED 0.055` delivers just **1.10×**; `SURGE_ADVECT 1.3` delivers **2.95×**. The analytic/WebGL2 tier has no live velocity and gets a fixed `STATIC_ELONG 1.28×`, so **its Ω is not the compute tier's — verify it separately.**

**E. Contracts this round will collide with (flag to the owner, do not silently break)**

10. **`LINE_LUM_MAX 0.97` / "the line never blooms" is dead** if particles are to be the lit line. State the reversal explicitly rather than leaving a capped chain in the file.
11. **The star:strand contrast collapses.** Star core post-blend at HEAD is **10.68** (`RING_EMISSIVE 3.0 × STAR_PUNCH 3.2 × STAR_CORE_EMIS 1.25 × tone 0.889`; consistent with `587a795`'s "core:line 18.8×" against the 0.568 line). A river-bright strand at mean 3.14 puts core:strand at **3.4×**, down from 18.8×. Either raise `STAR_PUNCH` again, or accept it, or — the resolution that matches the brief — keep the bright strand **confined to the moving front** so the static picture is still stars on darkness. This is a real trilemma between continuity, star dominance, and haze; the unlatched build front is what resolves it.
12. **Existing scars still bind:** C¹ soft knee not `min()`/clamp on any moving wavefront; do not interpolate a smoothstep across a wide quad; scale `alpha` and `cut` together or particles delete instead of fading; `CULL_PAD` is hysteresis.

---

**Scratch working (mine, not repo files):** `C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/ba6d249f-d877-410c-800b-3da371f4fd94/scratchpad/calc2.js` (the Ω / σ-μ / capacity arithmetic) and `.../scratchpad/old/*.ts` (the six historical file versions dumped via `git show`). No repo file was written.
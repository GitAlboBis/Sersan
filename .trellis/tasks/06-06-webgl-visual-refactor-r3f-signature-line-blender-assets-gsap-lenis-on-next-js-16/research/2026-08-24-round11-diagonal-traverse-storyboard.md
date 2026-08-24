# ROUND 11 — THE DIAGONAL TRAVERSE STORYBOARD (the film half, rewritten)

- **Query**: rewrite the film against the design the owner actually approved (ADDENDUM 2, D6–D10). The round-10 storyboard's central mechanism — a sticky `.seq-stage` with EXIT/TRAVEL/HANDOFF/HOLD beats — was rejected.
- **Scope**: internal (the two shipped sections, the WebGL band configs, the shipped drift driver) + the mined Lusion detail-page parallax grammar.
- **Date**: 2026-08-24
- **Supersedes**: `2026-08-22-round10-journey-storyboard.md` §1, §B, §B3, §C, §D, §E, §H, §J. That file stays on disk as the record of the rejected design; its through-line (§A), copy inventory, value world (§G) and recipe cards (§I) survive and are re-used here.
- **Revised 2026-08-24, later the same day**, against `2026-08-22-round10-OWNER-DECISIONS.md` **ADDENDUM 3 (D11–D13)**. Three of this document's four open decisions came back:
  - **D11 · the WINDOWED lateral rate wins.** He read the honest number — *the copy drifts 100 px, the net runs 1920* — and chose K-3's windowed α **against this document's recommendation**. Superseded text is marked, not deleted; §B1, §B2, §C0, §D and §E are rebuilt around it. **The cost is written into the dossier plainly (§B1.4) and must not be softened by a later reader: the copy layer is no longer honest parallax.**
  - **D12 · hold the ANGLE on the phone**, as recommended — 23.6° everywhere, 5.77 screen widths at 390. §G1.
  - **D13 · the ignition front is approved**, as recommended — it now carries the descending diagonal, so it is specified properly in **§B6**, not as a garnish. The brief's "enters top-right, leaves bottom-left" was **the coordinator's error, not the owner's**; recorded here so it is not re-litigated as an owner position.
  - **K-4 stays open**: ship 23/77 and judge live.
- **Also folded in**: `CRYSTAL_SCALE` is committed at **0.115**, and the prepared viewport re-base documented above it in `crystalConfig.ts` (L385–500) is now load-bearing — under D10's section growth a band-keyed stone renders **1677 px, 186 % of the viewport**. §B5 is rewritten against the viewport-keyed constant `C_vp = 0.0926`.
- **Owns**: the film — the strip map, the moments, the differential-rate ledger, the legibility budget, the entrances/exits, the value world, the three viewports.
- **Does NOT own**: camera authority, the uniform/binding budget, the file-by-file change list, the staged rollout. Those are `2026-08-24-round11-diagonal-traverse-mechanism.md` (parallel agent).

**Sources**
- Copy: `src/components/sections/problem-section.tsx`, `src/components/sections/production-grade-section.tsx`. Every string below verified with `grep -F` against the working tree this session (see §Copy freeze).
- Reference grammar: `2026-08-21-lusion-text-dossier.md` §4 (detail-page differential horizontal parallax) — the single most relevant document in the corpus for this design.
- Measured page map: `2026-08-22-round10-journey-mechanism.md` §1.1 (coordinator, live, 1280×720, `scrollHeight` 21459).
- Config, read at HEAD: `neuralLatticeConfig.ts` (`COPY_EDGE_LOCAL` L1731, `COPY_EDGE_PAD` L1779, `COPY_RAMP_SOFT` L1806, `COPY_MASK_FLOOR` L1824, `COPY_MASK_FLOOR_LINE` L1838, `COPY_Y_FLOOR` L1849, `PLEXUS_RZ` L255, `BAND_ASPECT` L247, `LINE_LUM_MAX` L677, `RING_T` L802, `SURGE_SPEED` L1059, `PACKET_RATE` L1112, `DEBRIS_ALPHA_MAX` L1030, `SPARK_COUNT` L1043, the per-viewport copy-mask table L1701–1708); `crystalConfig.ts` (`CRYSTAL_SCALE` L360 = 0.115, `CRYSTAL_POS` L292, `FOG_*` L1961–2101, `EMBER_COLOR` L1524, `PLEXUS_COLOR` L1858, `CRYSTAL_FOG_COLOR` L1954, `CALLOUT_LABEL_OFFSET_PX` L937); `src/webgl/constants.ts` (`CAMERA_FOV` 50, `CAMERA_Z` 12); `src/components/fx/lusion-type.ts` (`DRIFT_SCALE` L164, `DRIFT_MAX_WIDE/COMPACT` L180–181, `ROW_DRIFT_K` L698); `src/app/globals.css` (`--header-h` L85 = 6.1rem, `--margin` L84/108/111/114).
- Scroll law: `2026-08-22-round8-scroll-dossier.md` (our Lenis delta, the settle-glide velocities, the flick regime).
- Value world: `2026-08-22-round8-stone-source-anatomy.md` §B.

**Standing constraints honoured throughout**: solid display type (never ghost/outlined/hollow); blue/cyan/navy only, **never violet**, sanctioned desaturated amber for failure/ember; no boxed cards, no fake console chrome, no section-sized rectangles of tint, no glowing-blob stone, no oversized crystal (`CRYSTAL_SCALE` 0.115 committed — 38.2 % of *anchor-rect* height today, **re-based to 30.8 % of VIEWPORT height** under this design's section growth, §B5); **no `pin:`, no sticky stage, no snap, no parking**; the page body never scrolls horizontally.

---

## A. THE FILM STRIP — the whole traverse in ten seconds

```
 ACT I — THE FRACTURE  ·  #problem 4392px (6.10vp)  ·  scene runs LEFT
 ───────────────────────────────────────────────────────────────────────────────────────
 strip x →   0        0.5W       1.0W       1.5W       2.0W       2.5W       3.0W
             ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
   net       │▒▒░ ░▒▓▒░ │▓▓▒░  ░▒▓ │▒░ ░▒▓▓▒  │░▒▓▒░  ░▒ │▓▒░ ░▒▒░  │ ▓▓▓▓▓▓ ██│  ← α 1.00
   copy      │   [CHAP] │   [01]   │   [02]   │   [03]   │          │  [WALL]  │  ← α 0.25/0.50
   stone     │          │          │          │        ◦ │    ◆     │   ◆◆     │  ← α 1.00
             └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
              p 0.00      0.18       0.36       0.53       0.70       0.87   1.00

        the frame at any p:                    the path a COPY block traces (D11):
        ┌───────────────────────┐               ┌───────────────────────┐
        │ header                │               │ ←──────╮ 57° exit,    │
        │ ╔═══════╗ ▒▓▒ ░▒▓▒ ░  │               │        │  fading out  │
        │ ║ COPY  ║  ░▓▒ ▒░ ▓▒  │               │      ╭─╯              │
        │ ║ LANE  ║ ▒░ ▓▓▒ ░▒▓  │               │      │ 6.2° READING   │
        │ ╚═══════╝  ░▒▓ ▒░▒ ▓  │               │      ╰─╮  (opaque)    │
        │  ← gate    the net →  │               │  57° entry ──────→    │
        └───────────────────────┘               └───────────────────────┘
        copy left, net right,                   fast in, SLOW to read,
        the gate between them                   fast out. Act II mirrored.

     and the DESCENDING diagonal, carried by light instead of geometry (D13):
        ┌───────────────────────┐
        │ ╲ ▓▓▒░               │   the ignition front enters top-right,
        │   ╲ ▓▓▒░             │   sweeps DOWN-LEFT at 23.6° from horizontal,
        │     ╲ ▓▓▒░           │   once per copy-free gap.
        │       ╲ ▓▓▒░         │   1461 px of front travel per sweep @1280,
        │         ╲ ▓▓▒░       │   at 3.32 px per scroll px. See §B6.
        └───────────────────────┘

 INTERLUDE  ·  #work 2283 + #services 3751 = 6033px  ·  THE WORLD IS CLOSED (D2)
 ═════════════════════════════════════════════════════════════════════════════

 ACT II — THE ANSWER  ·  #trust 4284px (5.95vp)  ·  scene runs RIGHT (mirrored)
 ───────────────────────────────────────────────────────────────────────────────────────
   net       │██ ▓▓▓▓▓▓ │  ░▒▒░ ░▒▓│ ▒░  ░▒▓▒░│  ▒▓▓▒░ ░▒│ ▓▒░  ░▒▓▓│ ▒░▓▒░ ▒▒▓│  → α 1.00
   copy      │  [CHAP]  │   [01]   │   [02]   │   [03]   │          │  [SLAB]  │
   the light is BORN behind the reading column and carries OUT to the right
```

| | ACT I (`#problem`) | ACT II (`#trust`) |
|---|---|---|
| scene direction | **left** (elements exit top-left) | **right** (elements exit top-right) |
| element path angle from vertical | net 23.6° · copy **57° at the frame edges → 6.2° (body) / 12.3° (display) in the reading zone → 57° again** (D11) | same, mirrored |
| the descending diagonal (D13) | the **ignition front**, top-right → bottom-left at 23.6° from horizontal, one sweep per gap | same, mirrored |
| lateral run of the reference plane | **1920 px = 1.50 W** | **1920 px = 1.50 W** |
| the copy lane | left third, fixed in screen space | left third, fixed in screen space |
| what the mask does to the read | the net streams in from the right at full value and **dims out as it reaches the words** — the light dies where the words are | the net **is born behind the words** and carries out to the right at full value |
| the wavefront | dies at the wall | crosses three gates and survives |
| the stone | fractured — the meteorite, sighted late (D3) | intact, mark legible inside the ice |

**The single sentence.** Two nets, one volume, entered twice on mirrored diagonals: you descend at your own speed while the world slides sideways past you, the copy rides deep and nearly still in a lane the net is never lit inside, and the only thing that literally crosses the frame is the world itself.

---

## B. THE WORLD LAYOUT — the map

### B0. The frame of reference, stated once

- **Strip x** is world-lateral position, measured in screen widths `W` from the section's start pose. The strip is `1.0 W` (one frame) + `1.5 W` (the run) = **2.5 W wide** for the reference plane.
- **p** is section progress `0 → 1`, `p = (scrollY − sectionTop) / H`. There is no stage, no sticky, no offset correction: `p` is the raw document position.
- **Lateral offset** of a layer at rate α: `X(p) = ±α · 1.5W · p`, sign negative in Act I, positive in Act II. Applied as `transform: translate3d(X,0,0)` on a wrapper inside the section's existing `overflow-hidden` — **the body never scrolls horizontally**.
- **Vertical** is untouched. Every element descends at exactly 1:1 with the scroll. That is D7, and it is also what makes §E's guarantee work.
- **Screen** conventions: 1280×720 unless stated; `--header-h` 6.1rem = **98 px**; `--margin` 10rem = **160 px** at ≥1280, 2rem = **32 px** below 768; content width **960 px** @1280, **1120 px** @1440, **326 px** @390.

### B1. The differential-rate ledger (α), and the depth it implies

This is the Lusion detail-page grammar, quoted and then applied. From `2026-08-21-lusion-text-dossier.md` §4, the project-detail page (bundle offset ~930.7 k) moves **whole blocks, unsplit**, each with its own horizontal-parallax divisor keyed to one pane position:

> title window 0–.65 expoInOut (**+`scrollPane.x/2`**), desc .4–.85, CTA .45–.9, services .5–.95 (**`x/5`**), links .55–1 (**`x/4`**) — all `(1-T)*30`px + `opacity=Math.min(v,T)`, expoOut.

So Lusion's measured fractions are **1/2 (title), 1/4 (links), 1/5 (services)** — a 2.5:1 spread among the blocks and a **5:1 spread against the pane itself**. (Honest gap: the dossier gives *windows* for `desc` and `CTA` but **no x-divisor** for either; do not invent one and do not claim Lusion runs body copy at a known fraction. Their vertical ledger is separately quoted: `showScreenOffset · −k`, k = **0.5 title / 1.5 desc / 1.25 CTA** — which is exactly the `data-drift` k our own `lusion-type.ts` already ships, `ROW_DRIFT_K` L698 = `[0.5, 0.66, 0.82]` and `data-drift="1.25"` on both chapter descriptions.)

Our ledger, and the depth each α implies. Depth is exact, not metaphorical: for a camera translating laterally by `T`, a point at distance `d` moves `−T·f/d` on screen, so **screen rate ∝ 1/d**. With the shipped rig (`constants.ts`: `CAMERA_FOV` 50, `CAMERA_Z` 12) the DOM/anchor plane sits at `d = 12` world units, so `d(α) = 12/α` and `z(α) = 12 − 12/α`.

| layer | α | `d` | world `z` | run per section @1280 | source / why |
|---|---|---|---|---|---|
| near motes, packet beads | **1.20** | 10.0 | **+2.0** | 2304 px = **1.80 W** | `DriftParticles` near spawn limit `z = +2` (`DriftParticles.tsx:235`); the shipped rig cannot go nearer |
| net **near face** | 1.087 | 11.04 | +0.96 | 2087 px = 1.63 W | `PLEXUS_RZ` 0.2 × band height 619 px = 124 px = **1.93 world units** at `k` = 0.01554 u/px ⇒ ±0.96 |
| **net dense mid — THE RUN** | **1.00** | **12.0** | **0** | **1920 px = 1.50 W** | the reference plane. **This is D9, literally, on the thing he is looking at** |
| net far face | 0.926 | 12.96 | −0.96 | 1778 px = 1.39 W | same slab |
| far motes | 0.750 | 16.0 | −4.0 | 1440 px = 1.13 W | `DriftParticles` far spawn `z = −4` |
| the stone + its callouts + plexus | **1.00** | 12.0 | 0 | 1920 px = 1.50 W | `CrystalCluster` is camera-locked to the same anchor rect; it must not float off the net's plane |
| **display type** (H2, row display lines, index, arrow, eyebrows) | **α_slow 0.50**, α_fast 3.50 | **24.0 → 3.43 → 24.0** | −12 → +8.6 → −12 | **823–845 px = 0.64–0.66 W** of excursion | **Lusion title `scrollPane.x/2`** for the reading rate; the window is Lusion's `contentShowRatio` pairing |
| **body copy** (chapter descriptions, `[data-row-body]`, the closing disclaimer) | **α_slow 0.25**, α_fast 3.50 | **48.0 → 3.43 → 48.0** | −36 → +8.6 → −36 | **374–497 px = 0.29–0.39 W** of excursion | **Lusion links `x/4`** for the reading rate |
| dot-grid far wall | **0.14** | 85.7 | −73.7 | 269 px = 0.21 W | the vanishing point; it must be the slowest thing in the frame |

**Net positional spread: 1.20 → 0.14 = 8.6:1** among the *fixed-depth* layers. Today's shipped spread is `DriftParticles`' 1.6:1 (mechanism dossier §5). So this is a 5.4× widening of the site's existing depth range, and it is the whole reason the frame will read as a volume rather than a backdrop.

### B1.4 · What the `d` column means for the copy rows now — the cost of D11, stated plainly

⚠ **The copy rows do not have a depth. They have a depth trajectory, and it passes in front of every piece of geometry in the volume.**

A windowed α does not correspond to a fixed `z`. Reading `d = 12/α` at each instant, a body block sweeps

```
  d = 48.0  (α 0.25, reading)  →  d = 3.43  (α 3.50, frame edges)  →  d = 48.0
      z = −36                      z = +8.57                            z = −36
```

— a **14:1 depth range inside one block's on-screen life**, and `d = 3.43` is **nearer than the nearest thing in the scene** (near motes `d = 10.0`, net near face `d = 11.04`). The block crosses in front of the net whenever `α > 1.087`, which happens at window value `V̂ < 0.744` ⇒ smoothed coverage `< 0.663`, i.e. for roughly the **first and last 25 % of the block's visible life**.

**This is what the owner bought, and he was told the price in the option text: a rate that varies with screen position is not a depth, it is a scripted move.** It weakens D6 on the copy layer specifically, and on the lateral axis it is a cousin of the decelerate-to-read that D8 rejects on the vertical axis. Nobody reading this three rounds from now should mistake the copy layer for honest parallax: **the net, the motes, the stone and the dot grid are at real depths; the copy rows are animated.** The rest of the scene is untouched by D11 and remains rigid.

**The occlusion re-verification, which D11 requires and which comes out surprisingly well.** Copy is drawn *in front* (DOM over a `-z-10` canvas). Under a constant α that contradicted its implied depth everywhere, and the mask was the only thing saving it. Under the windowed α the picture splits cleanly in two, and there is **no scroll position at which the two cues disagree while geometry overlaps**:

| phase | ~% of the block's life | implied depth | drawn | do occlusion and parallax agree? | what protects it |
|---|---|---|---|---|---|
| frame edges, α > 1.087 | **~25 %** (first + last) | `d` 3.43 → 11.0 — **nearest in the scene** | in front | **YES — and correctly so.** The fast phase is the one phase where DOM-over-canvas is the physically right answer | nothing needs to; it is correct |
| transition, 0.25 < α ≤ 1.087 | ~15 % | `d` 11.0 → 48 | in front | no | the tracking gate (§E), live throughout |
| reading plateau, α = α_slow | **~60 %** | `d` 48 (body) / 24 (display) | in front | no | the tracking gate — and the block is fully opaque and stationary-ish here, so this is the phase that matters |

⚠ **But the guarantee must be re-verified exactly where the coordinator asked: at the frame edges, moving fast.** It holds *only* if the gate is derived from the same closed form in the same frame — a one-frame-stale gate lags the copy by `1.53 · v · 0.0167` px, which exceeds the bloom-onset margin above **2677 px/s @1280, 3010 px/s @1440 and just 814 px/s @390**. See §E5. In the reading plateau the same arithmetic gives 37 570 px/s — unreachable. **So the exposure is entirely in the fast phases, and it is entirely a temporal-lag problem, not a geometry problem.**

**Does this break D6?** For the copy layer, partly — see B1.4 above; the owner accepted that. For everything else, no, and here is the honest arithmetic rather than a reassurance.

1. **A different screen-space rate IS a different depth.** A block at 0.25 of the net's rate is at 4× the net's distance. It is a *deeper* block, not a cheat — `d = 48` against the net's `d = 12`. *(True of every fixed-α layer, and true of the copy rows only inside the reading plateau.)*
2. **A lateral camera translation produces horizontal parallax ∝ 1/d and *zero* vertical parallax.** Our design has exactly that: every element descends at 1:1 and only the horizontal differs. So the differential lateral rates are not a violation of the rigid-scene reading — they are its **signature**.
3. **The one place the model is not rigid is the vertical.** A rigid camera descending would give the deep blocks a *slower* descent too. Ours descend at 1:1 because the vertical is the *document*, not the camera. Lusion ships exactly this mismatch — a large horizontal differential (`x/2 … x/5`) alongside a small, bounded vertical one (`k` 0.5/1.25/1.5) — and our own `lusion-type.ts` already ships the bounded vertical half (`DRIFT_MAX_WIDE` 24 px, `DRIFT_MAX_COMPACT` 8 px, tanh-saturated, L164–181). **Keep the existing vertical drift exactly as it is.** It is the residual depth cue that stops the horizontal differential from reading as a pure slide.
4. **The one thing that would break it is occlusion.** By parallax the net is 2–4× *nearer* than the copy in the reading plateau; by DOM stacking the net paints *behind* it (`-z-10`, `problem-section.tsx:438` region). Occlusion is a stronger cue than parallax and would win. **The resolution is §E: the mask guarantees the net and the copy never share screen space in the plateau, so the occlusion cue is never tested there — and in the fast phases the two cues agree outright (B1.4).** That is the load-bearing argument of this whole document, and it is why §E is geometry, not time.

### B2. THE WINDOW SHAPE — the D11 rate law, specified

**One window drives three things: the lateral rate, the opacity, and (via §E) the mask lane.** That is not economy for its own sake — it is Lusion's own pairing, quoted from the text dossier §4: their detail blocks carry `opacity = Math.min(v, T)` on the *same* `contentShowRatio` window that drives the x-parallax. One ratio, two outputs.

**B2.1 · The coverage term.** For each block, with the reading band inset by `m` from both the header line and the viewport bottom:

```
m        = 0.12 · h                                   // 86 px @720 · 97 @810 · 101 @844
band     = [ headerH + m , h − m ]
overlap  = max(0, min(blockBottom, h−m) − max(blockTop, headerH+m))
coverage = clamp( overlap / min(blockHeight, h − headerH − 2m), 0, 1 )
```

The `min(…)` in the denominator is what keeps a block taller than the band from never reaching coverage 1. `coverage` is piecewise-**linear** in scroll and therefore has corners — it is **not** the thing that drives the rate.

**B2.2 · The C¹ requirement, and why smoothstep is the answer rather than a taste.**

```
V̂ = smoothstep(0, 1, coverage)          // 3t² − 2t³
α(s) = α_fast + (α_slow − α_fast) · V̂
```

`smoothstep` has **zero derivative at both ends**. That is the whole reason it is used here: `coverage` has corners at 0 and 1, and composing it with a function whose slope vanishes there makes **`V̂` C¹ in scroll even though `coverage` is only C⁰**. `α(s)` is then C¹ and the block's lateral position `X(s) = ∫α·R ds` is **C²** — smooth position, smooth velocity, smooth acceleration. A linear ramp would leave a slope discontinuity at each corner, which is a visible jolt at exactly the two moments the eye is most likely to be tracking the block.

**This is the same discipline as trap 11.** The project shipped a flat-topped wavefront once by clamping with a hard `min()`; the correction was a C1 soft knee. A lateral rate with a corner in it is the same defect on a different axis. **No `min()`, no `clamp()`, no `Math.max` on the rate. The knee is a smoothstep or it is a bug.**

**B2.3 · The rates.**

| | α_slow (reading) | α_fast (frame edges) | ratio |
|---|---|---|---|
| display type, labels, index, arrow | **0.50** | **3.50** | 7:1 |
| body copy, disclaimer | **0.25** | **3.50** | 14:1 |

**α_fast is deliberately COMMON.** Everything moves together at the frame edges, so a chapter plate arrives as one object and then *unfolds* into depth as it settles into the reading zone. Giving each layer its own α_fast would preserve the differential where nobody can see it and destroy the arrival where everybody can. Peak lateral rate: `3.50 × R` = **1.53 px lateral per px of scroll (1.57 in Act II) = a 57° path**, against 6.2°/12.3° in the plateau.

**B2.4 · Opacity rides the same window.**

```
opacity = V̂        // on the LATERAL wrapper only
```

The block is fully opaque exactly over the plateau, and fades to 0 exactly where it moves fastest. This is simultaneously the entrance, the exit treatment (§D) and the reason "zero legibility cost" is literally true: **the copy is never legible and fast at the same time.**

⚠ **Transform-target discipline.** The window writes `opacity` and `translate3d` on the **lateral wrapper**; the entrance recipes (H3 / R1 / B1 / B3 / B2) write opacity and transforms on the **split children**; `[data-drift]` writes the vertical drift on its **own** wrapper. Three drivers, three elements, **never a shared target** — the round-5 rule the codebase already enforces (`problem-section.tsx:496–507` comment: *"the entrance owns only the outer wrapper, never the same element"*).

### B2b. The drift cap — a paragraph may drift sideways by at most its own height

The plateau drift still needs a ceiling on the short blocks (§C0: 1.70–2.26 em/line uncapped at 1440). The instrument already exists: `lusion-type.ts` L163–181 saturates its vertical drift with `tanh(raw / DRIFT_MAX)`. The lateral driver gets the same law — **but under D11 it must cap only the slow component, or it would eat the swing the owner just bought.** Decompose the rate into its two parts and cap one:

```
X_slow(s) = α_slow · R · s                                  // monotone
X_fast(s) = (α_fast − α_slow) · R · ∫ (1 − V̂) ds            // the swing
X(s)      = X_fast(s)  +  X_MAX · tanh( X_slow(s) / X_MAX )
X_MAX     = 1.5 em × lineCount        // = the block's own height at leading 1.5
```

`tanh` is smooth and `∫(1−V̂)` is C¹, so `X(s)` stays C². The rule still reads as one sentence — **a paragraph may drift sideways by at most its own height** *while it is being read* — and the excursion at the edges is untouched. Display type is never capped (§C0: no return sweep, so lateral drift is free).

### B3. Where everything sits — ACT I (`#problem`, H = 4392 px @1280)

Layout offsets are the block's `y` inside the section. `p_full` = fully inside the reading area; `p_clip` = top reaches the header; `V` = the scroll window over which the block is fully legible.

| id | what | y₀ | y₁ | p_full | p_clip | **V** | strip-x compensation | screen lane at its moment |
|---|---|---|---|---|---|---|---|---|
| **G0** | ENTRY — the volume fades up out of the passage's black | 0 | 571 | — | — | — | — | net fills frame, full value |
| **M1** | **CHAPTER PLATE** (eyebrow + H2 + description) | 571 | 951 | 0.053 | 0.108 | **242** | +44 px | H2 left col 432 px, desc right col 480 px |
| **G1** | TRAVEL 1 | 951 | 1522 | — | — | — | — | net only, core **165** |
| **M2** | **ROW 01 · no evals** | 1522 | 1716 | 0.183 | 0.324 | **428** | +138 px | full-width display line, body 517 px measure |
| **G2** | TRAVEL 2 | 1716 | 2287 | — | — | — | — | net only, core **122**, link-fray begins |
| **M3** | **ROW 02 · no traces** | 2287 | 2481 | 0.357 | 0.498 | **428** | +221 px | as M2 |
| **G3** | TRAVEL 3 | 2481 | 3052 | — | — | — | — | net only, core **88**, stone first sighted at the right edge |
| **M4** | **ROW 03 · no boundaries** | 3052 | 3246 | 0.531 | 0.673 | **428** | +305 px | as M2 |
| **G4** | THE APPROACH — the stone crosses to centre | 3246 | 4089 | — | — | — | — | net only; stone 11 % → 43.5 % of viewport |
| **M5** | **THE WALL + the three callouts** | 4089 | 4392 | 0.767 | 0.909 | **315** | +424 px | callouts on the shard centroids |

**Copy occupies 1021 px of 4392 = 23.2 %. The other 76.8 % — 4.7 viewports — is wordless net.** That is the honest ratio and it is an owner call (§K-4). It is also what replaces the round-10 TRAVEL sub-window: the copy-free stretches are **layout**, not timers. Nothing stops; the alternation is spatial.

**The strip-x compensation column matters, and D11 changes what it compensates for.** Under a constant α a block authored at a fixed strip-x would land 424 px further left by the end of the act (`0.25 × 1920 × 0.883`). Under the windowed rate the accumulated `X_slow` is the same monotone term, so the compensation is unchanged in form: `strip-x = designLane + α_slow · 1.5W · p_plateau`, evaluated at the block's **plateau centre**. Each block therefore arrives in the design lane at the moment it becomes readable, and everything either side of that is the swing.

**The excursions, computed** (numerical integration of `∫α(s)·R ds` over each block's full visible life, `m = 0.12h`, α_fast 3.50; per-block detail in §C0):

| block | height | visible life | **plateau** | **total excursion @1280** | % of frame | of which, in the plateau |
|---|---|---|---|---|---|---|
| chapter plate (H2, α_slow 0.50) | 301 px | 923 px | 159 px | **823 px** | **64 %** | 35 px |
| a whole ledger row as one unit (α_slow 0.25) | 194 px | 816 px | 262 px | **610 px** | **48 %** | 29 px |
| `P-desc` IT, the longest paragraph | 120 px | 742 px | 334 px | **497 px** | **39 %** | 36 px |
| a two-line row body | 46 px | 668 px | 405 px | **383 px** | **30 %** | 44 px |

Compare the constant-α design this replaces: **100–121 px, 7.8–9.5 % of the frame**. The owner bought a **3.8–6.8× larger excursion**, and **92–96 % of it happens where the block is not being read**.

### B4. Where everything sits — ACT II (`#trust`, H = 4284 px @1280), mirrored

| id | what | y₀ | y₁ | p_full | p_clip | **V** | what the net does |
|---|---|---|---|---|---|---|---|
| **G0** | RE-ENTRY — the `services→production` seam opens the other way | 0 | 540 | — | — | — | nodes enter from the **left** |
| **M1** | **CHAPTER PLATE** | 540 | 889 | 0.039 | 0.103 | **273** | — |
| **G1** | TRAVEL 1 — gate 1 approach | 889 | 1429 | — | — | — | core **165**, and it never steps down |
| **M2** | **ROW 01 · eval baseline** | 1429 | 1672 | 0.222 | 0.311 | **379** | gate 1 (`RING_T` 0.25) compresses and releases |
| **G2** | TRAVEL 2 | 1672 | 2212 | — | — | — | `PACKET_RATE` 0.3 → 0.6 for the rest of the act |
| **M3** | **ROW 02 · trace propagation** | 2212 | 2455 | 0.348 | 0.493 | **379** | gate 2 (`RING_T` 0.5) |
| **G3** | TRAVEL 3 | 2455 | 2995 | — | — | — | no fray anywhere |
| **M4** | **ROW 03 · guardrail clamp** | 2995 | 3238 | 0.531 | 0.676 | **379** | gate 3 (`RING_T` 0.75), the longest compress |
| **G4** | THE OPEN END — no wall; the slab crosses to centre | 3238 | 3998 | — | — | — | slab 11 % → 43.5 % of viewport |
| **M5** | **THE SLAB + callouts + the closing disclaimer** | 3998 | 4284 | 0.765 | 0.910 | **336** | wavefront enters the ice, clamped ≤ 1.0 |

Copy occupies 1364 px of 4284 = **31.8 %**. Act II is deliberately denser: the answer is faster than the mess. Excursions are the Act I figures × `R_II/R_I` = ×1.025 (`T-H2` 843 px, a two-line why 393 px, the disclaimer 374 px).

### B5. The stone's path — rewritten against the VIEWPORT re-base

⚠ **The first draft of this section assumed the stone stays keyed to the band. It cannot.** `crystalConfig.ts` L385–500 carries the prepared change and its arithmetic:

> `slabPx = 3.32 · rect.h · CRYSTAL_SCALE · scaleMul`, and `rect` is `[data-lattice-anchor]`.
> band 725 px → 277 px ✓ · band 1330 → 508 · band 1475 → 563 · **band 4392 (this design's `#problem`) → 1677 px — 186 % of the viewport. The stone would be taller than the screen.**

The fix is one token in two places that must move together (`CrystalCluster` L499 and its projection twin L702): `rect.h` → `ih`. Two consequences the film depends on:

1. **`s` collapses to a constant** `WORLD_VIEW_HEIGHT · scale · scaleMul` = **1.0368 · scaleMul**. The stone becomes a fixed world size, independent of viewport, band and DPR — which is exactly what a thing living at `z = 0` in the net's plane should be.
2. **The size constant becomes `C_vp = CRYSTAL_SCALE · rect.h / ih = 0.115 · 725 / 900 = 0.0926`**, reproducing today's approved 276.8 px slab on the repo's reference 1440×900 canvas. ⇒ **slab = 3.32 × 0.0926 = 30.8 % of VIEWPORT height, at every viewport and every band, forever.**

**Hold pose, therefore:** 30.8 % of viewport = **222 px @720 · 249 px @810 · 260 px @844**; width is 2.789/3.32 of that = 186 / 209 / **218 px @390 = 56 % of the phone's width**, which clears the ≤62 %-of-width cap **without a phone-specific constant**. That is a second reason the viewport re-base is the cheap answer.

**The path.** α = 1.00 (unchanged — the stone lives at `z = 0` with the net), so it travels 1920 px per act @1280. `CRYSTAL_POS.x` is **width**-keyed and therefore safe. Authoring its strip-x at **2368 px**:

| p | screen x of its centre | height (% of **viewport**) | px @720 | `scaleMul` | read |
|---|---|---|---|---|---|
| 0.575 (G3→G4) | **1264 px** — right frame edge | **11 %** | 79 | **0.357** | **first sighting**, a shape entering, not an event |
| 0.767 (M5 enters) | 896 px | 24 % | 173 | 0.78 | it is coming at you |
| 0.900 | **640 px — dead centre** | **43.5 %** | 313 | **1.412** | the money shot |
| 1.000 | 448 px | **30.8 %** | 222 | 1.000 | still fully in frame when the act cuts |

**It never touches a lateral edge and never needs a clip.** But four things move with it and must not be forgotten:

- ⚠ **The approach ramp is new.** The shipped reveal ramp is `scaleMul` 0.8 → 1.0. This path needs **0.357 → 1.412 → 1.0**, a 4× swing. A dedicated ramp, not a re-tune of the existing one.
- ⚠ **`RIPPLE_FREQ` aliases at the first-sighting size.** Its ceiling is `px-per-unit ÷ 9.2`, and px-per-unit is `ih · C_vp · scaleMul` = 83.375 · scaleMul. At `scaleMul` 1.412 the ceiling is 12.8 (retuned carrier 8.0 ✓ clears); at 0.357 it is **3.2 — below 8.0, so the wet-ice relief aliases**. Fade `RIPPLE_AMP` to 0 below `scaleMul ≈ 0.9`; no relief is legible on an 11 % silhouette anyway. (Related, from the config's own note: viewport-keyed, the `RIPPLE_F2` gate's floor becomes `ih ≥ 794 px`, so a 768-tall window sits 3 % through the gate.)
- ⚠ **`CRYSTAL_POS.y` and the `a` scalar are band-keyed and both detonate.** `CRYSTAL_POS.y` +0.06 goes 44 px → 264 px; viewport-keyed equivalent **0.0483**. Worse, `a = (vpTop + rect.h/2 − ih/2)/ih` spans ±0.90 today and **±2.94 at a 4392 band, so the tumble runs to 355°** — the stone spins nearly a full turn — and `a` is also the axis `CALLOUT_VIS_WINDOWS` and `PLEXUS_CONNECT_WINDOW` are windows on, which is exactly the gating §C-M5 depends on. The config offers two options; **this design takes the second: measure `a` from the STONE's own viewport-sized window** (`a = (stoneScreenCentreY − ih/2) / ih`), which spans ±0.5 while the stone is on screen and restores both windows to their authored meaning. Under this film the stone finally has a well-defined arrival to measure against, which it did not have before.
- ⚠ **`FOG_RADIUS_Y` must move with the stone**: 0.311 → **`FRY_vp = 0.2505`**. If the stone goes viewport-keyed and the fog does not, the fog corner radius collapses 0.614 → 0.101 on its y-term and the stone sits entirely on the bright core — the round-8 §B4.2 "glowing blob" failure, back. `FOG_RADIUS_OUT` is width-keyed and is preserved automatically (`C_vp · ih ≡ CRYSTAL_SCALE · rect.h` at the reference, 0.3976 either way).

**What the re-base buys the film for free**, per the config's own audit: `pxScale` is unchanged, so the round-10 callout fit (`BROKEN_CALLOUT_SHARDS` [1,6,3], `HEALTHY_CALLOUT_ANCHORS`, `CALLOUT_LABEL_OFFSET_PX` 47) survives verbatim, and the three baked graph frequencies (`RIPPLE_FREQ`, `RIPPLE_AMP`, `SPARKLE_FREQ`) need no re-tuning at `scaleMul` 1.

### B6. THE IGNITION FRONT — the descending diagonal (D13), specified

The owner pictured elements entering top-right and leaving bottom-left. Geometry cannot give him that: with a downward scroll and no pinning, page content necessarily moves **up**, so elements enter bottom-right and leave top-left. (The brief that said otherwise was the coordinator's error, not the owner's — recorded so it is never re-litigated as an owner position.) **So the descending diagonal is carried by light instead of geometry.** The ignition front is a value field with no physical constraint on its direction, and it is now the thing the eye tracks. It has to be excellent.

**B6.1 · The axis.** Screen coordinates, `+x` right and `+y` **down** (CSS convention). The front travels along

```
f  = ( −cos 23.6° , +sin 23.6° ) = ( −0.9165 , +0.4003 )      // down-left
n  = f                                                          // the front line's unit normal
σ(px) = n · px − D(s)                                            // signed distance from the front
```

23.6° is not a free number: it is `atan(R)`, the same angle the reference plane's elements trace (§A). The front therefore runs **exactly perpendicular to the element paths**, which is what makes the two motions read as one system rather than two effects. In Act II both mirror: `f = (+0.9165, +0.4003)`, entering top-**left**.

**B6.2 · The crossing length**, from the frame corners' projections `n·px`:

| viewport | max (bottom-left corner) | min (top-right corner) | **crossing length** `0.4003h + 0.9165W` |
|---|---|---|---|
| 1440×810 | +324 | −1320 | **1644 px** |
| 1280×720 | +288 | −1173 | **1461 px** |
| 390×844 | +338 | −357 | **695 px** |

**B6.3 · The band, and its C¹ knee.**

```
w   = 0.15 × crossingLength         // half-width: 246 px @1440 · 219 px @1280 · 104 px @390
ign = smoothstep(w, 0, |σ|)          // 1 on the front line, 0 at ±w, C¹ at both ends
```

**Never a hard `min()`.** This is trap 11 verbatim: the project shipped a flat-topped wavefront once by clamping, and the correction was a C¹ soft knee. The same rule governs §B2's lateral rate. Two `smoothstep` knees, one law.

**B6.4 · The sweep, per gap.** Total travel = crossing length + 2w, so the band fully enters and fully exits:

| | @1280 | @1440 | @390 |
|---|---|---|---|
| travel per sweep | **1899 px** | 2136 px | 903 px |
| scroll available (Act I gap) | 571 px | 642 px | 669 px |
| **front speed** | **3.32 px per scroll px** | 3.33 | 1.35 |
| sweeps per act | **5** (one per gap: G0–G4) | 5 | 5 |

The front is the fastest thing in the film — 3.3× the reference plane — and it is allowed to be, because it is light and light has no depth to obey. That is the entire argument for carrying the descending diagonal this way rather than with geometry.

**B6.5 · What it does to values.** The front gates *which* nodes are eligible to light; it does not replace the shipped propagation. The ledger is unchanged from §I:

| `|σ|` | `ign` | per-sprite post-blend | blooms? |
|---|---|---|---|
| `≥ w` | 0 | **0.85** — the dark rest | **no** (threshold ≈ 1.0) |
| `0.855w` | 0.060 | **10.67** — today's shipped brightness, the shell edge | yes, faintly |
| `0` | 1.0 | **165** — the core (glow 1.9 × flash 3.4 × surge 1.6 × kiss 1.5 = ×15.5) | yes |

So the **visibly lit** band is ±0.855w = ±187 px @1280 around the front line, and inside it the shipped counts hold: **5–8 sprites above 1.0 at any instant** out of 103, and **no link ever blooms** — `LINE_LUM_MAX` 0.97 caps them below threshold by construction. The stars bloom, the lines stay crisp; that is the whole reference grammar and D13 does not touch it.

**B6.6 · How it reads against the existing propagation.** Two speeds coexist and must not fight:

- **The front** is *position*-driven (scrubbed off `p`), 3.32 px per scroll px, and owns **which** nodes may light.
- **The along-link surge** is *time*-driven (real-time, `SURGE_SPEED` 0.55 stage-units/s) and owns **how** the light travels between two already-eligible nodes: `mix(ignA, ignB, s)` with a travelling head.

The separation is clean and matches the shipped code shape. It also produces the read the owner asked for: a broad diagonal wash descending across the field, with fine light visibly *running down individual wires* inside it at its own speed. Stop scrolling and the wash stops but the surges keep running — which is exactly D8's "if the reader stops scrolling the page stops, because the reader stopped", with the field still alive.

⚠ **The one thing to watch.** The front crosses the reading lane on every sweep. During the gaps that is free (no copy on screen). During a copy moment the front is not sweeping — there is one sweep per gap, not per section — but its **tail** can still overlap a copy block at the gap boundaries. The mask handles it by value (§E) and the phasing should also handle it by timing: **align each sweep so the front's trailing edge clears `σ = −w` before the next block reaches coverage 0.5.** That is a phase constant, not a new mechanism, and it is cheap to get right.

### B6b. The net's dense regions, and the two quantities that must not be conflated

The net is a continuous field, not lobes, so "dense region" means *where the ignition is* — which §B6 now fully specifies. What remains here is the narrative value ladder and one arithmetic warning.

- **Value ladder** (survives the pivot verbatim): Act I steps **165 → 122 → 88** across G1/G2/G3 — a 2.6 dB drop per gap, the argument carried in the value world rather than in a caption. Act II holds **165** all the way and never steps down. Nobody will consciously notice the difference between the acts; everybody will feel that the second net is brighter, and it will be true by 88 vs 165.
- **`LINE_LUM_MAX` 0.97** keeps every link under the bloom threshold at all times. The stars bloom, the lines stay crisp. That is the reference grammar and nothing in D11 or D13 touches it.
- ⚠ **Two different quantities, both measured in screen widths.** The reference plane's **positional** run is **1.5 W per section** (D9). The ignition front's **illumination** travel is 5 sweeps × 1899 px = **9495 px = 7.4 W per act** @1280. They are not the same thing and must never be quoted interchangeably to the owner: the first is how far the world moves, the second is how far the light moves across it.

## C. THE MOMENT SHEET

The round-10 beat sheet is dead: beats implied stops. What follows are **moments** — positions in the strip, not windows in time. Nothing decelerates. Every number is the state at that scroll position; a reader who parks anywhere sees a shippable frame because nothing is mid-transition by construction (entrances are real-time GSAP fired on viewport entry and *finish*; they are not scrubbed).

### C0. The legibility budget, computed once and referenced by every moment

**The rate assumption, verified rather than inherited.** The mechanism dossier used "a sustained ≈1500 px/s" once, at `2026-08-22-round10-journey-mechanism.md:530`, with no derivation and no citation. **Verified: nothing in the corpus supports it.** What the corpus does supply, measured:

| rate | px/s | source |
|---|---|---|
| deliberate reading nudge | **~60** | one Chrome wheel notch ≈ 100 px, `wheelMultiplier: 1` (round-8 dossier §4 Lenis delta), one notch every ~1.7 s |
| the site's own comfortable travel | **~610 mean, ~900 peak** | `scroll-snap.ts` settle glide: `duration = min(1.05, 0.55 + |d|/2400)`, max travel 450 px ⇒ 0.74 s (round-8 dossier L78–79) |
| hard flick | **3000–6000** | round-8 dossier L230 |

So 1500 px/s is **2.5× the site's own glide mean** — a skim rate, not a reading rate. It is fine for reporting section durations, useless for legibility. Section durations, for the record: Act I 4392 px = **73 s @60 · 7.2 s @610 · 2.9 s @1500 · 1.5 s @3000**; Act II 4284 px = 71 s / 7.0 s / 2.9 s / 1.4 s.

**The reading-speed assumption.** Brysbaert's 2019 meta-analysis of 190 studies puts silent reading of English **non-fiction at ≈238 wpm** (fiction ≈260). ⚠ Cited from knowledge; **not fetched or verified in this session** — no web tool was available. Applied budget: **200 wpm** (a 16 % penalty for screen, dark-on-dark `--ink-mute` #8A94A6 at 15.2 px, and lateral motion), with **160 wpm** as the pessimistic case for the Italian, which runs 15–40 % longer word-for-word.

**The metric that actually binds, and why it is scroll-rate independent.** ⚠ **Revised for D11.** A block is *opaque and readable* only over its **plateau** — the scroll window where the window value `V̂ = 1`, i.e. where it is fully inside the band inset by `m = 0.12h` (§B2.1). Whatever the reader's speed, they cannot use more than the plateau, so the lateral drift they experience while reading is **at most `α_slow · R · plateau`** — a fixed number, and a *smaller* one than the constant-α design's `α · R · V`, because the plateau is shorter than `V` by `2m`. A reader faster than `plateau / T_read` simply does not finish, which is the same failure any page has and which the round-8 dossier already rules acceptable (L230: *"a visitor who flicks past copy has chosen not to read it. Accept it."*).

**Everything outside the plateau is unreadable by construction**, because `opacity = V̂` (§B2.4). At the frame edges the block is at `opacity ≤ 0.1`, where `--ink-mute` over `--bg` composites to **1.50:1** — below the 3:1 floor for any text at any size. **The copy is never legible and fast at the same time. That is the proof, not a mitigation.**

**The per-line tolerance.** The return sweep after each line targets the next line's start; it normally undershoots by 1–2 characters and is corrected by a small refixation. If the line start has moved `Δ` sideways during that line, the landing error grows by `Δ`. At body scale one character ≈ **0.5 em**. Budget, stated as engineering judgement anchored on saccade-landing behaviour rather than a measured study on this site:

| drift per line | verdict |
|---|---|
| ≤ 0.5 em | inside the normal undershoot noise — **free** |
| 0.5 – 1.0 em | one extra corrective saccade on some lines, ~25 ms each — **target** |
| 1.0 – 1.5 em | the sweep reliably needs correction — **ceiling** |
| > 1.5 em | line-tracking errors: re-reading a line, skipping a line — **fail** |

**Single-line blocks have no return sweep.** Their only requirement is that the word not leave the fovea inside one ~250 ms fixation. At 300 px/s and α = 0.50 that is 33 px of drift = 0.7 em at display scale. **Display type, labels, indices and arrows are therefore free at α = 0.50** and are never capped.

**The table.** Block heights are computed from the CSS token chain (font-size → line-height → measure → 0.50 em average advance for Switzer/mono, 0.48 em for the display serif), **not measured** — no browser was available this session. Treat line counts as ±1. `plateau`, `excursion` and `peak` come from numerical integration of `∫α(s)·R ds` at `m = 0.12h`, `α_fast = 3.50`, 40 000 steps.

⚠ **The constant-α table that stood here is SUPERSEDED by D11.** Its reasoning is worth keeping and is preserved in one line: at a flat α = 0.25 over the full `V`, the worst case was **1.50 em/line held there by the cap**, with **2.14 em/line uncapped** at 1440 on `T-desc EN`. The windowed rate improves every one of those numbers, because the reading window shrinks by `2m` while `α_slow` stays the same.

**`plat`** = plateau (opaque, readable) in scroll px · **`excur`** = total lateral excursion over the block's whole visible life · **`slowX`** = drift accumulated *inside the plateau* · **`em`** = drift per line before the cap · **`em*`** = after it.

**1280×720** — peak lateral rate **1.53 px/px (Act I) / 1.57 (Act II) = a 57° path**:

| block | ln | blk px | **plat** | **excur** | % of frame | slowX | px/line | em | cap | **em\*** |
|---|---|---|---|---|---|---|---|---|---|---|
| P-H2 (α_slow 0.50) | 5 | 301 | 159 | **823** | 64 % | 35 | 7.0 | 0.11 | 460 | **0.11** |
| **P-desc EN** | 4 | 96 | 357 | 460 | 36 % | 39 | 9.7 | 0.61 | 96 | **0.61** |
| **P-desc IT** | 5 | 120 | 334 | 497 | 39 % | 36 | 7.3 | 0.46 | 120 | **0.46** |
| P-row1-body EN | 3 | 68 | 383 | 418 | 33 % | 42 | 14.0 | 0.92 | 68 | **0.92** |
| P-row1-body IT | 4 | 91 | 361 | 453 | 35 % | 39 | 9.9 | 0.65 | 91 | **0.65** |
| P-row2-body EN | 2 | 46 | 405 | 383 | 30 % | 44 | 22.1 | 1.46 | 46 | **1.46** |
| P-row3-body EN | 2 | 46 | 405 | 383 | 30 % | 44 | 22.1 | 1.46 | 46 | **1.46** |
| T-H2 (α_slow 0.50) | 5 | 301 | 159 | **843** | 66 % | 36 | 7.1 | 0.12 | 460 | **0.12** |
| T-desc EN | 2 | 48 | 403 | 397 | 31 % | 45 | 22.6 | 1.41 | 48 | **1.41** |
| T-row1-body EN | 2 | 46 | 405 | 393 | 31 % | 45 | 22.7 | 1.49 | 46 | **1.49** |
| T-row2-body IT | 3 | 68 | 383 | 429 | 33 % | 43 | 14.3 | 0.94 | 68 | **0.94** |
| T-disclaimer EN | 2 | 34 | 417 | 374 | 29 % | 47 | 23.3 | 1.95 | 36 | **1.50** |

**1440×810** — same peak rate, longer plateaus, slightly more drift inside them:

| block | ln | blk px | **plat** | **excur** | % of frame | slowX | px/line | em | **em\*** |
|---|---|---|---|---|---|---|---|---|---|
| P-H2 | 5 | 339 | 191 | **928** | 64 % | 42 | 8.4 | 0.12 | **0.12** |
| **P-desc EN** | 4 | 104 | 418 | 513 | 36 % | 46 | 11.4 | 0.66 | **0.66** |
| **P-desc IT** | 5 | 130 | 393 | 552 | 38 % | 43 | 8.6 | 0.50 | **0.50** |
| P-row1-body EN | 3 | 68 | 452 | 459 | 32 % | 49 | 16.4 | 1.08 | **1.08** |
| P-row1-body IT | 4 | 91 | 430 | 493 | 34 % | 47 | 11.7 | 0.77 | **0.77** |
| P-row2/3-body EN | 2 | 46 | 474 | 424 | 29 % | 52 | 25.9 | 1.70 | **1.50** |
| T-H2 | 4 | 271 | 257 | **845** | 59 % | 57 | 14.4 | 0.21 | **0.21** |
| T-desc EN | 2 | 52 | 468 | 444 | 31 % | 52 | 26.2 | 1.51 | **1.50** |
| T-row1-body EN | 2 | 46 | 474 | 434 | 30 % | 53 | 26.5 | 1.75 | **1.50** |
| T-row2-body IT | 3 | 68 | 452 | 470 | 33 % | 51 | 16.9 | 1.11 | **1.11** |
| T-disclaimer EN | 2 | 34 | 485 | 415 | 29 % | 54 | 27.2 | 2.26 | **1.50** |

**390×844, at D12's constant-angle run (L = 2250 px = 5.77 W)** — peak rate 1.53 px/px, and note the excursions: **117–166 % of the frame width**, so on the phone the copy genuinely does exit completely to the left, which is more than the desktop achieves:

| block | ln | blk px | **plat** | **excur** | % of frame | slowX | px/line | **em\*** |
|---|---|---|---|---|---|---|---|---|
| P-H2 (α_slow 0.50) | 4 | 132 | 417 | **630** | **162 %** | 91 | 22.8 | **0.68** |
| P-desc EN | 5 | 108 | 439 | 534 | 137 % | 48 | 9.6 | **0.67** |
| **P-desc IT** | 7 | 151 | 398 | 600 | 154 % | 43 | 6.2 | **0.43** |
| P-row1-body EN | 4 | 81 | 465 | 493 | 127 % | 51 | 12.7 | **0.91** |
| P-row1-body IT | 5 | 102 | 446 | 524 | 134 % | 49 | 9.7 | **0.70** |
| P-row2/3-body EN | 3 | 61 | 485 | 462 | 119 % | 53 | 17.7 | **1.26** |
| T-H2 | 4 | 132 | 417 | **646** | 166 % | 93 | 23.3 | **0.69** |
| T-desc EN | 3 | 65 | 481 | 480 | 123 % | 54 | 18.0 | **1.25** |
| T-row1-body EN | 3 | 61 | 485 | 474 | 122 % | 54 | 18.1 | **1.29** |
| T-row2-body IT | 4 | 81 | 465 | 506 | 130 % | 52 | 13.0 | **0.93** |
| T-disclaimer EN | 3 | 50 | 495 | 458 | 117 % | 54 | 18.5 | **1.50** |

**Worst capped case at every viewport: 1.50 em/line — the ceiling, never crossed.** The cap is still required and still does real work: three blocks at 1280, five at 1440, one at 390 would otherwise exceed it, `T-disclaimer EN` worst at **2.26 em/line uncapped**.

**"Zero legibility cost" is an understatement, and here is the proof D11 asked for.** Constant α vs windowed α, same α_slow, same cap, drift per line **inside the reading zone**:

| block | constant α (superseded) | **windowed α (D11)** | change |
|---|---|---|---|
| P-desc EN @1280 | 0.90 em | **0.61 em** | −32 % |
| P-desc IT @1280 | 0.69 em | **0.46 em** | −33 % |
| P-row1-body EN @1280 | 1.33 em | **0.92 em** | −31 % |
| P-desc IT @1440 | 0.74 em | **0.50 em** | −32 % |
| T-row2-body IT @1440 | 1.36 em | **1.11 em** | −18 % |

The mechanism is simple: the reading window shrinks from `V` to `V − 2m` (a 29–36 % reduction) while `α_slow` is unchanged, so the drift a reader can possibly experience falls by the same proportion. **D11 buys a 3.8–6.8× larger excursion AND a ~32 % better reading budget.** The thing it costs is depth honesty on the copy layer (§B1.4), not legibility.

**The verdict the brief asked for, plainly.** *The longest body string in these two sections is the Act I chapter description, `P-desc`, at 38 EN / **46 IT** words and 221/275 characters.* (The brief's "over 50 words" is true of the **chapter plate as a co-resident unit** — H2 + description = 51 EN / 60 IT words, which arrive together and are read together; no single frozen string exceeds 46.) **It fits, with room, and D11 widened the margin: 36 px of lateral drift over its 334 px plateau, 7.3 px per line = 0.46 em @1280 (0.50 em @1440, 0.43 em @390)** — a third of the way into the target band, not merely inside the ceiling, and it never approaches its 120 px cap. The paradox is worth restating because it is still the design's best result: **the longest paragraphs are the safest ones**, because a taller block has a shorter plateau and more lines to spread the drift across. The blocks at risk are the *two-line* ones, and the cap fixes all of them.

**What it costs in reader behaviour — and this is the one place D11 makes things HARDER, so it is stated first.** The plateau is 29–36 % shorter than the constant-α design's `V`, so the reader has proportionally *less scroll* in which to finish. Two bounds, because the plateau is conservative: the block stays at `opacity ≥ 0.9` for a little longer than the plateau (`V̂ ≥ 0.9 ⇔ coverage ≥ 0.786`), and it is fully readable there.

| block | words | T_read @200 wpm | **v_max, plateau** | **v_max, opacity ≥ 0.9** | in wheel notches | v_max @160 wpm |
|---|---|---|---|---|---|---|
| **P-desc IT** | 46 | 13.8 s | **24 px/s** | **27 px/s** | one 100 px notch every 3.7 s | **22 px/s** |
| P-desc EN | 38 | 11.4 s | 31 | 34 | every 2.9 s | 27 |
| P-row1-body IT | 39 | 11.7 s | 31 | 34 | every 2.9 s | 27 |
| P-row1-body EN | 27 | 8.1 s | 47 | 50 | every 2.0 s | 40 |
| T-row2-body IT | 25 | 7.5 s | 51 | 54 | every 1.9 s | 44 |
| T-row1-body EN | 19 | 5.7 s | 71 | 74 | every 1.4 s | 59 |
| T-disclaimer EN | 16 | 4.8 s | 87 | 89 | every 1.1 s | 71 |

Constant α gave 36–123 px/s for the same blocks. **D11 costs roughly a third of the time budget and buys roughly a third off the drift budget** — it trades *duration* for *stillness*. Whether that is the right trade is a judgement about which failure the reader notices, and the answer is not close: a paragraph that slides while you read it is a defect the reader feels immediately, and a paragraph you have to scroll slowly to finish is a page you scroll slowly. **Stated honestly for the record: these sections are read by stopping, and D11 makes that more true, not less.** At the site's own 610 px/s glide a plateau passes in 0.55 s and nothing is readable — true of every page, and D8 explicitly licenses it: *"If the reader stops scrolling the page stops, because the reader stopped."*

### C1. ACT I — the moments

Frozen copy strings below are byte-identical to the working tree (§Copy freeze). Recipe cards are from `2026-08-21-lusion-text-dossier.md` and are unchanged; the round-10 cards **J1 (beat gate)** and **J2 (plate handoff)** are **dead** — there is no stage to hand off to, so entrances return to the shipped `createReplayTrigger` (`lusion-type.ts` L178–195), which is the Lusion `_needsReset` law and which already works.

---

#### **G0 · ENTRY** — `p 0.000 → 0.130` · strip-x 0 → 0.20 W · scene at −0 → −250 px

- **entering** nothing. The volume **fades up out of the flat page-navy** the singularity passage's `.seq-cover` left behind — the same `hsl(var(--bg))` value, so the beat boundary is invisible. This is the one act edge that is not an igloo seam, deliberately.
- **centred** the net, at the **dark rest**: `uJourneyRest` puts the un-ignited star at **0.85 post-blend, under the ~1.0 bloom threshold**. Zero pixels bloom. The dot-grid far wall rises from alpha 0 to its shipped `hsl(var(--ink)/0.05)` over `p 0.03–0.09`.
- **leaving** nothing.
- **the law** none yet. The first shell sweep arms at `p 0.09` and enters from the top-right.
- **copy** the eyebrow only, recipe **S1** (LabelScrambler, 40 chars/s, head 2, ASCII 33–125, refresh 1/15 s), at `p 0.075`:
  - EN `The demo-to-production gap` · IT `Il divario tra demo e produzione`
  - It rides α = 0.50 and sits where it sits today, top-left with its 24 px accent rule.
- **legibility** 3 EN / 6 IT words, one line, no return sweep. **Free.**
- **stone** absent (D3).

---

#### **M1 · THE CHAPTER PLATE** — `p 0.130 → 0.216`, legible `p_full 0.053 → p_clip 0.108`, **V = 242 px**

- **entering** from the bottom-right of the frame, on the 12.3° (H2) / 6.2° (description) paths.
- **centred** the plate in the left 62 % of the frame — today's `lg:grid-cols-[1fr_minmax(320px,30rem)]` grid, unchanged. H2 in the 432 px left column, description in the 480 px right column.
- **leaving** the net, streaming out of the left edge and dimming into the reading lane.
- **what lights** shell core **165** in the right two-thirds, 5–8 sprites over threshold, links capped at `LINE_LUM_MAX` 0.97. **Nothing changes when the copy arrives** — the mask, not the clock, owns the reading lane (§E). This is the single biggest simplification the pivot buys.
- **copy**
  - **H2, recipe H3** (SplitText words in line masks, y 115→0 over 1 s `--ease-lusion`, 0.025 s/word; x 200→0 trailing +0.4 s), α = 0.50:
    - EN `Most AI projects don&apos;t fail at the prototype.` + italic `--ink-mute` `They fail two months after.`
    - IT `La maggior parte dei progetti AI non fallisce al prototipo.` + italic `--ink-mute` `Fallisce due mesi dopo.`
  - **Description, recipe B3** (block fade + rise 30 px, expo.out, cascaded +0.5 s after the title), α = 0.25, 34 em measure, `data-drift="1.25"` retained:
    - EN `The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it.`
    - IT `La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto.`
  - **R2** (idle rollup, one random char per word every 2 s, y 0→−100 % over 1 s, delay `wordNorm·0.2`) runs while the plate is on screen. It is the cheapest thing that keeps a slow-scrolled frame from reading frozen, and it costs no page movement.
- **legibility** (D11 windowed) H2 **0.11 em/line**, 823 px of excursion of which 35 px in the plateau. Description **0.61 em/line EN, 0.46 IT** — the longest paragraph in the film, a third into the target band. Excursion 460 / 497 px. `v_max` 34 EN / 27 IT px/s at opacity ≥ 0.9. Peak lateral rate at the frame edges **1.53 px/px (57°)**, at `opacity ≤ 0.1`.
- **stone** absent.

---

#### **G1 · TRAVEL 1** — `p 0.216 → 0.346` · 571 px · **no copy on screen**

- **entering** the shell's leading edge, top-right corner.
- **centred** the sweep. `mix(ignA, ignB, s)` on the links with a travelling head at `SURGE_SPEED` 0.55 — the light visibly runs down the wires rather than fading in place.
- **leaving** the shell's trailing edge, bottom-left.
- **what lights** shell edge **10.67**, core **165**, 5–8 sprites over threshold, 194:1 range against the 0.85 rest. **This is "la rete che si illumina", and for 571 px it has the whole frame.**
- **copy** none.
- **stone** absent.

---

#### **M2 · ROW 01 · NO EVALS** — `p 0.346 → 0.390`, legible `p_full 0.183 → p_clip 0.324`, **V = 428 px**

- **entering** the display line on the 12.3° path, the body on the 6.2° path — they share `rowDriftK(0)` = 0.5 vertically (the round-11 pairing rule already landed in `problem-section.tsx:507/547`) and now share nothing horizontally: **the display line rides α 0.50 and the body α 0.25**, so the row separates into two depths as it crosses. That is the depth the row is *supposed* to have and it is currently flat.
  ⚠ **Check against D5.** The vertical pairing rule exists because a body slid into its own headline. The horizontal split does not re-open that defect — the collision was vertical and the cap here is horizontal — but the two drivers must not share a transform target. Enforce: **the vertical `[data-drift]` wrapper and the lateral wrapper are different elements.**
- **centred** display line full-width, body at the 517 px measure, hairline drawing `scaleX` from the left.
- **leaving** the net, dimming into the lane.
- **what lights** core **165**. Row ignition (`hover` / `:focus-visible` / touch centre-band) still fires `setHovered("broken", 0)` and recipe **Hv1** (chars x 0→1.5 em right-to-left, arrow into the vacated 1 em, 0.4 s, delay `(len+1−i)/100`) — unchanged, and now re-armed by the shipped viewport trigger rather than a beat gate.
- **copy** index `01·` settle · **CAUSE, recipe R1** (`RollLetters`, per-char column through a 1 em clip, yPercent −500→0, expo.inOut 1.25 s, cosine centre-out ±62 ms) · arrow `->` · **EFFECT, R1** on the solid amber word (`hsl(36 60% 72%)`, 10.7:1 on `--bg` — the sanctioned desaturated failure tone, no violet):
  - EN `No evals` → `no signal` · IT `Niente valutazioni` → `niente segnale`
  - **BODY, recipe B1** (SplitText words, opacity .1→1 + y 100→0, expo.out 1 s, 0.01 s/word), +0.3 s after the roll:
    - EN `A system you can't measure is a system you can't fix. Most teams ship without a regression set, then debug at 3am with prompt diffs and screenshots.`
    - IT `Un sistema che non puoi misurare è un sistema che non puoi correggere. La maggior parte dei team va in produzione senza un set di regressione, poi fa debugging alle 3 di notte con diff dei prompt e screenshot.`
- **legibility** display line: 1 line, no return sweep, **free** (610 px of excursion at α_slow 0.50). Body: 27 EN / 39 IT words, **0.92 em/line EN, 0.65 IT — both in the target band**; excursion 418 / 453 px; `v_max` 50 / 34 px/s at opacity ≥ 0.9.
- **stone** absent.

---

#### **G2 · TRAVEL 2** — `p 0.390 → 0.520` · 571 px · no copy

- **what lights** core steps to **122** — a 2.6 dB drop. The argument lives in the value world, not in a caption. The **link-fray** begins: links whose far endpoint lies past the fracture plane drop their tail alpha, so the corridor ahead reads as thinning wire.
- **stone** absent.

---

#### **M3 · ROW 02 · NO TRACES** — `p 0.520 → 0.564`, **V = 428 px**

- Same template as M2. Core **122** behind it.
- **copy** `No traces` → `no debugging` · IT `Niente tracce` → `niente debugging`
  - EN `When the agent makes the wrong call, you need to know which step failed. Without structured tracing, every incident becomes archaeology.`
  - IT `Quando l'agente prende la decisione sbagliata, devi sapere quale passo ha fallito. Senza un tracing strutturato, ogni incidente diventa un lavoro di archeologia.`
- **legibility** 21 EN / 23 IT words. EN 2 lines → 44 px in the plateau, **1.46 em/line**. IT 3 lines → 0.94 em/line. Excursion 383 / 429 px. `v_max` 62 / 57 px/s at opacity ≥ 0.9.

---

#### **G3 · TRAVEL 3** — `p 0.564 → 0.694` · 571 px · no copy

- **what lights** core **88**, the dimmest travel of the act. Fray at full: ~43 % of link length past the fracture runs the ember ramp (`EMBER_COLOR` #886a3d). Debris at `DEBRIS_ALPHA_MAX` 0.22.
- **stone** **FIRST SIGHTING at `p 0.575`, at the right frame edge (screen x 1264), 11 % of frame height**, fog quad at 0.22 × `FOG_OPACITY`. A shape entering, not an event. D3's "absence makes the first sighting an event" is preserved exactly, and the entry is now *lateral* rather than out of a vanishing point — which is better, because it is the same entry every other element in the film uses.

---

#### **M4 · ROW 03 · NO BOUNDARIES** — `p 0.694 → 0.738`, **V = 428 px**

- Core **88**. The stone is now a visible silhouette in the right third; the copy lane is untouched by it (`CRYSTAL_POS.broken` x = +0.17 of rect width, and the fog's inward falloff reaches 0 before the centre-line by `FOG_CLEAR` 1.0).
- **copy** `No boundaries` → `no trust` · IT `Niente confini` → `niente fiducia`
  - EN `Tools and data without a permission model become a liability the first time the agent does something a regulator notices.`
  - IT `Tool e dati senza un modello di permessi diventano un rischio la prima volta che l'agente fa qualcosa che un'autorità di vigilanza nota.`
- **legibility** 20 EN / 23 IT words, both 2 lines → 44 px in the plateau, **1.46 em/line**. Excursion 383 px. `v_max` 66 / 57 px/s at opacity ≥ 0.9.

---

#### **G4 · THE APPROACH** — `p 0.738 → 0.930` · 843 px · no copy · **the longest wordless stretch in the film**

- **entering** nothing new.
- **centred** the stone, crossing from screen x 896 to **640 — dead centre** — while growing 11 % → **43.5 % of viewport height** (`scaleMul` 0.357 → 1.412). The growth *is* the drama, but ⚠ it is **not** the shipped 0.8→1.0 reveal ramp — see §B5.
- **leaving** the net, still streaming left. The vanishing point closes: no node exists past the fracture plane, so the corridor visibly ends.
- **what lights** core stays **88**. The far half of the volume never lights at all.
- **the tumble** the stone unwinds its yaw as it reaches centre — igloo's own law, `rotation = k·(centered − progress)` with k = 11/14/6 by axis. **Everything that has been diagonal for four moments squares up for the verdict.** This is the only place in the film where the diagonal resolves, and it is why the diagonal is worth having.

---

#### **M5 · THE WALL AND THE METEORITE** — `p 0.930 → 1.000` · 307 px

| sub-position | p | what |
|---|---|---|
| impact | 0.930 – 0.952 | the wavefront reaches the fracture plane and **dies** |
| verdict | 0.952 – 1.000 | the stone settles, callouts draw, the world keeps sliding |

- **what lights** three events in 96 px: (1) **the flash** — leading nodes spike to **165** for ~120 ms then the whole shell collapses to **0.85** in 180 ms, and every node past the plane never lights again; (2) **the spark burst** — the shipped `SPARK` role, `SPARK_COUNT` 32, ember amber, ceiling at `DEBRIS_ALPHA_MAX`; (3) **the fray completes** — link tails past the plane cut cleanly, far endpoints drift off-station.
- **the stone** `/models/crystal-fractured.glb` (1114 tris, 8 pieces), the gap breathing outward once on impact and settling. Hold pose **30.8 % of VIEWPORT height = 222 px @720** (`3.32 × C_vp 0.0926`, §B5 — **not** 38.2 % of the band, which at a 4392 band would be 1677 px). Fog to full `FOG_GAIN 1.9 × FOG_OPACITY 0.55` ⇒ composited core lumLin **0.069**, body **0.055**, brightest pixel **0.25–0.45**, own range **7–8:1**, `clamp(col,0,1)` before alpha so **nothing on the stone blooms** except (owner decision, still open from round 10 §J-3) an optional hairline at `f1 ≳ 0.97`.
- **copy** no new strings. Two returns:
  1. **The three ghost callouts** (`.eyebrow`, 10 px, `text-ink-mute/80`, leader lines) carrying the existing effect strings — EN `no signal` / `no debugging` / `no trust`, IT `niente segnale` / `niente debugging` / `niente fiducia` — riding the shard centroids through the shipped `--callout-N-left/top` projection at α = 1.00, **gated to this moment only** (today they are visible for the whole band and have never actually been gated). Entrance: **S2** (igloo glyph-atlas scramble, leader draw 0.2 s → alpha 0.4 s → scramble 0.75 s, `ease:"none"`).
  2. **Row 03's plate** stays legible until `p 0.945`, then exits upward. The reader is never left with a wordless money shot they cannot place.
- **legibility** the callouts are one-line labels riding the stone at a **fixed** α = 1.00 — they are the one piece of copy in the film that is NOT windowed, because they are anchored to geometry rather than laid out in the strip (§B1.4: they stay honest parallax). 137 px of drift across the moment, no return sweep, **free**. But see §E — at α = 1.00 they are the **only copy in the film that rides the net's own rate**, which is correct (they are anchored to the stone) and which means they are the only copy the mask cannot protect. They sit on the stone, not on the net, and the stone's own value world is 7–8:1 with nothing over 1.0, so there is no bloom to smear onto them. `CALLOUT_LABEL_OFFSET_PX` 47 and the `CALLOUT_EDGE_MIN/MAX` (2…88) clamp are unchanged; the one clamp-pin residual noted at `crystalConfig.ts` L995 still applies and must be re-checked at the new anchor rect.
- **the act cut** the igloo seam `problem→case-studies`, already wired in `sectionStore.CUT_BOUNDARY_PAIRS`. **The world closes here (D2).** The stone does not follow you into `#work`.

### C2. ACT II — the moments

The same skeleton, mirrored, tighter, with one structural inversion: **where Act I's wavefront meets a wall, Act II's meets three gates and passes each one.** Gates at the shipped `RING_T = [0.25, 0.5, 0.75]`, re-expressed as planes along the traverse axis so they arrive on M2/M3/M4.

All figures @1280, `R_II` 0.448, D11 windowed. **excur** = total lateral excursion · **plateau drift** = what the reader actually experiences · **em/line** = plateau drift ÷ lines, after the cap.

| moment | p | copy (EN / IT), all frozen | recipe | words | lines | **excur** | plateau drift | **em/line** |
|---|---|---|---|---|---|---|---|---|
| **G0** RE-ENTRY | 0.000–0.126 | eyebrow `What production-grade actually means` / `Cosa significa davvero production-grade` | S1 | 4/4 | 1 | **395 px** | 97 px | **free** — 1 line, no return sweep |
| **M1** CHAPTER | 0.126–0.208 | H2 `Three things every SerSan system ships with,` + `--ink-mute` `<space>before we call it done.` / `Tre cose che ogni sistema SerSan porta con sé,` + `<space>prima di dirlo finito.` | H3 | 12/13 | 5 | **844 px = 66 % of frame** | 36 px | **0.12** |
| | | desc **(post-D4, two sentences)** `Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call.` / `Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping.` | B3 | 18/19 | 2 | **397 px** | 45 px | **1.41** |
| **G1** TRAVEL 1 | 0.208–0.334 | — | — | — | — | — | — |
| **M2** ROW 01 | 0.334–0.390 | label `eval baseline` / `baseline eval` (→ `--accent` on ignition) | R1 | 2 | 1 | **395 px** | 97 px | **free** |
| | | claim `Every system ships with a regression set.` / `Ogni sistema viene rilasciato con un set di regressione.` | H3 solid | 7/9 | 1 | **447 px** | 90 px | **free** |
| | | why `Versioned cases and day-zero baselines mean you can prove the system still works after every change, instead of hoping.` / `Casi versionati e baseline al day-zero ti permettono di dimostrare che il sistema funziona ancora dopo ogni modifica, invece di sperarlo.` | B1 | 19/21 | 2/3 | **393 / 428 px** | 45 / 43 px | **1.49 / 0.94** |
| **G2** TRAVEL 2 | 0.390–0.516 | — | — | — | — | — | — |
| **M3** ROW 02 | 0.516–0.573 | `trace propagation` / `propagazione trace` · `Traceable from input to action.` / `Tracciabile dall'input all'azione.` | R1 + H3 | 5/3 | 1 | **447 px** | 90 px | **free** |
| | | `When something breaks at 3am, the answer is in the trace: retrieval, plan, tool call, human review. Not in Slack archaeology.` / `Quando qualcosa si rompe alle 3 di notte, la risposta è nel trace: retrieval, plan, chiamata a tool, revisione umana. Non in un'archeologia su Slack.` | B1 | 21/25 | 2/3 | **393 / 428 px** | 45 / 43 px | **1.49 / 0.94** |
| **G3** TRAVEL 3 | 0.573–0.699 | — | — | — | — | — | — |
| **M4** ROW 03 | 0.699–0.756 | `guardrail clamp` / `clamp guardrail` · `Boundaries before features.` / `I confini prima delle feature.` | R1 + H3 | 3/5 | 1 | **447 px** | 90 px | **free** |
| | | `Data access and agent tools are scoped before the first feature ships. The default answer to an unscoped action is no.` / `L'accesso ai dati e i tool degli agenti vengono definiti prima della prima feature. La risposta di default a un'azione non prevista è no.` | B1 | 21/24 | 2/3 | **393 / 428 px** | 45 / 43 px | **1.49 / 0.94** |
| **G4** OPEN END | 0.756–0.933 | — | — | — | — | — | — |
| **M5** SLAB | 0.933–1.000 | callouts `eval baseline` / `trace propagation` / `guardrail clamp` (IT `baseline eval` / `propagazione trace` / `clamp guardrail`) | S2 | — | 1 | 137 px (**fixed α 1.00**, not windowed) | — | **free** |
| | | disclaimer `We do not claim compliance certifications we don&apos;t hold.` / `We do build systems that pass them.` — IT `Non rivendichiamo certificazioni di compliance che non possediamo.` / `Costruiamo sistemi che le superano.` | B2 (line masks, y 100 %→0, 0.6 s, 0.10 s/line) | 16/13 | 2 | **375 px** | **capped 36 px** | **1.50** |

**What the net does, act-specifically.**
- **G0** the volume fades up out of the `services→production` seam's trailing edge — a harder entry than Act I's, on purpose. Nodes enter **from the left**. Anyone who felt Act I's left-drift feels this as a return.
- **G1/G2/G3** shell core holds **165** all the way. Act I dimmed 165 → 122 → 88; nobody will consciously notice the difference and everybody will feel that this net is brighter, and it will be true by 88 vs 165.
- **at each gate** the wavefront **compresses against the plane for ~90 ms** on a C1 knee (never a hard `min()`), the gate's region-stars flash to **165**, and the wavefront **releases at full amplitude**. A held breath and a release. Gate 3 compresses longest (~140 ms) — a guardrail is the one that has to hold hardest.
- **G2 onward** `PACKET_RATE` 0.3 → **0.6**: the traffic on the wires becomes visibly denser once tracing exists. The only literal illustration in the film, and it earns its place because the claim is literally about propagation.
- **G3** the far end of the corridor is **open**. There is no wall. A reader who rode Act I registers the absence before they can name it.
- **M5** the wavefront does not die. Its last 0.15 frame-heights of travel happen **inside the ice**, so for ~200 ms the stone is lit from within by the signal that survived all three gates. Peak in-ice value stays under `clamp(…,0,1)` — the stone glows because the *fog* is up, not because the stone is a lamp. The `/models/crystal-intact.glb` slab (450 tris) holds at **30.8 % of viewport height** (§B5), the SERSAN mark reads inside the ice via the shipped screen-space projection (`93bb31d`), screen-upright, plexus connecting only in this moment (12 points, ≤24 lines, `PLEXUS_RADIUS` 1.45).
- **the act cut** `production→founders`, already wired. **The world closes.**

---

## D. ENTRANCES AND EXITS

⚠ **This section is rebuilt for D11. Under the constant α it concluded that "copy never reaches a lateral frame edge" and that the hard-clip question was moot. That conclusion is SUPERSEDED — it was correct arithmetic for a design the owner rejected.** Under the windowed rate the copy reaches the edge, and reaching it is the point.

**D1. Copy now DOES leave sideways — that is what the owner bought.** Excursions are 29–66 % of the frame at desktop and **117–166 % at 390**, so on the phone a block leaves the frame entirely to the left. The old figure was 100–121 px (7.8–9.5 %). The question the first draft dismissed is now the central one, and the answer is **not** a clip decision — it is the opacity coupling from §B2.4.

**D2. The rule: the clip is only ever permitted below `opacity = 0.10`.** At that alpha `--ink-mute` #8A94A6 composites over `--bg` #0B1422 to `L = 0.10·0.2935 + 0.90·0.00686 = 0.0355` ⇒ **1.50:1** against the page — far below the 3:1 floor for large text, let alone the 4.5:1 body floor. **A clip on a 1.50:1 element is imperceptible.** Measured, per block, tracking the left edge and the opacity together (strip-x compensated so the block sits in the design lane at plateau centre):

| viewport | block | left edge at `opacity 0.10` | at 0.05 | at 0.01 | fully out at |
|---|---|---|---|---|---|
| 1440 | row body | **+110 px** — clears by a wide margin | +106 | +101 | −52 |
| 1280 | row body | **+114 px** — clears | +110 | +104 | −32 |
| 1440 | chapter H2 (α_slow 0.50, 928 px excursion) | **−57 px** | −87 | −125 | −304 |
| 1280 | chapter H2 (823 px) | **−32 px** | −58 | −92 | −251 |
| 390 | row body | **−27 px** | −32 | −39 | −199 |
| 390 | chapter H2 | **−90 px** | −101 | −116 | −283 |

**Verdict: desktop body copy never touches the edge at any visible opacity** — it fades out with 110 px to spare and only crosses at `opacity < 0.01`. **Display type and all phone copy do cross while at ≤ 0.10**, i.e. at ≤ 1.50:1, which the rule permits. **This is a QA gate, not a proof**: screenshot the exit at each viewport and confirm nothing legible meets the clip.

⚠ **If it reads wrong, the lever is the opacity curve, not the rate.** `opacity = V̂^γ` with γ > 1 reaches 0.10 earlier in the ramp and therefore further from the edge; γ = 1 is the Lusion-faithful value (`opacity = Math.min(v, T)`) and is what the table above measures. **γ > 1 was not computed** — flagged, not solved. Lowering `α_fast` does **not** help: at 390 it moves the crossing only −27 → −16 px (α_fast 3.50 → 2.20) because the strip-x compensation re-centres the block, and it costs 33 % of the excursion the owner just approved. Do not reach for it first.

**D3. What else reaches a lateral edge, and what each does.**

| element | lateral excursion per act | edge treatment | why |
|---|---|---|---|
| copy blocks | 374–928 px desktop, 458–646 px @390 | **fade on the shared window** (§B2.4), clip only below `opacity 0.10` | one window drives rate + opacity; Lusion's own pairing |
| the net field | 1920 px (1.50 W) | **soft edge fade** over the outer 8 % of frame width, matching the shipped dot-grid ellipse mask | a field has no silhouette to clip; the round-7 §A.6 quad-edge hygiene rule forbids a hard edge |
| the ignition front | 1899 px per sweep | none — its own C¹ band (§B6.3) is zero at ±w, so it enters and exits at zero amplitude | seamless by construction |
| motes / beads | 2304 px | **respawn/wrap**, as shipped | already correct |
| the stone | 1920 px, authored so it **never touches an edge** (§B5) | none needed | a half-clipped stone is the worst frame in the film |
| the callouts | ride the stone at fixed α 1.00 | shipped `CALLOUT_EDGE_MIN/MAX` (2…88) clamp | already correct; the L995 clamp-pin residual must be re-checked, and note the guard band stops being meaningful at a 4392 band (2…88 % = 88…3865 px) |
| the dot-grid wall | 269 px | its existing ellipse mask | unchanged |

**D4. The hard rule, restated for D11.** *Nothing legible is ever allowed to meet a lateral frame edge.* Not "nothing with a silhouette" — the copy has a silhouette and it does meet the edge; what it must not do is meet it **while readable**. The section keeps its `overflow-hidden` (`problem-section.tsx:352`) as the clip of last resort.

⚠ **Mechanism flag**: `overflow: hidden` makes the element a scroll container, which changes `position: sticky` containment and can interact with `scroll-mt-24` anchoring. `overflow-x: clip` does neither. If the lateral wrapper needs its own clip, use `clip`, not `hidden`, and leave the section's existing `hidden` alone.

**D5. Entrances are unchanged from what ships.** The round-10 **J1 beat gate** and **J2 plate handoff** are both dead — there is no stage to arm against and no envelope to ride. Every entrance returns to the shipped viewport trigger (`lusion-type.ts` `createReplayTrigger` L178–195: arm on entry, `pause(0)` and restore the FROM pose on full exit, replay on re-entry — Lusion's own `_needsReset` law). Timelines run in **real time, not scrubbed**; that is what makes the type feel like choreography rather than a slider.

⚠ **D11 adds one interaction to get right.** The entrance recipes fire on viewport entry — which is now inside the *fast* phase, where `opacity = V̂ ≈ 0`. So the entrance plays while the wrapper is transparent and the reader sees the finished pose emerge as the window opens. **That is correct and is exactly Lusion's detail-page behaviour** (blocks fade in on `contentShowRatio` while their own cascade has already run), but it means the entrance choreography is *invisible* on a slow scroll and *simultaneous* on a fast one. If the owner wants the letter-roll to be seen, the entrance must arm on `V̂ ≥ ~0.3` rather than on viewport entry. **One threshold, flagged, not decided.**

## E. LEGIBILITY AGAINST THE NET, RESTATED FOR THE NEW GRAMMAR

The round-9-B result stands as physics: to clear WCAG AA the plexus must be at ~1 % over the reading column, which at 1280 floors ~70 % of the nodes. The round-10 answer was **time** — copy beats and travel beats were different beats. Under a continuous traverse **there is no copy-free moment inside a copy moment**, so time is gone. The new answer is **geometry**, and it is already shipped.

### E1. The instrument: a screen-space gate that TRACKS the copy

`neuralLatticeConfig.ts` L1636 already defines it:

```
gate  = smoothstep(uCopyEdge, uCopyEdge + uCopySoft, x)   // 0 → 1, local x
mask  = mix(COPY_MASK_FLOOR, 1, gate)                     // 1e-4 particles / 3e-3 lines
yTerm = mix(1, COPY_Y_FLOOR 0.6, bell(|y|, 0.18, 0.46))
```

`uCopyEdge` is written today from the measured `[data-row-body]` right bound + `COPY_EDGE_PAD` 0.035. **The only change the traverse requires is that it be recomputed per frame from the copy's known analytic offset instead of per resize.** No layout read is needed.

⚠ **D11 makes this harder in exactly one way and easier in another.** Under a constant α the offset was `X_MAX·tanh(α·1.5W·p/X_MAX)` — a closed form of `p` alone. Under the windowed rate it is `X_fast(s) + X_MAX·tanh(X_slow(s)/X_MAX)` where `X_fast` is an integral of a window that depends on **the block's own measured box** (`blockTop`, `blockHeight`) as well as `p`. So:

- **HARDER**: the gate can no longer be derived from `p` alone. It must be derived from the **same `α(s)` integral, for the same block, in the same frame** as the transform. Two independent re-derivations of "where is the copy" will not agree, because each depends on a measured box, and the disagreement is a live AA hole.
- **EASIER**: because both outputs come from one window, this is a *structural* requirement rather than a tuning one — satisfy it by computing the window once per block per frame and handing the same number to the transform, the opacity and the uniform. **If the gate is ever computed in a second place, that is the defect.**

**And this is the D6 proof, for the phase that matters.** In the reading plateau the net rides α = 1.00 and the copy α_slow = 0.25, so the net streams leftward past the copy at `(1.00 − 0.25) × R` = **0.328 px per scroll px** — 133 px of relative motion across a row's 405 px plateau. That relative motion is *exactly* the sensation of tracking sideways through a landscape while the near thing you are looking at stays put. In the fast phases the copy **overtakes** the net at `(3.50 − 1.00) × R` = 1.09 px per scroll px in the other direction — which is what makes the arrival read as a thing flying in, and which is the one phase where the DOM-over-canvas stacking is physically correct (§B1.4).

### E2. The guaranteed minimum separation, computed

Bloom onset requires the mask to reach `1 / 10.67 = 0.0937` (the star's post-blend shell-edge value against the ~1.0 threshold — `neuralLatticeConfig.ts` L1796). Inverting `smoothstep`: `3t² − 2t³ = 0.0937 ⇒ t = 0.184`, so the first node that can bloom sits at `uCopyEdge + 0.184 × COPY_RAMP_SOFT` = `uCopyEdge + 0.0184` band-widths. Adding `COPY_EDGE_PAD` 0.035:

| | 1440 | 1280 | 390 |
|---|---|---|---|
| shipped `uCopyEdge` (config table L1701–1708) | 0.0050 | 0.0637 | 0.4529 |
| copy right edge → gate edge (`COPY_EDGE_PAD` 0.035) | 50.4 px | 44.8 px | 13.7 px |
| copy right edge → **first node that can bloom** (+0.0184) | **76.9 px** | **68.4 px** | **20.8 px** |
| copy right edge → first **fully unmasked** node (+`COPY_RAMP_SOFT` 0.1) | **194.4 px** | **172.8 px** | **52.7 px** |
| nodes floored at that width | 60 % | 70 % | 97 % |
| mean node mask | 0.199 | 0.147 | 0.002 |

**These numbers are constant at every moment**, because the gate's lateral rate is defined equal to the copy's. That is the guarantee the brief asked for: not a minimum over a set of sampled moments, but an invariant.

### E3. The AA ledger, carried over

Nothing in the mask's *value* law changes, so round-9-B's measured contrasts hold verbatim, for `--ink-mute` #8A94A6 (rel-lum 0.2935) over `--bg` #0B1422 (lumLin 0.00686), AA budget ΔL ≤ **0.01943**:

| what | ΔL | contrast |
|---|---|---|
| star node centre, in the reading lane at floor 1e-4 | 0.00694 | **5.38:1** |
| link line, reading lane, floor 3e-3 | ≤ 0.00291 | — |
| pathological superposition (capped line + node centre + bead) | 0.0117 | **5.05:1** |
| bare page | — | 6.04:1 |
| with `uJourneyRest` at 0.85 post-blend instead of 10.67 | 5.5e-4 | **5.98:1** |

**All pass AA.** The dark rest is not required for AA — it is required so that *nothing blooms while copy is on screen*, because bloom is a post-process and smears past the mask's geometry. ⚠ **Unmeasured**: the bloom kernel's effective radius at a 10.67 source. The 68.4 px separation above assumes it is smaller than that; the config's own onset derivation makes the same implicit assumption. **Measure it before shipping** — it is one screenshot with a single lit node beside a copy block.

### E4. The second instrument, free and scroll-invariant: vertical lanes

**Because D7 forbids any vertical differential, copy and net descend at exactly 1:1. A vertical gap between them therefore never closes, at any scroll position, ever.** This is a stronger guarantee than the lateral one and it costs nothing to author.

It is what carries the phone (§G) and it is what makes the gaps work: during **G0–G4** there is no copy in the frame at all, so `uCopyEdge` can be driven to −1 (gate fully open) and the net runs at full strength across the whole frame. Act I gives the net **2556 px of copy-free frame out of 4392 (58 %)**; Act II **2380 of 4284 (56 %)**. The round-10 design bought the same thing with a pin; this one buys it with layout.

### E4b. The tracking tolerance, restated for a rate that is a function of position

The first draft gave a proportional-error tolerance: *"a 0.02 desync walks the lane 38 px off the text over 4392 px."* ⚠ **That model is SUPERSEDED.** Under D11 the copy's offset is bounded per block and resets every block, so a *proportional* rate error no longer accumulates across the section — it produces a lane offset of `ε × (that block's excursion)`, which at ε = 0.02 and a 460 px excursion is **9.2 px**, four times more forgiving than the constant-α case.

**What replaces it is a temporal tolerance, and it is much tighter.** A gate written one frame late lags the copy by `α(s) · R · v · Δt`. Against the §E2 bloom-onset margin:

| phase | α | lateral rate | scroll speed at which a **one-frame (16.7 ms)** stale gate exceeds the margin |
|---|---|---|---|
| reading plateau (body) | 0.25 | 0.109 px/px | **37 570 px/s** — unreachable; 6–12× a hard flick |
| reading plateau (display) | 0.50 | 0.219 px/px | 18 785 px/s — unreachable |
| **frame edges** @1440 (margin 76.9 px) | 3.50 | 1.53 px/px | **3010 px/s** — inside the flick regime |
| **frame edges** @1280 (margin 68.4 px) | 3.50 | 1.53 px/px | **2677 px/s** — inside the flick regime |
| **frame edges** @390 (margin 20.8 px) | 3.50 | 1.53 px/px | **814 px/s** — inside *normal* scrolling |

**So the exposure is entirely in the fast phases and entirely temporal**, and the phone is the exposed case: 814 px/s is an ordinary flick, and the round-8 dossier puts hard flicks at 3000–6000 px/s. Three notes on severity and the fix:

1. **The exposed copy is at `opacity ≤ 0.65`** and falling, and by the time the lag is worst it is under 0.10 (1.50:1). The visible defect is a blooming node behind a nearly-invisible moving headline — not an AA failure on read copy. **But WCAG does not ask whether you were reading, so it is still a defect.**
2. **The fix is free and is the same one §E1 already demands**: compute the gate from the same window in the same frame as the transform. Then Δt = 0 and the whole row of numbers above is void. It only becomes a real tolerance if an implementer measures the copy's position from the DOM instead of from the window — which is the thing to forbid explicitly in the mechanism dossier.
3. **Belt and braces, if the one-frame coupling cannot be guaranteed**: make the pad velocity-aware, `pad = COPY_EDGE_PAD + |ΔX_frame| / bandWidth`. It costs one extra subtraction and it is exact.

### E5. Display type is a different contract and it is generous

WCAG AA for text ≥ 24 px is **3:1**. Every display string in both sections is 30.4–92 px. For `--ink` #F5F7FA the background may rise to ΔL **0.26** before 3:1 breaks; for the `--ink-mute` italic spans inside the H2, to ΔL **0.058** — 3–13× the body budget. **Consequence, so an implementer does not over-engineer: display type may share the frame with the field; it may not sit on a star core** (an unmasked core is ΔL 5.53 even at the dark rest). The rule is compositional, not numeric — and the traverse creates the negative space for free, because the display line rides α_slow = 0.50 against the net's 1.00, so a core sitting behind a headline moves away at 0.219 px per scroll px in the plateau — and at **2.28 px per scroll px in the fast phases**, where the headline sprints past everything. Under D11 a display line can never be *parked* on a core at any scroll position: the only phase where it is slow enough to linger is the plateau, and the plateau is the phase the mask covers.

---

## F. THE TWO ACTS, AND THE SEAM

**Act I is the fracture; Act II is the answer.** The argument is one sentence: *a signal either survives the trip or it doesn't, and what decides is three artifacts.* In Act I you ride a pulse through a dark net that lights up around you; three failures name themselves as you pass — no evals, no traces, no boundaries — each one a reason the light gets dimmer (165 → 122 → 88); at the end the pulse hits a wall, dies in a flash of ember debris, and what you built is lying there cracked. The page then leaves the world for the interlude and re-enters from the other side, travelling the opposite diagonal: the same net, intact, the same pulse — but now three gates, and each one holds, and it comes out the far end into an intact slab of ice with the SERSAN mark legible inside it.

**The seam (D2).** The world **closes** on `problem→case-studies` and **reopens** on `services→production`; it closes again on `production→founders`. All three are already wired in `sectionStore.CUT_BOUNDARY_PAIRS`, already tuned, and no new boundary is needed. Act I's *entry* is deliberately not a seam — the singularity passage owns that edge with its own plunge, which ends on flat `hsl(var(--bg))`, and **G0 begins on the identical value**. The film starts before the section does. `data-emerge` (the plunge's zoom-in landing target) stays on the chapter block, which is where it already is and where the chapter still is.

⚠ **One number the seam should change.** The igloo cut's diagonal is `slope = −0.2 · aspect` (`2026-08-21-igloo-cuts-spec.md` §A, L32437), which at 1280 puts the wipe at **11.3° from horizontal on screen**. Our traverse axis is **66.4° from horizontal**. For the cut to run square to the traverse — which is what makes a seam read as *the end of a movement* rather than an unrelated wipe — the slope must become `tan(23.6°) × aspect` = **−0.437 · aspect**. That is one constant, `uWipeSlope`, and it is the cheapest thing in this document that makes the two acts rhyme.

**The mirrored heading** survives the pivot with its meaning intact and its mechanism simplified: it is now just the sign of the lateral offset. Act I negative, Act II positive. The yaw rotations of the round-10 design (−7.7° / +6.3°) are **retired** — a yaw on a laterally-tracking field costs fill rate and adds a second, competing diagonal. What replaces them, and does the job better: **bias the net's link topology along the traverse axis**, so the wires themselves lie on the 23.6° diagonal and the diagonal is legible even in a still frame. That is a `BAND_ASPECT`-adjacent change to the neighbour search and it belongs to the mechanism dossier.

**The meteorite (D3).** It is the Act I fractured slab. It arrives cracked, at the wall, in a dead volume. A meteorite is a thing that hit something. It is **absent for four of five copy moments** and first sighted at `p 0.575`, at the right frame edge, at 11 % of frame height. The Act II intact slab is the answer, not the meteorite.

---

## G. THREE VIEWPORTS

| | **1440×810** | **1280×720** | **390×844** |
|---|---|---|---|
| `--margin` / content width | 160 / **1120 px** | 160 / **960 px** | 32 / **326 px** |
| section heights (Act I / II) | 4941 / 4820 | **4392 / 4284** | 5148 / 5022 |
| ~~lateral run at the 1.5 W rule~~ | ~~2160 px, R 0.437, 23.6°~~ | ~~1920 px, R 0.437, 23.6°~~ | ~~585 px, R 0.114, **6.5°** — not a diagonal~~ |
| **lateral run — D12 APPROVED: hold the angle** | **2160 px = 1.50 W, 23.6°** | **1920 px = 1.50 W, 23.6°** | **2250 px = 5.77 W, 23.6°** |
| **peak lateral rate (D11 fast phase)** | 1.53 px/px = **57°** | 1.53 px/px = **57°** | 1.53 px/px = **57°** |
| **copy excursion, body / display** | 415–513 / 928 px | 374–497 / 823–843 px | **458–524 / 630–646 px = 117–166 % of frame** |
| worst body em/line (capped) | **1.50** | **1.50** | **1.50** (disclaimer; next worst 1.29) |
| shipped `uCopyEdge` | 0.0050 | 0.0637 | **0.4529** |
| copy right edge → first blooming node | 76.9 px | 68.4 px | **20.8 px** |
| nodes floored in the reading lane | 60 % | 70 % | **97 %** |
| stone hold pose (**viewport-keyed**, `C_vp` 0.0926) | **30.8 % of viewport = 249 px**, width 209 | **30.8 % = 222 px**, width 186 | **30.8 % = 260 px**, width **218 = 56 % of frame width** — clears the ≤62 % cap with no phone constant |
| callouts | 3, S2, leader lines | 3 | **hidden** (`max-sm:hidden` today; every string is duplicated in the row above — keep it) |
| plexus | 12 pts / ≤24 lines | 12 / ≤24 | **8 / ≤14** (fill rate) |
| fog | full | full | `FOG_OPACITY` ×0.8 |
| unit | `100vh` never used — there is no stage | — | **`svh` for any viewport-relative height**, the `singularity-passage` D-7 discipline: `vh` jumps when the address bar collapses |

### G1. The phone — D12 APPROVED: hold the angle, and the journey GROWS

**The phone's problem is the inverse of the desktop's.** At 390×844 the frame is *portrait* (aspect 0.462 vs 1.778), so 1.5 screen widths is only **585 px of lateral over 5148 px of vertical — a 6.5° path.** That is a ripple, not a diagonal. Meanwhile the legibility budget on the phone is *luxurious*, because the copy column is narrow (short lines) and the plateau is long.

**The owner ruled: the invariant is the angle, not the screen-width count.** Holding the desktop's 23.6° at 390×844 needs `tan(23.6°) × 5148` = **2250 px = 5.77 screen widths**. **Frame it correctly in every future discussion: this *grows* the phone journey by 3.85×. The screen-width count is an artifact of aspect ratio; the angle is the design.**

Measured against the D11 windowed budget at that run (α_fast 3.50, `m` = 101 px):

| block | lines | plateau | excursion | % of frame | plateau drift | px/line | **em/line** |
|---|---|---|---|---|---|---|---|
| chapter H2 (α_slow 0.50) | 4 | 417 | **630 px** | **162 %** | 91 | 22.8 | **0.68** |
| `P-desc` EN | 5 | 439 | 534 px | 137 % | 48 | 9.6 | **0.67** |
| **`P-desc` IT — the longest paragraph** | 7 | 398 | 600 px | 154 % | 43 | 6.2 | **0.43** |
| row body EN (4 ln) | 4 | 465 | 493 px | 127 % | 51 | 12.7 | **0.91** |
| row body EN (3 ln) | 3 | 485 | 462 px | 119 % | 53 | 17.7 | **1.26** |
| `T-disclaimer` EN | 3 | 495 | 458 px | 117 % | 55 | 18.5 | **1.50** (capped) |

**Every phone block is inside the ceiling and four of six are inside the target.** So the phone takes the full 23.6° at no legibility cost — and it is the **only** viewport where the copy genuinely satisfies D9's "exits completely to the left": excursions of 117–166 % of the frame width, against 29–66 % at desktop. The device the owner was most worried about is the one that delivers his brief most literally.

**Two phone-specific consequences of D11 that desktop does not have:**

- ⚠ **Every phone block crosses the left edge while still at `opacity ≤ 0.10`** (row body −27 px, H2 −90 px; §D2). At 1.50:1 that is imperceptible, but it is the one viewport where the exit must be screenshot-verified rather than argued.
- ⚠ **The tracking tolerance is 3.3× tighter than desktop**: a one-frame-stale gate breaches the phone's 20.8 px bloom-onset margin at just **814 px/s** (§E4b), which is an ordinary flick. The fix is the same — one window, one frame, one source — but the phone is where a sloppy implementation will actually show.

**And the phone gets a visible net for the first time.** Today `uCopyEdge` 0.4529 floors 97 % of nodes with a mean mask of **0.002** — the phone band is empty, and `neuralLatticeConfig.ts` L1720–1726 records that as a declared consequence, not a bug. Under this design the phone's copy occupies ~842 px of a 5148 px act (**16 %**), so for **84 % of the act there is no copy on screen at all** and the gate opens completely. The phone does not get a scaled-down desktop; it gets the *opposite* budget — less copy per screen, more net per screen, and the net at full strength. The ignition front sweeps 903 px per gap at 1.35 px per scroll px (§B6.4), which on a 695 px crossing is a full, unmistakable diagonal wash.

⚠ **The one unresolved sizing risk, carried from round 10 and still unresolved.** `BAND_ASPECT = 0.45` (`neuralLatticeConfig.ts` L247) is a build-time constant converting local x into height units for near-neighbour link distances. It was authored for the 619 px letterbox at 1280 (aspect 2.07 w:h). Any new anchor rect changes it, and a phone-portrait rect swings it by several times. **A cloud seeded against 0.45 will produce wrong neighbour sets on a phone — links either everywhere or nowhere.** This is a seeded-cloud decision, not a constant tweak, and it is not visible until it is on a phone. (It is one of the three band-keyed constants the `crystalConfig.ts` audit names; the other two, `CRYSTAL_SCALE` and `FOG_RADIUS_Y`, are solved in §B5.)

## H. REDUCED MOTION

`prefers-reduced-motion: reduce` — and no-JS, and SSR, and fx tier `"off"` — collapses the whole traverse to **exactly what ships today**, which is already correct and already tested:

- **No lateral offset and no window.** No transform on any wrapper, `X = 0` everywhere at every scroll position — and under D11 the window driver must not run at all, because it also writes **opacity**. A reduced-motion reader who got the window would get copy that fades in and out as it scrolls. **`opacity: 1`, `transform: none`, driver never mounted.**
- **No runway.** ⚠ **This is a real new constraint the mechanism agent must handle.** The +3062 / +2809 px exist only to buy traverse duration; under RM they would be 5871 px of empty page. The height must be applied on the `motionOk` branch only — the `.seq-static` pattern from `singularity-passage` (`if (!c.motionOk) return`). Both sections return to their current `section-lg` heights (1330 / 1475 px).
- **All copy settled and visible.** Chapter, description, three rows (index, cause, arrow, effect, body), hairlines full-width, closing disclaimer. No FROM poses baked into `className` (the D-10 rule): every hidden pose is primed by GSAP at arm time only, and GSAP never arms.
- **Zero timers.** No `R2` idle rollup, no `S1` scramble (LabelScrambler is already RM-aware), no drift ticker, no shell, no store bumps from the entrance path.
- **No canvas.** `CanvasHost` renders nothing at tier `"off"`. The band keeps the masked dot-grid and the `NeuralGraphFallback` SVG at its current letterbox height — a static, legible diagram of the same graph, healthy or broken.
- **Focus order unchanged.** Rows stay `tabIndex=0` in source order (index → cause → effect → body), the global `:focus-visible` ring applies, and the ignition CSS resolves to solid readable `--ink-mute` in every state.
- **The a11y win of the pivot**: with no sticky stage there is no `setPanelInteractive` / `inert` / `aria-hidden` dance, no plate that can overflow `100vh − header`, and no `data-lenis-prevent` fallback. **Five clauses of the round-10 a11y contract are simply deleted.** The copy is in normal document flow, which is the most accessible thing it can be.

---

## I. THE VALUE WORLD AND THE PALETTE

**Palette — blue / cyan / navy, never violet.**

| role | token / value | lumLin | where |
|---|---|---|---|
| page | `--bg` `#0B1422` | 0.00686 | everything sits on this |
| star / plexus | `PLEXUS_COLOR` `#D8F4FF` (`crystalConfig.ts` L1858) | — | nodes, links, beads |
| signal accent | `--accent` `#3BE1FF` | — | gate flashes, ignition, callout leaders |
| depth accent | `--accent-2` `#2A7FFF` | — | far-field wire, the vanishing point |
| fog | `CRYSTAL_FOG_COLOR` `#2E4A6E` (L1954) | 0.066 raw → **0.069 composited** | the stone's world |
| failure / ember | `EMBER_COLOR` `#886a3d` (L1524); display amber `hsl(36 60% 72%)`, 10.7:1 on `--bg` | — | **Act I only**: fray, debris, spark burst, the EFFECT words |
| type | `--ink` `#F5F7FA` / `--ink-mute` `#8A94A6` | 0.90 / 0.2935 | all copy |

**Per-moment value targets** (per-sprite post-blend; bloom threshold ≈ 1.0; **only emissive above 1.0 blooms**). The `shell core` column is the ignition front's peak from §B6.5, and the front's own C¹ band is what puts a node anywhere between the rest and the core:

| moment | field rest | shell core | sprites > 1.0 | stone | fog | anything blooming? |
|---|---|---|---|---|---|---|
| G0 / T-G0 | **0.85** | — | 0 | absent | 0 | **no** |
| M1 / T-M1 chapter | 0.85 | **165** (right two-thirds) | 5–8 | absent | 0 | stars, outside the lane |
| G1 | 0.85 | **165** | 5–8 | absent | 0 | stars |
| M2 | 0.85 | **165** | 5–8 | absent | 0 | stars, outside the lane |
| G2 | 0.85 | **122** | 4–6 | absent | 0 | stars |
| M3 | 0.85 | **122** | 4–6 | absent | 0 | stars |
| G3 | 0.85 | **88** | 3–5 | 11 % silhouette from p 0.575 | 0.22× | stars |
| M4 | 0.85 | **88** | 3–5 | 11–20 % | 0.22× | stars |
| G4 approach | 0.85 | **88** | 3–5 | 20 → **43.5 %** of viewport | 0.22 → 1.0× | stars |
| M5 impact | 0.85 | 165 for 120 ms, then collapse to 0.85 in 180 ms | ~9 → 0 | 43.5 → **30.8 %** of viewport | 1.0× | the flash + the spark burst |
| M5 verdict | 0.85 | — | **0** | **30.8 % of viewport (222 px @720)**, body 0.055, peak 0.25–0.45, range **7–8:1** | 1.0× | **nothing** (except the optional `f1 ≳ 0.97` hairline, still an open owner decision) |
| **Act II all gaps** | 0.85 | **165, never steps down** | 5–8 + gate flash | — / 11 % @G3 | 0 / 0.22× | stars |
| T-M5 arrival | 0.85 | in-ice, `clamp(…,0,1)` | 0 | 43.5 → 30.8 % of viewport | 1.0× | **nothing** |

**The two rules the round-8 measurement bought, restated so they cannot be lost:**
1. `clamp(col, 0, 1)` before alpha, igloo verbatim (bundle L38013). The stone's brightest pixel is **3.4×** its body, not 569×.
2. The stone's read comes from the **fog**, not from emission. A brighter object on black is a lamp; a 20 %-darkened copy of a lit fog is a mass. Every moment above keeps the stone body at ≈0.79× the fog around it (`2026-08-22-round8-stone-source-anatomy.md` §B4.1).

**What the pivot changes in the value world: almost nothing, and that is the point.** The round-10 design needed a "copy contract" — every sprite forced ≤ 0.85 while a plate was lit, because the plate and the net shared the frame in time. Under the traverse they share it in *space*, and the mask owns the lane, so **the net never has to dim for the copy**. The value ladder becomes a pure narrative instrument (165 → 122 → 88) instead of a legibility one. `uJourneyRest` is still wanted — for the dark-wire rest and to keep bloom off the type at the lane edge — but it is no longer load-bearing for AA (§E3: every case passes at the shipped 10.67 rest).

---

## J. WHAT THIS REPLACES IN THE TWO SHIPPED SECTIONS

| shipped today | verdict | detail |
|---|---|---|
| **The ledger rows** (3 per section: index, cause/label, arrow, effect/claim, body, hairline) | **KEPT verbatim, RE-SPACED** | Every string, every recipe (R1/H3/B1/Hv1), every hairline `scaleX`, `tabIndex=0`, the `:focus-visible` ring, the `ScrollTrigger start:"top bottom"` arm. What changes is only their **vertical spacing**: one row per ~1836 px of section instead of three rows sharing 619 px. |
| **The letterbox band** (619 / 672 px `[data-lattice-anchor]`) | **RETIRED as a letterbox, REPLACED by a full-height ribbon** | The anchor rect becomes the section's full height × full width, `isolation: isolate`, the field clipped by the section's existing `overflow-hidden`. The lattice's camera-lock math is untouched — it locks to whatever rect it is handed. ⚠ `BAND_ASPECT` 0.45 does **not** survive this (§G1). |
| **`useTextDrift`** (`data-drift`, k = 0.5 / `rowDriftK` 0.5–0.82 / 1.25, `DRIFT_SCALE` 0.12, tanh-saturated at ±24/±8 px) | **KEPT EXACTLY AS IS** | It is the vertical half of the depth cue and it is the thing that stops the horizontal differential reading as a flat slide (§B1-3). The round-10 warning that it would shear inside a sticky stage is **void** — there is no sticky stage, the blocks move with `scrollY` again, and the driver's own assumption is true. **The D5 collision fix (the pairing rule, already landed) stays.** The lateral driver must be a *different wrapper element* from the `[data-drift]` one. |
| **The ghost callouts** (`.eyebrow` spans + leader lines + `--callout-N-left/top`) | **KEPT, GATED** | Today visible for the whole band; now only on the stone moment (M5 / T-M5), with the **S2** scramble-in. This is what they were transplanted for and they have never actually been gated. |
| **The dot grid** (DOM radial-gradient, 26 px, ellipse-masked) | **KEPT, PROMOTED** | Becomes the far wall at α = 0.14. Its `background-position` also gets igloo's non-physical texture-scroll trick (`k3` dot layer runs `−uProgress·10` against the perlin's `·0.65`) — the cheapest depth cue in the entire reference. |
| **The plexus** (12 points, ≤24 lines, `PLEXUS_RADIUS` 1.45) | **KEPT, GATED** | Connect-enable moves to the stone moment only. Between stones igloo's plexus dissolves in 0.35 s; that is exactly right — it is the stone's atmosphere, not the section's. |
| **The crystal** | **KEPT, RE-PATHED, RE-BASED TO THE VIEWPORT** ⚠ | `CRYSTAL_SCALE` **0.115 is the correct committed value and stays**, but it is a fraction of the *band* and the band triples — band-keyed it renders **1677 px, 186 % of the viewport** (`crystalConfig.ts` L403). Apply the prepared change (`rect.h` → `ih` at `CrystalCluster` L499 **and** its projection twin L702, together): `C_vp = 0.0926` ⇒ **30.8 % of viewport height at every viewport and every band**, and `s` collapses to the constant 1.0368·`scaleMul`. Path per §B5: absent for four moments, first sighted at the **right frame edge** at `p 0.575`, dead centre by `p 0.90`. |
| **`FOG_RADIUS_Y` 0.311** | **RE-BASED WITH THE STONE** ⚠ | → **0.2505**. If the stone goes viewport-keyed and the fog does not, the fog corner radius collapses 0.614 → 0.101 on its y-term and the stone sits on the bright core — the round-8 "glowing blob" failure, back. `FOG_RADIUS_OUT` is width-keyed and needs nothing. |
| **`CRYSTAL_POS.y`** (−0.05 / +0.06 of rect h) | **RE-BASED** ⚠ | band-keyed the +0.06 offset goes 44 px → 264 px. Viewport-keyed equivalent **0.0483**. (`CRYSTAL_POS.x` is width-keyed and is safe.) |
| **The `a` scalar** (`(vpTop + rect.h/2 − ih/2)/ih`) | **RE-SOURCED** ⚠⚠ | spans ±0.90 today, **±2.94 at a 4392 band ⇒ the tumble runs to 355°**, and it is the axis `CALLOUT_VIS_WINDOWS` and `PLEXUS_CONNECT_WINDOW` are windows on — i.e. the gating §C-M5 depends on. Measure it from the **stone's own viewport-sized window** instead of the band centre. The worst of the three band-keyed detonations and the only one that needs a decision rather than a constant. |
| **The lateral window driver** | **NEW** (D11) | One per copy block: coverage → `smoothstep` → `α(s)`, `opacity`, and the `uCopyEdge` value, all from one evaluation per frame (§B2, §E1). Its wrapper is a **different element** from `[data-drift]`'s and from the entrance recipes' targets. |
| **The `RIPPLE_AMP` gate** | **NEW** ⚠ | fade to 0 below `scaleMul ≈ 0.9`: at the first-sighting size the carrier's px-per-unit falls to 29.8 and `RIPPLE_FREQ`'s ceiling to 3.2, below the retuned 8.0 — the wet-ice relief would alias on an 11 % silhouette. |
| **The fog quad** (`crystalFog`, `FOG_RADIUS_OUT` 0.203, `FOG_RADIUS_Y` 0.311, `FOG_CLEAR` 1.0) | **KEPT, RE-TIMED** | 0 during gaps, 0.22× on first sighting, 1.0× on the verdict. ⚠ **Re-derive both radii against the new anchor rect** — they were re-derived in round 10-A against the 619 px band and they will reach the frame edges on a taller rect, which is the "blocchi pagina" failure mode. |
| **The ripples** (`RIPPLE_FREQ` 12 / `AMP` 0.0385 / `WARP` 1.5) | **KEPT unchanged** | Material-level. The moiré fix (`587a795`) stands. `RIPPLE_FREQ`'s ceiling is `px-per-unit ÷ 9.2`; at 0.115 the carrier lands on 8.0 with 13.3 % margin (`crystalConfig.ts` L346) — unchanged, because the stone's on-screen size is unchanged. |
| **The section-cut seam** (`PostFXNodes` `uWipe` + `uWarpBurst`, `CUT_BOUNDARY_PAIRS`) | **KEPT, PROMOTED, ONE CONSTANT MOVED** | Three act edges already wired. ⚠ `uWipeSlope` −0.2·aspect → **−0.437·aspect** so the cut runs square to the traverse (§F). |
| **`data-emerge`** (the passage's zoom-in landing target) | **KEPT, UNMOVED** | Round 10 had to re-point it at the stage. There is no stage; the chapter block is still the chapter block; **no change**. |
| **`bump("broken")` / `bumpCluster("healthy", i)` / `productionPulseStore.bump()`** | **KEPT, RE-TIMED** | From section-level IntersectionObserver edges to per-row edges, so `bumpCluster(i)` fires as claim *i* lands — which is what its comment has always claimed it does. |
| **`useLedgerIgnition` + Hv1 + the ignition CSS** | **KEPT verbatim** | Hover / `:focus-visible` / touch centre-band all unchanged. |
| **Membranes** (`RING_T` discs) | already off since round 8 | no change |
| **Element snapping** | already deleted (round 8-A) | **do not re-introduce** |
| **`section-lg` height** | **CONDITIONALLY REPLACED** | 1330 → ~4392 and 1475 → ~4284 **on the `motionOk` branch only** (§H). |
| ~~`.seq-stage` sticky stage~~ | **DEAD** | D7 |
| ~~EXIT / TRAVEL / HANDOFF / HOLD~~ | **DEAD** | D8 |
| ~~J1 beat gate, J2 plate handoff~~ | **DEAD** | no stage to arm against; entrances return to `createReplayTrigger` |
| ~~yaw −7.7° / +6.3°~~ | **DEAD** | replaced by a topology bias along the traverse axis (§F) |

---

## K. OWNER DECISIONS

Each is a concrete either/or with a recommendation. None should be decided silently.

### ✅ RULED — K-1, K-2, K-3, K-5 came back in ADDENDUM 3 (D11–D13). The reasoning below is kept as the record of what was put to him and what this document recommended; the outcome is stated first in each.

**K-1 · ✅ APPROVED AS RECOMMENDED → D13.** The ignition front carries the descending diagonal, specified in **§B6**. The brief's "enters top-right, leaves bottom-left" was **the coordinator's error, not the owner's**. Original text:
**K-1 · The vertical sense of the diagonal — the one thing in ADDENDUM 2 that geometry contradicts.**
D9 says elements enter **top-right** and leave **bottom-left**. With a downward scroll and no vertical pinning, page content necessarily moves **up**: elements enter bottom-right and leave top-left. Getting the literal top-right → bottom-left path for a DOM block requires it to descend *faster* than the page, which is a counter-scroll lift and directly contradicts D7's "descends at completely natural speed".
→ **Recommendation: give him both, on the two things that should carry them.** The *elements* travel bottom-right → top-left (forced, 23.6° / 12.3° / 6.2°). The **ignition front** — a value field, not geometry, with no physical constraint at all — sweeps **top-right → bottom-left across the net**, at 23.6° from horizontal, once per gap. The thing the eye tracks is the bright thing, and the bright thing runs exactly the way he described it. Show him the two arrows side by side before building.

**K-2 + K-3 · ❌ RECOMMENDATION REJECTED → D11. The owner chose the WINDOWED rate (K-3's alternative), against this document's advice.** He saw the honest number — *the copy drifts 100 px, the net runs 1920* — and took the swing: **374–928 px of excursion at desktop, 458–646 px (117–166 % of the frame) at 390**, at a ~32 % *better* reading budget. He was told in the option text that a position-varying rate is not a depth but a scripted move, that it weakens D6 on the copy layer, and that on the lateral axis it is a cousin of the decelerate-to-read D8 rejects on the vertical. **That cost is written up in §B1.4 and must not be softened by a later reader.** Rebuilt in §B1–B2, §C0, §D and §E. Original text of both options:

**K-2 · How far the COPY visibly travels. This is the biggest expectation gap in the design.**
At α = 0.25 a body block's entire on-screen lateral excursion is **100–121 px at 1280 (7.8–9.5 % of the frame)**. The *net* runs 1.5 W as promised; the copy drifts. Three options:
- **(a) Lusion fractions as specced** — display 0.50, body 0.25. Worst case 1.50 em/line, longest paragraph 0.69 em/line. **The differential against the net is 4:1 for display and 4.8:1 against the near motes — right at Lusion's own widest (5:1 pane vs `x/5`).**
- **(b) Aggressive** — body 0.50, display 1.00. Copy excursion 200–242 px. Worst case **3.0 em/line — a fail**, and the longest paragraph at 1.8 em/line. Costs the copy its readability to buy 100 px of visible motion.
- **(c) Literal D9 for copy** — each block personally crosses the frame within its own on-screen life. Requires `α·R ≥ 1.78`, i.e. a **61° path and 6.1 screen widths of run per section — 4× his stated 1.5**. Body would then need a 14:1 differential against the net to stay legible; Lusion's widest is 5:1.
→ **Recommendation: (a).** And say the number out loud when showing it to him: *the copy drifts 100 px; the net runs 1920.* If he looks at it and says the copy isn't moving, the lever is α, it is one live-tunable number, and every 0.01 of it costs 2.5 px/line of reading error.

**K-3 · Constant α, or a windowed α that swings in and out?** — *(the windowed option won; the 555 px figure quoted here assumed a hard switch, and the C¹ window in §B2 delivers 383–823 px @1280 instead)*
A per-element lateral rate that varies with the block's screen position — fast while entering and exiting the frame, slow while it is in the reading zone — buys a **555 px excursion instead of 216 px** at α_outside = 3.0, with zero legibility cost. It is exactly what Lusion's `contentShowRatio` windows do. But a rate that changes with position is not a depth; it is a scripted move, and it is arguably the "decelerate-to-read" D8 rejects.
→ **Recommendation: constant α.** D6 is his own first decision and the thing that makes this read as a place rather than a slideshow; a scripted lateral ease is precisely what would make it feel like a parallax layer again. But this is a taste call and it is cheap to offer live.

**K-4 · ⏳ STILL OPEN — carried forward: ship 23/77 and judge live, as recommended.**
**K-4 · The copy-to-net ratio.**
As mapped, Act I is **23 % copy / 77 % wordless net** (4.7 viewports of net per act) and Act II **32 % / 68 %**. That is a lot of nothing if the net's events do not carry it. The alternative is to tighten the gaps (say 400 px instead of 571) and let the sections be shorter than D10's figure — but D10 is approved and the brief forbids shrinking it unilaterally.
→ **Recommendation: ship 23/77 and judge it live.** The gaps are where the net finally gets a whole frame at full brightness, which is the thing he has been asking for since round 6. If it reads empty, the lever is the gap length, not the section height.

**K-5 · ✅ APPROVED AS RECOMMENDED → D12.** Hold the angle: 23.6° everywhere, **5.77 screen widths at 390**. §G1. Original text:
**K-5 · The phone: 1.5 screen widths, or the constant angle?**
1.5 W at 390×844 is **585 px = a 6.5° path — not a diagonal**. Holding the desktop's 23.6° needs **2251 px = 5.77 screen widths**, and the phone legibility budget absorbs it with room (worst case 1.30 em/line, three of four blocks inside the target).
→ **Recommendation: constant angle, 5.77 W on the phone.** Frame it to him correctly: this *grows* the run on the phone. The angle is the invariant; the screen-width count is an artifact of aspect ratio.

**K-7 · NEW, raised by D11 — does the entrance choreography need to be seen?**
The entrance recipes (H3 letter-rise, R1 letter-roll, B1 word-wave) fire on viewport entry, which under D11 is inside the fast phase where `opacity ≈ 0`. So the choreography plays behind a transparent wrapper and the reader sees the finished pose emerge as the window opens — which is Lusion's own detail-page behaviour, and arguably the more elegant read. Either **leave it** (the type *arrives*, it does not perform) or **arm the entrances on `V̂ ≥ ~0.3`** so the roll is visible as the block settles.
→ **Recommendation: leave it in stage 1**, then show him both. The letter-roll is the single most-admired effect on the site and he may well want to see it; but arming on the window couples two systems that are currently independent, and that is a cost worth paying only if he asks.

**K-6 · Carried forward from round 10, still open, still his:**
- **J-3** — does the stone keep a hairline of bloom (`f1 ≳ 0.97`), or is it igloo-faithful with nothing over 1.0 and all glow from the fog? *Recommendation: the hairline. Show both on the dev handle.*
- **J-7** — spend the legibility headroom (mask floor 1e-4 → ~1.5e-3, a faint visible mesh behind the reading column at 5.0:1) or spend none (5.98:1, net absent behind copy)? *Recommendation: none in stage 1, then show him both.* Under the traverse this is a more attractive offer than it was, because the mask lane now **sweeps** — a faint mesh behind the words would be a mesh in motion, not a static texture.

---

## Copy freeze — verification

Every string in this document was checked with `grep -F` against the working tree this session. Result: **all present, count 1, byte-identical**, with the single authorised exception.

- `problem-section.tsx` — 10/10 strings verified, including the two HTML-entity forms `Most AI projects don&apos;t fail at the prototype.` and the accented Italian.
- `production-grade-section.tsx` — 17/17 verified, including `We do not claim compliance certifications we don&apos;t hold.` and the **leading-space** `--ink-mute` spans `" before we call it done."` / `" prima di dirlo finito."`.
- **The D4 cut has already landed in the working tree** (`production-grade-section.tsx:448–449`). The description now reads, in both locales, the two-sentence form used throughout §C2:
  - EN `Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call.`
  - IT `Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping.`
  - `Open a panel to see why it matters.` / `Apri un pannello per capire perché conta.` is gone, as authorised. **No other copy change is authorised.**
- ⚠ **Preserve the source form, not this document's form**, when touching the files: the two `&apos;` entities and the leading spaces inside the `--ink-mute` spans are real characters in the JSX.

---

## Caveats / Not found

- **The D11 revision's numbers are numerical, not measured.** Every `plateau`, `excursion`, `peak` and left-edge-at-opacity figure comes from integrating `∫α(s)·R ds` and tracking `V̂` over 40 000–200 000 steps at `m = 0.12h`, `α_fast = 3.50`, `α_slow` 0.50/0.25. They inherit every block-height assumption below, so they carry the same ±1-line uncertainty.
- **`m = 0.12h` and `α_fast = 3.50` are chosen, not derived.** `m` is a comfortable reading inset (86–101 px) and `α_fast` is the value that lands the excursion in the range the owner was shown. Both are live-tunable and both were picked to satisfy the two hard constraints (worst em/line ≤ 1.50, and the clip below `opacity 0.10`) with margin. **A different pair could satisfy them too; nothing proves this pair optimal.**
- **The opacity exponent γ > 1 was not computed** (§D2). If the exit clip reads badly at 390, that is the first lever and it needs one integration run, not a redesign.
- **The ignition front's band half-width `w = 0.15 × crossing length` is a design choice, not a measurement.** It produces a lit band of ±187 px @1280 and a front-to-band ratio that reads as a sweep rather than a wash. Nothing was measured against the shipped shell's current thickness, because the shipped shell is depth-gated and this one is not.
- **The per-moment sprite counts (5–8 above 1.0) are the shipped, already-approved figures**, carried over. The front's own value law was NOT re-derived against the multiplicative ignition chain (glow × flash × surge × kiss); §B6.5 states the three anchor values and the read, and leaves the chain to the mechanism dossier where it belongs.
- **No live measurement was possible this session.** No browser, no dev server, no screenshots. Every block height and line count in §C is **computed from the CSS token chain** (font-size → line-height → measure → an assumed 0.50 em average advance for Switzer and JetBrains Mono, 0.48 em for Editorial New), not measured. Treat line counts as **±1 line**; a +1 line error moves a block's `V` by one line-height (~23 px) and its em/line by ~15 %, which does not change any verdict but does change the third digit of every number in the table. **Re-measure with `getClientRects()` before implementing.**
- **The section heights (1330 / 1475) and the page height (21459) are inherited**, from the coordinator's 1280×720 measurement recorded at `2026-08-22-round10-journey-mechanism.md` §1.1. Not re-measured.
- **Reading speed is cited from knowledge, not fetched.** Brysbaert 2019, ≈238 wpm for English non-fiction silent reading. No web tool was available in this session to verify it. The applied 200 wpm budget and the 160 wpm pessimistic case are engineering judgement on top of that figure.
- **The per-line drift tolerance (0.5 / 1.0 / 1.5 em) is engineering judgement**, anchored on return-sweep landing behaviour (undershoot of 1–2 characters, corrected by a refixation) and on one character ≈ 0.5 em at body scale. **It is not a measured threshold and no study of horizontally-drifting text was consulted.** If the owner reports that lines feel slippery, the budget is the thing to re-derive, not the design.
- **The bloom kernel radius is unmeasured** (§E3). The 68.4 px separation guarantee assumes it is smaller than that. One screenshot settles it.
- **`BAND_ASPECT` 0.45 against any new anchor rect is unresolved**, carried from round 10 and still the largest sizing risk in the design. It needs a seeded-cloud decision. The two sibling band-keyed detonations — `CRYSTAL_SCALE` and `FOG_RADIUS_Y` — are solved in §B5 from the prepared block in `crystalConfig.ts`; the `a` scalar is *proposed* (measure from the stone's own window) but not validated against `CALLOUT_VIS_WINDOWS`' authored numbers, which is a real gap.
- **`NEURAL_DEPTH_SCALE_FACTOR` was not inspected.** The `crystalConfig.ts` audit names it as the third band-keyed constant that detonates and notes it lives in another file. This document does not cover it.
- **Sound is not specified.** The round-10 storyboard's "sound of it" lines are deliberately not carried forward: no audio system for these sections was inspected, and re-keying them to moments would be invention.
- **The `#services` interlude is untouched by this document.** It is its own pinned POV-pan runway (`SEGMENTS` 4 × `SEGMENT_VH` 0.85) and D2 keeps the world closed across it. Two stages competing for one frame remains the mess it was.
- **Not analysed here** (mechanism half): the uniform/binding budget for a lateral journey parameter, WebGL2 fallback shader cost at a full-section fill rate, `AdaptiveResolution`/DPR behaviour when the anchor rect grows ~7×, the `PostFXNodes` `uWipe` retiming, and whether the lateral wrapper's `will-change: transform` on a 4392 px-tall element creates a layer the compositor refuses.

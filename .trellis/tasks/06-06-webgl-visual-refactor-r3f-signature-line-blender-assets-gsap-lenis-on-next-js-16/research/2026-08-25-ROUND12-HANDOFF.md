# ROUND 12 — HANDOFF. What actually shipped, 2026-08-25.

One session. Seven commits, `35130a5` → `0d3be99`, on top of `cc10138`. Read this
before touching the neural sections; read `2026-08-25-ROUND12-PLAN-FORWARD.md` for
what is still owed.

---

## 0. THE SHORT VERSION

The two "neural" sections were five clusters stacked down the page behind a 23.61°
traverse. They are now **one continuous horizontal net, ~3.79 frames long, at 45°,
made of curved particle filaments that ignite as the signal passes.** The copy
ignites from scroll instead of from the pointer. Three long-standing lies in the
code were measured and corrected, and one of them had been shaping design decisions
for months.

**Nothing is finished.** The merge, the meteorite, the camera and the river's own
look are all still owed — see the plan document.

---

## 1. THE ELEVEN OWNER DECISIONS (`35130a5`)

Full text: `2026-08-22-round10-OWNER-DECISIONS.md`, ADDENDUM 4. All taken on drawn
ASCII options, in Italian, with the cost stated before the choice.

| id | decision |
|---|---|
| **D14** | "si compone" = the net BUILDS ahead of the reader, not merely scrolls past |
| **D15** | the traverse goes **23.61° → 45°** |
| **D16** | UNLATCHED — scrolling back up dismantles it |
| **D17** | **ONE band, exactly frame height, the whole lateral run.** The vertical ladder is dead — it IS what he read as "tre pezzi" |
| **D18** | the look returns to the August "signal stream" river, over today's real topology |
| **D19** | **REVERSES D2** — `#trust` moves under `#problem`, one continuous passage |
| **D20** | the mark appears TWICE: lit inside the opening meteorite, sealed at 6% in the Act II slab |
| **D21** | everything scroll-driven; the pointer goes inert on the neural sections |
| **D22** | *(later REVERSED by him — see §5)* the crisp chord stays under the river |
| **D23** | both densities built, chosen live |
| **D24** | packet beads shrink 10.3 → 4.6 px |

Two corrections against our own earlier claims are recorded there too: the angle
was **never** a term in the coverage arithmetic (the lateral cull does not bind
until ~62°), and the drift cap shipped at **twice** the authored law.

---

## 2. THE THREE THINGS THE CODE WAS LYING ABOUT

Each had been quoted as fact in the corpus and in code comments for months. Each
turned out to be wrong when someone finally measured it.

### 2.1 "12/12 UBO blocks, zero headroom" — never measured, and wrong

Counted by patching `shaderSource` and loading `?backend=webgl2`:

| stage | claimed | actual | after index packing |
|---|---|---|---|
| particle VERTEX | 12/12 | **11/12** | **10/12** |
| particle FRAGMENT | never published | **9/12** | **8/12** |
| line VERTEX | 8/12 | **7/12** | **6/12** |

three emits exactly **two** shared groups here (`object`, `render`) — there is no
`frame` group, and the "≤3 shared groups" term in every earlier note was assumed.
**The plexus arrays are read by the FRAGMENT stage too**, so a new `uniformArray`
costs a block in *both* stages. This claim had been used to reject designs.

### 2.2 The sprite px ledger is **12× too large**

    S_css = NEURAL_POINT_SIZE · sizeK / CAMERA_Z          CAMERA_Z = 12

`buildVertex` computes a **device**-px diameter and divides by camera distance.
Every "px" in the config's sprite ledger was 12× the delivered CSS px. Measured:
the shipped link dust was **0.283 CSS px** at 3.95 px spacing — about 1.3 lit pixels
on an 84 px link. **Nothing in this repo had ever been a particle-drawn line.**

This also explains `f6cac67`, which killed particle links in August, live, with the
owner watching, because at 7.5 and then 10 they "became CHAINS OF GLOWING BLOBS":
the team was compensating a 12× unit error by eye, and at that size a disc is a
bead. **The idea was never wrong. The units were.**

### 2.3 The copy mask was a wall, not a shadow

`copyGateAt` is a 1-D wall in x: everything within `laneHalfPx + COPY_EDGE_PAD` of
the tracked column floored to 1e-4 **at every y**. Measured: **1408 px of a 1920 px
frame — 73% of every frame, for the whole act.** It went unnoticed for as long as the
cloud was narrower than the frame and could translate out from under it. The ribbon
is wider than the frame and cannot, so the frame went black — while every instrument
reported healthy.

---

## 3. WHAT SHIPPED, COMMIT BY COMMIT

### `c50351d` — the reading unit is wired, and the cap was twice its own law

`opWin` / `opTop` / `unitSpan` had sat behind a 31-line spec comment, initialised
once with a placeholder, **never assigned and never read**; `windowAt` was imported
with zero call sites. Live at 1920×935, scrollY 8246: the headline "02· No traces"
rendered at **opacity 0.011** with its own paragraph at **1.000**. Now 0.523/0.523.

Separately `capPx = blk.h` against a centred antisymmetric `xSlow` gives
`2·capPx·tanh(·)` — a **3.0 em/line** ceiling against an authored 1.5. Fixed to
`blk.h/2`. Display type is no longer assumed to be one line (measured: two of three
ledger headlines wrap at 390).

### `7914c8c` — the edge tables pack into one array

`uEdgeA`+`uEdgeB` merged into one `uniformArray(Vector4[])`, packed `a + 1024·b`.
19.7–21.9 KiB **each** → **4.92 KiB total**, 30% of the 16 KiB min-spec floor.
`uniformArray(Vector4[])` was unexercised in this repo; it compiles and renders on
the WebGL2 fallback (44 shaders, 0 errors). Codec proven exhaustively over all 2^20
index pairs. Clock-frozen screenshot diff: the packed build differs from HEAD on
**0.330%** of pixels while a *third HEAD run* differs on **0.447%** — closer to HEAD
than HEAD is to itself.

### `4fcad56` — the generator takes arguments, and grows a ribbon

24 constants become per-build parameters defaulting to today's values; a
`shape: "ellipsoid" | "ribbon"` arm where the ribbon is a rect fill. The stretched
ellipsoid over the same long field swings **9.2–12×** in 20-bin x-density; the rect
fill swings **1.11–1.24×**. Three silent failures closed with loud guards: the
`a*1024+b` dedup key **drops** edges above 1024 nodes; `PLEXUS_EDGE_CAP` would have
truncated ~1250 links to 250; and the WRAP_SNAP invariant is **unsatisfiable** on a
long field because `POINTER_PUSH` is a local-units force. Default path verified
byte-for-byte across 156 configurations at 17 significant digits.

### `581a174` — the vertical ladder is dead

−685/+401. `fitTraverseLadder`, the pitch bounds, `leadVh`, `tailPin`,
`MAX_TRAVERSE_ISLANDS`, the four extra DOM anchors, the ISLAND LADDER CSS,
`plexusSeed`/`plexusWell`/`primary`/`strictCull`, `anchorLive`/`buildGate`, the
`compensate` branch and the lateral cull — all gone.

**The plan was refused in one place and it was right to refuse it:** it specified
the global re-centring as `xScenePx − dir·R·secH/2`; measured, that is a **531 px**
jump of the stone against a gate asking for one. The anchor centre was kept, with
both numbers in the docstring, and swapped later in `0d3be99` when the ribbon made
it correct. Stone lateral at ten sampled p: **0.00 px** changed.

Also: the Stage 0 reading-unit fix had a **cliff** — below a threshold viewport
height it silently switched pairing off and the tear returned. It now degrades
continuously (`k = min(1, bandH/unitH)`), residual tear exactly `(1−k)` of the
un-paired tear: **9 px where HEAD tore 192**.

### `73cf085` — the copy ignites from scroll

See §4.

### `0d3be99` — the ribbon, and the net stops being made of glass

See §5.

---

## 4. THE TYPE (`73cf085`)

The owner's symptom, verbatim: *"attualmente la freccia sposta la scritta a destra se
passo il cursore, mentre dovrebbe essere con lo scroll."* Cursor parked on row 02,
same scroll: the arrow goes **63 px → 0**, and sweeping the pointer across every
on-frame row leaves `data-lit`, the transform and all three computed colours
bit-identical.

The number already existed and was being discarded: the traverse picks the winning
block every frame from its one frozen `scrollY` and kept only the value. Published as
`frame.laneRow`, consumed through a new `data-lit` attribute (**not** `data-focus` —
that has an owner and they would fight on touch). `useIgnitionWave` changed by zero
lines.

Three defects, all found by measuring:

- scoping the hover fallback by id (specificity 1,4,0) **beat** the reduced-motion
  neutraliser (0,3,0), so under RM the hovered row still painted ignited;
- `data-scroll-lit="true"` shipped in the **server HTML**, so a no-JS client got
  markup with hover scoped off and no scroll source to replace it;
- `rollArmed` as a `useGSAP` dep double-registered the entrance context — and fixing
  it closed the standing defect where the letter-roll fired while its wrapper was
  still transparent (now starts at opacity 0.26, not 0.00).

Kept: keyboard focus still ignites and outranks scroll; hover survives wherever the
traverse never arms (narrow window, downgraded phone, flag off).

---

## 5. THE RIBBON AND THE CURVES (`0d3be99`)

**The field.** `nodeAt()` gains one map — `x = u·uFieldLen + uFieldOrigin`,
`y = v + uFieldSlope·x` — on three plain `uniform()` scalars, so zero UBO blocks, and
identity `(1,0,0)` is bit-exact for `#production`. Band height → a full viewport. The
stone rides the field as a fraction of its **length**, so "first sighted late"
survives at every viewport. An authored exit fade was added because the net's screen
y is constant in `p` by construction and would otherwise stop dead centre of frame at
`p = 1`.

**The black frame** — §2.3. The mask now has a ceiling and a sill and floors only
across the tracked reading unit: mask median at the on-frame nodes **1e-4 → 0.691**.
`copyYAt` also moved off the across-ribbon coordinate — constant *along* a 45° ribbon,
so it was a diagonal stripe 637 px off the copy — onto a re-centred screen y. Plus:
`fieldWritten` was a value-only guard never reset on rebuild, so after any rebuild the
field stayed **unmapped**; the ribbon lever was one-way because the rebuild routed
through **two React commits inside the Canvas island**, the exact dependency that
island forbids; and the WebGPU depth attachment was allocated at the 300×150 canvas
default before R3F applied `setSize`.

**THE OWNER REVERSED D22.** *"no, la linea sotto nitida non ci deve essere. sono le
particelle che si illuminano in movimento che fanno la linea illuminata."* The chord's
removal is specified in `2026-08-25-round12d-*` and **has not been built** — see the
plan.

**Then he diagnosed the real problem, and he was right:** *"sembra piu una struttura di
vetro che una rete neurale, troppi angoli simmetrici e retti. la rete neurale e curva,
non sono linee rette. inoltre dimezza i nodi."*

Every link had always been a **straight chord** between two node centres, and straight
segments meeting at a point are a truss. No particle sizing fixes a topology drawn in
straight lines. Each link is now an arc:

    p(s) = mix(A, B, s) + perp · amp · 4s(1−s)

- `4s(1−s)` is zero at both ends, so the link still lands **exactly** on its nodes.
  The topology is untouched; only the route curves.
- `amp` is a signed per-link fraction of chord length, **saturated** at 0.042 local —
  un-capped, the longest links (4× the shortest) loop over their neighbours.
- the bow plane is rolled by a second hash but only **±34°**: a free 2π roll reads as
  a ball of wire, and dendritic tissue is broadly laminar.
- `dir` is now the analytic **tangent** of the arc, so the braid cross-section, the
  fray and the velocity streak follow the curve instead of cutting its corner.
- the line layer rides the identical expression and the same hashes — it already had
  six vertices per edge and was simply told to draw a straight chord through all of
  them.

Plus what the eye asked for: nodes **389 → 193** (links 370), particles
**33 990 → 16 864**, sprites **2.8 → 4.2 CSS px**, resting alpha **0.20 → 0.125** (the
first pass read as fibre optic, not tissue), and a **dendritic taper** — full width at
both somata, 0.62 at mid-span, on the same profile the arc rides, because a
constant-width tube is the strongest "drawn by a computer" cue left once the path
curves.

Every bend constant is ribbon-only through the build-time `RIB` ternary.

---

## 6. CONTRACTS THAT HELD THROUGHOUT

- `src/webgl/SignatureLine.tsx` — **zero lines changed** in every commit.
- `#production` — `{101, 229}`, checksum **−420.464007**, byte-for-byte.
- SVG twin `{32,53}`/`{36,62}`; lite `{54,111}`/`{56,110}` (the lite arm now builds
  the ribbon **by design** — the phone is where the void was worst).
- **Copy freeze**: zero string-literal changes; `src/data/translations` zero diff.
- `npx tsc --noEmit` clean at every commit. Both backends compile and render.
- No violet. Blue/cyan/navy plus the sanctioned amber (hue 36).

---

## 7. THINGS A FUTURE SESSION SHOULD NOT REPEAT

1. **Do not trust a geometric instrument to tell you the screen is not black.**
   `cost.onFrame` is a cull result (a field × 1e-4 is "visible"); `centreScreenY()`
   samples one column and a 45° ribbon reads `ih/2` there and 960 px off frame at the
   edges; `frameGaps()` reduces nodes to their across-distance, which is invariant
   along the ribbon. All three were green on a black frame. Use `frameCoverage()` /
   `mute()` and a PNG luminance census.
2. **`uReveal` gates the whole field and lands late.** Screenshot before
   `__sersanScroll.getState().reveal === 1` and you measure an empty frame.
3. **Hiding the `<canvas>` to diff is not an instrument** — it removes the signature
   line and changes page compositing.
4. **The repo is NOT 100% CRLF.** 95 of 224 `src` files are LF at HEAD. This was
   asserted as a hard rule all session and it is not true; `core.autocrlf=true` makes
   it harmless.
5. **`getBoundingClientRect()` returns the TRANSFORMED box.** It cost a P0 earlier in
   this task and, this session, a wrong threshold measurement that reached the owner
   (305 px against the true 264).
6. **HMR does not rebuild the WebGL island.** Cold-restart or clear `.next/cache` or
   you will debug a stale shader.
7. **Never route an island rebuild through React commits.** It made the ribbon lever
   one-way and left the field unmapped.

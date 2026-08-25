# ROUND 12 — THE PLAN FORWARD. What is still owed, 2026-08-25.

Companion to `2026-08-25-ROUND12-HANDOFF.md`. HEAD is `0d3be99`. Everything below
is either an owner instruction not yet built, or a defect measured and left.

**The owner's own checklist, as he last restated it, with status:**

| | | status |
|---|---|---|
| 1 | the two sections become one | **owed** — D19 decided, nothing built |
| 2 | diagonal horizontal scroll, one net | **done** (`0d3be99`) |
| 3 | the net is particles: links of particles, neurons of particles | **partly** — curved and thickened, but the crisp chord is still under it |
| 4 | it lights up as you scroll, like a signal passing | **owed** — the birth front is not built |
| 5 | the copy must not obscure the net | **partly** — the wall became a sill; the balance is his call |
| 6 | 3D camera effects like the hero | **owed** — never scoped |
| 7 | the meteorite shatters and recomposes | **owed** — D20 decided, blocked (§3) |
| 8 | type animated by scroll, not cursor | **done** (`73cf085`) |

---

## 1. REMOVE THE CHORD — the owner reversed D22 and it has not been built

> *"no, la linea sotto nitida non ci deve essere. sono le particelle che si
> illuminano in movimento che fanno la linea illuminata"*

The full recipe is already written: `2026-08-25-round12d-particle-line-SPEC.md`,
with `…-particle-budget.md`, `…-particle-mechanism.md`,
`…-what-the-chord-carried.md` and `…-august-postmortem.md`.

**The two-regime law it is built on:**

    REST (structure, always present):  S_css / s_css ≥ 1.65   comb spacing, NOTHING blooms
    LIT  (the travelling signal):      S_axial / s   ≥ 6.0    where accumulated luminance crosses 1.0
    accumulated A = 0.624 · P · S_axial / s

A thin line made of **above-threshold** sprites is arithmetically forced to read as
beads: the bloom highpass acts as a blob detector on every core peak, and a halo is
~5× its own diameter, so the halo carpet fuses long before the cores do. The escape
is already in `buildVertex`: it scales **only `corner.x`** and `vQuadUv` is the
unrotated quad, so a sprite stretched **along its own path** is a streak, not a
bead. That is the whole of "si illuminano in movimento".

**Four structural fixes to land first** (they are worth more than any extra
particle):

1. **F1 — the link-length metric.** `lens` in `seedBuffers` may already be
   re-metricated by `0d3be99`; **verify**. Raw `hypot` on plexus coords against a
   topology chosen in the screen metric differs by exactly 7.784× — the ribbon's own
   stretch — and spacing spreads 0.34 → 60.5 px. **Now also needs the ARC length,
   not the chord**, since `0d3be99` bent the links.
2. **F2 — stratify the flow phase.** `offA[i*3]` is a hash, giving a Poisson train
   that needs `S/s ≥ 6.0` just to look smooth. A comb — `(edgeFill − 0.5)/perEdge`
   — needs only 1.65. **Worth 3.6× in particle count on one line.**
3. **F3 — `speedVar` per LINK, not per particle**, or F2's comb shears back into
   Poisson within seconds.
4. **F4 — narrow the per-particle size spread.** Partly landed (1.15/0.75).

Plus: `Discard(alpha.lessThan(vCut))` crops today's dust to 0.71× nominal; and
`lessThan` → `lessThanEqual` at both discard sites or a fully-faded field
rasterises at full fill forever.

**Keep the chord behind one module constant** (`LINE_LAYER`). He has reversed this
decision once already today, and `…-what-the-chord-carried.md` lists what the chord
provides that the particle layer must replace or honestly lose.

**Honest costs to state, not hide:** the phone fits only at the edge of its budget,
and if a GPU capture fails there the fallback is keeping the chord on the phone
only — a different grammar on mobile, declared. And reduced-motion / no-JS / tier
"off" mount **no canvas at all**, so the SVG twin remains the one surface drawing
crisp continuous lines. That divergence cannot be closed in WebGL.

---

## 2. THE BIRTH FRONT — D14 + D16, not built

The net must **build ahead of the reader** and, unlatched, dismantle when he
scrolls back up. `2026-08-25-round12c-birth-front.md` has the mechanism.

- `uReveal` **saturates 262 px before `p = 0`** and is constant for the whole act —
  it is the wrong clock, and it must keep its current meaning (it arms the recycle
  snap and drives the coalesce). The front is a **new** scalar.
- Six plain `uniform()` scalars: zero blocks, zero varyings, zero storage. Phase is
  `nodeT`, already baked and already bound in both stages.
- **The trap that must be in the first diff:** `cut` must carry every factor
  `alpha` carries, or the link dust pops in at `born = 0.333` instead of fading.
- **Birth is VALUE-ONLY.** Touching the anchor trips `WRAP_SNAP_DIST` and the
  coalesce becomes a permanent teleport — and it would look smooth on WebGL2 and
  popped on WebGPU.
- **`uBuild` comes from the frozen frame, never `uFlowTime`** (which does not
  rewind — D16 forbids it). A slew limiter via `MathUtils.damp` is allowed; a
  `Math.max(prev, next)` latch is not, and would silently reverse D16.
- The river's phase-staggered wavefronts **are** this front when driven by the same
  scalar. Build them together; they are one mechanism, not two.

---

## 3. THE METEORITE — D20 decided, and blocked by a one-line bug

The owner's latest phrasing: *"il meteorite, che si frantuma e si ricompone"*,
earlier *"si apre e dentro il logo sersan con qualche effetto di luce"*. Treat as
one arc: it shatters, the mark is inside, it recomposes.

### The blocker, and it must be fixed first

**The meteorite cannot close today.** `crystalBuild.ts:1133-1137` gives every shard
a **constant** spin about its own centroid, `aRand.z · 2π`, independent of the gap
and non-zero at gap 0: the eight shards sit at 17 / 49 / 8 / 255 / 279 / 68 / 208 /
239 degrees even when "closed". Driving the gap to zero does not recompose the slab
— it produces an interpenetrating tangle. (Side finding: today's hover "recompact"
has therefore never actually recompacted anything.)

**Fix: one line, zero new uniforms** — multiply the spin angle by the opening
scalar, so a closed stone has every piece in the orientation it was cut in and the
partition tiles the slab exactly.

### Then the reveal is nearly free

- The mark becomes a real mesh — the **same 552-triangle shared geometry** already
  loaded at `RouteHeroLogo.tsx:62-102` — mounted in the **camera-locked** group,
  never in the tumbling mesh (which reaches 55° and would make it unreadable).
  `renderOrder −3.5`, between fog (−4) and crystal (−3).
- **The reveal costs no shader work at all**: the ice is 0.94 opaque, so a shard in
  front of the mark passes 6% and a shard that has moved passes 100%. The opening
  *is* the reveal.
- Scale **0.921 at vertical offset −0.50** keeps it fully inside the ice.
  **Blender is NOT needed.** At scale 1.0 / offset 0, 46 of 468 vertices poke out of
  the top bite, so the offset is not optional.
- Bloom: base ~0.65 on cyan `#3BE1FF` gives luminance 0.40 (under the gate); full
  opening ~2.0 gives 1.24 — so it blooms **only at the peak**.
- Driver: the same centring scalar the copy and net already ride. Scroll back and it
  re-closes. **Note the corrected span: `a` covers about ±0.93, not ±2.49** — the
  band is anchored to viewport height, not section height.
- **The amber ember shares the volume.** Amber light behind a cyan mark is a brand
  read, not a bug; cross-fade it on the opening scalar.
- D20 stands: the mark appears **twice**, lit inside the opening meteorite and
  sealed at 6% in the Act II slab.

---

## 4. THE MERGE — D19 decided, nothing built

`#trust` moves directly under `#problem`. Mechanically 3 moved lines in
`src/app/page.tsx:55-78`. Everything that breaks breaks downstream:

- **Three of five `CUT_BOUNDARY_PAIRS` stop being adjacent and VANISH SILENTLY** —
  `sectionStore.ts:233-239` requires literal adjacency and `:270-271` drops a
  non-adjacent pair with a bare `continue`: no warning, no console, no type error.
  Rewrite them by hand.
- **The mirrored heading dies.** Opposite `dir` on now-adjacent bands produces
  ~818 px of visible slip where they overlap; `dir` must become uniform.
- The value step 88 → 165 becomes **+5.46 dB in frame** — the interlude used to hide
  it. Death and rebirth now happen on camera, which is the upside.
- **Deep links `/#trust` land mid-argument**, and the hero's "see the work" jump
  skips the whole passage.
- `routeCurves.ts` needs **4 sign flips** to keep the signature serpentine.
  `SignatureLine.tsx` still changes by zero lines.
- `#trust` is still only **1.78 vh tall** and must grow to roughly Act I's 5.7 vh
  before the traverse has a runway — the other half of D10's page-height bill,
  unpaid.
- The two bands are **different heights** (0.8599 vs 0.8193 vh) and must both become
  frame height.
- **Unresolved and first to settle:** ONE field spanning both sections, or two
  frame-height fields butted at an invisible seam. Two fields butted badly recreate
  exactly the "due pezzi" he is complaining about. `#trust`'s `bandY` is **0.724 vh**,
  below the old `leadVh` — which is why the old ladder could never have been
  generalised to a second band.
- The acts are structurally **symmetric** (8 drift blocks, 3 ledger rows each), which
  is what makes one continuous field across both plausible.
- `scroll-ignition.ts` runs `#trust`'s reading-band law locally under id
  `"trust-type"`. If the merge gives `#trust` a real band, that becomes a one-line
  switch to `{ bandId: "production", source: "traverse" }`.

---

## 5. THE CAMERA — new, never scoped

> *"effetti camera 3d (come quello della hero che va verso destra prima del salto a
> velocità della luce)"*

**This is the one instruction that collides with a standing architectural rule.**
`src/webgl/SignatureLine.tsx` is the ONLY camera writer, and every island recomputes
its pose from the camera each frame precisely so that a camera move cannot disturb
it. The traverse is a **local rig** for that reason.

Before writing any code: read how the hero's move is authored, decide whether the
neural passage gets its own camera authority or a local rig that *mimics* a camera
move, and price what a real camera move does to the islands' invariance, the copy
mask lane, the stone's registration and the frozen-frame contract. **Do not simply
start writing to the camera** — that invariance is load-bearing and was earned.

---

## 6. THE COPY / NET BALANCE — his call, by eye

> *"le scritte non devono oscurare la rete neurale sotto"*

`0d3be99` turned the 1408 px wall into a sill across the tracked reading unit. That
is a large step toward what he asked for, but it is a **dial, not a binary**: the
deeper the net shows through, the less legible the copy. The WCAG contrast contract
(`laneCheck()`, the ROUND 9-B "la rete sta sopra le scritte" failure) is what the
mask exists to protect. Show him two or three settings live and let him choose;
report the measured contrast at each.

---

## 7. MEASURED AND LEFT

- **Phone: no traverse and no WebGL net.** At 390×844 the act measures **1.147 vh
  against 5.73** at 1920 — the runway growth is not applied — and no WebGL lattice
  island mounts at all; the lite tier renders the SVG twin. The phone today has
  neither the diagonal nor the net. Decide explicitly whether the phone enters the
  design or is a declared fallback.
- **The single-line ledger headlines are uncapped at every width.** §C0 exempts
  single-line display type on the reasoning that it has no return sweep. At 768 wide
  they already drift **2.44 em/line at 23.61°**, and 45° multiplies that by 2.287.
  `capDisplayFrameK` exists and is **spent (0)** because switching it on is an
  owner-visible beat change. Show him both.
- **`nearest` density is over the 6 KiB packed gate** (6.69 KiB) and **the phone can
  only take `onFrame`** — areal parity there needs 1212 seeds and `buildPlexus`
  throws at the 1024 dedup ceiling.
- **No GPU capture has ever been taken.** Every particle-count and fill figure in the
  corpus is a static read of the node graph. Stage 3's cull and the phone's viability
  are both blocked on one.
- **`coverage()` still reports the anchor-box census** (39.3% "nothing", 1376 px run).
  Under the ribbon that is a **false negative** — measured truth is 0%. It must be
  re-declared, not re-quoted.
- **Dead surface left behind:** `plexusSeed` / `plexusWell` / `PLEXUS_SEEDS_STONELESS`
  are unreachable from the app; `neuralLatticeConfig.ts:231,773,818` still describe
  "the five islands" as live.

---

## 8. THE ORDER I WOULD BUILD IT IN

1. **Remove the chord + the birth front, together** — they are one mechanism, and
   they are the two things he can see that are still missing.
2. **The meteorite's one-line spin fix**, then the mark mesh. Cheap, and it closes a
   whole owner instruction.
3. **A GPU capture**, before anything else is added to the frame.
4. **The merge.** Largest blast radius; do it when the look is settled, not before.
5. **The camera**, last, and only after its collision with the SignatureLine
   invariance has been scoped on paper.

**Standing rules that did not change:** no pin, no sticky stage, no snap, no
parking. Blue/cyan/navy only, never violet. Copy freeze absolute. `SignatureLine.tsx`
at zero lines. `#production` byte-for-byte. Both backends. Show him screenshots, not
reports — he judges by eye, live, and he is right more often than the agents are.

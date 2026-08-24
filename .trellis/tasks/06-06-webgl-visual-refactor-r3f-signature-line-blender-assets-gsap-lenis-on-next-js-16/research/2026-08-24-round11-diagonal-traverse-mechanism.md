# ROUND 11 — THE DIAGONAL TRAVERSE: MECHANISM DOSSIER

- **Query**: rebuild the rig half of the round-10 journey against the design the owner
  actually approved — ADDENDUM 2 (D6–D10) of `2026-08-22-round10-OWNER-DECISIONS.md`:
  one scene at its own depths (D6), **no pin ever** (D7), the movement never stops (D8),
  ~1.5 screen widths of lateral run per section (D9), sections grow to ~4400 / ~4300 px (D10).
- **Scope**: internal (mechanism half). The beat-by-beat storyboard is the parallel dossier
  `2026-08-24-round11-diagonal-traverse-storyboard.md` — not touched here.
- **Date**: 2026-08-24
- **Predecessor**: `2026-08-22-round10-journey-mechanism.md`. Its **Part 2** (the camera-lock
  audit and the local rig) is carried forward here with attribution and re-aimed laterally.
  Its **Part 3** (the `.seq-stage` sticky stage), the **sticky-offset correction in §4.4**,
  risk **R1**, and the **Part 5 runway arithmetic** are dead by D7 and are not repeated.
- **Repo state**: working tree, HEAD `62514aa` + three concurrent agents in flight
  (`lusion-type.ts`, `problem-section.tsx`, `production-grade-section.tsx`;
  `crystalConfig.ts` / `CrystalCluster.tsx` under review). Line numbers below are from the
  **working tree as read on 2026-08-24**, not from HEAD, and will drift by a few lines in
  those five files. Values read live: `CRYSTAL_SCALE = 0.115` (`crystalConfig.ts:360`),
  `DRIFT_SCALE = 0.12` (`lusion-type.ts:164`), `DRIFT_MAX_WIDE = 24` / `DRIFT_MAX_COMPACT = 8`
  (`:180-181`), `ROW_DRIFT_K = [0.5, 0.66, 0.82]` (`:694`).
- **Live ground truth**: coordinator's browser measurement, home `/`, 1280×720,
  `scrollHeight` 21459. All arithmetic at that viewport unless stated.

---

# ⚠ REVISION 2 — 2026-08-24, after ADDENDUM 3 (D11–D13)

The owner ruled again after this dossier landed. **One ruling invalidates the central proof
in PART 2** and it is marked superseded in place rather than deleted, because the reasoning
that led there is still the reasoning that shows what the new design costs.

| ruling | what it does to this dossier |
|---|---|
| **D11 — the copy's lateral rate is WINDOWED, not constant** (α runs fast at the frame edges, slow in the reading zone; **555 px of excursion instead of 216**, at zero legibility cost) | **§2.2, §2.3 and §2.4 are SUPERSEDED.** A windowed α is not a fixed ρ, so `ρ = 1 − DRIFT_SCALE·(1−k)` no longer closes. **PART 2-BIS** redoes it: the implied-depth *range* per block, the occlusion check at the frame edges, the axis disagreement quantified, the transport contract restated as a frame snapshot, the `uCopyEdge` tracking law, and the C¹ proof. §2.1 (the conversion), §2.5 (the tanh ceiling) and §2.6 (growth vs the drift's shape) are **unaffected and still authoritative.** |
| **D12 — the phone holds the ANGLE (23.6°), not the screen-width count** ⇒ **5.77 W** on a phone, not 1.5 | **§1.1 and §7.4 revised.** It makes the mechanism *simpler*: holding the angle makes the rig's world lateral a **single viewport-invariant constant, 29.847 world units** (§2B.0). Every "1.5 screen widths" in this document is an artifact of the 1280×720 aspect, not the authored quantity. |
| **D13 — an ignition front** sweeps the net top-right → bottom-left at 23.6°, once per gap | **§6.1B, §8.1 and §9 revised.** A new consumer of the traverse progress. **Confirmed: zero new UBO blocks, the 12/12 vertex-stage ceiling stands.** |
| `CRYSTAL_SCALE = 0.115` committed; the crystal review confirmed this dossier's §4.2(2) (1677 px slab at a 4392 band) and prepared the fix | **§4.2(2), §9, §10 revised** with `C_vp = 0.0926`, the two-sites-move-together rule, and the three things the re-base does **not** solve alone. |

---

## 0. VERDICT IN ONE PARAGRAPH

The owner's choice of the diagonal over the sticky stage did not cost this build anything —
**it removed the two failure modes that could have destroyed it silently, and it handed us a
depth law we no longer have to invent.** With no sticky ancestor there is no
`vpTop = docTop − scrollY` lie, so **risk R1 (the sticky-offset correction) evaporates
entirely**: the islands' placement math at `NeuralLattice.tsx:360` and `CrystalCluster.tsx:446`
is correct as shipped and changes by zero lines. And because nothing is pinned, the
**pin-scoped half of risk R2 evaporates with it** — `useTextDrift`'s cached document centre
against the live viewport centre is exactly the quantity it was written to be, so the 440.6 px
shear the round-10 dossier priced at §3.4 **cannot occur**; the concurrent tanh saturation
(`lusion-type.ts:640-645`) then bounds what remains at ±24 px desktop / ±8 px compact.
Two silent, composition-destroying bugs, both gone, for free, because he said no. The rig half
survives intact from Part 2 of the predecessor: every island that must travel is
**camera-locked and therefore exactly invariant under every camera write**, so the traverse
must be a **local rig group inside each island**, SignatureLine untouched — only the
direction changes, from a forward dolly to a lateral run. The genuinely new work is three
things: (1) **one transport authority** producing one lateral number per section that the DOM
copy and the WebGL rig both consume — *the same number, not the same formula* (§1, §8);
(2) **the depth-consistency question** — ~~which is not a free parameter, the lateral rate
following as ρ = 1 − DRIFT_SCALE·(1−k)~~ **[SUPERSEDED by D11 — see PART 2-BIS]**. The owner
chose a *windowed* lateral rate, so the copy no longer sits at one honest depth: it sweeps
**d = 48 in the reading zone to d = 4 at the frame edges**, against a vertical that says
≈12.8 throughout. That is a scripted move, not geometry, and PART 2-BIS states exactly how
far from honest it is, why the occlusion cue survives anyway, and what the mask must now
track (§2B); (3) **the `rect.h` coupling**, which is where section growth
actually bites — three shipped constants key off the anchor rect's *height* (the net's world
scale, the net's depth via `NEURAL_DEPTH_SCALE_FACTOR`, and the stone's size via
`CRYSTAL_SCALE`), and a 3.3× taller anchor inflates all three (§4). Fill **falls** during the
traverse rather than rising (§6) — this design is cheaper than the shipped rest pose, not more
expensive. Zero new UBO blocks, zero new varyings, zero new TSL: the rig is a scene-graph
transform carried by `modelViewMatrix`.

---

## PART 1 — THE LATERAL TRANSPORT, END TO END

### 1.1 What we are building, stated once

One number per section per frame:

```
p  = clamp( (scrollY − secTop) / travel , 0, 1 )        travel = secHeight − innerHeight
X  = LATERAL_SCREENS · vw · easeOrIdentity(p)           the SCENE's lateral, in CSS px,
                                                        measured at the content plane
L  = X · k                                              the same thing in WORLD units
                                                        k = WORLD_VIEW_HEIGHT / innerHeight
```

Two consumers:

| consumer | applies | where |
|---|---|---|
| DOM copy block `b` | `x = designLane_b + R_px · Â_b(u)` — a **windowed** rate, D11 | a hoisted `gsap.quickSetter(el,"x","px")` |
| WebGL island rig (`NeuralLattice` ×2, `CrystalCluster` ×2) | `rig.position.x = L` world units (α ≡ 1.00) | inside the island's existing `useFrame` |
| ignition front (D13) | `uFrontS = frontSchedule(p)` | the island's existing `useFrame` — §6.1B |

> **⚠ REVISED BY D11.** ~~`ρ(k_b) = 1 − DRIFT_SCALE·(1 − k_b)` — derived, not chosen. Proof in
> §2.~~ The owner chose a **windowed** lateral rate: α is a function of the block's own screen
> position, 0.25 in the reading zone and 3.00 at the frame edges, and the offset is α's
> **closed-form antiderivative** `Â(u)`. Do not multiply `X` by a position-dependent factor —
> §2B.5 prices that mistake at an **80× rate spike**. Live law and C¹ proof: **§2B.5**.

**Sanity check that the two units are calibrated with zero fudge factors**: at α = 1 (which
is the net's rate, always), `L = X·k` world units renders as `L/k = X` px at the content
plane, by construction, and no conversion constant is ever typed by hand.

**And under D12 the authored quantity is not a screen-width count at all.** Holding the angle
makes `ih` cancel out of `lateral_world`, so the rig's translation is **one viewport-invariant
constant, `L = 29.847` world units** (2.487 × `CAMERA_Z`) — derivation and the per-viewport
table in **§2B.0**. Every "1.5 screen widths" in this document is a **1280×720 report**, not
an input; on a phone the same `L` reports as **5.77 W** (D12).

At 1280×720: `k = 0.0155436`, `1/k = 64.335 px per world unit`, `worldViewWidth = 19.8958`,
so the run reports as **1920 px = 29.847 world units**. Per viewport table:

| viewport | `k` | px/world | `f` (px) | `worldViewWidth` | 1.5 screens (world) | 1.5 screens (px) |
|---|---|---|---|---|---|---|
| 1280×720 | 0.0155436 | 64.335 | 772.02 | 19.8958 | 29.844 | 1920 |
| 1440×900 | 0.0124349 | 80.419 | 965.03 | 17.9062 | 26.859 | 2160 |
| 768×1024 | 0.0109291 | 91.499 | 1097.99 | 8.3935 | 12.590 | 1152 |
| 390×844 | 0.0132599 | 75.415 | 904.98 | 5.1714 | 7.757 | 585 |

(`f` = focal length in px = `CAMERA_Z / k` = `ih / (2·tan 25°)`. `WORLD_VIEW_HEIGHT = 11.191384`,
`constants.ts:14-15`; `CAMERA_FOV 50`, `CAMERA_Z 12`, `constants.ts:4-5`.)

**The diagonal's angle falls out of the two runs**:

| act | vertical run | lateral run | px lateral per px vertical | angle from vertical |
|---|---|---|---|---|
| Act I `#problem` @1280×720 | 4392 | 1920 | 0.4372 | **23.6°** |
| Act II `#trust` @1280×720 | 4284 | 1920 | 0.4482 | **24.1°** |
| phone 390×844, 6.10 vh runway | 5148 | 585 | 0.1136 | **6.5°** — see §7.4 |

### 1.2 Where `p` comes from — the ruling

**A plain, un-pinned, un-scrubbed `ScrollTrigger` per section, `onUpdate` writing both
consumers' source of truth.** Not `scrollStore.progress`, not a hand-rolled rAF, not
`gsap.ticker`.

```ts
const st = ScrollTrigger.create({
  trigger: section,               // the <section id="problem"> itself
  start: "top top",
  end: "bottom bottom",           // p = 1 exactly when the section's bottom reaches the
                                  // viewport bottom  ⇒  travel = secH − vh
  invalidateOnRefresh: true,
  onRefreshInit: measure,         // secTop, travel, vw, vh — px, from the live viewport
  onRefresh: (self) => apply(self.progress),   // snap, never glide, across a re-measure
  onUpdate:  (self) => apply(self.progress),
});
apply(st.progress);               // init snap: a reload restoring mid-section must not fly in
```

**The pattern being extended is `founders-rail.tsx:2009-2032`** — the site's *shipped*
scroll-driven horizontal transport. It is the exact shape above (no `scrub:`, no `pin:`,
`onUpdate` writing a hoisted `gsap.quickSetter(track,"x","px")` plus an analytic per-panel
pass over cached measurements). `services-section.tsx:909-925` and `fit-section.tsx:761-768`
are the same shape with a sticky frame added; we take the trigger and leave the frame.

Why not the alternatives:

- **`scrollY` read in the existing frame loop.** Tempting (the islands already read
  `window.scrollY` at `NeuralLattice.tsx:358`), but it puts the DOM write and the WebGL
  write on two different reads of the same clock. §8 shows why that is the one thing that
  can betray the illusion.
- **`scrollStore.progress`.** Document-global and *damped* (`PROGRESS_DAMP 6`,
  `SignatureLine.tsx:57`). A per-section span would have to be re-derived on every
  `measureVersion` bump — `PostFXNodes.tsx:1105-1135` already does exactly that
  remapping and it is 30 lines we do not need to write twice.
- **`gsap.ticker`.** Fires *before* R3F's rAF (it registers at gsap import time; R3F's loop
  starts at Canvas mount), i.e. before `pumpLenis` has advanced the scroll for this frame.
  That is a guaranteed one-frame lead for the DOM over the WebGL. §8.
- **`scrub: true`.** Only meaningful when driving a GSAP animation. We write values
  directly, and a scrub would add a *second* smoothing on top of Lenis's, making the copy's
  x lag the net's x by a tunable amount — the exact defect we are engineering against.

### 1.3 Zero per-frame allocation, zero per-frame `getBoundingClientRect`

`measure()` (on `onRefreshInit`, i.e. on every `ScrollTrigger.refresh()`) caches four
scalars per section: `secTop`, `travel`, `vw`, `vh`. `apply(p)` is pure arithmetic over
those plus a fixed array of pre-built quickSetters. Nothing is allocated, nothing is
measured, no closure is created per frame. This is `founders-rail.tsx:1966-1979 / :1982-2006`
verbatim in structure.

The islands allocate nothing new either: `NeuralLattice` already owns
`scratch = useRef(new THREE.Vector3())` (`:308`) and `CrystalCluster` the same (`:370`);
the rig write is `rig.position.x = L` — a number assignment on an existing `THREE.Group`.

### 1.4 Which DOM blocks the transport owns — and the ruling the coordinator asked for

**One writer producing both axes' *source*, two quickSetters applying them.** Concretely:

- `useTextDrift`'s module driver (`lusion-type.ts:546-712`) keeps `y` exactly as it is today
  — same `driftTick`, same tanh, same `DRIFT_MAX` tiering, byte-identical for every other
  consumer on the site. **We do not fold `x` into `driftTick`.** `driftTick` runs on
  `gsap.ticker` and would inherit the one-frame lead of §1.2.
- The traverse's `apply(p)` writes `x` for every `[data-drift]` block inside the two
  traverse sections, through a **second** `gsap.quickSetter(el,"x","px")` built once at
  register time and stored on the same entry.

Two quickSetters on `x` and `y` of one element are safe: both resolve through CSSPlugin's
per-element transform cache (`el._gsap`), each setter mutates its own component and re-renders
the composed matrix. This is the documented GSAP idiom and the site already relies on it
(`founders-rail.tsx:1957-1958` sets `x` on a name while `xPercent` is set on its media).
**Two writers of the same *component* would not be safe; that is not what this is.**

One teardown trap: `registerDrift`'s cleanup does `gsap.set(el, { clearProps: "transform" })`
(`lusion-type.ts:687`). That clears `x` as well as `y`. The traverse's own cleanup must run
*before or with* it, and must not assume `x` survives an unregister. One line, but it is the
kind of thing that shows up as "the copy jumps 900 px on an EN/IT toggle".

Does the one-frame lead of `dy` against `dx` matter? `dy` changes by at most
`DRIFT_SCALE·(1−k)·Δscroll` per frame = `0.12·0.5·50 = 3 px` at a hard 3000 px/s flick,
against a 22 px lateral step (and up to **57 px** at α_edge — the windowed rate makes the
lateral step larger, not the vertical one). It perturbs the block's implied depth by a
fraction of a percent for one frame. **Immaterial, and it is the same staleness the shipped
drift already has.** The requirement that is *not* immaterial — copy-`x` vs net-`x` — is met
exactly, because both come out of the same `apply()` reading one frozen `scrollY`
(**§2B.3**, the frame-snapshot contract, which supersedes the looser phrasing here).

---

## PART 2 — THE DEPTH-CONSISTENCY PROOF  ⚠ §2.2–2.4 SUPERSEDED BY D11

> **STATUS.** §2.1, §2.5 and §2.6 stand and are still the authority for the projection
> constants, the tanh ceiling and the drift-vs-growth question. **§2.2, §2.3 and §2.4 are
> superseded by owner decision D11** (windowed lateral rate) and are kept as the record of
> what a constant α would have bought, because that is the yardstick PART 2-BIS measures the
> windowed rate against. Read PART 2-BIS for the live analysis.

*~~This is the heart of the dossier. The conclusion is that the lateral rate is **not a free
parameter** — the design has already chosen it, twice over, and the two choices agree.~~
The conclusion below held only for a constant α. It does not survive D11.*

### 2.1 The conversion, at the site's real numbers

A point at camera-space depth `d` projects with focal length `f = ih / (2·tan(FOV/2))` px.
With `CAMERA_FOV = 50`, `CAMERA_Z = 12`, `WORLD_VIEW_HEIGHT = 2·tan(25°)·12 = 11.191384`
(`constants.ts:4-15`) and `k = WORLD_VIEW_HEIGHT / ih`:

```
f  = ih / (2·tan 25°) = CAMERA_Z / k = 12 / k          [px]
Δscreen_px = f · ΔX_world / d
```

**World lateral units → DOM px at the content plane** (`d = CAMERA_Z = 12`):

```
Δpx = f · ΔX / 12 = ΔX / k = ΔX · ih / WORLD_VIEW_HEIGHT
    = 64.335 · ΔX      at 1280×720
    = 80.419 · ΔX      at 1440×900
    = 75.415 · ΔX      at 390×844
```

and the inverse, which is the one the rig actually uses: `ΔX_world = Δpx · k`.

**World lateral units → screen px at the net's depth range.** Nodes live at local
`z ∈ ±PLEXUS_RZ = ±0.2` (`neuralLatticeConfig.ts:255`), scaled by `zWorld = rect.h · k ·
NEURAL_DEPTH_SCALE_FACTOR` with the factor `= 1.0` (`:1581`) — i.e. today `zWorld = hWorld`.
At the shipped `#problem` band (`rect.h = 619`), `hWorld = 9.6215`, so node world-z spans
`±1.9243` about the group plane, which itself sits *exactly* `CAMERA_Z = 12` in front of
the camera by the placement construction (`NeuralLattice.tsx:374-378`). Hence:

| plane | camera distance `d` | px per world lateral unit | rate vs the group plane |
|---|---|---|---|
| **near wall** of the cloud | 10.076 | 76.62 | **×1.1910** |
| **group plane** (the anchor) | 12.000 | 64.335 | ×1.0000 |
| **far wall** of the cloud | 13.924 | 55.45 | **×0.8618** |

**This is the free gift of the design.** Because the rig translates the group in *world*
units and the perspective divide is real (`neuralFieldCompute.ts:2202-2211` divides by the
true view-space `dist`), the cloud **shears as it slides**: over a 1920 px group-plane run,
near nodes travel **2287 px** and far nodes **1655 px** — a **632 px** spread across the
depth of one cloud, with zero shader changes and zero authored parallax. That spread *is*
the "one place" read, and it is not available from any camera write (Part 2.2 of the
predecessor: every island is exactly invariant under camera translation **and** rotation).

### 2.2 ~~The copy's depth is already fixed — by D7, and by the shipped drift~~  ⚠ SUPERSEDED (D11)

> Superseded. The derivation is correct for a constant α and is retained because PART 2-BIS
> reuses its two ingredients (the vertical rate `1 − S·a`, and the depth-from-screen-rate
> identity). What it got wrong was the *premise*: it assumed the horizontal rate had to equal
> the vertical one. The storyboard instead took the horizontal from Lusion's shipped ledger
> (α = 0.25 body / 0.50 display) and the owner then windowed it, so the two axes never agreed
> — not by a few percent, but by a factor of 4 (§2B.2).

D7 says the page never holds: the copy descends **at natural speed**. A DOM block that
scrolls at 1:1 with the page is, in this projection, an object whose *vertical* screen rate
is 1 — i.e. an object at `d = CAMERA_Z = 12` exactly. That already pins the copy's depth
before anyone chooses a lateral rate.

Except it is not quite 1:1, because `useTextDrift` adds a per-block vertical offset. Write
`a = 1 − k_b` and `S = DRIFT_SCALE = 0.12` (`lusion-type.ts:164`). The driver's tick is
`dy = M·tanh(a·u·S/M)` with `u = center − viewCenter` (`:641-645`), and `u` decreases by
exactly 1 px per px scrolled. So in the linear regime the block's **total vertical screen
rate** is

```
ρ_y = 1 − S·a
```

and an object at depth `d` has screen rate `CAMERA_Z/d`, so

```
d_block = CAMERA_Z / (1 − S·a) = 12 / (1 − 0.12·(1 − k_b))
```

Evaluated on the shipped coefficients (`ROW_DRIFT_K = [0.5, 0.66, 0.82]`, `lusion-type.ts:694`;
chapter description `data-drift="1.25"`, `problem-section.tsx:416`):

| block | `k_b` | `a = 1−k` | `ρ = 1 − 0.12a` | implied depth `d` | lateral over a 1920 px run | drift **relative to the net** |
|---|---|---|---|---|---|---|
| chapter display + row 1 | 0.50 | +0.50 | **0.9400** | 12.766 | 1804.8 px | +115.2 px |
| row 2 | 0.66 | +0.34 | **0.9592** | 12.510 | 1841.7 px | +78.3 px |
| row 3 | 0.82 | +0.18 | **0.9784** | 12.265 | 1878.5 px | +41.5 px |
| chapter description | 1.25 | −0.25 | **1.0300** | 11.650 | 1977.6 px | −57.6 px |

> **THE LAW: `ρ_x` must equal `ρ_y`, i.e. `ρ = 1 − DRIFT_SCALE·(1 − k_b)`.**
> Every copy block already declares a depth through its vertical drift coefficient. If its
> lateral rate is anything else, the block asserts one depth in `y` and a different one in
> `x` — a shear with no physical referent, which is precisely what reads as "the text is on
> the glass and the net is behind it".

This is also the answer to the coordinator's consequence 2: the vertical drift and the
horizontal transport are **not on different budgets** and cannot use unrelated coefficient
scales. They are the same quantity `12/d` applied to two axes, and `DRIFT_SCALE` is the one
knob that sets both. Its magnitudes look wildly different (±24 px vertical vs ±115 px
horizontal) only because the two axes' *common* travel differs by an order of magnitude:
vertically the block travels ~1 viewport through the frame, horizontally the scene travels
1.5 viewports *widths*. The **rate** is identical.

### 2.3 ~~What differential the storyboard may spend, and where it puts the copy~~  ⚠ SUPERSEDED (D11)

> Superseded. The occlusion table below is still the right *instrument* — it is reused,
> re-evaluated at the windowed α's real endpoints, in §2B.1. The recommendation
> ("keep ρ ∈ [0.94, 1.03]") was not taken.

The differential is `(1 − ρ)·X = S·a·X` and it is **already spent** by the k's the drift
picked. The storyboard's freedom is in choosing `k_b`, which moves both axes together.

- **Range currently on the page**: `ρ ∈ [0.94, 1.03]`, depths `11.65 → 12.77`.
- **The net's own depth volume**: `10.076 → 13.924` ⇒ `ρ ∈ [0.862, 1.191]`.
- ⇒ **Every copy block sits inside the net's depth volume**, occupying the middle **29 %**
  of it, straddling the group plane. That is the geometric definition of "the copy lives in
  the world, not on the glass" (D6), and the site already satisfies it.

**Occlusion, which is where legibility actually lives.** A *slower* block is a *deeper*
block, and deeper means **behind more of the net**:

| target | required `ρ` | required `k_b` | consequence |
|---|---|---|---|
| copy in front of **every** node | ≥ 1.1910 | ≤ −0.593 | copy crosses the frame 19 % faster than the scene; ρ far outside today's range |
| copy in front of the **near half** | ≥ 1.0 | ≤ 1.0 | today's chapter description (k 1.25) qualifies; the rows do not |
| copy at the **group plane** | = 1.0 | = 1.0 | half the nodes in front, half behind |
| **today's rows** (k 0.5–0.82) | 0.94–0.978 | — | copy sits in the **far half**; the nearer 55–70 % of the cloud draws over it |
| copy behind **every** node | ≤ 0.8618 | ≥ 2.152 | copy is a backdrop; the net owns the frame |

> **The legibility differential and the legibility requirement point in opposite directions.**
> Riding the copy slower buys reading time and puts it *behind* more of the net; riding it
> faster puts it in front and costs reading time. This is why the copy mask exists and why
> it must survive (§3.3 / §5.4) — the mask is what makes a block at `d = 12.77` legible
> without lying about its depth.

**Recommended budget for the storyboard**: keep `ρ ∈ [0.94, 1.03]` (i.e. keep the existing
`k` set, do not invent traverse-specific ones). If a block needs to be more legible, move it
*in front* by lowering its `k` — and accept that its vertical drift changes by the same
proportion, because that is what depth means. Do **not** introduce a lateral-only
coefficient; it is a depth contradiction with a measurable size (§2.4).

### 2.4 ~~How big is a violation, in pixels~~  ⚠ SUPERSEDED (D11)

> Superseded — and it is worth reading anyway, because it priced a ρ of 0.85 as "not a subtle
> cue" at 173 px of divergence. The approved design runs α from 0.25 to 3.0. §2B.2 prices
> what that actually costs, using this same method.

If the storyboard ignores §2.2 and uses, say, `ρ_x = 0.85` on a `k = 0.5` block:

- implied depth in `x` = 12/0.85 = **14.12**; implied depth in `y` = **12.77**. A 10.6 %
  contradiction.
- Over the act the block ends up `(0.94 − 0.85)·1920 = 173 px` displaced from where its own
  vertical parallax says it should be — **13.5 % of the viewport width**, sliding
  monotonically. That is not a subtle cue; it is the block visibly detaching from the net.
- The tell is unambiguous and cheap to test: place a marker node at the copy block's
  centroid depth and screenshot at `p = 0 / 0.5 / 1`. If they stay coincident, ρ is right.

### 2.5 The tanh ceiling (STILL VALID — but see §2B.5 for its lateral twin)

`dy` saturates (`lusion-type.ts:640-645`), `dx` does not. The instantaneous vertical rate is
`S·a·sech²(a·u·S/M)`, so `ρ_y` drifts toward 1 (depth toward 12) as the block leaves the
frame centre. At `k = 0.5`, `M = 24`:

| `u` (px from viewport centre) | `dy` | % of linear | instantaneous `ρ_y` | implied `d_y` | vs `d_x = 12.766` |
|---|---|---|---|---|---|
| 0 | 0.00 | 100 % | 0.9400 | 12.766 | exact |
| 100 | 5.88 | 98.0 % | 0.9436 | 12.717 | −0.4 % |
| 200 | 11.09 | 92.4 % | 0.9528 | 12.594 | −1.3 % |
| 360 (frame edge @720) | 17.19 | 79.6 % | 0.9708 | 12.361 | −3.2 % |
| 800 (off-screen) | 23.14 | 48.2 % | 0.9958 | 12.051 | −5.6 % |

**Inside the reading window the two axes agree to within 1.3 %; the contradiction reaches
3.2 % only at the frame edge and flattens the block toward the page plane, which is the
direction a viewer forgives.** Do not "fix" this by saturating `dx` too: the collision
algebra that forced tanh (`lusion-type.ts:552-580`) is a *vertical-stacking* problem — two
blocks stacked in `y` can collide. Horizontally the blocks are in different rows and cannot;
the only horizontal failure mode is a ragged left edge, budgeted at **173 px max spread**
(chapter description ρ 1.030 vs row 1 ρ 0.940 over 1920 px). If the owner finds that ragged,
the lever is `DRIFT_SCALE` or the `k` spread — **and both move the vertical cue by the same
proportion, by construction.** That coupling is the point, not a side effect.

### 2.6 What section growth does to the drift's shape (coordinator's consequence 3)

`u` is the block's own distance from the **viewport** centre, not a section-relative
quantity — so **section growth does not change the shape of the curve the reader sees**. A
block is on screen for `|u| ≲ vh/2 + h/2 ≈ 360–500 px`, and that is exactly the window where
tanh is still 80–100 % linear (table above). What growth *does* change is that the
per-section off-screen skip (`en.secBottom < sy || en.secTop > viewBottom`,
`lusion-type.ts:634`) now keeps ~10 blocks "live" for **6.1 viewports** instead of 1.85, with
most of them thousands of px off-frame and parked in saturation. That costs nothing: once
saturated, `|dy − en.dy| < 0.05` and the write is skipped (`:646`). **Self-limiting, no
action needed** — but it is worth an assertion in the dev handle that the write-skip is
actually firing, because if it ever stops, it is 10 transform writes per frame for 6 viewports.

---

## PART 2-BIS — THE WINDOWED RATE: WHAT THE COPY SITS AT NOW

*Written against owner decisions **D11** (windowed α) and **D12** (hold the angle), and
against the storyboard's α ledger (§B1) and drift cap (§B2). This supersedes §2.2–2.4.*

### 2B.0 First, the gift D12 hands the rig: the world lateral is a CONSTANT

D12 rules that the **angle** is the invariant and the screen-width count is an artifact of
aspect ratio. Write it out and the mechanism gets simpler, not harder:

```
lateral_px    = tanθ · H            H = runway in px = (runway in vh) · ih
lateral_world = lateral_px · k      k = WORLD_VIEW_HEIGHT / ih
              = tanθ · (runway in vh) · WORLD_VIEW_HEIGHT      ← ih CANCELS
```

At θ = 23.61° (tanθ = 0.4372) and a 6.10 vh runway:

| viewport | H (px) | lateral (px) | in screen widths | **lateral (world units)** |
|---|---|---|---|---|
| 1280×720 | 4392 | 1920 | 1.50 W | **29.847** |
| 1440×900 | 5490 | 2400 | 1.67 W | **29.847** |
| 768×1024 | 6246 | 2731 | 3.56 W | **29.847** |
| 390×844 | 5148 | 2251 | **5.77 W** (D12) | **29.847** |

> **`traverseConfig` should author `ANGLE_DEG` and the runway in vh, and derive everything
> else.** The rig's translation is then one number — `L = 29.847` world units — identical on
> every device, and the "1.5 screen widths" of D9 is a *report*, not an input. Every
> screen-width figure elsewhere in this dossier is a 1280×720 report and must be read that
> way. `2.487 × CAMERA_Z` is the honest magnitude of the run.

This also removes the phone problem §7.4 flagged: there is no per-tier lateral constant to
tune, because the tier no longer changes the authored quantity.

### 2B.1 What the copy sits at now — the implied-depth RANGE, and the occlusion check

`d(α) = CAMERA_Z / α = 12/α`, exactly as in §2.1 and as the storyboard derives independently
(§B1). With the approved window (α_read 0.25 in the reading zone, α_edge 3.0 at the frame
edges) the copy no longer *has* a depth; it has a trajectory through depth:

| layer | α | implied `d` | world `z` | vs the net's slab (`d` 11.04 → 12.96) |
|---|---|---|---|---|
| dot-grid far wall | 0.14 | 85.7 | −73.7 | far behind everything |
| **body copy, reading zone** | **0.25** | **48.0** | −36.0 | **4.0× further than the net's mid-plane** |
| **display type, reading zone** | **0.50** | **24.0** | −12.0 | 2.0× further |
| — the honest crossing — | 0.940 | 12.77 | −0.77 | **the only α at which the copy agrees with its own vertical** |
| net far face | 0.926 | 12.96 | −0.96 | — |
| **net dense mid — the reference plane** | **1.00** | **12.00** | 0 | — |
| net near face | 1.087 | 11.04 | +0.96 | — |
| near motes (world-anchored) | 1.20 | 10.00 | +2.00 | the nearest thing the shipped rig can hold |
| **copy at the frame edges** | **3.00** | **4.00** | **+8.00** | **2.5× NEARER than the nearest mote; 2.76× nearer than the net's near face** |

**So: yes — at the window edges the copy implies a depth that puts it in front of net
geometry.** `d = 4.0` is in front of everything in the frame, by a wide margin. And that is
the answer to the question, but it is not the answer one would expect:

> **The edges are where the parallax cue and the occlusion cue AGREE, and the reading zone is
> where they contradict.** DOM stacking paints the copy in front of the net always (the band
> is `-z-10`, `problem-section.tsx:387-390`). At α_edge = 3.0 the copy *claims* to be in
> front — consistent. At α_read = 0.25 the copy claims `d = 48`, four times further than the
> net, while painting in front of it — **contradictory, and occlusion is the stronger cue, so
> occlusion would win.**

That contradiction is not new and it is not D11's fault: it is inherent to the storyboard's
α = 0.25 ledger, and the storyboard names it as the load-bearing risk of the whole design
(its §B1 point 4). Its resolution is the non-overlap guarantee — *the mask keeps the net and
the copy off each other's pixels, so the occlusion cue is never tested.* **What D11 changes
is where that guarantee has to hold, and it moves it to the hardest place:**

- In the reading zone the copy sits in its authored design lane, the mask lane is centred on
  it, and the guarantee is a static geometry problem — the one the storyboard solved.
- At the frame edges the copy has swung **±277 px** off that lane (half of D11's 555 px
  excursion) and is moving at **1.31 px per scroll px** laterally (α_edge 3.0 × R 0.4372),
  three times the net's own rate. The mask must follow it there or the net brightens under
  a moving block. **§2B.4 is that tracking law, and it is now mandatory rather than tidy.**

**The favourable half, stated plainly so it is not lost:** because the parallax cue at the
edges says *in front*, a mask failure at the edges is a **contrast** defect (WCAG), not a
**depth** defect — the scene does not fall apart, the text just gets harder to read. A mask
failure in the reading zone would be both. So the risk is correctly concentrated where the
instrument is strongest.

**One block is worse than the rest.** The chapter description carries `data-drift="1.25"`
(`problem-section.tsx:416`), so its vertical rate is `1 + 0.03 = 1.03` — *faster* than the
net's 1.000, implying `d = 11.65`, i.e. **nearer than the net's mid-plane**. Horizontally it
rides α = 0.25, implying `d = 48`. That is not merely a magnitude disagreement; it is an
**ordering** disagreement — vertically the nearest thing in the frame, horizontally the
furthest. Every other block's two axes at least agree on *sign*. Bounded, though: the
vertical drift is tanh-capped at ±24 px (`lusion-type.ts:180`), so the wrong-signed cue is
worth ≤48 px of excursion against ≥480 px horizontally — **a 1:10 ratio.** Flagged, not
recommended for change: `k = 1.25` is Lusion's own value for this block and it ships today.

### 2B.2 Reconciling with the vertical — the disagreement, quantified, and why it may be invisible

**The premise §2.2 got wrong.** The vertical on this page is **not a camera descent for the
layers that matter.** `SignatureLine` does descend the camera (`:787`), but the four
participating islands are *camera-locked*: they are re-placed from their DOM rect every frame
(`NeuralLattice.tsx:374-378`), so their vertical screen rate is **exactly 1.000 regardless of
depth**. The DOM copy's is `1 − S·a ∈ [0.94, 1.03]`. So the vertical axis carries almost no
depth information at all — and, critically, it carries **the same near-zero information for
every layer.**

That distinction is the whole perceptual argument, so state it precisely:

> A uniform vertical rate across all layers is **absent** evidence of depth, not
> **contradictory** evidence. Contradiction would require the vertical rates to be
> depth-ordered the *wrong* way. They are not ordered at all (spread 0.94–1.03 against a
> horizontal spread of 0.14–3.00). The eye is therefore reading depth from one axis with the
> other abstaining — which is exactly what Lusion's detail pages do (`x/2 … x/5` horizontal
> against `k` 0.5 / 1.25 / 1.5 vertical, `2026-08-21-lusion-text-dossier.md` §4), and they
> ship it.

The numbers, per block, over one transit:

| block | `k` | vertical rate `1−S·a` | `d` from **vertical** | `d` from **horizontal** (read → edge) | disagreement factor |
|---|---|---|---|---|---|
| row display line | 0.50 | 0.940 | 12.77 | 24.0 → 4.0 | 1.88× deep → 3.19× near |
| row body | 0.50 | 0.940 | 12.77 | 48.0 → 4.0 | **3.76× deep → 3.19× near** |
| row 2 body | 0.66 | 0.959 | 12.51 | 48.0 → 4.0 | 3.84× → 3.13× |
| row 3 body | 0.82 | 0.978 | 12.27 | 48.0 → 4.0 | 3.91× → 3.07× |
| chapter description | 1.25 | 1.030 | 11.65 | 48.0 → 4.0 | 4.12× → 2.91× (**wrong sign**, §2B.1) |

**The disagreement is not constant — it inverts within every transit.** The copy's implied
horizontal depth crosses its implied vertical depth exactly once on the way in and once on
the way out, at `α = 0.940` for a `k = 0.5` block. With a smoothstep ramp that crossing lands
at **t = 0.327** of the way through the ramp. There is, per transit, a fleeting instant when
each block is honest geometry; the rest of the time it is a scripted move.

**In pixels, which is what a reviewer can actually check:**

| quantity | constant α (rejected) | **windowed α (approved)** |
|---|---|---|
| body block total on-screen lateral excursion | 100 px | **555 px** |
| display type | 216 px | (uncapped, larger) |
| vertical excursion, tanh-capped | ≤ 48 px peak-to-peak | ≤ 48 px peak-to-peak — **unchanged** |
| **horizontal : vertical excursion ratio** | 4.5 : 1 | **11.6 : 1** |

> **D11 raises the axis asymmetry by 2.6×.** That is the precise sense in which the copy is
> no longer honest geometry, and it is the number to put in front of the owner if he ever
> asks why it reads as a layer.

**Is it perceptually invisible? Probably, and here is the honest reason and the honest
caveat.** During a *vertical* scroll the observer's own commanded motion is vertical, so
vertical retinal motion is confounded with self-motion and depth-from-vertical-parallax is
heavily discounted; horizontal retinal motion is unconfounded and dominates. That is why an
11.6:1 asymmetry can read as depth rather than as shear. **This is a reasoned claim from the
structure of the cue, not a measured one** — no study was consulted and none is cited. What
settles it is a live A/B at α_edge 1.5 vs 3.0 on the same block, judged by eye; the lever is
one number in `traverseConfig`. **Put both in front of the owner at Stage 2.**

### 2B.3 The transport contract, restated for a rate that is no longer a constant

The rule from §8.2 ("one value read by both") is now **more** load-bearing, because the net's
lateral and the copy's lateral are no longer the same number times a constant — they are two
different functions. So the rule has to be stated on the *input*, not on the output:

> **THE CONTRACT. `apply()` writes ONE frozen frame snapshot:**
> ```
> traverseStore.frame = { active, scrollY, p, X_scene_px, L_scene_world }   // L = X_scene_px · k
> ```
> **Every consumer's offset is a pure function of that snapshot plus its own STATIC cached
> constants. No consumer may read `window.scrollY`, `performance.now()`, or a rect.**

Per consumer:

| consumer | derivation | reads |
|---|---|---|
| `NeuralLattice` rig ×2 | `rig.position.x = ±L_scene_world` (α ≡ 1.00, no window) | `L_scene_world` |
| `CrystalCluster` rig ×2 | same — the stone must not float off the net's plane | `L_scene_world` |
| **`vpTop` inside both islands** | `rect.docTop − frame.scrollY` — **not `window.scrollY`** (`NeuralLattice.tsx:358`, `CrystalCluster.tsx:443`) | `frame.scrollY` |
| DOM block `b` | `x = designLane_b + R_px · Â_b(u)`, `u = center_b − frame.scrollY − ih/2` | `frame.scrollY` + cached `center_b`, `α_b`, `U_in,b`, `U_out,b`, `designLane_b` |
| mask lane centre | §2B.4 — from the block's **final applied** `x` and `X_scene_px` | both |
| **ignition front `uFrontS`** (D13) | `s = frontSchedule(frame.p)` — §6.1B | `frame.p` |

Two consequences worth spelling out:

1. **The islands' `window.scrollY` reads become snapshot reads.** That is a one-line change
   each and it is not cosmetic: today the net's *vertical* comes from the island's own
   `scrollY` while its *lateral* would come from `apply()`'s. Under a windowed copy rate a
   one-frame vertical/lateral split inside the same object is exactly the kind of shear the
   design cannot afford. **Fallback**: off-band the snapshot is not being written, so the
   island reads `frame.active ? frame.scrollY : window.scrollY`.
2. **The snapshot cannot go stale mid-frame, and the reason is structural.** `scrollY` can
   only change through Lenis (whose `scroll` handler calls `ScrollTrigger.update()`,
   `smooth-scroll-provider.tsx:220-226`) or through the native listener under RM (which also
   calls it, `:168-178`). Both fire `apply()` before any paint. **So a changed `scrollY` has
   always fired `apply()`; an unchanged `scrollY` leaves the snapshot correct.** The dev gate
   is the assertion in §11 Stage 1: a frame counter written by `apply()` and by the island
   must never differ.

### 2B.4 `uCopyEdge` must track a FUNCTION now, not a constant — and the half-plane gate breaks

**Where the lane has to go.** The gate lives in the net's *local* x. The copy's local x is

```
copyLocalX(u,p) = ( designLane_b + R_px·Â_b(u) − cxBase − X_scene_px(p) ) / rect.w
```

`X_scene_px` runs to −1920 px = **−1.500 band widths**, and the block's own residual adds
**±0.196**. So **the lane centre sweeps 1.70 band widths across an act** (the storyboard's
"the mask lane SWEEPS", which is also what makes open decision J-7 more attractive — a faint
mesh behind the words would be a mesh in motion). Two things follow:

1. **The half-plane gate goes degenerate and must become a LANE.** The shipped gate is
   `gate = smoothstep(uCopyEdge, uCopyEdge + uCopySoft, localX)` — "dim everything left of
   the copy". Swept to local x ≈ +1.5 it dims the entire cloud; swept to −1.5 it dims
   nothing. This is the *same failure* round 9-B measured at narrow viewports
   (`neuralLatticeConfig.ts:1694-1725`: *"where the copy spans the band, 'dim everything left
   of the copy' means 'dim everything'"*), now reached by translation instead of by width.
   > **RULING: the gate becomes a two-sided lane centred on the copy** —
   > `gate = 1 − box(localX; uCopyLaneC, uCopyLaneW, uCopySoft)`, a `smoothstep` pair.
   > **Budget: `uCopyEdge` → `uCopyLaneC` (rename), `uCopySoft` kept, ONE new plain
   > `uniform()` scalar `uCopyLaneW`. Plain scalars join an existing shared group and add no
   > block (`neuralFieldCompute.ts:1038`, `:2560-2568`) — the 12/12 particle vertex stage and
   > the 8/12 line stage are both unmoved.**
   > **The AA ledger carries unchanged**: the mask is still `mix(FLOOR, 1, gate)·yTerm` with
   > the same `COPY_MASK_FLOOR 1e-4` (`:1824`), `COPY_MASK_FLOOR_LINE 3e-3` (`:1838`),
   > `COPY_Y_FLOOR 0.6` (`:1849`). A lane changes *where* the floor applies, not the floor,
   > and the brightest pixel under the copy is identical.
2. **One scalar, several blocks.** The lane can only follow one block. By the storyboard's
   own layout (copy occupies 23.2 % of the act in discrete moments separated by wordless
   travel) at most one copy block is in the reading zone at a time. **Rule: the lane follows
   the block with the smallest `|u|`.** That is a per-frame `min` over ≤10 cached numbers —
   allocation-free, no rect read.

**What the failure looks like if it lags.** The storyboard's stated tolerance is that a
**0.02 rate desync walks the lane 38 px off the text over a section** (0.02 × 1920). Under a
windowed α the tempting shortcut — computing the lane from a *linearised* α — is
catastrophic:

> If the lane is driven at α_read = 0.25 while the copy is at α_edge = 3.0, the rate error is
> **2.75**, and over the block's out-of-reading-zone travel on one side
> (`U_span − U_in = 243 px` of scroll) the lane walks **292 px off the text — 7.7× the stated
> tolerance**, on each side, symmetrically.

Visually that is: the block enters or leaves the frame **with the net at full brightness
directly behind it**, the dim lane trailing a third of a screen behind. It is worst at the
top and bottom of the frame, i.e. exactly where a reader's eye first lands on a block.

> **RULING: the lane centre must be computed from the block's FINAL APPLIED `x` — the same
> number written to its transform, in the same loop, in the same frame — never from a
> linearised α and never from a separate integrator.** Costs nothing: the value is already
> in a register.

### 2B.5 C¹ — mandatory, and the construction that gives it for free

Handoff **trap 11** is explicit: *"A hard `min()` ceiling on a moving wavefront flat-tops it.
Use a C1 soft knee."* (`2026-08-22-ROUND10-HANDOFF.md:184`.) The same discipline binds the
window's rate curve — and there is a second, subtler trap inside it.

**First: α must be a RATE, and the offset must be its closed-form antiderivative.** The
naive construction — multiplying the scene's offset by a position-dependent α,
`X_block = α(u)·X_scene(p)` — is catastrophically wrong, and it is worth the two lines of
arithmetic so nobody builds it:

```
d/dp [ α(u)·X_scene ] = α·(dX_scene/dp)  +  X_scene·(dα/du)·(du/dp)
```

The second term is the killer. At mid-act `X_scene ≈ 960 px`, and a smoothstep over a 108 px
ramp has max slope `1.5/108 = 0.0139` per px, times `Δα = 2.75` ⇒ `0.0382` per px. Times 960
⇒ **36 px of lateral per scroll px** — an 80× rate spike, arriving exactly as the block
enters the ramp. **The block would be flung sideways at the edge of the reading window.**

The correct construction integrates the rate. Because `u` is affine in `scrollY`
(`u = center_b − scrollY − ih/2`, so `du/dscrollY = −1`), the integral is closed-form:

```
α(|u|) = α_read + Δα · smoothstep(U_in, U_out, |u|)          Δα = α_edge − α_read

A(|u|) =  α_read·|u|                                              |u| ≤ U_in
       =  α_read·|u| + Δα·(U_out−U_in)·( t³ − t⁴/2 )              U_in < |u| ≤ U_out,
                                                                   t = (|u|−U_in)/(U_out−U_in)
       =  α_read·|u| + Δα·( |u| − ½(U_in+U_out) )                 |u| > U_out

Â(u)  =  sign(u) · A(|u|)                     (odd extension)

X_block(u) = designLane_b + R_px · Â(u)       R_px = lateral px per scroll px = tanθ
```

**Stateless, closed-form, teleport-safe** — a `PageDown`, an `End`, a `/#trust` anchor or
browser scroll restoration lands at the right `x` with no integrator to re-wind. (That is the
straddle discipline of `PostFXNodes.tsx:1150-1177` satisfied by construction rather than by a
detector.)

**Continuity, proved at every join.** `smoothstep(t) = 3t² − 2t³`, `smoothstep′(t) = 6t(1−t)`.

| join | α from the left | α from the right | dα/d\|u\| from the left | dα/d\|u\| from the right |
|---|---|---|---|---|
| `\|u\| = 0` | — | `α_read` | — | **0** (α is constant on `[0, U_in]`) |
| `\|u\| = U_in` (t = 0) | `α_read` | `α_read + Δα·0 = α_read` ✔ | 0 | `Δα·6·0·(1−0)/(U_out−U_in) =` **0** ✔ |
| `\|u\| = U_out` (t = 1) | `α_read + Δα·(3−2) = α_edge` ✔ | `α_edge` ✔ | `Δα·6·1·(1−1)/(…) =` **0** ✔ | 0 |

So **α is C¹ everywhere with zero slope at both boundaries**, hence `X = ∫α` is **C²** and
the block's lateral *acceleration* is continuous and zero at every join. No corner, no kick.

**The subtle trap: the `|u|` at the origin.** `α` is a function of `|u|`, and `|u|` has a
corner at `u = 0`. If the ramp started at `U_in = 0`, `α` would inherit that corner — the
block would kick sideways exactly as it crossed the viewport centre, i.e. in the middle of
the sentence being read. **`U_in > 0` is a correctness requirement, not a taste one**, and it
is satisfied automatically by the recommendation below. (`Â` itself is odd and continuous at
0 because `A(0) = 0`; its derivative there is `α_read`, finite and equal from both sides.)

**Recommended window, derived rather than picked.** Tie `U_in` to the block's own measured
full-legibility window `V` — already tabulated per block in the storyboard's §B3/§B4:

```
U_in  = V / 2                 // the block is fully legible for |u| < V/2
U_out = U_in + RAMP           // RAMP ≈ 108 px of scroll
α_read = 0.25 (body) / 0.50 (display)      α_edge = 3.00
```

At a ledger row (`V = 428` ⇒ `U_in = 214`, `U_out = 322`, block height 194 px, on-screen
half-span `U_span = 457`) the closed form gives:

```
E = 2·R·[ α_read·U_span + Δα·(U_span − ½(U_in+U_out)) ]
  = 2·0.4372·[ 0.25·457 + 2.75·(457 − 268) ]  =  554.4 px
```

— **which reproduces D11's approved 555 px to within 0.6 px, with α inside the reading zone
completely unchanged at 0.25.** That is the point of tying `U_in` to `V`: the entire gain is
bought outside the window the reader is using, so D11's "zero legibility cost" is
*structural* rather than empirical. Verify against the storyboard's own measurements:
constant α = 0.25 over the same span gives **99.9 px** (its 100–121 px, §D1) and constant
α = 0.50 gives **199.8 px** (its 199–242 px). ✔

**`RAMP` is the one free number** and it trades excursion against how abrupt the hand-off
feels: `U_out = 300` ⇒ 581 px, `U_out = 350` ⇒ 521 px. Put it on the dev handle.

**Interaction with the storyboard's per-block drift cap (§B2).** The storyboard caps a block
at `X_MAX = 1.5 em × lineCount` via `tanh`. **A `tanh` cap applied to `X` is C^∞ in `X` and
therefore preserves the C² of `Â`** — a composition of smooth functions. But it changes the
*effective* α (the cap's `sech²` derivative scales it), which is the second reason §2B.4's
lane must read the block's **final applied** `x` and not `Â(u)` raw. Getting that ordering
backwards puts the lane up to `X_MAX` off the text.

---

## PART 3 — CLIPPING AND OVERFLOW

### 3.1 The page body must never scroll horizontally — where the containment goes

**It already exists, and it is in the wrong mode.** Both traverse sections carry
`overflow-hidden` on the `<section>` today (`problem-section.tsx:352`,
`production-grade-section.tsx:377`), and there is **no `overflow-x` on `html` or `body`**
(`globals.css` base block, `:264-350` — only `html.lenis{height:auto}` and the RM block).
So a 1.5-screen translate inside those sections is already clipped and cannot grow
`documentElement.scrollWidth`.

The problem is that `overflow: hidden` **creates a scroll container**. Its `scrollLeft` is
settable, and the browser will set it — see §3.3. The fix is one word:

> **RULING: `overflow-x: clip` (not `hidden`) on the traverse section, `overflow-y: visible`,
> with the `y` axis left alone.**

`overflow: clip` clips at the overflow-clip edge and **does not create a scroll container at
all** (CSS Overflow 3). Three consequences, all of which we want:

1. **`scrollLeft` is not settable ⇒ the focus-scroll trap of §3.3 becomes structurally
   impossible**, rather than being patched by a `focusin` handler.
2. **`overflow-x: clip` does not coerce the other axis.** `overflow-x: hidden` *does*: a
   `visible` on the other axis computes to `auto`. That coercion is already documented in
   this repo, in the mobile-nav block: *"overflow-x is pinned hidden, overflow-y auto:
   setting only overflow-y would compute overflow-x from `visible` to `auto` and hand us a
   stray [scrollbar]"* (`globals.css:1107-1112`). `clip` has no such rule, so
   `overflow-x: clip; overflow-y: visible` is a legal, non-coercing pair.
3. **`position: sticky` descendants keep working.** A `hidden`/`auto`/`scroll` ancestor
   becomes the sticky element's scrollport, which silently kills sticky against the page.
   The repo already knows this and says so: *"NO overflow-hidden on the section — an
   ancestor overflow-hidden would defeat position: sticky; clipping lives on the sticky
   frame itself"* (`services-section.tsx:1295-1297`). `clip` does not create a scrollport,
   so a future sticky child inside a traverse section still sticks to the page. **We ship no
   sticky descendants here (D7), but `#problem` and `#trust` are the two sections most likely
   to grow one later, and `clip` costs nothing today.**

`overflow-clip-margin` is available if the storyboard wants a few px of bleed (e.g. so a
glow is not razor-cut at the edge); default `0px` clips at the padding box, which is what we
want.

The codebase already ships `overflow: clip` (GSAP's `.split-line-mask`, described at
`globals.css:455-460`), so it is not a new dependency.

**No `globals.css` edit.** The rule goes in the section's own file-scoped `<style>` block —
`problem-section.tsx` already has one (`PLROW_CSS`, injected at `:353`) and
`production-grade-section.tsx` has its twin.

### 3.2 The WebGL canvas is unaffected

The canvas is a separate `fixed inset-0` layer **behind** the DOM
(`CanvasHost.tsx:34`: `pointer-events-none fixed inset-0 z-0`). A DOM `overflow` on a section
clips DOM only. There are **no clipping planes and no scissor anywhere in `src/webgl/`** —
the round-10 dossier verified this (§1.3) and it re-verifies: the only `THREE.Plane` in the
tree is `HeroLogo.tsx`'s raycast plane. So the net may travel past the section's box edges
freely; "past the box" at a full-bleed anchor means "off-screen", which is free once the
lateral cull of §6.3 lands.

The `[data-lattice-anchor]` element is `absolute inset-y-0 left-[calc(50%-50vw)]
right-[calc(50%-50vw)]` (`problem-section.tsx:387-390`), i.e. full-bleed. Its own rect is
what the island reads, and it is **not** translated (see §3.4) — so `overflow-x: clip` on the
ancestor has no effect on it at all.

### 3.3 Keyboard focus on an off-frame row — the accessibility trap, and the fix

The ledger rows are focusable: `tabIndex={0}` on every `<article>`
(`problem-section.tsx:456`; twin in `production-grade-section.tsx`). Once a row is translated
1.5 screens off-frame, tabbing to it makes the browser run "scroll into view", which walks up
the ancestor chain scrolling every scroll container it finds. With `overflow: hidden` on the
section, that section **is** a scroll container, so the browser silently sets
`section.scrollLeft` — shearing the composition by an amount nothing in our code knows about,
and which nothing resets. The site has hit this before and patched it twice:
`fit-section.tsx:805-821` (*"Undo the browser's auto-scroll of the overflow:hidden sticky
frame BEFORE anything reads layout"*, `sticky.scrollTop = 0; sticky.scrollLeft = 0;`) and
`founders-rail.tsx:1944-2070` (`sticky.scrollLeft = 0`, then convert the focus into the
equivalent **vertical** scroll position).

**The fix here is two-layered, and the first layer is the real one:**

1. **`overflow-x: clip` removes the scroll container**, so `scrollLeft` cannot be set and
   the browser has nothing to shear. This is a structural fix, not a patch, and it is why
   §3.1 rules for `clip` over `hidden`.
2. **A `focusin` handler still converts the focus into the scroll position at which that row
   is on-frame** — because with the container gone, the browser will instead scroll the
   *page*, and the page's vertical position is exactly the traverse's clock. So:
   ```
   onFocusIn(e):
     row = e.target.closest('[data-ledger-row]');  if (!row) return
     // the p at which this row's authored x puts it inside the frame
     targetY = secTop + travel * pForRow(rowIndex)
     if (|scrollY − targetY| < 2) return
     lenis.scrollTo(targetY, { duration: 0.6 })
   ```
   This is `founders-rail.tsx:2054-2069` with the horizontal geometry replaced by the beat
   table. It is **mandatory**, not optional: without it a keyboard user can focus a row that
   is 1.5 screens off-frame and the browser's own scroll-into-view will land somewhere
   arbitrary (it optimises for the *vertical* box, which is already in view — so it may do
   nothing at all, leaving the focus ring invisible off-frame, which is the WCAG 2.4.11
   failure).
3. **`suspendSnap()` for the duration of the glide** — `smooth-scroll-provider.tsx:243-244`
   already does this for anchor clicks (1100 ms backstop). The traverse sections have zero
   snap candidates (§4.6) so this is belt-and-braces, but it costs one line.

**A11y state must match the visual, never lead it.** Nothing in the band is `inert` today;
the anchor div is already `aria-hidden` + `pointer-events-none` (`problem-section.tsx:388-389`).
If the storyboard wants an off-frame row to be un-tabbable, the row must be `inert` *only*
while it is off-frame, driven from the same `apply()` — and it must come back. The safer
default, and the one I recommend, is **leave every row in the tab order and make focus
scroll to it**; that is what the two shipped precedents do.

### 3.4 The measurement trap the translation introduces

`NeuralLattice` caches the anchor rect as `cxBase = r.left + r.width/2` and
`docTop = r.top + window.scrollY` (`:257`, `:279`), re-measured on
`[measureVersion, anchorId, size.width, size.height]` (`:291`). **`getBoundingClientRect()`
returns the *transformed* box.** So if the `[data-lattice-anchor]` element ends up inside the
translated wrapper, `cxBase` is polluted by whatever `x` happened to be applied at measure
time — and a measure can land at any scroll position (fonts, `ResizeObserver` on body,
`sersan:remeasure` from the language provider; `section-bus.tsx:87-119`).

> **RULE: the `[data-lattice-anchor]` element must NOT be a descendant of any translated
> wrapper.** The net's lateral comes from the rig, in world units; the anchor stays put.
> Same rule for `[data-line-anchor]` (page-level wrappers, `page.tsx:57-59, :75-77`) — those
> are already outside the section, so they are safe, but the constraint should be written
> down.

If a translated wrapper ever *must* be measured, the idiom is already in the file:
`measureDriftEntry` subtracts the currently applied offset before caching
(`lusion-type.ts:617`: `en.center = r.top + scrollY + r.height/2 − en.dy`). Copy that, do not
re-derive it.

---

## PART 4 — SECTION GROWTH: WHAT RE-MEASURES, AND WHAT DOES NOT

D10 grows `#problem` 1330 → ~4392 px and `#trust` 1475 → ~4284 px; the home document goes
21459 → ~27330 px (+27.4 %), 29.8 → 38.0 viewports.

### 4.1 Re-measures automatically — verified, no code

| system | why | citation |
|---|---|---|
| `SectionBus` spans (doc fractions of every `[data-line-anchor]`) | measures on mount, t+700, t+1600, `fonts.ready`, debounced resize, a `ResizeObserver` on `document.body`, and the `sersan:remeasure` event; `setMeasured` skips the version bump when nothing moved | `section-bus.tsx:50-119`, `sectionStore.ts:128-151` |
| **signature-curve waypoints** | every home waypoint is `anchor`-glued, resolved to the span **midpoint** `(start+end)/2`, and the geometry is rebuilt whenever `measureVersion` or `measuredPath` changes | `routeCurves.ts:46-59`, `SignatureLine.tsx:659-694`, `:171-181` |
| `DriftParticles.worldLen` | `= anchors.scrollHeight · k`, rebuilt on `anchors.version` | `DriftParticles.tsx:197`, `:270` |
| **cut boundaries** (`PostFXNodes`) | `deriveCutBoundaries` re-runs on a `measureVersion` bump and remaps doc fractions into progress space from the fresh `scrollHeight`/`innerHeight` | `PostFXNodes.tsx:1103-1135` |
| the **cut window** | `halfWindow = 0.5·iH/limit` — one viewport of scroll **in px**, by construction, regardless of document height | `:1118` |
| every ScrollTrigger with `invalidateOnRefresh` | services / fit / founders / spine / audit all re-derive `secTop` + `travel` in `onRefreshInit` | `services-section.tsx:909-916` etc. |
| **snap candidates** | all are lazy getters over live `secTop` (`snapElement` and `[data-snap]` were deleted in round 8-A; `elements` is a permanent 0) | `scroll-snap.ts:25`, `:267-270`; `founders-rail.tsx:2032-2041` |
| `[data-lattice-anchor]` band rects | island effect keyed on `[measureVersion, anchorId, size.width, size.height]` | `NeuralLattice.tsx:291`, `CrystalCluster.tsx` twin |
| per-row `createReplayTrigger` | `start:"top bottom" / end:"bottom top"` on each row; with rows spread over 4392 px they now enter **one at a time** instead of nearly together — strictly better than today | `lusion-type.ts:178-192` |

**Cut-boundary clamp check.** `maxH[i]` = half the distance to the nearest other boundary
(`PostFXNodes.tsx:1124-1132`). `problem→case-studies` and `case-studies→services` are
separated by `#work`'s 2283 px, which D10 does not change ⇒ `maxH ≈ 1141 px > 720`, no clamp,
before or after. `services→production` and `production→founders` are separated by `#trust`,
which **grows** ⇒ `maxH` grows ⇒ still no clamp. **No cut retiming is needed.** (This is the
one round-10 finding, §0B.4-(d), that survives verbatim.)

### 4.2 Does NOT re-measure — the list to act on

1. **`NEURAL_DEPTH_SCALE_FACTOR = 1.0` ties the cloud's DEPTH to the anchor's HEIGHT.**
   `zWorld = rect.h · k · NEURAL_DEPTH_SCALE_FACTOR` (`NeuralLattice.tsx:373`,
   `neuralLatticeConfig.ts:1581`). At today's 619 px band that is `zWorld = 9.62`, node
   world-z `±1.92`, camera distances `[10.08, 13.92]` — the numbers §2.1 rests on. **If the
   anchor grows with the section, this breaks catastrophically:**

   | anchor `rect.h` | `zWorld` | node world-z | camera distance range |
   |---|---|---|---|
   | 619 (today) | 9.62 | ±1.92 | [10.08, 13.92] ✔ |
   | 1440 | 22.38 | ±4.48 | [7.52, 16.48] — near-node fill ×2.55 |
   | 2160 | 33.57 | ±6.71 | [5.29, 18.71] — near-node fill ×5.15 |
   | 4392 | 68.26 | ±13.65 | **[−1.65, 25.65] — nodes BEHIND the camera** |

   > **FIX: make the depth viewport-relative, not band-relative.**
   > `zWorld = WORLD_VIEW_HEIGHT · NEURAL_DEPTH_SCALE_FACTOR` with the factor re-based to
   > `9.6215 / 11.191384 = 0.8597`. That reproduces today's depth spread **exactly, at every
   > band height and every viewport**, and makes §2.1's table a constant of the site rather
   > than an accident of one section's height. One line in `NeuralLattice.tsx:373`, one
   > constant re-valued. `DEPTH_Z_RANGE = PLEXUS_RZ` (`:1493`) normalises the aerial/DOF cue
   > over **local** z, so it is untouched by this.

2. **`CRYSTAL_SCALE` is a fraction of `rect.h`** — **CONFIRMED BY THE CRYSTAL REVIEW, AND
   THE FIX IS ALREADY WRITTEN DOWN.** `s = rect.h · k · feel.scale · scaleMul`
   (`CrystalCluster.tsx:509`) and its projection twin `pxScale = rect.h · feel.scale ·
   scaleMul` (`:715`). `CRYSTAL_SCALE = 0.115` is committed (`crystalConfig.ts:360`); at a
   4392 px band the slab renders **1677 px** — the review reproduced this dossier's number
   independently (`crystalConfig.ts:405-407`).

   > **THE FIX, one line in each of TWO places that MUST move together** — swap `rect.h` for
   > `ih` (`size.height`, already in scope at both sites); if only one moves, the callout
   > projection detaches from the render, which is the twin rule that put the same
   > `feelC.scale` at both sites in the first place:
   > ```
   > const s       = ih * k * feelC.scale * scaleMul;   // was rect.h * k * …
   > const pxScale = ih     * feelC.scale * scaleMul;   // was rect.h     * …
   > ```
   > **`C_vp = CRYSTAL_SCALE · rect.h / ih = 0.115 · 725/900 = 0.0926`** ⇒ slab = **30.8 % of
   > VIEWPORT height at every viewport and every band, forever** (`crystalConfig.ts:409-425`).
   > Pleasing consequence: `k = WORLD_VIEW_HEIGHT/ih`, so `s` collapses to the constant
   > `WORLD_VIEW_HEIGHT · C_vp · scaleMul = 1.0368 · scaleMul` — the stone becomes a fixed
   > **world** size. That is the same shape as D12's result for the lateral (§2B.0): once a
   > quantity is authored against the viewport, `ih` cancels and it becomes a world constant.

   **THREE THINGS THE RE-BASE DOES NOT SOLVE**, from the review's audit
   (`crystalConfig.ts:429-470`) — all three belong in the change list and the risk register:

   | constant | keyed to | what a 4392 band does | resolution |
   |---|---|---|---|
   | **`CRYSTAL_POS.y`** (`:297`) | band | the `+0.06` offset goes **44 px → 264 px** | viewport-keyed equivalent **0.0483** |
   | **the `a` scalar** (`CrystalCluster.tsx:515`, `a = (vpTop + rect.h/2 − ih/2)/ih`) | band | spans **±0.90 today, ±2.94 at 4392** ⇒ the tumble runs to **355°** (was 102°) — the stone spins nearly a full turn. It also drags **`CALLOUT_VIS_WINDOWS`** and **`PLEXUS_CONNECT_WINDOW` (`:2099`)**, which are windows *on* `a` | **needs a decision, not a constant**: clamp `a`, or measure it from the stone's own **viewport-sized** window instead of the band centre. **This is the worst of the three.** |
   | **`FOG_RADIUS_Y`** (`:2077`, 0.311) | band | 1366 px world-y radius; and if the stone goes viewport-keyed while this does not, the fog **corner radius collapses 0.614 → 0.101** and the stone sits on its own bright core — the "glowing blob" failure, back | **`FRY_vp = 0.311 · 725/900 = 0.2505`**, restoring the y-term to 0.6138. **Must move in the SAME commit as the stone.** |

   Safe by inspection (same audit): `FOG_RADIUS_OUT` (width-keyed, its x-term of `r` is
   preserved automatically because `C_vp·ih ≡ CRYSTAL_SCALE·rect.h` at the reference),
   `FOG_CLEAR` + the a11y geometry, `CALLOUT_LABEL_OFFSET_PX` (47 px is 47 px),
   `CALLOUT_LEFT_MIN/MAX`. `CALLOUT_EDGE_MIN/MAX` stays correct as a percentage but its guard
   band in px triples. Note also `crystalConfig.ts:1771`: `RIPPLE_FREQ` documents a
   `rect.h ≥ 649 px` threshold — a fourth, quieter band dependency.

   **Do not land two competing definitions of `CRYSTAL_SCALE`.** The review owns the constant;
   this dossier owns the reason the band grew.

3. **`BAND_ASPECT = 0.45` is build-time topology** (`neuralLatticeConfig.ts:247`, used at
   `:410`, `:431`, `:445` to put local x into height units before measuring a distance).
   Today's bands are 0.484 / 0.525 — within 8 %. The config's own defence is *"a real band
   that is a bit wider/narrower just stretches the same plexus"* (`:240-246`), and that
   defence holds for 8 % and does not hold for what D10 asks:

   | band | true `rect.h/rect.w` | vs `BAND_ASPECT 0.45` |
   |---|---|---|
   | today `#problem` 1280×619 | 0.484 | ×1.08 ✔ |
   | 390×844 portrait (round-10's case) | 2.164 | ×4.81 ✘ |
   | **a 4392 px anchor at 1280 wide** | **3.431** | **×7.62 ✘✘** |

   At ×7.6 the near-neighbour graph picks almost entirely the wrong axis and the crystal
   density well carves an ellipse 7.6× wrong in aspect. **This is now the dominant sizing
   risk, larger than the phone case that round-10 flagged.** The ruling is the round-10
   ruling with a bigger number behind it: **`BAND_ASPECT` becomes a parameter of
   `buildPlexus`, and `getPlexus(mode, density)` gains an `aspectBucket` in its cache key**
   (`:365-375`); the bucket goes into the island's build-effect deps (`NeuralLattice.tsx:198-243`),
   quantised exactly like `DriftParticles`' `widthBucket` and for the reason stated there
   (`DriftParticles.tsx:262-272`). `neural-graph-fallback.tsx` must consume the same bucket
   or the SVG and the WebGL draw different graphs at the same viewport.

4. **`uPlaneAspect = rect.h / max(rect.w,1)`, written per frame** (`NeuralLattice.tsx:596`).
   It feeds the camera-facing star geometry (`neuralFieldCompute.ts:1668`, `:2323`). It
   tracks the rect automatically, so it is *correct* — but it will be tracking a 3.43 aspect
   instead of 0.48, which stretches the sprites' local-x term by 7×. Same root cause as (3);
   it needs the same decision about what the band's aspect is *supposed* to be.

5. **Cloud extent vs the run.** `PLEXUS_CX 0.03`, `PLEXUS_RX 0.48` (`:252-253`) put the cloud
   at local x ∈ [−0.45, +0.51] — **0.96 of the band width, i.e. one screen**. A 1.5-screen
   lateral run therefore **evacuates the cloud completely**; by `p ≈ 0.78` there is nothing
   of it left on frame. That is a legitimate reading of D9 ("what you see at the start is
   gone by the end") and it is what makes fill *fall* (§6.2) — but it is a composition fact
   the storyboard must own, and the mechanism cost of the alternative is priced in §6.4.

6. **`DriftParticles` mote count is fixed** (3000 at full) while `worldLen` grows 27.4 % ⇒
   the dust thins by 21.5 % across the whole page. `count` is a build-time prop; raising it
   costs one instanced buffer rebuild on `anchors.version`, which already happens. Flag to
   the storyboard, not a break.

7. **The signature curve gets straighter through the two acts.** The waypoint x amplitude is
   `wp.x · worldViewWidth · 0.45` (`SignatureLine.tsx:172`) and does not scale with the
   document; the vertical run between `problem` and `case-studies` triples. So the tube's
   serpentine through the neural sections flattens from a swing to a near-vertical run.
   Automatic, visually consequential, **verify by eye at Stage 1** (`__sersanLineDebug.bboxY`).

8. **The provider does not run the refresh cadence on `/`.** *"We do NOT run the refresh()
   cadence on '/': the homepage cinematic owns its own refresh + intro gate"*
   (`smooth-scroll-provider.tsx:104-106`). `fit-section.tsx:824-838` and
   `founders-rail.tsx:2045-2051` each own a one-shot `ScrollTrigger.refresh()` after
   `fonts.ready`. **The traverse sections must own theirs too**, or a font swap that reflows
   the content above them leaves `secTop` stale for the whole session.

9. **Anchor landing.** `/#trust` is deep-linked from `footer.tsx:71` and
   `start/start-client.tsx:233`, and lands via `lenis.scrollTo(dest, { offset: −72 })`
   (`smooth-scroll-provider.tsx:245`) against a section that also carries `scroll-mt-24`
   (96 px) under an `html { scroll-padding-top: calc(84px + safe-t) }` (`globals.css:273`).
   Three different compensations for one bar. Under the traverse this lands 72 px *above*
   `secTop`, i.e. `p` clamps to 0 — **which is the correct landing**, and strictly better
   than what the sticky design would have done. The inconsistency is inherited, not created;
   flag it, do not fix it in this round.

### 4.3 Nothing hard-codes a section height or a doc fraction on the home route

Verified: the home route curve's only literal `at:` is the leading `{ at: 0.0, ... }`
(`routeCurves.ts:45`); every subsequent waypoint is `anchor`-glued (`:46-59`). Both traverse
sections use only `section-lg scroll-mt-24 overflow-hidden` — no `vh`, no `min-h`, no
`h-screen` (`problem-section.tsx:352`, `production-grade-section.tsx:377`). `section-lg` is
padding only (`globals.css:486-496`).

### 4.4 Where the extra height should come from — the one decision this forces

The `[data-lattice-anchor]` div is `absolute inset-y-0` of the rows stack
(`problem-section.tsx:387-390`), so **whatever makes the rows stack taller makes the anchor
taller**, and §4.2 (1)(2)(3)(4) all fire. Three shapes, with costs:

| shape | anchor `rect.h` | cost |
|---|---|---|
| **(a) grow the rows' own spacing** (padding between the three `<article>`s) | ~4100 px | all four `rect.h` couplings fire; net is 5.1 viewports tall, 103 nodes spread over it, 9000 particles ~6× sparser |
| **(b) give the anchor an explicit height** (`h-[100svh]` or a measured px) and grow the rows around it | ~720–1200 px | every constant keeps today's value; but the net is on frame for only ~2 of the 6.1 viewports — it enters, crosses, and leaves. Cheapest by far. |
| **(c) decouple the group scale from the rect on all three axes** — `group.scale.set(spanX·worldViewWidth, spanY·WORLD_VIEW_HEIGHT, spanZ·WORLD_VIEW_HEIGHT)` with the spans authored in **viewport units**, the rect used only for vertical placement + the cull | free choice | ~6 lines in `NeuralLattice.tsx:371-380`; makes the rendered aspect `spanY/spanX` a **known build-time constant**, which *subsumes* the `BAND_ASPECT` parameterisation of §4.2(3) into a single number instead of a runtime bucket. Strictly the best answer, and the one I recommend. |

Under (c), the storyboard picks `spanX` and `spanY` in viewport units; the cloud's world size
is then viewport-relative and identical at every band height, and `BAND_ASPECT` becomes
`spanY·ih / (spanX·vw)` — still viewport-dependent, so the bucket is still needed, but its
*range* collapses to whatever the two spans allow rather than tracking an arbitrary DOM box.

**This is an owner-visible decision** (it changes how big the net looks), so it belongs in
the storyboard's hands with these costs attached, not in mine.

---

## PART 5 — THE ISLANDS' RIG

*Carried forward from `2026-08-22-round10-journey-mechanism.md` Part 2.3, re-aimed laterally.
The camera-lock audit in that dossier's §2.2 is unchanged and is the reason this design has
no alternative.*

### 5.1 Why nothing else can move these four islands (predecessor, §2.2 — unchanged)

`NeuralLattice.tsx:374-378` and `CrystalCluster.tsx:500-505` both compute

```
group.position = camera.position + camera.quaternion · ( (cx−vw/2)·k , (ih/2−cy)·k , −CAMERA_Z )
group.quaternion = camera.quaternion
```

A group re-derived from the camera pose every frame is **exactly invariant under camera
translation and camera rotation**, and a world-root translation is a no-op for it because it
is not parented to any world root. So the participating set — `NeuralLattice` ×2,
`CrystalCluster` ×2 — cannot be moved by any camera write, and the traverse must live one
level down. `SignatureLine` remains the only camera writer and **changes by zero lines.**
Two islands travel for free and need no code at all: the signature tube
(`SignatureLine.tsx:174-180`, world-anchored) and `DriftParticles`
(`:230-236`, world-anchored, `z ∈ [−4,+2]`).

### 5.2 The rig, and where it sits

```
<group ref={groupRef}>        // camera-locked position + quaternion; scale = 1        ← HUD anchor
  <group ref={rigRef}>        // TRAVERSE: rigid translate (WORLD units) + rigid rotate
    <group ref={scaleRef}>    // scale = (wWorld, hWorld, zWorld)   ← moved off groupRef
      <group ref={innerRef}>  // existing auto-orbit + pointer parallax, untouched
        …meshes
```

Today the anisotropic scale lives on `groupRef` (`NeuralLattice.tsx:380`:
`group.scale.set(wWorld, hWorld, zWorld)` = `(19.8958, 11.1914, 11.1914)` at a 1280×720 band
with `rect.h = ih`). The JSX today is `<group ref={groupRef}><group ref={innerRef}>…`
(`:787-788`) — two levels; the rig makes four.

**`CrystalCluster` needs no restructure**: its scale is already uniform
(`group.scale.setScalar(s)`, `:506`), so a rig on either side of it is rigid. One island
changes shape, the other does not.

### 5.3 How the anisotropy affects a **lateral translation** — the question the task asks

Under `S = diag(wWorld, hWorld, zWorld)`, a child translation `t` renders as
`(t.x·wWorld, t.y·hWorld, t.z·zWorld)`. **A diagonal scale does not mix axes, so a pure
axis-aligned translation is not sheared — its DIRECTION is preserved. What changes is the
MAGNITUDE per local unit, which differs per axis by exactly the viewport aspect**
`wWorld/hWorld = w/h` (1.7778 at 1280×720, 0.4621 at 390×844).

Three consequences, and they are why the rig still has to move:

1. **A pure lateral authored in local x-fractions-of-band-width is accidentally correct.**
   `t.x = 1.5` inside the scale renders as `1.5·wWorld = 1.5·rect.w·k` world units = `1.5·vw`
   px when the anchor is full-bleed. So if the run were *only* lateral and the scale stayed
   coupled to the rect, the rig could live inside the scale and be right. **Do not rely on
   this.** It stops being true the moment §4.4(c) decouples `wWorld` from `rect.w`, and it is
   a coincidence, not a contract.
2. **Any depth component of the run is sheared.** A local `t.z` unit is `zWorld`, a local
   `t.x` unit is `wWorld`; their ratio is the viewport aspect. An authored "forward drift
   while sliding left" would therefore change its angle in the x–z plane by 1.78× on desktop
   and 0.46× on a phone — a 3.85× swing across the viewport range.
3. **Any yaw is a rotation-then-stretch, not a rotation** — the predecessor's finding
   (§0B.3), re-verified here at the same numbers. Under `S·R(θ)` the rendered angle is
   `atan(tan θ · wWorld/hWorld)`:

   | authored yaw (D2's mirrored heading) | rendered at 1280×720 | rendered at 390×844 |
   |---|---|---|
   | Act I **−7.7°** | **−13.52°** (1.76× too strong) | **−3.57°** (0.46× too weak) |
   | Act II **+6.3°** | **+11.10°** | **+2.92°** |

   and the cloud's silhouette visibly stretches and un-stretches as θ ramps — a breathing
   distortion, not a rotation.

> **RULING (unchanged from the predecessor, now with the lateral case answered): the rig sits
> OUTSIDE the anisotropic scale and expresses its translation in WORLD units.** Then the
> lateral is `L = X·k` regardless of what the scale is doing, the yaw is a genuine rotation
> at every viewport, and a depth component is honest. Six lines.
>
> The dev handle's `project()` reads `groupRef.position` (`NeuralLattice.tsx:775-781`) and is
> unaffected by the restructure — it still projects the anchor point, which is what the
> QA gate of §10 Stage 1 needs.

**Footnote, from the predecessor, still live**: `COPY_EDGE_PAD`'s derivation
(`neuralLatticeConfig.ts:1766-1779`) computes the inner group's rotational drift as
`0.2·sin(0.09) = 0.018 of band width`, mixing a height-fraction with a width-fraction. The
true drift in width fractions is `0.018 · (h/w) = 0.0087` at 1280, so the shipped pad is ~2×
conservative — which is why the shipped ±0.09 rad orbit has never shown the bug. At 0.134 rad
(7.7°) it would.

### 5.4 Two small edits the traverse forces inside the islands

**(a) `uCopyEdge` stops being a constant and becomes a driven value — but does NOT get
retired.**  ⚠ **REVISED BY D11 — §2B.4 is the live version.** The conclusion below (drive the
value, keep the formula, zero new blocks) survives; two things in it do not. First, the
magnitudes are computed at the rejected constant ρ = 0.94 and are ~5× too small: the real
excursion is 555 px (D11) and the lane centre sweeps **1.70 band widths**, not 0.090. Second,
a half-plane gate swept that far is **degenerate** — it must become a two-sided **lane**
(one extra plain scalar, still zero blocks). Read §2B.4; the paragraph below is kept because
its budget argument is the one §2B.4 inherits. It is written once per measure, in a `useEffect` on `[build, rect]`
(`NeuralLattice.tsx:296-299`: `build.uniforms.uCopyEdge.value = rect.copyEdge + COPY_EDGE_PAD`),
deliberately not per frame *so the dev handle stays tunable between measures*. Under the
traverse the copy moves relative to the net by `(1−ρ)·X` px — **115.2 px at ρ 0.94 over a
1920 px run, which is 0.090 of the band width against a `COPY_EDGE_PAD` of 0.035**
(`:1779`). The static edge is 2.6× too small by the end of the act, and by then the copy may
have left the frame entirely while the gate keeps dimming where it used to be.

The fix is *smaller* than round-10's mask swap, not larger: **keep the formula, drive the
value.** `uCopyEdge ← rect.copyEdge + COPY_EDGE_PAD + (ρ−1)·X·k / wWorld_local` written from
the island's existing `useFrame` off the published lateral, with a `feel.copyEdgeOverride`
escape so the dev handle still wins (the `CrystalCluster` `feel` handle is the precedent,
`:494`). **Zero new uniforms, zero new blocks, and the entire shipped AA ledger carries
unchanged** — the mask is `mix(FLOOR, 1, gate)·yTerm` with `COPY_MASK_FLOOR 1e-4`
(`:1824`), `COPY_MASK_FLOOR_LINE 3e-3` (`:1838`), `COPY_Y_FLOOR 0.6` (`:1849`), none of which
move.

**(b) A lateral term in the cull.** Today's cull is vertical-only:
`if (vpTop + rect.h < −CULL_PAD || vpTop > ih + CULL_PAD) { group.visible = false; return; }`
(`NeuralLattice.tsx:364-368`, `CrystalCluster.tsx:452-456`; `CULL_PAD = 220`, `:149`). Every
mesh is `frustumCulled = false` (`NeuralLattice.tsx:796, 804, 817`; `CrystalCluster.tsx:1002,
1012`; `neuralFieldCompute.ts:2806`) — which is what makes the rig safe against a stale
bounding sphere, and also what means **a net that has travelled 1.5 screens off-frame is
still submitting ~9000 sprites and a 227-segment `LineSegments` every frame.** Add:

```
const cxNow = cx + lateralPx;                    // lateralPx = X_scene_px (the net rides α = 1)
if (cxNow + rect.w/2 < -CULL_PAD || cxNow - rect.w/2 > vw + CULL_PAD) { group.visible = false; return; }
```

Two comparisons, hoisted numbers, no allocation.

---

## PART 6 — BUDGET

### 6.1 UBO blocks, varyings, TSL — the traverse costs ZERO of each

- **The rig is a scene-graph transform.** `buildVertex` already reads
  `modelViewMatrix.mul(vec4(center,1))` (`neuralFieldCompute.ts:2203`), so the traverse
  reaches the shader through the model matrix and needs **no shader input at all**.
- **Particle vertex stage stays 12 / 12**, the zero-headroom WebGL2 floor documented at
  `neuralFieldCompute.ts:952-968` (nine `uniformArray`s — `uNodePos`, `uNodeT`, `uEdgeA`,
  `uEdgeB`, `uRingGlow`, `uRingFlash`, `uRowGlow`, `uStrandPhase`, `uStrandThick` — plus
  three's own object/render/frame shared groups). **Untouched.**
- **Link-line vertex stage stays 8 / 12**; varyings stay 4 of the `MAX_VARYING_VECTORS`
  floor of 15 (`:2560-2568`). **Untouched.**
- `uCopyEdge` already exists and is a plain `uniform()` scalar (§5.4a). **Net block delta: 0.
  Net varying delta: 0.**
- **Cross-backend**: nothing new. If the storyboard asks for a look change it must use only
  the ops already proven in `PostFXNodes.tsx` / `neuralFieldCompute.ts` — `Fn`, `select`,
  `mix`, `smoothstep`, `uniform`, `uniformArray().element()`, `If` on uniform control flow.
  Hard line, from `neuralFieldCompute.ts:79-80`: `.element()` on a **storage** buffer is
  compute-stage-only (three #31221); `uniformArray().element()` is legal in any stage.
- **UBO *size*** stays comfortable at today's counts (`uEdgeA/B` are the largest at
  `227·16 = 3632 B` vs the WebGL2 `MAX_UNIFORM_BLOCK_SIZE` floor of 16 KiB, ~22 %,
  `:940-948`). If §6.4's option B is taken and node/edge counts rise 2.5×, `uEdgeA/B` reach
  `9088 B` = **55 % of the floor** — still under, but the margin halves, and that is worth
  knowing before anyone doubles it again.

### 6.1B The ignition front (D13) — 2 plain scalars, ZERO blocks, ZERO varyings

D13 approves a value-field wavefront sweeping the net **top-right → bottom-left at 23.6°,
once per gap between copy blocks**, because geometry cannot descend (a downward scroll moves
content up) and light has no such constraint.

**The construction that makes it cheap AND correct: define the front in SCREEN space, from
the clip position that `buildVertex` already computes.** `neuralFieldCompute.ts:2205` already
evaluates `clip = cameraProjectionMatrix.mul(mv)`. From it:

```
ndc   = clip.xy / clip.w
fx    = ndc.x * (uViewport.x / uViewport.y)      // uViewport already exists, :983
coord = fx·(−cosθ) + ndc.y·(−sinθ)               // θ = 23.61°, travel dir top-right→bottom-left
front = exp( −((coord − uFrontS) / uFrontW)² )   // a TRAVELLING BAND, not a state boundary
```

Three properties fall out, and the second and third are the non-obvious ones:

1. **No aspect correction is needed inside the local frame.** Defining the front on the
   *local* plane would require compensating the anisotropic group scale — the angle would
   have to be `atan(tanθ · wWorld/hWorld)`, i.e. the same 1.78×/0.46× shear as §5.3, and the
   only reason `uPlaneAspect` (`NeuralLattice.tsx:596`) would be needed. In screen space it
   is exactly 23.6° on every viewport by construction.
2. **No motion compensation is needed.** In the local frame the front would have to be
   authored *against* the net's own motion: the net rises 1 px and slides 0.437 px left per
   scroll px, so a front asked to descend at 23.6° would need a local velocity of
   `(−1.81, +1.98)` px per scroll px — **a two-component solve that changes every time the
   traverse rate does.** A screen-space front is independent of what the geometry is doing,
   which is precisely D13's point: *the bright thing runs the way he described it, whatever
   the geometry is doing.*
3. **It must be a TRANSIENT BAND, not a swept state boundary.** With a `smoothstep` edge,
   `s` sweeping from `+2.03` to `−2.03` (the coord half-range at 1280×720 is **2.029**, so a
   full crossing is **4.06** plus the band width) ends with *every* node ignited, and the
   reset to the next gap flips the whole frame off in one frame — a full-frame flash. A
   Gaussian/`smoothstep`-pair **band** leaves everything outside it at the rest value, so the
   sawtooth reset happens entirely off-frame and is invisible. **This is the D13 twin of
   §2B.5's C¹ requirement and of handoff trap 11: a discontinuity in a swept field is a pop.**

**Speed, worked at Act I's first gap (571 px of scroll, `crystalConfig`-independent):**
`ds/dscrollY = (4.06 + 2·uFrontW)/571 = 0.00886` per scroll px at `uFrontW = 0.5`
⇒ **3.19 px per scroll px** along the travel axis ⇒ a **1.28 px/scroll px descent** on screen.
Content rises at 1 px/scroll px, so the front's motion **relative to the geometry** is
2.28 px/scroll px and its absolute screen motion is downward. ✔ The owner's descending
diagonal, delivered by light.

**Budget — the answer to the coordinator's question is yes, it is free:**

- **`uFrontS` + `uFrontW` = 2 plain `uniform()` scalars.** Plain scalars join three's existing
  shared groups; only a `uniformArray` emits its own UBO (`neuralFieldCompute.ts:952-955`).
  **The particle vertex stage stays 12 / 12 — the zero-headroom WebGL2 ceiling stands
  unmoved.** The link-line stage stays 8 / 12.
- **Zero new varyings** if `front` is folded into the existing value/alpha term in the vertex
  stage, which is where `particleScalars` already runs (`:952-968` — *"which runs vertex-side
  because its outputs feed varyings"*). If a separate channel is ever wanted, the line
  material has 11 free slots against the `MAX_VARYING_VECTORS` floor of 15 (`:2560-2568`).
- **Zero new TSL ops**: `exp`, `smoothstep`, `mul`, `div`, `dot` are all in the proven
  cross-backend set.
- **Fill: unchanged.** The front modulates a value, not a size; `sizeNode` is untouched.
- Together with §2B.4's `uCopyLaneW`, the traverse's total shader-visible cost is
  **3 plain scalars, 0 blocks, 0 varyings, 0 storage buffers.**

**Where `s` is written**: the island's existing `useFrame`, off `frame.p` from the snapshot
(§2B.3). **No new `useFrame`, no new subscriber, no new store.**

### 6.2 Fill — peak fill **falls**, it does not rise

This is the finding that most distinguishes the diagonal from the dolly it replaced.

`sizeNode = uPointSize · uPixelRatio · sizeK · depthK / max(dist, 0.001)` with
`dist = −(modelViewMatrix · center).z` (`neuralFieldCompute.ts:2207-2211`), and the quad
offset is added in **clip** space (`:2234`), so the sprite's screen area depends on `dist`
and nothing else in the model matrix. **A pure lateral translation leaves `dist` exactly
unchanged ⇒ per-sprite screen area is exactly unchanged.** (Contrast the round-10 dolly,
where `d = 5.16` gave a `(12/5.16)² = 5.41×` fill multiplier.)

What changes is *how many* sprites are inside the viewport. The cloud spans local
x ∈ [−0.45, +0.51] (§4.2-5) = 0.96 vw, centred on the viewport; the overlap with the frame as
it slides:

| lateral offset | cloud spans (in vw) | overlap with viewport | fraction of cloud on frame |
|---|---|---|---|
| 0 | [0.08, 1.04] | 0.92 vw | **96 %** ← peak, and it is today's shipped rest pose |
| −0.25 vw | [−0.17, 0.79] | 0.79 vw | 82 % |
| −0.50 vw | [−0.42, 0.54] | 0.54 vw | 56 % |
| −1.00 vw | [−0.92, 0.04] | 0.04 vw | 4 % |
| −1.50 vw | [−1.42, −0.46] | 0 | **0 %** |

and because the cloud is centre-dense (`PLEXUS_RADIAL_POW 2.2`, `:256`) the on-screen
*count* falls faster than the width once the core exits.

> **Peak fill is at `p = 0`, which is exactly today's shipped worst case. The traverse is
> monotonically cheaper than the frame the site already renders.** With the lateral cull of
> §5.4b, the tail of each act is nearly free.

### 6.3 `AdaptiveResolution` / DPR — a **stability** cap, not a fill cap

`AdaptiveResolution` steps `setDpr` inside `[min, effMax]` from drei's `PerformanceMonitor`,
and **each change reallocates the swapchain + the PostFX render targets — "a brief hitch,
fine occasionally"** (`AdaptiveResolution.tsx:16-21`). Since the traverse's load *falls*
through each act, the monitor's natural response is to **climb** DPR mid-film, and every
climb is a hitch inside a cinematic beat. That is the opposite justification from round-10's
(which capped a *rising* fill), and it points at the same instrument:

> Arm `useTierStore.getState().setDprCap(currentDpr)` on the band-enter edge and release it
> (`setDprCap(null)`) on leave. The purpose is to **freeze the ceiling for the duration of
> the film** so no realloc lands inside it; a genuine decline can still drop DPR, which is
> correct. `setDprCap` already exists (`tierStore.ts:597-598`) and is already consumed
> (`AdaptiveResolution.tsx:52-56, :71-80`), so `tierStore.ts` changes by zero lines.
> Precedent with hysteresis: the passage's `SEQ.DPR_CAP = 1.5` armed at `p > 0.85`, released
> at `p < 0.82` (`seqStore.ts:228-230`, `singularity-passage.tsx:1541-1548`) — copy the
> hysteresis gap so the cap itself cannot chatter.
>
> **Do not step DPR per beat. One cap per act, or none.**

Phones at `fxBudget.level === 2` are additionally covered by Lusion's pixel cap
`sqrt(maxPixels/(w·h))` (`AdaptiveResolution.tsx:57-70`).

### 6.4 If the storyboard wants the frame populated for the whole run

Option A (default, cheapest): **the cloud is a finite object you pass.** It enters, crosses,
leaves. Fill as §6.2. Zero generator changes. The dead tail of the act is a composition
problem for the storyboard, not a mechanism one.

Option B: **widen the cloud to ~2.5 screens** so coverage stays ~constant. Two ways:
- raise `PLEXUS_RX` 0.48 → ~1.25 and re-seed. Changes topology, the crystal density well
  (`:410`), the neighbour metric (`:431`) and the carve test (`:445`) — all of which divide
  x by `BAND_ASPECT`, so this *must* land with §4.2(3).
- or, under §4.4(c), simply set `spanX = 2.5` viewport widths and leave the generator alone.
  **Much cheaper**, and the aspect consequence is then a single known constant.

Either way the node/edge tables grow ~2.5× (103 → ~258 nodes, 227 → ~568 edges): **UBO size
55 % of the WebGL2 floor** (§6.1), and `NEURAL_PARTICLE_COUNT 9000` (`:177`) would want to
rise to keep density, which is a build-time storage-buffer cost, not a block cost. Every one
of those is a rebuild (`dispose` + rebuild via the build-effect deps at
`NeuralLattice.tsx:198-243`), never a runtime change.

---

## PART 7 — DEGRADATION

Every path below has a precedent in `singularity-passage.tsx`'s FALLBACK MATRIX
(`:159-197`); copy it rather than re-deriving.

| condition | behaviour |
|---|---|
| **SSR / no JS** | The traverse is a JS-applied transform inside a matchMedia-armed GSAP context. Without JS there is no `x`, no `overflow-x` override (it ships in the section's `<style>` and is inert without the armed attribute), and no extra height unless the height is authored in CSS. **If the +27.4 % is authored in CSS, no-JS gets a very tall section with settled copy — acceptable. If it is set by JS, no-JS gets today's layout — also acceptable. Pick one and say which**; do not let it be accidental. No primed-hidden poses in any className: the hidden hairline pose is GSAP-only today (`problem-section.tsx:496-500` at HEAD) and D-10 must hold. |
| **`prefers-reduced-motion`** | `CanvasHost.tsx:33` renders nothing at tier "off" ⇒ no islands ⇒ no rig. The DOM half must not arm either: put `(prefers-reduced-motion: no-preference)` in the matchMedia **condition** so a runtime toggle reverts the context (`singularity-passage.tsx:2352` `revertOnUpdate`). Result: **no lateral offset, content settled at its authored position, zero timers, zero transforms.** Note the drift driver is already RM-gated (`lusion-type.ts:187-189`), so `y` is zero too. Also note the RM scroll path is a native listener that still calls `ScrollTrigger.update()` (`smooth-scroll-provider.tsx:168-184`) — so a traverse ST left armed under RM *would* run. It must not be created. |
| **tier "off" but motion-ok** (no WebGL) | `useNeuralLatticeFallback()` returns true (`use-neural-lattice-fallback.ts:41-46`) ⇒ the SVG `NeuralGraphFallback` paints (`problem-section.tsx:394-399`). **Arm predicate: `!showFallback && motionOk`.** These two must stay complements — same discipline the hook's own header demands (`:26-30`). A traverse over a static SVG would slide a still image 1.5 screens, which is worse than not arming. |
| **lite / capable phone** (`fxBudget.level === 2`) | The island mounts here (`Scene.tsx:509`). Arm with a reduced lateral (§7.4) and measure the runway in **`svh`**, never `vh` — trap D-7, `singularity-passage.tsx:180-185, :2593-2596`: `vh` jumps when the mobile address bar collapses, mid-thumb. |
| **weak phone / narrow desktop** (`level ≤ 1`) | `showFallback` true ⇒ not armed ⇒ today's layout, unchanged. |
| **WebGL2 fallback backend** | `NeuralLattice` skips `build.compute()` and renders the analytic field; `CrystalCluster` has no compute on either backend. Both accept the rig identically — it is a scene-graph transform. Note `?backend=webgl2` currently never initialises (open decision §7.7, an init hang, not a shader failure), so the cross-backend claim in §6.1 is **structural** (no new ops, no new bindings) and could not be exercised. |
| **Focus inside a translated section** | §3.3. `overflow-x: clip` removes the container; the `focusin` → vertical-scroll conversion is still mandatory. |
| **A11y tree** | Rows stay in the tab order at every `p`. The anchor div is already `aria-hidden` + `pointer-events-none`. If a beat visually hides copy, the a11y state must **match** the visual and never lead it (`singularity-passage.tsx:257-266`). |

### 7.4 The phone — ⚠ REVISED BY D12: hold the ANGLE, which means 5.77 W, not 1.5 W

> **THE OWNER RULED (D12).** The analysis below correctly identified the problem — 1.5 screen
> widths at 390×844 is a **6.5° ripple, not a diagonal** — and offered three levers. **He took
> the second-to-last row of the table below: hold the desktop's 23.6°, which on a phone means
> a 2251 px run = 5.77 screen widths.** Frame it correctly in any future discussion: this
> *grows* the phone journey; the angle is the invariant and the screen-width count is an
> artifact of aspect ratio. The phone legibility budget absorbs it (storyboard: worst case
> 1.30 em/line).
>
> **And it deletes the mechanism work this section proposed.** There is no per-tier lateral
> constant, because holding the angle makes the authored quantity viewport-invariant:
> `L = 29.847` world units at **every** viewport (§2B.0). One number, no tier branch, no
> table. The recommendation below ("accept a shallower angle, ~2.0 screens") is **superseded**
> and the open decision it raised is **CLOSED**.
>
> One thing does survive from below and still binds: **measure the runway in `svh`, never
> `vh`** (trap D-7). At 5.77 W the phone's lateral is derived from `H`, so an address-bar
> collapse that changes `vh` mid-thumb would change the lateral run as well as the runway.

#### 7.4-OLD — the analysis that led there (superseded recommendation, valid measurements)

At 390×844, `1.5 · vw = 585 px` and `1.5 · worldViewWidth = 7.757` world units. Against a
6.10 svh runway (5148 px) that is **0.1136 px lateral per px vertical = 6.5° from vertical**,
versus 23.6° on desktop. **The traverse would read as "the text drifts a bit sideways", not
as a diagonal.**

The three levers, and what each costs:

| lever | to reach desktop's 23.6° | verdict |
|---|---|---|
| **raise the lateral** ← **APPROVED (D12)** | 0.4372 × 5148 = **2251 px = 5.77 screen widths** | ~~content crosses the frame ~6 times in one section — unreadable~~ **The objection was wrong, and §2B.0 shows why: the *net* crossing the frame ~6 times is not the same as the *copy* doing so. The copy rides α 0.25–0.50 windowed, so its own excursion is 555 px on a phone as on a desktop; only the net makes the long run, which is exactly what D9 asked for.** |
| shorten the runway | 585 / 0.4372 = **1338 px = 1.59 svh** | rejected — it throws away the reading time D10 bought |
| accept a shallower angle | — | ~~recommended~~ **rejected by D12** |

~~Mechanically all three are one config number per tier~~ — **and under D12 there is no tier
number at all.** `L = tanθ · (runway in vh) · WORLD_VIEW_HEIGHT` is viewport-invariant
(§2B.0), so the phone and the desktop ship the identical authored constant and the 5.77 W is
a derived report. J-9 (the phone beat count) remains open and should still be put to him.

---

## PART 8 — FRAME ORDER

### 8.1 The verified ledger

R3F 9.6.1 sorts subscribers by priority with a **stable** sort, and `useFrame` subscribes in
`useIsomorphicLayoutEffect` ⇒ within a priority, **insertion order = JSX mount order inside
`<Canvas>`** (the invariant nine island headers depend on, e.g. `Scene.tsx:470-473`). Mount
order read from `Scene.tsx:402-...`:

| # | subscriber | priority | relevance |
|---|---|---|---|
| 1 | **`FrameDriver`** | 0 | `pumpLenis(performance.now()); updatePointer(delta)` (`FrameDriver.tsx:102-105`) |
| 2 | `AdaptiveResolution` | 0 | dpr |
| 3 | `PipelineWarmup` | 0 | warm flags |
| 4 | **`SignatureLine`** | 0 | the only camera writer |
| 5 | `DriftParticles` | 0 | world-anchored |
| 6+ | hero / featured / founders islands | 0 | camera-locked |
| — | **`NeuralLattice` ×2, `CrystalCluster` ×2** | 0 | **the rig readers** |
| last | `PerfProbe` | 0 | deliberately 0 so it does not steal the render |
| — | **`PostFXNodes`** | **1** (`:1047`) | `post.render()` — suppresses R3F's default render |

### 8.2 The chain that makes a one-frame disagreement impossible

`pumpLenis` runs inside **subscriber #1**. Lenis advancing emits its `scroll` event
**synchronously**, and the provider's handler is:

```ts
lenis.on("scroll", (l) => { ScrollTrigger.update(); setScroll(l.progress, l.velocity); });
```
(`smooth-scroll-provider.tsx:220-226` — *"One source, every consumer"*.)

`ScrollTrigger.update()` fires our traverse trigger's `onUpdate`, which is where `apply(p)`
writes the DOM `x` **and** publishes the lateral. All of that happens **before** subscriber
#4 (SignatureLine) and therefore before the islands. So per frame, on home, with a band on
screen:

```
p0 #1  FrameDriver     pumpLenis → lenis advances → "scroll" fires →
                       ScrollTrigger.update() → traverse.onUpdate → apply(p):
                         · FREEZES the snapshot { active, scrollY, p, X_scene_px, L_world }
                         · for each [data-drift] block: u ← center_b − snapshot.scrollY − ih/2
                                                        x ← designLane_b + R·Â_b(u)   [D11]
                                                        cap ← tanh(…)                 [B2]
                         · lane centre ← the block of min |u|, from its FINAL x   [§2B.4]
p0 #4  SignatureLine   writes the camera (unchanged, zero lines)
p0 #N  NeuralLattice   traverseStore.getState().frame →
                         rig.position.x  = ±L_world           (α ≡ 1.00)
                         vpTop           = rect.docTop − frame.scrollY   ← NOT window.scrollY
                         uCopyLaneC/W    = the published lane            [§2B.4]
                         uFrontS         = frontSchedule(frame.p)        [D13, §6.1B]
                       camera.position/quaternion already settled at #4
p0 #N+ CrystalCluster  same, + the callout CSS-var projection
p1     PostFXNodes     post.render()
```

Every write in that block derives from **one `scrollY` value, frozen once at the top**.
They cannot disagree by a tick, and — since D11 — they cannot disagree by a *rate* either.

**The rule that makes it a guarantee rather than a coincidence** (restated for D11 in
**§2B.3**, which is the authority; this is the short form):

> **ONE FROZEN `scrollY`, READ BY ALL. The islands must read the *published snapshot*, not
> recompute from their own `window.scrollY`.** Under a constant α it was enough to publish one
> lateral number, because every consumer's offset was that number times a constant. Under a
> **windowed** α the consumers evaluate genuinely different functions, so the thing that must
> be shared is the **argument**, not the result.

That is counter-intuitive — recomputing from the same pure function looks safer — but it is
not. `NeuralLattice` reads `window.scrollY` at `:358` for `vpTop`, and there are paths where
that read differs from the scroll position `apply()` used (a native scroll event between
rAFs, a `lenis.scrollTo` with `immediate`, scroll restoration, a frame where `onUpdate` did
not fire). If both consumers read one published scalar, a stale frame makes the **whole
scene** one frame behind the page's vertical — a uniform lag of ≤22 px at a hard 3000 px/s
flick, applied coherently to copy and net alike, which is a shutter and is invisible. If one
recomputes and the other does not, the same stale frame makes the copy and the net disagree
by 22 px — which is the exact tell that betrays them as two layers.

Corollaries:

- **Do not write the traverse from a `useFrame`.** That would put a second clock on it and
  re-open the class of bug the `seqStore` ownership contract exists to prevent
  (`seqStore.ts:9-31`: *"NO three import here… pinned on globalThis… splitting writers from
  readers"*). The traverse store must be globalThis-pinned for the same Turbopack reason.
- **Do not write the DOM `x` from `gsap.ticker`.** GSAP's ticker rAF is registered at import
  time and R3F's at Canvas mount, so the ticker fires **first** in a frame — before
  `pumpLenis` has advanced the scroll. A ticker-written `x` is therefore one frame *ahead*
  of the WebGL, permanently. (This is precisely why `driftTick` staying on the ticker is
  acceptable for `y` — §1.4 — and not acceptable for `x`.)
- **Never subscribe to a store inside the Canvas.** `getState()` only, refs only. Standing
  island rule; the memory index records that React commits inside the Canvas can wedge on
  interior routes.
- **The ignition front adds no subscriber.** `uFrontS` is a pure function of `frame.p`,
  written from the island's *existing* `useFrame` alongside its other ~30 uniform writes
  (§6.1B). It is a new *consumer* of the traverse progress, not a new clock.
- **Do not put the mask lane on a damper.** `uCopyEdge` is written today from a `useEffect` on
  `[build, rect]` (`NeuralLattice.tsx:296-299`); under D11 it moves into the frame path. It
  must be written *raw* from the same snapshot, never damped or eased — a damped lane lags the
  copy by exactly the amount §2B.4 prices at 292 px.

---

## PART 9 — FILE-BY-FILE CHANGE LIST

`A` = additive (nothing existing behaves differently when disarmed) · `S` = surgery.

| file | change | ~lines | A/S |
|---|---|---|---|
| `src/webgl/store/traverseStore.ts` | **NEW.** globalThis-pinned zustand, `seqStore` shape (`seqStore.ts:55-67` for the reason). Per band the **frozen frame snapshot** `{ active, scrollY, p, X_scene_px, L_world, laneC, laneW }` plus the static `{ secTop, travel }`. Header documents the ownership contract: the DOM owns the clock, islands consume via `getState()`, **one frozen `scrollY` read by all** (§2B.3, §8.2). | ~90 | A |
| `src/components/fx/use-diagonal-traverse.ts` | **NEW.** The shared hook: matchMedia arm predicate (`!showFallback && motionOk`), `measure()` (secTop, travel, vw, vh — `svh` on coarse pointers; **and per block `center_b`, `V`, `U_in = V/2`, `U_out`, `designLane_b`, `X_MAX`**), the file-scoped `<style>` (`overflow-x: clip`), ONE `ScrollTrigger.create({start:"top top", end:"bottom bottom", invalidateOnRefresh, onRefreshInit, onRefresh, onUpdate})`, `apply(p)` freezing the snapshot + writing the windowed `x` set + the lane, the `focusin` → vertical-scroll conversion, the one-shot `fonts.ready` refresh, full cleanup. Modelled on `founders-rail.tsx:1929-2080`. | ~250 | A |
| `src/components/fx/traverse-rate.ts` | **NEW (D11).** The windowed-rate law in one file: `alphaAt(u)`, the closed-form antiderivative `Ahat(u)` (§2B.5), and the `tanh` block cap. **Pure, stateless, allocation-free, unit-testable** — and the single place the C¹ property is asserted. Keeping it out of the hook is what lets a reviewer check the continuity proof against ~30 lines rather than 250. | ~60 | A |
| `src/webgl/neural/traverseConfig.ts` | **NEW.** **`ANGLE_DEG = 23.61` and the runway in vh — the two authored numbers; `L` is derived and viewport-invariant (§2B.0, D12). NO per-tier lateral constant.** Plus: `ALPHA_READ` (0.25 body / 0.50 display), `ALPHA_EDGE` (3.00), `RAMP` (108 px), the yaw pair (D2: −7.7° / +6.3°, authored, rendered rigid by §5.3), the ignition-front schedule + `FRONT_W` (D13), the `spanX/spanY/spanZ` of §4.4(c) if taken, the act `dprCap` policy, the aspect bucket. All live-tunable through `__sersanTraverse_*`. | ~130 | A |
| `src/components/fx/lusion-type.ts` | Add `setX` to `DriftEntry` + a `registerTraverse(el)`-style export so the traverse hook can reach the same block list (or export the entry list read-only). **Do not fold `x` into `driftTick`** (§1.4). Handle the `clearProps:"transform"` teardown ordering (`:687`). Everything else byte-identical — `/audit`, `/consulting`, … unaffected. | ~25 | **S** |
| `src/webgl/NeuralLattice.tsx` | (1) the group restructure of §5.2 — `scale` moves off `groupRef` onto a new `scaleRef`, `rigRef` between them, posed from `traverseStore`; (2) the lateral cull term (§5.4b); (3) **the copy gate becomes a two-sided LANE** — `uCopyEdge` → `uCopyLaneC` + the new `uCopyLaneW`, driven per frame off the published lane with a dev-handle override (§2B.4, superseding §5.4a's half-plane version), replacing the measure-time effect at `:296-299`; (4) `zWorld` re-based to the viewport (§4.2-1) at `:373`; (5) aspect bucket into the build effect's deps `:198-243`; (6) **`uFrontS`/`uFrontW` written from `frame.p`** (D13, §6.1B); (7) **`vpTop` at `:360` reads `frame.scrollY`, not `window.scrollY`** (§2B.3) — the formula is unchanged, only its argument. **No sticky-offset correction exists in this design.** | ~85 | **S** |
| `src/webgl/CrystalCluster.tsx` | The rig (no restructure — the scale is already uniform); the lateral cull term; **the viewport re-base at `:509` AND `:715` — BOTH lines move together or the callout projection detaches** (§4.2-2, `C_vp = 0.0926`); **a decision on the `a` scalar at `:515`** (clamp, or measure from a viewport-sized window — it drags `CALLOUT_VIS_WINDOWS` and `PLEXUS_CONNECT_WINDOW`); `vpTop` at `:446` reads `frame.scrollY`; the callout projection generalised only if the storyboard gives the stone a depth component (a pure lateral leaves `CAMERA_Z/(CAMERA_Z − v.z·s)` exact). **Coordinate with the agent reviewing this file — the review owns the constants, this dossier owns the reason the band grew.** | ~55 | **S** |
| `src/webgl/neural/neuralLatticeConfig.ts` | `NEURAL_DEPTH_SCALE_FACTOR` re-valued to `0.8597` with its meaning changed from "× band height" to "× WORLD_VIEW_HEIGHT" (§4.2-1); `BAND_ASPECT` becomes a parameter of `buildPlexus`, `getPlexus(mode, density, aspectBucket)` with the bucket in the cache key `:365-375`, reaching `:410`, `:431`, `:445` (§4.2-3). Optionally `PLEXUS_RX` / the spans (§6.4). | ~45 | **S** |
| `src/components/fx/neural-graph-fallback.tsx` | Consume the same aspect bucket, or the SVG and the WebGL draw different graphs at one viewport. | ~8 | **S** |
| `src/components/sections/problem-section.tsx` | `useDiagonalTraverse(sectionRef, "problem")`; the section's own `<style>` gains `overflow-x: clip` and drops `overflow-hidden` from the className; the extra runway height (CSS or JS — §7 SSR row); **`[data-lattice-anchor]` stays outside any translated wrapper** (§3.4); the three ghost callouts ride the same `x`. **Zero copy strings touched.** | ~45 | **S** |
| `src/components/sections/production-grade-section.tsx` | Twin. (D4's authorised copy cut has already landed here.) | ~40 | **S** |
| `src/webgl/store/tierStore.ts` | **No change** — `setDprCap` exists (`:597-598`) and is consumed (`AdaptiveResolution.tsx:52-56`). The traverse calls it on the band edge. | 0 | — |
| `src/webgl/SignatureLine.tsx` | **No change.** | 0 | — |
| `src/webgl/Scene.tsx` | **No change.** | 0 | — |
| `src/app/globals.css` | **No change** — file-scoped `<style>` only. | 0 | — |

Also required by D11 / D13, on files already listed above:
`src/webgl/neural/neuralFieldCompute.ts` — the copy gate becomes a two-sided lane
(`uCopyEdge` → `uCopyLaneC`, `+uCopyLaneW`) and the ignition front is ~6 lines folded into
`buildVertex` off the already-computed `clip` (`:2205`); **`uFrontS` + `uFrontW` + `uCopyLaneW`
= 3 plain scalars, 0 blocks, 0 varyings** (§2B.4, §6.1B). ~40 lines, **S**.
`src/webgl/neural/crystalConfig.ts` — `C_vp 0.0926`, `CRYSTAL_POS.y → 0.0483`,
`FOG_RADIUS_Y → 0.2505`, and the `a`-scalar decision. ~25 lines, **S**, **owned by the crystal
review** (§4.2-2).

Rough total: **~530 new lines, ~340 changed, ~0 deleted.** Still materially smaller than the
sticky design (~700/330/150) because the stage, the sticky-offset correction, the drift disarm
and the replay-trigger rework are all gone. The two riskiest edits are the `NeuralLattice`
group restructure (§5.2) — small, load-bearing, land it in Stage 1 while nothing depends on it
— and the windowed-rate law, which is why §9 puts it in its own ~60-line pure module
(`traverse-rate.ts`) rather than inlining it in the hook.

---

## PART 10 — RISK REGISTER (ranked)

| # | risk | symptom | detection | rollback |
|---|---|---|---|---|
| **R1** | **Copy `x` and net `x` computed from two clocks** (§8.2, §2B.3) | On a hard flick the copy visibly slides against the net and snaps back — the exact "two layers" tell the design exists to avoid; invisible on a slow scrub, so it survives review. **D11 makes this worse: at α_edge 3.0 one stale frame is 57 px, not 20.** | Dev-handle frame counters written by `apply()` and by the island's `useFrame`; they must be equal every frame. Screenshot pairs at 3000 px/s. | The traverse is one `apply()`; point every consumer at the frozen snapshot's `scrollY`. One line per consumer. |
| **R1b** | **The windowed rate built as a POSITION MULTIPLIER instead of a rate integral** (§2B.5) | The block is flung sideways as it enters the ramp — an **80× rate spike, 36 px of lateral per scroll px** at mid-act, arriving exactly at the edge of the reading window. Looks like a physics bug, not a tuning one. | Log `dx/dscrollY` per block across a transit; it must never exceed `α_edge · R = 1.31 px/px`. | `traverse-rate.ts` is a pure module: replace `Ahat` and re-run. Nothing else moves. |
| **R1c** | **A corner in the rate curve** (§2B.5, handoff trap 11) | A visible kick as a block crosses a window boundary — or, if `U_in = 0`, a kick at the viewport centre, i.e. mid-sentence | Numerically differentiate the shipped `Ahat` twice at `\|u\| = 0, U_in, U_out`; the second derivative must be finite and the first continuous. A unit test on ~30 lines. | `smoothstep` → the same with a wider `RAMP`; or `smootherstep` for C². |
| **R2** | **`rect.h` couplings fire when the anchor grows** (§4.2-1/2) | Nodes render behind the camera (`d < 0`) and the cloud inverts; the stone becomes 1678 px tall | `__sersanNeuralLattice_problem` → log `zWorld` and the min node distance at build; assert `min d > 1.0`. Stone: measure its rendered height as a fraction of the viewport. | Give the anchor an explicit height (§4.4-b) — a className change, no logic. |
| **R3** | **`BAND_ASPECT` 7.6× wrong at a tall band** (§4.2-3) | The link graph picks the wrong axis; links become long near-vertical streaks and the crystal clearance well carves the wrong ellipse (either swallowing the stone or slotting the cloud) | Compare the rendered link-angle histogram at the new band against the shipped 619 px band; or simply eyeball the SVG fallback, which draws the same generator | Parameterise `BAND_ASPECT`; until then, keep the anchor at ~viewport height (§4.4-b) where 0.45 is still within 8 %. |
| **R4** | **Focus scrolls the section instead of the page** (§3.3) | Tabbing to an off-frame row silently shifts `section.scrollLeft`, shearing the composition with nothing in our code aware of it; or the focus ring lands off-frame with no scroll at all (WCAG 2.4.11 fail) | Keyboard-tab through both sections at `p = 0.5`; assert `section.scrollLeft === 0` and that the focused row is within the viewport | `overflow-x: clip` is one word; the `focusin` handler is ~12 lines lifted from `founders-rail.tsx:2054-2069`. |
| **R5** | **Stale cached rects** — the open defect the check agent is hunting (an ~83 px model-vs-measurement disagreement at `scrollY 15073` that staleness has not yet been proven to explain) | If it is *not* staleness, the traverse inherits it: `apply()` rides `secTop`/`travel` from the same `onRefreshInit`/refresh pipeline | **Blocked on that investigation.** Meanwhile note the containment: the traverse's exposure is **two scalars per section**, both read by copy and net alike, so a stale value shifts the *phase* of the traverse and **cannot desynchronise the copy from the net.** That is a strictly better exposure than the per-block centres the drift carries. | Re-measure on a `ResizeObserver` on the section itself in addition to ST refresh. |
| **R6** | **`[data-lattice-anchor]` measured while translated** (§3.4) | `cxBase` is polluted by whatever `x` was applied at measure time; the net jumps sideways on a font swap or an EN/IT toggle and stays there | Toggle EN/IT at `p = 0.5` and compare `__sersanNeuralLattice_problem.project()` before/after — must be identical | Keep the anchor outside the translated wrapper (JSX nesting, no logic), or subtract the applied `x` at measure time (`lusion-type.ts:617` idiom). |
| **R7** | **The mask lane driven from a LINEARISED α** (§2B.4 — supersedes §5.4a's static-edge version) | The lane walks **292 px off the text — 7.7× the storyboard's 38 px tolerance** — on each side, so a block enters and leaves the frame with the net at full brightness directly behind it. Worst at the top and bottom of the frame, i.e. where the eye first lands. | axe contrast pass on `--ink-mute` at the **window edges**, not just at `p = 0/0.5/0.9`: park each block at `\|u\| = U_out` and measure. Must stay ≥ 4.5:1. | The AA arithmetic is unchanged (same floors); the fix is to read the block's final applied `x` — the value is already in a register. |
| **R7b** | **The half-plane gate kept instead of a lane** (§2B.4) | The lane centre sweeps **1.70 band widths**; a half-plane gate swept that far dims the entire cloud at one end of the act and nothing at the other — round 9-B's "dim everything left of the copy means dim everything", reached by translation instead of by width | Count visible nodes at `p = 0.05` and `p = 0.95` on a copy moment; both must be ~equal | One new plain scalar (`uCopyLaneW`) and a `smoothstep` pair; no block, no varying. |
| **R7c** | **The mask lane damped** (§8.2 corollary) | Same symptom as R7 at lower amplitude, and it survives review because a damper looks like good practice | `getComputedStyle` the block's `x` and read `uCopyLaneC` on the same frame; the implied lane centre must equal the block's `x` to <2 px | Delete the damper. |
| **R7d** | **The ignition front built as a swept STATE BOUNDARY** (§6.1B) | A full-frame flash at every gap reset — every node ignites, then all extinguish in one frame | Frame-capture the gap boundaries; look for a single-frame luminance step across the whole band | Make the front a travelling **band** (Gaussian or `smoothstep` pair) so the reset happens off-frame. |
| **R8** | **`AdaptiveResolution` climbs mid-act** (§6.3) | A swapchain + PostFX-RT realloc hitch lands inside a cinematic beat, on the *falling* load, i.e. exactly when the frame looks calm | `?perf=1` + `PerfProbe`; watch `setDpr` transitions across a full act, not just fps | `setDprCap(current)` on the band edge — one call, the API exists. |
| **R9** | **The traverse runs under RM / fallback tier** (§7) | 1.5 screens of motion for a user who asked for none; or a static SVG slid sideways | `matchMedia("(prefers-reduced-motion: reduce)")` toggled live must revert the context (`revertOnUpdate`); `?tier=off` must show today's layout byte-identical | The arm predicate is one boolean. |
| **R10** | **Off-frame net still submitting ~9000 sprites** (§5.4b) | fps cost with nothing on screen; worst on the phone tail | `?perf=1` at `p = 0.95` vs `p = 0.5` — draw calls should be lower, not equal | The lateral cull is two comparisons. |
| **R11** | **Coarse-pointer runway measured in `vh`** (D-7) | On a phone the section height and the traverse phase jump when the address bar collapses, mid-thumb | Chrome device emulation cannot reproduce this; needs a real device or an `svh`/`lvh` computed-value check | Use `svh` from the start; the passage already proves it (`singularity-passage.tsx:180-185`). |
| **R12** | **Section growth destabilises a downstream measurement** | Signature curve deforms (it *will* straighten — §4.2-7, expected); cut boundaries land off-section; `#services` snap stations shift | `__sersanLineDebug.bboxY` + `__sersanSectionCuts.state.cuts` + `__sersanSnap.candidates()` before/after | The runway is one number; set the growth to 0 and today's height returns exactly. |
| **R13** | **Concurrent edits** | `tsc` noise from the four files three other agents hold | `npx tsc --noEmit` **after** they land, never during | Sequencing, not code. |
| **R14** | **The crystal re-base lands on ONE of its two sites** (§4.2-2) | The callout projection detaches from the render — labels float off the shards. The twin rule (`CrystalCluster.tsx:509` and `:715` read the same `feelC.scale`) exists precisely to prevent this | Compare `--callout-N-left/top` against a `?debug` overlay at three band heights | Both lines or neither; there is no valid intermediate state. |
| **R15** | **`FOG_RADIUS_Y` left behind when the stone goes viewport-keyed** (§4.2-2) | The fog **corner radius collapses 0.614 → 0.101** and the stone sits entirely on its own bright core — the "glowing blob" failure, back | Measure the composited core vs body luminance ratio; the shipped target is 7–8:1 within the stone's own range | `FRY_vp = 0.2505`, in the **same commit**. |
| **R16** | **The `a` scalar left unclamped at a grown band** (§4.2-2) | `a` spans **±2.94** instead of ±0.90 ⇒ the tumble runs to **355°** and the stone spins nearly a full turn; `CALLOUT_VIS_WINDOWS` and `PLEXUS_CONNECT_WINDOW` are windows *on* `a`, so the callouts and the halo plexus gate at the wrong moments too | Log `a` at the band's entry and exit; assert `\|a\| ≤ 1.0`. Visually: the stone must settle upright at its beat. | **Needs a decision, not a constant** — clamp `a`, or measure it from the stone's own viewport-sized window. The crystal review flagged this as the worst of its three. |

**Deleted from the round-10 register, and why** — worth stating for the owner:
**R1 (sticky-offset)** — there is no sticky ancestor, so `vpTop = rect.docTop − scrollY` is
simply true. **R2's pin-scoped half (drift shear inside a stage)** — `viewCenter` and
`en.center` are in the same frame again, so the 440.6 px separation the sticky design would
have produced cannot occur; the concurrent tanh then bounds what remains at ±24 px.
**Both of those were silent, composition-destroying, and invisible in code review. His choice
removed them.**

---

## PART 11 — STAGED ROLLOUT

Each stage is independently shippable, visible to the owner in Chrome, and gated by a
screenshot or a number. **Stage 1 shows the diagonal itself** — not scaffolding — because he
judges by eye and will look at it before anything else exists.

### Stage 1 — THE DIAGONAL, ON ONE SECTION, ON EVERYTHING THAT ALREADY EXISTS

`#problem` only. Ship: `traverseStore` (with the frozen frame snapshot, §2B.3),
`use-diagonal-traverse`, `traverse-rate.ts`, the section's runway height, `overflow-x: clip` +
the `focusin` conversion, the DOM `x` on every `[data-drift]` block at the **windowed** rate
(D11, §2B.5), the `NeuralLattice` group restructure of §5.2 with `rigRef` driven laterally at
`L = 29.847` world units, the viewport-relative `zWorld`, the lateral cull, and the act
`dprCap`. **No beat table, no yaw, no stone, no ignition front.**

> **Why the windowed rate is in Stage 1 and not deferred**: a constant α would show the owner
> the copy drifting **100 px while the net runs 1920** — the exact reading D11 exists to
> reject. Shipping the constant first would put the rejected option in front of him as if it
> were the design. The window is ~60 pure lines (`traverse-rate.ts`) and it is the thing he
> approved. **The mask lane (§2B.4) ships with it**, because a windowed copy without a
> tracking lane is R7 by construction.

- **Why first**: it is the whole idea in its simplest form, and it isolates R1/R1b/R1c (the
  clock and the rate curve) and R2 (the `rect.h` couplings) in a change with no authored
  composition to argue about.
- **What the owner sees**: he scrolls `#problem` at completely normal speed and the copy and
  the net slide left together while descending — one place, moving on a diagonal, with the
  net's own near nodes visibly outrunning its far ones. That shear (§2.1: 2287 px vs 1655 px
  over the run) is the thing that will tell him whether this is the immersive experience he
  meant, and it costs nothing extra to show him.
- **QA gate**:
  1. **The number that proves R1**: a dev-handle frame counter written by `apply()` and by
     `NeuralLattice`'s `useFrame` must be **equal on every frame** across a 3000 px/s flick.
     Log a rolling max of `|counterDOM − counterGL|`; the gate is **0**.
  2. **The number that proves R2**: `__sersanNeuralLattice_problem` reports
     `min node camera distance ≥ 10.0` and `zWorld = 9.62 ± 0.05` at every viewport,
     including 390×844 — i.e. the depth range of §2.1 is now a constant of the site.
  3. **The number that proves D11 landed as approved** (replaces the old depth-law gate,
     which D11 superseded): a body block's total on-screen lateral excursion measures
     **555 ± 10 px** — against **100 px** with `ALPHA_EDGE = ALPHA_READ`, which is the
     one-line A/B that shows the owner what he chose over what he rejected.
  4. **The number that proves R1b/R1c**: `dx/dscrollY` logged across a full transit never
     exceeds `α_edge · R = 1.31 px/px`, and a numeric second derivative of the shipped `Ahat`
     is finite at `|u| = 0, U_in, U_out`.
  5. **The number that proves the lane tracks** (R7): park each block at `|u| = U_out` — its
     worst case, not `p = 0.5` — and the implied lane centre must equal the block's applied
     `x` to **< 2 px**, against a 38 px tolerance.
  6. **The screenshot the owner judges**: a 3-frame strip at `p = 0.15 / 0.5 / 0.85`,
     desktop and 390, showing the copy and the net on the same diagonal, plus one frame with a
     block at `|u| = U_out` to show the fast edge.
  7. `section.scrollLeft === 0` after tabbing every row; the focused row is on frame.
  8. `npx tsc --noEmit` clean; `#trust` and every other section byte-identical.
- **Rollback**: `traverseConfig.problem.angleDeg = 0` restores today's composition at today's
  height; setting the runway growth to 0 restores today's document exactly. `ALPHA_EDGE =
  ALPHA_READ` collapses the window to a constant without touching any other code path.

### Stage 2 — THE α LEDGER, JUDGED LIVE

Wire the per-block α spread (display 0.50 / body 0.25 / dot-grid 0.14, storyboard §B1), the
per-block `tanh` cap (§B2), and the strip-x compensation.

- **The two live A/Bs to put in front of him, both one number**: `ALPHA_EDGE` **3.0 vs 1.5**
  (§2B.2 — the axis-asymmetry question that cannot be settled on paper), and `RAMP`
  **108 vs 300 px** (§2B.5 — excursion 555 vs 581, and how abrupt the hand-off feels).
- **QA gate**: each block's measured excursion matches the closed form to within 2 %; the
  ragged-left spread between the chapter description and row 1 is measured and reported (the
  budgeted number moved with D11 — re-derive it at the shipped α set rather than quoting §2.4's
  superseded 173 px); axe contrast on `--ink-mute` ≥ 4.5:1 at the **window edges** as well as
  in the reading zone.

### Stage 3 — THE YAW AND THE DEPTH COMPONENT

Add the D2 mirrored heading to the rig.

- **QA gate**: the **rendered** yaw at `p = 1` equals the **authored** yaw to within 0.2° at
  both 1280×720 and 390×844 — the direct test that the rig is outside the anisotropic scale
  (a failure reads 13.52° / 3.57° for an authored 7.7°, §5.3). Silhouette width at `p = 0`
  and `p = 1` at zero lateral must be equal: no breathing.

### Stage 3B — THE IGNITION FRONT (D13)

Add `uFrontS`/`uFrontW` and the per-gap schedule, in **screen space** off the already-computed
clip position (§6.1B).

- **QA gate**: the front's screen-space travel direction measures **23.6° ± 0.5°** at 1280×720
  **and** at 390×844 — the direct test that it was built in screen space and not in the
  anisotropically-scaled local frame; the front descends on screen (≈1.28 px per scroll px)
  while the geometry rises; **no single-frame luminance step at any gap boundary** (R7d — the
  front must be a travelling band, not a swept state boundary); `?perf=1` shows no fps delta,
  since the front modulates a value and not `sizeNode`.
- **The number for the budget claim**: dump the compiled WebGL2 vertex program's active
  uniform-block count for the particle material — it must still read **12**, and the line
  material **8**.

### Stage 4 — THE STONE

`CrystalCluster` joins the rig; `CRYSTAL_SCALE` re-based to the viewport.

- **QA gate**: the stone's rendered height is **30.8 % of the viewport** (`C_vp = 0.0926 ×
  3.32`) at every band height and every viewport; **both** re-base sites moved (`:509` and
  `:715`) — verified by the callout CSS vars landing within 1 % of the projected anchors at
  `p = 0 / 0.5 / 1` (R14); `|a| ≤ 1.0` across the whole band and the stone settles upright at
  its beat (R16); the fog's composited core:body ratio is still **7–8:1** with `FRY_vp =
  0.2505` (R15); the mark still reads inside the ice — **an eye call, because `93bb31d` was
  one.**

### Stage 5 — THE SECOND ACT

Instantiate the same hook on `#trust` with the mirrored config.

- **QA gate**: side-by-side strips of the two acts at matching `p` — the grammar must read as
  one system; `/#trust` deep-link lands at `p ≈ 0`; full-page height, `__sersanSectionCuts`,
  `__sersanSnap.candidates()` and Lighthouse mobile re-measured against the Stage-1 baseline.

**Cold-restart discipline at every stage**: `preview_stop` → `preview_start`. HMR does not
rebuild the WebGL island, and the owner has already lost a round to that.

---

## CAVEATS / NOT FOUND

### Added by REVISION 2 (D11–D13)

- **The perceptual claim in §2B.2 is reasoned, not measured, and it is the load-bearing one.**
  "Vertical retinal motion is confounded with the reader's own commanded scroll, so
  depth-from-vertical-parallax is discounted and an 11.6:1 axis asymmetry reads as depth rather
  than shear" is an argument from the structure of the cue. **No study was consulted and none
  is cited.** It is the reason D11 is expected to be invisible, and if it is wrong the design
  reads as a parallax layer. What settles it is the Stage-2 A/B at `ALPHA_EDGE` 3.0 vs 1.5,
  judged by eye — one number, and the owner is the instrument.
- **The window shape (`α_read` 0.25 → `α_edge` 3.0 via smoothstep over `U_in = V/2`,
  `U_out = U_in + 108`) is a RECONSTRUCTION.** D11 records the approved *outcome* — 555 px of
  excursion at zero legibility cost — not the curve that produces it. §2B.5's parameters
  reproduce 555 px to within 0.6 px and leave the reading zone at exactly 0.25, and they are
  derived from the storyboard's own measured `V`; but if the storyboard authored a different
  window, **its** numbers are the spec and this one is the check. Reconcile before Stage 1.
- **`α_edge = 3.0` implies `d = 4.0`, which is nearer than anything the shipped rig can hold**
  (`DriftParticles`' near spawn limit is `z = +2`, `d = 10`). §2B.1 argues the cue is *safe*
  there because DOM stacking agrees with it. It does **not** argue that a 3.0 differential is
  *tasteful*; Lusion's widest measured spread is 5:1 against the pane and ours would be 12:1 at
  the edges. That is a taste risk the owner has accepted and it is worth naming as such.
- **The two-sided lane's AA ledger was carried, not re-derived.** The argument (§2B.4) is that
  a lane changes *where* `COPY_MASK_FLOOR` applies, not the floor itself, so the brightest
  pixel under the copy is identical and round 9-B's 5.05–5.65:1 numbers hold. That is sound for
  the region **inside** the lane. It says nothing about the region the lane has just left,
  which is where a *lagging* lane (R7) does its damage — hence the Stage-1 gate parks the block
  at `|u| = U_out` rather than mid-act.
- **The ignition front's screen-space construction was not compiled.** §6.1B asserts it needs
  no aspect correction and no motion compensation because it reads the already-computed `clip`
  at `neuralFieldCompute.ts:2205`. The op set is all proven cross-backend, and the block count
  claim is structural (plain `uniform()` scalars join a shared group, `:952-955`) — but
  **"12 / 12 still links on a minimum-spec WebGL2 device" is an argument, not a measurement**,
  and `?backend=webgl2` currently never initialises, so it could not be exercised. The Stage-3B
  gate dumps the active uniform-block count for exactly this reason.
- **The crystal numbers in §4.2(2) are the crystal review's, not this dossier's.** `C_vp
  0.0926`, `CRYSTAL_POS.y → 0.0483`, `FRY_vp 0.2505`, `a` spanning ±2.94, the 355° tumble —
  all sourced from `crystalConfig.ts:405-470`. This dossier independently produced only the
  1677/1678 px slab figure, which is what the two agreed on. **The `a`-scalar resolution is
  explicitly an open decision in that review and remains open here** (R16): clamp, or measure
  from a viewport-sized window. It is the one item in the crystal set that a constant cannot
  fix.
- **D12 makes the phone's *rig* trivial and says nothing about its *reading*.** `L` is
  viewport-invariant, so there is no per-tier constant — but at 390×844 the net now crosses
  the frame 5.77 times in one section. That the copy stays legible through it rests on the
  storyboard's 1.30 em/line worst case, which this dossier did not re-derive.

### From the original dossier

- **`overflow: clip`'s three properties (no scroll container, no axis coercion, sticky
  descendants survive) are asserted from the CSS Overflow 3 spec and from the repo's own two
  notes** (`globals.css:1107-1112` for the `hidden` coercion; `services-section.tsx:1295-1297`
  for the sticky defeat). I did **not** verify them live in Chrome this session. The
  two-minute check that settles it: put `overflow-x: clip; overflow-y: visible` on `#problem`,
  translate a focusable row 2000 px, tab to it, and read `section.scrollLeft` and the
  computed `overflow-y`. Gate it before Stage 1 ships, because §3.1 and §3.3 both rest on it.
- **The GSAP-ticker-fires-before-R3F ordering (§8.2) was reasoned from registration order,
  not instrumented.** The conclusion is robust either way — the "one value, read by both"
  rule holds regardless of which rAF wins — but the *claim that a ticker-written `x` is
  permanently one frame ahead* deserves a frame-counter check before anyone argues for
  putting the transport there.
- **The 3.43 band aspect in §4.2(3) assumes the anchor grows with the section** (§4.4-a). If
  §4.4-b or §4.4-c is chosen, that number changes and the ruling's urgency changes with it.
  I could not settle which shape the storyboard wants; it is priced, not decided.
- **Fill was derived, not measured.** §6.2's "per-sprite area is exactly unchanged under a
  lateral" is exact arithmetic on `sizeNode ∝ 1/dist` with `dist` provably untouched by an
  x-translation; the *aggregate* on-screen count is a geometric overlap estimate over a
  centre-dense cloud. `?perf=1` at `p = 0 / 0.5 / 0.9` settles it in three minutes and should
  be run before anyone quotes the "cheaper than today" claim to the owner.
- **The `~83 px` drift-model disagreement the check agent is chasing is unresolved and this
  design depends on the same cached-rect pipeline.** §10 R5 states the containment (the
  traverse's exposure is two scalars per section, shared by both consumers, so it can shift
  the phase but not desynchronise copy from net) — but if the root cause turns out to be
  something other than staleness, that containment argument needs re-checking, not assuming.
- **The phone lateral (§7.4) is a new open owner decision** that D9 does not answer. It
  should go to him with J-9 (the phone beat count), J-3 (the stone's bloom hairline), J-6
  (snap stations — moot here, there is no runway to park in) and J-7 (the mask floor).
- **`?backend=webgl2` never initialises** (open decision §7.7 — an init hang, not a shader
  failure), so §6.1's cross-backend claims are structural (no new ops, no new bindings) and
  could not be exercised on the fallback.
- **Line numbers are from the working tree on 2026-08-24.** `lusion-type.ts`,
  `problem-section.tsx`, `production-grade-section.tsx`, `crystalConfig.ts` and
  `CrystalCluster.tsx` are held by other agents and will drift.

# ROUND 10 — OWNER DECISIONS (binding)

Decided by the owner (Alberto) in session, 2026-08-24, after reading the storyboard's
film strip, runway arithmetic and the §J decision list. These are BINDING for every
downstream agent. Do not re-litigate them; if evidence emerges that one is wrong,
surface it to the owner rather than quietly changing course.

Source: `2026-08-22-round10-journey-storyboard.md` §J, questions 1, 2 and 4/5.

---

## D1 — PAGE HEIGHT: pay the full 27.4%  ✅ APPROVED

The full journey ships: **7 beats per act**, not the budget variant.

- Act I `#problem`: 6.10 vp runway = 4392 px (today 1330 → **+3062 px**)
- Act II `#trust`:  5.95 vp runway = 4284 px (today 1475 → **+2809 px**)
- **Home page: 21459 → 27330 px (+5871 px, +27.4%)**; 29.8 → 38.0 viewports.

The two neural sections become the tallest on the page, ahead of `#fit` (3941) and
`#services` (3751). The owner saw this number before approving it.

The budget variant (+15.4%, 5 beats/act at a 0.65 pitch) is REJECTED — it cost the
thesis its own screen and the wall its breathing room.

## D2 — THE INTERLUDE: the world CLOSES and REOPENS  ✅ APPROVED

One film in **two movements**, not one continuous corridor and not a persisting
dimmed net behind `#work`/`#services`.

- The volume closes on the Act I seam (`problem→case-studies`) and reopens on the
  Act II seam (`services→production`) — both already wired in
  `sectionStore.CUT_BOUNDARY_PAIRS`.
- The acts rhyme through a **mirrored heading**: out on the left diagonal
  (yaw −7.7° over Act I), back on the right (yaw +6.3° over Act II).
- REJECTED: persisting the net behind the interlude. `#services` is already a pinned
  POV-pan runway with its own stage; two stages competing for one frame is the mess,
  and 8.4 viewports of dimmed net is 8.4 viewports of nothing happening.

## D3 — "LA PIETRA METEORITE" = the FRACTURED slab  ✅ APPROVED

The meteorite is the **Act I fractured stone**: it arrives cracked, at the wall, in a
dead volume. A meteorite is a thing that hit something. The Act II intact slab — with
the mark legible inside the ice — is the answer, not the meteorite.

**Consequence for §J-5 (also settled by this answer):** the stone is **ABSENT for the
travel beats** and first sighted at P5/T5 as an ~11% silhouette. The
"distant-silhouette-throughout" option was offered as the third choice and NOT taken:
presence throughout spends the arrival, absence makes the first sighting an event.

---

## STILL OPEN — do not decide these alone either

Carried forward from storyboard §J; the owner has NOT ruled on them yet:

- **J-3** Does the stone keep a hairline of bloom (`f1 ≳ 0.97` just above 1.0), or is
  it igloo-faithful with nothing on the stone crossing 1.0 and all glow from the fog?
  Storyboard recommends the hairline. → show him both live on the dev handle.
- **J-6** Beat stations as snap points. Storyboard recommends NONE (design so no torn
  pose exists). Aligned with his standing rejection of the 1-second stop, but never
  put to him explicitly.
- **J-7** Spend the legibility headroom (mask floor 1e-4 → ~1.5e-3, a faint visible
  mesh behind the reading column at 5.0:1) or spend none (5.98:1, net absent behind
  copy). Storyboard recommends none in stage 1, then show him both. His call by eye.
- **J-8** `Open a panel to see why it matters.` — a frozen D-17 string in `#trust`'s
  chapter description referring to panels the section no longer has. FLAGGED to him in
  session; copy freeze holds, it stays byte-identical until he approves a change.
- **J-9** Phone journey at 5+5 beats (recommended) vs a 3-beat reduced cut.

---

## ADDENDUM — decided 2026-08-24, later the same session

### D4 — J-8 CLOSED: the orphan sentence is CUT  (APPROVED)

The frozen D-17 string `Open a panel to see why it matters.` / `Apri un pannello per
capire perche conta.` is **deleted**. It promised a panel interaction the section no longer
has, and the three artifacts it pointed at already render directly below it.

The description becomes two sentences in both languages; nothing else in either string
moves. **This is the ONLY copy change authorised in this task** — the freeze holds
everywhere else. The D-17 identifier stays in the comments so the history remains
traceable.

### D5 — the text-drift collision gets a floor now  (APPROVED)

Measured live: a row body slides INTO its own display headline. `bodyTop - claimBottom`
on the three `#trust` rows, all poses settled (`transform: none`, `opacity: 1`):

| scrollY | row 01 | row 02 | row 03 |
|---|---|---|---|
| 15073 | +50 | +19 | **-11** |
| 15493 | +17 | **-14** | **-44** |
| 15913 | +151 | +120 | +90 |

Cause: the module driver in `lusion-type.ts` translates each `[data-drift="k"]` block by
`(1 - k) * (center - viewCenter) * DRIFT_SCALE`. A headline and its own body carry
different `k`, so they separate and re-converge with scroll. **Pre-existing** — the round-10
type change cannot move layout; solid ink merely made the existing collision visible.

The owner chose: **put a floor under it, keep the parallax.** Not removal. The depth cue
between rows must survive; the collision must become impossible, proven analytically over
the whole on-screen scroll range rather than sampled.

---

# ⚠ ADDENDUM 2 — 2026-08-24, LATER: THE DESIGN PIVOTED. READ THIS BEFORE THE DOSSIERS.

The owner reviewed the round-10 storyboard and said it was NOT what he meant:

> "non hai capito forse cosa intendevo per esperienza immersiva. il sito si deve muovere
> mentre scrolli nelle sezioni delle reti neurali, con uno scroll orizzontale che continua
> a rivelare le scritte e la rete stessa. ora e statico su una sezione! ti ho detto come in
> igloo e lusion, non mi hai capito."

He was then quizzed with drawn options and gave five unambiguous answers. THESE SUPERSEDE
the sticky-stage design in BOTH dossiers.

## D6 — ONE SCENE: the copy lives IN the world, not on the glass  (APPROVED)

The net and the copy are the SAME scene and translate together, like a camera tracking
sideways through a landscape. The copy is anchored in space at its own depth, not pinned to
the screen with a backdrop sliding behind it. He picked this over "only the copy moves" and
"only the net moves".

## D7 — NO PIN, EVER: the traverse is a DIAGONAL  (APPROVED)

The page NEVER holds the viewport. It keeps descending at completely natural speed while the
scene simultaneously slides sideways. Vertical + lateral at the same time = a diagonal.

**This kills the `.seq-stage` sticky full-viewport stage** that both dossiers were built on.
He was shown the sticky option explicitly, with the note that it is not the 1-second parking
he rejected, and he chose the diagonal anyway. Do not re-propose sticky staging.

## D8 — THE MOVEMENT NEVER STOPS  (APPROVED)

Pure motion graphic. Copy arrives, is read, and leaves while everything keeps moving. If the
reader stops scrolling the page stops, because the reader stopped — but the DESIGN contains
no hold, no decelerate-to-read, no 0.12x crawl.

**This kills the storyboard EXIT/TRAVEL/HANDOFF/HOLD beat template.** The HOLD sub-window
was a parked pose wearing a costume, and he called it static.

## D9 — LONG LATERAL RUN: more than one screen width per section  (APPROVED)

Content enters from the right and exits completely to the left — roughly 1.5 screen widths
of lateral travel across a section. What you see at the start of the section is gone by the
end. He was warned that text crosses the screen while being read and chose it over the
half-screen and the subtle-drift options.

## D10 — PAGE HEIGHT: +27.4% STANDS, re-affirmed under the new design  (APPROVED)

Sections grow from 1330 / 1475 px to roughly 4400 / 4300. Under the diagonal grammar the
vertical run IS the duration of the traverse, so the height buys reading time. He was
offered +15%, no growth at all, and a tune-it-live option, and kept the full bill.

---

## WHAT SURVIVES THE PIVOT

- **The local dolly rig** (mechanism Part 2.3, option d). The finding that every island is
  exactly invariant under camera translation and rotation is unaffected — only the direction
  of the local translation changes, from a forward dolly to a lateral one. SignatureLine
  still changes by zero lines.
- **D2** — the world still closes at the Act I seam and reopens at the Act II seam.
- **D3** — the meteorite is still the fractured Act I stone.
- **The through-line** — Act I the fracture, Act II the answer; the value world stepping
  165 -> 122 -> 88; the mirrored heading.
- **Copy freeze**, except the one authorised D4 cut.

## WHAT IS DEAD

- The sticky `.seq-stage` full-viewport stage, and every number derived from it.
- The EXIT / TRAVEL / HANDOFF / HOLD beat template and the 0.12x hold.
- Mechanism risk **R1** (the sticky-offset correction) — there is no sticky ancestor now.
- The pin-scoped half of risk **R2** — the drift no longer has to be disarmed inside a stage
  (the separate, real drift-collision defect is still being fixed; see D5).
- The runway arithmetic as computed (100vh stage + N x BEAT_VH); the height stands but its
  derivation must be redone as lateral-travel-per-vertical-px.

---

## ADDENDUM 3 — 2026-08-24, after the round-11 storyboard exposed the expectation gap

### D11 — WINDOWED lateral rate for the copy, NOT a constant one  (APPROVED)

The storyboard measured the gap and put it to him plainly: at Lusion fractions the net runs
**1920 px while a body block drifts 100-121 px** — 7.8-9.5% of the frame. He had chosen
"enters right, exits completely left". Those two do not both hold.

He chose the **windowed rate** (storyboard K-3, which the storyboard itself recommended
AGAINST): each block runs fast while entering and leaving the frame and slows in the reading
zone. Excursion **555 px instead of 216**, at zero legibility cost. This is what Lusion
actually does with its `contentShowRatio` windows.

**Know what this costs, and do not paper over it.** A rate that varies with screen position is
NOT a depth — it is a scripted move. It weakens D6 (one scene) on the copy layer, and on the
lateral axis it is a cousin of the decelerate-to-read that D8 rejects on the vertical axis.
He was told both of those things in the option text and chose it anyway. That is his call and
it stands — but the mechanism dossier 
'
s depth-consistency proof assumed a constant alpha
and must be redone: a windowed alpha does not correspond to a fixed z, so the copy no longer
sits at one honest depth in the net 
'
s volume. Say what it does sit at, and what that means
for occlusion and for the uCopyEdge tracking gate.

REJECTED: constant alpha (100 px, physically honest, "he will say it is not moving"), and the
literal reading of D9 (6.1 screen widths per section, a 61 degree path, a 14:1 differential
against Lusion 
'
s widest 5:1, reading marginal).

### D12 — PHONE: hold the ANGLE, not the screen-width count  (APPROVED)

1.5 screen widths at 390x844 is 585 px — a **6.5 degree path**, an ripple rather than a
diagonal. He chose to hold the desktop 
'
s **23.6 degrees**, which on a phone means
**5.77 screen widths** of run. Frame it correctly in any future discussion: this *grows* the
phone journey. The angle is the invariant; the screen-width count is an artifact of aspect
ratio. The phone legibility budget absorbs it (worst case 1.30 em/line).

### D13 — THE IGNITION FRONT runs top-right to bottom-left  (APPROVED)

Geometry cannot give him the descending diagonal he pictured: with a downward scroll and no
pinning, page content necessarily moves UP, so elements enter bottom-right and leave
top-left. (The brief that said "enters top-right, leaves bottom-left" was the coordinator 
'
s
error, not his.)

So the descending diagonal is carried by **light instead of geometry**: the net 
'
s ignition
front — a value field with no physical constraint — sweeps **top-right to bottom-left at
23.6 degrees from horizontal, once per gap between copy blocks**. The eye tracks the bright
thing, and the bright thing runs the way he described it.

### Still open, carried forward

- **K-4** the copy-to-net ratio (Act I 23/77, Act II 32/68) — ship and judge live.
- **J-3** the stone 
'
s hairline of bloom.
- **J-7** spend the legibility headroom or not — more attractive now, because under the
  traverse the mask lane SWEEPS, so a faint mesh behind the words would be a mesh in motion.

---

# ADDENDUM 4 — 2026-08-25, ROUND 12. Three architecture calls, taken on drawn options.

Put to the owner as an `AskUserQuestion` with 44x9 ASCII previews, after a nine-agent
measurement pass. The numbers he chose against are in
`2026-08-25-round12-decision-brief.md`; the two that were still unverified when the brief
was written were measured live in Chrome before he was asked (see D15's note).

## D14 - "SI COMPONE" MEANS THE NET IS BUILT AHEAD OF THE READER  (APPROVED)

He was shown three mutually exclusive readings of *"la rete deve continuare a comporsi"*
and picked the first:

**(1) SI COSTRUISCE** - links draw themselves from node to node just before the reader
arrives; clouds overlap so the structure never breaks. Rejected: **(2) SI ACCENDE** (the
lattice is already there and a band of light travels through it - half his sentence, and
the cheap option), and **(3) SCORRE** (one endless tiled field - kills formation, because
tiles share one uniform set and would ignite in lockstep).

**This decides the architecture.** The five-island structure SURVIVES and is now
load-bearing: each island owns its own material and its own uniform set, which is what
gives five independent formation states for free. **A tiled or wrapped single field is now
off the table** - it is mechanically incompatible with D14.

Consequence: the void between islands is closed by ENLARGING the luminous cloud, not by
wrapping. Measured cause of the "3 pezzi": cloud height 520 px against an 806 px pitch =
**286 px of permanent black** per join. The enlargement is **six places, not three** (see
brief 1.4); `PLEXUS_RY` is global and silently rewrites `#production`, the lite tier and
the SVG twin.

## D15 - THE TRAVERSE GOES TO 45 DEGREES  (APPROVED)

23.61 -> **45.00**. Island run goes from 0.40 to **0.91 screen widths** - one cloud now
crosses almost the whole frame, which is the thing he was actually missing. Total run 2.79
screen widths desktop / 11.8 on the phone.

He was offered 30 (safe), 36 (max with today's net), 45 (needs the continuous net) and
"I'll pick it live", and took 45 outright.

**Two corrections carried into this decision, both against earlier claims of ours:**
- The angle was NEVER coupled to the coverage arithmetic, and the lateral cull does not
  bind until ~62.4 deg. Steepening and continuity are INDEPENDENT levers. The main
  session's earlier statement that they were "the same intervention" was wrong.
- The cap that holds reading drift is `blk.h`, not `blk.h/2`, so the shipped ceiling is
  **3.0 em/line, not the authored 1.5**. 45 deg is only safe WITH the one-token fix at
  `use-diagonal-traverse.ts:395`. **That fix is a prerequisite, not a nicety.**

**MEASURED LIVE before he was asked** (Chrome, this build, `getClientRects()`), settling
the one disagreement the whole ceiling hung on:
- 1920x991 EN: ledger bodies are **2 / 2 / 3 lines**, chapter body 5 lines. Row 02 EN is
  **2 lines** - the optimistic reading was right and the table stands.
- 390x844 EN: ledger bodies 3 lines; and **two of the three ledger HEADLINES wrap to two
  lines** (`02. No traces` and `03. No boundaries`, h 67 px at a 31.9 px line-height).

## D15-bis - THE PHONE'S DISPLAY TYPE IS NOW A BLOCKING DEFECT, NOT A FLAG

Display type is never capped (`use-diagonal-traverse.ts:395` caps `kind === "body"` only),
on the reasoning that a single line has no return sweep. On the phone that premise is
false: two of the three ledger headlines are two lines. They are at **1.73 em/line already
at 23.61 deg** - past the 1.50 fail line TODAY - and D15 multiplies drift by
`tan45/tan23.61 = 2.287`, taking them to roughly **4 em/line**.

This was flagged to the owner in the angle question. It must be fixed as part of D15:
either cap multi-line display type, or change the mobile type scale. **It is band-adjacent
typography, so the fix is owner-visible and must be shown to him, not chosen silently.**

## D16 - THE BUILD IS UNLATCHED: SCROLLING BACK UP DISMANTLES IT  (APPROVED)

`uBuild` is a PURE function of scroll, not a monotone latch. Scrolling back up un-builds
the net; coming back down rebuilds it. He was told plainly that this is the more
spectacular and fully reversible option, and that every micro-oscillation of a trackpad
will make the net "breathe" - which can read as a defect. He took it anyway.

Upside worth recording: unlatched removes the ref latch entirely, so birth stays a pure
function with no per-node mutable state - which is what the WebGL2 analytic tier requires
by construction (it has no storage buffers).

**Watch item:** if the breathing does read as a defect live, the fix is a small deadband or
a slew limit on the driver, NOT a latch - a latch would silently reverse D16.

## D17 - ONE HORIZONTAL BAND, VIEWPORT-HEIGHT. THE VERTICAL LADDER IS DEAD.  (APPROVED)

He repeated himself to be sure, and he was right to:

> *"non so cosa intendi per 'isole', ma la rete dev'essere una rete orizzontale continua,
> non spezzata in piu sezioni verso il basso."*

**"Isole" was OUR word for five clusters STACKED DOWN THE PAGE at ladder tops 0.432 /
1.635 / 2.714 / 3.792 / 4.871 vh.** That stacking IS the "3 pezzi". It is now dead, and
with it `fitTraverseLadder`, the pitch bounds, `leadVh`, `tailPin`, `MAX_TRAVERSE_ISLANDS`
and the four extra `[data-lattice-anchor]` elements.

**What replaces it:** ONE continuous net, **as tall as the frame** and **as long as the
whole lateral run** - at D15's 45 degrees that is ~5350 px, about 2.8 screen widths at
1920. You do not pass five stations; you travel ALONG one net. He was offered a band
TALLER than the frame (edges never visible, "you are inside it") and chose **exactly frame
height**, accepting a visible top and bottom edge.

**This simplifies D14 rather than conflicting with it.** The "tiles ignite in lockstep"
objection applied to REPEATING one field. A single wide field with a SPATIAL birth front
(`phase = p.x * FRONT_AX + ...`) builds progressively along X as you travel - which is both
"continua" and "si compone", from one material and one uniform set.

**The new hard problem, and it is the whole engineering question:** node capacity.
`uniformArray` pads vec3 to vec4, so `uNodePos` has a hard ceiling of **1024 elements /
16 KiB** on min-spec WebGL2. Today: 103 nodes, 227 links over roughly one frame. A band 2.8
frames wide at frame height is ~4.8x the area, i.e. ~500 nodes and ~1100 links at today's
density. Nodes fit under 1024; **`uEdgeA` almost certainly does not** (40.9 KiB at 227
links today, index-packing to 10.2 KiB). Either the edge tables move to a DATA TEXTURE
sampled in the vertex stage (works on both backends, removes the cap) or the density drops.
UNRESOLVED - this is the first thing to settle.

## D18 - THE LOOK GOES BACK TO THE AUGUST PARTICLE RIVER, OVER TODAY'S REAL TOPOLOGY  (APPROVED)

> *"era molto bella quella che avevi fatto diversi commit indietro, fatta di particles.
> possiamo rifarla in particals, ma migliorarla rispetto a come era in passato, tenendo la
> struttura reale di questa che e piu fedele"*

He was shown that the history contains TWO different particle eras and asked which he meant:
- the **signal stream / river** (`4d2eb52` -> `47af6d8`, 21-24 Aug): filaments, streaks,
  sparks, shockwaves, membranes. Spectacular, but **not a network** - no nodes, no links.
- the **particle-strand links** (up to `f6cac67`, 24 Aug): today's topology with links made
  of beads instead of lines.

**He chose the RIVER.** So: the river's RENDERING - flowing particles, filaments, streaks,
sparks - carried onto **today's real node-and-link topology**, improved rather than restored.

**Context he must not lose, and it is on the record:** `f6cac67` killed the particle-strand
links **live in Chrome, with him in the room**, on 24 Aug. The commit message is explicit:
at point size 7.5 then 10 they "became CHAINS OF GLOWING BLOBS", and his own reference image
had thin crisp continuous lines. **A repeat of that attempt will fail the same way.** The
river is a different mechanism - many tiny fast particles reading as flowing light - not
few large beads pretending to be a line. If the implementation drifts back toward beads, it
is wrong.

Open: whether the crisp `LineSegments` chord SURVIVES underneath the river as the structural
spine (recommended - it is what makes the topology legible, and it costs 2 of 8 vertex slots
in its own 8/12 program) or is removed. **Not yet put to him.**

## STILL OPEN AFTER THIS ROUND

- The MERGE of the two neural acts into one passage. He asked for it; the cost is measured
  (`2026-08-25-round12b-*`): 3 moved lines in `src/app/page.tsx:55-78`, but **3 of 5
  `CUT_BOUNDARY_PAIRS` silently vanish** (`sectionStore.ts:233-239`, `:270-271` drops
  non-adjacent pairs with a bare `continue`), **4 sign flips** in `routeCurves.ts` to keep
  the signature serpentine, and `#services` is a genuine sticky pinned stage
  (`services-section.tsx:1319`) - D2's stated reason verified true in code. NOT yet put to
  him as a costed choice.
- The METEORITE OPENING to reveal the SERSAN mark. Asked for; machinery largely exists.
  NOT yet put to him.
- The TYPE going scroll-driven instead of hover-driven. Asked for; audit done. NOT yet put
  to him.
- D15-bis, the phone's uncapped two-line display headlines. Flagged, not fixed.

## D19 - THE ACTS MERGE: `#trust` MOVES DIRECTLY UNDER `#problem`. D2 IS REVERSED.  (APPROVED)

He was shown D2's reason verified in code before choosing - `#services` really is a full
second stage (sticky pin `services-section.tsx:1319`, its own camera with +-2.5 deg roll
`:1326-1339`, five snap points `:934-939`) - and he reversed D2 anyway. It is his call and
it stands.

New page order: `#problem` -> `#trust` -> **CUT** -> `#work` -> `#services` -> `#founders`.
The mechanical change is 3 moved lines in `src/app/page.tsx:55-78`. Everything that breaks
breaks downstream.

Rejected: the net running behind `#work` and `#services` (16-20 viewports in one run, and
the copy mask is fully OPEN where no traverse copy exists - `NeuralLattice.tsx:642-647` -
so it would be full-intensity net behind the work grid, not a dimmed one), and leaving D2
standing.

**What breaks, and he was told all of it:**
- **Three of five `CUT_BOUNDARY_PAIRS` stop being adjacent and VANISH SILENTLY** -
  `sectionStore.ts:233-239` requires literal adjacency and `:270-271` drops a non-adjacent
  pair with a bare `continue`: no warning, no console, no type error. They must be
  rewritten by hand.
- **The mirrored heading dies.** Opposite `dir` -1 / +1 on now-adjacent bands produces
  ~818 px of visible slip in the viewport where they overlap. `dir` must become uniform.
- **The value step 88 -> 165 becomes +5.46 dB in frame** - the 8.3-viewport interlude used
  to hide it. Death and rebirth now happen ON camera, which is the upside.
- **Deep links `/#trust` from the footer and `/start` now land mid-argument**, and the
  hero's "see the work" jump skips the whole neural passage.
- `routeCurves.ts` needs **4 sign flips** (`production`, `case-studies`, `work-in-progress`,
  `services`) to keep the signature serpentine. `SignatureLine.tsx` still changes by ZERO
  lines: its one `production`-keyed consumer (BEAT 1, `:1385-1395`) is span-derived.

**Consequence for D17 that must be priced:** the merged passage roughly doubles the lateral
run - about **5 screen widths at 45 deg**, ~9700 px. Whether that is ONE field spanning
both sections or two frame-height fields butted at an invisible seam is UNRESOLVED and is
the first thing the build plan must settle - two fields butted badly would recreate exactly
the "due pezzi" he is complaining about.

## D20 - THE MARK APPEARS TWICE, IN TWO DISTINCT STATES  (APPROVED)

- **Act I, the meteorite:** it opens and the SERSAN mark lights up inside, blooming at the
  peak of the reveal.
- **Act II, the intact slab:** sealed, the mark legible at ~6% through 0.94-opacity ice,
  never crossing the bloom threshold.

D3 survives intact. Both mechanisms already exist; the reveal is free, because the ice is
0.94 opaque - a shard in front of the mark passes 6%, a shard that has moved passes 100%.
No shader change.

**Implementation facts, verified:** the mark becomes a real mesh - the same 552-triangle
shared geometry already loaded at `RouteHeroLogo.tsx:62-102`, mounted in the
CAMERA-LOCKED group (`CrystalCluster.tsx:1136`), never in the tumbling mesh (which reaches
55 deg and would make it unreadable). `renderOrder -3.5`, between fog (-4) and crystal (-3).
Scale **0.921 at vertical offset -0.50** keeps it fully inside the ice - **Blender is NOT
needed**; the earlier 0.80/48% estimate was 8-15% conservative. At scale 1.0 / offset 0,
46 of 468 vertices poke out of the top bite, so the offset is not optional.
Driver: the same `a` centring scalar the copy and net already ride
(`CrystalCluster.tsx:576` <- `use-diagonal-traverse.ts:412`). Scroll back and it re-closes.
Bloom: base ~0.65 on cyan `#3BE1FF` gives luminance 0.40, under the 1.0 gate; full opening
~2.0 gives 1.24 - so it blooms ONLY at the peak. No violet; amber (hue 36) stays the ember.

### ⛔ D20-blocker - THE METEORITE CANNOT CLOSE TODAY

`crystalBuild.ts:1133-1137` gives every shard a CONSTANT spin about its own centroid,
`aRand.z * 2PI`, independent of the gap and non-zero at gap 0: the eight shards sit at
17 / 49 / 8 / 255 / 279 / 68 / 208 / 239 degrees even when "closed", plus a permanent drift
up to 5.6 deg/s. Driving the gap to zero does not recompose the slab - **it produces an
interpenetrating tangle**. (Side finding: today's hover "recompact" has therefore never
actually recompacted anything.) Fix is ONE LINE and zero new uniforms: multiply the spin
angle by the opening scalar, so a closed stone has every piece in the orientation it was
cut in and the partition tiles the slab exactly. **This must land before anything else in
D20.**

Also corrected: the band is anchored to VIEWPORT height, not section height
(`use-diagonal-traverse.ts:199-209`), so the centring scalar `a` spans about **+-0.93, not
+-2.49**. The opening window must be authored against 0.93.

## D21 - EVERYTHING SCROLL-DRIVEN. THE MOUSE GOES INERT ON THE NEURAL SECTIONS.  (APPROVED)

> *"le scritte devono essere animate con lo scroll, non con il cursore se ci passo sopra"*

He was offered a split (text on scroll, the WebGL ring and debris left on hover) and chose
**everything on scroll**: the amber, the letter glow, the lateral slide, AND the WebGL
glow ring and debris all follow the row currently crossing the reading band. On those
sections the pointer does nothing. One grammar: scroll commands, full stop.

**The number already exists and is being thrown away.** The traverse computes the winning
block every frame from its single frozen scroll read (`use-diagonal-traverse.ts:437-443`)
and keeps only the VALUE, discarding the winner's identity. Publish it as `frame.laneRow`.
No second clock, no extra measurement, no per-frame allocation.
Use a NEW attribute `data-lit` - `data-focus` already has an owner
(`use-centre-focus.ts:92,130,139`) and two writers on one attribute fight on touch.
`lusion-type.ts:816-893` changes by ZERO lines.

**Four consequences he was told about and accepted:**
1. Hovering row 2 while reading row 1 now does nothing. A grammar change, not a bug.
2. Keyboard focus KEEPS its ignition and must be re-wired to the same wave.
3. On a narrow desktop window, a downgraded phone and the flag-off build **the traverse
   does not arm at all**, so scroll ignition does not exist there - hover must be KEPT on
   those clients as the fallback.
4. Without a teardown front, switching EN/IT leaves the last row lit and displaced by
   1.5em forever. Must be handled.

Copy does not change by a byte; screen readers are unaffected (`data-lit` is an attribute,
the roll keeps the real string in `.sr-only` at `roll-letters.tsx:87`, the scrambler
restores identical nodes at `label-scrambler.tsx:138,155`).

### MEASURED 2026-08-25, live in the owner's Chrome, 1920x935 - the numbers nobody had

Taken to settle two flagged unknowns before the build plan is written.

| quantity | `#problem` | `#trust` |
|---|---|---|
| section top (doc px) | 5563 | 18640 |
| section height | 5358 px = **5.730 vh** | 1666 px = **1.782 vh** |
| lattice anchors | 5 (the dead ladder) | 1 (`production`) |
| band height | 804 px = **0.8599 vh** | 766 px = **0.8193 vh** |
| `bandY` (vh from section top) | 1.635 | **0.724** |
| `[data-drift]` blocks | 8 | 8 |
| `[data-ledger-row]` | 3 | 3 |
| document height | 28878 px | |

**`#trust`'s `bandY` = 0.724 vh is BELOW `leadVh` = 1.203** - the exact failure the round-12b
refutation flagged as unverified. Under the old ladder, Act II's lead band top would have
gone NEGATIVE, landing inside Act I and breaking the "never three on frame" guarantee. D17
kills the ladder, so this never fires - but it confirms the refutation was right and the
ladder could not have been generalised to a second band as it stood.

Two more facts the plan must absorb: the two bands are **different heights** (0.8599 vs
0.8193 vh) and must both become frame height under D17; and `#trust` is still only 1.78 vh
tall, so the merge has to grow it to roughly Act I's 5.7 vh before the traverse has a
runway - that growth is the other half of D10's page-height bill and it has not been paid
yet.

The two acts are structurally SYMMETRIC (8 drift blocks, 3 ledger rows each), which is what
makes one continuous field across both plausible rather than a special case.

## D22 - THE CRISP LINE SURVIVES UNDERNEATH THE RIVER  (APPROVED)

He was told plainly that this is the one decision of the round that reopens one already
closed with him (`f6cac67`, live in Chrome, the chains-of-blobs verdict), and he confirmed:
**the continuous `LineSegments` chord stays under everything.**

So D18's river is NOT a swarm of large sprites. It is **luminance flowing INSIDE the line**,
with particles demoted to fine grain riding it. Three reasons on the record:
- the chord is the ONLY thing that exists when nothing is flowing - at rest, on reverse
  scroll, under prefers-reduced-motion, with no JavaScript, and on the WebGL2 fallback;
- it is the anti-blob guarantee: with a continuous line underneath, a momentary hole in the
  grain cannot read as a broken chain;
- it costs one draw call and 2 of 8 vertex slots, in its own 8/12 program (7/12 after the
  index packing frees a block).

## D23 - BOTH DENSITIES GET BUILT; HE CHOOSES LIVE  (APPROVED)

The rect-filling band at today's areal density puts **1.83x more net on frame** than
anything he has ever approved. Two defensible readings, both of which fit after packing:
- **A - areal parity** (same texture, denser read): **~660-720 nodes**, 1258-1400 links.
- **B - on-frame parity** (same read, airier): **~391 nodes**, 743-861 links - exactly
  today's 103 nodes visible at any instant, spread over the whole frame instead of a
  central lens.

He chose to see both side by side in Chrome at the same scroll position and decide by eye.
**Build both behind one generator argument.** This is a look decision, not a number.

## D24 - THE PACKET BEADS SHRINK, THE COUNT STAYS  (APPROVED)

Pre-existing, not introduced by this round: the storyboard declares "5-8 sprites above the
bloom threshold at any instant"; the shipped build runs **~76** - the packet beads, **10.3 px
across on a 1 px line**, which is precisely the primitive he rejected in August. It only
passes unnoticed today because there are 0.33 of them per link.

He was offered shrink-only, shrink-and-halve-to-~32, and leave-as-is, and chose **shrink
only**: `PACKET_SIZE 2.0 -> 0.6`, `BEAD_ALPHA 0.9 -> 0.55` => **4.6 px**, post-blend 2.23 -
still blooming, no longer the widest thing on the line. Count stays ~76.

**The declared 5-8 census is therefore knowingly not met, and must not be quietly restated
as if it were.** Report the true number to him after Stage 5.

---

# ROUND 12 - WHERE THE DECISIONS LIVE

- `2026-08-25-round12-BUILD-PLAN.md` - the staged plan, the gates, the rollback levers, the
  parallelism map, the three copy diffs, and PART 5's owner-facing Italian.
- `2026-08-25-round12-decision-brief.md` - continuity, the angle cost curve, the plateau and
  composition defects; the corrected fact sheet.
- `2026-08-25-round12b-merge-stone-type.md` - the merge, the stone, the type conversion.
- `2026-08-25-round12c-{capacity,river,geometry,birth-front,copy}.md` - the engineering.

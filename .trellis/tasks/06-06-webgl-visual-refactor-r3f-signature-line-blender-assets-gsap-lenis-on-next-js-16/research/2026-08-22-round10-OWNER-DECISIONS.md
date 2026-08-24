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

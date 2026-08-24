# ROUND 10 — THE JOURNEY STORYBOARD (the film half)

- **Query**: owner, verbatim (2026-08-22): *"perché non facciamo per tutte e due le reti neurali un'esperienza immersiva come se fosse una motion graphic di alto livello, ma nel sito con lo scroll? scrollando vai avanti magari orizzontalmente o in diagonale nella rete neurale che si illumina, poi viene una scritta animata, poi si va avanti nella rete e ne appare un'altra, la pietra meteorite eccetera. come nel sito igloo, è quasi un video, uno scroll immersivo che si muove."*
- **Scope**: internal (the two shipped sections, the four shipped sticky stages, the WebGL band configs) + the mined igloo/Lusion corpus. **Creative half only.**
- **Date**: 2026-08-24 (task round dated 2026-08-22)
- **Owns**: the film — the through-line, the beat sheet, the copy choreography, the value world, the legibility law, the three viewports.
- **Does NOT own**: the camera-authority decision, the handover protocol, the file-by-file change list, the binding budget, the staged rollout. Those are `2026-08-22-round10-journey-mechanism.md` (parallel agent). Where this document names a pose it names the *read*, and gives the numbers that produce it in the world-moves-past-a-fixed-viewpoint frame — which is option (c) of the handoff §3a and the one every island is already built for.

**Sources**
- Live measurement from the running dev server, home page, 1280×720, page height **21459 px** (supplied by the coordinator; §B quotes it in full).
- Copy: `src/components/sections/problem-section.tsx`, `src/components/sections/production-grade-section.tsx` @ HEAD `b546b08`. **Every string below is byte-identical to those files.**
- Stage grammar: `singularity-passage.tsx` (`.seq-stage`, L167/251/2364/2510), `services-section.tsx` (L252–270, L1312), `fit-section.tsx` (L195–229), `cinematic-system-scroll.tsx` (L1697).
- `2026-08-21-lusion-text-dossier.md` (recipe cards) · `2026-08-21-igloo-stones-dossier.md` · `2026-08-22-round7-stones-v2-anatomy.md` · `2026-08-22-round8-stone-source-anatomy.md` (the value world) · `2026-08-21-igloo-cuts-spec.md` · `2026-08-21-igloo-tunnel-mining.md` · `2026-08-21-round6-neural-constellation.md` · `2026-08-22-round8-scroll-dossier.md`.
- Config: `neuralLatticeConfig.ts` (copy-mask ledger L1620–1850, star/line values), `crystalConfig.ts` (fog, crystal, plexus, callouts), `sectionStore.ts` (`CUT_BOUNDARY_PAIRS`).

**Standing constraints honoured throughout**: solid legible display type (the ghost/outlined look is dead — the parallel fix is landing it); blue/cyan/navy only, **never violet**, sanctioned desaturated amber for failure/ember; no boxed cards; no fake console chrome; no section-sized rectangles of tint; no stone that reads as a glowing blob; no oversized crystal; **no scroll hijack, no `pin:`, no parking**.

---

## 1. THE FILM STRIP — the shape in ten seconds

```
  ACT I — THE FRACTURE                         INTERLUDE                    ACT II — THE ANSWER
  #problem · 6.1 vp · left-diagonal            #work + #services            #trust · 5.95 vp · right-diagonal
  ──────────────────────────────────────       6033 px, world CLOSED        ──────────────────────────────────────
  P0   P1     P2      P3    P4    P5    P6     ═══════════════════          T0   T1     T2      T3    T4    T5    T6
  │    │      │       │     │     │     │        (proof, then offer)        │    │      │       │     │     │     │
  ▓    ░░▒▒   ▒▒░ TXT ▓▒ 01 ▓▒ 02 ▓▒ 03 ███                                 ▓    ░░▒▒   ▒▒░ TXT ▓▒ 01 ▓▒ 02 ▓▒ 03 ███
  ↑    ↑      ↑       ↑     ↑     ↑     ↑                                   ↑    ↑      ↑       ↑     ↑     ↑     ↑
 seam  dark   thesis  no    no    no   WALL                                seam  intact thesis  gate  gate  gate  SLAB
 open  net            evals traces bnds +METEORITE                         open  net            HOLDS HOLDS HOLDS +MARK
                                        (pulse dies)                                                             (pulse survives)

  the signal you are riding                                                 the same signal, three gates,
  hits a wall and dies                                                      out the other side
```

| | ACT I (#problem) | ACT II (#trust) |
|---|---|---|
| heading | forward + **left**-diagonal, yaw −7.7° over the act | forward + **right**-diagonal, yaw +6.3° over the act |
| the net at rest | dark wire (sub-bloom, 0.85 post-blend) | dark wire (identical) |
| what lights | a 1.0-stage-height **shell fixed at the screen plane**; the world slides through it | same shell, same law |
| the wavefront | **dies** at the far wall (the fracture) | **crosses three gates and survives** |
| the stone | fractured — the meteorite, in pieces, in the dead zone | the intact slab, the mark readable inside the ice |
| the argument | this is what you shipped | this is what we ship |

---

## A. THE THROUGH-LINE

Both sections are the same volume, entered twice on crossing diagonals, and they make one argument: **a signal either survives the trip or it doesn't, and what decides is three artifacts.** In Act I you ride a pulse forward through a dark net that lights up around you as you pass; three failures name themselves as you travel — *no evals · no traces · no boundaries* — and each one is a reason the light gets dimmer; at the end of the corridor the pulse hits a wall, dies in a flash of ember debris, and the thing you built is lying there in pieces, a cracked meteorite in a dead volume. That is the demo-to-production gap, staged as an event instead of described in a caption. The page then leaves the world for the interlude (the work you *have* shipped, then the way we engage) and re-enters it from the other side, travelling the opposite diagonal: the same net, intact this time, and the same pulse — but now it meets three gates, and the three gates are the three artifacts, and each one *holds*. It comes out the far end into an intact slab of ice with the SERSAN mark legible inside it. Nothing in either act is decoration: the wall is the failure, the gates are the answer, the stone is the system, and the copy is the only voice that names them. "The intelligence is artificial. The judgement stays human" — the judgement is those three gates.

---

## A2. THE STRUCTURAL DECISION — one film in two movements

**The measured fact that forces this section:** the two nets are **not** adjacent. Between them sit `#work` (2283 px) and `#services` (3751 px) — **6033 px, 8.4 viewport heights at 720**. The owner's mental image ("vai avanti nella rete, appare una scritta, poi si va avanti e ne appare un'altra, la pietra meteorite") describes a continuous corridor. It cannot be literally continuous.

Three ways to reconcile it:

| | (a) ONE world, persisting behind the interlude | (b) TWO independent journeys sharing a grammar | (c) **ONE FILM, TWO MOVEMENTS** ← recommended |
|---|---|---|
| what the interlude does | the net stays alive, dimmed, behind `#work`/`#services` | nothing — two unrelated set-pieces | the world **closes** on the Act I seam and **reopens** on the Act II seam |
| cost | `#services` is *itself* a pinned POV-pan runway (`SEGMENTS 4 · SEGMENT_VH 0.85`) with its own stage, scale and roll. Two stages competing for the same frame is a mess, and 8.4 viewports of "dimmed net" is 8.4 viewports of nothing happening. | zero — but the owner asked for one experience, and the argument (problem → answer) evaporates | one shared grammar, two seams, no overlap with any other stage |
| does the argument survive | yes, weakly (dilution) | no | **yes** — the acts rhyme *because* they are separated: the return is legible as a return |
| owner's rejections | risks "blocchi pagina" over two sections that don't want it | — | none touched |

**Recommendation: (c).** The interlude is not a gap to be papered over — it is the second act break of a three-act structure the page already has. What makes the two movements read as *one film* is not continuity of pixels, it is continuity of grammar: the same volume, the same shell law, the same stone material, the same seam, and **a mirrored heading**. You leave travelling left; you come back travelling right. A reader feels that even if they cannot name it.

Three of the four act edges are **already wired** as igloo section-cut seams in `sectionStore.CUT_BOUNDARY_PAIRS`: `problem→case-studies` (Act I exit), `services→production` (Act II entry), `production→founders` (Act II exit). The fourth — Act I's *entry* — is deliberately not a cut, because the singularity passage owns that edge with its own plunge. **That is the best news in this document**: the passage's tunnel already delivers the reader into a black frame that normalises to flat page-navy and unpins. Act I opens by fading the volume *up out of that black*. The film starts before the section does.

---

## B. THE RUNWAY ARITHMETIC — the binding constraint, done in the open

**Measured today (1280×720, page 21459 px):**

| id | height | in viewports | the `[data-lattice-anchor]` band inside it |
|---|---|---|---|
| `#problem` | 1330 px | **1.85 vp** | **619 px = 0.86 vp** — a letterbox |
| `#trust` | 1475 px | **2.05 vp** | **672 px = 0.93 vp** — a letterbox |

A letterbox under one screen tall is not immersive by definition: the frame the net lives in is smaller than the frame the reader is looking at. **The band must become the stage: `position: sticky; top: 0; height: 100vh; overflow: hidden`** — full-bleed, the whole viewport, exactly `.seq-stage`. That is not a new invention and not a new risk: this site already ships that geometry in four places (`singularity-passage`, `cinematic-system-scroll`, `fit-section`, `services-section`), the owner has approved the feel four times, and it is **CSS sticky, never ScrollTrigger `pin:`** — the architectural rule stays intact and the page keeps moving at natural speed the entire way through.

**The site's own pacing convention** (three approved sections, measured):

| section | beats | vh per beat | runway | measured height |
|---|---|---|---|---|
| `fit-section` | 6 (`BEATS`) | 0.70 (`BEAT_VH`) | `100vh + 6×70vh` = 520 vh | 3941 px |
| `services-section` | 4 (`SEGMENTS`) | 0.85 (`SEGMENT_VH`) | `100vh + 4×85vh` = 440 vh | 3751 px |
| `singularity-passage` | ~5 | — | 380 vh runway + 100 vh stage | 2736 px |

**So one beat = 0.70–0.85 viewport heights, validated three times.** This storyboard budgets 0.40–0.90 and averages 0.73 — inside the house convention.

### B1. The bill

**ACT I — `#problem`**

| beat | vh | px @720 | window in the act |
|---|---|---|---|
| P0 ARRIVAL | 0.40 | 288 | 0.000 – 0.078 |
| P1 THE DARK VOLUME | 0.60 | 432 | 0.078 – 0.196 |
| P2 THE THESIS | 0.80 | 576 | 0.196 – 0.353 |
| P3 01 · NO EVALS | 0.80 | 576 | 0.353 – 0.510 |
| P4 02 · NO TRACES | 0.80 | 576 | 0.510 – 0.667 |
| P5 03 · NO BOUNDARIES | 0.80 | 576 | 0.667 – 0.824 |
| P6 THE WALL + THE METEORITE | 0.90 | 648 | 0.824 – 1.000 |
| **travel** | **5.10** | **3672** | |
| **+ stage** | 1.00 | 720 | |
| **RUNWAY** | **6.10 vp** | **4392 px** | today 1330 px → **+3062 px** |

**ACT II — `#trust`** (deliberately *tighter* — see the beat sheet: the answer is faster than the mess)

| beat | vh | px @720 | window |
|---|---|---|---|
| T0 RE-ENTRY | 0.40 | 288 | 0.000 – 0.081 |
| T1 THE INTACT VOLUME | 0.60 | 432 | 0.081 – 0.202 |
| T2 THE THESIS | 0.80 | 576 | 0.202 – 0.364 |
| T3 01 · EVAL BASELINE | 0.75 | 540 | 0.364 – 0.515 |
| T4 02 · TRACE PROPAGATION | 0.75 | 540 | 0.515 – 0.667 |
| T5 03 · GUARDRAIL CLAMP | 0.75 | 540 | 0.667 – 0.818 |
| T6 THE SLAB + THE VERDICT | 0.90 | 648 | 0.818 – 1.000 |
| **travel** | **4.95** | **3564** | |
| **+ stage** | 1.00 | 720 | |
| **RUNWAY** | **5.95 vp** | **4284 px** | today 1475 px → **+2809 px** |

### B2. What it costs the page — stated plainly

> **The journey adds 5871 px to the home page: 21459 → 27330 px, +27.4%.**
> In viewports: **29.8 → 38.0**. The two neural sections go from the 6th and 7th tallest sections on the page to the 1st and 2nd (ahead of `#fit` at 3941 and `#services` at 3751).

That is the honest number and the owner should see it before anything is built. A **BUDGET VARIANT** exists — drop P0/T0 (fold the seam into P1/T1) and cut the beat pitch to 0.65: Act I 5 beats × 0.65 + 1 = 4.25 vp (3060 px), Act II the same → **+3315 px total, +15.4%**. It costs the thesis beat its own screen (the chapter title would share a beat with row 01) and it costs the wall its breathing room. **Recommendation: pay the 27%.** This is the argument of the page; `#fit` — a six-beat runway about *whether we're a fit* — already costs 3941 px, and it is a lesser idea than this one.

### B3. Beat length is scroll DISTANCE, not time — and why nothing parks

Every beat divides into four sub-windows (fractions of the beat), and the world **never stops**:

| sub-window | beat fraction | px @ 0.8 vh (576) | what happens | world slide speed |
|---|---|---|---|---|
| **EXIT** | 0.00 – 0.12 | 0 – 69 | the *previous* plate leaves (J2-exit) | ramping to 2.9× |
| **TRAVEL** | 0.08 – 0.42 | 46 – 242 | the shell sweeps, the net lights, no body copy on screen | **2.9× nominal** |
| **HANDOFF** | 0.42 – 0.58 | 242 – 334 | shell decays, the volume yaws off the copy column, the plate's masks open | 2.9× → 0.12× |
| **HOLD** | 0.58 – 1.00 | 334 – 576 | the plate is lit, legible, focusable; `R2` idle rollup runs | **0.12× (never 0)** |

The readable band is the HOLD (242 px) plus the next beat's EXIT (69 px) = **311 px ≈ 0.43 vp** per copy beat. Because free sections no longer settle (round 8-A deleted element snapping), **a reader who stops inside the HOLD parks there indefinitely and the page does not move.** The dwell is the reader's, not a timer's. This is the exact reconciliation of "immersivo, quasi un video" with the owner's rejection of the 1-second stop: the *film* has beats, the *page* has none.

**HARD CONSTRAINT — NO POSE IS A TORN POSE.** Every scroll position inside both acts must be a frame you would ship as a screenshot. That is why the storyboard never uses a 0-speed hold, never leaves a plate half-masked outside its own sub-window, and never lets a shell peak sit on a copy column. It is also why the journey ships **without** snap stations: designing so no torn pose exists is a stronger answer than correcting for one. (Owner decision §J-6 if he disagrees.)

---

## C. THE BEAT SHEET

**Frame conventions used below.** The stage is the `[data-lattice-anchor]` rect, now 100 vh × 100 vw. Local space is unchanged from `neuralLatticeConfig`: **x in fractions of stage WIDTH, y/z in fractions of stage HEIGHT, +x right, +y up, +z toward the viewpoint.** The viewpoint is fixed at z = 0 (the screen plane) and **the world slides through it** — this is option (c), the cheapest and the one every island is already camera-locked for.

- **Cloud z extent**: authored −1.72 → +0.38 (2.10 stage-heights). Today's `PLEXUS_RZ 0.2` becomes the *node jitter* around that spine, not the whole depth.
- **World slide**: `zWorld(j) = −1.55 + 2.00·j` (Act I), where `j` = journey progress 0→1 across the act. The **fracture wall** is baked at local z = −1.72, i.e. the farthest thing in the cloud — you fly toward it for the entire act and reach it at j = 0.86 (mid-P6).
- **Lit shell (the propagation law)**: `ign = smoothstep(0.85, 0.15, |z|)` — a C1 soft knee, **never a hard `min()`** (trap #11). ~1.0 stage-height thick, fixed at the screen plane. Links interpolate their endpoints' `ign` and add a travelling head at `SURGE_SPEED 0.55`.
- **Diagonal**: Act I `x(j) = −0.60·j` stage-widths, `y(j) = +0.15·j`, yaw `−7.7°·j`. Act II mirrored: `x(j) = +0.50·j`, `y(j) = −0.12·j`, yaw `+6.3°·j`. At 1280 that is ~110 px of lateral drift per beat — slow, cinematic, unmistakably diagonal.
- **Values** are per-sprite **post-blend**, the scale `neuralLatticeConfig` uses: bloom threshold ≈ **1.0**; a node *centre* is ×6.5 sprite overlap; the AA budget for `--ink-mute` body copy over `--bg` is **ΔL ≤ 0.01943**.
- **The dark rest.** `uJourneyRest = 0.08` puts the un-ignited star at **0.85 post-blend — under the bloom threshold**. The net at rest is a dark wire diagram. The shell lifts it to **10.67** (today's shipped brightness) at the shell edge and to **165** at the core (the existing ignition chain: glow 1.9 × flash 3.4 × surge 1.6 × kiss 1.5 = ×15.5). **That 194:1 range *is* "la rete che si illumina".**

---

### ACT I — THE FRACTURE (`#problem`)

---

#### **P0 · ARRIVAL — the seam opens**
- **window** `j 0.000–0.078` · 288 px · Act I
- **pose** Viewpoint dead ahead, the volume not yet present. World z at −1.55: the far wall is 1.55 stage-heights out. Nothing enters from the sides — the volume **fades up out of the flat page-navy the singularity passage's `.seq-cover` left behind**. This is a continuity cut, not a transition: the passage's plunge ends on `hsl(var(--bg))` and P0 begins on the identical value.
- **what lights** Nothing yet. Over `j 0.03–0.078` the dot-grid far wall rises from alpha 0 to its shipped `hsl(var(--ink)/0.05)`, and the first ~14 star nodes fade in at the **dark rest, 0.85 post-blend**. Zero pixels cross 1.0. Frame peak: **0.85**.
- **the copy** The eyebrow only, recipe **S1** (LabelScrambler, 40 chars/s, head 2, ASCII 33–125, refresh 1/15 s), starting at `j 0.045`:
  - EN `The demo-to-production gap` · IT `Il divario tra demo e produzione`
  - It sits where it sits today — top-left of the container, with its 24 px accent rule. Nothing else is on screen.
- **the stone** Absent.
- **sound of it** A room tone arriving under the silence the plunge left — one low navy pad at −24 LUFS, no transient, so the reader notices the space before they notice anything is in it.
- **cut into P1** No cut. A continuous rise; the beat boundary is invisible by design.

---

#### **P1 · THE DARK VOLUME — you are inside it**
- **window** `j 0.078–0.196` · 432 px · Act I
- **pose** Pure travel at **1.6× nominal** for the whole beat (no plate to hand off to). The world slides z −1.46 → −1.24; lateral drift begins, so **nodes enter from the right edge and from the vanishing point simultaneously** — the classic forward-plus-lateral read. Yaw reaches −1.5°. Nearest lit node: 0.30 stage-heights out.
- **what lights** The shell arrives. Nodes crossing |z| < 0.85 climb the `smoothstep` to their shell-edge value; the first nodes to reach |z| < 0.15 hit the core. **Propagation law: per-node distance gate to the fixed screen plane, plus along-link travel** — a link's ignition is `mix(ignA, ignB, s)` with a travelling head at 0.55 stage-units/s, so the light visibly *runs down the wires* rather than fading in place. Values: shell edge **10.67**, shell core **165**, ~5–8 nodes above 1.0 at any instant, links capped at **0.97** (`LINE_LUM_MAX` — links never bloom, by construction; the stars do the blooming and the lines stay crisp, which is the whole reference grammar).
- **the copy** None. This beat is deliberately wordless — it is the establishing shot and the owner's "scrollando vai avanti nella rete che si illumina" in its pure form.
- **the stone** Absent.
- **sound of it** The room tone gains a 3 kHz air band as the shell arrives — the sound of a room getting *bigger*, not louder; one soft filtered tick per node that crosses the core, ducked to a maximum of three per second.
- **cut into P2** Travel-through. The shell decays from 165 → 10.67 over the last 0.12 of the beat as the volume yaws away from the copy column.

---

#### **P2 · THE THESIS — the first animated line**
- **window** `j 0.196–0.353` · 576 px · Act I
- **pose** TRAVEL 0.08–0.42 at 2.9× (z −1.24 → −1.02, the fastest sustained push of the act — this is where "warp" reads); HANDOFF 0.42–0.58 decelerating to 0.12×; HOLD 0.58–1.00. During the handoff the volume yaws a further −2.2° and drifts an **extra −0.10 stage-widths left**, which is the geometric instrument that clears the type column (§D).
- **what lights** Shell hot through TRAVEL (peak **165**, ~7 nodes over threshold), then **the whole field drops to the copy contract**: every sprite ≤ **0.85 post-blend**, i.e. *nothing in the frame blooms* while the thesis is on screen. No smeared bloom light can reach the type. Behind the copy column the residual after the existing x-gate is **ΔL ≤ 5.5e-4 → 5.98:1** — effectively the bare page.
- **the copy** The chapter plate, entering on **J2** (§I) and choreographed exactly as it is today:
  - **H2, recipe H3** (SplitText words in line masks, y 115→0 over 1 s `--ease-lusion`, 0.025 s/word; x 200→0 trailing +0.4 s), fired at `j`-local 0.42:
    - EN `Most AI projects don't fail at the prototype.` + italic `--ink-mute` `They fail two months after.`
    - IT `La maggior parte dei progetti AI non fallisce al prototipo.` + italic `--ink-mute` `Fallisce due mesi dopo.`
  - **Description, recipe B3** (block fade + rise 30 px, expo.out, cascaded +0.5 s after the title), max-width 34 em, right column at ≥1024:
    - EN `The demo worked. The board nodded. Then real volume hit and the agent started lying, the retrieval drifted, cost-per-run tripled, and no-one on the team could tell which of the seven things you changed last week broke it.`
    - IT `La demo funzionava. Il consiglio ha annuito. Poi è arrivato il volume reale e l'agente ha iniziato a inventare, il retrieval è andato in deriva, il costo per esecuzione è triplicato e nessuno nel team sapeva quale delle sette cose cambiate la settimana scorsa l'avesse rotto.`
  - **Screen position**: the plate occupies the left 62% of the stage at ≥1280 (title) with the description as the right column, i.e. today's `lg:grid-cols-[1fr_minmax(320px,30rem)]` grid, vertically centred in the stage rather than top-aligned in a band. The volume's mass is right and behind.
  - During HOLD, **recipe R2** (idle rollup: every 2 s, one random char per word rolls 0→−100% over 1 s, `--ease-lusion`, delay wordNorm·0.2) keeps the plate alive without moving the page. This is Lusion's EndSection idiom and it is the single cheapest thing that makes a held frame feel un-frozen.
- **the stone** Absent.
- **sound of it** The air band collapses on the handoff — a 400 ms downward filter sweep — and the plate lands in near-silence. The copy should feel like it arrived *because* the rush stopped.
- **cut into P3** Travel-through. The plate exits on the next beat's first 12% (J2-exit: y −20 vh-equivalent, opacity → 0, `--ease-lusion`).

---

#### **P3 · 01 · NO EVALS**
- **window** `j 0.353–0.510` · 576 px · Act I
- **pose** The beat template of §B3. z −1.02 → −0.71. Yaw −3.9° at HOLD. Lateral drift has now carried the dense mass **0.28 stage-widths right of frame centre relative to the reader** — the copy column is opening.
- **what lights** Shell hot through TRAVEL. **New for the row beats: the shell's core value is stepped down each row** — 165 (P3) → 122 (P4) → 88 (P5). The light is failing as the failures accumulate. It is a 2.6 dB-per-beat decay and it is the argument in the value world rather than in a caption. HOLD peak **0.85** (sub-bloom), as P2.
- **the copy** Row 01, entering on **J1** (beat-gated arm, §I) at `j`-local 0.42, choreographed exactly as it ships:
  - index `01·` — settle (autoAlpha + rise, `--ease-lusion`)
  - **CAUSE, recipe R1** (`RollLetters`: per-char column through a 1 em clip, yPercent −500→0, expo.inOut, 1.25 s, cosine centre-out ±62 ms): EN `No evals` · IT `Niente valutazioni`
  - arrow `->` — settle, then GSAP-owned on ignition
  - **EFFECT, recipe R1** on the solid display word, carrying the sanctioned desaturated amber as its own colour (`hsl(36 60% 72%)` — the failure/ember tone, no violet anywhere): EN `no signal` · IT `niente segnale`
  - **BODY, recipe B1** (SplitText words, opacity .1→1 + y 100→0, expo.out 1 s, 0.01 s/word), cascaded +0.3 s after the roll starts, 34 em measure:
    - EN `A system you can't measure is a system you can't fix. Most teams ship without a regression set, then debug at 3am with prompt diffs and screenshots.`
    - IT `Un sistema che non puoi misurare è un sistema che non puoi correggere. La maggior parte dei team va in produzione senza un set di regressione, poi fa debugging alle 3 di notte con diff dei prompt e screenshot.`
  - **On screen**: display line and body left-aligned in the container, vertically centred in the stage; the hairline draws `scaleX` from the left under the body. The row stays `tabIndex=0`; **ignition (hover / `:focus-visible` / touch centre-band) still fires `setHovered("broken", 0)` and recipe Hv1** (chars x 0→1.5 em right-to-left, arrow slides into the vacated 1 em, 0.4 s, delay `(len+1−i)/100`).
- **the stone** Absent. (Owner decision §J-5: a distant silhouette at z −1.6 is the alternative.)
- **sound of it** One dry mid-range knock on the roll's landing beat (t+1.1 s, the `IGNITE_BEAT`), then nothing. Three rows, three identical knocks, each a semitone lower.
- **cut into P4** Travel-through.

---

#### **P4 · 02 · NO TRACES**
- **window** `j 0.510–0.667` · 576 px · Act I
- **pose** Identical template. z −0.71 → −0.40. Yaw −5.1°. The far wall is now visible as a *density*, not a plane: nodes stop appearing beyond z = −1.72, so the vanishing point starts to close.
- **what lights** Shell core **122**. During TRAVEL the **link-fray begins**: links whose far endpoint lies past the fracture plane start to drop their tail alpha, so the corridor ahead reads as *thinning wire*. This is the round-6 fray mechanism, re-gated on z instead of `nodeT`.
- **the copy** Row 02, same recipe stack as P3:
  - CAUSE **R1**: EN `No traces` · IT `Niente tracce` · arrow `->` · EFFECT **R1**: EN `no debugging` · IT `niente debugging`
  - BODY **B1**:
    - EN `When the agent makes the wrong call, you need to know which step failed. Without structured tracing, every incident becomes archaeology.`
    - IT `Quando l'agente prende la decisione sbagliata, devi sapere quale passo ha fallito. Senza un tracing strutturato, ogni incidente diventa un lavoro di archeologia.`
- **the stone** Absent.
- **sound of it** The knock, a semitone down. Under it, a first hint of the wall: a 60 Hz sub that was not there in P3, at −38 LUFS.
- **cut into P5** Travel-through.

---

#### **P5 · 03 · NO BOUNDARIES**
- **window** `j 0.667–0.824` · 576 px · Act I
- **pose** z −0.40 → −0.09. Yaw −6.3°. **The wall is now the frame**: the vanishing point has closed to a dense field and the corridor visibly ends 1.6 stage-heights ahead.
- **what lights** Shell core **88** — the dimmest travel of the act. Fray is at full: ~43% of link length past the fracture is running the ember ramp (`EMBER_COLOR #886a3d`, the sanctioned desaturated amber). Ember debris drifts at the shipped `DEBRIS_ALPHA_MAX`.
- **the copy** Row 03:
  - CAUSE **R1**: EN `No boundaries` · IT `Niente confini` · arrow `->` · EFFECT **R1**: EN `no trust` · IT `niente fiducia`
  - BODY **B1**:
    - EN `Tools and data without a permission model become a liability the first time the agent does something a regulator notices.`
    - IT `Tool e dati senza un modello di permessi diventano un rischio la prima volta che l'agente fa qualcosa che un'autorità di vigilanza nota.`
- **the stone** **First sighting.** At `j`-local 0.75, deep in the HOLD, the fractured meteorite becomes visible at z = −1.05, **11% of stage height** on screen, silhouetted against the wall, its fog quad at 22% of `FOG_OPACITY`. It is a shape in the distance, not an event. Nobody has to notice it; everybody will.
- **sound of it** The knock, a semitone down again. The 60 Hz sub is now audible and slowly rising in pitch — the only thing in the mix that is *approaching*.
- **cut into P6** Travel-through, but the deceleration is **removed**: P6 starts at speed.

---

#### **P6 · THE WALL AND THE METEORITE — the money shot**
- **window** `j 0.824–1.000` · 648 px · Act I · **the only beat with an internal three-act structure**

| sub-window | beat fraction | px | what |
|---|---|---|---|
| **APPROACH** | 0.00 – 0.46 | 0 – 298 | world slides z −0.09 → +0.20 at **2.4×**, no deceleration. The stone grows 11% → **48% of stage height** (346 px @720) — the growth *is* the drama |
| **IMPACT** | 0.46 – 0.60 | 298 – 389 | the wavefront reaches the fracture plane and **dies** |
| **VERDICT** | 0.60 – 1.00 | 389 – 648 | the stone settles to its hold pose, callouts draw, the world slides at 0.12× |

- **pose** Head-on. The lateral drift **stops** at `j`-local 0.46 (total lateral −0.60 reached) and the yaw unwinds from −7.7° back to **−1.2°** over the impact — igloo's tumble grammar exactly: the object spins itself upright as it reaches screen centre (`rotation = k·(centered − progress)`, k = 11/14/6 by axis). Everything that has been diagonal for six beats squares up for the verdict. The stone enters **from the vanishing point**, dead centre, and comes at you.
- **what lights** Three events in 91 px:
  1. **the flash** — the wavefront's leading nodes hit the plane and spike to **165** for ~120 ms, then the whole shell collapses to **0.85** in 180 ms. Every node past the plane never lights at all: the far half of the volume stays a dark wire diagram for the rest of the page. *That* is the failure, rendered.
  2. **the spark burst** — the shipped `SPARK` role (32 baked particles) fires at the fracture point, ember amber, ceiling at the shipped `DEBRIS_ALPHA_MAX`.
  3. **the fray completes** — link tails past the plane cut cleanly (the shipped clean-break alpha gap), far endpoints drift off-station with the coherent `nodeDrift`.
- **the stone** The fractured slab (`/models/crystal-fractured.glb`, 1114 tris, 8 pieces), exploded at its authored rest gap, **the gap breathing outward once on the impact** (the shipped fracture-surge read) and settling. Hold pose: **34% of stage height** (245 px @720) — the owner's "non troppo grande", re-derived against a 100 vh stage instead of a 619 px band, i.e. `CRYSTAL_SCALE ≈ 0.102` where today's 0.17 gave 56% of a letterbox. Its fog quad ramps to full `FOG_GAIN 1.9 × FOG_OPACITY 0.55` → composited core **lumLin 0.069**, body **0.055**, brightest stone pixel **0.25–0.45**, own dynamic range **7–8:1**, clamped at 1.0 so **nothing on the stone blooms** except (owner decision §J-3) an optional hairline at grazing incidence `f1 ≳ 0.97`.
- **the copy** No new strings. Two things return, both already on screen today:
  1. **The three ghost callouts** (`.eyebrow`, 10 px, `text-ink-mute/80`, leader lines) — the effect strings `no signal` / `no debugging` / `no trust` (IT `niente segnale` / `niente debugging` / `niente fiducia`) — now **gated to this beat only**, riding the shard centroids through the shipped `--callout-N-left/top` projection. Entrance: **S2** (§I — igloo's glyph-atlas scramble, leader draw 0.2 s + alpha 0.4 s + scramble 0.75 s, `ease:"none"`), on igloo's own windows re-expressed in beat fractions: title-class 0.60–0.94, secondary 0.66–1.00.
  2. **Row 03's plate** stays legible until `j`-local 0.30, then exits. The reader is never left with a wordless money shot they cannot place.
- **sound of it** The rising sub arrives and stops dead — no boom, a *cut to silence* with one short high transient (a piece of ice, not an explosion). Then room tone alone for 250 ms before the callout beeps (igloo's own idiom: one soft beep per callout reveal, throttled 0.4 s, three samples picked at random).
- **cut out of the act** The **igloo section-cut seam**, already wired: `problem→case-studies`. The diagonal band sweeps (slope −0.2·aspect, three-margin cascade 2.0 / 0.9→1.0 / 0.2→2.0), the block displacement and the leading-edge HSV lift run, and `uWarpBurst` spikes with `min(1, 0.35 + 0.65·velocity)`. **The world closes here.** The stone does not follow you into `#work`.

---

### ACT II — THE ANSWER (`#trust`)

The same seven-beat skeleton, mirrored heading, tighter pitch, and one structural inversion: **where Act I's wavefront meets a wall, Act II's meets three gates and passes each one.** The gates are at the shipped ignition regions `RING_T = [0.25, 0.5, 0.75]`, re-expressed as z-planes so they arrive on T3, T4, T5.

---

#### **T0 · RE-ENTRY — the seam opens the other way**
- **window** `j 0.000–0.081` · 288 px
- **pose** The `services→production` cut (already wired) delivers you in. Volume fades up out of the seam's trailing edge rather than out of black — a *harder* entry than P0 on purpose: Act I began in the dark, Act II begins mid-stride. World z at −1.55, lateral drift **positive** from the first frame: nodes enter **from the left**. Anyone who felt the left-drift of Act I feels this as a return.
- **what lights** ~14 nodes at the dark rest, **0.85**. Nothing blooms.
- **the copy** Eyebrow, **S1**: EN `What production-grade actually means` · IT `Cosa significa davvero production-grade`
- **the stone** Absent.
- **sound of it** The Act I room tone, transposed up a fourth. Same room, different key.
- **cut into T1** Continuous.

---

#### **T1 · THE INTACT VOLUME**
- **window** `j 0.081–0.202` · 432 px
- **pose** Pure travel at 1.6×, z −1.46 → −1.24, yaw +1.2°, nodes entering from the left edge and the vanishing point.
- **what lights** Shell edge **10.67**, core **165** — and **it does not step down.** Act I's three rows dimmed the corridor 165 → 122 → 88; Act II holds 165 all the way to T6. Nobody will consciously notice; everybody will feel that this net is *brighter*, and it will be true, measurably, by 88 vs 165.
- **the copy** None. The wordless establishing shot, rhyming with P1.
- **the stone** Absent.
- **sound of it** Same air-band open as P1, but the per-node ticks are cleaner and the duck is gone — three per second, all of them landing.
- **cut into T2** Travel-through.

---

#### **T2 · THE THESIS**
- **window** `j 0.202–0.364` · 576 px · sub-windows per §B3
- **pose** TRAVEL 2.9× (z −1.24 → −1.02), HANDOFF, HOLD. Extra +0.10 stage-widths of drift on the handoff, mirrored from P2.
- **what lights** Shell hot through TRAVEL, then the copy contract: everything ≤ **0.85**, nothing blooms, residual over the copy column **ΔL ≤ 5.5e-4 → 5.98:1**.
- **the copy** The chapter plate, **J2** in, choreographed as it ships:
  - **H2, recipe H3**:
    - EN `Three things every SerSan system ships with,` + `--ink-mute` ` before we call it done.`
    - IT `Tre cose che ogni sistema SerSan porta con sé,` + `--ink-mute` ` prima di dirlo finito.`
  - **Description, recipe B3**:
    - EN `Not a list of compliance buzzwords. These are artifacts you can ask to see in any scoping call. Open a panel to see why it matters.`
    - IT `Non un elenco di buzzword sulla compliance. Sono artefatti che puoi chiedere di vedere in qualsiasi call di scoping. Apri un pannello per capire perché conta.`
  - ⚠ **`Open a panel to see why it matters.` refers to panels this section no longer has** (the rows are open; the panel grammar was retired in W2). It is a frozen, owner-approved D-17 string. **Not mine to change** — flagged as owner decision §J-8, not rewritten.
  - **R2** idle rollup through the HOLD.
- **the stone** Absent.
- **sound of it** Same collapse-to-silence as P2, one tone brighter.
- **cut into T3** Travel-through.

---

#### **T3 · 01 · EVAL BASELINE — the first gate holds**
- **window** `j 0.364–0.515` · 540 px
- **pose** z −1.02 → −0.75, yaw +3.0°. Nodes entering left.
- **what lights** During TRAVEL the shell reaches **the first gate plane** (z = −0.88, the `RING_T 0.25` region re-expressed in depth). Propagation law at a gate: the wavefront **compresses against the plane for ~90 ms** (the shell's leading edge flattens on a C1 knee — *never* a hard `min()`, trap #11), the gate's region-stars flash to **165**, and the wavefront **releases and continues** at full amplitude. The visual grammar is a held breath and a release. Contrast this with P6: identical set-up, opposite outcome. HOLD: copy contract, **0.85**, nothing blooms.
- **the copy** Row 01, **J1**-armed:
  - kicker index `01·` — settle; **label, recipe R1**: EN `eval baseline` · IT `baseline eval` (goes `--accent` on ignition)
  - **CLAIM, recipe H3** on **solid** display serif (the ghost is dead):
    - EN `Every system ships with a regression set.` · IT `Ogni sistema viene rilasciato con un set di regressione.`
  - **WHY, recipe B1**:
    - EN `Versioned cases and day-zero baselines mean you can prove the system still works after every change, instead of hoping.`
    - IT `Casi versionati e baseline al day-zero ti permettono di dimostrare che il sistema funziona ancora dopo ogni modifica, invece di sperarlo.`
  - Row stays `tabIndex=0`; ignition still fires `setHovered("healthy", 0)` and `bumpCluster("healthy", 0)` on the entrance's landing beat — **re-timed from the IntersectionObserver edge to the beat gate**, so the ring ignites exactly as the claim lands.
- **the stone** Absent.
- **sound of it** A short rising interval on the gate release — two notes, not one; the second one is the answer to the first. Three gates, three intervals, each one a step up.
- **cut into T4** Travel-through.

---

#### **T4 · 02 · TRACE PROPAGATION — the second gate holds**
- **window** `j 0.515–0.667` · 540 px
- **pose** z −0.75 → −0.48, yaw +4.4°.
- **what lights** Gate 2 at z = −0.61 (`RING_T 0.5`). Same compress-and-release. Additional read, unique to this gate: as the wavefront passes, **the packet beads behind it double their rate** (`PACKET_RATE 0.3 → 0.6` for the remainder of the act) — the traffic on the wires becomes visibly denser once tracing exists. It is the only literal illustration in the film and it earns its place because the claim is literally about propagation.
- **the copy** Row 02:
  - label **R1**: EN `trace propagation` · IT `propagazione trace`
  - **CLAIM, H3**: EN `Traceable from input to action.` · IT `Tracciabile dall'input all'azione.`
  - **WHY, B1**:
    - EN `When something breaks at 3am, the answer is in the trace: retrieval, plan, tool call, human review. Not in Slack archaeology.`
    - IT `Quando qualcosa si rompe alle 3 di notte, la risposta è nel trace: retrieval, plan, chiamata a tool, revisione umana. Non in un'archeologia su Slack.`
- **the stone** Absent.
- **sound of it** The interval again, a step up. The bead traffic gets a granular texture at −42 LUFS — audible only when the reader stops.
- **cut into T5** Travel-through.

---

#### **T5 · 03 · GUARDRAIL CLAMP — the third gate holds**
- **window** `j 0.667–0.818` · 540 px
- **pose** z −0.48 → −0.21, yaw +5.4°. The far end of the corridor is now **open** — there is no wall. A reader who rode Act I will register the absence before they can articulate it.
- **what lights** Gate 3 at z = −0.34 (`RING_T 0.75`). The compress is the **longest** of the three (~140 ms) and the release the most emphatic — a guardrail is the one that has to hold hardest. Past it, every link runs at full and no fray exists anywhere in the volume.
- **the copy** Row 03:
  - label **R1**: EN `guardrail clamp` · IT `clamp guardrail`
  - **CLAIM, H3**: EN `Boundaries before features.` · IT `I confini prima delle feature.`
  - **WHY, B1**:
    - EN `Data access and agent tools are scoped before the first feature ships. The default answer to an unscoped action is no.`
    - IT `L'accesso ai dati e i tool degli agenti vengono definiti prima della prima feature. La risposta di default a un'azione non prevista è no.`
- **the stone** **First sighting**, at `j`-local 0.75: the intact slab at z = −1.05, **11% of stage height**, dead centre at the open end of the corridor. In Act I the distant shape was in front of a wall. Here it is in front of nothing — it *is* the end of the corridor.
- **sound of it** Third interval, highest. Then the room widens (reverb tail +40%) — the corridor opening.
- **cut into T6** Travel-through at speed, no deceleration.

---

#### **T6 · THE SLAB AND THE VERDICT**
- **window** `j 0.818–1.000` · 648 px

| sub-window | fraction | px | what |
|---|---|---|---|
| **APPROACH** | 0.00 – 0.46 | 0 – 298 | z −0.21 → +0.24 at 2.4×; the slab grows 11% → **48% of stage height** |
| **ARRIVAL** | 0.46 – 0.60 | 298 – 389 | the wavefront **exits the far end and passes through the slab** |
| **VERDICT** | 0.60 – 1.00 | 389 – 648 | tumble settles, mark reads, callouts draw, disclaimer lands |

- **pose** Head-on, mirroring P6 exactly: lateral drift stops at 0.46 (+0.50 total), yaw unwinds +6.3° → **+1.0°**, the object squares up on the igloo tumble law. The slab enters from the vanishing point and comes at you.
- **what lights** The wavefront does not die. It reaches the slab and **enters it** — the shell's last 0.15 stage-heights of travel happen *inside* the ice, so for ~200 ms the stone is lit from within by the signal that survived all three gates. Then the shell exits behind the viewpoint and the field returns to the dark rest. Peak in-ice value stays under the clamp (**≤ 1.0**, igloo's `clamp(…, 0, 1)` verbatim): the stone glows because the *fog* is up, not because the stone is a lamp. This is the round-8 verdict enforced at the one beat where it would be most tempting to break it.
- **the stone** `/models/crystal-intact.glb` (450 tris). Hold pose **34% of stage height**, fog at full (core lumLin 0.069, body 0.055, peak 0.25–0.45, range 7–8:1). **The SERSAN mark reads inside the ice** via the shipped screen-space projection (`93bb31d`), screen-upright (`MARK_TUMBLE false`, owner decision §J-4 in the handoff). Its on-screen size must be re-verified against the 100 vh stage: at 60% of the silhouette and a 34% hold pose, the mark spans ~147 px at 720 — above the legibility threshold, but **re-measure, do not assume**. The plexus (12 points, ≤24 lines, `PLEXUS_RADIUS 1.45`, mask 1.1→1.9) connects **only in this beat**, igloo's own gate: `|r| < 1.25` world units ≈ ±0.30 viewport, re-expressed as beat fraction 0.50–1.00.
- **the copy** No new strings. Three things:
  1. **The three ghost callouts**, gated to this beat, **S2** in, riding the shipped bbox-anchor projection: `eval baseline` / `trace propagation` / `guardrail clamp` (IT `baseline eval` / `propagazione trace` / `clamp guardrail`).
  2. **Row 03's plate** holds until `j`-local 0.30, then exits.
  3. **The closing disclaimer, recipe B2** (line masks, y 100%→0, 0.6 s `--ease-lusion`, 0.10 s/line), landing at `j`-local 0.72 in the lower-left, mono, 12 px, `--ink-mute` — the last words of the film:
     - EN `We do not claim compliance certifications we don't hold.` / `We do build systems that pass them.`
     - IT `Non rivendichiamo certificazioni di compliance che non possediamo.` / `Costruiamo sistemi che le superano.`
     - ⚠ This is 12 px `--ink-mute` copy sharing the frame with the stone. **It must sit in the fog's zero-alpha zone** — the `FOG_CLEAR 1.0` gate puts the fog's inward falloff at exactly 0 at the stage centre-line, so the disclaimer's left-aligned 2xl measure clears it by construction at ≥1280. At 390 see §E.
- **sound of it** The three intervals resolve into one sustained chord as the wavefront enters the ice — the first consonance in the whole film. Then it decays under the disclaimer and the room tone carries alone into the seam.
- **cut out of the act** The `production→founders` seam (already wired). **The world closes.** Nothing from the journey survives into `#founders`.

---

## D. LEGIBILITY, BY CONSTRUCTION

The round-9-B measurement is unambiguous: to clear WCAG AA the plexus must drop to ~1% over the copy column, which at 1280 floors ~70% of the nodes and below ~1100 px floors essentially everything (at 390 the net is invisible — mean node mask **0.002**). Text and net cannot share the same screen space at the same time. **The journey resolves it by never asking them to.** Three instruments, applied in this order:

### D1. TIME — the primary instrument
Copy beats and travel beats are different beats. The shell's peak (165 post-blend) is confined to each beat's TRAVEL sub-window (0.08–0.42), where **no body copy is on screen**. Every plate enters after the shell has decayed. This alone removes the conflict for the 342 px of TRAVEL in each beat.

### D2. GEOMETRY — the second instrument
On every HANDOFF the volume drifts an **extra −0.10 (Act I) / +0.10 (Act II) stage-widths away from the type column** and yaws 2.2° further. Combined with the act's cumulative diagonal, by the time any plate is lit the cloud's dense mass sits ≥ **0.28 stage-widths** from frame centre on the far side of the copy. The copy column is not masked — it is *vacated*.

### D3. VALUE — the residual gate, with numbers
Whatever remains inside the type box is held to a measured contract. The rest-level change does most of the work for free: `uJourneyRest 0.08` takes the un-ignited star from today's **10.67** to **0.85 post-blend**, a 12.5× reduction, so the residue is 12.5× smaller before any mask runs.

| what | today (HEAD) | in the journey | contrast for `--ink-mute` #8A94A6 over `--bg` #0B1422 |
|---|---|---|---|
| star node centre, unmasked | ΔL 69.4 | ΔL **5.53** | — (never behind copy) |
| star node centre, in the copy column at the shipped floor 1e-4 | ΔL 0.00694 → **5.38:1** | ΔL **5.5e-4** → **5.98:1** | bare page is 6.04:1 |
| link line, copy column, floor 3e-3 | ΔL ≤ 0.00291 | ΔL **≤ 2.3e-4** | — |
| pathological superposition (capped line + node centre + bead) | ΔL 0.0117 → **5.05:1** | ΔL **9.3e-4** → **5.94:1** | |
| fog under the worst copy pixel (1280, the copy crosses the centre-line by 37 px) | alpha 0.017 → **5.8:1** | unchanged, **5.8:1** | AA breaks at alpha 0.164 — **9.6× headroom** |
| **bloom smear onto type** | star core is 10.67 = 10.7× threshold | **0.85 = 0.85× threshold → none, anywhere, during any copy beat** | |

**The headroom this buys is the point.** With the AA budget at ΔL ≤ 0.01943 and a copy-column residue of 5.5e-4, the mask floor could be raised from `1e-4` to **≈1.5e-3** — a **15× more visible net over the copy** — and still land at 5.0:1. Whether to spend that headroom is a taste call (§J-7); the storyboard's baseline spends none of it.

**Large type is a separate contract and it is generous.** WCAG AA for text ≥24 px is **3:1**, and every display string in both sections is 30.4–92 px. For `--ink` #F5F7FA (rel-lum ≈0.90) the background may rise to ΔL **0.26** before 3:1 breaks; for the `--ink-mute` italic spans inside the H2, to ΔL **0.058**. That is 3–13× the body budget. **Consequence, stated so an implementer does not over-engineer: display type may share the frame with the *field*; it may not sit on a star core** (an unmasked core is ΔL 5.53 even at the dark rest). The rule is compositional, not numeric: place the plate in the frame's negative space, which D2 creates.

---

## E. THREE VIEWPORTS

| | **1440 (desktop)** | **1280 (laptop)** | **390 (phone)** |
|---|---|---|---|
| stage | `100vh` sticky | `100vh` sticky | **`100svh`** sticky — the `singularity-passage` D-7 discipline; `vh` jumps when the address bar collapses |
| stage aspect (w:h) | 1440×810 → **0.56** | 1280×720 → **0.56** | 390×844 → **2.16 (portrait!)** |
| beat pitch | as specced | as specced | **0.60 vh flat** (Act I 5.0 vp = 4220 px @844; Act II 4.85 vp) |
| beat count | 7 + 7 | 7 + 7 | **5 + 5** — P0 folds into P1, P2 keeps its own beat, rows keep theirs, P5+P6 merge into one WALL beat (the stone still gets its approach; the third row's plate exits into it) |
| diagonal | full: x ∓0.60, yaw ∓7.7° | full | **z-push only** — lateral drift → ∓0.18, yaw → ∓2.0°. Reason: a strong lateral on a hand-held portrait frame reads as instability, not travel, and the yaw costs fill rate |
| copy edge (`uCopyEdge`) | 0.0050 | 0.0637 | **0.4529** |
| net behind copy during HOLD | vacated by D2; residue 5.98:1 | vacated; residue 5.98:1 | **the net is at z ≤ −1.4 and below the dust floor — there is nothing behind the copy at all. 6.04:1, the bare page.** |
| the net during TRAVEL | fills the frame | fills the frame | **fills the frame, at full brightness** — for the first time on this site the phone gets a *visible* net, because it gets it in beats where no copy competes for the space |
| crystal | 34% of stage height (275 px) | 34% (245 px) | **28% of stage height (236 px)** — narrower frame, so cap by *width*: ≤ 62% of stage width |
| plexus | 12 pts / ≤24 lines | 12 / ≤24 | **8 pts / ≤14 lines** (fill-rate) |
| callouts | 3, S2, leader lines | 3 | **hidden** (they are `max-sm:hidden` today and every string is duplicated in the row above — keep that) |
| closing disclaimer (T6) | lower-left, clears the fog | clears the fog | **above the stone, not beside it** — at aspect 2.16 there is no lateral clearance; stack it and let the stone hold the lower 45% of the frame |
| fog | full | full | `FOG_OPACITY` ×0.8 (the fog's y-radius against a 2.16 aspect otherwise reaches the frame edges — the "blocchi pagina" failure mode) |

**⚠ A real finding for the mechanism agent.** `BAND_ASPECT = 0.45` is a build-time constant used to convert local x into height units for near-neighbour link distances. It was authored for the 0.86 vp letterbox. A 100 vh stage is **0.56 at desktop and 2.16 at 390 portrait** — a 4.8× swing. A cloud seeded against 0.45 will produce wrong neighbour sets on a phone stage (links either everywhere or nowhere). The phone almost certainly needs its own seeded cloud shape, not a scaled desktop one. This is the single biggest sizing risk in the design and it is not visible until it is on a phone.

---

## F. REDUCED MOTION

`prefers-reduced-motion: reduce` (and no-JS, and SSR, and tier `"off"`) collapses the whole journey to **exactly what ships today**, which is already correct and already tested:

- **No stage.** No `data-on`, no sticky, no runway height, no `overflow: hidden`. Both sections are normal vertical flow at their current `section-lg` heights — the `.seq-static` pattern from `singularity-passage`, which never enters the sticky branch at all (`if (!c.motionOk) return`).
- **All copy settled and visible.** Chapter, description, three rows (index, cause, arrow, effect, body), hairlines full-width, closing disclaimer. No FROM poses baked into `className` (the D-10 rule): every hidden pose is primed by GSAP at arm time only, and GSAP never arms.
- **Zero timers.** No `R2` idle rollup, no `S1` scramble (LabelScrambler is RM-aware), no drift ticker, no shell, no store bumps from the entrance path.
- **No canvas.** `CanvasHost` renders nothing at tier `"off"`. The band keeps the masked dot-grid and the `NeuralGraphFallback` SVG at its current letterbox height — a static, legible diagram of the same graph, healthy or broken.
- **Focus order unchanged.** Rows stay `tabIndex=0` in source order (index → cause → effect → body), the global `:focus-visible` ring applies, and the ignition CSS resolves to solid readable `--ink-mute` in every state (the existing RM block already carries the state selectors, which is why the touch centre-band `[data-focus="true"]` cannot out-specify it).

**And the a11y contract for the non-RM sticky path**, lifted verbatim from `singularity-passage`'s five clauses because it is already proven: the copy plate's JSX never moves out of the stage; the only `aria-hidden` node is the decorative layer wrapper, which carries no text and no focusable descendants; `setPanelInteractive(on)` flips `pointer-events` + `inert` + `aria-hidden` **together**, driven by the plate's own opacity so the accessibility state always *matches* the visual state and never leads it; and if a plate ever overflows `100vh − header` (worst case: 390×844 in IT, the long row bodies), the track becomes `overflow-y:auto; overscroll-behavior:contain` with `data-lenis-prevent` — **measured, never assumed, and armed only when it genuinely overflows**.

---

## G. THE PALETTE AND THE VALUE WORLD

**Palette — blue / cyan / navy, no violet, ever.**

| role | token / value | lumLin | where |
|---|---|---|---|
| page | `--bg` `#0B1422` | 0.00686 | everything sits on this |
| star / plexus | `PLEXUS_COLOR` `#D8F4FF` | — | nodes, links, beads |
| signal accent | `--accent` `#3BE1FF` | — | gate flashes, ignition, callout leaders |
| depth accent | `--accent-2` `#2A7FFF` | — | far-field wire, the vanishing point |
| fog | `CRYSTAL_FOG_COLOR` `#2E4A6E` (B/R ≈ 5.7) | 0.066 raw → **0.069 composited** | the stone's world |
| failure / ember | `EMBER_COLOR` `#886a3d`, display amber `hsl(36 60% 72%)` | — | **Act I only**: fray, debris, spark burst, the EFFECT words |
| type | `--ink` `#F5F7FA` / `--ink-mute` `#8A94A6` | 0.90 / 0.2935 | all copy |

**Value targets per beat** (per-sprite post-blend; bloom threshold ≈ 1.0):

| beat | field rest | shell core | # sprites > 1.0 | stone | fog | anything blooming? |
|---|---|---|---|---|---|---|
| P0 / T0 | 0.85 | — | 0 | absent | 0 | **no** |
| P1 / T1 | 0.85 | 165 | 5–8 | absent | 0 | stars in the shell only |
| P2 / T2 TRAVEL | 0.85 | 165 | 5–8 | absent | 0 | stars |
| P2 / T2 HOLD | 0.85 | — | **0** | absent | 0 | **no** |
| P3 TRAVEL | 0.85 | **165** | 5–8 | absent | 0 | stars |
| P4 TRAVEL | 0.85 | **122** | 4–6 | absent | 0 | stars |
| P5 TRAVEL | 0.85 | **88** | 3–5 | 11% silhouette | 0.22× | stars |
| T3 / T4 / T5 TRAVEL | 0.85 | **165** (no decay) | 5–8 + gate flash | — / 11% @T5 | 0 / 0.22× @T5 | stars |
| all HOLDs | 0.85 | — | **0** | as above | as above | **no** |
| P6 IMPACT | 0.85 | 165 for 120 ms then collapse | ~9 → 0 | 48% → 34% | → 1.0× | the flash + spark burst |
| P6 VERDICT | 0.85 | — | 0 | 34%, body 0.055, peak 0.25–0.45, range **7–8:1** | 1.0× | **nothing** (owner decision: an optional hairline at `f1 ≳ 0.97`) |
| T6 ARRIVAL | 0.85 | in-ice, clamped ≤ **1.0** | 0 | 48% → 34% | → 1.0× | **nothing** |

**The two rules the round-8 measurement bought, restated so they cannot be lost:**
1. `clamp(col, 0, 1)` before alpha, igloo verbatim (bundle L38013). The stone's brightest pixel is **3.4×** its body, not 569×.
2. The stone's read comes from the **fog**, not from emission. A brighter object on black is a lamp; a 20%-darkened copy of a lit fog is a mass. Every beat above keeps the stone body at ≈0.79× the fog around it.

---

## H. WHAT THIS REPLACES, KEEPS, RE-TIMES

| shipped today | verdict | detail |
|---|---|---|
| **The ledger rows** (3 per section: index, cause/label, arrow, effect/claim, body, hairline) | **KEPT verbatim + RE-TIMED** | Every string, every recipe (R1/H3/B1/Hv1), every hairline `scaleX`, `tabIndex=0`, the `:focus-visible` ring. What changes is the *trigger*: `ScrollTrigger start:"top bottom"` → the beat gate (**J1**). One row per beat instead of three rows sharing one letterbox. |
| **The ghost callouts** (`.eyebrow` spans + leader lines + `--callout-N-left/top`) | **KEPT + RE-SCOPED** | Today they are visible for the whole band. In the journey they exist **only on the stone beat** (P6 / T6), on igloo's own gating windows, with the **S2** scramble-in and the beep. This is what they were transplanted for and they have never actually been gated. |
| **The dot grid** (DOM radial-gradient, 26 px, ellipse-masked) | **KEPT + PROMOTED** | It becomes the far-field wall of the volume. Today it is static; in the journey its `background-position` is driven by the journey parameter at **~15× the field's parallax rate** — igloo's `k3` dot layer does exactly this (`−uProgress·10` vs the perlin's `·0.65`) and it is the cheapest depth cue in the entire reference. |
| **The plexus** (12 points, ≤24 lines, orbiting the stone) | **KEPT + GATED** | Connect-enable moves to the stone beat only (igloo: `|r| < 1.25` world). Between stones igloo's plexus dissolves in 0.35 s and that is exactly what we want: it is the stone's *atmosphere*, not the section's. |
| **The crystal** | **KEPT + RESIZED + RE-TIMED** | Absent for five of seven beats; enters as an 11% silhouette on P5/T5; grows to 48% on the approach; holds at **34% of stage height** (`CRYSTAL_SCALE ≈ 0.102`). The parallel "crystal is too big" fix (0.17 → ~0.11) lands in the same place by a different route — **coordinate, do not duplicate.** |
| **The fog quad** (`crystalFog`) | **KEPT + RE-TIMED** | 0 during travel, 0.22× on first sighting, 1.0× on the verdict. `FOG_CLEAR 1.0` and the anisotropic inward falloff are unchanged and still load-bearing. **Re-derive `FOG_RADIUS_Y 0.46` against the 100 vh stage** — at a 2.16 phone aspect it will reach the frame edges. |
| **The ripples** (`RIPPLE_FREQ 12 / AMP 0.0385 / WARP 1.5`, the wet-ice relief) | **KEPT unchanged** | Material-level, not compositional. The moiré fix (`587a795`) stands. One re-check: at a 34% hold pose the stone spans fewer screen px than today, so cycles/px rises — verify against the ~9 px/cycle aliasing wall. |
| **The section-cut seam** (`PostFXNodes` `uWipe` + `uWarpBurst`, `CUT_BOUNDARY_PAIRS`) | **KEPT + PROMOTED to act boundaries** | `problem→case-studies` = Act I out. `services→production` = Act II in. `production→founders` = Act II out. Already wired, already tuned. No new boundaries needed. |
| **`data-emerge`** (the passage's zoom-in landing target on the chapter block) | **KEPT + RE-POINTED** | It must land on the **stage**, not the chapter block, since the chapter now enters on P2 rather than at section top. The passage's plunge → P0 handoff is the one act edge that is not a seam and it is the best entry in the film. |
| **`bump("broken")` / `bumpCluster("healthy", i)` / `productionPulseStore.bump()`** | **KEPT + RE-TIMED** | From IntersectionObserver edges to beat gates. `bumpCluster(i)` now fires as claim *i* lands, which is what its comment always claimed it did. |
| **`useTextDrift`** (k = 0.5 / 1.25 / 1.5 parallax) | **KEPT + RE-BASED** ⚠ | It reads `window.scrollY` every frame. Inside a sticky stage the plate does **not** move with `scrollY`, so the drift would compute a large offset for a stationary element. It must be re-based on beat progress (distance from the HOLD centre) or it will shear the plate. **This is a defect waiting to happen; call it out to the implement agent.** |
| **`useLedgerIgnition` + Hv1 wave + the ignition CSS** | **KEPT verbatim** | Hover / `:focus-visible` / touch centre-band all unchanged. |
| **The `overflow-hidden` full-bleed anchor div** | **REPLACED** | It becomes the stage box: `100vh × 100vw`, `isolation: isolate`. The lattice's camera-lock math is untouched — it locks to whatever rect it is handed. |
| **The letterbox band itself** (619 / 672 px) | **RETIRED** | This is the thing the owner is actually complaining about. |
| **Membranes** (`RING_T` discs) | already off since round 8 | no change |
| **Element snapping** | already deleted (round 8-A) | **do not re-introduce**; see §B3 and §J-6 |

---

## I. RECIPE CARDS

Every copy entrance in the beat sheet names a card. The Lusion cards below are quoted from `2026-08-21-lusion-text-dossier.md` unchanged. Three new cards are defined in the same format and at the same rigour; **each is sourced, none is invented from taste.**

### Cards used from the mined Lusion set

| # | What | Trigger / replay | From → To | Duration | Ease | Stagger | Used at |
|---|---|---|---|---|---|---|---|
| **H3** | Chapter title words in line masks | viewport entry → **now J1** | y 115→0; x 200→0 (x delayed +0.4 s) | 1 s each | `lusion` `cubic-bezier(.35,0,0,1)` | 0.025 s/word | P2, T2 (H2); T3–T5 (claims) |
| **R1** | Letter-roll | card ratio → **now J1** | column y −500%→0 through stacked copies, 1 em mask | 1.25 s | **expo.inOut** | cosine centre-out ±62 ms (`each 0.06, from:"center"`) | P3–P5 (cause + effect); T3–T5 (labels) |
| **R2** | Idle rollup | every 2 s while the plate is in HOLD | 1 random char/word y 0→−100% | 1 s | `lusion` | wordNorm·0.2 | every HOLD sub-window |
| **S1** | Label scramble | viewport entry, replays | empty → text | len/40 s | linear typing | head 2, ASCII 33–125, refresh 1/15 s | P0, T0 (eyebrows) |
| **B1** | Body word-wave | **J1**, +0.3 s after the roll | opacity .1→1, y 100%→0 | 1 s | **expo.out** | 0.01 s/word | P3–P5 bodies; T3–T5 whys |
| **B2** | Small copy lines | **J1** | y 100%→0 in a line mask | 0.6 s | `lusion` | 0.10 s/line | T6 disclaimer |
| **B3** | Meta block | cascaded after the title | opacity 0→1, y 30 px→0 | window 0.4–0.85 | expo.out | +0.5 s after H3 | P2, T2 descriptions |
| **Hv1** | Ignition wave | hover / focus / centre-band, ratio 2.5/s | chars x 0→1.5 em; arrow x 0→1 em | 0.4 s | `lusion` | `(len+1−i)/100`, wave toward the arrow | all six rows |

### New cards

**J1 — THE BEAT GATE (a trigger contract, not an animation).**

| | |
|---|---|
| **what** | Replaces `ScrollTrigger { start:"top bottom", end:"bottom top" }` as the arm for every entrance inside a stage. |
| **arm** | beat progress `bp ≥ i + 0.42` (the HANDOFF edge). Timelines then run **in real time**, not scrubbed — Lusion's law, and the reason the type feels like choreography instead of a slider. |
| **reset** | `bp < i + 0.30` or `bp > i + 1.14` → `tl.pause(0)` and restore the FROM pose. Replays on re-entry (Lusion `_needsReset`, `createReplayTrigger` L178–195). |
| **why the two thresholds differ** | 0.42 arm / 0.30 reset is a 0.12-beat (69 px) hysteresis band. Without it a reader oscillating on a trackpad at the boundary re-triggers the entrance every few frames — the exact defect the round-8 dossier documents for direction-reversing settles. |
| **source** | `lusion-type.ts` `createReplayTrigger` + `fit-section.tsx` L693 (`active = clamp(floor(bp))`), the site's own beat-index idiom. |
| **RM** | never arms. |

**J2 — THE PLATE HANDOFF (copy enters and leaves the stage).**

| | |
|---|---|
| **what** | The transform envelope the copy plate rides inside a sticky stage. This is *not* new to the site: it is `fit-section`'s pane grammar, measured. |
| **enter** | y `+18 vh → −2 vh` (`PANE_ENTER_Y_VH 18` → `PANE_HOLD_Y_VH −2`), opacity 0→1, over beat fraction 0.42–0.58 |
| **hold** | y −2 vh, opacity 1, beat fraction 0.58–1.00 |
| **exit** | y `−2 vh → −20 vh` (`PANE_EXIT_Y_VH −20`), opacity 1→0, over the *next* beat's fraction 0.00–0.12 |
| **ease** | `lusion` `cubic-bezier(.35,0,0,1)`; the `singularity-passage` entry-Y idiom `(1−opacity)·16px` is the small-scale twin |
| **transform owner** | J2 owns the plate wrapper. H3/R1/B1 own the split children. **They never share a target** (the round-5 rule that keeps `data-emerge` and the drift wrappers separate). |
| **a11y** | `setPanelInteractive(opacity > threshold)` flips `pointer-events` + `inert` + `aria-hidden` together, per the `singularity-passage` contract. |
| **source** | `fit-section.tsx` L220–229; `singularity-passage.tsx` L167–180. |

**S2 — THE CALLOUT REVEAL (igloo's glyph-atlas scramble on a leader line).**

| | |
|---|---|
| **what** | The stone-beat callouts: a label, a leader line drawn into the field, a scramble-in, a beep. |
| **trigger** | beat fraction windows, igloo's own gates re-expressed: title-class 0.60–0.94, secondary 0.66–1.00 (from world `r ∈ (−1.6, +0.5)` / `(−0.6, +1.25)` at a viewport ≈ 4.14 world units) |
| **sequence** | leader draw 0.2 s → alpha (`uShow1`) 0.4 s → glyph scramble (`uShow2`) 0.75 s, all `ease:"none"` |
| **scramble law** | `vUv.x = mod(uv.x + 0.125·mod(floor((1−p)·5.753), 8.0), 1.0)`, per-char weighting via a `textWeights` falloff of margin 1.0 |
| **hide** | 0.2 s |
| **audio** | one beep on reveal, throttled 0.4 s, random pick of 3 samples |
| **anchors** | the shipped `--callout-N-left/top` projection (shard centroids on broken, bbox-lerp on healthy), damped `CALLOUT_DAMP 8.0`, write-on-change |
| **phone** | not shown (`max-sm:hidden`, as today) |
| **source** | `2026-08-21-igloo-stones-dossier.md` §4; `2026-08-22-round7-stones-v2-anatomy.md` §A5. |

---

## J. OWNER DECISIONS

Each is a concrete either/or with a recommendation. None should be decided silently.

1. **One film in two movements, or two journeys?**
   Either the world **closes at the Act I seam and reopens at the Act II seam** (the interlude is a genuine act break; the acts rhyme through mirrored headings), **or** the net persists dimmed behind `#work` and `#services`.
   → **Recommendation: close and reopen.** `#services` is already a pinned POV-pan runway with its own stage; two stages fighting for one frame is the mess, and 8.4 viewports of dimmed net is 8.4 viewports of nothing happening.

2. **Pay 27% of page height, or ship the budget cut?**
   Full journey **+5871 px (21459 → 27330, +27.4%)**, 7 beats per act — or the budget variant **+3315 px (+15.4%)**, 5 beats per act at a 0.65 pitch, which costs the thesis its own screen and the wall its breathing room.
   → **Recommendation: pay it.** `#fit` already costs 3941 px for a lesser idea. But he should see the number before a line is written.

3. **Does the stone keep any bloom?** (the round-8 open question, still open)
   Either **igloo-faithful: nothing on the stone crosses 1.0**, the glow comes entirely from the fog — or keep the extreme-grazing band (`f1 ≳ 0.97`) just above 1.0 so a hairline edge still blooms.
   → **Recommendation: the hairline.** At a 34% hold pose with no bloom at all the verdict beat risks reading flat; one hairline is 3 px of light, not a lamp.

4. **Is the broken stone "la pietra meteorite"?**
   Either the **fractured slab in Act I** is the meteorite (arrives, cracked, in a dead volume) and the intact slab in Act II is the answer — or he means the intact one.
   → **Recommendation: the fractured one.** A meteorite is a thing that hit something. It belongs at the wall.

5. **The stone during travel beats: absent, or a distant silhouette?**
   Either **absent for five of seven beats** (it enters at P5/T5 as an 11% silhouette) — or present at z −1.6 throughout, a shape you approach for the whole act.
   → **Recommendation: absent.** Present-throughout is atmospheric but it spends the arrival. Absence makes P5's first sighting an event.

6. **Beat stations as snap points?**
   Either **none** — the beats are designed so that no scroll position is a torn pose (§B3) — or register beat centres as `snapPoint`s with `DEBOUNCE_MS 1000`, the sanctioned igloo-`autoCenter` analog the round-8 dossier keeps for pinned runways.
   → **Recommendation: none.** He hated the 1-second stop. Designing so no torn pose exists is the stronger answer; if a half-beat ever reads badly, that is a design bug to fix, not a scroll correction to add.

7. **Spend the legibility headroom?**
   The dark rest buys a **15× more visible net over the copy column** (mask floor 1e-4 → ~1.5e-3) while still landing at 5.0:1 AA. Either **spend none** (baseline: 5.98:1, the net is genuinely absent behind copy) or spend it (a faint visible mesh behind the reading column, 5.0:1).
   → **Recommendation: spend none in stage 1**, then show him both live on the dev handle. This is exactly the kind of call he should make by eye, and now it is cheap to offer.

8. **`Open a panel to see why it matters.`**
   The frozen D-17 string in `#trust`'s chapter description refers to panels the section no longer has, and the journey does not restore them. Either **leave it byte-identical** (copy freeze absolute) or he approves a change.
   → **Recommendation: leave it and tell him it is there.** I am not authorised to rewrite copy and I have not; this is flagged, not fixed.

9. **The phone journey: 5 beats or 3?**
   Either **5 + 5 at a 0.60 pitch** (Act I 4220 px @844) — or a 3-beat reduced cut (thesis, one merged failure/answer beat, the stone) at ~2530 px.
   → **Recommendation: 5 + 5.** The phone is the one viewport where today's net is literally invisible (mean node mask 0.002); the journey is the fix, and cutting it to 3 beats throws the fix away to save 1700 px on a device that scrolls fast anyway.

---

## Caveats / Not found

- **No live screenshots in this pass.** Every geometric number comes from the coordinator's measured map (1280×720, page 21459 px) plus the shipped configs. The *feel* claims — that a 2.9× travel surge reads as acceleration, that the diagonal reads as diagonal at 110 px/beat — are design judgement calls that must be checked in Chrome with the tab **fronted** (`document.visibilityState === "hidden"` freezes rAF; a frozen frame is not a verdict).
- **The mechanism is not decided here.** All poses are written in the world-slides-past-a-fixed-viewpoint frame because that is what every camera-locked island is already built for, but the camera-authority decision (SignatureLine journey mode / new authority + handover / world-moves) belongs to `2026-08-22-round10-journey-mechanism.md`. If that agent chooses differently, the *reads* in the beat sheet stand and the numbers need re-projecting, not re-designing.
- **`BAND_ASPECT 0.45` vs a 100 vh stage (0.56 desktop, 2.16 phone portrait) is unresolved** and is the largest sizing risk in the design (§E). It needs a seeded-cloud decision, not a constant tweak.
- **`useTextDrift` inside a sticky stage is a live defect risk** (§H) — it reads `window.scrollY` for an element that no longer moves with it.
- **Beat pitches are budgeted from the site's own convention** (`BEAT_VH 0.70`, `SEGMENT_VH 0.85`), not from a reading-speed study. The HOLD band (242 px + 69 px) is a distance, and the dwell is the reader's because free sections no longer settle. If the owner reports the copy beats feel rushed, the lever is the pitch (0.80 → 0.95, +864 px per act), not the sub-window split.
- **Sound is briefed, not specified.** The site's audio decision (ON by default) is recorded in memory but no audio system for these sections was inspected; treat §"sound of it" lines as motion-design intent for whoever builds it, not as an implementation contract.
- **Not analysed here** (deliberately, they belong to the mechanism half): binding budget for a journey uniform, the WebGL2 fallback's shader cost at a 100 vh fill rate, `AdaptiveResolution`/DPR behaviour when the band becomes full-screen, and the `PostFXNodes` `uWipe` retiming for act boundaries.
- **String transcription note.** Every string in the beat sheet is the **rendered** string, verified by `grep -F` against both section files at HEAD. Two of them are written in JSX with an HTML entity — `Most AI projects don&apos;t fail at the prototype.` and `We do not claim compliance certifications we don&apos;t hold.` — and one carries a leading space inside its `--ink-mute` span (`" before we call it done."` / `" prima di dirlo finito."`). Preserve the source form, not this document's form, when touching the files.

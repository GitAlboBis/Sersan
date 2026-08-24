# Round 7-3 — CONTINUOUS SPACE: the left shadow at the passage + the "vecchi blocchi pagina"

- **Query**: owner feedback 2026-08-22 points 3+4 — (3) old page blocks break the transitions, worst in the neural sections; study igloo/Lusion scroll grammar and prescribe per section. (4) the blue left shadow in the hero rides into the horizontal light-speed pan, stays screen-fixed and shows a cut edge; after the pan (head turned right) it must not be visible.
- **Scope**: mixed (internal forensics + reference-dossier synthesis)
- **Date**: 2026-08-22 (research executed 2026-08-24)
- **Repo state**: HEAD `0cb67b1`, viewport used for all math: 1568×764 (the probe viewport)

---

# PART A — THE LEFT SHADOW: FORENSIC IDENTIFICATION

## A.0 Verdict up front

**The rectangular lighter-navy block at (x 0→600, y 50→280) is NOT a GL quad. It is the
DOM: the two hero contrast scrims inside the cinematic spine's sticky stage —
`leftScrimRef` + `radialScrimRef` in `src/components/sections/cinematic-system-scroll.tsx`
(JSX lines 1666–1690, mounted inside the `sticky top-0 h-screen` stage at line 1655) —
left at opacity 1 for the spine's whole post-intro life and frozen on screen by the
one-shot's input lock while the spine's stage is mid-exit under the passage's PINNED
HANDOFF overlap.**

The live probe's "the block is a GL quad" conclusion was a double false positive; both
mechanisms are explained (and falsifiable in 2 minutes) in §A.3. The march sphere, the
eclipse, the lattice quads and DriftParticles are all exonerated by computed screen rects
in §A.2. A genuine (smaller, secondary) GL contribution — the signature line's lit
segment + comet-head bloom clipped at the left frame edge — is documented in §A.4 and
covered by the hygiene audit in §A.6.

## A.1 The mechanism, step by step (all line refs at HEAD)

1. The spine section (`section#top`, `cinematic-system-scroll.tsx:1637–1647`) is
   `SPINE_HEIGHT_VH = 315vh` tall (`src/lib/spine.ts:19`) = **2407px** at vh 764. Its
   sticky stage (`:1655`, `sticky top-0 h-screen overflow-hidden`) unpins at
   scrollY = 2407 − 764 = **1643**.
2. The passage root has `marginTop: -100vh` + `height: 380vh` (the PINNED HANDOFF,
   `singularity-passage.tsx:1302–1305`), so the passage's own sticky stage is pinned
   **while the spine's stage is still sliding out across scrollY 1643→2407** — one full
   viewport of overlap, by design.
3. The design assumed the exiting stage is empty. The code comment at
   `singularity-passage.tsx:2156–2159` says it verbatim: the one-shot's TRIGGER_P (0.10 ≈
   36.5vh past the pin end) *"fires while the spine's stage is still ~63vh from gone, so
   it freezes there for the locked shot — **empty, transparent**, and behind this
   section's paint, then covered outright by the veil/tunnel."*
4. **That premise is false.** What fades on the spine's 0.97→1 exit band is stage 04's
   panel + the left StageRail only (documented at `singularity-passage.tsx:1277–1283`).
   Two stage-level children never fade:
   - `leftScrimRef` (`:1666–1674`): `absolute inset-y-0 left-0 w-[58%]`,
     `linear-gradient(to right, hsl(var(--bg)/0.88) 0%, hsl(var(--bg)/0.45) 38%, transparent 74%)`
     → strong wash over **x 0→595px**, gone by x≈673.
   - `radialScrimRef` (`:1682–1690`): `absolute inset-0`,
     `radial-gradient(58% 85% at 0% 50%, hsl(var(--bg)/0.85) 0%, hsl(var(--bg)/0.4) 38%, transparent 72%)`
     → a left-center lobe, strongest to x≈345, gone by x≈654.
   The only writer of their opacity is the ScrimDimmer rAF (`:1595–1612`):
   `o = morph.active ? 0.15 + 0.85·domReveal : 1` — **after the intro melt it is pinned
   at 1 forever**. Nothing at the spine exit, nothing in the passage, ever writes it again.
5. The one-shot fires at p ≈ 0.10 (scrollY ≈ 1923 at this viewport), stops Lenis and
   consumes all input for ~6.9s (`startPlunge`, `singularity-passage.tsx:1776+`). At the
   fire tick the spine stage's on-screen remnant band is `2407 − scrollY ≈ 484px ≈ 63vh`
   tall (matching the code comment's own arithmetic). **The page cannot move, so the
   remnant band — and both scrims inside it — sit frozen at the frame's top-left through
   the entire TRAVERSE (1.7s) and most of LIGHT-SPEED**, while `pan01` sweeps the whole
   GL world right-to-left underneath. The veil only completes in ENTER's tail
   (`veilSet` ramps at enter-t 0.55–1, `:1911–1912`); the tunnel alpha only rises during
   LIGHT-SPEED (`:1887`) — during TRAVERSE **nothing covers the scrims**.
6. Result on screen: a soft-edged navy wash occupying x 0→~600 of the top band, with
   TWO cut edges — the horizontal stage-bottom boundary (the sticky box's clip sliding
   through the frame) and the gradients' 72/74% stops — floating motionless over a
   world that is visibly panning. Exactly the owner's *"rimane e si vede l'ombra
   tagliata"*, and exactly the violation of his camera model (*"è come se stessimo
   girando la testa a destra"* — a screen-fixed left smudge cannot survive a rightward
   head-turn).
7. After the covert jump lands on the divario, the spine is gone — but
   `#problem`'s `.section-accent-tint::before` (globals.css:528–545, a **left-biased**
   ellipse at `30% 50%`) fades in as the next left-anchored blue wash with a hard
   section-top edge. That is the *"dopo la transizione, l'ombra a sinistra non si
   dovrebbe vedere"* tail of the complaint, and it hands directly to Part B.

### Geometry check against the probe

At the probe snapshot (`seq.p` frozen ≈ 0.107 just past TRIGGER_P; `fade` 0.308 =
`holeFade = max(fade0, ramp(t,0,0.7))` at traverse-t ≈ 0.22 — i.e. the snapshot was taken
~0.5s into the one-shot TRAVERSE, which is also why "it persists through the pan"):

| observed | computed from the scrims |
|---|---|
| x 0→600 | leftScrim strong band 0→595px (38% stop of w-[58%] = 0.58·0.38·1568) |
| y 50→280 | stage remnant band y 0→~470 at fire; radialScrim's lobe center projects to screen y ≈ 88 (stage-internal y 382 minus the 294px already scrolled out), densest ≈ y 40→300 |
| "soft-edged but clearly rectangular" | gradient falloff (soft) inside a hard-clipped sticky box (rect) |
| persists through the pan | input locked; scrims are screen-fixed DOM, world pans in GL |
| cut edge | stage bottom boundary + the 72/74% gradient stops |

## A.2 Exonerated candidates (computed screen rects at the same state)

Constants: `CAMERA_FOV 50°`, `CAMERA_Z 12`, `WORLD_VIEW_HEIGHT = 11.19` world units
(`src/webgl/constants.ts`), aspect 2.052, px-per-world at z=0 = 68.3. At the snapshot:
`pan01 ≈ 0.19–0.23` → camera.x ≈ 2.4–2.9 world; `dist ≈ 15.2`.

| candidate | placement math | screen rect | verdict |
|---|---|---|---|
| **SequenceSingularity march** (`SequenceSingularity.tsx:306–316`) | NOT a billboard quad — `SphereGeometry(1,16,16)` (`singularity/blackHoleMaterial.ts:526`). World-anchored X = `SEQ_PAN_FRAC·W·aspect` = +12.63; apparent Ø = `2.1445/15.2` = 14.1vh = **108px**; screen x-offset = (12.63−2.4)/(0.9326·15.2·2.052) = +0.35·width | ~108px circle at **x ≈ 1280→1390, y ≈ 380→490** (frame-RIGHT) | cannot be a 600×230 top-LEFT rect. Its fill also cannot tint a rect: alpha = `clamp(alphaAcc + envLum·uEnvStarAlpha)` terminates transparent off the disc (blackHoleMaterial header, "TRUE-TRANSPARENCY TAIL") and the silhouette is a circle |
| **HomeSingularity eclipse** (`HomeSingularity.tsx:557–568`) | camera-locked, xFrac 0 / yFrac −0.47, dist 1.758 → Ø ≈ 932px | circle center (784, 741), spans x 318→1250, y 275→1207 | wrong shape/position; and `opacity = ignite × melt × reveal` with `melt = 1−smoothstep(domReveal, .05, .9)` → 0 mid-page. Verify once live (`__sersanHomeSingularity.fade` must be 0 at the passage) |
| **NeuralLattice membrane/nebula quads** (`NeuralLattice.tsx:679–694`, `neuralFieldCompute.ts:1705–1878`) | camera-locked to `[data-lattice-anchor]` rects; hard cull `vpTop > ih + 220` (`NeuralLattice.tsx:283`) | `#problem`'s anchor is ≥ 2 viewports below at the passage → `group.visible = false` | culled. Fragment hygiene is also clean: both layers `Discard(alpha < 0.003)` with radial falloffs reaching 0 inside quad bounds |
| **CrystalCluster** (`CrystalCluster.tsx:227`) | same rect cull | culled | — |
| **DriftParticles** (`DriftParticles.tsx`) | individual ≤ few-px billboarded motes | no coherent rect | not the block — but it has a real pan-edge defect, §A.6 |
| **Preloader tunnel canvas** | parked at `opacity: 0` until the one-shot's LIGHT-SPEED (`tunnelAlpha` 0 through TRAVERSE) | invisible | — |
| **PostFX cut band (W4)** | velocity-gated `uWipeAmp` → 0 when parked (PostFXNodes ROUND 6-A header) | dissolves in ~0.3–0.5s at rest | not a parked artifact |

## A.3 Why the live probe mis-attributed it to GL (both false positives)

1. **`elementsFromPoint` cannot see the scrims.** Both are `aria-hidden` +
   `pointer-events-none` (`cinematic-system-scroll.tsx:1668–1669, 1684–1685`);
   `elementsFromPoint` skips pointer-events:none elements and never returns
   `::before` pseudo-layers either. The probe's own output *contains the culprit's
   container*: it returned `section#top` (the spine!) at (300,150) — the spine section
   still overlaps that point precisely because of the −100vh handoff overlap. "DOM
   transparent there" was an artifact of the probing method, not a fact.
2. **"Canvas hidden → block GONE" does not prove GL.** The scrims are translucent
   washes of `hsl(var(--bg))` — the page's own #0B1422. They are only *visible* as a
   block where they occlude canvas content (starfield, dust, the postfx-graded space —
   the scrim comment at `:1662–1665` literally documents this failure class: *"these
   overlays paint OVER the canvas and were eating the left half of the particle
   headline"*). Hide the canvas and the scrim composites bg-over-bg — optically
   invisible → "gone". The test toggled the thing the scrim was eating, not the scrim.

**Mandatory 2-minute confirmation before coding** (park at the passage, or freeze the
one-shot mid-TRAVERSE with DevTools):
```js
// 1. kill the scrims only — the block must vanish while starfield/line stay:
document.querySelectorAll('#top .sticky > div[aria-hidden]')
  .forEach(d => d.style.visibility = 'hidden');
// 2. restore, then kill the line's emissive — the block must SURVIVE (only the
//    secondary left glow of §A.4 disappears):
__sersanFx.setState({ emissive: 0 });
```

## A.4 Secondary (real GL) contributor — the signature line's clipped head glow

The home curve routes the `credibility` waypoint at `x: -1.2` — glued to the **passage
itself** (`page.tsx:55–57` gives the passage the credibility anchor;
`curves/routeCurves.ts:46`). So across the passage the tube crosses the frame's left
half and its comet head (`uProgress` = camera center, hot `#EAF6FF`, emissive 2.6,
>1.0 → 5-mip bloom) sits at screen x ≈ 50–240 during SETTLE/early TRAVERSE, its bloom
**clipped by the left viewport edge**. This is world-riding (correct verb — it slides
off-left with the pan, unlike the scrims) but it is a real "blue at the left" that the
bloom's clamp-to-edge downsampling smears into a soft left-edge lobe while it exits.
No code change required by default (it IS the world); if the owner still reads a left
smudge after the scrim fix, the tuning lever is the curve: move the credibility
waypoint's `x` from −1.2 toward −1.6 (turn-around further off-frame → the visible
sweep flattens away from the left edge sooner during the pan). Do NOT dim `uReveal`
during the passage — the filament is the one element that must visibly travel with the
world through the pan.

## A.5 Fix spec (owner's camera logic: ride the world or fade with pan01)

**File: `src/components/sections/cinematic-system-scroll.tsx` — desktop branch.**

1. **Delete both stage-level scrims** (`leftScrimRef` JSX `:1666–1674`, `radialScrimRef`
   JSX `:1682–1690`, refs `:1400–1401`) **and the ScrimDimmer rAF** (`:1595–1612` —
   one permanent rAF loop removed for free). The owner's instruction is *"dobbiamo
   togliere l'ombra blu a sinistra"* — removal, not dimming.
2. **Replace with a panel-scoped contrast wash that RIDES THE PANEL.** Each
   `StagePanel`'s copy column (the `max-w-2xl`-class block) gains one absolutely
   positioned child (or `::before`) scoped to the column box with generous negative
   insets (`-inset-x-16 -inset-y-10`), painting
   `radial-gradient(closest-side, hsl(var(--bg)/0.55) 0%, hsl(var(--bg)/0.28) 55%, transparent 100%)`
   — i.e. **the wash reaches exactly 0 inside its own box** (hygiene rule §A.6). Because
   it is a child of the panel, the existing panelOpacity engine fades it with the copy
   for free — it enters, crossfades and exits WITH the world of each stage, including
   stage 04's 0.97→1 exit band. No new JS. Contrast note: the old scrims stacked to
   ~0.88+0.85 of bg because they had to hold AA across the whole left third at every
   camera pose; a copy-scoped wash needs far less because it is always centered on the
   text it protects — verify H1 (`--ink` on wash ≥ 4.5:1 with the brightest GL frame
   behind, see §B.5 method).
3. **Belt-and-braces exit rule**: any stage-level decorative child that remains in the
   spine's sticky stage (now: none on desktop) MUST be added to the same
   0.97→1 exit fade that already drives stage 04's panel + StageRail — the handoff's
   "empty and transparent" premise becomes enforced, not assumed.
4. **Compact spine** (phone, `:1356–1364` centered wash): same treatment, lower
   priority — the phone beat has no camera pan (pan01 never written on coarse,
   seqStore contract), so its wash violates nothing today. Move it panel-scoped only
   when touching the file anyway.
5. **Stacked/RM path** (`:891–903` hero radial): untouched — a static layout may own
   static backgrounds.

**QA for this fix** (Chrome, the session's own dev port — not :3000):
- Park at p ≈ 0.05: panel 05 legible, NO wash outside the copy column's neighborhood.
- Fire the plunge; screenshot at traverse-t ≈ 0.2 / 0.5 / 0.9: the top-left band must
  show pure starfield + dust + line; the only DOM over the GL is panel 05 tracking off-left.
- Reverse-enter from the divario, scrub up through TRACK: same cleanliness both directions.
- Hero at scroll 0 (post-intro): H1/body AA against the brightest HeroLogo frame.

## A.6 Quad-edge hygiene rule + audit of passage-adjacent layers

**THE RULE (add to the task's working notes / future specs):** every translucent or
additive layer that can share a frame with the passage — GL quad, sphere silhouette or
DOM wash — must (a) reach exactly 0 alpha **within its own geometry** (never relying on
a viewport edge or a section boundary to terminate a gradient), and (b) be anchored to
the thing it serves: world content ⇒ world-anchored (slides off with pan01), copy ⇒
scoped to and faded with that copy. A screen-fixed layer over a panning world is
permitted only if its opacity is a function of pan01 (fade with the head-turn).

Audit results, passage-adjacent:

| layer | edge-clean? | anchored right? | action |
|---|---|---|---|
| spine leftScrim / radialScrim | ✗ (72/74% stops + stage clip) | ✗ screen-fixed | **remove** (§A.5) |
| `.seq-veil` (`singularity-passage.tsx:2742–2750`) | ✓ radial #000→transparent at 100% | screen-fixed BY DESIGN, but opacity is a pure one-shot function (0 through TRAVERSE) | ok |
| `.seq-imposter` (`:2560–2574`) | ✓ transparent at 88% | suppressed while `marchLive` | ok |
| tunnel host canvas | ✓ (alpha-composited points) | opacity = tunnelAlpha (one-shot function) | ok |
| march sphere env stars | silhouette is a circle; lensing keeps the star field continuous at the limb; faint discontinuity only at `uEnvStarAlpha` 0.9 | world-anchored X ✓ | accept; re-check in the traverse screenshots |
| NeuralLattice membrane/nebula | ✓ radial falloffs + Discard | camera-locked to anchor rect + hard cull | ok (but see Part B: camera-locking means they do NOT pan with the world — acceptable only because the cull keeps them out of the passage's frames) |
| **DriftParticles strip** (`DriftParticles.tsx:205`) | per-mote ✓ | ✗ **the strip's +x bound enters the frame at full pan**: spawn x ∈ ±(1.15·worldViewWidth)/2 = ±13.2 world; camera.x at pan end = `SEQ_PAN_FRAC·worldViewWidth` = +12.63 → the dust field ENDS ~30–50px right of screen-center for the visible z range. During late TRAVERSE → early LIGHT-SPEED (before tunnelAlpha covers, ~1.5s window) the right half of the frame has no dust | **fix**: in the geometry memo, for motes whose `docY` falls inside the passage band (± one viewport — derivable from `anchors` spans already passed in), widen the x spread to `±(1.15·worldViewWidth + SEQ_PAN_FRAC·worldViewWidth)/2` and re-center by `+SEQ_PAN_FRAC·worldViewWidth/2` (cover the panned frustum, not both extremes). Zero per-frame cost; rebuilds on `anchors.version` as today |
| PostFX vignette | elliptical, always-on | screen-fixed by nature (lens) | ok — a LENS effect legitimately stays screen-fixed under a head-turn. Likely the probe's "second darker band … bottom"; confirm in the same live session (toggle PostFXNodes' vignette knob) |

---

# PART B — THE "VECCHI BLOCCHI PAGINA": INVENTORY + PRESCRIPTION

## B.1 Inventory — every background-painting layer on home

Legend: **T** = `.section-accent-tint::before` (globals.css:528–545 — full-section
radial ellipse `90%×70%` at **30% 50%**, `accent/0.20→0.10@45%→transparent@75%`; `--strong`
variant `:546–554` = 0.28/0.13), **G** = `<SectionGlow>` (ui/section-glow.tsx — two
stacked radial blobs, outer 0.20·i / inner 0.42·i of `--accent`, blur 40/60px),
**D** = blueprint dot-grid, **E** = screen-visible edges the layer produces.

| section (anchor) | file · line | layers | E: visible edges |
|---|---|---|---|
| Spine / hero (`hero`) | cinematic-system-scroll.tsx:1666–1690 (desktop), :1356–1364 (compact), :891–903 (stacked) | leftScrim + radialScrim (desktop); centered wash (compact); hero radial (stacked) | scrim right-stops @ x≈600–670; stage-bottom clip during the handoff (**Part A**) |
| Passage (`credibility`) | singularity-passage.tsx | none (`.seq-static` is RM-only, display:none when armed) | — (clean; the model) |
| Problem / divario (`problem`) | problem-section.tsx:290–294, 385 | **T** + G top-right 1.2 (60rem def) + G bottom-left 0.8/50rem + **D** (`bg-[radial-gradient(hsl(var(--ink)/0.05)_1px,transparent_1px)] [background-size:26px_26px]`, full-bleed band) + callout leader hairlines (content) | tint's section-top edge = the horizontal line floating in the starfield right after the plunge landing; tint left lobe = "ombra blu a sinistra dopo la transizione"; dot-grid starts/stops exactly at the band bounds |
| Featured Work (`case-studies`) | featured-work.tsx | **none** | — (clean; already the Lusion grammar) |
| (`work-in-progress`) | page.tsx:71 | zero-height anchor | — |
| Services (`services`) | services-section.tsx:1204–1207 (pinned) & 1301, 1317–1318 (native) | **T--strong** + G top-left 1.1/55rem + G bottom-right 1/55rem (both mounts); slab top hairlines (content chrome, keep) | tint edges sweep visibly during the POV camera pan; band reads as a teal block vs. neighbors |
| Production (`production`) | production-grade-section.tsx:300–304, 385 | **T--strong** + G bottom-right 1.25/65rem + G top-left 0.9/50rem + **D** | strongest tint on the page — the owner's "teal-tinted BLOCK" band; same dot-grid band edges |
| Founders (`founders`) | founders-rail.tsx:2192–2195, 2242–2251, 2377–2388 (3 layout variants) | **T** + G top-left 1.2/60rem + G bottom-right 0.9/45rem (each variant) | tint edges at both section bounds |
| Fixed-scope strip (`process`) | fixed-scope-strip.tsx:23 | **none** | — (clean) |
| Fit (`fit`) | fit-section.tsx:1182–1184 (pinned) & 1291, 1307 (native) | **T** + G top-left 1/50rem; pane hairlines (content, keep) | tint edges |
| Gateway gap (`gateway`) | page.tsx:98 | none | — |
| Final CTA (`final-cta`) | final-cta.tsx:62–70 | G top-right 0.9/46rem **inside** the bordered CTA card (surface + border + rounded) | none floating — the card's own border clips it (a deliberate object, not a page band) |

The W4 cut/wipe (PostFXNodes) sweeps a diagonal band across whatever is behind the DOM;
where a tinted section meets an untinted one, the DOM paints a hard tint boundary the GL
band cannot touch — the cut visibly "sweeps over blocky boundaries". The tint boundaries
are DOM; no GL fix can remove them.

## B.2 The reference grammar (from the in-repo dossiers)

- **igloo** (`2026-08-21-igloo-dossier.md`): `<body>` essentially empty; ONE canvas owns
  everything; sections are world scenes switched by a baked data-texture wipe in the
  composite pass; text beats are sparse and diegetic. Section identity = world content
  (terrain → tunnel → cubes), never a DOM rectangle. All ambience (fog, god-rays, warm
  core) lives in the scene and therefore pans/cuts correctly by construction.
- **Lusion** (`2026-08-21-lusion-text-dossier.md` §4 + `refactor-DIRECTION.md`): one
  fixed canvas; DOM copy floats over it in structural columns; **no boxed cards, no
  section-sized washes ever** — secondary copy is a grid column at body scale, chrome is
  hairlines only. Depth comes from per-frame parallax of the copy blocks
  (`showScreenOffset·k`), not from backgrounds.
- **SERSAN's own house rule** (`refactor-DIRECTION.md` hard constraints): DOM-owns-text
  stays — so the transplantable lesson is narrower: **the DOM may own type and
  hairlines; it must not own section-sized ambience.** Ambience belongs to the
  continuous GL world (which already pans with `pan01`, descends with the camera, and
  gets swept by the W4 cut).

## B.3 Per-section prescription

The unifying move: **delete every section-sized DOM wash (T, G, D) on home; the page's
one continuous space = body `--bg` + DriftParticles + SignatureLine + the per-section GL
islands + PostFX grade.** Section identity comes from the islands (constellation,
crystals, work planes, portraits, portal) exactly as igloo does it. Where a band then
reads too flat, ambience returns as world-anchored GL light (§B.4), never as DOM.

Copy freeze: none of this touches a copy string. All removals are className/JSX-layer
deletions.

### hero (`CinematicSystemScroll`)
- Remove: the two desktop scrims (Part A §A.5 — same commit).
- Replace: panel-scoped wash riding the panelOpacity engine (§A.5.2).
- Keep: stacked/RM hero radial (static layout); compact wash until its own pass.

### credibility (`SingularityPassage`)
- Already clean. Add the DriftParticles pan-band widening (§A.6) so the panned frustum
  stays populated. No DOM changes.

### problem (`ProblemSection`) — owner's "soprattutto", first in rollout
- Remove `section-accent-tint` from `problem-section.tsx:290` and both `<SectionGlow>`
  mounts (`:293–294`).
- Dot-grid (`:385`): keep the igloo garnish but make it edge-clean — add a CSS mask so
  it dissolves inside its own band:
  `[mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_55%,transparent_95%)]`
  (one class on the existing div; no new element). A grid that fades out before the
  band bounds reads as a field IN the world; a grid that stops at the bounds reads as a
  page block.
- Keep: callout leader hairlines, row hairlines (content chrome), `[data-emerge]`
  (passage landing contract), `data-lattice-anchor` rect (band geometry contract),
  `NeuralGraphFallback` (SVG twin — it draws strokes, not washes).
- Ambience after removal: the broken constellation + fractured crystal + nebula wisps
  + starfield carry the band. Expected to be sufficient (the nebula/ember layer already
  provides local color). If the owner wants more: §B.4 glow at this band's world-y,
  ember-biased.
- Contrast: removal IMPROVES it — see §B.5.

### case-studies (`FeaturedWork`)
- No action. This is the target grammar already; use it as the visual reference in QA.

### services (`ServicesSection`)
- Remove `section-accent-tint section-accent-tint--strong` + the two `<SectionGlow>`s
  at BOTH mounts (`:1204–1207` pinned path, `:1301, 1317–1318` native path — the two
  must stay twins).
- Keep: slab top hairlines, ghost numbers, POV camera pan (mode detection lives; the
  pan now sweeps over a seamless field instead of a tinted block — this is the whole
  point).

### production (`ProductionGradeSection`) — with problem in round 1
- Remove `section-accent-tint--strong` (`:300`) + both glows (`:303–304`); same
  dot-grid mask as problem (`:385`).
- Keep: `productionPulseStore.bump()` surface, callouts, hairlines, lattice anchor.

### founders (`FoundersRail`)
- Remove **T** + both glows in all three layout variants (`:2192–2195`, `:2242–2251`,
  `:2377–2388`) in one commit (the variants must not diverge).
- The portrait morph + rail chrome carry the band.

### process (`FixedScopeStrip`)
- Already clean. No action.

### fit (`FitSection`)
- Remove **T** + glow at both variants (`:1182–1184`, `:1291, 1307`).
- Keep pane hairlines (glass-pane grammar chrome).

### gateway / final-cta
- Gateway gap: clean, no action (the portal is the ambience).
- Final CTA: **keep** the in-card glow — it is clipped by a bordered, rounded surface
  (an object in the layout, not a page band; no floating edge). Optionally step
  intensity 0.9 → 0.7 so the card doesn't become the page's only saturated block once
  the tints are gone — owner-taste call at review.

### globals.css
- After all home consumers are clean, scope `.section-accent-tint` / `--strong`
  (globals.css:515–554) under `@media (prefers-reduced-motion: reduce)` instead of
  deleting: RM ⇒ tier "off" ⇒ no canvas ⇒ the static site keeps its color washes (and
  its current contrast behavior) with zero new JS wiring. Interior routes
  (service-detail.tsx, process-section.tsx on /consulting etc.) still use the classes
  on motion-ok too — they have no panning camera sequences, so EITHER leave them (the
  media-query scoping would change them; if that is unwanted, instead add a
  home-only variant: remove the class from home sections and leave globals untouched —
  **this is the safer default: pure className removals, zero blast radius on interior
  routes**). Recommended: className removals now; the RM-scoping refactor only if/when
  interior routes get the same treatment.
- Note: a **no-WebGL, motion-ok** browser (classic flag-off path still mounts the GLSL
  canvas, so this is only the rare `tier "off"` non-RM case) loses both canvas and
  tints → flat navy sections. Accepted residual; revisit only if analytics show it.

## B.4 Option (c) mechanism — world-anchored ambience, if a band needs it back

Ship rounds 1–2 with **option (a) — nothing** (islands + starfield carry it). If the
owner then wants warmth back on specific bands, add ONE small GL layer, not DOM:

- **`src/webgl/AmbientGlows.tsx`** — a single `InstancedBufferGeometry` of ≤ 8 unit
  quads (the DriftParticles instancing pattern verbatim: shared corners + per-instance
  `aOffset/aScale/aTint`), billboarded in the vertex stage, fragment =
  `smoothstep(1,0,r)²` radial that reaches **exactly 0 at r=1** (hygiene rule), additive,
  `depthWrite:false`, renderOrder −2, `toneMapped:false` NOT above 1.0 (must never cross
  the bloom threshold).
- Placement: per glow, world position = `(xBias·worldViewWidth·0.3, −sectionCenterFrac·scrollHeight·k, −2.5)`
  from the same `anchors` spans DriftParticles already receives; size ≈ 0.9–1.3 ×
  WORLD_VIEW_HEIGHT; peak alpha 0.05–0.08 `--accent` (matching the removed tints' energy),
  ember variant allowed on the broken band.
- Rebuild on `anchors.version` (memo), fade by `scrollStore.reveal` per frame — no rect
  reads in the loop, uniforms only. **No storage buffers, no compute** — fragment
  uniforms + instanced attributes only, so both WebGPU binding walls documented in
  gpgpuNodeSim are untouched; needs the usual GLSL + TSL twin pair
  (materials/particleSpriteShader.ts / particleNodeMaterial.ts as the template).
- Because these are world-anchored quads, they slide with `pan01`, descend with the
  camera and get swept by the W4 cut — they behave exactly like igloo scene light.
- Budget: 8 instances × ~1 viewport of soft fill at DPR-capped resolution ≈ negligible;
  mount gate `pathname === "/" && tier === "full"` first (phones keep the cleaner field).

## B.5 Contrast — verify, don't assume (the tints HURT contrast; removal is safe)

Measured tokens (globals.css:17–35): `--bg` #0B1422 (rel-lum ≈ 0.0066), `--ink` ≈ 0.93,
`--ink-mute` #8A94A6 ≈ 0.293, `--accent` #3BE1FF ≈ 0.615.

| text on | plain `--bg` | over tint core (accent/0.20 ⇒ blended L ≈ 0.128) |
|---|---|---|
| `--ink` | ≈ 17.3 : 1 | ≈ 5.5 : 1 |
| `--ink-mute` | ≈ 6.1 : 1 | **≈ 1.9 : 1 — FAILS AA** |

i.e. wherever the tint's 30%-left core sits under muted copy today, it is already the
worst-contrast spot on the page. Removing the tints raises every band back to the
plain-bg column. Per-section QA gate: DevTools CSS-overview / axe contrast pass on each
refactored section at desktop + 390×844, plus one manual check of muted text over the
brightest GL frame behind it (constellation flash peak) — GL light is additive and
LOWERS contrast of light text; if any muted string sits directly over a node-halo hot
spot, nudge the island's layout constants, not the DOM.

## B.6 Rollout order + QA gates (implementing agents)

**Round 1 — neural bands (owner's "soprattutto"):**
problem + production tint/glow removal + dot-grid masks (twin commit with nothing else).
Gate: screenshots of each band's top/bottom boundary parked + while scrubbing (the W4
band must sweep over a seamless field — no horizontal tint line under the wipe);
constellation/crystal read unchanged; axe contrast pass; RM emulation renders the
static layout with its (kept or scoped) washes; 390×844 unchanged budgets.

**Round 2 — passage surroundings (Part A):**
spine scrim removal + panel-scoped wash + DriftParticles pan-band widening.
Gate: the A.5 QA list (parked p≈0.05, traverse-t 0.2/0.5/0.9 screenshots, reverse
entry, hero AA). Also verify `__sersanHomeSingularity.fade === 0` at the passage and
file separately if not.

**Round 3 — the rest:**
services (both mounts), founders (three variants), fit (both variants); final-cta
intensity taste-check; then the globals decision from §B.3 (className-removal default).
Gate: per-section boundary screenshots vs the featured-work reference band; POV pan in
services shows no sweeping edges; snap stations unchanged (`data-snap` untouched).

**Cross-cutting gates for every round:** copy byte-identical (EN+IT); `[data-line-anchor]`
wrappers untouched; `[data-lattice-anchor]` rects and `[data-emerge]` untouched; no new
CTAs; QA on THIS session's dev port (port 3000 belongs to another project); parked
frames clean (no velocity-gated layer left visible at rest).

---

## Caveats / Not found

- The probe's "seqStore.progress 0.107 at scrollY≈2600" pair is internally inconsistent
  at vh 764 (p 0.107 computes to scrollY ≈ 1937); the identification does not depend on
  which number was loose — the stage-remnant arithmetic holds across the whole first
  overlap viewport, and `fade 0.308` independently pins the snapshot to one-shot
  traverse-t ≈ 0.22 (`holeFade = ramp(t,0,0.7)`), i.e. mid-pan with input locked.
- The "second darker band spans the bottom" was never canvas-toggle-tested in the
  probe; attributed to the PostFX vignette's bottom lobe (screen-fixed lens grade —
  legitimate). Confirm in the §A.3 live session; if it is NOT the vignette, re-open.
- The spine's 0.97→1 exit band's exact target list was verified only via its two
  authoritative doc comments (singularity-passage.tsx:1277–1283 and the StageRail
  note), not by reading the full panelOpacity engine (~700 lines of
  cinematic-system-scroll not re-read this round). The fix (§A.5) does not depend on
  it: the scrims are deleted outright.
- Interior routes (service-detail, process-section, work-in-progress on other pages)
  keep their tints under the recommended className-removal path; they were inventoried
  but deliberately NOT prescribed — no panning camera exists there and the owner's
  feedback is home-scoped.
- `__sersanHomeSingularity.fade` at the passage was not captured in the original
  diagnostics; the eclipse is exonerated by geometry regardless, but the melt-gate
  check is included in Round 2's gate as belt-and-braces.

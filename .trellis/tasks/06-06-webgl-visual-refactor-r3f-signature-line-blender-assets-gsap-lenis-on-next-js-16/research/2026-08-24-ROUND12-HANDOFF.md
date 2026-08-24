# ROUND 12 — MASTER HANDOFF (2026-08-24) · self-contained brief for a fresh session

**Read THIS file completely before any tool call.** It supersedes the ROUND 10 handoff as the
entry point. Everything you need is here or named here by path. Nothing from the previous
conversation is required.

---

## 0. THE ONE-PARAGRAPH BRIEF

SERSAN's site (Next 16 · R3F on `three/webgpu` TSL with a WebGL2 fallback · GSAP · Lenis · one
persistent Canvas behind the DOM) is being pushed to Awwwards level by reverse-engineering
igloo.inc and lusion.co. Rounds 10–11 rebuilt the home page's two "neural" sections as a
**diagonal traverse**: the page descends at natural speed while the whole scene — net, copy and
stone together — slides laterally, so everything traces a diagonal. That is built and shipped on
`#problem`. **The owner has now given a clarification that invalidates the most recent piece of
it**: the net must be ONE CONTINUOUS THING that keeps composing as you travel, not a sequence of
discrete clusters; and the diagonal must be markedly MORE HORIZONTAL than the 23.61° that
shipped. Your job is to land those two corrections without losing the machinery that rounds
10–11 paid dearly to establish.

---

## 1. THE OWNER'S NEW DIRECTION — verbatim, and it is the whole brief

> *"io volevo fosse uno scroll in diagonale ma reale, la rete neurale dev'essere continua, non
> spezzata mentre scrolli. è proprio un problema di comprensione mismatch, mentre scrolli, la
> rete neurale deve continuare a comporsi e illuminarsi, non devono essere sezioni distinte,
> perché per il momento è come se ci fossero 3 pezzi di reti neurali. Per questo dev essere più
> orizzontale lo scroll, per ora è troppo poco diagonale, sembra quasi uno scroll verso il basso
> normale."*

Two corrections, both hard:

### 1a. THE NET MUST BE CONTINUOUS — this kills the five-island design

He sees **three pieces of neural net**, not one net. The net must **keep composing and lighting
up** as you travel through it — one continuous structure, not distinct sections handed off to
each other.

What shipped (HEAD `24b8f30`) is **five discrete islands**, each its own plexus with its own
seed, placed along the strip by a fitted ladder. That is precisely the "3 pezzi" reading. It was
chosen because a research pass ranked it #1 for solving a coverage hole — see §3 — but it
optimised for *presence*, not for *continuity*, and the owner is judging continuity.

**The continuous family already exists in the corpus and was ranked 2–4 rather than rejected**:
`research/2026-08-24-round11-coverage-trilemma.md` costs tiling, cluster wrapping and node
wrapping in detail against the real code. Its key measured facts, which you should re-verify
rather than trust:

- There is exactly **one node-position accessor** — `nodeAt()` at `neuralFieldCompute.ts:1168` —
  read by star particles, link particles and the `LineSegments` chord, on both backends. One
  place to change.
- **Wrapping is viable in x**: the longest edge `|dx|` is 0.0758 against a `span/2 = 0.454`
  ambiguity threshold — a 6× margin, so minimum-image wrapping is safe.
- **Wrapping is NOT viable in y**: edges reach 25.2% of the span and no zero-straddle seam exists.
- **Tiling has no seam at all** (draw the same field twice at `x` and `x ± span`), but needs the
  copy mask moved to view space.
- The enlargement multiplier is **11.5×** (an earlier claim of 60× was wrong), `uEdgeA` is
  **40.9 KiB** and index-packs to 10.2 KiB (an earlier claim of 218 KB was wrong); argue from
  `uNodePos` at 18.6 KiB and ~104k particles instead.

**Design note worth thinking hard about before you code:** "keeps composing" may be a stronger
requirement than "is continuous". A wrapped or tiled field is continuous but *static in
structure* — the same graph passing by. He says the net must **continue to compose itself**
(`continuare a comporsi`) — i.e. new nodes and links should appear to form as you advance, not
merely scroll into view. Consider whether the answer is a continuous field whose *ignition* and
*link formation* progress along the traverse, so that structure appears to build ahead of the
reader. That reading also fits his round-10 phrasing, *"la rete neurale che si illumina"*.
**Put the interpretation to him before building it** — this is exactly the kind of mismatch that
has now cost two rounds.

### 1b. THE DIAGONAL IS TOO SHALLOW

23.61° from vertical reads to him as an ordinary downward scroll. He wants it **markedly more
horizontal**. The angle is one authored constant, `traverseConfig.angleDeg`, and it is
live-tunable — but raising it has real consequences you must price, not just set:

- lateral run scales as `tanθ · secH`; at 23.61° over a 5358 px act that is ~1895 px
- the **legibility budget** in the storyboard's §C0 is computed at the shipped angle; a steeper
  angle moves every em/line figure
- the **lateral cull** currently fires at 66.7% of the runway; a steeper angle brings it forward
- D12 fixed the *angle* as the cross-viewport invariant (the phone holds 23.6° at 5.77 screen
  widths); raising it multiplies the phone's run
- the copy's windowed rate was fitted at the shipped angle

**Recommended approach**: make the angle the thing he tunes live, in front of you, in Chrome,
and then bake what he picks. He is the instrument. But show him the legibility cost at each stop
so he is choosing with the number in hand.

---

## 2. THE OWNER — how to work with him

- **Italian.** Write to him in Italian. Technical prose, no jargon dumping, no bullet-spam.
- **He judges by eye, in Chrome, live.** A measurement that *explains what he sees* convinces
  him; arithmetic on its own does not.
- **He is right more often than the agents are.** Three times in rounds 10–11 a confident
  conclusion was wrong and he pushed back correctly. When he says something looks wrong, go find
  the real cause instead of defending the code.
- **He asked, explicitly, for interactive quizzes when the intent is unclear**: *"fammi quiz
  interattivi se non capisci, ma non eseguire con incertezze."* Use `AskUserQuestion` with drawn
  ASCII previews — that is what finally resolved the round-11 mismatch, and it worked well.
- **Standing tastes, all learned the hard way:**
  - **Blue/cyan/navy only. NEVER violet.** A sanctioned desaturated amber (hue 36) exists for
    failure/ember tones.
  - No boxed cards, no fake console chrome, no section-sized rectangles of tint.
  - **Rejected across rounds:** ghost/outlined display type; scroll that parks itself or hijacks;
    a sticky full-viewport stage (he calls it *static*); holds that decelerate to let you read;
    a stone that reads as a glowing blob; an oversized crystal; unexplained circles.
  - Reference bar: lusion.co, igloo.inc, activetheory.net, noomoagency.com.
- **Git policy: never push without him typing "pusha".** Currently **27 commits ahead of origin**.

---

## 3. WHERE THE CODE STANDS

Branch `main`, HEAD **`24b8f30`**, working tree clean except untracked `marketing/` (not ours).
`npx tsc --noEmit` **clean**. Dev server on `localhost:3000` (verified to be this project).

### This session's commits, oldest first

| commit | what |
|---|---|
| `2cd129b` | solid display type — the ghost is dead, and ignition now *rises* (the first pass shipped an inverted event: −16.1% luminance; the check caught it) |
| `f25fd3a` | ROUND10 research — the journey's two halves and the owner's calls |
| `80b775f` | the crystal is 32% smaller (`CRYSTAL_SCALE` 0.17 → 0.115) with seven fitted systems re-derived |
| `afbe39a` | a row is one plane — the paragraph can no longer walk into its headline; plus the authorised D-17 sentence cut |
| `2fd0e89` | ROUND11 research — the diagonal traverse, after the sticky stage was rejected |
| `7d5fb62` | **traverse stage 1** — copy and net ride one diagonal |
| `4f5ea84` | the coverage trilemma was mis-framed — the angle was never a term |
| `24b8f30` | **checkpoint** — five islands close the void, but the owner wants ONE net |

### What stage 1 actually built (this machinery is good and should survive)

- `src/webgl/neural/traverseConfig.ts` — the authored numbers (`angleDeg`, runway vh), the α
  ledger, the island ladder, `fitTraverseLadder()`, live-write path
- `src/webgl/store/traverseStore.ts` — globalThis-pinned zustand; `bands[id]` is a **stable
  mutable** frozen-frame snapshot mutated in place: zero allocation, zero React commits inside
  the Canvas
- `src/components/fx/traverse-rate.ts` — the windowed rate as a pure module; the closed-form
  antiderivative lives here and nowhere else
- `src/components/fx/use-diagonal-traverse.ts` — one un-pinned ScrollTrigger; `measure()` on
  refresh; the windowed `x` + `opacity` on every `[data-drift]`; the mask lane; the `focusin`
  conversion; the dev handle
- `NeuralLattice.tsx` split into `NeuralLatticeIsland` + a fan-out wrapper (so `Scene.tsx` is
  untouched); per-island strip-x origin; `primary` owns the pulse write-back and the DPR cap
- `CrystalCluster.tsx` — the traverse rig, lateral folded into `cx`

**Verified live over CDP**: frame skew between the DOM copy and the WebGL island is **0** on a
3000 px/s flick, a Lenis glide, `PageDown` and a hash jump. The diagonal is exactly 23.61° and
both ride it — no shear, no jolt, no lag. The mask lane tracks a parked block to **0.00 px**
against a 38 px tolerance. `zWorld 9.6212`, `minNodeDist 10.0758` at four viewports.

---

## 4. TWO LIVE DEFECTS, MEASURED, NOT FIXED

### 4a. THE READING PLATEAU IS ZERO — a row's headline is invisible beside its own paragraph

At 1920×935, `#problem` at `secTop 5563 / secH 5358`, parked at `scrollY 8242` (p ≈ 0.50):

| block | `top` | `height` | **opacity** |
|---|---|---|---|
| display `02· No traces …` | **132** | 74 | **0.029** |
| its own body `When the agent makes …` | **229** | 56 | **1.000** |

97 px apart, both fully on screen, and the headline is invisible — the reader sees an orphan
paragraph. **`__sersanTraverse_problem.blocks` reports `plateau: 0` for all eight blocks.**

Hypothesis (unproven — verify from the handle's own code before repeating it): the reading
plateau has collapsed, so `V̂` is a spike rather than a plateau and two neighbouring blocks land
on opposite flanks. The plateau is the entire point of the windowed rate the owner approved —
fast entering and leaving, *slow and readable in between*. Note `bandH` is the denominator of
the coverage window and **the band height changed when the island ladder landed**, so every
window moved with it. The gate to prove a fix: for every ledger row, the scroll range over which
`min(op_display, op_body) > 0.9` must be non-empty, and you should report its length.

### 4b. THE FRAME IS COMPOSED AT THE TOP AND EMPTY AT THE BOTTOM

The coverage census reports `nothing at all: 0.0%` and `net on frame: 100%`, and the instrument
is honest — but **"a band intersects the viewport" is not "the frame is composed"**. In live
screenshots at p ≈ 0.15 and p ≈ 0.50 the islands sit high and the lower half to two-thirds of
the frame is empty black. At p ≈ 0.30 the composition is genuinely good — a constellation across
the left, the fractured stone right-of-centre with its callouts, a rich starfield.

A second instrument is needed that measures the **vertical distribution** of visible content, not
merely its presence. **Do not fix this by moving numbers** — band placement in the frame is the
owner's composition decision, so measure it and bring it to him.

---

## 5. THE BINDING OWNER DECISIONS

The full record is `research/2026-08-22-round10-OWNER-DECISIONS.md` — **read ADDENDUM 2 and 3**.
Summary of what is decided and must not be re-litigated:

| id | decision |
|---|---|
| **D6** | ONE SCENE — net and copy are the same world at their own depths, not a backdrop behind fixed text |
| **D7** | NO PIN, EVER — the page never holds the viewport; vertical and lateral run together as a diagonal |
| **D8** | THE MOVEMENT NEVER STOPS — no hold, no decelerate-to-read |
| **D9** | LONG LATERAL RUN — content enters right and exits left (**and §1b now says: steeper than 23.61°**) |
| **D10** | PAGE HEIGHT +27.4% — the vertical run *is* the duration of the traverse |
| **D11** | WINDOWED copy rate — fast entering and leaving, slow while readable. He was told it is a scripted move rather than a depth, and chose it |
| **D12** | PHONE holds the ANGLE, not the screen-width count |
| **D13** | THE IGNITION FRONT sweeps top-right → bottom-left at the traverse angle, once per gap — geometry cannot descend (downward scroll moves content up), so light carries the descending diagonal |
| **D2** | the world closes at the Act I seam and reopens at the Act II seam |
| **D3** | "la pietra meteorite" is the FRACTURED Act I stone, absent during travel, first sighted late |
| **D4** | the one authorised copy change: `Open a panel to see why it matters.` is cut |
| **D5** | the text-drift collision gets a floor; the parallax stays |

**Still open, his call:** the copy-to-net ratio; whether the stone keeps a hairline of bloom;
whether to spend the legibility headroom (a faint moving mesh behind the reading column); the
letter-roll that now fires while the wrapper is still transparent (D11's side effect — show him
both); and now the traverse angle (§1b).

---

## 6. THE RESEARCH CORPUS — read what you touch

All in `.trellis/tasks/06-06-webgl-visual-refactor-.../research/`. These are verbatim-source
minings and live measurements, not opinions.

**Round 11 (current design):**
- `2026-08-24-round11-diagonal-traverse-storyboard.md` — the film: world layout, the moment
  sheet, the window (§B2), the legibility budget (§C0), entrances/exits (§D), the mask lane (§E)
- `2026-08-24-round11-diagonal-traverse-mechanism.md` — the rig: the camera-lock audit (§2.2 —
  **the finding that every island is exactly invariant under any camera move**), the local rig
  (§2.3), the transport contract, frame order, the budget, risks, the rollout. §2.2–2.4 of
  REVISION 1 are struck through; PART 2-BIS carries the windowed-rate analysis
- `2026-08-24-round11-coverage-trilemma.md` — **the most relevant file for §1a**: the continuous
  options costed against the real code
- `2026-08-22-round10-OWNER-DECISIONS.md` — the binding calls
- `2026-08-22-round10-MASTER-SPEC.md` — the entry point to the round-10 pair

**Round 10 (the rejected sticky-stage design — mine it, do not follow it):**
`2026-08-22-round10-journey-storyboard.md`, `2026-08-22-round10-journey-mechanism.md`,
`2026-08-22-ROUND10-HANDOFF.md`.

**Foundations, still authoritative:**
`2026-08-22-round8-scroll-dossier.md` (our snap autopsy + Lusion's and igloo's real scroll),
`2026-08-21-lusion-text-dossier.md` (the recipe cards, and the differential horizontal parallax
that is this design's closest shipped precedent), `2026-08-21-igloo-stones-dossier.md` +
`2026-08-22-round7-stones-v2-anatomy.md`, `2026-08-22-round8-stone-source-anatomy.md` (the value
world), `2026-08-22-round8-blender-slab-log.md`, `2026-08-22-round9-inner-object-mechanism.md`,
`2026-08-21-igloo-cuts-spec.md`.

---

## 7. NON-NEGOTIABLE ARCHITECTURE

- **Copy freeze, absolute.** Every EN+IT string byte-identical, with the single landed D4
  exception. Grep-verify before every commit.
- **`SignatureLine.tsx` is the ONLY camera writer and must stay at zero lines changed.** Every
  island recomputes its pose from the camera each frame and is therefore *exactly invariant*
  under camera translation and rotation — a camera move cannot touch them. The traverse is a
  **local rig group inside each island**.
- **R3F island commit-wedge rule:** inside `<Canvas>` use refs + `getState()` in `useFrame`.
  Never depend on React commits inside the island; never subscribe to a store there.
- **Share the ARGUMENT, not the result.** One frozen frame snapshot `{active, scrollY, p,
  xScenePx, secTop, secH, lane…}` published once and read by every consumer. If the copy's x and
  the net's x are ever computed from two different reads of `scrollY`, they betray themselves as
  two layers — the exact failure D6 exists to prevent.
- **The rate is INTEGRATED, not multiplied.** `x` is the closed-form antiderivative. Applying the
  rate to position spikes it **80×**.
- **Zero per-frame allocation**; hoist scratch. **No per-frame `getBoundingClientRect`.**
- **Binding walls:** ≤4 storage buffers / 8 slots; the particle material's vertex stage is at
  **12/12 WebGL2 UBO blocks with zero headroom** (11 uniform arrays + three's 3 shared groups);
  the line material is separate at 8/12; `MAX_UNIFORM_BLOCK_SIZE` floor is 16 KiB.
- **Both backends must compile** — WebGPU and the WebGL2 fallback — using only the cross-backend
  TSL ops already proven in `PostFXNodes.tsx` / `neuralFieldCompute.ts`.
- **Selective bloom:** only emissive above 1.0 blooms; post-blend luminance with **Rec709
  weights (0.2126/0.7152/0.0722)**.
- **RM / SSR / no-JS:** content settled and visible, zero timers, no canvas at tier "off", no
  primed-hidden poses in `className` (the D-10 rule).
- **No `pin:`, no sticky stage, no snap, no parking.**
- **No `globals.css` edits** from parallel agents — file-scoped styles.
- **CRLF.** The repo is 100% CRLF with no `.gitattributes`; three rounds have now shipped LF
  files by accident.
- **`tsc` is the only static gate:** `npx tsc --noEmit`. There is no ESLint config.

---

## 8. HARD-WON TRAPS — do not rediscover these

1. **`getBoundingClientRect()` returns the TRANSFORMED box.** This cost a P0 in stage 1: the
   copy edge was measured through the traverse's own transform and read 10 070 px instead of 29,
   which opened the mask completely — round 9-B's *"la rete sta sopra le scritte"*, back through
   a different door. The fix idiom (subtract the applied offset, read off the nearest
   `[data-drift]` ancestor's own matrix) is in `NeuralLattice.tsx`. Reuse it.
2. **Reading rects in the same frame as a scroll jump gives you the previous frame's
   transforms.** This produced an "83 px of unexplained reality" that was blamed on stale caches
   for half a round. It was the measurement harness.
3. **Cold restart after build-seam changes.** HMR does not rebuild the WebGL island. `preview_stop`
   → `preview_start`, or clear `.next/cache`. The owner lost a whole round to this once, and an
   HMR-mangled `SplitText` produced a false P0 in this session too.
4. **Chrome freezes rAF when its window is hidden.** `document.visibilityState === "hidden"` ⇒
   nothing advances and everything looks broken. Check it before diagnosing anything visual.
5. **A hard `min()` / clamp on a moving wavefront flat-tops it.** Use a C¹ soft knee. smoothstep's
   zero end-derivatives are what make the windowed rate C¹.
6. **Interpolating a smoothstep across a wide quad is not the smoothstep** — a per-vertex mask on
   a wide quad read 0.80 where the truth was 0, an AA failure on phones.
7. **Flat planes alias differently from curved ones**; two crossed sines on flat facets project
   to a regular screen lattice.
8. **`toNonIndexed()` returns `this`** on an already-soup geometry — it will mutate a
   module-cached singleton.
9. **three's GLTFLoader lowercases unknown attribute semantics** (`_CENTR` → `_centr`), and the
   exporter rotates POSITION/NORMAL to Y-up but leaves custom vector attributes in Z-up.
10. **Render-target textures use the y-down uv convention on BOTH backends** — the flip belongs
    in the TSL graph, not as a WebGPU-only correction.
11. **Lenis: `duration` + `easing` always beat `lerp`.**
12. **`CULL_PAD` is hysteresis, not a visibility rule** — 220 px of padding put an entirely
    off-screen band in the draw list.
13. **Resting particles are not free** — ~4800 idle sprites at alpha 0.06 painted a fog that
    flattened the whole composition.

---

## 9. WORKFLOW

**Trellis dispatch protocol (binding).** The main session does **not** edit code by default:

1. `trellis-implement` sub-agent (Agent tool) — implements.
2. `trellis-check` sub-agent — **adversarial review + self-fix**. This is not ceremony. In this
   session alone it caught: an ignition that dimmed instead of brightening, a mask that opened
   completely, an unreachable restore branch, 480 allocations/second, a leaked snap suspension,
   a resize-tier hole that put text over text for the duration of a window drag, and three LF
   files. **Every implement round gets one, with named hunts — never "review this".**
3. Main session commits (granular, descriptive), then live QA in Chrome.

Every dispatch prompt **must** start with:
`Active task: .trellis/tasks/06-06-webgl-visual-refactor-r3f-signature-line-blender-assets-gsap-lenis-on-next-js-16`

Run agents **in parallel on disjoint file sets**, and tell each explicitly which files another
agent owns and that transient `tsc` errors there are not theirs.

**Skills** (via the Skill tool, before writing code in that domain): `webgpu-threejs-tsl` ·
`threejs-shaders` · `threejs-postprocessing` · `threejs-animation` · `gsap-framer-scroll-animation` ·
`scroll-experience` · `scroll-animations` · `shader-programming-glsl` · `3d-web-experience` ·
`frontend-design` · `high-end-visual-design` · `motion` · `algorithmic-art`.
Use **Context7 MCP** for any library API before writing against it.

**QA loop:** cold-restart the dev server → drive the owner's Chrome via `claude-in-chrome`
(**two browsers are connected; he picks — last time it was "Browser 1",
`db7c1eb8-b3d6-4aa3-8a57-cc12d5e959ad`**) → the site opens with an intro sequence, **press
`Escape` to skip it** or scroll commands will silently do nothing → screenshot at real scroll
positions → tune live through the dev handles → bake the found values via an implement agent →
commit.

**Dev handles** (dev/preview only): `__sersanTraverse_problem` (`.blocks`, `.ladder`,
`.geometry`, `.coverage(step)`, `.park()`, `.laneCheck()`, `.collapseWindow()`,
`.restoreWindow()`, `.rateMax()`, `.secondDerivative()`, `.set({…})`) ·
`__sersanNeuralLattice_problem` and `_problem-i0..i3` (`.traverse`, `.plexus`, `.cost`) ·
`__sersanCrystal_problem` / `_production` · `__sersanSectionCuts` · `__sersanTier` ·
`__sersanScroll` · `__sersanSnap` · `__sersanLineDebug`.
QA flags: `?fx= ?postfx= ?dpr= ?perf=1 ?backend=webgl2`.

**Rollback levers already wired:** `set({problem:{angleDeg:0}})` restores today's composition;
`set({problem:{gapVh:0}})` restores today's document px-for-px; `set({islands:{enabled:false}})`
turns the ladder off; `collapseWindow()` collapses the windowed rate to a constant.

---

## 10. BLENDER

Blender **5.1.2** is wired via MCP (the owner opens it and connects the addon; the port was
9876). He confirmed this session that it is connected. **`Object: Cell Fracture` is NOT
INSTALLED** in 5.1.2: the slab's fractured variant was produced by exact power/Laguerre
half-space bisection instead. Assets in `public/models/` (`crystal-intact.glb` 450 tris,
`crystal-fractured.glb` 1114 tris). Recipe and every integration flag:
`2026-08-22-round8-blender-slab-log.md`. Nothing in §1 needs Blender; it becomes relevant only if
the stone's silhouette needs re-authoring at close range.

---

## 11. FIRST ACTIONS FOR THE NEW SESSION

1. Read this file, then `2026-08-24-round11-coverage-trilemma.md` (the continuous options), then
   `2026-08-24-round11-diagonal-traverse-mechanism.md` §2.2–2.3 (why the rig is local, not a
   camera move).
2. `git log --oneline -8` and `git status` — confirm HEAD `24b8f30` and a clean tree.
3. **Put the interpretation of "continua a comporsi" to the owner before building anything.**
   Use `AskUserQuestion` with drawn ASCII previews — that is what resolved the last mismatch.
   The question to settle: is it (a) one continuous field that scrolls past without a seam,
   (b) a field whose structure visibly *forms ahead of you* as you advance, or (c) both. And
   separately: how much more horizontal — offer him measured angles with their legibility cost.
4. Only then dispatch: the continuity change (implement), and in parallel a check on the two
   live defects in §4 — the zero plateau is the one that makes a row unreadable.
5. Cold-restart before judging anything visual. Press `Escape` to skip the intro.
6. **Never push without "pusha".** 27 commits ahead.

---

## 12. THE ONE-LINE VERSION

The machinery is right and measured — one scene, one clock, zero frame skew, an exact diagonal,
a mask that tracks to a pixel. What is wrong is that the net was cut into five pieces to solve a
coverage problem, and the diagonal is too shallow to read as a diagonal. Make the net one
continuous thing that builds as you move through it, tilt the traverse much closer to
horizontal, and fix the reading plateau so a headline and its paragraph are legible together.

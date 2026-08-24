# ROUND 10 — MASTER HANDOFF (2026-08-22) · self-contained brief for a fresh session

**Read THIS file first, completely, before any tool call.** It replaces the round-5 spec as the
entry point. Everything needed is either here or named here by path. Nothing from the previous
conversation is required.

---

## 0. THE ONE-PARAGRAPH BRIEF

SERSAN's site (Next 16 · R3F on `three/webgpu` TSL with a WebGL2 fallback · GSAP · Lenis · one
persistent Canvas behind the DOM) is being pushed to Awwwards-level by reverse-engineering
**igloo.inc** and **lusion.co** from their production bundles. Rounds 5–9 rebuilt the home page's
two "neural" sections, the crystal stones, the scroll system and the section transitions. The owner
(Alberto, Italian, judges by FEEL in a browser) has now given a **new creative direction that
supersedes the current composition**: turn both neural sections into a single **immersive
scroll-driven motion-graphic journey** — like igloo, where scroll moves a camera through a world
rather than scrolling a page. A design spec for that was being produced when the session ended.
Your job: land that journey, plus the two small fixes that were in flight, without breaking the
architecture the previous rounds paid dearly to establish.

---

## 1. THE OWNER — how to work with him

- **Italian.** Write to him in Italian. Technical prose, no jargon dumping, no bullet-spam.
- **He judges by eye, in Chrome, live.** Arithmetic never convinces him; a screenshot does. But he
  respects a measurement that *explains* what he sees.
- **He is right more often than the agents are.** Twice this session a confident "this is a physical
  limit" conclusion was wrong and he pushed back correctly (the in-ice logo). When he says something
  looks wrong, believe him and go find the real cause instead of defending the code.
- **Standing tastes, all learned the hard way:**
  - **Blue/cyan/navy only. NEVER violet.** (A sanctioned desaturated amber exists for failure/ember
    tones.)
  - No boxed cards, no fake console chrome, no "blocchi pagina" (section-sized rectangles of tint).
  - **Rejected this session:** the ghost/outlined display type ("le scritte vuote dentro azzure non
    mi piacciono"), scroll that parks itself, unexplained circles/spheres, a stone that reads as a
    glowing blob, a crystal that is too big.
  - Reference bar: lusion.co, igloo.inc, activetheory.net, noomoagency.com.
- **He wants the reasoning when it changes what he decides**, not otherwise. Surface owner-decisions
  explicitly (there is a list in §7).

---

## 2. WHERE THE CODE STANDS

Branch `main`, HEAD **`b546b08`**. **~30 commits ahead of origin — DO NOT PUSH unless he says
"pusha".** Working tree clean except an untracked `marketing/` folder (not ours).

Production build was green as of `587a795`; **re-run `bun run build` before any push**.

### What shipped, rounds 5→9 (newest first, all with adversarial checks)

| commit | what |
|---|---|
| `b546b08` | copy-column mask: the plexus dims over the text (measured, AA-gated) |
| `93bb31d` | **the in-ice logo reads** — screen-space projection (igloo's real mechanism) |
| `0931786` | research: how igloo shows the object inside the ice |
| `587a795` | killed the haze + the ripple moiré |
| `623a237` | the crystal became the authored Blender slab |
| `a1d0673` | the authored slab assets (`public/models/crystal-*.glb`) |
| `f6cac67` | plexus links became real `LineSegments` |
| `2ea3b5e` | the plexus: 103 star-nodes / 227 links (was a 5-layer diagram) |
| `17b49e7` | the stone's fog world + compressed value range |
| `6848e7b` | **scroll: free-section snap deleted, Lenis on Lusion's smoothing law** |
| `11cacf1` | one continuous world: hero scrims + all section tints removed |
| `001877d` / `118983e` | the igloo section-cut seam (+ its luma/velocity fix) |
| `9bd60bf` | Lusion text v3 (letter-rolls, word waves, replay, parallax drift) |

### The research corpus — READ WHAT YOU TOUCH

All in `.trellis/tasks/06-06-.../research/`. These are verbatim-source minings, not opinions:

- `2026-08-21-lusion-text-dossier.md` — Lusion's text engine, recipe cards H1–H4/R1/S1/B1–B3/Hv1.
- `2026-08-21-igloo-stones-dossier.md` + `2026-08-22-round7-stones-v2-anatomy.md` — the ice material,
  two-pass transmission, tumble grammar, plexus, callouts, fog.
- `2026-08-22-round8-stone-source-anatomy.md` — **the value-world measurement** (why ours glowed).
- `2026-08-22-round8-blender-slab-log.md` — how the slab was authored + every integration flag.
- `2026-08-22-round8-scroll-dossier.md` — **our snap engine's autopsy + Lusion's and igloo's scroll,
  complete**. Essential for the journey.
- `2026-08-22-round9-inner-object-mechanism.md` — the screen-space refraction proof.
- `2026-08-21-igloo-cuts-spec.md` — the section-cut math + igloo's scene-stack scroll mapping.
- `2026-08-22-round10-immersive-journey-spec.md` — **IF PRESENT, THIS IS YOUR PRIMARY BRIEF** (see §3).

---

## 3. THE WORK IN FLIGHT WHEN THE SESSION ENDED

Two agents were running. **First action: check whether their outputs landed** (`git status`, and
look for the files named below). If they did not, re-dispatch them from the descriptions here.

### 3a. THE IMMERSIVE JOURNEY (the main event) — a design spec was being written

Target file: `research/2026-08-22-round10-immersive-journey-spec.md`.

**The owner's direction, verbatim:** *"perché non facciamo per tutte e due le reti neurali
un'esperienza immersiva come se fosse una motion graphic di alto livello, ma nel sito con lo scroll?
scrollando vai avanti magari orizzontalmente o in diagonale nella rete neurale che si illumina, poi
viene una scritta animata, poi si va avanti nella rete e ne appare un'altra, la pietra meteorite
eccetera. come nel sito igloo, è quasi un video, uno scroll immersivo che si muove."*

The spec was asked to deliver: a beat-by-beat storyboard (scroll fraction → camera/world pose →
what lights → which copy enters and how), the camera-mechanism decision, a file-by-file change list,
a risk register, a staged rollout and QA gates.

**The central architectural question it must answer** (do not start coding until it is answered):
`src/webgl/SignatureLine.tsx` is **the ONLY camera writer in the entire site**; every island is
camera-LOCKED and reads the camera, never writes it. Three options were put to it:
(a) SignatureLine gains a journey mode over those two spans and stays the single writer;
(b) a new camera authority with a strict handover protocol;
(c) **the camera stays put and the WORLD moves past it** — likely cheapest and safest precisely
because every island is already camera-locked.

**Why this redesign is not optional polish:** the round-9-B check proved numerically that the
current composition cannot work. For the body copy to clear WCAG AA, the plexus must drop to ~1%
over the copy column — at 1280 that floors ~70% of the nodes, and **below ~1100px it floors
essentially everything (at 390px the net is invisible)**. Text and net are fighting for the same
space. The journey resolves it by giving each its own moment.

### 3b. Two immediate fixes (small, independent, ship first)

1. **Ghost type is rejected.** Replace the transparent-fill + `-webkit-text-stroke` display type in
   `problem-section.tsx` (`.plrow__ghost`) and `production-grade-section.tsx` (`.pgrow__ghost`) with
   solid legible type; keep the ignition accent re-expressed for solid type; keep every entrance
   animation; simplify the now-redundant RM blocks honestly. **Copy freeze absolute.**
2. **The crystal is too big.** `CRYSTAL_SCALE` 0.17 renders the 3.32-unit slab at ~56% of band
   height. Bring it to ~35–40% and re-derive everything fitted against the old size: callout anchors
   + the projection twin, `PLEXUS_RADIUS`/`PLEXUS_MASK_IN`, the fog quad radii and its a11y
   clearance, the round-9-B mask assumptions, and the mark's on-screen size (60% of the silhouette
   by construction — verify it still clears the legibility threshold).

---

## 4. NON-NEGOTIABLE ARCHITECTURE — violating these has cost real bugs

- **Copy freeze, absolute.** Every EN+IT string byte-identical to HEAD. Presentation only.
  Grep-verify before every commit.
- **SignatureLine is the only camera writer.** If the journey changes this, it must be an explicit,
  documented handover — never a second writer racing the first.
- **R3F island commit-wedge rule:** inside `<Canvas>`, use refs + `getState()` in `useFrame`. Never
  depend on React commits inside the island; never subscribe to a store there. (A pending Suspense
  inside the bridged tree once wedged every island commit on interior routes.)
- **Zero per-frame allocation** in `useFrame`/rAF paths; hoist scratch vectors.
- **No per-frame `getBoundingClientRect`.** Cache rects on measure (`measureVersion`).
- **Binding walls:** ≤4 storage buffers / 8 slots; the particle material's vertex stage is at
  **12/12 WebGL2 UBO blocks with zero headroom** — a tenth `uniformArray` will fail to link on a
  minimum-spec device. The line material is a separate program at 8/12.
- **Both backends must compile:** WebGPU and the WebGL2 fallback. Use only the cross-backend TSL op
  set already proven in `PostFXNodes.tsx` / `neuralFieldCompute.ts`.
- **The `>1.0` selective-bloom contract:** only emissive above 1.0 blooms. Compute post-blend
  luminance with **Rec709 weights (0.2126/0.7152/0.0722)** — a mistake here shipped a rim that never
  bloomed for a whole round.
- **RM / SSR / no-JS:** content settled and visible, zero timers, no canvas at tier "off", no
  primed-hidden poses in classNames (the D-10 rule).
- **No ScrollTrigger `pin:`** in these sections; no scroll hijacking (the owner hated the 1s stop).
- **No `globals.css` edits** from parallel agents — file-scoped styles. (One sanctioned exception
  exists: the callout `--callout-N-vis` rules.)
- **tsc is the only static gate:** `npx tsc --noEmit`. There is no ESLint config in this repo.

---

## 5. HARD-WON TRAPS — do not rediscover these

1. **Cold restart after build-seam changes.** HMR does not rebuild the WebGL island. The owner saw
   "the circles are still there" for a whole round because of this. `preview_stop` → `preview_start`.
2. **Chrome freezes rAF when its window is hidden.** `document.visibilityState === "hidden"` ⇒ the
   sim never advances and everything looks broken. Check it before diagnosing anything visual.
3. **three's GLTFLoader lowercases unknown attribute semantics** (`_CENTR` → `_centr`).
4. **The glTF exporter rotates POSITION/NORMAL to Y-up but leaves custom vector attributes in
   Z-up.** The slab's `_CENTR` is pre-rotated to compensate.
5. **`toNonIndexed()` returns `this`** on an already-soup geometry — it will mutate a module-cached
   singleton and let a consumer's `dispose()` destroy it.
6. **three treats render-target textures with the same y-down uv convention as framebuffer copies,
   on BOTH backends.** The flip is in the TSL graph, not a WebGPU-only correction. Getting this
   wrong ships the logo upside-down.
7. **Lenis: `duration` + `easing` always beat `lerp`.** Passing all three leaves `lerp` dead code.
8. **A glowing particle sprite ≥4px cannot render a 1px line.** Particle strands read as chains of
   blobs at any size; if you need lines, use line geometry.
9. **Flat planes alias differently from curved ones.** Two crossed sines on flat facets project to a
   regular screen lattice — a checkerboard by construction — where the same frequency on a curved
   surface reads as noise.
10. **Resting particles are not free.** ~4800 idle sprites at alpha 0.06 painted a fog that flattened
    the entire composition; 0.012 fixed it.
11. **A hard `min()` ceiling on a moving wavefront flat-tops it.** Use a C1 soft knee.
12. **Interpolating a smoothstep across a wide quad is not the smoothstep.** A per-vertex mask on a
    quad 0.39 of the band wide read 0.80 where the truth was 0 — an AA failure on phones.

---

## 6. WORKFLOW — how this project is run

**Trellis dispatch protocol (binding).** The main session does **not** edit code by default:

1. `trellis-implement` sub-agent (Agent tool, `subagent_type: "trellis-implement"`) — implements.
2. `trellis-check` sub-agent — **adversarial review + self-fix**. This is not ceremony: this session
   it caught a P0 upside-down logo, a crossing detector that missed keyboard jumps, a rim that never
   bloomed, an explode gap 1.9× off-scale, a surge made invisible by its own ceiling, and an AA
   failure on phones. **Every implement round gets one.** Give it named hunts, not "review this".
3. Main session commits (granular, descriptive), then live QA in Chrome.

Every dispatch prompt **must** start with:
`Active task: .trellis/tasks/06-06-webgl-visual-refactor-r3f-signature-line-blender-assets-gsap-lenis-on-next-js-16`

Run agents **in parallel on disjoint file sets** — this session routinely ran 3–4 at once. Tell each
agent explicitly which files another agent owns, and that transient `tsc` errors there are not
theirs.

**Skills to invoke** (via the Skill tool, before writing code in that domain):
`webgpu-threejs-tsl` · `threejs-shaders` · `threejs-postprocessing` · `threejs-animation` ·
`gsap-framer-scroll-animation` · `scroll-experience` · `scroll-animations` · `page-transitions` ·
`shader-programming-glsl` · `3d-web-experience` · `frontend-design` · `high-end-visual-design` ·
`design-taste-frontend` · `motion` · `micro-interactions` · `algorithmic-art`.
Use **Context7 MCP** for any library API before writing against it (three/R3F/drei/GSAP/Lenis change
often). Use the **Blender MCP** for asset authoring (see §8).

**QA loop:** cold-restart the dev server (`preview_start` name `sersan-v2-dev`, port 3000) →
drive the owner's Chrome via `claude-in-chrome` (ask which browser if several are connected) →
screenshot at the real bands → tune live through the dev handles → bake the found values as config
defaults via an implement agent → commit.

**Dev handles** (dev/preview only): `window.__sersanNeuralLattice_problem` / `_production`,
`__sersanCrystal_problem` / `_production`, `__sersanSectionCuts`, `__sersanTier`, `__sersanScroll`,
`__sersanSeqSingularity`. Every look constant of the last five rounds is live-tunable through
`.uniforms` / `.tunables`. QA flags: `?fx= ?postfx= ?dpr= ?perf=1 ?backend=webgl2`.

---

## 7. OPEN OWNER DECISIONS — surface these, do not decide alone

1. **The journey's storyboard** — he asked for it; show him the beats before building.
2. **The in-ice subject.** The logo now reads (screen-space projection), but the mark is
   *screen-upright* rather than tumbling in 3D (`MARK_TUMBLE` is the one-flag return). Confirm he
   likes it upright.
3. **The plexus over the copy** — currently masked to ~1%; the journey may replace this entirely.
4. **Flare rays / bead population / hover strength** — three measured taste calls in the config.
5. **Anchor links land 168px low** (a pre-existing `offset -72` + `scroll-mt-24` double compensation).
   One-line fix, not yet approved.
6. **`vercel.json` does not cache `.glb`** — pre-existing, worth fixing with hashed filenames.
7. **`MARK_RT_WEBGL2` is false** and `?backend=webgl2` **never initializes** (a `forceWebGL` init hang,
   not a shader failure) — needs its own debugging round.
8. **LabelScrambler** doesn't match Lusion's mined S1 numbers (fixed 480ms/A–Z vs 40 chars/s/ASCII
   33–125). Site-wide component; deltas documented, never changed.

---

## 8. BLENDER

Blender **5.1.2** is wired via MCP (the owner opens it and connects the addon; ask him — the port
was 9876). **`Object: Cell Fracture` is NOT INSTALLED** in 5.1.2 (not merely disabled): the slab's
fractured variant was produced with an exact power/Laguerre diagram by half-space bisection instead.
Assets live in `public/models/` (`crystal-intact.glb` 450 tris, `crystal-fractured.glb` 1114 tris,
plus Draco variants that are NOT primary — the repo has no Draco wiring). The authoring recipe,
statistics and every integration flag are in `2026-08-22-round8-blender-slab-log.md`.

---

## 9. FIRST ACTIONS FOR THE NEW SESSION

1. Read this file, then `2026-08-22-round10-immersive-journey-spec.md` if it exists, then
   `2026-08-22-round8-scroll-dossier.md` (the journey's foundation).
2. `git log --oneline -5`, `git status` — confirm HEAD and that nothing is half-landed.
3. Check whether §3b's two fixes landed; if not, dispatch them (they are small and he will see them
   immediately).
4. Present the journey storyboard to the owner **in Italian**, ask for his direction on the beats,
   and only then dispatch stage 1 of the rollout.
5. Never push without "pusha".

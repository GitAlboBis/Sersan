# ROUND 10 — THE JOURNEY: MECHANISM DOSSIER

- **Query**: owner, verbatim — *"perché non facciamo per tutte e due le reti neurali un'esperienza immersiva come se fosse una motion graphic di alto livello, ma nel sito con lo scroll? scrollando vai avanti magari orizzontalmente o in diagonale nella rete neurale che si illumina, poi viene una scritta animata, poi si va avanti nella rete e ne appare un'altra, la pietra meteorite eccetera. come nel sito igloo, è quasi un video, uno scroll immersivo che si muove."*
- **Scope**: internal (mechanism half). The beat-by-beat storyboard is the parallel dossier `2026-08-22-round10-journey-storyboard.md` — not touched here.
- **Date**: 2026-08-24 (task dated 2026-08-22)
- **Repo state**: HEAD `b546b08`, working tree clean except untracked `marketing/`. `CRYSTAL_SCALE` still reads `0.17` at `src/webgl/neural/crystalConfig.ts:237` — the shrink is in flight in another agent's hands; **every number below is written against the NEW smaller stone** and the conversion is derived in §11.3.
- **Live ground truth**: coordinator's browser measurement, home `/`, viewport 1280×720, `document.documentElement.scrollHeight` 21459. All arithmetic in this dossier is at that viewport unless stated.

---

## 0. VERDICT IN ONE PARAGRAPH

None of the three options put on the table can deliver this journey, because **every island that would have to travel is placed from a DOM rect and glued to the camera every frame** — `NeuralLattice.tsx:374-379` and `CrystalCluster.tsx:487-494` both compute `group.position = camera.position + camera.quaternion · (screenOffset·k, ·, −CAMERA_Z)` and `group.quaternion = camera.quaternion`. A group re-derived from the camera pose each frame is **exactly invariant** under camera translation *and* camera rotation, and a world-root translation is a no-op for it because it is not parented to any world root. So (a) "SignatureLine gains a journey mode" and (b) "a new camera authority" would both move the tube and the dust and leave the two neural nets and the two stones *nailed to the screen*; (c) "move the world past the camera" would do the same thing from the other side. The journey has to be built **one level down**: a new **local dolly rig inside each island's own frame**, between the camera-locked outer group and the existing inner group — call it **option (d)**. SignatureLine stays the single camera writer, untouched, byte-identical. The second half of the answer is the coordinator's lead and it is correct: the DOM half is a **`.seq-stage`-class full-viewport sticky stage over a lengthened runway** — the grammar this site already ships four times (`singularity-passage.tsx:2529`, `cinematic-system-scroll.tsx:1697`, `fit-section.tsx:1308`, `services-section.tsx:1318`), all with `start:"top top" / end:"bottom bottom"`, explicit runway height in px/vh, and **no ScrollTrigger `pin:`**. Two independent journeys, not one — 6033 px of `#work` + `#services` sit between the bands, and owner decision **D2** now makes that a feature: the world **closes** at the Act I seam and **reopens** at the Act II seam, so there is no cross-interlude state to manage and no contention with `#services`' own pinned stage. And there is a free gift in it: while the DOM stage is pinned, `SignatureLine`'s camera keeps gliding with `window.scrollY` (`SignatureLine.tsx:787`), so the tube and the dust stream through the frame at full speed with the copy held still. That IS igloo's travel, and it costs zero lines.

**Read PART 0-BIS first.** It reconciles this conclusion with the storyboard's frame (they are the same mechanism in different coordinates — the storyboard's "fixed viewpoint" is the group plane at `CAMERA_Z`), carries the binding D1 runway, adds the one genuinely new structural finding (**the rig must sit outside the anisotropic group scale or the authored diagonal shears 1.76× on desktop and 2.15× the other way on a phone**), and answers the storyboard's five technical asks.

---

## PART 0-BIS — ALIGNMENT WITH THE BINDING OWNER DECISIONS, AND THE STORYBOARD'S FIVE ASKS

*Added after `2026-08-22-round10-OWNER-DECISIONS.md` (D1/D2/D3, binding) and the landed storyboard. Nothing in Parts 1–12 contradicts them; where a number changed it has been corrected in place and this section is the authority.*

### 0B.1 The three decisions, and what each one changes in the mechanism

**D1 — the full 27.4 %.** Binding runway: Act I `#problem` **6.10 vp = 4392 px** (today 1330 ⇒ **+3062**), Act II `#trust` **5.95 vp = 4284 px** (today 1475 ⇒ **+2809**), page **21459 → 27330 px**. My §5 previously priced 3/4/5-beat variants; that table is **superseded** and Part 5 now carries the binding bill only. Everything downstream that scales with runway length has been re-derived at 7 beats — most importantly the `useTextDrift` shear (§3.4), which gets **worse**, not better: **440.6 px** of separation inside a 720 px stage.

**D2 — the world closes and reopens.** This is the single biggest *simplification* the mechanism gets, and yes, it changes my handover story materially:

- **No cross-section world state.** There is nothing to keep alive across 6033 px, so there is no persistence layer, no "dimmed" mode, no long-lived uniform, and no risk of a camera-locked island riding over `#work`/`#services`.
- **No contention with `#services`' pinned POV stage.** Two sticky stages never coexist. That removes an entire class of bug (two `overflow:hidden` frames, two `focusin` handlers, two ScrollTriggers with overlapping `start/end`) that I would otherwise have had to write a protocol for.
- **The arm/disarm edge is already specified in the repo.** Use the passage's `bandST` grammar verbatim — `ScrollTrigger.create({ trigger: root, start:"top bottom", end:"bottom top", invalidateOnRefresh:true, onToggle })` (`singularity-passage.tsx:1144-1166`) — **including its P0 fix** (`:1178-1187`): after every refresh, re-assert the armed truth from the band's *fresh* measurement, because a stale band measurement once left a camera-locked hole armed over the whole home page (*"il buco nero si vede in tutta la home"*, `:1327-1336`). **That P0 is directly in this round's line of fire**: D1 grows two sections by 5871 px, which is exactly the downstream layout change that stranded `armed` last time. Copy the re-assertion, do not re-derive it.
- **Invariant worth asserting in dev**: `journeyStore.problem.active && journeyStore.production.active` must never both be true. They are 6033 px apart and each band is ~4.3 k px, so it is structurally impossible — assert it anyway; it is the cheapest detector for a stale-arm regression.
- The three act edges are `CUT_BOUNDARY_PAIRS` entries **already wired** (`sectionStore.ts:233-239`): `problem→case-studies`, `services→production`, `production→founders`. See 0B.4-(d) for the retiming answer (there isn't one — and why).

**D3 — the meteorite is the fractured Act I stone, absent during travel.** Consequences for the crystal island, all favourable, one trap:

- **Screen lifetime**: first sighting at P5-local 0.75 ⇒ `j ≈ 0.785`, held to `j = 1`. That is `0.25 × 576 + 648 = 792 px` of Act I's 3672 px of travel — **21.5 % of the act, ≈1.4 of the 7 beats**, not 7.
- **Do NOT convert `CrystalCluster` to init-on-approach.** The instinct is to copy `SequenceSingularity`'s "build DEFERRED to the approach band + compileAsync-warmed, disposed on far leave" (`Scene.tsx` island header). Here it would *buy* a stall: the build loads a GLB (450 / 1114 tris, module-cached, non-suspending) and, on healthy + full + true-WebGPU, allocates the 512² mipmapped mark RT (`MARK_RT_SIZE`, `crystalConfig.ts:842`). The resident cost of an *invisible* stone is already almost nothing: `useFrame` early-returns on the cull (`CrystalCluster.tsx:443-446` — `group.visible = false; return;`), so an off-beat stone costs **one `if`**. Keep the existing lazy build; add a beat gate that drives the same `visible = false`.
- **THE TRAP — the mark RT would render on the sighting frame.** `rig.render(gl, t, mesh.quaternion)` sits *after* the cull early-return (`CrystalCluster.tsx:653-654`), and with the shipped `MARK_SPIN = 0` (`crystalConfig.ts:1154`) it is a **render-once**. If the stone is hidden for the first 78.5 % of the act, that one-shot 512² render + mipmap chain lands on **exactly the T5 first-sighting frame** — the beat the storyboard calls "a shape in the distance, not an event". Fix: force one RT render at **build time** (or on the `bandST` arm edge), never on the visibility edge. One line, and it is invisible in review.
- **The mark's screen budget shrinks 29 % at the hold pose, and is unchanged at the money shot.** The mark reads at 60 % of the silhouette by construction:

| pose | `CRYSTAL_SCALE` | stone (fraction of `rect.h`) | stone px | mark px (60 %) |
|---|---|---|---|---|
| today, pre-shrink (619 px band) | 0.17 | 0.564 | 349 | **208** |
| **landed shrink**, still the 619 px band | **0.115** | 0.382 | 236 | 142 |
| journey APPROACH peak (P6 0.00–0.46), 720 px stage | — | 0.48 | 346 | **207** — identical to pre-shrink |
| **journey HOLD** (P6 VERDICT), 720 px stage | 0.115 | 0.382 | 275 | **165** (−21 % vs pre-shrink) |
| storyboard's 34 % alternative | 0.102 | 0.339 | 244 | 146 (−30 %) |

  `MARK_LOD_K 0.36` (`:1150`) and `MARK_THICKNESS 0.35` (`:1066`) were fitted at 208 px. The mark reads at its best precisely at the money shot and shrinks only once it has already landed — defensible, and arguably the right dramatic shape — but it is **a measured regression on the thing the owner approved two commits ago** (`93bb31d`, "the logo reads inside the ice"). It gets its own QA gate in §12 Stage 4, with that number.
- **Convergence with the `CRYSTAL_SCALE` fix — now a FACT, not a prediction.** The parallel agent landed **`CRYSTAL_SCALE = 0.115`** in the working tree while this dossier was being written. That is `0.115 × 3.32 = 38.2 %` of `rect.h`, against the storyboard's 34 % — a 12 % difference, well inside taste. Because the constant is a fraction of `rect.h`, it carries from the 619 px band to the 720 px stage **unchanged**, so the shrink does not need re-deriving when the anchor changes. **Do not duplicate the fix, and do not let anyone re-fit it against the old band.** The residual 34 vs 38.2 % is an owner-eye call at Stage 4, not an arithmetic one.

### 0B.2 THE FRAME — the storyboard's reads stand, unchanged, and the numbers project directly

The storyboard writes every pose in the **world-slides-past-a-fixed-viewpoint** frame, viewpoint at local `z = 0`, and calls it handoff §3a option (c). My Part 2 concludes that option (c) *as the handoff defines it* — translating a world root past a static camera — moves nothing for these islands. **These two statements are not in conflict, and the storyboard does not need re-projecting.** Here is the reconciliation, stated plainly:

> The storyboard's "fixed viewpoint at the screen plane" is the **island's group plane**, which sits exactly `CAMERA_Z = 12` world units in front of the camera by construction (`NeuralLattice.tsx:374-379` places the group at `−CAMERA_Z` along the camera's forward axis). Its "the world slides through it" is a **translation of the cloud in the group's local frame**. That is precisely option (d) — the local dolly rig. The storyboard has been describing my mechanism all along, in the island's own coordinates; the only thing Part 2 adds is **who writes the transform** (the island's rig, not SignatureLine, not a world root) and **why nothing else can** (a camera-locked group is invariant under every camera write).

The conversion is one constant. At a 100 vh stage, `rect.h = ih`, so:

```
hWorld = ih · k = ih · (WORLD_VIEW_HEIGHT / ih) = WORLD_VIEW_HEIGHT = 11.1914
⇒ 1 local "stage-height" unit  =  11.1914 world units, at every viewport.
```

(`zWorld = hWorld × NEURAL_DEPTH_SCALE_FACTOR(1.0)`, `neuralLatticeConfig.ts:1581`.) So the storyboard's z axis maps to camera distance as `d = 12 − e × 11.1914`, where `e` is its effective local z:

| storyboard `e` (stage-heights) | world offset | camera distance `d` | a 1-stage-height object renders at |
|---|---|---|---|
| −1.72 (far wall, P0) | −19.25 | 31.25 | **276 px** = 0.38 vp |
| −1.55 (P0 slide start) | −17.35 | 29.35 | 294 px |
| −0.85 (shell outer edge) | −9.51 | 21.51 | 402 px |
| −0.15 (shell core edge) | −1.68 | 13.68 | 632 px |
| **0 (the "screen plane")** | 0 | **12.00** | **720 px = 1.00 vp** ✔ |
| +0.38 (nearest authored node) | +4.25 | 7.75 | 1114 px = 1.55 vp |
| +0.45 (P6 slide end) | +5.04 | **6.96** | **1241 px = 1.72 vp** |

**A 4.5 : 1 apparent-size range across the act, delivered entirely by a local translation of 22.4 world units — 1.87 × `CAMERA_Z`.** That is a real corridor, and it is unreachable by any camera write.

Two structural checks, both clean:
- **Near plane**: closest content sits at `d = 6.96` against `near = 0.1` (`Scene.tsx:389`) — 70× clearance. No clipping.
- **Frustum culling**: every mesh in both islands is already `frustumCulled = false` (`NeuralLattice.tsx:796, 804, 817`; `CrystalCluster.tsx:1002, 1012`; `neuralFieldCompute.ts:2806`), so a 22-unit local translation cannot mis-cull against a stale bounding sphere. This was the one thing that could have made option (d) expensive, and it is already paid for.

### 0B.3 NEW FINDING — the rig must sit OUTSIDE the anisotropic scale, or the diagonal shears 1.76×

The outer group's scale is **non-uniform**: `group.scale.set(wWorld, hWorld, zWorld)` (`NeuralLattice.tsx:380`), i.e. `(19.8958, 11.1914, 11.1914)` at a 1280×720 stage. The x axis is scaled `wWorld/hWorld = 1.7778` more than z — that ratio *is* the viewport aspect, and it is why the config authors x in width-fractions and y/z in height-fractions (`neuralLatticeConfig.ts:47-53`).

Translation along z is unaffected by that (a translation does not mix axes). **A yaw does.** Under `S = diag(19.8958, 11.1914, 11.1914)`, a child rotation `R(θ)` composes as `S·R(θ)`, which is **not** a rigid rotation: it is a rotation followed by an anisotropic stretch. Consequences for the storyboard's diagonal:

| authored yaw | rendered x→z yaw at 1280×720 (aspect 1.778) | at 390×844 portrait (aspect 0.462) |
|---|---|---|
| Act I −7.7° | **−13.51°** (1.76× too strong) | **−3.58°** (0.46× too weak) |
| Act II +6.3° | **+11.10°** | **+2.92°** |

`atan(tan θ · wWorld/hWorld)`. So one authored constant would render the diagonal **1.76× too strong on desktop and 2.15× too weak on a phone**, and the cloud's silhouette would visibly stretch and un-stretch as θ ramps — a breathing distortion, not a rotation.

**The fix is structural and it is six lines.** Move the anisotropic scale off the camera-locked group and put the rig above it:

```
<group ref={groupRef}>        // camera-locked position + quaternion, scale = 1   ← HUD anchor
  <group ref={rigRef}>        // JOURNEY: rigid translate (WORLD units) + rigid rotate
    <group ref={scaleRef}>    // scale = (wWorld, hWorld, zWorld)   ← moved off groupRef
      <group ref={innerRef}>  // existing auto-orbit + pointer parallax, untouched
        …meshes
```

The rig's translation is then `slide_local × WORLD_VIEW_HEIGHT` (world units) and its rotation is a genuine rotation at every viewport. The dev handle's `project()` reads `groupRef.position` (`NeuralLattice.tsx:776-780`) and is unaffected.

**`CrystalCluster` needs no restructure**: its scale is already **uniform** (`group.scale.setScalar(s)`, `:494`), so a rig on either side of it is rigid. One island changes shape, the other does not.

*Footnote, for whoever retires the copy mask*: the existing `COPY_EDGE_PAD` derivation (`neuralLatticeConfig.ts:1766-1771`) computes the inner group's rotational drift as `0.2·sin(0.09) = 0.018 of band width` — mixing a height-fraction with a width-fraction. The true drift in width fractions is `0.018 × (h/w) = 0.0087` at 1280. The shipped pad is therefore ~2× conservative, which is why the shipped ±0.09 rad orbit has never shown this bug. At 0.134 rad (7.7°) it would.

### 0B.4 THE STORYBOARD'S FIVE TECHNICAL ASKS, ANSWERED

**(1) Is `position: sticky; top:0; height:100vh; overflow:hidden` compatible with the `[data-lattice-anchor]` measure/anchor plumbing? — CONFIRMED, with one mandatory correction and three consequences.**

- ✔ **The camera-lock math is rect-agnostic.** `NeuralLattice.tsx:370-380` consumes only `rect.{cxBase,w,h}` and `vpTop`; it locks to whatever box it is handed. The stage becomes `100vw × 100vh` ⇒ `group.scale = (worldViewWidth, WORLD_VIEW_HEIGHT, WORLD_VIEW_HEIGHT)` — the frustum at the group plane, exactly. Local ±0.5 in y fills the viewport height precisely. This is a *cleaner* number than today's letterbox, not a riskier one.
- ⚠ **MANDATORY: the sticky-offset correction (§4.4, risk R1).** `vpTop = rect.docTop − scrollY` assumes normal flow. Under a sticky ancestor the net slides up out of frame and is culled once `vpTop < −(ih + CULL_PAD) = −940 px`, i.e. after 940 px of stage travel — **at `j = 0.256`, in the middle of P2, the thesis beat**. It is visibly wrong long before that: at `j = 0.05` the volume's centre is already 184 px (a quarter of the stage) too high. Correction: `vpTop = rect.docTop − scrollY + clamp(scrollY − stageTopDoc, 0, runwayPx − vh)`, with the measure-time offset subtracted from the cached `docTop`.
- ✔ **`overflow: hidden` does not clip the WebGL.** The canvas is a separate `fixed inset-0` layer *behind* the DOM (`CanvasHost.tsx:33`); the stage clips DOM only. The volume may bleed past the stage box — which at 100 vh means "off-screen", so it is free. There are no clipping planes or scissors anywhere in `src/webgl/` (verified).
- ✔ **The arrival ramp and the cull degrade gracefully.** With the corrected `vpTop`, the stage's `vpTop = 0` for the whole act ⇒ `vis = clamp((720+110−0)/(720·0.7)) = 1`. The `revealDamped` arrival ramp becomes a no-op inside the act, which is **correct**: arrival is now beat P0's job, not an IO ramp. The cull window (`vpTop + h < −220 || vpTop > ih + 220`) spans ~3 viewports around the stage — ample.
- 📋 **`data-lattice-anchor` moves onto the stage element.** It is currently a full-bleed absolutely-positioned child of the rows stack (`problem-section.tsx:386-390`) carrying the dot-grid, the SVG fallback and the three callout spans. They move with it, which is what the storyboard wants (callouts projected against the stage, gated to P6).

**(2) `BAND_ASPECT 0.45` vs a 100 vh stage (0.56 desktop / 2.16 phone portrait) — RULING.**

The storyboard is right that a constant tweak cannot fix it, and right that this is the largest sizing risk. But **"the phone needs its own seeded cloud" is stronger than necessary and costs a second hand-tuned table.** The exact fix is cheaper.

The facts: `BAND_ASPECT` is **build-time only**, used in exactly three places, all inside `buildPlexus` — the crystal density well (`:410`), the near-neighbour distance metric (`:431`) and the link-midpoint carve test (`:445`) — to put local x into height units before measuring a distance. The *live* in-shader aspect is a different, already-correct value: `uPlaneAspect = rect.h / rect.w`, driver-written per frame (`NeuralLattice.tsx:586`), which tracks the stage automatically and needs no change.

The error, quantified: today's bands are 0.484 / 0.525, so 0.45 is within 8 %. At a desktop stage the truth is **0.5625** (25 % off — a mild columnar bias in the link graph). At 390×844 portrait the truth is **2.164**: the metric would stretch x by `1/0.45 = 2.22` where it should **compress** it by `1/2.164 = 0.462` — a **4.8× error in the wrong direction**. The near-neighbour graph would pick almost entirely the wrong axis, and the crystal density well would carve an ellipse 4.8× wrong in aspect (either swallowing the stone or cutting a wide slot through the cloud).

> **RULING: make `BAND_ASPECT` a build-time PARAMETER of the generator, not a module constant.** `getPlexus(mode, density)` (`neuralLatticeConfig.ts:365-375`) is already module-cached by `${mode}:${density}`; extend it to `getPlexus(mode, density, aspectBucket)` with the key `${mode}:${density}:${aspectBucket}`, and pass the measured stage aspect into `buildPlexus`. Then the cloud is seeded for the aspect it will actually be shown at, **at every viewport, with no table and no phone variant.**

Three implementation clauses, all precedented:
- **Bucket the aspect, never pass the raw value.** The plexus tables are `uniformArray`s built at island-build time and the node/edge **counts are build-time** (`neuralFieldCompute.ts:935-936`), so a change means dispose + rebuild. Quantise to a coarse bucket (`portrait | square | landscape`, or 0.25 steps) and add it to the build effect's deps alongside `[mode, gl]` (`NeuralLattice.tsx:198-243`). This is exactly `DriftParticles`' `widthBucket` idiom and its stated reason (`DriftParticles.tsx:262-272`: a raw size dep "reallocated three Float32Arrays + a fresh InstancedBufferGeometry for up to 3000 instances on every tick of a resize drag").
- **The DOM SVG fallback must use the same bucket.** `neural-graph-fallback.tsx` draws the same generator at density `"svg"`; if the two disagree, the fallback and the island show different graphs on the same viewport.
- **`CRYSTAL_POS` and `CRYSTAL_CLEAR_INNER/OUTER` come along for free** — they are measured through the same metric, so parameterising it fixes the stone's clearance well at every aspect in the same change.

Cost: one parameter, one cache-key change, one bucket in a deps array. **This also makes the round-9-B "@floor" count tables re-derivable rather than invalid** after the reseed — the per-sprite value arithmetic (the AA ledger) is untouched by topology.

**(3) `useTextDrift` inside a sticky stage — VERIFIED, it is a real defect, and here is the fix.**

Verified in source. `registerDrift` measures once at register and again only on ScrollTrigger `"refresh"` (`lusion-type.ts:536-540, 601, 655-656`); the per-frame tick is `dy = (1 − k)·(en.center − viewCenter)·DRIFT_SCALE` with `DRIFT_SCALE = 0.12` (`:563, :147`), where `en.center` is cached **document** space and `viewCenter` is live. Inside a sticky stage the element stops moving on screen but `viewCenter` keeps advancing, so `dy` grows without bound and translates the plate out of the pinned frame. At the **binding D1 runway** (Act I travel 5.10 vp = 3672 px):

| block | `k` | `(1−k)` | `Δdy` across Act I | across Act II (3564 px) |
|---|---|---|---|---|
| display line | 0.5 | +0.5 | **+220.3 px** | +213.8 |
| body | 1.5 | −0.5 | **−220.3 px** | −213.8 |
| chapter desc | 1.25 | −0.25 | −110.2 px | −106.9 |

**A display line and its own body would separate by 440.6 px — 61 % of the 720 px stage.** Not a tuning problem; a coordinate-system mismatch.

Fix — **do not re-base the drift on beat progress; disarm it.** Re-basing (the storyboard's suggested alternative) would keep a per-frame ticker running to reproduce a parallax whose *entire purpose* is to express the block's distance from the viewport centre while the page scrolls. Inside a pinned stage the block **is** at a fixed distance from the viewport centre, so the physically correct value of the effect is a constant, and the cheapest correct implementation of a constant is not to run a ticker:

- `useTextDrift`: skip registration when the scope sits inside `[data-journey="on"]` (`el.closest(...)`). One `if`, and `disarmDriftDriverIfEmpty()` (`:648`) then removes the ticker entirely for those blocks. Every other consumer on the site is byte-identical.
- If the owner later wants motion on a held plate, the storyboard already specifies the right instrument and it is not drift: **recipe R2**, the Lusion EndSection idle rollup (one random char per word, every 2 s), which is what keeps a held frame alive without moving anything.

Same class of breakage, same beat: `createReplayTrigger` (`:178-192`) keys `start:"top bottom" / end:"bottom top"` on the **row**. Pinned, every row enters within one frame and none leaves — the per-row R1/B1 cascade (`ROLL_DUR 1.25 s`, body `+0.3 s`) collapses to a simultaneous burst and never replays. Fix: when armed, drive the (already `paused: true`, already replayable) timelines from a `journeyStore.beat` straddle edge instead. Splits, the ignition latch (`:310`), `Hv1`, and the `onIgnite` ring bump are all untouched.

**(4a) Binding budget for the journey uniforms — ZERO new blocks, ZERO new varyings.**

The journey's shader-visible state is: `uJourneyRest` (the 0.08 dark rest), `uShellIn`/`uShellOut` (or baked literals — it is a shape, not a tuning), `uShellCore` (165 → 122 → 88), `uFrayZ` (the fracture plane, replacing today's `nodeT` gate) and `uCopyBeat` (replacing `uCopyEdge`/`uCopySoft`). That is **5–6 plain `uniform()` scalars, 0 new `uniformArray`, 0 new storage buffers, 0 new textures.**

The precedent is explicit in the source and it is the *same count*: round 9-B added "five plain `uniform()` scalars (a shared group, NOT a new UBO block — the 8-of-12 count above is unmoved)" (`neuralFieldCompute.ts:2560-2564`, and `:272`, `:1038`). Plain scalars join three's shared groups; only a `uniformArray` emits its own UBO (`:952-955`).

- Particle vertex stage: **stays 12 / 12** (the zero-headroom floor, `:962-968`). Untouched.
- Link-line vertex stage: **stays 8 / 12**. Untouched.
- **Varyings**: the shell value must reach the fragment stage on the line material, which is at 4 of the `MAX_VARYING_VECTORS` floor of 15 (`:2560-2568`). It **reuses `vLineCut`'s slot** — the copy mask that varying carries is being retired and the shell replaces it in the same channel. **Net varying delta: 0.** (Worth stating loudly: three emits one `out` per varying *node*, not packed floats, so an added varying is a real slot.)
- Net across the swap: **−2 / +6 shared-group scalars, 0 blocks, 0 slots.**

The **dolly and the yaw are scene-graph transforms**, carried by `modelViewMatrix` in `buildVertex` (`:2203`) — no shader input at all.

**(4b) The WebGL2 fallback's shader cost at a 100 vh fill rate — bounded on paper, must be measured.**

What can be stated exactly:
- The anchor area grows only **16 %** (619 → 720 px tall at 1280 wide). That is not the driver.
- The driver is the z-translation. `sizeNode ∝ 1/dist` (`:2211`) ⇒ sprite **area ∝ 1/dist²**. Relative to the group plane: a sprite at `e = +0.45` costs `(12/6.96)² = 2.97×`; one at the far wall `e = −1.72` costs `(12/31.25)² = 0.147×`. Because the cloud occupies the whole depth at every instant, the aggregate sits far below the near-node worst case — but the integral depends on the reseeded node distribution (ask 2), so **it is not derivable on paper. Measure it.**
- **The WebGL2 fallback is not the worst case.** `NeuralLattice` skips `build.compute()` on a non-compute backend and renders the analytic build (header, `:427-428`), so its vertex/compute cost is *lower* than WebGPU's while its fill cost is identical. The worst case is a **capable phone at `fxBudget.level === 2` on a true-WebGPU backend**, running the compute sim *and* the fill, on a tile GPU, at a 2.16 portrait aspect.
- `CrystalCluster` is a plain node material with no compute on either backend (header, `TIERS`), so the stone's cost is backend-independent.

**(4c) `AdaptiveResolution` / DPR when the band goes full-screen — do NOT leave it to the monitor.**

`AdaptiveResolution` steps `setDpr` inside `[min, effMax]` from drei's `PerformanceMonitor`, and **each change reallocates the swapchain + the PostFX render targets — "a brief hitch, fine occasionally"** (`AdaptiveResolution.tsx:16-21`). A journey whose fill swings ~3× *within* each beat is precisely the input that makes the monitor hunt, and every hunt is a hitch **inside a cinematic beat**. That is the specific new risk a full-screen band introduces, and it is not a fill-rate risk — it is a *stability* risk.

> **Assert an explicit `dprCap` for the journey span instead of letting the monitor hunt.** The API is one line and already wired into `effMax`: `useTierStore.getState().setDprCap(cap | null)` (`tierStore.ts:597-598`, consumed at `AdaptiveResolution.tsx:52-56`). The precedent is exact — the passage caps the plunge at `SEQ.DPR_CAP = 1.5` "while the raymarch approaches fullscreen coverage", armed at `p > DPR_CAP_ON 0.85` and released at `p < DPR_CAP_OFF 0.82` (`seqStore.ts:228-230`, `singularity-passage.tsx:1541-1548`) — note the **hysteresis gap**, which is what stops the cap itself from chattering. Journey analog: arm on the `bandST` edge (stable for the whole act, so the DPR is *constant* through the film rather than hunting), release on leave, exactly as the coarse branch already does (`:1155-1158`, `:1213`).
- Value: `1.5` is the right first guess by precedent; it must be replaced by a measurement (§12 Stage 2 gate).
- Phones are additionally covered already: at level 2, `effMax` applies Lusion's pixel cap `sqrt(maxPixels/(w·h))` (`AdaptiveResolution.tsx:57-70`).
- **Do not** step DPR per beat. One cap per act, or none.

**(4d) `PostFXNodes` `uWipe` retiming for the act boundaries — NO retiming is needed, and here is the proof.**

1. **Boundaries re-derive themselves.** `deriveCutBoundaries` runs only on a `sectionStore.measureVersion` bump and remaps doc fractions into progress space from the fresh `scrollHeight`/`innerHeight` (`PostFXNodes.tsx:1105-1126`). D1's +5871 px moves `problem→case-studies` and `services→production` to the right places with **zero code**.
2. **The window is one viewport of scroll in px, by construction** — `halfWindow = 0.5·iH/limit` in progress space (`:1116`). It does *not* stretch with the taller page, which is correct: a seam should take one screen to cross regardless of document height.
3. **The per-boundary window cap does not bind.** `maxH[i]` = half the distance to the nearest other boundary (`:1122-1132`). `problem→case-studies` and `case-studies→services` are separated by `#work`'s 2283 px — unchanged by D1, since `#work` does not grow — so `maxH ≈ 1141 px > 720`: no clamping, before or after.
4. **The one thing to verify visually, not to code**: the journey closes when the stage unpins (`end:"bottom bottom"` ⇒ `p → 1`), while the cut fires when the boundary passes viewport **centre**, i.e. `≈0.5·ih` of scroll **later**. So the world closes, then the seam sweeps ~360 px afterward. That ordering is the right shape for D2 ("the world closes here" and *then* the cut), but if the owner wants them simultaneous, the lever is the last beat's length, **not** the cut driver.
5. `uWarpBurst` already spikes on the crossing with `min(1, 0.35 + 0.65·|vel|/velNorm)` and a fresh seed (`:1181-1189`) — exactly the "the world closes here" the storyboard asks for. Nothing to add.

**(5) The pose frame — the storyboard's reads stand and its numbers do NOT need re-projecting.** See 0B.2. The only correction is a naming one (the "fixed viewpoint" is the group plane at `CAMERA_Z`, not the eye) plus the structural one in 0B.3 (the rig must sit outside the anisotropic scale, or the authored yaw renders 1.76× too strong on desktop and 2.15× too weak on a phone).

---

## PART 1 — GROUND TRUTH, AND THE THREE THINGS THE BRIEF GOT WRONG

### 1.1 The measured map (coordinator, live, 1280×720, doc 21459)

| id | top | height | vh @720 |
|---|---|---|---|
| `#top` (spine) | 18 | 2268 | 3.15 |
| `#singularity-passage` | 1566 | 2736 | 3.80 |
| **`#problem`** (net 1, broken) | **4302** | **1330** | **1.85** |
| `#work` | 5632 | 2283 | 3.17 |
| `#services` | 7914 | 3751 | 5.21 |
| **`#trust`** (net 2, healthy) | **11665** | **1475** | **2.05** |
| `#founders` | 13140 | 2143 | 2.98 |
| `#process` | 15282 | 286 | 0.40 |
| `#fit` | 15568 | 3941 | 5.47 |
| `#contact` | 19925 | 888 | 1.23 |

Band anchors (`[data-lattice-anchor]`, the box the constellation is actually placed against):

| anchor | doc top | h | w | h in vh |
|---|---|---|---|---|
| `problem` | 4885 | 619 | 1280 | 0.86 |
| `production` | 12248 | 672 | 1280 | 0.93 |

Note the id/anchor mismatch, which trips everyone: the **second** neural section is `<section id="trust">` (`production-grade-section.tsx:296`) carrying `data-lattice-anchor="production"` (`:386`), inside `<div data-line-anchor="production">` (`page.tsx:76`). Three different names for one band. The footer and `/start` both deep-link `/#trust` (`footer.tsx:71`, `start/start-client.tsx:233`) — that matters in §4.5.

### 1.2 Correction 1 — the two nets are NOT one span. Two journeys.

6033 px (8.4 viewports) separate them, and that gap is not empty scroll: `#services` is itself a **sticky runway** (`services-section.tsx:1318`, runway = `100vh + SEGMENTS(4) × SEGMENT_VH(0.85)` = 440vh, `:823`) with its own pinned POV camera pan, and `#work` is the Lusion-grammar Featured Work grid whose `FeaturedWorkPlanes` island is *also* camera-locked (`FeaturedWorkPlanes.tsx:414-417`).

A single continuous journey across both would have to either swallow those two sections into the journey's world (a rewrite of two shipped systems, one of which is a 440vh pinned runway with its own snap stations at `services-section.tsx:934-938`) or run "under" them, which is not a thing — there is one Canvas and one camera.

**Decision: two journeys, one grammar — and the owner has now ruled the same way** (D2: the world closes at the Act I seam and reopens at the Act II seam; a persisting dimmed net behind the interlude was explicitly rejected). A shared `useJourneyStage()` hook + a shared `journeyStore`, instantiated twice with different beat tables. This is the same shape as `NeuralLattice mode="broken" | "healthy"` — one implementation, two configurations — and it is what makes the second one nearly free once the first ships.

It also matches the owner's own sentence: *"poi si va avanti nella rete e ne appare un'altra"* — "another one appears" is a **second** journey, and it does appear later in the page. The connective tissue between them (`#work`, `#services`) is exactly the "you travel on" he describes; it just happens to have content in it.

### 1.3 Correction 2 — the letterbox is a placement box, not a viewport

The coordinator's framing ("0.86 viewport heights ⇒ structurally the opposite of immersive") is right about the *composition* and wrong about the *renderer*. Verified:

- The canvas is `fixed inset-0`, full viewport, behind the DOM (`CanvasHost.tsx:33`).
- **There is no clipping to the band.** No `clippingPlanes`, no `localClippingEnabled`, no `setScissor` anywhere in `src/webgl/` (grep: only `HeroLogo.tsx:764` builds a `THREE.Plane` for raycasting). The `[data-lattice-anchor]` rect is consumed *only* as (i) a placement centre, (ii) a scale, (iii) a cull test (`NeuralLattice.tsx:364`, `CULL_PAD` 220 at `:149`).
- `group.scale.set(wWorld, hWorld, zWorld)` (`NeuralLattice.tsx:380`) scales a local ±0.5 cloud, so the net *already* draws up to the band bounds and no further — because the cloud is authored to ±0.5, not because anything clips it.

So "not enough screen area for a world" is a fact about the current **anchor rect**, not a wall. Under a sticky stage the anchor rect becomes the stage itself: `100vw × 100vh`. That is one attribute move (`data-lattice-anchor` from the rows-stack onto the stage) and it multiplies the band's area by `720/619 = 1.163` in height and — far more importantly — frees the *composition* from having to share the box with three ledger rows.

What the coordinator is right about, and it is the real constraint, is **runway**: 1.85 / 2.05 viewports is not enough scroll distance for a beat sequence. §5 prices that.

### 1.4 Correction 3 — the visibility trap, honoured

`document.visibilityState === "hidden"` freezes every rAF; the coordinator hit it. Every timing claim in this dossier is derived from constants in the source (`SEQ`, `SEGMENT_VH`, `BEAT_VH`, `DRIFT_SCALE`, `ROLL_DUR`) or from the coordinator's foregrounded measurement — **nothing here was timed from a browser in this session**. Where a number needs a live measurement to settle, it is flagged in §12.

---

## PART 2 — THE CAMERA DECISION

### 2.1 What SignatureLine actually does, in frame order

`src/webgl/SignatureLine.tsx` is the only camera writer on the site. Its single `useFrame` (`:625`, no priority argument ⇒ **priority 0**) writes, in this order:

| line | write | driver |
|---|---|---|
| `:787` | `camera.position.y = -(scrollYWorld + size.height/2) * k` | `scrollStore.progress` (damped, `PROGRESS_DAMP` 6 at `:57`) × `(scrollHeight − innerHeight)` |
| `:911` | `camera.position.z = CAMERA_Z + dolly·rigGate` | `|scrollStore.velocity|`, smoothstep-shaped |
| `:912-914` | `camera.position.x = (orbit + parallaxX)·rigGate + seqPan` | ritual-anchor bell + pointer + `seqStore.pan01` |
| `:915` | `camera.position.y += parallaxY·rigGate` | pointer |
| `:989` | `camera.position.y += shakeY·(1 − descRamp)` | `textMorphStore.gateKick` (intro gate only) |
| `:1044` | `camera.position.y -= desc` | `textMorphStore.camTilt` — **provably inert**, nothing writes camTilt above 0 since 2026-08-09 (`:1215-1222`) |
| `:1190` | `camera.lookAt(lookTarget)` | curve look-ahead, blended to dead-ahead by `seqAim` |
| `:1242` | `camera.rotateZ(rollCurrent)` | curve tangent bank, clamped `±CAM_ROLL_MAX` 0.046 rad (`:264`) |
| `:1257-1258` | `camera.quaternion.set(identity); rotateX(−pitch)` | lite/no-curve branch only |
| `:1294`, `:1313-1315` | warp roll + sine-noise shake | `seqStore.upFlip / shakeAmp`, home one-shot only |
| `:1348-1350` | `persp.fov = warpFov; updateProjectionMatrix()` | `seqStore.fovShift`, home one-shot only |

It also **publishes** what it applied so readers can cancel it: `textMorphStore.camDescend` (`:1045-1047`) and `textMorphStore.camRoll` (`:1355-1357`).

The important structural fact: `camera.position.y` is a **pure function of `scrollStore.progress`**, and `scrollStore.progress` is written from the Lenis `scroll` event (`smooth-scroll-provider.tsx:220-226`). Nothing about a sticky DOM stage changes that. **The camera keeps travelling while the DOM holds still.** This is the whole mechanism of igloo's "quasi un video", handed to us free.

### 2.2 The honest camera-lock check — the single most important finding

The brief asked: does camera-locked HUD anchoring make world-motion a no-op? **Yes, and it makes camera-motion a no-op too.** Here is the audit, one island at a time, with the placement line.

| island | placement | invariant under camera **translation**? | invariant under camera **rotation**? | can it participate in a journey? |
|---|---|---|---|---|
| **NeuralLattice** ×2 | `NeuralLattice.tsx:374-379` — `scratch.set((cx−vw/2)k, (ih/2−cy)k, −CAMERA_Z).applyQuaternion(camera.quaternion).add(camera.position)`; `group.quaternion.copy(camera.quaternion)` | **YES — total no-op** | **YES — total no-op** | only via a **local** transform inside the group |
| **CrystalCluster** ×2 | `CrystalCluster.tsx:487-494`, identical construction + `scale.setScalar(rect.h·k·CRYSTAL_SCALE·scaleMul)` | **YES** | **YES** | same |
| **FeaturedWorkPlanes** | `FeaturedWorkPlanes.tsx:412-417`, identical | YES | YES | not on-band; irrelevant |
| **FounderPortraitMorph** | `:1016-1017` + `:1051` (`camera.quaternion.multiply(quat)`) | YES | YES | not on-band |
| **HomeSingularity** | `HomeSingularity.tsx:561-567` — `camera.position.{x,y,z} + place.*`; **rotation/scale stay identity forever** (`:568-569`) | YES | **NO** — a camera yaw/roll swings it across the frame | not on-band (gated to the intro beat) |
| **SequenceSingularity** | `:310-315` — world-anchored X on desktop, camera-locked Y/Z | partially | NO | passage only |
| **AuditSingularity** | `/audit` only | — | — | wrong route |
| **HeroLogo / HeroTextParticles** | camera-locked with an explicit `camDescend` subtract (`HeroLogo.tsx:906-911`) and a `camRoll` counter-rotate | YES | compensated | hero only |
| **SignatureLine tube** | world-anchored: `points[i].y = −fraction·scrollHeight·k` (`:174-180`) | **NO — real parallax** | NO | **already travels** |
| **DriftParticles** | world-anchored: `aOffset.y = −docFrac·worldLen`, `z ∈ [−4,+2]` (`:230-236`) | **NO — real parallax** | NO | **already travels** |
| **GatewayPortal / RouteHero** | world-anchored to an anchor span | NO | NO | wrong band |

So the participating set for the journey is **exactly four islands**: `NeuralLattice` ×2 and `CrystalCluster` ×2 — and none of them can be moved by any camera write or any world-root write. Plus two that travel for free and need no code at all: the tube and the dust.

This kills (a), (b) and (c) as *stated*:

- **(a) SignatureLine journey mode.** Failure mode it would ship: the tube and the dust would swoop, the camera would bank and dolly — and the plexus and the stone would sit *bolted to the glass*, perfectly still, while everything behind them moved. Worse than doing nothing: it would read as a broken parallax layer, and it would drag `HomeSingularity` (position-locked, rotation-free, `:568`) off-centre if the journey ever rotated. It would also put a second, spatially-scoped behaviour inside the one function that six other beats already share (`camTilt`, `seqPan`, `seqAim`, `upFlip`, `fovShift`, the intro shake) — the file is 1534 lines and every one of those terms is order-dependent.
- **(b) A second camera authority with a handover.** Same visual failure as (a), *plus* the handover. Handoff §4 forbids a second writer racing the first; the only sound handover is a hard mutual exclusion, which means an if-branch inside SignatureLine anyway — i.e. (a) with more moving parts. Failure mode: one frame where both write, or one frame where neither does; on a route change or an EN/IT rebuild the journey's owner unmounts mid-write and the camera is left holding a stale pose with no one to relax it (the `seqPanCurrent` damp at `:1108` exists precisely because this already happened once).
- **(c) The world moves past a static camera.** Two fatal problems. First: there is **no world root**. `SignatureLine`'s mesh (`:1528`) and `DriftParticles`' points are direct children of the R3F scene; adding a wrapping `<group>` and writing its transform is possible, but — second, and decisive — **it moves nothing for the four islands that must move**, because they are not in it. It is a strictly weaker (a).

### 2.3 The recommendation — option (d): the local dolly rig

> **Each participating island keeps its camera-locked outer group as a HUD anchor to a full-viewport sticky stage, and gains ONE new intermediate `<group>` between the outer group and its existing inner group. That group carries the journey: translate along the view axis (the "travel"), translate laterally/diagonally, and rotate. It is a pure function of the band's journey progress, read with `getState()` in the island's existing `useFrame`. SignatureLine is not touched. No second camera writer exists. No world root is created.**

Why this is not a fudge: the perspective divide is the same divide. Proof in §2.4.

Why it is *strictly more expressive* than any camera option: a camera move cannot move a camera-locked island at all, but a local move can — and it can move each island **independently**, which is exactly what the owner asked for (*"scrollando vai avanti … poi viene una scritta animata, poi si va avanti nella rete e ne appare un'altra, la pietra meteorite"* — the net, the copy and the stone are on different clocks).

Structural bonus, and the reason this is safe: **the four islands already own an inner group with a live transform** (`NeuralLattice.tsx:551-559` writes `inner.rotation` and `inner.position.z` every frame; `CrystalCluster` writes `mesh.rotation` at `:516-520`). Adding a parent to that inner group is additive; the existing writes keep working unchanged, in their own frame, on top of the journey.

### 2.4 Does "travel" require camera translation? The projection math, at this site's real numbers

Constants: `CAMERA_FOV = 50`, `CAMERA_Z = 12`, `near 0.1`, `far 200` (`constants.ts:4-5`, `Scene.tsx:389`).
`WORLD_VIEW_HEIGHT = 2·tan(25°)·12 = 11.19138` (`constants.ts:14-15`).

At 1280×720:
- `k = 11.19138 / 720 = 0.0155436` world units per CSS px
- px per world unit at the content plane = `64.336`
- `worldViewWidth = 11.19138 × 1280/720 = 19.896`

**`#problem` band** (`h = 619`):
- `hWorld = 619 × 0.0155436 = 9.6215`; `wWorld = 19.896`; `zWorld = hWorld × NEURAL_DEPTH_SCALE_FACTOR(1.0) = 9.6215` (`neuralLatticeConfig.ts:1581`)
- nodes live at local `z ∈ ±PLEXUS_RZ = ±0.2` (`:255`) ⇒ world `z ∈ ±1.9243` about the group plane
- the group plane sits **exactly 12 units in front of the camera** by construction ⇒ node camera-distances span **[10.076, 13.924]**
- near/far apparent-size ratio = `13.924/10.076 = 1.382` — a real but modest depth cue

**Apparent height of the whole net** at group depth `d`: `hWorld · ih / (2·tan25° · d) = 7428.3 / d` px. Sanity: at `d = 12` → **619.0 px** = the band height exactly. ✔

| target | required `d` | required dolly (world units) | as a fraction of `CAMERA_Z` |
|---|---|---|---|
| net fills the viewport height (720 px) | 10.317 | **1.68** | 14 % |
| net at 2× viewport (1440 px) | 5.159 | **6.84** | 57 % |
| nearest node shell reaches the camera | ≤ 10.076 | **10.08** | 84 % |

**`#production` band** (`h = 672`): `hWorld = 10.4453`, `z ∈ ±2.089`, distances `[9.911, 14.089]`, ratio 1.422, apparent `= 8064.2/d` px; already 93 % of the viewport at rest, so it needs only **0.80** units to fill.

**Now the equivalence.** Take a point at camera-space depth `D`. Its screen size is `f/D`. Move the *camera* toward it by `Δ`: `D → D − Δ`. Move the *point* toward the camera by `Δ`: `D → D − Δ`. Identical, term for term — this is Galilean, and it is exact for a perspective camera because the projection depends only on the *relative* position. **There is no "fake" here: moving world groups produces the true perspective divide, not an approximation of it.** The only thing camera translation buys that group translation does not is that it moves *everything you did not enumerate*. On this site that set is: the tube and the dust — and both of those **already move**, driven by `SignatureLine.tsx:787` off `window.scrollY`, whether the DOM is pinned or not.

So the honest answer to the brief's question is: **travel requires a change in the view-axis distance of the moving objects, and nothing else. Camera translation is one way to produce it; local group translation is another; for the four islands that matter, local translation is the *only* way.**

Two things must be got right, and both are exact:

**(i) Keeping the group's centre on screen while it approaches.** The placement writes the camera-space offset as `(cx−vw/2)·k` at depth `CAMERA_Z`. If the depth becomes `d` the lateral offset must scale by `r = d / CAMERA_Z`, or the band's centre will slide off the anchor point as it approaches:

```
const d = CAMERA_Z - dolly;         // journey depth
const r = d / CAMERA_Z;
scratch.set((cx - vw/2) * k * r, (ih/2 - cy) * k * r, -d)
       .applyQuaternion(camera.quaternion).add(camera.position);
```

Check: screen-x of the centre = `f · X / d` with `X = (cx−vw/2)·k·r = (cx−vw/2)·k·d/12` and `f = 12/k` ⇒ `= (cx−vw/2)`. Constant in `d`. ✔ `group.scale` is left exactly as today; the growth comes free from the divide.

**(ii) The sprite size math is already a true perspective one.** `neuralFieldCompute.ts:2207-2211`: `sizeNode = uPointSize · uPixelRatio · sizeK · depthK / max(dist, 0.001)` where `dist = −(modelViewMatrix·center).z`. That divides by the **real** view-space distance, so a dolly makes stars grow correctly and pass by with **zero shader changes**. The aerial/DOF cue `depthK` reads *local* z normalised over `DEPTH_Z_RANGE = PLEXUS_RZ` (`:1364`, `:1493`) — unchanged by a group-level dolly, so it stays correct too. This is a large, unusual piece of luck and it is why option (d) is cheap.

### 2.5 What option (d) costs the camera contract: nothing

- `SignatureLine.tsx` — **zero lines changed**.
- No new writer of `camera.position`, `camera.quaternion`, `camera.fov`.
- `textMorphStore.camDescend` / `camRoll` consumers unaffected.
- The `seqStore` pan/aim/warp channels unaffected.

The handoff §4 clause "SignatureLine is the only camera writer" survives literally, not by interpretation.

---

## PART 3 — THE STAGE DECISION: a `.seq-stage`-class sticky runway

### 3.1 The pattern the site already ships, four times

| owner | sticky stage | runway height | trigger |
|---|---|---|---|
| `singularity-passage.tsx` | `.seq-root[data-on="seq"] .seq-stage { position:sticky; top:0; height:100vh; overflow:hidden }` (`:2529-2534`) | `root.style.height = 380vh` + `marginTop:-100vh`, re-asserted on `refreshInit` (`:1302-1306`) | `ScrollTrigger.create({ trigger: root, start:"top top", end:"bottom bottom", scrub:true, invalidateOnRefresh:true, onUpdate: self => apply(self.progress) })` (`:1169-1175`) |
| `fit-section.tsx` | `sticky top-0 h-screen overflow-hidden` (`:1308`) | `runway.style.height = vh + BEATS(6)×BEAT_VH(0.7)×vh` px (`:752-753`) | `start:"top top" / end:"bottom bottom"`, `onRefreshInit: measure` (`:761-768`) |
| `services-section.tsx` | `:1318` | `vh + SEGMENTS(4)×SEGMENT_VH(0.85)×vh` px (`:823-824`) | `:909-916`, identical shape |
| `cinematic-system-scroll.tsx` | `:1697` | `SPINE_HEIGHT_VH` 315vh (`lib/spine.ts:19`) | — |

**None of them uses ScrollTrigger `pin:`.** The passage's header states the reason verbatim (`:148-150`): *"CSS sticky stage + explicit container height (NO ScrollTrigger pin — a pin-spacer breaks every `[data-line-anchor]` measurement)"*. That is the binding constraint: `SectionBus` measures every `[data-line-anchor]` into document fractions (`section-bus.tsx:55-84`) and the signature-line curve is built from them (`SignatureLine.tsx:174-180`); a pin-spacer inserted at refresh time desynchronises the whole curve.

**And none of them hijacks scroll.** The page scrolls at exactly native speed through a sticky stage; nothing parks; the wheel is never consumed. This is precisely the distinction the owner's "no" is about — his rejection was of the *snap engine's 1-second settle* (`round8-scroll-dossier.md` §1.2: 420 ms debounce + up to 8×240 ms retries + a 0.55–1.05 s `lenis.scrollTo`), which was deleted in `6848e7b`. He has approved sticky staging four times. **A sticky stage is not scroll hijacking and must not be described to him as one.**

### 3.2 What the journey inherits for free

From the passage precedent specifically:
- **The armed-context pattern.** `root.setAttribute("data-on","seq")` (`:1270`) + `root.style.height` set **inside** the matchMedia-armed GSAP context, cleared on cleanup. Under RM / no-JS / the wrong tier the section stays **normal flow with no runway at all**. This is the whole degradation story, already solved.
- **`refreshInit` height re-assertion** (`:1305-1306`) — a `ScrollTrigger.refresh()` from anywhere (fonts, resize, spine bursts) cannot clobber the runway.
- **`invalidateOnRefresh: true` + `onRefreshInit: measure`** — the runway is re-derived in px from the fresh `innerHeight` on every refresh, so the beat table never drifts.
- **The svh/vh split (trap D-7).** The coarse branch measures in `svh` (`:2593-2596`) because `vh` jumps when the mobile address bar collapses; the desktop branch stays on `vh`. Copy this exactly.
- **The focusin net** (`services-section.tsx:958-961`, `fit-section.tsx:810-813`): focusing anything inside an `overflow:hidden` sticky frame makes the browser scroll the frame itself and shear the composition; both owners zero `scrollLeft/scrollTop` on `focusin`. The neural bands have **focusable rows** (`problem-section.tsx:439` `tabIndex={0}`), so this is mandatory, not optional.
- **The overflow guard.** `LITE_PANEL_SCROLL` (`singularity-passage.tsx:257-275`): the pinned copy must fit `100svh − header`, measured not assumed, with `data-lenis-prevent` armed only when it genuinely overflows. The ledger rows are *taller* than panel 05, so this measurement is load-bearing here.
- **The dev handle idiom**: `window.__sersanSeqSingularity`, `__sersanSectionCuts`, `__sersanNeuralLattice_problem`. The journey gets `__sersanJourney_problem` / `_production` on the same shape (`{ params, state, uniforms }`).

### 3.3 What still has to be built

1. `journeyStore` — a tiny globalThis-pinned zustand store, exactly the `seqStore` shape and for exactly the `seqStore` reason (`seqStore.ts:62-67`: Turbopack may inline a separate copy of a small module into each chunk, splitting writers from readers). Fields per band: `{ active: boolean, p: number, stickyPx: number, beat: number }`.
2. `useJourneyStage(rootRef, bandId, beats)` — the shared hook: arm predicate, runway sizing, the sticky `<style>`, the one ScrollTrigger, the store writes, cleanup. One file, two consumers.
3. The **sticky-offset correction** in the two island families (§4.4). This is the one genuinely new piece of physics and it is 3 lines each.
4. The dolly rig group + its per-beat pose evaluation inside the islands.
5. The copy-beat mask swap (§11.1).

### 3.4 The one thing a sticky stage BREAKS, quantified

`useTextDrift` (`lusion-type.ts:617`) drives every `[data-drift]` block from a **cached document-space centre** vs the live viewport centre:

```
en.center = r.top + scrollY + r.height/2 - en.dy      // measured at register + on ST "refresh"  (:536-540)
dy = (1 - en.k) * (en.center - viewCenter) * DRIFT_SCALE   // per gsap.ticker frame  (:563)
DRIFT_SCALE = 0.12  (:147)
```

Inside a sticky stage the element does not move on screen, but `viewCenter` keeps advancing — so `dy` keeps growing and the drift **translates the copy right out of the pinned frame**. At the **binding D1 runway** (Act I: 6.10 vp total, stage 1.00 ⇒ travel 5.10 vp = 3672 px at 720; Act II travel 4.95 vp = 3564 px):

| block | `k` | `(1−k)` | `Δdy` across Act I | across Act II |
|---|---|---|---|---|
| display line | 0.5 | +0.5 | **+220.3 px** | +213.8 px |
| body | 1.5 | −0.5 | **−220.3 px** | −213.8 px |
| chapter desc | 1.25 | −0.25 | −110.2 px | −106.9 px |

The display line and its own body would separate by **440.6 px — 61 % of the 720 px stage**. This is not a tuning problem; it is a coordinate-system mismatch. (Full ruling, including why re-basing on beat progress is the wrong fix, in §0B.4-(3).)

Same class of breakage for `createReplayTrigger` (`lusion-type.ts:178-192`): `start:"top bottom" / end:"bottom top"` on a **row** element. Inside a pinned stage every row's rect is fixed on screen, so all rows enter the active range within one frame of the stage pinning and none leaves until it unpins — the per-row R1/B1 cascade (`ROLL_DUR` 1.25 s, body `+0.3 s`, `:115`, `:371`) collapses into a single simultaneous burst, and never replays.

**Both are solved the same way and it is the *reason* the journey is a redesign rather than a wrapper**: inside a journey stage the copy is no longer a scrolling ledger — it is **beat-triggered**. Beats fire the existing timelines by index (the timelines are already `paused: true`, `lusion-type.ts:360`, and already replayable). The drift driver must simply not be armed for blocks inside an armed stage. That is a gate, not a rewrite:

- `useTextDrift`: skip registration when the scope has an armed journey ancestor (`closest('[data-journey="on"]')`). One `if`.
- `useLedgerReveal`: when armed, replace `createReplayTrigger(row, tl)` with a `journeyStore.beat` edge → `tl.play(0)` / `tl.pause(0)`. The timelines, the splits, the ignition latch (`:310`) and the `onIgnite` ring bump (`production-grade-section.tsx:290-296`) are all unchanged.

Copy freeze is untouched by any of this — no string moves.

---

## PART 4 — THE SCROLL → POSE CONTRACT

### 4.1 Where journey progress comes from

**ScrollTrigger `scrub: true` on the runway root**, exactly like the four shipped stages. Not the raw `scrollStore.progress`, and not a hand-rolled rAF.

Reasons, in order:
1. It is the shipped grammar; four systems on this page already resolve against `lenis`'s scrollerProxy through ScrollTrigger, so the journey shares one clock with them by construction (`smooth-scroll-provider.tsx:222`: `ScrollTrigger.update()` and `setScroll(...)` fire from the **same** Lenis `scroll` handler — one source, every consumer).
2. `invalidateOnRefresh: true` + `onRefreshInit: measure` gives resize/font/measure survival for free.
3. `self.progress` is already normalised per span. A `scrollStore.progress` consumer would have to re-derive the span in progress space on every `measureVersion` bump — the `PostFXNodes` cut driver does exactly that (`PostFXNodes.tsx:1105-1128`) and it is 25 lines of remapping we do not need to write twice.

The **islands** must not subscribe to ScrollTrigger (they are inside `<Canvas>`; the commit-wedge rule). The DOM hook writes `journeyStore` in `onUpdate`; the islands read it with `getState()` in their existing `useFrame`. This is the `seqStore` ownership contract verbatim (`seqStore.ts:9-31`: the DOM owns the clock, the island consumes).

### 4.2 Normalisation per span

```
runwayPx = vh + BEATS · BEAT_VH · vh          // measure(), px, re-derived on refreshInit
p        = self.progress ∈ [0,1]              // 0 when the stage pins, 1 when it unpins
beatF    = p · BEATS                          // fractional beat
beat     = min(BEATS−1, floor(beatF))
u        = beatF − beat                       // 0..1 within the beat
```

This is `services-section.tsx:841-842` character for character. Use it; do not invent a second beat arithmetic.

`BEAT_VH` should be the house value. The two shipped runways bracket it: fit `0.70`, services `0.85`. **Take 0.80** and put it in the journey config as a live-tunable.

### 4.3 Resize / re-measure survival

- Runway height is written in **px from the live `vh`** inside `measure()` and re-run on `onRefreshInit` — a font swap can never change document height (the explicit reason quoted at `services-section.tsx:23` and `fit-section.tsx:750-751`).
- `snapToProgress(st.progress)` at creation covers a reload that restores a scroll position mid-runway — no fly-in from origin (`services-section.tsx:927`). The journey needs the same init snap.
- The **section-bus** re-measures on mount + `t+700ms` + `t+1600ms` + `fonts.ready` + resize(150 ms) + a `ResizeObserver` on body + the `sersan:remeasure` event (`section-bus.tsx:87-115`). The runway change propagates to the signature curve, `DriftParticles`' `worldLen`, and the cut boundaries automatically. Nothing to wire.
- **Coarse pointer**: measure in `svh`, not `vh` (trap D-7, `singularity-passage.tsx:180-185`).

### 4.4 THE STICKY-OFFSET CORRECTION (mandatory, or the islands de-register)

`NeuralLattice.tsx:360` and `CrystalCluster.tsx:437`:

```
const vpTop = rect.docTop - scrollY;
```

`rect.docTop` is cached at measure time (`NeuralLattice.tsx:271`: `r.top + window.scrollY`). That formula assumes the anchor is in **normal flow**. Under a sticky ancestor the anchor's rendered top stops tracking `scrollY`, so `vpTop` drifts upward at exactly the scroll rate and **the net slides out of the top of the frame while the DOM band stays pinned**. At the binding D1 runway the group is culled once `vpTop < −(ih + CULL_PAD) = −940 px`, i.e. after 940 of Act I's 3672 px of travel — **at `j = 0.256`, in the middle of P2, the thesis beat** — and it is visibly a quarter-stage too high by `j = 0.05`. This is the #1 breakage of the whole design and it is invisible in code review.

The correction, exact and allocation-free:

```
stickyPx = clamp(scrollY - stageTopDoc, 0, runwayPx - vh)
vpTop    = rect.docTop - scrollY + stickyPx
```

Derivation: sticky box with `top:0`, container top `T`, container height `H`. Anchor at internal offset `δ`. Rendered viewport-top while stuck = `δ`. The naive formula gives `T + δ − scrollY`. The difference is `scrollY − T`, clamped to `[0, H − vh]`. ✔

Two subtleties that must be handled or the correction is wrong:
1. **The measure itself may run while stuck.** `SectionBus` and the island rect effect both run on `measureVersion` bumps, which can land at any scroll position. So the island must store `docTopUnstuck = r.top + scrollY − stickyPxAtMeasure`. The hook publishes `stageTopDoc` and `runwayPx` into `journeyStore` at measure time; the island subtracts.
2. `stickyPx` must come from the **store**, not from a per-frame `getBoundingClientRect` (handoff §4: no per-frame gBCR). `journeyStore.stickyPx` written by the DOM `onUpdate` is the right channel — but note it is written at ScrollTrigger cadence, which is the same Lenis tick that drives the frame. To be safe against a frame where `onUpdate` did not fire (a paused ticker), the island can recompute it itself from `window.scrollY` + the two published scalars: two subtractions and a clamp, zero reads.

`vpTop` is consumed by `cy` (`:362`), the cull test (`:364`), the arrival ramp `vis` (`:373`), and — in `CrystalCluster` — the tumble centring `a` (`:503`) and the callout projection (`:713`). **One correction fixes all of them**, which is why it is 3 lines and not 30.

### 4.5 Keyboard jumps, anchor jumps, teleports — the round-9 lesson, applied

Round 9's crossing detector missed keyboard jumps once. The fix that shipped is the right pattern and it is in this repo, at `PostFXNodes.tsx:1150-1177`:

> *"a `prevP/p` STRADDLE of any boundary, NOT an inside-window side latch: `(prevP ≥ cutᵢ) !== (p ≥ cutᵢ)` catches a slow scrub and a violent same-frame End/Home/anchor jump identically (either frame may sit outside every window)."*

**Rule for the journey: every beat edge is a STRADDLE test, never an "am I inside beat i" latch.** A `PageDown` (the snap engine's keyboard step, `scroll-snap.ts:206-230`, glides `0.85·ih`), a `#trust` anchor click (`footer.tsx:71` → `lenis.scrollTo(dest, { offset: -72 })`, `smooth-scroll-provider.tsx:245`), an `End` key, a scrollbar click-jump, or browser scroll restoration can all move `p` by more than one beat in a single frame. Contract:

1. Latch `prevP = NaN` on arm; the first frame after arming only latches, never fires (`PostFXNodes.tsx:1157-1158`).
2. On every frame with `p !== prevP`, scan all beat boundaries for a straddle. If **several** are crossed, fire **once**, for the boundary nearest the landing point, and **snap** the pose (no glide) — `services-section.tsx:915` calls this `onRefresh: snapToProgress`, the same idea.
3. Any beat whose visual state is a pure function of `p` needs no edge at all — prefer that shape. Only the **copy timelines** need edges (they are time-based `play(0)`), and their contract already handles being jumped over: `tl.pause(0)` on leave, `tl.play(0)` on enter, replayable (`lusion-type.ts:180-186`).

**Anchor landing.** `/#trust` currently lands via `lenis.scrollTo(dest, { offset: -72 })` against a section that also carries `scroll-mt-24` (96 px) — the double compensation flagged as open owner decision §7.5 (168 px low). With a journey runway the landing point becomes *journey progress ≈ 0*, i.e. the first frame of the stage, which is the correct and only sensible landing. **The 168 px error becomes visible** (it lands 168 px into a pinned stage, i.e. one-sixteenth of a beat in, with the stage already stuck and the first beat's entrance skipped). Recommend fixing the `offset` in the same round; it is one line and it is already approved-in-principle.

**Covert jump.** `singularity-passage.tsx:1651-1661` does `lenis.scrollTo(problemTopDoc, { immediate: true, force: true })` under total black, where `problemTopDoc = #problem` rect top (`:1345-1350`), and then `[data-emerge]` inside `#problem` plays a zoom-in from the tunnel vanishing point (`:1329`, `:1352-1358`). **`#problem [data-emerge]` must remain inside the first viewport of the journey stage**, or the plunge lands on an empty pinned frame. This is a hard composition constraint on the storyboard's beat 0.

### 4.6 What must NOT be done

- **No ScrollTrigger `pin:`** — breaks `[data-line-anchor]` (`singularity-passage.tsx:148-150`).
- **No `lenis.stop()` / input consumption.** The passage's one-shot does this, and it is the one beat the owner tolerates because it is a cinematic cut. A 3–5 beat reading journey that ate the wheel would be the "1s parking stop" complaint at ten times the scale.
- **No idle auto-centre.** igloo has one (1.4 s idle, 2 s `inOut3`) but only fires mid-*scene-boundary-wipe* — a state that is literally two half-rendered scenes (`round8-scroll-dossier.md` §3.3). Resting mid-beat in our stage is a perfectly readable frame. The justification does not transfer; §3.4.4 of that dossier already ruled it out.
- **Optional and defensible**: `snapPoint()` stations at the beat locks, exactly as services and fit already register (`services-section.tsx:934-938`, `fit-section.tsx:793-797`). Round 8-A explicitly *kept* the whisper-settle on pinned runways for the reason that a mid-pose park reads broken. A journey stage is a pinned runway. **Recommend registering them** — but surface it to the owner as a decision, because it is the mechanism he complained about, in the one place round 8 sanctioned it.

---

## PART 5 — RUNWAY COST (BINDING, per owner decision D1)

**The owner approved the full 27.4 % before a line was written.** The variants my earlier draft priced (3 / 4 / 5 beats) are **superseded**; this is the bill.

| act | beats | travel | + stage | runway | today | Δ |
|---|---|---|---|---|---|---|
| **Act I `#problem`** | 7 | 5.10 vp = 3672 px | 1.00 vp = 720 px | **6.10 vp = 4392 px** | 1330 px | **+3062** |
| **Act II `#trust`** | 7 | 4.95 vp = 3564 px | 1.00 vp = 720 px | **5.95 vp = 4284 px** | 1475 px | **+2809** |
| | | | | | | **+5871** |

**Home page 21459 → 27330 px (+27.4 %); 29.8 → 38.0 viewports.** The two neural sections become the tallest on the page, ahead of `#fit` (3941) and `#services` (3751). At a sustained ≈1500 px/s that is ≈3.9 s of additional scrolling across both acts.

Beat pitch: the storyboard budgets 0.40–0.90 vh and averages **0.73**, inside the house convention validated three times (`fit-section.tsx:196-197` `BEAT_VH 0.70`; `services-section.tsx:259` `SEGMENT_VH 0.85`; the passage's 380 vh over ~5 beats ≈ 0.76). Both `BEATS` and the per-beat pitch live in `journeyConfig` as one-line tunables — if the owner reports the copy beats feel rushed, the pitch is the lever (0.80 → 0.95 costs +864 px per act), never the sub-window split.

What a longer document touches, **all automatic**: the signature-curve waypoints (doc fractions, rebuilt on `measureVersion` — `SignatureLine.tsx:659-694`), `DriftParticles.worldLen` (`:196`, rebuilds on `anchors.version`), the cut-boundary remap (`PostFXNodes.tsx:1117-1126`, and see §0B.4-(d): the cut needs **no** retiming), every ScrollTrigger on the page. Nothing to wire; one thing to re-verify (risk R6).

**And here is the payoff, measured at the binding runway.** Across Act I the DOM holds still for 3672 px, during which `SignatureLine.tsx:787` descends the camera by `3672 × k = 57.1 world units` — **5.10 viewport-heights of world sweeping up through a frame whose copy is not moving**. `DriftParticles` spawns motes at `z ∈ [−4, +2]` (`:235`) ⇒ camera distances `[10, 16]` ⇒ a **1.6× near/far parallax ratio** between the fastest and slowest dust layers, at ~9 motes per world unit of strip (3000 motes over `21459 × k = 333.6` units) ⇒ **≈514 motes stream past in Act I, ≈498 in Act II**. The signature tube does the same. That is the "quasi un video" layer, and it requires **zero new code** — it is a consequence of pinning the DOM while the camera keeps reading `scrollY`. It is also, deliberately, the whole of Stage 1.

---

## PART 6 — FRAME ORDER

### 6.1 The R3F priority ledger, verified against the bundle

`@react-three/fiber@9.6.1`, `dist/events-f19bcc32.cjs.dev.js:1140-1163`:

```js
subscribe: (ref, priority, store) => {
  internal.priority = internal.priority + (priority > 0 ? 1 : 0);
  internal.subscribers.push({ ref, priority, store });
  internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority);
  ...
}
```

`Array.prototype.sort` is **stable** (ES2019+), so within a priority the order is **insertion order**. `useFrame` subscribes in `useIsomorphicLayoutEffect` (`:1255`), and layout effects run child-first / siblings in tree order ⇒ **insertion order = JSX mount order inside `<Canvas>`**. That is the invariant the whole scene graph is built on, and it is why nine separate island headers say *"MUST stay mounted AFTER SignatureLine"* (`Scene.tsx:470-473`, `:517-520`, and siblings).

Measured priorities (grep of every island's `useFrame` call):

| # | subscriber | priority | writes | reads camera |
|---|---|---|---|---|
| 1 | `FrameDriver` | 0 | `pumpLenis(now)`, `updatePointer(delta)` | — |
| 2 | `AdaptiveResolution` | 0 | dpr | — |
| 3 | `PipelineWarmup` | 0 | warm flags | — |
| 4 | **`SignatureLine`** | **0** | **camera.position / quaternion / fov**, `sectionStore.pulse`, `textMorphStore.camDescend/camRoll` | writes |
| 5 | `DriftParticles` | 0 | uniforms | world-anchored |
| 6 | `HeroLogo`, `HeroTextParticles`, `GatewayPortal` | 0 | groups | yes |
| 7 | `FeaturedWorkPlanes` | 0 | mesh pose | yes |
| 8 | `FounderPortraitMorph` | 0 | group pose | yes |
| 9 | **`NeuralLattice` ×2** | **0** | group pose, uniforms | yes |
| 10 | **`CrystalCluster` ×2** | **0** | group pose, uniforms, **CSS vars on the DOM anchor** | yes |
| 11 | `HomeSingularity` / `SequenceSingularity` / `AuditSingularity` / `ResourcePreviewPlane` | 0 | group pose | yes |
| 12 | `PerfProbe` | 0 | perfStore | — |
| — | **`PostFXNodes`** | **1** (`:1047` → `}, 1)` at `:1330`) | **`post.render()`** — suppresses R3F's default render | reads |

Critical detail from the same bundle at `:16085`: `if (!state.internal.priority && state.gl.render) state.gl.render(...)`. Any positive priority hands rendering to the subscriber — which is why `PostFXNodes` is at 1 and `PerfProbe` is deliberately at 0 (`PerfProbe` header).

### 6.2 The journey's frame order

**The journey adds NO new `useFrame`.** The dolly rig is evaluated inside the *existing* `useFrame` of `NeuralLattice` and `CrystalCluster`, at the top of the placement block. The pose source is `journeyStore.getState()` — a plain object read, no subscription.

Per frame, on the home route with a band on screen:

```
p0 #1  FrameDriver        pumpLenis  → Lenis advances → its "scroll" handler already ran
                                       this tick and wrote scrollStore + ScrollTrigger.update()
                                       ⇒ journeyStore.p is CURRENT before any island reads it
p0 #4  SignatureLine      writes the camera (unchanged)
p0 #9  NeuralLattice      reads journeyStore.getState() → dolly/lateral/rot
                          reads camera.position/quaternion (settled at #4)
                          writes group.position/quaternion/scale + rig.position/rotation
p0 #10 CrystalCluster     same, + the callout CSS-var projection
p1     PostFXNodes        post.render()
```

**Why readers see a settled camera:** the ordering is the *existing* one, unchanged — the journey does not move any subscriber. The only new intra-frame dependency is `journeyStore`, which is written by GSAP's ticker (ScrollTrigger `onUpdate`), and GSAP's ticker and R3F's rAF are two separate callbacks. Two ordering cases:

1. GSAP ticker fires **before** R3F's rAF this frame ⇒ islands read this frame's `p`. Ideal.
2. GSAP ticker fires **after** ⇒ islands read last frame's `p` (≤16.7 ms stale). At a hard flick of 3000 px/s that is 50 px of stage travel = 1.7 % of one beat. **Imperceptible, and — decisively — it is the SAME staleness every other scrub-driven island already lives with**, including the passage's `seqStore` → `SignatureLine.seqPan` chain (`SignatureLine.tsx:900-1101`), which has shipped for two rounds.

Do **not** try to fix this by writing `journeyStore` from a `useFrame`. That would put a second clock on the beat and re-open the exact class of bug the `seqStore` ownership contract exists to prevent (`seqStore.ts:9-31`).

**Zero per-frame allocation:** the dolly rig writes into a hoisted `THREE.Vector3` scratch (the islands already have `scratch = useRef(new THREE.Vector3())` at `NeuralLattice.tsx:307` / `CrystalCluster.tsx`), and the beat pose is evaluated into three hoisted numbers. No `getBoundingClientRect` is added anywhere — `stickyPx` is arithmetic on two published scalars.

---

## PART 7 — BUDGET

The binding walls from handoff §4, checked against the actual source.

### 7.1 UBO block count — the hard wall

`neuralFieldCompute.ts:952-975` (read it before touching anything):

> *"GLSLNodeBuilder emits ONE UBO per `uniformArray` … the particle material's VERTEX stage references nine of them: `uNodePos`, `uNodeT`, `uEdgeA`, `uEdgeB`, `uRingGlow`, `uRingFlash`, `uRowGlow`, `uStrandPhase`, `uStrandThick`. On top of those sit three's own shared groups (object / render / frame). That is 9 + up to 3 = **12 against the WebGL2 `MAX_VERTEX_UNIFORM_BLOCKS` guaranteed minimum of 12** — the fallback backend is AT the floor with ZERO headroom … A tenth `uniformArray` can fail to link on a minimum-spec WebGL2 device."*

The link-line material is a **separate program** at **8 of 12** (`:2546-2559`), with 4 spare.

**Does the journey add a uniform block? NO. It removes zero and adds zero.**

- The dolly rig is a **scene-graph transform**, not a uniform. `modelViewMatrix` in `buildVertex` (`:2203`) already carries it — the vertex stage needs no new input at all.
- The copy-beat mask swap (§11.1) **retires** the plain scalar `uCopyEdge` and **introduces** the plain scalar `uCopyBeat`. Both are `uniform()` scalars, which join an existing shared group and add no block — stated explicitly at `:1038` (*"and the 12/12 particle-material budget noted above is unmoved. `uCopyEdge` is …"*) and at `:2560-2568` for the line material's shared-group scalars. **Net block delta: 0.**
- No new storage buffer, no new compute pass. The 4-storage-buffer / 8-slot budget documented in `gpgpuNodeSim.ts` is untouched, exactly as `:970-971` requires.
- Varyings: unchanged. The line material stays at 4 of the `MAX_VARYING_VECTORS` floor of 15 (`:2564-2568`).

### 7.2 Cross-backend TSL

Nothing new is needed. The dolly is CPU-side `THREE.Group` writes. If the storyboard asks for a beat-driven *look* change, it must use only the op set already proven in `PostFXNodes.tsx` / `neuralFieldCompute.ts` — `Fn`, `select`, `mix`, `smoothstep`, `uniform`, `uniformArray().element()`, `If` on uniform control flow. Note `neuralFieldCompute.ts:79-80`: `.element()` on a **storage** buffer is compute-stage-only (three #31221); `uniformArray().element()` is legal in any stage. Do not cross that line.

### 7.3 Fill / vertex cost of the dolly

The dolly makes the net **bigger on screen**, and the particle layer is fill-bound (`sizeNode ∝ 1/dist`, `:2211`). At the "fill viewport" pose (`d = 10.317`) sprite area scales by `(12/10.317)² = 1.35×`. At the "2× viewport" pose (`d = 5.159`) it is `(12/5.159)² = 5.41×` — a **5.4× fill multiplier on ~9000 particles**. That is the real budget risk of this design, and it is a genuine one.

Mitigations, in order of preference:
1. **`AdaptiveResolution` already owns framerate** (`Scene.tsx:400`) and adapts DPR within `[dprMin, dprMax]`. The dolly's cost lands on exactly the lever it pulls.
2. Cap the dolly. A beat that reaches `d = 10.3` (viewport-filling, 1.35× fill) is already a strong travel; `d < 7` should be a deliberate, measured choice, not a default.
3. The far half of the cloud is *shrinking* while the near half grows, so the aggregate is well below the worst-case node's multiplier. **This needs a live measurement** (`?perf=1`, `PerfProbe`) before the dolly maximum is baked — flagged in §12.

---

## PART 8 — DEGRADATION

Every path below already has a precedent in `singularity-passage.tsx`'s FALLBACK MATRIX (`:159-197`); copy it.

| condition | behaviour |
|---|---|
| **SSR / no JS** | The runway height and the sticky rule are **JS-applied inside the armed context** (`data-journey="on"` + `root.style.height`). Without JS neither exists ⇒ the section renders exactly as today: normal flow, copy settled and visible, hairlines full-width. **No primed-hidden poses in any className** — D-10 holds because it holds today (`problem-section.tsx:496-500`: the hidden hairline pose is GSAP-only). |
| **`prefers-reduced-motion`** | `CanvasHost.tsx:35` renders **nothing** at tier "off" ⇒ no islands ⇒ no journey. The arm predicate must include `(prefers-reduced-motion: no-preference)` as a matchMedia **condition** (so a runtime toggle reverts the context — `singularity-passage.tsx:2352` `revertOnUpdate`), leaving normal flow. Zero timers, zero transforms. |
| **tier "off" but motion-ok** (no WebGL, rare) | `useNeuralLatticeFallback()` returns true (`use-neural-lattice-fallback.ts:44-48`) ⇒ the SVG `NeuralGraphFallback` paints (`problem-section.tsx:394-399`). The journey must **not arm**: a pinned stage with a static SVG in it is a dead 4-viewport hole. **Arm predicate: `!showFallback && motionOk`.** These two must stay complements, same discipline as the lattice mount gate (`use-neural-lattice-fallback.ts:26-30`: *"If the two ever ship out of step…"*). |
| **lite / capable phone** (`fxBudget.level === 2`) | The island **does** mount here (`Scene.tsx:509`, `island = level >= 2`). Arm the journey with a reduced beat count and measure in **`svh`**, never `vh` (D-7). The storyboard recommends **5 + 5 at a 0.60 pitch** (Act I 5.0 vp = 4220 px @844) against a 3-beat cut; that is **owner decision J-9, still open** — do not decide it here. Mechanically both are one config line. Two phone-specific constraints are *not* optional: the reseeded cloud must use the portrait aspect bucket (§0B.4-2 — at 2.16 the shipped `BAND_ASPECT` is 4.8× wrong), and `FOG_RADIUS_Y 0.46` must be re-derived against the stage or the fog reaches the frame edges (the "blocchi pagina" failure mode). |
| **weak phone / narrow desktop** (`level ≤ 1`) | `showFallback` is true ⇒ not armed ⇒ today's layout, unchanged. |
| **WebGL2 fallback backend** | `NeuralLattice` skips `build.compute()` and renders the analytic still-but-igniting field (`:427-428` per the header); `CrystalCluster` is a plain node material with no compute at all (header `TIERS`). Both accept the dolly identically — it is a scene-graph transform. **Note `MARK_RT_WEBGL2 = false`** (`crystalConfig.ts:1160`) and open decision §7.7: `?backend=webgl2` currently never initialises. The journey does not depend on the mark RT, so it is not blocked by that bug — but the QA gate cannot be run on WebGL2 until it is fixed. |
| **Focus inside the pinned stage** | `focusin` handler zeroes `stage.scrollLeft/scrollTop` before anything reads layout (`services-section.tsx:958-961`). Mandatory: the ledger rows are `tabIndex={0}` (`problem-section.tsx:439`). |
| **Overflow** | Measure the pinned copy against `100svh − header` and arm a scroll-inside-the-stage escape only when it genuinely overflows (`singularity-passage.tsx:257-275`). Never truncate. |
| **A11y tree** | Nothing in the band is ever `inert`/`aria-hidden` unless it is decorative. The `[data-lattice-anchor]` div is already `aria-hidden` + `pointer-events-none` (`problem-section.tsx:388-389`); the ledger rows stay in the tree and focusable at every beat. If a beat visually hides copy, the a11y state must **match** the visual and never lead it (`setPanelInteractive` grammar, contract clause 4 at `singularity-passage.tsx:257-266`). |

---

## PART 9 — FILE-BY-FILE CHANGE LIST

`A` = additive (new file / new block, nothing existing behaves differently when disarmed) · `S` = surgery on a shipped system.

| file | change | ~lines | A/S |
|---|---|---|---|
| `src/webgl/store/journeyStore.ts` | **NEW.** globalThis-pinned zustand, `seqStore` shape. Per band: `{ active, p, beat, u, stickyPx, stageTopDoc, runwayPx, copyBeat }`. Header documents the ownership contract (DOM owns the clock; islands consume via `getState()`). | ~90 | A |
| `src/components/fx/use-journey-stage.ts` | **NEW.** The shared hook: matchMedia arm predicate, `measure()` (runway px, `stageTopDoc`), `data-journey="on"`, the file-scoped `<style>` string, ONE `ScrollTrigger.create({start:"top top", end:"bottom bottom", scrub:true, invalidateOnRefresh:true, onRefreshInit:measure, onRefresh:snap, onUpdate})`, the straddle beat detector, the `focusin` net, the overflow measure, `snapPoint()` registration (owner decision), full cleanup. Modelled on `services-section.tsx:731-1000`. | ~280 | A |
| `src/webgl/neural/journeyConfig.ts` | **NEW.** The binding D1 beat tables (Act I 7 beats / 5.10 vp travel, Act II 7 / 4.95), the per-beat slide `e`, lateral, yaw, `copyBeat` and `shellCore` (165 → 122 → 88), the sub-window split (EXIT/TRAVEL/HANDOFF/HOLD), damping λs, the **apparent-height cap** for the stone (§11.3), the act `dprCap`, and the aspect buckets. All live-tunable through `__sersanJourney_*`. | ~160 | A |
| `src/webgl/NeuralLattice.tsx` | (1) sticky-offset correction at `:360`; (2) `docTopUnstuck` in the rect effect `:271`; (3) the `r`-scaled placement at `:374-379`; (4) **the group restructure of §0B.3** — `scale` moves off `groupRef` onto a new `scaleRef`, with `rigRef` (rigid translate + rotate, world units) between them, posed from `journeyStore`; (5) `uCopyBeat` write replacing the `uCopyEdge` publish effect `:296-299`; (6) delete the `[data-row-body]` measure `:279-290`; (7) aspect bucket into the build effect's deps `:198-243`. | ~95 | **S** |
| `src/webgl/CrystalCluster.tsx` | Same (1)(3) at `:437`, `:487-494`; the rig (no restructure needed — the scale is already uniform at `:494`); the callout projection generalised to the journey depth at `:711-714` (§9.1); a beat gate on `group.visible`; **the mark RT forced to render at build, not on the visibility edge** (`:653-654`, risk R3b). | ~60 | **S** |
| `src/webgl/neural/neuralFieldCompute.ts` | Mask swap: `gate = smoothstep(uCopyEdge, +uCopySoft, x)` → `gate = 1 − uCopyBeat`; the `mix(FLOOR, 1, gate)·yTerm` shape and **both floors are unchanged**. Delete `uCopyEdge`/`uCopySoft`, add `uCopyBeat`. Same change in the link-line vertex stage. | ~35 | **S** |
| `src/webgl/neural/neuralLatticeConfig.ts` | Retire `COPY_EDGE_LOCAL`, `COPY_EDGE_PAD`, `COPY_RAMP_SOFT`, `copyEdgeFallback()` + the ~150-line derivation block `:1583-1760`. **Keep** `COPY_MASK_FLOOR` 1e-4, `COPY_MASK_FLOOR_LINE` 3e-3, `COPY_Y_FLOOR` 0.6, `COPY_Y_IN/OUT` — the AA ledger rides them. Replace the block with the beat derivation (§11.1). **Plus (§0B.4-2): `BAND_ASPECT` becomes a parameter of `buildPlexus`, `getPlexus(mode, density, aspectBucket)` with the bucket in its cache key `:365-375`; the same parameter reaches the crystal density well `:410`, the neighbour metric `:431` and the carve test `:445`.** Re-author the cloud's z spine to the storyboard's 2.10-stage-height corridor (`PLEXUS_RZ` demoted to node jitter). | ~−150 / +90 | **S** |
| `src/components/fx/neural-graph-fallback.tsx` | Consume the same aspect bucket as the island, or the SVG and the WebGL draw different graphs at the same viewport (§0B.4-2). | ~8 | **S** |
| `src/components/sections/problem-section.tsx` | Wrap the container in the journey root + stage; move `data-lattice-anchor="problem"` onto the stage; `useJourneyStage(...)`; **re-point `[data-emerge]` to the stage** so the passage's covert jump + zoom-in land on beat P0 (risk R5); gate the three ghost callouts to the stone beat; drive the dot-grid's `background-position` from the journey parameter (the igloo `k3` layer idiom, ~15× the field's parallax rate). **Zero copy strings touched.** | ~85 | **S** |
| `src/components/sections/production-grade-section.tsx` | Twin of the above. | ~55 | **S** |
| `src/components/fx/lusion-type.ts` | (a) `useTextDrift`: skip registration inside `[data-journey="on"]` (§3.4); (b) `useLedgerReveal`: when armed, drive `tl.play(0)/pause(0)` off `journeyStore.beat` instead of `createReplayTrigger`. Both behind an `armed` flag ⇒ every other consumer (`/audit`, `/consulting`, …) is byte-identical. | ~40 | **S** |
| `src/components/smooth-scroll-provider.tsx` | *(optional, pre-approved in principle)* anchor `offset: -72` vs `scroll-mt-24` double compensation, open decision §7.5. | 1 | **S** |
| `src/webgl/Scene.tsx` | **No change.** The island gate is unchanged. | 0 | — |
| `src/webgl/SignatureLine.tsx` | **No change.** | 0 | — |
| `src/app/globals.css` | **No change** — file-scoped `<style>` only (handoff §4). | 0 | — |

| `src/webgl/store/tierStore.ts` | **No change** — `setDprCap` already exists (`:597-598`) and is already consumed by `AdaptiveResolution` (`:52-56`). The journey calls it from the `bandST` edge. | 0 | — |

Rough total: **~700 new lines, ~330 changed, ~150 deleted.** The single largest *new* item is `use-journey-stage.ts`; the single riskiest *edit* is the `NeuralLattice` group restructure (§0B.3), which is small but load-bearing and should land in Stage 1 while nothing depends on it.

### 9.1 The callout projection, generalised (the one non-obvious edit)

`CrystalCluster.tsx:711-714` today:

```ts
const persp = CAMERA_Z / Math.max(CAMERA_Z - v.z * s, 1);
const ax = vw / 2 + ((cx - vw / 2) + v.x * pxScale) * persp - rectLeft;
const ay = ih / 2 - ((ih / 2 - cy) + v.y * pxScale) * persp - vpTop;
```

`CAMERA_Z` appears here as *the group's depth*, which stops being true under a dolly. Derivation in camera space, with `d = CAMERA_Z − dolly`, `X = (cx−vw/2)·k·(d/CAMERA_Z)`, `f = CAMERA_Z/k`:

```
screen_x_from_centre = f·(X + v.x·s) / (d − v.z·s)
                     = [ d·(cx−vw/2) + CAMERA_Z·v.x·(s/k) ] / (d − v.z·s)
```

and `s/k = rect.h·CRYSTAL_SCALE·scaleMul = pxScale` (unchanged). So:

```ts
const den  = Math.max(d - v.z * s, 1);
const ax   = vw / 2 + (d * (cx - vw / 2) + CAMERA_Z * v.x * pxScale) / den - rectLeft;
const ay   = ih / 2 - (d * (ih / 2 - cy) + CAMERA_Z * v.y * pxScale) / den - vpTop;
```

At `d = CAMERA_Z` this reduces **exactly** to the shipped expression (`den = CAMERA_Z − v.z·s`, numerator `= CAMERA_Z·[(cx−vw/2) + v.x·pxScale]`). ✔ Verified algebraically; the clamps at `:715-729` are unchanged.

`u.uCamDist0.value = camera.position.distanceTo(group.position)` (`:584`) needs **no change** — it is computed from real positions and follows the dolly for free.

---

## PART 10 — RISK REGISTER (ranked)

| # | risk | observable symptom | detection | rollback |
|---|---|---|---|---|
| **R1** | **Sticky-offset omitted or wrong** (§4.4, §0B.4-1) | The net and the stone slide up out of frame while the DOM band stays pinned; **culled entirely at `j = 0.256`, mid-P2**, and visibly a quarter-stage high by `j = 0.05` | `__sersanNeuralLattice_problem.project()` → the group's projected screen centre must be constant to 2 px at `j = 0.1 / 0.5 / 0.9` | Journey config `enabled:false` → the section reverts to normal flow (the arm predicate short-circuits). |
| **R2** | **Drift + replay-trigger breakage** (§3.4, §0B.4-3) | Copy blocks separate by **440.6 px = 61 % of the stage**; all rows animate at once and never replay | Screenshot at `j = 0.05` and `j = 0.95`; the display line and its body must keep their gap. `getComputedStyle(block).transform` must be identity when armed. | The `armed` gate in `lusion-type.ts` is one boolean; flip it and the stage runs with the ledger unarmed (visually wrong, not broken). |
| **R2b** | **Rig placed INSIDE the anisotropic group scale** (§0B.3) | The authored diagonal renders 1.76× too strong on desktop and 2.15× too weak on a phone, and the cloud's silhouette breathes wider/narrower as the yaw ramps | Measure the rendered yaw against the authored constant at `j = 1`: `atan(tan θ · wWorld/hWorld)` vs `θ`. A silhouette-width delta between `j = 0` and `j = 1` at zero dolly is the same tell. | The scale lives on one line; move it back and set the rig's rotation to 0 (the dolly still works — translation is unaffected). |
| **R3** | **Fill blow-out at the deep dolly poses** (§7.3, §0B.4-4b) | fps drop on the near-field beats; **worse — `AdaptiveResolution` hunts and each step reallocates the swapchain + PostFX RTs, i.e. a hitch inside a cinematic beat** | `?perf=1` + `PerfProbe` parked at each beat pose; watch `setDpr` transitions, not just fps | Assert a fixed `dprCap` for the whole act on the `bandST` edge (§0B.4-4c); then lower the dolly ceiling in `journeyConfig`. |
| **R3b** | **Mark RT renders on the first-sighting frame** (§0B.1, D3) | A one-shot 512² render + mipmap chain lands exactly on the P5/T5 sighting — a hitch on the beat that is supposed to be "a shape in the distance" | Frame-time trace across `j = 0.78 → 0.80`; or log the RT's first render tick | Force one RT render at build time / on the `bandST` arm edge. One line. |
| **R4** | **Beat edges missed on a keyboard/anchor jump** (§4.5) | Copy for a beat never plays, or plays for the wrong beat, after `PageDown` / `/#trust` / `End` / scroll restoration | Straddle-detector unit check in the dev handle: `__sersanJourney_problem.state.prevP`; drive `lenis.scrollTo` with 5 hard jumps and assert one fire each | The detector is one function; falling back to a per-frame "which beat am I in" recompute is visually correct and only loses the entrance timing. |
| **R5** | **Covert-jump landing lands on an empty pinned frame** (§4.5) | After the plunge the divario shows a black stage with no copy; the `[data-emerge]` zoom-in plays on nothing | Fire the passage one-shot; screenshot at EMERGE end | Move `[data-emerge]` back into beat 0's visible frame — a JSX nesting change, no logic. |
| **R6** | **Page height change destabilises a downstream measurement** | Signature-line curve deforms, cut boundaries land off-section, `#services` snap stations shift | `__sersanLineDebug.bboxY` + `__sersanSectionCuts.state.cuts` before/after; `__sersanSnap.candidates()` | Runway `BEATS` is one number; setting it to 0 restores today's height exactly. |
| **R7** | **Copy-mask swap regresses WCAG AA** (§11.1) | `--ink-mute` over the band drops below 4.5:1 on a copy beat | The arithmetic is unchanged (same floors) — but re-run the axe contrast pass at 1280 and 390 on a copy beat with the net at its brightest (surge head + hovered row) | Set `COPY_MASK_FLOOR`/`_LINE`/`COPY_Y_FLOOR` and `uCopyBeat` handling to the shipped `uCopyEdge` path — the two are the same formula with a different gate. |
| **R8** | **`SignatureLine` re-subscribes after its readers** | Every camera-locked island reads a one-frame-stale camera forever (a permanent sub-pixel lag on the whole HUD layer) | `__sersanLineDebug.camY` vs the island's `group.position` on a hard flick | Not caused by this work (`SignatureLine` is an unconditional child of `<Canvas>`), but it becomes reachable if anyone ever wraps it in a `<Suspense>`. Documented, not mitigated. |
| **R9** | **Coarse-pointer stage measured in `vh`** (D-7) | On a phone the stage and the runway jump when the address bar collapses, mid-thumb | Chrome device emulation cannot reproduce this; needs a real device or the `svh`/`lvh` computed-value check | Use `svh` from the start; the passage already proves it. |
| **R10** | **Two agents touching the same four files** | `tsc` noise from the concurrent `CRYSTAL_SCALE` and ghost-type edits | `npx tsc --noEmit` after both land, never during | N/A — sequencing, not code. |

---

## PART 11 — WHAT THIS DELETES OR SUPERSEDES

### 11.1 The round-9-B copy-column mask — retired, and the phone band comes back

The measurement in `neuralLatticeConfig.ts:1694-1725` is the reason this redesign exists. Verbatim table (broken/full, 103 nodes / 227 links; "@floor" = gate exactly 0):

| W | `uCopyEdge` | nodes @floor | links @floor | mean node mask |
|---|---|---|---|---|
| 390 | 0.4529 | **97 %** | **98 %** | **0.002** |
| 768 | 0.2912 | 84 % | 85 % | 0.066 |
| 1024 | 0.1334 | 78 % | 82 % | 0.125 |
| 1280 | 0.0637 | **70 %** | 74 % | 0.147 |
| 1440 | 0.0050 | 60 % | 65 % | 0.199 |
| 1920 | 0.0275 | 63 % | 68 % | 0.174 |

And the config's own verdict (`:1721-1725`): *"where the copy spans the band, 'dim everything left of the copy' means 'dim everything'. Fixing it needs a DIFFERENT instrument below ~1100 px (a global dim + the vertical term rather than an x gate, or a narrow-viewport cloud) — an owner call, not a constant tweak."*

**The journey IS that different instrument.** Because copy and net now occupy different *beats* rather than the same box, the x-gate is replaced by a beat-driven global dim:

```
today:    gate = smoothstep(uCopyEdge, uCopyEdge + uCopySoft, localX)
journey:  gate = 1 − uCopyBeat                       // 0..1, per beat, damped
          mask = mix(FLOOR, 1, gate) · yTerm         // UNCHANGED shape
```

Consequences, all favourable and all provable from numbers already in the repo:

- **On a travel beat** (`uCopyBeat = 0`): `mask = 1 · yTerm` ⇒ **the full round-8-I plexus returns at every viewport**, including 390 px where it is currently invisible. 100 % of the nodes and links, at every width.
- **On a copy beat** (`uCopyBeat = 1`): `mask = FLOOR · yTerm` — **numerically identical to today's floor**, which is exactly the value the shipped AA ledger was accepted on (`:1655-1683`): `ΔL_max = 0.01943`; brightest remaining pixel `6.5 × 10.67 × 1e-4 = 0.00694` ⇒ **5.38:1** conservative, **5.65:1** re-derived; pathological superposition (capped line + bead on a node centre) `0.0117` ⇒ **5.05:1**. All AA passes, unchanged, because the floors do not move.
- The **bloom onset** clause (`:1787-1800`, 69–103 px right of the copy edge at every desktop width) becomes vacuous rather than load-bearing: on a copy beat nothing in the band exceeds the ≈1.0 threshold, so the copy receives no smeared bloom light by construction.

**Retired code**: `COPY_EDGE_LOCAL` (`:1731`), `COPY_EDGE_PAD` (`:1779`), `COPY_RAMP_SOFT` (`:1806`), `copyEdgeFallback()` (`:1754-1762`), the `SectionRect.copyEdge` field and the `[data-row-body]` measure loop (`NeuralLattice.tsx:279-290`), the `uCopyEdge` publish effect (`:296-299`), and the ~150-line derivation block `:1583-1760`.
**Retained**: `COPY_MASK_FLOOR` 1e-4, `COPY_MASK_FLOOR_LINE` 3e-3, `COPY_Y_FLOOR` 0.6, `COPY_Y_IN` 0.18 / `COPY_Y_OUT` 0.46 — the AA ledger rides them and they carry over unmodified.

This closes open owner decision §7.3 ("the plexus over the copy — the journey may replace this entirely"). It does.

### 11.2 What the journey does NOT delete

- **`CrystalCluster`'s fog** and its `FOG_CLEAR` derivation. The fog serves the stone's silhouette, not the copy; keep it and re-fit against the new `CRYSTAL_SCALE`.
- **`PLEXUS_MASK_IN/OUT`** (`crystalPlexus.ts:59-60`, `:131-132`) — the stone's own halo plexus band gate, unrelated to copy.
- **`CRYSTAL_CLEAR_INNER/OUTER`** — the density well that keeps the cloud off the stone's silhouette (`neuralLatticeConfig.ts:411`). Still needed, arguably more so once the stone is smaller.
- **The section-cut PostFX band** (`__sersanSectionCuts`). It operates on `#problem`↔neighbour boundaries in *progress* space and re-derives on `measureVersion` (`PostFXNodes.tsx:1105-1126`). A longer runway narrows the window in progress space but keeps it at one viewport in px — correct by construction.
- **The dot-grid** and its edge-clean mask (`problem-section.tsx:390`). It rides the band and is now free to fill a full-viewport stage.
- **The snap engine.** Round 8-A deleted element snapping and kept the whisper on pinned runways (`round8-scroll-dossier.md` §4.2). The journey is a pinned runway; whether it registers stations is §4.6's owner decision.

### 11.3 The stone shrink — the two fixes CONVERGE, do not duplicate them

`CRYSTAL_SCALE` is a fraction of `rect.h`, so it expresses the stone's height as a fraction of **whatever box it is anchored to** — the 619 px letterbox today, the 720 px stage in the journey. Both in-flight targets are stated in that same unit, which is why they agree:

```
on-screen height fraction of the anchor  =  3.32 (slab units) × CRYSTAL_SCALE
  pre-shrink:            3.32 × 0.17    = 0.564  → 56 %  of the 619 px band = 349 px
  LANDED (working tree): 3.32 × 0.115   = 0.382  → 38.2 % of whatever the anchor is
  storyboard      34 %:  CRYSTAL_SCALE  = 0.34 / 3.32 = 0.1024
```

**The landed value and the storyboard differ by 12 %** — 275 px vs 244 px at the 720 px stage. That is a taste call, not a conflict, and it is *already resolved in the right direction*: because the constant is a fraction of `rect.h`, the shrink carries from the 619 px band to the 720 px stage with no re-derivation at all. **Two rules for whoever touches it next:** (i) nobody re-fits it against the old 619 px band — the anchor is changing under them; (ii) one owner for the constant, not two commits.

Journey-specific interactions:
- The **callout projection** (§9.1) is written in terms of `s` and `pxScale`, so it tracks whatever `CRYSTAL_SCALE` ends up being — no coupling.
- A smaller stone at a **deep dolly pose recovers apparent size from the perspective divide**, so "troppo grande" could return at the closest beat. **State the ceiling in `journeyConfig` as an apparent-height cap** (a `d_min` such that `stone_apparent ≤ 0.55 × viewport`), not as a raw dolly distance — same one-line clamp, immune to the constant changing again. The storyboard's own P6 numbers already respect it: 48 % at the approach peak, 34 % at the hold.
- **The mark loses 29 % of its screen height at the hold pose** (208 → 147 px) and is unchanged at the money shot (207 px). Full table and the reasoning in §0B.1 (D3); QA gate in §12 Stage 4.

---

## PART 12 — STAGED ROLLOUT

Each stage is independently shippable, independently visible to the owner in Chrome, and has a gate that is a screenshot or a number.

### Stage 1 — THE STAGE, EMPTY (no dolly, no beats)
`#problem` only. Add `journeyStore`, `use-journey-stage`, the sticky stage + the **binding 6.10 vp runway** (D1), the sticky-offset correction, the drift/replay gate, the group restructure of §0B.3 (rig above the scale — land it now, while nothing depends on it), and the act-wide `dprCap`. **The net and the stone do not move yet** — they simply hold frame while the world streams past them.

- **Why first**: it isolates R1 and R2, the two risks that can silently destroy the composition, in a change with no visual ambition of its own.
- **QA gate**: (i) park at `p = 0.1 / 0.5 / 0.9`; the projected screen centre of `__sersanNeuralLattice_problem`'s group must be constant to within 2 px (R1); (ii) the display line and its body keep their gap at `p = 0.05` and `p = 0.95` (R2); (iii) a video-frame capture across the stage shows the dust and the tube streaming upward at full speed — **this alone is the "quasi un video" beat and it is what to show the owner**; (iv) `npx tsc --noEmit` clean; (v) `#trust` and every other section byte-identical.
- **What the owner sees**: the copy stops scrolling; the world keeps moving behind it. If he does not like *that*, nothing after it matters.

### Stage 2 — THE DOLLY
Add the rig group + the beat table to `NeuralLattice` (`#problem` only). Beat 0 at `d = 12` (today's pose), one travel beat to `d ≈ 10.3` (net fills the viewport, 1.35× fill), diagonal lateral drift.

- **QA gate**: measured apparent height of the net at each beat matches `7428.3/d` px within 3 % (screenshot + pixel measure); `?perf=1` shows ≥ 55 fps at the deepest pose at DPR 1.5 on the QA machine; `AdaptiveResolution` does not floor DPR.
- **Rollback**: `journeyConfig.dolly.max = 0`.

### Stage 3 — THE COPY BEATS + THE MASK SWAP
Wire `journeyStore.beat` → the existing ledger timelines; swap `uCopyEdge` → `uCopyBeat`.

- **QA gate**: at 1280 and at 390, on a **travel** beat, count visible nodes — must be ~100 % (today: 30 % at 1280, ~0 % at 390); on a **copy** beat, axe contrast pass on `--ink-mute` with the net at its brightest (surge head over a hovered row) ≥ 4.5:1; each row's R1 roll + B1 wave plays complete, once, on its own beat, and replays on a reverse scrub.
- **This is the stage that closes owner decision §7.3** and the one with the biggest visible win on phones.

### Stage 4 — THE STONE
`CrystalCluster` joins the rig (dolly + the generalised callout projection); the meteorite gets its own beat (`"la pietra meteorite"`).

- **QA gate**: callout CSS vars land within 1 % of the projected anchors at every beat (compare `--callout-N-left/top` against a `?debug` overlay); the stone's apparent height never exceeds the cap from §11.3 (48 % at the approach peak, 34 % at the hold); the tumble deadzone still settles upright at the beat lock; **the mark measures ≥147 px tall at the hold pose and the owner confirms it still reads inside the ice** (the 29 % regression from §0B.1 — this is the one gate where a number is not enough, because `93bb31d` was an eye call); the mark RT's first render is timestamped at build, **not** at the sighting frame (risk R3b).

### Stage 5 — THE SECOND JOURNEY
Instantiate the same hook on `#trust` with the healthy beat table.

- **QA gate**: side-by-side screenshots of the two bands at matching beats — the grammar must read as one system; `/#trust` deep-link lands at `p ≈ 0` with beat 0's entrance intact; full-page height and Lighthouse mobile re-measured against the stage-1 baseline.

**Cold-restart discipline (trap §5.1) applies at every stage**: `preview_stop` → `preview_start`. HMR does not rebuild the WebGL island, and the owner has already lost a round to that.

---

## CAVEATS / NOT FOUND

- **Beat pitch is budgeted from the site's own convention, not from a reading-speed study.** The storyboard's 0.73 average sits between the two shipped runway pitches (fit 0.70, services 0.85). The owner's felt pacing is the only thing that can settle it; it is one live-tunable number.
- **The storyboard's closed-form `zWorld(j) = −1.55 + 2.00·j` and its per-beat z table disagree by a few hundredths** (the table is piecewise, running −1.55 → +0.20 over `j 0 → 0.905`, an effective slope of 1.93). **Take the per-beat table as authoritative** and derive the slide by interpolation within each beat; the closed form is a summary, not the spec. Flagged, not corrected — it belongs to the storyboard.
- **The reseeded cloud invalidates the round-9-B "@floor" COUNT tables**, though not the per-sprite value arithmetic. Once `BAND_ASPECT` becomes a parameter (§0B.4-2) and the cloud is authored to a 2.10-stage-height corridor, the node/link counts per viewport must be re-run before anyone quotes them again. The AA ledger (ΔL budget, the two floors, Rec709 post-blend luminance) is topology-independent and carries over unchanged.
- **The dolly's fill cost (§7.3, R3) has not been measured.** The 5.4× worst-case multiplier at `d = 5.16` is exact arithmetic on `sizeNode ∝ 1/dist`, but the *aggregate* effect across a cloud where half the nodes recede is not derivable on paper. `?perf=1` at each candidate pose is the measurement that settles it, and it must be run before the dolly ceiling is baked.
- **The GSAP-ticker vs R3F-rAF ordering (§6.2) was reasoned, not instrumented.** The conclusion (≤1 frame of staleness, identical to the shipped `seqStore` chain) is robust either way, but if a beat ever reads visibly late, the instrument is a frame counter written by both callbacks into `__sersanJourney_*.state`.
- **Anchor-rect measurement while stuck (§4.4, subtlety 1)** is the one place where I am reasoning about `getBoundingClientRect` behaviour on sticky descendants from spec rather than from a live check. The correction is written to be robust either way (it stores an unstuck baseline), but a two-minute live check — measure the anchor at `scrollY = stageTop − 100` and again at `stageTop + 1000` and compare `r.top + scrollY` — would confirm it before coding.
- **`?backend=webgl2` never initialises** (open decision §7.7 — a `forceWebGL` init hang, not a shader failure). The cross-backend claims in §7.2 are therefore *structural* (no new TSL ops, no new bindings) and could not be verified by running the fallback. They should be re-verified once that bug is fixed.
- **The `#work` / `#services` interlude (§1.2) is treated as "content the reader travels through", not as journey.** If the owner wants the two journeys to feel like one continuous flight, the honest next question is whether `#services`' own 440vh pinned runway becomes journey beat 3 — a much larger piece of work, and out of scope here.
- **Line numbers** are at HEAD `b546b08`. `CRYSTAL_SCALE`, `problem-section.tsx` and `production-grade-section.tsx` are being edited concurrently; their line numbers will drift by a few lines and the constant's value will change (§11.3 gives the conversion).

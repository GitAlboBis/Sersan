HEAD verified: `cc10138` (`git log -1`), not `24b8f30` as the brief states. `git diff --stat 24b8f30 HEAD` is one research doc, zero source files — every source line number below is valid. Repo root: `C:/Users/alber/Desktop/sersan-v2-main`. I re-verified the load-bearing lines myself this session; what I checked personally is marked ✔.

---

# PART 1 — CORRECTED FACT SHEET

## 1.1 Page composition & section identity

| # | Fact | Cite |
|---|---|---|
| 1 | Home order is authored as literal JSX; `#production` is the block at `:75-77`, directly after `#services` `:72-74`, and `#problem` is `:58-60` ✔ | `src/app/page.tsx:55-78` |
| 2 | Section identity is derived from DOM order automatically — `querySelectorAll("[data-line-anchor]")` pushed in document order | `src/components/section-bus.tsx:63-77` |
| 3 | The reorder itself is 3 moved lines; everything that breaks breaks downstream of that array | derived from 1+2 |
| 4 | Ordering principle in the doc comment ("proof lands by viewport ~5") is **already violated at HEAD** — `#work` starts at viewport 12.3 | `src/app/page.tsx:15-17`; measured map in brief |

## 1.2 Cut boundaries — CONFIRMED, byte-exact ✔

`src/webgl/store/sectionStore.ts:233-239` is exactly:
```
["problem","case-studies"], ["case-studies","services"],
["services","production"], ["production","founders"], ["fit","final-cta"]
```
`deriveCutBoundaries` requires literal adjacency and drops a non-adjacent pair with a bare `continue` — **no warning, no console, no type error** ✔ (`sectionStore.ts:270-271`). Under the reorder, **three of five pairs stop being adjacent and silently vanish**, taking the igloo seam-sweep wipe and the `.cut-tick` heading glitch with them (`src/webgl/PostFXNodes.tsx:1197-1199` → `fireCutTick`).

**This is a pre-existing latent defect at HEAD and this change is what fires it.**

## 1.3 Signature-line curve

- Waypoints are listed in document order with alternating `x` sign; `production` is `:51`, `case-studies` is `:48` ✔ | `src/webgl/curves/routeCurves.ts:42-60`
- Amplitude rule `|x| ≥ ~1.1` keeps turn-arounds off-screen ✔ | `routeCurves.ts:31-34`
- `SignatureLine.tsx:173-181` builds points in **list order**; `:194-196` floors `docF` to strictly increasing in 1e-4 steps ⇒ an out-of-order list yields a tube that doubles back up the page **and** a collapsed doc→arc LUT (lit head desyncs).
- Restoring the serpentine after the move needs **4 sign flips** (`production`, `case-studies`, `work-in-progress`, `services`) — **not** 5. `founders −1.2` already has the right sign. *(Refutation-corrected; I did not re-derive.)*
- **`SignatureLine.tsx` stays at ZERO lines changed** in every proposal below. Its one `production`-keyed consumer, BEAT 1 (`SignatureLine.tsx:1385-1395`, `prodTri = sectionProgress("production", …)`, bumped from `production-grade-section.tsx:129-132`), is **span-derived**, so it survives a reorder without an edit — but after the merge its ~×1.25 emissive lift fires **inside the neural passage** instead of after `#services`.

## 1.4 The traverse machinery — what generalises and what does not

| Fact | Cite |
|---|---|
| `export type TraverseBandId = "problem";` ✔ | `src/webgl/neural/traverseConfig.ts:67` |
| `bands: Record<TraverseBandId, TraverseBandConfig>` — the **only** compile-time guard; adding to the union forces the new band entry ✔ | `traverseConfig.ts:238` |
| `islands: TraverseIslandsConfig` is a **single global config, not per band** — one `extras` array of 4 seeds (3.71 / 23.09 / 41.53 / 68.27) ✔ | `traverseConfig.ts:240`, `:329-340` |
| `bands.problem = { dir:-1, angleDeg:23.61, gapVh:1.06, gapCount:4, bandVh:0.8597 }` ✔ | `traverseConfig.ts:271-299` |
| `setTraverseConfig`'s patch type hard-codes `problem?: …` and its body hard-codes `traverseConfig.bands.problem` — **widening `TraverseBandId` produces NO type error here**, so `tsc` passes while a second band is unreachable from the live dev handle ✔ | `traverseConfig.ts:376-391` |
| `MAX_TRAVERSE_ISLANDS = 4`, documented as "how many extra anchors `problem-section.tsx` authors" ✔ | `traverseConfig.ts:233-235` |
| The hook body is **already band-generic** (`bandId` is a parameter throughout) | `use-diagonal-traverse.ts:171,189,251,287,575`; header still says "`#problem` only" `:4` |
| `NeuralLattice.tsx:1334` — `const traversed = anchorId === "problem";` is a hard string literal gating the **extra-island ladder** only ✔ | `src/webgl/NeuralLattice.tsx:1334` |
| Islands look the band up by **lattice-anchor id**, not band id: `const band = bandId ?? anchorId` | `NeuralLattice.tsx:264`, `:1356`, `:564`; `CrystalCluster.tsx:480` ✔ |
| `#trust`'s anchor is named **`production`**, and Scene mounts `anchorId="production"` | `production-grade-section.tsx:464`; `src/webgl/Scene.tsx:509,511` |

### `fitTraverseLadder`'s `ok` has NO upper bound — CONFIRMED by direct read ✔

`traverseConfig.ts:225-229`:
```
const ok = tops.length > 0 && tops[0] <= 1.0 + 1e-6 &&
  tops[tops.length-1] >= runwayVh - bandVh - 1e-6 &&
  pitches.every(p => p > minPitch - 1e-6 && p <= maxPitch + 1e-6);
```
Only `>=`. The `minPitch` clamp at `:216` can force `tLast` **past** the section end, and that overhang returns `ok: true`, contradicting the doc at `:185` and the in-situ comment at `:213-215` ("reported rather than hidden (`ok`)"). **Second pre-existing defect this change fires.**

### The seam — invisible from above, UNGUARANTEED from below

- **Invisible from above (CONFIRMED):** `tailPin: true` puts Act I's last band **bottom** on the section's bottom edge (`traverseConfig.ts:310-312`); Act II's lead top is clamped `≤ 0.98 vh` (`:206`). Seam pitch ≈ 1.4597 vh vs `maxPitch` 1.8597 — **no hole**.
- **Nothing consumes raw `xScenePx` (CONFIRMED):** the only render-path reads are `NeuralLattice.tsx:589` and `CrystalCluster.tsx:487`, both immediately subtracting per-island arrival compensation under the shipped `compensate: true` ✔ (`CrystalCluster.tsx:486-497`). Copy runs on the per-block antiderivative (`traverse-rate.ts:49-52`, `A(y_c)=0`). **The `xScenePx` reset to 0 at the band boundary is arithmetically invisible.**
- **NOT safe from below (the refutation's D-3, and it stands):** `traverseConfig.ts:205-207` clamps `tFirst` only against `0.98` and against `bandY − maxPitch`. There is **no cross-section term** — `fitTraverseLadder` takes one `bandY`, one `runwayVh`. With `leadVh = 1.203` (`:332`), if Act II's measured `bandY < 1.203 vh` then `tFirst` goes negative, the lead band lands inside Act I, and the seam pitch drops below `minPitch` — breaking the "never three on frame" guarantee (`traverseConfig.ts:96`, `:182`) that the shaded-cost argument depends on (`NeuralLattice.tsx:1311-1319`). **`bandY` for `#trust` is UNMEASURED.**

## 1.5 `#services` really is a full second stage — CONFIRMED

Sticky pin `services-section.tsx:1319` (`sticky top-0 h-screen overflow-hidden`, comment `:1315-1316` "this IS the pin"); one ScrollTrigger `:909-923`; oversized stage `h-[140vh] w-[150vw]` `:1333-1336` on `quickTo` x/y plus a separate `scaleRef` wrapper `:1326-1331` with ±2.5° roll; **five snap points** `:934-939` (`SEGMENTS = 4` at `:257`). D2's stated reason for rejecting a persisting net is **verified true in code, not rhetorical**.

Also: `#work` already carries WebGL depth-parallax planes — `<FeaturedWorkPlanes />` gated at `Scene.tsx:439-441` (`(pathname === "/" || "/case-studies") && webgpu && tier === "full"`), synced to `[data-featured-media]` rects (`featured-work.tsx:24-26`). The interlude is **two occupied frames, not empty frame**.

## 1.6 What does NOT break (all confirmed)

- **Scroll snap:** `[data-snap]` and `ScrollSnapSections` are retired repo-wide (`src/lib/scroll-snap.ts:25-31`); neither act registers a snap point (`problem-section.tsx:437-440`, `production-grade-section.tsx:368-370`). Only coupling is a per-event 1100 ms `suspendSnap()` on `focusin` (`use-diagonal-traverse.ts:551`).
- **Audio:** pointer-delegated on `"a, button, [data-cursor]"` only; **no scroll- or section-keyed cue exists** (`src/components/fx/audio-triggers.tsx:33`).
- **SEO / structured data:** clean. Static Organization JSON-LD (`layout.tsx:202-260`), no `ItemList`/`position` (`page.tsx:41-42`), route-level sitemap.
- **Singularity passage:** unaffected — `#problem` stays third, its `docTop` unchanged (`singularity-passage.tsx:1345-1347`, `:1656-1660`).
- **ScrollTrigger ranges:** all element-relative; reorder is a `refresh()`, and `SectionBus`'s `ResizeObserver` on `document.body` re-measures (`section-bus.tsx:117-121`).
- **Hash links: eleven, not three** (finding's census was materially incomplete). `footer.tsx:59,60,69,71` · `src/app/start/start-client.tsx:217,225,233` · `service-detail.tsx:117,546` · `singularity-passage.tsx:2442` · `cinematic-system-scroll.tsx:730,1004`. All resolve by `id`, so nothing breaks — **but `/#trust` deep links from the footer and from `/start` would land at doc ~11491 instead of 19211, i.e. inside the merged passage mid-argument.** Owner-visible.

## 1.7 The `overflow` trap and the depth flip

- `#problem` deliberately uses `overflow-x: clip`, documented: `'hidden'` makes the section a scroll container, so tabbing to an off-frame row lets the browser set `scrollLeft` and shear the composition — "a bug this repo has already patched twice elsewhere" (`problem-section.tsx:283-291`, applied `:302-305`). `#trust` is `overflow-hidden` (`production-grade-section.tsx:377`). **Traversing `#trust` without converting to `clip` re-opens that bug.**
- `NeuralLattice.tsx:726-730`: `zWorld` flips branch the moment `tv` is non-null — i.e. **registering the band by itself changes `#trust`'s net depth**, before any CSS lands.
- **The band pin is not a no-op.** `traverseConfig.ts:42-61` records its own measured behaviour: "the pin re-bases the band; it does not preserve it… reproduces today's geometry ONLY on the 1280×720 reference" — `1440×900 641.7→773.7 (+20.6 %)`, `768×1024 515.5→880.3 (+70.8 %)`, `390×844 482.4→725.6 (+50.4 %)`. Applying `bandVh: 0.8597` to `#trust` authors a **scale change** there at every viewport.
- `deactivateTraverseBand` never deletes the band (`traverseStore.ts:131-140`) and the island caches it once (`NeuralLattice.tsx:562-566`), so after the first arm `tv` is permanently non-null. Pre-existing for `#problem`; the merge extends it to `#trust`.

## 1.8 The `#trust` crystal / callout chain — MISSED BY THE MERGE FILE LIST

`Scene.tsx:511` mounts `<CrystalCluster mode="healthy" anchorId="production" />`. `CrystalCluster.tsx:480` reads `bands[anchorId]` and `:488` reads `traverseConfig.bands[anchorId as TraverseBandId]` ✔ — so **registering a band named `production` makes the healthy stone traverse laterally**, and the band pin re-bases `rect.h`, which drives:
`CrystalCluster.tsx:560` (`s = rect.h * k * feelC.scale * scaleMul`) · `:769` (`pxScale = rect.h * …`) · `:780` (`offPct = (CALLOUT_LABEL_OFFSET_PX / rect.h) * 100`).
The file flags it in situ at `:552-559` ("ONE OF THE TWO LINES THAT MUST CHANGE WHEN THE §problem / §trust SECTIONS GROW"), and `crystalConfig.ts:386-416` is a written-out **PREPARED CHANGE** with the two-line fix (`s = ih * k * …`, `pxScale = ih * …`). `#trust` renders its own ghost callouts off that projection (`production-grade-section.tsx:478-499`).

## 1.9 The stone

| Fact | Cite | Status |
|---|---|---|
| `crystalMarkRT` renders the real SERSAN mark; gate is `markTexture != null && !broken && !lite` ✔ | `crystalBuild.ts:1309` | CONFIRMED |
| The mark is added into `trans` **before** `uBodyDarken` — it exists **only where ice is drawn** | `crystalBuild.ts:1462-1464`, `:1478-1480` | CONFIRMED |
| The overlap/ghosting warning ("never on the fractured build where shards genuinely overlap in screen space") is at **`crystalBuild.ts:1373-1381`**, NOT `:1436-1442` (that is the `halfNdc` NaN guard) | corrected cite | CORRECTED |
| RT path is WebGPU-only today: `MARK_RT_WEBGL2 = false` | `crystalConfig.ts:1751`; gate `CrystalCluster.tsx:278` | CONFIRMED |
| ⛔ **The fractured slab CANNOT CLOSE.** `spinAng … .add(aRand.z.mul(6.2832))` is a **constant** per-piece rotation about its own centroid, non-zero at t=0 and independent of `uGap` ✔ | `crystalBuild.ts:1133-1137` | CONFIRMED BY DIRECT READ |
| Measured rest rotations: 16.9° / 49.2° / 8.0° / 255.3° / 278.6° / 67.7° / 207.5° / 239.4°, plus `SHARD_SPIN = 0.15` giving ≤ ±5.56°/s permanent drift | `crystalConfig.ts:640` | unverified by me (binary parse) |
| The outward explode along each piece's own centroid **already ships** | `crystalBuild.ts:1140-1145` | CONFIRMED |
| 8 separable pieces, `_CENTR`/`_RAND`/`_FACET`, 1114 tris, volume-descending, pieces tile the intact slab exactly | `public/models/crystal-fractured.glb` | unverified by me; independently reproduced by two agents |
| Loader traps handled (lowercasing `crystalBuild.ts:628-635`, `:697-698`; pre-rotated custom vectors) | | CONFIRMED via refutation |
| `rect` is the **BAND**, pinned to the viewport (`--tv-band-h: calc(0.8597 * 100svh)`), **not** the 5595 px section | `use-diagonal-traverse.ts:199-209`; `problem-section.tsx:312-315` | **CORRECTED — the finding's whole window arithmetic was wrong** |
| Therefore `a = (vpTop + rect.h/2 − ih/2)/ih` ✔ spans **≈ ±0.93** (±1.16 with `CULL_PAD 220`), **not ±2.49** | `CrystalCluster.tsx:576`, `:207`, `:505-508`; corroborated by `CALLOUT_VIS_WINDOWS` a ∈ [−0.45,+0.55] `crystalConfig.ts:2143-2147` | CORRECTED |
| `lateralPx = +408.8·a` px @935 **survives** — the derivation cancels `rect.h` | `use-diagonal-traverse.ts:460`; `CrystalCluster.tsx:489-496` ✔ | CONFIRMED |
| Frozen read is `CrystalCluster.tsx:484` (not `:475`); `vpTop` `:499` (not `:497`) ✔ | | CORRECTED |
| Max enclosed mark scale is **0.921 at dy −0.50 = 55.5 %** of slab height, not 0.80/48 % — **within 5 points of the healthy stone's 60 %** | independent generalized-winding-number measurement | CORRECTED — **this reverses the Blender ask** |
| 46 of 468 mark vertices poke out at scale 1.0 / dy 0, worst at the top-centre bite | | CONFIRMED (reproduced) |
| Bloom threshold on `/` is exactly 1.0 | `routeFxStore.ts:64`, `PostFXNodes.tsx:247-256` | CONFIRMED |
| Linear Rec709: `#3BE1FF` = 0.6200 (×1.613 to bloom) · `#D8F4FF` = 0.8652 (×1.156) · `#886a3d` amber = 0.1588 | | CONFIRMED (two independent measurements agree) |
| The mark singleton does **NOT** feed the hero particle logo — `HeroLogo.tsx:290-294` uses its own `useGLTF.preload`; `loadMarkGeometry` has exactly one importer, `CrystalCluster.tsx:204` | `RouteHeroLogo.tsx:59-102` | CORRECTED |
| `renderOrder −3.5` is legal (numeric comparators), fog is `transparent/depthTest:false` at −4, crystal at −3, opaque pass runs before transparent | `three.webgpu.js:32720-32722`, `:32751-32753`, `:59491-59492`; `crystalFog.ts:203-209`; `crystalBuild.ts:1692-1697` | CONFIRMED |
| `build.restGap = FRACTURE_REST_GAP_AUTHORED = 0.55`, so a `open01` multiplier on `uGap` reaches **0.055 → 0.55**, never ~1.0 — the band-overflow risk as written is **inert** | `crystalConfig.ts:632`; `CrystalCluster.tsx:640-643`, `:656` | CORRECTED |
| The proposed window sits **entirely inside** all three `CALLOUT_VIS_WINDOWS`; the projection twin reads the gap live at `CrystalCluster.tsx:795`, so `m` runs 1.055→1.55 and every leader anchor moves 32 % **while the callouts are on screen** | `crystalConfig.ts:2143-2147`, `:1294-1297` | CORRECTED — bigger than "pins at the extremes" |
| The write-on-change CSS-var gate `CrystalCluster.tsx:849-868` would fire **every frame for up to 6 vars** across the window — the sanctioned rare `toFixed` becomes per-frame | `CrystalCluster.tsx:73-76` | CORRECTED — "zero per-frame allocation" is true of the shader, false of the driver |

## 1.10 The type layer

**Exactly three hover-driven behaviours exist inside the two acts**, plus one fallback-tier echo:

| # | What | Cite |
|---|---|---|
| #12 | Hv1 ignition wave — EFFECT chars `x 0→1.5em`, arrow `x 0→1.8em`; mirrored out | `lusion-type.ts:816-860`, driver `:868-893`; wired `problem-section.tsx:409-414` — **Act I only** |
| #13 | CSS ignition `.plrow__effect` amber `hsl(36 …)` + 2 drop-shadows, `.plrow__index` → accent — hover block at **`:255-263`** inside `@media (hover:hover) and (pointer:fine)` ✔ | `problem-section.tsx:232-263`; RM block `:264-275` ✔ |
| #14 | CSS ignition `.pgrow__claim` → `hsl(189 100% 96%)` + 2 accent drop-shadows — hover block `:298-307` | `production-grade-section.tsx:272-307`; RM block `:308-320` |
| #15 | `NeuralGraphFallback` stroke ×1.4, reads `neuralLatticeStore.hovered` | `neural-graph-fallback.tsx:269-289` |

Everything else in the two acts is already scroll-driven. Confirmed NOT present in either section: `data-split-reveal` (so `HeadingChoreographer` never fires there), `data-cursor` (so `CustomCursor` and `AudioTriggers` never fire — rows are `<article>`).

**`"02. No tracesNNNNoooo ttttrrrraaaa…"` is `RollLetters` at rest and is inert until scroll, never hover.** Per word: an `.sr-only` span with the real string (`roll-letters.tsx:87`) plus a clipped `aria-hidden` span whose every char becomes a column with **three absolutely-positioned copies at `top: k·100%`** (`:100-118`, `:110-117`), `decoys="self"` (`:75`). Clipped out of paint by `clip-path: inset(0)` (`:92`; escape variant `inset(0 -2em)` at `problem-section.tsx:656`). The roll that reveals them is a **scroll** trigger; the only hover touching those columns writes `x` only (`lusion-type.ts:820-829`).

### The keyed quantity for the conversion

`apply()` already computes, once per frame from ONE frozen `window.scrollY` ✔ (`use-diagonal-traverse.ts:412`), every block's `V̂` (`:424`) and already resolves a single winner with a proximity tie-break (`:435-444` — I read it at `:437-443`). **The winner's identity is thrown away; only its number reaches the store as `frame.laneWindow`** ✔ (`:469`). Publishing `frame.laneRow` costs no new read, no rect, no query — `Block.row` is already cached (`:330`).

Corrections that stand:
- **`IGNITE_V = 0.85` does not deliver its own justification.** `α = α_edge + (α_read − α_edge)·V̂` (`traverse-rate.ts:180-182`) with `alphaEdge 3.5` / `alphaReadDisplay 0.5` (`traverseConfig.ts:341,343` ✔) ⇒ at V̂=0.85, α = 0.95 = **1.9× the plateau rate**, opacity 0.85. Use **`IGNITE_V ≈ 1 − ε`** if the rule is "opaque and slowest".
- **Write `laneRow` OUTSIDE the `if (best && cfg.laneEnabled)` branch** ✔ (`:461`) — otherwise flipping `laneEnabled` (`traverseConfig.ts:349`) silently freezes ignition. Note the `else` at `:470-473` resets `laneWindow`/`laneHalfPx` and leaves `laneCenterPx` **stale** ✔.
- **Cache the row index on `Block` at construction** (`:312-333`, `row` at `:330`) — parsing `dataset.ledgerRow` inside the frame loop runs every frame, not on edges.

### `opWin` / `opTop` / `unitSpan` are DEAD CODE — CONFIRMED BY DIRECT GREP ✔

Declared `use-diagonal-traverse.ts:159-161`, documented at length `:109` and `:150-158` as "the round-11.5 legibility fix", `unitSpan` allocated `:304`, defaults assigned in the Block literal `:326-327`, `blk.unit` set `:331`. My grep returns **no other occurrence** — `measure()` never populates them and `apply()` never reads them: `:424` drives `x` from `blk.win` and `:430` drives opacity from the **same** `s`. **The per-unit opacity fix does not exist at runtime.** Whether staged or lost is unverified.

### The transparent-roll defect — real, re-quantified

Two independent arm points for one event: `createReplayTrigger`'s `start: "top bottom"` on the **row** (`lusion-type.ts:224`, `:507`) vs the opacity window's `e3` evaluated on the inner `[data-drift]` wrapper (`traverse-rate.ts:128`, `:140`; `windowAt` returns 0 for `y ≥ e3`, `:152-157`). At 1920×935 the display wrapper spends **≈152 px of scroll at opacity exactly 0** and ≈218 px before V̂=1 (the finding's "112 + 72" omitted the row's `lg:py-10`, `problem-section.tsx:618`). With `ROLL_DUR 1.25 s` + `rollDelay ≤ 0.125 s`: **entirely invisible below ≈110 px/s**, partially up to ≈159 px/s. A fast flick does **not** worsen transparency.

### Two BLOCKING gaps in the type-conversion plan

- **The `armed` gate.** `useDiagonalTraverse(sectionRef, "problem", !showFallback, language)` (`problem-section.tsx:431`) bails at `use-diagonal-traverse.ts:184` when `!armed`. `showFallback` is true on a stepped-down phone, **on a narrow fine-pointer desktop window**, and on the flag-OFF build (`use-neural-lattice-fallback.ts:16-24`, `:41-46`). On those clients `laneRow` never publishes, and `useCentreFocus` is inert under `(hover:hover) and (pointer:fine)` (`use-centre-focus.ts:121-124`) — so deleting the `:hover` block unconditionally leaves **`:focus-visible` as the sole trigger**. "Three redundant triggers → two" is false wherever `showFallback` is true.
- **`useLedgerReveal` / `useChapterReveal` are NOT gated on `!showFallback`** (`problem-section.tsx:422-423`; `production-grade-section.tsx:360-361`). Replacing `createReplayTrigger` with a V̂-armed source unconditionally would **delete every entrance animation on the fallback tier**.
- Also missing: **a teardown edge**. `useLedgerIgnition` fires `onResolvedChange(null)` on unmount deliberately (`use-ledger-ignition.ts:130-138`); the traverse teardown clears `x` and `opacity` only (`use-diagonal-traverse.ts:879-883`). An EN/IT toggle, runtime RM toggle or tier step-down would leave the last row permanently lit and shifted `+1.5em`.
- And **keyboard focus loses the wave**: there is exactly one `useIgnitionWave` callback (`use-ledger-ignition.ts:56,71-84`); moving it to the traverse leaves `onFocus` (`:173-182`) driving only `setHovered`.

## 1.11 Binding-architecture compliance

No proposal below touches `src/webgl/SignatureLine.tsx`. No new store subscription inside the Canvas (the only one is dev-gated at `NeuralLattice.tsx:1334-1342` ✔). No shader, no TSL, no new uniform block or storage buffer — the particle vertex stage stays at 12/12, and each island owns its own material (`NeuralLattice.tsx:1316-1319`). No `pin:`, no sticky, no snap (`[data-snap]` is retired repo-wide). Colours: amber `hsl(36 …)` and cyan `hsl(189 …)` / `#3BE1FF` only — **no violet** (aside: `custom-cursor.tsx:29` still *names* a const `VIOLET` whose value is blue `#2A7FFF`; pre-existing, untouched). Copy freeze intact — zero EN/IT string edits in any proposal.

## 1.12 Still unverified (nobody has measured these)

1. **`bandY` for `#trust`** — whether it clears `leadVh = 1.203 vh`. Decides whether the seam puts three bands on frame.
2. **Every lateral-run and growth number**, because they are all computed at `angleDeg = 23.61` — the angle ROUND12 §1b says the owner rejected.
3. **The 1920×935 doc map** was measured this session in Chrome, but nothing in the corpus was re-verified live after any proposed edit. No screenshot, no `npx tsc --noEmit` run.
4. **§3.4's "22.0 % traverse copy" figure** in the carry-through reading — sourceless.
5. The GLB binary measurements (piece table, enclosure scales) — reproduced independently by two agents, not by me.

---

# PART 2 — LA DOMANDA DEL MERGE (for `AskUserQuestion`)

**Header suggerito:** `Le due reti: una sola o due?`

**Testo introduttivo (da mostrare sopra le opzioni):**

> Hai chiesto di unire la seconda sezione della rete neurale alla prima, così che sia uno scroll continuo e unito. Prima di farlo: **questa scelta ribalta la decisione D2**, che tu stesso hai approvato due volte (`2026-08-22-round10-OWNER-DECISIONS.md:26-38`, riconfermata dopo il pivot a `:166`). D2 diceva: il mondo si chiude sul taglio Atto I e si riapre sul taglio Atto II, e la rete **non** persiste dietro `#work`/`#services`. La ragione non era estetica: `#services` è già un palcoscenico completo — ha il proprio pin sticky (`services-section.tsx:1319`), la propria telecamera con scala e rollio ±2.5° (`:1326-1339`) e **cinque punti di snap** (`:934-939`). Due palcoscenici che si contendono lo stesso fotogramma è il pasticcio che D2 voleva evitare, ed è verificato nel codice, non era retorica. Puoi ribaltarla — è una tua decisione — ma ribaltala sapendo perché era stata presa.

---

### OPZIONE A — **Unisci le due sezioni** (riordino della pagina)

Sposto `#trust` subito sotto `#problem`. Diventano un unico passaggio neurale continuo, e il taglio (`CUT_BOUNDARY_PAIRS`) tra i due sparisce: è proprio la sua assenza a fare l'unione. `#work` e `#services` restano dove sono ma **dopo** il passaggio, e diventano la prova che segue l'affermazione invece dell'intervallo che la interrompe.

```
 ord  sezione        rete neurale
 ---  -------------  ------------------
  1   #problem       ##### diagonale
  2   #trust         ##### diagonale
 ===  T A G L I O  ================
  3   #work          .   (piani parallax)
  4   #services      .   (palco sticky)
  5   #founders      .
```

**Costo onesto.** Morte e rinascita finiscono **in campo**: l'Atto I finisce col guscio che collassa a 0.85, l'Atto II riapre a 165 — sotto D2 la resurrezione avveniva dietro una tenda. Ma: (1) **l'intestazione speculare muore** — le due direzioni opposte a `dir −1` / `+1` su isole adiacenti producono uno slittamento visibile di **~818 px** nel viewport in cui si sovrappongono, quindi `dir` deve essere uniforme; (2) il salto di luminosità **88 → 165** diventa **+5.46 dB visibili**, mentre l'intervallo di 8.3 schermate lo nascondeva; (3) i deep-link `/#trust` dal footer e da `/start` atterrano **dentro** il passaggio, a metà argomentazione; (4) il salto "vedi i lavori" dall'hero scavalca l'intero passaggio neurale. Tre dei cinque tagli igloo vanno riscritti a mano, **e se non li riscrivo spariscono in silenzio** (`sectionStore.ts:270-271`).

---

### OPZIONE B — **Lascia com'è** (D2 resta in piedi)

Nessun riordino. Il mondo si chiude sul taglio `problem→case-studies` e si riapre su `services→production`. La continuità che chiedi la ottengo **dentro** ciascun atto, lavorando su ROUND12 §1a (una rete che si compone invece di cinque isole discrete) e §1b (la diagonale più orizzontale).

```
 ord  sezione        rete neurale
 ---  -------------  ------------------
  1   #problem       ##### diagonale
 ===  IL MONDO SI CHIUDE  ==========
  2   #work          .
  3   #services      .
 ===  IL MONDO RIAPRE  =============
  4   #trust         ##### diagonale
  5   #founders      .
```

**Costo onesto.** Continui a vedere **due reti** separate da 8.3 schermate, che è metà della lamentela che hai appena fatto. In compenso l'intestazione speculare sopravvive, il salto 88→165 resta nascosto, i deep-link restano corretti e non tocco nessun taglio. È l'opzione a rischio zero, ma non risponde alla richiesta.

---

### OPZIONE C — **La rete passa dietro tutto** (una sola inquadratura su quattro sezioni)

La rete non si ferma mai: attraversa anche `#work` e `#services`. È la lettura più letterale di "scroll continuo", ed è quella che D2 ha rifiutato esplicitamente.

```
 ord  sezione        rete neurale
 ---  -------------  ------------------
  1   #problem       ##### diagonale
  2   #work          #####  <- dietro la griglia
  3   #services      #####  <- dietro il palco
  4   #trust         ##### diagonale
  5   #founders      .
```

**Costo onesto.** È il più caro e il più rischioso: ~280-340 righe su 8 file **più la riscrittura di `fitTraverseLadder`**, che oggi sa gestire una sola banda primaria per blocco contenitore e strutturalmente non può gestirne due. Il passaggio diventa **16-20 schermate**, più di metà pagina in un'unica corsa. E c'è un dettaglio che ribalta l'argomento di D2 in peggio: la corsia di mascheratura è **completamente aperta** dove non c'è copy in traverse (`NeuralLattice.tsx:642-647`), e `[data-drift]` esiste solo nei due atti — quindi non sarebbero 8.3 schermate di rete *attenuata*, sarebbero **8.3 schermate di rete a piena intensità** dietro la griglia dei lavori e dietro le card dei servizi. In più `#work` ha già i suoi piani WebGL (`Scene.tsx:439-441`) e `#services` il suo palco sticky con cinque snap: due famiglie di isole e due telecamere sullo stesso fotogramma.

**La mia lettura della tua frase è A**, per tre ragioni: hai detto *"unire X **a** Y"*, che è adiacenza fisica; hai detto *"unito"*, che è di nuovo lo stesso verbo; e non hai mai nominato `#work` né `#services`. Se intendevi C, dimmelo esplicitamente.

---

# PART 3 — LA PIETRA

## In italiano, cosa vorrebbe dire concretamente "il meteorite si apre e dentro c'è il logo SERSAN"

Oggi il logo SERSAN esiste già dentro una pietra, ma è la **pietra sbagliata**: sta solo nella lastra intatta dell'Atto II, non nel meteorite fratturato dell'Atto I (`crystalBuild.ts:1309` — il ramo è attivo solo con `!broken && !lite`). E il modo in cui è fatto **non può funzionare su una pietra che si apre**: il logo non è un oggetto, è un termine aggiunto al colore del ghiaccio (`crystalBuild.ts:1462-1464`). Vive solo dove il ghiaccio viene disegnato. Se il meteorite si apre, nelle fessure non c'è nessun frammento da colorare, quindi lì il logo avrebbe **un buco esattamente al centro**. Il file stesso avverte che quel ramo non deve mai girare sulla build fratturata, dove le schegge si sovrappongono in schermo (`crystalBuild.ts:1373-1381`).

**Come si fa invece.** Il logo diventa una mesh vera — la stessa geometria da 552 triangoli già caricata e condivisa (`RouteHeroLogo.tsx:62-102`) — montata **dentro il gruppo bloccato sulla telecamera** (`CrystalCluster.tsx:1136`), non dentro la mesh che ruota. Deve stare nel gruppo perché la mesh fratturata ruzzola fino a 55° e a quel punto il logo è illeggibile; il gruppo invece copia la rotazione della telecamera ogni fotogramma (`CrystalCluster.tsx:566`), quindi il logo resta sempre dritto verso di te. Con `renderOrder −3.5` finisce tra la nebbia (−4) e il cristallo (−3).

**E qui c'è la parte elegante: il rivelamento è gratis.** Il ghiaccio ha opacità 0.94 (`crystalConfig.ts:1024`). Quando la pietra è chiusa, i frammenti davanti al logo lo lasciano passare al **6 %** — un bagliore debolissimo intrappolato nel ghiaccio. Dove una scheggia si è spostata, il logo si legge al **100 %**. Non serve toccare una riga di shader: è l'apertura stessa a fare il rivelamento. E la luce si controlla col contratto di bloom che già esiste — con la base a ~0.65 sul ciano `#3BE1FF` la luminanza sta a 0.40, ben sotto la soglia 1.0; a piena apertura ~2.0 arriva a 1.24, cioè **il logo emette bagliore solo al picco del rivelamento e mai altrove**. Nessun viola, l'ambra (tinta 36) resta riservata alla brace.

**Cosa guida l'apertura.** Lo stesso identico numero che già muove il testo e la rete: `a`, lo scalare di centratura dell'isola (`CrystalCluster.tsx:576`), calcolato dall'unica lettura congelata dello scroll (`use-diagonal-traverse.ts:412` → `CrystalCluster.tsx:484`). Nessun nuovo orologio, nessuna nuova misura, nessun `pin`, nessuno snap, nessuna sosta: la pagina non si ferma mai, è solo lo stato della pietra a essere una funzione di dove sei. Scorri indietro e si richiude. **Attenzione a un errore che era nella prima analisi:** la banda è ancorata all'altezza del viewport (`use-diagonal-traverse.ts:199-209`), non all'altezza della sezione, quindi `a` copre circa **±0.93**, non ±2.49 — la finestra di apertura va riscritta su quel numero, non su quello che avevo letto prima.

## ⛔ Il blocco duro, e va risolto prima di qualunque cosa

**Oggi il meteorite non si può chiudere.** In `crystalBuild.ts:1133-1137` ogni scheggia porta una rotazione **costante** attorno al proprio baricentro, `aRand.z × 2π`, che non dipende dal gap e non è zero a tempo zero: le otto schegge sono ruotate di 17°, 49°, 8°, 255°, 279°, 68°, 208°, 239° anche a gap 0. Più una deriva permanente fino a 5.6°/s. Quindi portare il gap a zero **non ricompone la lastra: produce un groviglio compenetrante**. (Conseguenza secondaria: anche il "ricompattarsi" al passaggio del mouse che c'è oggi non ha mai davvero ricompattato niente.) Correzione: una riga, zero uniform nuove — moltiplicare l'angolo di spin per lo scalare di apertura, così a pietra chiusa ogni pezzo è nell'orientamento in cui è stato tagliato e la partizione ricopre la lastra esattamente.

## Blender: NO

L'analisi corretta dice che al logo si può dare **scala 0.921 con offset verticale −0.50**, cioè **55.5 % dell'altezza della lastra**, restando completamente dentro il ghiaccio — a cinque punti dal 60 % della pietra sana. La prima stima (0.80 / 48 %, che rendeva necessario un ri-taglio in Blender) era conservativa dell'8-15 %. **Non serve aprire Blender.** Resta vero che a scala 1.0 e offset 0 il logo sbuca dal morso in cima (46 vertici su 468), quindi l'offset non è opzionale.

## Il bivio narrativo — seconda `AskUserQuestion`

**Header suggerito:** `Il logo: una volta o due?`

**Testo introduttivo:**
> Se il meteorite si apre e dentro c'è il logo, il momento di pagamento si sposta dall'Atto II all'Atto I — e l'Atto II resta con una ripetizione in mano. La decisione D3 (`OWNER-DECISIONS.md:40-50`) dice testualmente che *la lastra intatta dell'Atto II, col marchio leggibile nel ghiaccio, è la risposta, non il meteorite*, e il codice lo impone (`CrystalCluster.tsx:278`). Devi dirmi se il marchio compare due volte, o una sola — e in quale delle due pietre.

**Opzione A — Due volte, in due stati diversi**
```
   ATTO I            ATTO II
  meteorite          lastra
   /\_ _/\           +--------+
  |  S    |          |   S    |
   \/   \/           +--------+
  si apre:           sigillata:
  logo acceso        logo al 6%
  bloom al picco     nel ghiaccio
```
Costo: zero meccanismi nuovi, esistono già entrambi. Rischio: la seconda apparizione legge come ripetizione, a meno che i due stati restino nettamente distinti — e lo sono già (aperto + bloom contro sigillato + sotto-soglia). D3 resta in piedi.

**Opzione B — Una volta sola, nell'Atto I**
```
   ATTO I            ATTO II
  meteorite          lastra
   /\_ _/\           +--------+
  |  S    |          |        |
   \/   \/           +--------+
  si apre:           nessun logo:
  logo acceso        solo plexus
  bloom al picco     e nebbia
```
Costo: un gate da invertire. **Ribalta la seconda metà di D3.** L'Atto II tiene la lastra come "la risposta" ma senza marchio.

**Opzione C — D3 alla lettera: il meteorite si apre sulla brace**
```
   ATTO I            ATTO II
  meteorite          lastra
   /\_ _/\           +--------+
  |  ~~~  |          |   S    |
   \/   \/           +--------+
  si apre:           sigillata:
  brace ambra        logo al 6%
  nessun logo        nel ghiaccio
```
Costo: zero lavoro, zero rischio — la brace ambra esiste già (`crystalBuild.ts:1487-1522`). Ma **non risponde a "dentro c'è il logo SERSAN"**.

*(Esiste una quarta strada — abilitare il percorso RT anche sulla build fratturata, così ogni scheggia mostra solo il pezzo di logo che copre: il marchio appare **lacerato** nell'Atto I e **intero** nell'Atto II. È quasi gratis e narrativamente la rima più forte, ma **non mette un oggetto luminoso dentro l'apertura** e porta con sé il rischio di sdoppiamento che il codice stesso segnala a `crystalBuild.ts:1373-1381`. La cito solo se le tre sopra non lo convincono.)*

---

# PART 4 — IL TIPO

## 4.1 Tabella di conversione

| Cosa cambia | Da (oggi) | A (dopo) | Quantità chiave | File |
|---|---|---|---|---|
| **#12 Onda di ignizione Hv1** (EFFECT `x 0→1.5em`, freccia `0→1.8em`) | `pointerenter/leave` via `useLedgerIgnition` (`problem-section.tsx:409-414`) | fronte di `frame.laneRow` dal traverse | `laneRow` = indice del blocco che vince già il confronto `bestV`/`bestU` (`use-diagonal-traverse.ts:437-443`) | `use-diagonal-traverse.ts`, `problem-section.tsx` — **`lusion-type.ts:816-893` cambia di 0 righe** |
| **#13 CSS Atto I** `.plrow__effect` ambra + 2 drop-shadow, `.plrow__index` accento | `@media (hover:hover) and (pointer:fine) { .plrow:hover … }` (`problem-section.tsx:255-263`) ✔ | `.plrow[data-lit="true"] …` aggiunto al gruppo esistente `:246-254` | `frame.laneRow === i` | `problem-section.tsx` |
| **#14 CSS Atto II** `.pgrow__claim` ciano + 2 drop-shadow, `__label`/`__index` accento | `:298-307` | idem, `[data-lit="true"]` | idem, sulla banda dell'Atto II | `production-grade-section.tsx` |
| **#15 Eco fallback** (SVG stroke ×1.4) | `neuralLatticeStore.hovered` | **INVARIATO** — resta su hover | — | `neural-graph-fallback.tsx:269-289` |
| **Link WebGL `setHovered(surface, i)`** (bagliore anello / detriti) | hover | **INVARIATO** — resta su hover | — | `use-ledger-ignition.ts:80` |
| **Focus da tastiera** | `:focus-visible` + `onFocus` → onda | **INVARIATO**, e l'onda va ri-collegata anche al focus | — | `use-ledger-ignition.ts:173-182` |
| **`[data-focus]` su touch** | già guidato dallo scroll | **INVARIATO** | `use-centre-focus.ts:118-147` | — |
| **Ingresso del rullo di lettere** (R1, 1.25 s) | `ScrollTrigger start:"top bottom"` sulla **riga** (`lusion-type.ts:224,507`) | innescato quando `V̂` supera la soglia — **con fallback a `createReplayTrigger` se la sorgente non c'è** | stesso `V̂` che scrive l'opacità (`:424`, `:430`) | `lusion-type.ts` |

**Perché `data-lit` e non `data-focus`:** `data-focus` ha già un proprietario (`use-centre-focus.ts:92,130,139`) e due scrittori sullo stesso attributo litigano su touch.

## 4.2 In italiano — cosa cambia sullo schermo

Oggi, sulle tre righe del bilancio dei fallimenti (Atto I) e sulle tre righe degli artefatti (Atto II), il colore ambra, il bagliore attorno alle lettere e lo scivolamento laterale delle parole **si accendono solo se ci passi sopra col mouse**. Dopo la conversione si accendono **da soli, mentre scorri**: la riga che sta attraversando la fascia di lettura — la stessa che in quel momento è opaca al 100 % e si muove più lentamente — si illumina, e si spegne quando esce. È lo stesso comportamento che il sito ha **già oggi sul telefono**, dove la messa a fuoco al centro è guidata dallo scroll: la conversione porta il desktop dove il mobile è già.

Il numero che comanda non è nuovo: il traverse **calcola già** ogni fotogramma quale blocco vince, da un'unica lettura congelata dello scroll, e poi **butta via l'identità del vincitore** tenendone solo il valore. Basta pubblicarla. Nessun secondo orologio, nessuna misura in più, nessuna allocazione per fotogramma.

**Cose che potresti non aspettarti di perdere.** Primo: **la riga non risponderà più al mouse**. Se passi sopra la riga 2 mentre stai leggendo la riga 1, non succede niente — l'accensione la decide lo scroll, non il puntatore. È un cambio di grammatica, non un bug, ed è irreversibile a occhio: se ti aspetti che il mouse "risponda", questa conversione toglie proprio quello. Secondo: **il bagliore WebGL sotto il puntatore resta su hover** (l'anello e i detriti). Tu hai detto "le scritte", e un riflesso discreto sotto il mouse non è copy narrativo — ma significa che mouse e scroll comanderanno **cose diverse** sulla stessa riga, e vale la pena vederlo dal vivo prima di decidere. Terzo, e questo è tecnico ma visibile: **su una finestra desktop stretta**, su un telefono declassato e sulla build a flag spento il traverse non si arma affatto, quindi lì l'accensione da scroll **non esiste** e cancellare l'hover lascerebbe solo il focus da tastiera. Su quei client l'hover va **tenuto**. Quarto: se non aggiungo un fronte di spegnimento allo smontaggio, **cambiare lingua EN/IT lascia l'ultima riga accesa e spostata di 1.5em per sempre**.

Il testo non cambia di un byte, né in inglese né in italiano, e i lettori di schermo non se ne accorgono: `data-lit` è un attributo, il rullo tiene la stringa vera in `.sr-only` (`roll-letters.tsx:87`) e lo scrambler ripristina i nodi identici (`label-scrambler.tsx:138,155`).

---

# PART 5 — PIANO DI IMPLEMENTAZIONE UNICO

Absolute root: `C:/Users/alber/Desktop/sersan-v2-main/`

## Ordine imposto dalle dipendenze

**L'angolo viene prima di tutto.** ROUND12 §1b (`research/2026-08-24-ROUND12-HANDOFF.md:73-89`) dice che 23.61° gli legge come uno scroll normale e vuole una diagonale nettamente più orizzontale, e §1a (`:35-44`) dice che le cinque isole discrete **sono** la lettura "3 pezzi". **Ogni numero di crescita e di corsa laterale del merge è calcolato a 23.61°**, quindi ogni cifra di dimensionamento va ricalcolata dopo che l'angolo è fissato. E **il merge non va costruito come una seconda scala di isole fissate**: raddoppierebbe da ~5 a ~9-10 il difetto che §1a uccide. Il conteggio delle bande è a valle di qualunque cosa sostituisca la scala.

---

### STEP 0 — Le due difese silenziose (indipendente, fallo per primo)

**File:** `src/webgl/store/sectionStore.ts` · `src/webgl/neural/traverseConfig.ts`

Aggiungi un `console.warn` in dev su `deriveCutBoundaries`'s `continue` (`sectionStore.ts:270-271` ✔) e un limite superiore a `ok` in `fitTraverseLadder` (`traverseConfig.ts:225-229` ✔ — oggi testa solo `>=`, mentre `:185` e `:213-215` dichiarano il contrario).

- **Gate:** `npx tsc --noEmit` pulito; caricare la home in dev e verificare **zero** warning di adiacenza a HEAD (se ne compare uno, è già rotto oggi).
- **Rollback:** rimuovere le due guardie; sono additive.
- **Parallelo:** sì, con tutto.

---

### STEP 1 — L'angolo (§1b) — **GATE PROPRIETARIO, blocca il merge**

**File:** `src/webgl/neural/traverseConfig.ts:273` (`angleDeg`)

Non è un'implementazione, è una sessione di taratura dal vivo con `__sersanTraverse_problem.set({ angleDeg: … })`. Nota però che **il dev handle è raggiungibile solo per `problem`**: `setTraverseConfig` ha la chiave hard-coded (`traverseConfig.ts:376-391` ✔). Se aggiungi una seconda banda senza generalizzare il patch, **non potrai tararla dal vivo e `tsc` non te lo dirà**.

- **Gate:** l'occhio del proprietario in Chrome, a 1920×935 e su mobile.
- **Rollback:** `angleDeg` è un solo numero.
- **Parallelo:** blocca STEP 3 e 4. **Non** blocca STEP 2, 5, 6, 7.

---

### STEP 2 — La pietra: correggi il blocco della chiusura (indipendente)

**File:** `src/webgl/neural/crystalBuild.ts:1133-1137`

Moltiplica `spinAng` per lo scalare di apertura (`uGap · 1/restGap`), così a gap 0 ogni pezzo torna nell'orientamento in cui è stato tagliato.

- **Gate:** in Chrome, con `__sersan…` forzare gap → 0 e vedere **una lastra unica, non un groviglio**. La sagoma deve coincidere con `crystal-intact.glb`. Verificare anche che il "ricompattarsi" su hover (`CrystalCluster.tsx:640-643`) adesso ricompatti davvero.
- **Rollback:** una riga.
- **Parallelo:** sì — file disgiunto da tutto il resto.
- **Nota:** tenere `OPEN_CLOSED ≈ 0.10` (gap mai esattamente 0) evita lo z-fighting sui piani di taglio interni coincidenti.

---

### STEP 3 — Il merge, riga per riga (dopo STEP 1) — **solo se il proprietario sceglie A**

1. `src/app/page.tsx` — sposta `:75-77` dopo `:60` ✔; rinumera il manifesto `:19-30`. ~10 righe.
2. `src/webgl/store/sectionStore.ts:233-239` — riscrivi in `["production","case-studies"], ["case-studies","services"], ["services","founders"], ["fit","final-cta"]`. **L'assenza della coppia `problem→production` È il merge.** ~9 righe.
3. `src/webgl/curves/routeCurves.ts:42-60` — sposta il waypoint `production` (`:51` ✔) sopra `case-studies` (`:48` ✔), poi **4 inversioni di segno** per mantenere la serpentina con `|x| ≥ 1.1`. ~10 righe.
4. `src/webgl/neural/traverseConfig.ts` — `TraverseBandId` `:67` ✔ ; nuova voce in `bands` (il `Record` a `:238` ✔ rende l'omissione un errore di compilazione — **è l'unica guardia che scatta**); generalizza `setTraverseConfig` `:376-391` ✔ a un patch per banda; rendi `islands` per-banda; `MAX_TRAVERSE_ISLANDS` `:233-235` ✔ diventa il massimo fra le due. `dir` **deve essere uniforme** (`−1`). ~45-60 righe.
5. `src/webgl/NeuralLattice.tsx:1334` ✔ — `anchorId === "problem" || anchorId === "production"`.
6. `src/components/sections/production-grade-section.tsx` — il gemello meccanico dell'Atto I: chiamata al hook; `overflow-hidden` `:377` → `#trust { overflow-x: clip; overflow-y: visible }` (**obbligatorio**, `problem-section.tsx:283-291`); blocco `#trust[data-traverse]`; `data-traverse-stack`; slot isole; `data-traverse-alpha` sui quattro wrapper `[data-drift]` `:387,432,522,561` — **oggi nessuno dei quattro è tipizzato, quindi cadrebbero tutti a `body`** e le display line dell'Atto II verrebbero traversate a profondità da corpo testo. ~110-125 righe.
7. **`src/webgl/neural/crystalConfig.ts:386-416` + `src/webgl/CrystalCluster.tsx:560, :769, :780`** — la PREPARED CHANGE già scritta (`s = ih * k * …`, `pxScale = ih * …`). **Senza questa, registrare la banda ri-basa la scala della pietra sana, dei suoi callout e del raggio di nebbia a ogni viewport** — e il pin non preserva la geometria, la **ri-basa** (`traverseConfig.ts:42-61`: +20.6 % a 1440×900, +70.8 % a 768×1024).
8. **Autorare a mano il `dy` dell'isola di testa dell'Atto II**, oppure aggiungere un termine cross-sezione al fit — `fitTraverseLadder` non vede oltre la giunzione (`traverseConfig.ts:205-207`) e con `leadVh = 1.203` un `bandY` piccolo manda `tFirst` in negativo e mette tre bande in campo.

- **Gate:** `npx tsc --noEmit`; poi in Chrome: (a) nessun buco né sovrapposizione alla giunzione; (b) i quattro tagli igloo superstiti scattano dove devono e **nessun warning di adiacenza dallo STEP 0**; (c) la linea firma è un tubo pulito, senza ritorni all'insù; (d) `#trust` non salta di scala all'ingresso; (e) tab su una riga dell'Atto II non produce shear laterale (prova del `clip`).
- **Rollback:** i sette punti sono commit separati e reversibili singolarmente; il punto 2 da solo riporta i tagli, il punto 1 da solo riporta l'ordine.
- **Parallelo:** **NO** al proprio interno — 1, 2, 3 e 4 toccano lo stesso grafo. Il punto 6 (file `production-grade-section.tsx`) e il punto 7 (`crystalConfig.ts` + `CrystalCluster.tsx`) sono **su file disgiunti** e possono andare in parallelo tra loro, dopo che 4 è atterrato.

---

### STEP 4 — Crescita dell'Atto II (dopo STEP 1 e 3)

**Non è una domanda da fare al proprietario:** è già approvata (`OWNER-DECISIONS.md:17` — *"Act II `#trust`: 5.95 vp runway = 4284 px (today 1475 → +2809 px)"*, riconfermata a `:152-156`, sotto `:4-6` "BINDING… do not re-litigate"). **Quello che si riapre è il numero**, perché il nuovo angolo lo ri-prezza. A 23.61° un Atto II non cresciuto corre 0.38 larghezze di schermo — un quarto della diagonale autorata, cioè esattamente il "sembra uno scroll normale" già rifiutato; a 40° lo stesso atto corre 0.73 W.

- **Gate:** occhio del proprietario; e `fitTraverseLadder(...).ok` **con il limite superiore dello STEP 0 attivo**.
- **Rollback:** `gapVh`/`gapCount` sono due numeri.

---

### STEP 5 — Tipo, parte A: pubblica l'identità del vincitore (indipendente da 1-4)

**File:** `src/webgl/store/traverseStore.ts` · `src/components/fx/use-diagonal-traverse.ts`

- `laneRow: number` accanto a `laneWindow` (`traverseStore.ts:79`), init `-1`, reset a `-1` in `deactivateTraverseBand` (`:132-140`).
- In `apply()`: risolvi l'indice **fuori** dal ramo `if (best && cfg.laneEnabled)` ✔ (`:461`), con **soglia `IGNITE_V ≈ 1 − ε`**, e **cachea l'indice su `Block` alla costruzione** (`:312-333`, `row` a `:330`) invece di leggere `dataset` nel loop. Aggiungi un callback `onLit` via ref, con **fronte di spegnimento `onLit(null)` nel teardown** (`:861-890`).

- **Gate:** `npx tsc --noEmit`; in Chrome `__sersanTraverse_problem` deve mostrare `laneRow` che cambia esattamente una volta per riga durante il transito, e **`-1` mentre si legge il capitolo** (i due blocchi capitolo `problem-section.tsx:469,518` sono fuori da ogni `[data-ledger-row]`). Zero regressioni di frame rate.
- **Rollback:** il campo è additivo; nessun consumatore lo legge finché non arriva lo STEP 6.
- **Parallelo:** sì, con STEP 2 e con STEP 3 punti 6-7 (file disgiunti).

---

### STEP 6 — Tipo, parte B: ricabla Atto I, cancella l'hover **condizionatamente**

**File:** `src/components/sections/problem-section.tsx`

- Passa il callback di `useIgnitionWave` al traverse invece che a `useLedgerIgnition` (`:409-414`) — **ma ri-collega anche `onFocus`/`onBlur` all'onda** (`use-ledger-ignition.ts:173-182`), altrimenti il focus da tastiera accende il CSS senza muovere le lettere.
- Aggiungi `.plrow[data-lit="true"] …` ai gruppi esistenti `:246-254` ✔ e **al blocco reduced-motion `:264-275`** ✔ — non per la ragione data nel piano originale (sotto RM l'attributo non viene mai scritto, `use-diagonal-traverse.ts:188`), ma perché **il teardown non lo cancella**.
- **NON cancellare il blocco `@media (hover:hover) and (pointer:fine)` `:255-263` incondizionatamente.** Va tenuto come fallback dove `!armed` — cioè finestra desktop stretta, telefono declassato, build a flag spento (`use-neural-lattice-fallback.ts:16-24, :41-46`).

- **Gate:** in Chrome, tre prove separate: (1) finestra larga → le righe si accendono da sole scorrendo e **non** rispondono al mouse; (2) **finestra stretta** → l'hover funziona ancora; (3) tab da tastiera → colore **e** onda; (4) RM attivo → nessuna riga accesa in nessuno stato; (5) toggle EN/IT a metà atto → nessuna riga rimane accesa o spostata.
- **Rollback:** i selettori `[data-lit]` sono additivi; togliendoli si torna a hover puro.
- **Parallelo:** dipende da STEP 5. Disgiunto da STEP 7 solo se l'Atto II NON riceve una banda dallo STEP 3 (altrimenti stesso grafo).

---

### STEP 7 — Tipo, parte C: Atto II

Se lo STEP 3 è atterrato, l'Atto II ha già la banda: serve solo la chirurgia CSS su `production-grade-section.tsx` (`[data-lit]` a `:287-297` e al blocco RM `:308-320`, **inclusi `__index` e `__label`**, chiudendo la lacuna già documentata a `:265-270`).

Se il proprietario sceglie **B** o **C** al PART 2, l'Atto II ha bisogno di un proprio orologio congelato. La strada più pulita è una banda ad angolo zero — **ma attenzione a due cose che il piano originale sbagliava**: (a) l'inerzia visiva non viene solo da `angleDeg = 0`, viene **anche** dal fatto che il nome banda `"trust"` **non corrisponde** all'ancora `production`, quindi l'isola non la vede mai (`NeuralLattice.tsx:264`, `:564`; `CrystalCluster.tsx:480` ✔); chiamarla `"production"` cambierebbe la maschera del copy (`NeuralLattice.tsx:658-666`); (b) armare il hook su `#trust` attiva `onFocusIn` → `lenis.scrollTo` (`use-diagonal-traverse.ts:527-560`), che è un **cambio di comportamento per gli utenti da tastiera lì**, visibile al proprietario.

- **Gate:** asserire da console che `rate === 0` e che tutti i `blocks[*].x === 0`; screenshot prima/dopo **pixel-identico** su `#trust`.
- **Rollback:** rimuovere la voce dalla `Record`.

---

### STEP 8 — Il rullo trasparente + `opWin` (insieme, mai separati)

**File:** `src/components/fx/lusion-type.ts` · `src/components/fx/use-diagonal-traverse.ts`

- Innesca la timeline di riga su `V̂ ≥ V_ARM`, **mantenendo `createReplayTrigger` come fallback quando la sorgente non viene passata** (altrimenti sui client fallback spariscono tutte le entrate — `useLedgerReveal`/`useChapterReveal` **non** sono gated su `!showFallback`: `problem-section.tsx:422-423`).
- Nello stesso passaggio, **implementa `opWin`/`opTop`/`unitSpan`**, che sono codice morto verificato ✔ (dichiarati `:159-161`, allocati `:304`, inizializzati `:326-327`, **mai popolati in `measure()` né letti in `apply()`**). Senza, la soglia di innesco e la dissolvenza sarebbero misurate su due riquadri diversi — ricreando la stessa classe di bug.

- **Gate:** in Chrome, scorrere lentamente (< 110 px/s) e vedere il rullo **partire quando la riga è già visibile**, non prima. Le due metà di una unità di lettura devono dissolvere **insieme**.
- **Rollback:** leva geometrica di ripiego — `start: "top bottom-=" + traverseConfig.bandInset*100 + "%"` (interpolato dal config ✔ `bandInset: 0.12`, **mai un letterale**).

---

### STEP 9 — La pietra si apre (dopo STEP 2, e dopo la risposta al PART 3)

**File:** `src/webgl/CrystalCluster.tsx` (mesh nel gruppo `:1136`, guidata da `a` `:576` ✔) · `src/webgl/neural/crystalConfig.ts` (nuove costanti)

Gate obbligatori del gating: la mesh va **gated su `broken`/`!lite` esattamente come ogni altro ramo del file** (`CrystalCluster.tsx:278`, `:299`; `crystalBuild.ts:1493`), altrimenti compare **in entrambe le pietre** e pre-decide da sola la domanda del PART 3. Posizione `y ≈ −0.50`, scala ≤ 0.92. `renderOrder −3.5`, `transparent: true`, `Discard` sotto la soglia di reveal (stessa disciplina di `crystalBuild.ts:1686`) per non timbrare depth quando è invisibile.

- **Gate:** (a) chiuso → bagliore appena percettibile, **niente bloom**; (b) aperto → logo pieno, bloom solo al picco; (c) la nebbia non lo copre; (d) `SignatureLine` non viene bucata quando il logo è invisibile; (e) i tre callout dell'Atto I non si strappano mentre il gap spazza 0.055→0.55 — **la finestra proposta cade interamente dentro tutte e tre le `CALLOUT_VIS_WINDOWS`**, quindi lo sweep avviene con i callout in campo; (f) profilare: il gate di scrittura CSS-var (`CrystalCluster.tsx:849-868`) rischia di passare da raro a **ogni fotogramma su 6 variabili** — se succede, va convertito a soglia.
- **Rollback:** la mesh è additiva; `visible=false` la spegne senza toccare altro.
- **Parallelo:** sì con tutto il ramo tipo (STEP 5-8) — file disgiunti, tranne `CrystalCluster.tsx` che è condiviso con lo STEP 3 punto 7. **Quei due non possono girare in parallelo.**

## Riepilogo parallelizzazione

| Può girare in parallelo | Non può |
|---|---|
| STEP 0 · STEP 2 · STEP 5 — tre insiemi di file disgiunti | STEP 3 punti 1-4 fra loro (stesso grafo config/ordine) |
| STEP 3 punto 6 (`production-grade-section.tsx`) ∥ punto 7 (`crystalConfig.ts` + `CrystalCluster.tsx`), **dopo** che il punto 4 è atterrato | STEP 3 punto 7 ∥ STEP 9 — entrambi scrivono `CrystalCluster.tsx` |
| Ramo tipo (5→6→8) ∥ ramo pietra (2→9) | STEP 6 ∥ STEP 7 se l'Atto II ha ricevuto una banda dallo STEP 3 |
| — | STEP 3 e 4 prima dello STEP 1 (l'angolo) |

**Nota trasversale:** il repo è 100 % CRLF senza `.gitattributes`; `npx tsc --noEmit` è l'unico gate statico e **non** intercetta: le coppie di taglio non adiacenti, l'overhang della scala, la chiave hard-coded di `setTraverseConfig`, il letterale `"problem"` a `NeuralLattice.tsx:1334`. Tutti e quattro vanno verificati a occhio o con le guardie dello STEP 0.

---

# PART 6 — COSA SERVE ANCORA DAL PROPRIETARIO O DA UNA MISURA DAL VIVO

## Decisioni che solo lui può prendere

1. **Il merge (PART 2, A / B / C)** — blocca STEP 3, 4 e la forma dello STEP 7. Ricordagli che ribalta D2 e perché D2 aveva detto no.
2. **L'angolo (§1b)** — un numero, ma **ogni cifra di crescita e di corsa laterale del merge è a valle**. Va tarato dal vivo prima di STEP 3.
3. **Il logo: una volta o due (PART 3, A / B / C)** — blocca STEP 9 e determina se D3 sopravvive.
4. **L'intestazione speculare muore.** `dir` deve essere uniforme sul passaggio unito, altrimenti due isole adiacenti con `dir` opposto si separano di **~818 px** nella schermata in cui coesistono. Perdita narrativa reale, non assorbibile in silenzio.
5. **Il salto 88 → 165 diventa +5.46 dB visibili.** L'intervallo lo nascondeva; adiacente diventa un confronto visto, non sentito.
6. **I deep-link `/#trust`** dal footer (`footer.tsx:71`) e da `/start` (`start-client.tsx:233`) atterrerebbero dentro il passaggio, a metà argomentazione. Vuole un'ancora diversa?
7. **Il salto "vedi i lavori"** dall'hero (`cinematic-system-scroll.tsx:1004`) scavalcherebbe l'intero passaggio neurale.
8. **Il bagliore WebGL resta su hover** mentre il testo passa a scroll — mouse e scroll comanderanno cose diverse sulla stessa riga. Va visto dal vivo.
9. **Il valore ambra sotto un logo ciano** nella pietra che si apre: la brace condivide il volume (`crystalConfig.ts:1756-1780`). Cross-fade su `open01`, o resta come retroilluminazione?
10. **Armare il traverse su `#trust`** attiva lo scroll-to-plateau al focus da tastiera lì (`use-diagonal-traverse.ts:527-560`): cambio di comportamento, forse una correzione, comunque visibile.
11. **NON è una domanda: la crescita dell'Atto II è già approvata** (`OWNER-DECISIONS.md:17`, `:152-156`, sotto `:4-6` "BINDING… do not re-litigate"). Si riapre solo il **numero**, perché il nuovo angolo lo ri-prezza.

## Misure che devono essere prese in Chrome, dal vivo, prima di scrivere codice

1. **`bandY` di `#trust` in altezze di viewport.** Se è < `leadVh = 1.203` la banda di testa entra dentro l'Atto I e si rompe la garanzia "mai tre in campo". **Questo è l'unico numero che può far fallire strutturalmente la giunzione, e nessuno l'ha misurato.**
2. **La corsa laterale al nuovo angolo**, per Atto I e Atto II, a 1920×935 e su mobile. Tutte le cifre in circolazione (1.27 W / 0.38 W / 3.41 W) sono a 23.61°.
3. **L'altezza di banda dell'Atto II dopo il pin, a più viewport.** Il pin ri-basa, non preserva (+20.6 % a 1440×900, +70.8 % a 768×1024): decide se serve la PREPARED CHANGE o il meccanismo §4.4(c).
4. **La spazzata del gap con i callout in campo.** `m` corre 1.055→1.55 mentre i tre callout DOM sono visibili: `CALLOUT_LEFT_MIN/MAX 4/96` e `CALLOUT_EDGE_MIN/MAX 2/88` (`crystalConfig.ts:1294-1297`) si appiattiscono agli estremi?
5. **Profilo del gate CSS-var** (`CrystalCluster.tsx:849-868`) durante l'apertura: da raro a per-fotogramma su 6 variabili è una regressione di allocazione mascherata.
6. **La finestra di `a` ricalcolata sul rect corretto.** `rect.h ≈ 0.8597·svh ≈ 804 px @935, NON 5595`; `a` copre ≈ ±0.93 (±1.16 col cull). Le cifre assolute di scroll che girano (8226 / 7291 / 9161) sono **sbagliate** e vanno ri-derivate dal `docTop` misurato dell'ancora di banda.
7. **Verifica che a HEAD non ci sia già un warning di adiacenza** dopo lo STEP 0 — se ce n'è uno, un taglio igloo è già morto oggi e nessuno se n'è accorto.
8. **La densità di isole dopo la correzione §1a.** Il conteggio bande del merge non si può fissare finché non si sa cosa sostituisce la scala di isole fissate (tiling / wrapping / composizione progressiva, `ROUND12-HANDOFF.md:46-69`).
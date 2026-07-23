# CORRECTIONS to mattia-PLAN.md — binding, read this SECOND and let it override

Three adversarial reviewers checked the plan against the real code. Two of them
independently re-implemented `readGrid`/`emit` offline and measured the actual assets;
their numbers agree. Where this file contradicts `mattia-PLAN.md`, **this file wins**.

The plan's architecture is confirmed correct and is NOT in question: single progress
scalar `0..MORPH_MAX`, derived stage, leg-local `env` and copy windows, N-ary sampler,
bounds-check `step()`, mandatory `colorsC`/`sizeC` shader extension. Build that.

---

## C1. Provenance — RESOLVED, the biographical copy IS sourced

The completeness reviewer flagged Mattia's LinkedIn URL, degree, employer and paper
title as unsourced inventions and asked to gate the PR on confirming them. **That
concern is closed.** All of it comes from his LinkedIn profile export (`Profile-2.pdf`),
supplied by the user and parsed at the start of this task:

- `https://www.linkedin.com/in/mattia-scattu-481271356` — verbatim from the export
- Laurea Triennale in Informatica, Università di Camerino (Sep 2022 – Apr 2026)
- L'Ultima Spiaggia S.r.l., Software Engineer (Jun–Jul 2026). Quoting the export
  VERBATIM, because an earlier lossy paraphrase of this line here caused a
  reviewer to flag the shipped bio as invented: *"Designed and developed a
  comprehensive information system for a campsite resort, **focusing on
  maintenance operations and inventory tracking**. The project encompassed
  formal requirements analysis, logical and physical database modeling, user
  interface design, and full software lifecycle implementation. The resulting
  application streamlines the assignment and resolution of maintenance requests
  while ensuring rigorous monitoring of inventory levels and material
  resources."* The maintenance/inventory scope IS sourced — do not strip it.
- ARES Sardegna, IT intern (Jul–Sep 2025)
- Publication: "Knowledge Graphs as a Semantic Layer for Understanding Robotic Video"

Ship the plan's §4c entry as written. The **only** genuinely unsourced field is `stack`,
which the plan correctly omits.

## C2. `stack` — omit it, and do NOT escalate it as a product question

The plan's §11.1 reason is factually wrong: `FounderPanel` never renders `stack`.
Repo-wide the ONLY consumer of `stack`, `expertiseEn/It` and `badges` is
`who-and-why.tsx:255-261`, which is a dead file. Those three fields have **zero live
render surface**. Mattia's entry still needs `badges` and `expertise*` because the
interface requires them — add them, and note in a comment that they are currently
unreachable. Delete §11.1 from consideration.

## C3. The extent claim is INVERTED — the fit is already X-bound

Measured at the shipped `SAMPLE_SPEC_BASE` / 290×405, two reviewers independently:

| portrait | own ink cells | mean ink | halfExtentX | halfExtentY |
|---|---|---|---|---|
| alessandro-headshot | 38,509 | 0.431 | 136.5 | 134.0 |
| michele-headshot | 38,913 | 0.452 | 129.5 | 137.0 |
| mattia-headshot | 52,711 | 0.651 | 140.5 | 145.0 |

`scaleX/scaleY = 0.75·halfY/halfX` → today `0.75·137/136.5 = 0.753 < 1` → **X-bound
already**, and after → `0.75·145/140.5 = 0.774 < 1` → **still X-bound**.

The plan's §12A QA gate `max(halfExtentX) <= 0.75 * max(halfExtentY)` **fails in both
the before and the after state**. Anyone running it concludes the change broke the fit
and starts "fixing" `fadeStart` on a healthy build. **Delete that gate entirely.**

Replace with: *expect `halfExtent ≈ [[136,134],[130,137],[140,146]]`; the fit is X-bound
before and after, so `worldPerGrid` drops ~3% and all three faces render ~3% smaller.
That is the expected delta, not a flip. Investigate only if `max(halfExtentX) > 143`.*

**Never lower `fadeStart` to chase this** — it is shared, and it would shrink everyone's
bust. Per C6 the asset is being re-exported anyway, which may remove the shrink.

## C4. The `meanInk ±5% or revert` gate is arithmetically guaranteed to false-fire

`getSampler().meanInk` averages over the **union** cell list, and the union grows when a
portrait is added — so each existing portrait's mean falls purely by denominator growth,
with zero change to its pixels. Measured: A 0.369 → 0.288, B 0.390 → 0.305 (both −22%)
against a ±5% gate.

**Correction:** assert **total ink mass** `meanInk[k] * count` is unchanged within ~1%
for portraits 0 and 1, OR change `getSampler()` to also report `meanInkSubject` = mean
over cells where that portrait's own `ink > inkCut`. Do the latter — it is two lines in
a block already being edited, and it is the more useful number.

## C5. `MAX_COUNT_BY_TIER.full` — do NOT hardcode 72000 up front

Measured unions: A∪B = 45,187 (reviewer port) ≡ 42,087 (shipped in-browser calibration,
normalisation factor 0.931); A∪B∪C = 58,131 ≡ **≈54,100 in-browser**. So against the
48,000 ceiling `stride` really would become 2 and halve the cloud — the plan's diagnosis
is right and the cliff is real.

But raising the ceiling is **not** "monotone-safe" as the plan claims. `count` feeds
`spacingDev = sqrt(areaDev/count)` (`FounderPortraitMorph.tsx:448-457`), which feeds
`defPointSize` and `PORTRAIT_COV_MIN_PX` — so +29% instances shrinks every disc ~12%
and re-tunes the coverage knee. Alessandro's and Michele's faces change without their
assets changing. It also adds ~29% per-frame compute and three storage buffers.

**Binding order of preference:**
1. **First** land the asset fix (C6), then re-measure `sharedCells`.
2. If the three-portrait union lands **≤ 46,000**, leave `MAX_COUNT_BY_TIER.full` at
   **48000 unchanged** — no perf delta, no disc-size change, no face shrink.
3. Only if it stays above 48,000, raise the ceiling, and prefer instead shrinking the
   grid by `scale = sqrt(45000 / measured)` so `count` lands back near today's 42k.

Write the chosen value with the measured number in the comment, not a guess.

**Add a frame-time check to §12A** — the plan has none, and AGENTS.md mandates 60fps
desktop. Capture frame deltas at rest on stage A and across a full A→B→C, before and
after, on the same machine.

## C6. THE JACKET — asset fix, already actioned separately

Not in the plan at all, and it is a **look** bug, not just a budget one. Measured mean
ink: A 0.288, B 0.305, **C 0.590 — roughly double**. Mattia's backdrop is pure white
(corner median exactly 1.0,1.0,1.0) and his navy jacket sits at `dist ≈ 0.79-0.91`,
saturating ink at 1.0 across ~85% of the frame width. `fadeStart 0.62 / fadeSpan 0.32`
was tuned against subjects whose torsos are ALREADY at ink ≈ 0.03, where the dissolve is
cosmetic. Mattia's jacket enters the dissolve band at 1.0.

**Result if unfixed: stage C renders as a head above a solid dark slab, while stages A
and B render as heads fading into nothing** — a legible inconsistency in a three-beat
sequence whose entire point is that the three faces are the same object re-forming.

This cannot be fixed with a threshold: the jacket and the hair/beard both saturate at
ink ≈ 1.0. That is precisely the lesson recorded in `sampleImagePoints.ts:254-271` and
in MEMORY.md — *separate the subject SPATIALLY, never by colour*. Per-portrait
`fadeStart` would break the shared-spec invariant. **Do not do either.**

**The fix is the asset, and it is being handled by a separate agent in parallel:**
`public/founders/mattia-headshot.webp` is being re-exported with the lower torso washed
toward the white backdrop so his ink profile decays like the other two. Only the
`-headshot` file changes — it is consumed **exclusively** by the WebGL sampler
(`loadFounder`). The DOM poster `mattia-scattu.webp` stays the clean full image.

**IMPLEMENTER: do not touch either image file.** Assume the headshot will change under
you; nothing in the code depends on its bytes.

## C7. `MORPH_MAX` must be capped at the engine's four targets

The plan derives `STAGE_TOTAL = founders.length` uncapped while capping the island at
`TARGET_COUNT = Math.min(founders.length, 4)`. At N≥5 they silently diverge:
`stageFromMorph` returns `STAGE_ORDER[4] === undefined` typed as `FounderStage`,
poisoning `store.stage`, and the gate never releases downward.

```ts
export const MORPH_MAX = Math.min(founders.length, STAGE_ORDER.length) - 1;
export const STAGE_TOTAL = MORPH_MAX + 1;
```

The gate counter denominator must then use `STAGE_TOTAL`, not `founders.length`, or the
two disagree. In the morph branch only, render `founders.slice(0, STAGE_TOTAL)`; the
horizontal-rail and native branches have no target limit and must keep rendering
everyone. No-op at N=3; turns a silent breakage into graceful truncation.

## C8. `hasPortraitSizeC` can dereference a null expression

The plan's gate lets `sizeC` be passed without `colorsC`, making `portraitMorph2Expr`
null while `hasPortraitSizeC` is true — the `!` lies and the shader build throws.

```ts
const hasPortraitSizeC = hasPortraitC && hasPortraitSize && !!portrait?.sizeC;
```

## C9. `our-why.tsx` — a LIVE surface the plan missed entirely

`src/components/sections/our-why.tsx` is rendered on `/about` at `about-client.tsx:190`,
**directly above** the founder grid being converted to 3-up. The plan carefully scopes
`about-client.tsx:168-169` to "Both **founders** senior" and then leaves the identical
unscoped claim two sections higher, in both languages. Largest completeness hole.

| file | line | change |
|---|---|---|
| `our-why.tsx` | 19 | → `"One deeply technical. One deeply commercial. Both founders senior. Both in the room from week one."` |
| `our-why.tsx` | 20 | → `"Uno fortemente tecnico. Uno fortemente commerciale. Entrambi i fondatori senior. Entrambi presenti dalla prima settimana."` |
| `our-why.tsx` | 92 / 109 | **LEAVE** — "built by two people" / "nata dall'incontro di due persone" is a *founding* claim and survives a third hire, exactly like `about/page.tsx:7`. |

## C10. Do not cite the hero as precedent for the sequencing discipline

`HeroTextParticles.tsx:542` opens leg 2 at `morphTRef.current >= 0.95`, **not** 1.0 — it
deliberately overlaps by 5%. Invisible on abstract text motes; on a face it would cut the
A→C corner and skip Michele. Keep the single-progress-scalar design exactly as planned,
but drop the "already proven in production" framing from the comments so nobody later
"aligns with the hero" by copying the 0.95 gate.

## C11. `pairRef` / `imgARef` rename lists in the plan are wrong

Real occurrences — `pairRef`: **:243, :313, :330, :562, :569, :762, :770**. The plan
misses `:562` (`pairRef.current = next`) and `:569` (`if (!pairRef.current) return`, the
build-effect guard), and its cited `:843` contains no `pairRef` at all.
`imgARef`/`imgBRef`: **:241, :242, :308, :309, :556, :557**.
Do not trust the plan's line lists — grep each symbol and change every hit.

## C12. Smaller corrections, all confirmed

- **Delete the dead writes** `built.uMorph2.value = 0; built.uMorph3.value = 0;` at
  `FounderPortraitMorph.tsx:506-507`. `applyMorph` overwrites both a few lines later;
  leaving them makes the next reader believe leg 2 is pinned off.
- **One clamp form.** The plan uses `clamp(p,0,1)` in `applyMorph` and `Math.min(p,1)` in
  the frame loop. Make `applyMorph` the single writer and call it from the frame loop.
- **Block 0's children are newly GSAP-driven.** Today only block B's children get
  `gsap.set` + quickSetters; the generalised form writes `transform: translate(0px,0px)`
  onto Alessandro's five children every frame. Output-identical, but each child becomes a
  containing block — including the `<ul>` whose `<li>`s carry `backdrop-blur-sm`
  (`CHIP_CLASS`, `founders-rail.tsx:186`). **Verify the credential chips still blur at
  stage A.** Silent if wrong. Also: "the A→B leg is byte-identical" is true of the
  *values*, not of the *writes* — say so in the comment.
- **`noUncheckedIndexedAccess` is OFF** in tsconfig, so the sparse `blocks: BlockFx[]`
  type-checks without the `if (b)` guard. Keep the guard anyway; TS will not enforce it.
- **`G_MAX_ENGAGE_MS` force-release can fire mid-leg.** `release(lastDir)` (`:1121`)
  does not touch `morphTarget`, so the island keeps auto-playing while the page scrolls
  away. Pre-existing, but 3 legs in a 24s window moves it from unlikely to plausible.
  Note it; do not fix it in this change.
- **Store layering (optional, preferred).** Importing `@/data/founders` into
  `foundersMorphStore.ts` pulls ~120 lines of EN+IT bio prose into the lazy WebGL island
  chunk and makes a content module a dependency of a per-frame primitive. The
  anti-drift goal is already met by deriving the slug from `founders[idx].anchor` in the
  island. Prefer keeping the store count-agnostic and passing/asserting the count from
  `founders-rail`. Acceptable either way — do not spend long on it.
- **Poster bytes.** Three eager 1200×1800 posters adds ~40 KB to the home page that a
  WebGPU session never shows. Either accept and note it, or gate posters `1..N-1` behind
  the existing `posterShown` grace flag.
- **Residual copy the plan does not list:** `src/app/page.tsx:25` comment "the two people
  who ship every engagement"; `founders-rail.tsx:509,534` comments "BOTH founders";
  `footer.tsx:79` nav label "Founders"/"Fondatori" → `/about` now shows three (candidate:
  "Team"). Fix the two comments; leave the footer label — flag it for the user.
- **`founders-rail.tsx:1459`** — `"no junior bench"` / `"nessuna panchina di junior"`.
  See C13; whatever is decided must be applied in BOTH languages in the same commit.

## C13. Positioning — flag, do not auto-decide

`about-client.tsx:168-169` ("no layer of juniors between you and the people doing the
work"), pillar 01 at `:93-96`, and `founders-rail.tsx:1458-1459` ("no junior bench") now
share a page with a 2026 graduate. Scoping "Both senior" to the founders (C9 and the
plan's §7f) resolves the literal contradiction. Whether the juniors clause stays is a
**positioning decision for the user** — implement the scoping, leave the clause, and
report it.

# Adversarial review — completeness lens

I read every file the plan cites, and I **re-ran the sampler algorithm offline** against the three real headshots (exact `readGrid` port: cover-crop 1200×1800 → 290×405, corner-median backdrop, `BG_FILL_TOL` flood fill, ink curve, 0.99-percentile extents). Measured output below. Several of the plan's confident numeric claims are now settled — one of them against the plan.

---

## P0 — The plan's headline extent claim is factually inverted

**Measured, at the shipped `SAMPLE_SPEC_BASE` / 290×405:**

| portrait | measured backdrop | own ink cells | mean ink | halfExtentX | halfExtentY |
|---|---|---|---|---|---|
| alessandro-headshot | 0.925, 0.933, 0.941 | 38,509 | 0.431 | **136.5** | 134.0 |
| michele-headshot | 0.933, 0.937, 0.945 | 38,913 | 0.452 | **129.5** | 137.0 |
| mattia-headshot | **1.000, 1.000, 1.000** | 52,711 | 0.651 | **140.5** | 145.0 |

Plan §2 / §12A: *"Today the fit is Y-bound"*, and the diagnostic *"`max(x) ≤ 0.75 × max(y)`"* with the remedy tree (lower `fadeStart`, re-crop the jacket, accept the shrink).

**This is wrong today, before any change.** `FounderPortraitMorph.tsx:371-377` takes `min(scaleX, scaleY)` with `scaleX = 0.75·H·F/(2·halfX)`, `scaleY = H·F/(2·halfY)`:

- **Today (A+B):** halfX = 136.5, halfY = 137.0 → `scaleX/scaleY = 0.75·137/136.5 = 0.753 < 1` → **already X-bound.**
- **After (A+B+C):** halfX = 140.5, halfY = 145.0 → `0.75·145/140.5 = 0.774 < 1` → **still X-bound.**

The 0.75 gate the plan tells QA to assert **fails in both the before and after state**, so a QA engineer following §12A will conclude the change "flipped the fit" and start lowering `fadeStart` or re-cropping the asset — chasing a regression that does not exist. Root cause of the plan's error: it assumed the extent is measured on the *face*. It isn't — at `extentInk = 0.15` the shoulders/torso clear the threshold for all three, so `halfExtentX ≈ 136` out of a half-width of 145 for **Alessandro too**. The jacket is not qualitatively different; it is +4 grid px.

**Correction.** The real effect is a uniform **~2.9% shrink** of every face (`worldPerGrid` scales by `136.5/140.5`). Replace the §12A row with:

> `halfExtent` — expect ≈ `[[136,134],[130,137],[140,146]]`. The fit is **X-bound before and after**; `worldPerGrid` therefore drops ~3%, so all three faces render ~3% smaller than today's A/B. That is the expected, accepted delta — not a flip. Only investigate if the shrink exceeds ~5%, i.e. `max(halfExtentX) > 143`.

Everything the plan says about capturing a before/after screenshot of Alessandro at rest stands — but the *expected* result is a small shrink, not "no change".

---

## P0 — The stride cliff is real, and the plan's ceiling is right (confirmed)

| union | measured (my port) | scaled to the shipped in-browser calibration¹ |
|---|---|---|
| A + B | 45,187 | **42,087** (documented, `FounderPortraitMorph.tsx:89-94`) |
| A + B + C | 58,131 | **≈ 54,100** |

¹ my sharp-resize filtering differs from canvas `drawImage`, so I normalise by the known A+B figure (factor 0.931).

So: **≈ 54k cells against the 48,000 ceiling → `stride` would become 2 and halve the cloud for all three faces.** The plan's diagnosis is correct and `MAX_COUNT_BY_TIER.full: 72000` keeps stride 1. Confirmed sound; no correction needed.

**But the plan calls raising the ceiling "monotone-safe", and it isn't — perf-wise.** Instance count goes **42,087 → ~54,100 (+29%)** in a per-frame TSL compute sim plus a point-sprite pass, and `spacingDev = sqrt(areaDev/count)` (`:450`) shrinks every disc, so fill rate is roughly flat but the compute dispatch and the storage allocation grow ~29%. **§12's verification checklist contains no frame-time check at all**, on a repo whose AGENTS.md mandates 60fps desktop / Lighthouse ≥80 mobile.

**Correction — add to §12A:** record `performance.now()` frame deltas (or Chrome DevTools Performance) across a full A→B→C sequence and at rest on stage A, before and after, on the same machine. If the resting frame budget regresses, the lever is **shrinking the grid**, not lowering the ceiling: `scale = sqrt(45000/54100) = 0.912` → `GRID_W 264, GRID_H 369` lands ≈ 45k cells at stride 1, i.e. the same instance count as today with three faces.

---

## P1 — A live surface the plan missed entirely: `our-why.tsx`

The plan states it catalogued "~15 hardcoded two-founder assumptions" and correctly identifies `who-and-why.tsx` as dead (verified: a repo-wide grep for `who-and-why|WhoAndWhy` matches only inside the file). **It then misses that file's live twin.**

`src/components/sections/our-why.tsx` is rendered on `/about` at `about-client.tsx:190`, **directly above the founder grid the plan converts to 3-up**:

- `:19-20` — `"One deeply technical. One deeply commercial. Both senior. Both in the room from week one."` / `"Uno fortemente tecnico. Uno fortemente commerciale. Entrambi senior. Entrambi presenti dalla prima settimana."` — headed **"Opposite backgrounds."**, a two-person claim stated as an operating principle.
- `:92-96` / `:109-113` — `"Sersan was built by two people with opposite backgrounds…"` / `"Sersan è nata dall'incontro di due persone…"`

The plan carefully scopes `about-client.tsx:168-169` to "Both **founders** senior" — and then leaves the identical unscoped claim two sections above it, in both languages, on the same page. This is the single largest completeness hole.

**Correction (mirrors the plan's own `about-client` treatment):**

| file | line | change |
|---|---|---|
| `our-why.tsx` | 19 | `"One deeply technical. One deeply commercial. Both founders senior. Both in the room from week one."` |
| | 20 | `"Uno fortemente tecnico. Uno fortemente commerciale. Entrambi i fondatori senior. Entrambi presenti dalla prima settimana."` |
| | 92 / 109 | **leave** — "Sersan was built by two people" / "è nata dall'incontro di due persone" is a *founding* claim and survives a third hire, exactly like `about/page.tsx:7`. |

---

## P1 — Unsourced biographical content, in a repo that forbids it

AGENTS.md §6: *"Non inventare contenuti… Segnalami i buchi invece di riempirli a caso."* The brief supplied exactly three facts: **name, "Software Engineer", two image files.**

Plan §4c nevertheless asserts, as ready-to-commit code:

- `linkedIn: "https://www.linkedin.com/in/mattia-scattu-481271356"` — a **numeric LinkedIn slug**. This ships as a live `<a href>` in `FounderCopy` (`:253-262`), `FounderPanel`, and `/about`. If the digits are wrong it is a public 404 on the team page.
- `"BSc Computer Science, Università di Camerino"`
- `"Knowledge Graphs as a Semantic Layer for Understanding Robotic Video"` — a specific paper title, quoted twice.
- `"L'Ultima Spiaggia S.r.l."`, the campsite-resort information system, `"IT intern at ARES Sardegna"`.

The plan flags `stack` as unsourceable (§11.1, correctly) while presenting all of the above with no provenance note — which reads as verified when it is not. **Correction:** move the LinkedIn URL, degree, employer, publication title and internship into §11 as *"confirm verbatim with Mattia before merge"*, and gate the PR on it. `linkedIn` in particular has no safe default: `FounderCopy` renders the link unconditionally, so a placeholder ships a broken link.

---

## P1 — `MORPH_MAX` has no engine cap; the store and the island disagree at N ≥ 5

Plan §7a: `STAGE_TOTAL = founders.length; MORPH_MAX = STAGE_TOTAL - 1`, with a doc comment claiming *"HARD CAP 4"*. There is no cap in the code. Plan §8c meanwhile clamps the island: `TARGET_COUNT = Math.min(founders.length, 4)`.

Add a fifth person and they silently diverge: the store says `MORPH_MAX = 4`, so `step()` (§9c) happily sets `morphTarget = 4` and `stageFromMorph` returns `STAGE_ORDER[4]` → **`undefined`**, while the island only built four homes and `applyMorph` has no `uMorph4`. The DOM renders five copy blocks against four morph targets. The gate then never releases downward because `next > MORPH_MAX` is never reached in a state the island can represent.

**Correction, in `foundersMorphStore.ts`:**

```ts
export const MORPH_MAX = Math.min(founders.length, STAGE_ORDER.length) - 1;
export const STAGE_TOTAL = MORPH_MAX + 1;
```

and in `founders-rail.tsx` derive the rendered list from `founders.slice(0, STAGE_TOTAL)` in the **morph branch only** (the horizontal-rail and native branches have no target limit and must keep rendering everyone). At N = 3 this is a no-op; it turns a silent breakage into a graceful truncation.

---

## P2 — `foundersMorphStore` importing `@/data/founders` inverts the layering

Plan §7a adds `import { founders } from "@/data/founders"` to the WebGL store. That store is deliberately a tiny, globalThis-pinned bridge (`:48-53` documents the cross-bundle desync it exists to solve) and is imported by **both** the home route bundle **and** the lazy WebGL island. `founders.ts` is ~120 lines of long EN+IT bio prose; it now gets pulled into the lazy island chunk, which previously carried only `f.image` / `f.anchor` via the island's own import.

Minor in bytes, but it makes a content-data module a dependency of a per-frame WebGL primitive. **Correction (optional but cleaner):** keep the store count-agnostic — `MORPH_MAX` stays derived from `STAGE_ORDER.length - 1` (a hard 3), and let `founders-rail` pass/assert the real people count. The plan's stated rationale (kill the `FOUNDER_SLUGS` parallel-array class of bug) is satisfied independently by §8c's `founders[idx].anchor` derivation, which is the actual fix.

---

## P2 — Three eager 1200×1800 posters on the home page

Plan §7e maps `founders` into `<img>` elements in the morph stage. Those imgs carry no `loading` attribute (today's `:1566-1588` are eager by design — the repo notes native lazy-load doesn't fire inside a sticky/transform frame). Going 2 → 3 adds **~40 KB** (`mattia-scattu.webp`) of always-downloaded bytes to the home page, on a WebGPU session where the posters are permanently `opacity: 0` and never shown.

Not a blocker, but the plan claims a zero-cost DOM change. **Correction:** either accept and note it, or render posters `1..N-1` behind the same `posterShown` grace flag the effect already computes (`:812-817`) — the fallback only needs them after 4 s.

---

## P2 — Residual inconsistencies the plan does not list

| file | line | issue |
|---|---|---|
| `src/app/page.tsx` | 25 | section index comment: *"07 Founders — **the two people** who ship every engagement"* |
| `src/components/footer.tsx` | 79 | nav label `"Founders" / "Fondatori"` → `/about`, which now shows three people. Candidate: `"Team" / "Team"`. |
| `founders-rail.tsx` | 509, 534 | comments: *"the horizontal rail shows **BOTH** founders"*, *"**both** founders as real, focusable DOM"* — the fallback rationale is now three-way. |
| `founders-rail.tsx` | 1616 | chrome comment *"stage counter (01/02 → 02/02)"* — plan flags this ✓ |
| `sampleImagePoints.ts` | 27-31, 80-81, 392 | plan flags ✓ |

`authorBios` / `authorUrls` (`founders.ts:115-121`) are **dead exports** — repo-wide grep finds no consumer. Plan §4d justifies keeping them on the full `founders` array so `/about#mattia` resolves "if he ever bylines an article"; harmless, but the justification is hypothetical, not current behaviour. `resources.ts:38-141` hardcodes its own `authorRole` strings anyway.

---

## What is genuinely sound (verified, move on)

- **§1 engine semantics.** `gpgpuNodeSim.ts:1008-1020` verified verbatim — `target.assign(mix(target, hC, …))` is genuinely chained, so naive `homeA/homeB/homeC` wiring is correct for sequential A→B→C, and the saturation argument (`m = (1−0.55r)/0.45 = 1` at worst case `r→1`) holds exactly. The "`uMorph` must hit exactly 1 before `uMorph2` leaves 0" invariant, and deriving both from one progress scalar to guarantee it, is the right design.
- **The colour/ink trap is real and the fix is mandatory.** `:1167-1181` and `:1371-1373` both read `morphN` alone; `PortraitMorphOpts` (`:841-851`) has no `colorsC`/`sizeC`. Without §5's extension Mattia would render as a Michele-coloured stencil, and `PORTRAIT_SIZE_MIN = 0.06` (`:1188`, whose own comment notes ~48% single-portrait-only cells at N=2) would cull his jacket outright. Correctly identified; rewriting `portraitInkExpr` in place to pick up all three downstream readers for free is the right economy.
- **§2 union-vs-intersection.** `:410-414` and `emit`'s unconditional per-portrait write (`:373-374`) confirm it: adding a portrait can only grow the cell list, never remove coverage.
- **Mattia's backdrop.** Measured corner median = **exactly (1.000, 1.000, 1.000)**, jacket ≈ rgb(36,42,58) → `dist` ≈ 0.79, **14× `BG_FILL_TOL` (0.055)**. No flood-fill leak risk. The plan's refusal to add a chromatic gate (`:254-271`) is correct and matches MEMORY.md.
- **§9a "zero extra pixels".** `measure()` (`:783-790`) really does write `height = innerHeight` with `travel = 0`; the hold is `lenis.stop()` + the per-frame re-snap (`:1097-1121`). A third stage costs no scroll length. Correct, and an easy thing to get wrong.
- **§9c `step()` bounds rewrite.** `:923-939` really does encode "far end" as a letter test that only works at N=2; the `next < 0 / next > MORPH_MAX` form generalises the anti-trap guarantee correctly. `release()` (`:896-918`) is direction-only — no change needed, as claimed.
- **§9d `engage(MORPH_MAX)`.** `:1148` `engage(fromBottom ? "B" : "A")` would otherwise drop an upward arrival on Michele. Real bug, correct fix.
- **§10 leg-local `applyStage`.** I checked the edge cases the plan claims fall out with no branches: block 0 (`u ≥ 1` → children saturate; hidden iff `m ≥ 0.3`, matching today's `exitT >= 1`), block N−1 (`local ≤ 0` → never exits; hidden iff `u ≤ 0.7`, matching today's `m <= COPY_ENTER_START`), posters summing to 1 at m = 0, 0.5, 1, 1.5, and `Math.round` half-up reproducing `m >= 0.5 ? "02" : "01"`. All correct. Keeping the `COPY_*` constants at their shipped values and re-framing them as leg-local is the right call.
- **Per-block `childDur`.** Verified: `:625` selects `:scope > div > *`, and `FounderCopy` (`:206-263`) emits 6 direct children for Michele (the `previouslyAt` block at `:236-252` is conditional) vs 5 for Alessandro/Mattia. Per-block is correct; the plan is also right that the drift direction is *early*, not late.
- **`/ 02` at `:1637`** is a hardcoded literal (`total` is available at `:1429`); `"01"` at `:1634` is correctly left as the SSR seed. **`sin(p·π)` → `sin(legFract(p)·π)`** is a genuine must-fix — the raw form goes negative on leg 2 and would invert `uSpread`, the dolly and the orbit.
- **`/about` md/lg grid.** `md:col-span-2 md:justify-self-center md:w-[calc(50%-1rem)]` with `gap-8` (2rem) is arithmetically right, and leaving `md` at 2 columns keeps the first two cards byte-identical.
- **Dead-code calls.** `who-and-why.tsx` orphaned ✓ (self-references only). `founders.*` i18n keys (`en.ts`/`it.ts` :87-94) have **zero** `t('founders.…')` read sites ✓ — and they are already stale (`sebastiano`/`andrea`). Both correctly excluded.
- **`contact-client.tsx:7 / :181` and `start/page.tsx:4 / :106`** — line numbers exact, and both surfaces genuinely say "founder" in prose above the list (`contact:178`, `start:58, :91`). The `coFounders` split is the right shape.

---

## Is the IT copy complete?

Mattia's own `roleIt / credentialsIt / shortBioIt / bioIt / expertiseIt` are all present and idiomatic. The **gaps are outside his data entry**:

1. `our-why.tsx:20` — untouched IT twin of the "Both senior" claim (above).
2. `founders-rail.tsx:1459` — `"nessuna panchina di junior"`, the home-rail mirror of §11.2's open question. Whatever is decided for EN must be applied to IT in the same commit; the plan lists the EN string only.
3. `roleIt: "Software Engineer"` untranslated while the other two translate — flagged in §11.4 ✓.
4. `/start` and its metadata are **English-only** by construction, so no IT work there; `about/page.tsx` metadata likewise has no IT variant. Correct to leave alone.

---

## Recommended additions to §12F (adversarial diff review)

Beyond the plan's list, verify explicitly: (a) `MORPH_MAX` is capped at `STAGE_ORDER.length - 1`; (b) `our-why.tsx` EN **and** IT both edited; (c) no unverified biographical string ships — grep the diff for the LinkedIn URL and the paper title and confirm each against Mattia directly; (d) a frame-time capture before/after at ~54k instances; (e) `halfExtent` is asserted against the measured `[[136,134],[130,137],[140,146]]`, **not** against the plan's incorrect 0.75 gate.
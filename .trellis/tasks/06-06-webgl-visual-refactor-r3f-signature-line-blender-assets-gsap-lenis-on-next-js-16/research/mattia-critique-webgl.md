I read every cited file. Below is the skeptical pass: what's sound, what's wrong, and the concrete corrections.

# Review of the "third morph target" plan

## Verified sound — move on

These claims I checked line-by-line and they hold:

- **`gpgpuNodeSim.ts:1008-1020` chained-target reading is exactly right.** `target.assign(mix(target, hC, …))` is genuinely sequential, and the stagger does saturate exactly (`m = (1 − 0.55r)/0.45 = 1` at worst case `r→1`). Naive `homeA/B/C` wiring is correct.
- **The colour/ink trap is real.** `:1167-1181` and `:1371-1373` both key off `morphN` alone; `PortraitMorphOpts` (`:841-870`) has no C slot. Without the shader extension Mattia renders as a Michele-coloured stencil. Mandatory, not polish. Confirmed.
- **The sampler is a union** (`:410-414`), `emit` is unconditional per-image (`:373-374`), stride is an integer cliff (`:420-421`). Correct.
- **VaryingNode hazard, swizzle discipline, `uSizeComp` pins, hero-must-stay-identical** — all verified against `:1105-1166`, `:939-948`, `:1229-1234`, and the two call sites. Guard rails 5–8 are accurate.
- **`measure()` writes `innerHeight` with `travel = 0`** (`:783-790`). The "a third stage costs zero scroll pixels" claim is correct and is the single most valuable insight in the plan.
- **`step()` generalisation to a bounds check** (`:923-939` → `next < 0 / next > MORPH_MAX`) is correct and strictly better than the letter tests.
- **`who-and-why.tsx` is orphaned** — repo-wide grep matches only inside the file. Correct.
- **`/about` line references and the `md:col-span-2 … w-[calc(50%-1rem)]` math** are correct (`gap-8` = 2rem → column = 50% − 1rem). `Reveal` forwards `className` to a single root element, so `justify-self` lands.
- **`contact-client.tsx:181` / `start/page.tsx:106`** both map `founders` under founder-specific copy. Both exclusions required. Confirmed.
- **`applyStage` edge algebra** (block 0 always entered, block N−1 never exits, posters summing to 1) — I re-derived it; it is correct with no branches.

---

## Wrong / missing — ordered by severity

### 1. `MAX_COUNT_BY_TIER.full: 48000 → 72000` is NOT "monotone-safe"

**File:** `src/webgl/FounderPortraitMorph.tsx:83-86`, and the plan's §2 claim *"Raising the ceiling is monotone-safe: it cannot make anything worse."*

That is false, and the disproof is in the same file. `count` feeds `spacingDev`:

```ts
// FounderPortraitMorph.tsx:448-457
const areaDev = sr.width*dprNow * sr.height*dprNow * STAGE_FILL*STAGE_FILL;
const spacingDev = Math.sqrt(Math.max(areaDev / count, 1));
const discDev = spacingDev * 2.1;
const defPointSize = THREE.MathUtils.clamp((discDev*CAMERA_Z)/(dprNow*1.05), 10, 96);
```

Raise the ceiling → stride stays 1 → `count` goes 42k → ~57k → `spacingDev` drops ~14% → `defPointSize` drops ~14% → and `PORTRAIT_COV_MIN_PX = max(1.25, 0.35·spacingDev)` (`gpgpuNodeSim.ts:1214-1217`) moves with it, re-tuning the sub-pixel coverage knee. **Alessandro's and Michele's rendered faces change even though nothing about their assets changed.** It is a *smaller-disc-denser-lattice* trade, not a no-op. It also permanently adds ~35% compute invocations plus three more storage buffers (`homeC` real, `colorC`, `sizeC`) on a per-frame dispatch.

**Correction:** state the ceiling raise as a deliberate density change, and add to §12A a before/after capture of `getUniforms().pointSize` and `getSampler().count`, not just `stride`. If the face reads softer, the correct lever is shrinking the grid (`scale = sqrt(52000/sharedCells)`) so `count` lands back near 42k — which the plan lists only as a fallback but should be the *default* preference.

### 2. The plan's own acceptance criterion for `meanInk` is mathematically guaranteed to fail

**Plan §12A:** *"`meanInk[0]` and `[1]` must be within ~5% of their pre-change values… If they moved, revert."*

`meanInk` is `sum(pt.ink[i]) / count` over the **union** cell list (`FounderPortraitMorph.tsx:772-776`). Adding Mattia grows the union with cells where Alessandro and Michele have `ink = 0` (`sampleImagePoints.ts:373-374` emits them at 0). If the union goes 42,087 → 57,000, Alessandro's mean ink drops by exactly the ratio 42/57 ≈ **−26%**, with zero change to his sampled pixels.

**Correction:** the invariant is not mean ink, it is *summed* ink: assert `Σ ink` for portraits 0 and 1 is unchanged within ~1%, or report `meanInk` over cells with `ink > inkCut` only. As written, this check will trigger a false revert.

### 3. The extent regression is diagnosed on the wrong axis

**Plan §2/§5f/§12A** guards only the X-flip condition `max(halfX) > 0.75 · max(halfY)`.

But `halfExtentY` is computed the same way, from the same `ink > extentInk` (0.15) set (`sampleImagePoints.ts:375-378`), and the caller takes the **max across portraits** (`:371-372`). A navy jacket that saturates `dist` still clears `extentInk` well down the frame: at `ny ≈ 0.70`, with `fadeStart 0.62 / fadeSpan 0.32`, the dissolve factor is ≈ 0.55, so `ink ≈ 0.55 ≫ 0.15`. The other two's white shirts never clear 0.15 at all. So `max(halfExtentY)` very likely grows too — and because the fit is **Y-bound today**, `worldPerGrid = min(scaleX, scaleY)` drops **directly**, shrinking all three faces with no X-flip ever occurring.

The plan's remedy list is gated on the X condition, so it would sail past the actual regression.

**Correction:** the acceptance gate must be on the absolute rendered size, not the aspect ratio. Record `worldPerGrid` (or `__sersanFounderMorph.bbox()` height at rest, stage A) before and after; require it unchanged within ~2%. If `max(halfExtentY)` grew, the fix is the asset (crop Mattia's frame so the jacket sits below the dissolve) or raising `fadeStart`'s effect on him — not lowering `fadeStart` globally, which the plan suggests and which would shrink *everyone's* bust.

### 4. `hasPortraitSizeC` can dereference a null `portraitMorph2Expr`

**Plan §5 (2b/2c).** As written:

```ts
const hasPortraitC     = !!portrait?.colorsC;
const hasPortraitSizeC = hasPortraitSize && !!portrait?.sizeC;
const portraitMorph2Expr = hasPortraitC ? smoothstep(...) : null;
const portraitInkExpr = hasPortraitSize
  ? hasPortraitSizeC ? mix(..., portraitMorph2Expr!) : ...
```

Pass `sizeC` without `colorsC` and `portraitMorph2Expr` is `null` while `hasPortraitSizeC` is `true` → the `!` lies and the build throws. The plan spends a doc comment insisting the two must be passed together, then leaves the gate that can violate it.

**Correction:** `const hasPortraitSizeC = hasPortraitC && hasPortraitSize && !!portrait?.sizeC;`

### 5. `MORPH_MAX` is uncapped while `STAGE_ORDER` is capped at 4

**Plan §7 (4a).** `STAGE_ORDER` is documented "HARD CAP 4" but `STAGE_TOTAL = founders.length` and `MORPH_MAX = STAGE_TOTAL - 1` are derived uncapped. Add a fifth person and `stageFromMorph` returns `STAGE_ORDER[4] === undefined`, typed as `FounderStage`, silently poisoning `store.stage`. The island's `TARGET_COUNT = Math.min(founders.length, 4)` caps correctly; the store does not.

**Correction:** `export const STAGE_TOTAL = Math.min(founders.length, STAGE_ORDER.length);` — and then the counter denominator in the JSX must use `STAGE_TOTAL`, not `founders.length`, or the two disagree.

### 6. The `stack` open question (§11.1) is moot — and its stated reason is factually wrong

**Plan §11.1:** *"`FounderPanel` guards on `f.stack?.length`, so omitting it degrades cleanly (no 'Ships with' block). Ask Mattia directly."*

`FounderPanel` (`founders-rail.tsx:264-500`) **never renders `stack` at all**. Repo-wide, the only consumer of `stack`, `expertiseEn/It` and `badges` is `who-and-why.tsx:255-261` — the dead file the plan itself correctly identifies as orphaned:

```
src/components/sections/who-and-why.tsx:255:  {f.stack && f.stack.length > 0 && (
src/components/sections/who-and-why.tsx:258:    {isEn ? "Ships with" : "Lavora con"}
```

So `stack`, `expertise*` and `badges` have **zero live render surface**. Omitting `stack` is correct, but it is not a product question and should not be escalated to the boss as one. (`badges` and `expertise*` are required by the interface, so Mattia's entry still needs them — with the note that their content is currently unreachable.)

### 7. "This is already shipping" is overstated in the one way that matters

**Plan §0/§1.** True that `HeroTextParticles.tsx:340-349` runs a real 3-target chain. But the hero opens leg 2 at **`morphTRef.current >= 0.95`**, not 1.0 (`:542`). So production does *not* enforce the plan's headline invariant — it deliberately overlaps by 5%.

That does not make the plan wrong (a 5% overlap on abstract text motes is invisible; on a face it would visibly cut the A→C corner and skip Michele). But the plan cites the hero as precedent for the discipline it is about to introduce. Keep the single-progress-scalar design; drop the "already proven" framing so nobody "aligns with the hero" later by copying the 0.95 gate.

### 8. Unverifiable pixel claims presented as measured

**Plan §0/§2** asserts *"Decoded all three headshots… Mattia's backdrop is pure white and background-removed… jacket `dist` ≈ 0.81 … union expected 50–62k."*

What I can verify: all six assets are **1200×1800 lossy `VP8` with no alpha channel** — so nothing is literally "background-removed" in the transparency sense; at best it is composited to flat white and then lossily encoded, which puts JPEG-class ringing right where `BG_FILL_TOL = 0.055` walks. I cannot reproduce the ink numbers (no image decoder in this repo's toolchain), and neither, I suspect, could the plan author from a static read.

The plan then contradicts itself in §12A by instructing "Measure FIRST, before tuning anything." Both cannot be true.

**Correction:** demote every ink/cell figure to an *estimate*, and make the ceiling value a **post-measurement decision**: land the code with `full: 48000` unchanged, run `getSampler()`, then set the ceiling (or the grid) from the real `sharedCells`. Shipping a speculative 72000 and a speculative grid comment is how a silent global shrink gets merged.

### 9. Minor but concrete

- **§5j vs §5h use two different clamp forms.** `applyMorph` uses `clamp(p,0,1)`; the frame loop uses `Math.min(p,1)`. Harmless (p ≥ 0 always) but pick one — `applyMorph` should be the single writer, called from the frame loop too, or the two drift.
- **§5h leaves `built.uMorph2.value = 0; built.uMorph3.value = 0;` at `:506-507`** immediately before `applyMorph` overwrites them in all three branches. Dead lines; delete them or the next reader assumes they matter.
- **Block 0's children were previously never touched by GSAP.** Today only `copyB`'s children get `gsap.set` + quickSetters (`:624-641`); `copyA`'s children are untouched DOM. The plan now arms and writes per-frame setters on block 0's children too. Functionally identical output (`e` saturates at 1), but it is a new per-frame write set and a new `clearProps` on teardown. Say so explicitly — "the A→B leg is byte-identical" is true of the *values*, not of the *writes*.
- **`G_MAX_ENGAGE_MS` force-release can fire mid-leg.** `release(lastDir)` at `:1121` does not touch `morphTarget`, so the island keeps auto-playing to its target while the page scrolls away. Pre-existing, but with 3 legs and a 24s window it goes from unlikely to plausible. The plan flags the timer in §11.8 but not this specific mid-flight artifact.
- **`noUncheckedIndexedAccess` is off** (`tsconfig.json`), so the plan's sparse `blocks: BlockFx[]` will type-check without the `if (b)` guard. Keep the guard; TS will not enforce it for you.

---

## Bottom line

The architecture is right: single progress scalar 0..MORPH_MAX, derived stage, leg-local `env` and copy windows, N-ary sampler, bounds-check `step()`. That core is correct and I found no flaw in it.

The failure mode is the **sampling budget**, where the plan is confident about numbers it cannot have measured, picks a ceiling value on that basis, guards the wrong extent axis, and writes an acceptance criterion (`meanInk` ±5%) that is arithmetically guaranteed to fire a false revert. Fix items 1–3 and 8 before anyone touches `MAX_COUNT_BY_TIER`, fix 4 and 5 as one-line corrections, and delete §11.1.
## Verdict

The plan is unusually well-researched — the engine analysis (chained `target.assign(mix(target, hC, …))`, the `uMorph → 1` precondition, the colour/ink-not-chained trap, the varying hazard, the swizzle rules) is **correct and I verified all of it against the real code**. The store/gate/DOM generalisations are algebraically sound; I checked the poster sum, the counter midpoint flip, the `legFract` envelope continuity and the block-0/block-N edge cases and they all hold.

But three of its empirical claims are **wrong**, and I measured the actual numbers to prove it.

---

## P0 — The extent analysis is inverted. The fit is ALREADY X-bound.

**Plan §2(b) / §8 5f / §12.A:** *"Today the fit is Y-bound… If Mattia crosses that threshold, all three faces shrink"*, with a checklist gate `max(x) ≤ 0.75 × max(y)` and remedies (lower `fadeStart`, re-crop the jacket).

I reimplemented `readGrid`/`emit` exactly (`sampleImagePoints.ts:166-389`, same cover-crop, same top-corner median, same `BG_FILL_TOL` flood fill, same ink curve) at the shipped `290×405` / `SAMPLE_SPEC_BASE`:

| | halfExtentX | halfExtentY |
|---|---|---|
| Alessandro | 136.5 | 134 |
| Michele | 129.5 | 137 |
| **Mattia** | **140.5** | **145** |

Today: `max(x)=136.5`, `0.75 × max(y) = 0.75 × 137 = 102.75`. **136.5 ≫ 102.75 — the fit is X-bound today, by a wide margin, and has always been.** (Grid half-width is 145, so the 99th-percentile |x| is essentially saturated at the frame edge for all three — it is measuring shoulders, not faces.)

Consequences:
- The checklist gate `max(x) ≤ 0.75 × max(y)` **fails today, before any change**. Anyone running §12.A as written will conclude the change broke the fit and start "fixing" `fadeStart` on a healthy build.
- The real effect is not a flip but a **uniform ~2.9% shrink** of all three faces (`worldPerGrid` scales by `136.5/140.5 = 0.9715`). That is small enough to ship, but it must be stated as "expect a ~3% shrink, it is X-bound and always was", not as a threshold to watch.

**Correction:** delete the flip framing. Replace the checklist row with: *"`max(halfExtentX)` should read ≈140.5 (was 136.5). The fit is X-bound in both cases; expect all three faces ~3% smaller. If that is unacceptable, re-export `mattia-headshot.webp` with narrower shoulders — do NOT touch `fadeStart`, which would change ink for all three."*

---

## P0 — The `meanInk` regression check is mathematically guaranteed to false-alarm.

**Plan §12.A:** *"`meanInk[0]` and `[1]` must be within ~5% of their pre-change values… If they moved, the shared spec changed something it shouldn't have. **Revert.**"*

`getSampler().meanInk` (FounderPortraitMorph.tsx:772-776) averages `ink[]` over the **union cell list**. §2 correctly establishes that the union grows — so the denominator grows while each portrait's ink mass is unchanged. The mean **must** fall. Measured:

```
meanInk over AB union : A 0.369  B 0.390
meanInk over ABC union: A 0.288  B 0.305   ← −22%, −22%
```

A −22% move against a "±5% or revert" gate will trigger a revert of a completely correct change.

**Correction:** either compare `meanInk[k] × count` (total ink mass, which *is* invariant), or change `getSampler()` to report `meanInkSubject` = mean over cells where that portrait's own `ink > inkCut`. The latter is more useful and is a two-line change in the same block being edited anyway.

---

## P1 — The budget numbers: the plan's conclusion is right, its arithmetic is unverified. Here are the real ones.

Measured union counts (my resampler reads ~7% higher than canvas `drawImage`, so scale accordingly — the shipped comment says 42,087 where I get 45,241 for the pair):

```
A∪B   = 45,241   (shipped calibration: 42,087)
A∪B∪C = 58,154   → scaled to the canvas pipeline ≈ 54,100
```

So:
- **The ceiling raise is genuinely mandatory.** ~54k against the 48,000 ceiling → `stride = Math.ceil(54100/48000) = 2` → count halves to ~27k for all three faces. Confirmed exactly as the plan predicted.
- **72,000 is adequate** with ~25% headroom. Not gratuitous.
- The plan's guessed range "50–62k" was right. Replace it with the measured 54k in the comment so the next person doesn't have to re-derive it.

Cost sanity (the plan doesn't state it): at 54k instances the build allocates 10 padded `vec3` storage buffers (`position`, `velocity`, `homeA..homeD`, `start`, `colorA/B/C`) ≈ **8.6 MB** plus the float buffers. Fine. `spacingDev = sqrt(areaDev/count)` shrinks 12%, so `defPointSize` (FounderPortraitMorph.tsx:452-456) drops ~12% and stays well inside the `[10, 96]` clamp. No overflow anywhere.

---

## P1 — Unflagged visual risk: Mattia's torso will not dissolve.

The plan treats the navy jacket purely as a **budget and extent** problem. It is also a **look** problem, and this one is visible in the final render.

Measured `dist` from the backdrop:

| | backdrop | torso | `dist` | ink after the curve |
|---|---|---|---|---|
| Alessandro | (235,237,238) | white polo | ~0.02 | ≈0.03 (at `inkCut`) |
| Michele | (239,238,241) | white shirt | ~0.02 | ≈0.03 |
| **Mattia** | **(255,255,255)** | **navy (15-37, 24-43, 41-61)** | **≈0.91** | **saturates 1.0** |

Mean ink over the union: A 0.288, B 0.305, **C 0.590 — roughly double**.

`fadeStart: 0.62 / fadeSpan: 0.32` was tuned against subjects whose torsos are *already* at ink ≈ 0.03: the dissolve there is cosmetic, because the bust is near-invisible anyway. Mattia's jacket enters the dissolve band at ink 1.0 and only fades over `ny ∈ [0.62, 0.94]`. **Stage C will render as a head above a solid dark slab, where stages A and B render as heads fading into nothing.** That is a legible inconsistency in a three-beat sequence whose whole point is that the three faces are the same object re-forming.

This cannot be fixed with a threshold — the jacket and the beard/hair both saturate at ink ≈ 1.0, exactly the lesson `sampleImagePoints.ts:254-271` and MEMORY.md's *"separate the subject SPATIALLY, never by colour"* already record. The only clean levers are per-portrait `fadeStart` (which breaks the shared-spec invariant — do not) or **re-exporting `mattia-headshot.webp` cropped tighter to the head/shoulders, or with the jacket lightened**. That is a zero-code-risk asset change and it also fixes the 3% shrink in §1. Raise it with the boss alongside the `stack` chips question.

---

## P2 — Concrete errors in the edit instructions

**`pairRef` rename list is wrong (§8 5d).** Plan says *"ALL five sites: :334, :557-561, :762, :770, :843"*. Actual occurrences of `pairRef` are **:243, :313, :330, :562, :569, :762, :770** — the plan **misses `:562` (`pairRef.current = next`) and `:569` (`if (!pairRef.current) return` in the build effect)**, and `:843` contains no `pairRef` at all. TypeScript will catch the misses, but the plan asserts completeness, and `:569` in particular is the build-effect guard — worth naming explicitly. Same for `imgARef`/`imgBRef`: **:241, :242, :308, :309, :556, :557**.

**`STAGE_TOTAL` is not capped, `TARGET_COUNT` is (§7 4a vs §8 5c).** The plan writes `STAGE_TOTAL = founders.length` in the store but `TARGET_COUNT = Math.min(founders.length, 4)` in the island. At N=5 these silently disagree: `MORPH_MAX = 4` so the gate offers a fifth stage, while the engine only has `homeA..homeD` — `applyMorph(4)` pins `uMorph3` at 1 and the fifth person never appears. Make it `export const STAGE_TOTAL = Math.min(founders.length, STAGE_ORDER.length);` so the cap lives in one place. (Inert at N=3, but the plan explicitly sells `founders.length` derivation as the anti-drift mechanism — it should actually be one.)

**Dead writes left behind (§8 5h).** The plan replaces the `built.uMorph.value` writes at :518/:525 with `applyMorph`, but leaves `built.uMorph2.value = 0; built.uMorph3.value = 0;` at **:506-507** in place. `applyMorph` overwrites both a few lines later. Harmless, but it is exactly the kind of contradictory leftover that makes the next reader believe leg 2 is pinned off. Delete :506-507.

**Block-0 children now carry GSAP transforms (§7 7b).** Today Alessandro's children are never touched — only the block. The plan gives every block child writers, so `c.setY(COPY_ENTER_Y * (1 - e))` writes `transform: translate(0px, 0px)` onto each of Alessandro's five children every frame. Functionally fine (and it is already what Michele's children do today, so it is parity not novelty), but each child becomes a containing block — including the `<ul>` whose `<li>`s carry `backdrop-blur-sm` (`CHIP_CLASS`, founders-rail.tsx:186). Verify the credential chips still blur correctly at stage A. Cheap to check, silent if wrong.

---

## What I confirmed as correct and would not change

- **The chained-blend analysis and the `uMorph` must reach exactly 1 precondition.** `gpgpuNodeSim.ts:1008-1020` is verbatim as quoted; `m` saturates exactly at `uMorph=1` for `r→1`; deriving both uniforms from one scalar guarantees sequencing. `HeroTextParticles.tsx:340-349` does indeed pass `homeCWorld` into both the C and D slots and drives `uMorph`/`uMorph2` on separate clocks (:397, :490, :551) — the machinery is proven in production.
- **`colorsC` + `sizeC` are mandatory, not polish.** Verified: `portraitInkExpr` (:1176-1181) and `vMorphColorF` (:1337, :1371-1373) both read `morphN` alone, and ink gates `sizeNode` (:1313), the alpha knee (:1418), `cov²` (:1426-1431) and `Discard(alpha < 0.02)` (:1446). Without the shader extension Mattia renders as a Michele-shaped stencil. The proposed edits (2c/2d/2e) are correct, and rewriting `portraitInkExpr` in place is genuinely the cheap move — all three consumers inherit the chain.
- **The union-not-intersection reading** of `sampleImagePoints.ts:410-414` and the "adding a portrait can only grow coverage" conclusion.
- **`samplePortraitSet` reduces exactly to the shipped pair at N=2.**
- **`who-and-why.tsx` is orphaned.** Grep confirms: no file imports it. Leaving it alone is right.
- **`/contact` and `/start` must switch to `coFounders`.** contact-client.tsx:181 under a *"Talk to a founder"* heading (:178); start/page.tsx:106 under prose promising *"Read by one of the founders"* at both :58 and :90-91. Both real.
- **No JSON-LD / schema.org employee block exists** anywhere that iterates `founders` — I grepped `src/lib`, `layout.tsx`, `about/page.tsx`. Nothing to update beyond the plan's list.
- **`about-client.tsx` parallax is count-agnostic** (`portraitDriftRefs` written by index at :222-224, filtered at :32-35, one shared `y` at :62). No change needed, as claimed.
- **`measure()` needs no extra height** — `travel` is literally 0 (founders-rail.tsx:783-790) and the hold is `lenis.stop()` + the per-frame re-snap. The `G_MAX_ENGAGE_MS = 8000 + 8000*(founders.length - 1)` formula reproduces 16000 at N=2 exactly, and `founders` is already imported at :16.
- **The generalised `step()` bounds check**, `engage(MORPH_MAX)` from below, and the poster/counter/hairline math. I re-derived the poster sum at m ∈ {0, 0.5, 1, 1.5, 2} — it is exactly 1 at every point, no seam.
- **The `Math.round(morphRef.current)` rebuild seed** reproduces today's `>= 0.5 ? homeB : homeA` exactly.
- **Guard rails 1-10** are all real and correctly identified, including the `globalThis.__sersanFoundersMorph ??=` hard-reload trap and the singular/plural handle naming collision.

## One addition to the checklist

Add, before anything else: **hard-reload, then `__sersanFounderMorph.getSampler()` and assert `stride === 1` and `sharedCells ≈ 54,000 (±8%)`.** If `sharedCells` lands materially below 50k, the flood fill walked into Mattia's jacket from a side seed and deleted part of the torso — the exact `BG_FILL_TOL` failure the plan's §3e doc addendum describes but declares impossible. His `dist ≈ 0.91` against a 0.055 tolerance makes it very unlikely, but it is the one silent failure the count will catch for free.
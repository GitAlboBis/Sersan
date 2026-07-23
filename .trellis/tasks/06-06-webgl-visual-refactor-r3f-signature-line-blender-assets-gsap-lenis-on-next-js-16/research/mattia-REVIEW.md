I have verified every load-bearing claim against the real files, including the pre-change baseline via `git show HEAD:`. Here is the merged list.

---

# Ranked fix list — founders morph, 3-target chain

29 candidates → 18 confirmed → **13 distinct defects** after dedup. Three separate lenses found the morph-clock defect independently; two found the `TARGET_COUNT` cap; two found the `/about` CTA label; two found the mid-leg release.

---

## P0 — must fix before commit

### 1. The morph clock never settles on an interior target (Michele)
**`src/webgl/FounderPortraitMorph.tsx:795-806`**
*(merges three findings: "morph clock overshoots any INTERIOR target", "settle condition silently destroyed by widening the clamp", "lost its termination condition")*

**What is wrong.** The step is clamped to `[0, MORPH_MAX]`, not to the target. I confirmed against `git show HEAD:` that the old code clamped to `[0, 1]` while the only targets were `{0, 1}` — every target coincided with a clamp bound, so the final step was clipped exactly onto it and `cur !== target` went false. `MORPH_MAX` is now 2 (`foundersMorphStore.ts:96`), so target 1 is interior and nothing catches the overshoot. **This is a regression created purely by the existence of a middle stage.**

**What the user sees.** Park on Michele. Step = `delta/1.4` ≈ 0.0119 at 60fps, so the clock enters a permanent 2-frame limit cycle 0.9909 ↔ 1.0028. Four silent consequences, all at the middle founder only:
- `env = sin(legFract(gc)·π)` alternates ~0.0088 ↔ ~0.0286 every frame instead of being 0. With `DOLLY = 2.2` and `ORBIT_MAX = 0.7` that is a 60Hz shimmer in dolly and yaw on a face that is supposed to be dead-still. Alessandro and Mattia sit at clamp bounds and are genuinely still — so the jitter appears on Michele alone, falsifying the module's own "EXACTLY neutral at EVERY locked stage" comment at `:817`.
- `applyMorph` sets `uMorph2 = clamp(p-1,0,1) = 0.0059` on alternate frames. **The stated core invariant — uMorph reaches exactly 1.0 before uMorph2 leaves 0 — is violated at rest.**
- `setMorph` fires every frame (Δ 0.0119 ≫ the 1e-4 guard at `:813`), so `founders-rail.tsx:897` re-runs `applyStage` — the full quickSetter sweep over three copy blocks and three posters — forever, while the user simply reads.
- `delta` is capped at `1/30` (`:745`), so at ≤30fps the step (0.0238) exceeds `LOCK_EPS` (0.02) and `stageFromMorph` flickers B↔"morphing". `step()` absorbs outright while morphing (`:1041`), so the accumulator can never reach `G_TRIGGER_PX` and the page is held until the safety valve. This half is phase-dependent, not certain — one reviewer overstated it as guaranteed below 36fps.

**Exact fix.** Replace the else-branch step:

```ts
const target = store.morphTarget;
const cur = morphRef.current;
if (cur !== target) {
  // UNCHANGED RATE: one unit of the scalar IS one leg, so MORPH_DURATION stays
  // PER-LEG and the shipped feel is preserved exactly. Clamp toward the TARGET,
  // not the rail bounds: with MORPH_MAX = 2 the target may be interior (1 =
  // Michele), where a bounds-only clamp overshoots and limit-cycles forever.
  const step = delta / MORPH_DURATION;
  morphRef.current =
    target > cur ? Math.min(cur + step, target) : Math.max(cur - step, target);
}
```

Keep `const gc = THREE.MathUtils.clamp(morphRef.current, 0, MORPH_MAX)` at `:808` — it still guards the dev-override path. Every producer of `morphTarget` already bounds it (`step()` bounds-checks, `setStage` uses `Math.min(t, MORPH_MAX)`, `playMorph` clamps, `engage` passes 0 or MORPH_MAX), so terminating on the target adds no out-of-range risk.

**Verification (typecheck proves nothing here).** Park at B, poll `__sersanFounderMorph.getUniforms()` on consecutive frames: `progress` must read exactly 1 and `uMorph2` exactly 0 every time. Confirm `setMorph` goes silent. Then throttle DevTools CPU 6× and confirm `stage` reads a stable `"B"` and a down-gesture still advances.

---

## P1 — fix before commit

### 2. The safety valve ejects an engaged reader mid-sequence
**`src/components/sections/founders-rail.tsx:107` (const), `:964` (only assignment), `:1234` (only test)**

**What is wrong.** `G_MAX_ENGAGE_MS = 8000 + 8000*MORPH_MAX` = 24000ms, measured from `engage()` and **never reset by user activity**. I confirmed `engageTime` occurs at exactly three sites; `consume`, `noteInput`, `step` and `release` all leave it untouched. The budget grew 50% while the required dwell grew 100%.

**What the user sees.** Three bios at realistic reading speed plus two 1.4s legs plus two 160ms re-arms exceeds 24s. At 24s `tick()` fires `release(lastDir)` and runs a 0.6s `scrollTo` one viewport down, yanking the section away mid-read. A slower reader who dwells >24s on Alessandro alone is scrolled past the whole section. Scrolling back up trips `fromBottom` → `engage(MORPH_MAX)` → lands on Mattia, so **the recovery path also skips the person they were reading**. That skip is new at N=3: with two stages every locked stage was an extreme end, so either re-entry was legitimate.

**Exact fix.** Make the valve measure *time without progress*, and reset it **only on real progress — never on raw input**:

```ts
// :107
const G_MAX_ENGAGE_MS = 20000;   // bounds SILENCE / no-progress, not total session
```
```ts
// :1046, inside step(), after the interior advance
s.setMorphTarget(next, false);   // interior → play one leg, STAY engaged
engageTime = performance.now();  // real progress re-arms the safety valve
armed = false;
```

Leave `:964` as the initial arm and `:1234` unchanged. **Do not** add a reset in `consume()`/`noteInput()` as one reviewer proposed — `step()` early-returns on `!s.assembleDone` (`:1041`), so in the wedge case the timer exists to escape, the user wheels continuously and nothing advances; resetting on input would pin the page forever. The scrollbar-fight case is already covered independently by the `drift > 15%` release at `:1224`.

**Side benefit worth a comment:** the timer can no longer expire during the 1.4s a leg is in flight, which largely closes item 10 below.

### 3. Mattia's bio asserts a system scope the source does not contain
**`src/data/founders.ts:146-153`** (`shortBioEn`, `shortBioIt`, `bioEn`, `bioIt`)

**What is wrong.** All four fields assert the L'Ultima Spiaggia system was a *"maintenance and inventory management system"* / *"covering maintenance operations and inventory tracking"* / *"per la gestione della manutenzione e il tracciamento dell'inventario"*. No in-repo record supports it. `mattia-CORRECTIONS.md:22-24`, written expressly to inventory the sourced facts, enumerates: *campsite-resort information system: requirements analysis, logical + physical DB modelling, UI design, full lifecycle*. No maintenance, no inventory. The phrase originates in `mattia-PLAN.md:210-217` and was laundered into "sourced" status by `CORRECTIONS.md:28` ("Ship the plan's §4c entry as written"), whose own list two lines earlier does not contain it. This is the same class of invention as the `stack` chips the implementers correctly omitted — it just moved from chips into prose.

**What the user sees.** A specific, externally checkable product claim about a named third-party company, attributed to a named real person, on `/about` (`about-client.tsx:286` renders `bioEn/It`) and the home rail (`founders-rail.tsx:246` renders `shortBioEn/It`), in two languages. Direct violation of AGENTS.md §6 *"Non inventare contenuti."*

**Exact fix.** Strip the clause and **repair the punctuation the deletion breaks** — in `bioEn/bioIt` the deleted clause carries the colon that introduces the four sourced lifecycle phases, so the preceding comma must be promoted to a colon or the phases become a comma splice:

- `shortBioEn` → `"Designs and builds internal systems end to end — requirements, data model, interface, delivery. Shipped the information system for a campsite resort, from formal requirements analysis through to the running software."`
- `shortBioIt` → `"Progetta e realizza sistemi gestionali interni dall'inizio alla fine: requisiti, modello dati, interfaccia, rilascio. Ha realizzato il sistema informativo di un villaggio turistico, dall'analisi formale dei requisiti fino al software in esercizio."`
- `bioEn` → `"...he designed and built the information system for a campsite resort: formal requirements analysis, logical and physical database modelling, interface design, and implementation across the full software lifecycle. ..."`
- `bioIt` → `"...ha progettato e realizzato il sistema informativo di un villaggio turistico: analisi formale dei requisiti, modellazione logica e fisica della base dati, ..."`

Also correct the origin so a future agent does not re-derive it: `mattia-PLAN.md:210-217` and `mattia-spec-island.md:37`. If the scope is real it must come from the user or Mattia with provenance, not from an implementer.

---

## P2 — decide before commit (not a code defect)

### 4. "No layer of juniors" now shares surfaces with a 2026 graduate
**Five sites, corrected list — the original finding named four and got one of them wrong:**

| file | line | string |
|---|---|---|
| `src/app/consulting/consulting-client.tsx` | 211 / 218 | **page H1**: "Senior engineering. No layer of juniors." / "Ingegneria senior. Nessuno strato di junior." |
| `src/components/sections/services-section.tsx` | 629-630 | "Every engagement is **delivered by senior engineers** from scoping to handover" |
| `src/app/about/about-client.tsx` | 95-96 | pillar 01, "No layer of juniors between you and the engineer" |
| `src/components/sections/founders-rail.tsx` | 1571-1572 | "no junior bench" / "nessuna panchina di junior" |
| `src/app/about/about-client.tsx` | 168-169 | trailing "No layer of juniors between you and the people doing the work" |

The consulting H1 is the loudest instance on the entire site and was missed. On `services-section.tsx:629` the exposed clause is **"delivered by senior engineers"**, not the "no junior bench" half the reviewer flagged — that is the only string that goes literally false the moment Mattia is staffed on client work.

**This is a positioning decision, not a bug.** `CORRECTIONS.md` C13 explicitly reserves it for the user. Do not auto-edit. Ask the one question that settles it: **is Mattia staffed on client engagements, or internal-only?**
- Internal-only → change nothing; the promise is about who is on the client's engagement.
- Client-facing → reframe substitution rather than seniority, EN + IT, all five sites, same commit: *"No account layer. No team you didn't meet."* / *"Nessun livello di account. Nessun team che non avete incontrato."* — and specifically soften `services-section.tsx:629` from "delivered by" to **"led by senior engineers"** / "guidato da ingegneri senior", which stays true with a third engineer executing under them.

Leave `about-client.tsx:168`'s "Both founders senior. Both staffed on every engagement." alone in either case — already correctly scoped by C9, and the elliptical second "Both" inherits `founders` normally. Leave `founders-rail.tsx:1546` ("Founder-led AI engineering studio") alone — a founder-led studio with one hire is still founder-led.

---

## P3 — fix now if cheap, otherwise same-day follow-up

### 5. Home rail CTA promises "founder bios", destination is now "The team"
**`src/components/sections/founders-rail.tsx:1613`** *(merges two findings)*

The rail shows three people at 03/03; the CTA under it reads "Full founder bios" → `/about`, whose eyebrow this same diff changed to "The team" (`about-client.tsx:143`) and H1 to "Three operators." This is a missed site in a contract *this diff created* (`founders.ts:14-19`: any surface saying "founder" must iterate `coFounders`). Grep confirms `:1613` is the only occurrence.

**Fix:** `{isEn ? "Full team bios" : "Bio complete del team"}`

Flag but do **not** silently apply (the corrections doc deferred these to the user): `footer.tsx:79` `label: "Founders"` → candidate `"Team"`; `public/llms.txt:43` "founders, thesis" → "team, thesis".

### 6. Island never goes live → two of three people invisible and out of the a11y tree
**`src/components/sections/founders-rail.tsx:547-554` (canMorph), `:910` (posterGrace)**

`canMorph` is true as soon as `backend === "webgpu"`, so the morph branch renders. If the island then fails for any non-backend reason — one of three `loadFounder` promises rejecting (`Promise.all` at `:395` is all-or-nothing), or any single `readGrid` returning null (which makes `samplePortraitSet` return null for the whole set) — `setActive(true)` is never reached and `morph` stays 0. `applyStage(0)` leaves blocks 1 and 2 at `visibility: hidden` and posters 1/2 at opacity 0. Michele's and Mattia's names, bios and LinkedIn links are unreachable to mouse and screen reader. The third target added a third independent failure input to a path with no per-target degradation.

**Fix — latch on "never went live", not on the instantaneous `active` flag** (the island's build cleanup at `FounderPortraitMorph.tsx:732` calls `setActive(false)` on *every* rebuild, so a resize-triggered rebuild in flight at the 4s mark would eject a healthy morph):

```ts
const everLiveRef = useRef(false);
const [morphFailed, setMorphFailed] = useState(false);
// in the existing store subscription (~:884):
if (s.active) everLiveRef.current = true;
// posterGrace timeout at :910:
if (!everLiveRef.current) setMorphFailed(true);
// canMorph predicate at :547-554:  … && !morphFailed
```

The gate effect is already keyed on `[canMorph]`, so its cleanup restores `lenis.start()`, `setPinned(false)` and the section height automatically, and the render falls through to the horizontal rail, which renders everyone as real focusable DOM.

**Do not** use the proposed `Promise.allSettled` + partial-target-set alternative: `MORPH_MAX`/`STAGE_TOTAL` are derived statically from `founders.length` with no island→rail channel, so a 2-target island under a 3-stage DOM gate would drive `uMorph2` toward a target that was never uploaded — corrupted render instead of missing content.

### 7. Entry from below snaps the whole rail A→C in one frame
**`src/components/sections/founders-rail.tsx:1254, 1262`; `src/webgl/FounderPortraitMorph.tsx:791-794`**

`fromBottom` requires `prevTop < 0 && top >= 0`, and the section is exactly one viewport tall, so during an upward approach the section is fully visible and un-pinned for a whole viewport with `morph` at 0 (Alessandro on screen, copy block 0 visible, counter 01). The instant `top` crosses 0, `engage(MORPH_MAX)` → `setMorphTarget(2, true)` → the island hard-assigns `morphRef.current = 2` with no tween. Face, copy block, hairline `scaleX` (0→1) and counter (01→03) all snap in one frame; the chrome then fades in over 0.5s *on top of an already-completed jump*. At N=2 this jumped one leg; now it jumps the full rail.

**Fix — keep the instant entry-side lock but move the jump off-screen**, where the island culls the group (`group.visible = false`, `uFade = 0`). In `tick()`'s non-engaged branch, before the reveal line:

```ts
if (live.active && !reBlocked) {
  if (rect.bottom <= 0) {            // user BELOW → next entry is fromBottom
    if (live.morphTarget !== MORPH_MAX) live.setMorphTarget(MORPH_MAX, true);
  } else if (top >= ihNow) {         // user ABOVE → next entry is fromTop
    if (live.morphTarget !== 0) live.setMorphTarget(0, true);
  }
}
```

`engage()`'s `setMorphTarget(initIndex, true)` then becomes a genuine no-op in both directions. The two conditions are disjoint and mutually exclusive with any on-screen state, so no one-shot flag is needed and it cannot fight a normal downward approach. **Do not** use the originally proposed guard `top > 0 && prevTop < top` — on an approach from below `top` is *negative*, so it never fires; the state it actually selects is a user *above* the section scrolling away, and pre-positioning there would introduce a new C→A pop on the common downward path.

### 8. `TARGET_COUNT` allows a 4th target the colour/ink chain cannot render
**`src/webgl/FounderPortraitMorph.tsx:237` + `src/webgl/store/foundersMorphStore.ts:90, 96`** *(merges two findings; the second cited `gpgpuNodeSim.ts:971-984`, which is the wrong anchor — the enabling code is these two)*

`TARGET_COUNT = Math.min(founders.length, 4)`, `homeD = homes[3] ?? homeC`, and `applyMorph` unconditionally drives `uMorph3` — but `portraitInkExpr` (`gpgpuNodeSim.ts:1230`) and the fragment colour chain (`:1446`) deliberately stop at C. Add a fourth person and the kernel moves particles to face D's positions while `base` stays on `colorCBuffer`; ink gates disc size, the alpha knee, coverage and the alpha `Discard`, so cells that are subject in D but backdrop in C are culled — **the fourth face renders as a Mattia-shaped stencil.** Latent (needs a `founders.ts` edit), but N=4 is the one arity that is neither rendered correctly nor truncated, and the comment at `:237` actively misdirects by naming the *position* cap as if it were the *renderable* cap.

**Fix — one shared, enforceable cap; both edits are mandatory or it degrades into a dead leg instead of a stencil:**

```ts
// foundersMorphStore.ts — the wiring ceiling, distinct from the engine ceiling
export const WIRED_TARGETS = 3; // colour/ink chain reaches C only — there is no
                                // colorsD/sizeD in PortraitMorphOpts
export const MORPH_MAX = Math.min(founders.length, WIRED_TARGETS) - 1;
```
```ts
// FounderPortraitMorph.tsx:237
const TARGET_COUNT = MORPH_MAX + 1;
```

Tying `TARGET_COUNT` to `MORPH_MAX` also protects the `imgs.length < TARGET_COUNT` early return at `:696` from silently disabling resampling if a 4th headshot asset is absent. Add a dev-only `console.warn` when `founders.length > WIRED_TARGETS` so truncation is visible rather than mute.

### 9. WebGL2-fallback sessions decode and grid-sample three portraits, then discard all of it
**`src/webgl/FounderPortraitMorph.tsx:391-392`** (load effect), **`:440-447`** (probe)

`Scene.tsx:327` mounts the island on the build-time `webgpuEnabled()` flag, not the runtime backend. The load effect gates only on that flag, fetches all three headshots (~330KB) and runs `samplePortraitSet` — three `readGrid` passes over a 290×405 grid plus three `emit` passes over ~47.6k cells, on the main thread — and only *then* reaches the true-WebGPU probe and bails. Pre-existing structural miss; this diff adds one image (+50% sample work, +16% bytes). One-shot mount cost, not per-frame.

**Fix.** Import `backendOf` from `./renderer/createRenderer` (it already implements the identical probe, and its doc comment at `:126` explicitly requires the island probe to mirror it) and guard the load effect only:

```ts
useEffect(() => {
  if (!webgpuEnabled() || backendOf(gl) !== "webgpu") return;
  …
}, [maxCount, gl]);
```

Then replace the duplicated inline probe at `:440-447` with the same call so the two cannot drift. **Do not** add the guard to `resampleNowRef` — dead code there (`:696` already returns on `imgs.length < TARGET_COUNT`).

⚠️ **Safety precondition, re-check if renderer construction ever changes:** this is only correct because `createWebGPURenderer` awaits `renderer.init()` (including the `forceWebGL` retry) before R3F mounts children, so `gl.backend` is resolved when the effect runs. The load effect never re-runs — a false negative would be a permanently blank morph on real WebGPU machines, strictly worse than the waste. Do not substitute `tierStore.backend`; it is null until Scene's `onCreated`.

### 10. Mid-leg release leaves the island auto-playing on a section the gate declared finished
**`src/components/sections/founders-rail.tsx:1002-1024`** *(merges a confirmed P2 and a refuted P3 — same mechanism, and the refutation is right on the outcome)*

`release()` provably never writes `morphTarget`, and the island's clock has no reference to `gateEngaged`. Escape (`:1129`), the drift valve (`:1224`) or the max-engage valve (`:1234`) firing mid-leg leaves the cloud dissolving for the 0.6s scroll-away. The refuting reviewer is correct that the leg then *completes* and lands on a locked, consistent stage — the claimed "inconsistent state" does not occur, and it self-heals on the next `engage()` (which passes `immediate: true`). It is a visible unowned animation, nothing more. `CORRECTIONS.md` C12 explicitly defers it.

**Recommendation: defer, and fix the comment instead.** The P1 fix above removes the largest entry point (the timer can no longer expire mid-leg), leaving only Escape and drift. The comment at `:103-106` should be updated to say the leg completes forward at a locked stage rather than implying a broken state.

If you do want it closed, **freeze — do not round**:
```ts
s.setMorphTarget(THREE.MathUtils.clamp(s.morph, 0, MORPH_MAX), true);
```
`Math.round` + `immediate` (as both original proposals suggested) is wrong: at morph 1.4 it teleports the field back to 1.0 and hard-swaps the copy while the section is still fully on screen — a pop that reads worse than the dissolve — and at 1.6 it rounds to 2 and keeps auto-playing anyway. The freeze requires sanctioning a fractional `morphTarget` in the store doc (`foundersMorphStore.ts:46, :148`) and depends on `engage()` unconditionally reasserting `setMorphTarget(initIndex, true)` at `:975`.

### 11. `playMorph` mid-leg skips the stage it was travelling toward
**`src/webgl/FounderPortraitMorph.tsx:1010-1019`**

`Math.round(morphRef.current)` then ±1: called at progress 0.6, target becomes 2 and the cloud runs 0.6→2 without locking at Michele — the "never forms the middle face" outcome, reachable from the QA tool meant to prove the opposite. Contradicts its own docstring ("exactly ONE leg"; it advanced 1.4). Dev-handle only. The core invariant is not at risk — `uMorph2` is derived from the single scalar, so the cloud sweeps through Michele's geometry, it just does not dwell.

**Fix — apply *after* the P0 fix, and then the simple form is correct** (one reviewer proposed a `LOCK_EPS` snap; that was reasoning about the *unfixed* clock, where a "locked" stage rests at e.g. 0.994 and `Math.floor` would make the call a no-op. Once the clock lands exactly on integers, floor/ceil is exact in both the locked and mid-leg cases):

```ts
const p = morphRef.current;
const cur = dir >= 0 ? Math.floor(p) : Math.ceil(p);
const t = THREE.MathUtils.clamp(cur + (dir >= 0 ? 1 : -1), 0, MORPH_MAX);
```

### 12. `getSampler().meanInkSubject` thresholds against the frozen base spec
**`src/webgl/FounderPortraitMorph.tsx:934`**

`if (pt.ink[i] > SAMPLE_SPEC_BASE.inkCut)` reads a module-level frozen constant (0.03) while the cell list was built with `sampleSpec()` (base merged with `tuningRef.current`). `inkCut` is a reachable knob via `__sersanFounderMorph.resample`. After `resample({inkCut: 0.06})` the two disagree and the "stable, comparable number" C4 asked for silently is not comparable. Dev-only, QA readout only.

**Fix.** Hoist `const spec = sampleSpec(); const cut = spec.inkCut;` and test `pt.ink[i] > cut` — **and return `inkCut` in the readout**, because a threshold that follows `inkCut` is not invariant either; the real defect is that the number does not say which threshold produced it. Update the comment at `:920-924`: `meanInkSubject` is comparable to the published 0.550 baseline *only at the same `inkCut`*.

### 13. Comment accuracy — two "SSR contract" claims and one stale count
**`src/components/sections/founders-rail.tsx:~650, ~1702, :941`**

`canMorph` requires `detected`, set only in a client `useEffect`, so the morph branch never server-renders and never renders on the first client render. The inline `opacity: 0` on blocks `i > 0` is a **first-client-paint** guard covering the frames between the `canMorph` commit and the gate effect arming the children — not an SSR/hydration contract. Every *other* "SSR" reference in this file (`:67, :371, :514, :1627, :1751, :1786`) is accurate, describing the pinned/native branches that really are in the server HTML, so a maintainer would reasonably trust these two. The guard itself is correct and load-bearing; deleting it on the belief that SSR was removed would reintroduce a real flash of three overlapping copy blocks.

Separately, `:941` still reads *"two headshot fetches + decode, two 42k-point samples"* — now three of each.

**Fix:** reword both comments to "first-client-paint contract … this branch is client-only (`canMorph` depends on `detected`)"; drop the word "passive" (the effect in question is the gate effect, which is anything but). Leave `:714`'s chrome comment alone — same construct, but it does not misuse "SSR". Update `:941` to three.

---

## Merge gate (measurement, not a code change)

**`src/webgl/FounderPortraitMorph.tsx:102-140`** — the file's own comment still says **"STILL TO DO: confirm `sharedCells` once IN-BROWSER."** The 52000 ceiling rests on an offline port scaled by a 0.931 factor calibrated on the A+B pair. Run `__sersanFounderMorph.getSampler()` on a real WebGPU session and record `sharedCells`, `stride`, `count` before merging.

- If `stride > 1` (i.e. `sharedCells > 52,000`), the cloud halves for all three faces and reads as uniformly *soft* rather than obviously sparse — the regression that ships unnoticed. Rescale the grid by `sqrt(45000/measured)`.
- The `count` 41,996 → 47,636 growth shrinks every disc ~6% via `spacingDev = sqrt(areaDev/count)`, including Alessandro's and Michele's, with no asset change. One reviewer also claimed the coverage knee re-tunes — **it does not**: `PORTRAIT_COV_MIN_PX = max(1.25, 0.35·spacingDev)` and `vSizePxF` both scale linearly with `spacingDev`, so coverage is invariant while the `0.35·spacingDev` branch wins (it does at typical stage sizes). Only absolute disc size moves. Full-ink discs sit at ~1.7× spacing, so a 6% shrink still overlaps — cosmetic drift. **Do not** shrink the grid merely to claw back the 6%; that lowers sampling resolution for all three faces, which is worse.
- Also capture frame deltas at rest on stage A and across a full A→B→C (AGENTS.md mandates 60fps desktop; C5 asked for this and the plan has no such gate).

---

## Refutations I checked and agree with

I re-derived the decisive argument for each and found no resurrections:

- **Focus destroyed by the visibility latch** — the P2 severity rested entirely on a spurious `release()`, which needs a `focusin` with `target=body`. Browsers do not dispatch one when a focused subtree becomes `visibility:hidden`; only `blur`/`focusout` fire, and this file has no focusout listener. The stated direction was also wrong (`document.body.getBoundingClientRect().top` ≈ `-scrollY` < 0 at engage, so `dir` = -1, not +1). I confirmed via `git show HEAD:` that the latch is pre-existing verbatim at old lines 750/754. Residual: a link inside a hidden block does lose focus to `<body>` — a real WCAG 2.4.3 nit, unchanged from the shipped build, P4.
- **Block 0's children newly transform-driven breaking `backdrop-blur`** — `transform` is not in the Filter Effects L2 backdrop-root set, and decisively, `git show HEAD:` line 612 shows `gsap.set(copyA, { opacity: 1, y: 0 })` already put a transform on the chips' *ancestor* on main. The proposed `i > 0` guard would reintroduce exactly the first-end special-casing the leg-local math was designed to remove.
- **`maxAbsZ` flattening Alessandro and Michele 4-11%** — refuted by running the repo's own validated offline port: pair maxAbsZ 44.79, triple 45.00, `zNorm` ratio 0.9954. Michele already sits at 99.5% of the hard `depth/2` cap, so there is no headroom for Mattia to consume. Real flattening 0.46%, ≈1/20 of one particle spacing.
- **`who-and-why.tsx` booby-trap** — genuinely dead since baseline commit e970ea3, not part of this changeset. Note the refutation caught a real error in the *code comment* at `founders.ts:128-130`: `badges` has **zero** consumers anywhere, including inside who-and-why.tsx.
- **`initials: "MS"` collision** — "MS" is correct for Mattia Scattu; the proposed "MTS" would invent a middle initial. Zero consumers repo-wide.
- **`roleIt: "Software Engineer"`** — the house pattern keeps the English title token and translates only the trailing qualifier ("CPTO · Lead Tecnico"). Mattia's role is all token. "Ingegnere del Software" would also conflict with his own Italian bio on the same card.
- **"Co-author of"** — that is the *weaker* claim; the proposed "Published research:" reads as sole authorship and would overclaim more.
- **`badges`/`expertise` unsourced** — required by the interface and explicitly mandated by `CORRECTIONS.md` C2, with the comment C2 asked for.
- **"Both founders senior. Both staffed."** — ordinary elliptical inheritance, factually correct post-C9, and the whole `OurWhy` section renders between it and the three-card grid.
- **"no junior bench" as a code fix** — correctly a flag-to-user per C13; folded into item 4 with the corrected five-site list.

---

## Verdict

**Not safe to commit as-is.** One genuine P0 regression ships in this diff: widening the morph clock's clamp from `[0,1]` to `[0,MORPH_MAX]` silently destroyed its termination condition for the interior target, so Michele — the whole point of adding a middle stage — is the one stage that never settles. It violates the exact invariant this review was convened to protect (`uMorph2` leaves 0 at rest), shimmers the face, and burns a full `applyStage` GSAP sweep every frame forever while a user reads. Typecheck cannot see it and desktop QA at a locked 60fps will not notice it. Fix items 1-3 and it is **safe to commit**; item 4 is a decision only the user can make and should be answered in the same commit as any copy change. Nothing here needs rethinking architecturally — the single-progress-scalar design, the derived stage, and the leg-local envelope are all sound, and items 5-13 are polish, latent traps and comment accuracy that can follow. Before merging, actually run the in-browser `getSampler()` measurement the code's own comment still marks as outstanding; the stride-2 cliff is precisely the class of regression that ships unnoticed.
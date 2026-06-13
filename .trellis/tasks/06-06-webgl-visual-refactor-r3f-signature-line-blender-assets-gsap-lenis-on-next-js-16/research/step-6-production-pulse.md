# BEAT 1 — Line pulse on ProductionGrade (implementation plan)

- **Beat**: PIANO_RESTYLE.md §4 "ProductionGrade" + §9.6 "Beat interni": content UNCHANGED;
  the signature line passes BEHIND the 3 panels with a selective-bloom PULSE synchronized
  to each panel scan.
- **Date**: 2026-06-13
- **Versions verified**: next 16.2.6, three 0.184.0, gsap 3.15.0.
- **Scope**: file-level plan only. No implementation.

---

## 0. TL;DR of the resolution

**Cleanest signal channel = a NEW tiny dedicated store field, NOT sectionStore.pulse.**

Add a single transient float `linePulse` (0..1) to **`fxStore`** (already globalThis-pinned? — NO,
see §2.3, so we add a small dedicated store instead — decision below). The DOM panels (writers, in
the route bundle) bump it to 1 on each panel scan/in-view event; `SignatureLine.useFrame` (reader, in
the lazy WebGL island) reads it via `getState()`, decays it, and folds it into the SAME
`u.uEmissive` boost path the section-arrival pulse already uses — momentarily pushing the line
emissive above the bloom threshold near the production section. Works identically on the WebGL2
GLSL path and the WebGPU TSL node path because BOTH read `u.uEmissive.value` from the shared
uniform written in one place in `SignatureLine.useFrame`. Inert under reduced-motion (Canvas
unmounted at tier "off") and tier-off. No DOM copy/layout change.

**Why NOT sectionStore.pulse**: `sectionStore.pulse` is bumped once per *section arrival* (a new
`[data-line-anchor]` centers) and is decayed-back-written by `SignatureLine` itself. Hijacking it
for a per-PANEL (3-per-section) pulse would (a) fight the IntersectionObserver writer in SectionBus
that already owns it, (b) fire on every section everywhere (not just production), and (c) conflate
two semantics on one field. A dedicated field is cleaner and keeps sectionStore's single-writer
discipline intact.

**Why a new dedicated store and not just an fxStore field**: `fxStore` is the dev-tuning store; it
is read per-frame via `getState()` inside `SignatureLine`/`PostFX*` and is NOT globalThis-pinned.
The pulse is written by a ROUTE-BUNDLE component (production-grade-section.tsx) and read by the
LAZY WEBGL ISLAND (SignatureLine) — exactly the cross-bundle split that already bit textMorphStore
and sectionStore in prod (Turbopack inlines separate copies → writer/reader desync). So the pulse
field MUST live in a globalThis-pinned store. Cleanest: a new `productionPulseStore.ts` pinned on
`globalThis.__sersanProductionPulseStore`, mirroring the textMorphStore/sectionStore pin pattern
verbatim. (Putting it on fxStore would force pinning fxStore — a larger, riskier change touching
every fx reader — rejected.)

---

## 1. Exact files to EDIT / CREATE

### CREATE
| Path | Purpose |
|---|---|
| `src/webgl/store/production-pulse-store.ts` | NEW globalThis-pinned zustand store holding the transient per-panel pulse target + a `bump()` writer and `setPulse()` decay-writeback. ~45 lines, modeled 1:1 on `sectionStore.ts`'s pin block. |

> NOTE on filename casing: existing stores are camelCase (`sectionStore.ts`, `fxStore.ts`). The task
> asks for kebab-case for NEW files. The repo's WebGL store convention is camelCase. **OPEN DECISION
> (§7-D1)**: follow repo convention (`productionPulseStore.ts`) vs the task's kebab-case rule
> (`production-pulse-store.ts`). Recommendation: `productionPulseStore.ts` to match every sibling in
> `src/webgl/store/`. The plan below uses `productionPulseStore.ts`; swap if the main agent prefers
> kebab.

### EDIT
| Path | Change |
|---|---|
| `src/components/sections/production-grade-section.tsx` | Add the WRITER. The 3 panels already each run an `useInView`; TracePanel already runs a per-row scan rAF. Wire a `useProductionPulse().bump()` call (a) on each panel's `inView` false→true edge, and (b) optionally on the TracePanel scan landing on its `human.review` row (the load-bearing beat). No JSX/copy/layout change — only effect side-effects. Reduced-motion guard reused from the existing TracePanel matchMedia check. |
| `src/webgl/SignatureLine.tsx` | Add the READER. In the existing `useFrame`, read `useProductionPulseStore.getState()`, decay it like the section pulse (`THREE.MathUtils.damp(..., 0, 7, delta)`), write the decayed value back (same idle-skip discipline), and ADD a `productionPulseBoost` term into the existing `boost` sum BEFORE the `Math.min(..., 0.6)` clamp. Gate it to fire only near the production section (so the pulse never lifts the whole line on other routes/sections) — see §2.4. |

**No edits to** `PostFX.tsx`, `PostFXNodes.tsx`, `lineShader.ts`, `lineNodeMaterial.ts`,
`routeFxStore.ts`, `routeCurves.ts`, `scrollStore.ts`, `sectionStore.ts`, `Scene.tsx`, `globals.css`.
The pulse rides the EXISTING `uEmissive` uniform and the EXISTING bloom threshold — no new uniform,
no shader change, no bloom-config change, no mount change. This is deliberate: it minimizes conflict
with the other two beats (see §6).

---

## 2. Data / signal design

### 2.1 The store (NEW, globalThis-pinned)

`src/webgl/store/productionPulseStore.ts`:

```ts
import { create } from "zustand";

interface ProductionPulseState {
  /**
   * Per-panel pulse TARGET, 0..1. Bumped to 1 by the ProductionGrade DOM panels
   * (route bundle) on each scan/in-view beat; DECAYED toward 0 per-frame by
   * SignatureLine (WebGL island, via THREE.MathUtils.damp) which writes the
   * damped value back — the store holds the target, never a per-frame increment,
   * so the value stays render-loop-agnostic. Mirrors sectionStore.pulse exactly.
   */
  pulse: number;
  /** Bump to 1 (writer: the DOM panels). Idempotent re-bump is fine. */
  bump: () => void;
  /** Decay write-back (reader: SignatureLine). */
  setPulse: (pulse: number) => void;
}

const createProductionPulseStore = () =>
  create<ProductionPulseState>((set) => ({
    pulse: 0,
    bump: () => set({ pulse: 1 }),
    setPulse: (pulse) => set({ pulse }),
  }));

declare global {
  // eslint-disable-next-line no-var
  var __sersanProductionPulseStore:
    | ReturnType<typeof createProductionPulseStore>
    | undefined;
}

// Pinned on globalThis: written by the route bundle (production-grade-section.tsx)
// and read by the lazy WebGL island (SignatureLine). Turbopack inlines separate
// copies of small store modules per chunk in prod (reproduced on textMorphStore
// 2026-06-10 and sectionStore); the pin makes every copy resolve to one store.
export const useProductionPulseStore = (globalThis.__sersanProductionPulseStore ??=
  createProductionPulseStore());
```

- **Writer**: `production-grade-section.tsx` (route bundle).
- **Reader / decay-writeback**: `SignatureLine.tsx` (lazy WebGL island).
- **globalThis-pin?** YES — REQUIRED (cross-bundle, see §0). Modeled on `sectionStore.ts` L145-159.
- **Both WebGPU + WebGL2 paths?** YES, automatically: the reader writes ONE shared uniform
  `u.uEmissive.value`, and `u` is `glsl.uniforms` (WebGL2) or `tsl.uniforms` (WebGPU) — same
  reference shape. No path-specific code.

### 2.2 The writer (production-grade-section.tsx)

The section already has everything needed:
- Each of the 3 panels (`EvalPanel`, `TracePanel`, `PermissionsPanel`) calls `useInView()` →
  `{ ref, inView }`.
- `TracePanel` already runs a per-row scan rAF reading `useScrollStore.getState().progress`, and
  already has the reduced-motion guard.

**Option A (RECOMMENDED — simplest, 3 beats, one per panel):** in each panel, fire `bump()` on the
`inView` false→true edge:

```ts
const bump = useProductionPulseStore((s) => s.bump); // stable ref; selector ok
useEffect(() => {
  if (!inView) return;
  if (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  bump();
}, [inView, bump]);
```

This gives 3 staggered pulses as the reader scrolls the 3 panels into view — naturally
"synchronized to each panel scan" because the panels enter the viewport sequentially. Minimal,
robust on all tiers, no extra rAF.

**Option B (richer — TracePanel scan-synced):** additionally, inside TracePanel's existing scan
`tick`, call `bump()` when `idx` lands on the `human.review` row (the load-bearing checkpoint), so
the line gets a beat exactly as the trace cursor hits the in-the-loop step. This reuses the EXISTING
rAF (no new loop). Throttle to once-per-cycle to avoid bumping every frame the row is active:

```ts
// inside tick, after computing idx:
const reviewIdx = TRACE_SPANS.findIndex((s) => s.kind === "review");
if (idx === reviewIdx && lastBumpIdx.current !== reviewIdx) {
  useProductionPulseStore.getState().bump();
}
lastBumpIdx.current = idx;
```

Recommendation: ship **Option A** first (deterministic, one beat per panel as it scans in). Layer
Option B only if the user wants the pulse tied to the trace cursor specifically. Both are inert under
reduced-motion (Option A guards; Option B's rAF never runs under RM because TracePanel already
early-returns).

> The writer uses `getState().bump()` inside rAF (Option B) — never a hook in the loop — matching
> the repo's hot-path discipline. The `useEffect` edge (Option A) is a React effect, fine.

### 2.3 The reader (SignatureLine.useFrame) — fold into the EXISTING boost

SignatureLine already computes (L449-452):

```ts
const velocityBoost = aliveVelocity * 0.004;
const pulseBoost = fx.emissive * 0.2 * decayedPulse;       // section-arrival pulse
const boost = Math.min(velocityBoost + pulseBoost, 0.6);
u.uEmissive.value = (fx.emissive + boost) * route.lineEmissiveScale;
```

ADD a third term, decayed exactly like the section pulse (the section-pulse decay block is L282-290):

```ts
// Production-grade per-panel pulse (BEAT 1). Same decay discipline as the
// section-arrival pulse: the store holds the target, we decay toward 0 and
// write back, skipping the store write once it has settled so the idle line
// never churns the store. Gated near the production section so other
// sections/routes are untouched (see prodGate below).
const prod = useProductionPulseStore.getState();
const prodTarget = prod.pulse;
const decayedProd = THREE.MathUtils.damp(prodTarget, 0, 7, delta);
if (prodTarget !== 0) {
  prod.setPulse(decayedProd < 0.001 ? 0 : decayedProd);
}
```

then in the boost sum:

```ts
const prodPulseBoost = fx.emissive * 0.25 * decayedProd * prodGate; // BEAT 1
const boost = Math.min(velocityBoost + pulseBoost + prodPulseBoost, 0.6);
```

- `0.25` ≈ the section pulse's `0.2` weight — a ~×1.25 emissive lift, enough to cross the bloom
  threshold (`bloomThreshold` default 1.0; line base emissive 2.8 → already >1, so this strengthens
  the halo rather than turning it on). Tune live via no new knob needed; if a knob is wanted, see
  §7-D2.
- The clamp ceiling stays `0.6` so the line can never blow out — the existing contract holds.

### 2.4 Spatial gate — only pulse near production (`prodGate`)

The pulse store is only WRITTEN on the home route (production-grade-section.tsx only renders on
home), so on interior routes `prod.pulse` stays 0 and the term is inert automatically. But within the
home route we should not lift the ENTIRE line for a section-local beat — the brief is "near the
production section". Gate the boost by how close the line HEAD is to the production span:

```ts
// Soft spatial gate: the boost only applies while the lit head is within the
// production section's document span (read from the section bus spans). Outside
// it the pulse term is 0, so a stray late-decaying pulse never lifts a far-away
// part of the line. headFraction is already computed above (L358).
const prodSpan = useSectionStore.getState().spans["production"];
let prodGate = 0;
if (prodSpan) {
  // 1 inside the span (with a small feather), 0 outside.
  const feather = 0.06;
  prodGate =
    headFraction > prodSpan.start - feather && headFraction < prodSpan.end + feather
      ? 1
      : 0;
}
```

`useSectionStore` is ALREADY imported in SignatureLine (L20) and already read each frame for the
section pulse — no new import, no extra getState cost beyond one property read. `spans["production"]`
exists because `<div data-line-anchor="production">` wraps the section in page.tsx (L68-70) and
SectionBus measures every anchor including non-active ones.

> Alternative gate (cleaner feel): use the exported `sectionProgress("production", progress, ih)`
> helper (sectionStore.ts L171, currently unused) to make `prodGate` a smooth 0→1→0 triangle across
> the section instead of a hard in/out. This is a 3-line swap and arguably nicer; noted as
> **§7-D3**.

### 2.5 Read/write summary

| Field | Writer | Reader | Hot? | Pinned? |
|---|---|---|---|---|
| `productionPulseStore.pulse` | production-grade-section.tsx (effect edge / Option-B rAF) | SignatureLine.useFrame (decay + writeback) | yes (read+write per frame while >0) | **YES (globalThis)** |

No changes to scrollStore, sectionStore, fxStore, routeFxStore shapes.

---

## 3. GSAP / Three API specifics (installed versions)

- **No GSAP needed for this beat.** The pulse is a per-frame `THREE.MathUtils.damp` decay inside the
  existing R3F `useFrame` — not a GSAP tween. (GSAP 3.15.0 is installed and used elsewhere, but
  introducing a tween here would add a second animation authority over `uEmissive` and fight the
  per-frame writer — rejected.) The writer side is plain React `useEffect` + the existing rAF.
- **`THREE.MathUtils.damp(current, target, lambda, dt)`** — present in three 0.184.0 (already used
  throughout SignatureLine). Frame-rate-independent exponential decay; `lambda 7` ≈ the ~400ms feel
  the section pulse already uses. No API risk.
- **zustand `create` + `getState()`/selector** — same pattern as every store in `src/webgl/store/`.
  `useProductionPulseStore((s) => s.bump)` returns a stable function ref (zustand actions are stable),
  so the selector in a React effect dep array is safe.
- **Uniform write parity**: GLSL `ShaderMaterial.uniforms.uEmissive.value` (lineShader.ts L150) and
  TSL `uniform(2.6)` `.value` (lineNodeMaterial.ts L88) are both plain `{ value:number }` — the
  reader writes `u.uEmissive.value` once and both backends pick it up. Verified against both files.

Code sketch (reader, consolidated) — drop-in near the existing section-pulse block + boost block:

```ts
// (A) near L282, alongside the section-arrival pulse decay:
const prod = useProductionPulseStore.getState();
const prodTarget = prod.pulse;
const decayedProd = THREE.MathUtils.damp(prodTarget, 0, 7, delta);
if (prodTarget !== 0) prod.setPulse(decayedProd < 0.001 ? 0 : decayedProd);

// (B) compute prodGate from spans["production"] vs headFraction (see §2.4)

// (C) at the boost sum (L449-452):
const prodPulseBoost = fx.emissive * 0.25 * decayedProd * prodGate;
const boost = Math.min(velocityBoost + pulseBoost + prodPulseBoost, 0.6);
u.uEmissive.value = (fx.emissive + boost) * route.lineEmissiveScale;
```

---

## 4. prefers-reduced-motion / tier-off / WebGL2 fallback behavior

- **Reduced motion** → tier resolves to `"off"` → `CanvasHost` renders nothing → SignatureLine never
  mounts → reader never runs → no pulse, line absent entirely (the whole WebGL layer is gone). The
  WRITER side ALSO guards: Option A's effect early-returns under `prefers-reduced-motion`, and
  Option B's rAF never starts (TracePanel already early-returns under RM). So even though the store
  could still be bumped, nothing reads it and the DOM panels are unaffected. Net: fully inert, no DOM
  copy/layout change. ✅
- **Tier off** (same as reduced motion path) — covered above.
- **Tier "lite"** (no PostFX/PostFXNodes — Scene.tsx L270 gates bloom to `tier === "full"`): the line
  still renders and the reader still lifts `uEmissive`, but with no bloom pass the lift is a subtle
  brightness change rather than a halo pulse — a clean, correct degrade (the line is just a touch
  brighter near production). No crash, no special-casing needed. ✅
- **WebGL2 fallback path (flag OFF → GLSL ShaderMaterial + PostFX EffectComposer Bloom)**: works —
  the reader writes the shared `uEmissive` uniform; PostFX's luminance-threshold Bloom (threshold 1.0)
  picks up the brief lift exactly as it picks up the base emissive. ✅
- **WebGPU node path (flag ON → TSL MeshBasicNodeMaterial + PostFXNodes bloom)**: works — same
  shared uniform; PostFXNodes feeds the scene color into `bloom(color, intensity, radius, threshold)`
  with threshold ≈ 1.0, so the lift blooms identically. **MUST be verified in a REAL browser** —
  headless Chromium has no WebGPU here (quality-guidelines), so the node path always falls back to
  WebGL2 in headless. See §8. ✅ (degrades cleanly even if WebGPU absent: the WebGL2 backend of the
  same path renders the same uniform).

No new shader code → no storage-buffer vec3 padding concern (that gotcha applies to gpgpu, not here).

---

## 5. Bilingual EN/IT handling

**Nothing to translate.** This beat adds zero copy and zero visible text — it only modulates a WebGL
emissive value. The existing panels' EN/IT strings (claim/why/tags/captions in
production-grade-section.tsx) are UNCHANGED. The writer hooks into the existing `inView`/scan state,
which is language-agnostic. Copy-freeze (§7) is honored by construction: no string is added, removed,
or moved. ✅

(If Option B's pulse were ever surfaced as a visible label — it is NOT in this plan — it would need
EN/IT. It is not, so N/A.)

---

## 6. CONFLICT ZONES (files this beat touches that the other two beats also touch)

This beat was deliberately scoped to AVOID the shared hot files. Result:

| File | This beat (BEAT 1) | Likely other beats | Conflict? |
|---|---|---|---|
| `src/webgl/SignatureLine.tsx` | EDIT: add reader block (decay + boost term + prodGate) in `useFrame` | `/audit` pinned-timeline beat and `/resources` band beat may ALSO touch SignatureLine if they add their own line beats. The shared hotspot is the **boost sum at L449-452** and the **section-pulse decay block at L282-290**. | **POTENTIAL** — coordinate edits to the boost sum. Each beat should add a clearly-named additive term (`prodPulseBoost`, etc.) into the SAME `Math.min(..., 0.6)` clamp rather than each rewriting the line. Sequence: land BEAT 1's reader first; later beats append terms. |
| `src/webgl/store/*` (new store) | CREATE `productionPulseStore.ts` (isolated new file) | other beats may add their own stores | **NONE** (separate new files) |
| `src/components/sections/production-grade-section.tsx` | EDIT: add writer effect | exclusively this beat's section | **NONE** |
| `PostFX.tsx` / `PostFXNodes.tsx` | **NOT TOUCHED** | `/trust` pipeline beat (step 7) will touch PostFXNodes for linked-particle bloom | **NONE for BEAT 1** (by design — we ride the existing bloom threshold, add no pass/region control) |
| `lineShader.ts` / `lineNodeMaterial.ts` | **NOT TOUCHED** | a beat wanting per-region line control would touch these (adding a per-vertex/uniform region mask) | **NONE for BEAT 1** — we intentionally do NOT add per-region bloom; the whole-line emissive lift gated spatially in JS is sufficient and avoids editing both shaders. |
| `routeCurves.ts` / `routeFxStore.ts` | **NOT TOUCHED** | `/audit` and `/resources` beats edit routeCurves; per-route tone edits touch routeFxStore | **NONE for BEAT 1** |
| `sectionStore.ts` | **NOT TOUCHED** (only READ via getState) | other beats may add fields | **NONE** (read-only) |
| `scrollStore.ts` | **NOT TOUCHED** | — | **NONE** |
| `Scene.tsx` | **NOT TOUCHED** (no new mount — reader lives inside existing SignatureLine) | other beats add mounts | **NONE for BEAT 1** |
| `globals.css` | **NOT TOUCHED** | shared by every DOM beat | **NONE for BEAT 1** |

**The single coordination point** is the `boost` sum inside `SignatureLine.useFrame`. Recommend the
main agent sequence SignatureLine edits and have every line-beat add a named additive term into the
one clamped sum (never each replacing the assignment).

---

## 7. OPEN DECISIONS for the user

- **D0 (copy-freeze)**: ✅ No new copy. This beat adds no strings — copy-freeze fully honored. No
  user input needed on copy. (Stated explicitly per the hard constraint.)
- **D1 (filename casing)**: new store file — `productionPulseStore.ts` (matches every sibling in
  `src/webgl/store/`) vs the task's kebab-case rule (`production-pulse-store.ts`). Recommend
  camelCase for local consistency. **Needs a one-word confirm.**
- **D2 (tunability knob)**: ship the pulse weight as a hard-coded `0.25` (no new fxStore field) vs add
  `linePulseScale` to fxStore for live console tuning. Recommend hard-coded first (no fxStore edit →
  fewer conflicts); add a knob only if the user wants to tune the lift live. **Optional.**
- **D3 (gate shape)**: hard in/out spatial gate (§2.4) vs smooth triangle via the existing
  `sectionProgress()` helper. Recommend the smooth triangle (nicer feel, reuses existing dead-code
  helper). **Optional, low-risk either way.**
- **D4 (writer richness)**: Option A (one pulse per panel as it scans in — deterministic) vs also
  Option B (extra beat when the trace cursor hits `human.review`). Recommend A first. **Optional.**

None of these block implementation; D1 is the only one needing a confirm before writing the file.

---

## 8. QA plan (real Chrome vs headless)

**Headless Chromium (always WebGL2 fallback here):**
1. `next build` + TS strict pass (the only gates; no test runner) — verify the new store + reader +
   writer typecheck.
2. Console-free: load home, scroll the production section into view with REAL `mouse.wheel` (not JS
   scroll — preloader rAF/throttle gotcha), confirm no errors/warnings.
3. Confirm the line near production brightens momentarily as each panel scans in (screenshot the
   production band mid-scroll vs at rest — the halo should be visibly stronger during the beat). This
   exercises the WebGL2 GLSL path + PostFX EffectComposer bloom.
4. Reduced-motion: set `prefers-reduced-motion: reduce`, confirm the WebGL layer is absent (tier off)
   and the DOM panels are pixel-identical to today (copy/layout unchanged) — no pulse, no errors.
5. Cross-bundle pin: in a PRODUCTION build (`next build && next start`), verify the writer's bump is
   seen by the reader (the prod-only Turbopack copy-split bug only shows in prod) — i.e. the pulse
   actually fires in prod, not just dev. This is the specific failure the globalThis pin prevents;
   it MUST be checked in a prod build.

**Real Chrome (REQUIRED — headless has no WebGPU):**
6. With `NEXT_PUBLIC_WEBGPU=1`, load home in real Chrome, scroll production into view, confirm the
   TSL node path (PostFXNodes `bloom()` threshold ≈ 1.0) shows the same pulse halo as WebGL2. Verify
   no TSL compile crash on first `PostProcessing.render()` (TSL graphs only compile at runtime).
7. Tier "lite" (force via tierStore/console if available): confirm the line still brightens (no bloom
   halo, just emissive lift) and nothing crashes.

**Both:**
8. Confirm the idle line never churns the store: after the pulse settles, `productionPulseStore`'s
   `pulse` should rest at exactly 0 (the `< 0.001 → 0` snap), and SignatureLine should stop writing it
   back (the `prodTarget !== 0` guard). Spot-check via the dev console store handle (add a
   `window.__sersanProductionPulse` handle in dev, mirroring the other store handles in Scene.tsx /
   SectionBus, if convenient).
9. Confirm the pulse does NOT lift the line on other sections/routes (prodGate / write-only-on-home).

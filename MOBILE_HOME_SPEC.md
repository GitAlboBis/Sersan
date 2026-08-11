# MOBILE HOME — DEFINITIVE IMPLEMENTATION SPEC

**Scope:** `/` on a coarse pointer. **Hard constraint:** every fine-pointer render path is byte-identical after this work.
**Status of the tree:** live. `singularity-passage.tsx` and `seqStore.ts` were rewritten hours before this spec (Phase 4.1). Rebase, never merge over.

---

## 0 · CORRECTIONS TO THE INPUTS (read before planning)

Four "facts" carried in the proposals are wrong against disk. Planning against them wastes a day each.

| Claim in the proposals | Reality on disk |
|---|---|
| The black hole is a 101px gradient upscaled 13.3× over 1.8vh of empty scroll | **Deleted.** `singularity-passage.tsx:497` now runs a 56svh-base hole on a 1/d law (max upscale 3.0×) + the real `createPreloaderTunnel` point field warping to 60, over a 130svh runway. Section is **1840px (2.18vh)**, not 2262px (2.68). |
| `[data-on="lite"] .seq-track { position:absolute; inset:0 }` pins panel 05 | **False.** `.seq-track` is a child of `.seq-stage` (`:1719-1722`); the sticky element is `.seq-lite` (`:1807`) inside the **sibling** `[data-seq-lite-run]` (`:1802`). `.seq-stage` gets no position on lite. That CSS stretches the panel across the whole runway and pins nothing. **Requires a JSX restructure — §3.2.** |
| `getRouteCurve` can be given a compact `/` curve by editing `routeCurves.ts:46` | **That line IS the desktop curve.** `getRouteCurve(pathname)` (`:204`) has no tier axis. Editing :46 is a desktop regression. **Requires a second curve record — §3.5.** |
| D-18 (founders one-shot matchMedia) and D-21 (`<pre>` missing `data-lenis-prevent`) are open | **Both fixed.** `founders-rail.tsx:735-749` subscribes; `final-cta.tsx:174` carries the attribute. Do not re-do. |

Also true and load-bearing:
- `cinematic-system-scroll.tsx:845` — `usesFallback = hasDetectedViewport && (isMobile || reduceMotion)`. **`MobileFallback` is also the reduced-motion path on desktop.** Any hero change must split that gate or it ships a scrubbed pin to reduced-motion users on a 27" monitor.
- `[data-hero-brand]` exists only in the desktop branch (`:1061`), so `textMorphStore.active` is permanently false on touch and `HomeSingularity` would render nothing even if mounted (`HomeSingularity.tsx:374-384`). The home eclipse is chained to desktop-only DOM.

---

## 1 · WHAT THE MOBILE HOME IS AFTER THIS WORK

The phone stops being a shortened desktop and becomes **a 14.4-viewport page with two pinned cinematic beats, three lateral rails that share one grammar, and one continuous lit filament threading all of it** — the same `SignatureLine` that already mounts on every phone today but currently renders as a flat, un-glowing 22px bar behind nine sections that never reference it. It gets a glow sheath (cheap additive fill, not the bloom chain), a compact serpentine of its own, and one destination: at the credibility anchor it converges to dead screen-centre and is **extinguished inside the black hole**, which is now the pinned foreground of panel 05 rather than an aria-hidden decoration hanging below it. The hole itself is not a raymarch and does not pretend to be — it is a composited layer re-based so it is never upscaled past 1.77× while visible, running on the true 1/distance divergence law with 675px of scrub travel instead of 253px, wrapped in the real point tunnel at warp 60. The two neural lattices become real WebGL on capable phones. Every card that measured over half a viewport is condensed with `sm:`-prefixed classes that a 640px-wide viewport restores byte-for-byte, and the four vertical offenders (hero 4.00, services 3.02, passage 2.68, fit 1.90 = 11.60vh) collapse to 6.14vh.

---

## 2 · SECTION TABLE

Measured at 390×844 (1 viewport = 844px), `pointer: coarse`. Baseline column is the brief's measurement; the passage's on-disk value after Phase 4.1 is noted separately.

| # | Section | Today (px / vh) | Target (px / vh) | Touch mechanic | Files · lines |
|---|---|---|---|---|---|
| 1 | **Hero** `cinematic-system-scroll` | 3376 / **4.00** | 1519 / **1.80** | 3 grouped panels (`DESKTOP_GROUPS`) crossfading on ONE sticky 100svh stage over a 180svh runway. Renders the **existing `StagePanel`** with a new `compact` prop — same opacity engine (`panelOpacity`, `:282`), same inert grammar, zero new vocabulary. Reduced motion keeps today's stacked path verbatim. | `cinematic-system-scroll.tsx` :705 (rename → `StackedFallback`, keep byte-identical), :722 (drop `min-h-[80svh]`), :828 (add `(pointer: coarse)`), :845 + :981 (split `reduceMotion` from `isMobile`), :305-430 (`compact` prop on `StagePanel`), new `CompactSpine` beside :705 |
| 2 | **Passage / black hole** | 2262 / **2.68**<br>*(1840 / 2.18 on disk)* | 1519 / **1.80** | Panel 05 becomes the **pinned foreground plate**: `.seq-stage` goes sticky 100svh on lite, the three lite layers move inside it, `[data-seq-lite-run]` becomes an empty spacer. Hold → copy handoff → the 1/d dive, with 675px of travel (2.7×). See §3. | `singularity-passage.tsx` :501-829, :1719, :1802-1818, :1830-2027; `seqStore.ts` :229-339 |
| 3 | **Problem** | 1108 / 1.31 | 954 / **1.13** | Real `NeuralLattice mode="broken"` replaces the DOM SVG on `phoneGL`; centerpiece box shrinks (the island is camera-locked and needs no DOM box). | `problem-section.tsx` :159, :205; `globals.css` §5.1 |
| 4 | **Case studies rail** | 1276 / 1.51 | 1165 / **1.38** | Unchanged mechanic (already a native snap scroller with `useCentreFocus` + `stackInFlow`). Adopts `<DragRail>` for the progress affordance only. Chrome trim. | `case-studies-rail.tsx` :875-876 (adopt), section padding |
| 5 | **Services** | 2550 / **3.02** | 1013 / **1.20** | Lateral `<DragRail>`: 4 stations at `w-[86vw]`, discrete `01 / 04` stepper (not a progress bar — a deliberately distinct third register). `ServiceCard` gains a `compact` prop; every condensation is `sm:`-prefixed. | `services-section.tsx` :270, :272, :294, :301, :317-345, :664-685 |
| 6 | **Production-grade** | 1312 / 1.55 | 1114 / **1.32** | `NeuralLattice mode="healthy"` (second instance, ~5 viewports from the first, never co-resident). Centerpiece + chrome trim. | `production-grade-section.tsx` :377, :402, :430 |
| 7 | **Founders rail** | 1316 / 1.56 | 1216 / **1.44** | Unchanged mechanic. `useCentreFocus` colour reveal already ships (`:708`); card height already `svh` (`:425-426`). Chrome trim + `<DragRail>` affordance only. | `founders-rail.tsx` heading/closing padding |
| 8 | **Process strip** | 299 / 0.35 | 299 / **0.35** | Untouched. | — |
| 9 | **Fit** | 1604 / **1.90** | 1097 / **1.30** | **Paired rows.** Six bordered rows, each carrying `GOOD_FIT[i]` over `NOT_A_FIT[i]` (the pairing contract is already documented at `:21`). `useCentreFocus` lights the centred pair: the ✓ medallion ignites, a `scaleX` redaction bar sweeps the ✗ line. | `fit-section.tsx` :951-1040 (native branch only) |
| 10 | **Gateway gap** | 288 / 0.34 | 192 / **0.23** | `py-36 sm:py-52` → `py-24 sm:py-52`. Desktop-inert by the `sm:` prefix. | `page.tsx` :89 |
| 11 | **Final CTA** | 1035 / 1.23 | 923 / **1.09** | `py-14` → `py-10` at base only + `section-lg` coarse override. | `final-cta.tsx` :65, :72 |
| | **Sections subtotal** | 16,426 / 19.46 | 11,011 / **13.05** | | |
| | **Navbar + footer + inter-section chrome** | 1,123 / 1.33 | 1,123 / **1.33** | untouched | |
| | **TOTAL DOCUMENT** | **17,549 / 20.79** | **12,134 / 14.38** | | |

**Contract: ≤ 14.50 viewports (12,240px) measured end-to-end at 390×844 in EN, and ≤ 15.20 in IT** (IT copy runs ~12% longer and only the copy-bearing rows move). The 0.12 headroom above 14.38 absorbs sub-pixel rounding and the `<DragRail>` affordance.

**Justification of the number, and one honest caveat.** 6.41 viewports come off. 4.24 of them are *document height genuinely deleted* — services 1.82, fit 0.60, hero's five-panel `min-h` floor, and 336px of `section-lg` padding across seven sections. 2.17 are *restructuring*: length converted into pinned scrub. **Pinning does not reduce thumb effort** — a panelist was right about that, and this spec does not pretend otherwise: 14.38 viewports IS the thumb-travel figure, measured as `document.scrollHeight / innerHeight`. What pinning buys is that the reclaimed distance now carries motion instead of `min-height`. The winner's 11.9 target is not adopted: it required a 170svh hero (23svh of travel per beat, at `seqStore.ts:250`'s own documented scrubbability floor) and a 1.45vh passage that depended on the CSS rule that does not pin. Those numbers were arithmetic on a structure that does not exist.

---

## 3 · THE BLACK HOLE

### 3.1 What a phone renders, frame by frame

One 100svh sticky stage over a 180svh runway → **80svh (675px) of scrub travel**, 2.67× today's 253px. `t` is the ScrollTrigger progress of `.seq-root`.

| band | what the frame does |
|---|---|
| **t 0.00 – 0.20 — HOLD** | Panel 05 is fully legible and motionless. Eyebrow, H2, body, proof chips, both CTAs live and tappable. Behind the copy, `.seq-lite-hole` sits at **15svh** apparent (127px) at `LITE_HOLE_HOLD_ALPHA 0.35`, a dark well under the type. Star field at drift, alpha ramping. 135px of scroll where nothing but reading happens. |
| **t 0.20 – 0.34 — HANDOFF** | `copyOpacity = 1 − seqSmooth(t, 0.20, 0.34)`; the panel's entry-Y grammar runs in reverse. `setPanelInteractive(false)` fires when `copyOpacity < 0.05`. The hole's alpha lifts 0.35 → 1.0 across the same band: the copy dissolves and the hole takes the frame it was sitting in. |
| **t 0.34 – 0.80 — DIVE + SPIN-UP** | `apparent = 15 · (170/15)^(t^1.45)` — the pure 1/distance divergence law. 25svh → ~90svh. Warp climbs `WARP_MIN → 60` via the inverted-lerp controller already at `:617-627`. The streaks stretch. **The signature line's head arrives, converges to dead centre, and is extinguished** (§3.5). |
| **t 0.70 – 0.90 — ENTRY** | `.seq-lite-veil` (#000 radial) closes on a colour seam with the hole's own core. The hole passes 96svh at t ≈ 0.834 — the first frame it is upscaled at all — behind a ~70%-closed veil. |
| **t 0.88 – 0.98 — ARRIVAL** | Streaks die inside the black; `.seq-cover` normalises to `hsl(var(--bg))` so the stage unpins into the divario with no visible edge. |

No input lock. No covert jump. No `preventDefault` on `touchmove`. Every layer is a pure function of `t`, so the whole beat reverses cleanly and needs no state machine — the property Phase 4.1 already established and this spec preserves.

### 3.2 The JSX restructure (this is the part that is not CSS)

**In `singularity-passage.tsx`:**

1. Move `.seq-lite-frame` (with `[data-seq-lite-hole]`), `[data-seq-lite-veil]` and `[data-seq-cover]` **out of** `<div data-seq-lite-run>` (`:1802-1818`) and **into** `<div className="seq-stage">` (`:1719`), wrapped in a single new `<div className="seq-lite-layers" aria-hidden="true">` placed **before** `[data-seq-track]`.
2. `<div data-seq-lite-run aria-hidden="true" className="seq-lite-run" />` becomes an **empty spacer**. The `.seq-lite` class and its rules (`:1918-1927`) are deleted; its sticky role moves to `.seq-stage`.
3. New CSS, appended to the `<style>` block (`:1830`):

```css
.seq-lite-layers { display: none; position: absolute; inset: 0; }
.seq-root[data-on="lite"] .seq-lite-layers { display: block; }
.seq-root[data-on="lite"] .seq-stage {
  position: sticky; top: 0; height: 100svh; overflow: hidden; isolation: isolate;
}
.seq-root[data-on="lite"] .seq-track {
  position: absolute; inset: 0; min-height: 0; padding-block: 0; z-index: 2;
}
.seq-root[data-on="lite"] .seq-panel { pointer-events: auto; will-change: opacity, transform; }
.seq-root[data-on="lite"] .seq-lite-frame { z-index: 1; }
.seq-root[data-on="lite"] .seq-lite-veil  { z-index: 3; }
.seq-root[data-on="lite"] .seq-cover      { z-index: 4; }
```

Note the safe-area contract at `:1788-1801` transfers unchanged: the stage stays full-bleed under the cutout, because the tunnel's vanishing point is locked to 0.5/0.5.

4. **Trigger rebase.** Both triggers currently key off `liteRun`, which is now a spacer *below* the stage and would arm a viewport late and scrub against the wrong element:
   - `:776` band → `trigger: root, start: "top bottom", end: "bottom top"` (build the tunnel + assert the DPR cap one viewport early, unchanged in intent).
   - `:791` scrub → `trigger: root, start: "top top", end: "bottom bottom"`.
   - `:535-537` `size()` → `liteRun.style.height = \`${SEQ.LITE_RUN_SVH - 100}svh\`` (the stage owns the other 100).

### 3.3 THE ACCESSIBILITY CONTRACT (write this into the file header before cutting a line)

This is the defect the winning proposal shipped silently, and it must be closed in writing:

- **Panel 05's JSX does not move.** It stays `.seq-stage > [data-seq-track] > [data-seq-panel]`, and no ancestor of it is ever `aria-hidden`. The wrapper `[data-seq-lite-run]` — which *is* `aria-hidden` — now contains nothing.
- The only new `aria-hidden` node is `.seq-lite-layers`, which carries no text.
- `setPanelInteractive(on)` — the existing helper at `:988-994` — is reused verbatim on the lite path with `on = copyOpacity > 0.05`. Identical grammar to desktop; the aria state always matches the visual state.
- **Acceptance test, blocking merge:** with VoiceOver (iOS) and TalkBack (Android), while the stage is pinned at `t < 0.20`, panel 05's H2, body, proof chips and *both* CTAs must be in the accessibility tree and focusable; "Book a 30-min scoping call" must be tappable at `t = 0.00` and `t = 0.15`; the same must hold on reverse scrub. Reduced motion never enters this branch, so an RM screen-reader user reads panel 05 as a plain vertical section.
- **Overflow guard:** panel 05 must fit `100svh − var(--header-h)`. Test at **360×640 in IT**. If it clips, apply `LITE_PANEL_SCROLL` — `.seq-root[data-on="lite"] .seq-track { overflow-y: auto; overscroll-behavior: contain; }` plus `data-lenis-prevent` on the track. **Never truncate.**

### 3.4 `seqStore.ts` constant changes (`:229-339`)

| constant | from | to | why |
|---|---|---|---|
| `LITE_RUN_SVH` | 130 | **180** | Total section height including the 100svh stage → 80svh travel. Below ~140 the beat is a flick; above ~200 the empty-scroll complaint returns. |
| `LITE_HOLE_BASE_VH` | 56 | **96** | Max upscale 170/96 = **1.77×** (was 3.04×). The layer is rastered at 1:1 at `t ≈ 0.834`, i.e. it is scaled **down** — sharp — for the first 83% of the beat and only stretched behind a closing veil. **This one constant is the ring-mush fix.** |
| `LITE_HOLE_START_VH` | 22 | **15** | It now sits behind the H2 during the hold and must not compete with it. |
| `LITE_HOLE_EASE_POW` | 1.25 | **1.45** | With 2.7× the travel the growth can be back-loaded without the first half reading as a static disc. Apparent at t 0.20 / 0.34 / 0.70 / 0.90 = 18.8 / 25 / 60 / 118 svh. |
| `LITE_HOLE_HOLD_ALPHA` | — | **0.35** (new) | Hole alpha during the hold; lifts to 1.0 across the copy handoff band. |
| `LITE_HOLD_END` | — | **0.20** (new) | Copy static and interactive up to here. |
| `LITE_COPY_OUT_END` | — | **0.34** (new) | Copy fully faded; panel inert. |
| `LITE_WARP_START / END` | 0.22 / 0.72 | **0.34 / 0.80** | Re-timed behind the handoff. Peak stays **60**. |
| `LITE_TUNNEL_IN_END` | 0.16 | **0.30** | The field arrives with the dive, not under the copy. |
| `LITE_VEIL_START / END` | 0.62 / 0.86 | **0.70 / 0.90** | |
| `LITE_COVER_START / END` | 0.84 / 0.96 | **0.88 / 0.98** | |
| `LITE_DPR_CAP` | 1 | **1** (unchanged) | Already correct; now guards real work. |
| `LITE_MIN_CORES` | 4 | **4** (unchanged) | Reused by `phoneGL` (§4) so the codebase carries one number. |

New store field, written by the lite branch, read by `SignatureLine`:

```ts
// seqStore state — the phone beat publishes exactly TWO scalars (it published
// nothing before, by design). Both are pure functions of t; nothing round-trips.
lite: boolean;        // true while the coarse branch owns the section
liteSwallow: number;  // 0→1 across [LITE_VEIL_START, LITE_VEIL_END]
```

### 3.5 THE SWALLOW — and the desktop trap it must not fall into

The line the reader has followed for four viewports is eaten by the hole. Cause and effect, for near-zero cost. But `getRouteCurve(pathname)` (`routeCurves.ts:204`) **has no tier axis**, and `routeCurves["/"]` is the desktop serpentine.

**`routeCurves.ts` — add a second record, do not edit the first:**

```ts
/** COMPACT ("/" only, tier === "lite"). Same anchors, same amplitude rule
 *  (|x| ≥ ~1.1 at every TURN-AROUND, :31-34), one difference: `credibility`
 *  is x:0 — a MONOTONE CROSSING, not a turn. Every waypoint after it flips
 *  sign so the crossing stays monotone and no hairpin is manufactured at
 *  screen centre. z:0.9 puts the crossing in the hole's plane. */
export const routeCurvesCompact: Record<string, RouteCurveConfig> = {
  "/": { waypoints: [
    { at: 0.0, x: 1.15, z: -1.0 },
    { anchor: "credibility",      x:  0.00, z:  0.9 },   // ← the swallow
    { anchor: "problem",          x: -1.20, z: -0.2 },   // ← sign flipped
    { anchor: "case-studies",     x:  1.25, z:  0.2 },
    { anchor: "work-in-progress", x: -1.20, z:  0.4 },
    { anchor: "services",         x:  1.25, z:  0.1 },
    { anchor: "production",       x: -1.10, z:  0.5 },
    { anchor: "founders",         x:  1.20, z: -0.2 },
    { anchor: "process",          x: -1.25, z:  0.3 },
    { anchor: "fit",              x:  1.10, z: -0.4 },
    { anchor: "gateway",          x:  0.00, z:  0.6 },
    { anchor: "final-cta",        x:  0.00, z:  0.6 },
  ]},
};

export function getRouteCurve(pathname: string, tier?: SceneTier): RouteCurveConfig {
  if (tier === "lite") {
    const compact = routeCurvesCompact[pathname];
    if (compact) return compact;
  }
  const bespoke = routeCurves[pathname];
  if (bespoke) return bespoke;
  return isDetailRoute(pathname) ? routeCurves.detail : routeCurves.default;
}
```

`SignatureLine.tsx:145` → `const config = getRouteCurve(inp.pathname, inp.tier);`. `inp.tier` is already in scope (`:208`, `:211`). **A `tier === "full"` build cannot reach the new branch.**

**The extinction**, in the existing `useFrame` — `useSeqStore.getState()` is already read there (`:766`), so this is a second field on an existing read, not new plumbing:

```ts
// after the existing seqAim block (:766-772)
const swallow = tier !== "full" && pathname === "/" && seqState.lite
  ? THREE.MathUtils.clamp(seqState.liteSwallow, 0, 1)
  : 0;
// at the uReveal write (:1237)
u.uReveal.value = dampedReveal.current * (1 - swallow);
```

### 3.6 THE SHEATH — why the phone stops looking effect-less

`SignatureLine` already mounts on every phone (`Scene.tsx:300`, ungated). It renders as a flat ~22px cyan bar for exactly one reason: `PostFXNodes` is `tier === "full"` only (`Scene.tsx:461`), so the line has no glow. **The effect is not missing, it is inert.** Fixing that is the cheapest real answer to complaint (1).

Add a compact-only additive sheath: a **second `TubeGeometry` built from the SAME curve and the SAME arc-length table** (no second CatmullRom, no second `getPointAt` cost) at `radius × SHEATH_RADIUS_MULT = 4.5`, `blending: AdditiveBlending`, `depthWrite: false`, radial falloff on the tube's own `uv.y`, driven by the same `uProgress` head mask and the same `uReveal` (so the swallow extinguishes it too).

- Files: `SignatureLine.tsx` geometry memo `:205-219`; a `sheath` variant in `src/webgl/materials/lineNodeMaterial.ts`.
- Cost, arithmetic not measurement: `radiusFactor 0.013 × WORLD_VIEW_HEIGHT 11.19 = 0.145` world units ≈ 10.9px at 390×844 → an ~87px band over ~900px of visible filament ≈ 78k fragments ≈ **24% of a DPR-1 frame** at ~10 ALU each, plus ~3,840 triangles at the existing lite budget (320 tubular / 6 radial, `:208`/`:211`). That is roughly 1/20th of the bloom chain this deliberately does not mount.
- `renderOrder` must be set explicitly and checked against `HeroLogo` in the hero frame — the sheath is additive with `depthWrite:false` and the curve's first waypoint (`x: 1.15, z: -1.0`) was placed so the beam does not park inside the spore mark's volume.
- **Fallback rung:** if the real-device reading (§6) misses 60fps, drop `SHEATH_RADIUS_MULT` 4.5 → 2.5 (halves the band, halves the fill) before removing it.

### 3.7 The DPR budget

| lever | value | mechanism |
|---|---|---|
| **1. Route-wide resolution** | `dprInitial 1.0 / min 1.0 / max 1.5` on every coarse pointer | `detectDprRange()` coarse branch — §4.1. **4× fill cut before anything else is discussed.** |
| **2. Band cap** | `dprCap = 1` for the whole approach band | already at `:692-699` via `tierStore.setDprCap`, consumed by `AdaptiveResolution:52-66`. Asserted on the band edge (a calm moment) so the swapchain realloc never lands mid-beat. |
| **3. Overdraw** | 3 composited layers + 1 point-tunnel canvas, all `transform`/`opacity` only | unchanged from Phase 4.1 |
| **4. Duty cycle** | tunnel built on band approach, disposed on leave; rAF runs only while `alpha > 0.001` | unchanged (`:661-702`, `:756-763`) |
| **5. No new class of GPU work** | the point tunnel is already shipped to every phone by the preloader | `:557-572` |

### 3.8 Fallback chain, top to bottom

| rung | condition | what renders |
|---|---|---|
| 1 | `prefers-reduced-motion` | `tierStore:69` → tier `"off"` → `CanvasHost.tsx:32` mounts **no canvas at all**. `singularity-passage.tsx:468` (`if (!c.motionOk) return`) leaves the default CSS: panel 05 a normal vertical section, CTAs live, `.seq-static` gradient spacer. The pin, the swallow and the sheath all live inside the same `matchMedia` block and never run. **Content complete; motion lost, never content.** |
| 2 | touch, motion OK, no WebGL1 | `createPreloaderTunnel` returns null (`:667`) → `tunnelDead = true` → the CSS hole + veil + cover carry the whole 1/d move. Already implemented. |
| 3 | touch, motion OK, `cores ≤ 4` | tunnel skipped by the existing check (`:573-577`). Same composition as rung 2. |
| 4 | touch, motion OK, WebGL1 present | Full beat: pinned panel 05 + hole (base 96) + point tunnel at warp 60 + veil + cover + the swallow. |
| 5 | `phoneGL` false | Independent of the passage: `NeuralLattice` stays off, the DOM SVG neural graph ships — **today's production behaviour, zero new risk.** |
| 6 | runtime `degrade()` (PerformanceMonitor) | lite → off; canvas unmounts; every section serves its static branch; passage reverts to `.seq-static`. Content complete. |

### 3.9 Why it is no longer horrible

1. **The mush is gone by arithmetic, not by taste.** 13.3× → 3.0× (Phase 4.1) → **1.77×**, and the only frames where it exceeds 1.0× are behind a 70%-closed veil. The photon ring at `rgba(59,225,255,0.55) 61%` is rendered sharp for 83% of the beat.
2. **The divergence law now has pixels to read as acceleration.** 253px → 675px. A `1/d` curve compressed into a quarter of a thumb flick reads as a disc that pops; over 675px it reads as a fall.
3. **It stopped being a decoration hanging under a copy panel.** The hole is the frame panel 05 sits in and then dissolves into. 1.3 viewports of aria-hidden nothing become 0.8 viewports of pinned beat *plus* the section's own reading time.
4. **It has a cause.** The filament the reader has followed since the hero converges to its centre and dies in it. Nothing else on the phone page does that.
5. **Explicitly rejected:** the two-plate ring crossfade (a visible seam pop at the most exposed moment, two extra promoted full-frame layers on a fill-bound GPU, and a cheaper one-constant answer exists) and a spinning conic-gradient accretion ring (off-brand: cyan-plus-rotation reads as a loading spinner on a consultancy site).

---

## 4 · THE WEBGL DECISION

### 4.1 `tierStore.ts` — two additive changes, neither reachable on a fine pointer

**(a) The DPR fix. Ship this first, on its own, today.** `detectGpuClass()` (`:95-112`) tests `/adreno|mali|powervr|qualcomm/i → weak` and `/intel|\bUHD\b|Iris/i → mid`. Safari **hides** `WEBGL_debug_renderer_info`, so `r` is `""`; an iPhone that does expose it reports `"Apple GPU"`. Neither matches → `strong` → `dprInitial = clamp(2.0)`. **Every iOS device on this site renders the persistent canvas at 4× the pixel count of an Android, on the architecture where cost scales with DPR².** Insert **before** the switch in `detectDprRange()` (`:119`):

```ts
// Coarse pointer ⇒ tile GPU ⇒ fill-bound. detectGpuClass() cannot see this:
// Safari hides WEBGL_debug_renderer_info (renderer string ""), and an iPhone
// that exposes it reports "Apple GPU" — neither matches the weak or mid
// regex, so every iOS device fell through to `strong`.
// SCOPED TO `(pointer: coarse)` ON PURPOSE: an M-series MacBook reports the
// SAME string, so adding `apple` to the weak regex would silently halve
// desktop canvas resolution site-wide. A fine pointer never reaches here.
if (window.matchMedia("(pointer: coarse)").matches) {
  return { initial: clamp(1.0), min: clamp(1.0), max: clamp(1.5) };
}
```

**(b) The capability axis.** `tier` keeps its only honest job — which DOM layout to serve. A new boolean decides whether decorative islands may mount. `detectTier()` (`:67-82`) is **not touched**; all 13 `tier` consumers keep their exact behaviour.

```ts
interface TierState { /* … */ phoneGL: boolean }   // initial false

/**
 * MAY a coarse-pointer device mount decorative islands?
 *
 * INVARIANT: `tier` selects the DOM LAYOUT; `phoneGL` selects whether
 * decorative islands may mount. NEVER conflate them, and never let phoneGL
 * change what `tier === "full"` resolves to.
 *
 * Returns false on a fine pointer BEFORE touching anything, so desktop can
 * never reach the body of this function.
 *
 * It deliberately does NOT consult detectGpuClass(): that regex marks
 * adreno|mali|powervr|qualcomm "weak", i.e. every Android phone that exists,
 * and (a) above routes every iPhone to the same budget — gating capability on
 * it yields a predicate no real phone satisfies. GPU class is a BUDGET input,
 * not a capability test. What we use instead is a DENY-LIST of pre-2020 tile
 * parts: an unknown 2026 phone must PASS.
 */
function detectPhoneGL(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: fine)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) return false;  // = SEQ.LITE_MIN_CORES
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return false;         // absent on iOS → passes
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/mali-[tg](3|5|7)\d/i.test(r)) return false;
    if (/adreno \(tm\) (4\d\d|5[0-3]\d)\b/i.test(r)) return false;
    if (/powervr (ge|g6)/i.test(r)) return false;
    return true;
  } catch { return false; }
}
```

Wire into `resolve()` (`:142`): `set({ tier: detectTier(), phoneGL: detectPhoneGL(), … })`.
Wire into `degrade()` (`:152`): the `lite → off` branch must also `phoneGL: false`, or a degraded phone keeps its islands.

> **QA note that decides this constant:** log `navigator.hardwareConcurrency` on every target device during §6. If a target iPhone reports ≤ 4, lower the threshold and record the reading in the docblock. Do not guess it in code review.

### 4.2 `Scene.tsx` — exactly one gate moves

```tsx
const phoneGL = useTierStore((s) => s.phoneGL);
// On a fine pointer phoneGL is false forever, so this expression is provably
// identical to `tier === "full"`. Desktop cannot move.
const island = tier === "full" || phoneGL;
```

| line | island | after |
|---|---|---|
| 317 | `RailPlanes` | **unchanged** `tier === "full"` |
| 330 | `FounderPortraitMorph` | **unchanged** |
| **342** | `NeuralLattice` ×2 | `pathname === "/" && island && webgpu` |
| 355 | `ResourcePreviewPlane` | **unchanged** (not on home) |
| 371 | `AuditSingularity` | **unchanged** (not on home) |
| 398 | `HomeSingularity` | **unchanged** |
| 428 | `SequenceSingularity` | **unchanged** |
| 461 | `PostFXNodes` / `PostFX` | **unchanged** `tier === "full"` |

### 4.3 The complement — MUST land in the same commit

`use-neural-lattice-fallback.ts:31` is *defined* as the exact inverse of `Scene.tsx:342` (its own docblock, `:8-14`):

```ts
const phoneGL = useTierStore((s) => s.phoneGL);
return !((tier === "full" || phoneGL) && webgpuEnabled());
```

**If this ships in a different commit from §4.2, a capable phone renders the SVG neural graph AND the WebGL lattice stacked on each other.** Same commit. No exceptions. This is the only one of the 13 `tier` call sites that moves, precisely because it is a complement rather than a layout choice.

### 4.4 Particle budget

`neuralLatticeConfig.ts:189` keeps `NEURAL_PARTICLE_COUNT = 9000`. Add `export const NEURAL_PARTICLE_COUNT_COMPACT = 3200;` and select at `NeuralLattice.tsx:128` and `:454`:

```ts
const count = useTierStore.getState().tier === "lite"
  ? NEURAL_PARTICLE_COUNT_COMPACT : NEURAL_PARTICLE_COUNT;
```

Read via `getState()` in the build path, **never as a subscription inside the Canvas island** (the R3F island commit wedge). Additive blending is the real overdraw source; 3,200 at DPR 1 is roughly one tenth the fill of 9,000 at DPR 2. `CULL_PAD = 220` (`:75`, `:242`) already off-screen-culls, and the two instances sit ~5 viewports apart, so they are never both marching.

Compute is not required: the island skips only `build.compute(delta)` on a non-WebGPU backend (`:427-428`) and renders a still-but-igniting field, with the DOM-driven per-cluster ignition intact.

### 4.5 Why each of the other seven stays off

| island | reason (structural, not budgetary, wherever possible) |
|---|---|
| `RailPlanes` (317) | Self-disables on `railStore.pinned`, which only the pinned desktop DOM writes. Mounting it on a phone renders **nothing** until the rail is pinned — and pinning the rail on touch is a layout regression this spec explicitly reverses. |
| `FounderPortraitMorph` (330) | Same `foundersMorphStore.pinned` shape. On top of that, `founders-rail.tsx:620-640` documents an all-or-nothing failure path: one rejected `loadFounder` promise leaves every founder past the first at opacity 0. That is a P0 content-loss risk on the device class with the worst Lighthouse, in exchange for what the audit itself ranks the *second* wow payload. `useCentreFocus` already restored the colour portraits on touch (`:708`); that is the section's answer and it is sufficient. |
| `HomeSingularity` (398) | **Structurally impossible, not merely expensive.** Its first-frame gate is `!morph.active → group.visible = false` (`:374-384`); `textMorphStore.active` is set via `[data-hero-brand]`, which exists only in the desktop hero branch (`cinematic-system-scroll.tsx:1061`), and this spec's compact spine deliberately does not introduce it. Letting the phone through buys a black hole that never becomes visible. |
| `SequenceSingularity` (428) | A 128-step, 2-texture-fetch-per-step march over a silhouette that reaches ~113vh: ~38M fetches/frame even at DPR 1 with `ITER_LO 64`. And **there is no bloom on a phone** — `blackHoleMaterial`'s image is a selective-bloom contract (`emissiveNode === colorNode`, hot disc ~3.3 linear against a ~1.0 threshold), so an unbloomed 48-step twin at 390px is not a dimmer version of the desktop object, it is a hard-edged emissive ring with no falloff, inviting the side-by-side comparison the composited hole never does. Shipping a visibly cheaper copy of the signature object is worse for the brand than shipping an honestly different one. The file's own FALLBACK MATRIX (`Scene.tsx:416-427`) records the same conclusion. |
| `PostFXNodes` / `PostFX` (461) | `scenePass` → HDR target + the bloom mip pyramid + vignette + tonemap ≈ 5× fullscreen of fill at a **100% duty cycle on every route**. MOBILE_AUDIT §2 rules it "fill-rate suicide on tile GPUs". Settled; do not re-litigate. |
| `ResourcePreviewPlane` (355), `AuditSingularity` (371) | Not on `/`. Out of scope. |

---

## 5 · CARD-DENSITY FIXES

Every change below is either `sm:`-prefixed (restored at ≥640px, which is every desktop and the entire pinned path) or inside `@media (pointer: coarse) and (max-width: 639px)`. **No unprefixed class edits.**

### 5.1 Global — `globals.css`, inside the existing coarse block (`:1595`)

```css
@media (pointer: coarse) and (max-width: 639px) {
  .section-lg { padding-block: 3.5rem; }   /* was 5rem (:480) — −48px per section */
}
```
Applies to problem, case-studies, services, production, founders, fit, final-cta = **−336px**. Mirrors the existing 640px breakpoint exactly, so a tablet and a desktop are untouched by construction.

### 5.2 `services-section.tsx` — the "card enormi" epicentre

Measured: the card grid is **2011px of the section's 2550px**; card 04 is 601px, of which its Solves strip is **253px — 42% of the card** — because a `shrink-0 self-center` CTA shares a 326px row with two ~55-character sentences.

| line | from | to | saves |
|---|---|---|---|
| 318 | `flex items-baseline justify-between gap-4` | `flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4` | 60–103px (cards 01, 04) |
| 336 | `… shrink-0 self-center` | `… sm:shrink-0 sm:self-center` | (pairs with 318) |
| 272 | `text-[3.25rem] sm:text-[4rem]` | `text-[2rem] sm:text-[4rem]` | 28px/card |
| 270 | `mb-6 flex items-start justify-between gap-4` | `mb-4 sm:mb-6 flex …` | 8px/card |
| 294 | `text-[15px] text-ink leading-snug mb-6` | `… mb-4 sm:mb-6` | 8px/card |
| 301 | `flex flex-col gap-2 mb-7` | `flex flex-col gap-1.5 mb-5 sm:gap-2 sm:mb-7` | 16px/card |

Result: card 04 **601 → ~438px**, card 01 **519 → ~399px**. Not one character of copy changes; every card still ships all four bullets and both `solves` lines.

**Then the rail** (`:664-685`): replace `<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">` (`:674`) with `<DragRail>` — `overflow-x-auto snap-x snap-mandatory`, `data-lenis-prevent`, stations at `w-[86vw] max-w-[30rem] shrink-0 snap-center`, `useCentreFocus` driving the already-present but inert `[data-pov-focus]` ring (`:241`). Section total: 112 + 238 + 32 + (440 rail + 28 stepper) + 70 = **~920px**, budgeted **1013px / 1.20vh** for IT.

### 5.3 `fit-section.tsx` native branch (`:951-1040`) — paired rows

Today two `fit-col` boxes at `p-6 sm:p-8` stack at `grid-cols-1`, so a reader gets six "Good fit" lines, a column header, then six "Not a fit" lines ~700px later — **the stacking does not just cost height, it destroys the argument.** `GOOD_FIT[i]` is index-paired with `NOT_A_FIT[i]` (`:21`).

Below `lg`, replace the two columns with six bordered rows:
- one legend line ("Good fit / Not a fit"), ~40px
- per row: `FitMedallion` + ✓ statement at `text-[14px]`, then the ✗ counterpart at `text-[12px]` mono `text-ink-mute`, `py-3`, `border-t` — **~106px/row**
- `useCentreFocus` lights the centred pair: the ✓ medallion ignites (reuse `--fit-glow`) and a CSS `transform: scaleX()` pseudo-element redaction bar sweeps the ✗ line. No SVG filter, no `feTurbulence`.
- Keep the `lg:` two-column boxes exactly as they are for ≥1024px.
- Closing `mt-10 sm:mt-12` → `mt-8 sm:mt-12`.

**1604 → ~1078px, budgeted 1097 / 1.30vh.**

### 5.4 Neural centerpieces

| file:line | from | to | saves |
|---|---|---|---|
| `problem-section.tsx:159` | `min-h-[260px] sm:min-h-[320px]` | `min-h-[170px] sm:min-h-[320px]` | 90px |
| `production-grade-section.tsx:402` | `min-h-[300px] sm:min-h-[360px]` | `min-h-[190px] sm:min-h-[360px]` | 110px |
| `production-grade-section.tsx:377` | `mb-12 sm:mb-16` | `mb-8 sm:mb-16` | 16px |
| `production-grade-section.tsx:430` | `mt-14` | `mt-10 sm:mt-14` | 24px |

The lattice is camera-locked in the persistent canvas and needs **no DOM box** — the min-height only reserves room for the SVG fallback. The node markers must survive at the reduced height: they are the `aria-controls` triggers for the cards.

Also wire `useCentreFocus` to the `NeuralCard`s in both sections so the centred card auto-opens (they already tap-toggle on no-hover devices, `neural-card.tsx:123-127`, and are `forceMount` grid-rows `0fr→1fr`, so the copy is always in the DOM). **Name this honestly in review: it is a content-visibility change, not just motion.**

### 5.5 Remaining chrome

| file:line | from | to |
|---|---|---|
| `page.tsx:89` | `py-36 sm:py-52` | `py-24 sm:py-52` (288 → 192px; **not** 128 — `GatewayPortal` already mounts on lite and is the one 3D object a phone gets; the anchor must stay resolvable per the `:68` warning) |
| `final-cta.tsx:72` | `px-6 py-14 sm:px-12 sm:py-20` | `px-6 py-10 sm:px-12 sm:py-20` |
| `case-studies-rail.tsx` closing row | `py-12 sm:py-14` | `py-8 sm:py-14` |
| `founders-rail.tsx` heading `mb` + closing `pb` | — | −52px total, `sm:`-prefixed |

---

## 6 · IMPLEMENTATION PLAN — 8 chunks, file-disjoint

No two chunks in the same wave touch the same file. `MOBILE_AUDIT.md` is the plan of record and gets one outcome section per wave, written by whoever lands last.

### Wave 0 — ships alone, today

**Chunk A · The DPR fix + the capability axis**
*Owns:* `src/webgl/store/tierStore.ts`, `src/webgl/Scene.tsx`, `src/components/fx/use-neural-lattice-fallback.ts`, `src/webgl/NeuralLattice.tsx`, `src/webgl/neural/neuralLatticeConfig.ts`
*Work:* §4.1(a) `detectDprRange` coarse branch; §4.1(b) `phoneGL`; §4.2 line 342 only; §4.3 the complement **in the same commit**; §4.4 the compact count.
*Verify:* (1) On a fine pointer, `useTierStore.getState()` returns `{tier:"full", phoneGL:false, dprInitial:2}` — assert `dprInitial` is unchanged on the dev machine before and after. (2) In Chrome device-mode at 390×844 with touch emulation, `dprInitial === 1` and the R3F backing store measures 390×844, not 780×1688. (3) On a real phone, the SVG neural graph and the WebGL lattice are **never both present** — assert `document.querySelectorAll('[data-neural-fallback]').length` against `phoneGL`. (4) `git diff` must show **zero** changes at Scene.tsx :317, :330, :355, :371, :398, :428, :461.

**Chunk H · The rail primitive** (new files only — collides with nothing)
*Owns:* `src/components/ui/drag-rail.tsx` (new), `src/lib/use-rail-progress.ts` (new)
*Work:* One `<DragRail>` wrapping a native `overflow-x-auto snap-x snap-mandatory` scroller (never a custom gesture — no `preventDefault`, no fight with iOS momentum), `data-lenis-prevent` by default, rubber-band edges, and **one** scroll-linked paint hook consumed by all three rails. Two affordance variants: `progress` (continuous bar — case studies, founders) and `stations` (discrete `01 / 04` stepper — services).
*Verify:* Mount three instances on a scratch route; assert one `scroll` listener + one rAF total, `document.scrollingElement.scrollTop` unchanged during a horizontal swipe, and iOS back-swipe from the left edge still navigates.

### Wave 1 — five engineers in parallel

**Chunk B · The passage**
*Owns:* `src/components/sections/singularity-passage.tsx`, `src/webgl/store/seqStore.ts`
*Work:* §3.2 (JSX + CSS restructure, trigger rebase), §3.3 (a11y contract written into the header **first**), §3.4 (constants + the two new published fields).
*Verify:* Measure `#singularity-passage` `getBoundingClientRect().height` = 180svh ± 2px at 390×844 **and** at 360×640. Step the scrub manually at t = 0.00 / 0.19 / 0.21 / 0.33 / 0.35 / 0.70 / 0.90 / 1.00 and screenshot each. Run the VoiceOver/TalkBack acceptance test in §3.3 — **blocking**. Confirm the address bar collapsing mid-beat produces no jump (svh). Confirm reverse scrub restores the panel to interactive. Confirm `data-on` is removed and `liteRun.style.height` cleared on teardown (EN↔IT toggle, `revertOnUpdate: true`).

**Chunk D · The hero**
*Owns:* `src/components/sections/cinematic-system-scroll.tsx`
*Work:* Rename `MobileFallback` → `StackedFallback`, **byte-identical body**, and route ONLY `reduceMotion` to it. Add `CompactSpine`: a `gsap.matchMedia({ coarse, motionOk })` block (`if (!c.motionOk) return`) that renders `DESKTOP_GROUPS.map(g => <StagePanel compact … />)` absolutely stacked inside `position:sticky; top:0; height:100svh` under a `180svh` runway written in **svh** via the `size()` + `ScrollTrigger.addEventListener("refreshInit", size)` idiom (`singularity-passage.tsx:535-539`). One scrub writes `progressRef`; `StagePanel` already consumes it by ref. `compact` switches the type scale to the mobile clamps already in the file (`clamp(2.25rem,8vw,3.25rem)` H1 / `clamp(2rem,7vw,3rem)` H2) — desktop passes `compact` undefined and renders identically. Fold `(pointer: coarse)` into the media subscription at `:828` (this closes D-11: a coarse 1024px tablet currently gets the desktop `HeroIntroGate` and its `touchmove preventDefault`).
*Verify:* Hero section height = 180svh ± 2px. All three panels' text present in the DOM at every progress. **Desktop + reduced-motion must render today's stacked page** — diff a screenshot against `main` at 1440×900 with RM forced. Test 768 / 820 / 1024 wide, both orientations, coarse and fine. `[data-hero-brand]` must NOT appear in the compact branch.

**Chunk E · Services** — *Owns:* `src/components/sections/services-section.tsx`. §5.2. *Verify:* section height ≤ 1013px EN / ≤ 1150px IT; every card's full text in the DOM (no disclosure); at ≥640px a pixel-diff against `main` must be empty.

**Chunk F · Fit** — *Owns:* `src/components/sections/fit-section.tsx`. §5.3, native branch only. *Verify:* section ≤ 1097px; all 12 statements in source order; at `lg:` the two-column layout is unchanged; `useCentreFocus` `static` mode under RM leaves every row revealed.

**Chunk G · Chrome subtraction** — *Owns:* `src/app/globals.css`, `src/app/page.tsx`, `src/components/sections/problem-section.tsx`, `production-grade-section.tsx`, `final-cta.tsx`, `case-studies-rail.tsx`, `founders-rail.tsx`. §5.1, §5.4, §5.5, plus `<DragRail>` adoption in the two existing rails. *Verify:* per-section heights against the table; a 640px-wide render must be pixel-identical to `main`.

### Wave 2 — after B lands (needs `seqStore.lite` / `liteSwallow`)

**Chunk C · The swallow + the sheath**
*Owns:* `src/webgl/curves/routeCurves.ts`, `src/webgl/SignatureLine.tsx`, `src/webgl/materials/lineNodeMaterial.ts`
*Work:* §3.5 (`routeCurvesCompact` + the `tier` parameter + the `uReveal` damp), §3.6 (the sheath).
*Verify:* **(1) Desktop curve unchanged — assert `getRouteCurve("/", "full") === routeCurves["/"]` by reference in a unit test.** (2) At `tier === "lite"`, walk the compact waypoints and assert every local extremum in `x` has `|x| ≥ 1.1` (the amplitude rule, `routeCurves.ts:31-34`) — `credibility` at x:0 must be a monotone crossing, not a turn-around. (3) The line is visibly extinguished by t = 0.90 in the passage. (4) The sheath does not halo over `HeroLogo` at 390px — check `renderOrder`.

### Wave 3 — measurement, and the only gate that can kill a feature

**Chunk M · Real-device verification.** Screenshots and rAF profiling are impossible in the analysis harness (`document.visibilityState === "hidden"` throttles rAF; MOBILE_AUDIT §6 records the same gap). **Every performance number in this spec is arithmetic, not measurement.**

1. Total-height check, on device, EN and IT:
   ```js
   document.documentElement.scrollHeight / window.innerHeight   // must be ≤ 14.50 (EN) / ≤ 15.20 (IT)
   ```
   plus per-anchor: `[...document.querySelectorAll('[data-line-anchor]')].map(n => [n.dataset.lineAnchor, Math.round(n.getBoundingClientRect().height)])`.
2. **60fps at 4× CPU throttle on a mid-tier Android and on the oldest supported iPhone**, across: the hero pin, the passage beat, and both lattice sections.
   - `NeuralLattice` misses → set `phoneGL` false and ship the SVG. It is one line and the fallback is today's production behaviour.
   - The sheath misses → `SHEATH_RADIUS_MULT` 4.5 → 2.5, re-measure, then remove.
   - The passage misses → the tunnel is already conditional (`tunnelDead`); drop it before touching the CSS layers.
3. Lighthouse mobile: performance must not regress below the 0.61 baseline; LCP must not regress (nothing in this spec pulls `three/webgpu` earlier — the lattices arm mid-page, the hero mounts no new island).
4. Log `navigator.hardwareConcurrency` and `deviceMemory` on every device and reconcile against `LITE_MIN_CORES`.

**Do not let "it felt fine on my phone" close gate 2.**

---

## 7 · WHAT IS EXPLICITLY NOT BEING DONE

| Not doing | Why |
|---|---|
| **Mounting the raymarch (`SequenceSingularity` / `HomeSingularity`) on phones** | Cost (~38M fetches/frame at DPR 1) is only half of it. `PostFXNodes` stays off, so there is no bloom — and `blackHoleMaterial`'s image *is* a selective-bloom contract. An unbloomed 48-step twin at 390px is a different, cheaper-looking object, and it invites a side-by-side comparison the composited hole never does. `HomeSingularity` is additionally impossible: its visibility gate chains to `[data-hero-brand]`, desktop-only DOM. |
| **The full `SceneTier` → capability-model migration (MOBILE_AUDIT §5)** | 13 call sites, and the audit's own verdict is "migration must be atomic, no half-migrated state". It cannot be done without touching desktop code paths. `phoneGL` routes around it: strictly additive, one new store field, `tier === "full" \|\| phoneGL`, never a redefinition. **Semantic debt acknowledged:** after this, `tier === "lite"` no longer implies "no islands", and only the docblock invariant guards it. |
| **`FounderPortraitMorph` and `RailPlanes` on phones** | Both self-gate on a `pinned` store flag only the desktop DOM writes; mounting them renders nothing until the rails are pinned, which is a layout regression this spec reverses. The morph additionally carries the all-or-nothing failure path at `founders-rail.tsx:620-640`. |
| **`PostFXNodes` on phones** | ~5× fullscreen of fill at 100% duty cycle on every route. MOBILE_AUDIT §2 ruled it settled. |
| **Lenis `syncTouch`** | Decided in MOBILE_AUDIT §5: it fights iOS momentum, breaks overscroll and pull-to-refresh, and the choreography is ScrollTrigger-progress-driven, which needs no smoothing to be correct. |
| **A custom horizontal-drag-to-scroll translator (`useThumbTrack`)** | It cannot be built without contesting the OS edge-swipe gestures and iOS momentum, and it delivers nothing a native snap scroller does not. Native scrollers, always. |
| **A segmented control / two-card deck for Fit** | Making the two halves of a comparison mutually exclusive is strictly worse at comparison than stacking them. That mechanic was chosen for a scroll budget and rationalised afterwards. Paired rows are shorter *and* restore the argument. |
| **A fourth lateral rail, or converting the hero to a swipe deck** | Three lateral surfaces (case studies, founders, services) is the ceiling. Beyond that the home stops reading as a cinematic spine and starts reading as an app-onboarding carousel deck — trading the scroll complaint for a worse aesthetic one. The three share one `<DragRail>` primitive so they read as one grammar, and services gets a deliberately distinct discrete stepper. |
| **The two-plate photon ring, and the spinning conic accretion disc** | The first has a visible seam pop at the most exposed moment and costs two extra promoted full-frame layers, for a payoff that one constant (`LITE_HOLE_BASE_VH 56 → 96`) delivers with none of that. The second is off-brand: a rotating cyan ring on a consultancy site reads as a loading spinner. |
| **Growing the gateway gap** | It buys a better `GatewayPortal` read at the cost of scroll, on the page whose complaint is scroll. Cut to `py-24` (a third off) rather than grown or crushed. |
| **Any copy change** | Site copy is final. This includes `production-grade-section.tsx`'s hover-worded string (D-17): if it now reads wrong on touch, **flag it to the owner, do not rewrite it.** |
| **Re-fixing D-18, D-21, founders card height, or `.seq-lite-run`'s 180svh void** | All already landed. Verify before touching — see §0. |
| **Touching `detectTier()` (`tierStore.ts:79-81`)** | It is the choke point for 13 consumers. `tier` keeps its one honest job. |
| **Adding `apple` to the `detectGpuClass()` weak regex** | The obvious fix and a desktop regression: a Safari Mac reports the same string and would drop from `dprInitial 2` to `1`, silently halving desktop canvas resolution site-wide after a change nobody would QA on a Mac. The fix is pointer-scoped in `detectDprRange()` instead. |

---

## 8 · OPEN OWNER DECISIONS (do not build past these unasked)

1. **The 5 → 3 hero merge is editorially visible.** A phone currently reads five discrete headlines; it will read three panels, two of which carry a companion block plus a lead. No copy is written, rewritten or deleted — it is the identical `STAGE_CONTENT` through the identical `DESKTOP_GROUPS` the owner already approved for desktop — but "Signals" and "Audit" will share a screen on mobile for the first time. **Show this one before Wave 1 ships.**
2. **Services as a rail puts 3 of 4 offer cards behind a swipe.** Same reachability status the site already accepts twice, all content in the DOM, visible peek edge + a `01 / 04` stepper. If vetoed, the fallback is the card condensation alone (services 3.02 → 2.42) and the page target moves 14.4 → 15.6.
3. **Auto-opening the neural cards on centre-focus** changes what is painted at rest. Better than never, but it is a content-visibility change and should be named as one.
4. **D-17** — the hover-worded string in `production-grade-section.tsx:359-360` needs an owner-approved touch wording, or it stays wrong on every phone.
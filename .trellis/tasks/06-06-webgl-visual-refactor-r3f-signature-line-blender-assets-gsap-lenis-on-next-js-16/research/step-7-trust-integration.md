# Research: /trust CompliancePipeline3D — SLICE A (integration, architecture, DOM hotspots, wireframe, fallback)

- **Query**: File-level implementation plan for the WebGL `CompliancePipeline3D` centerpiece at the `/trust` "pipeline" anchor — world-anchor vs camera-lock, replace vs augment the SVG, focusable DOM hotspots, drei `<Line>` viability on the WebGPU node path, the full fallback matrix, the Scene mount + 3D↔DOM store, and conflict zones. Coordinate the placement contract with SLICE B (the TSL linked-particle author).
- **Scope**: internal (code) + installed-three TSL/WebGPU API verification
- **Date**: 2026-06-13
- **Branch**: feat/webgl-refactor (no push)

---

## TL;DR for the main agent

- **Architecture recommendation: CAMERA-LOCK, AUGMENT.** Mount `CompliancePipeline3D` as a **camera-locked DOM-synced layer** (the RailPlanes / ResourcePreviewPlane contract) registered to the **`[role=img]` SVG card rect** at the `pipeline` anchor, drawing **BEHIND** the SVG (`renderOrder -1`, the card stays `bg-surface/40` so the 3D shows through). The **SVG stays the legible, accessible diagram**; the 3D adds linked-particle depth + a bloom wireframe around the same 6 stage rects. The SVG becomes the complete fallback on every non-`full+webgpu` path automatically (it is already always rendered).
- **WORLD-ANCHOR is the wrong fit here** (detailed in §A): the pipeline anchor is mid-page with a semi-opaque card on top, and a world-anchored z=0 object de-registers by hundreds of px under SignatureLine's lookAt tilt (the exact reason RailPlanes was camera-locked — state-management spec §"DOM-synced WebGL planes are camera-locked"). World-anchor only makes sense if we choose REPLACE in a transparent gap, which `/trust` does not have at `pipeline` (it has one at `ritual`, already owned by the RouteHero ring).
- **drei `<Line>` does NOT work on the WebGPU node path** (§D, verified). Its material is `three-stdlib` `LineMaterial extends ShaderMaterial` (raw GLSL) → WebGPURenderer NodeBuilder rejects it ("Material ShaderMaterial is not compatible"), identical to the lineNodeMaterial/particleNodeMaterial pitfall. `Line2NodeMaterial` exists in `three/webgpu` BUT its `LineGeometry`/`LineSegmentsGeometry` import from bare `'three'` (core namespace) → mixing `three` + `three/webgpu` in one scene graph, the forbidden dual-namespace. **Use a TSL-authored wireframe**: a thin `TubeGeometry` (or `BufferGeometry` line-segments) with a small **dashed-emissive TSL `MeshBasicNodeMaterial`** (mirror `lineNodeMaterial.ts`), `toneMapped:false` + emissive >1.0 to opt into PostFXNodes selective bloom; animate `uDashOffset` per frame.
- **DOM hotspots**: the 6 regulatory labels become **focusable DOM buttons/links in normal document flow INSIDE the SVG card** (Radian-EXR annotated-hotspot pattern), laid out by the SAME geometry the SVG uses (horizontal ≥sm, vertical stack <md). Because the 3D is camera-locked to the card rect (DOM-following), the hotspots and the 3D both follow the DOM with zero projection plumbing — no "project 3D world-pos → screen store" needed. Keep the SVG `role=img` + `aria-label`; the hotspots are additional real focusable text.
- **OPEN USER DECISION (the key one): REPLACE vs AUGMENT** — framed cleanly in §B. Recommendation: **AUGMENT** (lowest a11y/risk, the SVG is the load-bearing diagram). REPLACE would require relocating the centerpiece to the transparent `ritual` gap (conflicts with the existing RouteHero ring) or making the card transparent (loses the legible diagram on mobile/print). Flag, do not assume.

---

## Files Found / Read (verified against actual code)

| File Path | Role in this slice |
|---|---|
| `src/app/trust/trust-client.tsx` | Renders `<CompliancePipeline />` in `<div data-line-anchor="pipeline">` (L260-262), mid-page between `gdpr-roles` (L215) and `controls` (L265). Anchors verified: `hero / gdpr-roles / pipeline / controls / ritual / final-cta`. |
| `src/components/sections/compliance-pipeline.tsx` | The 2D SVG baseline. `STAGE_KEYS`, `STAGE_LABELS` (EN/IT), `REGULATIONS`, desktop `D_VB 880×140` horizontal / mobile `M_VB 280×720` vertical, GSAP dashoffset streak + per-station ignition, reduced-motion static, `role=img`+`aria-label`. Card wrapper L337-341 is `bg-surface/40` (semi-transparent). |
| `src/webgl/Scene.tsx` | `ROUTE_HERO['/trust']` = procedural ring at `ritual` + the `CompliancePipeline3D` comment (L109-114). Mount gating pattern (RailPlanes L248, ResourcePreviewPlane L256): `pathname===route && tier==="full" && webgpu`, AFTER `<SignatureLine>` (L231). |
| `src/webgl/RouteHero.tsx` | The WORLD-ANCHOR precedent: `k = WORLD_VIEW_HEIGHT/size.height`, `worldY = -fraction * scrollHeight * k`, culling, presence smoothstep, inner emissive >1 (`toneMapped:false`). Already owns `/trust` `ritual` ring. |
| `src/webgl/RailPlanes.tsx` + `materials/railPlaneNodeMaterial.ts` | The CAMERA-LOCK precedent: camera-space `(cx−vw/2)·k, (ih/2−cy)·k, −CAMERA_Z` rotated by `camera.quaternion` + `camera.position`. Rects measured on a `measureVersion` bump only (never per-frame `getBoundingClientRect`). TSL-only, no GLSL twin, DOM complete without it. |
| `src/webgl/ResourcePreviewPlane.tsx` + `materials/resourcePreviewNodeMaterial.ts` | Second camera-lock precedent; lazy TSL factory pattern (`webgpuEnabled()` guard + dynamic import), `__sersanResourcePreview` debug projector. |
| `src/webgl/curves/routeCurves.ts` | `/trust` waypoints (L103-113): `at:0 → hero → gdpr-roles → pipeline → controls → ritual → final-cta`. **Confirmed matches the DOM anchors byte-for-byte (part g).** |
| `src/webgl/store/sectionStore.ts` + `hooks/useSectionAnchors.ts` | `spans[id]` (doc fractions, ALL anchors incl. decorative), `fractions[id]=(start+end)/2`, `scrollHeight`, `measureVersion`. globalThis-pinned (`__sersanSectionStore`). `pipeline` is a REAL section (not in `DECORATIVE_ANCHORS`). |
| `src/components/section-bus.tsx` | The single measurement writer; measures every `[data-line-anchor]` to spans on mount/route/resize/fonts + two late passes (700/1600ms). |
| `src/webgl/PostFXNodes.tsx` | Selective bloom opt-in contract: object outputs color×emissive >1.0 with `toneMapped:false`; `bloom(color, intensity, radius, threshold≈1.0)`. `/trust` bloom is tighter (threshold 0.92). WebGPU node path only. |
| `src/webgl/SignatureLine.tsx` | The SINGLE camera authority (writes `camera.position.y` + lookAt tilt + descent). The `boost` accumulator pattern (L504-508) + the line-pulse signal-store decay discipline (L290-307). |
| `src/webgl/store/routeFxStore.ts` | `/trust` tone (L79-84): cooler, `bloomThreshold 0.92`, `lineColorB "#6E7BFF"`. P0: `routeFx('/')` is verbatim HOME_FX. |
| `src/webgl/gpgpu/gpgpuNodeSim.ts` + `materials/particleNodeMaterial.ts` | TSL precedent for SLICE B: `instancedArray` storage buffers, `Fn(...)().compute(count)`, `.toAttribute().xyz` (16-byte vec3 padding — the CRITICAL swizzle), billboard-quad instancing, selective-bloom emissive. |

---

## (A) WORLD-ANCHOR vs CAMERA-LOCK — RESOLVED

### The constraint that decides it
The `pipeline` anchor sits **mid-page** wrapped by a **real, semi-opaque DOM card** (`bg-surface/40 rounded-xl border`, trust-client L340). The persistent canvas is BEHIND the DOM (`z-0` vs DOM `z-[1]` — state-management spec). So:

- A **world-anchored** 3D object at the pipeline fraction would render BEHIND that card and be **largely occluded** by the `surface/40` fill + the SVG strokes — only ~60% transmission. Worse, the **SignatureLine lookAt-ahead tilt reaches ~0.4 rad mid-page** (RailPlanes header, measured): a z=0 world object de-registers from its on-screen target by hundreds of px as the camera pitches — exactly the failure that forced RailPlanes off world-anchoring (state-management spec, "Do NOT world-anchor planes on the camera strip"). A mid-page diagram that must stay **on-axis and legible while the line's camera tilt is active** cannot be world-anchored.
- RouteHero world-anchors successfully ONLY because it lives in the **transparent `ritual` gap** (clean negative space, no DOM card, the reader pauses there and a few px of tilt drift is invisible on a free-floating ring). `/trust` already uses that gap for the closing ring; the `pipeline` anchor is NOT such a gap.

### Recommendation: **CAMERA-LOCK** (the RailPlanes/ResourcePreviewPlane contract)
Place `CompliancePipeline3D` in **camera space** tracking the SVG card's measured rect:

```
k = WORLD_VIEW_HEIGHT / size.height
camera-space offset = ((cx − vw/2)·k, (ih/2 − cy)·k, −CAMERA_Z)
world = camera.position + camera.quaternion · offset
mesh.quaternion = camera.quaternion           // screen-locked billboard
mesh.scale      = (rectW·k, rectH·k, 1)        // exact DOM rect
```

A camera-facing plane/group at constant camera-space depth projects to an **exact affine screen rect under any camera pose** — the line's tilt, damping, descent and shake all cancel by construction (verified tracking delta 0.0px in RailPlanes). The diagram stays **stable, legible, on-axis** while the cyan→violet line threads past with its tilt.

cy is derived from `window.scrollY` + the card's measured top (its `[data-line-anchor="pipeline"]` rect captured on a `measureVersion` bump — reuse `sectionStore.measureVersion` rather than inventing a new measure path, since the pipeline IS a measured anchor). cx is fixed (centered container). NO `getBoundingClientRect` in the frame loop.

> Note: SLICE B's linked particles must therefore be authored in **the SAME camera-space frame** as the wireframe — see the explicit placement contract in §"COORDINATION WITH SLICE B".

---

## (B) REPLACE vs AUGMENT — the KEY OPEN USER DECISION (frame, do not assume)

Both options keep the frozen copy byte-identical and keep a complete accessible fallback. They differ in what is the *primary visual* on `full+webgpu`.

### Option 1 — AUGMENT (RECOMMENDED): 3D sits BEHIND the SVG
The SVG `CompliancePipeline` stays the legible diagram exactly as today. The camera-locked 3D adds, BEHIND it (the card stays `bg-surface/40`, the SVG station fills could drop to `surface/30` so particles glint through): (a) SLICE B's linked particles flowing stage→stage; (b) a TSL wireframe tracing the conduit/stage frames with animated dashOffset, opted into selective bloom.

| | AUGMENT |
|---|---|
| **Drama** | Medium — depth + glow behind a crisp diagram. Reads "engineered", on-brand for a sober AI consultancy. |
| **Risk** | LOW — SVG is untouched and load-bearing; if the 3D mis-registers a few px it's a soft backdrop, never the diagram. Mirrors the shipped RailPlanes/ResourcePreviewPlane pattern exactly. |
| **A11y** | BEST — SVG `role=img`+`aria-label` + the focusable hotspots are the whole semantic story; the 3D is decorative `aria-hidden` by living in the canvas. |
| **Effort** | LOWER — reuse the camera-lock plane harness; the SVG, GSAP streak, reduced-motion path all stay. |

### Option 2 — REPLACE: 3D is the centerpiece, SVG becomes fallback-only
On `full+webgpu` the SVG is visually hidden (kept in the DOM for a11y, `sr-only` or `opacity-0`/`aria-hidden` swap) and the 3D linked-particle pipeline + wireframe is the diagram. SVG shows on off/lite/RM/SSR/WebGL2-flag-off.

| | REPLACE |
|---|---|
| **Drama** | HIGH — the named "centerpiece"; full Lusion-grade moment. |
| **Risk** | HIGH — a camera-locked 3D diagram must carry the *information* (6 ordered, labelled stages) pixel-stably mid-page while the line tilts; any registration slip degrades comprehension, not just polish. Hiding the SVG risks a11y regressions if the swap is done wrong (must stay in the a11y tree). The "diagram mirrors the actual checkpoints" copy must remain literally true of the 3D. |
| **A11y** | OK only if the hidden SVG stays in the accessibility tree (`sr-only`, never `display:none`) AND the hotspots remain focusable; more ways to get wrong. |
| **Effort** | HIGHER — the 3D must legibly render 6 ordered labelled stages (the labels still come from DOM hotspots), the dual-visual swap, and a per-tier visibility toggle. |

### Recommendation
**AUGMENT.** It honors "the diagram below mirrors the actual checkpoints" (the SVG remains the truth), is the lowest-risk match to two already-shipped camera-locked planes, and keeps the a11y story trivially correct. REPLACE is only worth it if the user explicitly wants the pipeline to be a hero moment and accepts mid-page registration risk — and even then the cleaner path is to move a world-anchored centerpiece into the transparent `ritual` gap, which collides with the existing RouteHero ring. **This is a user call; present both.**

---

## (C) DOM HOTSPOTS — the 6 regulatory labels as focusable, keyboard-navigable elements

### Layout & alignment
Because the chosen architecture is **camera-lock = the 3D follows the DOM**, there is **NO need to project 3D world-positions → screen** for the hotspots. The hotspots are laid out in **normal document flow inside the SVG card**, at the SAME geometry the SVG already computes (`D_STAGE_X` horizontal ≥sm; a vertical stack <md mirroring `M_STAGE_Y`), and the camera-locked 3D simply registers to the same card rect — both follow the DOM together. This is strictly simpler and more robust than a DOM-reads-a-projection-store design (which would be required only if we WORLD-anchored, the rejected option).

Implementation: add a focusable, keyboard-navigable annotated-hotspot layer (Radian-EXR pattern) — one `<button>` (or `<a>` if it links to the matching `/trust` prose section, e.g. the `audit` stage → the controls/audit-log copy) per stage, absolutely/grid-positioned over the SVG stage centers, carrying the **frozen** `STAGE_LABELS[k]` + `REGULATIONS[k]` text. They are **real focusable text**, tab-ordered input→output, each with `aria-label` like `"Stage 2 of 6: PII redaction — GDPR, EU AI Act Article 10"` (EN/IT). On focus/hover a hotspot can `bump` a signal store (§F) so the 3D wireframe/particles pulse at that stage — but the DOM text is the source of truth and works with the 3D entirely off.

### A11y preservation
- Keep the SVG `role=img` + the existing `aria-label` (frozen EN/IT) exactly.
- The hotspots are ADDITIVE focusable text; do not remove the SVG `<text>` labels. (If REPLACE is chosen, the SVG must stay in the a11y tree via `sr-only`, never `display:none`.)
- The whole 3D canvas is already `aria-hidden`-equivalent (it's a decorative persistent canvas behind the DOM), so adding particles/wireframe introduces no new a11y surface.

---

## (D) WIREFRAME schematic — drei `<Line>` viability + the TSL alternative (VERIFIED)

### Finding (decisive): drei `<Line>` is NOT usable on the WebGPU node path
- `@react-three/drei@10.7.7` `<Line>` (and `CatmullRomLine`/`QuadraticBezierLine`) build a `three-stdlib` `Line2` + **`LineMaterial`**, and `three-stdlib/lines/LineMaterial.js` is `class LineMaterial extends ShaderMaterial` (raw GLSL). Under `WebGPURenderer` the NodeBuilder **rejects raw `ShaderMaterial`** ("Material ShaderMaterial is not compatible") → black silhouette. This is the SAME pitfall documented in `lineNodeMaterial.ts` / `particleNodeMaterial.ts`. So drei `<Line>` is out on `full+webgpu`.
- `three/webgpu` DOES export **`Line2NodeMaterial extends NodeMaterial`** (verified `three.webgpu.js` L22149) with `dashed`, `dashOffset`, `dashSize`, `dashScale`, `worldUnits`, `linewidth`, `offsetNode` — a WGSL-capable thick line. **BUT** its geometry (`LineGeometry`/`LineSegmentsGeometry`, in `three/examples/jsm/lines/`) imports `InstancedBufferGeometry`, `WireframeGeometry`, etc. from **bare `'three'`** (verified). Pulling those next to `three/webgpu` mixes the two namespaces in one scene graph — the explicit forbidden dual-namespace (`createRenderer`/`lineNodeMaterial` headers; webgpu-migration-spec). So `Line2NodeMaterial` + example `LineGeometry` is **NOT compliant** here.

### Recommendation: a TSL-authored wireframe (no drei, no example-lines geometry)
Build the conduit/stage-frame wireframe with **core geometry you construct yourself + a TSL node material**, exactly the repo's established pattern:

- **Geometry**: a thin `THREE.TubeGeometry` along a `CatmullRomCurve3` through the 6 stage centers (smooth glowing conduit, mirrors SignatureLine), and/or `THREE.BufferGeometry` line-segments for the rectangular stage frames (built like RouteHero's `buildLatticeGeometry` strut approach — core `three`, no examples import). `LineSegments`/`Line` primitives DO render under WebGPURenderer **as long as the material is a NodeMaterial**; the breakage is the material, not the primitive.
- **Material**: a small `createPipelineWireMaterial()` TSL `MeshBasicNodeMaterial` (new file `src/webgl/materials/compliancePipelineNodeMaterial.ts`), mirroring `lineNodeMaterial.ts`: a `uDashOffset`/`uDashScale` uniform driving a `fract()`-based dash mask along a per-vertex arc-length attribute (or `uv().x` on the tube), output color = cyan→violet ramp × `uEmissive` (>1.0), `toneMapped:false`, additive. The animated dashOffset is a per-frame `u.uDashOffset.value += delta * speed` write — the dash crawls the conduit.
- **Bloom opt-in**: emissive >1.0 + `toneMapped:false` → PostFXNodes selective bloom catches ONLY the wire (the `surface/40` card + SVG stay ≤1.0). Use the `/trust` cooler tone (threshold 0.92 already in routeFxStore).

TSL nodes needed (`fract`, `sin`, `mix`, `smoothstep`, `float`, `vec3`, `uniform`, `uv`, `Fn`, `positionLocal`, `abs`, `oneMinus`) are all verified present in the installed 0.184.0 build (already used by railPlaneNodeMaterial / lineNodeMaterial / particleNodeMaterial).

---

## (E) FALLBACK MATRIX — the SVG is the complete accessible visualization on ALL non-`full+webgpu` paths

| Tier / flag | Canvas? | PostFX? | 3D pipeline mounts? | What the user sees |
|---|---|---|---|---|
| **off** (incl. `prefers-reduced-motion` → tier resolves to off, CanvasHost renders nothing) | no | n/a | NO | The SVG `CompliancePipeline` — static (its own reduced-motion branch L100-104: no streak, stations softly lit) + focusable hotspots. Complete. |
| **lite** | yes | NO (PostFX/PostFXNodes gated to `full`) | NO | SVG (with GSAP streak, motion OK) + hotspots. No 3D. |
| **full + WebGL2 (flag OFF, `!webgpuEnabled()`)** | yes (classic WebGLRenderer) | PostFX (EffectComposer) | NO — the 3D is TSL-only, gated on `webgpuEnabled()` exactly like RailPlanes/ResourcePreviewPlane (no GLSL twin) | SVG + hotspots. No 3D. |
| **full + WebGPU (`webgpuEnabled()` true)** | yes (WebGPURenderer) | PostFXNodes (selective bloom) | **YES** — the only path | SVG + hotspots + camera-locked particles (SLICE B) + TSL wireframe with bloom. |

Rules enforced:
- Gate the mount in Scene.tsx as `pathname === "/trust" && tier === "full" && webgpu` (the `webgpu` const already in Scene, the build-time `webgpuEnabled()`), AFTER `<SignatureLine>` (camera authority writes first).
- Inside the component, a defense-in-depth `webgpuEnabled()` early-return before the lazy TSL import (same as RailPlanes L100 / ResourcePreviewPlane L65).
- **The SVG must NOT be conditionally unmounted** for AUGMENT. For REPLACE, hide it visually ONLY via `sr-only`/`aria-hidden`+`opacity-0` gated on `tier==="full" && webgpu` resolved client-side, never `display:none`, never removed from the DOM (SSR renders the SVG; a11y tree keeps it).
- Frozen copy: `STAGE_LABELS`, `REGULATIONS`, the eyebrow/H2/description/footer prose, the `role=img` aria-label — byte-identical EN/IT, untouched. Hotspot labels REUSE `STAGE_LABELS`/`REGULATIONS` (no new copy strings beyond composed aria-labels, which are bilingual via `isEn`).

---

## (F) Scene.tsx mount + store design + CONFLICT ZONES

### Mount (Scene.tsx, after L258, before the PostFX block)
```tsx
{pathname === "/trust" && tier === "full" && webgpu && <CompliancePipeline3D />}
```
Mirror the RailPlanes/ResourcePreviewPlane comment block (camera authority ordering rationale). Import `CompliancePipeline3D` at top with the other webgl components.

### Store design (3D ↔ DOM sync) — globalThis-pinned
Add `src/webgl/store/compliancePipelineStore.ts` (zustand, globalThis-pinned `globalThis.__sersanCompliancePipeline ??= create(...)`), the line-pulse signal-store convention (state-management spec §"line-pulse signal stores"). One store per surface — do NOT hijack `sectionStore.pulse`. Fields:
- `hovered: number` (−1 none, else 0..5) — which stage hotspot is focused/hovered. DOM writer = the hotspot layer in `compliance-pipeline.tsx`; WebGL reader = `CompliancePipeline3D.useFrame(getState())`.
- Optional `pulse[6]` per-stage targets bumped on hotspot focus, decayed in `CompliancePipeline3D`'s useFrame with `THREE.MathUtils.damp(target,0,7,delta)` writing back + skipping once settled (mirror SignatureLine L290-307). Drives a per-stage wireframe/particle ignition.
- The card rect (cx/cy/w/h) does NOT need a new store — read `[data-line-anchor="pipeline"]` rect on `sectionStore.measureVersion` bumps inside `CompliancePipeline3D` (reactive subscribe to `measureVersion`, like RailPlanes subscribes to `pinned`/`measureVersion`).

Behavior on WebGL2-fallback/off/lite: the store still exists and the DOM hotspots still `set` it (harmless — no reader mounts), so the DOM layer is identical on every tier; only `CompliancePipeline3D` (the reader) is gated.

> Optionally feed a `pipelineWireBoost` term into SignatureLine's existing `boost` accumulator (L504-508), gated `pathname==="/trust" && store.hovered>=0`, weight ~0.2, so the signature line itself ticks as the reader scans stages — additive into the SINGLE clamp, no new uniform (state-management spec rule 3). Treat as OPTIONAL polish; flag for the user.

### CONFLICT ZONES (files shared with other slices / other work)
- **`Scene.tsx`** — one added import + one gated mount line (after ResourcePreviewPlane). SLICE B also touches the same component if particles mount separately; coordinate so `CompliancePipeline3D` owns BOTH the wireframe and the particle child (single mount, single camera-lock frame) — see §coordination.
- **`PostFXNodes.tsx`** — NO code change; the wireframe opts into the EXISTING selective bloom purely via material flags (>1.0 emissive + `toneMapped:false`). Do NOT add a second bloom pass.
- **`routeCurves.ts`** — NO change (part g: anchors already match).
- **`routeFxStore.ts`** — `/trust` tone already cooler; reuse it. If the wire wants a dedicated emissive scale, that is a small `RouteFx` field addition shared with SLICE B/other routes — touch carefully (P0: `/` stays HOME_FX). Prefer NOT to add a field; read the existing `/trust` colors.
- **`sectionStore.ts`** — NO change; `pipeline` is already a measured non-decorative anchor. Just READ `spans["pipeline"]` / `measureVersion`.
- **`SignatureLine.tsx`** — only if the optional `pipelineWireBoost` is added (one gated term in the existing clamp). Otherwise untouched. SLICE B must NOT add a second camera writer.
- **`globals.css`** — likely a small rule for the hotspot focus ring / the absolutely-positioned hotspot layer (or do it with Tailwind utility classes in the component and avoid touching globals.css entirely — PREFERRED, to dodge the shared-file conflict). 891 lines today; no existing `data-line-anchor` rules.
- **`compliance-pipeline.tsx`** — primary edit target: add the focusable hotspot layer + (REPLACE only) the tier-gated SVG visual-hide. The SVG geometry/copy/GSAP/reduced-motion path stay.

---

## (G) /trust anchors vs routeCurves — CONFIRMED, no fix needed

DOM (`trust-client.tsx`): `hero`(L141) · `gdpr-roles`(L215) · `pipeline`(L260) · `controls`(L265) · `ritual`(L325) · `final-cta`(L328).
routeCurves `/trust` (L103-113): `at:0 → hero → gdpr-roles → pipeline → controls → ritual → final-cta`.
**Exact match.** The PIANO_RESTYLE anchor-fix is already done. Do NOT re-fix.

---

## COORDINATION WITH SLICE B (the TSL linked-particle author) — placement contract

SLICE A owns placement; SLICE B authors the particle look. **Binding decision: CAMERA-LOCK, AUGMENT** (subject to the user's REPLACE/AUGMENT call, which only changes SVG visibility, NOT the coordinate frame). Author particles to THIS frame:

1. **Coordinate frame = camera space, not world space.** `CompliancePipeline3D` is a single group placed each frame at `camera.position + camera.quaternion·((cx−vw/2)·k, (ih/2−cy)·k, −CAMERA_Z)` with `quaternion = camera.quaternion`, scaled to the card rect (`w·k × h·k`). SLICE B's particle emitters/positions must be authored in **the group's LOCAL space**, i.e. a unit-ish rect mapped to the 6 stage centers — NOT in document/world Y. Do NOT world-anchor the particles to the `pipeline` fraction (that re-introduces the lookAt-tilt de-registration this slice rejected).
2. **6 emitter anchors** in local space at the 6 stage X positions (horizontal ≥sm) — A will export the stage local-coordinates (derived from `D_STAGE_X` normalized to [−0.5,0.5]) as a shared const so the wireframe stage frames and B's emitters land on the same points. Vertical stack mapping <md if the mobile layout mounts the 3D (likely desktop-only — confirm with user; mobile can stay SVG-only).
3. **Bloom contract**: particle HDR accents emissive >1.0 + `toneMapped:false`; the sub-threshold body stays ≤1.0 so the navy card doesn't bloom. FIXED cyan→violet ramp, NO hue-cycling (PIANO §9.7).
4. **Storage-buffer caveat (CRITICAL)**: if B uses `instancedArray` vec3 storage buffers (gpgpu pattern), every render-stage read MUST trail `.toAttribute().xyz` (vec3 is 16-byte padded → 4-component node; a bare `vec4(paddedVec3,1.0)` silently drops the 1.0 / throws). See gpgpuNodeSim.ts L616-623, L645.
5. **HEADLESS HAS NO WEBGPU** — B's compute/particle path + the wire's selective bloom MUST be verified in a REAL Chrome with WebGPU; headless next build only type-checks (quality-guidelines).
6. **Single mount**: A's `CompliancePipeline3D` is the ONE component Scene.tsx mounts; it renders the wireframe + B's particle child inside the same camera-locked group (one camera-lock computation per frame, shared rect).

---

## Files to EDIT
- `src/webgl/Scene.tsx` — import + gated mount line (after ResourcePreviewPlane, before PostFX), mirroring the RailPlanes comment.
- `src/components/sections/compliance-pipeline.tsx` — add focusable DOM hotspot layer (reusing frozen `STAGE_LABELS`/`REGULATIONS`, bilingual aria-labels); writer to `compliancePipelineStore`; (REPLACE only) tier-gated `sr-only` SVG visual-hide. SVG/GSAP/reduced-motion/copy untouched.
- `src/app/trust/trust-client.tsx` — likely NO change (the `data-line-anchor="pipeline"` wrapper and all copy stay). Touch only if the hotspot layer needs a wrapper hook; prefer keeping it inside `compliance-pipeline.tsx`.
- `src/webgl/SignatureLine.tsx` — OPTIONAL: one gated `pipelineWireBoost` term in the existing boost clamp (flag to user).
- `globals.css` — AVOID; use Tailwind classes in-component for the hotspot focus styling.

## Files to CREATE (webgl casing: PascalCase components, camelCase material/store .ts)
- `src/webgl/CompliancePipeline3D.tsx` — the camera-locked group: reads `sectionStore.measureVersion` for the `pipeline` card rect, places in camera space (RailPlanes math), hosts the TSL wireframe + SLICE B's particle child, lazy-imports its TSL material (`webgpuEnabled()` guard), dev `__sersanCompliancePipeline` debug projector.
- `src/webgl/materials/compliancePipelineNodeMaterial.ts` — the TSL dashed-emissive wireframe material (`createPipelineWireMaterial()`), mirroring `lineNodeMaterial.ts`: `uDashOffset`/`uDashScale`/`uEmissive`/`uColorA`/`uColorB`, `fract()` dash, >1.0 emissive, `toneMapped:false`, additive. No drei, no examples-lines import, no `Line2NodeMaterial` (dual-namespace).
- `src/webgl/store/compliancePipelineStore.ts` — globalThis-pinned signal store (`hovered`, optional per-stage `pulse[6]`), DOM writer / WebGL reader.
- (SLICE B owns its particle material/sim file; A exports the shared stage-local-coords const for B to target — put it in `CompliancePipeline3D.tsx` or a tiny `src/webgl/curves/pipelineStages.ts`.)

---

## QA plan (real Chrome WebGPU vs headless)
1. `next build` + `tsc` (the only build gates; quality-guidelines) — catches type errors but NOT TSL graph compile (graphs compile on first `post.render()`).
2. **Real Chrome, WebGPU flag ON**: load `/trust`, scroll to the pipeline section. Verify: wireframe blooms (cyan→violet, dash crawling), particles flow stage→stage, the diagram stays pixel-registered to the SVG card while the signature line's tilt is active (scroll up/down past it), no console errors. Use `__sersanCompliancePipeline.project(i)` to assert the 3D group registers to the SVG card rect (delta ~0px, like `__sersanRailPlanes`).
3. **Real Chrome, WebGPU flag OFF (WebGL2)**: `/trust` shows SVG + hotspots only, no 3D, PostFX (EffectComposer) still runs, no console errors.
4. **lite tier** (throttle / force): SVG + hotspots, no 3D, no PostFX.
5. **`prefers-reduced-motion`**: emulate in DevTools → canvas absent (tier off), SVG static branch + hotspots fully usable.
6. **Keyboard a11y**: Tab through the 6 hotspots input→output, focus ring visible, screen-reader announces frozen `STAGE_LABELS`+`REGULATIONS` (EN and IT). SVG `role=img`+`aria-label` intact.
7. **EN/IT**: toggle language; all copy byte-identical to current site, no double-animation of split-reveal headings (`key={language}` already on the SVG H2).

---

## Caveats / Not Found
- The `webgpu_tsl_vfx_linkedparticles` example is NOT vendored in `node_modules/three/examples` here — SLICE B will need exa/web for the exact MIT recipe. This does not affect SLICE A's placement contract (camera-locked local-space group + 6 stage anchors) which holds regardless of B's internal sim.
- Whether the 3D mounts on MOBILE (where the SVG is the vertical `M_VB` layout) is an open question — recommend desktop-only (`≥md`) for the 3D to avoid re-deriving the vertical stage mapping in camera space; confirm with user. Mobile keeps SVG + vertical hotspot stack regardless.
- REPLACE-vs-AUGMENT and the optional `pipelineWireBoost` are explicit USER decisions — flagged, not assumed.

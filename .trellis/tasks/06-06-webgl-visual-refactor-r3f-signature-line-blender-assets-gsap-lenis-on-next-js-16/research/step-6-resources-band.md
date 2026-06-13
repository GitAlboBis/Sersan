# Step 6 — Beat 3: /resources closing band + ImageReveal hover preview

- **Query**: Implementation plan for PIANO §5.4 — add a real CLOSING BAND under `/resources` `data-line-anchor="final-cta"` (today a zero-content aria-hidden div, so the signature line "dies in the void") + a floating cursor-following hover PREVIEW over the article list (ui-layouts ImageReveal pattern → `gsap.quickTo` + an R3F plane inheriting the pointer flowmap).
- **Scope**: internal (code) + external (gsap 3.15.0 API verified against installed typings; ui-layouts ImageReveal pattern)
- **Date**: 2026-06-13
- **Installed versions**: next 16.2.6 · three 0.184.0 · @react-three/fiber 9.6.1 · gsap 3.15.0 · @gsap/react 2.1.2

---

## 0. Verified facts (read from the actual code, not assumed)

1. **`/resources` is the ONLY route whose `final-cta` is a zero-content `aria-hidden` div.** Every other route wraps a REAL closing `<section data-line-anchor="final-cta">`:
   - `/audit` (`src/app/audit/audit-client.tsx:497`) — Cal embed closing CTA.
   - `/case-studies` (`:158`) — "Want this kind of work in your business?" SectionHeading + buttons.
   - `/contact` (`:312`) — related-links row.
   - `/about` (`:298`) — "One week. Inside your stack. A written verdict." SectionHeading.
   - `/consulting` (`:460`), `/trust` (`:328`) — real sections.
   - `/resources` (`src/app/resources/resources-client.tsx:130-134`) — `ritual` = `py-28 sm:py-40` gap (real height), `final-cta` = **`<div aria-hidden="true" />` with NO content and NO height** → the curve tail waypoint `{ anchor:"final-cta", x:0, z:0.6 }` collapses onto the bottom of the `ritual` gap, so the beam has no real terminus band.

2. **`resources.ts` has NO image/thumbnail/cover field.** `Resource` = `{ slug, title, titleIt, excerpt, excerptIt, category, publishedAt, readMinutes, authorName, authorRole, authorRoleIt, tags, body, bodyIt }` (`src/data/resources.ts:6-23`). There are 3 entries. **The hover preview cannot show a per-article image** — it must be a generated/abstract visual. This is decisive for decision (b).

3. **A ritual ring already mounts on /resources.** `Scene.tsx:105` → `ROUTE_HERO["/resources"] = { kind:{ type:"procedural", shape:"ring" } }`, world-anchored to `data-line-anchor="ritual"`. So the closing motif (the line resolving into a ring) is ALREADY present at `ritual`. The missing piece is the DOM band at `final-cta`, not a 3D object.

4. **Curve tail** (`src/webgl/curves/routeCurves.ts:129-137`): `/resources` waypoints = `[{at:0,x:1.2,z:-0.4}, {anchor:"hero",x:-1.2,z:0.2}, {anchor:"list",x:1.2,z:-0.2}, {anchor:"ritual",x:0,z:0.6}, {anchor:"final-cta",x:0,z:0.6}]`. The `final-cta` waypoint already exists and is consumed — `SignatureLine.tsx:171-176` maps each waypoint to `-fraction*scrollHeight*k`, fraction = `anchors.fractions[wp.anchor] ?? wp.at ?? 0` (center fraction from `sectionStore.spans`). **Giving `final-cta` real height shifts ITS measured center fraction DOWN the document, which is exactly what gives the line a proper terminus band.** No new waypoint needed.

5. **Anchors are measured by `section-bus.tsx`** (`querySelectorAll("[data-line-anchor]")` → `getBoundingClientRect` → document-fraction spans → `sectionStore.setMeasured`). A zero-height div yields `start≈end` at the gap bottom. A real section yields a real span; `final-cta` is in `DECORATIVE_ANCHORS`? **NO** — `DECORATIVE_ANCHORS = {work-in-progress, gateway, ritual}` (`sectionStore.ts:34-38`). `final-cta` is a REAL section id on every other route, so making it a real section on /resources is consistent (it will also join `sections`/IntersectionObserver identity, matching the other routes — desired).

6. **Camera-locked DOM-synced plane reference = `RailPlanes.tsx` + `railPlaneNodeMaterial.ts`.** Gating: mounted in `Scene.tsx:247` only on `pathname==="/" && tier==="full" && webgpu`. TSL-only, NO GLSL twin (documented decision in `railPlaneNodeMaterial.ts:1-13`); on flag-OFF WebGLRenderer path it hard no-ops and the DOM is complete on its own. Placement = camera-space offset at `-CAMERA_Z`, inherits `camera.quaternion`, rects measured only on `measureVersion` bumps, per-frame via `getState()`. **Mounted AFTER SignatureLine** (the only camera writer).

7. **Pointer flowmap** (`fluid/PointerFlowmap.ts`) is constructed ONLY inside `PostFXNodes` (WebGPU path, full tier). It exposes `flowTexNode` (a TSL `texture()` node) and `uStrength`. It is **not currently exported to other components** — it lives inside PostFXNodes' closure. To let the preview plane "inherit the pointer flowmap" we either (i) read the smoothed pointer/velocity straight from `pointerStore` (simpler, identical visual driver, no coupling to PostFXNodes' private flowmap), or (ii) publish the flowmap texture via a store. **Recommended: (i)** — see §2.

8. **`pointerStore`** (`store/pointerStore.ts`): `raw/smooth/vel` in clip space [0..1] top-left, `down`, `active`. `installPointerTracking()` **no-ops under reduced-motion OR coarse pointer** (`:113-118`) — so on touch the smoothed pointer never updates. `updatePointer(dt)` runs once per frame from FrameDriver. This is the single source of truth the preview plane should read.

9. **tier semantics** (`store/tierStore.ts`): `off` = prefers-reduced-motion OR no WebGL (no canvas at all); `lite` = coarse pointer OR width<768 (no postprocessing, simplified line); `full` = desktop capable GPU. So: **reduced-motion → no canvas → band must be self-sufficient; coarse/mobile → lite → no hover preview (and pointer tracking is off anyway).**

10. **gsap 3.15.0 `quickTo` verified** (`node_modules/gsap/types/gsap-core.d.ts:515`): `gsap.quickTo(target, property, vars?) → QuickToFunc`, where `QuickToFunc = (value:number, start?:number, startIsRelative?:boolean) => Tween` (`:43-46`). `quickSetter(targets, property, unit?)` also present. Both are appropriate for the cursor-follow. `useGSAP` from `@gsap/react` 2.1.2 is available for scoped cleanup.

---

## 1. Files to EDIT / CREATE

### EDIT

| File | Change |
|---|---|
| `src/app/resources/resources-client.tsx` | Replace the zero-content `final-cta` div (`:132-134`) with a REAL closing `<section data-line-anchor="final-cta">` reusing existing copy + component (see §3a). Add hover wiring on the article list: a stable ref/handlers on each list `<Link>` (`data-resource-index`, `onPointerEnter/Move/Leave`) feeding a new client preview controller. Keep the `ritual` gap unchanged. |
| `src/webgl/Scene.tsx` | Mount the new `ResourcePreviewPlane` exactly like `RailPlanes`: `{pathname === "/resources" && tier === "full" && webgpu && <ResourcePreviewPlane />}`, AFTER `<SignatureLine>` (camera authority ordering). Add the import. |
| `src/webgl/store/pointerStore.ts` | **No structural change required** — preview reads `smooth`/`vel`/`active` via `getState()`. (If a hover-target signal is needed cross-island, see §2 alt; preferred design keeps hover state in the new preview store, not pointerStore.) |

### CREATE

| File (kebab-case) | Purpose |
|---|---|
| `src/components/resources/resource-preview.tsx` | **DOM controller (client).** Owns the cursor-follow via `gsap.quickTo`, the hover index state, the coarse/RM gate, and the DOM/CSS fallback card. Renders the floating preview container (DOM fallback visual) + writes hover state to the preview store. Exposes pointer handlers used by `resources-client.tsx`. |
| `src/webgl/store/resourcePreviewStore.ts` | **Transient zustand store (globalThis-pinned).** Bridges the route bundle (DOM controller, writer) and the lazy WebGL island (plane, reader). Fields: `activeIndex: number\|-1`, `targetX/targetY` (clip [0..1] top-left, the eased follower position), `seed`, plus setters. Pin on `globalThis` (same reason as `sectionStore`/`textMorphStore` — Turbopack inlines store copies per chunk). |
| `src/webgl/ResourcePreviewPlane.tsx` | **R3F camera-locked plane (WebGPU full-tier only).** Mirrors `RailPlanes`: lazy TSL material factory, camera-space placement at `-CAMERA_Z` inheriting `camera.quaternion`, per-frame reads via `getState()`. Reads `resourcePreviewStore` for position/hover + `pointerStore.vel` for the flow bend. Hard no-op when `!webgpuEnabled()`. |
| `src/webgl/materials/resource-preview-node-material.ts` | **TSL NodeMaterial (no GLSL twin — same rationale as railPlaneNodeMaterial).** The abstract "signal" visual: navy base + cyan→violet vertical gradient field, a soft reveal disk that grows with `uHover`, a velocity bend from `uVel` (the inherited flow), edge feather. `toneMapped:false`, scan band >1.0 so the existing selective bloom catches it. |

---

## 2. Data / signal design

**Store: `resourcePreviewStore` (new, globalThis-pinned, transient).**

- **Writer**: `resource-preview.tsx` (route bundle, DOM). On `pointerenter`/`pointermove` over a list item it sets `activeIndex` and the eased follower target. The follower easing itself is done with `gsap.quickTo` driving a plain object `{x,y}` (clip space), and on each gsap tick it writes `targetX/targetY` into the store (so the WebGL reader stays a pure getState consumer). On `pointerleave` of the whole list → `activeIndex = -1`.
- **Reader (WebGPU path)**: `ResourcePreviewPlane.tsx` reads `activeIndex/targetX/targetY/seed` via `getState()` in `useFrame`, eases an internal `uHover` (damp toward `activeIndex>=0 ? 1 : 0`), and places the plane at the follower position (camera-locked, like RailPlanes). It additionally reads `pointerStore.getState().vel` to drive the bend uniform — **this is how the plane "inherits the pointer flowmap"**: same smoothed velocity that feeds `PointerFlowmap` (`fluid/PointerFlowmap.ts` reads the same `pointerStore` smoothed vel), so the preview bows with the cursor exactly like the global liquid-glass breath, WITHOUT coupling to PostFXNodes' private flowmap closure.
  - *(Alt, NOT recommended)*: export the actual `flowTexNode` from PostFXNodes via a store and sample it in the plane material. Rejected: PostFXNodes owns the flowmap lifecycle/ping-pong; sharing the live RT texture across components is fragile (uuid rebind timing, dispose ordering) for a marginal visual gain over reading the same `pointerStore.vel`. Cite `PointerFlowmap.ts:30-43` (single-loop, PostFXNodes-owned).
- **Reader (DOM fallback)**: `resource-preview.tsx` itself renders a small DOM card following the same `quickTo` object, shown only when WebGL preview is NOT active (lite tier / flag-OFF). Both readers share the SAME `quickTo` follower so behavior is identical regardless of path.

**Both WebGPU + WebGL2-fallback paths**: the plane is TSL-only and mounts only on the `webgpuEnabled()` build (full tier). On the classic flag-OFF WebGLRenderer build the plane never mounts; the DOM fallback card in `resource-preview.tsx` is the whole preview. This mirrors `RailPlanes` exactly (`railPlaneNodeMaterial.ts:1-13`).

**No re-renders in the hot path**: store writes happen at gsap tick rate (cheap, shallow), reads are `getState()` in `useFrame`. `activeIndex` change is rare (on hover enter/leave) — a reactive subscription there is fine for the DOM fallback card mount/unmount.

---

## 3. Resolved recommendations

### (a) Closing-band content — REUSE existing copy/component, do NOT invent

**Copy-freeze is a hard constraint.** Two compliant options, both reuse frozen copy:

- **RECOMMENDED — mirror `/case-studies`'s closing CTA verbatim.** `/resources` is a content/proof page exactly like `/case-studies`; its closing CTA copy fits "you read what we shipped → now talk to us":
  - Title (EN): *"Want this kind of work in your business?"* / (IT) *"Volete questo tipo di lavoro nella vostra azienda?"* — `case-studies-client.tsx:172-185`.
  - Description (EN): *"A free scoping call is the easiest way to find out where it would have the highest impact."* / (IT) *"Una call di scoping gratuita è il modo più semplice per capire dove avrebbe l'impatto maggiore."* — `:188-191`.
  - Button → `/audit` (or `START_HREF`), label *"Book a scoping call" / "Prenota una call di scoping"* — already the site-wide frozen CTA.
  - Implementation = copy the `<section data-line-anchor="final-cta" className="section-lg relative">` block from `case-studies-client.tsx:158-205` (SectionHeading + radial glow + Button). It already uses `SectionHeading`, `Reveal`-free, and the same `data-split-reveal` choreography contract. Resources-client currently imports `Reveal` only; add `SectionHeading`, `Button`, `Link`, `ArrowRight` (all already used elsewhere; lucide `ArrowRight` is already imported in resources-client `:4`).
- **Alt — reuse the shared `FinalCTA` component** (`src/components/sections/final-cta.tsx`). Rejected as default: it is the HOME closer (`id="contact"`, the `what_you_get.ts` code-block artifact, START_HREF + mailto). Dropping it on /resources duplicates the home closer and the code-block is off-register for a reading index. Only use if the user wants the home-grade closer here.

**No new strings are required for the band.** Every string above already ships frozen on `/case-studies`. → **No open copy decision for the band itself**, unless the user prefers different existing copy (e.g. /about's "One week. Inside your stack. A written verdict.").

### (b) Hover-preview content — abstract WebGL "signal" plane (NOT a placeholder image)

Given `resources.ts` has no per-article imagery (fact #2), the on-brand, performant choice is **an abstract WebGL signal plane**, not a DOM ImageReveal with a fake image:

- A camera-locked plane painted by the persistent canvas: navy base + the cyan→violet **signal gradient** (the brand accent), a reveal **disk/iris** that grows from center as `uHover` rises, a faint per-article seed varying the gradient phase + a mono category glyph is left to the DOM card (the plane stays purely abstract — no text in WebGL). The plane **bends with `pointerStore.vel`** (inherits the flowmap motion). >1.0 scan band so the existing selective bloom (PostFXNodes) catches only the signal edge — consistent with `railPlaneNodeMaterial`'s `uScanEmissive` contract.
- This reads as "the same signal that threads the page now condenses under your cursor over the thing you're about to read" — far more on-brand than a stock/placeholder image, and it needs no asset pipeline.
- **DOM/CSS fallback (lite / flag-OFF / RM-off-but-still-rendered)**: a small `position:fixed` card following the cursor with the same cyan→violet gradient via CSS `radial-gradient`/`conic-gradient` + the article's category label and read-time (data we DO have). No image. Pointer-events: none. This is the "ImageReveal pattern, ported" — the reveal mechanic (cursor-follow + grow-on-hover), minus the image, which we don't have.

**Recommendation: ship the abstract signal plane on WebGPU full tier; ship the DOM gradient card on every other (non-RM) path; nothing on coarse/RM.**

### (c) gsap.quickTo cursor-follow (installed gsap 3.15.0)

Verified signatures (typings): `gsap.quickTo(target, "x", {duration, ease}) → (value, start?, startIsRelative?) => Tween`. Drive a plain follower object, not a DOM node, so we can publish into the store:

```ts
// resource-preview.tsx (DOM controller, route bundle)
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
// follower lives in clip space [0..1] top-left (matches pointerStore + flowmap convention)
const follow = useRef({ x: 0.5, y: 0.5 });
const xTo = useRef<gsap.QuickToFunc | null>(null);
const yTo = useRef<gsap.QuickToFunc | null>(null);

useGSAP(() => {
  if (gateOff) return;               // coarse pointer / reduced-motion → no follower
  xTo.current = gsap.quickTo(follow.current, "x", {
    duration: 0.5, ease: "power3",
    onUpdate: () => useResourcePreviewStore.getState().setTarget(follow.current.x, follow.current.y),
  });
  yTo.current = gsap.quickTo(follow.current, "y", { duration: 0.5, ease: "power3" });
}, { dependencies: [gateOff] });

// per list item:
const onMove = (e: React.PointerEvent) => {
  xTo.current?.(e.clientX / window.innerWidth);
  yTo.current?.(e.clientY / window.innerHeight);
};
const onEnter = (i: number) => useResourcePreviewStore.getState().setActive(i);
const onLeaveList = () => useResourcePreviewStore.getState().setActive(-1);
```

Notes: one `onUpdate` on the X tween is enough to publish both coords each tick (Y is updated in the same frame). `power3` ≈ the ui-layouts ImageReveal damping. `useGSAP` from `@gsap/react` 2.1.2 handles cleanup (reverts tweens on unmount / dep change). Gate `gateOff = matchMedia("(pointer: coarse)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches` — identical to `installPointerTracking`'s gate (`pointerStore.ts:113-118`).

### (d) Effect on routeCurves

- **No new waypoint, no rename.** `final-cta` already exists in `/resources` waypoints (`routeCurves.ts:135`). Giving the `final-cta` DOM node real height/content changes its **measured center fraction** (via section-bus → `sectionStore.spans`), pushing the tail waypoint to the actual band center — exactly the fix. Anchor names already in sync (`ritual` + `final-cta`).
- **Keep the `ritual` gap as-is** (`py-28 sm:py-40`): the procedural ring still world-anchors there (`Scene.tsx:105`), and the curve resolves to center (x:0) at `ritual` then runs straight down to `final-cta` (also x:0). The band sits below the ring, giving the line a real terminus — matching every other route.
- **`final-cta` joins section IDENTITY** (it's not decorative). This matches `/case-studies`, `/contact`, `/about`, where `final-cta` is a real `<section>`. No code change in `sectionStore`/`section-bus`.
- Optional polish (NOT required): no z change needed — `final-cta` stays `z:0.6` so the terminus shares the ring's plane.

### (e) reduced-motion / tier-off / coarse-pointer fallback

| Condition | tier | Behavior |
|---|---|---|
| prefers-reduced-motion | `off` | **No canvas at all.** Band renders as a static `<section>` (no glow animation beyond CSS that already respects RM). No hover preview (gate off; `useGSAP` early-returns; `installPointerTracking` no-ops). List = native focusable `<Link>`s (unchanged). |
| coarse pointer / width<768 | `lite` | No postprocessing, no preview plane (mount gate requires `full`+`webgpu`). DOM controller gate is also off on coarse, so no cursor card. Band is fully present. List works on tap. |
| desktop, flag OFF (WebGLRenderer) | `full` | Preview plane never mounts (TSL-only). **DOM gradient card** in `resource-preview.tsx` is the preview. Band present. |
| desktop, flag ON (WebGPU/WebGL2-fallback) | `full` | Full experience: camera-locked signal plane + selective bloom + flow bend; DOM card suppressed. |

The hover preview is **purely additive** — under any fallback the article list and the closing band are complete, focusable, and readable. No hover preview on touch (gate + pointer-tracking both off).

### Bilingual EN/IT

- Band copy: reuse the existing EN/IT pairs from `case-studies-client.tsx` verbatim (both languages already frozen there). Wire through `useLanguage()` `isEn` exactly as the rest of `resources-client.tsx`.
- The `<h2>` in the reused band carries `key={language}` + `data-split-reveal` (the SplitText remount contract — same as every other heading; see `resources-client.tsx:55` and the spec's text-reveal ownership rule).
- The DOM fallback preview card shows `categoryLabel[r.category]` (already bilingual in resources-client `:13-25`) + `readMinutes` — no new strings.
- The WebGL plane has no text → no i18n.

---

## 4. CONFLICT ZONES (files the other two beats also touch)

This beat (Beat 3) shares these files with Beat 1 (ProductionGrade line pulse) and Beat 2 (/audit pinned timeline + drag):

| File | Beat 3 touch | Risk / sequencing note |
|---|---|---|
| `src/webgl/Scene.tsx` | **EDIT** — add `ResourcePreviewPlane` mount line + import (additive, alongside existing `RailPlanes` gate). | All three beats likely add mounts/imports here. **Additive, append-only**; partition by inserting near the `RailPlanes` line. Low risk if each beat adds its own gated line. |
| `src/webgl/curves/routeCurves.ts` | **NO edit** (band changes the measured fraction, not the config). | Beat 2 (/audit) edits the `/audit` waypoints; Beat 3 does not touch this file → no conflict. |
| `src/webgl/store/routeFxStore.ts` | **NO edit** (`/resources` tone already set, `:113-117`). | Beats may tweak other routes; no overlap. |
| `src/webgl/store/sectionStore.ts` | **NO edit** (`final-cta` already a real section id elsewhere; not decorative). | Beat 2's pinned timeline must NOT use ScrollTrigger pin (spec: pin-spacer invalidates anchors). Beat 3 adds no store fields here. |
| `src/webgl/store/scrollStore.ts` | **NO edit.** | — |
| `src/webgl/SignatureLine.tsx` | **NO edit** (consumes `final-cta` fraction automatically). | Beat 1 (ProductionGrade line pulse) likely edits SignatureLine/lineShader/lineNodeMaterial. Beat 3 stays out. |
| `lineShader.ts` / `lineNodeMaterial.ts` | **NO edit.** | Beat 1 territory. |
| `PostFX.tsx` / `PostFXNodes.tsx` | **NO edit** (preview plane reuses existing selective bloom via `toneMapped:false` + >1.0 emissive, same as RailPlanes; does NOT need a new pass). | If Beat 1 changes bloom selection, verify the preview plane's >1.0 band still blooms. Low risk. |
| `src/app/globals.css` | **POSSIBLE EDIT** — if the DOM fallback preview card needs a class (alternatively inline `<style>` in `resource-preview.tsx`, the pattern `final-cta.tsx` uses). **Prefer scoped `<style>` to avoid globals.css contention** with other beats. |

**Beat-3-owned (no contention)**: `resources-client.tsx`, `resource-preview.tsx` (new), `resourcePreviewStore.ts` (new), `ResourcePreviewPlane.tsx` (new), `resource-preview-node-material.ts` (new).

**Recommended sequencing**: Beat 3 can land independently of Beats 1/2 except for the shared `Scene.tsx` mount line — coordinate that one append. Nothing else overlaps.

---

## 5. OPEN DECISIONS for the user

1. **Band copy source (low-stakes, copy-freeze-safe)**: default = reuse `/case-studies` closing CTA verbatim ("Want this kind of work in your business?" → Book a scoping call). Confirm this is the right existing copy for /resources, or pick another frozen closer (e.g. /about's "A written verdict", or the shared home `FinalCTA`). **No NEW strings proposed.** If the user wants a /resources-specific line (e.g. "Want the thinking behind the shipping?"), that would be NEW copy → must be user-approved; flagged, not assumed.
2. **Band CTA destination**: `/case-studies` points its closing CTA at `/audit`; `/about` points at `START_HREF` (`/start`). Confirm /resources → `/audit` (mirrors the proof-page sibling) vs `/start`.
3. **Preview visual confirm**: abstract cyan→violet signal plane (recommended) vs a generated placeholder image (rejected — no asset, off-brand). Confirm abstract.

---

## 6. QA plan (real Chrome vs headless)

**Headless Chromium has NO WebGPU here** (spec quality-guidelines) → headless always takes the WebGL2-fallback / DOM-card path. So:

- **Headless (Playwright/automated)**: verify (1) the closing band renders as a real section with the frozen EN + IT copy (toggle language), focusable CTA link; (2) `data-line-anchor="final-cta"` now has non-zero height → check the measured span via `window.__sersanSectionStore.getState().spans["final-cta"]` (start≠end); (3) console clean; (4) reduced-motion emulation → no canvas, band static, no preview; (5) the DOM fallback preview card appears on hover over a list item in non-RM headless (WebGL2 path) and follows the cursor; on coarse-pointer emulation it does NOT appear.
- **Real Chrome (WebGPU)**: verify (1) the signal plane reveals near the cursor on article hover, grows with `uHover`, bends with cursor velocity (flow inherit), and the >1.0 band catches selective bloom; (2) DOM fallback card is suppressed on the WebGPU path; (3) the signature line now terminates at a real band (no "dying in the void") — visually confirm the beam resolves through the ring then runs into the band; (4) 60fps, no jank on hover; (5) camera-locked registration: the plane tracks the cursor without drift under the line's lookAt tilt (use a `window.__sersanResourcePreview` dev handle mirroring `__sersanRailPlanes.project()` for headless-assertable projection).
- **Both**: TS strict + `next build` are the only gates (no test runner). EN/IT screenshots desktop+mobile per AGENTS.md §6.

---

## Caveats / Not found

- The actual `ui-layouts/image-reveal.tsx` source was not fetched (offline); the plan ports the *mechanic* (cursor-follow + grow-on-hover reveal) per PIANO §5.4, adapted to no-image + R3F plane. If the user wants byte-faithful port details, fetch the MIT source (`github.com/ui-layouts/uilayouts/.../image-reveal/image-reveal.tsx`).
- `resources.ts` is a 3-item stub with a `// TODO: replace with CMS` header — the preview must degrade gracefully if the list grows or shrinks (index-keyed, not count-pinned).
- Confirm the preview plane's `seed` per article is stable across re-renders (derive from `index`, like RailPlanes `(i*0.618034)%1`).

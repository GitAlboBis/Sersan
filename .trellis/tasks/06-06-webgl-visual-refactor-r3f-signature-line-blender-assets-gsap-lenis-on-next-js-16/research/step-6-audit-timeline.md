# Research: Step 6 BEAT 2 — /audit "How the week runs" pinned phased timeline + drag

- **Query**: Turn the flat /audit `week` list into pinned phased chapters (NRG pattern): pin+scrub, snap per Day, the signature-line `uProgress` "walks" Day 1→6 along the `timeline` waypoint; bidirectional Draggable↔Lenis sync (Michelle Barker pattern) using `lenis.scrollTo(y,{immediate:true})`.
- **Scope**: internal (code-level implementation plan) + external (verify installed GSAP Draggable 3.15.0 + lenis/snap 1.3.23 APIs)
- **Date**: 2026-06-13
- **Status**: PLAN ONLY. Do not implement. Copy is FROZEN — the 6 Day blocks must stay byte-identical EN/IT.

---

## 0. Verified facts (read from code / node_modules — not assumed)

- **gsap 3.15.0** ships `node_modules/gsap/Draggable.js` and `node_modules/gsap/InertiaPlugin.js`. `Draggable` type defs confirm: `Draggable.create(target, vars)`, `vars.type` includes `"x"`, `vars.onDrag`/`onDragStart`/`onDragEnd`/`onThrowUpdate` callbacks, `vars.bounds`, `vars.inertia` (needs InertiaPlugin), `vars.dragResistance`, `this.x`/`this.deltaX`. `Draggable` is NOT registered anywhere in `src/` today (grep: zero hits) → must `gsap.registerPlugin(Draggable)` (and `InertiaPlugin` if used).
- **lenis 1.3.23** exposes `lenis/snap` via the package `exports` map (`"./snap"` → `dist/lenis-snap.mjs`, types `dist/lenis-snap.d.ts`). Already imported as `import Snap from "lenis/snap"` in `src/components/sections/cinematic-system-scroll.tsx`. `Snap` ctor: `new Snap(lenis, { type:'proximity'|'mandatory'|'lock', duration, distanceThreshold:'16%'|number, debounce, onSnapStart, onSnapComplete })`; instance methods `add(px) => () => void`, `stop()`, `start()`, `destroy()`. Snap targets are ABSOLUTE document px.
- **lenis `scrollTo`** signature (`dist/lenis.d.ts`): `scrollTo(target: number|string|HTMLElement, { offset, immediate, lock, duration, easing, lerp, onStart, onComplete, force, programmatic, userData })`. `immediate:true` jumps with no animation (exactly what Barker's drag-sync needs — replaces `st.scroll(y)`).
- **Lenis is the single RAF authority**: pumped by the R3F FrameDriver (`setExternalPump`), `getLenis()` returns the live instance. Reduced-motion path NEVER creates Lenis (`smooth-scroll-provider.tsx` early-returns to native scroll) → no Lenis, no snap, no Draggable-vs-Lenis path by construction.
- **Pinning convention (component-guidelines.md, enforced)**: pinned sections use CSS `position:sticky` inside a tall section (`height = 100vh + travel`), NEVER `ScrollTrigger.pin` (a pin-spacer mutates the DOM and invalidates `[data-line-anchor]` measurements). Reference impl = `case-studies-rail.tsx`. The provider does NOT `ScrollTrigger.refresh()` on routes that own a pinned section → the section self-refreshes on `document.fonts.ready`.
- **`routeCurves['/audit']`** already has a `{ anchor: "timeline", x: 1.2, z: -0.3 }` waypoint (index 4 of 7). It is a REAL section anchor (the `data-line-anchor="timeline"` section that renders `week.map(...)`), NOT decorative — it is measured into `spans` AND counts as a section identity.
- **The /audit ritual GLB (`audit-lattice.glb`) world-anchors at the `ritual` gap** (`Scene.tsx` `ROUTE_HERO['/audit']` → `RouteHero anchorId="ritual"`), which is a SEPARATE anchor from `timeline`. So a localized signature-line "walk" at the `timeline` waypoint does NOT collide with the ritual object.
- **WebGPU vs WebGL2**: `RailPlanes` (the only existing DOM-synced WebGL planes) is TSL-only, gated `pathname==="/" && tier==="full" && webgpu`. The signature line itself runs on BOTH paths (`SignatureLine.tsx`: GLSL `lineShader` on flag-OFF, TSL `lineNodeMaterial` on flag-ON, identical uniform shape). The /audit timeline "walk" must therefore drive only the SHARED signature-line uniforms (works on both paths) — it must NOT require a new WebGPU-only plane.

---

## 1. RECOMMENDATIONS (the asked-for decisions)

### (a) Layout direction — RECOMMEND: VERTICAL PINNED CHAPTERS (not a horizontal filmstrip)

Pick **vertical pinned chapters** (CSS-sticky frame, one Day-card "chapter" lit at a time, scrubbed by vertical scroll), NOT a horizontal translateX filmstrip.

Rationale:
- **Brand/altitude**: /audit is a serious, governed, text-dense page. NRG "Build Your Data Center" (the cited reference, fitScore 5/5) is itself a VERTICAL phased-chapter pin, not a filmstrip. The horizontal rail is already the home `case-studies-rail` signature; reusing it on /audit would dilute that one bold horizontal moment and turn a 6-step *narrative* into a *gallery* (wrong reading metaphor — a week is a sequence, not an archive).
- **6 steps**: a week reads top-to-bottom (Day 1 → Day 6). Vertical pinning keeps the natural reading axis; horizontal would force a 90° mental rotation for chronological content.
- **No-anchor-drift rule is EASIER vertical**: the horizontal rail needs rem-fixed card widths so a font swap can't change `scrollWidth → document height → downstream anchors`. A vertical pinned chapter that is exactly `height = 100vh + travel` (travel a fixed `vh`/rem multiple, NOT content-derived) has the SAME single document-height contribution regardless of which card is lit — so the `[data-line-anchor]` fractions below it never move. We set `section.style.height` from a CONSTANT (e.g. `100vh + N*100vh` where N is a fixed travel-per-day in vh), never from measured card content.
- **Reuse**: it mirrors `cinematic-system-scroll.tsx`'s `StagePanel` opacity-crossfade model (rAF-driven `panelOpacity`, inert/aria toggling, fixed progress ranges) — a proven, in-repo, accessibility-correct pattern — combined with `case-studies-rail.tsx`'s ScrollTrigger shape (sticky frame + `quickSetter` onUpdate + self-refresh on fonts.ready). We are NOT inventing; we are composing two shipped patterns.

Layout sketch: a tall outer `<section data-line-anchor="timeline">` of fixed height `100vh + TIMELINE_TRAVEL_VH*vh`; inside, a `sticky top-0 h-screen` frame holding all 6 Day cards stacked absolutely, each fading in across its own progress sub-range (6 contiguous ranges over 0..1, same `panelOpacity` math as the spine but WITHOUT a hero/final special-case — every Day fades in and out strictly inside its range). A small left "Day rail" (mirrors `StageRail`) shows 1..6 with the active tick lit.

### (b) Snap point placement — RECOMMEND: lenis/snap proximity, INTERIOR boundaries only, one fade INSIDE each Day

- Use **`lenis/snap`** (the exact pattern already in `cinematic-system-scroll.tsx`), type `"proximity"`, NEVER ScrollTrigger snap (spec hard rule).
- Snap targets = the 5 INTERIOR Day boundaries (between Day1→2, …, Day5→6), placed one fade-inset PAST each boundary so the settle lands on the incoming Day at full opacity (identical inset trick to `INTERIOR_SNAP_PROGRESS`: `start + min(0.03, range*0.3)`). NEVER snap to progress 0 (entry into the pin from the section above) and NEVER to progress 1 (exit into "What happens after") — the page has no other gate, so the top/bottom of the pin must remain free-scroll so the reader can leave the pin in either direction without a fight.
- Targets are absolute document px: `base = section.getBoundingClientRect().top + window.scrollY`, `travel = section.offsetHeight - innerHeight`, target `= Math.round(base + p*travel)` for each interior `p`. Re-register on the same refresh cadence as the ScrollTrigger measure (mount + fonts.ready + debounced resize), exactly as the spine does.
- **Coexistence with "no other gate"**: /audit has NO intro/exit gate (those are home-only). So there is no `gateEngaged` to subscribe to here. BUT: while a **Draggable drag is in progress** we must `snap.stop()` (and `snap.start()` on drag end) so a pending debounce can't fire `scrollTo` mid-drag and fight the user's hand — this is the /audit analogue of the spine's `gateEngaged` stop/start. `distanceThreshold:'16%'`, `debounce: 400`, `duration: 0.9` (copy the spine's tuned values; they're already QA'd against the Lenis lerp).
- Reduced-motion / no-Lenis: no snap created (Lenis doesn't exist). Coarse-pointer/tier-off native fallback: no snap (we render real cards in normal flow with optional CSS `scroll-margin`, no pin).

### (c) How the signature line correlates to Day steps — RECOMMEND: a section-local progress store (railStore-shaped), read in `SignatureLine` useFrame to add a localized "walk"/pulse at the `timeline` waypoint

Design a NEW tiny store `auditTimelineStore` (shaped exactly like `railStore`: transient, written from the pinned section's ScrollTrigger `onUpdate`, read via `getState()` in `useFrame`, `reset()` in cleanup, globalThis-pinned because it is imported by BOTH the route bundle (the /audit client component) and the lazy WebGL island (SignatureLine)). Fields: `{ active: boolean, progress: number /*0..1 across the 6 days*/, dayIndex: number, reset() }`.

In `SignatureLine.useFrame`, read `useAuditTimelineStore.getState()`. When `pathname === "/audit"` and `active`, derive the curve param of the `timeline` waypoint (it is waypoint index 4 of 7 → its document-fraction is `anchors.fractions["timeline"]`; the lit-head fraction near it is already computed as `headFraction`). Add a **localized emissive PULSE** that peaks each time the section-local `progress` crosses a Day boundary (6 evenly-spaced pulses), summed into the SAME `boost` channel that the section-arrival pulse already uses (`u.uEmissive.value = (fx.emissive + boost) * route.lineEmissiveScale`, with `boost` already clamped to ≤ 0.6). This makes the head visibly "tick" Day1→Day6 as the reader scrubs — and it works on BOTH the GLSL and TSL paths because it only writes the shared `uEmissive` uniform. No new geometry, no new material, no WebGPU-only dependency.

RECOMMENDED minimal version (lowest risk, both-paths-safe): drive ONLY `uEmissive` boost from the per-Day boundary crossings (a damped 0→1→0 pulse per Day). OPTIONAL richer version (full-tier only, needs user OK): also nudge `dampedProgress`/head position is NOT advisable — the head already tracks the viewport center, and the section IS pinned so the viewport center sits ON the timeline waypoint for the whole pin; the head naturally parks there. So the "walk" is expressed as the 6 emissive ticks, not as moving the head (moving the head would desync from the single camera authority's `camera.position.y` mapping). This is the compliant, no-second-camera-writer approach.

Writer: the /audit pinned-timeline component's ScrollTrigger `onUpdate` writes `auditTimelineStore.setProgress(self.progress)` and `setActive(true)` on create / `reset()` on cleanup. Reader: `SignatureLine` (already the single camera authority). No re-renders (getState in useFrame).

### (d) Draggable↔Lenis sync — for the installed versions (gsap 3.15.0, lenis 1.3.23)

Michelle Barker's pattern wraps a proxy element in `Draggable` and, on each `onDrag`, maps the drag delta to a scroll position. Adapted to THIS repo (Lenis owns scroll, not native):

```ts
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin"; // only if using inertia throw
import { getLenis } from "@/lib/lenis-singleton";

gsap.registerPlugin(Draggable, InertiaPlugin); // guard typeof window !== "undefined"

// proxyRef: an invisible 1px element Draggable moves on the x-axis; we never
// show it — it is the scrub handle. Map its x to a vertical scroll position
// inside the pinned section's travel range.
const setProxy = gsap.quickSetter(proxyRef, "x", "px");
const drag = Draggable.create(proxyRef, {
  type: "x",
  trigger: dragSurfaceRef.current,      // the Day-cards surface captures the drag
  inertia: true,                         // optional momentum throw (InertiaPlugin)
  dragResistance: 0.35,
  bounds: { minX: -DRAG_SPAN, maxX: 0 }, // DRAG_SPAN maps full travel
  onPressInit() { snap?.stop(); getLenis()?.stop(); }, // freeze Lenis + snap during drag
  onDrag() {
    const frac = gsap.utils.clamp(0, 1, -this.x / DRAG_SPAN);
    const y = secTop + frac * travel;                 // secTop/travel from measure()
    getLenis()?.scrollTo(y, { immediate: true });     // Barker's st.scroll(y) → Lenis
  },
  onThrowUpdate() { /* same mapping as onDrag for inertia frames */ },
  onDragEnd()    { getLenis()?.start(); snap?.start(); },
  onThrowComplete(){ getLenis()?.start(); snap?.start(); },
})[0];
```

Key adaptations vs Barker's original:
- Barker uses `ScrollTrigger`'s `st.scroll(y)`; we MUST use `getLenis().scrollTo(y, { immediate: true })` because Lenis owns the scroll position and `st.scroll` would fight the scrollerProxy (the provider already proxies `scrollTop` → `lenis.scrollTo(value,{immediate:true})`, so using Lenis directly is the same channel and avoids a double-write).
- `getLenis()?.stop()` on press + `start()` on release/throw-complete, plus `snap.stop()/start()`, so wheel/Lenis lerp/snap don't fight the drag. (Lenis `stop()` halts its rAF integration; `scrollTo(...,{immediate})` still moves it because `setScroll` writes `targetScroll`/`animatedScroll` directly. Verify in real Chrome — see QA.)
- Drag direction is HORIZONTAL hand-feel mapped to VERTICAL scroll (a left-drag advances the week), which reads naturally for "flip through the days"; alternatively `type:"y"` with a vertical proxy. RECOMMEND `type:"x"` (horizontal hand-feel over the cards) since vertical drag would be ambiguous with normal page scroll.
- Bounds + the `-this.x/DRAG_SPAN` clamp keep the drag inside the pin's travel; releasing hands control back to Lenis+snap which settles to the nearest Day.
- Draggable + InertiaPlugin must be `gsap.registerPlugin`'d in the new component module (they are not registered globally).

### (e) Full reduced-motion / coarse-pointer / tier-off fallback

Mirror `case-studies-rail.tsx` exactly: SSR default = `"pinned"` so all 6 Day cards are in the initial HTML; on mount detect `(max-width:768px) || (pointer:coarse) || prefers-reduced-motion` → switch to `"native"`. Native mode renders the EXISTING flat `week.map(...)` Reveal cards in normal document flow (literally today's markup, byte-identical copy), no pin, no Draggable, no snap, no WebGL coupling. This is the focusable, screen-reader-correct path. The Day cards are static content in DOM order either way (the pinned mode just crossfades them in place), so keyboard tab order and screen-reader reading are correct in both modes — no off-screen card focus-recovery is needed (unlike the horizontal rail, which is another reason vertical is simpler here).

Reduced-motion specifics: no Lenis (provider native path) → no snap, no `scrollTo` smoothing; the component must check `prefers-reduced-motion` and force `"native"` even on desktop fine-pointer. The signature-line "walk" pulse is gated to `tier==="full"` inside `SignatureLine` already (the Canvas is unmounted on reduced-motion = tier "off"), so the pulse simply never runs there — the DOM cards carry the whole experience.

### Bilingual EN/IT

The `week` array is already EN/IT inside `audit-client.tsx` (lines 87–101) and is FROZEN. The new pinned component must consume the SAME `week` array (pass it in or keep it in `audit-client.tsx` and render the timeline inline). Day labels ("Day 1"/"Giorno 1"), titles, descs stay byte-identical. The new left Day-rail shows the index number only (1..6, language-neutral) plus the existing `w.day` string. `key={language}` is NOT needed on the cards (they are not SplitText subtrees), but if any heading inside uses `data-split-reveal` it must carry `key={language}` per the text-engine ownership rule.

---

## 2. Exact files to EDIT and CREATE

### CREATE

1. `src/components/sections/audit-week-timeline.tsx` — the pinned phased-chapters component (kebab-case). Client component. Props: `{ week: { day; title; desc }[], isEn: boolean }` (or read language internally). Contains: SSR-pinned/native mode detection (copy `case-studies-rail`), the sticky frame + 6 absolutely-stacked Day panels with rAF `panelOpacity` crossfade (copy `cinematic-system-scroll` StagePanel inert/aria/pointer-events discipline), the ScrollTrigger (`start top top`/`end bottom bottom`, `invalidateOnRefresh`, `onRefreshInit: measure`, `onUpdate` quickSetter + `auditTimelineStore.setProgress`), lenis/snap interior-boundary registration (copy spine snap block), Draggable↔Lenis sync block (section 1d), and the native fallback (renders today's flat `week.map(...)` Reveal cards). Self-refresh on `document.fonts.ready`.
2. `src/webgl/store/auditTimelineStore.ts` — new transient store, railStore-shaped, globalThis-pinned (`globalThis.__sersanAuditTimelineStore ??= create(...)`). Fields `{ active, progress, dayIndex }` + `setActive/setProgress/reset`. Header comment documenting writer (audit-week-timeline) / reader (SignatureLine), getState-in-useFrame discipline, globalThis-pin reason (imported by both bundles).

### EDIT

3. `src/app/audit/audit-client.tsx` — replace the `data-line-anchor="timeline"` block (lines 329–376: the `<SectionHeading>` + `week.map(...)` Reveal cards) with `<AuditWeekTimeline week={week} isEn={isEn} />`. Keep the `data-line-anchor="timeline"` wrapper on the new component's outer section (the curve waypoint MUST stay). Keep the `week` array definition (frozen copy). Keep the surrounding "What we look at" / "The deliverable" / "What happens after" sections untouched.
4. `src/webgl/SignatureLine.tsx` — add `import { useAuditTimelineStore } from "./store/auditTimelineStore"` and, inside `useFrame`, a gated block: `if (pathname === "/audit") { const at = useAuditTimelineStore.getState(); if (at.active) { /* derive 6-Day boundary pulse, add into `boost` before the clamp */ } }`. Writes ONLY `boost` (→ `uEmissive`). No camera writes, no geometry change. Must be inserted where `boost` is computed (around lines 449–452), summed then re-clamped to the existing 0.6 ceiling. Works identically on GLSL + TSL (shared `uEmissive`).
5. `src/webgl/Scene.tsx` — (dev-only, OPTIONAL) add a `__sersanAuditTimeline` console handle next to the other store handles (lines 46–62) for headless QA. No mount change (no new WebGL component).

NO edits to: `routeCurves.ts` (the `timeline` waypoint already exists — DO NOT add waypoints; the walk is an emissive pulse, not new geometry), `routeFxStore.ts`, `PostFX*.tsx`, `lineShader.ts`/`lineNodeMaterial.ts` (no new uniform — reuse `uEmissive`), `scrollStore.ts`, `sectionStore.ts`, `RailPlanes.tsx`, `railStore.ts`.

---

## 3. Signal / store design (concise)

- **New store** `auditTimelineStore` (globalThis-pinned, railStore-shaped, transient).
- **Writer**: `audit-week-timeline.tsx` ScrollTrigger `onUpdate` → `setProgress(self.progress)`; `setActive(true)` on create, `reset()` on cleanup.
- **Reader**: `SignatureLine.useFrame` via `getState()` (no re-renders), gated `pathname === "/audit" && active && tier === "full"`.
- **Effect**: 6 per-Day emissive pulses summed into the existing `boost` → `uEmissive` (shared by GLSL + TSL). No new uniform, no new geometry, no camera writer, no WebGPU-only path. Reduced-motion = Canvas off = pulse never runs; DOM cards carry it.

---

## 4. CONFLICT ZONES (files the other two beats also touch)

The beat brief lists the shared/binding files. This beat's touch surface:

| File | This beat | Conflict risk |
|---|---|---|
| `src/webgl/SignatureLine.tsx` | EDIT — add a small `pathname==="/audit"` emissive-pulse block inside `useFrame` near the `boost` computation | **HIGH** — likely touched by the ProductionGrade line-pulse beat and any other line-driver beat. Partition: each beat appends its own gated `if (pathname === ...)` block writing ONLY into the shared `boost` accumulator before the single `Math.min(...,0.6)` clamp. Sequence so one beat lands the `boost` refactor and others add gated branches. |
| `src/webgl/Scene.tsx` | EDIT — dev-only console handle (optional) | LOW — additive, same pattern as existing handles. |
| `src/app/audit/audit-client.tsx` | EDIT — swap the `timeline` block | LOW — this file is /audit-specific; unlikely shared by the other two beats unless they also touch /audit. |
| `routeCurves.ts` | NO edit (waypoint exists) | none |
| `routeFxStore.ts` | NO edit | none |
| `PostFX.tsx` / `PostFXNodes.tsx` | NO edit | none (the pulse is emissive on the line; selective bloom picks it up for free) |
| `lineShader.ts` / `lineNodeMaterial.ts` | NO edit (reuse `uEmissive`) | none — avoids the dual-namespace uniform-shape pitfall |
| `scrollStore.ts` / `sectionStore.ts` | NO edit | none |
| `globals.css` | NO edit expected (use existing `--margin`, `--header-h`, `card-steel`; fixed travel in vh, no new tokens) | LOW |

The ONLY genuinely shared hot file is **`SignatureLine.tsx`** (the `boost`/`uEmissive` accumulator). Main agent should sequence the line-driving beats so they share one `boost` accumulator and each contributes a gated branch.

---

## 5. OPEN DECISIONS for the user

1. **Copy freeze (hard)**: the 6 Day blocks stay byte-identical EN/IT. The new pinned component introduces NO new prose. The only new on-screen text would be the left Day-rail's numeric index (1–6) — language-neutral, reusing the existing `w.day` string. CONFIRM no new copy is acceptable (recommend: yes, reuse `week` + numeric rail only). If a section eyebrow/title is wanted above the pinned frame, REUSE the existing "The week, day by day" / "Six days. Real work each." `SectionHeading` (lines 333–355) verbatim — do not write new.
2. **Inertia throw on drag**: include `InertiaPlugin` momentum (`inertia:true`) or a plain clamp-to-bounds drag? Recommend a light `dragResistance` WITH `inertia:true` for a premium hand-feel, but it adds InertiaPlugin to the bundle. Confirm acceptable, else drop inertia (simpler, smaller).
3. **Drag axis**: horizontal hand-feel (`type:"x"`) mapped to vertical scrub (recommended) vs vertical (`type:"y"`). Confirm horizontal.
4. **"Walk" expression**: emissive 6-tick pulse on the line head (recommended, both-paths-safe, no camera change) vs any attempt to move the head/camera (NOT recommended — fights the single camera authority). Confirm the pulse-only approach.

---

## 6. QA plan (real Chrome vs headless)

Headless Chromium here has NO WebGPU → always WebGL2 fallback. So:
- **Headless (CI / Playwright)**: verify the DOM pinned chapters mode — pin engages (`section.style.height` = `100vh + travel`), 6 cards crossfade, native fallback renders all 6 cards as focusable content under reduced-motion/coarse emulation, copy byte-identical EN/IT (snapshot both languages). Verify console clean, `next build` + TS strict pass. Drive scroll with real `mouse.wheel` (pinned elements have geometry while invisible — the spec gotcha). Verify Draggable drag via synthesized pointer events updates Lenis scroll position. Verify snap settles to a Day boundary on wheel-flick release.
- **Real Chrome (manual / claude-in-chrome)**: verify the signature-line emissive "walk" ticks Day1→Day6 on the WebGPU node path (TSL `lineNodeMaterial` + selective bloom) — this is the path headless cannot exercise. Confirm the pulse reads as ×1→×1.2→×1 per Day and the selective bloom catches it. Confirm `lenis.scrollTo(y,{immediate:true})` during a Draggable drag does not stutter against the Lenis lerp, and that `snap.stop()` during drag prevents a mid-drag settle. Confirm 60fps during scrub on desktop. Verify reduced-motion (DevTools emulate) drops to native cards with no pin and no Canvas coupling.
- **Both**: confirm the `[data-line-anchor="timeline"]` measurement is unchanged after the swap (the section's document-height contribution must stay constant regardless of which Day is lit — assert via `__sersanSection` handle that `spans.timeline` and downstream anchors don't drift between Day 1 and Day 6 lit states).

---

## 7. Caveats / Not found

- The Michelle Barker codepen source was not fetched (web fetch not run); the pattern is reconstructed from its well-known shape (proxy element + Draggable `type:"x"` + onDrag → scroll mapping) and adapted to Lenis per the beat brief's explicit instruction (`lenis.scrollTo(y,{immediate:true})` instead of `st.scroll(y)`). The implementing agent should sanity-check the exact `onThrowUpdate` vs `onDrag` mapping against the live codepen if inertia is enabled.
- Lenis `stop()` semantics during a programmatic `scrollTo(...,{immediate:true})`: the `force` option exists ("scroll even if stopped") — if `scrollTo` while stopped does not move in real Chrome, add `force:true` to the drag's `scrollTo`. MUST be verified in a real browser (flagged in QA).
- `TIMELINE_TRAVEL_VH` exact value (per-Day scrub height) is a tuning decision; recommend ~70–80vh per interior Day boundary band akin to the spine's 75–81vh grouped panels, total ≈ `6 * ~65vh` → keep the section a single fixed `height` so it contributes a constant document height (no anchor drift). Tune in real Chrome.

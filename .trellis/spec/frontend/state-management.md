# State Management

> State library, patterns, and what lives where.

---

## Overview

For DOM/UI state: **no global state library** — plain React (local `useState`,
**React Context** for language/i18n, **refs** for high-frequency animation
values). Exception: the **WebGL layer** (`src/webgl/store/*`) uses **zustand**
stores (scroll, routeFx, tier, pointer, intro, …) read via
`useFrame + getState()` to stay re-render-free. Don't add zustand for DOM/UI
state; don't add Context for WebGL per-frame state.

---

## Where state lives

| Kind of state | Mechanism | Example |
|---------------|-----------|---------|
| Component-local UI/form state | `useState` | `ContactFormState` in [contact-form.tsx](src/components/contact-form.tsx) |
| App-global (language) | React Context provider + `use*` hook | [language-provider.tsx](src/components/language-provider.tsx) |
| Per-frame animation / scroll | `useRef` (not state) | [use-scroll-camera.ts](src/components/scene/use-scroll-camera.ts) |
| Cross-component scroll engine | Refcounted singleton module | [lenis-singleton.ts](src/lib/lenis-singleton.ts) |

---

## Context pattern (i18n)

The only Context provider. It:
- starts from an **SSR-safe default** (`"en"`) and syncs the real value from
  localStorage/cookie inside an effect, to avoid hydration mismatch;
- exposes `{ language, setLanguage, t }`;
- is consumed through the guarded `useLanguage()` hook.

Providers are nested at the root in [app/layout.tsx](src/app/layout.tsx):

```tsx
<LanguageProvider>
  <SmoothScrollProvider>
    <Navbar />
    <main>{children}</main>
    <Footer />
  </SmoothScrollProvider>
</LanguageProvider>
```

Translation dictionaries live in [data/translations/en.ts](src/data/translations/en.ts)
and `it.ts`; the `Language` / `TranslationDictionary` types in
[data/translations/types.ts](src/data/translations/types.ts).

---

## Theming

There is **no `next-themes`** runtime (the package is present but unused). The
site is a single dark theme expressed entirely as **CSS variables** in
[app/globals.css](src/app/globals.css):

- Surfaces: `--bg`, `--surface`, `--surface-elev`
- Ink: `--ink`, `--ink-mute`, `--ink-dim`
- Rules: `--rule`, `--rule-warm`
- Accent: `--accent` (`#29A3F5` electric blue), `--accent-dark`, `--accent-warm`, `--refusal`
- shadcn-compat aliases: `--background`, `--foreground`, `--primary`, `--border`, `--ring`, …

Consume via Tailwind: `bg-[hsl(var(--accent))]`, `text-ink-mute`, etc. To change
the palette, edit the tokens — don't introduce per-component color state.

---

## Common Mistakes

- Reaching for a state library; React Context + local state is the convention.
- Adding a second Context for something that's really component-local.
- Forgetting the SSR-safe default → hydration mismatch.
- Storing animation/scroll values in `useState` instead of refs.

---

## Convention: per-route WebGL tone (routeFx + routeCurves)

Per-route look lives in two **pure-data** modules, keyed by pathname:

- [routeCurves.ts](src/webgl/curves/routeCurves.ts) — signature-line waypoints per route.
- [routeFxStore.ts](src/webgl/store/routeFxStore.ts) — `routeFx(pathname)` merges small
  `Partial<RouteFx>` deltas over `HOME_FX`.

Rules (violating any of these broke pages in the past or would):

1. **P0 invariant**: `routeFx('/')` and unknown paths return `HOME_FX` **verbatim**.
   Never make a matcher that can catch `/`.
2. **Deltas stay small** (±0.1–0.2 scale): routes differ in temperature/density,
   never in identity (navy + cyan→violet only).
3. **Detail/leaf routes** (`/case-studies/[slug]`, `/resources/[slug]`, `/services/*`,
   `/start`) resolve to the shared quiet `detail` curve + `DETAIL_FX` via
   `isDetailRoute()`. Matchers use **trailing-slash prefixes** (`startsWith('/case-studies/')`)
   so index pages keep their bespoke entries.
4. **Anchor-less pages are fine**: `SignatureLine` falls back to `wp.at ?? 0` per
   waypoint, so a pure-`at` curve renders without any `[data-line-anchor]` in the page.
   Add anchors only when waypoints must track real section positions.
5. Keep `data-line-anchor` names in client pages and waypoint keys in `routeCurves.ts`
   **in sync and truthful** (name = the section it wraps) — rename both sides together.

---

## Convention: DOM-synced WebGL planes are camera-locked

When a WebGL plane must track a DOM element (e.g. [RailPlanes.tsx](src/webgl/RailPlanes.tsx)
behind the rail cards):

- **Do NOT world-anchor** planes on the camera strip (`y = -(docY + h/2) * k`): the
  `SignatureLine` camera authority applies lookAt-ahead tilt (up to ~0.4 rad mid-page)
  plus descent/gate beats, which shift a z=0 world plane by hundreds of px on screen.
- **Camera-lock instead**: position the plane in camera space
  (`camera.position + camera.quaternion`-rotated offset at `-CAMERA_Z`), which projects
  to an exact affine screen rect under any camera pose — tilt/damping/shake cancel by
  construction. Verified tracking delta: 0.0px.
- Measure DOM rects only on resize/`ScrollTrigger.refresh` (a `measureVersion` bump in
  the store), never `getBoundingClientRect` per frame; interpolate the moving axis from
  store progress in `useFrame` via `getState()`.
- **Only `SignatureLine` writes the camera.** Plane components read the pose; they mount
  after `SignatureLine` in `Scene.tsx` so the authority writes first within the same
  frame pass.
- Canvas sits BEHIND the DOM (`z-0` vs `z-[1]`): any DOM element that should reveal a
  plane needs a (semi)transparent background.
- TSL node materials must keep procedural backdrops below the bloom threshold (<1.0);
  only deliberate HDR accents (scan sweep) go above. Gate planes on
  `tier === "full" && webgpuEnabled()`; the DOM must be complete without them.

---

## Convention: every user-facing string is bilingual (EN/IT)

The site ships English + Italian. **No user-facing string may be hardcoded in one
language.** Two mechanisms, by source:

- **Component copy** → `const { language } = useLanguage(); const isEn = language === "en";`
  then `{isEn ? "English" : "Italiano"}`. Covers headings, labels, buttons, placeholders,
  aria text, error/success messages. The component must be `"use client"`.
- **Data copy** (`src/data/*.ts`) → add an `*It` counterpart for every rendered field
  (`title`+`titleIt`, `summary`+`summaryIt`, metric `label`+`labelIt`, etc.), following
  `case-studies.ts` / `services.ts`. Detail pages select the IT field when `!isEn`; the
  server `page.tsx` keeps `generateStaticParams`/`generateMetadata` and delegates rendering
  to a `"use client"` wrapper that reads `useLanguage()`.

**SSR/default is English** — `LanguageProvider` starts at `"en"` server-side and syncs the
real preference (cookie/localStorage) client-side, so `lang` never causes a hydration
mismatch. Do NOT read the language cookie in the root layout (it forces the whole site to
dynamic rendering — keep pages static).

**Common mistake:** adding `useLanguage()` for a component's CTA but leaving its body copy
hardcoded English — translate the WHOLE component, not just the button.

---

## Convention: section-state bus (sectionStore + SectionBus)

"Which section is the reader in" has ONE source of truth: `src/webgl/store/sectionStore.ts`
(zustand), written ONLY by the layout-level [section-bus.tsx](src/components/section-bus.tsx)
(measures `[data-line-anchor]` spans, one IntersectionObserver for the active section +
arrival pulse, scroll direction from the shared scrollStore). Rules:

1. **globalThis-pin every store imported by both the route bundle and the lazy WebGL
   island** (`globalThis.__sersan… ??= createStore()`, like textMorphStore /
   sectionStore). Turbopack inlined separate copies of small store modules into each
   chunk in prod — two live zustand instances, writers and readers split (2026-06-10).
2. The bus writer lives OUTSIDE the Canvas so it works on tier `"off"` and under reduced
   motion. Don't put section-identity writers inside Scene-mounted hooks again
   (`scrollStore.activeAnchor` rotted as a write-only field exactly that way; it was
   removed in favor of the bus).
3. `useSectionAnchors` is now a thin adapter deriving curve fractions
   (`(span.start+span.end)/2`) from the bus — geometry consumers keep their props API.
4. Decorative zero-height anchors (`work-in-progress`, `gateway`, `ritual`) are measured
   for curve geometry but EXCLUDED from section identity (`DECORATIVE_ANCHORS`).
5. Per-section progress is a pure helper (`sectionProgress()`), never a per-frame store
   field. Hot paths read `getState()`; reactive consumers subscribe only to
   rare-change fields (`active`/`index`/`measureVersion`).
6. **One scroll source:** components needing scroll-cadence state subscribe to
   `scrollStore` (fed by Lenis or the reduced-motion native fallback) — no private
   `window` scroll listeners (navbar's was removed).

## Convention: scroll snap = `lenis/snap`, never ScrollTrigger snap

Lenis 1.3.23 ships the snap plugin (`import Snap from "lenis/snap"`). For pinned-section
snapping (home spine): `new Snap(lenis, { type: "proximity", debounce, distanceThreshold })`,
points registered as absolute px via `snap.add()` and re-derived on every
`ScrollTrigger.refresh()`/resize. Snap only INTERIOR boundaries — never 0 (HeroIntroGate
owns the top) or 1 (SpineExitGate owns the pin end) — and place each point one
panel-fade inside the boundary so the settle lands on a lit panel, not a blank crossfade
frame. `snap.stop()` while `textMorphStore.gateEngaged`; `snap.destroy()` on unmount;
never construct it on the reduced-motion path (no Lenis there). ScrollTrigger's own
`snap:` fights the Lenis scrollerProxy (both write scroll position) — don't use it.

## Convention: sessionStorage flags

Session-scoped flags follow the [intro-skip.ts](src/lib/intro-skip.ts) idiom: never read
at module scope or during render (SSR answers false), lazy reads from effects/handlers
only, try/catch around storage access (privacy mode), and the read cache lives on
**globalThis** (not module scope — dual-bundle coherence, same reason as the store pin).

> **The hero-intro double-wheel-flick skip was REMOVED (2026-06-13).** It auto-fired on
> normal scrolling and persisted, permanently killing the WebGPU particle intro. A
> mouse-wheel notch is a fixed ~100px, so two ordinary notches 250–750ms apart were
> indistinguishable from a deliberate "double flick" — a gesture-based skip on the wheel
> is unsalvageable. `intro-skip.ts` + `textMorphStore.introSkipped` remain as inert dead
> code (no writer). **Lesson: never auto-skip a deferred experience on a scroll heuristic;
> any skip must be an explicit, unambiguous affordance (Esc / button).** The intro is a
> deliberate ~4-swipe scroll-through block, replayable, with no gesture skip.

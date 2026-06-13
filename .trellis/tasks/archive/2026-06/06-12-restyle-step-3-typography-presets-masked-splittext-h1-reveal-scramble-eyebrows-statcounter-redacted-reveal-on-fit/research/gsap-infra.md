# Research: GSAP / animation infrastructure (restyle step 3)

Repo root: `C:\Users\alber\Desktop\sersan-v2-main`. Date: 2026-06-12. Branch: `feat/webgl-refactor`.

## 1. Packages & versions (package.json + installed)

From `package.json`:

| Package | Declared | Installed |
|---|---|---|
| `gsap` | `^3.15.0` | **3.15.0** (official npm `gsap` package, license "Standard 'no charge'") |
| `@gsap/react` | `2.1.2` (exact pin) | 2.1.2 |
| `lenis` | `^1.3.23` | 1.3.23 |
| `next` | `16.2.6` | — |
| `react` / `react-dom` | `19.2.4` | — |
| `three` | `0.184.0` | — |
| `@react-three/fiber` | `9.6.1` | — |
| `@react-three/drei` | `10.7.7` | — |
| `@react-three/postprocessing` | `3.0.4`, `postprocessing` `6.39.1` | — |
| `framer-motion` | `^12.40.0` (present, barely used for animation core) | — |
| `zustand` | `5.0.14` | — |
| `tailwindcss` | `^4` (v4, `@tailwindcss/postcss`) | — |

**Club plugins: ALL present.** Since GSAP joined Webflow, the public npm `gsap` package ships every formerly-paid plugin. `node_modules/gsap/` (package root, ESM) contains:

`all.js, CSSPlugin.js, CSSRulePlugin.js, CustomBounce.js, CustomEase.js, CustomWiggle.js, Draggable.js, DrawSVGPlugin.js, EaselPlugin.js, EasePack.js, Flip.js, gsap-core.js, GSDevTools.js, index.js, InertiaPlugin.js, MorphSVGPlugin.js, MotionPathHelper.js, MotionPathPlugin.js, Observer.js, Physics2DPlugin.js, PhysicsPropsPlugin.js, PixiPlugin.js, **ScrambleTextPlugin.js**, ScrollSmoother.js, ScrollToPlugin.js, **ScrollTrigger.js**, **SplitText.js**, TextPlugin.js` + `dist/` (UMD + .min.js for each), `types/`, `utils/`.

So `import { SplitText } from "gsap/SplitText"` and `import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin"` are both available with types. **SplitText and ScrollTrigger are already imported in the codebase; ScrambleTextPlugin is NOT used anywhere yet** (the existing eyebrow scramble is hand-rolled, see §7).

## 2. Plugin registration

No central registration module. Convention = each consuming module registers at module scope behind an SSR guard:

```ts
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}
```

All sites (`registerPlugin` grep, src only):

| File | Plugins |
|---|---|
| `src\components\smooth-scroll-provider.tsx:20` | ScrollTrigger |
| `src\components\fx\heading-choreographer.tsx:25` | ScrollTrigger, SplitText |
| `src\components\ui\section-heading.tsx:11` | ScrollTrigger, SplitText |
| `src\components\ui\use-scroll-parallax.ts:8` | ScrollTrigger |
| `src\components\ui\count-up.tsx:20` | ScrollTrigger |
| `src\components\sections\compliance-pipeline.tsx:21` | ScrollTrigger |
| `src\components\sections\cinematic-system-scroll.tsx:34` | ScrollTrigger |
| `src\components\sections\case-studies-rail.tsx:19` | ScrollTrigger |

(`registerPlugin` is idempotent, so the per-module repetition is safe; follow the same guarded module-scope pattern for new plugins.)

## 3. `useGSAP` usage patterns

Only **4 files** use `@gsap/react`'s `useGSAP`; everything else is plain `useEffect` + manual `st.kill()` cleanup.

- `src\components\fx\heading-choreographer.tsx` — the canonical SplitText reveal. Signature:
  ```ts
  useGSAP(() => { ... return () => { triggers.forEach(t=>t.kill()); tweens.forEach(t=>t.kill()); splits.forEach(s=>s.revert()); }; },
    { scope: scopeRef, dependencies: [language, pathname] });
  ```
  Key conventions inside it:
  - bail first on `window.matchMedia("(prefers-reduced-motion: reduce)").matches`;
  - split/trigger creation happens **inside `document.fonts?.ready.then(...)`** (async — after useGSAP snapshots its context), so they are **NOT auto-collected by gsap.context**; the file keeps `splits[] / triggers[] / tweens[]` arrays plus a `cancelled` flag and tears down manually in the returned cleanup;
  - reveal tokens: `yPercent: 115, duration: 0.85, stagger: 0.09, ease: "expo.out"`, `SplitText(el, { type: "lines", mask: "lines", linesClass: "split-line" })`;
  - velocity-modulated feel: samples `useScrollStore.getState().velocity` at onEnter, clamps `|v|/45` → 0..1, lerps yPercent/stagger/duration within tight bounds, then `tween.invalidate().restart()`;
  - **SPA-nav gotcha pattern**: a `once:true` ScrollTrigger created already-in-view never fires onEnter, so after `ScrollTrigger.create` it does `if (st.isActive || st.progress > 0) fire();`.
  - Re-runs on `[language, pathname]` because EN/IT swaps text in place → must re-split.
- `src\components\ui\magnetic.tsx` — `useGSAP(cb, { scope: ref, dependencies: [strength, radius] })`, `gsap.quickTo` per axis, inline reduced-motion + coarse-pointer bail, listener cleanup returned from callback.
- `src\app\template.tsx` — route-enter transition: `useGSAP(cb, { scope: contentRef })`, content fade-up `fromTo(autoAlpha/y, clearProps:"all")` + sibling curtain clip-path wipe (`expo.inOut`, 0.62s); module-level `hasMountedOnce` flag skips the wipe on first paint; reduced-motion = instant `gsap.set`.
- `src\components\sections\compliance-pipeline.tsx` — looping timeline with `scrollTrigger: { trigger, start: "top 90%", toggleActions: "play pause resume pause" }`, `{ scope: rootRef, dependencies: [mobile, pathLen, streakLen] }`.

Plain-`useEffect` GSAP components (the majority): `ui/section-heading.tsx`, `ui/count-up.tsx`, `ui/reveal.tsx`, `ui/use-scroll-parallax.ts`, `sections/case-studies-rail.tsx`, `sections/cinematic-system-scroll.tsx`. Cleanup is always explicit: `st.kill()`, `split.revert()`, `tl.kill()`, `gsap.set(el, { y: 0 })` resets.

House easing/feel tokens: `expo.out` for reveals, `expo.inOut` for wipes, `power3.out` for cursor chase; reveal rise 24–40px; durations 0.45–0.85s.

## 4. Lenis ↔ ScrollTrigger integration

Two files own it:

- `src\lib\lenis-singleton.ts` — refcounted singleton (`acquireLenis/releaseLenis/getLenis`), `duration: 0.9`, out-expo easing, `smoothWheel: true`. RAF authority is handed to the R3F loop when the canvas is mounted (`setExternalPump(true)` + `pumpLenis(time)` called from `src\webgl\FrameDriver.tsx`); a private rAF tick covers canvas-less tiers.
- `src\components\smooth-scroll-provider.tsx` (mounted in `layout.tsx`, wraps the app):
  - reduced-motion → **no Lenis at all**, native `scroll` listener feeds `useScrollStore.setScroll(progress, velocity=0)`;
  - otherwise `lenis.on("scroll", l => { ScrollTrigger.update(); setScroll(l.progress, l.velocity); })` — one source for GSAP and shader uniforms;
  - `ScrollTrigger.scrollerProxy(document.documentElement, ...)` so triggers resolve against smoothed position — **components never pass a `scroller` option**;
  - debounced (150ms) resize → `ScrollTrigger.refresh()`;
  - route change: `lenis.scrollTo(0, { immediate: true })` + rAF & 450ms `ScrollTrigger.refresh()` — **except on `/`** (the homepage spine owns its own refresh cadence; provider deliberately never refreshes there);
  - anchor-click hijack → `lenis.scrollTo(dest, { offset: -72 })`;
  - unmount kills all ScrollTriggers (`ScrollTrigger.getAll().forEach(st => st.kill())`).

**No shared ScrollTrigger factory/helper** — each component calls `ScrollTrigger.create` directly. Two recurring shapes:
1. once-reveal: `{ trigger: el, start: "top 88%"/"top 90%", once: true, onEnter }` + the created-in-view immediate-fire fix (or use IntersectionObserver instead — `Reveal` and `SectionHeading` already migrated to IO for exactly this SPA-nav reason, `ui/reveal.tsx:86-106`, `ui/section-heading.tsx:79-150`).
2. scrub-by-hand: `{ start: "top bottom"/"top top", end: "bottom top"/"bottom bottom", onUpdate: self => gsap.set/quickSetter(...) }` — no scrub tween (Lenis already smooths).

### Pinned-section convention (spec'd)

`.trellis\spec\frontend\component-guidelines.md` lines 146–163, "Pinned sections — CSS sticky, never ScrollTrigger pin":
- CSS `position: sticky` frame inside a tall section (`height = 100vh + travel`); **never `pin:`** — a pin-spacer mutates the DOM and invalidates the signature line's `[data-line-anchor]` measurements.
- `ScrollTrigger.create` with `start: "top top"`, `end: "bottom bottom"`, `invalidateOnRefresh: true`, `onRefreshInit: measure`, `onUpdate` writes via `gsap.quickSetter`; no scrub tween, no `scroller` option.
- A pinned section on `/` must do its own one-shot `document.fonts.ready → ScrollTrigger.refresh()` (provider doesn't refresh `/`). See `case-studies-rail.tsx:259-267`.
- Track item widths fixed rem-based, never font-dependent (anchor drift).
- Fallback (coarse / reduced-motion / tier off): native `overflow-x:auto` + scroll-snap + `data-lenis-prevent`.
- Reference implementations: `src\components\sections\case-studies-rail.tsx:196-303` and the hero spine `src\components\sections\cinematic-system-scroll.tsx:684-724` (`scrub: 0.6`, CSS sticky stage, refresh timeouts `[60, 250, 700, 1500]` + debounced resize).

## 5. prefers-reduced-motion handling

**No shared hook/util exists.** Universal convention = inline check at effect top, bail early:

```ts
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
```

~20 call sites (heading-choreographer:54, section-heading:52-55, count-up:108-113, reveal:41-49 — which also `gsap.set`s the final visible state before returning —, use-scroll-parallax:36, magnetic:54, template:58-72, label-scrambler:77, custom-cursor:60, card-tilt-controller:56, compliance-pipeline:97, case-studies-rail:213, problem-section:103, process-section:263, founders-section:44, credibility-strip:43, preloader:100, pointerStore:114...). Often paired with `(pointer: coarse)` for hover-driven effects.

Layered fallbacks:
- WebGL: `src\webgl\store\tierStore.ts:30` — reduced-motion resolves tier `"off"` → no canvas at all.
- Scroll: SmoothScrollProvider serves native scroll (no Lenis) under reduced-motion.
- Layout: cinematic spine swaps to `MobileFallback` (static stacked) under reduced-motion on any viewport (`cinematic-system-scroll.tsx:750-757`).
- CSS: `src\app\globals.css` has 8+ `@media (prefers-reduced-motion: reduce)` blocks (lines 158, 181, 219, 227, 271, 435, 541, 656, 860) neutralizing CSS animations / forcing drawn states.
- A11y framing: animated values keep an sr-only static final value with the animated span `aria-hidden` (CountUp:145-152, LabelScrambler aria-label pattern).

Checks are one-shot at mount (no `change` listener / no reactive hook) — fine to match, but a new shared helper would be a deviation to flag in the plan if introduced.

## 6. Font loading & FOUT

`src\app\layout.tsx:24-48` — all via **next/font** (self-hosted, no CDN):
- Display: **Fraunces** (`next/font/google`, variable, `axes:["opsz"]`, normal+italic, `--font-fraunces`). NOTE: comment says Editorial New is no longer distributed by Fontshare; Fraunces is the brand display serif now.
- Body: **Switzer** via `next/font/local` — `src/fonts/switzer-{300,400,500,600}.woff2`, `--font-switzer`.
- Mono: **JetBrains Mono** (`next/font/google`, weights 400/500, `--font-jbm`).
- All `display: "swap"` → FOUT possible; mitigated by gating measurement-sensitive work on **`document.fonts.ready`** (the established convention — SplitText line boxes are wrong if split before swap):
  - `ui/section-heading.tsx:64` — whole reveal built inside `document.fonts?.ready.then(...)` with a `cancelled` flag;
  - `fx/heading-choreographer.tsx:72` — same;
  - `fx/preloader.tsx:209-213` — fonts.ready is one of the preloader readiness signals ("no FOUT flash" hand-off);
  - `sections/case-studies-rail.tsx:263` — one-shot `ScrollTrigger.refresh()` after fonts land;
  - `webgl/hooks/useSectionAnchors.ts:107` and `webgl/HeroTextParticles.tsx:170` — re-measure after fonts.
- CSS var mapping in `globals.css:117-120` (`--font-sans/serif/display/mono`); `.eyebrow` (globals.css:392) = JetBrains Mono micro-label class; `.font-display` utility at :401. No raw `@font-face` anywhere (next/font generates them).

## 7. data-attribute driven animation conventions

Established opt-in markers (querySelectorAll from a single global controller mounted in `layout.tsx`):

- **`data-split-reveal`** — HeadingChoreographer target (`fx/heading-choreographer.tsx:59`, global `document.querySelectorAll("[data-split-reveal]")`). THE existing masked-SplitText reveal opt-in.
- **`.eyebrow` class** (not a data attr) — LabelScrambler target (`fx/label-scrambler.tsx`): one delegated IntersectionObserver + MutationObserver for route-added labels; only "leaf" eyebrows (no element children) are scrambled; `el.dataset.scrambleDone = "1"` once-guard; aria-label holds real text while an `aria-hidden` span mutates. **Hand-rolled setInterval scramble (480ms, 40ms tick, L→R settle) — does NOT use gsap ScrambleTextPlugin** even though the plugin file exists in node_modules.
- `data-eyebrow-line / data-eyebrow-text / data-heading-title / data-heading-desc / data-heading-cta` — SectionHeading's internal cascade hooks (`ui/section-heading.tsx:67-71`, rendered at 179-205). LabelScrambler deliberately skips composite eyebrows containing `[data-eyebrow-text]`.
- **`data-line-anchor`** — WebGL signature-line section anchors (`webgl/hooks/useSectionAnchors.ts`), measured in document space. **Hard invariant: DOM animations must never change document height / pin-spacer the page** or every anchor drifts (this is WHY pins are CSS-sticky).
- `data-rail-card / data-rail-index / data-rail-sticky / data-rail-track` — case-studies rail DOM ↔ `RailPlanes` WebGL sync (`webgl/railStore.ts` re-reads card rects on `bumpMeasure()`).
- `data-hero-headline / data-hero-brand / data-hero-stagger` — hero particle-text sampling targets (`webgl/HeroTextParticles.tsx`).
- `data-cursor="link"` etc. — CustomCursor hover states (magnetic.tsx sets it on its wrapper).
- `data-lenis-prevent` — opts a scroll region out of Lenis (rail native fallback, globals.css:264).
- `data-audio-toggle / data-audio-skip` — AudioTriggers delegated listeners.

## 8. Directly task-relevant existing components

- **Stat counter**: `src\components\ui\count-up.tsx` — `CountUp` already exists: parses metric strings (`+34%`, `~$140M/day`), ScrollTrigger `once:true` at `"top 90%"`, snap-to-0 then `gsap.to(obj, { ease: "expo.out" })` writing `textContent` directly (no React state), sr-only final value + aria-hidden animated span, reduced-motion leaves final value. Used by case-study cards.
- **Fit section** (target of "redacted reveal on fit"): `src\components\sections\fit-section.tsx` — currently static two-column good-fit/not-a-fit lists, EN/IT arrays in-file, wrapped in `SectionHeading` + `Reveal`; has its own `<style>` block with a reduced-motion media query (line ~191). No GSAP in it yet.
- **H1s**: page H1s are plain `font-display` clamp-sized `<h1>`s in `app/*/​*-client.tsx` (e.g. `about-client.tsx:68`); the only H1 reveal machinery today is HeadingChoreographer's `data-split-reveal` (opt-in, not currently on page H1s — grep shows no `data-split-reveal` usage in `app/`), SectionHeading (h2-level), and the WebGL hero particle morph on `/`.
- Global FX mount points live in `src\app\layout.tsx:196-203` (`CardTiltController`, `HeadingChoreographer`, `LabelScrambler`, `CustomCursor`, `AudioTriggers`) — a new global choreographer/preset controller belongs in this list.

## 9. Gotchas checklist for the implementer

1. Register new plugins (ScrambleTextPlugin) with the same `typeof window !== "undefined"` module-scope guard.
2. Always split AFTER `document.fonts.ready`; track splits/triggers manually if created in the async callback (useGSAP context won't collect them) and revert on cleanup + on language/pathname change.
3. `once:true` ScrollTrigger created already-in-view never fires → either IO-drive (Reveal/SectionHeading pattern) or `if (st.isActive || st.progress > 0) fire()` (HeadingChoreographer pattern).
4. Never use ScrollTrigger `pin:` or any technique that changes document height (breaks `[data-line-anchor]`); no `scroller` option (provider proxy covers it); no scrub tweens (Lenis smooths).
5. Reduced-motion: inline matchMedia bail + render final state; keep sr-only/aria-hidden split for any text that mutates mid-animation.
6. EN/IT swaps replace text in place — every text-measuring effect must depend on `language` (from `useLanguage()` in `@/components/language-provider`) and revert cleanly before re-split.
7. Provider never refreshes ScrollTrigger on `/` — homepage triggers must self-refresh (fonts.ready one-shot).

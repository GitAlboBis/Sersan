# Research: scroll stores, snap mechanics, section-state bus design

Task: restyle step 4 — section-state bus, spine compression, soft snap, skip, TSL compute attractors hero sim.
Scope of this doc: inventory of existing stores/consumers + snap options, and a recommended bus shape.
All paths relative to repo root `C:\Users\alber\Desktop\sersan-v2-main`.

---

## 1. Zustand store inventory (`src/webgl/store/`)

### 1.1 `scrollStore.ts` — the hot scroll bus (closest existing thing to the section bus)

Fields (`src/webgl/store/scrollStore.ts:11-42`):
- `progress` (0..1 document), `velocity` (Lenis px/frame-ish), `reveal` (route-transition line fade), `activeAnchor` (centered `[data-line-anchor]` id or null), `anchorPulse` (section-arrival pulse TARGET, decayed by consumer).

Writers:
- `setScroll` — `src/components/smooth-scroll-provider.tsx:82` (handle), called from the Lenis `"scroll"` event at `:111-117`, or from the native-scroll fallback under reduced motion at `:91-98`. ONE writer, every Lenis tick.
- `setReveal` — `src/webgl/Scene.tsx:196-201` (route-change beat: 0 → 1 after 420ms) and `src/webgl/SignatureLine.tsx:244-269` (preloader hand-off edge via introStore subscribe).
- `setActiveAnchor` — `src/webgl/hooks/useSectionAnchors.ts:171` (the IntersectionObserver recompute). Bumps `anchorPulse` to 1 on change (`scrollStore.ts:52-55`).
- `setAnchorPulse` — write-back of the decayed pulse from `src/webgl/SignatureLine.tsx:280-286` (damp toward 0 inside useFrame).

Readers (all transient `getState()` in frame/rAF loops — the documented discipline, `scrollStore.ts:1-8`):
- `src/webgl/SignatureLine.tsx:272-273` — progress/velocity/reveal/anchorPulse (camera + uniforms).
- `src/webgl/HeroLogo.tsx:842` — progress (hero scroll choreography).
- `src/webgl/DriftParticles.tsx:202` — progress → `uProgress`.
- `src/webgl/CurlTubeField.tsx:222` — progress (component currently UNMOUNTED, see `Scene.tsx:21-26`).
- `src/webgl/RouteHero.tsx:253` — |velocity| (ritual-object energy).
- `src/webgl/RailPlanes.tsx:194` — reveal.
- `src/components/fx/heading-choreographer.tsx:111` — velocity (velocity-modulated split-text reveal).
- `src/components/sections/credibility-strip.tsx:68` — |velocity| (marquee timeScale surge, own rAF).
- `src/components/sections/production-grade-section.tsx:237` — progress (trace-panel sweep STEP modulation, own rAF).

Dev handle: `window.__sersanScroll` (`src/webgl/Scene.tsx:50-52`).

### 1.2 `textMorphStore.ts` — hero intro / gates

Fields (`src/webgl/store/textMorphStore.ts:22-113`): `active`, `domReveal`, `gateProgress`, `gateEngaged`, `gateKick`, `assembleDone`, `morphDone`, `morph2Done`, `morph3Done`, `camTilt`, `tiltAnchorY`, `camDescend`, `tiltDone`.

Writers: `HeroTextParticles` (entry/morph clocks, domReveal), `src/components/fx/hero-intro-gate.tsx:46-103` (gateProgress/gateEngaged/gateKick), `SpineExitGate` in `src/components/sections/cinematic-system-scroll.tsx:1005,1017-1019,1075-1088` (camTilt/tiltAnchorY/tiltDone/gateKick), `src/webgl/SignatureLine.tsx:324,427-429` (gateKick consume-and-zero, camDescend publish), and the nav-into-home reset in `src/components/smooth-scroll-provider.tsx:52-64`.

Readers: SignatureLine (`:316,406`), HeroLogo (`:874` camDescend), HeroTextParticles, the hero StagePanel scrim rAF (`cinematic-system-scroll.tsx:808-824`).

**CRITICAL precedent**: the store is **globalThis-pinned** (`textMorphStore.ts:132-149`) because Turbopack inlined a separate copy into the route bundle vs the lazy WebGL island in prod (2026-06-10) — two live zustand instances, intro silently dead. **Any new sectionStore imported from both the route bundle (navbar/snap/skip UI) and the lazy WebGL island MUST use the same `globalThis.__sersan…` pin.**

### 1.3 `railStore.ts` — case-studies rail bridge

Fields (`src/webgl/store/railStore.ts:21-44`): `pinned`, `travel`, `secTop`, `trackX`, `progress`, `velocity`, `hover{}`, `measureVersion`.
Writer: the rail's ScrollTrigger `onUpdate` + measure in `src/components/sections/case-studies-rail.tsx:226-257` (and `reset()` in cleanup `:301`).
Reader: `src/webgl/RailPlanes.tsx` per-frame getState; reactive only on `pinned`/`measureVersion`.
This is the repo's model for a "per-section progress" store: section-scoped ScrollTrigger → transient store → useFrame consumer.

### 1.4 `tierStore.ts` — device tier
`tier full|lite|off`, `resolved`, `heroReady` (`src/webgl/store/tierStore.ts:16-26`). Writer: CanvasHost resolve + PerformanceMonitor degrade; HeroLogo `setHeroReady` (`HeroLogo.tsx:838`). NOTE: tier `"off"` ⇒ no Canvas ⇒ today's `useSectionAnchors` (mounted inside Scene) never runs ⇒ **`scrollStore.activeAnchor` is never written when WebGL is off** — a bus must not inherit this gating (see §6).

### 1.5 Others (context only)
- `fxStore.ts` — dev-tunable look knobs, defaults = shipped look (`src/webgl/store/fxStore.ts:172-225`). Read per-frame by SignatureLine/DriftParticles/HeroLogo; reactively by PostFX.
- `routeFxStore.ts` — **not a store**: pure pathname-keyed data, `routeFx(pathname)` (`src/webgl/store/routeFxStore.ts:145-150`). Consumers: `DriftParticles.tsx:124`, `PostFX.tsx:34`, `PostFXNodes.tsx:135`, `SignatureLine.tsx:145,168`. Route-level tone only — no section granularity.
- `introStore.ts` — `introComplete` one-way latch (`introStore.ts:27-36`); writer = preloader; subscribers = SignatureLine (`:257`), HeroIntroGate `canEngage` (`hero-intro-gate.tsx:67`).
- `pointerStore.ts` — raw/smooth/vel pointer, advanced once per frame by FrameDriver (`FrameDriver.tsx:50-53`).
- `heroDragStore.ts` — hero drag velocity (writer: hero-drag-layer.tsx; reader: HeroLogo).
- `audioStore.ts` — persisted pref, localStorage `"sersan_audio"` (`audioStore.ts:22`), hydrate-in-effect pattern (`:58-69`).

### 1.6 Who derives "what section am I in" independently today (the duplication the bus removes)

1. **useSectionAnchors IO** (`src/webgl/hooks/useSectionAnchors.ts:129-194`): one IntersectionObserver over `[data-line-anchor]`, threshold 0.35, picks the node nearest viewport center → `setActiveAnchor` (`:171`) + local reactive `inView`/`activeAnchor` state. The only consumer of the store's pulse is SignatureLine; **nothing reads `scrollStore.activeAnchor` itself yet** — it's a write-only field today.
2. **SignatureLine uProgress mapping** (`SignatureLine.tsx:301-354,438`): derives `headFraction = (scrollYWorld + ih*0.5)/sh` — "where the reader is" as a document fraction; curve waypoints glue to anchor fractions at `:172` (`anchors.fractions[wp.anchor]`, configs in `src/webgl/curves/routeCurves.ts:30-60` for home). Section identity is implicit in curve param ≈ doc fraction.
3. **HeroLogo hero-progress** (`HeroLogo.tsx:846-850`): own per-section progress `hp = scrollPx / heroSpan.end·sh` from `anchors.spans["hero"]`.
4. **RouteHero** (`RouteHero.tsx:199`): `anchors.fractions[anchorId]` world-anchoring (per-anchor, route ritual objects).
5. **Cinematic spine** (`cinematic-system-scroll.tsx:767-778`): own ScrollTrigger writes `progressRef.current` — the hero section's 0..1, consumed only inside that component (stage switching).
6. **Case-studies rail** (`case-studies-rail.tsx:241-252`): own ScrollTrigger → railStore progress/velocity.
7. **Navbar** (`src/components/navbar.tsx:176,225`): route-level `isActive(href)` from `usePathname`, plus its OWN native `window scroll` listener for the `scrolled > 24px` border state (`:174-180`) — a third scroll source besides Lenis and ScrollTrigger.
8. **TracePanel / credibility strip** (`production-grade-section.tsx:222-248`, `credibility-strip.tsx:63-74`): own rAF loops reading global progress/velocity, plus a private `useInView` IO hook (`production-grade-section.tsx:43-57`).
9. **Reveal / SectionHeading / reveal-on-scroll** (`src/components/ui/reveal.tsx:86-90`, `src/components/ui/section-heading.tsx:80-83`): per-element IntersectionObservers (deliberately NOT ScrollTrigger — once:true SPA-nav trap documented there).
10. **routeFx** consumers: route-level only (no section), see §1.5.

So: 1 IO writer that nobody reads, 2 pinned-section ScrollTriggers with private progress, 2 private rAF loops, per-element IOs, and a navbar with its own native scroll listener. The bus collapses #1's IO + the section-identity half of #2/#3 + gives #5/#6/#7 a shared source.

---

## 2. ScrollTrigger / IO inventory — what could collapse into one bus writer

`ScrollTrigger.create` sites (7 total):

| Site | Purpose | Collapse into bus? |
|---|---|---|
| `src/components/sections/cinematic-system-scroll.tsx:767` | Spine scrub: `start "top top" / end "bottom bottom"`, `scrub 0.6`, writes private `progressRef` (no pin — CSS sticky pins) | **Yes (feeder)** — this IS per-section progress for `hero`; should publish to the bus instead of a private ref. |
| `src/components/sections/case-studies-rail.tsx:241` | Rail scrub + measure (`onRefreshInit`), writes railStore (`setTrack` incl. `getVelocity()`) | **Partially** — keep railStore for trackX/hover (WebGL planes need them), but its `progress` duplicates a bus per-section progress for `case-studies`. |
| `src/components/ui/count-up.tsx:159` | once:true onEnter metric count (per element, with born-active fix `:169`) | No — element-level, but could *optionally* listen to bus section-enter instead. |
| `src/components/ui/use-scroll-parallax.ts:38` | per-element ±4px parallax onUpdate | No — needs element-through-viewport progress, not section identity. |
| `src/components/fx/heading-choreographer.tsx:124` | once:true split-text heading reveal (born-active fix `:137`) | No — element-level. |
| `src/components/sections/compliance-pipeline.tsx:118` | `scrollTrigger` in a gsap.timeline, `toggleActions: "play pause resume pause"` (trust route streak loop) | Could become a bus `inView` subscriber, low priority. |
| (provider) `smooth-scroll-provider.tsx:135` | `scrollerProxy` wiring, not a trigger | n/a |

IntersectionObservers: `useSectionAnchors.ts:174` (the future bus writer), `reveal.tsx`, `section-heading.tsx`, `production-grade-section.tsx:49`, navbar none (native scroll). The element-level once-reveals should stay IO (their SPA-nav born-active semantics are deliberate); the bus replaces only **section-identity** derivation.

Refresh choreography to respect: provider refreshes ST on interior routes only (`smooth-scroll-provider.tsx:69-76` — deliberately NOT on `/`, the spine owns its bursts `cinematic-system-scroll.tsx:783-792`; the rail self-refreshes on fonts `case-studies-rail.tsx:262-267`). `useSectionAnchors` re-measures on mount/resize(150ms)/fonts/700ms/1600ms (`useSectionAnchors.ts:104-115`).

---

## 3. `[data-line-anchor]` inventory (candidate section boundaries)

**There are NO `[data-section]` attributes anywhere in src** (grep: zero hits). `[data-line-anchor]` is the single section-marker convention, already measured into `fractions` (centers) and `spans` (start/end doc fractions) by `useSectionAnchors.ts:67-102`.

Per route (ordered as in DOM):

- **Home `src/app/page.tsx:46-84`**: `hero`, `credibility`, `problem`, `case-studies`, `work-in-progress` (zero-height `:64`), `services`, `production`, `founders`, `process`, `fit`, `gateway` (transparent gap `:83`), `final-cta`.
- **Audit `src/app/audit/audit-client.tsx:152-497`**: `hero`, `surfaces`, `deliverable`, `timeline`, `ritual` (zero-content gap), `final-cta`.
- **Consulting `src/app/consulting/consulting-client.tsx:186-460`**: `hero`, `practice`, `engage`, `process`, `ritual`, `final-cta`.
- **Trust `src/app/trust/trust-client.tsx:141-328`**: `hero`, `gdpr-roles`, `pipeline`, `controls`, `ritual`, `final-cta`.
- **About `src/app/about/about-client.tsx:47-298`**: `hero`, `why`, `founders`, `rules`, `ritual`, `final-cta`.
- **Contact `src/app/contact/contact-client.tsx:74-312`**: `hero`, `reach`, `intake`, `ritual`, `final-cta`.
- **Case studies `src/app/case-studies/case-studies-client.tsx:20-158`**: `hero`, `grid`, `disclaimer`, `ritual`, `final-cta`.
- **Resources `src/app/resources/resources-client.tsx:32-134`**: `hero`, `list`, `ritual`, `final-cta`.

Notes for the bus / snap:
- Some anchors are **zero-height or decorative gaps** (`work-in-progress`, `gateway`, every `ritual`) — they exist for the line curve, not as scroll destinations. The bus needs an exclusion/flag list, or snap targets should be a curated subset (e.g. skip zero-height spans: detectable since `span.start === span.end` approx).
- The home `hero` anchor wraps the 520vh pinned spine and `case-studies` wraps the tall rail wrapper — their spans are huge; per-section progress within them is exactly what the spine/rail ScrollTriggers already compute.
- DOM `id=` attributes also exist on some sections (e.g. `id="credibility"` `credibility-strip.tsx:89`) for nav hash links (provider hijacks `#` links at `smooth-scroll-provider.tsx:120-131`, offset -72).

---

## 4. Lenis 1.3.23 snap support — YES, it ships

Installed version: **1.3.23** (`node_modules/lenis/package.json`). The package **ships the snap plugin**:
- exports map: `"./snap" → dist/lenis-snap.mjs` (+ `.d.ts`, `.js`, min builds) — import as `import Snap from "lenis/snap"`.

### 4.1 API (from `node_modules/lenis/dist/lenis-snap.d.ts` + `.mjs`)

```ts
const snap = new Snap(lenis, {
  type?: 'mandatory' | 'proximity' | 'lock',   // default 'proximity'
  lerp?, easing?, duration?,                    // forwarded to lenis.scrollTo
  distanceThreshold?: number | `${n}%`,         // default '50%' of viewport (ignored for mandatory)
  debounce?: number,                            // default 500 ms
  onSnapStart?, onSnapComplete?: (item: {value, index?}) => void,
});
snap.add(valuePx): () => void                    // raw px snap point
snap.addElement(el, { align?: 'start'|'center'|'end'|string[], ignoreSticky?=true, ignoreTransform?=false })
snap.addElements(els, opts)
snap.start() / snap.stop()                       // isStopped gate
snap.previous() / snap.next() / snap.goTo(index)
snap.resize() / snap.destroy()
```

Mechanics (lenis-snap.mjs):
- Trigger: `lenis.on('virtual-scroll', debounced(onSnap))` (`:181`) — fires **only on user wheel/touch input**, debounced (default 500ms after the last input). `touchmove` events are skipped (`:300`); keyboard / scrollbar / programmatic scrolls NEVER trigger snap.
- Target selection (`:298-324`): predicted position = `lenis.scroll + delta`; nearest snap (proximity) or directional next/prev (lock); snaps only if within `distanceThreshold` (default 50% viewport → effectively "soft" already).
- Execution (`:262-287`): `lenis.scrollTo(value, { duration, easing, lerp, lock: type === 'lock', userData: { initiator: 'snap' } })`. So **the snap rides Lenis' own animation** — no second scroll authority, no fight. `lock: true` makes Lenis ignore user input until the snap completes (`lenis.d.ts:94` ScrollToOptions.lock); for a *soft* snap use `proximity` (lock:false) so a new wheel gesture cancels it naturally.
- Re-entry guard: in lock mode it ignores virtual-scroll while `lenis.userData?.initiator === 'snap'` (`:301`).
- `SnapElement` measures with its own ResizeObservers and **removes `position:sticky` from ancestors during measurement by default** (`ignoreSticky: true`, `:95-112`) — relevant because our spine/rail sections are sticky-pinned; element-based snap on the sticky stage would measure the un-stuck position (correct for the wrapper, but prefer `snap.add(px)` with values computed from `useSectionAnchors` spans to keep one measurement authority).
- Sets `window.lenis.snap = true` (`:166-167`) — global side effect, harmless.

Interplay with OUR setup:
- ScrollTrigger never sees the snap as anything but normal Lenis scroll (provider bridges Lenis→`ScrollTrigger.update()` at `smooth-scroll-provider.tsx:111-117`). 
- **Gates**: HeroIntroGate (`hero-intro-gate.tsx:79-83`) and SpineExitGate (`cinematic-system-scroll.tsx:1014-1015`) consume wheel with `preventDefault + stopImmediatePropagation` at capture — Lenis' own handler never runs, so no `virtual-scroll` event fires while a gate is engaged → snap stays naturally quiet during gates. Still, belt-and-braces: call `snap.stop()` while `textMorphStore.gateEngaged` or while Lenis is stopped, and while `railStore.pinned` section is mid-rail if rail snapping is unwanted.
- The Lenis instance is a refcounted singleton (`src/lib/lenis-singleton.ts:51-78`), pumped by the R3F FrameDriver (`src/webgl/FrameDriver.tsx:50-53` → `pumpLenis`); snap subscribes to events only, so the pump arrangement is unaffected. Snap must `destroy()` with the provider (it holds window resize listener + ResizeObservers).
- Reduced motion: provider doesn't create Lenis at all (`smooth-scroll-provider.tsx:87-99`) — snap must be created only on the Lenis path.

### 4.2 ScrollTrigger snap (fallback option, NOT recommended here)

`ScrollTrigger.create({ snap: { snapTo: [0.2, 0.5, ...] | (v)=>v', duration, delay, directional, ease, onStart/onInterrupt/onComplete } })`. Known interplay problem with external smoothers: ST snap tweens scroll via the scrollerProxy setter, which we wire to `lenis.scrollTo(value, { immediate: true })` (`smooth-scroll-provider.tsx:135-141`) — every tween tick teleports Lenis, so ST's ease drives, but Lenis keeps accepting wheel input mid-snap and both write the position (last writer wins → visible stutter/rubber-banding). The classic cure is the lock pattern — on scroll-end run `lenis.scrollTo(y, { lock: true })` yourself instead of ST snap. Since lenis/snap already implements exactly that loop natively (debounced scroll-end → `lenis.scrollTo`), **use lenis/snap**.

### 4.3 Existing wheel handling + where double wheel-flick detection could live

- Lenis config: `smoothWheel: true`, `duration: 0.9`, out-expo-ish easing (`lenis-singleton.ts:53-61`). No `syncTouch`.
- Lenis exposes `velocity` (`lenis.d.ts:307`) — already mirrored into `scrollStore.velocity` per tick (`smooth-scroll-provider.tsx:115`).
- `lenis.on('virtual-scroll', cb)` (`lenis.d.ts:372`) delivers raw `{deltaX, deltaY, event}` per input — pre-smoothing, input-only. **Best home for double-flick detection**: two same-sign `deltaY` bursts within a time window; it sees exactly what snap sees and nothing during gates.
- Precedent for capture-phase wheel listeners with deltaMode normalization (`×16` line / `×120` page): `hero-intro-gate.tsx:107-111`, `cinematic-system-scroll.tsx:1021-1024`. A detection-only listener should be `passive: true` (no preventDefault) unlike the gates.
- Alternative: threshold `scrollStore.velocity` spikes in the FrameDriver loop — works, but conflates flicks with sustained fast scroll; raw deltas are cleaner.

---

## 5. sessionStorage conventions + intro replay logic (skip feature constraints)

- **sessionStorage: ZERO uses in `src/`** (grep). A skip flag would establish a new convention — recommend key `"sersan_skip_intro"` (mirroring `"sersan_audio"` naming, `audioStore.ts:22`).
- localStorage precedents (the pattern to copy): `audioStore.ts:36-69` — `persist()` wrapped in try/catch (quota/privacy mode), SSR-guarded, and a `hydrate()` called once from an effect so SSR markup and first client paint never depend on the stored value (no hydration mismatch). Language does the same (`src/components/language-provider.tsx:50,81`).
- **Intro replay rule the skip must compose with** (`src/components/smooth-scroll-provider.tsx:42-67`): on navigation INTO `/` from another route (`prev !== null && prev !== "/"`), the provider synchronously scrolls Lenis to 0 and resets textMorphStore (`assembleDone:false, gateProgress:0, …, tiltDone:false, domReveal:1`) so the particle intro replays. First paint and same-route phantom remounts do NOT reset. HeroTextParticles re-mounts on `/` and reads `assembleDone` only after its async imports, so the reset always lands first.
- Other replay-adjacent facts:
  - Preloader runs **once per hard load** (persistent layout `src/app/layout.tsx:190`); `introStore.introComplete` is a one-way latch — soft navs never re-show it.
  - The gates poll: HeroIntroGate engages whenever `morph.active && introComplete && scrollY <= 2 && gateProgress < 1` (`hero-intro-gate.tsx:64-68,124-127`). A skip therefore cannot just scroll past — it must set the morph chain flags (`gateProgress:1, assembleDone/morphDone/morph2Done/morph3Done/tiltDone:true`-equivalent) or the gate will re-engage at top.
  - Background-tab caveat (memory: preloader rAF throttling) — any skip UI timing should not depend on rAF having run.
- Composition recommendation: persist the skip *offer* eligibility in sessionStorage (e.g. "intro already watched this tab session → show skip affordance immediately / auto-skip"), but keep the provider's reset as the single replay authority: the skip path should run AFTER the reset (effect order: provider reset is synchronous in its pathname effect; a skip component can read the flag in its own effect and fast-forward the morph store + `lenis.scrollTo` target). Never write `assembleDone` from two places without going through textMorphStore.setState (single store, globalThis-pinned).

---

## 6. Recommended bus shape

### New `sectionStore` vs extending `scrollStore`

**Recommend a NEW `src/webgl/store/sectionStore.ts`** (globalThis-pinned like textMorphStore — it will be imported by both the route bundle and the WebGL island):

- `scrollStore` is written on **every Lenis tick** (`setScroll`). Zustand notifies all listeners on every `set`; reactive subscribers to rare-change section fields would have their selectors run per scroll tick. Cheap but needless; separating rare-change (section identity) from hot (progress/velocity) keeps reactive section consumers (navbar highlight, skip UI, snap rebuild) genuinely quiet.
- `scrollStore.activeAnchor`/`anchorPulse` already exist but `activeAnchor` has **no reader** and `anchorPulse` only feeds SignatureLine's emissive bump — easy to migrate: keep them as a compat alias during the transition or move the pulse into sectionStore and update `SignatureLine.tsx:273,280-286`.
- The duplication-removal: the IO writer inside `useSectionAnchors.ts:129-194` is hoisted OUT of the Canvas-gated hook into the layout-level bus writer; `useSectionAnchors` keeps the geometry measurement (fractions/spans for the curve) and can also feed the bus's spans.

### API sketch

```ts
// src/webgl/store/sectionStore.ts  (globalThis-pinned, SSR-safe defaults)
export interface SectionSpan { start: number; end: number } // doc fractions
interface SectionState {
  /** Ordered [data-line-anchor] ids for the current route (DOM order). */
  sections: string[];
  /** Measured spans by id (same data useSectionAnchors produces). */
  spans: Record<string, SectionSpan>;
  /** Bumped on every re-measure (resize/fonts/route) — consumers re-derive. */
  measureVersion: number;
  /** Centered section id (the bus's activeAnchor), null before first IO. */
  active: string | null;
  /** Index of `active` in `sections`, -1 when null. */
  index: number;
  /** Scroll direction: 1 down, -1 up, 0 idle. Written ONLY on flips. */
  direction: 1 | -1 | 0;
  /** Arrival pulse target 0..1 (migrated from scrollStore.anchorPulse). */
  pulse: number;
  setSections(sections: string[], spans: Record<string, SectionSpan>): void;
  setActive(id: string | null): void;          // bumps pulse + index, no-op if same
  setDirection(d: 1 | -1 | 0): void;            // no-op if same
  setPulse(p: number): void;                     // consumer decay write-back
}
// Pure helper — per-section progress WITHOUT per-frame store writes:
export function sectionProgress(id: string, docProgress: number, scrollHeight: number, viewportH: number): number
// (derives from spans: how far the viewport center has traversed span.start..span.end, clamped 0..1)
```

Per-section progress deliberately stays a **derived pure function** (consumers in useFrame call it with `useScrollStore.getState().progress`), not a store field — writing it per frame would churn the store exactly like the pulse-decay caveat SignatureLine already documents (`SignatureLine.tsx:281-286`). The two pinned sections that need *scrubbed* progress (spine, rail) keep their ScrollTriggers as feeders; optionally they publish into the bus (`spineProgress` could live here instead of the private `progressRef`, `cinematic-system-scroll.tsx:725,776`).

### Single writer placement

One **layout-level client component** (e.g. `<SectionBus />` mounted next to `SmoothScrollProvider` in `src/app/layout.tsx:183-213`, or inside the provider itself since it already owns pathname effects + the Lenis event):
- runs the `[data-line-anchor]` measure + ONE IntersectionObserver (lift the logic from `useSectionAnchors.ts:61-194`, keyed on `usePathname()`),
- derives `direction` from the existing Lenis scroll callback's velocity sign (write only on flip),
- works on **every tier including "off"** (fixes the current gap where activeAnchor never updates without WebGL) and under reduced motion (native-scroll fallback path `smooth-scroll-provider.tsx:90-99`),
- owns the Snap instance (lenis/snap) rebuilt on `measureVersion`/route from the curated span list (skip zero-height anchors `work-in-progress`/`gateway`/`ritual`), `snap.stop()` while `textMorphStore.gateEngaged` / Lenis stopped.

`useSectionAnchors` then either (a) keeps its own measure for curve geometry and the bus duplicates only the IO (minimal diff), or (b) reads spans from the bus (single measurement authority — preferred end state; watch the re-measure cadence parity: 150ms resize debounce + fonts + 700/1600ms late passes, `useSectionAnchors.ts:104-115`).

### Consumption rules (unchanged repo discipline)

- useFrame/rAF consumers: `useSectionStore.getState()` — never reactive hooks in hot paths (convention documented in `scrollStore.ts:1-8`, `railStore.ts:6-11`).
- Reactive consumers (navbar section highlight, skip affordance, compliance-pipeline play/pause): selector subscriptions on `active`/`index` — these change at section cadence, not scroll cadence.
- SSR safety: module-scope create with `sections: [], active: null, direction: 0` (no DOM access — same as every existing store); all measurement in effects; the globalThis pin is SSR-safe as written in `textMorphStore.ts:148-149` (plain `??=` on `globalThis`).
- Dev handle: register `window.__sersanSection` alongside the others in `Scene.tsx:46-62` (or in the bus component so it exists with WebGL off).

### Snap + skip integration points (for the implementer)

- Soft snap = `new Snap(lenis, { type: 'proximity', duration: ~0.9, distanceThreshold: '35%'?, debounce: ~350-500 })` + `snap.add(Math.round(span.start * scrollHeight))` per curated section; rebuild on `measureVersion`. No lock → a new gesture cancels mid-snap naturally.
- Double wheel-flick: detect on `lenis.on('virtual-scroll')` deltas inside the bus writer (window ~350ms, same sign, magnitude threshold) → `snap.next()/previous()` or `lenis.scrollTo(nextSpanStartPx, { duration })`.
- Skip: sessionStorage flag (new convention, §5) + fast-forward of textMorphStore via its setState, sequenced after the provider's nav-into-home reset (`smooth-scroll-provider.tsx:47-66`).

# WebGL Island Guidelines (R3F Canvas)

Contracts learned 2026-07-07 (scroll/cards refactor). These are binding for any code
that runs inside the persistent Canvas island (`src/webgl/*`).

## Don't: depend on React commits inside the Canvas for correctness

**Problem**:
```tsx
// Inside a Canvas child — DON'T
const [tsl, setTsl] = useState(null);
useEffect(() => { import("./mat").then(m => setTsl(m.create())); }, []);
// ...
const LazyThing = React.lazy(() => import("./Thing"));   // bridged child
<Suspense><LazyThing /></Suspense>                        // suspends on chunk + useGLTF
```

**Why it's bad**: R3F v9 renders Canvas children into its own reconciler root. A pending
Suspense inside the bridged children (verified: `RouteHero` → `React.lazy(RouteHeroLogo)`
→ `useGLTF` chained suspensions) **wedges the island's commit queue**: useFrame loops and
effects keep running, but no further React commits land — neither island state
(`setTsl` never applied → line invisible) nor bridged props (`anchors` frozen at mount
snapshot). Home was immune only because its `HeroLogo` is statically imported and
`useGLTF.preload`ed. Symptom is silent: everything imperative keeps animating.

**Instead**:
```tsx
// Effect + ref, attach imperatively (PostFXNodes / RouteHeroLogo pattern)
const ref = useRef(null);
useEffect(() => {
  let cancelled = false;
  loaderPromise.then(built => { if (!cancelled) { ref.current = built; mesh.material = built.material; } });
  return () => { cancelled = true; };
}, []);
// useFrame reads ref.current; store reads via useSectionStore.getState()
```
- No `React.lazy` / thrown promises inside bridged Canvas children; preload assets at
  module eval (module-cached loader promise) and mount from an effect.
- Hot data (scroll, anchors, rail track) is read transiently via `getState()` in
  `useFrame`; version-keyed resources (line geometry + doc→arc LUT) are rebuilt
  **imperatively** when `{measureVersion, measuredPath}` outruns the last build
  (`SignatureLine.buildLineGeometry` — one pure builder shared by memo + frame path,
  with explicit geometry ownership: memo-committed vs frame-owned, each disposed by
  exactly one owner).

## Convention: scroll-position ⇄ tube parametrization

`uProgress` fed to the line shader must be an **arc-length** fraction (TubeGeometry's
`uv.x` comes from `getPointAt`). Reader position is a **document** fraction. Never write
one into the other: convert through the per-waypoint LUT (`docF[] → arcF[]`, built with
`curve.getLengths(512)` next to the curve, same lifecycle). Normalize the reader range
`[ih/2sh, 1−ih/2sh] → [0,1]` before the LUT so the line completes exactly at page
bottom. The camera lookAt-ahead must sample with the SAME remapped arc fraction.

## Convention: scrubbed beats must be C1 at their boundaries

The post-hero descent unwind uses `1 − smoothstep(dist/ih)` with the ramp span EQUAL to
the landing glide distance (1 viewport), and the landing `lenis.scrollTo` uses
`easeInOutCubic + lock: true`. Rule: any hand-off between a time-driven beat and a
scroll-driven mapping needs zero slope at both ends and matched spans — a `Math.min`
clamp on a linear ramp is a visible velocity kink.

## Convention: pinned horizontal sections (founders-rail / case-studies-rail)

- CSS `position: sticky` frame + px section height from `measure()`; ONE ScrollTrigger
  (`start "top top"`, `end "bottom bottom"`, `invalidateOnRefresh`,
  `onRefreshInit: measure`) writing via quickSetter. **Never `pin:`** (pin-spacers
  re-parent DOM and break `[data-line-anchor]` measurement).
- Per-frame motion is analytic from cached offsets minus trackX — zero
  `getBoundingClientRect` in loops. Shared card motion math lives in
  `src/webgl/store/railMotion.ts` and MUST be mirrored identically by RailPlanes.
- Drag bridge: Draggable + InertiaPlugin, `onDrag/onThrowUpdate` →
  `getLenis()?.scrollTo(secTop + travel·progress, { immediate: true })` (null-guarded,
  `window.scrollTo` fallback); ScrollTrigger onUpdate re-syncs `drag.update()` after
  `setX` — no feedback loop because both paths converge on the same x. Click
  suppression arms only after a real drag.
- Full cleanup contract on unmount: kill trigger + draggable, transforms zeroed,
  `section.style.height = ""`, store reset, listeners/observers off.

## Convention: measurement freshness

SectionBus owns ALL `[data-line-anchor]` measurement. It re-measures on: route mount,
700/1600ms passes, `document.fonts.ready`, debounced window resize, a debounced
`ResizeObserver` on `document.body` (accordions, language swaps, post-mount px-height
asserts), and the `"sersan:remeasure"` CustomEvent (dispatched by language-provider).
`setMeasured` carries the pathname (`measuredPath`) and never short-circuits a path
change; consumers hold their last good geometry while `measuredPath !== pathname`.

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

## Don't: detect the runtime backend with a negative-flag test

Learned 2026-07-20 (motion fix round, commit 69e49a6 + follow-up).

**Problem**:
```ts
// DON'T — reports "webgl2" on EVERY machine
return backend?.isWebGLBackend === false ? "webgpu" : "webgl2";
```

**Why it's bad**: three sets only each backend's OWN positive flag —
`WebGPUBackend.js` sets `isWebGPUBackend = true`, `WebGLBackend.js` sets
`isWebGLBackend = true`, and **neither sets the other's**. On a true WebGPU backend
`isWebGLBackend` is therefore `undefined`, `undefined === false` is `false`, and the
gate fails closed. This typechecks, looks obviously correct in review, and silently
disabled the founders morph on every machine until it was caught in the browser.

**Instead** — mirror the consumer's own probe exactly, and require the capability
you actually need (compute), not just the backend label:
```ts
const backend = r?.backend;
if (!backend) return "webgl2";                       // plain WebGLRenderer
return backend.isWebGLBackend !== true && typeof r?.compute === "function"
  ? "webgpu"
  : "webgl2";
```
`FounderPortraitMorph`'s in-island guard uses this same three-term predicate. If the
DOM gate and the island gate ever disagree, the DOM renders a layout the island can
never drive (see next section). The equivalence is currently maintained by hand across
two files — prefer a shared exported helper if either side is touched again.

## Convention: capability-dependent DOM layouts gate on the RESOLVED backend

`webgpuEnabled()` is a **build-time** env read. With the flag on, a browser without
WebGPU still resolves to the WebGL2 fallback at runtime. A DOM layout whose animation
lives in a compute-only island must therefore gate on the resolved runtime backend
(`tierStore.backend`, published once from Scene's `onCreated`), never on the flag.

Failure this prevents: the founders morph rendered its two-column stage on WebGL2,
where the island never builds and never calls `setActive(true)`; the scroll gate then
never engaged, `morph` never advanced, and founder B's name, bio, credentials and
LinkedIn — all rendered at `opacity: 0` awaiting the morph — stayed permanently
invisible and unreachable. Treat `backend === null` (unresolved) as falsy so first
paint never shows a layout that may turn out to be undriveable.

## Don't: treat "a build happened" as "the one-shot animation played"

**Problem**:
```ts
// DON'T — hasBuiltRef is set at BUILD time, not at completion time
buildNow(hasBuiltRef.current);          // → preserveState
if (preserveState) { uAssemble.value = 1; entryRef.current = 1; }
```

**Why it's bad**: rebuilds are triggered by `measureVersion` bumps, which fire on
mount, intro-complete, `document.fonts.ready` and every resize — routinely long
before the section is scrolled into view. Each one seeded the cloud at its formed
home positions and pinned the entry uniform at 1, silently **consuming** the entry
animation. The section then arrived already assembled, with no error anywhere.

**Instead**: gate the skip on actual completion, and keep the scattered seed until
then, so a pre-entry rebuild replays rather than cancels:
```ts
const keepEntry = preserveState && entryRef.current >= 1;
seed = keepEntry ? homeAtCurrentLeg.slice() : scatteredSeed();
if (keepEntry)          { uAssemble.value = 1; entryRef.current = 1; }
else if (preserveState) { uAssemble.value = entryRef.current; }   // carry progress
else                    { /* fresh build: full reset */ }
```
**Prevention**: any "skip the entrance" flag must be derived from the animation's own
clock, never from a lifecycle flag that merely correlates with it. Verify with the dev
handle at scroll 0 — the entry uniform must still read 0.

## Convention: image→particle sampling, background isolation is polarity-dependent

`sampleImagePoints` isolates the subject from the backdrop, and the correct test
depends on the source:

| Source | Backdrop | Isolate with |
|---|---|---|
| Environmental photo (dark surround) | dark | `lumFloor` (drop below) |
| Studio headshot (white seamless) | bright + neutral | `lumCeil` + `neutralSat` (drop bright AND low-chroma), with `lumFloor` near 0 |

Applying the dark-surround profile to a white-backdrop headshot is exactly backwards:
it keeps the wall and the white shirt while starving the hair, beard, brows and
glasses — the features that make a face legible — producing a bright formless blob.
Headshots also want a flatter `lumGamma` (~0.6) so lit skin does not starve dark
features, and a wide gentle `radialFalloff`, since the crop already isolates the face.

Tune the ceiling against the actual photos: below ~0.8 it starts eating a bald lit
scalp, which is bright and near-neutral and therefore indistinguishable from wall by
this test alone.

Prefer real `-headshot` assets over fallback crops: `loadFounder()` already prefers
`/founders/<slug>-headshot.{webp,jpg,png}` and passes `crop: undefined` for them. The
hardcoded `DEFAULT_FALLBACK_CROPS` are a last resort and were measurably wrong.

## Convention: scroll-jack engage predicates are ORDER-sensitive

A gate that offers both "crossed the top edge" and "reloaded already inside" arms must
ensure the edge-crossing arm can actually win. On a continuous scroll down, `top`
satisfies a `top <= 0.5·ih` inside-test many frames **before** `prevTop > 0 && top <= 0`
can ever be true, so an `if (fromTop || fromBottom) … else if (inside)` chain fires the
inside arm first and snaps the page half a viewport.

Time-box the reload-landed-inside arm (`now < effectSetupTime + ~600ms`) rather than
latching it on first use: the window still covers browser scroll restoration applied a
few frames after mount, but a scroll-in seconds later can only engage via the top-edge
crossings, where the snap distance is ~0px by construction.

Related: hold the pin with a drift **threshold** plus release, not an unconditional
per-frame re-snap — the latter fights any native scroll source (scrollbar drag,
`scrollIntoView` from Tab focus) into a 60Hz jitter instead of a clean block.

## Don't: sample `matchMedia` once at mount for a mode that changes layout

`const mobile = matchMedia("(max-width: 768px)").matches` inside a mount-only effect
never re-evaluates. A desktop window snapped narrow, devtools docked to the side, or an
OS reduced-motion toggle then keeps the pinned/desktop path with measurements that no
longer apply. Subscribe with one shared `change` handler across the query list and
remove it in cleanup (canonical shape: `case-studies-rail.tsx`).

Where the mode flip changes document height (a px-measured runway being set or
cleared), add a mode-flip-only `ScrollTrigger.refresh()` guarded by a `prevModeRef` —
an OS reduced-motion toggle fires no resize event, so nothing else re-measures.

> **Warning**: an effect whose deps include `isEn` (language) re-runs on every language
> toggle, so its cleanup runs mid-session — not only on unmount. Clearing an inline
> px height there collapses a multi-viewport runway under the reader and ejects them
> from the section. Only clear inline sizing in a cleanup that genuinely corresponds to
> the node going away.

## Convention: measurement freshness

SectionBus owns ALL `[data-line-anchor]` measurement. It re-measures on: route mount,
700/1600ms passes, `document.fonts.ready`, debounced window resize, a debounced
`ResizeObserver` on `document.body` (accordions, language swaps, post-mount px-height
asserts), and the `"sersan:remeasure"` CustomEvent (dispatched by language-provider).
`setMeasured` carries the pathname (`measuredPath`) and never short-circuits a path
change; consumers hold their last good geometry while `measuredPath !== pathname`.

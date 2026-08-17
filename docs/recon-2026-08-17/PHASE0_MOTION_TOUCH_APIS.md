# MOTION ON TOUCH — Allowed APIs (ground truth = installed node_modules)

Repo: `C:/Users/alber/Sersan` (Next 16.2.6, React 19.2.4, Tailwind 4.3.1)
Verified 2026-08-17 by reading the shipped `.d.ts` / `.mjs` / `.js` / README in `node_modules` — not memory.

| Package | Installed | Proof |
|---|---|---|
| `lenis` | **1.3.23** | `node_modules/lenis/package.json` |
| `gsap` | **3.15.0** | `node_modules/gsap/package.json` |
| `@gsap/react` | **2.1.2** | `node_modules/@gsap/react/package.json` |
| `tailwindcss` | **4.3.1** | `node_modules/tailwindcss/package.json` |

All paths below are relative to `C:/Users/alber/Sersan/node_modules/` unless they start with `src/`.

---

## 1. Lenis 1.3.23

### 1.1 Constructor / `LenisOptions` (exact names + defaults)
Source of truth: `lenis/dist/lenis.d.ts` L132–259 (types + JSDoc defaults) and the constructor default-args in `lenis/dist/lenis.mjs` L428.

```ts
import Lenis from "lenis";               // default export (lenis.d.ts L501)
import type { LenisOptions, ScrollToOptions, ScrollCallback, VirtualScrollCallback, VirtualScrollData, Scrolling } from "lenis";
new Lenis(options?: LenisOptions)
```

Touch / motion-relevant options (all optional):

| Option | Type | Default (mjs L428) | What the shipped code actually does |
|---|---|---|---|
| `smoothWheel` | `boolean` | `true` | If a `wheel` event arrives and `smoothWheel` is false, Lenis sets `isScrolling = "native"`, stops its animation and lets the browser scroll (`lenis.mjs` L588–593). |
| `syncTouch` | `boolean` | `false` | If false, **touch events are never smoothed** — same native branch as above (L588). If true: on `touchstart` with zero delta Lenis calls `reset()` (kills inertia, L570–573); on `touchmove` it scrolls with `lerp: 1` (i.e. 1:1 finger tracking, L604); on `touchend` it synthesises inertia with `lerp: syncTouchLerp` (L600–605). Also sets `window.lenis.touch = true` (L433). README L203: "Mimic touch device scroll while allowing scroll sync (can be unstable on iOS<16)". README Limitations L352: "touch events may behave unexpectedly when `syncTouch` is enabled on iOS < 16". |
| `syncTouchLerp` | `number` | `0.075` | Lerp used only for the post-`touchend` inertia tail (L604). |
| `touchInertiaExponent` | `number` | `1.7` | On `touchend`: `delta = sign(delta) * |velocity| ** touchInertiaExponent` (L601). (README calls it "Manage the strength of syncTouch inertia".) |
| `touchMultiplier` | `number` | `1` | Applied in `VirtualScroll.onTouchMove`: `deltaY = -(clientY - touchStart.y) * touchMultiplier` (L328–329). |
| `wheelMultiplier` | `number` | `1` | Applied to wheel deltas after deltaMode normalisation (L356–357). |
| `lerp` | `number` | `0.1` | Wheel smoothing lerp; **ignored when `duration` is set** (README L196; `Animate.advance` uses easing when `duration` present, `lenis.mjs` L85–86). |
| `duration` | `number` (s) | `undefined` | If a number and no `easing`, `easing = defaultEasing` (L435). "Useless if lerp defined" (README L191). |
| `easing` | `(t)=>number` | `t => Math.min(1, 1.001 - 2 ** (-10*t))` | If an easing is given without `duration`, `duration = 1` (L436). |
| `autoRaf` | `boolean` | `false` | If true Lenis calls `requestAnimationFrame(this.raf)` itself (L480, L697). If false **you must** call `lenis.raf(timeMs)` every frame (README L109–122, L362). |
| `prevent` | `(node: HTMLElement) => boolean` | `undefined` | Checked against every node in `event.composedPath()` up to the root; returning true lets that gesture scroll natively (L578–583). Same mechanism as `data-lenis-prevent`, `data-lenis-prevent-touch`, `data-lenis-prevent-wheel`, `-vertical`, `-horizontal` (README L298–304). |
| `virtualScroll` | `(data: VirtualScrollData) => boolean` | `undefined` | Runs BEFORE anything else in `onVirtualScroll`; returning `false` drops the event entirely (not even the `virtual-scroll` emit) (L557). Can mutate `data.deltaX/deltaY` (README L207 example `(e) => { e.deltaY /= 2 }`). |
| `eventsTarget` | `Window\|HTMLElement\|Element` | `wrapper` | Element that gets the `wheel`/`touchstart`/`touchmove`/`touchend` listeners, all registered `{ passive: false }` (L255, L283–286). |
| `gestureOrientation` | `'vertical'\|'horizontal'\|'both'` | `'vertical'` (`'both'` if `orientation:'horizontal'`) | |
| `allowNestedScroll` | `boolean` | `false` | Auto-detects nested scrollers per event; README warns of perf cost (L185, L288). |
| `overscroll` | `boolean` | `true` | Only meaningful for nested (non-window) wrappers (L597). |
| `anchors` | `boolean\|ScrollToOptions` | `false` | Adds a `click` listener on wrapper (L468). |
| `stopInertiaOnNavigate` | `boolean` | `false` | Calls `reset()` on internal same-host link clicks (L546–551). |
| `autoToggle` | `boolean` | `false` | Requires the shipped CSS (`transition-behavior: allow-discrete`), Safari > 17.3 / Chrome > 116 / Firefox > 128 (README L189). |
| `autoResize` | `boolean` | `true` | ResizeObserver on wrapper+content (README L188). |
| `naiveDimensions` | `boolean` | `false` | Uses `scrollHeight - clientHeight` instead of ResizeObserver dims (L918–922). |
| `__experimental__naiveDimensions` | | | **@deprecated** — "use `naiveDimensions` instead" (`lenis.d.ts` L246–248). |

`VirtualScrollData = { deltaX: number; deltaY: number; event: WheelEvent | TouchEvent }` (`lenis.d.ts` L71–75).

Touch input details from `VirtualScroll` (`lenis.mjs` L261–370):
- `touchstart` emits `{deltaX:0, deltaY:0}`; `touchend` re-emits the LAST `touchmove` delta (that is what seeds `velocity` for inertia).
- Lenis skips a gesture entirely if `event.ctrlKey` (pinch-zoom on trackpads) — but the `virtual-scroll` event **is emitted before** that bail (L559–564). The repo's `scroll-snap.ts` already handles this (see §4).
- `lenis.isTouching` (`boolean | undefined`) is set on every touch event: true for `touchstart`/`touchmove` (L568). Public field, `lenis.d.ts` L284.

### 1.2 Instance API used for touch/motion
`lenis.d.ts` L274–499:
- `raf(time: number): void` — ms clock (L412).
- `scrollTo(target: number | string | HTMLElement, opts?: ScrollToOptions)` — `ScrollToOptions = { offset, immediate, lock, duration, easing, lerp, onStart, onComplete, force, programmatic, userData }` (L79–131). Note `programmatic` defaults to `true` for external callers; that makes `lerp/duration/easing` default to the instance options (mjs L719).
- `on('scroll', cb) / on('virtual-scroll', cb)` → **returns unsubscribe** (L371–372); `off(...)` also exists.
- `start()`, `stop()`, `resize()`, `destroy()`.
- Getters: `scroll`, `progress`, `limit`, `actualScroll`, `isScrolling: boolean|'native'|'smooth'`, `isStopped`, `isLocked`, `isSmooth`, `isHorizontal`, `rootElement`, `className`. Fields: `velocity`, `lastVelocity`, `direction: 1|-1|0`, `targetScroll`, `animatedScroll`, `time`, `isTouching`, `options`, `dimensions`.
- Class names Lenis manages on the root element (`lenis.mjs` L994–1002): `lenis`, `lenis-autoToggle`, `lenis-stopped`, `lenis-locked`, `lenis-scrolling`, `lenis-smooth` (only while `isScrolling === "smooth"`).

### 1.3 Shipped CSS
`lenis/dist/lenis.css` (importable as `import 'lenis/dist/lenis.css'`, README L128):
```css
html.lenis, html.lenis body { height: auto; }
.lenis:not(.lenis-autoToggle).lenis-stopped { overflow: clip; }
.lenis [data-lenis-prevent], .lenis [data-lenis-prevent-wheel], .lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical], .lenis [data-lenis-prevent-horizontal] { overscroll-behavior: contain; }
.lenis.lenis-smooth iframe { pointer-events: none; }
.lenis.lenis-autoToggle { transition-property: overflow; transition-duration: 1ms; transition-behavior: allow-discrete; }
```
The repo does NOT import this file; it inlines its own version in `src/app/globals.css` L276–293 (adds `scroll-behavior: auto !important` on `html.lenis` / `.lenis.lenis-smooth`, `overflow: hidden` on `.lenis-stopped`).

### 1.4 What the shipped docs say about iOS / touch
- README Settings L203 (`syncTouch`): "can be unstable on iOS<16".
- README Limitations L349–352: capped to 60fps on Safari and 30fps in low-power mode; smooth scroll stops over iframes; `position: fixed` lags on pre-M1 macOS Safari; "touch events may behave unexpectedly when `syncTouch` is enabled on iOS < 16".
- README L195: `infinite` requires `syncTouch: true` on touch devices.
- README L141–158 (copy-ready): GSAP ScrollTrigger integration = `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker.add(t => lenis.raf(t * 1000))` + `gsap.ticker.lagSmoothing(0)`.
- Nothing in the shipped docs mentions `dvh/svh`, address-bar resize, or `normalizeScroll`.

### 1.5 `lenis/snap` (available, not currently used by the repo)
`lenis/dist/lenis-snap.d.ts`: `new Snap(lenis, { type?: 'mandatory'|'proximity'|'lock', lerp?, easing?, duration?, distanceThreshold?: number | \`${n}%\` (default '50%'), debounce?: number (500), onSnapStart?, onSnapComplete? })`; methods `add(value)`, `addElement(el, { align?, ignoreSticky?, ignoreTransform? })`, `addElements`, `previous()`, `next()`, `goTo(i)`, `start()`, `stop()`, `resize()`, `destroy()`. The repo deliberately replaced this with its own engine (`src/lib/scroll-snap.ts`, header comment L1–41).

### 1.6 `lenis/react` (available, not used)
`lenis/dist/lenis-react.d.ts`: `<ReactLenis root options={LenisOptions}>`; `useLenis(callback?, deps?, priority?)`. Prop `autoRaf` on the component is **@deprecated** — "use options.autoRaf instead" (L21–26).

---

## 2. GSAP 3.15.0

### 2.1 `gsap.matchMedia()` — signature, conditions object, revert
Types: `gsap/types/gsap-core.d.ts` L29, L52–74, L450, L462. Implementation: `gsap/gsap-core.js` L3839–4109, L4263–4270.

```ts
gsap.matchMedia(scope?: Element | string | object): gsap.MatchMedia
interface MatchMedia {
  contexts: Context[];
  add(conditions: string | object, func: ContextFunc, scope?: Element | string | object): MatchMedia;
  revert(config?: object): void;
  kill(revert?: boolean): void;
}
type ContextFunc = (context: Context, contextSafe?: ContextSafeFunc) => Function | any | void;
interface Context { conditions?: Conditions; queries?: object; isReverted: boolean; selector?: Function;
                    add(...); ignore(func); kill(revert?); revert(config?); clear(); }
interface Conditions { [key: string]: boolean }      // gsap-core.d.ts L52–54
gsap.matchMediaRefresh(): void                       // "reverts all active MatchMedia objects then re-runs any that match" (L453–462)
```
Facts proven in `gsap-core.js`:
- `add(conditions, func)`: a **string** is wrapped as `{ matches: conditions }` (L4055–4057). An **object** is `{ anyKeyYouLike: "<media query string>" }`; each value goes through `window.matchMedia(...)` (L4073) and each key becomes a boolean in `context.conditions` (L4077). **`isDesktop` / `isMobile` / `reduceMotion` are NOT reserved names** — they are just the conventional keys from gsap.com docs. The only reserved key is `"all"` (always active, L4070–4071).
- The func runs immediately if any condition matches (L4083); on any media-query `change` (`_onMediaChange`, L3849–3892) GSAP **reverts** the context (`c.revert()`, L3876) then re-runs `onMatch` if any still match. So a breakpoint flip = full teardown + rebuild — including nested ScrollTriggers (`Context.kill(revert)` calls `t.scrollTrigger.revert()` on timelines, L4002).
- A function returned from the func is stored as a cleanup and called on revert with `(revert, context)` (L3929, L4010–4012).
- `mm.revert()` = `kill({})` = revert every context AND remove it from `_media` (L4098–4106, L4024–4031).
- ScrollTrigger hooks `gsap.addEventListener("matchMedia", () => _refreshAll(0, 1))` — every matchMedia change triggers a ScrollTrigger refresh (`ScrollTrigger.js` L2065–2069) and ScrollTrigger itself registers `(orientation: portrait)` to re-base its mobile-resize guard (L2070–2074).

Copy-ready (repo already uses this idiom — `src/components/sections/cinematic-system-scroll.tsx` L979–985; `src/components/sections/singularity-passage.tsx` L521; `src/components/sections/compliance-pipeline.tsx` L305):
```ts
const mm = gsap.matchMedia();
mm.add(
  { isDesktop: "(min-width: 1024px)", isMobile: "(max-width: 1023.98px)", reduceMotion: "(prefers-reduced-motion: reduce)" },
  (ctx) => {
    const { isDesktop, isMobile, reduceMotion } = ctx.conditions as Record<"isDesktop"|"isMobile"|"reduceMotion", boolean>;
    // build ScrollTriggers/tweens here; they auto-revert on breakpoint change
    return () => { /* optional extra cleanup */ };
  },
);
return () => mm.revert();   // inside useGSAP the context handles this; explicit revert also fine
```
Repo MQ constants already in use: `COMPACT_MQ = "(max-width: 768px), (pointer: coarse)"`, `MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)"` (`cinematic-system-scroll.tsx` L91–92); `DESKTOP_MQ = "(min-width: 1024px)"`, `FINE_MQ = "(pointer: fine)"` (`singularity-passage.tsx` L277–279).

### 2.2 `ScrollTrigger` statics relevant to touch
Types: `gsap/types/scroll-trigger.d.ts`. Source: `gsap/ScrollTrigger.js`.

| API | Signature (d.ts line) | Behaviour proven in ScrollTrigger.js |
|---|---|---|
| `ScrollTrigger.isTouch` | `static readonly isTouch: number` (L11) | `= Observer.isTouch`: `0` no touch, `1` touch-ONLY (`matchMedia("(hover: none), (pointer: coarse)").matches`), `2` hybrid (`ontouchstart`/`maxTouchPoints > 0`) — `Observer.js` L227–229, `ScrollTrigger.js` L2033–2035. |
| `ScrollTrigger.config(vars)` | `config(vars: { limitCallbacks?, syncInterval?, autoRefreshEvents?: string, ignoreMobileResize?: boolean })` (L114, L795–800) | `ignoreMobileResize` **defaults to `true` on touch-only devices** (`_ignoreMobileResize = Observer.isTouch === 1`, L2038); `config` re-applies it as `ScrollTrigger.isTouch === 1 && vars.ignoreMobileResize` (L2175) — so it is a no-op on hybrid/desktop. Effect (`_onResize`, L395–398): the internal `resize` listener skips the refresh unless width changed OR `|innerHeight − base| > 25% of innerHeight`; base is re-taken on `(orientation: portrait)` flips (L2070–2074). `autoRefreshEvents` default list = `visibilitychange, DOMContentLoaded, load, resize` (L2136–2146); passing a string without `resize` sets `_ignoreResize` (L2179). Refresh from resize is debounced 0.2s (`gsap.delayedCall(0.2, _refreshAll)`, L2135). |
| `ScrollTrigger.normalizeScroll(...)` | `normalizeScroll(enable?: boolean \| NormalizeVars \| Observer): Observer \| undefined`; no-arg getter (L316, L329); `NormalizeVars extends Observer.ObserverVars { momentum?, content?, allowNestedScroll? }` (L812–816) | d.ts L305: "Forces scrolling to be done on the JavaScript thread, ensuring it is synchronized and the address bar doesn't show/hide on [most] mobile devices." Creates an `Observer` with `preventDefault = isNormalizer = allowClicks = true`, `type = "wheel,touch"`, momentum default 2.8 (L2423–2447). Applies iOS clientX/Y bug workaround (`_fixIOSBug`, L2036) and clamps min scroll to 1px on iOS (L2461). `normalizeScroll(false)` kills it; `true` re-enables an existing one (L2663–2681). **When active, ScrollTrigger measures viewport height as `innerHeight` instead of the 100vh div** (L469). |
| `ScrollTrigger.refresh(safe?)` | (L378) | `refresh()` → `_refreshAll(true)` immediately; `refresh(true)` → `_onResize(true)` = the debounced 0.2s path (L2256–2258). Non-forced `_refreshAll` during an active scroll defers to `scrollEnd` (`_softRefresh`, L484–487). Every refresh re-measures the 100vh probe (`_refresh100vh`, L489) and fires `refreshInit` BEFORE measuring (L495) — the repo hooks that event to re-assert svh runway heights (`cinematic-system-scroll.tsx` L997). |
| `ScrollTrigger.sort(func?)` | `sort(func?: Function): ScrollTrigger[]` (L470) | Sorts by `refreshPriority` then start (`_sortY = scroll + trigger.getBoundingClientRect().top`) (L2646–2655). Called automatically inside `_refreshAll` when `_sort` is set (L496). |
| `ScrollTrigger.update()` | (L482) | Bumps scroller cache and runs `_updateAll` — the call to make from `lenis.on('scroll', ...)`. |
| `ScrollTrigger.scrollerProxy(scroller, vars)` | `vars: { scrollTop?, scrollLeft?, scrollWidth?, scrollHeight?, fixedMarkers?, getBoundingClientRect?, pinType?: "fixed"\|"transform", content? }` (L439, L802–811) | Repo registers one on `document.documentElement` (`smooth-scroll-provider.tsx` L72–89). No unregister API (proxy list `_proxies` is append-only). |
| `ScrollTrigger.observe(vars)` | `(vars: Observer.ObserverVars): Observer` (L347) | Thin wrapper over `new Observer(vars)`. |
| `ScrollTrigger.addEventListener` | events `"scrollStart" \| "scrollEnd" \| "refreshInit" \| "refresh" \| "matchMedia" \| "revert"` (L46) | |
| `ScrollTrigger.clearScrollMemory(scrollRestoration?)`, `ScrollTrigger.saveStyles(targets)`, `ScrollTrigger.batch`, `ScrollTrigger.getAll`, `ScrollTrigger.killAll(allowListeners?)`, `ScrollTrigger.maxScroll(target, horizontal?)`, `ScrollTrigger.positionInViewport`, `ScrollTrigger.snapDirectional` | L97, L416, L69, L165, L268, L302, L364, L456 | |

Per-trigger `Vars` relevant here (L724–762): `pin`, `pinType?: "fixed" | "transform"`, `pinSpacing?: boolean | string`, `pinReparent?: boolean`, `pinSpacer`, `pinnedContainer`, `anticipatePin?: number`, `fastScrollEnd`, `preventOverlaps`, `invalidateOnRefresh`, `refreshPriority`, `scrub`, `snap` (`SnapVars { delay, duration, inertia, ease, snapTo, directional, onInterrupt, onStart, onComplete }` L707–717), `onRefreshInit`, `onRefresh`, `once`, `toggleActions`, `containerAnimation`, `end`/`endTrigger`, `start`.

### 2.3 Pin on touch: `pinType: "transform"` vs `"fixed"` (proof)
`ScrollTrigger.js` L971:
```js
useFixedPosition = ("pinType" in vars ? vars.pinType : _getProxyProp(scroller, "pinType") || isViewport && "fixed") === "fixed"
```
- Default for a window/viewport scroller = `"fixed"`; default for a nested scroller (or a scrollerProxy that declares `pinType: "transform"`) = transform-based (`pinSetter(pinStart + pinChange * clipped)` each update, L1722–1723).
- Fixed branch (L1503–1520): sets `position: fixed; top/left/width/maxWidth/height/maxHeight/margin:0/padding` on the pinned element and copies state; when `pinReparent` it moves the element to `<body>` (L1727–1735).
- The repo's proxy on `document.documentElement` (`smooth-scroll-provider.tsx` L72) does **not** set `pinType`, so pins default to `"fixed"`. That is correct because Lenis 1.3 scrolls the real window (`window.scrollTo`, `lenis.mjs` L525–532) — no transform wrapper. Only switch to `"transform"` if the scroller is itself transformed (that is the d.ts example, L422–430: `pinType: el.style.transform ? "transform" : "fixed"`).
- On iOS the classic reason to prefer `pinType: "transform"` is jitter of `position: fixed` during momentum/address-bar animation; the shipped code has no comment on that — treat as external (gsap.com docs) knowledge, unproven here. The repo currently avoids `pin` on the compact spine and uses CSS `position: sticky` (`cinematic-system-scroll.tsx` L1004–1006, "No pin: the inner stage is CSS `position: sticky`").

### 2.4 Mobile address-bar caveats baked into ScrollTrigger (proof)
- L2024–2027: `_div100vh = document.createElement("div"); _div100vh.style.height = "100vh"; position: absolute` with the comment: "to solve mobile browser address bar show/hide resizing, we shouldn't rely on window.innerHeight. Instead, use a `<div>` with its height set to 100vh and measure that since that's what the scrolling is based on anyway and it's not affected by address bar showing/hiding."
- L469: `_100vh = !_normalizer && _div100vh.offsetHeight || _win.innerHeight;` — measured on every refresh.
- L86–93 / L98–106: `_getViewportDimension("Height")` and `_winOffsets.height` return `_100vh`. **Consequence: `start:"top top"`, `end:"bottom bottom"`, `"top 80%"` etc. on the window scroller resolve against the LARGE viewport (100vh) on phones, not `innerHeight` / svh** — a runway sized in `svh` will be `(lvh − svh)` shorter than what ScrollTrigger considers one viewport. Repo files already reason about this gap (`singularity-passage.tsx` L2170–2171).
- L2036: `_fixIOSBug = Observer.isTouch && /(iPad|iPhone|iPod|Mac)/.test(UA)` — "since 2017, iOS has had a bug that causes event.clientX/Y to be inaccurate when a scroll occurs, thus we must alternate ignoring every other touchmove event" (used inside normalizeScroll).
- L917: on touch devices a `touchmove` on the scroller kills any in-flight ScrollTrigger snap tween (same as wheel).
- L2136–2146: `visibilitychange` triggers `_onResize()` only when width/height changed while hidden.

### 2.5 Deprecated / avoid (with proof)
- `ScrollTrigger.matchMedia(vars)` — `@deprecated` "in favor of gsap.matchMedia() in version 3.11.0+" (`scroll-trigger.d.ts` L271–286). Now a shim over `gsap.matchMedia()` (`ScrollTrigger.js` L2043–2050).
- `ScrollTrigger.clearMatchMedia(name?)` — only for the deprecated API (d.ts L72–83).
- `gsap.plugins.ScrollTrigger*` type aliases — `@deprecated since 3.7.0` (d.ts L821–882).
- Lenis `__experimental__naiveDimensions` → `naiveDimensions` (`lenis.d.ts` L246–248).
- `lenis/react` `<ReactLenis autoRaf>` prop → `options.autoRaf` (`lenis-react.d.ts` L21–26).
- ScrollTrigger `ScrollerProxyVars` example in d.ts uses `locoScroll` (Locomotive) — pattern only; Lenis 1.3 needs `scrollTop` getter/setter as the repo does.

---

## 3. `@gsap/react` 2.1.2 — `useGSAP`
Types: `@gsap/react/types/index.d.ts`. Source: `@gsap/react/src/index.js`.
```ts
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);           // README "Install"; useGSAP.register(core) / useGSAP.headless = true (src L52–53)
useGSAP(func?: ContextFunc | useGSAPConfig, dependencies?: unknown[] | useGSAPConfig): { context: gsap.Context; contextSafe: <T extends Function>(f: T) => T }
interface useGSAPConfig { scope?: ReactRef | Element | string; dependencies?: unknown[]; revertOnUpdate?: boolean }
type ContextFunc = (context: gsap.Context, contextSafe?: ContextSafeFunc) => Function | any | void;
```
Behaviour (src L18–50): uses `useLayoutEffect` when `document` exists else `useEffect`; creates ONE `gsap.context(() => {}, scope)` per hook instance; runs `context.add(callback, scope)` in the effect; cleanup = `context.revert()` on unmount, or on every dependency change when `revertOnUpdate: true`; with deps and no `revertOnUpdate`, cleanup is deferred to unmount. Anything created inside (tweens, ScrollTriggers, `gsap.matchMedia()` — `MatchMedia` constructor pushes itself into the enclosing context, `gsap-core.js` L4049) is auto-reverted. Repo call sites: `src/app/template.tsx` L86, `src/components/navbar.tsx` L278/L797, `src/components/footer.tsx` L139, `src/components/sections/*.tsx`, `src/components/ui/magnetic.tsx` L57, etc.

---

## 4. Repo modules (what already exists — do not duplicate)

### `src/lib/lenis-singleton.ts` (105 lines) — exports
- `setExternalPump(on: boolean): void` — hands the RAF baton to R3F `FrameDriver` (`src/webgl/FrameDriver.tsx`) or back to the private `tick` (L37–47).
- `pumpLenis(time: number): void` — advance Lenis from the external loop; no-op unless external pumping (L50–52).
- `acquireLenis(): Lenis` — refcounted create; config = `{ duration: 0.9, easing: out-expo, smoothWheel: true }` — **`syncTouch` intentionally OFF**, with a 3-point rationale in comments L61–82 (iOS momentum fight / ScrollTrigger is position-based so native touch resolves identically / keeps touch on the compositor). "Do not 'fix' this by adding syncTouch."
- `releaseLenis(): void` — refcount decrement, `destroy()` at 0 (L93–101).
- `getLenis(): Lenis | null` (L103–105).

### `src/lib/scroll-snap.ts` (307 lines) — exports
- `type SnapAlign = "start" | "center" | "end"` (L44).
- `attachSnap(instance: Lenis): void` — subscribes to Lenis `virtual-scroll` + `keydown` PageUp/PageDown; dev-only `window.__sersanSnap` (L234–264).
- `detachSnap(): void` (L266–275).
- `snapElement(el: HTMLElement, align?: SnapAlign): () => void` (L278–282).
- `snapPoint(get: () => number): () => void` (L285–288).
- `snapBarrier(get: () => number): () => void` (L291–294).
- `suspendSnap(): () => void` — refcounted, idempotent release (L298–307).
- Touch policy inside: `onVirtualScroll` returns early when `event.type.startsWith("touch")`, when `ctrlKey`, when `deltaY === 0`, and when `isStackedViewport()` (`(max-width: 767px)`) (L182–201). Constants: `CAPTURE_FRAC 0.42`, `DEBOUNCE_MS 420`, `RETRY_MS 240`, `MAX_RETRIES 8`, `MIN_DELTA_PX 4`.

### `src/components/smooth-scroll-provider.tsx` (328 lines) — exports
- `SmoothScrollProvider({ children })` (default-less named export, L30). Inside:
  - live `prefers-reduced-motion` state → native scroll path with `window.scroll` listener feeding `useScrollStore.setScroll` + `ScrollTrigger.update()`; refresh on toggle (L39–48, L162–179).
  - one-time `ScrollTrigger.config({ ignoreMobileResize: true })` + `ScrollTrigger.scrollerProxy(document.documentElement, { scrollTop(v){ lenis.scrollTo(v,{immediate:true}) … return window.scrollY }, getBoundingClientRect(){ …innerWidth/innerHeight } })` (L55–90); explicit note "normalizeScroll() is deliberately NOT enabled — it takes over touch scrolling and fights Lenis / the scrollerProxy" (L69–70).
  - route-change effect: `suspendSnap()` for 900 ms, `scrollTo(0,{immediate:true})`, textMorph store reset on entering `/`, `ScrollTrigger.refresh()` on rAF + 450 ms for inner routes (L107–152).
  - Lenis effect: `acquireLenis()`, `window.__lenis`, `attachSnap`, gate-hold via `useTextMorphStore` / `useFoundersMorphStore`, `lenis.on("scroll", l => { ScrollTrigger.update(); setScroll(l.progress, l.velocity) })`, anchor-click hijack with `offset: -72`, **D-9 resize bridge**: skip refresh when `(pointer: coarse)` AND width unchanged AND `|Δh| <= 25%` (mirrors GSAP `_onResize`), 150 ms debounce; `orientationchange` re-bases + 250 ms refresh (L181–316).
  - unmount: `ScrollTrigger.getAll().forEach(st => st.kill())` (L321–325).

---

## 5. CSS viewport units — dvh / svh / lvh, and 100vh on iOS
No package in `node_modules` documents CSS units; what IS provable locally:
- **Tailwind 4.3.1 ships the utilities**: `h-screen` = `100vh`, `h-svh` = `100svh`, `h-lvh` = `100lvh`, `h-dvh` = `100dvh` (also `min-h-*` and `max-h-*` variants) — `tailwindcss/dist/lib.js` (`screen:"100vh",svh:"100svh",lvh:"100lvh",dvh:"100dvh"` in `height`, `minHeight`, `maxHeight` theme maps).
- **Repo convention already fixed**: runways and sticky stages on the compact tier are measured in `svh`, never `vh` — with the reasoning "vh is the LARGE viewport (mobile address bar hidden), so a vh runway is taller than the visible screen while the bar is up and the frame jumps the moment the bar collapses" (`cinematic-system-scroll.tsx` L277–284, L988–1037; `singularity-passage.tsx` L188, L611–628, L2054–2059, L2170–2171; `audit-week-timeline.tsx` L466–474). Menu panel uses `max-height` in `svh` minus safe-area insets, with a `vh` fallback line for engines without `svh` (`src/app/globals.css` L1094–1106).
- Background knowledge (NOT from node_modules — flag as unverified here): `svh/lvh/dvh` are CSS Values 4 units; shipped Safari 15.4, Chrome 108, Firefox 101. On iOS Safari `100vh` == `100lvh` (bar retracted), so `100vh` content overflows by the browser-chrome height while the bar is shown; `dvh` tracks the live viewport but re-layouts continuously during the bar animation (jank for sticky/pinned scenes), so `svh` is the stable choice for pinned runways and `dvh` only for full-bleed but non-scrubbed surfaces. This matches ScrollTrigger's own choice to measure a `100vh` probe (§2.4) — meaning ScrollTrigger's "viewport" = lvh, and the repo's svh runways are deliberately shorter than that.

---

## 6. Copy-ready example locations
| Need | Where |
|---|---|
| Lenis + GSAP ticker/ScrollTrigger wiring | `lenis/README.md` L141–158 |
| Lenis custom raf loop | `lenis/README.md` L109–122 |
| Lenis prevent / nested scroll / anchors | `lenis/README.md` L278–342 |
| Lenis `scrollTo` full options | `lenis/dist/lenis.d.ts` L419–447 (JSDoc example) |
| `lenis/snap` usage | `lenis/dist/lenis-snap.d.ts` L108–130 (JSDoc example) |
| `gsap.matchMedia` conditions object in this repo | `src/components/sections/cinematic-system-scroll.tsx` L979–1010 |
| `gsap.matchMedia` breakpoint-scoped rebuild | `src/components/sections/compliance-pipeline.tsx` L296–320 |
| `useGSAP` config-object / contextSafe | `@gsap/react/README.md` (whole file), repo `src/components/navbar.tsx` L278 |
| `ScrollTrigger.config` / `scrollerProxy` with Lenis | `src/components/smooth-scroll-provider.tsx` L55–90 |
| Mobile-safe resize → refresh bridge | `src/components/smooth-scroll-provider.tsx` L245–295 |
| `refreshInit` re-assert svh runway height | `src/components/sections/cinematic-system-scroll.tsx` L988–998 |
| ScrollTrigger `scrollerProxy` d.ts example (`pinType` decision) | `gsap/types/scroll-trigger.d.ts` L422–430 |
| Observer options for `normalizeScroll` | `gsap/types/Observer.d.ts` `interface ObserverVars` |

---

## 7. Gaps / things NOT provable from node_modules
1. **No shipped Lenis doc on iOS ≥16 behaviour of `syncTouch`** beyond "unstable on iOS<16" — whether it fights native momentum on current iOS is only stated in the repo's own comment (`lenis-singleton.ts` L61–82). Verify on-device before changing.
2. **`pinType: "transform"` for iOS jitter** — commonly recommended on gsap.com forums, but no comment/proof in `ScrollTrigger.js`; treat as external advice.
3. **`normalizeScroll` + Lenis co-existence** — no shipped statement; the repo asserts they fight (`smooth-scroll-provider.tsx` L69–70). Both preventDefault touch and set the scroll position on the main thread, so the conflict is structurally plausible but unproven here.
4. **CSS unit support tables** (dvh/svh/lvh) — from memory, not from any local file; confirm with caniuse when it matters.
5. **Lenis and `scrollend`** — Lenis dispatches a synthetic `scrollend` CustomEvent after its own animations (`lenis.mjs` L500–512, L778–780, L809–811); ScrollTrigger does not listen for it. Not a gap in this repo, but note the two libraries do not share this signal.
6. **`gsap.matchMedia` reduced-motion**: `reduceMotion` is just a user-named key (see §2.1) — there is no built-in `prefers-reduced-motion` handling in gsap 3.15 core; the repo layers its own live listener in `SmoothScrollProvider` (L39–48) and `MOTION_OK_MQ` inside matchMedia blocks.
7. `ScrollTrigger.config({ ignoreMobileResize })` is **inert on hybrid devices** (`isTouch === 2`, e.g. touch laptops, iPad with trackpad reported as hover-capable) — the repo's own bridge uses `(pointer: coarse)` instead, which can disagree with `Observer.isTouch === 1` (`(hover: none), (pointer: coarse)`); document the intended device matrix before relying on either alone.

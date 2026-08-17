# lusion.co — reverse-engineering dossier (preloader + mobile strategy)

Date: 2026-08-17. Method: static analysis of the live production HTML/CSS/JS downloaded with curl (desktop UA and iPhone UA), plus HEAD/GET size probes against the asset CDN. No live browser session was used; everything below is read from code. Offsets are byte offsets inside `assets/hoisted.CUO_IjfL.js` (1,251,728 bytes, single minified module) unless stated otherwise.

Local files:
- `recon/lusion/index.html` (desktop UA, 58,598 B) — `index-mobile.html` (iPhone UA) is **byte-identical** (`diff -q` → IDENTICAL). No server-side UA sniffing. Served by **Netlify** (`Server: Netlify`, `Cache-Status: "Netlify Edge"`), not Vercel.
- `recon/lusion/assets/hoisted.CUO_IjfL.js` — the whole app (three.js r158 + custom engine + pages) in ONE Astro "hoisted" module. Wire size ≈ 305 KB brotli / 323 KB gzip. **No dynamic `import()` at all** (grep `import("` → 0 hits), no chunk manifest.
- `recon/lusion/assets/about.CNa9RfUh.css` — the only stylesheet (90 KB raw / 14 KB br).
- `recon/lusion/asset-sizes.txt` — measured Content-Length / wire sizes of CDN assets.
- `recon/lusion/ctx.py` — helper: `python ctx.py <file> <regex> [ctxChars] [maxHits]` prints matches with byte offsets.

---

## 1. Stack (verified in code)

| Layer | Finding | Evidence |
|---|---|---|
| Site generator | **Astro** (static HTML, `/_astro/hoisted.*.js`, `about.*.css`) | `<script type="module" src="/_astro/hoisted.CUO_IjfL.js">` in `index.html` |
| Hosting | Netlify (HTML) + **Cloudflare-fronted CDN `https://lusion.dev`** for all 3D/texture/audio assets | `headers-desktop.txt`; `@539868 let CDN_PATH="";window.location.hostname=="lusion.co"&&(CDN_PATH="https://lusion.dev")` |
| 3D | **three.js r158**, WebGL2 preferred, WebGL1 fallback. `ColorManagement.enabled=false`. **No WebGPU** (only 5 string hits inside three's own dead branches; `navigator.gpu` 0 hits) | `@0 const REVISION="158"`; `@539042 ColorManagement.enabled=!1`; `Settings.USE_WEBGL2=!0` |
| Renderer opts | `{antialias:false, alpha:false, xrCompatible:false, powerPreference:"high-performance"}`, `premultipliedAlpha:false`; context created manually then handed to `WebGLRenderer({canvas, context})` | `@558667 webglOpts={antialias:!1,alpha:!1,xrCompatible:!1,powerPreference:"high-performance"}`; `@1236188 App.initEngine` |
| Postprocessing | **Custom** pipeline (`class Postprocessing`, `PostEffect` queue): SMAA → Bloom (FFT-convolution bloom on desktop, 5-tap separable blur bloom on mobile) → ScreenPaintDistortion (pointer fluid/“paint” FBO) → Final (vignette/saturation/contrast/tint) → optional FSR upscaler → pre/post “ufx” passes. **Not** pmndrs `postprocessing`, no `EffectComposer` (0 hits) | `@1236188…@1237951 App.initEngine`; `@1184389 class Bloom extends PostEffect` |
| Loader | **quick-loader v0.1.17** (Edan Kwan's weighted loader, `QuickLoader.VERSION="0.1.17"`) with custom item classes: `BufItem` (.buf), `EXRItem`, `TextureItem`, `ThreeLoaderItem`, `FontItem`. **No THREE.LoadingManager usage by app code** (the 4 hits are inside three.js itself), no GLTF/DRACO/KTX2/meshopt (0 hits each) | `@545xxx function QuickLoader…_p$9.VERSION="0.1.17"`; `@1236188 properties.loader.register(BufItem)…` |
| Geometry format | **`.buf` = custom binary**: `uint32 headerLen` + JSON header (`vertexCount, indexCount, attributes[{id, componentSize, storageType, needsPack, packedComponents}], meshType, sceneData`) + typed arrays; quantized attributes are de-packed to Float32 in JS. Not glTF. | `class BufItem extends XHRItem … new Uint32Array(e,0,1)[0] … JSON.parse(String.fromCharCode…)` |
| Scroll | **Custom virtual scroll** (`ScrollPane`/`ScrollManager`): `window.addEventListener("wheel", e=>e.preventDefault(), {passive:false})`, page container moved with `translate3d`, own inertia (friction 2.1→1.9), drag-scroll on touch, keyboard arrows/PageUp/Down. **No Lenis, no GSAP, no ScrollTrigger** (0 hits each). Own `Tween` class + `SecondOrderDynamics` | `@1154802 class ScrollPane`; tail of bundle `window.addEventListener("wheel",o=>o.preventDefault(),{passive:!1})` |
| Routing | Custom SPA router (`RouteManager`): `history.pushState` + `popstate`, fetches next page HTML as text via the loader, swaps `.page` DOM into `#page-container-inner`, prefetches on `mouseenter` of internal links. No barba/swup/taxi (taxi hits are unrelated substrings) | `@897392 class RouteManager` |
| Text splitting | SplitType (`SplitType(this.domHomeTitle,{types:"lines, words"})`) | `@658021 HomeHeroSection.resize` |
| Video | `@vimeo/player v2.30.4` for the overlay player; reel is a raw `<video>` → `VideoTexture` | `@715248` |
| Device detection | **detect-ua** library (UA-string based; iPadOS via `navigator.platform==="MacIntel"&&navigator.maxTouchPoints>2`) wrapped in `class Browser` | `@535221 DetectUA`, `@538991 class Browser` |
| Physics | Custom (`HomeBalloonsPhysics`), no cannon/ammo/rapier | `@619867` |
| Analytics | GA4 gtag | `index.html` head |
| Fonts | Aeonik 400/500/400i, IBMPlexMono 400/500, LusionMono 400 — self-hosted woff2, `font-display:block`, and **JS-measured** (FontItem polls text width every 20 ms until the family renders) | CSS `@font-face`; `class FontItem extends AnyItem` (bundle tail) |
| Debug knobs | URL query params override any `Settings` field: `?SKIP_ANIMATION`, `?USE_HD`, `?WEBGL_OFF`, `?DPR=1`, `?USE_PIXEL_LIMIT=0`, `?JUMP_SECTION=…`, `?LOOK_DEV_MODE`… | `class Settings…constructor(){…new URLSearchParams(window.location.search)…this.override(t)}` |

Correction to `ANALISI_LUSION.md`: the "second full-screen canvas" is `#transition-overlay`, a **2D canvas** (`getContext("2d")`), not a WebGL layer; the ~54×54 canvas is the sound-toggle button. `_ld/_hd` tunnel grid variants are **both loaded and both rendered on every device** (near/far detail with `renderOrder 1/2`, `IS_HD` define) — they are not device LOD. There is **no click-to-enter gate**: the preloader auto-reveals; `properties.onFirstClicked` is only used to unlock audio and iOS `DeviceOrientationControls`. The signature “curly lines” are **pre-baked `.buf` tube meshes** (`lines/line_reel.buf` etc., ~12.8 KB each, with `CP` control-point and `Cd` AO attributes) revealed by a `u_showRatio` uniform driven by the section's scroll position — not runtime `TubeGeometry`/CatmullRom.

---

## 2. Asset inventory with sizes (home route)

Measured 2026-08-17 (`asset-sizes.txt`). `.buf`/`.exr` are served without Content-Length and **uncompressed** (wire == raw; `cf-cache-status: DYNAMIC`).

Boot-critical (gated by the preloader — added with `loader.add` before `loader.start`):

| Asset | Desktop | Mobile (`browser.isMobile`) | Notes |
|---|---|---|---|
| `hoisted.CUO_IjfL.js` | 1,251,728 raw / ~305 KB br | same | one file, all pages |
| `about.CNa9RfUh.css` | 90,367 / 14 KB br | same | |
| Fonts woff2 (Aeonik R/M, IBMPlexMono R, LusionMono) | 31,164 + 44,632 + 38,988 + 1,600 (+ Italic, PlexMono Medium not probed) | same | `Aeonik:400` is awaited **before** `run()` even starts |
| `textures/LDR_RGB1_0.png` (blue noise 128²) | 48,759 | same | loader weight **55** |
| `textures/smaa-area.png` / `smaa-search.png` | 33,203 / 113 | same | weights 32 / 0.1 |
| `models/home/cross.buf` → `cross_ld.buf` | 282,676 | **123,984** | hero balloon mesh |
| `textures/home/matcap.exr` → `matcap_ld.exr` | 602,702 | **172,380** | HDR matcap, EXRLoader |
| `models/lines/line_{reel,goal,capability,office}.buf` | 4 × ~12,840 | same | curly lines |
| `models/tunnels/grid_structure_{ld,hd}.buf`, `grid_base_{ld,hd}.buf` | 12,632 + 2,912 + 1,636 + 90,628 | same (both LODs) | |
| `textures/tunnels/grids/greeble_{arm,base,nor}.webp` | 354,148 + 276,006 + 198,056 | same | |
| `tunnels/astronaut_animations.buf` (+in/out) | 336,188 + 1,960 + 2,564 | same | |
| `tunnels/broken_glass.buf` + `_animation.buf` | 135,904 + 312,576 | same | |
| `tunnels/tunnel_block_wall.buf` / `_base.buf` | 363,860 / 8,760 | same | |
| `tunnels/diamond.buf`, `earth_card.buf` | 5,104 / 14,156 | same | |
| `tunnels/earth_landscape.jpg`, `earth.webp`, `white_block.webp`, `white_matcap.jpg` | 245,092 / 1,634 / 189,362 / 69,851 | same | |
| `tunnels/stickers.png` → `stickers_low.png` | 409,573 | **258,457** | |
| `tunnels/astronaut/face.png`, `astronaut_*.webp` | 771 + (not probed) | same | |
| `models/plant.buf` | 177,002 | same | |
| `textures/flip_texture.png`, `font.png` | 8,696 / 200 | same | |

Not gated (started with `loader.load` or plain `<video>` — stream in after/around the preloader):
- Project thumbnails `projects/<id>/home.webp` + `home_depth.webp` (10 projects; 53–268 KB each, depth ~6 KB) — `properties.loader.load(...)` in `ProjectItem` constructor (`@734923`) → not in `itemList`, not part of the percentage. On mobile the media resolver swaps `/image`→`/mobile_image` and `/video`→`/mobile_video` (`@916833`, `@915997`) for project-page media.
- Showreel `textures/reel/desktop.mp4` **4,980,580 B** vs `reel/mobile.mp4` **2,267,388 B** — chosen by **viewport width ≤ 560 px** (`isVerticalVideo`), *not* by UA (`@715248`, re-evaluated on resize `@718502`).
- Audio `.ogg` (hover_0 6 KB, page_0 21 KB, generic music 237 KB, cinematic_2 103 KB…) — **never loaded on mobile** (`USE_AUDIO = isSupportOgg && !isMobile`).
- `tunnels/tablet.png` 73,188 / `desktop.png` 67,412 (device mock-up placeholders) — `loader.load` in `homeGoalSection.init` (`@875147`).

Formats: WebP + PNG + JPG textures, EXR for the HDR matcap, MP4 video, OGG audio, custom `.buf` geometry. **No KTX2/Basis, no Draco, no glTF, no AVIF.**

Rough boot payload on the home route: desktop ≈ 5.0 MB of gated assets (~1.25 MB JS raw / 0.3 MB wire) vs mobile ≈ 4.3 MB (only cross/matcap/stickers shrink); the streamed reel adds 5.0 MB vs 2.3 MB.

---

## 3. Preloader state machine

Actors: `Preloader` (DOM digits, `@1242280`), `TransitionOverlay` (2D canvas bar/“L”/black cover, `@1145945`), `QuickLoader` (`properties.loader`), `TaskManager` (per-frame GPU warm-up, `@585580`), main bootstrap (`preRun/run/init/start/loop`, bundle tail `@1248706+`).

DOM: `<canvas id="transition-overlay">` (fixed, z-index 100, pointer-events auto) + `<div id="preloader"><div id="preloader-percent-digits">` 3 × `.preloader-percent-digit` each with 2 × `.preloader-percent-digit-num` (fixed, z-index 200; `bottom:0;left:0;font-size:clamp(7em,8vw,20em)`, `13vw` under 812 px). `#preloader` background goes transparent once `html.is-ready` is set (`ui.preInit`), so the black you see is the 2D overlay canvas.

Sequence (all in one rAF loop; `dt` clamped to ≤ 1/20 s):

1. `preRun()`: register cross-origin for `https://lusion.dev/`, `routeManager.init()`, `loader.add("Aeonik:400",{type:"font"})`, `loader.start(o => o===1 && run())`. → **The whole engine waits for the Aeonik 400 font to render** (FontItem measures a hidden `<dom>` element's text width every 20 ms until it differs from the fallback font).
2. `run()`: adds the remaining fonts (`Aeonik:500, Aeonik:400:italic, IBMPlexMono:400/500, LusionMono:400`), `app.initEngine()` (WebGL2 context, renderer, post stack — SMAA textures added to loader with weights 32/0.1), `input/scrollManager/pagesManager/ui/app .preInit()` — every page section calls `properties.loader.add(...)` for its `.buf`/textures here (`blueNoise` adds `LDR_RGB1_0.png` weight 55) — then `_onResize()`, `loop()`, and `ui.preload(init, start)` → `preloader.show(init,start)` → `properties.loader.start(r => this.percentTarget = r)`.
3. Progress source: `QuickLoader` weight-based ratio `loadedWeight/totalWeight`, dispatched on every XHR `onprogress` (BufItem/XHR items have `hasLoading`) and on each item completion; images/textures count only on completion. Default weight per item = 1 (so it's mostly item-count based; the blue-noise PNG at weight 55 and SMAA area at 32 dominate the numerator — a quirk, not size-proportional). Max 4 concurrent items (`maxActiveItems=4`).
4. `Preloader.update(dt)` every frame:
   - `percent = min(percentTarget, percent + dt / MIN_PRELOAD_DURATION)` with `MIN_PRELOAD_DURATION = 1` → displayed load ratio rises at most 100 %/s → **≥ 1 s even when everything is cached**.
   - When `percentTarget == 1`: call `init()` once (`properties.hasInitialized=true`; pages `init()`, `taskManager.start()` — tasks are `renderer.compileAsync` for each registered material/scene and `renderer.initTexture` for each loaded texture, executed **one per frame**), then `percentToStart = min(taskManager.percent, percentToStart + dt / 0.25)`.
   - Displayed value `t = percentToStart * 0.3 + percent * 0.7` (`PERCENT_BETWEEN_INIT_AND_START = .3`): **first 70 % of the counter = network, last 30 % = shader compile / texture upload.**
   - When `t == 1`: `lineTransformTime += dt`, `r = expoInOut(saturate(lineTransformTime))` → **1 s bar→“L” morph** (`transitionOverlay.lineTransformRatio`).
   - When `r == 1 && !hasStarted`: call `start()` → `ui.start()` (`preloader.hide()` is a no-op), `pagesManager.start()` → `_showPage()`, `app.start()`, `properties.hasStarted = true`, `scrollManager.isActive = true`.
   - `n = saturate(properties.startTime)` (startTime accumulates dt only after `hasStarted`) → **1 s reveal**: `transitionOverlay.contentShowRatio = n`; digits translate off with per-digit stagger (`expoInOut(n*1.2 - .2*a/2)`); when `n == 1` → `#preloader.style.display="none"`, `isActive=false`.
   - Digits: `c = floor(t*100 / 10^(2-a))`, eased `_easedVal = mix(_easedVal, c, 1-exp(-7 dt))`; each digit shows `floor` and `ceil` numerals stacked and `translateY(-(frac)*50%)` → the “rolling odometer”.
5. `TransitionOverlay.update` (2D canvas, redrawn only while `activeRatio = min(1-contentShowRatio, contentHideRatio) > 0`): fills black, draws a 5×1 unit bar (`#333` track, `#fff` fill = `loadBarRatio`) at screen centre, unit `pixelWidth = min(42, vw/30)`; when `lineTransformRatio > 0` the bar splits into two rects, one rotated by `l*π/2` (`xor` composite) — the Lusion “L”; the whole group is then scaled by `(1 + expoInOut(1-activeRatio) * diag/pixelWidth)` and rotated ±1 rad as `contentShowRatio` grows → the black cover “zooms/rotates” away revealing the page. During this whole time `App.update` **skips WebGL rendering** (`transitionOverlay.activeRatio<1 && postprocessing.render(...)`).
6. Minimum theoretical duration ≈ 1 s (percent ramp) + 0.25 s (task ramp) + 1 s (L morph) + 1 s (reveal) ≈ **3.25 s + font wait**, regardless of cache. `DELAY=1.5` and `HIDE_DURATION=.5` are declared on the class but **never read** in `update()` (dead constants). `?SKIP_ANIMATION` short-circuits every ramp to 1.
7. Repeat visits / internal navigation: **no sessionStorage/localStorage gate** (the only `localStorage` hit is the `debug` npm module inside `jsonp`), so a hard reload always re-runs the full preloader. Internal SPA navigation never re-uses the digit preloader: `PageManager._onRouteChanged` hides the current page, `properties.loader.start(...)` loads the next page's assets, and — only if that page was never pre-inited and lacks `bypassShowingLoading` — the same 2D overlay shows a pixel-font “LOADING” (`LOADING_RECTS`) until `taskManager.percent==1`, then hides. Project pages set `bypassShowingLoading=true`. Link HTML is prefetched on `mouseenter`.
8. Mobile differences in the preloader: **none in logic**. Same DOM, same timings, same 2D overlay; only CSS (`13vw` digits ≤ 812 px) and the fact that mobile-specific (smaller) assets are in the queue.

---

## 4. Mobile vs desktop matrix

Detection sources (see §5): `browser.isMobile` (UA: phone OR tablet incl. iPadOS), `settings.IS_SMALL_SCREEN` (`min(screen.w, screen.h) <= 820`), `properties.useMobileLayout` (`innerWidth <= 812`, recomputed on resize), reel `isVerticalVideo` (`innerWidth <= 560`), CSS `@media (max-width: 812px)` (129 rules) / 560 / 480 / 380 / `(hover: hover)` (17 rules), plus the html class `is-mobile` (UA regex `ipad|iphone|android`) used by CSS `display` toggles.

| Concern | Desktop | Mobile / touch | Gate |
|---|---|---|---|
| WebGL scene, canvas, post stack | on | **on — same engine, same scenes (hero balloons, curly lines, tunnels journey, footer)** | none — there is no video/image swap of the WebGL hero |
| Preloader | full | **identical** | none |
| Route transitions (2D overlay) | full | identical | none |
| DPR | `min(1.5, devicePixelRatio)` | same formula | `Settings.DPR` (all devices) |
| Pixel budget | `USE_PIXEL_LIMIT`: backing store clamped to ≤ **2560×1440 = 3.69 MP** keeping aspect | same | `_onResize` |
| Bloom | FFT convolution bloom (`USE_CONVOLUTION`, `USE_HD` half-float RTs) | **5-iteration separable Gaussian bloom, non-HD RT** | `let e=!browser.isMobile||settings.USE_HD; bloom.init({USE_CONVOLUTION:e,USE_HD:e})` (`@1237483`) |
| SMAA | on | on | `isSmaaEnabled:!settings.USE_HD` |
| MSAA scene RT (8 samples) | on (WebGL2, not Safari 15.4) | on | `isSupportMSAA` |
| ScreenPaint pointer distortion | follows hover | only while finger is down | `(this.needsMouseDown||browser.isMobile)&&(!input.isDown…)` (`@615247`) |
| Hero balloons | N spheres + **2 semi-transparent glass spheres** (refraction via 4 blurred scene copies) | glass spheres **removed** | `browser.isMobile||sphereData.push({…GLASS},{…GLASS})` (`@608937`) |
| Hero mesh / matcap | `cross.buf` 283 KB, `matcap.exr` 603 KB | `cross_ld.buf` 124 KB, `matcap_ld.exr` 172 KB | `browser.isMobile` (`@624351`) |
| Stickers atlas | `stickers.png` 410 KB | `stickers_low.png` 258 KB | `browser.isMobile` (`@860270`) |
| Camera | mouse parallax / optional orbit | **DeviceOrientationControls** gyro parallax (iOS: after first tap) | `browser.isMobile` (`@780430`) |
| Reel video | `reel/desktop.mp4` 5.0 MB | `reel/mobile.mp4` 2.3 MB | **width ≤ 560** (`isVerticalVideo`) |
| Project media | `/image/*.webp`, `/video/*.mp4` | `/mobile_image/*`, `/mobile_video/*` | `browser.isMobile` |
| Audio (hover/click/page/music) | on (needs first click) | **off entirely; sound button hidden** | `USE_AUDIO=isSupportOgg&&!isMobile` |
| Scroll | wheel → custom inertial virtual scroll | touch drag → same virtual scroll (drag history velocity, friction) | `input.isDragScrollingY` |
| Zoom | — | `gesturestart/change/end` preventDefault, `user-scalable=no` | global |
| Text-split animations (chars/words on titles, project CTA, footer) | per-char/word transforms | **skipped / `SplitType.revert()`** at ≤ 812 px | `properties.useMobileLayout` (`@746165`, `@744694`, `@728956`) |
| Hover cursors, video-overlay custom cursor, project hover listeners | on | off | `useMobileLayout` / CSS `(hover: hover)` |
| About page: capability lines (`Line(2)`, `Line(3)`) | on | **not created** | `browser.isMobile` (`@1094894`) |
| About page: hero particles sim | 128×192 = 24,576 | 128×128 = 16,384 | `browser.isMobile` (`@951972`) |
| About page: rocks | 64 | 48 | `browser.isMobile` (`@975753`) |
| About page: sphere LOD set | l/m/s/xs, LOD 0.. | skips the highest LOD (`p=1`) | `settings.IS_SMALL_SCREEN` (`@966810`) |
| Reduced motion | not honoured | not honoured | `reduced-motion`/`matchMedia` 0 hits |
| GPU/cores/memory sniffing | none | none | `WEBGL_debug_renderer_info`, `deviceMemory` 0 hits; `hardwareConcurrency` only stored, never read |
| Unsupported browser | `not-supported` class only if `Object.assign` missing; no WebGL → `properties.isSupported=false` and `initEngine` skips, but no dedicated fallback UI found | | |

Summary: Lusion **keeps the full WebGL experience, preloader and transitions on phones**; it degrades by (1) UA-selected lighter assets, (2) a cheaper bloom, (3) removing the two refractive glass spheres, (4) killing audio, (5) DPR ≤ 1.5 + a 3.69 MP backing-store cap that applies everywhere, and (6) simplifying DOM text choreography under 812 px. Nothing is width-gated for WebGL quality; everything WebGL-side is UA-gated.

---

## 5. Detection code (verbatim, minified)

```js
// @535221 detect-ua
isMobile: !this.isTablet && (/[^-]mobi/i.test(ua) || iOSDevice==="iphone" || iOSDevice==="ipod" || isAndroidDevice || /nexus\s*[0-6]\s*/i.test(ua))
isTablet: /tablet/i.test(ua)&&!/tablet pc/i.test(ua) || iOSDevice==="ipad" || isAndroidDevice&&!/[^-]mobi/i.test(ua) || (!/nexus\s*[0-6]\s*/i.test(ua) && /nexus\s*[0-9]+/i.test(ua))
// iPadOS desktop-UA fix:
navigator.platform==="MacIntel"&&navigator.maxTouchPoints>2&&!window.MSStream&&(this.iOSDevice="ipad")

// @538991
class Browser{isMobile=detectUA.isMobile||detectUA.isTablet;isDesktop=detectUA.isDesktop;device=this.isMobile?"mobile":"desktop";isAndroid=…;isIOS=…;
 isSupportMSAA=!userAgent.match("version/15.4 ");isSupportOgg=!!audioElem.canPlayType("audio/ogg");
 isRetina=window.devicePixelRatio&&window.devicePixelRatio>=1.5;devicePixelRatio=window.devicePixelRatio||1;cpuCoreCount=navigator.hardwareConcurrency||1;…}

// @540082 Settings
DPR=Math.min(1.5,browser$1.devicePixelRatio)||1;USE_PIXEL_LIMIT=!0;MAX_PIXEL_COUNT=2560*1440;MOBILE_WIDTH=812;
IS_SMALL_SCREEN=Math.min(window.screen.width,window.screen.height)<=820; USE_HD=!1; USE_AUDIO=browser$1.isSupportOgg&&!browser$1.isMobile;

// @1250032 _onResize
properties.useMobileLayout=e<=settings.MOBILE_WIDTH; … let r=e*settings.DPR,n=t*settings.DPR;
if(settings.USE_PIXEL_LIMIT===!0&&r*n>settings.MAX_PIXEL_COUNT){let a=r/n;n=Math.sqrt(settings.MAX_PIXEL_COUNT/a),r=Math.ceil(n*a),n=Math.ceil(n)}
properties.width=r,properties.height=n,properties.webglDPR=properties.width/e; … app.resize(Math.ceil(r*properties.upscalerAmount),…)
// App.resize: renderer.setSize(w,h) then canvas.style.width/height = viewport px  (three's setPixelRatio is never called by app code)

// bundle tail (html class used by CSS only)
/(ipad|iphone|android)/i.test((navigator.userAgent||navigator.vendor).toLowerCase()) ? html.classList.add("is-mobile") : add("is-desktop")
```

---

## 6. Snippets (load-bearing)

Preloader class (`@1242280`, complete):
```js
class Preloader{percentTarget=0;percent=0;percentToStart=0;DELAY=1.5;MIN_PRELOAD_DURATION=1;PERCENT_BETWEEN_INIT_AND_START=.3;MIN_DURATION_BETWEEN_INIT_AND_START=.25;HIDE_DURATION=.5;isActive=!1;lineTransformTime=0;digitsWidth=0;
preInit(){this.domContainer=document.getElementById("preloader"),this.domDigitsContainer=document.getElementById("preloader-percent-digits"),this.domDigits=document.querySelectorAll(".preloader-percent-digit");for(let e=0;e<this.domDigits.length;e++){let t=this.domDigits[e];t._domNums=t.querySelectorAll(".preloader-percent-digit-num"),t._easedVal=0}}
init(){}show(e,t){this._initCallback=e,this._startCallback=t,this.isActive=!0,properties.loader.start(r=>{this.percentTarget=r})}hide(){}
resize(e,t,r){r!==!0&&(this.digitsWidth=this.domDigitsContainer.offsetWidth)}
update(e){if(!this.isActive)return;
 this.percent=Math.min(this.percentTarget,this.percent+(settings.SKIP_ANIMATION?1:this.percentTarget>this.percent?e:0)/this.MIN_PRELOAD_DURATION),
 this.percentTarget==1&&(properties.hasInitialized||this._initCallback(),this.percentToStart=settings.SKIP_ANIMATION?1:Math.min(taskManager.percent,this.percentToStart+e/this.MIN_DURATION_BETWEEN_INIT_AND_START));
 let t=this.percentToStart*this.PERCENT_BETWEEN_INIT_AND_START+this.percent*(1-this.PERCENT_BETWEEN_INIT_AND_START),r=0;
 t==1&&(this.lineTransformTime+=settings.SKIP_ANIMATION?1:e,r=ease.expoInOut(math.saturate(this.lineTransformTime))),
 r==1&&!properties.hasStarted&&this._startCallback();
 let n=settings.SKIP_ANIMATION?+properties.hasStarted:math.saturate(properties.startTime);
 for(let a=0;a<this.domDigits.length;a++){let l=this.domDigits[a],c=Math.floor(t*100/Math.pow(10,this.domDigits.length-a-1));l._easedVal=math.mix(l._easedVal,c,1-Math.exp(-7*e)),c-l._easedVal<.01&&(l._easedVal=c);let u=l._easedVal%10,f=Math.floor(u),p=Math.ceil(u)%10,g=u-f;l._domNums[0].innerHTML=f,l._domNums[1].innerHTML=p,l.style.transform="translateY("+-(g-ease.expoInOut(math.saturate(n*1.2-.2*a/(this.domDigits.length-1))))*50+"%) translateY(-0.05em)"}
 transitionOverlay.loadBarRatio=t,transitionOverlay.lineTransformRatio=r,transitionOverlay.contentShowRatio=n,n==1&&(this.domContainer.style.display="none",this.isActive=!1)}}
```

Bootstrap (bundle tail `@1248706`):
```js
function preRun(){…routeManager.init(),properties.loader.register(FontItem),properties.loader.add("Aeonik:400",{type:"font"}),properties.loader.start(o=>{o===1&&run()})}
function run(){…properties.loader.add("Aeonik:500,Aeonik:400:italic,IBMPlexMono:400,IBMPlexMono:500,LusionMono:400",{type:"font"}),app.initEngine(),input.preInit(),scrollManager.init(),pagesManager.preInit(),ui.preInit(),app.preInit(),window.addEventListener("resize",onResize),_onResize(),loop(),ui.preload(init,start)}
function init(){input.init(),pagesManager.init(),ui.init(),app.init(),properties.hasInitialized=!0}
function start(){ui.start(),pagesManager.start(),app.start(),properties.hasStarted=!0,_onResize(!0),scrollManager.isActive=!0,…}
function loop(){window.requestAnimationFrame(loop);let o=performance.now(),e=(o-dateTime)/1e3;dateTime=o,e=Math.min(e,1/20),_needsResize&&_onResize(),properties.hasStarted&&(properties.startTime+=e),Tween.autoUpdate(e),update(e),_needsResize=!1}
```

TaskManager (`@585580`): `add(e){settings.SKIP_ANIMATION||this.taskList.push(new Task(e))}` … `update(){… e.run() /* one task per frame */ … this.percent=this._activeTaskIndex/this._activeTaskList.length …}`; `Task.createShaderMaterialFunc → renderer.compileAsync(tri, camera)`, `createCompileSceneFunc → renderer.compileAsync(scene, camera)`, `createInitTextureFunc → renderer.initTexture(tex)`.

App.update render gate (`@1242280-`): `transitionOverlay.activeRatio<1&&properties.postprocessing.render(visuals.currentStage3D,properties.camera,!0)`.

Bloom mobile gate (`@1237483`): `let e=!browser$1.isMobile||settings.USE_HD;properties.bloom=new Bloom,properties.bloom.init({USE_CONVOLUTION:e,USE_HD:e})`.

Glass spheres gate (`@608937`): `browser$1.isMobile||sphereData.push({color:"#fff",…isSemitransparent:!0,…GLASS},{color:"#"+_c$1.getHexString(),…isSemitransparent:!0,…GLASS})`.

Reel gate (`@715248`): `this.isVerticalVideo=properties.viewportWidth<=560 … this.video.src=settings.TEXTURE_PATH+(this.isVerticalVideo?"reel/mobile.mp4":"reel/desktop.mp4")`.

---

## 7. Open questions / gaps

- Real network waterfall and actual preloader wall-time on a phone were not measured (no live browser run in this session); the durations above are the code's minimums.
- Exact per-page total bytes were not summed (project `home.webp` set and `astronaut_*.webp` frames not probed individually).
- The `about` page assets (`about/*.buf`, `terrain`, `person`) are only loaded on the about route; not sized.
- iOS gyro: `DeviceOrientationControls.connect()` (`@778330`) does call `DeviceOrientationEvent.requestPermission()` when available; on iOS this happens after the first pointer-up (`properties.onFirstClicked.addOnce`). Whether the prompt is actually shown/accepted in practice was not observed live.
- No WebGL-unsupported fallback markup was found in the home HTML — behaviour on a WebGL-less browser is unknown (likely blank canvas + DOM copy still readable since the DOM is server-rendered).
- Weight semantics for `LDR_RGB1_0.png` (55) and `smaa-area.png` (32) are unexplained; likely legacy KB estimates.

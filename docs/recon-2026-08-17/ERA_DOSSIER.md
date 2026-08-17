# DOSSIER — https://www.era-residence.com/ ("era")

Read-only reverse engineering, 2026-08-17. All files referenced live under
`C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Sersan/a8809f96-230b-4418-a210-0e4cb572e372/scratchpad/recon/era/`.

- `index.html` — served with desktop Chrome UA (223 581 B)
- `index-mobile.html` — served with iPhone Safari UA (223 581 B) — **byte-identical** to `index.html` (`diff` → IDENTICAL). No server-side UA sniffing.
- `assets/slater-60900.js` — the site's entire custom JS (59 234 B, one line, minified). `assets/slater-60900.pretty.js` is the js-beautify output (2 866 lines) used for line references below.
- `assets/*.js|css` — every other first-party/third-party bundle referenced by the page.
- `inline-N.js` — the 6 non-empty inline `<script>` blocks extracted from the HTML.

---

## 1. Stack

| Layer | What | Evidence |
|---|---|---|
| CMS / host | **Webflow** (`data-wf-site="6a068da7ad91b057365bf967"`, `cdn.prod.website-files.com`, `webflow.a0aa6ca1.….js`, `w-dyn-list`, `w-embed`) | `index.html` offset 0–200; script #8 |
| Custom code delivery | **Slater** (slater.app) — inline `<script>` appended on `DOMContentLoaded` loads `https://assets.slater.app/slater/20164.js?v=1.0` as `type=module`; that 113-byte file `import()`s `https://assets.slater.app/slater/20164/60900.js?v=567206` = the whole app | `inline-16.js`; `assets/slater-20164.js` |
| Credits | Console ASCII banner: "DESIGNED, DEVELOPED AND DELIVERED BY Ivan Chopei ©2026 · PRODUCER Maks Stepenko · AGENCY THEFIRSTTHELAST (thefirstthelast.agency)" | `inline-6.js` |
| Animation | **GSAP 3.15.0** core + ScrollTrigger + SplitText + CustomEase (jsdelivr) | `assets/gsap.min.js` `version="3.15.0"` |
| Smooth scroll | **Lenis 1.3.21** (unpkg) + `lenis.css` | `assets/lenis.min.js` |
| Page transitions | **@barba/core 2.10.3** (unpkg, unpinned `@barba/core` → resolves to 2.10.3) | `assets/barba-core.js` `version="2.10.3"` |
| Lottie | lottie-web 5.12.2 — only used for the agency logo in `.credits` (772 KB JSON, hover-scrubbed) | `assets/lottie.min.js`, `assets/tftl-logo_white.json` |
| jQuery | 3.5.1 (Webflow default) | script #7 |
| Fonts | Adobe **Typekit** kit `pig8glj` loaded synchronously in `<head>` (`Typekit.load()`) | `inline-2.js`, `assets/typekit-pig8glj.js` |
| Analytics | GTM `GTM-WMDRV3P6` | `inline-5.js` |
| Video assets | Cloudflare-fronted `assets.era-residence.com` (R2-style) — WebM + MOV alpha videos | `index.html` `<source>` tags |
| **WebGL / 3D** | **NONE.** No three.js, OGL, PixiJS, curtains, Unicorn Studio, Spline, `<canvas>`, `getContext`, shaders anywhere in HTML, CSS or any bundle. The "wow" is 100 % DOM: GSAP transforms, CSS `mask-image`/`clip-path`, SplitText, alpha-channel videos. | keyword census (`WebGL`, `THREE`, `getContext`, `canvas` → 0 hits in all bundles; the single "canvas" hit in HTML is inside the meta/CSS reset) |
| Sizing model | `html { font-size: 1vw }` — the whole layout is vw-rem based; a `--_100svh` CSS var is set from `window.innerHeight` at boot | `index.html` inline `<style>`; `slater-60900.pretty.js:2863` |

Total JS shipped on `/` (uncompressed, from local files): **~699 KB**
(jQuery 89 476 · webflow.js 45 758 · gsap 72 927 · ScrollTrigger 44 575 · SplitText 7 732 · CustomEase 7 143 · lenis 17 709 · barba 31 817 · lottie 305 543 · typekit 16 976 · slater loader 113 · slater app 59 234). CSS: 127 610 (Webflow) + 513 (lenis) + inline `<style>` blocks in HTML.

---

## 2. Asset inventory (with sizes, from `curl -I`)

| Asset | Type | Size | Notes |
|---|---|---|---|
| `bougainvillea-flowers_01..07.webm` | video/webm (alpha) | 2.94–3.39 MB each (7 files ≈ 22 MB) | `<source type="video/webm">` first |
| `bougainvillea-flowers_01..07.mov` | video/quicktime (HEVC alpha, declared `type="video/mp4"`) | 9.5–10.6 MB each | Safari fallback; on Safari the WebM `<source>` is removed by JS |
| `bougainvillea-flowers_0N.avif` | image/avif poster | (28 AVIF refs in HTML) | posters for the videos |
| `open-graph.mp4` | video/mp4 | 1.92 MB | referenced in HTML (OG/hero?) |
| Hero `…gated-community_day.webp` | image/webp | 659 KB @1920w; 84 KB @-p-800 | Webflow responsive srcset 500/800/1080/1600/1920, `sizes="(max-width:1920px) 100vw, 1920px"`, `loading="eager"` |
| all 41 `<img>` | webp (106 refs), png (38, mostly `-p-500/-p-800` variants), svg (6), avif (28) | — | **all 41 `<img>` are `loading="eager"`, 0 lazy**; 28 have `srcset` |
| `preloader_bg.svg` | svg | 23.8 KB | decorative preloader background at 5 % opacity |
| `preloader_arch-l.svg` | svg | 230 B | used as CSS `mask-image` for the arch reveal |
| `tftl-logo_white.json` | lottie | 772 KB | credits logo hover only |
| Fonts | Typekit kit | 17 KB JS + woff2 (not enumerated) | — |

No KTX2 / basis / draco / meshopt / GLB / HDR anywhere (grep → 0).

---

## 3. Preloader state machine

### Trigger / entry point
1. HTML ships two full-screen covers already visible thanks to an inline `<style>`:
   `[data-master-preloader],[data-preloader]{display:block}` (overrides Webflow CSS `display:none`), plus `[data-prevent-flicker]{visibility:hidden}` for hero text. `.master-preloader` is a plain solid `--other--bg` fixed layer at `z-index:999999`; `.preloader` (`z-index:11000`, `bottom:-100vh`, i.e. 200 vh tall) is the animated one. — `index.html` offsets 8322–8420 (CSS), 25339–25414 (DOM).
2. `DOMContentLoaded` → inline script appends Slater module → `import("…/60900.js")` → module top-level executes `gsap.registerPlugin(...)`, constants, `history.scrollRestoration="manual"`, then **`initPreloader()`** synchronously. — `slater-60900.js` offset 59183 / pretty `:2852-2867`.
3. `initPreloader()` (pretty `:1-10`): reads `sessionStorage.hasVisited`; calls `initLenis()`, `initCookies()`, `initAllParallax()`; then `animatePreloaederIntro()` (first visit in this tab session) or `animatePreloaederShort()` (revisit); then writes `sessionStorage.hasVisited="true"`.

### What it waits for
- **Nothing.** There is no `window.load`, no `document.fonts.ready`, no image `decode()`, no LoadingManager, no XHR/asset counting. The only asset gate anywhere is unrelated to the preloader: `initTranistionFlow` waits for the hero `.img` `complete`/`load` before creating the hero scroll timeline (pretty `:2548`).
- The "progress bar" (`.preloader_progress_track`, a 1 px vertical line) is a **fixed 4-second tween** `yPercent:-100→0`, `ease:"loaderEase"` (a bespoke CustomEase path) — pure choreography, no real progress source. — pretty `:51-56`, minified offset 1610.
- Fonts: Typekit is loaded synchronously in `<head>` before any body paint, so text in the preloader is already in the right font by the time the module runs (implicit, not gated).

### Intro timeline (first visit) — `animatePreloaederIntro`, pretty `:12-86`
Constants: `durS=.4, durM=.8, durL=1.2, stagger=.1, delayReveal=.3` (pretty `:2858-2862`). `breakPoint=992`.
Responsive params: `d = innerWidth>=992 ? "24vw" : "40vw"` (arch start width), `u = >=992 ? "36vw" : "50vw"` (arch mid width), `g = >=992 ? .75 : 1.15` (hero master image pre-scale).

| t (s) | step |
|---|---|
| 0 | `setTimeout(scrollToTop,100)`; `lockScroll()` (html overflow hidden + scrollbar-width padding + `lenis.stop()`); hero `.hero-w_bg_master_img` set to `scale:g, transformOrigin:"center top"`; CSS vars `--arch-w:d`, `--arch-y:104vh` (arch mask fully below viewport) |
| 0 (+0.3 delay, stagger .1) | SplitText reveals inside preloader: `[data-part=a]` chars (rotateX 90→0, x 10rem→0), `[data-part=h]` chars (rotateY 90→0, yPercent 50→0), `[data-part=p]` lines (mask, yPercent 110→0), `[data-part=ctn]` (opacity/y), `[data-part=line]` (clip-path inset) — all `durL=1.2` |
| 0→1.2 | empty hold `.to({}, {duration:durL})` |
| 1.2→2.4 | `.preloader_bg_a` opacity 0→.05 and `.preloader_bg_decor` opacity 0→1 (both `durL`, ease "Out") |
| 2.4→6.4 | fake progress line `yPercent -100→0`, **duration 4**, ease `loaderEase` |
| 6.4→7.9 | arch mask grows/rises: `--arch-w: d→u`, `--arch-y: 104vh→15vh`, `1.25*durL=1.5s`, ease "InOut" (`.preloader` uses a 4-layer `mask-image` — three white rects + `preloader_arch-l.svg` — composited so the arch is a hole through which the page shows; CSS at `index.html` offset 22725) |
| 7.75→10.15 (`"<90%"`) | arch dives away: `--arch-w:"125"`, `--arch-y:"-100vh"`, `2*durL=2.4s`, ease `diveIn` (`0.6,0,0,1`) |
| 7.75 (`"<"`) | hero master image `scale g→1`, 1.5s, "InOut" (the "zoom-out into the hero" payoff) |
| ~7.75 (`"<25%"`) | `initPageTransitions()` → `barba.init` → its `once()` hook runs `initScripts()` (all page modules, SplitText scroll-reveals, etc.) |
| 10.15 (end) | `unlockScroll()` (`lenis.start()`), `.preloader` `display:none` |
| sync, right after building the timeline | `[data-master-preloader].remove()` — the solid cover disappears immediately when JS arrives; the animated `.preloader` is on top from then on |

Total: **~10.15 s fixed** from module execution to scroll unlock; page becomes visible through the arch from ~6.4 s.

### Short timeline (revisit in same tab session) — `animatePreloaederShort`, pretty `:88-148`
`sessionStorage.hasVisited` truthy → `.preloader_ctn` (all text + progress) `display:none`; only bg fade (1.2 s) + arch rise (1.5 s, starts at `"<"` = t=0) + dive (2.4 s at `"<90%"` = t≈1.35) → **≈3.75 s** total, hero zoom-out identical, `initPageTransitions()` at the same relative point.
Because it is `sessionStorage`, a new tab/window gets the full intro again; a hard reload in the same tab gets the short one.

### Exit transition
The exit **is** the arch: CSS-var-driven `mask-image` on the fixed `.preloader` opens an arch-shaped window that grows (`--arch-w`) and slides up (`--arch-y` 104vh→15vh→-100vh) while the hero image scales from `g` to 1. Then `display:none`. No opacity fade of the overlay itself.

### Internal navigation
Barba `transitions[0]` (pretty `:150-219`): `beforeLeave` → `animateVisibleElements(container,"hide")` (SplitText hide of everything currently on screen), `leave` → container opacity→0 `durM=0.8` ease "In", `afterLeave` → scrollToTop, kill all ScrollTriggers, destroy local Lenis instances, remove container, `beforeEnter` → set opacity 0, `initScripts()`, `initAllParallax()`, `ScrollTrigger.refresh(true)`, `enter` → opacity→1 `durM` "InOut", `afterEnter` → `initResetWebflow` (swap `data-wf-page`, `Webflow.destroy()/ready()`). **The preloader does not re-run on SPA navigation** — it is only invoked from module top level on a hard load.

### Mobile differences in the preloader
Only three parameters change (`window.innerWidth >= 992` checks at pretty `:25-27` and `:95-97`): arch width 40vw→50vw instead of 24vw→36vw; hero pre-scale 1.15 instead of 0.75 (portrait crop needs to be zoomed *in*, not out). CSS ≤991px hides the flanking "Costa"/"del Sol" titles (`.preloader_title-l/-r{display:none}`, css offset 123359) and makes the progress line taller (`u-160` vs `u-96`). Durations, fake-progress 4 s, ordering, arch mask, sessionStorage skip — **identical**.

---

## 4. Mobile vs Desktop matrix

Breakpoint everywhere is **992 px** (`breakPoint=992` in JS; Webflow CSS `max-width:991px`). No UA-based device gating, no DPR/GPU/CPU checks.

| Feature | Desktop (≥992) | Mobile (<992) | Mechanism |
|---|---|---|---|
| Preloader | full | full (param tweaks above) | `innerWidth>=breakPoint` |
| Barba SPA transitions | yes | yes, identical | none |
| Lenis smooth scroll | `smoothWheel:true, duration:1.2, touchMultiplier:2` | **native touch scrolling** — `syncTouch` is not set (Lenis default `false`), so touch events hit `isScrolling="native"` and Lenis merely tracks scroll to feed ScrollTrigger | Lenis internals (`lenis.min.js` `syncTouch:a=!1`, `if(!(this.options.syncTouch&&i||this.options.smoothWheel&&a)){this.isScrolling="native"…}`) |
| Nested Lenis (`[data-lenis-scroll]`, 1 element) | yes | yes | — |
| SplitText scroll reveals (126 `data-scroll-reveal` elements) | yes | yes, identical | — |
| Parallax (`data-parallax`, 28 elements) | yes | yes except elements with `data-mob="off"` (2: `.interior-s_l`, `.interior-s_r`); one element is desktop-off (`data-desk="off"` on an `.img-w`) | `innerWidth<breakPoint` + dataset flags (pretty `:825-893`) |
| Hero scroll choreography (`initTranistionFlow`) | hero section `y` slide + bg `y` slide + bg `scale 1→2` (overlapping `-=0.2`) | **only** bg `scale 1→2` (positioned `">"`); no y-slides; `.hero-w_bg_master{max-height:100vh}` | `g = innerWidth<breakPoint` (pretty `:2511-2546`) |
| Hero pins (`.pins-cms b-desk`, 12 `data-pin`) | shown, pulse anim, hover-rotate icon | hidden (`.b-desk{display:none}` ≤991) | CSS |
| Floating cursor tooltips (`initFloatingTips`) | follow mouse, `gsap.matchMedia (min-width:992px)` | replaced by bottom-sheet **modal tips** (`initModalTip`, `(max-width:991px)`, slide `yPercent 125→0`) | `gsap.matchMedia` |
| Magnetic buttons (6) | yes (mousemove) | not initialised | `gsap.matchMedia (min-width:992px)` (pretty `:1030`) |
| Custom scrollbar with draggable thumb + % label (`.s-bar`) | yes | not initialised + `display:none` in CSS | `gsap.matchMedia` (pretty `:1409`) + CSS ≤991 |
| Section snapping (`initSnapSections`, `[data-snap]`) | yes — after 40 ms scroll idle, `lenis.scrollTo` the section covering >50 % viewport | **off** | `gsap.matchMedia (min-width:992px)` (pretty `:312`) |
| Horizontal "location" section (`.loc-scroll-area`) | pinned horizontal scroll (`x:-track`, ease `horScroll`), title lines & flower parallax, `containerAnimation` reveals | falls back to a normal vertical column (`.loc-scroll-area_track{flex-flow:column}`, `_screen{position:static}`), path scroller centred by JS | `gsap.matchMedia` (pretty `:2597`) + CSS ≤991 + pretty `:732` |
| Architecture intro clip-path sequence (`.arch-intro-s`) | scrubbed polygon `clip-path` + scale 1.84 + flower spread | **not present** (`.arch-intro-s b-desk` hidden; JS in `matchMedia (min-width:992px)`) | CSS + `gsap.matchMedia` (pretty `:2710`) |
| Footer clip reveal | `inset(8% 22% 8% 22%)` | `inset(4% 32% 4% 32%)` | `innerWidth>=breakPoint` (pretty `:2797`) |
| `animateCtn` travel distance | `3.333rem` | `11.54rem` | `innerWidth>=breakPoint` (pretty `:553`) |
| Lightbox image zoom | click-to-zoom + mouse-Y pan via `gsap.ticker` | pinch-zoom (2-touch), double-tap, 1-finger pan (`touchAction:none`) | `innerWidth>breakPoint` / `>=breakPoint` (pretty `:1884`, `:1925`) |
| Alpha flower videos (7 × ~3 MB WebM) | autoplay-on-scroll via ScrollTrigger (`data-video-playpause` wrappers, 5) | **identical** — same files, same posters, no `b-desk`, no smaller encode | none (only Safari UA branch swaps to `.mov`) |
| Hero image | Webflow srcset (500…1920 w) | same srcset — browser picks | `sizes`/`srcset` |
| CSS hover effects (`[hover-btn]`, `[hover-nav-item-l2]`, `[hover-img-card]` …) | active | disabled — wrapped in `@media (min-width: 992px)` (9 occurrences in inline `<style>`) | CSS |
| JS hover handlers (`mouseenter/mouseleave` in `initLinkHover`, `initBtnCircleHover`, `initPins`, `initTFTLjson`, `initCardParts`) | active | attached but inert on touch | none |
| Landscape phones | — | full-screen `.landscape-cover` + `body{overflow:hidden}` — **the site refuses to render in landscape on touch devices** | CSS `@media screen and (orientation: landscape) and (max-width: 991px) and (pointer: coarse) and (hover: none)` (`index.html` offset ~8450) |
| Theme switching (`initThemeChange`) | yes | yes | — |
| Cookie banner | yes (localStorage `cookies`) | yes | — |
| Reduced motion | not honoured anywhere in custom code (only Webflow's own runtime references it) | same | — |
| DPR / GPU / cores / memory | not read | not read | — |
| Postprocessing / particles / canvas | n/a — none | n/a | — |

**Deliberately kept identical on mobile:** preloader choreography and its arch mask; barba fade transitions; every SplitText reveal (chars/words/lines with rotateX/rotateY 3D transforms); most parallax; hero zoom; alpha-video flowers at full bitrate; theme changes; ScrollTrigger scrub sequences (amenities scale/fade, footer clip, quote themes).
**Removed/replaced on mobile:** pointer-only affordances (magnetic, cursor tooltips → bottom sheet, draggable scrollbar), the two pinned/horizontal desktop set-pieces (location horizontal scroll, architecture clip-path), snapping, hero y-slides, Lenis smoothing on touch (native), and landscape orientation altogether.

---

## 5. Detection code (verbatim from `slater-60900.pretty.js` unless noted)

```js
// :2855  the single breakpoint
breakPoint = 992,

// :25-27  preloader responsive params
const d = window.innerWidth >= breakPoint ? "24vw" : "40vw",
      u = window.innerWidth >= breakPoint ? "36vw" : "50vw",
      g = window.innerWidth >= breakPoint ? .75 : 1.15;

// :312  desktop-only modules use gsap.matchMedia
gsap.matchMedia().add(`(min-width: ${breakPoint}px)`, (() => { ... }))
// :2259  mobile-only
gsap.matchMedia().add(`(max-width: ${breakPoint-1}px)`, (() => { ... }))

// :825-826  per-element parallax opt-out
const r = window.innerWidth < breakPoint;
r && "off" === t.dataset.mob || (r || "off" !== t.dataset.desk) && gsap.fromTo(e, {...})

// :737  the ONLY userAgent sniff — Safari (incl. iOS): drop WebM, force HEVC .mov, kick playback
/^((?!chrome|android).)*safari/i.test(navigator.userAgent) && (
  document.querySelectorAll('source[src$=".webm"]').forEach((e => e.remove())),
  document.querySelectorAll("video").forEach((e => {
    e.closest(".hero-w") || e.closest(".cta-w") || (e.load(), e.play().catch((() => {})))
  })))

// :226-233  Lenis — no syncTouch → native touch scroll
lenis = new Lenis({ wrapper: window, duration: 1.2, smoothWheel: !0, touchMultiplier: 2,
  easing: e => Math.min(1, 1.001 - Math.pow(2, -10 * e)), infinite: !1 }),
lenis.on("scroll", ScrollTrigger.update), gsap.ticker.add((e => lenis.raf(1e3 * e))), gsap.ticker.lagSmoothing(0)
```

```html
<!-- index.html, inline <style> in <head> -->
@media screen and (orientation: landscape) and (max-width: 991px) and (pointer: coarse) and (hover: none) {
  .landscape-cover { display: block; }
  body { overflow: hidden; }
}
```

```js
// index.html inline-3.js — Webflow default touch class (only used by CSS `.w-mod-touch *{background-attachment:scroll!important}`)
!function(o,c){var n=c.documentElement,t=" w-mod-";n.className+=t+"js",("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch)&&(n.className+=t+"touch")}(window,document);
```

---

## 6. Snippets (preloader core, `slater-60900.pretty.js`)

```js
// :1-10
function initPreloader() {
    let e = !1;
    try { e = sessionStorage.getItem("hasVisited") } catch (e) {}
    initLenis(), initCookies(), initAllParallax(), e ? animatePreloaederShort() : animatePreloaederIntro();
    try { sessionStorage.setItem("hasVisited", "true") } catch (e) {}
}

// :32-85 (intro timeline, abridged)
gsap.timeline()
  .set(e, { "--arch-w": d, "--arch-y": "104vh" })
  .add(() => { animateTextA(t,"reveal"), animateTextH(r,"reveal"), animateTextP(a,"reveal"), animateCtn(o,"reveal",durS), animateLine(n,"reveal") })
  .to({}, { duration: durL })
  .fromTo(i, { opacity: 0 }, { opacity: .05, duration: durL, ease: "Out" })
  .fromTo(s, { opacity: 0 }, { opacity: 1,   duration: durL, ease: "Out" }, "<")
  .fromTo(l, { yPercent: -100 }, { yPercent: 0, duration: 4, ease: "loaderEase" })      // fake progress
  .fromTo(e, { "--arch-w": d, "--arch-y": "104vh" }, { "--arch-w": u, "--arch-y": "15vh", duration: 1.25 * durL, ease: "InOut" })
  .to(e, { "--arch-w": "125", "--arch-y": "-100vh", duration: 2 * durL, ease: "diveIn" }, "<90%")
  .add(() => { c && gsap.fromTo(c, { scale: g }, { scale: 1, duration: 1.25 * durL, ease: "InOut" }) }, "<")
  .add(() => { initPageTransitions() }, "<25%")
  .add(() => { unlockScroll(), gsap.set(e, { display: "none" }) });
document.querySelector("[data-master-preloader]").remove()

// :2863-2867  module tail — preloader starts unconditionally at module eval
CustomEase.create("InOut","0.75,0,0.25,1"), CustomEase.create("Out","0.25,1,0.5,1"), CustomEase.create("In","0.5,0,0.75,0"),
CustomEase.create("Ease","0.25,0.1,0.25,1"), CustomEase.create("Write","0.333,0,0.667,1"), CustomEase.create("diveIn","0.6,0,0,1"),
CustomEase.create("horScroll","0.25,0,0.75,1"),
document.documentElement.style.setProperty("--_100svh", `${window.innerHeight}px`),
window.addEventListener("resize", ...ScrollTrigger.refresh(!0) debounced 40ms...),
history.scrollRestoration = "manual", initPreloader();
```

```css
/* index.html offset 22725 — the arch reveal is a 4-layer CSS mask driven by two CSS vars */
[data-preloader] {
  --arch-w: 36vw; --arch-h: calc(var(--arch-w) / (560 / 2592)); --arch-y: 100vh;
  mask-image: linear-gradient(white,white), linear-gradient(white,white), linear-gradient(white,white),
              url('…/6a23fd3e3546e70bdf8420a0_preloader_arch-l.svg');
  mask-size: calc(50% - (var(--arch-w)/2) + 2px) 100%, calc(var(--arch-w) + 4px) calc(var(--arch-y) + 2px),
             calc(50% - (var(--arch-w)/2) + 2px) 100%, var(--arch-w) var(--arch-h);
  mask-position: left top, center top, right top, center var(--arch-y);
  mask-composite: add; -webkit-mask-composite: source-over;
}
```

---

## 7. Open questions / gaps

1. `--arch-w` tweens from `"36vw"` to the unitless string `"125"` (pretty `:66`). How GSAP resolves the unit for a CSS custom property here (keeps `vw`? drops it and the `calc()` in `mask-size` becomes invalid?) was not verified at runtime — the arch also moves to `-100vh` so it leaves the viewport regardless.
2. Actual runtime durations were derived from the timeline math, not measured in a browser (no headless run performed). Timeline positions like `"<25%"` after a zero-duration `.add()` callback were interpreted per GSAP semantics but not observed.
3. WebM codec/alpha specifics (VP9 with alpha assumed from the HEVC `.mov` pairing and transparent flower posters) were not probed with ffprobe.
4. Fonts: which/how many woff2 files Typekit kit `pig8glj` serves and their bytes were not enumerated.
5. Other pages (e.g. residences/detail pages) may load Swiper (`initCarousel` references `new Swiper` but Swiper is not on `/`); not fetched.
6. Lighthouse / real transfer sizes with compression were not measured; sizes above are uncompressed `Content-Length` values.

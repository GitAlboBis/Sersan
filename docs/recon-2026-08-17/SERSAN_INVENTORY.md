# SERSAN repo inventory — preloader + effect gating (READ-ONLY, HEAD e31925e, 2026-08-17)

Stack confirmed from `package.json`: next 16.2.6, react 19.2.4, three 0.184.0, @react-three/fiber 9.6.1, drei 10.7.7, @react-three/postprocessing 3.0.4 (postprocessing 6.39.1), gsap 3.15, lenis 1.3.23, zustand 5.0.14, leva (dev only). Build flag `NEXT_PUBLIC_WEBGPU=1` in `.env.local` (gitignored; "shipping" per memory notes — Vercel value NOT verifiable from repo, see §7).

Every claim below carries `file:line`. Paths are relative to `C:/Users/alber/Sersan/`.

---

## 1. PRELOADER TODAY

Component: `src/components/fx/preloader.tsx` (962 lines). Backdrop: `src/components/fx/preloader-tunnel.ts` (raw WebGL1, no three import — `preloader-tunnel.ts:8-12`). Handoff store: `src/webgl/store/introStore.ts`. Warm signal: `src/webgl/PipelineWarmup.tsx`.

### 1.1 Mount & lifecycle (state machine)

| State | Trigger | Ref |
|---|---|---|
| **Not rendered (SSR / first client paint)** | `mounted=false` → returns `null` | `preloader.tsx:172,784` |
| **Decide** | mount effect: reads `matchMedia("(prefers-reduced-motion: reduce)")`. RM ⇒ `useIntroStore.complete()` immediately, `active=false`, never renders. Else `active=true`. | `preloader.tsx:199-212` |
| **Armed / counting** | effect `[active]`: creates tunnel (or 2D starfield fallback), locks scroll (`html.style.overflow=hidden` + `lenis.stop()` re-asserted per rAF), arms readiness signals, starts ONE rAF loop | `preloader.tsx:215-574` |
| **Reveal** | when `target >= 1 && round(current*100) >= 100` → `revealed=true; reveal()` | `preloader.tsx:547-553` |
| **Hand-off choreography** | `reveal()`: `introStore.complete()` FIRST (`:595`) → GSAP timeline: fold open→closed 0.62s (`:647-651`), ghost fade (`:652-658`), divider in (`:661-667`), **tunnel warp `setTargetTimeCoef(100)` at t=0.62** (`:675-681`), mark zoom scale 1→4 + blur 0.78s power2.in from 0.66 (`:692-704`), lit+readout fade (`:705-714`), divider streaks (scaleY 6, y 120, cyan) (`:720-734`), **whole overlay opacity→0 over FADE_DURATION 0.7s from t=0.74** (`:741-750`) → `finish()`: restoreScroll + `setActive(false)` unmount (`:597-607`) |
| **Watchdog** | `setTimeout(WATCHDOG_MS=14000)`: if not revealed → `complete()`, restoreScroll, `setActive(false)` (no wipe, honest counter left where it was) | `preloader.tsx:103,583-589` |
| **Teardown (HMR / unmount)** | cancel rAF, timers, `tunnel.dispose()`, kill tweens; if not revealed → restoreScroll + `complete()` | `preloader.tsx:763-781` |

Exit type: **crossfade + zoom-through + warp** (no wipe, no curtain) — `preloader.tsx:47-58, 736-750`. Lands directly on the hero; `SignatureLine` listens for `introComplete` false→true and re-kicks `uReveal` 0→1 after 60ms (`src/webgl/SignatureLine.tsx:542-567`). `HeroTextParticles` entry ("Sersan AI" assemble, 3.6s) starts on the preloader lift (`HeroTextParticles.tsx:6-11,52`); `HeroIntroGate.canEngage` requires `intro.introComplete` (`hero-intro-gate.tsx:128-133`).

### 1.2 What it waits for (progress model)

Real readiness, NOT a fixed timeline (`preloader.tsx:36-44`). Four weighted signals, `targetFraction()`:

```
resolved = fonts?0.30 + load?0.29 + tier?0.29 + warm?0.12
allReady && elapsed>=MIN_VISIBLE_MS(700) → 1  else min(resolved, 0.9)
```
`preloader.tsx:432-453`.

| Signal | Source | Bounded fallback |
|---|---|---|
| `fonts` | `document.fonts.ready` | self-resolves after `FONTS_MAX_MS=3000` (`:94,463-474`) |
| `load` | `document.readyState==="complete"` or window `load` | `LOAD_MAX_MS=3500` (`:95,479-491`) |
| `tier` | `useTierStore.resolved` (set by CanvasHost effect) | none needed (sync) (`:498-503`) |
| `warm` | `introStore.warmReady` — set ONLY by `PipelineWarmup` inside the Canvas after 28 consecutive frames with delta<0.09s AND ≥2000ms since first frame | **NONE** — only the 14s watchdog (`PipelineWarmup.tsx:29-33,46-56`; `preloader.tsx:439`) |

Displayed counter: `current += (target-current)*COUNTER_EASE(0.12)` per rAF, snapped to 1 when target≥1 && current>0.99 (`:106,524-528`). Counter is capped at 0.9 until warm (`:452`) so it visibly holds ~88% during shader compile. Fill: SVG `<clipPath>` rect width = `VB_W*current` (`:534-536`). Digits: `setDisplay(pct)` React state per frame (`:530-531`).

**Consequence worth flagging:** on `tier==="off"` WITHOUT reduced motion (i.e. WebGL context unavailable), the Canvas never mounts (`CanvasHost.tsx:32`) → `PipelineWarmup` never runs → `warm` never flips → the counter parks at ~88% and the overlay only lifts at the **14s watchdog**. Docblock at `preloader.tsx:39-40` claims "on off there's no scene to wait on" but the code has no `tier==="off" ⇒ warm=true` shortcut. (Grep: `setWarmReady` has exactly one caller — `PipelineWarmup.tsx:55`.)

Assets: the preloader does **not** wait on the GLB, textures, or any drei `useProgress`/`LoadingManager` (grep: zero hits for `useProgress|LoadingManager|DefaultLoadingManager` in `src/`). `heroReady` is explicitly NOT a gate (`preloader.tsx:492-497`).

Min duration: `MIN_VISIBLE_MS=700` (`:84,448`). Max: 14s watchdog (`:103`).

### 1.3 Visuals

- Backdrop: WebGL1 particle tunnel (`createPreloaderTunnel(canvas)` `:235-237`), 50k additive soft-sprite points looping in z, pointer tilt ±0.05, zoom-blur post pass (24 taps) whose strength = `timeCoef*0.004`; `timeCoef` lerps 0.02/frame toward target; during load target = `1 + current*2` (`:567`); at reveal → 100 (THE WARP) (`:675-681`; `preloader-tunnel.ts:14-21,496-573`).
- Fallback: if `canvas.getContext("webgl")` is null → 2D-canvas starfield (320 stars, nebula glows) on the same canvas (`preloader.tsx:239-361`; `preloader-tunnel.ts:310-338`).
- Mark: inline SVG of the SERSAN mark (two S paths + divider) in an OPEN 90°-rotated pose = the progress bar; ghost + lit(gradient, clipped) layers (`:114-154, 789-957`).
- Readout: mono `%` + "Initialising signal" (EN only, not localised) + "52. SERSAN" corner tag (`:810-818, 934-956`).
- Overlay `fixed inset-0 z-[100] bg-bg aria-hidden` (`:790-794`).

### 1.4 Route change / repeat visit / RM

- Lives in root layout as child of `SmoothScrollProvider` (`src/app/layout.tsx:217`) → App Router never remounts it on soft nav → shows **once per hard load** (`preloader.tsx:6-8`; `introStore.ts:18-20`). Soft navs use `template.tsx` curtain wipe (0.62s clip-path) (`src/app/template.tsx:62,86-130`) or the navbar cover twin.
- **Repeat hard visit: no persistence** — no `sessionStorage`/`localStorage` in preloader (grep confirms; the only session flag in the repo is `sersan_skip_intro` for the hero gate — `src/lib/intro-skip.ts:33`). Every hard load replays the full loader.
- RM: overlay never mounts, `introStore.complete()` fires immediately, no scroll lock (`:65-67, 201-210`).

### 1.5 EXACTLY what differs on mobile / coarse / low tier

The preloader itself has **no `pointer: coarse` or tier gate** — the same overlay + tunnel + choreography runs on phones. Differences come only from inside the tunnel module and from what the Canvas mounts:

| Axis | Gate (quoted) | Effect |
|---|---|---|
| Point count | `const small = window.innerWidth < 768 \|\| (navigator.hardwareConcurrency \|\| 8) <= 4; const count = small ? COUNT_SMALL : COUNT_DESKTOP;` (`preloader-tunnel.ts:349-351`, 14000 vs 50000 `:92-93`) | Narrow phones get 14k points; a coarse tablet ≥768px with >4 cores gets the full 50k. |
| Canvas DPR | `Math.min(window.devicePixelRatio \|\| 1, DPR_CAP)` DPR_CAP=1.5 (`preloader-tunnel.ts:94,482`); starfield fallback caps at 2 (`preloader.tsx:269`) | Same on desktop and mobile. |
| Zoom-blur FBO pass | always attempted; skipped only if FBO incomplete (`preloader-tunnel.ts:411-414,475-477,556`) | Full-screen 24-tap post pass on phones too. |
| Pointer tilt | `pointermove` listener always installed for the preloader (`tilt` default true) (`preloader-tunnel.ts:346,442-444`) | On touch, only fires during touch-drag on the locked page. |
| `warm` signal | `PipelineWarmup` mounts on any non-off tier (`Scene.tsx:308`) — same 28-smooth-frames/2s rule | Phone (lite) still resolves warm normally; slower compiles → longer hold at 88%. |
| No-WebGL device (`tier off`, not RM) | see §1.2 consequence | 14s hold. |
| RM | `preloader.tsx:201-210` | Skipped entirely. |

There is no "lite preloader" or reduced-choreography path for phones; the same GSAP fold/zoom/streak runs.

---

## 2. TIER SYSTEM (`src/webgl/store/tierStore.ts`)

State fields (`tierStore.ts:26-86`): `tier: "full"|"lite"|"off"`, `phoneGL: boolean`, `resolved`, `backend: "webgpu"|"webgl2"|null`, `dprInitial/dprMin/dprMax`, `dprCap: number|null`, `heroReady`.

Resolution: `CanvasHost` effect calls `resolve()` once on the client (`CanvasHost.tsx:28-30`); `resolve()` writes tier + phoneGL + dpr range in ONE `set()` (`tierStore.ts:225-238`). `backend` is written once from `Scene.tsx` `onCreated` via `backendOf(gl)` (`Scene.tsx:285-295`; `createRenderer.ts:126-142`).

### 2.1 Detection (quoted)

**`detectTier()`** (`tierStore.ts:88-103`):
```ts
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
probe webgl2 ?? webgl; if (!gl) return "off";
const coarse = window.matchMedia("(pointer: coarse)").matches;
if (coarse || window.innerWidth < 768) return "lite";
return "full";
```
Note: `tier` is decided by pointer type + width only — **GPU class is NOT consulted for tier** (`tierStore.ts:12-19` docblock: tier = "which DOM LAYOUT to serve").

**`detectPhoneGL()`** (`tierStore.ts:129-150`) — MAY a coarse device mount decorative islands:
```ts
if (matchMedia("(pointer: fine)").matches) return false;
if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
cores = navigator.hardwareConcurrency; if (cores>0 && cores<=4) return false;   // = SEQ.LITE_MIN_CORES
mem = navigator.deviceMemory; if (mem>0 && mem<4) return false;                 // absent on iOS → passes
gl = webgl2 probe; if (!gl) return false;
r = WEBGL_debug_renderer_info UNMASKED_RENDERER (or "")
deny: /mali-[tg](3|5|7)\d/i, /adreno \(tm\) (4\d\d|5[0-3]\d)\b/i, /powervr (ge|g6)/i → false
return true;
```
Deny-list of pre-2020 tile GPUs; unknown 2026 phone passes (`:116-121`). `cores<=4` flagged as an OPEN QA ITEM never reconciled on a real handset (`:122-127`).

**`detectGpuClass()`** (`tierStore.ts:163-180`): renderer string regex — `/adreno|mali|powervr|qualcomm/i` → weak; `/intel|\bUHD\b|Iris/i` → mid; else strong (Apple GPU / hidden string → strong). Used ONLY for DPR range on fine pointers.

**`detectDprRange()`** (`tierStore.ts:189-213`):
```ts
device = min(devicePixelRatio, 2); clamp = n => min(device, n)
if (matchMedia("(pointer: coarse)").matches) return {initial:1.0, min:1.0, max:1.5}   // every touch device, before GPU class
weak → {1.0, 1.0, 1.5}; mid → {1.25, 1.0, 1.75}; strong → {2.0, 1.0, 2.0}
```

**`degrade()`** (`tierStore.ts:239-248`): full→lite; lite→off (+phoneGL false). **No callers** — grep `degrade(` in src: only definition + docs (backlog A7 `IMPROVEMENT_BACKLOG.md:45-46`; `MOBILE_AUDIT.md:280` D-20). `AdaptiveResolution` never calls it; drei `PerformanceMonitor` is only wired to DPR steps.

`backend`: `"webgpu"` iff `renderer.backend` exists AND `backend.isWebGLBackend !== true` AND `typeof renderer.compute === "function"` (`createRenderer.ts:126-142`). Plain WebGLRenderer (flag OFF) → `"webgl2"`.

`dprCap`: written by the singularity passage (`singularity-passage.tsx:1318` desktop `SEQ.DPR_CAP`; `:875` phone `SEQ.LITE_DPR_CAP=1`), consumed by `AdaptiveResolution` as `min(max, cap)` (`AdaptiveResolution.tsx:52-66`).

### 2.2 Resulting matrix

| Profile | tier | phoneGL | dpr initial/min/max | backend (flag ON) | Notes |
|---|---|---|---|---|---|
| Desktop, fine, ≥768, strong GPU, motion OK | full | false | 2/1/2 (clamped to device) | webgpu if `navigator.gpu` + init OK, else webgl2 fallback | Everything |
| Desktop, fine, Intel/UHD | full | false | 1.25/1/1.75 | same | Same effects, lower start DPR |
| Desktop, fine, ARM/Adreno (Snapdragon X) or any Apple GPU string? | full | false | weak→1.0/1/1.5; **Apple GPU → strong 2/1/2** | same | Apple string not matched by weak/mid regex (`:194-201`) |
| Desktop **narrow window <768**, fine | **lite** | false | per GPU class | | Layout tier flips to lite by width alone |
| Phone/tablet, coarse, capable (>4 cores, ≥4GB or iOS, not deny-listed) | lite | **true** | 1.0/1.0/1.5 | webgpu on Chrome-Android / Safari 26+ with WebGPU; else webgl2 | Gets NeuralLattice (compact) in addition to lite set |
| Phone, coarse, low (≤4 cores, <4GB, or deny-listed GPU) | lite | false | 1.0/1.0/1.5 | | lite set only; SVG neural fallback |
| Any, `prefers-reduced-motion` | **off** | false | — | — | No Canvas at all (`CanvasHost.tsx:32`) |
| Any, no WebGL context | off | false | — | — | No Canvas; preloader 14s watchdog (§1.2) |

---

## 3. EFFECT MATRIX

Legend: **D** = desktop full tier; **P+** = capable phone (`tier lite, phoneGL true`); **P−** = low phone (`lite, phoneGL false`); **RM** = reduced motion (`tier off`). "flag" = `webgpuEnabled()` build-time (`createRenderer.ts:48-51`), currently ON locally. "wgpu" = runtime true-WebGPU compute backend.

| # | Effect / feature | Where | D | P+ | P− | RM | Gate (file:line) | Fallback |
|---|---|---|---|---|---|---|---|---|
| 1 | Persistent R3F Canvas | `CanvasHost.tsx` | ✓ | ✓ | ✓ | ✗ | `if (!resolved \|\| tier === "off") return null` `CanvasHost.tsx:32` | DOM only |
| 2 | Preloader overlay + WebGL1 tunnel | `fx/preloader.tsx` | ✓ 50k pts | ✓ 14k pts (<768) | ✓ 14k | ✗ | RM `preloader.tsx:201-210`; count `preloader-tunnel.ts:349-351` | 2D starfield if no WebGL1 (`preloader.tsx:242`) |
| 3 | Signature line (tube + scroll draw-in) | `SignatureLine.tsx` | ✓ 640 seg / 8 radial, breath, comet, lookAt, roll, orbit, dolly, parallax | ✓ **320 seg / 6 radial**, no breath (`uBreath=0`), no lookAt/roll/orbit/parallax, dolly ×0.5 | same as P+ | ✗ | `SignatureLine.tsx:205-211, 747, 779, 810, 1063, 1200, 1310` | — |
| 4 | Drift particles (bg dust) | `DriftParticles.tsx` | 3000 | **800** | 800 | ✗ | `COUNT = { full: 3000, lite: 800 }` `DriftParticles.tsx:42,151` | — |
| 5 | Hero logo (SERSAN mark) — spores mode | `HeroLogo.tsx` | spores 192² (36,864) if wgpu; static 448² otherwise | mounted on lite too (`Scene.tsx:147`); spores **128² (16,384) ×1.22 radius** if wgpu, else static 224² | same | ✗ | mount `Scene.tsx:140-148`; wgpu probe `HeroLogo.tsx:661-694`; sizes `gpgpuConfig.ts:126-129, 278-285`; `HeroLogo.tsx:396-398, 477, 516` | static particle mark; on lite morph inactive → `flight=1` rest pose `HeroLogo.tsx:868-871` |
| 6 | Hero text particles ("Sersan AI" intro) + HeroIntroGate scroll hijack | `HeroTextParticles.tsx`, `fx/hero-intro-gate.tsx` | ✓ 48k (wgpu only) | ✗ (compact spine has no `[data-hero-brand]`) | ✗ | ✗ | `HeroTextParticles.tsx:188, 199-213` (needs flag + wgpu + `[data-hero-headline]` + `[data-hero-brand]`); brand element only in desktop branch `cinematic-system-scroll.tsx:1376`; compact MQ `"(max-width: 768px), (pointer: coarse)"` `:91`; gate `canEngage` needs `morph.active` `hero-intro-gate.tsx:128-133` | DOM hero cascade shown directly (`textMorphStore active:false, domReveal:1` `HeroTextParticles.tsx:393`) |
| 7 | Home eclipse (HomeSingularity, raymarched hole behind brand) | `HomeSingularity.tsx` | ✓ (wgpu, and only while morph active) | ✗ | ✗ | ✗ | `pathname==="/" && tier==="full" && webgpu` `Scene.tsx:424`; wgpu + `!morph.active → hidden` `HomeSingularity.tsx:259-267, 376` | nothing |
| 8 | Passage singularity (SequenceSingularity, mid-page plunge) | `SequenceSingularity.tsx` + `sections/singularity-passage.tsx` | ✓ raymarch + one-shot 6.9s plunge + tunnel crossfade + dprCap 1.5 | **CSS 1/d hole + veil + cover + WebGL1 point tunnel at warp 60, scrub-linked, DPR cap 1 on canvas** | same but **tunnel dropped if `cores<=4`** → CSS-only | static section 05 + gradient spacer | `Scene.tsx:454-456`; phone branch `singularity-passage.tsx:573`(`!c.desktop \|\| !c.fine`), `tunnelDead` `:732-736, 822-833`; DPR cap `:875` (`SEQ.LITE_DPR_CAP=1` `seqStore.ts:371`); RM `:532` | CSS imposter on desktop when march not live (`:156-161`) |
| 9 | Rail card planes (case-studies) | `RailPlanes.tsx` | ✓ (flag; TSL) | ✗ | ✗ | ✗ | `pathname==="/" && tier==="full" && webgpu` `Scene.tsx:331`; internal `railStore.pinned` | DOM rail native scroller (`case-studies-rail.tsx:344-350` mode native on ≤768/coarse/RM); DOM DoF blur full-only `:445` |
| 10 | Founders portrait morph | `FounderPortraitMorph.tsx` | ✓ (needs `backend==="webgpu"` + roomy ≥1024×780) | ✗ | ✗ | ✗ | `Scene.tsx:344`; `founders-rail.tsx:667-677` (`tier==="full" && backend==="webgpu"`); `FounderPortraitMorph.tsx:402,453` | horizontal DOM rail / native snap rail + `useCentreFocus` colour reveal on touch (`founders-rail.tsx:702-706`) |
| 11 | Neural lattices ×2 (problem/production) | `NeuralLattice.tsx` | ✓ 9000 | **✓ 3200 (compact)** | ✗ | ✗ | `pathname==="/" && island && webgpu`, `island = tier==="full" \|\| phoneGL` `Scene.tsx:217-218, 368-373`; count `NeuralLattice.tsx:141-142`; compute only on wgpu `:127-132, 452` | SVG neural graph (`use-neural-lattice-fallback.ts:37-43` = exact complement) |
| 12 | Gateway portal / route ritual logo (RouteHero) | `GatewayPortal.tsx`, `RouteHero.tsx` | ✓ 2 rim lights | ✓ **1 rim light** | ✓ | ✗ | mounted all non-off tiers `Scene.tsx:156-158, 177-188`; fill light `tier==="full"` `RouteHero.tsx:468` | — |
| 13 | Post-FX (bloom/vignette/grain + pointer fluid) | `PostFX.tsx` (flag OFF) / `PostFXNodes.tsx` (flag ON) | ✓; fluid needs fine pointer & !RM | ✗ | ✗ | ✗ | `tier === "full" && (webgpuEnabled() ? PostFXNodes : PostFX)` `Scene.tsx:487-492`; fluid `PostFXNodes.tsx:178-181` | none — lite has NO bloom (`PostFXNodes.tsx:88-92`); everything emissive >1.0 renders unbloomed |
| 14 | Adaptive resolution (drei PerformanceMonitor) | `AdaptiveResolution.tsx` | ✓ within [1,2] | ✓ within [1,1.5] | same | ✗ | mounted always `Scene.tsx:304`; bounds `[48,58]` fps, step 0.25, climb hysteresis 8s `AdaptiveResolution.tsx:68-107` | — |
| 15 | Custom cursor (2D canvas sparks) | `fx/custom-cursor.tsx` | ✓ | ✗ | ✗ | ✗ | `matchMedia RM \|\| "(pointer: coarse)" → return` `custom-cursor.tsx:89-97` | native cursor |
| 16 | Pointer tracking store (feeds cursor, fluid, hero hover, camera parallax) | `store/pointerStore.ts` | ✓ | ✗ | ✗ | ✗ | `installPointerTracking` no-op on RM/coarse `pointerStore.ts:112-118` | hero uses `MOUSE_OFF` |
| 17 | Magnetic CTAs | `ui/magnetic.tsx` | ✓ | ✗ | ✗ | ✗ | `magnetic.tsx:61-66` | static |
| 18 | Card tilt / sheen controller | `fx/card-tilt-controller.tsx` | ✓ | ✗ | ✗ | ✗ | `card-tilt-controller.tsx:54-59` | static; `.card-steel::after` forced off under RM `globals.css:611-618` |
| 19 | Card image distort (WebGL1 hover) | `fx/card-image-distort.tsx` | ✓ | ✗ | ✗ | ✗ | `setCanDistort(!reduced && !coarse)` `:253-255` | plain image + CSS reveal |
| 20 | Blueprint lens (/resources) | `fx/blueprint-lens.tsx` | ✓ | ✗ | ✗ | ✗ | `!(hover:hover and pointer:fine) \|\| RM → return` `:112-115`; CSS `@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion: no-preference)` `:334` | none |
| 21 | Resource preview signal plane (/resources) | `ResourcePreviewPlane.tsx` | ✓ | ✗ | ✗ | ✗ | `pathname==="/resources" && tier==="full" && webgpu` `Scene.tsx:381`; DOM card shown when `!(tier==="full" && webgpuEnabled()) && tier!=="off"` `resource-preview.tsx:167-168` (also coarse/RM `:58-59`) | DOM gradient card |
| 22 | Audit singularity hero (/audit) | `AuditSingularity.tsx` | ✓ | ✗ | ✗ | ✗ | `pathname==="/audit" && tier==="full" && webgpu` `Scene.tsx:397` | DOM hero |
| 23 | Displacement wipe reveal | `fx/displacement-wipe.tsx` | consumer-less (retired from /audit ledger `IMPROVEMENT_BACKLOG.md:117-119`) | — | — | RM bail `:159` | n/a |
| 24 | Route transitions (template curtain 0.62s + navbar cover twin + FLIP handoff) | `app/template.tsx`, `fx/flip-handoff-overlay.tsx`, `lib/use-flip-source.ts` | ✓ | curtain ✓; **FLIP ✗ on coarse** | same | ✗ (instant swap; `.transition-curtain` display:none) | curtain RM `template.tsx:88-102`; flip `use-flip-source.ts:43-44,111-112` (RM & coarse); ripple RM `flip-handoff-overlay.tsx:426-428` | instant |
| 25 | Lenis smooth scroll | `lib/lenis-singleton.ts`, `smooth-scroll-provider.tsx` | wheel-smoothed | **native touch (`syncTouch` OFF)** but Lenis instance still exists (wheel-only) | same | **no Lenis** (native scroll + store) | `smoothWheel: true` only `lenis-singleton.ts:56-84`; RM branch `smooth-scroll-provider.tsx:162-179`; RAF pumped by R3F FrameDriver `FrameDriver.tsx:98-105` | native |
| 26 | Snap engine (section settle) | `lib/scroll-snap.ts` | ✓ | ✗ (touch events ignored; <768 stacked ignored) | ✗ | ✗ (never attached) | `if (type.startsWith("touch")) return; ... if (isStackedViewport()) return` `scroll-snap.ts:194-197`, `isStackedViewport = (max-width:767px)` `:70-71`; RM `scroll-snap-sections.tsx:29` | none |
| 27 | Command palette Ctrl/⌘K | `fx/command-palette.tsx` | ✓ | ✓ (keyboard-only trigger, no coarse gate) | ✓ | ✓ | keydown listener `command-palette.tsx:88-100` | — |
| 28 | UI sounds | `fx/audio-triggers.tsx`, `lib/audio/uiSounds.ts` | ✓ (opt-out localStorage) | ✓ | ✓ | ✓ | no pointer/RM gate; gesture unlock + `audioStore.enabled` (`audioStore.ts:25-39`) | — |
| 29 | Heading choreographer / label scrambler / reveals | `fx/heading-choreographer.tsx`, `fx/label-scrambler.tsx`, `ui/reveal.tsx` | ✓ | ✓ | ✓ | static | RM checks `heading-choreographer.tsx:95`, `label-scrambler.tsx:114`, `reveal.tsx:51` | static |
| 30 | See-more portal (2D canvas particles) | `fx/see-more-portal.tsx` | ✓ dpr≤2 | ✓ dpr≤1.5 + base energy | ✓ | ✗ | `:91-104` | static |
| 31 | Compact hero spine (3 panels on 100svh sticky under 180svh) | `cinematic-system-scroll.tsx` | 315vh pinned spine + HeroHoverLayer + HeroIntroGate | CompactSpine | CompactSpine | StackedFallback (5 blocks, no pin) | mode `:1135-1141`; COMPACT_MQ `:91`; desktop-only children `:1436-1445` | — |
| 32 | Neural cards / node markers hover | `fx/neural-card.tsx:63`, `fx/neural-node-marker.tsx:63` | hover | `useCentreFocus` (`lib/use-centre-focus.ts:107-108` fine-inert) | same | static | | |
| 33 | Curl tube field haze | `CurlTubeField.tsx` | UNMOUNTED (user disliked) `Scene.tsx:25-30, 309-313` | — | — | — | | |

Note the "13 tier call sites" mentioned in docs (`MOBILE_AUDIT.md:375-378`) — the actual live `tier ===` grep is at: `CanvasHost:32`, `HeroLogo:516`, `FounderPortraitMorph:325`, `resources-client:751`, `NeuralLattice:141`, `RouteHero:468`, `case-studies-rail:445`, `tierStore:241-246`, `founders-rail:671,702`, `SignatureLine:208,211,747,779,810,1063,1200,1310`, `resource-preview:167-168`, `Scene:218,331,344,381,397,424,454,487`, `use-neural-lattice-fallback:42`.

---

## 4. RENDERER

- **Selection is BUILD-TIME**: `webgpuEnabled()` reads `process.env.NEXT_PUBLIC_WEBGPU` (`createRenderer.ts:48-51`). Flag OFF → R3F default `WebGLRenderer` with `{alpha:true, antialias:false, powerPreference:"high-performance"}` (`Scene.tsx:264-272`). Flag ON → async factory `createWebGPURenderer`: `import("three/webgpu")`, `forceWebGL = forceWebGLFlag() || !("gpu" in navigator)`, `new WebGPURenderer({canvas, alpha, antialias:false, powerPreference, forceWebGL})`, `await renderer.init()`; on throw retries `forceWebGL:true` (`createRenderer.ts:73-110`). Sub-flag `NEXT_PUBLIC_WEBGPU_FORCE_WEBGL` (`:57-60`).
- Runtime backend published once (`Scene.tsx:285-295`) → `tierStore.backend`. TSL islands additionally self-probe `backend.isWebGLBackend !== true && typeof gl.compute === "function"` (HeroLogo:685-691, HeroTextParticles:200-206, NeuralLattice:127-132, HomeSingularity:262-267, FounderPortraitMorph:402/453 via `backendOf`).
- **Post chain split is also build-time**: PostFX (EffectComposer, WebGL only) vs PostFXNodes (TSL `PostProcessing`, priority-1 `useFrame` drives `post.render()`, suppressing R3F's default render) (`Scene.tsx:465-492`; `PostFXNodes.tsx:52-64, 379-416`).
- **DPR policy**: Canvas `dpr={dprInitial}` from tierStore (`Scene.tsx:202-204, 273`); AdaptiveResolution steps ±0.25 within `[dprMin, min(dprMax, dprCap)]`, drop instant / climb after 8s (`AdaptiveResolution.tsx:33-107`). Coarse pointer hard range 1.0–1.5 (`tierStore.ts:202-204`). Passage caps: desktop `SEQ.DPR_CAP` (1.5) during plunge, phone `SEQ.LITE_DPR_CAP=1` (`seqStore.ts:371`; `singularity-passage.tsx:875,1318`).
- **Frame driver**: R3F loop `frameloop="always"` (`Scene.tsx:296`) is the single rAF: pumps Lenis (`pumpLenis`) + smoothed pointer at priority 0 (`FrameDriver.tsx:102-105`); Lenis private rAF parked via `setExternalPump(true)` and restored on `webglcontextlost` / WebGPU `device.lost` (`FrameDriver.tsx:38-92`; `lenis-singleton.ts:22-52`). CustomCursor uses `gsap.ticker` (`custom-cursor.tsx:278`); preloader owns its own rAF while visible (`preloader.tsx:510-574`); phone passage owns a rAF only while tunnel alpha>0 (`singularity-passage.tsx:789-815`).
- Canvas resize debounce `{scroll:50, resize:150}` (`Scene.tsx:283`); camera `fov CAMERA_FOV, z CAMERA_Z, near 0.1, far 200` (`:284`); clear transparent (`:286`).
- Other DPR caps by device: preloader tunnel 1.5 (`preloader-tunnel.ts:94`), starfield 2 (`preloader.tsx:269`), cursor 2 (`custom-cursor.tsx:114`), see-more portal 1.5 coarse / 2 fine (`see-more-portal.tsx:103`).

---

## 5. ASSET PIPELINE

`public/` total **1.4 MB** (`du -sh`):

| Path | Size | Format | Loaded by |
|---|---|---|---|
| `public/models/sersan-mark.glb` | **16,892 B** (the ONLY 3D asset) | plain glTF-binary, **no Draco / no Meshopt / no KTX2** (grep `DRACO|KTX2|meshopt` in src: 0 hits) | `HeroLogo.tsx:290-294` (`useGLTF.preload(MARK_GLB)` at module eval of the lazy Scene chunk → fetched on every non-off tier once Scene loads; consumed via `useGLTF` `:403` inside `<Suspense>` `Scene.tsx:146-148`); `RouteHeroLogo.tsx:47-65` (module-cached `GLTFLoader` promise, lazily imported chunk, no Suspense) |
| `public/founders/*.webp` (6 files) | 540 KB total (headshots 177/113/48 KB; portraits 95/65/40 KB) | webp | DOM `<img>` + `FounderPortraitMorph.tsx:288-296` force-loads via `new Image()` for particle sampling (desktop wgpu only) |
| `public/case-studies/*-preview.webp` (3) + `logos/*.svg` (9) | 346 KB | webp / svg | DOM + `card-image-distort.tsx` uploads to a WebGL1 texture on fine pointers (`:177-193`) |
| `public/og-image.png` | 436 KB | png | meta only |
| `src/fonts/switzer-*.woff2` (4) | ~74 KB | woff2 self-hosted via `next/font/local` (`layout.tsx:36-45`); Fraunces + JetBrains Mono via `next/font/google` (`:28-34, 47-52`) | `document.fonts.ready` is preloader signal 1 |

Procedural textures only elsewhere: black-hole disc noise (256²) + starfield (2048×1024 CanvasTexture) generated at runtime (`webgl/singularity/proceduralTextures.ts:77-121, 142-213`); preloader sprite 64² canvas (`preloader-tunnel.ts:264-301`); cursor sprites (`custom-cursor.tsx:59-82`). No HDRI/EXR, no drei `useTexture`, no `LoadingManager`. Nothing besides fonts is "preloaded" in the preloader's sense.

---

## 6. KNOWN OPEN ITEMS touching preloader / effects-on-mobile

From `MOBILE_TODO.md` (2026-08-11 handoff, HEAD):
- §1.1 B1 — hero SSR→compact height collapse never re-measures ScrollTrigger: `cinematic-system-scroll.tsx:1154` `if (prev === null || prev === mode) return;` — **still present at HEAD** (verified `:1150-1157`); same guard at `fit-section.tsx:496`, `case-studies-rail.tsx:365` (verified `:361-368`); `services-section` has none (`MOBILE_TODO.md:42-69`).
- §1.2/1.3 A1/A2 — RM desktop rail STACK pills invisible; DragRail repaints RM desktop (`MOBILE_TODO.md:71-105`).
- §2 — page mounted ≤768 then widened stays on mobile branches (`:132-147`).
- §3 NEVER MEASURED — real-phone FPS for NeuralLattice (kill switch: `phoneGL` false), passage tunnel (`tunnelDead`), 96svh hole raster memory; `hardwareConcurrency` on real handsets; Lighthouse mobile baseline 0.61 / LCP 7.6s never re-run (`:151-172`).
- §4.5 passage pacing knob `SEQ.LITE_RUN_SVH` (`:190-191`).

From `IMPROVEMENT_BACKLOG.md`:
- A5 portrait coverage mixes device vs render DPR (`:40-42`); A6 HeroTextParticles per-frame gBCR (`:43-44`); **A7 `tierStore.degrade()` has no callers** (`:45-46`); A8 binding-budget walls (`:47-50`); B12 no cookie banner (`:89-91`); B14 native instant-scroll desyncs Lenis + wedges hero (`:166-175`); C9 home section-cut grammar (`:140-142`); C14 preloader tunnel rebuild DONE 2715953 (`:157-164`) + owner "zoom+fade exit" dbd72e9 (`:187`).

From `MOBILE_HOME_SPEC.md` §4.5 (`:348-357`) — deliberate NO for phones: RailPlanes, FounderPortraitMorph, HomeSingularity ("structurally impossible" — no `[data-hero-brand]`), SequenceSingularity, PostFX ("fill-rate suicide"), with reasoning. §3.8 fallback chain (`:215-224`).

From `MOBILE_AUDIT.md`: §5 capability model (5 axes) proposed but NOT migrated — 13 `tier` call sites must move atomically (`:355-378`); D-20 degrade no callers (`:280`); Lenis `syncTouch` decision (`:380-386`); §6 perf baseline & unmeasured gaps (`:390-428`).

From `docs/QA_AUDIT_2.md`: "Defer the entire WebGL Canvas behind an IntersectionObserver" (`:43`), "Move Lenis off the global provider on mobile" (`:215`), 600vh pin heavy on mobile (`:132-133`) — older audit, partially superseded.

From `plans/2026-07-23-wow-wave.md`: lite tier "dolly only, halved; off: nothing" (`:37`) — matches `SignatureLine.tsx:747`; rail DoF skip on lite/RM/stacked (`:47`); lens desktop-only (`:66`).

Also observed in code (not in any doc): preloader waits for the full 14s watchdog on a no-WebGL, motion-OK browser (§1.2); `preloader-tunnel.ts` `small` heuristic uses `innerWidth<768` not pointer type, so a coarse tablet ≥768 gets 50k points; the preloader copy ("Initialising signal", "52. SERSAN") is EN-only; no session-persistence to shorten the loader on repeat hard loads.

---

## 7. CONFIDENCE + GAPS

**High confidence** (read in full): preloader.tsx, preloader-tunnel.ts, tierStore, introStore, fxStore, Scene, CanvasHost, AdaptiveResolution, FrameDriver, PostFX, PostFXNodes, createRenderer, smooth-scroll-provider, lenis-singleton, intro-skip, hero-intro-gate, custom-cursor, use-neural-lattice-fallback, layout, page, PipelineWarmup, GatewayPortal, IMPROVEMENT_BACKLOG, MOBILE_TODO, MOBILE_REVIEW, README.

**Medium** (targeted reads/greps only): SignatureLine (tier lines), HeroLogo, HeroTextParticles, NeuralLattice, HomeSingularity, SequenceSingularity, FounderPortraitMorph, RouteHero, DriftParticles, singularity-passage (fallback matrix + phone branch), cinematic-system-scroll (mode/MQ), template.tsx, founders-rail/case-studies-rail gates, seqStore constants, MOBILE_AUDIT/MOBILE_HOME_SPEC sections cited.

**Gaps / not verifiable from repo:**
1. Whether `NEXT_PUBLIC_WEBGPU=1` is set on the Vercel production project (only `.env.local` + memory notes say "shipping"). If OFF in prod, every TSL island (rows 6-11, 13-fluid, 21, 22) is absent and PostFX (EffectComposer) runs instead.
2. Real-device behaviour of `detectPhoneGL()` (cores/deviceMemory/renderer string) — docs explicitly say never measured.
3. Actual preloader durations on phones (how long `warm` takes with HeroLogo static/spore build + NeuralLattice compile) — no telemetry in repo.
4. `_refs/` reference snippets (gitignored) not present locally; the tunnel port's fidelity to the TroisJS pen is asserted by comments only.
5. seqStore lines 140-225 (desktop one-shot plunge constants) skimmed, not read line-by-line.

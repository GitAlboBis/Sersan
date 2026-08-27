# Dossier `local-rail` — founders-rail.tsx + foundersMorphStore.ts + HANDOFF_FOUNDER_MORPH.md (as-built, 2026-08-27)

All paths relative to the REAL repo `C:/Users/alber/Desktop/Sersan` (HEAD `f38e08f` on `main`; `~/sersan` is stale). Every number below was read from source in this session, with file:line or file:constant cited. Nothing is inferred from the screenshot (not available to me).

> **Repo state warning.** `git status` shows the four morph files **uncommitted** in the working tree: `src/components/sections/founders-rail.tsx` (+90 lines), `src/webgl/FounderPortraitMorph.tsx` (+39), `src/webgl/gpgpu/gpgpuNodeSim.ts` (+79), `src/webgl/store/foundersMorphStore.ts` (+39), `src/data/founders.ts` (+77), plus **untracked** `public/founders/alberto-headshot.webp` and `alberto-tuveri.webp` (a placeholder monogram card — HANDOFF §"Quarto target", md5 `5734284b…`). So **production (`origin/main` = `f38e08f`) still runs N=3** (Alessandro → Michele → Mattia); the working tree is N=4 (Alessandro → Michele → **Alberto** → Mattia). The HANDOFF's own merge gate says the *engine* half is byte-identical at N=3 and safe, the *content* half (Alberto entry, `WIRED_TARGETS = 4`, the two webp) must not ship until the real headshot exists and the WebGPU checklist has been run by the owner (HANDOFF lines 291-293).

---

## 0. Executive summary for the synthesis agent

1. **Layout (MORPH mode, desktop WebGPU):** one CSS-sticky 100vh frame; heading on top; a 2-column grid `lg:grid-cols-[minmax(0,26rem)_1fr]` — **left** a `3/4`-aspect stage box max 26rem wide (`[data-founder-stage]`) over which the WebGL cloud is camera-locked, **right** four absolutely-overlaid copy blocks (counter / name / role / bio / chips / previously / LinkedIn) cross-fading on the morph scalar; a bottom "gate chrome" (counter `01 / 04`, accent hairline, idle "Scroll" hint). The section has **no background of its own** (Round 7-3 removed tint + glows; the WebGL canvas is `fixed inset-0 z-0`, DOM content `relative z-[1]`).
2. **Stage driver:** NOT scroll-scrubbed. A scroll-jack gate pins the page; each discrete wheel/touch/key gesture (≥140 px accumulated) advances `morphTarget` by ±1; the island self-plays one leg in **1.4 s** (`MORPH_DURATION`) and locks; a gesture past either end releases the page. `morph` is ONE scalar 0..3; `uMorph = clamp(p,0,1)`, `uMorph2 = clamp(p−1,0,1)`, `uMorph3 = clamp(p−2,0,1)`.
3. **The cloud is effectively a FLAT plane of discs.** z-relief is capped at **4 % of face height** (`Z_RELIEF_MAX_FRAC = 0.04`, `centerZBias = 0`) because the one-particle-per-cell regular grid tears at luminance edges under perspective + depth test. Group orbit (`ORBIT_MAX 0.7 rad`), dolly (`2.2` world units) and pointer parallax (`0.18 rad`) are all multiplied by `sin(legFract·π)` — i.e. **exactly zero at every locked stage**. At rest the only motion is a sway of **0.02 rad yaw / 0.012 rad pitch** and a **0.4 % breath**. The resting face therefore reads as a halftone print, not a 3D scan — by design of the current contracts, not by accident.
4. **Empty patches on bright skin are structural to the ink model.** `ink` = luma-weighted **colour distance from the measured backdrop** (top-corner median), curved by gain 1.7 / floor 0.03 / gamma 0.62, and it drives **disc size** (`0.06 + 0.94·ink`), **alpha knee** (`smoothstep(0, 0.1, ink)`), **coverage compensation** (`cov²`) and the **Discard** (`alpha < 0.02`). The flood fill (contract 2) fixes the *mask* (scalp no longer deleted as wall), but a lit scalp/forehead/cheek whose colour is within `~0.018` of the wall still gets ink ≈ 0 → sub-pixel disc → alpha killed → discarded. HANDOFF §12 says it verbatim: *"`ink` è distanza dallo sfondo misurato, non oscurità."* No threshold tuning fixes this; contract 2 forbids chromatic gates. Any redesign must decouple **presence** (mask) from **tone/size** (luminance or a real depth map).
5. **Where background layers can go:** (a) in the same canvas as a sibling island mounted from `Scene.tsx:465` (next to `<FounderPortraitMorph>`), camera-locked to the sticky rect via the same store, at `renderOrder −1…−4` (repo's backdrop convention) so it draws *before* the depth-test-off portrait; or (b) a DOM `absolute inset-0` layer inside `[data-founders-morph-sticky]` (clipped by its `overflow-hidden`), which contradicts a design rule ("the DOM must not own section-sized ambience", founders-rail.tsx ~2247) that the owner would need to waive. Hard limits: the portrait compute kernel is at **8/8 storage buffers** — a new layer must be its own build; keep `[data-line-anchor="founders"]` measurable (no ScrollTrigger `pin`), keep the section exactly one viewport tall.
6. **Fallbacks:** `prefers-reduced-motion` ⇒ tier `off` ⇒ **no canvas at all** + native DOM snap scroller with transitions disabled; WebGL2 / unroomy viewport ⇒ horizontal DOM rail (SVG duotone reveal); capable phone with WebGPU ⇒ native scroller + touch-scrubbed cloud (≈17–19k particles).
7. **The 12 HANDOFF contracts** are listed verbatim-in-substance in §8 as hard constraints.

---

## 1. Files read

| File | Lines | What it owns |
|---|---|---|
| `src/components/sections/founders-rail.tsx` | 2468 | DOM section, three modes, the scroll-jack gate, copy choreography, touch scrub writer, horizontal-rail fallback |
| `src/webgl/store/foundersMorphStore.ts` | 328 | zustand bridge DOM ⇄ island; `STAGE_ORDER`, `WIRED_TARGETS`, `MORPH_MAX`, `LOCK_EPS`, `stageFromMorph`, `legOf`, `legFract`, `foundersGateApi` |
| `src/webgl/FounderPortraitMorph.tsx` | 1277 | The WebGL island: loads headshots, samples, fits to stage, builds the GPGPU cloud, per-frame clock/placement/orbit, dev handle |
| `src/webgl/image/sampleImagePoints.ts` | 469 | Sampler: shared grid, backdrop median, border flood fill, ink curve, union cell list, stride, jitter, z-relief, extent |
| `src/webgl/gpgpu/gpgpuNodeSim.ts` | 2260 | `createTextMorphComputeBuild` (compute kernel + instanced-quad render material, portrait extension), `unifiedForceStep` |
| `src/webgl/Scene.tsx`, `CanvasHost.tsx`, `constants.ts`, `PostFXNodes.tsx`, `store/fxStore.ts`, `store/tierStore.ts`, `store/founderMotion.ts`, `store/sectionStore.ts` | — | mounting, stacking, camera constants, bloom threshold, tier/backend gating, section cuts |
| `HANDOFF_FOUNDER_MORPH.md` | 295 | the 12 contracts + N=4 addendum |
| `.trellis/spec/frontend/webgl-island-guidelines.md` | — | binding island rules (varying trap, backend probe, matchMedia subscription, "tone not density") |
| `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | — | section order, z-stacking, colour tokens |

---

## 2. Section layout (DOM), MORPH mode — founders-rail.tsx:2295-2428

Rendered only when `canMorph` (see §4). Structure, outer → inner:

```
<section id="founders" class="relative scroll-mt-24">
  <div data-cut-edge="top" aria-hidden />                       ← section-cut driver marker (TASK 6)
  <div ref=sectionRef class="relative" style="min-height:100vh"> ← measure() sets height = innerHeight px, travel = 0
    <div ref=stickyRef data-founders-morph-sticky
         class="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
      <div class="container-px relative w-full">
        <div class="mb-8 max-w-2xl sm:mb-10">{heading()}</div>   ← SectionHeading, reveal="blur"
        <div class="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <!-- LEFT: the stage -->
          <div data-founder-stage class="relative mx-auto aspect-[3/4] w-full max-w-[26rem]">
            ×STAGE_TOTAL <img data-founder-media style="opacity:0"
                 class="absolute inset-0 h-full w-full rounded-lg object-cover"
                 src={f.image} alt="{name}, {role}">          ← static POSTER fallback, kept in a11y tree
          </div>
          <!-- RIGHT: the copy -->
          <div class="relative min-h-[26rem]">
            ×STAGE_TOTAL <div ref=copyRefs[i] class="absolute inset-x-0 top-0" style={i>0 ? opacity:0}>
              <FounderCopy …/>                                  ← counter, h3 name, role, bio, chips, previously, LinkedIn
            </div>
          </div>
        </div>
      </div>
      <!-- gate chrome -->
      <div data-founders-chrome aria-hidden class="pointer-events-none absolute inset-x-0 bottom-0 z-10" style="opacity:0">
        <div class="container-px flex items-end gap-6 pb-7 sm:gap-8 sm:pb-8">
          <span data-founders-counter class="text-[1.5rem] …">01</span><span>/ 04</span>
          <div class="relative mb-[0.3rem] h-px max-w-[16rem] flex-1 bg-[hsl(var(--rule))]">
            <div data-founders-line class="absolute inset-0 origin-left bg-[hsl(var(--accent))]" style="transform:scaleX(0)"/>
          </div>
          <span data-founders-hint style="opacity:0">Scroll | Scorri</span>
        </div>
      </div>
    </div>
  </div>
  {closing}   ← CTA row: "Read by one of us, not a queue…" + link /about "Full team bios"
  <style>{PORTRAIT_CSS}</style>
</section>
```

**Copy block anatomy** (`FounderCopy`, founders-rail.tsx:321-397) — `flex flex-col gap-4`:
- counter `01 / 04` — `font-mono text-[10px] tracking-[0.16em] uppercase text-ink-dim tabular-nums`
- `<h3 class="font-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[0.95] text-ink">{name}</h3>`
- role `<p class="mt-2 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-mute">`
- shortBio `<p class="max-w-[52ch] text-[13px] sm:text-[14px] text-ink-mute leading-relaxed">`
- credential chips `<ul class="flex flex-wrap gap-1.5">` with `CHIP_CLASS = "inline-flex items-center rounded-full border border-[hsl(var(--ink)/0.18)] bg-[hsl(var(--bg)/0.55)] px-2.5 py-1 backdrop-blur-sm"` and a 1×1 accent dot
- "Previously" chips (only Michele has `previouslyAt`) — hence 6 children for Michele vs 5 for the others (the writer computes `dur` per block, founders-rail.tsx ~905)
- LinkedIn pill `rounded-full border … bg-[hsl(var(--bg)/0.6)] px-4 py-2 font-mono text-[11px] … backdrop-blur`

**Heading copy** (founders-rail.tsx:2147-2179): eyebrow EN "Founder-led software, AI & automation" / IT "Software, AI e automazione, guidati dai fondatori"; title "Built by the people who *build and run it.*" / "Costruito dalle persone che *lo realizzano e lo gestiscono.*"; description "You work with the builders." + `POSITIONING.accountabilityLong`.

**Stacking / colour context**
- `CanvasHost.tsx:35` — the single persistent WebGL canvas is `<div aria-hidden class="pointer-events-none fixed inset-0 z-0">`; `layout.tsx:329` wraps all content in `relative z-[1]`. **The cloud paints BEHIND the DOM.** Any DOM element with a background occludes it — the chips/LinkedIn have 55–60 % navy + backdrop-blur, the section itself is transparent.
- Tokens (`globals.css:17-35`): `--bg: 216 51% 9%` (#0B1422), `--ink: 220 38% 97%`, `--accent: 189 100% 62%` (#3BE1FF).
- Round 7-3 comment (founders-rail.tsx ~2247, repeated in all three variants): *"tint + glows removed in all THREE layout variants … The DOM must not own section-sized ambience; the portrait morph + rail chrome carry the band."*
- Home order (`page.tsx:55-110`): … `services` → **`founders`** → `process` (FixedScopeStrip) → `fit` → `gateway` → `final-cta`. `sectionStore.ts:346-348`: cut S7 `services→founders` style "frost" (`windowVh 1.0, amp 1.0, dolly 0.25, roll 0.004, spike 0.35`) and S8 `founders→process` style "tech-light" (`windowVh 0.8, amp 0.6, dolly 0.2`). The gate waits for S7's sweep (`u ≥ 0.98`) before engaging on the down approach (`GATE_WAIT_FOR_CUT = true`, founders-rail.tsx:141).
- `page.tsx:85` wraps the section in `<div data-line-anchor="founders">` — the SignatureLine waypoint. **This measurement must survive any redesign** (no pin-spacers, no height games — founders-rail.tsx ~1108-1120).

**How the cloud is registered to the stage** (FounderPortraitMorph.tsx, build + useFrame):
- Build measures `[data-founders-morph-sticky]` top and `[data-founder-stage]` rect once per `measureVersion`: `stageRect = { offsetY: sr.top − stickyTop, baseVpX: sr.left, w, h }`.
- Per frame (no rect reads): `stickyVpTop = clamp(scrollY, secTop, secTop+travel) − scrollY`; `vpY = stickyVpTop + offsetY`; `cx = baseVpX + w/2`, `cy = vpY + h/2`; group position `= ((cx − vw/2)·k, (ih/2 − cy)·k, −(CAMERA_Z − dolly))` rotated by `camera.quaternion` and added to `camera.position`, with `k = WORLD_VIEW_HEIGHT / ih`.
- `constants.ts`: `CAMERA_FOV = 50`, `CAMERA_Z = 12`, `WORLD_VIEW_HEIGHT = 2·tan(25°)·12 ≈ 11.19` world units per viewport height.
- Fit: `worldPerGrid = min(stageW·worldPerPx·0.92 / (2·halfX), stageH·worldPerPx·0.92 / (2·halfY))` (`STAGE_FILL = 0.92`); measured halfExtents ≈ `[[136,134],[129,137],[136,135]]` grid px, X-bound.
- Culling: `if (vpY + h < −120 || vpY > ih + 120)` → `group.visible = false`, `uFade = 0`, **no compute dispatch** (`CULL_PAD = 120`).
- In-view fade: `edge = min(1, (ih − vpY)/ramp, (vpY + h)/ramp)`, `ramp = 0.28·ih`, damped at rate 8.

---

## 3. Presentation modes and their predicates — founders-rail.tsx:665-830

```ts
// mode detection is a live matchMedia SUBSCRIPTION (D-18), lines 810-832
modeQs = [ "(max-width: 768px)", "(pointer: coarse)", "(prefers-reduced-motion: reduce)" ]
mode   = modeQs.some(matches) ? "native" : "pinned"
roomy  = "(min-width: 1024px) and (min-height: 780px)"
detected = true after first sync

canMorph = detected && mode==="pinned" && roomy && tierResolved && tier==="full"
           && backend==="webgpu" && !morphFailed                        // lines 726-739
morphUndecided = detected && mode==="pinned" && roomy && tierResolved && tier==="full"
           && backend===null                                            // lines 760-766 → rail MARKUP, machinery not armed
islandsTouch = RAIL_ISLANDS_TOUCH && tier!=="full" && fxBudget.level>=2 && backend==="webgpu"  // lines 784-790
```

`tierStore.ts`: `detectTier()` → `"off"` if `prefers-reduced-motion` or no WebGL (line 203); `"lite"` if `(pointer: coarse)` or `innerWidth < 768` (217-218); else `"full"`. `backend` is written once from `Scene.tsx onCreated` via `backendOf(gl)`; `null` until then and **must be treated as "not webgpu"** (island guideline "capability-dependent DOM layouts gate on the RESOLVED backend").

| Mode | Predicate | Visual | Where |
|---|---|---|---|
| **1 MORPH** | `canMorph` | sticky 100vh stage + WebGL cloud + copy cross-fade + gate chrome | JSX 2295-2428, effect 844-1720 |
| **2 HORIZONTAL RAIL** | `detected && mode==="pinned" && !canMorph && !morphUndecided` (WebGL2, unroomy viewport, lite tier on a fine pointer, or `morphFailed`) | sticky `h-screen` filmstrip `<ul>` translated by ONE ScrollTrigger (`start "top top"`, `end "bottom bottom"`, height = `innerHeight + track.scrollWidth − vw`); per panel: SVG duotone base (`grayscale(1) brightness(.85)` + navy 35 % rect) under a **feTurbulence/feDisplacementMap-boiled circle mask** (`baseFrequency 0.035`, `numOctaves 2`, `scale 70`, `MASK 800×1000`, final r 700) that grows with rail progress (`REVEAL_END 0.55`), hover clip-path colour reveal with a 1.5 px cyan ring (`--fr-hr` registered property, 0.65 s), name counter-sweep `SWEEP_PX 150`, media counter-parallax `PARALLAX_PCT 5`, `founderCardMotion` (t, f, scale 1−0.04f, y 8f²) | JSX 2430-2467, effect 1980-2142 |
| **3 NATIVE** | `detected && mode==="native"` | `<DragRail>` overflow-x snap scroller with progress bar; cards `snap-start shrink-0 flex w-[88vw] max-w-[30rem]`, `layout="flow"` (min-height `min(78svh,46rem)`, copy in flow with its own scrim `FLOW_COPY_SCRIM`); duotone→colour reveal triggered by `[data-focus="true"]` from `useCentreFocus` (touch) — under reduced motion **every card revealed at once, transitions none** (`PORTRAIT_CSS` @media block, line 269) | JSX 2242-2293 |
| **3b NATIVE + TOUCH MORPH** | mode native && `islandsTouch` && `!morphFailed` | same DOM; passive `scroll` listener publishes `scrollLeft` + `scrub` (`j + (x−T_j)/(T_{j+1}−T_j)`, 2 px deadband → exact integer at snap rest); island `touch` prop scrubs `morphRef` directly; on `active` every `[data-founder-media]` → opacity 0 and article gets `data-morph-live` (bg transparent). Fail doors: 12 s never-live, 3 s re-live | effect 1735-1975 |

**Reduced motion specifically:** `prefers-reduced-motion` ⇒ `tier === "off"` ⇒ `CanvasHost` returns `null` (no canvas, no islands) AND `mode === "native"` ⇒ plain snap scroller, `.founder-portrait, .founder-portrait__ring { transition: none }`, `useCentreFocus` reveals all cards. There is **no reduced-motion WebGL path at all**, and no motion ever gates content (all names/bios/links are real DOM in every mode; SSR renders the pinned layout so links are in initial HTML).

**Non-WebGPU on a desktop (WebGL2 fallback):** `backend === "webgl2"` ⇒ `canMorph` false ⇒ mode 2 horizontal rail. The island `FounderPortraitMorph` itself also returns early (`backendOf(gl) !== "webgpu"`) so it never builds on WebGL2 (storage indexing no-ops there, three #31221).

**A11y failsafes inside MORPH mode:** poster grace **4000 ms** (show static poster if the cloud is not live yet — reversible); `morphFailGrace` **12000 ms** on the "never went live" latch (`everLiveRef`) → `setMorphFailed(true)` → one-way fall-through to the horizontal rail (because blocks 1..N−1 sit at `visibility:hidden` while waiting for the morph and would be unreachable). Tab is never intercepted; focus leaving the sticky frame releases the gate (`onFocusIn`, WCAG 2.4.3/2.4.7).

---

## 4. What drives stage changes — the gate state machine (founders-rail.tsx:844-1720) + store

### 4.1 Store model (`foundersMorphStore.ts`)
- `STAGE_ORDER = ["A","B","C","D"]` (line 108) — **hard cap 4**: the compute engine has exactly four home targets.
- `WIRED_TARGETS = 4` (121; **3 in production/HEAD**) — the colour/ink chain ceiling; "never raise above `STAGE_ORDER.length`".
- `MORPH_MAX = min(founders.length, WIRED_TARGETS) − 1` (128) → 3 in the tree; `STAGE_TOTAL = MORPH_MAX + 1` (131) — the counter's denominator.
- `LOCK_EPS = 0.02` (148) — "MUST stay 0.02 — `COPY_ENTER_END` is authored as 1 − LOCK_EPS".
- `stageFromMorph(m)` → the stage whose integer is within `LOCK_EPS`, else `"morphing"` (159-164). `legOf(m) = clamp(floor(m), 0, MORPH_MAX−1)`, `legFract(m) = m − legOf(m)` (168-174) — **every copy/poster window and the flight envelope are authored in leg-local space**.
- Fields: `pinned` (desktop sticky mode live), `native` (touch scrub armed), `scrollLeft`, `scrub`, `active` (island built on TRUE WebGPU — the DOM hides posters/media only on this), `gateEngaged`, `stage`, `morphTarget` (0..MORPH_MAX, stepped by ±1 only), `morphImmediate` (jump, no auto-play — used to pin the entry side), `morph` (island's live scalar), `assembleDone` (entry finished; gate refuses to step before it), `reveal` (0|1 fire-once), `hover`, `mouse {x,y}` (stage UV), `secTop`, `travel` (0 in the gate model), `measureVersion`.
- Writer/reader discipline: DOM writes from the gate/measure/pointer events, island reads `getState()` in `useFrame`; only `pinned`, `native`, `measureVersion`, `active` are read reactively. `reset()` must be called in the section's effect cleanup (store outlives routes; pinned to `globalThis.__sersanFoundersMorph` so Turbopack chunk copies share one instance).
- `foundersGateApi.current = { simulateGesture(dir), getGate() }` — dev-only, registered by the gate, proxied through `window.__sersanFounderMorph`.

### 4.2 Gate constants (founders-rail.tsx:131-205)
| Constant | Value | Meaning |
|---|---|---|
| `G_TRIGGER_PX` | 140 | accumulated wheel/touch delta that fires ONE leg |
| `G_IDLE_MS` | 160 | silence before the gate re-arms (separates gestures; the entry fling's inertia can never count) |
| `G_ENGAGE_EXIT` | 0.28 | fraction of viewport the section top must leave before re-engage is allowed |
| `GATE_WAIT_FOR_CUT` | true | down-approach engage waits for the services→founders cut to reach `u ≥ 0.98` |
| `G_MAX_ENGAGE_MS` | 20000 | max hold **since last real progress** (re-armed in `step()` only) — bounds silence, not the session |
| `G_TOUCH_FACTOR` | 2.0 | touch drag → delta multiplier |
| `COPY_EXIT_START / END / Y` | 0.02 / 0.3 / 16 px | departing block leaves early in the leg (lifts up) |
| `COPY_ENTER_START / END / STAGGER / Y` | 0.7 / 0.98 / 0.035 / 18 px | arriving block enters child-by-child late in the leg (from below) |
| `HINT_IDLE_MS` | 1200 | idle at a locked stage before "Scroll" hint fades in |
| poster window | `smoothstep(0.35, 0.65, ·)` | fallback poster cross-fade (only when `posterShown && !active`) |

### 4.3 Lifecycle
1. **Arm** (effect on `[canMorph]`): build GSAP `quickSetter` bundles per copy block (block opacity/y + per-child opacity/y; `dur = max(0.06, 0.98 − 0.7 − (kids−1)·0.035)`), poster setters, chrome setters; `measure()` → `section.style.height = innerHeight px`, `store.setLayout(0, secTop)`, `bumpMeasure()`; `setPinned(true)`; `applyStage(store.morph)`; `snapBarrier` at `secTop` for the site snap engine; subscribe to the store (re-run `applyStage` on `morph`/`active` change; hint clock on stage change).
2. **rAF `tick()`** every frame: refresh `secTop` if drifted > 0.5 px; if engaged → `lenis.stop()` re-asserted, re-snap to top when `1 < |top| ≤ 0.15·ih`, **release** if `|top| > 0.15·ih` (external scroll source: scrollbar drag, find-in-page) or `now − engageTime > 20 s`; if not engaged → `setReveal(1)` when the section peeks (`top < ih && bottom > 0`), pre-position `morphTarget` (`MORPH_MAX` immediate when fully above the viewport, `0` when fully below), engage on top-edge crossing `fromTop = prevTop > 0 && top ≤ 0` → `engage(0)` or `fromBottom = prevTop < 0 && top ≥ 0` → `engage(MORPH_MAX)`; a 600 ms "reload-landed-inside" window (from the first `active` frame) → `engage(0)`.
3. **`engage(initIndex)`**: `setGateEngaged(true)`, `setReveal(1)`, `setMorphTarget(initIndex, immediate=true)`, disarm + zero accumulator, `markTeleport()`, `lenis.scrollTo(secTop, {immediate, force})` then `lenis.stop()`, `showChrome()`.
4. **`consume(deltaPx)`** on `wheel`(capture, non-passive; deltaMode scaling 16/120)/`touchmove`: `preventDefault`, restart idle timer, absorb while `stage === "morphing"` or `!armed`, else accumulate; `≥ +140` → `step(+1)`, `≤ −140` → `step(−1)`.
5. **`step(dir)`**: return if `morphing` or `!assembleDone`; `next = stageIndex(stage) ± 1`; `next < 0` → `release(−1)`; `next > MORPH_MAX` → `release(+1)`; else `setMorphTarget(next, false)` (interior → play one leg, **stay engaged**), `engageTime = now`, `armed = false`.
6. **Island clock** (FounderPortraitMorph useFrame): `if (morphImmediate) morphRef = morphTarget`; else `step = delta / 1.4`; `morphRef = target > cur ? min(cur+step, target) : max(cur−step, target)` (clamp toward the TARGET — contract 9). Then `applyMorph(b, gc)`, `store.setMorph(gc)` if changed > 1e-4, `store.setStage(stageFromMorph(gc))`.
7. **`release(dir)`**: `setGateEngaged(false)`, `hideChrome()`, `lenis.start()`, nudge `lenis.scrollTo(secTop ± ih, {duration 0.6})`, `reBlocked` + 500 ms cooldown. Escape → `release(lastDir)`. Keys: ArrowDown/PageDown/End/Space → `step(+1)`; ArrowUp/PageUp/Home → `step(−1)` (re-arm after 320 ms).
8. **Copy choreography `applyStage(m)`** for each block `i`: `local = m − i`, `u = local + 1`; `exitT = smoothstep(0.02, 0.3, local)` → block opacity `1 − exitT`, y `−16·exitT`; each child `e = smoothstep(start_j, start_j + dur, u)` → opacity `e`, y `18·(1−e)`; `visibility:hidden` when `exitT ≥ 1 || u ≤ 0.7` (so faded blocks leave the tab order). Poster `i` opacity `= smoothstep(.35,.65,u)·(1 − smoothstep(.35,.65,local))` unless hidden. Hairline `scaleX = round(m/MORPH_MAX·512)/512`; counter `= min(round(m), MORPH_MAX) + 1` (flips at each leg midpoint).
9. **Cleanup**: kill timers, hide chrome, reset block styles to stage-0 pose, remove listeners, `clearSnapBarrier`, `foundersGateApi.current = null`, `lenis.start()` if engaged, `section.style.height = ""`, `store.reset()`.

**Key consequence for a redesign:** the stage is *time-driven inside a scroll-locked frame*. Any new ambient layer must run on the island/frame clock (`timeRef`, `env`, `restEnv`), not on scroll progress, and must be neutral/complete at every integer `morph` (the leg is allowed to interrupt-and-complete on a release).

---

## 5. The WebGL morph as built (FounderPortraitMorph.tsx + sampleImagePoints.ts + gpgpuNodeSim.ts)

### 5.1 Sampler (`sampleImagePoints.ts`)
- Assets: `loadFounder(i)` prefers `/founders/<anchor>-headshot.{webp,jpg,png}` (tight crop, 1200×1800; framing contract: skull width ≈ 559 px, top of head ≈ y 306, light uniform backdrop in the **top corners**), falls back to `founders[i].image` (the DOM poster). Only the `-headshot` file may be "washed" (contract 12).
- Grid: `GRID_W × GRID_H = 290 × 405` (5:7); touch: `× TOUCH_GRID_SCALE 0.58` → 168×235. Cover-crop centred, rasterised through a 2D canvas.
- Backdrop colour: per-channel **median** of the two **top** 14×14 corner patches (`CORNER_PATCH = 14`; `readGrid` 236-258).
- `dist_i = sqrt(0.299·dr² + 0.587·dg² + 0.114·db²)` from the backdrop colour (260-268).
- **Backdrop mask = border-seeded flood fill** (spatial, not chromatic): seeds = entire top row + left/right columns for `y < floor(0.62·gridH)` (`BG_FILL_ROW_LIMIT`), admits `dist < 0.055` (`BG_FILL_TOL`), 4-neighbour, never descends past the row limit (270-308). Rationale in code: *"A lit bald scalp and a white shirt are chromatically THE SAME as a white studio wall … Colour cannot separate them; POSITION can."*
- **Ink** (310-341): for non-masked cells, `v = clamp((dist·inkGain − inkFloor)/(1 − inkFloor), 0, 1)`, `ink = v^inkGamma · fade(y)`, with `fade = smoothstep` of `1 − (ny − fadeStart)/fadeSpan`. Defaults (`SAMPLE_SPEC_BASE`, FounderPortraitMorph.tsx): `inkGain 1.7`, `inkFloor 0.03`, `inkGamma 0.62`, `fadeStart 0.62`, `fadeSpan 0.32`, `inkCut 0.03`, `extentInk 0.15`, `depth 90` grid-px, `centerZBias 0`.
  - ⇒ ink is exactly 0 when `dist < 0.03/1.7 ≈ 0.0176`; it is ~0.19 at `dist = 0.05`, ~0.5 at `dist ≈ 0.20`, 1.0 at `dist ≥ 0.606` (before gamma/fade).
- Union cell list: a cell joins if `max_k ink_k > inkCut` (427-449); `stride = ceil(sharedCells/maxCount)` (integer cliff), `cells[j] = hits[j·stride]` (452-459). Measured N=3: **51,751 cells, stride 1** (ceiling `full: 60000`, `lite: 20000`).
- `emit` (346-401): position = cell centre + deterministic sub-cell jitter `JITTER 0.9` (hashed from the CELL index so all targets agree), y-up; `rgb` sRGB→linear; `z = (lum − 0.5)·depth + max(0, 1 − rad/0.75)·centerZBias` (centre bias is 0 → **z is luminance only**); `halfExtentX/Y` = 99th percentile of |px|,|py| over cells with `ink > 0.15`.

### 5.2 World fit & relief
- `Z_RELIEF_MAX_FRAC = 0.04`: `zNorm = min(1, 0.04·faceHeightGrid / maxAbsZ)`, `zFactor = worldPerGrid·zNorm·depthScale`. Comment: *"the resting cloud is effectively flat … adjacent cells that straddle a luminance edge receive very different z. Under perspective those neighbours separate LATERALLY, which shreds every luminance edge into a vertical comb … Verified live via `__sersanFounderMorph.setDepth()`: 0 = clean, 0.3 = visible tearing, 1 = severe comb."*
- Seed for a fresh build: scattered around homeA, radius `(0.5 + rand·1.3)·stageWorldH·0.55`, y × 0.85, z ± `stageWorldH/2`.
- Point size: `spacingDev = sqrt(stageW·dpr·stageH·dpr·0.92² / count)`; `discDev = 2.1·spacingDev`; `defPointSize = clamp(discDev·CAMERA_Z/(dpr·1.05), 10, 96)`.

### 5.3 Compute kernel (`createTextMorphComputeBuild`, gpgpuNodeSim.ts:1300-1450, `unifiedForceStep` 288-330)
- Params on the portrait path: `SPRING 52`, `DAMPING 7.5`, `MAX_SPEED 16`, `TURB 9`, `POINT_ALPHA 1.0`.
- Storage buffers: `position, velocity, homeA, homeB, homeC, homeD, start, delay` = **8 of 8** (device limit). `delay` = normalised x of homeA (left→right entry wave).
- Per particle: `r = hash(instanceIndex)`; stagger `m_k = clamp((uMorph_k − 0.55·r)/0.45, 0, 1)`; anchor `target = mix(mix(mix(hA,hB,ss(m1)),hC,ss(m2)),hD,ss(m3))`; `+ jdir·uSpread` (`jdir` = hashed unit-ish vector, z halved); entry `aw = clamp((uAssemble·1.45 − delay)/0.45)`, `target = mix(start, target, ss(aw))`.
- `transit = max(4m(1−m) over m1,m2,m3,aw)`; `turb = (sin(7y + 2.1t + 6.28r), sin(8x + 1.7t + 4.1r), 0.4·sin(5x + 5y + 1.3t))`.
- Integration: `acc = (anchor − pos)·SPRING + turb·TURB·transit`; `vel += acc·dt`; `vel *= exp(−DAMPING·dt)`; `|vel| ≤ MAX_SPEED`; `pos += vel·dt`. `dt` capped at 1/30.
- Uniforms driven per frame by the island: `uSpread = sin(legFract·π)·SPREAD_MAX(1.1)`, `uAssemble = entry (0→1 over ENTRY_DURATION 1.8 s after reveal)`, `uFade`, `uPixelRatio`, `uViewport`, `uTime`, `uDelta`.

### 5.4 Render material (gpgpuNodeSim.ts:1700-1990)
- Instanced unit quad per particle (`InstancedBufferGeometry`, `instanceCount = count`), `MeshBasicNodeMaterial`, `transparent`, `toneMapped = false`, `DoubleSide`; portrait: **`NormalBlending`, `depthTest false`, `depthWrite false`** (explicitly passed from the island). Canvas is `antialias: false` (`createRenderer.ts:109`, `Scene.tsx:372`).
- Per-target tint packed `vec4 [r,g,b,ink]` in `instancedArray(…, "vec4")` read with `.element(instanceIndex)` in the **vertex** stage (4 of 8 vertex-stage storage bindings, 4 of 8 vertex buffers).
- Vertex: `sizeNode = uPointSize·dpr·(0.06 + 0.94·ink)·(0.85 + 0.3·hash)·sizeFD / dist` (`PORTRAIT_SIZE_MIN 0.06`, `PORTRAIT_SIZE_INK 0.94`; `sizeFD ≡ 1` on the portrait path because `uSizeComp*` are pinned to 1); corner offset `clip.xy += corner·size/uViewport·2·clip.w`.
- Colour (vertex, one varying): `base = mix(mix(mix(A,B,m1),C,m2),D,m3)`; `base = mix(base, travelTint [0.16, 2.4, 3.0], clamp(speed·0.16))`; `× uPortraitEmissive` (`DEFAULT_EMISSIVE 1.18`).
- Fragment: disc `a = smoothstep(0.5, 0.34, |uv|)` (crisp edge; hero uses 0.5→0.12); `alpha = a·POINT_ALPHA·uFade·vAssemble`; `alpha *= smoothstep(0, 0.1, ink)`; `cov = clamp(diamPx/dist/covPx, 0, 1)`, `alpha *= cov²` with `covPx = max(1.25, 0.35·spacingDev)`; `Discard(alpha < 0.02)`.
- Bloom (`PostFXNodes.tsx`, `fxStore.ts:279-281`): luminance-threshold bloom, `bloomIntensity 1.1`, `bloomThreshold 1.0`, `bloomRadius 0.7` — only values > 1.0 bloom. At rest the face is `linear colour × 1.18` (≤ 1.0 for skin, only near-white pixels cross 1.0); mid-flight the travel tint (2.4/3.0 in G/B) drives the cyan bloom.

### 5.5 Group-level motion & pointer parallax (FounderPortraitMorph.tsx useFrame)
```
env     = sin(legFract(gc)·π)          // 0 at every locked stage, 1 mid-leg
restEnv = 1 − env
dolly   = env · 2.2                                            // DOLLY
yaw     = env·(0.7 + (mouse.x − 0.5)·0.18) + restEnv·sin(0.11 t)·0.02      // ORBIT_MAX, PARALLAX_MAX, REST_SWAY_YAW
pitch   = env·((0.5 − mouse.y)·0.18·0.6) + restEnv·sin(0.07 t)·0.012       // REST_SWAY_PITCH
yaw/pitch damped: THREE.MathUtils.damp(…, 6, delta)
group.quaternion = camera.quaternion × Euler(pitch, yaw, 0)
group.scale      = 1 + restEnv·0.004·sin(0.5 t)                 // REST_BREATH
```
- **Answer to "is there pointer parallax / rotation of the point cloud?"**: yes, but **only mid-flight**. `mouse` is written by a `pointermove` on `[data-founder-stage]` (mouse pointerType only; `pointerleave` sets `hover = 0`). `hover` is **written but never read** by the island (grep `\.hover` in FounderPortraitMorph.tsx: no hits). At a locked stage the parallax term is multiplied by `env = 0`, so the resting face never tracks the cursor; the only rest motion is ±0.02 rad yaw / ±0.012 rad pitch sway and a 0.4 % breath. The comment states the intent: *"the RESTING face never tracks the cursor"*, *"beyond ~0.02 rad the 'locked, crisp face' contract erodes into wobble"*. The camera is never touched (SignatureLine is the single camera authority).
- Touch island: `mouse` stays 0.5/0.5 (neutral), scale × `ihBuild/ih` for address-bar height changes.

### 5.6 Dev handle (`window.__sersanFounderMorph`, dev only; the store is `__sersanFoundersMorph`)
`getSampler()` (gridW/H, sharedCells, stride, count, maxCount, inkCut, meanInk[], meanInkSubject[], halfExtent[]), `getUniforms()` (uAssemble, uMorph, uMorph2, uMorph3, progress, uFade, uSpread, emissive, pointSize), `getStage()`, `getGate()`, `simulateGesture('up'|'down')`, `setPointSize(v)`, `setSpread(v)`, `setEmissive(v)`, `setDepth(v)` (rebuild), `setMorph(v|null)` (override), `setStage("A".."D")`, `playMorph(±1)`, `resample({inkGain, inkFloor, inkGamma, fadeStart, fadeSpan, inkCut, gridW, gridH})`, `project()`, `bbox()`. Section must be in view (culling early-returns before the clock). Use `__lenis.scrollTo(target,{duration})`, not `window.scrollTo` (crossing detection needs incremental movement); the intro blocks scroll until ESC.

---

## 6. Why the current rendering reads as "flat dithered photo with holes" — grounded in the code

1. **Flatness is a deliberate contract, not a bug.** `Z_RELIEF_MAX_FRAC = 0.04`, `centerZBias = 0`, `depthTest/depthWrite = false`, orbit/dolly/parallax × `env` (zero at rest), sway ≤ 0.02 rad. Every one of these was introduced to protect the "face must be well-defined at rest" acceptance criterion (HANDOFF line 218) on a **regular 1-particle-per-cell grid**. A real volumetric head needs a different geometric source (true depth/normal per point, or a 3D scan / depth-estimated mesh), not a bigger `depth` knob — the code documents why the knob tears.
2. **Holes on bright skin follow from `ink = distance-from-backdrop`.** The flood fill decides *what is wall*; the ink curve decides *how big/opaque a subject cell is* — and it uses the same chromatic distance. Enclosed bright regions (bald scalp, forehead highlight, cheek) that happen to sit within `dist ≲ 0.02–0.06` of the wall colour survive the mask but get `ink ≈ 0…0.2`, i.e. discs of `(0.06 + 0.94·ink)` × default size, an alpha knee `smoothstep(0, 0.1, ink)`, `cov²` sub-pixel attenuation and `Discard(alpha < 0.02)`. HANDOFF §12 states the model outright: *"`ink` è distanza dallo sfondo misurato, non oscurità. Camicie bianche su muro chiaro stanno a ink ≈ 0.03 e si dissolvono nel nulla."* The same sentence applies to lit skin. Contract 2 forbids the obvious "fix" (a per-pixel colour gate), and the previous two attempts (`lumCeil`, noise gate) "bucò la testa" twice.
3. **Halftone look** = tone carried by disc *size* on a regular lattice (`spacingDev`-relative discs, jitter 0.9 cell) with normal blending and no lighting term — exactly a dither/halftone print model (the comment cites `brunoimbrizi/interactive-particles`, `psize *= max(grey, 0.2)`).
4. Residual wall halo is a known open item: HANDOFF "Aperto #2": 12.1 % of kept cells are wall/shirt (4,446 cells in Alessandro's shoulder band).
5. **Motion at rest** is intentionally near-frozen; the "slowly moving" quality the owner wants (Lusion) is currently confined to mid-leg (1.4 s bursts).

---

## 7. Where background layers (glyph rain, contour lines) could be added behind the portrait

### 7.1 Option A — WebGL, same persistent canvas (recommended by the repo's own conventions)
- Mount point: `Scene.tsx:465-466`
  `{pathname === "/" && webgpu && (tier === "full" || railIslandsTouch) && (<FounderPortraitMorph touch={…}/>)}` — add a sibling island (or a sibling `<group>` inside `FounderPortraitMorph`'s returned `<group>`) with **`renderOrder` negative** so it draws before the portrait's depth-test-off quads. Repo convention ("backdrop convention"): `HomeSingularity` mesh `renderOrder −1` (HomeSingularity.tsx:702), `NeuralLattice` inner group `−2` (2338-2359), `CrystalCluster` fog `−4`, stone `−3.5`, crystal `−3` (1561-1615), `FeaturedWorkPlanes −1`, `ResourcePreviewPlane −1`.
- Registration: reuse `useFoundersMorphStore.getState()` per frame — `pinned || (touch && native)`, `secTop`, `travel (0)`, `reveal`, `morph`, `stage`, `measureVersion` — and the same camera-locked placement math (`WORLD_VIEW_HEIGHT / ih`, `camera.quaternion`). The natural "ground" for contour lines is the **sticky frame rect** (`[data-founders-morph-sticky]`, measured at build), not the 26 rem stage box; the natural column field for glyph rain is the full frame width behind both columns. Both are visible through the DOM because the section has no background — except under the chips/LinkedIn pills (55–60 % navy + `backdrop-blur`) and the DOM copy text itself.
- Clocks: use the island's `timeRef`/`env`/`restEnv` so ambient life is continuous at locked stages (where the page is held for an open-ended read) and yields or intensifies mid-leg; never key ambience on scroll (the page does not scroll while pinned).
- Fade/cull: mirror `uFade` (edge ramp `0.28·ih`, damp 8) and the `CULL_PAD 120` cull so the layer never dispatches when off-screen and never bleeds into the `services→founders` frost cut or the `founders→process` tech-light cut.
- **Budgets:** the portrait compute is at **8/8 storage buffers** (contract 7) — a new layer must be its **own** compute/build (or a pure vertex-shader animation with no storage buffers). Its render material has its own binding budget (8 vertex buffers, 8 vertex-stage storage bindings). Selective bloom: only emit > 1.0 where you want glow (threshold 1.0); the navy UI never blooms.
- **Fallback parity** the code expects: the layer must be gated exactly like the island (`tier === "full" && backend === "webgpu"`; touch variant if `railIslandsTouch`), and the DOM must stay complete without it. Under reduced motion there is no canvas.
- Other islands already share this canvas during the section: `DriftParticles` (3000 instanced dust quads across the whole world strip, `Scene.tsx:418`), `SignatureLine` (the scroll-driven tube passing through the `founders` waypoint), `GatewayPortal`, `HomeSingularity`. A glyph/contour layer should sit **between** the dust and the portrait (`renderOrder` between −1 and 0) or be explicitly ordered relative to them.

### 7.2 Option B — DOM layer inside the sticky frame
- Insert as the first child of `[data-founders-morph-sticky]` (founders-rail.tsx:2306-2309): `<div aria-hidden class="pointer-events-none absolute inset-0 -z-10">` (the frame is `overflow-hidden`, so a `100vh` layer is clipped for free). Could host a 2D canvas (glyph rain) and an SVG/canvas (contour lines).
- Constraints: (i) the design rule at founders-rail.tsx ~2247 (*"The DOM must not own section-sized ambience"*) — needs the owner's explicit waiver; (ii) it must exist in the **native** and **rail** variants too or be justified as morph-only ("the three must not diverge" is stated for the tint removal); (iii) `prefers-reduced-motion` must stop it (the native branch is what renders there); (iv) it would paint **above** the WebGL canvas (`z-[1]` content wrapper) and therefore **in front of the particle cloud** unless the cloud itself moved into the DOM layer — so a DOM background cannot sit *behind* the WebGL portrait. This is the decisive technical reason to prefer Option A for anything that must be behind the head.

### 7.3 Existing primitives worth reusing
- `src/components/fx/label-scrambler.tsx` — mono glyph "decode" alphabet `A–Z0–9`, `SCRAMBLE_MS 480`, `TICK_MS 40`, honours reduced motion; a ready vocabulary for glyph-rain characters in the site's JetBrains-Mono voice.
- `src/webgl/DriftParticles.tsx` — instanced billboard dust with budget-scaled count (`3000 / 1500 / 800`); WebGPU caps `gl_PointSize` to 1 px, hence **instanced quads, never `THREE.Points`** (DriftParticles.tsx:9-19) — applies to any new point layer.
- `src/webgl/materials/particleSpriteShader.ts` / `particleNodeMaterial.ts` — matched GLSL/TSL disc math.
- `gpgpuNodeSim.ts` `unifiedForceStep` — the shared spring/damping/clamp integrator with an `attractor` option (radial push² + orbital spin) if a pointer-reactive field is wanted.

---

## 8. HANDOFF_FOUNDER_MORPH.md — the 12 contracts as HARD CONSTRAINTS for any redesign

Source: `HANDOFF_FOUNDER_MORPH.md` lines 43-171 (Italian; condensed here, numbers verbatim).

1. **Tone comes from SIZE, not particle count.** One particle per regular-grid cell (290×405), tone via the `ink` channel. Old weighted sampling with replacement gave 63 % duplicates and 11 % uncovered cells (the dark, face-defining ones). *The instance count follows the sampler, never the reverse; reduce only with a fixed uniform stride; never random subsampling, never duplicate padding.*
2. **Subject and backdrop separate SPATIALLY, never by colour.** Michele's lit shaved scalp has the same colour as the white wall; every per-pixel threshold (`lumCeil`, then the noise gate) punched holes in the head — twice. Backdrop = the region **connected to the border**: flood fill from the top row and upper side columns, `BG_FILL_TOL 0.055`, `BG_FILL_ROW_LIMIT 0.62`. The row limit is load-bearing (the shirt touches the bottom border; seeding from below erases the bust).
3. **TSL `varying` trap.** A `varying()` built from an outer `.toVar()` that a `Fn` assigns into always reads the initial value (three prepends varying writes to the top of vertex `main()`). Pass the self-contained expression to `varying(expr)`. Diagnostic: a scalar that works in the vertex stage but not through a varying.
4. **Below ~2 px, size stops working** (`antialias: false`): `alpha *= cov²`, `cov = clamp(diameter / max(1.25, 0.35·spacing), 0, 1)`, `dist` carried as a varying. 2D-canvas previews cannot reveal this — verify on the real render.
5. **Camera roll bank is right for the line, wrong for the mark.** `camera.rotateZ` rotates the whole WebGL layer; needs both the `rollGate` ramp and the mark compensating via `textMorphStore.camRoll`. (Not founders-specific; it says: never touch the global camera for a local effect — the island rule *"group transform ONLY — never the global camera; SignatureLine is the single camera authority"*.)
6. **Always review a fix round after a fix round.** Parallel agents on disjoint files produced 7 regressions (2 severe) once; 29→18→13 candidates incl. a real P0 another time. **Typecheck and build do not catch this class.**
7. **WebGPU vertex-buffer budget is 8, and the portrait was exactly on it.** Adding `colorC`/`sizeC` via `.toAttribute()` took the build to 10 vertex buffers → `CreateRenderPipeline` refused → **no portrait rendered at all**, silently from JS. Fix: pack colour+ink into **one `vec4` per target**, read with `.element(instanceIndex)` (storage binding, not vertex buffer). Table: hero 4/8 vb; portrait 4 targets = 4/8 vb + 4/8 vertex-stage storage. **The compute kernel is already at 8/8 storage** (position, velocity, homeA–D, start, delay): a 5th position target breaks compute before render. Fails silently — only the browser console shows it.
8. **`.toAttribute()` and `.element()` have OPPOSITE swizzles.** `.toAttribute()` on a `"vec3"` storage buffer yields 4 components (`WebGPUAttributeUtils` mutates itemSize 3→4) → `.xyz` mandatory; `.element()` yields a true vec3 → no `.xyz`. `.element()` works in WebGPU render stages (not on the WebGL2 fallback). `instanceIndex` in a fragment silently becomes a varying → a per-instance load becomes a per-pixel storage read (perf trap).
9. **A clamp to the bounds does not terminate a clock on an interior target.** With ≥3 targets the middle one is interior; bounds clamping limit-cycles `0.994 ↔ 1.006` → group transform never neutral, `uMorph2` flickers, `setMorph` every frame, gate absorbs every gesture (**user trapped**). Clamp **toward the target**: `min(cur+step, target)` / `max(cur−step, target)`.
10. **`uMorph` must reach exactly 1.0 before `uMorph2` leaves 0.** The kernel chains `mix(mix(A,B,m1),C,m2)`; overlapping legs cuts the A→C corner and never forms the middle face. Both uniforms derive from ONE progress scalar (`applyMorph`). Do not copy the hero's 0.95 overlap.
11. **The cell list is a UNION and the stride is an integer cliff.** A cell joins if any portrait inks it; adding a person only grows the count. `stride = ceil(sharedCells/maxCount)`: one cell over the ceiling halves the cloud for every face, and it reads as "uniformly soft", not sparse. Measured in browser: 51,751 cells, stride 1, ceiling 60,000. The offline port (`sampler_port.py`) under-predicts by ~8 % — measure in the browser.
12. **Dark clothing is corrected in the ASSET, not with a threshold.** `ink` is backdrop distance; a blue jacket saturates like a beard. Mattia's `-headshot.webp` carries a vertical torso wash toward the backdrop (PCHIP monotone, zero derivative at the chin — a linear ramp left a visible horizontal line across the shoulders); inked cells 52,723 → 38,387, in family with 38,555 (Alessandro) / 38,833 (Michele). Only the `-headshot` file is washed; the DOM poster stays clean.

**N=4 addendum constraints** (HANDOFF lines 263-293): `WIRED_TARGETS = 4` is the ceiling; a 5th person degrades to truncation with a dev warning; `tintD` read with `.element(instanceIndex)`; `portraitMorph3Expr` mirrors the kernel's `m3` (`morph3N − hash·0.55`, window 0.45, smoothstep); ink and colour are 4-way chains; touch `hideMedia/restoreMedia` act on `articles.slice(0, STAGE_TOTAL)`. Alberto's asset is a placeholder; when the real photo lands: `getSampler().stride` MUST be 1, expect `sharedCells ≈ 57–62k` vs ceiling 60,000 → raise the ceiling or shrink the grid by `sqrt(wanted/measured)`; on phone probably lower `TOUCH_GRID_SCALE` 0.58 → ~0.53.

**Acceptance criterion declared by the owner** (HANDOFF line 218): *"il volto deve vedersi bene ed essere ben definito. La camicia è sacrificabile. Giudica ingrandito sul volto."* (Any Lusion-style redesign changes this criterion — it must be re-negotiated explicitly, because most of the 12 contracts exist to serve it.)

**Additional binding rules from `.trellis/spec/frontend/webgl-island-guidelines.md`:** no `React.lazy`/Suspense inside bridged Canvas children (wedges the island commit queue); hot data via `getState()` in `useFrame`, rebuild version-keyed resources imperatively; never `ScrollTrigger pin:` on pinned sections; zero `getBoundingClientRect` in frame loops; detect backend with the positive three-term probe (`backend.isWebGLBackend !== true && typeof r.compute === "function"`), never a negative-flag test; gate capability-dependent DOM layouts on `tierStore.backend`; "a build happened" ≠ "the one-shot entry played" (`keepEntry = preserveState && entryRef ≥ 1`); tone by size not density; engage predicates are order-sensitive (time-box the reload-inside arm); subscribe to `matchMedia`, never sample once.

**Open items still listed in the HANDOFF** (lines 222-247): Mattia's "SHIPS WITH" chips missing (needs the owner's real list); residual wall halo 12.1 %; mobile never verified by hand; copy decisions (footer "Founders"→"Team", `llms.txt`, "no junior" clauses hold only while Mattia/Alberto stay internal); `sectionProgress` ~45 px mobile error; `G_MAX_ENGAGE_MS` can fire mid-leg (leg completes on its own, deliberately unfixed); `STAGE_ORDER` (4) vs `WIRED_TARGETS` overlap.

---

## 9. Constraint checklist for the synthesis agent (what any Lusion-parity proposal must respect or explicitly overturn)

- [ ] Section stays **exactly one viewport tall** in MORPH mode (`section.style.height = innerHeight`); the hold is `lenis.stop()` + per-frame re-snap, not a runway. `[data-line-anchor="founders"]` must remain measurable (no pin-spacer).
- [ ] Stage changes are **gesture → one self-played 1.4 s leg → lock**; ambient life must be continuous at locks and neutral at every integer `morph` (`env = sin(legFract·π)` is the sanctioned envelope; `restEnv` its complement).
- [ ] Copy handoff windows (`0.02–0.3` exit, `0.7–0.98` enter, `LOCK_EPS 0.02`) are leg-local and coupled to the lock threshold; a redesign of the portrait does not need to touch them, but any new DOM ambience must not sit in the copy column's hit-test path (`visibility` toggling is load-bearing for a11y).
- [ ] All motion/compute lives in the persistent canvas **behind** `z-[1]` DOM; per-frame reads via `getState()`; rebuilds only on `measureVersion`; `reset()` on cleanup; `setActive(true)` only on a true-WebGPU build (the DOM hides its posters on it).
- [ ] Budgets: portrait compute **8/8** storage; render 4/8 vb + 4/8 storage; WebGPU points are 1 px → instanced quads; `antialias:false` → coverage compensation for sub-2 px discs; selective bloom threshold 1.0.
- [ ] Sampler invariants if the point-cloud source stays image-based: one shared grid, union cell list, integer stride ≠ 2, spatial (flood-fill) backdrop, no chromatic gates, dark garments washed in the asset. If the source changes (depth map / 3D scan / normals), contracts 1, 2, 11, 12 become moot **but** 3, 4, 7, 8, 9, 10 still bind the TSL/WebGPU implementation.
- [ ] Fallback trio must not diverge in intent: MORPH (WebGPU desktop ≥1024×780, fine pointer), HORIZONTAL RAIL (WebGL2/unroomy), NATIVE (≤768 px, coarse, reduced motion — **no canvas** under reduced motion). Capable phones get the touch-scrubbed island (≈17–19k particles, `lite` ceiling 20,000).
- [ ] Verification is **browser-only**: `npx tsc --noEmit` and review passes have repeatedly missed the defects that mattered (contracts 6, 7). Use `__sersanFounderMorph.getSampler()/getUniforms()/getGate()/simulateGesture()` on Chrome WebGPU with the section in view after a hard reload; check the console for `CreateRenderPipeline` / `Vertex buffer count`.
- [ ] Push policy: `main` auto-deploys to Vercel; the working tree currently holds the uncommitted N=4/Alberto work — **commit/stash strategy must be decided before any redesign branch is cut** (HANDOFF merge gate, lines 291-293).

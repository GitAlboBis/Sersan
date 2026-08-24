# ROUND 8 — SCROLL DOSSIER (our snap, Lusion's scroll, igloo's scroll, the redesign)

- **Query**: Owner round-8A (2026-08-22): "lo scroll che si ferma dopo 1 secondo nelle sezioni; fai il reverse completo dello scroll di lusion e igloo; è tutto sfasato da dopo la hero in poi; nella sezione delle reti neurali la pagina si assesta troppo in alto; non permette l'esperienza completa con gli effetti gsap delle scritte."
- **Scope**: mixed — internal (our snap engine @ HEAD 3ef94b5) + two production-bundle reverses.
- **Date**: 2026-08-24 (task dated 2026-08-22)
- **Sources**:
  - ours: `src/lib/scroll-snap.ts`, `src/components/scroll-snap-sections.tsx`, `src/components/smooth-scroll-provider.tsx`, `src/lib/lenis-singleton.ts`, `src/components/fx/lusion-type.ts`, the section files.
  - Lusion: `research/lusion-raw/hoisted.js` (repo root), prettified to `…\e6f8ce14-…\scratchpad\lusion-hoisted.pretty.js` (line refs below = that pretty copy; re-run `npx js-beautify` on the raw file to reproduce).
  - igloo: `C:\Users\alber\AppData\Local\Temp\claude\C--Users-alber-Desktop-sersan-v2-main\5042dfcb-dc07-4454-a8cc-9bef33d8c714\scratchpad\igloo-app3d.pretty.js` (45k lines; extends `2026-08-21-igloo-cuts-spec.md` §A-EXT).

---

## VERDICT IN ONE PARAGRAPH (read Part 4 for the full spec)

The "1-second stop" is our own `lib/scroll-snap.ts` settle: 420 ms debounce after the last wheel event (+0–1.9 s of velocity retries) → a 0.55–1.05 s `lenis.scrollTo` that re-frames the page without user input. **Lusion has NO snap of any kind** — verified exhaustively on the bundle: their update loop contains input smoothing and friction only; every `scrollToPixel` call site is a click/navigation handler. **igloo DOES have an idle auto-center** (1.4 s idle, 2 s inOut3 tween) but (a) it only fires when a scene *boundary wipe* is torn mid-screen — a state that literally shows two half-rendered scenes — and (b) ANY input kills the tween instantly (`killTweensOf`) *before* the delta is even applied. Our engine is the opposite on every axis that matters: it fires on ordinary reading rests, it targets the *geometric* section center (which on the neural sections sits ~half a heading-block ABOVE the visual band → the "assesta troppo in alto" bug), and its automated travel crosses/resets the real-time GSAP entrance windows. **Recommendation: option (b)** — delete every `data-snap` element settle (all free sections, home and interior routes), keep the whisper-settle ONLY on the pinned scrub runways (`snapPoint`/`snapBarrier`: spine stations, services segments, fit beats, founders panels, audit timeline) where a mid-pose park genuinely reads broken, and retune Lenis to Lusion's exact smoothing law (`lerp: 0.2` ≡ their λ=12/s exponential; drop `duration`/`easing`).

---

## PART 1 — OUR SNAP SYSTEM, REVERSED (the accused, anatomy first)

### 1.1 The engine — `src/lib/scroll-snap.ts` (the ONE site-wide engine)

Registered target types (module-level sets, L73–79):

| API | What | Who registers |
|---|---|---|
| `snapElement(el, align)` L278 | DOM section, measured live at snap time | `ScrollSnapSections` scans `[data-snap]` per route (L35–40 of scroll-snap-sections.tsx; scans at t+300ms and t+1400ms) |
| `snapPoint(get)` L285 | lazy Y getter INSIDE a scrub runway | cinematic spine L1616–1619, services L934–939, fit L792–797, founders L2032–2040, audit timeline L285–290 |
| `snapBarrier(get)` L291 | Y a settle must never cross | spine pin-end (cinematic L1619), founders gate top (founders-rail L1115–1118) |
| `suspendSnap()` L298 | refcounted pause | provider route-swap (900 ms), anchor clicks (1100 ms), hijack gates, drags |

### 1.2 Trigger → delay → settle (the exact "1 second")

1. **Arm**: Lenis `virtual-scroll` (USER wheel only; touch/ctrl+wheel/deltaY 0/stacked <768px viewports all bail — L182–201) restarts a **420 ms** debounce (`DEBOUNCE_MS`, L56).
2. **Evaluate** (L146–180): bail if suspended/stopped/form-focused. If `|lenis.velocity| > 0.6` (the lerp tail is still moving) → retry every **240 ms**, max **8** retries (L57–60) — worst case the settle fires **up to ~2.3 s after the last wheel**; typical feel 0.4–0.9 s. This is the owner's "si ferma dopo 1 secondo".
3. **Target**: nearest of ALL candidates (runway points + element centers). Element math (L119–127): `center` align → `top + h/2 − ih/2` (the *geometric* section midpoint), skipped when `h > 1.75·ih`; capture radius `0.42·ih` (`CAPTURE_FRAC` L54, ≈ 400–460 px on desktop); no-op under 4 px.
4. **Glide**: `lenis.scrollTo(best, { duration: min(1.05, 0.55 + |d|/2400), easing: easeInOutCubic })` (L174–179) — flows through the normal Lenis→ScrollTrigger→scrollStore pipe (deliberate, so the camera glides).
5. **Barriers** (L170–173): the settle is vetoed if it would cross the spine exit or the founders gate top. Keyboard `PageDown/PageUp` stepping (L206–230) ignores barriers, glides 0.8 s to the next station or a 0.85·ih page-glide fallback.

Dev handle (dev builds only, L239–250): `window.__sersanSnap` → `{ suspendCount, counts, candidates(), evaluate() }`.

**History note**: the header comment (L4–6) records WHY this exists — client request 2026-07-23: "hard flicks must still come to rest ON a section, settles land CENTERED." Round 8-A supersedes that request for free sections.

### 1.3 THE "TOO HIGH" BUG — root cause, with the geometry

The "neural network sections" are `#problem` (broken constellation) and `#trust` (healthy constellation). Both are:

```
<section data-snap class="relative section-lg scroll-mt-24 overflow-hidden">   ← the SNAP TARGET
  <div class="container-px">
    <div data-emerge> …chapter heading grid: eyebrow + clamp(2.6rem,4.8vw,5.75rem) h2 + desc column… </div>  ≈ 180–260 px
    <div ref={rowRef} class="relative isolate mt-4 sm:mt-12">                  ← THE VISUAL BAND
      <div data-lattice-anchor="…" class="absolute inset-y-0 …full-bleed -z-10"> ← WebGL net = rows-stack bg
      …3 ledger rows…
```

(problem-section.tsx L285–388; production-grade-section.tsx L296–387; `.section-lg` = 8 rem padding-block at ≥1024 — globals.css L486–495.)

- The engine centers the **section rect**: `sectionTop + H/2 − ih/2`.
- The reader's expected frame is the **band** (`rowRef` stack = the `[data-lattice-anchor]` rect — the constellation IS this box; NeuralLattice camera-locks to it).
- Top/bottom `section-lg` paddings cancel, so the target error = everything above the band that has no counterpart below it: `(headingGrid + mt-12)/2 ≈ (200 + 48)/2 ≈ **≈100–170 px too high**` on a desktop viewport. The settle therefore parks the constellation *below* viewport center, clipped at the bottom → "la pagina si assesta troppo in alto". Exactly the owner's words.
- **`scroll-mt-24` is a red herring for the settle**: the engine reads `getBoundingClientRect()` only — CSS `scroll-margin-top` affects native anchor navigation, never these candidates. (Separate latent inconsistency: anchor clicks use a hardcoded `offset: -72` in the provider L245 while the CSS says 96 px; irrelevant to round 8 but worth knowing.)
- **Second failure mode on smaller viewports**: when the section grows past `1.75·ih` (L119) it silently produces NO candidate — the nearest candidate is then a *runway interior point* of services/fit or the neighbouring section, up to 0.42·ih away in a direction that has nothing to do with the band. This is part of the "tutto sfasato" feel: which target wins depends on viewport height and language-dependent copy height.

### 1.4 How the settle mangles the GSAP text choreography (quantified)

The home text grammar (`src/components/fx/lusion-type.ts`) is **real-time entrance choreography**, not scrub:

- Trigger: `start: "top bottom" / end: "bottom top"`, play on enter (either direction), `pause(0)` reset only when FULLY out (`createReplayTrigger` L178–195).
- Row timeline length: R1 letter-roll 1.25 s (`ROLL_DUR`) + body word-wave 1 s at t=0.3 → the entrance visually completes at **~1.4–1.7 s**; the "landed" beat (`IGNITE_BEAT`) is at 1.1 s. Chapter H3: 1 s + x-trail at +0.4 s → ~1.65 s.
- Plus the per-frame parallax drift `dy = (1−k)·dCenter·0.12` (L555–567) — it reads `window.scrollY` every frame, so it only feels alive while the page is actually moving.

Now put the settle against it:

| Settle | Value |
|---|---|
| Max travel | 0.42·ih ≈ **400–460 px** |
| Duration at max travel | 0.55 + 450/2400 ≈ **0.74 s** |
| Mean velocity | ≈ 610 px/s; easeInOutCubic peak ≈ 1.5× ≈ **900 px/s** |
| Ledger-row trigger pitch ("top bottom" edges) | ≈ 250–320 px |

So ONE settle can cross **1–2 row trigger edges** the user never scrolled to: their 1.4 s entrances all start mid-glide and finish on a page that has gone completely still — type animating on a frozen page reads "sfasato", detached from input. Worse: the settle direction is toward the *nearest* candidate, i.e. up to half the time **against** the user's last scroll direction — a row that had just entered at the viewport bottom gets carried back out, crosses `onLeaveBack`, and its half-played entrance hard-resets to the hidden pose (`tl.pause(0)`) in front of the user. And the retry loop means all of this happens ~1 s *after* the user has mentally finished the gesture. That is the full mechanism behind complaint 3 ("non permette l'esperienza completa con gli effetti gsap delle scritte").

Note precisely: the settle does NOT scrub/fast-forward the timelines (they are time-based, `play(0)`), and the drift driver keeps running. The damage is (a) unwanted trigger crossings, (b) mid-play resets on direction-reversing settles, (c) motion continuing after intent has stopped.

### 1.5 Suspension map (already correct, keep)

- Route swap: 900 ms hold (provider L115–116). Anchor clicks: 1100 ms hold (L243–244). Hero-intro + founders gates: held while engaged (L198–212). Drags (audit timeline L337, drag rails): held. Reduced motion: engine never attached. Touch: never snaps. `<ScrollSnapSections />` mounted once in `src/app/layout.tsx` L293–296.

---

## PART 2 — LUSION'S SCROLL, COMPLETE (hoisted.js, verbatim)

Architecture: **fully virtual transform scrolling**. One `ScrollPane` base class (pretty L31290–31443) + `ScrollManager extends ScrollPane` (L31445–31474), singleton `scrollManager`. `syncDom()` (L31438): `#page-container.style.transform = translate3d(0, −scrollPixel, 0)` — no native scrollbar; a custom `#scroll-indicator` bar is drawn (min scale 0.2 of track, fades out 0.5 s after the last motion at ±2/s opacity ramp, L31466–31469).

### 2.1 Input chain (`Input` class, L18028–18140)

- **Wheel** (`_onWheel` L18094–18096): `t = normalizeWheel(e).pixelY` → **`clamp(t, −200, 200)`** per event → accumulated into `deltaWheel` for the frame; `postUpdate` (L18092) zeroes all deltas each frame. So one frame's wheel input = Σ(clamped events).
- **Touch drag** (`_onMove` L18102): direction locked on first move (`isDragScrollingX = |dx|>|dy|`), then `deltaDragScrollY += −deltaPixelXY.y` — **1:1 finger tracking**, no multiplier.
- **Touch release** (`_onUp` L18108): momentum handed to the pane via a **100 ms drag history** (`dragHistoryMaxTime = .1`, L31319): recency-weighted mean of `deltaPixel/deltaTime` → `velocityPixel` (L31416–31430).
- Keyboard (pane `init` L31329): Arrow = ±100 px, Page = ±1 viewport — routed through `scrollToPixel` i.e. the same wheel smoothing.

### 2.2 The smoothing law (ScrollPane.update, L31394–31436)

Three regimes, exclusive per frame:

1. **Dragging** (finger down): `scrollPixel` follows input 1:1; `targetScrollPixel = scrollPixel`; wheel state cleared.
2. **Wheel** (`isWheelScrolling`): `targetScrollPixel += l` (clamped to document); then
   `a = f · (1 − exp(−wheelEaseCoeff · dt))` with `f = target − current` and **`wheelEaseCoeff = 12`** (L31325) — an FPS-normalized exponential approach, time-constant 83 ms, ~95 % settled 250 ms after the last event. When `|f| < minScrollPixel (0.1 px)` → done, regime exits.
3. **Momentum** (after touch release): friction `p = −mix(2.1, 1.9, |v|/viewH/5) · v; v += p·dt` (L31431–31432) — exponential decay λ≈2 s⁻¹, *slightly lighter friction for harder flicks*; killed below `minVelocity` (−1 → effectively never zeroed early).

Derived per-frame values every consumer reads: `scrollView = scrollPixel/viewH` (viewport units), `scrollViewDelta`, `progress = scrollPixel/contentSizePixel`.

`ScrollManager.update` adds the site-wide reactive strength (L31466):
`easedScrollStrength += |scrollViewDelta|; ·= exp(−10·dt) decay; clamp ≤ 1` — this is the value the k-parallax/ripples read (e.g. `u_rippleStrength = min(.15, easedScrollStrength·.5)` L22574). The per-frame text drift (`showScreenOffset · −k`, k = 0.5/1.5/1.25 — text dossier §4) reads the SMOOTHED position, so text keeps drifting exactly as long as the eased scroll is still moving — motion and type are never decoupled.

### 2.3 Snap/settle/autoscroll on lusion.co: **NONE** (verified)

- `ScrollPane.update` contains **no idle timer, no nearest-target search, no tween**. Full stop.
- Every `scrollToPixel/scrollTo` call site audited: route-show reset `scrollToPixel(0, immediate)` (L31263), footer "up" button → 0 (L24710-15), menu/footer links (L25794/25818/25830), home→project deep-link placement `itemTop − 0.25·ih` (L26509/29967), playground timeline click (L30432), dev `settings.JUMP_SECTION` (L33780). All user-initiated navigation. Zero idle paths.
- `autoScrollSpeed` exists on the pane (L31315) but is 0 in properties (L17761) and only ever set from **`window.__AUTO_SCROLL__`** (L33801) — a demo/dev hook, inert in production.
- So on Lusion: you stop the wheel → the exp tail dies out in ~0.25 s → the page rests wherever it rests, forever. **Their "arrival" feel is authored into section spacing + entrance choreography, not into scroll correction.**

### 2.4 Constants table (Lusion)

| Constant | Value | Where | Meaning |
|---|---|---|---|
| wheel clamp | ±200 px/event | L18096 | tames fast notch wheels |
| `wheelEaseCoeff` | **12 s⁻¹** | L31325 | exp approach; ≙ per-frame lerp 0.181@60fps |
| `minScrollPixel` | 0.1 px | L31306 | wheel-regime exit epsilon |
| `dragHistoryMaxTime` | 0.1 s | L31319 | touch velocity estimation window |
| `frictionCoeffFrom/To` | 2.1 → 1.9 s⁻¹ | L31321-22 | touch momentum decay (blend by speed/5 viewports) |
| `frictionCoeffWeightDivisor` | 5 | L31323 | speed normalizer for the blend |
| `scrollMultiplier` | 1 (also on mobile) | L31308 | no global gain |
| Arrow / Page keys | ±100 px / ±1 viewport | L31329 | through wheel smoothing |
| `easedScrollStrength` decay | exp(−10·dt), cap 1.0 | L31466 | site-wide velocity uniform |
| indicator fade | after 0.5 s idle, ±2/s | L31466 | custom scrollbar |
| autoscroll / snap | **absent** | — | — |

---

## PART 3 — IGLOO'S SCROLL, COMPLETE (app3d, extends cuts-spec §A-EXT)

Architecture: **fully virtual, WRAPPING scene scroll** — no DOM document at all. Scenes are WebGL composers stacked in scroll-units where **1 unit = 1 viewport height**; `scroll.y` is unbounded and wrapped `mod total` (infinite loop). The whole page is one fullscreen triangle whose shader blends `tScene1/tScene2` across the boundary wipe (cuts spec §A).

### 3.1 Input chain (mainController, pretty L44792–44809)

```js
enableScroll(){ Q.on("wheel"…); Q.on("keydown"…); Q.on("touch_drag"…) }
onScroll(e){ this.scrollBlocked || (this.stopAutoCenter(), this.scroll.targetY2 += e.delta.y * this.scrollMultiplier) }   // 44799
onKeyDown(e){ … ArrowDown/Up → targetY2 ± 150 * mult }                                                                   // 44802
onTouchDrag(e){ … targetY2 += e.delta11.y * 1.25 }                                                                       // 44805
stopAutoCenter(){ this.autoCenter.animating && (re.killTweensOf(this.scroll), this.autoCenter.animating = !1) }          // 44807
```

- `scrollMultiplier = 75e-5` (L44612) → **1 viewport ≈ 1333 wheel px** (heavier page than native).
- Arrow keys = 150·mult = **0.1125 viewport/press**. Touch: `delta11` (normalized −1..1 viewport units) × **1.25**; no synthetic momentum regime found on the touch path — the double-lerp itself supplies the glide.
- `scrollBlocked` + `disableScroll()` while a project detail is open.

### 3.2 Smoothing + velocity (render, L44643–44647 — confirms §A-EXT)

```js
targetY1 = lerpFPSLimited(targetY1, targetY2, .075, 100*mult /* max 0.075 unit/frame */);
y        = lerpFPS(y, targetY1, .15);                    // double-smoothed
targetY2 = clamp(targetY2, y − 750*mult, y + 750*mult);  // input may lead by ≤ 0.5625 viewport
|y − targetY2| < 0.1*mult → y = targetY1 = targetY2;     // dead-zone lock
velocity += |Δy|; velocity *= frictionFPS(.98); clamp 0..1; <.001 → 0;
```

Two cascaded lerps (0.075 rate-limited, then 0.15) = heavier, more "cinematic" tail than Lusion's single λ=12; the rate limiter caps traversal at ~4.5 viewport/s no matter how hard you spin.

### 3.3 autoCenter — EXACT trigger & cancel (L44643, L44671–44700, 44704–44717)

- **Book-keeping**: any frame where `targetY2 !== autoCenter.lastTarget` → `needed = true; lastTime = now` (L44643). So the idle clock restarts on every input frame.
- **Trigger**: `needed && !animating && (now − lastTime) > 1.4 s` **AND** the frame is mid-wipe (`uProgress c % 1 !== 0` — i.e. a scene boundary is torn across the screen). Then: candidate offsets = {sceneTop, sceneBottom} × {screenTop, screenBottom} over the two visible scenes; pick the minimum |Δ|; tween `scroll.y` by Δ, **duration 2 s, ease inOut3** (`centerScroll` L44704: onUpdate slaves `targetY1 = targetY2 = y`; onComplete clears `animating`). Optional per-scene extension via `initialScrollAutocenter`/`finalScrollAutocenter` (L44694–44698) biases the landing into the scene's authored "hero pose" and stretches the duration.
- **If NOT mid-wipe** (`c % 1 === 0`, one scene fills the screen): delegate to the scene's OWN `autoCenter` hook:
  - cubes scene (L39323–39334): center the nearest project cube (`centeredProgress`), duration `clamp(|Δ|·6, 1.6, 2.4) s`;
  - igloo scene (L42337–42343): only when `progress > .15`, drift toward `finalScrollAutocenter = .76`, duration `clamp(|Δ|·4, 2, 20) s` — up to a 20-second imperceptible drift;
  - entry scene: `.495/.495` (L35046), no own hook.
- **Cancel**: `stopAutoCenter()` is the FIRST statement of every input handler — the tween is `killTweensOf`'d **before the new delta lands**; also on resize (L44720). The user can never feel resistance: one wheel notch and the correction is gone. There is no debounce-then-yank; the correction happens *only after* 1.4 s of genuine idleness, moves at 2–20 s tempo, and is instantly abortable.
- **Scene-height authoring**: entry `height = 2.35` (L35044), cubes `height = cubes.length` (1 unit per project, L39238), igloo `height = 5.5` (L42043). Total ≈ 12–14 viewports, wrapped.

### 3.4 Why igloo's model CANNOT be naively applied to our DOM document

1. **No document**: their scroll.y is a private float; ours is `window.scrollY`. A 2–20 s GSAP tween of native scroll would fight the browser (scrollbar drag, find-in-page, Ctrl+End, hash navigation — everything B14 exists to reconcile).
2. **Wrap-around**: their space is modular (infinite loop); a DOM page has ends, history scroll restoration, and deep links (`#contact`, `#faq`) that must land deterministically.
3. **Accessibility**: igloo replaces the scrollbar, keyboard model and AT scroll semantics wholesale (and shows a "WebGL2 required" wall otherwise, L44816). Our site keeps a real DOM with screen-reader content — native scroll affordances must survive.
4. **Their trigger state doesn't exist for us**: "mid-wipe" on igloo means the screen is literally torn between two composited scenes — resting there is visually broken, hence the correction. Our W4 cut band is a PostFX seam over continuous DOM; resting near a section seam is a perfectly readable state. The justification for auto-centering doesn't transfer.

---

## PART 4 — OUR REDESIGN (decision-grade)

### 4.1 The options, weighed against the owner's three complaints

| | (a) kill snap outright | (b) whisper only on pinned runways | (c) igloo autoCenter at cut boundaries |
|---|---|---|---|
| 1-s stop on free sections | fixed | fixed (free sections have zero candidates) | fixed only if capture is narrow |
| neural too-high settle | fixed (no settle) | fixed (problem/production are FREE sections → no settle at all; no band math needed) | needs new band-target math |
| GSAP choreography completes | fixed | fixed on free sections; runway settles glide *within* an owned scrub (choreography IS the scrub there) | still fires page motion after idle near seams |
| mid-runway park (sticky pane frozen half-pose) | **regression**: a rest halfway through services/fit/founders/spine parks a torn pose — the exact state igloo's autoCenter exists to prevent | protected (existing snapPoints) | unprotected |
| effort | delete-only | delete + keep-list | new machinery for a non-problem (see §3.4.4) |

**RECOMMENDATION: (b).** It is (a) — Lusion's answer — everywhere the page is a page, which is where all three complaints live; and it keeps the one correction igloo actually justifies: never resting inside a *pinned experience* whose visual state is a pure function of scroll offset. Full (a) would re-open the "parked mid-scrub" wound that made the client ask for snapping in July; (c) imports igloo's mechanism while abandoning the condition that makes it legitimate.

### 4.2 Exact change list

**DELETE (element snapping — the free-section settles):**
1. `src/components/scroll-snap-sections.tsx` — delete the file; remove `<ScrollSnapSections />` + import from `src/app/layout.tsx` (L293–296).
2. `src/lib/scroll-snap.ts` — remove `snapElement`, `ElementEntry`, the `elements` set, and the element branch of `candidates()` (L111–128 incl. the `1.75·ih` tall-section rule and align math). `candidates()` becomes points-only. Keep `snapPoint`, `snapBarrier`, `suspendSnap`, attach/detach, the keyboard `step()` (its page-glide fallback L220–222 already covers stretches with no stations), and the dev handle (update `counts`).
3. Strip the now-dead `data-snap` attributes so the contract has no zombies: home — problem-section.tsx:288, production-grade-section.tsx:298, final-cta.tsx:64; interior — audit-client.tsx (6×: 105, 182, 223, 301, 407 + one), consulting-client.tsx (62, 124, 151, 311), about-client.tsx (130, 208, 333, 354, 445), contact-client.tsx:75, case-studies-client.tsx (124, 202), resources-client.tsx (357, 521), compliance-pipeline.tsx:900. (`scroll-mt-24` classes stay — they serve native anchor navigation.)

**KEEP (the whisper — pinned scrub runways only):**
- cinematic spine stations + pin-end barrier (cinematic-system-scroll.tsx L1616–1619), services segments (L934–939), fit beats (L792–797), founders panels + gate barrier (L2032–2040, L1115–1118), audit timeline days (L285–290). These getters return positions INSIDE sticky pin ranges where the settle glide *is* choreography (it scrubs the owned beat to a rest pose — igloo's per-scene `autoCenter` analog). All `suspendSnap` holds stay as-is.
- Optional igloo-parity refinements (small, recommended): `DEBOUNCE_MS 420 → 1000` and cap the settle duration at 1.2 s with `Math.min(1.2, 0.6 + |d|/1500)` — the surviving correction becomes "after a genuine pause, slowly", not "on every rest". Lenis already yields to user wheel mid-scrollTo (user input retargets the animation), which is our equivalent of igloo's `stopAutoCenter`-on-input; verify in QA (§4.5.6).

**LENIS CONFIG DELTA (`src/lib/lenis-singleton.ts` L128–155):**

| Knob | Ours today | Lusion (mined) | Prescription |
|---|---|---|---|
| smoothing law | `duration: 0.9` + easeOutExpo-ish (fixed-duration glide per gesture) | exp approach, λ = 12 s⁻¹, FPS-normalized | **`lerp: 0.2`, delete `duration` + `easing`.** Lenis lerp mode damps as `1 − exp(−lerp·60·dt)` → λ = 12 s⁻¹ — byte-equivalent to Lusion's `wheelEaseCoeff 12`. The felt difference: response scales with remaining distance (long flicks glide longer, small notches die in ~250 ms) instead of every gesture taking the same 0.9 s. If the owner wants slightly heavier: 0.15 (λ=9); igloo-heavy would be ~0.1 double-smoothed — do NOT go there, the site is a document. |
| wheel gain | Lenis default `wheelMultiplier: 1` | ×1 with a ±200 px/event clamp | keep 1; no clamp needed (Lenis virtual-scroll already normalizes line/page modes) |
| touch | native (syncTouch off) | 1:1 drag + JS momentum (they have no native scroll to defer to) | keep native — our comment block L133–154 is already the right call |
| `smoothWheel` | true | n/a | keep |

**NEURAL-SECTION ALIGNMENT (only if any element settle is ever revived):** the target must be the **band**, not the section: register the `rowRef` stack (equivalently the `[data-lattice-anchor]` parent) as the snap element — `bandTop + bandH/2 − ih/2` — e.g. move `data-snap` from `<section>` (problem L285, production L296) onto the `mt-4 sm:mt-12` rows-stack div (L379 in both). That removes the ≈(heading+48 px)/2 ≈ 100–170 px "troppo in alto" bias by construction. Under recommendation (b) this is documentation, not a change — the sections simply stop settling.

### 4.3 Guaranteeing the text choreography — the honest analysis

With element settles gone, the page moves ONLY under user input + inside owned runways. The remaining risk is the user's own fast flick: a hard wheel flick reaches 3–6 k px/s; a row's full viewport transit (≈ ih + rowH ≈ 1.1–1.3 k px) can pass in ~0.25 s while the entrance needs ~1.4 s. The trigger contract already handles it: `onLeave` fires only when FULLY out → `pause(0)` → the entrance **replays complete on the way back** (`createReplayTrigger`, lusion-type.ts L178–195). Lusion behaves identically (their `_needsReset` replay — text dossier §0); a visitor who flicks past copy has chosen not to read it. **Accept it. No velocity clamps, no input throttling.** What we must NOT do is reintroduce any system that moves the page without input — that is the only mechanism that can cut a choreography the user actually wanted to watch.

### 4.4 What this buys against each complaint (summary for the commit message)

1. "Scroll si ferma dopo 1 secondo" → the 420 ms debounce + retries + 0.55–1.05 s glide simply never arms on problem/work/services*/production/founders*/fit* free approaches or any interior route (*their pinned interiors keep the whisper).
2. "Si assesta troppo in alto nelle reti neurali" → no settle exists there any more; root cause (geometric-section-center vs band-center, §1.3) documented if ever needed again.
3. "Non permette l'esperienza completa degli effetti gsap" → no automated trigger crossings, no direction-reversing resets mid-play, page motion always equals user intent; flick-skips replay by contract.

### 4.5 QA GATE (live Chrome, dev build, desktop viewport ≥1024)

1. `window.__sersanSnap.counts` on `/` after 2 s → `elements: 0`; `points` > 0 (spine+services+fit+founders); on `/audit` → timeline points only; on `/about`, `/consulting`, `/contact`, `/resources`, `/case-studies`, `/trust` → `{elements:0, points:0}`.
2. **Rest test**: wheel to mid problem-section, hands off, watch `scrollY` in console for 5 s → must not change by >0 px. Repeat between production rows, on fit approach (outside its pin), on `/audit` hero.
3. **Neural framing**: manually frame the constellation band center-screen on both sections → no correction ever; hover/ledger ignition works at that rest.
4. **Choreography**: reload, slow-wheel into problem rows → full R1 roll + body wave completes while the page is still under my finger; flick past production → scroll back → entrance replays complete; no half-pose ever freezes or vanishes without my input.
5. **Runway whisper**: stop half-way through the services runway interior → after the debounce a soft glide parks the nearest segment pose; same for fit beats, founders panels, spine stations, audit days. Wheel DURING that glide → my input wins immediately (Lenis retarget), no fight-back.
6. **Keyboard**: PageDown steps stations inside runways, page-glides (~0.85·ih) elsewhere; PageUp symmetric; barriers still un-crossed by settles but crossable by explicit PageDown.
7. **Feel delta**: with `lerp: 0.2`, a single wheel notch settles in ~0.25 s, a hard flick carries proportionally further; compare side-by-side against lusion.co home.
8. **Regressions**: anchor clicks (`#contact`, `/consulting#engage`) land without a post-glide yank; route swap → top, no stray settle in the first 900 ms; EN/IT toggle then rest → no movement; reduced-motion → native scroll untouched; B14 teleports (Ctrl+End, scrollbar drag) still resync; hero intro gate + founders gate engage/release exactly as before (their suspends are untouched).

---

## Caveats / Not found

- Section-height numbers in §1.3 are structural estimates from the class math (`section-lg` 8 rem, h2 clamp, mt-12), not live measurements — the ~100–170 px bias direction/order is solid, the exact pixel is viewport- and language-dependent. Verify live via `__sersanSnap.candidates()` vs the band rect before/after if precision is ever needed.
- Lusion pretty-file line numbers refer to the scratchpad beautified copy (session e6f8ce14); the raw `research/lusion-raw/hoisted.js` is the canonical artifact. Igloo line numbers match the 5042dfcb scratchpad pretty file already cited by the cuts spec.
- igloo's touch path: no separate momentum integrator found on `touch_drag` (the double-lerp supplies the glide); if their mobile build ships extra momentum it lives outside app3d.
- Lenis 1.3.23 lerp-mode damping (`1 − exp(−lerp·60·dt)`) asserted from the installed source family; confirm once against `node_modules/lenis` before shipping the config delta (one-line check in `Animate.advance`).

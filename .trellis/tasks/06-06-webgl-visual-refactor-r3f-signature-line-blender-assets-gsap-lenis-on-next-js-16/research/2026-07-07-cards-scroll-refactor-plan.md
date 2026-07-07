# SERSAN card / scroll / transition refactor — PLAN (2026-07-07)

Produced by executing `2026-07-07-cards-scroll-refactor-prompt.md`. Evidence:
`<scratchpad>/recon/*.json` (scratchpad = C:/Users/alber/AppData/Local/Temp/claude/C--Users-alber-Desktop-sersan-v2-main/140eb559-7137-48e5-99fa-56a3eb4ab7a4/scratchpad).

## DIAGNOSIS (ranked, confirmed against source)

### Bug 1 — signature line desyncs "in alcune parti e pagine"
1. **Parametrization mismatch (primary).** `uProgress` is a *document* fraction
   (`headFraction = (scrollYWorld + ih·0.5 + descPx)/sh`, SignatureLine.tsx ~437) but the
   shader compares it to `uv.x`, which TubeGeometry generates via `getPointAt` — an
   *arc-length* fraction. Arc length accumulates roughly per waypoint, not per document
   px, so wherever waypoint density per doc-px deviates (home 390vh hero spine = ONE
   segment; /audit 580vh timeline = ONE segment; dense gateway/final-cta clusters) the
   lit head races ahead of or stalls behind the viewport. Error scales with viewport
   width. Exactly matches "buggato in alcune parti e pagine".
2. **Stale measurements.** SectionBus (section-bus.tsx 48-103) re-measures only on route
   mount / 700ms / 1600ms / fonts.ready / window resize. Radix accordions (/consulting
   FAQ, /services/*), EN↔IT toggle, and pinned sections that set px heights post-mount
   (audit timeline in a 2nd commit) change document height with NO re-measure — while
   Lenis tracks the LIVE height, so `scrollYWorld = progress·(staleSh − ih)` desyncs
   camera + head + waypoint Ys page-wide.
3. **Route-change race.** Geometry memo re-runs on pathname change while sectionStore
   still holds the previous route's spans; anchor-based waypoints missing from the stale
   set collapse to fraction 0 → garbage line can flash before the new measure.
4. **End-of-range clamp.** headFraction only spans [ih/2sh, 1−ih/2sh] but curves span
   0..1 doc fractions → on short routes the last segment never lights and the first is
   pre-lit.
5. **lookAt-ahead** samples the curve with raw scroll-range fraction as an arc param —
   third inconsistent parameter space (tilt leans wrong near waypoint clusters).

### Bug 2 — camera jerky at the end of the post-hero descent (with the line)
1. **C1 discontinuity in the unwind ramp (primary).** SignatureLine.tsx 394-437:
   `distRamp = 1 − min(|scrollPxNow − tiltAnchorY|/(ih·1.5), 1)` is piecewise-linear and
   hard-clamped. While unwinding, camera tracks at 1/3 scroll speed; at |dist| = 1.5·ih
   the slope snaps to full speed — instant 3× velocity jump. `headFraction` adds the
   same `descPx`, so the line head kinks in the same frame. Matches the report exactly.
2. **Landing glide starts at max velocity.** cinematic-system-scroll.tsx ~1211-1221: at
   camTilt=1 the camera has eased to ZERO velocity, then `lenis.scrollTo(scrollY + ih,
   {duration:1.1})` fires with the singleton's out-expo easing (max slope at t=0) — a
   0→max kick in one frame. Ramp span (1.5·ih) ≠ landing distance (1.0·ih) leaves a
   desc residual of WVH/3 that later unwinds into kink (1).
3. **Wheel interruption + gate-shake residue.** The landing scrollTo is interruptible
   mid-flight; pending `gateKick` keeps the under-damped shake spring oscillating over
   the hand-off.

## FIXES (Work package A — one agent; formulas below are normative)

**A1 — doc↔arc remap (SignatureLine.tsx).**
- In the geometry useMemo, after building the CatmullRom + points: compute per-waypoint
  arc fractions. `const divisions = 512; const lens = curve.getLengths(divisions);
  const total = lens[divisions];` For waypoint i at parameter `u_i = i/(n−1)`:
  `arcF[i] = lens[Math.round(u_i·divisions)]/total`. Keep `docF[i]` = the clamped,
  monotonically-non-decreasing waypoint doc fractions (sanitize: `docF[i] =
  max(docF[i−1] + 1e−4, docF[i])`). Store `{docF, arcF}` in the same ref as the curve.
- In useFrame, AFTER computing `headFraction`: normalize the reader range then LUT-remap:
  ```
  const hMin = sh > 0 ? ih/(2·sh) : 0, hMax = 1 − hMin;
  const hn = clamp((headFraction − hMin)/(hMax − hMin), 0, 1);       // 0 at top, 1 at bottom
  const hDoc = docF[0] + hn·(docF[last] − docF[0]);                  // into curve's doc span
  // binary/linear search segment j: docF[j] ≤ hDoc ≤ docF[j+1]
  const seg = (hDoc − docF[j])/(docF[j+1] − docF[j]);
  const arcProgress = arcF[j] + seg·(arcF[j+1] − arcF[j]);
  u.uProgress.value = arcProgress;
  ```
  Guard sh ≤ ih (unscrollable page): uProgress = 1.
- lookAt-ahead (tier full): sample `curve.getPointAt(clamp(arcProgress + fx.lookAhead, 0, 1))`
  instead of dampedProgress.
- Do NOT change how the audit/production emissive beats or camDescend/descPx are
  computed — they stay in doc/px space; only uProgress + the lookAt param use the remap.
- Mirror nothing in the shaders: both lineShader.ts and lineNodeMaterial.ts keep
  comparing uProgress vs uv.x (both are now arc-length space). No uniform changes.

**A2 — measurement freshness (section-bus.tsx + sectionStore + SignatureLine).**
- Add a debounced (~120ms) `ResizeObserver` on `document.body` in SectionBus calling
  `measure()` (keep the existing `same` short-circuit). Disconnect on cleanup.
- Dispatch `window.dispatchEvent(new CustomEvent("sersan:remeasure"))` from
  language-provider on language change; SectionBus listens and re-measures (belt +
  braces with the RO).
- Route race: sectionStore gains `measuredPath: string`; SectionBus writes the current
  pathname with every measure. SignatureLine: when the route's config uses anchor
  waypoints and `anchors.measuredPath !== pathname`, KEEP the previous geometry (hold a
  ref of the last good geometry; skip rebuild) — uReveal is 0 during the 420ms route
  beat so nothing garbage flashes. Rebuild on the first version bump where
  measuredPath === pathname.

**A3 — C1 descent hand-off (SignatureLine.tsx + cinematic-system-scroll.tsx).**
- Replace the linear ramp with a smoothstep over ONE viewport (matches the landing
  distance so desc reaches 0 exactly when the glide ends, both C1 ends):
  ```
  const t = Math.min(Math.abs(scrollPxNow − tiltAnchorY) / ih, 1);
  const distRamp = 1 − t*t*(3 − 2*t);
  ```
- Landing glide (cinematic-system-scroll.tsx): pass a C1-at-start easing + lock:
  `lenis.scrollTo(dest, { duration: 1.05, lock: true,
  easing: (t) => (t < 0.5 ? 4*t*t*t : 1 − Math.pow(−2*t + 2, 3)/2) })`.
- On release(): `useTextMorphStore.setState({ gateKick: 0 })` to drop queued shake
  kicks; in SignatureLine scale the gate-shake spring output by `(1 − tiltEase)` so any
  residual wobble fades during the dive.
- Reverse path: the smoothstep ramp also kills the cusp at dist=0. Keep the
  window.scrollBy alignment and the in-flight `scrollRamp = 1` contract as-is.
- Keep publishing the applied `desc` to camDescend every frame (HeroLogo /
  HeroTextParticles consume it).

## TEMPLATE MAP
| Template | Verdict | What we take |
|---|---|---|
| 1. Motion sticky horizontal | adapt | tall-section + sticky row (already sanctioned pattern); **windowed counter-sweep titles** per panel |
| 2. GSAP motionPath POV pan | adapt (principle) | scrub a target, chase with a smoother; **C1 easing across beat boundaries** → informs fix A3 |
| 3. Horizontal parallax gallery | adapt | **counter-parallax media** (112% bleed, −t·5%), analytic centers (no rects/frame), UV-parallax for planes |
| 4. animate-shaders-with-GSAP | adapt | **Draggable↔ScrollTrigger bridge** (routed through lenis.scrollTo immediate), center-distance **defocus** (procedural, not Kawase-on-texture), corner-max radial hover wipe |
| 5. r3f-image-reveal | adapt | noise-eroded reveal idea → **portrait entry reveal** (SVG displacement variant chosen for DOM cards; shader variant deferred) |
| 6. OnScrollFilter | adapt | **SVG feTurbulence/feDisplacementMap mask reveal** on portraits (scrubbed, SSR-final-value, useId); velocity → subtle **skew** on the rail track |
| 7. webgl-carousel | adapt | **pyramidal y-arc** + center focus falloff; velocity "lens" → procedural defocus on rail planes (TSL), NOT MeshTransmissionMaterial (incompatible with WebGPU path) |
| rejected | — | Flip DOM re-parenting (React owns nodes); ScrollTrigger pin: (repo invariant); wheel hijack on canvas (Lenis owns wheel); MeshTransmissionMaterial lens; 2.5s gsap.to-per-frame layout (use damp) |

## NEW SECTIONS

### Work package B — Founders horizontal set piece (home) + about polish
Replace `founders-section.tsx` usage on home with new
`src/components/sections/founders-rail.tsx` (same copy, new presentation):
- Pattern: EXACTLY case-studies-rail.tsx discipline. Section keeps
  `data-line-anchor="founders"` wrapper in page.tsx (zero-layout). measure():
  `travel = track.scrollWidth − innerWidth`; `section.style.height = innerHeight +
  travel px`; sticky h-screen overflow-hidden frame; ONE ScrollTrigger (start "top top",
  end "bottom bottom", invalidateOnRefresh, onRefreshInit: measure) → quickSetter
  translateX = −travel·progress. One-shot fonts.ready → ScrollTrigger.refresh(). Full
  cleanup contract (kill, x=0, height="", listeners off).
- Panels (fixed rem widths): [P0 intro — existing section eyebrow/heading copy verbatim]
  [P1 Alessandro] [P2 Michele]. Founder panels are large editorial cards: display-serif
  name huge, role, shortBio, credential chips, previouslyAt pills, LinkedIn — all
  existing fields from founders.ts (*En/*It inline ternaries via useLanguage; ignore
  dead roleKey/bioKey).
- Motion (all analytic — derive per-panel centerX from measured static offsets − trackX;
  NEVER getBoundingClientRect per frame):
  - windowed counter-sweep on the big name: `x = −tPanel·sweepPx` (sweepPx ≈ 120–180,
    tPanel = clamp((panelCenterX − vw/2)/(vw/2), −1, 1)) via per-panel quickSetter.
  - portrait counter-parallax: portrait wrapper overflow-hidden; img width 112%,
    left −6%; `translate3d(${−tPanel·5}%,0,0)`.
  - portrait entry reveal: SVG mask — white circle r 0→final inside `<mask>`, passed
    through `feTurbulence (fractalNoise, baseFrequency≈0.035, numOctaves 2) →
    feDisplacementMap scale≈70`; ids via useId(); filter region x/y −15% w/h 130%;
    scrubbed by the SAME rail progress windowed to the panel's segment (compute from
    progress in the existing onUpdate, set attr via gsap.quickSetter attr). SSR renders
    r at final value; reset to 0 on mount only when the pinned mode is active.
  - hover: duotone→color on portraits — base layer CSS `filter: grayscale(1)
    brightness(.8)` tinted navy via an overlay; color layer clip-path circle at pointer
    expanding on hover (fine pointer only), thin cyan #3BE1FF ring at the edge. CSS-only.
- data-no-tilt on panel roots (CardTiltController owns .card-steel transforms —
  don't use .card-steel on rail panels, or opt out).
- Native fallback (≤768px / coarse / reduced-motion): unpinned overflow-x snap scroller
  with data-lenis-prevent, parallax/reveal static-final. SSR default = pinned markup.
- Keyboard: copy the rail's focusin → lenis.scrollTo conversion.
- About page (about-client.tsx): add the 112%-bleed vertical counter-parallax to the two
  founder portraits (±5%, scrubbed ScrollTrigger, no pin, no height change) + the same
  duotone hover. Nothing else changes.
- Retire founders-section.tsx from home (keep file only if still imported elsewhere —
  it is not; delete it and its orphan references).

### Work package C — Work rail redesign (home) + drag + plane polish
`case-studies-rail.tsx` (KEEP the store/trigger/measure skeleton; redesign cards +
motion), `railStore.ts`, `RailPlanes.tsx`, `railPlaneNodeMaterial.ts`, light restyle of
`case-studies-client.tsx` GridCard to match.
- Card redesign: taller editorial panels (fixed rem widths, e.g. w-[min(88vw,34rem)]),
  huge JetBrains-Mono metric, industry eyebrow, client display name, engagement line,
  STACK pills on hover; existing copy/data only (case-studies.ts). Keep RAIL_LIMIT=6 +
  SeeMorePortal + counter. Keep [data-rail-card]/[data-rail-sticky] attributes.
- Motion (analytic, in the existing onUpdate + a ticker gated on railStore.pinned):
  - center-focus falloff: `f = clamp(|cardCenterX − vw/2|/(vw/2), 0, 1)`;
    scale = 1 − 0.06·f, opacity = 1 − 0.4·f, applied on an INNER wrapper (not the
    card root), damped via quickTo.
  - pyramidal y-arc: `y = arcPx·(1 − cos(clamp(cardCenterX − vw/2)/(vw/2)·π/2))` …
    simplified: `y = arcPx·f²` with arcPx ≈ 12 — EXPORT this as a pure helper
    `railCardMotion(centerX, vw)` from a small shared module
    (`src/webgl/store/railMotion.ts`) and MIRROR it in RailPlanes' placement math so
    planes stay pixel-registered.
  - title counter-sweep: per-card metric/title x = −t·60px windowed (same t).
  - media counter-parallax on the 3 preview-image cards: 112% bleed, −t·5%.
  - velocity skew: track-level `skewX = clamp(railVelocity·k, −4, 4)deg`, damped to 0 at
    rest, applied to an inner track wrapper (transform-only).
- Drag bridge (pinned mode only): register Draggable + InertiaPlugin (both in gsap 3.15)
  on the track; type:'x', bounds minX=−travel..0; onDrag/onThrowUpdate:
  `progress = normalize(0, −travel, draggable.x)` →
  `getLenis()?.scrollTo(secTop + travel·progress, { immediate: true })` (fallback
  window.scrollTo). In ScrollTrigger onUpdate keep `draggable.x = −travel·progress;
  draggable.update()`. cursor-grab/grabbing classes. Skip entirely in native mode.
- railPlaneNodeMaterial.ts (TSL-only path, decorative): add `uParallax` (shift the
  procedural gradient/grain field horizontally: uv.add(vec2(uParallax,0)) before
  sampling) and `uFocus` (0 centered → 1 edge: reduce grain frequency/contrast + fade
  the scan sweep — a procedural defocus). Feed both from RailPlanes' useFrame analytics
  (`uParallax = tCard·0.35`, `uFocus = f`). REPLACE violet #7C5CFF with deep blue
  #2A7FFF (standing directive: cyan/blue only).
- RailPlanes.tsx: mirror `railCardMotion` y/scale offsets in the billboard placement so
  planes track the DOM cards exactly.
- /case-studies GridCard: visual alignment only (typography/chips consistent with new
  rail cards); NO pinning changes.

## WORK PACKAGES (disjoint files)
- **A (fixes):** src/webgl/SignatureLine.tsx · src/components/section-bus.tsx ·
  src/webgl/store/ (sectionStore measuredPath) · src/webgl/hooks/useSectionAnchors.ts ·
  src/components/sections/cinematic-system-scroll.tsx ·
  src/components/language-provider.tsx (event dispatch only)
- **B (founders):** src/components/sections/founders-rail.tsx (new) · src/app/page.tsx
  (swap import) · src/app/about/about-client.tsx · delete
  src/components/sections/founders-section.tsx
- **C (work rail):** src/components/sections/case-studies-rail.tsx ·
  src/webgl/store/railStore.ts · src/webgl/store/railMotion.ts (new) ·
  src/webgl/RailPlanes.tsx · src/webgl/materials/railPlaneNodeMaterial.ts ·
  src/app/case-studies/case-studies-client.tsx
No file is owned by two packages. B and C copy patterns FROM case-studies-rail.tsx; only
C edits it.

## QA SCRIPT (browser, localhost:3000, desktop 1440×900 + mobile 390×844)
1. Home full scroll: line head stays at viewport center through hero spine, rail,
   founders, production, final-cta (dev helper window.__sersanLineDebug).
2. Hero → descent: no velocity jump at the end of the dive; line head glued to camera;
   wheel during landing does not rubber-band.
3. Founders rail: pin engages/releases cleanly, names counter-sweep, portraits reveal +
   parallax, hover duotone; keyboard Tab reaches every link; mobile = snap scroller.
4. Work rail: new cards, focus falloff + arc, drag works and stays in sync with wheel,
   planes (if WebGPU flag on) track cards.
5. /audit: line tracks through the 580vh timeline (arc remap).
6. /consulting: expand FAQ accordions → line re-syncs (RO measure).
7. EN↔IT toggle mid-page → line re-syncs.
8. /about, /trust, /resources spot checks; route transitions clean; console clean.
9. prefers-reduced-motion: everything static-visible, no pin, no Lenis errors.

## RISKS
- Remap changes felt speed of the head along serpentine bends (by design — it now
  matches the reader): verify beats (audit ticks, production pulse) still land.
- Founders rail adds ~2 viewports of home height → SectionBus RO (A2) must land with or
  before B (same PR); otherwise expect transient line drift on home.
- Draggable↔Lenis: MUST route through lenis.scrollTo immediate or the page rubber-bands.
- SVG displacement filters: max 2 concurrently; constrain filter region; Safari check.

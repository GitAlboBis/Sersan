# Animation Audit + Polish Plan

> Audit-only pass (no code changed yet). Reviews every animation surface built
> so far for craft, performance, and robustness. Findings are split into
> **Verified** (read the code, confirmed) and **To confirm** (flagged by review,
> not yet code-verified — at least one such claim was already a false positive,
> so treat them with suspicion until checked during implementation).

## Goal

Decide which animation improvements are worth making, in priority order. "Better"
here means: (1) one coherent motion vocabulary, (2) no frame drops on a mid
laptop / phone, (3) reduced-motion respected everywhere.

## Surfaces reviewed

Hero GSAP timeline · `reveal-on-scroll` (framer) · `ui/reveal` (GSAP) ·
`ui/count-up` · `scene/hero-scene` · `scene/cinematic-scene` ·
`scene/production-system-scene` · `scene/cinematic-overlay` ·
`smooth-scroll-provider` + `lenis-singleton` · `globals.css` keyframes.

---

## VERIFIED findings (code-read, confirmed)

### V1 — [perf] CountUp re-renders every frame — HIGH
`src/components/ui/count-up.tsx:128` — `onUpdate: () => setDisplay(...)` fires a
React `setState` on every animation frame (~60/s × 1.2s per metric). With several
metrics on screen this is real, avoidable render churn.
**Fix:** drive the text via a ref — `el.textContent = formatPart(...)` in
`onUpdate`, keep state only for the SSR/initial + `onComplete` value. ~zero
re-renders during the tween.

### V2 — [craft] Easing vocabulary is incoherent across the site — HIGH
Multiple curves coexist on the same page:
- Hero GSAP: `expo.out` (`hero.tsx`)
- `ui/reveal`: hardcoded `expo.out`, 0.85s, but `start: "top 88%"` (fires late)
- `reveal-on-scroll` (framer): `[0.22, 1, 0.36, 1]` (snappier, different feel)
- `globals.css` `.fade-up`: `cubic-bezier(0.16, 1, 0.3, 1)` (overshoot/bounce)
**Fix:** pick ONE standard ease (proposal: `cubic-bezier(0.215,0.61,0.355,1)` ≈
expo.out) and a small duration set (e.g. 0.6s base, 0.85s for big reveals). Apply
to GSAP, framer, and CSS so everything shares one feel.

### V3 — [craft] Hero timing is ad-hoc — MED
`hero.tsx` mixes durations (0.6 / 1.0 / 0.75 / 0.55…) and inconsistent initial
offsets (eyebrow `y:18` vs words `y:32`), with hand-tuned negative overlaps.
**Fix:** timeline `defaults` (one ease + base duration), align initial `y`, use
consistent overlap offsets. Tune `stagger` (0.06 may read as a stutter on mobile).

### V4 — [robustness] hero-scene reduced-motion is CORRECT (false positive)
The review claimed DataPulse/Infrastructure animate under reduced-motion. **Not
true** — `hero-scene.tsx:178` and `:204` both gate on `reduce`. No fix needed.
Recorded so we don't "fix" a non-bug.

---

## CONFIRMED after code-read (was "to confirm")

### C1 — [perf] DepthOfField in production-system-scene — CONFIRMED, HIGH
`production-system-scene.tsx:2003` — DoF (`height={720}`, bokehScale 1.5) adds a
depth pass. It's integral to the art direction (network falls into soft
atmosphere), so DON'T remove it — instead lower its internal resolution
`height: 720 → 480` to cut cost while keeping the bokeh look.

### C2 — [perf] Canvas DPR caps — CONFIRMED, HIGH
hero-scene `[1,1.5]`, cinematic-scene `[1,1.75]` (`:304`), production-system
`[1,2]` (`:1983`). The production scene (DoF + bloom + dense network) at dpr 2 is
the heaviest thing on the page. Standardize cinematic + production to `[1,1.5]`.

### C3 — [perf] ScrollTrigger.refresh() un-debounced — CONFIRMED, MED
Two places: `smooth-scroll-provider.tsx:72` and `cinematic-system-scroll.tsx:518`.
Both call `ScrollTrigger.refresh()` directly on resize. Debounce (~150ms).

### C4 — [robustness] reduced-motion in scenes — FALSE POSITIVE
Both scenes receive + gate `reduce` (cinematic CameraRig `:232`, production
CameraRig `:616`, pulse `uFlow` `:977`). No fix needed.

### C5 — [perf] mobile fallback for the dense network — FALSE POSITIVE
`cinematic-system-scroll.tsx` has a full `MobileFallback` (≤768px → stacked, no
Canvas, `:339`/`:541`). The heavy scene never mounts on phones. No fix needed.

### C6 — [craft] Lenis jump duration — DEFER (subjective)
Leave `duration: 0.9` unless it feels abrupt in the running app. Verify by feel.

### C7 — [craft] ui/reveal trigger "top 88%" fires late + no cleanup — CONFIRMED
`ui/reveal.tsx:54` fires at `top 88%` (late) and the ScrollTrigger is never
killed on unmount. Move to `top 82%` and add `return () => st.kill()`.

---

## Proposed execution order (when we move to implementation)

1. **Motion-system pass** (V2 + V3 + V7): define ease/duration tokens, unify
   hero + reveals + CSS. Biggest perceived-quality win, low risk.
2. **CountUp perf** (V1): ref-based text update. Verified, isolated.
3. **3D perf pass** (C1 + C2 + C5): DoF, DPR, mobile fallback — measure FPS before/after.
4. **Reduced-motion sweep** (C4): verify each scene's useFrame gates `reduce`.
5. **Scroll polish** (C3 + C6 + C7): debounce refresh, scroll feel.

Each becomes its own small task (or grouped 1+2) so changes can be verified in
the running app one at a time — no big-bang animation rewrite.

## Out of scope

Adding new animations / new sections. This is polish of what exists.

---

## IMPLEMENTED (this task)

1. **Motion coherence** — added `--ease-entrance: cubic-bezier(0.16,1,0.3,1)` token
   in `globals.css`; `.fade-up`/`.fade-in` now use it; framer `EASE` in
   `reveal-on-scroll.tsx` aligned to the same curve; GSAP keeps `expo.out` (≈ same).
   Hero timeline (`hero.tsx`) consolidated to one ease + 0.7s base duration with
   consistent `-=0.45` overlaps and a looser word stagger (0.06→0.08).
2. **CountUp perf (V1)** — `count-up.tsx` now writes `textContent` via a ref during
   the tween instead of `setState` per frame → zero re-renders during the count.
   Dropped the now-unused `useState`/`display`.
3. **3D perf (C1/C2)** — `production-system-scene` DPR `[1,2]→[1,1.5]` and DoF
   `height 720→480`; `cinematic-scene` DPR `[1,1.75]→[1,1.5]`.
4. **Reveal robustness (C7)** — `ui/reveal.tsx` now `start: "top 82%"` (was 88%)
   and returns `() => st.kill()` to clean up the ScrollTrigger.
5. **Debounced refresh (C3)** — `smooth-scroll-provider.tsx` and
   `cinematic-system-scroll.tsx` resize handlers now debounce
   `ScrollTrigger.refresh()` (150ms).

NOT done (deliberate): C4/C5 were false positives; DepthOfField kept (art
direction); Lenis duration left (C6, subjective).

## ROUND 2 — visual re-skin of the hero 3D scene (user: "looks shit")

User feedback on the live preview: the cinematic hero scene (production-system-scene)
looks cheap. Specific complaints (all confirmed): the brass/gold "burning star" orb
reads as a lava-marble cliché; the amber is OFF-BRAND (brand accent is electric blue
`#29A3F5`, and `references/8bit-ai-design-reference.md` calls for cool steel/cyan, no
clichés); the faceted hex pedestal reads as a trophy/NFT plinth; the scene is too busy.

**Direction: re-skin to brand. Kill all warm/brass/amber/pink. Keep the scene concept
(orb + infrastructure base + monitoring rings + neural horizon), make it quieter and
premium, all electric-blue / cyan / steel.**

### Exact palette swap — `production-system-scene.tsx`

`CORE` object (~:1031):
- `warm  #ffe7c2` → `#bfe0ff` (cool glow)
- `brass #d8b25e` → `#29a3f5` (brand electric blue)
- `brassHot #f3dca6` → `#7cd0ff` (bright cyan highlight)
- `pink  #ff9fb0` → `#5cc6ff` (cool fill — replaces the warm fill light)
- `white #eef4ff`, `navy #0c1730`, `steel #7d9bd0` → KEEP (already cool)

Inline hexes:
- `rimMat` uColor `#ffe6ad` → `#bfe4ff`
- glass `MeshTransmissionMaterial`: `attenuationColor "#ffdca6"` → `"#bcd9ff"`, `color "#fff6ea"` → `"#eaf4ff"`
- `pearlMat` hot-white `vec3(1.0, 0.98, 0.92)` → `vec3(0.92, 0.97, 1.0)`

`NODE_PALETTE.audit` (~:187) — currently amber; recolor to a DISTINCT cooler azure so
tonal variety survives without going warm:
- rim `#ffb060`→`#3a78d0`, core `#fff0d4`→`#dbeaff`, deep `#3a1f0a`→`#0a1f3a`, spike `#ffc080`→`#8fb6ff`

Then **grep the whole file** for any remaining warm hexes (`#ff[0-9a-f]`, `#ffe`, `#ffd`,
`#ffc`, `#ffb`, `#fff0`, `#f3`, `#d8`, names `brass/warm/amber/gold/pink`) — including the
data-river / stream / "burning star" / BuildCore components — and cool them to the same
blue/cyan family. The blue grid + blue data-rivers stay; only the gold ones change.

### De-trophy + de-clutter (after the palette swap)
- The pedestal bevels/struts/LEDs recolor to blue automatically via `CORE`. Additionally
  drop the brass top-bevel torus opacity (`:1370`) from `0.6` to ~`0.3` and the per-edge
  strut opacity (`:1384`) from `0.5` to ~`0.28` so it reads as quiet machined steel, not a gold trophy.
- Trim noise: monitoring `RINGS` 3 → 2 (drop the largest, r:2.05). Lower the caustic
  alpha (`causticMat` final `*0.55` → `*0.35`).
- Do NOT remove DepthOfField / the grid / the horizon light shaft — those are the good parts.

Keep all reduced-motion gating intact. Typecheck + build must stay green. WebGL output
can't be verified headless — it will be verified via a fresh Vercel preview + user eyeball.

## ROUND 3 — depth & definition (user: "finite line, black blocks, poor definition")

After the blue re-skin, user flagged three concrete defects in `production-system-scene.tsx`:

1. **Poor definition (everything looks soft/blurry).** Causes: DoF `focusRange: 0.012`
   is a razor-thin focal slice so all-but-the-orb is bokeh; and round-1 cut DPR `2→1.5`
   and DoF `height 720→480`. FIX:
   - Canvas `dpr={[1, 1.5]}` → `{[1, 2]}` (~:1983). Mobile uses MobileFallback, so this
     is desktop-only; the hero needs the sharpness more than the perf.
   - `DepthOfField` (~:2003): `focusRange 0.012 → 0.05`, `bokehScale 1.5 → 1.0`,
     `height 480 → 700`. Orb stays crisp; background gets a GENTLE fall-off, not a blur.
   - Give the rivers more presence: `<Line>` `lineWidth 2 → 2.6`, base `opacity 0.2 → 0.3`
     and the useFrame opacity floor `0.18 → 0.26`.

2. **Black blocks in background.** The `ribs` "architectural silhouettes" (def ~:742-749,
   render ~:761-773) are opaque `#090d1a` boxes that read as hard dark slabs instead of
   fading into haze. FIX: remove them entirely (the `ribs` useMemo and the `ribs.map(...)`
   JSX). Cleaner empty background recedes better.

3. **Finite line.** The data-rivers (`DataRivers`, ~:1869) are `<Line>`s from a hard
   source point (x≈-9..-11) to the core with flat opacity — so each line STARTS abruptly
   in mid-air. FIX: fade each river in from its source. Since blending is AdditiveBlending,
   pass `vertexColors` (RGB) per point ramped from near-black at the source to full colour
   over the first ~30% of the curve (and a slight taper into the core end), so the line
   emerges from darkness instead of a hard endpoint. Keep the two-tone `#7fb4d8` / `#5cc6ff`.

Keep reduced-motion gating, the grid, and the horizon light shaft. tsc + build must pass.
WebGL output verified via Vercel preview + user, not headless.

## ROUND 4 — premium polish (ui-ux-pro-max: focal hierarchy, cinematic depth)

Design intel (premium-dark / cinematic): focal subject needs an accent GLOW behind it;
tighter cinematic vignette to draw the eye; crisp focal detail on the subject; slow fluid
motion; NO new background clutter (user already said "too busy"). Goal = make the orb read
as a deliberate luminous focal point, not a floating object. `production-system-scene.tsx`.

1. **Accent glow behind the orb (focal hierarchy).** Add ONE billboarded soft radial glow
   plane behind the orb inside the OperateCore `group` (centred on the orb, slightly behind
   in +z-toward-camera/back). Radial shader: `#29a3f5` centre → transparent edge, additive,
   depthWrite false, toneMapped false, scale ~7-8 units, peak alpha ~0.22. Billboard it to
   face camera each frame (or use a large sphere-backside glow). Reduced-motion safe (static).
   This anchors the orb as the luminous focal point. Do NOT add any other new geometry.
2. **Cinematic vignette.** EffectComposer `Vignette`: `darkness 0.72 → 0.85`, `offset 0.3 → 0.26`.
   Tighter focus on centre/subject without crushing the corners to pure black.
3. **Crisp focal detail.** `rimMat` fragment rim multiplier `* 1.7 → * 2.1` (sharper orb edge).
   Eval-gate node spheres on the rings: opacity `0.95 → 1.0` and bump their size `0.045 → 0.05`.
4. **Fluid, deliberate motion.** Iris spin `irisRef.rotation.z = t * 0.22 → t * 0.16`; orb
   hover keep. Nothing frantic.

Constraints: no new background elements, keep the 2 rings, keep reduced-motion gating, grid,
horizon, DoF (focusRange 0.05). tsc + build green. Verified via Vercel preview + user.

## ROUND 5 — kill empty sky at top (camera framing)

User: empty dead space at the top of the frame. Cause: the WIDE waypoints
(`WAYPOINTS[0]` dormant, `[5]` online) look at `y:0`/`y:0.5` from height 4.5/5.5, so a
big band of empty sky sits above the content. Mid waypoints (1-4) are close-ups, fine.
Fix: tilt the two wide waypoints DOWN by lowering their `look.y`, so the horizon rises
and floor/network/orb fill the frame. `production-system-scene.tsx` WAYPOINTS (~:82):
- WP0 `look [0,0,0]` → `[0,-1.2,0]`
- WP5 `look [0,0.5,0]` → `[0,-0.8,0]`
Leave positions, fov, and the close-up waypoints (1-4) untouched. tsc+build green; user verifies.

## ROUND 6 — swap live WebGL orb for the generated static render

Decision (user): KEEP the 400vh cinematic scroll spine, but replace the live
`ProductionSystemScene` WebGL Canvas with a generated premium static image, with
subtle scroll parallax. Image saved at `public/images/hero/orb-core.png` (1376×768,
16:9): electric-blue plasma orb on a dark hex pedestal, orbital rings, center-right,
left half dark/clean for the headline. This is verifiable (a real image), unlike the
shader scene.

In `src/components/sections/cinematic-system-scroll.tsx`:
1. Remove the `ProductionSystemScene` dynamic import + its `<ProductionSystemScene>`
   usage (the WebGL layer in the sticky stage). Keep everything else (StagePanels,
   StageRail, ScrollHint, CinematicOverlay, the gradient/vignette divs, assetsReady fade).
2. In its place render the static image as the backdrop of the pinned stage:
   `next/image` (fill, priority, `object-cover`, `object-position: center right`,
   `quality 90`). Wrap in the existing `assetsReady`-gated fade div (and add the orb png
   to the preload `urls` list, or just rely on `priority`).
3. Add SUBTLE scroll parallax driven by `progressRef` in a rAF loop (like StagePanel):
   gently scale the image `1.06 → 1.14` and translateY a few px across progress 0→1, plus
   a very slow ambient drift. Reduced-motion (`reduceMotion`): static, no transform.
4. Keep the existing left→right + bottom readability gradient divs so the headline stays
   legible over the image; keep the bottom vignette. The image's own left third is already
   dark, so the headline (bottom-left) reads well.
5. Mobile: leave MobileFallback as-is (no image), it's clean.

Readability polish (in-spine, low risk):
- StagePanel body copy: bump contrast — `text-ink-mute` → `text-foreground/80` (brighter).
- Nudge the panel up slightly: `pb-20 sm:pb-28` → `pb-24 sm:pb-32` is NOT it — instead keep
  bottom anchor but it's fine; do not move if risky.

Out of scope this round (separate follow-up): global color-token swap to the brief's exact
hexes (#080C12 / #38B6FF / #F3F7FB / #9BA8B8), navbar refinement, language-toggle restyle,
microcopy. Note them; don't do them here.

tsc + build must pass. This round IS visually verifiable (static image) — deploy to Vercel
and the user can finally judge a stable composition.

## ROUND 7 — hero text legibility over the static render

Screenshot review of round 6: the static orb hero looks premium, but the mono labels are
too faint over the image and the bottom-left text column needs a stronger scrim. Fixes in
`src/components/sections/cinematic-system-scroll.tsx`:
1. Stronger readability scrim for the text column: strengthen the bottom vignette div
   (raise its height to ~3/4 and make the bg stops more opaque toward the bottom), AND make
   the left→right gradient div show on ALL breakpoints (remove `hidden lg:block`) and
   strengthen its left stop (e.g. `hsl(var(--bg)/0.85)` at 0%). Net: the lower-left text
   sits on a clearly darker underlay without dimming the orb on the right.
2. Brighten the faint mono labels in StagePanel:
   - eyebrow `<p className="eyebrow ... text-ink-mute">` → use `text-ink/80` (brighter).
   - keyword strip: `text-ink-mute/85` → `text-ink/85`; trailing `text-ink-mute/55` → `text-ink-mute/80`.
   - proof `<ul>`: `text-ink-mute/70` → `text-ink/75`; separators `/40` → `/55`.
Keep everything else (image, parallax, panels). tsc+build green; verify via screenshot.

## ROUND 8 — make the orb image MOVE with the spine (user loves the look, wants motion back)

The static render lost the dramatic scroll motion the WebGL camera had. Current HeroBackdrop
parallax (scale 1.06→1.14, -14px) is imperceptible. Make it a clear cinematic dolly tied to
`progressRef` (0→1 across the 400vh spine). `cinematic-system-scroll.tsx`, `HeroBackdrop` only:
- scale: `1.06 + p*0.08` → `1.08 + p*0.30` (1.08 → 1.38 push-in)
- pan: translateX `-p*6%`, translateY `-p*5%` (camera drift; % so responsive)
- keep ambient float (bump to driftY ±3px, driftX ±2px) + a tiny scale breath `+ Math.sin(t*0.5)*0.006`
- compose: `translate(${tx}%, ${ty}%) translate3d(${driftX}px,${driftY}px,0) scale(${scale})`
- NO rotation (would tilt the grid/pedestal horizon — looks wrong).
- Because scale grows with p faster than translate, no image edge is ever revealed (overscan > pan at all p).
- reduceMotion: static `scale(1.08)`, no updates. Update the initial inline style scale 1.06→1.08.
tsc+build green; user verifies motion on Vercel.

## ROUND 9 — neural-network depth layer behind the orb (user: feels over-simplified, add premium NN)

The static orb on flat dark reads bare. Add a lightweight ANIMATED neural-network layer that
gives premium depth around/behind the orb. The orb png is opaque (RGB, baked dark bg), so a
layer truly behind it is hidden — instead composite the network OVER the image with screen
blend so it glows through the dark field (the bright orb naturally dominates its own area),
behind the text/overlay. Parallax at a DIFFERENT rate than the orb → real depth.

New component `src/components/scene/neural-net-layer.tsx` (Canvas2D, "use client"):
- Full-bleed `<canvas>`, `absolute inset-0`, `pointer-events-none`, `style mixBlendMode:"screen"`,
  `aria-hidden`. DPR-aware sizing (cap dpr 2), ResizeObserver/resize handler, cleanup.
- ~50 nodes at random positions; connect pairs within a distance threshold with thin lines whose
  alpha falls off with distance; ~6 signal pulses traveling along random edges.
- Palette: electric blue `#38B6FF` + cyan `#7cd0ff`; LOW alpha (lines ~0.18, nodes ~0.5, pulses ~0.9)
  — premium subtle depth, not busy. Slight node twinkle.
- Motion: slow node drift + pulse travel via rAF. **Draw one frame synchronously on mount BEFORE
  starting rAF** (so a static frame always exists — screenshot-verifiable + reduced-motion safe).
- Scroll parallax: accept `progressRef`; translate/scale the whole field slightly with progress at a
  rate distinct from the orb (e.g. scale 1.0→1.12, translateY -p*3%) so it parallaxes against the orb.
- `reduceMotion` prop: draw the single static frame, no rAF loop.

Wire into `cinematic-system-scroll.tsx` sticky stage: render `<NeuralNetLayer progressRef reduceMotion>`
BETWEEN `HeroBackdrop` (below) and `CinematicOverlay` (above), inside the assetsReady-gated area is fine
(or just below the overlay). Keep everything else. Mobile fallback unchanged.

tsc+build green. Static frame screenshot-verifiable; scroll motion verified on Vercel by user.

## ROUND 10 — make the neural network more prominent behind the planet

User: network too faint, want it more prominent behind the orb. `neural-net-layer.tsx` tuning
(screen-blend over the opaque orb image → it reads in the dark surround = "behind the planet"):
- nodes ~50 → ~80; connection distance threshold ~0.16 → 0.19 (denser web)
- line max alpha ~0.18 → ~0.32; node alpha ~0.5 → ~0.72; twinkle keeps subtle variation
- pulses ~6 → ~10, larger + brighter (cyan, alpha ~0.95, slightly bigger radius + soft glow)
- keep electric-blue/cyan palette, screen blend, parallax, draw-once-sync, reduceMotion static
Readability is safe: the bottom-left scrim/vignette divs sit ABOVE this layer, so denser network
doesn't hurt headline legibility. tsc+build green; verify static frame via screenshot (resize wide).

## ROUND 11 — full audit remediation ("fix all")

Canonical contact email: **alex.s@sersan.dev** (replace ALL `hello@sersan.io`, `info@sersan.io`).
Decisions: KEEP the 400vh cinematic spine (fix its liabilities, don't shorten/remove). KEEP the
orphaned R3F scene files + three/r3f deps (possible revert) — dead-code removal is OPT-IN, not now.

Run as sequential workstreams, build-verify between each:

**WS1 — Conversion plumbing + email + CTA unification (P0 #1/#2):**
- New `src/lib/site.ts`: export `CONTACT_EMAIL="alex.s@sersan.dev"`, `START_HREF="/start"`, `CAL_URL` (existing Cal link).
- `contact-form.tsx`: stop the console.log; actually POST (to `/api/intake` or a new `/api/contact`); real submitting/error/success states; success copy uses CONTACT_EMAIL; recolor success accent brass→`--accent`.
- `multi-step-intake.tsx`: fix payload + enums to EXACTLY match `api/intake/route.ts` zod schema so `/consulting` stops 422-ing; surface server errors honestly.
- Unify every "Book a call" CTA href to `START_HREF` via the constant; normalize label variants to one; on `/start` add one line clarifying it leads to a scheduled call. Secondary CTA one label.
- Footer + everywhere: email → `mailto:alex.s@sersan.dev`; fix the Mail icon href; one address.

**WS2 — Brand unification (P0 #4):** across inner pages (`about/`, `contact/`, `faq/`, `case-studies/`,
`resources/`, `trust/`, `audit/`, `consulting/`, `not-found`, `error`) + demoted sections: replace
`accent-warm`→`accent` for customer-facing UI, and `container mx-auto px-6`→`container-px`. Keep brass ONLY
where deliberately secondary (logo can stay if intentional — confirm).

**WS3 — Hero spine a11y/perf (P0 #3/#6, P1):** `cinematic-system-scroll.tsx` + `neural-net-layer.tsx`:
- Under `prefers-reduced-motion` on desktop, render the stacked `MobileFallback` instead of the pinned scrub.
- Make every non-active stage panel `inert` (and not in tab order); only the lit panel is focusable.
- Consolidate the per-panel rAF loops into ONE progress-driven loop that early-returns when progress is
  unchanged; DELETE the dead mouse-smoothing loop (its WebGL consumer is gone).
- Ungate the orb LCP: drop the `assetsReady` opacity gate on `HeroBackdrop` (let `priority` paint it); keep
  the fade only for `NeuralNetLayer`/overlay. Remove the JS `new Image()` planet preloader array.
- Add a real scrim directly behind the text column (semi-opaque `--bg` panel sized to the text) so contrast
  over the orb is guaranteed ≥4.5:1 at all scroll positions.

**WS4 — Platform/perf:** `layout.tsx`: fonts `display=optional`→`swap`; remove the 5 planet `<link rel=preload>`;
set `<html lang>` from stored language (cookie/synchronous) not hardcoded en. `next.config.ts`: `images.formats:
["image/avif","image/webp"]`, bump `minimumCacheTTL`. (Self-hosting fonts = follow-up, needs woff2 files.)

**WS5 — a11y polish:** `globals.css`: add `prefers-reduced-motion` rule zeroing `--animate-marquee*`; raise input
border to ≥3:1; floor label color at solid `ink-mute` (no `/55–/80` on real text). `input.tsx`/`textarea.tsx`:
placeholder ≥4.5:1. Form fields: `aria-invalid`+`aria-describedby`, focus first invalid on submit. `navbar.tsx`:
language toggle + icon buttons toward 44px. Footer Mail icon fixed in WS1.

Each WS: tsc + build green. Visual ones verified via screenshot at width≥1024 (avoid the headless mobile-fallback
quirk). Then commit + finish.

## QUEUED — 4K orb upscale (blocked on credits)

User wants the hero orb at 4K (1K softens on zoom). Image MCP: 4K = 4 credits, balance = 0.88
→ blocked until top-up. When credits available, do an IMG2IMG upscale that PRESERVES the
current orb (don't re-gen from scratch — produces a different orb):
- model `nano_banana_pro`, `resolution: "4k"`, `aspect_ratio: "16:9"`
- pass the CURRENT orb as a reference `media` (URL: the cloudfront rawUrl from job
  84152cb0-5c57-4fbb-8fed-196aec859f73, or re-upload `public/images/hero/orb-core.png`)
  with the appropriate reference/image role (check models_explore for the role name)
- prompt: "Upscale to crisp 4K, same composition/colours/orb, sharper internal plasma detail,
  same dark navy bg + orbital rings + hex pedestal. No changes to layout."
- save to `public/images/hero/orb-core@4k.png` (or replace orb-core), keep next/image priority.

Interim (done): reduced HeroBackdrop push-in scale so 1K softness isn't magnified on zoom.

## Verification

- `npx tsc --noEmit` — clean.
- `bun run build` — passes; full route table prerendered.
- Dev server: homepage renders correctly (desktop layout, H1, CTAs, metric strip,
  brand accent), **no console errors/warnings**.
- LIMITATION: the headless preview does not run `requestAnimationFrame` (verified —
  rAF callbacks never fire), so animation *playback* (GSAP tweens, R3F scene,
  count-up, scroll) could NOT be observed in-browser here. Changes are
  code-verified + reasoned, not motion-observed. Needs a real-browser eyeball pass.

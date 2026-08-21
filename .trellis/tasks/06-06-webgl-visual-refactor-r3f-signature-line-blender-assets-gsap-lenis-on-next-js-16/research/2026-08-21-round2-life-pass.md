# Round 2 — "LIFE PASS" (2026-08-21, owner feedback after the first ship)

Owner verdict on `b8a4bc0`/`bfc8511`/`4d2eb52`: **the direction is approved**, but:
1. The neural-section panes lost their animation — they must be ALIVE, borrowing the reference
   sites' motion (Noomo panels drifting at depth, AT billboards, spring hovers, decode type).
2. Services: when the POV camera CENTERS a card, its **contours must ignite** (perimeter light,
   not just the current left edge).
3. ALL the display type in these sections must be choreographed with GSAP, award-site style
   (the repo already owns the vocabulary: SplitText cascade via heading-choreographer,
   RollingTitle letter-roll, LabelScrambler decode).
4. The signal stream is a DRAFT — "non mi piace ancora". Beauty pass required ("bellissima").

Constraints unchanged (DIRECTION doc): copy freeze, transform/opacity-only DOM motion, quickTo
discipline, RM = settled visible state, no violet, budgets. NEW rule for this round: DO NOT
edit `globals.css` (three agents run in parallel — keep CSS in file-scoped <style> blocks or
Tailwind utilities).

## A. services-section.tsx — contour ignition + type

1. **Contour ignition.** Replace the left-edge-glow `[data-pov-focus]` visual with a PERIMETER
   DRAW, same element/attribute/GSAP-opacity contract PLUS a draw channel:
   - Inside the focus span, an absolutely-inset SVG (`inset-0 h-full w-full overflow-visible`)
     with a single `<rect>` (rx matching the slab's 1rem radius, `fill=none`,
     `stroke=url(#grad)` cyan #3BE1FF → blue #2A7FFF gradient, strokeWidth 1.5,
     `pathLength=1000` so dash math is resolution-independent, vector-effect
     non-scaling-stroke).
   - The POV scrub's per-card focus value g (already fed to the ring quickTo) now ALSO drives a
     quickTo on `strokeDashoffset` 1000→0 (the contour draws around the card as the camera
     arrives, completes at lock) and a soft outer glow (`filter: drop-shadow(0 0 12px
     hsl(var(--accent)/0.55))` STATIC on the rect — never animated, only the parent span's
     GSAP-owned opacity gates it, so no filter animation cost).
   - Add a faint static inner top-highlight so the un-focused state still has an edge.
   - Rail (`max-sm:` data-focus) variant: CSS-only equivalent — stroke-dashoffset transition
     560ms var(--ease-lusion) on `[data-focus=true]`, scoped exactly like today.
2. **Type.** The local chapter heading (h2 + annotation) currently has no choreography:
   - Wire the section's existing IO pattern to a GSAP timeline: title reveals as MASKED LINE
     RISES (SplitText lines, `overflow:hidden` wrappers, yPercent 110→0, stagger 90ms,
     expo.out — the site's heading-choreographer grammar; reuse `components/fx/
     heading-choreographer` if its API fits a bare h2, else a local minimal SplitText timeline
     with `revert()` on cleanup and `key={language}` remount discipline).
   - Annotation: fade/blur-up after the title (delay ~0.3s).
   - Card slab titles (serif, per card): masked single-line rise on first stage entry
     (IO-once on the stage, stagger by card index); ghost numbers count no animation (they are
     watermarks). Includes lines: 40ms stagger fade-up. All `motion-reduce` guarded, all
     replay-free (once).

## B. problem-section.tsx + production-grade-section.tsx + stream-pane.tsx — pane life + type

1. **Panes get the Noomo/AT depth life** (this is the owner's main complaint):
   - **Scroll drift at depth:** each pane gets a continuous scroll-linked parallax (translateY
     driven from Lenis scroll via ONE rAF-coalesced onScroll per section — or the site's
     use-scroll-parallax hook per pane with different speeds): depths alternate (pane 0: −18px
     max, pane 1: +26px, pane 2: −34px relative drift across the section's viewport travel),
     plus their existing static rotations. The cascade visibly floats as you scroll — panels
     at different depths, never a hard scrub.
   - **Spring hover (fine pointer only):** pointer-tilt toward cursor à la FeaturedWorkPlanes
     but DOM: on pointermove over a pane, target rotateX/rotateY (max ±3.5°) + translateZ-ish
     scale 1.015, chased by gsap.quickTo (0.6s, expo out); on leave, spring back with subtle
     overshoot (back.out(1.4)). Hairline brightens + pane bg alpha rises 0.55→0.68. Existing
     setHovered store link stays.
   - **Reveal upgrade:** replace the plain blur-up with the award grammar: pane slides from
     its side (±48px x) + rotateZ from ∓2.5°→ its rest tilt + blur 8→0 + opacity, stagger
     120ms, expo.out 0.9s; eyebrow inside scramble-decodes (LabelScrambler treatment — give
     pane eyebrows the `.eyebrow`-compatible hook or a local scrambler call); claim/body lines
     masked-rise 60ms stagger after the pane lands. IO once per page life; RM = everything
     visible instantly (never hidden without JS-motion).
   - **Idle micro-float:** a very slow per-pane sine bob (y ±3px, 6-8s period, phase-offset by
     index, gsap.ticker or a single looping tween) so the stack never sits dead still.
     Killed under RM.
2. **Type:** chapter h2 masked line-rise + annotation fade (same recipe as §A2); the ghost
   callout labels already scramble. Production's pane sequence keeps firing bumpCluster on the
   same beats as the pane reveals so DOM and rings ignite together.
3. Keep budgets in mind: no layout-affecting animation; the max-sm tightening stays.

## C. fit-section.tsx — statement + pane content choreography

1. **Statement:** on first entry into the pinned frame (IO on the runway, once), the giant
   title plays a masked LINE-RISE (SplitText lines on the h2 — beware: the statement is
   SSR-painted; prime hidden ONLY inside the intro timeline i.e. set→play in the same tick,
   and skip entirely under RM so SSR text is never hidden without motion). Eyebrow already
   scrambles. Annotation blur-fades after.
2. **Pane content:** when a pane enters its HOLD window (`.is-held` add — the existing single
   write point), stagger-play inside the pane: ✓ row masked-rise, divider scaleX 0→1, ✗ row
   rise then strike draw (existing), index fade. On scrub-out reverse nothing (content stays).
   Implement as CSS transitions keyed off `.is-held` (already the idiom) — GSAP only if CSS
   can't sequence it cleanly (transition-delay chains are fine).
3. Counter digits: roll on beat change (the site's preloader rolling-digit flavor): wrap the
   two counter digits in an overflow-hidden box and translateY-roll on textContent change
   (small local helper, transform-only).

## D. WebGL beauty pass — neuralLatticeConfig.ts / neuralFieldCompute.ts / NeuralLattice.tsx

Owner: current stream is a blobby vortex — a DRAFT. Target look (from the references):
Active Theory's luminous particle nebulas + igloo's crisp icy ignition rings. Concretely:

1. **River silhouette legibility:** the braid must READ as a horizontal river:
   - Tighten the thickness envelope (rest ~34px visual) and make 4 strands PHASE-SEPARATED
     (distinct twist phases, per-strand thickness bias) so filaments are visible, not a blob.
   - Size falloff: core particles 1.6×, fringe 0.6×; alpha ramp along flow-t: fade-in over
     the first 8%, fade-out over the last 6% (kills the hard edges and the recycle pop).
   - **Velocity-stretched sprites** on the compute tier (stretch along velocity dir up to 3×
     at surge speed) — the AT streak look. Static tier: mild fixed elongation along tangent.
   - Slight z-bow of the spline toward camera at t=0.5 (+0.06 local) for dimensionality.
2. **Color:** core #EAFBFF-white-cyan (only innermost radius), body #3BE1FF, fringe #2A7FFF
   fading to transparent navy. Surge head rides at 1.3-2.2 emissive (white-cyan) with a
   40px-visual trailing gradient. NO violet.
3. **Broken:** the fracture must be a clean BREAK, not mush: last coherent x + a 4%-wide gap,
   then debris. On surge death: a spark burst (24-40 particles get a 0.5s outward kick +
   bright flash then die) — reuse the meta.role channel; debris alpha 0.35 max, ember
   #4A443E→#6B5546 ramp, and FIX the recycle streaks (zero alpha while a particle's flow-t
   wraps, one-frame hold).
4. **Healthy rings:** igloo ignite — rings become CRISP: torus particle density ×2 at ring
   radius, ring particles slightly whiter, and the flash = radial shockwave ripple (ring glow
   expands 1→1.25 radius over 0.5s while emissive spikes >1.0 then decays). Between rings the
   braid visibly tightens (thickness 1→0.62 stepwise after each ring).
5. **Idle dignity:** when uninteracted, the stream must still be beautiful — slow hue
   shimmer (±4% lightness noise), gentle breathing of the envelope (±6%, 7s), continuous flow.
6. Preserve every contract from round 1 (buffers ≤4, slots, backend gating, store API, rect
   registration, analytic fallback parity — update BOTH branches and the SVG twin's look only
   if trivial: thinner strands + fade edges; do not rebuild the SVG).
7. Expose/extend the dev handle (`window.__sersanNeuralLattice_<anchor>`) with the tunables
   you add (envelope, strand phases, surge gains, spark counts) so the next live-tuning pass
   can iterate without recompiles.

## Acceptance (all)
- tsc clean; copy byte-identical (nothing in this round touches strings); no globals.css
  edits; RM = settled visible; no SVG filters animated; 60fps desktop during pane hover +
  stream surge simultaneously.
- Live pass: panes visibly drift/tilt/breathe; services contour draws as the camera lands;
  every chapter title plays a masked rise; the stream reads as a luminous river that breaks
  (problem) / locks through igniting rings (production).

# Problem + Production refactor — "SIGNAL STREAM" (2026-08-21)

One shared visual language replacing the NeuralLattice look (orb-triangle + arcs + packets), the
NeuralCard chrome (glass accordion cards) and the boot/burst animation style in BOTH
`src/components/sections/problem-section.tsx` and
`src/components/sections/production-grade-section.tsx`. Copy byte-identical (D-17 string
included, as shipped). The two sections stay twins: same grammar, opposite narrative
(broken vs healthy) — that symmetry is owner-approved and stays.

References driving this spec:
- **Igloo (live, 2026-08-21):** the convergence finale — loose fragments assemble, a ring seals
  and IGNITES with an electric ring-glow, the camera passes through; callout labels with leader
  lines that scramble-decode; blueprint dimension ticks; ghost depth-blurred type in fog.
- **Active Theory:** dense particle nebulas as the world; frosted panes floating beside them;
  decode/glitch type on mono labels.
- **Noomo:** statement + tiny annotation; panels at depth in front of big type.
- **Lusion:** chapter heading span-12; meta text column beside the media/centerpiece; chrome-less
  surfaces; one gesture per section.

## The WebGL centerpiece: SIGNAL STREAM (replaces NeuralLattice's look, keeps its plumbing)

A dense luminous particle STREAM — a river of ~9000 particles (3200 compact tier) flowing
left→right through the section's `[data-lattice-anchor]` rect, camera-locked exactly like the
current lattice (rect→camera-plane placement, uniforms updated on measureVersion — reuse
`neural/neuralFieldCompute.ts`'s uniform-driven-homes pattern; per-particle homes computed
in-shader from a spline of 4-5 uHub-style control points across the rect, with thickness noise →
a braid, not a line; NOT thin arcs — the rejected CurlTube look — this is a WIDE braided river,
40-60px visual thickness at rest, cyan #3BE1FF core → blue #2A7FFF fringe).

- **Problem — "broken".** The stream flows laminar for the first ~55% of the rect, then hits a
  FRACTURE (uFracture x-position uniform): beyond it particles lose the spline home and disperse
  into slow drifting debris (wander force from the shared unifiedForceStep), dimming from cyan to
  ember-grey. Every ~4s (and on the existing in-view `bump("broken")`) a brighter surge rides the
  stream from the left and DIES at the fracture with a small burst + brief >1.0 emissive flash
  that immediately decays — the demo that never survives contact with production. Pointer near
  the stream bends it locally (cursor attractor, existing force model).
- **Production — "healthy".** Same stream, but threaded through THREE GUIDE RINGS (torus or
  ring-sprite at 25% / 50% / 75% of the rect — echo of igloo's ring-seal): particles tighten as
  they pass each ring (spring gain up near rings → visibly laminar after each). On the existing
  in-view boot moment (once per page life, replacing the old boot timeline's marker/halo/card
  choreography): rings ignite in pipeline order (eval → trace → guardrail), each with a short
  >1.0 emissive ring-flash (igloo ignite, selective bloom) — keep `bumpCluster("healthy", i)`
  as the store signal driving each ring's flash so the store surface survives. Every ~6s a surge
  rides the whole stream and SURVIVES, ringing each guide ring as it passes.
  `productionPulseStore.bump()` on in-view stays untouched.
- **Hover link (replaces marker-opens-card):** pane i hover/focus → `setHovered(mode, i)` (store
  API unchanged) → ring i flares / (problem) the fracture-side debris briefly re-coheres toward
  the spline then falls apart again (a "what if it were fixed" tease). No card opening.
- **Tiers:** WebGPU compute full/compact as today (same mount gate). Non-compute backend →
  analytic static build (stream drawn at rest pose, rings lit, fracture dispersed — reuse
  `createStaticParticleNodeBuild` pattern). Fallback SVG twin: REWRITE
  `components/fx/neural-graph-fallback.tsx` as the stream: one thick braided path (3-4 parallel
  offset paths), broken = paths break/fray after the fracture point with scattered dots; healthy
  = three ring outlines with stroke-dashoffset ignition in order. Same broken/healthy props,
  same reduced-motion behavior (static final state, no timers). MUST land in the same commit.
- **File plan:** new `src/webgl/SignalStream.tsx` + `src/webgl/neural/signalStreamConfig.ts`
  (or refactor NeuralLattice in place keeping the export name used by Scene.tsx — implementer's
  choice; Scene mount gate, anchor names `problem`/`production`, and neuralLatticeStore API must
  keep working; delete dead lattice-specific code paths when done).

## DOM layout (both sections — Lusion detail grammar + Noomo pairing)

1. **Chapter heading.** Existing title strings promoted to the chapter scale:
   - Problem: "Most AI projects don't fail at the prototype. They fail two months after." →
     `clamp(2.6rem, 4.8vw, 5.75rem)` display serif, `leading-[0.98]`, spanning the FULL
     container width (span-12 — no more 0.9fr column), italic span kept on the second sentence.
   - Production: "Three things every SerSan system ships with, before we call it done." → same
     scale. Eyebrows stay mono ("The demo-to-production gap" / "What production-grade actually
     means"), LabelScrambler decode on in-view if trivially reusable.
   - The `description` strings move to the right-hung annotation slot (~320px, text-[13px]
     text-ink-mute, top-right of the heading block on lg:, natural stack below).
   - Problem's `[data-emerge]` wrapper MUST remain around the heading block (singularity-passage
     zoom landing target) — verify position in the new markup.
2. **The field row.** Below the heading: a full-width band `min-h-[420px] lg:min-h-[520px]`
   holding the WebGL anchor rect (`NeuralCenterpiece` replaced by a slimmer
   `[data-lattice-anchor]` div — keep the same data attribute and the fallback slot) as the
   BACKGROUND of the band (absolute inset-0), with the three panes laid OVER it, offset to one
   side (Problem: panes right, stream flows toward/under them, fracture visibly in the open left
   2/3; Production: panes left, rings in the open right 2/3). Igloo-style garnish inside the
   band (aria-hidden): a faint dot-grid overlay (CSS background-image radial-gradient dots at
   ~4% alpha) and 2-3 mono ghost labels (existing cluster label strings "eval baseline" /
   "trace propagation" / "guardrail clamp" for production; for problem the effect strings
   "no signal" / "no debugging" / "no trust") positioned near the rings/fracture as CALLOUTS:
   tiny mono uppercase labels with a 1px leader line (CSS pseudo-element) pointing into the
   field, scramble-decoded on in-view (LabelScrambler). These reuse EXISTING strings only —
   no new copy. They are aria-hidden (the same strings live in the panes/SR content).
3. **The panes.** Three glass panes (shared glass-pane grammar from the fit spec: chrome-less,
   backdrop-blur, top hairline, radius 2xl, ambient shadow), z-cascade stacked with slight
   offsets and ±1.5-2° rotations (Noomo/AT depth), each fully open — claim + body ALWAYS
   visible (no accordion; content-visibility increase, allowed):
   - Problem pane i: mono eyebrow `0${i+1} · {cause} -> {effect}` (existing strings, `->` in
     accent) + body text.
   - Production pane i: mono eyebrow = cluster label ("eval baseline"…), claim string in
     `font-display text-[22px] leading-tight`, `why` body under a hairline.
   - Hover (fine pointer): pane lifts/untilts toward flat + hairline brightens + fires
     `setHovered(mode, i)`; focus-visible does the same (panes get tabIndex=0 + the existing
     aria labelling semantics simplified — no aria-expanded any more since nothing collapses).
   - Scroll-in: panes slide from their side with blur-up (`translate-y-6 blur-[6px] opacity-0`
     → clear) staggered 90ms, `--ease-lusion`, IO-driven once, reduced-motion = visible-first.
4. **Closers kept:** Production's "We do not claim compliance certifications we don't hold…"
   line and Problem's section spacing stay.

## Delete list
- `components/fx/neural-card.tsx` + `neural-node-marker.tsx` + `neural-centerpiece.tsx` replaced
  by the new band + panes (delete files if no other consumer; grep first). Their globals.css
  blocks (`.neural-card__*`, `.neural-node-marker__*`, `.is-booting`, `.is-igniting`, arc
  fallback selectors) go in the same commit.
- Production's GSAP boot timeline (replaced by: IO once → staggered pane reveal + sequential
  `bumpCluster` calls spaced ~0.35s driving the WebGL ring ignitions; reduced-motion skips both).
- Problem's `useScrollParallax(5)` wrapper may stay (cheap, still tasteful) — implementer's call.

## Mobile (coarse <640px)
- Band min-height ~300px; panes stack vertically (no z-cascade, no rotations) below the band;
  callout ghost labels hidden (`max-sm:hidden` — they're aria-hidden garnish); budgets:
  Problem ≤954px, Production ≤1114px @390×844 — the always-open panes are taller than the old
  collapsed cards, so compensate: band shrinks, pane paddings tighten (`max-sm:` additive only),
  body text 13px. Verify with a 390×844 measurement pass. useCentreFocus auto-open logic is no
  longer needed (nothing collapses) — remove its wiring here.
- fxBudget/tier mount gates unchanged; capable phones (level 2) still get the stream at 3200.

## Acceptance
- Both sections read as siblings; no orb-triangle, no boxed cards, no boot halos anywhere.
- Stream visibly BREAKS in problem and visibly LOCKS/ignites in production; surges behave as
  specified; hover link works from panes; bloom only via >1.0 emissive.
- Stores: bump/bumpCluster/setHovered still the only cross-layer API; SVG fallback twin shipped
  in the same commit; `[data-emerge]` intact; signature-line production glow intact.
- tsc + lint clean; strings byte-identical (grep-verify every EN/IT string before/after);
  reduced-motion = static readable final state; 390×844 budgets measured and met.

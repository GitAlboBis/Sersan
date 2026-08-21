# Round 4 §B — STREAM V4: the best mined effects (2026-08-21)

Owner: "puoi fare molto meglio, anche nell'altra rete neurale. Utilizza i migliori effetti che
ci sono nel reverse engineering che hai fatto." Both stream modes get the strongest unused
techniques from the mining dossiers (`2026-08-21-igloo-tunnel-mining.md` — real GLSL with the
math; AT/Lusion grammars in `2026-08-21-refactor-DIRECTION.md`).

Files: src/webgl/neural/* + NeuralLattice.tsx (and neural-graph-fallback.tsx only if a change
maps trivially). All round-2/3 contracts stand (buffers ≤4 storage; slot budget documented;
backend parity; store API untouched; refs+getState; zero per-frame allocation; registration
RING_T/FRACTURE_T unchanged; dev-handle extended).

## B1. Ring forcefield MEMBRANES (production) — igloo §5, GLSL in the dossier
Each guide ring gets a translucent membrane disc inside it that the stream visibly PIERCES:
- Igloo's recipe verbatim: membrane alpha = banded noise `n = sin(noise*13 + time − y*10)*.5+.5;
  mask = aastep(0.2, n) * (1 − n*.75); alpha = mask*base + pow(mask,5)*.5 + radialMask*.5` —
  procedural (value noise), no textures. Tint white-cyan at ring tone, alpha peak ~0.22
  (subtle glass, not a wall).
- Implementation: three camera-facing disc quads (one per ring, positions from the same ring
  uniforms — they move with registration for free), shader-only, additive, behind the ring
  particles. TSL on both backends (pure fragment math).
- LIFE: the membrane RIPPLES on surge passage (band phase speed ×3 + alpha +40% for 0.4s via
  the existing uRingFlash) and BULGES on hover (uRowGlow i: radial mask expands 8%). On the
  ignition boot each membrane "seals" (radial mask grows 0→1 with the flash — the igloo
  ring-seal read).

## B2. Fracture NEBULA (problem) — igloo §4 triple-multiplied noise
The break becomes a smoking wound: 2-3 large soft quads clustered at the fracture point
(position from uFracture-derived uniforms):
- Igloo's exact trick: `v = noise(uv*3+drift) * noise(uv*4+drift) * noise(uv*6+drift);
  alpha = pow(v,3)*3 × radial falloff` — sparse organic wisps, procedural value noise, no
  textures. Drift slow (t*0.05), sheared uv (uv.x += uv.y) for the streaking smoke read.
- Tint: ember (#6B5546) core → transparent; a faint cyan rim on the upstream side (the last
  healthy light). Additive, alpha ≤0.3, z between debris and stream.
- LIFE: on surge death (uFlash) the nebula FLARES (alpha ×1.8, decays with the flash) and the
  wisp drift kicks (+0.3 for 0.5s). On row-2 hover (the fracture row) the nebula thins 30%
  (the re-cohere tease reads as the smoke clearing).

## B3. SCROLL-VELOCITY reactive river (both modes) — AT/Lusion velocity grammar
The river must answer SCROLL, not just hover (this pairs with §A round-4 scrubbed type):
- New uniform uScrollVel (0..1): read scrollStore velocity in the driver, normalize
  (min(|v|/3000, 1)), damp λ~6.
- Effects, all subtle and C1: braid thickness envelope +25%·vel (the river swells while you
  scroll); streak stretch gain +60%·vel (faster scroll = longer light streaks — the AT read);
  flow speed +40%·vel; curl gain +30%·vel (turbulence while moving). Problem debris drifts
  +20% faster. At rest decays back to the calm braid.
- Also modulate the DOM band's ghost callout leader-line opacity? NO — DOM stays §A's job.

## B4. Dot-grid hash twinkle (both bands) — igloo LightRoom, trivial
IF AND ONLY IF trivially cheap: the band dot grid (DOM, aria-hidden) gets igloo's hash-phase
fade — implement as a CSS animation on two stacked dot-grid layers with different
animation-delays and opacity keyframes (pure CSS, no JS, RM-guarded). If it needs anything
more than CSS, skip (report).

## Acceptance
Membranes visible + rippling in production; the fracture smokes in problem and flares on surge
death; scrolling fast visibly energizes the river in both sections and calm returns at rest;
tsc clean; both backends compile; budgets unchanged (report slot/uniform deltas); fallback SVG
untouched unless trivial; no textures added; dev handle exposes uScrollVel gains + membrane +
nebula tunables.

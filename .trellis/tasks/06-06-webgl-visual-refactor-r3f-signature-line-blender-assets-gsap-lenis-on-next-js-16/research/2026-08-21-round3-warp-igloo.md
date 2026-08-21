# Round 3 §C — WARP JUMP, igloo techniques (2026-08-21)

Owner: "migliora il salto alla velocità della luce nell'hero sul buco nero — nel sito igloo c'è
una cosa simile con effetti fighissimi." Target: the SINGULARITY PASSAGE sequence (the long-take
plunge into the black hole → warp tunnel → emergence on Problem).

Source of truth: `2026-08-21-igloo-tunnel-mining-raw.json` in this dir — REAL GLSL mined from
igloo's production bundle (line refs point to `igloo-app3d.pretty.js` in the session scratchpad).
Read the dossier §§1-7 before implementing. The five transplants below are scoped to OUR
architecture (SignatureLine = the ONLY camera writer; passage scrubs via seqStore; warp overlay =
raw-WebGL `preloader-tunnel`; TSL post = PostFXNodes).

## C1. Camera: corkscrew up-flip + fov widen + sine-noise shake (dossier §3)
- Extend `seqStore` with THREE scrubbed fields written by singularity-passage's existing
  timeline: `upFlip` (0→1 across the plunge → camera up-vector rotates 0→π then re-settles to
  world-up on emergence — igloo's exact vertigo move), `fovShift` (fov 22-widening ramp: our
  base fov + up to +8 during max warp, eased back on landing), `shakeAmp` (0 → 0.02 near the
  horizon, 0 after emergence).
- CONSUMED ONLY IN SignatureLine's camera write (the single-authority frame): apply up rotation
  about the view axis, fov lerp (updateProjectionMatrix only when changed >0.01), and
  DETERMINISTIC sine-noise shake — igloo grammar `sin/cos stacked octaves(time*0.25)*amp`,
  never Math.random. Respect existing pointer parallax and intro-gate springs (additive,
  smallest-term last). Reduced-motion: fields stay 0 (passage already skips on RM/phone).

## C2. Ring-passage bursts (dossier §2) — the "fighissimo" accent
- New uniform block in PostFXNodes: `uWarpBurst` (0..1 spike) + `uBurstSeed` (vec3 random per
  burst). At 2 scrub thresholds in the passage timeline (horizon crossing; emergence) fire a
  spike 0→1→0 (GSAP 0.5s power1.in / 0.4s power1.out — matching igloo's envelope) via a store
  field (seqStore.burst) read with getState in the post's useFrame and damped there.
- Effect (port igloo's pass to TSL, guarded `If(uWarpBurst > 0.001)` so idle cost ≈ 0):
  angular smear — rotate sample angle by `(blueNoise-0.5)*0.3*uWarpBurst` (use an existing
  noise source; a hash of uv+seed is fine if no blue-noise texture is loaded); block glitch —
  displace uv by a coarse noise lookup `*0.01*uBurstSeed.z*uWarpBurst`; HSV saturation+value
  lift (+0.05/+0.075 * spike). Insert AFTER the flowmap refraction, BEFORE bloom.

## C3. Emergence wipe: layered falloff cut + 5-tap spectral CA (dossier §1)
- The warp overlay (`preloader-tunnel` plunge reuse) currently exits via zoom-blur/crossfade.
  Upgrade its final fragment: port igloo's `falloff()` helper + the three-margin layered cut
  (wide CA halo 2.0 / displacement shove 1.0 / hard edge 0.2) driven by the overlay's exit
  progress, with a procedural noise channel (hash/value-noise — no new textures) standing in
  for tScroll; diagonal slope = base −0.2 * aspect PLUS the velocity-weighted term igloo left
  commented out: `slope += 0.15 * clamp(lenisVelocityNorm) * aspect`. The overlay reveals the
  page through the torn edge; 5-tap spectral CA (port `ca_barrelDistortion` + spectrum weights
  verbatim) at the leading edge only (edge-proximity modulator), dithered by the noise.
- This replaces the flat fade — the landing on Problem must feel TORN THROUGH.

## C4. Point spaghettification + treadmill (dossier §5/§6)
- In the warp tunnel's point vertex shader: per-point stretch + rotation driven by
  `falloffsmooth(distToCamera)` — points elongate along the flow axis and shear as they pass
  (spaghettification read); confirm/adopt `treadmill()` fract-wrap for the infinite field if
  not already equivalent. Subtle: max stretch 2.5×, rotation ≤ 0.4rad.
- Optional if cheap: a faint triple-multiplied sheared-noise wisp layer (dossier §4) as a
  second additive quad/cylinder pass in the overlay (procedural value noise, 3 octave-products,
  end fades) tinting `vec3(0.85,0.9,1.0)` — the "inhabited atmosphere". Skip if the overlay
  frame budget complains (it must stay 60fps mid-warp).

## C5. Visibility windows (dossier §3)
- Audit the passage's beats: every heavy actor (SequenceSingularity march, warp overlay, burst
  block) gets explicit progress-window gating (visible/uniform-zero outside its window) if not
  already — igloo's cheap occlusion discipline.

Files: singularity-passage.tsx, webgl/store/seqStore (extend), webgl/SignatureLine.tsx (camera
consume, minimal diff), webgl/PostFXNodes.tsx (burst block), components/fx/preloader-tunnel.ts
(wipe + spaghettification). DO NOT touch: neural files, section files owned by round-3 A/B,
Scene mount logic, store APIs other than the seqStore extension.

Contracts: single camera writer preserved (SignatureLine consumes, passage writes STORE only);
no per-frame allocation; RM/phone variants untouched (phone gets none of this — CSS-hole beat
stays); copy untouched; tsc clean; GLSL twins where the overlay is raw-WebGL (it is — plain
GLSL there, TSL only in PostFXNodes); idle cost of every new post feature ≈ 0 (guarded).

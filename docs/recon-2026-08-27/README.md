# Recon 2026-08-27 — Team section: image/3D-head particle portraits

Owner brief: the founder particle portraits had EMPTY patches (bald scalp,
forehead, cheeks) and read as a dithered photo; target = lusion.co/about
"TEAM" (volumetric point-cloud head, pointer light, glyph rain, contour
lines). This folder holds the research and the reverse engineering that drove
the rebuild documented in `HANDOFF_FOUNDER_MORPH.md` ("Depth matte + ritratto
illuminato", contracts 13–16).

## Primary
- `lusion-team-reverse.md` — **live reverse of lusion.co/about** (bundle
  `hoisted.CUO_IjfL.js`, decoded `team/edan.buf`): the head is a 3D scan
  (8192 blue-noise surface points + packed normal + baked shade), instanced
  quads with DoF bokeh, pointer-as-light, scanline, glitch, additive + bloom;
  glyph rain (`font.png` atlas, 4 blurred layers); contour lines
  (`terrain_lines.buf` tubes with travelling noise pulses). Verbatim shader
  logic included.

## Research dossiers (`research/`, parallel agents)
- `local-sampler.md`, `local-kernel.md`, `local-island.md`, `local-rail.md`,
  `local-prior-research.md` — the as-built pipeline before the rebuild, with
  the worked numbers proving the empty patches came from the ink metric
  (colour distance from the wall), not from the mask; the WebGPU binding
  budget table (compute 8/8, vertex 4/8 + 4/8).
- `web-codrops.md` — every relevant Codrops article/demo (image→particles,
  GPGPU/FBO, morphing, depth-map effects, glyph/contour shaders).
- `web-lusion-threads.md` — public threads/videos/repos about Lusion's team
  head and particle heads in general.
- `web-lusion-bundle.md` — second, independent probe of the Lusion bundle.
- `web-repos.md` — open-source implementations (three.js examples, Three.js
  Journey lessons, Maxime Heckel, MisterPrada, point-cloud heads, depth
  portraits) with code and parameter values.
- `web-physics.md` — spring–damper, curl noise, pointer forces, morph
  correspondence, soft-particle/bokeh rendering, performance envelopes.
- `web-3d-from-photo.md` — depth estimation / image-to-3D tooling ranked by
  practicality (what we shipped: Depth Anything V2 via Transformers.js).
- `web-lusion-look.md` — how to reproduce each visual layer of the Lusion
  team section (head, glyph rain, contour lines, HUD), with GLSL.
- `web-gaps.md` — completeness pass: what the sweep missed + the fills.

## What was built from it
1. `scripts/generate-founder-depth.mjs` → `public/founders/<anchor>-depth.webp`.
2. `src/webgl/image/sampleImagePoints.ts` — depth-matte presence, real z,
   normals.
3. `src/webgl/gpgpu/gpgpuNodeSim.ts` — lit portrait path (packed tint, look
   uniforms, capped light, DoF bokeh, `uRelief`).
4. `src/webgl/FounderPortraitMorph.tsx` — depth twins, look defaults, rest
   pointer parallax, pointer light.
5. `src/components/sections/founders-rail.tsx` — scroll-jack gate removed;
   ← → buttons + keys.

6. `src/webgl/team/TeamGlyphRain.tsx` — **production-telemetry rain** backdrop
   (48 mono tokens flowing upward like a log tail, rare accent tokens bloom;
   `window.__sersanTeamTelemetry`), approved by the owner. A second layer,
   a "loss landscape" of contour lines with gradient-descent comets, was
   built and then REJECTED as too close to Lusion's floor (files removed;
   the recipe survives in the dossiers). Its replacement is
   `src/webgl/TeamOrbit.tsx` — the **person's astrolabe**: three tilted 3D
   rings around the head carrying the person's real facts (previous
   companies / badges, expertise, stack) as HDR satellites with trails and
   projected mono labels, morphing with the person. Measured on the WebGPU
   laptop: 60 fps at DPR 1 with everything on.
7. `HANDOFF_FOUNDER_MORPH.md` — contracts 13–16 + the evening round (layout,
   cursor, auto-advance, licence note).

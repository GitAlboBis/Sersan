# PRD — GPGPU particle "dissolve & regenerate" hero logo

> **v4 (2026-06-09 evening) — DDD bundle reverse-engineered + `spores` mode in branch.**
> The production DDD bundle teardown (research/ddd-bundle-teardown-spore-render.md) showed the
> real effect is instanced LIT OPAQUE hemisphere meshes (~51k desktop, diameter ≈
> letterHeight/47, per-vertex lighting + voxel-field AO, NO DOF (`bokehAmount:0`), a solid
> inner occluder mesh, and ONE particle system with a `dist` attribute) — NOT additive
> sprites, NOT two particle layers. New mode `heroRenderMode: "spores"`: the same compute
> kernel + instanced SHADED icospheres (`createSporeComputeNodeBuild` in gpgpuNodeSim.ts —
> `positionNode = positionLocal·scale + positionBuffer.toAttribute()`, the three-r184 snow
> idiom; lambert + cyan rim + hash-AO darkening; world-space radius ≈ markHeight/47; grid
> 192² ≈ 37k full / 128² lite ×1.22 radius) over a dark occluder mark mesh
> (SPORE_OCCLUDER_COLOR). Live-verified on WebGPU in Chrome: packed matte violet crust at
> rest → cyan momentum burst on hover → ~2 s recompose; clean console; the shipping default
> is STILL `particles-static`. Leva knobs: sporeSize / sporeEmissive.
> **TODO v4:** (1) look approval of `spores` (then retire the sprite `particles-2layer`);
> (2) foreground FPS measure (rAF throttled in background tabs — CDP measure unreliable);
> (3) WebGL2/flag-OFF fallback → `createStaticParticleNodeBuild`, THEN flip default to
> `spores` (today a non-WebGPU browser would get occluder-only); (4) fine-tuning in leva
> (rim, SPEED_COLOR_K burst threshold, optional life-scale envelope); (5) QA multi-viewport.
>
> **v3 STATUS (2026-06-09) — implementation is LIVE on WebGPU; full source of truth in repo
> root `ParticleDissolve.md` §11.** What's DONE (committed on `feat/webgl-refactor`, no push):
> the FBO ping-pong **scrambled on WebGPU** (render-target round-trip orientation bug), so the
> sim was rebuilt the **WebGPU-native** way — TSL **compute + storage buffers**
> (`createGpgpuComputeNodeSim`: `instancedArray` pos/vel/home + `Fn().compute()` + per-frame
> `gl.compute()`; render reads `positionBuffer.element(instanceIndex)` in the vertex stage, so
> NO sampler/orientation). Live-verified: clean "52" → hover disperses → recomposes. The
> **`particles-2layer`** mode (BODY + SKIN, both on compute) ships too; default still
> `particles-static`. Spore look tuned over `afd9253`/`a2e8345`/`ae85111` (gaussian-soft falloff,
> grid 448 ≈ 200k/layer, packed, dimmed so violet body reads solid below bloom threshold).
> Routing: **WebGPU → compute; WebGL2 sub-backend → FBO** (compute no-ops on WebGL2, #31221);
> detect WebGPU as `backend.isWebGLBackend !== true && typeof gl.compute === 'function'`.
> **TODO (priority order):** ⭐ (1) make the **OUTER/skin** spores the BIGGER + DENSER protagonist
> — user feedback *"sono quelle esterne che devono essere piu grandi e dense"* (currently
> inverted); (2) color balance (near-black body core, cyan rim/burst); (3) perf of ~400k sprites
> (per-layer density); (4) hero-LOCAL DOF; (5) WebGL2 + flag-OFF fallback for 2layer →
> `createStaticParticleNodeBuild`; (6) flip default to `particles-2layer`; (7) QA + strip debug.
>
> **v2 UPDATE (2026-06-09).** The reference is no longer empty: `particleDissolve.html`
> now holds a working TWO-LAYER vanilla-Three reference, AND the live Lusion DDD effect was
> inspected in-browser (footer "D"). Findings + the full v2 plan live in repo root
> **`ParticleDissolve.md`** (source of truth). Key deltas vs the single-layer spec below:
> 1) the shipped mode is `particles-static` (analytic, NO momentum) — switch to the momentum
> sim; 2) add a SECOND layer — dense calm OPAQUE violet **BODY** + reactive ADDITIVE cyan
> **SKIN** (under-damped ζ≈0.39, sprays + returns ~1–2 s); 3) add subtle **Depth-of-Field**.
> Implemented behind a new `heroRenderMode: "particles-2layer"` (default unchanged until
> verified on both backends in Chrome). The §6 WebGPU vertex-stage-RT-read + half-float-home
> bugs are ALREADY fixed in `gpgpuNodeSim.ts`. The single-layer goal below still holds for
> the SKIN layer's engine.

## Goal
The home hero logo becomes a **dense cloud of GPU-simulated particles** that form the SERSAN mark. On pointer hover the particles near the cursor are pushed away, then a spring pulls them back to recompose the mark; particle color shifts violet→cyan by velocity, with additive glow. Lusion / Digital Design Days style, but sober/premium.

This **replaces the particle/dissolve core of the existing `src/webgl/HeroLogo.tsx`** (which currently does a simpler ~12k CPU-seeded billboard dissolve driven by one `uDissolve` scalar). Reuse HeroLogo's integration shell — GLB load (`/models/sersan-mark.glb`), normalization to ~2 units, scene anchoring across the sticky hero pin, `heroReady` signal, drag/inertia (`heroDragStore`), pitch spring, scroll fade, tier gating — and swap the particle engine for the true GPGPU system below. The solid mesh is NOT drawn (it only generates the particle home positions).

## Renderer reality (IMPORTANT — differs from the raw spec)
The project runs **WebGPURenderer** (flag `NEXT_PUBLIC_WEBGPU`, default ON via `.env.local`) with automatic **WebGL2 fallback**. `GPUComputationRenderer` (three/examples) is **WebGL-only** and will NOT run on the WebGPU backend. So implement the SAME GPGPU technique **WebGPU-native**:
- **Flag ON (WebGPU):** TSL compute (storage buffers via `instancedArray` + `Fn().compute()`) OR an FBO ping-pong driven by `gl.setRenderTarget` + a **TSL NodeMaterial** sim pass (the fluid-pointer flowmap already proved `gl.setRenderTarget` works on WebGPURenderer). Render the points with a TSL `PointsNodeMaterial`/`SpriteNodeMaterial` reading position from the storage buffer / RT.
- **Flag OFF (WebGL2):** classic FBO ping-pong (useFBO) with GLSL `ShaderMaterial` sim + GLSL points material — OR `GPUComputationRenderer`. (Mirror the established dual-material lazy-import discipline: `three/webgpu`+`three/tsl` only on the ON path.)
- Single render loop (FrameDriver/Lenis) — no second rAF. Selective-bloom contract preserved (points emissive >1.0, toneMapped:false) so the existing single Bloom glows them.

## Mandatory technique (from the user's spec)
1. **GPGPU FBO/compute ping-pong**: position + velocity live in FLOAT textures/buffers (N×N), advanced every frame by a sim shader. NO CPU per-frame particle updates.
2. **Home positions** = points sampled on the model SURFACE via `MeshSurfaceSampler` (three/examples/jsm/math/MeshSurfaceSampler.js). Sample N×N points → seed the position/home texture. The mesh is NOT rendered.
3. **Sim forces per particle**: (a) elastic SPRING toward home (regeneration); (b) mouse REPULSION within a radius, mouse PROJECTED INTO MODEL SPACE (raycast a plane through the center facing the camera, then worldToLocal) so it works while the model rotates (dispersion); (c) DAMPING + max-speed clamp; (d) light TURBULENCE (low at rest, more when far from home).
4. **Render**: custom material on `THREE.Points`. Vertex reads position from the texture/buffer via a per-point `ref` (uv into the grid). Color violet→cyan by velocity, `AdditiveBlending`, soft round points (radial alpha, discard outside circle), perspective `gl_PointSize` × devicePixelRatio.
5. devicePixelRatio cap (2), window resize, pointerenter/leave (on leave push mouse to infinity so repulsion vanishes). Mouse fed from the existing pointerStore/window listener (no canvas events; canvas stays pointer-events:none + aria-hidden — the hero-drag-layer already captures drag).

## Params (config at top; defaults)
SIZE=256 (→65,536 particles; tier-scale down for lite/perf), SPRING=26, DAMPING=4.5, PUSH=42, RADIUS=0.52, MAX_SPEED=4, TURB_BASE=0.35, TURB_MOVE=1.2, POINT_SIZE=7, COL_COLD=[0.42,0.30,0.86] (violet), COL_HOT=[0.28,0.95,0.95] (cyan). Surface them in a config object + fxStore/leva so they're tunable.

## Constraints / done-when
- No regressions: the home hero still mounts, drags, fades on scroll, announces heroReady; interior routes unchanged; build OFF+ON pass; `tsc` clean.
- Perf: 60fps target on a recent integrated GPU; if not, scale SIZE down per tier. prefers-reduced-motion / `off` tier → no GPGPU (static mark or nothing), no crash. WebGL2/float-RT unsupported → graceful fallback (static logo), no crash.
- Done: hover disperses particles near the cursor and they spring back to recompose the mark; color violet→cyan by velocity with glow; the model can rotate (drag) and the repulsion follows correctly (model-space mouse); smooth, nothing else broken.

## Reference
User intended a vanilla-Three reference at `particleDissolve.html` (repo root) but the file is **0 bytes / empty** — build from this spec; refine to match if the user later supplies the HTML. Stack: three 0.184, @react-three/fiber 9.6, @react-three/drei 10.7. Related: `ANALISI_LUSION.md` §3.4 (GPGPU), the established TSL dual-material pattern (lineNodeMaterial/particleNodeMaterial), the fluid-pointer FBO-on-WebGPU precedent (`src/webgl/fluid/PointerFlowmap.ts`).

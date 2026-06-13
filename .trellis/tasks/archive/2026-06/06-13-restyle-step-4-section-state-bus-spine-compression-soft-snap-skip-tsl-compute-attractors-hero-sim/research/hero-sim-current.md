# Research: current hero particle sim + reusable material from task 06-08

- **Query**: What does the hero particle system look like TODAY (data flow, motion model, materials, morph integration, tier gating, backends, counts), what did task 06-08 already decide/research, what would a TSL-compute-attractors port replace vs keep, and what breaks determinism on scroll-scrub.
- **Scope**: repo-internal. Read: 06-08 task dir (prd.md v4 + both research files + implement.jsonl), `ParticleDissolve.md` §11, `PIANO_RESTYLE.md` §7/§9 rows, and the live source under `src/webgl`.
- **Date**: 2026-06-13

---

## TL;DR — the headline correction

**The 06-13 prd's "What I already know" line ("shipped mode is analytic `particles-static`, no momentum") is STALE.** Since commit `9bf6519` (2026-06-09, "spores is the default hero") the shipping default is `heroRenderMode: "spores"` (`src/webgl/store/fxStore.ts:206`) — a **true integrated-velocity momentum sim already running on TSL compute + storage buffers** (`createSporeComputeNodeBuild`, `src/webgl/gpgpu/gpgpuNodeSim.ts:1103`). The analytic `particles-static` build survives only as the **degradation path** for non-WebGPU backends (`HeroLogo.tsx:193-202`). Separately, the hero TEXT intro (`HeroTextParticles`) is a SECOND compute momentum sim (`createTextMorphComputeBuild`, `gpgpuNodeSim.ts:1515`) that **already implements the "two-layer" determinism shape** the 06-13 prd plans: deterministic analytic anchor target + integrated spring sim relaxing onto it. The "TSL compute attractors port" chunk is therefore NOT "introduce compute/momentum" (done) — it is: enrich the kernel force model (attractor/orbit term from the three.js example), unify the two kernels' discipline, and retire the remaining vertex-stage `.element()` read + dead debug modes.

---

## 1. Task 06-08 — what it already decided/researched (and what remains authoritative)

Dir: `.trellis/tasks/06-08-gpgpu-particle-dissolve-hero-logo-fbo-spring-mouse-repulsion-webgpu-native/` (prd.md, research/×2, implement.jsonl, check.jsonl; **no info.md**).

### 1.1 prd.md (v4, 2026-06-09 evening) — decision history
- **v1 spec**: FBO ping-pong GPGPU, spring SPRING=26/DAMPING=4.5/PUSH=42/RADIUS=0.52, MeshSurfaceSampler homes, model-space mouse, instanced billboards (prd §"Mandatory technique").
- **v2**: shipped mode was `particles-static` (analytic, no momentum) → plan: momentum sim + two layers (opaque violet BODY + additive cyan SKIN, under-damped ζ≈0.39) + DOF. Source of truth moved to repo-root `ParticleDissolve.md`.
- **v3**: the FBO round-trip **scrambled on WebGPU** (RT orientation bug confined to reading the ping-pong RT in the vertex stage) → rebuilt **WebGPU-native: TSL compute + storage buffers** (`instancedArray` pos/vel/home + `Fn().compute()` + per-frame `gl.compute()`); render reads position in the vertex stage → no sampler/orientation. Live-verified. Backend routing law: **WebGPU sub-backend → compute; WebGL2 sub-backend → FBO** (storage compute no-ops on WebGL2, three.js **#31221**); detection = `backend.isWebGLBackend !== true && typeof gl.compute === "function"` (the WebGPU backend leaves `isWebGLBackend` *undefined*, so `=== false` is a bug).
- **v4**: DDD production bundle decompiled → the real Lusion effect is **instanced LIT OPAQUE hemisphere meshes** (~51k desktop), per-vertex lighting + voxel AO, **NO DOF** (`bokehAmount:0`), one particle system + `dist` attribute + solid inner occluder — NOT additive sprites, NOT two sprite layers. → new `spores` mode (the snow idiom: `positionNode = positionLocal·scale + positionBuffer.toAttribute()`). prd v4 TODOs still open: (1) look approval (then retire `particles-2layer`), (2) **foreground FPS measure** (rAF throttled in background tabs → CDP unreliable), (3) WebGL2/flag-OFF fallback (DONE since: `sporeStaticFallback`), (4) leva fine-tuning, (5) QA multi-viewport. Item "flip default to spores" is DONE (`9bf6519`), although the prd v4 header text still says "shipping default is STILL particles-static" — the code wins.

### 1.2 research/gpgpu-webgpu-spec.md — **AUTHORITATIVE, reference don't duplicate**
Version-grounded API spec against installed `three@0.184.0` (every claim has a `three.webgpu.js` line ref). Keep citing it for:
- `instancedArray` / `storage` / `StorageInstancedBufferAttribute` / `instanceIndex` / `.element()` / `.toAttribute()` signatures and the canonical compute workflow (§1.1–1.2). Seeding straight from a Float32Array via `instancedArray(typedArray, "vec3")` (§1.3).
- Noise exports: `mx_noise_vec3` etc.; **no `curlNoise` export** in three/tsl — hand-roll or use mx jitter (§1.4 + Caveats).
- ⚠️ **THREE.Points clamps to 1px on WebGPU** → instanced billboard quads or `SpriteNodeMaterial` only (§6.1).
- WebGL2 fallback path: `GPUComputationRenderer` is WebGL-only; `EXT_color_buffer_float` must be probed manually (§2).
- MeshSurfaceSampler usage (§3), model-space mouse projection recipe (§4), HeroLogo-shell reuse checklist (§5.2), fillrate-is-the-bottleneck analysis + tier scaling (§6.2–6.3).
- **One caveat now historical**: its §TL;DR recommended Option B (FBO ping-pong) over Option A (compute). Reality inverted this — the FBO scrambled on WebGPU and the shipped engine IS Option A (compute) on the true-WebGPU sub-backend, with the FBO rig (`createGpgpuNodeSim`) kept only for the WebGL2-sub-backend leg of the gated debug modes. The §5.3 risk table (storage no-ops on the WebGL2 sub-backend) is exactly why the fallback layering exists.

### 1.3 research/ddd-bundle-teardown-spore-render.md — **AUTHORITATIVE ground truth for the look**
Production-bundle reverse engineering of Lusion DDD. Keep for: the life state machine (life ∈ (0,1] pinned / (−1,0] ghost flight / ≤−1 respawn / (1,2] regrow, kill curve `50·min(1,|v|·0.35)⁵`, scale envelope with overshoot pulse at 1.25), instanced-lit-mesh render rationale (additive = fog, opaque+occlusion = mass), spore diameter ≈ markHeight/47, colors (`vec3(0.44,0.322,0.816)` ×0.25 at rest, cyan emission), NO DOF, and the **r184 instancing idioms**: `Mesh` + `.count` (NOT `InstancedMesh`), `frustumCulled = false`, and **render-stage reads must use `.toAttribute()`** — `.element()` ignores the index on the WebGL backend (#31221); `.element(instanceIndex)` stays confined to compute. §3 lists the official examples proving scale: `webgpu_tsl_compute_attractors_particles` = 262k sprites (the 06-13 port template), snow = 100k instanced meshes.

### 1.4 ParticleDissolve.md (repo root) — living status §11
v2-era plan; §11.2 has the commit trail (`6ed17a6` compute sim, `0fda914` 2layer, `ae85111` packed 448² sprites, then `284912d`/`9bf6519` spores+default). §11.3 TODO list is **partially superseded** by the spores pivot (items 1–2/6 obsolete; item 3 perf and item 7 QA still live; item 4 DOF was CANCELLED by the bundle teardown — DDD ships `bokehAmount: 0`).

---

## 2. Current implementation — there are TWO hero particle systems

Both mount only on `pathname === "/"` inside `RouteRitual` (`src/webgl/Scene.tsx:132-152`); the canvas itself only exists for tier full/lite (tier `off` = reduced-motion/no-WebGL never mounts, `src/webgl/store/tierStore.ts:28-43`).

### 2.1 HeroLogo — the SERSAN mark (shipping mode: `spores`)

**File**: `src/webgl/HeroLogo.tsx` (1226 lines). Mode switch from `fxStore.heroRenderMode` (`HeroLogo.tsx:182-202`); six modes (`fxStore.ts:97-103`): `solid | particles | both | particles-static | particles-2layer | spores`; default `"spores"` (`fxStore.ts:206`).

**Data flow (positions source)**
1. GLB `/models/sersan-mark.glb` loaded via `useGLTF`, geometry CLONED, centered, normalized to height 2 (`HeroLogo.tsx:122-126, 215-238`). The solid mesh is **never drawn** (only the invisible raycast target at `HeroLogo.tsx:1204-1209` and the spore occluder reuse it).
2. `sampleMarkHomePositions(bodyGeometry, size, {frontBias, normalOffset, volumeJitter})` (`src/webgl/geometry/sersanMark.ts`, MeshSurfaceSampler import at `:35`) → `homeRGBA` (size²×4 floats) + `aRef` grid UVs. Spore mode samples **two shells** on grid `SPORE_SIZE_BY_TIER` (`HeroLogo.tsx:287-301`): crust `SPORE_LAYER.sampling` {frontBias 0.3, +0.022 out-normal} and core `SPORE_CORE_LAYER.sampling` {+0.002} (`gpgpuConfig.ts:292, 347`).
3. `createSporeComputeNodeBuild(gl, webgpu, tsl, homeRGBA, aRef, size, cfg, sporeCfg, baseRadius)` per shell (`HeroLogo.tsx:704-728`), lazy `import("three/webgpu")+import("three/tsl")+import("./gpgpu/gpgpuNodeSim")` so the OFF bundle never sees the second three build (`HeroLogo.tsx:686-689`).

**Motion model — NOT analytic; a momentum compute sim + DDD life machine** (`gpgpuNodeSim.ts:1198-1279`):
- Storage: `positionBuffer`/`velocityBuffer`/`homeBuffer` vec3 + `lifeBuffer` float seeded 1 (`:1159-1164`).
- ALIVE branch: spring `acc = (home−pos)·SPRING`; mouse repulsion `f = max(0,(R−d)/R)²·PUSH` from model-space `uMouse`; sine-turbulence gated by displacement `disp = clamp(|home−pos|·TURB_DISP_K,0,1)`; **scroll-out burst** = radial push from origin × `uBurst` staggered by `hash(instanceIndex)` (`:1228-1237`); Euler integrate, `exp(−DAMPING·dt)` damping, MAX_SPEED clamp; velocity-gated life decay `pow(min(|v|·0.35,1),5)·LIFE_DECAY + burst·stagger` (`:1251-1256`).
- DYING branch: free ghost drift `pos += vel·0.85·dt`, gentle damp, life countdown; at ≤−1 respawn at home with life=2 (regrow) — or park dead at home while `uBurst ≥ 0.05` so the scroll-out doesn't endlessly re-spawn (`:1257-1278`).
- Forces are LIVE-tunable: spore configs in `gpgpuConfig.ts` — crust `SPORE_LAYER` {SPRING 30, DAMPING 5 (ζ≈0.39 under-damped), PUSH 70, RADIUS 0.5, MAX_SPEED 5} (`:274-288`), pinned core `SPORE_CORE_LAYER` {SPRING 70, DAMPING 11, PUSH 4, LIFE_DECAY 0 = immortal} (`:327-341`).

**Material (TSL `MeshBasicNodeMaterial`, opaque)** (`gpgpuNodeSim.ts:1285-1399`):
- Geometry: `IcosahedronGeometry(1,1)` (80 tris) as InstancedBufferGeometry, ~3M tris/draw per shell at 36,864 instances (`:1282-1290`).
- `positionNode = positionLocal · (uSporeRadius · var(rnd) · lifeScale) + positionBuffer.toAttribute()` — the snow idiom, **render reads via `.toAttribute()`** (`:1327-1333`); lifeScale = DDD envelope (die-shrink, regrow 1.5→1, overshoot pulse @1.25) (`:1318-1325`).
- `colorNode`: view-space lambert + vertical ambient + per-instance hash AO; emission = `mix(albedo, cyan, t)·t²·uEmissive` where `t = max(speed·SPEED_COLOR_K, regrowFlash)` — **velocity-driven color is already in** ("si accende solo quando si muove"); cyan rim²; core shell adds always-on `BASE_EMISSION` glow (`:1335-1393`). `toneMapped:false`, opaque depth-tested (`:1395-1399`) → selective-bloom contract (bloomThreshold 1.0, `fxStore.ts:185`).
- Plus a solid dark occluder mark mesh under the shells (`SPORE_OCCLUDER_COLOR`, `HeroLogo.tsx:314-322, 1181`), faded by `(1−burst)²` per frame (`:1032-1039`).

**Mouse repulsion / pointer flow** (`HeroLogo.tsx:794-824`):
- `projectCursorToModel(spin)`: gate = `heroDragStore.hovering && pointerStore.active`, else `uMouse = MOUSE_OFF (1e9)` (`:128-129, 797-799`). NDC from `pointerStore.smooth` → raycast an **invisible clone of the actual mark mesh** (perspective-correct surface point), fallback plane through the FRONT plate (`markFrontZ`), then `spin.worldToLocal` → model space. There is **no flowmap** involved here (the fluid PointerFlowmap is a separate PostFX refraction effect).
- Orientation: the mark is **ANCHORED** — no drag rotation, no idle spin; only a damped mouse-parallax tilt (±`fx.gpgpuTilt` ≈ 0.06 rad, `HeroLogo.tsx:884-915`). NOTE: memory note "dissolve on hover/drag" — drag *velocity* is ignored since the anchored redesign; hover is the dissolve trigger, scroll is the burst trigger.

**Scroll integration**: hero-span progress `hp` from scrollStore + section anchors (`:841-850`); fade `1 − smoothstep(hp, 0.74, 0.97)` (`:854`); position/scale choreography from fxStore framing knobs + `camDescend` from textMorphStore (`:868-882`); **burst = smoothstep(hp, 0.02, 1.5)** scrubbed BOTH directions (`:1028`).

**Tier/backend gating + fallback chain**
- Grid: spores full 192² = 36,864/shell, lite 128² = 16,384/shell ×1.22 radius (`gpgpuConfig.ts:379-386`); HeroLogo mounts for full AND lite.
- True-WebGPU detection inside the lazy build; WebGL2 sub-backend → `setSporeBackendFallback(true)` → degrade to the **static analytic build** (`HeroLogo.tsx:692-703, 197-202`); flag-OFF (classic WebGL2 renderer) → same degradation synchronously (`!webgpuEnabled()`), GLSL twin `createGpgpuStaticBuild` (`gpgpuRenderShader.ts`).
- If float AND half-float RTs unusable → nothing renders, no crash, heroReady still fires (`HeroLogo.tsx:327-345, 1112-1117`).

**The analytic fallback** (`createStaticParticleNodeBuild`, `gpgpuNodeSim.ts:1874-2070`): per-instance `aHome` vec3 attribute; vertex-stage analytic displacement `lift = smoothstep(uRadius,0,d)·uHover`, outward push + 0.5× toward camera + shimmer on lifted only (`:1969-2012`); color violet→cyan **by lift** (not velocity, `:2025-2034`); additive billboards, stateless/deterministic. Fallback grid = `SIZE_BY_TIER` 448² ≈ **200k** full / 224² ≈ 50k lite (`gpgpuConfig.ts:98-101`) — note the fallback path is fillrate-heavier in count than the shipping spores path.

**Dead/debug modes kept in tree**: `particles` (FBO rig, scrambles on WebGPU — parked), `particles-2layer` (sprite BODY+SKIN, superseded by spores, prd v4 wants it retired), `solid`/`both` (GLB verification). All still compiled into HeroLogo (~500 of its 1226 lines + `createGpgpuNodeSim` ~520 lines + `gpgpuSim.ts`/`gpgpuRenderShader.ts` GLSL twins). 06-13 cleanup candidate.

### 2.2 HeroTextParticles — the scroll-gated text morph intro

**File**: `src/webgl/HeroTextParticles.tsx` (531 lines) + kernel `createTextMorphComputeBuild` (`gpgpuNodeSim.ts:1515-1831`).
- Mounts on home for full+lite (`Scene.tsx:146`) but activates ONLY on true WebGPU compute + fonts ready + desktop pinned H1/brand DOM nodes (`HeroTextParticles.tsx:147-184`); every fallback leaves `textMorphStore.active=false` → DOM hero untouched.
- Counts: `COUNT_BY_TIER` **26,000 full / 12,000 lite** (`:91-94`).
- Positions source: live-DOM text sampling — `sampleTextPoints` of brand "Sersan AI" (A), localized H1 (B, wrapped to the H1's box), cue "see what we build" (C, ×0.62 size), "scroll" (D, ×0.4 size, offset −0.38 viewH) with the H1's computed typography (`:189-243`); px→world via `worldPerPx` (`:144, 254-262`); scattered entry seed with leftward bias (`:283-300`). Language switch → MutationObserver → resample/rebuild (`:348-352`).
- Kernel: storage pos/vel/homeA..D/start/delay; **deterministic target** = `mix(start, mix(mix(mix(hA,hB,m),hC,m2),hD,m3) + spreadJitter, aw)` with per-particle staggered windows `m = clamp((uMorph − r·0.55)/0.45)` and entry wave `aw` from delay=normalized-x (`gpgpuNodeSim.ts:1618-1666`); spring SPRING=42/DAMPING=6.5/MAX_SPEED=9 toward target + transit-peaked sine turbulence ×14 (`:1668-1695`; params fed at `HeroTextParticles.tsx:314-324`).
- Render: additive billboard quads, ink-density size compensation (`uSizeComp*`), EMISSIVE 4, near-white→cyan by speed; ⚠️ vertexNode reads `positionBuffer.element(instanceIndex)` (`gpgpuNodeSim.ts:1726`) — fine on true-WebGPU-only, but the ddd-teardown research flags `.toAttribute()` as the only form that also works on WebGL2 (migration item if this build ever runs there).
- Timeline integration (**the determinism design to preserve**): scroll NEVER scrubs particle positions. `HeroIntroGate` consumes wheel → `textMorphStore.gateProgress`; crossing MORPH_TRIGGER 0.22 / 0.44 / 0.66 only flips a direction; each morph clock plays to 0/1 on its own time (`MORPH_DURATION 2.6s`, entry 3.6s) (`HeroTextParticles.tsx:47-87, 397-467`). Store flags (`assembleDone/morphDone/morph2Done/morph3Done/tiltDone`) gate the page release (`textMorphStore.ts:60-112`). Anchor freezes in world space the moment real scroll starts; fade over 0.7 viewport of scroll (`:483-514`). The store is pinned on `globalThis` (dual-bundle zustand split bug, `textMorphStore.ts:139-150`). A TEMP diagnostic for a phantom prod rebuild is still logging (`HeroTextParticles.tsx:153-164`) — strip during 06-13.

---

## 3. TSL compute attractors port — REPLACE vs KEEP

Template: `webgpu_tsl_compute_attractors_particles` (MIT; PIANO_RESTYLE.md:71-73,177 maps its "attractor/damping/clamp kernel" to the planned two-layer momentum upgrade). Reality check: **most of the example's machinery is already in production here** (instancedArray, Fn().compute, per-frame `gl.compute()`, damping+clamp, velocity→color). The port is an upgrade of the FORCE MODEL and a consolidation, not a new engine.

**REPLACE / add**
- Kernel force structure: today's forces are home-spring + radial mouse push + sine jitter. The example adds an **attractor list with orientation axes → orbital/curl component** (spin around the attractor axis, not only radial). Map: attractor #0 = the particle's own home anchor (spring), attractor #1 = the model-space cursor with NEGATIVE mass (repulsion) + an orbit term for the Lusion "swirl while displaced" feel. Uniform-driven attractor array (position/axis/strength) instead of today's single `uMouse/uPush/uRadius`.
- Unify the two kernels (`createSporeComputeNodeBuild` ALIVE branch and `createTextMorphComputeBuild`) on one shared force helper so spring/damping/clamp/turbulence stay in lockstep.
- Retire on the way: `particles` (FBO) + `particles-2layer` modes, `createGpgpuNodeSim` (FBO TSL rig), possibly `gpgpuSim.ts`/`createGpgpuRenderMaterial` GLSL rig if the debug modes go (the static GLSL twin must STAY — it's the flag-OFF fallback). AC "no RT-read-in-vertex hacks left" = delete the parked FBO paths + migrate `HeroTextParticles`' vertex `.element()` read to `.toAttribute()`.

**KEEP (proven, don't touch)**
- Positions source: GLB `MeshSurfaceSampler` shells (`sersanMark.ts`) and DOM text sampling (`sampleTextPoints`) + their seeding via `instancedArray(typedArray)`.
- Morph-target blending + staggered-wave choreography + one-shot time-driven clocks (textMorphStore contract).
- Pointer plumbing: `projectCursorToModel` raycast→worldToLocal, `MOUSE_OFF` on leave, `heroDragStore.hovering` gate, eased `uHover`.
- Dissolve interaction: the DDD life state machine + scroll-out `uBurst` (this IS the approved hover-erode/dissolve look).
- Render contracts: spores = opaque instanced icospheres with `.toAttribute()`; text = additive billboards; `toneMapped:false` + emissive>threshold selective bloom; dpr cap 2; `frustumCulled={false}`.
- Backend routing law + fallbacks: true-WebGPU detection (`isWebGLBackend !== true && typeof gl.compute === "function"`), spores→static degradation, lazy dual-import discipline, tier grids.
- Single rAF: FrameDriver pumps Lenis; sims tick inside `useFrame` with dt clamp 1/30.

---

## 4. Perf budget facts

- **Shipping spores (full)**: 2 shells × 36,864 instances × 80 tris ≈ **5.9M tris** in 2 draws, opaque early-Z (cheaper per-pixel than the 400k additive sprites it replaced — `gpgpuNodeSim.ts:1282-1284`); 2 × 36,864-thread compute dispatches/frame. Lite: 2 × 16,384 (×1.22 radius).
- **Text morph**: +26,000 additive quads (full) + one 26k compute dispatch/frame while the hero is on screen; fades out over 0.7 viewport of scroll (`HeroTextParticles.tsx:483-485`).
- **Static fallback**: 448² ≈ 200k additive billboards (full) — the fillrate bottleneck case from gpgpu-webgpu-spec §6.2; consider dropping the fallback grid if the analytic path is kept long-term.
- dpr: Canvas `[1,2]` full / `[1,1.5]` lite (`Scene.tsx:214`); materials re-cap at `min(getPixelRatio(),2)` per frame.
- **Leva debug**: `LineDebug.tsx` "GPGPU hero" folder — heroScale/offset/Z, spring/damping/push/radius/turbBase, point size/alpha/emissive, tilt, sporeSize/sporeEmissive (`:59-134`) → writes fxStore; sims read `getState()` per frame. Dev-only.
- **FPS guards**: NONE active at runtime — `tierStore.degrade()` exists (full→lite→off) but drei's PerformanceMonitor is "intentionally NOT mounted for now" (`Scene.tsx:40`). prd v4 TODO (2): foreground FPS measurement still open; background-tab rAF throttling makes headless/CDP numbers unreliable (also the preloader memory note).
- Startup costs gated by mode: 448² sampling only when a mode consumes it (`HeroLogo.tsx:255-263`); spore sampling (2 × 36,864 surface samples) only in spores mode (`:288-301`).

## 5. Risks — analytic (scrub-deterministic) vs integrated sim, and the two-layer answer

**What scroll currently scrubs both directions**: HeroLogo's `hp` → fade/position/scale (pure functions — safe) and `uBurst` (feeds the SIM — history-dependent). The text-morph timeline deliberately does NOT scrub positions (one-shot clocks). So the determinism exposure is narrower than the prd feared, but real:

1. **Scrub-reversal convergence, not equality.** With integrated velocity, scrolling to hp=X then back does not reproduce the exact field of first arrival; it *relaxes* back. The spore design already engineered this: spring always targets `home`, the life machine parks dead spores AT HOME while `burst ≥ 0.05` and regrows in place when scrolled back (`gpgpuNodeSim.ts:1264-1277`) — bounded recovery ≈ 1–2 s. Any attractor port must preserve (a) anchors as the unique fixed point at rest, (b) bounded relaxation time, (c) the burst-respawn parking so fast down-up scrubs can't strobe respawns.
2. **The morph timeline needs deterministic positions on scrub** → the production answer is the **two-layer split that already exists in `createTextMorphComputeBuild`**: **layer 1 = analytic anchor** (`target` = pure function of uMorph/uMorph2/uMorph3/uAssemble + per-particle hash — deterministic for any scrub state) and **layer 2 = sim offset** (integrated vel relaxing onto layer 1, ζ<1 for character). Formalize for the port: `pos = anchor(timeline) + offset`, sim integrates `offset → 0` with spring k, attractor/orbit forces perturb only the offset. Then a hard `offset=0, vel=0` reset is always legal (resize, route return, big dt) without visual teleport beyond one relaxation.
3. **dt and tab-stall**: keep the 1/30 delta clamp everywhere (`HeroLogo.tsx:834`, `HeroTextParticles.tsx:388`); sims don't tick while hidden (`group.visible` early-outs) — after refocus the spring re-converges, acceptable. NEVER make gate release depend on sim state alone — keep the store-flag pattern (`morphDone` etc.).
4. **Backend traps**: `.toAttribute()` only in render stage (#31221); compute only on the true-WebGPU sub-backend → every new path needs the static/inactive fallback; never import `three/webgpu` statically from route-bundle code (dual-namespace pitfall).
5. **Rebuild/persistence traps** (battle-tested fixes to keep): morph clocks live in refs and re-prime fresh builds (`HeroTextParticles.tsx:121-136, 329-333`); cleanup must NOT zero gate state (`:366-374`); textMorphStore pinned on globalThis (`textMorphStore.ts:139-150`); the phantom prod remount diagnostic is still in (`:153-164`) — root-cause or remove during this task.
6. **Memory-note corrections for implement.jsonl**: shipped hero = `spores` momentum sim (not `particles-static`); "WebGPU vertex-stage RT read needs explicit LOD" is moot — the RT read was eliminated entirely in favor of storage buffers; drag does not rotate/dissolve the mark anymore (anchored + hover/scroll-driven).

## Files Found

| File Path | Description |
|---|---|
| `.trellis/tasks/06-08-gpgpu-particle-dissolve-hero-logo-fbo-spring-mouse-repulsion-webgpu-native/prd.md` | v1→v4 decision history (FBO → compute → spores) + open TODOs |
| `.trellis/tasks/06-08-.../research/gpgpu-webgpu-spec.md` | AUTHORITATIVE three-0.184 API spec (compute/storage/billboards/fallbacks) — reference in implement.jsonl |
| `.trellis/tasks/06-08-.../research/ddd-bundle-teardown-spore-render.md` | AUTHORITATIVE DDD ground truth (life machine, lit instances, r184 idioms, attractors example scale) |
| `ParticleDissolve.md` | v2 plan + §11 living status/commit trail (partially superseded by spores) |
| `src/webgl/HeroLogo.tsx` | Mark hero shell: modes, builds, fallback chain, cursor projection, scroll burst |
| `src/webgl/HeroTextParticles.tsx` | Text-morph intro: DOM sampling, one-shot morph clocks, gate integration |
| `src/webgl/gpgpu/gpgpuNodeSim.ts` | All TSL builds: compute sim :794, spores :1103, text morph :1515, static analytic :1874 |
| `src/webgl/gpgpu/gpgpuConfig.ts` | All tuning presets + tier grids (SIZE_BY_TIER :98, SPORE_SIZE_BY_TIER :379) |
| `src/webgl/gpgpu/gpgpuSim.ts`, `gpgpuRenderShader.ts` | GLSL flag-OFF twins (static build must survive any cleanup) |
| `src/webgl/store/fxStore.ts` | heroRenderMode default "spores" :206 + live knobs |
| `src/webgl/store/textMorphStore.ts` | Gate/morph state contract + globalThis pin |
| `src/webgl/store/tierStore.ts` | full/lite/off detection; degrade() exists, PerformanceMonitor not mounted |
| `src/webgl/geometry/sersanMark.ts` | MeshSurfaceSampler shells + shared dissolve noise |
| `src/webgl/Scene.tsx` | Home-route mounting :132-152, dpr :214 |
| `src/webgl/debug/LineDebug.tsx` | Leva "GPGPU hero" folder :59-134 |

## Caveats / Not Found

- No `info.md` in the 06-08 task dir; check.jsonl/implement.jsonl exist (implement.jsonl last entry points at ParticleDissolve.md as v2 source of truth).
- Did not run build/tsc or measure FPS (research only); the foreground-FPS measurement TODO from prd v4 remains open and is a 06-13 QA item.
- `particleDissolve.html` (repo root) was 0 bytes in 06-08; not re-checked — irrelevant now.
- The three.js attractors example was not re-fetched here (network not needed for this pass); PIANO_RESTYLE.md + the ddd teardown §3 capture its relevant idioms. Per AGENTS.md, consult Context7 for the exact example source before writing the kernel.

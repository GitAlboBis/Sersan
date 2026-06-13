# Research: SLICE B — /trust CompliancePipeline3D (TSL linked-particles centerpiece)

- **Query**: Build the GPU/material plan for a 6-stage TSL linked-particles centerpiece for the /trust compliance pipeline, mirroring the three.js `webgpu_tsl_vfx_linkedparticles` example, against the installed three 0.184.0 API and the repo's existing TSL precedent.
- **Scope**: mixed (repo code recon + reference example + installed-API verification)
- **Date**: 2026-06-13

---

## 0. TL;DR / decisions up front

- **Architecture**: world-ANCHORED at the `"pipeline"` `[data-line-anchor]` (NOT camera-locked). The SVG sits mid-page in normal document flow, the signature line already weaves a waypoint through `pipeline` (x:-1.25, z:0.2). Recommendation below in §6.
- **Replace vs augment**: AUGMENT — keep the SVG visible as the accessible DOM baseline on EVERY tier; the 3D mounts BEHIND/AROUND it (canvas is z-0 behind the DOM) ONLY on `full + webgpuEnabled()`. Do NOT hide the SVG on the full path (it carries the focusable labels + role=img). This is an OPEN USER DECISION — flag, see §7.
- **Animation driver**: a **compute sim** (mirrors the example + the repo's spore/text kernels) flowing particles Input→Output along the conduit, NOT a bare `useFrame` uTime ramp. But the example's **O(n²) nearest-neighbor link search is REJECTED** (8192² ≈ 67M iters/frame blows the 60fps budget for a non-hero accent). Use **fixed sequential links** (each particle links to the next in its lane) — see §3.3.
- **Links = second draw call**: yes. A separate `Mesh` (links) + the particle `InstancedMesh`/sprite mesh, exactly as the example. Links are quads in a `StorageBufferAttribute`-backed `BufferGeometry`, filled by the same compute kernel.
- **Color**: FIXED cyan→violet ramp keyed to flow position `t` along the conduit (and a per-stage ignition boost). The example's `hue()`/`colorOffset` cycling is DELETED (brand rule: NO hue-cycling).
- **Bloom**: emissive >1.0 + `toneMapped:false` so the EXISTING `PostFXNodes` selective bloom catches it. Do NOT add a bloom pass.
- **CRITICAL storage-buffer rule**: a `"vec3"` `instancedArray` is 16-byte padded → `.toAttribute()` is 4-wide → swizzle `.xyz` before any `vec4()`/`length()`/vec3 op. Mirror the spore/text kernels exactly (they cite this as the step-4 regression).

---

## 1. The reference example — what it actually does

Source fetched from `mrdoob/three.js@dev/examples/webgpu_tsl_vfx_linkedparticles.html` (MIT). Technique, verbatim:

### 1.1 Buffers + spawn
- `nbParticles = 2^13 = 8192`. Two storage buffers via `storage(new StorageInstancedBufferAttribute(nbParticles, 4), 'vec4', nbParticles)`: **positions** (xyz=pos, **w=life**, `w<0` = dead) and **velocities** (vec4).
- An init compute sets all positions to `vec3(10000)` and life `-1` (parked dead).
- A `spawnParticles` compute (dispatched `nbToSpawn` threads/frame) wakes a rolling window of indices (`spawnIndex.add(instanceIndex).mod(nbParticles)`), sets life=1, gives each a random spherical velocity, and places it lerped between `previousSpawnPosition`→`spawnPosition` (the cursor, lerped 0.1/frame). `spawnIndex` advances by `nbToSpawn` each frame.

### 1.2 Particle render
- `SpriteNodeMaterial`, `AdditiveBlending`, `depthWrite:false`. `positionNode = particlePositions.toAttribute()` (the example reads the 4-wide vec4 directly into a sprite center — sprites take xyz), `scaleNode = vec2(particleSize)`, `rotationNode = atan(vel.y, vel.x)`.
- `colorNode`: `getInstanceColor(i) * (pulse * modLife)` where `modLife = pcurve(life.oneMinus(),8,1)` and `pulse` is a per-particle sine breathing.
- `opacityNode`: `step(uv.sub(0.5).length(), 0.5) * life` (round disc that fades as life→0).
- Rendered as `InstancedMesh(particleGeom, particleMaterial, nbParticles)`.

### 1.3 Links (the "linked" look) — SECOND mesh
- A FIXED index buffer is built on CPU: each particle owns **2 quads** (8 verts → indices `i*8 + {0,1,2, 0,2,3}` per quad). `nbVertices = nbParticles*8`.
- Two `StorageBufferAttribute(nbVertices,4)`: `linksVerticesSBA` (position) + `linksColorsSBA` (color.xyz + w=opacity). A plain `BufferGeometry` binds them as `position`+`color`, with `setIndex(linksIndices)`.
- `MeshBasicNodeMaterial` with `vertexColors:true`, `DoubleSide`, `AdditiveBlending`, `depthTest/Write:false`, `opacityNode = storage(linksColorsSBA,'vec4',count).toAttribute().w`.
- The `updateParticles` compute, for each ALIVE particle, runs `Loop(nbParticles)` to find its **2 closest live particles**, then writes the 2 quads (a thin ribbon of width `linksWidth` along Y) stretching from itself to each neighbor, and writes the link color = `getInstanceColor(i)` with `w = min(neighborLife, life).pow(0.8)`.

### 1.4 Update + post
- Velocity from a `mx_fractal_noise_vec3` turbulence field × life, friction, integrate, decrement life.
- `animate()`: `renderer.compute(updateParticles); renderer.compute(spawnParticles)`; then `RenderPipeline` (= `PostProcessing`) with `pass(scene,camera)` → `bloom(scenePassColor, 0.75, 0.1, 0.5)` → `outputNode = scenePassColor.add(bloomPass)`. **This is identical in shape to our `PostFXNodes` selective bloom** — so our existing bloom catches the centerpiece if it emits >1.0.

### 1.5 What we KEEP vs CHANGE
| Reference | Our adaptation |
|---|---|
| vec4 pos buffer (w=life) | KEEP the vec4(xyz=pos,w=life) packing (avoids the separate float life buffer; w is unpadded inside vec4). |
| `storage(new StorageInstancedBufferAttribute(...))` | Mirror the REPO idiom: `instancedArray(Float32Array, 'vec4')` for compute-written particle state; raw `StorageBufferAttribute` for the LINK vertex/color buffers (they must be a non-instanced geometry attribute — see §3.3). |
| cursor spawn (`spawnPosition.lerp(scenePointer)`) | DELETE cursor interaction. Spawn deterministically at the **Input emitter (stage 0)**; particles flow along the conduit to **Output (stage 5)** and die. |
| `hue()` + `colorOffset` rotation | DELETE. Fixed cyan→violet ramp keyed to flow `t` + per-stage ignition. |
| `Loop(nbParticles)` nearest-neighbor (O(n²)) | REJECT. Fixed sequential links per lane (O(1) per particle). |
| `mx_fractal_noise_vec3` turbulence | Optional tiny lateral jitter via `sin()` (repo idiom) — keep dependencies minimal; `mx_fractal_noise_*` exists in three/tsl but the repo never uses it, so prefer the repo's `sin`-based shimmer. |
| OrbitControls / autoRotate | DELETE — world-anchored, the SignatureLine camera authority owns the camera. |

---

## 2. Installed-API verification (three 0.184.0)

Verified by `require('three/tsl')` / `require('three/webgpu')` on the installed build:

- **three/tsl** — ALL present: `Fn, uniform, attribute, instancedArray, instanceIndex, positionLocal, modelViewMatrix, cameraProjectionMatrix, cameraPosition, vec2, vec3, vec4, float, int, length, max, min, clamp, exp, sin, cos, fract, floor, mod, dot, cross, distance, mix, smoothstep, step, Discard, varying, pow, abs, hash, If, Loop, time, uv, range, normalize, negate, select, sqrt, atan, PI`. Also `storage`, `deltaTime`, `hue`, `color` present (the latter two we DON'T use).
- **three/webgpu** — ALL present: `InstancedBufferGeometry, BufferAttribute, InstancedBufferAttribute, StorageInstancedBufferAttribute, StorageBufferAttribute, MeshBasicNodeMaterial, SpriteNodeMaterial, Color, Vector2, Vector3, AdditiveBlending, NormalBlending, DoubleSide, BufferGeometry, LineSegments, Points, InstancedMesh, PostProcessing`.
- **@react-three/drei 10.7.7**: `Line` + `QuadraticBezierLine` present BUT see §2.1 (WebGPU incompatible).

Node-method chaining used by the example (`.lengthSq()`, `.notEqual()`, `.and()`, `.reciprocal()`, `.toInt()`, `.oneMinus()`, `.greaterThan()`, `.element(i).xyz.assign()`, `.element(i).w`) are TSL node METHODS, not top-level exports — they resolve on the node instances at runtime (the repo's loose `AnyNode` type in gpgpuNodeSim.ts is how it types these). If we adopt fixed sequential links we avoid `.lengthSq/.notEqual/.and` entirely (no neighbor search), so the surface we depend on is the same set the repo already exercises (`.element/.xyz/.assign/.addAssign/.mul/.add/.sub` + `If/Loop`).

### 2.1 CONFLICT: PIANO says "wireframe schematic via drei `<Line>` + dashOffset inside the selective bloom" — NOT viable on the WebGPU path
`@react-three/drei`'s `<Line>` is built on `three-stdlib`'s `Line2`/`LineMaterial` — a **raw GLSL `ShaderMaterial`**. Under `WebGPURenderer` the NodeBuilder rejects raw-GLSL ShaderMaterial ("Material ShaderMaterial is not compatible") → it renders as a **black silhouette** (this is the exact dual-namespace pitfall documented in `curlTubeNodeMaterial.ts`/`particleNodeMaterial.ts` headers, and why every line/particle/tube material in this repo has a TSL twin). So the PIANO's "drei `<Line>` + dashOffset" cannot live on the same `full+webgpu` path as PostFXNodes.

**Compliant alternative (recommended)**: render the WIREFRAME SCHEMATIC as a **TSL `MeshBasicNodeMaterial` line/quad mesh** in the same module — the conduit baseline (a thin emissive tube/quad strip through the 6 stages) + the 6 stage "node" rings as `MeshBasicNodeMaterial` ring geometries, all `toneMapped:false` emissive >1.0 so they ride the existing bloom. The animated dash/flow is the particle stream itself (the dashOffset metaphor is realised by particles travelling the conduit), so we do not need an animated `dashOffset` line at all. If a static dashed schematic is still wanted, draw it with a TSL material reading a `uv().x`-keyed dash mask — never drei `<Line>`. **This is a structural deviation from the PIANO wording — flag to user (§7).**

---

## 3. The GPU / material design (the centerpiece)

### 3.1 Coordinate / placement contract NEEDED FROM SLICE A
SLICE A owns the routeCurves + the SignatureLine camera authority. What this slice needs:
- The `"pipeline"` anchor exists in `routeCurves['/trust']` (VERIFIED: `{ anchor: "pipeline", x: -1.25, z: 0.2 }`) and in the DOM (`trust-client.tsx` line 260: `<div data-line-anchor="pipeline">`). The `useSectionAnchors()` hook exposes `fractions["pipeline"]` + `scrollHeight`.
- **World-anchor math (mirror RouteHero verbatim)**: `k = WORLD_VIEW_HEIGHT / size.height; worldY = -fraction * scrollHeight * k; group.position.set(0, worldY, Z)`. Use `useThree().size` (resize-stable) — NEVER `useThree().viewport` (camera-distance-derived, feedback loop; see constants.ts + RouteHero header).
- Mount AFTER `SignatureLine` in Scene JSX so this component's `useFrame` runs after the single camera authority wrote `camera.position.y`/`quaternion` for the frame (same ordering note as RailPlanes/ResourcePreviewPlane).
- **The contract I need from SLICE A**: confirm the `pipeline` waypoint stays at `x:-1.25, z:0.2` (the line passes to the LEFT of center at that anchor). The centerpiece is a horizontal conduit centered at x:0; the line threading "near" it (not through center) is fine and on-brand. If SLICE A re-centers `pipeline` to x:0 the line will thread the conduit middle — even better, but NOT required. No coupling beyond reading `anchors.fractions["pipeline"]`.

### 3.2 Conduit geometry — a 6-stage horizontal field
- 6 stages at world X = `lerp(-CONDUIT_HALF, +CONDUIT_HALF, i/5)` for i in 0..5, Y=0, small Z weave optional. `CONDUIT_HALF ≈ 3.0` world units (≈ the SVG's 880-wide horizontal feel inside `WORLD_VIEW_HEIGHT`).
- Particles live in **lanes**: assign each particle a lane (a few parallel rows around Y=0 with small jitter) and a flow phase `s∈[0,1]` (its position along the conduit). The emitter at stage 0 (Input) continually re-seeds particles whose `s` passed 1.0 back to `s=0`.
- This degrades to the SVG on non-full tiers (the SVG is the desktop-horizontal / mobile-vertical 6-stage diagram already shipped).

### 3.3 Compute sim (the recommended driver)
Mirror `createSporeComputeNodeBuild`/`createTextMorphComputeBuild` structure exactly. ONE `instancedArray` for particle state + the link buffers.

```ts
// state: vec4 (xyz = world pos, w = flow phase s in [0,1]); velocity optional
const N = COUNT_BY_TIER.full;                 // e.g. 4096 (see §3.6)
const posBuf = instancedArray(seedPos, "vec4"); // vec4 → w is unpadded INSIDE the vec4
const laneBuf = instancedArray(laneData, "float"); // lane row (unpadded float; NO .xyz)

const uTime   = uniform(0);
const uDelta  = uniform(1/60);
const uFlow   = uniform(0.18);   // conduit traversal speed (s units/sec)
const uStageIgnite = uniform(/* vec for 6 stages */); // per-stage 0..1 ignition (see §4)

const simulate = Fn(() => {
  const st = posBuf.element(instanceIndex);   // vec4 handle (COMPUTE stage: .element OK)
  const lane = laneBuf.element(instanceIndex);
  const s = st.w.toVar();
  s.addAssign(uDelta.mul(uFlow));             // flow Input -> Output
  // recycle: when past Output, wrap back to Input (staggered by hash so it streams)
  s.assign(fract(s));
  // analytic conduit position from s + lane (deterministic, like the spore anchor):
  const x = mix(float(-CONDUIT_HALF), float(CONDUIT_HALF), s);
  const y = lane.mul(LANE_GAP).add( sin(s.mul(20.0).add(uTime)).mul(0.03) ); // tiny shimmer
  const z = float(0.0);
  st.xyz.assign(vec3(x, y, z));               // .xyz on the vec4 element (compute-stage assign)
  st.w.assign(s);
})().compute(N);
```

**Why a compute sim and not a bare useFrame uTime ramp:** a uTime ramp would have to recompute every particle's position on CPU and re-upload a buffer each frame (slow) OR be a purely analytic vertex-shader function of `instanceIndex`+time. The analytic-vertex approach is actually viable and SIMPLER (no compute dispatch, works without the storage-buffer write path) — BUT the LINKS need the neighbor positions in a buffer to draw quads, and the cleanest way to feed link quads is to have the compute kernel write them. **Recommendation: compute sim** (matches the example + the repo's two shipping kernels, and the link-quad write is trivial in the same kernel). If we ever want zero-compute, a fully-analytic links-free "flowing dots" variant is the WebGL2-fallback's natural shape (§4.3).

### 3.3.1 Links — fixed sequential, second draw call
Reject the example's `Loop(nbParticles)` neighbor search. Instead: particles in the SAME lane are pre-sorted by index along `s`, so **particle i links to particle i+1 in its lane** (a fixed topology). The link is a thin quad ribbon (the example's `linksWidth` Y-offset trick). In the same compute kernel, after writing `st.xyz`, write the 4 link verts connecting this particle to its lane-successor into `linksVerticesSBA`, and the link color (cyan→violet ramp at this `s`, w=opacity that fades near the conduit ends) into `linksColorsSBA`. Topology is fixed (CPU index buffer of `i*4 .. i*4+3` per particle), exactly the example's fixed-index approach but 1 quad/particle instead of 2.

```ts
// link buffers (raw StorageBufferAttribute → bound as a NON-instanced geometry attr)
const linksVerts  = new StorageBufferAttribute(N*4, 4);
const linksColors = new StorageBufferAttribute(N*4, 4);
const linksGeom = new BufferGeometry();
linksGeom.setAttribute("position", linksVerts);
linksGeom.setAttribute("color", linksColors);
linksGeom.setIndex(/* i*4 + {0,1,2,0,2,3} for each i */);
const linksMat = new MeshBasicNodeMaterial();
linksMat.vertexColors = true; linksMat.transparent = true;
linksMat.depthTest = false; linksMat.depthWrite = false;
linksMat.blending = AdditiveBlending; linksMat.toneMapped = false; // emissive >1.0 for bloom
linksMat.opacityNode = storage(linksColors, "vec4", linksColors.count).toAttribute().w;
// colorNode = the vertex color (cyan->violet ramp) * EMISSIVE (>1.0)
```
Inside `simulate`, fill the link quad (mirror example lines 279-296, but 1 quad to the lane-successor):
```ts
const lv = storage(linksVerts, "vec4", linksVerts.count);
const lc = storage(linksColors, "vec4", linksColors.count);
const base = instanceIndex.mul(4);
const me = st.xyz;                       // this particle
const nextS = fract(s.add(LANE_STEP));   // successor's s (same lane, fixed offset)
const nx = mix(float(-CONDUIT_HALF), float(CONDUIT_HALF), nextS);
const them = vec3(nx, y, z);             // successor world pos (analytic, no buffer read)
lv.element(base).xyz.assign(me);      lv.element(base).y.addAssign(uLinkW);
lv.element(base.add(1)).xyz.assign(me); lv.element(base.add(1)).y.addAssign(uLinkW.negate());
lv.element(base.add(2)).xyz.assign(them); lv.element(base.add(2)).y.addAssign(uLinkW.negate());
lv.element(base.add(3)).xyz.assign(them); lv.element(base.add(3)).y.addAssign(uLinkW);
// color = fixed cyan->violet ramp at s (NO hue cycling) + stage-ignition boost, fade near ends
const ramp = brandRamp(s); // mix(COL_CYAN, COL_VIOLET, s) — see §3.5
const endFade = smoothstep(0.0,0.06,s).mul(smoothstep(1.0,0.94,s));
const a = endFade.mul(uLinkOpacity);
Loop(4, ({ i }) => {
  lc.element(base.add(i)).xyz.assign(ramp.mul(uEmissive)); // >1.0
  lc.element(base.add(i)).w.assign(a);
});
```
This is O(1) per particle (no neighbor scan). Because the successor position is ANALYTIC (`mix(...nextS)`), we don't even need to read another particle's buffer — eliminating any cross-buffer `.element(j)` read hazard.

### 3.4 Particle render
`SpriteNodeMaterial` (example) OR the repo's billboard-quad `MeshBasicNodeMaterial` (particleNodeMaterial.ts idiom). **Recommendation: `SpriteNodeMaterial`** — it is the example's choice, exists in 0.184.0, and `positionNode = posBuf.toAttribute()` + `scaleNode` is the least code. CAVEAT to verify in-browser: the WebGPU 1px point-size cap that forced particleNodeMaterial.ts off `PointsNodeMaterial` does NOT apply to `SpriteNodeMaterial` (sprites are quads), so sprites are safe — but VERIFY visually (real Chrome) per quality-guidelines (headless has no WebGPU).

```ts
const mat = new SpriteNodeMaterial();
mat.blending = AdditiveBlending; mat.depthWrite = false; mat.toneMapped = false;
// CRITICAL: posBuf is vec4; .toAttribute() is 4-wide; SpriteNodeMaterial.positionNode
// wants a vec3 center → swizzle .xyz. (vec4 w=phase must NOT leak into the position.)
mat.positionNode = posBuf.toAttribute().xyz;     // <-- .xyz MANDATORY
mat.scaleNode = vec2(uParticleSize);
const sN = posBuf.toAttribute().w;               // phase s (w of the vec4 — 4th comp, fine)
mat.colorNode = brandRamp(sN).mul(uEmissive);    // >1.0 fixed cyan->violet, NO hue
mat.opacityNode = step(uv().sub(0.5).length(), 0.5)
  .mul(smoothstep(0.0,0.06,sN)).mul(smoothstep(1.0,0.94,sN)); // round disc + end fade
```
**Storage-buffer rule (the step-4 regression, cited in gpgpuNodeSim.ts L15-20 & L1028-1029):** here the buffer is `vec4` so `.toAttribute()` is naturally 4-wide and `.xyz`/`.w` swizzles are exactly right. The trap only BITES on a `"vec3"` buffer (padded to 16 bytes → 4-wide → a bare `vec4(p,1.0)` silently drops the 1.0). If any helper buffer is declared `"vec3"`, every render read MUST trail `.xyz`. Declaring particle state as `vec4` SIDESTEPS the padding trap for the main buffer — recommended.

### 3.5 Color — FIXED cyan→violet ramp (brand rule)
```ts
const COL_CYAN   = new Color(0x3BE1FF); // matches lineColorA / HOME_FX
const COL_VIOLET = new Color(0x7C5CFF); // matches lineColorB
// trust route biases violet to #6E7BFF (routeFx['/trust'].lineColorB) — use that tail.
const brandRamp = (s) => mix(uColCyan, uColViolet, clamp(s, 0, 1)); // s = flow position
```
No `hue()`, no `colorOffset` rotation. The ONLY hue motion is the spatial cyan→violet gradient along the conduit (cyan at Input, violet at Output), which IS the brand signal direction. Per-stage ignition (§4) brightens (raises emissive) without shifting hue.

### 3.6 Tiered counts (60fps budget)
The example runs 8192 particles WITH an O(n²) link search; we removed the O(n²) so we can afford a comparable or smaller count cheaply. This is a NON-hero background accent (the hero is HeroLogo's ~37k spores) — keep it light:
- `full`: **4096** particles (4096 sprites + 4096 link quads = 8192 quads, 2 draw calls). Comfortable on desktop alongside the spore hero is NOT a concern (different route).
- `lite`: this whole component does NOT mount (lite gets the SVG only — same gating as RailPlanes/ResourcePreviewPlane: `full + webgpu`).
- The compute kernel is O(N) (no neighbor scan), so 4096 is trivial. If profiling shows headroom, 6144 is fine; if a weaker GPU stutters, 2048. Make `COUNT_BY_TIER` a tunable constant.

---

## 4. Per-stage "ignition" (echo the SVG's per-station pulse) WITHOUT hue-cycling

The SVG ignites each station as the streak head crosses it (compliance-pipeline.tsx L130-141). Mirror that:
- The 3D centerpiece has its OWN traversal phase (a single 0..1 head position cycling at `TOTAL_DURATION ≈ 8s`, matching the SVG). When the head crosses stage i's `s`, raise that stage's ignition 0→1→0.
- Ignition manifests as a per-stage **emissive boost** (brighter, more bloom) on (a) the stage "node" ring mesh at that X, and (b) the particles near that `s`. NOT a hue shift. `colorNode = brandRamp(s).mul(uEmissive.add(stageIgnite(s)))` where `stageIgnite` reads a 6-float ignition uniform and returns the nearest stage's value with a small falloff.
- **Driver**: drive the head + ignition from `useFrame` time inside the component (a pure clock ramp — no external store needed for the autonomous pulse). OPTIONALLY sync to scroll so the pulse "walks" the conduit as the reader scrolls the pipeline into view (mirrors the SVG's ScrollTrigger play/pause). Recommendation: autonomous clock + a visibility gate (only animate when the `pipeline` anchor is near, like RouteHero's `near` cull) — simplest robust option that reads as "data flowing through controlled checkpoints".

### 4.1 prefers-reduced-motion
`prefers-reduced-motion` resolves to tier `"off"` (CanvasHost renders nothing) per quality-guidelines + PostFXNodes header — so this component NEVER mounts under reduced motion. The SVG's own reduced-motion branch (static conduit, stations softly lit, L100-105) is the entire experience. Nothing extra to do, but DOCUMENT it.

### 4.2 tier off / lite
- `off`: no canvas at all → SVG only. Complete + accessible by construction.
- `lite`: component not mounted (gating) → SVG only.

### 4.3 WebGL2 fallback (flag ON but no true-WebGPU backend / headless)
Per quality-guidelines + gpgpuNodeSim.ts BACKEND CONTRACT (L40-44): the compute kernels (`gl.compute`, storage `.element()` indexing) are **only valid on the TRUE WebGPU sub-backend**; under the WebGL2 transform-feedback emulation `.element()` misindexes (three #31221). So:
- Gate the COMPUTE path on `backend.isWebGLBackend !== true && typeof gl.compute === "function"` (mirror HeroLogo's gate exactly).
- On WebGL2-fallback: render NOTHING from this component (or a static analytic flowing-dots variant with NO compute, NO storage `.element`), and the SVG remains the baseline. **Recommendation: render nothing on WebGL2-fallback** — the SVG is already the full accessible visual; a half-broken 3D is worse than none. Same posture as HeroLogo routing non-WebGPU backends to the static build, except here "static" = the SVG.

---

## 5. Files to EDIT and CREATE (exact paths, webgl-layer casing)

### CREATE
| Path | Purpose |
|---|---|
| `src/webgl/CompliancePipeline3D.tsx` | PascalCase React component. Mounts the world-anchored centerpiece. Gates: `pathname === "/trust" && tier === "full" && webgpuEnabled()`. Lazy-imports `three/webgpu`+`three/tsl`+the material/sim factory (mirror RailPlanes' lazy `import()` + `webgpuEnabled()` guard). World-anchors to `"pipeline"` via `useSectionAnchors`. Runs the per-frame `gl.compute(sim)` + ignition clock + near-cull. Dev console handle `__sersanPipeline3D`. |
| `src/webgl/gpgpu/linkedParticlesNodeSim.ts` | camelCase. The TSL factory `createLinkedParticlesBuild(gl, webgpu, tsl, opts)` → `{ particleMesh-geom+mat, linksGeom+mat, uniforms, tick(dt,time), dispose() }`. Mirrors `createSporeComputeNodeBuild` signature shape (namespaces passed in by the caller; loose `AnyNode` types). Owns the conduit/lane seeding, the `simulate` compute Fn (pos + link-quad writes), the SpriteNodeMaterial + links MeshBasicNodeMaterial, the fixed link index buffer. |
| `src/webgl/gpgpu/linkedParticlesConfig.ts` (OPTIONAL) | camelCase pure-data: `COUNT_BY_TIER`, `CONDUIT_HALF`, `LANE_GAP`, `LANE_STEP`, `STAGE_COUNT=6`, `COL_CYAN/VIOLET`, `EMISSIVE`, `LINK_WIDTH`, `FLOW_SPEED`, `TOTAL_DURATION`. Keep it tiny; could inline into the sim file if preferred. |

### EDIT
| Path | Change |
|---|---|
| `src/webgl/Scene.tsx` | Add the gated mount AFTER `SignatureLine` (and after RailPlanes/ResourcePreviewPlane is fine): `{pathname === "/trust" && tier === "full" && webgpu && <CompliancePipeline3D anchors={anchors} tier={tier} />}`. Import the component. Update the existing comment block at L109-114 ("CompliancePipeline3D … arrives later in P6 — NOT here") to reflect it now ships. NOTE: `/trust` already has a `ROUTE_HERO['/trust']` closing ring at the `ritual` anchor — leave it; the pipeline centerpiece is a SEPARATE object at the `pipeline` anchor. |
| `src/components/sections/compliance-pipeline.tsx` | NO CHANGE if AUGMENT (the SVG stays the baseline on all tiers). IF the user chooses REPLACE-on-full (§7), add a `tier==="full" && webgpu` check to visually de-emphasize/hide the SVG fill while keeping the focusable labels + role=img — but recommendation is NO CHANGE. |
| `src/app/trust/trust-client.tsx` | NO CHANGE expected (the `data-line-anchor="pipeline"` wrapper already exists at L260). IF the PIANO's "regulatory labels as FOCUSABLE DOM HOTSPOTS (Radian EXR pattern)" is in-scope for THIS slice, that is a DOM concern layered over the SVG — flag as a separate beat; the SVG already exposes the labels as `<text>` inside a `role=img`. Treat label-hotspots as OUT OF SCOPE for the GPU slice unless the user says otherwise (§7). |

---

## 6. Architecture decision — world-anchor vs camera-lock (RECOMMENDATION)

**WORLD-ANCHOR.** Rationale:
1. The pipeline SVG sits in NORMAL document flow mid-page (not in a sticky pin). RailPlanes/ResourcePreviewPlane went camera-locked ONLY because their DOM targets are inside a STICKY PINNED frame (cards fixed in viewport while the camera glides) — that condition does NOT hold here. The pipeline scrolls normally with the page.
2. The signature line already weaves a world waypoint through `pipeline` (`x:-1.25, z:0.2`), so a world-anchored centerpiece at that fraction sits in the same world neighbourhood the beam threads — the two read as one system.
3. RouteHero's world-anchor math is the proven, byte-tested pattern for "3D object glued to a `[data-line-anchor]`" and handles the lookAt-tilt gracefully because the object is deep-Z and culled by distance (it doesn't need pixel-exact DOM registration — it's a BACKDROP behind the SVG, not a fill-in-the-card overlay).

Camera-lock would be the wrong tool: it's for pixel-exact registration with a screen-fixed DOM rect, which we don't need (the centerpiece is ambient, behind/around the card).

**AUGMENT, do not replace.** The SVG is the accessible DOM baseline (role=img, aria-label, focusable `<text>`, reduced-motion branch) and MUST remain complete on every non-full path. On `full+webgpu` the 3D adds depth BEHIND/AROUND the SVG card (canvas is z-0 behind the DOM). Hiding the SVG on full would drop the a11y baseline on the very tier most users are on. If the user wants the 3D to visually dominate, dial the SVG card's bg transparency (CSS) so the 3D shows through — but keep the SVG in the DOM.

---

## 7. OPEN DECISIONS for the user (flag — do not assume)

1. **Replace vs augment the SVG on full+webgpu?** Recommendation: AUGMENT (3D behind, SVG stays). The PIANO §9.7 says "elevate … to TSL linked particles" which reads like replace-the-visual; confirm we keep the SVG card as the accessible foreground vs. fully swapping it for the 3D on full.
2. **The PIANO's "wireframe schematic via drei `<Line>` + dashOffset"** is NOT WebGPU-compatible (drei Line = GLSL ShaderMaterial → black on WebGPURenderer). Approve the compliant substitute: a TSL `MeshBasicNodeMaterial` conduit/ring schematic (the flowing particles ARE the animated dash). Confirm.
3. **The PIANO's "regulatory labels as FOCUSABLE DOM HOTSPOTS (Radian EXR pattern, vertical stack below md)"** — is this in scope for the GPU slice, or a separate DOM beat? The SVG already renders the 6 labels + regulations as accessible `<text>`. Recommend treating hotspot-restyle as a separate DOM task.
4. **Count / intensity**: 4096 particles, EMISSIVE tuned so it reads as a quiet governed signal (trust route is "cooler + crisper", routeFx bloomThreshold 0.92). Confirm the centerpiece should be SUBORDINATE to the SVG (ambient backdrop), not a loud hero.
5. **Copy/structure**: NO copy or structure change proposed (frozen EN/IT). Confirm.

---

## 8. Signal / store design (2-3 lines)

- **No new cross-bundle store is strictly required**: the centerpiece's flow + ignition are an AUTONOMOUS clock driven inside `CompliancePipeline3D.useFrame` (like RouteHero's internal pulse), reading only `useSectionAnchors()` (already reactive) + an internal visibility/near-cull.
- IF scroll-synced ignition is wanted (pulse walks the conduit as the reader scrolls the pipeline in — mirroring the SVG's ScrollTrigger), add a globalThis-pinned `pipelinePulseStore` EXACTLY like `productionPulseStore`/`auditTimelineStore` (WRITER: a small effect in compliance-pipeline.tsx bumping on the same ScrollTrigger; READER: CompliancePipeline3D.useFrame via `.getState()`, no hooks in the loop). Use this only if the autonomous clock doesn't read as connected enough.
- Reuses existing: `useSectionAnchors` (anchors), `webgpuEnabled()` (gate), `useFxStore`/`routeFx('/trust')` for bloom tone (read indirectly — PostFXNodes already applies trust bloom; this component just emits >1.0).

---

## 9. CONFLICT ZONES (files shared with other slices)

| File | Shared with | This slice's touch | Risk |
|---|---|---|---|
| `src/webgl/Scene.tsx` | EVERY webgl slice (SignatureLine, RailPlanes, RouteHero, PostFXNodes, etc.) | ADD one gated `<CompliancePipeline3D>` line after SignatureLine; edit one stale comment (L109-114). | Low — additive mount. Coordinate ordering: MUST be after SignatureLine. |
| `src/webgl/PostFXNodes.tsx` | SignatureLine, RouteHero, DriftParticles, RailPlanes (all bloom opt-ins) | NO EDIT. We rely on its selective bloom (emit >1.0 + toneMapped:false). | None if we don't touch it. Do NOT add a second bloom pass (PIANO + spec forbid). |
| `src/webgl/curves/routeCurves.ts` | SLICE A (line). | NO EDIT (read `pipeline` anchor only). | None. Flag to SLICE A: keep the `pipeline` waypoint. |
| `src/webgl/store/routeFxStore.ts` | PostFX/PostFXNodes/SignatureLine/DriftParticles | NO EDIT (read trust tone). | None. |
| `src/webgl/store/sectionStore.ts` / `useSectionAnchors` | every anchored object | READ ONLY. | None. |
| `src/webgl/SignatureLine.tsx` | SLICE A. | NO EDIT (camera authority; we mount after it). | None — ordering contract only. |
| `src/components/sections/compliance-pipeline.tsx` | the /trust DOM (SLICE for /trust DOM beats, if any) | NO EDIT recommended (augment). Possible CSS bg-transparency tweak only if user picks "3D shows through". | Low. |
| `src/app/trust/trust-client.tsx` | /trust DOM slices | NO EDIT (anchor exists). | None. |
| `globals.css` | global | NO EDIT expected. | None. |

---

## 10. QA plan (real Chrome WebGPU vs headless)

- **Headless / CI / `next build`**: only verifies TS strict + build (the gates per quality-guidelines). Headless has NO WebGPU here, so the compute kernel, SpriteNodeMaterial, links mesh, and selective bloom CANNOT be validated headless. Confirm the component compiles, the OFF bundle never imports `three/webgpu` (lazy import discipline — assert the static import graph touches only react/fiber/local stores, like PostFXNodes/RailPlanes), and that on a non-WebGPU backend it renders nothing (SVG baseline intact).
- **Real Chrome (WebGPU, `NEXT_PUBLIC_WEBGPU=1`, full tier)** — MANDATORY visual checks:
  1. Navigate `/trust`, scroll to the pipeline section. Centerpiece visible BEHIND/AROUND the SVG card; particles flow Input→Output (left→right desktop); links form a connected ribbon; cyan→violet spatial gradient (NO hue cycling over time — watch ≥10s to confirm no rotation).
  2. Per-stage ignition pulses walk the 6 stages (echoes the SVG streak); ignition brightens (bloom) without hue shift.
  3. Selective bloom catches the centerpiece (it glows) but the navy DOM/text does NOT bloom (threshold ≈ 0.92 trust tone).
  4. Console CLEAN (no "Material ShaderMaterial is not compatible", no "Length of parameters exceeds maximum" = the storage-buffer `.xyz` regression, no null-input crash).
  5. SVG remains present + accessible (tab to labels, screen-reader reads aria-label).
  6. 60fps: DevTools perf / the dev FPS handle — confirm no stutter at 4096.
- **WebGL2-fallback (force the fallback backend)**: confirm the component renders nothing (or the safe analytic variant) and the SVG is the complete visual; NO `.element()` misindex artifacts.
- **prefers-reduced-motion**: tier resolves to "off" → no canvas → SVG static branch only.
- **Mobile / lite**: component not mounted → SVG vertical diagram only.
- **EN/IT**: toggle language; the SVG labels swap (frozen copy); the 3D is decorative (no copy).

---

## 11. Caveats / not found

- `mcp__exa__*` MCP tools were NOT available in this session; the reference example was fetched directly from `raw.githubusercontent.com/mrdoob/three.js@dev/.../webgpu_tsl_vfx_linkedparticles.html` (MIT) — full technique captured in §1. The `dev`-branch source matches the r184-era example shape (uses `RenderPipeline` alias = `PostProcessing`, `StorageInstancedBufferAttribute`, `Loop`, `SpriteNodeMaterial`, `mx_fractal_noise_*`), all of which are present in the installed 0.184.0 (verified §2).
- `SpriteNodeMaterial` WebGPU point/sprite sizing was NOT visually verified (headless has no WebGPU). The 1px cap that killed `PointsNodeMaterial` (particleNodeMaterial.ts header) is a POINT-primitive limit; sprites are quads, so expected safe — but VERIFY in real Chrome (§10.3). If sprites misbehave, fall back to the repo's billboard-quad `MeshBasicNodeMaterial` idiom (particleNodeMaterial.ts) which is already proven on both backends.
- The exact `pipeline` waypoint coordinates depend on SLICE A not re-centering it; verified current value `x:-1.25, z:0.2`. No hard coupling (read-only).

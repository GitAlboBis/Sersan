# Research: GPGPU particle-system API spec (dissolve & regenerate hero logo)

- **Query**: Version-grounded GPGPU particle-system API spec for the SERSAN logo dissolve hero — WebGPU-native compute (flag ON) + WebGL2 FBO fallback (flag OFF), verified against installed `three@0.184.0`.
- **Scope**: internal (installed `node_modules/three@0.184.0` source + repo code). exa/Context7 not used — the installed pins are authoritative.
- **Date**: 2026-06-08
- **Pins** (`package.json`): `three 0.184.0`, `@react-three/fiber 9.6.1`, `@react-three/drei 10.7.7`, `@react-three/postprocessing 3.0.4`, `@types/three ^0.184.1`, `next 16.2.6`, `zustand 5.0.14`.

> Every API claim below cites `file:line` in the INSTALLED build. Line numbers are from `node_modules/three/build/three.webgpu.js` and `three.tsl.js` (the bundled builds the project actually imports via the `three/webgpu` and `three/tsl` export conditions — `node_modules/three/package.json` exports keys: `.`, `./webgpu`, `./tsl`, `./examples/jsm/*`, `./addons/*`).

---

## TL;DR — Recommended path (read this first)

**Use a single component that picks the compute engine by `webgpuEnabled()`, and render the particles as an INSTANCED BILLBOARD MESH on BOTH backends — never `THREE.Points`.**

1. **Render primitive (non-negotiable): instanced billboard quad, NOT `THREE.Points`.** WebGPU hard-clamps point primitives to 1px; the size cannot be set (`three.webgpu.js:28561-28569`, `28597-28605`, and the GLSLNodeBuilder emits literal `gl_PointSize = 1.0;` at `three.webgpu.js:64105`). The repo already hit this exact wall and abandoned points for `DriftParticles` (`src/webgl/DriftParticles.tsx:8-19`, `src/webgl/materials/particleNodeMaterial.ts:5-12`). Reuse that proven InstancedBufferGeometry+billboard pattern. The PRD's "THREE.Points" wording (PRD §4) must be implemented as instanced billboards on the WebGPU path.

2. **Flag ON (WebGPU, primary)** — **two viable engines, recommend the FBO-via-`gl.setRenderTarget` one for lowest risk:**
   - **Option A (TSL compute / storage buffers)** is the idiomatic three 0.184 way and is fully supported (`instancedArray`, `Fn().compute(count)`, `renderer.computeAsync`, `instanceIndex`, `.element()`, `.toAttribute()` — all verified below). It is genuinely viable in 0.184 + R3F 9.6. BUT it requires a brand-new code path you haven't shipped, and it only runs on the WebGPU sub-backend (storage buffers don't exist on the WebGL2 fallback sub-backend of WebGPURenderer — see "Risk" §5).
   - **Option B (FBO ping-pong via `renderer.setRenderTarget` + TSL `NodeMaterial` sim pass)** reuses the **already-proven** `src/webgl/fluid/PointerFlowmap.ts` precedent: an offscreen `Scene`+`OrthographicCamera`+fullscreen quad, two float RenderTargets, `gl.setRenderTarget(rt); gl.render(quad,cam); gl.setRenderTarget(null)` inside the single `useFrame`. `Renderer.render()` is synchronous and works on BOTH the WebGPU and WebGL2 sub-backends of `WebGPURenderer` (PointerFlowmap.ts:18-23). The sim math is written in TSL on a `MeshBasicNodeMaterial.colorNode`, so it compiles to WGSL on WebGPU and GLSL on the WebGL2 fallback — **one sim shader, both sub-backends.**

   **HONEST RECOMMENDATION: ship Option B for the WebGPU path.** It hits 60fps, degrades cleanly across the WebGPU↔WebGL2 sub-backend split inside `WebGPURenderer` (which the storage-buffer path does NOT — that's the real risk), and reuses a precedent that already works in this exact renderer. Save TSL-compute (Option A) for a later "if we want it" pass; it's correct but it's a second engine to maintain and it silently breaks on the WebGL2 fallback sub-backend.

3. **Flag OFF (classic WebGLRenderer)** — classic FBO ping-pong with GLSL `ShaderMaterial` sim passes (use `useFBO` from drei, or `GPUComputationRenderer` which is present and WebGL-compatible — `node_modules/three/examples/jsm/misc/GPUComputationRenderer.js`). Render with a GLSL points/billboard material doing a vertex-texture lookup.

4. **Net**: if you go Option B on ON, the **sim algebra (spring/repulsion/damping/turbulence) is written once in TSL** and once in GLSL — and the GLSL one can be the SAME FBO technique on the OFF path, so you maintain **one TSL sim + one GLSL sim**, not "two engines". This is the lowest-risk path that hits the perf+degradation goals.

---

## 1. WebGPU compute path (flag ON) — TSL/storage-buffer API (Option A)

All names below are **exported** from `three/tsl` (verified in the `export { … }` block at `three.tsl.js:654`) and `three/webgpu`.

### 1.1 Storage buffers — `instancedArray` / `storage` / `StorageInstancedBufferAttribute`

| Symbol | Source | Signature |
|---|---|---|
| `instancedArray` | `three.webgpu.js:38337` | `instancedArray(count, type = 'float') → StorageBufferNode`. **`count` may be a TypedArray** (then it's used as the data and `type` gives the itemSize). |
| `storage` | `three.webgpu.js:17749` | `storage(value, type = null, count = 0) → new StorageBufferNode(value, type, count)`. `value` is a `StorageInstancedBufferAttribute`/`StorageBufferAttribute`/`BufferAttribute`. |
| `attributeArray` | `three.webgpu.js:38397` | `attributeArray(count, type='float')` — same as `instancedArray` but backed by `StorageBufferAttribute` (non-instanced). |
| `StorageInstancedBufferAttribute` | `three.webgpu.js:38224` (class), exported `three.webgpu.js:83969` | `new StorageInstancedBufferAttribute(count, itemSize, typeClass=Float32Array)`. Internally: `const array = ArrayBuffer.isView(count) ? count : new typeClass(count*itemSize)`. |
| `StorageBufferAttribute` | `three.webgpu.js:38267` (class), exported `83969` | `new StorageBufferAttribute(count, itemSize, typeClass=Float32Array)`. WebGPU-only (`38260` docblock). |
| `instanceIndex` | `three.tsl.js:234` (`TSL.instanceIndex`) | the per-invocation index node, used to address the buffer in a compute kernel. |
| `.element(indexNode)` | `addMethodChaining('element', …)` `three.webgpu.js:4797`; class `StorageArrayElementNode` `three.webgpu.js:17216-17235` | element access for read/write inside compute. `positionStorage.element(instanceIndex)`. |
| `.toAttribute()` | `addMethodChaining('toAttribute', bufferNode => bufferAttribute(bufferNode.value))` `three.webgpu.js:10429` | converts the storage buffer to a per-vertex attribute node for the RENDER material's `positionNode`. |

Canonical workflow, copied from the in-source JSDoc (`three.webgpu.js:17352-17381`, mirrored `38478`):
```js
import { instancedArray, Fn, instanceIndex } from "three/tsl";
import { SpriteNodeMaterial } from "three/webgpu";

const positionBuffer = instancedArray(particleCount, "vec3"); // StorageBufferNode

const computeInit = Fn(() => {
  const position = positionBuffer.element(instanceIndex);
  position.x = 1; position.y = 1; position.z = 1;   // write
})().compute(particleCount);

const particleMaterial = new SpriteNodeMaterial();
particleMaterial.positionNode = positionBuffer.toAttribute();

renderer.computeAsync(computeInit);   // dispatch the init kernel once
```

### 1.2 Compute kernel + dispatch — `Fn(() => {…})().compute(count)` + `renderer.compute(...)`/`computeAsync(...)`

- `Fn` (`three.tsl.js`, exported in the `654` block). Calling the `Fn` result `()` returns a node; `.compute(count, workgroupSize?)` wraps it as a `ComputeNode`.
- **`.compute` chaining**: `addMethodChaining('compute', compute)` at `three.webgpu.js:10889`. Definition `three.webgpu.js:10871`:
  `compute(node, count, workgroupSize) → computeKernel(node, workgroupSize)` then sets `.count = count` (number) or `.dispatchSize = count` (array). Default workgroup `[64]` (`ComputeNode` ctor `three.webgpu.js:10610`, `workgroupSize` doc `10631`).
- **Dispatch from the render loop** — methods on `Renderer` (the base class `WebGPURenderer` extends):
  - `renderer.compute(computeNodes, dispatchSize = null)` — `three.webgpu.js:60455`. Synchronous if backend initialized; if not yet initialized it warns and falls back to `computeAsync` (`60461-60463`).
  - `renderer.computeAsync(computeNodes, dispatchSize = null)` — `three.webgpu.js:60567` → `await this.init(); this.compute(...)`.
  - Use `renderer.compute(node)` inside `useFrame` once the backend is up (it is — R3F 9.6 `await`s `renderer.init()` in the `gl` factory, `src/webgl/renderer/createRenderer.ts:92`). Use `computeAsync` for one-off init dispatches before the first frame.
- **`instanceIndex`** addresses the buffer: `const p = positionBuffer.element(instanceIndex)`.

Per-particle sim kernel skeleton (model-space; reads/writes two buffers):
```js
import { Fn, instanceIndex, uniform, float, vec3, instancedArray,
         length, min, max, exp, mx_noise_vec3 } from "three/tsl";

const positionBuffer = instancedArray(home, "vec3");      // seeded from CPU (see 1.3)
const velocityBuffer = instancedArray(count, "vec3");     // zero-init
const homeBuffer     = instancedArray(home, "vec3");      // immutable rest target

const uMouse = uniform(new Vector3(1e9, 1e9, 1e9));       // MODEL-SPACE mouse (§4)
const uDelta = uniform(1 / 60);
const uTime  = uniform(0);
// SPRING=26, DAMPING=4.5, PUSH=42, RADIUS=0.52, MAX_SPEED=4, TURB_BASE=.35, TURB_MOVE=1.2

const simulate = Fn(() => {
  const pos  = positionBuffer.element(instanceIndex);
  const vel  = velocityBuffer.element(instanceIndex).toVar();
  const home = homeBuffer.element(instanceIndex);
  const dt   = uDelta;

  // (a) spring toward home
  const toHome = home.sub(pos);
  vel.addAssign(toHome.mul(26.0).mul(dt));

  // (b) mouse repulsion within RADIUS (model space)
  const away  = pos.sub(uMouse);
  const dist  = max(length(away), 1e-4);
  const push  = max(float(0), float(0.52).sub(dist)).div(0.52);  // 1 at center → 0 at radius
  vel.addAssign(away.div(dist).mul(push.mul(push)).mul(42.0).mul(dt));

  // (d) turbulence — low at rest, more when far from home (mx_noise_vec3, §1.4)
  const farness = min(length(toHome), 1.0);
  const turb = mx_noise_vec3(pos.mul(1.3).add(uTime.mul(0.15)));
  vel.addAssign(turb.mul(float(0.35).add(farness.mul(1.2))).mul(dt));

  // (c) damping + max-speed clamp
  vel.mulAssign(exp(float(-4.5).mul(dt)));
  const sp = length(vel);
  vel.assign(vel.mul(min(sp, 4.0).div(max(sp, 1e-4))));

  velocityBuffer.element(instanceIndex).assign(vel);
  pos.addAssign(vel.mul(dt));
})().compute(count);

// per frame: uMouse/uDelta/uTime .value = …; renderer.compute(simulate);
```

### 1.3 Seeding the buffers from CPU (MeshSurfaceSampler home positions)

Three options, **cleanest first**:

- **(Recommended) Pass the seeded Float32Array straight into `instancedArray`.** `instancedArray(count, type)` accepts a TypedArray as `count` (`StorageInstancedBufferAttribute` ctor `three.webgpu.js:38234`: `ArrayBuffer.isView(count) ? count : …`). So:
  ```js
  const home = new Float32Array(count * 3);   // filled by MeshSurfaceSampler (§3)
  const homeBuffer     = instancedArray(home, "vec3");        // immutable rest
  const positionBuffer = instancedArray(home.slice(), "vec3"); // live position starts at home
  const velocityBuffer = instancedArray(count, "vec3");        // zeros
  ```
  No init compute, no DataTexture. This is the lowest-friction seed.
- **(Alt) `.value.array` write then upload.** `StorageBufferNode.value` is the attribute; you can write `buffer.value.array.set(home)` and rely on first-upload, but passing the array to the constructor (above) is simpler and avoids dirty-flag questions.
- **(Alt) init compute kernel.** Sample into a `DataTexture`, `texture()` it in an init `Fn`, and write `positionBuffer.element(instanceIndex)`. Only worth it if you want the sampling itself on the GPU — overkill here; CPU sampling of 65k points is a one-time cost.

### 1.4 Noise / turbulence — exact exports

- `mx_noise_vec3(texcoord = uv(), amplitude = 1, pivot = 0) → vec3` — `three.webgpu.js:47219`. Coord accepts vec2|vec3 (`.convert('vec2|vec3')`). Use `mx_noise_vec3(pos)` for per-particle 3D turbulence.
- `mx_noise_float(texcoord, amplitude, pivot)` — `three.webgpu.js:47217`.
- `mx_fractal_noise_vec3(position = uv(), octaves = 3, lacunarity = 2, diminish = .5, amplitude = 1) → vec3` — `three.webgpu.js:47241`.
- `mx_fractal_noise_float(...)` — `three.webgpu.js:47239`. Also `mx_worley_*`, `mx_cell_noise_float` exist (`three.tsl.js:345`).
- `triNoise3D` is also exported (`three.tsl.js:583`).
- **There is NO `curlNoise` export.** Curl must be hand-built (finite-difference the gradient of a noise field, cross with epsilon offsets) if you want true divergence-free curl. For this hero, `mx_noise_vec3` jitter is sufficient and far cheaper — recommend it over hand-rolled curl.
- `range(min, max)` (`three.tsl.js:458`) and `hash(seed)` (`three.tsl.js:227`) are available for per-particle randomization seeded by `instanceIndex`.

### 1.5 Render material — instanced billboard (NOT a sized THREE.Points)

The render material reads position from the storage buffer. **Do not use `new THREE.Points(geo, PointsNodeMaterial)`** — size clamps to 1px on WebGPU (§6).

Two correct WebGPU render forms:
- **`SpriteNodeMaterial` + `positionNode = positionBuffer.toAttribute()`** (the in-source canonical example, `three.webgpu.js:17377`, `28424`). `SpriteNodeMaterial` (class `three.webgpu.js:28385`) honors size via `scaleNode`/`sizeNode`.
- **Instanced billboard quad (the repo's proven pattern)** — `InstancedBufferGeometry` of a unit quad + `MeshBasicNodeMaterial` whose `vertexNode` builds clip-space billboard corners. Read the live position per instance via `positionBuffer.toAttribute()` (per-vertex) OR `storage(...).element(instanceIndex)`. This mirrors `src/webgl/materials/particleNodeMaterial.ts:107-183` exactly — same uniforms (`uPixelRatio`, `uViewport`), same `Discard(alpha.lessThan(...))`, same `AdditiveBlending` / `depthWrite=false` / `depthTest=false` / `toneMapped=false`.

TSL node names verified present (used by the existing material, all exported from `three/tsl` `654` block): `Fn`, `uniform`, `attribute`, `positionLocal`, `modelViewMatrix`, `cameraProjectionMatrix`, `sin`, `cos`, `smoothstep`, `length`, `fract`, `max`, `min`, `mix`, `float`, `vec3`, `vec4`, `Discard`, `varying`, `exp`, `clamp`. From `three/webgpu`: `Color`, `Vector2`, `Vector3`, `AdditiveBlending`, `DoubleSide`, `MeshBasicNodeMaterial`, `SpriteNodeMaterial`, `PointsNodeMaterial`, `HalfFloatType`, `FloatType`, `NoBlending`, `LinearFilter`, `ClampToEdgeWrapping`, `RenderTarget`, `Scene`, `OrthographicCamera`, `Mesh`, `PlaneGeometry`.

**Color by velocity magnitude + additive HDR**: in the fragment, `col = mix(COL_COLD_violet, COL_HOT_cyan, clamp(velMag * k, 0, 1))` where `velMag` is interpolated from the vertex stage via `varying(length(velAttr))`. Multiply emissive >1.0 (e.g. `col.mul(1.6)`) and set `toneMapped = false` so the existing single Bloom (selective-bloom contract, PRD §"Renderer reality") blooms it.

### 1.6 Putting 1.1–1.5 together (Option A loop)

```js
// once: build positionBuffer/velocityBuffer/homeBuffer (1.3), simulate kernel (1.2)
useFrame(() => {
  uDelta.value = Math.min(delta, 1/30);
  uTime.value += delta;
  uMouse.value.copy(modelSpaceMouse);    // §4
  renderer.compute(simulate);            // gl from useThree(s => s.gl)
  // render happens normally; render material's positionNode = positionBuffer.toAttribute()
});
```

---

## 2. WebGL2 fallback path (flag OFF) — `GPUComputationRenderer`

**Present and WebGL-compatible**: `node_modules/three/examples/jsm/misc/GPUComputationRenderer.js`. `@three_import import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';` (header `GPUComputationRenderer.js:101`). The repo already imports `three/examples/jsm/*` specifiers (`src/webgl/geometry/sersanMark.ts:35`), so use `three/examples/jsm/misc/GPUComputationRenderer.js`.

### 2.1 API (verified line refs)

| Method | Line | Notes |
|---|---|---|
| `new GPUComputationRenderer(sizeX, sizeY, renderer)` | `GPUComputationRenderer.js:113` | `renderer` is the classic `WebGLRenderer` from `useThree(s => s.gl)`. Problem is 2D: `sizeX*sizeY` elements → for 256² use `(256, 256, gl)`. |
| `createTexture()` | `:424` | returns a `DataTexture(Float32Array, sizeX, sizeY, RGBAFormat, FloatType)` (`:427`). Fill `.image.data` with seed values. |
| `addVariable(name, computeFragmentShader, initialValueTexture)` | `:150` | `name` becomes the GLSL sampler uniform (e.g. `"texturePosition"`). |
| `setVariableDependencies(variable, [deps])` | `:178` | wire which textures each pass samples. |
| `setDataType(FloatType | HalfFloatType)` | `:135` | default `FloatType` (`:119`). Drop to `HalfFloatType` if `EXT_color_buffer_float` is unavailable but half-float RTs render. |
| `init()` | `:189` | returns `null` on success, or an error string. Checks `renderer.capabilities.maxVertexTextures === 0` → `'No support for vertex shader textures.'` (`:191-193`). |
| `compute()` | `:260` | call once per frame, before scene render. |
| `getCurrentRenderTarget(variable)` | `:299` | `.texture` is the freshly-written field — feed into the points material uniform. |
| `getAlternateRenderTarget(variable)` | `:311` | the other ping-pong target. |
| `createShaderMaterial(fragShader, uniforms)` | `:381` | helper for custom passes. |
| `dispose()` | `:321` | free RTs/materials. |

### 2.2 Float-RT requirement + detect/fallback

- RTs are created `RGBAFormat` + `FloatType` (`:410`, `:427`). **Float-color-render requires `EXT_color_buffer_float`** on WebGL2. `init()` does NOT itself check that extension (it only checks vertex-texture support `:191`); the render-target completeness fails silently if the extension is missing.
- **Detect before constructing**: `gl.getContext().getExtension('EXT_color_buffer_float')` (gl = `useThree(s=>s.gl)`; `gl.getContext()` returns the raw WebGL2 context). Pseudocode:
  ```js
  const ctx = gl.getContext();
  const floatOK = !!ctx.getExtension("EXT_color_buffer_float");
  const halfOK  = !!ctx.getExtension("EXT_color_buffer_half_float");
  if (!floatOK && halfOK) gpuCompute.setDataType(THREE.HalfFloatType);
  if (!floatOK && !halfOK) /* graceful fallback → static logo, no crash (PRD constraint) */;
  ```
- Belt-and-braces: also check `gpuCompute.init()` returns `null` (else `console.error` and fall back to the static mark).

### 2.3 GLSL sim shaders (position + velocity passes) — skeleton

```glsl
// --- velocity pass (textureVelocity) ---
uniform float uDelta, uTime;
uniform vec3  uMouse;      // model-space mouse
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;       // 'resolution' injected by GPUComputationRenderer
  vec3 pos  = texture2D(texturePosition, uv).xyz;
  vec3 vel  = texture2D(textureVelocity, uv).xyz;
  vec3 home = texture2D(textureHome, uv).xyz;       // a 3rd (static) variable or a const sampler
  vel += (home - pos) * 26.0 * uDelta;              // spring
  vec3 away = pos - uMouse; float d = max(length(away), 1e-4);
  float push = max(0.0, 0.52 - d) / 0.52;
  vel += normalize(away) * push*push * 42.0 * uDelta; // repulsion
  vel += turbulence(pos*1.3 + uTime*0.15) * (0.35 + min(length(home-pos),1.0)*1.2) * uDelta;
  vel *= exp(-4.5 * uDelta);                        // damping
  float sp = length(vel); vel *= min(sp, 4.0) / max(sp, 1e-4); // clamp
  gl_FragColor = vec4(vel, 1.0);
}
// --- position pass (texturePosition) ---
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(pos + vel * uDelta, 1.0);
}
```
`resolution` is auto-injected by `GPUComputationRenderer` (it prefixes `#define resolution vec2(sizeX, sizeY)`-style). The home positions go in a third variable (static, no compute) or a plain DataTexture uniform.

### 2.4 GLSL points/billboard render material (vertex texture lookup via a `ref` attribute)

Each particle carries a `ref` (vec2 grid UV). Vertex shader looks up its live position from `texturePosition`:
```glsl
attribute vec2 aRef;            // (i%N + .5)/N , (floor(i/N)+.5)/N  — the grid cell
uniform sampler2D uPosTex;
uniform sampler2D uVelTex;
varying float vSpeed;
void main() {
  vec3 p = texture2D(uPosTex, aRef).xyz;
  vSpeed = length(texture2D(uVelTex, aRef).xyz);
  // billboard the unit-quad corner (instanced-billboard, same as DriftParticles GLSL path)
  …
}
```
Use the existing GLSL instanced-billboard material (`src/webgl/materials/particleSpriteShader.ts`) as the base and add the two texture lookups. On the OFF path `THREE.Points` with `gl_PointSize` IS allowed (no 1px clamp on classic WebGLRenderer) — but to keep ONE render path across backends, prefer the instanced billboard here too.

> **Note for the ON path:** `GPUComputationRenderer` is **WebGL-only** — it internally uses `WebGLRenderer`-specific RTT and will not run on the WebGPU sub-backend (PRD §"Renderer reality" already calls this out). Do NOT use it on the flag-ON path; use Option A or B (§1 / §5).

---

## 3. MeshSurfaceSampler — seeding home positions

**Already proven in this repo** (`src/webgl/geometry/sersanMark.ts:35-156`).

- Import: `import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";` (`MeshSurfaceSampler.js` present; `sersanMark.ts:35`). `@three_import` header maps it to `three/addons/math/MeshSurfaceSampler.js` (same physical file).
- API:
  - `new MeshSurfaceSampler(mesh)` — needs a `THREE.Mesh` whose geometry has a `position` attribute (the normalized GLB mesh from `HeroLogo`). A throwaway material is fine (`sersanMark.ts:135`).
  - `.setWeightAttribute(name)` (optional, area weighting), `.build()` — must call before sampling (`sersanMark.ts:136`).
  - `.sample(targetVector3, targetNormalVector3?, targetColor?, targetUV?)` — writes a uniform-area surface point (and normal if passed). Used at `sersanMark.ts:147`.
- Seed N×N into a Float32Array (for SIZE=256 → 65,536 points), to feed `instancedArray(home,'vec3')` (§1.3) or the position DataTexture (§2.1):
  ```js
  const N = SIZE; const count = N * N;
  const mesh = new THREE.Mesh(bodyGeometry);
  const sampler = new MeshSurfaceSampler(mesh).build();
  const home = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p);
    home[i*3] = p.x; home[i*3+1] = p.y; home[i*3+2] = p.z;
  }
  ```
  The grid `ref` for the WebGL2 path is `aRef[i] = [ (i%N + .5)/N, (Math.floor(i/N) + .5)/N ]`.

---

## 4. Mouse → model space

**Recommend the CPU inverse-matrix option (cheapest correct).** Repulsion must follow the model as it rotates (drag), so the mouse must be expressed in the model's LOCAL space.

- **Cheapest correct (recommended): raycast a plane through the model center facing the camera (CPU), then `worldToLocal`.** R3F gives you everything via `useThree`:
  ```js
  const { camera, raycaster } = useThree();
  const planeN = new THREE.Vector3(), worldHit = new THREE.Vector3();
  const plane = new THREE.Plane();
  // per frame:
  const center = group.getWorldPosition(new THREE.Vector3());   // model anchor
  camera.getWorldDirection(planeN);
  plane.setFromNormalAndCoplanarPoint(planeN, center);
  // pointerStore.smooth is clip [0..1] top-left → NDC:
  const ndc = new THREE.Vector2(smooth.x*2 - 1, -(smooth.y*2 - 1));
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(plane, worldHit);
  assembly.worldToLocal(worldHit);   // → MODEL-SPACE mouse → uMouse.value (§1.2 / §2.3)
  ```
  `worldToLocal` walks the parent matrices (it accounts for the spin/tilt/drag rotation), so repulsion stays glued to the geometry as it turns. This is a handful of vec ops per frame — negligible.
- **Simpler-but-equivalent**: keep the world-space ray hit and instead transform it by `assembly.matrixWorld.clone().invert()` applied to the point. `worldToLocal` already does exactly this, so prefer `worldToLocal`.
- **On `pointerenter`/`leave`**: the PRD requires pushing the mouse "to infinity" on leave so repulsion vanishes. Set `uMouse.value.set(1e9,1e9,1e9)` when `usePointerStore.getState().active` is false OR `useHeroDragStore.getState().hovering` is false (the hero-drag-layer already tracks hover, `heroDragStore.ts:33`). Pointer source is the existing `usePointerStore` smooth value (`pointerStore.ts:35-38`) — no canvas events; the canvas stays `pointer-events:none` (PRD §5).

---

## 5. Dual-backend strategy + HeroLogo reuse — honest risk read

### 5.1 Keep ONE component, pick engine by `webgpuEnabled()`

Mirror the established dual-material discipline (`src/webgl/HeroLogo.tsx:160-231`, `DriftParticles.tsx:73-118`):
- `webgpuEnabled()` (`src/webgl/renderer/createRenderer.ts:48`) is a build-time-inlined boolean.
- **OFF path**: synchronous — construct the GLSL FBO rig (`useFBO` or `GPUComputationRenderer`) + GLSL billboard material. NEVER import `three/webgpu`/`three/tsl`.
- **ON path**: `useEffect` lazy `import("./gpgpuNodeSim")` (the module that statically imports `three/webgpu` + `three/tsl`) — exactly like `HeroLogo.tsx:185` lazy-imports `logoNodeMaterial`. Keeps the heavy second-three build out of the OFF bundle (the dual-namespace pitfall, `particleNodeMaterial.ts:22-25`, `createRenderer.ts:20-26`).

### 5.2 Reuse the HeroLogo shell verbatim

Keep ALL of `HeroLogo.tsx`'s integration shell and swap only the particle engine:
- GLB load + normalize to ~2 units (`HeroLogo.tsx:99-135`), `MARK_GLB = "/models/sersan-mark.glb"`.
- `heroReady` announce on first frame + reset on unmount (`HeroLogo.tsx:252-255`, `234-240`).
- Screen anchoring across the sticky pin, `fade = 1 - smoothstep(hp, 0.74, 0.97)`, `group.visible` (`HeroLogo.tsx:264-283`).
- Idle spin + drag yaw inertia + pitch spring + delta clamp (`HeroLogo.tsx:285-298`, `250`).
- Scroll fade, tier gating (`HeroLogo.tsx:270-272`; tier from props, `off` tier → no GPGPU).
- Feed `uFade`/`uPixelRatio`/`uViewport` to the render material like the current particle uniforms (`HeroLogo.tsx:313-324`).
- The solid mesh is NOT drawn — it only feeds `MeshSurfaceSampler` (PRD §"Goal"; mesh stays unrendered).

### 5.3 Honest risk + recommendation

| Concern | Verdict |
|---|---|
| **Is full WebGPU-compute (Option A) viable in three 0.184 + R3F 9.6?** | **Yes, technically.** All APIs exist and are stable (`instancedArray`/`Fn().compute()`/`renderer.compute()`/`.element()`/`.toAttribute()` all verified). R3F 9.6 awaits `renderer.init()` so the backend is ready before `useFrame` (`createRenderer.ts:92`). |
| **The real risk** | Storage buffers + compute run ONLY on the **WebGPU sub-backend** of `WebGPURenderer`. When `WebGPURenderer` falls back to its **WebGL2 sub-backend** (no `navigator.gpu`, or `forceWebGL`, `createRenderer.ts:77-78,104`), compute/storage are NOT available — the WGSL compute path silently does nothing. So Option A needs its OWN fallback even WITHIN the flag-ON build. This is the maintenance trap. |
| **FBO-via-`gl.setRenderTarget` (Option B)** | **Proven in this exact renderer** (`PointerFlowmap.ts:18-23`: `Renderer.render()` is synchronous on BOTH WebGPU and WebGL2 sub-backends). The TSL sim material compiles to WGSL or GLSL automatically. So Option B works across the whole flag-ON build with NO sub-backend special-case — one path, both sub-backends. |
| **Recommendation** | **Ship Option B (FBO ping-pong + TSL `NodeMaterial` sim) for flag ON.** Then flag OFF is the same FBO technique in GLSL. You maintain ONE TSL sim shader + ONE GLSL sim shader, the render side is the proven instanced-billboard material on both, and there is NO third "WebGL2-sub-backend-of-WebGPU" special case. Lowest risk, hits 60fps, degrades cleanly. Pursue Option A (true compute) only later, with its own sub-backend guard, if profiling shows the FBO path is a bottleneck (it won't be at 65k). |

> Option B's ping-pong on the WebGPU path: encode position in RGB of a float/half-float `RenderTarget` (NxN), velocity in a second target, advance with `gl.setRenderTarget(write); gl.render(quad, orthoCam); gl.setRenderTarget(null)` then swap (exact pattern: `PointerFlowmap.ts:200-201, 264-325`). The render material samples the position target via `texture(posRT.texture, refUV)` and repoints `.value` to the freshly-written target each frame (`PointerFlowmap.ts:319`). Use `HalfFloatType` for the velocity RT and `FloatType` for position (precision matters for accumulation); both supported (`PointerFlowmap.ts:191` uses `HalfFloatType`).

---

## 6. Perf / limits — FLAGGED PROMINENTLY

### 6.1 ⚠️ THREE.Points 1px clamp on WebGPU — USE INSTANCED BILLBOARDS

**This is the single most important rendering decision.** Confirmed in three source:
- `PointsNodeMaterial` docblock: *"Since WebGPU only supports point primitives with a pixel size of 1, it's not possible to define a size"* (`three.webgpu.js:28561-28563`).
- `sizeNode` docblock: *"WebGPU only supports point primitives with 1 pixel size … this node has no effect when the material is used with Points and a WebGPU backend. If an application wants to render points with a size larger than 1 pixel, the material should be used with Sprite and instancing."* (`three.webgpu.js:28597-28605`).
- `PointUVNode` docblock: *"In WebGPU, point primitives always have the size of one pixel"* (`three.webgpu.js:38362-38367`).
- GLSLNodeBuilder emits literal `gl_PointSize = 1.0;` for points (`three.webgpu.js:64105`).
- The repo already hit and documented this exact limit for `DriftParticles` (`src/webgl/DriftParticles.tsx:8-19`, `particleNodeMaterial.ts:5-12`).

**→ On the WebGPU (flag-ON) render path, the primitive MUST be instanced billboard quads (InstancedBufferGeometry + clip-space billboard vertexNode), or `SpriteNodeMaterial`/`Sprite`-instancing — NOT `new THREE.Points`.** Use the exact `particleNodeMaterial.ts` billboard math (`particleNodeMaterial.ts:124-144`). On flag-OFF (classic WebGLRenderer) `THREE.Points` + `gl_PointSize` is allowed, but to keep one render path, use instanced billboards on both.

### 6.2 Fillrate / overdraw at 256² = 65,536 particles, additive

- 65k additive billboards = heavy overdraw if `POINT_SIZE` (PRD default 7px) is large or particles overlap (they overlap most when reformed into the dense mark). Mitigate: keep `POINT_SIZE` modest, `Discard(alpha < ~0.004)` early (already in `particleNodeMaterial.ts:167`), and rely on `depthWrite=false` + `AdditiveBlending` (no depth sort cost).
- The sim compute/FBO at 65k is cheap; **the fragment fillrate of additive sprites is the bottleneck**, not the sim. Tier down SIZE (e.g. `lite → 128² = 16,384`) per `useTierStore` (`tierStore.ts:14`: `full`/`lite`/`off`).

### 6.3 devicePixelRatio cap + tier scaling + resize

- Cap dpr at 2 (PRD §5). Read `gl.getPixelRatio()` and clamp; the billboard size math already uses `uPixelRatio`+`uViewport` in device pixels (`particleNodeMaterial.ts:140-142`, `HeroLogo.tsx:317-323`).
- SIZE per tier: `full=256`, `lite≈128`, `off → no GPGPU` (static mark or nothing — PRD constraint, `tierStore` `off` tier).
- On resize, only the billboard `uViewport` changes (the sim buffers/RTs are NxN, resolution-independent) — no RT resize needed for the sim, unlike the flowmap.
- `prefers-reduced-motion` → `detectTier()` returns `off` (`tierStore.ts:30`) → component not mounted → no crash, no GPGPU.

---

## Files Found (repo)

| File Path | Description |
|---|---|
| `src/webgl/HeroLogo.tsx` | The shell to reuse: GLB load/normalize, heroReady, anchoring, drag/inertia/pitch-spring, fade, tier gating, dual-material lazy-import discipline. |
| `src/webgl/geometry/sersanMark.ts` | Proven `MeshSurfaceSampler` usage (`:35-156`) + shared dissolve noise. |
| `src/webgl/fluid/PointerFlowmap.ts` | **Proof** `gl.setRenderTarget` ping-pong works on `WebGPURenderer` (both sub-backends); the Option-B blueprint. |
| `src/webgl/materials/particleNodeMaterial.ts` | TSL instanced-billboard material (the WebGPU render path to mirror); documents the 1px points limit. |
| `src/webgl/materials/particleSpriteShader.ts` | GLSL instanced-billboard twin (flag-OFF render path base). |
| `src/webgl/DriftParticles.tsx` | The dual-backend (GLSL/TSL lazy) component pattern + the 1px-points rationale. |
| `src/webgl/renderer/createRenderer.ts` | `webgpuEnabled()` (`:48`), `forceWebGLFlag()` (`:57`), `backendOf()` (`:117`); R3F async `gl` factory awaits `init()`. |
| `src/webgl/store/pointerStore.ts` | Mouse source (`smooth` clip-space top-left, `vel`); no canvas events. |
| `src/webgl/store/heroDragStore.ts` | `hovering`/`dragging` (drive dissolve + mouse-to-infinity on leave). |
| `src/webgl/store/tierStore.ts` | `full`/`lite`/`off` tier + `setHeroReady`; `off` under reduced-motion. |
| `src/webgl/store/fxStore.ts` | Existing tunable store (`heroScale`, `particleOpacity`) to surface the PRD params. |
| `node_modules/three/examples/jsm/misc/GPUComputationRenderer.js` | WebGL2-only GPGPU helper (flag-OFF option). |
| `node_modules/three/examples/jsm/math/MeshSurfaceSampler.js` | Surface sampler. |
| `node_modules/three/build/three.webgpu.js` | The `three/webgpu` build — all compute/storage/material line refs above. |
| `node_modules/three/build/three.tsl.js` | The `three/tsl` build — export block at `:654`. |

## Caveats / Not Found

- **No `curlNoise` export** in `three/tsl` — only `mx_noise_*`, `mx_fractal_noise_*`, `mx_worley_*`, `mx_cell_noise_float`, `triNoise3D`, `hash`, `range`. True curl must be hand-built; recommend `mx_noise_vec3` jitter instead (cheaper, looks the same here).
- **`GPUComputationRenderer` is WebGL-only** — confirmed it does NOT run on the WebGPU sub-backend; use only on flag-OFF (or as the OFF-path engine).
- **`instancedArray`/`storage`/compute run only on the WebGPU sub-backend of `WebGPURenderer`** — they silently no-op on the WebGL2 fallback sub-backend (the §5.3 risk). This is the reason Option B is recommended over Option A for flag ON.
- `EXT_color_buffer_float` is required for `GPUComputationRenderer`'s default `FloatType` RTs on WebGL2; `init()` does NOT check it (only `maxVertexTextures`). Detect via `gl.getContext().getExtension('EXT_color_buffer_float')` and fall back to `HalfFloatType` or a static mark.
- Did not run a build/`tsc` (research only). All API line refs are from the installed bundled builds; the `.d.ts` typings (`@types/three ^0.184.1`) match these (the repo already type-checks against `instancedArray`/`Fn`/`compute` via `three/tsl`).
- `particleDissolve.html` (repo root) is empty (0 bytes), per PRD — no vanilla reference to mine.

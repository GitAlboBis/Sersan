# three.js r184 TSL compute API — attractors port research

Researched 2026-06-13 against the INSTALLED packages (verified in source, not docs-from-memory):

- `three` **0.184.0**, `@types/three` 0.184.1 (`package.json`)
- `@react-three/fiber` **9.6.1**, `@react-three/drei` 10.7.7, Next 16.2.6, React 19.2.4
- Example source fetched from the **r184 tag**: `examples/webgpu_tsl_compute_attractors_particles.html`
- three internals read from `node_modules/three/src/...` (paths below)

**Headline: the repo ALREADY ships a working r184 TSL compute + storage-buffer particle sim** —
`createGpgpuComputeNodeSim` (`src/webgl/gpgpu/gpgpuNodeSim.ts:794`) and the 4-target morph twin
`createGpgpuMorphComputeNodeSim` (same file, ~line 1500+). The attractors port is an *extension of
an existing, proven pattern in this codebase*, not a greenfield integration. Every plumbing
question below has an in-repo reference implementation.

---

## 1. Anatomy of `webgpu_tsl_compute_attractors_particles` (r184)

Full example verified from the r184 tag. The relevant skeleton, annotated:

### Imports

```js
import * as THREE from 'three/webgpu';
import { float, If, PI, color, cos, instanceIndex, Loop, mix, mod, sin,
         instancedArray, Fn, uint, uniform, uniformArray, hash, vec3, vec4 } from 'three/tsl';
```

### Attractor uniforms — `uniformArray` + dynamic-length `Loop`

```js
const attractorsPositions = uniformArray([
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(1, 0, -0.5),
  new THREE.Vector3(0, 0.5, 1),
]);
const attractorsRotationAxes = uniformArray([
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(1, 0, -0.5).normalize(),
]);
const attractorsLength = uniform(attractorsPositions.array.length, 'uint');
```

CPU-side animation of attractors = mutate the `Vector3`s inside `attractorsPositions.array[i]`
in place each frame (the example does it from TransformControls `change`); `uniformArray`
re-uploads automatically. `attractorsLength` as a `'uint'` uniform lets `Loop(attractorsLength, ...)`
iterate a runtime-variable count.

### Buffers + scalar uniforms

```js
const count = Math.pow(2, 18);                       // 262 144
const attractorMass      = uniform(Number(`1e${7}`));
const particleGlobalMass = uniform(Number(`1e${4}`));
const timeScale          = uniform(1);
const spinningStrength   = uniform(2.75);
const maxSpeed           = uniform(8);
const gravityConstant    = 6.67e-11;                 // plain JS const, baked
const velocityDamping    = uniform(0.1);
const scale              = uniform(0.008);
const boundHalfExtent    = uniform(8);
const colorA = uniform(color('#5900ff'));
const colorB = uniform(color('#ffa575'));

const positionBuffer = instancedArray(count, 'vec3');
const velocityBuffer = instancedArray(count, 'vec3');
```

### Init/reset kernel (one-shot)

```js
const init = Fn(() => {
  const position = positionBuffer.element(instanceIndex);
  const velocity = velocityBuffer.element(instanceIndex);

  const basePosition = vec3(
    hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
    hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
    hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
  ).sub(0.5).mul(vec3(5, 0.2, 5));
  position.assign(basePosition);

  const phi   = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI).mul(2);
  const theta = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI);
  velocity.assign(sphericalToVec3(phi, theta).mul(0.05));
});
const initCompute = init().compute(count);

const reset = () => { renderer.compute(initCompute); };
reset();   // seeded once at startup; GUI re-triggers it on demand
```

NOTE for determinism (§5): the example salts `hash()` with `Math.random()` *captured at
graph-build time* — the salt is baked into the shader once, so repeated `reset()` calls in one
session are already deterministic. For cross-session determinism replace the salts with fixed
uints or a seed `uniform`.

### Update kernel — attractor force, spin, damping, velocity clamp, bounds wrap

```js
const particleMassMultiplier = hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
  .remap(0.25, 1).toVar();
const particleMass = particleMassMultiplier.mul(particleGlobalMass).toVar();

const update = Fn(() => {
  const delta = float(1 / 60).mul(timeScale).toVar();   // FIXED timestep (not real dt!)
  const position = positionBuffer.element(instanceIndex);
  const velocity = velocityBuffer.element(instanceIndex);

  const force = vec3(0).toVar();
  Loop(attractorsLength, ({ i }) => {
    const attractorPosition    = attractorsPositions.element(i);
    const attractorRotationAxis = attractorsRotationAxes.element(i);
    const toAttractor = attractorPosition.sub(position);
    const distance  = toAttractor.length();
    const direction = toAttractor.normalize();

    // gravity ~ G·M·m / d²
    const gravityStrength = attractorMass.mul(particleMass).mul(gravityConstant)
      .div(distance.pow(2)).toVar();
    force.addAssign(direction.mul(gravityStrength));

    // spin: axis × toAttractor, scaled by the same gravity strength
    const spinningForce = attractorRotationAxis.mul(gravityStrength).mul(spinningStrength);
    force.addAssign(spinningForce.cross(toAttractor));
  });

  velocity.addAssign(force.mul(delta));
  const speed = velocity.length();
  If(speed.greaterThan(maxSpeed), () => {            // hard speed clamp
    velocity.assign(velocity.normalize().mul(maxSpeed));
  });
  velocity.mulAssign(velocityDamping.oneMinus());    // multiplicative damping (per step)

  position.addAssign(velocity.mul(delta));

  // toroidal wrap inside ±boundHalfExtent/2
  const halfHalfExtent = boundHalfExtent.div(2).toVar();
  position.assign(mod(position.add(halfHalfExtent), boundHalfExtent).sub(halfHalfExtent));
});
updateCompute = update().compute(count).setName('Update Particles');
```

### SpriteNodeMaterial wiring (render side)

```js
const material = new THREE.SpriteNodeMaterial({ blending: THREE.AdditiveBlending, depthWrite: false });

material.positionNode = positionBuffer.toAttribute();     // storage → per-instance attribute

material.colorNode = Fn(() => {
  const velocity = velocityBuffer.toAttribute();
  const speed = velocity.length();
  const colorMix = speed.div(maxSpeed).smoothstep(0, 0.5);
  return vec4(mix(colorA, colorB, colorMix), 1);
})();

material.scaleNode = particleMassMultiplier.mul(scale);

const geometry = new THREE.PlaneGeometry(1, 1);
const mesh = new THREE.InstancedMesh(geometry, material, count);
scene.add(mesh);
```

### Frame loop

```js
async function animate() {
  controls.update();
  renderer.compute(updateCompute);   // synchronous dispatch — renderer was init()'d
  renderer.render(scene, camera);
}
```

---

## 2. `compute()` API surface in r184 (verified in source)

`node_modules/three/src/nodes/gpgpu/ComputeNode.js`:

```js
// .compute(count, workgroupSize?) — method-chained onto any Fn() call result
export const compute = (node, count, workgroupSize) => {
  const computeNode = computeKernel(node, workgroupSize);  // workgroupSize default [64], padded to [x,1,1]
  if (typeof count === 'number') computeNode.count = count;
  else computeNode.dispatchSize = count;                   // [x,y,z] array form
  return computeNode;
};
addMethodChaining('compute', compute);
```

- `count` becomes an internal `uint` uniform used for an early-return guard
  (`if (instanceIndex >= count) return;`) when the backend allows early returns — so non-multiple-
  of-64 counts are safe.
- `.setName('...')` works on the ComputeNode (shows in the inspector).

`node_modules/three/src/renderers/common/Renderer.js`:

- `compute(computeNodes, dispatchSize = null)` (line 2688) — **synchronous**; throws if the arg
  isn't a ComputeNode; if the renderer is **not initialized** it `warn()`s and delegates to
  `computeAsync` (returning a Promise). Accepts a single node or an **array of nodes** (one
  `beginCompute/finishCompute` bracket around all of them).
- `computeAsync(computeNodes, dispatchSize)` (line 2800) — literally `await this.init(); this.compute(...)`.
  It is NOT deprecated in r184 source (no warnOnce), but it exists only to cover the pre-init
  window. **In this repo the gl factory already `await renderer.init()`s before R3F mounts anything
  (`createRenderer.ts:92`), so `gl.compute(node)` in `useFrame` is always the right call** — this
  is exactly what the existing sims do (`gpgpuNodeSim.ts:1004,1407,1807`).

`node_modules/three/src/nodes/accessors/Arrays.js`:

```js
export const instancedArray = (count /* number | TypedArray */, type = 'float') => {
  const itemSize = getLengthFromType(type);                 // 'vec3' → 3, 'float' → 1, struct ok
  const typedArray = getTypedArrayFromType(type);
  const buffer = new StorageInstancedBufferAttribute(count, itemSize, typedArray);
  return storage(buffer, type, buffer.count);
};
```

**Passing a TypedArray seeds the buffer** — `StorageInstancedBufferAttribute` adopts it as the
backing array. The repo uses this for CPU-computed home fields:
`instancedArray(aHome.slice(), "vec3")` (`gpgpuNodeSim.ts:860-862`). Pass a `.slice()` per buffer
when two buffers must not share one array (live position vs immutable home).

---

## 3. R3F integration at fiber 9.6.1 (how THIS repo does it — follow it)

- **Renderer creation**: `<Canvas gl={createWebGPURenderer}>` — R3F 9.6's async `gl` factory.
  `createWebGPURenderer` (`src/webgl/renderer/createRenderer.ts:73`) dynamically imports
  `three/webgpu`, constructs `WebGPURenderer({ alpha, antialias:false, powerPreference, forceWebGL })`,
  **awaits `renderer.init()`**, retries once with `forceWebGL:true` on failure. Gated by
  `webgpuEnabled()` (`NEXT_PUBLIC_WEBGPU`). `frameloop="always"` (`src/webgl/Scene.tsx:219`).
- **Backend detection**: `backendOf(renderer)` (`createRenderer.ts:117`) — `backend.isWebGLBackend === false`
  → "webgpu". CRITICAL pitfall already documented in HeroLogo.tsx:409: the WebGPU backend leaves
  `isWebGLBackend` **undefined** (only WebGLBackend sets `true`), so test `bk.isWebGLBackend !== true`,
  never `=== false`. The shipped gate (`HeroLogo.tsx:413-417`):

  ```ts
  const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } }).backend;
  const hasCompute = typeof (gl as unknown as { compute?: unknown }).compute === "function";
  const isWebGPUBackend = !!bk && bk.isWebGLBackend !== true && hasCompute;
  ```

- **Where the per-frame dispatch lives**: inside the component's **default-priority (0) `useFrame`**.
  HeroLogo's `useFrame` (line 826) updates uniforms then calls `rig.tick(...)` →
  `gl.compute(simulate)` (`gpgpuNodeSim.ts:999-1005`). Render ordering is safe because the
  **single render authority is `PostFXNodes`' `useFrame(..., 1)`** (`PostFXNodes.tsx:354-387`):
  any positive priority suppresses R3F's default render, and priority-0 callbacks (Lenis pump in
  `FrameDriver`, sims, camera writes) all run before the priority-1 `post.render()`. So:
  **dispatch compute at priority 0, never in a second rAF; no priority needed beyond default.**
  Clamp delta (`Math.min(rawDelta, 1/30)`, HeroLogo.tsx:834) before feeding `uDelta` — tab-refocus
  deltas explode springs.
- **Lazy import discipline**: build the sim in a `useEffect` via
  `Promise.all([import("three/webgpu"), import("three/tsl"), import("./simModule")])` and pass the
  namespaces in (HeroLogo.tsx:400-404). Never import `three/webgpu` statically — the OFF bundle
  must not contain the node build (two self-contained three builds must never coexist).
- **Existing compute usages to crib from**: `gpgpuNodeSim.ts` —
  `createGpgpuComputeNodeSim` (line 794, spring/mouse/turbulence kernel),
  `createGpgpuMorphComputeNodeSim` (~1500, 4 morph targets + stagger + entry-assemble),
  both `Fn(...)().compute(count)` + `gl.compute(simulate)` per tick.

---

## 4. WebGL2 fallback: what `compute()` actually does on the WebGLBackend

Verified in `node_modules/three/src/renderers/webgl-fallback/WebGLBackend.js:847-950`:

- `compute()` **IS emulated** — NOT a no-op and NOT an exception. Mechanism: **transform feedback**.
  `beginCompute` binds the null framebuffer; `compute()` enables `RASTERIZER_DISCARD`, binds a VAO
  over the storage attributes, runs the kernel as a **vertex shader over `gl.POINTS`**
  (`drawArraysInstanced(POINTS, 0, 1, count)` for instanced storage), captures writes via
  `beginTransformFeedback(POINTS)`, then **ping-pongs**: each storage buffer is a dual-buffer pair
  (`dualAttributeData.switchBuffers()` after every dispatch); if a buffer was flagged PBO it also
  copies the result into a texture (`copyBufferToTexture`) so non-self reads can be emulated by
  texture sampling.
- Hard limits of the emulation (in source): `dispatchSize` arrays and indirect dispatch are
  rejected with a warning (count must be a single number); atomics/workgroup shared memory don't
  exist; and — the killer for our kernels — **arbitrary dynamic indexing of a storage buffer
  (`buffer.element(i)` for `i !== instanceIndex`) is broken** unless the node is routed through the
  PBO texture path. `StorageArrayElementNode.generate()`
  (`src/nodes/utils/StorageArrayElementNode.js`) confirms: when `builder.isAvailable('storageBuffer') === false`,
  a read only goes through `generatePBO` if `node.isPBO === true` (opt-in via
  `storageNode.setPBO(true)`), and **assignments always collapse to the transform-feedback
  own-element write**. This is the repo-documented three issue **#31221**
  (`gpgpuNodeSim.ts:789-793`).
- **Tier-gating decision (confirmed)**: keep the compute path **only on the true WebGPU backend**,
  exactly as the shipped gate does (§3). On the WebGL2 fallback (and the classic flag-OFF
  WebGLRenderer) route to the analytic `particles-static` build / FBO rig. Do not try
  `setPBO(true)` rescue — the existing code explicitly chose not to, and the attractor kernel only
  needs own-element access anyway, but the gate keeps behavior uniform and avoids the dual-buffer
  semantics divergence.

---

## 5. Storage-buffer reads in the render material (the RT-LOD bypass)

This is what sidesteps the "WebGPU vertex-stage RT read needs explicit LOD" problem from the
memory note — **no texture is sampled at all**; positions go storage-buffer → vertex stage:

Two equivalent wirings, both already proven:

1. **`buffer.toAttribute()`** (official example, SpriteNodeMaterial):
   `material.positionNode = positionBuffer.toAttribute()`. Internally
   (`StorageBufferNode.getAttributeData`, src line ~300) this wraps the SAME
   `StorageInstancedBufferAttribute` in `bufferAttribute(this.value)` + a varying — the GPU buffer
   written by compute is bound as a per-instance **vertex attribute** at render. Use with
   `SpriteNodeMaterial` (positionNode/scaleNode/colorNode do the billboard math for you) +
   `InstancedMesh(new PlaneGeometry(1,1), material, count)`. Fragment-stage reads
   (`velocityBuffer.toAttribute()` inside `colorNode`) get the varying automatically.
2. **`buffer.element(instanceIndex)` inside `material.vertexNode`** (repo pattern,
   `gpgpuNodeSim.ts:948-965`): a true storage read in the vertex stage — sampler-free, no LOD, no
   texture. The repo prefers this with a hand-rolled `MeshBasicNodeMaterial` billboard
   (`InstancedBufferGeometry` + quad corners + clip-space point sizing in device px) because it
   gives exact parity with the GLSL twins. WebGPU-only (see §4).

For the attractors port: either works on the gated WebGPU path. If the port keeps the repo's
billboard/point-size conventions (px-accurate sizes, `uViewport`/`uPixelRatio` uniforms, Discard
on tiny alpha), reuse pattern 2; if it adopts the example's look, pattern 1 is less code.

---

## 6. Deterministic re-seed (route re-entry, morph replay)

Options, in order of preference for this codebase:

1. **Seed via the backing TypedArray at build time** (current repo approach): positions/homes are
   CPU-generated `Float32Array`s passed straight into `instancedArray(arr.slice(), 'vec3')`;
   velocities zero-init via `instancedArray(count, 'vec3')`. Route re-entry currently re-mounts the
   component → effect re-runs → buffers rebuilt from the same arrays = **deterministic by
   construction**. The morph build even takes `seedPositions?: Float32Array` to start from a
   scatter (`gpgpuNodeSim.ts:1527,1562-1574`).
2. **One-shot reset kernel** (official pattern, cheapest for in-place replay without rebuild):
   build a second `Fn` that re-assigns position/velocity from the home/start buffers (or from
   `hash(instanceIndex)` with **fixed** salts / a `uniform('uint')` seed — NOT `Math.random()` if
   you need cross-run determinism), `.compute(count)` it once, and call `gl.compute(resetCompute)`
   on demand (route re-entry, replay trigger). Sync call is fine post-init. Example:

   ```ts
   const reset = Fn(() => {
     positionBuffer.element(instanceIndex).assign(homeBuffer.element(instanceIndex));
     velocityBuffer.element(instanceIndex).assign(vec3(0));
   })().compute(count);
   // on demand:
   gl.compute(reset);
   ```

3. **CPU re-upload into a live buffer** — possible in principle via
   `positionBuffer.value.array.set(newData); positionBuffer.value.needsUpdate = true;` (the
   `.value` is the `StorageInstancedBufferAttribute`), but this path is NOT exercised anywhere in
   the repo or the official examples for storage buffers, and on the WebGL fallback the
   dual-buffer ping-pong makes "which buffer gets the upload" ambiguous. Avoid; use (1)/(2).

Repo replay precedent: `HeroTextParticles.tsx:273-285` skips the entrance on route round-trips by
seeding at home and forcing `uAssemble`'s default 1 — i.e., replays are handled by **uniform state
+ rebuild seeding**, not buffer mutation. Follow that.

---

## 7. Velocity→color in TSL + selective-bloom integration

- Example form: `colorNode = vec4(mix(colorA, colorB, speed.div(maxSpeed).smoothstep(0, 0.5)), 1)`
  with `velocityBuffer.toAttribute()` in fragment.
- Repo form (keep this for bloom parity, `gpgpuNodeSim.ts:945-995`): compute
  `vSpeed = length(velocity)` in the **vertex** stage (storage read), pass via `varying`, then in
  fragment: `mix(uColCold, uColHot, clamp(vSpeed * 0.6, 0, 1)) * (1 + vSpeed*0.35) * rand * uEmissive`,
  alpha = radial smoothstep disc × `uPointAlpha` × `uFade`, `Discard(alpha < 0.004)`,
  `toneMapped = false`, AdditiveBlending, `depthWrite:false`.
- **Bloom is NOT layer/MRT-based in this repo.** `PostFXNodes.tsx` (flag-ON post rig) is
  scenePass → `bloom(colorForBloom, intensity, radius, threshold)` (from
  `three/addons/tsl/display/BloomNode.js`) → vignette → tonemap, with **luminance threshold ≈ 1.0**:
  only fragments whose color exceeds 1.0 bloom. The particle material opts in simply by
  multiplying its color by `uEmissive > 1` (config `EMISSIVE`); UI/DOM-range colors stay ≤ 1.0 and
  never bloom (PostFXNodes.tsx header, lines ~40-49). So the attractors material needs **no layer
  setup, no MRT** — just keep the `uEmissive` multiply and `toneMapped=false`, and selective bloom
  works for free. Bloom knobs are per-route via `resolveBloom(pathname)` updating the node's
  uniforms in place (no graph rebuild).

---

## 8. Version-accurate snippet set for the port (r184 + fiber 9.6.1, repo conventions)

```ts
// ---- build (inside useEffect, after Promise.all dynamic imports; gl is the init()'d WebGPURenderer)
const { instancedArray, instanceIndex, uniform, uniformArray, Fn, If, Loop,
        float, vec3, vec4, hash, mix, uint } = tsl;

// buffer decl — seed by TypedArray (deterministic) or by count (zeroed)
const positionBuffer = instancedArray(seedPositions.slice(), "vec3");
const velocityBuffer = instancedArray(count, "vec3");

// attractor plumbing
const attractorsPositions = uniformArray([new Vector3(...), new Vector3(...)]);
const attractorsLength = uniform(attractorsPositions.array.length, "uint");
const uDelta = uniform(1 / 60);
const maxSpeed = uniform(8);
const damping = uniform(0.1);

// update kernel
const simulate = Fn(() => {
  const position = positionBuffer.element(instanceIndex);
  const velocity = velocityBuffer.element(instanceIndex);
  const force = vec3(0).toVar();
  Loop(attractorsLength, ({ i }) => {
    const toAttractor = attractorsPositions.element(i).sub(position);
    const distance = toAttractor.length();
    const strength = /* mass terms */ float(1).div(distance.pow(2)).toVar();
    force.addAssign(toAttractor.normalize().mul(strength));
    // optional spin: force.addAssign(axis.mul(strength).mul(spin).cross(toAttractor));
  });
  velocity.addAssign(force.mul(uDelta));
  If(velocity.length().greaterThan(maxSpeed), () => {
    velocity.assign(velocity.normalize().mul(maxSpeed));
  });
  velocity.mulAssign(damping.oneMinus());
  position.addAssign(velocity.mul(uDelta));
})().compute(count);            // workgroupSize defaults [64,1,1]; count guard auto-injected

// reset kernel (one-shot, deterministic — fixed salts only)
const resetCompute = Fn(() => {
  positionBuffer.element(instanceIndex).assign(homeBuffer.element(instanceIndex));
  velocityBuffer.element(instanceIndex).assign(vec3(0));
})().compute(count);

// material wiring (SpriteNodeMaterial route)
material.positionNode = positionBuffer.toAttribute();
material.colorNode = Fn(() => {
  const speed = velocityBuffer.toAttribute().length();
  return vec4(mix(colorA, colorB, speed.div(maxSpeed).smoothstep(0, 0.5)).mul(uEmissive), 1);
})();

// ---- frame loop (R3F): default-priority useFrame, BEFORE PostFXNodes' priority-1 render
useFrame((_, rawDelta) => {
  uDelta.value = Math.min(rawDelta, 1 / 30);
  gl.compute(simulate);          // synchronous; renderer.init() already awaited by the gl factory
});

// ---- on-demand re-seed (route re-entry / replay)
gl.compute(resetCompute);
```

Gate (must wrap the whole compute build):

```ts
const bk = (gl as { backend?: { isWebGLBackend?: boolean } }).backend;
const useComputePath = !!bk && bk.isWebGLBackend !== true
  && typeof (gl as { compute?: unknown }).compute === "function";
// else → analytic particles-static / FBO build (WebGL2 fallback emulates compute via
// transform feedback but storage .element(i≠instanceIndex) reads are broken — three #31221)
```

## Key file references

- Example (r184 tag): `examples/webgpu_tsl_compute_attractors_particles.html` (not shipped in the
  npm package's `examples/` jsm set — fetched from GitHub)
- `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\gpgpu\gpgpuNodeSim.ts` — compute sims (794, ~1500)
- `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\HeroLogo.tsx` — gate (409-437), tick dispatch (826+, 991-1083)
- `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\renderer\createRenderer.ts` — async gl factory, `backendOf`
- `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\Scene.tsx` — Canvas config, frameloop, PostFX split (178-276)
- `C:\Users\alber\Desktop\sersan-v2-main\src\webgl\PostFXNodes.tsx` — threshold-based selective bloom, priority-1 render
- `node_modules\three\src\nodes\gpgpu\ComputeNode.js` — `compute()`/`computeKernel()` (240-310)
- `node_modules\three\src\nodes\accessors\Arrays.js` — `instancedArray` TypedArray seeding
- `node_modules\three\src\nodes\accessors\StorageBufferNode.js` — `toAttribute()`/`setPBO`
- `node_modules\three\src\nodes\utils\StorageArrayElementNode.js` — WebGL-fallback element-read rules
- `node_modules\three\src\renderers\common\Renderer.js` — `compute` (2688) / `computeAsync` (2800)
- `node_modules\three\src\renderers\webgl-fallback\WebGLBackend.js` — transform-feedback emulation (847-950)

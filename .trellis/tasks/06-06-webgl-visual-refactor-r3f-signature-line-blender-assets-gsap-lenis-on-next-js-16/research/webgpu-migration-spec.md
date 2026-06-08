# Research: WebGPU Migration Spec (WebGPURenderer + automatic WebGL2 fallback)

- **Query**: Produce a version-grounded WebGPU migration spec for this repo (renderer seam F0.5 + TSL bloom), decision already made: adopt WebGPURenderer with automatic WebGL2 fallback.
- **Scope**: mixed (internal code grounding + external/version verification)
- **Date**: 2026-06-08
- **Stack pins (verified against `package.json` + on-disk `node_modules`)**: Next 16.2.6, React 19.2.4, three 0.184.0, @react-three/fiber 9.6.1, @react-three/drei 10.7.7, @react-three/postprocessing 3.0.4, postprocessing 6.39.1, gsap ^3.15, lenis ^1.3.23, zustand 5.0.14, Tailwind 4.

> **Verification method.** The MCP web-search tools (exa / Context7) were not exposed as callable functions in this session. Instead every API claim below was verified against the **actually installed package files on disk** in this repo's `node_modules` — which is the single most authoritative source for OUR exact pins (it is the code that will ship). Each claim cites the file + line it was read from. Where an upstream URL is the canonical doc it is named, but the on-disk read is the ground truth used here.

---

## 0. Current code map (where renderer / composer / raw-GLSL live today)

| Concern | File | What is created there |
|---|---|---|
| Renderer creation | `src/webgl/Scene.tsx:166-177` | `<Canvas gl={{ alpha:true, antialias:false, powerPreference:"high-performance" }} dpr={...} ...>` — r3f implicitly `new WebGLRenderer(...)`. There is **no** explicit renderer factory yet. |
| Composer / postFX | `src/webgl/PostFX.tsx:44-56` | `@react-three/postprocessing` `<EffectComposer multisampling={0}>` with `<Bloom mipmapBlur .../>`, `<Noise/>`, `<Vignette/>`. Mounted only on `tier === "full"` (`Scene.tsx:186`). |
| Selective bloom contract | `src/webgl/materials/lineShader.ts:1-12,98-101,128-142` | Raw-GLSL `ShaderMaterial`, `AdditiveBlending`, `toneMapped` left default, color pushed `> 1.0` via `uEmissive` (default `2.6`) so a `luminanceThreshold` Bloom picks **only** the line. This is "approach A" selective bloom (no Selection pass). |
| Raw GLSL #1 (line) | `src/webgl/materials/lineShader.ts` | `createLineMaterial()` → `THREE.ShaderMaterial` (vertex breath + fragment gradient/head-draw/fresnel-core). 11 uniforms. |
| Raw GLSL #2 (planet) | `src/webgl/materials/planetShader.ts` | `createPlanetBodyMaterial()`, `createRingMaterial()`, `createAtmosphereMaterial()` — 3 `ShaderMaterial`s, FBM noise injected via string `.replace("__NOISE__", …)`. |
| Raw GLSL #3 (particles) | `src/webgl/materials/particleShader.ts` | `createParticleMaterial()` → `ShaderMaterial`, `gl_PointSize`/`gl_PointCoord`, `AdditiveBlending`. Used by `src/webgl/DriftParticles.tsx`. |
| RAF authority | `src/webgl/FrameDriver.tsx:41-45` | single `useFrame` pumps Lenis; listens for `webglcontextlost`/`webglcontextrestored` on `gl.domElement`. |
| Scroll bridge | `src/components/smooth-scroll-provider.tsx` | Lenis ↔ ScrollTrigger ↔ `scrollStore`. **Renderer-agnostic** — no change needed for WebGPU. |
| Hero drag | `src/components/hero-drag-layer.tsx` | DOM pointer-capture layer; feeds `heroDragStore`. **Renderer-agnostic** — no change. |
| Tier resolution | `src/webgl/store/tierStore.ts:28-43` | `detectTier()` probes `getContext("webgl2") ?? getContext("webgl")`. Does **not** yet probe `navigator.gpu`. |
| Host seam | `src/webgl/CanvasHost.tsx:21` | `const Scene = dynamic(() => import("./Scene"), { ssr:false })` — the Next-16 client-only seam already exists. |
| Renderer factory dir | `src/webgl/renderer/` | **Does not exist yet.** F0.5 is greenfield — this is where the seam module goes. |

Key consequence: today the renderer is implicit inside `<Canvas gl={...}>`. The migration introduces an explicit **async `gl` factory** and isolates it in `src/webgl/renderer/createRenderer.ts`.

---

## 1. WebGPU Canvas in R3F 9.6.1 + three 0.184.0

### 1.1 The entrypoints exist for our pins (verified on disk)

`node_modules/three/package.json` `exports` map (read directly):

```json
"./webgpu": "./build/three.webgpu.js",
"./tsl":    "./build/three.tsl.js"
```

Build artifacts present in `node_modules/three/build/`: `three.webgpu.js`, `three.tsl.js`, `three.webgpu.nodes.js` (plus the classic `three.module.js`).

- `new (require('three/webgpu').WebGPURenderer)` → `typeof === "function"` ✓ (verified via `node -e`).
- `three/webgpu` also exports `PostProcessing`, `RenderPipeline`, `PassNode`, `MRTNode`, `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping` (all verified present).
- `WebGPURenderer extends Renderer` and ships `async init()` (string `class WebGPURenderer extends Renderer` + `async init` found in `three.webgpu.js`).
- `renderer.backend.isWebGLBackend` flag exists (`isWebGLBackend` string present in `three.webgpu.js`) — this is the runtime backend detector (see §1.6).
- `forceWebGL` is a real constructor option (`forceWebGL` string present twice in `three.webgpu.js`).

### 1.2 The async `gl` factory contract is built into r3f 9.6.1 (verified on disk)

`node_modules/@react-three/fiber/dist/declarations/src/core/renderer.d.ts:14`:

```ts
export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)   // ← async factory
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>;
```

and `ReconcilerRoot.configure` is `(config?) => Promise<ReconcilerRoot>` (`renderer.d.ts:67`). The `Promise<Renderer>` branch is the contract r3f v9 added specifically so `WebGPURenderer.init()` (which is async — it negotiates the GPU adapter) can be awaited before the first render. This is the canonical pmndrs pattern (see `@react-three/fiber` v9 "WebGPU" docs / `pmndrs/react-three-fiber` examples).

The `gl` factory therefore must: construct the renderer, `await renderer.init()`, and return it.

### 1.3 `extend(THREE)` — verified signature

`node_modules/@react-three/fiber/dist/declarations/src/core/reconciler.d.ts:47-48`:

```ts
export declare function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<...>;
export declare function extend<T extends Catalogue>(objects: T): void;   // ← bulk catalog form
```

`extend` is re-exported from the package root (`core/index.d.ts:7`). The bulk form `extend(THREE)` registers every class so JSX intrinsics (`<mesh>`, `<points>`, node-material elements) resolve. **Because we import from `three/webgpu` (a superset namespace) we must `extend` that namespace**, not classic `three`, or node-based classes won't be registered.

### 1.4 JSX typing augmentation — the helper exists in r3f 9.6.1 (verified on disk)

`node_modules/@react-three/fiber/dist/declarations/src/three-types.d.ts:35-41`:

```ts
export type ThreeElement<T extends ConstructorRepresentation> = ...;
export type ThreeToJSXElements<T extends Record<string, any>> = {
  [K in keyof T & string as Uncapitalize<K>]:
    T[K] extends ConstructorRepresentation ? ThreeElement<T[K]> : never;
};
export interface ThreeElements extends Omit<ThreeElementsImpl, 'audio'|'source'|'line'|'path'> { ... }
```

So the standard module-augmentation block (put in a `src/webgl/three-webgpu.d.ts`, included by tsconfig) is:

```ts
// src/webgl/three-webgpu.d.ts
import type { ThreeToJSXElements } from "@react-three/fiber";
import * as THREE from "three/webgpu";

declare module "@react-three/fiber" {
  // Make every three/webgpu class (incl. node materials) a valid JSX intrinsic.
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
```

This is the documented r3f-v9 WebGPU TS recipe; we only need it once we actually place `three/webgpu`-only classes in JSX (e.g. a `<meshBasicNodeMaterial>`). For the F0.5 seam (renderer swap only, no node-material JSX yet) it is optional but should be added pre-emptively so later TSL ports type-check.

### 1.5 Next 16 client-only requirements (grounded in our code)

- `Scene` is already `dynamic(() => import("./Scene"), { ssr:false })` in `CanvasHost.tsx:21`. Next 16 App Router **forbids `ssr:false` inside a Server Component**, which is exactly why `CanvasHost` is `"use client"` — keep that seam. WebGPU changes nothing here.
- `WebGPURenderer` touches `navigator.gpu` / `document` at construction; it must never run on the server. The `ssr:false` dynamic import + the `gl` factory only running inside `<Canvas>` (client) already guarantees this.
- **Turbopack note** (our build, per `lineShader.ts:5-7`): no `.glsl` loader is configured; all GLSL/TSL stays inline in `.ts`. `three/webgpu` and `three/tsl` are normal ESM subpath imports and resolve through the `exports` map — no loader config needed. Verified the subpaths resolve via `node -e "require('three/webgpu')"` and `require('three/tsl')` (both succeed).

### 1.6 THE CRITICAL PITFALL — never mix `three` and `three/webgpu` in one bundle

`three.webgpu.js` is a **separate, self-contained build** of the entire library (its own copies of `Vector3`, `Color`, `Mesh`, `WebGPURenderer`, the node system, …). The classic `three` (`three.module.js`) is a **different** build of the same classes. If both end up in the bundle you get:
- two copies of every class → `instanceof` checks fail (a `Color` from `three` is NOT an instance of `Color` from `three/webgpu`);
- doubled bundle weight;
- subtle "material is not a NodeMaterial" / "object is not an Object3D" runtime errors.

Confirmed structurally: `BloomNode.js:1` imports its primitives **from `three/webgpu`**, not `three` — the addon authors enforce single-namespace. Our materials currently do `import * as THREE from "three"` (e.g. `lineShader.ts:13`, `planetShader.ts:12`, `particleShader.ts:8`, `SignatureLine.tsx:13`, `constants.ts:1`).

**Rule for the migration:** once the WebGPU path is active, every WebGL module that participates in the same scene graph must import from a **single** namespace. Two viable strategies:

1. **Switch all `three` imports to `three/webgpu`** (recommended end-state). `three/webgpu` re-exports the full classic API (`Vector3`, `Color`, `Mesh`, `TubeGeometry`, `ShaderMaterial`, `MathUtils`, …) — verified: `MathUtils`, `TubeGeometry`, `ShaderMaterial`, `Color`, `Vector3` are all present on `require('three/webgpu')`. So `import * as THREE from "three/webgpu"` is a drop-in for the existing code AND works under a WebGL2 backend (the `three/webgpu` build runs on WebGL2 too — that's the whole point of the unified `Renderer`). This is the cleanest single-bundle answer.
2. **Bundler alias** `three` → `three/webgpu`. Riskier under Turbopack (alias support differs from webpack) and can surprise third-party deps; prefer explicit imports (#1).

> **Do NOT** keep `ShaderMaterial` (raw GLSL) under a WebGPU backend expecting it to "just work". `WebGPURenderer` on a **WebGL2 backend** can still run classic `ShaderMaterial` (GLSL), but on a **WebGPU backend** raw-GLSL `ShaderMaterial` is NOT supported — only `NodeMaterial`/TSL materials compile to WGSL. This is the crux of §3.

### 1.7 Runtime backend detection

```ts
// after the renderer exists (e.g. in onCreated or the factory)
const isWebGL = (renderer as any).backend?.isWebGLBackend === true;
// equivalently expose a tier flag:
useTierStore.getState().setBackend(isWebGL ? "webgl2" : "webgpu");
```

`isWebGLBackend` is set on whichever backend `Renderer` selected (WebGPU when available, else the WebGL2 fallback backend). Use it to decide **PostFX path** (§2) and **material path** (§3).

---

## 2. Postprocessing under WebGPU

### 2.1 `@react-three/postprocessing@3.0.4` / `postprocessing@6.39.1` do NOT run under a WebGPU backend (verified)

`node_modules/postprocessing/build/types/index.d.ts` — `EffectComposer` constructor (line 88) and its `renderer` field (line 2786) are typed:

```ts
constructor(renderer: WebGLRenderer, ...);
protected renderer: WebGLRenderer;
```

`postprocessing@6.39.1` is structurally a **WebGLRenderer** library: it allocates `WebGLRenderTarget`s, binds GLSL passes, and calls `renderer.render` on a `WebGLRenderer`. A `WebGPURenderer` is not a `WebGLRenderer` and does not expose the same render-target plumbing, so `@react-three/postprocessing`'s `<EffectComposer>` (`PostFX.tsx:45`) cannot accept it. `@react-three/postprocessing@3.0.4` `peerDependencies` (verified) require `three >= 0.156.0` but its `dependencies` pin `postprocessing ^6.36.6` and `n8ao` — all WebGL. **Conclusion: keep the existing `<EffectComposer>` only on the WebGL2-backend branch; build a TSL pipeline for the WebGPU branch.**

### 2.2 Replacement = three's TSL `PostProcessing` class + node graph (verified exports)

Verified present:
- `three/webgpu`: `PostProcessing` (constructor `PostProcessing(renderer, outputNode?)` — read from `three.webgpu.js:83025` + the `RenderPipeline` base ctor `constructor(renderer, outputNode)`).
- `three/tsl`: `pass`, `mrt`, `output`, `emissive`, `texture`, `luminance`, `grayscale`, `viewportUV`, `screenUV`, `renderOutput`, `toneMapping`, `vec4`, `uniform`, `mix`, `add`, `smoothstep` (all verified `typeof`).
- `three/addons/tsl/display/`: `BloomNode.js` (`export const bloom`), `DepthOfFieldNode.js` (`export const dof`), `ChromaticAberrationNode.js` (`export const chromaticAberration`), `FilmNode.js` (`export const film`), plus `GTAONode`, `FXAANode`, `SMAANode`, `SSAAPassNode`, etc.

Verified addon signatures (read from the addon source, our pin):

```
bloom(node, strength?, radius?, threshold?)                         // BloomNode.js:532
dof(node, viewZNode, focusDistance=1, focalLength=1, bokehScale=1)  // DepthOfFieldNode.js:554
chromaticAberration(node, strength=1.0, center=null, scale=1.1)     // ChromaticAberrationNode.js:163
film  = nodeProxy(FilmNode)                                         // FilmNode.js:101  → film(node, intensity?, grayscale?)
```

> `vignette` is **NOT** exported by `three/tsl` (verified `typeof === "undefined"`). Vignette is hand-rolled from `screenUV`/`viewportUV` (snippet below). `sepia` is also not in `three/tsl` (use `FilmNode`/`grayscale` for grain/desat).

### 2.3 Selective bloom via MRT + emissive (the addon documents the exact recipe for our line)

Our signature line already outputs `> 1.0` color (`lineShader.ts:98 col = … * uEmissive`, default `2.6`). Under TSL, selective bloom is done by routing that emissive into an **MRT emissive target** and blooming only that target — `BloomNode.js:24-41` documents it verbatim:

```js
// from node_modules/.../tsl/display/BloomNode.js docblock (our pin)
const postProcessing = new PostProcessing(renderer);
const scenePass = pass(scene, camera);
scenePass.setMRT(mrt({ output, emissive }));      // emissive = node material's emissiveNode output
const scenePassColor = scenePass.getTextureNode('output');
const emissivePass   = scenePass.getTextureNode('emissive');
const bloomPass = bloom(emissivePass);            // blooms ONLY emissive>0 fragments
postProcessing.outputNode = scenePassColor.add(bloomPass);
```

Verified API used here: `pass`, `mrt`, `output`, `emissive` (`three/tsl`), `scenePass.setMRT` / `.getTextureNode` (`setMRT`/`getTextureNode` strings present in `three.webgpu.js`), `PostProcessing` (`three/webgpu`).

Two ways to feed the emissive channel for the line:
- **(a) Threshold-on-luminance (drop-in, matches today's `PostFX.tsx`)**: bloom the `output` pass with a `threshold ≈ 1.0`; since only the line exceeds 1.0 luminance it's the only thing that blooms — preserves the *exact* current selective-bloom contract with zero material change. `bloom(scenePass.getTextureNode('output'), strength, radius, 1.0)`.
- **(b) True MRT emissive (cleaner, requires NodeMaterial emissiveNode)**: only once the line is a `NodeMaterial` (§3) so it can write the `emissive` MRT slot. More robust (no reliance on luminance), but needs the TSL port first.

**Recommendation:** ship **(a)** for the WebGPU branch first — it reproduces the current look 1:1 and does not depend on porting the line material. Move to **(b)** only after the line is on TSL.

### 2.4 Concrete WebGPU post node-graph for our scene (all FX, correct ordering)

```ts
// src/webgl/postfx/buildWebGPUPost.ts  (WebGPU-backend branch only)
import { PostProcessing, ACESFilmicToneMapping } from "three/webgpu";
import { pass, mrt, output, emissive, renderOutput, screenUV,
         mix, vec3, float, smoothstep, length } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { film } from "three/addons/tsl/display/FilmNode.js";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";

export function buildWebGPUPost(renderer, scene, camera, fx) {
  const post = new PostProcessing(renderer);

  const scenePass = pass(scene, camera);
  // Approach (a): luminance-threshold selective bloom on the colour target.
  const color = scenePass.getTextureNode("output");

  // 1) BLOOM — strength=fx.bloomIntensity, radius=fx.bloomRadius, threshold≈1.0
  //    (matches PostFX.tsx: luminanceThreshold≈bloomThreshold, intensity, radius)
  let node = color.add(bloom(color, fx.bloomIntensity, fx.bloomRadius, fx.bloomThreshold));

  // 2) DEPTH OF FIELD (optional, only if/when we add focal depth) — needs viewZ:
  //    const viewZ = scenePass.getViewZNode(); node = dof(node, viewZ, focus, focal, bokeh);

  // 3) CHROMATIC ABERRATION — subtle edge fringing
  node = chromaticAberration(node, fx.chromaStrength /* ~0.4 */);

  // 4) FILM GRAIN (replaces <Noise/>) — film(node, intensity, grayscale=false)
  node = film(node, fx.noiseOpacity /* map from <Noise opacity> */);

  // 5) VIGNETTE (hand-rolled; no tsl vignette export). Mirrors <Vignette offset=0.35 darkness>
  const d = screenUV.distance(vec3(0.5).xy);          // 0 center → ~0.7 corner
  const vig = smoothstep(0.35, 0.85, d).oneMinus().mul(fx.vignetteDarkness).oneMinus();
  node = node.mul(vig);

  // 6) TONE MAPPING + colour-space — do this LAST. Either set on the renderer
  //    (renderer.toneMapping = ACESFilmicToneMapping) OR wrap with renderOutput(node).
  post.outputNode = renderOutput(node);   // applies tone mapping + output colour space
  return post;
}
```

**Ordering rule (important):** scene render → bloom (additive, in linear/HDR) → DoF → chromatic aberration → film grain → vignette → **tone mapping + output color space LAST** via `renderOutput()` (or `toneMapping()`), so grain/vignette act in the same space the WebGL path used and bloom stays HDR-correct. Today's WebGL order is Bloom → Noise → Vignette (`PostFX.tsx:46-54`); the TSL graph reproduces it and appends explicit tone mapping (which `EffectComposer` did implicitly through the renderer).

Tone-mapping constants verified present in `three/webgpu`: `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping`. To match today, set the same tone mapping the current `WebGLRenderer` uses (r3f default is `ACESFilmicToneMapping`); AgX is the more filmic alternative if we want to re-grade.

### 2.5 Coexistence with the WebGL2 fallback

The WebGL2 branch keeps `PostFX.tsx` **unchanged** (`@react-three/postprocessing` `<EffectComposer>`), because under a WebGL2 backend `WebGPURenderer` does NOT expose the `WebGLRenderTarget` API that lib needs. The clean split:

```tsx
// in Scene.tsx, replacing the single `{tier==="full" && <PostFX/>}`
{tier === "full" && (backend === "webgpu"
  ? <WebGPUPost pathname={pathname} />     // imperative: builds PostProcessing in useEffect, drives post.renderAsync() from the frame loop
  : <PostFX pathname={pathname} />)}       // unchanged EffectComposer
```

Note: `<WebGPUPost>` cannot be a drei/r3f `<EffectComposer>` child graph — it owns the render output, so it must (a) build the `PostProcessing` object in an effect, (b) set `frameloop="never"`-style manual render OR call `post.renderAsync()` instead of the default scene render. r3f v9 supports this by detecting that a `PostProcessing`/frameloop override is present; the simplest robust path is to render the post pipeline from a single `useFrame` (priority 1) and let r3f's auto-render be suppressed. Confirm the exact "let r3f render the post pipeline" wiring against the current `@react-three/fiber` v9 WebGPU example when implementing (this is the one spot where runtime behaviour, not just types, must be checked on-device).

---

## 3. Custom GLSL strategy (line / planet / particle shaders)

### 3.1 The constraint

- On a **WebGL2 backend**, classic GLSL `ShaderMaterial` runs fine (the `three/webgpu` `Renderer` falls back to a WebGL2 backend and still compiles GLSL).
- On a **WebGPU backend**, raw-GLSL `ShaderMaterial` is **not** supported — WGSL is generated only from `NodeMaterial`/TSL. So any `ShaderMaterial` left in the graph will fail (or silently not render) when the active backend is WebGPU.

Our three raw-GLSL materials: `lineShader.ts`, `planetShader.ts` (×3), `particleShader.ts`.

### 3.2 Option A — full TSL port (all three materials → NodeMaterial)

Pros: single material works on both backends; unlocks true MRT-emissive selective bloom (§2.3b); future-proof. Cons: real work; risk of pixel drift on the **signature line**, which the spec demands stay pixel-identical.

### 3.3 Option B — keep raw GLSL only on the WebGL2 fallback branch

Mount the existing `ShaderMaterial` only when `backend === "webgl2"`; mount TSL equivalents when `backend === "webgpu"`. Pros: WebGL2 stays byte-identical to today (zero risk to the loved look). Cons: two material implementations to keep in sync; the line must be visually matched across them.

### 3.4 Recommendation (lowest risk, keeps the line pixel-identical)

**Phased, line-first, backend-gated:**

1. **F0.5 (seam only):** introduce the renderer factory and run the `three/webgpu` `Renderer` on its **WebGL2 backend** with `forceWebGL: true` by default. All existing `ShaderMaterial`s and the existing `@react-three/postprocessing` `<EffectComposer>` keep working **unchanged** — because a WebGL2 backend runs GLSL. This proves the seam with **zero visual change**. The site never breaks.
2. **Port the line first** to a TSL `NodeMaterial` (it's the signature and the only material that must be flawless). Keep the GLSL line as the WebGL2-branch material; add the TSL line as the WebGPU-branch material. Compare the two backends side-by-side via the `forceWebGL` flag (§5) until pixel-matched, then flip the WebGPU flag on.
3. **Particles + planet** can stay GLSL on the WebGL2 branch indefinitely; port them to TSL opportunistically. Until they're ported, the WebGPU backend stays flag-off (so we never ship a half-ported scene). Order of difficulty: particles (simple `gl_PointSize`/`PointsNodeMaterial`) < line < planet (FBM noise + ring profile is the most code).

This keeps the WebGL2 build **always working and pixel-identical**, makes the WebGPU path additive and flag-gated, and lets the line be matched before anything ships.

### 3.5 What a TSL port of the line material looks like (sketch, our planned line incl. fresnel/scattering)

The current line is: progressive head-draw mask along `uv.x`, animated cyan→violet gradient, view-facing core (fresnel-ish via `abs(vViewNormal.z)`), additive, emissive `>1`, optional vertex breath. TSL equivalent on a `MeshBasicNodeMaterial` (unlit, like the GLSL one):

```ts
import { MeshBasicNodeMaterial, AdditiveBlending } from "three/webgpu";
import { Fn, uv, uniform, float, vec3, vec4, mix, sin, abs, pow,
         smoothstep, fwidth, normalView, positionLocal, normalLocal,
         time, dot, transformNormalToView } from "three/tsl";

export function createLineNodeMaterial() {
  const uProgress  = uniform(0);
  const uReveal    = uniform(1);
  const uEmissive  = uniform(2.6);
  const uHeadSharp = uniform(0.045);
  const uGlow      = uniform(2.0);
  const uFlow      = uniform(0.05);
  const uColorA    = uniform(vec3(0.23, 0.88, 1.0));  // #3BE1FF
  const uColorB    = uniform(vec3(0.49, 0.36, 1.0));  // #7C5CFF
  const uColorHot  = uniform(vec3(0.92, 0.96, 1.0));  // #EAF6FF

  const along = uv().x;

  // head-draw mask (matches lineShader.ts:82-86) — fwidth keeps the edge crisp
  const aa    = fwidth(along).add(0.0005);
  const drawn = float(1).sub(smoothstep(uProgress.sub(aa), uProgress.add(aa), along));
  const head  = smoothstep(uProgress.sub(uHeadSharp), uProgress, along).mul(drawn);

  // flowing gradient (matches :90-91)
  const t    = float(0.5).add(sin(float(6.28318).mul(along.mul(1.5).sub(time.mul(uFlow)))).mul(0.5));
  const grad = mix(uColorA, uColorB, t);

  // view-facing core (fresnel) — abs(viewNormal.z), pow(.,uGlow) (matches :95-96)
  const facing = abs(normalView.z);
  const core   = pow(facing, uGlow);

  // FUTURE fresnel/scattering we plan to add: a rim term = pow(1 - facing, k)
  // and an inscatter tint toward uColorHot at grazing angles — both are pure
  // node math (pow/mix), no new uniforms required.

  const mat = new MeshBasicNodeMaterial();
  mat.colorNode    = mix(grad, uColorHot, head.mul(0.85)).mul(uEmissive);
  mat.opacityNode  = drawn.mul(core).mul(uReveal);
  mat.transparent  = true;
  mat.depthWrite   = false;
  mat.depthTest    = false;
  mat.blending     = AdditiveBlending;
  // emissiveNode = mat.colorNode  // <- set this to feed the MRT emissive slot (§2.3b)
  return { mat, uniforms: { uProgress, uReveal, uEmissive, uHeadSharp, uGlow, uFlow, uColorA, uColorB, uColorHot } };
}
```

Notes for parity: `uv()`, `normalView`, `time`, `fwidth`, `smoothstep`, `mix`, `pow`, `sin`, `abs` are all TSL nodes; the `uniform()` objects are mutated per-frame exactly like `material.uniforms.*.value` today (the `SignatureLine.tsx:179-214` `useFrame` body changes only in that it sets `uProgress.value = …` on the node uniforms instead of `u.uProgress.value`). The vertex **breath** (`lineShader.ts:49-53`) becomes a `positionNode` that offsets `positionLocal` along `normalLocal` by the same `breathField` (sin sum) — straightforward. Confirm exact TSL node import names against `three/tsl` at implementation time (some are namespaced, e.g. `normalView` vs `transformNormalToView`); both candidates were seen in the addon sources.

---

## 4. drei 10.7.7 under WebGPU

drei 10.7.7 **does not bundle `postprocessing`** (verified: its `dependencies` are `maath`, `three-mesh-bvh`, `three-stdlib`, `troika-three-text` — no `postprocessing`). So there is no drei `EffectComposer` to break in this version; postprocessing comes solely from the separate `@react-three/postprocessing` package (§2).

Helper status under a WebGPU backend (helpers present on disk are noted):

| Helper | File on disk | WebGPU backend |
|---|---|---|
| `OrbitControls` | `core/OrbitControls.js` ✓ | **Works** — pure camera/DOM math, renderer-agnostic. |
| `Environment` | `core/Environment.js` ✓ | **Works** for IBL/HDRI under the node pipeline (PMREM is handled by the Renderer); equirect/cube loading is renderer-agnostic. Validate HDR path on-device. |
| `useTexture` | `core/Texture.js` ✓ | **Works** — `TextureLoader` output is consumed by node materials. |
| `Image` | `core/Image.js` ✓ | **Mostly works**, but `<Image>` uses an internal shader material; on a WebGPU backend confirm it renders (drei has been migrating internals to node materials). Low risk for us — not used by the signature scene. |
| `View` | `web/View.js` ✓ | **Works** — it's render-target/viewport scissoring driven by the renderer's `setViewport`/`setScissor`, which `Renderer` implements. |
| `Text` (troika) | `core/Text.js` ✓ | **Works** — troika builds its own SDF material; renderer-agnostic for typical use. |
| `Html` | `web/Html.js` ✓ | **Works** — pure DOM overlay, no renderer dependency. |
| drei `<EffectComposer>` | **not in 10.7.7** | N/A (removed; use `@react-three/postprocessing` on WebGL2 / TSL on WebGPU). |

Bottom line: none of the drei helpers we use (or are likely to use for the line/planet/particles/ritual objects) are blocked by WebGPU. The only postprocessing concern is `@react-three/postprocessing` (§2), which is a separate package.

---

## 5. Renderer-factory seam design (F0.5) + always-green migration sequence

### 5.1 The contained seam module

```ts
// src/webgl/renderer/createRenderer.ts
import { WebGPURenderer } from "three/webgpu";
import type { DefaultGLProps } from "@react-three/fiber";

export type Backend = "webgpu" | "webgl2";

// One flag controls everything. Default OFF until the WebGPU path is matched.
const WEBGPU_ENABLED = process.env.NEXT_PUBLIC_WEBGPU === "1";

export async function createRenderer(defaults: DefaultGLProps) {
  const canvas = defaults.canvas as HTMLCanvasElement;
  const forceWebGL = !WEBGPU_ENABLED || !("gpu" in navigator);

  const renderer = new WebGPURenderer({
    canvas,
    alpha: true,             // mirror Scene.tsx:168
    antialias: false,        // mirror Scene.tsx:169 (we AA in post / via SMAA node)
    powerPreference: "high-performance", // mirror Scene.tsx:170
    forceWebGL,              // ← WebGL2 backend when flag off OR no navigator.gpu
  });
  await renderer.init();     // REQUIRED before first render (async adapter)
  return renderer;
}

export function backendOf(renderer: any): Backend {
  return renderer?.backend?.isWebGLBackend ? "webgl2" : "webgpu";
}
```

Wire it in `Scene.tsx` by replacing the object `gl={{…}}` with the async factory:

```tsx
// Scene.tsx
import { createRenderer, backendOf } from "./renderer/createRenderer";
...
<Canvas
  gl={createRenderer}                 // async factory (GLProps Promise branch, §1.2)
  dpr={tier === "full" ? [1,2] : [1,1.5]}
  camera={{ fov: CAMERA_FOV, position:[0,0,CAMERA_Z], near:0.1, far:200 }}
  onCreated={({ gl }) => {
    gl.setClearColor(0x000000, 0);    // unchanged (Scene.tsx:174)
    useTierStore.getState().setBackend(backendOf(gl));  // record backend for PostFX/material gating
  }}
  frameloop="always"
  style={{ position:"absolute", inset:0 }}
>
```

Add `extend(THREE)` once at module load with `import * as THREE from "three/webgpu"` (only needed if/when node-material JSX is used), and add `src/webgl/three-webgpu.d.ts` (§1.4).

`tierStore` additions (no behaviour change yet): `backend: "webgl2" | "webgpu" | null`, `setBackend(b)`. Also extend `detectTier()` to optionally probe `"gpu" in navigator` for telemetry — but keep the WebGL2 probe as the gate so "off" tier logic is unchanged.

### 5.2 Step-by-step migration sequence (WebGL2 is ALWAYS working)

Each step ships independently; the site renders identically until the very last flip.

- **Step 0 — Imports unification (no behaviour change).** Change `import * as THREE from "three"` → `from "three/webgpu"` in the WebGL modules that share the scene graph (`SignatureLine.tsx`, `lineShader.ts`, `planetShader.ts`, `particleShader.ts`, `DriftParticles.tsx`, `constants.ts`, `HeroPlanet`, `GatewayPortal`, `RouteHero`). This is API-compatible (verified the classic classes are re-exported by `three/webgpu`) and prevents the dual-namespace pitfall (§1.6). Still rendering on classic WebGL via r3f's implicit renderer — **visually identical**. (Verify build + a Playwright screenshot.)
- **Step 1 — Renderer seam, forced WebGL2.** Add `createRenderer.ts` with `WEBGPU_ENABLED=false` (so `forceWebGL:true` always). Swap `<Canvas gl={…object…}>` → `gl={createRenderer}`. Now the `three/webgpu` `Renderer` drives the scene on a **WebGL2 backend**; existing `ShaderMaterial`s and `@react-three/postprocessing` keep working. **Visually identical**, but the seam is proven. Confirm `FrameDriver.tsx` context-loss listeners still attach (they listen on `gl.domElement`, which the WebGPU `Renderer` still exposes; verify event names — WebGPU uses the same canvas, classic `webglcontextlost` only fires on the WebGL2 backend, so context-loss resilience continues to work on the fallback path; on a true WebGPU backend add a `device.lost` promise handler in a later step).
- **Step 2 — TSL post pipeline behind the flag (still forced WebGL2).** Implement `buildWebGPUPost` (§2.4) and the `WebGPUPost` component, gated by `backend === "webgpu"`. With the flag off this code never runs; WebGL2 still uses `PostFX.tsx`. Land it dormant.
- **Step 3 — TSL line material behind the flag.** Add `createLineNodeMaterial` (§3.5); `SignatureLine` selects GLSL vs TSL by `backend`. Flag still off → GLSL path only.
- **Step 4 — Enable WebGPU in dev, match pixels.** Set `NEXT_PUBLIC_WEBGPU=1` locally. Use a `?forceWebGL` query/leva toggle to A/B the two backends in the same session (the factory reads it). Iterate `bloom` strength/radius/threshold and the TSL line until pixel-matched with Playwright at desktop + the lite/mobile dpr.
- **Step 5 — Port particles, then planet, to TSL** (each behind the same flag, each matched).
- **Step 6 — Flip the default.** Set `WEBGPU_ENABLED=true`; `forceWebGL` now only triggers when `navigator.gpu` is absent → **automatic WebGL2 fallback**. WebGL2 branch (GLSL materials + `@react-three/postprocessing`) remains the safety net forever.

At no step does the live site lose the WebGL2 path; WebGPU is purely additive and flag-gated.

---

## 6. Perf / Lighthouse + caveats

### 6.1 Bundle size & tree-shaking (mobile ≥80 budget)

- `three.webgpu.js` is materially larger than `three.module.js` (it includes the whole node system + WGSL codegen). On-disk both `three.webgpu.js` and `three.module.js` exist; the WebGPU build is the heavier one. The TSL display addons (`BloomNode`, etc.) are **separately imported** so they tree-shake — only what you import from `three/addons/tsl/display/*` ships.
- Mitigation already in place: the whole scene is `dynamic(() => import("./Scene"), { ssr:false })` (`CanvasHost.tsx:21`) and only mounts for `tier !== "off"`. So the heavy `three/webgpu` chunk is **lazy** and never hits the initial/SSR payload that Lighthouse measures for first load. Keep the renderer factory and TSL post in the same lazy island (import them only inside `Scene`/its children), so they stay out of the entry chunk.
- Avoid importing `three/webgpu` from any module that the main app bundle pulls eagerly. Audit: today only WebGL files import `three`; switching them to `three/webgpu` is fine **because those files are all inside the lazy `Scene` island**. Do not import `three/webgpu` from a shared util that a non-WebGL route imports.
- Keep `@react-three/postprocessing` for the WebGL2 branch; it's already in the lazy island. Do not double-ship: import the TSL post addons only inside the `WebGPUPost` component (also lazy).

### 6.2 Dispose / lifecycle

- The scene is persistent across routes by design (`Scene.tsx` header). The current materials/geometries already `dispose()` on unmount (`SignatureLine.tsx:40,134`, `DriftParticles.tsx:33,80`). Node materials and the `PostProcessing` pipeline need the same discipline: dispose the `PostProcessing` object and its internal render targets on unmount, and dispose node materials. `WebGPURenderer` itself should be disposed when the Canvas tears down — r3f handles renderer disposal on unmount, but the `PostProcessing` instance you create imperatively is **yours to dispose** (call its `.dispose()` in the `WebGPUPost` effect cleanup).
- The WebGL2 fallback path keeps using `EffectComposer`, which r3f-postprocessing disposes on unmount — no change.

### 6.3 Safari / iOS WebGPU caveats (early 2026)

- WebGPU is shipping in Safari (enabled by default in Safari 26 / iOS 26 era), but coverage across older iOS versions and locked-down WKWebView contexts is uneven. **Do not assume `navigator.gpu` implies a healthy device.** Our gate already requires `"gpu" in navigator` AND `forceWebGL` otherwise; additionally treat `tier === "lite"` (mobile/coarse pointer, `tierStore.ts:40-42`) as a candidate to **force WebGL2** even when `navigator.gpu` exists, until the WebGPU path is validated on real iOS hardware. This keeps mobile on the proven GLSL+`@react-three/postprocessing` path and protects the Lighthouse-mobile ≥80 budget.
- `await renderer.init()` can reject (adapter request fails) on flaky devices; the factory should `try/catch` and **retry with `forceWebGL:true`** so a failed WebGPU init degrades to WebGL2 rather than a blank canvas. (This is the only place where init can fail; wrap it.)
- True WebGPU context loss is a `GPUDevice.lost` promise, not the `webglcontextlost` DOM event that `FrameDriver.tsx` listens for. On the WebGPU backend, add a `renderer.backend.device?.lost?.then(...)` handler that mirrors the existing `setExternalPump(false)` baton hand-off so scroll survives a device loss (Step 1/6 follow-up). On the WebGL2 backend the existing listeners keep working unchanged.

---

## Caveats / Not Found

- **MCP search tools unavailable this session.** exa/Context7 were not exposed as callable tools, so I verified every API against the **installed packages on disk** (the shipping code for our exact pins) rather than upstream URLs. This is more authoritative for version-correctness, but two items still need a **runtime** check on-device (types alone can't confirm behaviour): (1) the exact wiring to make r3f v9 render the TSL `PostProcessing` pipeline instead of its default scene render (§2.5), and (2) the precise TSL node import names for a couple of nodes (`normalView`/`transformNormalToView`, `time`) at implementation time (§3.5). Both should be confirmed against the current `pmndrs/react-three-fiber` v9 WebGPU example when coding.
- `vignette` and `sepia` are **not** in `three/tsl` (verified) — vignette is hand-rolled (§2.4); grain/desat via `FilmNode`/`grayscale`.
- `renderer/` directory does not exist yet — F0.5 is greenfield; paths above are proposals.
- `detectTier()` does not currently probe `navigator.gpu`; backend selection is proposed to live in `createRenderer.ts` + a new `tierStore.backend` field, not in `detectTier()` (so the existing "off" logic stays untouched).

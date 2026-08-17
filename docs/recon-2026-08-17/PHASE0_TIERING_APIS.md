# TIERING_APIS.md — Device tiering, DPR & performance scaling (Phase-0 discovery)

Ground truth = INSTALLED packages under `C:/Users/alber/Sersan/node_modules` (read 2026-08-17).
Every entry below cites the file where the signature/behaviour was read. Nothing here comes from memory.

## 0. Installed versions (from `package.json` + each package's `package.json`)

| Package | Installed | Notes |
|---|---|---|
| `@react-three/drei` | 10.7.7 | peer `@react-three/fiber ^9`, `three >=0.159`, React 19 |
| `@react-three/fiber` | 9.6.1 | |
| `three` / `@types/three` | 0.184.0 / 0.184.1 | WebGL1 removed; `three/webgpu` present |
| `postprocessing` | 6.39.1 | |
| `@react-three/postprocessing` | 3.0.4 | wraps postprocessing 6.39.1 |
| `detect-gpu` | **5.0.70 — IS installed** (`node_modules/detect-gpu`, transitive dep of drei: `"detect-gpu": "^5.0.56"` in `@react-three/drei/package.json:39`) | not a direct dep in the repo's `package.json` — import via drei's `useDetectGPU` or add explicitly |
| `three-mesh-bvh` | 0.8.3 (drei dep) | needed by drei `Bvh` |
| `suspend-react` | 0.1.3 (drei dep) | `useDetectGPU` suspends through it |
| `zustand` | 5.0.14 | tierStore |
| `next` | 16.2.6 | App Router; `NEXT_PUBLIC_WEBGPU` build flag |

---

## 1. THE REPO'S OWN AXES — reuse these, do not invent new ones

### 1.1 `src/webgl/store/tierStore.ts` (read in full)

```ts
export type SceneTier = "full" | "lite" | "off";           // L24
export const useTierStore = create<TierState>(...)          // L215
```

`TierState` (L26–86) — full exported store surface:

| Field | Type | Meaning (from doc comments) |
|---|---|---|
| `tier` | `SceneTier` | **Which DOM LAYOUT to serve** (`full` desktop capable GPU / `lite` mobile-weak / `off` reduced-motion or no WebGL). Since `phoneGL` landed, `tier === "lite"` **no longer implies "no islands"** (L12–19). |
| `phoneGL` | `boolean` | MAY a coarse-pointer device mount decorative WebGL islands. Gates read `tier === "full" \|\| phoneGL` — strictly additive; always `false` on a fine pointer (L28–39). |
| `resolved` | `boolean` | set true by `resolve()` |
| `backend` | `Backend \| null` (`"webgpu" \| "webgl2"`, from `../renderer/createRenderer`) | RESOLVED runtime backend, written once from `Scene.tsx onCreated` via `backendOf(gl)`; `null` must be treated as "not webgpu" (L41–55). |
| `dprInitial` / `dprMin` / `dprMax` | `number` | GPU-aware render DPR range; Canvas starts at `dprInitial`; `AdaptiveResolution` steps within `[min,max]` (L56–66). |
| `dprCap` | `number \| null` | Temporary hard cap over the adaptive range, consumed by AdaptiveResolution as `min(dprMax, dprCap)`; set by singularity passage (L67–76). |
| `heroReady` | `boolean` | WebGL hero (Saturn/HeroLogo) rendered first frame (L77–80). |
| `resolve()` | `() => void` | ONE `set()` writing `tier`, `phoneGL`, `resolved`, `dprInitial/Min/Max` (L225–238). Called from `CanvasHost` effect. |
| `degrade()` | `() => void` | `full → lite` (clears heroReady); `lite → off` (also `phoneGL:false`) (L239–248). Intended caller: drei PerformanceMonitor (header L4–6) — **currently nobody calls it** (grep: only definition). |
| `setHeroReady(b)` | | |
| `setBackend(b)` | guarded one-shot | |
| `setDprCap(cap \| null)` | guarded | |

Internal (non-exported) detectors — signatures worth knowing so the plan does not duplicate them:

- `detectTier(): SceneTier` (L88–103): SSR→`off`; `prefers-reduced-motion`→`off`; no `webgl2`/`webgl` context→`off`; `(pointer: coarse)` or `innerWidth < 768`→`lite`; else `full`.
- `detectPhoneGL(): boolean` (L129–150): fine pointer→false; reduced-motion→false; `hardwareConcurrency <= 4`→false (`= SEQ.LITE_MIN_CORES`, `seqStore.ts:377`); `deviceMemory < 4`→false; needs `webgl2`; DENY-LIST on `UNMASKED_RENDERER_WEBGL` (`mali-[tg](3|5|7)\d`, `adreno (4xx|50x-53x)`, `powervr (ge|g6)`) → false; else true. Explicitly does NOT use `detectGpuClass()` (comment L116–121).
- `detectGpuClass(): "weak"|"mid"|"strong"` (L163–180): regex on renderer string (`adreno|mali|powervr|qualcomm`→weak; `intel|UHD|Iris`→mid; else strong). Budget input only.
- `detectDprRange(): {initial,min,max}` (L189–213): device dpr clamped to ≤2; coarse pointer → `{1.0,1.0,1.5}`; weak → `{1.0,1.0,1.5}`; mid → `{1.25,1.0,1.75}`; strong → `{2.0,1.0,2.0}`.

Known consumers (grep, so the plan knows the blast radius): `CanvasHost.tsx`, `Scene.tsx` (dpr props + `island = tier==="full"||phoneGL` + PostFX gate), `AdaptiveResolution.tsx`, `NeuralLattice.tsx`, `neuralLatticeConfig.ts`, `HeroLogo.tsx`, `FounderPortraitMorph.tsx`, `case-studies-rail.tsx`, `resource-preview.tsx`, `resources-client.tsx`, `singularity-passage.tsx` (`setDprCap(SEQ.DPR_CAP=1.5 / SEQ.LITE_DPR_CAP=1)`), `founders-rail.tsx` (`backend`), `hero-hover-layer.tsx`, `preloader.tsx` (`resolved` subscribe), `use-neural-lattice-fallback.ts`.

### 1.2 `src/webgl/AdaptiveResolution.tsx` (read in full)

```tsx
export function AdaptiveResolution({ initial, min, max, step = 0.25 }:
  { initial: number; min: number; max: number; step?: number }): JSX.Element
```
- Mounted in `Scene.tsx:304` as `<AdaptiveResolution initial={dprInitial} min={dprMin} max={dprMax} />`, INSIDE `<Canvas dpr={dprInitial}>`.
- Wraps drei `<PerformanceMonitor bounds={() => [48, 58]} onDecline={…-step} onIncline={…+step}>` (L86–108); deliberately **no `flipflops`** (comment L91–104 explains drei latches permanently once `flipped > flipflops`, incrementing even on no-op callbacks).
- `apply(next)`: clamps to `[min, effMax]` where `effMax = min(max, tierStore.dprCap ?? max)`, rounds to 2dp, drop instantly, climb only if ≥ 8000 ms since last change (L68–84). Uses R3F `useThree(s => s.setDpr)`.
- Cap effect (L59–66): a newly-set `dprCap` below current dpr drops immediately.

### 1.3 `src/webgl/renderer/createRenderer.ts` (read in full)

- `export type Backend = "webgpu" | "webgl2"`
- `webgpuEnabled(): boolean` — reads `process.env.NEXT_PUBLIC_WEBGPU` (build-time inline).
- `forceWebGLFlag(): boolean` — `NEXT_PUBLIC_WEBGPU_FORCE_WEBGL`.
- `createWebGPURenderer(defaults): Promise<Renderer>` — R3F async `gl` factory; `new WebGPURenderer({alpha:true, antialias:false, powerPreference:"high-performance", forceWebGL})` + `await renderer.init()`; retries with `forceWebGL:true` on failure.
- `backendOf(renderer: unknown): Backend` — `"webgl2"` if no `.backend`; `"webgpu"` iff `backend.isWebGLBackend !== true && typeof renderer.compute === "function"`.

### 1.4 Other repo constants relevant to budgets
- `src/webgl/store/seqStore.ts:215-217` `DPR_CAP_ON: 0.85, DPR_CAP_OFF: 0.82, DPR_CAP: 1.5`; `:371 LITE_DPR_CAP: 1`; `:377 LITE_MIN_CORES: 4`.
- `src/components/fx/preloader-tunnel.ts:94` own `DPR_CAP = 1.5` for its 2D canvas.
- `Scene.tsx:52-56`: comment says leva + drei PerformanceMonitor "intentionally NOT mounted" — STALE: `AdaptiveResolution` (which IS a PerformanceMonitor) is mounted at L304.

---

## 2. ALLOWED APIs — @react-three/drei 10.7.7

Exports verified in `node_modules/@react-three/drei/core/index.d.ts` L58 (`DetectGPU`), L59 (`Bvh`), L113 (`AdaptiveDpr`), L114 (`AdaptiveEvents`), L115 (`PerformanceMonitor`).

### 2.1 `PerformanceMonitor` / `usePerformanceMonitor`
File: `node_modules/@react-three/drei/core/PerformanceMonitor.d.ts` (types) + `core/PerformanceMonitor.js` (behaviour).

```ts
export type PerformanceMonitorApi = {
  fps: number; factor: number; refreshrate: number; frames: number[]; averages: number[];
  index: number; flipped: number; fallback: boolean;
  subscriptions: Map<Symbol, Partial<PerformanceMonitorHookApi>>;
  subscribe: (ref: React.RefObject<Partial<PerformanceMonitorHookApi>>) => () => void;
};
export type PerformanceMonitorProps = {
  ms?: number;            // default 250  — sample window length
  iterations?: number;    // default 10   — samples per evaluation
  threshold?: number;     // default 0.75 — fraction of samples that must be out of band
  bounds?: (refreshrate: number) => [lower: number, upper: number];
                          // default: refreshrate > 100 ? [60,100] : [40,60]
  flipflops?: number;     // default Infinity — after `flipped > flipflops` → fallback latch (permanent)
  factor?: number;        // default 0.5  — starting 0..1 "quality normal"
  step?: number;          // default 0.1  — factor delta per incline/decline
  onIncline?/onDecline?/onChange?/onFallback?: (api: PerformanceMonitorApi) => void;
  children?: React.ReactNode;
};
export declare function PerformanceMonitor(props: PerformanceMonitorProps): JSX.Element;
export declare function usePerformanceMonitor({ onIncline, onDecline, onChange, onFallback }: Partial<PerformanceMonitorHookApi>): void; // must be a descendant of <PerformanceMonitor>
```
Behaviour (from `.js`): runs in `useFrame` (so it uses R3F's loop → backend-agnostic, works under WebGPURenderer). Every `ms` it computes fps from `performance.now()` deltas, `refreshrate = max(refreshrate, fps)` (never reset), stores `iterations` averages, then: incline if `> iterations*threshold` averages `>= upper` (`factor = min(1, factor+step)`, `flipped++`), decline if `> iterations*threshold` averages `< lower` (`factor = max(0, factor-step)`, `flipped++`); `onChange` only when `factor` actually changed; `if (flipped > flipflops && !fallback) → fallback=true, onFallback` and sampling STOPS forever (`if (api.fallback) return`). Note `factor` saturates at 0/1 but `onIncline`/`onDecline` and `flipped++` still fire — the exact trap documented in `AdaptiveResolution.tsx:91-104`.
Evaluation cadence with defaults: 10 × 250 ms = every ~2.5 s.

Copy-ready example: the repo's own `src/webgl/AdaptiveResolution.tsx` (bounds/onIncline/onDecline pattern). For a second consumer inside the same monitor tree use `usePerformanceMonitor({ onDecline })` rather than mounting a second `<PerformanceMonitor>` (each one runs its own useFrame sampler).

### 2.2 `useDetectGPU` / `DetectGPU`
File: `node_modules/@react-three/drei/core/DetectGPU.d.ts` + `.js`.
```ts
export const useDetectGPU: (props?: GetGPUTier) => import("detect-gpu").TierResult;
export type DetectGPUProps = { children?: (result: TierResult) => React.ReactNode } & GetGPUTier;
export function DetectGPU({ children, ...options }: DetectGPUProps): JSX.Element;
```
Implementation: `suspend(() => getGPUTier(props), ['useDetectGPU'])` — **suspends** (needs a `<Suspense>` boundary), cached globally under key `['useDetectGPU']` (props ignored after the first call). Works outside `<Canvas>` (no R3F hooks used).

### 2.3 detect-gpu 5.0.70 (`node_modules/detect-gpu/dist/src/index.d.ts`)
```ts
export interface GetGPUTier {
  benchmarksURL?: string;      // default "https://unpkg.com/detect-gpu@5.0.70/dist/benchmarks" (hardcoded in dist/detect-gpu.esm.js)
  glContext?: WebGLRenderingContext | WebGL2RenderingContext; // reuse a context instead of creating a temp one
  failIfMajorPerformanceCaveat?: boolean; // default false
  mobileTiers?: number[];      // default [0, 15, 30, 60]  fps thresholds → tier index
  desktopTiers?: number[];     // default [0, 15, 30, 60]
  override?: {
    renderer?: string; isIpad?: boolean; isMobile?: boolean;
    screenSize?: { width: number; height: number };
    loadBenchmarks?: (file: string) => Promise<ModelEntry[]>;
  };
}
export type TierType = 'SSR' | 'WEBGL_UNSUPPORTED' | 'BLOCKLISTED' | 'FALLBACK' | 'BENCHMARK';
export type TierResult = { tier: number; type: TierType; isMobile?: boolean; fps?: number; gpu?: string; device?: string };
export declare const getGPUTier: (opts?: GetGPUTier) => Promise<TierResult>;
```
Behaviour (from `dist/detect-gpu.esm.js`): SSR → `{tier:0,type:'SSR'}`; creates a temp `webgl` context (`alpha:false, antialias:false, depth:false, powerPreference:'high-performance'`, dropped on Safari12) unless `glContext` given; no context → `tier 0 WEBGL_UNSUPPORTED`; reads `WEBGL_debug_renderer_info` (skipped on Firefox → uses `RENDERER`); empty renderer → `tier 1 FALLBACK`; `isMobile` = `/android/i` UA or iPad/iPhone detection (override-able); fetches `${benchmarksURL}/{m|d}-{vendor}[-ipad].json` (vendor ∈ mobile: adreno, apple, mali-t, mali, nvidia, powervr, samsung; desktop: intel, apple, amd, radeon, nvidia, geforce, adreno) and picks the entry whose screen resolution (`screen.width*dpr × screen.height*dpr`) is closest; blocklisted → `tier 0 BLOCKLISTED`; no match → `tier 1 FALLBACK`; else `tier = highest index i with fps >= tiers[i]` (`type:'BENCHMARK'`, with `fps`, `gpu`, `device`). Throws `OutdatedBenchmarksError` if benchmark file major version < 4.
Benchmark data shipped locally: `node_modules/detect-gpu/dist/benchmarks/*.json` (16 files, 713 KB) — copy to `public/benchmarks/` and pass `benchmarksURL: "/benchmarks"` to avoid the unpkg round-trip (no CSP in `next.config.ts` today, but the fetch is a network dependency and adds latency to a Suspense boundary).

### 2.4 `AdaptiveDpr` (`core/AdaptiveDpr.d.ts` / `.js`)
```ts
export declare function AdaptiveDpr({ pixelated }: { pixelated?: boolean }): null;
```
Behaviour: `setDpr(performance.current * viewport.initialDpr)` on every change of R3F `state.performance.current`; restores `initialDpr` on unmount; optional `imageRendering:'pixelated'` when `current !== 1`. **Depends entirely on `performance.regress()` being called** (see §3). **CONFLICT: it writes the same `setDpr` that `AdaptiveResolution` owns → do not mount both.**

### 2.5 `AdaptiveEvents` (`core/AdaptiveEvents.js`)
```ts
export declare function AdaptiveEvents(): null;
```
Behaviour: `setEvents({ enabled: performance.current === 1 })` — disables R3F pointer raycasting while regressed. Harmless with the repo's canvas (`pointer-events:none`, `CanvasHost.tsx`), i.e. no benefit either.

### 2.6 `Bvh` / `useBVH` (`core/Bvh.d.ts` / `.js`)
```ts
export interface BVHOptions { strategy?: SplitStrategy; verbose?: boolean; setBoundingBox?: boolean; maxDepth?: number; maxLeafTris?: number; indirect?: boolean }
export type BvhProps = BVHOptions & ThreeElements['group'] & { enabled?: boolean; firstHitOnly?: boolean };
export declare const Bvh: ForwardRefComponent<BvhProps, Group>;
/** @deprecated Use the Bvh component instead */ export declare function useBVH(mesh: React.RefObject<Mesh|undefined>, options?: BVHOptions): void;
```
Defaults: `strategy=SAH, setBoundingBox=true, maxDepth=40, maxLeafTris=10, indirect=false, enabled=true, firstHitOnly=false`. Traverses children once on mount, swaps `raycast` for `acceleratedRaycast` and builds `geometry.boundsTree`; sets `raycaster.firstHitOnly` globally ("can only safely work if the component is used once"). Raycast-only speedup — irrelevant to a `pointer-events:none` decorative canvas unless the plan adds R3F pointer events. `useBVH` is DEPRECATED (JSDoc in `core/Bvh.js`).

---

## 3. ALLOWED APIs — @react-three/fiber 9.6.1 performance / DPR

File: `node_modules/@react-three/fiber/dist/declarations/src/core/store.d.ts` (types); runtime in `dist/events-b389eeca.esm.js`.

```ts
export type Dpr = number | [min: number, max: number];                     // store.d.ts:16
export interface Performance {                                             // store.d.ts:37-48
  current: number;   // 0..1 normal, default 1
  min: number;       // default 0.5
  max: number;       // default 1
  debounce: number;  // ms until current returns to max, default 200
  regress: () => void; // sets current=min, restarts debounce timer, then current=max
}
RootState.performance: Performance;                                        // store.d.ts:102
RootState.viewport: { initialDpr: number; dpr: number; ... }               // store.d.ts:24-35
RootState.setDpr: (dpr: Dpr) => void;                                      // store.d.ts:118
RootState.setSize / setFrameloop / setEvents / invalidate / advance / frameloop: 'always'|'demand'|'never'
```
Canvas props (`dist/declarations/src/core/renderer.d.ts:45-52`):
```ts
frameloop?: Frameloop;
performance?: Partial<Omit<Performance, 'regress'>>;   // { current?, min?, max?, debounce? }
dpr?: Dpr;                                             // "Target pixel ratio. Can clamp between a range: [min, max]"
```
Runtime facts (`events-b389eeca.esm.js`):
- `calculateDpr(dpr)` L93-98: array form → `Math.min(Math.max(dpr[0], window.devicePixelRatio ?? 2), dpr[1])` (i.e. **device dpr clamped into [min,max]**, not "adaptive"); number → as-is. Default Canvas `dpr = [1, 2]` (L15604).
- `setDpr` L1077-1086: writes `viewport.dpr` (and `initialDpr` if unset); a store subscriber (L1148-1165) then calls `gl.setPixelRatio(viewport.dpr)` + `gl.setSize(size.w, size.h, updateStyle)` and `updateCamera` — this is the realloc "hitch" AdaptiveResolution comments about.
- `performance.regress()` L1026-1034: `clearTimeout; if current!==min setPerformanceCurrent(min); setTimeout(() => setPerformanceCurrent(max), debounce)`. Nothing calls it automatically — the app must call `regress()` (e.g. from scroll/drag handlers, or drei controls do so with `regress` prop). Grep shows **no `regress(` calls in `src/`**.
- Canvas `performance` prop is shallow-merged into state on each render (L15720-15726).
- Reading in components: `useThree(s => s.performance.current)`, `useThree(s => s.viewport.dpr)`, `useThree(s => s.setDpr)`.

Copy-ready: `AdaptiveResolution.tsx` (`useThree(s => s.setDpr)`), `Scene.tsx:273` (`dpr={dprInitial}` number form).

---

## 4. ALLOWED APIs — three r184 renderer capability / info

### 4.1 `WebGLRenderer.capabilities` (`node_modules/@types/three/src/renderers/webgl/WebGLCapabilities.d.ts`, impl `node_modules/three/src/renderers/webgl/WebGLCapabilities.js`)
```ts
readonly isWebGL2: boolean;          // ALWAYS true (hardcoded, "keeping this for backwards compatibility", WebGLCapabilities.js:119)
getMaxAnisotropy(): number;
getMaxPrecision(precision: string): string;   // 'highp' | 'mediump' | 'lowp' via getShaderPrecisionFormat
textureFormatReadable(f): boolean; textureTypeReadable(t): boolean;
precision: string;                   // resolved from parameters.precision (default 'highp'), downgraded with a warn()
logarithmicDepthBuffer: boolean; reversedDepthBuffer: boolean;  // reversedDepthBuffer needs EXT_clip_control
maxTextures: number;                 // gl.MAX_TEXTURE_IMAGE_UNITS
maxVertexTextures: number; maxTextureSize: number; maxCubemapSize: number;
maxAttributes: number; maxVertexUniforms: number; maxVaryings: number; maxFragmentUniforms: number;
maxSamples: number;                  // gl.MAX_SAMPLES (MSAA ceiling)
samples: number;                     // gl.SAMPLES of the default framebuffer
```
Access: `useThree(s => s.gl).capabilities` (only when `backendOf(gl) === "webgl2"` AND the flag is OFF — a `WebGPURenderer` has NO `.capabilities`; the fallback `WebGLBackend` has an internal `utils/WebGLCapabilities` with only `getMaxAnisotropy()`).

`WebGLRendererParameters` (`@types/three/src/renderers/WebGLRenderer.d.ts:28-84`): `precision?` (via `WebGLCapabilitiesParameters`), `powerPreference?: WebGLPowerPreference`, `failIfMajorPerformanceCaveat?`, `antialias?`, `alpha?`, `outputBufferType?`, `logarithmicDepthBuffer?`, `reversedDepthBuffer?`. Also `renderer.debug.checkShaderErrors` (default true; set false in prod for a small compile-time win), `renderer.forceContextLoss()`, `getPixelRatio()`, `getDrawingBufferSize(v2)`.

### 4.2 `WebGLRenderer.info` (`@types/three/src/renderers/webgl/WebGLInfo.d.ts`)
```ts
autoReset: boolean;                       // default true (reset each render())
memory: { geometries: number; textures: number };
programs: WebGLProgram[] | null;
render: { calls: number; frame: number; lines: number; points: number; triangles: number };
reset(): void;
```

### 4.3 WebGPURenderer (three/webgpu) backend detection & info
- `WebGPURenderer` constructor (`three/src/renderers/webgpu/WebGPURenderer.js:52-78`): `forceWebGL` → `WebGLBackend`; else `WebGPUBackend` with `parameters.getFallback = () => new WebGLBackend(parameters)` (+ `warn('WebGPURenderer: WebGPU is not available, running under WebGL2 backend.')`). Fallback is applied inside `Renderer.init()` when `backend.init()` throws (`common/Renderer.js:751-777`). Options doc (L33-46): `antialias=false`, `samples=0` (4 when antialias), `outputBufferType=HalfFloatType` (can be `UnsignedByteType` "to save memory and bandwidth"), `forceWebGL`, `reversedDepthBuffer`, `logarithmicDepthBuffer`.
- Backend flags: `WebGPUBackend.isWebGPUBackend = true` (`webgpu/WebGPUBackend.js:66`; typed `readonly isWebGPUBackend: true` in `@types/three/src/renderers/webgpu/WebGPUBackend.d.ts:22`); `WebGLBackend.isWebGLBackend = true` (`webgl-fallback/WebGLBackend.js:57`). Each backend sets ONLY its own flag → test positively (repo's `backendOf` already does this correctly).
- `renderer.backend: Backend` (`@types/three/src/renderers/common/Renderer.d.ts:95`), `renderer.init(): Promise<this>` (L660), `renderer.hasFeature(name): boolean` (L1321; throws if called before init; `hasFeatureAsync` **deprecated r181**, L1312/Renderer.js:2818), `renderer.getMaxAnisotropy()` (L834), `renderer.onDeviceLost(info)` (L516), `renderer.resolveTimestampsAsync(type?: 'render'|'compute')` (needs `trackTimestamp:true` and the `timestamp-query` feature; `WebGPUBackend.js:256`).
- `WebGPUBackendParameters` (`WebGPUBackend.d.ts:8-19`): `alpha`, `requiredLimits`, `trackTimestamp`, `device`, `powerPreference: 'low-power'|'high-performance'`, `context`, `outputType`. Adapter is requested with `featureLevel:'compatibility'` (`WebGPUBackend.js:189-194`) and ALL adapter features are requested; `compatibilityMode = !device.features.has('core-features-and-limits')` forces `renderer._samples = 0` (L231-237). `this.device.limits.*` is reachable via `renderer.backend.device.limits` (untyped; used internally at L1473).
- `renderer.info: Info` (`@types/three/src/renderers/common/Info.d.ts`): `autoReset`, `frame`, `calls`, `render {calls, frameCalls, drawCalls, triangles, points, lines, timestamp}`, `compute {calls, frameCalls, timestamp}`, `memory {geometries, textures, attributes, indexAttributes, storageAttributes, indirectStorageAttributes, readbackBuffers, programs, renderTargets, total, texturesSize, attributesSize, …}`, `reset()`.
- WebGPU-path post stack knobs (`three/src/renderers/common/RenderPipeline.js` / `PostProcessing.js`; `nodes/display/PassNode.js`; `examples/jsm/tsl/display/BloomNode.js`): `PostProcessing.needsUpdate`, `.outputColorTransform`, `.render()` (`renderAsync` deprecated r181), `.dispose()`; `PassNode.setResolutionScale(n)` (r181+; `.setResolution()` deprecated) — the cheapest per-pass fill lever; `BloomNode.strength/.radius/.threshold/.smoothWidth` uniforms, `_nMips = 5`, `setSize()` re-derived every frame from `renderer.getDrawingBufferSize()` (so DPR drops shrink bloom targets automatically). `bloom(node, strength, radius, threshold)` factory (`BloomNode.js:532`). The repo's `PostFXNodes.tsx` already keeps `bloomPass.strength/.radius` uniform refs.

---

## 5. ALLOWED APIs — postprocessing 6.39.1 + @react-three/postprocessing 3.0.4

### 5.1 `EffectComposer` (`node_modules/postprocessing/build/types/index.d.ts:4783-4960`, impl `build/index.js:917-1300`)
```ts
constructor(renderer?: WebGLRenderer, { depthBuffer = true, stencilBuffer = false, alpha /*deprecated: always RGBA since r137*/, multisampling = 0, frameBufferType }?)
inputBuffer/outputBuffer: WebGLRenderTarget; passes: Pass[]; autoRenderToScreen: boolean;
get/set multisampling(): number;      // "Requires WebGL 2. Set to zero to disable" — setter disposes + recreates both buffers (index.js:952-971)
addPass(pass, index?); removePass(pass); removeAllPasses(); render(deltaTime?); setSize(w,h,updateStyle?); reset(); dispose();
setRenderer(r); getRenderer(); setMainScene(s); setMainCamera(c); getTimer();
```
- `frameBufferType`: "recommended to use HalfFloatType if possible"; `UnsignedByteType` + sRGB output → the buffer's `colorSpace = SRGBColorSpace` (index.js:1141-1143). README L54-66: HalfFloat = linear HDR, needed for tone mapping at the end of the chain; UnsignedByte = cheaper (half the bandwidth) but bands in dark scenes.
- `createBuffer()` sets `renderTarget.samples = multisampling` (index.js:1138-1140) → MSAA cost is a render-target property.
- **Cheap disable**: `Pass.enabled: boolean` (types L2834) — `EffectComposer.render()` does `if (!pass.enabled) continue;` (index.js:1273) — zero GPU cost when off. `Pass.setEnabled/isEnabled` are `@deprecated`. `EffectPass(camera, ...effects)` merges effects into one fullscreen pass; changing the effect list requires `recompile()`/`updateMaterial()` (types L4358-4360). Effects can be blended out via `effect.blendMode.opacity.value = 0` but that still runs the shader — prefer `pass.enabled = false`.
- `BloomEffect` options (types under `export class BloomEffect`): `luminanceThreshold=1`, `luminanceSmoothing`, `mipmapBlur=true`, `intensity=1`, `radius`, `levels=8` (mip count, only with mipmapBlur → fewer levels = cheaper), `kernelSize/resolutionScale/resolutionX/Y/width/height` **deprecated ("Use mipmapBlur instead")**.

### 5.2 `@react-three/postprocessing` `EffectComposer` (`node_modules/@react-three/postprocessing/dist/EffectComposer.d.ts`, impl `dist/index.js` minified `dt`)
```ts
export type EffectComposerProps = {
  enabled?: boolean;            // default true — when false the useFrame skips composer.render() entirely (and R3F still suppresses default render because priority>0 is registered only when enabled: `J(..., a ? n : 0)`)
  children: JSX.Element | JSX.Element[];
  depthBuffer?: boolean; stencilBuffer?: boolean; autoClear?: boolean;   // autoClear default true
  enableNormalPass?: boolean;   // SSGI only
  resolutionScale?: number;     // only feeds DepthDownsamplingPass when enableNormalPass — NOT a global scale
  multisampling?: number;       // DEFAULT 8 (!)  — repo's PostFX.tsx passes multisampling={0}
  frameBufferType?: TextureDataType;  // DEFAULT HalfFloatType
  renderPriority?: number;      // default 1
  camera?: Camera; scene?: Scene;
};
export declare const EffectComposer: NamedExoticComponent<EffectComposerProps & RefAttributes<EffectComposerImpl>>;
export const EffectComposerContext: Context<{ composer, normalPass, downSamplingPass, camera, scene, resolutionScale? }>;
```
Runtime facts (dist/index.js): composer is `useMemo`'d on `[camera, gl, depthBuffer, stencilBuffer, multisampling, frameBufferType, scene, enableNormalPass, resolutionScale]` → changing `multisampling`/`frameBufferType` at runtime REBUILDS the composer (all passes re-added). It sets `gl.toneMapping = NoToneMapping` while mounted. Effects children are grouped into `EffectPass`es in `useLayoutEffect`. `Bloom` wrapper (`dist/effects/Bloom.d.ts`) is `[x: string]: any` — passes options straight to `BloomEffect`, so `levels`, `mipmapBlur`, `luminanceThreshold`, `intensity`, `radius` are all valid props.
- WebGL-only: constructor typed against `WebGLRenderer`; `Scene.tsx:469-476` documents it crashes with `three/webgpu` (uses `renderer.getContext().getContextAttributes()`). Keep the existing build-time split (`webgpuEnabled()` → `PostFXNodes`, else `PostFX`).
- Cheapest per-tier controls on the WebGL path, in order: unmount `<PostFX>` (already gated `tier === "full"`, `Scene.tsx:492`); `<EffectComposer enabled={false}>`; drop `multisampling` (repo already 0); `frameBufferType={UnsignedByteType}` for weak GPUs (banding trade-off); `<Bloom levels={4..5}>` instead of default 8; `pass.enabled=false` via a ref for individual passes.

---

## 6. DEPRECATED / REMOVED — do NOT use (with proof)

| API | Status | Proof |
|---|---|---|
| `renderer.capabilities.floatFragmentTextures`, `.floatVertexTextures`, `.vertexTextures` | **REMOVED** in three r184 (WebGL1 gone) | `grep -rn floatFragmentTextures\|floatVertexTextures\|vertexTextures node_modules/three/src/` → no results; not in `@types/three/.../WebGLCapabilities.d.ts` |
| `renderer.capabilities.isWebGL2` | present but **always `true`** — useless as a tier signal | `three/src/renderers/webgl/WebGLCapabilities.js:119` `isWebGL2: true, // keeping this for backwards compatibility` |
| `renderer.hasFeatureAsync()` (WebGPU) | deprecated r181 → use `await renderer.init()` then `hasFeature()` | `three/src/renderers/common/Renderer.js:2818` |
| `RenderPipeline/PostProcessing.renderAsync()` | deprecated r181 → `render()` | `three/src/renderers/common/RenderPipeline.js:245` |
| `PassNode.setResolution()` | deprecated r181 → `setResolutionScale()` | `three/src/nodes/display/PassNode.js:484-490` |
| `EffectComposer` option `alpha` | deprecated (always RGBA since r137) | `postprocessing/build/types/index.d.ts:4793` |
| `Pass.setEnabled()/isEnabled()` | deprecated → `pass.enabled` | `postprocessing/build/types/index.d.ts` types L2874 (`isEnabled`), L2881 (`setEnabled`) |
| `BloomEffect` `kernelSize`, `resolutionScale`, `resolutionX/Y`, `width/height` | deprecated → `mipmapBlur` (+ `levels`) | `postprocessing/build/types/index.d.ts` BloomEffect JSDoc |
| `EffectPass.encodeOutput` getter/setter | deprecated → `fullscreenMaterial.encodeOutput` | types L4383 |
| `EffectComposer.replaceRenderer()` | deprecated → `setRenderer()` | types L4885 |
| drei `useBVH()` | deprecated → `<Bvh>` | `@react-three/drei/core/Bvh.js` JSDoc `@deprecated Use the Bvh component instead` |
| R3F `state.mouse` | deprecated → `state.pointer` | `fiber/dist/declarations/src/core/store.d.ts:88` |
| drei `PerformanceMonitor flipflops` (finite) | not deprecated but **latches the monitor off permanently**; counts every callback incl. no-ops | `core/PerformanceMonitor.js` (`if (api.flipped > flipflops …) api.fallback = true`; `if (api.fallback) return`) — repo already avoids it (`AdaptiveResolution.tsx:91-104`) |
| drei `AdaptiveDpr` alongside `AdaptiveResolution` | not deprecated but **mutually exclusive** (both own `setDpr`) | `core/AdaptiveDpr.js` `setDpr(current * initialDpr)` vs `AdaptiveResolution.tsx:83` |
| WebGL1 contexts (`probe.getContext("webgl")` as a capability probe) | three r184 requires WebGL2; a WebGL1-only device will still fail renderer creation | `tierStore.detectTier()` L95 falls back to `"webgl"` → **latent bug**: on a WebGL1-only device tier resolves `lite`/`full` and `WebGLRenderer` throws. Prefer `webgl2` only (as `detectPhoneGL` already does) |

---

## 7. Copy-ready example locations (installed sources)
- drei `PerformanceMonitor` full algorithm: `node_modules/@react-three/drei/core/PerformanceMonitor.js` (≈90 lines).
- Repo pattern for stepped DPR with hysteresis: `src/webgl/AdaptiveResolution.tsx`.
- Repo pattern for GPU-class → DPR range: `src/webgl/store/tierStore.ts:163-213`.
- Repo pattern for runtime backend detection: `src/webgl/renderer/createRenderer.ts:126-141` + `src/webgl/Scene.tsx:283-295` (`onCreated`).
- Repo pattern for a temporary DPR cap from the DOM: `src/components/sections/singularity-passage.tsx:873-875, 1318` (`useTierStore.getState().setDprCap(on ? SEQ.DPR_CAP : null)`).
- detect-gpu usage: `node_modules/detect-gpu/README.md` "Usage"/"API" sections; benchmark JSONs at `node_modules/detect-gpu/dist/benchmarks/`.
- postprocessing HalfFloat setup: `node_modules/postprocessing/README.md` L54-66.
- R3P EffectComposer minified impl (multisampling default 8, `enabled` gate): `node_modules/@react-three/postprocessing/dist/index.js` (function `dt`).
- three WebGPU bloom node: `node_modules/three/examples/jsm/tsl/display/BloomNode.js` (constructor uniforms L77-98, `setSize` L262-283).

---

## 8. Gaps / risks the plan must decide (not resolvable from node_modules alone)

1. **`degrade()` has no caller.** tierStore header says drei PerformanceMonitor downgrades at runtime; nothing wires `onDecline`→`degrade()`. If the plan wants tier demotion (full→lite unmounts PostFX/RailPlanes/etc.), it must add it explicitly (probably via `usePerformanceMonitor` inside `AdaptiveResolution`'s monitor tree, only when `dpr === dprMin` still declines) — and note `degrade()` clears `heroReady`, and lite→off unmounts the whole Canvas.
2. **detect-gpu network dependency.** Default `benchmarksURL` = unpkg; the 16 JSON files (713 KB total, one ~40-90 KB file fetched per vendor) are in node_modules and can be self-hosted under `public/benchmarks`. `useDetectGPU` suspends and caches under a fixed key (`['useDetectGPU']`) — options are frozen after the first call. It creates its own throwaway WebGL context unless `glContext` is passed (tierStore's `resolve()` already creates probes; passing one avoids a 3rd context). It only classifies via `WEBGL_debug_renderer_info` — Safari/Firefox hide/mask it → `FALLBACK tier 1`, and Apple GPUs get deobfuscated by drawing tests. tierStore's `detectDprRange` comment (L193-201) already documents that iOS reports "" or "Apple GPU"; detect-gpu's `deobfuscateAppleGPU` is the only shipped answer to that.
3. **`tier` semantic debt** (tierStore L12-19): 13 call sites conflate layout with capability; the plan should add capability/budget axes (e.g. `gpuTier: 0|1|2|3`, `postFxLevel`, `particleBudget`) rather than redefine `tier`.
4. **Two post stacks.** `PostFX` (WebGL, R3P) vs `PostFXNodes` (WebGPU, TSL) have different knobs: R3P → `enabled`, `multisampling`, `frameBufferType`, `Bloom levels`; TSL → `PassNode.setResolutionScale`, bloom uniforms, `PostProcessing.needsUpdate`. `PostFXNodes` types its lazily-imported objects structurally (`PostProcessingLike`, `UniformNode`), so any new knob must be added to those local interfaces.
5. **R3F `performance.regress()` is unused**; `AdaptiveDpr`/`AdaptiveEvents` are therefore inert unless the plan starts calling `regress()` (e.g. from Lenis scroll velocity). If adopted, it must replace — not coexist with — `AdaptiveResolution`'s `setDpr` ownership.
6. **`Scene.tsx:52-56` stale comment** claims PerformanceMonitor is not mounted; it is (via `AdaptiveResolution`, L304). Fix the comment when touching the file.
7. **WebGL1 probe fallback** in `detectTier()` (`?? probe.getContext("webgl")`) — see §6 last row.
8. **`WebGPURenderer.capabilities` does not exist**; capability queries on the WebGPU path go through `renderer.hasFeature(name)` (post-init) or `renderer.backend.device.limits` (untyped) — the plan needs a small typed adapter if it wants `maxTextureSize`-style numbers on both paths.
9. **detect-gpu is not a direct dependency** — importing `detect-gpu` directly relies on hoisting; import through `@react-three/drei` (`useDetectGPU`) or add `detect-gpu@^5.0.70` to `package.json`.
10. **drei docs are not shipped** (README only links to pmndrs.github.io/drei); everything above is from `.d.ts` + `.js`.

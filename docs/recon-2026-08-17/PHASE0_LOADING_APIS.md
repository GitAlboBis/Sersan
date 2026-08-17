# LOADING & PRELOADER PLUMBING — Allowed APIs (ground truth = installed node_modules)

Repo: `C:/Users/alber/Sersan`. All paths below are relative to `C:/Users/alber/Sersan/node_modules/` unless absolute.
Discovery date: 2026-08-17. Nothing under `src/` was modified.

## 0. Installed versions (read from package.json files)

| Package | Version | Where verified |
|---|---|---|
| three | **0.184.0** (r184) | `three/package.json` |
| @types/three | 0.184.1 | `@types/three/package.json` (dep in root `package.json`) |
| @react-three/fiber | **9.6.1** | `@react-three/fiber/package.json` |
| @react-three/drei | **10.7.7** | `@react-three/drei/package.json` |
| three-stdlib (drei's loader source) | 2.36.1 | `three-stdlib/package.json` (drei dep `"three-stdlib": "^2.35.6"`) |
| suspend-react (R3F useLoader cache) | 0.1.3 | `suspend-react/package.json` |
| meshoptimizer | 1.1.1 | `meshoptimizer/package.json` |
| next | **16.2.6** | `next/package.json` |
| react / react-dom | 19.2.4 | `react/package.json` |
| typescript | 5.9.3 | `typescript/package.json` |

Build note (matters for the WebGPU path): `three/build/three.module.js` AND `three/build/three.webgpu.js` both `import … from './three.core.js'` and re-export `LoadingManager, DefaultLoadingManager, Cache, FileLoader, Loader, TextureLoader, ImageLoader, ImageBitmapLoader, CompressedTexture` from that shared core (`three/build/three.webgpu.js` line 7 export list; `three/build/three.module.js` lines 6-7). Consequence: `DefaultLoadingManager` is ONE singleton across `three`, `three/webgpu`, `three/addons/*` and `three-stdlib` — drei's `useProgress` sees loads from every loader regardless of which build the renderer came from.

Package export map (`three/package.json` lines 8-20): `"three"`, `"three/webgpu"`, `"three/tsl"`, `"three/addons/*"` → `examples/jsm/*`, `"three/examples/jsm/*"`, `"three/src/*"`.

---

## 1. three r184 — LoadingManager / DefaultLoadingManager

Source: `three/src/loaders/LoadingManager.js` · Types: `@types/three/src/loaders/LoadingManager.d.ts`

```ts
new LoadingManager(
  onLoad?: () => void,
  onProgress?: (url: string, loaded: number, total: number) => void,
  onError?: (url: string) => void,
)
manager.onStart:    ((url: string, loaded: number, total: number) => void) | undefined  // NOT settable via ctor (see #5689 comment, JS line 37)
manager.onLoad:     () => void
manager.onProgress: (url: string, loaded: number, total: number) => void
manager.onError:    (url: string) => void
manager.itemStart(url: string): void   // itemsTotal++ ; fires onStart only on the FIRST item of a batch (isLoading false→true)
manager.itemEnd(url: string): void     // itemsLoaded++ ; fires onProgress(url, itemsLoaded, itemsTotal); when loaded===total → isLoading=false, onLoad()
manager.itemError(url: string): void   // fires onError(url) (FileLoader then ALSO calls itemEnd → the item still counts as done)
manager.resolveURL(url: string): string
manager.setURLModifier(cb?: (url: string) => string): this
manager.addHandler(regex: RegExp, loader: Loader): this
manager.removeHandler(regex: RegExp): this
manager.getHandler(file: string): Loader | null
manager.abortController: AbortController        // getter, lazily created (JS lines 300-310)
manager.abort(): this                            // NEW-ish: aborts all loaders using this manager (needs Loader#abort + AbortSignal.any)
export const DefaultLoadingManager: LoadingManager   // JS line 323, `/*@__PURE__*/ new LoadingManager()`
```

Facts to design around (all read from the JS):
- `itemsLoaded` / `itemsTotal` are **closure-private counters** — not readable as properties. They are only exposed as the `loaded`/`total` args of `onStart`/`onProgress`. They are never reset; each new batch (after `onLoad`) keeps counting up (drei's `useProgress` compensates with `saveLastTotalLoaded`, see §4).
- `onLoad` fires when `itemsLoaded === itemsTotal` inside `itemEnd`. A loader that starts a new item synchronously *after* onLoad re-arms the manager (a second `onStart`).
- Which loaders touch the manager: `FileLoader` (`itemStart` line 320 / `itemEnd` 316 / `itemError` 297,311, and for cache hits 90-96), `ImageLoader` (`itemStart` 59 / `itemEnd` 65), `GLTFLoader.load` (`this.manager.itemStart(url)` then `itemEnd` on parse complete — `three/examples/jsm/loaders/GLTFLoader.js` ~lines 293-338; comment "ensures manager.onLoad() does not fire early"). `KTX2Loader.init()` loads `basis_transcoder.js` + `.wasm` through `new FileLoader(this.manager)` → those two count as items too (KTX2Loader.js 283-294). `DRACOLoader._loadLibrary` likewise (`DRACOLoader.js` 331).
- Progress is **item-count** based (files done / files started), not bytes. Byte progress only exists per-file via the loader `onProgress(ProgressEvent)` callback (see FileLoader below).

## 2. three r184 — Cache

Source: `three/src/loaders/Cache.js`
```ts
Cache.enabled: boolean            // default false — set `THREE.Cache.enabled = true` once to enable
Cache.files: Record<string, unknown>
Cache.add(key: string, file): void  // no-op if !enabled or key is blob: URL
Cache.get(key: string): unknown | undefined
Cache.remove(key: string): void
Cache.clear(): void
```
Keys used internally: `FileLoader` → `` `file:${url}` `` (FileLoader.js 86, 275); `ImageLoader` → `` `image:${url}` `` (ImageLoader.js 53). Cache hits still call `manager.itemStart/itemEnd` (async via setTimeout 0) so progress accounting stays consistent.

## 3. three r184 — Loader base, FileLoader progress, TextureLoader

`three/src/loaders/Loader.js` / `@types/three/src/loaders/Loader.d.ts`:
```ts
class Loader<TData = unknown, TUrl = string> {
  constructor(manager?: LoadingManager)
  crossOrigin: string ('anonymous'); withCredentials: boolean; path: string; resourcePath: string; manager: LoadingManager; requestHeader: Record<string,string>
  load(url: TUrl, onLoad: (data: TData) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void): void
  loadAsync(url: TUrl, onProgress?: (event: ProgressEvent) => void): Promise<TData>
  setCrossOrigin / setWithCredentials / setPath / setResourcePath / setRequestHeader → this
  abort(): this        // Loader.js line 188 — base is a no-op hook; FileLoader implements it (FileLoader.js 355)
}
```
- `FileLoader` (fetch-based) emits `new ProgressEvent('progress', { lengthComputable, loaded, total })` per chunk; `total` comes from `Content-Length` or `X-File-Size` header (FileLoader.js 160-190). Uses `AbortSignal.any([this._abortController.signal, this.manager.abortController.signal])` when available (line 133).
- `TextureLoader` (`@types/three/src/loaders/TextureLoader.d.ts`): `load(url, onLoad?, onProgress?, onError?): Texture<HTMLImageElement>` — returns the Texture synchronously (image fills in later). Internally `new ImageLoader(this.manager)`; the `onProgress` arg is effectively unused for images (no byte events).

## 4. three r184 — KTX2Loader (three/addons) — WebGPU vs WebGL detectSupport

Source: `three/examples/jsm/loaders/KTX2Loader.js` · Types: `@types/three/examples/jsm/loaders/KTX2Loader.d.ts`
Import: `import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'` (JSDoc `@three_import`, line 137).

```ts
class KTX2Loader extends Loader<CompressedTexture> {
  constructor(manager?: LoadingManager)
  setTranscoderPath(path: string): this            // JS 179 — folder containing basis_transcoder.js + basis_transcoder.wasm
  setWorkerLimit(limit: number): this               // JS 193
  detectSupport(renderer: WebGLRenderer | WebGPURenderer): this   // JS 227 — SYNC. Must be called before load()/parse()
  detectSupportAsync(renderer: Renderer): Promise<this>          // JS 210 — @deprecated r181: console.warn + `await renderer.init()` + detectSupport
  init(): Promise<void>                             // JS 279 — loads transcoder js+wasm via FileLoader(this.manager); called lazily by _createTexture
  load(url, onLoad?: (t: CompressedTexture)=>void, onProgress?, onError?): void   // JS 359 — THROWS if workerConfig===null ("Missing initialization with `.detectSupport( renderer )`")
  parse(buffer: ArrayBuffer, onLoad?, onError?): void            // JS 391 — same throw
  dispose(): this                                   // JS 496 — kills worker pool, revokes blob URL, decrements _activeLoaders
  workerConfig: KTX2LoaderWorkerConfig | null       // {astcSupported, astcHDRSupported, etc1Supported, etc2Supported, dxtSupported, bptcSupported, pvrtcSupported}
}
```
`detectSupport` branches (JS 227-273):
- `renderer.isWebGPURenderer === true` → uses `renderer.hasFeature('texture-compression-astc' | 'texture-compression-etc1' | 'texture-compression-etc2' | 'texture-compression-s3tc' | 'texture-compression-bc' | 'texture-compression-pvrtc')`; `astcHDRSupported` forced false.
- else (WebGLRenderer) → `renderer.extensions.has('WEBGL_compressed_texture_astc' | …)`; extra Apple/ANGLE guard disables ASTC/ETC2 when all four are reported (JS 256-268).
- **`renderer.hasFeature()` THROWS if the WebGPURenderer is not initialised** (`three/src/renderers/common/Renderer.js` 2841-2849: `if (this._initialized === false) throw new Error('Renderer: .hasFeature() called before the backend is initialized. Use "await renderer.init();" …')`). So on the WebGPU path `await renderer.init()` must precede `detectSupport(gl)` — R3F's async gl factory (see §7) already guarantees this by the time `onCreated`/`useThree().gl` exists.
- Multiple KTX2Loader instances warn (JS 331-337): use ONE instance (memoised) per app.

Transcoder assets to copy to `public/` (they are NOT served by Next automatically): `three/examples/jsm/libs/basis/basis_transcoder.js` + `basis_transcoder.wasm` (527,333 bytes). README: `three/examples/jsm/libs/basis/README.md`.

## 5. three r184 — DRACOLoader, GLTFLoader, MeshoptDecoder

DRACOLoader — `three/examples/jsm/loaders/DRACOLoader.js`, `@types/three/examples/jsm/loaders/DRACOLoader.d.ts`:
```ts
new DRACOLoader(manager?)
setDecoderPath(path: string): DRACOLoader     // JS 90 — folder with draco_decoder.wasm/js + draco_wasm_wrapper.js
setDecoderConfig(config: object): DRACOLoader // JS 104 — e.g. { type: 'js' | 'wasm' }
setWorkerLimit(n: number): DRACOLoader        // JS 119
preload(): DRACOLoader                        // JS 346 — starts fetching the decoder immediately (good for a preloader phase)
load / parse / dispose()                      // JS 136 / 160 / 471
```
Decoder assets: `three/examples/jsm/libs/draco/gltf/{draco_decoder.js, draco_decoder.wasm (192,420 B), draco_wasm_wrapper.js}` — copy to `public/draco/`.

GLTFLoader — `three/examples/jsm/loaders/GLTFLoader.js`, `@types/three/examples/jsm/loaders/GLTFLoader.d.ts`:
```ts
class GLTFLoader extends Loader<GLTF> {
  constructor(manager?)
  setDRACOLoader(d: DRACOLoader): this                       // JS 348
  setKTX2Loader(k: KTX2Loader | null): this                  // JS 362
  setMeshoptDecoder(m: typeof MeshoptDecoder | null): this   // JS 376
  register(cb: (parser) => GLTFLoaderPlugin): this / unregister
  load(url, onLoad, onProgress?, onError?): void             // JS 264
  parse(data: ArrayBuffer|string, path: string, onLoad, onError?): void
  parseAsync(data, path): Promise<GLTF>                      // JS 560
}
interface GLTF { animations: AnimationClip[]; scene: Group; scenes: Group[]; cameras: Camera[]; asset: {...}; parser: GLTFParser; userData }
```
Supports `EXT_meshopt_compression`, `KHR_draco_mesh_compression`, `KHR_texture_basisu` (needs KTX2Loader), `EXT_texture_webp/avif` (JSDoc header 80-110). Uses `ImageBitmapLoader` for images "whenever possible" (non-Safari<17 / non-Firefox<98, JS 2579-2600) — image bitmaps are not `Cache`d and are decoded off-thread.

MeshoptDecoder — `three/examples/jsm/libs/meshopt_decoder.module.js` is `export * from "meshoptimizer/decoder"` → `meshoptimizer/meshopt_decoder.mjs` (types `meshoptimizer/meshopt_decoder.d.ts`):
```ts
export const MeshoptDecoder: {
  supported: boolean; ready: Promise<void>;
  useWorkers(count: number): void;
  decodeGltfBuffer(...); decodeGltfBufferAsync(...): Promise<Uint8Array>; …
}
```
Import: `import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'` then `gltfLoader.setMeshoptDecoder(MeshoptDecoder)`. Await `MeshoptDecoder.ready` if you want the wasm compiled inside the preloader budget.

## 6. three r184 — WebGPURenderer async init (relevant to gl factory + KTX2)

`three/src/renderers/common/Renderer.js` / `@types/three/src/renderers/common/Renderer.d.ts`; `three/src/renderers/webgpu/WebGPURenderer.js`:
```ts
new WebGPURenderer({ canvas?, alpha=true, antialias=false, samples, depth, stencil, forceWebGL=false, logarithmicDepthBuffer, reversedDepthBuffer, outputType, outputBufferType, multiview })
renderer.init(): Promise<this>          // Renderer.js 743 — memoised (_initPromise); backend.init, WebGL2 fallback via getFallback (WebGPURenderer.js 57-69, warns "WebGPU is not available, running under WebGL2 backend.")
renderer.initialized: boolean (getter)  // Renderer.js 1310
renderer.hasInitialized(): boolean      // 2858
renderer.hasFeature(name: string): boolean          // 2841 — THROWS before init
renderer.hasFeatureAsync(name): Promise<boolean>    // 2816 — @deprecated r181 (warnOnce)
renderer.render(scene, camera)          // 1294 — THROWS "render() called before the backend is initialized" if !_initialized
renderer.renderAsync()                  // 1038 — @deprecated r181
renderer.compileAsync(scene, camera, targetScene?): Promise<void>  // 860 ; `get compile()` is an alias returning compileAsync (3630)
renderer.initTexture(texture): void     // 2891 — THROWS before init ; initTextureAsync @deprecated r181
renderer.isWebGPURenderer = true        // WebGPURenderer.js 95 (set even when running on the WebGL2 fallback backend!)
```
`three/examples/jsm/capabilities/WebGPU.js`: `WebGPU.isAvailable(): boolean`, `WebGPU.getErrorMessage()` — note this module uses top-level `await navigator.gpu.requestAdapter()`.

The repo already does the right thing in `src/webgl/renderer/createRenderer.ts` (`createWebGPURenderer`: dynamic `import("three/webgpu")`, `new WebGPURenderer(props)`, `await renderer.init()`, forceWebGL retry) — copy-ready reference.

## 7. @react-three/fiber 9.6.1 — Canvas props, async `gl` factory, useLoader

Types: `@react-three/fiber/dist/declarations/src/core/renderer.d.ts` (RenderProps), `.../web/Canvas.d.ts` (CanvasProps), `.../core/store.d.ts`, `.../core/hooks.d.ts`. Impl: `@react-three/fiber/dist/events-b389eeca.esm.js` (core), `dist/react-three-fiber.esm.js` (web Canvas).

```ts
type GLProps =
  | Renderer                                          // { render(scene, camera) } — isRenderer() duck-type
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)   // ← ASYNC FACTORY (renderer.d.ts line 14)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>;
type DefaultGLProps = Omit<THREE.WebGLRendererParameters,'canvas'> & { canvas: HTMLCanvasElement | OffscreenCanvas }
// R3F passes { canvas, powerPreference:'high-performance', antialias:true, alpha:true } (events-…esm.js 15614-15619)

interface RenderProps { gl?: GLProps; size?; shadows?; legacy?; linear?; flat?; orthographic?;
  frameloop?: 'always' | 'demand' | 'never';   // store.d.ts 23
  performance?; dpr?: number | [min, max];       // store.d.ts 16 ; calculateDpr clamps window.devicePixelRatio (events 90-96)
  raycaster?; scene?; camera?; events?: (store) => EventManager<HTMLElement>; onCreated?: (state: RootState) => void; onPointerMissed? }
interface CanvasProps extends Omit<RenderProps,'size'>, HTMLAttributes<HTMLDivElement> {
  children?; ref?; fallback?: ReactNode;          // fallback = <canvas> child content (alt text), NOT a Suspense fallback
  resize?: ResizeOptions; eventSource?; eventPrefix? }
```
How the async factory is handled (`events-b389eeca.esm.js` 15589-15630, `configure()`): `const customRenderer = typeof glConfig === 'function' ? await glConfig(defaultProps) : glConfig; if (isRenderer(customRenderer)) gl = customRenderer; else gl = new THREE.WebGLRenderer({...defaultProps, ...glConfig})`. `configure()` is `async` and `render()` waits on `pending.then(...)` before `reconciler.updateContainer` (15815-15825). The web `<Canvas>` calls `await root.current.configure({...})` then `root.current.render(<Bridge><ErrorBoundary><React.Suspense fallback={<Block/>}>{children}</Suspense></ErrorBoundary></Bridge>)` (react-three-fiber.esm.js 62-112). Consequences:
- Nothing inside `<Canvas>` mounts (no `useThree().gl`, no `onCreated`) until the factory's promise resolves → `gl` is always an initialised renderer by the time children/`onCreated` run. That is why `KTX2Loader.detectSupport(gl)` (sync) is safe inside the tree on WebGPU.
- Canvas wraps children in its OWN `<Suspense fallback={<Block/>}>`; `Block` sets a never-resolving promise which makes the *Canvas component itself* suspend (line 55 `if (block) throw block`). Any un-caught suspension inside the canvas therefore suspends the whole `<Canvas>` up to the nearest OUTER Suspense — the repo already learned this (Scene.tsx comment "Suspense left pending inside this bridged tree wedged ALL island commits"). Wrap suspending islands in their own `<Suspense fallback={null}>`.
- Only `WebGLRenderer` gets `applyProps(gl, glConfig)` for object configs; a factory renderer receives no prop diffing (15807). `gl.outputColorSpace`/`toneMapping` are still set on first configure for any renderer (15790-15793).
- Errors thrown by the factory reject `configure()`'s promise → unhandled inside `run()`; guard inside the factory (the repo's forceWebGL retry does this).

useLoader (`hooks.d.ts` 40-52, impl `events-…esm.js` 1240-1300):
```ts
useLoader<I extends InputLike, L>(loader: L /* class or instance */, input: I /* string | string[] */, extensions?: (loader: LoaderInstance<L>) => void, onProgress?: (e: ProgressEvent) => void): LoaderResult<L> | LoaderResult<L>[]
useLoader.preload(loader, input, extensions?): void   // suspend-react preload — kicks fetch outside render
useLoader.clear(loader, input): void
```
- Loader instances are memoised per constructor in a module `WeakMap` (`memoizedLoaders`, line 1240) — one `GLTFLoader`, one `KTX2Loader` per app when passing the class. `extensions(loader)` runs on EVERY call (line 1259) → keep it idempotent (setDRACOLoader/setTranscoderPath/detectSupport are).
- Cache key = `[loader, ...urls]` via `suspend-react` (`suspend-react/index.d.ts`: `suspend`, `preload`, `peek`, `clear`; `Config { lifespan?, equal? }`).
- Results with `.scene` get `buildGraph()` → `{ nodes, materials }` merged in (line 1265). Errors reject as `new Error('Could not load ${url}: …')`.
- Requires the caller to be inside `<Suspense>` (JSDoc). `useLoader.preload` is what `useGLTF.preload` / `useTexture.preload` / `useKTX2.preload` call.

Loop helpers relevant to `frameloop`: `invalidate(state?, frames?)`, `advance(timestamp, runGlobalEffects?, state?, frame?)`, `addEffect/addAfterEffect/addTail` (`core/loop.d.ts`). `frameloop="never"` + `advance()` lets a preloader hold rendering until reveal.

## 8. @react-three/drei 10.7.7 — useProgress / Loader / Preload / useGLTF / useTexture / useKTX2

`@react-three/drei/core/Progress.js` + `.d.ts` (exported from `core/index.d.ts` line 47):
```ts
type Data = { errors: string[]; active: boolean; progress: number; item: string; loaded: number; total: number }
const useProgress: UseBoundStore<StoreApi<Data>>     // zustand store — usable OUTSIDE the Canvas / any component; useProgress.getState(), .subscribe()
function Progress({ children }: { children?: (result: Data) => ReactNode })
```
Implementation (Progress.js 6-40): on store creation it OVERWRITES `DefaultLoadingManager.onStart/onLoad/onError/onProgress` (from `'three'` = shared core singleton). `progress = (loaded - saveLastTotalLoaded) / (total - saveLastTotalLoaded) * 100`, `|| 100` guard only in onProgress; `saveLastTotalLoaded` is module-level and updated when `loaded === total`. `active` flips true on start/progress, false in `onLoad`. Do NOT also assign `DefaultLoadingManager.onProgress` yourself if `useProgress` is imported anywhere — last assignment wins (whichever module evaluates later). If you need custom manager hooks, use a private `new LoadingManager()` passed to your loaders (they will then be invisible to `useProgress`), or subscribe to the `useProgress` store.

`@react-three/drei/web/Loader.js` + `.d.ts` (export `web/index.d.ts` line 4): `Loader({ containerStyles?, innerStyles?, barStyles?, dataStyles?, dataInterpolation?: (p:number)=>string, initialState?: (active:boolean)=>boolean })` — DOM overlay built on `useProgress`; shows while `active`, hides 300 ms after; eases displayed number toward `progress` with rAF. Reference for the easing pattern only — the repo has its own `src/components/fx/preloader.tsx`.

`@react-three/drei/core/Preload.js` + `.d.ts`: `Preload({ all?: boolean, scene?: Object3D, camera?: Camera }): null` — in a `useLayoutEffect` calls `gl.compile(scene, camera)` then renders a `CubeCamera` into a `WebGLCubeRenderTarget(128)`. **WebGL-oriented**: on `WebGPURenderer`, `gl.compile` is a getter aliasing `compileAsync` (returns a Promise that Preload ignores → shaders may not be warm by the next line) and `WebGLCubeRenderTarget` + `cubeCamera.update(gl, …)` target the WebGL renderer API. Treat `<Preload all/>` as WebGL-only; on WebGPU call `await gl.compileAsync(scene, camera)` yourself (Renderer.js 860) — the repo's `introStore.warmReady` signal is the place.

`@react-three/drei/core/Gltf.js` + `.d.ts`:
```ts
useGLTF<T extends string|string[]>(path: T, useDraco?: boolean|string = true, useMeshopt?: boolean = true, extendLoader?: (loader: GLTFLoader /* three-stdlib */) => void): GLTF & ObjectMap
useGLTF.preload(path, useDraco?, useMeshopt?, extendLoader?): void
useGLTF.clear(path): void
useGLTF.setDecoderPath(path: string): void   // default 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/' (Gltf.js 8) — CDN! set to '/draco/' for self-hosting
<Gltf src useDraco useMeshOpt extendLoader …CloneProps/>
```
Uses `GLTFLoader, DRACOLoader, MeshoptDecoder` from **three-stdlib** (not three/addons). Meshopt is wired by default (`useMeshopt=true`, Gltf.js 21-23). Draco decoder path defaults to the Google CDN — a preloader that must be offline/CSP-clean should call `useGLTF.setDecoderPath('/draco/')` at module scope. Repo usage: `src/webgl/HeroLogo.tsx` (`useGLTF.preload(MARK_GLB)`, `useGLTF(MARK_GLB)`), `src/webgl/RouteHeroGlb.tsx`; `src/webgl/RouteHeroLogo.tsx` uses raw `three/examples/jsm/loaders/GLTFLoader.js` via dynamic import (no Suspense) — both patterns are copy-ready.

`@react-three/drei/core/Texture.js` + `.d.ts`:
```ts
useTexture<Url extends string|string[]|Record<string,string>>(input: Url, onLoad?: (t: MappedTextureType<Url>) => void): MappedTextureType<Url>
useTexture.preload(url: string|string[]): void ; useTexture.clear(input)
<Texture input onLoad>{(tex)=>…}</Texture>
```
Uses `TextureLoader` from `'three'` (core). Effect calls `gl.initTexture(t)` when `'initTexture' in gl` (Texture.js 16-32) — works on WebGPURenderer (initialised) too.

`@react-three/drei/core/Ktx2.js` + `.d.ts`:
```ts
useKTX2(input: string|string[]|Record<string,string>, basisPath = 'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/'): Texture | Texture[] | Record
useKTX2.preload(url, basisPath?) ; useKTX2.clear(input) ; <Ktx2 input basisPath>
```
**Uses `KTX2Loader` from three-stdlib 2.36.1**, whose `detectSupport(renderer)` reads `renderer.extensions.has(...)` and `renderer.capabilities.isWebGL2` unconditionally (`three-stdlib/loaders/KTX2Loader.js` 48-61) — there is NO `isWebGPURenderer` branch. On a `WebGPURenderer` (`.extensions` undefined) it throws `TypeError`. Also `useKTX2.preload` sets the transcoder path but never calls `detectSupport` (Ktx2.js 37-39), so a preload issued before the first `useKTX2` render throws "Missing initialization with `.detectSupport( renderer )`". Default `basisPath` is a jsDelivr CDN.

## 9. Next 16.2.6 — client-only preloader bits

`next/dist/shared/lib/dynamic.d.ts`: `dynamic<P>(loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>, options?: { ssr?: boolean; loading?: (p: { error?, isLoading?, pastDelay?, retry?, timedOut? }) => ReactNode })`. Impl `next/dist/shared/lib/lazy-dynamic/loadable.js` 33-70: `React.lazy` + `Suspense` (Suspense boundary is added when `!ssr || loading`); with `ssr:false` the child is wrapped in `BailoutToCSR reason:"next/dynamic"` so it renders nothing on the server. Constraint (string in `@next/swc-win32-arm64-msvc/next-swc.win32-arm64-msvc.node`): "`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component." → the `dynamic(() => import("./Scene"), { ssr: false })` must sit in a `"use client"` file — exactly what `src/webgl/CanvasHost.tsx` does (copy-ready).

`next/font/local` — `next/dist/compiled/@next/font/dist/local/index.d.ts`: `localFont({ src: string | {path, weight?, style?}[], display?: 'auto'|'block'|'swap'|'fallback'|'optional', weight?, style?, adjustFontFallback?: 'Arial'|'Times New Roman'|false, fallback?: string[], preload?: boolean, variable?: `--${string}`, declarations? }) → { className, style: { fontFamily, fontWeight?, fontStyle? }, variable? }` (types in `.../types.d.ts`). Repo: `src/app/layout.tsx` 36-45 (`switzer = localFont({ variable: '--font-switzer', src: [...woff2], display: 'swap' })`) — copy-ready. `preload` defaults to true (Next injects `<link rel="preload" as="font">`), so `document.fonts.ready` normally resolves early.

`document.fonts` — DOM lib (`typescript/lib/lib.dom.d.ts` 12159-12211): `FontFaceSet.ready: Promise<FontFaceSet>`, `.status: 'loading'|'loaded'`, `.check(font: string, text?): boolean`, `.load(font: string, text?): Promise<FontFace[]>`. `ready` resolves when no font loads are pending at that moment; a face that has never been *used* (no glyph on screen yet) is not loaded — call `document.fonts.load('600 1em Switzer')` for faces the preloader wants guaranteed. Repo already gates on `document.fonts.ready` with a 3 s cap (`src/components/fx/preloader.tsx` 86-99, 460-470).

---

## 10. Copy-ready example locations (installed files, not memory)

| Pattern | Where |
|---|---|
| Custom LoadingManager with URL modifier | JSDoc in `three/src/loaders/LoadingManager.js` lines 149-183 |
| KTX2Loader setup (`setTranscoderPath` → `detectSupport(renderer)` → `loadAsync`) | `three/examples/jsm/loaders/KTX2Loader.js` 129-134 and `three/examples/jsm/libs/basis/README.md` |
| GLTFLoader + DRACOLoader wiring | `three/examples/jsm/loaders/GLTFLoader.js` 113-122 ; DRACOLoader JSDoc `DRACOLoader.js` 32-43 |
| Async WebGPU gl factory for R3F (init + fallback) | `C:/Users/alber/Sersan/src/webgl/renderer/createRenderer.ts` (`createWebGPURenderer`) ; used in `src/webgl/Scene.tsx` 263-296 (`gl={webgpu ? createWebGPURenderer : {...}}`, `onCreated`, `frameloop="always"`, `dpr`) |
| Client-only Canvas via next/dynamic ssr:false | `C:/Users/alber/Sersan/src/webgl/CanvasHost.tsx` |
| useGLTF + preload | `C:/Users/alber/Sersan/src/webgl/HeroLogo.tsx` 294, 403 ; raw GLTFLoader promise without Suspense: `src/webgl/RouteHeroLogo.tsx` 61-70 |
| Progress→DOM overlay easing | `@react-three/drei/web/Loader.js` (rAF ease toward `progress`, 300 ms hide) |
| useProgress store wiring to DefaultLoadingManager | `@react-three/drei/core/Progress.js` |
| Real-signal preloader (fonts.ready / window load / tier / warm) | `C:/Users/alber/Sersan/src/components/fx/preloader.tsx` header 30-75 + 86-110 |
| WebGPU availability probe | `three/examples/jsm/capabilities/WebGPU.js` |

## 11. Deprecated / removed / hazardous — with proof

| Item | Status | Proof |
|---|---|---|
| `KTX2Loader.detectSupportAsync(renderer)` | **Deprecated r181** (still present, warns) | `three/examples/jsm/loaders/KTX2Loader.js` 210-217: `console.warn('KTX2Loader: "detectSupportAsync()" has been deprecated. Use "detectSupport()" and "await renderer.init();" …') // @deprecated r181` |
| `renderer.renderAsync()`, `hasFeatureAsync()`, `initTextureAsync()`, `clearAsync/clearColorAsync/clearDepthAsync/clearStencilAsync` on WebGPURenderer | **Deprecated r181** (warnOnce) | `three/src/renderers/common/Renderer.js` 1038, 2818, 2875, 2358-2405 |
| Calling `render()`, `hasFeature()`, `initTexture()`, `clear()` before `await renderer.init()` | **Throws** | `Renderer.js` 1296, 2845, 2895, 2272 |
| drei `useKTX2` / `useKTX2.preload` on WebGPURenderer | **Broken** (three-stdlib loader, WebGL-only detectSupport; preload never detects) | `three-stdlib/loaders/KTX2Loader.js` 48-61 ; `@react-three/drei/core/Ktx2.js` 8-14, 37-39 |
| drei `<Preload all/>` on WebGPURenderer | **Unsafe** (fires `gl.compile` = compileAsync unawaited; uses `WebGLCubeRenderTarget`) | `@react-three/drei/core/Preload.js` 26-33 ; `Renderer.js` 3630 (`get compile()` alias) |
| drei `useGLTF` default Draco path is a Google CDN; `useKTX2` default basis path is jsDelivr | **Network hazard** for a CSP/offline preloader | `@react-three/drei/core/Gltf.js` 8 ; `core/Ktx2.js` 7 |
| Overwriting `DefaultLoadingManager.on*` while drei `useProgress` is imported | **Conflict** (last writer wins) | `@react-three/drei/core/Progress.js` 7-31 |
| Reading `manager.itemsLoaded / itemsTotal` as properties | **Not possible** (closure vars) | `three/src/loaders/LoadingManager.js` 31-33 |
| `THREE.Cache` for ImageBitmap-loaded GLTF textures | **Not cached** (`ImageBitmapLoader` path); only `file:`/`image:` keys | `FileLoader.js` 86/275, `ImageLoader.js` 53, `GLTFLoader.js` 2579+ |
| Setting `manager.onStart` via constructor | **Not supported** (only onLoad/onProgress/onError args) | `LoadingManager.js` 27, 37-40 |
| `<Canvas fallback>` as a Suspense fallback | **Misuse** — it is `<canvas>` alt content | `@react-three/fiber/dist/react-three-fiber.esm.js` 143-148 (`children: fallback` inside `<canvas>`) |
| `next/dynamic` `{ ssr:false }` inside a Server Component | **Build error** in Next 16 | SWC message in `@next/swc-win32-arm64-msvc/next-swc.win32-arm64-msvc.node` ("`ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component.") |
| Mixing `three` and `three/webgpu` renderer classes | Renderer classes differ per build; loaders/managers are shared via `three.core.js` | `three/build/three.webgpu.js` line 7 vs `three.module.js` 6-7 (both re-export core) |

## 12. Gaps / not verifiable from node_modules

- No markdown docs are shipped for R3F/drei/Next (only `.d.ts` + compiled JS + CHANGELOG). The R3F 9 CHANGELOG (`@react-three/fiber/CHANGELOG.md`) does not mention the async `gl` factory — the only proof is the type union `(defaultProps) => Promise<Renderer>` (`renderer.d.ts` 14) and the `await glConfig(defaultProps)` in `configure()`.
- `@types/three` typing for `KTX2Loader.detectSupportAsync` is `Promise<this>` while the JS returns `this.detectSupport(renderer)` (same) — fine, but it's deprecated anyway.
- `three-stdlib` (drei's loader source) exposes no `.d.ts` inspection of MeshoptDecoder here beyond drei's runtime `typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder` guard (Gltf.js 21) — accept both shapes.
- No `public/basis/` or `public/draco/` folders exist in the repo yet (`public/` = case-studies, favicon.svg, founders, llms.txt, manifest.json, models/sersan-mark.glb, og-image.png); the transcoder/decoder wasm files must be copied from `three/examples/jsm/libs/{basis,draco/gltf}` if KTX2/Draco assets are introduced.
- Byte-accurate global progress (Lusion-style %) is not provided by `LoadingManager` (item counts only); it must be assembled from per-loader `onProgress(ProgressEvent)` (needs `Content-Length` on the CDN/Vercel responses) or from a hand-maintained weighted manifest.
- `document.fonts.ready` behaviour with `display:'swap'` fonts that have no glyphs on screen yet is browser-defined; not verifiable offline.

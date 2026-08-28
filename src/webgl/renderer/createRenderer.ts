/**
 * Renderer-factory seam (F0.5) for the WebGPU migration.
 *
 * GOAL of this increment: a contained renderer seam behind ONE feature flag,
 * with ZERO behavioural change when the flag is OFF.
 *
 *   Flag OFF (default) → `webgpuEnabled()` is false → callers keep R3F's
 *     implicit default WebGLRenderer (the `gl={{…}}` object path). This module
 *     is then inert: nothing here imports `three/webgpu`, so that build never
 *     enters the bundle's OFF code path.
 *
 *   Flag ON → `createWebGPURenderer` is used as R3F 9.6's async `gl` factory
 *     (the `(defaults) => Promise<Renderer>` branch, renderer.d.ts:14). It
 *     dynamically imports `three/webgpu`, constructs `WebGPURenderer`,
 *     `await`s `renderer.init()` (async GPU-adapter negotiation), and returns
 *     it. WebGPU is used when available, with automatic WebGL2 fallback; a
 *     failed init retries forced-WebGL so a flaky device degrades to WebGL2
 *     rather than a blank canvas.
 *
 * THE CRITICAL PITFALL (spec §1.6): `three` and `three/webgpu` are two separate
 * self-contained builds. Never let both land in one bundle (instanceof breaks,
 * doubled weight). The `import("three/webgpu")` here is dynamic and ONLY runs
 * on the ON path, so the OFF build is untouched. This module also imports NO
 * value from `three`/`three/webgpu` at top level — only a type — keeping it
 * tree-shakeable and free of the heavy build when the flag is off.
 */

// R3F passes a `DefaultGLProps`-shaped object to the `gl` factory. That type is
// not re-exported from the package root (only the deep declaration path) and
// uses R3F's own narrowed `OffscreenCanvas` shim, which is structurally
// distinct from the DOM lib's `OffscreenCanvas`. To stay assignable to R3F's
// `GLProps` factory branch without a deep-path import, we type `canvas` as
// `unknown` here (a supertype of R3F's canvas union) and narrow it at use.
// R3F's `GLProps` Promise branch accepts the `Renderer` we return regardless.
import { devOverridesAllowed } from "../store/tierStore";

type GLFactoryDefaults = {
  canvas: unknown;
} & Record<string, unknown>;

export type Backend = "webgpu" | "webgl2";

/**
 * Reads the single feature flag. Unset / "false" / "0" / "" are OFF.
 * Anything else (e.g. "1", "true") is ON.
 *
 * `NEXT_PUBLIC_` prefix → inlined into the client bundle at build time by Next,
 * so this is a static, tree-shakeable boolean in the browser.
 */
export function webgpuEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_WEBGPU;
  return v != null && v !== "" && v !== "false" && v !== "0";
}

/**
 * Optional A/B sub-flag: force the WebGL2 backend even when WebGPU is enabled
 * and available. Lets us compare backends in one session during later phases.
 */
export function forceWebGLFlag(): boolean {
  const v = process.env.NEXT_PUBLIC_WEBGPU_FORCE_WEBGL;
  return v != null && v !== "" && v !== "false" && v !== "0";
}

/**
 * Dev/preview-only `?backend=webgl2` URL override (ROUND-5 W3 — the WebGL2
 * fallback proof enabler): forces the WebGL backend of WebGPURenderer in a
 * single session WITHOUT rebuilding with NEXT_PUBLIC_WEBGPU_FORCE_WEBGL, so
 * the fallback path can finally be proven in-browser. Gated on the SAME
 * `devOverridesAllowed()` predicate as `?fx=`/`?dpr=` (tierStore) — false in
 * production hosts and during SSR, so the real domain is untouched. The
 * import is value-safe: tierStore only type-imports from this module (the
 * type is erased), so no runtime cycle exists, and tierStore pulls no three
 * build — this module stays free of the heavy chunk.
 */
function backendUrlOverride(): "webgl2" | null {
  if (!devOverridesAllowed()) return null;
  try {
    const v = new URLSearchParams(window.location.search).get("backend");
    return v === "webgl2" ? "webgl2" : null;
  } catch {
    return null;
  }
}

/**
 * The actual renderer build: construct WebGPURenderer + await init().
 *
 * Only ever reached through `createWebGPURenderer` below (the per-canvas
 * idempotence guard) — never export this directly, or the double-configure
 * fork it guards against comes back.
 *
 * Constructor props mirror today's `gl={{…}}` object in Scene.tsx exactly
 * (alpha:true, antialias:false, powerPreference:"high-performance") so the ON
 * path boots with the same surface configuration as the OFF path.
 */
async function buildWebGPURenderer(defaults: GLFactoryDefaults) {
  // Dynamic, lazy import: never bundled/loaded on the OFF path.
  const { WebGPURenderer } = await import("three/webgpu");

  const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const forceWebGL =
    forceWebGLFlag() || !hasGpu || backendUrlOverride() === "webgl2";

  const props = {
    // R3F always passes a real HTMLCanvasElement here (the Canvas DOM node);
    // the `unknown` is purely to bridge the OffscreenCanvas type-shim mismatch.
    canvas: defaults.canvas as HTMLCanvasElement,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance" as const,
    forceWebGL,
  };

  /**
   * ROUND 12 · STAGE 2 FIX — SIZE THE RENDERER BEFORE `init()`.
   * (Corrected 2026-08-28: measure the PARENT box, not the canvas box.)
   *
   * THE DEFECT: on a cold start the WebGPU backend logs
   *   "The depth stencil attachment [TextureView of Texture "depthBuffer"]
   *    size (width: 300, height: 150) does not match the size of the other
   *    attachments' base plane (width: 1920, height: 935)"
   * — during the first frames. 300×150 is the HTML `<canvas>` DEFAULT
   * drawing-buffer size: a renderer whose CanvasTarget was never resized
   * allocates its shared "depthBuffer" texture from `getDrawingBufferSize()`
   * (the target's INTERNAL logical size × ratio) while the colour attachment
   * is `context.getCurrentTexture()`, which always tracks the canvas
   * element's CURRENT width/height attributes — so one un-resized renderer
   * encoding against an externally-sized canvas mismatches on every pass.
   *
   * WHY THE CANVAS BOX IS THE WRONG MEASUREMENT (2026-08-28): R3F 9's
   * `<canvas>` carries only `display:block` — no CSS width/height until the
   * first `setSize(…, updateStyle:true)` writes its inline style, which
   * happens AFTER this factory resolves. Its client box at construction is
   * therefore the intrinsic 300×150 default, and the original ROUND 12 read
   * of `canvas.clientWidth` was a no-op. The layout truth is the PARENT
   * container div (R3F's own 100%×100% measure target inside the fixed
   * full-viewport host) — the same box `computeInitialSize` feeds to R3F's
   * store. Sizing from it costs one layout read at construction (never on
   * the frame path) and makes the depth attachment right from the first
   * allocation. `updateStyle: false` — the canvas's CSS box is R3F's to own,
   * and writing it here would fight the `<Canvas>` element's own inline
   * style.
   *
   * Guarded on a non-zero box: a canvas that genuinely has no layout yet
   * (display:none, a detached container) must keep three's own default rather
   * than be sized to 0, which is a validation error in its own right.
   */
  const sizeToCanvas = (r: {
    setSize: (w: number, h: number, updateStyle?: boolean) => void;
    setPixelRatio?: (dpr: number) => void;
  }) => {
    const c = props.canvas;
    const box = c?.parentElement ?? c;
    const w = box?.clientWidth ?? 0;
    const h = box?.clientHeight ?? 0;
    if (w > 0 && h > 0) {
      r.setPixelRatio?.(
        Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
          2,
        ),
      );
      r.setSize(w, h, false);
    }
  };

  try {
    const renderer = new WebGPURenderer(props);
    sizeToCanvas(renderer);
    await renderer.init();
    return renderer;
  } catch (err) {
    // A WebGPU adapter request can reject on flaky devices. Degrade to a forced
    // WebGL2 backend rather than leaving a blank canvas.
    if (!forceWebGL) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[createRenderer] WebGPU init failed, retrying with forceWebGL:true",
          err,
        );
      }
      const fallback = new WebGPURenderer({ ...props, forceWebGL: true });
      sizeToCanvas(fallback);
      await fallback.init();
      return fallback;
    }
    throw err;
  }
}

/**
 * One in-flight/settled renderer promise per canvas element. WeakMap: a
 * remounted `<Canvas>` gets a NEW canvas DOM node, so a fresh key (and a
 * fresh renderer); dead entries are collected with their canvas.
 */
const rendererByCanvas = new WeakMap<
  object,
  ReturnType<typeof buildWebGPURenderer>
>();

/**
 * R3F 9.6 async `gl` factory: per-canvas idempotent wrapper around
 * `buildWebGPURenderer`.
 *
 * MUST only be passed to `<Canvas gl={...}>` when `webgpuEnabled()` is true —
 * the dynamic `import("three/webgpu")` inside the build is what keeps the
 * heavy build out of the OFF path. Returns a `Promise<Renderer>`
 * (structurally what R3F's Promise branch wants).
 *
 * WHY THE GUARD (2026-08-28 — the interior-route depth-buffer race): R3F 9
 * runs its configure layout-effect on EVERY commit of `CanvasImpl` (no dep
 * array), and `configure()` tests `if (!state.gl)` BEFORE `await glConfig()`.
 * This factory takes hundreds of ms (chunk import + adapter/device
 * negotiation), so any commit inside that window — React StrictMode's dev
 * double-invoke fires one unconditionally, and any `Scene` re-render
 * (anchors/tier stores; `camera`/`resize`/`style` are fresh object
 * identities per render) adds more — re-enters `configure`, still sees
 * `state.gl == null`, and forks a SECOND renderer on the same canvas. The
 * late resolution then silently replaces `state.gl`, and because
 * `state.size`/`viewport.dpr` are already current, R3F never calls
 * `setSize`/`setPixelRatio` on it: its CanvasTarget stays at the 300×150
 * default while the canvas attributes are already viewport-sized from the
 * winner — and every canvas pass mismatches its cached 300×150 "depthBuffer"
 * depth view against the current `getCurrentTexture()` colour (the console
 * validation error on /consulting hard loads; home escaped only because its
 * heavier intro always resized the loser before its first canvas pass).
 * Handing every concurrent `configure` the SAME promise means there is only
 * ever ONE renderer per canvas — nothing left unsized, no leaked GPUDevice.
 *
 * A rejected build clears its entry so a later configure can retry cleanly
 * (the build already degrades to forceWebGL internally first).
 */
export function createWebGPURenderer(
  defaults: GLFactoryDefaults,
): ReturnType<typeof buildWebGPURenderer> {
  const canvas = defaults.canvas;
  if (canvas === null || typeof canvas !== "object") {
    // No stable key to dedupe on (never the case under R3F, which always
    // passes the canvas DOM node) — fall through to a plain build.
    return buildWebGPURenderer(defaults);
  }
  const existing = rendererByCanvas.get(canvas);
  if (existing) return existing;
  const pending = buildWebGPURenderer(defaults);
  rendererByCanvas.set(canvas, pending);
  pending.catch(() => {
    rendererByCanvas.delete(canvas);
  });
  return pending;
}

/**
 * Runtime backend detector, read once in Scene.tsx's `onCreated` and published
 * to `tierStore.backend` so the DOM can lay out for the backend it actually got.
 *
 * Each three r184 backend sets only its OWN positive flag — `WebGPUBackend` sets
 * `isWebGPUBackend = true` and leaves `isWebGLBackend` **undefined**
 * (webgpu/WebGPUBackend.js:66), while the fallback sets `isWebGLBackend = true`
 * (webgl-fallback/WebGLBackend.js:57). Neither sets the other's flag. So the
 * three conjuncts of the test below are equivalent to "is this a true WebGPU
 * backend": a plain WebGLRenderer has no `backend` field at all → "webgl2"; the
 * WebGL2 fallback is identified POSITIVELY by `isWebGLBackend === true`; and
 * everything else is *confirmed* by the presence of the `compute` entry point
 * rather than by any negative flag.
 */
export function backendOf(renderer: unknown): Backend {
  const r = renderer as {
    backend?: { isWebGLBackend?: boolean };
    compute?: unknown;
  } | null;
  const backend = r?.backend;
  if (!backend) return "webgl2";
  // MUST mirror FounderPortraitMorph's own in-island compute probe exactly, or
  // the DOM gate and the island can disagree about whether the morph is
  // driveable. Test isWebGLBackend NEGATIVELY (an `=== false` test is never
  // true — the flag is `undefined` on a WebGPU backend — and would report every
  // machine as webgl2), and require the compute entry point, since the compute
  // kernels are what the morph actually needs.
  return backend.isWebGLBackend !== true && typeof r?.compute === "function"
    ? "webgpu"
    : "webgl2";
}

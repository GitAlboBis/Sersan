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
 * R3F 9.6 async `gl` factory: construct WebGPURenderer + await init().
 *
 * MUST only be passed to `<Canvas gl={...}>` when `webgpuEnabled()` is true —
 * the dynamic `import("three/webgpu")` is what keeps the heavy build out of the
 * OFF path. Returns a `Renderer` (structurally what R3F's Promise branch wants).
 *
 * Constructor props mirror today's `gl={{…}}` object in Scene.tsx exactly
 * (alpha:true, antialias:false, powerPreference:"high-performance") so the ON
 * path boots with the same surface configuration as the OFF path.
 */
export async function createWebGPURenderer(defaults: GLFactoryDefaults) {
  // Dynamic, lazy import: never bundled/loaded on the OFF path.
  const { WebGPURenderer } = await import("three/webgpu");

  const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const forceWebGL = forceWebGLFlag() || !hasGpu;

  const props = {
    // R3F always passes a real HTMLCanvasElement here (the Canvas DOM node);
    // the `unknown` is purely to bridge the OffscreenCanvas type-shim mismatch.
    canvas: defaults.canvas as HTMLCanvasElement,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance" as const,
    forceWebGL,
  };

  try {
    const renderer = new WebGPURenderer(props);
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
      await fallback.init();
      return fallback;
    }
    throw err;
  }
}

/**
 * Runtime backend detector. After the renderer exists, `backend.isWebGLBackend`
 * tells us whether WebGPU or the WebGL2 fallback was selected. Safe to call on
 * the default WebGLRenderer too (no `backend` field → defaults to "webgl2").
 */
export function backendOf(renderer: unknown): Backend {
  const backend = (renderer as { backend?: { isWebGLBackend?: boolean } } | null)
    ?.backend;
  return backend?.isWebGLBackend === false ? "webgpu" : "webgl2";
}

/**
 * crystalMarkRT — the SERSAN-mark transmission RT for the HEALTHY crystal
 * (ROUND 7-2b §B-a (i), research/2026-08-22-round7-stones-v2-anatomy.md).
 *
 * The igloo penguin-in-ice twin, single-pass variant: the brand mark
 * (public/models/sersan-mark.glb — the SAME shared normalized geometry
 * RouteHeroLogo caches) rendered UNLIT (white-cyan ≤ 1.0, toneMapped:false)
 * into ONE mipmapped HalfFloat RenderTarget with a transparent-black clear.
 * crystalBuild samples it inside the dispersion ladder with igloo's exact lod
 * law (textureLod ← log2(size)·roughEff·0.36), so the frost veins drive its
 * softness and the refraction swims it — the whole "soft lit form inside the
 * ice" is, exactly like igloo's, nothing but an unlit render + the RT mip
 * chain + refraction jitter (§A1).
 *
 * DRIVER SHAPE (island architecture — the PointerFlowmap idiom): NO RAF of
 * its own. `render(gl, t)` is called from CrystalCluster's EXISTING priority-0
 * useFrame (before PostFXNodes' priority-1 render pass reads the main scene),
 * saves/restores the current render target, and renders the 2-mesh micro
 * scene synchronously — proven on both the WebGPU and WebGL2 backends
 * (PointerFlowmap header). Both backends regenerate the RT's mip chain in
 * finishRender when texture.generateMipmaps is true (verified in the three
 * 0.184 source: WebGLBackend.finishRender / WebGPU textureUtils).
 *
 * COST: with MARK_SPIN = 0 (default — igloo's inner object is RIGID in the
 * cube) the RT renders ONCE per session and the per-frame cost is literally
 * zero; with a dev-handle spin it re-renders only while the healthy band is
 * inside the cull window (the caller gates), a ~15 KB unlit mesh + mip gen —
 * far under the 0.8 ms QA budget. `lastMs`/`renders` expose the CPU encode
 * time for the dev handle.
 *
 * OWNERSHIP: the RT + the unlit material are OURS (disposed here); the mark
 * geometry is RouteHeroLogo's module-level singleton — NEVER disposed here.
 *
 * All `three/webgpu` symbols are passed IN (the caller already lazy-imports
 * them inside its webgpuEnabled()-gated effect — never module scope here).
 */
import {
  MARK_RT_SIZE,
  MARK_RT_FRAME,
  MARK_COLOR,
  MARK_SPIN,
} from "./crystalConfig";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

interface RendererLike {
  getRenderTarget: () => Any;
  setRenderTarget: (rt: Any) => void;
  render: (scene: Any, camera: Any) => void;
  clear: (color?: boolean, depth?: boolean, stencil?: boolean) => void;
}

export interface MarkRTRig {
  /** The RT texture — pass into createCrystalBuild({ markTexture }). */
  texture: Any;
  /** Attach the shared normalized mark geometry once its loader resolves. */
  setGeometry(geo: Any): void;
  /** Advance/refresh the RT — no-op unless the mesh exists AND (first render
   * still pending OR spin.value ≠ 0). Call from the existing useFrame while
   * the healthy band is inside the cull window. */
  render(gl: RendererLike, timeSec: number): void;
  /** Yaw of the mark inside the ice, rad/s (dev knob; 0 = igloo-rigid →
   * render-once). */
  spin: { value: number };
  /** True once the geometry is attached (the RT holds the mark after the
   * next render call). */
  readonly ready: boolean;
  /** Dev-handle perf counters (CPU encode ms of the last RT render). */
  readonly renders: number;
  readonly lastMs: number;
  dispose(): void;
}

export function createMarkRT(webgpu: Any): MarkRTRig {
  const {
    RenderTarget,
    Scene,
    OrthographicCamera,
    Mesh,
    MeshBasicMaterial,
    Color,
    HalfFloatType,
    LinearFilter,
    LinearMipmapLinearFilter,
    ClampToEdgeWrapping,
  } = webgpu as Any;

  // Mipmapped, clamped (border texels are transparent black — the mark is
  // framed with margin, so clamp smear is additive-zero in the ladder).
  const rt = new RenderTarget(MARK_RT_SIZE, MARK_RT_SIZE, {
    type: HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
  });

  const scene = new Scene();
  // Ortho frame around the ~2-unit-tall normalized mark, +Z view.
  const cam = new OrthographicCamera(
    -MARK_RT_FRAME,
    MARK_RT_FRAME,
    MARK_RT_FRAME,
    -MARK_RT_FRAME,
    0.1,
    10,
  );
  cam.position.set(0, 0, 5);

  // Unlit — igloo's inner object is a plain MeshBasicMaterial with a baked
  // texture; ours is a flat white-cyan (≤1.0, never trips bloom).
  const material = new MeshBasicMaterial({ color: new Color(MARK_COLOR) });
  material.toneMapped = false;

  let mesh: Any = null;
  const spin = { value: MARK_SPIN };
  let dirty = true;
  let cleared = false;
  let renders = 0;
  let lastMs = 0;
  let disposed = false;

  return {
    texture: rt.texture,
    spin,
    get ready() {
      return mesh !== null;
    },
    get renders() {
      return renders;
    },
    get lastMs() {
      return lastMs;
    },
    setGeometry(geo: Any) {
      if (disposed || mesh) return;
      mesh = new Mesh(geo, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      dirty = true;
    },
    render(gl: RendererLike, timeSec: number) {
      if (disposed) return;
      if (!cleared) {
        // One-time transparent-black clear (PointerFlowmap idiom) so the
        // ladder never samples an uninitialized target while the GLB is
        // still in flight. (WebGPU zero-inits textures by spec — this is
        // belt-and-braces + the future WebGL2-flip contract.)
        const prevT = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        gl.clear(true, false, false);
        gl.setRenderTarget(prevT);
        cleared = true;
      }
      if (!mesh) return;
      if (spin.value !== 0) {
        mesh.rotation.y = timeSec * spin.value;
      } else if (!dirty) {
        return; // rigid mark, RT already holds it — zero per-frame cost
      }
      const t0 = performance.now();
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      // Renderer clear color is the global transparent black (Scene.tsx
      // onCreated setClearColor(0x000000, 0)) — the RT clears to it.
      gl.render(scene, cam);
      gl.setRenderTarget(prev);
      lastMs = performance.now() - t0;
      renders++;
      dirty = false;
    },
    dispose() {
      disposed = true;
      rt.dispose();
      material.dispose();
      // mark geometry = RouteHeroLogo's shared singleton — NOT disposed.
    },
  };
}

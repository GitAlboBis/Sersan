/**
 * crystalMarkRT — the SERSAN-mark transmission RT for the HEALTHY crystal
 * (ROUND 7-2b §B-a (i), research/2026-08-22-round7-stones-v2-anatomy.md).
 *
 * The igloo penguin-in-ice twin, single-pass variant: the brand mark
 * (public/models/sersan-mark.glb — the SAME shared normalized geometry
 * RouteHeroLogo caches) rendered UNLIT (white-cyan ≤ 1.0, toneMapped:false)
 * into ONE mipmapped HalfFloat RenderTarget with a transparent-black clear.
 * crystalBuild samples it with igloo's exact lod law (textureLod ←
 * log2(size)·roughEff·0.36), so the frost veins drive its softness and the
 * refraction swims it — the whole "soft lit form inside the ice" is, exactly
 * like igloo's, nothing but an unlit render + the RT mip chain + refraction
 * jitter (§A1).
 *
 * ROUND 9-C — THIS RIG IS UNCHANGED IN SHAPE, AND THAT IS THE POINT.
 * research/2026-08-22-round9-inner-object-mechanism.md Variant A moved the
 * mark's sampling from a crystal-local orthographic map to igloo's projective
 * one (project the refracted exit point AND the crystal origin, difference,
 * normalise) — entirely inside crystalBuild's fragment. Because our RT holds
 * ONLY the subject, that map needs no viewport coupling: every camera,
 * placement, DPR and fov term cancels in the shader, so this stays a 512² ortho
 * image rendered ONCE per session at literally zero per-frame cost. (Variant B
 * — a full-viewport RT re-rendered with the MAIN camera every frame — would buy
 * real 3D tumble + perspective of the mark and is the documented upgrade; it is
 * a different rig, not a flag.) The one thing that IS a flag here is
 * MARK_TUMBLE: see `render()`.
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
  MARK_TUMBLE,
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
   * still pending OR spin.value ≠ 0 OR MARK_TUMBLE). Call from the existing
   * useFrame while the healthy band is inside the cull window.
   *
   * ROUND 9-C: `tumbleQ` is the crystal MESH's quaternion, and it is IGNORED
   * unless `MARK_TUMBLE` is true (the shipped default is false). Under
   * Variant A the mark is screen-upright on purpose — the tumble reaches 90°
   * off the view axis inside a normal scroll pass and a logo rotated 90° is
   * unreadable however correct its refraction is. Flipping MARK_TUMBLE is the
   * documented one-flag path back to a 3D-tumbling mark; it costs a per-frame
   * 512² clear + draw + mip gen (≈0.05 ms) instead of a render-once. */
  render(gl: RendererLike, timeSec: number, tumbleQ?: Any): void;
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
  // framed with margin, so an out-of-frame tap clamps to additive-zero).
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
  // Ortho frame around the ~2-unit-tall normalized mark, +Z view (identity
  // rotation ⇒ looking down −Z with +Y up).
  //
  // ROUND 9-C REGISTRATION CONTRACT (verified this round): the frame is SQUARE
  // ±MARK_RT_FRAME on both axes, and RouteHeroLogo normalizes the GLB to height
  // 2 and re-centres it (`loadMarkGeometry`: center → scale 2/height → center),
  // so uv 0…1 spans exactly 2·MARK_RT_FRAME = 2.3 MARK units. The shader maps
  // uv 0…1 onto 2·MARK_WORLD_HALF crystal units; at the shipped 1.15 = 1.15
  // that makes **1 mark unit = 1 crystal unit**, which is what MARK_WORLD_HALF's
  // "60 % of the slab's height" derivation assumes. Change one and the mark
  // resizes; change both and it does not. No aspect term anywhere (square RT,
  // square frame, and the shader's P00/P11 cancel).
  //
  // Y CONVENTION: an RT rendered here has NDC y = +1 at texture row 0, and
  // three's TSL samples RT textures y-DOWN on BOTH backends — hence
  // MARK_FLIP_Y = −1 in the shader (full derivation on the constant). Nothing
  // to do here; `texture.flipY` is not consulted for render targets.
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
    render(gl: RendererLike, timeSec: number, tumbleQ?: Any) {
      if (disposed) return;
      if (!cleared) {
        // One-time transparent-black clear (PointerFlowmap idiom) so the
        // shader never samples an uninitialized target while the GLB is
        // still in flight. (WebGPU zero-inits textures by spec — this is
        // belt-and-braces + the future WebGL2-flip contract.)
        const prevT = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        gl.clear(true, false, false);
        gl.setRenderTarget(prevT);
        cleared = true;
      }
      if (!mesh) return;
      // ROUND 9-C — the one-flag 3D-tumble path (config MARK_TUMBLE, default
      // false). When on, the RT scene inherits the crystal mesh's tumble so the
      // mark rotates rigidly inside the ice like igloo's sibling penguin; the
      // shader's map is unchanged either way. Costs a per-frame 512² render.
      //
      // ⚠ The two paths are EXCLUSIVE by construction: `mesh.rotation.y = …`
      // goes through the Euler setter, which REBUILDS the quaternion from
      // scratch and would silently discard the tumble copied in just above.
      // Under the tumble path the dev spin is therefore applied as a
      // post-rotation about the mark's own +Y — `rotateY` multiplies into the
      // quaternion using three's module-level scratch (zero allocation), and
      // the `copy` on the line before re-bases it every frame, so the angle
      // stays absolute rather than accumulating.
      if (MARK_TUMBLE && tumbleQ) {
        mesh.quaternion.copy(tumbleQ);
        if (spin.value !== 0) mesh.rotateY(timeSec * spin.value);
        dirty = true;
      } else if (spin.value !== 0) {
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

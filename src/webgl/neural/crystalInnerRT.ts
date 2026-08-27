/**
 * crystalInnerRT — ROUND 14 WAVE 2 · the igloo TWO-PASS inner transmission RT.
 *
 * igloo's ice material renders the object INSIDE the block into its own
 * mipmapped float RT (pass 1, with the back faces and a flat backdrop) and
 * then lets the FRONT faces refract that RT once (pass 2), sampling it at a
 * mip level driven by roughness — which is why the logo inside reads crisp
 * where the ice is clear and milky where it is frosted, with per-channel
 * dispersion from three thickness/ior-jittered taps (dossier
 * igloo-community-techniques.md §2.1, verbatim chunk).
 *
 * Our cheapest faithful equivalent (crystal-wave2-brief.md): a per-stone
 * offscreen RT (HalfFloat, mipmapped, screen × INNER_RT_SCALE capped at
 * INNER_RT_SIZE) holding ONLY the mark mesh, rendered from the MAIN camera
 * once per frame while the stone is on frame. Because it is the main camera,
 * the crystal fragment can sample it with the SAME projective ray walk as
 * stage A (exit point → clip → NDC → uv, y-flipped) — the RT's pixel size is
 * irrelevant to the map (NDC is NDC), only to the sharpness and the lod law.
 *
 * WHAT IS RENDERED: a CLONE mesh sharing the driver's mark geometry (the
 * RouteHeroLogo session singleton — never disposed here) and a CLONE of the
 * mark material with depth test/write ON (the main-pass material has them off
 * for the fog/crystal compositing order; inside the RT the extruded letters
 * must self-occlude). The clone's world matrix is COPIED from the live mark
 * mesh each render (`updateWorldMatrix(true,false)` on the source first, so
 * the group transform written earlier in the same useFrame is current), and
 * `emissiveIntensity` is mirrored — so the meteor-hold ride is visible through
 * the ice exactly as in the main pass. The clone has matrixAutoUpdate AND
 * matrixWorldAutoUpdate off, so the renderer's scene.updateMatrixWorld()
 * cannot overwrite the copied matrix (wave 2.1). No per-frame allocation.
 *
 * LIGHTING: the RT scene has no lights — neither does the main scene
 * (Scene.tsx mounts none), so the clone's MeshStandardMaterial renders
 * exactly as the main-pass copy does: emissive + envMap only. Intended.
 *
 * DRIVER SHAPE: the crystalMarkRT idiom — NO RAF of its own; `render()` is
 * called from CrystalCluster's existing priority-0 useFrame (before the
 * PostFXNodes pass reads the scene), saves/restores the bound target. Both
 * backends regenerate the mip chain in finishRender when
 * `texture.generateMipmaps` is true (three 0.184 WebGLBackend.finishRender /
 * WebGPU textureUtils) — the same path the mark RT and PointerFlowmap use.
 *
 * COST: one ~0.4 MP HalfFloat clear + a 552-triangle unlit-ish draw + mips,
 * per stone per frame while on frame. `lastMs` (CPU encode) and `renders`
 * are on the dev handle (`innerRt`); QA budget ≤ 0.8 ms.
 *
 * All `three/webgpu` symbols are passed IN (the caller lazy-imports them
 * inside its webgpuEnabled()-gated effect — never module scope here).
 */
import { INNER_RT_SIZE, INNER_RT_SCALE } from "./crystalConfig";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

interface RendererLike {
  getRenderTarget: () => Any;
  setRenderTarget: (rt: Any) => void;
  render: (scene: Any, camera: Any) => void;
  clear: (color?: boolean, depth?: boolean, stencil?: boolean) => void;
}

export interface InnerRTRig {
  /** The RT texture — pass into createCrystalBuild({ innerTexture }). */
  texture: Any;
  /** log2 of the RT's longest side — the build's `uInnerLog2` reads it after
   * every resize (the lod law is log2(size)·rough·k). */
  readonly log2Size: number;
  /** Current RT size in px. */
  readonly size: [number, number];
  /** Resize to the canvas size × INNER_RT_SCALE (capped). Call from a size
   * effect — never per frame. No-op when unchanged. */
  resize(cssW: number, cssH: number): void;
  /** Render the mark into the RT from the MAIN camera. `src` is the live
   * mark mesh in the crystal group (its geometry/material/world matrix are
   * mirrored); no-op until it exists. */
  render(gl: RendererLike, camera: Any, src: Any): void;
  readonly renders: number;
  readonly lastMs: number;
  dispose(): void;
}

export function createInnerRT(webgpu: Any): InnerRTRig {
  const {
    RenderTarget,
    Scene,
    Mesh,
    HalfFloatType,
    LinearFilter,
    LinearMipmapLinearFilter,
    ClampToEdgeWrapping,
  } = webgpu as Any;

  let w = 2;
  let h = 2;
  // Mipmapped, clamped: border texels are transparent black, so a ray that
  // walks out of the frame lands on nothing (mix-by-alpha ⇒ no smear).
  // depthBuffer:true — the extruded letters must self-occlude in the RT.
  const rt = new RenderTarget(w, h, {
    type: HalfFloatType,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
  });

  const scene = new Scene();
  let mesh: Any = null;
  let mat: Any = null;
  let srcMat: Any = null;
  let renders = 0;
  let lastMs = 0;
  let cleared = false;
  let disposed = false;

  function ensureMesh(src: Any): void {
    if (mesh && mesh.geometry === src.geometry && srcMat === src.material) {
      return;
    }
    if (mesh) {
      scene.remove(mesh);
      mat?.dispose();
      mesh = null;
      mat = null;
    }
    srcMat = src.material;
    mat = src.material.clone();
    mat.depthTest = true;
    mat.depthWrite = true;
    mesh = new Mesh(src.geometry, mat);
    mesh.frustumCulled = false;
    // The world matrix is copied from the live mesh every render.
    // WAVE 2.1 BLOCKER FIX: BOTH flags. Renderer.render() calls
    // scene.updateMatrixWorld() (three 0.184 common/Renderer.js:1578);
    // Scene.updateMatrix() flags matrixWorldNeedsUpdate => force=true for the
    // children, and Object3D.updateMatrixWorld (core/Object3D.js:1169-1181)
    // then recomputes child.matrixWorld = scene.matrixWorld * mesh.matrix
    // (= identity) UNLESS matrixWorldAutoUpdate is false — the only flag that
    // guards that multiply. Without it the copied matrix was overwritten and
    // the RT held the mark at the world origin, unit scale.
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
    scene.add(mesh);
  }

  return {
    texture: rt.texture,
    get log2Size() {
      return Math.log2(Math.max(w, h));
    },
    get size(): [number, number] {
      return [w, h];
    },
    get renders() {
      return renders;
    },
    get lastMs() {
      return lastMs;
    },
    resize(cssW: number, cssH: number) {
      if (disposed) return;
      const longest = Math.max(cssW, cssH, 1);
      const k = Math.min(INNER_RT_SCALE, INNER_RT_SIZE / longest);
      const nw = Math.max(2, Math.round(cssW * k));
      const nh = Math.max(2, Math.round(cssH * k));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      rt.setSize(w, h);
      cleared = false;
    },
    render(gl: RendererLike, camera: Any, src: Any) {
      if (disposed) return;
      if (!cleared) {
        // One-time transparent-black clear (PointerFlowmap idiom) so the
        // shader never samples an uninitialised target before the mark's
        // geometry lands.
        const prevT = gl.getRenderTarget();
        gl.setRenderTarget(rt);
        gl.clear(true, true, false);
        gl.setRenderTarget(prevT);
        cleared = true;
      }
      if (!src || !src.geometry || !src.material) return;
      ensureMesh(src);
      // The driver wrote the group transform earlier in this same frame
      // callback; bring the chain up to date (parents first) and mirror it.
      src.updateWorldMatrix(true, false);
      mesh.matrixWorld.copy(src.matrixWorld);
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = src.material.emissiveIntensity;
      }
      const t0 = performance.now();
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      // Renderer clear colour is the global transparent black (Scene.tsx
      // onCreated setClearColor(0x000000, 0)); autoClear clears colour+depth.
      gl.render(scene, camera);
      gl.setRenderTarget(prev);
      lastMs = performance.now() - t0;
      renders++;
    },
    dispose() {
      disposed = true;
      rt.dispose();
      mat?.dispose();
      // mark geometry = RouteHeroLogo's shared singleton — NOT disposed.
      mesh = null;
      mat = null;
    },
  };
}

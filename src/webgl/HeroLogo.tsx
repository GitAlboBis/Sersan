"use client";

/**
 * Hero logo — the SERSAN mark as a GPGPU particle cloud that dissolves &
 * regenerates. Replaces the procedural Saturn (HeroPlanet) as the home-page
 * hero object, and REPLACES the earlier ~12k CPU-seeded billboard dissolve
 * engine with a true GPU particle simulation.
 *
 * THE ENGINE (PRD + research spec, Option B — FBO ping-pong, both backends)
 * ------------------------------------------------------------------------
 * SIZE×SIZE particles live entirely on the GPU in FLOAT render targets
 * (position + velocity, ping-pong), advanced every frame by a sim shader — NO
 * CPU per-particle updates. Their HOME (rest) positions are sampled on the GLB
 * mesh SURFACE via MeshSurfaceSampler (geometry/sersanMark.ts); the solid mesh
 * is NEVER drawn — it only generates the rest target the spring pulls back to.
 *
 * Per-particle forces (model space, so repulsion follows the drag rotation):
 *   (a) elastic SPRING toward home  → the mark recomposes (regeneration)
 *   (b) mouse REPULSION within RADIUS, cursor PROJECTED into model space
 *       (raycast a camera-facing plane through the center, then worldToLocal)
 *   (c) DAMPING + max-speed clamp
 *   (d) light TURBULENCE (low at rest, more far from home)
 * Particles render as instanced billboard quads (NOT THREE.Points — WebGPU
 * clamps points to 1px), colored violet→cyan by velocity, additive HDR + glow
 * via the single existing selective Bloom.
 *
 * BACKEND SPLIT (mirrors DriftParticles / the old HeroLogo):
 *   flag OFF (WebGL2)  → synchronous GLSL FBO rig (gpgpu/gpgpuSim.ts) + GLSL
 *                        billboard (gpgpu/gpgpuRenderShader.ts). Never imports
 *                        three/webgpu.
 *   flag ON  (WebGPU)  → lazy-imported TSL rig+render (gpgpu/gpgpuNodeSim.ts);
 *                        same FBO-via-gl.setRenderTarget technique, proven on
 *                        WebGPURenderer by fluid/PointerFlowmap.ts. The heavy
 *                        three/webgpu + three/tsl namespaces are imported ONCE
 *                        here and passed in, so they never reach the OFF bundle.
 *
 * INTEGRATION CONTRACT (kept verbatim from the previous HeroLogo / HeroPlanet):
 *  - announces heroReady on the first frame (arms the drag-capture layer),
 *    resets on unmount;
 *  - screen-anchored across the 520vh sticky pin (position relative to
 *    camera.position.y, worldViewWidth, the `hp` hero-span progress, the
 *    `fade = 1 - smoothstep(hp,0.74,0.97)` recede+fade handoff, group.visible);
 *  - delta clamp for tab-refocus stalls;
 *  - ANCHORED orientation: NO drag-to-rotate and NO idle spin — the mark sits
 *    still at its front-facing rest and only eases a few degrees toward the
 *    cursor (a soft mouse-parallax tilt, damped toward rest). The hero-drag
 *    layer still feeds heroDragStore.hovering (the repulsion gate); its drag
 *    velocity is ignored, so click-and-hold never moves the mark.
 *
 * FALLBACKS (PRD constraints): tier `off` / reduced-motion never mounts this
 * (Scene gates home → HeroLogo to full/lite). If float AND half-float render
 * targets are both unusable, the GPGPU rig is not built — nothing renders, no
 * crash, and heroReady still fires so the poster/drag handoff is unaffected.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { sampleMarkHomePositions } from "./geometry/sersanMark";
import {
  createGpgpuSim,
  type GpgpuSimRig,
  type GpgpuTickParams,
} from "./gpgpu/gpgpuSim";
import {
  createGpgpuRenderMaterial,
  createGpgpuStaticBuild,
  type GpgpuRenderUniforms,
  type GpgpuStaticUniforms,
} from "./gpgpu/gpgpuRenderShader";
import {
  DEFAULT_GPGPU_CONFIG,
  SIZE_BY_TIER,
  BODY_LAYER,
  SKIN_LAYER,
  type GpgpuConfig,
  type GpgpuLayerConfig,
} from "./gpgpu/gpgpuConfig";
import { webgpuEnabled } from "./renderer/createRenderer";
import { useScrollStore } from "./store/scrollStore";
import { useTierStore, type SceneTier } from "./store/tierStore";
import { useFxStore } from "./store/fxStore";
import { useHeroDragStore } from "./store/heroDragStore";
import { usePointerStore } from "./store/pointerStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroLogoProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

/**
 * Resting tilt — a slight downward nod so the mark has depth/dimension but the
 * camera-facing FRONT plate stays clearly readable (like DDD's near-static "D").
 * The GLB's front face is +Z and the camera looks down −Z, so 0 yaw already
 * presents the mark face-on; we only add a small X tilt. This is the BASE rest
 * orientation; the mouse-parallax tilt below eases on top of it.
 *
 * Kept small (~4°) so the WIDE 2.64-unit mark reads as the letterform FACE-ON,
 * not a slanted box — at a larger near-plane scale a bigger tilt foreshortens
 * the wide plate and the mark stops looking like the mark.
 */
const TILT = THREE.MathUtils.degToRad(4);
/**
 * Mouse-parallax tilt — the mark is ANCHORED (no drag-to-rotate, no idle spin)
 * and only "looks toward" the cursor by a few degrees. The smoothed pointer
 * (normalized −1..1 from screen center) maps to a tiny target rotation
 * (rotY = pointerX·MAX, rotX = −pointerY·MAX) that the assembly DAMPS toward
 * each frame, easing back to the front-facing rest (0,0) when the pointer is
 * centered/absent. Live-tunable via fxStore.gpgpuTilt (default below).
 */
const TILT_DAMP = 3.5; // damp lambda — soft ease toward the pointer target

/** The Blender-built SERSAN mark. Geometry-only (no materials). */
const MARK_GLB = "/models/sersan-mark.glb";
/** Normalize the GLB to ~2 world units tall (same envelope as the old
 * procedural mark, so the anchoring/scale math is unchanged). */
const TARGET_HEIGHT = 2;
useGLTF.preload(MARK_GLB);

/** Cursor far away → repulsion vanishes (pointer-leave / coarse pointer). */
const MOUSE_OFF = new THREE.Vector3(1e9, 1e9, 1e9);

/** TSL build returned by the lazy gpgpuNodeSim import (loose-typed there). */
interface TslGpgpu {
  rig: GpgpuSimRig;
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uFade: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uEmissive: { value: number };
  uPointAlpha: { value: number };
  dispose: () => void;
}

/**
 * TSL STATIC bisection build (the home-position billboards, no sim). Shape
 * mirrors createStaticParticleNodeBuild's return, loose-typed like TslGpgpu.
 */
interface TslStatic {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uFade: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uEmissive: { value: number };
  uPointAlpha: { value: number };
  uMouse: { value: THREE.Vector3 };
  uHover: { value: number };
  uTime: { value: number };
  uRadius: { value: number };
  uPush: { value: number };
  dispose: () => void;
}

export function HeroLogo({ tier, anchors }: HeroLogoProps) {
  const { camera, size, gl, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const fadeRef = useRef(1);
  const simTimeRef = useRef(0);
  const announcedReady = useRef(false);
  // Eased global hover intensity for the analytic-dispersion static render:
  // target 1 while hovering, 0 otherwise; damped so the lift fades in/out and
  // the particles settle back softly when the cursor leaves.
  const hoverRef = useRef(0);

  // DEBUG render mode (fxStore). Subscribed REACTIVELY so toggling it live
  // (window.__sersanFx.getState().set({ heroRenderMode: "..." })) re-renders
  // the component and mounts/unmounts the solid / particle meshes accordingly.
  const heroRenderMode = useFxStore((s) => s.heroRenderMode);
  const showSolid = heroRenderMode === "solid" || heroRenderMode === "both";
  const showParticles =
    heroRenderMode === "particles" || heroRenderMode === "both";
  // BISECTION: static billboards at HOME positions (per-instance aHome), no sim.
  const showStatic = heroRenderMode === "particles-static";
  // TWO-LAYER momentum hero (Lusion DDD): dense violet BODY + reactive cyan SKIN.
  const show2Layer = heroRenderMode === "particles-2layer";

  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  // GPGPU grid size for the active tier (full 256², lite 128²).
  const gridSize = SIZE_BY_TIER[tier] ?? SIZE_BY_TIER.lite;

  // === Geometry: the Blender-built mark (sampled, NEVER rendered). ==========
  // drei caches the loaded geometry across remounts, so we CLONE it and only
  // ever mutate/dispose the clone — never the shared cached `src.geometry`.
  const { nodes } = useGLTF(MARK_GLB) as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };
  const bodyGeometry = useMemo(() => {
    const src = Object.values(nodes).find(
      (n) => (n as THREE.Mesh).isMesh,
    ) as THREE.Mesh | undefined;
    if (!src) {
      throw new Error(`HeroLogo: no mesh found in ${MARK_GLB}`);
    }

    // Clone so the normalization below cannot touch drei's cached geometry.
    const geometry = src.geometry.clone();

    // Center, then uniformly scale to ~TARGET_HEIGHT tall, recenter — the SAME
    // envelope the procedural mark produced, so the anchoring math is unchanged.
    geometry.center();
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (bbox) {
      const height = bbox.max.y - bbox.min.y || 1;
      const s = TARGET_HEIGHT / height;
      geometry.scale(s, s, s);
    }
    geometry.center();
    return geometry;
  }, [nodes]);
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // === DEBUG solid material ================================================
  // Unlit MeshBasicMaterial so the mark is GUARANTEED visible on BOTH backends
  // (the WebGPU renderer auto-converts it to a NodeMaterial) regardless of
  // scene lighting — used to verify the GLB's size/position/orientation in
  // isolation. Brand violet, clearly readable as a solid "52".
  const solidMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x7c5cff }),
    [],
  );
  useEffect(() => () => solidMaterial.dispose(), [solidMaterial]);

  // === Home positions: SIZE×SIZE surface samples → the rest field. ==========
  // homeRGBA seeds the home/position float textures; aRef is the per-instance
  // grid UV the render uses to look up its own particle. The mesh is unrendered.
  const homeField = useMemo(
    () => sampleMarkHomePositions(bodyGeometry, gridSize),
    [bodyGeometry, gridSize],
  );

  // Two-layer home fields (particles-2layer). BODY: lower front-bias coats the
  // depth + inward volume jitter → reads as a solid violet volume. SKIN: offset
  // OUT along +normal so the reactive cyan glow floats just over the body.
  const bodyHome = useMemo(
    () => sampleMarkHomePositions(bodyGeometry, gridSize, BODY_LAYER.sampling),
    [bodyGeometry, gridSize],
  );
  const skinHome = useMemo(
    () => sampleMarkHomePositions(bodyGeometry, gridSize, SKIN_LAYER.sampling),
    [bodyGeometry, gridSize],
  );

  // === Pick the float type once (FloatType when EXT_color_buffer_float is
  // available, else HalfFloat). If neither renders, gpgpuOk stays false and the
  // rig is never built (static/no mark, no crash). ==========================
  const floatType = useMemo<THREE.TextureDataType | null>(() => {
    // On the WebGL2 / flag-OFF path we can probe the extension directly.
    const ctx = (gl as { getContext?: () => WebGL2RenderingContext | null })
      .getContext?.();
    if (ctx && typeof ctx.getExtension === "function") {
      if (ctx.getExtension("EXT_color_buffer_float")) return THREE.FloatType;
      if (ctx.getExtension("EXT_color_buffer_half_float"))
        return THREE.HalfFloatType;
      // WebGL2 with neither float-render extension → no GPGPU.
      // (WebGPU exposes a different context; the `?.` above returns undefined
      //  there and we fall through to HalfFloat, which WebGPU always supports.)
      return null;
    }
    // WebGPU backend (no classic getContext) → HalfFloat is universally
    // supported for render targets there.
    return THREE.HalfFloatType;
  }, [gl]);

  const gpgpuOk = floatType != null;

  // Live config (defaults + the few leva-tunable knobs). Rebuilt only when the
  // tunable subset changes; per-frame writes use getState (cheap).
  const config = useMemo<GpgpuConfig>(
    () => ({ ...DEFAULT_GPGPU_CONFIG, SIZE: gridSize }),
    [gridSize],
  );

  // === GLSL (OFF) ===========================================================
  // Built only on the OFF path AND only when float/half RTs are usable. In an
  // effect (not useMemo) so the rig's seed renders run outside React's render
  // pass — same discipline as PointerFlowmap.
  interface GlslGpgpu {
    rig: GpgpuSimRig;
    material: THREE.ShaderMaterial & { uniforms: GpgpuRenderUniforms };
    geometry: THREE.InstancedBufferGeometry;
    uniforms: GpgpuRenderUniforms;
  }
  const [glsl, setGlsl] = useState<GlslGpgpu | null>(null);
  useEffect(() => {
    if (webgpuEnabled() || !gpgpuOk || floatType == null) return;
    const rig = createGpgpuSim(
      gl as THREE.WebGLRenderer,
      homeField.homeRGBA,
      gridSize,
      config,
      floatType,
    );
    const renderMat = createGpgpuRenderMaterial(config);

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
    geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    geo.setAttribute("aRef", new THREE.InstancedBufferAttribute(homeField.aRef, 2));
    geo.instanceCount = homeField.count;

    setGlsl({ rig, material: renderMat, geometry: geo, uniforms: renderMat.uniforms });
    return () => {
      rig.dispose();
      renderMat.dispose();
      geo.dispose();
      setGlsl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpgpuOk, floatType, gridSize, homeField]);

  // === TSL lazy (ON) ========================================================
  const [tsl, setTsl] = useState<TslGpgpu | null>(null);
  useEffect(() => {
    if (!webgpuEnabled() || !gpgpuOk || floatType == null) return;
    let cancelled = false;
    let built: TslGpgpu | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      // TRUE WebGPU sub-backend → compute + storage buffers (no FBO round-trip,
      // fixes the WebGPU scramble). WebGL2 fallback sub-backend → the FBO rig
      // (storage-buffer dynamic indexing is broken on WebGL2, three #31221).
      // The WebGPU backend leaves `isWebGLBackend` UNDEFINED; only the WebGL
      // backend sets it `true`. So "is WebGPU" = backend present, NOT the WebGL
      // backend, AND the renderer exposes `compute`. (`=== false` was wrong:
      // undefined !== false, so it always fell through to the FBO path.)
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const hasCompute =
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      const isWebGPUBackend = !!bk && bk.isWebGLBackend !== true && hasCompute;
      const b = isWebGPUBackend
        ? mod.createGpgpuComputeNodeSim(
            gl as never,
            webgpu as never,
            tslNs as never,
            homeField.homeRGBA,
            homeField.aRef,
            gridSize,
            config,
          )
        : mod.createGpgpuNodeSim(
            gl as never,
            webgpu as never,
            tslNs as never,
            homeField.homeRGBA,
            homeField.aRef,
            gridSize,
            config,
            floatType,
          );
      built = {
        rig: b.rig,
        geometry: b.geometry as unknown as THREE.InstancedBufferGeometry,
        material: b.material as unknown as THREE.Material,
        uFade: b.uFade,
        uPointSize: b.uPointSize,
        uPixelRatio: b.uPixelRatio,
        uViewport: b.uViewport as unknown as { value: THREE.Vector2 },
        uEmissive: b.uEmissive,
        uPointAlpha: b.uPointAlpha,
        dispose: b.dispose,
      };
      setTsl(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
      setTsl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpgpuOk, floatType, gridSize, homeField]);

  // === BISECTION static build ==============================================
  // Built only when the mode asks for it. OFF → synchronous GLSL static build;
  // ON → lazy TSL static build (same dual-import discipline as the live rig).
  // Reads POSITION from a per-instance `aHome` vec3 attribute — bypasses the
  // GPGPU position texture + the sim entirely.
  interface GlslStatic {
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.ShaderMaterial & { uniforms: GpgpuStaticUniforms };
    uniforms: GpgpuStaticUniforms;
    dispose: () => void;
  }
  const [glslStatic, setGlslStatic] = useState<GlslStatic | null>(null);
  useEffect(() => {
    if (webgpuEnabled() || !showStatic) return;
    const build = createGpgpuStaticBuild(
      config,
      homeField.homeRGBA,
      homeField.aRef,
      homeField.count,
    );
    setGlslStatic(build);
    return () => {
      build.dispose();
      setGlslStatic(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStatic, gridSize, homeField]);

  const [tslStatic, setTslStatic] = useState<TslStatic | null>(null);
  useEffect(() => {
    if (!webgpuEnabled() || !showStatic) return;
    let cancelled = false;
    let built: TslStatic | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      const b = mod.createStaticParticleNodeBuild(
        webgpu as never,
        tslNs as never,
        homeField.homeRGBA,
        homeField.aRef,
        homeField.count,
        config,
      );
      built = {
        geometry: b.geometry as unknown as THREE.InstancedBufferGeometry,
        material: b.material as unknown as THREE.Material,
        uFade: b.uFade,
        uPointSize: b.uPointSize,
        uPixelRatio: b.uPixelRatio,
        uViewport: b.uViewport as unknown as { value: THREE.Vector2 },
        uEmissive: b.uEmissive,
        uPointAlpha: b.uPointAlpha,
        uMouse: b.uMouse as unknown as { value: THREE.Vector3 },
        uHover: b.uHover,
        uTime: b.uTime,
        uRadius: b.uRadius,
        uPush: b.uPush,
        dispose: b.dispose,
      };
      setTslStatic(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
      setTslStatic(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStatic, gridSize, homeField]);

  // === TWO-LAYER build (particles-2layer) ===================================
  // Two independent momentum rigs (BODY then SKIN), same dual-backend discipline
  // as the single-layer build above, just mapped over the two presets. Each rig
  // gets its own home field + config + render opts; the model-space cursor is
  // shared and fed to both in useFrame. Built only in 2layer mode.
  interface GlslLayer {
    rig: GpgpuSimRig;
    material: THREE.ShaderMaterial & { uniforms: GpgpuRenderUniforms };
    geometry: THREE.InstancedBufferGeometry;
    spec: GpgpuLayerConfig;
  }
  const [glsl2, setGlsl2] = useState<GlslLayer[] | null>(null);
  useEffect(() => {
    if (webgpuEnabled() || !gpgpuOk || floatType == null || !show2Layer) return;
    const defs = [
      { spec: BODY_LAYER, home: bodyHome },
      { spec: SKIN_LAYER, home: skinHome },
    ];
    const built: GlslLayer[] = defs.map(({ spec, home }) => {
      const cfg: GpgpuConfig = { ...spec.config, SIZE: gridSize };
      const rig = createGpgpuSim(
        gl as THREE.WebGLRenderer,
        home.homeRGBA,
        gridSize,
        cfg,
        floatType,
      );
      const material = createGpgpuRenderMaterial(cfg, spec.render);
      const geometry = new THREE.InstancedBufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
      geometry.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
      geometry.setAttribute("aRef", new THREE.InstancedBufferAttribute(home.aRef, 2));
      geometry.instanceCount = home.count;
      return { rig, material, geometry, spec };
    });
    setGlsl2(built);
    return () => {
      built.forEach((b) => {
        b.rig.dispose();
        b.material.dispose();
        b.geometry.dispose();
      });
      setGlsl2(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpgpuOk, floatType, gridSize, bodyHome, skinHome, show2Layer]);

  interface TslLayer {
    rig: GpgpuSimRig;
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.Material;
    uFade: { value: number };
    uPointSize: { value: number };
    uPixelRatio: { value: number };
    uViewport: { value: THREE.Vector2 };
    uEmissive: { value: number };
    uPointAlpha: { value: number };
    spec: GpgpuLayerConfig;
    dispose: () => void;
  }
  const [tsl2, setTsl2] = useState<TslLayer[] | null>(null);
  useEffect(() => {
    if (!webgpuEnabled() || !gpgpuOk || floatType == null || !show2Layer) return;
    let cancelled = false;
    let built: TslLayer[] | null = null;
    void Promise.all([
      import("three/webgpu"),
      import("three/tsl"),
      import("./gpgpu/gpgpuNodeSim"),
    ]).then(([webgpu, tslNs, mod]) => {
      if (cancelled) return;
      const defs = [
        { spec: BODY_LAYER, home: bodyHome },
        { spec: SKIN_LAYER, home: skinHome },
      ];
      // WebGPU backend → compute + storage buffers (per layer, no FBO round-trip);
      // WebGL2 sub-backend → FBO rig. Same routing as the single-layer path.
      const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
        .backend;
      const isWebGPUBackend =
        !!bk &&
        bk.isWebGLBackend !== true &&
        typeof (gl as unknown as { compute?: unknown }).compute === "function";
      built = defs.map(({ spec, home }) => {
        const cfg: GpgpuConfig = { ...spec.config, SIZE: gridSize };
        const b = isWebGPUBackend
          ? mod.createGpgpuComputeNodeSim(
              gl as never,
              webgpu as never,
              tslNs as never,
              home.homeRGBA,
              home.aRef,
              gridSize,
              cfg,
              spec.render,
            )
          : mod.createGpgpuNodeSim(
              gl as never,
              webgpu as never,
              tslNs as never,
              home.homeRGBA,
              home.aRef,
              gridSize,
              cfg,
              floatType,
              spec.render,
            );
        return {
          rig: b.rig,
          geometry: b.geometry as unknown as THREE.InstancedBufferGeometry,
          material: b.material as unknown as THREE.Material,
          uFade: b.uFade,
          uPointSize: b.uPointSize,
          uPixelRatio: b.uPixelRatio,
          uViewport: b.uViewport as unknown as { value: THREE.Vector2 },
          uEmissive: b.uEmissive,
          uPointAlpha: b.uPointAlpha,
          spec,
          dispose: b.dispose,
        };
      });
      setTsl2(built);
    });
    return () => {
      cancelled = true;
      built?.forEach((b) => b.dispose());
      setTsl2(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpgpuOk, floatType, gridSize, bodyHome, skinHome, show2Layer]);

  // Active rig + render mesh. OFF → GLSL (synchronous); ON → TSL once resolved.
  const rig = glsl?.rig ?? tsl?.rig;
  const renderGeometry = glsl?.geometry ?? tsl?.geometry;
  const renderMaterial = (glsl?.material ?? tsl?.material) as
    | THREE.Material
    | undefined;

  // Active static build (bisection). OFF → GLSL; ON → TSL once resolved.
  const staticGeometry = glslStatic?.geometry ?? tslStatic?.geometry;
  const staticMaterial = (glslStatic?.material ?? tslStatic?.material) as
    | THREE.Material
    | undefined;

  // Reset the poster cross-fade if this component unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  // === Per-frame: shell choreography + model-space mouse + sim step =========
  // Scratch objects (no per-frame allocation).
  const planeN = useMemo(() => new THREE.Vector3(), []);
  const worldHit = useMemo(() => new THREE.Vector3(), []);
  const worldCenter = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const modelMouse = useMemo(() => new THREE.Vector3(), []);
  const tickParams = useMemo<GpgpuTickParams>(
    () => ({ dt: 1 / 60, time: 0, mouse: new THREE.Vector3() }),
    [],
  );

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const assembly = assemblyRef.current;
    const spin = spinRef.current;
    if (!group || !assembly || !spin) return;

    // Clamp delta: after a tab refocus / long stall R3F hands us a multi-second
    // delta that would over-shoot the tilt damp and the sim.
    const delta = Math.min(rawDelta, 1 / 30);

    if (!announcedReady.current) {
      announcedReady.current = true;
      useTierStore.getState().setHeroReady(true);
    }

    const fx = useFxStore.getState();
    const { progress } = useScrollStore.getState();
    const drag = useHeroDragStore.getState();
    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollPx = progress * Math.max(sh - ih, 0);

    const heroSpan = anchors.spans["hero"];
    const heroEndPx = heroSpan ? Math.max(heroSpan.end * sh - ih, 1) : ih * 4.2;
    const hp = THREE.MathUtils.clamp(scrollPx / heroEndPx, 0, 1);

    // Hold through the pin; recede + fade over the last quarter (identical to
    // the previous HeroLogo so the handoff is unchanged).
    const fade = 1 - THREE.MathUtils.smoothstep(hp, 0.74, 0.97);
    fadeRef.current = fade;
    group.visible = fade > 0.005;
    if (!group.visible) return;

    // Framing + scroll choreography. The at-rest values come from LIVE fxStore
    // knobs (heroOffsetX / heroOffsetY / heroPosZ / heroScale) so the mark can
    // be tuned in the leva "GPGPU hero" folder (window.__sersanFx in dev). The
    // defaults frame the wide 2.64×2 mark as a PROMINENT, front-facing, fully-
    // visible particle logo on the hero right, near the content plane (verified
    // against CAMERA_Z/FOV: at hp=0 the full mark sits inside the viewport with
    // margin across every desktop aspect). The hp terms keep the loved scroll
    // choreography on top of those rest values: the mark drifts gently left,
    // sinks a touch, and recedes as the camera "passes" it, Lusion-style.
    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    group.position.set(
      worldViewWidth * (fx.heroOffsetX - hp * 0.05),
      camera.position.y - WORLD_VIEW_HEIGHT * (fx.heroOffsetY + hp * 0.04),
      fx.heroPosZ - hp * 2.2,
    );
    group.scale.setScalar(baseScale * (1 - 0.2 * hp) * (0.92 + 0.08 * fade));

    // ANCHORED mark — no drag-to-rotate, no idle spin. The mark sits STILL at
    // its front-facing rest and only "looks toward" the cursor by a few degrees:
    // a soft mouse-parallax tilt that eases on top of the fixed TILT base and
    // returns to rest (0,0) when the pointer is centered/absent.
    //
    // The smoothed pointer is clip [0..1] top-left; map to NDC-ish −1..1 from
    // screen center (X→right, Y→up). Target yaw follows X, target pitch is the
    // BASE tilt minus pointer-Y (look up when the cursor is high). Damp toward
    // it with THREE.MathUtils.damp so it eases smoothly. The drag layer still
    // captures the pointer (it feeds `hovering` for the repulsion below) — its
    // drag velocity is simply ignored, so click-and-hold never moves the mark.
    const ptr = usePointerStore.getState();
    const maxTilt = fx.gpgpuTilt;
    const px = ptr.active ? ptr.smooth.x * 2 - 1 : 0;
    const py = ptr.active ? -(ptr.smooth.y * 2 - 1) : 0;
    const targetYaw = px * maxTilt;
    const targetPitch = TILT - py * maxTilt;
    // `spin` carries the parallax yaw, `assembly` the parallax pitch (its base
    // is the fixed TILT). damp(current, target, lambda, dt) eases frame-rate
    // independently toward rest when the pointer is centered/absent.
    spin.rotation.y = THREE.MathUtils.damp(
      spin.rotation.y,
      targetYaw,
      TILT_DAMP,
      delta,
    );
    assembly.rotation.x = THREE.MathUtils.damp(
      assembly.rotation.x,
      targetPitch,
      TILT_DAMP,
      delta,
    );

    // --- SHIPPING static feed (analytic dispersion) -------------------------
    // The static render reads its own per-instance `aHome` positions (no sim,
    // no rig to step) and analytically displaces particles near the cursor in
    // the vertex shader. Feed it the model-space cursor + eased hover so the
    // lift fades in/out, plus the live render/force knobs.
    if (showStatic) {
      const dprStatic = Math.min(gl.getPixelRatio(), 2);

      // Eased hover: target 1 while the hero is hovered (and a pointer is
      // active), else 0. Damping it gives the soft settle on cursor-leave.
      const hoverTarget = drag.hovering && ptr.active ? 1 : 0;
      hoverRef.current = THREE.MathUtils.damp(
        hoverRef.current,
        hoverTarget,
        4,
        delta,
      );

      // Model-space cursor — SAME computation the GPGPU path uses (raycast a
      // camera-facing plane through the cloud center, then spin.worldToLocal),
      // so the dispersion follows the faint parallax tilt. Far value when not
      // hovering so the falloff → 0 (no displacement).
      if (drag.hovering && ptr.active) {
        spin.getWorldPosition(worldCenter);
        camera.getWorldDirection(planeN);
        plane.setFromNormalAndCoplanarPoint(planeN, worldCenter);
        ndc.set(ptr.smooth.x * 2 - 1, -(ptr.smooth.y * 2 - 1));
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, worldHit)) {
          modelMouse.copy(worldHit);
          spin.worldToLocal(modelMouse);
        } else {
          modelMouse.copy(MOUSE_OFF);
        }
      } else {
        modelMouse.copy(MOUSE_OFF);
      }

      simTimeRef.current += delta;

      if (glslStatic) {
        const u = glslStatic.uniforms;
        u.uPointSize.value = fx.gpgpuPointSize;
        u.uPixelRatio.value = dprStatic;
        u.uViewport.value.set(size.width * dprStatic, size.height * dprStatic);
        u.uFade.value = fade;
        u.uEmissive.value = fx.gpgpuEmissive;
        u.uPointAlpha.value = fx.gpgpuPointAlpha;
        u.uMouse.value.copy(modelMouse);
        u.uHover.value = hoverRef.current;
        u.uTime.value = simTimeRef.current;
        u.uRadius.value = fx.gpgpuRadius;
        u.uPush.value = fx.gpgpuPush;
      }
      if (tslStatic) {
        tslStatic.uPointSize.value = fx.gpgpuPointSize;
        tslStatic.uPixelRatio.value = dprStatic;
        tslStatic.uViewport.value.set(
          size.width * dprStatic,
          size.height * dprStatic,
        );
        tslStatic.uFade.value = fade;
        tslStatic.uEmissive.value = fx.gpgpuEmissive;
        tslStatic.uPointAlpha.value = fx.gpgpuPointAlpha;
        tslStatic.uMouse.value.copy(modelMouse);
        tslStatic.uHover.value = hoverRef.current;
        tslStatic.uTime.value = simTimeRef.current;
        tslStatic.uRadius.value = fx.gpgpuRadius;
        tslStatic.uPush.value = fx.gpgpuPush;
      }
      return;
    }

    // --- TWO-LAYER momentum sim (body + skin) -------------------------------
    // Step BOTH rigs with the SAME model-space cursor + dt, then feed each
    // layer's render uniforms from its OWN preset (body calm/violet/opaque,
    // skin reactive/cyan/additive). Body renders first (occludes), skin over it.
    if (show2Layer && (glsl2 || tsl2)) {
      // Shared model-space cursor — identical projection to the single-layer
      // path (raycast a camera-facing plane through the cloud center, then
      // spin.worldToLocal). Far value when not hovering → repulsion vanishes.
      if (drag.hovering && ptr.active) {
        spin.getWorldPosition(worldCenter);
        camera.getWorldDirection(planeN);
        plane.setFromNormalAndCoplanarPoint(planeN, worldCenter);
        ndc.set(ptr.smooth.x * 2 - 1, -(ptr.smooth.y * 2 - 1));
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, worldHit)) {
          modelMouse.copy(worldHit);
          spin.worldToLocal(modelMouse);
        } else {
          modelMouse.copy(MOUSE_OFF);
        }
      } else {
        modelMouse.copy(MOUSE_OFF);
      }

      simTimeRef.current += delta;
      tickParams.dt = delta;
      tickParams.time = simTimeRef.current;
      tickParams.mouse.copy(modelMouse);

      const dpr2 = Math.min(gl.getPixelRatio(), 2);
      if (glsl2) {
        for (const layer of glsl2) {
          layer.rig.tick(tickParams);
          const u = layer.material.uniforms;
          u.uPosTex.value = layer.rig.positionTexture;
          u.uVelTex.value = layer.rig.velocityTexture;
          u.uPointSize.value = layer.spec.config.POINT_SIZE;
          u.uPixelRatio.value = dpr2;
          u.uViewport.value.set(size.width * dpr2, size.height * dpr2);
          u.uFade.value = fade;
          u.uEmissive.value = layer.spec.config.EMISSIVE;
          u.uPointAlpha.value = layer.spec.config.POINT_ALPHA;
        }
      } else if (tsl2) {
        for (const layer of tsl2) {
          // TSL render samples the RTs via its own repointed texture nodes
          // (done inside rig.tick); here we only drive the shared uniforms.
          layer.rig.tick(tickParams);
          layer.uPointSize.value = layer.spec.config.POINT_SIZE;
          layer.uPixelRatio.value = dpr2;
          layer.uViewport.value.set(size.width * dpr2, size.height * dpr2);
          layer.uFade.value = fade;
          layer.uEmissive.value = layer.spec.config.EMISSIVE;
          layer.uPointAlpha.value = layer.spec.config.POINT_ALPHA;
        }
      }
      return;
    }

    // Nothing more to do until the active rig exists (synchronous on OFF; after
    // the lazy TSL chunk resolves on ON).
    if (!rig) return;

    // --- Model-space mouse ---------------------------------------------------
    // Project the smoothed cursor onto a camera-facing plane through the cloud
    // center, then worldToLocal so repulsion stays aligned under the faint
    // parallax tilt. The particle positions live in `spin`'s local space (spin =
    // parallax yaw, nested under assembly = base TILT + parallax pitch), so we
    // convert into `spin` — exact regardless of the tilt. Push the mouse to
    // infinity when the hero isn't hovered (or no pointer), so repulsion
    // vanishes on pointer-leave / coarse devices.
    if (drag.hovering && ptr.active) {
      spin.getWorldPosition(worldCenter);
      camera.getWorldDirection(planeN);
      plane.setFromNormalAndCoplanarPoint(planeN, worldCenter);
      // pointerStore.smooth is clip [0..1] top-left → NDC.
      ndc.set(ptr.smooth.x * 2 - 1, -(ptr.smooth.y * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, worldHit)) {
        // worldToLocal mutates its argument in place — copy the hit into the
        // scratch first, then convert (no per-frame allocation).
        modelMouse.copy(worldHit);
        spin.worldToLocal(modelMouse);
      } else {
        modelMouse.copy(MOUSE_OFF);
      }
    } else {
      modelMouse.copy(MOUSE_OFF);
    }

    // --- Live force knobs (leva → fxStore) ----------------------------------
    rig.setForces({
      spring: fx.gpgpuSpring,
      push: fx.gpgpuPush,
      radius: fx.gpgpuRadius,
      damping: fx.gpgpuDamping,
      turbBase: fx.gpgpuTurbBase,
    });

    // --- Advance the GPU simulation one step --------------------------------
    simTimeRef.current += delta;
    tickParams.dt = delta;
    tickParams.time = simTimeRef.current;
    tickParams.mouse.copy(modelMouse);
    rig.tick(tickParams);

    // --- Feed the render material -------------------------------------------
    // devicePixelRatio capped at 2 (PRD §5). The billboard converts a
    // device-pixel sprite size to a clip-space corner offset, so it needs the
    // real drawing-buffer resolution (CSS px × dpr).
    const dpr = Math.min(gl.getPixelRatio(), 2);
    if (glsl) {
      const u = glsl.uniforms;
      u.uPosTex.value = rig.positionTexture;
      u.uVelTex.value = rig.velocityTexture;
      u.uPointSize.value = fx.gpgpuPointSize;
      u.uPixelRatio.value = dpr;
      u.uViewport.value.set(size.width * dpr, size.height * dpr);
      u.uFade.value = fade;
      u.uEmissive.value = fx.gpgpuEmissive;
      u.uPointAlpha.value = fx.gpgpuPointAlpha;
    } else if (tsl) {
      // The TSL render material samples the RTs via its own repointed texture
      // nodes (done inside rig.tick); here we only drive the shared uniforms.
      tsl.uPointSize.value = fx.gpgpuPointSize;
      tsl.uPixelRatio.value = dpr;
      tsl.uViewport.value.set(size.width * dpr, size.height * dpr);
      tsl.uFade.value = fade;
      tsl.uEmissive.value = fx.gpgpuEmissive;
      tsl.uPointAlpha.value = fx.gpgpuPointAlpha;
    }
  });

  // The particle mesh renders only when the rig + render mesh exist (synchronous
  // on OFF; after the lazy TSL chunk resolves on ON) AND the mode asks for it.
  // When gpgpuOk is false this stays null forever — nothing renders, no crash —
  // but heroReady still fires from useFrame so the poster/drag handoff is
  // unaffected. The solid DEBUG mesh is independent of the rig, so the group is
  // always mounted (it also keeps useFrame running so heroReady is announced).
  const particleMesh =
    showParticles && renderGeometry && renderMaterial ? (
      // The GPU particle cloud. frustumCulled off: the instanced quad's
      // bounding sphere is the tiny unit quad, so a naive cull would drop the
      // whole field.
      <mesh
        geometry={renderGeometry}
        material={renderMaterial}
        frustumCulled={false}
      />
    ) : null;

  // The DEBUG solid mark — the SAME normalized bodyGeometry that feeds
  // MeshSurfaceSampler, drawn as an unlit violet mesh under the identical
  // spin/assembly/group transform stack so it's framed exactly like the
  // particles. React mounts/unmounts it with the mode.
  const solidMesh = showSolid ? (
    <mesh geometry={bodyGeometry} material={solidMaterial} />
  ) : null;

  // BISECTION static mesh — the particle billboards placed at their HOME
  // positions (per-instance `aHome`), bypassing the GPGPU position texture +
  // sim. Parented under the SAME spin/assembly/group stack so it's framed
  // exactly like solid + particles. Renders once the build resolves
  // (synchronous on OFF; after the lazy TSL chunk on ON).
  const staticMesh =
    showStatic && staticGeometry && staticMaterial ? (
      <mesh
        geometry={staticGeometry}
        material={staticMaterial}
        frustumCulled={false}
      />
    ) : null;

  // TWO-LAYER meshes (particles-2layer): BODY first (renderOrder 0 — occludes,
  // reads solid) then SKIN (renderOrder 1 — additive glow over it). Active on
  // the OFF (glsl2) or ON (tsl2) path once the rigs are built.
  type Render2Layer = {
    geometry: THREE.InstancedBufferGeometry;
    material: THREE.Material;
    spec: GpgpuLayerConfig;
  };
  const twoLayer: Render2Layer[] | null = glsl2 ?? tsl2;
  const twoLayerMeshes =
    show2Layer && twoLayer
      ? twoLayer.map((layer, i) => (
          <mesh
            key={i}
            geometry={layer.geometry}
            material={layer.material}
            frustumCulled={false}
            renderOrder={i}
          />
        ))
      : null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly carries the pitch (base TILT + parallax); the model-space
          mouse is computed against THIS group's worldToLocal so repulsion
          follows the faint parallax tilt. `spin` carries the parallax yaw. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0]}>
        <group ref={spinRef}>
          {solidMesh}
          {particleMesh}
          {staticMesh}
          {twoLayerMeshes}
        </group>
      </group>
    </group>
  );
}

// The shared unit-quad corners for the billboard (z=0, xy in [-0.5,0.5]). The
// vertex shader expands these to a per-instance screen size in clip space.
const QUAD_CORNERS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

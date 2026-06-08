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
 *  - drag consumption (heroDragStore vx/vy with yaw inertia + a pitch spring).
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
  type GpgpuRenderUniforms,
} from "./gpgpu/gpgpuRenderShader";
import {
  DEFAULT_GPGPU_CONFIG,
  SIZE_BY_TIER,
  type GpgpuConfig,
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

const TILT = THREE.MathUtils.degToRad(8);
/** Idle yaw: one slow turn ≈ 30s, so the depth of the mark reads. */
const IDLE_SPIN = (Math.PI * 2) / 30;
/** Pitch spring (drag returns to the natural tilt with weight). */
const SPRING_K = 16;
const SPRING_DAMP = 5.0;

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
  dispose: () => void;
}

export function HeroLogo({ tier, anchors }: HeroLogoProps) {
  const { camera, size, gl, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const fadeRef = useRef(1);
  const pitchVel = useRef(0);
  const simTimeRef = useRef(0);
  const announcedReady = useRef(false);

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

  // === Home positions: SIZE×SIZE surface samples → the rest field. ==========
  // homeRGBA seeds the home/position float textures; aRef is the per-instance
  // grid UV the render uses to look up its own particle. The mesh is unrendered.
  const homeField = useMemo(
    () => sampleMarkHomePositions(bodyGeometry, gridSize),
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
      const b = mod.createGpgpuNodeSim(
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

  // Active rig + render mesh. OFF → GLSL (synchronous); ON → TSL once resolved.
  const rig = glsl?.rig ?? tsl?.rig;
  const renderGeometry = glsl?.geometry ?? tsl?.geometry;
  const renderMaterial = (glsl?.material ?? tsl?.material) as
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
    // delta that would blow up the pitch spring and the sim.
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

    // Scroll choreography: drifts gently left and sinks a touch as the story
    // advances — the camera "passes" it, Lusion-style.
    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    group.position.set(
      worldViewWidth * (0.245 - hp * 0.05),
      camera.position.y - WORLD_VIEW_HEIGHT * (0.02 + hp * 0.04),
      -1.6 - hp * 2.2,
    );
    group.scale.setScalar(baseScale * (1 - 0.2 * hp) * (0.92 + 0.08 * fade));

    // Idle yaw spin.
    spin.rotation.y += IDLE_SPIN * delta;

    // Drag — yaw coasts with inertia; pitch is a damped spring around the tilt.
    assembly.rotation.y += drag.vx * delta;
    const restPitch = TILT;
    pitchVel.current +=
      (-(assembly.rotation.x - restPitch) * SPRING_K -
        pitchVel.current * SPRING_DAMP) *
        delta +
      drag.vy * delta * 9.0;
    assembly.rotation.x += pitchVel.current * delta;
    drag.damp(Math.exp(-2.8 * delta));

    // Nothing more to do until the active rig exists (synchronous on OFF; after
    // the lazy TSL chunk resolves on ON).
    if (!rig) return;

    // --- Model-space mouse ---------------------------------------------------
    // Project the smoothed cursor onto a camera-facing plane through the
    // assembly center, then worldToLocal so repulsion follows the drag rotation.
    // Push it to infinity when the hero isn't hovered (or no pointer), so the
    // repulsion vanishes on pointer-leave / coarse devices.
    const ptr = usePointerStore.getState();
    if (drag.hovering && ptr.active) {
      assembly.getWorldPosition(worldCenter);
      camera.getWorldDirection(planeN);
      plane.setFromNormalAndCoplanarPoint(planeN, worldCenter);
      // pointerStore.smooth is clip [0..1] top-left → NDC.
      ndc.set(ptr.smooth.x * 2 - 1, -(ptr.smooth.y * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, worldHit)) {
        // worldToLocal mutates its argument in place — copy the hit into the
        // scratch first, then convert (no per-frame allocation).
        modelMouse.copy(worldHit);
        assembly.worldToLocal(modelMouse);
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
    } else if (tsl) {
      // The TSL render material samples the RTs via its own repointed texture
      // nodes (done inside rig.tick); here we only drive the shared uniforms.
      tsl.uPointSize.value = fx.gpgpuPointSize;
      tsl.uPixelRatio.value = dpr;
      tsl.uViewport.value.set(size.width * dpr, size.height * dpr);
      tsl.uFade.value = fade;
    }
  });

  // No render until the active rig + render mesh exist (synchronous on OFF;
  // after the lazy TSL chunk resolves on ON). When gpgpuOk is false this stays
  // null forever — nothing renders, no crash — but heroReady still fires from
  // useFrame so the poster/drag handoff is unaffected.
  if (!renderGeometry || !renderMaterial) {
    // Still mount the group (invisible) so useFrame runs and announces ready.
    return (
      <group ref={groupRef} visible={false}>
        <group ref={assemblyRef} rotation={[TILT, 0, 0]}>
          <group ref={spinRef} />
        </group>
      </group>
    );
  }

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly carries the tilt and answers the drag; the model-space mouse
          is computed against THIS group's worldToLocal so repulsion follows it
          as it rotates. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0]}>
        <group ref={spinRef}>
          {/* The GPU particle cloud. The solid mark mesh is NOT drawn — it only
              fed MeshSurfaceSampler. frustumCulled off: the instanced quad's
              bounding sphere is the tiny unit quad, so a naive cull would drop
              the whole field. */}
          <mesh
            geometry={renderGeometry}
            material={renderMaterial}
            frustumCulled={false}
          />
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

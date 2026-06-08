"use client";

/**
 * Hero logo — the dissolving SERSAN mark. Replaces the procedural Saturn
 * (HeroPlanet) as the home-page hero object.
 *
 * The full SERSAN symbol (two mirrored stencil "S" letters flanking a central
 * divider, from components/sersan-logo.tsx) is extruded in 3D as a matte navy
 * letterform that gently rotates. On interaction (hover or drag of the hero)
 * the SOLID SURFACE ERODES along a sweeping object-space noise front and the
 * eroded surface CONVERTS INTO thousands of glowing cyan→violet particles that
 * lift off and drift; on release the particles fly back and the surface
 * reforms. The mesh erosion and the particle birth share the SAME noise
 * threshold field driven by ONE `uDissolve` uniform (0 = solid, 1 = fully
 * dispersed), so it reads as "the letter turning to light-dust and back".
 *
 * Integration contract copied verbatim from HeroPlanet so the object sits in
 * the same place and hands off identically on scroll:
 *  - announces heroReady on the first frame (arms the drag-capture layer),
 *    resets it on unmount;
 *  - screen-anchored across the 520vh sticky pin (position relative to
 *    camera.position.y, worldViewWidth, the `hp` hero-span progress, the
 *    `fade = 1 - smoothstep(hp,0.74,0.97)` recede+fade handoff, group.visible);
 *  - delta clamp for tab-refocus stalls;
 *  - drag consumption (heroDragStore vx/vy with yaw inertia + a pitch spring).
 *
 * Material backend selection mirrors HeroPlanet / DriftParticles: the GLSL
 * ShaderMaterials in `logoShader.ts` (flag OFF, the live/verified path) and the
 * TSL NodeMaterials in `logoNodeMaterial.ts` (flag ON; raw GLSL renders black
 * under a WebGPU backend). The TSL module imports `three/webgpu` + `three/tsl`,
 * so it is lazy-imported ONLY on the ON path. Both builds expose the SAME
 * `{ uX: { value } }` uniform shapes, so the per-frame writes drive either.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { sampleMarkParticles } from "./geometry/sersanMark";
import {
  createDissolveBodyMaterial,
  createDissolveParticleMaterial,
  type DissolveBodyUniforms,
  type DissolveParticleUniforms,
} from "./materials/logoShader";
import { webgpuEnabled } from "./renderer/createRenderer";
import { useScrollStore } from "./store/scrollStore";
import { useTierStore, type SceneTier } from "./store/tierStore";
import { useFxStore } from "./store/fxStore";
import { useHeroDragStore } from "./store/heroDragStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroLogoProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

const TILT = THREE.MathUtils.degToRad(8);
/** Idle yaw: one slow turn ≈ 30s, so the extruded depth + bevel read. */
const IDLE_SPIN = (Math.PI * 2) / 30;
/** Pitch spring (drag returns to the natural tilt with weight). */
const SPRING_K = 16;
const SPRING_DAMP = 5.0;

/** Per-tier particle count + geometry detail. */
const PARTICLE_COUNT: Record<string, number> = { full: 12000, lite: 4000 };

// The shared unit-quad corners for the billboard (z=0, xy in [-0.5,0.5]) — same
// contract as DriftParticles. The vertex shader expands these to a per-instance
// screen size in clip space.
const QUAD_CORNERS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

/** The Blender-built SERSAN mark. Geometry-only (no materials). */
const MARK_GLB = "/models/sersan-mark.glb";
/** Normalize the GLB to ~2 world units tall (same envelope as the old
 * procedural mark, so HeroPlanet's anchoring/scale math is unchanged). */
const TARGET_HEIGHT = 2;
useGLTF.preload(MARK_GLB);

export function HeroLogo({ tier, anchors }: HeroLogoProps) {
  const { camera, size, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const fadeRef = useRef(1);
  const pitchVel = useRef(0);
  const dissolveRef = useRef(0);
  const announcedReady = useRef(false);

  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  // === Geometry: the Blender-built mark (solid body). ======================
  // The GLB is a single clean beveled mesh (two stencil S's + central divider).
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

    // Center, then uniformly scale to ~TARGET_HEIGHT tall (depth + bevel shrink
    // in proportion), recenter for safety — the SAME envelope the procedural
    // mark produced, so the object-space dissolve field and the anchoring math
    // both stay consistent.
    geometry.center();
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (bbox) {
      const height = bbox.max.y - bbox.min.y || 1;
      const s = TARGET_HEIGHT / height;
      geometry.scale(s, s, s);
    }
    geometry.center();
    // The GLB ships normals — keep them; only compute if absent.
    if (!geometry.getAttribute("normal")) {
      geometry.computeVertexNormals();
    }
    // Fresh bounding sphere after the transforms so R3F's default frustum cull
    // on the solid body keeps it on-screen (the particle mesh opts out).
    geometry.computeBoundingSphere();
    return geometry;
  }, [nodes, tier]);
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // === Geometry: the instanced billboard quad + per-particle surface buffers.
  const particleGeometry = useMemo(() => {
    const count = PARTICLE_COUNT[tier] ?? PARTICLE_COUNT.lite;
    const { aRest, aNormal, aSeed, aThreshold } = sampleMarkParticles(
      bodyGeometry,
      count,
    );

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
    geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    geo.setAttribute("aRest", new THREE.InstancedBufferAttribute(aRest, 3));
    geo.setAttribute("aNormal", new THREE.InstancedBufferAttribute(aNormal, 3));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute(
      "aThreshold",
      new THREE.InstancedBufferAttribute(aThreshold, 1),
    );
    geo.instanceCount = count;
    return geo;
  }, [bodyGeometry, tier]);
  useEffect(() => () => particleGeometry.dispose(), [particleGeometry]);

  // === Materials: GLSL synchronous (OFF) / TSL lazy (ON). ==================
  const glslBody = useMemo(
    () => (webgpuEnabled() ? null : createDissolveBodyMaterial()),
    [],
  );
  const glslParticle = useMemo(
    () => (webgpuEnabled() ? null : createDissolveParticleMaterial()),
    [],
  );

  const [tsl, setTsl] = useState<{
    body: { material: THREE.Material; uniforms: DissolveBodyUniforms };
    particle: { material: THREE.Material; uniforms: DissolveParticleUniforms };
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: {
      body: { material: THREE.Material; uniforms: DissolveBodyUniforms };
      particle: {
        material: THREE.Material;
        uniforms: DissolveParticleUniforms;
      };
    } | null = null;
    void import("./materials/logoNodeMaterial").then((m) => {
      if (cancelled) return;
      const body = m.createDissolveBodyNodeMaterial();
      const particle = m.createDissolveParticleNodeMaterial();
      built = {
        body: {
          material: body.material as unknown as THREE.Material,
          uniforms: body.uniforms as unknown as DissolveBodyUniforms,
        },
        particle: {
          material: particle.material as unknown as THREE.Material,
          uniforms: particle.uniforms as unknown as DissolveParticleUniforms,
        },
      };
      setTsl(built);
    });
    return () => {
      cancelled = true;
      built?.body.material.dispose();
      built?.particle.material.dispose();
    };
  }, []);

  // Active materials + shared uniform refs. OFF → GLSL (synchronous); ON → TSL
  // once its lazy chunk resolves.
  const bodyMaterial = (glslBody ?? tsl?.body.material) as
    | THREE.Material
    | undefined;
  const particleMaterial = (glslParticle ?? tsl?.particle.material) as
    | THREE.Material
    | undefined;
  const bodyUniforms = (glslBody?.uniforms ?? tsl?.body.uniforms) as
    | DissolveBodyUniforms
    | undefined;
  const particleUniforms = (glslParticle?.uniforms ?? tsl?.particle.uniforms) as
    | DissolveParticleUniforms
    | undefined;

  // Dispose the GLSL builds on unmount (OFF path). TSL builds are disposed by
  // their own effect cleanup above.
  useEffect(
    () => () => {
      glslBody?.dispose();
      glslParticle?.dispose();
    },
    [glslBody, glslParticle],
  );

  // Reset the poster cross-fade if this component unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    const assembly = assemblyRef.current;
    const spin = spinRef.current;
    if (!group || !assembly || !spin) return;

    // Clamp delta: after a tab refocus / long stall R3F hands us a multi-second
    // delta that would blow up the pitch spring and jump the idle spin.
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
    // HeroPlanet so the handoff is unchanged).
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

    // Idle yaw spin (the extruded depth + bevel make it legible).
    spin.rotation.y += IDLE_SPIN * delta;

    // Drag — yaw coasts with inertia; pitch is a damped spring around the
    // natural tilt.
    assembly.rotation.y += drag.vx * delta;
    const restPitch = TILT;
    pitchVel.current +=
      (-(assembly.rotation.x - restPitch) * SPRING_K -
        pitchVel.current * SPRING_DAMP) *
        delta +
      drag.vy * delta * 9.0;
    assembly.rotation.x += pitchVel.current * delta;
    drag.damp(Math.exp(-2.8 * delta));

    // Dissolve target: 1 while hovering or dragging the hero, else 0. Eased with
    // an exponential approach so it melts/reforms smoothly.
    const target = drag.hovering || drag.dragging ? 1 : 0;
    dissolveRef.current +=
      (target - dissolveRef.current) * (1 - Math.exp(-4 * delta));
    const dissolve = dissolveRef.current;

    // Shader clocks + dissolve — skipped until the lazy TSL uniforms resolve on
    // the ON path (synchronous on OFF). Drives either build via `{ value }`.
    if (bodyUniforms) {
      bodyUniforms.uTime.value += delta;
      bodyUniforms.uDissolve.value = dissolve;
    }
    if (particleUniforms) {
      particleUniforms.uTime.value += delta;
      particleUniforms.uDissolve.value = dissolve;
      particleUniforms.uFade.value = fade;
      particleUniforms.uPixelRatio.value = gl.getPixelRatio();
      // Framebuffer size in DEVICE pixels (CSS px * dpr) — the billboard
      // converts a device-pixel sprite size to a clip-space corner offset.
      particleUniforms.uViewport.value.set(
        size.width * gl.getPixelRatio(),
        size.height * gl.getPixelRatio(),
      );
    }
  });

  // No render until the active body/particle materials exist (synchronous on
  // OFF; after the lazy TSL chunk resolves on ON). Until then the poster covers
  // the hero (heroReady stays false because announcedReady only fires from
  // useFrame once the group renders).
  if (!bodyMaterial || !particleMaterial) return null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly carries the tilt and answers the drag. The GLB is upright
          (Y up) and centered, but its facing/mirror relative to the camera is
          not yet tuned — left at the procedural mark's resting tilt only.
          TODO(QA): tune facing/mirror here (e.g. add a Y/Z rotation) during
          visual QA; do NOT flip speculatively. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0]}>
        <group ref={spinRef}>
          {/* Solid extruded mark. */}
          <mesh geometry={bodyGeometry} material={bodyMaterial} />
          {/* The dust the eroding surface converts into. frustumCulled off:
              the instanced quad's bounding sphere is the tiny unit quad, so a
              naive cull would drop the whole field. */}
          <mesh
            geometry={particleGeometry}
            material={particleMaterial}
            frustumCulled={false}
          />
        </group>
      </group>
    </group>
  );
}

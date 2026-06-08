"use client";

/**
 * Hero planet v3 — "the SerSan planet". Fully procedural, brand-native.
 *
 * Same structure the reference approved (planet + 3D ring system + drag +
 * orbital trails) but every surface now belongs to the brand universe:
 * - body: dark gas giant, latitude bands flowing in navy/cyan/violet
 *   (materials/planetShader.ts — no textures, no HDRI, no Light objects)
 * - rings: bands of LIGHT (cyan core → violet rim), Saturn density profile,
 *   fine striations + angular grain drifting slowly so rotation is legible
 * - atmosphere: two layers — crisp inner rim + wide soft halo
 * - drag: spring physics. Yaw keeps inertia and coasts; pitch is
 *   spring-loaded around the natural 26.7° tilt, so the planet swings back
 *   with weight when released (award-feel, not a free trackball).
 * - scroll choreography: across the pinned hero story the planet drifts,
 *   the ring plane opens, and everything recedes+fades at handover.
 *
 * Screen-anchored during the 520vh sticky pin (follows the world-strip
 * camera); announces heroReady on first frame to arm the drag-to-rotate
 * capture layer.
 *
 * Material backend selection (mirrors SignatureLine / DriftParticles): each
 * procedural material exists in two builds — the GLSL `ShaderMaterial`s in
 * `planetShader.ts` (flag OFF, byte-identical to today) and the TSL
 * NodeMaterials in `planetNodeMaterial.ts` (flag ON; raw GLSL renders black
 * under a WebGPU backend). The TSL module imports `three/webgpu` + `three/tsl`,
 * so it is lazy-imported ONLY on the ON path (the dual-namespace pitfall — keep
 * the heavy node build out of the OFF/WebGL2 bundle). Every material exposes the
 * SAME `{ uX: { value } }` uniform shape, so the per-frame writes below drive
 * either build identically.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WORLD_VIEW_HEIGHT } from "./constants";
import {
  createPlanetBodyMaterial,
  createRingMaterial,
  createAtmosphereMaterial,
} from "./materials/planetShader";
import { webgpuEnabled } from "./renderer/createRenderer";
import { useScrollStore } from "./store/scrollStore";
import { useTierStore, type SceneTier } from "./store/tierStore";
import { useFxStore } from "./store/fxStore";
import { useHeroDragStore } from "./store/heroDragStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroPlanetProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

const TILT = THREE.MathUtils.degToRad(26.7);
/** Idle spin: one body turn ≈ 70s. Bands make it legible. */
const IDLE_SPIN = (Math.PI * 2) / 70;
/** Pitch spring (drag returns to the natural tilt with weight). */
const SPRING_K = 16;
const SPRING_DAMP = 5.0;

// Uniform shapes shared between the GLSL and TSL builds (same field names, each
// `{ value }`). The per-frame writes only touch `.value`, so one path drives
// both. `THREE.Color`/`THREE.Vector3` values are mutated in place exactly as the
// GLSL ShaderMaterial.uniforms.* are today.
type BodyUniforms = { uTime: { value: number } };
type RingUniforms = { uTime: { value: number }; uOpacity: { value: number } };
type TrailUniforms = { uTime: { value: number }; uFade: { value: number } };

// === Ring annulus with radial UVs (u = inner→outer). ======================
function createRingGeometry(inner: number, outer: number, segments = 256) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    positions.push(c * inner, s * inner, 0, c * outer, s * outer, 0);
    uvs.push(0, 0.5, 1, 0.5);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 3;
    const d = a + 2;
    indices.push(a, b, c, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// === Orbital light trail (comet head + exponential tail). =================
// GLSL build (flag OFF) — the inline shader, byte-identical to before.
const trailVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    float phase = fract(vUv.x - uTime * uSpeed);
    float head = pow(1.0 - phase, 7.0);
    float intensity = 0.12 + head * 2.6;
    float a = (0.10 + head) * uFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * intensity, a);
  }
`;

function createTrailGlslMaterial(spec: TrailSpec): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: trailVertex,
    fragmentShader: trailFragment,
    uniforms: {
      uColor: { value: new THREE.Color(spec.color) },
      uTime: { value: spec.radius * 37.0 }, // de-synced start phases
      uSpeed: { value: spec.speed },
      uFade: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

interface TrailSpec {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  color: string;
}

const TRAILS: TrailSpec[] = [
  { radius: 1.62, tilt: [0.42, 0.0, 0.22], speed: 0.1, color: "#3BE1FF" },
  { radius: 1.85, tilt: [-0.3, 0.4, -0.15], speed: -0.065, color: "#7C5CFF" },
  { radius: 1.45, tilt: [0.15, -0.6, 0.35], speed: 0.045, color: "#9adcff" },
];

function OrbitTrail({
  spec,
  fadeRef,
}: {
  spec: TrailSpec;
  fadeRef: React.MutableRefObject<number>;
}) {
  // GLSL build is synchronous on the OFF path; null on the ON path (where the
  // TSL build is lazy-loaded below). Mirrors SignatureLine's glsl/tsl split.
  const glsl = useMemo(
    () => (webgpuEnabled() ? null : createTrailGlslMaterial(spec)),
    [spec],
  );
  const [tsl, setTsl] = useState<{
    material: THREE.Material;
    uniforms: TrailUniforms;
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: { material: THREE.Material; uniforms: TrailUniforms } | null =
      null;
    void import("./materials/planetNodeMaterial").then(
      ({ createTrailNodeMaterial }) => {
        if (cancelled) return;
        const m = createTrailNodeMaterial({
          color: spec.color,
          time: spec.radius * 37.0, // de-synced start phase, matches GLSL
          speed: spec.speed,
        });
        built = {
          material: m.material as unknown as THREE.Material,
          uniforms: m.uniforms as unknown as TrailUniforms,
        };
        setTsl(built);
      },
    );
    return () => {
      cancelled = true;
      built?.material.dispose();
    };
  }, [spec]);

  const material = (glsl ?? tsl?.material) as THREE.Material | undefined;
  const uniforms = (glsl?.uniforms ?? tsl?.uniforms) as
    | TrailUniforms
    | undefined;

  useEffect(() => () => glsl?.dispose(), [glsl]);

  useFrame((_, delta) => {
    const u = uniforms;
    if (!u) return;
    u.uTime.value += delta;
    u.uFade.value = fadeRef.current;
  });

  if (!material) return null;

  return (
    <group rotation={spec.tilt}>
      <mesh material={material}>
        <torusGeometry args={[spec.radius, 0.0045, 8, 256]} />
      </mesh>
    </group>
  );
}

export function HeroPlanet({ tier, anchors }: HeroPlanetProps) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assemblyRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const fadeRef = useRef(1);
  const pitchVel = useRef(0);
  const announcedReady = useRef(false);

  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  // GLSL builds (flag OFF) — synchronous, byte-identical to today.
  const glslBody = useMemo(
    () => (webgpuEnabled() ? null : createPlanetBodyMaterial()),
    [],
  );
  const glslRing = useMemo(
    () => (webgpuEnabled() ? null : createRingMaterial()),
    [],
  );
  const glslInnerAtmo = useMemo(
    () =>
      webgpuEnabled()
        ? null
        : createAtmosphereMaterial({
            color: "#3BE1FF",
            intensity: 0.55,
            power: 4.2,
            alpha: 0.5,
            side: THREE.BackSide,
          }),
    [],
  );
  const glslOuterHalo = useMemo(
    () =>
      webgpuEnabled()
        ? null
        : createAtmosphereMaterial({
            color: "#3a7bd6",
            intensity: 0.4,
            power: 2.2,
            alpha: 0.14,
            side: THREE.BackSide,
          }),
    [],
  );

  // TSL builds (flag ON) — lazy-loaded so `three/webgpu` never enters the OFF
  // bundle. One dynamic import builds all four planet materials together.
  const [tsl, setTsl] = useState<{
    body: { material: THREE.Material; uniforms: BodyUniforms };
    ring: { material: THREE.Material; uniforms: RingUniforms };
    innerAtmo: THREE.Material;
    outerHalo: THREE.Material;
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: {
      body: { material: THREE.Material; uniforms: BodyUniforms };
      ring: { material: THREE.Material; uniforms: RingUniforms };
      innerAtmo: THREE.Material;
      outerHalo: THREE.Material;
    } | null = null;
    void import("./materials/planetNodeMaterial").then((m) => {
      if (cancelled) return;
      const body = m.createPlanetBodyNodeMaterial();
      const ring = m.createRingNodeMaterial();
      const innerAtmo = m.createAtmosphereNodeMaterial({
        color: "#3BE1FF",
        intensity: 0.55,
        power: 4.2,
        alpha: 0.5,
        side: THREE.BackSide,
      });
      const outerHalo = m.createAtmosphereNodeMaterial({
        color: "#3a7bd6",
        intensity: 0.4,
        power: 2.2,
        alpha: 0.14,
        side: THREE.BackSide,
      });
      built = {
        body: {
          material: body.material as unknown as THREE.Material,
          uniforms: body.uniforms as unknown as BodyUniforms,
        },
        ring: {
          material: ring.material as unknown as THREE.Material,
          uniforms: ring.uniforms as unknown as RingUniforms,
        },
        innerAtmo: innerAtmo.material as unknown as THREE.Material,
        outerHalo: outerHalo.material as unknown as THREE.Material,
      };
      setTsl(built);
    });
    return () => {
      cancelled = true;
      built?.body.material.dispose();
      built?.ring.material.dispose();
      built?.innerAtmo.dispose();
      built?.outerHalo.dispose();
    };
  }, []);

  // Active materials + shared uniform refs. OFF → GLSL (synchronous); ON → TSL
  // once its lazy chunk resolves.
  const bodyMaterial = (glslBody ?? tsl?.body.material) as
    | THREE.Material
    | undefined;
  const ringMaterial = (glslRing ?? tsl?.ring.material) as
    | THREE.Material
    | undefined;
  const innerAtmo = (glslInnerAtmo ?? tsl?.innerAtmo) as
    | THREE.Material
    | undefined;
  const outerHalo = (glslOuterHalo ?? tsl?.outerHalo) as
    | THREE.Material
    | undefined;
  const bodyUniforms = (glslBody?.uniforms ?? tsl?.body.uniforms) as
    | BodyUniforms
    | undefined;
  const ringUniforms = (glslRing?.uniforms ?? tsl?.ring.uniforms) as
    | RingUniforms
    | undefined;

  // Dispose the GLSL builds on unmount (OFF path). The TSL builds are disposed
  // by their own effect cleanup above.
  useEffect(
    () => () => {
      glslBody?.dispose();
      glslRing?.dispose();
      glslInnerAtmo?.dispose();
      glslOuterHalo?.dispose();
    },
    [glslBody, glslRing, glslInnerAtmo, glslOuterHalo],
  );

  const ringGeometry = useMemo(
    () => createRingGeometry(1.24, 2.3, tier === "full" ? 256 : 128),
    [tier],
  );
  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);

  // Reset the poster cross-fade if this component unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    const assembly = assemblyRef.current;
    const spin = spinRef.current;
    if (!group || !assembly || !spin) return;

    // Clamp delta: after a tab refocus / long stall R3F hands us a multi-
    // second delta. The semi-implicit-Euler pitch spring below would blow up
    // (and the idle spin would jump a full turn) on a raw value, so cap the
    // step at ~2 frames (33ms) — large enough to be invisible at 60fps,
    // small enough to keep the spring stable.
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

    // Hold through the pin; recede + fade over the last quarter.
    const fade = 1 - THREE.MathUtils.smoothstep(hp, 0.74, 0.97);
    fadeRef.current = fade;
    group.visible = fade > 0.005;
    if (!group.visible) return;

    // Scroll choreography: the planet drifts gently left and sinks a touch
    // as the story advances — the camera "passes" it, Lusion-style.
    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    group.position.set(
      worldViewWidth * (0.245 - hp * 0.05),
      camera.position.y - WORLD_VIEW_HEIGHT * (0.02 + hp * 0.04),
      -1.6 - hp * 2.2,
    );
    group.scale.setScalar(baseScale * (1 - 0.2 * hp) * (0.92 + 0.08 * fade));

    // Idle body spin (bands make it visible).
    spin.rotation.y += IDLE_SPIN * delta;

    // Drag — yaw coasts with inertia; pitch is a damped spring around the
    // natural tilt (+ a slow scroll-driven opening of the ring plane).
    assembly.rotation.y += drag.vx * delta;
    const restPitch = TILT + hp * 0.16;
    pitchVel.current +=
      (-(assembly.rotation.x - restPitch) * SPRING_K -
        pitchVel.current * SPRING_DAMP) *
        delta +
      drag.vy * delta * 9.0;
    assembly.rotation.x += pitchVel.current * delta;
    drag.damp(Math.exp(-2.8 * delta));

    // Shader clocks — skipped until the lazy TSL uniforms resolve on the ON
    // path (synchronous on OFF). Drives either build via the shared `{ value }`.
    if (bodyUniforms) bodyUniforms.uTime.value += delta;
    if (ringUniforms) {
      ringUniforms.uTime.value += delta;
      ringUniforms.uOpacity.value = 0.9 * fade;
    }
  });

  // No render until the active body/ring materials exist (synchronous on OFF;
  // after the lazy TSL chunk resolves on ON). Until then the poster covers the
  // hero (heroReady stays false because announcedReady only fires from useFrame
  // once the group renders).
  if (!bodyMaterial || !ringMaterial || !innerAtmo || !outerHalo) return null;

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly (body + rings) carries the tilt and answers the drag. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0.06]}>
        <group ref={spinRef}>
          <mesh material={bodyMaterial}>
            <sphereGeometry args={[1, tier === "full" ? 96 : 64, tier === "full" ? 64 : 48]} />
          </mesh>
        </group>

        {/* Ring system: built in XY, rotated onto XZ (edge-on at rest; the
            tilt opens the ellipse). depthTest on → the planet occludes the
            far half; the near half crosses in front. */}
        <mesh
          geometry={ringGeometry}
          material={ringMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>

      {/* Atmosphere: crisp inner rim + wide soft halo. */}
      <mesh material={innerAtmo} scale={1.025}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      <mesh material={outerHalo} scale={1.16}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>

      {/* The moving "scie": orbital light trails. */}
      {TRAILS.map((spec) => (
        <OrbitTrail key={spec.color + spec.radius} spec={spec} fadeRef={fadeRef} />
      ))}
    </group>
  );
}

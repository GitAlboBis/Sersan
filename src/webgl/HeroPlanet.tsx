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
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { WORLD_VIEW_HEIGHT } from "./constants";
import {
  createPlanetBodyMaterial,
  createRingMaterial,
  createAtmosphereMaterial,
} from "./materials/planetShader";
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
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
      }),
    [spec],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uFade.value = fadeRef.current;
  });
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

  const bodyMaterial = useMemo(() => createPlanetBodyMaterial(), []);
  const ringMaterial = useMemo(() => createRingMaterial(), []);
  const innerAtmo = useMemo(
    () =>
      createAtmosphereMaterial({
        color: "#3BE1FF",
        intensity: 0.55,
        power: 4.2,
        alpha: 0.5,
        side: THREE.BackSide,
      }),
    [],
  );
  const outerHalo = useMemo(
    () =>
      createAtmosphereMaterial({
        color: "#3a7bd6",
        intensity: 0.4,
        power: 2.2,
        alpha: 0.14,
        side: THREE.BackSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      bodyMaterial.dispose();
      ringMaterial.dispose();
      innerAtmo.dispose();
      outerHalo.dispose();
    },
    [bodyMaterial, ringMaterial, innerAtmo, outerHalo],
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

    // Shader clocks.
    bodyMaterial.uniforms.uTime.value += delta;
    ringMaterial.uniforms.uTime.value += delta;
    ringMaterial.uniforms.uOpacity.value = 0.9 * fade;
  });

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

"use client";

/**
 * Hero planet — the live WebGL successor of the pre-rendered Saturn videos.
 *
 * Faithfully ports scripts/render_planets.py (the original Blender pipeline
 * that produced public/cinematic/saturn-*.mp4) to real-time R3F:
 *   - same textures: public/images/saturn.jpg + saturn_rings.png
 *   - same ring annulus: inner 1.24 R, outer 2.30 R, radial UVs (u = in→out)
 *   - same axial tilt: 26.7°, body spinning under a tilt parent
 *   - same key-light direction (0.55, 0.5, -0.55) + cool rim
 * On-brand additions: a cyan fresnel atmosphere (rides the threshold Bloom)
 * and orbital light trails ("scie") that keep circling while the body idles.
 *
 * Interaction: drag-to-rotate with inertia (heroDragStore, fed by the DOM
 * capture layer). Only the BODY rotates on drag — tilt, rings and trails
 * hold their plane, like the reference.
 *
 * Screen-anchored during the 520vh sticky pin, recedes + fades over the pin
 * tail (same choreography contract as the previous hero).
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { WORLD_VIEW_HEIGHT } from "./constants";
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
/** Idle spin: one turn ≈ 80s — alive, never busy. Drag adds on top. */
const IDLE_SPIN = (Math.PI * 2) / 80;

// === Ring annulus with radial UVs (ports make_rings() from the Blender
// script): u runs inner→outer so the strip texture paints radial bands. ===
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

// === Atmosphere: view-dependent cyan limb glow (BackSide shell). Emissive
// above 1.0 at the rim so the global threshold Bloom picks it up. ===
const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const atmosphereFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.6);
    float a = rim * 0.55;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * uIntensity * rim, a);
  }
`;

// === Orbital light trail: a thin torus whose shader runs a bright comet
// head with an exponential tail around the circle (torus uv.x = angle). ===
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
    // Comet profile: bright head, long exponential tail behind it.
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
  { radius: 1.62, tilt: [0.42, 0.0, 0.22], speed: 0.10, color: "#3BE1FF" },
  { radius: 1.85, tilt: [-0.30, 0.4, -0.15], speed: -0.065, color: "#7C5CFF" },
  { radius: 1.45, tilt: [0.15, -0.6, 0.35], speed: 0.045, color: "#9adcff" },
];

function OrbitTrail({ spec, fadeRef }: { spec: TrailSpec; fadeRef: React.MutableRefObject<number> }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        uniforms: {
          uColor: { value: new THREE.Color(spec.color) },
          uTime: { value: Math.random() * 100 },
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
  const announcedReady = useRef(false);

  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const [bodyMap, ringsMap] = useTexture([
    "/images/saturn.jpg",
    "/images/saturn_rings.png",
  ]);
  bodyMap.colorSpace = THREE.SRGBColorSpace;
  ringsMap.colorSpace = THREE.SRGBColorSpace;

  const ringGeometry = useMemo(
    () => createRingGeometry(1.24, 2.3, tier === "full" ? 256 : 128),
    [tier],
  );
  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uColor: { value: new THREE.Color("#3BE1FF") },
          uIntensity: { value: 0.55 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    [],
  );
  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);

  // Reset the poster cross-fade if this component unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    const assembly = assemblyRef.current;
    const spin = spinRef.current;
    if (!group || !assembly || !spin) return;

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

    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    group.position.set(
      worldViewWidth * 0.21,
      camera.position.y - WORLD_VIEW_HEIGHT * 0.02,
      -1.6 - hp * 2.2,
    );
    group.scale.setScalar(baseScale * (1 - 0.2 * hp) * (0.92 + 0.08 * fade));

    // Idle: the body slow-spins under its rings (like the reference video).
    spin.rotation.y += IDLE_SPIN * delta;

    // Drag: the WHOLE assembly — body AND rings — follows the mouse with
    // inertia, clamped around the natural 26.7° tilt so it never flips.
    assembly.rotation.y += drag.vx * delta;
    assembly.rotation.x = THREE.MathUtils.clamp(
      assembly.rotation.x + drag.vy * delta * 0.6,
      TILT - 0.55,
      TILT + 0.55,
    );
    drag.damp(Math.exp(-2.6 * delta));
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Assembly (body + rings) carries the 26.7° tilt — the Blender
          script's Tilt empty — and is what mouse drag rotates. */}
      <group ref={assemblyRef} rotation={[TILT, 0, 0.06]}>
        <group ref={spinRef}>
          <mesh>
            <sphereGeometry args={[1, 96, 64]} />
            <meshStandardMaterial
              map={bodyMap}
              roughness={0.95}
              metalness={0}
              envMapIntensity={0.18}
            />
          </mesh>
        </group>

        {/* Ring annulus — saturn_rings.png color+alpha over radial UVs.
            Built in the XY plane, rotated -90° onto XZ so it sits EDGE-ON
            to the camera at rest; the assembly tilt then opens it into the
            3D ellipse of the reference video (Blender's camera was on -Y,
            ours looks along -Z — this rotation is that conversion).
            depthTest stays ON: the planet occludes the far half, the near
            half crosses in front. Unlit so the bands read on dark navy. */}
        <mesh geometry={ringGeometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            map={ringsMap}
            transparent
            alphaMap={ringsMap}
            side={THREE.DoubleSide}
            depthWrite={false}
            opacity={0.95}
            // >1 channel multiplier lifts the strip texture's luminance so
            // the bands read on navy like they do in the reference video.
            color={new THREE.Color(1.45, 1.45, 1.5)}
          />
        </mesh>
      </group>

      {/* Cyan limb atmosphere (brand signal, blooms softly). */}
      <mesh material={atmosphereMaterial} scale={1.03}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>

      {/* The moving "scie": orbital light trails circling the planet. */}
      {TRAILS.map((spec) => (
        <OrbitTrail key={spec.color + spec.radius} spec={spec} fadeRef={fadeRef} />
      ))}

      {/* Key sun from upper-left-front + cool rim from behind-right —
          the Blender script's lighting rig, intensities adapted. */}
      <directionalLight position={[-3.2, 2.9, 3.2]} intensity={2.3} />
      <directionalLight
        position={[2.9, -1.2, -3.5]}
        intensity={0.5}
        color="#99bfff"
      />
    </group>
  );
}

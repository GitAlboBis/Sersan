"use client";

/**
 * Hero "Signal Core" — the procedural intelligence object (asset plan §2,
 * Candidate A). A faceted glass shell (MeshTransmissionMaterial) wrapped
 * around an emissive core that breathes between the brand cyan and violet.
 * Reads as a contained, governed intelligence — on-brand with "kill switch"
 * and "guardrails". Zero asset payload; Hyper3D stays an optional upgrade.
 *
 * Lives in the persistent canvas but is SCREEN-anchored during the pinned
 * hero (the DOM stage is position:sticky, so the object must hold its
 * viewport position while the camera travels): each frame it follows
 * camera.y, offset to the right where the orb poster used to sit. As the
 * hero pin progresses it recedes (scale down, push back) and fades out,
 * releasing the viewport to the signature line.
 *
 * The emissive core runs >1.0 with toneMapped:false, so the same
 * threshold-1.0 Bloom that isolates the signature line picks up the core
 * glow for free.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useTierStore, type SceneTier } from "./store/tierStore";
import { useFxStore } from "./store/fxStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface HeroSignalCoreProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

const CYAN = new THREE.Color("#3BE1FF");
const VIOLET = new THREE.Color("#7C5CFF");

export function HeroSignalCore({ tier, anchors }: HeroSignalCoreProps) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const coreColor = useMemo(() => new THREE.Color(), []);
  const announcedReady = useRef(false);

  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  // Reset the poster cross-fade if this component ever unmounts (tier change).
  useEffect(
    () => () => {
      useTierStore.getState().setHeroReady(false);
      announcedReady.current = false;
    },
    [],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!announcedReady.current) {
      announcedReady.current = true;
      useTierStore.getState().setHeroReady(true);
    }

    const fx = useFxStore.getState();
    const { progress } = useScrollStore.getState();
    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollPx = progress * Math.max(sh - ih, 0);

    // Hero pin progress 0..1 across the pinned section (520vh). The sticky
    // stage releases at span.end - one viewport.
    const heroSpan = anchors.spans["hero"];
    const heroEndPx = heroSpan
      ? Math.max(heroSpan.end * sh - ih, 1)
      : ih * 4.2;
    const hp = THREE.MathUtils.clamp(scrollPx / heroEndPx, 0, 1);

    // Visible through the whole pin; recede + fade over the last quarter.
    const fade = 1 - THREE.MathUtils.smoothstep(hp, 0.74, 0.97);
    group.visible = fade > 0.005;
    if (!group.visible) return;

    // Screen-anchored placement: right of the copy column, like the poster
    // orb. Mouse parallax is subtle and desktop-only by construction
    // (pointer stays 0 on touch).
    const px = state.pointer.x;
    const py = state.pointer.y;
    const baseScale = WORLD_VIEW_HEIGHT * fx.heroScale;
    group.position.set(
      worldViewWidth * 0.21 + px * 0.22,
      camera.position.y - WORLD_VIEW_HEIGHT * 0.015 + py * -0.14,
      -1.4 - hp * 2.4,
    );
    group.scale.setScalar(baseScale * (1 - 0.22 * hp) * (0.92 + 0.08 * fade));

    // Slow engineered idle: steady yaw, faint pitch breathing, mouse tilt.
    const t = state.clock.elapsedTime;
    group.rotation.y += delta * 0.06;
    group.rotation.x = Math.sin(t * 0.11) * 0.06 + py * -0.08;
    group.rotation.z = Math.cos(t * 0.07) * 0.03 + px * 0.04;

    // Core breath: cyan <-> violet drift + emissive pulse, dimmed by fade.
    const core = coreMatRef.current;
    if (core) {
      const mix = 0.5 + 0.5 * Math.sin(t * fx.heroPulseSpeed);
      coreColor.lerpColors(CYAN, VIOLET, mix);
      core.emissive = coreColor;
      core.emissiveIntensity =
        (fx.heroEmissive + Math.sin(t * 0.9) * 0.15) * fade;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Faceted glass shell. detail=2 keeps visible facets — a cut-gem
          read through the refraction, not an organic blob. */}
      <mesh>
        <icosahedronGeometry args={[1, 2]} />
        {tier === "full" ? (
          <MeshTransmissionMaterial
            transmission={1}
            thickness={1.5}
            roughness={0.08}
            ior={1.45}
            chromaticAberration={0.05}
            anisotropicBlur={0.15}
            distortion={0.22}
            distortionScale={0.45}
            temporalDistortion={0.08}
            // Short attenuation + deep tint = dark gem that absorbs and
            // CONTAINS the core's light; the nucleus stays a distinct point
            // instead of washing the whole interior (longer distances flood
            // the glass and white it out — debugged live).
            attenuationDistance={1.2}
            attenuationColor="#4a7ab5"
            color="#8fb5dd"
            resolution={384}
            samples={5}
          />
        ) : (
          // Lite tier: cheap translucent shell — env reflections + the core
          // glow carry the look without the transmission render pass.
          <meshStandardMaterial
            color="#16263f"
            roughness={0.12}
            metalness={0.85}
            transparent
            opacity={0.22}
            envMapIntensity={1.1}
          />
        )}
      </mesh>

      {/* Emissive heart — the "signal". Above 1.0 so Bloom catches it, but
          contained: the glass must read as glass, not as a lampshade. */}
      <mesh scale={0.32}>
        {/* Smooth sphere: through the faceted shell an icosahedron core
            reads as a "flower" — a sphere blooms into a round heart. */}
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color="#0B1422"
          emissive="#3BE1FF"
          emissiveIntensity={2.6}
          roughness={0.35}
          toneMapped={false}
        />
      </mesh>

      {/* Rim accents sculpting the shell silhouette against the navy. */}
      <pointLight position={[2.4, 1.2, 2]} intensity={1.6} color="#3BE1FF" />
      <pointLight position={[-2.2, -1.4, 1.4]} intensity={1.0} color="#7C5CFF" />
    </group>
  );
}

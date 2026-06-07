"use client";

/**
 * GatewayPortal — the Blender-built closing moment (award sprint, Phase C).
 *
 * A machined double ring modeled in Blender (diamond-profile outer torus
 * with stud details + thin inner counter-ring, public/models/gateway.glb,
 * ~66KB raw — small enough that meshopt's decoder wiring would cost more
 * than it saves). World-anchored at the `final-cta` section: the signature
 * line's last waypoint resolves to center there, so the beam literally
 * threads the gate as you arrive — the signal passes through, you book
 * the call.
 *
 * Outer ring turns slowly (the studs make rotation legible), inner ring
 * counter-rotates; the inner ring is emissive >1 and rides the same
 * threshold Bloom as the line. Materials are assigned here (export had
 * none) so everything stays tunable.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface GatewayPortalProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

const SCALE = 2.1;

export function GatewayPortal({ tier, anchors }: GatewayPortalProps) {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const emissiveColor = useMemo(() => new THREE.Color(), []);

  const { nodes } = useGLTF("/models/gateway.glb") as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };
  const outerGeo = (nodes.GateOuter ?? Object.values(nodes).find((n) => n.isMesh))
    ?.geometry;
  const innerGeo = nodes.GateInner?.geometry;

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a2c49",
        metalness: 0.85,
        roughness: 0.28,
      }),
    [],
  );
  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0B1422",
        emissive: "#3BE1FF",
        emissiveIntensity: 2.2,
        roughness: 0.4,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      outerMaterial.dispose();
      innerMaterial.dispose();
    },
    [outerMaterial, innerMaterial],
  );

  const k = WORLD_VIEW_HEIGHT / size.height;

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const fraction = anchors.fractions["gateway"];
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__sersanGate = {
        fraction,
        scrollHeight: anchors.scrollHeight,
        camY: camera.position.y,
        hasOuter: !!outerGeo,
        hasInner: !!innerGeo,
        nodeNames: Object.keys(nodes),
      };
    }
    if (fraction === undefined || anchors.scrollHeight <= 1) {
      group.visible = false;
      return;
    }

    // World anchor at the final CTA's center; same x/z as the line's last
    // waypoint so the beam threads the ring.
    const worldY = -fraction * anchors.scrollHeight * k;
    group.position.set(0, worldY, 0.6);

    // Only worth rendering when the camera is approaching the end.
    const distance = Math.abs(camera.position.y - worldY);
    const near = distance < WORLD_VIEW_HEIGHT * 2.2;
    group.visible = near;
    if (!near) return;

    // Approach choreography: the gate breathes up to size as you arrive.
    const presence = 1 - THREE.MathUtils.smoothstep(
      distance,
      WORLD_VIEW_HEIGHT * 0.6,
      WORLD_VIEW_HEIGHT * 2.2,
    );
    group.scale.setScalar(SCALE * (0.82 + 0.18 * presence));

    const t = state.clock.elapsedTime;
    if (outerRef.current) outerRef.current.rotation.z += delta * 0.16;
    if (innerRef.current) innerRef.current.rotation.z -= delta * 0.34;
    // Gentle presentation wobble, never flat-on.
    group.rotation.x = Math.sin(t * 0.16) * 0.10;
    group.rotation.y = Math.cos(t * 0.12) * 0.14;

    // Inner ring breathes between the brand hues; a scroll flick feeds a
    // little extra energy into the glow, same trick as the line.
    const mix = 0.5 + 0.5 * Math.sin(t * 0.5);
    emissiveColor.set("#3BE1FF").lerp(new THREE.Color("#7C5CFF"), mix);
    innerMaterial.emissive = emissiveColor;
    const boost = Math.min(
      Math.abs(useScrollStore.getState().velocity) * 0.003,
      0.5,
    );
    innerMaterial.emissiveIntensity =
      (1.9 + 0.5 * Math.sin(t * 0.9) + boost) * presence;
  });

  if (!outerGeo) return null;

  return (
    // The GLB's tori lie in Blender's ground plane — rotate the assembly
    // upright so the ring faces the camera and the line can thread it.
    <group ref={groupRef} visible={false}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <group ref={outerRef}>
          <mesh geometry={outerGeo} material={outerMaterial} />
        </group>
        {innerGeo && (
          <group ref={innerRef}>
            <mesh geometry={innerGeo} material={innerMaterial} />
          </group>
        )}
      </group>
      {/* Rim lights sculpting the machined metal against the navy. */}
      <pointLight position={[2.6, 1.6, 2.4]} intensity={2.6} color="#3BE1FF" />
      {tier === "full" && (
        <pointLight position={[-2.4, -1.8, 1.8]} intensity={1.6} color="#7C5CFF" />
      )}
    </group>
  );
}

useGLTF.preload("/models/gateway.glb");

"use client";

/**
 * GatewayPortal — the Blender-built closing moment (award sprint, Phase C),
 * now a thin config of the generalized `RouteHero` (P4).
 *
 * A machined double ring modeled in Blender (diamond-profile outer torus
 * with stud details + thin inner counter-ring, public/models/gateway.glb,
 * ~66KB raw — small enough that meshopt's decoder wiring would cost more
 * than it saves). World-anchored at the `final-cta` section's `gateway`
 * anchor: the signature line's last waypoint resolves to center there, so
 * the beam literally threads the gate as you arrive — the signal passes
 * through, you book the call.
 *
 * Outer ring turns slowly (the studs make rotation legible), inner ring
 * counter-rotates; the inner ring is emissive >1 and rides the same
 * threshold Bloom as the line. All the choreography (world-anchor math,
 * presence scale-in, culling, emissive pulse, rim lights) lives in RouteHero;
 * this file is just the gateway's specific config + the GLB preload.
 *
 * IMPORTANT: every prop below reproduces the pre-P4 gateway VERBATIM — the
 * home gateway output is byte-identical after the RouteHero refactor.
 */
import { useGLTF } from "@react-three/drei";
import { RouteHero } from "./RouteHero";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface GatewayPortalProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

export function GatewayPortal({ tier, anchors }: GatewayPortalProps) {
  return (
    <RouteHero
      tier={tier}
      anchors={anchors}
      anchorId="gateway"
      debugKey="__sersanGate"
      kind={{
        type: "glb",
        path: "/models/gateway.glb",
        nodeNames: { outer: "GateOuter", inner: "GateInner" },
        fallbackShape: "ring",
      }}
      // Defaults below match the previous GatewayPortal exactly; passed
      // explicitly so the gateway's identity never silently drifts if
      // RouteHero's defaults change.
      scale={2.1}
      z={0.6}
      outerColor="#1a2c49"
      outerMetalness={0.85}
      outerRoughness={0.28}
      emissiveA="#3BE1FF"
      emissiveB="#7C5CFF"
      emissiveIntensity={2.2}
      outerSpin={0.16}
      innerSpin={0.34}
      rim={{
        keyPosition: [2.6, 1.6, 2.4],
        keyIntensity: 2.6,
        keyColor: "#3BE1FF",
        fillPosition: [-2.4, -1.8, 1.8],
        fillIntensity: 1.6,
        fillColor: "#7C5CFF",
      }}
    />
  );
}

useGLTF.preload("/models/gateway.glb");

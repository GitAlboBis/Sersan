"use client";

/**
 * The persistent R3F scene — lazy-loaded (ssr:false) by CanvasHost.
 *
 * Lives in the root layout so the WebGL context, camera and scene graph
 * survive route changes; per-route variation happens by swapping curve
 * configs, never by remounting the Canvas. Transparent clear color: the
 * navy body background (DOM) stays the backdrop, the canvas only adds
 * light on top.
 */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { usePathname } from "next/navigation";
import { FrameDriver } from "./FrameDriver";
import { SignatureLine } from "./SignatureLine";
import { HeroPlanet } from "./HeroPlanet";
import { DriftParticles } from "./DriftParticles";
import { PostFX } from "./PostFX";
import { useSectionAnchors } from "./hooks/useSectionAnchors";
import { CAMERA_FOV, CAMERA_Z } from "./constants";
import type { SceneTier } from "./store/tierStore";

// NOTE: the leva tuning panel (debug/LineDebug) and drei's
// PerformanceMonitor are intentionally NOT mounted for now — while
// stabilising the scene we debug-tune through the dev console handles
// below (window.__sersanFx). Re-evaluate both after the M1 freeze
// investigation is closed.

// Dev-only console handles for store-level debugging.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  import("./store/fxStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanFx = m.useFxStore;
  });
  import("./store/scrollStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanScroll = m.useScrollStore;
  });
}

export default function Scene({ tier }: { tier: Exclude<SceneTier, "off"> }) {
  const pathname = usePathname();
  const anchors = useSectionAnchors(pathname);

  return (
    <Canvas
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
      dpr={tier === "full" ? [1, 2] : [1, 1.5]}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 200 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      frameloop="always"
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameDriver />
      <SignatureLine tier={tier} pathname={pathname} anchors={anchors} />
      <DriftParticles tier={tier} anchors={anchors} />
      {pathname === "/" && (
        <Suspense fallback={null}>
          {/* Environment feeds subtle reflections on the planet/rings —
              never a visible background (the navy DOM stays the backdrop). */}
          <Environment
            files="/hdri/studio_small_03_1k.hdr"
            background={false}
            environmentIntensity={0.3}
          />
          <HeroPlanet tier={tier} anchors={anchors} />
        </Suspense>
      )}
      {tier === "full" && <PostFX />}
    </Canvas>
  );
}

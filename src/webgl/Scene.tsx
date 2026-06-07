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
import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { FrameDriver } from "./FrameDriver";
import { SignatureLine } from "./SignatureLine";
import { HeroPlanet } from "./HeroPlanet";
import { GatewayPortal } from "./GatewayPortal";
import { DriftParticles } from "./DriftParticles";
import { PostFX } from "./PostFX";
import { useSectionAnchors } from "./hooks/useSectionAnchors";
import { CAMERA_FOV, CAMERA_Z } from "./constants";
import { useScrollStore } from "./store/scrollStore";
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

  // Route-transition beat for the signature line: fade out, let the curve
  // rebuild against the new page's anchors, fade back in. On first mount
  // this doubles as the intro draw (0 → 1). The DOM enter animation in
  // app/template.tsx runs on the same navigation, so page and line breathe
  // together.
  useEffect(() => {
    const { setReveal } = useScrollStore.getState();
    setReveal(0);
    const t = window.setTimeout(() => setReveal(1), 420);
    return () => window.clearTimeout(t);
  }, [pathname]);

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
      {/* Fully procedural hero — no textures, no HDRI, no Suspense: it
          mounts on the first frame and the poster cross-fades immediately. */}
      {pathname === "/" && <HeroPlanet tier={tier} anchors={anchors} />}
      {/* Blender-built gateway at the end of the home story (66KB GLB). */}
      {pathname === "/" && (
        <Suspense fallback={null}>
          <GatewayPortal tier={tier} anchors={anchors} />
        </Suspense>
      )}
      {tier === "full" && <PostFX />}
    </Canvas>
  );
}

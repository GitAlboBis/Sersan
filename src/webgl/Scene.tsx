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
import { webgpuEnabled, createWebGPURenderer } from "./renderer/createRenderer";
import { SignatureLine } from "./SignatureLine";
import { HeroLogo } from "./HeroLogo";
import { GatewayPortal } from "./GatewayPortal";
import { RouteHero, type RouteHeroKind } from "./RouteHero";
import { DriftParticles } from "./DriftParticles";
import { PostFX } from "./PostFX";
import { PostFXNodes } from "./PostFXNodes";
import { useSectionAnchors } from "./hooks/useSectionAnchors";
import { CAMERA_FOV, CAMERA_Z } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
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
  import("./store/heroDragStore").then((m) => {
    (window as unknown as Record<string, unknown>).__sersanHeroDrag = m.useHeroDragStore;
  });
}

/**
 * Per-route "ritual object" config (P5b). Each interior route resolves the
 * signature line into a brand-native 3D object at its closing `final-cta`
 * anchor — the universal "the signal resolves into a ring" motif, except for
 * the two routes that ship a bespoke Blender GLB (audit lattice, consulting
 * ring). Home is intentionally NOT in this map: it keeps HeroLogo (the
 * dissolving SERSAN mark) + the loved GatewayPortal (the home's own RouteHero
 * config), gated separately below so HeroLogo never mounts on any interior
 * route.
 *
 * Tone (emissive endpoints) stays inside SerSan's monochrome cyan→violet
 * signal; the small per-route bias mirrors routeFxStore (e.g. trust cooler).
 */
interface RouteHeroConfig {
  kind: RouteHeroKind;
  emissiveA?: string;
  emissiveB?: string;
}

const ROUTE_HERO: Record<string, RouteHeroConfig> = {
  // Bespoke Blender geometry-only GLBs (lazy + Suspense via RouteHero).
  "/audit": {
    kind: {
      type: "glb",
      path: "/models/audit-lattice.glb",
      nodeNames: { outer: "AuditFrame", inner: "AuditCore" },
      fallbackShape: "lattice",
    },
  },
  "/consulting": {
    kind: {
      type: "glb",
      path: "/models/consulting-ring.glb",
      nodeNames: { outer: "ConsultingRing", inner: "ConsultingCore" },
      fallbackShape: "ring",
    },
    // Warmer tail, matching routeFx('/consulting').
    emissiveB: "#8A6BFF",
  },
  // Procedural closing ring — the universal resolution motif.
  "/case-studies": { kind: { type: "procedural", shape: "ring" } },
  "/resources": { kind: { type: "procedural", shape: "ring" } },
  "/about": { kind: { type: "procedural", shape: "ring" } },
  "/contact": { kind: { type: "procedural", shape: "ring" } },
  // Trust: a cooler closing ring here. Its dedicated WebGL CompliancePipeline3D
  // centerpiece (at the "pipeline" anchor) arrives later in P6 — NOT here.
  "/trust": {
    kind: { type: "procedural", shape: "ring" },
    emissiveB: "#6E7BFF",
  },
};

/**
 * Mounts the correct ritual object for the active route. Home → HeroLogo +
 * GatewayPortal (unchanged); interior routes → a single map lookup. Returns
 * null on unknown routes (e.g. [slug] detail pages) — the line still threads
 * through, just without a closing object.
 */
function RouteRitual({
  pathname,
  tier,
  anchors,
}: {
  pathname: string;
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}) {
  // Home: the dedicated dissolving logo + gateway, exactly as before P5b.
  if (pathname === "/") {
    return (
      <>
        {/* The dissolving SERSAN mark — geometry from a Blender GLB
            (sersan-mark.glb), so it suspends on useGLTF until the small mesh
            loads; the poster covers the hero until heroReady fires. */}
        <Suspense fallback={null}>
          <HeroLogo tier={tier} anchors={anchors} />
        </Suspense>
        {/* Blender-built gateway at the end of the home story (66KB GLB). */}
        <Suspense fallback={null}>
          <GatewayPortal tier={tier} anchors={anchors} />
        </Suspense>
      </>
    );
  }

  const config = ROUTE_HERO[pathname];
  if (!config) return null;

  // Each interior RouteHero is lazy + Suspense-wrapped like the gateway: GLB
  // paths lazy-load their loader chunk internally; procedural mounts on the
  // first frame. The closing object world-anchors to the transparent "ritual"
  // gap (clean negative space the camera reaches — NOT behind the semi-opaque
  // CTA card), where the curve resolves to center (x:0), so the beam threads
  // it before continuing into the CTA.
  return (
    <Suspense fallback={null}>
      <RouteHero
        tier={tier}
        anchors={anchors}
        anchorId="ritual"
        kind={config.kind}
        emissiveA={config.emissiveA}
        emissiveB={config.emissiveB}
      />
    </Suspense>
  );
}

export default function Scene({ tier }: { tier: Exclude<SceneTier, "off"> }) {
  const pathname = usePathname();
  const anchors = useSectionAnchors(pathname);

  // F0.5 renderer seam: the flag is read once at module/build time. When OFF
  // (default) `gl` stays EXACTLY today's object literal — R3F builds its
  // implicit default WebGLRenderer and nothing here touches `three/webgpu`.
  // When ON, `gl` becomes the async WebGPURenderer factory (with WebGL2
  // fallback). The legacy @react-three/postprocessing EffectComposer cannot be
  // driven by `three/webgpu` at all (see the PostFX guard below), so it is
  // gated purely on this build-time flag.
  const webgpu = webgpuEnabled();

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
      gl={
        webgpu
          ? createWebGPURenderer
          : {
              alpha: true,
              antialias: false,
              powerPreference: "high-performance",
            }
      }
      dpr={tier === "full" ? [1, 2] : [1, 1.5]}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 200 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      frameloop="always"
      style={{ position: "absolute", inset: 0 }}
    >
      <FrameDriver />
      <SignatureLine tier={tier} pathname={pathname} anchors={anchors} />
      <DriftParticles tier={tier} anchors={anchors} pathname={pathname} />
      {/* The per-route ritual object: HeroLogo + GatewayPortal on home, a
          per-route RouteHero on every interior route (single map lookup).
          HeroLogo is mounted ONLY inside the pathname === "/" branch, so it
          never appears on an interior route. */}
      <RouteRitual pathname={pathname} tier={tier} anchors={anchors} />
      {/* Postprocessing — desktop ("full") only, exactly as before. Which rig
          mounts is a BUILD-TIME split on `webgpuEnabled()`, not a runtime backend
          check:

          • Flag OFF → PostFX (@react-three/postprocessing EffectComposer). This
            lib is WebGL-only — it calls renderer.getContext().getContextAttributes(),
            absent on WebGPURenderer (and its WebGL2 *fallback* backend exposes a
            different context object too) — so it would crash whenever the flag is
            ON, regardless of the chosen backend. A runtime `backend` state would
            mount it on the first render (before onCreated can update it) and crash.
            `webgpuEnabled()` is inlined at build time, so the split is static and
            race-free. With the flag OFF this branch is byte-identical to before.

          • Flag ON → PostFXNodes (three's native TSL PostProcessing + selective
            bloom + hand-rolled vignette + optional hand-rolled grain, tonemap at
            output; the addon CA/film nodes were removed as a null-input crash
            source — see PostFXNodes header). It restores the cinematic grade the
            WebGPU path otherwise lacks (EffectComposer is suppressed above), keeps
            the >1.0 selective-bloom contract, and drives `post.render()` from a
            single priority-1 useFrame (no second RAF; R3F's default render is
            suppressed). It imports three/webgpu + three/tsl LAZILY, so the OFF
            bundle never pulls the heavy node-material build. */}
      {tier === "full" &&
        (webgpuEnabled() ? (
          <PostFXNodes pathname={pathname} />
        ) : (
          <PostFX pathname={pathname} />
        ))}
    </Canvas>
  );
}

"use client";

/**
 * RouteHeroLogo — the SERSAN MARK as the per-route ritual object.
 *
 * Replaces the rings / GLB "ritual objects" (gateway, audit lattice, consulting
 * ring, the procedural closing rings, and the /trust compliance centerpiece)
 * with the SERSAN logo, in the SAME slot, driven by the SAME RouteHeroBody
 * choreography (world-anchor, culling, presence scale-in, wobble, emissive
 * cyan↔blue pulse, rim lights). The logo gets a slow Y-spin (RouteHeroBody's
 * logo mode) and lights up neon-blue on cursor hover.
 *
 * The mark geometry is the SAME Blender GLB the home HeroLogo uses
 * (sersan-mark.glb), normalized to ~2 units tall and recentered — identical to
 * HeroLogo's `bodyGeometry` envelope. Here it is RENDERED as a single glowing
 * emissive mesh (HeroLogo only SAMPLES it into particles).
 *
 * WEDGE FIX (2026-07-07) — this component MUST NOT SUSPEND. It previously
 * loaded the mark via React.lazy + drei's useGLTF: two chained thrown-promise
 * suspensions inside the R3F-bridged tree. With R3F v9's own reconciler root
 * (and the async WebGPU `gl` factory deferring root.render behind configure()),
 * a Suspense left pending inside the bridged children wedges the island's
 * update queue: the already-committed scene keeps animating imperatively
 * (useFrame loops run), but NO further React commits — neither island-internal
 * state (SignatureLine's setTsl) nor bridged props (anchors re-measures) — ever
 * land, so on /consulting the signature line never received its TSL material
 * and never became visible. Home was unaffected only because HeroLogo is
 * statically imported and preloads the GLB at module eval, so its suspension
 * resolves almost immediately.
 *
 * The mark is now loaded with ZERO thrown promises (the PostFXNodes pattern:
 * build asynchronously, attach via React state from an effect): a module-cached
 * GLTFLoader promise — kicked eagerly at module eval, so the fetch+parse is
 * virtually always resolved before a ritual anchor scrolls near — resolves into
 * ONE shared normalized geometry reused by every ritual mount on every route.
 * The GLTFLoader chunk itself stays out of the island bundle via the dynamic
 * import inside the cached loader.
 */
import { useEffect, useState } from "react";
import * as THREE from "three";
import {
  RouteHeroBody,
  resolveBodyProps,
  type RouteHeroProps,
} from "./RouteHero";

const MARK_GLB = "/models/sersan-mark.glb";
/** Same envelope as HeroLogo's mark (so the anchoring/scale math is consistent). */
const TARGET_HEIGHT = 2;

/**
 * Module-level cache: ONE fetch, ONE parse, ONE normalized geometry for the
 * whole session (every ritual mount across every route shares it — do NOT
 * dispose it per unmount). `null` resolution = load failed; the ritual object
 * simply doesn't render (the signature line still threads the anchor).
 */
let markGeometryPromise: Promise<THREE.BufferGeometry | null> | null = null;

// Exported (round 7-2b): CrystalCluster's mark-in-ice RT renders the SAME
// shared normalized geometry — one fetch/parse/normalize for the session.
// Consumers must NEVER dispose the resolved geometry (module singleton).
export function loadMarkGeometry(): Promise<THREE.BufferGeometry | null> {
  if (!markGeometryPromise) {
    markGeometryPromise = import("three/examples/jsm/loaders/GLTFLoader.js")
      .then(
        ({ GLTFLoader }) =>
          new Promise<{ scene: THREE.Group }>((resolve, reject) =>
            new GLTFLoader().load(MARK_GLB, resolve, undefined, reject),
          ),
      )
      .then((gltf) => {
        // First mesh in the GLB — same selection rule as the old useGLTF path
        // (Object.values(nodes).find(isMesh)).
        let src: THREE.Mesh | undefined;
        gltf.scene.traverse((n) => {
          if (!src && (n as THREE.Mesh).isMesh) src = n as THREE.Mesh;
        });
        if (!src) return null;
        // Clone + normalize (center → scale to ~TARGET_HEIGHT → recenter),
        // mirroring HeroLogo.bodyGeometry. Clone so the loader's own graph can
        // be garbage-collected.
        const g = src.geometry.clone();
        g.center();
        g.computeBoundingBox();
        const bbox = g.boundingBox;
        if (bbox) {
          const height = bbox.max.y - bbox.min.y || 1;
          const s = TARGET_HEIGHT / height;
          g.scale(s, s, s);
        }
        g.center();
        return g;
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[RouteHeroLogo] mark GLB load failed", err);
        }
        return null;
      });
  }
  return markGeometryPromise;
}

// Deterministic preload: this module is statically imported by RouteHero (and
// through it by Scene), so the mark starts loading the moment the island chunk
// evaluates — long before any ritual anchor is scrolled into reach.
if (typeof window !== "undefined") void loadMarkGeometry();

export function RouteHeroLogo({
  debugKey,
  ...rest
}: Omit<RouteHeroProps, "kind"> & { debugKey?: string }) {
  const [logoGeo, setLogoGeo] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMarkGeometry().then((geo) => {
      if (!cancelled && geo) setLogoGeo(geo);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Geometry is the shared module-level singleton — never disposed here.
  if (!logoGeo) return null;

  return (
    <RouteHeroBody
      {...resolveBodyProps(rest)}
      outerGeo={undefined}
      innerGeo={undefined}
      logoGeo={logoGeo}
      uprightFromGround={false}
      debugKey={debugKey}
      debugExtra={{ kind: "logo" }}
    />
  );
}

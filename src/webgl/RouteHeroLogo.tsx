"use client";

/**
 * RouteHeroLogo — the SERSAN MARK as the per-route ritual object.
 *
 * Replaces the rings / GLB "ritual objects" (gateway, audit lattice, consulting
 * ring, the procedural closing rings, and the /trust compliance centerpiece)
 * with the SERSAN logo, in the SAME slot, driven by the SAME RouteHeroBody
 * choreography (world-anchor, culling, presence scale-in, wobble, emissive
 * cyan↔violet pulse, rim lights). The logo gets a slow Y-spin (RouteHeroBody's
 * logo mode) and lights up neon-blue on cursor hover.
 *
 * The mark geometry is the SAME Blender GLB the home HeroLogo uses
 * (sersan-mark.glb), normalized to ~2 units tall and recentered — identical to
 * HeroLogo's `bodyGeometry` envelope. Here it is RENDERED as a single glowing
 * emissive mesh (HeroLogo only SAMPLES it into particles).
 *
 * Lazy-isolated (loaded via RouteHero's `LazyLogo`) so the GLTF loader chunk
 * only lands when a logo ritual mounts. The GLB is preloaded below + already
 * preloaded by HeroLogo on home, so drei serves it from cache.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import {
  RouteHeroBody,
  resolveBodyProps,
  type RouteHeroProps,
} from "./RouteHero";

const MARK_GLB = "/models/sersan-mark.glb";
/** Same envelope as HeroLogo's mark (so the anchoring/scale math is consistent). */
const TARGET_HEIGHT = 2;

export function RouteHeroLogo({
  debugKey,
  ...rest
}: Omit<RouteHeroProps, "kind"> & { debugKey?: string }) {
  const { nodes } = useGLTF(MARK_GLB) as unknown as {
    nodes: Record<string, THREE.Object3D>;
  };

  // Clone + normalize the mark mesh geometry (center → scale to ~TARGET_HEIGHT →
  // recenter), mirroring HeroLogo.bodyGeometry. Clone so we never mutate drei's
  // shared cached geometry.
  const logoGeo = useMemo(() => {
    const src = Object.values(nodes).find(
      (n) => (n as THREE.Mesh).isMesh,
    ) as THREE.Mesh | undefined;
    if (!src) return undefined;
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
  }, [nodes]);
  useEffect(() => () => logoGeo?.dispose(), [logoGeo]);

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

useGLTF.preload(MARK_GLB);

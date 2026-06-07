"use client";

/**
 * RouteHeroGlb — the GLB-reading half of RouteHero, isolated in its own module
 * so `useGLTF`/loader code is lazy-chunked (see RouteHero.tsx's `LazyGlb`) and
 * never bloats procedural-only route bundles (notably the home bundle, which
 * does load a GLB, but interior procedural routes do not).
 *
 * It reuses RouteHeroBody's exact driver + defaults via resolveBodyProps, so
 * the GLB and procedural code paths can never drift. Missing-node handling:
 *  - outer: the named node, else the first mesh in the GLB (gateway behavior),
 *  - inner: the named node, else undefined (RouteHeroBody renders outer-only).
 * If NO usable outer geometry exists at all, we fail gracefully to the
 * procedural fallback motif of the same family rather than throwing.
 */
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  ProceduralRouteHero,
  RouteHeroBody,
  resolveBodyProps,
  type GlbInnerProps,
} from "./RouteHero";

export function RouteHeroGlb({
  path,
  nodeNames,
  fallbackShape,
  debugKey,
  ...rest
}: GlbInnerProps & { debugKey?: string }) {
  const { nodes } = useGLTF(path) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const outerNode =
    (nodeNames.outer ? nodes[nodeNames.outer] : undefined) ??
    Object.values(nodes).find((n) => n?.isMesh);
  const outerGeo = outerNode?.geometry;
  const innerGeo = nodeNames.inner ? nodes[nodeNames.inner]?.geometry : undefined;

  // GLB loaded but carried no usable mesh — fall back to the same-family
  // procedural motif so the route still gets its ritual object.
  if (!outerGeo) {
    return <ProceduralRouteHero {...rest} shape={fallbackShape} />;
  }

  return (
    <RouteHeroBody
      {...resolveBodyProps(rest)}
      outerGeo={outerGeo}
      innerGeo={innerGeo}
      uprightFromGround
      debugKey={debugKey}
      debugExtra={debugKey ? { nodeNames: Object.keys(nodes) } : undefined}
    />
  );
}

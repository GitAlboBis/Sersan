"use client";

/**
 * The signature scroll line (AGENTS.md §3a) — a CatmullRom tube snaking
 * through document space, progressively "drawn" by scroll.
 *
 * World mapping: document pixels scale to world units by
 * k = viewport.height / window.innerHeight, so the curve spans the whole
 * page in world-Y and the camera glides down it as the user scrolls —
 * waypoints stay visually glued to their sections at any page height.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { createLineMaterial } from "./materials/lineShader";
import { getRouteCurve } from "./curves/routeCurves";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useFxStore } from "./store/fxStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface SignatureLineProps {
  tier: Exclude<SceneTier, "off">;
  pathname: string;
  anchors: SectionAnchors;
}

/** Damping speed for the drawn-progress chase (higher = snappier). */
const PROGRESS_DAMP = 6;

export function SignatureLine({ tier, pathname, anchors }: SignatureLineProps) {
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const dampedProgress = useRef(0);
  const dampedReveal = useRef(1);

  const material = useMemo(() => createLineMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  // World units per document/CSS pixel (stable: size only changes on resize).
  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const geometry = useMemo(() => {
    // Before the first anchor measurement (scrollHeight still at its initial
    // sentinel) every anchored waypoint would collapse to fraction 0 — a
    // degenerate curve. Skip building until real layout data exists.
    if (anchors.scrollHeight <= 1) return null;

    const config = getRouteCurve(pathname);
    const radiusFactor = useFxStore.getState().radiusFactor;

    const points = config.waypoints.map((wp) => {
      const fraction =
        (wp.anchor ? anchors.fractions[wp.anchor] : undefined) ?? wp.at ?? 0;
      return new THREE.Vector3(
        wp.x * worldViewWidth * 0.45,
        -fraction * anchors.scrollHeight * k,
        wp.z ?? 0,
      );
    });

    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const tubularSegments = THREE.MathUtils.clamp(
      config.waypoints.length * 14,
      64,
      tier === "full" ? 256 : 96,
    );
    const radius = WORLD_VIEW_HEIGHT * radiusFactor;
    const radialSegments = tier === "full" ? 8 : 6;

    const geo = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      radius,
      radialSegments,
      false,
    );
    if (process.env.NODE_ENV !== "production") {
      geo.computeBoundingBox();
    }
    return geo;
    // anchors.version covers fraction/scrollHeight changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, anchors.version, size.width, size.height, k, worldViewWidth, tier]);

  // Dispose replaced geometries (rebuilds on resize/route would leak GPU
  // buffers otherwise).
  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame((_, delta) => {
    const { progress, velocity, reveal } = useScrollStore.getState();
    const fx = useFxStore.getState();

    dampedProgress.current = THREE.MathUtils.damp(
      dampedProgress.current,
      progress,
      PROGRESS_DAMP,
      delta,
    );
    dampedReveal.current = THREE.MathUtils.damp(
      dampedReveal.current,
      reveal,
      8,
      delta,
    );

    const sh = anchors.scrollHeight;
    const ih = size.height;
    const scrollYWorld = dampedProgress.current * Math.max(sh - ih, 0);

    // Camera glides down the world strip; the viewport center tracks the
    // document position exactly (see file header for the k mapping).
    camera.position.y = -(scrollYWorld + ih / 2) * k;

    // The lit head sits where the reader is: document fraction of the
    // viewport center. Curve param ≈ doc fraction (waypoints are spread by
    // doc fraction, so the approximation holds visually).
    const headFraction = sh > 0 ? (scrollYWorld + ih * 0.5) / sh : 0;

    const u = material.uniforms;
    u.uProgress.value = headFraction;
    u.uTime.value += delta;
    u.uReveal.value = dampedReveal.current;
    // Velocity feeds a subtle energy boost into the glow (clamped).
    const boost = Math.min(Math.abs(velocity) * 0.004, 0.6);
    u.uEmissive.value = fx.emissive + boost;
    u.uGlowFalloff.value = fx.glowFalloff;
    u.uHeadSharp.value = fx.headSharp;
    u.uFlowSpeed.value = fx.flowSpeed;
    u.uColorA.value.set(fx.colorA);
    u.uColorB.value.set(fx.colorB);
    u.uColorHot.value.set(fx.colorHot);

    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__sersanLineDebug = {
        camY: camera.position.y,
        uProgress: u.uProgress.value,
        storeProgress: progress,
        anchorsScrollHeight: sh,
        anchorsVersion: anchors.version,
        k,
        viewportH: WORLD_VIEW_HEIGHT,
        sizeH: ih,
        bboxY: geometry?.boundingBox
          ? [geometry.boundingBox.max.y, geometry.boundingBox.min.y]
          : null,
        bboxX: geometry?.boundingBox
          ? [geometry.boundingBox.min.x, geometry.boundingBox.max.x]
          : null,
      };
    }
  });

  if (!geometry) return null;

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}

"use client";

/**
 * Shared GPU particle field (asset plan §7) — sparse "breathing dust"
 * distributed across the WHOLE world strip, so a thin constellation drifts
 * in the negative space of every section as the camera travels. Replaces
 * the deleted Canvas2D NeuralNetLayer at a fraction of the cost.
 */
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { createParticleMaterial } from "./materials/particleShader";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useFxStore } from "./store/fxStore";
import { routeFx, HOME_FX } from "./store/routeFxStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface DriftParticlesProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
  pathname: string;
}

const COUNT: Record<string, number> = { full: 3000, lite: 800 };

export function DriftParticles({ tier, anchors, pathname }: DriftParticlesProps) {
  const { size, gl } = useThree();
  const material = useMemo(() => createParticleMaterial(), []);
  const matRef = useRef(material);

  useEffect(() => () => material.dispose(), [material]);

  // Per-route particle tone. countScale/opacity are 1 / 0.35 on home → the
  // field is unchanged. The color bias is applied once on the material
  // uniforms; routeFx('/') colors equal the shader defaults so home stays
  // identical. Scratch Colors avoid per-frame allocation.
  const route = useMemo(() => routeFx(pathname), [pathname]);
  const colorBlend = pathname === "/" ? 0 : 0.6;
  const routeColors = useMemo(
    () => ({
      a: new THREE.Color(route.lineColorA),
      b: new THREE.Color(route.lineColorB),
    }),
    [route.lineColorA, route.lineColorB],
  );

  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const geometry = useMemo(() => {
    if (anchors.scrollHeight <= 1) return null;

    // Route count scale (1 on home → unchanged); rounded so the count stays
    // integral and never drops below a sane floor.
    const count = Math.max(64, Math.round(COUNT[tier] * route.particleCountScale));
    const worldLen = anchors.scrollHeight * k;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * worldViewWidth * 1.15;
      positions[i * 3 + 1] = -Math.random() * worldLen;
      positions[i * 3 + 2] = -4 + Math.random() * 6;
      seeds[i] = Math.random();
      scales[i] = 0.6 + Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    return geo;
    // route.particleCountScale changes the point count → rebuild on route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, anchors.version, k, worldViewWidth, route.particleCountScale]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  // Bias the field's gradient toward the route tone (no-op on home: blend 0
  // and equal endpoints). Runs only on route change, not per frame.
  useEffect(() => {
    const u = matRef.current.uniforms;
    u.uColorA.value.set("#3BE1FF").lerp(routeColors.a, colorBlend);
    u.uColorB.value.set("#7C5CFF").lerp(routeColors.b, colorBlend);
  }, [routeColors, colorBlend]);

  useFrame((_, delta) => {
    const u = matRef.current.uniforms;
    u.uTime.value += delta;
    u.uProgress.value = useScrollStore.getState().progress;
    u.uPixelRatio.value = gl.getPixelRatio();
    // Route opacity tone unless the dev has tuned fxStore off its default.
    const fxOpacity = useFxStore.getState().particleOpacity;
    u.uOpacity.value =
      fxOpacity === HOME_FX.particleOpacity ? route.particleOpacity : fxOpacity;
  });

  if (!geometry) return null;

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

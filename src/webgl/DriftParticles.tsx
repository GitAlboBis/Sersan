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
import type { SectionAnchors } from "./hooks/useSectionAnchors";
import type { SceneTier } from "./store/tierStore";

interface DriftParticlesProps {
  tier: Exclude<SceneTier, "off">;
  anchors: SectionAnchors;
}

const COUNT: Record<string, number> = { full: 3000, lite: 800 };

export function DriftParticles({ tier, anchors }: DriftParticlesProps) {
  const { size, gl } = useThree();
  const material = useMemo(() => createParticleMaterial(), []);
  const matRef = useRef(material);

  useEffect(() => () => material.dispose(), [material]);

  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const geometry = useMemo(() => {
    if (anchors.scrollHeight <= 1) return null;

    const count = COUNT[tier];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, anchors.version, k, worldViewWidth]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame((_, delta) => {
    const u = matRef.current.uniforms;
    u.uTime.value += delta;
    u.uProgress.value = useScrollStore.getState().progress;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uOpacity.value = useFxStore.getState().particleOpacity;
  });

  if (!geometry) return null;

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

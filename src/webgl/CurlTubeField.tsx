"use client";

/**
 * Faint curl-noise TUBE FIELD (ANALISI_LUSION §3.2 option C) — Lusion's
 * signature "curly tubes", shipped DELIBERATELY SOBER for a premium AI
 * consulting brand: a quiet, engineered atmosphere behind the content, never a
 * loud demo. It COMPOSES with the signature line + the single existing Bloom
 * (it never adds a second composer); its emissive sits BELOW the line so bloom
 * treats it as soft haze, subordinate to the hero signal.
 *
 * Build strategy (cheap, deterministic, one draw call):
 *   1. Integrate N curl-noise streamlines on the CPU (curlNoise.ts) — a fixed
 *      seed → the same field every build, so resize / route re-curve never
 *      reshuffle it.
 *   2. Each polyline → CatmullRomCurve3 → low-segment TubeGeometry, tagged with
 *      a per-streamline `aPhase` so the merged tubes don't flow in lockstep.
 *   3. MERGE all tubes into ONE BufferGeometry → a single draw call. Built once
 *      in useMemo; disposed on unmount.
 *
 * GATING (non-negotiable): mounted ONLY on tier === "full" (Scene.tsx). On
 * lite/off it never mounts; prefers-reduced-motion resolves to tier "off" so
 * the whole Canvas is gone — this never appears. An fxStore knob
 * (curlTubeIntensity, default low) + LineDebug leva makes it tunable and lets
 * it be dialed to 0.
 *
 * Material parity mirrors SignatureLine/DriftParticles: GLSL ShaderMaterial on
 * flag OFF (synchronous), TSL NodeMaterial on flag ON (lazy import of
 * three/webgpu + three/tsl, never bundled on the OFF path).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createCurlTubeMaterial,
  type CurlTubeUniforms,
} from "./materials/curlTubeShader";
import { webgpuEnabled } from "./renderer/createRenderer";
import { buildCurlStreamlines } from "./curves/curlNoise";
import { WORLD_VIEW_HEIGHT } from "./constants";
import { useScrollStore } from "./store/scrollStore";
import { useFxStore } from "./store/fxStore";
import type { SectionAnchors } from "./hooks/useSectionAnchors";

interface CurlTubeFieldProps {
  anchors: SectionAnchors;
}

/** Streamline count for the full tier (the only tier that mounts this). */
const STREAMLINE_COUNT = 14;
/** Integration steps per streamline (polyline length). */
const INTEGRATION_STEPS = 56;
/** TubeGeometry tubular segments per streamline — modest (one draw call total). */
const TUBULAR_SEGMENTS = 48;
/** Low radial segments — these are faint background filaments, not hero tubes. */
const RADIAL_SEGMENTS = 5;

/** Merge tube geometries into one, preserving position/normal/uv + aPhase.
 *  Hand-rolled (like RouteHero) to avoid pulling three's examples addons into
 *  the bundle; all inputs share TubeGeometry's indexed layout, which we expand
 *  to non-indexed before concatenating so the merge is a flat copy. */
function mergeTubes(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of flat) {
    total += (g.getAttribute("position") as THREE.BufferAttribute).count;
  }
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const phases = new Float32Array(total);

  let offset = 0;
  flat.forEach((g, i) => {
    const p = g.getAttribute("position") as THREE.BufferAttribute;
    const n = g.getAttribute("normal") as THREE.BufferAttribute | undefined;
    const uvAttr = g.getAttribute("uv") as THREE.BufferAttribute | undefined;
    positions.set(p.array as Float32Array, offset * 3);
    if (n) normals.set(n.array as Float32Array, offset * 3);
    if (uvAttr) uvs.set(uvAttr.array as Float32Array, offset * 2);
    // Per-streamline gradient offset → spreads the gradient phase across tubes.
    const phase = i / Math.max(geoms.length, 1);
    for (let v = 0; v < p.count; v++) phases[offset + v] = phase;
    offset += p.count;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  // Dispose the throwaway non-indexed copies we created.
  flat.forEach((g, i) => {
    if (g !== geoms[i]) g.dispose();
  });
  return merged;
}

export function CurlTubeField({ anchors }: CurlTubeFieldProps) {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const dampedProgress = useRef(0);

  // Material selection by the build-time WebGPU flag, MIRRORING SignatureLine /
  // DriftParticles exactly: GLSL synchronous on OFF; the TSL twin lazy-imported
  // on ON so three/webgpu never lands in the OFF bundle.
  const glsl = useMemo(
    () => (webgpuEnabled() ? null : createCurlTubeMaterial()),
    [],
  );
  const [tsl, setTsl] = useState<{
    material: THREE.Material;
    uniforms: CurlTubeUniforms;
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: { material: THREE.Material; uniforms: CurlTubeUniforms } | null =
      null;
    void import("./materials/curlTubeNodeMaterial").then(
      ({ createCurlTubeNodeMaterial }) => {
        if (cancelled) return;
        const m = createCurlTubeNodeMaterial();
        built = {
          material: m.material as unknown as THREE.Material,
          uniforms: m.uniforms as unknown as CurlTubeUniforms,
        };
        setTsl(built);
      },
    );
    return () => {
      cancelled = true;
      built?.material.dispose();
    };
  }, []);

  const material = (glsl ?? tsl?.material) as THREE.Material | undefined;
  const uniforms = (glsl?.uniforms ?? tsl?.uniforms) as
    | CurlTubeUniforms
    | undefined;

  useEffect(() => () => glsl?.dispose(), [glsl]);

  // World units per document/CSS pixel (stable: changes only on resize).
  const k = WORLD_VIEW_HEIGHT / size.height;
  const worldViewWidth = WORLD_VIEW_HEIGHT * (size.width / size.height);

  const geometry = useMemo(() => {
    // Wait for the first real layout measurement (same guard as the line).
    if (anchors.scrollHeight <= 1) return null;

    // The field spans the whole world strip behind the content, sitting DEEP in
    // negative z so it never crowds the line (z≈0) or the hero. Seeds spread
    // wider than the viewport so streamlines drift in/out of frame organically.
    const worldLen = anchors.scrollHeight * k;
    const half = {
      x: worldViewWidth * 0.6,
      y: worldLen * 0.5,
      z: 2.2,
    };
    const center = { x: 0, y: -worldLen * 0.5, z: -7 };

    // step length scales with the field size so streamlines traverse a useful
    // fraction of the strip regardless of page height (clamped so very tall
    // pages don't produce a single giant sweep).
    const step = THREE.MathUtils.clamp(worldLen / INTEGRATION_STEPS, 0.4, 1.6);

    const curves = buildCurlStreamlines({
      count: STREAMLINE_COUNT,
      steps: INTEGRATION_STEPS,
      step,
      freq: 0.06,
      half,
      center,
      seed: 7,
    });

    const tubes = curves.map(
      (curve) =>
        new THREE.TubeGeometry(
          curve,
          TUBULAR_SEGMENTS,
          // Faint, slender filaments — well below the signature-line radius.
          WORLD_VIEW_HEIGHT * 0.006,
          RADIAL_SEGMENTS,
          false,
        ),
    );
    const merged = mergeTubes(tubes);
    tubes.forEach((g) => g.dispose());

    if (process.env.NODE_ENV !== "production") {
      merged.computeBoundingBox();
    }
    return merged;
    // anchors.version covers scrollHeight changes; resize covers k/width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors.version, k, worldViewWidth]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  useFrame((_, delta) => {
    const fx = useFxStore.getState();
    const u = uniforms;
    if (u) {
      // Slow drift — half the line's flow speed so the haze breathes quietly.
      u.uTime.value += delta;
      u.uColorA.value.set(fx.colorA);
      u.uColorB.value.set(fx.colorB);
      u.uFresnelPower.value = fx.fresnelPower;
      u.uScatter.value = fx.scatter;
      // The global dial: fxStore knob (default low) → bloom-faint haze, 0 hides.
      u.uIntensity.value = fx.curlTubeIntensity;
    }

    // Gentle parallax from scroll progress (read the existing store; NO new
    // scroll wiring, NO second rAF). The field drifts a small fraction of the
    // page travel in the OPPOSITE direction of the camera glide, so it sits
    // behind the content and parallaxes subtly as the reader scrolls.
    const g = groupRef.current;
    if (g) {
      const progress = useScrollStore.getState().progress;
      dampedProgress.current = THREE.MathUtils.damp(
        dampedProgress.current,
        progress,
        4,
        delta,
      );
      const sh = anchors.scrollHeight;
      const worldLen = sh * k;
      // Follow the camera most of the way (the camera travels -worldLen as
      // progress 0→1), but lag by a small parallax fraction so the haze drifts
      // relative to the content rather than scrolling with it 1:1.
      g.position.y = -dampedProgress.current * worldLen * 0.92;
    }
  });

  // No geometry until the first anchor measurement; no material until the lazy
  // TSL chunk resolves on the ON path (OFF path has it synchronously).
  if (!geometry || !material) return null;

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

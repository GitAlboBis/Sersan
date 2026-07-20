"use client";

/**
 * Shared GPU particle field (asset plan §7) — sparse "breathing dust"
 * distributed across the WHOLE world strip, so a thin constellation drifts
 * in the negative space of every section as the camera travels. Replaces
 * the deleted Canvas2D NeuralNetLayer at a fraction of the cost.
 *
 * INSTANCED BILLBOARD (not THREE.Points): a true WebGPU backend hard-caps
 * point primitives to 1px (a documented WebGPU limitation that clamps both
 * `gl_PointSize` and `PointsNodeMaterial.sizeNode`), so the old THREE.Points
 * starfield was invisible under the WebGPU flag. Instead the dust is an
 * InstancedMesh of a unit quad, billboarded toward the camera in the vertex
 * stage with a per-instance screen size — one geometry, one draw call, no
 * per-frame CPU matrix writes (the wander + billboard live entirely in the
 * shader, exactly as the old point vertex shader did). It looks identical on
 * the WebGL2 / flag-OFF path and is finally VISIBLE on the WebGPU / flag-ON
 * path. See materials/particleSpriteShader.ts (GLSL) + particleNodeMaterial.ts
 * (TSL) for the matching size/disc math.
 */
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createParticleMaterial,
  type ParticleUniforms,
} from "./materials/particleSpriteShader";
import { webgpuEnabled } from "./renderer/createRenderer";
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

/**
 * The shared unit-quad corners for the billboard (z=0, xy in [-0.5,0.5]). Two
 * triangles. The vertex shader expands these corners in clip space to the
 * per-instance screen size, so each quad reproduces one old THREE.Points dot.
 * `length(corner)` ∈ [0, 0.707] — the same span as the old `gl_PointCoord-0.5`,
 * so the disc fragment math is unchanged.
 */
const QUAD_CORNERS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

export function DriftParticles({ tier, anchors, pathname }: DriftParticlesProps) {
  const { size, gl } = useThree();

  // Material selection by the build-time WebGPU flag (createRenderer.ts),
  // MIRRORING SignatureLine exactly:
  //   flag OFF → the GLSL ShaderMaterial (instanced-billboard, byte-identical
  //              look to the old THREE.Points starfield),
  //   flag ON  → the TSL NodeMaterial twin (compiles to WGSL; raw GLSL would
  //              render as a black silhouette under a WebGPU backend, and a
  //              point primitive would clamp to 1px).
  // Both expose the SAME uniform shape `{ uX: { value } }`, so the per-frame
  // update logic below drives either one identically.
  //
  // The TSL module imports `three/webgpu` + `three/tsl` (a SECOND, self-contained
  // copy of three). To keep that heavy build out of the classic-WebGL (flag-OFF)
  // bundle entirely (dual-namespace pitfall), `particleNodeMaterial` is imported
  // ONLY behind the ON flag, lazily — never referenced on the OFF path.
  const glsl = useMemo(
    () => (webgpuEnabled() ? null : createParticleMaterial()),
    [],
  );
  const [tsl, setTsl] = useState<{
    material: THREE.Material;
    uniforms: ParticleUniforms;
  } | null>(null);

  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;
    let built: { material: THREE.Material; uniforms: ParticleUniforms } | null =
      null;
    // Dynamic import → the `three/webgpu`/`three/tsl` chunk loads only on the ON
    // path. Lands inside the already-lazy Scene island, never the entry bundle.
    void import("./materials/particleNodeMaterial").then(
      ({ createParticleNodeMaterial }) => {
        if (cancelled) return;
        const m = createParticleNodeMaterial();
        // ParticleNodeUniforms is structurally the GLSL ParticleUniforms shape
        // (same field names, each `{ value }`); the per-frame writes only set
        // `.value`.
        built = {
          material: m.material as unknown as THREE.Material,
          uniforms: m.uniforms as unknown as ParticleUniforms,
        };
        setTsl(built);
      },
    );
    return () => {
      cancelled = true;
      built?.material.dispose();
    };
  }, []);

  // The active material + its shared uniform reference. OFF: GLSL (synchronous).
  // ON: the TSL material once its lazy chunk resolves.
  const material = (glsl ?? tsl?.material) as THREE.Material | undefined;
  const uniforms = (glsl?.uniforms ?? tsl?.uniforms) as
    | ParticleUniforms
    | undefined;

  // Dispose the GLSL material on unmount (OFF path). The TSL material is disposed
  // by its own effect cleanup above.
  useEffect(() => () => glsl?.dispose(), [glsl]);

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
  // Coarse width signal for the geometry memo below. `anchors.version` alone
  // does NOT cover width: setMeasured short-circuits the bump when the
  // NORMALIZED spans and px scrollHeight are unchanged, which is exactly what
  // a width-only resize inside one responsive tier produces (content sits in
  // max-width-capped containers, so 1500→1920px moves no element). Bucketing
  // at 128 CSS px keeps the realloc-storm protection: R3F already debounces
  // resize at 150ms, and the bucket collapses that to ~one rebuild per 128px.
  const widthBucket = Math.round(size.width / 128);

  // Instance count for the active tier/route — used both to size the geometry
  // buffers and to set the InstancedMesh draw count.
  const count = useMemo(
    () =>
      anchors.scrollHeight <= 1
        ? 0
        : Math.max(64, Math.round(COUNT[tier] * route.particleCountScale)),
    [tier, route.particleCountScale, anchors.scrollHeight],
  );

  const geometry = useMemo(() => {
    if (count <= 0) return null;

    const worldLen = anchors.scrollHeight * k;
    // Per-instance spawn distribution — the SAME params as the old THREE.Points
    // field, so density & spread match exactly (xy spread, world-strip depth in
    // Y, z ∈ [-4, 2]). aSeed/aScale carry over verbatim.
    const offsets = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * worldViewWidth * 1.15;
      offsets[i * 3 + 1] = -Math.random() * worldLen;
      offsets[i * 3 + 2] = -4 + Math.random() * 6;
      seeds[i] = Math.random();
      scales[i] = 0.6 + Math.random();
    }

    const geo = new THREE.InstancedBufferGeometry();
    // Shared unit-quad geometry: every instance draws the same two triangles;
    // the vertex stage expands the corners to the per-instance screen size.
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(QUAD_CORNERS, 3),
    );
    geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    // Per-INSTANCE attributes (one value per dust mote).
    geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 1));
    geo.instanceCount = count;
    return geo;
    // route.particleCountScale changes the count → rebuild on route.
    //
    // `k` and `worldViewWidth` are INTENTIONALLY omitted (do not "fix" this
    // back): both derive from useThree().size, which R3F republishes on every
    // ResizeObserver observation, so listing them reallocated three Float32Arrays
    // + a fresh InstancedBufferGeometry for up to 3000 instances on every tick of
    // a resize drag. They are recomputed on every render regardless, so the memo
    // body still reads current values whenever it does run.
    //
    // `widthBucket` stands in for the width half of that pair. It is NOT
    // redundant with `anchors.version`: that bump is skipped on width-only
    // resizes (see the note by widthBucket above), which would otherwise leave
    // aOffset.x sampled from a stale `worldViewWidth` for the rest of the
    // session — the dust field confined to the middle of a widened viewport,
    // since the vertex stage consumes aOffset with no aspect correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, anchors.version, widthBucket]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  // Bias the field's gradient toward the route tone (no-op on home: blend 0
  // and equal endpoints). Runs only on route change (or once the TSL material
  // resolves), not per frame.
  useEffect(() => {
    if (!uniforms) return;
    uniforms.uColorA.value.set("#3BE1FF").lerp(routeColors.a, colorBlend);
    uniforms.uColorB.value.set("#7C5CFF").lerp(routeColors.b, colorBlend);
  }, [uniforms, routeColors, colorBlend]);

  useFrame((_, rawDelta) => {
    // Clamp the delta like every other island. R3F's rAF loop stops in a hidden
    // tab and the clock's delta is unclamped, so the first frame after a refocus
    // carries the whole background duration — feeding that straight into uTime
    // snaps the sin/cos wander by up to ~8% of screen height in one frame (a
    // visible pop on every route). 1/30 matches HeroLogo/NeuralLattice/etc.
    const delta = Math.min(rawDelta, 1 / 30);
    // On the ON path the TSL material loads lazily; until its chunk resolves
    // `uniforms` is undefined and the per-frame writes are skipped. On the OFF
    // path `uniforms` is always set synchronously.
    const u = uniforms;
    if (!u) return;
    u.uTime.value += delta;
    u.uProgress.value = useScrollStore.getState().progress;
    u.uPixelRatio.value = gl.getPixelRatio();
    // Framebuffer size in DEVICE pixels — the billboard converts a device-pixel
    // sprite size to a clip-space corner offset, so it needs the real drawing
    // buffer resolution (size is in CSS px; multiply by the pixel ratio).
    u.uViewport.value.set(
      size.width * gl.getPixelRatio(),
      size.height * gl.getPixelRatio(),
    );
    // Route opacity tone unless the dev has tuned fxStore off its default.
    const fxOpacity = useFxStore.getState().particleOpacity;
    u.uOpacity.value =
      fxOpacity === HOME_FX.particleOpacity ? route.particleOpacity : fxOpacity;
  });

  // No geometry until the first anchor measurement; no material until the lazy
  // TSL chunk resolves on the ON path (OFF path has it synchronously).
  if (!geometry || !material) return null;

  // A plain <mesh> with an InstancedBufferGeometry: the geometry's own
  // `instanceCount` drives the instanced draw (one call), so we deliberately do
  // NOT use <instancedMesh> — that would allocate an unused per-instance
  // `instanceMatrix` mat4 and add a second instance-count source. Billboard +
  // wander happen entirely in the vertex shader from aOffset/aSeed/aScale, so
  // there are no per-frame CPU matrix writes.
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

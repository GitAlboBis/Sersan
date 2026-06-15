/**
 * NeuralLattice materials — TSL NodeMaterials (WebGPU-flag path ONLY).
 *
 * GLSL-TWIN DECISION (mirrors railPlaneNodeMaterial / particleNodeMaterial):
 * this is a NEW, purely decorative layer. On the classic flag-OFF WebGLRenderer
 * path (`!webgpuEnabled()`) the NeuralLattice island hard no-ops (never loads
 * this module, never mounts meshes) and the DOM SVG fallback
 * (neural-graph-fallback.tsx) is the whole visual. On the flag-ON path the node
 * graph compiles to WGSL under WebGPU AND to GLSL under WebGPURenderer's WebGL2
 * *fallback* backend (the same dual-backend contract lineNodeMaterial documents),
 * so a raw-GLSL twin would only ever serve the legacy flag-OFF build.
 *
 * Three materials, ONE visual vocabulary (nodes/edges/signal, cyan→violet):
 *   1. node material  — billboarded disc per lattice node. Uses the proven
 *      DriftParticles INSTANCED-BILLBOARD pattern (shared unit quad +
 *      per-instance `aCenter`, billboarded in CLIP space). Lit by its cluster's
 *      pulse uniform; broken-mode dead nodes desaturate to COL_DEAD/dim.
 *   2. edge material  — LineSegments, additive cyan→violet (per-vertex color),
 *      dimmed where dead.
 *   3. packet material— a billboarded disc per cluster, its `aCenter` lerped
 *      along the pathway in useFrame (CPU lerp), brightest so the selective
 *      bloom catches the travelling "signal".
 *
 * All three: emissive × multiplier (>1.0) + toneMapped:false + AdditiveBlending
 * + depthWrite:false (renderOrder -1 on the mesh) so they read as pure glow
 * behind the DOM copy and never occlude the signature line (depthTest:true).
 *
 * TSL node names verified against the INSTALLED build the same way as
 * particleNodeMaterial (Fn, uniform, uniformArray, attribute, positionLocal,
 * modelViewMatrix, cameraProjectionMatrix, sin, mix, smoothstep, length, float,
 * int, clamp, vec3, vec4, varying — all present; `attribute<"vec3">("name")` +
 * `.toVar()` is the exact typed form particleNodeMaterial uses).
 */
import {
  Color,
  MeshBasicNodeMaterial,
  LineBasicNodeMaterial,
  AdditiveBlending,
  DoubleSide,
} from "three/webgpu";
import {
  Fn,
  uniform,
  uniformArray,
  attribute,
  positionLocal,
  modelViewMatrix,
  cameraProjectionMatrix,
  sin,
  mix,
  smoothstep,
  length,
  float,
  int,
  clamp,
  vec4,
  varying,
} from "three/tsl";
import {
  COL_CYAN,
  COL_VIOLET,
  COL_DEAD,
  NODE_EMISSIVE,
  EDGE_EMISSIVE,
  PACKET_EMISSIVE,
  CLUSTER_COUNT,
} from "./neuralLatticeConfig";

/** Per-frame-driven uniforms shared by the node billboards. */
export type LatticeNodeUniforms = {
  uTime: { value: number };
  uReveal: { value: number };
  /** 0 = healthy (production), 1 = broken (problem). Set once per island. */
  uBroken: { value: number };
  /** Per-cluster ignition 0..1 (length CLUSTER_COUNT) — the eased pulse. */
  uPulse: { array: number[] };
};

/**
 * Node billboard material. Per-instance attributes:
 *   aCenter (vec3 group-local center), aCluster (0..2), aDead (0/1),
 *   aSeed (0..1), aLayer (0..2 → gradient stop).
 */
export function createLatticeNodeMaterial(size: number): {
  material: MeshBasicNodeMaterial;
  uniforms: LatticeNodeUniforms;
} {
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uBroken = uniform(0);
  const uPulse = uniformArray(new Array(CLUSTER_COUNT).fill(0));
  const uSize = uniform(size);
  const uColorA = uniform(new Color(COL_CYAN));
  const uColorB = uniform(new Color(COL_VIOLET));
  const uColorDead = uniform(new Color(COL_DEAD));
  const uEmissive = uniform(NODE_EMISSIVE);

  const material = new MeshBasicNodeMaterial();

  const aCenter = attribute<"vec3">("aCenter");
  const aCluster = attribute<"float">("aCluster");
  const aDead = attribute<"float">("aDead");
  const aSeed = attribute<"float">("aSeed");
  const aLayer = attribute<"float">("aLayer");

  // --- Vertex: billboard a unit quad toward the camera at uSize (LOCAL) ------
  // Center → view space (modelViewMatrix folds the group scale), then add the
  // quad corner (positionLocal.xy ∈ [-0.5,0.5]) scaled by uSize in VIEW space,
  // then project — a camera-facing disc that tracks the section rect.
  material.vertexNode = Fn(() => {
    const mv = modelViewMatrix.mul(vec4(aCenter, 1.0)).toVar();
    mv.x.addAssign(positionLocal.x.mul(uSize));
    mv.y.addAssign(positionLocal.y.mul(uSize));
    return cameraProjectionMatrix.mul(mv);
  })();

  // The quad corner + per-instance attrs needed in the fragment, interpolated.
  const vQuadUv = varying(positionLocal.xy);
  const vCluster = varying(aCluster);
  const vDead = varying(aDead);
  const vSeed = varying(aSeed);
  const vLayer = varying(aLayer);

  // --- Fragment: soft disc, cyan→violet by layer, lit by cluster pulse -------
  const shade = Fn(() => {
    const ci = int(clamp(vCluster, 0.0, float(CLUSTER_COUNT - 1)));
    // `uniformArray.element()` is typed `UniformArrayElementNode<unknown>` (the
    // array was created from plain numbers, so its element type erases to
    // `unknown` and the fluent surface is missing at the TYPE level). At runtime
    // it IS a scalar-float node with the full fluent API, so we recover the
    // typed surface by multiplying it by float(1.0) — an exact no-op that
    // returns a properly-typed scalar node (mirrors how PostFXNodes narrows the
    // loosely-typed addon nodes).
    const pulse = uPulse.element(ci) as unknown as ReturnType<typeof float>;
    const grad = mix(uColorA, uColorB, vLayer.div(2.0));
    const live = grad.mul(float(0.35).add(pulse.mul(0.65)));
    const deadMix = uBroken.mul(vDead);
    const tone = mix(live, uColorDead, deadMix.mul(0.85));
    const emis = uEmissive.mul(float(1.0).sub(deadMix.mul(0.7)));
    const col = tone.mul(emis);

    const disc = smoothstep(0.5, 0.18, length(vQuadUv));
    const breath = sin(uTime.mul(1.3).add(vSeed.mul(6.28))).mul(0.12).add(0.88);
    const baseAlpha = float(0.55)
      .add(pulse.mul(0.45))
      .mul(float(1.0).sub(deadMix.mul(0.6)));
    const alpha = disc.mul(breath).mul(baseAlpha).mul(uReveal);
    return vec4(col.toVec3(), alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  return {
    material,
    uniforms: {
      uTime,
      uReveal,
      uBroken,
      // UniformArrayNode keeps the writable source in `.array` (always present,
      // set in its constructor). `.value` is the vec4-PADDED GPU buffer: it is
      // null until the node graph's setup() runs on first compile, and is
      // re-synced from `.array` on every render (UniformArrayNode.update(),
      // updateType=RENDER). Per-frame writes must therefore target `.array`;
      // writing `.value` crashes pre-compile and is clobbered after it.
      uPulse: uPulse as unknown as { array: number[] },
    },
  };
}

/** Edge uniforms. */
export type LatticeEdgeUniforms = {
  uReveal: { value: number };
  uBroken: { value: number };
  uTime: { value: number };
};

/**
 * Edge material (LineSegments). Per-vertex `color` (baked cyan→violet by layer),
 * `aEdgeDead` (0/1, gated by uBroken), `aEdgeSeed` (shimmer phase).
 */
export function createLatticeEdgeMaterial(): {
  material: LineBasicNodeMaterial;
  uniforms: LatticeEdgeUniforms;
} {
  const uReveal = uniform(0);
  const uBroken = uniform(0);
  const uTime = uniform(0);
  const uEmissive = uniform(EDGE_EMISSIVE);

  const material = new LineBasicNodeMaterial();

  const vColor = attribute<"vec3">("color");
  const aEdgeDead = attribute<"float">("aEdgeDead");
  const aEdgeSeed = attribute<"float">("aEdgeSeed");

  const shade = Fn(() => {
    const deadMix = uBroken.mul(aEdgeDead);
    const emis = uEmissive.mul(float(1.0).sub(deadMix.mul(0.85)));
    const col = vColor.mul(emis);
    const shimmer = sin(uTime.mul(2.0).add(aEdgeSeed.mul(6.28))).mul(0.1).add(0.5);
    const alpha = shimmer.mul(float(1.0).sub(deadMix.mul(0.75))).mul(uReveal);
    return vec4(col.toVec3(), alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;

  return { material, uniforms: { uReveal, uBroken, uTime } };
}

/** Packet uniforms. */
export type LatticePacketUniforms = {
  uReveal: { value: number };
  uTime: { value: number };
};

/**
 * Packet billboard material — a bright travelling disc per cluster. Same
 * billboard math as the node material. Per-instance aCenter (lerped on CPU),
 * aAlive (0/1 — dead packets vanish at the break), aFlow (0..1 → hue).
 */
export function createLatticePacketMaterial(size: number): {
  material: MeshBasicNodeMaterial;
  uniforms: LatticePacketUniforms;
} {
  const uReveal = uniform(0);
  const uTime = uniform(0);
  const uSize = uniform(size);
  const uColorA = uniform(new Color(COL_CYAN));
  const uColorB = uniform(new Color(COL_VIOLET));
  const uEmissive = uniform(PACKET_EMISSIVE);

  const material = new MeshBasicNodeMaterial();

  const aCenter = attribute<"vec3">("aCenter");
  const aAlive = attribute<"float">("aAlive");
  const aFlow = attribute<"float">("aFlow");

  material.vertexNode = Fn(() => {
    const mv = modelViewMatrix.mul(vec4(aCenter, 1.0)).toVar();
    mv.x.addAssign(positionLocal.x.mul(uSize));
    mv.y.addAssign(positionLocal.y.mul(uSize));
    return cameraProjectionMatrix.mul(mv);
  })();

  const vQuadUv = varying(positionLocal.xy);
  const vAlive = varying(aAlive);
  const vFlow = varying(aFlow);

  const shade = Fn(() => {
    const grad = mix(uColorA, uColorB, vFlow);
    const col = grad.mul(uEmissive);
    const disc = smoothstep(0.5, 0.1, length(vQuadUv));
    const pulse = sin(uTime.mul(8.0)).mul(0.15).add(0.85);
    const alpha = disc.mul(pulse).mul(vAlive).mul(uReveal);
    return vec4(col.toVec3(), alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  material.side = DoubleSide;

  return { material, uniforms: { uReveal, uTime } };
}

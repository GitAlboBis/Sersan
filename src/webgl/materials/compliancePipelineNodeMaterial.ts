/**
 * Compliance-pipeline wireframe material — TSL NodeMaterial (WebGPU-flag path
 * ONLY). The dashed-emissive conduit + stage-frame schematic behind the /trust
 * SVG card (step 7, the AUGMENT decision: the SVG stays the legible diagram,
 * this is a subtle bloomed echo BEHIND it).
 *
 * GLSL-TWIN DECISION (mirrors railPlaneNodeMaterial / resourcePreviewNodeMaterial):
 * no raw-GLSL twin. The pipeline 3D is a new, purely decorative layer; on the
 * classic flag-OFF WebGLRenderer path CompliancePipeline3D hard no-ops (never
 * loads this module, never mounts) and the SVG is the whole experience. On the
 * flag-ON path the node graph compiles to WGSL under WebGPU and to GLSL under
 * the WebGL2 *fallback* backend — but the component gates the COMPUTE particle
 * path on the TRUE WebGPU sub-backend and renders nothing on WebGL2-fallback, so
 * this material only ever paints on real WebGPU.
 *
 * WHY NOT drei <Line> / Line2NodeMaterial (verified, both research plans):
 * drei <Line> = three-stdlib LineMaterial = raw GLSL ShaderMaterial → the
 * WebGPURenderer NodeBuilder rejects it ("Material ShaderMaterial is not
 * compatible") → black silhouette. Line2NodeMaterial's LineGeometry imports from
 * bare 'three' → the forbidden dual-namespace. So the schematic is built from
 * CORE three geometry (TubeGeometry / merged struts) + this TSL material.
 *
 * Look: a cyan→violet ramp along the conduit's UV (TubeGeometry uv.x = along the
 * tube, head→tail; merged stage frames carry a synthesized along-arc in uv too)
 * with a fract()-based crawling dash, output color × uEmissive (>1.0,
 * toneMapped:false) + AdditiveBlending so the EXISTING PostFXNodes selective
 * bloom catches ONLY the wire (the surface/40 card + SVG stay ≤1.0).
 *
 * TSL node names verified the same way as railPlaneNodeMaterial.ts (uniform,
 * uv, mix, smoothstep, vec3, fract, abs, oneMinus — all present and already
 * exercised by lineNodeMaterial / railPlaneNodeMaterial / particle builds in the
 * installed 0.184.0 build).
 */
import { Color, MeshBasicNodeMaterial, AdditiveBlending } from "three/webgpu";
import { uniform, uv, mix, smoothstep, vec3, fract, abs } from "three/tsl";
import {
  COL_CYAN,
  COL_VIOLET,
  WIRE_EMISSIVE,
  WIRE_DASH_SCALE,
} from "../gpgpu/linkedParticlesConfig";

/** Per-frame-driven uniform set, mutated via `.value` from CompliancePipeline3D. */
export type PipelineWireUniforms = {
  /** Crawling dash offset along the conduit — advanced per frame. */
  uDashOffset: { value: number };
  /** Number of dash cycles along the wire (fract() frequency). */
  uDashScale: { value: number };
  /** HDR emissive multiplier (>1.0 → selective bloom). */
  uEmissive: { value: number };
  /** Route-transition / presence fade 0..1 (drives opacity). */
  uReveal: { value: number };
  /** Gradient head color (cyan, Input end). */
  uColorA: { value: Color };
  /** Gradient tail color (violet, Output end). */
  uColorB: { value: Color };
};

export function createPipelineWireMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: PipelineWireUniforms;
} {
  const uDashOffset = uniform(0);
  const uDashScale = uniform(WIRE_DASH_SCALE);
  const uEmissive = uniform(WIRE_EMISSIVE);
  const uReveal = uniform(0);
  const uColorA = uniform(new Color(COL_CYAN));
  const uColorB = uniform(new Color(COL_VIOLET));

  const material = new MeshBasicNodeMaterial();

  // --- Fragment: cyan→violet ramp along the tube + crawling dash -------------
  // TubeGeometry uv: uv.x = along the tube [0..1] (head→tail), uv.y = around it.
  const along = uv().x;

  // Spatial cyan→violet ramp keyed to the conduit position (Input→Output), the
  // brand signal direction. NO time-driven hue rotation.
  const grad = mix(uColorA, uColorB, along);

  // Crawling dash: a fract()-based duty cycle along the tube, scrolled by
  // uDashOffset. Soft edges via smoothstep so the dash reads as flowing light,
  // not a hard stripe; baseline floor keeps the conduit faintly continuous.
  // Reversed-edge smoothsteps are written as forward + oneMinus (a reversed
  // edge is undefined in WGSL's smoothstep — railPlaneNodeMaterial header).
  const phase = fract(along.mul(uDashScale).add(uDashOffset));
  // Baseline floor trimmed (0.18 → 0.10) so the conduit reads as crawling dashes
  // of light, not a continuous bright bar spanning the card width.
  const dash = smoothstep(0.0, 0.12, phase)
    .mul(smoothstep(0.38, 0.5, phase).oneMinus())
    .add(0.1);

  const col = grad.mul(uEmissive).mul(dash);

  // Around-tube radial feather: brighter at the tube core, soft at the
  // silhouette (uv.y ∈ [0,1] across the radial seam). Keeps the wire reading as
  // a glowing conduit without geometry cost.
  const radial = abs(uv().y.mul(2.0).sub(1.0)).oneMinus();

  material.colorNode = vec3(col);
  // Opacity ceiling lowered (0.85 → 0.6) so the wire is a subordinate echo
  // behind the SVG, not a dominant glowing pipe.
  material.opacityNode = uReveal.mul(radial).mul(0.6);

  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  // Unlit + HDR: keep emissive >1.0 intact for the selective-bloom threshold.
  material.toneMapped = false;

  return {
    material,
    uniforms: { uDashOffset, uDashScale, uEmissive, uReveal, uColorA, uColorB },
  };
}

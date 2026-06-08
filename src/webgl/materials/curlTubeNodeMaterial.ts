/**
 * Curl-tube-field material — TSL NodeMaterial port (WebGPU backend / flag-ON).
 *
 * FAITHFUL 1:1 port of the GLSL `createCurlTubeMaterial()` in
 * `curlTubeShader.ts`. It exists for the same reason as the line/particle TSL
 * twins: under `WebGPURenderer` the NodeBuilder rejects raw-GLSL
 * `ShaderMaterial` ("Material ShaderMaterial is not compatible") — a GLSL
 * material renders as a black silhouette — whereas TSL NodeMaterials compile to
 * WGSL (and to GLSL on a WebGL2 backend), so they run on both backends.
 *
 * The classic `WebGLRenderer` path (flag OFF) keeps the GLSL material; this
 * file is ONLY constructed when `webgpuEnabled()` is true, which is also the
 * only path that ever imports `three/webgpu` (the dual-namespace pitfall:
 * never let `three` and `three/webgpu` both land in one scene graph). The
 * dynamic import that pulls it lives in CurlTubeField.tsx, behind the ON flag.
 *
 * Parity contract with curlTubeShader.ts (must match exactly):
 *   - per-vertex `aPhase` attribute (gradient offset per streamline) +
 *     view-space normal core glow.
 *   - fragment: animated cyan→violet gradient
 *       t = 0.5 + 0.5*sin(6.28318*(along*1.5 + phase - uTime*uFlowSpeed));
 *       grad = mix(uColorA, uColorB, t);
 *     view-facing core = pow(abs(viewNormal.z), uGlowFalloff);
 *     fresnel rim fres = pow(1 - facing, uFresnelPower);
 *     col = grad + grad*fres*uScatter, then × (uEmissive * uIntensity);
 *     endFade = smoothstep(0,0.12,along) * smoothstep(1,0.88,along);
 *     alpha = core * endFade * uIntensity; additive, depthWrite/depthTest off,
 *     toneMapped off (HDR >1.0 for the shared selective bloom).
 *
 * TSL node names verified against the INSTALLED build (same set used by
 * lineNodeMaterial.ts / particleNodeMaterial.ts): Fn, uniform, attribute, uv,
 * normalView, sin, abs, pow, mix, smoothstep, float, vec3, oneMinus (method).
 */
import { Color, MeshBasicNodeMaterial, AdditiveBlending } from "three/webgpu";
import {
  Fn,
  uniform,
  attribute,
  uv,
  normalView,
  sin,
  abs,
  pow,
  mix,
  smoothstep,
  float,
  vec3,
} from "three/tsl";

export type CurlTubeNodeUniforms = {
  uTime: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uGlowFalloff: { value: number };
  uEmissive: { value: number };
  uFlowSpeed: { value: number };
  uFresnelPower: { value: number };
  uScatter: { value: number };
  uIntensity: { value: number };
};

export function createCurlTubeNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: CurlTubeNodeUniforms;
} {
  // Uniform nodes mirror curlTubeShader.ts defaults 1:1.
  const uTime = uniform(0);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#7C5CFF"));
  const uGlowFalloff = uniform(2.2);
  const uEmissive = uniform(0.55);
  const uFlowSpeed = uniform(0.03);
  const uFresnelPower = uniform(2.5);
  const uScatter = uniform(0.4);
  const uIntensity = uniform(1);

  const material = new MeshBasicNodeMaterial();

  // Per-streamline gradient offset (same attribute name the merged geometry
  // sets); `attribute()` resolves it on the node path exactly as the GLSL
  // `attribute float aPhase`.
  const aPhase = attribute<"float">("aPhase");

  const along = uv().x;

  // Animated gradient; aPhase decorrelates the merged streamlines.
  // t = 0.5 + 0.5*sin(6.28318*(along*1.5 + phase - uTime*uFlowSpeed)).
  const t = float(0.5).add(
    sin(
      float(6.28318).mul(
        along.mul(1.5).add(aPhase).sub(uTime.mul(uFlowSpeed)),
      ),
    ).mul(0.5),
  );
  const grad = mix(uColorA, uColorB, t);

  // View-facing core (matches abs(viewNormal.z) ^ uGlowFalloff).
  const facing = abs(normalView.z);
  const core = pow(facing, uGlowFalloff);

  // "Gel tube" fresnel rim added into HDR color BEFORE the emissive multiply.
  const fres = pow(facing.oneMinus(), uFresnelPower);

  // col = (grad + grad*fres*uScatter) * (uEmissive * uIntensity).
  const col = grad
    .add(grad.mul(fres).mul(uScatter))
    .mul(uEmissive.mul(uIntensity));

  // Longitudinal end fade so each tube dissolves into the navy.
  const endFade = smoothstep(0.0, 0.12, along).mul(
    smoothstep(1.0, 0.88, along),
  );

  // alpha = core * endFade * uIntensity.
  const alpha = core.mul(endFade).mul(uIntensity);

  material.colorNode = vec3(col);
  material.opacityNode = alpha;

  // Match the GLSL ShaderMaterial flags exactly.
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;

  const uniforms: CurlTubeNodeUniforms = {
    uTime,
    uColorA,
    uColorB,
    uGlowFalloff,
    uEmissive,
    uFlowSpeed,
    uFresnelPower,
    uScatter,
    uIntensity,
  };

  return { material, uniforms };
}

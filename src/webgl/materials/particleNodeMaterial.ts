/**
 * Drift-particle material — instanced-billboard TSL NodeMaterial (WebGPU
 * backend / flag-ON path).
 *
 * WHY THIS EXISTS (and why it is NOT a PointsNodeMaterial): a true WebGPU
 * backend hard-caps point primitives to 1px — `PointsNodeMaterial.sizeNode` is
 * clamped to 1 device pixel regardless of the value, a documented WebGPU
 * limitation. The earlier `PointsNodeMaterial` port therefore rendered the
 * starfield as invisible 1px specks under the ON flag. The fix is to abandon
 * the point primitive entirely and draw the dust as an InstancedMesh of a unit
 * quad, billboarded toward the camera in the vertex stage with a per-instance
 * SCREEN size, so the particles subtend real on-screen pixels on BOTH backends.
 *
 * This is the WebGPU twin of `particleSpriteShader.ts` (the GLSL build used on
 * the classic WebGLRenderer / flag-OFF path). Mirrors the line/planet ports:
 * on the WebGPU path (NEXT_PUBLIC_WEBGPU=1) the renderer is `WebGPURenderer`,
 * whose NodeBuilder rejects raw-GLSL `ShaderMaterial` ("Material ShaderMaterial
 * is not compatible") — so a GLSL material renders as a black silhouette. TSL
 * NodeMaterials compile to WGSL (and to GLSL on a WebGL2 backend), so they run
 * on both backends of WebGPURenderer.
 *
 * The classic `WebGLRenderer` path (flag OFF) keeps using the GLSL material;
 * this file is ONLY constructed when `webgpuEnabled()` is true (the only path
 * that ever imports `three/webgpu` — the dual-namespace pitfall: never let
 * `three` and `three/webgpu` both land in one scene graph).
 *
 * Parity contract with particleSpriteShader.ts (must match exactly):
 *   - geometry: InstancedBufferGeometry, unit-quad `position` (z=0, xy in
 *     [-0.5,0.5]) + per-instance `aOffset`(vec3) / `aSeed`(float) / `aScale`(float).
 *   - vertex: per-seed sin/cos wander on the instance center —
 *       p.x += sin(uTime*0.08 + aSeed*43.7) * 0.45
 *       p.y += cos(uTime*0.06 + aSeed*61.3) * 0.35
 *     center → view space (dist = -mv.z), depth fade vFade = smoothstep(26,6,dist);
 *     billboard: corner offset in clip space, device-pixel size =
 *       aScale * uPixelRatio * 38.0 / max(dist, 0.1)   (the OLD gl_PointSize),
 *     converted via (px / uViewport * 2.0 * clip.w).
 *   - fragment: soft round disc circle = smoothstep(0.5, 0.12, length(quadUv));
 *     two-color blend col = mix(uColorA, uColorB, fract(aSeed + uProgress*0.25));
 *     alpha = circle * vFade * uOpacity, early-discard < 0.004; additive,
 *     depthWrite/depthTest off, toneMapped off.
 *
 * TSL node names verified against the INSTALLED build via `require('three/tsl')`
 * / `require('three/webgpu')`: MeshBasicNodeMaterial, Color, Vector2,
 * AdditiveBlending (three/webgpu); Fn, uniform, attribute, positionLocal,
 * modelViewMatrix, cameraProjectionMatrix, sin, cos, smoothstep, length, fract,
 * max, mix, float, vec4, Discard, varying (three/tsl).
 * `varying(node)` evaluates its argument in the vertex stage and interpolates
 * it — the idiomatic equivalent of a GLSL `varying`.
 */
import {
  Color,
  Vector2,
  MeshBasicNodeMaterial,
  AdditiveBlending,
  DoubleSide,
} from "three/webgpu";
import {
  Fn,
  uniform,
  attribute,
  positionLocal,
  modelViewMatrix,
  cameraProjectionMatrix,
  sin,
  cos,
  smoothstep,
  length,
  fract,
  max,
  mix,
  float,
  vec4,
  Discard,
  varying,
} from "three/tsl";

/**
 * Structurally identical to the GLSL `ParticleUniforms` shape (same field
 * names, each `{ value }`); the per-frame writes in DriftParticles only set
 * `.value`, so one shared update path drives both material types. Color
 * uniforms hold a real `THREE.Color` so `u.value.set(...).lerp(...)` works
 * exactly as the GLSL path; `uViewport` holds a real `Vector2`.
 */
export type ParticleNodeUniforms = {
  uTime: { value: number };
  uProgress: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: Vector2 };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uOpacity: { value: number };
};

export function createParticleNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: ParticleNodeUniforms;
} {
  // Uniform nodes mirror particleSpriteShader.ts defaults 1:1.
  const uTime = uniform(0);
  const uProgress = uniform(0);
  const uPixelRatio = uniform(1);
  const uViewport = uniform(new Vector2(1, 1));
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#7C5CFF"));
  const uOpacity = uniform(0.35);

  const material = new MeshBasicNodeMaterial();

  // Per-instance attributes (one value per dust mote). `attribute()` resolves
  // INSTANCED buffer attributes by name on the node path exactly as it does on
  // the WebGL path, so the same InstancedBufferGeometry drives both materials.
  const aOffset = attribute<"vec3">("aOffset");
  const aSeed = attribute<"float">("aSeed");
  const aScale = attribute<"float">("aScale");

  // --- Vertex: instance wander + billboard quad ------------------------------
  // The whole clip-space position is built in `material.vertexNode`: we DON'T
  // let the node pipeline run its default MVP, because the corner offset must
  // be added in CLIP space (a billboard), not local space. The depth fade is a
  // vertex-stage quantity, so it is wrapped in `varying(...)` to interpolate to
  // the fragment (GLSL `varying float vFade`). The whole expression is
  // evaluated in the vertex stage because `material.vertexNode` builds there.
  const dist = float(0).toVar();
  material.vertexNode = Fn(() => {
    // Instance center + slow per-seed wander (matches the GLSL vertex shader).
    const p = aOffset.toVar();
    p.x.addAssign(sin(uTime.mul(0.08).add(aSeed.mul(43.7))).mul(0.45));
    p.y.addAssign(cos(uTime.mul(0.06).add(aSeed.mul(61.3))).mul(0.35));

    // Center → view space; dist = -mv.z (depth of the instance center).
    const mv = modelViewMatrix.mul(vec4(p, 1.0)).toVar();
    dist.assign(mv.z.negate());

    // Center → clip space, then offset the unit-quad corner (position.xy, in
    // [-0.5,0.5]) in the clip XY plane so the quad faces the camera. The
    // device-pixel size equals the OLD gl_PointSize
    //   = aScale * uPixelRatio * 38.0 / max(dist, 0.1);
    // a device-pixel offset → clip is (px / uViewport * 2.0 * clip.w).
    const clip = cameraProjectionMatrix.mul(mv).toVar();
    const size = aScale.mul(uPixelRatio).mul(38.0).div(max(dist, 0.1));
    const corner = positionLocal.xy;
    clip.xy.addAssign(corner.mul(size).div(uViewport).mul(2.0).mul(clip.w));
    return clip;
  })();

  // Depth fade: distant dust dissolves into the navy. vFade = smoothstep(26, 6,
  // dist), evaluated per vertex (dist was set in the vertexNode Fn above) and
  // interpolated to the fragment.
  const vFade = varying(smoothstep(26.0, 6.0, dist));
  // The unit-quad corner in [-0.5,0.5] — same span as the old gl_PointCoord-0.5
  // — interpolated to the fragment for the soft disc.
  const vQuadUv = varying(positionLocal.xy);

  // --- Fragment: soft round sprite + two-color blend -------------------------
  // Computed inside an Fn so `Discard` is appended to the fragment build stack.
  // Returns vec4(col, alpha); `.xyz` → colorNode, `.w` → opacityNode.
  const shade = Fn(() => {
    // circle = smoothstep(0.5, 0.12, length(quadUv)).
    const circle = smoothstep(0.5, 0.12, length(vQuadUv));

    // Hue drifts with scroll so the field stays tied to the signature line:
    // col = mix(uColorA, uColorB, fract(aSeed + uProgress*0.25)).
    const col = mix(uColorA, uColorB, fract(aSeed.add(uProgress.mul(0.25))));

    // alpha = circle * vFade * uOpacity; discard alpha < 0.004.
    const alpha = circle.mul(vFade).mul(uOpacity);
    Discard(alpha.lessThan(0.004));

    return vec4(col.toVec3(), alpha);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  // Match the GLSL ShaderMaterial flags exactly.
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  // Billboard winding can flip in clip space depending on camera; render both
  // sides so a mote is never culled (the old THREE.Points had no face culling).
  material.side = DoubleSide;

  const uniforms: ParticleNodeUniforms = {
    uTime,
    uProgress,
    uPixelRatio,
    uViewport,
    uColorA,
    uColorB,
    uOpacity,
  };

  return { material, uniforms };
}

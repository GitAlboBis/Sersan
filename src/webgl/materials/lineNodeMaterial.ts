/**
 * Signature-line material — TSL NodeMaterial port (WebGPU backend).
 *
 * This is a FAITHFUL 1:1 port of the GLSL `createLineMaterial()` in
 * `lineShader.ts`. It exists because on the WebGPU path
 * (NEXT_PUBLIC_WEBGPU=1) the renderer is `WebGPURenderer`, whose NodeBuilder
 * rejects raw-GLSL `ShaderMaterial` ("Material ShaderMaterial is not
 * compatible") — so the GLSL line renders as a black silhouette. TSL
 * NodeMaterials compile to WGSL (and to GLSL on a WebGL2 backend), so they run
 * on both backends of WebGPURenderer.
 *
 * The classic `WebGLRenderer` path (flag OFF) keeps using the GLSL material;
 * this file is ONLY constructed when `webgpuEnabled()` is true, which is also
 * the only path that ever imports `three/webgpu` (the dual-namespace pitfall:
 * never let `three` and `three/webgpu` both land in one scene graph).
 *
 * Parity contract with lineShader.ts (must match exactly):
 *   - vertex: radial breath = pos += normal * (uBreath * breathField(uv.x)),
 *     breathField = 0.6*sin(x*7 + t*0.55) + 0.4*sin(x*3 - t*0.37), PLUS the
 *     comet swell — a gaussian bump uBreath*1.25*uVel*exp(-rel²) centered on
 *     the lit head (rel = (uv.x - uProgress)/(headLen*2)); normal is passed
 *     through UNPERTURBED (the <0.2° facing tilt is dropped on purpose).
 *   - fragment: head-draw mask on uv.x with fwidth AA, bright head band whose
 *     length breathes with scroll velocity (headLen = uHeadSharp*(1+uVel*5) —
 *     a point at rest, a ≤6× comet tail under a flick) and whose hot mix lifts
 *     with it (head*(0.85+0.3*uVel)), animated cyan→blue gradient, view-facing
 *     core glow (abs(viewNormal.z) ^ uGlowFalloff), the "gel tube" fresnel rim
 *     + fake-scatter (fres = pow(1 - abs(viewNormal.z), uFresnelPower);
 *     col += grad*fres*uScatter added into HDR color BEFORE × uEmissive),
 *     color × uEmissive (HDR >1.0 for bloom-by-threshold),
 *     alpha = drawn * core * uReveal, additive, depthWrite/depthTest off,
 *     toneMapped off.
 *
 * TSL node names verified against the INSTALLED build:
 *   `node_modules/three/build/three.tsl.js` (via `require('three/tsl')`) and
 *   `three/webgpu` for `MeshBasicNodeMaterial`/`AdditiveBlending`/`Color`.
 *   Verified present: Fn, uniform, uv, positionLocal, normalLocal, normalView,
 *   sin, abs, pow, mix, smoothstep, fwidth, float, vec3, vec4, oneMinus, time,
 *   exp.
 */
import { Color, MeshBasicNodeMaterial, AdditiveBlending } from "three/webgpu";
import {
  Fn,
  uniform,
  uv,
  positionLocal,
  normalLocal,
  normalView,
  sin,
  abs,
  pow,
  mix,
  smoothstep,
  fwidth,
  float,
  vec3,
  exp,
} from "three/tsl";

/**
 * The node-uniform set. Each is a TSL `uniform()` whose `.value` is mutated
 * per-frame EXACTLY like the GLSL `ShaderMaterial.uniforms.*.value` — so
 * SignatureLine drives both material types with identical logic. Color
 * uniforms hold a real `THREE.Color`, so `u.value.set(...).lerp(...)` works
 * the same way as the GLSL path.
 */
export type LineNodeUniforms = {
  uProgress: { value: number };
  uTime: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uColorHot: { value: Color };
  uGlowFalloff: { value: number };
  uHeadSharp: { value: number };
  uEmissive: { value: number };
  uFlowSpeed: { value: number };
  uReveal: { value: number };
  uBreath: { value: number };
  uFresnelPower: { value: number };
  uScatter: { value: number };
  uVel: { value: number };
};

export function createLineNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: LineNodeUniforms;
} {
  // Uniform nodes mirror lineShader.ts defaults 1:1.
  const uProgress = uniform(0);
  const uTime = uniform(0);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#2A7FFF")); // was violet #7C5CFF; value now blue
  const uColorHot = uniform(new Color("#EAF6FF"));
  const uGlowFalloff = uniform(2.0);
  const uHeadSharp = uniform(0.045);
  const uEmissive = uniform(2.6);
  const uFlowSpeed = uniform(0.05);
  const uReveal = uniform(1);
  const uBreath = uniform(0);
  const uFresnelPower = uniform(2.5);
  const uScatter = uniform(0.4);
  // Smoothed scroll velocity, 0..1 (damped in SignatureLine so it eases in on
  // a flick and relaxes back over ~0.5s). Drives the comet-head stretch.
  const uVel = uniform(0);

  const material = new MeshBasicNodeMaterial();

  // --- Vertex: radial breath + comet swell (matches lineShader.ts vertex) ----
  // breathField(along) = 0.6*sin(along*7 + t*0.55) + 0.4*sin(along*3 - t*0.37).
  // Offset each vertex along its own surface normal by uBreath * field. The
  // displacement depends only on uv.x (the along coordinate), so it inflates/
  // deflates the tube radius uniformly per cross-section without disturbing the
  // uv.x head-mask coordinate. Comet swell: a gaussian bump centered on the
  // lit head, ONLY under scroll velocity (uVel damped to 0 at rest → the term
  // vanishes). Amplitude rides on uBreath — already radius-relative AND
  // velocity-scaled by the driver — so at uVel=1 the bulge peaks at
  // ~0.5·radius; width tracks the stretched fragment head band (same headLen
  // formula) so the physical swell and the hot tail cover the same arc. When
  // uBreath is 0 (every non-full tier) BOTH terms are 0 → positionLocal is
  // unchanged, matching the GLSL branch skip. The normal is passed through
  // unperturbed (see lineShader.ts note).
  material.positionNode = Fn(() => {
    const along = uv().x;
    const field = sin(along.mul(7.0).add(uTime.mul(0.55)))
      .mul(0.6)
      .add(sin(along.mul(3.0).sub(uTime.mul(0.37))).mul(0.4));
    const headLen = uHeadSharp.mul(uVel.mul(5.0).add(1.0));
    const rel = along.sub(uProgress).div(headLen.mul(2.0));
    const swell = uBreath
      .mul(1.25)
      .mul(uVel)
      .mul(exp(rel.mul(rel).negate()));
    const d = uBreath.mul(field).add(swell);
    return positionLocal.add(normalLocal.mul(d));
  })();

  // --- Fragment: gradient + head-draw mask + view-facing core ----------------
  // Output color (HDR, >1.0) routed through colorNode; alpha through opacityNode.
  // Splitting matches the GLSL `gl_FragColor = vec4(col, alpha)`.
  const along = uv().x;

  // Draw mask: lit up to uProgress. fwidth keeps the head edge crisp and
  // resolution-independent (matches: aa = fwidth(along) + 0.0005;
  // drawn = 1.0 - smoothstep(uProgress - aa, uProgress + aa, along)).
  const aa = fwidth(along).add(0.0005);
  const drawn = float(1.0).sub(
    smoothstep(uProgress.sub(aa), uProgress.add(aa), along),
  );

  // Bright "signal head" band right behind the leading edge. COMET HEAD:
  // headLen = uHeadSharp * (1 + uVel*5) — a point at rest (uVel=0 → exactly
  // the pre-comet band), stretching up to 6× into a comet tail under a fast
  // flick, tightening back as uVel relaxes. The 6× ceiling is inherent (uVel
  // is clamped 0..1 by the driver).
  // head = smoothstep(uProgress - headLen, uProgress, along) * drawn.
  const headLen = uHeadSharp.mul(uVel.mul(5.0).add(1.0));
  const head = smoothstep(uProgress.sub(headLen), uProgress, along).mul(
    drawn,
  );

  // Animated cyan -> blue gradient flowing along the tube. Sine keeps the
  // wrap seamless: t = 0.5 + 0.5*sin(6.28318*(along*1.5 - uTime*uFlowSpeed)).
  const t = float(0.5).add(
    sin(float(6.28318).mul(along.mul(1.5).sub(uTime.mul(uFlowSpeed)))).mul(0.5),
  );
  const grad = mix(uColorA, uColorB, t);

  // View-dependent core: bright where the tube faces the camera, soft at the
  // silhouette. facing = abs(viewNormal.z); core = pow(facing, uGlowFalloff).
  // `normalView` is the per-fragment view-space normal — equivalent to the GLSL
  // `vViewNormal = normalize(normalMatrix * normal)` varying.
  const facing = abs(normalView.z);
  const core = pow(facing, uGlowFalloff);

  // "Gel tube" enhancement (ANALISI_LUSION §3.2A), 1:1 with lineShader.ts:
  // fres = pow(1.0 - facing, uFresnelPower); add grad*fres*uScatter into the
  // HDR color BEFORE the emissive multiply so the >1.0 selective-bloom contract
  // holds and the grazing rim blooms like translucent gel. View-dependent only
  // → no new per-frame animation, safe on every tier.
  const fres = pow(facing.oneMinus(), uFresnelPower);

  // col = mix(grad, uColorHot, head * (0.85 + 0.3*uVel)); col += grad*fres*uScatter;
  // col *= uEmissive. The head→hot mix lifts with velocity (0.85 at rest —
  // unchanged — up to 1.15 at full flick; the mild extrapolation past
  // uColorHot just pushes the comet core a touch hotter in HDR, which the
  // threshold-1.0 bloom reads as extra glow exactly where the energy is).
  const col = mix(grad, uColorHot, head.mul(uVel.mul(0.3).add(0.85)))
    .add(grad.mul(fres).mul(uScatter))
    .mul(uEmissive);
  // alpha = drawn * core * uReveal.
  const alpha = drawn.mul(core).mul(uReveal);

  material.colorNode = vec3(col);
  material.opacityNode = alpha;

  // Match the GLSL ShaderMaterial flags exactly.
  material.transparent = true;
  material.depthWrite = false;
  // depthTest ON (depthWrite stays OFF) — twin of lineShader.ts FIX 1a: the
  // opaque hero mark writes depth and draws first, so line fragments behind it
  // (hero waypoint z:-1.0 vs the mark at heroPosZ:-0.3) are discarded rather
  // than additively brightening its silhouette. depthWrite off still lets the
  // additive drift particles / rail planes at renderOrder:-1 show through.
  material.depthTest = true;
  material.blending = AdditiveBlending;
  // Unlit + HDR: keep emissive values above 1.0 intact so the bloom-by-
  // luminance-threshold (approach A) still selects ONLY this line.
  material.toneMapped = false;

  const uniforms: LineNodeUniforms = {
    uProgress,
    uTime,
    uColorA,
    uColorB,
    uColorHot,
    uGlowFalloff,
    uHeadSharp,
    uEmissive,
    uFlowSpeed,
    uReveal,
    uBreath,
    uFresnelPower,
    uScatter,
    uVel,
  };

  return { material, uniforms };
}

/**
 * Curl-tube-field shader material (GLSL / classic WebGLRenderer / flag-OFF).
 *
 * This is the FAINT background "curly tubes" haze (ANALISI_LUSION §3.2 option
 * C). It deliberately mirrors the signature-line look — animated cyan→blue
 * gradient + a view-dependent core glow + the "gel tube" fresnel rim — but
 * WITHOUT the head/draw mask (the field is ambient, not scroll-drawn) and at a
 * much LOWER emissive so the single existing Bloom treats it as soft haze, not
 * a hero. It keeps the same selective-bloom contract: unlit + additive, color
 * pushed >1.0 via uEmissive with toneMapped left untouched, so the one Bloom
 * (threshold = 1.0) still picks ONLY the emissive lines/haze without a second
 * composer.
 *
 * GLSL lives in inline template literals (Turbopack, no .glsl loader), exactly
 * like lineShader.ts.
 *
 * uPhase is a per-vertex attribute carrying each streamline's gradient offset
 * (set on the merged geometry) so the merged tubes don't all flow in lockstep.
 */
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec3 vViewNormal;
  varying float vAlong;   // 0..1 along the tube (uv.x)
  varying float vPhase;   // per-streamline gradient offset

  attribute float aPhase;

  void main() {
    vAlong = uv.x;
    vPhase = aPhase;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vViewNormal;
  varying float vAlong;
  varying float vPhase;

  uniform float uTime;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uGlowFalloff;
  uniform float uEmissive;
  uniform float uFlowSpeed;
  uniform float uFresnelPower;
  uniform float uScatter;
  // Global dial: 0 hides the field entirely (knob from fxStore / leva), 1 = full.
  uniform float uIntensity;

  void main() {
    float along = vAlong;

    // Animated cyan -> blue gradient flowing along the tube; vPhase
    // decorrelates the streamlines so they don't pulse in lockstep. Sine keeps
    // the wrap seamless (no fract() seam).
    float t = 0.5 + 0.5 * sin(6.28318 * (along * 1.5 + vPhase - uTime * uFlowSpeed));
    vec3 grad = mix(uColorA, uColorB, t);

    // View-dependent core: bright where the tube faces the camera, soft at the
    // silhouette — a glowing filament without geometry cost (same as the line).
    float facing = abs(vViewNormal.z);
    float core = pow(facing, uGlowFalloff);

    // "Gel tube" fresnel rim (ANALISI_LUSION §3.2A): grazing-edge lift, added
    // into the HDR color BEFORE the emissive multiply so the >1.0 selective-
    // bloom contract holds and the rim blooms like translucent gel.
    float fres = pow(1.0 - facing, uFresnelPower);

    vec3 col = grad;
    col += grad * fres * uScatter;
    col *= uEmissive * uIntensity;

    // Gentle longitudinal fade at both ends so a tube dissolves into the navy
    // instead of terminating in a hard cap.
    float endFade = smoothstep(0.0, 0.12, along) * smoothstep(1.0, 0.88, along);

    float alpha = core * endFade * uIntensity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type CurlTubeUniforms = {
  uTime: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uGlowFalloff: { value: number };
  uEmissive: { value: number };
  uFlowSpeed: { value: number };
  uFresnelPower: { value: number };
  uScatter: { value: number };
  uIntensity: { value: number };
};

export function createCurlTubeMaterial(): THREE.ShaderMaterial & {
  uniforms: CurlTubeUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#3BE1FF") },
      uColorB: { value: new THREE.Color("#2A7FFF") }, // was violet #7C5CFF; value now blue
      // DELIBERATELY below the line's emissive (~2.6): the field is faint haze,
      // not a hero. Driven per-frame from fxStore.curlTubeIntensity.
      uGlowFalloff: { value: 2.2 },
      uEmissive: { value: 0.55 },
      uFlowSpeed: { value: 0.03 },
      uFresnelPower: { value: 2.5 },
      uScatter: { value: 0.4 },
      uIntensity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return material as THREE.ShaderMaterial & { uniforms: CurlTubeUniforms };
}

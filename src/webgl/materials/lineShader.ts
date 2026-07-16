/**
 * Signature-line shader material.
 *
 * GLSL lives in inline template literals on purpose — Next 16 builds with
 * Turbopack and no .glsl loader is configured; inline strings sidestep the
 * whole loader question (signature-line spec §7.5).
 *
 * The material is intentionally unlit + additive: color values are pushed
 * above 1.0 via uEmissive with toneMapped output left untouched, so a
 * luminance-threshold Bloom (threshold = 1.0) picks out ONLY this line —
 * selective bloom without a Selection pass (spec §4, approach A).
 */
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;

  uniform float uTime;
  // Breath amplitude in WORLD units (already radius-relative: the builder
  // passes <= 0.4 * tubeRadius). 0 disables the breath entirely.
  uniform float uBreath;
  // Comet head (see fragment): the same head position / velocity / band
  // length drive a head-LOCAL radial swell so the tube physically bulges
  // where the scroll energy is. All three are shared with the fragment stage
  // (ShaderMaterial uniforms span both stages).
  uniform float uProgress;
  uniform float uHeadSharp;
  uniform float uVel;

  // Cheap analytic value-noise-ish term: two low-frequency sines whose phase
  // walks along the tube (uv.x) and slowly in time. Smooth + periodic, so no
  // discontinuities at the head-edge mask.
  float breathField(float along) {
    return 0.6 * sin(along * 7.0 + uTime * 0.55)
         + 0.4 * sin(along * 3.0 - uTime * 0.37);
  }

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Radial position breath: offset each vertex along its own surface normal
    // by a low-frequency field. The displacement is uniform per cross-section
    // ring (the field depends only on along), so it inflates/deflates the
    // tube radius without disturbing the uv.x head-mask coordinate.
    //
    // The normal is INTENTIONALLY passed through unperturbed. The physically
    // correct facing-core tilt is -(d displacement / ds) * T where ds is ARC
    // LENGTH. Since uv.x spans [0,1] over the whole curve of world length
    // L ≈ 150, d/ds = (d/d(uv.x)) / L; with amplitude capped at 0.4*radius the
    // correct tilt is < 0.2° — below perception. So we drop the correction
    // entirely (an earlier version treated uv.x AS arc length, overscaling the
    // tilt ~150× → ~17° → the core-glow shimmer the P1 check flagged).
    if (uBreath > 0.0001) {
      float along = uv.x;
      float d = uBreath * breathField(along);
      // Comet swell: a gaussian bump centered on the lit head, ONLY under
      // scroll velocity (uVel is damped 0 at rest → this term vanishes and
      // the tube is byte-identical to the pre-comet look). Amplitude rides on
      // uBreath — already radius-relative AND velocity-scaled by the driver
      // (≤0.4·radius at full speed) — so at uVel=1 the bulge peaks at
      // ~0.5·radius without needing a separate radius uniform. Width tracks
      // the stretched head band (headLen, same formula as the fragment) so
      // the physical swell and the hot comet tail always cover the same arc.
      // Sharing the uBreath>0 gate keeps this full-tier only, like the breath.
      float headLen = uHeadSharp * (1.0 + uVel * 5.0);
      float rel = (along - uProgress) / (headLen * 2.0);
      d += uBreath * 1.25 * uVel * exp(-rel * rel);
      pos += normal * d;
    }

    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;

  uniform float uProgress;
  uniform float uTime;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorHot;
  uniform float uGlowFalloff;
  uniform float uHeadSharp;
  uniform float uEmissive;
  uniform float uFlowSpeed;
  uniform float uReveal;
  uniform float uFresnelPower;
  uniform float uScatter;
  // Smoothed scroll velocity, 0..1 (damped in SignatureLine so it eases in on
  // a flick and relaxes back over ~0.5s). Drives the comet-head stretch.
  uniform float uVel;

  void main() {
    // three.js TubeGeometry maps uv.x ALONG the tube (0 = start, 1 = end)
    // and uv.y around the circumference.
    float along = vUv.x;

    // Draw mask: lit up to uProgress. fwidth keeps the head edge crisp and
    // resolution-independent (screen-space AA, no shimmer).
    float aa = fwidth(along) + 0.0005;
    float drawn = 1.0 - smoothstep(uProgress - aa, uProgress + aa, along);

    // Bright "signal head" band right behind the leading edge. COMET HEAD:
    // the band length breathes with scroll velocity — at rest it collapses to
    // the tuned uHeadSharp point (uVel=0 → exactly the pre-comet band); under
    // a fast flick it stretches up to 6× into a comet tail trailing the head,
    // then tightens back as uVel relaxes. The 6× ceiling is inherent (uVel is
    // clamped 0..1 by the driver), so the tail can never smear across a whole
    // section even on arc-dense routes like the 580vh /audit page.
    float headLen = uHeadSharp * (1.0 + uVel * 5.0);
    float head = smoothstep(uProgress - headLen, uProgress, along) * drawn;

    // Animated cyan -> blue gradient flowing along the tube. Sine keeps
    // the wrap seamless (no fract() seam).
    float t = 0.5 + 0.5 * sin(6.28318 * (along * 1.5 - uTime * uFlowSpeed));
    vec3 grad = mix(uColorA, uColorB, t);

    // View-dependent core: bright where the tube faces the camera, soft at
    // the silhouette — reads as a glowing filament without geometry cost.
    float facing = abs(vViewNormal.z);
    float core = pow(facing, uGlowFalloff);

    // "Gel tube" enhancement (ANALISI_LUSION §3.2A): a thin fresnel rim where
    // the surface grazes the view direction, plus a soft fake-scattering glow.
    // fres peaks at the silhouette (facing → 0) and falls off toward the core;
    // we add grad*fres*uScatter into the HDR color BEFORE the emissive multiply
    // so the >1.0 selective-bloom contract still holds and the rim blooms like
    // translucent gel. Kept subtle (uScatter ~0.4) → ~15-25% grazing lift, not
    // a thick halo. View-dependent only → no new per-frame animation.
    float fres = pow(1.0 - facing, uFresnelPower);

    // Head→hot mix lifts with velocity (0.85 at rest — unchanged — up to 1.15
    // at full flick; the mild extrapolation past uColorHot just pushes the
    // comet core a touch hotter in HDR, which the threshold-1.0 bloom reads
    // as extra glow exactly where the energy is).
    vec3 col = mix(grad, uColorHot, head * (0.85 + 0.3 * uVel));
    col += grad * fres * uScatter;
    col *= uEmissive;
    float alpha = drawn * core * uReveal;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export type LineUniforms = {
  uProgress: { value: number };
  uTime: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uColorHot: { value: THREE.Color };
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

export function createLineMaterial(): THREE.ShaderMaterial & {
  uniforms: LineUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#3BE1FF") },
      uColorB: { value: new THREE.Color("#2A7FFF") }, // was violet #7C5CFF; value now blue
      uColorHot: { value: new THREE.Color("#EAF6FF") },
      uGlowFalloff: { value: 2.0 },
      uHeadSharp: { value: 0.045 },
      uEmissive: { value: 2.6 },
      uFlowSpeed: { value: 0.05 },
      uReveal: { value: 1 },
      uBreath: { value: 0 },
      uFresnelPower: { value: 2.5 },
      uScatter: { value: 0.4 },
      uVel: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    // depthTest ON (depthWrite stays OFF): the opaque hero mark writes depth and
    // is drawn before this transparent line, so line fragments BEHIND the mark
    // (hero waypoint z:-1.0 vs the mark at heroPosZ:-0.3) are discarded instead
    // of additively compositing over the silhouette (PIANO_FIX_VISUAL FIX 1a).
    // depthWrite off keeps the line from blocking the additive drift particles /
    // rail planes that intentionally sit behind it at renderOrder:-1.
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  return material as THREE.ShaderMaterial & { uniforms: LineUniforms };
}

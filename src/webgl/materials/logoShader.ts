/**
 * Dissolving SERSAN logo materials — GLSL ShaderMaterials (WebGL2 / flag-OFF
 * path, the LIVE/verified build).
 *
 * Two factories that share ONE noise field and ONE `uDissolve` so the solid
 * surface and the particle cloud read as the same letterform "turning to
 * light-dust and back":
 *
 *   createDissolveBodyMaterial()    — the extruded mark surface. Matte navy
 *     body (palette from planetShader: deep #0a1526, band #1d3a63, cyan #3BE1FF,
 *     blue #2A7FFF), view-space key lighting (no Light objects, exactly like
 *     planetShader), a subtle cyan fresnel rim. Dissolve: erode where the
 *     object-space noise < uDissolve (`discard`), and emit a bright HDR cyan→
 *     blue EDGE band within ~uEdge of the front so selective bloom catches it.
 *
 *   createDissolveParticleMaterial() — instanced-billboard sprites (mirrors
 *     DriftParticles' particleSpriteShader: unit-quad corners expanded to a
 *     per-instance screen size in clip space, round disc in the fragment).
 *     Particles are BORN at the erosion front (per-instance `aThreshold` is the
 *     same noise) and lift along the surface normal + curl drift as uDissolve
 *     passes their threshold; HDR color for bloom; fades out as it fully
 *     disperses and by the scroll `uFade`.
 *
 * Inline GLSL (Turbopack has no .glsl loader). The noise `MARK_NOISE_GLSL`
 * replicates `markThreshold` in geometry/sersanMark.ts constant-for-constant
 * (3-octave value-noise fbm of object space, normalized to ~[0,1]).
 */
import * as THREE from "three";

/**
 * 3D value-noise fbm of object space — the SHARED dissolve field. MUST match
 * `markThreshold` (geometry/sersanMark.ts) and the TSL twin exactly:
 *   hash31(p) = fract(sin(dot(p,(127.1,311.7,74.7))) * 43758.5453123)
 *   vnoise3   = trilinear value noise with smoothstep weights
 *   fbm       = 3 octaves, a=0.5 halving, p*=2.02, normalized by sum(a)
 *   freq      = 1.05 (first-octave object-space frequency)
 * `markNoise(p)` returns ~[0,1]; the body erodes where markNoise < uDissolve.
 */
export const MARK_NOISE_GLSL = /* glsl */ `
  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  float vnoise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float c000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float c100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float c010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float c110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float c001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float c101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float c011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float c111 = hash31(i + vec3(1.0, 1.0, 1.0));
    float x00 = mix(c000, c100, f.x);
    float x10 = mix(c010, c110, f.x);
    float x01 = mix(c001, c101, f.x);
    float x11 = mix(c011, c111, f.x);
    float y0 = mix(x00, x10, f.y);
    float y1 = mix(x01, x11, f.y);
    return mix(y0, y1, f.z);
  }
  float markNoise(vec3 p) {
    p *= 1.05;
    float v = 0.0;
    float a = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise3(p);
      norm += a;
      p *= 2.02;
      a *= 0.5;
    }
    return v / norm;
  }
`;

// === Extruded mark body =====================================================

const bodyVertex = /* glsl */ `
  varying vec3 vObj;     // object-space position → drives the dissolve noise
  varying vec3 vNormal;  // view-space normal for lighting
  varying vec3 vView;    // view direction (toward camera)
  void main() {
    vObj = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const bodyFragment = /* glsl */ `
  uniform float uTime;
  uniform float uDissolve;  // 0 = solid, 1 = fully dispersed
  uniform float uEdge;      // half-width of the glowing erosion band
  uniform vec3 uDeep;
  uniform vec3 uBand;
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  uniform vec3 uLightDir;   // view-space, normalized

  varying vec3 vObj;
  varying vec3 vNormal;
  varying vec3 vView;

  __NOISE__

  void main() {
    // Shared dissolve field (object space). Erode everything below the front.
    float n = markNoise(vObj);
    if (n < uDissolve) discard;

    vec3 nrm = normalize(vNormal);

    // Matte navy body with a faint banded shimmer so the surface is alive
    // (palette borrowed from the planet). The band term uses object-space Y +
    // a slow time drift — restrained, not a gas giant.
    float bands = vnoise3(vec3(vObj.xy * 2.4, uTime * 0.05));
    vec3 col = mix(uDeep, uBand, smoothstep(0.4, 0.75, bands));

    // View-space key lighting + soft fill (no Light objects, like planetShader).
    float ndl = dot(nrm, normalize(uLightDir));
    float day = smoothstep(-0.35, 0.6, ndl);
    col *= 0.22 + 0.95 * day;

    // Cyan fresnel rim — grazing edges pick up the signal color.
    float fres = pow(1.0 - abs(dot(nrm, normalize(vView))), 3.0);
    col += uCyan * fres * 0.35;

    // Glowing erosion edge: bright cyan→blue band hugging the front, HDR
    // (>1.0) so the threshold Bloom isolates it. Fades along the band width.
    float edge = 1.0 - smoothstep(0.0, uEdge, n - uDissolve);
    vec3 edgeCol = mix(uCyan, uViolet, smoothstep(0.0, 1.0, n));
    col += edgeCol * edge * edge * 2.6;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export type DissolveBodyUniforms = {
  uTime: { value: number };
  uDissolve: { value: number };
  uEdge: { value: number };
  uDeep: { value: THREE.Color };
  uBand: { value: THREE.Color };
  uCyan: { value: THREE.Color };
  uViolet: { value: THREE.Color };
  uLightDir: { value: THREE.Vector3 };
};

export function createDissolveBodyMaterial(): THREE.ShaderMaterial & {
  uniforms: DissolveBodyUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader: bodyVertex,
    fragmentShader: bodyFragment.replace("__NOISE__", MARK_NOISE_GLSL),
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uEdge: { value: 0.12 },
      uDeep: { value: new THREE.Color("#0a1526") },
      uBand: { value: new THREE.Color("#1d3a63") },
      uCyan: { value: new THREE.Color("#3BE1FF") },
      uViolet: { value: new THREE.Color("#2A7FFF") }, // name kept; value now blue
      uLightDir: { value: new THREE.Vector3(-0.55, 0.42, 0.72).normalize() },
    },
  });
  return material as THREE.ShaderMaterial & { uniforms: DissolveBodyUniforms };
}

// === Dissolve particles (instanced billboards) ==============================
// Geometry contract (set by HeroLogo.tsx): an InstancedBufferGeometry whose
// vertex `position` is the unit-quad corner (z=0, xy in [-0.5,0.5]) and whose
// per-INSTANCE attributes are `aRest`(vec3), `aNormal`(vec3), `aSeed`(float),
// `aThreshold`(float). Billboard math mirrors particleSpriteShader.ts exactly.

const particleVertex = /* glsl */ `
  attribute vec3 aRest;
  attribute vec3 aNormal;
  attribute float aSeed;
  attribute float aThreshold;

  uniform float uTime;
  uniform float uDissolve;
  uniform float uEdge;
  uniform float uLift;       // normal-direction lift-off distance
  uniform float uSpread;     // curl/value-noise drift amplitude
  uniform float uPixelRatio;
  uniform vec2 uViewport;    // framebuffer size in DEVICE pixels

  varying vec2 vQuadUv;
  varying float vSeed;
  varying float vDisp;       // 0 = on surface, 1 = fully dispersed

  __NOISE__

  void main() {
    vSeed = aSeed;
    vQuadUv = position.xy;

    // Per-instance dispersion: 0 until the front reaches this particle's
    // threshold, ramping to 1 as it passes. Same field as the body erosion, so
    // the particle is born exactly where the surface opens.
    float disp = smoothstep(aThreshold - uEdge, aThreshold + uEdge, uDissolve);
    vDisp = disp;

    // Lift off along the surface normal, plus a curl-ish value-noise drift that
    // animates over time and is desynced per seed. Both scale with disp so the
    // particle peels away only as the front arrives.
    vec3 p = aRest;
    p += aNormal * (uLift * disp);
    float t = uTime * 0.35 + aSeed * 53.1;
    vec3 drift = vec3(
      vnoise3(aRest * 1.7 + vec3(t, 0.0, 0.0)) - 0.5,
      vnoise3(aRest * 1.7 + vec3(0.0, t, 11.3)) - 0.5,
      vnoise3(aRest * 1.7 + vec3(7.7, 0.0, t)) - 0.5
    );
    p += drift * (uSpread * disp);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    vec4 clip = projectionMatrix * mv;

    // Screen size in device px (mirrors particleSpriteShader). A freshly-born
    // mote pops and grows as it disperses. NOTE: the base constant must be large
    // enough that the quad covers >1px — sub-pixel quads rasterize to nothing
    // (the original 9.0 made the whole cloud invisible).
    float size = (1.0 + 2.2 * disp) * uPixelRatio * 30.0 / max(dist, 0.1);
    clip.xy += position.xy * size / uViewport * 2.0 * clip.w;

    gl_Position = clip;
  }
`;

const particleFragment = /* glsl */ `
  uniform float uDissolve;
  uniform float uFade;       // scroll-handoff fade for the whole field
  uniform vec3 uCyan;
  uniform vec3 uViolet;

  varying vec2 vQuadUv;
  varying float vSeed;
  varying float vDisp;

  void main() {
    // Only the dispersing particles are visible — none on the solid letter.
    if (vDisp <= 0.001) discard;

    // Soft round disc — same span as particleSpriteShader (gl_PointCoord-0.5).
    float circle = smoothstep(0.5, 0.12, length(vQuadUv));
    if (circle < 0.02) discard;

    // HDR cyan→blue so selective bloom catches the dust. Fade IN as the mote
    // is born; HOLD full brightness while dispersed so the cloud persists.
    vec3 col = mix(uCyan, uViolet, clamp(vSeed * 0.6 + vDisp * 0.4, 0.0, 1.0));
    float life = smoothstep(0.0, 0.16, vDisp);
    float intensity = 2.2 + 1.4 * vDisp;

    float alpha = circle * life * uFade;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col * intensity, alpha);
  }
`;

export type DissolveParticleUniforms = {
  uTime: { value: number };
  uDissolve: { value: number };
  uEdge: { value: number };
  uLift: { value: number };
  uSpread: { value: number };
  uFade: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uCyan: { value: THREE.Color };
  uViolet: { value: THREE.Color };
};

export function createDissolveParticleMaterial(): THREE.ShaderMaterial & {
  uniforms: DissolveParticleUniforms;
} {
  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertex.replace("__NOISE__", MARK_NOISE_GLSL),
    fragmentShader: particleFragment,
    uniforms: {
      uTime: { value: 0 },
      uDissolve: { value: 0 },
      uEdge: { value: 0.12 },
      uLift: { value: 0.45 },
      uSpread: { value: 0.6 },
      uFade: { value: 1 },
      uPixelRatio: { value: 1 },
      uViewport: { value: new THREE.Vector2(1, 1) },
      uCyan: { value: new THREE.Color("#3BE1FF") },
      uViolet: { value: new THREE.Color("#2A7FFF") }, // name kept; value now blue
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  return material as THREE.ShaderMaterial & {
    uniforms: DissolveParticleUniforms;
  };
}

/**
 * The SerSan planet — fully procedural, brand-native materials.
 *
 * No textures, no HDRI: a dark gas giant whose latitude bands flow in the
 * brand palette (deep navy body, cyan glints, violet depths) and a ring
 * system rendered as bands of light (cyan core → violet rim) with fine
 * radial striations and a slow angular drift that makes rotation legible.
 *
 * Inline GLSL (Turbopack has no .glsl loader). Lighting is computed in the
 * shader (view-space key direction) so the scene needs no Light objects.
 */
import * as THREE from "three";

const NOISE_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

// === Gas-giant body =======================================================

const bodyVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const bodyFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uBand;
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  uniform vec3 uLightDir; // view-space, normalized

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;

  ${"" /* noise functions injected below */}
  __NOISE__

  void main() {
    float lat = vUv.y;
    float lon = vUv.x;

    // STRICTLY latitudinal striping (long thin streaks, gas-giant read),
    // with only a mild flowing warp so the surface stays alive without
    // swirling into a whirlpool at the visible pole. Longitude enters the
    // noise ONLY through cos/sin so the field is periodic — no UV seam.
    float cx = cos(6.28318 * lon);
    float sx = sin(6.28318 * lon);
    float warp = fbm(vec2(cx * 2.0 + uTime * 0.016, sx * 2.0 + lat * 6.0)) - 0.5;
    float bands = fbm(vec2(uTime * 0.012 + cx * 0.8 + sx * 0.5, (lat + warp * 0.05) * 16.0));

    // Brand palette: deep navy base, steel-navy mid bands, cyan glints on
    // the crests, violet in the troughs.
    vec3 col = uDeep;
    col = mix(col, uBand, smoothstep(0.34, 0.72, bands));
    col = mix(col, uCyan, pow(max(bands - 0.58, 0.0) * 2.4, 2.0) * 0.85);
    col = mix(col, uViolet, pow(max(0.46 - bands, 0.0) * 2.1, 2.1) * 0.6);

    // Day/night from the view-space key direction; soft terminator.
    float ndl = dot(normalize(vNormal), normalize(uLightDir));
    float day = smoothstep(-0.32, 0.5, ndl);
    col *= 0.16 + 1.0 * day;

    // Limb darkening keeps the sphere reading as a volume.
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    col *= 0.5 + 0.5 * smoothstep(0.0, 0.5, facing);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createPlanetBodyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: bodyVertex,
    fragmentShader: bodyFragment.replace("__NOISE__", NOISE_GLSL),
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#0a1526") },
      uBand: { value: new THREE.Color("#1d3a63") },
      uCyan: { value: new THREE.Color("#3BE1FF") },
      uViolet: { value: new THREE.Color("#7C5CFF") },
      uLightDir: { value: new THREE.Vector3(-0.55, 0.42, 0.72).normalize() },
    },
  });
}

// === Ring system ==========================================================

const ringVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position; // object space: annulus lives in XY before tilt
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uCyan;
  uniform vec3 uViolet;

  varying vec2 vUv;
  varying vec3 vPos;

  __NOISE__

  // Soft band between a..b of the radial coordinate.
  float band(float x, float a, float b, float s) {
    return smoothstep(a - s, a + s, x) * (1.0 - smoothstep(b - s, b + s, x));
  }

  void main() {
    float r = vUv.x;                  // 0 = inner edge, 1 = outer edge
    float ang = atan(vPos.y, vPos.x); // angular coordinate for grain

    // Saturn-like density profile, re-lit as bands of light:
    // faint C, bright B, Cassini gap, mid A, thin F.
    float prof = 0.0;
    prof += 0.40 * band(r, 0.02, 0.26, 0.030);
    prof += 1.00 * band(r, 0.29, 0.62, 0.025);
    prof += 0.55 * band(r, 0.72, 0.93, 0.025);
    prof += 0.34 * band(r, 0.965, 0.985, 0.006);
    prof *= 1.0 - 0.9 * band(r, 0.645, 0.705, 0.012); // Cassini gap

    // Fine radial striations — the "grooves".
    prof *= 0.72 + 0.28 * vnoise(vec2(r * 150.0, 0.0));
    // Angular grain with a slow drift: rotation reads, the ring shimmers.
    prof *= 0.82 + 0.18 * vnoise(vec2(ang * 26.0 + uTime * 0.06, r * 40.0));

    if (prof < 0.01) discard;

    // Cyan core fading to violet at the rim — restrained: elegant bands of
    // light, not neon highways.
    vec3 col = mix(uCyan, uViolet, smoothstep(0.12, 0.95, r));
    col = mix(col, vec3(0.88, 0.97, 1.0), band(r, 0.30, 0.46, 0.04) * 0.18);

    col *= 0.3 + 0.5 * prof + 0.22 * band(r, 0.31, 0.5, 0.035);

    gl_FragColor = vec4(col, prof * uOpacity);
  }
`;

export function createRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ringVertex,
    fragmentShader: ringFragment.replace("__NOISE__", NOISE_GLSL),
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.72 },
      uCyan: { value: new THREE.Color("#3BE1FF") },
      uViolet: { value: new THREE.Color("#7C5CFF") },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// === Two-layer atmosphere =================================================

const atmoVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const atmoFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uAlpha;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    float a = rim * uAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * uIntensity * rim, a);
  }
`;

export function createAtmosphereMaterial(
  options: { color?: string; intensity?: number; power?: number; alpha?: number; side?: THREE.Side } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: atmoVertex,
    fragmentShader: atmoFragment,
    uniforms: {
      uColor: { value: new THREE.Color(options.color ?? "#3BE1FF") },
      uIntensity: { value: options.intensity ?? 0.6 },
      uPower: { value: options.power ?? 3.8 },
      uAlpha: { value: options.alpha ?? 0.5 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: options.side ?? THREE.BackSide,
  });
}

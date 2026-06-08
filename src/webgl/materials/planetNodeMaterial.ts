/**
 * SerSan planet materials — TSL NodeMaterial port (WebGPU backend).
 *
 * FAITHFUL 1:1 port of the GLSL materials in `planetShader.ts`
 * (`createPlanetBodyMaterial`, `createRingMaterial`, `createAtmosphereMaterial`)
 * plus the orbital-trail material inlined in `HeroPlanet.tsx`. Mirrors the line
 * port (`lineNodeMaterial.ts`): on the WebGPU path (NEXT_PUBLIC_WEBGPU=1) the
 * renderer is `WebGPURenderer`, whose NodeBuilder rejects raw-GLSL
 * `ShaderMaterial` — so the GLSL planet renders as a black silhouette. TSL
 * NodeMaterials compile to WGSL (and to GLSL on a WebGL2 backend).
 *
 * The classic `WebGLRenderer` path (flag OFF) keeps using the GLSL materials;
 * this file is ONLY constructed when `webgpuEnabled()` is true (the only path
 * that ever imports `three/webgpu` — the dual-namespace pitfall).
 *
 * Parity contract: each material reproduces its GLSL counterpart's math
 * exactly. The hash/value-noise/FBM is ported node-for-node (the 4-tap FBM
 * loop is unrolled, matching the GLSL `for (int i=0;i<4;i++)` with a*=0.5,
 * p*=2.03). Uniform sets are structurally identical to the GLSL `.uniforms`
 * (same field names, each `{ value }`) so the per-frame writes in HeroPlanet
 * drive both material types with one shared path.
 *
 * TSL node names verified against the INSTALLED build via `require('three/tsl')`
 * / `require('three/webgpu')`: MeshBasicNodeMaterial, Color, Vector3,
 * AdditiveBlending, DoubleSide, BackSide (three/webgpu); Fn, uniform, uv,
 * positionLocal, normalView, positionView, sin, cos, abs, pow, mix, smoothstep,
 * floor, fract, dot, atan, max, float, vec2, vec3, normalize, Discard, varying
 * (three/tsl). `atan(y, x)` (two-arg form) verified to return a Node — the
 * atan2 equivalent for the ring's angular coordinate.
 */
import {
  Color,
  Vector3,
  MeshBasicNodeMaterial,
  AdditiveBlending,
  DoubleSide,
  BackSide,
  type Side,
  type Node,
} from "three/webgpu";
import {
  Fn,
  uniform,
  uv,
  positionLocal,
  normalView,
  positionView,
  sin,
  cos,
  abs,
  pow,
  mix,
  smoothstep,
  floor,
  fract,
  dot,
  atan,
  max,
  float,
  vec2,
  vec3,
  vec4,
  normalize,
  Discard,
  varying,
} from "three/tsl";

// === Shared procedural noise (port of NOISE_GLSL) ==========================
// hash21(p) = fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123).
const hash21 = Fn(([p]: [Node<"vec2">]) => {
  return fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453123));
});

// vnoise(p): bilinear-interpolated value noise with smoothstep weights.
const vnoise = Fn(([p]: [Node<"vec2">]) => {
  const i = floor(p).toVar();
  const f = fract(p).toVar();
  // f = f*f*(3 - 2f)
  const w = f.mul(f).mul(float(3.0).sub(f.mul(2.0))).toVar();
  const a = hash21(i);
  const b = hash21(i.add(vec2(1.0, 0.0)));
  const c = hash21(i.add(vec2(0.0, 1.0)));
  const d = hash21(i.add(vec2(1.0, 1.0)));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
});

// fbm(p): 4 octaves, a=0.5 halving, p*=2.03 each step (unrolled).
const fbm = Fn(([p0]: [Node<"vec2">]) => {
  const v = float(0.0).toVar();
  const a = float(0.5).toVar();
  const p = vec2(p0).toVar();
  // 4 unrolled octaves — matches the GLSL `for (int i=0;i<4;i++)`.
  for (let octave = 0; octave < 4; octave++) {
    v.addAssign(a.mul(vnoise(p)));
    p.mulAssign(2.03);
    a.mulAssign(0.5);
  }
  return v;
});

// === Gas-giant body =========================================================

export type PlanetBodyUniforms = {
  uTime: { value: number };
  uDeep: { value: Color };
  uBand: { value: Color };
  uCyan: { value: Color };
  uViolet: { value: Color };
  uLightDir: { value: Vector3 };
};

export function createPlanetBodyNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: PlanetBodyUniforms;
} {
  const uTime = uniform(0);
  const uDeep = uniform(new Color("#0a1526"));
  const uBand = uniform(new Color("#1d3a63"));
  const uCyan = uniform(new Color("#3BE1FF"));
  const uViolet = uniform(new Color("#7C5CFF"));
  const uLightDir = uniform(new Vector3(-0.55, 0.42, 0.72).normalize());

  const material = new MeshBasicNodeMaterial();

  material.colorNode = Fn(() => {
    const lat = uv().y;
    const lon = uv().x;

    // STRICTLY latitudinal striping. Longitude enters the noise ONLY through
    // cos/sin so the field is periodic (no UV seam).
    const cx = cos(float(6.28318).mul(lon));
    const sx = sin(float(6.28318).mul(lon));
    // warp = fbm(vec2(cx*2 + t*0.016, sx*2 + lat*6)) - 0.5
    const warp = fbm(
      vec2(
        cx.mul(2.0).add(uTime.mul(0.016)),
        sx.mul(2.0).add(lat.mul(6.0)),
      ),
    ).sub(0.5);
    // bands = fbm(vec2(t*0.012 + cx*0.8 + sx*0.5, (lat + warp*0.05) * 16))
    const bands = fbm(
      vec2(
        uTime.mul(0.012).add(cx.mul(0.8)).add(sx.mul(0.5)),
        lat.add(warp.mul(0.05)).mul(16.0),
      ),
    ).toVar();

    // Brand palette layering.
    const col = uDeep.rgb.toVar();
    col.assign(mix(col, uBand, smoothstep(0.34, 0.72, bands)));
    col.assign(
      mix(col, uCyan, pow(max(bands.sub(0.58), 0.0).mul(2.4), 2.0).mul(0.85)),
    );
    col.assign(
      mix(
        col,
        uViolet,
        pow(max(float(0.46).sub(bands), 0.0).mul(2.1), 2.1).mul(0.6),
      ),
    );

    // Day/night from the view-space key direction; soft terminator.
    // ndl = dot(normalize(vNormal), normalize(uLightDir)).
    const ndl = dot(normalize(normalView), normalize(uLightDir));
    const day = smoothstep(-0.32, 0.5, ndl);
    col.mulAssign(float(0.16).add(float(1.0).mul(day)));

    // Limb darkening — facing = abs(dot(normalize(vNormal), normalize(vView))),
    // vView = normalize(-mv.xyz). In TSL the view-space view vector toward the
    // camera is normalize(-positionView), so vView = normalize(positionView.negate()).
    const vView = normalize(positionView.negate());
    const facing = abs(dot(normalize(normalView), vView));
    col.mulAssign(float(0.5).add(float(0.5).mul(smoothstep(0.0, 0.5, facing))));

    return col;
  })();

  // Body is opaque (GLSL gl_FragColor alpha = 1.0); default material flags
  // (no transparency / additive) match the GLSL ShaderMaterial defaults.

  const uniforms: PlanetBodyUniforms = {
    uTime,
    uDeep,
    uBand,
    uCyan,
    uViolet,
    uLightDir,
  };
  return { material, uniforms };
}

// === Ring system ============================================================

export type RingUniforms = {
  uTime: { value: number };
  uOpacity: { value: number };
  uCyan: { value: Color };
  uViolet: { value: Color };
};

export function createRingNodeMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: RingUniforms;
} {
  const uTime = uniform(0);
  const uOpacity = uniform(0.72);
  const uCyan = uniform(new Color("#3BE1FF"));
  const uViolet = uniform(new Color("#7C5CFF"));

  const material = new MeshBasicNodeMaterial();

  // Soft band between a..b of the radial coordinate (GLSL `band()`).
  const band = Fn(
    ([x, a, b, s]: [Node<"float">, Node<"float">, Node<"float">, Node<"float">]) => {
      return smoothstep(a.sub(s), a.add(s), x).mul(
        float(1.0).sub(smoothstep(b.sub(s), b.add(s), x)),
      );
    },
  );

  // vPos = object-space position (annulus lives in XY before tilt). Pass it as a
  // varying so the fragment angular coordinate matches the GLSL `varying vec3 vPos`.
  const vPos = varying(positionLocal);

  // Single Fn computing rgb + alpha together (and the one early-discard) into a
  // vec4 — exactly the GLSL `gl_FragColor = vec4(col, prof*uOpacity)`. We then
  // feed `.xyz` to colorNode and `.w` to opacityNode; TSL caches the shared
  // sub-graph so `prof`/`Discard` evaluate once, not twice.
  const ringShade = Fn(() => {
    const r = uv().x; // 0 = inner edge, 1 = outer edge
    const ang = atan(vPos.y, vPos.x); // angular coordinate for grain

    // Saturn-like density profile.
    const prof = float(0.0).toVar();
    prof.addAssign(band(r, float(0.02), float(0.26), float(0.03)).mul(0.4));
    prof.addAssign(band(r, float(0.29), float(0.62), float(0.025)).mul(1.0));
    prof.addAssign(band(r, float(0.72), float(0.93), float(0.025)).mul(0.55));
    prof.addAssign(band(r, float(0.965), float(0.985), float(0.006)).mul(0.34));
    // Cassini gap.
    prof.mulAssign(
      float(1.0).sub(band(r, float(0.645), float(0.705), float(0.012)).mul(0.9)),
    );

    // Fine radial striations.
    prof.mulAssign(float(0.72).add(vnoise(vec2(r.mul(150.0), 0.0)).mul(0.28)));
    // Angular grain with a slow drift.
    prof.mulAssign(
      float(0.82).add(
        vnoise(vec2(ang.mul(26.0).add(uTime.mul(0.06)), r.mul(40.0))).mul(0.18),
      ),
    );

    Discard(prof.lessThan(0.01));

    // Cyan core → violet rim.
    const col = mix(uCyan, uViolet, smoothstep(0.12, 0.95, r)).toVec3().toVar();
    col.assign(
      mix(
        col,
        vec3(0.88, 0.97, 1.0),
        band(r, float(0.3), float(0.46), float(0.04)).mul(0.18),
      ),
    );
    col.mulAssign(
      float(0.3)
        .add(prof.mul(0.5))
        .add(band(r, float(0.31), float(0.5), float(0.035)).mul(0.22)),
    );

    // alpha = prof * uOpacity (GLSL gl_FragColor.a).
    return vec4(col, prof.mul(uOpacity));
  });

  const shade = ringShade();
  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.side = DoubleSide;

  const uniforms: RingUniforms = { uTime, uOpacity, uCyan, uViolet };
  return { material, uniforms };
}

// === Two-layer atmosphere ===================================================

export type AtmosphereUniforms = {
  uColor: { value: Color };
  uIntensity: { value: number };
  uPower: { value: number };
  uAlpha: { value: number };
};

export function createAtmosphereNodeMaterial(
  options: {
    color?: string;
    intensity?: number;
    power?: number;
    alpha?: number;
    side?: Side;
  } = {},
): {
  material: MeshBasicNodeMaterial;
  uniforms: AtmosphereUniforms;
} {
  const uColor = uniform(new Color(options.color ?? "#3BE1FF"));
  const uIntensity = uniform(options.intensity ?? 0.6);
  const uPower = uniform(options.power ?? 3.8);
  const uAlpha = uniform(options.alpha ?? 0.5);

  const material = new MeshBasicNodeMaterial();

  // Computed inside an Fn so `Discard` lands on the fragment build stack (see
  // the ring note). Returns vec4(col, alpha); `.xyz` → colorNode, `.w` → opacity.
  const shade = Fn(() => {
    // rim = pow(1 - abs(dot(normalize(vNormal), normalize(vView))), uPower).
    // vView = normalize(-mv.xyz) = normalize(positionView.negate()).
    const vView = normalize(positionView.negate());
    const rim = pow(
      float(1.0).sub(abs(dot(normalize(normalView), vView))),
      uPower,
    );
    const a = rim.mul(uAlpha);
    Discard(a.lessThan(0.004));

    // col = uColor * uIntensity * rim.
    return vec4(uColor.rgb.mul(uIntensity).mul(rim), a);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;
  material.side = options.side ?? BackSide;

  const uniforms: AtmosphereUniforms = { uColor, uIntensity, uPower, uAlpha };
  return { material, uniforms };
}

// === Orbital light trail (ported from HeroPlanet.tsx inline GLSL) ===========

export type TrailUniforms = {
  uColor: { value: Color };
  uTime: { value: number };
  uSpeed: { value: number };
  uFade: { value: number };
};

export function createTrailNodeMaterial(options: {
  color: string;
  time: number;
  speed: number;
}): {
  material: MeshBasicNodeMaterial;
  uniforms: TrailUniforms;
} {
  const uColor = uniform(new Color(options.color));
  const uTime = uniform(options.time);
  const uSpeed = uniform(options.speed);
  const uFade = uniform(1);

  const material = new MeshBasicNodeMaterial();

  // Computed inside an Fn so `Discard` lands on the fragment build stack (see
  // the ring note). Returns vec4(col, alpha); `.xyz` → colorNode, `.w` → opacity.
  const shade = Fn(() => {
    // phase = fract(vUv.x - uTime*uSpeed); head = pow(1 - phase, 7).
    const along = uv().x;
    const phase = fract(along.sub(uTime.mul(uSpeed)));
    const head = pow(float(1.0).sub(phase), 7.0);
    // intensity = 0.12 + head*2.6.
    const intensity = float(0.12).add(head.mul(2.6));
    // a = (0.10 + head) * uFade; discard a < 0.004.
    const a = float(0.1).add(head).mul(uFade);
    Discard(a.lessThan(0.004));

    // col = uColor * intensity.
    return vec4(uColor.rgb.mul(intensity), a);
  })();

  material.colorNode = shade.xyz;
  material.opacityNode = shade.w;

  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;
  material.side = DoubleSide;

  const uniforms: TrailUniforms = { uColor, uTime, uSpeed, uFade };
  return { material, uniforms };
}

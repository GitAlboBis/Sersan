/**
 * THE MARK, MACHINED.
 *
 * Not particles. The brand mark extruded from its own vector paths with a
 * real bevel, then shaded as a piece of dark optical glass: an environment
 * reflection, a hard anamorphic specular streak that sweeps across the faces
 * as it turns, and a cyan Fresnel rim that separates it from the black. The
 * two interlocking plates keep their brand identity — the upper one reads as
 * cold white glass, the lower one as deep brand blue.
 *
 * Everything is a pure function of the frame; `sweep` drives the streak.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { envTexture } from "./envTexture";

type GroupProps = ThreeElements["group"];

const MARK_TOP =
  "M 81.19 0 L 162.38 46.88 L 127.3 67.13 L 81.19 40.51 L 39.64 64.49 L 39.64 90.03 L 80.11 113.4 L 40.6 136.21 L 0 112.78 L 0 46.88 Z";
const MARK_BOTTOM =
  "M 81.19 200 L 0 153.13 L 35.08 132.87 L 81.19 159.49 L 122.73 135.51 L 122.73 109.97 L 82.27 86.6 L 121.78 63.79 L 162.38 87.22 L 162.38 153.13 Z";
const MARK_W = 162.38;
const MARK_H = 200;

const VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vLocal;
  void main() {
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vLocal = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uEnv;
  uniform vec3 uBase;
  uniform vec3 uRim;
  uniform float uSweep;
  uniform float uRimGain;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vLocal;

  vec2 dirToUv(vec3 d) {
    d = normalize(d);
    return vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5);
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 3.2);

    // Dark optical glass: the body is almost black and nearly everything you
    // see is reflected light. That inversion is what separates glass from
    // plastic — a lit body reads as paint, a dark body reads as a surface.
    vec3 R = reflect(-V, N);
    vec3 refl = texture2D(uEnv, dirToUv(R)).rgb;
    vec3 reflBlur = texture2D(uEnv, dirToUv(normalize(R + N * 0.35))).rgb;
    vec3 col = uBase * (0.10 + 0.18 * ndv);
    col += mix(reflBlur, refl, 0.65) * (0.55 + 1.5 * fres);

    // two hard lobes give the bevels something to catch
    vec3 k1 = normalize(vec3(0.42, 0.62, 0.66));
    vec3 k2 = normalize(vec3(-0.55, 0.3, 0.78));
    col += vec3(0.92, 0.97, 1.0) * pow(max(dot(N, k1), 0.0), 46.0) * 1.5;
    col += uRim * pow(max(dot(N, k2), 0.0), 26.0) * 0.5;

    // anamorphic streak: a hard band of light travelling across the faces
    float band = vLocal.x * 0.55 + vLocal.y * 0.83;
    float s = 1.0 - min(abs(band - uSweep) / 0.26, 1.0);
    float streak = pow(s, 4.0);
    col += vec3(0.88, 0.97, 1.0) * streak * 2.1 * (0.25 + 0.75 * ndv);

    // the edge that separates it from the black
    float edge = smoothstep(0.55, 1.0, fres);
    col += uRim * (fres * uRimGain + edge * 0.9);
    col += uRim * uGlow * 0.08;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

const buildGeo = (path: string, height: number, depth: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_W} ${MARK_H}"><path d="${path}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = SVGLoader.createShapes(data.paths[0]);
  const scale = height / MARK_H;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: depth / scale,
    bevelEnabled: true,
    bevelThickness: 3.0,
    bevelSize: 2.4,
    bevelSegments: 5,
    curveSegments: 4,
  });
  geo.applyMatrix4(
    new THREE.Matrix4().makeScale(scale, -scale, scale).setPosition((-MARK_W / 2) * scale, (MARK_H / 2) * scale, 0),
  );
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
};

const Plate: React.FC<{ geo: THREE.BufferGeometry; base: string; rim: string; sweep: number; rimGain: number; opacity: number; glow: number; z: number }> = ({
  geo,
  base,
  rim,
  sweep,
  rimGain,
  opacity,
  glow,
  z,
}) => {
  const tex = envTexture();
  const uniforms = useMemo(
    () => ({
      uEnv: { value: tex },
      uBase: { value: new THREE.Color(base) },
      uRim: { value: new THREE.Color(rim) },
      uSweep: { value: 0 },
      uRimGain: { value: 1 },
      uOpacity: { value: 1 },
      uGlow: { value: 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tex],
  );
  return (
    <mesh geometry={geo} position={[0, 0, z]}>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        uniforms-uSweep-value={sweep}
        uniforms-uRimGain-value={rimGain}
        uniforms-uOpacity-value={opacity}
        uniforms-uGlow-value={glow}
        transparent={opacity < 1}
      />
    </mesh>
  );
};

export const SolidMark: React.FC<
  GroupProps & {
    height?: number;
    depth?: number;
    /** position of the travelling specular band, in local units */
    sweep?: number;
    rimGain?: number;
    glow?: number;
    opacity?: number;
    /** pushes the two plates apart in depth so the interlock reads */
    split?: number;
  }
> = ({ height = 2.6, depth = 0.3, sweep = 0, rimGain = 1.1, glow = 1, opacity = 1, split = 0.06, ...group }) => {
  const geos = useMemo(
    () => ({ top: buildGeo(MARK_TOP, height, depth), bottom: buildGeo(MARK_BOTTOM, height, depth) }),
    [height, depth],
  );
  return (
    <group {...group}>
      <Plate geo={geos.top} base="#2b3f57" rim="#EAF6FF" sweep={sweep} rimGain={rimGain} opacity={opacity} glow={glow} z={split} />
      <Plate geo={geos.bottom} base="#0b2a5e" rim="#3BE1FF" sweep={sweep} rimGain={rimGain * 1.25} opacity={opacity} glow={glow} z={-split} />
    </group>
  );
};
/**
 * CONVERGE — the close. Everything in the volume is drawn toward one point of
 * light on the -Z axis ahead of the camera.
 *
 * Every streak is a segment of the ray from its own seeded start position to
 * the SAME focal point, so the field has one vanishing point and the frame
 * resolves instead of just moving. `focus` (0..1) slides each streak's leading
 * end up its ray toward the point and shortens it at the same time — the two
 * together are what separate "arrival" from "warp tunnel": a warp reads as
 * constant-length streaks scrolling past, this reads as a field being drained
 * into a single place.
 *
 * Drawn as ONE lineSegments (two vertices per streak, both carrying the same
 * ray and differing only in `aAlong`). Tried billboarded quads first for
 * thickness — 4x the geometry for a look that is worse at this scale, because
 * a 1px additive hairline is exactly what a light streak looks like once bloom
 * has been over it.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { rng, onSphere } from "./rng";

type GroupProps = ThreeElements["group"];

const LINE_VERT = /* glsl */ `
  attribute vec3 aDir;     // unit vector from start toward the focal point
  attribute float aDist;   // distance start -> focal point
  attribute float aAlong;  // 0 = trailing end, 1 = leading (focal) end
  attribute float aLen;    // base length as a fraction of the ray
  attribute float aHead;   // where the leading end sits at focus = 0
  attribute float aSeed;
  uniform float uTime;
  uniform float uFocus;
  uniform float uCreep;
  varying float vAlong;
  varying float vHead;
  varying float vFade;
  void main() {
    // Smoothstep the driver: a linear focus makes the pull start and stop with
    // a visible jerk because the eye tracks the leading ends, not the field.
    float f = uFocus * uFocus * (3.0 - 2.0 * uFocus);

    // Slow unwrapped drift so the field is never frozen while focus is held.
    // Deliberately NOT wrapped with fract(): a wrap pops a streak from the
    // point back to the rim, which is the one motion that would break the read.
    // It saturates at the head clamp instead, which is the arrival we want.
    // CLAMPED. Unwrapped, this saturates the head clamp about 8 s in, and from
    // there every streak collapses onto the point and the field vanishes —
    // which is exactly what it did in a 32 s film.
    float creep = min(uTime * uCreep, 0.10) * (0.6 + 0.8 * aSeed);

    // 0.985, not 1.0: leaving a sliver keeps the leading ends just short of the
    // sprite so the point still looks like a source, not a pincushion of lines.
    float head = clamp(aHead + creep + f * (1.0 - aHead) * 0.94, 0.0, 0.985);

    // Shorten twice over: once from focus, once from proximity to the point.
    // The second term is what makes the far end look like it is being absorbed.
    float len = aLen * (1.0 - 0.34 * f) * (1.0 - 0.3 * head);
    float tail = max(head - len, 0.0);

    float t = mix(tail, head, aAlong);
    vec3 p = position + aDir * (t * aDist);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Segments that end up right on the lens smear across the whole frame as
    // the camera passes through the cloud; dim them out over ~2 units instead.
    vFade = smoothstep(0.35, 2.4, -mv.z);
    vAlong = aAlong;
    vHead = head;
    gl_Position = projectionMatrix * mv;
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlong;
  varying float vHead;
  varying float vFade;
  void main() {
    // Steep, not linear: pow 3.4 keeps the trailing 60% of each streak as a
    // faint filament and puts nearly all the light in the last few percent, so
    // the field reads as pouring into the point rather than as a bundle of rods.
    float grad = pow(vAlong, 1.9);
    vec3 blue = vec3(0.165, 0.498, 1.0);  // #2A7FFF
    vec3 cyan = vec3(0.231, 0.882, 1.0);  // #3BE1FF
    vec3 white = vec3(0.918, 0.965, 1.0); // #EAF6FF
    vec3 col = mix(blue, cyan, smoothstep(0.0, 0.7, vAlong));
    col = mix(col, white, grad * 0.85);
    col.r = min(col.r, col.g); // hard guard: this ramp must never drift warm
    float a = (0.30 + 0.95 * grad) * (0.5 + 0.5 * vHead) * vFade * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

const POINT_VERT = /* glsl */ `
  attribute float aSize;
  uniform float uScale;
  uniform float uFocus;
  uniform float uTime;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Breathing is 3% — anything more and the "resolution" beat feels nervous.
    float swell = (0.18 + 0.9 * uFocus) * (1.0 + 0.03 * sin(uTime * 1.1));
    float px = aSize * swell * uScale / max(-mv.z, 0.05);
    // Hard ceiling: as the camera closes on the point 1/z runs away and the
    // sprite becomes a full-screen white card one frame before it is culled.
    gl_PointSize = min(px, uScale * 30.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uFocus;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float e = smoothstep(1.0, 0.0, d);
    float core = pow(e, 7.0);   // tight, blows out to white
    float halo = pow(e, 1.7);   // wide, stays cyan — a source, not a disc
    vec3 col = mix(vec3(0.231, 0.882, 1.0), vec3(0.918, 0.965, 1.0), core);
    col.r = min(col.r, col.g);
    gl_FragColor = vec4(col, (core + halo * 0.34) * (0.22 + 0.78 * uFocus) * uOpacity);
  }
`;

export const Converge: React.FC<
  GroupProps & {
    time: number;
    /** 0..1 — pulls every streak in toward the point and brightens it */
    focus: number;
    viewportHeight: number;
    count?: number;
    opacity?: number;
    seed?: number;
    /** radius of the cloud the streaks start in */
    spread?: number;
    /** distance of the focal point down -Z from this group's origin */
    depth?: number;
  }
> = ({
  time,
  focus,
  viewportHeight,
  count = 900,
  opacity = 1,
  seed = 11,
  spread = 9,
  depth = 26,
  ...group
}) => {
  const geometry = useMemo(() => {
    const r = rng(seed);
    const n = count * 2;
    const pos = new Float32Array(n * 3);
    const dir = new Float32Array(n * 3);
    const dist = new Float32Array(n);
    const along = new Float32Array(n);
    const len = new Float32Array(n);
    const head = new Float32Array(n);
    const seeds = new Float32Array(n);
    const target = new THREE.Vector3(0, 0, -depth);
    const s = new THREE.Vector3();
    const d = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const [ux, uy, uz] = onSphere(r);
      // Bias the radius outward (pow 0.45) — a uniform ball crowds the axis and
      // buries the focal sprite behind a haze of near-axial streaks.
      const rad = spread * (0.34 + 0.66 * Math.pow(r(), 0.45));
      // z stretched 1.7x: the cloud has to be a corridor volume, not a ball, or
      // the camera clears it in half a second on the way to the point.
      s.set(ux * rad, uy * rad * 0.78, uz * rad * 1.7);
      d.subVectors(target, s);
      const L = d.length();
      d.divideScalar(L);
      const a = i * 2;
      const b = a + 1;
      for (const k of [a, b]) {
        pos[k * 3] = s.x;
        pos[k * 3 + 1] = s.y;
        pos[k * 3 + 2] = s.z;
        dir[k * 3] = d.x;
        dir[k * 3 + 1] = d.y;
        dir[k * 3 + 2] = d.z;
        dist[k] = L;
        // fraction of the ray, so streaks near the point are not absurdly long
        len[k] = 0.16 + 0.2 * r();
        head[k] = r() * 0.3;
        seeds[k] = r();
      }
      // Both endpoints must agree on len/head/seed or the segment tears; the
      // loop above draws fresh randoms per vertex, so overwrite b from a.
      len[b] = len[a];
      head[b] = head[a];
      seeds[b] = seeds[a];
      along[a] = 0;
      along[b] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    geo.setAttribute("aDist", new THREE.BufferAttribute(dist, 1));
    geo.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
    geo.setAttribute("aLen", new THREE.BufferAttribute(len, 1));
    geo.setAttribute("aHead", new THREE.BufferAttribute(head, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    // Positions are only the ray origins; the shader pushes vertices as far as
    // the focal point, so the bounds have to cover the whole corridor by hand.
    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, -depth * 0.5),
      spread * 1.8 + depth * 0.6,
    );
    return geo;
  }, [count, seed, spread, depth]);

  const pointGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, -depth]), 3),
    );
    geo.setAttribute(
      "aSize",
      new THREE.BufferAttribute(new Float32Array([26]), 1),
    );
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -depth), 1);
    return geo;
  }, [depth]);

  const lineUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uCreep: { value: 0.032 },
      uOpacity: { value: 1 },
    }),
    [],
  );
  const pointUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uScale: { value: 1 },
      uOpacity: { value: 1 },
    }),
    [],
  );

  return (
    <group {...group}>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={LINE_VERT}
          fragmentShader={LINE_FRAG}
          uniforms={lineUniforms}
          uniforms-uTime-value={time}
          uniforms-uFocus-value={focus}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <points geometry={pointGeometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={POINT_VERT}
          fragmentShader={POINT_FRAG}
          uniforms={pointUniforms}
          uniforms-uTime-value={time}
          uniforms-uFocus-value={focus}
          uniforms-uScale-value={viewportHeight * 0.012}
          uniforms-uOpacity-value={opacity}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

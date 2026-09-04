/**
 * DustStream — the film's "travelling" beat: nothing but speed and depth.
 *
 * A cylindrical volume of fine motes streaming toward the lens. Every mote's
 * z is `fract(phase + time * speed)` remapped across the tube, so the field
 * loops forever with no seam: the phases are uniformly distributed, so motes
 * wrap one at a time at the far end rather than as a sheet, and a longitudinal
 * fade hides the wrap itself.
 *
 * The whole effect lives in the near/far ratio — motes close to the lens are
 * bigger, brighter and visibly STREAKED, distant ones are round pinpricks.
 * The streak is computed as real screen-space motion blur (see VERT), not as a
 * fixed vertical smear: motes near the vanishing point stay round no matter how
 * close they are, motes at the frame edge rip past. That radial gradient is
 * what the eye reads as "fast", and a uniform smear never sells it.
 *
 * Rejected: a per-mote lateral sway. At 5–8x stretch it reads as wobbling hair,
 * not dust. Dead-straight travel is what sells the speed.
 */
import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";
import { rng } from "./rng";

type GroupProps = ThreeElements["group"];

const VERT = /* glsl */ `
  attribute float aPhase;   // start position along the tube, [0,1)
  attribute float aRate;    // per-mote speed multiplier — kills the "rigid grid" look
  attribute float aSize;
  attribute vec3  aColor;
  uniform float uTime;
  uniform float uScale;
  uniform float uSpeed;     // tube-lengths per second
  uniform float uLength;
  uniform float uStreak;
  uniform float uNear;      // depth at which a mote has fully faded into the lens
  uniform float uProxFar;   // depth at which "near the lens" brightness has died
  varying float vAlpha;
  varying float vStretch;
  varying vec2  vDir;       // unit direction of travel, in square screen space
  varying vec3  vColor;

  void main() {
    // fract() is the whole loop. Motes run from the far end (u=0, -z) toward
    // and past the lens (u=1, +z); wrapping is invisible because u=1 is behind
    // the camera and both ends are faded out below.
    float u = fract(aPhase + uTime * uSpeed * aRate);
    vec3 p = vec3(position.xy, (u - 0.5) * uLength);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = max(-mv.z, 0.05);

    // Screen-space motion blur, done honestly: project the mote and the point
    // it will occupy one 30fps frame later, and take the delta. This survives
    // camera roll and an off-axis look-at, which a "streak along screen Y" or a
    // "streak radially from centre" shortcut both get wrong the moment the rig
    // tilts. It ignores the CAMERA's own travel (we can't see it from here), so
    // the caller trims with the streak prop when flying fast.
    vec4 clipA = projectionMatrix * mv;
    vec4 clipB = projectionMatrix * (modelViewMatrix * vec4(p + vec3(0.0, 0.0, uLength * uSpeed * aRate * 0.0333), 1.0));
    // P[1][1]/P[0][0] is the aspect ratio of any standard perspective matrix —
    // cheaper and less error-prone than plumbing a viewport-width prop through.
    float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
    vec2 d = vec2((clipB.x / max(clipB.w, 1e-4) - clipA.x / max(clipA.w, 1e-4)) * aspect,
                   clipB.y / max(clipB.w, 1e-4) - clipA.y / max(clipA.w, 1e-4));
    float m = length(d);
    // 26.0 maps a mote that crosses a quarter of the frame per frame to ~7x.
    // In practice m tops out near 0.3 at the near frame edge; past ~9x a mote
    // stops reading as a mote and becomes a drawn line, so it is clamped there.
    vStretch = clamp(1.0 + uStreak * m * 26.0, 1.0, 9.0);
    vDir = m > 1e-5 ? d / m : vec2(0.0, 1.0);

    // Perspective-correct size, then grown by the stretch so the streak has
    // quad to live in; the fragment keeps the across-axis width constant.
    // The 90px ceiling is pure fill-rate insurance for a mote that grazes the
    // lens — additive overdraw at that size costs more than it shows.
    gl_PointSize = min(aSize * vStretch * uScale / depth, 90.0);
    gl_Position = clipA;

    // Fade in at the far end, out as it reaches the lens, and again in the last
    // half-metre so nothing smears across the whole frame on the way past.
    float lengthwise = smoothstep(0.0, 0.10, u) * (1.0 - smoothstep(0.88, 1.0, u));
    vAlpha = lengthwise * smoothstep(0.0, uNear, depth);

    // Near motes are hotter. Squared so the boost stays a near-lens event
    // instead of lifting the whole volume into milk.
    float prox = 1.0 - smoothstep(0.0, uProxFar, depth);
    vColor = aColor * (0.55 + 1.15 * prox * prox);
  }
`;

const FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vStretch;
  varying vec2  vDir;
  varying vec3  vColor;

  void main() {
    // gl_PointCoord is y-down; flip it so the frame matches the NDC-derived
    // vDir. (An ellipse is symmetric, but a mirrored axis still points wrong.)
    vec2 q = vec2(gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y);
    float along  = dot(q, vDir);
    float across = dot(q, vec2(-vDir.y, vDir.x));
    // Multiplying only the across-axis by vStretch shrinks the mote's width to
    // 1/stretch of a quad that already grew by stretch — so the streak gets
    // longer in pixels while staying the same number of pixels thick.
    float dd = 2.0 * length(vec2(along, across * vStretch));
    if (dd > 1.0) discard;
    float a = pow(smoothstep(1.0, 0.0, dd), 2.0);
    // Partial energy normalisation. Full 1/stretch makes the fast motes vanish
    // exactly when they should be the loudest; none at all turns the frame
    // edges into solid bars. 0.35 is where it reads fast rather than blown out.
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity / pow(vStretch, 0.35));
  }
`;

export const DustStream: React.FC<
  GroupProps & {
    time: number;
    viewportHeight: number;
    count?: number;
    length?: number;
    radius?: number;
    /** tube-lengths travelled per second; 0.35 ≈ one full traverse in 2.9s */
    speed?: number;
    opacity?: number;
    seed?: number;
    /** multiplier on the motion-blur streak; 0 = round motes */
    streak?: number;
  }
> = ({
  time,
  viewportHeight,
  count = 2800,
  length = 64,
  radius = 9,
  speed = 0.35,
  opacity = 1,
  seed = 17,
  streak = 1,
  ...group
}) => {
  // Structural only — never `time`. Every per-frame value is a uniform.
  const geometry = useMemo(() => {
    const r = rng(seed);
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const rate = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color("#3BE1FF");
    const blue = new THREE.Color("#2A7FFF");
    const hot = new THREE.Color("#EAF6FF");
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // pow(x, 0.42) instead of the area-uniform sqrt: it pushes motes outward,
      // leaving the middle of frame — where the mark and the type live in the
      // neighbouring beats — clear, and it puts more motes where the streaks
      // actually happen.
      const rad = radius * Math.pow(r(), 0.42);
      const th = 2 * Math.PI * r();
      pos[i * 3] = Math.cos(th) * rad;
      pos[i * 3 + 1] = Math.sin(th) * rad;
      pos[i * 3 + 2] = 0; // z is authored entirely on the GPU from aPhase
      phase[i] = r();
      rate[i] = 0.7 + r() * 0.65;
      sizes[i] = 0.9 + r() * r() * 2.2; // mostly fine, a few carriers
      const k = r();
      if (k < 0.04)
        tmp.copy(hot); // the few hot-white specks that give it grain
      else tmp.copy(cyan).lerp(blue, Math.pow(r(), 0.8));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geo.setAttribute("aRate", new THREE.BufferAttribute(rate, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    // The CPU copy is a flat disc, so the computed bounds would be wrong and the
    // field would pop out the moment the camera entered it. State the real tube.
    geo.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      Math.hypot(radius, length * 0.5),
    );
    return geo;
  }, [count, length, radius, seed]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 1 },
      uOpacity: { value: 1 },
      uSpeed: { value: 0 },
      uLength: { value: 1 },
      uStreak: { value: 1 },
      uNear: { value: 1 },
      uProxFar: { value: 1 },
    }),
    [],
  );

  return (
    <group {...group}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          uniforms-uTime-value={time}
          uniforms-uScale-value={viewportHeight * 0.012}
          uniforms-uOpacity-value={opacity}
          uniforms-uSpeed-value={speed}
          uniforms-uLength-value={length}
          uniforms-uStreak-value={streak}
          uniforms-uNear-value={Math.max(0.4, radius * 0.09)}
          uniforms-uProxFar-value={length * 0.25}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

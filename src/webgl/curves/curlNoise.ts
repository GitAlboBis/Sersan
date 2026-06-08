/**
 * CPU-side curl-noise streamline generator for the faint CurlTubeField
 * (ANALISI_LUSION §3.2 option C — the "curly tubes" signature, shipped FAINT
 * and full-tier-only behind the content).
 *
 * Everything here is plain deterministic JS so the field is:
 *   - cheap (built ONCE in a useMemo, then merged into one geometry),
 *   - reproducible (a fixed seed → the same streamlines every build, so there
 *     is no flicker on a route re-curve or resize),
 *   - backend-agnostic (the geometry is identical on the GLSL/WebGL2 and
 *     TSL/WebGPU paths; only the MATERIAL differs).
 *
 * Curl noise is the curl of a 3D noise potential field, which is
 * divergence-free by construction → the streamlines never converge to a sink
 * or diverge from a source, so they read as smooth, organic, volume-preserving
 * flow (the look Lusion's tubes have). We use a small value-noise potential and
 * approximate its curl by finite differences — no external noise dependency,
 * a few sin/dot ALU per sample, plenty smooth for tube centerlines.
 */
import * as THREE from "three";

/** A tiny deterministic hash → pseudo-random in [0,1) from an integer-ish key. */
function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smootherstep-interpolated 3D value noise in roughly [-1, 1]. */
function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  // Smootherstep weights (C2-continuous → no creases in the streamlines).
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);

  // 8 lattice corners, hashed from their integer coordinates.
  const corner = (cx: number, cy: number, cz: number) =>
    hash(cx * 127.1 + cy * 311.7 + cz * 74.7);

  const c000 = corner(xi, yi, zi);
  const c100 = corner(xi + 1, yi, zi);
  const c010 = corner(xi, yi + 1, zi);
  const c110 = corner(xi + 1, yi + 1, zi);
  const c001 = corner(xi, yi, zi + 1);
  const c101 = corner(xi + 1, yi, zi + 1);
  const c011 = corner(xi, yi + 1, zi + 1);
  const c111 = corner(xi + 1, yi + 1, zi + 1);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const x00 = lerp(c000, c100, u);
  const x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u);
  const x11 = lerp(c011, c111, u);
  const y0 = lerp(x00, x10, v);
  const y1 = lerp(x01, x11, v);
  // Map [0,1] → [-1,1].
  return lerp(y0, y1, w) * 2 - 1;
}

/** A 3-component noise potential, each channel offset so they decorrelate. */
function potential(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.set(
    valueNoise(p.x, p.y, p.z),
    valueNoise(p.y + 31.4, p.z - 17.2, p.x + 5.1),
    valueNoise(p.z - 42.7, p.x + 9.3, p.y - 23.8),
  );
  return out;
}

// Scratch vectors for the finite-difference curl — module-level so the
// integrator allocates nothing per step.
const _pdx = new THREE.Vector3();
const _pdy = new THREE.Vector3();
const _pdz = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _scaled = new THREE.Vector3();

/**
 * Divergence-free curl-noise velocity at world point `p` (scaled by `freq`).
 * curl(F) = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy), via central
 * finite differences of the vector potential. Written into `out`.
 */
function curlNoise(
  p: THREE.Vector3,
  freq: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const e = 0.1; // finite-difference epsilon (in noise space)
  _scaled.copy(p).multiplyScalar(freq);

  // dF/dx
  potential(_a.copy(_scaled).setX(_scaled.x + e), _pdx);
  potential(_b.copy(_scaled).setX(_scaled.x - e), _b);
  _pdx.sub(_b).divideScalar(2 * e);
  // dF/dy
  potential(_a.copy(_scaled).setY(_scaled.y + e), _pdy);
  potential(_b.copy(_scaled).setY(_scaled.y - e), _b);
  _pdy.sub(_b).divideScalar(2 * e);
  // dF/dz
  potential(_a.copy(_scaled).setZ(_scaled.z + e), _pdz);
  potential(_b.copy(_scaled).setZ(_scaled.z - e), _b);
  _pdz.sub(_b).divideScalar(2 * e);

  out.set(
    _pdy.z - _pdz.y,
    _pdz.x - _pdx.z,
    _pdx.y - _pdy.x,
  );
  return out;
}

export interface StreamlineOptions {
  /** Number of streamlines to integrate. */
  count: number;
  /** Integration steps per streamline (polyline vertex count = steps + 1). */
  steps: number;
  /** World-space step length per integration step. */
  step: number;
  /** Noise frequency (higher = curlier). */
  freq: number;
  /** Half-extents of the seed box {x,y,z}; seeds are uniform inside it. */
  half: { x: number; y: number; z: number };
  /** Center of the seed box (the field sits around here). */
  center: { x: number; y: number; z: number };
  /** Deterministic seed so the same field is rebuilt every time. */
  seed?: number;
}

/**
 * Integrate `count` curl-noise streamlines and return one CatmullRomCurve3 per
 * line. Each streamline starts at a deterministic seed point in the box and
 * steps p += normalize(curlNoise(p)) * step for `steps` iterations.
 *
 * Deterministic: the same options → the same curves (a fixed PRNG seeded by
 * `seed`), so rebuilds (resize / route re-curve) never reshuffle the field.
 */
export function buildCurlStreamlines(
  opts: StreamlineOptions,
): THREE.CatmullRomCurve3[] {
  const { count, steps, step, freq, half, center } = opts;
  let rngState = (opts.seed ?? 1) * 9973 + 1;
  // Deterministic LCG-ish PRNG (no Math.random → reproducible field).
  const rand = () => {
    rngState = (rngState * 1664525 + 1013904223) % 4294967296;
    return rngState / 4294967296;
  };

  const vel = new THREE.Vector3();
  const curves: THREE.CatmullRomCurve3[] = [];

  for (let i = 0; i < count; i++) {
    const p = new THREE.Vector3(
      center.x + (rand() * 2 - 1) * half.x,
      center.y + (rand() * 2 - 1) * half.y,
      center.z + (rand() * 2 - 1) * half.z,
    );
    const pts: THREE.Vector3[] = [p.clone()];
    for (let s = 0; s < steps; s++) {
      curlNoise(p, freq, vel);
      const len = vel.length();
      if (len < 1e-5) {
        // Degenerate (rare) — nudge so the polyline never collapses.
        vel.set(0, 1, 0);
      } else {
        vel.divideScalar(len);
      }
      p.addScaledVector(vel, step);
      pts.push(p.clone());
    }
    // centripetal CatmullRom keeps the tube from looping/self-intersecting at
    // tight curl bends — same parameterization the signature line uses.
    curves.push(new THREE.CatmullRomCurve3(pts, false, "centripetal"));
  }

  return curves;
}

/**
 * Runtime-generated textures for the /audit black-hole hero (AuditSingularity).
 *
 * LICENSE NOTE (the reason this file exists): the study reference for the
 * raymarch shipped two bitmap assets (a tiling RGB noise PNG driving the disc
 * filaments and an equirect nebula/starfield PNG the bent rays sample). No
 * license was found on that repo, so we ship NEITHER — both textures are
 * generated here at mount time, in our own code, in the SERSAN palette.
 *
 * Both generators are plain-THREE + Canvas2D (no three/webgpu, no TSL), so
 * this module is safe to import from the lazily-loaded material builder
 * without dragging any heavy namespace into a bundle that shouldn't have it.
 * Client-only by construction (document/canvas): only ever called from the
 * island's webgpuEnabled()-gated build effect.
 */
import * as THREE from "three";

/**
 * Deterministic [0,1) PRNG (mulberry32) — a stable sky/noise across mounts
 * and HMR, so the lead tunes against the same texture every reload.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic lattice hash on WRAPPED integer coordinates → [0,1). */
function latticeHash(ix: number, iy: number, period: number, seed: number): number {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Periodic value noise at (u,v) ∈ [0,1)² with an integer lattice `period`.
 * Because the lattice hash wraps at `period`, the field tiles SEAMLESSLY by
 * construction — no edge blending pass needed.
 */
function periodicValueNoise(
  u: number,
  v: number,
  period: number,
  seed: number,
): number {
  const x = u * period;
  const y = v * period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  // Smoothstep fade (the classic value-noise interpolant).
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = latticeHash(x0, y0, period, seed);
  const b = latticeHash(x0 + 1, y0, period, seed);
  const c = latticeHash(x0, y0 + 1, period, seed);
  const d = latticeHash(x0 + 1, y0 + 1, period, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * The tileable RGB disc-noise texture (stand-in for the reference's
 * `noise_deep.png`). Three INDEPENDENT channels — the raymarch weights R/G/B
 * by three parallel z-band parabolas, so decorrelated channels are what give
 * the disc its layered filament structure. 3 octaves of periodic value noise
 * per channel, then a per-channel min-max stretch to the full [0,1] range so
 * the filament thresholds (0.780 / 0.750 in the shader) actually get crossed
 * with contrast comparable to a typical baked noise bitmap.
 */
export function createDiscNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const channel = new Float32Array(size * size);

  // Octave periods must divide `size`'s lattice evenly to stay seamless —
  // they do by construction (the hash wraps at each octave's own period).
  const octaves: Array<{ period: number; amp: number }> = [
    { period: 4, amp: 1.0 },
    { period: 8, amp: 0.5 },
    { period: 16, amp: 0.25 },
  ];

  for (let ch = 0; ch < 3; ch++) {
    const seed = 17 + ch * 101;
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        let n = 0;
        let ampSum = 0;
        for (const { period, amp } of octaves) {
          n += periodicValueNoise(u, v, period, seed + period) * amp;
          ampSum += amp;
        }
        n /= ampSum;
        const i = y * size + x;
        channel[i] = n;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
    // Full-range stretch: the octave sum concentrates around 0.5; without the
    // stretch the shader's 0.75+ filament band would almost never light.
    const inv = 1 / Math.max(max - min, 1e-6);
    for (let i = 0; i < size * size; i++) {
      data[i * 4 + ch] = Math.round(
        THREE.MathUtils.clamp((channel[i] - min) * inv, 0, 1) * 255,
      );
    }
  }
  for (let i = 0; i < size * size; i++) data[i * 4 + 3] = 255;

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  // Deliberately NO colorSpace tag: the raymarch does its own sRGB↔linear
  // round-trip (Blender-parity), so samples must arrive untransformed.
  tex.needsUpdate = true;
  return tex;
}

/**
 * The equirect starfield the bent rays sample (stand-in for the reference's
 * nebula PNG) — the gravitational lensing IS this texture being fetched with
 * a curved direction, so it must exist even though the base is near-navy.
 *
 * Palette: #050a14 base (a hair darker than the page navy so the sphere's
 * residual-transparency disc reads as depth, not a grey cutout), ~900 stars
 * with the preloader's colour distribution (72% off-white, 18% cyan #3BE1FF,
 * 10% blue #2A7FFF), and two faint radial nebula glows in the same hues.
 */
export function createStarfieldTexture(
  width = 2048,
  height = 1024,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Base void.
    ctx.fillStyle = "#050a14";
    ctx.fillRect(0, 0, width, height);

    // Two faint nebula glows (cyan + blue), radial falloff to transparent.
    const nebula = (
      cx: number,
      cy: number,
      r: number,
      rgba: string,
    ): void => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, rgba);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };
    nebula(width * 0.3, height * 0.42, width * 0.22, "rgba(59, 225, 255, 0.05)");
    nebula(width * 0.7, height * 0.6, width * 0.19, "rgba(42, 127, 255, 0.04)");

    // Stars — deterministic sky, preloader colour distribution.
    const rand = mulberry32(0x5e45a11);
    const STAR_COUNT = 900;
    const drawStar = (x: number, y: number, r: number, fill: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const pick = rand();
      const color =
        pick < 0.72
          ? "#e8eef6" // off-white
          : pick < 0.9
            ? "#3BE1FF" // cyan
            : "#2A7FFF"; // blue
      const r = 0.4 + rand() * 0.9;
      const alpha = 0.35 + rand() * 0.65;
      drawStar(x, y, r, color, alpha);
      // A few of the brightest get a soft halo so bloom has sparkle to find.
      if (rand() < 0.05) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Wrap the horizontal seam: equirect u wraps, so a star near an edge is
      // re-drawn shifted a full width to keep the seam invisible.
      if (x < 6) drawStar(x + width, y, r, color, alpha);
      if (x > width - 6) drawStar(x - width, y, r, color, alpha);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; // equirect u wraps at the seam
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  // Same colorSpace discipline as the noise texture (shader owns conversion).
  return tex;
}

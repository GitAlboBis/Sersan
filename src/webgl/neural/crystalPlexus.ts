/**
 * crystalPlexus — the igloo constellation net around the HEALTHY crystal
 * (ROUND 7-2b §B-c, research/2026-08-22-round7-stones-v2-anatomy.md).
 *
 * RESTRAINT (spec recommendation, owner-visible): healthy crystal ONLY, and
 * small — broken already carries shards + chips + the fracture field; the
 * neural constellation provides the ambient linework. Lite tier: not mounted.
 *
 * Igloo's sF/ZL/$L construction (§A4), scaled to PLEXUS_POINTS = 12:
 *   - points on a vertical cylinder (radius jittered ×[0.8,1]), y treadmill
 *     over 3 crystal units; drift law verbatim — orbit (rand−.5)·.5 rad/s,
 *     xz wobble ±.1·sin(t·.5+seed), climb rand·.25/s wrapped;
 *   - connections: candidates within dist < 3, Fisher-Yates SHUFFLED (random
 *     pick, NOT nearest-first), max 3/point, 0.35 s LINEAR connect/disconnect
 *     tweens; a line draws from pt1 toward lerp(pt1, pt2, progress);
 *   - scroll gating for free: the caller flips `canConnect` on |a| < 0.30 —
 *     losing the gate tweens every connection out, the net dissolves itself
 *     between sections with zero opacity plumbing (igloo's exact mechanism).
 *
 * RENDERING — 2 draw calls, position-only attributes (zero storage bindings,
 * one vertex slot each), both `LineBasicNodeMaterial`:
 *   - the NET: ONE LineSegments (PLEXUS_MAX_LINES·2 verts, positions
 *     rewritten CPU-side per frame — trivial);
 *   - the MARKERS: igloo's plus-sign POINT sprites can't exist on WebGPU
 *     (WGSL has no point size), so each point is a 2-segment CROSS in ONE
 *     more LineSegments — same read, cross-backend safe. Arms live in the
 *     camera-locked GROUP frame (screen-facing); the tumble rotation is
 *     applied to the POSITIONS CPU-side (equivalent to igloo's group-copy).
 * Both color nodes: radial mask smoothstep(MASK_IN, MASK_OUT, length(pos)) —
 * segments near the crystal body fade — and the net adds the broken-dash mask
 * smoothstep(.4,.5, sinenoise(pos·10.1)). Igloo faded via additive-black; our
 * canvas is transparent, so the SAME expressions drive ALPHA (honest fade).
 * depthTest on / depthWrite off, renderOrder −2 (crystal −3 < net < streams).
 *
 * ISLAND DISCIPLINE: no RAF, no store reads — `update()` is called from
 * CrystalCluster's existing useFrame with everything passed in; zero
 * per-frame allocation (all state preallocated; the shuffle runs in a scratch
 * Uint8Array). All `three/webgpu` + `three/tsl` symbols are passed in.
 */
import {
  PLEXUS_POINTS,
  PLEXUS_RADIUS,
  PLEXUS_RADIUS_JIT,
  PLEXUS_TREADMILL,
  PLEXUS_ORBIT,
  PLEXUS_WOBBLE,
  PLEXUS_CLIMB,
  PLEXUS_CONNECT_DIST,
  PLEXUS_BREAK_DIST,
  PLEXUS_MAX_PER_POINT,
  PLEXUS_MAX_LINES,
  PLEXUS_TWEEN,
  PLEXUS_Y_GATE,
  PLEXUS_WRAP_BLOCK,
  PLEXUS_COLOR,
  PLEXUS_LINE_ALPHA,
  PLEXUS_CROSS_ALPHA,
  PLEXUS_CROSS_SIZE,
  PLEXUS_MASK_IN,
  PLEXUS_MASK_OUT,
  PLEXUS_DASH_FREQ,
} from "./crystalConfig";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/** Deterministic [0,1) hash — the repo's sin-dot family (layout stability). */
function h(i: number, mulA: number, addB: number): number {
  const s = Math.sin(i * mulA + addB) * 43758.545;
  return s - Math.floor(s);
}

interface QuatLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface CrystalPlexus {
  /** The net LineSegments — mount inside the camera-locked group. */
  lines: Any;
  /** The plus-sign marker LineSegments — same group. */
  cross: Any;
  uniforms: {
    /** Master alpha (driver writes reveal each frame). */
    uPlexusAlpha: { value: number };
  };
  /** Advance one frame. `q` = the crystal mesh's tumble quaternion (applied
   * to positions CPU-side — the igloo group-rotation copy). */
  update(dt: number, time: number, canConnect: boolean, q: QuatLike): void;
  /** Dev-handle: live connection count. */
  readonly activeConnections: number;
  dispose(): void;
}

export function createCrystalPlexus(webgpu: Any, tsl: Any): CrystalPlexus {
  const {
    BufferGeometry,
    BufferAttribute,
    LineSegments,
    LineBasicNodeMaterial,
    Color,
    DynamicDrawUsage,
  } = webgpu as Any;
  const {
    uniform,
    varying,
    positionLocal,
    smoothstep,
    length,
    float,
    vec3,
    sin,
  } = tsl as Any;

  const N = PLEXUS_POINTS;
  const MAXC = PLEXUS_MAX_LINES;
  const HALF = PLEXUS_TREADMILL / 2;
  const TAU = Math.PI * 2;

  // === Materials ============================================================
  const uPlexusAlpha = uniform(0);
  const col = new Color(PLEXUS_COLOR);

  function makeMat(dashed: boolean): Any {
    const m = new LineBasicNodeMaterial();
    // Varying discipline: self-contained expression of the position attr.
    const vP = varying(positionLocal);
    const radial = smoothstep(
      float(PLEXUS_MASK_IN),
      float(PLEXUS_MASK_OUT),
      length(vP),
    );
    let alpha: Any = radial
      .mul(uPlexusAlpha)
      .mul(dashed ? PLEXUS_LINE_ALPHA : PLEXUS_CROSS_ALPHA);
    if (dashed) {
      // Igloo's broken-dash mask — sinenoise(pos·10.1) via the repo's
      // product-of-sines family (cross-backend builtins only).
      const dn = sin(vP.x.mul(PLEXUS_DASH_FREQ))
        .mul(sin(vP.y.mul(PLEXUS_DASH_FREQ).add(1.3)))
        .mul(sin(vP.z.mul(PLEXUS_DASH_FREQ).add(2.6)))
        .mul(0.5)
        .add(0.5);
      alpha = alpha.mul(smoothstep(float(0.4), float(0.5), dn));
    }
    m.colorNode = vec3(col.r, col.g, col.b);
    m.opacityNode = alpha;
    m.transparent = true;
    m.depthWrite = false;
    m.depthTest = true;
    m.toneMapped = false;
    return m;
  }

  const lineMat = makeMat(true);
  const crossMat = makeMat(false);

  // === Geometry (position-only, rewritten CPU-side) =========================
  const linePos = new Float32Array(MAXC * 2 * 3);
  const lineAttr = new BufferAttribute(linePos, 3);
  lineAttr.setUsage(DynamicDrawUsage);
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute("position", lineAttr);
  const lines = new LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;
  lines.renderOrder = -2;

  const crossPos = new Float32Array(N * 4 * 3);
  const crossAttr = new BufferAttribute(crossPos, 3);
  crossAttr.setUsage(DynamicDrawUsage);
  const crossGeo = new BufferGeometry();
  crossGeo.setAttribute("position", crossAttr);
  const cross = new LineSegments(crossGeo, crossMat);
  cross.frustumCulled = false;
  cross.renderOrder = -2;

  // === Point state (deterministic layout, igloo drift law) ==================
  const baseR = new Float32Array(N);
  const angle = new Float32Array(N);
  const angleVel = new Float32Array(N);
  const yPos = new Float32Array(N);
  const climb = new Float32Array(N);
  const seedA = new Float32Array(N);
  const seedB = new Float32Array(N);
  const wrapBlock = new Float32Array(N);
  const pts = new Float32Array(N * 3); // rotated, group-frame
  for (let i = 0; i < N; i++) {
    baseR[i] = PLEXUS_RADIUS * (1 - PLEXUS_RADIUS_JIT * h(i, 12.9898, 78.233));
    angle[i] = h(i, 39.3467, 11.135) * Math.PI * 2;
    angleVel[i] = (h(i, 73.156, 52.235) - 0.5) * PLEXUS_ORBIT;
    yPos[i] = h(i, 17.23, 91.7) * PLEXUS_TREADMILL - HALF;
    climb[i] = h(i, 47.77, 13.9) * PLEXUS_CLIMB;
    seedA[i] = h(i, 83.13, 57.3) * Math.PI * 2;
    seedB[i] = h(i, 29.51, 37.1) * Math.PI * 2;
  }

  // === Connection state (parallel arrays, zero per-frame alloc) =============
  const cA = new Int16Array(MAXC).fill(-1);
  const cB = new Int16Array(MAXC).fill(-1);
  const cProg = new Float32Array(MAXC);
  const cDir = new Int8Array(MAXC); // +1 connecting/held, -1 disconnecting
  const cActive = new Uint8Array(MAXC);
  const counts = new Uint8Array(N);
  const shuffle = new Uint8Array(N); // scratch candidate order
  let activeCount = 0;

  function eligible(i: number): boolean {
    return Math.abs(yPos[i]) < PLEXUS_Y_GATE && wrapBlock[i] <= 0;
  }
  function dist2(a: number, b: number): number {
    const dx = pts[a * 3] - pts[b * 3];
    const dy = pts[a * 3 + 1] - pts[b * 3 + 1];
    const dz = pts[a * 3 + 2] - pts[b * 3 + 2];
    return dx * dx + dy * dy + dz * dz;
  }
  function pairExists(a: number, b: number): boolean {
    for (let c = 0; c < MAXC; c++) {
      if (!cActive[c]) continue;
      if ((cA[c] === a && cB[c] === b) || (cA[c] === b && cB[c] === a)) {
        return true;
      }
    }
    return false;
  }

  function update(
    dt: number,
    time: number,
    canConnect: boolean,
    q: QuatLike,
  ): void {
    // --- 1. Drift + treadmill + tumble rotation (CPU quat apply) -----------
    for (let i = 0; i < N; i++) {
      if (wrapBlock[i] > 0) wrapBlock[i] -= dt;
      angle[i] += angleVel[i] * dt;
      // Bounded-accumulation hygiene (long-session contract): the orbit angle
      // wraps mod 2π (yPos already treadmill-wraps; wrapBlock self-floors).
      if (angle[i] > TAU) angle[i] -= TAU;
      else if (angle[i] < -TAU) angle[i] += TAU;
      yPos[i] += climb[i] * dt;
      if (yPos[i] > HALF) {
        yPos[i] -= PLEXUS_TREADMILL;
        wrapBlock[i] = PLEXUS_WRAP_BLOCK; // igloo's not-just-wrapped rule
      }
      const vx =
        Math.cos(angle[i]) * baseR[i] +
        PLEXUS_WOBBLE * Math.sin(time * 0.5 + seedA[i]);
      const vy = yPos[i];
      const vz =
        Math.sin(angle[i]) * baseR[i] +
        PLEXUS_WOBBLE * Math.sin(time * 0.5 + seedB[i]);
      // v' = v + 2·qw·(q×v) + 2·q×(q×v) — hand-rolled, zero alloc.
      const tx = 2 * (q.y * vz - q.z * vy);
      const ty = 2 * (q.z * vx - q.x * vz);
      const tz = 2 * (q.x * vy - q.y * vx);
      pts[i * 3] = vx + q.w * tx + (q.y * tz - q.z * ty);
      pts[i * 3 + 1] = vy + q.w * ty + (q.z * tx - q.x * tz);
      pts[i * 3 + 2] = vz + q.w * tz + (q.x * ty - q.y * tx);
    }

    // --- 2. Connection maintenance (0.35 s linear tweens, igloo law) --------
    const step = dt / PLEXUS_TWEEN;
    activeCount = 0;
    for (let c = 0; c < MAXC; c++) {
      if (!cActive[c]) continue;
      const a = cA[c];
      const b = cB[c];
      if (cDir[c] > 0) {
        const ok =
          canConnect &&
          eligible(a) &&
          eligible(b) &&
          dist2(a, b) < PLEXUS_BREAK_DIST * PLEXUS_BREAK_DIST;
        if (!ok) {
          cDir[c] = -1;
          // Free the slots at disconnect START so points can re-net.
          if (counts[a] > 0) counts[a]--;
          if (counts[b] > 0) counts[b]--;
        }
      }
      cProg[c] += cDir[c] * step;
      if (cProg[c] >= 1) cProg[c] = 1;
      if (cProg[c] <= 0 && cDir[c] < 0) {
        cActive[c] = 0;
        continue;
      }
      activeCount++;
    }

    // --- 3. Growth: shuffled candidates (igloo: random pick, NOT nearest),
    // one new connection per point per frame — organic build-up. ------------
    if (canConnect) {
      for (let p = 0; p < N; p++) {
        if (counts[p] >= PLEXUS_MAX_PER_POINT || !eligible(p)) continue;
        // Fisher-Yates over the scratch order.
        for (let i = 0; i < N; i++) shuffle[i] = i;
        for (let i = N - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          const tmp = shuffle[i];
          shuffle[i] = shuffle[j];
          shuffle[j] = tmp;
        }
        for (let s = 0; s < N; s++) {
          const cand = shuffle[s];
          if (
            cand === p ||
            counts[cand] >= PLEXUS_MAX_PER_POINT ||
            !eligible(cand) ||
            dist2(p, cand) >= PLEXUS_CONNECT_DIST * PLEXUS_CONNECT_DIST ||
            pairExists(p, cand)
          ) {
            continue;
          }
          let slot = -1;
          for (let c = 0; c < MAXC; c++) {
            if (!cActive[c]) {
              slot = c;
              break;
            }
          }
          if (slot < 0) break;
          cA[slot] = p;
          cB[slot] = cand;
          cProg[slot] = 0;
          cDir[slot] = 1;
          cActive[slot] = 1;
          counts[p]++;
          counts[cand]++;
          activeCount++;
          break; // one per point per frame
        }
      }
    }

    // --- 4. Write the net verts: pt1 → lerp(pt1, pt2, progress) ------------
    for (let c = 0; c < MAXC; c++) {
      const o = c * 6;
      if (!cActive[c]) {
        // Degenerate zero-length segment — invisible, keeps one draw call.
        linePos[o] = 0;
        linePos[o + 1] = 0;
        linePos[o + 2] = 0;
        linePos[o + 3] = 0;
        linePos[o + 4] = 0;
        linePos[o + 5] = 0;
        continue;
      }
      const a3 = cA[c] * 3;
      const b3 = cB[c] * 3;
      const t = cProg[c]; // linear, igloo verbatim
      linePos[o] = pts[a3];
      linePos[o + 1] = pts[a3 + 1];
      linePos[o + 2] = pts[a3 + 2];
      linePos[o + 3] = pts[a3] + (pts[b3] - pts[a3]) * t;
      linePos[o + 4] = pts[a3 + 1] + (pts[b3 + 1] - pts[a3 + 1]) * t;
      linePos[o + 5] = pts[a3 + 2] + (pts[b3 + 2] - pts[a3 + 2]) * t;
    }
    lineAttr.needsUpdate = true;

    // --- 5. Write the marker crosses (screen-facing: arms in the camera-
    // locked group frame, NOT rotated by the tumble) ------------------------
    const s = PLEXUS_CROSS_SIZE;
    for (let i = 0; i < N; i++) {
      const p3 = i * 3;
      const o = i * 12;
      const px = pts[p3];
      const py = pts[p3 + 1];
      const pz = pts[p3 + 2];
      crossPos[o] = px - s;
      crossPos[o + 1] = py;
      crossPos[o + 2] = pz;
      crossPos[o + 3] = px + s;
      crossPos[o + 4] = py;
      crossPos[o + 5] = pz;
      crossPos[o + 6] = px;
      crossPos[o + 7] = py - s;
      crossPos[o + 8] = pz;
      crossPos[o + 9] = px;
      crossPos[o + 10] = py + s;
      crossPos[o + 11] = pz;
    }
    crossAttr.needsUpdate = true;
  }

  return {
    lines,
    cross,
    uniforms: { uPlexusAlpha },
    update,
    get activeConnections() {
      return activeCount;
    },
    dispose() {
      lineGeo.dispose();
      crossGeo.dispose();
      lineMat.dispose();
      crossMat.dispose();
    },
  };
}

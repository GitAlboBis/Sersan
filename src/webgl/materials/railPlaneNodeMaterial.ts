/**
 * Rail card-plane material — TSL NodeMaterial (WebGPU-flag path ONLY).
 *
 * GLSL-TWIN DECISION (restyle step 2 part B, documented per repo convention):
 * unlike SignatureLine/DriftParticles this material ships WITHOUT a raw-GLSL
 * twin. The rail planes are a new, purely decorative layer; on the classic
 * flag-OFF WebGLRenderer path (`!webgpuEnabled()`) RailPlanes hard no-ops
 * (never loads this module, never mounts meshes) and the DOM rail is the whole
 * experience. On the flag-ON path the node graph compiles to WGSL under WebGPU
 * AND to GLSL under WebGPURenderer's WebGL2 *fallback* backend (the same
 * dual-backend contract lineNodeMaterial documents), so a twin would only ever
 * serve the legacy flag-OFF build — not worth the parity-maintenance cost.
 *
 * Look (research/webgl-card-planes.md §4):
 *   (a) procedural navy backdrop: vertical gradient over #0B1422 with a ≤10%
 *       cyan→violet tint (per-card seeded, sine-mixed so there is no fract()
 *       seam) + hash grain (±0.015) — every channel stays far below the 1.0
 *       bloom threshold;
 *   (b) velocity bend: the plane bows toward rail motion, max at the card's
 *       vertical middle (sin(uv.y·π)), driven by a CPU-smoothed normalized
 *       velocity uniform;
 *   (c) hover scan sweep: a thin cyan→violet band crossing a noise-warped
 *       diagonal field, emissive ×2.4 (>1.0, toneMapped:false) so the existing
 *       selective bloom catches ONLY the sweep, with a sub-threshold trail;
 *   (d) edge feather: uv-space smoothstep inset, so the camera's lookAt tilt
 *       (a few px of DOM↔world de-registration) never exposes a hard plane
 *       edge outside the DOM card (prd caveat 7).
 *
 * Per-card materials share an identical node-graph structure → three's
 * program cache compiles ONE program; each instance only carries its own
 * uniform group. NormalBlending + depthWrite/depthTest off + renderOrder -1
 * (set on the mesh) keep the planes a backdrop surface: dust particles and
 * the signature line always draw over them.
 *
 * TSL node names verified against the installed build the same way as
 * lineNodeMaterial.ts (Fn, uniform, uv, positionLocal, sin, abs, mix,
 * smoothstep, float, vec2, vec3, fract, dot, oneMinus — all present; fract/
 * dot/vec2 additionally proven in PostFXNodes' grain).
 */
import { Color, MeshBasicNodeMaterial, NormalBlending } from "three/webgpu";
import {
  Fn,
  uniform,
  uv,
  positionLocal,
  sin,
  abs,
  mix,
  smoothstep,
  float,
  vec2,
  vec3,
  fract,
  dot,
} from "three/tsl";

/**
 * Per-frame-driven uniform set. Mutated via `.value` from RailPlanes'
 * useFrame exactly like the line/particle materials.
 */
export type RailPlaneUniforms = {
  /** Eased hover 0..1 — drives the scan sweep across the card. */
  uHover: { value: number };
  /** Smoothed, normalized rail velocity (−1..1) — drives the bend. */
  uVelocity: { value: number };
  /** Route-transition fade (damped scrollStore.reveal). */
  uReveal: { value: number };
  /** Stable per-card seed 0..1 — varies backdrop tint phase + scan warp. */
  uSeed: { value: number };
};

export function createRailPlaneMaterial(seed: number): {
  material: MeshBasicNodeMaterial;
  uniforms: RailPlaneUniforms;
} {
  const uHover = uniform(0);
  const uVelocity = uniform(0);
  const uReveal = uniform(0);
  const uSeed = uniform(seed);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#7C5CFF"));
  const uBase = uniform(new Color("#0B1422"));
  // HDR scan emissive: must clear the 1.0 bloom threshold decisively but stay
  // well under ~3 or the halo rings around the DOM text above the canvas.
  const uScanEmissive = uniform(2.4);
  // Bend amplitude in LOCAL plane units (the mesh is a unit plane scaled to
  // card size, so 0.05 ≈ 5% of card width at |uVelocity| = 1).
  const uBendAmp = uniform(0.05);

  const material = new MeshBasicNodeMaterial();

  // --- Vertex: velocity bend -------------------------------------------------
  // Bow along X (the rail's axis of motion), max at the vertical middle, zero
  // at the top/bottom edges. Needs y-subdivisions on the plane geometry.
  material.positionNode = Fn(() => {
    const bow = sin(uv().y.mul(Math.PI));
    return positionLocal.add(vec3(uVelocity.mul(uBendAmp).mul(bow), 0.0, 0.0));
  })();

  // --- Fragment ----------------------------------------------------------------
  const u = uv();

  // (a) Backdrop: navy vertical gradient + faint seeded accent tint. The tint
  // mix runs on a sine (seamless — no fract() wrap line inside the card) and
  // is capped at 10%, keeping the whole backdrop far below bloom threshold.
  const tintMix = sin(u.x.mul(2.4).add(uSeed.mul(7.0))).mul(0.5).add(0.5);
  const tint = mix(uColorA, uColorB, tintMix);
  const grad = mix(uBase, tint, float(0.1).mul(smoothstep(0.0, 1.0, u.y)));
  // Cheap hash grain (same recipe as PostFXNodes), ±0.015 — sub-threshold.
  const seedUv = u.mul(120.0).add(uSeed.mul(31.7));
  const grain = fract(sin(dot(seedUv, vec2(12.9898, 78.233))).mul(43758.5453));
  const backdrop = grad.add(grain.sub(0.5).mul(0.03));

  // (b/c) Scan sweep: the "depth" of the depth-map scan reference is just an
  // ordering field — with no imagery we use a noise-warped diagonal so the
  // band reads as a scan, not a wipe. uHover sweeps the band across the field
  // with overshoot on both ends so it fully exits at rest and at hover=1.
  const warp = sin(u.y.mul(9.0).add(uSeed.mul(40.0))).mul(0.04);
  const field = u.x.mul(0.8).add(u.y.mul(0.2)).add(warp);
  const scanPos = mix(float(-0.25), float(1.25), uHover);
  const dist = scanPos.sub(field);
  const band = smoothstep(0.0, 0.03, abs(dist)).oneMinus();
  const lineGrad = mix(uColorA, uColorB, u.y);
  const scanCol = lineGrad.mul(uScanEmissive).mul(band);
  // Trailing glow behind the line — subtle, sub-threshold.
  const trail = smoothstep(0.0, 0.35, dist)
    .mul(smoothstep(0.0, 0.5, dist).oneMinus())
    .mul(0.12);

  const col = backdrop.add(lineGrad.mul(trail)).add(scanCol);

  // (d) Edge feather: soft uv inset (reversed-edge smoothsteps are written as
  // forward + oneMinus — reversed edges are undefined in WGSL's smoothstep).
  const feather = smoothstep(0.0, 0.05, u.x)
    .mul(smoothstep(0.95, 1.0, u.x).oneMinus())
    .mul(smoothstep(0.0, 0.07, u.y))
    .mul(smoothstep(0.93, 1.0, u.y).oneMinus());

  material.colorNode = vec3(col);
  material.opacityNode = uReveal.mul(0.9).mul(feather);

  material.transparent = true;
  material.depthWrite = false; // never occludes the line/dust
  material.depthTest = false; // layering is renderOrder-driven (mesh: -1)
  material.blending = NormalBlending; // a surface, not a glow
  material.toneMapped = false; // keep the >1.0 scan intact for bloom

  return { material, uniforms: { uHover, uVelocity, uReveal, uSeed } };
}

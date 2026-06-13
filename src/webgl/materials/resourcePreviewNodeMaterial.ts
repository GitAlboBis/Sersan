/**
 * Resource hover-preview plane material — TSL NodeMaterial (WebGPU-flag path
 * ONLY).
 *
 * GLSL-TWIN DECISION (same rationale as railPlaneNodeMaterial — documented per
 * repo convention): no raw-GLSL twin. The preview plane is a new, purely
 * additive decorative layer; on the classic flag-OFF WebGLRenderer path
 * (`!webgpuEnabled()`) ResourcePreviewPlane hard no-ops (never loads this
 * module, never mounts a mesh) and resource-preview.tsx's DOM gradient card is
 * the whole preview. On the flag-ON path the node graph compiles to WGSL under
 * WebGPU AND to GLSL under WebGPURenderer's WebGL2 fallback backend (the same
 * dual-backend contract lineNodeMaterial/railPlaneNodeMaterial document), so a
 * twin would only ever serve the legacy flag-OFF build — not worth the
 * parity-maintenance cost.
 *
 * Look — the abstract "signal condenses under your cursor" motif:
 *   (a) navy base (#0B1422) under a cyan→violet vertical gradient field, with a
 *       per-article seeded phase so each article reads slightly different. Every
 *       channel of the base/gradient stays well under the 1.0 bloom threshold.
 *   (b) reveal disk: a soft iris growing from center as uHover rises (radius
 *       eased on the CPU), so the signal blooms in toward the article and
 *       collapses on leave — the ImageReveal "grow-on-hover" mechanic, minus
 *       the image.
 *   (c) velocity bend: the plane bows toward cursor motion (the inherited
 *       pointer flowmap), max at the vertical middle (sin(uv.y·π)), driven by a
 *       CPU-smoothed normalized velocity uniform — the same smoothed
 *       pointerStore.vel that feeds the global PointerFlowmap.
 *   (d) scan band: a thin cyan→violet ring at the reveal-disk edge, emissive
 *       >1.0 (toneMapped:false) so the existing selective bloom catches ONLY
 *       the edge — same uScanEmissive contract as railPlaneNodeMaterial.
 *   (e) edge feather + radial vignette: uv-space + radial smoothsteps so the
 *       plane never shows a hard rectangular border (it reads as a soft signal
 *       lens, not a card).
 *
 * NormalBlending + depthWrite/depthTest off + renderOrder -1 (set on the mesh)
 * keep the plane a backdrop surface beneath the line + dust.
 *
 * TSL node names verified against the installed build the same way as
 * railPlaneNodeMaterial.ts (Fn, uniform, uv, positionLocal, sin, abs, mix,
 * smoothstep, float, vec2, vec3, length, sub — all present in the existing
 * line/rail materials).
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
  length,
} from "three/tsl";

/**
 * Per-frame-driven uniform set. Mutated via `.value` from
 * ResourcePreviewPlane's useFrame exactly like the line/rail materials.
 */
export type ResourcePreviewUniforms = {
  /** Eased hover 0..1 — grows the reveal disk + scan ring. */
  uHover: { value: number };
  /** Smoothed, normalized pointer velocity X (−1..1) — drives the bend. */
  uVel: { value: number };
  /** Stable per-article seed 0..1 — varies the gradient phase. */
  uSeed: { value: number };
};

export function createResourcePreviewMaterial(): {
  material: MeshBasicNodeMaterial;
  uniforms: ResourcePreviewUniforms;
} {
  const uHover = uniform(0);
  const uVel = uniform(0);
  const uSeed = uniform(0);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#7C5CFF"));
  const uBase = uniform(new Color("#0B1422"));
  // HDR scan emissive: clears the 1.0 bloom threshold decisively but stays well
  // under ~3 so it never halos the DOM list above the canvas.
  const uScanEmissive = uniform(2.4);
  // Bend amplitude in LOCAL plane units (unit plane scaled to preview size).
  const uBendAmp = uniform(0.06);

  const material = new MeshBasicNodeMaterial();

  // --- Vertex: velocity bend -------------------------------------------------
  // Bow along X (the cursor's dominant motion axis), max at the vertical
  // middle, zero at top/bottom edges. Needs y-subdivisions on the geometry.
  material.positionNode = Fn(() => {
    const bow = sin(uv().y.mul(Math.PI));
    return positionLocal.add(vec3(uVel.mul(uBendAmp).mul(bow), 0.0, 0.0));
  })();

  // --- Fragment --------------------------------------------------------------
  const u = uv();
  // Centered uv for the radial reveal disk + vignette (−0.5..0.5 → length).
  const centered = u.sub(vec2(0.5, 0.5));
  const r = length(centered).mul(2.0); // 0 at center, ~1 at the edge midpoints

  // (a) Navy base + seeded cyan→violet vertical gradient field. The phase mix
  // runs on a sine (seamless — no fract() wrap line) and is capped low, so the
  // backdrop stays far below bloom threshold.
  const phase = sin(u.y.mul(2.6).add(uSeed.mul(7.0))).mul(0.5).add(0.5);
  const tint = mix(uColorA, uColorB, phase);
  const grad = mix(uBase, tint, float(0.14).mul(smoothstep(0.0, 1.0, u.y)));

  // (b) Reveal disk: a soft iris whose radius grows with uHover. Inside the
  // disk the seeded gradient brightens slightly (still sub-threshold); outside
  // it stays the dim navy base.
  const diskR = mix(float(0.0), float(0.95), uHover);
  const disk = smoothstep(diskR, diskR.sub(0.35), r); // 1 inside, 0 outside (feathered)
  const inner = mix(uColorA, uColorB, phase).mul(0.45);
  const fill = mix(grad, grad.add(inner), disk.mul(0.6));

  // (d) Scan ring at the disk edge — emissive >1.0 so selective bloom catches
  // ONLY the edge. Distance of the current radius from the disk boundary.
  const edge = abs(r.sub(diskR));
  const ring = smoothstep(0.0, 0.05, edge).oneMinus();
  const ringCol = mix(uColorA, uColorB, u.y)
    .mul(uScanEmissive)
    .mul(ring)
    .mul(uHover); // ring only appears while hovering

  const col = fill.add(ringCol);

  // (e) Edge feather (rectangular) + radial vignette so no hard border shows.
  const feather = smoothstep(0.0, 0.06, u.x)
    .mul(smoothstep(0.94, 1.0, u.x).oneMinus())
    .mul(smoothstep(0.0, 0.06, u.y))
    .mul(smoothstep(0.94, 1.0, u.y).oneMinus());
  const vignette = smoothstep(1.0, 0.55, r);

  material.colorNode = vec3(col);
  // Whole plane fades in with hover; feather + vignette keep the edge soft.
  material.opacityNode = uHover.mul(0.92).mul(feather).mul(vignette);

  material.transparent = true;
  material.depthWrite = false; // never occludes the line/dust
  material.depthTest = false; // layering is renderOrder-driven (mesh: -1)
  material.blending = NormalBlending; // a surface, not a glow
  material.toneMapped = false; // keep the >1.0 scan ring intact for bloom

  return { material, uniforms: { uHover, uVel, uSeed } };
}

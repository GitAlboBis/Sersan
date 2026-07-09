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
 * Look (research/webgl-card-planes.md §4 + the work-rail redesign):
 *   (a) procedural navy backdrop: vertical gradient over #0B1422 with a ≤10%
 *       cyan→deep-blue tint (per-card seeded, sine-mixed so there is no
 *       fract() seam) + hash grain (±0.015) — every channel stays far below
 *       the 1.0 bloom threshold;
 *   (b) velocity bend: the plane bows toward rail motion, max at the card's
 *       vertical middle (sin(uv.y·π)), driven by a CPU-smoothed normalized
 *       velocity uniform;
 *   (c) hover scan sweep: a thin cyan→blue band crossing a noise-warped
 *       diagonal field, emissive ×2.4 (>1.0, toneMapped:false) so the existing
 *       selective bloom catches ONLY the sweep, with a sub-threshold trail;
 *   (d) edge feather: uv-space smoothstep inset, so the camera's lookAt tilt
 *       (a few px of DOM↔world de-registration) never exposes a hard plane
 *       edge outside the DOM card (prd caveat 7);
 *   (e) uParallax — horizontal shift of the whole procedural field (tint
 *       phase, grain, scan field), fed with t·RAIL_PLANE_PARALLAX from
 *       RailPlanes' analytic per-card center: the card interior counter-slides
 *       against travel, the "window-look" the DOM media layer does at 112%
 *       bleed. Procedural domain — no headroom/clamp concerns;
 *   (f) uFocus — center-focus defocus (0 centered → 1 at the viewport edge):
 *       grain frequency + amplitude down, tint contrast down, scan sweep and
 *       trail faded out, and the plane's own opacity dimmed by the SAME
 *       RAIL_FOCUS_FADE factor the DOM card fades by (railMotion.ts), so card
 *       and plane read as ONE surface losing focus together.
 *
 * Accent pair is cyan #3BE1FF → deep blue #2A7FFF (standing directive:
 * cyan/blue only — the former violet #7C5CFF stop is retired).
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
  length,
  clamp,
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
  /** Route-transition fade (damped scrollStore.reveal) — global opacity gate. */
  uRouteFade: { value: number };
  /**
   * Per-card noisy-reveal progress 0..1 (damped railStore.reveal[index]).
   * Drives the #3 "signal resolves from noise" mask: the card materialises
   * from the navy through a domain-warped radial front with a cyan→blue rim.
   */
  uReveal: { value: number };
  /** Stable per-card seed 0..1 — varies backdrop tint phase + scan warp. */
  uSeed: { value: number };
  /** Horizontal shift of the procedural field: t·RAIL_PLANE_PARALLAX. */
  uParallax: { value: number };
  /** Center-focus falloff f (0 centered → 1 edge) — procedural defocus. */
  uFocus: { value: number };
};

export function createRailPlaneMaterial(seed: number): {
  material: MeshBasicNodeMaterial;
  uniforms: RailPlaneUniforms;
} {
  const uHover = uniform(0);
  const uVelocity = uniform(0);
  const uRouteFade = uniform(0);
  const uReveal = uniform(0);
  const uSeed = uniform(seed);
  const uParallax = uniform(0);
  const uFocus = uniform(0);
  const uColorA = uniform(new Color("#3BE1FF"));
  const uColorB = uniform(new Color("#2A7FFF"));
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
  // Parallax-shifted field space: everything PROCEDURAL samples through `pu`
  // so the whole interior counter-slides against travel; the FEATHER and the
  // hover sweep position stay in raw card space (they belong to the card box,
  // not to the "content" behind it).
  const pu = vec2(u.x.add(uParallax), u.y);
  // Focus attenuators (all 1 at center, reduced toward the edges — restrained).
  const focusScan = uFocus.oneMinus(); // sweep/trail fade fully at the edge
  const focusTint = uFocus.mul(0.5).oneMinus(); // tint contrast −50% at edge
  const focusGrain = uFocus.mul(0.6).oneMinus(); // grain amplitude −60% at edge

  // (a) Backdrop: navy vertical gradient + faint seeded accent tint. The tint
  // mix runs on a sine (seamless — no fract() wrap line inside the card) and
  // is capped at 10%, keeping the whole backdrop far below bloom threshold.
  // uFocus flattens the tint (contrast down = procedural defocus).
  const tintMix = sin(pu.x.mul(2.4).add(uSeed.mul(7.0))).mul(0.5).add(0.5);
  const tint = mix(uColorA, uColorB, tintMix);
  const grad = mix(
    uBase,
    tint,
    float(0.1).mul(focusTint).mul(smoothstep(0.0, 1.0, u.y)),
  );
  // Cheap hash grain (same recipe as PostFXNodes), ±0.015 — sub-threshold.
  // Defocus lowers BOTH its frequency (coarser pattern) and its amplitude.
  const grainFreq = mix(float(120.0), float(64.0), uFocus);
  const seedUv = pu.mul(grainFreq).add(uSeed.mul(31.7));
  const grain = fract(sin(dot(seedUv, vec2(12.9898, 78.233))).mul(43758.5453));
  const backdrop = grad.add(grain.sub(0.5).mul(float(0.03).mul(focusGrain)));

  // (b/c) Scan sweep: the "depth" of the depth-map scan reference is just an
  // ordering field — with no imagery we use a noise-warped diagonal so the
  // band reads as a scan, not a wipe. uHover sweeps the band across the field
  // with overshoot on both ends so it fully exits at rest and at hover=1.
  // The warp samples the parallax-shifted field; the whole sweep fades out
  // with defocus (an out-of-focus card doesn't flash).
  const warp = sin(pu.y.mul(9.0).add(uSeed.mul(40.0))).mul(0.04);
  const field = pu.x.mul(0.8).add(u.y.mul(0.2)).add(warp);
  const scanPos = mix(float(-0.25), float(1.25), uHover);
  const dist = scanPos.sub(field);
  const band = smoothstep(0.0, 0.03, abs(dist)).oneMinus();
  const lineGrad = mix(uColorA, uColorB, u.y);
  const scanCol = lineGrad.mul(uScanEmissive).mul(band).mul(focusScan);
  // Trailing glow behind the line — subtle, sub-threshold.
  const trail = smoothstep(0.0, 0.35, dist)
    .mul(smoothstep(0.0, 0.5, dist).oneMinus())
    .mul(float(0.12).mul(focusScan));

  // (g) Per-card noisy reveal (#3 "signal resolves from noise"). A domain-
  // warped radial front expands from the card center as uReveal 0→1; a bright
  // cyan→blue rim rides the boundary (emissive >1.0 → selective bloom) and
  // auto-vanishes both at rest (mask 0 everywhere) and once fully revealed
  // (mask 1 everywhere). reduced-motion / non-webgpu never mount this island.
  const cen = u.sub(vec2(0.5, 0.5));
  const revDist = length(cen); // 0 at center → ~0.707 at a corner
  // Organic boundary: a low-freq sine field + hash grain warp the radius so the
  // front tears open rather than sweeping a clean circle.
  const revHash = fract(
    sin(dot(u.mul(4.0).add(uSeed.mul(17.0)), vec2(12.9898, 78.233))).mul(
      43758.5453,
    ),
  );
  const revWave = sin(u.x.mul(11.0).add(u.y.mul(7.0)).add(uSeed.mul(30.0)))
    .mul(0.5)
    .add(0.5);
  const revNoise = revWave.mul(0.6).add(revHash.mul(0.4)); // 0..1
  // front > 0 where revealed. 1.35 expand guarantees full coverage at uReveal=1
  // (worst case: dist 0.707 + noise·0.28 ≈ 0.99 < 1.35).
  const front = uReveal.mul(1.35).sub(revDist).sub(revNoise.mul(0.28));
  const revealMask = smoothstep(0.0, 0.14, front); // 0 hidden → 1 revealed
  // Rim band peaks at the transition (mask≈0.5) and is 0 at both ends, faded
  // with defocus like the scan sweep.
  const revealRim = revealMask.mul(revealMask.oneMinus()).mul(4.0);
  const revealRimCol = mix(uColorA, uColorB, u.y)
    .mul(2.6)
    .mul(revealRim)
    .mul(focusScan);

  const col = backdrop
    .add(lineGrad.mul(trail))
    .add(scanCol)
    .add(revealRimCol);

  // (d) Edge feather: soft uv inset (reversed-edge smoothsteps are written as
  // forward + oneMinus — reversed edges are undefined in WGSL's smoothstep).
  const feather = smoothstep(0.0, 0.05, u.x)
    .mul(smoothstep(0.95, 1.0, u.x).oneMinus())
    .mul(smoothstep(0.0, 0.07, u.y))
    .mul(smoothstep(0.93, 1.0, u.y).oneMinus());

  material.colorNode = vec3(col);
  // Opacity: route fade × edge feather × center-focus fade (railMotion.ts
  // RAIL_FOCUS_FADE = 0.4, so plane + card dim together) × the noisy reveal
  // mask (the card materialises from the navy). The rim front is kept opaque
  // slightly AHEAD of the fill so the glowing boundary reads crisp.
  material.opacityNode = uRouteFade
    .mul(0.9)
    .mul(feather)
    .mul(uFocus.mul(0.4).oneMinus())
    .mul(clamp(revealMask.add(revealRim.mul(0.8)), 0.0, 1.0));

  material.transparent = true;
  material.depthWrite = false; // never occludes the line/dust
  material.depthTest = false; // layering is renderOrder-driven (mesh: -1)
  material.blending = NormalBlending; // a surface, not a glow
  material.toneMapped = false; // keep the >1.0 scan intact for bloom

  return {
    material,
    uniforms: {
      uHover,
      uVelocity,
      uRouteFade,
      uReveal,
      uSeed,
      uParallax,
      uFocus,
    },
  };
}

/**
 * CRYSTAL FOG — the world-anchored luminous volume the stones stand in.
 * ROUND 8-E, research/2026-08-22-round8-stone-source-anatomy.md §B4.2 part 1
 * (the "priority 1, mandatory" half of the value-world fix), extending the
 * `AmbientGlows` mechanism named by 2026-08-22-round7-continuous-space-spec.md
 * §B.4 at ~10× its whisper-level alpha.
 *
 * WHY IT EXISTS — the arithmetic, not the taste. The owner: "le pietre non mi
 * sembrano per niente come quelle nel sito igloo." Measured, igloo's stone
 * lives inside a **7.9:1** value window sitting ON a mid-value fog, with its
 * body a 20 %-darkened copy of that fog (1.22:1 against its surround). Ours
 * spanned **54.6:1** on a near-black page: body 1.03:1 (mathematically
 * invisible), rim 23:1, sparkle 54:1. Ice is TRANSMISSIVE — against a
 * near-black backdrop the body can only ever be near-black, and the only way
 * to brighten it is an additive term, which on a dark body IS a glow. There
 * is no room below lumLin 0.0069 to be "darker than". So the stone needs a
 * local light world. This is that world.
 *
 * SIZED FOR SERSAN, NOT COPIED. igloo's `k3` fog is at lumLin 0.366 — a light
 * grey-blue page, which on a dark-first navy brand would be vandalism. What
 * transfers is the RELATIONSHIPS at one fifth the absolute level: a core at
 * ≈0.07 lumLin (≈10× the page). Sanity check against what round 7-3 just
 * deleted: the DOM `section-accent-tint` cores measured L ≈ 0.128 blended —
 * this fog is DIMMER than the washes the owner had removed. It is not a
 * return to "vecchi blocchi pagina": same energy, world-scoped, in the right
 * shape, in the right place.
 *
 * QUAD-EDGE HYGIENE (round 7-3 §A.6, load-bearing): the radial falloff
 * reaches EXACTLY 0 inside the quad's own geometry — it never relies on a
 * viewport edge or a section boundary to terminate. There is no rectangle
 * anywhere in the output.
 *
 * ⚠ ACCESSIBILITY GEOMETRY (doc §B4.3, a hard gate): `--ink-mute` over the fog
 * core (composited L 0.0721) is 2.8:1 — WCAG AA FAIL. The falloff is therefore
 * ANISOTROPIC AND ASYMMETRIC: the driver sets `uFogAsym` = (outward x radius ÷
 * inward x radius) where the INWARD radius is the crystal's own distance to
 * the band centre-line, so the left-hand falloff hits exactly 0 AT that
 * centre-line by construction, at every viewport width. The fragment
 * compresses local x < 0 by that ratio before taking the radius — one
 * `select`, no branch divergence worth measuring. The copy column does NOT
 * stop at the centre-line at every width (it crosses it by 37 px at 1280), so
 * read FOG_CLEAR in crystalConfig for the measured per-width derivation: on
 * `broken` the gate is a VALUE gate with 9.6× headroom on alpha, not a
 * no-overlap guarantee, and that is what must be re-checked if the gain, the
 * opacity or the copy measure ever move.
 * ROUND 10-A — on `healthy` the QUAD itself now clears the centre-line.
 * FOG_RADIUS_OUT fell 0.30 → 0.203 with the stone (CRYSTAL_SCALE 0.17 →
 * 0.115), so the outward radius is now SMALLER than the crystal's distance to
 * the centre-line (0.203 < 0.22): `uFogAsym` pins to 1, the quad is symmetric,
 * and its inward bound stops 0.017·w RIGHT of the centre-line at every width.
 * At 1280 the alpha under the copy edge is 0.0011 — below the `Discard` floor
 * below, i.e. not painted there at all. `broken` (0.203 vs 0.17) keeps the
 * asymmetric construction and its numbers verbatim.
 * ⚠ CHECK-ROUND: that is NOT a width-independent guarantee, because the COPY's
 * crossing of the centre-line is not a fixed fraction of the width (`--margin`
 * steps at 768/1024/1280 while the 34em measure barely moves). The quad clears
 * the Discard floor for every viewport ≥ ~1152 px; between ~958 and 1152 px the
 * fog is painted faintly under the copy's right edge, and below ~958 px it
 * crosses the AA break — a PRE-EXISTING condition that this round improves at
 * every width but does not remove, and that cannot be fixed from FOG_CLEAR.
 * The measured per-width table lives on FOG_CLEAR in crystalConfig; read it
 * before quoting "geometric clearance" anywhere.
 *
 * ANCHORING. This quad is a child of CrystalCluster's group, i.e. it is
 * anchored to the thing it serves (round 7-3 §A.6 rule (b)): it tracks the
 * `[data-lattice-anchor]` band exactly as the stone does, arrives and leaves
 * with it, is culled with it, and is swept by the W4 cut like any other GL
 * pixel. It is deliberately NOT pan01-anchored separately: both crystal bands
 * are culled through the singularity passage (the only beat with a camera
 * pan), so a second anchoring frame would buy nothing and could desync the
 * fog from the stone it exists to back.
 *
 * BUDGET: one unit quad, one draw call, ~15 ALU, no textures, no storage
 * buffers, no compute, no per-frame allocation — cheap enough for the lite
 * tier, where the fog matters just as much (the value world is not a garnish).
 * Cross-backend by construction: only ops already proven in crystalBuild /
 * neuralFieldCompute (select/length/smoothstep/pow/max/Discard).
 *
 * COUPLING: this is only HALF the fix. `crystalBuild` never samples the
 * framebuffer — its body comes from the procedural `backdrop()` and it
 * composites at alpha 0.94, so 94 % of the stone is unaffected by anything
 * drawn behind it. The other half is `uBackdropGain` on the crystal, written
 * by CrystalCluster from the SAME driver value as this quad's opacity, so
 * body and surround always track and the 0.79 ratio is constructed rather
 * than coincidental (doc §B3's ⚠).
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (the driver
 * lazy-imports inside its webgpuEnabled()-gated effect — never module scope),
 * exactly like crystalBuild / crystalPlexus.
 */
import { CRYSTAL_FOG_COLOR, FOG_FALLOFF } from "./crystalConfig";

// Loose structural typings — same rationale as crystalBuild.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export interface CrystalFogUniforms {
  /** Multiplier on the fog colour — "how much light". */
  uFogGain: { value: number };
  /** Peak alpha at the core, reveal-ramped by the driver — "how much of the
   * page it occludes". Composited peak lum = lum(colour)·gain·opacity. */
  uFogOpacity: { value: number };
  /** outward-x-radius ÷ inward-x-radius (≥ 1). The a11y clearance: local
   * x < 0 is compressed by this before the radius, so the falloff hits 0 at
   * the band centre-line. 1 = symmetric. */
  uFogAsym: { value: number };
  /** Exponent on smoothstep(1,0,r). 2 = the round-7-3 §B.4 curve verbatim. */
  uFogFalloff: { value: number };
}

export interface CrystalFogBuild {
  geometry: Any;
  material: Any;
  uniforms: CrystalFogUniforms;
  dispose: () => void;
}

/** Unit quad in [-1,1]² — the fragment reads its own local xy as the falloff
 * coordinate, so the driver only has to scale the mesh to the world radii. */
const QUAD_POS = new Float32Array([
  -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

export function createCrystalFog(args: {
  webgpu: Any;
  tsl: Any;
}): CrystalFogBuild {
  const { webgpu, tsl } = args;
  const {
    BufferGeometry,
    BufferAttribute,
    MeshBasicNodeMaterial,
    Color,
    DoubleSide,
  } = webgpu as Any;
  const {
    uniform,
    positionLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    length,
    max,
    pow,
    smoothstep,
    varying,
    select,
    Discard,
  } = tsl as Any;

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(QUAD_POS, 3));
  geometry.setIndex(new BufferAttribute(QUAD_INDEX, 1));

  const uFogGain = uniform(1);
  // DEFAULTS ARE THE SAFE STATE, deliberately — the twin of `uBackdropGain`
  // defaulting to 1 in crystalBuild. `uFogAsym` starts SYMMETRIC (1), which
  // is the one configuration that would put fog under the copy column, so the
  // opacity starts at 0 (not FOG_OPACITY): an un-driven quad — a driver that
  // never runs, a cull that lands between build and first frame — renders
  // nothing at all rather than a full-strength symmetric wash. CrystalCluster
  // writes both every frame, from the same `fogDrive` that writes the body.
  const uFogOpacity = uniform(0);
  const uFogAsym = uniform(1);
  const uFogFalloff = uniform(FOG_FALLOFF);

  // `new Color(hex)` converts sRGB → the linear working space (three's
  // ColorManagement), so .r/.g/.b are the LINEAR channels the luminance
  // arithmetic in crystalConfig is stated in.
  const fog = new Color(CRYSTAL_FOG_COLOR);
  const fogC = vec3(fog.r, fog.g, fog.b);

  const material = new MeshBasicNodeMaterial();
  const mvPos = modelViewMatrix.mul(vec4(positionLocal, 1.0));
  material.vertexNode = Fn(() => cameraProjectionMatrix.mul(mvPos))();

  // Varying discipline (neuralFieldCompute header): a SELF-CONTAINED
  // expression of the attribute, never an outer .toVar() from the vertex Fn.
  const vQuad = varying(positionLocal.xy);

  const shade = Fn(() => {
    const q = vQuad.toVar();
    // a11y clearance: squeeze the inward (page-centre) side so its zero lands
    // on the band centre-line while the outward side keeps the full radius.
    const xs = select(q.x.lessThan(0.0), q.x.mul(uFogAsym), q.x);
    const r = length(vec2(xs, q.y));
    // Exactly 0 at r ≥ 1 — INSIDE the quad's own bounds. `max(…, 1e-6)` only
    // keeps pow() off the undefined-at-zero corner of the GLSL spec; the
    // result there is ~1e-8 and the Discard below removes it entirely.
    const f = max(smoothstep(float(1.0), float(0.0), r), float(1e-6));
    const a = pow(f, uFogFalloff).mul(uFogOpacity).toVar();
    Discard(a.lessThan(0.002));
    return vec4(fogC.mul(uFogGain), a);
  })();

  material.colorNode = (shade as Any).xyz;
  material.opacityNode = (shade as Any).w;
  material.transparent = true;
  // NORMAL blending, not additive: the composited core then lands EXACTLY at
  // the authored value (lum·gain·opacity) instead of at page+fog, which is
  // what makes the 0.79 body/surround ratio checkable rather than emergent.
  // Over the near-black page the two are numerically almost identical anyway.
  material.depthWrite = false; // never occlude the depth-tested SignatureLine
  material.depthTest = false; // pure backdrop wash; renderOrder owns the order
  material.toneMapped = false;
  material.side = DoubleSide;

  const uniforms: CrystalFogUniforms = {
    uFogGain,
    uFogOpacity,
    uFogAsym,
    uFogFalloff,
  };

  return {
    geometry,
    material,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

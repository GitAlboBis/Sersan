/**
 * Crystal-cluster build — the WebGL half of ROUND-5 W3 (the igloo "3D
 * stones" transplant, research/2026-08-21-igloo-stones-dossier.md). Pure
 * vertex/fragment node material: NO storage buffers, NO compute, NO textures
 * — the same graph compiles on the true-WebGPU backend AND the three/webgpu
 * WebGL2 fallback (only cross-backend TSL ops: the neuralFieldCompute /
 * PostFXNodes proven set plus dot/cross/sqrt, all core WGSL/GLSL builtins).
 *
 * GEOMETRY — ROUND 8-H: THE AUTHORED SLAB (primary path; research/
 * 2026-08-22-round8-blender-slab-log.md). The procedural icosahedron below is
 * now the FALLBACK only (asset 404 / parse failure).
 *   healthy → `public/models/crystal-intact.glb` (450 tris, 1 328 verts,
 *     83.7 KB): a Blender-authored slab — tilted block, 20 half-space cleaves,
 *     vector erosion, 2 boolean bites, collapse-decimated — hitting all four
 *     igloo silhouette gates (fillRatio 0.4725, concave 6.33 %, largest-1 %
 *     faces 6.22 %, dihedral p99 123.5°). THE point of the swap: it carries
 *     **34 planar patches, six of which cover 50 % of the surface, the largest
 *     19 %**, where `IcosahedronGeometry(1,12)` has ZERO coplanar patches (all
 *     3 380 triangles are their own facet). Refraction needs contiguous
 *     constant-normal regions to read as glass rather than as noise. ⚠ ROUND
 *     9-C AMENDS THE MARK HALF OF THIS CLAIM: the in-ice mark's confetti was
 *     the SAMPLING MAP, not the tessellation (see the ROUND 9-C block below and
 *     crystalConfig MARK_GAIN). The slab still earns its keep on the material —
 *     it just was not what MARK_GAIN 0.35 → 2.4 was fighting.
 *   broken  → `public/models/crystal-fractured.glb` (1 114 tris, 160 KB): the
 *     SAME slab partitioned by an exact power/Laguerre diagram into 8 pieces
 *     whose volumes match SHARD_SIZES³ (46/30/10/6.3/2.7/2.4/1.2/0.7 %),
 *     shipped at gap = 0 (the pieces tile the slab exactly) with igloo's
 *     centr/rand attribute contract baked in. The vertex path is UNCHANGED and
 *     still applies igloo's exact explode recipe: pos += centr·(gap +
 *     rand.y·sin(rand.x·5 + t·0.5)·0.05), plus per-shard rotate3D(pos − centr,
 *     axis(rand), angle) — `_RAND` is a bit-exact twin of this file's own h(),
 *     so the motion grammar did not change when the geometry did. ⚠ The recipe
 *     did not change but its SCALE did: authored |centr| runs 0.70…1.58 where
 *     the procedural spiral ran 0.42…0.84, so the rest gap had to come down
 *     with it or the cluster explodes out of its band (CHECK — see
 *     `restGap` below and FRACTURE_REST_GAP_AUTHORED in the config).
 *   The GLB's custom attributes are renamed on load (`_CENTR`/`_RAND`/`_FACET`
 *     → `aCentr`/`aRand`/`aFacet`; note three's GLTFLoader LOWERCASES unknown
 *     glTF semantics) after `toNonIndexed()`. `_FACET` ships per PLANAR PATCH,
 *     NOT per triangle — `bakeFacetRand()` must NOT be re-run on it or every
 *     large plane would be speckled with per-triangle brightness and the
 *     coherence this round bought would be destroyed at the shading level.
 *     `displaceAndSquash()` / CRYSTAL_SQUASH are likewise NOT re-applied: the
 *     .84/1/.65 proportions are baked, and an anisotropic scale after
 *     authoring would shear every facet normal.
 *   Both files are UNCOMPRESSED on purpose (Draco twins exist alongside): the
 *     repo has no DRACOLoader wiring anywhere, and shipping the ~200 KB
 *     decoder to save 35 KB gzipped is a net loss on first load.
 *
 * GEOMETRY (procedural FALLBACK — the round-5..7 path, dossier plan §1):
 *   healthy → ONE intact crystal: non-indexed IcosahedronGeometry displaced
 *     CPU-side by 2-octave fractal noise (0.34 amplitude, low octave terraced
 *     — round 7), squashed
 *     (1, 1.45, 0.85) for the shard silhouette, computeVertexNormals AFTER
 *     the squash → per-face FLAT normals (non-indexed), the facets that sell
 *     crystal.
 *   broken  → a FRACTURED CLUSTER of shards merged into ONE BufferGeometry
 *     (single draw call): each shard its own small displaced flat-shaded
 *     icosahedron baked AROUND its centroid, with per-VERTEX `aCentr` (offset
 *     from cluster center) + `aRand` (vec3) constant across the shard —
 *     igloo's centr/rand attribute contract.
 *
 * MATERIAL — custom TSL fake transmission (NOT drei MeshTransmissionMaterial:
 * that is GLSL/onBeforeCompile, dead on three/webgpu). The dossier §2 loop
 * with ONE structural substitution: the "screen texture sample" becomes a
 * PROCEDURAL BACKDROP evaluated in-shader at the refracted direction — a navy
 * diagonal gradient, noise-modulated like the mined `diagonalGradient`, with
 * two sharp cyan bloom spots — so there is NO RT, NO second pass, NO texture
 * bindings. 3 samples (1 on lite), per-channel ior·(1 + k·CA·(i+noise)/3)
 * with k = 0/1/2, thickness smear thick·pow(rough, .33), normal jitter
 * rough²·2·normalize(noiseVec); hash noise (the repo's sin-dot family) stands
 * in for igloo's blue-noise texture.
 *
 * ROUND 7 — the igloo REALISM pass (owner: "not so bland"). All procedural,
 * zero new bindings (aFacet is a vertex-buffer slot, not a binding):
 *   1. 2-lobe environment — white-cyan key spec lobe pow(max(dot(N,H),0),
 *      SPEC_POW) + navy fill, with a baked per-FACE random (aFacet) tilting
 *      the lobe normal + jittering brightness → per-facet value separation
 *      (facets flash independently as the crystal tumbles).
 *   2. Dark glass body (trans × uBodyDarken — darker than the backdrop
 *      mid-tone) under a BRIGHT rim: RIM_BASE past 1.0 into bloom at grazing,
 *      per-channel fresnel exponents (RIM_DISPERSION) → spectral fringe, and
 *      fresnel-boosted CA (uCAEdge) → dispersion concentrated on the
 *      silhouette.
 *   3. Sparkle glints — hash cells over vLocal, per-cell micro-normal gated
 *      on view/normal/light alignment (pow 90) + a slow time wink; gain >1.0
 *      so single pixels bloom. FULL TIER ONLY.
 *   4. Frost grain — 3D value noise over vLocal modulating roughness /
 *      thickness / body density → internal veins instead of uniform glass.
 *      FULL TIER ONLY (lite keeps the cheap facet lobe, drops sparkle+frost).
 *
 * ROUND 7-2b — the igloo ANATOMY pass (research/2026-08-22-round7-stones-v2-
 * anatomy.md, Part B). On top of the R7-2 realism pass:
 *   a. INNER OBJECT (§B-a) — healthy + full tier + proven backend: the SERSAN
 *      mark rendered unlit into a mipmapped RT (crystalMarkRT.ts, driven from
 *      CrystalCluster's existing useFrame) and sampled ADDITIVELY with igloo's
 *      exact lod law — lod = log2(rtSize)·roughEff·0.36 — so the frost veins
 *      modulate its softness and refraction swims it through the relief (the
 *      brand-in-ice twin of igloo's penguin). ONE TextureNode base, tapped via
 *      .sample().level() (reference chaining) = exactly +2 fragment bindings
 *      (texture + sampler); no other build gets the branch. ⚠ ROUND 9-C
 *      rewrote WHERE it is sampled — see below.
 *      Broken + full tier instead gets the EMBER CORE — a 2–3-blob gaussian
 *      SDF (cluster center + two blobs riding the LARGE shards' centroids,
 *      explode-tracking) evaluated at the k=0 refracted point, desaturated
 *      amber, dimming as the gap explodes / brightening on re-cohere,
 *      sub-bloom by construction. Zero bindings.
 *   b. WET-ICE RIPPLE (§B-b, full tier) — two crossed sine wave trains +
 *      vnoise3 phase-warp over vLocal perturb the SHARED shading normal
 *      (analytic tangential gradient, view-space dirs via constant varyings)
 *      BEFORE fresnel/lobes/refraction — igloo's authored normal map feeds
 *      both, so the key lobe shimmers across facets AND the inner world
 *      (backdrop + mark) wobbles through the relief. Nj jitter rides ON TOP.
 *   c. WARM GLINT LOBE (rollout 4, full tier) — a third, narrow env lobe
 *      (pow 24) in desaturated amber, gain ≤0.25: the §A3 mechanism twin of
 *      igloo's env-map warm patches sweeping the ripple. Sub-bloom.
 *
 * ROUND 8-E — THE VALUE WORLD (research/2026-08-22-round8-stone-source-
 * anatomy.md, Part B + §D3). Rounds 5–7 built the right MATERIAL in the wrong
 * WORLD. Measured: igloo's whole stone lives in a 7.9:1 window sitting on a
 * mid-value fog, its body a 20 %-darkened copy of its surround (1.22:1);
 * ours spanned 54.6:1 on a near-black page — body 1.03:1 (invisible), rim
 * 23:1, sparkle 54:1. Exactly two defects: the absolute floor was 54× too low
 * and the highlight-to-body ratio 167× too wide. Four changes here, all
 * procedural, zero new bindings:
 *   1. `uBackdropGain` multiplies `backdrop()`'s NAVY FIELD (not its authored
 *      cyan spots — gaining those ×8 would put a spot centre at lumLin 3.8, a
 *      hard bloom star). This is the LOAD-BEARING half of the fog fix: the
 *      crystal never samples the framebuffer and composites at alpha 0.94, so
 *      the fog quad behind it (crystalFog.ts) reaches only 6 % of the body.
 *      CrystalCluster writes this uniform and the fog's opacity from ONE
 *      driver value, so the 0.79 body/surround ratio is CONSTRUCTED, not the
 *      coincidence of two independent constants it used to be.
 *   2. HIGHLIGHT COMPRESSION + a value CEILING (`uCeil`, igloo's
 *      `clamp(outgoingLight, 0, 1)` mechanism at a brand-scaled level). The
 *      config gains fall rim 1.6→0.35, sparkle 3.5→0.5, spec 1.15→0.5, mark
 *      1.6→0.35 (ember goes the other way, 0.3→0.5, because it is added AFTER
 *      the body multiply). The site's >1.0 selective-bloom contract survives
 *      as a HAIRLINE: `uRimEdge` on a smoothstep(uRimEdgeStart,1,f1) gate
 *      lifts only the extreme-grazing band past the threshold.
 *   3. TEXTURE BAND SEPARATION (§A2/§D1): ripple 8→26 cycles/unit at 1/7 the
 *      amplitude, frost 5.5→0.9 — 1.45× apart becomes 28.9× (igloo ≈32×), so
 *      the relief reads WET (one cycle per ~9.6 screen px) and the frost reads
 *      as broad glassy/frosted zoning instead of both mudding into one
 *      mid-frequency corrugation.
 *   4. An ANALYTIC AMBIENT HEMISPHERE (§D3) — we had NO ambient term at all,
 *      hence binary lit/unlit facets and a body that could go fully black.
 *      mix(p25, p75, N.y·.5+.5) on igloo's measured env-map distribution,
 *      cool-tinted with the measured 8.7 % warm fraction folded in at build
 *      time: ~6 ALU, zero textures, zero PMREM, zero repo assets.
 * Nothing from igloo's asset set enters this repo; only the NUMBERS did.
 *
 * ROUND 8-H — WHAT THE AUTHORED SLAB DOES TO THE VALUE WORLD. The material is
 * unchanged; the geometry underneath it is not, and exactly one term had to be
 * re-levelled because of it. The key lobe's PEAK is unchanged, but its AREA is
 * not: a lit patch used to be one of ~3 380 micro-triangles (the eye
 * integrated a mottled highlight), and is now up to 19 % of the surface in one
 * flat piece. So the per-facet constants — which existed to fake normal
 * variety on a mesh that had none — were cut against the round-8-F value table
 * (crystalConfig FACET_JITTER / FACET_SPEC_JIT / FACET_VALUE_JIT / SPEC_GAIN),
 * chosen so the brightest ordinary pixel lands back on 0.276 lumLin ≈ 7.0× the
 * body INCLUDING the per-patch jitter (8-F quoted 0.277 with the jitter
 * ignored, which the old 1.4× spec-jitter ceiling silently pushed to 0.388).
 * Everything else in the value world is geometry-invariant and was re-checked
 * rather than assumed: the analytic ambient hemisphere's TYPICAL value is
 * exactly unchanged because ∮N dA = 0 over any closed surface (so the
 * area-weighted mean of N.y is 0 → mean hemi 0.5 → 0.0142 lumLin, as derived),
 * only its variance is chunkier; `backdrop()` / frost / ripple / sparkle are
 * all functions of vLocal, not of tessellation; the fade + Discard contract
 * reads alpha only. The body's typical value is unchanged at 0.0396 (the
 * facet-value-jitter MEAN stays 1.0 by construction).
 *
 * ROUND 9-C — THE IN-ICE MARK GETS IGLOO'S ACTUAL MAP (research/2026-08-22-
 * round9-inner-object-mechanism.md, Variant A). Owner: "voglio che si veda il
 * logo, devi capire come è fatto quello di igloo." The bundle answers it: igloo
 * samples its transmission RT in SCREEN SPACE — refract the view ray, walk
 * `thickness·modelScale`, project the exit point through proj·view, /w,
 * ·0.5+0.5, sample there. Coherence is STRUCTURAL, because projecting kills the
 * along-ray component exactly (project(p + λ·Î) ≡ project(p)); only `T·sin δ`
 * survives, and the subject lands where the subject is.
 * Ours did the opposite: `uv = vLocal.xy·0.22 + refrDirView.xy·0.495 + 0.5` —
 * an ORTHOGRAPHIC projection along the crystal's own LOCAL Z (which FOLDS once
 * the tumble swings that axis past ~75° of the view axis, and it reaches 90°
 * inside a normal scroll pass) plus an un-cancelled view-space direction, in
 * mixed bases: ±117 px of facet-to-facet jump on a ~500 px mark. THAT was the
 * confetti — not the subject, and not the facet count (round 8-I's "34 planes =
 * 34 independent images" is retracted at crystalConfig MARK_GAIN).
 * The replacement, in the `if (markBase)` block below: project BOTH the exit
 * point and the crystal origin, difference them, normalise by the mark's
 * projected half-extent — i.e. intersect each fragment's view ray with a
 * screen-facing billboard of half-extent `uMarkHalf` pinned at the crystal's
 * centre. Model scale, fov, aspect, viewport and DPR all cancel (the depth
 * RATIO does not — that is the perspective, and the off-axis parallax it gives
 * the mark is wanted); the refraction survives as a bounded displacement
 * `Δ(markUv) = uMarkThick·sin δ/(2·uMarkHalf) ≤ 0.152 uv`. The full algebra is
 * written out at the block itself. New knobs MARK_THICKNESS
 * 0.35 (decoupled from CRYSTAL_THICKNESS — the facet-to-facet swim drops from
 * 4–15 % of the mark's own height to 1.5–6 %) and MARK_WORLD_HALF 1.15 (mark at
 * 60 % of the slab's height instead of a cropped 119 %), plus MARK_FLIP_Y −1
 * (three's RT-texture uv convention is y-DOWN on both backends — derived from
 * the three source at the config constant, NOT left to the browser). Both
 * figures are viewport-invariant by the cancellation above; the pixel forms are
 * on the config constants. The mark takes ONE tap instead of nine; the
 * backdrop's dispersion is untouched. Compositing is byte-identical, so the
 * 8-E/8-F/8-H/8-I value world stands unchanged.
 *
 * FOG ADAPTATION (dossier §5): igloo's opaque mix(bg, color, vFade) repaint
 * would paint solid navy over the DOM (our canvas is transparent) — instead
 * the SAME `falloffsmooth(camDist…)` window fades ALPHA, in crystal-local
 * units relative to the cluster center (uCamDist0 / uWorldScale are
 * driver-written), so deep/back shards dissolve into the page navy.
 *
 * VARYING DISCIPLINE (load-bearing, see neuralFieldCompute header): every
 * varying is a SELF-CONTAINED expression of attributes + uniforms, and the
 * SAME nodes feed the vertex body — never an outer .toVar() assigned from
 * the vertex Fn.
 *
 * All `three/webgpu` + `three/tsl` symbols are passed IN (the driver
 * lazy-imports inside its webgpuEnabled()-gated effect — never module scope).
 */
import {
  CRYSTAL_DETAIL,
  CRYSTAL_DETAIL_LITE,
  SHARD_DETAIL,
  SHARD_DETAIL_LITE,
  SHARD_COUNT,
  SHARD_COUNT_LITE,
  CRYSTAL_NOISE_FREQ,
  CRYSTAL_NOISE_AMP,
  CRYSTAL_NOISE_AMP2,
  CRYSTAL_FACET_QUANT,
  CRYSTAL_FACET_MIX,
  CRYSTAL_SQUASH,
  SHARD_RADIUS,
  SHARD_SIZES,
  CHIP_SCATTER,
  SHARD_SPREAD_MIN,
  SHARD_SPREAD_MAX,
  FRACTURE_REST_GAP,
  FRACTURE_REST_GAP_AUTHORED,
  CRYSTAL_IDLE_DRIFT,
  SHARD_SPIN,
  CRYSTAL_IOR,
  CRYSTAL_CA,
  CA_EDGE_BOOST,
  CRYSTAL_THICKNESS,
  CRYSTAL_ROUGH,
  CRYSTAL_SAMPLES,
  CRYSTAL_SAMPLES_LITE,
  REFR_OFFSET_SCALE,
  BACKDROP_COORD_SCALE,
  BACKDROP_NAVY,
  BACKDROP_NAVY2,
  BACKDROP_CYAN,
  BACKDROP_SPOTS,
  BACKDROP_SPOT_GAIN,
  FACET_KEY_DIR,
  FACET_FILL_DIR,
  FACET_KEY_COLOR,
  FACET_FILL_COLOR,
  SPEC_POW,
  SPEC_GAIN,
  FILL_GAIN,
  FACET_JITTER,
  FACET_SPEC_JIT,
  FACET_VALUE_JIT,
  BODY_DARKEN,
  SPARKLE_FREQ,
  SPARKLE_TILT,
  SPARKLE_POW,
  SPARKLE_DENSITY,
  SPARKLE_TWINKLE,
  SPARKLE_GAIN,
  FROST_FREQ,
  FROST_AMP,
  FROST_ROUGH_K,
  FROST_THICK_K,
  FROST_DENSITY_K,
  FRESNEL_POW,
  RIM_BASE,
  RIM_FLASH_GAIN,
  RIM_DISPERSION,
  RIM_WHITEN,
  CRYSTAL_ALPHA,
  FADE_FROM,
  FADE_TO,
  FADE_MARGIN,
  FADE_PROGRESS,
  FADE_MAX,
  // Round 7-2b (anatomy pass)
  MARK_RT_SIZE,
  MARK_GAIN,
  MARK_LOD_K,
  // Round 9-C — the origin-registered perspective map (MARK_COORD_SCALE and
  // the mark's use of REFR_OFFSET_SCALE are REMOVED; see the config).
  MARK_THICKNESS,
  MARK_WORLD_HALF,
  MARK_FLIP_Y,
  EMBER_COLOR,
  EMBER_GAIN,
  EMBER_DEPTH,
  EMBER_R0,
  EMBER_R1,
  EMBER_SHARDS,
  EMBER_GAP_DIM,
  EMBER_FLICKER,
  RIPPLE_FREQ,
  RIPPLE_AMP,
  RIPPLE_WARP,
  RIPPLE_WARP_FREQ,
  RIPPLE_DIR1,
  RIPPLE_DIR2,
  RIPPLE_F2,
  RIPPLE_A2,
  WARM_DIR,
  WARM_COLOR,
  WARM_POW,
  WARM_GAIN,
  // Round 8-E (the value world). NOTE: BACKDROP_GAIN is deliberately NOT
  // imported here — `uBackdropGain` defaults to 1 (exact back-compat) and is
  // ramped to that target by CrystalCluster from the same driver value that
  // sets the fog quad's opacity. The coupling is the point.
  CRYSTAL_CEIL,
  RIM_EDGE_START,
  RIM_EDGE_GAIN,
  AMBIENT_DOWN,
  AMBIENT_UP,
  AMBIENT_COOL,
  AMBIENT_WARM_MIX,
  AMBIENT_GAIN,
  // ROUND 14 — ICE UPGRADE (every stage behind its own kill-switch; see the
  // config block for the value-world derivations).
  ICE_ABSORB,
  ABSORB_COLOR,
  ABSORB_REF_CHORD,
  ABSORB_MIX,
  ABSORB_MILK,
  THICK_PROXY_A,
  THICK_PROXY_B,
  REFR_SCREEN,
  REFR_SCREEN_THICK,
  REFR_SCREEN_LOD_K,
  REFR_SCREEN_BLUR_PX,
  REFR_SCREEN_TAPS,
  REFR_SCREEN_MIX,
  ICE_ENV,
  ENV_GAIN,
  ENV_F0,
  COAT_ROUGH,
  COAT_GAIN,
  ICE_INNER,
  FROST_LAYER_DEPTHS,
  FROST_LAYER_FREQ,
  FROST_LAYER_MILK,
  FROST_MILK_FREQ,
  FROST_LAYER_COLOR,
  INNER_GAIN,
  INNER_ATTEN,
  CRACK_LO,
  CRACK_HI,
  CRACK_GAIN,
  MILK_GAIN,
  ICE_SPARKLE2,
  SPARKLE_FREQ2,
  SPARKLE2_TILT,
  SPARKLE2_POW,
  SPARKLE2_DENSITY,
  SPARKLE2_GAIN,
  SPARKLE2_FADE_PX,
  ICE_BLOOM_GLINTS,
  GLINT_BLOOM_GAIN,
  GLINT_BLOOM_DENSITY,
  ENV_EDGE_GAIN,
  // ROUND 14 WAVE 2 — the frosted meteorite (four kill-switches; config block
  // "ROUND 14 WAVE 2" carries the value-world argument).
  ICE_TWO_PASS,
  INNER_SAMPLES,
  INNER_UNPREMUL,
  CRUST_CURV_PER_SHARD,
  INNER_LOD_K,
  INNER_THICK,
  INNER_CA,
  INNER_MIX,
  ICE_CRUST,
  CRUST_GAIN,
  CRUST_RIDGE_POW,
  CRUST_FACE_FLOOR,
  CRUST_LEVEL,
  CRUST_BODY_K,
  CRUST_ALPHA_K,
  CRUST_COLOR_FACE,
  CRUST_COLOR_RIDGE,
  CRUST_FRACTURE_K,
  GRAIN_STRETCH,
  GRAIN_FREQ,
  GRAIN_NORMAL_AMP,
  GRAIN_ROUGH_K,
  ICE_METEORITE,
  METEORITE_ABSORB,
  METEORITE_ABSORB_MIX,
  INCLUSION_GAIN,
  INCLUSION_FREQ,
  INCLUSION_R,
  METEOR_APERTURE,
  METEOR_APERTURE_PROCEDURAL,
  METEOR_PEAK_GAIN,
} from "./crystalConfig";
import type { LatticeMode } from "./neuralLatticeConfig";

// Loose structural typings — the real node/namespace types are vast & generic
// (same rationale as gpgpuNodeSim.ts / neuralFieldCompute.ts).
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

// === ROUND 8-H — the authored slab assets ===================================
/** Blender-authored, verified in `research/2026-08-22-round8-blender-slab-
 * log.md` §7. UNCOMPRESSED variants are the primary ones on purpose: the repo
 * wires no DRACOLoader anywhere (HeroLogo/RouteHeroGlb use drei `useGLTF`,
 * RouteHeroLogo a bare `new GLTFLoader()`, and `sersan-mark.glb` itself ships
 * uncompressed), so the ~200 KB decoder would cost more than the 35 KB gzipped
 * it saves. `crystal-*.draco.glb` sit next to these if that ever flips. */
const CRYSTAL_GLB: Record<"healthy" | "broken", string> = {
  healthy: "/models/crystal-intact.glb",
  broken: "/models/crystal-fractured.glb",
};

/** Module-level cache: ONE fetch, ONE parse per variant for the session.
 * Resolved value is a MODULE SINGLETON — consumers must NEVER dispose it
 * (createCrystalBuild builds its own `toNonIndexed()` copy and disposes only
 * that). `null` = load failed → the procedural fallback geometry. */
const crystalGeoPromises: Partial<
  Record<"healthy" | "broken", Promise<Any | null>>
> = {};

/**
 * Load the authored slab for a mode. NON-SUSPENDING by construction — the
 * RouteHeroLogo.loadMarkGeometry idiom (a module-cached loader promise the
 * driver awaits inside its existing lazy-build effect), NOT `useGLTF` +
 * Suspense: a Suspense left pending inside the R3F-bridged tree wedges the
 * island's update queue (see the RouteHeroLogo header post-mortem). The
 * GLTFLoader chunk itself stays out of the island bundle via this dynamic
 * import, and the whole module is already behind CrystalCluster's lazy import.
 */
export function loadCrystalGeometry(mode: LatticeMode): Promise<Any | null> {
  const key = mode === "broken" ? "broken" : "healthy";
  let p = crystalGeoPromises[key];
  if (!p) {
    p = import("three/examples/jsm/loaders/GLTFLoader.js")
      .then(
        ({ GLTFLoader }) =>
          new Promise<Any>((resolve, reject) =>
            new GLTFLoader().load(CRYSTAL_GLB[key], resolve, undefined, reject),
          ),
      )
      .then((gltf: Any) => {
        let src: Any = null;
        gltf.scene.traverse((n: Any) => {
          if (!src && n.isMesh) src = n;
        });
        if (!src) return null;
        // Clone so the loader's own graph can be garbage-collected.
        return src.geometry.clone();
      })
      .catch((err: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[crystalBuild] authored slab load failed", err);
        }
        return null;
      });
    crystalGeoPromises[key] = p;
  }
  return p;
}

export interface CrystalUniforms {
  uTime: { value: number };
  /** 0→1 section reveal (driver: scrollStore.reveal × visibility ramp). */
  uReveal: { value: number };
  /** 0→1 rim ignition — healthy: eased ring flashes; broken: the re-cohere
   * envelope. Pushes the fresnel rim past 1.0 (selective bloom). */
  uFlash: { value: number };
  /** Explode gap (broken; dead node on healthy). Rest ≈ FRACTURE_REST_GAP,
   * breathes with the fracture surges, →~0 on the row-hover re-cohere. */
  uGap: { value: number };
  /** Camera→cluster-center distance in WORLD units (driver-written). */
  uCamDist0: { value: number };
  /** The group's uniform world scale (crystal-unit normalizer). */
  uWorldScale: { value: number };
  // --- live tunables (dev-handle surfaced; igloo numbers as defaults) -------
  uIor: { value: number };
  uCA: { value: number };
  uThickness: { value: number };
  uRough: { value: number };
  uRimBase: { value: number };
  uRimFlash: { value: number };
  uAlpha: { value: number };
  uFadeProgress: { value: number };
  uSpotGain: { value: number };
  uDrift: { value: number };
  uShardSpin: { value: number };
  // --- round-7 realism tunables (dev-handle surfaced) -----------------------
  /** Dark-glass body gain on the transmitted color (< 1 = meteorite read). */
  uBodyDarken: { value: number };
  /** Key-lobe exponent (lowish — whole facets flash). */
  uSpecPow: { value: number };
  /** Key-lobe gain (white-cyan sun). */
  uSpecGain: { value: number };
  /** Navy fill-lobe gain. */
  uFillGain: { value: number };
  /** Per-facet lobe-normal tilt (aFacet driven). */
  uFacetJit: { value: number };
  /** Fresnel CA boost — dispersion concentrated on the silhouette. */
  uCAEdge: { value: number };
  /** Sparkle glint gain (>1 blooms; dead node on lite — branch not built). */
  uSparkleGain: { value: number };
  /** Frost-grain master amplitude (dead node on lite). */
  uFrostAmp: { value: number };
  // --- round-7-2b anatomy tunables (dev-handle surfaced) --------------------
  /** Wet-ice ripple normal amplitude (dead node on lite). */
  uRippleAmp: { value: number };
  /** Warm glint lobe gain (dead node on lite). */
  uWarmGain: { value: number };
  /** Broken ember-core gain (dead node on healthy / lite). */
  uEmberGain: { value: number };
  /** Mark additive gain (dead node unless the mark branch is built — healthy
   * + full + markTexture). */
  uMarkGain: { value: number };
  /** ROUND 9-C — the mark's transmission-ray length in CRYSTAL units (igloo's
   * `thickness`, scaled by modelScale in-shader). THE swim knob: it moves the
   * refractive DISPLACEMENT only, Δ(markUv) = uMarkThick·sin δ/(2·uMarkHalf) uv
   * ≤ 0.152 — the mark's placement is the projective identity and is
   * independent of it. Dead node like uMarkGain. */
  uMarkThick: { value: number };
  /** ROUND 9-C — crystal-unit half-extent mapped to the RT's uv edge (LOWER =
   * BIGGER mark). Dead node like uMarkGain. */
  uMarkHalf: { value: number };
  /** ROUND 9-C — RT origin-convention flag. **−1**, derived from the three
   * source (three's RT-texture uv convention is y-DOWN on both backends; see
   * config MARK_FLIP_Y). +1 renders the mark upside-down. Dead node like
   * uMarkGain. */
  uMarkFlipY: { value: number };
  // --- round 8-E value-world tunables (dev-handle surfaced) ----------------
  /** ROUND 8-E §B4.2 part 2 — gain on `backdrop()`'s navy field. Default 1
   * (exact back-compat); CrystalCluster ramps it to BACKDROP_GAIN from the
   * SAME driver value that sets the fog quad's opacity, so the body and its
   * surround always track. THE load-bearing half: the crystal composites at
   * alpha 0.94, so a fog behind it reaches only 6 % of the body. */
  uBackdropGain: { value: number };
  /** ROUND 8-E §D3 — analytic ambient-hemisphere master gain. Gives the body
   * a FLOOR (the stone can no longer go fully black) at ~6 ALU. */
  uAmbGain: { value: number };
  /** ROUND 8-E §B4.2 part 3 — the value CEILING (igloo's clamp mechanism).
   * Set 1.0 for the igloo-faithful "no crystal bloom" variant. */
  uCeil: { value: number };
  /** Grazing band where the bloom hairline starts, on f1 = 1 − dot(N,V). */
  uRimEdgeStart: { value: number };
  /** Hairline gain — the ONLY term left above the bloom threshold. 0 = the
   * igloo-faithful variant (no pinpoint bloom on the crystal at all). */
  uRimEdge: { value: number };
  // --- ROUND 14 — ICE UPGRADE tunables (dev-handle surfaced) ---------------
  /** Stage B — reference chord (crystal units) at which the body transmits
   * ABSORB_COLOR; per mode (config ABSORB_REF_CHORD). Both tiers. */
  uAbsorbRef: { value: number };
  /** Stage B — 0 = the flat uBodyDarken multiply, 1 = pure Beer–Lambert. */
  uAbsorbMix: { value: number };
  /** Stage B — milky desaturation of deep paths. */
  uAbsorbMilk: { value: number };
  /** Stage A — transmission-ray length (crystal units). Dead node unless the
   * screen-refraction branch is built (full + WebGPU / REFR_SCREEN_WEBGL2). */
  uScreenThick: { value: number };
  /** Stage A — mip lod factor on log2(screenSize.x)·roughEff. Dead as above. */
  uScreenLodK: { value: number };
  /** Stage A — Vogel tap radius in px at roughness 1. Dead as above. */
  uScreenBlurPx: { value: number };
  /** Stage A — framebuffer-over-backdrop blend; 0 = live off-switch. */
  uScreenMix: { value: number };
  /** Stage C — inner frost/crack master gain (dead node on lite). */
  uInnerGain: { value: number };
  uInnerAtten: { value: number };
  uCrackLo: { value: number };
  uCrackHi: { value: number };
  uCrackGain: { value: number };
  uMilkGain: { value: number };
  /** Stage D — env-specular gain (dead node unless envTexture was passed). */
  uEnvGain: { value: number };
  uCoatRough: { value: number };
  uCoatGain: { value: number };
  /** Stage E — fine sparkle gain (dead node on lite). */
  uSparkle2Gain: { value: number };
  /** Stage F — post-ceiling bloom glint gain (dead node on lite). */
  uGlintBloom: { value: number };
  /** Stage F — post-ceiling env hairline gain (dead unless env branch). */
  uEnvEdge: { value: number };
  // --- ROUND 14 WAVE 2 — frosted meteorite tunables (dev-handle surfaced) ---
  /** Two-pass — lod factor on log2(rtSize)·roughEff (dead unless the inner
   * RT branch was built: full + ICE_TWO_PASS + innerTexture). */
  uInnerLodK: { value: number };
  /** Two-pass — transmission-ray length to the inner object (crystal units).
   * Dead as above. */
  uInnerThick: { value: number };
  /** Two-pass — chromatic spread of the inner ladder. Dead as above. */
  uInnerCA: { value: number };
  /** Two-pass — RT-over-trans blend by the RT's alpha; 0 = live off. */
  uInnerMix: { value: number };
  /** Two-pass — log2 of the RT's longest side; the DRIVER writes it after a
   * resize (crystalInnerRT.log2Size). Dead as above. */
  uInnerLog2: { value: number };
  /** Crust — master frost gain (0 = live off; both tiers when ICE_CRUST). */
  uCrustGain: { value: number };
  /** Crust — ridge sharpening exponent on the baked curvature. */
  uCrustRidgePow: { value: number };
  /** Crust — striation normal perturbation amplitude (dead on lite). */
  uGrainNormalAmp: { value: number };
  /** Crust — roughness raise under the crust (dead on lite). */
  uGrainRoughK: { value: number };
  /** Meteorite — dark inclusion gain (dead unless inner layers + meteorite). */
  uInclusionGain: { value: number };
}

export interface CrystalBuild {
  geometry: Any;
  material: Any;
  uniforms: CrystalUniforms;
  /** Broken only: per-shard cluster-center offsets [x,y,z]·count — the
   * driver's callout anchors ride these (empty on healthy). */
  shardCentrs: number[][];
  /** Broken only: the per-shard rand vec3s (idle-drift twin math). */
  shardRands: number[][];
  /** ROUND 8-H (CHECK) — the rest explode gap THIS build was levelled for:
   * FRACTURE_REST_GAP_AUTHORED on the authored partition (centroids ~1.9×
   * longer), FRACTURE_REST_GAP on the procedural fallback, 0 on healthy. The
   * driver must read it from here — the explode offset is `centr·gap`, so the
   * constant is only meaningful next to the `centr` array it ships with. */
  restGap: number;
  /** ROUND 15 — the APERTURE rate this build was levelled for (crystalConfig
   * METEOR_APERTURE / METEOR_APERTURE_PROCEDURAL divided by the full-open
   * gap). The vertex explode floors its multiplier at `apertureK·gap / |centr
   * .xy|`; the callout projection twin in CrystalCluster MUST read the rate
   * from here for the same reason it reads `restGap` from here — one source,
   * or the leader lines detach from the shards they point at. 0 on healthy
   * (no explode at all). */
  apertureK: number;
  /** ROUND 14 — which ice stages this build actually compiled (dev handle). */
  ice: {
    /** "baked" = per-vertex aThick chord (authored slab), "proxy" = analytic. */
    thickness: "baked" | "proxy" | "off";
    screenRefraction: boolean;
    env: boolean;
    inner: boolean;
    sparkle2: boolean;
    bloomGlints: boolean;
    // ROUND 14 WAVE 2
    /** The inner-RT (two-pass) sample branch was built. */
    twoPass: boolean;
    /** Frost crust branch; `curvature` says whether `aCurv` was baked. */
    crust: boolean;
    curvature: "baked" | "off";
    /** Meteorite absorption hue + inclusions. */
    meteorite: boolean;
    /** Wave-1 mark-RT branch (healthy, MARK_INSIDE_MESH false). */
    markRt: boolean;
  };
  dispose: () => void;
}

export interface CrystalBuildArgs {
  webgpu: Any;
  tsl: Any;
  mode: LatticeMode;
  /** fxBudget level 2 build: 1 dispersion sample, single-octave noise
   * (geometry + backdrop), lower subdivision detail. */
  lite: boolean;
  /** Round 7-2b §B-a — the SERSAN-mark transmission RT texture
   * (crystalMarkRT.ts). Provided ONLY for healthy + full tier + proven
   * backend; absent → the mark branch is not built (procedural backdrop
   * only) and the material stays zero-texture. */
  markTexture?: Any;
  /** ROUND 8-H — the authored slab source geometry (`loadCrystalGeometry`),
   * INDEXED and still carrying the raw `_CENTR`/`_RAND`/`_FACET` attributes.
   * Absent/null (asset 404, parse failure) → the procedural round-7 geometry
   * is built instead, so the section can never end up stone-less. BOTH TIERS
   * get the authored asset: at 450 / 1 114 triangles it is CHEAPER than the
   * procedural lite build (1 620 / 1 920), so there is no reduced variant and
   * CRYSTAL_DETAIL_LITE / SHARD_COUNT_LITE are dead on this path. */
  sourceGeometry?: Any;
  /** ROUND 14 stage A — build the screen-space refraction branch (ONE
   * module-level viewportMipTexture node shared by both stones). The driver
   * gates it exactly like the mark RT: `!lite && (backendIsWebGPU ||
   * REFR_SCREEN_WEBGL2)`. Absent/false → the branch is not built. */
  screenRefraction?: boolean;
  /** ROUND 14 stage D — the asset-free canvas equirect (the mark's gradient
   * env, promoted to a session singleton in CrystalCluster) for
   * `pmremTexture`. Absent → env/clearcoat branch not built. Full tier only. */
  envTexture?: Any;
  /** ROUND 14 WAVE 2 — the per-stone inner transmission RT texture
   * (crystalInnerRT.ts: the mark mesh rendered from the MAIN camera). Absent →
   * the two-pass branch is not built. Full tier only; the driver gates the
   * backend like the mark RT (`backendIsWebGPU || INNER_RT_WEBGL2`). */
  innerTexture?: Any;
  /** log2 of the inner RT's longest side at build time (the driver keeps
   * `uniforms.uInnerLog2` current on resize). */
  innerLog2?: number;
}

// === ROUND 14 stage B — the baked chord-length attribute ====================
/** Module-level cache of the baked chord array per SOURCE geometry (the
 * loader's module singleton), so a re-mount / GPU-loss rebuild never repeats
 * the raycast. Keyed on the indexed source: the `toNonIndexed()` soup is the
 * index expansion of it, so `aThick[i] = chord[index[i]]`. */
const thickCache: WeakMap<object, Float32Array> = new WeakMap();

/**
 * Per-vertex CHORD LENGTH: from each vertex march along −normal and take the
 * nearest BACK-FACING triangle hit (Möller–Trumbore on flat typed arrays, no
 * Raycaster / no object allocation: 1 328 × 450 and 2 533 × 1 114 tests
 * measured at 19 / 89 ms in node, once per session per mode, inside the
 * async build after the GLB resolves — never on the first-paint path). On
 * the fractured file the pieces tile at gap 0, so a neighbour's coincident
 * face is FRONT-facing to the ray and skipped: the hit is the piece's own far
 * wall (per-piece thickness — rotation-invariant, so the vertex explode needs
 * no change). Misses (concave rims, ~7 %) take the median so the attribute is
 * never degenerate. Returns chord per SOURCE vertex.
 */
function bakeChords(pos: Float32Array, nrm: Float32Array, idx: Any): Float32Array {
  const vCount = pos.length / 3;
  const triCount = idx ? idx.length / 3 : vCount / 3;
  // Flatten triangles once (index indirection out of the hot loop).
  const tri = new Float32Array(triCount * 9);
  const tn = new Float32Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    for (let v = 0; v < 3; v++) {
      const src = (idx ? idx[t * 3 + v] : t * 3 + v) * 3;
      tri[t * 9 + v * 3] = pos[src];
      tri[t * 9 + v * 3 + 1] = pos[src + 1];
      tri[t * 9 + v * 3 + 2] = pos[src + 2];
    }
    const o = t * 9;
    const e1x = tri[o + 3] - tri[o];
    const e1y = tri[o + 4] - tri[o + 1];
    const e1z = tri[o + 5] - tri[o + 2];
    const e2x = tri[o + 6] - tri[o];
    const e2y = tri[o + 7] - tri[o + 1];
    const e2z = tri[o + 8] - tri[o + 2];
    tn[t * 3] = e1y * e2z - e1z * e2y;
    tn[t * 3 + 1] = e1z * e2x - e1x * e2z;
    tn[t * 3 + 2] = e1x * e2y - e1y * e2x;
  }
  const out = new Float32Array(vCount);
  const hits: number[] = [];
  for (let v = 0; v < vCount; v++) {
    const ox = pos[v * 3];
    const oy = pos[v * 3 + 1];
    const oz = pos[v * 3 + 2];
    let dx = -nrm[v * 3];
    let dy = -nrm[v * 3 + 1];
    let dz = -nrm[v * 3 + 2];
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    let best = Infinity;
    for (let t = 0; t < triCount; t++) {
      // Back-facing only: geometric normal · ray direction > 0.
      if (tn[t * 3] * dx + tn[t * 3 + 1] * dy + tn[t * 3 + 2] * dz <= 0) {
        continue;
      }
      const o = t * 9;
      const ax = tri[o];
      const ay = tri[o + 1];
      const az = tri[o + 2];
      const e1x = tri[o + 3] - ax;
      const e1y = tri[o + 4] - ay;
      const e1z = tri[o + 5] - az;
      const e2x = tri[o + 6] - ax;
      const e2y = tri[o + 7] - ay;
      const e2z = tri[o + 8] - az;
      const px = dy * e2z - dz * e2y;
      const py = dz * e2x - dx * e2z;
      const pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det;
      const tx = ox - ax;
      const ty = oy - ay;
      const tz = oz - az;
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < -1e-5 || u > 1 + 1e-5) continue;
      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const w = (dx * qx + dy * qy + dz * qz) * inv;
      if (w < -1e-5 || u + w > 1 + 1e-5) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (tt > 1e-4 && tt < best) best = tt;
    }
    if (best === Infinity) {
      out[v] = -1;
    } else {
      out[v] = best;
      hits.push(best);
    }
  }
  hits.sort((a, b) => a - b);
  const median = hits.length ? hits[hits.length >> 1] : 1;
  for (let v = 0; v < vCount; v++) if (out[v] < 0) out[v] = median;
  return out;
}

/**
 * Attach `aThick` to the prepared SOUP from the chords baked on its SOURCE
 * (cached per source). One extra float vertex-buffer slot: healthy 3 → 4,
 * broken 5 → 6, inside the 8-slot wall. Returns false if the source carries
 * no usable position/normal pair (the graph then uses the analytic proxy).
 */
function bakeThickness(
  src: Any,
  geometry: Any,
  BufferAttribute: Any,
): boolean {
  const sp = src.getAttribute("position");
  const sn = src.getAttribute("normal");
  if (!sp || !sn || sp.itemSize !== 3 || sn.itemSize !== 3) return false;
  let chords = thickCache.get(src);
  if (!chords) {
    chords = bakeChords(
      sp.array as Float32Array,
      sn.array as Float32Array,
      src.index ? src.index.array : null,
    );
    thickCache.set(src, chords);
  }
  const count = geometry.attributes.position.count as number;
  const arr = new Float32Array(count);
  if (src.index) {
    const ia = src.index.array;
    if (ia.length !== count) return false;
    for (let i = 0; i < count; i++) arr[i] = chords[ia[i]];
  } else {
    if (chords.length !== count) return false;
    arr.set(chords);
  }
  geometry.setAttribute("aThick", new BufferAttribute(arr, 1));
  return true;
}

// === ROUND 14 WAVE 2 — the baked per-vertex CURVATURE attribute =============
/**
 * `aCurv` ∈ [0,1]: the ridge sharpness at each SOUP vertex — the largest
 * angle between this vertex's normal and the normal of any other soup vertex
 * sharing its position (the split normals of a flat-shaded slab are exactly
 * the dihedral across the patch border), normalised by 90°. Patch interiors
 * (all coincident normals equal) bake 0, cleavage ridges bake ~0.4–1.0, and
 * the interpolation across each triangle turns that into an edge → interior
 * frost gradient that `pow(curv, CRUST_RIDGE_POW)` sharpens back toward the
 * ridge. Position-hashed at 1e-4 (the GLB ships float32 positions that are
 * bit-identical along shared edges; the procedural fallback's are exact by
 * construction). O(n) with a Map, ~1–3 ms once per build; fwidth-free, so it
 * serves the lite tier too. One float slot: healthy 4 → 5, broken 6 → 7.
 */
function bakeCurvature(geometry: Any, BufferAttribute: Any): boolean {
  const p = geometry.getAttribute("position");
  const n = geometry.getAttribute("normal");
  if (!p || !n || p.itemSize !== 3 || n.itemSize !== 3) return false;
  const count = p.count as number;
  const pa = p.array as Float32Array;
  const na = n.array as Float32Array;
  // WAVE 2.1 — group PER SHARD on the broken band: the merged rest-state soup
  // has shards touching (explode is shader-side aCentr*uGap), so a position-
  // only group pairs a fracture-face vertex with the neighbour shard's back-
  // to-back vertex (dot = -1 => a fake full ridge over every fracture face
  // and along every outer-skin crack line). aCentr is constant per shard
  // (both the authored `_CENTR` and the fallback), so it IS the shard id.
  const c = CRUST_CURV_PER_SHARD ? geometry.getAttribute("aCentr") : null;
  const ca = c && c.itemSize === 3 ? (c.array as Float32Array) : null;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    let key =
      Math.round(pa[i * 3] * 1e4) +
      "," +
      Math.round(pa[i * 3 + 1] * 1e4) +
      "," +
      Math.round(pa[i * 3 + 2] * 1e4);
    if (ca) {
      key +=
        "|" +
        Math.round(ca[i * 3] * 1e3) +
        "," +
        Math.round(ca[i * 3 + 1] * 1e3) +
        "," +
        Math.round(ca[i * 3 + 2] * 1e3);
    }
    let g = groups.get(key);
    if (!g) {
      g = [];
      groups.set(key, g);
    }
    g.push(i);
  }
  const out = new Float32Array(count);
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    for (let a = 0; a < g.length; a++) {
      const ia = g[a] * 3;
      let minDot = 1;
      for (let b = 0; b < g.length; b++) {
        if (a === b) continue;
        const ib = g[b] * 3;
        const d =
          na[ia] * na[ib] + na[ia + 1] * na[ib + 1] + na[ia + 2] * na[ib + 2];
        if (d < minDot) minDot = d;
      }
      const ang = Math.acos(Math.max(-1, Math.min(1, minDot)));
      out[g[a]] = Math.min(ang / (Math.PI * 0.5), 1);
    }
  }
  geometry.setAttribute("aCurv", new BufferAttribute(out, 1));
  return true;
}

/** Deterministic [0,1) hash — the repo's sin-dot family (neuralFieldCompute
 * seedBuffers twin), JS side. */
function h(i: number, mulA: number, addB: number): number {
  const s = Math.sin(i * mulA + addB) * 43758.545;
  return s - Math.floor(s);
}

/** JS-side vec3 normalize (config direction constants → unit dirs). */
function normJs(
  v: readonly [number, number, number],
): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Continuous [-1,1] 3D "sinenoise" for the CPU displacement — any smooth
 * deterministic f(position) keeps shared edge positions matched, so the
 * non-indexed facets never crack. */
function sNoise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3 + 1.3)) *
    Math.sin(y * 1.3 + Math.sin(z * 2.9 + 2.1)) *
    Math.sin(z * 1.9 + Math.sin(x * 2.1 + 4.2))
  );
}

/**
 * In-place fractal displacement + squash of a (non-indexed) position buffer:
 * p ← p·(1 + amp·fbm(p·freq + seed))·squash. Normals are computed by the
 * caller AFTER this (flat facets need the final positions).
 */
function displaceAndSquash(
  pos: { count: number; getX: Any; getY: Any; getZ: Any; setXYZ: Any },
  seed: number,
  squash: [number, number, number],
  lite: boolean,
): void {
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const f = CRYSTAL_NOISE_FREQ;
    let n = sNoise3(x * f + seed, y * f + seed * 1.7, z * f + seed * 0.6);
    // Round 7 (§5 silhouette): terrace the low octave toward quantized
    // ledges — chiseled angular plateaus instead of a smooth potato.
    // Deterministic f(position) → coincident soup vertices stay matched.
    const q = Math.round(n * CRYSTAL_FACET_QUANT) / CRYSTAL_FACET_QUANT;
    n += (q - n) * CRYSTAL_FACET_MIX;
    if (!lite) {
      // Second octave — dropped on the lite build (round-5 tier spec);
      // round 7 flattened its amplitude (micro-noise ate the big moves).
      n +=
        CRYSTAL_NOISE_AMP2 *
        sNoise3(
          x * f * 2.1 + seed + 7.3,
          y * f * 2.1 + seed + 3.1,
          z * f * 2.1 + seed + 9.7,
        );
    }
    const k = 1 + CRYSTAL_NOISE_AMP * n;
    pos.setXYZ(i, x * k * squash[0], y * k * squash[1], z * k * squash[2]);
  }
}

/**
 * Round 7 — bake a per-FACE random vec3 (`aFacet`, constant across each
 * triangle of the non-indexed soup) for the 2-lobe facet response: .x/.y
 * jitter key-lobe brightness / body value, the full vec3 tilts the lobe
 * normal. A baked attribute (NOT a hash of an interpolated varying) so the
 * value is bit-stable across the face — fp jitter through sin-hash would
 * speckle. One extra vertex-buffer slot, zero bindings.
 */
function bakeFacetRand(
  geometry: Any,
  BufferAttribute: Any,
  seed: number,
): void {
  const count = geometry.attributes.position.count as number;
  const arr = new Float32Array(count * 3);
  for (let fIdx = 0; fIdx * 3 < count; fIdx++) {
    const r0 = h(fIdx, 17.23 + seed, 91.7);
    const r1 = h(fIdx, 47.77 + seed, 13.9);
    const r2 = h(fIdx, 83.13 + seed, 57.3);
    const base = fIdx * 9;
    for (let v = 0; v < 3; v++) {
      arr[base + v * 3] = r0;
      arr[base + v * 3 + 1] = r1;
      arr[base + v * 3 + 2] = r2;
    }
  }
  geometry.setAttribute("aFacet", new BufferAttribute(arr, 3));
}

/**
 * ROUND 8-H — move a glTF custom attribute onto its shader name. three's
 * GLTFLoader LOWERCASES any semantic it does not know (`ATTRIBUTES[name] ||
 * name.toLowerCase()`, three 0.184 GLTFLoader L4806), so `_CENTR` arrives as
 * `_centr`; both spellings are accepted and both are cleared, so a future
 * loader change can neither drop the attribute nor leave a duplicate
 * vertex-buffer slot behind. Returns the attribute (or null if absent).
 */
function takeAttr(geometry: Any, gltfName: string, to: string): Any {
  const lower = gltfName.toLowerCase();
  const a = geometry.getAttribute(lower) ?? geometry.getAttribute(gltfName);
  geometry.deleteAttribute(lower);
  geometry.deleteAttribute(gltfName);
  if (a) geometry.setAttribute(to, a);
  return a ?? null;
}

/**
 * ROUND 8-H — turn the loaded slab into the soup the material expects, and
 * read the per-piece table back OUT of it. Honors the authoring log's contract
 * exactly (§6, §8):
 *   · `toNonIndexed()` first — the shader flat-shades a soup, and the expansion
 *     carries the custom attributes with it (guarded by `src.index`: see the ⚠
 *     in the body — three returns `this`, not a copy, for an already-soup
 *     asset, which would put the module singleton on the chopping block).
 *   · NO `bakeFacetRand()`: `_FACET` ships per PLANAR PATCH (patches merged at
 *     ≤8° dihedral; measured on the shipped files, 34 distinct randoms on the
 *     intact — one per patch — and 57 across the fractured file's 76 patches,
 *     a few pieces sharing a value). Re-baking it per triangle would speckle each
 *     large plane with different FACET_SPEC_JIT / FACET_VALUE_JIT brightness —
 *     re-breaking the mark's legibility at the shading level after this whole
 *     round fixed it at the geometry level. Only a MISSING `_FACET` falls back
 *     to the bake.
 *   · NO `displaceAndSquash()` / CRYSTAL_SQUASH — the .84/1/.65 proportions are
 *     baked and a post-hoc anisotropic scale shears every facet normal.
 *   · `shardCentrs`/`shardRands` are READ from the file's 8 unique values in
 *     AUTHORING order, never re-derived. Measured on the shipped asset: the
 *     pieces are contiguous in the vertex buffer AND that buffer order is
 *     volume-descending (46.06 / 30.40 / 10.24 / 6.27 / 2.73 / 2.39 / 1.23 /
 *     0.68 % by signed-volume integration), so index 0/1 are the two large
 *     bodies (EMBER_SHARDS) and the callout indices keep their size classes.
 *     `_RAND[i]` was verified bit-equal (≤2.7e-8) to this file's own
 *     `h(i, …)` triple, so the explode / idle-drift / spin phases are the ones
 *     the procedural build produced for shard i — the motion grammar did not
 *     change with the geometry. ⚠ NOTE the authoring log's §5 table has the
 *     `centr` column of rows 3 and 4 transposed relative to the shipped file
 *     (its volumes/tri-counts are right); reading the GLB — as here — is
 *     immune to that.
 *   · `_CENTR` is already pre-rotated to the glTF Y-up frame at authoring time
 *     (the exporter leaves custom vectors in Blender's Z-up); re-verified on
 *     the shipped file: max |centr − meanPos| = 0.234, i.e. volume-centroid vs
 *     vertex-mean, not a frame error. Nothing to permute here. CHECK (8-H)
 *     re-measured it the other way round and closed the question: `_CENTR` is
 *     the piece's EXACT volume centroid (∫p dV / ∫dV per piece agrees with the
 *     shipped vector to float precision, |Δ| < 1e-6 on all eight), so both the
 *     callout twin and the ember blobs ride the true centroid, not an
 *     approximation of it.
 *   · Returns `null` — i.e. hands the caller back to the procedural build — for
 *     a broken asset that parses but carries no `_CENTR`/`_RAND` pair. See the
 *     ⚠ in the body: an empty piece table is a half-built cluster, not a
 *     degraded one.
 *   · The cluster's volume-weighted mean `centr` is (0.126, −0.181, −0.018),
 *     |0.22| = 6.6 % of the bbox height, and is deliberately NOT subtracted:
 *     the callout twin's `centr·(1 + gap + drift)` is exact only while `centr`
 *     IS the baked piece centroid, and re-centring would need a second array
 *     to keep it so. The exploded cluster therefore settles ~0.18 units low —
 *     which the hover re-cohere pulls back up, reading as the pieces snapping
 *     together.
 */
function prepareAuthored(
  src: Any,
  broken: boolean,
  BufferAttribute: Any,
): { geometry: Any; shardCentrs: number[][]; shardRands: number[][] } | null {
  const shardCentrs: number[][] = [];
  const shardRands: number[][] = [];
  if (broken) {
    const c = src.getAttribute("_centr") ?? src.getAttribute("_CENTR");
    const r = src.getAttribute("_rand") ?? src.getAttribute("_RAND");
    if (c && r) {
      for (let i = 0; i < c.count; i++) {
        const x = c.getX(i);
        const y = c.getY(i);
        const z = c.getZ(i);
        let known = false;
        for (const v of shardCentrs) {
          if (v[0] === x && v[1] === y && v[2] === z) {
            known = true;
            break;
          }
        }
        if (known) continue;
        shardCentrs.push([x, y, z]);
        shardRands.push([r.getX(i), r.getY(i), r.getZ(i)]);
      }
    }
    // ⚠ CHECK (round 8-H): a broken build with no piece table is a HALF-BUILT
    // state, not a degraded one — the vertex path would reference an `aCentr`
    // that does not exist and the driver would find `shardCentrs` empty
    // (callout leaders detached, ember blobs skipped). A parseable-but-
    // malformed asset therefore takes the SAME exit as a 404: return null and
    // let the caller build the procedural cluster, whose centr/rand it
    // re-derives from the golden spiral.
    if (!shardCentrs.length) return null;
  }

  // ⚠ CHECK (round 8-H): `toNonIndexed()` RETURNS `this` when the geometry is
  // already non-indexed (three 0.184 BufferGeometry L19253) — on a re-exported
  // soup asset that would hand back the MODULE SINGLETON, and everything below
  // (attribute renames) plus `build.dispose()` would then mutate and destroy
  // the session-shared object the loader contract says must never be touched.
  // Clone instead: same cost class, and the singleton stays pristine for every
  // later mount / GPU-loss rebuild.
  const geometry = src.index ? src.toNonIndexed() : src.clone();
  const facet = takeAttr(geometry, "_FACET", "aFacet");
  if (broken) {
    takeAttr(geometry, "_CENTR", "aCentr");
    takeAttr(geometry, "_RAND", "aRand");
  } else {
    // The intact file carries an all-zero `_CENTR` and a single-value `_RAND`
    // (the healthy vertex path reads neither) — drop both slots rather than
    // upload 32 KB of constants. Healthy stays at 3 slots, broken at 5.
    for (const n of ["_centr", "_CENTR", "_rand", "_RAND"]) {
      geometry.deleteAttribute(n);
    }
  }
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  // ONLY a malformed asset (no `_FACET` at all) falls back to the
  // per-triangle bake — never a file that shipped per-patch randoms.
  if (!facet) bakeFacetRand(geometry, BufferAttribute, broken ? 11.3 : 3.7);
  return { geometry, shardCentrs, shardRands };
}

/** ROUND 14 stage A — ONE `viewportMipTexture()` node for the whole module:
 * both stones reference it, its `.sample()` clones share the framebuffer via
 * `referenceNode`, and NodeFrame keys the RENDER-type updateBefore on that
 * shared texture — so the framebuffer is copied ONCE per render however many
 * taps or materials read it (dossier §7 / §11). Created lazily from the
 * passed-in tsl namespace (this module never imports three at top level). */
let sharedScreenFb: Any = null;

export function createCrystalBuild(args: CrystalBuildArgs): CrystalBuild {
  const {
    webgpu,
    tsl,
    mode,
    lite,
    markTexture,
    sourceGeometry,
    screenRefraction,
    envTexture,
    innerTexture,
    innerLog2,
  } = args;
  const {
    IcosahedronGeometry,
    BufferGeometry,
    BufferAttribute,
    MeshBasicNodeMaterial,
    Color,
  } = webgpu as Any;
  const {
    uniform,
    attribute,
    positionLocal,
    normalLocal,
    modelViewMatrix,
    cameraProjectionMatrix,
    // Round 9-C — igloo's transmission-ray recipe needs the model's
    // rotation-independent scale (thickness is a LOCAL quantity) and the
    // object's view-space origin (the registration point that cancels the
    // along-ray term). Both are plain per-object uniforms — no new bindings.
    modelScale,
    modelViewPosition,
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    length,
    max,
    min,
    clamp,
    sin,
    cos,
    floor,
    fract,
    mix,
    pow,
    smoothstep,
    varying,
    select,
    exp,
    dot,
    cross,
    normalize,
    sqrt,
    Discard,
    texture,
    // ROUND 14 — all verified in three/tsl 0.184 (dossier §7): the screen
    // copy, PMREM, MaterialX noises, Vogel/IGN, screen nodes, BRDF helpers.
    int,
    abs,
    log2,
    fwidth,
    reflect,
    screenSize,
    screenCoordinate,
    cameraWorldMatrix,
    viewportMipTexture,
    vogelDiskSample,
    interleavedGradientNoise,
    pmremTexture,
    F_Schlick,
    D_GGX,
    mx_fractal_noise_float,
    mx_worley_noise_float,
    mx_cell_noise_float,
  } = tsl as Any;

  const broken = mode === "broken";
  const samples = lite ? CRYSTAL_SAMPLES_LITE : CRYSTAL_SAMPLES;
  // ROUND 14 — stage gates, resolved ONCE at build (each is a config
  // kill-switch × the tier × the driver's backend gate). Lite = stage B only.
  const absorbOn = ICE_ABSORB;
  const screenOn = !lite && REFR_SCREEN && !!screenRefraction;
  const envOn = !lite && ICE_ENV && envTexture != null;
  const innerOn = !lite && ICE_INNER;
  const sparkle2On = !lite && ICE_SPARKLE2;
  const bloomGlintsOn = !lite && ICE_BLOOM_GLINTS && sparkle2On;
  // ROUND 14 WAVE 2 gates. Crust runs on BOTH tiers (lite: the baked ridge
  // term only — no striation noise, no normal/roughness perturbation); the
  // two-pass RT and the inclusions are full-tier.
  const twoPassOn = !lite && ICE_TWO_PASS && innerTexture != null;
  const crustOn = ICE_CRUST;
  const meteoriteOn = ICE_METEORITE;

  // === Geometry =============================================================
  // ROUND 8-H: the authored slab is the primary path (see prepareAuthored);
  // the procedural build below survives ONLY as the asset-failure fallback.
  let geometry: Any;
  const shardCentrs: number[][] = [];
  const shardRands: number[][] = [];

  const authored = sourceGeometry
    ? prepareAuthored(sourceGeometry, broken, BufferAttribute)
    : null;
  // ROUND 14 stage B — the baked chord attribute rides the authored slab on
  // BOTH tiers (one float slot); the procedural fallback keeps the analytic
  // proxy (its silhouette is a displaced sphere, for which the proxy is
  // exact enough).
  let thickBaked = false;
  if (authored) {
    geometry = authored.geometry;
    for (const c of authored.shardCentrs) shardCentrs.push(c);
    for (const r of authored.shardRands) shardRands.push(r);
    if (absorbOn) {
      thickBaked = bakeThickness(sourceGeometry, geometry, BufferAttribute);
    }
  } else if (!broken) {
    // FALLBACK — ONE intact crystal: displaced, squashed, flat-shaded. Note
    // this path has NO coplanar patches. ROUND 9-C: that is now much less
    // costly for the in-ice mark than it was — the base map is the projective
    // identity and does not depend on the mesh having coplanar patches at all,
    // so the fallback loses only the per-patch coherence of the PERTURBATION (a
    // per-triangle 5–18 px jitter), not the placement of the image.
    geometry = new IcosahedronGeometry(
      1,
      lite ? CRYSTAL_DETAIL_LITE : CRYSTAL_DETAIL,
    );
    displaceAndSquash(geometry.attributes.position, 3.7, CRYSTAL_SQUASH, lite);
    geometry.computeVertexNormals(); // non-indexed → per-face flat normals
    bakeFacetRand(geometry, BufferAttribute, 3.7); // round-7 facet randoms
  } else {
    // FALLBACK — FRACTURED CLUSTER: shards merged into one geometry (one draw
    // call). Its `centr`/`rand` are re-derived from the golden spiral, so the
    // callout twin and the ember blobs stay exact on this path too.
    const count = lite ? SHARD_COUNT_LITE : SHARD_COUNT;
    const detail = lite ? SHARD_DETAIL_LITE : SHARD_DETAIL;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    const parts: {
      pos: Float32Array;
      nrm: Float32Array;
      centr: [number, number, number];
      rand: [number, number, number];
    }[] = [];
    let total = 0;

    for (let s = 0; s < count; s++) {
      const r0 = h(s, 12.9898, 78.233);
      const r1 = h(s, 39.3467, 11.135);
      const r2 = h(s, 73.156, 52.235);
      // Golden-spiral centroid direction → even shard spread; the cluster
      // keeps the intact crystal's squashed silhouette.
      const t = (s + 0.5) / count;
      const phi = Math.acos(1 - 2 * t);
      const theta = GOLDEN * s;
      // Round 7 (§5): fractured-family size variance — 2 large + mid + chips;
      // chips (size < 1) scatter further than the bodies (the centroid radius
      // gains the CHIP_SCATTER factor). The callout twin stays exact: this
      // SAME `centr` translates the verts, fills aCentr AND is pushed to
      // shardCentrs — the driver never re-derives it from config.
      const sizeMul = SHARD_SIZES[s % SHARD_SIZES.length];
      const rad =
        (SHARD_SPREAD_MIN + r0 * (SHARD_SPREAD_MAX - SHARD_SPREAD_MIN)) *
        (1 + Math.max(0, 1 - sizeMul) * CHIP_SCATTER);
      const centr: [number, number, number] = [
        Math.sin(phi) * Math.cos(theta) * rad * CRYSTAL_SQUASH[0],
        Math.cos(phi) * rad * CRYSTAL_SQUASH[1] * 1.2,
        Math.sin(phi) * Math.sin(theta) * rad * CRYSTAL_SQUASH[2],
      ];
      const rand: [number, number, number] = [r0, r1, r2];

      const shard = new IcosahedronGeometry(SHARD_RADIUS * sizeMul, detail);
      displaceAndSquash(
        shard.attributes.position,
        11.3 + s * 9.7,
        [1, 1.1 + r1 * 0.5, 0.75 + r2 * 0.3],
        lite,
      );
      shard.computeVertexNormals();
      const pos = new Float32Array(shard.attributes.position.array);
      const nrm = new Float32Array(shard.attributes.normal.array);
      // Bake the shard AROUND its centroid — the shader's rotate3D pivots on
      // aCentr and the explode offset rides on top (igloo contract).
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += centr[0];
        pos[i + 1] += centr[1];
        pos[i + 2] += centr[2];
      }
      shard.dispose();
      parts.push({ pos, nrm, centr, rand });
      total += pos.length / 3;
      shardCentrs.push([...centr]);
      shardRands.push([...rand]);
    }

    const mPos = new Float32Array(total * 3);
    const mNrm = new Float32Array(total * 3);
    const mCentr = new Float32Array(total * 3);
    const mRand = new Float32Array(total * 3);
    let off = 0;
    for (const p of parts) {
      mPos.set(p.pos, off * 3);
      mNrm.set(p.nrm, off * 3);
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        mCentr.set(p.centr, (off + i) * 3);
        mRand.set(p.rand, (off + i) * 3);
      }
      off += n;
    }
    geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(mPos, 3));
    geometry.setAttribute("normal", new BufferAttribute(mNrm, 3));
    geometry.setAttribute("aCentr", new BufferAttribute(mCentr, 3));
    geometry.setAttribute("aRand", new BufferAttribute(mRand, 3));
    bakeFacetRand(geometry, BufferAttribute, 11.3); // round-7 facet randoms
  }
  // ROUND 14 WAVE 2 — the ridge curvature bake (both paths, both tiers; one
  // float slot — healthy 5 / broken 7 with aThick, still inside the 8-slot
  // wall). Rotation- and explode-invariant like aThick.
  const curvBaked = crustOn ? bakeCurvature(geometry, BufferAttribute) : false;

  // === Uniforms =============================================================
  const uTime = uniform(0);
  const uReveal = uniform(0);
  const uFlash = uniform(0);
  // ROUND 8-H (CHECK): the rest gap follows the `centr` array this build
  // actually shipped — the authored centroids are ~1.9× longer than the
  // procedural ones, so one constant cannot serve both (FRACTURE_REST_GAP_
  // AUTHORED carries the full derivation). Published on the build so the
  // driver's gap ramp and its callout twin read the SAME number.
  const restGap = broken
    ? authored
      ? FRACTURE_REST_GAP_AUTHORED
      : FRACTURE_REST_GAP
    : 0;
  const uGap = uniform(restGap);
  // ROUND 15 — THE APERTURE as a RATE on uGap (crystalConfig METEOR_APERTURE):
  // floor radius = apertureK·gap, so it is exactly 0 when the slab is sealed
  // and exactly METEOR_APERTURE at the full-open gap (restGap·PEAK_GAIN),
  // linear between. Build-time scalar — no uniform, no per-frame cost. The
  // procedural partition gets its own constant for the same reason it gets
  // its own rest gap: its centroids are ~1.9× shorter.
  const apertureK = broken
    ? (authored ? METEOR_APERTURE : METEOR_APERTURE_PROCEDURAL) /
      Math.max(restGap * METEOR_PEAK_GAIN, 1e-4)
    : 0;
  const uCamDist0 = uniform(12);
  const uWorldScale = uniform(1);
  const uIor = uniform(CRYSTAL_IOR);
  const uCA = uniform(CRYSTAL_CA);
  const uThickness = uniform(CRYSTAL_THICKNESS);
  const uRough = uniform(CRYSTAL_ROUGH);
  const uRimBase = uniform(RIM_BASE);
  const uRimFlash = uniform(RIM_FLASH_GAIN);
  const uAlpha = uniform(CRYSTAL_ALPHA);
  const uFadeProgress = uniform(FADE_PROGRESS);
  const uSpotGain = uniform(BACKDROP_SPOT_GAIN);
  const uDrift = uniform(CRYSTAL_IDLE_DRIFT);
  const uShardSpin = uniform(SHARD_SPIN);
  // Round-7 realism tunables (all in the dev handle).
  const uBodyDarken = uniform(BODY_DARKEN);
  const uSpecPow = uniform(SPEC_POW);
  const uSpecGain = uniform(SPEC_GAIN);
  const uFillGain = uniform(FILL_GAIN);
  const uFacetJit = uniform(FACET_JITTER);
  const uCAEdge = uniform(CA_EDGE_BOOST);
  const uSparkleGain = uniform(SPARKLE_GAIN);
  const uFrostAmp = uniform(FROST_AMP);
  // Round-7-2b anatomy tunables (dev handle; dead nodes on unbuilt branches).
  const uRippleAmp = uniform(RIPPLE_AMP);
  const uWarmGain = uniform(WARM_GAIN);
  const uEmberGain = uniform(EMBER_GAIN);
  const uMarkGain = uniform(MARK_GAIN);
  // Round 9-C — the three knobs of the origin-registered perspective map.
  // uMarkThick is a LOCAL (crystal-unit) length like igloo's `thickness`;
  // uMarkHalf is the crystal-unit half-extent that maps to the RT's uv edge;
  // uMarkFlipY is the §3.6 backend flag (expected +1 — we sample our own RT).
  const uMarkThick = uniform(MARK_THICKNESS);
  const uMarkHalf = uniform(MARK_WORLD_HALF);
  const uMarkFlipY = uniform(MARK_FLIP_Y);
  // Round 8-E value-world tunables. uBackdropGain DEFAULTS TO 1 (not
  // BACKDROP_GAIN): a build whose driver never ramps it — or a dev handle set
  // back to 0 energy — renders exactly the pre-round-8 body, so the coupling
  // with the fog quad is the only thing that can raise it (doc §B3's ⚠: the
  // old body/surround match was a coincidence of two independent constants,
  // and the moment a fog exists that coincidence breaks unless ONE value
  // drives both).
  const uBackdropGain = uniform(1);
  const uAmbGain = uniform(AMBIENT_GAIN);
  const uCeil = uniform(CRYSTAL_CEIL);
  const uRimEdgeStart = uniform(RIM_EDGE_START);
  const uRimEdge = uniform(RIM_EDGE_GAIN);
  const uColNavy = uniform(new Color(BACKDROP_NAVY));
  const uColNavy2 = uniform(new Color(BACKDROP_NAVY2));
  const uColCyan = uniform(new Color(BACKDROP_CYAN));
  // ROUND 14 — ICE UPGRADE tunables (all live on the dev handle; the ones on
  // unbuilt branches are dead nodes exactly like uMarkGain).
  const uAbsorbRef = uniform(ABSORB_REF_CHORD[broken ? "broken" : "healthy"]);
  const uAbsorbMix = uniform(absorbOn ? ABSORB_MIX : 0);
  const uAbsorbMilk = uniform(ABSORB_MILK);
  const uScreenThick = uniform(REFR_SCREEN_THICK);
  const uScreenLodK = uniform(REFR_SCREEN_LOD_K);
  const uScreenBlurPx = uniform(REFR_SCREEN_BLUR_PX);
  const uScreenMix = uniform(REFR_SCREEN_MIX);
  const uInnerGain = uniform(INNER_GAIN);
  const uInnerAtten = uniform(INNER_ATTEN);
  const uCrackLo = uniform(CRACK_LO);
  const uCrackHi = uniform(CRACK_HI);
  const uCrackGain = uniform(CRACK_GAIN);
  const uMilkGain = uniform(MILK_GAIN);
  const uEnvGain = uniform(ENV_GAIN);
  const uCoatRough = uniform(COAT_ROUGH);
  const uCoatGain = uniform(COAT_GAIN);
  const uSparkle2Gain = uniform(SPARKLE2_GAIN);
  const uGlintBloom = uniform(GLINT_BLOOM_GAIN);
  const uEnvEdge = uniform(ENV_EDGE_GAIN);
  // ROUND 14 WAVE 2 tunables (dead nodes on unbuilt branches, as above).
  const uInnerLodK = uniform(INNER_LOD_K);
  const uInnerThick = uniform(INNER_THICK);
  const uInnerCA = uniform(INNER_CA);
  const uInnerMix = uniform(twoPassOn ? INNER_MIX : 0);
  const uInnerLog2 = uniform(innerLog2 ?? 9);
  const uCrustGain = uniform(crustOn && curvBaked ? CRUST_GAIN : 0);
  const uCrustRidgePow = uniform(CRUST_RIDGE_POW);
  const uGrainNormalAmp = uniform(GRAIN_NORMAL_AMP);
  const uGrainRoughK = uniform(GRAIN_ROUGH_K);
  const uInclusionGain = uniform(meteoriteOn ? INCLUSION_GAIN : 0);
  // Stage B — ln(transmittance at the reference chord), per channel, folded
  // in JS (linear working space): T(d) = exp(lnAbs · d / ref) = C^(d/ref).
  // WAVE 2 (meteorite): the hue is re-aimed toward METEORITE_ABSORB but
  // RE-LEVELLED to ABSORB_COLOR's luminance first, so the mean body at the
  // median chord is wave 1's 0.30 exactly — chromaticity moves, value does
  // not (the stone is navy-charcoal, not a black hole).
  const absorbCol = new Color(ABSORB_COLOR);
  if (meteoriteOn) {
    const lum = (c: Any): number =>
      0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const target = new Color(METEORITE_ABSORB);
    const k = lum(absorbCol) / Math.max(lum(target), 1e-4);
    target.multiplyScalar(k);
    target.r = Math.min(target.r, 1);
    target.g = Math.min(target.g, 1);
    target.b = Math.min(target.b, 1);
    absorbCol.lerp(target, METEORITE_ABSORB_MIX);
  }
  const lnAbs: [number, number, number] = [
    Math.log(Math.max(absorbCol.r, 1e-4)),
    Math.log(Math.max(absorbCol.g, 1e-4)),
    Math.log(Math.max(absorbCol.b, 1e-4)),
  ];
  const frostLayerCol = new Color(FROST_LAYER_COLOR);
  // WAVE 2 — the crust albedo pair (face → ridge), linear via Color.
  const crustFaceCol = new Color(CRUST_COLOR_FACE);
  const crustRidgeCol = new Color(CRUST_COLOR_RIDGE);
  // Lobe colors — plain constants (config-frozen, not uniforms): the dev
  // handle exposes the scalar gains; hue stays the white-cyan/navy contract.
  const keyCol = new Color(FACET_KEY_COLOR);
  const fillCol = new Color(FACET_FILL_COLOR);
  // Round 7-2b — the sanctioned desaturated-amber pair (warm lobe + ember).
  const warmCol = new Color(WARM_COLOR);
  const emberCol = new Color(EMBER_COLOR);
  // Round 8-E §D3 — the ambient tint: the measured cool base with the
  // measured 8.7 % warm fraction folded in HERE, at build time, so the
  // shader pays nothing for it (a JS lerp in linear working space — three's
  // ColorManagement already converted both hexes out of sRGB).
  const ambCol = new Color(AMBIENT_COOL).lerp(
    new Color(WARM_COLOR),
    AMBIENT_WARM_MIX,
  );

  // === Shared TSL helpers ===================================================
  /** Rodrigues rotation of p about unit axis by angle. */
  function rotate3D(p: Any, axis: Any, ang: Any): Any {
    const c = cos(ang);
    const s = sin(ang);
    return p
      .mul(c)
      .add(cross(axis, p).mul(s))
      .add(axis.mul(dot(axis, p)).mul(float(1).sub(c)));
  }
  /** Deterministic [0,1) hash of a vec3 (blue-noise stand-in, repo idiom). */
  function hash3(p: Any): Any {
    return fract(
      sin(p.x.mul(127.1).add(p.y.mul(311.7)).add(p.z.mul(74.7))).mul(
        43758.5453,
      ),
    );
  }
  /** Bilinear 2D value noise (the neuralFieldCompute vnoise2 twin) — the
   * procedural stand-in for igloo's sinenoise texture taps. */
  function hash2(p: Any): Any {
    return fract(sin(p.x.mul(127.1).add(p.y.mul(311.7))).mul(43758.5453));
  }
  function vnoise2(p: Any): Any {
    const ip = floor(p).toVar();
    const fp = fract(p).toVar();
    const wf = fp.mul(fp).mul(float(3.0).sub(fp.mul(2.0))).toVar();
    const n00 = hash2(ip);
    const n10 = hash2(ip.add(vec2(1.0, 0.0)));
    const n01 = hash2(ip.add(vec2(0.0, 1.0)));
    const n11 = hash2(ip.add(vec2(1.0, 1.0)));
    return mix(mix(n00, n10, wf.x), mix(n01, n11, wf.x), wf.y);
  }
  /** Trilinear 3D value noise (round-7 frost grain) — the vnoise2 recipe
   * lifted to 3D on hash3. Same cross-backend op set (floor/fract/mix). */
  function vnoise3(p: Any): Any {
    const ip = floor(p).toVar();
    const fp = fract(p).toVar();
    const wf = fp.mul(fp).mul(float(3.0).sub(fp.mul(2.0))).toVar();
    const nx00 = mix(hash3(ip), hash3(ip.add(vec3(1.0, 0.0, 0.0))), wf.x);
    const nx10 = mix(
      hash3(ip.add(vec3(0.0, 1.0, 0.0))),
      hash3(ip.add(vec3(1.0, 1.0, 0.0))),
      wf.x,
    );
    const nx01 = mix(
      hash3(ip.add(vec3(0.0, 0.0, 1.0))),
      hash3(ip.add(vec3(1.0, 0.0, 1.0))),
      wf.x,
    );
    const nx11 = mix(
      hash3(ip.add(vec3(0.0, 1.0, 1.0))),
      hash3(ip.add(vec3(1.0, 1.0, 1.0))),
      wf.x,
    );
    return mix(mix(nx00, nx10, wf.y), mix(nx01, nx11, wf.y), wf.z);
  }
  /** Igloo falloffsmooth VERBATIM (dossier §3, pretty-bundle L25961):
   * edge = mix(from − margin·sign, to, progress);
   * return smoothstep(edge + margin·sign, edge, x).  sign = sign(to − from),
   * a JS constant here (from/to/margin are config constants). */
  function falloffsmooth(
    x: Any,
    from: number,
    to: number,
    margin: number,
    progress: Any,
  ): Any {
    const s = Math.sign(to - from);
    const edge = mix(float(from - margin * s), float(to), progress);
    return smoothstep(edge.add(float(margin * s)), edge, x);
  }
  /** Hand-rolled refract (cross-backend safe — no MathNode dependency):
   * falls back to the reflected direction on total internal reflection. */
  function refractDir(I: Any, N: Any, eta: Any): Any {
    const nDotI = dot(N, I).toVar();
    const k = float(1)
      .sub(eta.mul(eta).mul(float(1).sub(nDotI.mul(nDotI))))
      .toVar();
    const refr = I.mul(eta).sub(N.mul(eta.mul(nDotI).add(sqrt(max(k, 0.0)))));
    const refl = I.sub(N.mul(nDotI.mul(2.0)));
    return select(k.lessThan(0.0), refl, refr);
  }
  /**
   * THE PROCEDURAL REFRACTION BACKDROP — the structural substitution for
   * igloo's transmission RT (dossier §2/§5): navy diagonal gradient ×
   * noise modulation (the mined diagonalGradient recipe; the lite build
   * drops the second multiply) + two soft cyan bloom spots. Evaluated at a
   * 2D coordinate derived from the crystal-local position + the refracted
   * direction, so tumbling shifts the "internal world" like real refraction.
   *
   * ROUND 8-E §B4.2 part 2 — `uBackdropGain` lifts the NAVY FIELD (and only
   * the field) by ~8× so the transmitted body finally has a value: 0.0106 →
   * 0.085 lumLin pre-darken, → 0.042 post-darken, + the ambient floor = 0.057
   * against a 0.072 fog core (igloo's 0.79 ratio). The cyan SPOTS are added
   * AFTER the gain on purpose: they are authored ABSOLUTE internal highlights
   * already tuned sub-1.0, and ×8 would put a spot centre at 3.8 lumLin — a
   * hard bloom star, precisely the "glowing white on black" failure this
   * round exists to remove (BACKDROP_SPOT_GAIN drops 0.75 → 0.5 to sit
   * correctly inside the new window instead).
   */
  function backdrop(c: Any): Any {
    let g: Any = clamp(c.x.add(c.y).mul(0.25).add(0.5), float(0), float(1));
    const n1 = vnoise2(
      c.add(vec2(uTime.mul(0.0614), uTime.mul(0.0614).negate())),
    );
    g = g.mul(n1.mul(0.7).add(0.3));
    if (!lite) {
      const n2 = vnoise2(c.mul(2.0).add(vec2(0.0, uTime.mul(0.017))));
      g = g.mul(n2.mul(0.5).add(0.5));
    }
    let col: Any = mix(uColNavy, uColNavy2, g).mul(1.1).mul(uBackdropGain);
    for (const [sx, sy, sk] of BACKDROP_SPOTS) {
      const d = c.sub(vec2(sx, sy));
      col = col.add(
        uColCyan.mul(exp(dot(d, d).mul(sk).negate())).mul(uSpotGain),
      );
    }
    return col;
  }

  // === Vertex path ==========================================================
  // Broken: per-shard rotate3D about the shard centroid + igloo's explode.
  // Healthy: identity (the driver owns tumble/wobble via mesh.rotation).
  let pos: Any;
  let nrm: Any;
  if (broken) {
    const aCentr = attribute("aCentr");
    const aRand = attribute("aRand");
    // Epsilon keeps normalize() finite even for a pathological mid-cube rand.
    const axis = normalize(
      aRand.mul(2.0).sub(1.0).add(vec3(1e-4, 2e-4, 3e-4)),
    );
    // ═══ ROUND 13e — THE METEORITE CAN CLOSE (the D20 blocker) ═══════════
    // The spin used to carry a CONSTANT `aRand.z·2π` phase, independent of
    // the gap and non-zero at gap 0: the eight shards sat at 17/49/8/255/
    // 279/68/208/239 degrees even when "closed", so driving the gap to zero
    // produced an interpenetrating tangle, never the slab — and the hover
    // "recompact" had never actually recompacted anything. `openK` (0 at
    // gap 0 → 1 by 35% of the rest gap) scales the WHOLE spin angle and the
    // idle drift wander, so a closed stone has every piece in the exact
    // orientation it was cut in and the partition tiles the slab again.
    // Healthy builds never enter this branch — `#production` is unmoved.
    const openK = smoothstep(
      float(0),
      float(Math.max(restGap * 0.35, 1e-4)),
      uGap,
    );
    const spinAng = uTime
      .mul(uShardSpin)
      .mul(aRand.x.sub(0.5).mul(2.0))
      .add(aRand.z.mul(6.2832))
      .mul(openK);
    const pR = rotate3D(positionLocal.sub(aCentr), axis, spinAng).add(aCentr);
    // Igloo explode: += centr·(gap + rand.y·sin(rand.x·5+t·.5)·drift) — the
    // wander term rides `openK` too, or a closed slab would still breathe its
    // shards radially into one another.
    const mGap = uGap.add(
      aRand.y
        .mul(sin(aRand.x.mul(5.0).add(uTime.mul(0.5))))
        .mul(uDrift)
        .mul(openK),
    );
    // ROUND 15 — THE APERTURE (crystalConfig METEOR_APERTURE). A FLOOR on the
    // multiplier, so the three short-centroid pieces that stand on the mark
    // travel far enough to clear it while the other five keep their shipped
    // trajectories exactly. `rXY` is the LATERAL radius on purpose: the mark
    // is veiled in SCREEN space, not in depth. Reduces to the line above
    // whenever the floor does not bind (pieces with rXY ≥ ~1.13) and whenever
    // the gap is 0 — the sealed slab is byte-identical.
    const rXY = max(length(vec2(aCentr.x, aCentr.y)), float(1e-4));
    const explode = aCentr.mul(
      max(mGap, uGap.mul(float(apertureK)).div(rXY).sub(1.0)),
    );
    pos = pR.add(explode);
    nrm = rotate3D(normalLocal, axis, spinAng);
  } else {
    pos = positionLocal;
    nrm = normalLocal;
  }

  const material = new MeshBasicNodeMaterial();
  const mvPos = modelViewMatrix.mul(vec4(pos, 1.0));
  material.vertexNode = Fn(() => cameraProjectionMatrix.mul(mvPos))();

  // Varyings — self-contained expressions, same nodes as the vertex body.
  // View transform in the VERTEX stage (uniform group scale → directions
  // survive the normalize; the anisotropic-stream caveat does not apply).
  const vPosView = varying(mvPos.xyz);
  const vNrmView = varying(
    normalize(modelViewMatrix.mul(vec4(nrm, 0.0)).xyz),
  );
  const vLocal = varying(pos);
  // Round 7 — per-face random (constant across each soup triangle, so the
  // interpolation is bit-stable; see bakeFacetRand).
  const vFacet = varying(attribute("aFacet"));
  // Round 7-2b §B-b — the two ripple skew directions, transformed to VIEW
  // space in the VERTEX stage (varying discipline: self-contained constant
  // expressions of uniforms; w=0 rotation-only + uniform group scale keep
  // directions honest). Constant across the mesh → interpolation is exact,
  // no fragment re-normalize needed. Lite never builds the ripple branch.
  const rd1 = normJs(RIPPLE_DIR1);
  const rd2 = normJs(RIPPLE_DIR2);
  const vD1 = lite
    ? null
    : varying(
        normalize(modelViewMatrix.mul(vec4(rd1[0], rd1[1], rd1[2], 0.0)).xyz),
      );
  const vD2 = lite
    ? null
    : varying(
        normalize(modelViewMatrix.mul(vec4(rd2[0], rd2[1], rd2[2], 0.0)).xyz),
      );
  // ROUND 14 stage B — the baked chord (a per-vertex scalar, rotation- and
  // explode-invariant, so the broken vertex path needs nothing). Self-
  // contained attribute expression (varying discipline).
  const vThick = thickBaked ? varying(attribute("aThick")) : null;
  // ROUND 14 WAVE 2 — the baked ridge curvature (per-vertex scalar, same
  // invariances as aThick) and the LOCAL normal (post shard-rotation on the
  // broken path — the same `nrm` node the view normal is built from), which
  // the crust needs to seed a per-patch tangent that is fixed to the SURFACE
  // rather than to the screen (a view-space seed would make the grain swim
  // across the face as the stone tumbles). Self-contained expressions.
  const vCurv = curvBaked ? varying(attribute("aCurv")) : null;
  const vNrmLocal = crustOn && !lite ? varying(nrm) : null;

  // === Fragment =============================================================
  // Lobe colors as constant vec3 nodes (linear, via Color) — round 7.
  const keyC = vec3(keyCol.r, keyCol.g, keyCol.b);
  const fillC = vec3(fillCol.r, fillCol.g, fillCol.b);
  // Round 7-2b — desaturated amber constants (warm lobe + broken ember).
  const warmC = vec3(warmCol.r, warmCol.g, warmCol.b);
  const emberC = vec3(emberCol.r, emberCol.g, emberCol.b);
  // Round 8-E — the pre-mixed ambient tint (cool base + 8.7 % warm).
  const ambC = vec3(ambCol.r, ambCol.g, ambCol.b);
  // ROUND 14 — stage B/C constants.
  const lnAbsC = vec3(lnAbs[0], lnAbs[1], lnAbs[2]);
  const frostC = vec3(frostLayerCol.r, frostLayerCol.g, frostLayerCol.b);
  const crustFaceC = vec3(crustFaceCol.r, crustFaceCol.g, crustFaceCol.b);
  const crustRidgeC = vec3(crustRidgeCol.r, crustRidgeCol.g, crustRidgeCol.b);
  // WAVE 2 — the inner transmission RT: ONE TextureNode per source (+1
  // texture +1 sampler); every tap is a `.sample().level()` clone of it.
  const innerBase: Any = twoPassOn ? texture(innerTexture) : null;
  // Stage A — the shared framebuffer node (one per module, see above).
  if (screenOn && !sharedScreenFb) sharedScreenFb = viewportMipTexture();
  const screenFb: Any = screenOn ? sharedScreenFb : null;
  // Stage D — the PMREM'd canvas equirect: ONE node = +1 texture +1 sampler
  // (prefiltered once by PMREMNode.updateBefore on the first render).
  const envRef: Any = envOn ? envTexture : null;

  const shade = Fn(() => {
    const N = normalize(vNrmView).toVar();
    const V = normalize(vPosView.negate()).toVar();
    const I = V.negate().toVar(); // incident, camera → surface

    // --- Round 7-2b §B-b — wet-ice ripple: perturb the SHARED normal BEFORE
    // fresnel / lobes / refraction (igloo's authored normal map feeds both).
    // Two crossed sine wave trains over the stable LOCAL position (+ vnoise3
    // phase warp on the first), applied as the analytic TANGENTIAL gradient
    // in VIEW space (constant vD1/vD2 varyings). The Nj refraction jitter
    // below rides ON TOP (igloo's blue-noise grain twin). Full tier only. ---
    if (!lite) {
      // Round 8-E: the phase warp reads RIPPLE_WARP_FREQ (a decoupled
      // constant frozen at the historic RIPPLE_FREQ·0.6 = 4.8) instead of
      // deriving from the carrier — the retuned carrier would otherwise have
      // dragged the warp from 4.8 to 15.6 cycles/unit and turned the wet
      // shimmer into high-frequency chaos. The warp belongs in the FORM band.
      // Round 8-I: RIPPLE_FREQ / RIPPLE_F2 / RIPPLE_A2 are BAKED here as graph
      // literals (only uRippleAmp is live), so the carrier's anti-aliasing
      // retune needs an edit + reload, not a uniform write — and the decoupled
      // warp is untouched by it, which is the point. The frequency is bounded
      // by the stone's ON-SCREEN size; the derivation lives at crystalConfig
      // RIPPLE_FREQ. Lite never builds this branch.
      // ROUND 10-A: CRYSTAL_SCALE 0.17 → 0.115 takes the stone to ~83
      // px/crystal-unit at the measured band, so the carrier followed it down
      // (12 → 8, with RIPPLE_AMP re-derived to hold the same 25° tilt) to keep
      // its SCREEN period where the 8-I live pass left it. ⚠ Note the `.mul(F)`
      // below sits inside sin(), i.e. F is rad/unit and the period is 2π/F —
      // the "px/cycle" figures in the 8-E/8-I config entries were computed as
      // 1/F and are 2π× too small; the correction is written out at
      // crystalConfig RIPPLE_FREQ. Also note `feel.scale` is a live dev knob
      // as of this round and these literals do NOT follow it.
      const arg1 = dot(vLocal, vec3(rd1[0], rd1[1], rd1[2]))
        .mul(RIPPLE_FREQ)
        .add(vnoise3(vLocal.mul(RIPPLE_WARP_FREQ)).mul(RIPPLE_WARP))
        .toVar();
      const arg2 = dot(vLocal, vec3(rd2[0], rd2[1], rd2[2]))
        .mul(RIPPLE_FREQ * RIPPLE_F2)
        .add(2.7)
        .toVar();
      const grad = (vD1 as Any)
        .mul(cos(arg1).mul(RIPPLE_FREQ))
        .add(
          (vD2 as Any).mul(cos(arg2).mul(RIPPLE_FREQ * RIPPLE_F2 * RIPPLE_A2)),
        )
        .toVar();
      const gradT = grad.sub(N.mul(dot(N, grad)));
      N.assign(normalize(N.add(gradT.mul(uRippleAmp))));
    }

    // Fresnel FIRST (round 7: it now feeds the CA edge boost + the rim).
    const f1 = clamp(float(1).sub(dot(N, V)), float(0), float(1)).toVar();
    const fres = pow(f1, float(FRESNEL_POW)).toVar();

    // --- Round 7 §4 — frost grain (FULL tier; lite keeps uniform glass):
    // signed 3D value noise over the stable local position modulating
    // roughness/thickness/density → internal veins, not white noise. ------
    let frost: Any = null;
    let roughEff: Any = uRough;
    let thickEff: Any = uThickness;
    if (!lite) {
      frost = vnoise3(vLocal.mul(FROST_FREQ))
        .sub(0.5)
        .mul(uFrostAmp)
        .toVar();
      roughEff = clamp(
        uRough.mul(frost.mul(FROST_ROUGH_K).add(1.0)),
        float(0.05),
        float(1.0),
      ).toVar();
      thickEff = uThickness.mul(frost.mul(FROST_THICK_K).add(1.0)).toVar();
    }

    // === ROUND 14 WAVE 2 — THE FROST CRUST ==================================
    // igloo's frosted skin is a roughness map + a frost normal map; the
    // reference block shows it as (a) WHITER RIDGES — the thinner the ice at
    // a cleavage edge, the more it scatters — and (b) FIBROUS STRIATIONS
    // running one way per face, like ice scraped along a grain. Ours:
    //   (a) `aCurv`, the baked dihedral at each vertex (bakeCurvature),
    //       sharpened by pow → `crustRidge`; faces keep CRUST_FACE_FLOOR of it.
    //   (b) full tier: an anisotropic 2-octave perlin over (t·p, b·p, n·p)
    //       with the along-grain frequency GRAIN_STRETCH× lower than the
    //       across-grain one. The tangent t is seeded PER PATCH from aFacet
    //       and projected onto the LOCAL normal (vNrmLocal), so every face
    //       owns a grain direction fixed to its surface. The striation
    //       modulates the crust, tilts the shading normal along the
    //       bitangent (uGrainNormalAmp) and RAISES the local roughness
    //       (uGrainRoughK) — which is what blurs the interior (stage A, the
    //       inner RT, the env) under the crust, igloo's roughness-map effect.
    //   (c) broken band: inward-facing (fracture) faces keep CRUST_FRACTURE_K
    //       of the crust — fresh cut ice over rock. Outwardness is
    //       dot(N, p̂) in VIEW space (both rotate with the shard).
    // `crust` ∈ [0,1] is consumed after the body multiply (albedo + opacity)
    // and at the alpha. Both tiers build (a); lite skips (b).
    let crust: Any = null;
    let crustRidge: Any = null;
    if (crustOn && vCurv) {
      const curv = clamp(vCurv, float(0), float(1));
      crustRidge = pow(max(curv, 1e-4), uCrustRidgePow).toVar();
      let cr: Any = mix(float(CRUST_FACE_FLOOR), float(1.0), crustRidge);
      if (!lite && vNrmLocal) {
        const Nl = normalize(vNrmLocal).toVar();
        const seed = vFacet.mul(2.0).sub(1.0).add(vec3(0.013, -0.021, 0.007));
        const tang = normalize(seed.sub(Nl.mul(dot(seed, Nl)))).toVar();
        const bit = cross(Nl, tang).toVar();
        const gp = vec3(
          dot(vLocal, tang).mul(GRAIN_FREQ / GRAIN_STRETCH),
          dot(vLocal, bit).mul(GRAIN_FREQ),
          dot(vLocal, Nl).mul(GRAIN_FREQ * 0.5),
        );
        const stri = mx_fractal_noise_float(gp, 2, 2.0, 0.5)
          .mul(0.5)
          .add(0.5)
          .toVar();
        cr = cr.mul(stri.mul(0.5).add(0.55));
        // The scraped look: tilt the shading normal along the bitangent by
        // the striation signal (view-space bitangent via the mv rotation —
        // w = 0, uniform group scale, normalised).
        const bView = normalize(modelViewMatrix.mul(vec4(bit, 0.0)).xyz);
        const gT = bView.sub(N.mul(dot(N, bView)));
        N.assign(
          normalize(
            N.add(gT.mul(stri.sub(0.5)).mul(uGrainNormalAmp).mul(cr)),
          ),
        );
      }
      if (broken) {
        const outward = smoothstep(
          float(0.0),
          float(0.5),
          dot(N, normalize(vPosView.sub(modelViewPosition))),
        );
        cr = cr.mul(mix(float(CRUST_FRACTURE_K), float(1.0), outward));
      }
      crust = clamp(cr.mul(uCrustGain), float(0), float(1)).toVar();
      if (!lite) {
        roughEff.assign(
          clamp(
            roughEff.mul(crust.mul(uGrainRoughK).add(1.0)),
            float(0.05),
            float(1.0),
          ),
        );
      }
    }

    // Blue-noise stand-in trio (per-fragment, object-stable).
    const nz = vec3(
      hash3(vLocal.mul(41.3)),
      hash3(vLocal.mul(73.7).add(vec3(11.0, 7.0, 3.0))),
      hash3(vLocal.mul(57.1).add(vec3(5.0, 17.0, 9.0))),
    ).toVar();
    // Igloo: distortionNormal = rough²·2·normalize(noise) — refraction-only
    // jitter (frosted grain); shading keeps the clean facet normal. Round 7:
    // rough is the frost-veined roughEff, so the jitter has STRUCTURE.
    const Nj = normalize(
      N.add(
        normalize(nz.sub(0.5).add(vec3(1e-4, 2e-4, 3e-4))).mul(
          roughEff.mul(roughEff).mul(2.0),
        ),
      ),
    ).toVar();

    // --- Dispersion ladder (igloo §2, 3 samples, k = 0/1/2 per channel).
    // Round 7 §2: CA is fresnel-boosted — fringes concentrate on the
    // silhouette (caEff = uCA·(1 + fres·uCAEdge)), igloo's visible fringes.
    const caEff = uCA.mul(fres.mul(uCAEdge).add(1.0)).toVar();
    const smear = thickEff.mul(pow(roughEff, 0.33)).toVar();
    const base = vLocal.xy.mul(BACKDROP_COORD_SCALE).toVar();
    const inv = float(1).div(uIor);
    // k = 0 (red) eta is iteration-invariant → its refracted direction is
    // hoisted out of the ladder (also feeds the broken ember core below).
    const refrR = refractDir(I, Nj, inv).toVar();
    // --- Round 7-2b §B-a (i) — the SERSAN mark inside the ice. ONE base
    // TextureNode owns the binding (+1 texture +1 sampler — the ONLY texture
    // bindings this material ever has); the tap is .sample(uv).level(lod), a
    // clone referencing the base, so the count stays 2. Igloo's exact lod law:
    // log2(rtSize)·roughness·0.36 — roughEff is the frost-veined roughness, so
    // the veins modulate the mark's blur.
    //
    // ROUND 9-C — the mark is LIFTED OUT OF THE DISPERSION LADDER. It used to
    // be sampled inside it at the per-channel refracted coords; that cost 9
    // texture fetches per fragment and split every hairline stroke into three
    // offset coloured copies — the exact opposite of legibility on a
    // thin-stroked logo (a chunky subject like igloo's penguin gets a nice
    // fringe from it; a wordmark does not). The backdrop keeps ALL of its
    // dispersion; the mark takes exactly ONE tap. −8 fetches/fragment.
    const markOn = markTexture != null && !broken && !lite;
    const markBase = markOn ? texture(markTexture) : null;
    const markLod = markOn
      ? roughEff.mul(Math.log2(MARK_RT_SIZE) * MARK_LOD_K).toVar()
      : null;
    let accR: Any = float(0);
    let accG: Any = float(0);
    let accB: Any = float(0);
    for (let i = 0; i < samples; i++) {
      const fi = float(i);
      const th = thickEff
        .add(smear.mul(fi.add(nz.y).div(3.0)))
        .mul(REFR_OFFSET_SCALE);
      const etaG = float(1).div(
        uIor.mul(float(1).add(caEff.mul(fi.add(nz.x)).div(3.0))),
      );
      const etaB = float(1).div(
        uIor.mul(float(1).add(caEff.mul(2.0).mul(fi.add(nz.z)).div(3.0))),
      );
      const cR = base.add(refrR.xy.mul(th)).toVar();
      const cG = base.add(refractDir(I, Nj, etaG).xy.mul(th)).toVar();
      const cB = base.add(refractDir(I, Nj, etaB).xy.mul(th)).toVar();
      accR = accR.add(backdrop(cR).x);
      accG = accG.add(backdrop(cG).y);
      accB = accB.add(backdrop(cB).z);
    }
    const trans = vec3(accR, accG, accB).div(samples).toVar();

    // === ROUND 14 stage A — SCREEN-SPACE BLURRED REFRACTION + DISPERSION ===
    // igloo's / three's getIBLVolumeRefraction, in this material's idiom:
    // refract the view ray (3 per-channel etas, the ladder's i=0 terms
    // hoisted), walk `uScreenThick·modelScale` in VIEW space, project the
    // exit point through the projection matrix, /w, ·0.5+0.5, flip y (RT
    // textures are y-DOWN on both backends — MARK_FLIP_Y's derivation), and
    // tap the framebuffer copy at `lod = log2(size)·roughEff·0.36` through a
    // roughness-scaled Vogel disk (IGN-rotated per pixel so 4 taps read as
    // grain, not as 4 ghosts). 3 × 4 = 12 fetches, ONE binding (the shared
    // ViewportTextureNode; `.sample().level()` clones reference it).
    //
    // COMPOSITING (dossier §8): the copy holds only what GL drew BEFORE the
    // stone in this pass — the fog quad and, on the broken band, the mark
    // mesh — over transparent black; the DOM is not in it. So the framebuffer
    // is laid OVER the procedural backdrop by its OWN alpha: wherever nothing
    // was drawn behind, `backdrop()` remains the floor and the 8-E value
    // world (uBackdropGain ↔ fog coupling) is untouched. Inside `trans`, so
    // it rides the body multiply, the frost density and the mark rule.
    if (screenFb) {
      const rayLen = uScreenThick.mul(modelScale.y).toVar();
      const lod = log2(screenSize.x).mul(roughEff).mul(uScreenLodK).toVar();
      const etaG0 = float(1).div(
        uIor.mul(float(1).add(caEff.mul(nz.x).div(3.0))),
      );
      const etaB0 = float(1).div(
        uIor.mul(float(1).add(caEff.mul(2.0).mul(nz.z).div(3.0))),
      );
      const dirs: Any[] = [
        refrR,
        refractDir(I, Nj, etaG0).toVar(),
        refractDir(I, Nj, etaB0).toVar(),
      ];
      const phi = interleavedGradientNoise(screenCoordinate.xy)
        .mul(6.2832)
        .toVar();
      const tapR = uScreenBlurPx.mul(roughEff).div(screenSize).toVar();
      const chan: Any[] = [];
      let accA: Any = float(0);
      const comps = ["x", "y", "z"] as const;
      for (let c = 0; c < 3; c++) {
        const exitView = vPosView.add(dirs[c].mul(rayLen));
        const ndc = cameraProjectionMatrix.mul(vec4(exitView, 1.0)).toVar();
        const uv0 = ndc.xy.div(ndc.w).mul(0.5).add(0.5);
        const uvC = vec2(uv0.x, float(1).sub(uv0.y)).toVar();
        let sum: Any = float(0);
        let sumA: Any = float(0);
        for (let t = 0; t < REFR_SCREEN_TAPS; t++) {
          const off = vogelDiskSample(int(t), int(REFR_SCREEN_TAPS), phi).mul(
            tapR,
          );
          const s = screenFb.sample(uvC.add(off)).level(lod).toVar();
          sum = sum.add(s[comps[c]]);
          sumA = sumA.add(s.w);
        }
        chan.push(sum.div(REFR_SCREEN_TAPS));
        accA = accA.add(sumA.div(REFR_SCREEN_TAPS));
      }
      const fbCol = vec3(chan[0], chan[1], chan[2]);
      const fbA = clamp(accA.div(3.0), float(0), float(1));
      trans.assign(mix(trans, fbCol, fbA.mul(uScreenMix)));
    }

    // === ROUND 14 WAVE 2 — THE INNER OBJECT, igloo's TWO-PASS READ =========
    // The mark mesh rendered from the MAIN camera into its own mipmapped RT
    // (crystalInnerRT.ts) and sampled with the SAME projective ray walk as
    // stage A: per sample i and channel c, refract at the per-channel eta
    // (1 + uInnerCA·k·(i+noise)/3, k = 0/1/2 — igloo's ladder), walk
    // `uInnerThick + smear·(i+noise)/3` with smear = thick·pow(rough, .33),
    // project the exit point, tap at lod = log2(rtSize)·roughEff·uInnerLodK.
    // 3 × RGB = 9 fetches on a ≤0.5 MP RT, ONE binding. Composited by the
    // RT's own alpha as a REPLACEMENT of `trans` (an opaque object inside
    // covers what is behind it), AFTER stage A (so the crisp copy the
    // framebuffer may hold on the broken band is superseded by the blurred,
    // dispersed one) and BEFORE the body multiply — so the mark rides
    // Beer–Lambert, the frost density and the crust like everything inside.
    if (innerBase) {
      const mS = modelScale.y;
      const rayLen0 = uInnerThick.mul(mS).toVar();
      const smearI = uInnerThick.mul(pow(roughEff, 0.33)).mul(mS).toVar();
      const lodI = uInnerLog2.mul(roughEff).mul(uInnerLodK).toVar();
      const caI = uInnerCA.mul(fres.mul(uCAEdge).add(1.0)).toVar();
      const noiseC: Any[] = [nz.y, nz.x, nz.z];
      const compsI = ["x", "y", "z"] as const;
      let iR: Any = float(0);
      let iG: Any = float(0);
      let iB: Any = float(0);
      let iA: Any = float(0);
      const accI: Any[] = [iR, iG, iB];
      for (let i = 0; i < INNER_SAMPLES; i++) {
        const fi = float(i);
        const etaGi = float(1).div(
          uIor.mul(float(1).add(caI.mul(fi.add(nz.x)).div(INNER_SAMPLES))),
        );
        const etaBi = float(1).div(
          uIor.mul(
            float(1).add(caI.mul(2.0).mul(fi.add(nz.z)).div(INNER_SAMPLES)),
          ),
        );
        const dirsI: Any[] = [
          refrR,
          refractDir(I, Nj, etaGi).toVar(),
          refractDir(I, Nj, etaBi).toVar(),
        ];
        for (let c = 0; c < 3; c++) {
          const len = rayLen0.add(
            smearI.mul(fi.add(noiseC[c]).div(INNER_SAMPLES)),
          );
          const exitV = vPosView.add(dirsI[c].mul(len));
          const ndcI = cameraProjectionMatrix.mul(vec4(exitV, 1.0)).toVar();
          const uvI0 = ndcI.xy.div(ndcI.w).mul(0.5).add(0.5);
          const uvI = vec2(uvI0.x, float(1).sub(uvI0.y));
          const sI = innerBase.sample(uvI).level(lodI).toVar();
          accI[c] = accI[c].add(sI[compsI[c]]);
          iA = iA.add(sI.w);
        }
      }
      iR = accI[0];
      iG = accI[1];
      iB = accI[2];
      let innerCol: Any = vec3(iR, iG, iB).div(INNER_SAMPLES);
      const innerA = clamp(iA.div(3 * INNER_SAMPLES), float(0), float(1));
      if (INNER_UNPREMUL) {
        // WAVE 2.1 — the mip chain averages straight-alpha texels over the
        // transparent-black clear, i.e. the tap IS premultiplied: un-
        // premultiply (/ max(alpha, 1e-3)) before the mix-by-alpha composite,
        // otherwise the blurred mark wears a dark halo.
        innerCol = innerCol.div(max(innerA, float(1e-3)));
      }
      trans.assign(mix(trans, innerCol, innerA.mul(uInnerMix)));
    }

    if (markBase) {
      // === ROUND 9-C — THE ORIGIN-REGISTERED PERSPECTIVE MAP =================
      // (research/2026-08-22-round9-inner-object-mechanism.md §3.2, Variant A.)
      //
      // igloo's mechanism, verbatim: refract the view ray, walk `thickness ·
      // modelScale`, then PROJECT the exit point (proj·view, /w, ·0.5+0.5) and
      // sample the transmission RT there. The projection is what does the work:
      // moving along a ray through the camera does not move NDC.xy at all
      //     project(p + λ·Î) ≡ project(p)   for every λ
      // so the ENTIRE cos δ component of the transmission ray — 95–99 % of its
      // length — contributes exactly zero screen displacement, and what is left
      // is the lateral `T·sin δ`. The base map is therefore the projective
      // IDENTITY: the subject lands where the subject is, perturbed by a few
      // percent. That is the whole reason igloo's penguin is legible, and its
      // absence is the whole reason ours was confetti (config, the
      // MARK_COORD_SCALE removal note: an ORTHOGRAPHIC projection along the
      // tumbling crystal's LOCAL Z, which FOLDS past ~75°, plus an uncancelled
      // view-space direction worth ±117 px of facet-to-facet jump).
      //
      // Our RT holds ONLY the subject (igloo's holds the whole scene), so we do
      // not need a screen-sized RT: we need the SAME projective map, re-centred
      // on the mark and normalised by its extent. Hence "origin-registered" —
      // project the exit point AND the crystal origin (`modelViewPosition`,
      // which is the mark's centre: the slab GLB is exactly origin-centred and
      // the mesh carries no offset, igloo's sibling arrangement) and take the
      // difference.
      //
      // THE ALGEBRA, WRITTEN OUT (check-round correction — an earlier draft of
      // this comment compressed it to "markUv − 0.5 = uMarkThick·sin δ/(2·
      // uMarkHalf)", which is the DISPLACEMENT term alone and would describe a
      // mark collapsed to a point). With the camera at the view-space origin,
      // the crystal origin at view z = −D, the fragment at view z = −(D−d) and
      // q = exitView − origin, the P00/P11 of a symmetric frustum cancel
      // against halfNdc and what is left is
      //     markUv − 0.5 = [ q.xy·D/(D−d) + o.xy·d/(D−d) ] / (2·uMarkHalf·scale)
      // i.e. exactly "intersect this fragment's view ray with a screen-facing
      // billboard of half-extent uMarkHalf pinned at the crystal's centre".
      //   · term 1 is the BASE MAP: injective in screen space by construction
      //     (one ray ⇒ one billboard point), so it cannot fold at any tumble.
      //     Two surface fragments can only share a uv if they share a view
      //     ray, i.e. if one is behind the other — and this material never sets
      //     `side`, so it is FrontSide: back faces are culled outright. What
      //     survives that is only a CONCAVE front surface, and the mark branch
      //     is `!broken && !lite`: it runs solely on the intact convex-ish slab
      //     (34 patches, no reflex dihedrals), never on the fractured build
      //     where shards genuinely overlap in screen space.
      //   · term 2 is the PARALLAX of an off-axis stone (o.xy ≠ 0): the mark
      //     sits at mid-depth, so the near cap sees it shifted outward. Real,
      //     wanted, and what igloo's sibling penguin does too.
      //   · what genuinely cancels: fov, aspect, viewport size, DPR, and the
      //     model scale (h is scaled by the same `modelScale`). The DEPTH RATIO
      //     D/(D−d) survives — it IS the perspective, ~1.15–1.3 across the cap.
      // The refraction rides on top of term 1 as a bounded displacement:
      //     Δ(markUv) = uMarkThick · sin δ · D/(D−d) / (2 · uMarkHalf)
      // ≤ uMarkThick/(2·uMarkHalf) = 0.152 uv even at total-deviation δ = 90°
      // (unreachable: eta = 1/1.18 < 1 ⇒ no TIR, δ ≤ 32.1° at grazing).
      //
      // SAFE FORM: the half-extent is obtained by projecting a SECOND point
      // (origin + (h,h,0)) rather than indexing `cameraProjectionMatrix[0].x`
      // — matrix element access on this node is not verified on the WGSL
      // backend (round-9 doc §3.2 + Caveats). It is also EXACT rather than an
      // approximation: adding (h,h,0) leaves the view z untouched, so
      // ndcH.w ≡ ndcO.w and halfNdc = (P00·h, P11·h)/w with no error term.
      // (Verified for THIS camera: Scene.tsx mounts one symmetric
      // PerspectiveCamera — fov 50, near 0.1, far 200 — and nothing in the repo
      // calls setViewOffset/filmOffset, so row 4 of P is (0,0,−1,0) and
      // w ≡ −z_view. P00, P11 > 0 at every aspect and w = D > 0 for the
      // camera-locked band, so halfNdc is strictly positive and the 1e-6 floor
      // is a NaN guard that never fires in a reachable pose.)
      // Cost: 3 mat4·vec4 + 3 divides, of which the origin/half pair are
      // fragment-invariant per draw (pure uniform expressions — hoisted by any
      // uniform-expression folding, and ~60 ALU even if not).
      //
      // Y-FLIP: `uMarkFlipY` is **−1**, derived from the three source, not left
      // to the browser — three's own transmission does the same `ndc/w·0.5+0.5`
      // and then `y.oneMinus()  // webgpu` (PhysicalLightingModel.js:133-136),
      // and RT textures share the framebuffer-texture uv convention
      // (TextureNode.js:853): uv.y = 0 is the TOP of the rendered image on BOTH
      // backends. Full derivation on crystalConfig MARK_FLIP_Y.
      //
      // TRADE-OFF, taken deliberately: the mark is SCREEN-UPRIGHT, not tumbling
      // in 3D. The tumble reaches 90° off the view axis inside a normal scroll
      // pass and a logo rotated 90° is unreadable however correct its
      // refraction is — "si vede il logo" requires upright. The re-enable path
      // is one flag: MARK_TUMBLE in the config (crystalMarkRT copies the mesh
      // quaternion into the RT scene).
      const mScale = modelScale.y; // group scale is uniform
      const exitView = vPosView
        .add(refrR.mul(uMarkThick.mul(mScale)))
        .toVar();
      const hOff = uMarkHalf.mul(mScale).toVar();
      const ndcE = cameraProjectionMatrix.mul(vec4(exitView, 1.0)).toVar();
      const ndcO = cameraProjectionMatrix
        .mul(vec4(modelViewPosition, 1.0))
        .toVar();
      const ndcH = cameraProjectionMatrix
        .mul(vec4(modelViewPosition.add(vec3(hOff, hOff, 0.0)), 1.0))
        .toVar();
      const ndcO2 = ndcO.xy.div(ndcO.w).toVar();
      const dNdc = ndcE.xy.div(ndcE.w).sub(ndcO2).toVar();
      // P00/P11 > 0 and w = −z_view > 0 for anything in front of a standard
      // symmetric frustum, so halfNdc is strictly positive at every aspect and
      // this `max` is a no-op in every reachable pose (the group's scale is
      // `(0.8 + 0.2·reveal)·(1 − velScaleK·vel) · …` and never reaches 0). It
      // is a pure NaN/÷0 guard for a degenerate matrix; note it clamps rather
      // than inverts — a negative or vanishing half-extent yields a huge uv,
      // which lands on the transparent clamp border, i.e. additive-zero.
      const halfNdc = max(
        ndcH.xy.div(ndcH.w).sub(ndcO2),
        vec2(1e-6, 1e-6),
      ).toVar();
      const markUv = dNdc
        .div(halfNdc.mul(2.0))
        .mul(vec2(1.0, uMarkFlipY))
        .add(0.5)
        .toVar();
      // Out-of-frame samples land on the RT's clamp-to-edge border, which is
      // transparent black by construction (MARK_RT_FRAME keeps 0.15 / 0.336 of
      // margin around the mark) → additive-zero, no smear.
      //
      // Additive over the procedural backdrop, PRE body-darken — UNCHANGED
      // compositing site, so the mark still rides the dark-glass multiply +
      // frost density veining like igloo's transmission sample, and the whole
      // 8-H/8-I gain arithmetic on MARK_GAIN (ordering tie 0.822 against the
      // brightest frost vein, bloom headroom, CRYSTAL_CEIL) survives verbatim:
      // at full coverage the mean of three saturated taps IS the single tap.
      trans.assign(
        trans.add(markBase.sample(markUv).level(markLod).xyz.mul(uMarkGain)),
      );
    }

    // --- Round 7 §2 — DARK GLASS BODY: transmitted color × uBodyDarken (the
    // stone reads darker than the backdrop mid-tone — the meteorite read),
    // with per-facet value jitter (§1) + frost density veining (§4).
    //
    // ROUND 8-H: `aFacet` is now per PLANAR PATCH, so this multiply steps
    // across whole planes instead of dithering across micro-triangles — and
    // the MARK is inside `trans`, i.e. it rides this multiply too. That is the
    // second reason FACET_VALUE_JIT was cut to ±9 % (config): at ±15 % the
    // wordmark's brightness would step from plane to plane, re-introducing
    // patchiness in the very image this round exists to make readable. ------
    const fJit = vFacet;
    // === ROUND 14 stage B — BEER–LAMBERT ABSORPTION / MILKY DEPTH ==========
    // three's volumeAttenuation, per channel: T = C^(d / ref) with C the
    // transmittance at the reference chord (ABSORB_COLOR, lum 0.30 = the flat
    // BODY_DARKEN it replaces, so the 8-F body row holds at the median), d the
    // BAKED per-vertex chord (authored slab, both tiers) or the analytic proxy
    // (procedural fallback). Deep paths go navy, thin rims go clear, and the
    // milk term desaturates the deepest paths. `uAbsorbMix` 0 is byte-for-
    // byte the old multiply (ICE_ABSORB false also drops the attribute).
    let bodyK: Any = uBodyDarken;
    if (absorbOn) {
      let thick: Any;
      if (vThick) {
        thick = vThick;
      } else {
        const nv = clamp(dot(N, V), float(0), float(1));
        thick = uAbsorbRef.mul(
          nv.mul(nv).mul(THICK_PROXY_B).add(THICK_PROXY_A),
        );
      }
      const T = exp(
        lnAbsC.mul(thick).div(max(uAbsorbRef, float(1e-3))),
      ).toVar();
      const lumT = dot(T, vec3(0.2126, 0.7152, 0.0722));
      const Tm = mix(T, vec3(lumT, lumT, lumT), uAbsorbMilk);
      bodyK = mix(vec3(uBodyDarken, uBodyDarken, uBodyDarken), Tm, uAbsorbMix);
    }
    let col: Any = trans
      .mul(bodyK)
      .mul(fJit.y.mul(FACET_VALUE_JIT).add(1 - FACET_VALUE_JIT / 2));
    if (frost !== null) {
      col = col.mul(frost.mul(FROST_DENSITY_K).add(1.0));
    }
    // === ROUND 14 WAVE 2 — CRUST ALBEDO + OPACITY ===========================
    // The crust makes the face more OPAQUE (the transmitted body is cut by
    // crust·CRUST_BODY_K) and paints a cool blue-white frost over it, face →
    // ridge tint by the ridge term, lightly hemisphere-lit. CRUST_LEVEL 0.2
    // keeps a full ridge under the lobe/rim (0.276) and well over the body.
    if (crust) {
      col = col.mul(float(1).sub(crust.mul(CRUST_BODY_K)));
      const crustCol = mix(crustFaceC, crustRidgeC, crustRidge);
      const hemiC = N.y.mul(0.5).add(0.5);
      col = col.add(
        crustCol.mul(crust).mul(CRUST_LEVEL).mul(hemiC.mul(0.4).add(0.8)),
      );
    }

    // --- Round 7-2b §B-a (ii) — the BROKEN ember core: a 3-blob gaussian
    // SDF (cluster-center ellipsoid + two blobs riding the LARGE shards'
    // centroids, tracking the explode exactly like the vertex path), sampled
    // at the k=0 refracted point pushed EMBER_DEPTH into the body — the
    // "something still alive inside" read. Desaturated amber, gain ≤0.35 →
    // sub-bloom at any phase; dims as the gap explodes, brightens on the
    // hover re-cohere, plus a slow two-sine flicker. Zero bindings. Full
    // tier only (lite compiles no new branches — QA gate). ------------------
    if (broken && !lite) {
      const pE = vLocal.add(refrR.mul(EMBER_DEPTH)).toVar();
      let ember: Any = exp(
        dot(pE, pE).mul(-2.0 / (EMBER_R0 * EMBER_R0)),
      );
      for (const si of EMBER_SHARDS) {
        const c = shardCentrs[si];
        const r = shardRands[si];
        if (!c || !r) continue;
        // Centroid = centr·(1 + gap + idle drift) — the vertex-explode twin
        // (r[0]/r[1] are the shard's baked rand.x/rand.y, JS constants).
        const drift = float(r[1])
          .mul(sin(float(r[0] * 5).add(uTime.mul(0.5))))
          .mul(uDrift);
        // ROUND 15 — the aperture twin. EMBER_SHARDS = [0, 1] and BOTH are
        // pieces the floor moves, so without this the two amber blobs would
        // float free of their shards at 54% brightness (the breathe term is
        // still 0.54 at the full-open gap).
        const rXYe = Math.max(Math.hypot(c[0], c[1]), 1e-4);
        const m = max(
          uGap.add(1.0).add(drift),
          uGap.mul(float(apertureK / rXYe)),
        );
        const bc = vec3(c[0], c[1], c[2]).mul(m);
        const dv = pE.sub(bc).toVar();
        ember = ember.add(
          exp(dot(dv, dv).mul(-2.0 / (EMBER_R1 * EMBER_R1))),
        );
      }
      const breathe = float(1.0).div(uGap.mul(EMBER_GAP_DIM).add(1.0));
      const flicker = sin(uTime.mul(1.3))
        .mul(sin(uTime.mul(2.7).add(1.7)))
        .mul(EMBER_FLICKER)
        .add(1.0);
      col = col.add(
        emberC.mul(ember).mul(uEmberGain).mul(breathe).mul(flicker),
      );
    }

    // === ROUND 14 stage C — INTERNAL FROST / CRACK PARALLAX LAYERS ==========
    // The ember-core idiom generalised: each layer is evaluated at
    // `vLocal + refrR·depth` — the k=0 refracted ray encodes the view, so the
    // sheets slide against each other as the stone tumbles (parallax). Per
    // layer: a ridged 3-octave perlin (mx_fractal_noise_float) windowed into
    // thin bright seams (cracks) + a worley cellular cloud (milk) on the two
    // shallow layers; deeper = dimmer (exp(−depth·atten), riding the
    // absorption). Sub-bloom by construction (config INNER_GAIN derivation).
    if (innerOn) {
      let inner: Any = vec3(0.0, 0.0, 0.0);
      // WAVE 2 (meteorite) — sparse dark mineral inclusions: worley cells at
      // the same parallax depths, dark where the cell distance is under
      // INCLUSION_R (dots, not clouds), depth-weighted like the seams.
      let inclSum: Any = meteoriteOn ? float(0) : null;
      for (let k = 0; k < FROST_LAYER_DEPTHS.length; k++) {
        const depth = FROST_LAYER_DEPTHS[k];
        const p = vLocal.add(refrR.mul(depth)).toVar();
        const n = mx_fractal_noise_float(
          p.mul(FROST_LAYER_FREQ[k]),
          3,
          2.0,
          0.5,
        ).toVar();
        const cracks = smoothstep(uCrackLo, uCrackHi, float(1).sub(abs(n)));
        let term: Any = cracks.mul(uCrackGain);
        if (FROST_LAYER_MILK[k]) {
          const milk = smoothstep(
            float(0.35),
            float(0.75),
            mx_worley_noise_float(p.mul(FROST_MILK_FREQ)),
          );
          term = term.add(milk.mul(uMilkGain));
        }
        const w = exp(uInnerAtten.mul(-depth));
        inner = inner.add(frostC.mul(term).mul(w));
        if (inclSum) {
          const wd = mx_worley_noise_float(
            p.mul(INCLUSION_FREQ).add(vec3(3.1, 7.7, 1.3)),
          );
          const incl = float(1).sub(
            smoothstep(float(INCLUSION_R * 0.5), float(INCLUSION_R), wd),
          );
          inclSum = inclSum.add(incl.mul(w));
        }
      }
      if (inclSum) {
        col = col.mul(
          float(1).sub(
            clamp(inclSum.mul(uInclusionGain), float(0), float(0.9)),
          ),
        );
      }
      col = col.add(inner.mul(uInnerGain).mul(fJit.y.mul(0.1).add(0.95)));
    }

    // --- Round 8-E §D3 — ANALYTIC AMBIENT HEMISPHERE (priority 4). Until
    // now this material had NO ambient term: two hard analytic lobes added
    // directly, no Fresnel weighting, no wrap, no floor — which is why the
    // facets read binary lit/unlit and the body could go fully black. igloo's
    // stone is lit by a real IBL whose DOMINANT contribution is a broad cool
    // ambient, not the sun: their env map runs p25 0.272 → p75 0.798 over a
    // ~3× vertical gradient, 73.7 % cool, 8.7 % warm; the ~3411× sun's
    // integrated power (0.33 sr·radiance) is merely COMPARABLE to that base.
    // Encoded as one hemisphere lerp on the view-space normal (consistent
    // with FACET_KEY_DIR / FACET_FILL_DIR, which are already view-space-fixed
    // directions) — ~6 ALU, zero textures, zero PMREM, zero repo assets. It
    // is what finally gives the body a FLOOR: 0.0072 lumLin at N.y = −1.
    // Runs on LITE too — it is the cheap half of the fix and the value world
    // is not a garnish. ------------------------------------------------------
    const hemi = N.y.mul(0.5).add(0.5);
    col = col.add(
      ambC.mul(mix(float(AMBIENT_DOWN), float(AMBIENT_UP), hemi)).mul(uAmbGain),
    );

    // --- Round 7 §1 — 2-lobe environment: white-cyan key spec lobe + navy
    // fill. The key lobe uses a PER-FACET tilted normal (baked aFacet) with
    // a lowish exponent → facets catch distinct values and flash
    // independently as the crystal tumbles (the #1 flatness killer).
    //
    // ROUND 8-H — RE-LEVELLED, not re-designed. uFacetJit existed to fake
    // normal variety on a mesh that had none (a subdivided icosahedron's
    // facets are nearly co-oriented); the authored slab supplies real variety
    // (34 patches, dihedral p90 66.8°, p99 123.5°) and the jitter now tilts
    // whole PLANES, so it was cut 0.35 → 0.12 (RMS tilt 9.9° → 3.4°, max
    // 16.9° → 5.9°). uSpecGain 0.32 → 0.26 and FACET_SPEC_JIT 0.8 → 0.45 keep
    // the brightest lit plane at 0.276 lumLin — the round-8-F value table's
    // "brightest ordinary pixel", now honoured WITH the jitter included
    // (8-F quoted 0.277 with amp = 1; the old 1.4× ceiling really reached
    // 0.388). Every one of these is a config constant + a live uniform. -----
    const key = normalize(vec3(...FACET_KEY_DIR));
    const fill = normalize(vec3(...FACET_FILL_DIR));
    const H = normalize(key.add(V)).toVar();
    const Nf = normalize(N.add(fJit.sub(0.5).mul(uFacetJit))).toVar();
    const spec = pow(max(dot(Nf, H), 0.0), uSpecPow);
    const specAmp = fJit.x.mul(FACET_SPEC_JIT).add(1 - FACET_SPEC_JIT / 2);
    col = col.add(keyC.mul(spec).mul(uSpecGain).mul(specAmp));
    col = col.add(fillC.mul(max(dot(N, fill), 0.0)).mul(uFillGain));

    // === ROUND 14 stage D — ENV SPECULAR (PMREM) + SCHLICK + CLEARCOAT =====
    // The mark's asset-free 16×256 canvas equirect, PMREM-prefiltered once by
    // PMREMNode and sampled at the WORLD-space reflection of the clean
    // shading normal with roughEff as the level (the frost veins modulate the
    // reflection's blur exactly as they do the mark's). Weighted by
    // F_Schlick(f0 = 0.02): near-zero face-on, → 1 at grazing, which is
    // where igloo's sharp cool rims come from on the flat authored patches.
    // The clearcoat is a GGX lobe at α = COAT_ROUGH² on the UN-jittered N
    // against the key half-vector, NORMALISED to peak 1 (D·π·α²) so the gain
    // is an absolute lumLin — the wet pinpoint. Both sit under the ceiling
    // (config ENV_GAIN / COAT_GAIN derivations). +1 texture +1 sampler.
    let envSpec: Any = null;
    if (envRef) {
      const R = reflect(I, N);
      const Rw = R.transformDirection(cameraWorldMatrix);
      envSpec = pmremTexture(envRef, Rw, roughEff).rgb.toVar();
      const Fs = F_Schlick({
        f0: vec3(ENV_F0, ENV_F0, ENV_F0),
        f90: float(1.0),
        dotVH: clamp(dot(N, V), float(0), float(1)),
      }).toVar();
      col = col.add(envSpec.mul(Fs).mul(uEnvGain));
      const alphaC = uCoatRough.mul(uCoatRough).toVar();
      const dotNH = clamp(dot(N, H), float(0), float(1));
      const Dn = D_GGX({ alpha: alphaC, dotNH }).mul(
        alphaC.mul(alphaC).mul(Math.PI),
      );
      col = col.add(keyC.mul(Dn).mul(uCoatGain));
    }

    // --- Round 7-2b rollout 4 — WARM GLINT LOBE (§A3 mechanism twin): a
    // third, NARROW env lobe in desaturated amber. Gated on the facet-tilted,
    // ripple-perturbed Nf with a tight pow → it flashes only at specific
    // tumble angles, the mid-tumble bronze patch of igloo's env EXR. Gain
    // ≤0.25 keeps it sub-bloom always. Full tier only. ----------------------
    if (!lite) {
      const wd = normJs(WARM_DIR);
      const warm = pow(
        max(dot(Nf, vec3(wd[0], wd[1], wd[2])), 0.0),
        float(WARM_POW),
      );
      col = col.add(warmC.mul(warm).mul(uWarmGain));
    }

    // --- Round 7 §3 — sparkle glints (FULL tier): hash cells over the
    // stable local position; each live cell owns a micro-normal, its glint
    // gates on view/normal/light alignment (winks as the crystal tumbles)
    // plus a slow time wink; gain >1.0 so single pixels bloom. Sparse by
    // contract: SPARKLE_DENSITY culls ~72% of cells. ----------------------
    if (!lite) {
      const cell = floor(vLocal.mul(SPARKLE_FREQ)).toVar();
      const c1 = hash3(cell.add(vec3(0.31, 0.47, 0.71))).toVar();
      const c2 = hash3(cell.add(vec3(5.2, 1.3, 7.7)));
      const c3 = hash3(cell.add(vec3(9.1, 3.7, 2.3)));
      const micro = normalize(
        N.add(vec3(c1, c2, c3).sub(0.5).mul(SPARKLE_TILT)),
      );
      const glint = pow(max(dot(micro, H), 0.0), float(SPARKLE_POW));
      const gate = smoothstep(
        float(SPARKLE_DENSITY),
        float(SPARKLE_DENSITY + 0.08),
        hash3(cell.add(vec3(2.4, 8.8, 4.4))),
      );
      const wink = smoothstep(
        float(0.35),
        float(0.9),
        sin(uTime.mul(SPARKLE_TWINKLE).add(c1.mul(6.2832)))
          .mul(0.5)
          .add(0.5),
      );
      col = col.add(
        keyC.mul(glint).mul(gate).mul(wink).mul(uSparkleGain),
      );
    }

    // === ROUND 14 stage E — FINER SCREEN-STABLE MICRO-FACET GLINTS =========
    // A second cell layer at SPARKLE_FREQ2 (≈3 px cells at the measured
    // band): per-cell micro-normal from mx_cell_noise_float, riding the
    // frost-JITTERED Nj (so the glints follow the grain, not the clean
    // facet), gated tight (pow 120) and FADED by fwidth — cells that fall
    // under ~2 screen px vanish instead of shimmering as the stone recedes.
    // Sub-bloom (gain ≤ the key lobe). Stage F re-uses glint2/cellHash2.
    let glint2: Any = null;
    let cellHash2: Any = null;
    let sparkleFade: Any = null;
    if (sparkle2On) {
      const cell2 = floor(vLocal.mul(SPARKLE_FREQ2)).toVar();
      const fw = fwidth(vLocal).toVar();
      const cellPx = float(1).div(
        max(max(fw.x, fw.y), fw.z).mul(SPARKLE_FREQ2).add(1e-5),
      );
      sparkleFade = smoothstep(
        float(SPARKLE2_FADE_PX[0]),
        float(SPARKLE2_FADE_PX[1]),
        cellPx,
      ).toVar();
      const mN = vec3(
        mx_cell_noise_float(cell2.add(vec3(0.5, 0.5, 0.5))),
        mx_cell_noise_float(cell2.add(vec3(7.5, 3.5, 1.5))),
        mx_cell_noise_float(cell2.add(vec3(2.5, 9.5, 5.5))),
      )
        .sub(0.5)
        .mul(SPARKLE2_TILT);
      const micro2 = normalize(Nj.add(mN));
      glint2 = pow(max(dot(micro2, H), 0.0), float(SPARKLE2_POW)).toVar();
      cellHash2 = hash3(cell2.add(vec3(3.3, 1.1, 8.8))).toVar();
      const gate2 = smoothstep(
        float(SPARKLE2_DENSITY),
        float(SPARKLE2_DENSITY + 0.06),
        cellHash2,
      );
      col = col.add(
        keyC.mul(glint2).mul(gate2).mul(sparkleFade).mul(uSparkle2Gain),
      );
    }

    // --- Round 7 §2 — DISPERSIVE RIM: per-channel fresnel exponents (blue
    // reaches further inward than red → spectral fringe), whitened toward
    // extreme grazing.
    //
    // ROUND 8-E §B4.2 part 3 — COMPRESSED. Round 7 pushed RIM_BASE to 1.6 so
    // the whole grazing band crossed 1.0 into bloom; measured, that put the
    // rim at 238× the body while the sparkle ran at 569×, and a body pinned
    // at 1.03:1 against the page underneath — the literal arithmetic of a
    // glowing white outline on black. At 0.35 the broad rim peaks at 0.277
    // lumLin ≈ 4.9× the raised body: present, dispersive, and no longer the
    // brightest thing on the stone (the key lobe is).
    //
    // The >1.0 bloom is not deleted, it is re-scoped to a HAIRLINE: `edge`
    // gates a second, ungraded term on the extreme-grazing band alone
    // (uRimEdgeStart 0.90 ⇒ within ~5.7° of grazing), taking the peak to
    // 1.187 col-lum → 1.116 post-blend, a bloom INPUT of ~0.12. ⚠ This is the
    // doc's one OPEN OWNER DECISION (§B4.2 part 3), taken conservatively
    // because the >1.0 selective-bloom contract is a house signature; the
    // igloo-faithful alternative is uRimEdge 0 + uCeil 1.0 (no pinpoint bloom
    // anywhere on the crystal), both live on the dev handle. ---------------
    const rim3 = vec3(
      pow(f1, float(FRESNEL_POW * RIM_DISPERSION)),
      fres,
      pow(f1, float(FRESNEL_POW / RIM_DISPERSION)),
    );
    const rimCol = mix(uColCyan, vec3(1.0, 1.0, 1.0), f1.mul(RIM_WHITEN));
    col = col.add(rimCol.mul(rim3).mul(uRimBase.add(uFlash.mul(uRimFlash))));
    const edge = smoothstep(uRimEdgeStart, float(1.0), f1);
    col = col.add(rimCol.mul(edge).mul(uRimEdge));
    // ROUND 14 stage F (half 1) — the ENV hairline: the sky-band reflection
    // on the same extreme-grazing gate, PRE-ceiling like the rim hairline so
    // it clips at uCeil rather than stacking past it.
    if (envSpec) {
      col = col.add(envSpec.mul(edge).mul(uEnvEdge));
    }

    // --- Round 8-E §B4.2 part 3 — THE VALUE CEILING. igloo caps every stone
    // pixel with `outgoingLight = clamp(…, 0, 1)` (bundle L38013), which is
    // exactly why its brightest pixel is at most 3.4× its body and its whole
    // stone lives in a 7.9:1 window; we had no ceiling at all. Every term
    // above is non-negative by construction (the frost density factor bottoms
    // at 0.725 and the facet value jitter at 0.91 — round 8-H; it was 0.85
    // while FACET_VALUE_JIT was 0.3), so only the upper clamp is
    // needed — `min` against a broadcast uniform keeps it cross-backend (WGSL
    // `clamp` requires matching component types; `min(vec3, vec3)` does not).
    // With uCeil 1.35 the ignition flash saturates against it exactly as
    // igloo's clamp does, while the rim hairline stays just below.
    col = min(col, vec3(uCeil, uCeil, uCeil));

    // === ROUND 14 stage F (half 2) — SPARSE BLOOM GLINTS, POST-CEILING =====
    // The hairline contract extended: ~4 % of the fine cells (a second, far
    // sparser gate on the SAME cell hash) get the stage-E glint added AFTER
    // the clamp so it is not compressed — keyC·1.3 ≥ 1.17 col-lum → ≥ 1.10
    // post-blend, over the 1.0 bloom threshold on single pixels only, and
    // still fwidth-faded so far stones do not sparkle-bloom. 0 = off.
    if (bloomGlintsOn && glint2) {
      const gateSparse = smoothstep(
        float(GLINT_BLOOM_DENSITY),
        float(GLINT_BLOOM_DENSITY + 0.03),
        cellHash2,
      );
      col = col.add(
        keyC.mul(glint2).mul(gateSparse).mul(sparkleFade).mul(uGlintBloom),
      );
    }

    // --- Depth fade (igloo fog-mix window, adapted to ALPHA — header) ------
    const dRel = length(vPosView)
      .sub(uCamDist0)
      .div(max(uWorldScale, 1e-4));
    const fade = falloffsmooth(
      dRel,
      FADE_FROM,
      FADE_TO,
      FADE_MARGIN,
      uFadeProgress,
    );
    // WAVE 2 — the crust lifts the alpha slightly where it is high (≤ 1);
    // CRYSTAL_ALPHA itself is untouched (crust = 0 ⇒ byte-identical).
    const alphaBase: Any = crust
      ? min(uAlpha.mul(crust.mul(CRUST_ALPHA_K).add(1.0)), float(1.0))
      : uAlpha;
    const alpha = alphaBase
      .mul(fade.mul(FADE_MAX).add(1 - FADE_MAX))
      .mul(uReveal)
      .toVar();
    // depthWrite:true + transparent body (header): fragments that are
    // effectively invisible — the reveal ramp near 0 (reload mid-page), and
    // deep shards settled at the fade FLOOR (uAlpha·(1−FADE_MAX) ≈ 0.046) —
    // must NOT stamp the depth buffer: the SignatureLine renders later with
    // depthTest:true (lineNodeMaterial) and an invisible occluder would
    // punch holes in it (the SequenceSingularity depth-stamp post-mortem).
    // Same alpha-Discard idiom as particleNodeMaterial / neuralFieldCompute;
    // 0.05 sits just above the fade floor (round 7: 0.94·(1−FADE_MAX) ≈
    // 0.047 — still under) so fully-faded shards vanish instead of holding a
    // ghost film + phantom occlusion. Round-8-E re-check (this rationale used
    // to read "carried by the >1.0 rim + glints", which the compression
    // deleted): the rim is now 0.35 and the sparkle 0.5, but the body itself
    // rose ~8× (uBackdropGain + the ambient floor 0.0072, which the old build
    // did not have at all), so the silhouette that survives to the Discard is
    // now the BODY rather than its highlights — the correct read, and a
    // strictly larger value than before at every fade step.
    Discard(alpha.lessThan(0.05));
    return vec4(col, alpha);
  })();

  material.colorNode = (shade as Any).xyz;
  material.opacityNode = (shade as Any).w;
  material.transparent = true;
  // Solid-ish body: keep depth so shards occlude each other correctly; the
  // additive stream layers render later (depthTest:false) and read as
  // current flowing in front — intended composition.
  material.depthWrite = true;
  material.depthTest = true;
  material.toneMapped = false;

  const uniforms: CrystalUniforms = {
    uTime,
    uReveal,
    uFlash,
    uGap,
    uCamDist0,
    uWorldScale,
    uIor,
    uCA,
    uThickness,
    uRough,
    uRimBase,
    uRimFlash,
    uAlpha,
    uFadeProgress,
    uSpotGain,
    uDrift,
    uShardSpin,
    uBodyDarken,
    uSpecPow,
    uSpecGain,
    uFillGain,
    uFacetJit,
    uCAEdge,
    uSparkleGain,
    uFrostAmp,
    uRippleAmp,
    uWarmGain,
    uEmberGain,
    uMarkGain,
    uMarkThick,
    uMarkHalf,
    uMarkFlipY,
    uBackdropGain,
    uAmbGain,
    uCeil,
    uRimEdgeStart,
    uRimEdge,
    // ROUND 14 — ICE UPGRADE
    uAbsorbRef,
    uAbsorbMix,
    uAbsorbMilk,
    uScreenThick,
    uScreenLodK,
    uScreenBlurPx,
    uScreenMix,
    uInnerGain,
    uInnerAtten,
    uCrackLo,
    uCrackHi,
    uCrackGain,
    uMilkGain,
    uEnvGain,
    uCoatRough,
    uCoatGain,
    uSparkle2Gain,
    uGlintBloom,
    uEnvEdge,
    // ROUND 14 WAVE 2
    uInnerLodK,
    uInnerThick,
    uInnerCA,
    uInnerMix,
    uInnerLog2,
    uCrustGain,
    uCrustRidgePow,
    uGrainNormalAmp,
    uGrainRoughK,
    uInclusionGain,
  };

  return {
    geometry,
    material,
    uniforms,
    shardCentrs,
    shardRands,
    restGap,
    apertureK,
    ice: {
      thickness: absorbOn ? (thickBaked ? "baked" : "proxy") : "off",
      screenRefraction: screenOn,
      env: envOn,
      inner: innerOn,
      sparkle2: sparkle2On,
      bloomGlints: bloomGlintsOn,
      twoPass: twoPassOn,
      crust: crustOn && curvBaked,
      curvature: curvBaked ? "baked" : "off",
      meteorite: meteoriteOn,
      markRt: markTexture != null && !broken && !lite,
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

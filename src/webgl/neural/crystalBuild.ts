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
 *     3 380 triangles are their own facet). Refraction — and with it the
 *     in-ice SERSAN mark — needs contiguous constant-normal regions to carry a
 *     coherent image; that is why MARK_GAIN 0.35 → 2.4 only ever produced
 *     confetti (crystalConfig MARK_GAIN).
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
 *      CrystalCluster's existing useFrame) and sampled ADDITIVELY inside the
 *      dispersion ladder at the per-channel refracted coords with igloo's
 *      exact lod law — lod = log2(rtSize)·roughEff·0.36 — so the frost veins
 *      modulate its softness and tumbling swims it through the relief (the
 *      brand-in-ice twin of igloo's penguin). ONE TextureNode base shared by
 *      every tap via .sample().level() (reference chaining) = exactly +2
 *      fragment bindings (texture + sampler); no other build gets the branch.
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
  MARK_COORD_SCALE,
  MARK_LOD_K,
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
  /** Mark additive gain inside the ladder (dead node unless the mark branch
   * is built — healthy + full + markTexture). */
  uMarkGain: { value: number };
  /** Refraction-coord → mark-RT-UV scale (dead node like uMarkGain). */
  uMarkScale: { value: number };
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

export function createCrystalBuild(args: CrystalBuildArgs): CrystalBuild {
  const { webgpu, tsl, mode, lite, markTexture, sourceGeometry } = args;
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
  } = tsl as Any;

  const broken = mode === "broken";
  const samples = lite ? CRYSTAL_SAMPLES_LITE : CRYSTAL_SAMPLES;

  // === Geometry =============================================================
  // ROUND 8-H: the authored slab is the primary path (see prepareAuthored);
  // the procedural build below survives ONLY as the asset-failure fallback.
  let geometry: Any;
  const shardCentrs: number[][] = [];
  const shardRands: number[][] = [];

  const authored = sourceGeometry
    ? prepareAuthored(sourceGeometry, broken, BufferAttribute)
    : null;
  if (authored) {
    geometry = authored.geometry;
    for (const c of authored.shardCentrs) shardCentrs.push(c);
    for (const r of authored.shardRands) shardRands.push(r);
  } else if (!broken) {
    // FALLBACK — ONE intact crystal: displaced, squashed, flat-shaded. Note
    // this path has NO coplanar patches, so the in-ice mark degrades to the
    // pre-round-8-H confetti read on it; that is accepted for an asset-failure
    // fallback and is why the mark's dev-handle gain stays live.
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
  const uMarkScale = uniform(MARK_COORD_SCALE);
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
    const spinAng = uTime
      .mul(uShardSpin)
      .mul(aRand.x.sub(0.5).mul(2.0))
      .add(aRand.z.mul(6.2832));
    const pR = rotate3D(positionLocal.sub(aCentr), axis, spinAng).add(aCentr);
    // Igloo explode, verbatim: += centr·(gap + rand.y·sin(rand.x·5+t·.5)·drift)
    const explode = aCentr.mul(
      uGap.add(
        aRand.y.mul(sin(aRand.x.mul(5.0).add(uTime.mul(0.5)))).mul(uDrift),
      ),
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

  // === Fragment =============================================================
  // Lobe colors as constant vec3 nodes (linear, via Color) — round 7.
  const keyC = vec3(keyCol.r, keyCol.g, keyCol.b);
  const fillC = vec3(fillCol.r, fillCol.g, fillCol.b);
  // Round 7-2b — desaturated amber constants (warm lobe + broken ember).
  const warmC = vec3(warmCol.r, warmCol.g, warmCol.b);
  const emberC = vec3(emberCol.r, emberCol.g, emberCol.b);
  // Round 8-E — the pre-mixed ambient tint (cool base + 8.7 % warm).
  const ambC = vec3(ambCol.r, ambCol.g, ambCol.b);

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
    // bindings this material ever has); every tap is .sample(uv).level(lod),
    // a clone referencing the base, so the count stays 2 at any sample
    // count. Igloo's exact lod law: log2(rtSize)·roughness·0.36 — roughEff
    // is the frost-veined roughness, so the veins modulate the mark's blur.
    // Sampled INSIDE the ladder at the per-channel refracted coords → the
    // mark disperses/swims exactly like the procedural backdrop. UVs are
    // crystal-local (base is vLocal.xy-derived) → the mark tumbles RIGIDLY
    // with the crystal, igloo's sibling-mesh arrangement. ------------------
    const markOn = markTexture != null && !broken && !lite;
    const markBase = markOn ? texture(markTexture) : null;
    const markLod = markOn
      ? roughEff.mul(Math.log2(MARK_RT_SIZE) * MARK_LOD_K).toVar()
      : null;
    let accR: Any = float(0);
    let accG: Any = float(0);
    let accB: Any = float(0);
    let mAccR: Any = float(0);
    let mAccG: Any = float(0);
    let mAccB: Any = float(0);
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
      if (markBase) {
        mAccR = mAccR.add(
          markBase.sample(cR.mul(uMarkScale).add(0.5)).level(markLod).x,
        );
        mAccG = mAccG.add(
          markBase.sample(cG.mul(uMarkScale).add(0.5)).level(markLod).y,
        );
        mAccB = mAccB.add(
          markBase.sample(cB.mul(uMarkScale).add(0.5)).level(markLod).z,
        );
      }
    }
    const trans = vec3(accR, accG, accB).div(samples).toVar();
    if (markBase) {
      // Additive over the procedural backdrop, PRE body-darken — the mark
      // rides the dark-glass multiply + frost density veining like igloo's
      // transmission sample (MARK_GAIN compensates; see config). ROUND 8-H:
      // with the authored slab's large planes each finally refracting ONE
      // coherent patch of this RT, the gain is unblocked and doubles to 0.70
      // — the full derivation (and the ordering constraint that caps it) is
      // on MARK_GAIN in crystalConfig.
      trans.assign(
        trans.add(vec3(mAccR, mAccG, mAccB).div(samples).mul(uMarkGain)),
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
    let col: Any = trans
      .mul(uBodyDarken)
      .mul(fJit.y.mul(FACET_VALUE_JIT).add(1 - FACET_VALUE_JIT / 2));
    if (frost !== null) {
      col = col.mul(frost.mul(FROST_DENSITY_K).add(1.0));
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
        const m = uGap.add(1.0).add(drift);
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
    const alpha = uAlpha
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
    uMarkScale,
    uBackdropGain,
    uAmbGain,
    uCeil,
    uRimEdgeStart,
    uRimEdge,
  };

  return {
    geometry,
    material,
    uniforms,
    shardCentrs,
    shardRands,
    restGap,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

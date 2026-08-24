/**
 * CRYSTAL CLUSTER — layout + look constants for the ROUND-5 W3 "3D stones"
 * island (CrystalCluster.tsx / crystalBuild.ts). Igloo-mined recipes per
 * research/2026-08-21-igloo-stones-dossier.md (TRANSPLANT PLAN, procedural
 * path); the Blender-GLB silhouette upgrade is a later round.
 *
 * ONE hero crystal per neural section, floating in the open right two-thirds
 * of the `[data-lattice-anchor]` band (the display type owns the left column):
 *   - "broken"  (Problem)        → a FRACTURED CLUSTER of shards, exploded at
 *     rest by igloo's exact recipe (pos += centr·(gap + rand.y·sin(rand.x·5 +
 *     t·0.5)·0.05) + per-shard rotate3D), gap breathing with the fracture
 *     surges; row hover → a brief RE-COHERE (gap→~0, the NeuralLattice
 *     recohereEnv grammar, driven from the SAME store.hovered).
 *   - "healthy" (ProductionGrade) → ONE intact displaced-icosahedron crystal,
 *     flat-shaded facets, slowly rotating upright at section center (igloo
 *     tumble: k·(centeredProgress − progress) per axis, k = (11,14,6)·sign);
 *     ring ignitions flash the cyan rim.
 *
 * COORDINATE FRAME: unlike the stream (anisotropic rect-scaled group), the
 * crystal group is UNIFORMLY scaled — scale = rect.h·k·CRYSTAL_SCALE — so the
 * mesh is never stretched by the band's aspect and normals stay honest under
 * modelViewMatrix. Position offsets below are FRACTIONS of the rect (x of
 * width, y of height, + = up), from the band center. All crystal-local
 * dimensions are in "crystal units" (unit icosahedron radius before the
 * squash / noise displacement).
 *
 * BINDING BUDGET: zero storage buffers. Vertex-buffer slots: broken uses 5
 * (position, normal, aCentr, aRand, aFacet), healthy 3 (position, normal,
 * aFacet) — well inside the 8-slot wall (gpgpuNodeSim.ts). aFacet (round 7)
 * is a per-FACE random vec3, constant across each triangle of the non-indexed
 * soup — attributes are vertex-buffer slots, NOT bindings. No compute: the
 * same node material compiles on the WebGL2 fallback backend of three/webgpu.
 *
 * ROUND 7-2b (§B-a, 2026-08-22-round7-stones-v2-anatomy.md): the HEALTHY
 * crystal on the FULL tier + true-WebGPU backend adds the SERSAN-mark
 * transmission RT — exactly +1 sampled texture +1 sampler = +2 FRAGMENT
 * bindings on that one build (base TextureNode shared by every ladder tap via
 * `.sample().level()` reference chaining, so the count stays 2 regardless of
 * sample count). Storage wall (8) and vertex slots (5/3 of 8) UNTOUCHED.
 * Broken / lite / WebGL2-fallback builds stay zero-texture (the ember core is
 * pure ALU). The plexus (§B-c) is 2 extra position-only draw calls on its own
 * geometries — no crystal slots, no bindings beyond its own material uniforms.
 */
import type { LatticeMode } from "./neuralLatticeConfig";

// --- Placement (fractions of the anchor rect, from center; + y = up) --------
/** Per-mode crystal center in the band. Broken sits between the fracture
 * (x 55%) and the debris field; healthy floats over the rising weave between
 * ring 2 and ring 3 (rings at 40/62/84%). Both clear the left type column. */
export const CRYSTAL_POS: Record<LatticeMode, [number, number]> = {
  broken: [0.17, -0.05],
  healthy: [0.22, 0.06],
};
/** Uniform group scale = rect.h·k·this — crystal radius ≈ 17% of band height
 * (the squashed silhouette spans ~½ band height; the exploded broken cluster
 * reads wider). Live-tunable via the dev handle. */
export const CRYSTAL_SCALE = 0.17;

// --- Geometry (procedural; dossier plan §1) ---------------------------------
/** Icosahedron subdivision detail — tris = 20·(detail+1)². Facets sell
 * crystal: flat normals from the non-indexed PolyhedronGeometry. */
export const CRYSTAL_DETAIL = 12; // healthy intact crystal (~3.4k tris)
export const CRYSTAL_DETAIL_LITE = 8;
export const SHARD_DETAIL = 4; // per shard (~500 tris each)
export const SHARD_DETAIL_LITE = 3;
/** Fractured-cluster shard count (dossier: 6–10). */
export const SHARD_COUNT = 8;
export const SHARD_COUNT_LITE = 6;
/** 2-octave fractal displacement: n = noise(p·FREQ) + AMP2·noise(p·FREQ·2.1)
 * (lite drops the second octave), radius ×(1 + AMP·n). Round 7 (igloo realism
 * pass, §5 silhouette): low octave AMPLIFIED 0.25→0.34 and micro octave
 * FLATTENED 0.5→0.22 — the washed "bland pebble" read came from micro-noise
 * eating the big angular moves. */
export const CRYSTAL_NOISE_FREQ = 1.6;
export const CRYSTAL_NOISE_AMP = 0.34;
export const CRYSTAL_NOISE_AMP2 = 0.22;
/** Round 7 — TERRACED low octave: the low-frequency noise is quantized into
 * QUANT ledges per noise unit and blended in by MIX, so the silhouette gets
 * chiseled voronoi-ish plateaus (hard value ledges between vertex rings)
 * instead of a smooth potato. Deterministic f(position) → coincident soup
 * vertices still displace identically (no cracks). */
export const CRYSTAL_FACET_QUANT = 2.5;
export const CRYSTAL_FACET_MIX = 0.65;
/** Shard-silhouette squash of the intact crystal (dossier: (1, 1.45, 0.85)). */
export const CRYSTAL_SQUASH: [number, number, number] = [1, 1.45, 0.85];
/** Per-shard icosahedron radius (crystal units) before displacement. */
export const SHARD_RADIUS = 0.62;
/** Round 7 — per-shard SIZE VARIANCE (§5): radius multiplier per shard index
 * so the broken cluster reads as a real fractured meteorite family — 2 large
 * bodies + mids + small chips — instead of 8 equal pebbles. The lite build
 * (SHARD_COUNT_LITE=6) keeps the first 6 → still 2 large + mid + chips.
 * BROKEN_CALLOUT_SHARDS [1,3,5] land on large/mid/chip — all visible sizes.
 * NOTE the centroid RADIUS is no longer size-independent (CHIP_SCATTER
 * stretches chip centroids below), but the callout-anchor twin stays exact by
 * construction: the driver reads build.shardCentrs, pushed from the SAME
 * `centr` that translates the shard verts and fills aCentr — one source. */
export const SHARD_SIZES: readonly number[] = [
  1.45, 1.22, 0.95, 0.78, 0.6, 0.5, 0.42, 0.36,
];
/** Round 7 — chips fling further than bodies: spread ×(1 + (1−size)·this)
 * for sizes < 1 (large shards keep the mined spread). */
export const CHIP_SCATTER = 0.35;
/** Shard centroid distance from the cluster center: MIN + rnd·(MAX−MIN),
 * golden-spiral directions, then squashed by CRYSTAL_SQUASH so the cluster
 * keeps the intact crystal's tall silhouette. */
export const SHARD_SPREAD_MIN = 0.28;
export const SHARD_SPREAD_MAX = 0.58;

// --- Fracture (broken) ------------------------------------------------------
/** Rest gap — the cluster sits EXPLODED (igloo `gap`; explode offset =
 * centr·gap). Breathes outward with the fracture surges, collapses to ~0 on
 * the row-hover re-cohere. */
export const FRACTURE_REST_GAP = 1.0;
/** Gap boost per unit (eased) store pulse — the fracture-surge breathing. */
export const FRACTURE_SURGE_GAIN = 0.5;
/** Igloo idle sine drift amplitude (verbatim 0.05):
 * += centr·rand.y·sin(rand.x·5 + t·0.5)·this. */
export const CRYSTAL_IDLE_DRIFT = 0.05;
/** Slow continuous per-shard tumble rate (rad/s, ×(rand−.5)·2 per shard) —
 * the vertex-path rotate3D; the group wobble rides on top. */
export const SHARD_SPIN = 0.15;

// --- Material — TSL fake transmission (igloo WL numbers, dossier §2) --------
export const CRYSTAL_IOR = 1.18;
/** Round 7 — dispersion visibility up (igloo's fringes are clearly visible):
 * base uCA 0.1→0.16; igloo's 0.1 rode a real screen RT, our low-frequency
 * procedural backdrop needs more per-channel eta spread to show fringes. */
export const CRYSTAL_CA = 0.16; // uChromaticAberration
/** Round 7 — fresnel-weighted CA boost: effective CA = uCA·(1 + fres·this),
 * so the fringes concentrate on the SILHOUETTE (igloo's read) while the body
 * stays coherent. Dev-tunable (uCAEdge). */
export const CA_EDGE_BOOST = 2.5;
export const CRYSTAL_THICKNESS = 2.0; // refraction-offset scale
export const CRYSTAL_ROUGH = 0.6;
/** Dispersion samples: 3 full / 1 lite (igloo AWESOME_SAMPLES=3). */
export const CRYSTAL_SAMPLES = 3;
export const CRYSTAL_SAMPLES_LITE = 1;
/** How far the refracted direction's view-xy shifts the backdrop coordinate
 * per unit thickness (the "screen sample offset" of the mined loop, re-scoped
 * to the procedural backdrop's coordinate space). Round 7: 0.35→0.45 — more
 * visible bend so tumbling actually swims the internal world. */
export const REFR_OFFSET_SCALE = 0.45;
/** Backdrop coordinate scale over the crystal-local xy. */
export const BACKDROP_COORD_SCALE = 0.4;
/** Procedural refraction backdrop — the structural substitution for igloo's
 * transmission RT: navy diagonal gradient, noise-modulated like the mined
 * `diagonalGradient`, with two soft cyan bloom spots. NO RT, NO textures.
 * Round 7 — CONTRAST UP so refraction has something to bend: deeper navy
 * floor (#0B1422→#060D18), brighter ceiling (#16233A→#1C2E4E). */
export const BACKDROP_NAVY = "#060D18";
export const BACKDROP_NAVY2 = "#1C2E4E";
export const BACKDROP_CYAN = "#3BE1FF";
/** Two bloom spots: [x, y, gaussian sharpness] in backdrop-coordinate units
 * + the shared additive gain (sub-1.0 — the spots glow, never bloom).
 * Round 7: sharper (2.2/3.0→4.0/5.5) + brighter (0.45→0.75, peak channel
 * still 0.75 < 1.0) — crisp internal highlights the dispersion can split. */
export const BACKDROP_SPOTS: readonly [number, number, number][] = [
  [0.55, 0.35, 4.0],
  [-0.6, -0.5, 5.5],
];
export const BACKDROP_SPOT_GAIN = 0.75;

// --- Round 7 — 2-lobe procedural environment (realism pass §1) --------------
/** Key lobe direction (view-space fixed) — the soft white-cyan "sun". */
export const FACET_KEY_DIR: [number, number, number] = [0.42, 0.62, 0.66];
/** Fill lobe direction (view-space fixed) — cool navy from low-left-front. */
export const FACET_FILL_DIR: [number, number, number] = [-0.45, -0.4, 0.55];
/** Lobe colors — white-cyan key / navy fill (NO violet, round-7 contract). */
export const FACET_KEY_COLOR = "#D8F4FF";
export const FACET_FILL_COLOR = "#14283F";
/** Key lobe: specular-ish pow(max(dot(N,H),0), SPEC_POW) with a LOWISH
 * exponent (real spread — whole facets flash, not pinpricks) × SPEC_GAIN.
 * Dev-tunable (uSpecPow / uSpecGain). */
export const SPEC_POW = 14.0;
export const SPEC_GAIN = 1.15;
/** Fill lobe gain on max(dot(N, FILL), 0) — dev-tunable (uFillGain). */
export const FILL_GAIN = 0.5;
/** Per-FACET normal tilt (view-space, from the baked aFacet random) fed to
 * the key lobe only — facets catch the sun independently, the #1 flatness
 * killer. Dev-tunable (uFacetJit). */
export const FACET_JITTER = 0.35;
/** Per-facet key-lobe brightness jitter span: amp = 1−span/2 + span·rand —
 * the mineral sparkle igloo's roughness map provides. */
export const FACET_SPEC_JIT = 0.8;
/** Per-facet BODY value jitter: body ×(0.85 + this·rand) — value separation
 * survives even where the key lobe misses. */
export const FACET_VALUE_JIT = 0.3;
/** Round 7 — dark glass body (§2): transmitted color × this. The stone reads
 * DARKER than the backdrop mid-tone (the "meteorite" read); brightness comes
 * from lobes/rim/glints instead. Dev-tunable (uBodyDarken). */
export const BODY_DARKEN = 0.5;

// --- Round 7 — sparkle glints (igloo's triangle-sparkle layer, §3) ----------
/** Hash-cell frequency over crystal-local position (cells ≈ 1/15 unit). */
export const SPARKLE_FREQ = 15.0;
/** Per-cell micro-normal spread around the facet normal. */
export const SPARKLE_TILT = 0.8;
/** Glint alignment exponent (view/normal/light gate) — high & tight. */
export const SPARKLE_POW = 90.0;
/** Fraction of cells DISABLED (gate = smoothstep(this, this+.08, hash)) —
 * sparse: a few winks per second, not glitter. */
export const SPARKLE_DENSITY = 0.72;
/** Slow time wink (rad/s phase per cell) so glints breathe even at rest. */
export const SPARKLE_TWINKLE = 1.7;
/** Glint intensity — >1.0 so single pixels bloom. Dev-tunable
 * (uSparkleGain); the lite build never compiles the sparkle branch. */
export const SPARKLE_GAIN = 3.5;

// --- Round 7 — frost grain (internal structure, §4) -------------------------
/** 3D value-noise frequency over crystal-local position — vein scale. */
export const FROST_FREQ = 5.5;
/** Master frost amplitude (signed noise ×this) — dev-tunable (uFrostAmp);
 * 0 = uniform glass. Lite never compiles the frost octave. */
export const FROST_AMP = 1.0;
/** Frost → roughness modulation: roughEff = rough·(1 + frost·this). */
export const FROST_ROUGH_K = 0.9;
/** Frost → thickness modulation (refraction depth veins). */
export const FROST_THICK_K = 0.8;
/** Frost → body density veining: body ×(1 + frost·this). */
export const FROST_DENSITY_K = 0.55;

/** Fresnel rim. Round 7 (§2): RIM_BASE 0.55→1.6 — the GRAZING rim now crosses
 * 1.0 into bloom on its own (dark body, bright dispersive edges — the igloo
 * read); the ignition flash still pushes far beyond. 1.6 (not 1.1): the bloom
 * high-pass thresholds Rec709 LUMINANCE (0.2126/0.7152/0.0722 — BloomNode),
 * not max-channel, and the framebuffer sees col×alpha (normal blending over
 * the transparent clear). Whitened rim lum ≈ 0.79 at f1=1, so post-blend
 * lum = RIM_BASE·0.79·0.94 → 1.1 peaked at 0.82 (never bloomed; its "1.03"
 * was the blue channel, weighted 0.07); 1.6 crosses 1.0 for the f1 ≳ 0.95
 * grazing band (peak ≈ 1.19 — restrained) on full AND lite. */
export const FRESNEL_POW = 3.0;
export const RIM_BASE = 1.6;
export const RIM_FLASH_GAIN = 2.2;
/** Round 7 — per-channel fresnel exponent ratio (R×this / G / B÷this): blue
 * reaches further inward than red → a spectral dispersion fringe on the
 * silhouette with zero extra refraction samples. */
export const RIM_DISPERSION = 1.45;
/** Round 7 — rim whitening toward extreme grazing: mix(cyan, white,
 * f·this) — the outermost edge reads white-hot, the inner fringe cyan-blue. */
export const RIM_WHITEN = 0.45;
/** Body alpha ceiling (the depth fade + reveal ride under it). Round 7:
 * 0.92→0.94 — the darker glass body needs a touch more presence so it never
 * dissolves into the page navy (§6: the rim/glints carry the silhouette;
 * fade floor 0.94·(1−FADE_MAX) ≈ 0.047 still sits under the 0.05 Discard). */
export const CRYSTAL_ALPHA = 0.94;

// --- Depth fade (igloo §5 fog-mix, ADAPTED to alpha) ------------------------
/**
 * Igloo repaints distant rocks with the OPAQUE background gradient
 * (mix(bg, color, vFade)). Our canvas is TRANSPARENT over the DOM's navy —
 * that repaint would paint solid navy over the page — so the SAME
 * falloffsmooth window fades ALPHA instead: deep/back shards dissolve into
 * the page navy. Domain: dRel = (camDist − distToClusterCenter) / groupScale,
 * i.e. crystal-local units centered on the cluster (scale-independent; the
 * mined absolute-distance window assumed free-floating rocks).
 */
export const FADE_FROM = -2.0;
export const FADE_TO = 4.0;
export const FADE_MARGIN = 2.0;
export const FADE_PROGRESS = 0.6;
/** mined `vFade·0.95` → alpha = uAlpha·(fade·this + (1−this)). */
export const FADE_MAX = 0.95;

// --- Motion (igloo nF grammar, dossier §3) ----------------------------------
/** Scroll tumble k per axis — igloo verbatim: rotation.(x,y,z) =
 * (14, 11, 6)·rand·(centeredProgress − progress). Scaled by the per-mode gain
 * (our centering scalar spans ~±0.85 viewport-heights across the band, vs
 * igloo's per-cube scroll unit). Settles upright at section center. */
export const TUMBLE_K: [number, number, number] = [14, 11, 6]; // x, y, z
/** Healthy carries the visible scroll tumble (the crystal that "rotates
 * upright at center"); broken keeps the group motion gentler — its life
 * comes from the per-shard rotate3D in the vertex path (round-5 brief). */
export const TUMBLE_GAIN: Record<LatticeMode, number> = {
  broken: 0.18,
  healthy: 0.25,
};
/** Per-mode signed per-axis multipliers (igloo's deterministic per-cube
 * rands) — magnitude 0.5..1, signs differ so the two crystals counter-spin. */
export const TUMBLE_RAND: Record<LatticeMode, [number, number, number]> = {
  broken: [0.83, -0.61, 0.47],
  healthy: [-0.57, 0.71, -0.39],
};
/** Idle wobble (igloo verbatim): += sin(t·0.3 + seed)·0.1 per axis. */
export const WOBBLE_AMP = 0.1;
export const WOBBLE_FREQ = 0.3;
export const WOBBLE_SEEDS: [number, number, number] = [1.7, 4.3, 8.9];

// --- Ignition (store link — read-only, same channel as NeuralLattice) -------
/** Damp λ easing the crystal's own read of the store pulses (NeuralLattice
 * owns the pulse DECAY write-back; this island only eases toward the
 * targets — never a second setPulse writer). */
export const CRYSTAL_PULSE_DAMP = 6.0;
/** Broken re-cohere envelope attack/decay — the NeuralLattice recohereEnv
 * grammar exactly (its RECOHERE_ATTACK/DECAY are 14/1.6; kept as own
 * constants so the two islands stay independently tunable). */
export const CRYSTAL_RECOHERE_ATTACK = 14.0;
export const CRYSTAL_RECOHERE_DECAY = 1.6;

// --- Callout re-anchoring (round-5 W3, DOM-first) ---------------------------
/**
 * The DOM ghost callouts keep their strings + markup; the crystal driver
 * projects three anchor points (igloo §4 bbox-lerp grammar) through the
 * group transform to percentages OF THE ANCHOR RECT and writes
 * `--callout-N-left` / `--callout-N-top` custom properties on the
 * `[data-lattice-anchor]` element. The sections read them with the historic
 * hardcoded positions as fallbacks (SSR / fallback tier / RM keep today's
 * placement). `--callout-N-top` feeds whichever edge property the callout
 * uses (`top:` or `bottom:` — see CALLOUT_EDGE).
 */
/** Edge orientation per callout index — MUST match the sections' CALLOUT_POS
 * edge column (problem-section.tsx / production-grade-section.tsx): the
 * driver converts the projected anchor into a top- or bottom-relative offset
 * accordingly. Both sections currently run top/bottom/top. */
export const CALLOUT_EDGE: readonly ("top" | "bottom")[] = [
  "top",
  "bottom",
  "top",
];
/** Label-block offset from the leader-line TIP to the positioned edge:
 * ~15px label line + 4px gap + 28px leader (`h-7` + `mt-1`/`mb-1`). */
export const CALLOUT_LABEL_OFFSET_PX = 47;
/** Healthy anchors: fixed crystal-local points (post-squash units — bbox
 * ≈ x ±1.25, y ±1.8) on the intact crystal; they ride its tumble. */
export const HEALTHY_CALLOUT_ANCHORS: readonly [number, number, number][] = [
  [-0.55, 1.15, 0.4],
  [0.2, -1.3, 0.3],
  [0.9, 0.5, 0.2],
];
/** Broken anchors ride these shard indices (< SHARD_COUNT_LITE so the lite
 * build keeps all three): anchor = centr·(1 + gap + idle drift). */
export const BROKEN_CALLOUT_SHARDS: readonly [number, number, number] = [
  1, 3, 5,
];
/** Damp λ of the projected callout values (labels must not jitter with the
 * wobble/tumble) + the write threshold in % (skip sub-0.1% churn). */
export const CALLOUT_DAMP = 8.0;
export const CALLOUT_WRITE_EPS = 0.1;
/** Clamp windows (% of the rect) so labels never leave the band. */
export const CALLOUT_LEFT_MIN = 4;
export const CALLOUT_LEFT_MAX = 96;
export const CALLOUT_EDGE_MIN = 2;
export const CALLOUT_EDGE_MAX = 88;

// === ROUND 7-2b — igloo stones v2 anatomy transplant ========================
// research/2026-08-22-round7-stones-v2-anatomy.md, Part B. Everything below is
// full-tier only unless noted; the ember + mark are the "inner object" pair.

// --- §B-a (i) — healthy: the SERSAN mark inside the ice (transmission RT) ---
/** RT edge (square, power-of-two for the mip chain). NOT canvas-coupled: the
 * mark is sampled in CRYSTAL-LOCAL space (not screen space like igloo), so the
 * RT resolution is decoupled from the viewport — 512 + mips out-resolves the
 * lod ≥ ~1 the igloo lod law ever samples at our roughness. */
export const MARK_RT_SIZE = 512;
/** Ortho half-extent framing the ~2-unit-tall normalized mark (margin so the
 * clamp-to-edge border texels stay transparent black). */
export const MARK_RT_FRAME = 1.15;
/** Unlit mark tint — white-cyan ≤ 1.0 (palette contract; toneMapped:false).
 * The RT content never crosses 1.0 → the mark itself can't trip bloom; the
 * body/rim keep owning the bloom budget. */
export const MARK_COLOR = "#D8F4FF";
/** Additive gain on the mark taps INSIDE the dispersion ladder (pre
 * uBodyDarken — the mark rides the dark-glass multiply + frost veining like
 * igloo's transmission sample, so > 1 here lands ~0.75 post-darken). */
export const MARK_GAIN = 1.6;
/** Refraction-coordinate → RT-UV scale: uv = coord·this + 0.5. Sizes the mark
 * to ~0.9 crystal units inside the body (dev-tunable, uMarkScale). */
export const MARK_COORD_SCALE = 0.55;
/** Igloo lod law (§A1 verbatim): lod = log2(rtSize)·roughness·clamp(2·ior−2,
 * 0,1); at ior 1.18 the ior factor is 0.36 — folded in here. roughEff (frost-
 * veined) drives it, so the veins modulate the mark's softness for free. */
export const MARK_LOD_K = 0.36;
/** Yaw of the mark INSIDE the ice (rad/s). 0 = igloo-rigid (the penguin
 * never spins in the cube) → the RT renders ONCE and per-frame cost is zero;
 * > 0 re-renders per visible frame (≤ the 0.8 ms QA budget). Dev-tunable. */
export const MARK_SPIN = 0;
/** GATE — the three/webgpu WebGL2 fallback backend. RT + texture().level()
 * are core on that path too, but the repo-wide `?backend=webgl2` proof is
 * still open (memory: round-7 QA item): until it passes, the mark branch is
 * NOT BUILT on the fallback backend — procedural backdrop only, today's look,
 * no black frame. Flip to true after the proof. */
export const MARK_RT_WEBGL2 = false;

// --- §B-a (ii) — broken: the amber ember core (procedural SDF, zero
// bindings). Colored the sanctioned desaturated amber (#886a3d — §A3 pinned
// igloo's interior warmth as env-side amber), sub-bloom by construction. ----
export const EMBER_COLOR = "#886a3d";
/** Master ember gain (uEmberGain). ≤ 0.35 keeps the peak channel far under
 * the bloom threshold at any gap/flicker phase (sub-bloom rule). */
export const EMBER_GAIN = 0.3;
/** How far the k=0 refracted direction pushes the ember sample point into the
 * body (crystal units) — the "inside, not painted on" parallax. */
export const EMBER_DEPTH = 0.35;
/** Blob radii (crystal units): center ellipsoid + the two shard-riders. */
export const EMBER_R0 = 0.55;
export const EMBER_R1 = 0.32;
/** Which shards the two small blobs ride (indices into shardCentrs — 0/1 are
 * the two LARGE bodies of SHARD_SIZES; both < SHARD_COUNT_LITE). */
export const EMBER_SHARDS: readonly [number, number] = [0, 1];
/** Gap → dimming: env = 1/(1 + gap·this). Exploded wide = dim ember, hover
 * re-cohere (gap→0) = brightest — "something still alive inside". */
export const EMBER_GAP_DIM = 0.6;
/** Slow two-sine flicker amplitude around 1.0 (life at rest). */
export const EMBER_FLICKER = 0.15;

// --- §B-b — wet-ice ripple (procedural normal band, full tier only) ---------
/** Ripple carrier frequency over vLocal — a clearly separate band ABOVE
 * CRYSTAL_NOISE_FREQ (1.6) and BELOW SPARKLE_FREQ (15). */
export const RIPPLE_FREQ = 8.0;
/** Normal-perturbation amplitude (uRippleAmp; spec 0.10–0.15). 0 = off. */
export const RIPPLE_AMP = 0.12;
/** vnoise3 phase-warp of the first wave train (breaks the straight rulings). */
export const RIPPLE_WARP = 1.5;
/** Two fixed skew directions (normalized at build) — the crossed wave trains. */
export const RIPPLE_DIR1: [number, number, number] = [0.81, 0.33, 0.48];
export const RIPPLE_DIR2: [number, number, number] = [-0.29, 0.77, -0.56];
/** Second train: frequency ratio + amplitude (spec: ×1.7, ×0.6). */
export const RIPPLE_F2 = 1.7;
export const RIPPLE_A2 = 0.6;

// --- Rollout item 4 — warm glint lobe (§A3 mechanism twin, full tier) -------
/** View-space direction of the warm env patch — deliberately far from
 * FACET_KEY_DIR so the amber flash fires at DIFFERENT tumble angles. */
export const WARM_DIR: [number, number, number] = [-0.58, 0.18, 0.62];
/** Desaturated amber (#886a3d family — the sanctioned warm allowance). */
export const WARM_COLOR = "#886a3d";
/** Narrow gate: pow(max(dot(Nf, WARM_DIR), 0), this) — spec verbatim 24. */
export const WARM_POW = 24.0;
/** Warm gain (uWarmGain; spec ≤ 0.25) — sub-bloom at any angle. */
export const WARM_GAIN = 0.25;

// --- §B-c — plexus (HEALTHY only, full tier; restraint: broken already
// carries shards + chips + the fracture field — a second net there muds).
// Igloo's sF/ZL/$L construction scaled to 12 points; all in crystal units. --
export const PLEXUS_POINTS = 12;
/** Cylinder radius ≈ 0.9 × crystal bound (~1.6 units). */
export const PLEXUS_RADIUS = 1.45;
/** Per-point radius jitter: r × [1−this, 1] (igloo ×[0.8, 1]). */
export const PLEXUS_RADIUS_JIT = 0.2;
/** Vertical treadmill span (wrap into ±half). */
export const PLEXUS_TREADMILL = 3.0;
/** Orbit rate: (rand − .5)·this rad/s (igloo verbatim .5). */
export const PLEXUS_ORBIT = 0.5;
/** xz wobble: ±this·sin(t·0.5 + seed) (igloo verbatim .1). */
export const PLEXUS_WOBBLE = 0.1;
/** Climb rate: rand·this /s, treadmill-wrapped (igloo verbatim .25). */
export const PLEXUS_CLIMB = 0.25;
/** Connection rules (igloo: dist < 3, SHUFFLED candidates, max 3/point,
 * 0.35 s linear connect/disconnect tweens). */
export const PLEXUS_CONNECT_DIST = 3.0;
export const PLEXUS_BREAK_DIST = 3.2;
export const PLEXUS_MAX_PER_POINT = 3;
export const PLEXUS_MAX_LINES = 24;
export const PLEXUS_TWEEN = 0.35;
/** Connection eligibility: |treadmill y| < this (igloo 1.125) + a short
 * block after a wrap (igloo's not-just-wrapped rule). */
export const PLEXUS_Y_GATE = 1.125;
export const PLEXUS_WRAP_BLOCK = 0.3;
/** Scroll gate: _canConnect only while |a| < this (igloo |r|<1.25 ≈ ±0.30
 * viewport) — the net dissolves itself between sections via the tweens. */
export const PLEXUS_CONNECT_WINDOW = 0.3;
/** White-cyan linework (palette contract) + alpha ceilings. Igloo's additive
 * black-mask trick is replaced by the SAME masks driving ALPHA (transparent
 * canvas — honest fade over any DOM). */
export const PLEXUS_COLOR = "#D8F4FF";
export const PLEXUS_LINE_ALPHA = 0.5;
export const PLEXUS_CROSS_ALPHA = 0.85;
/** Plus-sign marker arm half-length (igloo point sprite size .1). Igloo's
 * screen-facing POINT sprites don't exist on WebGPU (no point size in WGSL) —
 * the markers are 2-segment crosses in the camera-locked group frame, same
 * read, one draw call. */
export const PLEXUS_CROSS_SIZE = 0.1;
/** Radial fade — segments near the crystal body dissolve (igloo's
 * mix-to-black + additive; here the same smoothstep drives alpha). */
export const PLEXUS_MASK_IN = 1.1;
export const PLEXUS_MASK_OUT = 1.9;
/** Broken-dash mask frequency: smoothstep(.4,.5, sinenoise(pos·this)). */
export const PLEXUS_DASH_FREQ = 10.1;

// --- §B-d — callout gating windows (staggered arrive/leave) -----------------
/**
 * Per-callout visibility window over the SAME centering scalar `a` the tumble
 * uses — visible while a ∈ (min, max). SIGN NOTE: our `a` is positive while
 * the band is BELOW viewport center (approaching) and negative once passed —
 * the OPPOSITE of igloo's r — so the spec's widened igloo windows (r-space
 * (−0.55,+0.25) / (−0.30,+0.45) / (−0.45,+0.25)) are sign-flipped here to
 * keep igloo's temporal asymmetry (long approach lead, short exit tail).
 * Start values; tune by feel via the dev handle (`feel.visWindows`).
 */
export const CALLOUT_VIS_WINDOWS: readonly [number, number][] = [
  [-0.25, 0.55],
  [-0.45, 0.3],
  [-0.25, 0.45],
];
/** Asymmetric damp: reveal ~0.4 s (λ 8), hide ~0.2 s (λ 16) — igloo's
 * 0.4 s in / 0.2 s out, done driver-side (no CSS transitions to fight). */
export const CALLOUT_VIS_IN_LAMBDA = 8;
export const CALLOUT_VIS_OUT_LAMBDA = 16;
/** Write-on-change threshold for the --callout-N-vis var (opacity units). */
export const CALLOUT_VIS_EPS = 0.015;

// --- §B-f — scroll feel (no-hijack transfers) -------------------------------
/** Settle deadzone (viewport fractions): a′ = sign(a)·max(|a|−DZ,0)/(1−DZ)
 * feeds the tumble, so the crystal reads "settled upright" through a window
 * around center — the native-scroll twin of igloo's autoCenter outcome. */
export const TUMBLE_DEADZONE = 0.08;
/** |lenis velocity| mapping to full strength — the PostFXNodes velNorm scale
 * (its default 50), so the two speed-compressions read as one system. */
export const CRYSTAL_VEL_NORM = 50;
/** Group scale × (1 − this·vel) — the camera-write-free twin of igloo's
 * fov = 45 − 5·velocity (SignatureLine owns the camera; never write it). */
export const CRYSTAL_VEL_SCALE_K = 0.03;
/** Velocity damp λ (rising/falling — the PostFXNodes 6/3 grammar). */
export const CRYSTAL_VEL_LAMBDA_UP = 6;
export const CRYSTAL_VEL_LAMBDA_DOWN = 3;

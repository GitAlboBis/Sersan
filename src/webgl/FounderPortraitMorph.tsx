"use client";

/**
 * FounderPortraitMorph — the GATED, self-playing particle-portrait morph for the
 * home founders section (WEBGL_UPGRADE_PLAN §4R). Supersedes FounderPlanes.
 *
 * CONCEPT. One ~42k-point 3D particle cloud, PLACED and COLOURED by sampling
 * founder A's portrait (Alessandro) with luminance-driven z-relief so it reads
 * as a 3D bust. The founders section PINS via a scroll-jack gate (founders-rail,
 * mirrors HeroIntroGate): while pinned the page does NOT scroll and the morph is
 * NOT scrubbed. One scroll-down gesture triggers a ONE-SHOT auto-play of ONE LEG
 * that runs to completion on its own clock (MORPH_DURATION); at each locked
 * stage the cloud LOCKS; a gesture at an END stage releases the page. Reverse
 * symmetrically for scroll-up. The particle GROUP orbits + dollies in real 3D
 * (group transform ONLY — never the global camera; SignatureLine is the single
 * camera authority). At every locked stage the spring pins each particle to its
 * exact sampled pixel so the faces read crisply; mid-flight the swarm surges
 * cyan (feeds the selective bloom). The DOM copy blocks cross-fade following the
 * progress scalar (owned by founders-rail.tsx).
 *
 * SAMPLING (rewritten 2026-07-20). ALL portraits are sampled onto ONE shared
 * grid by samplePortraitSet: one particle per grid cell (no random picks → no
 * holes, no duplicates), tone carried by particle SIZE via the per-particle
 * `ink` scalar rather than by particle DENSITY, and no hard background mask
 * (the backdrop simply has ink ≈ 0 and shrinks away). The shared cell list also
 * supplies A↔B↔C index pairing for free — particle j is the same cell in every
 * image — which retired the old radial-sector sort. The cell list is a UNION,
 * so adding a portrait can only GROW it; it never removes coverage.
 * Consequently the INSTANCE COUNT FOLLOWS THE SAMPLER (cells found, strided
 * down to the tier ceiling); it is never a fixed budget padded with duplicates.
 *
 * WORLD SCALE (fills the stage). The sampler returns the sampled FACE extent
 * (a robust percentile half-width/height in grid px). This island maps grid-px →
 * world so that extent ≈ STAGE_FILL × the measured [data-founder-stage] rect —
 * so the face FILLS (not overflows) the stage regardless of how much of the
 * source frame the face occupies. z-relief is capped to ≤ Z_RELIEF_MAX_FRAC of
 * the face height — deliberately near-flat, see that constant for why relief
 * tears a regular one-particle-per-cell grid.
 *
 * COLOUR AT REST. NormalBlending with depthTest/depthWrite OFF (nothing to
 * occlude at one particle per cell); at speed≈0 each particle shows its sRGB→linear pixel
 * colour × a modest emissive (~1.1) — photographic skin tone, not additive white
 * dust. The cyan travel-tint only rises with speed mid-morph.
 *
 * ENGINE REUSE. createTextMorphComputeBuild (gpgpu/gpgpuNodeSim.ts) with the
 * OPTIONAL `portrait` param. The N founder homes are wired straight through as
 * homeA/homeB/homeC (homeD = homeC, an inert identity leg), with colorsC/sizeC
 * passed so COLOUR AND INK chain to the third target too — without them the
 * third face would render its own POSITIONS in the second face's colours and
 * ink, i.e. a stencil, because the colour/ink path keys off uMorph alone.
 *
 * SEQUENCING INVARIANT. uMorph, uMorph2 and uMorph3 are all derived from ONE
 * progress scalar (`morphRef`, 0..MORPH_MAX) via applyMorph(), which is what
 * guarantees uMorph reaches EXACTLY 1.0 before uMorph2 leaves 0. The kernel's
 * target blend is CHAINED — mix(mix(A,B,m1), C, m2) — so overlapping the legs
 * would cut the corner between A and C and never touch B. Do NOT "align with
 * the hero" here: HeroTextParticles deliberately opens its second leg at 0.95,
 * which is invisible on abstract motes and would skip a whole face here.
 *
 * With `portrait` undefined the build is byte-identical to the hero.
 *
 * GATING. Mounted by Scene.tsx only on home + full tier + webgpuEnabled(); this
 * component additionally requires a TRUE-WebGPU compute backend (storage
 * indexing no-ops on the WebGL2 fallback, three #31221) and returns null
 * otherwise — the accessible DOM founders section is the whole experience on
 * every other path.
 *
 * ISLAND RULE. Per-frame state flows through getState() in useFrame (refs only);
 * the stage rect is measured ONLY on measureVersion bumps; dispose on cleanup.
 *
 * LIVE TUNING. window.__sersanFounderMorph (dev-only) exposes getUniforms /
 * getSampler / getStage / setPointSize / setSpread / setEmissive / setDepth /
 * setMorph(override) / setStage / playMorph / resample / project / bbox — so
 * the final look (point size / spread / emissive / ink curve / grid) is tuned
 * without rebuilds. `resample({ inkGain, inkFloor, inkGamma, fadeStart,
 * fadeSpan, inkCut, gridW, gridH })` re-runs the set sampler in place.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { webgpuEnabled, backendOf } from "./renderer/createRenderer";
import {
  useFoundersMorphStore,
  foundersGateApi,
  MORPH_MAX,
  STAGE_ORDER,
  stageFromMorph,
  legFract,
} from "./store/foundersMorphStore";
import { useTierStore } from "./store/tierStore";
import { founders } from "@/data/founders";
import type {
  PortraitSet,
  PortraitSpec,
  PortraitPoints,
} from "./image/sampleImagePoints";

/** Tier CEILING on the instance count — not a target. The sampler decides the
 * count (one particle per shared grid cell) and only gets strided down if the
 * grid overshoots this. */
const MAX_COUNT_BY_TIER: Record<"full" | "lite", number> = {
  // MEASURED IN-BROWSER with all three shipped headshots (Alessandro, Michele,
  // Mattia), via __sersanFounderMorph.getSampler():
  //
  //   sharedCells 51,751 · stride 1 · count 51,751
  //
  // Frame timing at that real instance count: median 144.9fps, p95 7.3ms — no
  // performance concern here, the count is not what to economise on.
  //
  // THE OFFLINE ESTIMATE UNDER-PREDICTED BY ~8%. research/portrait-calibration/
  // sampler_port.py projected 47,636 (51,166 offline-port cells × a 0.931
  // browser-normalisation factor). The 0.931 factor was calibrated on the A+B
  // pair and did NOT transfer to the third, higher-contrast portrait: the true
  // browser union came in 8.6% above the projection. Treat the port as an
  // ORDER-OF-MAGNITUDE check for a new face, never as a number to size this
  // ceiling against — measure in-browser and write the measurement here.
  //
  // WHY 60000. The ceiling is a PERF GUARD, not a target. `count === sharedCells`
  // whenever `sharedCells <= maxCount`, so a higher ceiling costs exactly
  // nothing until the union actually grows into it; what it buys is distance
  // from the stride-2 cliff. At the previous 52,000 the margin was 249 cells —
  // 0.5% — so any re-export that nudged a headshot's ink even slightly would
  // have silently flipped stride to 2, halving the cloud for ALL three faces
  // into something that reads uniformly SOFT rather than obviously broken. That
  // is precisely the regression class that ships unnoticed. 60,000 leaves ~16%.
  //
  // WHY NOT HIGHER STILL. `count` feeds spacingDev = sqrt(areaDev/count), which
  // feeds defPointSize and PORTRAIT_COV_MIN_PX — an unbounded count shrinks
  // every disc and would change Alessandro's and Michele's faces without their
  // assets changing. The ceiling still has to mean something.
  //
  // Per-portrait figures behind the union (offline-port units, post-wash):
  // own ink cells — Mattia 38,387, Alessandro 38,555, Michele 38,833; mean ink
  // 0.550; halfExtent Mattia [135.92, 135.27]. max(halfExtentX) is
  // ALESSANDRO's 136.50, NOT Mattia's, so the fit stays X-bound and
  // `worldPerGrid` is unchanged from the two-portrait build.
  //
  // Measure any future portrait added to this rail BEFORE it lands — the union
  // is monotone in image count, so every new face can only grow it.
  full: 60000,
  lite: 16000,
};

// --- Sampler grid + look constants -----------------------------------------
/** Shared sample grid (5:7 portrait). Measured on the two shipped headshots:
 * 290×405 → 42,087 shared cells at stride 1, which lands on the full tier's
 * budget with headroom under the 48,000 ceiling. The union is MONOTONE in image
 * count, so a third portrait can only grow it — re-measure after any asset
 * change. Cell count scales with grid AREA, so retarget with
 * `scale = sqrt(wanted / measured)` if the assets or the ink curve change; keep
 * it under the ceiling so the stride stays 1. THE INTEGER STRIDE IS A CLIFF:
 * one cell over the ceiling halves the count for EVERY face at once, and the
 * failure reads as uniformly SOFT rather than sparse (spacingDev auto-grows the
 * discs), so it is easy to ship by accident. */
const GRID_W = 290;
const GRID_H = 405;
/** Portrait fill fraction of the stage rect (leaves a small margin). */
const STAGE_FILL = 0.92;
/** z-relief cap as a fraction of the sampled FACE height. Kept DELIBERATELY tiny
 * (0.04) — the resting cloud is effectively flat. WHY: since the sampler places
 * one particle per cell on a REGULAR grid, adjacent cells that straddle a
 * luminance edge (hairline, beard edge, glasses rim) receive very different z.
 * Under perspective those neighbours separate LATERALLY, which shreds every
 * luminance edge into a vertical comb — severe on high-local-contrast portraits
 * (dark beard against lit skin). The relief must therefore stay far below the
 * cell pitch. It bought almost nothing anyway: the group only orbits mid-morph,
 * where the swarm is scattered, while the resting face is the state the visitor
 * actually reads. Verified live via __sersanFounderMorph.setDepth(): 0 = clean,
 * 0.3 = visible tearing, 1 = severe comb. */
const Z_RELIEF_MAX_FRAC = 0.04;
/** Modest emissive so faces stay photographic at rest (task: ~1.0–1.3). */
const DEFAULT_EMISSIVE = 1.18;

/** Ink-model defaults, validated in-browser on both shipped headshots. `ink` is
 * the luma-weighted distance from the measured backdrop colour, contrast-curved
 * and dissolved toward the bottom of the frame; it drives particle SIZE and
 * alpha, which is what replaced the old density/threshold model (a per-pixel
 * backdrop threshold cannot tell "white wall" from "lit scalp", so it punched
 * holes through the brightest parts of the SUBJECT). */
const SAMPLE_SPEC_BASE: Omit<PortraitSpec, "maxCount"> = {
  gridW: GRID_W,
  gridH: GRID_H,
  depth: 90, // grid-px of luminance relief front-to-back (capped in toWorld)
  // Forward bulge at the face centre: DISABLED (0). On the regular one-per-cell
  // grid it produced a visible rounded bulge artifact around the chin/face
  // centre, and it compounds the edge-tearing described at Z_RELIEF_MAX_FRAC.
  centerZBias: 0,
  // Gentle curve — the backdrop is removed SPATIALLY by the sampler's
  // border-seeded flood fill, so nothing here has to fight the wall. Every
  // low-end gate that used to live here (lumCeil/neutralSat, then
  // inkGateLo/inkGateHi) deleted the lit scalp and dimmed the subject's mid
  // band along with it; do not reintroduce one.
  inkGain: 1.7, // contrast gain on the backdrop distance
  inkFloor: 0.03, // below this the cell is sensor noise → ink 0
  inkGamma: 0.62, // <1 keeps mid-tones (cheeks, shirt folds) present
  fadeStart: 0.62, // the bust dissolves into darkness below this normalized y
  fadeSpan: 0.32,
  inkCut: 0.03, // union ink above which a cell joins the shared list
  extentInk: 0.15, // only real ink counts toward the measured face extent
};

// --- Motion constants -------------------------------------------------------
/** Diffuse-cloud spread radius (world units) at the midpoint of the morph. */
const SPREAD_MAX = 1.1;
/** Max group orbit (radians) at the midpoint. */
const ORBIT_MAX = 0.7;
/** Max group dolly toward the camera (world units) at the midpoint. */
const DOLLY = 2.2;
/** Mid-flight pointer parallax (radians), gated by the same sin(g·π) envelope. */
const PARALLAX_MAX = 0.18;
/** Rest-idle life at the locked stages — GROUP-level ONLY (the per-particle
 * spring targets stay pixel-pinned, so the silhouette registration is never
 * touched): a slow two-axis sway + breath, faded out by the flight envelope so
 * mid-flight motion stays owned by orbit/spread. Amplitudes are deliberately
 * tiny — beyond ~0.02 rad the "locked, crisp face" contract erodes into wobble. */
const REST_SWAY_YAW = 0.02; // rad, at 0.11 rad/s
const REST_SWAY_PITCH = 0.012; // rad, at 0.07 rad/s
const REST_BREATH = 0.004; // scale fraction, at 0.5 rad/s
/** Entry assemble duration (seconds) once the section reveals. */
const ENTRY_DURATION = 1.8;
/** One-shot A→B (or B→A) auto-play duration (seconds). Mirrors the hero morph. */
const MORPH_DURATION = 1.4;
/** Off-screen cull margin (CSS px). */
const CULL_PAD = 120;

/** Headshot asset discovery — preferred over the environmental fallback. */
const HEADSHOT_EXTS = ["webp", "jpg", "png"];
/** Morph targets in the chain, A→B→C. Derived from MORPH_MAX — i.e. from the
 * COLOUR/INK wiring ceiling (WIRED_TARGETS), NOT from the engine's four
 * position targets — so the sampler can never prepare a target the renderer
 * would draw as a stencil. See foundersMorphStore.WIRED_TARGETS. Tying it here
 * also protects the `imgs.length < TARGET_COUNT` early return below from
 * silently disabling resampling when a 4th headshot asset is absent. */
const TARGET_COUNT = MORPH_MAX + 1;

interface MorphBuild {
  geometry: THREE.InstancedBufferGeometry;
  material: THREE.Material;
  uMorph: { value: number };
  uMorph2: { value: number };
  uMorph3: { value: number };
  uFade: { value: number };
  uSpread: { value: number };
  uAssemble: { value: number };
  uSizeComp: { value: number };
  uSizeComp2: { value: number };
  uSizeComp3: { value: number };
  uPointSize: { value: number };
  uPixelRatio: { value: number };
  uViewport: { value: THREE.Vector2 };
  uEmissive?: { value: number };
  tick: (p: { dt: number; time: number }) => void;
  dispose: () => void;
}

/**
 * THE single writer of the three morph uniforms — used by BOTH the build and
 * the frame loop so there is exactly one clamp form in the codebase.
 *
 * Deriving all three from ONE progress scalar is what guarantees `uMorph`
 * reaches EXACTLY 1.0 before `uMorph2` leaves 0. The compute kernel's target
 * blend is CHAINED — mix(mix(A,B,m1), C, m2) — so overlapping the legs yields
 * mix(mix(A,B,s), C, s), a shortcut that cuts the corner between A and C and
 * never forms the middle face at all. The stagger saturates exactly (at
 * uMorph = 1 the worst-case particle reaches 0.45/0.45 = 1.0), so target == hB
 * exactly for EVERY particle at p = 1, which is what makes sequencing sound.
 */
function applyMorph(b: MorphBuild, p: number) {
  b.uMorph.value = THREE.MathUtils.clamp(p, 0, 1);
  b.uMorph2.value = THREE.MathUtils.clamp(p - 1, 0, 1);
  b.uMorph3.value = THREE.MathUtils.clamp(p - 2, 0, 1); // ≡ 0 at N=3
}

interface StageRect {
  /** Stage top offset within the sticky frame (CSS px). */
  offsetY: number;
  /** Stage left edge in viewport space (the sticky frame never translates x). */
  baseVpX: number;
  w: number;
  h: number;
}

/** Live-tunable subset of the sampler spec (dev handle `resample`). */
type SampleTuning = Partial<Omit<PortraitSpec, "maxCount">>;

/** Force-fetch an image (native lazy-load never fires inside a sticky/transform
 * frame — the trap documented in card-image-distort.tsx / FounderPlanes). */
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Prefer a tight headshot (public/founders/<slug>-headshot.<ext>) if present;
 * otherwise fall back to the environmental portrait. Presence is detected by
 * attempting the load and falling back on error. The two sources need no
 * per-source profile any more: the ink model measures its own backdrop colour
 * from the frame's top corners, so a studio-white seamless and a dark
 * environmental surround are handled by the same code path. */
async function loadFounder(idx: number): Promise<HTMLImageElement> {
  const f = founders[idx];
  if (!f) throw new Error(`no founder at index ${idx}`);
  // The slug IS the data anchor — /public/founders/<anchor>-headshot.<ext>. A
  // parallel slug ARRAY was the hazard here: an out-of-range index silently fell
  // back to slot 0 and sampled Alessandro as target C, with no error anywhere.
  for (const ext of HEADSHOT_EXTS) {
    try {
      return await loadImg(`/founders/${f.anchor}-headshot.${ext}`);
    } catch {
      /* try next extension / fall back */
    }
  }
  if (!f.image) throw new Error(`no portrait asset for founder ${f.name}`);
  return loadImg(f.image);
}

export function FounderPortraitMorph() {
  const { camera, size, gl } = useThree();

  const tier = useTierStore((s) => s.tier);
  const maxCount = MAX_COUNT_BY_TIER[tier === "lite" ? "lite" : "full"];

  // Rare-change reactive reads (allowed) — trigger (re)build + (re)measure.
  const measureVersion = useFoundersMorphStore((s) => s.measureVersion);

  // Cached decoded portraits + the (scale-independent) shared-grid SET sample.
  const imgsRef = useRef<HTMLImageElement[]>([]);
  const setRef = useRef<PortraitSet | null>(null);
  const [sampleEpoch, setSampleEpoch] = useState(0);
  const sampleModRef = useRef<typeof import("./image/sampleImagePoints") | null>(
    null,
  );
  const webgpuModRef = useRef<unknown>(null);
  const tslModRef = useRef<unknown>(null);
  const simModRef = useRef<typeof import("./gpgpu/gpgpuNodeSim") | null>(null);

  const [build, setBuild] = useState<MorphBuild | null>(null);
  const buildRef = useRef<MorphBuild | null>(null);
  /** True once a first build played the entry — later rebuilds (resize/tier)
   * PRESERVE the morph + skip the entrance instead of snapping back to A. */
  const hasBuiltRef = useRef(false);
  const stageRectRef = useRef<StageRect | null>(null);
  /** Cloud world half-extents (for bbox() registration checks). */
  const extentRef = useRef({ hx: 0, hy: 0, hz: 0 });

  // Per-frame clocks (refs — never React state in the loop, island rule).
  const timeRef = useRef(0);
  // One-shot progress clock spanning 0..MORPH_MAX (0=A, 1=B, 2=C). One unit is
  // exactly one leg, so MORPH_DURATION stays per-leg.
  const morphRef = useRef(0);
  const entryRef = useRef(0);
  const fadeRef = useRef(0);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const dollyRef = useRef(0);

  // Live-tunable params (dev knobs). Nullable point size = "use the default".
  const depthScaleRef = useRef(1);
  const spreadMaxRef = useRef(SPREAD_MAX);
  const pointSizeRef = useRef<number | null>(null);
  const emissiveRef = useRef(DEFAULT_EMISSIVE);
  /** Live overrides merged over SAMPLE_SPEC_BASE on the next resample. */
  const tuningRef = useRef<SampleTuning>({});
  /** Dev override for uMorph (null = gate/scroll control). */
  const morphOverrideRef = useRef<number | null>(null);

  const groupRef = useRef<THREE.Group>(null);
  // Stable scratch objects (module-frame reuse — no per-frame allocation).
  const scratch = useRef(new THREE.Vector3()).current;
  const euler = useRef(new THREE.Euler()).current;
  const quat = useRef(new THREE.Quaternion()).current;
  const cornerV = useRef(new THREE.Vector3()).current;

  /** Full sampler spec = the validated defaults + any live overrides + the
   * tier ceiling. EVERY portrait shares ONE spec by construction — the shared
   * grid is what pairs them. Never split the spec per portrait (a per-portrait
   * fadeStart etc. would break the shared-grid invariant outright). */
  const sampleSpec = (): PortraitSpec => ({
    ...SAMPLE_SPEC_BASE,
    ...tuningRef.current,
    maxCount,
  });

  // === Load + sample every portrait (headshot preferred, else fallback) ======
  useEffect(() => {
    // Gate on the RUNTIME backend, not just the build-time flag. Scene.tsx mounts
    // this island on webgpuEnabled(), so a WebGL2-fallback session used to fetch
    // and decode every headshot and run samplePortraitSet — three readGrid passes
    // over a 290×405 grid plus three emit passes over ~47.6k cells, on the main
    // thread — before the build path's own probe threw it all away.
    //
    // SAFE because createWebGPURenderer awaits renderer.init() (including the
    // forceWebGL retry) before R3F mounts children, so gl.backend is already
    // resolved here. This effect never re-runs, so a false negative would mean a
    // permanently blank morph on real WebGPU machines — re-check this precondition
    // if renderer construction ever changes. Do NOT substitute tierStore.backend:
    // it is null until Scene's onCreated.
    if (!webgpuEnabled() || backendOf(gl) !== "webgpu") return;
    let cancelled = false;

    void Promise.all([
      Promise.all(
        Array.from({ length: TARGET_COUNT }, (_, i) => loadFounder(i)),
      ),
      import("./image/sampleImagePoints"),
    ])
      .then(([imgs, mod]) => {
        if (cancelled) return;
        imgsRef.current = imgs;
        sampleModRef.current = mod;
        // ONE call samples ALL portraits onto the shared grid — that shared
        // cell list is what index-pairs particle j across A, B and C.
        setRef.current = mod.samplePortraitSet(imgs, sampleSpec());
        setSampleEpoch((e) => e + 1);
      })
      .catch((err) => {
        // A bare swallow here turns a total failure into a silently blank
        // founders stage, which is indistinguishable from "not reached yet".
        if (process.env.NODE_ENV !== "production") {
          console.error("[FounderPortraitMorph] portrait load/sample failed", err);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxCount, gl]);

  // === Core build: measure stage rect, fit grid-px → world, spin up the sim ===
  // Kept in a ref so live knobs (resample/setDepth/setEmissive) can rebuild
  // in place, preserving the current uMorph (no snap).
  const buildNowRef = useRef<(preserveState: boolean) => void>(() => {});
  buildNowRef.current = (preserveState: boolean) => {
    if (!webgpuEnabled()) return;
    const set = setRef.current;
    const webgpu = webgpuModRef.current as typeof import("three/webgpu") | null;
    const tslNs = tslModRef.current as typeof import("three/tsl") | null;
    const mod = simModRef.current;
    if (!set || !webgpu || !tslNs || !mod) return;
    const pts = set.points;
    if (pts.length < 2) return;
    // The instance count FOLLOWS the sampler (one particle per shared cell).
    const count = set.count;

    // True-WebGPU compute only (storage indexing no-ops on WebGL2, #31221).
    // Shares backendOf with createRenderer — whose doc comment requires this
    // island's probe to mirror it — so the two cannot drift.
    if (backendOf(gl) !== "webgpu") return;

    const sticky = document.querySelector<HTMLElement>(
      "[data-founders-morph-sticky]",
    );
    const stage = document.querySelector<HTMLElement>("[data-founder-stage]");
    if (!sticky || !stage) return;
    const stickyTop = sticky.getBoundingClientRect().top;
    const sr = stage.getBoundingClientRect();
    if (sr.width === 0 || sr.height === 0) return;
    stageRectRef.current = {
      offsetY: sr.top - stickyTop,
      baseVpX: sr.left,
      w: sr.width,
      h: sr.height,
    };

    const worldPerPx = WORLD_VIEW_HEIGHT / size.height;

    // --- WORLD-SCALE FIT: map the sampled FACE extent onto the stage rect -----
    // The sampler returns the robust half-extent (grid px) of the sampled face.
    // ALL targets SHARE ONE scale (paired morph → short travel): fit the LARGEST
    // extent across every portrait so no face overflows the stage. Uniform
    // (contain) scale so the cloud FILLS ~STAGE_FILL without distorting aspect.
    //
    // The fit is X-bound iff maxHalfX > 0.75 · maxHalfY (0.75 = the stage's
    // aspect-[3/4]). It is X-bound with all three shipped headshots, and a
    // subject with a wider measured extent would not flip the fit — it would
    // simply lower worldPerGrid a few percent and render EVERY face slightly
    // smaller. Expect halfExtent ≈ [[136,134],[129,137],[136,135]]; investigate
    // only if max(halfExtentX) > 143. NEVER lower `fadeStart` to chase this: it
    // is shared, so it would shrink everyone's bust. Check getSampler().
    //
    // max(halfExtentX) is ALESSANDRO's 136.50, as it has always been. Mattia is
    // NOT the widest extent, so `worldPerGrid` is unchanged from the two-portrait
    // build and the ~3% global face shrink the pre-wash analysis predicted does
    // NOT occur. That is a property of the ASSET, not of this code: Mattia's
    // headshot carries a vertical wash of the torso toward the white backdrop
    // (face untouched above the chin), which took his halfExtent from [140,146]
    // to [136,135]. Re-export that headshot WITHOUT the wash and both these
    // expectations and the measured 51,751 union behind MAX_COUNT_BY_TIER stop
    // holding — re-measure IN-BROWSER via __sersanFounderMorph.getSampler().
    // research/portrait-calibration/sampler_port.py is an order-of-magnitude
    // check only; it under-predicted the three-portrait union by ~8%.
    const halfX = Math.max(...pts.map((p) => p.halfExtentX), 1e-3);
    const halfY = Math.max(...pts.map((p) => p.halfExtentY), 1e-3);
    const stageWorldW = sr.width * worldPerPx;
    const stageWorldH = sr.height * worldPerPx;
    const scaleX = (stageWorldW * STAGE_FILL) / (2 * halfX);
    const scaleY = (stageWorldH * STAGE_FILL) / (2 * halfY);
    const worldPerGrid = Math.min(scaleX, scaleY);

    // z-relief cap: normalize the sampler's grid-px relief so its max depth is
    // ≤ Z_RELIEF_MAX_FRAC of the face height, then apply the live depth knob.
    let maxAbsZ = 1e-4;
    for (const p of pts) {
      for (let i = 0; i < count; i++) {
        const za = Math.abs(p.z[i]);
        if (za > maxAbsZ) maxAbsZ = za;
      }
    }
    const faceHeightGrid = 2 * halfY;
    const zNorm = Math.min(1, (Z_RELIEF_MAX_FRAC * faceHeightGrid) / maxAbsZ);
    const zFactor = worldPerGrid * zNorm * depthScaleRef.current;

    const toWorld = (s: PortraitPoints) => {
      const out = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        out[i * 3] = s.xy[i * 2] * worldPerGrid;
        out[i * 3 + 1] = s.xy[i * 2 + 1] * worldPerGrid;
        out[i * 3 + 2] = s.z[i] * zFactor;
      }
      return out;
    };
    const homes = pts.map(toWorld);
    const homeA = homes[0];
    const homeB = homes[1] ?? homeA;
    // At N=2 these collapse to homeB — identical to the shipped 2-target wiring.
    const homeC = homes[2] ?? homeB;
    // Inert 4th leg passed as a TRUE identity mix (uMorph3 never leaves 0).
    const homeD = homes[3] ?? homeC;

    extentRef.current = {
      hx: halfX * worldPerGrid,
      hy: halfY * worldPerGrid,
      hz: maxAbsZ * zFactor,
    };

    // A rebuild can arrive long BEFORE the entry has ever played: measure()
    // bumps measureVersion on mount, on intro-complete, on fonts-ready and on
    // every resize, and the build effect re-runs on each. Taking the preserve
    // path then would seed the cloud at its formed home positions AND pin
    // uAssemble at 1 — silently consuming the entry so the section arrives
    // already formed (the bug). Only a rebuild that happens after the entry
    // actually completed may skip it; every earlier one re-scatters and replays.
    const keepEntry = preserveState && entryRef.current >= 1;

    // Seed positions. Fresh build → a scattered cloud the particles fly IN from
    // on the entry assemble. Live rebuild (preserveState) → the current home so
    // the morph does not snap (keep uMorph).
    let seed: Float32Array;
    if (keepEntry) {
      // Snap to the NEAREST locked stage — a resize while parked on the third
      // face must seed at homeC, not spring back across from the second.
      // Math.round(0.5) === 1 reproduces the old `>= 0.5 ? homeB : homeA`.
      const k = THREE.MathUtils.clamp(
        Math.round(morphRef.current),
        0,
        MORPH_MAX,
      );
      seed = (homes[k] ?? homeA).slice();
    } else {
      seed = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const mag = (0.5 + Math.random() * 1.3) * stageWorldH * 0.55;
        seed[i * 3] = homeA[i * 3] + Math.cos(ang) * mag;
        seed[i * 3 + 1] = homeA[i * 3 + 1] + Math.sin(ang) * mag * 0.85;
        seed[i * 3 + 2] =
          homeA[i * 3 + 2] + (Math.random() - 0.5) * stageWorldH;
      }
    }

    // --- DENSITY: default disc size so the FACE's discs OVERLAP into tone -----
    // spacing ≈ sqrt(stageArea_devpx / count). The overlap factor is now sized
    // for a FULL-INK particle, not an average one: the render scales every disc
    // by (SIZE_MIN + SIZE_INK·ink), so at the face's high ink the discs land at
    // ~1.7× spacing and touch (continuous tone), while the faint fringe shrinks
    // below 1× and stays sparse. That per-particle ink term is what carries the
    // tone now, so the base factor must NOT assume every particle is full size.
    const dprNow = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2,
    );
    const areaDev =
      sr.width * dprNow * sr.height * dprNow * STAGE_FILL * STAGE_FILL;
    const spacingDev = Math.sqrt(Math.max(areaDev / count, 1));
    const discDev = spacingDev * 2.1;
    const defPointSize = THREE.MathUtils.clamp(
      (discDev * CAMERA_Z) / (dprNow * 1.05),
      10,
      96,
    );
    const pointSize = pointSizeRef.current ?? defPointSize;

    const built = mod.createTextMorphComputeBuild(
      gl as never,
      webgpu as never,
      tslNs as never,
      homeA,
      homeB,
      homeC,
      homeD,
      count,
      {
        SPRING: 52,
        DAMPING: 7.5,
        MAX_SPEED: 16,
        TURB: 9,
        POINT_SIZE: pointSize,
        POINT_ALPHA: 1.0,
        // Unused on the portrait path (colour comes from the buffers) but the
        // param shape requires them.
        EMISSIVE: 1,
        COL_COLD: [1, 1, 1],
        COL_HOT: [0.4, 1, 1],
      },
      seed,
      {
        colorsA: pts[0].rgb,
        colorsB: (pts[1] ?? pts[0]).rgb,
        // Real third target: colour AND ink, or the C leg renders the third
        // face's POSITIONS with the second face's colours and ink — and ink
        // gates disc size, the alpha knee, coverage and the alpha Discard, so
        // cells that are subject in C but backdrop in B get culled outright.
        // `undefined` at N=2 → hasPortraitC false → the exact 2-target graph.
        colorsC: pts[2]?.rgb,
        // Tone comes from particle SIZE: ink scales each disc (and its alpha),
        // morphed along the same staggered wave as the colour, chained A→B→C.
        sizeA: pts[0].ink,
        sizeB: (pts[1] ?? pts[0]).ink,
        sizeC: pts[2]?.ink,
        blending: "normal",
        // Depth OFF. With one particle per grid cell there is nothing
        // meaningful to occlude, and depth-testing overlapping discs at
        // slightly different z is exactly what turned the (now tiny) luminance
        // relief into mottling / comb tearing along every luminance edge.
        depthTest: false,
        depthWrite: false,
        emissive: emissiveRef.current, // faces photographic at rest
        travelTint: [0.16, 2.4, 3.0], // HDR cyan mid-flight → bloom
        // Lattice pitch in device px — sizes the render's sub-pixel coverage
        // compensation (disc diameter is exactly 2·f·spacingDev), so the
        // correction tracks this stage/dpr rather than assuming retina.
        spacingDev,
      },
    ) as unknown as MorphBuild;

    built.uFade.value = 0;
    // PINNED AT 1, NEVER ANIMATED. These become live terms the moment uMorph2
    // animates (gpgpuNodeSim's sizeFC), and portraitSizePxExpr deliberately
    // omits sizeFD — exact ONLY while these are 1. Animating them silently
    // desynchronises the sub-pixel coverage compensation.
    built.uSizeComp.value = 1;
    built.uSizeComp2.value = 1;
    built.uSizeComp3.value = 1;
    built.uPointSize.value = pointSize;

    if (keepEntry) {
      // Live rebuild after the entry finished: keep the morph where the user
      // left it, skip the entry.
      built.uAssemble.value = 1;
      applyMorph(built, morphRef.current);
      entryRef.current = 1;
    } else if (preserveState) {
      // Rebuild BEFORE the entry played (a measure bump / resize while the
      // section is still below the fold): keep the morph position but carry the
      // entry progress across so it still plays when the section is reached.
      built.uAssemble.value = entryRef.current;
      applyMorph(built, morphRef.current);
    } else {
      // Fresh build → replay the entry + reset the smoothers.
      built.uAssemble.value = 0;
      applyMorph(built, 0);
      morphRef.current = 0;
      entryRef.current = 0;
      fadeRef.current = 0;
      yawRef.current = 0;
      pitchRef.current = 0;
      dollyRef.current = 0;
      timeRef.current = 0;
    }

    // Swap in the new build; dispose the previous one AFTER React commits the
    // new geometry (deferred a frame so the still-mounted mesh never draws a
    // disposed buffer).
    const old = buildRef.current;
    buildRef.current = built;
    hasBuiltRef.current = true;
    setBuild(built);
    if (old) requestAnimationFrame(() => old.dispose());
    useFoundersMorphStore.getState().setActive(true);
  };

  // Re-run the SET sampler with new ink/grid params, then rebuild in place
  // (preserve the morph — no snap). Used by the live dev knobs. EVERY portrait
  // is re-sampled by the one call, so they can never drift onto different grids.
  const resampleNowRef = useRef<(opts: SampleTuning) => void>(() => {});
  resampleNowRef.current = (opts) => {
    const mod = sampleModRef.current;
    const imgs = imgsRef.current;
    if (!mod || imgs.length < TARGET_COUNT) return;
    tuningRef.current = { ...tuningRef.current, ...opts };
    const next = mod.samplePortraitSet(imgs, sampleSpec());
    if (!next) return;
    setRef.current = next;
    buildNowRef.current(true);
  };

  // === Build effect: load modules, build fresh on tier/resize/measure/sample ==
  useEffect(() => {
    if (!webgpuEnabled()) return;
    if (!setRef.current) return;
    let cancelled = false;

    const ensureModules = async () => {
      if (webgpuModRef.current && tslModRef.current && simModRef.current) return;
      const [webgpu, tslNs, mod] = await Promise.all([
        import("three/webgpu"),
        import("three/tsl"),
        import("./gpgpu/gpgpuNodeSim"),
      ]);
      webgpuModRef.current = webgpu;
      tslModRef.current = tslNs;
      simModRef.current = mod;
    };

    void ensureModules().then(() => {
      // First build plays the entry; resize/tier rebuilds preserve the morph.
      if (!cancelled) buildNowRef.current(hasBuiltRef.current);
    });

    return () => {
      cancelled = true;
      buildRef.current?.dispose();
      buildRef.current = null;
      setBuild(null);
      useFoundersMorphStore.getState().setActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, maxCount, sampleEpoch, measureVersion, size.width]);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const b = buildRef.current;
    if (!b) {
      group.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 1 / 30);
    const store = useFoundersMorphStore.getState();
    const rect = stageRectRef.current;
    if (!store.pinned || !rect) {
      group.visible = false;
      return;
    }

    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    // Sticky-frame viewport position (0 while pinned, negative as it releases).
    const clampedTop = Math.min(
      Math.max(scrollY, store.secTop),
      store.secTop + store.travel,
    );
    const stickyVpTop = clampedTop - scrollY;
    const vpY = stickyVpTop + rect.offsetY;
    const cx = rect.baseVpX + rect.w / 2;
    const cy = vpY + rect.h / 2;

    if (vpY + rect.h < -CULL_PAD || vpY > ih + CULL_PAD) {
      // Off-screen: skip the compute dispatch so this + the hero never both
      // dispatch in the same frame (uFade gate).
      group.visible = false;
      fadeRef.current = 0;
      b.uFade.value = 0;
      return;
    }
    group.visible = true;

    // --- ONE-SHOT morph clock (gate-driven, NOT scrubbed) --------------------
    // The gate sets store.morphTarget (integer 0..MORPH_MAX) + optional
    // morphImmediate; the clock advances the progress scalar toward it at
    // delta/MORPH_DURATION. A dev override pins it.
    const override = morphOverrideRef.current;
    if (override != null) {
      // Dev override WINS even while the gate is engaged — freeze the gate's
      // morphTarget→progress drive so a mid-morph state can be inspected.
      // Swallow any pending immediate so it can't fire when the override
      // releases.
      morphRef.current = THREE.MathUtils.clamp(override, 0, MORPH_MAX);
      if (store.morphImmediate) store.setMorphImmediate(false);
    } else {
      if (store.morphImmediate) {
        morphRef.current = store.morphTarget;
        store.setMorphImmediate(false);
      }
      const target = store.morphTarget;
      const cur = morphRef.current;
      if (cur !== target) {
        // UNCHANGED RATE: one unit of the scalar IS one leg, so MORPH_DURATION
        // stays PER-LEG and the shipped feel is preserved exactly. Clamp toward
        // the TARGET, not the rail bounds: with MORPH_MAX = 2 the target may be
        // INTERIOR (1 = Michele), where a bounds-only clamp overshoots and the
        // clock limit-cycles forever — shimmering the face, violating the
        // "uMorph reaches exactly 1.0 before uMorph2 leaves 0" invariant and
        // re-running the DOM applyStage sweep every frame at rest.
        const step = delta / MORPH_DURATION;
        morphRef.current =
          target > cur ? Math.min(cur + step, target) : Math.max(cur - step, target);
      }
    }
    const gc = THREE.MathUtils.clamp(morphRef.current, 0, MORPH_MAX);
    // ONE writer, shared with the build path — see applyMorph for why the
    // sequencing this produces is load-bearing.
    applyMorph(b, gc);
    // Report live progress + derived stage for the DOM copy cross-fade + gate.
    if (Math.abs(store.morph - gc) > 1e-4) store.setMorph(gc);
    const nextStage = stageFromMorph(gc);
    if (store.stage !== nextStage) store.setStage(nextStage);

    // Flight envelope: PER LEG. Peaks mid-leg, EXACTLY 0 at every locked stage.
    // MUST be leg-local: sin(gc·π) goes NEGATIVE for gc ∈ (1,2], which would
    // invert uSpread, dolly AWAY from the camera, orbit backwards and double
    // restEnv to 2.
    const env = Math.sin(legFract(gc) * Math.PI);
    b.uSpread.value = env * spreadMaxRef.current;

    // --- Entry assemble: advance once on the reveal edge ---------------------
    if (store.reveal >= 1 && entryRef.current < 1) {
      entryRef.current = Math.min(entryRef.current + delta / ENTRY_DURATION, 1);
    }
    b.uAssemble.value = entryRef.current;
    const assembleDone = entryRef.current >= 1;
    if (store.assembleDone !== assembleDone) store.setAssembleDone(assembleDone);

    // --- In-view fade (edge ramp) -------------------------------------------
    // Held at 0 until the entry assemble has begun: before the reveal the
    // particles sit motionless at their scatter seeds (uAssemble = 0, no
    // transit turbulence) — a frozen dust field we must never show.
    const ramp = ih * 0.28;
    const edge = Math.min(1, (ih - vpY) / ramp, (vpY + rect.h) / ramp);
    const shown = store.reveal >= 1 || entryRef.current > 0;
    fadeRef.current = THREE.MathUtils.damp(
      fadeRef.current,
      shown ? THREE.MathUtils.clamp(edge, 0, 1) : 0,
      8,
      delta,
    );
    b.uFade.value = fadeRef.current;

    // --- Group placement (camera-locked) + orbit + dolly (GROUP only) --------
    const dolly = env * DOLLY;
    dollyRef.current = dolly;
    scratch
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -(CAMERA_Z - dolly))
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch);

    // Orbit yaw + pointer parallax + rest-idle sway — GROUP transform only (the
    // camera is NEVER touched; the per-particle springs stay pixel-pinned so the
    // face itself remains crisp). Orbit and parallax both ride the LEG-LOCAL
    // sin(legFract·π) flight envelope, so the group transform is EXACTLY
    // neutral at EVERY locked stage (0, 1, 2 …) and the RESTING face never
    // tracks the cursor. The rest-idle terms ride the
    // envelope's COMPLEMENT instead: at the locked stages — where the gate
    // holds the page for an open-ended hold — the bust keeps a slow sway and
    // breath rather than sitting as a literal freeze-frame, and mid-flight that
    // idle life yields entirely to the orbit. Both crossings are absorbed by the
    // damp-6 smoothers below, so no term ever steps. Reduced-motion never reaches
    // this: founders-rail only pins the store on the non-reduced pinned-desktop
    // mode.
    const mouse = store.mouse;
    const t = timeRef.current;
    const restEnv = 1 - env;
    const yawTarget =
      env * (ORBIT_MAX + (mouse.x - 0.5) * PARALLAX_MAX) +
      restEnv * Math.sin(t * 0.11) * REST_SWAY_YAW;
    const pitchTarget =
      env * ((0.5 - mouse.y) * PARALLAX_MAX * 0.6) +
      restEnv * Math.sin(t * 0.07) * REST_SWAY_PITCH;
    yawRef.current = THREE.MathUtils.damp(yawRef.current, yawTarget, 6, delta);
    pitchRef.current = THREE.MathUtils.damp(
      pitchRef.current,
      pitchTarget,
      6,
      delta,
    );
    euler.set(pitchRef.current, yawRef.current, 0);
    quat.setFromEuler(euler);
    group.quaternion.copy(camera.quaternion).multiply(quat);

    // Breath: a slow whole-group swell, again gated by restEnv so it dies
    // mid-flight. Written fresh every visible frame as 1 + term (never
    // accumulated), so an interrupted leg can never leave a drifted scale baked
    // in; every particle scales together about the group origin, so the sampled
    // silhouette stays registered to itself.
    group.scale.setScalar(1 + restEnv * REST_BREATH * Math.sin(t * 0.5));

    const dpr = Math.min(gl.getPixelRatio(), 2);
    b.uPixelRatio.value = dpr;
    b.uViewport.value.set(size.width * dpr, size.height * dpr);
    timeRef.current += delta;
    b.tick({ dt: delta, time: timeRef.current });
  });

  // Dev-only handle for QA / live tuning.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__sersanFounderMorph = {
      hasBuild: !!buildRef.current,
      maxCount,
      /** Live instance count — decided by the sampler, not by a tier budget. */
      get count() {
        return setRef.current?.count ?? 0;
      },
      get stageRect() {
        return stageRectRef.current;
      },
      /** Sampler calibration readout: shared cells found for the current grid,
       * the stride that clamped them to the tier ceiling, and the mean ink. */
      getSampler() {
        const s = setRef.current;
        if (!s) return null;
        // NOTE: `meanInk` averages over the UNION cell list, which GROWS when a
        // portrait is added — so every existing portrait's mean falls purely by
        // denominator growth, with zero change to its pixels. Do NOT gate a
        // regression check on it. `meanInkSubject` (mean over the cells that
        // THIS portrait actually inks) is the comparable number — but ONLY
        // against a baseline taken at the SAME inkCut, since the threshold is a
        // live knob (resample({inkCut})). The published 0.550 baseline is at
        // inkCut 0.03; `inkCut` is returned below so a readout always says which
        // threshold produced it.
        const cut = sampleSpec().inkCut;
        const meanInk = (pt: PortraitPoints) => {
          let t = 0;
          for (let i = 0; i < s.count; i++) t += pt.ink[i];
          return t / Math.max(s.count, 1);
        };
        const meanInkSubject = (pt: PortraitPoints) => {
          let t = 0;
          let n = 0;
          for (let i = 0; i < s.count; i++) {
            // MUST follow the LIVE spec, not the frozen SAMPLE_SPEC_BASE: the
            // cell list itself was built with sampleSpec(), so a frozen cut
            // silently disagrees with the data after any resample({inkCut}).
            if (pt.ink[i] > cut) {
              t += pt.ink[i];
              n++;
            }
          }
          return n === 0 ? 0 : t / n;
        };
        return {
          gridW: s.gridW,
          gridH: s.gridH,
          sharedCells: s.sharedCells,
          stride: s.stride,
          count: s.count,
          maxCount,
          inkCut: cut, // the threshold meanInkSubject was measured at
          meanInk: s.points.map(meanInk), // [A, B, C] — union-denominated
          meanInkSubject: s.points.map(meanInkSubject), // [A, B, C] — at `inkCut`
          halfExtent: s.points.map((pt) => [pt.halfExtentX, pt.halfExtentY]),
        };
      },
      getUniforms() {
        const bb = buildRef.current;
        return {
          uAssemble: bb?.uAssemble.value ?? 0,
          uMorph: bb?.uMorph.value ?? 0,
          // Without uMorph2 exposed, QA cannot distinguish "parked at B" from
          // "parked at C" — both report uMorph: 1.
          uMorph2: bb?.uMorph2.value ?? 0,
          uMorph3: bb?.uMorph3.value ?? 0,
          progress: morphRef.current, // 0..MORPH_MAX
          uFade: bb?.uFade.value ?? 0,
          uSpread: bb?.uSpread.value ?? 0,
          emissive: bb?.uEmissive?.value ?? emissiveRef.current,
          pointSize: bb?.uPointSize.value ?? 0,
        };
      },
      getStage() {
        return useFoundersMorphStore.getState().stage;
      },
      // Deterministic gate drivers (proxied to the founders-rail state machine)
      // so QA can verify A→B→release / B→A→release without wheel/Lenis momentum.
      getGate() {
        return foundersGateApi.current?.getGate() ?? null;
      },
      simulateGesture(dir: "up" | "down") {
        return foundersGateApi.current?.simulateGesture(dir) ?? null;
      },
      setPointSize(v: number) {
        pointSizeRef.current = v;
        if (buildRef.current) buildRef.current.uPointSize.value = v;
      },
      setSpread(v: number) {
        spreadMaxRef.current = v;
      },
      setEmissive(v: number) {
        emissiveRef.current = v;
        if (buildRef.current?.uEmissive) buildRef.current.uEmissive.value = v;
        else buildNowRef.current(true);
      },
      setDepth(v: number) {
        depthScaleRef.current = v;
        buildNowRef.current(true);
      },
      /** Pin the progress scalar, 0..MORPH_MAX (null = release to the gate). */
      setMorph(v: number | null) {
        morphOverrideRef.current = v;
      },
      setStage(s: string) {
        morphOverrideRef.current = null;
        const t = Math.max(0, STAGE_ORDER.indexOf(s as never));
        useFoundersMorphStore
          .getState()
          .setMorphTarget(Math.min(t, MORPH_MAX), true);
      },
      /** Advance/retreat exactly ONE leg from the current progress. Stepping
       * from the CURRENT stage (not to a fixed 0|1) is what makes stage C
       * reachable from the dev handle at all. */
      playMorph(dir: number) {
        morphOverrideRef.current = null;
        // floor/ceil, NOT round: called mid-leg at progress 0.6 with dir=+1,
        // Math.round would target 2 and sweep straight past Michele without
        // locking — the exact "never forms the middle face" outcome this tool
        // exists to disprove. Exact in both cases now that the clock lands
        // precisely on integers (see the morph-clock fix in useFrame).
        const p = morphRef.current;
        const cur = dir >= 0 ? Math.floor(p) : Math.ceil(p);
        const t = THREE.MathUtils.clamp(
          cur + (dir >= 0 ? 1 : -1),
          0,
          MORPH_MAX,
        );
        useFoundersMorphStore.getState().setMorphTarget(t, false);
      },
      /** Re-run the set sampler with ink/grid overrides, e.g.
       * resample({ inkGain: 2.0, gridW: 310, gridH: 434 }). Overrides persist
       * for later resamples; the instance count follows the new grid. */
      resample(opts?: SampleTuning) {
        resampleNowRef.current(opts ?? {});
      },
      project() {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        const v = g.position.clone().project(camera);
        return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
      },
      bbox() {
        const g = groupRef.current;
        if (!g || !g.visible) return null;
        g.updateWorldMatrix(true, false);
        const { hx, hy, hz } = extentRef.current;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let sx = -1; sx <= 1; sx += 2)
          for (let sy = -1; sy <= 1; sy += 2)
            for (let sz = -1; sz <= 1; sz += 2) {
              cornerV
                .set(sx * hx, sy * hy, sz * hz)
                .applyMatrix4(g.matrixWorld)
                .project(camera);
              const px = ((cornerV.x + 1) / 2) * size.width;
              const py = ((1 - cornerV.y) / 2) * size.height;
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      },
    };
  }

  if (!build) return null;

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        geometry={build.geometry}
        material={build.material}
        frustumCulled={false}
      />
    </group>
  );
}

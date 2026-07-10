"use client";

/**
 * FounderPortraitMorph — the GATED, self-playing particle-portrait morph for the
 * home founders section (WEBGL_UPGRADE_PLAN §4R). Supersedes FounderPlanes.
 *
 * CONCEPT. One ~26k-point 3D particle cloud, PLACED and COLOURED by sampling
 * founder A's portrait (Alessandro) with luminance-driven z-relief so it reads
 * as a 3D bust. The founders section PINS via a scroll-jack gate (founders-rail,
 * mirrors HeroIntroGate): while pinned the page does NOT scroll and the morph is
 * NOT scrubbed. One scroll-down gesture triggers a ONE-SHOT auto-play A→B that
 * runs to completion on its own clock (MORPH_DURATION); at B the cloud LOCKS;
 * another gesture releases the page. Reverse symmetrically for scroll-up. The
 * particle GROUP orbits + dollies in real 3D (group transform ONLY — never the
 * global camera; SignatureLine is the single camera authority). At uMorph 0 and
 * 1 the spring pins each particle to its exact sampled pixel so the faces read
 * crisply; mid-flight the swarm surges cyan (feeds the selective bloom). The two
 * DOM copy blocks cross-fade following uMorph (owned by founders-rail.tsx).
 *
 * WORLD SCALE (fills the stage). The sampler returns the sampled FACE extent
 * (a robust percentile half-width/height in grid px). This island maps grid-px →
 * world so that extent ≈ STAGE_FILL × the measured [data-founder-stage] rect —
 * so the face FILLS (not overflows) the stage regardless of how much of the
 * source frame the face occupies. z-relief is capped to ≤ Z_RELIEF_MAX_FRAC of
 * the face height so the orbit reads 3D without smearing the silhouette.
 *
 * COLOUR AT REST. NormalBlending + depthTest/Write (front discs occlude back =
 * real relief); at speed≈0 each particle shows its sampled sRGB→linear pixel
 * colour × a modest emissive (~1.1) — photographic skin tone, not additive white
 * dust. The cyan travel-tint only rises with speed mid-morph.
 *
 * ENGINE REUSE. createTextMorphComputeBuild (gpgpu/gpgpuNodeSim.ts) with the
 * OPTIONAL `portrait` param. homeC/homeD = homeB, uMorph2/uMorph3 stay 0 (single
 * A→B leg). With `portrait` undefined the build is byte-identical to the hero.
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
 * getStage / setPointSize / setSpread / setEmissive / setLumThreshold / setDepth
 * / setMorph(override) / setStage / playMorph / resample / project / bbox — so
 * the final look (point size / spread / emissive / threshold / crop) is tuned
 * without rebuilds.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "./constants";
import { webgpuEnabled } from "./renderer/createRenderer";
import {
  useFoundersMorphStore,
  foundersGateApi,
} from "./store/foundersMorphStore";
import { useTierStore } from "./store/tierStore";
import { founders } from "@/data/founders";
import type { ImagePoints, ImageSampleSpec } from "./image/sampleImagePoints";

const COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 26000,
  lite: 12000,
};

// --- Sampler grid + look constants -----------------------------------------
const GRID_W = 300;
const GRID_H = 420;
const STRIDE = 2;
/** Portrait fill fraction of the stage rect (leaves a small margin). */
const STAGE_FILL = 0.92;
/** z-relief cap as a fraction of the sampled FACE height (keeps the bust 3D
 * without smearing the silhouette on orbit). */
const Z_RELIEF_MAX_FRAC = 0.15;
/** Per-image seeds (deterministic picks; pairing comes from the radial sort). */
const SEED_A = 0x51e7a1;
const SEED_B = 0x9c3f22;

/** Default background-isolation thresholds (live-tunable). Dark bg → dropped by
 * luminance; a neutral bg is dropped by satFloor (chroma = max−min RGB).
 * The real headshots (public/founders/<slug>-headshot.webp) are tight face
 * crops on a near-WHITE studio wall — luminance can't drop a bright bg, so
 * white-bg isolation lives on satFloor: flat white wall + white shirt ≈ 0 chroma
 * → dropped; skin/hair/beard clear it. 0.06 was picked live on the WebGPU
 * desktop (setSat sweep 0→0.10): it removes the rectangular bg halo while
 * preserving Michele's dark beard and Alessandro's features; higher floors don't
 * improve the face and the few tinted-white collar highlights survive any usable
 * floor (they read as shoulders dissolving under the copy scrim). */
const DEFAULT_LUM_THRESHOLD = 0.1;
const DEFAULT_SAT_FLOOR = 0.06;
/** Modest emissive so faces stay photographic at rest (task: ~1.0–1.3). */
const DEFAULT_EMISSIVE = 1.1;
/** Shadow lift: near-black particles (Alessandro's hair, Michele's beard) match
 * the dark navy site bg and vanish; this raises them toward a faint cool tone so
 * the silhouette reads. Knee = luminance below which the lift applies. Picked on
 * the WebGPU desktop; live-tunable via __sersanFounderMorph.setShadowLift/Knee. */
const DEFAULT_SHADOW_LIFT = 0.16;
const DEFAULT_SHADOW_KNEE = 0.28;
/** LEGACY fallback (environmental) sources: PER-FOUNDER centred upper crop to
 * isolate each face — Alessandro and Michele sit differently in their
 * environmental photos, so a single shared crop cut Michele. Indexed by
 * founder; only used when a tight headshot file is absent. As of the real
 * studio headshots landing (<slug>-headshot.webp, sampled full-frame), this is
 * dead unless a headshot file goes missing; live-tunable via resample({crop}) /
 * resample({cropA,cropB}). */
const DEFAULT_FALLBACK_CROPS = [
  { x: 0.3, y: 0.02, w: 0.42, h: 0.58 }, // Alessandro
  { x: 0.34, y: 0.06, w: 0.4, h: 0.56 }, // Michele
];

/** Shape of the sampler spec minus the per-call/tunable fields. */
const SAMPLE_SPEC_BASE: Omit<
  ImageSampleSpec,
  "seed" | "lumFloor" | "satFloor" | "crop"
> = {
  gridW: GRID_W,
  gridH: GRID_H,
  stride: STRIDE,
  depth: 90, // grid-px of luminance relief front-to-back (capped in toWorld)
  centerZBias: 40, // extra forward bulge at the face centre
  radialFalloff: 1.7, // tighter to the centred face
  radius: 0.72,
  faceBias: 0.44, // faces sit a touch above centre
  lumGamma: 1.15,
  pair: true,
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
/** Entry assemble duration (seconds) once the section reveals. */
const ENTRY_DURATION = 2.2;
/** One-shot A→B (or B→A) auto-play duration (seconds). Mirrors the hero morph. */
const MORPH_DURATION = 2.6;
/** Off-screen cull margin (CSS px). */
const CULL_PAD = 120;

/** Headshot asset discovery — preferred over the environmental fallback. */
const HEADSHOT_EXTS = ["webp", "jpg", "png"];
const FOUNDER_SLUGS = ["alessandro", "michele"];

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
  uShadowLift?: { value: number };
  uShadowKnee?: { value: number };
  tick: (p: { dt: number; time: number }) => void;
  dispose: () => void;
}

interface StageRect {
  /** Stage top offset within the sticky frame (CSS px). */
  offsetY: number;
  /** Stage left edge in viewport space (the sticky frame never translates x). */
  baseVpX: number;
  w: number;
  h: number;
}

type Crop = { x: number; y: number; w: number; h: number } | undefined;

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
 * attempting the load and falling back on error. */
async function loadFounder(
  idx: number,
): Promise<{ img: HTMLImageElement; isHeadshot: boolean }> {
  const slug = FOUNDER_SLUGS[idx] ?? FOUNDER_SLUGS[0];
  for (const ext of HEADSHOT_EXTS) {
    try {
      const img = await loadImg(`/founders/${slug}-headshot.${ext}`);
      return { img, isHeadshot: true };
    } catch {
      /* try next extension / fall back */
    }
  }
  const img = await loadImg(founders[idx]?.image ?? "");
  return { img, isHeadshot: false };
}

export function FounderPortraitMorph() {
  const { camera, size, gl } = useThree();

  const tier = useTierStore((s) => s.tier);
  const count = COUNT_BY_TIER[tier === "lite" ? "lite" : "full"];

  // Rare-change reactive reads (allowed) — trigger (re)build + (re)measure.
  const measureVersion = useFoundersMorphStore((s) => s.measureVersion);

  // Cached decoded portraits + their (scale-independent) samples + modules.
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const sampleARef = useRef<ImagePoints | null>(null);
  const sampleBRef = useRef<ImagePoints | null>(null);
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
  const morphRef = useRef(0); // one-shot uMorph clock (0=A … 1=B)
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
  const shadowLiftRef = useRef(DEFAULT_SHADOW_LIFT);
  const shadowKneeRef = useRef(DEFAULT_SHADOW_KNEE);
  const lumThresholdRef = useRef(DEFAULT_LUM_THRESHOLD);
  const satFloorRef = useRef(DEFAULT_SAT_FLOOR);
  const cropARef = useRef<Crop>(undefined);
  const cropBRef = useRef<Crop>(undefined);
  /** Dev override for uMorph (null = gate/scroll control). */
  const morphOverrideRef = useRef<number | null>(null);

  const groupRef = useRef<THREE.Group>(null);
  // Stable scratch objects (module-frame reuse — no per-frame allocation).
  const scratch = useRef(new THREE.Vector3()).current;
  const euler = useRef(new THREE.Euler()).current;
  const quat = useRef(new THREE.Quaternion()).current;
  const cornerV = useRef(new THREE.Vector3()).current;

  const specFor = (seed: number, crop: Crop): ImageSampleSpec => ({
    ...SAMPLE_SPEC_BASE,
    seed,
    lumFloor: lumThresholdRef.current,
    satFloor: satFloorRef.current,
    crop,
  });

  // === Load + sample both portraits (headshot preferred, else fallback) ======
  useEffect(() => {
    if (!webgpuEnabled()) return;
    let cancelled = false;

    void Promise.all([
      loadFounder(0),
      loadFounder(1),
      import("./image/sampleImagePoints"),
    ])
      .then(([a, b, mod]) => {
        if (cancelled) return;
        imgARef.current = a.img;
        imgBRef.current = b.img;
        sampleModRef.current = mod;
        // Headshots sample full-frame; environmental fallbacks get their OWN
        // per-founder face crop.
        cropARef.current = a.isHeadshot ? undefined : DEFAULT_FALLBACK_CROPS[0];
        cropBRef.current = b.isHeadshot ? undefined : DEFAULT_FALLBACK_CROPS[1];
        sampleARef.current = mod.sampleImagePoints(
          a.img,
          a.img.naturalWidth,
          a.img.naturalHeight,
          count,
          specFor(SEED_A, cropARef.current),
        );
        sampleBRef.current = mod.sampleImagePoints(
          b.img,
          b.img.naturalWidth,
          b.img.naturalHeight,
          count,
          specFor(SEED_B, cropBRef.current),
        );
        setSampleEpoch((e) => e + 1);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // === Core build: measure stage rect, fit grid-px → world, spin up the sim ===
  // Kept in a ref so live knobs (resample/setDepth/setEmissive) can rebuild
  // in place, preserving the current uMorph (no snap).
  const buildNowRef = useRef<(preserveState: boolean) => void>(() => {});
  buildNowRef.current = (preserveState: boolean) => {
    if (!webgpuEnabled()) return;
    const sA = sampleARef.current;
    const sB = sampleBRef.current;
    const webgpu = webgpuModRef.current as typeof import("three/webgpu") | null;
    const tslNs = tslModRef.current as typeof import("three/tsl") | null;
    const mod = simModRef.current;
    if (!sA || !sB || !webgpu || !tslNs || !mod) return;

    // True-WebGPU compute only (storage indexing no-ops on WebGL2, #31221).
    const bk = (gl as unknown as { backend?: { isWebGLBackend?: boolean } })
      .backend;
    const isWebGPUBackend =
      !!bk &&
      bk.isWebGLBackend !== true &&
      typeof (gl as unknown as { compute?: unknown }).compute === "function";
    if (!isWebGPUBackend) return;

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
    // A & B SHARE ONE scale (paired morph → short travel): fit the LARGER of the
    // two extents so both faces stay inside the stage. Uniform (contain) scale so
    // the cloud FILLS ~STAGE_FILL of the stage without distorting the aspect.
    const halfX = Math.max(sA.halfExtentX, sB.halfExtentX, 1e-3);
    const halfY = Math.max(sA.halfExtentY, sB.halfExtentY, 1e-3);
    const stageWorldW = sr.width * worldPerPx;
    const stageWorldH = sr.height * worldPerPx;
    const scaleX = (stageWorldW * STAGE_FILL) / (2 * halfX);
    const scaleY = (stageWorldH * STAGE_FILL) / (2 * halfY);
    const worldPerGrid = Math.min(scaleX, scaleY);

    // z-relief cap: normalize the sampler's grid-px relief so its max depth is
    // ≤ Z_RELIEF_MAX_FRAC of the face height, then apply the live depth knob.
    let maxAbsZ = 1e-4;
    for (let i = 0; i < count; i++) {
      const za = Math.abs(sA.z[i]);
      if (za > maxAbsZ) maxAbsZ = za;
      const zb = Math.abs(sB.z[i]);
      if (zb > maxAbsZ) maxAbsZ = zb;
    }
    const faceHeightGrid = 2 * halfY;
    const zNorm = Math.min(1, (Z_RELIEF_MAX_FRAC * faceHeightGrid) / maxAbsZ);
    const zFactor = worldPerGrid * zNorm * depthScaleRef.current;

    const toWorld = (s: ImagePoints) => {
      const out = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        out[i * 3] = s.xy[i * 2] * worldPerGrid;
        out[i * 3 + 1] = s.xy[i * 2 + 1] * worldPerGrid;
        out[i * 3 + 2] = s.z[i] * zFactor;
      }
      return out;
    };
    const homeA = toWorld(sA);
    const homeB = toWorld(sB);

    extentRef.current = {
      hx: halfX * worldPerGrid,
      hy: halfY * worldPerGrid,
      hz: maxAbsZ * zFactor,
    };

    // Seed positions. Fresh build → a scattered cloud the particles fly IN from
    // on the entry assemble. Live rebuild (preserveState) → the current home so
    // the morph does not snap (keep uMorph).
    let seed: Float32Array;
    if (preserveState) {
      seed = (morphRef.current >= 0.5 ? homeB : homeA).slice();
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

    // --- DENSITY: default disc size so ~count soft discs OVERLAP into tone -----
    // spacing ≈ sqrt(stageArea_devpx / count); disc diameter ≈ 1.9× spacing so
    // neighbours touch and the face reads as continuous shaded tone, not dots.
    const dprNow = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      2,
    );
    const areaDev =
      sr.width * dprNow * sr.height * dprNow * STAGE_FILL * STAGE_FILL;
    const spacingDev = Math.sqrt(Math.max(areaDev / count, 1));
    const discDev = spacingDev * 1.9;
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
      // Single A→B leg: homeC/homeD = homeB, uMorph2/uMorph3 never advanced.
      homeB,
      homeB,
      count,
      {
        SPRING: 34,
        DAMPING: 6.2,
        MAX_SPEED: 11,
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
        colorsA: sA.rgb,
        colorsB: sB.rgb,
        blending: "normal", // depth-tested occlusion = real relief
        depthTest: true,
        depthWrite: true,
        emissive: emissiveRef.current, // faces photographic at rest
        travelTint: [0.16, 2.4, 3.0], // HDR cyan mid-flight → bloom
        shadowLift: shadowLiftRef.current, // dark hair/beard read on the navy bg
        shadowKnee: shadowKneeRef.current,
      },
    ) as unknown as MorphBuild;

    built.uMorph2.value = 0;
    built.uMorph3.value = 0;
    built.uFade.value = 0;
    built.uSizeComp.value = 1;
    built.uSizeComp2.value = 1;
    built.uSizeComp3.value = 1;
    built.uPointSize.value = pointSize;

    if (preserveState) {
      // Live rebuild (resize / tier / measure bump): keep the morph AND the
      // CURRENT entry progress where they are. Do NOT force the entry to "done"
      // — a measure bump (webfonts landing, intro-gate collapse) commonly fires
      // before the user has scrolled to the section, and forcing entryRef=1 here
      // would skip the whole compose beat so the face is already assembled on
      // arrival. A rebuild AFTER the entry has actually played still carries
      // entryRef≈1, so it correctly stays assembled (no replay on resize).
      built.uAssemble.value = entryRef.current;
      built.uMorph.value = morphRef.current;
    } else {
      // Fresh build → replay the entry + reset the smoothers.
      built.uAssemble.value = 0;
      built.uMorph.value = 0;
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

  // Re-run the sampler for both portraits with new params, then rebuild in place
  // (preserve the morph — no snap). Used by the live lum/sat/crop knobs.
  const resampleNowRef = useRef<
    (opts: {
      crop?: Crop;
      cropA?: Crop;
      cropB?: Crop;
      lumThreshold?: number;
      sat?: number;
    }) => void
  >(() => {});
  resampleNowRef.current = (opts) => {
    const mod = sampleModRef.current;
    const ia = imgARef.current;
    const ib = imgBRef.current;
    if (!mod || !ia || !ib) return;
    if (opts.lumThreshold != null) lumThresholdRef.current = opts.lumThreshold;
    if (opts.sat != null) satFloorRef.current = opts.sat;
    // `crop` sets both; `cropA`/`cropB` override per-founder.
    if (opts.crop !== undefined) {
      cropARef.current = opts.crop;
      cropBRef.current = opts.crop;
    }
    if (opts.cropA !== undefined) cropARef.current = opts.cropA;
    if (opts.cropB !== undefined) cropBRef.current = opts.cropB;
    sampleARef.current = mod.sampleImagePoints(
      ia,
      ia.naturalWidth,
      ia.naturalHeight,
      count,
      specFor(SEED_A, cropARef.current),
    );
    sampleBRef.current = mod.sampleImagePoints(
      ib,
      ib.naturalWidth,
      ib.naturalHeight,
      count,
      specFor(SEED_B, cropBRef.current),
    );
    buildNowRef.current(true);
  };

  // === Build effect: load modules, build fresh on tier/resize/measure/sample ==
  useEffect(() => {
    if (!webgpuEnabled()) return;
    if (!sampleARef.current || !sampleBRef.current) return;
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
  }, [gl, count, sampleEpoch, measureVersion, size.width]);

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
    // The gate sets store.morphTarget (0|1) + optional morphImmediate; the clock
    // advances uMorph toward it at delta/MORPH_DURATION. A dev override pins it.
    const override = morphOverrideRef.current;
    if (override != null) {
      // Dev override WINS even while the gate is engaged — freeze the gate's
      // morphTarget→uMorph drive so a mid-morph state can be inspected. Swallow
      // any pending immediate so it can't fire when the override releases.
      morphRef.current = THREE.MathUtils.clamp(override, 0, 1);
      if (store.morphImmediate) store.setMorphImmediate(false);
    } else {
      if (store.morphImmediate) {
        morphRef.current = store.morphTarget;
        store.setMorphImmediate(false);
      }
      const target = store.morphTarget;
      const cur = morphRef.current;
      if (cur !== target) {
        const dir = target > cur ? 1 : -1;
        morphRef.current = THREE.MathUtils.clamp(
          cur + (dir * delta) / MORPH_DURATION,
          0,
          1,
        );
      }
    }
    const gc = THREE.MathUtils.clamp(morphRef.current, 0, 1);
    b.uMorph.value = gc;
    // Report live morph + derived stage for the DOM copy cross-fade + the gate.
    if (Math.abs(store.morph - gc) > 1e-4) store.setMorph(gc);
    const nextStage = gc <= 0.02 ? "A" : gc >= 0.98 ? "B" : "morphing";
    if (store.stage !== nextStage) store.setStage(nextStage);

    // Peak spread + orbit envelope at the midpoint; EXACTLY 0 at both ends.
    const env = Math.sin(gc * Math.PI);
    b.uSpread.value = env * spreadMaxRef.current;

    // --- Entry assemble: advance once on the reveal edge ---------------------
    if (store.reveal >= 1 && entryRef.current < 1) {
      entryRef.current = Math.min(entryRef.current + delta / ENTRY_DURATION, 1);
    }
    b.uAssemble.value = entryRef.current;
    const assembleDone = entryRef.current >= 1;
    if (store.assembleDone !== assembleDone) store.setAssembleDone(assembleDone);

    // --- In-view fade (edge ramp) -------------------------------------------
    const ramp = ih * 0.28;
    const edge = Math.min(1, (ih - vpY) / ramp, (vpY + rect.h) / ramp);
    fadeRef.current = THREE.MathUtils.damp(
      fadeRef.current,
      THREE.MathUtils.clamp(edge, 0, 1),
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

    // Orbit yaw + subtle pointer parallax, both scaled by the sin(g·π) envelope
    // so the group transform is EXACTLY neutral at g=0 and g=1 (faces frontal +
    // pixel-registered at rest). The camera is NEVER touched.
    const mouse = store.mouse;
    const yawTarget = env * (ORBIT_MAX + (mouse.x - 0.5) * PARALLAX_MAX);
    const pitchTarget = env * ((0.5 - mouse.y) * PARALLAX_MAX * 0.6);
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
      count,
      get stageRect() {
        return stageRectRef.current;
      },
      getUniforms() {
        const bb = buildRef.current;
        return {
          uAssemble: bb?.uAssemble.value ?? 0,
          uMorph: bb?.uMorph.value ?? 0,
          uFade: bb?.uFade.value ?? 0,
          uSpread: bb?.uSpread.value ?? 0,
          emissive: bb?.uEmissive?.value ?? emissiveRef.current,
          shadowLift: bb?.uShadowLift?.value ?? shadowLiftRef.current,
          shadowKnee: bb?.uShadowKnee?.value ?? shadowKneeRef.current,
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
      setShadowLift(v: number) {
        shadowLiftRef.current = v;
        if (buildRef.current?.uShadowLift) buildRef.current.uShadowLift.value = v;
        else buildNowRef.current(true);
      },
      setShadowKnee(v: number) {
        shadowKneeRef.current = v;
        if (buildRef.current?.uShadowKnee) buildRef.current.uShadowKnee.value = v;
        else buildNowRef.current(true);
      },
      setLumThreshold(v: number) {
        resampleNowRef.current({ lumThreshold: v });
      },
      setSat(v: number) {
        resampleNowRef.current({ sat: v });
      },
      setDepth(v: number) {
        depthScaleRef.current = v;
        buildNowRef.current(true);
      },
      setMorph(v: number | null) {
        morphOverrideRef.current = v;
      },
      setStage(s: "A" | "B") {
        morphOverrideRef.current = null;
        useFoundersMorphStore.getState().setMorphTarget(s === "B" ? 1 : 0, true);
      },
      playMorph(dir: number) {
        morphOverrideRef.current = null;
        useFoundersMorphStore
          .getState()
          .setMorphTarget(dir >= 0 ? 1 : 0, false);
      },
      resample(opts?: {
        crop?: Crop;
        cropA?: Crop;
        cropB?: Crop;
        lumThreshold?: number;
        sat?: number;
      }) {
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

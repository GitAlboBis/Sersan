"use client";

/**
 * FounderPortraitMorph — the GATED, self-playing particle-portrait morph for the
 * home founders section (WEBGL_UPGRADE_PLAN §4R). Supersedes FounderPlanes.
 *
 * CONCEPT. One ~42k-point 3D particle cloud, PLACED and COLOURED by sampling
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
 * SAMPLING (rewritten 2026-07-20). Both portraits are sampled onto ONE shared
 * grid by samplePortraitPair: one particle per grid cell (no random picks → no
 * holes, no duplicates), tone carried by particle SIZE via the per-particle
 * `ink` scalar rather than by particle DENSITY, and no hard background mask
 * (the backdrop simply has ink ≈ 0 and shrinks away). The shared cell list also
 * supplies A↔B index pairing for free — particle j is the same cell in both
 * images — which retired the old radial-sector sort. Consequently the INSTANCE
 * COUNT FOLLOWS THE SAMPLER (cells found, strided down to the tier ceiling);
 * it is never a fixed budget padded with duplicates.
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
 * getSampler / getStage / setPointSize / setSpread / setEmissive / setDepth /
 * setMorph(override) / setStage / playMorph / resample / project / bbox — so
 * the final look (point size / spread / emissive / ink curve / grid) is tuned
 * without rebuilds. `resample({ inkGain, inkFloor, inkGamma, inkGateLo,
 * inkGateHi, fadeStart, fadeSpan, inkCut, gridW, gridH })` re-runs the pair
 * sampler in place.
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
import type {
  PortraitPair,
  PortraitPairSpec,
  PortraitPoints,
} from "./image/sampleImagePoints";

/** Tier CEILING on the instance count — not a target. The sampler decides the
 * count (one particle per shared grid cell) and only gets strided down if the
 * grid overshoots this. */
const MAX_COUNT_BY_TIER: Record<"full" | "lite", number> = {
  full: 48000,
  lite: 16000,
};

// --- Sampler grid + look constants -----------------------------------------
/** Shared sample grid (5:7 portrait). Measured on the two shipped headshots:
 * 290×405 → 42,087 shared cells at stride 1, which lands on the full tier's
 * budget with headroom under the 48,000 ceiling. Cell count scales with grid
 * AREA, so retarget with `scale = sqrt(wanted / measured)` if the assets or the
 * ink curve change; keep it under the ceiling so the stride stays 1 (the
 * integer stride is a cliff — 50k cells would halve the count to 25k). */
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
const SAMPLE_SPEC_BASE: Omit<PortraitPairSpec, "maxCount"> = {
  gridW: GRID_W,
  gridH: GRID_H,
  depth: 90, // grid-px of luminance relief front-to-back (capped in toWorld)
  // Forward bulge at the face centre: DISABLED (0). On the regular one-per-cell
  // grid it produced a visible rounded bulge artifact around the chin/face
  // centre, and it compounds the edge-tearing described at Z_RELIEF_MAX_FRAC.
  centerZBias: 0,
  inkGain: 1.7, // contrast gain on the backdrop distance
  inkFloor: 0.05, // below this the cell is backdrop → ink 0
  inkGamma: 0.7, // <1 keeps mid-tones (cheeks, shirt folds) present
  // Low-end noise gate on the normalized distance `v`, applied BEFORE the gamma
  // lift. v = (dist·inkGain − inkFloor)/(1 − inkFloor), so with gain 1.7 /
  // floor 0.05 these edges are, in RAW luma-weighted colour distance from the
  // measured backdrop: v 0.05 → d 0.0574 (≈15/255 levels) → ink EXACTLY 0, and
  // v 0.22 → d 0.152 (≈39/255) → full lift. A wall cell 20 levels off the
  // median now reads ink 0.023 (was 0.186) and a 25-level one 0.090 (was
  // 0.234), while a real hair-wisp edge at 31 levels keeps ink 0.20 and any
  // genuine mid-tone (≥39 levels: cheeks, shirt folds) is BYTE-UNCHANGED.
  inkGateLo: 0.05,
  inkGateHi: 0.22,
  fadeStart: 0.6, // the bust dissolves into darkness below this normalized y
  fadeSpan: 0.34,
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
/** Entry assemble duration (seconds) once the section reveals. */
const ENTRY_DURATION = 1.8;
/** One-shot A→B (or B→A) auto-play duration (seconds). Mirrors the hero morph. */
const MORPH_DURATION = 1.4;
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

/** Live-tunable subset of the sampler spec (dev handle `resample`). */
type SampleTuning = Partial<Omit<PortraitPairSpec, "maxCount">>;

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
  const slug = FOUNDER_SLUGS[idx] ?? FOUNDER_SLUGS[0];
  for (const ext of HEADSHOT_EXTS) {
    try {
      return await loadImg(`/founders/${slug}-headshot.${ext}`);
    } catch {
      /* try next extension / fall back */
    }
  }
  return loadImg(founders[idx]?.image ?? "");
}

export function FounderPortraitMorph() {
  const { camera, size, gl } = useThree();

  const tier = useTierStore((s) => s.tier);
  const maxCount = MAX_COUNT_BY_TIER[tier === "lite" ? "lite" : "full"];

  // Rare-change reactive reads (allowed) — trigger (re)build + (re)measure.
  const measureVersion = useFoundersMorphStore((s) => s.measureVersion);

  // Cached decoded portraits + the (scale-independent) shared-grid PAIR sample.
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const pairRef = useRef<PortraitPair | null>(null);
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
   * tier ceiling. Both portraits share ONE spec by construction — the shared
   * grid is what pairs them. */
  const sampleSpec = (): PortraitPairSpec => ({
    ...SAMPLE_SPEC_BASE,
    ...tuningRef.current,
    maxCount,
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
        imgARef.current = a;
        imgBRef.current = b;
        sampleModRef.current = mod;
        // ONE call samples BOTH portraits onto the shared grid — that shared
        // cell list is what index-pairs particle j across A and B.
        pairRef.current = mod.samplePortraitPair(a, b, sampleSpec());
        setSampleEpoch((e) => e + 1);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxCount]);

  // === Core build: measure stage rect, fit grid-px → world, spin up the sim ===
  // Kept in a ref so live knobs (resample/setDepth/setEmissive) can rebuild
  // in place, preserving the current uMorph (no snap).
  const buildNowRef = useRef<(preserveState: boolean) => void>(() => {});
  buildNowRef.current = (preserveState: boolean) => {
    if (!webgpuEnabled()) return;
    const pair = pairRef.current;
    const webgpu = webgpuModRef.current as typeof import("three/webgpu") | null;
    const tslNs = tslModRef.current as typeof import("three/tsl") | null;
    const mod = simModRef.current;
    if (!pair || !webgpu || !tslNs || !mod) return;
    const sA = pair.a;
    const sB = pair.b;
    // The instance count FOLLOWS the sampler (one particle per shared cell).
    const count = pair.count;

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

    const toWorld = (s: PortraitPoints) => {
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
      // Single A→B leg: homeC/homeD = homeB, uMorph2/uMorph3 never advanced.
      homeB,
      homeB,
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
        colorsA: sA.rgb,
        colorsB: sB.rgb,
        // Tone comes from particle SIZE: ink scales each disc (and its alpha),
        // morphed A→B on the same staggered wave as the colour.
        sizeA: sA.ink,
        sizeB: sB.ink,
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

    built.uMorph2.value = 0;
    built.uMorph3.value = 0;
    built.uFade.value = 0;
    built.uSizeComp.value = 1;
    built.uSizeComp2.value = 1;
    built.uSizeComp3.value = 1;
    built.uPointSize.value = pointSize;

    if (keepEntry) {
      // Live rebuild after the entry finished: keep the morph where the user
      // left it, skip the entry.
      built.uAssemble.value = 1;
      built.uMorph.value = morphRef.current;
      entryRef.current = 1;
    } else if (preserveState) {
      // Rebuild BEFORE the entry played (a measure bump / resize while the
      // section is still below the fold): keep the morph position but carry the
      // entry progress across so it still plays when the section is reached.
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

  // Re-run the PAIR sampler with new ink/grid params, then rebuild in place
  // (preserve the morph — no snap). Used by the live dev knobs. Both portraits
  // are re-sampled by the one call, so they can never drift onto different grids.
  const resampleNowRef = useRef<(opts: SampleTuning) => void>(() => {});
  resampleNowRef.current = (opts) => {
    const mod = sampleModRef.current;
    const ia = imgARef.current;
    const ib = imgBRef.current;
    if (!mod || !ia || !ib) return;
    tuningRef.current = { ...tuningRef.current, ...opts };
    const next = mod.samplePortraitPair(ia, ib, sampleSpec());
    if (!next) return;
    pairRef.current = next;
    buildNowRef.current(true);
  };

  // === Build effect: load modules, build fresh on tier/resize/measure/sample ==
  useEffect(() => {
    if (!webgpuEnabled()) return;
    if (!pairRef.current) return;
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
      maxCount,
      /** Live instance count — decided by the sampler, not by a tier budget. */
      get count() {
        return pairRef.current?.count ?? 0;
      },
      get stageRect() {
        return stageRectRef.current;
      },
      /** Sampler calibration readout: shared cells found for the current grid,
       * the stride that clamped them to the tier ceiling, and the mean ink. */
      getSampler() {
        const p = pairRef.current;
        if (!p) return null;
        const meanInk = (s: PortraitPoints) => {
          let t = 0;
          for (let i = 0; i < p.count; i++) t += s.ink[i];
          return t / Math.max(p.count, 1);
        };
        return {
          gridW: p.gridW,
          gridH: p.gridH,
          sharedCells: p.sharedCells,
          stride: p.stride,
          count: p.count,
          maxCount,
          meanInkA: meanInk(p.a),
          meanInkB: meanInk(p.b),
          halfExtent: [p.a.halfExtentX, p.a.halfExtentY, p.b.halfExtentX, p.b.halfExtentY],
        };
      },
      getUniforms() {
        const bb = buildRef.current;
        return {
          uAssemble: bb?.uAssemble.value ?? 0,
          uMorph: bb?.uMorph.value ?? 0,
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
      /** Re-run the pair sampler with ink/grid overrides, e.g.
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

"use client";

/**
 * TeamGlyphRain — "PRODUCTION TELEMETRY RAIN" backdrop for the home Team
 * section (the founders morph stage). A Lusion-style glyph rain
 * (docs/recon-2026-08-27/lusion-team-reverse.md §4 `AboutHeroLetters`) whose
 * cells are short mono telemetry TOKENS ("p99 38ms", "deploy ✓", "kill-sw ON")
 * flowing UPWARD like a log tail behind the founders' particle portrait — a
 * FAINT wall (intensity 0.16) so the copy on the right stays perfectly legible.
 *
 * RECIPE (full shader notes in ./telemetryRainNodeMaterial.ts):
 *   - TWO draw calls: one InstancedBufferGeometry per layer (near 1.0×/1.0,
 *     far 1.6×/0.4), unit quad, one instance per column, both ON the content
 *     plane (no z offset) and INSIDE the frame (quad height = 90 % of the
 *     frame, the fade reaches 0 at the quad edge). The far layer is softened
 *     by brightness alone (no bias sampling).
 *   - Column CAPACITY per layer is a slot grid across the frame width (pitch
 *     1.2 × column width, ±8 % jitter → same-layer neighbours never overlap).
 *     Every slot is built ONCE, sorted by a dip-weighted priority (Gaussian
 *     dip centred at 34 % of the width, σ 0.18, depth 0.6, raised to 1.5) so
 *     the columns behind the head come LAST; `density` then sets each
 *     geometry's `instanceCount` = round(density × capacity) — fewer draws,
 *     not an alpha gate. Default 0.75 ≈ 23 visible columns (14 near + 9 far).
 *   - Each column scrolls its token stack upward at 1.5–5 cells/s × 0.7 with a
 *     closed-form "breath" (columns crawl / idle for long stretches) plus the
 *     long-period on/off gap term; tokens re-randomise on a slow per-cell
 *     epoch; rare tokens (human ✓ · 3am fine · judgement · kill-sw ON) draw in
 *     the accent cyan at HDR 1.1 so the selective bloom picks them out.
 *   - Atlas: 48 tokens painted once on a CanvasTexture in the site mono
 *     (JetBrains Mono via `--font-jbm`), see ./telemetryTokens.ts.
 *
 * COST (Adreno-class budget ≤ 5 ms): shaded area ≈ (14 × 0.042 + 9 × 0.067)
 * × 0.9 ≈ 1.07 screens; ≈ 50 % of those fragments leave at the first cheap
 * discard (stream gap / fade), ≈ 30 % of the rest at the glyph-band discard,
 * so ≈ 0.35 screen-fulls reach the 2 uint hashes + ONE plain texture sample.
 * Two draw calls, no per-frame allocation, no React state in useFrame.
 *
 * PLACEMENT CONTRACT (mirrors FounderPortraitMorph, the section's island):
 *   - Renders ONLY while foundersMorphStore.pinned (desktop sticky morph mode
 *     is live) AND webgpuEnabled() AND backendOf(gl) === "webgpu".
 *   - The frame is `[data-founders-morph-sticky]` (h-screen sticky). Its rect
 *     is measured ONLY on `measureVersion` bumps (+ resize), never per frame,
 *     cached as { baseVpX, w, h } (offsetY is 0: the sticky IS the frame).
 *   - Per frame (refs + getState() only): stickyVpTop = clamp(scrollY, secTop,
 *     secTop + travel) − scrollY; the group is placed camera-locked at
 *     ((cx − vw/2)·k, (ih/2 − cy)·k, −CAMERA_Z) rotated by camera.quaternion
 *     and offset from camera.position, k = WORLD_VIEW_HEIGHT / size.height,
 *     with group.quaternion = camera.quaternion. The plane uniform is the
 *     frame rect in world units (viewport w × h at CAMERA_Z).
 *   - Culled (group.visible=false, uFade=0) when the frame is more than
 *     CULL_PAD px off-screen; fades in on store.reveal with the same 0.28·ih
 *     edge ramp (damp 8) as the morph.
 *   - renderOrder −1: draws BEFORE the morph so the face's normal-blended
 *     particles paint over the rain.
 *   - MUST be mounted AFTER SignatureLine (the single camera authority) in
 *     Scene.tsx, next to the FounderPortraitMorph mount.
 *
 * KNOBS (dev, `window.__sersanTeamTelemetry`, alias `__sersanTeamGlyphs`):
 *   setIntensity(v)   normal-token brightness (default 0.16; keep ≪ 0.8)
 *   setAccentHdr(v)   accent-token brightness (default 0.9; > 0.8 blooms)
 *   setSpeed(v)       global scroll-speed multiplier (default 0.7)
 *   setDensity(v)     0..1 fraction of column CAPACITY drawn — sets
 *                     instanceCount per layer (default 0.75 ≈ 23 columns)
 *   setRare(v)        accent-token probability per cell (default 0.03)
 *   setSwitchRate(v)  token swaps per second per cell (default 0.18)
 *   setColumnWidth(v) column width, fraction of frame width (default 0.042)
 *   setFlipY(b)       flip the in-cell v (verified: false is correct)
 *   getState()        snapshot of every uniform + per-layer capacity / drawn
 *
 * ISLAND RULE: lazy `three/webgpu` + `three/tsl` via dynamic import; no React
 * state in useFrame; no per-frame allocation; uniforms only; frustumCulled off;
 * dispose on cleanup. Files owned: src/webgl/team/* only.
 */
import { useEffect, useRef, useState, type JSX } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CAMERA_Z, WORLD_VIEW_HEIGHT } from "../constants";
import { webgpuEnabled, backendOf } from "../renderer/createRenderer";
import { useFoundersMorphStore } from "../store/foundersMorphStore";
import type { TelemetryRainBuild } from "./telemetryRainNodeMaterial";

/** Off-screen cull margin (CSS px) — same as FounderPortraitMorph. */
const CULL_PAD = 120;

/** Layer authoring (near, far): on-screen scale and brightness. */
const LAYER_SCALE = [1.0, 1.6] as const;
const LAYER_BRIGHT = [1.0, 0.4] as const;

/** Base column width (fraction of frame width at layer scale 1) — ≈ 60 px at
 * 1440, which puts the near-layer token line at ≈ 15 px (legible mono). */
const COLUMN_WIDTH_FRAC = 0.042;
/** Slot pitch as a multiple of the column width (gap between neighbours). */
const SLOT_PITCH = 1.2;
/** Slot jitter (± fraction of the pitch) — small enough that same-layer
 * neighbours never overlap (pitch − 1 = 0.2 colW of gap > 2 × 0.08 pitch). */
const SLOT_JITTER = 0.08;
/** Default fraction of the column capacity drawn (≈ 23 of 31 at 0.042). */
const DEFAULT_DENSITY = 0.75;

/** Gaussian dip behind the head: centre 34 % of the width, σ 0.18, depth 0.6. */
const DIP_X = 0.34;
const DIP_SIGMA = 0.18;
const DIP_DEPTH = 0.6;
const dipWeight = (x: number): number =>
  1 - DIP_DEPTH * Math.exp(-0.5 * ((x - DIP_X) / DIP_SIGMA) ** 2);
/** Priority exponent on the dip: 1.5 keeps the head clear at the default
 * density while a density of 1 still fills every slot. */
const DIP_PRIORITY_POW = 1.5;

/** Column scroll speed range (cells / s) and breath period range (s). */
const SPEED_MIN = 1.5;
const SPEED_MAX = 5.0;
const BREATH_PERIOD_MIN = 18;
const BREATH_PERIOD_MAX = 40;

/** Deterministic seed → identical column layout on every rebuild. */
const LAYOUT_SEED = 0x5e75a1;
/** uTime wrap (s) — keeps cellY within float precision; one-off re-hash. */
const TIME_WRAP = 7200;

const QUAD_CORNERS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

/** mulberry32 — tiny seeded PRNG for the deterministic column layout. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface LayerGeometry {
  geometry: THREE.InstancedBufferGeometry;
  /** Total slots built (instanceCount ≤ capacity). */
  capacity: number;
}

interface ColumnSlot {
  x: number;
  priority: number;
  rand: [number, number, number, number];
  speed: number;
  phase: number;
  omega: number;
}

/**
 * Build ONE layer's column geometry: every slot of the jittered grid, ordered
 * by dip-weighted priority (head-region columns last) so a prefix of length
 * `instanceCount` is always the best subset. Pure CPU, once per mount.
 */
function buildLayerGeometry(rnd: () => number, L: number): LayerGeometry {
  const scale = LAYER_SCALE[L];
  const bright = LAYER_BRIGHT[L];
  const pitch = COLUMN_WIDTH_FRAC * scale * SLOT_PITCH;
  const slots = Math.max(1, Math.floor(1 / pitch));

  const list: ColumnSlot[] = [];
  for (let j = 0; j < slots; j++) {
    const x = (j + 0.5 + (rnd() * 2 - 1) * SLOT_JITTER) / slots;
    const priority = rnd() * dipWeight(x) ** DIP_PRIORITY_POW;
    list.push({
      x,
      priority,
      rand: [rnd(), rnd(), rnd(), rnd()],
      speed: SPEED_MIN + rnd() * (SPEED_MAX - SPEED_MIN),
      phase: rnd() * Math.PI * 2,
      omega:
        (Math.PI * 2) /
        (BREATH_PERIOD_MIN + rnd() * (BREATH_PERIOD_MAX - BREATH_PERIOD_MIN)),
    });
  }
  list.sort((a, b) => b.priority - a.priority);

  const n = list.length;
  const place = new Float32Array(n * 4);
  const rand = new Float32Array(n * 4);
  const meta = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const s = list[i];
    // aPlace = (x, layer scale, layer brightness × softened dip, spare)
    place[i * 4] = s.x;
    place[i * 4 + 1] = scale;
    place[i * 4 + 2] = bright * (0.55 + 0.45 * dipWeight(s.x));
    place[i * 4 + 3] = 0;
    rand[i * 4] = s.rand[0];
    rand[i * 4 + 1] = s.rand[1];
    rand[i * 4 + 2] = s.rand[2];
    rand[i * 4 + 3] = s.rand[3];
    // aMeta = (spare, speed cells/s, breath phase, breath ω)
    meta[i * 4] = L;
    meta[i * 4 + 1] = s.speed;
    meta[i * 4 + 2] = s.phase;
    meta[i * 4 + 3] = s.omega;
  }

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(QUAD_CORNERS, 3));
  geometry.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
  geometry.setAttribute("aPlace", new THREE.InstancedBufferAttribute(place, 4));
  geometry.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 4));
  geometry.setAttribute("aMeta", new THREE.InstancedBufferAttribute(meta, 4));
  geometry.instanceCount = n;
  return { geometry, capacity: n };
}

function buildLayers(): LayerGeometry[] {
  const rnd = mulberry32(LAYOUT_SEED);
  return LAYER_SCALE.map((_, L) => buildLayerGeometry(rnd, L));
}

/** density → per-layer instanceCount (the ONLY density mechanism). */
function applyDensity(layers: LayerGeometry[], density: number): void {
  const d = THREE.MathUtils.clamp(density, 0, 1);
  for (const layer of layers) {
    layer.geometry.instanceCount = Math.max(
      0,
      Math.min(layer.capacity, Math.round(d * layer.capacity)),
    );
  }
}

interface FrameRect {
  /** Sticky frame viewport left (CSS px) at measure time. */
  baseVpX: number;
  w: number;
  h: number;
}

const scratch = new THREE.Vector3();

export function TeamGlyphRain(): JSX.Element | null {
  const { camera, size, gl } = useThree();

  // Rare-change reactive reads only (island rule): pinned gates the render,
  // measureVersion re-measures the frame rect.
  const pinned = useFoundersMorphStore((s) => s.pinned);
  const measureVersion = useFoundersMorphStore((s) => s.measureVersion);

  const [build, setBuild] = useState<TelemetryRainBuild | null>(null);
  const buildRef = useRef<TelemetryRainBuild | null>(null);
  const layersRef = useRef<LayerGeometry[] | null>(null);
  const densityRef = useRef(DEFAULT_DENSITY);
  const groupRef = useRef<THREE.Group>(null);
  const rectRef = useRef<FrameRect | null>(null);
  const timeRef = useRef(0);
  const fadeRef = useRef(0);

  const isWebGPU = webgpuEnabled() && backendOf(gl) === "webgpu";

  // --- Lazy build: atlas + TSL material (WebGPU path only) ------------------
  useEffect(() => {
    if (!isWebGPU || !pinned) return;
    let cancelled = false;
    let built: TelemetryRainBuild | null = null;
    void (async () => {
      const [{ paintTelemetryAtlas }, { createTelemetryRainNodeMaterial }] =
        await Promise.all([
          import("./telemetryTokens"),
          // Dynamic → the three/webgpu + three/tsl chunk stays lazy.
          import("./telemetryRainNodeMaterial"),
        ]);
      if (cancelled) return;
      const atlas = await paintTelemetryAtlas();
      if (cancelled || !atlas) return;
      built = createTelemetryRainNodeMaterial({
        atlasCanvas: atlas.canvas,
        accentStart: atlas.accentStart,
        accentCount: atlas.accentCount,
      });
      if (!layersRef.current) {
        layersRef.current = buildLayers();
        applyDensity(layersRef.current, densityRef.current);
      }
      buildRef.current = built;
      setBuild(built);
    })();
    return () => {
      cancelled = true;
      built?.dispose();
      buildRef.current = null;
      setBuild(null);
    };
  }, [isWebGPU, pinned]);

  // Geometry lives for the island's life (deterministic layout, built once).
  useEffect(
    () => () => {
      layersRef.current?.forEach((l) => l.geometry.dispose());
      layersRef.current = null;
    },
    [],
  );

  // --- Measure the sticky frame on measureVersion bumps (+ resize) ----------
  useEffect(() => {
    if (!pinned) {
      rectRef.current = null;
      return;
    }
    const sticky = document.querySelector<HTMLElement>(
      "[data-founders-morph-sticky]",
    );
    if (!sticky) {
      rectRef.current = null;
      return;
    }
    const r = sticky.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      rectRef.current = null;
      return;
    }
    rectRef.current = { baseVpX: r.left, w: r.width, h: r.height };
    const k = WORLD_VIEW_HEIGHT / size.height;
    buildRef.current?.uniforms.uPlane.value.set(r.width * k, r.height * k);
  }, [pinned, measureVersion, size.width, size.height, build]);

  // --- Dev handle ----------------------------------------------------------
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !build) return;
    const u = build.uniforms;
    const handle = {
      setIntensity: (v: number) => (u.uIntensity.value = v),
      setAccentHdr: (v: number) => (u.uAccentHdr.value = v),
      setSpeed: (v: number) => (u.uSpeed.value = v),
      setDensity: (v: number) => {
        densityRef.current = THREE.MathUtils.clamp(v, 0, 1);
        if (layersRef.current) applyDensity(layersRef.current, densityRef.current);
        return densityRef.current;
      },
      setRare: (v: number) => (u.uRare.value = THREE.MathUtils.clamp(v, 0, 1)),
      setSwitchRate: (v: number) => (u.uSwitchRate.value = v),
      setColumnWidth: (v: number) => (u.uColW.value = v),
      setFlipY: (b: boolean) => (u.uVFlip.value = b ? 1 : 0),
      getState: () => ({
        intensity: u.uIntensity.value,
        accentHdr: u.uAccentHdr.value,
        speed: u.uSpeed.value,
        density: densityRef.current,
        rare: u.uRare.value,
        switchRate: u.uSwitchRate.value,
        columnWidth: u.uColW.value,
        flipY: u.uVFlip.value === 1,
        fade: u.uFade.value,
        time: u.uTime.value,
        plane: [u.uPlane.value.x, u.uPlane.value.y] as [number, number],
        layers: (layersRef.current ?? []).map((l, i) => ({
          scale: LAYER_SCALE[i],
          bright: LAYER_BRIGHT[i],
          capacity: l.capacity,
          drawn: l.geometry.instanceCount,
        })),
        columns: (layersRef.current ?? []).reduce(
          (n, l) => n + l.geometry.instanceCount,
          0,
        ),
        rect: rectRef.current,
        accentStart: u.uAccentStart.value,
        accentCount: u.uAccentCount.value,
      }),
    };
    const w = window as unknown as Record<string, unknown>;
    w.__sersanTeamTelemetry = handle;
    w.__sersanTeamGlyphs = handle;
    return () => {
      if (w.__sersanTeamTelemetry === handle) delete w.__sersanTeamTelemetry;
      if (w.__sersanTeamGlyphs === handle) delete w.__sersanTeamGlyphs;
    };
  }, [build]);

  // --- Frame: camera-locked placement, cull, fade, clock --------------------
  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const b = buildRef.current;
    const rect = rectRef.current;
    const store = useFoundersMorphStore.getState();
    if (!b || !rect || !store.pinned) {
      group.visible = false;
      return;
    }
    const delta = Math.min(rawDelta, 1 / 30);
    const ih = size.height;
    const vw = size.width;
    const k = WORLD_VIEW_HEIGHT / ih;
    const scrollY = window.scrollY;

    // Sticky-frame viewport top (0 while pinned, negative as it releases).
    const clampedTop = Math.min(
      Math.max(scrollY, store.secTop),
      store.secTop + store.travel,
    );
    const vpY = clampedTop - scrollY;

    if (vpY + rect.h < -CULL_PAD || vpY > ih + CULL_PAD) {
      group.visible = false;
      fadeRef.current = 0;
      b.uniforms.uFade.value = 0;
      return;
    }
    group.visible = true;

    // Clock (wrapped — see TIME_WRAP).
    timeRef.current += delta;
    if (timeRef.current > TIME_WRAP) timeRef.current -= TIME_WRAP;
    b.uniforms.uTime.value = timeRef.current;

    // In-view fade (edge ramp) gated on the section's reveal edge.
    const ramp = ih * 0.28;
    const edge = Math.min(1, (ih - vpY) / ramp, (vpY + rect.h) / ramp);
    fadeRef.current = THREE.MathUtils.damp(
      fadeRef.current,
      store.reveal >= 1 ? THREE.MathUtils.clamp(edge, 0, 1) : 0,
      8,
      delta,
    );
    b.uniforms.uFade.value = fadeRef.current;

    // Camera-locked placement over the frame centre.
    const cx = rect.baseVpX + rect.w / 2;
    const cy = vpY + rect.h / 2;
    scratch
      .set((cx - vw / 2) * k, (ih / 2 - cy) * k, -CAMERA_Z)
      .applyQuaternion(camera.quaternion)
      .add(camera.position);
    group.position.copy(scratch);
    group.quaternion.copy(camera.quaternion);
  });

  const layers = layersRef.current;
  if (!isWebGPU || !pinned || !build || !layers) return null;

  // One mesh (= one draw call) per layer, sharing the material; the geometry's
  // own instanceCount (set by applyDensity) drives each instanced draw.
  return (
    <group ref={groupRef} visible={false}>
      {layers.map((layer, i) => (
        <mesh
          key={i}
          geometry={layer.geometry}
          material={build.material as unknown as THREE.Material}
          frustumCulled={false}
          renderOrder={-1}
        />
      ))}
    </group>
  );
}

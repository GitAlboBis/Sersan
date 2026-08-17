/**
 * Perf-HUD sample store (mobile-parity plan Phase 6.1 — the `?perf=1` HUD).
 *
 * A tiny TRANSIENT bridge between the in-Canvas `PerfProbe` (src/webgl/
 * PerfProbe.tsx) and the DOM overlay `PerfHud` (src/components/fx/
 * perf-hud.tsx), which live in separate React trees (the Canvas is
 * dynamic/ssr:false inside CanvasHost).
 *
 * WRITE CONTRACT: `PerfProbe` writes ONE `set(partial)` at most every 250 ms
 * (4×/s) — never per frame. The probe accumulates its frame-time EMA and the
 * 5 s window in refs and only publishes on the sampling tick, so subscribers
 * (the HUD's React state) re-render at most 4×/s. Nothing else writes here.
 *
 * READ CONTRACT: `PerfHud` subscribes with a plain hook (React re-render 4×/s
 * is fine — it is a debug overlay that only mounts on `?perf=1`). Nothing in a
 * hot path (useFrame) reads this store.
 *
 * Both endpoints are gated by `tierStore.perfHud`; with the flag off this
 * module is imported (it is tiny) but never written or subscribed to.
 */
import { create } from "zustand";

export interface PerfSample {
  /** 1000 / `frameMs` — smoothed instantaneous fps from the probe's own EMA. */
  fps: number;
  /** EMA of R3F's per-frame `delta` (ms) — the probe's own measurement, NOT
   *  drei PerformanceMonitor's (whose callbacks are silent inside the band). */
  frameMs: number;
  /** Mean frame time (ms) over the last 5 s of samples (20 × 250 ms windows,
   *  each window = elapsed / frames rendered in it) — the plan's "media su 5 s"
   *  gate reading. NaN until the first window closes. */
  frameMs5s: number;
  /** Renderer pixel ratio at sample time (`gl.getPixelRatio()`). */
  dpr: number;
  /** Draw calls in the LAST COMPLETE FRAME (WebGPU `info.render.drawCalls`,
   *  classic WebGL `info.render.calls`) — see PerfProbe for how autoReset is
   *  handled so this is a whole-frame figure on both backends. */
  drawCalls: number;
  /** Triangles in the last complete frame (`info.render.triangles`). */
  triangles: number;
  /** `info.memory.texturesSize` in MB (three/webgpu common `Info` only);
   *  null on the classic WebGLRenderer, whose `WebGLInfo.memory` has no size. */
  texturesMB: number | null;
  /** Resolved runtime backend (`tierStore.backend`), "" until known. */
  backend: string;
  /** Renderer/GPU string read ONCE on probe mount (UNMASKED_RENDERER on a
   *  WebGL context, `adapterInfo.description|architecture|vendor` on a WebGPU
   *  device, "webgpu"/"" when hidden or unreachable). */
  renderer: string;
  /** `performance.now()` of the last write. */
  sampledAt: number;
}

interface PerfState extends PerfSample {
  set: (partial: Partial<PerfSample>) => void;
}

export const usePerfStore = create<PerfState>((set) => ({
  fps: 0,
  frameMs: 0,
  frameMs5s: Number.NaN,
  dpr: 0,
  drawCalls: 0,
  triangles: 0,
  texturesMB: null,
  backend: "",
  renderer: "",
  sampledAt: 0,
  set: (partial) => set(partial),
}));

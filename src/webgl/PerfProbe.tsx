"use client";

/**
 * PerfProbe — the in-Canvas half of the `?perf=1` HUD (mobile-parity plan
 * Phase 6.1). Mounted by Scene.tsx ONLY when `tierStore.perfHud` is true (dev
 * / Vercel preview + `?perf=1`); with the flag off it is not in the tree, so
 * production and the desktop render path carry no useFrame, no after-effect,
 * no store write from this file — zero cost.
 *
 * WHAT IT MEASURES (its own numbers, not PerformanceMonitor's)
 * ------------------------------------------------------------
 * • fps / frame ms — an EMA of R3F's per-frame `delta` from a priority-0
 *   `useFrame`. drei's PerformanceMonitor only speaks on incline/decline and is
 *   silent inside its [48,58] band, so it cannot feed a readout.
 * • frameMs5s — the plan's "media su 5 s": each 250 ms sampling window keeps
 *   `elapsed / frames`, and the HUD figure is the mean of the last 20 windows.
 * • dpr — `gl.getPixelRatio()` (what the renderer really renders at; the
 *   value AdaptiveResolution's `setDpr` lands on).
 * • per-frame draw calls / triangles / texture MB — from `renderer.info`.
 * • renderer string — read ONCE on mount (see `readRendererString`).
 *
 * WHY THE useFrame IS PRIORITY 0 (NOT "2, after PostFXNodes")
 * ----------------------------------------------------------
 * R3F renders the scene itself only while `state.internal.priority === 0`;
 * registering ANY positive-priority `useFrame` flips that counter and
 * SUPPRESSES the default render (fiber `update()`: `if (!state.internal.priority
 * && state.gl.render) state.gl.render(...)` — see PostFXNodes' header, which
 * relies on exactly this to own the render). A priority-2 probe on the classic
 * WebGL path with `postFx "off"` (level 1 or `?postfx=off`) would therefore be
 * the ONLY positive subscriber and blank the canvas. Priority 0 never touches
 * `internal.priority`, so mounting the probe changes nothing about who renders.
 *
 * WHY `renderer.info` IS SAMPLED IN AN R3F AFTER-EFFECT, WITH autoReset OFF
 * ---------------------------------------------------------------------
 * `renderer.info` differs per build (PHASE0_TIERING_APIS §4.2/4.3): classic
 * `WebGLInfo.render {calls, triangles, …}` vs three/webgpu common `Info.render
 * {calls (cumulative), frameCalls, drawCalls, triangles, …}` + `memory
 * .texturesSize`. Both auto-reset — but at DIFFERENT moments, neither of which
 * is "once per R3F frame":
 *   • WebGLRenderer resets at the START of EVERY `render()` call
 *     (WebGLRenderer.js:1704). With the postprocessing EffectComposer each
 *     pass is its own `render()`, so a frame-start read would show only the
 *     LAST pass (1 quad), never the scene.
 *   • three/webgpu resets in ITS OWN internal `Animation` rAF
 *     (common/Animation.js:75), started by `init()` and independent of R3F's
 *     loop — a read from a useFrame lands after that reset and before R3F's
 *     render, i.e. reads 0.
 * So while mounted the probe sets `info.autoReset = false` (public API on both:
 * WebGLInfo.d.ts / common/Info.d.ts) and does the reset ITSELF at the very end
 * of each R3F frame, from `addAfterEffect` (fiber runs after-effects once all
 * roots have finished `update()`, i.e. after every priority-0 hook, the
 * priority-1 PostFX render, and R3F's default render). Reading right before
 * that reset therefore yields the WHOLE frame's counts on both backends,
 * whichever hook order the islands mounted in. `autoReset` is restored to true
 * on unmount. `info.reset()` clears only the per-frame counters (calls/
 * triangles/… — the cumulative `calls` and `memory` are untouched), so nothing
 * observable changes for the renderer.
 *
 * STORE WRITES: exactly one `usePerfStore.set()` per 250 ms window (4×/s), from
 * the after-effect. Never per frame.
 */
import { useEffect, useRef } from "react";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { usePerfStore } from "./store/perfStore";
import { useTierStore } from "./store/tierStore";

/** Sampling period — one store write per window (the plan's "at most 4×/s"). */
const SAMPLE_MS = 250;
/** Windows kept for the rolling 5 s mean (20 × 250 ms). */
const WINDOWS_5S = 20;
/** Per-frame EMA weight for `frameMs` (≈ 10-frame smoothing). */
const EMA_ALPHA = 0.1;
/** A tab-background / compile-stall delta above this is ignored by the EMA
 *  (it would poison the smoothed figure for seconds); the 5 s window still
 *  counts the frame truthfully. */
const MAX_DELTA_S = 1;
/** Renderer string is truncated for the store; the HUD truncates further. */
const RENDERER_MAX = 120;

/**
 * Structural view of `renderer.info` covering BOTH builds. Every field is
 * optional: the classic WebGLInfo has no `drawCalls`/`frameCalls`/
 * `texturesSize`, the common Info has all of them. No `three/webgpu` type is
 * imported (this file must stay inert on the flag-OFF bundle).
 */
interface RendererInfoLike {
  autoReset?: boolean;
  reset?: () => void;
  render?: {
    calls?: number;
    frameCalls?: number;
    drawCalls?: number;
    triangles?: number;
  };
  memory?: {
    texturesSize?: number;
  };
}

/** Structural view of the bits of a renderer the probe touches. */
interface RendererLike {
  info?: RendererInfoLike;
  getContext?: () => unknown;
  getPixelRatio?: () => number;
  backend?: {
    // r184's WebGPUBackend keeps only `device` (WebGPUBackend.js:254; the
    // adapter is a local in init()). `adapter` is tried first anyway, guarded,
    // in case a future three stores it — nothing here is a hard dependency.
    adapter?: { info?: AdapterInfoLike };
    device?: { adapterInfo?: AdapterInfoLike };
  };
}

interface AdapterInfoLike {
  description?: string;
  architecture?: string;
  vendor?: string;
  device?: string;
}

function isWebGLContextLike(
  ctx: unknown,
): ctx is { getExtension: (n: string) => unknown; getParameter: (p: number) => unknown } {
  return (
    !!ctx &&
    typeof (ctx as { getExtension?: unknown }).getExtension === "function" &&
    typeof (ctx as { getParameter?: unknown }).getParameter === "function"
  );
}

/**
 * GPU/renderer string, best effort, read once:
 *   1. any WebGL context (classic WebGLRenderer, or three/webgpu's WebGL2
 *      fallback backend — both expose it via `getContext()`):
 *      `WEBGL_debug_renderer_info` → UNMASKED_RENDERER_WEBGL (Safari hides
 *      the extension → falls through).
 *   2. a WebGPU device: `GPUDevice.adapterInfo` (WebGPU spec; Chrome ≥ 127)
 *      → description | architecture | vendor — typed locally, all guarded.
 *   3. otherwise `fallback` ("webgpu" when the backend is WebGPU, "" else).
 */
function readRendererString(gl: RendererLike, fallback: string): string {
  try {
    const ctx = typeof gl.getContext === "function" ? gl.getContext() : null;
    if (isWebGLContextLike(ctx)) {
      const dbg = ctx.getExtension("WEBGL_debug_renderer_info") as
        | { UNMASKED_RENDERER_WEBGL: number }
        | null;
      if (dbg) {
        const r = ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        if (typeof r === "string" && r.length > 0) return r.slice(0, RENDERER_MAX);
      }
    }
  } catch {
    // Lost context / hardened browser — fall through.
  }
  try {
    const info =
      gl.backend?.adapter?.info ?? gl.backend?.device?.adapterInfo ?? null;
    if (info) {
      const s = info.description || info.architecture || info.vendor || "";
      if (typeof s === "string" && s.length > 0) return s.slice(0, RENDERER_MAX);
    }
  } catch {
    // Same — never let the probe throw.
  }
  return fallback;
}

export function PerfProbe() {
  const gl = useThree((s) => s.gl);

  // Frame-time EMA (ms) + the current 250 ms window's frame count / start.
  const emaMs = useRef(0);
  const winFrames = useRef(0);
  const winStart = useRef(0);
  // Ring of the last WINDOWS_5S window means (ms), for the 5 s figure.
  const ring = useRef<number[]>([]);
  // Read once on mount (renderer string), re-read never.
  const rendererStr = useRef("");

  // Priority-0 useFrame: measurement only (no render, no store write). See the
  // header for why this MUST stay at priority 0.
  useFrame((_, delta) => {
    if (winStart.current === 0) winStart.current = performance.now();
    winFrames.current += 1;
    if (delta > 0 && delta <= MAX_DELTA_S) {
      const ms = delta * 1000;
      emaMs.current =
        emaMs.current === 0 ? ms : emaMs.current + EMA_ALPHA * (ms - emaMs.current);
    }
  });

  useEffect(() => {
    const r = gl as unknown as RendererLike;
    const info = r.info;
    // Read once. The "webgpu" fallback label is applied at write time (below),
    // when `tierStore.backend` is guaranteed published.
    rendererStr.current = readRendererString(r, "");

    // Own the per-frame reset while mounted (see header). Remember the previous
    // value so unmount restores exactly what the renderer had.
    const prevAutoReset = info?.autoReset;
    if (info && typeof info.autoReset === "boolean") info.autoReset = false;

    // Reset window bookkeeping on (re)mount so an HMR remount does not publish
    // a stale window.
    winStart.current = 0;
    winFrames.current = 0;
    ring.current = [];

    const off = addAfterEffect(() => {
      // Runs once per R3F frame, after every hook and after the frame's
      // render(s). Read → (maybe publish) → reset.
      const now = performance.now();
      const start = winStart.current;
      if (start !== 0 && now - start >= SAMPLE_MS) {
        const frames = winFrames.current;
        const elapsed = now - start;
        const windowMs = frames > 0 ? elapsed / frames : Number.NaN;
        const rg = ring.current;
        if (Number.isFinite(windowMs)) {
          rg.push(windowMs);
          if (rg.length > WINDOWS_5S) rg.splice(0, rg.length - WINDOWS_5S);
        }
        const frameMs5s =
          rg.length > 0 ? rg.reduce((a, b) => a + b, 0) / rg.length : Number.NaN;

        const render = info?.render;
        // three/webgpu common Info: `drawCalls` (per frame); classic WebGLInfo:
        // `calls` (per render() call — whole frame here thanks to our reset).
        // NEVER the common build's `render.calls`: that one is cumulative.
        const drawCalls =
          typeof render?.drawCalls === "number"
            ? render.drawCalls
            : typeof render?.frameCalls === "number"
              ? render.frameCalls
              : (render?.calls ?? 0);
        const triangles = render?.triangles ?? 0;
        const texBytes = info?.memory?.texturesSize;
        const texturesMB =
          typeof texBytes === "number" ? texBytes / (1024 * 1024) : null;
        const dpr =
          typeof r.getPixelRatio === "function" ? r.getPixelRatio() : 0;
        const frameMs = emaMs.current;
        const backend = useTierStore.getState().backend ?? "";

        // THE one store write per window (4×/s).
        usePerfStore.getState().set({
          fps: frameMs > 0 ? 1000 / frameMs : 0,
          frameMs,
          frameMs5s,
          dpr,
          drawCalls,
          triangles,
          texturesMB,
          backend,
          // Hidden/unreachable renderer string → the backend name at least.
          renderer: rendererStr.current || (backend === "webgpu" ? "webgpu" : ""),
          sampledAt: now,
        });

        winStart.current = now;
        winFrames.current = 0;
      }
      // End-of-frame reset so the NEXT frame's counters start from zero on
      // both backends regardless of hook order (see header).
      if (info && typeof info.reset === "function") info.reset();
    });

    return () => {
      off();
      if (info && typeof prevAutoReset === "boolean") info.autoReset = prevAutoReset;
    };
  }, [gl]);

  return null;
}

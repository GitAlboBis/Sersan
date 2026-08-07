/**
 * Device/performance tier for the WebGL layer.
 *
 * Resolved once on the client (CanvasHost effect) so SSR markup never
 * depends on it; downgradable at runtime by drei's PerformanceMonitor
 * when sustained fps dips are detected.
 *
 *   full — desktop, capable GPU: tube line + postprocessing + extras
 *   lite — mobile / weak GPU: simplified line, no postprocessing
 *   off  — prefers-reduced-motion or no WebGL: no canvas at all
 */
import { create } from "zustand";
import type { Backend } from "../renderer/createRenderer";

export type SceneTier = "full" | "lite" | "off";

interface TierState {
  tier: SceneTier;
  resolved: boolean;
  /**
   * The RESOLVED runtime render backend, written once from Scene.tsx's
   * `onCreated` (via `backendOf(gl)`). `null` until the renderer exists.
   *
   * `webgpuEnabled()` is only a BUILD-TIME env read: with the flag on, a
   * browser without WebGPU (Safari, Firefox default, blocklisted Chrome) still
   * resolves to the WebGL2 fallback backend at runtime. DOM features that
   * require a true compute backend to be driveable must gate on THIS, not on
   * the flag — otherwise they render a layout their island can never animate
   * (the founders morph left founder B permanently at opacity 0).
   *
   * Consumers must treat `null` as "not webgpu" so first paint never shows a
   * layout that may turn out to be undriveable.
   */
  backend: Backend | null;
  /**
   * GPU-aware render device-pixel-ratio range, resolved on the client. The
   * EFFECTS are identical at any DPR — only the render resolution differs — so
   * this lets the FULL WebGPU scene run on weak/ARM GPUs (which are fill-bound:
   * cost scales with DPR²) by starting them at a low DPR and adapting, while
   * strong desktops stay at their device DPR. `initial` is the Canvas's starting
   * dpr; AdaptiveResolution steps within [min, max] on fps dips/headroom.
   */
  dprInitial: number;
  dprMin: number;
  dprMax: number;
  /**
   * Temporary hard cap layered over the adaptive DPR range (null = no cap).
   * Written by the home singularity passage while the plunge approaches
   * fullscreen raymarch coverage (p > ~0.70 → 1.5, cleared with hysteresis
   * on the way out) — the mandated close-range fill-rate lever. Consumed by
   * AdaptiveResolution as `min(dprMax, dprCap)`; a set cap that is below the
   * current DPR drops it immediately (drops are always allowed), and clearing
   * it lets the monitor climb back under its normal hysteresis.
   */
  dprCap: number | null;
  /** True once the WebGL hero (the procedural Saturn) has rendered its first
   *  frame. Gates the hero drag-to-rotate capture layer so dragging only
   *  arms once the planet is live. */
  heroReady: boolean;
  resolve: () => void;
  degrade: () => void;
  setHeroReady: (ready: boolean) => void;
  setBackend: (backend: Backend) => void;
  setDprCap: (cap: number | null) => void;
}

function detectTier(): SceneTier {
  if (typeof window === "undefined") return "off";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return "off";
  } catch {
    return "off";
  }
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || window.innerWidth < 768) return "lite";
  return "full";
}

type GpuClass = "weak" | "mid" | "strong";

/**
 * Rough GPU strength from the WebGL UNMASKED_RENDERER string. Heuristic, not a
 * contract (the string is non-standard + may be hidden), so it only picks the
 * STARTING render resolution — AdaptiveResolution then climbs/drops from there.
 *   weak   — mobile/ARM tile GPUs (incl. Snapdragon/Adreno on Windows-ARM): very
 *            fill-bound, must start low.
 *   mid    — desktop integrated (Intel UHD/Iris).
 *   strong — discrete / Apple Silicon / unknown-but-capable: unchanged behaviour.
 */
function detectGpuClass(): GpuClass {
  if (typeof window === "undefined") return "strong";
  try {
    const probe = document.createElement("canvas");
    const gl = (probe.getContext("webgl2") ??
      probe.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "mid";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/adreno|mali|powervr|qualcomm/i.test(r)) return "weak";
    if (/intel|\bUHD\b|Iris/i.test(r)) return "mid";
    return "strong";
  } catch {
    return "mid";
  }
}

/**
 * GPU-aware DPR range, clamped to the device dpr (never supersample beyond it).
 * Weak/ARM starts at 1.0 (≈4× fewer pixels than dpr 2 on a hi-DPI screen) and
 * may climb to 1.5; strong desktops are unchanged (start at their device dpr).
 */
function detectDprRange(): { initial: number; min: number; max: number } {
  if (typeof window === "undefined") return { initial: 2, min: 1, max: 2 };
  const device = Math.min(window.devicePixelRatio || 1, 2);
  const clamp = (n: number) => Math.min(device, n);
  switch (detectGpuClass()) {
    case "weak":
      return { initial: clamp(1.0), min: clamp(1.0), max: clamp(1.5) };
    case "mid":
      return { initial: clamp(1.25), min: clamp(1.0), max: clamp(1.75) };
    default:
      return { initial: clamp(2.0), min: clamp(1.0), max: clamp(2.0) };
  }
}

export const useTierStore = create<TierState>((set, get) => ({
  tier: "off",
  resolved: false,
  backend: null,
  dprInitial: 2,
  dprMin: 1,
  dprMax: 2,
  dprCap: null,
  heroReady: false,
  resolve: () => {
    const dpr = detectDprRange();
    set({
      tier: detectTier(),
      resolved: true,
      dprInitial: dpr.initial,
      dprMin: dpr.min,
      dprMax: dpr.max,
    });
  },
  degrade: () => {
    const { tier } = get();
    if (tier === "full") set({ tier: "lite", heroReady: false });
    else if (tier === "lite") set({ tier: "off", heroReady: false });
  },
  setHeroReady: (heroReady) => set({ heroReady }),
  // One-shot, written from Scene.tsx `onCreated`. Guarded so a repeat write
  // (e.g. a Canvas remount onto the same backend) is a no-op and never
  // re-renders subscribers.
  setBackend: (backend) => {
    if (get().backend !== backend) set({ backend });
  },
  // Guarded like setBackend: unchanged writes never re-render subscribers
  // (the passage re-asserts on scrub-band hysteresis edges only, but stay
  // defensive anyway).
  setDprCap: (dprCap) => {
    if (get().dprCap !== dprCap) set({ dprCap });
  },
}));

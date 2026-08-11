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
 *
 * SEMANTIC DEBT, recorded deliberately (MOBILE_HOME_SPEC §4.1b, §7):
 * `tier` now answers exactly ONE question — which DOM LAYOUT to serve. It no
 * longer answers "may a decorative WebGL island mount": since the `phoneGL`
 * axis landed, **`tier === "lite"` NO LONGER IMPLIES "no islands"**. A capable
 * phone is `tier: "lite", phoneGL: true` and mounts NeuralLattice. The full
 * capability-model migration (MOBILE_AUDIT §5) is NOT done — it has 13 `tier`
 * call sites and must be atomic — so the only thing guarding this split is the
 * invariant written on `detectPhoneGL()` below. Read it before adding a gate.
 */
import { create } from "zustand";
import type { Backend } from "../renderer/createRenderer";

export type SceneTier = "full" | "lite" | "off";

interface TierState {
  tier: SceneTier;
  /**
   * MAY a coarse-pointer device mount decorative WebGL islands? Resolved
   * once alongside `tier` (see `detectPhoneGL`), forced back to false by
   * `degrade()`.
   *
   * INVARIANT: `tier` selects the DOM LAYOUT; `phoneGL` selects whether
   * decorative islands may mount. NEVER conflate them. Gates read
   * `tier === "full" || phoneGL` — strictly ADDITIVE, never a redefinition of
   * what `tier === "full"` resolves to. False forever on a fine pointer, so a
   * desktop render path cannot move.
   */
  phoneGL: boolean;
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

/**
 * MAY a coarse-pointer device mount decorative islands?
 *
 * INVARIANT: `tier` selects the DOM LAYOUT; `phoneGL` selects whether
 * decorative islands may mount. NEVER conflate them, and never let phoneGL
 * change what `tier === "full"` resolves to. `detectTier()` above is the choke
 * point for 13 consumers and is deliberately NOT touched.
 *
 * Returns false on a fine pointer BEFORE touching anything, so desktop can
 * never reach the body of this function.
 *
 * It deliberately does NOT consult detectGpuClass(): that regex marks
 * adreno|mali|powervr|qualcomm "weak", i.e. every Android phone that exists,
 * and the coarse branch of detectDprRange() routes every iPhone to the same
 * budget — gating capability on it yields a predicate no real phone satisfies.
 * GPU class is a BUDGET input, not a capability test. What we use instead is a
 * DENY-LIST of pre-2020 tile parts: an unknown 2026 phone must PASS.
 *
 * OPEN QA ITEM (MOBILE_HOME_SPEC §6 Wave 3, chunk M): the `cores <= 4` cut is
 * carried over from SEQ.LITE_MIN_CORES so the codebase holds ONE number. It is
 * not yet reconciled against a real device — log navigator.hardwareConcurrency
 * on every target handset and, if a supported iPhone reports ≤ 4, lower the
 * threshold and record the reading here. Do not guess it in code review.
 */
function detectPhoneGL(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: fine)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) return false; // = SEQ.LITE_MIN_CORES
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return false; // absent on iOS → passes
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/mali-[tg](3|5|7)\d/i.test(r)) return false;
    if (/adreno \(tm\) (4\d\d|5[0-3]\d)\b/i.test(r)) return false;
    if (/powervr (ge|g6)/i.test(r)) return false;
    return true;
  } catch {
    return false;
  }
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
 * Every coarse pointer takes the tile-GPU branch below before the GPU-class
 * switch is consulted at all.
 */
function detectDprRange(): { initial: number; min: number; max: number } {
  if (typeof window === "undefined") return { initial: 2, min: 1, max: 2 };
  const device = Math.min(window.devicePixelRatio || 1, 2);
  const clamp = (n: number) => Math.min(device, n);
  // Coarse pointer ⇒ tile GPU ⇒ fill-bound. detectGpuClass() cannot see this:
  // Safari hides WEBGL_debug_renderer_info (renderer string ""), and an iPhone
  // that exposes it reports "Apple GPU" — neither matches the weak or mid
  // regex, so every iOS device fell through to `strong` and rendered the
  // persistent canvas at 4× the pixel count of an Android, on the architecture
  // where cost scales with DPR².
  // SCOPED TO `(pointer: coarse)` ON PURPOSE: an M-series MacBook reports the
  // SAME string, so adding `apple` to the weak regex would silently halve
  // desktop canvas resolution site-wide. A fine pointer never reaches here.
  if (window.matchMedia("(pointer: coarse)").matches) {
    return { initial: clamp(1.0), min: clamp(1.0), max: clamp(1.5) };
  }
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
  phoneGL: false,
  resolved: false,
  backend: null,
  dprInitial: 2,
  dprMin: 1,
  dprMax: 2,
  dprCap: null,
  heroReady: false,
  resolve: () => {
    const dpr = detectDprRange();
    // tier and phoneGL land in ONE set() so no consumer can ever observe a
    // frame where the layout tier has resolved but the capability axis has not
    // (that half-state would flash the SVG neural fallback under the island).
    set({
      tier: detectTier(),
      phoneGL: detectPhoneGL(),
      resolved: true,
      dprInitial: dpr.initial,
      dprMin: dpr.min,
      dprMax: dpr.max,
    });
  },
  degrade: () => {
    const { tier } = get();
    if (tier === "full") set({ tier: "lite", heroReady: false });
    // lite → off must ALSO drop the capability axis: a degraded phone that
    // kept phoneGL would unmount the canvas and still suppress the DOM SVG
    // fallback (use-neural-lattice-fallback reads `tier === "full" || phoneGL`),
    // leaving the two neural sections with an empty centerpiece.
    else if (tier === "lite")
      set({ tier: "off", phoneGL: false, heroReady: false });
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

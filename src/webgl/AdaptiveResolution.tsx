"use client";

/**
 * AdaptiveResolution — keeps EVERY effect identical and only adapts the render
 * device-pixel-ratio to the machine.
 *
 * The full WebGPU scene is fill-bound: nearly every cost (scenePass, the ~11
 * bloom blur passes, additive particle overdraw) scales with DPR². On a weak/ARM
 * GPU at a hi-DPI resolution (e.g. 2880×1920 @ dpr 2 ≈ 22 Mpx/frame) that is what
 * makes it lag. Lowering the render resolution cuts that cost super-linearly with
 * NO change to the effects — the slight softening lands on already-bloomed,
 * tonemapped output and is largely invisible. Strong desktops start at their
 * device DPR and never drop.
 *
 * drei's PerformanceMonitor watches the frame rate and fires onDecline/onIncline
 * when it sustains below/above the fps band; we step `setDpr` within [min, max].
 * Changes are STEPPED + bounded (not a per-frame multiply) because each setDpr
 * reallocates the WebGPU swapchain + the PostFX render targets — a brief hitch,
 * fine occasionally. Oscillation is bounded by the [min, max] clamp plus the
 * climb-slowly/drop-instantly hysteresis in apply() — deliberately NOT by drei's
 * `flipflops`, which permanently latches the monitor off (see the JSX comment).
 *
 * NOTE: PerformanceMonitor was written for the WebGL path; its fps read is
 * backend-agnostic (it only reads R3F's clock) so it runs under WebGPU too, but
 * if a backend quirk ever stops the callbacks the GPU-aware INITIAL dpr (set on
 * the Canvas from tierStore) still stands as the floor — the scene stays usable.
 */
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";

export function AdaptiveResolution({
  initial,
  min,
  max,
  step = 0.25,
}: {
  initial: number;
  min: number;
  max: number;
  step?: number;
}) {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useRef(initial);
  const lastChange = useRef(0);

  const apply = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(next * 100) / 100));
    if (clamped === dpr.current) return;
    // Asymmetric hysteresis — drop instantly, climb slowly. Each real setDpr
    // reallocates the WebGPU swapchain + the PostFX render targets, so two
    // adjacent steps trading places every evaluation window would hitch
    // continuously. Dropping is always allowed (the visitor is dropping frames
    // NOW); climbing back needs sustained headroom since the last change.
    const now = performance.now();
    if (clamped > dpr.current && now - lastChange.current < 8000) return;
    lastChange.current = now;
    dpr.current = clamped;
    setDpr(clamped);
  };

  return (
    <PerformanceMonitor
      // Target fps band (refresh-rate relative). Below 48 → drop resolution;
      // sustained above 58 → climb back toward the device dpr.
      bounds={() => [48, 58]}
      // NO `flipflops`: drei's counter increments on EVERY onIncline/onDecline —
      // it counts total callback events, not direction changes — and once it
      // exceeds the limit the monitor latches into its fallback state and stops
      // sampling for the rest of the session. Crucially it increments even when
      // apply() is a no-op, so a healthy machine idling at 60fps (which passes
      // the incline test on nearly every ~2.5s window while already pinned at
      // dprMax) latched within ~10-15s of load — permanently disabling the #1
      // lever for the weak/ARM GPUs this exists for. Default is Infinity.
      //
      // Runaway oscillation is already prevented by apply() itself: it clamps to
      // [min, max] and skips setDpr when the value is unchanged, so at either end
      // of the range the callbacks are free no-ops with no swapchain realloc.
      // Genuine mid-range hunting is bounded by the asymmetric hysteresis in
      // apply() (drop instantly, climb only after sustained headroom).
      onDecline={() => apply(dpr.current - step)}
      onIncline={() => apply(dpr.current + step)}
    />
  );
}

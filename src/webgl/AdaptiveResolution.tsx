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
 * fine occasionally. `flipflops` settles the loop so it can't oscillate forever.
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

  const apply = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.round(next * 100) / 100));
    if (clamped !== dpr.current) {
      dpr.current = clamped;
      setDpr(clamped);
    }
  };

  return (
    <PerformanceMonitor
      // Target fps band (refresh-rate relative). Below 48 → drop resolution;
      // sustained above 58 → climb back toward the device dpr.
      bounds={() => [48, 58]}
      // Settle after a few direction changes so it can't oscillate forever.
      flipflops={3}
      onDecline={() => apply(dpr.current - step)}
      onIncline={() => apply(dpr.current + step)}
    />
  );
}

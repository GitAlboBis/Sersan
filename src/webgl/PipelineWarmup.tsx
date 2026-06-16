"use client";

/**
 * PipelineWarmup — turns "the scene has actually finished compiling its WebGPU
 * pipelines" into a truthful signal the preloader can wait on.
 *
 * The heavy one-time cost on first load is shader/pipeline + compute-kernel
 * COMPILATION (WebGPU compiles compute pipelines synchronously on first dispatch;
 * on a weak/ARM GPU each compile stalls the frame). Those stalls are exactly why
 * a fixed-timer preloader shows a FAKE 100% and then freezes while the scene
 * compiles behind it.
 *
 * Instead of guessing, we DETECT readiness empirically: a compile stall produces
 * a large frame delta, so we count CONSECUTIVE SMOOTH frames (small delta) and a
 * run of them — after a short floor that lets the lazy islands mount + dispatch
 * their kernels once — means the compile storm is over and the GPU is rendering
 * the real scene smoothly. At that point we flip introStore.warmReady, which is
 * the preloader's 4th readiness signal, so the counter only reaches 100% when the
 * shaders are GENUINELY warm (truthful, possibly slower) — never on a timer.
 *
 * Mounted inside the Canvas (after the islands) so its useFrame shares the one
 * render loop. Fires once, then no-ops.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useIntroStore } from "./store/introStore";

/** A frame whose delta is below this rendered "quickly" (GPU not mid-compile). */
const SMOOTH_DELTA = 0.09; // ~11fps — lenient so a sluggish-but-working GPU passes
/** Consecutive smooth frames required to declare the scene warm. */
const NEEDED_SMOOTH = 28;
/** Floor so we never fire before the lazy islands have mounted + compiled once. */
const MIN_WARM_MS = 2000;

export function PipelineWarmup() {
  const done = useRef(false);
  const smooth = useRef(0);
  const startedAt = useRef(0);

  useFrame((_, delta) => {
    if (done.current) return;
    if (startedAt.current === 0) startedAt.current = performance.now();

    // A compile stall produces a large delta → reset the smooth run; we only
    // count frames that rendered quickly (= past the compile storm).
    if (delta > SMOOTH_DELTA) {
      smooth.current = 0;
      return;
    }
    smooth.current += 1;

    const elapsed = performance.now() - startedAt.current;
    if (smooth.current >= NEEDED_SMOOTH && elapsed >= MIN_WARM_MS) {
      done.current = true;
      useIntroStore.getState().setWarmReady();
    }
  });

  return null;
}

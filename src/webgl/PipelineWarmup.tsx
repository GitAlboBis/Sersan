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
 * Two signals, published to introStore (mobile-parity plan Phase 3.2):
 *
 *   1. `warmProgress 0.5` — an explicit pre-pass: on the FIRST useFrame tick,
 *      ONCE, we await `gl.compileAsync(scene, camera)` (three r184:
 *      `WebGLRenderer.compileAsync` on the classic path, `Renderer.compileAsync`
 *      on WebGPU — the same call Lusion's TaskManager makes for its "last
 *      30 %"). It compiles the RENDER OBJECTS of the scene mounted at that
 *      moment. It does NOT cover the post graph (`PostProcessing`/
 *      `RenderPipeline` compiles on its first `post.render()`) nor the compute
 *      pipelines (text sim, spores, lattices compile on their first
 *      `renderer.compute()` inside their own useFrame), and the deferred
 *      islands (HomeSingularity at `assembleDone`, SequenceSingularity at the
 *      approach) build AFTER the preloader lifts, so they can never be tasks of
 *      the counter. A rejection is swallowed — the pre-pass is a head start,
 *      never a gate — and the await is RACED against a 4 s timeout, so a
 *      material disposed mid-compile (compileAsync can then never settle) still
 *      lands the 0.5 slice.
 *
 *   2. `warmReady` (⇒ `warmProgress 1`) — the TRUTH gate, unchanged: we DETECT
 *      readiness empirically. A compile stall produces a large frame delta, so
 *      we count CONSECUTIVE SMOOTH frames (small delta) and a run of them —
 *      after a short floor that lets the lazy islands mount + dispatch their
 *      kernels once — means the compile storm is over and the GPU is rendering
 *      the real scene smoothly. This is why the scene keeps RENDERING under the
 *      preloader overlay (no present/render is ever skipped): rendering there IS
 *      the warm-up for everything compileAsync cannot reach, and the smooth
 *      deltas are its measurement.
 *
 * The preloader weights the `warm` slice by `warmProgress` (0.30 of the counter)
 * and only completes to 100 % on `warmReady` — truthful, possibly slower, never
 * on a timer. Mounted inside the Canvas BEFORE most islands (Scene.tsx order:
 * right after AdaptiveResolution, ahead of SignatureLine and the lazy islands)
 * so its useFrame shares the one render loop — which is exactly why the
 * compileAsync kick-off waits for the FIRST FRAME rather than firing from the
 * mount effect: by the first tick the sibling effects and lazy islands of the
 * same commit have created their materials, so the pre-pass sees them; a
 * mount-effect kick-off would compile a still-empty scene. Fires once, then
 * no-ops.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useIntroStore } from "./store/introStore";

/** A frame whose delta is below this rendered "quickly" (GPU not mid-compile). */
const SMOOTH_DELTA = 0.09; // ~11fps — lenient so a sluggish-but-working GPU passes
/** Consecutive smooth frames required to declare the scene warm. */
const NEEDED_SMOOTH = 28;
/** Floor so we never fire before the lazy islands have mounted + compiled once. */
const MIN_WARM_MS = 2000;
/** `warmProgress` published once the explicit compileAsync pre-pass resolves. */
const COMPILE_PROGRESS = 0.5;
/** Ceiling on the pre-pass await: compileAsync can never settle if a material
 *  it is compiling gets disposed mid-flight, so the 0.5 slice is raced against
 *  this timeout and always lands. */
const COMPILE_TIMEOUT_MS = 4000;

export function PipelineWarmup() {
  const done = useRef(false);
  const smooth = useRef(0);
  const startedAt = useRef(0);
  // Pre-pass bookkeeping: kicked off once (first frame), cancelled on unmount
  // (HMR, StrictMode double-invoke) so a stale run never publishes.
  const compileKicked = useRef(false);
  const cancelled = useRef(false);

  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  // Unmount guard for the async pre-pass below. Re-armed on (re)mount.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Explicit pre-pass: compile the scene's render objects up front (see the
  // header for what this does and does not cover). Kicked off from the FIRST
  // useFrame tick — not the mount effect — so it sees the materials created by
  // sibling effects / lazy islands of the same commit (this component mounts
  // before most of them, Scene.tsx order). Raced against COMPILE_TIMEOUT_MS so
  // a compileAsync that never settles (disposed material) still lands the 0.5
  // slice; try/catch so a rejection can never break the warm-up — the
  // heuristic below remains the only gate. `gl` is always an initialised
  // renderer here (R3F's async gl factory resolves before children mount).
  const kickCompile = () => {
    if (compileKicked.current) return;
    compileKicked.current = true;
    void (async () => {
      try {
        await Promise.race([
          gl.compileAsync(scene, camera),
          new Promise<void>((r) => setTimeout(r, COMPILE_TIMEOUT_MS)),
        ]);
      } catch {
        // Swallowed on purpose: a failed/unsupported pre-compile just means the
        // first rendered frames carry the compile cost — the smooth-frame
        // heuristic still measures that truthfully.
      }
      if (cancelled.current) return;
      useIntroStore.getState().setWarmProgress(COMPILE_PROGRESS);
    })();
  };

  useFrame((_, delta) => {
    // First tick: kick the compileAsync pre-pass (once; see kickCompile).
    kickCompile();
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
      // Sets warmReady AND warmProgress 1 (the store keeps it monotonic, so a
      // compileAsync that resolves after this can never lower it).
      useIntroStore.getState().setWarmReady();
    }
  });

  return null;
}

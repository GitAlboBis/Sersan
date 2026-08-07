"use client";

/**
 * The single RAF authority (AGENTS.md §3a).
 *
 * While the persistent Canvas is healthy, R3F's loop is the only
 * requestAnimationFrame on the page driving scroll: it pumps the shared
 * Lenis instance every frame. The Lenis singleton's private RAF is switched
 * off for the duration (setExternalPump) and restored if the canvas ever
 * unmounts (tier degradation).
 *
 * Resilience: if the GPU dies (reset / Windows TDR / driver hiccup), R3F's
 * loop stops — scrolling must NOT die with it. Two loss paths, one contract:
 *
 *   WebGL — on `webglcontextlost` the RAF baton goes straight back to the
 *   singleton; on `webglcontextrestored` R3F takes it again. The lost
 *   handler MUST call preventDefault(): per the WebGL spec the browser
 *   only attempts restoration when the event is cancelled, so without it
 *   `webglcontextrestored` never fires and the layer stays dead even on a
 *   recoverable loss.
 *
 *   WebGPU — a GPUCanvasContext fires NO webglcontext* events; the only
 *   loss signal is the device's `lost` promise. When it resolves, the
 *   baton goes back to the singleton so the singleton's own rAF resumes.
 *   No device re-init is attempted here (out of scope): the layer stays
 *   down for the session, but the page keeps scrolling.
 *
 * Scroll survives any GPU state.
 */
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { pumpLenis, setExternalPump } from "@/lib/lenis-singleton";
import { installPointerTracking, updatePointer } from "./store/pointerStore";

export function FrameDriver() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    // WebGL loss path. preventDefault() is what tells the browser to try to
    // restore the context — without it `webglcontextrestored` can never fire.
    const onLost = (event: Event) => {
      event.preventDefault();
      setExternalPump(false);
    };
    const onRestored = () => setExternalPump(true);

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    setExternalPump(true);

    // WebGPU loss path. On a true-WebGPU backend the canvas holds a
    // GPUCanvasContext, so the DOM listeners above never fire; the device's
    // `lost` promise (resolves at most once) is the only signal. Structural
    // cast, NOT an `import("three/webgpu")` type — bundle discipline, same as
    // backendOf() in createRenderer.ts. Every step is optional: a plain
    // WebGLRenderer has no `backend`, and the WebGL2-fallback backend has no
    // `device` — in both cases `lost` is undefined and this path is inert
    // (the DOM listener pair above is then the active one).
    let cancelled = false;
    const device = (
      gl as unknown as {
        backend?: {
          device?: { lost?: Promise<{ reason?: string; message?: string }> };
        };
      }
    ).backend?.device;
    device?.lost?.then((info) => {
      // `destroyed` = we tore the renderer down ourselves (unmount), not a
      // GPU fault. The cancelled flag already covers the unmount race; the
      // reason check keeps a pre-cleanup resolution from flipping the pump.
      if (cancelled || info?.reason === "destroyed") return;
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[FrameDriver] WebGPU device lost (${info?.reason ?? "unknown"}): ` +
            `${info?.message ?? ""} — handing the RAF baton back to Lenis`,
        );
      }
      // No device re-init/recovery in this iteration — the deliverable is the
      // header contract: R3F's loop is about to die with the device, so the
      // singleton's private rAF takes scroll back and the page keeps moving.
      setExternalPump(false);
    });

    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      setExternalPump(false);
    };
  }, [gl]);

  // The single window pointer listener (gated: coarse-pointer/reduced-motion is
  // a no-op). Writes only raw values; smoothing happens in the frame loop below
  // so the cursor, magnetic CTAs and the WebGPU fluid share ONE source + ONE
  // rAF (this same R3F loop) — never a second requestAnimationFrame.
  useEffect(() => installPointerTracking(), []);

  // Priority-0 frame: pump Lenis AND advance the smoothed pointer/velocity in
  // the one render loop.
  useFrame((_, delta) => {
    pumpLenis(performance.now());
    updatePointer(delta);
  });

  return null;
}

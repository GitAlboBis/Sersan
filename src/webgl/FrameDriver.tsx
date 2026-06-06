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
 * Resilience: if the WebGL context is lost (GPU reset / Windows TDR /
 * driver hiccup), R3F's loop stops — scrolling must NOT die with it. On
 * `webglcontextlost` the RAF baton goes straight back to the singleton; on
 * `webglcontextrestored` R3F takes it again. Scroll survives any GPU state.
 */
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { pumpLenis, setExternalPump } from "@/lib/lenis-singleton";

export function FrameDriver() {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = () => setExternalPump(false);
    const onRestored = () => setExternalPump(true);

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    setExternalPump(true);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      setExternalPump(false);
    };
  }, [gl]);

  useFrame(() => {
    pumpLenis(performance.now());
  });

  return null;
}

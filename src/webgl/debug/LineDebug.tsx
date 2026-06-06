"use client";

/**
 * Dev-only leva panel for tuning the signature line + postprocessing live.
 *
 * Mounted exclusively behind a process.env.NODE_ENV !== "production" guard
 * with a dynamic import (Scene.tsx), so leva never reaches the production
 * bundle. Writes straight into fxStore; the WebGL layer picks values up on
 * the next frame.
 */
import { useEffect } from "react";
import { useControls, folder } from "leva";
import { useFxStore } from "../store/fxStore";

export default function LineDebug() {
  const set = useFxStore((s) => s.set);
  const defaults = useFxStore.getState();

  const values = useControls("Signature line", {
    Colors: folder({
      colorA: { value: defaults.colorA, label: "cyan (head)" },
      colorB: { value: defaults.colorB, label: "violet (tail)" },
      colorHot: { value: defaults.colorHot, label: "hot (signal head)" },
    }),
    Line: folder({
      emissive: { value: defaults.emissive, min: 1, max: 6, step: 0.05 },
      glowFalloff: { value: defaults.glowFalloff, min: 0.5, max: 6, step: 0.1 },
      headSharp: { value: defaults.headSharp, min: 0.005, max: 0.2, step: 0.005 },
      flowSpeed: { value: defaults.flowSpeed, min: 0, max: 0.5, step: 0.005 },
      radiusFactor: { value: defaults.radiusFactor, min: 0.001, max: 0.03, step: 0.0005 },
    }),
    PostFX: folder({
      bloomIntensity: { value: defaults.bloomIntensity, min: 0, max: 4, step: 0.05 },
      bloomThreshold: { value: defaults.bloomThreshold, min: 0, max: 2, step: 0.05 },
      bloomRadius: { value: defaults.bloomRadius, min: 0, max: 1, step: 0.05 },
      noiseOpacity: { value: defaults.noiseOpacity, min: 0, max: 0.2, step: 0.005 },
      vignetteDarkness: { value: defaults.vignetteDarkness, min: 0, max: 1, step: 0.05 },
    }),
  });

  useEffect(() => {
    set(values);
  }, [values, set]);

  return null;
}

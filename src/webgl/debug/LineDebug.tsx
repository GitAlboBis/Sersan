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
      fresnelPower: { value: defaults.fresnelPower, min: 0.5, max: 6, step: 0.1 },
      scatter: { value: defaults.scatter, min: 0, max: 1.5, step: 0.05 },
      radiusFactor: { value: defaults.radiusFactor, min: 0.001, max: 0.03, step: 0.0005 },
      curlTubeIntensity: {
        value: defaults.curlTubeIntensity,
        min: 0,
        max: 2,
        step: 0.05,
        label: "curl-tube haze",
      },
    }),
    PostFX: folder({
      bloomIntensity: { value: defaults.bloomIntensity, min: 0, max: 4, step: 0.05 },
      bloomThreshold: { value: defaults.bloomThreshold, min: 0, max: 2, step: 0.05 },
      bloomRadius: { value: defaults.bloomRadius, min: 0, max: 1, step: 0.05 },
      noiseOpacity: { value: defaults.noiseOpacity, min: 0, max: 0.2, step: 0.005 },
      vignetteDarkness: { value: defaults.vignetteDarkness, min: 0, max: 1, step: 0.05 },
    }),
    Camera: folder({
      lookAhead: { value: defaults.lookAhead, min: 0, max: 0.15, step: 0.005 },
      lookTiltScale: { value: defaults.lookTiltScale, min: 0, max: 0.5, step: 0.01 },
    }),
    // GPGPU dissolve hero (HeroLogo). Spring = how snappy the mark recomposes;
    // push/radius = the cursor dispersion; pointSize = sprite density/glow.
    "GPGPU hero": folder({
      gpgpuSpring: { value: defaults.gpgpuSpring, min: 4, max: 60, step: 1, label: "spring" },
      gpgpuPush: { value: defaults.gpgpuPush, min: 0, max: 120, step: 1, label: "push" },
      gpgpuRadius: { value: defaults.gpgpuRadius, min: 0.1, max: 1.5, step: 0.02, label: "radius" },
      gpgpuPointSize: { value: defaults.gpgpuPointSize, min: 2, max: 20, step: 0.5, label: "point size" },
    }),
    // Pointer fluid (WebGPU/TSL path only — see PostFXNodes). Live-tune the
    // liquid-glass refraction strength + accumulation feel.
    Fluid: folder({
      fluidStrength: { value: defaults.fluidStrength, min: 0, max: 0.02, step: 0.0005 },
      dissipation: { value: defaults.dissipation, min: 0.85, max: 0.99, step: 0.005 },
      splatRadius: { value: defaults.splatRadius, min: 0.02, max: 0.2, step: 0.005 },
    }),
  });

  useEffect(() => {
    set(values);
  }, [values, set]);

  return null;
}

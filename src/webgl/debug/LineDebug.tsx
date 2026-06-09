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
    // GPGPU dissolve hero (HeroLogo). The FRAMING knobs (scale/offsetX/offsetY/
    // posZ) place the mark as a prominent, fully-visible particle logo on the
    // hero right — tune them live to fit the viewport. spring+damping = how
    // tightly the mark snaps back (glued return); push/radius = the cursor
    // dispersion; turbBase = at-rest shimmer (keep ~0 for a crisp glued skin);
    // pointSize+pointAlpha = how densely the sprites overlap into a solid
    // velvety skin; emissive = glow.
    "GPGPU hero": folder({
      heroScale: {
        value: defaults.heroScale,
        min: 0.15,
        max: 0.6,
        step: 0.005,
        label: "frame: scale",
      },
      heroOffsetX: {
        value: defaults.heroOffsetX,
        min: -0.2,
        max: 0.45,
        step: 0.005,
        label: "frame: offset X",
      },
      heroOffsetY: {
        value: defaults.heroOffsetY,
        min: -0.3,
        max: 0.3,
        step: 0.005,
        label: "frame: offset Y",
      },
      heroPosZ: {
        value: defaults.heroPosZ,
        min: -4,
        max: 2,
        step: 0.05,
        label: "frame: pos Z",
      },
      gpgpuSpring: { value: defaults.gpgpuSpring, min: 4, max: 90, step: 1, label: "spring" },
      gpgpuDamping: { value: defaults.gpgpuDamping, min: 1, max: 18, step: 0.5, label: "damping" },
      gpgpuPush: { value: defaults.gpgpuPush, min: 0, max: 120, step: 1, label: "push" },
      gpgpuRadius: { value: defaults.gpgpuRadius, min: 0.1, max: 1.5, step: 0.02, label: "radius" },
      gpgpuTurbBase: {
        value: defaults.gpgpuTurbBase,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: "turb @ rest",
      },
      gpgpuPointSize: { value: defaults.gpgpuPointSize, min: 2, max: 28, step: 0.5, label: "point size" },
      gpgpuPointAlpha: {
        value: defaults.gpgpuPointAlpha,
        min: 0.1,
        max: 1,
        step: 0.05,
        label: "point alpha / skin",
      },
      gpgpuEmissive: {
        value: defaults.gpgpuEmissive,
        min: 0.5,
        max: 6,
        step: 0.1,
        label: "GPGPU emissive / glow",
      },
      gpgpuTilt: {
        value: defaults.gpgpuTilt,
        min: 0,
        max: 0.2,
        step: 0.005,
        label: "mouse tilt (rad)",
      },
      // Spore mode (heroRenderMode "spores" — instanced shaded spheres).
      sporeSize: {
        value: defaults.sporeSize,
        min: 0.4,
        max: 3,
        step: 0.05,
        label: "spore size ×",
      },
      sporeEmissive: {
        value: defaults.sporeEmissive,
        min: 0,
        max: 6,
        step: 0.1,
        label: "spore emission",
      },
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

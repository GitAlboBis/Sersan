"use client";

/**
 * Postprocessing rig — desktop ("full" tier) only.
 *
 * Bloom uses the luminance-threshold trick (spec §4, approach A): the line
 * material outputs colors above 1.0 (uEmissive) while everything else stays
 * ≤ 1.0, so threshold 1.0 blooms ONLY the signature line. mipmapBlur is the
 * recommended high-quality/low-cost blur path. Noise + Vignette add the
 * cinematic grain/depth that the deleted DOM overlay used to fake.
 *
 * multisampling=0: postprocessing does its own AA; MSAA buffers would be
 * wasted cost.
 */
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { useFxStore } from "./store/fxStore";

export function PostFX() {
  const bloomIntensity = useFxStore((s) => s.bloomIntensity);
  const bloomThreshold = useFxStore((s) => s.bloomThreshold);
  const bloomRadius = useFxStore((s) => s.bloomRadius);
  const noiseOpacity = useFxStore((s) => s.noiseOpacity);
  const vignetteDarkness = useFxStore((s) => s.vignetteDarkness);

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.2}
        intensity={bloomIntensity}
        radius={bloomRadius}
      />
      <Noise premultiply opacity={noiseOpacity} />
      <Vignette eskil={false} offset={0.35} darkness={vignetteDarkness} />
    </EffectComposer>
  );
}

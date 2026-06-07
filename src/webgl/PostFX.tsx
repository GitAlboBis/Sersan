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
import { routeFx, HOME_FX } from "./store/routeFxStore";

/**
 * routeFx provides the per-route bloom tone; the dev-tuning fxStore (leva)
 * is an OVERRIDE that wins only once a dev moves a knob off its default.
 * Because routeFx('/') mirrors the fxStore defaults verbatim, the home route
 * is pixel-identical: route.bloom* == HOME_FX.bloom* == fxStore default, so
 * whichever branch is taken yields the same number. A reactive read is fine —
 * PostFX only re-renders on navigation (pathname change), never per frame.
 */
export function PostFX({ pathname = "/" }: { pathname?: string }) {
  const fxBloomIntensity = useFxStore((s) => s.bloomIntensity);
  const fxBloomThreshold = useFxStore((s) => s.bloomThreshold);
  const fxBloomRadius = useFxStore((s) => s.bloomRadius);
  const noiseOpacity = useFxStore((s) => s.noiseOpacity);
  const vignetteDarkness = useFxStore((s) => s.vignetteDarkness);

  const route = routeFx(pathname);
  // Use the route tone unless the dev has tuned the value away from its
  // default (then the leva override wins).
  const bloomIntensity =
    fxBloomIntensity === HOME_FX.bloomIntensity ? route.bloomIntensity : fxBloomIntensity;
  const bloomThreshold =
    fxBloomThreshold === HOME_FX.bloomThreshold ? route.bloomThreshold : fxBloomThreshold;
  const bloomRadius =
    fxBloomRadius === HOME_FX.bloomRadius ? route.bloomRadius : fxBloomRadius;

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

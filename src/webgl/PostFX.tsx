"use client";

/**
 * Postprocessing rig (WebGL path — flag OFF) — mounted whenever the budget axis
 * says `fxBudget.postFx !== "off"` (Scene.tsx), i.e. desktop tier "full" and,
 * since the mobile-parity plan Phase 2, capable phones too (level 2, `postFx
 * "lite"`).
 *
 * Bloom uses the luminance-threshold trick (spec §4, approach A): the line
 * material outputs colors above 1.0 (uEmissive) while everything else stays
 * ≤ 1.0, so threshold 1.0 blooms ONLY the signature line. mipmapBlur is the
 * recommended high-quality/low-cost blur path. Noise + Vignette add the
 * cinematic grain/depth that the deleted DOM overlay used to fake.
 *
 * multisampling=0: postprocessing does its own AA; MSAA buffers would be
 * wasted cost.
 *
 * frameBufferType stays the R3P default (`HalfFloatType`) on BOTH levels — do
 * NOT pass `UnsignedByteType` to "save bandwidth": it clamps the scene buffer to
 * [0,1] and the selective bloom at `luminanceThreshold 1.0` would produce
 * NOTHING (the >1.0 emissive signal is the whole contract above).
 *
 * LEVELS (`level` prop = `fxBudget.postFx` minus "off"):
 *   "full" — desktop: the exact chain as always — `<Bloom mipmapBlur …>` at the
 *            postprocessing default of 8 mip levels (prop deliberately ABSENT so
 *            the BloomEffect options object is unchanged), `<Noise>`, `<Vignette>`.
 *   "lite" — capable phone: same composer, `<Bloom … levels={4}>` (fewer mips ⇒
 *            fewer down/upsample passes and smaller targets) and NO `<Noise>`
 *            pass; vignette and bloom uniforms identical. Decided at mount —
 *            R3P rebuilds the composer when `multisampling`/`frameBufferType`
 *            change, so those never vary at runtime; a budget step-down flips
 *            `postFx` to "off" and unmounts this rig instead.
 *
 * DEV / PREVIEW HANDLE: while mounted, `window.__sersanPostFx = { rig:
 * "composer", level }` (same predicate as the `?fx= ?postfx=` overrides), removed
 * on unmount.
 */
import { useEffect } from "react";
import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { useFxStore } from "./store/fxStore";
import { routeFx, HOME_FX } from "./store/routeFxStore";
import { devOverridesAllowed, type FxBudget } from "./store/tierStore";

/** The two profiles this rig can build — `fxBudget.postFx` minus "off". */
type PostFxLevel = Exclude<FxBudget["postFx"], "off">;

/** Mip count for the "lite" bloom (postprocessing BloomEffect default is 8). */
const LITE_BLOOM_LEVELS = 4;

/**
 * routeFx provides the per-route bloom tone; the dev-tuning fxStore (leva)
 * is an OVERRIDE that wins only once a dev moves a knob off its default.
 * Because routeFx('/') mirrors the fxStore defaults verbatim, the home route
 * is pixel-identical: route.bloom* == HOME_FX.bloom* == fxStore default, so
 * whichever branch is taken yields the same number. A reactive read is fine —
 * PostFX only re-renders on navigation (pathname change), never per frame.
 */
export function PostFX({
  pathname = "/",
  level,
}: {
  pathname?: string;
  /** Budget profile — see the header ("LEVELS"). Decided at mount. */
  level: PostFxLevel;
}) {
  const fxBloomIntensity = useFxStore((s) => s.bloomIntensity);
  const fxBloomThreshold = useFxStore((s) => s.bloomThreshold);
  const fxBloomRadius = useFxStore((s) => s.bloomRadius);
  const noiseOpacity = useFxStore((s) => s.noiseOpacity);
  const vignetteDarkness = useFxStore((s) => s.vignetteDarkness);

  // Dev/preview-only QA handle (same predicate as the `?fx= ?postfx=` URL
  // overrides and `window.__sersanTier`): announces which rig + profile is
  // live, removed on unmount. Never on the real domain.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(process.env.NODE_ENV !== "production" || devOverridesAllowed())
    ) {
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    w.__sersanPostFx = { rig: "composer", level };
    return () => {
      delete w.__sersanPostFx;
    };
  }, [level]);

  const route = routeFx(pathname);
  // Use the route tone unless the dev has tuned the value away from its
  // default (then the leva override wins).
  const bloomIntensity =
    fxBloomIntensity === HOME_FX.bloomIntensity ? route.bloomIntensity : fxBloomIntensity;
  const bloomThreshold =
    fxBloomThreshold === HOME_FX.bloomThreshold ? route.bloomThreshold : fxBloomThreshold;
  const bloomRadius =
    fxBloomRadius === HOME_FX.bloomRadius ? route.bloomRadius : fxBloomRadius;

  // "lite": fewer bloom mips, no Noise pass. Kept as its own JSX branch (rather
  // than a conditional child) so the "full" branch below stays the exact
  // element tree it has always been — and because `EffectComposer` types its
  // children as `JSX.Element | JSX.Element[]` (no `false`).
  if (level === "lite") {
    return (
      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          levels={LITE_BLOOM_LEVELS}
          luminanceThreshold={bloomThreshold}
          luminanceSmoothing={0.2}
          intensity={bloomIntensity}
          radius={bloomRadius}
        />
        <Vignette eskil={false} offset={0.35} darkness={vignetteDarkness} />
      </EffectComposer>
    );
  }

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

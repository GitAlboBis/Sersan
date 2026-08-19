/**
 * WORDMARK TUNER BRIDGE — the DOM debug panel → particle-brand sprite size.
 *
 * The Wordmark Lab (`components/fx/wordmark-lab.tsx`, gated on `?wordmark`)
 * lets the owner settle the SERSAN wordmark's two coupled variables without a
 * round trip: the FONT WEIGHT (written straight onto the `[data-hero-brand]`
 * anchor's `style.fontWeight`, then resampled through the existing
 * `textMorphStore.brandAnchorEpoch` signal) and the two LIVE UNIFORMS inside
 * the WebGL island, which need this channel: the PARTICLE DISC SIZE
 * (`uPointSize`) and the GLOW (`uEmissive`).
 *
 * WHY A MODULE-SCOPE REF AND NOT A STORE FIELD: this is the `holeField` /
 * `entryProgressRef` pattern — ONE writer (the panel, on a click) and a plain
 * property read inside `HeroTextParticles`' `useFrame`. No zustand
 * notification, no React subscriber, nothing added to the shipping
 * textMorphStore surface for a dev-only knob.
 *
 * WHY PINNED ON globalThis: the panel lives in the ROUTE bundle and the reader
 * lives in the lazily-imported WebGL island chunk. Turbopack inlines a
 * separate copy of a small leaf module into each chunk on the production
 * build — the exact failure documented on `useTextMorphStore` (two live
 * instances, writer and reader split, the feature silently dead in prod only).
 * The pin makes every bundled copy resolve to the single real object.
 *
 * This module deliberately imports NOTHING: it is pulled into the main route
 * bundle by the panel, and any transitive `three` import here would drag the
 * whole renderer with it.
 */
interface WordmarkTuner {
  /**
   * Live override for the brand particles' `uPointSize` (the billboard sprite
   * size — see the POINT_SIZE derivation in `HeroTextParticles`). `null` = no
   * override: the value baked into the build wins (9 desktop, 6 compact).
   * Applied per frame by `HeroTextParticles`, so it survives a resample.
   */
  pointSize: number | null;
  /**
   * Live override for the brand particles' `uEmissive` — the GLOW, the last
   * multiplier on the mote's colour (gpgpuNodeSim, text-morph fragment).
   * `null` = no override: the build's baked `EMISSIVE: 4` wins.
   *
   * WHY THIS KNOB EXISTS: the wordmark's fine features (the R's cut, the A's
   * bare apex) do not read, and the cause is not the geometry. Rendered
   * through the shipped sampler and post chain, mean luminance inside the cut
   * is 97% of the surviving stroke at a 21.6%-of-cap gap and still 96% at
   * 48.6% — widening does nothing. In the motes-only pass, with no post, the
   * same cut reads at 2%. What erases it is saturation + bloom: ~27 motes per
   * 2×2px cell of ink clip the strokes to white, and at EMISSIVE 4 they sit
   * 4× above the Bloom threshold (fxStore.bloomThreshold 1.0) so the glow
   * veils every fine feature. Hence the lever is the glow.
   *
   * Applied per frame by `HeroTextParticles`, so it survives a resample.
   */
  glow: number | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __sersanWordmarkTuner: WordmarkTuner | undefined;
}

export const wordmarkTuner: WordmarkTuner = (globalThis.__sersanWordmarkTuner ??=
  {
    pointSize: null,
    glow: null,
  });

// A pinned object created by an OLDER copy of this module (dev HMR, or a
// stale chunk) predates any field added later, and would hand the reader
// `undefined` where it expects `null` — which would then be written straight
// into a uniform. Normalise on every copy's first evaluation. `??=` only
// fills a nullish slot, so a value the panel already set is never clobbered.
wordmarkTuner.glow ??= null;

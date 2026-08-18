/**
 * WORDMARK TUNER BRIDGE — the DOM debug panel → particle-brand sprite size.
 *
 * The Wordmark Lab (`components/fx/wordmark-lab.tsx`, gated on `?wordmark`)
 * lets the owner settle the SERSAN wordmark's two coupled variables without a
 * round trip: the FONT WEIGHT (written straight onto the `[data-hero-brand]`
 * anchor's `style.fontWeight`, then resampled through the existing
 * `textMorphStore.brandAnchorEpoch` signal) and the PARTICLE DISC SIZE — which
 * is a live uniform inside the WebGL island and needs this channel.
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
   * override: the value baked into the build wins (8 desktop, 5 compact).
   * Applied per frame by `HeroTextParticles`, so it survives a resample.
   */
  pointSize: number | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __sersanWordmarkTuner: WordmarkTuner | undefined;
}

export const wordmarkTuner: WordmarkTuner = (globalThis.__sersanWordmarkTuner ??=
  {
    pointSize: null,
  });

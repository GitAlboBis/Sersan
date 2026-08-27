/**
 * spine-beats — the DOM-free half of the hero beat engine (SPINE_BEATS).
 *
 * Pure functions only, so the active-beat law can be unit-tested (node or the
 * Playwright harness) without a browser. The DOM/GSAP half lives in
 * src/components/fx/beat-choreographer.ts.
 *
 * THE LAW. The spine's ScrollTrigger still writes a scrubbed progress 0..1.
 * The old engine turned that into a per-frame opacity per panel
 * (`panelOpacity`, kept here as `beatOpacity` — the crossfade band is
 * min(0.03, range·0.3) of progress ≈ 6.5vh of scroll). The beat engine keeps
 * the SAME band but reads it as a DISCRETE event: a beat becomes active when
 * its opacity law crosses ENTER_AT going up and stays active until it drops
 * below EXIT_AT (hysteresis inside the band, so a settle wobbling on a band
 * edge can never flap enter/exit). Because adjacent windows are contiguous
 * and each fade happens strictly INSIDE its own window, at most one beat can
 * be ≥ ENTER_AT at any progress — exactly one headline owns the screen.
 */

export type BeatWindow = { id: string; start: number; end: number };

/** Hysteresis thresholds on the crossfade law (ENTER_AT > EXIT_AT). */
export const ENTER_AT = 0.55;
export const EXIT_AT = 0.45;

/**
 * The pre-refactor crossfade law, verbatim (cinematic-system-scroll's
 * `panelOpacity`): fade-in and fade-out strictly inside [start, end]; the hero
 * (isHero) is lit at progress ≤ 0 (SSR) and only fades at its end.
 */
export function beatOpacity(
  progress: number,
  w: BeatWindow,
  isHero = false,
): number {
  const fade = Math.min(0.03, (w.end - w.start) * 0.3);
  if (progress <= w.start) return isHero ? 1 : 0;
  if (progress >= w.end) return 0;
  let o = 1;
  if (!isHero && progress < w.start + fade) o = (progress - w.start) / fade;
  if (progress > w.end - fade) o = Math.min(o, (w.end - progress) / fade);
  return Math.max(0, o);
}

/**
 * Active beat index for `p`, given the previously active index (or null).
 * Keeps `prev` while its opacity is still > EXIT_AT; otherwise returns the
 * first window whose opacity ≥ ENTER_AT, or null (the empty stage — the
 * crossfade gap and the 0.97→1 exit band before the pin releases).
 * Window index 0 is the hero (lit at p ≤ 0).
 */
export function resolveActiveBeat(
  p: number,
  prev: number | null,
  windows: BeatWindow[],
): number | null {
  if (prev !== null) {
    const w = windows[prev];
    if (w && beatOpacity(p, w, prev === 0) > EXIT_AT) return prev;
  }
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (w && beatOpacity(p, w, i === 0) >= ENTER_AT) return i;
  }
  return null;
}

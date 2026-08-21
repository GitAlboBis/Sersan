"use client";

/**
 * cut-tick — ROUND 5 W4, the DOM half of the igloo section-cut warp
 * (research/2026-08-21-igloo-cuts-spec.md §C "CSS half").
 *
 * A headless, imperative driver — NOT a React component. `fireCutTick` is
 * called by PostFXNodes' single useFrame consumer at the CROSSING INSTANT
 * (the prev-frame/this-frame scroll-progress STRADDLE of a boundary cutᵢ —
 * the same event that fires the uWarpBurst spike; jump-proof, so End/Home/
 * anchor jumps still tick exactly once), at event cadence only, never
 * per frame. It adds the scoped `.cut-tick` class to the FIRST heading
 * (h1/h2) inside each of the two adjacent `[data-line-anchor]` wrappers for
 * 140 ms, with opposite `--cut-dir` signs so the headings shear APART along
 * the scroll direction, then removes it on timeout.
 *
 * Why imperative from the GL driver (not a sectionStore React subscriber):
 * the tick must coincide with the GL seam crossing the screen center, and
 * the wipe scrub is the only code that knows that instant exactly (the
 * IntersectionObserver `pulse` fires on active-section flips, which lag or
 * lead the geometric boundary). It also means: no canvas → no cuts → no tick,
 * which is the intended tier behavior (tier "off" gets nothing).
 *
 * Section files are NEVER touched (another agent owns them): headings are
 * targeted generically through the [data-line-anchor] wrappers in page.tsx.
 * Copy untouched, layout untouched — compositor-only props, styles scoped in
 * cut-tick.module.css and RM-guarded there via media query.
 */
import styles from "./cut-tick.module.css";

/** Class-on time, ms — spec §C: "≤150 ms, never scrubbed". */
const TICK_MS = 140;

/** Live removal timers, so a rapid double-crossing re-arms cleanly. */
const timers = new Map<HTMLElement, number>();

function tickHeading(anchorId: string, dir: number): void {
  const host = document.querySelector<HTMLElement>(
    `[data-line-anchor="${anchorId}"]`,
  );
  if (!host) return;
  // First heading in DOM order — the section's own h1/h2, whatever level the
  // section chose ("section > h2-level headings, generically").
  const heading = host.querySelector<HTMLElement>("h1, h2");
  if (!heading) return;
  const prev = timers.get(heading);
  if (prev !== undefined) window.clearTimeout(prev);
  heading.style.setProperty("--cut-dir", dir === -1 ? "-1" : "1");
  heading.classList.add(styles.cutTick);
  timers.set(
    heading,
    window.setTimeout(() => {
      heading.classList.remove(styles.cutTick);
      heading.style.removeProperty("--cut-dir");
      timers.delete(heading);
    }, TICK_MS),
  );
}

/**
 * Fire the 140 ms micro-glitch on the two sections adjacent to a crossed cut
 * boundary. `dir` is the scroll direction (1 down, −1 up): scrolling down the
 * outgoing (upper) heading shoves up and the incoming (lower) heading shoves
 * down — the cut shears them apart; reversed on upward crossings.
 */
export function fireCutTick(
  outgoingAnchor: string,
  incomingAnchor: string,
  dir: 1 | -1,
): void {
  if (typeof document === "undefined") return;
  tickHeading(outgoingAnchor, -dir);
  tickHeading(incomingAnchor, dir);
}

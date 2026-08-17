/**
 * The ONE inline `overscroll-behavior-x` rule every horizontal rail writes
 * (DragRail + the services stations rail), so all three home rails agree:
 *   coarse pointer               ⇒ "auto"    (the OS edge-swipe survives)
 *   fine pointer, motion OK      ⇒ "contain" (trackpad flick past the end must
 *                                             not chain into browser back-nav)
 *   fine pointer, reduced motion ⇒ ""        (cleared → cascade `auto`, what a
 *                                             RM desktop always had — MOBILE_REVIEW A2)
 * Inline is the only origin that deterministically beats globals.css's
 * `.lenis.lenis-smooth [data-lenis-prevent]` rule — and that class exists only
 * WHILE a smooth wheel scroll animates (Lenis 1.3.23), so the cascade cannot be
 * relied on for `contain` on a fine pointer.
 */
export function applyRailOverscroll(
  el: HTMLElement,
  coarse: boolean,
  reduced: boolean,
): void {
  el.style.overscrollBehaviorX = coarse ? "auto" : reduced ? "" : "contain";
}

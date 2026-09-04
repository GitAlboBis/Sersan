import type { CSSProperties } from "react";

/**
 * LEFT-ANCHORED page gutter for the pinned spine (stages 01..04) and the
 * passage's stage 05 — owner 2026-09-04: "a seconda del pc che uso per vedere
 * il sito cambiano le posizioni e le proporzioni… le scritte 01-02-03-04, da
 * portatile le vedo più a sinistra (che preferisco), da pc fisso più
 * centrali."
 *
 * The labels have no horizontal positioning of their own — they inherit the
 * page container's content-box left edge. `.container-px` caps its box at
 * 1600px with `margin-inline: auto`, so every pixel of viewport beyond the cap
 * becomes left inset at 50%: the copy column walks toward the middle of a wide
 * monitor (160px in at 1536, 320px at 1920, 640px at 2560). This holds the
 * LAPTOP composition at every width: a flat 10% of the frame — 160px at 1600,
 * 192px at 1920, 256px at 2560 — the same proportional law the WebGL mark
 * obeys (fxStore heroOffsetX = 0.2 of worldViewWidth).
 *
 * PROVABLY a no-op below 1600px: `100vw - 1600px` is ≤ 0 there, so `min()`
 * picks it and `max()` falls through to --margin exactly as `.container-px`
 * does. At exactly 1600px the two terms meet (10rem === 10vw), so there is no
 * step. `maxWidth: "none"` is what actually removes the centring — with the
 * box filling the frame the rule's own `margin-inline: auto` resolves to 0.
 *
 * INLINE, not a CSS class, and deliberately so: a `.container-px-left` sibling
 * in globals.css was silently dropped from the emitted stylesheet by the
 * Tailwind v4 / lightningcss pipeline (verified against the served bundle),
 * which left the element with the class but NO padding — the copy went flush
 * to the frame edge and the spine's own horizontal pan then clipped it. And
 * the Tailwind-utility route is closed too: `.container-px` is unlayered while
 * utilities live in `@layer utilities`, so `mx-0 max-w-none` would lose the
 * cascade (the trap globals.css already documents). An inline style beats
 * both, with no build step in the loop.
 *
 * `100vw` includes the classic Windows scrollbar, so the gate can trip ~15px
 * early and the gutter run ~8px wide — padding only, never width, so it can
 * never create horizontal overflow.
 */
export const SPINE_GUTTER_STYLE: CSSProperties = {
  maxWidth: "none",
  paddingLeft: "max(var(--margin), var(--safe-l), min(10vw, 100vw - 1600px))",
};

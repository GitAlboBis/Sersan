# Rebalance cinematic spine — fix stage layout / diagonal void

## Problem

On wide desktop viewports the homepage cinematic spine reads as two
disconnected objects: the orb floats upper-center-right while the stage copy
is jammed into the bottom-left, leaving a large empty diagonal band between
them. User flagged it directly ("the layout is off") on the `01 / Signals`
stage.

Root causes (in `src/components/sections/cinematic-system-scroll.tsx`):

1. **Bottom-anchored copy.** All 5 numbered stages (`signals`, `audit`,
   `build`, `operate`, `handover`) use `items-end pb-20 sm:pb-28` on the
   `StagePanel` while the orb image is vertically centered. The hero
   (`items-center`) does not have this problem.
2. **Orb framing shows the pedestal.** `orb-core.webp` is ~1.79:1 (almost
   identical to 16:9), so on wide screens `object-cover` shows nearly the
   whole image — including the hex pedestal at the bottom-center, which reads
   as a stray dark block. `objectPosition: "115% 50%"` centers the image's
   midpoint (between orb and pedestal), pushing the orb high.

## Goal

The orb and the stage copy share a vertical eyeline so the composition reads
as one balanced scene (copy left, orb right). The pedestal stops reading as a
stray block. Applies to ALL 6 stages (hero + 5 numbered).

## Requirements

- Re-anchor the 5 numbered stages so copy sits at the orb's vertical eyeline
  (centered, not bottom-pinned). Hero already centered — keep it.
- Reframe the orb (base scale and/or `objectPosition`) so the orb is roughly
  vertically centered and the pedestal sits at/below the bottom edge — a
  subtle base glow, not a floating block.
- Keep text contrast ≥ 4.5:1 at all scroll positions — move/adjust the
  bottom-left contrast scrim to follow the copy's new vertical position.
- No regressions: hero H1 still SSR-visible and clearing the nav; mobile
  fallback unchanged; reduced-motion path unchanged.
- Verify each of the 5 numbered stages + hero by screenshot before claiming
  done (no stage-specific overflow; final stage CTA cluster still fits).

## Gate

- `npx tsc --noEmit` clean + `bun run build` green
- Screenshots of hero + each numbered stage on the running build
- Deploy to production after sign-off

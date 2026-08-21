# Services section refactor — "SERVICE SLABS" (2026-08-21)

Scope: `src/components/sections/services-section.tsx` — ONLY the `ServiceCard` composition and
the focus treatment change. The POV camera pan (runway, stage math, quickTo POV smoothing,
segments, roll, snap stations, focusin locks, mobile lateral rail + stepper mechanics, the
≥640px byte-identity contract) is KEPT — owner likes the camera. Copy byte-identical.

Also: the heading block adopts the shared chapter grammar (see DIRECTION §vocabulary):
- Title "Four services. One discipline." → `clamp(2.75rem, 4.6vw, 5.5rem)` display serif,
  `leading-[0.98]`, span the full heading width; keep the italic span.
- The description paragraph moves to the right-hung annotation slot (~320px, text-[13px],
  text-ink-mute) beside/below the title on `lg:` (grid `lg:grid-cols-[1fr_320px] items-end
  gap-8`); stacks naturally below lg. If `SectionHeading` cannot express this without forking,
  compose the heading locally in this section (eyebrow row + h2 + annotation) instead of
  changing the shared component — SectionHeading is site-wide.

## ServiceCard v2 — the slab

Kill the boxed look: no `border`, no rounded box border, no icon tile, no bullet dots, no
bottom strip box, no pill. The slab is a chrome-less glass surface:

- Root: `relative flex h-full flex-col rounded-2xl bg-[hsl(216_30%_9%/0.55)] backdrop-blur-md
  p-7 sm:p-9 overflow-hidden` + soft ambient shadow `shadow-[0_28px_90px_-40px_hsl(220_60%_2%/0.85)]`.
  Top hairline (the only "edge"): gradient cyan→transparent h-px, as in the glass-pane grammar.
- **Ghost number**: the `num` ("01"…) becomes a huge display-serif watermark:
  `absolute -top-6 -left-2 font-display text-[9rem] leading-none tracking-[-0.04em]
  text-ink/[0.05] select-none pointer-events-none` — content flows over it (Lusion/Noomo big-type
  layering). The small visible header row becomes: mono eyebrow `SERVICE 01` (existing "Service"
  label + num, `text-[10px] tracking-[0.18em] uppercase text-ink-mute`) with a `->` arrow-prefix
  styling on hover reserved for the CTA only. Icon: DELETED from the header (the lucide icon
  imports go away if unused).
- Title: `font-display text-[30px] sm:text-[34px] leading-[1.02] tracking-[-0.025em] text-ink`.
- Positioning line: unchanged size, `text-ink-mute`.
- "Typical build includes": keep the mono micro-eyebrow, then the 4 lines as a mono micro-list:
  `font-mono text-[12px] leading-relaxed text-ink-mute`, each prefixed by a `+` glyph in
  `text-[hsl(var(--accent)/0.7)]` (AT/igloo ASCII garnish) instead of the dot span. Rows
  separated by nothing (tight stack), the whole list sitting on a `border-t
  border-[hsl(var(--rule)/0.5)] pt-4`.
- "Solves" zone: `mt-auto border-t border-[hsl(var(--rule)/0.5)] pt-4` (no -mx bleed, no bg
  fill, no inset shadows): mono eyebrow `SOLVES` in accent, the solves lines at `text-[13px]
  text-ink-mute`, and the CTA as a bare text link: mono uppercase 10px, `->` arrow BEFORE the
  label sliding +4px on hover (`transition-transform`, `--ease-lusion`), `text-ink
  hover:text-[hsl(var(--accent))]`. Same href, same label string.
- Hover (fine pointer): slab lifts `-translate-y-1` + hairline brightens + ghost number eases to
  `text-ink/[0.09]` — 500ms `--ease-lusion`, transform/opacity(color) only. Remove the radial
  sheen + top-edge gradient spans (replaced by the hairline) and the icon rotate.

### POV focus treatment (pinned mode)
- Replace the full border ring `[data-pov-focus]` with an **edge glow**: keep the same element
  + data attribute + quickTo opacity contract (GSAP owns opacity inline), but restyle it as a
  left edge: `absolute left-0 top-6 bottom-6 w-[2px] rounded-full
  bg-[hsl(var(--accent))] shadow-[0_0_24px_2px_hsl(var(--accent)/0.5)]` PLUS a very soft inner
  radial wash `radial-gradient(60% 40% at 0% 50%, hsl(var(--accent)/0.07), transparent 70%)` on
  the same span. The dim pose (opacity 0.5 / scale 0.96 on `[data-pov-inner]`) is unchanged.
- The compact/rail `data-focus` CSS variant mirrors the same restyle (`max-sm:` scoped rules on
  the same span — keep the existing scoping so GSAP never races CSS).

### Contracts that must survive (verify, do not rewrite)
- `compact` pose: every condensed class still ships its `sm:` restoration on the same element;
  a 640px viewport renders byte-identical whether compact is true/false. Re-map the table to the
  new markup (e.g. ghost number `text-[6rem] sm:text-[9rem]`, paddings, solves stacking).
- All 4 includes + both solves lines + CTA in DOM at all times; stepper/readout untouched;
  `data-pov-card/index/inner/focus` attributes and the measure()/quickTo wiring untouched.
- Lucide imports pruned if now unused (`Boxes, Workflow, Activity, ScanSearch` go; keep
  `ArrowRight` only if used for the CTA arrow — otherwise use a text `->` in mono, preferred).

## Acceptance
- Pinned POV pan behaves exactly as before (same runway height, same locks); only the card look
  and focus visual changed. Rail below 640px works with the new compact poses; stepper lights.
- tsc + lint clean; strings byte-identical; no border boxes remain; icon tiles gone.

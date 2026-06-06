# Artifact hover fix + calmer hero scroll

## 1. Production-grade artifact hover bug (BUG)
`src/components/sections/production-grade-section.tsx` → `ArtifactCard`. The "why it matters"
hover reveal is `absolute inset-x-0 top-0` over a `<div className="relative">` that's only sized
to the one-line `<h3>` claim. The why-text is 2-3 lines, so on hover it overflows the container
and bleeds out as a floating text "fragment" overlapping nearby content (only the `<p>` has a
`bg`, so it doesn't cleanly cover).

Fix → clean crossfade in a reserved, fixed-height box (no overlap, no layout shift):
- Wrap the claim + why in a `relative` container with a `min-height` that fits the LONGEST why
  text at the card width (e.g. `min-h-[6.5rem]` sm, tune so no clipping in EN or IT).
- Render claim and why as two layers in the SAME spot (both `absolute inset-0` or stacked),
  crossfading on `group-hover`: claim `opacity-100 group-hover:opacity-0`, why
  `opacity-0 group-hover:opacity-100`, transition opacity ~300ms `--ease-entrance`. No translate
  needed (or a tiny one). Result: hovering replaces the claim with the why, cleanly, in place.
- Touch (`!canHover`): keep showing claim + why stacked inline (current behavior), no overlay.
- Verify nothing clips/overlaps in EN and IT at the 3-column and stacked layouts.

## 2. Hero scroll too sensitive (calmer scrub)
The 400vh pinned spine makes the 6 stage transitions fly by on small scrolls (user: "way too
sensitive, but good"). Make it calmer without removing it:
- `cinematic-system-scroll.tsx`: increase the spine height `400vh` → `520vh` (more scroll distance
  per stage = less sensitive). (Keep the `scrub` value as-is unless 0.6 needs a touch more smoothing.)
- Keep everything else (stages, parallax, snap exclusion of the spine).

## Note
The assisted section snap (Lenis proximity, post-spine sections) is already implemented and is the
intended "assisted scroll between sections" — leave it; no change unless verification shows it broken.

tsc + build green. Hover fix verify: force `:hover`/inspect in browser if possible, else structural.
Reduced-motion safe, no em-dashes, EN/IT.

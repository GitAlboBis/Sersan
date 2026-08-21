# Fit section refactor — "VERDICT WALL" (2026-08-21)

Replaces the pinned branch of `src/components/sections/fit-section.tsx` (the "verdict beats"
theater: medallions, torn redaction bars, accumulation ledgers, title pose proxy). The native
branches (lg+ two-column lists, <lg paired rows with useCentreFocus) are KEPT byte-identical —
they are approved and budget-fitted. Copy: byte-identical, all 12 statements + heading strings.

Reference: noomoagency.com "GREAT WORK CAN'T HAPPEN WITHOUT TEAM A." — pinned giant statement +
tiny right annotation + frosted glass panels flying through the pinned type at depth.

## Pinned layout (SSR default, desktop fine-pointer no-RM)

Sticky frame (`sticky top-0 h-screen overflow-hidden`, inside the runway div; NO ScrollTrigger
pin) contains three fixed layers:

1. **The statement (z-10).** Eyebrow "Selective on purpose" (mono, LabelScrambler treatment if
   trivially reusable, else the SectionHeading eyebrow row) above the title
   "We are honest about who we work with." re-set as the chapter statement:
   - `font-display`, `clamp(3rem, 6.5vw, 7.5rem)`, `leading-[0.98] tracking-[-0.02em]`,
     max-width ~11ch so it breaks into 3-4 lines, left-aligned at container-px;
     "who we work with." keeps the italic span (`font-display italic`).
   - Vertically centered in the frame (Noomo sits it slightly below center: `top-[52%]`,
     translateY(-50%) is fine).
   - It does NOT scrub or pose-morph. It is painted at full opacity from SSR. Delete the
     invisible proxy + measurePose machinery entirely.
   - Subtle life: the whole statement block gets ONE slow scrub-driven drift (y from +14px → −14px
     across the runway via a quickTo chaser) — parallax, not choreography.
2. **The annotation (z-10).** The existing `description` string, top-right:
   `absolute right-[container-px] top-[12vh] w-[300px] max-w-[38vw] text-[13px] leading-relaxed
   text-ink-mute`. Static.
3. **The pane field (z-20, in FRONT of the type).** A `perspective-[1200px]` full-frame layer
   holding SIX `[data-fit-pane]` glass panes, one per GOOD/NOT pair (index i pairs GOOD_FIT[i]
   with NOT_A_FIT[i] — the documented contract).

### Glass pane composition (also the seed of `components/fx/glass-pane.tsx` if extracted)
- Box: `w-[min(30rem,38vw)] rounded-2xl bg-[hsl(216_30%_10%/0.55)] backdrop-blur-xl
  shadow-[0_24px_80px_-32px_hsl(220_60%_2%/0.8)] p-6` — NO border. Top hairline: absolutely
  positioned `h-px inset-x-0 top-0 rounded-full bg-gradient-to-r from-[hsl(var(--accent)/0.7)]
  via-[hsl(var(--accent)/0.25)] to-transparent`.
- Content:
  - row 1: `Check` icon (existing lucide import is fine at this size) in a plain
    `text-[hsl(var(--accent))]` at 16px + GOOD_FIT[i] in `text-[17px] leading-snug text-ink`.
  - hairline divider (`h-px bg-[hsl(var(--rule)/0.6)] my-4`).
  - row 2: mono `✗`-prefixed NOT_A_FIT[i]: `font-mono text-[12px] leading-tight text-ink-mute`,
    with a CSS strike rule that draws in when the pane reaches its HOLD pose:
    `.is-held &::after` scaleX 0→1, origin left, 560ms `--ease-lusion` (same grammar as the
    paired-rows treatment; a wash/strike, never a cover).
  - bottom-right: mono index `0${i+1}` at `text-[10px] tracking-[0.18em] text-ink-dim`.
- The backdrop-blur panes crossing the statement ARE the Noomo money shot — the giant serif
  blurs behind the glass as a pane passes. Panes are small (≤30rem) so the blur region budget
  is fine; never blur a full-bleed layer.

### Choreography (ONE runway trigger, quickTo chasers — binding contract unchanged)
- Runway: `100vh + 6×70vh` px set by `measure()` (BEATS=6, BEAT_VH=0.7 kept), `minHeight:100vh`
  SSR placeholder. ONE ScrollTrigger `top top` → `bottom bottom`, `invalidateOnRefresh`,
  `onRefreshInit: measure`, `onRefresh` immediate snap, init snap after create. Keep the
  existing snapPoint stations (runway start + per-beat lock at u=0.5) and the focusin→Lenis
  lock handler (panes contain no focusables today — keep the handler wired to the beat lock in
  case of future links; the strike row is plain text).
- Beat window i owns u∈[i, i+1] of bp = progress × (6 + TAIL 0.35). Per pane, analytic pose from
  its beat-local t = ss01 clamped windows (smoothstep, C1 — repo convention):
  - ENTER t∈[−0.12, 0.28]: from off-frame at `x: (i even ? +54vw : −54vw)`, `y: +18vh`,
    `rotateZ: (i even ? 4 : −4)°`, `rotateY: (i even ? −16 : 16)°`, `opacity 0, scale 0.94`
    → toward hold pose, opacity → 1.
  - HOLD t∈[0.28, 0.72]: pane parked at its hold pose: lateral slots alternating
    `x: (i even ? +8vw : −2vw)` relative to a right-of-center column so panes overlap the
    statement's right half (Noomo panels overlap the type), `y: −2vh`, rotations decay to
    `±1.5°`. `.is-held` class toggled here (threshold crossing, not per-frame class writes —
    write once on window entry/exit) → the strike draws.
  - EXIT t∈[0.72, 1.12]: continue along the entry vector's opposite: `x` drifts ±10vw further,
    `y: −20vh`, `opacity → 0`, `scale 1.02`, rotate back out. Overlaps the next pane's enter
    (crossfade, never a hard cut).
  - All via per-pane quickTo chasers (x, y, rotateZ, rotateY, opacity, scaleX/scaleY pair —
    never `scale`), ~0.8s expo, identical-value skipping, immediate path on refresh — copy the
    existing makeChase helper. Depth illusion via scale+blur is enough; do NOT animate
    `backdrop-filter` (paint storm) — blur is constant per pane.
  - z-order: panes alternate z-20/z-30 so consecutive panes cross at different depths.
- **Chrome kept:** big mono counter `01 / 06` + thin progress line with 6 ticks (existing
  writers: textContent swap on active change, quantized scaleX). Restyle ticks as small `+`
  glyphs (mono, ink-dim) — igloo/AT garnish.
- **Velocity skew:** keep the existing clamped ±3° ticker-damped skew but apply it to the pane
  field layer only (never the statement).
- SSR pose: beat-0 pane at its HOLD pose (painted inline), others parked at enter-rest; the
  statement fully visible — first pinned frame never empty.

### A11y
The panes carry the REAL copy (no aria-hidden theater any more — the theater and its duplicate
strings are deleted). Keep a visually-hidden intro naming the two groups: an sr-only element
before the pane field: "Good fit: … / Not a fit: …" is NOT needed as list duplication — instead
each pane row keeps the existing sr-only prefixes ("Good fit: " / "Not a fit: ") exactly like
the native paired rows do. The frame keeps `aria-hidden` OFF. Counter/progress chrome stays
aria-hidden.

### Delete list (pinned branch only)
- FitMedallion SVG + quantizedAttrWriter medallion usage in pinned stage (the native branches'
  static medallions can stay if they render there today — do not touch native markup).
- TornStrikeBar + all `data-fit-bar` writers, ledger els/chasers (`data-fit-ledger-*`),
  the title pose proxy (`poseProxyRef`, measurePose, applyPose, stPose, poseTween,
  `[data-fit-pose]` handling in the pinned effect — the span itself stays in the title JSX for
  the italic styling, minus the data attribute), the aria-hidden center theater.
- The runway math, mode detection subscription, mode-flip release effect, fonts.ready refresh,
  cleanup discipline (px height NOT released on EN↔IT) are all KEPT — same skeleton, new actors.

## Acceptance
- Desktop: statement pinned and readable through all 6 beats; panes enter → hold (strike draws)
  → exit with visible crossfade; blur-over-type effect visible when a pane overlaps a glyph;
  console clean; scrubbing up reverses cleanly; EN↔IT toggle rebuilds without ejecting scroll.
- `npx tsc --noEmit` clean, `npm run lint` clean for the file.
- 640px/coarse/RM: byte-identical to current native output (git diff of rendered branches nil).
- No SVG filters remain in the pinned path; no new CTAs; strings byte-identical (verify with a
  grep of all 12 statements + heading strings before/after).

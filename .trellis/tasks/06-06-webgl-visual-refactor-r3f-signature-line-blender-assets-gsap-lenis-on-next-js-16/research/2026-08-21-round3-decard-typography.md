# Round 3 — "DE-CARD" (2026-08-21, owner feedback after round 2)

Owner: "se hai fatto bene il reverse engineering, noterai che raramente ci sono card. Quindi o le
facciamo belle oppure creiamo qualcosa di più bello, come scritte animate e effetti." Plus: the
stream can still be better, and the passage warp gets an igloo-technique upgrade (separate spec,
`2026-08-21-round3-warp-igloo.md`).

Decision: the NEURAL sections (problem + production) drop the glass panes entirely — the
reference grammar is TYPOGRAPHY AS THE OBJECT (Noomo's ghost display words + award list rows,
AT's `->` mono lists, Lusion's chrome-less rule). Services keeps its slabs (dense structured
content + POV camera needs objects; the contour ignition already earns it). Fit keeps its
verdict wall (the Noomo testimonial-panel reference justifies those panes verbatim).

Copy freeze still absolute. No globals.css edits (parallel agents). tsc = gate.

## §A. Problem + Production DOM — "TYPOGRAPHIC LEDGER ROWS" (replaces the panes)

Files: problem-section.tsx, production-grade-section.tsx. stream-pane.tsx loses its consumers —
DELETE the file (grep first). ChapterAnnotation + scramblePaneEyebrow: move/keep the shared
bits wherever cleanest (a tiny fx/chapter-annotation.tsx is fine; the scrambler helper moves
into a shared local util imported by both sections).

### Row anatomy (both sections — full-width, NO box, NO background, NO border-radius)
Each of the 3 items becomes a full-width row over a hairline:

- **Problem row i**: `[mono index 01·] [CAUSE in display serif] [-> in accent mono] [EFFECT in
  GHOST display serif]` on one line at `clamp(1.9rem, 3.2vw, 3.4rem)`; the `body` string as a
  small annotation block (text-[13px] mono-ish text-ink-mute, max-w ~44ch) right-aligned on
  the row's second line (grid `[1fr_minmax(280px,34%)]`, body in the right cell — Lusion
  big-left/small-right pairing). Full-width `border-b border-[hsl(var(--rule)/0.5)]` closes
  the row; generous `py-8 lg:py-10`.
- **Production row i**: `[mono index 01·] [cluster label mono eyebrow]` on a kicker line, then
  the CLAIM in display serif at the same clamp scale (it's a sentence — let it wrap to 2
  lines, `leading-[1.05]`), `why` as the right-cell annotation. Same hairline + padding.
- **GHOST TYPE = the z-interleave illusion.** The EFFECT word (problem) and, at rest, the
  whole CLAIM line (production) render as OUTLINED/GHOST serif: `color: transparent;
  -webkit-text-stroke: 1px hsl(var(--ink)/0.35)` (plus a `text-shadow`-free fallback rule:
  browsers without text-stroke get `text-ink/0.25`). The WebGL river flows BEHIND the DOM but
  shines THROUGH the ghost glyphs — the Noomo grey-word/AT-billboard depth read. On IGNITION
  the ghost FILLS: transition to solid ink (problem effect-word: amber-tinged
  `hsl(36 60% 72%)` since it's the failure; production claim: pure ink with the cluster
  eyebrow going accent).
- **Ignition driver**: `useCentreFocus` on the rows (the existing shared hook — inert on fine
  pointer, centre-band on touch) PLUS hover/focus-within on fine pointer. Ignited row i:
  ghost fills (600ms --ease-lusion), `->` slides +6px, index brightens, and `setHovered(mode,
  i)` fires (ring flare / recohere tease — existing store link). Un-ignited rows sit at full
  legibility minus the ghost treatment (nothing is unreadable at rest — the solid parts:
  index, cause/eyebrow, annotation are always ink/mute).
- **Reveal** (IO once): rows masked line-rise staggered 110ms (reuse the round-2 local
  recipes); the EFFECT/CLAIM ghost word does an AT-style GLYPH DECODE (scrambler helper) as
  its rise lands; annotations fade 150ms later. RM: everything visible, solid-ink state.
- **A11y**: all strings plain DOM in source order (index → cause/label → effect/claim →
  body). Ghost styling is pure CSS on real text (SR-transparent). Rows get tabIndex=0 +
  focus-visible ring; focus = ignition (parity with hover).
- Chapter headings/annotations from round 2 stay exactly as shipped.

### The band (geometry contract with §B — BOTH agents read this)
The stream band is now the WHOLE rows-stack background: `absolute inset-0 -z-10` of the rows
container (which is `relative`), plus `-inset-x-[container-px]` bleed so the river runs
edge-to-edge behind the type. `[data-lattice-anchor]` div = that full bleed box. Ghost
callout labels + dot grid: KEEP, repositioned in the open gaps (right cell gaps problem /
left production). Rings stay at 40/62/84% of the band x (registration unchanged); the DOM no
longer implies any vertical pane column, so §B may weave vertically.
Mobile: rows stack the same (they're SHORT — this should bring Problem/Production back
INSIDE the 954/1114px budgets; measure and report); band persists behind at full height;
`max-sm:` trims paddings only. This replaces the round-1 overflow problem — call out the
final numbers.

## §B. Stream v3 (webgl files only: neuralLatticeConfig / neuralFieldCompute / NeuralLattice)

With the panes gone the river owns the whole band. Push it from "beautiful" to "the section
spine":
1. **Vertical weave**: spline control points gain y-amplitude (up to ±0.30 of band height,
   mode-authored: problem dips as it approaches the fracture — a river losing its course;
   production rises confidently through the rings). The band is now taller (rows stack
   height): scale thickness/point size accordingly (~44px visual envelope at rest).
2. **Curl-noise micro-turbulence** on strand offsets (small, 0.15 gain, 2-octave) so
   filaments shred organically instead of twisting uniformly — AT nebula texture. Compute
   tier only; static tier keeps the analytic twist.
3. **Row-reactive current**: NEW uniform `uRowGlow[3]` (driven from setHovered, replacing
   nothing — ringGlow stays for production): when row i ignites, a localized brightness +
   thickness swell travels the stream zone nearest that row's y (problem: the fracture
   answers row hovers with bigger re-cohere teases; production: the segment between ring i-1
   and i tightens + brightens). The river must visibly ANSWER the reader's attention.
4. **Depth DOF illusion**: size × alpha modulated by the z-bow (far = smaller/dimmer, near =
   bigger/softer via a wider soft-disc falloff) — cheap bokeh read, no post.
5. Everything from round 2 stays (streaks, sparks, shockwaves, breathing). Budgets: still 4
   storage buffers; uRowGlow is a uniformArray (uniform budget, fine). Both backends + dev
   handle extended. SVG fallback: only if trivial (row-hover glow can map to a stroke-width
   bump); do not rebuild it.

## Acceptance
- Zero card/box/pane chrome left in problem/production (grep backdrop-blur in those files =
  0); the type IS the interface; river visible through ghost glyphs; ignition on
  centre/hover/focus with store link; copy byte-identical; budgets measured (expect PASS
  now); tsc clean; RM = solid-ink readable static; reveal choreography award-grade.

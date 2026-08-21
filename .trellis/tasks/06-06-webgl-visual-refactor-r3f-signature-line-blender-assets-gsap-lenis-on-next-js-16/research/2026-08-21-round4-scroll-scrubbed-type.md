# Round 4 — SCROLL-SCRUBBED TYPE (2026-08-21, owner feedback after round 3)

Owner: "le scritte non sono animate con lo scroll come intendevo io. Sì ok passo il cursore e
si illumina dove c'è la rete neurale, ma nulla di più." The round-3 reveals are IO-once
entrances; the owner wants the display type BOUND TO SCROLL — building/filling proportionally
to scroll position, reversible when scrubbing back, award-site style. Hover/centre ignition
stays as the river-link accent ON TOP, but scroll is the primary animator.

IN-REPO PRIOR ART (study first): the /consulting practice-areas "big-type scrubbed ledger"
(IMPROVEMENT_BACKLOG C1, shipped) — full-bleed numbered index with a scroll-active row. Reuse
its scrub grammar/idioms wherever they fit. Scope: problem-section.tsx +
production-grade-section.tsx (+ a small shared util if clean). Copy freeze absolute. No
globals.css. tsc gate.

## 1. Row scrub-fill (the core ask)
Each ledger row gets its own ScrollTrigger scrub (`scrub: true`, raw — Lenis is the smoother;
start ~"top 85%", end ~"top 40%", invalidateOnRefresh; no pin):

- **Ghost word fill wipe**: the ghost EFFECT word (problem) / ghost CLAIM line (production)
  fills LEFT→RIGHT proportionally to the row's scrub progress: implement with
  `background-image: linear-gradient(90deg, <fill-color> 0/100%, transparent 0)` +
  `background-clip: text` + `-webkit-text-fill-color: transparent`, background-size/position
  driven by a quickTo-chased CSS var or backgroundSize percentage (identical-value skip; GSAP
  writes inline style). The text-stroke ghost outline SITS UNDER the fill at all times (the
  un-filled part keeps the outline). Fill colors: problem = the amber failure tone
  (hsl(36 60% 72%)); production = ink. At progress 1 the word/line is fully solid; scrubbing
  back UN-fills it. This is continuous, obvious, reversible — the thing the owner is missing.
- **Cause/claim + index + arrow**: rise/settle on the FIRST 25% of the same scrub window
  (yPercent 40→0, opacity 0.3→1, scrubbed not tweened) so the row visibly assembles as it
  climbs the viewport; annotation (right cell) fades+rises across the last 35%.
- **Hairline**: scaleX 0→1 (origin left) across the middle of the window.
- The IO-once letter-roll entrance is REPLACED by the scrub on these rows (keep RollLetters
  usage ONLY if it can be scrub-driven cleanly — a letter-roll scrubbed by progress with
  center-out stagger offsets is ideal: each letter's yPercent maps to
  clamp(progress·(1+stagger)−stagger); otherwise drop the roll on rows and keep the
  scrub-fill as the hero move; the decode decoys may then live on the ghost fill's leading
  edge only if trivial).
- **Store link unchanged**: hover/focus/centre still fires setHovered → river answers; on an
  already-scroll-filled row the hover accent = glow/hue shift (e.g. drop-shadow-free
  text-shadow via color mix or the existing brightness), NOT a second fill.

## 2. Chapter titles scrubbed
Both sections' chapter h2 (and the annotation): replace the one-shot choreographer entrance
with a SCRUBBED line rise for these two sections only (do not touch the shared
HeadingChoreographer): SplitText lines, each line's yPercent 110→0 + opacity mapped to a
staggered sub-window of a scrub (start "top 90%" end "top 45%"), so the title assembles line
by line WITH the scroll and disassembles scrubbing back. Annotation follows in the last 25%.
`key={language}` + revert discipline as established. (Keep `[data-emerge]` wrapper.)

## 3. Re-entry
Because everything is scrubbed, re-entry replays by construction (progress recomputes). That
also satisfies the Lusion "replays on re-entry" grammar the IO-once version missed.

## 4. Guards
- SSR/no-JS: rows render fully solid (fill 100%, no stroke-only state without JS) — prime the
  scrub poses only when JS arms (same visible-first discipline as the site: arm = set current
  scrub-derived pose immediately via onRefresh init snap).
- RM: NO scrub choreography — static solid final state (the current RM path).
- Coarse pointer/mobile: scrub windows still fine (cheap transforms), but verify no jank at
  390×844; if needed, simplify to fill-only on coarse.
- Zero per-frame gBCR; scrub handlers write via quickTo/quickSetter with identical-value
  skips; all triggers killed on cleanup + EN/IT rebuild (language dep, constant-shape deps).
- The WebGL band/callouts/dot grid and the stream itself are untouched.

## Acceptance
Scrolling through problem/production, the type visibly BUILDS with the scroll (fill wipes,
line rises, hairlines drawing) and REVERSES scrubbing up; hover still flares the river; copy
byte-identical; tsc clean; RM static; no console errors on cold load.

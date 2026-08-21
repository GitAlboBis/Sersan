# 2026-08-21 · Home sections refactor — DIRECTION (owner request)

Owner request (2026-08-21, verbatim intent): refactor **"Selective on purpose"** (fit-section);
in **"What SerSan builds"** keep the camera POV effect but replace the cards; the two
**neural-network sections** (problem + production-grade) — the writings over the network, the side
cards and above all the animation style are all disliked. Take inspiration from the Lusion reverse
engineering in `research/lusion-raw` + `ANALISI_LUSION*.md`, from **noomoagency.com** (specifically
the "GREAT WORK CAN'T HAPPEN WITHOUT TEAM A." section and the one after it), from
**activetheory.net** and **igloo.inc**. Not only effects: also design, big type, page positions.

## Live reverse-engineering findings (2026-08-21, Chrome)

### Noomo — the section the owner pointed at
- Layout: GIANT grotesque statement, 4 lines, ~8-9vw, pinned LEFT for the whole beat
  (`GREAT WORK / CAN'T HAPPEN / WITHOUT / TEAM A.`), tiny ~13px annotation paragraph hung
  TOP-RIGHT (single ~300px column). Nothing else. Enormous negative space.
- Scroll: while the statement stays pinned, **frosted-glass testimonial panels** (client logo +
  quote + name, ~380px wide, backdrop-blur, no borders, soft shadow, slight 3D yaw/tilt) FLY
  THROUGH the frame at different depths — in front of the type (blurring it via backdrop-filter)
  and beside it, entering from right/bottom at staggered lateral positions. 4-5 panels per pass.
- The NEXT section repeats the grammar: `INNOVATE — WITH A HUMAN TOUCH.` giant statement +
  annotation right, then each award (WEBBY / REDDOT / SF DESIGN WEEK / AWWWARDS) as a huge
  grey display word with the physical 3D award object tumbling through the letters, closing on a
  manifesto + LIST ROWS (`FWA ^12 →`) with superscript counters and full-width hairlines.
- Showcase slides before that: one giant word (IMMERSIVE / INTERACTIVE / ENTERPRISE / BESPOKE)
  edge-to-edge with a 3D object intersecting the letters (in front + behind), meta chip bottom-left,
  title+paragraph bottom-right, pill CTA centered. Type is DOM-hidden/WebGL-drawn; bg periwinkle
  `rgb(201,210,231)`; display font NeueMachina uppercase.

### Active Theory
- ONE fullscreen canvas renders EVERYTHING including type (font "nbarchitekt", square mono
  grotesque); DOM is a bare semantic skeleton. Black bg, electric blue/cyan accents — closest
  palette sibling to SERSAN.
- Home = scroll-driven particle world: glass "a" emblem ring + ribbon curve (their signature-line
  analogue), dissolving into dense particle nebulas; project billboards float as **frosted glass
  panes in 3D space**, titles typed with a glitch/decode animation.
- Chrome: capsule nav with a light streak, mono ticker `<< THEMIS >>`, `SCROLL DOWN` mono label,
  ASCII-hatched preloader circle with `/61` counter, `->` arrow list ("WHAT ARE YOU LOOKING FOR?
  -> WEBSITES / INSTALLATIONS / ...`). Terminal-flavoured MICRO-copy, never fake console windows.

### Igloo (via published breakdowns; live boot gates on window visibility)
- ASCII/character-based loader (`==----=+=`), grey-blue fog world, voxel/greebled iceberg,
  **scroll animation baked into a data texture** (`scroll-datatexture.ktx2`), mono type, dashed
  `+ = -` divider motifs, camera journey punctuated by sparse DOM text beats.
- See `2026-08-21-igloo-dossier.md` (research agent output) when present.

### Lusion (in-repo distill — see recon workflow output)
- 8vw chapter titles span-12, `line-height:1`, optical-left; big-display-left + tiny-mono-right
  pairing; NO boxed cards ever (chrome-less media/caption tiles); scramble eyebrows 40cps;
  letter-roll titles; `--ease-lusion` = cubic-bezier(.35,0,0,1); hover = spring parallax;
  z-interleaving of WebGL with headlines. SERSAN's featured-work already ships this DNA
  (RollingTitle, LabelScrambler, FeaturedWorkPlanes SOD springs).

## The shared vocabulary for the four refactored sections

1. **Chapter type scale.** Each section's EXISTING title string (copy freeze is absolute — PRD
   2026-06-06; only presentation changes) is promoted to a chapter statement:
   `clamp(2.6rem, 5.5vw, 6.5rem)` display serif, `line-height: 0.98`,
   `letter-spacing: -0.02em`, spanning the full container, italic span kept. Eyebrow stays mono +
   LabelScrambler. The `description` paragraph MOVES to a small right-hung mono-ish annotation
   column (~300-340px, top-right of the heading block, `text-[13px] text-ink-mute`) — the
   Noomo/Lusion pairing — instead of sitting under the title at paragraph width.
2. **Glass panes, not cards.** One new shared component `components/fx/glass-pane.tsx`:
   chrome-less frosted pane — `bg-[hsl(216_30%_10%/0.55)] backdrop-blur-xl`, NO border box; a
   single top hairline (`h-px` gradient cyan→transparent) and soft ambient shadow; large radius
   `rounded-2xl`; content = real DOM copy. Subtle 3D pose (perspective parent, small rotateX/Y).
   Hover: spring-ish tilt toward cursor + hairline brightens (CSS transitions on transform/opacity
   only, `--ease-lusion`). This replaces NeuralCard chrome AND the services boxed card.
3. **Motion vocabulary** (replaces boot beats / packets / SVG displacement everywhere):
   scramble eyebrows, letter-roll or SplitText cascade titles, panes slide/blur-up in with
   expo easing, scroll-scrub via the ONE-trigger runway + quickTo chasers contract, velocity
   micro-shear where already established. Reduced-motion: settled final state, nothing hidden.
4. **ASCII micro-chrome (garnish, sparing):** mono counters (`01 / 06`), `->` arrows, `+`
   list markers, dashed hairlines — AT/igloo flavour on labels only. NEVER fake console windows
   (rejected precedent).

## Per-section direction (specs in sibling files)

- **Fit → "Verdict wall"** (`2026-08-21-fit-verdict-wall-spec.md`) — Noomo Team-A literal:
  pinned giant title, annotation right, six paired glass panes flying through the pinned type.
  Deletes SVG filter machinery. Native branches (two-col lists / paired rows) KEPT as-is.
- **Services → "Service slabs"** (`2026-08-21-services-slab-spec.md`) — POV camera pan KEPT
  byte-for-byte; only `ServiceCard` is recomposed as a chrome-less slab (ghost number, serif
  title, mono includes with `+` markers, hairline zones, edge-glow focus instead of ring).
- **Problem + Production → "Signal stream"** (`2026-08-21-signal-stream-spec.md`) — one shared
  new language replacing the NeuralLattice look: a dense luminous particle STREAM (broken =
  fractures/disperses; healthy = threads three guide rings and locks laminar), Lusion detail
  layout (chapter heading + annotation, panes offset beside the field), no marker-opens-card.

## Hard constraints recap (from constraints brief — binding)

- Copy freeze absolute (D-17 already handled). EN/IT strings byte-identical.
- `[data-line-anchor]` wrappers in page.tsx untouched; runway/sticky idiom, never ScrollTrigger
  `pin:`; quickTo chasers with identical-value skip; zero gBCR in frame loops; snapPoint stations;
  Lenis singleton focusin locks; SSR-first pinned markup; mode detection subscribed.
- Problem keeps `[data-emerge]` (singularity passage landing) and its store bump surface.
- Production keeps `productionPulseStore.bump()` on in-view.
- neuralLatticeStore API may be re-purposed (same globalThis-pinned store, new consumer) but the
  SVG fallback twin must move in the SAME commit as the WebGL look.
- Mobile budgets: Problem 954px / Services 1013px / Production 1114px / Fit 1097px @390×844;
  640px fine-pointer renders byte-identical to main unless the spec says otherwise; coarse
  `section-lg` = 3.5rem padding; PostFX off on phones; filter concurrency ≤2 (moot — we delete
  SVG displacement filters).
- Accent: cyan #3BE1FF → blue #2A7FFF, NO violet. Status hues only inside production artifacts.
- Exactly 3 /start CTA moments on home — do not add CTAs.
- 60fps desktop; transform/opacity only; backdrop-blur only on small panes (never full-bleed
  scrolling containers); GSAP free tier.

## Rollout order

1. Fit verdict wall (clearest mandate, biggest simplification).
2. Services slab card (smallest blast radius).
3. Problem + Production signal stream (WebGL + fallback, biggest).
Each: trellis-implement → trellis-check → live QA (Chrome, session's own dev port) → commit.

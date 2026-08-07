# IMPROVEMENT BACKLOG — autonomous creative-engineering loop

Working document for the continuous improvement loop (audit → prioritize → implement →
verify → commit). One coherent improvement per iteration. Sources: 2026-08-07 deep
audit (10-agent workflow: 8 reference deep-readers + unfinished-work auditor + WebGPU
correctness auditor) cross-checked against first-hand reads. Reference dossiers:
`_refs/DOSSIERS.md` (gitignored study material).

Legend: impact P0 broken → P3 nice-to-have · effort S/M/L · `[ ]` open `[~]` in
progress `[x]` done (commit).

---

## A. WebGPU correctness (fix broken/silently-dead animation logic first)

- [x] **A1 · P1/M — Frozen-varying family (TSL VaryingNode hoisting trap).** (aa707d4) Same trap
  fixed once in 5562211; still live in three modules. (1) `neural/neuralFieldCompute.ts`
  compute branch (~669-730) AND static branch (~463-544): all 7 varyings (vDepth, vRole,
  vDead, vGlow, vBurst, vAlive, vSignal) frozen at declaration constants — the
  travelling signal packets, depth gradient, dead-arc dimming, hover flare, burst flash
  and dispersal fade NEVER render. (2) `gpgpu/gpgpuNodeSim.ts`
  createStaticParticleNodeBuild (~1828-1878): vLiftF frozen at 0 — fallback hero never
  shifts cyan/brightens on hover. (3) `materials/particleNodeMaterial.ts` (~123-149):
  vFade frozen at 1 — WebGPU drift dust ignores depth fade (parity break vs GLSL twin +
  extra additive overdraw). Fix = self-contained expressions passed straight to
  `varying(...)` per gpgpuNodeSim.ts:1244-1264 documentation. → ITERATION 1
- [x] **A2 · P2/S — Frame-loop dt hygiene.** (this commit) `SignatureLine.tsx:1021` `uTime += delta`
  unclamped (phase pop after background tab; every sibling clamps at 1/30);
  `fluid/PointerFlowmap.ts:242` dissipation+splat are per-frame not per-second (2.4×
  faster decay at 144Hz — only frame-rate-dependent integrator left; fix
  `pow(dissipation, dt*60)` + splat×dt·60).
- [x] **A3 · P1/M — GPU-loss resilience.** (this commit) `FrameDriver.tsx:31`: (1) no
  `device.lost` handling on the true-WebGPU backend — after TDR the R3F loop dies with
  the Lenis pump latched → scroll freezes permanently (violates its own header
  contract); (2) `webglcontextlost` handler lacks `event.preventDefault()` so
  `webglcontextrestored` can never fire.
- [x] **A4 · P2/S — HeroLogo sporeHomes sync stall.** (this commit) `HeroLogo.tsx:354`: ~74k rejection
  samples synchronously in useMemo during the preloader handoff — the exact stall the
  file avoids for homeField 10 lines earlier. Same rAF/effect deferral.
- [ ] **A5 · P3/S — Portrait coverage threshold mixes device DPR with render DPR.**
  `FounderPortraitMorph.tsx:583` + gpgpuNodeSim.ts:1328: soft-edge band over-dimmed up
  to 4× on machines where AdaptiveResolution holds render DPR below device DPR.
- [ ] **A6 · P3/S — HeroTextParticles per-frame getBoundingClientRect** for the whole
  gated intro (`HeroTextParticles.tsx:601`) — cache per build/resize epoch like siblings.
- [ ] **A7 · P3/S — tierStore.degrade() has no callers**; docblocks in 3 files promise a
  runtime degradation path that does not exist. Wire to a real trigger or delete + fix docs.
- [ ] **A8 · P3/doc — Binding-budget walls (no code change today).** Compute kernel at
  8/8 storage buffers; founders cell union 51,751/60,000 (~16% margin) before the
  silent stride-2 cliff. Any 5th home target or new per-particle buffer fails the
  pipeline silently. Keep in mind for every morph/particle iteration.

## B. Unfinished / broken product surface

- [x] **B1 · P1/S — Booking copy promises slots that don't exist.** (this commit) CAL_ENABLED=false +
  dead slug, but `/audit` (audit-client.tsx:476,499) and `/contact`
  (contact-client.tsx:271-291) still say "Pick a 30-minute slot". Rewrite to match the
  written-intake fallback (or ship the real Cal link — owner decision; default: fix copy).
- [x] **B2 · P1/S — Footer links to unowned socials** (this commit; end state LinkedIn · Instagram · Email) (twitter.com/sersan_io,
  github.com/sersan — footer.tsx:382,392). Replace with LinkedIn/Instagram per brand
  data, or drop.
- [x] **B3 · P1/M — /start is English-only.** (this commit; split page/start-client with
  isEn, IT in the site's voi register, SplitText key={language} contract, Reveal stagger
  on the step cards — B11's full typographic redesign still open)
- [ ] **B4 · P1/L — 60-second self-audit engine built and never rendered**
  (data/audit-questions.ts — 226 lines, bilingual, zero importers). Exactly the
  interactive non-card moment the owner wants. Build the choreographed quiz UI (big-type
  question beats, scored map reveal) or delete the data.
- [ ] **B5 · P1/M — Resources is a 3-article stub with CMS TODO** around
  production-grade FX machinery. Needs an owner content decision (MDX in repo is the
  cheap path); renderer TODO (B10) rides along.
- [ ] **B6 · P2/M — i18n dictionary 97% dead** (322/330 keys orphaned in en.ts/it.ts;
  real i18n is inline ternaries; 5 IT values byte-identical to EN). Prune to
  cal.fallback.* or migrate for real. Includes founders.ts dead roleKey/bioKey pointing
  at wrong-persona keys.
- [x] **B7 · P2/S — Dead components (~750 lines):** deleted (this commit).
- [x] **B8 · P3/S — Retired WebGL modules:** CompliancePipeline3D + linkedParticlesNodeSim
  + both legacy logo materials deleted (this commit; latent vDisp trap gone with them).
  SURVIVORS (post-merge re-verify): compliancePipelineStore is WRITTEN by the live
  /trust DOM diagram (write-only, reader deleted) and linkedParticlesConfig feeds it +
  compliancePipelineNodeMaterial — that material is now itself orphaned. → follow-up
  cluster B8b once the /trust store write is addressed.
- [x] **B9 · P3/S — Stale TODOs that lie:** both rewritten (this commit).
- [ ] **B10 · P3/S — Hand-rolled markdown renderer** on resource detail (self-flagged
  TODO) — do with B5.
- [ ] **B11 · P3/S — /start "What happens next": 3 static bordered cards, no entrance
  anim, on the primary conversion page.** Fold into B3.
- [ ] **B12 · P3/M — Spec'd newsletter + cookie banner absent** (only orphan dictionary
  keys remain). Owner decision: build or strike from spec. /trust promises opt-in
  analytics cookies → consent mechanism needed IF analytics ever ship.
- [ ] **B13 · P2/S — /case-studies "Building in the open": one lone card in a 2-col
  grid.** Redesign as full-width typographic statement (no card).

## C. Visual quality — "LESS cards, MORE animation/effects/transitions, BIG text"

Reference-backed redesigns (each consumes its dossier; personally re-read the repo's
key files before implementing — §1.4):

- [x] **C1 · P2/M — /consulting practice areas → big-type scrubbed ledger.** (this
  commit) Full-bleed numbered index, scroll-active row + hover/focus override, SSR
  static-open, RM/mobile ledger. OPEN FOLLOW-UP C1b: the old cards linked 5 rows to
  /services/* — links removed per spec (no orphaned routes; home cards still link);
  consider a small "Explore →" inside the expanded description. RESOLVED (owner
  delegated): the historical five hrefs restored via git evidence as "Explore →" /
  "Approfondisci →" inside the height-clip (this commit).
- [x] **C2 · P2/M — /consulting engagement formats → three big-type acts.** (this
  commit) One-shot entrance timelines (rule draw → number+tick → masked title →
  deliverable cascade), two-column hairline tables, act 02 offset on xl. Note: the old
  cards carried NO CTAs (audit claim corrected) — conversion path unchanged (#intake).
- [x] **C3 · P2/M — /consulting process map → scrubbed drawn spine.** (this commit)
  Horizontal accent spine draws with scroll, stations ignite at their fraction along
  it (reversible); vertical static variant below lg/coarse/RM. The /consulting trio
  (C1+C2+C3) is complete — the route went from zero GSAP to three coherent moments.
- [x] **C4 · P2/M — /audit six surfaces → big-type ledger.** (this commit) Port of the
  practice-ledger grammar (data-sl-*, duplicated with header note — shared-hook
  refactor deferred); DisplacementWipeReveal usage removed (component kept,
  now consumer-less → future cleanup); micro-tag idea skipped (no per-surface
  source data — refusing to invent claims).
- [x] **C5 · P2/M — /audit second half → door beats + hairline accordion.** (this
  commit) Doors as three equal-dignity typographic beats (engagement-acts grammar,
  subordinate scale); FAQ on Radix primitives with forceMount + grid-rows clip
  (ui/accordion wrapper unsuitable: unmounts closed content, no keyframes). Note:
  fx/displacement-wipe.tsx is now consumer-less → future cleanup batch.
- [x] **C6 · P2/L — /trust card walls retired.** (this commit) Standards → sober mono
  ledger (derived status labels); GDPR roles → paired beats; controls → hairline
  table; FAQ → shared HonestFaq (promoted to components/ui, audit import updated);
  retention/contact stripped to hairlines. CompliancePipeline untouched; all six
  data-line-anchor waypoints preserved (the spec's side-index never existed in this
  build). Finding logged: AGENTS.md's AI-specific controls (kill switch/eval gates/
  output review) are NOT in the page copy → owner content decision.
- [x] **C7 · P2/S — /about "Three rules" → numeral-hero beats.** (this commit)
  Door-beats grammar with the 01/02/03 numerals as serif heroes (accent-dimmed,
  em-scaled tick), title subordinated, desc at reading width. OurWhy's 2×2
  operating-principles grid remains (the audit's "acceptable" quieter offender).
- [x] **C8 · P2/M — /services/* template redesigned.** (this commit) What-we-build →
  compact static-open ledger (hover brighten only); use cases → reduced-amplitude
  beats (new use-case-beats.tsx); deliverables → hairline table; related case
  studies → typographic link list (links preserved). One fix, four routes.
- [ ] **C9 · P2/L — Home section-cut grammar (era-residence dossier):** first boundary
  (pinned hero → credibility) gets the bottom-rising limb / aperture dive; propagate to
  every hard cut. THE "immersive continuity" item.
- [ ] **C10 · P2/L — /case-studies index (noise-scale + pavel dossiers):** card wall →
  full-viewport inertial deck with contour-band hover, click-activate → [slug]
  transition. Big build; decide vs keeping the (good) existing FLIP grid.
- [ ] **C11 · P2/L — /audit hero (CONFLICT to resolve):** singularity black hole vs
  three-skull fluid X-ray — both dossiers claim this slot. Lean singularity (space
  mood, no GLB dependency, exact stack match); if so, skull's fluid mask gets an
  alternate home or a documented pass.
- [ ] **C12 · P3/M — /contact typing particles (typing-tutorial dossier):** intake
  message field condenses the visitor's words out of cyan spores.
- [ ] **C13 · P3/M — [slug] imagery reveal (r3f-image-reveal dossier, MIT):** one
  dissolve language — imagery materializes as the hero de-materializes.
- [x] **C14 · P1/M — Preloader particle-tunnel rebuild (OWNER DIRECTIVE 2026-08-07).** (2715953)
  Owner: current preloader is "too static, monochrome, under-animated"; the designated
  reference is the GreenSock/TroisJS tunnel (`_refs/snippets/preloader-intro-troisjs.js`).
  Replace the 2D starfield backdrop with a faithful raw-WebGL port of the 50k-point
  z-loop tunnel (cyan/blue/white on navy, pointer tilt, additive soft sprites) and use
  the warp beat (timeCoef 1→100 + zoom blur) as the exit into the hero, synced with the
  existing mark fold→zoom→streak choreography. Keep: truthful readiness signals,
  watchdog, reduced-motion skip, single rAF, Lenis parking. → ITERATION 2

## Iteration log

| # | Item | Commit | Verified |
|---|------|--------|----------|
| 1 | A1 frozen-varying family | aa707d4 | tsc ✓ · adversarial check CLEAN · browser ✓ (signal beams travel the Problem-lattice arcs) |
| 2 | C14 preloader particle tunnel | 2715953 | tsc ✓ · browser ✓ (tunnel + fill + handoff; warp beat lands with mark zoom) |
| — | merge origin/main (6 commits, other-PC work) | b8e542c | no conflicts · tsc ✓ · browser ✓ (tunnel→warp→one-beat intro→hero composes) |
| 3 | A2 frame-loop dt hygiene | f59151c | tsc ✓ · 60Hz bit-identity proven · browser ✓ (loop alive, console clean) |
| 4 | A3 GPU-loss resilience | af75419 | tsc ✓ · guard analysis (WebGL/fallback/WebGPU) · browser ✓ happy path inert |
| 5 | A4 sporeHomes rAF deferral | f196922 | tsc ✓ · single consumer null-gated + new shape gate · browser ✓ |
| — | owner: preloader zoom+fade exit | dbd72e9 | browser ✓ (clean handoff, no wipe artifacts) — PUSHED |
| — | owner: hero lockup inversion (2 rounds, empirical calibration) | b246372 | browser ✓ (mark top in-frame, wordmark below, ~4vh gap) — PUSHED |
| 6 | B1+B2 booking copy truth + owned socials | b8eab6f | tsc ✓ · browser ✓ (/audit CTA + footer icons) |
| 7 | B7+B8+B9 dead-code purge (−2,181 lines, 2 files correctly SKIPPED on post-merge re-verify) | c5d4737 | tsc ✓ · npm run build ✓ (40 pages) · browser ✓ (/trust + home on clean server; the LOCKUP_BELOW console burst was a stale Turbopack HMR chunk from the pre-rename graph — source grep clean, prod build unaffected) |
| 8 | B3 /start bilingual | d40911a | tsc ✓ · browser ✓ (EN intact, IT toggle full-page, split-reveal remounts clean) |
| 9 | C1 consulting practice ledger | a2e2602 | tsc ✓ · browser ✓ (scroll-active row migrates, tick+underline, desc expands) |
| 10 | C2 engagement acts | (this commit) | tsc ✓ · browser ✓ (entrance caught mid-play, alternating offset, hairline tables) |

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
- [x] **B4 · P1/L — 60-second self-audit SHIPPED.** (this commit) The dormant engine
  becomes /audit's participation beat: big-type one-question-at-a-time flow, hairline
  answers, drawn progress, top-3 findings as mini-beats bridging to #book-call, honest
  empty state. Hardened after a live-found interleaving bug: transitions are now
  state-first (content never hostage to a tween), clock-based cooldown, atomic fromTo
  poses, finally-guard watchdog. Verified end-to-end incl. the click+scroll repro.
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
- [x] **C11 · P2/L — /audit hero = the raymarched black hole.** (this commit; owner
  delegated the call) License-clean re-implementation of the singularity dossier with
  lead-verified locked math, uCamLocal generalization of the identity-only camera
  shortcut, runtime-generated textures (tileable value-noise + deterministic equirect
  starfield), cyan/navy ramp, PostFXNodes bloom contract confirmed (peak luminance
  ~3.3 > 1.0). yLift 0.15 live-calibrated. The skull fluid X-ray takes the documented
  pass (dossier retains the technique).
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

- [ ] **B14 · P2/S — Native instant-scroll desyncs Lenis and wedges the hero.** A native
  scroll teleport (keyboard Ctrl+Home/End, scrollbar drag, find-in-page jump) moves
  `window.scrollY` without Lenis: its virtual value stays where it was, so the
  scrollStore-driven WebGL keeps the lockup dissolved and the eclipse at fade 0 while
  the page sits at the top — looks like a dead hero until the user wheels once.
  Repro 2026-08-07: Ctrl+Home from ~400vh → stuck at scrollY 185, `lenis.scrollTo(0,
  {immediate:true})` ignored. Pre-existing (Lenis integration era), NOT part of the
  hero fix round. Fix direction: listen for native `scroll` events not originated by
  Lenis and re-sync (`lenis.scrollTo(window.scrollY, {immediate: true, force: true})`),
  or enable Lenis keyboard handling.

- [ ] **B15 · P3/S — Services mode detection is a one-shot matchMedia sample**
  (services-section.tsx, detection effect): unlike fit-section's subscribed queries, a
  window snapped narrow / devtools dock / OS reduced-motion toggle after mount never
  flips pinned↔native without a reload. Pre-existing at HEAD, deliberately left out of
  the 2026-08-21 slab restyle (spec scoped to card composition only). Convert to the
  fit-section subscription pattern + mode-flip refresh guard (MOBILE_TODO B1 twin).

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
| 9-16 | C1-C8 route redesigns + B-fixes | a2e2602…4cf91ad | all browser-verified per rows above — PUSHED |
| 17 | C11 black hole hero + owner fix round | d9c2e33 + d735253 | shader compiles live · halo killed (true transparency) · 3D orbit · 2 live calibration rounds |
| 18 | C1b ledger links + trust AI controls | 4e55d1b | browser ✓ (Approfondisci in the clip; accent rows) |
| — | owner: hero package — bigger lockup + auto-burst (333e936), home eclipse (2697581), horizontal credibility passage (9990e58), intro retiming + flyby base (e485e20), accretion upgrade: infall + horizon kill + wordmark warp | 0360a01 | tsc ✓ · full orbit verified live at real speed (foreground tab): early mark formation, auto-burst at 0.75, eclipse ignite, near-phase shredding toward the live hole, far-phase full recovery, console clean |
| — | owner fix round: first-orbit capture (bob phase negated — first near-approach ≈13s), live-position chase (ALIVE re-aim + ghost homing), header hidden inside the hero (reveal ≈232vh), composition down 5vh (LOCKUP_OFFSET_Y −0.04 · brand 18vh · yFrac −0.47 · anchor 0.01) | aff98d8 | tsc ✓ · browser ✓ first-orbit stream at ~9-15s curving to the live hole · header hide/reveal both directions · smooth scroll down/up recovers scrollY 0 fade 1.0, lockup reassembles, console clean — PUSHED |
| — | owner redesign: credibility passage → "Delivery Reel" (workflow: 3 concepts + judge; winner implemented by trellis-implement). Institution logos back as crafted SVG components (institution-marks.tsx, real vectors, fore lockup + giant back silhouette), one verbatim delivery metric per frame, filament rail, slide-up exit DELETED (luminance ramp + 90° line handoff into pre-composed divario). trust-wordmarks.tsx deleted (zero imports) | 675ae5e | tsc ✓ · dev server compiles+serves clean · owner-directed push before automated browser QA — PUSHED (superseded same evening by the plunge sequence below) |
| — | owner redesign: THE LONG TAKE — Delivery Reel removed (credibility-strip.tsx deleted, institution-marks.tsx parked for /about reuse); singularity-passage.tsx: 460vh one-shot sequence 05-handover echo → camera-right pan (seqPanX in SignatureLine) → world-anchored SequenceSingularity growing on pure 2.1445/dist law (16→1.9, exponential-in-eased-progress, micro-hold at d≈6) → raymarch→preloader-tunnel crossfade at p 0.72-0.80 (setCenter NDC lock, iterations 96→64, DPR cap 1.5) → PURE SPEED warp 100 → divario heading condenses from the vanishing point (seam scrub + data-emerge). Fallback matrix: CSS 1/d imposter (lite/coarse), null-tunnel dark plunge, RM static spacer | bfe5539 | tsc ✓ · next build ✓ — first half rejected by owner same evening (05 duplicated; traverse read vertical) → fix round below |
| — | owner fix round on the Long Take: spine 01→04 (SPINE_HEIGHT_VH 390→315), section 05 moved wholesale as panel 1 of a TRUE horizontal parallax track (credibility-strip grammar: track −63vw at 1.15×, world 1.0×, quickSetters, focusin net, panel interactive); plunge rebuilt as owner-mandated ONE-SHOT: forward crossing of p 0.985 fires a ~3.2s accelerating timeline — march swallows the frame with NO fade (hidden only at full black), covert lenis.scrollTo(#problem) under cover, tunnel warp→100 inside the black, divario lands as zoom-in (scale 0.8→1 from the vanishing point); Esc/reverse-gesture skip, re-arm below p 0.6 | (this commit) | tsc ✓ · next build ✓ (40/40) · browser QA = owner's verdict; knobs in seqStore.SEQ (TRIGGER_P, REARM_P, PLUNGE_*_S, ZOOM_*) |
| 19 | B4 self-audit quiz (+ interrupt-safety fix after live repro) | (this commit) | tsc ✓ · full flow verified: intro→5Q→top-3, click+scroll repro passes, IT verified |
| 9 | C1 consulting practice ledger | a2e2602 | tsc ✓ · browser ✓ (scroll-active row migrates, tick+underline, desc expands) |
| 10 | C2 engagement acts | (this commit) | tsc ✓ · browser ✓ (entrance caught mid-play, alternating offset, hairline tables) |

# Restyle step 1 — Bonifica: orphan cleanup, copy-drift fixes, dead proof chips, routeFx gaps

## Goal

Execute step 1 ("Bonifica — quick wins, zero design risk") of `PIANO_RESTYLE.md`: remove
verified-orphan section components, fix the SOC 2 / ISO 27001 compliance copy drift, resolve
the dead-code hero proof chips, and fill the routeFx/route-curve gaps so the signature line
reaches every page. All items are mechanical or near-mechanical; no narrative or visual
redesign happens in this task (that's steps 2+).

## What I already know (verified in code, 2026-06-10)

* **Orphan components** (zero imports anywhere in `src`, only self-referencing ids/aria):
  `founders-note-section.tsx`, `how-we-think-section.tsx`, `four-layer-scroll.tsx`,
  `the-studio.tsx`, `manifesto-beat.tsx`, `interactive-audit.tsx`, `featured-articles.tsx`,
  `faq-section.tsx`, `audit-section.tsx` — all in `src/components/sections/`.
  Salvage note: the two sharpest refusals in `audit-section.tsx` ("AI without a kill
  switch", "Demos without eval sets") are reused in step 3 (FitSection) — git history
  preserves them, no copy needs saving outside git.
* **framer-motion**: 9 consumers; 7 are the orphans above. After deletion only
  `reveal-on-scroll.tsx` and `navbar.tsx` remain → the dependency itself is dropped in
  step 8 (port those two to GSAP), NOT in this task.
* **Copy drift (SOC 2 vs ISO 27001)** — canonical truth per /trust + AGENTS.md is
  "ISO 27001 (in progress) · aligned with DORA & the EU AI Act"; no SOC 2 claim exists:
  * `src/app/faq/faq-client.tsx:149-150` — "SOC 2 Type II certification is in progress" +
    "Infrastructure is hosted in the EU (London)" (factually wrong twice: SOC 2, and
    London is not EU). IT mirror at :150.
  * `src/app/faq/faq-client.tsx:171-172` — same SOC 2 claim, "London (EU)". IT mirror.
  * `src/data/translations/en.ts:67` + `it.ts:67` — `'hero.compliance': 'GDPR & SOC 2
    aligned'`. Key is defined but **never consumed** (verified by grep).
* **Dead hero proof chips** — `src/components/sections/cinematic-system-scroll.tsx`:
  `extras` (the "13 named engagements / 5 tier-1 institutions" chips + capability row) is
  defined ONLY on the hero stage (line ~103) but both render sites gate on
  `{!isHero && stage.extras}` (lines 480, 619) → never renders on any path.
* **routeFx gaps** — `src/webgl/store/routeFxStore.ts` `ROUTE_FX` has entries only for
  /trust, /consulting, /audit, /about. Missing: **/case-studies, /resources, /contact**
  (they have curves in `routeCurves.ts` but fall back to HOME_FX verbatim).
* **route-curve gaps** — `src/webgl/curves/routeCurves.ts` covers 8 routes. Missing: a
  shared "detail" config for `/case-studies/[slug]`, `/resources/[slug]`, `/services/*`
  (4 pages), `/start`.
* **/trust anchors** — audit flagged mislabeled `data-line-anchor` names on /trust
  (verify exact names during implementation; rename to match section content).

## Requirements

1. Delete the 9 orphan section components.
2. Fix compliance copy drift:
   * faq-client: SOC 2 → ISO 27001 ("ISO 27001 certification is in progress"), "EU
     (London)" / "London (EU)" → "London (UK)"; EN + IT both.
   * translations en/it `hero.compliance`: replace 'SOC 2' with 'ISO 27001' (keep key —
     unused but harmless, and the corrected value is safe if later consumed).
   * No other copy changes (hard constraint: copy stays as on the current site).
3. Resolve dead proof chips per user decision (see Decision below).
4. Add the 3 missing `ROUTE_FX` entries (/case-studies, /resources, /contact) — small
   deltas consistent with the existing tone comments (deltas never change identity).
5. Add a shared "detail" route-curve config + routeFx fallback for [slug] templates,
   /services/*, /start (pure data, reuse existing curve-building machinery; conservative
   quiet tone — these are reading pages).
6. Verify and fix /trust `data-line-anchor` names.
7. Each requirement lands as its own small commit on `feat/webgl-refactor`; no push.

## Acceptance Criteria

* [ ] `grep` for each deleted component name returns no hits in `src`.
* [ ] Build passes (`next build` or dev compile clean), no TS errors.
* [ ] No "SOC 2"/"SOC2" claims remain anywhere in `src` except the /start intake
      placeholder ("e.g. EU data residency · SOC2 in flight") which is a user-input
      example, not a claim about Sersan — left as-is.
* [ ] No "EU (London)" / "London (EU)" strings remain.
* [ ] Proof chips: resolved per decision (rendered where decided, or removed) — verified
      visually in Chrome (desktop + mobile).
* [ ] `routeFx('/case-studies' | '/resources' | '/contact')` returns route-specific tone.
* [ ] Signature line renders on /services/*, /start, and both [slug] templates (visual
      check), with no console errors.
* [ ] Home, /trust, /faq render visually unchanged except the decided chip change.

## Definition of Done

* Lint / typecheck green; dev console clean on touched routes.
* Chrome screenshots desktop+mobile for: home hero (chips decision), /faq, one /services
  page, one [slug] page.
* Small descriptive commits on `feat/webgl-refactor`; NO push (git policy).

## Out of Scope (later steps of PIANO_RESTYLE.md)

* Deleting the /faq route or merging its content into /consulting//audit//trust (step 2).
* Home section reordering, credibility strip remount, CTA dedupe (step 2).
* Any typography presets, FitSection refusal absorption (step 3).
* framer-motion removal / porting reveal-on-scroll + navbar to GSAP (step 8).
* Any new WebGL effects (steps 4-7).

## Decision (ADR-lite)

**Context**: the hero proof chips (13 engagements / 5 tier-1) are dead code; three valid
resolutions with different visual outcomes.
**Decision**: (A) — user confirmed 2026-06-10: rewire the proof chips onto the FINAL
spine panel (the stage where the morph releases into the page). Hero panel stays minimal.
**Consequences**: credibility vacuum fixed within this task at zero new design; the
step-2 credibility strip will complement (tier-1 names marquee), not duplicate, the chips.

## Technical Notes

* Plan source: `PIANO_RESTYLE.md` §9 step 1; diagnosis §1; verification notes ⚠️/✅.
* Constraints: copy unchanged except factual drift; signature line impianto untouched
  (curves are pure data additions); palette/identity invariant (ROUTE_FX deltas only).
* Files: `src/components/sections/*` (deletions), `src/app/faq/faq-client.tsx`,
  `src/data/translations/{en,it}.ts`, `src/components/sections/cinematic-system-scroll.tsx`,
  `src/webgl/store/routeFxStore.ts`, `src/webgl/curves/routeCurves.ts`,
  `src/app/trust/trust-client.tsx` (anchors).

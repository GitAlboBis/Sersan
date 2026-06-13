# Restyle step 3: typography presets — masked SplitText H1 reveal, scramble eyebrows, StatCounter, Redacted Reveal on Fit

## Goal

Execute step 3 of `PIANO_RESTYLE.md` §9 (typography pass, DOM-only, no WebGL changes).
Research showed the engines mostly EXIST and are orphaned — this task is primarily
**wiring + 3 targeted extensions**, not greenfield:

* `HeadingChoreographer` (src/components/fx/heading-choreographer.tsx, mounted in layout) is a complete SplitText line-mask engine targeting `[data-split-reveal]` — zero subscribers today.
* `LabelScrambler` (src/components/fx/label-scrambler.tsx, mounted in layout) already decodes `.eyebrow` labels — but skips ALL composite (dot-prefixed) eyebrows, i.e. every page-hero eyebrow.
* `CountUp` (src/components/ui/count-up.tsx) is a finished metric counter with the correct parser for case-studies.ts values — zero imports since step 2 retired its consumer.
* No redaction primitive exists; FitSection rows animate via `Reveal` L/R.

## Requirements

### R1 — H1/H2 masked reveal wiring (`data-split-reveal`)
* Stamp `data-split-reveal` on H1s: /consulting (consulting-client.tsx:203), /audit (audit-client.tsx:172), /case-studies (case-studies-client.tsx:31), /case-studies/[slug] (case-study-detail-client.tsx:70), /resources (resources-client.tsx:49), /resources/[slug] (resource-detail-client.tsx:107), /about (about-client.tsx:68), /contact (contact-client.tsx:93), /trust (trust-client.tsx:150), /start (start/page.tsx:33 — server component: attribute only, engine is global), services (service-detail.tsx:80).
* **Excluded**: home H1 (owned by WebGL HeroTextParticles morph), SectionHeading titles (self-split with identical tokens — double-split), legal pages /404/error (low value), sr-only h2, orphaned components, cinematic stage H2s (rAF-opacity owned).
* Hand-rolled serif H2 wiring: final-cta.tsx:73, our-why.tsx:53, compliance-pipeline.tsx:301, contact-client.tsx:130+258, trust-client.tsx:194/216/266/285/304/335, start/page.tsx:86.
* **Unwrap conflict**: on /about /contact /case-studies /resources the H1 sits in a whole-block `<Reveal>` → restructure so the H1 is NOT inside the Reveal (split hero block; H1 self-animates via choreographer; rest of block keeps Reveal). No double animation.
* H2s already inside `<Reveal>` (trust ×6): same rule — heading must not be double-animated; either lift heading out of the Reveal or don't stamp it. Prefer lifting out where cheap, else skip and note.
* **Italic overshoot / descenders**: Fraunces italic accent spans must not clip inside the line mask. Apply the headroom recipe from `research/gsap-split-scramble-api.md` (mask padding / negative clip-path inset variant per PIANO §4). Verify visually on /about (largest H1) and a detail [slug].
* Re-split on `document.fonts.ready` + language + pathname is already in the engine — don't regress it.

### R2 — Eyebrow scramble for composite eyebrows
* Extend `LabelScrambler` to scramble composite eyebrows: scramble only the TEXT nodes, leave decorative element children (dot/status-dot spans) untouched. Remove the `childElementCount === 0` leaf-only gate in favor of text-node-walking.
* Keep: one-shot per element, IO-driven, aria-label preservation, reduced-motion bail, MutationObserver re-arm on language change.
* Do NOT add ScrambleTextPlugin — one engine, no parallel systems. (PIANO's `data-scramble` opt-in is satisfied by the existing `.eyebrow` class convention; the `█▓▒░` /trust variant is step 7.)
* SectionHeading eyebrows ([data-eyebrow-text]) are animated by SectionHeading itself — LabelScrambler must continue to skip them (verify it does after the gate change; add explicit skip if needed).

### R3 — StatCounter (resurrect `CountUp`)
* Case-study detail "What shipped" (case-study-detail-client.tsx:109-131): wrap all `metric.value` in `<CountUp>`. Normal flow → existing ScrollTrigger regime works. Parser already classifies which values stay static (label-led, date, word values) — keep that contract.
* /about "Verifiable, not vibes" strip (about-client.tsx:229-273): restructure each stat so the bare number text node becomes `<CountUp value="8">` with the styled suffix span as sibling. Small ints → shorter duration (~0.8s).
* Spine handover proof chips 13/5/1 (cinematic-system-scroll.tsx:206-265): count when the panel's rAF `panelOpacity` first crosses the 0.6 lit threshold (same place the inert toggle lives, L399-407) — NOT IO/ScrollTrigger (pinned stage). One-shot. Desktop panel + mobile fallback both render the chips; mobile (native flow) may use the standard CountUp trigger.
* **Excluded**: home rail card metrics (pinned-rail trigger regime; hover color already animates them — slot-roll hover is a step-8 option), `01 / 14` ordinals, prose-embedded counts, /start (no numbers).
* Keep CountUp's a11y contract: sr-only final value, aria-hidden animated span, reduced-motion renders final value.

### R4 — Redacted Reveal on FitSection
* New small primitive (e.g. `RedactedReveal` in src/components/fx/ or ui/): per-word de-redaction — words covered by solid bars (off-white/ink on #0B1422 per PIANO §4) that clear in a quick L→R cascade on scroll-into-view, once.
* Apply to the **"Not a fit" column rows only** (fit-section.tsx L138-144, NOT_A_FIT_* 6 lines) — replaces their current `Reveal from="right"`; the redaction metaphor = "what we refuse". "Good fit" column keeps its current `Reveal from="left"`.
* Implementation: SplitText `type:"words"` or manual word spans; bars via pseudo-element/overlay; real text always in DOM (bars overlay, not text swap); `aria-label` final text, animated spans `aria-hidden`; reduced-motion → plain text, no bars.
* **NO copy changes**: FitSection stays 6+6 verbatim. (PIANO §4's "trim to 4+4 + absorb 2 refusals" is overridden by the copy-stays-current-site rule; the AGENTS.md refusal lines don't exist on the live site.)

## Acceptance Criteria

* [ ] All listed H1s/H2s play the masked line reveal once on enter (incl. SPA navigation mid-view), with no FOUC, no layout shift, no clipped italic overshoot/descenders.
* [ ] No element is double-animated (Reveal block + split, or SectionHeading + choreographer).
* [ ] Hero composite eyebrows (dot + text) decode on scroll-into-view and resolve to exact copy; EN↔IT toggle re-arms correctly; SectionHeading eyebrows unaffected.
* [ ] Detail-page metrics, /about strip (8/5/1), spine chips (13/5/1) count up once; values land exactly on the source strings (incl. U+2212, ~€, decimals).
* [ ] "Not a fit" rows de-redact per word; "Good fit" column unchanged.
* [ ] `prefers-reduced-motion`: all four presets render final static text/values immediately.
* [ ] SEO/a11y: real text in DOM at all times; sr-only/aria-label contracts preserved.
* [ ] `npx tsc --noEmit` + `next build` green; headless visual QA desktop+mobile (home, /about, /consulting, a [slug] detail, /trust); zero console errors.
* [ ] No copy changes anywhere.

## Definition of Done

* Typecheck / build green; headless QA evidence (screenshots) desktop + mobile
* Spec updated if new conventions emerge (data-split-reveal wiring rules, redaction primitive)
* Committed on `feat/webgl-refactor` (no push)

## Decision (ADR-lite)

* **Context**: engines existed orphaned; PIANO §4 proposed FitSection trim + refusal absorption; memory pins copy to current live site.
* **Decisions**: (1) wire existing HeadingChoreographer instead of new engine; (2) extend hand-rolled LabelScrambler instead of ScrambleTextPlugin (one engine); (3) resurrect CountUp, exclude rail cards (wrong trigger regime); (4) redaction on warn column only, 6+6 copy untouched — PIANO trim rejected per copy-stays-current-site memory; (5) spine chip counters keyed to panelOpacity lit threshold, not IO.
* **Consequences**: smaller diff, one animation grammar per surface; rail-card number motion deferred to step 8 (slot-roll hover); if the user later wants the 4+4 trim it's a separate copy decision.

## Out of Scope

* Section-state bus, hero compression, TSL compute port (step 4)
* Scrubbed paragraph highlight (Problem/OUR WHY) — not in §9.3, fits step 6 budget review
* `█▓▒░` /trust scramble variant, linked particles (step 7)
* Rail-card metric animation, slot-roll hover, framer-motion drop (step 8)
* Any copy change; legal pages/404/error headings

## Technical Notes / Research References

* `research/headings-eyebrows-inventory.md` — full H1/H2/eyebrow inventory with file:line, conflict map (Reveal wrappers, SectionHeading self-split), engine APIs.
* `research/gsap-infra.md` — gsap 3.15.0 (SplitText+ScrambleText included free), registration conventions, Lenis↔ScrollTrigger sync, reduced-motion idiom (~20 inline matchMedia sites), fonts.ready gating, "once:true ST created in-view never fires" gotcha, pinned-section spec (component-guidelines.md L146-163).
* `research/statcounter-redacted-targets.md` — FitSection structure + verbatim copy, full metric string classification table, CountUp parser contract, three trigger regimes.
* `research/gsap-split-scramble-api.md` — version-accurate SplitText/ScrambleText API + masked-reveal recipe + mask headroom for italic overshoot.
* Conventions: copy in inline `isEn` ternaries (re-run text animations on language change); animations must not change document height; homepage triggers handle their own fonts.ready→refresh.

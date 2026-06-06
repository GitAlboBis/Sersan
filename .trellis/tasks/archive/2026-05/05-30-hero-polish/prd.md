# Hero precision polish (9 → 10)

Precision polish only — do NOT redesign. Keep the dark cinematic AI-engineering-studio
aesthetic, electric-blue accent, orb visual, fixed nav, left-aligned hero copy. All changes
in the hero/nav. Both EN and IT must stay in sync (the spine STAGES + nav are bilingual).

## Exact refinements

1. **Headline copy** → EN: "We build production software with AI agents inside."
   IT: "Costruiamo software di produzione con agenti AI dentro."
2. **Selective blue emphasis** — ONLY "AI agents" is accent blue; the rest (incl. "inside") is white/ink.
   (Currently the whole "the AI agents inside" span is accent — narrow it to just "AI agents".)
   IT: only "agenti AI" accent.
3. **Subcopy** → EN: "SerSan builds custom software, AI agents, automations, MLOps architecture,
   and audit-ready systems for teams that need production reliability, not polished demos."
   (NOTE: user's draft had an em-dash before "not" — replaced with a comma per the no-em-dash rule.)
   IT: faithful translation, no em-dash.
4. **Keyword line** → two lines, NO trailing period:
   line 1: "CUSTOM SOFTWARE · AI AGENTS · AUTOMATION · MLOPS · AUDITS"
   line 2: "FOR SAAS, FINTECH & REGULATED TEAMS"
   IT: "SOFTWARE SU MISURA · AGENTI AI · AUTOMAZIONE · MLOPS · AUDIT" / "PER SAAS, FINTECH E TEAM REGOLAMENTATI"
5. **Orb** — reduce visual dominance ~10–15% and shift it right so the headline owns the page.
   Do it by pushing `objectPosition` further right (more of the orb crops off the right edge →
   reads smaller + further right) — NOT by transform-scaling the image down (would reveal edges).
   Add a stronger but subtle dark gradient over the LEFT/text area (between orb and copy) so the
   headline is the clear focal point. Apply to BOTH the desktop HeroBackdrop and the MobileFallback orb.
6. **Nav CTA clipping** — the top-right "Book a call" pill clips at ~1280px. Increase header right
   padding / fix spacing so the language toggle + CTA are fully visible and never clip at any desktop
   width (test 1280 and 1440). Keep toggle↔CTA spacing consistent.
7. **Left section rail (StageRail)** — make ~30% more subtle: lower opacity, simpler ticks, only the
   active section highlighted. Quiet technical detail, clearly secondary.
8. **Micro-interactions (slow, elegant, non-distracting):**
   - Nav links: soft animated underline on hover.
   - CTA arrow: slides ~3–4px on hover (hero primary already does group-hover translate — confirm/keep).
   - Button: restrained glow increase on hover only.
   - Scroll indicator: faint pulse.
   - Orb/neural layer: keep the existing slow ambient motion (already present) — ensure it's subtle.
   - Respect prefers-reduced-motion for all of the above.
9. Trust/proof line (13 / 5 / 1): keep the compact version; only tidy typography if needed.

## Constraints
- No redesign, no new sections. Hero + nav only.
- Keep bilingual parity; SSR English default.
- No em-dashes in copy.
- tsc + build green. Verify via screenshot at 1280 (CTA clip), 1440 (hero), 375 (mobile).

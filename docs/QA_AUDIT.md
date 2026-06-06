# SerSan v2 — post-rebuild QA audit

> Ruthless self-review against the 10/10 bar. Scored across 12 categories
> with concrete fixes, top-10 priority lists, and a final verdict. Goal: a
> premium B2B AI engineering studio website worth what it claims to be.

---

## Scorecard (1–10)

| # | Category | Score | One-line verdict |
|---|---|---|---|
| 01 | First impression | 8 | Cinematic spine carries weight; loading gate finally fixed. |
| 02 | Positioning clarity | 8 | "Ship AI systems that work beyond the demo" is sharp. The follow-through copy occasionally still slips into agency cadence. |
| 03 | Hero clarity | 7.5 | Strong line, strong subhead — but the 600vh pinned scroll defers the "what we sell" by 5 scrolls. Buyer in a hurry might bounce. |
| 04 | Visual hierarchy | 8 | Cinematic → quiet sections rhythm is right. Some sections (Services cards) are denser than they need to be. |
| 05 | Navigation | 8.5 | Buyer-intent labels, pill CTA, menubar ARIA dropped. Solid. |
| 06 | Conversion path | 8 | /start exists, qualifies properly, replaces mailto. Multiple repeats of the CTA throughout the spine + sections. |
| 07 | Trust / proof | 8.5 | 13 real named engagements is a strong moat. Logos visible early in the marquee. |
| 08 | Service clarity | 8 | Four services, each card carries deliverables + pain + CTA. The service-detail pages (`/services/*`) are still missing — CTAs jump to `#work` instead. |
| 09 | Mobile UX | 7 | Sections collapse cleanly; cinematic falls back to stacked. Form on /start is single-column. But the 600vh pinned spine on mobile is a usability cliff — works, but heavy. |
| 10 | Accessibility | 7.5 | Skip link present; ARIA semantics now honest; form labels real. Reduced-motion respected on the spine + production-grade artifacts. Focus rings need verification across all new cards. |
| 11 | Performance risk | 6.5 | 5MB HDRI + 2.3MB planet frames + WebGL + GSAP/Lenis is heavy. Mobile especially. Strong gating helps perceived perf; raw LCP is still suspect. |
| 12 | SEO basics | 7 | Page titles + descriptions in place; /start metadata added. Schema only at the Organization layer. Service/use-case pages are SEO debt. |

**Overall: 7.7 / 10.** Up from a guess-estimated 5.5 / 10 before this pass.
Strong premium feel, honest selling, real proof. Held back by perf
budget, the absent service-detail pages, and a 600vh spine that asks for
a lot of patience from a first-time visitor.

---

## Category notes (what works · what's weak · exact fix)

### 01 — First impression
**Works.** Loading-order fix lands the spine as a single beat. Planet
cross-fade is now continuous. Body grid quieted.
**Weak.** A returning visitor scrolling fast still hits the 600vh pin
and has to wait. The pin animation is *the* asset — but it's also a wall.
**Fix.** Add a "skip to services" affordance after stage 0 that
fast-forwards the pin to the end. Or trim pin distance from 600vh to
400vh.

### 02 — Positioning clarity
**Works.** The wedge ("production AI is a system, not a model") is now
expressed across hero, problem, production-grade, and final CTA — one
message, four angles.
**Weak.** "AI engineering studio for technical teams that need reliable
systems — not fragile prototypes" still has one too many clauses.
**Fix.** Trim subhead to "AI engineering studio for production systems —
agents, automation, MLOps, audits." (15 words → 11.) Move "not fragile
prototypes" to the Problem section where it already lives.

### 03 — Hero clarity
**Works.** Headline is direct. Stage 0 carries the wedge inside a
visually distinct experience.
**Weak.** The pinned cinematic delays the first commercial signal. A CTO
3 seconds into the page sees "AI engineering studio · production
systems" + a planet + a starfield. They might not know what we sell yet.
**Fix.** Add a one-line proof bullet under the subhead in stage 0:
"Agents · Automation · MLOps · Audits — for SaaS, fintech, regulated
teams." That's the categorical commit.

### 04 — Visual hierarchy
**Works.** Section-to-section rhythm is good. Eyebrow / display H2 /
description / content is consistent.
**Weak.** Services cards (2x2) carry: number, title, positioning, 5
bullets, solves, CTA. That's six layers per card. On a small laptop
viewport this stacks tight.
**Fix.** Collapse "Solves" into a single italic line right under the
positioning. Drops one layer.

### 05 — Navigation
**Works.** Buyer-intent labels (Services / Use Cases / Work / Process /
Start). Start as a pill CTA is the right anchor.
**Weak.** No visible state on anchor links — `aria-current` is set but
no visual underline because anchors are exempt from the active check.
**Fix.** Use IntersectionObserver to mark the nav item whose section is
in view. Subtle 1px underline in `--ink-mute` under the active label.

### 06 — Conversion path
**Works.** Every section that mentions "scope" links to `/start`. The
intake form qualifies stage / timeline / budget — a CTO can fill it in
60 seconds.
**Weak.** No persistent CTA on the homepage (after the cinematic CTA
disappears, the user has to scroll to a section CTA).
**Fix.** Add a thin scroll-anchored bottom bar (mobile only) with
"Book a scoping call →". Or a 36px nav-mounted reminder on desktop
once `scrolled > 1500`.

### 07 — Trust / proof
**Works.** 13 real engagements. Tier-1 logos in the marquee. Honest
"we do not claim certifications we don't hold" line in production-grade.
Two-founder framing in the cinematic closer.
**Weak.** No quotes / no specific outcome numbers visible on the
homepage. Case studies are real but feel like a list.
**Fix.** Pull two short pull-quotes from the 13 engagements (where
named) and surface them above the case study grid. Even one strong
quote from J.P. Morgan or Apple-via-Deloitte would 2x trust in 200 px.

### 08 — Service clarity
**Works.** Four services, deliverables listed concretely, pain stated.
**Weak.** All four cards CTA to `#work`. There's no service-detail page
yet. A buyer who clicks "See agent engagements →" lands on the work
section without filtering.
**Fix.** Either (a) implement `/services/agents`, `/services/automation`,
`/services/mlops`, `/services/architecture` (Phase 2), or (b) filter
the case-studies section by the chosen service via a `?focus=` query.
For now `#work` is acceptable — flag this as a Phase 2 item.

### 09 — Mobile UX
**Works.** Spine collapses to stacked stages. Sections single-column.
Form single-column. Touch targets are mostly fine.
**Weak.** 600vh pin on mobile is heavy — feels like a tunnel on a
small screen. Service cards stack 4 high which is a lot of vertical
real estate before Use Cases.
**Fix.** Mobile-only: shorten pin to 400vh and reduce stages from 6 to
4 by merging Signals+Audit and Build+Operate copy. Service cards on
mobile: collapse the "typical build includes" bullets behind a
"What's in it →" expandable.

### 10 — Accessibility
**Works.** Skip link, real form labels with `htmlFor`, focus-visible
rings, `aria-current`, `aria-hidden` on decorative SVGs, reduced-motion
gate on the spine.
**Weak.**
- Cinematic stage panel uses `position:absolute` over WebGL; screen
  readers may double-read the stages.
- Some select dropdowns rely on background SVG arrow — needs a
  fallback for forced-colors mode.
- The new section cards don't have a focus state when reached via
  keyboard tab.
**Fix.** Add `aria-hidden="true"` to all but the currently active stage
panel (computed in the rAF loop). Forced-colors check on the chevron.
Add `focus-within:border-[hsl(var(--accent)/0.5)]` to cards that contain
interactive children.

### 11 — Performance risk
**Works.** Preload hints for the spine's hero assets. rAF-driven
animations (no per-frame React renders). Body grid lightweight.
**Weak.** 5MB EXR HDRI + 2.3MB planet frames + nebula JPG + ~30 WebGL
canvases of postprocessing. Mobile LCP probably > 3.5s on 4G.
**Fix.**
- Convert HDRI to a 1k WebP-encoded HDR (or move to a baked cubemap).
  Should land at ~800KB.
- Defer the entire CinematicSystemScroll until after the first paint
  via `dynamic(() => import(...), { ssr: false })` (already done) AND
  hold the Canvas mount behind `IntersectionObserver` so it only mounts
  when the section actually enters view. Currently it mounts on page
  load via `<CinematicSystemScroll>` itself.
- Lazy-load the Reveal GSAP module — currently every section imports
  GSAP eagerly.

### 12 — SEO basics
**Works.** Page-level title + description. /start has its own metadata.
Organization JSON-LD.
**Weak.** Single-page homepage means all the anchor sections share one
URL. Search will conflate "ai agents", "mlops", "ai audits" under one
page. No Service or FAQPage schema. The new sections aren't yet linked
internally to anything.
**Fix.** Implement `/services/*` pages (Phase 2). Add `Service` schema
per service card via JSON-LD embed in `<ServicesSection>`. Cross-link
the use-case tiles to their nearest case study.

---

## Top 10 highest-impact improvements

1. **Implement `/services/*` detail pages.** Currently the highest
   commercial intent click on the homepage dead-ends at `#work`.
2. **Shorten the cinematic spine to 400vh on desktop, merge stages on
   mobile.** It's the page's biggest asset *and* its biggest tax.
3. **Add active-section indicator to the nav.** Buyers should know where
   they are.
4. **Move the HDRI off-canvas / replace with a cheaper environment.**
   5MB on initial paint is a lot to spend on shine.
5. **Add a pull-quote band above the case study grid.** Even one
   client-named quote 3x trust.
6. **Mobile sticky bottom CTA "Book a scoping call →".** Conversion
   floor.
7. **Filter case studies by service.** Either by route or by query.
8. **Trim the hero subhead to 11 words.** "AI engineering studio for
   production systems — agents, automation, MLOps, audits."
9. **Add a one-line proof bullet under the hero.** Names the categories
   without forcing a scroll.
10. **Build `/audit` packaged-offer page.** The audit offer is referenced
    everywhere; it should be a clickable destination.

## Top 10 copy improvements

1. Tighten hero subhead to 11 words (see #08 above).
2. Hero stage 0: add "Agents · Automation · MLOps · Audits — for SaaS,
   fintech, regulated teams" as a proof bullet.
3. Replace "Two founders" with "Two senior engineers" everywhere on the
   homepage — leans into engineering, not founder culture.
4. Problem section card 03: tighten "the first time the agent does
   something a regulator notices" → "the first time a regulator looks."
5. Services card "Solves" — collapse to one italic line per card.
6. Use Cases tile 06 ("Fractional senior AI engineering"): replace
   "stand-ups" with a stronger noun. "Architecture reviews" or
   "design calls" — more concrete than agile theater.
7. Process Diagnose: clarify "Sometimes that's 'don't build this'"
   reads as a quote — keep the quotes but italicize for emphasis.
8. Fit "Not a fit" final line ("Can you do it for equity?") — strong
   line but may read as snark to some readers. Soften to "We don't
   take equity for engineering work."
9. Final CTA: drop "sometimes that's 'don't do this.'" — already
   stated in the Diagnose phase. Avoid repetition.
10. /start trust line ("Read by one of the founders, not a queue") —
    appears twice on /start. Consolidate to one mention.

## Top 10 UI improvements

1. Active-section nav highlight (per #03).
2. Card focus states for keyboard navigation.
3. Pull-quote band above the case study grid.
4. Mobile sticky CTA bar.
5. Service cards — collapse "Solves" to italic line.
6. Use Cases tiles — equalize heights with `grid-rows-[1fr]` so the
   tile heights match across the row.
7. Problem cards — add a small inline icon glyph (engineering symbol,
   not emoji) per card to give the row visual cadence.
8. Process timeline — replace vertical dots with horizontal phase chips
   on desktop to read more like a timeline.
9. Form selects — replace native `<select>` with a custom dropdown for
   visual consistency with the rest of the dark theme (today they look
   slightly OS-styled on some browsers).
10. Footer — add the `/start` link as a footer-level secondary CTA.

## Top 10 performance improvements

1. HDRI → 1k WebP or baked cubemap. Saves ~4MB.
2. Mount the Canvas only when the spine intersects the viewport.
3. Lazy-load GSAP for non-essential reveals (use CSS for simple fades).
4. Convert planet frames to AVIF where supported with WebP fallback.
   ~40% smaller.
5. Add `decoding="async"` + `fetchPriority="low"` to use-case / case
   study previews.
6. Drop `framer-motion` dependency entirely if it's still in the bundle
   (the project moved to GSAP — check the bundle).
7. Defer `<Footer>` social SVGs and lucide icons via dynamic imports.
8. Move `Lenis` smooth scroll off the global provider on mobile (the
   small screen doesn't need it and the JS cost is non-trivial).
9. Pre-build the cross-fade frame URLs into a manifest so the browser
   can prioritize them in parallel.
10. Cache-bust the static planet frames with content hashes (so a year
    from now we can swap the planet set without `?v=2` query strings).

---

## Final verdict

This site went from a "premium but slightly abstract AI agency" to a
**defensible, opinionated, conversion-capable B2B engineering studio
site**. The wedge is real, the proof is real, and the conversion path
exists.

To reach a true 10/10 the next pass should be:

- **/services/* and /audit pages** (biggest commercial lift)
- **Performance budget enforcement** (HDRI + Canvas-on-demand)
- **Active-section nav + mobile sticky CTA** (conversion polish)
- **Pull-quote band above case studies** (trust amplification)

Everything else listed above is incremental. The current state is
shippable, share-able with serious buyers, and meaningfully better than
9/10 of the AI agency sites a CTO is reading this month.

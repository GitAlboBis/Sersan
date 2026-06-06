# SerSan v2 — second QA audit (post-restoration pass)

> 17-category scorecard following the restoration of founder + proof content
> and the SSR hero fix. Honest scoring against a 10/10 bar. Compared head-on
> with `QA_AUDIT.md` (the first pass).

---

## Scorecard (1–10)

| # | Category | Was | Now | Delta | Verdict |
|---|---|---|---|---|---|
| 01 | First impression | 8 | **9** | +1 | SSR'd hero lands instantly; founder photos give immediate humanity. |
| 02 | Positioning clarity | 8 | **9** | +1 | Categorical bullet ("Agents · Automation · MLOps · Audits") under the hero removes any "what is this" gap. |
| 03 | Hero clarity | 7.5 | **9** | +1.5 | Hero now has H1 + subhead + categorical bullet + counts strip + primary/secondary CTA — visible in the FIRST paint, not behind scroll. |
| 04 | Founder credibility | – | **9** | new | Two real founders, real photos, real credentials (USAAI CAIC, LSE PhD), real LinkedIn URLs. Above-the-fold proof in the counts strip. |
| 05 | Proof strength | 8.5 | **9.5** | +1 | Three layers now: counts strip (hero) → ProductionGrade artifacts → 13 named case studies → FoundersSection. Repeated proof, all real. |
| 06 | Visual hierarchy | 8 | **8.5** | +0.5 | Founder photos add a humanising beat between Work and Process. Rhythm holds. |
| 07 | Navigation | 8.5 | **9** | +0.5 | Pill CTA "Book a call" reads as action, not as "Start" puzzle. |
| 08 | CTA clarity | 7.5 | **9** | +1.5 | Hero CTAs visible immediately. Pill CTA action-oriented. /start form, /about deep link, mailto fallback all wired. |
| 09 | Conversion path | 8 | **9** | +1 | Hero CTA → /start (with founder photos at the conversion point) → form. /start form qualifies stage/timeline/budget. |
| 10 | Service clarity | 8 | **8** | – | Still no /services/* detail pages. Card CTAs jump to #work. Same as last pass. |
| 11 | Use-case clarity | – | **8** | new | 6 self-locating tiles, clean grid, no marketing fluff. |
| 12 | Production-grade credibility | 8.5 | **9** | +0.5 | Live animated artifacts + 12-item checklist. The animations now read as evidence, not as decoration. |
| 13 | Mobile UX | 7 | **8** | +1 | SSR hero now works on mobile cold-load (no empty placeholder while detection runs). 600vh pin still heavy. |
| 14 | Accessibility | 7.5 | **8.5** | +1 | H1 is real and in initial HTML. Founder image alt text is descriptive. Plain `<ul>` semantics across nav + lists. Reduced-motion respected. |
| 15 | Performance risk | 6.5 | **7** | +0.5 | Planet frames (2.3MB) gone, only nebula.jpg preloaded. HDRI is still 5MB though. |
| 16 | SEO metadata | – | – | – | Skipped per user direction. |
| 17 | Overall | 7.7 | **8.7** | **+1.0** | Up a full point. The site reads as a real founder-led studio with real proof. |

**Overall: 8.7 / 10.** A genuine 10/10 is achievable but requires perf
work + service-detail pages (next pass).

---

## Category notes — what works · what hurts · exact fix

### 01 First impression
**Works.** No "loading" flash. Hero reads instantly. Planet renders live
in WebGL, no image cutout look.
**Hurts.** Body grid + cinematic spine + nebula is still a lot on a slow
device.
**Fix.** Defer the entire WebGL Canvas behind an IntersectionObserver
gate that mounts only when stage is near-viewport, with a CSS-rendered
poster image as the placeholder.

### 02 Positioning clarity
**Works.** "Ship AI systems that work beyond the demo" + "Agents ·
Automation · MLOps · Audits" answers the "what" in one breath.
**Hurts.** Subhead still has slight clause overload.
**Fix.** Tighten subhead to: "Founder-led AI engineering studio for
production systems — agents, automation, MLOps, audits."

### 03 Hero clarity
**Works.** Five elements in initial HTML: eyebrow, H1, subhead, proof
bullet, counts strip, two CTAs.
**Hurts.** Visual weight pulls the eye to the planet; the CTAs are
text-button shaped so they read as secondary.
**Fix.** Bump primary CTA size or contrast — try `bg-ink/95
text-bg` for a moment of high contrast at the top of the page.

### 04 Founder credibility ✦
**Works.** Real names, photos, credentials, LinkedIn. Both founders
above the fold in the counts strip ("1 PhD, applied maths") and again
in their dedicated section. Brief lands with named humans, not a queue.
**Hurts.** Founder photos are 1.4 MB each (webp). On 3G that's slow.
**Fix.** Re-encode to 800px max + quality 75 → ~80KB each. Or generate
responsive variants via `next/image`'s built-in resizer.

### 05 Proof strength ✦
**Works.** Multi-layer proof: hero counts → marquee → production-grade
artifacts → 13 named case studies → founders → process. No layer is
filler.
**Hurts.** No named client pull-quote visible on the homepage.
**Fix.** Pull one short outcome line from each of the top-3 case studies
("J.P. Morgan: −22% peak exposure, ~$140M/day collateral"). Render as a
3-card mini-band right above the case study grid. Numbers already exist
in `case-studies.ts` — no invention needed.

### 06 Visual hierarchy
**Works.** Cinematic → quiet sections → cinematic-feeling close. Founder
photos break the otherwise text-heavy mid-page rhythm.
**Hurts.** Services card grid is still six layers deep per card.
**Fix.** Collapse "Solves" line into italic positioning, per QA #1.

### 07 Navigation
**Works.** Buyer-intent labels, pill CTA reads as action.
**Hurts.** No active-section indicator.
**Fix.** Hook IntersectionObserver to nav links so the matching section
becomes the "active" label as you scroll.

### 08 CTA clarity
**Works.** Hero CTAs visible immediately, action-labelled. Final CTA
matches. /start form labels are concrete.
**Hurts.** "See what we build" is a touch vague vs. "See selected
work."
**Fix.** Standardise to "See selected work" everywhere except where the
audience needs the categorical bullet right after.

### 09 Conversion path
**Works.** Hero → click → /start → fill form. Founder photos on /start
keep trust high at the conversion moment.
**Hurts.** No mid-page CTA after the cinematic CTA scrolls off. Mobile
especially.
**Fix.** Mobile sticky bottom bar — "Book a call →" pinned to the
viewport after the user scrolls past hero.

### 10 Service clarity
**Works.** Four services, deliverables listed concretely.
**Hurts.** Service-detail pages still missing.
**Fix.** Build `/services/agents`, `/services/automation`,
`/services/mlops`, `/services/architecture` (Phase 2).

### 11 Use-case clarity (new)
**Works.** Six tiles. Each line is recognisable to a specific buyer.
**Hurts.** The grid is `gap-px` so it reads as a single block, which is
intentional but can read flat on darker monitors.
**Fix.** Try `gap-3` and equal-height rows for more visual cadence.

### 12 Production-grade credibility
**Works.** Live animated artifacts — eval, trace, permissions — pause
when out of view. The 12-item checklist is concrete.
**Hurts.** Permission graph deny-edge animation flickers briefly and
might miss readers who blink at the wrong moment.
**Fix.** Loop the deny flicker every ~3s instead of every ~3s with a
single dramatic moment, OR add a small "denied" label that fades in
when the flicker dies.

### 13 Mobile UX
**Works.** SSR'd hero, single-column sections, form single-column on
/start.
**Hurts.** 600vh pin on mobile is heavy. Service cards stack four high.
**Fix.** Mobile-only: shorten pin to 400vh; collapse service card
bullets behind a "What's in it →" expandable.

### 14 Accessibility
**Works.** Real H1, descriptive image alt text, `<ul>` semantics, focus
rings, reduced-motion gate on spine + artifacts.
**Hurts.** Cinematic stage panels overlap WebGL — screen readers may
double-read inactive stages.
**Fix.** Set `aria-hidden="true"` on stage panels that aren't active
(compute in the rAF loop alongside opacity).

### 15 Performance risk
**Works.** Planet frames gone (-2.3 MB). Only nebula.jpg preloaded.
**Hurts.** HDRI is still 5 MB. Canvas mounts on page load.
**Fix.** Convert HDRI → 1k WebP HDR or baked cubemap (~800 KB). Mount
Canvas only when the spine enters viewport.

### 16 SEO metadata — skipped (per user direction)

### 17 Overall verdict
8.7. Confident, founder-led, proof-rich, server-rendered. To land a 10
the next pass should ship: pull-quote band above case studies, mobile
sticky CTA, /services/* pages, HDRI shrink + Canvas-on-demand, active
section nav indicator. None are architectural — all incremental.

---

## Top-10 remaining changes to reach 10/10

1. **Pull-quote band above case studies** using real metrics already in
   `case-studies.ts` (J.P. Morgan, Revolut, Apple UK).
2. **HDRI shrink + Canvas-on-demand** — the biggest perf lever.
3. **Mobile sticky CTA bar.**
4. **Active-section nav indicator.**
5. **`/services/*` detail pages** so service-card CTAs have a real
   destination.
6. **`/audit` packaged-offer page.**
7. **Re-encode founder photos to ~80KB.**
8. **`aria-hidden` toggle on inactive stage panels.**
9. **Subhead tighten** — one less clause.
10. **Mobile-only pin shortening** (600vh → 400vh).

## Top-10 copy fixes

1. Tighten hero subhead — drop "for technical teams that need reliable
   systems" (replaced by the counts strip).
2. Standardise hero secondary CTA to "See selected work."
3. Use Cases tile 06 — replace "stand-ups" with "architecture
   reviews" (sharper, less agile-theater).
4. Process Diagnose — italicise the "don't build this" line.
5. Fit "Not a fit" final line — soften "Can you do it for equity?"
   into "We don't take equity for engineering work."
6. Final CTA body — remove the "sometimes that's 'don't do this'"
   repeat (already in Diagnose).
7. /start — consolidate "Read by one of the founders" mentions to one.
8. Founders section closer — "Read by one of us, not a queue" is
   strong; consider lifting it into the hero counts strip.
9. Services card "Solves" → collapse to one italic line.
10. Production-Grade checklist (when added) — keep one-liner under each
    of the 12 items, not two.

## Top-10 UI fixes

1. Pull-quote band above Work.
2. Active-section nav highlight.
3. Card focus states for keyboard navigation.
4. Mobile sticky CTA bar.
5. Use Cases tiles — equalize heights, slight gap increase.
6. Problem cards — small inline glyph per card for visual cadence.
7. Service cards — collapse "Solves" to italic line.
8. Process timeline — horizontal chips on desktop.
9. Form selects — replace native `<select>` with a custom dropdown.
10. Permission-graph deny edge — add fading "denied" label.

## Top-10 performance fixes

1. HDRI → 1k WebP HDR or baked cubemap (–4 MB).
2. Canvas-on-demand via IntersectionObserver.
3. Re-encode founder photos to ~80 KB each.
4. Lazy-load GSAP for non-essential reveals (use CSS for simple fades).
5. Convert case-study previews to AVIF where supported.
6. Defer Footer social SVGs.
7. Move Lenis off the global provider on mobile.
8. Cache-bust the static images with content hashes.
9. Preconnect to Fontshare CDNs (already done — keep verifying).
10. Audit for unused Framer Motion / shadcn dependencies that might be
    in the bundle.

## Top-10 trust / proof fixes

1. Pull-quote band — concrete metrics from case studies.
2. Founder photos on /start (DONE).
3. Counts strip above the fold (DONE).
4. FoundersSection on homepage (DONE).
5. "Reply within one business day" repeated at hero, FoundersSection,
   final CTA, /start (DONE — verify it doesn't feel formulaic).
6. Show all 13 case study client wordmarks in a single hero-proximate
   strip on desktop, not just the marquee.
7. Add a small "Live in production" indicator on the SphereNode, Quantex,
   Terra Noa case study cards (already partially there via liveUrl).
8. Surface the Oct 2024 exit on the Stealth Greentech case study card
   more prominently — that's a strong founder signal.
9. Add a "How we report" or "Status update cadence" micro-section near
   the Process — addresses trust around "is this another agency that
   disappears for two months."
10. Add a footer-anchored "Read by [N people] this week" indicator (if
    you want a small social-proof signal) — only if real, never faked.

---

## Final verdict

This site is now **founder-led, proof-rich, and shippable to serious
buyers**. The H1 is in initial HTML. The founders are real and visible.
The proof is layered (counts → marquee → artifacts → case studies →
founders → process). The conversion path is concrete.

To reach 10/10, the remaining work is mostly incremental: perf
optimisation, two new pages (/services/*, /audit), and the pull-quote
band that turns 13 case studies into 13 visible outcomes. None requires
architectural change.

**8.7 / 10** with a clear roadmap to 10.

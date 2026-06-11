# Restyle step 2 — IA + funnel + case-studies rail WebGL

## Goal

Execute step 2 of `PIANO_RESTYLE.md` (information architecture + funnel) **merged with**
step 5's case-studies rail (user decision 2026-06-10: "tutto subito"): reorder the home so
proof lands by viewport ~5, consolidate the duplicated narratives and CTAs, absorb /faq,
and replace the case-studies teaser + archive grid with a pinned **horizontal rail of all
13 case studies + 1 "In development" card**, WebGL-treated (velocity bend, procedural
backdrop, scan hover) in the same task.

## User decisions (2026-06-10/11)

* **/faq**: merge content + permanent redirect to `/consulting#faq`. Footer link updated.
* **Rail**: ALL case studies on the rail (not 3 featured), WebGL included now ("tutto
  subito" — not the phased 2.5D option).
* **No 3D carousel/ring**: rail stays a horizontal sticky rail; depth lives in the
  rendering (bend/parallax/scan), per brand sobriety. (Recommended and accepted.)
* **No product imagery yet**: WebGL planes get **procedural backdrops** (navy gradient
  field + noise, brand palette); clean upgrade path to textures when imagery arrives.

## Requirements

### A — Home reorder (IA + funnel)

1. **New section order** in `src/app/page.tsx`:
   spine → credibility strip (remounted) → problem → **case-studies RAIL** → services
   (pains integrated) → production-grade → founders → fixed-scope strip → fit → gateway →
   final-cta. Keep `data-line-anchor` wrappers for every section (signature line curve
   waypoints re-measure automatically; update anchor names/orders in
   `src/webgl/curves/routeCurves.ts` `/` config to match the new order).
2. **Credibility strip remount**: restore `credibility-strip.tsx` right after the spine,
   restyled to fuse into the top of Problem (no border-y divider that broke the flow —
   see the comment in page.tsx). Marquee of tier-1 names (Revolut · J.P. Morgan ·
   Deloitte · Brevan Howard · Accenture), small mono caps. Velocity-coupled marquee
   (GSAP `horizontalLoop()` pattern or the existing component's approach if it has one).
3. **Process table → /consulting**: move the 4×6 process content from home
   `process-section.tsx` into /consulting ("How we engage" area). Home keeps only a
   one-line "fixed scope" strip (reuse existing copy; no new copy).
4. **UseCasesSection removed from home**; its 6 pains move to the front/face of the
   Services cards (`services-section.tsx` already has a "Solves" footer per card — surface
   pains there) and as the first question of the /start intake (option list). Component
   file can be deleted once nothing imports it.
5. **WorkInProgress section removed from home**; its 1 real entry becomes the
   "In development" card at the end of the rail. On /case-studies the section stays but
   AFTER the archive grid.
6. **CTA dedupe**: exactly 3 /start CTA moments on home — spine release (handover panel),
   one mid-page post-rail, FinalCTA. Remove the extra ones.
7. **/consulting practice cards → links**: the 8 practice-area cards link to the 4
   `/services/<slug>` pages, /audit, and a Fractional CTO anchor (map them sensibly;
   cards that have no detail page link to the closest one or stay non-link — no new pages).
8. **FAQ merge**: from the deleted faq content (git history `src/app/faq/faq-client.tsx`):
   4 engagement answers → /consulting (new FAQ block, anchor `#faq`) and /audit where
   they fit the existing "Honest answers" pattern; 3 data-privacy answers → /trust.
   `/faq` becomes a permanent redirect (`next.config` redirect or route-level
   `redirect()`) to `/consulting#faq`. Footer /faq link → /consulting#faq. EN+IT for
   everything moved. Compliance copy must match /trust (ISO 27001, London (UK)) — the
   corrected versions from step 1, not the originals.

### B — Case-studies horizontal rail (home) + WebGL

9. **Sticky horizontal rail**, all 13 cards from `src/data/case-studies.ts` + the
   "In development" card. CSS sticky container (NO ScrollTrigger pin-spacer — keeps
   `[data-line-anchor]` measurements valid), vertical scroll scrubs `translateX` via
   ScrollTrigger scrub on the Lenis-driven page. Cards: big mono metric, sector tag,
   title, role line, real `<a>` to `/case-studies/<slug>`. Implementation per
   `research/horizontal-rail-pattern.md`.
10. **Rail progress + velocity exposed** to WebGL via store (per research), read in
    `useFrame` via `getState()` — no per-frame React state.
11. **WebGL card planes** (per `research/webgl-card-planes.md`): DOM-synced planes in the
    persistent canvas behind each card; TSL node material with (a) procedural navy
    gradient+noise backdrop (per-card seed, palette `#0B1422` / `#3BE1FF→#7C5CFF`,
    accent only at peaks), (b) velocity-driven subtle bend, (c) hover scan sweep
    (cyan→violet emissive line, emissive >1.0 so existing selective bloom catches it;
    lerped hover state from DOM pointerenter through a store).
12. **Tier/a11y gates**: planes full-tier only; lite = DOM-only rail; tier off /
    `prefers-reduced-motion` = NO pinning, native horizontal `overflow-x` scroll with
    snap, no bend/scan. Keyboard: cards focusable in order, focus scrolls the rail.
13. **/case-studies page**: archive grid + filters stay (canonical archive); home rail
    links there. (Optional this task: reuse the rail on /case-studies desktop later —
    OUT of scope now.)

## Acceptance Criteria

* [ ] Home section order matches Requirement 1; `routeCurves.ts` `/` waypoints updated;
      signature line renders correctly through the new order (visual check).
* [ ] Credibility strip visible immediately after spine release (~viewport 5), no
      border-y dividers, marquee runs (and pauses under reduced-motion).
* [ ] No UseCasesSection / WorkInProgress on home; pains visible on Services cards;
      /start intake first question = self-locator with the 6 pains (EN+IT).
* [ ] Home has exactly 3 /start CTAs (grep + visual).
* [ ] /consulting shows process content + FAQ block at `#faq`; /audit + /trust absorbed
      their answers; `/faq` 308-redirects to `/consulting#faq`; footer updated; zero
      remaining links to `/faq` elsewhere.
* [ ] Rail: 14 cards, scrub works on desktop (Lenis), native horizontal scroll on
      mobile/reduced-motion; every card is a working link; keyboard focus traverses
      the rail.
* [ ] WebGL planes track cards within ~2px during scrub (visual), bend responds to
      velocity, scan sweep on hover with bloom, nothing renders on lite/off tiers.
* [ ] Two pinned sections (hero spine + rail) coexist: no ScrollTrigger measurement
      breakage, no signature-line anchor drift (verify after full-page scroll).
* [ ] `npx tsc --noEmit` clean; `npm run build` passes; console free of errors on
      touched routes.
* [ ] EN+IT parity for every moved/new string.

## Definition of Done

* Headless visual QA (per spec gotchas: real wheel events, preloader leaf wait):
  desktop+mobile screenshots of new home order, rail mid-scrub, rail hover, /consulting
  #faq, /trust absorbed answers.
* Small descriptive commits per requirement group on `feat/webgl-refactor`; NO push.

## Out of Scope

* Typography presets (step 3), section-state bus + spine compression (step 4),
  /audit pinned timeline + /resources beats (step 6), /trust pipeline (step 7),
  transitions/Flip + framer-motion removal (step 8).
* Textured card planes / depth-map scan with real imagery (needs assets from user).
* Reusing the rail on /case-studies page.

## Decision (ADR-lite)

**Context**: featured-3 vs all-13 on home; 3D carousel vs horizontal rail; phased vs
all-at-once WebGL.
**Decision**: all 13 + WIP card on a sticky horizontal rail, WebGL planes now, no 3D
carousel (brand sobriety, no second camera-on-rails), procedural backdrops until imagery
exists.
**Consequences**: bigger task (IA + new WebGL system together); rail replaces both the
teaser and the inline archive grid, killing the duplication; upgrade to textured planes
is uniform-level work later.

## Technical Notes

* Plan source: `PIANO_RESTYLE.md` §3 (SPOSTA table + new home order), §4 (case studies),
  §5 (AGGIUNGI 1-2), §9 steps 2+5; appendix A sources: ui-layouts horizontal-scroll
  (MIT), Faure GLMedia/coverUv (MIT), d3adrabbit scan effect, colindmg wavy carousel.
* Research: `research/horizontal-rail-pattern.md`, `research/webgl-card-planes.md`.
* Constraints: copy unchanged (moves only; FAQ copy = step-1-corrected versions);
  signature line impianto untouched (only `/` waypoint data updated); one canvas, one
  rAF loop, selective bloom by threshold; palette/identity invariant; no new deps
  (port patterns, never framer-motion/fullPage).
* Two pinned sections on one page is the riskiest interaction — test ScrollTrigger
  refresh order with Lenis early.

### Critical caveats from research (binding)

1. Keep a zero-height `<div data-line-anchor="work-in-progress" />` in page.tsx when the
   WIP section is absorbed into the rail (curve waypoint; precedent: `credibility`).
2. The smooth-scroll provider does NOT run ScrollTrigger.refresh() on `/` — the rail does
   its own one-shot `document.fonts.ready → ScrollTrigger.refresh()`; everything else via
   `invalidateOnRefresh + onRefreshInit`.
3. Card widths fixed in rem (`w-[min(85vw,26rem)]` style), never font-dependent — rail
   width changes document height and shifts every downstream anchor fraction.
4. No `pin:`/pin-spacer and no scrub tween — sticky container + onUpdate quickSetter
   (Lenis already smooths). No `scroller` option (scrollerProxy covers it).
5. Planes are world-anchored on the camera strip: `y = -(docY + h/2) * k` with
   `k = WORLD_VIEW_HEIGHT / size.height` valid only at z=0; per-frame interpolate only
   the rail trackX. Any other z needs `(CAMERA_Z - z)/CAMERA_Z` compensation.
6. Canvas is BEHIND the DOM: rail cards need (semi)transparent backgrounds or the planes
   are invisible — DOM-side requirement on the new card styles.
7. Camera tilt/descent beats de-register planes from rects by a few px — inset/feather
   plane edges; verify rail position vs the spine's tiltAnchorY after the reorder.
8. The TSL material must hard no-op on the WebGL2 fallback (`!webgpuEnabled()`) or ship
   a GLSL twin, per repo convention (lineShader/lineNodeMaterial precedent).
9. Rail progress/velocity flow through the store (extend scrollStore or new railStore),
   read via `getState()` in `useFrame`; reset on unmount.

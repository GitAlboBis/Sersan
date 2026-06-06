# Journal - Alessandro (Part 1)

> AI development session journal
> Started: 2026-05-30

---



## Session 1: Site overhaul: hero, brand, repositioning, i18n, fonts

**Date**: 2026-05-30
**Task**: Site overhaul: hero, brand, repositioning, i18n, fonts
**Branch**: `feat/site-overhaul`

### Summary

Static orb hero in the 400vh spine + neural-net layer + motion/perf polish; brand unification to electric blue; repositioned to custom software with AI agents inside; audit remediation (forms wired, a11y, perf, fonts); full EN/IT bilingual coverage; Geist Sans/Mono; em-dashes removed from copy; mobile/tablet hero orb glow. Open: lead delivery needs RESEND_API_KEY; 4K orb needs image credits.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b733ab0` | (see git log) |
| `0543c9c` | (see git log) |
| `6eb117e` | (see git log) |
| `c2b77c7` | (see git log) |
| `3acd871` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Hero precision polish 9 to 10

**Date**: 2026-05-30
**Task**: Hero precision polish 9 to 10
**Branch**: `feat/site-overhaul`

### Summary

Headline -> 'We build production software with AI agents inside' (only 'AI agents' accent); tighter subcopy + two-line keyword strip EN/IT; orb less dominant + stronger left scrim; fixed nav CTA clipping at 1280; quieter section rail; subtle nav underline + scroll pulse.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5936b02` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Homepage 10/10 system pass

**Date**: 2026-05-30
**Task**: Homepage 10/10 system pass
**Branch**: `feat/site-overhaul`

### Summary

Workflow-orchestrated: all homepage sections rebuilt to one shared grammar. Reorder (artifacts before use-cases), Online->Handover, incident-console demo-gap, 4 productized service cards (+AI-Native rename), signature artifact panels, which-situation use-cases, scannable selected-work + trust label, sharper founder bios, fixed-scope process map, qualification fit panels, closing-panel CTA. EN+IT, no em-dashes, Geist+card-steel. Build green. Visual fidelity needs a real-browser eyeball pass.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1bd6ce4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Hero fit + assisted section scroll + Terra Noa asset trim

**Date**: 2026-05-30
**Task**: Hero fit + assisted section scroll + Terra Noa asset trim
**Branch**: `feat/site-overhaul`

### Summary

Fixed hero clipping under nav on short viewports (center + nav-clear top pad). Added assisted Lenis section snap (proximity) on post-spine sections, reduced-motion safe. Trimmed scrollbar white line off terranoa case-study preview asset.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `1fea0ae` | (see git log) |
| `74dbac4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Artifact hover fix + calmer hero scroll

**Date**: 2026-05-30
**Task**: Artifact hover fix + calmer hero scroll
**Branch**: `feat/site-overhaul`

### Summary

Fixed production-grade artifact hover bleeding a text fragment (reserved-box crossfade). Calmed hero spine scroll sensitivity (400->520vh). Assisted section snap confirmed as the intended between-sections behavior.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `cb83482` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Stronger section snap

**Date**: 2026-05-30
**Task**: Stronger section snap
**Branch**: `feat/site-overhaul`

### Summary

Section snap proximity->mandatory + debounce 500->150 for a clearly stronger section-to-section assist.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `d990732` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Remove section snap

**Date**: 2026-05-30
**Task**: Remove section snap
**Branch**: `feat/site-overhaul`

### Summary

Removed the assisted section snap from the landing (mandatory snap fought Lenis/the spine and felt messed up). Lenis smooth scroll + spine + anchors intact.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5442341` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Stronger velvety wash, less grid + promote to production

**Date**: 2026-05-30
**Task**: Stronger velvety wash, less grid + promote to production
**Branch**: `main`

### Summary

Strengthened section-accent-tint blue wash (~1.6x) + SectionGlow, faded the body grid lines, so sections read as velvety blue not grid. Merged PR #3 to main and deployed to production (sersan-v2.vercel.app).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3638c37` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Remove grid, stronger velvety wash

**Date**: 2026-05-30
**Task**: Remove grid, stronger velvety wash
**Branch**: `main`

### Summary

Removed the body grid lines entirely, added a velvety electric-blue page wash, strengthened section-accent-tint + SectionGlow. Deployed to production.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f916f7e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

---

## Session: Final polish — cleanup, analytics, mobile QA

**Date**: 2026-05-31
**Task**: 05-31-finalpolish — "do everything u can try ur best" (Resend excluded)
**Branch**: `main`

### Summary

Pass over remaining improvable items after the site overhaul. Shipped the
real wins; honestly verified the suspected bugs and found most were not bugs.

### Main Changes

- **Analytics**: added `@vercel/analytics` + `<Analytics/>` in layout.
  Verified live in prod: `/_vercel/insights/script.js` → 200.
- **Dead code**: deleted 10 unused hero/scene files left from the WebGL hero
  (replaced by static orb + Canvas2D neural layer).
- **Dependency cleanup**: dropped `three`, `@react-three/{fiber,drei,
  postprocessing}`, `@types/three`, `react-helmet-async`.

### Verified (not changed — investigation results)

- **Mobile (375px)**: the overflow audit flagged 9 sections as overflowing,
  but this was a FALSE POSITIVE. `pageHorizOverflow = 0` (no horizontal
  scroll); the inflated section `scrollWidth` came from the decorative,
  off-canvas SectionGlow blobs (`pointer-events-none`, clipped by
  `overflow-hidden`). Screenshotted Process / Problem / Founders at 375px —
  all stack cleanly to single column. No fix needed.
- **SEO**: metadata, robots.ts, sitemap.ts, opengraph-image, favicons,
  manifest, llms.txt all present and complete. og-image.png exists.
- **Domain split**: `sersan.dev` (email) vs `sersan.io` (web) is intentional
  and internally consistent — all SEO/canonical/OG use `.io`, all contact +
  legal emails use `.dev`.

### Git Commits

| Hash | Message |
|------|---------|
| `98f9112` | chore: add Vercel Analytics, remove dead R3F/three scene code |

### Testing

- [OK] `npx tsc --noEmit` — clean
- [OK] `bun run build` — green
- [OK] Production deploy verified: sersan-v2.vercel.app → 200, correct title,
  analytics endpoint live
- [OK] Mobile 375px screenshots: Process, Problem, Founders — clean stacking

### Status

[OK] **Completed**

### Next Steps (require user / external — out of autonomous scope)

- Native-Italian proofread of IT copy
- Real device + screen-reader / keyboard a11y pass
- Lighthouse / Core Web Vitals measurement on prod
- 4K orb regen (image-gen credits low)
- Trust-page claim wording (needs business sign-off)
- Resend API key in Vercel env so forms deliver leads (explicitly excluded
  by user this session)

---

## Session: Rebalance cinematic spine — fix stage layout / void

**Date**: 2026-05-31
**Task**: 05-31-rebalance-cinematic-spine-fix-stage-layout-void
**Branch**: `main`

### Summary

User flagged the homepage spine layout as "off" (01/Signals stage): orb
floating upper-right, copy jammed bottom-left, large diagonal void between.
Root cause: the 5 numbered stages were `items-end` (bottom-anchored) while the
orb was vertically centered. Rebalanced all stages + reframed the orb.

### Main Changes (cinematic-system-scroll.tsx)

- Numbered stages `items-end pb-20 sm:pb-28` → `items-center pb-12 sm:pb-16`
  so copy sits on the orb's eyeline.
- HeroBackdrop base zoom `1.06 → 1.22`, `objectPosition 50% → 32%` so the orb
  centers and the hex pedestal drops toward the bottom edge.
- Bottom vignette `h-3/4 → h-[45%]` (steeper) — fades the pedestal into a base
  instead of a stray block, without swallowing the centered orb.
- Left-gradient `w-2/3 → w-[58%]` + contrast scrim radius reduced — sit behind
  copy only, stop dimming the orb. Text contrast still holds (orb pinned right).

### Debugging note

Spent time chasing a "the orb is invisible" red herring — it was the DEV
server re-optimizing the orb image on each reload (first post-reload
screenshot caught it mid-load), NOT the overlays. Confirmed overlays are all
screen-blend (lightening) and harmless; restoring them with the image loaded
showed the orb fine.

### Git Commits

| Hash | Message |
|------|---------|
| `27d9653` | fix(hero): rebalance cinematic spine — kill the diagonal void |

### Testing

- [OK] `npx tsc --noEmit` clean + `bun run build` green
- [OK] Screenshots at 1920 + 1280: hero, 01 Signals, 02 Audit, 05 Handover —
  all balanced, void gone, pedestal reads as base
- [OK] Production deploy: sersan-v2.vercel.app → 200 (age 0)

### Status

[OK] **Completed**

### Next Steps

- None — task complete. (03 Build / 04 Operate share the same layout with
  single-line headlines, so they fit even more comfortably.)

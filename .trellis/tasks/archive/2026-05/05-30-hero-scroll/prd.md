# Hero fit + assisted section scroll

Two changes in `src/components/sections/cinematic-system-scroll.tsx` (+ lenis files for #2).

## 1. Hero no longer cut under the nav (BUG)
The hero StagePanel is bottom-anchored (`items-end pb-20 sm:pb-28`) inside the pinned h-screen
stage. When the hero content (eyebrow + 3-line headline + subcopy + keyword strip + proof + 2 CTAs)
is taller than the viewport (short/laptop heights, ~≤720px), the TOP (eyebrow + first headline line)
is pushed up UNDER the fixed nav and clips. Confirmed: at 680px height the eyebrow top = 68px, nav
bottom = 69px (touching/under).

Fix (hero stage / `isHero` panel ONLY — keep stages 01-05 bottom-anchored as the cinematic design):
- Anchor the HERO panel so its content is vertically CENTERED within the area BELOW the nav and never
  goes under it: e.g. `items-center` (instead of `items-end`) + top padding clearing the nav
  (`pt-[var(--header-h)]` or `pt-24`/`sm:pt-28`), keep a bottom pad. The eyebrow/headline must always
  sit clearly below the fixed nav at heights from ~600px up.
- Tighten the hero content's vertical rhythm slightly (gaps/margins) so the whole block fits with
  clearance at ~600-720px tall viewports without clipping top or bottom.
- Mirror the same safe-top fix in `MobileFallback`'s hero section if it can clip.
- Verify at 1280×680, 1440×800, 1024×640: eyebrow top must be > nav bottom with a comfortable gap.

## 2. Assisted section scroll (premium feel)
Add gentle "assisted" snapping between the homepage sections AFTER the pinned spine, so scrolling
settles on each section (premium, not a scroll-jack trap). The scroll engine is Lenis
(`src/lib/lenis-singleton.ts` + `src/components/smooth-scroll-provider.tsx`); CSS `scroll-snap`
generally does NOT work while Lenis animates scroll, so use Lenis's snap mechanism.
- Use `lenis/snap` (the Lenis Snap addon) OR a light custom snap: register snap points at the top of
  each post-spine homepage section; snap type = "proximity"-style/assisted (only snaps when the user
  settles near a section; never traps mid-scroll; small velocity threshold), with a gentle duration
  (~0.8-1s, the existing easing). Do NOT add snap points inside the 400vh pinned spine (it has its own
  scrub) — exclude it, or only register snaps from CredibilityStrip downward.
- Respect `prefers-reduced-motion`: no snapping when reduced motion is set.
- Must not break the spine's ScrollTrigger pin/scrub, anchor-link scrolling, or normal reading.
- Keep it restrained: assist, don't force. Easy to dial back.

## Constraints
tsc + build green. Hero fix is screenshot-verifiable (short heights). Snap feel needs a real-browser
pass (headless can't run Lenis rAF) — implement conservatively; user will feel-test on deploy.
Reduced-motion safe. No em-dashes. Keep EN/IT.

# Intro particle text: longer scroll hold, keep camera shake, remove section divider lines

## Goal

Refine the home pinned particle intro: (1) both particle-formed texts — the solid
"Sersan AI" and the recomposed "We build..." headline — must hold on screen
longer against scroll input once formed; (2) the scene must not feel frozen
during the scroll-gate: the camera keeps the alive "shake" feel it has during
normal site scroll (velocity-driven tilt/bob), while the page itself still does
not scroll down during the text transition; (3) remove the section divider
lines between homepage sections.

## What I already know (from code recon)

* `src/components/fx/hero-intro-gate.tsx` — scroll hijack: Lenis stopped at top,
  wheel/touch accumulate `textMorphStore.gateProgress` over `GATE_DISTANCE = 3200px`;
  releases at g=1; re-engages in reverse at top.
* `src/webgl/HeroTextParticles.tsx` — gate timeline constants:
  GROW 0→0.42, SOLID_IN 0.42→0.52, BRAND_OUT 0.6→0.68, MORPH 0.62→0.86,
  REVEAL 0.88→0.97. So solid "Sersan AI" holds only 0.52→0.60 (~256px of wheel)
  and the revealed headline holds only 0.97→1.0 (~96px) before the gate releases.
* After release, the hero stage of the 520vh pin (`cinematic-system-scroll.tsx`,
  stage "dormant" start 0.0 end 0.1, fade window 0.03) starts fading at pin
  progress 0.07 → "We build..." dies ~36vh of scroll after release.
* Camera is written ONLY by `src/webgl/SignatureLine.tsx` useFrame:
  `camera.position.y` from damped document scroll progress + lookAt-ahead tilt
  (full tier) + velocity-driven breath/glow on the line. During the gate the
  document scroll is 0 → camera and line are completely frozen (the "blocked"
  feel the user dislikes).
* Section dividers: `src/components/ui/section-divider.tsx` (`SectionDivider`),
  used 10× only in `src/app/page.tsx`. The underlying `.section-rule` CSS class
  is ALSO used in `footer.tsx` and `service-detail.tsx` (those are separate
  surfaces, possibly out of scope).
* Tier/fallback contract: gate + particles engage only on true-WebGPU desktop;
  every fallback path must stay untouched.

## Assumptions (temporary)

* "Effetto shake" = the alive camera motion the site has while scrolling
  (velocity-driven tilt/bob/breath), NOT a violent screen-shake.
* "Linee di divisione" = the homepage `<SectionDivider />` rules.

## Decision (ADR-lite)

**Context**: Three preference choices (hold mechanism, shake mechanism, divider
scope) — all confirmed by the user on 2026-06-10.

**Decision**:
1. **Hold**: reshape the gate timeline with dedicated plateaus — solid
   "Sersan AI" holds ~25% of the gate, the settled/revealed headline holds
   ~15% of the gate before release; `GATE_DISTANCE` raised (~4600px). ALSO
   extend the hero stage window after release (stage "dormant" end 0.1 → ~0.16)
   so "We build..." survives longer once the page scrolls again.
2. **Shake**: gate-input-driven — while the gate is engaged, wheel/touch input
   feeds the same motion channels as normal scroll: a small spring-back camera
   bob/tilt plus the velocity-driven line breath/glow. No always-on idle drift.
3. **Dividers**: homepage only — remove the 10 `<SectionDivider />` from
   `page.tsx` and delete the component. Footer + service-detail `.section-rule`
   untouched.

**Consequences**: gate feels longer and more deliberate (more wheel distance);
the scene stays alive during the lock; stage ranges in
`cinematic-system-scroll.tsx` shift slightly (subsequent stage starts may need
a nudge); removing dividers slightly changes document height (anchors recompute
via useSectionAnchors — verify the signature line stays glued).

## Requirements (evolving)

* "Sersan AI" solid text: longer plateau between formation and dissolve.
* "We build..." headline: longer hold after the particles settle — both inside
  the gate (plateau before release) and/or after release (hero stage window).
* During the gate, scroll input produces visible camera life (shake/tilt/bob)
  without any document scroll.
* Remove homepage section divider lines.
* All fallback paths (mobile, reduced-motion, non-WebGPU) unchanged.

## Acceptance Criteria (evolving)

* [ ] Once "Sersan AI" is solid, it takes noticeably more wheel input to dissolve it.
* [ ] Once "We build..." is formed/revealed, it takes noticeably more wheel input
      (and post-release scroll) before it fades.
* [ ] While the gate is engaged, wheel input visibly moves the camera (subtle
      shake/tilt) but `window.scrollY` stays 0.
* [ ] Gate remains fully reversible (scroll back up replays in reverse).
* [ ] No `<SectionDivider />` rendered on the homepage; no layout/console errors.
* [ ] Fallback paths byte-identical in behavior (no gate, DOM hero visible).

## Definition of Done (team quality bar)

* Lint / typecheck green; production build passes.
* Visual QA in Chrome (desktop viewport) of the full intro sequence + scroll-out.
* Docs/comments updated where timeline constants change.

## Out of Scope (explicit)

* Mobile/fallback intro redesign.
* Any change to the signature line geometry or post-FX grade.

## Bug found during QA (pre-existing, fixed here)

Race: the gate engages on the preloader's `complete()` beat and stops Lenis,
but the preloader's curtain `finish()` lands ~1s later and calls
`restoreScroll()` → `lenis.start()`, silently undoing the gate's stop. The
first wheel then smooth-scrolls the page via Lenis (which ignores
`defaultPrevented`), the gate's safety valve fires (`scrollY > 8` →
`setProgress(1)` + release) and the whole intro is skipped. Reproduced on the
production build; dev timing masks it. Fix: (1) re-assert `lenis.stop()` every
engaged frame in the gate's rAF tick; (2) `stopImmediatePropagation()` on
consumed wheel/touch so Lenis never sees the gesture.

## Technical Notes

* Files: `hero-intro-gate.tsx`, `HeroTextParticles.tsx`, `textMorphStore.ts`,
  `SignatureLine.tsx` (camera authority), `cinematic-system-scroll.tsx`
  (hero stage window), `page.tsx` + `section-divider.tsx` (dividers).
* Candidate shake approach: while gate engaged, feed gate input velocity into
  the existing velocity-driven channels (scrollStore.velocity → line
  breath/glow) + a small spring-back camera bob/tilt in SignatureLine, so the
  intro reuses the exact motion language of normal scroll.

# Research: Step 8 — Flip card→detail handoff feasibility on /case-studies

- **Query**: Decide do-now / defer / skip for the GSAP Flip card-to-detail handoff (PIANO §5.5/§9.8, J0SUKE/gsap-threejs-codrops). Feasibility + risk, not a full build plan.
- **Scope**: internal (codebase) + external (J0SUKE codrops pattern, GSAP 3.15 Flip surface)
- **Date**: 2026-06-13

---

## VERDICT: DEFER (split into a separate future task)

The Flip handoff is **not buildable as a meaningful image-Flip** in the current
codebase without first creating detail-page hero imagery that does not exist,
and it carries cross-route, curtain, canvas, and scroll-reset coordination cost
that does not fit inside step 8's "remove framer-motion + easeReverse menu +
QA/Lighthouse" closure scope. Two independent blockers each justify defer on
their own; together they make do-now the wrong call.

Step 8 STILL CLOSES THE PIANO without it — see "PIANO closure" at the end.

---

## Findings

### The two killers (either alone justifies defer)

**KILLER 1 — There is no shared element. The cards have no Flip-able image, and the detail page has no hero image to Flip INTO.**

- `src/app/case-studies/case-studies-client.tsx` (the grid): cards are
  `card-steel` **text cards** (industry eyebrow, client `<h3>`, engagement,
  summary, role, arrow). Only the **3 Sersan builds** (SphereNode, Quantex,
  Terra Noa) carry `study.previewImage` and render `<CardImageDistort>`.
  `src/data/case-studies.ts` confirms **3 of 13** studies have `previewImage`
  (lines 53, 77, 102). The other 10 cards are metric/text only — zero imagery.
- Worse, even those 3 images are **NOT a Flip source**. In
  `src/components/fx/card-image-distort.tsx` the base `<img>` is:
  `aria-hidden="true"`, `pointer-events:none`, and **`opacity:0` at rest**
  (`.card-image-distort__img` hidden until card `:hover`, lines 411-429 + the
  `card-image-distort` CSS). It is a decorative hover-reveal layer behind a navy
  scrim, sitting under a self-contained WebGL2 distortion canvas. Flipping a
  zero-opacity, hover-only, hidden decoration is not a real "clicked image flies
  to the hero" effect.
- The DESTINATION has nothing to land on:
  `src/app/case-studies/[slug]/case-study-detail-client.tsx` renders a **text
  hero** — a radial-gradient halo (`aria-hidden`, lines 41-46), an eyebrow, a
  `data-split-reveal` `<h1>`, role/domain, a lead paragraph, then metrics + tech
  stack. **There is no hero `<img>` / `<figure>` / media block anywhere on the
  detail page.** A Flip needs a recorded target rect on the destination; there
  is no destination element.

  → Net: a "card image → detail hero image" Flip has **neither a usable source
  nor any destination**. To make it meaningful you would first have to: add a
  real hero image to all 13 detail pages (10 of which have no asset), and
  surface a real (non-hidden) card image on all 13 grid cards. That is a content
  + design task, not a transition task — and is squarely "fase finale / future".

**KILLER 2 — Flip animates between two layout states inside ONE DOM tree; a card→detail click crosses an App Router ROUTE CHANGE, and three shipped systems all fire on that same navigation.**

`Flip.getState()` records rects/styles of live elements; `Flip.from(state, …)`
diffs them against where those SAME elements are NOW. On click the source page
(`case-studies-client.tsx`) **unmounts** and `[slug]` mounts. The source card is
gone post-nav, so a naive getState-then-from is structurally impossible (the
PIANO already flags this: "Barba escluso, resta App Router" — the reference's
persistent-container assumption does not hold here). Three shipped systems
collide on that navigation beat:

1. **Scroll hard-reset** — `src/components/smooth-scroll-provider.tsx` (lines
   69-77): every non-home nav calls `getLenis()?.scrollTo(0, {immediate:true})`
   then `ScrollTrigger.refresh()` ×2 (rAF + 450ms). A Flip overlay positioned in
   page coordinates would be yanked by the instant scroll jump unless it is
   `position:fixed` in viewport space and manually reconciled.
2. **Route curtain** — `src/app/template.tsx`: template REMOUNTS per nav and
   plays a navy `clip-path` wipe (`CURTAIN_DURATION 0.62s`, `expo.inOut`) PLUS a
   content fade-up (`autoAlpha 0→1, y 18→0, expo.out, clearProps:"all"`). A Flip
   flying card would either be **hidden by the curtain** (curtain is
   full-viewport navy) or have to be sequenced to play in the curtain's open
   window — a tight, fragile handshake.
3. **Canvas / signature line re-curve** — `src/webgl/Scene.tsx` (lines 202-207):
   `setReveal(0)` on pathname change, `setReveal(1)` after 420ms; the persistent
   canvas re-curves the line to the new page's anchors. A Flip would visually
   compete with the line fade-out/in on the same beat.

To survive this, the only honest approach is a **fixed-position cloned overlay
shim** (clone the card into a `position:fixed` node BEFORE navigating, keep it
alive across the unmount, then `Flip.fit()`/tween it onto the detail target
after `[slug]` paints, then remove it). That is exactly the "manual shared-
element shim, moderate/high" option the task names — and it must additionally
coordinate with curtain + scroll-reset + line re-curve above. That is a
multi-day, high-regression-surface build touching the SHIPPED curtain, canvas,
and scroll authority. Wrong fit for step 8.

### Approaches evaluated (all rejected for do-now)

| Approach | Mechanism | Verdict |
|---|---|---|
| (i) Fixed cloned-overlay shim | Clone card to `position:fixed` pre-nav, persist across unmount, `Flip.fit()` to detail target after paint, then remove. Must gate curtain, suppress scroll-jump visual, sequence with line re-curve. | **Highest value but highest risk.** Touches template.tsx (shipped curtain), smooth-scroll-provider (shipped scroll authority), Scene.tsx beat. AND there is no detail target to fit to (Killer 1). DEFER. |
| (ii) View Transitions API | Next App Router `unstable_ViewTransition` / browser VT. | Next's support is **experimental/unstable** at the project's version; Safari/Firefox coverage incomplete; it fights the curtain (both want to own the cross-fade) and the persistent WebGL canvas (VT snapshots the DOM, not the WebGL layer). Replacing the shipped curtain with VT is a much bigger architectural change than step 8 allows. DEFER/SKIP. |
| (iii) In-page Flip only (grid re-layout) | `Flip.from()` on a filter/sort re-layout of the grid WITHIN /case-studies (no route change). | Lower value — the grid currently has **no filter UI** (the WORK/CASE STUDIES filters in AGENTS.md §5 are not implemented in `case-studies-client.tsx`; the home rail is horizontal-only). Building a filter just to justify a Flip is scope creep. SKIP for step 8; could be a nice-to-have if a filter is ever added. |

### GSAP 3.15 Flip surface (verified installed)

`node_modules/gsap` is the full Club/trial build at **3.15.0**. Verified present
and registerable (no install needed if do-now were chosen later):

- `node_modules/gsap/Flip.js` exists; `dist/Flip.js` exports the full surface:
  `Flip.getState`, `Flip.from`, `Flip.to`, `Flip.fit`, `Flip.isFlipping`,
  `Flip.batch`, `Flip.makeAbsolute`. `all.js` re-exports `./Flip.js`.
- `node_modules/gsap/CustomEase.js` is also present (relevant to the easeReverse
  half of step 8 — see below). `SplitText.js`, `ScrollTrigger.js`,
  `ScrollSmoother.js` all present.
- Registration pattern used in-repo (`case-studies-rail.tsx` lines 18-20):
  `if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);` —
  Flip/CustomEase would register identically. No `CustomEase`/`Flip`/`easeReverse`
  usage exists anywhere in `src/` today (grep clean).

So the **tooling is not the blocker** — the missing shared element and the
cross-route/curtain/scroll-reset coordination are.

### J0SUKE / gsap-threejs-codrops — why the reference does not transfer

The codrops demo persists ONE container across page changes via **Barba.js**
(or an equivalent SPA shell with a single persistent DOM root), so the clicked
`<img>` element literally survives the "page change" and Flip can diff it. This
repo is **Next App Router** — the page subtree genuinely unmounts/remounts per
route, and there is a competing curtain + an immediate Lenis scroll reset. The
PIANO itself records this caveat verbatim (§9.8 and the codrops hub note:
"Barba escluso, resta App Router"). The reference's *pixel-reveal on the
persistent canvas* idea is also moot here: the persistent canvas
(`Scene.tsx`) is the signature-line / ritual layer, not a per-image WebGL
gallery — there are no card "planes" on `/case-studies` (RailPlanes is gated to
`pathname === "/"` only, Scene.tsx line 251), so there is no WebGL plane to
hand off either.

### Related: the OTHER half of step 8 is unblocked and IS the right do-now

PIANO §4 + §9.8 pair the Flip with **easeReverse on the navbar MENU** and the
**framer-motion removal**. Per SHARED CONTEXT (binding): framer-motion has
**exactly 2 consumers left** — `src/components/reveal-on-scroll.tsx` and
`src/components/navbar.tsx`. Verified in `navbar.tsx`: it uses
`AnimatePresence`, `motion`, `useReducedMotion` to drive the dropdown
curtain-unroll (`panelMotion` height 0→auto), the pill stagger
(`listVariants`/`itemVariants`), and `EASE = [0.16,1,0.3,1]`. This is the
component whose open/close becomes the **interruptible easeReverse clip menu**
(distinct close easing), and porting it to GSAP + IntersectionObserver (mirror
the already-GSAP `src/components/ui/reveal.tsx`) is what DROPS framer-motion.
Note: the route curtain (`template.tsx`) is **already a one-way GSAP wipe** —
easeReverse-on-curtain is largely N/A; the easeReverse target is the navbar
menu, as SHARED CONTEXT states.

→ Step 8 do-now = easeReverse menu (navbar GSAP port) + reveal-on-scroll GSAP
port + drop framer-motion + QA/Lighthouse. The Flip is the ONE deferrable item
in step 8, and dropping it does not block the framer-motion removal (the menu
port stands alone).

## Recommended defer task (sketch only — NOT for step 8)

If/when revisited, scope a SEPARATE task with these preconditions made explicit
as its OWN deliverables (because they are the real work):

1. **Add real detail-page hero media** to `[slug]` (a `<figure>` hero block in
   `case-study-detail-client.tsx`) and **real, visible card media** to the grid
   — covering all 13 studies, including the 10 with no asset today. This is a
   content/design dependency, not a transition.
2. **Shared-element shim**: clone the clicked card media into a `position:fixed`
   overlay on pointerdown/click BEFORE `router.push`, persist it across the
   unmount, then `Flip.fit()` it onto the detail hero rect after `[slug]` paints
   (e.g. on the detail page's first layout effect), then remove the clone.
3. **Curtain coordination**: gate `template.tsx`'s curtain for this one
   nav-class (or play the Flip inside the curtain's open window) so the navy
   sheet never hides the flying clone. Highest regression risk — it edits the
   shipped curtain.
4. **Scroll-reset coordination**: the flying clone must be viewport-fixed so
   `smooth-scroll-provider`'s instant `scrollTo(0)` doesn't visibly snap it.
5. **prefers-reduced-motion**: no Flip at all — instant route swap (the existing
   reduced-motion path in template.tsx already does this; the shim must early-
   return under RM).
6. **a11y / bilingual**: the clone is `aria-hidden` decoration; real links and
   `useLanguage` copy stay the source of truth (no copy change). Focus must land
   on the detail `<h1>`/breadcrumb as today.

Risk class: **moderate/high**, multi-day, edits 3 shipped systems. Correctly a
future task, consistent with PIANO's "fase finale".

## QA plan (for the step-8 do-now WITHOUT Flip — what actually ships)

This is the QA the framer-removal + easeReverse menu needs; the Flip adds
nothing to ship:
- **Build/type gates** (the only binding gates per frontend specs): `next build`
  clean + TS strict; confirm `framer-motion` is gone from `package.json` and no
  residual imports (`grep -rn "framer-motion" src/` → 0).
- **Console-free**: open each route, menu open/close, language toggle — no
  warnings/errors.
- **Multi-viewport** (real Chrome, not just headless — the repo's WebGL/canvas
  beats are unreliable in headless background tabs per MEMORY): 360px (mobile
  native menu footer), 768px (mode flip), 1280px (the navbar gutter clip case
  the code comments call out), 1440px. Verify the menu unroll open AND the
  interruptible close (open → click toggle mid-open → it reverses with the
  distinct easeReverse, no stuck/half-open panel).
- **prefers-reduced-motion**: menu just fades (no height/stagger), curtain stays
  `display:none`, reveals are instant — on EVERY route.
- **60fps**: menu open/close and reveal-on-scroll stay at 60fps (GSAP transform/
  opacity only; no layout thrash from the height animation — verify the GSAP
  height port doesn't trigger reflow jank vs framer's height:auto).
- **Lighthouse**: mobile perf ≥ 80 (AGENTS.md budget); confirm dropping
  framer-motion doesn't regress (should help bundle size).

## Caveats / Not Found

- `mcp__exa__get_code_context_exa` was **not available** in this environment
  (the exa MCP tool is not registered). The J0SUKE pattern analysis above is from
  the PIANO's own recorded notes (§5.5, §9.8, codrops hub: "Barba escluso, resta
  App Router") plus the documented Flip-across-Barba mechanics — not a fresh
  fetch of the repo. The conclusion does not depend on the exact codrops code:
  the two killers (no shared element; cross-route + curtain + scroll-reset) are
  established entirely from THIS codebase's actual files, which is sufficient.
- The AGENTS.md §5 WORK page "filters" (All · FinTech · …) are **not implemented**
  in `case-studies-client.tsx` (no filter UI exists), so the in-page-Flip-on-
  filter option (iii) has no host to attach to today.
- This is a feasibility assessment; no code was written or modified.

# Research: SLICE B — Cross-route Flip handoff mechanics (card → detail hero)

- **Query**: Design the cross-route Flip handoff on top of SLICE A's abstract seeded visual (a node with `data-flip-id={slug}` on both the grid card and the detail hero). Design a FULL shared-element shim (1) AND a LOWER-RISK coordinated reveal (2), then RECOMMEND one with a file-level plan + RM + a11y + QA.
- **Scope**: internal (shipped codebase) + GSAP 3.15 Flip API verification
- **Date**: 2026-06-13

---

## TL;DR — RECOMMENDATION

**Build (2): the LOWER-RISK COORDINATED REVEAL.** It touches ONLY the detail page
(`case-study-detail-client.tsx`), reads the already-shipped curtain timing as a
constant, and modifies NONE of the three shipped+QA'd systems (route curtain,
scroll hard-reset, canvas re-curve). It delivers ~85% of the perceived "handoff"
(the destination visual resolves in on the curtain's open beat, seeded-identical
to the card the user clicked, so it reads as continuity) at ~15% of the
regression surface. Approach (1) is fully designed below and is buildable, but it
edits all three shipped systems on the one navigation beat where they already
interlock — a poor trade against a refactor that was JUST stabilised and QA'd.

The `data-flip-id={slug}` contract from SLICE A is still honoured by (2): the
detail hero carries `data-flip-id={study.id}` and the grid card carries it too.
(2) simply does not fly a clone between them — but the attribute stays, so (1)
remains a clean future upgrade with zero data/markup churn if ever wanted.

---

## Verified facts (from the actual code)

### GSAP Flip 3.15.0 — confirmed surface (`node_modules/gsap/Flip.js`)
- `Flip.getState(targets, vars)` (line 1426), `Flip.from(state, vars)` (1434),
  `Flip.to` (1444), `Flip.fit(fromEl, toEl, vars)` (1456), `Flip.makeAbsolute`
  (1497), `Flip.batch` (1501), `Flip.isFlipping` (1512) — all present.
- **`Flip.fit(fromEl, toEl, {duration, ease, ...})` is the key primitive for the
  shim**: with a `duration` it returns a `gsap.to(fromEl, …)` tween that
  transforms `fromEl` so its rect matches `toEl`'s current rect (line 1487-1494).
  No persistent shared DOM node required — exactly what a cross-route clone needs
  (clone = `fromEl`, detail hero = `toEl`). `Flip.getState`/`from` are NOT usable
  cross-route (the source unmounts; see KILLER 2 in `step-8-flip-feasibility.md`),
  so the shim uses `Flip.fit` against a freshly-cloned fixed node, not getState.
- Register guarded by `typeof window`, mirroring `smooth-scroll-provider.tsx:19-21`
  (`gsap.registerPlugin(ScrollTrigger)`) and `case-studies-rail.tsx`.

### Shipped systems on the card→detail navigation beat (all confirmed)
1. **Route curtain** — `src/app/template.tsx`. Template REMOUNTS per nav. Plays:
   content fade-up (`autoAlpha 0→1, y 18→0, 0.7s expo.out, clearProps:"all"`) +
   a SIBLING navy curtain `clip-path` wipe `inset(0% 0 0% 0)` → `inset(0% 0 100% 0)`
   (`CURTAIN_DURATION = 0.62s`, `expo.inOut`). Curtain is `.transition-curtain`
   = `position:fixed; inset:0; z-index:60; pointer-events:none` (globals.css
   846-863). **Guarantee: ALWAYS ends fully open + inert** (onComplete re-asserts
   `inset(0% 0 100% 0)` + `pointerEvents:none`). First mount SKIPS the wipe.
   Reduced-motion: no animation, curtain `display:none`.
   - The curtain covers the viewport (navy) DURING the wipe and lifts bottom-up.
     A flying clone at z < 60 would be HIDDEN by it; at z > 60 it would float
     ABOVE the navy sheet (which is what (1) needs).
2. **Scroll hard-reset** — `src/components/smooth-scroll-provider.tsx:69-77`.
   Every non-home nav: `getLenis()?.scrollTo(0, {immediate:true})` then
   `ScrollTrigger.refresh()` at next rAF and again at +450ms. A
   page-coordinate overlay would be yanked by the instant `scrollTo(0)`; a
   `position:fixed` viewport-space overlay is immune (does not scroll with Lenis).
3. **Canvas / signature-line re-curve** — `src/webgl/Scene.tsx:202-207`.
   `useEffect([pathname])`: `setReveal(0)` then `setReveal(1)` after **420ms**.
   The persistent canvas (z-0, `layout.tsx:196` `CanvasHost`) fades the line out,
   re-curves to the new page's `[data-line-anchor]`s, fades back in.
   `CURTAIN_DURATION 0.62s` and this 420ms window are the "one beat" the comments
   reference — both are the choreography clock (2) reads.

### Navigation mechanism (confirmed)
- Grid cards are `<Link href={`/case-studies/${study.id}`}>` (`card-steel`)
  (`case-studies-client.tsx:94-99`). App Router intercepts the click and does a
  client-side soft nav → the `/case-studies` subtree unmounts, `[slug]` mounts,
  `template.tsx` remounts (new curtain), `smooth-scroll-provider` fires its
  scroll-reset effect, `Scene.tsx` fires its re-curve effect.
- For (1): a Flip shim must run code BEFORE the router navigates, so it must
  intercept the click (`preventDefault` + snapshot + `router.push`). The
  `custom-cursor.tsx` only READS `data-cursor` for ring presentation (`:145`
  `closest("[data-cursor]")`) — it does NOT intercept navigation, so no conflict.
  `smooth-scroll-provider`'s delegated click handler only hijacks in-page `#`
  anchors (`:120-131`) — also no conflict with a `/case-studies/<slug>` link.

### Z-index map (for choosing the overlay layer)
- Persistent canvas: z-0. Content wrapper: z-[1] (`layout.tsx:213`). Navbar:
  z-50; mobile menu panel: z-[60] (`navbar.tsx:350,479`). Route curtain: z-60
  (globals.css:849). → A flying clone in (1) must sit at **z-[70]** (above the
  curtain so the navy sheet never hides it; above the navbar so it reads as the
  top layer during flight). The overlay is `aria-hidden` + `pointer-events:none`.

### SLICE A dependency (the shared visual) — current state
- Only 3 of 13 studies have `previewImage` (`case-studies.ts:53,77,102` —
  spherenode/quantex/terra-noa) rendered via `CardImageDistort`
  (`case-studies-client.tsx:100-105`). That `<img>` is `aria-hidden`,
  `opacity:0` at rest, hover-only — NOT a Flip source (per feasibility KILLER 1).
- The detail hero (`case-study-detail-client.tsx:40-46`) is a text hero with an
  `aria-hidden` radial halo — NO media block, NO Flip destination today.
- **SLICE A's job** (sibling slice, not yet written) is to define an ABSTRACT,
  seeded, on-brand procedural/CSS/WebGL visual that is IDENTICAL in concept on
  the card and the detail hero, carrying `data-flip-id={study.id}`. SLICE B
  assumes that node exists on BOTH ends and is the source+destination.

---

## CONTRACT with SLICE A (binding for either approach)

SLICE B depends on these from SLICE A; stated here so both slices agree:

1. **A single Flip node per side**, each carrying `data-flip-id={study.id}`:
   - **Card side**: the seeded visual is the FIRST child of the `<Link>` (it
     already is the first child slot for the 3 builds via `CardImageDistort`;
     SLICE A renders the abstract visual there for all 13). It must have a STABLE,
     measurable rect at rest (not `opacity:0`/`display:none`) so (1) can snapshot
     it and (2)'s seed reads identically. Recommend a dedicated wrapper:
     `<div data-flip-id={study.id} data-flip-card className="…">` containing the
     seeded visual.
   - **Detail side**: a NEW `<figure data-flip-id={study.id} data-flip-hero>`
     hero media block added at the top of `case-study-detail-client.tsx`'s
     `<article>` (before/around the eyebrow+h1), rendering the SAME seeded visual.
2. **Seed = `study.id`** (the slug). Same seed → same colors/positions/shape on
   both sides, so card and hero are visually continuous. Palette: cyan `#3BE1FF`
   → violet `#7C5CFF` signal over navy `#0B1422` base (brand tokens
   `--accent` / `--accent-2`).
3. **The visual is decorative**: `aria-hidden="true"` on the Flip node; real
   `<Link>` text + `useLanguage` copy stay the source of truth. NO copy change.
4. **The 3 existing `previewImage`s**: SLICE A reconciles (reuse the photo as a
   textured fill UNDER the seeded signal overlay, OR supersede `CardImageDistort`
   for parity across all 13). SLICE B is agnostic — it Flips/reveals whatever
   single `data-flip-id` node SLICE A puts there. Recommend SLICE A keep the
   abstract seeded visual as the Flip layer for all 13 (uniform handoff), and let
   the 3 photos remain the hover-distort enhancement BEHIND it on the card only
   (no photo on the detail hero — there is no detail photo and none can be made).

---

## APPROACH 1 — FULL SHARED-ELEMENT SHIM (the real cross-route Flip)

### Mechanism (lifecycle)
A `position:fixed` cloned overlay that is born on the card click, survives the
App Router unmount via a root-level portal + a module/store snapshot, and is
`Flip.fit()`-tweened onto the detail hero after `[slug]` paints, then removed.

```
USER CLICKS CARD
  └─ click handler on the <Link> (capture phase) runs BEFORE App Router nav:
       1. e.preventDefault()
       2. read the clicked card's data-flip-id node rect (getBoundingClientRect)
          + clone its computed visual (see "what to clone" below)
       3. store snapshot { slug, rect, cloneHTML|seed } in a module singleton
          (flipHandoffStore) — survives the page-subtree unmount
       4. router.push(`/case-studies/${slug}`)   // App Router soft nav
  ─ /case-studies subtree UNMOUNTS; [slug] MOUNTS; template REMOUNTS (curtain)
  ─ FlipHandoffOverlay (lives in ROOT layout, never unmounts) reads the store,
    renders a position:fixed clone at the stored rect, z-70, aria-hidden,
    pointer-events:none  → visible ABOVE the navy curtain
  ─ Detail page mounts; useLayoutEffect finds [data-flip-id={slug}][data-flip-hero]
    and signals the overlay (store: targetReady)
  └─ Overlay runs Flip.fit(clone, detailHeroEl, { duration ~0.6, ease, scale:true })
       sequenced INSIDE the curtain's open window (start after curtain begins
       lifting so the clone lands as the page resolves), then on complete:
         - hide the clone, clear the store
         - the real detail hero (which was opacity:0 during the flight) fades in
```

### Where the persistent overlay lives + how the snapshot crosses the nav
- **`FlipHandoffOverlay`** — a new client component mounted ONCE in
  `src/app/layout.tsx`, as a SIBLING of `<SmoothScrollProvider>`'s children (it
  must be OUTSIDE the `<main>{children}</main>` subtree so it does NOT unmount on
  route change). It renders `null` unless a handoff is in flight; when in flight
  it renders the fixed clone via `createPortal` to `document.body` (or just a
  fixed div — body portal keeps it clear of any transformed ancestor).
- **`flipHandoffStore`** — a tiny zustand store (matches the repo's zustand
  convention, e.g. `scrollStore`/`textMorphStore`) holding
  `{ slug, sourceRect, seed, phase: 'idle'|'pending'|'flying' }`. Module-pinned
  like `textMorphStore` so it survives the soft nav. The click handler writes
  `pending`; the overlay reads it on the next paint; the detail page writes
  `targetReady`.
- **Click interception** — a shared `useFlipHandoff()` hook used by the grid
  `<Link>`s (and prev/next links on the detail page). It attaches `onClick` that
  does the snapshot + `router.push`. Keep the real `href` for SSR/no-JS/middle-
  click/cmd-click (only `preventDefault` on a plain left-click with no modifier
  keys — otherwise let the browser/Link do its thing).

### What to clone (decorative, cheap)
- DO NOT clone a live WebGL canvas (can't move a GL context; the seeded visual
  may be CSS or canvas). Clone a **static rasterization of the seeded visual**:
  simplest = the seeded CSS-gradient div (a `cloneNode(true)` of SLICE A's card
  visual, or re-render the same seeded component into the overlay with the same
  `seed`/`data-flip-id`). Because the visual is procedural+seeded, the overlay
  can just MOUNT THE SAME COMPONENT with the same seed — pixel-continuous, no
  rasterization needed. This is the big win of the abstract-seeded approach over
  a photo: the clone is trivially reproducible.

### Coordination with the three shipped systems (CONFLICT ZONES + risk)
| Shipped system | Conflict | Mitigation | Risk |
|---|---|---|---|
| **Route curtain** (`template.tsx`) | Navy sheet (z-60) covers the viewport during the wipe; a clone below it is hidden. | Clone at **z-70** (above curtain). Sequence the Flip to START as the curtain begins lifting (read `CURTAIN_DURATION` as a shared const) so clone + curtain resolve together. DO NOT modify the curtain tween or its always-ends-open guarantee — only READ its duration. If timing must be tighter, the curtain could expose its timeline via a store, but that EDITS the shipped curtain. | **HIGH** — even "just read the const" couples a new system to the curtain's beat; any future curtain change silently desyncs the Flip. If sequencing needs a store handshake, it edits the shipped curtain = highest risk. |
| **Scroll hard-reset** (`smooth-scroll-provider`) | `scrollTo(0,{immediate})` fires on the new route; a page-coordinate clone would jump. | Clone is `position:fixed` (viewport space) → immune. The detail hero TARGET rect is read AFTER the scroll-reset settles (in the detail page's `useLayoutEffect`, post-paint), so `Flip.fit` fits to the correct post-reset rect. | **MEDIUM** — must guarantee the target rect is read after the reset + after `ScrollTrigger.refresh()` reflow; mis-timing fits to a stale rect (clone lands in the wrong place). |
| **Canvas re-curve** (`Scene.tsx`) | Line fades out/in over 420ms on the same beat; a flying clone competes visually. | The clone is a small foreground object; the line is a background element — they don't overlap spatially much. No code change; just accept they share the beat (arguably reinforces "one beat"). | **LOW** — visual-only; no shared state. |

### prefers-reduced-motion (1)
- RM = NO Flip at all. The `useFlipHandoff` hook early-returns under
  `matchMedia("(prefers-reduced-motion: reduce)")` → it does NOT `preventDefault`,
  so the `<Link>` navigates normally and `template.tsx`'s RM instant path runs
  (no curtain, no fade). The overlay never mounts a clone. Identical to today.

### a11y / bilingual (1)
- Clone is `aria-hidden="true"` + `pointer-events:none` decoration. Real `<Link>`
  + `useLanguage` copy unchanged (no copy change). Focus lands on the detail
  `<h1>` as today (App Router default focus / existing behaviour) — the overlay
  must not steal focus (it's not focusable). Middle/cmd/ctrl-click and keyboard
  Enter must still hard-navigate (don't preventDefault on modified clicks; on
  keyboard activation, skip the Flip and let Link navigate).

### Files for (1)
- EDIT `src/app/layout.tsx` — mount `<FlipHandoffOverlay />` outside `<main>`.
- CREATE `src/components/fx/flip-handoff-overlay.tsx` — the persistent overlay +
  `Flip.fit` runner.
- CREATE `src/webgl/store/flipHandoffStore.ts` (or `src/lib/`) — the snapshot store.
- CREATE `src/lib/use-flip-handoff.ts` — the click-intercept hook.
- EDIT `src/app/case-studies/case-studies-client.tsx` — wire the hook onto the
  grid `<Link>`s; ensure the seeded visual node carries `data-flip-id` (SLICE A).
- EDIT `src/app/case-studies/[slug]/case-study-detail-client.tsx` — add the
  `data-flip-hero` figure (SLICE A), the `useLayoutEffect` target-ready signal,
  and the post-flight hero fade-in.
- (Possibly) EDIT `src/app/template.tsx` IF a timeline handshake is needed —
  **this is the line we do not want to cross.**

### Net risk for (1): **MODERATE→HIGH, multi-day.** Touches 6 files, couples a
new system to the curtain's beat, races the scroll-reset for the target rect, and
adds a click-interception layer over App Router navigation on a refactor that was
just stabilised. Buildable, but the curtain coupling is the weak joint.

---

## APPROACH 2 — COORDINATED REVEAL (no cross-route shim) — RECOMMENDED

### Mechanism
No flying clone, no click interception, no root portal, no store. The detail
hero's abstract seeded visual (SLICE A's `data-flip-id` node) plays a **clip /
mask reveal entrance** that is TIMED to land inside the curtain's open window, so
that as the navy curtain lifts (bottom-up) it UNCOVERS a hero visual that is
already resolving in — seeded-identical to the card the user just clicked. The
brain reads continuity (same color/shape signal appearing where the card was
heading) without any element literally crossing the route.

```
USER CLICKS CARD (<Link>, unchanged — App Router soft nav)
  ─ curtain wipe plays (template.tsx, UNTOUCHED): navy sheet lifts bottom-up
    over CURTAIN_DURATION=0.62s; canvas line re-curves over 420ms (UNTOUCHED)
  └─ detail page mounts; its hero visual runs a GSAP clip-path / scale-in reveal
       in useGSAP/useLayoutEffect, started at mount, eased to finish ~as the
       curtain finishes lifting (read CURTAIN_DURATION as a shared const; small
       lead so the visual is "already there" as it's uncovered)
       → the same seeded signal the card showed now blooms in at the hero
```

### Why this reads as a "handoff" without a shared element
- **Seed continuity**: the card's visual and the hero's visual are generated from
  the SAME `study.id` seed (SLICE A contract) → same cyan→violet signal, same
  shape language. The user's eye was on that exact pattern at click; it reappears
  at the destination. The lack of a literal cross-route fly is masked by the navy
  curtain (which is OPAQUE during the cover phase — the user CANNOT see a "missing
  flight" because the screen is navy mid-transition, then uncovers the resolved
  hero). The curtain is, in effect, the handoff cover.
- **One beat**: the hero reveal, the curtain lift, and the line re-curve all
  resolve on the same ~0.42–0.62s window the codebase already choreographs.

### Coordination with the three shipped systems
| Shipped system | Interaction | Code change |
|---|---|---|
| **Route curtain** | READ-ONLY: import/duplicate `CURTAIN_DURATION` as a shared const to time the reveal's finish; never modify the tween or its open-guarantee. | NONE to template.tsx. |
| **Scroll hard-reset** | The reveal is a `clip-path`/`transform`/`opacity` tween on the hero element, in viewport flow AFTER the reset has run (the detail page mounts post-reset). No interaction with `scrollTo(0)`. | NONE. |
| **Canvas re-curve** | Shares the beat; background line + foreground hero reveal reinforce "one breath". | NONE. |

→ **ZERO modifications to any shipped system.** The only new code is an entrance
animation local to the detail hero.

### prefers-reduced-motion (2)
- RM: NO reveal. The hero visual renders at its final state immediately (mirror
  the existing `data-split-reveal` / `Reveal` RM handling and the curtain's RM
  `display:none`). Guard with `matchMedia("(prefers-reduced-motion: reduce)")` in
  the `useGSAP`/effect → early-return, set final state via `gsap.set` (or just
  render final by default and only animate when motion is allowed). Matches
  `template.tsx`'s RM instant path and globals.css `prefers-reduced-motion` block.

### a11y / bilingual (2)
- The hero visual is `aria-hidden="true"` decoration (SLICE A). The `<h1>`
  (`data-split-reveal`, `key={language}`) and all `useLanguage` copy are
  UNCHANGED — no copy change, byte-identical. Focus continues to land on the
  detail `<h1>` as today (the reveal is on the decorative visual, not the heading,
  so it does not touch the focus/heading contract). Bilingual: the visual is
  language-agnostic (seeded by slug, not text), so EN/IT are identical.

### File-level plan (2) — RECOMMENDED BUILD
1. **EDIT `src/app/case-studies/[slug]/case-study-detail-client.tsx`**
   - Add SLICE A's hero visual node at the top of `<article>` (around line 48,
     before the eyebrow), e.g.:
     ```tsx
     <figure
       data-flip-id={study.id}
       data-flip-hero
       aria-hidden="true"
       className="case-hero-visual …"   // sized hero media block, navy base
     >
       <SeededSignal seed={study.id} accent={accent} />  {/* SLICE A component */}
     </figure>
     ```
   - Add the reveal in a `useGSAP`/`useLayoutEffect` (register nothing new; plain
     `gsap.fromTo` on the figure):
     ```tsx
     useGSAP(() => {
       const el = heroRef.current;
       if (!el) return;
       if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
         gsap.set(el, { clipPath: "inset(0 0 0 0)", autoAlpha: 1 });
         return;
       }
       gsap.fromTo(el,
         { clipPath: "inset(0 0 100% 0)", autoAlpha: 0, scale: 1.04 },
         { clipPath: "inset(0 0 0% 0)", autoAlpha: 1, scale: 1,
           duration: CURTAIN_DURATION, ease: "expo.out",
           // small lead so the visual is resolving AS the curtain uncovers it
           delay: 0.04, clearProps: "clipPath,scale" });
     }, { scope: heroRef });
     ```
   - `clearProps` only the transient props (leave `autoAlpha` final state intact,
     or set final explicitly) to avoid leaving a transformed ancestor over
     sticky/fixed descendants — mirror `template.tsx`'s `clearProps` caution.
2. **CREATE `src/lib/transition-timing.ts`** — export
   `export const CURTAIN_DURATION = 0.62;` and import it BOTH in `template.tsx`
   (replace its local const) and in the detail hero. This is the ONLY edit to
   `template.tsx` and it is a pure refactor (extract a constant) — no behaviour
   change, no risk to the wipe. (Optional but keeps the beat single-sourced; if
   even this is deemed too much, duplicate the literal with a comment pointing at
   `template.tsx` — zero edit to the shipped file.)
3. **`data-flip-id` on the card** (SLICE A) — kept for forward-compat with (1),
   no behaviour in (2). SLICE B adds nothing to `case-studies-client.tsx` for (2).

### Net risk for (2): **LOW.** One detail-page edit + one constant extraction.
No click interception, no portal, no store, no cross-route element, no edits to
the curtain tween / scroll-reset / canvas. Cannot regress the shipped systems
because it does not touch them.

---

## RECOMMENDATION RATIONALE — why (2) over (1)

1. **Stability of a just-shipped refactor.** PIANO steps 1-8 are DONE, committed,
   QA'd on `feat/webgl-refactor`. The three systems (1) must touch (curtain,
   scroll-reset, canvas beat) are the exact load-bearing transition machinery that
   was hardest to get right (the curtain's "always-ends-open" guarantee, the
   scroll-reset's double-refresh, the 420ms re-curve). (1) couples a new system to
   the curtain's timeline and races the scroll-reset for a target rect — net new
   regression surface on the most fragile shipped code. (2) cannot regress them.
2. **The abstract-seeded visual makes (1)'s payoff small.** The whole point of a
   shared-element Flip is recognition of a SPECIFIC image flying to its
   destination. Here the visual is procedural and seeded — there is no unique
   photo whose flight is meaningful; the SAME seed regenerated at the destination
   already delivers the recognition. The curtain is opaque during the cover phase,
   so the user never sees the gap a clone would fill. (2) buys nearly all the
   perceived continuity with none of the cross-route plumbing.
3. **No-JS / middle-click / cmd-click correctness.** (1) intercepts `<Link>`
   clicks; getting modifier-click, keyboard, and prefetch semantics right is
   fiddly. (2) leaves `<Link>` 100% untouched → navigation semantics are exactly
   as shipped and QA'd.
4. **Forward-compatible.** (2) keeps `data-flip-id={slug}` on BOTH ends, so if the
   user later wants the literal flight, (1) drops in on top with zero markup/data
   churn — the contract is already paid for.

If the user explicitly wants the literal flying element despite the cost, (1) is
fully specified above and is buildable — gate the curtain coupling carefully and
treat `template.tsx` as read-only (sequence by reading `CURTAIN_DURATION`, never
by editing the wipe).

---

## QA PLAN (for the RECOMMENDED build, (2))

Gates per frontend specs: TS strict + `next build` clean are the only hard gates;
console-free; one scroll source; `@/` imports; bun installer.

1. **Build/type**: `next build` clean; TS strict passes; no new deps (Flip not
   even needed for (2) — it's a plain `gsap.fromTo`).
2. **Cross-route timing** (the core acceptance): click each of several cards →
   the navy curtain lifts and UNCOVERS a hero visual that is already resolving in
   (not popping after the curtain finishes, not still blank when uncovered). The
   hero seed VISUALLY MATCHES the card just clicked (spot-check 3-4 slugs incl.
   one of the 3 builds + a text-only study). Tune `delay`/`ease` so the reveal
   finishes within ~1 frame of the curtain's open.
3. **Curtain still always-ends-open** (NO REGRESSION): rapidly click card →
   immediately nav away (prev/next, breadcrumb, navbar) mid-reveal → screen never
   left covered; no trapped clicks (curtain `pointer-events:none` intact). Confirm
   `template.tsx` is byte-unchanged except the const import (diff it).
4. **Scroll-reset intact**: every detail page opens scrolled to top; back to grid
   restores correctly; `ScrollTrigger` triggers re-measure (scrub/parallax still
   fire). Confirm `smooth-scroll-provider.tsx` untouched.
5. **Canvas re-curve intact**: the signature line fades out/re-curves/fades in on
   each nav as before; the hero reveal does not stutter it. Confirm `Scene.tsx`
   untouched.
6. **prefers-reduced-motion**: emulate RM → hero visual appears at final state
   instantly (no clip/scale), curtain stays `display:none`, route swap instant —
   on EVERY case-study detail route.
7. **60fps**: the reveal is `clip-path`/`transform`/`opacity` only (compositor-
   friendly) — profile the detail-enter on a mid-tier profile; no layout thrash
   (no width/height/top animations). Watch the seeded visual's own cost (SLICE A
   owns that; if it's a WebGL canvas, confirm it doesn't spike on mount).
8. **Multi-viewport** (REAL Chrome, not headless — per MEMORY, WebGL/canvas beats
   are unreliable in headless background tabs): 360, 768, 1280, 1440. The hero
   figure must size sensibly at each (it's a new layout block — verify it doesn't
   shove the h1 below the fold on mobile or break the `max-w-5xl` article).
9. **No console errors/warnings** on the grid, each detail route, prev/next, and
   language toggle (the `key={language}` h1 remount must not warn).
10. **Bilingual**: EN↔IT toggle on a detail page — the seeded visual is identical
    (slug-seeded), copy is byte-identical, no re-animation glitch.

---

## OPEN DECISIONS FOR THE USER

1. **(1) vs (2)** — SLICE B recommends **(2)**. Confirm, or opt into (1)
   accepting the curtain/scroll coupling risk on the just-shipped refactor.
2. **The 3 existing `previewImage`s** (spherenode/quantex/terra-noa): under (2),
   keep the hover-distort photo on the CARD (behind SLICE A's seeded overlay) and
   use the seeded abstract visual ALONE on the detail hero (no detail photo
   exists)? Recommend YES (uniform, on-brand, no fabricated client imagery). This
   is really a SLICE A decision; flagged here for coordination.
3. **`CURTAIN_DURATION` single-sourcing**: extract to `src/lib/transition-timing.ts`
   (one trivial refactor edit to `template.tsx`) vs duplicate the literal with a
   comment (zero edit to the shipped file). Recommend the extract — it's a pure
   constant move, and it keeps the "one beat" honestly single-sourced.
4. **Reveal style**: bottom-up `clip-path` (matches the curtain's bottom-up lift,
   reinforcing the uncover) vs a radial/scale bloom (more "signal igniting").
   Recommend bottom-up clip to echo the curtain. SLICE A's visual may dictate.

---

## Caveats / Not Found

- **SLICE A is not yet written.** No `data-flip-id` exists in the codebase today
  (grep clean in `src/`); the only `previewImage` rendering is `CardImageDistort`
  on 3 cards. This plan assumes SLICE A delivers the seeded `data-flip-id` node on
  both card and hero per the CONTRACT section. If SLICE A's visual is a live
  WebGL canvas (not CSS), (1)'s "clone the same seeded component" still holds but
  (2) is strictly simpler (no clone at all) — another point for (2).
- Approach (1)'s curtain SEQUENCING was specified as READ-ONLY (`CURTAIN_DURATION`
  const) to honour DO-NO-HARM; a tighter handshake (curtain exposing its timeline
  via a store) was deliberately NOT designed because it edits the shipped curtain.
- Flip API verified by reading `node_modules/gsap/Flip.js` (3.15.0); not run.
- QA is a plan; no code was written or run (research slice only).

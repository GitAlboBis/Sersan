# Mobile Overhaul Review — `git diff a03d768..HEAD`

## Verdict

**Ship it, with four fixes queued.** I could not find a single defect that breaks the site, loses content, or moves a non-reduced-motion desktop at ≥1440px. The pointer-gating discipline is genuinely good — `tierStore.ts`'s new `phoneGL` axis and the coarse-pointer DPR clamp are both scoped so a fine pointer provably cannot reach them, the copy contract held (only `production-grade-section.tsx:374` changed, as sanctioned), no dependency was added, and `syncTouch` stayed off. **The single biggest risk is not visual — it is `cinematic-system-scroll.tsx:1154`**: the home hero collapses from a server-rendered 315vh spine to a 180svh compact spine on every phone, and the one effect written to catch that collapse skips the exact pass on which it happens. On a client-side navigation into `/` nothing re-measures afterwards, so every scroll trigger below the hero is armed against a document ~1.35 viewports taller than the one the reader is looking at. That is the one I would fix before shipping.

---

## A. Hard-constraint breaches (desktop / reduced-motion)

Both are confined to one user: **fine pointer + OS reduced-motion**. Neither touches the normal desktop path.

### A1 — RM desktop can no longer see the home rail's STACK pills at all
`src/components/sections/case-studies-rail.tsx:304`

Under reduced motion the rail resolves `mode = "native"` (`:346` includes the RM query), so `stackInFlow` is true (`:786`) and the pills render **inside** `<div className="… card-text-layer">` (`:261`). All six rail cards have media, so all six carry `card-has-distort` (`:224`; verified against `src/data/case-studies.ts` — spherenode…apple-uk all have a preview or logo). The only trigger a fine pointer can fire is `:hover` — and `globals.css:788-793` fades the pills' **ancestor** to `opacity: 0` on that same hover. Composited 0 × 1 = 0. `[data-focus="true"]` never fires (`use-centre-focus.ts:121-124` is inert on a fine pointer). Before this diff the pills were the absolute overlay outside the text layer and revealed correctly. The CSS comment at `globals.css:825-829` explicitly claims this path still works — so this is a broken intent, not a chosen trade-off.

**Fix:** don't derive `stackInFlow` from `mode`. The detection effect at `:340` already builds the `(pointer: coarse)` query — track it as its own state and use `detected && coarse` for `stackInFlow`. An RM desktop then keeps the overlay placement that already works, and touch is unaffected.

### A2 — DragRail repaints the ≥1440px reduced-motion desktop three ways
`src/components/ui/drag-rail.tsx:122`, `:341`, `:247`

`.rail-affordance-touch` (`globals.css:1791-1795`) hides only `.drag-rail-affordance`. Three other things carry no pointer or motion gate, and both adopting rails (`case-studies-rail.tsx:902`, `founders-rail.tsx:1896`) reach them under RM at any width:

- `:122` — the masked edge fade. Seven cards exceed 1440px so `data-rail-state` is not `inert` and the selector matches: a 1.25rem transparent gradient at the rail edge that `a03d768` did not have (old native branch was a bare `<ul className="… overflow-x-auto px-6 pb-4">`).
- `:341` — `scrollPaddingInline: "1.5rem"`, new: it moves where a keyboard-focused card lands.
- `:247` — `overscrollBehaviorX = "contain"` on fine pointers. Under RM Lenis is never created, so `.lenis-smooth [data-lenis-prevent]` (`globals.css:288`) does **not** apply; the old RM desktop had `auto`. This inline write is a behaviour change.

`globals.css:1775-1784` states the guarantee this violates verbatim: *"A reduced-motion desktop reader keeps exactly what `main` gives them today — a native scroller with no bar."*

**Fix:** wrap the `.drag-rail[data-rail-fade="true"]…` block in `@media (pointer: coarse)`, and make `scrollPaddingInline` + the `contain` branch coarse-only (or drop the `.rail-affordance-touch` class in favour of one `@media (pointer: coarse)` wrapper around the whole affordance grammar, which is the same construction the touch-ergonomics block already uses).

---

## B. Other confirmed defects

### B1 — Home hero's SSR→compact height collapse never re-measures ScrollTrigger  *(highest impact in the diff)*
`src/components/sections/cinematic-system-scroll.tsx:1154`

The server always emits `mode = "desktop"` (`:1135-1141`, `height: 315vh` at `:1314` / `lib/spine.ts:19`); a phone's first resolution is `compact` (`180svh`, `:287`/`:1037`) or `stacked`. The refresh effect returns on `prev === null` — which is *always* the state on the pass where the mode first resolves. Confirmed there is no rescue on that path:

- `smooth-scroll-provider.tsx:117-137` deliberately **skips** its raf + 450 ms refresh cadence for `pathname === "/"`, with the comment *"the homepage cinematic owns its own refresh"* — i.e. it hands ownership to precisely the effect that no-ops.
- The `[60, 250, 700, 1500]` refresh cadence at `:1228-1232` is inside an effect guarded `if (!hasDetectedViewport || mode !== "desktop") return;` (`:1184`) — it does not exist on a phone.
- `CompactSpine`'s trigger is pin-less, and GSAP only auto-queues a global refresh from a pinning trigger.

Reliably broken on a client-side nav into `/` (tap the logo from any interior route); racy on cold load, where `load` may or may not fire after detection. The corrected form landed in the twin file in this same diff — `audit-week-timeline.tsx:175-176`.

**Fix:** mirror the twin —
```ts
if (prev === mode) return;
if (prev === null && mode === "desktop") return;   // desktop === the SSR branch here
```
The identical stale guard sits at `fit-section.tsx:496` and `case-studies-rail.tsx:365`, both of which also SSR as `"pinned"` (`:433`, `:322`) and land on `"native"` on a phone; `services-section.tsx` has no such effect at all despite the same `"pinned"` SSR default (`:465`). Fix all four together or the same class of bug stays live below the fold.

### B2 — `/case-studies` filter pills left at 36px while their byte-identical `/resources` twin was raised to 44px
`src/app/case-studies/case-studies-client.tsx:99`

```
"inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-mono text-[10px] …"
```
vs `resources-client.tsx:102`, which is character-identical except for a leading `"tap-44 press-surface "`. Nine sector filters (All · FinTech · … · Agritech) in a wrapping row measure 36px tall at 390px — 8px under the floor — with no press feedback. `globals.css:1677-1680` names this file explicitly: *"the /resources filter pill (h-9 = 36px) and its untouched twin in case-studies-client.tsx"*. The hand-off between agents never happened; `MOBILE_AUDIT.md:639` still lists it open.

**Fix:** add `tap-44 press-surface` + a `pressRef` to the button at `:99`. Nothing else changes — `min-height` composes with `h-9` by design.

### B3 — Two owners set opposite `overscroll-behavior-x` on sibling rails of the same page
`src/components/sections/services-section.tsx:895`

The new services rail (brand new in `89c765a` — the old file had no horizontal scroller at all) hard-codes `max-sm:overscroll-x-contain`. `drag-rail.tsx:40-48` argues the opposite at length and implements it at `:247`: `contain` is *"the WRONG answer for a phone: blocking the chain also blocks the OS edge-swipe that a reader uses to leave the page."* So on one page a reader gets OS back-swipe past the case-studies and founders rails and no back-swipe past the services rail. `services-section.tsx:97-110` lists its reasons for not adopting `DragRail` and never mentions overscroll, so this is unreviewed divergence rather than a decision.

**Fix:** drop `max-sm:overscroll-x-contain` and add the same pointer-split inline write `DragRail` uses (the utility alone is not enough anyway — `globals.css:288` gives every `[data-lenis-prevent]` a blunt `contain` under `.lenis-smooth`, so the inline origin is required to beat it).

---

## C. Checked and found clean

- **No new dependencies.** `package.json` / lockfile are not in the diff at all.
- **Reduced-motion ⇒ no canvas.** `webgl/CanvasHost.tsx:31` `if (!resolved || tier === "off") return null;` is intact, and `detectPhoneGL()` (`tierStore.ts`) returns `false` on RM *and* on a fine pointer before touching anything else — the new phone-GL axis cannot resurrect a canvas for an RM reader or alter a desktop render path.
- **DPR clamp is correctly scoped.** `tierStore.ts` `detectDprRange()` puts the new tile-GPU branch behind `(pointer: coarse)` and returns *before* `detectGpuClass()`. An M-series MacBook reports the same renderer string and is explicitly not caught. Desktop resolution unmoved.
- **Copy contract.** The only string change is `production-grade-section.tsx:374-375` — "Open a panel" / "Apri un pannello", exactly the sanctioned edit. No changes under `src/data` or the dictionaries.
- **Lenis.** `syncTouch` remains off (`lib/lenis-singleton.ts:61`); the only references are the comments defending that.
- **Hydration.** `neural-card.tsx` removed the `prefersReducedMotion()` render-time `matchMedia` read that made server and RM-client markup differ, and replaced it with CSS-only opt-outs (`motion-reduce:transition-none`). `use-neural-lattice-fallback.ts` was updated as the exact complement of `Scene.tsx`'s new island gate, so a capable phone cannot stack the SVG fallback and the WebGL lattice.
- **R3F island trap.** No new React state commit was introduced inside `<Canvas>` — the new rail/press machinery (`use-rail-progress.ts`, `use-press-state.ts`, `drag-rail.tsx`'s `paintReadout`) writes to `textContent` / CSS custom properties from a shared frame with no `setState`.
- **Desktop non-RM at ≥1440px.** Every layout change I traced is behind `max-sm:`, `(pointer: coarse)`, or `mode === "native"` — which a fine pointer at ≥1440px reaches only under reduced motion (§A). The root font-size change is the one sanctioned exception.

---

## D. Not verifiable from static analysis

1. **The actual pixel measurements.** `tap-44` / `tap-icon-44` composition, the footer row padding, and the 44px claim generally were verified as *rules*, not as rendered boxes. One pass with a device-emulated 390px viewport and a box-measure would close it.
2. **Frame cost on a real phone.** The DPR clamp and the phone-GL gate are correct in shape, but whether a capable phone actually holds frame with `NeuralLattice` mounted is a device question. `tierStore.ts` itself flags the `cores <= 4` cut as an **open QA item**: log `navigator.hardwareConcurrency` on every target handset before trusting it.
3. **The OS back-swipe behaviour in §B3.** iOS edge-swipe interaction with `overscroll-behavior-x` needs a real iPhone; the code divergence is certain, the exact user-visible consequence is inferred from `drag-rail.tsx`'s own stated reasoning.
4. **Screen-reader traversal** of the new rails, the compact spine, and the `inert`/`aria` toggling in the neural cards. `aria-label`s and `aria-controls` targets exist and are wired, but announcement order and whether the collapsed `grid-rows-[0fr]` body is reachable needs VoiceOver/TalkBack.
5. **The §B1 cold-load race.** I proved the SPA-nav failure. Whether a *cold* load on a phone is rescued by GSAP's `load` autoRefresh depends on image/font timing on the device — treat it as unknown until measured, and fix the guard regardless.
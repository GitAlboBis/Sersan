# Research: Sticky horizontal scroll rail for the home case-studies section

- **Query**: pin-spacer-free horizontal rail (CSS sticky + GSAP ScrollTrigger scrub) for 13 case-study cards + 1 "In development" card, on a Lenis-driven Next 16 page, without breaking `[data-line-anchor]` measurements
- **Scope**: mixed (2 external repos studied at code level + internal Lenis/ScrollTrigger/zustand wiring)
- **Date**: 2026-06-11

---

## 1. Sources studied

### 1a. ui-layouts `horizontal-scroll` (registry component)

Fetched from `https://raw.githubusercontent.com/ui-layouts/uilayouts/main/apps/ui-layout/registry/components/external/horizontal-scroll.txt` (also exists as `apps/ui-layout/public/r/horizontal-scroll.json`; a framer-motion variant lives at `registry/components/scroll-animation/framer-horizontal-scroll.tsx`).

It uses `motion` (`animate`, `scroll`, `spring`) — **not** GSAP — but the DOM/transform math is the canonical sticky-rail pattern:

```html
<section class="h-[500vh] relative">        <!-- N=5 items → 5 × 100vh -->
  <ul class="flex sticky top-0">            <!-- the rail; sticky pins it, NO pin-spacer -->
    <li class="h-screen w-screen">…</li>    <!-- × N, each full viewport width -->
  </ul>
</section>
```

```ts
// Their transform: rail translates by (N−1) viewport-widths over the
// section's scroll progress (motion's `scroll(controls, { target: section })`
// maps section scroll progress 0..1 to the animation).
animate(ulRef.current, { transform: ['none', `translateX(-${items.length - 1}00vw)`] }, { easing: spring() });
scroll(controls, { target: section });
```

**Exact math, generalized for cards of width W (not w-screen):**

- rail width `R = N·W + (N−1)·gap + padLeft + padRight`
- horizontal travel `T = max(0, R − viewportWidth)`  ← for their w-screen cards this collapses to `(N−1)·100vw`
- section height `H = 100vh + T` (1 scrolled px = 1 translated px, the "natural" ratio; their `500vh` = `100vh + 4·100vw` only because vw≈vh ratios were acceptable for a demo). A speed factor is possible: `H = 100vh + T / speed` with `x = −T·progress` unchanged.
- progress mapping: `x = −T · sectionProgress`, where sectionProgress is 0 when section top hits viewport top and 1 when section bottom hits viewport bottom (sticky release moment).

They also do a per-item header parallax via segment offsets (`offset: [[i/N, 1], [(i+1)/N, 0]]`) — equivalent to per-card parallax keyed on the card's own viewport position; we get the same effect cheaper with Faure's counter-shift (§1b / §6).

### 1b. Codrops horizontal parallax gallery (David Faure)

Repo `davidfaure/horizontal-parallax-gallery-codrops`, branch **master**. Relevant files: `src/main.ts` (scroll controller), `src/gallery/index.ts` (rail render + parallax), `src/gallery/gallery.css`, `index.html`.

**Travel formula (`src/main.ts`)** — the one number that matters:

```ts
setLimit() {
  // container = the flex rail; wrapper = the overflow:hidden viewport
  this.scroll.limit = this.container.scrollWidth - this.wrapper.clientWidth;
}
```

His controller accumulates `wheel.deltaY` into `scroll.target`, clamps to `[0, limit]`, lerps with `ease: 0.07`, and applies `container.style.transform = translateX(-current px)`. **We ignore the entire wheel/lerp controller** — Lenis + ScrollTrigger progress replaces `target/current/ease`; we keep only `limit = scrollWidth − clientWidth` and the px-based `translateX`.

**Overscan counter-shift parallax (`src/gallery/index.ts` + `gallery.css`)** — image overscans its card by 25% and counter-translates as the card crosses the viewport:

```css
.gallery__media        { flex-shrink: 0; overflow: hidden; position: relative; }
.gallery__media__image { position: absolute; top: 0; left: -12.5%; width: 125%; height: 100%; object-fit: cover; }
```

```ts
const t = clamp((elementCenter - viewportCenter) / viewportCenter, -1, 1); // -1 left … 1 right
const shift = -t * 10;                       // counter-motion; 10% < 12.5% overscan headroom
image.style.transform = `translate3d(${shift}%, 0, 0)`;
```

Key property: it reads the card's **live screen position**, so the identical function works in pinned mode AND in the native `overflow-x` mobile fallback (where the rail moves by native scroll instead of translateX). His version calls `getBoundingClientRect()` per image per frame — see §6 for an analytic, reflow-free port.

**Rail CSS (`gallery.css`)**: wrapper `position:relative; width:100%; overflow:hidden`, rail `display:flex; gap:2rem; will-change:transform; height:100%`, items `flex-shrink:0`.

---

## 2. Recommended DOM structure (Tailwind 4)

14 cards total: 13 from `src/data/case-studies.ts` (ids: spherenode, quantex, terra-noa, revolut, jp-morgan, apple-uk, pharma-deloitte, regione-sardegna, salvatori, leonardo, who, rsa-italy, stealth-greentech) + 1 "In development" card (content source: `src/components/sections/work-in-progress.tsx`, `ITEMS_EN/ITEMS_IT` — "Multichannel Outbound", `status-pill`/`status-dot` classes already exist).

```tsx
{/* page.tsx keeps the wrapper: <div data-line-anchor="case-studies"> — unchanged. */}
<section
  ref={sectionRef}
  id="work"
  className="relative"                 /* height set in px by JS (useLayoutEffect + onRefreshInit) */
  style={{ minHeight: "100vh" }}       /* SSR fallback before JS measures */
>
  {/* sticky viewport — this IS the pin; no ScrollTrigger pin, no pin-spacer.
      Same pattern as the cinematic spine (cinematic-system-scroll.tsx:776-778). */}
  <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
    {/* optional fixed header inside the sticky frame (eyebrow + heading + "Full archive" link) */}
    <div className="container-px mb-8">…SectionHeading…</div>

    {/* the rail */}
    <ul
      ref={railRef}
      className="flex items-stretch gap-5 will-change-transform px-6 sm:px-10 lg:px-[max(2.5rem,calc((100vw-80rem)/2))]"
    >
      {cards.map((c, i) => (
        <li key={c.id} data-rail-card={i} className="shrink-0 w-[min(85vw,26rem)]">
          {/* card body = existing CompactCard / FeaturedCard markup — a real <Link href={`/case-studies/${c.id}`}> */}
        </li>
      ))}
    </ul>
  </div>
</section>
```

Notes:

- **Fixed card width in px/rem** (`w-[min(85vw,26rem)]` → 416px desktop) — never `ch`/content-driven width, so font swap cannot change `scrollWidth` (§6).
- `shrink-0` on every card is mandatory (flex would otherwise compress the rail to viewport width and travel = 0).
- Section height is **not** expressible as a static Tailwind calc once padding is responsive — set it from the measured rail:

```ts
const measure = () => {
  const travel = Math.max(0, rail.scrollWidth - window.innerWidth); // Faure's limit formula
  section.style.height = `${window.innerHeight + travel}px`;        // H = 100vh + T
  return travel;
};
```

Run it in `useLayoutEffect` (pre-paint, no visible jump) and again from `onRefreshInit` (§3).

---

## 3. GSAP ScrollTrigger config on this Lenis page

Existing wiring (do **not** duplicate any of it):

- `src/components/smooth-scroll-provider.tsx` already: registers ScrollTrigger, installs `ScrollTrigger.scrollerProxy(document.documentElement, …)` (lines 135-150), calls `ScrollTrigger.update()` on every Lenis `scroll` event (line 114), debounce-refreshes on resize (150ms, lines 155-160), and **kills ALL ScrollTriggers on its own unmount** (line 169).
- Lenis singleton: `src/lib/lenis-singleton.ts` (`acquireLenis`/`getLenis`; duration 0.9, smoothWheel). Lenis 1.3 auto-resizes internally (ResizeObserver), so changing the section height updates Lenis limits automatically — only ScrollTrigger needs an explicit `refresh()`.
- House style for scroll-scrub (cinematic spine `cinematic-system-scroll.tsx:691-702`, `use-scroll-parallax.ts:38-47`): `ScrollTrigger.create` + `onUpdate` + `gsap.set`/quickSetter — **no scrub tween, no pin**. The spine's own comment (lines 696-698) documents why pin is forbidden: sticky already pins; `pin:` would double-pin and break layout.

Recommended trigger (matches house style):

```tsx
useEffect(() => {
  if (!hasDetectedViewport || isMobile || reduceMotion) return; // §5 gating, mirrors the spine
  const section = sectionRef.current;
  const rail = railRef.current;
  if (!section || !rail) return;

  const setX = gsap.quickSetter(rail, "x", "px");
  let travel = 0;

  const measure = () => {
    travel = Math.max(0, rail.scrollWidth - window.innerWidth);
    section.style.height = `${window.innerHeight + travel}px`;
  };
  measure();

  const st = ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",      // progress hits 1 exactly when sticky releases
    invalidateOnRefresh: true, // re-resolve start/end from fresh layout on every refresh
    onRefreshInit: measure,    // re-measure travel + re-set height BEFORE ST re-computes positions
    onUpdate: (self) => {
      setX(-travel * self.progress);
      // hand progress + velocity to the WebGL layer (§4)
      useScrollStore.getState().setRail(self.progress, self.getVelocity());
    },
  });

  // Fonts can land after mount; card widths are fixed but heading/padding may shift.
  document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

  return () => {
    st.kill();
    gsap.set(rail, { x: 0 });
    section.style.height = "";
    useScrollStore.getState().setRail(0, 0);
  };
}, [hasDetectedViewport, isMobile, reduceMotion]);
```

Config rationale:

- **No `scroller` option** — the provider's `scrollerProxy` on `document.documentElement` makes the default scroller resolve through Lenis already.
- **No `scrub` tween needed** — Lenis (duration 0.9) already smooths the scroll position that `self.progress` derives from; an additional `scrub: 0.6` tween would stack a second smoothing pass (the spine's `scrub: 0.6` is inert there too — there's no linked animation). If extra rail lag is wanted aesthetically, the alternative is `gsap.to(rail, { x: () => -travel, ease: "none", scrollTrigger: { …, scrub: 0.5 } })` with `invalidateOnRefresh: true` so the function-value re-evaluates — keep scrub ≤ 0.6.
- **`ScrollTrigger.refresh()` interaction**: the provider refreshes on debounced resize (150ms) and on route change (but **NOT on `/`** — the homepage cinematic owns its refresh bursts at 60/250/700/1500ms, `cinematic-system-scroll.tsx:708`). Every one of those refreshes hits our trigger; `onRefreshInit → measure()` keeps height/travel correct without the rail owning its own resize listener. The one-shot `fonts.ready` refresh above is the only refresh the rail must trigger itself.
- `getVelocity()` is the ScrollTrigger built-in (px/s of the scrubbed scroll value).

---

## 4. Exposing rail progress + velocity to the WebGL layer

Follow the existing transient-read contract documented in `src/webgl/store/scrollStore.ts` (header comment: written from event, read via `getState()` inside `useFrame`, never reactively in render). Extend the existing store rather than adding a new one — RouteHero already imports it:

```ts
// scrollStore.ts additions
interface ScrollState {
  …
  /** Case-studies rail horizontal progress, 0..1 (0 = rail parked, 1 = fully traversed). */
  railProgress: number;
  /** ScrollTrigger getVelocity() of the rail's driving scroll, px/s. 0 when unpinned/unmounted. */
  railVelocity: number;
  setRail: (railProgress: number, railVelocity: number) => void;
}

// implementation
railProgress: 0,
railVelocity: 0,
setRail: (railProgress, railVelocity) => set({ railProgress, railVelocity }),
```

WebGL consumption (same as the existing `progress`/`velocity` reads):

```ts
useFrame(() => {
  const { railProgress, railVelocity } = useScrollStore.getState();
  // e.g. modulate the signature line's emissive drift while the
  // "case-studies" anchor is activeAnchor; damp railVelocity like anchorPulse.
});
```

Cleanup must reset to `(0, 0)` on unmount (included in §3 snippet) so the WebGL layer never reads a stale rail value after navigation. Note `setRail` fires on every Lenis scroll event while pinned — same write frequency as the existing `setScroll`, no extra cost pattern.

Related spec: `.trellis/spec/frontend/state-management.md` (anchor-name ↔ `routeCurves.ts` waypoint contract, line ~102).

---

## 5. Mobile / reduced-motion fallback — native horizontal scroll, no pinning

Gate exactly like the spine (`cinematic-system-scroll.tsx:650-663, 755-757`): `matchMedia("(max-width: 768px)")` + `matchMedia("(prefers-reduced-motion: reduce)")`, with a `hasDetectedViewport` flag so the trigger never attaches to a layout about to be swapped. Under reduced-motion the provider doesn't even create Lenis (native scroll branch, `smooth-scroll-provider.tsx:90-99`).

```tsx
{/* fallback variant — section is normal-flow height, no sticky, no JS */}
<section id="work" className="relative section-lg">
  <div className="container-px mb-8">…SectionHeading…</div>
  <ul
    data-lenis-prevent
    className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4
               [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    {cards.map((c) => (
      <li key={c.id} className="snap-start shrink-0 w-[85vw] max-w-[26rem]">…card…</li>
    ))}
  </ul>
</section>
```

- `data-lenis-prevent` (Lenis 1.x built-in attribute) keeps Lenis from hijacking wheel events over the nested scroller — relevant when the fallback renders on a desktop-narrow window where Lenis is still active. Touch scrolling is native under Lenis defaults anyway (`smoothWheel` only).
- `snap-x snap-mandatory` + `snap-start` per card = snap points for free.
- Faure's counter-shift parallax still works here unchanged if wanted (it reads live card positions), driven from the container's native `scroll` event instead of `onUpdate`.
- SSR: render the **fallback variant by default** is NOT the house pattern — the spine SSRs the desktop layout for SEO and swaps after detection (`cinematic-system-scroll.tsx:650-654`). Either choice works for the rail because all card links are in the DOM in both variants; following the spine convention (SSR desktop, swap on detect) keeps behavior uniform.

---

## 6. Accessibility

- **Cards stay real links**: each card is the existing `<Link href={`/case-studies/${id}`}>` (`case-studies-section.tsx:182` CompactCard pattern). Rail = `<ul>`/`<li>`; DOM order = visual order = tab order, so focus order along the rail is correct by construction.
- **Focus vs overflow:hidden trap**: when a keyboard user Tabs to an off-screen card, browsers auto-scroll the nearest scrollable ancestor — including `overflow:hidden` containers, whose `scrollLeft` gets silently set, desyncing the translateX. Handle `focusin` on the rail:

```ts
const onFocusIn = (e: FocusEvent) => {
  const card = (e.target as HTMLElement).closest<HTMLElement>("[data-rail-card]");
  if (!card || !sectionRef.current) return;
  stickyWrapper.scrollLeft = 0; // undo the browser's hidden-overflow auto-scroll
  const i = Number(card.dataset.railCard);
  const targetY = sectionRef.current.offsetTop + (i / (cardCount - 1)) * travel;
  getLenis()?.scrollTo(targetY) ?? window.scrollTo(0, targetY); // drive the VERTICAL scroll instead
};
```

  This converts focus into the equivalent vertical scroll position, so the scrub brings the card into view through the same path as wheel input.
- **Reduced-motion users get the unpinned native scroller** (§5) — no scroll hijacking at all, and `Reveal`/`CountUp` components already respect `motion-reduce`.
- Keep the section heading OUTSIDE the moving rail (inside the sticky frame) so screen-reader heading navigation lands on static content; the rail itself needs no `aria-hidden` (it is the real content, unlike the decorative WebGL canvas).

---

## 7. Per-card parallax port (optional, reflow-free)

Faure reads `getBoundingClientRect()` per image per frame — a forced reflow during scroll. In pinned mode every card position is analytic, so no DOM reads are needed:

```ts
// inside onUpdate, after setX:
const vwHalf = window.innerWidth / 2;
cardImages.forEach((img, i) => {
  const center = padLeft + i * (cardW + gap) + cardW / 2 - travel * self.progress;
  const t = gsap.utils.clamp(-1, 1, (center - vwHalf) / vwHalf);
  imgSetters[i](-t * 10); // quickSetter(img, "xPercent"); image is left:-12.5%, width:125%
});
```

CSS per card image (Tailwind): wrapper `relative overflow-hidden`, image `absolute top-0 left-[-12.5%] w-[125%] h-full object-cover` (shift budget 10% < 12.5% overscan, per Faure).

---

## 8. Pitfalls

1. **Never `pin: true`** — sticky already pins; ScrollTrigger pin inserts a pin-spacer div that re-parents the section, which is exactly what shifts `[data-line-anchor]` rect measurements and is why the repo standardized on sticky (spine comment, `cinematic-system-scroll.tsx:696-698`).
2. **`data-line-anchor="case-studies"` stays valid by construction**: `useSectionAnchors` (`src/webgl/hooks/useSectionAnchors.ts:67-102`) measures `getBoundingClientRect()` + `scrollY` against `document.scrollHeight`. The sticky section contributes its full `100vh + travel` height to normal flow with no DOM mutation, so fractions for ALL downstream anchors stay correct — provided the height is set **before** the anchor measure passes. Setting it in `useLayoutEffect` covers the mount pass; the hook's late passes (700ms/1600ms timeouts + `fonts.ready` + debounced resize at the same 150ms as the provider) cover everything later. The `routeCurves.ts` waypoint (`{ anchor: "case-studies", x: 1.25, z: 0.2 }`, line 45) needs no change. Note `work-in-progress` is also a waypoint (line 46) — if the WIP teaser section is absorbed into the rail, keep a zero-height `<div data-line-anchor="work-in-progress" />` in `page.tsx` exactly like the existing `credibility` placeholder (page.tsx:55), or the curve loses a waypoint.
3. **Resize re-measure**: `travel` AND the section height both depend on `window.innerWidth/innerHeight`. `invalidateOnRefresh: true` + `onRefreshInit: measure` makes every `ScrollTrigger.refresh()` (provider resize debounce, spine bursts) self-heal. Without `onRefreshInit`, a viewport grow leaves the section too tall and the rail over-translates past the last card.
4. **Fonts changing card width**: fix card width in rem/px (`w-[min(85vw,26rem)]`). If any card width were content-derived, Geist/display-font swap changes `rail.scrollWidth` after mount → travel changes → document height changes → all downstream anchor fractions shift. With fixed widths the only font-sensitive part is the heading block; the `fonts.ready → refresh()` one-shot covers it (and `useSectionAnchors` already re-measures on `fonts.ready` independently).
5. **Two sticky-pinned sections on one page** (520vh hero spine + this rail): safe because neither uses a pin-spacer — refresh order between the two triggers doesn't matter since `refresh()` only re-reads layout, never mutates it. The spine's four refresh bursts will re-resolve the rail's start/end for free. The one interaction to respect: the spine's `SpineExitGate` does a programmatic `window.scrollBy` at the pin-end crossing (`cinematic-system-scroll.tsx:985`) — the rail sits far below, unaffected, but do not copy that gate pattern for the rail.
6. **Provider kills all triggers on unmount** (`smooth-scroll-provider.tsx:169` `ScrollTrigger.getAll().forEach(st => st.kill())`) — the rail must still kill its own trigger in its cleanup (it unmounts on every route change while the provider persists).
7. **Transform via `x`/quickSetter, never `left`** — the rail repaints every Lenis tick; `will-change-transform` is already in the class list.
8. **`h-screen` vs mobile URL bar**: irrelevant here — pinning is desktop-only (mobile gets the native scroller). Keep `h-screen` to match the spine; `h-dvh` would desync the sticky height from the `window.innerHeight` used in `measure()`.
9. **Anchor link `#work`**: header/footer links scroll via the provider's Lenis click hijack with `offset: -72` (`smooth-scroll-provider.tsx:129`); landing 72px above section top means progress ≈ 0 — rail parked at card 1, which is the correct reveal state. The current `scroll-mt-24` on the section becomes inert in pinned mode (sticky starts at `top top`), harmless to keep for the fallback variant.
10. **Store hygiene**: reset `setRail(0, 0)` in cleanup, or the WebGL layer reads a stale `railProgress` of e.g. 0.7 after navigating away mid-rail (the scrollStore survives route changes; cf. the textMorphStore reset dance in `smooth-scroll-provider.tsx:52-64`).

---

## 9. Internal file map

| File | Relevance |
|---|---|
| `src/data/case-studies.ts` | 13 entries (interface lines 1-25; ids at 30-303); `previewImage`/`liveUrl` optional |
| `src/components/sections/case-studies-section.tsx` | current grid section to be replaced; reusable card markup (FeaturedCard 81-175, CompactCard 177-237), `INDUSTRY_COLOR`, `StatusPill`, section-end CTA |
| `src/components/sections/work-in-progress.tsx` | "In development" card content (`ITEMS_EN/IT`, `status-pill` classes) |
| `src/app/page.tsx` | `data-line-anchor` wrappers (case-studies at line 68, work-in-progress at 71); zero-height-anchor precedent at 55 |
| `src/components/sections/cinematic-system-scroll.tsx` | house sticky-no-pin pattern (691-702), viewport/reduced-motion gating (650-663, 755-757), refresh bursts (708), 520vh outer + `sticky top-0 h-screen overflow-hidden` inner (759-778) |
| `src/components/smooth-scroll-provider.tsx` | scrollerProxy, Lenis→ScrollTrigger bridge, resize refresh (150ms), kill-all on unmount, no-refresh-on-`/` rule |
| `src/lib/lenis-singleton.ts` | `getLenis()` for the focusin scroll handler; external RAF pump notes |
| `src/webgl/store/scrollStore.ts` | store to extend with `railProgress`/`railVelocity`; transient-read contract in header comment |
| `src/webgl/hooks/useSectionAnchors.ts` | exact anchor measurement cadence the rail's height-setting must coexist with |
| `src/webgl/curves/routeCurves.ts` | waypoints `case-studies` (line 45) and `work-in-progress` (line 46) |
| `src/components/ui/use-scroll-parallax.ts` | smallest in-repo example of the no-pin onUpdate+set idiom |

Versions (package.json): next 16.2.6, react 19.2.4, gsap ^3.15.0, @gsap/react 2.1.2, lenis ^1.3.23, zustand 5.0.14, tailwindcss ^4.

## Caveats / Not Found

- ui-layouts' component is framer-`motion`-based and uses full-viewport (`w-screen`) slides; the W-width-card generalization in §1a/§2 is derived, not copied.
- Faure's repo has no mobile fallback of its own (wheel-only controller); the "overscan counter-shift" is his parallax technique, and §5's native-scroll fallback is the standard adaptation, not from his code.
- `ScrollTrigger.getVelocity()` units are px/s of vertical scroll; if the WebGL layer needs horizontal px/s, scale by `travel / (sectionHeight − viewportHeight)` (= 1 when using the 1:1 height formula).

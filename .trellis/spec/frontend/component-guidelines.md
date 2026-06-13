# Component Guidelines

> How components are built in this project. React 19, client-first, Tailwind v4.

---

## Overview

Two component archetypes, with different conventions:

1. **UI primitives** (`components/ui/`) — reusable, variant-driven, often wrap a
   Radix primitive. Use `React.forwardRef`, `cva` for variants, named exports.
2. **Sections / page furniture** (`components/sections/`, top-level) — composed,
   content-heavy, frequently animated. Default-export function declarations.

Almost every component is a **Client Component** (`"use client"` at the top of
the file), because the site is animation-heavy (GSAP, framer-motion, R3F) and
interactive. Add `"use client"` whenever a component uses hooks, refs, event
handlers, or browser APIs.

---

## Component Structure

**UI primitive** — `forwardRef` + `cva` + `cn`, with `displayName`, named export.
From [button.tsx](src/components/ui/button.tsx):

```tsx
const buttonVariants = cva("inline-flex items-center justify-center …", {
  variants: {
    variant: { default: "bg-primary …", hero: "!rounded-full bg-[hsl(var(--accent))] …", outline: "border border-[hsl(var(--rule))] …" },
    size:    { default: "h-10 px-4", lg: "h-12 …", icon: "h-10 w-10" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
```

Note the **`asChild` + Radix `Slot`** pattern for polymorphic rendering, and that
`buttonVariants` is exported so other components can reuse the class recipe.

**Section component** — `"use client"`, default-export function declaration,
module-level constants for static content. From [hero.tsx](src/components/hero.tsx):

```tsx
"use client";
// module-level constants (NAV_ITEMS, CAMERA_PATH, FAILURES …) live here
export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { /* GSAP setup, bails early on prefers-reduced-motion */ }, []);
  return ( /* JSX */ );
}
```

---

## Props Conventions

- **Component props use an `interface` named `<Component>Props`**, extending the
  underlying DOM element attributes. See `ButtonProps` in [button.tsx](src/components/ui/button.tsx):
  ```tsx
  export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
      VariantProps<typeof buttonVariants> {
    asChild?: boolean;
  }
  ```
- For trivial props (e.g. just `children`), an **inline type** is fine:
  ```tsx
  export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {}
  ```
- Local component *state* shapes also use `interface` (e.g. `ContactFormState` in [contact-form.tsx](src/components/contact-form.tsx)).

---

## Styling Patterns

- **Tailwind utility classes** are the default. Compose conditional/merged
  classes with the `cn()` helper from [lib/utils.ts](src/lib/utils.ts) (clsx + tailwind-merge) — never string-concatenate classNames.
- **`cva`** for any component with more than one visual variant.
- Reach for design **tokens via CSS variables**, e.g. `bg-[hsl(var(--accent))]`,
  `text-ink-mute`, `border-[hsl(var(--rule))]`. See `type-safety` sibling and
  `state-management` for the token list. Don't hardcode hex colors.
- Custom semantic utility classes (`.card-steel`, `.eyebrow`, `.section`,
  `.container-px`, `.heading-1`) are defined in `app/globals.css` — prefer them
  over re-deriving the same long class string.

---

## Accessibility

- Build interactive primitives on **Radix UI** (accordion, dialog, tabs,
  navigation-menu, tooltip) so keyboard nav + ARIA come for free. See [accordion.tsx](src/components/ui/accordion.tsx), [navbar.tsx](src/components/navbar.tsx) (mobile menu uses Radix Dialog).
- Add explicit `aria-label` / `role` on landmark nav, and real `<label>`s on
  form inputs.
- A `.skip-to-content` link is rendered in `app/layout.tsx`.

---

## Common Mistakes

- Forgetting `"use client"` on a component that uses hooks/refs/handlers.
- Hardcoding colors instead of using `hsl(var(--token))`.
- Concatenating className strings instead of `cn()`.
- Adding a variant via prop branching instead of extending `cva` variants.
- Re-implementing a behavior Radix already provides accessibly.

---

## Established conventions (site overhaul)

### Typography — Geist, no serif
Fonts are **Geist Sans** (display + body) and **Geist Mono** (technical labels),
self-hosted via `next/font/google` in `app/layout.tsx` (do NOT add a CDN `<link>`;
no Fontshare). Tokens in `globals.css @theme`: `--font-sans`/`--font-display`/`--font-serif`
all map to `var(--font-geist-sans)`; `--font-mono` → `var(--font-geist-mono)`. There is
**no serif** — `--font-serif` exists only as a fallback alias to Geist.
- Headline accent emphasis = **accent color + `font-medium`/weight**, NOT italic (grotesk
  italic reads weak). e.g. `<span className="text-[hsl(var(--accent))] font-medium">`.
- Geist at 400 reads thin at display sizes → headings use weight 600.

### Brand colour — electric blue only
`--accent` (`#29A3F5`) is the only brand accent for customer-facing UI. `--accent-warm`
(brass) is **deprecated** — do not use it for page accents (founder-data `accent==="warm"`
CEO/CPTO logic is the lone exception). Use the `container-px` class for page gutters/width,
never `container mx-auto px-6`.

### Copy — no em/en-dashes
Do **not** use `—` or `–` as clause separators in user-facing copy (reads AI-generated).
Use commas, periods, or colons. Hyphens in compounds/ranges (`tier-1`, `30-min`) are fine.

### Hero
The homepage hero is the pinned `cinematic-system-scroll` spine: outer height =
`SPINE_HEIGHT_VH` (390vh, single source in `src/lib/spine.ts` — HeroLogo derives its
fallback from it too; never hardcode the number elsewhere). The 6 `STAGE_CONTENT` copy
blocks are canonical and render through a desktop grouping layer (`DESKTOP_GROUPS`:
hero / map / ship / handover — merged panels render both blocks, copy untouched).
`MobileFallback` (≤768px or reduced motion) iterates the UNGROUPED 6 blocks — desktop
compression must never change the copy source. See `state-management.md` for the i18n
of the spine copy and the lenis/snap convention for the spine's soft snap.

### Pinned sections — CSS sticky, never ScrollTrigger pin
Pinned scroll sections (hero spine, case-studies rail) use a **CSS `position: sticky`
frame inside a tall section** (`height = 100vh + travel`) — never ScrollTrigger `pin:`.
A pin-spacer mutates the DOM and invalidates the signature line's `[data-line-anchor]`
document measurements. Pattern (see [case-studies-rail.tsx](src/components/sections/case-studies-rail.tsx)):

- `ScrollTrigger.create` with `start: "top top"`, `end: "bottom bottom"`,
  `invalidateOnRefresh: true`, `onRefreshInit: measure`, and an `onUpdate` writing via
  `gsap.quickSetter` — **no scrub tween** (Lenis already smooths), **no `scroller` option**
  (the provider's scrollerProxy covers it).
- The smooth-scroll provider does NOT run `ScrollTrigger.refresh()` on `/`: a pinned
  section must do its own one-shot `document.fonts.ready → ScrollTrigger.refresh()`.
- Rail/track item widths must be **fixed rem-based** (`w-[min(85vw,26rem)]`), never
  font-dependent — width changes document height and shifts every downstream anchor.
- Fallback (coarse pointer / reduced-motion / tier off): native `overflow-x: auto` +
  scroll-snap with `data-lenis-prevent`, no pinning. Cards stay real focusable links.
- Multiple sticky-pinned sections on one page coexist safely (verified: spine + rail,
  zero anchor drift) — precisely because neither uses a pin-spacer.
- **Vertical phased-chapter timeline** (step 6, [audit-week-timeline.tsx](src/components/sections/audit-week-timeline.tsx)):
  composes the rail's sticky-frame ScrollTrigger with the spine's rAF `panelOpacity` crossfade
  (inert/aria/pointer-events discipline) over N contiguous sub-ranges, exactly one chapter lit
  at a time. The section height is a **constant** `100vh + count * TRAVEL_VH` — derived from the
  (frozen) chapter COUNT, never from card content — so whichever chapter is lit the
  document-height contribution is identical and no downstream `[data-line-anchor]` drifts. Snap
  the N-1 INTERIOR chapter boundaries only (`lenis/snap`, never 0/1), one fade-inset past each.
  The native fallback (mobile / coarse / reduced-motion) renders the prior flat cards verbatim
  and focusable. The signature line "walks" the chapters as emissive ticks via a section-local
  store (see `state-management.md` line-pulse convention), never a camera move.

### Draggable ↔ Lenis drag-to-scrub (step 6)

The first GSAP `Draggable` use in `src/` (the audit week timeline). Lenis owns the scroll
position, so a drag must drive Lenis, never `ScrollTrigger.scroll()` (that fights the
scrollerProxy). Recipe:

```ts
if (typeof window !== "undefined") gsap.registerPlugin(Draggable, InertiaPlugin);
// invisible 1px proxy; map its x to a document Y inside the pin's travel
Draggable.create(proxy, {
  type: "x", inertia: true, dragResistance: 0.35, bounds: { minX: -SPAN, maxX: 0 },
  onPressInit()    { snap?.stop(); getLenis()?.stop(); /* seed proxy at current scroll */ },
  onDrag()         { getLenis()?.scrollTo(y, { immediate: true, force: true }); },
  onThrowUpdate()  { getLenis()?.scrollTo(y, { immediate: true, force: true }); },
  onDragEnd()      { getLenis()?.start(); snap?.start(); },
  onThrowComplete(){ getLenis()?.start(); snap?.start(); },
});
```

- `immediate: true` skips the Lenis lerp (the hand is the clock); **`force: true` is required**
  because Lenis is `stop()`ed for the duration of the drag and `scrollTo` is a no-op on a
  stopped Lenis without it.
- `snap.stop()` during the drag so a pending proximity debounce can't fire mid-drag; restart
  both Lenis and snap on drag/throw end.
- Full teardown on unmount: `drag.kill()`, clear every snap point, `snap.destroy()`, `st.kill()`,
  restore `section.style.height`, and `store.reset()` so the WebGL layer never reads a stale
  timeline after a route change.
- Never construct any of this on the reduced-motion / no-Lenis path (native fallback only).

### WebGPU node path: author lines/wireframes in TSL, never drei `<Line>` (step 7)

On the `webgpuEnabled()` build (WebGPURenderer), **drei `<Line>` / `<QuadraticBezierLine>` /
`<CatmullRomLine>` do NOT work**: they build a `three-stdlib` `Line2` + `LineMaterial`, a raw GLSL
`ShaderMaterial` → the WebGPU NodeBuilder rejects it ("Material ShaderMaterial is not compatible")
and the line renders as a black silhouette. `three/webgpu`'s `Line2NodeMaterial` is WGSL-capable,
but its `LineGeometry`/`LineSegmentsGeometry` import from bare `'three'` → mixing `three` +
`three/webgpu` in one scene graph, the forbidden dual-namespace (see the `createRenderer` /
`lineNodeMaterial` headers). So author the geometry from **core `three`** you build yourself
(`TubeGeometry` along a `CatmullRomCurve3`, or a hand-built `BufferGeometry`/`LineSegments`) + a
**TSL node material** (`MeshBasicNodeMaterial` with a `fract()` dash mask, emissive >1.0,
`toneMapped:false`) — the pattern every line/particle/tube material in `src/webgl/materials/`
already follows (`lineNodeMaterial`, `railPlaneNodeMaterial`, `compliancePipelineNodeMaterial`).
The `LineSegments` / `Points` PRIMITIVE renders fine under WebGPURenderer; only the MATERIAL must
be a NodeMaterial.

### Focusable hotspots over a `role="img"` SVG must be sibling overlays, not children (step 7)

A `role="img"` element collapses its whole subtree into one presentational image for assistive
tech, so interactive children (buttons/links) inside it are **hidden from screen readers and the
tab order**. To annotate an SVG diagram with focusable hotspots (the /trust pipeline stages,
Radian-EXR pattern): keep the hotspot layer a **DOM sibling** of the `role="img"` div (never a
child), wrap both in a `position: relative` container, and `position: absolute` the transparent
hotspot buttons over the SVG stage centers by **percentage of the SVG viewBox**
(`left: (D_STAGE_X[i] / D_VB_W) * 100%`, vertical analog for the mobile viewBox) so they track the
responsive scale — NOT a separate stacked row (which visibly DUPLICATES the SVG's own labels — a
shipped-and-caught regression). Buttons transparent by default, `focus-visible` ring on focus,
`pointer-events` only on the buttons (the overlay container is `pointer-events-none`). Keep the
SVG `role="img"` + `aria-label`; the hotspots are additive focusable text reusing the frozen
labels.

### framer-motion removed: reveals + navbar menu are GSAP (step 8)

framer-motion is GONE — its last 2 consumers were ported to GSAP and the dependency was dropped
from package.json + bun.lock (run `bun install`, NEVER `npm install`, to keep bun.lock the
authoritative lockfile vercel.json builds with). Do NOT reintroduce framer-motion; GSAP (+
`@gsap/react` useGSAP) owns all animation now.

- [reveal-on-scroll.tsx](src/components/reveal-on-scroll.tsx) `RevealOnScroll` is now GSAP +
  IntersectionObserver (mirrors `ui/reveal.tsx`: `gsap.set` initial + IO `threshold: 0.3` +
  `gsap.to` expo.out + played-once guard + RM-static). **GOTCHA:** its `delay` prop is in
  SECONDS (the old framer `transition.delay` contract — ~40 consumers pass seconds like
  `delay={i * 0.1}`), so it is passed to gsap `delay:` AS-IS — do NOT divide by 1000. `Reveal`
  (ui/reveal.tsx) takes `delay` in MILLISECONDS (`delay / 1000`). The two reveal components have
  DIFFERENT delay units on purpose; do not "unify" them.
- [navbar.tsx](src/components/navbar.tsx) dropdown menu is a GSAP open/close, EaseReverseClipMenu
  style: two module-scope `CustomEase`s (`ease-menu-open` 0.16,1,0.3,1 / a snappier
  `ease-menu-close`), a `clip-path inset` unroll (NOT `height:auto`, which GSAP cannot tween),
  staggered pills, and INTERRUPTIBLE (kill + rebuild the timeline on each open/close pass so a
  re-open mid-close resolves cleanly). A `render` state keeps the panel mounted during the close
  tween and unmounts it in `onComplete`. All scroll-lock / Esc / outside-click / focus-return /
  route-change-close logic is plain React (unchanged); reduced-motion = instant fade, no
  clip/stagger. The route curtain ([template.tsx](src/app/template.tsx)) was already GSAP (a
  one-way per-navigation wipe) and is unchanged — easeReverse there is N/A.

### Text-reveal engines — one owner per surface (typography pass, step 3)

Four global/opt-in engines exist; never double-animate a surface:

| Engine | Targets | Opt-in |
|---|---|---|
| [heading-choreographer.tsx](src/components/fx/heading-choreographer.tsx) | H1s + hand-rolled display H2s | `data-split-reveal` attribute |
| [section-heading.tsx](src/components/ui/section-heading.tsx) | its own `<h2>` (self-splits) | automatic — do NOT also stamp `data-split-reveal` |
| [label-scrambler.tsx](src/components/fx/label-scrambler.tsx) | every `.eyebrow` (incl. composite dot-eyebrows) | automatic; skips `[data-eyebrow-text]` (SectionHeading owns those) |
| [count-up.tsx](src/components/ui/count-up.tsx) / [redacted-reveal.tsx](src/components/fx/redacted-reveal.tsx) | metric values / fit-warn rows | explicit component wrap |

Rules:
- **`key={language}` is mandatory** on every bilingual `data-split-reveal` heading.
  `SplitText.revert()` restores an innerHTML snapshot and orphans React's child fibers;
  an in-place EN/IT text swap then writes to detached nodes and the heading freezes in
  the old language. Same contract SectionHeading documents.
- A heading carrying `data-split-reveal` must NOT sit inside a `Reveal` /
  `RevealOnScroll` block (double animation) — lift the heading out, keep the
  sub-copy in the fade.
- Mask headroom for serif italic overshoot lives in `globals.css`: `.split-line-mask`
  gets `padding-block: 0.12em` cancelled by negative margins, and the parent
  `[data-split-reveal]:has(> .split-line-mask)` is `display: flex; flex-direction:
  column` — flex items don't collapse margins, so the cancellation is exact and
  **document height does not change** (anchor-drift rule). Don't "simplify" this
  back to block flow.
- LabelScrambler mutates the text nodes React created (TreeWalker, no
  `replaceChildren`); decorative child spans are untouched. If an external write
  (language toggle) lands mid-decode, it aborts and restores only its own writes.

### Don't: deferred reveal via paused `gsap.from` + `invalidate().restart()`

```ts
// WRONG — heading stays hidden forever
const tween = gsap.from(lines, { yPercent: 115, paused: true });
const fire = () => tween.invalidate().restart();
```
`invalidate()` makes the from-tween re-capture its destination from the CURRENT
value — by fire time the lines already sit at 115 (immediateRender), so it tweens
115→115. Reproduced and shipped-broken once (choreographer). Correct shape — hide
deterministically, build the tween at fire time:

```ts
gsap.set(lines, { yPercent: 115 });            // deterministic hidden state
const fire = () => {                            // guard with a `fired` flag
  gsap.fromTo(lines, { yPercent: 115 }, { yPercent: 0, ... });
};
```

### Convention: `once: true` ScrollTriggers need a creation-time in-view fire

A `once: true` trigger created when the element is already past `start` never fires
(GSAP only fires on an active-state CHANGE; `refresh()` can't rescue it). Every
once-trigger must pair with `if (st.isActive || st.progress > 0) fire();` plus a
`fired` guard against effect re-runs. Implemented in heading-choreographer.tsx AND
count-up.tsx (the detail-page metrics sit ~500px from the top — born-active was a
shipped bug). Inside pinned stages even that is wrong: panels are always
IO/ST-visible, so reveals/counters there key off the stage's own lit state (the rAF
`panelOpacity` 0.6 threshold in cinematic-system-scroll.tsx, or railStore progress
for the rail) — see the spine proof chips' `animateChipCounts`.

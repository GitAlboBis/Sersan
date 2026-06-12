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
The homepage hero is the 400vh pinned `cinematic-system-scroll` spine with a **static** orb
image (`public/images/hero/orb-core.webp`) backdrop + `NeuralNetLayer` (Canvas2D). `MobileFallback`
(≤768px) renders stacked sections with the orb as an **ambient top-right glow** (not the WebGL/spine).
See `state-management.md` for the i18n of the spine copy.

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

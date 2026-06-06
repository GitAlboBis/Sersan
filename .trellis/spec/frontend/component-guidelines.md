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

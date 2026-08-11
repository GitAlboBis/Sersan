import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Press physics + hover tempo (shared by every variant via the cva base):
 *
 * CSS transitions read their duration/ease from the DESTINATION state, so the
 * three timing declarations below encode an asymmetric gesture with zero JS:
 *   - base `duration-300`        → hover-OUT trails at 300ms (state you land in
 *                                  when the pointer leaves) — the lingering half
 *                                  of the hover pair, deliberately the slow one.
 *   - `hover:duration-200`       → hover-IN answers inside the 150–200ms
 *                                  responsiveness band, and — because releasing
 *                                  :active while still hovered lands you in the
 *                                  hover state — it is ALSO the ~200ms spring-back
 *                                  of the press, riding the entrance curve.
 *   - `active:duration-100/ease-in` → press-IN compresses in 100ms on a sharp
 *                                  in-curve (the site's exit language). Tailwind
 *                                  orders `active:` after `hover:` so it wins
 *                                  while both pseudo-states apply.
 *
 * The compression itself is `motion-safe:active:scale-[0.97]` — gated at the
 * source rather than countered with `motion-reduce:transform-none`, because the
 * global reduced-motion clamp in globals.css only flattens transition-duration
 * (the scale would still SNAP on press), and a bare transform-none guard loses
 * the specificity fight against the `:active` pseudo-class anyway.
 *
 * Transform-only by design: Magnetic wraps CTAs in its own div and tweens x/y/
 * scale on THAT element, so a scale on the button child composes multiplicatively
 * underneath it — the two never write to the same style. The transition property
 * list is targeted (not `transition-all`) so layout-affecting properties can
 * never be accidentally animated by a consumer's className.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-[var(--ease-entrance)] hover:duration-200 active:duration-100 active:ease-in motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          // No `transition-colors` here: tailwind-merge resolves it against the
          // base's targeted transition-[…] list (same group, later wins) and
          // would silently strip transform from the transition — freezing the
          // press compression on outline buttons only.
          "border border-[hsl(var(--rule))] bg-transparent hover:bg-[hsl(var(--accent)/0.08)] hover:border-[hsl(var(--accent)/0.8)] hover:text-[hsl(var(--accent))] text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-[hsl(var(--accent)/0.08)] hover:text-[hsl(var(--accent))]",
        link:
          // Press compression opts OUT here: `link` renders as inline text (and
          // via asChild can wrap arbitrarily wide anchors), where a whole-element
          // scale reads as the page flinching, not a button being pressed. The
          // override shares the exact motion-safe:active chain so tailwind-merge
          // resolves it against the base's scale-[0.97] deterministically.
          "text-[hsl(var(--accent))] underline-offset-4 hover:underline motion-safe:active:scale-100",
        hero:
          "!rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--bg))] font-semibold tracking-[-0.005em] shadow-[0_1px_0_0_hsl(0_0%_100%/0.22)_inset,0_10px_30px_-12px_hsl(var(--accent)/0.6)] hover:bg-[hsl(var(--accent)/0.92)] hover:shadow-[0_1px_0_0_hsl(0_0%_100%/0.28)_inset,0_18px_42px_-12px_hsl(var(--accent)/0.75)]",
        heroOutline:
          "!rounded-full border border-[hsl(var(--ink)/0.2)] bg-transparent text-foreground font-medium tracking-[-0.005em] hover:border-[hsl(var(--ink)/0.5)] hover:bg-[hsl(var(--ink)/0.04)] hover:text-[hsl(var(--accent))]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-md px-9 text-base sm:text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

/**
 * SMALL-VIEWPORT CTA ERGONOMICS (MOBILE_AUDIT.md §8 — the acceptance bar is
 * zero horizontal overflow at 320/360/390/412/430px).
 *
 * At 320px the content column is 256px wide (`--margin: 2rem` a side, now
 * that the root font-size finally renders at its authored 16px). A
 * `size="lg"`/`size="xl"` CTA is shrink-to-fit and the cva base above bakes
 * in `whitespace-nowrap`, so its MIN-CONTENT width is the entire label — and
 * because a flex item's `min-width` is `auto`, it refuses to compress below
 * that. "Book a 30-min scoping call" measured 298px inside a 256px column and
 * pushed the DOCUMENT 10px past the viewport; the Italian labels
 * ("Prenota una call di scoping di 30 min") are ~90px worse again.
 *
 * The fix belongs on the button, not on `--margin`: the 2rem gutter was
 * authored against a 16px root and is only now rendering at its intended
 * value, so compensating it backwards is explicitly off the table.
 *
 * Below `sm` the label wraps — which collapses min-content to the longest
 * WORD (~90px) — the horizontal padding tightens, and the leading tightens so
 * a two-line label still clears the fixed `h-12`/`h-14` pill height instead of
 * meeting the Button's own `overflow-hidden`.
 *
 * Every declaration is `max-sm:`-scoped, so ≥640px — every tablet and every
 * desktop width — is byte-for-byte unchanged.
 */
export const CTA_WRAP_SM =
  "max-sm:whitespace-normal max-sm:px-5 max-sm:leading-tight";

/**
 * `CTA_WRAP_SM` + the CTA fills its content column below `sm`. Preferred for
 * hero/section CTA pairs: it is also the better thumb target. `sm:w-auto`
 * hands the width back to the intrinsic sizing the desktop layout expects.
 */
export const CTA_FLUID_SM = `w-full sm:w-auto ${CTA_WRAP_SM}`;

/**
 * The wrapper half of `CTA_FLUID_SM`. Any element sitting BETWEEN the CTA row
 * and the Button — a `Magnetic` shell (`inline-block`), a `[data-hero-stagger]`
 * div, a `<Link className="block">` — has to be full-width too, or the
 * button's `w-full` resolves against a shrink-to-fit box and nothing changes.
 * Deliberately width-only: every wrapper this is used on is already
 * block-level (or blockified as a flex item), so the display stays untouched
 * and desktop cannot shift. A wrapper that is genuinely INLINE and outside a
 * flex row needs its own `block sm:inline` alongside this.
 */
export const CTA_WRAPPER_SM = "w-full sm:w-auto";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

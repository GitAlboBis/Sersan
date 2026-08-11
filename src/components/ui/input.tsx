import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FIELD_SHELL — the design system's form-control shell.
 *
 * Exported because not every control gets a primitive. `<select>` has no
 * React component here, and the /start intake used to hand-roll its own
 * field styles — a hardcoded `text-[14px]` that was immune to the root-font
 * fix and force-zoomed iOS Safari on every control (MOBILE_AUDIT D-5).
 * Anything rendering a raw control composes this instead of re-typing it, so
 * there is exactly one place where a form field's look and its zoom-safety
 * are decided.
 *
 * `text-base md:text-sm` is load-bearing, not taste: iOS Safari force-zooms
 * any focused control whose font-size resolves under 16px, which rescales
 * the visual viewport and desynchronises every pinned ScrollTrigger on the
 * page. 14px from `md` up is fine — no touch keyboard, no zoom rule.
 */
export const FIELD_SHELL =
  "w-full rounded-lg border border-[hsl(var(--input))] bg-surface px-3.5 text-base text-ink ring-offset-background transition-colors placeholder:text-ink-mute hover:border-[hsl(var(--input))] focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

/**
 * FIELD_CONTROL — the single-line variant of the shell (input, select).
 * `h-11` is 44px at the 16px root: the minimum touch target.
 */
export const FIELD_CONTROL = cn(FIELD_SHELL, "h-11 py-2");

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex",
          FIELD_CONTROL,
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

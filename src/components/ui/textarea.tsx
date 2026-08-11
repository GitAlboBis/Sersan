import * as React from "react";

import { cn } from "@/lib/utils";
import { FIELD_SHELL } from "@/components/ui/input";

/**
 * Textarea — the multi-line member of the same shell as `<Input>`
 * (see FIELD_SHELL in ui/input.tsx for why `text-base md:text-sm` is
 * load-bearing rather than cosmetic). Height comes from `min-h-[100px]`,
 * which callers override through `className`.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(FIELD_SHELL, "flex min-h-[100px] py-2.5 resize-y", className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-[0_10px_28px_-12px_hsl(var(--primary)/0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[hsl(var(--rule))] bg-transparent hover:bg-[hsl(var(--accent)/0.08)] hover:border-[hsl(var(--accent)/0.8)] hover:text-[hsl(var(--accent))] text-foreground transition-colors",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-[hsl(var(--accent)/0.08)] hover:text-[hsl(var(--accent))]",
        link: "text-[hsl(var(--accent))] underline-offset-4 hover:underline",
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

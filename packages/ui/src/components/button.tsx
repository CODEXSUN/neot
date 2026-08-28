import * as React from "react";
import type { ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { useDesignSystemComponentDefault } from "../design-system/component-defaults";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md active:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:bg-destructive/95",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:bg-destructive/95",
        outline:
          "border border-input bg-background shadow-sm hover:border-ring/40 hover:bg-muted hover:text-accent-foreground hover:shadow-md active:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-accent/70 hover:text-accent-foreground hover:shadow-md active:bg-accent/90",
        ghost: "shadow-none hover:bg-accent/70 hover:text-accent-foreground active:bg-accent",
        link: "shadow-none text-primary underline-offset-4 hover:translate-y-0 hover:underline active:scale-100"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  icon?: ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, icon, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const defaultVariant = useDesignSystemComponentDefault(
      "button",
      "default"
    ) as ButtonProps["variant"];
    const resolvedVariant = variant ?? defaultVariant;

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
        ref={ref}
        {...props}
      >
        {icon ? <span className="inline-flex">{icon}</span> : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

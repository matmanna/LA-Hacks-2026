import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@betterbill/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium text-base outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline: "border border-border bg-background hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-coral-soft text-coral-ink hover:bg-coral-soft/70",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 lg:h-11",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 px-6 text-lg",
        xs: "h-8 rounded-lg px-3 text-xs [&_svg]:size-4",
        icon: "size-11 rounded-xl",
        "icon-xs": "size-8 rounded-lg [&_svg]:size-4",
        "icon-sm": "size-10 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

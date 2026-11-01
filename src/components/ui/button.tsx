import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-[transform,background-color,box-shadow,opacity] duration-200 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Candy styles from @devclubnst/ui candy-button
        default:
          "bg-[radial-gradient(120%_80%_at_50%_70%,#ff2d46_0%,#a50e24_100%)] text-white shadow-[inset_0px_1px_4px_0px_rgba(255,255,255,0.4),inset_0px_-2px_4px_0px_rgba(0,0,0,0.15)] ",
        destructive:
          "bg-[radial-gradient(120%_80%_at_50%_70%,#e11d48_0%,#9f1239_100%)] text-white shadow-[inset_0px_1px_4px_0px_rgba(255,255,255,0.4),inset_0px_-2px_4px_0px_rgba(0,0,0,0.15)] ",
        outline:
          "bg-[radial-gradient(120%_80%_at_50%_70%,#3f3f46_0%,#18181b_100%)] text-zinc-100 border border-white/10 shadow-[inset_0px_1px_3px_0px_rgba(255,255,255,0.25),inset_0px_-2px_4px_0px_rgba(0,0,0,0.2)] ",
        secondary:
          "bg-[radial-gradient(120%_80%_at_50%_70%,#ffffff_0%,#e4e4e7_100%)] text-zinc-950 shadow-[inset_0px_1px_3px_0px_rgba(255,255,255,0.9),inset_0px_-2px_4px_0px_rgba(0,0,0,0.08)] ",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-11 px-6 py-2.5 text-[13px]",
        lg: "h-11 px-6 py-2.5",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

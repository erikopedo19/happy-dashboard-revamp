import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const emptyVariants = cva(
  "flex flex-col items-center justify-center text-center p-8",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Empty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof emptyVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(emptyVariants({ variant }), className)}
    {...props}
  />
))
Empty.displayName = "Empty"

const EmptyHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col items-center gap-2 mb-4", className)}
    {...props}
  />
))
EmptyHeader.displayName = "EmptyHeader"

const EmptyMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "icon" | "image" }
>(({ className, variant = "icon", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-center",
      variant === "icon" && "h-12 w-12 rounded-full bg-muted text-muted-foreground",
      className
    )}
    {...props}
  />
))
EmptyMedia.displayName = "EmptyMedia"

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground max-w-sm", className)}
    {...props}
  />
))
EmptyDescription.displayName = "EmptyDescription"

const EmptyContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-4", className)}
    {...props}
  />
))
EmptyContent.displayName = "EmptyContent"

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent }

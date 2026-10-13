import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Shiny CTA" button — animated conic border shine with inner shimmer,
 * recolored to the app's rose-red. Styles live in src/index.css (.shiny-cta).
 * Size variants: default (hero), shiny-cta-sm (nav), shiny-cta-lg (phone hero).
 */
export function ShinyButton({
  as: Tag = "button",
  children,
  className,
  ...props
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Tag className={cn("shiny-cta", className)} {...props}>
      <span>{children}</span>
    </Tag>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export type RoseGradientButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Slightly tighter padding for toolbars */
  size?: "default" | "sm";
};

/**
 * Rose variant of the Uiverse-style double-gradient pill button
 * (adamgiebl pattern — border ring + inner fill).
 */
export const RoseGradientButton = React.forwardRef<HTMLButtonElement, RoseGradientButtonProps>(
  ({ className, children, disabled, size = "default", type = "button", ...props }, ref) => {
    const innerRadius = size === "sm" ? "rounded-[12px]" : "rounded-[14px]";
    const outerRadius = size === "sm" ? "rounded-[14px]" : "rounded-[16px]";
    const innerPad =
      size === "sm"
        ? "gap-2 px-5 py-1.5 text-sm font-semibold leading-tight"
        : "gap-2 px-8 py-3 text-sm font-semibold leading-tight";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          "relative inline-flex p-[2px] bg-black text-white",
          outerRadius,
          "bg-gradient-to-t from-[#9f1239] to-[#fda4af]",
          "cursor-pointer opacity-90 transition-opacity hover:opacity-100",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "flex h-full w-full items-center justify-center text-white",
            innerRadius,
            innerPad,
            "bg-gradient-to-t from-[#be123c] to-[#fb7185]"
          )}
        >
          {children}
        </span>
      </button>
    );
  }
);

RoseGradientButton.displayName = "RoseGradientButton";

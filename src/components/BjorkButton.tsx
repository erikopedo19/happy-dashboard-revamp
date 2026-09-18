import * as React from "react";
import { cn } from "@/lib/utils";

export type BjorkButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "accent" | "outline";
  size?: "default" | "sm" | "lg";
};

/**
 * BjorkButton - A modern button component with crystal accent support
 */
export const BjorkButton = React.forwardRef<HTMLButtonElement, BjorkButtonProps>(
  ({ className, children, variant = "default", size = "default", disabled, type = "button", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variantStyles = {
      default: "bg-[#1C1C1E] text-white hover:bg-[#2C2C2E] border border-white/10",
      accent: "bg-gradient-to-r from-[#FF375F] to-[#FF2D55] text-white hover:opacity-90 border border-transparent shadow-lg",
      outline: "bg-transparent text-white border border-white/20 hover:bg-white/10",
    };
    
    const sizeStyles = {
      default: "h-11 px-6 py-2.5 text-sm",
      sm: "h-9 px-4 py-2 text-xs",
      lg: "h-14 px-8 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          "active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

BjorkButton.displayName = "BjorkButton";

/**
 * CrystalMark - A decorative crystal icon component
 */
export const CrystalMark = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  ({ className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        className={cn("w-4 h-4", className)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          fill="url(#crystal-gradient)"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 7V17L12 22L22 17V7"
          fill="url(#crystal-gradient)"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12V22"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="crystal-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF375F" />
            <stop offset="1" stopColor="#FF2D55" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
);

CrystalMark.displayName = "CrystalMark";

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonSize = "sm" | "md" | "lg" | "xl";
export type ButtonColor = "pink" | "blue" | "orange" | "yellow" | "green" | "purple";

export interface PulseButtonProps {
  text?: string;
  onClick?: () => void;
  className?: string;
  color?: ButtonColor;
  size?: ButtonSize;
  disabled?: boolean;
  type?: "button" | "submit";
}

const colorMap: Record<ButtonColor, { primary: string; glow: string; shadow: string }> = {
  pink: {
    primary: "#ff2281",
    glow: "#ff4da0",
    shadow: "rgba(255, 34, 129, 0.4)",
  },
  blue: {
    primary: "#0070f3",
    glow: "#00d2ff",
    shadow: "rgba(0, 112, 243, 0.4)",
  },
  orange: {
    primary: "#f2994a",
    glow: "#f2c94c",
    shadow: "rgba(242, 153, 74, 0.4)",
  },
  yellow: {
    primary: "#f2c94c",
    glow: "#ffe000",
    shadow: "rgba(242, 201, 76, 0.4)",
  },
  green: {
    primary: "#27ae60",
    glow: "#2ecc71",
    shadow: "rgba(39, 174, 96, 0.4)",
  },
  purple: {
    primary: "#8e44ad",
    glow: "#9b59b6",
    shadow: "rgba(142, 68, 173, 0.4)",
  },
};

const sizeConfig = {
  sm: {
    button: "h-10 min-w-[120px] px-4 rounded-lg",
    text: "text-sm",
    dots: [2, 1.2, 0.8],
  },
  md: {
    button: "h-14 min-w-[180px] px-6 rounded-xl",
    text: "text-xl",
    dots: [3, 1.8, 1],
  },
  lg: {
    button: "h-20 min-w-[240px] px-8 rounded-2xl",
    text: "text-3xl",
    dots: [3.5, 2, 1],
  },
  xl: {
    button: "h-28 min-w-[320px] px-12 rounded-[2rem]",
    text: "text-5xl",
    dots: [5, 3, 1.5],
  },
};

export default function PulseButton({
  text = "Swap",
  onClick,
  className,
  color = "pink",
  size = "lg",
  disabled = false,
  type = "button",
}: PulseButtonProps) {
  const config = sizeConfig[size] || sizeConfig.lg;
  const theme = colorMap[color] || colorMap.pink;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-offset-2 w-fit disabled:opacity-60 disabled:cursor-not-allowed",
        config.button,
        className
      )}
      style={{
        background: `linear-gradient(to right, ${theme.glow}, ${theme.primary}, ${theme.glow})`,
        boxShadow: `0 8px 32px ${theme.shadow}, inset 0 0 0 1.5px rgba(255, 255, 255, 0.3)`,
        willChange: "transform",
        // @ts-ignore - custom property for focus ring
        "--tw-ring-color": theme.primary,
      }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className={cn("absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-300 group-hover:opacity-90", config.button)}>
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[0]}px, transparent ${config.dots[0]}px), radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[0]}px, transparent ${config.dots[0]}px)`,
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 9px 9px",
            WebkitMaskImage: "linear-gradient(to right, white 0%, transparent 12%, transparent 88%, white 100%)",
            maskImage: "linear-gradient(to right, white 0%, transparent 12%, transparent 88%, white 100%)",
            willChange: "opacity",
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        />
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[1]}px, transparent ${config.dots[1]}px), radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[1]}px, transparent ${config.dots[1]}px)`,
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 9px 9px",
            WebkitMaskImage: "linear-gradient(to right, transparent 4%, white 12%, transparent 24%, transparent 76%, white 88%, transparent 96%)",
            maskImage: "linear-gradient(to right, transparent 4%, white 12%, transparent 24%, transparent 76%, white 88%, transparent 96%)",
            willChange: "opacity",
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[2]}px, transparent ${config.dots[2]}px), radial-gradient(circle, rgba(255,255,255,0.45) ${config.dots[2]}px, transparent ${config.dots[2]}px)`,
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 9px 9px",
            WebkitMaskImage: "linear-gradient(to right, transparent 15%, white 25%, transparent 35%, transparent 65%, white 75%, transparent 85%)",
            maskImage: "linear-gradient(to right, transparent 15%, white 25%, transparent 35%, transparent 65%, white 75%, transparent 85%)",
            willChange: "opacity",
          }}
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </div>
      <span
        className={cn("relative z-10 text-white font-semibold tracking-tight whitespace-nowrap", config.text)}
      >
        {text}
      </span>
    </motion.button>
  );
}

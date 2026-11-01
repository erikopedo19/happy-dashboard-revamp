import { memo, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
}

/** Concentric pulsing circles (Magic UI Ripple), ported to framer-motion. */
export const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
}: RippleProps) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,white,transparent)]", className)}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const style: CSSProperties = {
          width: size,
          height: size,
          opacity: mainCircleOpacity - i * 0.03,
          borderStyle: i === numCircles - 1 ? "dashed" : "solid",
          borderColor: `rgba(255,255,255,${0.05 + (i * 5) / 100})`,
        };
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border bg-white/25 shadow-xl"
            style={{ ...style, x: "-50%", y: "-50%" }}
            animate={reduce ? undefined : { scale: [1, 0.9, 1] }}
            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, delay: i * 0.06 }}
          />
        );
      })}
    </div>
  );
});

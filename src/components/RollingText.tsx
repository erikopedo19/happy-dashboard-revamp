import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// iOS-style animated text — each character animates individually.
// "roll": characters slide up (odometer). "flip": split-flap / Solari board.
export function RollingText({
  text,
  className,
  stagger = 0,
  variant = "roll",
}: {
  text: string;
  className?: string;
  /** Seconds of delay between each character's entrance. */
  stagger?: number;
  variant?: "roll" | "flip";
}) {
  const isFlip = variant === "flip";
  return (
    <span className={cn("inline-flex", className)} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="relative inline-flex h-[1em] items-center overflow-hidden"
          style={isFlip ? { perspective: 320 } : undefined}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={`${i}-${ch}`}
              initial={
                isFlip
                  ? { rotateX: -95, opacity: 0 }
                  : { y: "110%", opacity: 0, filter: "blur(3px)" }
              }
              animate={
                isFlip
                  ? { rotateX: 0, opacity: 1 }
                  : { y: 0, opacity: 1, filter: "blur(0px)" }
              }
              exit={
                isFlip
                  ? { rotateX: 95, opacity: 0 }
                  : { y: "-110%", opacity: 0, filter: "blur(3px)" }
              }
              transition={{ type: "spring", stiffness: 380, damping: 30, delay: i * stagger }}
              style={
                isFlip
                  ? { transformOrigin: "50% 100%", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }
                  : undefined
              }
              className="inline-block"
            >
              {ch === " " ? " " : ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

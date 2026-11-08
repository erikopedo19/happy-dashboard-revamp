import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RippleProps {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
}

/** Magic UI Ripple: concentric circles breathing out from the centre. */
export const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
}: RippleProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 select-none [mask-image:radial-gradient(circle_at_center,white_35%,transparent_75%)]",
        className,
      )}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 animate-ripple rounded-full border bg-white/25 shadow-xl motion-reduce:animate-none"
            style={
              {
                width: size,
                height: size,
                opacity: mainCircleOpacity - i * 0.03,
                animationDelay: `${i * 0.06}s`,
                borderStyle: i === numCircles - 1 ? "dashed" : "solid",
                borderColor: `rgba(255,255,255,${0.05 + (i * 5) / 100})`,
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
});

import { useEffect, useMemo, useState } from "react";
import type {
  ElementType,
  FocusEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

const DIRECTIONS: Direction[] = ["TOP", "RIGHT", "BOTTOM", "LEFT"];

type HoverBorderGradientProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  duration?: number;
  clockwise?: boolean;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  [key: string]: any;
};

export function HoverBorderGradient({
  as: Tag = "button",
  children,
  className,
  containerClassName,
  duration = 1,
  clockwise = true,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...props
}: HoverBorderGradientProps) {
  const { resolvedTheme } = useTheme();
  const [direction, setDirection] = useState<Direction>("TOP");
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hovered = isHovering || isFocused;
  const light = resolvedTheme === "light";

  const movingMap = useMemo(() => {
    const color = light ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 100%)";
    const transparent = light ? "rgba(0, 0, 0, 0)" : "rgba(255, 255, 255, 0)";

    return {
      TOP: `radial-gradient(20.7% 50% at 50% 0%, ${color} 0%, ${transparent} 100%)`,
      LEFT: `radial-gradient(16.6% 43.1% at 0% 50%, ${color} 0%, ${transparent} 100%)`,
      BOTTOM: `radial-gradient(20.7% 50% at 50% 100%, ${color} 0%, ${transparent} 100%)`,
      RIGHT: `radial-gradient(16.2% 41.199999999999996% at 100% 50%, ${color} 0%, ${transparent} 100%)`,
    } satisfies Record<Direction, string>;
  }, [light]);

  const highlight = light
    ? "radial-gradient(75% 181.15942028985506% at 50% 50%, #FF2D46 0%, rgba(0, 0, 0, 0) 100%)"
    : "radial-gradient(75% 181.15942028985506% at 50% 50%, #FF2D46 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (hovered) return;

    const interval = window.setInterval(() => {
      setDirection((current) => {
        const index = DIRECTIONS.indexOf(current);
        const next = (index + (clockwise ? -1 : 1) + DIRECTIONS.length) % DIRECTIONS.length;
        return DIRECTIONS[next];
      });
    }, duration * 1000);

    return () => window.clearInterval(interval);
  }, [hovered, duration, clockwise]);

  return (
    <Tag
      {...props}
      type={Tag === "button" && props.type === undefined ? "button" : props.type}
      className={cn(
        "relative flex w-fit h-min flex-col flex-nowrap items-center justify-center gap-10 overflow-visible rounded-full border bg-black/20 p-px content-center decoration-clone transition duration-500 hover:bg-black/10 dark:bg-white/20",
        containerClassName
      )}
      onMouseEnter={(event: React.MouseEvent<HTMLElement>) => {
        setIsHovering(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLElement>) => {
        setIsHovering(false);
        onMouseLeave?.(event);
      }}
      onFocus={(event: React.FocusEvent<HTMLElement>) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
    >
      <motion.div
        className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{ filter: "blur(2px)" }}
        initial={{ background: movingMap[direction] }}
        animate={{
          background: hovered ? [movingMap[direction], highlight] : movingMap[direction],
        }}
        transition={{
          duration,
          ease: "linear",
          repeat: hovered ? Infinity : 0,
        }}
      />
      <div className="absolute inset-[2px] z-[1] flex-none rounded-[100px] bg-white dark:bg-black" />
      <div
        className={cn(
          "relative z-10 w-auto rounded-[inherit] bg-white px-4 py-2 text-neutral-900 dark:bg-black dark:text-white",
          className
        )}
      >
        {children}
      </div>
    </Tag>
  );
}

"use client";

import * as React from "react";
import { motion } from "motion/react";
import { useReducedMotionPreference } from "devignerui/hooks";
import { cn } from "@/lib/utils";
import { EASE_OUT, SPRING_PRESS } from "devignerui/motion";
import { useControllableState } from "devignerui/hooks";
import { IconBarChart } from "@devigner-ui/icons";

// A stat card whose bar chart is the interactive part: one bar is open at a
// time, hatched instead of solid, with the tooltip riding on top of it. The
// tooltip is positioned off the same percentage that sizes the bar, so the two
// can never drift apart.

/** Shortest bar as a share of the track, so a near-zero month is still a bar. */
const BAR_FLOOR = 20;
/** Tallest bar, leaving the rest of the track as headroom for the tooltip. */
const BAR_CEILING = 88;
/** Clears a circle around the bar's top dot: its 3px radius plus a 3px gap. */
const DOT_GAP = "radial-gradient(circle at 50% 0, transparent 6px, #000 6.5px)";

export interface ChartCardPoint {
  /** Stable selection ID. Defaults to the point index for legacy data. */
  id?: React.Key;
  label: string;
  value: number;
}

export type ChartCardActiveId = React.Key | null;

export interface ChartCardAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface ChartCardClassNames {
  root?: string;
  header?: string;
  actions?: string;
  chart?: string;
  point?: string;
  tooltip?: string;
  labels?: string;
}

export interface ChartCardSlotProps {
  root?: React.HTMLAttributes<HTMLDivElement>;
  header?: React.HTMLAttributes<HTMLDivElement>;
  actions?: React.HTMLAttributes<HTMLDivElement>;
  chart?: React.HTMLAttributes<HTMLDivElement>;
  tooltip?: React.HTMLAttributes<HTMLDivElement>;
  labels?: React.HTMLAttributes<HTMLDivElement>;
}

export interface ChartCardPointRenderProps {
  point: ChartCardPoint;
  index: number;
  active: boolean;
}

export interface ChartCardTooltipRenderProps extends ChartCardPointRenderProps {
  defaultTooltip: React.ReactNode;
}

export interface ChartCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: React.ReactNode;
  /** Small line above the headline figure. */
  caption?: string;
  /** Headline figure. Defaults to the sum of the data. */
  total?: number;
  data: ChartCardPoint[];
  /** Controlled ID of the open bar. `null` closes the tooltip. */
  activeId?: ChartCardActiveId;
  /** Initial open bar ID when uncontrolled. */
  defaultActiveId?: ChartCardActiveId;
  /** Fires whenever a bar requests a new active ID. */
  onActiveChange?: (id: ChartCardActiveId) => void;
  /** Header actions with behavior. Actions without `onSelect` are not rendered. */
  actions?: readonly ChartCardAction[];
  /** Custom content inside each semantic chart button. */
  renderPoint?: (props: ChartCardPointRenderProps) => React.ReactNode;
  /** Custom tooltip content while retaining its positioning and motion. */
  renderTooltip?: (props: ChartCardTooltipRenderProps) => React.ReactNode;
  /** Custom action region. The preset only renders actionable items. */
  renderActions?: (actions: readonly ChartCardAction[]) => React.ReactNode;
  classNames?: ChartCardClassNames;
  slotProps?: ChartCardSlotProps;
}

const format = (n: number) => n.toLocaleString("en-US");

/** Headline figures read first group bright, remainder muted. */
function SplitNumber({ value, muted }: { value: number; muted: string }) {
  const text = format(value);
  const comma = text.indexOf(",");
  if (comma === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, comma + 1)}
      <span className={muted}>{text.slice(comma + 1)}</span>
    </>
  );
}

function IconButton({
  label,
  children,
  className,
  ...rest
}: { label: string } & React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_PRESS}
      className={cn(
        "relative inline-grid size-11 cursor-pointer place-items-center rounded-full bg-accent text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function ChartCard({
  title = "Total sales",
  caption = "for all time",
  total,
  data,
  activeId,
  defaultActiveId,
  onActiveChange,
  actions,
  renderPoint,
  renderTooltip,
  renderActions,
  classNames,
  slotProps,
  className,
  ...rest
}: ChartCardProps) {
  const fallbackActiveId = data.length
    ? (data[Math.floor(data.length / 2)]?.id ?? Math.floor(data.length / 2))
    : null;
  const [active, setActive] = useControllableState({
    value: activeId,
    defaultValue:
      defaultActiveId !== undefined ? defaultActiveId : fallbackActiveId,
    onValueChange: onActiveChange,
  });
  const reduced = useReducedMotionPreference();
  // Per-instance: a shared layoutId would make two cards on one page swap
  // tooltips with each other.
  const tooltipId = React.useId();

  const { max, sum } = data.reduce(
    (a, d) => ({ max: Math.max(a.max, d.value), sum: a.sum + d.value }),
    { max: 1, sum: 0 },
  );
  const heightOf = (value: number) =>
    BAR_FLOOR + (value / max) * (BAR_CEILING - BAR_FLOOR);
  // An active ID can outlive the data it points at. Missing IDs simply close
  // the tooltip instead of selecting an unrelated bar.
  const activeIndex = data.findIndex(
    (point, index) => (point.id ?? index) === active,
  );
  const actionableActions = actions?.filter(
    (action) => typeof action.onSelect === "function",
  );

  return (
    <div
      {...slotProps?.root}
      className={cn(
        "w-full max-w-lg rounded-4xl bg-background p-6 text-foreground smooth-shadow-ring-lg",
        className,
        classNames?.root,
      )}
      {...rest}
    >
      <div
        {...slotProps?.header}
        className={cn("flex items-center gap-3", classNames?.header)}
      >
        <span
          aria-hidden
          className="inline-grid size-13 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <IconBarChart className="size-6.5" variant="Bulk" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-2xl tracking-tight">
          {title}
        </h3>
        {actionableActions && actionableActions.length > 0 && (
          <div
            {...slotProps?.actions}
            className={cn("flex items-center gap-2", classNames?.actions)}
          >
            {renderActions
              ? renderActions(actionableActions)
              : actionableActions.map((action) => (
                  <IconButton
                    key={action.id}
                    label={action.label}
                    disabled={action.disabled}
                    onClick={action.onSelect}
                  >
                    {action.icon}
                    {action.badge !== undefined && action.badge !== null && (
                      <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white ring-3 leading-none ring-background">
                        {action.badge}
                      </span>
                    )}
                  </IconButton>
                ))}
          </div>
        )}
      </div>

      <p className="mt-7 text-sm text-muted-foreground">{caption}</p>
      <p className="mt-1 text-5xl tracking-tight tabular-nums">
        <SplitNumber value={total ?? sum} muted="text-muted-foreground" />
      </p>

      <div
        {...slotProps?.chart}
        className={cn("mt-8 flex h-52 items-end gap-2", classNames?.chart)}
      >
        {data.map((point, i) => {
          const pointId = point.id ?? i;
          const height = heightOf(point.value);
          const isActive = i === activeIndex;
          return (
            <div
              key={pointId}
              className="relative flex h-full flex-1 justify-center"
            >
              {isActive && (
                // The wrapper holds the position, the tooltip inside holds the
                // layoutId - so one tooltip travels bar to bar instead of two
                // crossfading. Centring moves to flexbox because layout
                // projection writes transform, which the old x: "-50%" fought.
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
                  // Room for the pointer plus a hair of air above the dot.
                  style={{ bottom: `calc(${height}% + 1.125rem)` }}
                >
                  <motion.div
                    layoutId={reduced ? undefined : tooltipId}
                    initial={reduced ? false : { opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: EASE_OUT,
                      layout: { duration: 0.2, ease: EASE_OUT },
                    }}
                    className="relative origin-bottom rounded-full bg-primary px-3.5 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground tabular-nums"
                  >
                    {/* Pointer: curved shoulders flow out of the pill and the
                        tip is rounded, so it reads as one soft shape. */}
                    <svg
                      aria-hidden
                      viewBox="0 0 24 9"
                      className="absolute top-full left-1/2 -mt-px h-2.25 w-6 -translate-x-1/2 fill-primary"
                    >
                      <path d="M0 0C4.5 0 7 1.5 9 5L9.6 6.2C10.8 8.6 13.2 8.6 14.4 6.2L15 5C17 1.5 19.5 0 24 0Z" />
                    </svg>
                    {renderTooltip?.({
                      point,
                      index: i,
                      active: isActive,
                      defaultTooltip: (
                        <SplitNumber
                          value={point.value}
                          muted="text-primary-foreground/60"
                        />
                      ),
                    }) ?? (
                      <SplitNumber
                        value={point.value}
                        muted="text-primary-foreground/60"
                      />
                    )}
                  </motion.div>
                </div>
              )}
              <motion.button
                type="button"
                aria-pressed={isActive}
                aria-label={`${point.label}: ${format(point.value)}`}
                onClick={() => setActive(pointId)}
                initial={reduced ? false : { height: 0 }}
                animate={{ height: `${height}%` }}
                whileTap={{ scaleX: reduced ? 0.98 : 0.96 }}
                transition={{
                  duration: 0.6,
                  ease: EASE_OUT,
                  delay: i * 0.05,
                  // Height is the data channel; a uniform scale would make the
                  // bar lie about its value mid-press. delay: 0 so the press
                  // never inherits the entrance stagger.
                  scaleX: { ...SPRING_PRESS, delay: 0 },
                }}
                className="group relative w-full cursor-pointer self-end"
              >
                {/* The fill, with a hole punched around the dot: a real gap,
                    not a ring in the page colour, so it holds on any card. */}
                <span
                  aria-hidden
                  style={{
                    maskImage: DOT_GAP,
                    WebkitMaskImage: DOT_GAP,
                    backgroundImage: isActive
                      ? "repeating-linear-gradient(45deg, currentColor 0 4px, transparent 4px 10px)"
                      : undefined,
                  }}
                  className={cn(
                    // The stripe colour lives on every bar, not just the active
                    // one: toggled, transition-colors would fade it in from
                    // the inherited foreground and flash the stripes black.
                    "absolute inset-0 rounded-2xl border-t-3 text-background/6 transition-colors",
                    // Active inverts against the card; its stripes stay faint.
                    isActive
                      ? "bg-primary border-primary"
                      : "bg-accent border-input group-hover:bg-input",
                    classNames?.point,
                  )}
                />
                <span className="relative">
                  {renderPoint?.({ point, index: i, active: isActive })}
                </span>
                <span
                  className={cn(
                    "absolute top-0 left-1/2 size-1.5 -translate-1/2 rounded-full bg-foreground transition-colors",
                    isActive && "bg-primary",
                  )}
                />
              </motion.button>
            </div>
          );
        })}
      </div>

      <div
        {...slotProps?.labels}
        className={cn("mt-3 flex gap-2", classNames?.labels)}
      >
        {data.map((point, i) => (
          <span
            key={point.id ?? i}
            aria-hidden
            className={cn(
              "flex-1 text-center text-xs transition-colors",
              i === activeIndex ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export namespace ChartCard {
  export function Header({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div {...props} className={cn("flex items-center gap-3", className)} />
    );
  }

  export function Chart({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div {...props} className={cn("flex h-52 items-end gap-2", className)} />
    );
  }
}

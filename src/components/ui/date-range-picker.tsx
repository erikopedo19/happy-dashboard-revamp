"use client";

import * as React from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconChevronRight } from "@devigner-ui/icons";
import {
  SPRING_LAYOUT,
  SPRING_PRESS,
  SPRING_SWAP,
  TWEEN_FOLLOW,
  defaultTransition,
} from "devignerui/motion";
import { useControllableState } from "devignerui/hooks";
import { useReducedMotionPreference } from "devignerui/hooks";
import { useHoverCapable } from "devignerui/hooks";
import {
  addDays,
  addMonths,
  clampRangeEnd,
  compareDays,
  getMonthGrid,
  isSameDay,
  isWithinRange,
  nightsBetween,
  startOfDay,
  startOfMonth,
  type MonthGridDay,
} from "devignerui/date-range";

const WEEKDAYS = [
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
  ["S", "Sunday"],
] as const;

// How far into the hovered day a preview band reaches, in columns from the
// day's near edge: just past a two-digit number and still inside the hover
// circle, so the band's end is never seen and the two read as one shape.
const HOVER_REACH = 0.75;

// Half the fill band's height (a 40px row inset 2.5px top and bottom), so a
// capped row end is a true semicircle. Numeric so motion can animate it.
const FILL_RADIUS = 17.5;

const INSTANT = { duration: 0 } as const;

/** How long the badge sits on a new value before showing it, the way a
 *  tooltip waits before opening. Sweeping across days then reads as one
 *  settled change instead of a counter flickering through every number. */
const BADGE_DELAY_MS = 120;

/** `value` and its `key`, held back by `delay` ms whenever `key` changes. */
function useLazyValue<T>(
  value: T,
  key: React.Key,
  delay: number,
): { key: React.Key; value: T } {
  const [shown, setShown] = React.useState<{ key: React.Key; value: T }>({ key, value });
  const latest = React.useRef(value);
  latest.current = value;

  React.useEffect(() => {
    if (key === shown.key) return;
    if (delay <= 0) {
      setShown({ key, value: latest.current });
      return;
    }
    const timer = setTimeout(() => {
      setShown({ key, value: latest.current });
    }, delay);
    return () => clearTimeout(timer);
  }, [key, shown.key, delay]);

  return key === shown.key || delay <= 0 ? { key, value } : shown;
}

const formatMonthName = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long" });

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatFullDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

const formatNights = (nights: number) =>
  `${nights} ${nights === 1 ? "night" : "nights"}`;

/** First non-disabled day of the month containing `monthAnchor`, or null if
 *  every day in that month is disabled. Used both for the roving-tabindex
 *  fallback and for PageUp/PageDown landing on a disabled same-day-of-month. */
function firstEnabledDayInMonth(
  monthAnchor: Date,
  isDisabled: (date: Date) => boolean,
): Date | null {
  const first = startOfMonth(monthAnchor);
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  for (let i = 0; i < daysInMonth; i++) {
    const candidate = addDays(first, i);
    if (!isDisabled(candidate)) return candidate;
  }
  return null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePreset {
  id: string;
  label: string;
  getRange: (anchor: Date) => DateRange;
}

/** Weekend snaps to the next Friday (or the anchor itself on a Friday); the
 *  rest count forward from the anchor. */
export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "weekend",
    label: "Weekend",
    getRange: (anchor) => {
      const friday = addDays(anchor, (5 - anchor.getDay() + 7) % 7);
      return { start: friday, end: addDays(friday, 2) };
    },
  },
  {
    id: "3-nights",
    label: "3 nights",
    getRange: (anchor) => ({ start: anchor, end: addDays(anchor, 3) }),
  },
  {
    id: "1-week",
    label: "1 week",
    getRange: (anchor) => ({ start: anchor, end: addDays(anchor, 7) }),
  },
  {
    id: "2-weeks",
    label: "2 weeks",
    getRange: (anchor) => ({ start: anchor, end: addDays(anchor, 14) }),
  },
];

export interface DateRangePickerClassNames {
  root?: string;
  header?: string;
  badge?: string;
  label?: string;
  grid?: string;
  day?: string;
  presets?: string;
  presetButton?: string;
  clearButton?: string;
}

export interface DateRangePickerSlotProps {
  root?: React.HTMLAttributes<HTMLDivElement>;
}

export interface DateRangePickerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "title"
> {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (range: DateRange | null) => void;

  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;

  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (date: Date) => boolean;

  title?: React.ReactNode;
  /** Defaults to Weekend, 3 nights, 1 week and 2 weeks. Pass `[]` to hide. */
  presets?: DateRangePreset[];
  startLabel?: string;
  endLabel?: string;
  /** Replaces the badge text. Receives the committed range, or the hover
   *  preview while a check-out is being picked. */
  renderBadge?: (range: DateRange | null) => React.ReactNode;
  onClear?: () => void;

  classNames?: DateRangePickerClassNames;
  slotProps?: DateRangePickerSlotProps;
}

/** Text that rolls up when it changes: the old value leaves upward while the
 *  new one rises in from below. */
function RollingText({
  id,
  reduced,
  transition = SPRING_SWAP,
  className,
  children,
}: {
  id: React.Key;
  reduced: boolean;
  transition?: Transition;
  className?: string;
  children: React.ReactNode;
}) {
  if (reduced)
    return <span className={cn("block", className)}>{children}</span>;
  return (
    <span className="relative block">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={id}
          className={cn("block whitespace-nowrap", className)}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={transition}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function NavButton({
  label,
  reduced,
  children,
  className,
  ...rest
}: { label: string; reduced: boolean } & React.ComponentProps<
  typeof motion.button
>) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={reduced ? undefined : { scale: 0.9 }}
      transition={SPRING_PRESS}
      className={cn(
        "inline-grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors duration-150 ease-out outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

function Field({
  label,
  date,
  active,
  underlineId,
  reduced,
  labelClassName,
  onClick,
}: {
  label: string;
  date: Date | null;
  active: boolean;
  underlineId: string;
  reduced: boolean;
  labelClassName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "block text-[10.5px]/4 font-medium tracking-[0.08em] text-muted-foreground uppercase",
          labelClassName,
        )}
      >
        {label}
      </span>
      <RollingText
        id={date ? date.getTime() : "empty"}
        reduced={reduced}
        className={cn(
          "mt-0.75 text-[16px]/6 tracking-[-0.01em]",
          date
            ? "font-semibold text-foreground"
            : "font-normal text-muted-foreground",
        )}
      >
        {date ? formatShortDate(date) : "Add date"}
      </RollingText>
      <span className="mt-1.75 block h-0.5 w-9">
        {active && (
          <motion.span
            layoutId={underlineId}
            transition={reduced ? INSTANT : SPRING_LAYOUT}
            className="block size-full rounded-full bg-foreground"
          />
        )}
      </span>
    </button>
  );
}

export function DateRangePicker({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  minDate,
  maxDate,
  isDateDisabled,
  title = "Trip Dates",
  presets = DEFAULT_DATE_RANGE_PRESETS,
  startLabel = "Check-in",
  endLabel = "Check-out",
  renderBadge,
  onClear,
  classNames,
  slotProps,
  className,
  ...rest
}: DateRangePickerProps) {
  const [value, setValue] = useControllableState<DateRange | null>({
    value: controlledValue,
    defaultValue,
    onValueChange,
  });
  const [month, setMonth] = useControllableState<Date>({
    value: controlledMonth,
    defaultValue: startOfMonth(defaultMonth ?? value?.start ?? new Date()),
    onValueChange: onMonthChange,
  });

  const isDisabled = React.useCallback(
    (date: Date) => {
      if (minDate && date < startOfDay(minDate)) return true;
      if (maxDate && date > startOfDay(maxDate)) return true;
      return isDateDisabled?.(date) ?? false;
    },
    [minDate, maxDate, isDateDisabled],
  );

  const [pendingStart, setPendingStart] = React.useState<Date | null>(null);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const canHover = useHoverCapable();
  const reduced = !!useReducedMotionPreference();
  // Per-instance: shared layoutIds would make two pickers on one page trade
  // circles and underlines.
  const instanceId = React.useId();
  const today = React.useMemo(() => startOfDay(new Date()), []);

  const [focusedDate, setFocusedDate] = React.useState<Date>(
    () => value?.start ?? today,
  );
  const dayRefs = React.useRef(new Map<number, HTMLButtonElement>());
  // ponytail: only keyboard navigation should steal DOM focus; mount and
  // mouse/programmatic focus just update state so roving tabindex stays in
  // sync without yanking focus around.
  const focusFromKeyboard = React.useRef(false);

  React.useEffect(() => {
    if (!focusFromKeyboard.current) return;
    focusFromKeyboard.current = false;
    dayRefs.current.get(startOfDay(focusedDate).getTime())?.focus();
  }, [focusedDate]);

  const moveFocus = (from: Date, days: number) => {
    const direction = days < 0 ? -1 : 1;
    let next = addDays(from, days);
    let attempts = 0;
    while (isDisabled(next) && attempts < 42) {
      next = addDays(next, direction);
      attempts++;
    }
    if (isDisabled(next)) return;
    if (
      next.getMonth() !== month.getMonth() ||
      next.getFullYear() !== month.getFullYear()
    ) {
      setMonth(startOfMonth(next));
    }
    focusFromKeyboard.current = true;
    setFocusedDate(next);
  };

  const moveFocusMonths = (from: Date, months: number) => {
    const next = addMonths(from, months);
    const daysInMonth = new Date(
      next.getFullYear(),
      next.getMonth() + 1,
      0,
    ).getDate();
    next.setDate(Math.min(from.getDate(), daysInMonth));
    const target = isDisabled(next)
      ? firstEnabledDayInMonth(next, isDisabled)
      : next;
    if (!target) return;
    setMonth(startOfMonth(target));
    focusFromKeyboard.current = true;
    setFocusedDate(target);
  };

  const handleDayKeyDown = (date: Date, event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(date, 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(date, -1);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(date, 7);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(date, -7);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(date, -((date.getDay() + 6) % 7));
        break;
      case "End":
        event.preventDefault();
        moveFocus(date, 6 - ((date.getDay() + 6) % 7));
        break;
      case "PageUp":
        event.preventDefault();
        moveFocusMonths(date, -1);
        break;
      case "PageDown":
        event.preventDefault();
        moveFocusMonths(date, 1);
        break;
    }
  };

  const liveMessage = value
    ? `${startLabel} ${formatFullDate(value.start)}, ${endLabel.toLowerCase()} ${formatFullDate(value.end)}, ${formatNights(nightsBetween(value.start, value.end))}`
    : "";

  /** A preset's range from `anchor`, normalized to local days, ordered, and
   *  clamped at the first disabled day. Null when it would start disabled. */
  const resolvePreset = (
    preset: DateRangePreset,
    anchor: Date,
  ): DateRange | null => {
    const raw = preset.getRange(anchor);
    let start = startOfDay(raw.start);
    let end = startOfDay(raw.end);
    if (compareDays(start, end) > 0) [start, end] = [end, start];
    if (isDisabled(start)) return null;
    return { start, end: clampRangeEnd(start, end, isDisabled) };
  };

  // A preset lights up whenever the committed range is exactly what it would
  // produce from that range's check-in, however the range was picked.
  const isPresetActive = (preset: DateRangePreset) => {
    if (!value) return false;
    const range = resolvePreset(preset, value.start);
    return (
      !!range &&
      isSameDay(range.start, value.start) &&
      isSameDay(range.end, value.end)
    );
  };

  const applyPreset = (preset: DateRangePreset) => {
    const range = resolvePreset(preset, value?.start ?? pendingStart ?? today);
    if (!range) return;
    setValue(range);
    const rangeMonth = startOfMonth(range.start);
    if (rangeMonth.getTime() !== month.getTime()) setMonth(rangeMonth);
    setPendingStart(null);
    setHoverDate(null);
  };

  const reset = () => {
    setValue(null);
    setPendingStart(null);
    setHoverDate(null);
  };

  const handleClear = () => {
    reset();
    onClear?.();
  };

  const pickCheckOut = () => {
    if (pendingStart || !value) return;
    setPendingStart(value.start);
    setHoverDate(null);
  };

  const handleDayClick = (date: Date) => {
    if (isDisabled(date)) return;
    if (pendingStart === null) {
      if (value !== null) setValue(null);
      setPendingStart(date);
      return;
    }
    const chronological =
      compareDays(date, pendingStart) < 0
        ? { start: date, end: pendingStart }
        : { start: pendingStart, end: date };
    const end = clampRangeEnd(
      chronological.start,
      chronological.end,
      isDisabled,
    );
    setValue({ start: chronological.start, end });
    setPendingStart(null);
    setHoverDate(null);
  };

  const previewEnd =
    pendingStart && hoverDate && canHover
      ? clampRangeEnd(pendingStart, hoverDate, isDisabled)
      : null;

  // A pending start wins over `value` so a controlled parent that only
  // accepts complete ranges still sees the first click reflected.
  const previewOther = previewEnd ?? pendingStart;
  const displayRange: DateRange | null =
    pendingStart && previewOther
      ? compareDays(pendingStart, previewOther) <= 0
        ? { start: pendingStart, end: previewOther }
        : { start: previewOther, end: pendingStart }
      : value;
  const headerStart = pendingStart ?? value?.start ?? null;
  const headerEnd = pendingStart ? null : (value?.end ?? null);
  const startCircle = pendingStart ?? value?.start ?? null;
  const endCircle = pendingStart ? null : (value?.end ?? null);

  const spansNights =
    !!displayRange && !isSameDay(displayRange.start, displayRange.end);
  const badgeRange: DateRange | null = pendingStart
    ? spansNights
      ? displayRange
      : null
    : value;
  const badgeText = renderBadge
    ? renderBadge(badgeRange)
    : badgeRange
      ? formatNights(nightsBetween(badgeRange.start, badgeRange.end))
      : pendingStart
        ? `Pick ${endLabel.toLowerCase()}`
        : "Add dates";
  const badgeKey = badgeRange
    ? `range-${nightsBetween(badgeRange.start, badgeRange.end)}`
    : pendingStart
      ? "pick"
      : "empty";
  const badge = useLazyValue(
    { text: badgeText, accent: !!badgeRange },
    badgeKey,
    reduced ? 0 : BADGE_DELAY_MS,
  );

  // The fill grows out of, and retracts back into, the fixed end of the
  // range. A clear has no fixed end, so it collapses into the middle.
  const lastRange = React.useRef<DateRange | null>(null);
  if (displayRange && spansNights) lastRange.current = displayRange;
  const enterAnchor = (pendingStart ?? displayRange?.start ?? today).getTime();
  const exitAnchor = pendingStart
    ? pendingStart.getTime()
    : lastRange.current
      ? (lastRange.current.start.getTime() + lastRange.current.end.getTime()) /
        2
      : 0;

  const weeks = React.useMemo(() => getMonthGrid(month), [month]);

  const tabbableDate = React.useMemo(() => {
    const focusedInVisibleMonth =
      focusedDate.getMonth() === month.getMonth() &&
      focusedDate.getFullYear() === month.getFullYear();
    if (focusedInVisibleMonth && !isDisabled(focusedDate)) return focusedDate;
    return firstEnabledDayInMonth(month, isDisabled);
  }, [focusedDate, month, isDisabled]);

  const monthTime = startOfMonth(month).getTime();
  const atMinMonth =
    minDate !== undefined && monthTime <= startOfMonth(minDate).getTime();
  const atMaxMonth =
    maxDate !== undefined && monthTime >= startOfMonth(maxDate).getTime();

  return (
    <div
      {...slotProps?.root}
      className={cn(
        "flex w-105 max-w-full flex-col rounded-[26px] bg-accent p-2.5 smooth-shadow-ring-lg",
        slotProps?.root?.className,
        className,
        classNames?.root,
      )}
      {...rest}
    >
      <div className="flex h-11.25 items-center justify-between gap-3 px-3.75">
        <div className="truncate text-[15px]/6 font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </div>
        <motion.div
          layout
          transition={reduced ? INSTANT : defaultTransition}
          className={cn(
            "flex h-5.5 shrink-0 items-center overflow-hidden rounded-full px-2.5 text-[11.5px] leading-none font-medium transition-colors duration-300 ease-out",
            badge.value.accent
              ? "bg-foreground/10 text-foreground"
              : "bg-border text-muted-foreground",
            classNames?.badge,
          )}
        >
          <motion.span
            layout="position"
            transition={reduced ? INSTANT : defaultTransition}
            className="block"
          >
            <RollingText
              id={badge.key}
              reduced={reduced}
              transition={defaultTransition}
            >
              {badge.value.text}
            </RollingText>
          </motion.span>
        </motion.div>
      </div>

      <div className="rounded-[18px] bg-background px-4.5 pt-4.5 pb-4 shadow-subtle">
        <LayoutGroup id={instanceId}>
          <div
            className={cn(
              "grid grid-cols-2 border-b border-border pb-4",
              classNames?.header,
            )}
          >
            <Field
              label={startLabel}
              date={headerStart}
              active={!pendingStart}
              underlineId="underline"
              reduced={reduced}
              labelClassName={classNames?.label}
              onClick={reset}
            />
            <div className="relative pl-3">
              <span
                aria-hidden="true"
                className="absolute top-3.25 -left-3 h-7 w-px bg-border"
              />
              <Field
                label={endLabel}
                date={headerEnd}
                active={!!pendingStart}
                underlineId="underline"
                reduced={reduced}
                labelClassName={classNames?.label}
                onClick={pickCheckOut}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3.75">
            <div className="text-[16px]/6 font-bold tracking-[-0.01em] text-foreground">
              <RollingText id={monthTime} reduced={reduced}>
                {formatMonthName(month)}{" "}
                <span className="text-muted-foreground">
                  {month.getFullYear()}
                </span>
              </RollingText>
            </div>
            <div className="flex items-center gap-0.5">
              <NavButton
                label="Previous month"
                reduced={reduced}
                disabled={atMinMonth}
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                <IconChevronLeft className="size-4" strokeWidth={2.5} />
              </NavButton>
              <NavButton
                label="Next month"
                reduced={reduced}
                disabled={atMaxMonth}
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <IconChevronRight className="size-4" strokeWidth={2.5} />
              </NavButton>
            </div>
          </div>

          <div
            role="grid"
            aria-label={formatMonthLabel(month)}
            className={cn("mt-5 select-none", classNames?.grid)}
          >
            <div
              role="row"
              className="grid grid-cols-7 text-center text-[10px]/4 font-medium text-muted-foreground"
            >
              {WEEKDAYS.map(([short, full]) => (
                <div key={full} role="columnheader" aria-label={full}>
                  {short}
                </div>
              ))}
            </div>
            <div className="mt-0.75">
              {weeks.map((week, wi) => (
                <div
                  role="row"
                  key={wi}
                  className="relative grid h-10 grid-cols-7"
                >
                  <RowFill
                    week={week}
                    range={spansNights ? displayRange : null}
                    circleStart={
                      !!displayRange &&
                      [startCircle, endCircle].some(
                        (d) => d && isSameDay(d, displayRange.start),
                      )
                    }
                    hovered={
                      previewEnd && !isSameDay(previewEnd, pendingStart!)
                        ? previewEnd
                        : null
                    }
                    circleEnd={
                      !!displayRange &&
                      [startCircle, endCircle].some(
                        (d) => d && isSameDay(d, displayRange.end),
                      )
                    }
                    enterAnchor={enterAnchor}
                    exitAnchor={exitAnchor}
                    reduced={reduced}
                  />
                  {week.map((cell) => {
                    const circle =
                      startCircle && isSameDay(cell.date, startCircle)
                        ? "start"
                        : endCircle && isSameDay(cell.date, endCircle)
                          ? "end"
                          : null;
                    return (
                      <DayCell
                        key={cell.date.getTime()}
                        cell={cell}
                        disabled={isDisabled(cell.date)}
                        isToday={isSameDay(cell.date, today)}
                        circle={circle}
                        inRange={
                          !!displayRange &&
                          isWithinRange(
                            cell.date,
                            displayRange.start,
                            displayRange.end,
                          )
                        }
                        isFocused={
                          !!tabbableDate && isSameDay(cell.date, tabbableDate)
                        }
                        reduced={reduced}
                        onSelect={() => handleDayClick(cell.date)}
                        onHoverStart={() => canHover && setHoverDate(cell.date)}
                        onHoverEnd={() => canHover && setHoverDate(null)}
                        onFocusDate={() => setFocusedDate(cell.date)}
                        onFocusable={(el) => {
                          if (el) dayRefs.current.set(cell.date.getTime(), el);
                          else dayRefs.current.delete(cell.date.getTime());
                        }}
                        onKeyDown={(event) =>
                          handleDayKeyDown(cell.date, event)
                        }
                        className={classNames?.day}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </LayoutGroup>
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3.5 pt-2.75 pb-1.5",
          classNames?.presets,
        )}
      >
        <div className="flex flex-wrap gap-1.25">
          {presets.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <motion.button
                key={preset.id}
                type="button"
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={SPRING_PRESS}
                onClick={() => applyPreset(preset)}
                className={cn(
                  "h-7.25 cursor-pointer rounded-full border px-3.25 text-[11.5px] font-medium whitespace-nowrap transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-transparent bg-foreground/15 text-foreground"
                    : "border-border bg-card text-foreground/80 hover:bg-background",
                  classNames?.presetButton,
                )}
              >
                {preset.label}
              </motion.button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "shrink-0 cursor-pointer rounded-md text-[11.5px] font-medium text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground hover:underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
            classNames?.clearButton,
          )}
        >
          Clear
        </button>
      </div>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
    </div>
  );
}

/** One week's slice of the range band. It grows out of the side facing
 *  `enterAnchor` when it appears and retracts toward `exitAnchor` when it
 *  goes, so a whole range reads as one ribbon being drawn and wound back.
 *  An end that carries a circle stops at that day's centre, tucked under the
 *  circle. The hovered end of a preview reaches `HOVER_REACH` into the day,
 *  just past its number and under its hover circle, so there is no gap. */
function RowFill({
  week,
  range,
  circleStart,
  circleEnd,
  hovered,
  enterAnchor,
  exitAnchor,
  reduced,
}: {
  week: MonthGridDay[];
  range: DateRange | null;
  circleStart: boolean;
  circleEnd: boolean;
  hovered: Date | null;
  enterAnchor: number;
  exitAnchor: number;
  reduced: boolean;
}) {
  const cols = range
    ? week.flatMap((cell, col) =>
        cell.inMonth && isWithinRange(cell.date, range.start, range.end)
          ? [col]
          : [],
      )
    : [];
  const first = cols[0];
  const last = cols.at(-1);
  const fill =
    range && first !== undefined && last !== undefined
      ? (() => {
          const firstDate = week[first]!.date;
          const lastDate = week[last]!.date;
          // An end tucked under a selected circle stays square: a rounded cap
          // there curves away from the circle's top and bottom and leaves a
          // notch, where a straight edge runs flush into it.
          const underStartCircle =
            circleStart &&
            isSameDay(firstDate, range.start) &&
            !(hovered && isSameDay(firstDate, hovered));
          const underEndCircle =
            circleEnd &&
            isSameDay(lastDate, range.end) &&
            !(hovered && isSameDay(lastDate, hovered));
          const roundLeft =
            !underStartCircle &&
            (first === 0 ||
              !week[first - 1]!.inMonth ||
              isSameDay(firstDate, range.start));
          const roundRight =
            !underEndCircle &&
            (last === 6 ||
              !week[last + 1]!.inMonth ||
              isSameDay(lastDate, range.end));
          const from =
            first +
            (hovered && isSameDay(firstDate, hovered)
              ? 1 - HOVER_REACH
              : circleStart && isSameDay(firstDate, range.start)
                ? 0.5
                : 0);
          const to =
            last +
            1 -
            (hovered && isSameDay(lastDate, hovered)
              ? 1 - HOVER_REACH
              : circleEnd && isSameDay(lastDate, range.end)
                ? 0.5
                : 0);
          if (to <= from) return null;
          return {
            left: (from / 7) * 100,
            width: ((to - from) / 7) * 100,
            firstTime: week[first]!.date.getTime(),
            lastTime: week[last]!.date.getTime(),
            leftRadius: roundLeft ? FILL_RADIUS : 0,
            rightRadius: roundRight ? FILL_RADIUS : 0,
          };
        })()
      : null;

  // Both edges are placed as insets and eased with a short tween, never a
  // spring: the band follows the pointer across many days a second, and
  // anything with momentum overshoots the row or trails behind the cursor.
  const band = reduced ? INSTANT : TWEEN_FOLLOW;

  const collapsed = (anchor: number) => {
    if (!fill) return {};
    let edge: number;
    if (anchor <= fill.firstTime) edge = fill.left;
    else if (anchor >= fill.lastTime) edge = fill.left + fill.width;
    else {
      const col = week.findIndex((c) => c.date.getTime() >= anchor);
      edge = ((Math.max(col, 0) + 0.5) / 7) * 100;
    }
    return {
      left: `${edge}%`,
      right: `${100 - edge}%`,
      opacity: 0,
      transition: band,
    };
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <AnimatePresence initial={false} custom={exitAnchor}>
        {fill && (
          <motion.div
            key="fill"
            custom={enterAnchor}
            variants={{
              collapsed,
              shown: {
                left: `${fill.left}%`,
                right: `${100 - fill.left - fill.width}%`,
                opacity: 1,
                borderTopLeftRadius: fill.leftRadius,
                borderBottomLeftRadius: fill.leftRadius,
                borderTopRightRadius: fill.rightRadius,
                borderBottomRightRadius: fill.rightRadius,
                transition: band,
              },
            }}
            initial="collapsed"
            animate="shown"
            exit="collapsed"
            className="absolute inset-y-[2.5px] bg-secondary"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DayCell({
  cell,
  disabled,
  isToday,
  circle,
  inRange,
  isFocused,
  reduced,
  onSelect,
  onHoverStart,
  onHoverEnd,
  onFocusDate,
  onFocusable,
  onKeyDown,
  className,
}: {
  cell: MonthGridDay;
  disabled: boolean;
  isToday: boolean;
  circle: "start" | "end" | null;
  inRange: boolean;
  isFocused: boolean;
  reduced: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onFocusDate: () => void;
  onFocusable: (el: HTMLButtonElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  className?: string;
}) {
  if (!cell.inMonth) return <div aria-hidden="true" />;

  return (
    <div
      role="gridcell"
      aria-label={String(cell.date.getDate())}
      aria-disabled={disabled}
      aria-selected={inRange}
      className="relative grid place-items-center"
      onPointerEnter={disabled ? undefined : onHoverStart}
      onPointerLeave={disabled ? undefined : onHoverEnd}
    >
      <motion.button
        ref={onFocusable}
        type="button"
        whileTap={disabled || reduced ? undefined : { scale: 0.97 }}
        transition={SPRING_PRESS}
        tabIndex={isFocused ? 0 : -1}
        disabled={disabled}
        onClick={onSelect}
        onFocus={onFocusDate}
        onKeyDown={onKeyDown}
        className={cn(
          "relative grid size-9 cursor-pointer place-items-center rounded-full text-[13.5px] transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring border border-transparent",
          disabled
            ? "cursor-not-allowed text-muted-foreground/70"
            : circle
              ? "font-medium text-background"
              : inRange
                ? "text-foreground hover:bg-secondary hover:border-border"
                : "text-foreground/85 hover:bg-secondary hover:border-border",
          className,
        )}
      >
        <AnimatePresence initial={false}>
          {circle && (
            <motion.span
              // Keyed by role: the same day can turn from the start circle into
              // the end circle (picking an earlier check-out), and reusing the
              // element would leave it stuck in the start circle's glide.
              key={circle}
              aria-hidden="true"
              layoutId={circle}
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={reduced ? INSTANT : SPRING_LAYOUT}
              className="absolute inset-0 rounded-full bg-foreground shadow-[0_2px_6px_-1px_rgb(0_0_0/0.25)]"
            />
          )}
        </AnimatePresence>
        <span className="relative">{cell.date.getDate()}</span>
      </motion.button>
      {isToday && !circle && (
        <span
          aria-hidden="true"
          className="absolute bottom-1.25 size-0.75 rounded-full bg-muted-foreground"
        />
      )}
    </div>
  );
}

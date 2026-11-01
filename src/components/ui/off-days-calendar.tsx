import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/ui/date-range-picker";

export type OffDay = { id: string; off_date: string; reason: string | null };

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const EASE = [0.22, 1, 0.36, 1] as const;

const REASON_EMOJI: Record<string, string> = { vacation: "🏝️", sick: "🤒", personal: "🙌", closed: "🔒" };
const EMOJI_FONT = { fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' };
const REASON_LABEL: Record<string, string> = { vacation: "Vacation", sick: "Sick", personal: "Personal", closed: "Closed" };
const reasonEmoji = (r: string | null) => REASON_EMOJI[r || "closed"] ?? "✍️";
const reasonLabel = (r: string | null) => REASON_LABEL[r || "closed"] ?? r ?? "Closed";

type Rect = { top: number; left: number; width: number; height: number };

interface OffDaysCalendarProps {
  value: DateRange | null;
  onValueChange: (range: DateRange | null) => void;
  daysOff: OffDay[];
  onRemove: (id: string) => void;
  minDate?: Date;
  className?: string;
}

/**
 * Month grid for picking days off. Tap a first and last day to select a
 * range; tap a saved day off to expand it into a detail card (FLIP from the cell).
 */
export function OffDaysCalendar({ value, onValueChange, daysOff, onRemove, minDate, className }: OffDaysCalendarProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(value?.start ?? new Date()));
  const [dir, setDir] = useState(1);
  const [open, setOpen] = useState<{ day: OffDay; from: Rect; to: Rect } | null>(null);
  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : null;

  const offByKey = useMemo(() => new Map(daysOff.map((d) => [d.off_date, d])), [daysOff]);

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const last = endOfMonth(month);
    const out: Date[] = [];
    for (let d = first; !isAfter(d, last) || out.length % 7 !== 0; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const go = (step: number) => {
    setDir(step);
    setMonth((m) => (step > 0 ? addMonths(m, 1) : subMonths(m, 1)));
  };

  const pick = (day: Date) => {
    if (!value || !isSameDay(value.start, value.end)) return onValueChange({ start: day, end: day });
    if (isBefore(day, value.start)) return onValueChange({ start: day, end: day });
    onValueChange({ start: value.start, end: day });
  };

  const expand = (el: HTMLElement, day: OffDay) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    const width = Math.min(320, w.width - 16);
    const height = 160;
    setOpen({
      day,
      from: { top: c.top - w.top, left: c.left - w.left, width: c.width, height: c.height },
      to: { top: (w.height - height) / 2, left: (w.width - width) / 2, width, height },
    });
  };

  const inRange = (d: Date) => !!value && !isBefore(d, value.start) && !isAfter(d, value.end);

  return (
    <div ref={wrapRef} className={cn("relative select-none", className)}>
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => go(-1)}
          disabled={!!min && !isAfter(startOfMonth(month), min)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e5ea] text-[#666] transition active:scale-90 disabled:opacity-30 dark:bg-[#1a1a1c] dark:text-[#888]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[15px] font-semibold tracking-[-0.2px] text-[#111] dark:text-white">{format(month, "MMMM yyyy")}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => go(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e5ea] text-[#666] transition active:scale-90 dark:bg-[#1a1a1c] dark:text-[#888]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const active = isSameMonth(month, today) && (today.getDay() + 6) % 7 === i;
          return (
            <div
              key={d}
              className={cn(
                "flex h-7 items-center justify-center rounded-[14px] border text-[10px] font-semibold uppercase tracking-[0.5px] transition-colors",
                active
                  ? "border-black/10 bg-white text-[#111] dark:border-white/15 dark:bg-[#242426] dark:text-white"
                  : "border-transparent bg-[#e5e5ea] text-[#999] dark:bg-[#1a1a1c] dark:text-[#666]",
              )}
            >
              {d}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={month.toISOString()}
          custom={dir}
          initial={reduce ? false : { opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mt-1.5 grid grid-cols-7 gap-1.5"
        >
          {cells.map((day, i) => {
            const outside = !isSameMonth(day, month);
            if (outside) return <div key={i} aria-hidden className="aspect-square" />;
            const key = format(day, "yyyy-MM-dd");
            const off = offByKey.get(key);
            const past = !!min && isBefore(day, min);
            const isToday = isSameDay(day, today);
            const sel = inRange(day);
            const edge = !!value && (isSameDay(day, value.start) || isSameDay(day, value.end));
            return (
              <motion.button
                key={key}
                type="button"
                disabled={past && !off}
                onClick={(e) => (off ? expand(e.currentTarget, off) : pick(day))}
                initial={reduce ? false : { opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.015 }}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-end rounded-xl border pb-1.5 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95",
                  "border-black/[0.04] bg-white dark:border-transparent dark:bg-[#161618]",
                  past && !off && "opacity-35",
                  sel && !edge && "bg-[#e5e5ea] dark:bg-[#2c2c2f]",
                  edge && "border-transparent bg-[#111] dark:bg-white",
                  off && "[@media(hover:hover)]:hover:z-10 [@media(hover:hover)]:hover:scale-110 [@media(hover:hover)]:hover:border-black/10 [@media(hover:hover)]:hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] dark:[@media(hover:hover)]:hover:border-white/15 dark:[@media(hover:hover)]:hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)]",
                )}
              >
                {off && (
                  <span aria-hidden style={EMOJI_FONT} className="pointer-events-none absolute left-1/2 top-1 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center text-[15px] leading-none">
                    {reasonEmoji(off.reason)}
                  </span>
                )}
                {off && <span className="absolute -right-px -top-px h-1.5 w-1.5 rounded-full bg-[#ff4757]" />}
                {isToday && !off && <span className="absolute -right-px -top-px h-1.5 w-1.5 rounded-full bg-[#00d2d3]" />}
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    edge ? "text-white dark:text-[#111]" : "text-[#666] dark:text-[#888]",
                    isToday && "text-[12px] font-bold",
                    isToday && !edge && "text-[#111] dark:text-white",
                  )}
                >
                  {format(day, "d")}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              className="absolute -inset-2 z-30 rounded-[24px] bg-white/60 backdrop-blur-[8px] dark:bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setOpen(null)}
            />
            <motion.div
              key="card"
              role="dialog"
              aria-label="Day off"
              className="absolute z-40 overflow-hidden border border-black/[0.08] bg-white shadow-[0_30px_60px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/[0.12] dark:bg-black dark:shadow-[0_30px_60px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.05)]"
              initial={{ ...open.from, borderRadius: 12 }}
              animate={{ ...open.to, borderRadius: 20, transition: { duration: reduce ? 0 : 0.6, ease: EASE } }}
              exit={{ ...open.from, borderRadius: 12, opacity: 0, transition: { duration: reduce ? 0 : 0.5, ease: EASE, opacity: { delay: 0.35, duration: 0.15 } } }}
            >
              <motion.div
                className="flex h-[160px] flex-col"
                style={{ width: open.to.width }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.3 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <div className="flex items-center border-b border-black/[0.04] px-5 pb-4 pt-5 dark:border-white/[0.06]">
                  <span aria-hidden style={EMOJI_FONT} className="mr-3.5 flex h-7 w-7 items-center justify-center text-[22px] leading-none">
                    {reasonEmoji(open.day.reason)}
                  </span>
                  <span className="flex-1 text-[15px] font-semibold tracking-[-0.2px] text-[#111] dark:text-white">
                    {format(new Date(`${open.day.off_date}T00:00:00`), "EEEE, MMM d")}
                  </span>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpen(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-[#666] transition active:scale-90 dark:bg-white/5 dark:text-[#888]"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <div className="flex flex-1 items-center justify-between gap-3 px-5">
                  <p className="text-[13px] leading-[1.6] text-[#666] dark:text-[#888]">
                    <span className="capitalize">{reasonLabel(open.day.reason)}</span>. Hidden from booking.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(open.day.id);
                      setOpen(null);
                    }}
                    className="h-9 shrink-0 rounded-full bg-[#ff4757]/10 px-4 text-[13px] font-semibold text-[#ff4757] transition active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

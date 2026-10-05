import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export interface SlotRailItem {
  time: string;
  available: boolean;
}

interface SlotRailProps {
  slots: SlotRailItem[];
  value: string;
  onSelect: (time: string) => void;
  accentColor?: string;
  disabled?: boolean;
  /** Fires whenever the thumb rests on (or is dragged over) an open vs. taken slot. */
  onAvailabilityChange?: (available: boolean) => void;
}

export function SlotRail({
  slots,
  value,
  onSelect,
  accentColor = "#FF2D46",
  disabled,
  onAvailabilityChange,
}: SlotRailProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef(-1);
  const previewIndexRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const firstOpenIndex = slots.findIndex((slot) => slot.available);
  const valueIndex = slots.findIndex((slot) => slot.time === value);
  const selectedIndex = valueIndex >= 0 ? valueIndex : Math.max(0, firstOpenIndex);
  const previewIndex = dragIndex ?? selectedIndex;
  const activeSlot = slots[previewIndex];
  const thumbSize = 32;

  // Like an iOS picker, always rest on a real open time.
  useEffect(() => {
    if (disabled || firstOpenIndex < 0) return;
    if (valueIndex < 0 || !slots[valueIndex]?.available) onSelect(slots[firstOpenIndex].time);
  }, [disabled, firstOpenIndex, valueIndex, slots, onSelect]);

  const activeAvailable = !!activeSlot?.available;
  useEffect(() => {
    onAvailabilityChange?.(activeAvailable);
  }, [activeAvailable, onAvailabilityChange]);

  useLayoutEffect(() => {
    const element = trackRef.current;
    if (!element) return;
    const update = () => setTrackWidth(element.clientWidth);
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [slots.length]);

  const step = useMemo(() => {
    if (!trackWidth || slots.length <= 1) return 0;
    return Math.max(0, (trackWidth - thumbSize) / (slots.length - 1));
  }, [slots.length, trackWidth]);

  const indexFromClientX = (clientX: number) => {
    const element = trackRef.current;
    if (!element || slots.length === 0) return 0;
    const rect = element.getBoundingClientRect();
    const usable = Math.max(1, rect.width - thumbSize);
    const x = Math.min(Math.max(clientX - rect.left - thumbSize / 2, 0), usable);
    return Math.round((x / usable) * (slots.length - 1));
  };

  const preview = (index: number) => {
    const bounded = Math.min(Math.max(index, 0), slots.length - 1);
    previewIndexRef.current = bounded;
    setDragIndex(bounded);
    if (bounded !== lastTickRef.current) {
      lastTickRef.current = bounded;
      haptic("selection");
    }
    if (slots[bounded]?.available && slots[bounded].time !== value) {
      onSelect(slots[bounded].time);
    }
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    const targetIndex = previewIndexRef.current;
    previewIndexRef.current = null;
    draggingRef.current = false;
    setDragIndex(null);
    lastTickRef.current = -1;

    if (targetIndex !== null && !slots[targetIndex]?.available) {
      const nearestOpen = slots.reduce(
        (best, slot, index) =>
          slot.available &&
          (best === -1 || Math.abs(index - targetIndex) < Math.abs(best - targetIndex))
            ? index
            : best,
        -1,
      );
      if (nearestOpen >= 0 && slots[nearestOpen].time !== value) {
        haptic("selection");
        onSelect(slots[nearestOpen].time);
      }
    }
  };

  const selectDirection = (direction: 1 | -1) => {
    if (!slots.length) return;
    let index = selectedIndex;
    for (let i = 0; i < slots.length; i += 1) {
      index = Math.min(Math.max(index + direction, 0), slots.length - 1);
      if (slots[index]?.available || index === 0 || index === slots.length - 1) break;
    }
    if (slots[index]?.available && slots[index].time !== value) {
      haptic("selection");
      onSelect(slots[index].time);
    }
  };

  if (!slots.length || firstOpenIndex < 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
            Swipe time
          </div>
          <div className="mt-1 text-[24px] font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
            {activeSlot?.time || "—"}
          </div>
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-semibold",
            activeSlot?.available
              ? "bg-black/[0.05] text-[#1C1C1E] dark:bg-white/[0.1] dark:text-white"
              : "bg-black/[0.03] text-[#8E8E93] dark:bg-white/[0.05]"
          )}
        >
          {activeSlot?.available ? "Open" : "Taken"}
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Choose appointment time"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, slots.length - 1)}
        aria-valuenow={previewIndex}
        aria-valuetext={activeSlot ? `${activeSlot.time} ${activeSlot.available ? "available" : "busy"}` : undefined}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            selectDirection(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            selectDirection(-1);
          }
        }}
        onPointerDown={(event) => {
          if (disabled) return;
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          preview(indexFromClientX(event.clientX));
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current || disabled) return;
          preview(indexFromClientX(event.clientX));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "relative h-24 touch-none select-none rounded-[28px] border border-black/[0.05] bg-white px-0 outline-none transition focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:border-white/[0.06] dark:bg-[#2C2C2E]",
          disabled && "opacity-60"
        )}
      >
        <div className="absolute left-6 right-6 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/[0.06] dark:bg-white/[0.07]" />

        {slots.map((slot, index) => {
          const left = slots.length <= 1 ? trackWidth / 2 : thumbSize / 2 + index * step;
          const active = index === previewIndex;
          return (
            <div
              key={slot.time}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left }}
            >
              <div
                className={cn(
                  "rounded-full transition-transform",
                  slot.available
                    ? "h-2.5 w-2.5 bg-[#8E8E93] dark:bg-[#D1D1D6]"
                    : "h-1.5 w-1.5 bg-[#D1D1D6] dark:bg-[#48484A]",
                  active && "scale-125"
                )}
              />
              {(index === 0 || index === slots.length - 1 || index % 4 === 0) && (
                <span
                  className={cn(
                    "absolute left-1/2 top-[24px] -translate-x-1/2 text-[9px] font-medium tabular-nums transition-opacity",
                    active ? "text-[#1C1C1E] opacity-0 dark:text-white" : "text-[#8E8E93]"
                  )}
                >
                  {slot.time}
                </span>
              )}
            </div>
          );
        })}

        <motion.div
          animate={{ x: previewIndex * step, scale: activeSlot?.available ? 1 : 0.9 }}
          transition={reduceMotion ? { duration: 0 } : spring}
          className="absolute left-0 top-1/2 z-10 -mt-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white"
          style={{ backgroundColor: activeSlot?.available ? accentColor : "#636366" }}
        >
          <div className="h-2 w-2 rounded-full bg-white/90" />
        </motion.div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const active = slot.time === value;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available || disabled}
              onClick={() => {
                haptic("selection");
                onSelect(slot.time);
              }}
              className={cn(
                "h-10 rounded-[14px] text-[12px] font-semibold transition active:scale-95",
                active
                  ? "text-white"
                  : slot.available
                    ? "bg-black/[0.05] text-[#1C1C1E] dark:bg-white/[0.09] dark:text-[#E5E5EA]"
                    : "bg-black/[0.02] text-[#C7C7CC] dark:bg-white/[0.03] dark:text-[#48484A]"
              )}
              style={active ? { backgroundColor: accentColor } : undefined}
            >
              {slot.time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const spring = { type: "spring" as const, stiffness: 500, damping: 34 };

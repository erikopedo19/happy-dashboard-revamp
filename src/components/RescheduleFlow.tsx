import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getDay, isSameDay, isSameMonth,
  startOfDay, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SlotRail } from "@/components/SlotRail";
import { generateBookingTimeSlots, getAvailableBookingSlots, type BookedSlotLike } from "@/lib/bookingSlots";
import { formatTzLabel, getBrowserTimezone } from "@/lib/tz";
import { haptic } from "@/lib/haptics";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AgendaSettings = { start_hour: string; end_hour: string; service_duration: number; working_days?: number[] | null; timezone?: string | null };
type HoursRow = { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean | null };
type BlockRow = { start_time: string; end_time: string };

const WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const ease = [0.22, 1, 0.36, 1] as const;
const toMin = (t: string) => { const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const key = (d: Date) => format(d, "yyyy-MM-dd");
const inkOn = (hex: string) => {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#0A0A0B" : "#fff";
};

const fetchBooked = async (bizId: string, day: string) => {
  const { data, error } = await (supabase as any).rpc("get_booked_slots", { _business_id: bizId, _date: day });
  return error ? [] : ((data || []) as BookedSlotLike[]);
};
const fetchBlocked = async (bizId: string, day: string) => {
  const { data, error } = await (supabase as any).rpc("get_blocked_slots", { _business_id: bizId, _date: day });
  return error ? [] : ((data || []) as BlockRow[]);
};

/**
 * Reschedule picker that reads the same availability sources as the public
 * booking link (agenda settings, business hours, days off, bookings, blocked
 * ranges) and stays live via realtime + polling.
 */
export function RescheduleFlow({
  businessId,
  currentDate,
  currentTime,
  duration,
  accent,
  busy,
  onBack,
  onConfirm,
}: {
  businessId: string;
  currentDate: string;
  currentTime: string;
  duration: number;
  accent: string;
  busy: boolean;
  onBack: () => void;
  onConfirm: (date: Date, time: string) => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const today = startOfDay(new Date());
  const original = new Date(`${currentDate}T00:00:00`);
  const origTime = currentTime.slice(0, 5);
  const [month, setMonth] = useState(() => startOfMonth(original < today ? today : original));
  const [date, setDate] = useState<Date>(() => (original < today ? today : original));
  const [time, setTime] = useState("");
  const [onOpenSlot, setOnOpenSlot] = useState(true);
  const dayKey = key(date);

  const { data: settings } = useQuery<AgendaSettings>({
    queryKey: ["public-agenda-settings", businessId],
    queryFn: async () => {
      const [agendaRes, profileRes] = await Promise.all([
        (supabase as any).rpc("get_public_agenda_settings", { _user_id: businessId }),
        (supabase.from("profiles" as any).select("timezone") as any).eq("id", businessId).maybeSingle(),
      ]);
      const row = Array.isArray(agendaRes?.data) ? agendaRes.data[0] : agendaRes?.data;
      const base = row || { start_hour: "08:00", end_hour: "18:00", service_duration: 30, working_days: [0, 1, 2, 3, 4, 5, 6] };
      return { ...base, timezone: profileRes?.data?.timezone || null } as AgendaSettings;
    },
  });

  const { data: hours = [] } = useQuery<HoursRow[]>({
    queryKey: ["public-business-hours", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("business_hours" as any).select("day_of_week, open_time, close_time, is_closed") as any).eq("user_id", businessId);
      return error ? [] : data || [];
    },
  });

  const { data: offDates = [] } = useQuery<string[]>({
    queryKey: ["public-time-off", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_time_off_dates", { _user_id: businessId });
      return error ? [] : (data || []).map((r: any) => r.off_date as string);
    },
  });
  const offSet = useMemo(() => new Set(offDates), [offDates]);

  const { data: booked = [], isFetching: bookedLoading } = useQuery<BookedSlotLike[]>({
    queryKey: ["public-appointments", businessId, dayKey],
    queryFn: () => fetchBooked(businessId, dayKey),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
  const { data: blocked = [] } = useQuery<BlockRow[]>({
    queryKey: ["public-blocked-slots", businessId, dayKey],
    queryFn: () => fetchBlocked(businessId, dayKey),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`reschedule-sync-${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${businessId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["public-appointments", businessId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_settings", filter: `user_id=eq.${businessId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["public-agenda-settings", businessId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "business_hours", filter: `user_id=eq.${businessId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ["public-business-hours", businessId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [businessId, queryClient]);

  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4, 5, 6];
  const tz = settings?.timezone || getBrowserTimezone();
  const interval = settings?.service_duration || 30;

  const hoursFor = (d: Date) => {
    const fb = { start: settings?.start_hour || "09:00", end: settings?.end_hour || "18:00", closed: false };
    if (offSet.has(key(d))) return { ...fb, closed: true };
    const row = hours.find((h) => h.day_of_week === d.getDay());
    if (!row) return fb;
    if (row.is_closed) return { ...fb, closed: true };
    return { start: (row.open_time || fb.start).slice(0, 5), end: (row.close_time || fb.end).slice(0, 5), closed: false };
  };

  const allSlots = useMemo(() => {
    if (!settings) return [];
    let earliest = settings.start_hour;
    let latest = settings.end_hour;
    for (const h of hours) {
      if (h.is_closed) continue;
      if (h.open_time && h.open_time.slice(0, 5) < earliest) earliest = h.open_time.slice(0, 5);
      if (h.close_time && h.close_time.slice(0, 5) > latest) latest = h.close_time.slice(0, 5);
    }
    return generateBookingTimeSlots(earliest, latest, settings.service_duration);
  }, [settings, hours]);

  const computeOpen = (d: Date, bookedRows: BookedSlotLike[], blockRows: BlockRow[]) => {
    const h = hoursFor(d);
    if (h.closed || !settings) return [];
    // The booking being moved must not block its own neighbourhood.
    let skipped = false;
    const others = key(d) === currentDate
      ? bookedRows.filter((b) => {
          if (!skipped && String(b.appointment_time).slice(0, 5) === origTime) { skipped = true; return false; }
          return true;
        })
      : bookedRows;
    const blocks: BookedSlotLike[] = blockRows.map((b) => ({
      appointment_time: String(b.start_time).slice(0, 5),
      service_duration: Math.max(toMin(b.end_time) - toMin(b.start_time), 1),
      stylist_id: null,
    }));
    return getAvailableBookingSlots({
      date: d, allSlots, startHour: h.start, endHour: h.end, interval,
      serviceDuration: duration || interval, bookedSlots: [...others, ...blocks],
      workingDays, timezone: tz, timeOffDates: offSet,
    });
  };

  const open = useMemo(() => computeOpen(date, booked, blocked),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, booked, blocked, settings, hours, offSet, allSlots, duration]);
  const railSlots = useMemo(() => {
    const set = new Set(open);
    return allSlots.map((t) => ({ time: t, available: set.has(t) && !(dayKey === currentDate && t === origTime) }));
  }, [allSlots, open, dayKey, currentDate, origTime]);
  const hasOpen = railSlots.some((s) => s.available);

  useEffect(() => { if (time && !railSlots.find((s) => s.time === time)?.available) setTime(""); }, [railSlots, time]);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }), [month]);

  const confirm = async () => {
    if (!time || busy) return;
    haptic("medium");
    const [b, bl] = await Promise.all([
      queryClient.fetchQuery({ queryKey: ["public-appointments", businessId, dayKey], queryFn: () => fetchBooked(businessId, dayKey), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: ["public-blocked-slots", businessId, dayKey], queryFn: () => fetchBlocked(businessId, dayKey), staleTime: 0 }),
    ]);
    if (!computeOpen(date, b, bl).includes(time)) {
      haptic("error");
      toast({ title: "That time was just taken", description: "Pick another slot.", variant: "destructive" });
      setTime("");
      return;
    }
    await onConfirm(date, time);
  };

  const fromLabel = `${format(original, "EEE d MMM")} · ${origTime}`;
  const toLabel = time ? `${format(date, "EEE d MMM")} · ${time}` : "Pick a time";

  return (
    <motion.div
      key="reschedule"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease }}
      className="mt-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[26px] font-semibold tracking-[-0.03em]">New date & time</h2>
        <button type="button" onClick={() => { haptic("light"); onBack(); }} className="flex items-center gap-1 text-[14px] text-white/55 active:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="mt-4 rounded-[28px] border border-white/[0.06] bg-[#121215] p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-[17px] font-semibold">
            {format(month, "MMMM")} <span className="text-white/45">{format(month, "yyyy")}</span>
          </h3>
          <div className="flex gap-1">
            {[{ d: -1, I: ChevronLeft, l: "Previous month" }, { d: 1, I: ChevronRight, l: "Next month" }].map(({ d, I, l }) => (
              <button
                key={l}
                type="button"
                aria-label={l}
                disabled={d < 0 && month <= startOfMonth(today)}
                onClick={() => { haptic("selection"); setMonth(d < 0 ? subMonths(month, 1) : addMonths(month, 1)); }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/75 transition active:scale-90 disabled:opacity-30"
              >
                <I className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEK.map((w) => <div key={w} className="py-1 text-center text-[10px] font-semibold tracking-wider text-white/35">{w}</div>)}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={key(month)}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((d) => {
              const selected = isSameDay(d, date);
              const inMonth = isSameMonth(d, month);
              const disabled = d < today || !workingDays.includes(getDay(d)) || hoursFor(d).closed;
              const isCurrent = key(d) === currentDate;
              return (
                <motion.button
                  key={d.toISOString()}
                  type="button"
                  disabled={disabled}
                  whileTap={disabled ? undefined : { scale: 0.88 }}
                  onClick={() => { haptic("selection"); setDate(d); setTime(""); }}
                  style={selected ? { color: inkOn(accent) } : undefined}
                  className={cn(
                    "relative flex aspect-square min-h-[40px] items-center justify-center rounded-full text-[14px] font-medium",
                    selected ? "font-semibold" : disabled || !inMonth ? "text-white/20" : "text-white/90 active:bg-white/[0.08]",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="reschedule-day"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                  {isCurrent && !selected && <span className="absolute inset-[3px] rounded-full border border-dashed border-white/30" />}
                  <span className="relative">{format(d, "d")}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 flex items-center gap-2 px-1 text-[12px] text-white/40">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-white/40" /> Your current day
        </p>
      </div>

      <div className="mt-3 rounded-[28px] border border-white/[0.06] bg-[#121215] p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-[15px] font-semibold">{format(date, "EEEE d MMMM")}</h3>
          {bookedLoading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
        </div>
        <p className="mb-3 flex items-center gap-1.5 px-1 text-[12px] text-white/40">
          <Globe className="h-3 w-3" /> Times in {formatTzLabel(tz)} · {duration} min
        </p>
        {!settings ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
        ) : hasOpen ? (
          <SlotRail slots={railSlots} value={time} onSelect={setTime} accentColor={accent} onAvailabilityChange={setOnOpenSlot} />
        ) : (
          <p className="py-8 text-center text-[14px] text-white/45">No free times this day. Try another date.</p>
        )}
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-4 border-t border-white/[0.06] bg-[#0A0A0B]/85 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3.5 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-center gap-2.5 text-[13px] tabular-nums">
          <span className="text-white/40 line-through decoration-white/25">{fromLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 text-white/35" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={toLabel}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={cn("font-semibold", time ? "text-white" : "text-white/45")}
            >
              {toLabel}
            </motion.span>
          </AnimatePresence>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={confirm}
          disabled={!time || !onOpenSlot || busy}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] text-[16px] font-semibold transition-opacity disabled:opacity-40"
          style={{ background: `linear-gradient(180deg, ${accent}, ${accent}dd)`, color: inkOn(accent) }}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm new time"}
        </motion.button>
      </div>
    </motion.div>
  );
}

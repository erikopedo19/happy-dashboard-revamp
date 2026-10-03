import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarPlus, Check, Loader2, MapPin, MessageSquare, Navigation, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import {
  ensureNotificationPermission,
  notifyNow,
} from "@/lib/nativeNotifications";
import { destinationUrl, type Coordinates } from "@/lib/travelTime";
import { dateStrInTz, getBrowserTimezone, minutesInTz, timeStrToMinutes, zonedDateTime } from "@/lib/tz";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BookingLike {
  id: string;
  appointment_date: string;
  appointment_time: string;
  barber_id: string;
  barber_name?: string | null;
  stylist_id?: string | null;
  service_name?: string | null;
  status?: string;
}

interface BarberLocation {
  address?: string | null;
  avatar_url?: string | null;
  brand_color?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
}

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function LiveQueueCard({ booking }: { booking?: BookingLike | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const now = useNow(15_000);
  const [etaSending, setEtaSending] = useState<string | null>(null);
  const [etaSent, setEtaSent] = useState<"on_my_way" | "running_late" | null>(null);
  const notifiedTurnRef = useRef(false);

  useEffect(() => {
    setEtaSent(null);
  }, [booking?.id]);

  const { data: profile } = useQuery<BarberLocation | null>({
    queryKey: ["queue-booking-location", booking?.id],
    enabled: !!booking?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_location", {
        _appointment_id: booking!.id,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] || null : data || null;
    },
  });

  const timezone = profile?.timezone || getBrowserTimezone();
  const appointmentAt = useMemo(() => {
    if (!booking) return null;
    return zonedDateTime(booking.appointment_date, booking.appointment_time, timezone);
  }, [booking, timezone]);

  const isToday = !!booking && dateStrInTz(new Date(), timezone) === booking.appointment_date;

  const { data: booked = [], isFetched: queueFetched } = useQuery({
    queryKey: ["live-queue-slots", booking?.barber_id, booking?.appointment_date],
    enabled: !!booking && isToday,
    refetchInterval: isToday ? 20_000 : false,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_booked_slots", {
        _business_id: booking!.barber_id,
        _date: booking!.appointment_date,
      });
      return data || [];
    },
  });

  useEffect(() => {
    if (!booking?.barber_id) return;
    const channel = supabase
      .channel(`client-queue-${booking.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${booking.barber_id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["live-queue-slots", booking.barber_id] });
          qc.invalidateQueries({ queryKey: ["my-bookings"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking?.barber_id, booking?.id, qc]);

  const queue = useMemo(() => {
    if (!booking || !appointmentAt || !isToday) {
      return { peopleAhead: 0, waitMinutes: 0, progress: 0 };
    }
    const myStart = timeStrToMinutes(String(booking.appointment_time).slice(0, 5));
    const nowMinutes = minutesInTz(new Date(now), timezone);
    const earlier = new Map<number, number>();
    booked.forEach((slot) => {
      if (booking.stylist_id && slot.stylist_id && slot.stylist_id !== booking.stylist_id) return;
      const start = timeStrToMinutes(String(slot.appointment_time || "00:00").slice(0, 5));
      const duration = Math.max(Number(slot.service_duration) || 30, 1);
      const end = start + duration;
      if (start >= myStart || end <= nowMinutes) return;
      const remaining = Math.max(1, end - Math.max(start, nowMinutes));
      earlier.set(start, Math.max(earlier.get(start) || 0, remaining));
    });
    const peopleAhead = earlier.size;
    const waitMinutes = Array.from(earlier.values()).reduce((sum, duration) => sum + duration, 0);
    const minutesUntil = Math.max(0, Math.round((appointmentAt.getTime() - now) / 60_000));
    const progress = peopleAhead === 0
      ? 1
      : Math.min(0.92, Math.max(0.12, 1 - minutesUntil / 120));
    return { peopleAhead, waitMinutes, progress };
  }, [appointmentAt, booked, booking, isToday, now, timezone]);

  useEffect(() => {
    const minutesUntilAppointment = appointmentAt
      ? Math.max(0, Math.round((appointmentAt.getTime() - now) / 60_000))
      : Infinity;
    if (
      !booking ||
      !isToday ||
      !queueFetched ||
      queue.peopleAhead !== 0 ||
      minutesUntilAppointment > 15 ||
      notifiedTurnRef.current
    ) return;
    notifiedTurnRef.current = true;
    const key = `cutzio:turn-notified:${booking.id}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    haptic("success");
    toast({ title: "You're up next", description: `${booking.service_name || "Your appointment"} is ready.` });
    void ensureNotificationPermission().then((allowed) => {
      if (allowed) {
        void notifyNow("You're up next", `${booking.service_name || "Your appointment"} is ready.`, booking.id);
      }
    });
  }, [appointmentAt, booking, isToday, now, queue.peopleAhead, queueFetched, toast]);

  if (!booking || !appointmentAt) return null;

  const accent = profile?.brand_color || "#e11d48";
  const destination: Coordinates | null =
    profile?.latitude != null && profile.longitude != null
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
      : null;
  const directions = destinationUrl(destination, profile?.address) || profile?.google_maps_url || null;
  const minutesUntilAppointment = Math.max(0, Math.round((appointmentAt.getTime() - now) / 60_000));

  // Google Calendar "add event" link — no permissions needed, works on every
  // device. Dates are wall-clock times in the shop timezone (passed via ctz).
  const [calY, calM, calD] = booking.appointment_date.split("-").map(Number);
  const calTime = String(booking.appointment_time).slice(0, 5);
  const calStartUtc = Date.UTC(calY, (calM || 1) - 1, calD || 1, Number(calTime.slice(0, 2)), Number(calTime.slice(3)), 0);
  const calStamp = (ms: number) => {
    const dt = new Date(ms);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}${p(dt.getUTCSeconds())}`;
  };
  const calendarParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `${booking.service_name || "Appointment"} · ${booking.barber_name || "Barber"}`,
    dates: `${calStamp(calStartUtc)}/${calStamp(calStartUtc + 60 * 60_000)}`,
    ctz: timezone,
    details: `Your appointment at ${booking.barber_name || "the shop"}.`,
  });
  if (profile?.address) calendarParams.set("location", profile.address);
  const calendarUrl = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;

  const friendlyDate = format(new Date(`${booking.appointment_date}T12:00:00`), "EEE, MMM d");

  const sendEta = async (kind: "on_my_way" | "running_late") => {
    if (etaSending || etaSent === kind) return;
    haptic("medium");
    setEtaSending(kind);
    const { data, error } = await supabase.rpc("notify_barber_eta", {
      _appointment_id: booking.id,
      _kind: kind,
    });
    setEtaSending(null);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      haptic("error");
      toast({ title: "Couldn't send update", description: result?.error || error?.message, variant: "destructive" });
      return;
    }
    setEtaSent(kind);
    haptic("success");
    toast({
      title: kind === "on_my_way" ? "On-your-way sent" : "Heads-up sent",
      description: `${booking.barber_name || "Your barber"} was notified.`,
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/[0.07] dark:bg-[#1C1C1E]"
    >
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live queue
            </div>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
              {!isToday
                ? "Upcoming appointment"
                : !queueFetched
                  ? "Checking live queue"
                  : queue.peopleAhead === 0
                    ? "You're up next"
                    : `${queue.peopleAhead} ${queue.peopleAhead === 1 ? "person" : "people"} ahead`}
            </h2>
            <p className="mt-1 text-[13px] text-[#8E8E93]">
              {!isToday || queue.peopleAhead === 0
                ? `${booking.service_name || "Appointment"} at ${booking.appointment_time.slice(0, 5)}`
                : `About ${queue.waitMinutes} min`}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ backgroundColor: `${accent}18` }}>
            <Radio className="h-5 w-5" style={{ color: accent }} />
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div
              className="h-full origin-left rounded-full"
              style={{ backgroundColor: accent }}
              animate={{ scaleX: queue.progress }}
              transition={{ type: "spring", stiffness: 140, damping: 24 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#8E8E93]">
            <span>{isToday ? "Today" : "Upcoming"}</span>
            <span className="tabular-nums">{minutesUntilAppointment} min away</span>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-[#F2F2F7] p-3 dark:bg-[#2C2C2E]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white dark:bg-[#1C1C1E]">
              {isToday ? (
                <MessageSquare className="h-5 w-5 text-[#8E8E93]" />
              ) : (
                <CalendarPlus className="h-5 w-5 text-[#8E8E93]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                {isToday
                  ? etaSent
                    ? "Update sent"
                    : "Keep them posted"
                  : "Save it to your calendar"}
              </div>
              <div className="truncate text-[11px] text-[#8E8E93]">
                {isToday
                  ? etaSent
                    ? `${booking.barber_name || "Your barber"} knows you're ${etaSent === "on_my_way" ? "on the way" : "running late"}`
                    : profile?.address || "One tap lets your barber know"
                  : `${friendlyDate} · ${String(booking.appointment_time).slice(0, 5)} — reminders included`}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {isToday ? (
            <>
              <button
                type="button"
                onClick={() => sendEta("on_my_way")}
                disabled={!!etaSending || etaSent === "on_my_way"}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-70",
                  etaSent === "on_my_way"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "text-white"
                )}
                style={etaSent === "on_my_way" ? undefined : { backgroundColor: accent }}
              >
                {etaSending === "on_my_way" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : etaSent === "on_my_way" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                On my way
              </button>
              <button
                type="button"
                onClick={() => sendEta("running_late")}
                disabled={!!etaSending || etaSent === "running_late"}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-70",
                  etaSent === "running_late"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    : "bg-black/[0.05] text-[#1C1C1E] dark:bg-white/[0.08] dark:text-[#F2F2F7]"
                )}
              >
                {etaSending === "running_late" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : etaSent === "running_late" ? (
                  <Check className="h-4 w-4" />
                ) : null}
                Running late
              </button>
            </>
          ) : (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => haptic("light")}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold text-white transition active:scale-[0.98]"
              style={{ backgroundColor: accent }}
            >
              <CalendarPlus className="h-4 w-4" />
              Add to calendar
            </a>
          )}
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              onClick={() => haptic("light")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-black/[0.05] text-[#1C1C1E] transition active:scale-95 dark:bg-white/[0.08] dark:text-[#F2F2F7]"
              aria-label="Get directions"
            >
              <Navigation className="h-4 w-4" />
            </a>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-black/[0.04] text-[#8E8E93] dark:bg-white/[0.06]">
              <MapPin className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

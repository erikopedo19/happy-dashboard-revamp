import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CarFront, Clock3, Loader2, MapPin, Navigation, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import {
  ensureNotificationPermission,
  notifyNow,
  scheduleLeaveNotification,
} from "@/lib/nativeNotifications";
import {
  destinationUrl,
  estimateDrivingMinutes,
  getCurrentCoordinates,
  type Coordinates,
} from "@/lib/travelTime";
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
  const [travelMinutes, setTravelMinutes] = useState<number | null>(null);
  const [leaveAt, setLeaveAt] = useState<Date | null>(null);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [enablingAlert, setEnablingAlert] = useState(false);
  const notifiedTurnRef = useRef(false);

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
  const minutesUntilLeave = leaveAt ? Math.max(0, Math.ceil((leaveAt.getTime() - now) / 60_000)) : null;

  const enableLeaveAlert = async () => {
    if (enablingAlert || alertEnabled) return;
    haptic("medium");
    setEnablingAlert(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        toast({ title: "Notifications are off", description: "Allow notifications to get the leave alert.", variant: "destructive" });
        return;
      }
      const current = await getCurrentCoordinates();
      if (!current || !destination) {
        toast({ title: "Location unavailable", description: "The barber needs a saved shop location, and this device needs location access.", variant: "destructive" });
        return;
      }
      const minutes = await estimateDrivingMinutes(current, destination);
      const target = new Date(appointmentAt.getTime() - minutes * 60_000);
      setTravelMinutes(minutes);
      setLeaveAt(target);
      setAlertEnabled(true);
      await scheduleLeaveNotification({
        key: `leave-${booking.id}`,
        title: target.getTime() <= Date.now() ? "Leave now" : "Time to leave soon",
        body: `${minutes} min to ${booking.barber_name || "your barber"}. Your ${booking.service_name || "appointment"} is at ${booking.appointment_time.slice(0, 5)}.`,
        at: target,
      });
      haptic("success");
    } finally {
      setEnablingAlert(false);
    }
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
              <CarFront className="h-5 w-5 text-[#8E8E93]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                {alertEnabled
                  ? minutesUntilLeave === 0
                    ? "Leave now"
                    : `Leave in ${minutesUntilLeave} min`
                  : "Smart leave alert"}
              </div>
              <div className="truncate text-[11px] text-[#8E8E93]">
                {alertEnabled && travelMinutes
                  ? `${travelMinutes} min travel estimate`
                  : profile?.address || "We’ll calculate travel time from your location"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={enableLeaveAlert}
            disabled={enablingAlert || alertEnabled}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold transition active:scale-[0.98] disabled:opacity-70",
              alertEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "text-white"
            )}
            style={alertEnabled ? undefined : { backgroundColor: accent }}
          >
            {enablingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
            {alertEnabled ? "Alert on" : "Enable alert"}
          </button>
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              onClick={() => haptic("light")}
              className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-black/[0.05] text-[#1C1C1E] transition active:scale-95 dark:bg-white/[0.08] dark:text-[#F2F2F7]"
              aria-label="Get directions"
            >
              <Navigation className="h-4 w-4" />
            </a>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-black/[0.04] text-[#8E8E93] dark:bg-white/[0.06]">
              <MapPin className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

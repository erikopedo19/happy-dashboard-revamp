import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { motion } from "framer-motion";
import { CalendarPlus, Clock, Loader2, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateBookingTimeSlots, getAvailableBookingSlots } from "@/lib/bookingSlots";
import { haptic } from "@/lib/haptics";
import { dateStrInTz, getBrowserTimezone } from "@/lib/tz";
import { useToast } from "@/hooks/use-toast";

interface BookingLike {
  id: string;
  barber_id: string;
  barber_name?: string | null;
  service_name?: string | null;
}

interface RebookContext {
  success?: boolean;
  error?: string;
  barber_id?: string;
  barber_name?: string;
  service_id?: string;
  stylist_id?: string | null;
  service_name?: string;
  service_duration?: number;
  service_price?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string | null;
  booking_link?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  brand_color?: string | null;
  address?: string | null;
  timezone?: string | null;
  accepts_waitlist?: boolean;
}

interface NextOpening {
  date: Date;
  dateKey: string;
  time: string;
}

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

export function BookAgainCard({ booking }: { booking?: BookingLike | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bookingNow, setBookingNow] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const { data: context, isLoading } = useQuery({
    queryKey: ["rebook-context", booking?.id],
    enabled: !!booking?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_rebook_context", {
        _appointment_id: booking!.id,
      });
      if (error) throw error;
      return data as unknown as RebookContext;
    },
  });

  const { data: nextOpening, isLoading: findingSlot } = useQuery<NextOpening | null>({
    queryKey: [
      "rebook-opening",
      context?.barber_id,
      context?.service_id,
      context?.stylist_id,
    ],
    enabled: !!context?.success && !!context.barber_id && !!context.service_id,
    staleTime: 30_000,
    queryFn: async () => {
      const timezone = context?.timezone || getBrowserTimezone();
      const [agendaRes, timeOffRes] = await Promise.all([
        supabase.rpc("get_public_agenda_settings", {
          _user_id: context!.barber_id!,
        }),
        supabase.rpc("get_time_off_dates", {
          _user_id: context!.barber_id!,
        }),
      ]);

      const agenda = Array.isArray(agendaRes.data) ? agendaRes.data[0] : agendaRes.data;
      const startHour = agenda?.start_hour || "09:00";
      const endHour = agenda?.end_hour || "18:00";
      const interval = Math.max(agenda?.service_duration || 30, 1);
      const workingDays = agenda?.working_days || [0, 1, 2, 3, 4, 5, 6];
      const timeOff = new Set<string>((timeOffRes.data || []).map((row) => String(row.off_date)));
      const allSlots = generateBookingTimeSlots(startHour, endHour, interval);
      const today = dateStrInTz(new Date(), timezone);
      const candidates = Array.from({ length: 21 }, (_, offset) => {
        const candidate = addDays(new Date(`${today}T12:00:00`), offset);
        return { date: candidate, dateKey: format(candidate, "yyyy-MM-dd") };
      });

      for (let start = 0; start < candidates.length; start += 7) {
        const week = candidates.slice(start, start + 7);
        const bookedByDate = new Map(
          await Promise.all(
            week.map(async ({ dateKey }) => {
              const { data } = await supabase.rpc("get_booked_slots", {
                _business_id: context!.barber_id!,
                _date: dateKey,
              });
              return [dateKey, data || []] as const;
            }),
          ),
        );

        for (const candidate of week) {
          const available = getAvailableBookingSlots({
            date: candidate.date,
            allSlots,
            startHour,
            endHour,
            interval,
            serviceDuration: context!.service_duration || interval,
            bookedSlots: bookedByDate.get(candidate.dateKey) || [],
            workingDays,
            timezone,
            stylistId: context!.stylist_id,
            timeOffDates: timeOff,
          });
          if (available[0]) {
            return { date: candidate.date, dateKey: candidate.dateKey, time: available[0] };
          }
        }
      }
      return null;
    },
  });

  const accent = context?.brand_color || "#e11d48";
  const canBook = useMemo(
    () => !!context?.success && !!nextOpening && !!context.customer_name && !!context.customer_email,
    [context, nextOpening]
  );

  if (!booking || isLoading || !context?.success) return null;

  const bookNow = async () => {
    if (!context || !nextOpening || bookingNow) return;
    haptic("medium");
    setBookingNow(true);
    try {
      const { data, error } = await supabase.rpc("create_public_booking", {
        p_business_id: context.barber_id!,
        p_customer_name: context.customer_name!,
        p_customer_email: context.customer_email!,
        p_customer_phone: context.customer_phone || null,
        p_service_id: context.service_id!,
        p_appointment_date: nextOpening.dateKey,
        p_appointment_time: nextOpening.time,
        p_notes: "Rebooked from Book Again",
        p_stylist_id: context.stylist_id || null,
      });
      const result = data as { success?: boolean; error?: string } | null;
      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || "That slot was just taken");
      }
      haptic("success");
      toast({
        title: "Booked again",
        description: `${context.service_name} on ${format(nextOpening.date, "EEE, MMM d")} at ${nextOpening.time}`,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-bookings"] }),
        qc.invalidateQueries({ queryKey: ["rebook-opening"] }),
      ]);
    } catch (error: unknown) {
      haptic("error");
      toast({
        title: "Couldn't rebook",
        description: error instanceof Error ? error.message : "Please choose another time",
        variant: "destructive",
      });
    } finally {
      setBookingNow(false);
    }
  };

  const joinWaitlist = async () => {
    if (!context?.barber_id || joiningWaitlist) return;
    haptic("medium");
    setJoiningWaitlist(true);
    const { data, error } = await supabase.rpc("join_cancellation_waitlist", {
      _barber_id: context.barber_id,
    });
    setJoiningWaitlist(false);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      haptic("warning");
      toast({
        title: "Couldn't join waitlist",
        description: result?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    haptic("success");
    toast({ title: "You're on the list", description: "You'll get a 10-minute claim window if a slot opens." });
    qc.invalidateQueries({ queryKey: ["my-waitlist-offers"] });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/[0.07] dark:bg-[#1C1C1E]"
    >
      <div
        className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full opacity-25"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          {context.avatar_url ? (
            <img
              src={context.avatar_url}
              alt={context.barber_name || "Barber"}
              className="h-14 w-14 rounded-[18px] object-cover"
              loading="lazy"
              width={56}
              height={56}
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[18px] text-lg font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {(context.barber_name || "B").charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93] dark:bg-white/[0.08]">
              <Sparkles className="h-3 w-3" style={{ color: accent }} />
              Same again?
            </div>
            <h2 className="mt-2 truncate text-[19px] font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
              {context.service_name || "Your usual"}
            </h2>
            <p className="truncate text-[13px] text-[#8E8E93]">
              at {context.barber_name || booking.barber_name || "your barber"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[22px] bg-[#F2F2F7] p-3 dark:bg-[#2C2C2E]">
          {findingSlot ? (
            <div className="flex h-12 items-center gap-2 text-[13px] text-[#8E8E93]">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding the next opening…
            </div>
          ) : nextOpening ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8E8E93]">
                  Next opening
                </div>
                <div className="mt-0.5 text-[17px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                  {format(nextOpening.date, "EEE, MMM d")} · {nextOpening.time}
                </div>
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8E8E93] dark:bg-[#1C1C1E]">
                {context.service_duration || 30} min
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#8E8E93]">
              No matching openings in the next three weeks.
            </div>
          )}
        </div>

        {context.address && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8E8E93]">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{context.address}</span>
          </div>
        )}

        {nextOpening ? (
          <button
            type="button"
            disabled={!canBook || bookingNow}
            onClick={bookNow}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {bookingNow ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            {bookingNow ? "Booking…" : "Book the same again"}
          </button>
        ) : context.accepts_waitlist ? (
          <button
            type="button"
            disabled={joiningWaitlist}
            onClick={joinWaitlist}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-black/[0.05] text-[15px] font-semibold text-[#1C1C1E] transition active:scale-[0.98] disabled:opacity-60 dark:bg-white/[0.08] dark:text-[#F2F2F7]"
          >
            {joiningWaitlist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Join cancellation list
          </button>
        ) : null}
      </div>
    </motion.section>
  );
}

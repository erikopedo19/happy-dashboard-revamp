import { useEffect, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { showPolishedToast, type PolishedToastOptions } from "@/components/ui/halo-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  bookingActivityPropsFromPayload,
  endLiveActivity,
  formatBookingToastDateTime,
  localAppointmentTimestamp,
  showLiveActivity,
  type LiveActivityProps,
} from "@/lib/liveActivity";
import { dateStrInTz, getBrowserTimezone } from "@/lib/tz";

export {
  bookingActivityPropsFromPayload,
  formatBookingToastDateTime,
} from "@/lib/liveActivity";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export type BookingToastPayload = {
  eventType: string;
  new: Partial<AppointmentRow> & {
    customer_name?: string | null;
    service_name?: string | null;
  };
  old?: Partial<AppointmentRow> | null;
};

type BookingToastLabels = {
  customerName?: string | null;
  serviceName?: string | null;
};

export function bookingToastFromPayload(
  payload: BookingToastPayload,
  labels: BookingToastLabels = {},
  timezone?: string | null,
): PolishedToastOptions | null {
  const row = payload.new;
  let title: string;
  let rimVariant: NonNullable<PolishedToastOptions["rimVariant"]>;
  let politeness: NonNullable<PolishedToastOptions["politeness"]> = "status";
  let haptic: NonNullable<PolishedToastOptions["haptic"]>;
  let keyPrefix: string;

  if (payload.eventType === "INSERT") {
    title = "New booking";
    rimVariant = "success";
    haptic = "celebrate";
    keyPrefix = "new";
  } else if (
    payload.eventType === "UPDATE" &&
    row.status === "cancelled" &&
    (!payload.old || payload.old.status !== "cancelled")
  ) {
    title = "Booking cancelled";
    rimVariant = "destructive";
    politeness = "alert";
    haptic = "warning";
    keyPrefix = "cancelled";
  } else {
    return null;
  }

  const customerName = labels.customerName?.trim() || row.customer_name?.trim() || "A client";
  const serviceName = labels.serviceName?.trim() || row.service_name?.trim();
  const dateTime = formatBookingToastDateTime(
    row.appointment_date,
    row.appointment_time,
    new Date(),
    timezone,
  );

  return {
    title,
    description: [customerName, serviceName, dateTime].filter(Boolean).join(" · "),
    messageKey: row.id ? `booking-${keyPrefix}-${row.id}` : undefined,
    politeness,
    rimVariant,
    icon: <CalendarCheck className="h-5 w-5" />,
    haptic,
  };
}

async function lookupBookingLabels(appointmentId: string) {
  const { data } = await supabase
    .from("appointments")
    .select("customer:customers(name),service:services(name)")
    .eq("id", appointmentId)
    .maybeSingle();

  return {
    customerName: data?.customer?.name,
    serviceName: data?.service?.name,
  };
}

export function BookingLiveToasts() {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.user_metadata?.role;
  const [nextActivity, setNextActivity] = useState<LiveActivityProps | null>(null);
  const nextActivityRef = useRef<LiveActivityProps | null>(null);

  useEffect(() => {
    nextActivityRef.current = nextActivity;
  }, [nextActivity]);

  useEffect(() => {
    if (!userId || role === "client") {
      nextActivityRef.current = null;
      setNextActivity(null);
      endLiveActivity();
      return;
    }

    let active = true;
    const browserTimezone = getBrowserTimezone();
    const timezonePromise = supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => data?.timezone || browserTimezone, () => browserTimezone);
    const setCurrentNext = (next: LiveActivityProps | null) => {
      nextActivityRef.current = next;
      setNextActivity(next);
    };
    const refreshNextActivity = async (present = true) => {
      const now = new Date();
      const timezone = await timezonePromise;
      const dateKey = dateStrInTz(now, timezone);
      const formatLocalTime = (date: Date) => {
        try {
          const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          }).formatToParts(date);
          const part = (name: string) =>
            parts.find((item) => item.type === name)?.value ?? "00";
          return `${part("hour")}:${part("minute")}:${part("second")}`;
        } catch {
          return [
            String(date.getHours()).padStart(2, "0"),
            String(date.getMinutes()).padStart(2, "0"),
            String(date.getSeconds()).padStart(2, "0"),
          ].join(":");
        }
      };
      const endOfToday =
        localAppointmentTimestamp(dateKey, "23:59:59", timezone) ?? now.getTime();
      const searchUntil = new Date(
        Math.min(now.getTime() + 8 * 60 * 60 * 1000, endOfToday),
      );

      if (searchUntil.getTime() <= now.getTime()) {
        setCurrentNext(null);
        if (present) endLiveActivity();
        return null;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("appointments")
          .select("id, appointment_date, appointment_time, customer:customers(name), service:services(name)")
          .eq("user_id", userId)
          .eq("appointment_date", dateKey)
          .neq("status", "cancelled")
          .gt("appointment_time", formatLocalTime(now))
          .lte("appointment_time", formatLocalTime(searchUntil))
          .order("appointment_time", { ascending: true })
          .limit(1);
        if (error || !active) return nextActivityRef.current;

        const appointment = data?.[0];
        const startsAt = localAppointmentTimestamp(
          appointment?.appointment_date,
          appointment?.appointment_time,
          timezone,
        );
        if (!appointment || startsAt === null || startsAt <= now.getTime()) {
          setCurrentNext(null);
          if (present) endLiveActivity();
          return null;
        }

        const next: LiveActivityProps = {
          kind: "next",
          title: `Next: ${appointment.customer?.name?.trim() || "Client"}`,
          subtitle: appointment.service?.name?.trim() || "Appointment",
          timeLabel: String(appointment.appointment_time).slice(0, 5),
          startsAt,
          countdownFrom: now.getTime(),
        };
        setCurrentNext(next);
        if (present) showLiveActivity(next);
        return next;
      } catch {
        return nextActivityRef.current;
      }
    };

    void refreshNextActivity();
    const channel = supabase
      .channel(`booking-live-toasts:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const change = payload as unknown as BookingToastPayload;
          if (!bookingToastFromPayload(change)) {
            void refreshNextActivity();
            return;
          }

          void (async () => {
            const labels = change.new.id
              ? await lookupBookingLabels(change.new.id)
              : undefined;
            if (!active) return;
            const timezone = await timezonePromise;
            const toastOptions = bookingToastFromPayload(change, labels, timezone);
            const activityProps = bookingActivityPropsFromPayload(
              change,
              labels,
              new Date(),
              timezone,
            );
            const next = await refreshNextActivity(!activityProps);
            if (!active) return;
            if (toastOptions) showPolishedToast(toastOptions);
            if (activityProps) {
              showLiveActivity(activityProps, next ?? undefined);
            }
          })();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
      endLiveActivity();
    };
  }, [role, userId]);

  return null;
}

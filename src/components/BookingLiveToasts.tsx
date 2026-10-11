import { useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import { showPolishedToast, type PolishedToastOptions } from "@/components/ui/halo-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

export function formatBookingToastDateTime(
  appointmentDate?: string | null,
  appointmentTime?: string | null,
  now = new Date(),
) {
  const dateMatch = appointmentDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = appointmentTime?.match(/^(\d{1,2}):(\d{2})/);
  const time = timeMatch
    ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`
    : appointmentTime?.slice(0, 5);
  let dateLabel = appointmentDate?.trim();

  if (dateMatch) {
    const [, yearValue, monthValue, dayValue] = dateMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(year, month - 1, day, 12);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      const dayNumber = (value: Date) =>
        Math.floor(
          Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
            86_400_000,
        );
      const difference = dayNumber(date) - dayNumber(now);

      if (difference === 0) {
        dateLabel = "Today";
      } else if (difference === 1) {
        dateLabel = "Tomorrow";
      } else {
        const parts = new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).formatToParts(date);
        const part = (type: Intl.DateTimeFormatPartTypes) =>
          parts.find((item) => item.type === type)?.value;
        dateLabel = [part("weekday"), part("day"), part("month")]
          .filter(Boolean)
          .join(" ");
      }
    }
  }

  return [dateLabel, time].filter(Boolean).join(" ");
}

export function bookingToastFromPayload(
  payload: BookingToastPayload,
  labels: BookingToastLabels = {},
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
  const dateTime = formatBookingToastDateTime(row.appointment_date, row.appointment_time);

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

  useEffect(() => {
    if (!userId || role === "client") return;

    let active = true;
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
          if (!bookingToastFromPayload(change)) return;

          void (async () => {
            const labels = change.new.id
              ? await lookupBookingLabels(change.new.id)
              : undefined;
            if (!active) return;
            const toastOptions = bookingToastFromPayload(change, labels);
            if (toastOptions) showPolishedToast(toastOptions);
          })();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [role, userId]);

  return null;
}

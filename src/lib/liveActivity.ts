import { dateStrInTz, getBrowserTimezone, zonedDateTime } from "./tz";

export type LiveActivityProps = {
  kind: "next" | "new" | "cancelled";
  title: string;
  subtitle: string;
  timeLabel: string;
  startsAt: number;
  countdownFrom: number;
};

export type BookingActivityPayload = {
  eventType: string;
  new: {
    id?: string | null;
    status?: string | null;
    appointment_date?: string | null;
    appointment_time?: string | null;
    customer_name?: string | null;
    service_name?: string | null;
  };
  old?: { status?: string | null } | null;
};

type BookingActivityLabels = {
  customerName?: string | null;
  serviceName?: string | null;
};

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export function formatBookingToastDateTime(
  appointmentDate?: string | null,
  appointmentTime?: string | null,
  now = new Date(),
  timezone?: string | null,
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
      const currentDateKey = dateStrInTz(now, timezone || getBrowserTimezone());
      const appointmentDateKey = `${yearValue}-${monthValue}-${dayValue}`;
      const [currentYear, currentMonth, currentDay] = currentDateKey
        .split("-")
        .map(Number);
      const tomorrow = new Date(
        Date.UTC(currentYear, currentMonth - 1, currentDay + 1),
      ).toISOString().slice(0, 10);

      if (appointmentDateKey === currentDateKey) {
        dateLabel = "Today";
      } else if (appointmentDateKey === tomorrow) {
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

export function localAppointmentTimestamp(
  appointmentDate?: string | null,
  appointmentTime?: string | null,
  timezone?: string | null,
) {
  const dateMatch = appointmentDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = appointmentTime?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!dateMatch || !timeMatch) return null;

  const [, hourValue, minuteValue, secondValue] = timeMatch;
  const value = zonedDateTime(
    appointmentDate,
    `${hourValue.padStart(2, "0")}:${minuteValue}:${secondValue ?? "00"}`,
    timezone,
  );
  if (!Number.isFinite(value.getTime())) return null;
  return value.getTime();
}

export function bookingActivityPropsFromPayload(
  payload: BookingActivityPayload,
  labels: BookingActivityLabels = {},
  now = new Date(),
  timezone?: string | null,
): LiveActivityProps | null {
  const row = payload.new;
  let kind: LiveActivityProps["kind"];
  let title: string;

  if (payload.eventType === "INSERT") {
    kind = "new";
    title = "New booking";
  } else if (
    payload.eventType === "UPDATE" &&
    row.status === "cancelled" &&
    (!payload.old || payload.old.status !== "cancelled")
  ) {
    kind = "cancelled";
    title = "Booking cancelled";
  } else {
    return null;
  }

  const startsAt = localAppointmentTimestamp(
    row.appointment_date,
    row.appointment_time,
    timezone,
  );
  if (startsAt === null) return null;
  const customerName =
    labels.customerName?.trim() || row.customer_name?.trim() || "A client";
  const serviceName = labels.serviceName?.trim() || row.service_name?.trim();

  return {
    kind,
    title,
    subtitle: [customerName, serviceName].filter(Boolean).join(" · "),
    timeLabel: formatBookingToastDateTime(
      row.appointment_date,
      row.appointment_time,
      now,
      timezone,
    ),
    startsAt,
    countdownFrom: now.getTime(),
  };
}

export function showLiveActivity(
  props: LiveActivityProps,
  revertTo?: LiveActivityProps,
) {
  if (typeof window === "undefined" || !window.ReactNativeWebView) return;
  try {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "cutzio-live-activity", action: "show", props, revertTo }),
    );
  } catch {}
}

export function endLiveActivity() {
  if (typeof window === "undefined" || !window.ReactNativeWebView) return;
  try {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "cutzio-live-activity", action: "end" }),
    );
  } catch {}
}

export type BookingActivityProps = {
  kind: "new" | "cancelled";
  title: string;
  subtitle: string;
  timeLabel: string;
  startsAt: number;
  countdownFrom: number;
};

type Appointment = {
  appointment_date: string;
  appointment_time: string;
  customer_name?: string | null;
  service_name?: string | null;
};

function zonedTimestamp(date: string, time: string, timezone: string) {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!dateMatch || !timeMatch) return null;

  const [, yearValue, monthValue, dayValue] = dateMatch;
  const [, hourValue, minuteValue, secondValue] = timeMatch;
  const target = Date.UTC(
    Number(yearValue),
    Number(monthValue) - 1,
    Number(dayValue),
    Number(hourValue),
    Number(minuteValue),
    Number(secondValue ?? 0),
  );

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    let timestamp = target;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = formatter.formatToParts(new Date(timestamp));
      const part = (name: string) =>
        Number(parts.find((item) => item.type === name)?.value ?? 0);
      const represented = Date.UTC(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour"),
        part("minute"),
        part("second"),
      );
      timestamp += target - represented;
    }
    return timestamp;
  } catch {
    return target;
  }
}

function localDateKey(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function activityTimeLabel(
  appointmentDate: string,
  timestamp: number,
  timezone: string,
  now: number,
) {
  const today = localDateKey(now, timezone);
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  const dateLabel =
    appointmentDate === today
      ? "Today"
      : appointmentDate === tomorrow
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone || "UTC",
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(new Date(timestamp));
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
  return `${dateLabel} ${timeLabel}`;
}

export function buildBookingActivityProps(
  appointment: Appointment,
  kind: BookingActivityProps["kind"],
  timezone = "UTC",
  now = Date.now(),
): BookingActivityProps | null {
  const startsAt = zonedTimestamp(
    appointment.appointment_date,
    appointment.appointment_time,
    timezone,
  );
  if (startsAt === null) return null;
  const timezoneFormatter = (() => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(now));
      return timezone || "UTC";
    } catch {
      return "UTC";
    }
  })();

  const customerName = appointment.customer_name?.trim() || "A client";
  const serviceName = appointment.service_name?.trim() || "Appointment";
  return {
    kind,
    title: kind === "new" ? "New booking" : "Booking cancelled",
    subtitle: `${customerName} · ${serviceName}`,
    timeLabel: activityTimeLabel(
      appointment.appointment_date,
      startsAt,
      timezoneFormatter,
      now,
    ),
    startsAt,
    countdownFrom: now,
  };
}

export function buildLiveActivityStartPayload(
  props: BookingActivityProps,
  title: string,
  body: string,
  now = Date.now(),
) {
  return {
    aps: {
      event: "start",
      timestamp: Math.floor(now / 1000),
      "attributes-type": "LiveActivityAttributes",
      attributes: {},
      "content-state": {
        name: "BookingActivity",
        props: JSON.stringify(props),
      },
      alert: { title, body },
    },
  };
}

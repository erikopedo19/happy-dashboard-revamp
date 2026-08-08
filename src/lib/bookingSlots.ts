import { dateStrInTz, getBrowserTimezone, minutesInTz, timeStrToMinutes } from "@/lib/tz";

export interface BookedSlotLike {
  appointment_time?: string | null;
  service_duration?: number | null;
  service?: { duration?: number | null } | null;
  stylist_id?: string | null;
}

const dateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseTime = (time: string | null | undefined): number => timeStrToMinutes(String(time || "00:00").slice(0, 5));

export const generateBookingTimeSlots = (start: string, end: string, interval: number) => {
  const slots: string[] = [];
  const startMin = parseTime(start);
  const endMin = parseTime(end);
  const step = interval > 0 ? interval : 30;

  for (let minutes = startMin; minutes < endMin; minutes += step) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }

  return slots;
};

export const bookingSlotOverlaps = (
  startTime: string,
  duration: number,
  bookedSlot: BookedSlotLike,
  fallbackDuration: number,
  stylistId?: string | null
) => {
  if (!bookedSlot.appointment_time) return false;

  // A booking without a stylist blocks the whole business. Otherwise, when a
  // stylist is selected, only bookings for that same stylist block the slot.
  if (stylistId && bookedSlot.stylist_id && bookedSlot.stylist_id !== stylistId) return false;

  const start = parseTime(startTime);
  const end = start + Math.max(duration || fallbackDuration || 30, 1);
  const bookedStart = parseTime(bookedSlot.appointment_time);
  const bookedDuration = Math.max(
    bookedSlot.service_duration ?? bookedSlot.service?.duration ?? fallbackDuration ?? 30,
    1
  );
  const bookedEnd = bookedStart + bookedDuration;

  return start < bookedEnd && end > bookedStart;
};

export const getAvailableBookingSlots = ({
  date,
  allSlots,
  startHour,
  endHour,
  interval,
  serviceDuration,
  bookedSlots,
  workingDays,
  timezone,
  stylistId,
  allowPastSlots = false,
  timeOffDates,
}: {
  date: Date;
  allSlots: string[];
  startHour: string;
  endHour: string;
  interval: number;
  serviceDuration: number;
  bookedSlots: BookedSlotLike[];
  workingDays?: number[] | null;
  timezone?: string | null;
  stylistId?: string | null;
  allowPastSlots?: boolean;
  /** Dates (yyyy-MM-dd) the business marked as days off — never bookable. */
  timeOffDates?: string[] | Set<string> | null;
}) => {
  const days = workingDays ?? [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(date.getDay())) return [];

  const tz = timezone || getBrowserTimezone();
  const selectedDate = dateKey(date);

  const offSet = timeOffDates instanceof Set ? timeOffDates : new Set(timeOffDates ?? []);
  if (offSet.has(selectedDate)) return [];

  const today = dateStrInTz(new Date(), tz);
  if (!allowPastSlots && selectedDate < today) return [];

  const nowMinutes = minutesInTz(new Date(), tz);
  const isToday = selectedDate === today;
  const openMin = parseTime(startHour);
  const closeMin = parseTime(endHour);
  const slotDuration = Math.max(serviceDuration || interval || 30, 1);
  const step = Math.max(interval || 30, 1);

  return allSlots.filter((slot) => {
    const slotMin = parseTime(slot);
    if (slotMin < openMin || slotMin + slotDuration > closeMin) return false;
    if ((slotMin - openMin) % step !== 0) return false;
    if (!allowPastSlots && isToday && slotMin <= nowMinutes) return false;
    return !bookedSlots.some((booked) => bookingSlotOverlaps(slot, slotDuration, booked, step, stylistId));
  });
};

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMinutes, format, isBefore } from "date-fns";
import {
  Banknote,
  CalendarDays,
  Clock3,
  History,
  Phone,
  Scissors,
  UserRound,
} from "lucide-react";
import { BottomSheet } from "@/components/arc/bottom-sheet/bottom-sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type SlotSheetAppointment = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  price?: number | null;
  totalDurationMinutes?: number | null;
  customer: { id: string; name: string; phone?: string; email?: string };
  service: { id: string; name: string; duration: number; color?: string };
};

type ClientBooking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  price: number | null;
  service: { name: string } | null;
  stylist: { name: string } | null;
};

const startOf = (apt: Pick<SlotSheetAppointment, "appointment_date" | "appointment_time">) => {
  const [h, m] = String(apt.appointment_time).split(":").map(Number);
  const d = new Date(`${apt.appointment_date}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

function Row({ icon: Icon, label, children }: {
  icon: typeof Clock3;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-gray-500 dark:bg-white/[0.07] dark:text-zinc-400">
        <Icon className="h-4 w-4" />
      </span>
      <span className="w-16 shrink-0 text-[12px] font-medium uppercase tracking-wide text-gray-400 dark:text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-gray-900 dark:text-zinc-100">
        {children}
      </span>
    </div>
  );
}

function BookingLine({ booking }: { booking: ClientBooking }) {
  const cancelled = booking.status === "cancelled";
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-black/[0.03] dark:bg-white/[0.04]">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
          {booking.service?.name || "Appointment"}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-500">
          {format(startOf(booking), "EEE, MMM d")} · {String(booking.appointment_time).slice(0, 5)}
          {booking.stylist?.name ? ` · ${booking.stylist.name}` : ""}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
          cancelled
            ? "bg-black/[0.06] text-gray-500 dark:bg-white/[0.08] dark:text-zinc-400"
            : booking.status === "completed"
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-black/[0.06] text-gray-600 dark:bg-white/[0.08] dark:text-zinc-300",
        )}
      >
        {booking.status}
      </span>
      {booking.price != null && (
        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-gray-700 dark:text-zinc-300">
          ${booking.price}
        </span>
      )}
    </div>
  );
}

export function AppointmentSlotSheet({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: SlotSheetAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const customerId = appointment?.customer?.id;

  const { data: stylistName } = useQuery({
    queryKey: ["appointment-stylist", appointment?.id],
    enabled: open && !!appointment?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("stylist:stylists(name)")
        .eq("id", appointment!.id)
        .maybeSingle();
      return (data?.stylist as { name: string } | null)?.name ?? null;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["appointment-client-history", user?.id, customerId],
    enabled: open && !!user?.id && !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, price, service:services(name), stylist:stylists(name)")
        .eq("user_id", user!.id)
        .eq("customer_id", customerId!)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(30);
      const rows = (data ?? []) as unknown as ClientBooking[];
      const now = new Date();
      return {
        upcoming: rows
          .filter((r) => !isBefore(startOf(r), now) && r.status !== "cancelled")
          .reverse(),
        past: rows.filter((r) => isBefore(startOf(r), now)),
      };
    },
  });

  if (!appointment) return null;

  const start = startOf(appointment);
  const duration = appointment.totalDurationMinutes || appointment.service.duration || 30;
  const end = addMinutes(start, duration);
  const accent = appointment.service.color || "#22c55e";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={appointment.customer.name}
      description={format(start, "EEEE, MMM d, yyyy")}
      detents={[0.42, 0.92]}
      closeLabel="Close"
    >
      {/* Summary — visible at the peek detent */}
      <div className="mb-2 flex items-center justify-between rounded-2xl bg-black/[0.03] px-4 py-3 dark:bg-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <Clock3 className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          <span className="text-[17px] font-bold tabular-nums text-gray-900 dark:text-white">
            {format(start, "HH:mm")} – {format(end, "HH:mm")}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
            appointment.status === "cancelled"
              ? "bg-black/[0.06] text-gray-500 dark:bg-white/[0.08] dark:text-zinc-400"
              : appointment.status === "completed"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-black/[0.06] text-gray-600 dark:bg-white/[0.08] dark:text-zinc-300",
          )}
        >
          {appointment.status}
        </span>
      </div>

      <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
        <Row icon={Scissors} label="Service">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
            {appointment.service.name}
            <span className="font-normal text-gray-400 dark:text-zinc-500">· {duration}m</span>
          </span>
        </Row>
        <Row icon={UserRound} label="Stylist">
          {stylistName ?? "Any stylist"}
        </Row>
        {appointment.price != null && (
          <Row icon={Banknote} label="Price">
            ${appointment.price}
          </Row>
        )}
        {appointment.customer.phone && (
          <Row icon={Phone} label="Phone">
            <a href={`tel:${appointment.customer.phone}`} className="underline-offset-2 hover:underline">
              {appointment.customer.phone}
            </a>
          </Row>
        )}
      </div>

      {/* History — revealed when the sheet is pulled to the tall detent */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          <CalendarDays className="h-3.5 w-3.5" />
          Upcoming bookings
          {history && <span className="text-gray-300 dark:text-zinc-600">({history.upcoming.length})</span>}
        </div>
        <div className="space-y-1.5">
          {!history ? (
            <div className="h-10 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.05]" />
          ) : history.upcoming.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-gray-400 dark:text-zinc-500">No upcoming bookings</p>
          ) : (
            history.upcoming.map((b) => <BookingLine key={b.id} booking={b} />)
          )}
        </div>

        <div className="mb-2 mt-5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
          <History className="h-3.5 w-3.5" />
          Past bookings
          {history && <span className="text-gray-300 dark:text-zinc-600">({history.past.length})</span>}
        </div>
        <div className="space-y-1.5">
          {!history ? (
            <div className="h-10 animate-pulse rounded-xl bg-black/[0.04] dark:bg-white/[0.05]" />
          ) : history.past.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-gray-400 dark:text-zinc-500">No past bookings</p>
          ) : (
            history.past.map((b) => <BookingLine key={b.id} booking={b} />)
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

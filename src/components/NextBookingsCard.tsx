import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { ChevronRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type NextBooking = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  customer: { name: string } | null;
  service: { name: string; duration: number | null } | null;
};

const ease = [0.22, 1, 0.36, 1] as const;

const to12h = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

export function NextBookingsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookings = [] } = useQuery<NextBooking[]>({
    queryKey: ["dashboard-next-bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, customer:customers(name), service:services(name, duration)")
        .eq("user_id", user.id)
        .gte("appointment_date", today)
        .or("status.is.null,status.not.in.(cancelled,completed)")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(12);
      if (error) throw error;
      const now = format(new Date(), "HH:mm");
      return ((data || []) as unknown as NextBooking[])
        .filter((b) => b.appointment_date > today || b.appointment_time.slice(0, 5) >= now)
        .slice(0, 3);
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const [next, ...rest] = bookings;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">Your next booking</h2>
        <button type="button" onClick={() => navigate("/agenda")} className="flex items-center gap-0.5 text-[14px] font-semibold text-[#FF5A6E]">
          Agenda<ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {next ? (
        <motion.button
          type="button"
          onClick={() => navigate("/agenda")}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease }}
          whileTap={{ scale: 0.98 }}
          className="relative flex w-full items-center gap-4 overflow-hidden rounded-[30px] p-5 text-left text-white ring-1 ring-white/10 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
          style={{ background: "linear-gradient(115deg, #2A1530 0%, #3A2238 38%, #2B2420 75%, #1E1A16 100%)" }}
        >
          <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-[#7B3FA0]/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-[#8A6A3A]/25 blur-3xl" />
          <motion.div
            initial={{ opacity: 0, y: 10, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.08 }}
            className="relative flex h-[76px] w-[68px] shrink-0 flex-col items-center justify-center rounded-[20px] bg-white text-[#1C1C1E] shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
          >
            <span className="text-[13px] font-medium leading-none text-[#3A3A3C]">{format(parseISO(next.appointment_date), "MMM")}</span>
            <span className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{format(parseISO(next.appointment_date), "d")}</span>
          </motion.div>
          <div className="relative min-w-0 flex-1">
            <motion.p
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease, delay: 0.12 }}
              className="truncate text-[24px] font-semibold leading-tight tracking-[-0.03em]"
            >
              {next.service?.name || "Appointment"}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease, delay: 0.2 }}
              className="mt-1 truncate text-[14px] text-white/70"
            >
              {next.customer?.name || "Walk-in"} • {to12h(next.appointment_time)}
              {next.service?.duration ? ` • ${next.service.duration} min` : ""}
            </motion.p>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease, delay: 0.28 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85 ring-1 ring-white/15 backdrop-blur-xl"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#30D158]" />
              {next.status === "pending" ? "Awaiting confirmation" : "You are hosting"}
            </motion.span>
          </div>
        </motion.button>
      ) : (
        <div className="flex items-center gap-4 rounded-[30px] bg-white p-5 ring-1 ring-black/[0.06] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
          <div className="flex h-[64px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[11px] font-medium text-[#8E8E93]">{format(new Date(), "MMM")}</span>
            <span className="text-[24px] font-semibold leading-none">{format(new Date(), "d")}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold">No upcoming bookings</p>
            <p className="mt-0.5 text-[13px] text-[#8E8E93]">Share your link to fill your chair.</p>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
          {rest.map((b, i) => (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => navigate("/agenda")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.3 + i * 0.08 }}
              className="flex w-full items-center gap-3 border-b border-black/[0.05] px-4 py-3 text-left last:border-0 dark:border-white/[0.06]"
            >
              <div className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-[12px] bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                <span className="text-[9px] font-semibold uppercase text-[#8E8E93]">{format(parseISO(b.appointment_date), "MMM")}</span>
                <span className="text-[16px] font-semibold leading-none">{format(parseISO(b.appointment_date), "d")}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{b.service?.name || "Appointment"}</p>
                <p className="truncate text-[12.5px] text-[#8E8E93]">{b.customer?.name || "Walk-in"}</p>
              </div>
              <span className="flex items-center gap-1 text-[12.5px] font-medium tabular-nums text-[#8E8E93]">
                <Clock className="h-3.5 w-3.5" />{to12h(b.appointment_time)}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

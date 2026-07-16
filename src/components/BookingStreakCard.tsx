/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, differenceInCalendarDays } from "date-fns";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const db = supabase as any;

export function BookingStreakCard() {
  const { user } = useAuth();

  const { data: dates } = useQuery({
    queryKey: ["booking-streak-days", user?.id],
    queryFn: async () => {
      if (!user) return [] as string[];
      const since = format(subDays(new Date(), 120), "yyyy-MM-dd");
      const { data } = await db
        .from("appointments")
        .select("appointment_date")
        .eq("user_id", user.id)
        .gte("appointment_date", since);
      const set = new Set<string>((data || []).map((r: any) => r.appointment_date));
      return Array.from(set).sort();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { streak, last7 } = useMemo(() => {
    const set = new Set(dates || []);
    const today = new Date();
    // streak: consecutive days ending today (or yesterday if today empty)
    let start = 0;
    if (!set.has(format(today, "yyyy-MM-dd"))) {
      if (set.has(format(subDays(today, 1), "yyyy-MM-dd"))) start = 1;
      else return { streak: 0, last7: buildLast7(set, today) };
    }
    let s = 0;
    for (let i = start; i < 365; i++) {
      const key = format(subDays(today, i), "yyyy-MM-dd");
      if (set.has(key)) s++;
      else break;
    }
    return { streak: s, last7: buildLast7(set, today) };
  }, [dates]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-5 mb-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-orange-500/[0.14] via-white/[0.04] to-transparent p-4 relative overflow-hidden"
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Flame className="h-5 w-5 text-white" fill="white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider">
            Booking streak
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white text-[22px] font-bold font-geist leading-none">
              {streak}
            </span>
            <span className="text-white/60 text-[13px]">
              {streak === 1 ? "day" : "days"} in a row
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-1.5">
        {last7.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-7 w-full rounded-md ${
                d.active
                  ? "bg-gradient-to-b from-orange-400 to-rose-500"
                  : "bg-white/[0.06]"
              }`}
            />
            <span className="text-[10px] text-white/40 font-medium">{d.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function buildLast7(set: Set<string>, today: Date) {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(today, 6 - i);
    const key = format(d, "yyyy-MM-dd");
    return { key, label: format(d, "EEEEE"), active: set.has(key) };
  }).map((d) => ({ ...d, _: differenceInCalendarDays }));
}

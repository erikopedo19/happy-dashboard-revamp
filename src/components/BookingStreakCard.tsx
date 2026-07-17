/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
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

  const { streak, last7, best } = useMemo(() => {
    const set = new Set(dates || []);
    const today = new Date();
    // Current streak (consecutive days ending today or yesterday)
    let start = 0;
    let s = 0;
    if (!set.has(format(today, "yyyy-MM-dd"))) {
      if (set.has(format(subDays(today, 1), "yyyy-MM-dd"))) start = 1;
      else return { streak: 0, last7: buildLast7(set, today), best: bestStreak(set) };
    }
    for (let i = start; i < 365; i++) {
      const key = format(subDays(today, i), "yyyy-MM-dd");
      if (set.has(key)) s++;
      else break;
    }
    return { streak: s, last7: buildLast7(set, today), best: Math.max(s, bestStreak(set)) };
  }, [dates]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#15151A] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Flame className="h-5 w-5 text-white/80" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-white/60 text-[11px] font-medium uppercase tracking-wider">Streak</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white text-xl font-semibold leading-none tabular-nums">{streak}</span>
              <span className="text-white/50 text-xs">{streak === 1 ? "day" : "days"}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">Best</p>
          <p className="text-white/80 text-sm font-medium tabular-nums">{best}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-1">
        {last7.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className={`h-1.5 w-full rounded-full ${d.active ? "bg-white/80" : "bg-white/[0.06]"}`}
            />
            <span className="text-[9px] text-white/40 font-medium tabular-nums">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildLast7(set: Set<string>, today: Date) {
  return Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(today, 6 - i);
    const key = format(d, "yyyy-MM-dd");
    return { key, label: format(d, "EEEEE"), active: set.has(key) };
  });
}

function bestStreak(set: Set<string>): number {
  if (set.size === 0) return 0;
  const arr = Array.from(set).sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < arr.length; i++) {
    const prev = new Date(arr[i - 1]);
    const curD = new Date(arr[i]);
    const diff = Math.round((curD.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

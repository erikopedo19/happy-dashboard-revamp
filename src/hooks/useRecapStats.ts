import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isBefore,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RecapMode = "week" | "month";

type AptRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string | null;
  price: number | null;
  customer_id: string;
  service: { name: string } | null;
  customer: { name: string } | null;
};

export interface RecapStats {
  range: string;
  period: string;
  prev: string;
  bookings: number;
  /** Percent change vs. the previous period; null when there is no baseline. */
  delta: number | null;
  labels: string[];
  bars: number[];
  revenue: number;
  goal: number;
  avgTicket: number;
  returning: number;
  newClients: number;
  topClients: { name: string; count: number }[];
  topClientShare: number;
  services: { name: string; pct: number }[];
  topService: string;
  rating: number | null;
  reviews: number;
  peakDay: string;
  peakTime: string;
  /** 5 rows (9/11/13/15/17h) × 7 days (Mon..Sun), normalised 0..1. */
  heat: number[][];
  completed: number;
  cancelled: number;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HEAT_ROWS = [9, 11, 13, 15, 17];
const live = (a: AptRow) => a.status !== "cancelled";

function ranges(mode: RecapMode, now: Date) {
  if (mode === "week") {
    const end = now;
    const start = subDays(now, 6);
    return {
      start,
      end,
      prevStart: subDays(start, 7),
      prevEnd: subDays(start, 1),
      range: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
      period: "this week",
      prev: "last week",
    };
  }
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const prevMonth = subMonths(start, 1);
  return {
    start,
    end,
    prevStart: startOfMonth(prevMonth),
    prevEnd: endOfMonth(prevMonth),
    range: format(start, "MMMM yyyy"),
    period: "this month",
    prev: format(prevMonth, "MMMM"),
  };
}

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export function useRecapStats(mode: RecapMode) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recap-stats", user?.id, mode, ymd(new Date())],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<RecapStats> => {
      const now = new Date();
      const r = ranges(mode, now);
      const [cur, prev, customers, reviews] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, price, customer_id, service:services(name), customer:customers(name)")
          .eq("user_id", user!.id)
          .gte("appointment_date", ymd(r.start))
          .lte("appointment_date", ymd(r.end)),
        supabase
          .from("appointments")
          .select("id, status")
          .eq("user_id", user!.id)
          .gte("appointment_date", ymd(r.prevStart))
          .lte("appointment_date", ymd(r.prevEnd)),
        supabase
          .from("customers")
          .select("id, created_at")
          .eq("user_id", user!.id)
          .gte("created_at", r.start.toISOString()),
        (supabase as any).rpc("get_reviews_for_business", { _business_id: user!.id }),
      ]);

      const apts = ((cur.data ?? []) as unknown as AptRow[]).filter(live);
      const prevCount = ((prev.data ?? []) as { status: string | null }[]).filter((a) => a.status !== "cancelled").length;
      const bookings = apts.length;
      const delta = prevCount > 0 ? Math.round(((bookings - prevCount) / prevCount) * 100) : null;

      // Bars: one per day for the week, one per ISO-ish week bucket for the month.
      let labels: string[];
      let bars: number[];
      if (mode === "week") {
        const days = Array.from({ length: 7 }, (_, i) => addDays(r.start, i));
        labels = days.map((d) => format(d, "EEE"));
        bars = days.map((d) => apts.filter((a) => a.appointment_date === ymd(d)).length);
      } else {
        const weeks = Math.ceil(differenceInCalendarDays(r.end, r.start) / 7) || 1;
        labels = Array.from({ length: weeks }, (_, i) => `W${i + 1}`);
        bars = Array.from({ length: weeks }, () => 0);
        for (const a of apts) {
          const idx = Math.min(weeks - 1, Math.floor(differenceInCalendarDays(new Date(`${a.appointment_date}T00:00:00`), r.start) / 7));
          bars[idx] += 1;
        }
      }

      const revenue = apts.reduce((s, a) => s + (a.price || 0), 0);
      const completed = apts.filter((a) => a.status === "completed").length;
      const cancelled = ((cur.data ?? []) as unknown as AptRow[]).length - bookings;
      const avgTicket = bookings ? Math.round(revenue / bookings) : 0;
      // A goal that feels reachable: 15% above the better of this/last period, rounded to a clean number.
      const goalBase = Math.max(revenue, 1) * 1.15;
      const mag = Math.pow(10, Math.max(1, Math.floor(Math.log10(goalBase)) - 1));
      const goal = Math.max(mag, Math.ceil(goalBase / mag) * mag);

      // Clients
      const perClient = new Map<string, { name: string; count: number }>();
      for (const a of apts) {
        const e = perClient.get(a.customer_id) ?? { name: a.customer?.name || "Client", count: 0 };
        e.count += 1;
        perClient.set(a.customer_id, e);
      }
      const topClients = [...perClient.values()].sort((a, b) => b.count - a.count).slice(0, 4);
      const returning = [...perClient.values()].filter((c) => c.count > 1).length;
      const newClients = (customers.data ?? []).length;
      const topClientShare = bookings && topClients[0] ? Math.round((topClients[0].count / bookings) * 100) : 0;

      // Services
      const perService = new Map<string, number>();
      for (const a of apts) perService.set(a.service?.name || "Service", (perService.get(a.service?.name || "Service") || 0) + 1);
      const services = [...perService.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, n]) => ({ name, pct: bookings ? Math.round((n / bookings) * 100) : 0 }));
      const topService = services[0]?.name ?? "—";

      // Reviews
      const rv = (reviews.data ?? []) as { rating: number; created_at: string }[];
      const inRange = rv.filter((x) => !isBefore(new Date(x.created_at), r.start));
      const pool = inRange.length ? inRange : rv;
      const rating = pool.length ? Math.round((pool.reduce((s, x) => s + (x.rating || 0), 0) / pool.length) * 10) / 10 : null;

      // Peak day / hour + heatmap
      const byDow = Array(7).fill(0) as number[];
      const byHour = new Map<number, number>();
      const heatRaw = HEAT_ROWS.map(() => Array(7).fill(0) as number[]);
      for (const a of apts) {
        const d = new Date(`${a.appointment_date}T00:00:00`).getDay();
        byDow[d] += 1;
        const h = parseInt(a.appointment_time.split(":")[0] || "0", 10);
        byHour.set(h, (byHour.get(h) || 0) + 1);
        const row = Math.max(0, Math.min(HEAT_ROWS.length - 1, Math.floor((h - 9) / 2)));
        heatRaw[row][(d + 6) % 7] += 1;
      }
      const peakDow = byDow.indexOf(Math.max(...byDow));
      const peakHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const heatMax = Math.max(1, ...heatRaw.flat());
      const heat = heatRaw.map((row) => row.map((v) => v / heatMax));

      return {
        range: r.range,
        period: r.period,
        prev: r.prev,
        bookings,
        delta,
        labels,
        bars,
        revenue,
        goal,
        avgTicket,
        returning,
        newClients,
        topClients,
        topClientShare,
        services,
        topService,
        rating,
        reviews: pool.length,
        peakDay: bookings ? DAY_NAMES[peakDow] : "—",
        peakTime: peakHour != null ? `${String(peakHour).padStart(2, "0")}:00` : "—",
        heat,
        completed,
        cancelled,
      };
    },
  });
}

export const HEAT_DAYS = DOW;
export const HEAT_HOURS = HEAT_ROWS.map(String);

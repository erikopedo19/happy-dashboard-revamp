import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock3, Loader2, TrendingUp, Wallet } from "lucide-react";

type Row = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number | null;
  status: string;
  service: { name: string | null; duration: number | null } | null;
  customer: { name: string | null } | null;
};

const OPEN_STATUSES = ["scheduled", "confirmed", "pending"];

const endOf = (r: Row) => {
  const start = new Date(`${r.appointment_date}T${(r.appointment_time || "00:00").slice(0, 5)}:00`);
  return new Date(start.getTime() + (r.service?.duration ?? 30) * 60000);
};

const money = (n: number, c = "€") => `${c}${n.toFixed(2)}`;

/**
 * Revenue pipeline: an appointment only counts as revenue once it has actually
 * ended. Upcoming -> (auto-completed when the end time passes) -> Revenue.
 * Used on Reports and on the payments/payout page.
 */
export function RevenuePipelineCard({
  className,
  currency = "€",
  compact = false,
}: {
  className?: string;
  currency?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const to = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: rows = [], isLoading, refetch } = useQuery<Row[]>({
    queryKey: ["revenue-pipeline", user?.id, from, to],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select(
          "id, appointment_date, appointment_time, price, status, service:services(name, duration), customer:customers(name)"
        )
        .eq("user_id", user!.id)
        .gte("appointment_date", from)
        .lte("appointment_date", to)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  // Auto-complete: anything still open whose end time has passed becomes completed.
  useEffect(() => {
    if (!user || !rows.length) return;
    const due = rows.filter(
      (r) => OPEN_STATUSES.includes(r.status) && endOf(r).getTime() <= now
    );
    if (!due.length) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      await (supabase as any)
        .from("appointments")
        .update({ status: "completed" })
        .in("id", due.map((d) => d.id));
      if (cancelled) return;
      setSyncing(false);
      refetch();
      qc.invalidateQueries({ queryKey: ["reports-analytics"] });
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, now, user, refetch, qc]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
    const upcoming = active.filter(
      (r) => OPEN_STATUSES.includes(r.status) && endOf(r).getTime() > now
    );
    const earned = active.filter(
      (r) => r.status === "completed" || endOf(r).getTime() <= now
    );
    const sum = (list: Row[]) => list.reduce((s, r) => s + (r.price || 0), 0);
    return {
      upcoming,
      earned,
      pendingValue: sum(upcoming),
      earnedValue: sum(earned),
      recent: earned.slice(0, compact ? 3 : 5),
    };
  }, [rows, now, compact]);

  const total = stats.pendingValue + stats.earnedValue;
  const earnedPct = total > 0 ? Math.round((stats.earnedValue / total) * 100) : 0;

  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/10 bg-[#141418] p-5 text-white overflow-hidden",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">Revenue pipeline</p>
          <div className="flex items-baseline gap-1 mt-1">
            <motion.span
              key={stats.earnedValue}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="text-[34px] font-bold leading-none tracking-tight"
            >
              {money(stats.earnedValue, currency)}
            </motion.span>
          </div>
          <p className="text-xs text-white/40 mt-1.5">Counted only after appointments end</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {isLoading || syncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/60" />
          ) : (
            <Wallet className="h-4 w-4 text-white/60" />
          )}
        </div>
      </div>

      {/* Progress rail */}
      <div className="mt-5 h-2 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${earnedPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3">
          <div className="flex items-center gap-1.5 text-white/50 text-[11px]">
            <Clock3 className="h-3.5 w-3.5" /> Upcoming
          </div>
          <p className="mt-1.5 text-lg font-semibold">{money(stats.pendingValue, currency)}</p>
          <p className="text-[11px] text-white/35">{stats.upcoming.length} appointments</p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-3">
          <div className="flex items-center gap-1.5 text-emerald-400/80 text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Earned
          </div>
          <p className="mt-1.5 text-lg font-semibold">{money(stats.earnedValue, currency)}</p>
          <p className="text-[11px] text-white/35">{stats.earned.length} completed</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/35 mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Moved to revenue
          </div>
          <AnimatePresence initial={false}>
            {stats.recent.length === 0 ? (
              <p className="text-xs text-white/35 py-3">No completed appointments yet.</p>
            ) : (
              stats.recent.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 30 }}
                  className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.customer?.name || "Walk-in"}
                    </p>
                    <p className="text-[11px] text-white/35 truncate">
                      {r.service?.name || "Service"} · {r.appointment_date}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400 shrink-0">
                    +{money(r.price || 0, currency)}
                  </span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default RevenuePipelineCard;

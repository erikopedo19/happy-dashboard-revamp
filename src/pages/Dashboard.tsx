/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, startOfWeek, addDays, isSameDay, subDays, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

const db = supabase as any;

const Dashboard = () => {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#0b0b0d] overflow-hidden font-['Manrope']">
        <AppSidebar />
        <main className="relative flex-1 bg-[#0b0b0d] text-white flex flex-col overflow-hidden">
          {/* Liquid-glass ambient blobs — slowly drift behind translucent cards */}
          <motion.div
            aria-hidden
            animate={{ x: [0, 60, -20, 0], y: [0, 40, -10, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-indigo-500/30 blur-[120px] z-0"
          />
          <motion.div
            aria-hidden
            animate={{ x: [0, -40, 30, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute top-1/4 -right-24 h-[24rem] w-[24rem] rounded-full bg-cyan-400/25 blur-[120px] z-0"
          />
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute bottom-10 left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/25 blur-[120px] z-0"
          />
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 h-[18rem] w-[18rem] rounded-full bg-rose-500/20 blur-[100px] z-0"
          />

          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            {isMobile ? <MobileDashboard /> : <DashboardContent />}
            {isMobile && <MobileDock />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["dashboard-appointments-mobile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await db
        .from("appointments")
        .select("*, customer:customers(name, email), service:services(name, price)")
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!user,
  });

  const todays = appointments
    .filter((a) => isToday(parseISO(a.appointment_date)) && a.status !== "cancelled")
    .sort((a, b) => (a.appointment_time || "").localeCompare(b.appointment_time || ""));
  const pending = appointments.filter((a) => a.status === "scheduled").length;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekRevenue = Array.from({ length: 7 }).reduce<number>((sum, _, i) => {
    const d = addDays(weekStart, i);
    return (
      sum +
      appointments
        .filter((a) => isSameDay(parseISO(a.appointment_date), d))
        .reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0)
    );
  }, 0);

  const spark = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      const rev = appointments
        .filter((a) => isSameDay(parseISO(a.appointment_date), d))
        .reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
      return { day: format(d, "d"), rev };
    });
  }, [appointments]);

  const last30 = appointments.filter((a) => isAfter(parseISO(a.appointment_date), subDays(new Date(), 30)));
  const prev30 = appointments.filter((a) => {
    const d = parseISO(a.appointment_date);
    return isAfter(d, subDays(new Date(), 60)) && !isAfter(d, subDays(new Date(), 30));
  });
  const completed = last30.filter((a) => a.status === "completed").length;
  const cancelled = last30.filter((a) => a.status === "cancelled").length;
  const scheduled = last30.filter((a) => a.status === "scheduled").length;
  const completionRate = last30.length ? Math.round((completed / last30.length) * 100) : 0;
  const last30Revenue = last30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
  const prev30Revenue = prev30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
  const revenueDelta = prev30Revenue > 0 ? Math.round(((last30Revenue - prev30Revenue) / prev30Revenue) * 100) : 0;
  const avgTicket = last30.length
    ? Math.round(last30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0) / last30.length)
    : 0;

  // Top services by revenue (last 30d)
  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    last30.forEach((a) => {
      const name = a.service?.name || "Other";
      const rev = Number(a.price || a.service?.price || 0);
      const prev = map.get(name) || { name, revenue: 0, count: 0 };
      map.set(name, { name, revenue: prev.revenue + rev, count: prev.count + 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [last30]);
  const topServiceMax = topServices[0]?.revenue || 1;

  // Hourly demand (last 30d)
  const hourly = useMemo(() => {
    const buckets: { h: number; count: number }[] = Array.from({ length: 12 }).map((_, i) => ({ h: i + 8, count: 0 }));
    last30.forEach((a) => {
      const t = (a.appointment_time || "").slice(0, 2);
      const h = parseInt(t, 10);
      const idx = buckets.findIndex((b) => b.h === h);
      if (idx >= 0) buckets[idx].count += 1;
    });
    return buckets;
  }, [last30]);
  const peakHour = hourly.reduce((m, b) => (b.count > m.count ? b : m), hourly[0]);

  // Status mix
  const statusMix = [
    { name: "Done", value: completed, color: "#22c55e" },
    { name: "Upcoming", value: scheduled, color: "#3b82f6" },
    { name: "Cancelled", value: cancelled, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  const weekDays = Array.from({ length: 5 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const dayCount = appointments.filter((a) => isSameDay(parseISO(a.appointment_date), d) && a.status !== "cancelled").length;
    return {
      label: format(d, "EEE").toUpperCase(),
      date: format(d, "d"),
      isToday: isSameDay(d, new Date()),
      iso: format(d, "yyyy-MM-dd"),
      count: dayCount,
    };
  });

  const statusChipFor = (a: any) => {
    if (a.status === "completed") return { label: "Done", cls: "bg-white/5 text-white/45" };
    if (a.status === "in_progress") return { label: "Active", cls: "bg-[#3b82f6]/15 text-[#60a5fa]" };
    if (a.status === "scheduled") return { label: "New", cls: "bg-white/10 text-white" };
    return { label: "Later", cls: "bg-white/5 text-white/40" };
  };

  const numClass = "font-['Sora'] tabular-nums tracking-tight";

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-6 pt-6 pb-6 flex justify-between items-end"
      >
        <div className="space-y-1">
          <p className="text-white/40 text-[13px] font-medium">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-2xl font-bold font-['Sora'] text-white tracking-tight">
            Cutzio Admin
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <SidebarTrigger className="h-10 w-10 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 text-white/70 hover:bg-[#1a1a1e]" />
          <div className="w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/10 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0A84FF] to-[#5ac8fa]" />
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="relative overflow-hidden rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-[0.18em] font-semibold">This Week</p>
              <p className={`${numClass} text-[34px] font-bold text-white mt-1 leading-none`}>
                €{weekRevenue.toFixed(0)}
              </p>
              <p className="text-white/45 text-xs mt-2">{last30.length} bookings · last 30d</p>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-[#3b82f6]/15 text-[#60a5fa] text-[10px] font-bold uppercase tracking-wider">
              Live
            </div>
          </div>
          <div className="h-20 -mx-1 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: "#141417", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number) => [`€${v}`, "Revenue"]}
                  labelFormatter={(l) => `Day ${l}`}
                />
                <Area type="monotone" dataKey="rev" stroke="#60a5fa" strokeWidth={2} fill="url(#mobRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 26 }}
          className="grid grid-cols-3 gap-3"
        >
          <KPI label="Pending" value={pending} accent="text-white" numClass={numClass} />
          <KPI label="Avg Ticket" value={`€${avgTicket}`} accent="text-white" numClass={numClass} />
          <KPI label="Complete" value={`${completionRate}%`} accent="text-[#60a5fa]" numClass={numClass} />
        </motion.div>

        {/* iOS Concentric Targets Activity Rings Widget - Mobile */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07, type: "spring", stiffness: 260, damping: 26 }}
          className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-5 flex items-center justify-between gap-5"
        >
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Outer: Revenue */}
              <circle cx="60" cy="60" r="50" stroke="rgba(225,29,72,0.1)" strokeWidth="10" fill="transparent" />
              <motion.circle
                cx="60" cy="60" r="50"
                stroke="#e11d48" strokeWidth="10" fill="transparent"
                strokeDasharray={2 * Math.PI * 50}
                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - (Math.min(100, Math.round((weekRevenue / 5 / 500) * 100)) || 45) / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
              {/* Middle: Capacity */}
              <circle cx="60" cy="60" r="39" stroke="rgba(59,130,246,0.1)" strokeWidth="10" fill="transparent" />
              <motion.circle
                cx="60" cy="60" r="39"
                stroke="#3b82f6" strokeWidth="10" fill="transparent"
                strokeDasharray={2 * Math.PI * 39}
                initial={{ strokeDashoffset: 2 * Math.PI * 39 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 39 * (1 - (Math.min(100, Math.round((todays.length / 12) * 100)) || 35) / 100) }}
                transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }}
                strokeLinecap="round"
              />
              {/* Inner: Completion */}
              <circle cx="60" cy="60" r="28" stroke="rgba(34,197,94,0.1)" strokeWidth="10" fill="transparent" />
              <motion.circle
                cx="60" cy="60" r="28"
                stroke="#22c55e" strokeWidth="10" fill="transparent"
                strokeDasharray={2 * Math.PI * 28}
                initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - (completionRate || 0) / 100) }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white/50" />
            </div>
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Daily Activity</p>
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#e11d48]" /> Rev Target</span>
              <span className="tabular-nums font-['Sora']">{Math.min(100, Math.round((weekRevenue / 5 / 500) * 100)) || 45}%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" /> Capacity</span>
              <span className="tabular-nums font-['Sora']">{Math.min(100, Math.round((todays.length / 12) * 100)) || 35}%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Completed</span>
              <span className="tabular-nums font-['Sora']">{completionRate}%</span>
            </div>
          </div>
        </motion.section>

        {/* 30-day Revenue card with trend delta */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 260, damping: 26 }}
          className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-[0.18em] font-semibold">30-Day Revenue</p>
              <p className={`${numClass} text-[28px] font-bold text-white mt-1 leading-none`}>
                €{last30Revenue.toFixed(0)}
              </p>
            </div>
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                revenueDelta >= 0 ? "bg-[#22c55e]/15 text-[#4ade80]" : "bg-[#ef4444]/15 text-[#f87171]"
              }`}
            >
              {revenueDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(revenueDelta)}%
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`${numClass} text-base font-bold text-white`}>{completed}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Done</p>
            </div>
            <div className="border-x border-white/5">
              <p className={`${numClass} text-base font-bold text-[#60a5fa]`}>{scheduled}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Upcoming</p>
            </div>
            <div>
              <p className={`${numClass} text-base font-bold text-[#f87171]`}>{cancelled}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Cancelled</p>
            </div>
          </div>
        </motion.section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-['Sora'] text-[15px] font-semibold text-white">Week Schedule</h3>
            <button
              onClick={() => navigate("/agenda")}
              className="text-white/60 text-xs font-bold uppercase tracking-wider active:opacity-60 hover:text-white transition"
            >
              Full View
            </button>
          </div>
          <div className="flex justify-between">
            {weekDays.map((d, i) => (
              <motion.button
                key={d.iso}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => navigate("/agenda")}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[10px] text-white/40 font-bold">{d.label}</span>
                <div
                  className={
                    d.isToday
                      ? `w-10 h-10 rounded-2xl bg-white text-[#0b0b0d] flex items-center justify-center text-sm font-bold shadow-lg shadow-white/10 ${numClass}`
                      : `w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/70 text-sm font-bold ${numClass}`
                  }
                >
                  {d.date}
                </div>
                <span className={`text-[10px] font-bold ${numClass} ${d.count > 0 ? "text-white/70" : "text-white/20"}`}>
                  {d.count}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Top services */}
        {topServices.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="font-['Sora'] text-[15px] font-semibold text-white">Top Services</h3>
            <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-4 space-y-3">
              {topServices.map((s, i) => (
                <div key={s.name} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[13px] text-white/85 font-medium truncate">{s.name}</span>
                    <span className={`text-[12px] text-white/60 ${numClass}`}>€{s.revenue.toFixed(0)} · {s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.revenue / topServiceMax) * 100}%` }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#60a5fa] to-[#3b82f6]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Hourly demand + Status mix */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-5 gap-3"
        >
          <div className="col-span-3 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Hourly Demand</p>
                <p className={`${numClass} text-white text-sm font-bold mt-0.5 flex items-center gap-1`}>
                  <Clock className="h-3 w-3 text-white/40" /> Peak {peakHour?.h ?? "—"}:00
                </p>
              </div>
            </div>
            <div className="h-20 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <Tooltip
                    contentStyle={{ background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 11 }}
                    formatter={(v: number) => [`${v} bookings`, "Count"]}
                    labelFormatter={(l) => `${l}:00`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {hourly.map((b, idx) => (
                      <Cell key={idx} fill={b.h === peakHour?.h ? "#60a5fa" : "rgba(255,255,255,0.18)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-2 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Status Mix</p>
            {statusMix.length > 0 ? (
              <div className="h-24 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" innerRadius={22} outerRadius={36} paddingAngle={2}>
                      {statusMix.map((s) => (
                        <Cell key={s.name} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-white/30 text-xs mt-3">No data</p>
            )}
          </div>
        </motion.section>


        <section className="space-y-4">
          <h3 className="font-['Sora'] text-[15px] font-semibold text-white">Today's Appointments</h3>
          {todays.length === 0 ? (
            <div className="bg-white/[0.04] backdrop-blur-2xl p-6 rounded-3xl border border-white/10 text-center text-sm text-white/40">
              Nothing scheduled today.
            </div>
          ) : (
            <div className="space-y-3">
              {todays.slice(0, 6).map((a, i) => {
                const chip = statusChipFor(a);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 360, damping: 26 }}
                    onClick={() => navigate("/agenda")}
                    className="bg-white/[0.04] backdrop-blur-2xl p-4 rounded-3xl border border-white/10 flex items-center gap-4 cursor-pointer active:scale-[0.99] hover:border-white/10 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-[#0b0b0d] flex items-center justify-center border border-white/5 text-[11px] font-bold text-white/85 ${numClass}`}>
                      {(a.appointment_time || "").slice(0, 5) || "--:--"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-[14px] truncate">
                        {a.customer?.name || "Walk-in"}
                      </h4>
                      <p className="text-white/40 text-xs truncate">
                        {a.service?.name || "Service"}
                      </p>
                    </div>
                    <div className={`${chip.cls} px-3 py-1 rounded-full`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{chip.label}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pb-10">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/agenda")}
              className="h-14 bg-white text-[#0b0b0d] rounded-3xl font-['Sora'] font-bold text-[13px] shadow-lg shadow-white/5"
            >
              New Booking
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/services")}
              className="h-14 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl font-['Sora'] font-bold text-white text-[13px]"
            >
              Edit Services
            </motion.button>
          </div>
        </section>
      </div>
    </>
  );
}

function KPI({ label, value, accent, numClass }: { label: string; value: string | number; accent: string; numClass: string }) {
  const isPendingActive = label === "Pending" && Number(value) > 0;

  return (
    <motion.div
      animate={
        isPendingActive
          ? {
              borderColor: [
                "rgba(244,63,94,0.1)",
                "rgba(244,63,94,0.45)",
                "rgba(244,63,94,0.1)",
              ],
              boxShadow: [
                "0 0 0 rgba(244,63,94,0)",
                "0 0 16px rgba(244,63,94,0.15)",
                "0 0 0 rgba(244,63,94,0)",
              ],
            }
          : {}
      }
      transition={{
        repeat: Infinity,
        duration: 2.2,
        ease: "easeInOut",
      }}
      className={`bg-[#141417] p-3.5 rounded-2xl border transition-all ${
        isPendingActive ? "border-rose-500/25" : "border-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">{label}</p>
        {isPendingActive && (
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
          </span>
        )}
      </div>
      <p className={`${numClass} text-lg font-bold ${isPendingActive ? "text-rose-400" : accent}`}>{value}</p>
    </motion.div>
  );
}

export default Dashboard;

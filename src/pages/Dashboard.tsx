/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { MobileDashboardIOS } from "@/components/MobileDashboardIOS";
import { ReviewAnnouncement } from "@/components/ReviewAnnouncement";
import { PWAInstallDrawer } from "@/components/PWAInstallDrawer";
import { UpgradeDrawer } from "@/components/UpgradeDrawer";
import { NotificationBell } from "@/components/NotificationBell";

import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, startOfWeek, addDays, isSameDay, subDays, isAfter } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useMemo, lazy, Suspense } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const FirstLoginOnboarding = lazy(() =>
  import("@/components/FirstLoginOnboarding").then((module) => ({ default: module.FirstLoginOnboarding }))
);

const db = supabase as any;

const Dashboard = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.user_metadata?.role === "client") {
      navigate("/find-barber", { replace: true });
    }
  }, [user, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await db
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: agendaSettings } = useQuery({
    queryKey: ["agenda-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await db
        .from("agenda_settings")
        .select("start_hour, end_hour")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const showOnboarding = !!user && !profileLoading && profile?.onboarding_completed !== true;

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#0A0A0C] overflow-hidden font-geist">
        <AppSidebar />
        <main className="relative flex-1 bg-[#0A0A0C] text-white flex flex-col overflow-hidden">
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            {showOnboarding ? (
              <Suspense fallback={<div className="flex-1 bg-[#0A0A0C]" />}>
                <FirstLoginOnboarding onComplete={() => {}} />
              </Suspense>
            ) : isMobile ? (
              <MobileDashboardIOS />
            ) : (
              <DashboardContent />
            )}
          </div>
          <PWAInstallDrawer />
          <UpgradeDrawer />
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

  // Today's real revenue (non-cancelled)
  const todayRevenue = todays.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);

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
    if (a.status === "in_progress") return { label: "Active", cls: "bg-[#0A84FF]/15 text-[#60a5fa]" };
    if (a.status === "scheduled") return { label: "New", cls: "bg-white/10 text-white" };
    return { label: "Later", cls: "bg-white/5 text-white/40" };
  };

  const numClass = "font-geist tabular-nums tracking-tight";
  const profileInitial = (user?.email || "C").charAt(0).toUpperCase();

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-5 pt-7 pb-5 flex justify-between items-center"
      >
        <div className="space-y-1">
          <p className="text-white/40 text-[13px] font-medium">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-[26px] font-bold font-geist text-white tracking-tight leading-none">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white text-sm font-bold">
            {(profileInitial || "C")}
          </div>
        </div>
      </motion.header>



      <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-32">
        <ReviewAnnouncement />

        {/* Today hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="relative overflow-hidden rounded-[28px] bg-[#16161A] border border-white/[0.06] p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/45 text-[13px] font-medium">Today's revenue</p>
              <p className={`${numClass} text-[40px] font-bold text-white mt-1 leading-none`}>
                €{todayRevenue.toFixed(0)}
              </p>
              <p className="text-white/40 text-[13px] mt-2">
                {todays.length} {todays.length === 1 ? "appointment" : "appointments"} today
              </p>
            </div>
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                revenueDelta >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {revenueDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(revenueDelta)}%
            </div>
          </div>
          <div className="h-16 -mx-2 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <Tooltip
                  contentStyle={{ background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 11 }}
                  formatter={(v: number) => [`€${v}`, "Revenue"]}
                  labelFormatter={(l) => `Day ${l}`}
                />
                <Area type="monotone" dataKey="rev" stroke="#f43f5e" strokeWidth={2.5} fill="rgba(244,63,94,0.10)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* Real stat tiles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 26 }}
          className="grid grid-cols-3 gap-3"
        >
          <KPI label="Pending" value={pending} accent="text-white" numClass={numClass} />
          <KPI label="Avg ticket" value={`€${avgTicket}`} accent="text-white" numClass={numClass} />
          <KPI label="Complete" value={`${completionRate}%`} accent="text-white" numClass={numClass} />
        </motion.div>

        {/* 30-day summary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 260, damping: 26 }}
          className="rounded-[28px] bg-[#16161A] border border-white/[0.06] p-6"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-white/45 text-[13px] font-medium">Last 30 days</p>
            <p className={`${numClass} text-[15px] font-semibold text-white`}>€{last30Revenue.toFixed(0)}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`${numClass} text-xl font-bold text-white`}>{completed}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Done</p>
            </div>
            <div className="border-x border-white/5">
              <p className={`${numClass} text-xl font-bold text-[#60a5fa]`}>{scheduled}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Upcoming</p>
            </div>
            <div>
              <p className={`${numClass} text-xl font-bold text-[#f87171]`}>{cancelled}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Cancelled</p>
            </div>
          </div>
        </motion.section>

        {/* Week strip */}
        <section className="rounded-[28px] bg-[#16161A] border border-white/[0.06] p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-geist text-[15px] font-semibold text-white">This week</h3>
            <button
              onClick={() => navigate("/agenda")}
              className="text-white/45 text-[13px] font-medium active:opacity-60 hover:text-white transition"
            >
              View
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
                <span className="text-[11px] text-white/35 font-semibold">{d.label}</span>
                <div
                  className={
                    d.isToday
                      ? `w-11 h-11 rounded-2xl bg-white text-[#0b0b0d] flex items-center justify-center text-[15px] font-bold ${numClass}`
                      : `w-11 h-11 rounded-2xl bg-white/[0.05] flex items-center justify-center text-white/70 text-[15px] font-bold ${numClass}`
                  }
                >
                  {d.date}
                </div>
                <span className={`text-[11px] font-semibold ${numClass} ${d.count > 0 ? "text-white/60" : "text-white/20"}`}>
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
            className="rounded-[28px] bg-[#16161A] border border-white/[0.06] p-5 space-y-3.5"
          >
            <h3 className="font-geist text-[15px] font-semibold text-white">Top services</h3>
            {topServices.map((s, i) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-white/85 font-medium truncate">{s.name}</span>
                  <span className={`text-[12px] text-white/45 ${numClass}`}>€{s.revenue.toFixed(0)} · {s.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.revenue / topServiceMax) * 100}%` }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-rose-500"
                  />
                </div>
              </div>
            ))}
          </motion.section>
        )}

        {/* Today's appointments */}
        <section className="space-y-3">
          <h3 className="font-geist text-[15px] font-semibold text-white px-1">Today's appointments</h3>
          {todays.length === 0 ? (
            <div className="bg-[#16161A] p-8 rounded-[28px] border border-white/[0.06] text-center text-sm text-white/40">
              Nothing scheduled today.
            </div>
          ) : (
            <div className="rounded-[28px] bg-[#16161A] border border-white/[0.06] divide-y divide-white/5 overflow-hidden">
              {todays.slice(0, 6).map((a, i) => {
                const chip = statusChipFor(a);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 360, damping: 26 }}
                    onClick={() => navigate("/agenda")}
                    className="p-4 flex items-center gap-4 cursor-pointer active:bg-white/[0.03] transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center text-[11px] font-bold text-white/85 ${numClass}`}>
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

        {/* Quick actions */}
        <section className="pb-10">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/agenda")}
              className="h-14 bg-white text-[#0b0b0d] rounded-[20px] font-geist font-bold text-[14px]"
            >
              New booking
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/services")}
              className="h-14 bg-white/[0.05] border border-white/[0.08] rounded-[20px] font-geist font-bold text-white text-[14px]"
            >
              Edit services
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
      className={`bg-[#15151A] p-3.5 rounded-2xl border transition-all ${
        isPendingActive ? "border-rose-500/25" : "border-white/10"
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

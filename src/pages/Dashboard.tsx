/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, startOfWeek, addDays, isSameDay, subDays, isAfter, getHours } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Clock, Users, CheckCircle2, XCircle } from "lucide-react";

const db = supabase as any;

const Dashboard = () => {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#0a0203] overflow-hidden font-['Manrope']">
        <AppSidebar />
        <main className="flex-1 bg-[#0a0203] text-white flex flex-col overflow-hidden">
          {isMobile ? <MobileDashboard /> : <DashboardContent />}
          {isMobile && <MobileDock />}
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
  const completed = last30.filter((a) => a.status === "completed").length;
  const completionRate = last30.length ? Math.round((completed / last30.length) * 100) : 0;
  const avgTicket = last30.length
    ? Math.round(last30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0) / last30.length)
    : 0;

  const weekDays = Array.from({ length: 5 }).map((_, i) => {
    const d = addDays(weekStart, i);
    return {
      label: format(d, "EEE").toUpperCase(),
      date: format(d, "d"),
      isToday: isSameDay(d, new Date()),
      iso: format(d, "yyyy-MM-dd"),
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
          <SidebarTrigger className="h-10 w-10 rounded-full bg-[#1a0509] border border-white/5 text-white/70 hover:bg-[#1f0710]" />
          <div className="w-10 h-10 rounded-full bg-[#1a0509] border border-white/5 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#e11d48] to-[#f43f5e]" />
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0509] via-[#170410] to-[#0a0a1f] border border-white/[0.04] p-5"
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
                  contentStyle={{ background: "#1a0509", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, fontSize: 11 }}
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
                      ? `w-10 h-10 rounded-2xl bg-white text-[#0a0203] flex items-center justify-center text-sm font-bold shadow-lg shadow-white/10 ${numClass}`
                      : `w-10 h-10 rounded-2xl bg-[#1a0509] border border-white/5 flex items-center justify-center text-white/70 text-sm font-bold ${numClass}`
                  }
                >
                  {d.date}
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-['Sora'] text-[15px] font-semibold text-white">Today's Appointments</h3>
          {todays.length === 0 ? (
            <div className="bg-[#1a0509] p-6 rounded-3xl border border-white/[0.03] text-center text-sm text-white/40">
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
                    className="bg-[#1a0509] p-4 rounded-3xl border border-white/[0.03] flex items-center gap-4 cursor-pointer active:scale-[0.99] hover:border-white/10 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-[#0a0203] flex items-center justify-center border border-white/5 text-[11px] font-bold text-white/85 ${numClass}`}>
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
              className="h-14 bg-white text-[#0a0203] rounded-3xl font-['Sora'] font-bold text-[13px] shadow-lg shadow-white/5"
            >
              New Booking
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/services")}
              className="h-14 bg-[#1a0509] border border-white/5 rounded-3xl font-['Sora'] font-bold text-white text-[13px]"
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
  return (
    <div className="bg-[#1a0509] p-3.5 rounded-2xl border border-white/[0.04]">
      <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold mb-1.5">{label}</p>
      <p className={`${numClass} text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}

export default Dashboard;

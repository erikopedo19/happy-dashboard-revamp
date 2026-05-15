/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { MobileDock } from "@/components/MobileDock";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, startOfWeek, addDays, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, DollarSign, Clock, Users, ChevronRight, TrendingUp, Plus, Scissors, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const db = supabase as any;

const Dashboard = () => {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-white dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />
        <main className="flex-1 bg-[#F2F2F7] dark:bg-[#1C1C1E] flex flex-col overflow-hidden">
          {isMobile ? (
            <MobileDashboard />
          ) : (
            <>
              <DashboardContent />
              <MobileDock />
            </>
          )}
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
        .limit(300);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["dashboard-customers-mobile", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await db.from("customers").select("id").eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const todays = appointments.filter((a) => isToday(parseISO(a.appointment_date)));
  const todayRevenue = todays.reduce(
    (s, a) => s + Number(a.price || a.service?.price || 0),
    0
  );
  const pending = appointments.filter((a) => a.status === "scheduled").length;

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = appointments
    .filter((a) => a.appointment_date >= today && a.status !== "cancelled")
    .sort((a, b) =>
      (a.appointment_date + a.appointment_time).localeCompare(
        b.appointment_date + b.appointment_time
      )
    )
    .slice(0, 4);

  // 7-day revenue trend
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const trend = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(weekStart, i);
    const dayAppts = appointments.filter((a) => isSameDay(parseISO(a.appointment_date), d));
    const revenue = dayAppts.reduce(
      (s, a) => s + Number(a.price || a.service?.price || 0),
      0
    );
    return { day: format(d, "EEE"), revenue };
  });
  const weekRevenue = trend.reduce((s, t) => s + t.revenue, 0);

  const stats = [
    {
      label: "Today",
      value: todays.length.toString(),
      icon: Calendar,
      bg: "bg-[#e11d48]/10",
      color: "text-[#e11d48]",
    },
    {
      label: "Pending",
      value: pending.toString(),
      icon: Clock,
      bg: "bg-[#fb7185]/10",
      color: "text-[#fb7185]",
    },
    {
      label: "Clients",
      value: customers.length.toString(),
      icon: Users,
      bg: "bg-[#34C759]/10",
      color: "text-[#34C759]",
    },
  ];

  const quickActions = [
    { label: "New booking", icon: Plus, path: "/agenda" },
    { label: "Services", icon: Scissors, path: "/services" },
    { label: "Reports", icon: BarChart3, path: "/reports" },
    { label: "Clients", icon: Users, path: "/customers" },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#F2F2F7]/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8E8E93] uppercase tracking-wide font-semibold">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-[28px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight">
            Dashboard
          </h1>
        </div>
        <SidebarTrigger className="hover:bg-white/60 dark:hover:bg-[#2C2C2E] transition-colors text-[#1C1C1E] dark:text-[#F2F2F7] rounded-xl" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-32 space-y-5">
        {/* Hero revenue card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="rounded-3xl bg-white dark:bg-[#2C2C2E] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[11px] uppercase tracking-wide font-semibold text-[#8E8E93]">
                Today's revenue
              </p>
              <p className="text-[34px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight tracking-tight">
                €{todayRevenue.toFixed(0)}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[#34C759] text-xs font-semibold bg-[#34C759]/10 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              {weekRevenue > 0 ? `€${weekRevenue.toFixed(0)} wk` : "—"}
            </div>
          </div>

          <div className="h-24 -mx-1 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#8E8E93" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "#e11d48", strokeOpacity: 0.2 }}
                  contentStyle={{
                    background: "#fff",
                    border: "none",
                    borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                  formatter={(v: any) => [`€${Number(v).toFixed(0)}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  fill="url(#dashRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* KPI 3-up */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 360, damping: 26 }}
                className="rounded-2xl bg-white dark:bg-[#2C2C2E] p-3 shadow-sm"
              >
                <div className={`h-8 w-8 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-[#8E8E93]">
                  {s.label}
                </p>
                <p className="text-xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mt-0.5">
                  {s.value}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-[#8E8E93] px-1 mb-2">
            Quick actions
          </p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-white dark:bg-[#2C2C2E] p-3 shadow-sm active:scale-95 transition-transform"
                >
                  <div className="h-9 w-9 rounded-full bg-[#e11d48] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] text-center leading-tight">
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-3xl bg-white dark:bg-[#2C2C2E] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F2F7] dark:border-[#3A3A3C]">
            <div>
              <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Upcoming
              </h2>
              <p className="text-xs text-[#8E8E93]">{upcoming.length} scheduled</p>
            </div>
            <button
              onClick={() => navigate("/agenda")}
              className="text-sm font-semibold text-[#e11d48] active:opacity-60"
            >
              See all
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar className="h-8 w-8 mx-auto text-[#C6C6C8] mb-2" />
              <p className="text-sm text-[#8E8E93]">No upcoming bookings</p>
            </div>
          ) : (
            <ul>
              {upcoming.map((a, idx) => (
                <li
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 active:bg-[#F2F2F7] dark:active:bg-[#3A3A3C] transition-colors ${
                    idx !== upcoming.length - 1
                      ? "border-b border-[#F2F2F7] dark:border-[#3A3A3C]"
                      : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-[#e11d48] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {(a.customer?.name || "W")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                      {a.customer?.name || "Walk-in"}
                    </p>
                    <p className="text-xs text-[#8E8E93] truncate">
                      {a.service?.name || "Service"} ·{" "}
                      {format(parseISO(a.appointment_date), "MMM d")} ·{" "}
                      {a.appointment_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      €{Number(a.price || a.service?.price || 0).toFixed(0)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-medium uppercase tracking-wide ${
                        a.status === "completed"
                          ? "text-[#34C759]"
                          : a.status === "cancelled"
                          ? "text-[#FF3B30]"
                          : "text-[#e11d48]"
                      }`}
                    >
                      {a.status || "scheduled"}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#C6C6C8] shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MobileDock />
    </>
  );
}

export default Dashboard;

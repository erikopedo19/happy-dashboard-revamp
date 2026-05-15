/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardContent } from "@/components/DashboardContent";
import { MobileDock } from "@/components/MobileDock";
import { MobileSpringboard } from "@/components/MobileSpringboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, DollarSign, Clock, Users, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        .limit(200);
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
    .slice(0, 5);

  const stats = [
    {
      label: "Revenue",
      value: `€${todayRevenue.toFixed(0)}`,
      icon: DollarSign,
      bg: "bg-[#34C759]/15",
      color: "text-[#34C759]",
    },
    {
      label: "Today",
      value: todays.length.toString(),
      icon: Calendar,
      bg: "bg-[#007AFF]/15",
      color: "text-[#007AFF]",
    },
    {
      label: "Pending",
      value: pending.toString(),
      icon: Clock,
      bg: "bg-[#FF9500]/15",
      color: "text-[#FF9500]",
    },
    {
      label: "Clients",
      value: customers.length.toString(),
      icon: Users,
      bg: "bg-[#AF52DE]/15",
      color: "text-[#AF52DE]",
    },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#F2F2F7]/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8E8E93] uppercase tracking-wide font-semibold">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="text-[28px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7] leading-tight">
            Admin
          </h1>
        </div>
        <SidebarTrigger className="hover:bg-white/60 dark:hover:bg-[#2C2C2E] transition-colors text-[#1C1C1E] dark:text-[#F2F2F7] rounded-xl" />
      </div>

      <div className="flex-1 overflow-auto px-5 pb-32 space-y-6">
        {/* KPI 2x2 */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
          className="grid grid-cols-2 gap-3"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 26 } },
                }}
                className="rounded-2xl bg-white dark:bg-[#2C2C2E] p-4 shadow-sm"
              >
                <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-[#8E8E93]">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mt-0.5">
                  {s.value}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Springboard 4-col app grid */}
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-[#8E8E93] px-1 mb-3">
            All apps
          </p>
          <MobileSpringboard />
        </div>

        {/* Upcoming – iOS-styled rows */}
        <div className="rounded-2xl bg-white dark:bg-[#2C2C2E] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F2F7] dark:border-[#3A3A3C]">
            <div>
              <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                Upcoming
              </h2>
              <p className="text-xs text-[#8E8E93]">{upcoming.length} scheduled</p>
            </div>
            <button
              onClick={() => navigate("/agenda")}
              className="text-sm font-medium text-[#007AFF] active:opacity-60"
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
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center text-sm font-semibold shrink-0">
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
                          : "text-[#007AFF]"
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

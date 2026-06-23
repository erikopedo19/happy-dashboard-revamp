import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Crown,
  DollarSign,
  Download,
  MessageSquare,
  Scissors,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type RangeValue =
  | "today"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  price: number | null;
  status: string | null;
  stylist_id: string | null;
  service_id: string;
  customer_id: string;
  service?: {
    id: string;
    name: string;
    color: string | null;
    duration: number | null;
  } | null;
}

interface StylistRow {
  id: string;
  name: string;
  title: string | null;
  satisfaction: number | null;
  status: string | null;
  bookings_today: number | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

interface ServiceRow {
  id: string;
  name: string;
  color: string | null;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
}

interface TopCustomerRow {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  lastVisit: string | null;
  initials: string;
}

const db = supabase as any;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("en-US");

// iOS 25 system colors
const iOS = {
  blue: "#0A84FF",
  green: "#30D158",
  indigo: "#5E5CE6",
  orange: "#FF9F0A",
  pink: "#FF375F",
  yellow: "#FFD60A",
  teal: "#64D2FF",
  purple: "#BF5AF2",
  grey: "#8E8E93",
  grey2: "#636366",
  grey3: "#48484A",
  background: "#000000",
  card: "#1C1C1E",
  separator: "#38383A",
};

const RANGES: { value: RangeValue; label: string; short: string }[] = [
  { value: "today", label: "Today", short: "1D" },
  { value: "last7days", label: "7 Days", short: "7D" },
  { value: "last30days", label: "30 Days", short: "30D" },
  { value: "thisMonth", label: "Month", short: "MTD" },
  { value: "lastMonth", label: "Last Mo.", short: "LM" },
  { value: "thisYear", label: "Year", short: "YTD" },
];

const getRangeDates = (range: RangeValue) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last7days":
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last30days":
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisMonth":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "lastMonth":
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisYear":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const Reports = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<RangeValue>("last30days");

  const { startDate, endDate } = useMemo(() => getRangeDates(dateRange), [dateRange]);

  const { data: reviewsData } = useQuery<ReviewRow[]>({
    queryKey: ["reports-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db.rpc("get_reviews_for_business", { _business_id: user.id });
      if (error) return [];
      return (data || []) as ReviewRow[];
    },
  });

  const { data: customersData = [] } = useQuery<CustomerRow[]>({
    queryKey: ["reports-customers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data: rows } = await (supabase as any)
        .from("customers")
        .select("id, name, email")
        .eq("user_id", user.id)
        .order("name");
      return (rows || []) as CustomerRow[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["reports-analytics", user?.id, dateRange, startDate, endDate],
    enabled: !!user,
    queryFn: async () => {
      if (!user) {
        return {
          appointments: [] as AppointmentRow[],
          stylists: [] as StylistRow[],
          services: [] as ServiceRow[],
        };
      }

      const [appointmentsResult, stylistsResult, servicesResult] = await Promise.all([
        db
          .from("appointments")
          .select(`
            id,
            appointment_date,
            appointment_time,
            price,
            status,
            stylist_id,
            service_id,
            customer_id,
            service:services(id, name, color, duration)
          `)
          .eq("user_id", user.id)
          .gte("appointment_date", startDate)
          .lte("appointment_date", endDate)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true }),
        db
          .from("stylists")
          .select("id, name, title, satisfaction, status, bookings_today")
          .eq("user_id", user.id)
          .order("name"),
        db
          .from("services")
          .select("id, name, color")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("name"),
      ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (stylistsResult.error) throw stylistsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      return {
        appointments: (appointmentsResult.data || []) as AppointmentRow[],
        stylists: (stylistsResult.data || []) as StylistRow[],
        services: (servicesResult.data || []) as ServiceRow[],
      };
    },
  });

  const analytics = useMemo(() => {
    const appointments = data?.appointments || [];
    const stylists = data?.stylists || [];
    const services = data?.services || [];

    const totalRevenue = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const completedAppointments = appointments.filter((apt) => apt.status === "completed").length;
    const scheduledAppointments = appointments.filter(
      (apt) => apt.status === "scheduled" || apt.status === "confirmed"
    ).length;
    const cancelledAppointments = appointments.filter((apt) => apt.status === "cancelled").length;
    const totalCustomers = new Set(appointments.map((apt) => apt.customer_id)).size;
    const averageTicket = appointments.length ? totalRevenue / appointments.length : 0;
    const completionRate = appointments.length
      ? Math.round((completedAppointments / appointments.length) * 100)
      : 0;

    const dailyMap = new Map<
      string,
      { date: string; revenue: number; appointments: number; completed: number }
    >();

    appointments.forEach((apt) => {
      const key = apt.appointment_date;
      const current = dailyMap.get(key) || {
        date: key,
        revenue: 0,
        appointments: 0,
        completed: 0,
      };

      current.revenue += apt.price || 0;
      current.appointments += 1;
      if (apt.status === "completed") current.completed += 1;

      dailyMap.set(key, current);
    });

    const revenueTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        label: dayLabel(item.date),
        revenue: item.revenue,
        appointments: item.appointments,
        completed: item.completed,
      }));

    const serviceUsageMap = new Map<
      string,
      { name: string; bookings: number; revenue: number }
    >();

    appointments.forEach((apt) => {
      const serviceName = apt.service?.name || "Service";
      const existing = serviceUsageMap.get(serviceName) || {
        name: serviceName,
        bookings: 0,
        revenue: 0,
      };
      existing.bookings += 1;
      existing.revenue += apt.price || 0;
      serviceUsageMap.set(serviceName, existing);
    });

    const serviceBreakdown = Array.from(serviceUsageMap.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6);

    const stylistPerformance = stylists
      .map((stylist) => {
        const stylistAppointments = appointments.filter((apt) => apt.stylist_id === stylist.id);
        const revenue = stylistAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
        const completed = stylistAppointments.filter((apt) => apt.status === "completed").length;
        const score = revenue + completed * 30 + (stylist.satisfaction || 0) * 100;

        return {
          id: stylist.id,
          name: stylist.name,
          title: stylist.title || "Stylist",
          bookings: stylistAppointments.length,
          completed,
          revenue,
          satisfaction: stylist.satisfaction || 0,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const statusBreakdown = [
      { name: "Completed", value: completedAppointments, fill: iOS.green },
      { name: "Scheduled", value: scheduledAppointments, fill: iOS.blue },
      { name: "Cancelled", value: cancelledAppointments, fill: iOS.grey2 },
    ].filter((item) => item.value > 0);

    const dayOfWeekDemand = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
      count: appointments.filter(
        (apt) => new Date(`${apt.appointment_date}T00:00:00`).getDay() === dow
      ).length,
    }));

    const half = Math.floor(revenueTrend.length / 2);
    const firstHalf = revenueTrend.slice(0, half).reduce((s, r) => s + r.revenue, 0);
    const secondHalf = revenueTrend.slice(half).reduce((s, r) => s + r.revenue, 0);
    const revenueDelta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    return {
      totalRevenue,
      totalAppointments: appointments.length,
      totalCustomers,
      averageTicket,
      completionRate,
      completedAppointments,
      scheduledAppointments,
      cancelledAppointments,
      revenueTrend,
      serviceBreakdown,
      stylistPerformance,
      statusBreakdown,
      dayOfWeekDemand,
      activeServices: services.length,
      activeStylists: stylists.length,
      revenueDelta,
    };
  }, [data]);

  const topCustomers = useMemo<TopCustomerRow[]>(() => {
    if (!data?.appointments || !customersData.length) return [];
    const map = new Map<string, { bookings: number; revenue: number; lastVisit: string | null }>();
    data.appointments.forEach((apt) => {
      if (!apt.customer_id) return;
      const prev = map.get(apt.customer_id) ?? { bookings: 0, revenue: 0, lastVisit: null };
      map.set(apt.customer_id, {
        bookings: prev.bookings + 1,
        revenue: prev.revenue + (apt.price || 0),
        lastVisit:
          !prev.lastVisit || apt.appointment_date > prev.lastVisit
            ? apt.appointment_date
            : prev.lastVisit,
      });
    });
    return customersData
      .map((c) => {
        const stats = map.get(c.id) ?? { bookings: 0, revenue: 0, lastVisit: null };
        const parts = c.name.trim().split(" ");
        const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
        return {
          id: c.id,
          name: c.name,
          bookings: stats.bookings,
          revenue: stats.revenue,
          lastVisit: stats.lastVisit,
          initials: initials.toUpperCase(),
        };
      })
      .filter((c) => c.bookings > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [data, customersData]);

  const revenueChartConfig = {
    revenue: { label: "Revenue", color: iOS.blue },
  } satisfies ChartConfig;

  const handleExport = () => {
    const header = "label,revenue,appointments,completed";
    const rows = analytics.revenueTrend
      .map((r) => `${r.label},${r.revenue},${r.appointments},${r.completed}`)
      .join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export ready",
      description: "Your analytics CSV has been downloaded.",
    });
  };

  const spring = { type: "spring" as const, stiffness: 400, damping: 28 };
  const springSoft = { type: "spring" as const, stiffness: 350, damping: 32 };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-black overflow-hidden">
        <AppSidebar />

        <main className="relative flex-1 bg-black flex flex-col overflow-hidden">
          {/* Ambient glow — iOS 25 refined */}
          <div
            aria-hidden
            className="ambient-gradient pointer-events-none absolute inset-x-0 -top-10 h-96 z-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(10,132,255,0.15) 0%, rgba(10,132,255,0) 50%), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(94,92,230,0.12) 0%, rgba(94,92,230,0) 50%)",
              maskImage:
                "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
            }}
          />

          {/* Large title header — iOS 25 */}
          <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-3xl border-b border-white/[0.06]">
            <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SidebarTrigger className="lg:hidden text-white" />
                <motion.div
                  className="min-w-0"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springSoft}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
                    Analytics
                  </p>
                  <h1 className="text-[32px] md:text-[38px] font-bold text-white tracking-[-0.025em] leading-none">
                    Reports
                  </h1>
                </motion.div>
              </div>

              <motion.button
                type="button"
                onClick={handleExport}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springSoft}
                whileTap={{ scale: 0.95 }}
                className="shrink-0 inline-flex items-center gap-2 rounded-full h-10 px-4 bg-white/[0.08] text-white text-[13px] font-semibold backdrop-blur-2xl border border-white/[0.08] active:bg-white/[0.12] transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
              >
                <Download className="h-4 w-4" strokeWidth={2.3} />
                {!isMobile && "Export"}
              </motion.button>
            </div>

            {/* iOS 25 segmented control */}
            <div className="px-4 md:px-8 pb-4">
              <div className="inline-flex w-full md:w-auto p-[4px] rounded-[14px] bg-white/[0.06] backdrop-blur-2xl gap-[3px] overflow-x-auto scrollbar-none">
                {RANGES.map((r) => {
                  const active = dateRange === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setDateRange(r.value)}
                      className={cn(
                        "relative shrink-0 flex-1 md:flex-none h-9 px-4 rounded-[11px] text-[13px] font-medium transition-all duration-250",
                        active ? "text-white" : "text-[#8E8E93] hover:text-white/80"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="activeRangePill"
                          className="absolute inset-0 rounded-[11px] bg-white/[0.14] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.4)] -z-10"
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                      <span className="relative">{isMobile ? r.short : r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-auto">
            <div className="w-full px-4 md:px-8 py-5 md:py-8 space-y-5 md:space-y-6 pb-32 md:pb-10 max-w-[1320px] mx-auto">

              {/* HERO REVENUE CARD */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springSoft}
              >
                <Card className="rounded-[32px] border-0 bg-[#1C1C1E]/85 backdrop-blur-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E8E93]">
                          Total revenue
                        </p>
                        <p className="text-[44px] md:text-[60px] font-bold text-white mt-2 tracking-[-0.035em] leading-none tabular-nums">
                          {currency.format(analytics.totalRevenue)}
                        </p>
                        <div className="mt-4 flex items-center gap-2.5">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold",
                              analytics.revenueDelta >= 0
                                ? "bg-[#30D158]/12 text-[#30D158] border border-[#30D158]/20"
                                : "bg-[#FF375F]/12 text-[#FF375F] border border-[#FF375F]/20"
                            )}
                          >
                            {analytics.revenueDelta >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.3} />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.3} />
                            )}
                            {Math.abs(analytics.revenueDelta)}%
                          </div>
                          <span className="text-[12px] text-[#8E8E93]">vs prior period</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-[18px] bg-[#0A84FF]/12 flex items-center justify-center shrink-0 border border-[#0A84FF]/20">
                        <DollarSign className="w-5.5 h-5.5 text-[#0A84FF]" strokeWidth={2.3} />
                      </div>
                    </div>

                    <ChartContainer
                      config={revenueChartConfig}
                      className="h-[220px] md:h-[300px] w-full aspect-auto mt-6"
                    >
                      <AreaChart data={analytics.revenueTrend} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={iOS.blue} stopOpacity={0.42} />
                            <stop offset="100%" stopColor={iOS.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 8" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93", fontWeight: 500 }} interval="preserveStartEnd" />
                        <YAxis hide />
                        <ChartTooltip
                          cursor={{ stroke: "rgba(255,255,255,0.12)", strokeDasharray: "4 4" }}
                          content={
                            <ChartTooltipContent
                              formatter={(value) => [currency.format(Number(value)), "Revenue"]}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={iOS.blue}
                          strokeWidth={2.8}
                          fill="url(#fillRev)"
                          animationDuration={1200}
                        />
                        <Line
                          type="monotone"
                          dataKey="completed"
                          stroke="rgba(255,255,255,0.22)"
                          strokeWidth={1.8}
                          strokeDasharray="4 5"
                          dot={false}
                          animationDuration={1200}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </motion.section>

              {/* KPI GRID */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <KpiTile index={0}
                  icon={<CalendarDays className="w-4.5 h-4.5" strokeWidth={2.3} />}
                  label="Bookings"
                  value={numberFormat.format(analytics.totalAppointments)}
                  hint={`${analytics.completionRate}% done`}
                  tint={iOS.blue}
                />
                <KpiTile index={1}
                  icon={<Users className="w-4.5 h-4.5" strokeWidth={2.3} />}
                  label="Clients"
                  value={numberFormat.format(analytics.totalCustomers)}
                  hint={`${analytics.activeStylists} stylists`}
                  tint={iOS.indigo}
                />
                <KpiTile index={2}
                  icon={<DollarSign className="w-4.5 h-4.5" strokeWidth={2.3} />}
                  label="Avg ticket"
                  value={currency.format(analytics.averageTicket || 0)}
                  hint="Per booking"
                  tint={iOS.green}
                />
                <KpiTile index={3}
                  icon={<Scissors className="w-4.5 h-4.5" strokeWidth={2.3} />}
                  label="Services"
                  value={numberFormat.format(analytics.activeServices)}
                  hint={`${analytics.completedAppointments} done`}
                  tint={iOS.orange}
                />
              </section>

              {/* TWO-COL: Status + Days */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {/* Booking status */}
                <SectionCard
                  title="Booking status"
                  subtitle="Distribution this period"
                  delay={0.05}
                >
                  {analytics.statusBreakdown.length === 0 ? (
                    <EmptyMini />
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="relative w-40 h-40 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.statusBreakdown}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={52}
                              outerRadius={74}
                              paddingAngle={5}
                              cornerRadius={10}
                              strokeWidth={0}
                              animationDuration={1000}
                            >
                              {analytics.statusBreakdown.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[28px] font-bold text-white tracking-tight tabular-nums">
                            {analytics.completionRate}%
                          </span>
                          <span className="text-[9px] text-[#8E8E93] uppercase tracking-[0.14em] mt-1">
                            done
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        {analytics.statusBreakdown.map((s) => (
                          <div key={s.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.fill }}
                              />
                              <span className="text-[14px] text-white truncate">
                                {s.name}
                              </span>
                            </div>
                            <span className="text-[14px] font-semibold text-white tabular-nums">
                              {s.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* Busiest days */}
                <SectionCard
                  title="Busiest days"
                  subtitle="Bookings by day of week"
                  delay={0.1}
                >
                  {analytics.dayOfWeekDemand.every((d) => d.count === 0) ? (
                    <EmptyMini />
                  ) : (
                    <ChartContainer
                      config={{ count: { label: "Bookings", color: iOS.indigo } }}
                      className="h-[170px] w-full aspect-auto"
                    >
                      <BarChart data={analytics.dayOfWeekDemand} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barCategoryGap="24%">
                        <CartesianGrid vertical={false} strokeDasharray="3 8" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8E8E93", fontWeight: 500 }} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[10, 10, 10, 10]} animationDuration={1000}>
                          {analytics.dayOfWeekDemand.map((entry, i) => {
                            const max = Math.max(...analytics.dayOfWeekDemand.map((d) => d.count), 1);
                            const opacity = 0.35 + (entry.count / max) * 0.65;
                            return <Cell key={i} fill={`rgba(94,92,230,${opacity})`} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </SectionCard>
              </section>

              {/* TOP SERVICES */}
              <SectionCard
                title="Top services"
                subtitle="Most booked in this period"
                delay={0.15}
              >
                {analytics.serviceBreakdown.length === 0 ? (
                  <EmptyMini />
                ) : (
                  <div className="space-y-3.5">
                    {analytics.serviceBreakdown.map((s, idx) => {
                      const max = analytics.serviceBreakdown[0]?.bookings || 1;
                      const pct = (s.bookings / max) * 100;
                      return (
                        <motion.div
                          key={s.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * idx, ...springSoft }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between text-[14px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-white/[0.08] text-[11px] font-semibold text-[#8E8E93] flex items-center justify-center shrink-0 tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-white truncate">
                                {s.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3.5 shrink-0">
                              <span className="text-[12px] text-[#8E8E93] tabular-nums">
                                {currency.format(s.revenue)}
                              </span>
                              <span className="text-[14px] font-semibold text-white tabular-nums">
                                {s.bookings}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[#0A84FF]"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.05 * idx + 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* STYLIST LEADERBOARD */}
              <SectionCard
                title="Stylist leaderboard"
                subtitle="Ranked by revenue & satisfaction"
                delay={0.2}
              >
                {analytics.stylistPerformance.length === 0 ? (
                  <EmptyMini />
                ) : (
                  <div className="rounded-2xl bg-white/[0.04] overflow-hidden divide-y divide-white/[0.06]">
                    {analytics.stylistPerformance.slice(0, 6).map((stylist, index) => (
                      <motion.div
                        key={stylist.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index, ...springSoft }}
                        className="flex items-center gap-3.5 px-4 py-3.5 active:bg-white/[0.06] transition-colors"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-[14px] shrink-0",
                            index === 0
                              ? "bg-[#FFD60A] text-black shadow-[0_2px_8px_rgba(255,214,10,0.3)]"
                              : index === 1
                              ? "bg-white/[0.20] text-white"
                              : index === 2
                              ? "bg-[#FF9F0A]/25 text-[#FF9F0A]"
                              : "bg-white/[0.08] text-[#8E8E93]"
                          )}
                        >
                          {index === 0 ? <Crown className="w-4.5 h-4.5" strokeWidth={2.3} /> : index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[15px] text-white truncate">
                            {stylist.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] mt-0.5">
                            <span>{stylist.bookings} bookings</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-[#FFD60A] text-[#FFD60A]" />
                              {stylist.satisfaction.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-semibold text-white tabular-nums">
                            {currency.format(stylist.revenue)}
                          </p>
                        </div>
                        <ChevronRight className="w-4.5 h-4.5 text-[#48484A] shrink-0" strokeWidth={2.3} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* BEST CUSTOMERS */}
              <TopCustomersSection customers={topCustomers} />

              {/* REVIEWS */}
              <ReviewsSection reviews={reviewsData || []} />

              {isLoading && (
                <div className="text-[13px] text-[#8E8E93] text-center py-4">
                  Loading…
                </div>
              )}
            </div>
          </div>
          <MobileDock />
        </main>
      </div>
    </SidebarProvider>
  );
};

function SectionCard({
  title,
  subtitle,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 380, damping: 30 }}
    >
      <Card className="rounded-[26px] border-0 bg-[#1C1C1E]/85 backdrop-blur-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <CardContent className="p-5.5 md:p-6.5">
          <div className="mb-5">
            <h3 className="text-[16px] font-semibold text-white tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-[#8E8E93] mt-1">{subtitle}</p>
            )}
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
  index = 0,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  index?: number;
  tint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 400, damping: 28 }}
      whileTap={{ scale: 0.96 }}
    >
      <Card className="rounded-[22px] border-0 bg-[#1C1C1E]/85 backdrop-blur-3xl cursor-default transition-all duration-300 hover:bg-[#222224]/90 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4.5">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center mb-3.5"
            style={{ backgroundColor: `${tint}18`, color: tint }}
          >
            {icon}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
            {label}
          </p>
          <p className="text-[22px] md:text-[24px] font-bold text-white mt-1 tabular-nums tracking-tight">
            {value}
          </p>
          <p className="text-[11px] text-[#8E8E93] mt-1 truncate">{hint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TopCustomersSection({ customers }: { customers: TopCustomerRow[] }) {
  return (
    <SectionCard title="Best customers" subtitle="Ranked by spend this period" delay={0.25}>
      {customers.length === 0 ? (
        <EmptyMini />
      ) : (
        <div className="rounded-2xl bg-white/[0.04] overflow-hidden divide-y divide-white/[0.06]">
          {customers.map((c, i) => {
            const pct = Math.min(100, (c.revenue / (customers[0]?.revenue || 1)) * 100);
            const tints = [iOS.yellow, iOS.indigo, iOS.teal, iOS.green, iOS.orange, iOS.pink, iOS.purple, iOS.blue];
            const tint = tints[i % tints.length];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.045 * i, type: "spring", stiffness: 400, damping: 28 }}
                className="flex items-center gap-3.5 px-4 py-3.5 active:bg-white/[0.06]"
              >
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{ backgroundColor: `${tint}28`, color: tint }}
                >
                  {c.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[15px] text-white truncate">{c.name}</p>
                    {i === 0 && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-[#FFD60A] text-black">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8E8E93] mt-0.5">
                    {c.bookings} visit{c.bookings !== 1 ? "s" : ""}
                    {c.lastVisit
                      ? ` · ${formatDistanceToNow(new Date(c.lastVisit + "T00:00:00"), { addSuffix: true })}`
                      : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 min-w-[75px]">
                  <p className="text-[15px] font-semibold text-white tabular-nums">
                    {currency.format(c.revenue)}
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: tint }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.045 * i + 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function ReviewsSection({ reviews }: { reviews: ReviewRow[] }) {
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <SectionCard title="Customer reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""} total`} delay={0.3}>
      {reviews.length === 0 ? (
        <EmptyMini />
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <div className="flex items-center gap-6">
            <div className="text-center shrink-0">
              <p className="text-[48px] font-bold text-white tabular-nums tracking-[-0.025em] leading-none">
                {avgRating.toFixed(1)}
              </p>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "w-4 h-4",
                      s <= Math.round(avgRating)
                        ? "fill-[#FFD60A] text-[#FFD60A]"
                        : "text-white/15"
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#8E8E93] mt-1.5">{reviews.length} reviews</p>
            </div>
            <div className="flex-1 space-y-2">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-[#8E8E93] w-3 shrink-0 tabular-nums">{star}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#FFD60A]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="text-[11px] text-[#8E8E93] w-4 text-right tabular-nums shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent reviews */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#8E8E93]">Recent</p>
            {reviews.slice(0, 6).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.045 * i, type: "spring", stiffness: 350, damping: 32 }}
                className="rounded-2xl bg-white/[0.04] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "w-3.5 h-3.5",
                          s <= r.rating ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/15"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#8E8E93]">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                {r.reviewer_name && (
                  <p className="text-[13px] font-semibold text-white">
                    {r.reviewer_name}
                  </p>
                )}
                {r.comment && (
                  <p className="text-[14px] text-white/75 leading-relaxed">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function EmptyMini() {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-10 text-center">
      <div className="w-11 h-11 rounded-[14px] bg-white/[0.06] mx-auto flex items-center justify-center">
        <Sparkles className="w-4.5 h-4.5 text-[#8E8E93]" strokeWidth={2.3} />
      </div>
      <p className="text-[12px] text-[#8E8E93] mt-3.5">No data in this range yet</p>
    </div>
  );
}

export default Reports;

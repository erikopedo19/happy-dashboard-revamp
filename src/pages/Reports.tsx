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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Crown,
  DollarSign,
  Download,
  Filter,
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
  color: string;
}

const db = supabase as any;

const customerColors = [
  "#e11d48", "#7c3aed", "#2563eb", "#059669",
  "#d97706", "#db2777", "#0891b2", "#65a30d",
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("en-US");

const RANGES: { value: RangeValue; label: string; short: string }[] = [
  { value: "today", label: "Today", short: "1D" },
  { value: "last7days", label: "Last 7 days", short: "7D" },
  { value: "last30days", label: "Last 30 days", short: "30D" },
  { value: "thisMonth", label: "This month", short: "MTD" },
  { value: "lastMonth", label: "Last month", short: "LM" },
  { value: "thisYear", label: "This year", short: "YTD" },
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

// Rose-only palette (no blue/orange)
const rosePalette = [
  "#e11d48",
  "#f43f5e",
  "#fb7185",
  "#fda4af",
  "#fecdd3",
  "#9f1239",
];

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
      { name: string; bookings: number; revenue: number; color: string }
    >();

    appointments.forEach((apt) => {
      const serviceName = apt.service?.name || "Service";
      const existing = serviceUsageMap.get(serviceName) || {
        name: serviceName,
        bookings: 0,
        revenue: 0,
        color:
          apt.service?.color ||
          rosePalette[serviceUsageMap.size % rosePalette.length],
      };

      existing.bookings += 1;
      existing.revenue += apt.price || 0;

      serviceUsageMap.set(serviceName, existing);
    });

    const serviceBreakdown = Array.from(serviceUsageMap.values())
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 6);

    const stylistPerformance = stylists
      .map((stylist, index) => {
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
          color: rosePalette[index % rosePalette.length],
        };
      })
      .sort((a, b) => b.score - a.score);

    const topStylist = stylistPerformance[0];

    const statusBreakdown = [
      { name: "Completed", value: completedAppointments, fill: "#e11d48" },
      { name: "Scheduled", value: scheduledAppointments, fill: "#fb7185" },
      { name: "Cancelled", value: cancelledAppointments, fill: "#fecdd3" },
    ].filter((item) => item.value > 0);

    const busiestHourMap = new Map<string, number>();
    appointments.forEach((apt) => {
      const hour = `${apt.appointment_time.slice(0, 2)}:00`;
      busiestHourMap.set(hour, (busiestHourMap.get(hour) || 0) + 1);
    });

    const hourlyDemand = Array.from(busiestHourMap.entries())
      .map(([hour, value]) => ({ hour, value }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(0, 10);

    const dayOfWeekDemand = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
      count: appointments.filter(
        (apt) => new Date(`${apt.appointment_date}T00:00:00`).getDay() === dow
      ).length,
    }));

    // simple delta vs first half of window
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
      topStylist,
      statusBreakdown,
      hourlyDemand,
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
      .map((c, i) => {
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
          color: customerColors[i % customerColors.length],
        };
      })
      .filter((c) => c.bookings > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [data, customersData]);

  const revenueChartConfig = {
    revenue: { label: "Revenue", color: "#e11d48" },
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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-[#F2F2F7] dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />

        <main className="flex-1 bg-[#F2F2F7] dark:bg-[#0c0c0c] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl">
            <div className="px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden text-[#1C1C1E] dark:text-[#F2F2F7]" />
                <h1 className="text-[17px] md:text-2xl font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                  Reports
                </h1>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleExport}
                className="rounded-full h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
                {!isMobile && "Export"}
              </Button>
            </div>

            {/* Range pills */}
            <div className="px-4 md:px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
              {RANGES.map((r) => {
                const active = dateRange === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setDateRange(r.value)}
                    className={`shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7]"
                    }`}
                  >
                    {isMobile ? r.short : r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="w-full px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 pb-32 md:pb-6 max-w-[1400px] mx-auto">
              {/* Hero revenue card */}
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm overflow-hidden">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
                        Total revenue
                      </p>
                      <p className="text-3xl md:text-5xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mt-2 tracking-tight">
                        {currency.format(analytics.totalRevenue)}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            analytics.revenueDelta >= 0
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                              : "bg-[#F2F2F7] text-[#8E8E93] dark:bg-[#2C2C2E]"
                          }`}
                        >
                          {analytics.revenueDelta >= 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {Math.abs(analytics.revenueDelta)}%
                        </div>
                        <span className="text-xs text-[#8E8E93]">
                          vs first half
                        </span>
                      </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-rose-600" strokeWidth={2.5} />
                    </div>
                  </div>

                  <ChartContainer
                    config={revenueChartConfig}
                    className="h-[180px] md:h-[240px] w-full aspect-auto mt-4"
                  >
                    <BarChart data={analytics.revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={0}>
                      <defs>
                        <linearGradient id="fillRevBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93" }} />
                      <YAxis hide />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [currency.format(Number(value)), "Revenue"]}
                          />
                        }
                      />
                      <Bar
                        dataKey="revenue"
                        fill="url(#fillRevBar)"
                        stroke="#38bdf8"
                        strokeWidth={1}
                        radius={[6, 6, 0, 0]}
                        animationDuration={900}
                        animationBegin={200}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        dot={false}
                        animationDuration={1200}
                        animationBegin={400}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* KPI grid */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile index={0}
                  icon={<CalendarDays className="w-4 h-4 text-rose-600" />}
                  label="Appointments"
                  value={numberFormat.format(analytics.totalAppointments)}
                  hint={`${analytics.completionRate}% completed`}
                  accent="rose"
                />
                <KpiTile index={1}
                  icon={<Users className="w-4 h-4 text-sky-500" />}
                  label="Clients"
                  value={numberFormat.format(analytics.totalCustomers)}
                  hint={`${analytics.activeStylists} stylists`}
                  accent="sky"
                />
                <KpiTile index={2}
                  icon={<DollarSign className="w-4 h-4 text-rose-600" />}
                  label="Avg ticket"
                  value={currency.format(analytics.averageTicket || 0)}
                  hint="Per booking"
                  accent="rose"
                />
                <KpiTile index={3}
                  icon={<Scissors className="w-4 h-4 text-sky-500" />}
                  label="Services"
                  value={numberFormat.format(analytics.activeServices)}
                  hint={`${analytics.completedAppointments} completed`}
                  accent="sky"
                />
              </section>

              {/* Status + Demand */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                {/* Booking status */}
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                          Booking status
                        </h3>
                        <p className="text-xs text-[#8E8E93] mt-0.5">
                          Distribution this period
                        </p>
                      </div>
                    </div>

                    {analytics.statusBreakdown.length === 0 ? (
                      <EmptyMini />
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="relative w-32 h-32 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.statusBreakdown}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={42}
                                outerRadius={62}
                                paddingAngle={3}
                                cornerRadius={6}
                                strokeWidth={0}
                              >
                                {analytics.statusBreakdown.map((item) => (
                                  <Cell key={item.name} fill={item.fill} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">
                              {analytics.completionRate}%
                            </span>
                            <span className="text-[10px] text-[#8E8E93] uppercase tracking-wide">
                              done
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2">
                          {analytics.statusBreakdown.map((s) => (
                            <div key={s.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: s.fill }}
                                />
                                <span className="text-sm text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                                  {s.name}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                                {s.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Hourly demand */}
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                  <CardContent className="p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                        Demand by hour
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">
                        When clients book most
                      </p>
                    </div>

                    {analytics.hourlyDemand.length === 0 ? (
                      <EmptyMini />
                    ) : (
                      <ChartContainer
                        config={{ value: { label: "Bookings", color: "#e11d48" } }}
                        className="h-[160px] w-full aspect-auto"
                      >
                        <BarChart data={analytics.hourlyDemand} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={0}>
                          <defs>
                            <linearGradient id="fillHourly" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#e11d48" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                          <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93" }} />
                          <YAxis hide />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar
                            dataKey="value"
                            fill="url(#fillHourly)"
                            stroke="#e11d48"
                            strokeWidth={1}
                            radius={[4, 4, 0, 0]}
                            animationDuration={900}
                            animationBegin={200}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Booking stats */}
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(14,165,233,0.10)] dark:hover:shadow-[0_8px_40px_rgba(14,165,233,0.22)]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                        Booking stats
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">
                        Status breakdown this period
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-sky-500" strokeWidth={2.5} />
                    </div>
                  </div>

                  {analytics.statusBreakdown.length === 0 ? (
                    <EmptyMini />
                  ) : (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.statusBreakdown}
                          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          barGap={0}
                        >
                          <defs>
                            <linearGradient id="noGapGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--chart-3, #38bdf8)" stopOpacity={0.55} />
                              <stop offset="100%" stopColor="var(--chart-3, #38bdf8)" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: "#8E8E93" }}
                          />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid #E5E5EA",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                            formatter={(value: number) => [value, "Bookings"]}
                          />
                          <Bar
                            dataKey="value"
                            fill="url(#noGapGradient)"
                            stroke="var(--chart-3, #38bdf8)"
                            strokeWidth={1}
                            radius={[8, 8, 0, 0]}
                            animationDuration={900}
                            animationBegin={200}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#0ea5e9"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
                            animationDuration={1200}
                            animationBegin={400}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top services */}
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      Top services
                    </h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">
                      Most booked in this period
                    </p>
                  </div>

                  {analytics.serviceBreakdown.length === 0 ? (
                    <EmptyMini />
                  ) : (
                    <div className="space-y-3">
                      {analytics.serviceBreakdown.map((s, idx) => {
                        const max = analytics.serviceBreakdown[0]?.bookings || 1;
                        const pct = (s.bookings / max) * 100;
                        return (
                          <div key={s.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-md bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[10px] font-semibold text-[#8E8E93] flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                                  {s.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-[#8E8E93]">
                                  {currency.format(s.revenue)}
                                </span>
                                <span className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
                                  {s.bookings}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-sky-500 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stylist ranking */}
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                        Stylist leaderboard
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">
                        Ranked by revenue & satisfaction
                      </p>
                    </div>
                  </div>

                  {analytics.stylistPerformance.length === 0 ? (
                    <EmptyMini />
                  ) : (
                    <div className="space-y-2">
                      {analytics.stylistPerformance.slice(0, 6).map((stylist, index) => (
                        <div
                          key={stylist.id}
                          className="flex items-center gap-3 rounded-2xl bg-[#F9F9FB] dark:bg-[#2C2C2E]/40 px-3 py-3"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-white shrink-0 ${
                              index === 0 ? "bg-rose-600" : "bg-[#1C1C1E] dark:bg-[#3A3A3C]"
                            }`}
                          >
                            {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                              {stylist.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[#8E8E93] mt-0.5">
                              <span>{stylist.bookings} bookings</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-rose-500 text-rose-500" />
                                {stylist.satisfaction.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
                              {currency.format(stylist.revenue)}
                            </p>
                            <p className="text-[10px] text-[#8E8E93] uppercase tracking-wide">
                              revenue
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stylist comparison chart */}
              {analytics.stylistPerformance.length > 0 && (
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                  <CardContent className="p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                        Revenue comparison
                      </h3>
                      <p className="text-xs text-[#8E8E93] mt-0.5">
                        Side-by-side stylist output
                      </p>
                    </div>
                    <ChartContainer
                      config={{ revenue: { label: "Revenue", color: "#e11d48" } }}
                      className="h-[220px] w-full aspect-auto"
                    >
                      <BarChart
                        data={analytics.stylistPerformance.slice(0, 6)}
                        margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#8E8E93" }}
                          tickFormatter={(value) => value.slice(0, 8)}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#8E8E93" }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => [currency.format(Number(value)), "Revenue"]}
                            />
                          }
                        />
                        <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#e11d48" animationDuration={900} animationBegin={200} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              {/* Busiest days */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Busiest days</h3>
                    <p className="text-xs text-[#8E8E93] mt-0.5">Bookings by day of week</p>
                  </div>
                  {analytics.dayOfWeekDemand.every((d) => d.count === 0) ? (
                    <EmptyMini />
                  ) : (
                    <ChartContainer
                      config={{ count: { label: "Bookings", color: "#e11d48" } }}
                      className="h-[160px] w-full aspect-auto"
                    >
                      <BarChart data={analytics.dayOfWeekDemand} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93" }} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={900} animationBegin={200}>
                          {analytics.dayOfWeekDemand.map((entry, i) => {
                            const maxCount = Math.max(...analytics.dayOfWeekDemand.map((d) => d.count), 1);
                            const opacity = 0.35 + (entry.count / maxCount) * 0.65;
                            return <Cell key={i} fill={`rgba(225,29,72,${opacity})`} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
              </motion.div>

              {/* Best customers */}
              <TopCustomersSection customers={topCustomers} />

              {/* Reviews section */}
              <ReviewsSection reviews={reviewsData || []} />

              {isLoading && (
                <div className="text-sm text-[#8E8E93] text-center py-4">
                  Loading analytics...
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

function KpiTile({
  icon,
  label,
  value,
  hint,
  index = 0,
  accent = "rose",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  index?: number;
  accent?: "rose" | "sky";
}) {
  const accentBg = accent === "sky"
    ? "bg-sky-50 dark:bg-sky-950/30"
    : "bg-rose-50 dark:bg-rose-950/40";
  const hoverShadow = accent === "sky"
    ? "hover:shadow-[0_8px_36px_rgba(14,165,233,0.13)] dark:hover:shadow-[0_8px_36px_rgba(14,165,233,0.28)]"
    : "hover:shadow-[0_8px_36px_rgba(225,29,72,0.13)] dark:hover:shadow-[0_8px_36px_rgba(225,29,72,0.28)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.025, transition: { duration: 0.18 } }}
    >
      <Card className={cn("rounded-2xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm cursor-default transition-shadow duration-300", hoverShadow)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accentBg)}>
              {icon}
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            {label}
          </p>
          <p className="text-xl md:text-2xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mt-1 tabular-nums">
            {value}
          </p>
          <p className="text-[11px] text-[#8E8E93] mt-1 truncate">{hint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TopCustomersSection({ customers }: { customers: TopCustomerRow[] }) {
  const podiumSlots = [
    { c: customers[1], height: 72, color: "#7c3aed", glow: "rgba(124,58,237,0.45)", rank: 2 },
    { c: customers[0], height: 104, color: "#e11d48", glow: "rgba(225,29,72,0.55)", rank: 1 },
    { c: customers[2], height: 52, color: "#2563eb", glow: "rgba(37,99,235,0.40)", rank: 3 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm transition-all duration-300 hover:shadow-[0_8px_40px_rgba(225,29,72,0.10)] dark:hover:shadow-[0_8px_40px_rgba(225,29,72,0.22)]">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Best customers</h3>
              <p className="text-xs text-[#8E8E93] mt-0.5">Ranked by total spend this period</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-sky-500" />
            </div>
          </div>

          {customers.length === 0 ? (
            <EmptyMini />
          ) : (
            <>
              {/* Animated podium */}
              <div className="flex items-end justify-center gap-4 mb-6" style={{ height: 172 }}>
                {podiumSlots.map(({ c, height, color, glow, rank }) =>
                  !c ? (
                    <div key={rank} className="w-20" />
                  ) : (
                    <div key={c.id} className="flex flex-col items-center gap-1">
                      {/* Avatar */}
                      <motion.div
                        className="relative mb-0.5"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + rank * 0.08, duration: 0.45, type: "spring", stiffness: 260, damping: 20 }}
                      >
                        {rank === 1 && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 absolute -top-3.5 left-1/2 -translate-x-1/2" />
                        )}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-white/30"
                          style={{ backgroundColor: color }}
                        >
                          {c.initials}
                        </div>
                      </motion.div>
                      {/* Name */}
                      <p className="text-[10px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7] truncate max-w-[76px] text-center">
                        {c.name.split(" ")[0]}
                      </p>
                      <p className="text-[9px] text-[#8E8E93] truncate max-w-[76px] text-center">
                        {currency.format(c.revenue)}
                      </p>
                      {/* Rising bar */}
                      <motion.div
                        className="w-20 rounded-t-xl flex items-end justify-center pb-1.5"
                        style={{
                          backgroundColor: `${color}15`,
                          borderTop: `2.5px solid ${color}`,
                          boxShadow: `0 -4px 18px ${glow}`,
                        }}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height, opacity: 1 }}
                        transition={{ delay: 0.12 + rank * 0.09, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="text-[11px] font-bold" style={{ color }}>#{rank}</span>
                      </motion.div>
                    </div>
                  )
                )}
              </div>

              {/* Ranked list */}
              <div className="space-y-2">
                {customers.slice(0, 8).map((c, i) => {
                  const pct = Math.min(100, (c.revenue / (customers[0]?.revenue || 1)) * 100);
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.07 * i + 0.32, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3 rounded-2xl bg-[#F9F9FB] dark:bg-[#2C2C2E]/40 px-3 py-2.5 group"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-[#1C1C1E] dark:text-[#F2F2F7] truncate">{c.name}</p>
                          {i === 0 && (
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8E8E93]">
                          {c.bookings} visit{c.bookings !== 1 ? "s" : ""}
                          {c.lastVisit
                            ? ` · ${formatDistanceToNow(new Date(c.lastVisit + "T00:00:00"), { addSuffix: true })}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 min-w-[64px]">
                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
                          {currency.format(c.revenue)}
                        </p>
                        <div className="w-full h-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] mt-1.5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: c.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.07 * i + 0.5, duration: 0.65, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
    <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Customer reviews</h3>
            <p className="text-xs text-[#8E8E93] mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""} total</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-sky-500" strokeWidth={2.5} />
          </div>
        </div>

        {reviews.length === 0 ? (
          <EmptyMini />
        ) : (
          <div className="space-y-5">
            {/* Rating overview */}
            <div className="flex items-center gap-5">
              <div className="text-center shrink-0">
                <p className="text-5xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] tabular-nums">
                  {avgRating.toFixed(1)}
                </p>
                <div className="flex justify-center gap-0.5 my-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(avgRating)
                          ? "fill-[#FFCC00] text-[#FFCC00]"
                          : "text-[#E5E5EA] dark:text-[#3A3A3C]"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#8E8E93]">{reviews.length} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {distribution.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-[#8E8E93] w-3 shrink-0">{star}</span>
                    <div className="flex-1 h-2 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFCC00] transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8E8E93] w-4 text-right tabular-nums shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent reviews list */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide font-semibold text-[#8E8E93]">Recent</p>
              {reviews.slice(0, 8).map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-[#F9F9FB] dark:bg-[#2C2C2E]/40 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= r.rating
                              ? "fill-[#FFCC00] text-[#FFCC00]"
                              : "text-[#E5E5EA] dark:text-[#3A3A3C]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#8E8E93]">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.reviewer_name && (
                    <p className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                      {r.reviewer_name}
                    </p>
                  )}
                  {r.comment && (
                    <p className="text-sm text-[#3A3A3C] dark:text-[#C6C6C8] leading-relaxed">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyMini() {
  return (
    <div className="rounded-2xl bg-[#F9F9FB] dark:bg-[#2C2C2E]/40 p-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1C1C1E] mx-auto flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-[#8E8E93]" />
      </div>
      <p className="text-xs text-[#8E8E93] mt-3">No data in this range yet</p>
    </div>
  );
}

export default Reports;

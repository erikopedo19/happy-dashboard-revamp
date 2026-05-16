import { useMemo, useState } from "react";
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
  LineChart,
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
  Crown,
  DollarSign,
  Download,
  Scissors,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

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

interface ServiceRow {
  id: string;
  name: string;
  color: string | null;
}

const db = supabase as any;

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
      activeServices: services.length,
      activeStylists: stylists.length,
      revenueDelta,
    };
  }, [data]);

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
                    <AreaChart data={analytics.revenueTrend} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e11d48" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93" }} />
                      <ChartTooltip
                        cursor={{ stroke: "#e11d48", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [currency.format(Number(value)), "Revenue"]}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        fill="url(#fillRev)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* KPI grid */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile
                  icon={<CalendarDays className="w-4 h-4 text-rose-600" />}
                  label="Appointments"
                  value={numberFormat.format(analytics.totalAppointments)}
                  hint={`${analytics.completionRate}% completed`}
                />
                <KpiTile
                  icon={<Users className="w-4 h-4 text-rose-600" />}
                  label="Clients"
                  value={numberFormat.format(analytics.totalCustomers)}
                  hint={`${analytics.activeStylists} stylists`}
                />
                <KpiTile
                  icon={<DollarSign className="w-4 h-4 text-rose-600" />}
                  label="Avg ticket"
                  value={currency.format(analytics.averageTicket || 0)}
                  hint="Per booking"
                />
                <KpiTile
                  icon={<Scissors className="w-4 h-4 text-rose-600" />}
                  label="Services"
                  value={numberFormat.format(analytics.activeServices)}
                  hint={`${analytics.completedAppointments} completed`}
                />
              </section>

              {/* Status + Demand */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                {/* Booking status */}
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
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
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
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
                        <LineChart data={analytics.hourlyDemand} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5EA" />
                          <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8E8E93" }} />
                          <YAxis hide />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#e11d48"
                            strokeWidth={2.5}
                            dot={{ fill: "#e11d48", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Top services */}
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
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
                                className="h-full rounded-full bg-rose-500 transition-all"
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
              <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
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
                <Card className="rounded-3xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
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
                        <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#e11d48" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
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

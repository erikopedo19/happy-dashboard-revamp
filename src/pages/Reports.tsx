import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { RoseGradientButton } from "@/components/RoseGradientButton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronRight,
  Crown,
  DollarSign,
  Download,
  Plus,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  WandSparkles,
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

const colorPalette = [
  "#111827",
  "#334155",
  "#e11d48",
  "#fb7185",
  "#fda4af",
  "#fecdd3",
];

const roseChartConfig = {
  bookings: {
    label: "Bookings",
    color: "#e11d48",
  },
  label: {
    color: "var(--background)",
  },
} satisfies ChartConfig;

const Reports = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
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
          colorPalette[serviceUsageMap.size % colorPalette.length],
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
          color: colorPalette[index % colorPalette.length],
        };
      })
      .sort((a, b) => b.score - a.score);

    const topStylist = stylistPerformance[0];

    const statusBreakdown = [
      {
        name: "Completed",
        value: completedAppointments,
        fill: "#111827",
      },
      {
        name: "Scheduled",
        value: scheduledAppointments,
        fill: "#f43f5e",
      },
      {
        name: "Cancelled",
        value: cancelledAppointments,
        fill: "#e5e7eb",
      },
    ].filter((item) => item.value > 0);

    const radialCompletion = [
      {
        name: "completion",
        value: completionRate,
        fill: "#111827",
      },
    ];

    const busiestHourMap = new Map<string, number>();
    appointments.forEach((apt) => {
      const hour = `${apt.appointment_time.slice(0, 2)}:00`;
      busiestHourMap.set(hour, (busiestHourMap.get(hour) || 0) + 1);
    });

    const hourlyDemand = Array.from(busiestHourMap.entries())
      .map(([hour, value]) => ({ hour, value }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
      .slice(0, 8);

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
      radialCompletion,
      hourlyDemand,
      activeServices: services.length,
      activeStylists: stylists.length,
    };
  }, [data]);

  const revenueChartConfig = {
    revenue: { label: "Revenue", color: "#111827" },
    appointments: { label: "Appointments", color: "#fb7185" },
  } satisfies ChartConfig;

  const servicesChartConfig = useMemo(() => {
    return analytics.serviceBreakdown.reduce((acc, item, index) => {
      acc[`service_${index}`] = {
        label: item.name,
        color: item.color || colorPalette[index % colorPalette.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [analytics.serviceBreakdown]);

  const statusChartConfig = {
    Completed: { label: "Completed", color: "#111827" },
    Scheduled: { label: "Scheduled", color: "#f43f5e" },
    Cancelled: { label: "Cancelled", color: "#e5e7eb" },
  } satisfies ChartConfig;

  const performanceChartConfig = {
    revenue: { label: "Revenue", color: "#111827" },
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
      <div className="h-screen flex w-full bg-white dark:bg-[#0c0c0c] overflow-hidden">
        <AppSidebar />

        <main className="flex-1 bg-[#F2F2F7] dark:bg-[#0c0c0c] flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-[#C6C6C8] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl">
            <div className="px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden text-[#1C1C1E] dark:text-[#F2F2F7]" />
                <h1 className="text-[17px] md:text-2xl font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                  Reports
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as RangeValue)}>
                  <SelectTrigger className="h-9 w-[140px] md:w-[160px] rounded-full border-0 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] text-sm">
                    <Calendar className="w-4 h-4 mr-1.5 text-[#8E8E93]" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl dark:bg-[#1C1C1E] dark:border-[#2C2C2E]">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                    <SelectItem value="thisMonth">This month</SelectItem>
                    <SelectItem value="lastMonth">Last month</SelectItem>
                    <SelectItem value="thisYear">This year</SelectItem>
                  </SelectContent>
                </Select>
                {!isMobile && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExport}
                    className="rounded-full h-9 px-4 bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold"
                  >
                    <Download className="h-4 w-4" strokeWidth={2.5} />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="w-full px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 pb-32 md:pb-6">
              <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                  title="Revenue"
                  value={currency.format(analytics.totalRevenue)}
                  description="Revenue generated in selected range"
                  icon={<DollarSign className="w-5 h-5 text-rose-500" />}
                  trend={`Avg ticket ${currency.format(analytics.averageTicket || 0)}`}
                />
                <MetricCard
                  title="Appointments"
                  value={numberFormat.format(analytics.totalAppointments)}
                  description="Bookings tracked in this report"
                  icon={<CalendarDays className="w-5 h-5 text-[#e11d48]" />}
                  trend={`${analytics.completionRate}% completion rate`}
                />
                <MetricCard
                  title="Clients"
                  value={numberFormat.format(analytics.totalCustomers)}
                  description="Unique customers in range"
                  icon={<Users className="w-5 h-5 text-[#34C759]" />}
                  trend={`${analytics.activeStylists} active stylists`}
                />
                <MetricCard
                  title="Services"
                  value={numberFormat.format(analytics.activeServices)}
                  description="Services contributing to performance"
                  icon={<Scissors className="w-5 h-5 text-[#fb7185]" />}
                  trend={`${analytics.completedAppointments} completed appointments`}
                />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6">
                <Card className="rounded-2xl border-0 bg-white dark:bg-[#1C1C1E] shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                          Revenue flow
                        </CardTitle>
                        <CardDescription className="text-[#8E8E93] dark:text-[#8E8E93]">
                          Income and booking volume over time
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#34C759]/10 text-[#34C759] border-0">
                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                        Live
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={revenueChartConfig}
                      className="h-[320px] w-full aspect-auto"
                    >
                      <AreaChart data={analytics.revenueTrend}>
                        <defs>
                          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#111827" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#111827" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillAppointments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis
                          yAxisId="left"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <YAxis yAxisId="right" orientation="right" hide />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => [
                                name === "revenue" ? currency.format(Number(value)) : value,
                                name,
                              ]}
                            />
                          }
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#111827"
                          strokeWidth={2.5}
                          fill="url(#fillRevenue)"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="appointments"
                          stroke="#fb7185"
                          strokeWidth={2}
                          fill="url(#fillAppointments)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-[#1C1C1E] text-white shadow-sm overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-white/80 mb-2">
                      <WandSparkles className="w-4 h-4" />
                      <span className="text-sm">Performance spotlight</span>
                    </div>
                    <CardTitle className="text-2xl text-white">
                      {analytics.topStylist?.name || "No stylist data yet"}
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      {analytics.topStylist
                        ? `${analytics.topStylist.title} is leading this reporting window.`
                        : "Add appointments and stylists to unlock rankings."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <SpotlightPill
                        label="Revenue"
                        value={currency.format(analytics.topStylist?.revenue || 0)}
                      />
                      <SpotlightPill
                        label="Bookings"
                        value={numberFormat.format(analytics.topStylist?.bookings || 0)}
                      />
                      <SpotlightPill
                        label="Completed"
                        value={numberFormat.format(analytics.topStylist?.completed || 0)}
                      />
                      <SpotlightPill
                        label="Satisfaction"
                        value={`${(analytics.topStylist?.satisfaction || 0).toFixed(1)}★`}
                      />
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-card/5 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white/70">Completion</p>
                          <p className="text-3xl font-semibold text-white">
                            {analytics.completionRate}%
                          </p>
                        </div>
                        <ResponsiveContainer width={110} height={110}>
                          <RadialBarChart
                            innerRadius="72%"
                            outerRadius="100%"
                            barSize={10}
                            data={analytics.radialCompletion}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar background dataKey="value" cornerRadius={999} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Styled like a premium mobile dashboard</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                  <div className="bg-white dark:bg-[#1C1C1E]">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg text-[#1C1C1E]">Service breakdown</CardTitle>
                          <CardDescription className="text-[#8E8E93]">
                            Most booked services
                          </CardDescription>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-[#FF3B30]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={roseChartConfig} className="h-[280px] w-full aspect-auto">
                        <BarChart
                          accessibilityLayer
                          data={analytics.serviceBreakdown}
                          layout="vertical"
                          margin={{
                            right: 24,
                            left: 8,
                          }}
                        >
                          <defs>
                            <linearGradient id="serviceBreakdownRose" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#fb7185" />
                              <stop offset="55%" stopColor="#f43f5e" />
                              <stop offset="100%" stopColor="#e11d48" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 18)}
                            hide
                          />
                          <XAxis dataKey="bookings" type="number" hide />
                          <ChartTooltip
                            cursor={false}
                            content={
                              <ChartTooltipContent
                                indicator="line"
                                formatter={(value, _, item) => [
                                  `${value} bookings`,
                                  item?.payload?.name || "Service",
                                ]}
                              />
                            }
                          />
                          <Bar
                            dataKey="bookings"
                            layout="vertical"
                            fill="url(#serviceBreakdownRose)"
                            radius={8}
                          >
                            <LabelList
                              dataKey="name"
                              position="insideLeft"
                              offset={10}
                              className="fill-white"
                              fontSize={12}
                            />
                            <LabelList
                              dataKey="bookings"
                              position="right"
                              offset={10}
                              className="fill-foreground"
                              fontSize={12}
                            />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 border-t border-rose-100/80 bg-card/70 text-sm">
                      <div className="flex gap-2 leading-none font-medium text-foreground">
                        Top services are trending up this period <TrendingUp className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="leading-none text-muted-foreground">
                        Rose gradient chart with minimal colors for a faster, premium feel.
                      </div>
                    </CardFooter>
                  </div>
                </Card>

                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1C1C1E]">Booking status</CardTitle>
                    <CardDescription className="text-[#8E8E93]">
                      Appointment status distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ChartContainer
                      config={statusChartConfig}
                      className="h-[260px] w-full aspect-auto"
                    >
                      <PieChart>
                        <Pie
                          data={analytics.statusBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={4}
                          cornerRadius={10}
                        >
                          {analytics.statusBreakdown.map((item) => (
                            <Cell key={item.name} fill={item.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <ChartLegend
                          content={<ChartLegendContent nameKey="name" />}
                          verticalAlign="bottom"
                        />
                      </PieChart>
                    </ChartContainer>

                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat
                        label="Completed"
                        value={numberFormat.format(analytics.completedAppointments)}
                      />
                      <MiniStat
                        label="Scheduled"
                        value={numberFormat.format(analytics.scheduledAppointments)}
                      />
                      <MiniStat
                        label="Cancelled"
                        value={numberFormat.format(analytics.cancelledAppointments)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1C1C1E]">Demand rhythm</CardTitle>
                    <CardDescription className="text-[#8E8E93]">
                      Busiest hours on your schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{ value: { label: "Bookings", color: "#111827" } }}
                      className="h-[260px] w-full aspect-auto"
                    >
                      <LineChart data={analytics.hourlyDemand}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#111827"
                          strokeWidth={3}
                          dot={{ fill: "#111827", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr] gap-6">
                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl text-[#1C1C1E]">
                          Stylist ranking
                        </CardTitle>
                        <CardDescription className="text-[#8E8E93]">
                          Ranked by revenue, completions, and satisfaction
                        </CardDescription>
                      </div>
                      <Badge className="rounded-full bg-[#fb7185]/10 text-[#fb7185] border-0">
                        <Trophy className="w-3.5 h-3.5 mr-1" />
                        Top performers
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.stylistPerformance.length === 0 ? (
                      <EmptyState />
                    ) : (
                      analytics.stylistPerformance.map((stylist, index) => (
                        <div
                          key={stylist.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-[#F2F2F7] bg-white dark:bg-[#1C1C1E] px-4 py-4 hover:bg-[#F2F2F7]/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-xl bg-[#FF3B30] text-white flex items-center justify-center font-semibold shadow-lg ">
                                {index === 0 ? (
                                  <Crown className="w-5 h-5" />
                                ) : (
                                  <span>{index + 1}</span>
                                )}
                              </div>
                              <div
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                                style={{ backgroundColor: stylist.color }}
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-[#1C1C1E] truncate">
                                  {stylist.name}
                                </p>
                                {index === 0 && (
                                  <Badge className="rounded-full bg-[#fb7185] text-white border-0">
                                    #1
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-[#8E8E93]">{stylist.title}</p>

                              <div className="flex items-center gap-4 mt-2 text-xs text-[#8E8E93]">
                                <span>{stylist.bookings} bookings</span>
                                <span>{stylist.completed} completed</span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  {stylist.satisfaction.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm text-[#8E8E93]">Revenue</p>
                            <p className="text-lg font-semibold text-[#1C1C1E]">
                              {currency.format(stylist.revenue)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl text-[#1C1C1E]">
                      Stylist revenue graph
                    </CardTitle>
                    <CardDescription className="text-[#8E8E93]">
                      Compare stylist output
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ChartContainer
                      config={performanceChartConfig}
                      className="h-[300px] w-full aspect-auto"
                    >
                      <BarChart
                        data={analytics.stylistPerformance.slice(0, 6)}
                        margin={{ left: 10, right: 10 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => value.slice(0, 6)}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => [currency.format(Number(value)), "Revenue"]}
                            />
                          }
                        />
                        <Bar dataKey="revenue" radius={16}>
                          {analytics.stylistPerformance.slice(0, 6).map((stylist) => (
                            <Cell key={stylist.id} fill={stylist.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>

                    <div className="rounded-2xl bg-[#1C1C1E] p-5 text-white">
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <Sparkles className="w-4 h-4" />
                        Insight
                      </div>
                      <p className="text-xl font-semibold">
                        {analytics.topStylist
                          ? `${analytics.topStylist.name} is your highest-impact stylist`
                          : "No stylist trend yet"}
                      </p>
                      <p className="text-sm text-white/70 mt-2">
                        Use this ranking to reward performance, optimize availability, and improve
                        team capacity planning.
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
                        <ArrowUpRight className="w-4 h-4" />
                        iOS-style analytics
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {isLoading && (
                <div className="text-sm text-[#8E8E93] px-2">
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

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <Card className="rounded-2xl border border-rose-100/80 bg-white shadow-sm shadow-rose-900/5 ring-1 ring-rose-500/10 dark:border-rose-900/30 dark:bg-[#1C1C1E] dark:ring-rose-500/15 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#8E8E93] dark:text-[#8E8E93] font-medium uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-[#1C1C1E] dark:text-[#F2F2F7] mt-2">{value}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="text-sm text-[#8E8E93] dark:text-[#8E8E93] mt-3">{description}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#34C759]">
          <TrendingUp className="w-4 h-4" />
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/5 p-3">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#F2F2F7] bg-[#F9F9F9] px-3 py-4 text-center">
      <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-[#1C1C1E] mt-1">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[#C6C6C8] bg-[#F9F9F9] p-8 text-center">
      <div className="w-14 h-14 rounded-xl bg-white border border-[#C6C6C8] mx-auto flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-[#8E8E93]" />
      </div>
      <p className="text-[#1C1C1E] font-medium mt-4">No report data yet</p>
      <p className="text-sm text-[#8E8E93] mt-2">
        Add appointments, services, and stylists to unlock the analytics page.
      </p>
    </div>
  );
}

export default Reports;

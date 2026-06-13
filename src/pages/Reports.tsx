import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileDock } from "@/components/MobileDock";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  service?: { id: string; name: string; color: string | null; duration: number | null } | null;
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
interface ServiceRow { id: string; name: string; color: string | null }
interface CustomerRow { id: string; name: string; email: string | null }
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
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "last7days":
      start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "last30days":
      start.setDate(now.getDate() - 29); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "thisMonth":
      start.setDate(1); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "lastMonth":
      start.setMonth(now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth(), 0); end.setHours(23, 59, 59, 999); break;
    case "thisYear":
      start.setMonth(0, 1); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
  }
  return {
    start, end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };
const stagger = (i: number) => ({ delay: i * 0.05, ...spring });

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
        .from("customers").select("id, name, email").eq("user_id", user.id).order("name");
      return (rows || []) as CustomerRow[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["reports-analytics", user?.id, dateRange, startDate, endDate],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { appointments: [] as AppointmentRow[], stylists: [] as StylistRow[], services: [] as ServiceRow[] };
      const [appointmentsResult, stylistsResult, servicesResult] = await Promise.all([
        db.from("appointments").select(`id, appointment_date, appointment_time, price, status, stylist_id, service_id, customer_id, service:services(id, name, color, duration)`)
          .eq("user_id", user.id).gte("appointment_date", startDate).lte("appointment_date", endDate)
          .order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true }),
        db.from("stylists").select("id, name, title, satisfaction, status, bookings_today").eq("user_id", user.id).order("name"),
        db.from("services").select("id, name, color").eq("user_id", user.id).is("deleted_at", null).order("name"),
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
    const totalRevenue = appointments.reduce((s, a) => s + (a.price || 0), 0);
    const completed = appointments.filter(a => a.status === "completed").length;
    const scheduled = appointments.filter(a => a.status === "scheduled" || a.status === "confirmed").length;
    const cancelled = appointments.filter(a => a.status === "cancelled").length;
    const totalCustomers = new Set(appointments.map(a => a.customer_id)).size;
    const averageTicket = appointments.length ? totalRevenue / appointments.length : 0;
    const completionRate = appointments.length ? Math.round((completed / appointments.length) * 100) : 0;

    const dailyMap = new Map<string, { date: string; revenue: number; appointments: number; completed: number }>();
    appointments.forEach(a => {
      const cur = dailyMap.get(a.appointment_date) || { date: a.appointment_date, revenue: 0, appointments: 0, completed: 0 };
      cur.revenue += a.price || 0; cur.appointments += 1;
      if (a.status === "completed") cur.completed += 1;
      dailyMap.set(a.appointment_date, cur);
    });
    const revenueTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      .map(i => ({ label: dayLabel(i.date), revenue: i.revenue, appointments: i.appointments, completed: i.completed }));

    const serviceMap = new Map<string, { name: string; bookings: number; revenue: number }>();
    appointments.forEach(a => {
      const n = a.service?.name || "Service";
      const e = serviceMap.get(n) || { name: n, bookings: 0, revenue: 0 };
      e.bookings += 1; e.revenue += a.price || 0;
      serviceMap.set(n, e);
    });
    const serviceBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.bookings - a.bookings).slice(0, 6);

    const stylistPerformance = stylists.map(s => {
      const apts = appointments.filter(a => a.stylist_id === s.id);
      const revenue = apts.reduce((sum, a) => sum + (a.price || 0), 0);
      const done = apts.filter(a => a.status === "completed").length;
      return {
        id: s.id, name: s.name, title: s.title || "Stylist",
        bookings: apts.length, completed: done, revenue,
        satisfaction: s.satisfaction || 0,
        score: revenue + done * 30 + (s.satisfaction || 0) * 100,
      };
    }).sort((a, b) => b.score - a.score);

    const statusBreakdown = [
      { name: "Completed", value: completed, fill: "hsl(var(--primary))" },
      { name: "Scheduled", value: scheduled, fill: "hsl(var(--muted-foreground))" },
      { name: "Cancelled", value: cancelled, fill: "hsl(var(--destructive))" },
    ].filter(i => i.value > 0);

    const dayOfWeekDemand = [0, 1, 2, 3, 4, 5, 6].map(dow => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
      count: appointments.filter(a => new Date(`${a.appointment_date}T00:00:00`).getDay() === dow).length,
    }));

    const half = Math.floor(revenueTrend.length / 2);
    const firstHalf = revenueTrend.slice(0, half).reduce((s, r) => s + r.revenue, 0);
    const secondHalf = revenueTrend.slice(half).reduce((s, r) => s + r.revenue, 0);
    const revenueDelta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    return {
      totalRevenue, totalAppointments: appointments.length, totalCustomers,
      averageTicket, completionRate, completedAppointments: completed,
      scheduledAppointments: scheduled, cancelledAppointments: cancelled,
      revenueTrend, serviceBreakdown, stylistPerformance, statusBreakdown, dayOfWeekDemand,
      activeServices: services.length, activeStylists: stylists.length, revenueDelta,
    };
  }, [data]);

  const topCustomers = useMemo<TopCustomerRow[]>(() => {
    if (!data?.appointments || !customersData.length) return [];
    const map = new Map<string, { bookings: number; revenue: number; lastVisit: string | null }>();
    data.appointments.forEach(apt => {
      if (!apt.customer_id) return;
      const prev = map.get(apt.customer_id) ?? { bookings: 0, revenue: 0, lastVisit: null };
      map.set(apt.customer_id, {
        bookings: prev.bookings + 1,
        revenue: prev.revenue + (apt.price || 0),
        lastVisit: !prev.lastVisit || apt.appointment_date > prev.lastVisit ? apt.appointment_date : prev.lastVisit,
      });
    });
    return customersData.map(c => {
      const s = map.get(c.id) ?? { bookings: 0, revenue: 0, lastVisit: null };
      const parts = c.name.trim().split(" ");
      const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
      return { id: c.id, name: c.name, bookings: s.bookings, revenue: s.revenue, lastVisit: s.lastVisit, initials: initials.toUpperCase() };
    }).filter(c => c.bookings > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [data, customersData]);

  const revenueChartConfig = { revenue: { label: "Revenue", color: "hsl(var(--primary))" } } satisfies ChartConfig;

  const handleExport = () => {
    const header = "label,revenue,appointments,completed";
    const rows = analytics.revenueTrend.map(r => `${r.label},${r.revenue},${r.appointments},${r.completed}`).join("\n");
    const blob = new Blob([`${header}\n${rows}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reports-${dateRange}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Your analytics CSV has been downloaded." });
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />

        <main className="relative flex-1 bg-background flex flex-col overflow-hidden">
          {/* Subtle ambient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-20 h-72 z-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(60% 100% at 20% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%), radial-gradient(50% 100% at 85% 0%, hsl(var(--primary) / 0.06) 0%, transparent 70%)",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            }}
          />

          {/* Header */}
          <header className="sticky top-0 z-20 bg-background/75 backdrop-blur-xl border-b border-border">
            <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden" />
                <motion.div className="min-w-0" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Insights</p>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
                </motion.div>
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring} whileTap={{ scale: 0.96 }}>
                <Button variant="secondary" size="sm" onClick={handleExport} className="rounded-full gap-1.5 h-9">
                  <Download className="h-4 w-4" />
                  {!isMobile && "Export"}
                </Button>
              </motion.div>
            </div>

            <div className="px-4 md:px-8 pb-3">
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as RangeValue)}>
                <ScrollArea className="w-full md:w-auto">
                  <TabsList className="h-9">
                    {RANGES.map((r) => (
                      <TabsTrigger key={r.value} value={r.value} className="h-7 px-3 text-xs">
                        {isMobile ? r.short : r.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" className="hidden" />
                </ScrollArea>
              </Tabs>
            </div>
          </header>

          <div className="relative z-10 flex-1 overflow-auto">
            <div className="w-full px-4 md:px-8 py-5 md:py-8 space-y-5 md:space-y-6 pb-32 md:pb-10 max-w-[1320px] mx-auto">

              {/* HERO */}
              <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                <Card className="overflow-hidden border-border/60">
                  <CardContent className="p-5 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total revenue</p>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={analytics.totalRevenue}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.35 }}
                            className="text-4xl md:text-6xl font-bold mt-1.5 tracking-tight tabular-nums"
                          >
                            {currency.format(analytics.totalRevenue)}
                          </motion.p>
                        </AnimatePresence>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "gap-1 rounded-full font-semibold",
                              analytics.revenueDelta >= 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/15"
                            )}
                          >
                            {analytics.revenueDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(analytics.revenueDelta)}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">vs prior period</span>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    <ChartContainer config={revenueChartConfig} className="h-[200px] md:h-[280px] w-full aspect-auto mt-5">
                      <AreaChart data={analytics.revenueTrend} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis hide />
                        <ChartTooltip
                          cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                          content={<ChartTooltipContent formatter={(value) => [currency.format(Number(value)), "Revenue"]} />}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#fillRev)" animationDuration={900} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </motion.section>

              {/* KPIs */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile index={0} icon={<CalendarDays className="w-4 h-4" />} label="Bookings"
                  value={numberFormat.format(analytics.totalAppointments)} hint={`${analytics.completionRate}% done`} loading={isLoading} />
                <KpiTile index={1} icon={<Users className="w-4 h-4" />} label="Clients"
                  value={numberFormat.format(analytics.totalCustomers)} hint={`${analytics.activeStylists} stylists`} loading={isLoading} />
                <KpiTile index={2} icon={<DollarSign className="w-4 h-4" />} label="Avg ticket"
                  value={currency.format(analytics.averageTicket || 0)} hint="Per booking" loading={isLoading} />
                <KpiTile index={3} icon={<Scissors className="w-4 h-4" />} label="Services"
                  value={numberFormat.format(analytics.activeServices)} hint={`${analytics.completedAppointments} done`} loading={isLoading} />
              </section>

              {/* Status + Days */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <SectionCard title="Booking status" subtitle="Distribution this period" delay={0.05}>
                  {analytics.statusBreakdown.length === 0 ? <EmptyMini /> : (
                    <div className="flex items-center gap-5">
                      <div className="relative w-36 h-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={analytics.statusBreakdown} dataKey="value" nameKey="name"
                              innerRadius={48} outerRadius={68} paddingAngle={4} cornerRadius={8} strokeWidth={0} animationDuration={900}>
                              {analytics.statusBreakdown.map(i => <Cell key={i.name} fill={i.fill} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold tracking-tight tabular-nums">{analytics.completionRate}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">done</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2.5">
                        {analytics.statusBreakdown.map((s, i) => (
                          <motion.div key={s.name} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i)} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                              <span className="text-sm truncate">{s.name}</span>
                            </div>
                            <span className="text-sm font-semibold tabular-nums">{s.value}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Busiest days" subtitle="Bookings by day of week" delay={0.1}>
                  {analytics.dayOfWeekDemand.every(d => d.count === 0) ? <EmptyMini /> : (
                    <ChartContainer config={{ count: { label: "Bookings", color: "hsl(var(--primary))" } }} className="h-[160px] w-full aspect-auto">
                      <BarChart data={analytics.dayOfWeekDemand} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barCategoryGap="22%">
                        <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[8, 8, 8, 8]} animationDuration={900}>
                          {analytics.dayOfWeekDemand.map((entry, i) => {
                            const max = Math.max(...analytics.dayOfWeekDemand.map(d => d.count), 1);
                            const opacity = 0.30 + (entry.count / max) * 0.70;
                            return <Cell key={i} fill={`hsl(var(--primary) / ${opacity})`} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </SectionCard>
              </section>

              {/* Top services */}
              <SectionCard title="Top services" subtitle="Most booked in this period" delay={0.15}>
                {analytics.serviceBreakdown.length === 0 ? <EmptyMini /> : (
                  <div className="space-y-4">
                    {analytics.serviceBreakdown.map((s, idx) => {
                      const max = analytics.serviceBreakdown[0]?.bookings || 1;
                      const pct = (s.bookings / max) * 100;
                      return (
                        <motion.div key={s.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={stagger(idx)} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Badge variant="outline" className="rounded-md h-6 w-6 p-0 justify-center tabular-nums text-[11px]">
                                {idx + 1}
                              </Badge>
                              <span className="font-medium truncate">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-muted-foreground tabular-nums">{currency.format(s.revenue)}</span>
                              <span className="text-sm font-semibold tabular-nums">{s.bookings}</span>
                            </div>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Stylist leaderboard */}
              <SectionCard title="Stylist leaderboard" subtitle="Ranked by revenue & satisfaction" delay={0.2}>
                {analytics.stylistPerformance.length === 0 ? <EmptyMini /> : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {analytics.stylistPerformance.slice(0, 6).map((stylist, index) => (
                      <motion.div key={stylist.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger(index)}
                        className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] shrink-0",
                          index === 0 ? "bg-amber-400 text-amber-950"
                            : index === 1 ? "bg-muted text-foreground"
                            : index === 2 ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                            : "bg-muted/60 text-muted-foreground"
                        )}>
                          {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{stylist.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            <span>{stylist.bookings} bookings</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {stylist.satisfaction.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{currency.format(stylist.revenue)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Best customers */}
              <TopCustomersSection customers={topCustomers} />

              {/* Reviews */}
              <ReviewsSection reviews={reviewsData || []} />
            </div>
          </div>
          <MobileDock />
        </main>
      </div>
    </SidebarProvider>
  );
};

function SectionCard({ title, subtitle, children, delay = 0 }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 360, damping: 32 }}>
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
          {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function KpiTile({ icon, label, value, hint, index = 0, loading }: {
  icon: React.ReactNode; label: string; value: string; hint: string; index?: number; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 380, damping: 30 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="border-border/60 hover:border-border transition-colors h-full">
        <CardContent className="p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
            {icon}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-20 mt-1" />
          ) : (
            <motion.p
              key={value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="text-xl md:text-2xl font-bold mt-0.5 tabular-nums tracking-tight"
            >
              {value}
            </motion.p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TopCustomersSection({ customers }: { customers: TopCustomerRow[] }) {
  return (
    <SectionCard title="Best customers" subtitle="Ranked by spend this period" delay={0.25}>
      {customers.length === 0 ? <EmptyMini /> : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {customers.map((c, i) => {
            const pct = Math.min(100, (c.revenue / (customers[0]?.revenue || 1)) * 100);
            return (
              <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i)}
                className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{c.initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    {i === 0 && (
                      <Badge className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-amber-950 hover:bg-amber-400">
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {c.bookings} visit{c.bookings !== 1 ? "s" : ""}
                    {c.lastVisit ? ` · ${formatDistanceToNow(new Date(c.lastVisit + "T00:00:00"), { addSuffix: true })}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 min-w-[80px]">
                  <p className="text-sm font-semibold tabular-nums">{currency.format(c.revenue)}</p>
                  <Progress value={pct} className="h-1 mt-1" />
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
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <SectionCard title="Customer reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""} total`} delay={0.3}>
      {reviews.length === 0 ? <EmptyMini /> : (
        <div className="space-y-5">
          <div className="flex items-center gap-5">
            <div className="text-center shrink-0">
              <p className="text-5xl font-bold tabular-nums tracking-tight leading-none">{avgRating.toFixed(1)}</p>
              <div className="flex justify-center gap-0.5 mt-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn("w-3.5 h-3.5", s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{reviews.length} reviews</p>
            </div>
            <Separator orientation="vertical" className="h-20" />
            <div className="flex-1 space-y-1.5">
              {distribution.map(({ star, count }, i) => (
                <motion.div key={star} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={stagger(i)} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-3 shrink-0 tabular-nums">{star}</span>
                  <Progress value={(count / maxCount) * 100} className="h-1.5 flex-1 [&>div]:bg-amber-400" />
                  <span className="text-[11px] text-muted-foreground w-4 text-right tabular-nums shrink-0">{count}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">Recent</p>
            {reviews.slice(0, 6).map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={stagger(i)}
                className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn("w-3.5 h-3.5", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                {r.reviewer_name && <p className="text-xs font-semibold">{r.reviewer_name}</p>}
                {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{r.comment}&rdquo;</p>}
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
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground mt-3">No data in this range yet</p>
    </div>
  );
}

export default Reports;

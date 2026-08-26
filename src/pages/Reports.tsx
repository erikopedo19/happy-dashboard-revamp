import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@heroui/react";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/beui-tabs";
import {
  ExpandableActionBar,
  type ExpandableActionBarItem,
} from "@/components/ui/be-ui-expanable-action-bar";
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
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Check,
  Clock,

  Crown,
  DollarSign,
  Download,
  Flame,
  Lightbulb,
  Lock,
  PieChart as PieChartIcon,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { RevenuePipelineCard } from "@/components/reports/RevenuePipelineCard";

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

const iOS = {
  blue: "#0A84FF",
  green: "#30D158",
  indigo: "#5E5CE6",
  orange: "#FF9F0A",
  pink: "#FF375F",
  rose: "#FF2D6F",
  rosesoft: "#FF6B95",
  yellow: "#FFD60A",
  grey: "#8E8E93",
  card: "#1C1C1E",
  cardDark: "#000000",
  surface: "#2C2C2E",
  surfaceDark: "#1C1C1E",
  glass: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
  textPrimary: "#FFFFFF",
  textSecondary: "#98989F",
  accent: "#007AFF",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
};

const AVATAR_TINTS = [iOS.rose, iOS.blue, iOS.indigo, iOS.green, iOS.orange, iOS.yellow];

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
const springSoft = { type: "spring" as const, stiffness: 350, damping: 32 };
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
      { name: "Completed", value: completed, fill: iOS.green },
      { name: "Scheduled", value: scheduled, fill: iOS.blue },
      { name: "Cancelled", value: cancelled, fill: iOS.pink },
    ].filter(i => i.value > 0);

    const dayOfWeekDemand = [0, 1, 2, 3, 4, 5, 6].map(dow => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
      count: appointments.filter(a => new Date(`${a.appointment_date}T00:00:00`).getDay() === dow).length,
    }));

    const hourlyDemand = Array.from({ length: 13 }, (_, i) => i + 8).map(hour => ({
      hour: hour <= 12 ? `${hour}${hour === 12 ? "pm" : "am"}` : `${hour - 12}pm`,
      count: appointments.filter(a => parseInt((a.appointment_time || "0").split(":")[0], 10) === hour).length,
    }));
    const peakHour = hourlyDemand.reduce((best, h) => (h.count > best.count ? h : best), hourlyDemand[0]);

    const half = Math.floor(revenueTrend.length / 2);
    const firstHalf = revenueTrend.slice(0, half).reduce((s, r) => s + r.revenue, 0);
    const secondHalf = revenueTrend.slice(half).reduce((s, r) => s + r.revenue, 0);
    const revenueDelta = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    const busiestDay = dayOfWeekDemand.reduce((best, d) => (d.count > best.count ? d : best), dayOfWeekDemand[0]);

    return {
      totalRevenue, totalAppointments: appointments.length, totalCustomers,
      averageTicket, completionRate, completedAppointments: completed,
      scheduledAppointments: scheduled, cancelledAppointments: cancelled,
      revenueTrend, serviceBreakdown, stylistPerformance, statusBreakdown, dayOfWeekDemand,
      hourlyDemand, peakHour, busiestDay,
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

  const revenueChartConfig = { revenue: { label: "Revenue", color: iOS.blue } } satisfies ChartConfig;

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

  const revenueRef = useRef<HTMLDivElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);
  const kpisRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const peakRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const stylistsRef = useRef<HTMLDivElement>(null);
  const customersRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const sectionRefs = {
    revenue: revenueRef,
    insights: insightsRef,
    kpis: kpisRef,
    status: statusRef,
    peak: peakRef,
    services: servicesRef,
    stylists: stylistsRef,
    customers: customersRef,
    reviews: reviewsRef,
  };

  const [activeSection, setActiveSection] = useState("revenue");

  const scrollTo = (id: string) => {
    const ref = sectionRefs[id as keyof typeof sectionRefs];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const actionItems: ExpandableActionBarItem[] = useMemo(
    () => [
      { id: "revenue", label: "Revenue", icon: <TrendingUp className="h-4 w-4" />, onClick: () => scrollTo("revenue") },
      { id: "insights", label: "Insights", icon: <Lightbulb className="h-4 w-4" />, onClick: () => scrollTo("insights") },
      { id: "kpis", label: "KPIs", icon: <Activity className="h-4 w-4" />, onClick: () => scrollTo("kpis") },
      { id: "status", label: "Status", icon: <PieChartIcon className="h-4 w-4" />, onClick: () => scrollTo("status") },
      { id: "peak", label: "Peak hours", icon: <Clock className="h-4 w-4" />, onClick: () => scrollTo("peak") },
      { id: "services", label: "Services", icon: <Scissors className="h-4 w-4" />, onClick: () => scrollTo("services") },
      { id: "stylists", label: "Stylists", icon: <Crown className="h-4 w-4" />, onClick: () => scrollTo("stylists") },
      { id: "customers", label: "Customers", icon: <Users className="h-4 w-4" />, onClick: () => scrollTo("customers") },
      { id: "reviews", label: "Reviews", icon: <Star className="h-4 w-4" />, onClick: () => scrollTo("reviews") },
      { id: "export", label: "Export", icon: <Download className="h-4 w-4" />, onClick: handleExport },
    ],
    [handleExport],
  );

  useEffect(() => {
    if (isMobile) return;
    const container = document.querySelector("main > div.relative.z-10.flex-1.overflow-auto");
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { root: container, threshold: 0.4 },
    );

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [isMobile]);

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="h-screen flex w-full overflow-hidden bg-[#0A0A0C] font-geist">
        <AppSidebar />
        <main className="relative flex-1 flex flex-col overflow-y-auto bg-[#0A0A0C] text-white">
          {/* Ambient gradient backdrop — deep blue wash fading into black */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] z-0 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[340px] bg-[linear-gradient(180deg,#0C5494_0%,#0A3560_34%,rgba(12,20,36,0.55)_72%,#0A0A0C_100%)]" />
            <div className="absolute -top-36 left-1/2 h-[360px] w-[125%] -translate-x-1/2 rounded-[50%] blur-[95px] opacity-70 bg-[radial-gradient(closest-side,rgba(10,132,255,0.7),transparent)] animate-aurora-drift" />
            <div className="absolute top-[90px] left-[-12%] h-[260px] w-[260px] rounded-full blur-[95px] opacity-40 bg-[radial-gradient(circle,rgba(94,92,230,0.65),transparent_70%)] animate-aurora-drift" style={{ animationDelay: "-5s" }} />
            <div className="absolute top-[60px] right-[-14%] h-[240px] w-[240px] rounded-full blur-[90px] opacity-30 bg-[radial-gradient(circle,rgba(255,69,120,0.6),transparent_70%)] animate-aurora-drift" style={{ animationDelay: "-10s" }} />
            <div className="absolute inset-x-0 bottom-0 h-[220px] bg-gradient-to-b from-transparent to-[#0A0A0C]" />
          </div>


          {/* iOS large-title header */}
          <div className="sticky top-0 z-20 bg-gradient-to-b from-[#0A0A0C]/70 to-transparent backdrop-blur-xl">
            <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <motion.div
                  className="min-w-0 hidden md:block"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springSoft}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Analytics
                  </p>
                  <h1 className="text-[34px] md:text-[40px] font-bold text-white tracking-[-0.03em] leading-none">
                    Reports
                  </h1>
                </motion.div>
              </div>

              <motion.button
                type="button"
                onClick={handleExport}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springSoft}
                whileTap={{ scale: 0.94 }}
                className="hidden md:inline-flex shrink-0 items-center gap-2 rounded-[12px] h-10 px-4 bg-[#15151A] text-white text-[13px] font-semibold border border-white/[0.08] hover:bg-[#22222A] transition-colors"
              >
                <Download className="h-4 w-4" strokeWidth={2.3} />
                Export
              </motion.button>
            </div>

            {/* Apple-style segmented date range (desktop only; mobile view has its own) */}
            {!isMobile && (
              <div className="px-4 md:px-8 pb-4">
                <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as RangeValue)} variant="segment">
                  <TabsList className="w-full md:w-auto bg-[#15151A]">
                    {RANGES.map((r) => (
                      <Fragment key={r.value}>
                        <TabsTrigger value={r.value} className="flex-1 md:flex-none" indicatorClassName="bg-[#FF375F]">
                          <span className="relative">{r.label}</span>
                        </TabsTrigger>
                      </Fragment>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1 overflow-auto">
            {isMobile && (
              <MobileReportsView
                analytics={analytics}
                isLoading={isLoading}
                topCustomers={topCustomers}
                reviews={reviewsData || []}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onExport={handleExport}
              />
            )}
            <div className={cn("w-full px-4 md:px-8 py-5 md:py-8 space-y-5 md:space-y-6 pb-32 md:pb-10 max-w-[1320px] mx-auto", isMobile && "hidden")}>

              {/* Hero revenue card */}
              <motion.div
                id="revenue"
                ref={sectionRefs.revenue}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springSoft}
              >
                <Card className="relative rounded-[24px] border border-white/[0.08] bg-[#15151A] overflow-hidden">
                  <CardContent className="relative p-6 md:p-8">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF375F]">
                          Total revenue
                        </p>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={analytics.totalRevenue}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-[44px] md:text-[60px] font-bold text-white mt-2 tracking-[-0.035em] leading-none tabular-nums font-geist-mono"
                            style={{}}
                          >
                            {isLoading ? "—" : currency.format(analytics.totalRevenue)}
                          </motion.p>
                        </AnimatePresence>
                        <div className="mt-4 flex items-center gap-2.5">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] text-[11px] font-semibold border",
                              analytics.revenueDelta >= 0
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-[#FF375F]/10 text-[#FF375F] border-[#FF375F]/20"
                            )}
                          >
                            {analytics.revenueDelta >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.3} />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.3} />
                            )}
                            {Math.abs(analytics.revenueDelta)}%
                          </div>
                          <span className="text-xs text-white/50">vs prior period</span>
                        </div>
                      </div>

                      {/* iOS radial gauge — completion rate */}
                      <CompletionGauge value={analytics.completionRate} />
                    </div>

                    <ChartContainer
                      config={revenueChartConfig}
                      className="h-[220px] md:h-[300px] w-full aspect-auto mt-6"
                    >
                      <AreaChart data={analytics.revenueTrend} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                          interval="preserveStartEnd"
                          dy={6}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={42}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                          tickFormatter={(v) => {
                            const n = Number(v);
                            if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
                            return String(n);
                          }}
                        />
                        <ChartTooltip
                          cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 4" }}
                          content={<ChartTooltipContent formatter={(value) => [currency.format(Number(value)), "Revenue"]} />}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={iOS.rose}
                          strokeWidth={2.4}
                          fill={iOS.rose}
                          fillOpacity={0.08}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))", fill: iOS.rose }}
                          animationDuration={900}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Smart insights */}
              {analytics.totalAppointments > 0 && (
                <div id="insights" ref={sectionRefs.insights} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <InsightCard
                    index={0}
                    icon={<Flame className="w-4 h-4" strokeWidth={2.3} />}
                    tint={iOS.orange}
                    title="Busiest day"
                    text={`${analytics.busiestDay?.day ?? "—"} is your hottest day with ${analytics.busiestDay?.count ?? 0} bookings. Consider premium pricing.`}
                  />
                  <InsightCard
                    index={1}
                    icon={<Clock className="w-4 h-4" strokeWidth={2.3} />}
                    tint={iOS.blue}
                    title="Peak hour"
                    text={`Most clients book around ${analytics.peakHour?.hour ?? "—"}. Keep your best stylists on that slot.`}
                  />
                  <InsightCard
                    index={2}
                    icon={<TrendingUp className="w-4 h-4" strokeWidth={2.3} />}
                    tint={analytics.revenueDelta >= 0 ? iOS.green : iOS.pink}
                    title={analytics.revenueDelta >= 0 ? "Trending up" : "Trending down"}
                    text={
                      analytics.revenueDelta >= 0
                        ? `Revenue is up ${analytics.revenueDelta}% vs the first half of this period. Keep it rolling.`
                        : `Revenue dipped ${Math.abs(analytics.revenueDelta)}% — try a reminder blast or promo on slow days.`
                    }
                  />
                </div>
              )}

              {/* KPI grid */}
              <div id="kpis" ref={sectionRefs.kpis} className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <KpiTile index={0} loading={isLoading}
                  icon={<CalendarDays className="w-4 h-4" strokeWidth={2.3} />}
                  label="Bookings"
                  value={numberFormat.format(analytics.totalAppointments)}
                  hint={`${analytics.completionRate}% done`}
                  tint={iOS.rose}
                />
                <KpiTile index={1} loading={isLoading}
                  icon={<Users className="w-4 h-4" strokeWidth={2.3} />}
                  label="Clients"
                  value={numberFormat.format(analytics.totalCustomers)}
                  hint={`${analytics.activeStylists} stylists`}
                  tint={iOS.blue}
                />
                <KpiTile index={2} loading={isLoading}
                  icon={<DollarSign className="w-4 h-4" strokeWidth={2.3} />}
                  label="Avg ticket"
                  value={currency.format(analytics.averageTicket || 0)}
                  hint="Per booking"
                  tint={iOS.green}
                />
                <KpiTile index={3} loading={isLoading}
                  icon={<Scissors className="w-4 h-4" strokeWidth={2.3} />}
                  label="Services"
                  value={numberFormat.format(analytics.activeServices)}
                  hint={`${analytics.completedAppointments} done`}
                  tint={iOS.indigo}
                />
              </div>

              <RevenuePipelineCard />


              {/* Status + busiest days */}
              <div id="status" ref={sectionRefs.status} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <SectionCard title="Booking status" subtitle="Distribution this period" delay={0.05}>
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
                          <span className="text-[9px] text-white/50 uppercase tracking-[0.14em] mt-1">done</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        {analytics.statusBreakdown.map((s, i) => (
                          <motion.div
                            key={s.name}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(i)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                              <span className="text-sm text-white truncate">{s.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-white tabular-nums">{s.value}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Busiest days" subtitle="Bookings by day of week" delay={0.1}>
                  {analytics.dayOfWeekDemand.every((d) => d.count === 0) ? (
                    <EmptyMini />
                  ) : (
                    <ChartContainer
                      config={{ count: { label: "Bookings", color: iOS.indigo } }}
                      className="h-[170px] w-full aspect-auto"
                    >
                      <BarChart data={analytics.dayOfWeekDemand} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barCategoryGap="24%">
                        <CartesianGrid vertical={false} strokeDasharray="3 8" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} />
                        <YAxis hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} animationDuration={1000}>
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
              </div>

              {/* Peak hours */}
              <SectionCard id="peak" forwardRef={sectionRefs.peak} title="Peak hours" subtitle="When your chair fills up" delay={0.12}>
                {analytics.hourlyDemand.every((h) => h.count === 0) ? (
                  <EmptyMini />
                ) : (
                  <ChartContainer
                    config={{ count: { label: "Bookings", color: iOS.blue } }}
                    className="h-[170px] w-full aspect-auto"
                  >
                    <BarChart data={analytics.hourlyDemand} margin={{ left: 0, right: 0, top: 10, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid vertical={false} strokeDasharray="3 8" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} interval={1} />
                      <YAxis hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} animationDuration={1000}>
                        {analytics.hourlyDemand.map((entry, i) => {
                          const max = Math.max(...analytics.hourlyDemand.map((h) => h.count), 1);
                          const isPeak = entry.hour === analytics.peakHour?.hour && entry.count > 0;
                          const opacity = 0.3 + (entry.count / max) * 0.7;
                          return <Cell key={i} fill={isPeak ? iOS.rose : `rgba(10,132,255,${opacity})`} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </SectionCard>

              {/* Top services */}
              <SectionCard id="services" forwardRef={sectionRefs.services} title="Top services" subtitle="Most booked in this period" delay={0.15}>
                {analytics.serviceBreakdown.length === 0 ? (
                  <EmptyMini />
                ) : (
                  <div className="space-y-4">
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
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-[10px] bg-white/10 text-[11px] font-semibold text-white/50 flex items-center justify-center tabular-nums">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-white truncate">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-white/50 tabular-nums">{currency.format(s.revenue)}</span>
                              <span className="text-sm font-semibold text-white tabular-nums">{s.bookings}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-[10px] bg-white/10 overflow-hidden">
                            <motion.div
                              className="h-full rounded-[10px] bg-[#FF375F]"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.05 * idx + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              {/* Stylist leaderboard */}
              <SectionCard id="stylists" forwardRef={sectionRefs.stylists} title="Stylist leaderboard" subtitle="Ranked by revenue & satisfaction" delay={0.2}>
                {analytics.stylistPerformance.length === 0 ? (
                  <EmptyMini />
                ) : (
                  <div className="rounded-[16px] bg-white/5 overflow-hidden divide-y divide-white/[0.06]">
                    {analytics.stylistPerformance.slice(0, 6).map((stylist, index) => (
                      <motion.div
                        key={stylist.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index, ...springSoft }}
                        whileTap={{ scale: 0.98, backgroundColor: "rgba(255,255,255,0.1)" }}
                        className="flex items-center gap-3.5 px-4 py-3.5 transition-colors"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-[14px] flex items-center justify-center font-bold text-sm shrink-0",
                            index === 0
                              ? "bg-[#FFD60A] text-black"
                              : index === 1
                              ? "bg-[#22222A] text-white"
                              : index === 2
                              ? "bg-orange-500/25 text-orange-400"
                              : "bg-white/10 text-white/50"
                          )}
                        >
                          {index === 0 ? <Crown className="w-4 h-4" strokeWidth={2.3} /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[15px] text-white truncate">{stylist.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-white/50 mt-0.5">
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
                        <ChevronRight className="w-4 h-4 text-white/50 shrink-0" strokeWidth={2.3} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <TopCustomersSection id="customers" forwardRef={sectionRefs.customers} customers={topCustomers} />
              <ReviewsSection id="reviews" forwardRef={sectionRefs.reviews} reviews={reviewsData || []} />
            </div>
          </div>

          {/* Floating expandable action bar — PC only */}
          {!isMobile && (
            <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-50 flex justify-center">
              <div className="pointer-events-auto">
                <ExpandableActionBar
                  items={actionItems}
                  activeId={activeSection}
                  onAction={(item) => {
                    setActiveSection(item.id);
                    item.onClick?.();
                  }}
                  classNames={{
                    root: "drop-shadow-2xl",
                    track: "bg-[#15151A]/80 border-white/[0.08] shadow-2xl backdrop-blur-2xl",
                    item: "group data-[active=true]:text-white",
                    activeItem: "text-white",
                  }}
                />
              </div>
            </div>
          )}

          {!user && <LoginNudge delaySec={40} />}
        </main>
      </div>
    </SidebarProvider>
  );
};

function SectionCard({
  id,
  forwardRef,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  id?: string;
  forwardRef?: Ref<HTMLDivElement>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      id={id}
      ref={forwardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 400, damping: 28 }}
      className="relative rounded-[28px] border border-white/[0.08] bg-[#15151A]"
    >
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white tracking-tight">{title}</h3>
          {subtitle && <p className="text-sm text-white/50 mt-2">{subtitle}</p>}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function KpiTile({ icon, label, value, hint, index = 0, tint, loading }: {
  icon: ReactNode; label: string; value: string; hint: string;
  index?: number; tint: string; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 420, damping: 30 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-[24px] border border-white/[0.08] bg-[#15151A] h-full"
    >
      <div className="p-6 h-full">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-[16px] flex items-center justify-center"
            style={{
              backgroundColor: `${tint}15`,
              color: tint,
            }}
          >
            {icon}
          </div>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="opacity-60"
          >
            <Activity className="w-5 h-5 text-white/50" />
          </motion.div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50 mb-2">{label}</p>
        {loading ? (
          <div className="h-8 w-24 bg-white/10 rounded-[12px] animate-pulse" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 400 }}
            >
              <p className="text-2xl md:text-3xl font-bold text-white tabular-nums tracking-tight">
                {value}
              </p>
              <p className="text-xs text-white/50 mt-1">{hint}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

function TopCustomersSection({
  id,
  forwardRef,
  customers,
}: {
  id?: string;
  forwardRef?: Ref<HTMLDivElement>;
  customers: TopCustomerRow[];
}) {
  return (
    <SectionCard id={id} forwardRef={forwardRef} title="Best customers" subtitle="Ranked by spend this period" delay={0.25}>
      {customers.length === 0 ? (
        <EmptyMini />
      ) : (
        <div className="rounded-2xl bg-white/5 overflow-hidden divide-y divide-white/[0.06]">
          {customers.map((c, i) => {
            const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
            const pct = Math.min(100, (c.revenue / (customers[0]?.revenue || 1)) * 100);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.045 * i, ...springSoft }}
                whileTap={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                className="flex items-center gap-3.5 px-4 py-3.5"
              >
                <Avatar
                  name={c.initials || "?"}
                  className="h-10 w-10 rounded-[12px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[15px] text-white truncate">{c.name}</p>
                    {i === 0 && (
                      <span className="inline-flex h-4 items-center px-1.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFD60A] text-black rounded-[6px]">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {c.bookings} visit{c.bookings !== 1 ? "s" : ""}
                    {c.lastVisit ? ` · ${formatDistanceToNow(new Date(c.lastVisit + "T00:00:00"), { addSuffix: true })}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 min-w-[75px]">
                  <p className="text-[15px] font-semibold text-white tabular-nums">{currency.format(c.revenue)}</p>
                  <div className="w-full h-1.5 rounded-[10px] bg-white/10 mt-1.5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-[10px]"
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

function ReviewsSection({
  id,
  forwardRef,
  reviews,
}: {
  id?: string;
  forwardRef?: Ref<HTMLDivElement>;
  reviews: ReviewRow[];
}) {
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));
  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <SectionCard id={id} forwardRef={forwardRef} title="Customer reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""} total`} delay={0.3}>
      {reviews.length === 0 ? (
        <EmptyMini />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <motion.div
              className="text-center shrink-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springSoft}
            >
              <p className="text-5xl font-bold text-white tabular-nums tracking-[-0.025em] leading-none">
                {avgRating.toFixed(1)}
              </p>
              <div className="flex justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "w-4 h-4",
                      s <= Math.round(avgRating) ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/30"
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-white/50 mt-1.5">{reviews.length} reviews</p>
            </motion.div>
            <div className="flex-1 space-y-2">
              {distribution.map(({ star, count }, i) => (
                <motion.div
                  key={star}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={stagger(i)}
                  className="flex items-center gap-2.5"
                >
                  <span className="text-[11px] text-white/50 w-3 shrink-0 tabular-nums">{star}</span>
                  <div className="flex-1 h-2 rounded-[10px] bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-[10px] bg-[#FFD60A]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ delay: i * 0.05 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="text-[11px] text-white/50 w-4 text-right tabular-nums shrink-0">{count}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-white/50">Recent</p>
            {reviews.slice(0, 6).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.045 * i, ...springSoft }}
                className="rounded-[16px] bg-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn("w-3.5 h-3.5", s <= r.rating ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/30")} />
                    ))}
                  </div>
                  <span className="text-[10px] text-white/50">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                {r.reviewer_name && <p className="text-sm font-semibold text-white">{r.reviewer_name}</p>}
                {r.comment && <p className="text-sm text-white/50 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function InsightCard({ icon, tint, title, text, index = 0 }: {
  icon: ReactNode; tint: string; title: string; text: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08 * index, ...springSoft }}
      whileHover={{ y: -2 }}
      className="relative rounded-[18px] bg-[#15151A] border border-white/[0.08] p-5"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${tint}20`, color: tint }}
        >
          {icon}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3 text-white/50" strokeWidth={2.3} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Insight</span>
        </div>
      </div>
      <p className="relative text-[15px] font-bold text-white tracking-tight">{title}</p>
      <p className="relative text-[12px] text-white/50 mt-1 leading-relaxed">{text}</p>
    </motion.div>
  );
}

function EmptyMini() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springSoft}
      className="rounded-[16px] bg-white/5 p-10 text-center"
    >
      <div className="w-11 h-11 rounded-[14px] bg-white/10 mx-auto flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white/50" strokeWidth={2.3} />
      </div>
      <p className="text-xs text-white/50 mt-3.5">No data in this range yet</p>
    </motion.div>
  );
}

function CompletionGauge({ value }: { value: number }) {
  // Smooth iOS-style semicircular progress ring with a rose gradient
  const radius = 82;
  const stroke = 14;
  const cx = 100;
  const cy = 100;
  const clamped = Math.max(0, Math.min(100, value));
  const arc = Math.PI * radius; // semicircle length
  const dash = (clamped / 100) * arc;

  return (
    <div className="relative w-[160px] h-[100px] shrink-0">
      <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gauge-rose" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={iOS.rose} />
            <stop offset="100%" stopColor={iOS.pink} />
          </linearGradient>
        </defs>
        {/* background track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* filled progress arc */}
        <motion.path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gauge-rose)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arc}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: arc - dash }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 10px rgba(255,45,111,0.5))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
        <span className="text-[26px] font-bold text-white tabular-nums leading-none tracking-tight">
          {value}%
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#FF375F] mt-1 font-semibold">done</span>
      </div>
    </div>
  );
}

function LoginNudge({ delaySec = 40 }: { delaySec?: number }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("reports-login-nudge-dismissed")) return;
    const t = setTimeout(() => setShow(true), delaySec * 1000);
    return () => clearTimeout(t);
  }, [delaySec]);
  const close = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("reports-login-nudge-dismissed", "1");
  };
  if (dismissed) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="relative rounded-[26px] border border-white/[0.08] bg-[#15151A] p-4">
            <div className="relative flex items-center gap-3.5">
              <motion.div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 bg-[#FF375F]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Lock className="w-5 h-5 text-white" strokeWidth={2.4} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white leading-tight">
                  Save your insights
                </p>
                <p className="text-[12px] text-white/50 mt-0.5">
                  Sign in to unlock live tracking, exports & alerts.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Dismiss"
                className="w-8 h-8 rounded-[12px] bg-white/10 text-white/50 flex items-center justify-center hover:bg-[#22222A] transition-colors shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={2.4} />
              </button>
            </div>
            <div className="relative mt-3.5 flex items-center gap-2.5">
              <Link
                to={`/auth?next=${encodeURIComponent(window.location.pathname)}`}
                className="flex-1 h-11 rounded-[12px] bg-[#FF375F] text-white text-[14px] font-semibold flex items-center justify-center active:scale-[0.98] transition-transform"
              >
                Sign in
              </Link>
              <Link
                to="/auth?signup=1"
                className="flex-1 h-11 rounded-[12px] bg-white/10 text-white text-[14px] font-semibold flex items-center justify-center border border-white/[0.08] active:scale-[0.98] transition-transform"
              >
                Create account
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── iOS 26-style mobile report components ─────────────────────────────────────
// Solid dark surfaces, no glass, round hierarchy, smooth spring animations.

function MobileCard({
  title,
  subtitle,
  children,
  delay = 0,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 360, damping: 30 }}
      className={cn("rounded-[28px] bg-[#15151A] border border-white/[0.08] overflow-hidden", className)}
    >
      {(title || subtitle) && (
        <div className="px-5 pt-5 pb-2">
          {title && <h3 className="text-[17px] font-bold text-white tracking-tight">{title}</h3>}
          {subtitle && <p className="text-[12px] text-white/50 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

function MobileStatCard({
  icon,
  label,
  value,
  hint,
  tint,
  delay = 0,
  filled = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  tint: string;
  delay?: number;
  filled?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ...springSoft }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "rounded-[24px] p-4 border",
        filled
          ? "bg-[#0A84FF] border-[#0A84FF] shadow-[0_16px_40px_-16px_rgba(10,132,255,0.9)]"
          : "bg-[#15151A] border-white/[0.08]"
      )}
    >
      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center mb-3"
        style={
          filled
            ? { backgroundColor: "rgba(255,255,255,0.18)", color: "#fff" }
            : { backgroundColor: `${tint}15`, color: tint }
        }
      >
        {icon}
      </div>
      <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", filled ? "text-white/80" : "text-white/50")}>{label}</p>
      <p className="text-[22px] font-bold text-white mt-1 tabular-nums tracking-tight">{value}</p>
      {hint && <p className={cn("text-[11px] mt-1", filled ? "text-white/75" : "text-white/50")}>{hint}</p>}
    </motion.div>
  );
}


function MobileSparkline({ data }: { data: { label: string; revenue: number }[] }) {
  if (data.length < 2) {
    return (
      <div className="h-full w-full flex items-center justify-center rounded-[20px] bg-[#1C1C1E]">
        <span className="text-[11px] text-white/40">No trend data</span>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="mobileSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={iOS.rose} stopOpacity={0.35} />
            <stop offset="100%" stopColor={iOS.rose} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={iOS.rose}
          strokeWidth={2.5}
          fill="url(#mobileSpark)"
          dot={false}
          activeDot={{ r: 4, fill: iOS.rose, stroke: "#fff", strokeWidth: 2 }}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MobileDonut({
  data,
  value,
  label,
}: {
  data: { name: string; value: number; fill: string }[];
  value: number;
  label: string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-[140px] flex items-center justify-center">
        <span className="text-[11px] text-white/40">No data</span>
      </div>
    );
  }
  return (
    <div className="relative h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={42}
            outerRadius={58}
            paddingAngle={4}
            cornerRadius={8}
            strokeWidth={0}
            animationDuration={900}
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[22px] font-bold text-white tabular-nums leading-none">{value}%</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-[#8E8E93] mt-1 font-semibold">{label}</span>
      </div>
    </div>
  );
}

function MobileBarChart({
  data,
  xKey,
  yKey,
  highlight,
  interval = 1,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  highlight?: string;
  interval?: number | "preserveStartEnd";
}) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[11px] text-white/40">No data</span>
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d[yKey]), 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 8" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9, fill: "#8E8E93", fontWeight: 500 }}
          interval={interval}
          dy={4}
        />
        <YAxis hide />
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]} animationDuration={900}>
          {data.map((entry, i) => {
            const isHighlight = highlight && entry[xKey] === highlight;
            const opacity = 0.3 + (entry[yKey] / max) * 0.7;
            return <Cell key={i} fill={isHighlight ? iOS.rose : `rgba(10,132,255,${opacity})`} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MobileReviewsSummary({ reviews }: { reviews: ReviewRow[] }) {
  const avgRating = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews]
  );
  const distribution = useMemo(
    () => [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length })),
    [reviews]
  );
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="px-5 pb-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center shrink-0">
          <p className="text-[32px] font-bold text-white tabular-nums leading-none">{avgRating.toFixed(1)}</p>
          <div className="flex justify-center gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "w-3.5 h-3.5",
                  s <= Math.round(avgRating) ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/30"
                )}
              />
            ))}
          </div>
          <p className="text-[10px] text-white/50 mt-1">{reviews.length} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count }, i) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 w-2.5 tabular-nums">{star}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[#1C1C1E] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#FFD60A]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ delay: i * 0.05 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-[10px] text-white/50 w-3 text-right tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileReportsView({
  analytics,
  isLoading,
  topCustomers,
  reviews,
  dateRange,
  setDateRange,
  onExport,
}: {
  analytics: any;
  isLoading: boolean;
  topCustomers: TopCustomerRow[];
  reviews: ReviewRow[];
  dateRange: RangeValue;
  setDateRange: (v: RangeValue) => void;
  onExport: () => void;
}) {
  const completedShare = analytics.completionRate || 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="px-4 pt-3 pb-32 space-y-4">
      {/* iOS 26 header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSoft}
      >
        <h1 className="text-[34px] font-bold text-white tracking-tight">Reports</h1>
        <p className="text-[13px] text-white/50 mt-0.5">{today}</p>
      </motion.div>

      {/* Date range */}
      <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as RangeValue)} variant="segment">
        <TabsList className="w-full bg-[#15151A]">
          {RANGES.map((r) => (
            <Fragment key={r.value}>
              <TabsTrigger value={r.value} className="flex-1" indicatorClassName="bg-[#FF375F]">
                <span className="relative">{r.short}</span>
              </TabsTrigger>
            </Fragment>
          ))}
        </TabsList>
      </Tabs>

      {/* Hero — headline stat + inline sub-stats */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSoft}
        className="rounded-[30px] bg-[#15151A] border border-white/[0.07] p-5 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.h2
                key={analytics.totalRevenue}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-[38px] font-bold text-white tabular-nums tracking-[-0.04em] leading-[1.05]"
              >
                {isLoading ? "—" : currency.format(analytics.totalRevenue)}
              </motion.h2>
            </AnimatePresence>
            <p className="text-[15px] text-white/45 mt-1">earned {RANGES.find(r => r.value === dateRange)?.short ?? ""}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
              style={{
                backgroundColor: analytics.revenueDelta >= 0 ? "rgba(48,209,88,0.15)" : "rgba(255,55,95,0.15)",
                color: analytics.revenueDelta >= 0 ? iOS.green : iOS.rose,
              }}
            >
              {analytics.revenueDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.4} /> : <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.4} />}
              {Math.abs(analytics.revenueDelta)}% vs prior
            </div>
          </div>
          <CompletionGauge value={completedShare} />
        </div>

        {/* main graphic */}
        <div className="mt-4 h-[104px] -mx-1">
          <MobileSparkline data={analytics.revenueTrend} />
        </div>

        {/* inline sub-stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "Bookings", value: numberFormat.format(analytics.totalAppointments) },
            { label: "Clients", value: numberFormat.format(analytics.totalCustomers) },
            { label: "Avg ticket", value: currency.format(analytics.averageTicket || 0) },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, ...springSoft }}
              className="rounded-[20px] bg-[#0E0E11] border border-white/[0.06] px-3 py-3.5"
            >
              <p className="text-[20px] font-bold text-white tabular-nums leading-none tracking-[-0.03em]">{s.value}</p>
              <p className="text-[11px] text-white/40 mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>

      </motion.div>

      {/* This week strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, ...springSoft }}
        className="rounded-[26px] bg-[#15151A] border border-white/[0.07] p-4"
      >
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[14px] font-semibold text-white">This week</p>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
            {analytics.dayOfWeekDemand.filter((d: any) => d.count > 0).length}
            <Flame className="w-3.5 h-3.5 text-[#FF9F0A]" strokeWidth={2.3} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          {analytics.dayOfWeekDemand.map((d: any, i: number) => {
            const isToday = new Date().getDay() === i;
            const active = d.count > 0;
            return (
              <motion.div
                key={d.day}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.04 * i, ...springSoft }}
                className={cn(
                  "flex flex-col items-center justify-between w-[38px] py-1.5 rounded-full",
                  isToday ? "bg-[#0A84FF] h-[74px] shadow-[0_10px_24px_-8px_rgba(10,132,255,0.8)]" : "h-[74px]"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums",
                    isToday
                      ? "text-white"
                      : active
                        ? "bg-white/[0.10] text-white"
                        : "bg-white/[0.05] text-white/25"
                  )}
                >
                  {isToday ? <Check className="w-4 h-4" strokeWidth={3} /> : active ? d.count : "–"}
                </div>
                <span
                  className={cn(
                    "text-[15px] font-bold uppercase",
                    isToday ? "text-white" : "text-white/30"
                  )}
                >
                  {String(d.day).slice(0, 1)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>



      {/* Summary grid */}
      <div>
        <p className="px-1 pb-2.5 text-[13px] font-semibold text-white/70">Summary</p>
        <div className="grid grid-cols-2 gap-3">
          <MobileStatCard
            delay={0.05}
            icon={<CalendarDays className="w-4 h-4" strokeWidth={2.3} />}
            label="Completed"
            value={numberFormat.format(analytics.completedAppointments)}
            hint={`${analytics.completionRate}% rate`}
            tint={iOS.green}
          />
          <MobileStatCard
            delay={0.1}
            filled
            icon={<Scissors className="w-4 h-4" strokeWidth={2.3} />}
            label="Services"
            value={numberFormat.format(analytics.activeServices)}
            hint="Active"
            tint={iOS.indigo}
          />

          <MobileStatCard
            delay={0.15}
            icon={<Users className="w-4 h-4" strokeWidth={2.3} />}
            label="Stylists"
            value={numberFormat.format(analytics.activeStylists)}
            hint="Active"
            tint={iOS.blue}
          />
          <MobileStatCard
            delay={0.2}
            icon={<DollarSign className="w-4 h-4" strokeWidth={2.3} />}
            label="Per client"
            value={currency.format(analytics.totalCustomers ? analytics.totalRevenue / analytics.totalCustomers : 0)}
            hint="Average"
            tint={iOS.rose}
          />
        </div>
      </div>



      <RevenuePipelineCard />



      {/* Status + busiest days charts */}
      <div className="grid grid-cols-2 gap-3">
        <MobileCard title="Status" subtitle="Bookings" delay={0.22}>
          <div className="pb-4">
            <MobileDonut data={analytics.statusBreakdown} value={analytics.completionRate} label="done" />
          </div>
        </MobileCard>
        <MobileCard title="Busiest day" subtitle={analytics.busiestDay?.day ?? "—"} delay={0.26}>
          <div className="h-[140px] pb-4">
            <MobileBarChart
              data={analytics.dayOfWeekDemand}
              xKey="day"
              yKey="count"
              highlight={analytics.busiestDay?.day}
              interval="preserveStartEnd"
            />
          </div>
        </MobileCard>
      </div>

      {/* Peak hours */}
      <MobileCard title="Peak hours" subtitle="Bookings by hour" delay={0.3}>
        <div className="h-[160px] pb-5">
          <MobileBarChart
            data={analytics.hourlyDemand}
            xKey="hour"
            yKey="count"
            highlight={analytics.peakHour?.hour}
            interval={2}
          />
        </div>
      </MobileCard>

      {/* Top services */}
      <MobileCard title="Top services" subtitle="Most booked this period" delay={0.34}>
        <div className="px-5 pb-5 space-y-4">
          {analytics.serviceBreakdown?.slice(0, 4).map((s: any, i: number) => {
            const max = analytics.serviceBreakdown[0]?.bookings || 1;
            const pct = (s.bookings / max) * 100;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.36 + i * 0.05, ...springSoft }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-[10px] bg-[#1C1C1E] text-[11px] font-semibold text-white/50 flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                    <span className="font-medium text-white truncate">{s.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums">{s.bookings}</span>
                </div>
                <div className="h-2 rounded-full bg-[#1C1C1E] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#FF375F]"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.36 + i * 0.05 + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </motion.div>
            );
          })}
          {(!analytics.serviceBreakdown || analytics.serviceBreakdown.length === 0) && (
            <div className="py-4 text-center">
              <p className="text-[12px] text-white/50">No services booked yet</p>
            </div>
          )}
        </div>
      </MobileCard>

      {/* Best customers */}
      {topCustomers.length > 0 && (
        <MobileCard title="Best customers" subtitle="Top spenders this period" delay={0.38}>
          <div className="px-5 pb-5 divide-y divide-white/[0.06]">
            {topCustomers.slice(0, 4).map((c, i) => {
              const tint = AVATAR_TINTS[i % AVATAR_TINTS.length];
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05, ...springSoft }}
                  whileTap={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  className="flex items-center gap-3.5 py-3.5 first:pt-0"
                >
                  <Avatar
                    name={c.initials || "?"}
                    className="h-10 w-10 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[15px] text-white truncate">{c.name}</p>
                      {i === 0 && (
                        <span className="inline-flex h-4 items-center px-1.5 text-[9px] font-bold uppercase tracking-wider bg-[#FFD60A] text-black rounded-full">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {c.bookings} visit{c.bookings !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-semibold text-white tabular-nums">{currency.format(c.revenue)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </MobileCard>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <MobileCard title="Reviews" subtitle={`${reviews.length} total`} delay={0.42}>
          <MobileReviewsSummary reviews={reviews} />
        </MobileCard>
      )}
    </div>
  );
}

export default Reports;

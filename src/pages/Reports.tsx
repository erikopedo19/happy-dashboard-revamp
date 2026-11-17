import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { inAppShell, shareFile, shareText } from "@/lib/share";
import { money, moneySymbol, setReportsCurrency } from "@/components/reports/money";
import { RevenuePipelineCard } from "@/components/reports/RevenuePipelineCard";
import { RevenueGoalCard, WinBackCard } from "@/components/reports/GrowthCards";
import {
  RANGES, analyticsCsv, computeAnalytics, computeTrend, getRangeDates, initialsOf, rankCustomers,
  type AppointmentRow, type PrevRow, type RangeValue, type ReviewRow, type StylistRow, type TopCustomerRow,
} from "@/components/reports/reportsData";

// Each layout is its own chunk: a phone never downloads the desktop charts, and the reverse.
const DesktopReports = lazy(() => import("@/components/reports/DesktopReports"));
const MobileReports = lazy(() => import("@/components/reports/MobileReports").then((m) => ({ default: m.MobileReports })));

const db = supabase as any;
const STATIC = 5 * 60_000;
const NO_ROWS: never[] = [];

const Reports = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<RangeValue>("last30days");
  const range = useMemo(() => getRangeDates(dateRange), [dateRange]);
  const uid = user?.id;

  const { data: profile } = useQuery<{ currency: string | null; booking_link: string | null; business_name: string | null; full_name: string | null } | null>({
    queryKey: ["reports-profile", uid],
    enabled: !!uid,
    staleTime: STATIC,
    queryFn: async () => (await db.from("profiles").select("currency, booking_link, business_name, full_name").eq("id", uid).maybeSingle()).data ?? null,
  });
  setReportsCurrency(profile?.currency);

  const { data: reviews = NO_ROWS as ReviewRow[] } = useQuery<ReviewRow[]>({
    queryKey: ["reports-reviews", uid],
    enabled: !!uid,
    staleTime: STATIC,
    queryFn: async () => ((await db.rpc("get_reviews_for_business", { _business_id: uid })).data || []) as ReviewRow[],
  });

  // Team and service counts don't depend on the date range, so switching ranges only refetches bookings.
  const { data: stylists = NO_ROWS as StylistRow[] } = useQuery<StylistRow[]>({
    queryKey: ["reports-stylists", uid],
    enabled: !!uid,
    staleTime: STATIC,
    queryFn: async () => {
      const { data, error } = await db.from("stylists").select("id, name, title, satisfaction").eq("user_id", uid).order("name");
      if (error) throw error;
      return (data || []) as StylistRow[];
    },
  });
  const { data: servicesCount = 0 } = useQuery<number>({
    queryKey: ["reports-services-count", uid],
    enabled: !!uid,
    staleTime: STATIC,
    queryFn: async () => (await db.from("services").select("id", { count: "exact", head: true }).eq("user_id", uid).is("deleted_at", null)).count ?? 0,
  });

  const { data: appointments = NO_ROWS as AppointmentRow[], isLoading } = useQuery<AppointmentRow[]>({
    queryKey: ["reports-appointments", uid, range.startDate, range.endDate],
    enabled: !!uid,
    // Keep the previous range on screen while the new one loads, so charts don't flash empty.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await db.from("appointments")
        .select("id, appointment_date, appointment_time, price, status, stylist_id, service_id, customer_id, service:services(id, name, color, duration)")
        .eq("user_id", uid).gte("appointment_date", range.startDate).lte("appointment_date", range.endDate)
        .order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });
      if (error) throw error;
      return (data || []) as AppointmentRow[];
    },
  });

  const { data: prevRows = NO_ROWS as PrevRow[] } = useQuery<PrevRow[]>({
    queryKey: ["reports-prev", uid, range.prevStartDate, range.prevEndDate],
    enabled: !!uid,
    placeholderData: keepPreviousData,
    queryFn: async () => ((await db.from("appointments").select("appointment_date, appointment_time, price, customer_id, status")
      .eq("user_id", uid).gte("appointment_date", range.prevStartDate).lte("appointment_date", range.prevEndDate)).data || []) as PrevRow[],
  });

  const trend = useMemo(() => computeTrend(appointments, prevRows, range), [appointments, prevRows, range]);
  const analytics = useMemo(() => computeAnalytics(appointments, stylists, servicesCount, range.days), [appointments, stylists, servicesCount, range.days]);

  // Only the clients that make the list are looked up, instead of the whole client book.
  const ranked = useMemo(() => rankCustomers(appointments), [appointments]);
  const rankedIds = useMemo(() => ranked.map((c) => c.id), [ranked]);
  const { data: names } = useQuery<Record<string, string>>({
    queryKey: ["reports-customer-names", uid, rankedIds],
    enabled: !!uid && rankedIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: STATIC,
    queryFn: async () => {
      const { data } = await db.from("customers").select("id, name").in("id", rankedIds);
      return Object.fromEntries(((data || []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name || ""]));
    },
  });
  const topCustomers = useMemo<TopCustomerRow[]>(
    () => (names ? ranked.filter((c) => c.id in names).map((c) => ({ ...c, name: names[c.id] || "Client", initials: initialsOf(names[c.id]) })) : []),
    [ranked, names],
  );

  const rangeLabel = RANGES.find((r) => r.value === dateRange)?.label ?? dateRange;
  const handleExport = useCallback(async () => {
    const csv = analyticsCsv(analytics, rangeLabel, money);
    const filename = `cutzioo-report-${range.startDate}-to-${range.endDate}.csv`;
    const canShareFiles = typeof navigator.canShare === "function"
      && navigator.canShare({ files: [new File([csv], filename, { type: "text/csv" })] });
    // Inside the app a browser download goes nowhere, so the report leaves through the share sheet.
    if (inAppShell() && !canShareFiles) {
      const result = await shareText(csv, `Cutzioo report, ${rangeLabel}`);
      if (result === "copied") toast({ title: "Report copied", description: "Paste it into Notes, Mail or a spreadsheet." });
      else if (result === "failed") toast({ title: "Couldn't export", description: "Try again from a browser.", variant: "destructive" });
      return;
    }
    const result = await shareFile(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename, { title: `Cutzioo report, ${rangeLabel}` });
    if (result === "unsupported") await shareText(csv, `Cutzioo report, ${rangeLabel}`);
    else if (result === "downloaded") toast({ title: "Export ready", description: "Your analytics CSV has been downloaded." });
  }, [analytics, rangeLabel, range.startDate, range.endDate, toast]);

  const shopName = profile?.business_name || profile?.full_name;
  const shared = { analytics, trend, isLoading, topCustomers, reviews, dateRange, setDateRange, onExport: handleExport };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0C] font-geist">
        <AppSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A0C] text-white">
          <Suspense fallback={null}>
            {isMobile ? (
              <div className="flex-1 overflow-y-auto overscroll-contain pt-4">
                <MobileReports
                  {...shared}
                  growth={
                    <div className="space-y-3">
                      <RevenuePipelineCard compact currency={moneySymbol()} />
                      <RevenueGoalCard userId={uid} className="!rounded-[22px] !border-[0.5px] !border-white/10 !bg-[#1C1C1E]" />
                      <WinBackCard userId={uid} shopName={shopName} bookingLink={profile?.booking_link} limit={4} className="!rounded-[22px] !border-[0.5px] !border-white/10 !bg-[#1C1C1E]" />
                    </div>
                  }
                />
              </div>
            ) : (
              <DesktopReports {...shared} userId={uid} shopName={shopName} bookingLink={profile?.booking_link} />
            )}
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, ArrowUpRight, CalendarDays, Clock, Crown, Download, Flame, PieChart as PieChartIcon,
  Scissors, Sparkles, Star, TrendingUp, Users, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpandableActionBar, type ExpandableActionBarItem } from "@/components/ui/be-ui-expanable-action-bar";
import { RevenuePipelineCard } from "@/components/reports/RevenuePipelineCard";
import { MetricHero } from "@/components/reports/MetricHero";
import { RevenueGoalCard, WinBackCard } from "@/components/reports/GrowthCards";
import { money, moneySymbol } from "@/components/reports/money";
import { Donut, EASE_OUT, HeatmapCard, Reveal, ServiceMixCard, SparkKpi, pctDelta, type SeriesPoint, type Totals } from "@/components/reports/ReportsVisuals";
import { RANGES, type RangeValue, type ReportsAnalytics, type ReviewRow, type TopCustomerRow } from "@/components/reports/reportsData";

const ACCENT = "#FF2D46";
const GREEN = "#30D158";
const BLUE = "#0A84FF";
const INDIGO = "#5E5CE6";
const ORANGE = "#FF9F0A";
const YELLOW = "#FFD60A";
const TINTS = [ACCENT, BLUE, INDIGO, GREEN, ORANGE, YELLOW];
const num = new Intl.NumberFormat("en-US");
const fill = (v: number, i = 0) => ({ "--v": Math.max(0, Math.min(100, v)), "--i": Math.min(i, 8) }) as CSSProperties;

type Trend = { series: SeriesPoint[]; prevSeries: SeriesPoint[]; totals: Totals; prevTotals: Totals; prevAverageTicket: number };

function Panel({ title, subtitle, aside, children, className }: { title: string; subtitle?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex h-full flex-col rounded-[24px] border border-white/[0.08] bg-[#121215] p-6", className)}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-white/45">{subtitle}</p>}
        </div>
        {aside}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Empty() {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-[16px] bg-white/[0.04] text-center">
      <Sparkles className="h-4 w-4 text-white/35" strokeWidth={2.3} />
      <p className="mt-2 text-[12.5px] text-white/45">No data in this range yet</p>
    </div>
  );
}

/** Column chart made of plain elements: each bar is one transformed block, no chart library. */
function Columns({ data, peakColor = ACCENT, labelEvery = 1, alwaysShowValue }: {
  data: { label: string; value: number }[]; peakColor?: string; labelEvery?: number; alwaysShowValue?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-[190px] items-stretch gap-1.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const peak = d.value === max && d.value > 0;
        return (
          <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-2" title={`${d.label}: ${d.value}`}>
            <div className="relative w-full flex-1">
              <span
                className={cn("absolute inset-x-0 text-center text-[11px] font-semibold tabular-nums transition-opacity duration-150",
                  peak ? "text-white" : "text-white/55", !alwaysShowValue && !peak && "opacity-0 group-hover:opacity-100")}
                style={{ bottom: `calc(${Math.min(pct, 88)}% + 4px)` }}
              >{d.value}</span>
              <div className="absolute inset-x-0 bottom-0 top-5 overflow-hidden rounded-t-[8px]">
                <div className="rp-fill-y h-full w-full rounded-t-[8px]" style={{ ...fill(Math.max(pct, d.value ? 4 : 1.5), i), backgroundColor: peak ? peakColor : `rgba(255,255,255,${0.1 + (d.value / max) * 0.22})` }} />
              </div>
            </div>
            <span className={cn("h-4 text-[11px] font-medium", peak ? "text-white" : "text-white/40")}>{i % labelEvery === 0 ? d.label : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function CompletionGauge({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const r = 82;
  const arc = Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * arc;
  const d = `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`;
  return (
    <div className="relative h-[100px] w-[160px] shrink-0">
      <svg viewBox="0 0 200 120" className="h-full w-full overflow-visible">
        <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} strokeLinecap="round" />
        <motion.path d={d} fill="none" stroke={ACCENT} strokeWidth={14} strokeLinecap="round" strokeDasharray={arc}
          initial={{ strokeDashoffset: reduce ? arc - dash : arc }} animate={{ strokeDashoffset: arc - dash }} transition={{ duration: 0.8, ease: EASE_OUT }} />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-2">
        <span className="text-[26px] font-bold leading-none tracking-tight text-white tabular-nums">{value}%</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF2D46]">done</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#121215] px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">{label}</p>
      <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight text-white tabular-nums">{value}</p>
      <p className="mt-1.5 truncate text-[12px] text-white/40">{sub}</p>
    </div>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn(className, s <= value ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/25")} />)}
    </span>
  );
}

const SECTIONS = [
  { id: "revenue", label: "Revenue", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "kpis", label: "KPIs", icon: <Activity className="h-4 w-4" /> },
  { id: "demand", label: "Demand", icon: <Clock className="h-4 w-4" /> },
  { id: "status", label: "Status", icon: <PieChartIcon className="h-4 w-4" /> },
  { id: "services", label: "Services", icon: <Scissors className="h-4 w-4" /> },
  { id: "customers", label: "Clients", icon: <Users className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
];

export default function DesktopReports({ analytics: a, trend, isLoading, topCustomers, reviews, dateRange, setDateRange, onExport, userId, shopName, bookingLink }: {
  analytics: ReportsAnalytics; trend: Trend; isLoading: boolean; topCustomers: TopCustomerRow[]; reviews: ReviewRow[];
  dateRange: RangeValue; setDateRange: (v: RangeValue) => void; onExport: () => void;
  userId?: string; shopName?: string | null; bookingLink?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("revenue");

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveSection(e.target.id)),
      { root, rootMargin: "-20% 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => { const el = root.querySelector(`#${s.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const actionItems = useMemo<ExpandableActionBarItem[]>(() => [
    ...SECTIONS.map((s) => ({ ...s, onClick: () => scrollRef.current?.querySelector(`#${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) })),
    { id: "export", label: "Export", icon: <Download className="h-4 w-4" />, onClick: onExport },
  ], [onExport]);

  const up = trend.totals.revenue >= trend.prevTotals.revenue;
  const gap = Math.abs(trend.totals.revenue - trend.prevTotals.revenue);
  const insights = [
    { icon: <Flame className="h-4 w-4" strokeWidth={2.3} />, tint: ORANGE, title: "Busiest day",
      text: `${a.busiestDay?.day ?? "—"} is your hottest day with ${a.busiestDay?.count ?? 0} bookings. Consider premium pricing.` },
    { icon: <Clock className="h-4 w-4" strokeWidth={2.3} />, tint: BLUE, title: "Fill your quiet hour",
      text: `${a.quietHour?.hour ?? "—"} is your slowest slot. A small discount there can turn dead time into revenue.` },
    { icon: <TrendingUp className="h-4 w-4" strokeWidth={2.3} />, tint: up ? GREEN : ACCENT, title: up ? "Trending up" : "Trending down",
      text: up ? `Revenue is ${money(gap)} ahead of the previous period. Keep it rolling.` : `Revenue is ${money(gap)} behind the previous period.`,
      action: up ? null : { to: "/booking-page", label: "Share your booking link" } },
  ];
  const hours = (a.minutesBooked / 60).toFixed(a.minutesBooked % 60 ? 1 : 0);
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const stars = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  const starMax = Math.max(1, ...stars.map((s) => s.count));

  return (
    <>
      <header className="shrink-0 border-b border-white/[0.06] bg-[#0A0A0C]">
        <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Analytics</p>
            <h1 className="mt-0.5 text-[32px] font-bold leading-none tracking-[-0.03em] text-white">Reports</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div role="tablist" aria-label="Date range" className="flex rounded-full bg-white/[0.06] p-1">
              {RANGES.map((r) => (
                <button key={r.value} type="button" role="tab" aria-selected={dateRange === r.value} onClick={() => setDateRange(r.value)}
                  className={cn("relative h-8 rounded-full px-3.5 text-[13px] font-medium tabular-nums transition-colors duration-150", dateRange === r.value ? "text-white" : "text-white/50 hover:text-white/80")}>
                  {dateRange === r.value && <motion.span layoutId="rp-range-pill" transition={{ type: "spring", duration: 0.3, bounce: 0 }} className="absolute inset-0 rounded-full bg-white/[0.14]" />}
                  <span className="relative">{r.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onExport}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-[#121215] px-4 text-[13px] font-semibold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-[#1C1C1E] active:scale-[0.97]">
              <Download className="h-4 w-4" strokeWidth={2.3} />Export
            </button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1320px] space-y-5 px-8 pb-32 pt-6">
          <div id="revenue" className="grid scroll-mt-6 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <Reveal>
              <MetricHero series={trend.series} prevSeries={trend.prevSeries} totals={trend.totals} prevTotals={trend.prevTotals} loading={isLoading}
                rangeLabel={RANGES.find((r) => r.value === dateRange)?.label} aside={<CompletionGauge value={a.completionRate} />} />
            </Reveal>
            <Reveal delay={0.05} className="flex flex-col gap-5">
              <RevenueGoalCard userId={userId} />
              {a.totalAppointments > 0 && (
                <section className="flex-1 rounded-[24px] border border-white/[0.08] bg-[#121215] p-6">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Insights</h2>
                  <ul className="mt-3 divide-y divide-white/[0.06]">
                    {insights.map((it) => (
                      <li key={it.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${it.tint}20`, color: it.tint }}>{it.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-white">{it.title}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/50">{it.text}</p>
                          {it.action && (
                            <Link to={it.action.to} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-white underline-offset-2 hover:underline">
                              {it.action.label}<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </Reveal>
          </div>

          <div id="kpis" className="grid scroll-mt-6 grid-cols-2 gap-5 lg:grid-cols-4">
            <SparkKpi index={0} loading={isLoading} icon={<CalendarDays className="h-4 w-4" strokeWidth={2.3} />} label="Bookings"
              value={trend.totals.bookings} format={(n) => num.format(Math.round(n))} delta={pctDelta(trend.totals.bookings, trend.prevTotals.bookings)}
              spark={trend.series.map((p) => p.bookings)} tint={ACCENT} hint={`${a.completionRate}% completed`} />
            <SparkKpi index={1} loading={isLoading} icon={<Users className="h-4 w-4" strokeWidth={2.3} />} label="Clients"
              value={trend.totals.clients} format={(n) => num.format(Math.round(n))} delta={pctDelta(trend.totals.clients, trend.prevTotals.clients)}
              spark={trend.series.map((p) => p.clients)} tint={INDIGO} hint={`${a.returningRate}% returning`} />
            <SparkKpi index={2} loading={isLoading} icon={<Wallet className="h-4 w-4" strokeWidth={2.3} />} label="Avg ticket"
              value={a.averageTicket} format={money} delta={pctDelta(a.averageTicket, trend.prevAverageTicket)}
              spark={trend.series.map((p) => (p.bookings ? p.revenue / p.bookings : 0))} tint={GREEN} hint="Per booking" />
            <SparkKpi index={3} loading={isLoading} icon={<TrendingUp className="h-4 w-4" strokeWidth={2.3} />} label="Upcoming"
              value={a.upcomingRevenue} format={money} spark={trend.series.map((p) => p.revenue)} tint={ORANGE} hint={`${a.scheduledAppointments} still to come`} />
          </div>

          <Reveal>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.06] md:grid-cols-4">
              <Stat label="Per day" value={money(a.revenuePerDay)} sub="average revenue" />
              <Stat label="Bookings / day" value={a.bookingsPerDay.toFixed(1)} sub={`${a.activeDays} of ${a.rangeDays} days active`} />
              <Stat label="Chair time" value={`${hours}h`} sub={`~${a.avgDuration} min each`} />
              <Stat label="Returning" value={`${a.returningRate}%`} sub={`${a.returningCustomers} of ${a.totalCustomers} clients`} />
              <Stat label="Cancels" value={`${a.cancelRate}%`} sub={`${a.cancelledAppointments} cancelled`} />
              <Stat label="No-shows" value={String(a.noShows)} sub={a.noShows ? "worth a follow-up" : "clean record"} />
              <Stat label="Streak" value={`${a.streak}d`} sub="booked days in a row" />
              <Stat label="Weekend" value={`${a.weekendShare}%`} sub="of all bookings" />
            </div>
          </Reveal>

          <div id="demand" className="grid scroll-mt-6 grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
            <Reveal><HeatmapCard grid={a.heatmap} max={a.heatMax} className="h-full" /></Reveal>
            <Reveal delay={0.05}><ServiceMixCard services={a.serviceBreakdown} className="h-full" /></Reveal>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Reveal>
              <Panel title="Busiest days" subtitle="Bookings by day of week" aside={<span className="text-[13px] font-semibold tabular-nums text-white/60">{num.format(a.totalAppointments)} total</span>}>
                {a.totalAppointments === 0 ? <Empty /> : <Columns data={a.weekdayBookings} alwaysShowValue />}
              </Panel>
            </Reveal>
            <Reveal delay={0.05}>
              <Panel title="Peak hours" subtitle="When your chair fills up" aside={a.peakHour?.count ? <span className="text-[13px] font-semibold text-white/60">Peak {a.peakHour.hour}</span> : undefined}>
                {a.hourlyDemand.every((h) => h.count === 0) ? <Empty /> : <Columns data={a.hourlyDemand.map((h) => ({ label: h.hour, value: h.count }))} labelEvery={2} />}
              </Panel>
            </Reveal>
          </div>

          <Reveal><RevenuePipelineCard currency={moneySymbol()} /></Reveal>

          <div id="status" className="grid scroll-mt-6 grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <Panel title="Booking status" subtitle="Distribution this period">
                {a.statusBreakdown.length === 0 ? <Empty /> : (
                  <div className="flex items-center gap-6">
                    <div className="relative h-36 w-36 shrink-0">
                      <Donut slices={a.statusBreakdown} thickness={13} />
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[26px] font-bold leading-none tracking-tight text-white tabular-nums">{a.completionRate}%</span>
                        <span className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/45">done</span>
                      </div>
                    </div>
                    <ul className="flex-1 space-y-2.5">
                      {a.statusBreakdown.map((s) => (
                        <li key={s.name} className="flex items-center justify-between gap-3 text-[14px]">
                          <span className="flex min-w-0 items-center gap-2.5 text-white"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.fill }} /><span className="truncate">{s.name}</span></span>
                          <span className="font-semibold tabular-nums text-white">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            </Reveal>
            <Reveal delay={0.05}>
              <Panel title="Time of day" subtitle="Share of bookings by part of the day">
                {a.totalAppointments === 0 ? <Empty /> : (
                  <ul className="space-y-4">
                    {a.dayparts.map((p, i) => {
                      const pct = Math.round((p.count / a.totalAppointments) * 100);
                      return (
                        <li key={p.key}>
                          <div className="mb-2 flex items-baseline justify-between text-[14px]">
                            <span className="font-medium text-white">{p.key} <span className="text-[12px] font-normal text-white/40">{p.range}</span></span>
                            <span className="tabular-nums text-white/60"><span className="font-semibold text-white">{p.count}</span> · {pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="rp-fill-x h-full rounded-full" style={{ ...fill(pct, i), backgroundColor: [ORANGE, ACCENT, INDIGO][i] }} /></div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </Reveal>
          </div>

          <div id="services" className="grid scroll-mt-6 grid-cols-1 gap-5 lg:grid-cols-2">
            <Reveal>
              <Panel title="Top services" subtitle="Most booked in this period" aside={a.topService ? <span className="text-[13px] font-semibold text-white/60">{a.topServiceShare}% {a.topService.name}</span> : undefined}>
                {a.serviceBreakdown.length === 0 ? <Empty /> : (
                  <ul className="space-y-4">
                    {a.serviceBreakdown.map((s, i) => (
                      <li key={s.name}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-[14px]">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.08] text-[11px] font-semibold tabular-nums text-white/50">{i + 1}</span>
                            <span className="truncate font-medium text-white">{s.name}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-3 tabular-nums"><span className="text-[12.5px] text-white/45">{money(s.revenue)}</span><span className="font-semibold text-white">{s.bookings}</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="rp-fill-x h-full rounded-full bg-[#FF2D46]" style={fill((s.bookings / (a.serviceBreakdown[0]?.bookings || 1)) * 100, i)} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </Reveal>
            <Reveal delay={0.05}>
              <Panel title="Stylist leaderboard" subtitle="Ranked by revenue and satisfaction" aside={<span className="text-[13px] font-semibold text-white/60">{a.activeStylists} stylists · {a.activeServices} services</span>}>
                {a.stylistPerformance.length === 0 ? <Empty /> : (
                  <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[16px] bg-white/[0.04]">
                    {a.stylistPerformance.slice(0, 6).map((s, i) => (
                      <li key={s.id} className="flex items-center gap-3.5 px-4 py-3">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-bold",
                          i === 0 ? "bg-[#FFD60A] text-black" : i === 2 ? "bg-[#FF9F0A]/20 text-[#FF9F0A]" : "bg-white/[0.08] text-white/60")}>
                          {i === 0 ? <Crown className="h-4 w-4" strokeWidth={2.3} /> : i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-semibold text-white">{s.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/45">
                            <span>{s.bookings} bookings</span><span>·</span><span>{s.completed} done</span><span>·</span>
                            <Star className="h-3 w-3 fill-[#FFD60A] text-[#FFD60A]" />{s.satisfaction.toFixed(1)}
                          </p>
                        </div>
                        <p className="shrink-0 text-[14.5px] font-semibold tabular-nums text-white">{money(s.revenue)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </Reveal>
          </div>

          <div id="customers" className="grid scroll-mt-6 grid-cols-1 gap-5 lg:grid-cols-2">
            <Reveal>
              <Panel title="Best customers" subtitle="Ranked by spend this period">
                {topCustomers.length === 0 ? <Empty /> : (
                  <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[16px] bg-white/[0.04]">
                    {topCustomers.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-3.5 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold" style={{ backgroundColor: `${TINTS[i % TINTS.length]}26`, color: TINTS[i % TINTS.length] }}>{c.initials || "?"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-white">
                            <span className="truncate">{c.name}</span>
                            {i === 0 && <span className="rounded-[6px] bg-[#FFD60A] px-1.5 text-[9px] font-bold uppercase leading-4 tracking-wider text-black">VIP</span>}
                          </p>
                          <p className="mt-0.5 text-[12px] text-white/45">
                            {c.bookings} visit{c.bookings !== 1 ? "s" : ""}{c.lastVisit ? ` · ${formatDistanceToNow(new Date(`${c.lastVisit}T00:00:00`), { addSuffix: true })}` : ""}
                          </p>
                        </div>
                        <div className="w-[84px] shrink-0 text-right">
                          <p className="text-[14.5px] font-semibold tabular-nums text-white">{money(c.revenue)}</p>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><div className="rp-fill-x h-full rounded-full" style={{ ...fill((c.revenue / (topCustomers[0]?.revenue || 1)) * 100, i), backgroundColor: TINTS[i % TINTS.length] }} /></div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </Reveal>
            <Reveal delay={0.05}><WinBackCard userId={userId} shopName={shopName} bookingLink={bookingLink} limit={6} className="h-full !p-6" /></Reveal>
          </div>

          <Reveal id="reviews" className="scroll-mt-6">
            <Panel title="Customer reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""} total`}>
              {reviews.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div>
                    <p className="text-[52px] font-bold leading-none tracking-[-0.03em] text-white tabular-nums">{avgRating.toFixed(1)}</p>
                    <div className="mt-2.5"><Stars value={Math.round(avgRating)} className="h-4 w-4" /></div>
                    <ul className="mt-5 space-y-2">
                      {stars.map(({ star, count }, i) => (
                        <li key={star} className="flex items-center gap-2.5 text-[12px] tabular-nums text-white/45">
                          <span className="w-3">{star}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="rp-fill-x h-full rounded-full bg-[#FFD60A]" style={fill((count / starMax) * 100, i)} /></div>
                          <span className="w-5 text-right">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {reviews.slice(0, 6).map((r) => (
                      <article key={r.id} className="rounded-[16px] bg-white/[0.04] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Stars value={r.rating} className="h-3.5 w-3.5" />
                          <span className="text-[11px] text-white/40">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                        </div>
                        {r.reviewer_name && <p className="mt-2 text-[14px] font-semibold text-white">{r.reviewer_name}</p>}
                        {r.comment && <p className="mt-1 text-[13.5px] leading-relaxed text-white/55">&ldquo;{r.comment}&rdquo;</p>}
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </Reveal>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-0 right-0 z-30 flex justify-center">
        <div className="pointer-events-auto">
          <ExpandableActionBar items={actionItems} activeId={activeSection}
            onAction={(item) => { setActiveSection(item.id); item.onClick?.(); }}
            classNames={{ root: "drop-shadow-2xl", track: "bg-[#121215]/80 border-white/[0.08] shadow-2xl backdrop-blur-2xl", item: "group data-[active=true]:text-white", activeItem: "text-white" }} />
        </div>
      </div>
    </>
  );
}

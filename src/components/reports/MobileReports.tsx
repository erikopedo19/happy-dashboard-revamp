import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Crown, Download, Flame, Repeat, Scissors,
  Star, Timer, Users, Zap, Sun, Sunset, Moon, TrendingUp, XCircle, UserX, Wallet, Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/beui-tabs";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const ACCENT = "#FF2D46";
const SURFACE = "#121215";
const GREEN = "#30D158";
const YELLOW = "#FFD60A";
const spring = { type: "spring" as const, stiffness: 380, damping: 32 };
const springSoft = { type: "spring" as const, stiffness: 320, damping: 32 };

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US");

export type RangeValue = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear";
export const MOBILE_RANGES: { value: RangeValue; short: string }[] = [
  { value: "today", short: "1D" }, { value: "last7days", short: "7D" }, { value: "last30days", short: "30D" },
  { value: "thisMonth", short: "MTD" }, { value: "lastMonth", short: "LM" }, { value: "thisYear", short: "YTD" },
];

interface ReviewRow { id: string; rating: number; comment: string | null; reviewer_name: string | null; created_at: string }
interface TopCustomerRow { id: string; name: string; bookings: number; revenue: number; lastVisit: string | null; initials: string }

function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

function Card({ children, className, delay = 0, onTap }: { children: ReactNode; className?: string; delay?: number; onTap?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay }}
      whileTap={onTap ? { scale: 0.985 } : undefined}
      onClick={onTap}
      className={cn("rounded-[24px] border border-white/[0.06] p-4", className)}
      style={{ backgroundColor: SURFACE }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ title, sub, icon: Icon }: { title: string; sub?: string; icon?: typeof Clock }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}><Icon className="h-3.5 w-3.5" /></span>}
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      </div>
      {sub && <span className="text-[12px] text-white/40">{sub}</span>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, tint = "#FFFFFF", delay = 0, loading }: {
  icon: typeof Clock; label: string; value: string; hint?: string; tint?: string; delay?: number; loading?: boolean;
}) {
  return (
    <Card delay={delay} className="p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}1f`, color: tint }}><Icon className="h-4 w-4" /></span>
        {hint && <span className="text-[11px] text-white/40">{hint}</span>}
      </div>
      <p className="mt-3 text-[22px] font-semibold tracking-tight text-white tabular-nums">{loading ? <span className="inline-block h-6 w-16 rounded bg-white/10 animate-pulse" /> : value}</p>
      <p className="mt-0.5 text-[12px] text-white/45">{label}</p>
    </Card>
  );
}

function Ring({ value, size = 64, stroke = 6, color = ACCENT, children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, value))) / 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function PeakHours({ hourly, peak, quiet }: { hourly: { hour: string; count: number }[]; peak: { hour: string; count: number }; quiet: { hour: string; count: number } }) {
  const max = Math.max(1, ...hourly.map((h) => h.count));
  const [active, setActive] = useState<number | null>(null);
  const peakIndex = hourly.findIndex((h) => h.hour === peak.hour);
  const shown = active ?? peakIndex;
  const current = hourly[shown] ?? peak;
  return (
    <Card delay={0.2}>
      <SectionTitle title="Peak hours" icon={Clock} sub="tap a bar" />
      <div className="mb-3 flex items-end justify-between">
        <div>
          <AnimatePresence mode="wait">
            <motion.p key={current.hour} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="text-[30px] font-semibold leading-none tracking-tight text-white">
              {current.hour}
            </motion.p>
          </AnimatePresence>
          <p className="mt-1 text-[12px] text-white/45">{current.count} {current.count === 1 ? "booking" : "bookings"}{shown === peakIndex ? " · busiest" : ""}</p>
        </div>
        <div className="text-right text-[11px] text-white/40">
          <p>Quietest <span className="font-semibold text-white/70">{quiet.hour}</span></p>
        </div>
      </div>
      <div className="flex h-28 items-end gap-1" onPointerLeave={() => setActive(null)}>
        {hourly.map((h, i) => {
          const pct = (h.count / max) * 100;
          const isPeak = i === peakIndex;
          const isActive = i === shown;
          return (
            <button key={h.hour} type="button" onPointerDown={() => { if (active !== i) haptic("selection"); setActive(i); }} className="group flex h-full flex-1 flex-col items-center justify-end">
              <div className="relative flex w-full flex-1 items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, pct)}%`, opacity: isActive ? 1 : 0.55 }}
                  transition={{ delay: 0.25 + i * 0.03, ...spring }}
                  className="w-full rounded-t-[6px] rounded-b-[3px]"
                  style={{ background: isPeak ? `linear-gradient(180deg, #FF5A6E, ${ACCENT})` : isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}
                />
                {isPeak && (
                  <motion.span animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.15, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute inset-x-0 bottom-0 rounded-t-[6px] blur-md" style={{ height: `${Math.max(6, pct)}%`, background: ACCENT }} />
                )}
              </div>
              <span className={cn("mt-1.5 text-[8.5px] tabular-nums", isActive ? "text-white" : "text-white/35")}>{i % 2 === 0 ? h.hour.replace(/(am|pm)/, "") : ""}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Heatmap({ grid, max }: { grid: number[][]; max: number }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <Card delay={0.24}>
      <SectionTitle title="When you're busiest" icon={Flame} sub="day × hour" />
      <div className="grid grid-cols-[14px_1fr] gap-x-2">
        <div className="flex flex-col justify-between py-[1px] text-[9px] text-white/35">
          {days.map((d, i) => <span key={i} className="h-[14px] leading-[14px]">{d}</span>)}
        </div>
        <div className="grid grid-rows-7 gap-[3px]">
          {grid.map((row, r) => (
            <div key={r} className="grid grid-cols-13 gap-[3px]" style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}>
              {row.map((v, c) => {
                const a = v / max;
                return (
                  <motion.div key={c} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (r * 13 + c) * 0.004, ...spring }} className="h-[14px] rounded-[4px]"
                    style={{ backgroundColor: v === 0 ? "rgba(255,255,255,0.05)" : `rgba(255,45,70,${0.18 + a * 0.82})` }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-6 text-[9px] text-white/35"><span>8am</span><span>2pm</span><span>8pm</span></div>
    </Card>
  );
}

function Dayparts({ parts }: { parts: { key: string; range: string; count: number }[] }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.count, 0));
  const icons = [Sun, Sunset, Moon];
  const best = parts.reduce((b, p) => (p.count > b.count ? p : b), parts[0]);
  return (
    <Card delay={0.28}>
      <SectionTitle title="Time of day" icon={Sun} sub={`${best.key} wins`} />
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {parts.map((p, i) => (
          <motion.div key={p.key} initial={{ width: 0 }} animate={{ width: `${(p.count / total) * 100}%` }} transition={{ delay: 0.35 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ backgroundColor: i === 0 ? YELLOW : i === 1 ? ACCENT : "#5E5CE6" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {parts.map((p, i) => {
          const Icon = icons[i];
          return (
            <div key={p.key} className="rounded-2xl bg-white/[0.04] p-2.5">
              <Icon className="h-3.5 w-3.5 text-white/50" />
              <p className="mt-1.5 text-[17px] font-semibold tabular-nums text-white">{Math.round((p.count / total) * 100)}%</p>
              <p className="text-[10.5px] text-white/40">{p.key}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekStrip({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const todayIdx = new Date().getDay();
  const best = data.reduce((b, d) => (d.count > b.count ? d : b), data[0]);
  return (
    <Card delay={0.16}>
      <SectionTitle title="By weekday" icon={CalendarDays} sub={`${best.day} busiest`} />
      <div className="grid grid-cols-7 gap-1.5">
        {data.map((d, i) => {
          const isBest = d.day === best.day && d.count > 0;
          return (
            <div key={d.day} className="flex flex-col items-center">
              <div className="flex h-20 w-full items-end rounded-xl bg-white/[0.04] p-1">
                <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} transition={{ delay: 0.2 + i * 0.04, ...spring }} className="w-full rounded-lg" style={{ background: isBest ? `linear-gradient(180deg, #FF5A6E, ${ACCENT})` : "rgba(255,255,255,0.3)" }} />
              </div>
              <span className={cn("mt-1.5 text-[10px] font-medium", i === todayIdx ? "text-white" : "text-white/40")}>{d.day.slice(0, 1)}</span>
              <span className="text-[10px] tabular-nums text-white/60">{d.count}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Reviews({ reviews }: { reviews: ReviewRow[] }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const five = reviews.length ? Math.round((dist[0].n / reviews.length) * 100) : 0;
  return (
    <Card delay={0.4}>
      <SectionTitle title="Reviews" icon={Star} sub={`${reviews.length} total`} />
      {reviews.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-white/40">No reviews in this period yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <Ring value={five} size={76} color={YELLOW}>
            <div className="text-center"><p className="text-[18px] font-semibold leading-none text-white">{avg.toFixed(1)}</p><p className="mt-0.5 text-[9px] text-white/40">{five}% ★5</p></div>
          </Ring>
          <div className="flex-1 space-y-1.5">
            {dist.map(({ s, n }, i) => (
              <div key={s} className="flex items-center gap-2 text-[11px]">
                <span className="w-3 text-right text-white/50">{s}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(n / reviews.length) * 100}%` }} transition={{ delay: 0.45 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ backgroundColor: s >= 4 ? YELLOW : s === 3 ? "#FF9F0A" : ACCENT }} />
                </div>
                <span className="w-5 text-right tabular-nums text-white/40">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function MobileReports({ analytics, isLoading, topCustomers, reviews, dateRange, setDateRange, onExport }: {
  analytics: any; isLoading: boolean; topCustomers: TopCustomerRow[]; reviews: ReviewRow[];
  dateRange: RangeValue; setDateRange: (v: RangeValue) => void; onExport: () => void;
}) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const a = analytics;
  const up = (a.revenueDelta ?? 0) >= 0;
  const fmtH = (mins: number) => (mins >= 60 ? `${(mins / 60).toFixed(mins % 60 ? 1 : 0)}h` : `${mins}m`);
  const sparkData = useMemo(() => (a.revenueTrend?.length ? a.revenueTrend : [{ revenue: 0 }, { revenue: 0 }]), [a.revenueTrend]);

  return (
    <div className="px-4 pt-3 pb-36 space-y-3.5">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white/40">{today}</p>
          <h1 className="text-[34px] font-bold tracking-[-0.03em] leading-tight text-white">Reports</h1>
        </div>
        <motion.button type="button" onClick={() => { haptic("light"); onExport(); }} aria-label="Export" whileTap={{ scale: 0.9 }} className="mb-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-white/80" style={{ backgroundColor: SURFACE }}>
          <Download className="h-4 w-4" strokeWidth={2.2} />
        </motion.button>
      </motion.div>

      <Tabs value={dateRange} onValueChange={(v) => { haptic("selection"); setDateRange(v as RangeValue); }} variant="segment">
        <TabsList className="w-full rounded-full bg-white/[0.05] p-1">
          {MOBILE_RANGES.map((r) => (
            <Fragment key={r.value}>
              <TabsTrigger value={r.value} className="flex-1 rounded-full text-[12px]" indicatorClassName="rounded-full bg-[#FF2D46]"><span className="relative">{r.short}</span></TabsTrigger>
            </Fragment>
          ))}
        </TabsList>
      </Tabs>

      {/* Hero */}
      <Card delay={0.05} className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: `${ACCENT}33` }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Total revenue</p>
            <CountUp value={a.totalRevenue ?? 0} format={(v) => currency.format(v)} className="mt-1 block text-[42px] font-bold leading-none tracking-[-0.03em] text-white tabular-nums" />
          </div>
          <span className={cn("mt-1 inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", up ? "bg-[#30D158]/15 text-[#30D158]" : "bg-[#FF2D46]/15 text-[#FF5A6E]")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(a.revenueDelta ?? 0)}%
          </span>
        </div>
        <div className="relative -mx-2 mt-3 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id="mrev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient></defs>
              <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2.2} fill="url(#mrev)" isAnimationActive animationDuration={1200} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="relative mt-3 grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl bg-white/[0.04]">
          {[
            { l: "Bookings", v: num.format(a.totalAppointments ?? 0) },
            { l: "Clients", v: num.format(a.totalCustomers ?? 0) },
            { l: "Avg ticket", v: currency.format(a.averageTicket ?? 0) },
          ].map((s) => (
            <div key={s.l} className="px-3 py-2.5 text-center"><p className="text-[16px] font-semibold tabular-nums text-white">{s.v}</p><p className="text-[10.5px] text-white/40">{s.l}</p></div>
          ))}
        </div>
      </Card>

      {/* Rings row */}
      <Card delay={0.1}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: a.completionRate ?? 0, l: "Completed", c: GREEN },
            { v: a.returningRate ?? 0, l: "Returning", c: ACCENT },
            { v: Math.min(100, a.rangeDays ? Math.round(((a.activeDays ?? 0) / a.rangeDays) * 100) : 0), l: "Active days", c: "#5E5CE6" },
          ].map((r) => (
            <div key={r.l} className="flex flex-col items-center">
              <Ring value={r.v} size={68} color={r.c}><span className="text-[14px] font-semibold tabular-nums text-white">{r.v}%</span></Ring>
              <p className="mt-1.5 text-[11px] text-white/45">{r.l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Wallet} label="Revenue / day" value={currency.format(a.revenuePerDay ?? 0)} hint={`${a.rangeDays ?? 0}d`} tint={ACCENT} delay={0.12} loading={isLoading} />
        <Stat icon={Zap} label="Bookings / day" value={(a.bookingsPerDay ?? 0).toFixed(1)} hint="avg" tint={YELLOW} delay={0.14} loading={isLoading} />
        <Stat icon={Timer} label="Hours booked" value={fmtH(a.minutesBooked ?? 0)} hint={`~${a.avgDuration ?? 0}m each`} tint="#5E5CE6" delay={0.16} loading={isLoading} />
        <Stat icon={TrendingUp} label="Upcoming revenue" value={currency.format(a.upcomingRevenue ?? 0)} hint={`${a.scheduledAppointments ?? 0} booked`} tint={GREEN} delay={0.18} loading={isLoading} />
        <Stat icon={XCircle} label="Cancel rate" value={`${a.cancelRate ?? 0}%`} hint={`${a.cancelledAppointments ?? 0} cancelled`} tint="#FF9F0A" delay={0.2} loading={isLoading} />
        <Stat icon={UserX} label="No-shows" value={num.format(a.noShows ?? 0)} hint={a.noShows ? "follow up" : "clean"} tint={a.noShows ? ACCENT : GREEN} delay={0.22} loading={isLoading} />
        <Stat icon={Repeat} label="Returning clients" value={num.format(a.returningCustomers ?? 0)} hint={`of ${a.totalCustomers ?? 0}`} tint={ACCENT} delay={0.24} loading={isLoading} />
        <Stat icon={Flame} label="Booking streak" value={`${a.streak ?? 0}d`} hint={a.streak >= 3 ? "on fire" : "days in a row"} tint={a.streak >= 3 ? "#FF9F0A" : "#FFFFFF"} delay={0.26} loading={isLoading} />
      </div>

      {/* Best day + weekend */}
      <Card delay={0.18} className="relative overflow-hidden" >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Best day</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-white">{a.bestDay ? new Date(`${a.bestDay.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—"}</p>
            <p className="text-[12px] text-white/45">{a.bestDay ? `${currency.format(a.bestDay.revenue)} · ${a.bestDay.appointments} bookings` : "No bookings yet"}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">Weekend</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-white">{a.weekendShare ?? 0}%</p>
            <p className="text-[12px] text-white/45">of bookings</p>
          </div>
        </div>
      </Card>

      {a.hourlyDemand?.length > 0 && <PeakHours hourly={a.hourlyDemand} peak={a.peakHour} quiet={a.quietHour ?? a.peakHour} />}
      {a.heatmap && <Heatmap grid={a.heatmap} max={a.heatMax ?? 1} />}
      {a.dayparts && <Dayparts parts={a.dayparts} />}
      {a.dayOfWeekDemand && <WeekStrip data={a.dayOfWeekDemand} />}

      {/* Services */}
      <Card delay={0.32}>
        <SectionTitle title="Top services" icon={Scissors} sub={a.topService ? `${a.topServiceShare}% ${a.topService.name}` : undefined} />
        {!a.serviceBreakdown?.length ? <p className="py-3 text-center text-[13px] text-white/40">No services booked yet.</p> : (
          <div className="space-y-2.5">
            {a.serviceBreakdown.map((s: any, i: number) => {
              const pct = (s.bookings / Math.max(1, a.serviceBreakdown[0].bookings)) * 100;
              return (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2 font-medium text-white">{i === 0 && <Crown className="h-3.5 w-3.5" style={{ color: YELLOW }} />}{s.name}</span>
                    <span className="tabular-nums text-white/50">{s.bookings} · {currency.format(s.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.35 + i * 0.06, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full" style={{ background: i === 0 ? `linear-gradient(90deg, ${ACCENT}, #FF5A6E)` : "rgba(255,255,255,0.35)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Stylists */}
      {a.stylistPerformance?.length > 0 && (
        <Card delay={0.36}>
          <SectionTitle title="Team" icon={Users} sub={`${a.stylistPerformance.length} stylists`} />
          <div className="space-y-2">
            {a.stylistPerformance.slice(0, 5).map((s: any, i: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: i === 0 ? `linear-gradient(135deg, #FF5A6E, ${ACCENT})` : "rgba(255,255,255,0.1)" }}>{s.name.charAt(0)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-white">{s.name}</p><p className="text-[11px] text-white/40">{s.bookings} bookings · {s.completed} done</p></div>
                <p className="text-[14px] font-semibold tabular-nums text-white">{currency.format(s.revenue)}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Customers */}
      {topCustomers.length > 0 && (
        <Card delay={0.38}>
          <SectionTitle title="Best clients" icon={Sparkles} sub="top spenders" />
          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42 + i * 0.05 }} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-semibold text-white">{c.initials || "•"}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-white">{c.name}</p><p className="text-[11px] text-white/40">{c.bookings} visits</p></div>
                <p className="text-[14px] font-semibold tabular-nums text-white">{currency.format(c.revenue)}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      <Reviews reviews={reviews} />
    </div>
  );
}

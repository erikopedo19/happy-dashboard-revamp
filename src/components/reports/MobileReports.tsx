import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight, ArrowUpRight, ChevronRight, Crown, Download, Minus, Moon, Star, Sun, Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { CountUp, EASE_OUT, Reveal, ServiceMixCard, pctDelta, type MetricKey, type SeriesPoint, type Totals } from "@/components/reports/ReportsVisuals";

const ACCENT = "#FF2D46";
const GREEN = "#30D158";
const BLUE = "#0A84FF";
const INDIGO = "#5E5CE6";
const ORANGE = "#FF9F0A";
const YELLOW = "#FFD60A";
const CARD = "#1C1C1E";
const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0 };

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US");

export type RangeValue = "today" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear";
export const MOBILE_RANGES: { value: RangeValue; short: string; label: string }[] = [
  { value: "today", short: "D", label: "Day" }, { value: "last7days", short: "W", label: "7 days" }, { value: "last30days", short: "30D", label: "30 days" },
  { value: "thisMonth", short: "M", label: "Period" }, { value: "lastMonth", short: "LM", label: "Month" }, { value: "thisYear", short: "Y", label: "Period" },
];

interface ReviewRow { id: string; rating: number; comment: string | null; reviewer_name: string | null; created_at: string }
interface TopCustomerRow { id: string; name: string; bookings: number; revenue: number; lastVisit: string | null; initials: string }
type Trend = { series: SeriesPoint[]; prevSeries: SeriesPoint[]; totals: Totals; prevTotals: Totals };

const METRICS: { key: MetricKey; label: string; title: string; fmt: (n: number) => string }[] = [
  { key: "revenue", label: "Revenue", title: "Total revenue", fmt: (n) => currency.format(n) },
  { key: "bookings", label: "Bookings", title: "Total bookings", fmt: (n) => num.format(Math.round(n)) },
  { key: "clients", label: "Clients", title: "Unique clients", fmt: (n) => num.format(Math.round(n)) },
];

/* ───────────────────────────── primitives ───────────────────────────── */

/**
 * iOS segmented control. The thumb is one element moved with a CSS transform transition —
 * compositor-only and interruptible, so rapid taps retarget instead of restarting, and it
 * stays smooth inside a scrolling container (layout animations can drift there).
 */
function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; id?: string; className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={cn("relative flex rounded-full bg-[rgba(118,118,128,0.24)] p-[2px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.06)]", className)}>
      <span
        aria-hidden
        className="absolute bottom-[2px] left-[2px] top-[2px] rounded-full bg-[#636366] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => { if (!active) { haptic("selection"); onChange(o.value); } }}
            className="relative h-[30px] flex-1 rounded-full px-2 text-[13px] font-semibold text-white"
          >
            <span className={cn("transition-opacity duration-200", active ? "opacity-100" : "opacity-60")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Card({ children, className, onTap }: { children: ReactNode; className?: string; onTap?: () => void }) {
  return (
    <div
      onClick={onTap}
      className={cn("rounded-[22px] p-4 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.10)]", onTap && "cursor-pointer transition-transform duration-150 ease-out active:scale-[0.98]", className)}
      style={{ backgroundColor: CARD }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1 pb-2 pt-5">
      <h2 className="text-[22px] font-bold tracking-[-0.02em] text-white">{title}</h2>
      {aside && <span className="pb-0.5 text-[13px] text-white/45">{aside}</span>}
    </div>
  );
}

function CardTitle({ color, title, aside }: { color: string; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] font-semibold" style={{ color }}>{title}</span>
      {aside ?? <ChevronRight className="h-4 w-4 text-white/25" />}
    </div>
  );
}

function Delta({ delta }: { delta: number | null }) {
  const Icon = delta == null || delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const good = delta == null || delta >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[13px] font-semibold tabular-nums", good ? "text-[#30D158]" : "text-[#FF5A6E]")}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.6} />{delta == null ? "New" : `${Math.abs(delta)}%`}
    </span>
  );
}

/** Pointer scrubbing over N evenly spaced columns. Fires a selection haptic per step. */
function useScrub(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const last = useRef<number | null>(null);
  const pick = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = count <= 1 ? 0 : Math.max(0, Math.min(count - 1, Math.round(((e.clientX - r.left) / r.width) * (count - 1))));
    if (i !== last.current) { last.current = i; haptic("selection"); setActive(i); }
  };
  const end = () => { last.current = null; setActive(null); };
  return {
    active,
    handlers: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => { if (e.buttons || e.pointerType !== "mouse") pick(e); },
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave: end,
    },
  };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Fritsch–Carlson monotone cubic — smooth without overshooting below zero. */
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = dx[i] / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)},${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)},${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/* ───────────────────────────── summary (Stocks-style scrub chart) ───────────────────────────── */

function Summary({ trend, loading, dateRange }: { trend: Trend; loading: boolean; dateRange: RangeValue }) {
  const reduce = useReducedMotion();
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const m = METRICS.find((x) => x.key === metric)!;
  const data = trend.series.map((p, i) => ({ label: p.label, cur: p[metric], prev: trend.prevSeries[i]?.[metric] ?? 0 }));
  const { active, handlers } = useScrub(data.length);
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const H = 168, PAD_T = 14, PAD_B = 6;

  const max = Math.max(1, ...data.map((d) => Math.max(d.cur, d.prev)));
  const x = (i: number) => (data.length <= 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const curPath = W ? monotonePath(data.map((d, i) => [x(i), y(d.cur)])) : "";
  const prevPath = W ? monotonePath(data.map((d, i) => [x(i), y(d.prev)])) : "";
  const areaPath = curPath ? `${curPath}L${W},${H}L0,${H}Z` : "";
  const point = active != null ? data[active] : null;
  const delta = pctDelta(trend.totals[metric], trend.prevTotals[metric]);
  const ticks = data.length > 2 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : data.map((_, i) => i);
  const morph = reduce ? { duration: 0 } : { duration: 0.5, ease: [0.77, 0, 0.175, 1] as const };

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-4 pt-4">
        <Segmented<MetricKey> id="metric" value={metric} onChange={setMetric} options={METRICS.map((x) => ({ value: x.key, label: x.label }))} />
        <div className="mt-4 h-[78px]">
          <p className="text-[13px] font-semibold text-white/45">{point ? point.label : m.title}</p>
          {loading ? (
            <span className="mt-1.5 block h-10 w-40 animate-pulse rounded-xl bg-white/10" />
          ) : (
            <CountUp key={metric} instant={!!point} value={point ? point.cur : trend.totals[metric]} format={m.fmt} className="block text-[40px] font-bold leading-tight tracking-[-0.03em] text-white tabular-nums" />
          )}
          <div className="flex items-center gap-2 text-[13px] text-white/45">
            {point ? <span className="tabular-nums">{m.fmt(point.prev)} the period before</span> : (
              <><Delta delta={delta} /><span className="tabular-nums">vs {m.fmt(trend.prevTotals[metric])} before</span></>
            )}
          </div>
        </div>
      </div>

      <div ref={wrapRef} {...handlers} className="relative mt-3 touch-pan-y select-none" style={{ height: H }}>
        {W > 0 && (
          <svg width={W} height={H} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id="sum-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={PAD_T + f * (H - PAD_T - PAD_B)} y2={PAD_T + f * (H - PAD_T - PAD_B)} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />)}
            {/* Same point count → paths morph between metrics. A new range changes the count, so it redraws. */}
            <g key={`${data.length}-${dateRange}`}>
              <motion.path initial={false} animate={{ d: prevPath }} transition={morph} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeDasharray="3 4" />
              <motion.path initial={{ opacity: 0, d: areaPath }} animate={{ opacity: 1, d: areaPath }} transition={{ opacity: { duration: 0.5, delay: reduce ? 0 : 0.3 }, d: morph }} fill="url(#sum-fill)" />
              <motion.path
                initial={{ pathLength: reduce ? 1 : 0, d: curPath }} animate={{ pathLength: 1, d: curPath }}
                transition={{ pathLength: { duration: 0.9, ease: EASE_OUT }, d: morph }}
                fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              />
            </g>
            {point && active != null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                <circle cx={x(active)} cy={y(point.prev)} r={3} fill="rgba(255,255,255,0.6)" />
                <circle cx={x(active)} cy={y(point.cur)} r={5.5} fill={ACCENT} stroke={CARD} strokeWidth={2.5} />
              </g>
            )}
          </svg>
        )}
      </div>
      <div className="relative h-7 px-4 text-[11px] font-medium text-white/35">
        {ticks.map((i, k) => (
          <span key={i} className={cn("absolute top-1.5", k === 0 ? "left-4" : k === ticks.length - 1 ? "right-4" : "left-1/2 -translate-x-1/2")}>{data[i]?.label}</span>
        ))}
      </div>
    </Card>
  );
}

/* ───────────────────────────── barber poles (activity) ───────────────────────────── */

/**
 * Three glass barber poles that fill like liquid to each percentage. Stripes spin
 * (constant linear motion) and a wave rolls across the surface — decoration that only
 * runs while on screen and stops entirely with reduced motion. Tap a pole to focus it.
 */
function BarberPoles({ poles }: { poles: { label: string; value: number; color: string; sub: string }[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });
  const [seen, setSeen] = useState(false);
  const [focus, setFocus] = useState(0);
  useEffect(() => { if (inView) setSeen(true); }, [inView]);
  const run = inView && !reduce ? "running" : "paused";
  const f = poles[focus];

  return (
    <Card className="overflow-hidden">
      <CardTitle color={ACCENT} title="Chair health" aside={<span className="text-[12px] text-white/40">tap a pole</span>} />
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/45">{f.label}</p>
          <p className="text-[34px] font-bold leading-none tracking-tight tabular-nums" style={{ color: f.color }}>
            <CountUp value={seen ? f.value : 0} format={(n) => String(Math.round(n))} /><span className="text-[18px]">%</span>
          </p>
          <p className="mt-1 truncate text-[12px] text-white/40">{f.sub}</p>
        </div>
      </div>

      <div ref={ref} className="mt-5 flex items-end justify-around">
        {poles.map((p, i) => {
          const v = Math.max(0, Math.min(100, p.value)) / 100;
          const active = i === focus;
          return (
            <button
              key={p.label}
              type="button"
              aria-label={`${p.label} ${p.value}%`}
              onClick={() => { if (!active) { haptic("selection"); setFocus(i); } }}
              className="flex flex-col items-center gap-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: active ? "translateY(-6px)" : "none", opacity: active ? 1 : 0.55 }}
            >
              {/* top cap */}
              <span className="h-3 w-12 rounded-t-[10px] rounded-b-[3px] bg-gradient-to-b from-[#E5E5EA] to-[#8E8E93] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
              <span className="relative -my-1.5 h-40 w-10 overflow-hidden rounded-[14px] bg-white/[0.06] ring-[0.5px] ring-white/15">
                {/* liquid */}
                <motion.span
                  className="absolute inset-0 block"
                  initial={{ transform: "translateY(100%)" }}
                  animate={{ transform: seen ? `translateY(${(1 - v) * 100}%)` : "translateY(100%)" }}
                  transition={reduce ? { duration: 0 } : { type: "spring", duration: 1.4, bounce: 0.18, delay: 0.1 + i * 0.12 }}
                >
                  <span
                    className="pole-stripes absolute inset-x-0 -top-10 bottom-0"
                    style={{ backgroundImage: `repeating-linear-gradient(-45deg, ${p.color} 0 10px, rgba(255,255,255,0.92) 10px 20px)`, animationPlayState: run }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 -top-[5px] h-[10px] overflow-hidden">
                    <svg className="pole-wave absolute left-0 top-0 h-full w-[200%]" viewBox="0 0 80 10" preserveAspectRatio="none" style={{ animationPlayState: run }}>
                      <path d="M0 5 Q10 0 20 5 T40 5 T60 5 T80 5 V10 H0Z" fill={p.color} />
                    </svg>
                  </span>
                </motion.span>
                {/* glass gloss */}
                <span className="pointer-events-none absolute inset-y-0 left-[5px] w-[6px] rounded-full bg-white/25 blur-[1px]" />
                <span className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[inset_-4px_0_8px_rgba(0,0,0,0.35)]" />
              </span>
              {/* bottom cap */}
              <span className="h-3 w-12 rounded-b-[10px] rounded-t-[3px] bg-gradient-to-t from-[#E5E5EA] to-[#8E8E93]" />
              <span className={cn("mt-1 text-[11.5px] font-semibold transition-colors duration-200", active ? "text-white" : "text-white/50")}>{p.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────────────────────────── insights carousel ───────────────────────────── */

function InsightsCarousel({ items }: { items: { color: string; title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? el.clientWidth) + 12;
    const next = Math.round(el.scrollLeft / step);
    setPage((p) => (p === next ? p : next));
  };
  if (!items.length) return null;
  return (
    <div>
      <div ref={ref} onScroll={onScroll} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ color, title, body }) => (
          <div key={title} className="w-[82%] shrink-0 snap-start rounded-[22px] p-4 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.10)]" style={{ background: `linear-gradient(150deg, ${color}2e 0%, ${CARD} 55%)` }}>
            <p className="text-[17px] font-bold leading-snug tracking-[-0.01em] text-white">{title}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">{body}</p>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {items.map((_, i) => <span key={i} className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-200", i === page ? "bg-white" : "bg-white/25")} />)}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── highlight tile ───────────────────────────── */

function Tile({ color, title, value, format, unit, sub, loading }: {
  color: string; title: string; value: number; format: (n: number) => string; unit?: string; sub?: string; loading?: boolean;
}) {
  return (
    <Card className="flex flex-col p-3.5">
      <CardTitle color={color} title={title} />
      <div className="mt-auto pt-4">
        {loading ? <span className="block h-7 w-20 animate-pulse rounded-lg bg-white/10" /> : (
          <p className="text-[26px] font-bold leading-none tracking-tight text-white tabular-nums">
            <CountUp value={value} format={format} />
            {unit && <span className="ml-0.5 text-[14px] font-semibold text-white/45">{unit}</span>}
          </p>
        )}
        {sub && <p className="mt-1 truncate text-[12px] text-white/40">{sub}</p>}
      </div>
    </Card>
  );
}

/* ───────────────────────────── busy times (scrubbable bars) ───────────────────────────── */

function BusyTimes({ hourly, weekly, peakHour, busiestDay }: {
  hourly: { hour: string; count: number }[]; weekly: { day: string; count: number }[];
  peakHour?: { hour: string; count: number }; busiestDay?: { day: string; count: number };
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"hours" | "days">("hours");
  const bars = mode === "hours"
    ? hourly.map((h) => ({ label: h.hour, short: h.hour.replace(/(am|pm)/, ""), count: h.count }))
    : [1, 2, 3, 4, 5, 6, 0].map((i) => weekly[i]).filter(Boolean).map((d) => ({ label: d.day, short: d.day.slice(0, 1), count: d.count }));
  const max = Math.max(1, ...bars.map((b) => b.count));
  const peakIdx = bars.reduce((b, x, i) => (x.count > bars[b].count ? i : b), 0);
  const { active, handlers } = useScrub(bars.length);
  const shown = bars[active ?? peakIdx];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <Card>
      <CardTitle color={ORANGE} title="Busy times" aside={<span className="text-[12px] text-white/40">drag to explore</span>} />
      <Segmented<"hours" | "days"> id="busy" className="mt-3" value={mode} onChange={setMode} options={[{ value: "hours", label: "Hours" }, { value: "days", label: "Days" }]} />
      <div className="mt-4 h-[52px]">
        <p className="text-[13px] font-semibold text-white/45">{active == null ? (mode === "hours" ? "Peak hour" : "Busiest day") : mode === "hours" ? "Hour" : "Day"}</p>
        <p className="text-[26px] font-bold leading-tight tracking-tight text-white tabular-nums">
          {shown?.label ?? (mode === "hours" ? peakHour?.hour : busiestDay?.day) ?? "—"}
          <span className="ml-2 text-[14px] font-semibold text-white/45">{shown?.count ?? 0} {shown?.count === 1 ? "booking" : "bookings"}</span>
        </p>
      </div>
      <div ref={ref} {...handlers} key={mode} className="mt-3 flex h-32 touch-pan-y select-none items-end gap-[5px]">
        {bars.map((b, i) => {
          const isActive = i === (active ?? -1);
          const isPeak = i === peakIdx && b.count > 0;
          return (
            <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="relative w-full flex-1">
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-[5px] transition-colors duration-150"
                  style={{ backgroundColor: isActive ? "#FFFFFF" : isPeak ? ORANGE : "rgba(255,255,255,0.2)" }}
                  initial={{ transform: reduce ? `scaleY(${Math.max(0.04, b.count / max)})` : "scaleY(0)" }}
                  animate={{ transform: inView ? `scaleY(${Math.max(0.04, b.count / max)})` : "scaleY(0)" }}
                  transition={{ ...SPRING, delay: reduce ? 0 : i * 0.025 }}
                />
              </div>
              <span className={cn("mt-1.5 h-3 text-[9.5px] tabular-nums transition-colors duration-150", isActive ? "text-white" : "text-white/35")}>
                {mode === "days" || i % 3 === 0 ? b.short : ""}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────────────────────────── heatmap ───────────────────────────── */

function Heatmap({ grid, max }: { grid: number[][]; max: number }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hour = (h: number) => (h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);
  const [cell, setCell] = useState<{ d: number; h: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <Card>
      <CardTitle color={ACCENT} title="Demand map" aside={<span className="text-[12px] tabular-nums text-white/50">{cell ? `${days[cell.d]} ${hour(cell.h + 8)} · ${grid[cell.d][cell.h]}` : "tap a square"}</span>} />
      <div ref={ref} className="mt-3 grid grid-cols-[26px_1fr] gap-x-1.5">
        <div className="grid grid-rows-7 gap-[3px] text-[9.5px] text-white/35">{days.map((d) => <span key={d} className="flex items-center">{d}</span>)}</div>
        <div className="grid grid-rows-7 gap-[3px]">
          {grid.map((row, d) => (
            <div key={d} className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((v, h) => (
                <button
                  key={h} type="button" aria-label={`${days[d]} ${hour(h + 8)}: ${v} bookings`}
                  onClick={() => { haptic("selection"); setCell({ d, h }); }}
                  className={cn("rp-heat-cell aspect-square rounded-[4px]", cell?.d === d && cell?.h === h && "ring-2 ring-white")}
                  style={{
                    backgroundColor: v === 0 ? "rgba(255,255,255,0.06)" : `rgba(255,45,70,${0.2 + (v / Math.max(1, max)) * 0.8})`,
                    animationDelay: `${(h + d) * 16}ms`,
                    animationPlayState: inView ? "running" : "paused",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex justify-between pl-8 text-[9.5px] text-white/35"><span>8am</span><span>2pm</span><span>8pm</span></div>
    </Card>
  );
}

/* ───────────────────────────── time of day (vertical capsules) ───────────────────────────── */

function Dayparts({ parts }: { parts: { key: string; range: string; count: number }[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const total = Math.max(1, parts.reduce((s, p) => s + p.count, 0));
  const icons = [Sun, Sunset, Moon];
  const colors = [YELLOW, ORANGE, INDIGO];
  const best = parts.reduce((b, p) => (p.count > b.count ? p : b), parts[0]);
  return (
    <Card>
      <CardTitle color={YELLOW} title="Time of day" aside={<span className="text-[12px] text-white/45">{best.key} wins</span>} />
      <div ref={ref} className="mt-4 grid grid-cols-3 gap-3">
        {parts.map((p, i) => {
          const Icon = icons[i];
          const share = p.count / total;
          return (
            <div key={p.key} className="flex flex-col items-center">
              <div className="relative h-24 w-full max-w-[64px] overflow-hidden rounded-[16px] bg-white/[0.06] ring-[0.5px] ring-white/10">
                <motion.div
                  className="absolute inset-0 origin-bottom rounded-[16px]"
                  style={{ background: `linear-gradient(180deg, ${colors[i]}, ${colors[i]}aa)` }}
                  initial={{ transform: reduce ? `scaleY(${share})` : "scaleY(0)" }}
                  animate={{ transform: inView ? `scaleY(${share})` : "scaleY(0)" }}
                  transition={{ ...SPRING, duration: 0.7, delay: reduce ? 0 : 0.1 + i * 0.08 }}
                />
                <Icon className="absolute left-1/2 top-2 h-4 w-4 -translate-x-1/2 text-white/70" />
              </div>
              <p className="mt-2 text-[17px] font-bold tabular-nums text-white">{Math.round(share * 100)}%</p>
              <p className="text-[11px] text-white/40">{p.key}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ───────────────────────────── grouped list ───────────────────────────── */

function RankedList({ rows }: { rows: { id: string; name: string; sub: string; value: number; tint: string }[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const max = Math.max(1, ...rows.map((r) => r.value));
  const medal = ["#FFD60A", "#C7C7CC", "#FF9F0A"];
  return (
    <ul ref={ref} className="overflow-hidden rounded-[22px] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.10)]" style={{ backgroundColor: CARD }}>
      {rows.map((r, i) => (
        <li key={r.id} className="relative flex items-center gap-3 py-3 pl-4 pr-4">
          {i > 0 && <span className="absolute left-[60px] right-0 top-0 h-px bg-white/[0.07]" />}
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ backgroundColor: `${r.tint}33` }}>
            {r.name.slice(0, 1).toUpperCase()}
            {i < 3 && r.value > 0 && <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black ring-2 ring-[#1C1C1E]" style={{ backgroundColor: medal[i] }}>{i + 1}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">{r.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full origin-left rounded-full" style={{ backgroundColor: r.tint }}
                  initial={{ transform: reduce ? `scaleX(${r.value / max})` : "scaleX(0)" }}
                  animate={{ transform: inView ? `scaleX(${r.value / max})` : "scaleX(0)" }}
                  transition={{ ...SPRING, duration: 0.6, delay: reduce ? 0 : 0.1 + i * 0.05 }}
                />
              </div>
              <span className="shrink-0 text-[11.5px] text-white/40">{r.sub}</span>
            </div>
          </div>
          <p className="shrink-0 text-[15px] font-semibold tabular-nums text-white">{currency.format(r.value)}</p>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── reviews ───────────────────────────── */

function Reviews({ reviews }: { reviews: ReviewRow[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const latest = reviews.find((r) => r.comment);
  return (
    <Card>
      <CardTitle color={YELLOW} title="Reviews" aside={<span className="text-[12px] text-white/45">{reviews.length} total</span>} />
      {reviews.length === 0 ? (
        <p className="py-5 text-center text-[13px] text-white/40">No reviews yet. Happy clients get a review link after each visit.</p>
      ) : (
        <>
          <div ref={ref} className="mt-3 flex items-center gap-5">
            <div className="shrink-0 text-center">
              <p className="text-[44px] font-bold leading-none tracking-tight text-white tabular-nums">{avg.toFixed(1)}</p>
              <div className="mt-1.5 flex justify-center gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= Math.round(avg) ? "fill-[#FFD60A] text-[#FFD60A]" : "text-white/20")} />)}</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {dist.map(({ s, n }, i) => (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2.5 text-white/45">{s}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div className="h-full origin-left rounded-full bg-[#FFD60A]"
                      initial={{ transform: reduce ? `scaleX(${n / reviews.length})` : "scaleX(0)" }}
                      animate={{ transform: inView ? `scaleX(${n / reviews.length})` : "scaleX(0)" }}
                      transition={{ ...SPRING, duration: 0.6, delay: reduce ? 0 : i * 0.05 }} />
                  </div>
                  <span className="w-4 text-right tabular-nums text-white/40">{n}</span>
                </div>
              ))}
            </div>
          </div>
          {latest && (
            <div className="mt-4 rounded-[16px] bg-white/[0.05] p-3 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
              <p className="text-[13.5px] leading-relaxed text-white/75">“{latest.comment}”</p>
              <p className="mt-1.5 text-[11.5px] text-white/40">— {latest.reviewer_name || "Client"}</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ───────────────────────────── page ───────────────────────────── */

export function MobileReports({ analytics, trend, isLoading, topCustomers, reviews, dateRange, setDateRange, onExport }: {
  analytics: any; trend: Trend; isLoading: boolean; topCustomers: TopCustomerRow[]; reviews: ReviewRow[];
  dateRange: RangeValue; setDateRange: (v: RangeValue) => void; onExport: () => void;
}) {
  const reduce = useReducedMotion();
  const a = analytics;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const fmtHours = (mins: number) => (mins / 60).toFixed(mins % 60 ? 1 : 0);
  const revDelta = pctDelta(trend.totals.revenue, trend.prevTotals.revenue);

  const insights = useMemo(() => {
    if (!a.totalAppointments) return [];
    const out: { color: string; title: string; body: string }[] = [];
    const diff = trend.totals.revenue - trend.prevTotals.revenue;
    out.push(diff >= 0
      ? { color: GREEN, title: revDelta == null ? "Your first revenue this period" : `Revenue is up ${revDelta}%`, body: `You made ${currency.format(diff)} more than the period before. Keep the momentum going.` }
      : { color: ACCENT, title: `Revenue is down ${Math.abs(revDelta ?? 0)}%`, body: `${currency.format(-diff)} behind the period before. Share your booking link or run a quick promo.` });
    if (a.busiestDay?.count) out.push({ color: ORANGE, title: `${a.busiestDay.day}s are your busiest`, body: `${a.busiestDay.count} bookings landed on ${a.busiestDay.day}. Consider premium pricing on that day.` });
    if (a.quietHour) out.push({ color: BLUE, title: `Fill your ${a.quietHour.hour} slot`, body: "It's your quietest hour. A small off-peak discount can turn dead time into revenue." });
    out.push({ color: INDIGO, title: `${a.returningRate ?? 0}% of clients came back`, body: a.returningRate >= 30 ? "Great loyalty — reward regulars to keep it that way." : "Send a rebook reminder after each visit to lift repeat bookings." });
    return out;
  }, [a, trend, revDelta]);

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, transform: reduce ? "none" : "translateY(10px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.4, ease: EASE_OUT, delay: i * 0.05 },
  });

  return (
    <div className="px-4 pb-36 pt-2">
      {/* Large title */}
      <motion.header {...fadeUp(0)} className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-white/40">{today}</p>
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-white">Reports</h1>
        </div>
        <button type="button" onClick={() => { haptic("light"); onExport(); }} aria-label="Export CSV"
          className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(118,118,128,0.24)] text-white shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.10)] transition-transform duration-150 ease-out active:scale-[0.92]">
          <Download className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </motion.header>

      <motion.div {...fadeUp(1)} className="mt-3">
        <Segmented<RangeValue> id="range" value={dateRange} onChange={setDateRange} options={MOBILE_RANGES.map((r) => ({ value: r.value, label: r.short }))} />
      </motion.div>

      <motion.div {...fadeUp(2)} className="mt-4">
        <Summary trend={trend} loading={isLoading} dateRange={dateRange} />
      </motion.div>

      {insights.length > 0 && (
        <>
          <SectionHeader title="Highlights" />
          <Reveal><InsightsCarousel items={insights} /></Reveal>
        </>
      )}

      <SectionHeader title="Activity" />
      <Reveal>
        <BarberPoles poles={[
          { label: "Completed", value: a.completionRate ?? 0, color: ACCENT, sub: `${a.completedAppointments ?? 0} of ${a.totalAppointments ?? 0} bookings` },
          { label: "Returning", value: a.returningRate ?? 0, color: GREEN, sub: `${a.returningCustomers ?? 0} of ${a.totalCustomers ?? 0} clients` },
          { label: "Active days", value: Math.min(100, a.rangeDays ? Math.round(((a.activeDays ?? 0) / a.rangeDays) * 100) : 0), color: BLUE, sub: `${a.activeDays ?? 0} of ${a.rangeDays ?? 0} days` },
        ]} />
      </Reveal>

      <Reveal className="mt-3 grid grid-cols-2 gap-3">
        <Tile color={ACCENT} title="Per day" value={a.revenuePerDay ?? 0} format={(n) => currency.format(n)} sub="average revenue" loading={isLoading} />
        <Tile color={YELLOW} title="Bookings" value={a.bookingsPerDay ?? 0} format={(n) => n.toFixed(1)} unit="/day" sub={`${a.totalAppointments ?? 0} in total`} loading={isLoading} />
        <Tile color={INDIGO} title="Chair time" value={Number(fmtHours(a.minutesBooked ?? 0))} format={(n) => n.toFixed(n % 1 ? 1 : 0)} unit="h" sub={`~${a.avgDuration ?? 0} min each`} loading={isLoading} />
        <Tile color={GREEN} title="Upcoming" value={a.upcomingRevenue ?? 0} format={(n) => currency.format(n)} sub={`${a.scheduledAppointments ?? 0} still to come`} loading={isLoading} />
        <Tile color={ORANGE} title="Cancels" value={a.cancelRate ?? 0} format={(n) => String(Math.round(n))} unit="%" sub={`${a.cancelledAppointments ?? 0} cancelled`} loading={isLoading} />
        <Tile color={a.noShows ? ACCENT : GREEN} title="No-shows" value={a.noShows ?? 0} format={(n) => String(Math.round(n))} sub={a.noShows ? "worth a follow-up" : "clean record"} loading={isLoading} />
        <Tile color={ORANGE} title="Streak" value={a.streak ?? 0} format={(n) => String(Math.round(n))} unit="d" sub="booked days in a row" loading={isLoading} />
        <Tile color={BLUE} title="Weekend" value={a.weekendShare ?? 0} format={(n) => String(Math.round(n))} unit="%" sub="of all bookings" loading={isLoading} />
      </Reveal>

      {a.bestDay && (
        <Reveal className="mt-3">
          <Card className="flex items-center gap-3" >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFD60A]/20 text-[#FFD60A]"><Crown className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/45">Best day</p>
              <p className="truncate text-[17px] font-bold text-white">{new Date(`${a.bestDay.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
            </div>
            <div className="text-right">
              <p className="text-[17px] font-bold tabular-nums text-white">{currency.format(a.bestDay.revenue)}</p>
              <p className="text-[12px] text-white/40">{a.bestDay.appointments} bookings</p>
            </div>
          </Card>
        </Reveal>
      )}

      <SectionHeader title="Trends" />
      <div className="space-y-3">
        {a.hourlyDemand?.length > 0 && <Reveal><BusyTimes hourly={a.hourlyDemand} weekly={a.dayOfWeekDemand ?? []} peakHour={a.peakHour} busiestDay={a.busiestDay} /></Reveal>}
        {a.heatmap && <Reveal><Heatmap grid={a.heatmap} max={a.heatMax ?? 1} /></Reveal>}
        {a.dayparts && <Reveal><Dayparts parts={a.dayparts} /></Reveal>}
      </div>

      <SectionHeader title="Services" aside={a.topService ? `${a.topServiceShare}% ${a.topService.name}` : undefined} />
      <Reveal><ServiceMixCard compact services={a.serviceBreakdown ?? []} className="!rounded-[22px] !border-[0.5px] !border-white/10 !bg-[#1C1C1E]" /></Reveal>

      {a.stylistPerformance?.length > 0 && (
        <>
          <SectionHeader title="Team" aside={`${a.stylistPerformance.length} stylists`} />
          <Reveal>
            <RankedList rows={a.stylistPerformance.slice(0, 5).map((s: any, i: number) => ({
              id: s.id, name: s.name, sub: `${s.bookings} bookings`, value: s.revenue, tint: [ACCENT, BLUE, INDIGO, GREEN, ORANGE][i % 5],
            }))} />
          </Reveal>
        </>
      )}

      {topCustomers.length > 0 && (
        <>
          <SectionHeader title="Best clients" aside="top spenders" />
          <Reveal>
            <RankedList rows={topCustomers.slice(0, 5).map((c, i) => ({
              id: c.id, name: c.name, sub: `${c.bookings} ${c.bookings === 1 ? "visit" : "visits"}`, value: c.revenue, tint: [YELLOW, GREEN, BLUE, INDIGO, ACCENT][i % 5],
            }))} />
          </Reveal>
        </>
      )}

      <SectionHeader title="Reputation" aside="all time" />
      <Reveal><Reviews reviews={reviews} /></Reveal>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, animate, useMotionValue, useTransform, useReducedMotion, useInView } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { money } from "@/components/reports/money";

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const ACCENT = "#FF2D46";
export const MIX_COLORS = [ACCENT, "#FF9F0A", "#5E5CE6", "#0A84FF", "#30D158", "#FFD60A"];


export type MetricKey = "revenue" | "bookings" | "clients";
export interface SeriesPoint { label: string; revenue: number; bookings: number; clients: number }
export interface SeriesRow { appointment_date: string; appointment_time?: string | null; price: number | null; customer_id: string | null }
export type Totals = Record<MetricKey, number>;


const dayMs = 86_400_000;
const localDay = (s: string) => new Date(`${s}T00:00:00`).getTime();

/** Dense, bucketed series so two periods line up point-for-point: hours for 1 day, days up to ~2 months, weeks beyond. */
export function buildSeries(rows: SeriesRow[], start: Date, days: number): SeriesPoint[] {
  const mode = days <= 1 ? "hour" : days <= 62 ? "day" : "week";
  const size = mode === "hour" ? 13 : mode === "day" ? days : Math.ceil(days / 7);
  const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const buckets = Array.from({ length: size }, (_, i) => {
    let label: string;
    if (mode === "hour") { const h = i + 8; label = h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`; }
    else {
      const d = new Date(startMs + i * (mode === "week" ? 7 : 1) * dayMs);
      label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return { label, revenue: 0, bookings: 0, set: new Set<string>() };
  });
  rows.forEach((r) => {
    let idx: number;
    if (mode === "hour") idx = parseInt(String(r.appointment_time || "0").split(":")[0], 10) - 8;
    else {
      const diff = Math.round((localDay(r.appointment_date) - startMs) / dayMs);
      idx = mode === "week" ? Math.floor(diff / 7) : diff;
    }
    const b = buckets[Math.max(0, Math.min(size - 1, idx))];
    if (!b) return;
    b.revenue += r.price || 0;
    b.bookings += 1;
    if (r.customer_id) b.set.add(r.customer_id);
  });
  return buckets.map(({ label, revenue, bookings, set }) => ({ label, revenue, bookings, clients: set.size }));
}

export const pctDelta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? null : 0);

/** Eases from the previous value to the new one (never restarts from 0 after mount). `instant` jumps — use while scrubbing. */
export function CountUp({ value, format, className, instant }: { value: number; format: (n: number) => string; className?: string; instant?: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (reduce || instant) { mv.stop(); mv.set(value); return; }
    const c = animate(mv, value, { duration: 0.6, ease: EASE_OUT });
    return () => c.stop();
  }, [value, mv, reduce, instant]);
  return <motion.span className={className}>{text}</motion.span>;
}

export function DeltaChip({ delta, className }: { delta: number | null; className?: string }) {
  const Icon = delta == null || delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const good = delta == null || delta >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums", good ? "bg-[#30D158]/12 text-[#30D158]" : "bg-[#FF2D46]/12 text-[#FF5A6E]", className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      {delta == null ? "New" : `${Math.abs(delta)}%`}
    </span>
  );
}

/** Scroll-reveal wrapper: once, opacity + short rise. */
export function Reveal({ children, className, delay = 0, id, innerRef }: { children: ReactNode; className?: string; delay?: number; id?: string; innerRef?: React.Ref<HTMLDivElement> }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      id={id}
      ref={innerRef}
      initial={{ opacity: 0, transform: reduce ? "none" : "translateY(16px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const w = 100, h = 32;
  const max = Math.max(1, ...values);
  const pts = (values.length > 1 ? values : [0, ...values, 0]).map((v, i, a) => [(i / (a.length - 1)) * w, h - 2 - (v / max) * (h - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient>
      </defs>
      <motion.path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: inView ? 1 : 0 }} transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: inView ? 1 : reduce ? 1 : 0 }} transition={{ duration: 0.7, ease: EASE_OUT }} />
    </svg>
  );
}

/** KPI tile: icon, count-up value, delta vs prior period, and a drawn-in sparkline. */
export function SparkKpi({ icon, label, value, format, delta, spark, tint, index = 0, loading, hint }: {
  icon: ReactNode; label: string; value: number; format: (n: number) => string; delta?: number | null;
  spark: number[]; tint: string; index?: number; loading?: boolean; hint?: string;
}) {
  return (
    <Reveal delay={index * 0.05} className="h-full">
      <div className="flex h-full flex-col rounded-[24px] border border-white/[0.08] bg-[#121215] p-5 transition-colors duration-200 hover:border-white/[0.14]">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: `${tint}1f`, color: tint }}>{icon}</span>
          {delta !== undefined && !loading && <DeltaChip delta={delta} />}
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
        {loading ? <span className="mt-1.5 inline-block h-8 w-24 animate-pulse rounded-[10px] bg-white/10" /> : (
          <CountUp value={value} format={format} className="mt-1 block text-[28px] font-bold leading-tight tracking-tight text-white tabular-nums" />
        )}
        {hint && <p className="text-[11.5px] text-white/40">{hint}</p>}
        <div className="mt-auto pt-3"><Sparkline values={spark} color={tint} id={`spark-${label.replace(/\W/g, "")}`} /></div>
      </div>
    </Reveal>
  );
}

const HEAT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabel = (h: number) => (h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);

/** Day × hour demand grid. Hover/tap a cell to read it in the header. */
export function HeatmapCard({ grid, max, className }: { grid: number[][]; max: number; className?: string }) {
  const [cell, setCell] = useState<{ d: number; h: number } | null>(null);
  const total = grid.flat().reduce((s, v) => s + v, 0);
  const peak = useMemo(() => {
    let best = { d: 0, h: 0, v: -1 };
    grid.forEach((row, d) => row.forEach((v, h) => { if (v > best.v) best = { d, h, v }; }));
    return best;
  }, [grid]);
  const shown = cell ?? (peak.v > 0 ? { d: peak.d, h: peak.h } : null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div className={cn("rounded-[28px] border border-white/[0.08] bg-[#121215] p-5 md:p-7", className)}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-white">Demand heatmap</h3>
          <p className="mt-1 text-sm text-white/50">When your chair fills up, by day and hour</p>
        </div>
        <div className="min-w-[120px] text-right">
          {shown ? (
            <>
              <p className="text-[15px] font-semibold text-white tabular-nums">{HEAT_DAYS[shown.d]} · {hourLabel(shown.h + 8)}</p>
              <p className="text-[12px] text-white/45">{grid[shown.d][shown.h]} bookings{!cell ? " · peak" : ""}</p>
            </>
          ) : <p className="text-[12px] text-white/40">No bookings yet</p>}
        </div>
      </div>
      <div ref={ref} className="grid grid-cols-[30px_1fr] gap-x-2" onPointerLeave={() => setCell(null)}>
        <div className="grid grid-rows-7 gap-[4px] text-[10.5px] text-white/40">
          {HEAT_DAYS.map((d) => <span key={d} className="flex items-center">{d}</span>)}
        </div>
        <div className="grid grid-rows-7 gap-[4px]">
          {grid.map((row, d) => (
            <div key={d} className="grid gap-[4px]" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((v, h) => {
                const a = v / Math.max(1, max);
                const active = shown?.d === d && shown?.h === h;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-label={`${HEAT_DAYS[d]} ${hourLabel(h + 8)}: ${v} bookings`}
                    onPointerEnter={() => setCell({ d, h })}
                    onClick={() => { haptic("selection"); setCell({ d, h }); }}
                    className={cn("rp-heat-cell h-6 rounded-[6px] outline-none transition-[box-shadow] duration-150 md:h-7", active && "ring-2 ring-white/80")}
                    style={{
                      backgroundColor: v === 0 ? "rgba(255,255,255,0.045)" : `rgba(255,45,70,${0.16 + a * 0.84})`,
                      animationDelay: `${(h + d) * 18}ms`,
                      animationPlayState: inView ? "running" : "paused",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[30px_1fr] gap-x-2 text-[10px] text-white/35">
        <span />
        <div className="flex justify-between"><span>8am</span><span>11am</span><span>2pm</span><span>5pm</span><span>8pm</span></div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-white/40">
        <span>{total} bookings mapped</span>
        <span className="flex items-center gap-1.5">Less
          {[0.16, 0.4, 0.65, 1].map((o) => <span key={o} className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: `rgba(255,45,70,${o})` }} />)}
          More</span>
      </div>
    </div>
  );
}

/** Ring chart drawn with stroked circles: no chart library, and it animates on the compositor. */
export function Donut({ slices, active = null, onActive, thickness = 16 }: {
  slices: { name: string; value: number; fill: string }[]; active?: number | null; onActive?: (i: number | null) => void; thickness?: number;
}) {
  const r = 50 - thickness / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const gap = slices.length > 1 ? 2.5 : 0;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="rp-donut h-full w-full -rotate-90" onPointerLeave={() => onActive?.(null)}>
      {slices.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = Math.max(0.5, len - gap);
        const el = (
          <circle key={s.name} cx="50" cy="50" r={r} fill="none" stroke={s.fill} strokeWidth={thickness} strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            opacity={active == null || active === i ? 1 : 0.3} style={{ transition: "opacity 150ms ease" }}
            onPointerEnter={() => onActive?.(i)} />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

/** Revenue mix donut — hover a slice or legend row to focus it. */
export function ServiceMixCard({ services, className, compact: isCompact }: { services: { name: string; bookings: number; revenue: number }[]; className?: string; compact?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const total = services.reduce((s, x) => s + x.revenue, 0);
  const data = services.map((s, i) => ({ ...s, fill: MIX_COLORS[i % MIX_COLORS.length], value: Math.max(s.revenue, 0.0001) }));
  const focus = active != null ? data[active] : null;
  const size = isCompact ? 150 : 190;

  return (
    <div className={cn("rounded-[28px] border border-white/[0.08] bg-[#121215]", isCompact ? "p-4" : "p-5 md:p-7", className)}>
      <div className="mb-4">
        <h3 className={cn("font-semibold tracking-tight text-white", isCompact ? "text-[15px]" : "text-xl")}>Revenue mix</h3>
        {!isCompact && <p className="mt-1 text-sm text-white/50">Where your money comes from</p>}
      </div>
      {!data.length ? <p className="py-8 text-center text-[13px] text-white/40">No services booked in this range.</p> : (
        <div className={cn("flex gap-5", isCompact ? "flex-col items-center" : "flex-col items-center sm:flex-row")}>
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <Donut slices={data} active={active} onActive={setActive} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className={cn("font-bold tabular-nums text-white", isCompact ? "text-[18px]" : "text-[22px]")}>{money(focus ? focus.revenue : total)}</p>
              <p className="max-w-full truncate text-[10.5px] text-white/45">{focus ? `${Math.round((focus.revenue / Math.max(1, total)) * 100)}% · ${focus.name}` : "total"}</p>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-1">
            {data.map((d, i) => (
              <li key={d.name}>
                <button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onClick={() => setActive(active === i ? null : i)}
                  className={cn("flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-left transition-colors duration-150", active === i && "bg-white/[0.06]")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-white">{d.name}</span>
                  <span className="text-[12px] tabular-nums text-white/45">{d.bookings}×</span>
                  <span className="w-12 text-right text-[12.5px] font-semibold tabular-nums text-white">{Math.round((d.revenue / Math.max(1, total)) * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

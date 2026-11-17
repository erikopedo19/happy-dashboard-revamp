import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { money } from "@/components/reports/money";
import { ACCENT, CountUp, DeltaChip, pctDelta, type MetricKey, type SeriesPoint, type Totals } from "@/components/reports/ReportsVisuals";

const num = new Intl.NumberFormat("en-US");
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

const METRICS: { key: MetricKey; label: string; fmt: (n: number) => string }[] = [
  { key: "revenue", label: "Revenue", fmt: (n) => money(n) },
  { key: "bookings", label: "Bookings", fmt: (n) => num.format(Math.round(n)) },
  { key: "clients", label: "Clients", fmt: (n) => num.format(Math.round(n)) },
];

function MetricTabs({ value, onChange, id }: { value: MetricKey; onChange: (m: MetricKey) => void; id: string }) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-white/[0.06] p-1">
      {METRICS.map((m) => (
        <button
          key={m.key}
          role="tab"
          aria-selected={value === m.key}
          type="button"
          onClick={() => { if (value !== m.key) { haptic("selection"); onChange(m.key); } }}
          className={cn("relative rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors duration-150", value === m.key ? "text-white" : "text-white/50 hover:text-white/75")}
        >
          {value === m.key && <motion.span layoutId={`${id}-metric-pill`} transition={{ type: "spring", duration: 0.3, bounce: 0 }} className="absolute inset-0 rounded-full bg-white/[0.14]" />}
          <span className="relative">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  const cur = payload.find((p: any) => p.dataKey === "cur")?.value ?? 0;
  const prev = payload.find((p: any) => p.dataKey === "prev")?.value;
  return (
    <div className="rounded-[14px] border border-white/[0.08] bg-[#1C1C1E]/95 px-3 py-2 text-[12px] shadow-2xl backdrop-blur-xl">
      <p className="mb-1 font-medium text-white/50">{label}</p>
      <p className="flex items-center gap-2 font-semibold text-white"><span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />{fmt(cur)}</p>
      {prev != null && <p className="mt-0.5 flex items-center gap-2 text-white/50"><span className="h-0.5 w-2 rounded-full bg-white/40" />{fmt(prev)} before</p>}
    </div>
  );
}

/** Hero card: metric switcher, count-up total, period-over-period delta, area chart with the prior period ghosted behind it. */
export function MetricHero({ series, prevSeries, totals, prevTotals, loading, compact: isCompact, aside, rangeLabel }: {
  series: SeriesPoint[]; prevSeries: SeriesPoint[]; totals: Totals; prevTotals: Totals;
  loading?: boolean; compact?: boolean; aside?: ReactNode; rangeLabel?: string;
}) {
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const m = METRICS.find((x) => x.key === metric)!;
  const delta = pctDelta(totals[metric], prevTotals[metric]);
  const data = useMemo(
    () => series.map((p, i) => ({ label: p.label, cur: p[metric], prev: prevSeries[i]?.[metric] ?? 0 })),
    [series, prevSeries, metric],
  );
  const best = data.reduce((b, d, i) => (d.cur > (data[b]?.cur ?? -1) ? i : b), 0);
  const gid = isCompact ? "mh-grad-m" : "mh-grad";

  return (
    <div className={cn("relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#121215]", isCompact ? "p-4" : "p-6 md:p-8")}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-60 blur-3xl" style={{ background: `radial-gradient(circle, ${ACCENT}40, transparent 70%)` }} />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <MetricTabs value={metric} onChange={setMetric} id={isCompact ? "m" : "d"} />
          <div className="mt-4 flex items-end gap-3">
            {loading ? (
              <span className={cn("inline-block animate-pulse rounded-xl bg-white/10", isCompact ? "h-10 w-40" : "h-14 w-56")} />
            ) : (
              <CountUp key={metric} value={totals[metric]} format={m.fmt} className={cn("block font-bold leading-none tracking-[-0.035em] text-white tabular-nums", isCompact ? "text-[40px]" : "text-[48px] md:text-[60px]")} />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-white/50">
            <DeltaChip delta={delta} />
            <span>vs {m.fmt(prevTotals[metric])} {rangeLabel === "Today" || rangeLabel === "Day" ? "yesterday" : "the period before"}</span>
          </div>
        </div>
        {aside}
      </div>

      <div className={cn("relative mt-5 w-full", isCompact ? "-mx-1 h-[150px]" : "h-[240px] md:h-[300px]")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart key={metric} data={data} margin={{ top: 10, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.42} />
                <stop offset="70%" stopColor={ACCENT} stopOpacity={0.04} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            {!isCompact && <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="rgba(255,255,255,0.07)" />}
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} dy={6}
              tick={{ fontSize: 10.5, fill: "rgba(255,255,255,0.4)", fontWeight: 500 }} hide={isCompact} />
            <YAxis hide={isCompact} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => compact(Number(v))}
              tick={{ fontSize: 10.5, fill: "rgba(255,255,255,0.4)", fontWeight: 500 }} />
            <Tooltip cursor={{ stroke: "rgba(255,255,255,0.25)", strokeDasharray: "3 4" }} content={<ChartTip fmt={m.fmt} />} />
            <Line type="monotone" dataKey="prev" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} strokeDasharray="4 5" dot={false} activeDot={false} isAnimationActive={false} />
            <Area
              type="monotone" dataKey="cur" stroke={ACCENT} strokeWidth={2.5} fill={`url(#${gid})`}
              animationDuration={700} animationEasing="ease-out"
              dot={(p: any) => (p.index === best && p.payload.cur > 0 ? <circle key="best" cx={p.cx} cy={p.cy} r={4} fill={ACCENT} stroke="#121215" strokeWidth={2} /> : <g key={p.index} />)}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#121215", fill: ACCENT }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!isCompact && (
        <div className="relative mt-3 flex items-center gap-4 text-[11.5px] text-white/45">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />This period</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-white/40" />Previous period</span>
        </div>
      )}
    </div>
  );
}


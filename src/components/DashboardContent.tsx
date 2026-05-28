import { useMemo } from 'react';
import {
  Calendar, Users, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Clock, ChevronRight,
  TrendingUp, Star, Activity, Scissors, CheckCircle2, XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter, addDays } from 'date-fns';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Area, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Line, ComposedChart, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";

const db = supabase as any;

// Noir Rose palette
const BG = "#0a0203";
const SURFACE = "#1a0509";
const SURFACE_2 = "#0f0306";
const BORDER = "rgba(255,255,255,0.05)";
const ROSE = "#e11d48";
const ROSE_SOFT = "#f43f5e";
const BLUE = "#3b82f6";
const TEXT_DIM = "rgba(255,255,255,0.45)";

const tooltipStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  fontSize: 12,
  color: "#fff",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ['dashboard-appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('appointments')
        .select(`*, customer:customers(name, email), service:services(name, price)`)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false })
        .limit(800);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['dashboard-customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await db.from('customers').select('id, created_at').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const todays = appointments.filter(a => isToday(parseISO(a.appointment_date)));
    const todayRevenue = todays.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const last30 = appointments.filter(a => isAfter(parseISO(a.appointment_date), subDays(new Date(), 30)));
    const prev30 = appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return isAfter(d, subDays(new Date(), 60)) && !isAfter(d, subDays(new Date(), 30));
    });
    const last30Revenue = last30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const prev30Revenue = prev30.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const trend = prev30.length ? Math.round(((last30.length - prev30.length) / prev30.length) * 100) : 0;
    const revenueTrend = prev30Revenue ? Math.round(((last30Revenue - prev30Revenue) / prev30Revenue) * 100) : 0;

    // 30 day series (revenue + bookings)
    const days30: { day: string; date: string; revenue: number; bookings: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const dayApts = appointments.filter(a => a.appointment_date === key);
      days30.push({
        day: format(d, 'd'),
        date: format(d, 'MMM d'),
        revenue: dayApts.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0),
        bookings: dayApts.length,
      });
    }

    const newCustomers30 = (customers as any[]).filter((c: any) => c.created_at && isAfter(parseISO(c.created_at), subDays(new Date(), 30))).length;

    // Top services by booking count (last 30d)
    const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
    last30.forEach((a: any) => {
      const name = a.service?.name || 'Service';
      const cur = serviceMap.get(name) || { name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(a.price || a.service?.price || 0);
      serviceMap.set(name, cur);
    });
    const topServices = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    // Top customers
    const customerMap = new Map<string, { name: string; visits: number; spend: number }>();
    appointments.forEach((a: any) => {
      const name = a.customer?.name || 'Walk-in';
      const cur = customerMap.get(name) || { name, visits: 0, spend: 0 };
      cur.visits += 1;
      cur.spend += Number(a.price || a.service?.price || 0);
      customerMap.set(name, cur);
    });
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.spend - a.spend).slice(0, 5);

    // Hourly distribution (all-time)
    const hours: { hour: string; count: number }[] = [];
    for (let h = 7; h <= 21; h++) {
      hours.push({
        hour: `${h}`,
        count: appointments.filter((a: any) => parseInt((a.appointment_time || '0').slice(0, 2)) === h).length,
      });
    }
    const busiest = hours.reduce((b, x) => (x.count > b.count ? x : b), hours[0] || { hour: '0', count: 0 });
    const busiestHour = busiest.count ? `${busiest.hour.padStart(2, '0')}:00` : '—';

    // Week ahead
    const weekAhead: { label: string; count: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      weekAhead.push({
        label: format(d, 'EEE'),
        count: appointments.filter((a: any) => a.appointment_date === key && a.status !== 'cancelled').length,
        isToday: i === 0,
      });
    }

    const completed = appointments.filter((a: any) => a.status === 'completed').length;
    const cancelled = appointments.filter((a: any) => a.status === 'cancelled').length;
    const scheduled = appointments.filter((a: any) => a.status === 'scheduled').length;
    const completionRate = appointments.length ? Math.round((completed / appointments.length) * 100) : 0;

    const statusBreakdown = [
      { name: 'Completed', value: completed, color: BLUE },
      { name: 'Scheduled', value: scheduled, color: ROSE },
      { name: 'Cancelled', value: cancelled, color: '#6b7280' },
    ].filter(s => s.value > 0);

    return {
      todays: todays.length,
      todayRevenue,
      last30Revenue,
      customers: customers.length,
      newCustomers30,
      pending: scheduled,
      trend,
      revenueTrend,
      days30,
      topServices,
      topCustomers,
      hours,
      busiestHour,
      weekAhead,
      completed,
      cancelled,
      completionRate,
      statusBreakdown,
      avgTicket: last30.length ? Math.round(last30Revenue / last30.length) : 0,
    };
  }, [appointments, customers]);

  const upcoming = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments
      .filter(a => a.appointment_date >= today && a.status !== 'cancelled')
      .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time))
      .slice(0, 6);
  }, [appointments]);

  return (
    <div className="h-full overflow-auto bg-[#0a0203] text-white font-['Manrope']">
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-10 pb-32 sm:pb-10 max-w-[1500px] mx-auto space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] font-semibold text-white/40 truncate">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-white mt-1 leading-none font-['Sora']">
              Dashboard
            </h1>
          </div>
          <Button
            onClick={() => navigate('/agenda')}
            className="h-10 rounded-full bg-[#e11d48] hover:bg-[#e11d48]/90 text-white shadow-lg shadow-[#e11d48]/20 px-4 sm:px-5 font-semibold text-sm shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">New booking</span>
          </Button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Kpi index={0} title="Today's revenue" value={`€${stats.todayRevenue.toFixed(0)}`} delta={stats.revenueTrend} sub="vs prior 30d" icon={DollarSign} accent />
          <Kpi index={1} title="Today's bookings" value={stats.todays.toString()} delta={stats.trend} sub="vs prior 30d" icon={Calendar} />
          <Kpi index={2} title="Pending" value={stats.pending.toString()} delta={0} sub="awaiting confirmation" icon={Clock} hideDelta />
          <Kpi index={3} title="Customers" value={stats.customers.toString()} delta={stats.newCustomers30} sub={`+${stats.newCustomers30} this month`} icon={Users} isCount />
        </div>

        {/* Secondary stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MiniStat label="Avg ticket" value={`€${stats.avgTicket}`} icon={TrendingUp} tone="blue" />
          <MiniStat label="Completion" value={`${stats.completionRate}%`} icon={Activity} tone="rose" />
          <MiniStat label="Busiest hour" value={stats.busiestHour} icon={Clock} />
          <MiniStat label="Cancelled" value={stats.cancelled.toString()} icon={XCircle} />
        </div>

        {/* Revenue + bookings combo chart (full width) */}
        <Surface>
          <div className="p-5 sm:p-6">
            <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Last 30 days</p>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Sora']">
                    €{stats.last30Revenue.toFixed(0)}
                  </h2>
                  <DeltaPill value={stats.revenueTrend} />
                </div>
              </div>
              <Legend />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={stats.days30} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev30" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ROSE} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={ROSE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: ROSE, strokeOpacity: 0.25 }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, p: any) => p?.[0]?.payload?.date || ''}
                  formatter={(v: any, name: any) => name === 'revenue' ? [`€${Number(v).toFixed(0)}`, 'Revenue'] : [v, 'Bookings']}
                />
                <Area type="monotone" dataKey="revenue" stroke={ROSE} strokeWidth={2.5} fill="url(#rev30)" />
                <Line type="monotone" dataKey="bookings" stroke={BLUE} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        {/* Hourly + Status + Completion */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <Surface className="lg:col-span-2">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Hourly demand</p>
                  <h2 className="text-base font-semibold text-white mt-1">Busiest hour · <span className="text-[#e11d48]">{stats.busiestHour}</span></h2>
                </div>
                <Clock className="h-4 w-4 text-white/40" />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.hours} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                  <YAxis stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(225,29,72,0.08)' }} contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Bookings']} labelFormatter={(v) => `${v}:00`} />
                  <Bar dataKey="count" fill={ROSE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Surface>

          <Surface>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Status mix</p>
                  <h2 className="text-base font-semibold text-white mt-1">{stats.completionRate}% completion</h2>
                </div>
                <CheckCircle2 className="h-4 w-4 text-white/40" />
              </div>
              {stats.statusBreakdown.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/40">No data yet</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="h-[140px] w-[140px] shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.statusBreakdown} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={3} stroke="none">
                          {stats.statusBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-white font-['Sora']">{appointments.length}</span>
                      <span className="text-[10px] uppercase tracking-wider text-white/40">Total</span>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-2.5 min-w-0">
                    {stats.statusBreakdown.map((s) => (
                      <li key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-white/70 flex-1 truncate">{s.name}</span>
                        <span className="text-white font-semibold tabular-nums">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Surface>
        </div>

        {/* Week ahead + Upcoming */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3 sm:gap-4">
          <Surface>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Week ahead</p>
                <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-[#e11d48] hover:underline uppercase tracking-wider">
                  Open agenda
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 sm:gap-3">
                {stats.weekAhead.map((d, i) => {
                  const maxCount = Math.max(...stats.weekAhead.map((x) => x.count), 1);
                  const intensity = d.count / maxCount;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className={`rounded-2xl p-3 text-center ${
                        d.isToday ? 'bg-[#e11d48] text-white shadow-lg shadow-[#e11d48]/20' : 'bg-[#0f0306] border border-white/5'
                      }`}
                      style={!d.isToday && d.count > 0 ? { background: `rgba(225,29,72,${0.05 + intensity * 0.18})` } : {}}
                    >
                      <p className={`text-[10px] uppercase tracking-wider font-bold ${d.isToday ? 'text-white/80' : 'text-white/40'}`}>
                        {d.label}
                      </p>
                      <p className={`text-xl sm:text-2xl font-bold tracking-tight mt-1 font-['Sora'] ${d.isToday ? 'text-white' : 'text-white'}`}>{d.count}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Surface>

          <Surface>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Upcoming</p>
                  <h2 className="text-base font-semibold text-white mt-1">{upcoming.length} scheduled</h2>
                </div>
                <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-[#e11d48] hover:underline uppercase tracking-wider">
                  See all
                </button>
              </div>
              {upcoming.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-white/20 mb-2" />
                  <p className="text-sm text-white/40">No upcoming bookings</p>
                </div>
              ) : (
                <ul className="-mx-2">
                  {upcoming.map((a, idx) => (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${
                        idx !== upcoming.length - 1 ? 'border-b border-white/5' : ''
                      }`}
                      onClick={() => navigate('/agenda')}
                    >
                      <div className="h-9 w-9 rounded-2xl bg-[#0f0306] border border-white/5 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {(a.customer?.name || 'W')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {a.customer?.name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {a.service?.name || 'Service'} · {format(parseISO(a.appointment_date), 'MMM d')} · {a.appointment_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white tabular-nums">
                          €{Number(a.price || a.service?.price || 0).toFixed(0)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Surface>
        </div>

        {/* Top services + Top customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Surface>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Top services · 30d</p>
                  <h2 className="text-base font-semibold text-white mt-1">By bookings</h2>
                </div>
                <Scissors className="h-4 w-4 text-white/40" />
              </div>
              {stats.topServices.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/40">No data yet</p>
              ) : (
                <ul className="space-y-3.5">
                  {stats.topServices.map((s, i) => {
                    const max = stats.topServices[0].count || 1;
                    const pct = (s.count / max) * 100;
                    return (
                      <li key={i}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-semibold text-white truncate pr-2">{s.name}</span>
                          <span className="text-white/40 tabular-nums shrink-0 text-xs">
                            {s.count} · €{s.revenue.toFixed(0)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-gradient-to-r from-[#e11d48] to-[#f43f5e]"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Surface>

          <Surface>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Top customers</p>
                  <h2 className="text-base font-semibold text-white mt-1">By lifetime spend</h2>
                </div>
                <Star className="h-4 w-4 text-white/40" />
              </div>
              {stats.topCustomers.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/40">No data yet</p>
              ) : (
                <ul className="-mx-2">
                  {stats.topCustomers.map((c, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 px-2 py-2.5 ${
                        i !== stats.topCustomers.length - 1 ? 'border-b border-white/5' : ''
                      }`}
                    >
                      <div className="h-9 w-9 rounded-2xl bg-[#0f0306] border border-white/5 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                        <p className="text-xs text-white/40">{c.visits} visit{c.visits === 1 ? '' : 's'}</p>
                      </div>
                      <p className="text-sm font-bold text-white tabular-nums shrink-0">
                        €{c.spend.toFixed(0)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a0509] rounded-3xl border border-white/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${className}`}>
      {children}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-[11px]">
      <span className="flex items-center gap-1.5 text-white/60"><span className="h-2 w-2 rounded-full bg-[#e11d48]" /> Revenue</span>
      <span className="flex items-center gap-1.5 text-white/60"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Bookings</span>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: 'rose' | 'blue' }) {
  const iconTone = tone === 'rose' ? 'text-[#e11d48] bg-[#e11d48]/10' : tone === 'blue' ? 'text-[#3b82f6] bg-[#3b82f6]/10' : 'text-white/70 bg-white/5';
  return (
    <div className="bg-[#1a0509] rounded-3xl border border-white/[0.04] px-4 py-3.5 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 ${iconTone}`}>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 truncate">{label}</p>
        <p className="text-base font-bold text-white tabular-nums font-['Sora']">{value}</p>
      </div>
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
        positive ? 'text-emerald-300 bg-emerald-500/10' : 'text-[#e11d48] bg-[#e11d48]/10'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function Kpi({
  title, value, delta, sub, icon: Icon, accent, hideDelta, isCount, index = 0,
}: {
  title: string;
  value: string;
  delta: number;
  sub: string;
  icon: any;
  accent?: boolean;
  hideDelta?: boolean;
  isCount?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
      className="bg-[#1a0509] rounded-3xl border border-white/[0.04] p-5 cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
            accent ? 'bg-[#e11d48] text-white shadow-lg shadow-[#e11d48]/25' : 'bg-white/5 text-white/70'
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
        {!hideDelta && !isCount && <DeltaPill value={delta} />}
      </div>
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40 truncate">{title}</p>
      <p className="text-[24px] sm:text-[30px] font-bold tracking-tight text-white mt-1 leading-none font-['Sora']">
        {value}
      </p>
      <p className="text-[11px] sm:text-xs text-white/40 mt-2 truncate">{sub}</p>
    </motion.div>
  );
}

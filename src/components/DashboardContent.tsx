import { useMemo } from 'react';
import {
  Calendar, Users, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Clock, ChevronRight,
  TrendingUp, Star, Activity, Scissors,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter, addDays, startOfWeek } from 'date-fns';
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const db = supabase as any;

// 3-color minimal palette
// Surface (white/black), Ink (foreground), Accent (rose)
const ACCENT = "#e11d48";

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
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['dashboard-customers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await db.from('customers').select('id').eq('user_id', user.id);
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

    // Last 14 day series
    const days: { day: string; revenue: number; bookings: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const dayApts = appointments.filter(a => a.appointment_date === key);
      days.push({
        day: format(d, 'd'),
        revenue: dayApts.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0),
        bookings: dayApts.length,
      });
    }
    // New customers in last 30 days
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
    const topServices = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count).slice(0, 4);

    // Top customers
    const customerMap = new Map<string, { name: string; visits: number; spend: number }>();
    appointments.forEach((a: any) => {
      const name = a.customer?.name || 'Walk-in';
      const cur = customerMap.get(name) || { name, visits: 0, spend: 0 };
      cur.visits += 1;
      cur.spend += Number(a.price || a.service?.price || 0);
      customerMap.set(name, cur);
    });
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.spend - a.spend).slice(0, 4);

    // Busiest hour
    const hourMap = new Map<number, number>();
    appointments.forEach((a: any) => {
      const h = parseInt((a.appointment_time || '0').slice(0, 2));
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    });
    const busiest = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const busiestHour = busiest ? `${busiest[0].toString().padStart(2, '0')}:00` : '—';

    // Week ahead bookings (next 7 days, grouped by day)
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

    // Completion rate
    const completed = appointments.filter((a: any) => a.status === 'completed').length;
    const cancelled = appointments.filter((a: any) => a.status === 'cancelled').length;
    const completionRate = appointments.length ? Math.round((completed / appointments.length) * 100) : 0;

    return {
      todays: todays.length,
      todayRevenue,
      last30Revenue,
      customers: customers.length,
      newCustomers30,
      pending: appointments.filter(a => a.status === 'scheduled').length,
      trend,
      revenueTrend,
      days,
      topServices,
      topCustomers,
      busiestHour,
      weekAhead,
      completed,
      cancelled,
      completionRate,
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
    <div className="h-full overflow-auto bg-[#F5F5F7] dark:bg-[#0c0c0c]">
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-8 max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] font-semibold text-[#8E8E93] truncate">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[26px] sm:text-[34px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white mt-1 leading-none">
              Dashboard
            </h1>
          </div>
          <Button
            onClick={() => navigate('/agenda')}
            className="h-10 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] hover:bg-[#1C1C1E]/90 dark:hover:bg-white/90 px-4 sm:px-5 font-medium text-sm shrink-0"
          >
            <Plus className="h-4 w-4 sm:mr-1.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">New booking</span>
          </Button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Kpi title="Today's revenue" value={`€${stats.todayRevenue.toFixed(0)}`} delta={stats.revenueTrend} sub="vs last 30d" icon={DollarSign} accent />
          <Kpi title="Today's bookings" value={stats.todays.toString()} delta={stats.trend} sub="vs last 30d" icon={Calendar} />
          <Kpi title="Pending" value={stats.pending.toString()} delta={0} sub="awaiting confirmation" icon={Clock} hideDelta />
          <Kpi title="Customers" value={stats.customers.toString()} delta={stats.newCustomers30} sub={`+${stats.newCustomers30} this month`} icon={Users} isCount />
        </div>

        {/* Secondary stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MiniStat label="Avg ticket" value={`€${stats.avgTicket}`} icon={TrendingUp} />
          <MiniStat label="Completion" value={`${stats.completionRate}%`} icon={Activity} />
          <MiniStat label="Busiest hour" value={stats.busiestHour} icon={Clock} />
          <MiniStat label="Cancelled" value={stats.cancelled.toString()} icon={ArrowDownRight} />
        </div>

        {/* Chart + Upcoming */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-3 sm:gap-4">
          <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-end justify-between mb-4 sm:mb-6">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Last 14 days</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1C1E] dark:text-white">
                      €{stats.last30Revenue.toFixed(0)}
                    </h2>
                    <DeltaPill value={stats.revenueTrend} />
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.days} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#E5E5EA" vertical={false} className="dark:stroke-[#2C2C2E]" />
                  <XAxis dataKey="day" stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(225,29,72,0.06)' }}
                    contentStyle={{ background: 'white', border: '1px solid #E5E5EA', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`€${Number(v).toFixed(0)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill={ACCENT} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Upcoming</p>
                  <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-white mt-1">
                    {upcoming.length} scheduled
                  </h2>
                </div>
                <button onClick={() => navigate('/agenda')} className="text-xs font-semibold text-[#e11d48] hover:underline">
                  See all
                </button>
              </div>
              {upcoming.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-[#C6C6C8] mb-2" />
                  <p className="text-sm text-[#8E8E93]">No upcoming bookings</p>
                </div>
              ) : (
                <ul className="-mx-2">
                  {upcoming.map((a, idx) => (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer ${
                        idx !== upcoming.length - 1 ? 'border-b border-[#F5F5F7] dark:border-[#2C2C2E]/60' : ''
                      }`}
                      onClick={() => navigate('/agenda')}
                    >
                      <div className="h-9 w-9 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] flex items-center justify-center text-xs font-semibold shrink-0">
                        {(a.customer?.name || 'W')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white truncate">
                          {a.customer?.name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-[#8E8E93] truncate">
                          {a.service?.name || 'Service'} · {format(parseISO(a.appointment_date), 'MMM d')} · {a.appointment_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white">
                          €{Number(a.price || a.service?.price || 0).toFixed(0)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#C6C6C8] shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Week ahead */}
        <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Week ahead</p>
              <button onClick={() => navigate('/agenda')} className="text-xs font-semibold text-[#e11d48] hover:underline">
                Open agenda
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {stats.weekAhead.map((d, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-2 sm:p-3 text-center ${
                    d.isToday
                      ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E]'
                      : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white'
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider font-semibold ${d.isToday ? 'opacity-80' : 'text-[#8E8E93]'}`}>
                    {d.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{d.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top services + Top customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Top services · 30d</p>
                  <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-white mt-1">By bookings</h2>
                </div>
                <Scissors className="h-4 w-4 text-[#8E8E93]" />
              </div>
              {stats.topServices.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#8E8E93]">No data yet</p>
              ) : (
                <ul className="space-y-3">
                  {stats.topServices.map((s, i) => {
                    const max = stats.topServices[0].count || 1;
                    const pct = (s.count / max) * 100;
                    return (
                      <li key={i}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-semibold text-[#1C1C1E] dark:text-white truncate pr-2">{s.name}</span>
                          <span className="text-[#8E8E93] tabular-nums shrink-0">
                            {s.count} · €{s.revenue.toFixed(0)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] overflow-hidden">
                          <div className="h-full rounded-full bg-[#e11d48]" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Top customers</p>
                  <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-white mt-1">By lifetime spend</h2>
                </div>
                <Star className="h-4 w-4 text-[#8E8E93]" />
              </div>
              {stats.topCustomers.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#8E8E93]">No data yet</p>
              ) : (
                <ul className="-mx-2">
                  {stats.topCustomers.map((c, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 px-2 py-2.5 rounded-xl ${
                        i !== stats.topCustomers.length - 1 ? 'border-b border-[#F5F5F7] dark:border-[#2C2C2E]/60' : ''
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-[#8E8E93]">{c.visits} visit{c.visits === 1 ? '' : 's'}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white tabular-nums shrink-0">
                        €{c.spend.toFixed(0)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="h-8 w-8 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-[#1C1C1E] dark:text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E93] truncate">{label}</p>
        <p className="text-sm sm:text-base font-semibold text-[#1C1C1E] dark:text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        positive ? 'text-[#1C1C1E] dark:text-white bg-[#F5F5F7] dark:bg-[#2C2C2E]' : 'text-[#e11d48] bg-[#e11d48]/10'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function Kpi({
  title, value, delta, sub, icon: Icon, accent, hideDelta, isCount,
}: {
  title: string;
  value: string;
  delta: number;
  sub: string;
  icon: any;
  accent?: boolean;
  hideDelta?: boolean;
  isCount?: boolean;
}) {
  return (
    <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div
            className={`h-8 w-8 sm:h-9 sm:w-9 rounded-2xl flex items-center justify-center ${
              accent ? 'bg-[#e11d48] text-white' : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>
          {!hideDelta && !isCount && <DeltaPill value={delta} />}
        </div>
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93] truncate">{title}</p>
        <p className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white mt-1 leading-none">
          {value}
        </p>
        <p className="text-[11px] sm:text-xs text-[#8E8E93] mt-2 truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}

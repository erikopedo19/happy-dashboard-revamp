import { useMemo } from 'react';
import {
  Calendar, Users, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Clock,
  Scissors, Search, Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter, addDays } from 'date-fns';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Line, ComposedChart,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const db = supabase as any;

// Noir Rose palette
const SURFACE = "#16161A";
const BORDER = "rgba(255,255,255,0.06)";
const ROSE = "#f43f5e";
const BLUE = "#0A84FF";
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
    <div className="h-full overflow-hidden bg-[#0A0A0C] text-white font-geist">
      <div className="h-full overflow-hidden lg:p-2 w-full">
        <div className="lg:border lg:rounded-[20px] overflow-hidden flex flex-col bg-[#16161A] border-white/[0.06] h-full w-full">
          {/* Header */}
          <header className="border-b border-white/[0.06] bg-[#16161A] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <SidebarTrigger className="lg:hidden text-white" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold text-white truncate">Dashboard</h1>
                <p className="hidden md:block text-xs text-white/50">{format(new Date(), 'EEEE, MMMM d')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:block relative max-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search..."
                  className="pl-10 h-9 bg-[#22222A] border-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/40 focus-visible:ring-[#f43f5e]/30"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-[#22222A]">
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/agenda')}
                className="h-9 rounded-xl bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white text-sm font-semibold px-4 shadow-none"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">New booking</span>
              </Button>
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
            {/* Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Welcome back!</h1>
                <p className="text-sm text-white/50 mt-0.5">Here is what is happening today</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/agenda')}
                  className="h-9 gap-1.5 bg-[#16161A] hover:bg-[#22222A] border-white/[0.06] text-white"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Agenda</span>
                </Button>
                <Button
                  onClick={() => navigate('/agenda')}
                  className="h-9 gap-1.5 bg-[#f43f5e] hover:bg-[#f43f5e]/90 text-white shadow-none"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New booking</span>
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Revenue" value={`€${stats.last30Revenue.toFixed(0)}`} change={stats.revenueTrend} icon={DollarSign} tone="rose" />
              <StatCard title="Bookings" value={stats.todays.toString()} change={stats.trend} icon={Calendar} tone="blue" />
              <StatCard title="Customers" value={stats.customers.toString()} sub={`+${stats.newCustomers30} this month`} icon={Users} tone="green" />
              <StatCard title="Pending" value={stats.pending.toString()} sub="awaiting confirmation" icon={Clock} tone="rose" />
            </div>

            {/* Chart + Top performers */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 bg-[#16161A] border border-white/[0.06] rounded-[28px]">
                <div className="p-5 sm:p-6">
                  <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Last 30 days</p>
                      <div className="flex items-baseline gap-3 mt-1.5">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-geist-mono">€{stats.last30Revenue.toFixed(0)}</h2>
                        <DeltaPill value={stats.revenueTrend} />
                      </div>
                    </div>
                    <Legend />
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={stats.days30} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="day" stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={TEXT_DIM} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ stroke: ROSE, strokeOpacity: 0.25 }}
                        contentStyle={tooltipStyle}
                        labelFormatter={(_, p: any) => p?.[0]?.payload?.date || ''}
                        formatter={(v: any, name: any) => name === 'revenue' ? [`€${Number(v).toFixed(0)}`, 'Revenue'] : [v, 'Bookings']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={ROSE} strokeWidth={2.5} fill="#f43f5e" fillOpacity={0.08} />
                      <Line type="monotone" dataKey="bookings" stroke={BLUE} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:w-[360px] bg-[#16161A] border border-white/[0.06] rounded-[28px] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Top performers</p>
                    <h2 className="text-base font-semibold text-white mt-1">Top services</h2>
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
                            <span className="text-white/40 tabular-nums shrink-0 text-xs">{s.count} · €{s.revenue.toFixed(0)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full bg-[#f43f5e]"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Recent bookings */}
            <div className="bg-[#16161A] border border-white/[0.06] rounded-[28px] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.16em] font-semibold text-white/40">Recent bookings</p>
                  <h2 className="text-base font-semibold text-white mt-1">{upcoming.length} upcoming</h2>
                </div>
                <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-[#f43f5e] hover:underline uppercase tracking-wider">See all</button>
              </div>
              {upcoming.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-white/20 mb-2" />
                  <p className="text-sm text-white/40">No upcoming bookings</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-white/40 border-b border-white/[0.06]">
                        <th className="pb-3 font-medium">Customer</th>
                        <th className="pb-3 font-medium">Service</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map((a) => (
                        <tr key={a.id} className="border-b border-white/[0.06] last:border-0">
                          <td className="py-3 font-medium text-white">{a.customer?.name || 'Walk-in'}</td>
                          <td className="py-3 text-white/70">{a.service?.name || 'Service'}</td>
                          <td className="py-3 text-white/70">{format(parseISO(a.appointment_date), 'MMM d')}</td>
                          <td className="py-3 text-white/70">{a.appointment_time?.slice(0, 5)}</td>
                          <td className="py-3 text-right font-semibold text-white">€{Number(a.price || a.service?.price || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, sub, icon: Icon, tone }: { title: string; value: string; change?: number; sub?: string; icon: any; tone?: 'rose' | 'blue' | 'green' }) {
  const toneClass = tone === 'rose' ? 'bg-[#f43f5e]/10 text-[#f43f5e]' : tone === 'blue' ? 'bg-[#0A84FF]/10 text-[#0A84FF]' : 'bg-[#30D158]/10 text-[#30D158]';
  const hasChange = change !== undefined && change !== 0;
  return (
    <div className="bg-[#16161A] border border-white/[0.06] rounded-[24px] p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white/60">{title}</span>
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", toneClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[28px] sm:text-[32px] font-semibold text-white tracking-tight leading-none">{value}</span>
        {hasChange ? (
          <div className={cn("flex items-center gap-1 text-sm font-medium pb-0.5", change > 0 ? "text-[#30D158]" : "text-[#f43f5e]")}>
            {change > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change)}%
          </div>
        ) : sub ? (
          <div className="text-xs font-medium text-white/45 pb-1 text-right max-w-[55%]">{sub}</div>
        ) : null}
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
        positive ? 'text-emerald-300 bg-emerald-500/10' : 'text-[#f43f5e] bg-white/5'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-[11px]">
      <span className="flex items-center gap-1.5 text-white/60"><span className="h-2 w-2 rounded-full bg-[#f43f5e]" /> Revenue</span>
      <span className="flex items-center gap-1.5 text-white/60"><span className="h-2 w-2 rounded-full bg-[#0A84FF]" /> Bookings</span>
    </div>
  );
}

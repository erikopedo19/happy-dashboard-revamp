import { useMemo } from 'react';
import {
  Calendar, Users, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Clock, ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter } from 'date-fns';
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
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#8E8E93]">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[34px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white mt-1 leading-none">
              Dashboard
            </h1>
          </div>
          <Button
            onClick={() => navigate('/agenda')}
            className="h-10 rounded-full bg-[#1C1C1E] dark:bg-white text-white dark:text-[#1C1C1E] hover:bg-[#1C1C1E]/90 dark:hover:bg-white/90 px-5 font-medium text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" strokeWidth={2.5} />
            New booking
          </Button>
        </div>

        {/* KPI grid – 4 cards, monochrome with one rose accent on revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi
            title="Today's revenue"
            value={`€${stats.todayRevenue.toFixed(0)}`}
            delta={stats.revenueTrend}
            sub="vs last 30d"
            icon={DollarSign}
            accent
          />
          <Kpi
            title="Today's bookings"
            value={stats.todays.toString()}
            delta={stats.trend}
            sub="vs last 30d"
            icon={Calendar}
          />
          <Kpi
            title="Pending"
            value={stats.pending.toString()}
            delta={0}
            sub="awaiting confirmation"
            icon={Clock}
            hideDelta
          />
          <Kpi
            title="Customers"
            value={stats.customers.toString()}
            delta={stats.newCustomers30}
            sub={`+${stats.newCustomers30} this month`}
            icon={Users}
            isCount
          />
        </div>

        {/* Chart + Upcoming */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
          <Card className="bg-white dark:bg-[#1C1C1E] border-0 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Last 14 days</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <h2 className="text-3xl font-semibold tracking-tight text-[#1C1C1E] dark:text-white">
                      €{stats.last30Revenue.toFixed(0)}
                    </h2>
                    <DeltaPill value={stats.revenueTrend} />
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">Upcoming</p>
                  <h2 className="text-base font-semibold text-[#1C1C1E] dark:text-white mt-1">
                    {upcoming.length} scheduled
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/agenda')}
                  className="text-xs font-semibold text-[#e11d48] hover:underline"
                >
                  See all
                </button>
              </div>
              {upcoming.length === 0 ? (
                <div className="py-12 text-center">
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
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-white">
                          €{Number(a.price || a.service?.price || 0).toFixed(0)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#C6C6C8]" />
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
  icon: Icon, accent, hideDelta, isCount,
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
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`h-9 w-9 rounded-2xl flex items-center justify-center ${
              accent
                ? 'bg-[#e11d48] text-white'
                : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>
          {!hideDelta && !isCount && <DeltaPill value={delta} />}
        </div>
        <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#8E8E93]">{title}</p>
        <p className="text-[28px] font-semibold tracking-tight text-[#1C1C1E] dark:text-white mt-1 leading-none">
          {value}
        </p>
        <p className="text-xs text-[#8E8E93] mt-2">{sub}</p>
      </CardContent>
    </Card>
  );
}

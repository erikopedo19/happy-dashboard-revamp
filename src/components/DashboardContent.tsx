import { useMemo, useState } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Scissors,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Bell,
  Mail,
  Search,
  Filter,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";

const db = supabase as any;

export function DashboardContent() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
      const { data } = await db.from('customers').select('id, name, email, phone').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const todays = appointments.filter(a => isToday(parseISO(a.appointment_date)));
    const todayRevenue = todays.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const last30 = appointments.filter(a => isAfter(parseISO(a.appointment_date), subDays(new Date(), 30)));
    const prev30 = appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return isAfter(d, subDays(new Date(), 60)) && !isAfter(d, subDays(new Date(), 30));
    });
    const trend = prev30.length ? Math.round(((last30.length - prev30.length) / prev30.length) * 100) : 100;

    // Build last 14 days bar series
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
    return {
      todays: todays.length,
      todayRevenue,
      totalRevenue,
      customers: customers.length,
      pending: appointments.filter(a => a.status === 'scheduled').length,
      trend,
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
    <div className="h-full overflow-auto bg-[#F2F2F7]">
      <div className="px-6 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1C1E]">Dashboard</h1>
            <p className="text-sm text-[#8E8E93] mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#C6C6C8] bg-white hover:bg-[#F2F2F7]">
              <Bell className="h-4 w-4 text-[#1C1C1E]" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#C6C6C8] bg-white hover:bg-[#F2F2F7]">
              <Mail className="h-4 w-4 text-[#1C1C1E]" />
            </Button>
            <Button className="h-9 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white gap-2">
              <Plus className="h-4 w-4" /> New booking
            </Button>
          </div>
        </div>

        {/* Tabs + actions */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="overview">
            <TabsList className="bg-white border border-[#C6C6C8] rounded-xl p-1 h-10">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#F2F2F7] data-[state=active]:text-[#1C1C1E] px-4">Overview</TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-[#F2F2F7] px-4">Bookings</TabsTrigger>
              <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-[#F2F2F7] px-4">Sales</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8E93]" />
              <Input 
                placeholder="Search..." 
                className="pl-10 w-40 bg-white border-[#C6C6C8] h-9 rounded-xl focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#C6C6C8] bg-white hover:bg-[#F2F2F7]">
              <RefreshCw className="h-4 w-4 text-[#1C1C1E]" />
            </Button>
            <Button variant="outline" className="h-9 rounded-xl border-[#C6C6C8] bg-white hover:bg-[#F2F2F7] text-[#1C1C1E]">Monthly</Button>
            <Button className="h-9 rounded-xl bg-[#007AFF] text-white gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi title="Today's Revenue" value={`€${stats.todayRevenue.toFixed(0)}`} delta={stats.trend} sub="vs last month" />
          <Kpi title="Today's Bookings" value={stats.todays.toString()} delta={12} sub="appointments" />
          <Kpi title="Pending" value={stats.pending.toString()} delta={-5} sub="awaiting confirmation" negative />
          <Kpi title="Total Customers" value={stats.customers.toString()} delta={29} sub="+10 new" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-[#1C1C1E]">Sales Performance</CardTitle>
                <p className="text-xs text-[#8E8E93] mt-1">Last 14 days</p>
              </div>
              <Badge variant="outline" className="rounded-full border-[#C6C6C8] bg-[#F2F2F7] text-[#8E8E93]">2 Weeks</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-6 mb-4">
                <div>
                  <div className="text-2xl font-semibold text-[#1C1C1E]">€{stats.totalRevenue.toFixed(0)}</div>
                  <div className="text-xs text-[#8E8E93]">Total revenue</div>
                </div>
                <div className="flex items-center gap-1 text-sm text-[#34C759]">
                  <ArrowUpRight className="h-3 w-3" /> {stats.trend}%
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
                  <XAxis dataKey="day" stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #C6C6C8', borderRadius: 12 }}
                    labelStyle={{ color: '#8E8E93' }}
                  />
                  <Bar dataKey="revenue" fill="#007AFF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-[#1C1C1E]">Bookings Trend</CardTitle>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#007AFF]" />Bookings</span>
                  <span className="flex items-center gap-1.5 text-[#8E8E93]"><span className="h-2 w-2 rounded-full bg-[#8E8E93]" />Revenue</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.days}>
                  <defs>
                    <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
                  <XAxis dataKey="day" stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #C6C6C8', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="bookings" stroke="#007AFF" fill="url(#bk)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming list */}
        <Card className="bg-white border-0 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#1C1C1E]">Upcoming Appointments</CardTitle>
              <p className="text-xs text-[#8E8E93] mt-1">{upcoming.length} scheduled</p>
            </div>
            <Button variant="outline" className="h-8 rounded-lg border-[#C6C6C8] bg-[#F2F2F7] text-[#1C1C1E] text-xs">View all</Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 mx-auto text-[#C6C6C8] mb-2" />
                <p className="text-sm text-[#8E8E93]">No upcoming bookings</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F2F2F7] text-xs text-[#8E8E93] font-semibold uppercase tracking-wide">
                      <th className="text-left font-medium py-3 px-2">Customer</th>
                      <th className="text-left font-medium py-3 px-2 hidden md:table-cell">Service</th>
                      <th className="text-left font-medium py-3 px-2">Date</th>
                      <th className="text-left font-medium py-3 px-2">Time</th>
                      <th className="text-left font-medium py-3 px-2">Status</th>
                      <th className="text-right font-medium py-3 px-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map(a => (
                      <tr key={a.id} className="border-b border-[#F2F2F7] hover:bg-[#F2F2F7]/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center text-xs font-semibold">
                              {(a.customer?.name || 'W')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-[#1C1C1E]">{a.customer?.name || 'Walk-in'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-[#8E8E93] hidden md:table-cell">{a.service?.name || '—'}</td>
                        <td className="py-3 px-2 text-[#8E8E93]">{format(parseISO(a.appointment_date), 'MMM d')}</td>
                        <td className="py-3 px-2 text-[#8E8E93]">{a.appointment_time?.slice(0, 5)}</td>
                        <td className="py-3 px-2">
                          <Badge className={`rounded-full border-0 ${
                            a.status === 'completed' ? 'bg-[#34C759]/10 text-[#34C759]' :
                            a.status === 'cancelled' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                            'bg-[#007AFF]/10 text-[#007AFF]'
                          }`}>
                            • {a.status || 'scheduled'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-[#1C1C1E]">€{Number(a.price || a.service?.price || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value, delta, sub, negative }: { title: string; value: string; delta: number; sub: string; negative?: boolean }) {
  const isPositive = negative ? delta < 0 : delta >= 0;
  return (
    <Card className="bg-white border-0 rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs text-[#8E8E93] mb-2 font-medium uppercase tracking-wide">{title}</p>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-semibold text-[#1C1C1E]">{value}</div>
          <Badge className={`rounded-full border-0 gap-0.5 text-[11px] ${
            isPositive ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
          }`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </Badge>
        </div>
        <p className="text-xs text-[#8E8E93] mt-2">{sub}</p>
      </CardContent>
    </Card>
  );
}

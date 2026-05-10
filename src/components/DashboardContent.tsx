import { useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Scissors,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Bell,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday, subDays, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";

const db = supabase as any;

export function DashboardContent() {
  const { user } = useAuth();

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
    <div className="h-full overflow-auto bg-background">
      <div className="px-6 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-card">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-card">
              <Mail className="h-4 w-4" />
            </Button>
            <Button className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> New booking
            </Button>
          </div>
        </div>

        {/* Tabs + actions */}
        <div className="flex items-center justify-between">
          <Tabs defaultValue="overview">
            <TabsList className="bg-card border border-border rounded-xl p-1 h-10">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground px-4">Overview</TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-secondary px-4">Bookings</TabsTrigger>
              <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-secondary px-4">Sales</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border bg-card">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-9 rounded-xl border-border bg-card">Monthly</Button>
            <Button className="h-9 rounded-xl bg-primary text-primary-foreground gap-2">
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
          <Card className="lg:col-span-2 bg-card border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Sales Performance</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Last 14 days</p>
              </div>
              <Badge variant="outline" className="rounded-full border-border bg-secondary text-muted-foreground">2 Weeks</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-6 mb-4">
                <div>
                  <div className="text-2xl font-semibold text-foreground">€{stats.totalRevenue.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">Total revenue</div>
                </div>
                <div className="flex items-center gap-1 text-sm text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" /> {stats.trend}%
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Bookings Trend</CardTitle>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Bookings</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Revenue</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.days}>
                  <defs>
                    <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" fill="url(#bk)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming list */}
        <Card className="bg-card border-border rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{upcoming.length} scheduled</p>
            </div>
            <Button variant="outline" className="h-8 rounded-lg border-border bg-secondary text-xs">View all</Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming bookings</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
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
                      <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/40">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                              {(a.customer?.name || 'W')[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{a.customer?.name || 'Walk-in'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{a.service?.name || '—'}</td>
                        <td className="py-3 px-2 text-muted-foreground">{format(parseISO(a.appointment_date), 'MMM d')}</td>
                        <td className="py-3 px-2 text-muted-foreground">{a.appointment_time?.slice(0, 5)}</td>
                        <td className="py-3 px-2">
                          <Badge className={`rounded-full border-0 ${
                            a.status === 'completed' ? 'bg-emerald-500/15 text-emerald-500' :
                            a.status === 'cancelled' ? 'bg-destructive/15 text-destructive' :
                            'bg-primary/15 text-primary'
                          }`}>
                            • {a.status || 'scheduled'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-foreground">€{Number(a.price || a.service?.price || 0).toFixed(0)}</td>
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
    <Card className="bg-card border-border rounded-2xl">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground mb-2">{title}</p>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          <Badge className={`rounded-full border-0 gap-0.5 text-[11px] ${
            isPositive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive/15 text-destructive'
          }`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{sub}</p>
      </CardContent>
    </Card>
  );
}

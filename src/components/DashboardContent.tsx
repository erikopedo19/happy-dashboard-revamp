import { useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Scissors,
  ChevronRight,
  Activity,
  Clock,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { useAppointmentsCount } from '@/components/AppointmentsCounter';

const db = supabase as any;

interface Service {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
  price?: number | null;
}

export function DashboardContent() {
  const { user } = useAuth();
  const { count } = useAppointmentsCount();

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['dashboard-services', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('services').select('id, name, color, icon, price')
        .eq('user_id', user.id).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ['dashboard-appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await db
        .from('appointments')
        .select(`*, customer:customers(name), service:services(name, price)`)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Compute weekly booking ring + stats
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const stats = useMemo(() => {
    const todays = appointments.filter(a => isSameDay(parseISO(a.appointment_date), today));
    const week = appointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return d >= weekStart && d <= addDays(weekStart, 6);
    });
    const revenueWeek = week.reduce((s, a) => s + Number(a.price || a.service?.price || 0), 0);
    const customerSet = new Set(appointments.map(a => a.customer_id).filter(Boolean));
    const goal = 40;
    return {
      todays: todays.length,
      week: week.length,
      revenue: revenueWeek,
      customers: customerSet.size,
      goal,
      progress: Math.min(100, Math.round((week.length / goal) * 100)),
    };
  }, [appointments]);

  // Per-day count for the week (rings strip)
  const perDay = useMemo(() => weekDays.map(day => {
    const c = appointments.filter(a => isSameDay(parseISO(a.appointment_date), day)).length;
    return { day, count: c, pct: Math.min(100, (c / 8) * 100) };
  }), [appointments]);

  // Services breakdown
  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => { if (a.service_id) counts[a.service_id] = (counts[a.service_id] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return services.map(s => ({
      ...s,
      count: counts[s.id] || 0,
      pct: Math.round(((counts[s.id] || 0) / max) * 100),
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [services, appointments]);

  const upcoming = useMemo(() => {
    const nowIso = format(today, 'yyyy-MM-dd');
    return appointments
      .filter(a => a.appointment_date >= nowIso && a.status !== 'cancelled')
      .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time))
      .slice(0, 5);
  }, [appointments]);

  const ringRadius = 70;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (stats.progress / 100) * ringCircumference;

  return (
    <div className="h-full overflow-auto bg-[#f2f2f7] dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[#8e8e93] uppercase tracking-wide">
              {format(today, 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[34px] leading-tight font-bold text-[#1c1c1e] dark:text-white">
              Summary
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white dark:bg-[#1c1c1e] flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <span className="text-sm font-semibold text-[#007aff]">
                {(user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Ring + KPI Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ring card */}
          <div className="lg:col-span-1 bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-[#ff3b30] uppercase tracking-wide">Bookings</p>
                <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white mt-0.5">This Week</p>
              </div>
              <Activity className="h-5 w-5 text-[#ff3b30]" />
            </div>
            <div className="flex items-center justify-center py-2">
              <div className="relative">
                <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
                  <circle cx="90" cy="90" r={ringRadius} fill="none"
                    stroke="rgba(255,59,48,0.15)" strokeWidth="16" />
                  <circle cx="90" cy="90" r={ringRadius} fill="none"
                    stroke="url(#ringGrad)" strokeWidth="16" strokeLinecap="round"
                    strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff2d55" />
                      <stop offset="100%" stopColor="#ff9500" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-[#1c1c1e] dark:text-white">{stats.week}</span>
                  <span className="text-xs text-[#8e8e93] mt-1">of {stats.goal} goal</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mt-4">
              {perDay.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="h-12 w-full rounded-lg bg-[#f2f2f7] dark:bg-[#2c2c2e] relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-lg bg-gradient-to-t from-[#ff2d55] to-[#ff9500]"
                      style={{ height: `${Math.max(8, d.pct)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${isSameDay(d.day, today) ? 'text-[#ff3b30]' : 'text-[#8e8e93]'}`}>
                    {format(d.day, 'EEEEE')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* KPI tiles */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <KpiTile
              label="Today"
              value={stats.todays}
              suffix="appts"
              icon={<Calendar className="h-4 w-4" />}
              tint="#007aff"
            />
            <KpiTile
              label="Revenue"
              value={`$${stats.revenue.toFixed(0)}`}
              suffix="this week"
              icon={<DollarSign className="h-4 w-4" />}
              tint="#34c759"
            />
            <KpiTile
              label="Customers"
              value={stats.customers}
              suffix="total"
              icon={<Users className="h-4 w-4" />}
              tint="#af52de"
            />
            <KpiTile
              label="All Time"
              value={count}
              suffix="bookings"
              icon={<TrendingUp className="h-4 w-4" />}
              tint="#ff9500"
            />
          </div>
        </div>

        {/* Upcoming + Services */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Upcoming */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <p className="text-xs font-semibold text-[#007aff] uppercase tracking-wide">Schedule</p>
                <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-white">Upcoming</h2>
              </div>
              <button
                onClick={() => (window.location.href = '/agenda')}
                className="text-sm font-medium text-[#007aff] flex items-center gap-0.5"
              >
                See all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-[#f2f2f7] dark:divide-[#2c2c2e]">
              {upcoming.length === 0 ? (
                <EmptyRow
                  icon={<Calendar className="h-6 w-6 text-[#8e8e93]" />}
                  title="No upcoming appointments"
                  cta="Add appointment"
                  onClick={() => (window.location.href = '/agenda')}
                />
              ) : upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-[#007aff]/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-[#007aff]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1c1c1e] dark:text-white truncate">
                      {a.customer?.name || 'Walk-in'}
                    </p>
                    <p className="text-sm text-[#8e8e93] truncate">
                      {a.service?.name || 'Service'} · {format(parseISO(a.appointment_date), 'MMM d')} at {a.appointment_time?.slice(0, 5)}
                    </p>
                  </div>
                  {a.price && (
                    <span className="text-sm font-semibold text-[#34c759]">${Number(a.price).toFixed(0)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-[#af52de] uppercase tracking-wide">Top Services</p>
                <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-white">Trending</h2>
              </div>
              <Scissors className="h-5 w-5 text-[#af52de]" />
            </div>
            {serviceBreakdown.length === 0 ? (
              <EmptyRow
                icon={<Scissors className="h-6 w-6 text-[#8e8e93]" />}
                title="No services yet"
                cta="Create service"
                onClick={() => (window.location.href = '/services')}
              />
            ) : (
              <div className="space-y-4">
                {serviceBreakdown.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-[#1c1c1e] dark:text-white truncate">
                        {s.name}
                      </span>
                      <span className="text-sm font-bold text-[#8e8e93]">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f2f2f7] dark:bg-[#2c2c2e] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#af52de] to-[#5856d6]"
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="New Booking" tint="#007aff" icon={<Plus className="h-5 w-5" />}
            onClick={() => (window.location.href = '/agenda')} />
          <QuickAction label="Customers" tint="#34c759" icon={<Users className="h-5 w-5" />}
            onClick={() => (window.location.href = '/customers')} />
          <QuickAction label="Services" tint="#af52de" icon={<Scissors className="h-5 w-5" />}
            onClick={() => (window.location.href = '/services')} />
          <QuickAction label="Reports" tint="#ff9500" icon={<TrendingUp className="h-5 w-5" />}
            onClick={() => (window.location.href = '/reports')} />
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, suffix, icon, tint }: {
  label: string; value: number | string; suffix?: string; icon: React.ReactNode; tint: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: tint }}>{label}</span>
        <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tint}1a`, color: tint }}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-[#1c1c1e] dark:text-white">{value}</span>
        {suffix && <span className="text-xs text-[#8e8e93]">{suffix}</span>}
      </div>
    </div>
  );
}

function EmptyRow({ icon, title, cta, onClick }: { icon: React.ReactNode; title: string; cta: string; onClick: () => void; }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-[#f2f2f7] dark:bg-[#2c2c2e] flex items-center justify-center mb-3">{icon}</div>
      <p className="text-sm text-[#8e8e93] mb-3">{title}</p>
      <button onClick={onClick} className="text-sm font-semibold text-[#007aff]">{cta}</button>
    </div>
  );
}

function QuickAction({ label, icon, tint, onClick }: { label: string; icon: React.ReactNode; tint: string; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm ring-1 ring-black/5 flex items-center gap-3 active:scale-[0.97] transition-transform text-left"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tint}1a`, color: tint }}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-[#1c1c1e] dark:text-white">{label}</span>
    </button>
  );
}

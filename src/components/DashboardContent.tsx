import { useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  Euro,
  Scissors,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isToday } from 'date-fns';
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

  const today = new Date();

  const stats = useMemo(() => {
    const todays = appointments.filter(a => isToday(parseISO(a.appointment_date)));
    const todayRevenue = todays.reduce(
      (s, a) => s + Number(a.price || a.service?.price || 0), 0
    );
    const customerSet = new Set(appointments.map(a => a.customer_id).filter(Boolean));
    return {
      todays: todays.length,
      todayRevenue,
      customers: customerSet.size,
    };
  }, [appointments]);

  // Top services
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
      .slice(0, 6);
  }, [appointments]);

  return (
    <div className="h-full overflow-auto relative">
      {/* Sonoma ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#eef2ff] via-[#f5f0ff] to-[#fff0f6]" />
        <div className="absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-[#a5b4fc] opacity-40 blur-3xl" />
        <div className="absolute top-40 right-0 h-[380px] w-[380px] rounded-full bg-[#f9a8d4] opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[#fcd34d] opacity-30 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.14em]">
              {format(today, 'EEEE, MMMM d')}
            </p>
            <h1 className="text-[40px] leading-[1.05] font-semibold text-[#1d1d1f] tracking-tight mt-1">
              Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}
            </h1>
          </div>
          <div className="hidden sm:flex h-11 w-11 rounded-full bg-white/70 backdrop-blur-2xl items-center justify-center ring-1 ring-white/60 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]">
            <span className="text-sm font-semibold text-[#0071e3]">
              {(user?.email || 'U')[0].toUpperCase()}
            </span>
          </div>
        </header>

        {/* Hero stats — Today */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="md:col-span-2 p-7">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold text-[#0071e3] uppercase tracking-[0.14em]">Today</p>
                <h2 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight mt-1">
                  {stats.todays} appointment{stats.todays === 1 ? '' : 's'}
                </h2>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-[#0071e3]" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[56px] leading-none font-semibold text-[#1d1d1f] tracking-tight">
                €{stats.todayRevenue.toFixed(0)}
              </span>
              <span className="text-sm text-[#6e6e73]">expected today</span>
            </div>
            <div className="mt-6 h-1.5 rounded-full bg-black/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0071e3] to-[#5e5ce6] transition-[width] duration-700"
                style={{ width: `${Math.min(100, stats.todays * 10)}%` }}
              />
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 gap-4">
            <KpiTile
              label="Customers"
              value={stats.customers}
              suffix="total"
              icon={<Users className="h-4 w-4" />}
              tint="#34c759"
            />
            <KpiTile
              label="All time"
              value={count}
              suffix="bookings"
              icon={<TrendingUp className="h-4 w-4" />}
              tint="#ff9500"
            />
          </div>
        </section>

        {/* Upcoming + Top services */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <p className="text-[11px] font-semibold text-[#0071e3] uppercase tracking-[0.14em]">Schedule</p>
                <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Upcoming</h2>
              </div>
              <button
                onClick={() => (window.location.href = '/agenda')}
                className="text-sm font-medium text-[#0071e3] flex items-center gap-0.5 hover:opacity-80"
              >
                See all <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {upcoming.length === 0 ? (
                <EmptyRow
                  icon={<Calendar className="h-6 w-6 text-[#6e6e73]" />}
                  title="Nothing on the books"
                  cta="Add appointment"
                  onClick={() => (window.location.href = '/agenda')}
                />
              ) : upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-white/40 transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-[#0071e3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1d1d1f] truncate">
                      {a.customer?.name || 'Walk-in'}
                    </p>
                    <p className="text-sm text-[#6e6e73] truncate">
                      {a.service?.name || 'Service'} · {format(parseISO(a.appointment_date), 'MMM d')} · {a.appointment_time?.slice(0, 5)}
                    </p>
                  </div>
                  {a.price && (
                    <span className="text-sm font-semibold text-[#1d1d1f]">€{Number(a.price).toFixed(0)}</span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold text-[#af52de] uppercase tracking-[0.14em]">Top services</p>
                <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Trending</h2>
              </div>
              <Sparkles className="h-5 w-5 text-[#af52de]" />
            </div>
            {serviceBreakdown.length === 0 ? (
              <EmptyRow
                icon={<Scissors className="h-6 w-6 text-[#6e6e73]" />}
                title="No services yet"
                cta="Create service"
                onClick={() => (window.location.href = '/services')}
              />
            ) : (
              <div className="space-y-4">
                {serviceBreakdown.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#1d1d1f] truncate">{s.name}</span>
                      <span className="text-sm font-semibold text-[#6e6e73]">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#af52de] to-[#5e5ce6] transition-[width] duration-700"
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="New booking" tint="#0071e3" icon={<Plus className="h-5 w-5" />}
            onClick={() => (window.location.href = '/agenda')} />
          <QuickAction label="Customers" tint="#34c759" icon={<Users className="h-5 w-5" />}
            onClick={() => (window.location.href = '/customers')} />
          <QuickAction label="Services" tint="#af52de" icon={<Scissors className="h-5 w-5" />}
            onClick={() => (window.location.href = '/services')} />
          <QuickAction label="Reports" tint="#ff9500" icon={<TrendingUp className="h-5 w-5" />}
            onClick={() => (window.location.href = '/reports')} />
        </section>
      </div>
    </div>
  );
}

function GlassCard({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white/55 backdrop-blur-2xl rounded-[28px] ring-1 ring-white/60 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] ${className}`}>
      {children}
    </div>
  );
}

function KpiTile({ label, value, suffix, icon, tint }: {
  label: string; value: number | string; suffix?: string; icon: React.ReactNode; tint: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: tint }}>{label}</span>
        <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${tint}1a`, color: tint }}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">{value}</span>
        {suffix && <span className="text-xs text-[#6e6e73]">{suffix}</span>}
      </div>
    </GlassCard>
  );
}

function EmptyRow({ icon, title, cta, onClick }: { icon: React.ReactNode; title: string; cta: string; onClick: () => void; }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-white/70 ring-1 ring-white/60 flex items-center justify-center mb-3">{icon}</div>
      <p className="text-sm text-[#6e6e73] mb-3">{title}</p>
      <button onClick={onClick} className="text-sm font-semibold text-[#0071e3]">{cta}</button>
    </div>
  );
}

function QuickAction({ label, icon, tint, onClick }: { label: string; icon: React.ReactNode; tint: string; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className="bg-white/55 backdrop-blur-2xl rounded-2xl p-4 ring-1 ring-white/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] flex items-center gap-3 active:scale-[0.97] hover:bg-white/70 transition-all text-left"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tint}1a`, color: tint }}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-[#1d1d1f]">{label}</span>
    </button>
  );
}

// Suppress unused
void Euro;

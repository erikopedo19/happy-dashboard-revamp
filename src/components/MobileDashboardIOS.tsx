import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Scissors,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ReviewAnnouncement } from "@/components/ReviewAnnouncement";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type DashboardMetrics = {
  today_bookings: number;
  today_revenue: number;
  upcoming_bookings: number;
  revenue_30d: number;
  revenue_previous_30d: number;
  bookings_30d: number;
  completed_30d: number;
  cancelled_30d: number;
  avg_ticket_30d: number;
  total_customers: number;
  new_customers_30d: number;
  returning_customers_30d: number;
  completion_rate: number;
  revenue_change: number;
  spark: Array<{ date: string; revenue: number; bookings: number }>;
  week: Array<{ date: string; bookings: number }>;
  top_services: Array<{ name: string; bookings: number; revenue: number }>;
};

type TodayAppointment = {
  id: string;
  appointment_time: string;
  status: string | null;
  price: number | null;
  customer: { name: string } | null;
  service: { name: string; price: number | null } | null;
};

const EMPTY_METRICS: DashboardMetrics = {
  today_bookings: 0,
  today_revenue: 0,
  upcoming_bookings: 0,
  revenue_30d: 0,
  revenue_previous_30d: 0,
  bookings_30d: 0,
  completed_30d: 0,
  cancelled_30d: 0,
  avg_ticket_30d: 0,
  total_customers: 0,
  new_customers_30d: 0,
  returning_customers_30d: 0,
  completion_rate: 0,
  revenue_change: 0,
  spark: [],
  week: [],
  top_services: [],
};

const money = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function MobileDashboardIOS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profile } = useQuery({
    queryKey: ["mobile-dashboard-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, business_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: metrics = EMPTY_METRICS } = useQuery({
    queryKey: ["mobile-dashboard-metrics", user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_mobile_dashboard_metrics", { p_today: today });
      if (error) throw error;
      return { ...EMPTY_METRICS, ...(data as unknown as DashboardMetrics) };
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery<TodayAppointment[]>({
    queryKey: ["mobile-dashboard-today", user?.id, today],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_time, status, price, customer:customers(name), service:services(name, price)")
        .eq("user_id", user.id)
        .eq("appointment_date", today)
        .or("status.is.null,status.neq.cancelled")
        .order("appointment_time", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TodayAppointment[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar_url]);

  const displayName = profile?.business_name?.trim() || profile?.full_name?.trim() || "there";
  const greetName = displayName;
  const initial = displayName.charAt(0).toUpperCase() || "C";
  const chart = useMemo(() => {
    const max = Math.max(...metrics.spark.map((item) => item.revenue), 1);
    return metrics.spark.map((item) => ({ ...item, height: Math.max(8, Math.round((item.revenue / max) * 76)) }));
  }, [metrics.spark]);
  const topServiceMax = Math.max(...metrics.top_services.map((item) => item.bookings), 1);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black text-white">
      <header className="shrink-0 px-5 pb-3 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#8E8E93]">{format(new Date(), "EEEE, MMMM d")}</p>
            <h1 className="mt-0.5 truncate text-[29px] font-bold tracking-[-0.035em]">Hi, {greetName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SidebarTrigger className="h-11 w-11 rounded-full border-0 bg-[#1C1C1E] text-white shadow-none hover:bg-[#2C2C2E]" />
            <button
              type="button"
              aria-label="Open profile settings"
              onClick={() => navigate("/settings")}
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#2C2C2E] text-sm font-bold text-white ring-1 ring-[#3A3A3C]"
            >
              {profile?.avatar_url && !avatarFailed ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-32 pt-2">
        <ReviewAnnouncement />

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[30px] bg-[#1C1C1E] p-5 text-white"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-[#AEAEB2]">Today</p>
              <p className="mt-1 text-[42px] font-bold leading-none tracking-[-0.045em]">{money.format(metrics.today_revenue)}</p>
              <p className="mt-2 text-[13px] text-[#AEAEB2]">{metrics.today_bookings} bookings scheduled</p>
            </div>
            <Trend value={metrics.revenue_change} />
          </div>
          <div className="mt-6 flex h-20 items-end gap-1.5" aria-label="14 day revenue chart">
            {chart.map((item, index) => (
              <div key={item.date} className="flex h-full flex-1 items-end">
                <motion.div
                  initial={{ height: 4 }}
                  animate={{ height: item.height }}
                  transition={{ delay: index * 0.025, duration: 0.35 }}
                  className={`w-full rounded-full ${index === chart.length - 1 ? "bg-[#FF375F]" : "bg-[#3A3A3C]"}`}
                />
              </div>
            ))}
          </div>
        </motion.section>

        <section className="grid grid-cols-2 gap-3">
          <MetricCard icon={CalendarDays} color="bg-[#0A5BBF]" label="30-day bookings" value={metrics.bookings_30d.toString()} detail={`${metrics.upcoming_bookings} upcoming`} />
          <MetricCard icon={CircleDollarSign} color="bg-[#1E7A3A]" label="Average ticket" value={money.format(metrics.avg_ticket_30d)} detail={`${money.format(metrics.revenue_30d)} total`} />
          <MetricCard icon={UsersRound} color="bg-[#7B3FA0]" label="Customers" value={metrics.total_customers.toString()} detail={`+${metrics.new_customers_30d} new`} />
          <MetricCard icon={Check} color="bg-[#B8730A]" label="Completion" value={`${metrics.completion_rate}%`} detail={`${metrics.cancelled_30d} cancelled`} />
        </section>

        <section className="rounded-[28px] bg-[#1C1C1E] px-5 py-4">
          <SectionTitle title="This week" action="Agenda" onClick={() => navigate("/agenda")} />
          <div className="mt-4 grid grid-cols-7 gap-1">
            {metrics.week.map((day) => {
              const date = new Date(`${day.date}T12:00:00`);
              const active = day.date === today;
              return (
                <button key={day.date} type="button" onClick={() => navigate("/agenda")} className="flex min-w-0 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#8E8E93]">{format(date, "EEEEE")}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold ${active ? "bg-[#C62B4A] text-white" : "bg-[#2C2C2E] text-[#F2F2F7]"}`}>
                    {format(date, "d")}
                  </span>
                  <span className={`text-[11px] font-bold ${day.bookings ? "text-white" : "text-[#636366]"}`}>{day.bookings}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#1C1C1E] px-5 py-4">
          <SectionTitle title="Customer pulse" action="Customers" onClick={() => navigate("/customers")} />
          <div className="mt-4 flex items-center divide-x divide-[#3A3A3C]">
            <MiniStat label="New" value={metrics.new_customers_30d} />
            <MiniStat label="Returning" value={metrics.returning_customers_30d} />
            <MiniStat label="Completed" value={metrics.completed_30d} />
          </div>
        </section>

        {metrics.top_services.length > 0 && (
          <section className="rounded-[28px] bg-[#1C1C1E] px-5 py-4">
            <SectionTitle title="Top services" action="Services" onClick={() => navigate("/services")} />
            <div className="mt-4 space-y-4">
              {metrics.top_services.map((service) => (
                <div key={service.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold">{service.name}</span>
                    <span className="shrink-0 text-[12px] font-semibold text-[#8E8E93]">{service.bookings} · {money.format(service.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#2C2C2E]">
                    <div className="h-full rounded-full bg-[#FF375F]" style={{ width: `${(service.bookings / topServiceMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle title="Today's schedule" action="See all" onClick={() => navigate("/agenda")} />
          <div className="mt-3 overflow-hidden rounded-[28px] bg-[#1C1C1E]">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-9 text-center">
                <CalendarDays className="h-7 w-7 text-[#8E8E93]" />
                <p className="mt-3 text-[15px] font-semibold">Your day is clear</p>
                <p className="mt-1 text-[13px] text-[#8E8E93]">New bookings will appear here.</p>
              </div>
            ) : (
              appointments.slice(0, 6).map((appointment, index) => (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => navigate("/agenda")}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#2C2C2E] ${index ? "border-t border-[#38383A]" : ""}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2C2C2E] text-[12px] font-bold">
                    {appointment.appointment_time.slice(0, 5)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{appointment.customer?.name || "Walk-in"}</p>
                    <p className="truncate text-[12px] text-[#8E8E93]">{appointment.service?.name || "Service"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" />
                </button>
              ))
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 pb-4">
          <ActionButton icon={Clock3} label="New booking" primary onClick={() => navigate("/agenda")} />
          <ActionButton icon={Scissors} label="Edit services" onClick={() => navigate("/services")} />
        </section>
      </main>
    </div>
  );
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${positive ? "bg-[#163A25] text-[#30D158]" : "bg-[#421F25] text-[#FF453A]"}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}% 30d
    </div>
  );
}

function MetricCard({ icon: Icon, color, label, value, detail }: { icon: typeof CalendarDays; color: string; label: string; value: string; detail: string }) {
  return (
    <div className="min-h-[142px] rounded-[26px] bg-[#1C1C1E] p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${color}`}><Icon className="h-[18px] w-[18px]" /></div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8E8E93]">{label}</p>
      <p className="mt-1 text-[25px] font-bold tracking-[-0.035em]">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-[#8E8E93]">{detail}</p>
    </div>
  );
}

function SectionTitle({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[18px] font-bold tracking-[-0.02em]">{title}</h2>
      <button type="button" onClick={onClick} className="flex items-center gap-0.5 text-[13px] font-semibold text-[#FF375F]">
        {action}<ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="flex-1 px-2 text-center"><p className="text-[23px] font-bold">{value}</p><p className="mt-1 text-[11px] font-medium text-[#8E8E93]">{label}</p></div>;
}

function ActionButton({ icon: Icon, label, primary = false, onClick }: { icon: typeof UserRound; label: string; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex h-14 items-center justify-center gap-2 rounded-[20px] text-[14px] font-bold active:scale-[0.98] ${primary ? "bg-[#FF375F] text-white" : "bg-[#1C1C1E] text-white"}`}>
      <Icon className="h-4 w-4" />{label}<ArrowRight className="h-4 w-4" />
    </button>
  );
}

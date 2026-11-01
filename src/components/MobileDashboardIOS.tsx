import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  Crown,
  Link2,
  Scissors,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { ReviewAnnouncement } from "@/components/ReviewAnnouncement";
import { StreakCelebration } from "@/components/streak/StreakCelebration";
import { NextBookingsCard } from "@/components/NextBookingsCard";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBookingLimit } from "@/hooks/use-booking-limit";
import { haptic } from "@/lib/haptics";
import { isNative } from "@/lib/native";
import { enableBookingPush, isBookingPushEnabled, pushSupported } from "@/lib/push";
import { cn } from "@/lib/utils";

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
  customer: { name: string; phone: string | null } | null;
  service: { name: string; price: number | null; duration: number | null } | null;
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

const ACCENT = "#FF2D46";
const GOAL_KEY = "cutzio:daily-goal";

// Section reveal — staggered like a native iOS push-in
const revealParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const revealItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
};

const minutesOf = (time: string) => {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const useNowMinutes = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now.getHours() * 60 + now.getMinutes();
};

export function MobileDashboardIOS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [goal, setGoal] = useState(() => Number(localStorage.getItem(GOAL_KEY)) || 300);
  const [editingGoal, setEditingGoal] = useState(false);
  const [alertsOn, setAlertsOn] = useState(true);
  const bookingLimit = useBookingLimit();
  const today = format(new Date(), "yyyy-MM-dd");
  const nowMinutes = useNowMinutes();

  const { data: profile } = useQuery({
    queryKey: ["mobile-dashboard-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, business_name, avatar_url, booking_link, currency")
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
        .select("id, appointment_time, status, price, customer:customers(name, phone), service:services(name, price, duration)")
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

  // Native shells register push themselves; only prompt browsers that can subscribe.
  useEffect(() => {
    if (isNative() || window.ReactNativeWebView || !pushSupported()) return;
    void isBookingPushEnabled().then(setAlertsOn);
  }, []);

  const money = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: profile?.currency || "EUR", maximumFractionDigits: 0 });
    } catch {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    }
  }, [profile?.currency]);

  const displayName = profile?.business_name?.trim() || profile?.full_name?.trim() || "there";
  const initial = displayName.charAt(0).toUpperCase() || "C";
  const topServiceMax = Math.max(...metrics.top_services.map((item) => item.bookings), 1);
  const busiestDay = metrics.week.reduce<(typeof metrics.week)[number] | null>(
    (best, d) => (d.bookings > (best?.bookings ?? 0) ? d : best),
    null,
  );

  const priceOf = (a: TodayAppointment) => Number(a.price ?? a.service?.price ?? 0);
  const completedToday = appointments.filter((a) => a.status === "completed");
  const bookedToday = appointments.reduce((sum, a) => sum + priceOf(a), 0);
  const goalProgress = Math.min(1, goal > 0 ? bookedToday / goal : 0);

  const upNext = appointments.find((a) => {
    if (a.status === "completed") return false;
    const end = minutesOf(a.appointment_time) + (a.service?.duration || 30);
    return end > nowMinutes;
  });

  const shareLink = async () => {
    haptic("light");
    if (!profile?.booking_link) {
      navigate("/booking-page");
      return;
    }
    const url = `${window.location.origin}/book/${profile.booking_link}`;
    try {
      if (navigator.share) await navigator.share({ title: displayName, text: "Book your next cut", url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Booking link copied" });
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const turnOnAlerts = async () => {
    haptic("light");
    const result = await enableBookingPush();
    if (result.ok) {
      setAlertsOn(true);
      haptic("success");
      toast({ title: "Booking alerts on", description: "You'll be notified about new and cancelled bookings." });
    } else {
      toast({ title: "Couldn't enable alerts", description: result.reason, variant: "destructive" });
    }
  };

  const saveGoal = (value: number) => {
    const next = Math.max(10, Math.round(value));
    setGoal(next);
    localStorage.setItem(GOAL_KEY, String(next));
    setEditingGoal(false);
  };

  const { data: hoursCfg } = useQuery({
    queryKey: ["mobile-dashboard-hours", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("agenda_settings")
        .select("start_hour, end_hour")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as { start_hour: string | null; end_hour: string | null } | null) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const openMin = hoursCfg?.start_hour ? minutesOf(hoursCfg.start_hour) : 9 * 60;
  const closeMin = hoursCfg?.end_hour ? minutesOf(hoursCfg.end_hour) : 19 * 60;
  const isOpenNow = nowMinutes >= openMin && nowMinutes < closeMin;
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const greeting = (() => {
    const h = Math.floor(nowMinutes / 60);
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();
  const returningPct = metrics.new_customers_30d + metrics.returning_customers_30d
    ? Math.round((metrics.returning_customers_30d / (metrics.new_customers_30d + metrics.returning_customers_30d)) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F4F4F6] text-[#111113] dark:bg-black dark:text-white">
      <header className="relative z-20 shrink-0 bg-[#F4F4F6] px-5 pb-2 pt-5 dark:bg-black">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", isOpenNow ? "bg-[#30D158]" : "bg-[#8E8E93]")} />
            <p className="truncate text-[13px] font-semibold text-[#8E8E93]">
              {format(new Date(), "EEE d MMM")} · {isOpenNow ? `Open until ${hhmm(closeMin)}` : nowMinutes < openMin ? `Opens ${hhmm(openMin)}` : "Closed"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              aria-label="Open profile settings"
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#E5E5EA] text-sm font-bold text-[#1C1C1E] ring-1 ring-black/10 dark:bg-[#1C1C1E] dark:text-white dark:ring-white/10"
            >
              {profile?.avatar_url && !avatarFailed ? (
                <img src={profile.avatar_url} alt={displayName} onError={() => setAvatarFailed(true)} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-[#F4F4F6] to-transparent dark:from-black" />
        <main className="h-full overflow-y-auto overscroll-contain px-4 pb-32 pt-1">
          <div className="px-1 pb-4">
            <p className="text-[15px] font-medium text-[#8E8E93]">{greeting},</p>
            <h1 className="truncate text-[32px] font-bold leading-[1.1] tracking-[-0.04em]">{displayName}</h1>
          </div>
          <ReviewAnnouncement />
          <StreakCelebration />

          <motion.div className="space-y-5" variants={revealParent} initial="hidden" animate="show">
            <motion.section variants={revealItem}>
              <NextBookingsCard currency={profile?.currency} />
            </motion.section>

            {/* Action bar */}
            <motion.section variants={revealItem} className="flex gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => { haptic("light"); navigate("/agenda"); }}
                className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[18px] text-[15px] font-semibold text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.3)]"
                style={{ background: "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)" }}
              >
                <CalendarPlus className="h-[18px] w-[18px]" /> New booking
              </motion.button>
              <IconAction icon={Link2} label="Share link" onClick={shareLink} />
              <IconAction icon={Scissors} label="Services" onClick={() => navigate("/services")} />
              <IconAction icon={UsersRound} label="Clients" onClick={() => navigate("/customers")} />
            </motion.section>

            {!alertsOn && (
              <motion.button
                type="button"
                variants={revealItem}
                onClick={turnOnAlerts}
                className="flex w-full items-center gap-3 rounded-[20px] border border-dashed border-black/10 px-4 py-3 text-left transition active:bg-black/[0.03] dark:border-white/15 dark:active:bg-white/[0.04]"
              >
                <BellRing className="h-[18px] w-[18px] shrink-0 text-[#FF5A6E]" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">Turn on booking alerts</span>
                <ChevronRight className="h-4 w-4 text-[#8E8E93]" />
              </motion.button>
            )}

            {/* Today — numbers + day track */}
            <motion.section variants={revealItem} className={PANEL}>
              <PanelHead title="Today" action="Agenda" onClick={() => navigate("/agenda")} />
              <div className="mt-4 grid grid-cols-3">
                <BigNum label="Booked" value={money.format(bookedToday || metrics.today_revenue)} />
                <BigNum label="Clients" value={String(appointments.length || metrics.today_bookings)} divider />
                <BigNum label="Done" value={`${completedToday.length}/${appointments.length}`} divider />
              </div>
              <DayTrack
                openMin={openMin}
                closeMin={closeMin}
                nowMin={nowMinutes}
                items={appointments.map((a) => ({
                  id: a.id,
                  start: minutesOf(a.appointment_time),
                  end: minutesOf(a.appointment_time) + (a.service?.duration || 30),
                  done: a.status === "completed",
                }))}
                label={hhmm}
              />
              <button
                type="button"
                onClick={() => setEditingGoal((v) => !v)}
                className="mt-5 block w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#8E8E93]">
                    <Target className="h-3.5 w-3.5" /> Daily goal
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {money.format(bookedToday)} <span className="text-[#8E8E93]">/ {money.format(goal)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  <motion.div
                    className="h-full origin-left rounded-full bg-[#FF2D46]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: goalProgress }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </button>
              <AnimatePresence>
                {editingGoal && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const value = Number(new FormData(e.currentTarget).get("goal"));
                      if (value > 0) saveGoal(value);
                    }}
                  >
                    <div className="mt-3 flex items-center gap-2 rounded-[16px] bg-black/[0.04] p-1.5 pl-4 dark:bg-white/[0.06]">
                      <input
                        name="goal"
                        type="number"
                        inputMode="numeric"
                        min={10}
                        defaultValue={goal}
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none"
                      />
                      <button type="submit" className="h-9 rounded-[12px] bg-[#FF2D46] px-4 text-[13px] font-semibold text-white">Save</button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.section>

            {!bookingLimit.loading && !bookingLimit.isPremium && <PlanMeter limit={bookingLimit} />}

            {/* Today's line-up */}
            <motion.section variants={revealItem} className={PANEL}>
              <PanelHead title="Line-up" action={`${appointments.length} today`} onClick={() => navigate("/agenda")} />
              {appointments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-[15px] font-semibold">Chair is free today</p>
                  <p className="mt-1 text-[13px] text-[#8E8E93]">Share your link — new bookings land here.</p>
                </div>
              ) : (
                <ol className="relative mt-4">
                  <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-black/[0.08] dark:bg-white/[0.1]" />
                  {appointments.slice(0, 8).map((a) => {
                    const done = a.status === "completed";
                    const isNext = a.id === upNext?.id;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => navigate("/agenda")}
                          className="relative flex w-full items-center gap-4 py-2.5 text-left"
                        >
                          <span
                            className={cn(
                              "relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2",
                              done ? "border-[#30D158] bg-[#30D158]" : isNext ? "border-[#FF2D46] bg-[#FF2D46]" : "border-[#C7C7CC] bg-[#F4F4F6] dark:border-white/30 dark:bg-black",
                            )}
                          />
                          <span className={cn("w-12 shrink-0 text-[14px] font-semibold tabular-nums", isNext ? "text-[#FF2D46]" : "text-[#8E8E93]")}>
                            {a.appointment_time.slice(0, 5)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-[15px] font-semibold", done && "text-[#8E8E93] line-through")}>
                              {a.customer?.name || "Walk-in"}
                            </span>
                            <span className="block truncate text-[12.5px] text-[#8E8E93]">
                              {a.service?.name || "Service"}{a.service?.duration ? ` · ${a.service.duration} min` : ""}
                            </span>
                          </span>
                          {done ? (
                            <Check className="h-4 w-4 text-[#30D158]" />
                          ) : priceOf(a) > 0 ? (
                            <span className="text-[13px] font-semibold tabular-nums text-[#8E8E93]">{money.format(priceOf(a))}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </motion.section>

            {/* Revenue */}
            <motion.section variants={revealItem} className={cn(PANEL, "overflow-hidden pb-0")}>
              <PanelHead title="Revenue · 30 days" action="Reports" onClick={() => navigate("/reports")} />
              <div className="mt-3 flex items-end gap-2.5">
                <p className="text-[38px] font-bold leading-none tracking-[-0.045em] tabular-nums">{money.format(metrics.revenue_30d)}</p>
                <Trend value={metrics.revenue_change} />
              </div>
              <p className="mt-2 text-[13px] text-[#8E8E93]">
                {metrics.bookings_30d} bookings · {money.format(metrics.avg_ticket_30d)} avg ticket
              </p>
              {metrics.spark.length > 1 ? (
                <div className="-mx-5 mt-2"><Sparkline data={metrics.spark} /></div>
              ) : (
                <div className="h-5" />
              )}
            </motion.section>

            {/* Week */}
            <motion.section variants={revealItem} className={PANEL}>
              <PanelHead title="This week" action="Agenda" onClick={() => navigate("/agenda")} />
              <WeekCapsules week={metrics.week} today={today} onOpen={() => navigate("/agenda")} />
              {busiestDay && (
                <p className="mt-4 text-[13px] text-[#8E8E93]">
                  Busiest: <span className="font-semibold text-[#111113] dark:text-white">{format(new Date(`${busiestDay.date}T12:00:00`), "EEEE")}</span> · {busiestDay.bookings} bookings
                </p>
              )}
            </motion.section>

            {/* Clients + outcomes */}
            <motion.section variants={revealItem} className="grid grid-cols-2 gap-2.5">
              <Tile label="Clients" value={String(metrics.total_customers)} note={`+${metrics.new_customers_30d} new this month`} />
              <Tile label="Come back" value={`${returningPct}%`} note={`${metrics.returning_customers_30d} returning`} />
              <Tile label="Completion" value={`${metrics.completion_rate}%`} note={`${metrics.completed_30d} done`} />
              <Tile label="Upcoming" value={String(metrics.upcoming_bookings)} note={`${metrics.cancelled_30d} cancelled · 30d`} onClick={() => navigate("/agenda")} />
            </motion.section>
            <OutcomeBar
              completed={metrics.completed_30d}
              cancelled={metrics.cancelled_30d}
              upcoming={Math.max(0, metrics.bookings_30d - metrics.completed_30d - metrics.cancelled_30d)}
            />

            {metrics.top_services.length > 0 && (
              <motion.section variants={revealItem} className={PANEL}>
                <PanelHead title="Top services" action="Services" onClick={() => navigate("/services")} />
                <ol className="mt-3 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {metrics.top_services.map((service, i) => (
                    <li key={service.name} className="flex items-center gap-3 py-3">
                      <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-[#8E8E93]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{service.name}</span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                          <span className="block h-full rounded-full bg-[#FF2D46]" style={{ width: `${(service.bookings / topServiceMax) * 100}%` }} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[14px] font-semibold tabular-nums">{money.format(service.revenue)}</span>
                        <span className="block text-[11.5px] tabular-nums text-[#8E8E93]">{service.bookings} cuts</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </motion.section>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

const PANEL = "rounded-[28px] bg-white p-5 ring-1 ring-black/[0.04] dark:bg-[#111113] dark:ring-white/[0.07]";

function PanelHead({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h2>
      <button type="button" onClick={onClick} className="flex items-center gap-0.5 text-[13px] font-semibold text-[#8E8E93] active:opacity-60">
        {action}<ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function IconAction({ icon: Icon, label, onClick }: { icon: typeof CalendarDays; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] bg-white ring-1 ring-black/[0.05] dark:bg-[#111113] dark:ring-white/[0.08]"
    >
      <Icon className="h-5 w-5" />
    </motion.button>
  );
}

function BigNum({ label, value, divider = false }: { label: string; value: string; divider?: boolean }) {
  return (
    <div className={cn("min-w-0", divider && "border-l border-black/[0.06] pl-4 dark:border-white/[0.08]")}>
      <p className="truncate text-[24px] font-bold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-1.5 text-[12px] font-medium text-[#8E8E93]">{label}</p>
    </div>
  );
}

/** Opening hours as a horizontal track: booked blocks + live "now" marker. */
function DayTrack({
  openMin,
  closeMin,
  nowMin,
  items,
  label,
}: {
  openMin: number;
  closeMin: number;
  nowMin: number;
  items: Array<{ id: string; start: number; end: number; done: boolean }>;
  label: (m: number) => string;
}) {
  const span = Math.max(closeMin - openMin, 60);
  const pct = (m: number) => `${Math.min(100, Math.max(0, ((m - openMin) / span) * 100))}%`;
  const showNow = nowMin >= openMin && nowMin <= closeMin;
  return (
    <div className="mt-5">
      <div className="relative h-9 overflow-hidden rounded-[12px] bg-black/[0.04] dark:bg-white/[0.05]">
        {showNow && (
          <div className="absolute inset-y-0 left-0 bg-black/[0.04] dark:bg-white/[0.04]" style={{ width: pct(nowMin) }} />
        )}
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 320, damping: 26 }}
            className={cn("absolute inset-y-1.5 rounded-[7px]", it.done ? "bg-[#30D158]/80" : "bg-[#111113] dark:bg-white")}
            style={{ left: pct(it.start), width: `max(6px, calc(${pct(it.end)} - ${pct(it.start)} - 2px))` }}
          />
        ))}
        {showNow && (
          <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[#FF2D46]" style={{ left: pct(nowMin) }} />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-[#8E8E93]">
        <span>{label(openMin)}</span>
        <span>{label(openMin + Math.round(span / 2))}</span>
        <span>{label(closeMin)}</span>
      </div>
    </div>
  );
}

function WeekCapsules({ week, today, onOpen }: { week: Array<{ date: string; bookings: number }>; today: string; onOpen: () => void }) {
  const max = Math.max(...week.map((d) => d.bookings), 1);
  return (
    <div className="mt-4 grid grid-cols-7 gap-2">
      {week.map((day, i) => {
        const active = day.date === today;
        const date = new Date(`${day.date}T12:00:00`);
        return (
          <button key={day.date} type="button" onClick={onOpen} className="flex min-w-0 flex-col items-center gap-2">
            <span className={cn("text-[12px] font-bold tabular-nums", day.bookings ? "" : "text-[#C7C7CC] dark:text-white/25")}>{day.bookings}</span>
            <span className="relative flex h-24 w-full max-w-[34px] items-end overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.06]">
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${day.bookings ? Math.max(14, (day.bookings / max) * 100) : 0}%` }}
                transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 220, damping: 26 }}
                className={cn("block w-full rounded-full", active ? "bg-[#FF2D46]" : "bg-[#111113]/80 dark:bg-white/80")}
              />
            </span>
            <span className={cn("text-[11px] font-semibold", active ? "text-[#FF2D46]" : "text-[#8E8E93]")}>{format(date, "EEEEE")}</span>
          </button>
        );
      })}
    </div>
  );
}

function Tile({ label, value, note, onClick }: { label: string; value: string; note: string; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={!onClick}
      className="min-w-0 rounded-[24px] bg-white p-4 text-left ring-1 ring-black/[0.04] disabled:cursor-default dark:bg-[#111113] dark:ring-white/[0.07]"
    >
      <p className="text-[12px] font-semibold text-[#8E8E93]">{label}</p>
      <p className="mt-2 truncate text-[28px] font-bold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
      <p className="mt-2 truncate text-[11.5px] text-[#8E8E93]">{note}</p>
    </motion.button>
  );
}

function OutcomeBar({ completed, cancelled, upcoming }: { completed: number; cancelled: number; upcoming: number }) {
  const total = completed + cancelled + upcoming;
  if (!total) return null;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="px-1">
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }} className="h-full origin-left rounded-full bg-[#30D158]" style={{ width: seg(completed) }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="h-full origin-left rounded-full bg-[#FF2D46]" style={{ width: seg(upcoming) }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.16 }} className="h-full origin-left rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" style={{ width: seg(cancelled) }} />
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] font-medium text-[#8E8E93]">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#30D158]" />{completed} done</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#FF2D46]" />{upcoming} ahead</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" />{cancelled} cancelled</span>
      </div>
    </div>
  );
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={cn("mb-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", positive ? "bg-[#30D158]/15 text-[#30D158]" : "bg-[#FF453A]/15 text-[#FF453A]")}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

/** Free-plan meter — strict 20 bookings/mo cap with upgrade CTA. */
function PlanMeter({ limit }: { limit: ReturnType<typeof useBookingLimit> }) {
  const navigate = useNavigate();
  const { used, limit: max, atLimit, nearLimit } = limit;
  const pct = Math.min(1, used / max);
  const color = atLimit ? "#FF2D46" : nearLimit ? "#FF9F0A" : "#30D158";
  return (
    <motion.section variants={revealItem} className={cn(PANEL, atLimit && "ring-[#FF2D46]/30 dark:ring-[#FF2D46]/30")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold">
            {atLimit ? <Zap className="h-4 w-4 text-[#FF2D46]" /> : <Crown className="h-4 w-4 text-[#FF9F0A]" />}
            {atLimit ? "Free limit reached" : "Free plan"}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[#8E8E93]">
            {atLimit ? "Upgrade for unlimited bookings." : `${max - used} bookings left this month`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { haptic("light"); navigate("/pricing"); }}
          className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#FF2D46] px-3.5 text-[12px] font-bold text-white transition active:scale-95"
        >
          Upgrade<ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
          <motion.div
            className="h-full origin-left rounded-full"
            style={{ backgroundColor: color }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pct }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
        <span className="text-[12px] font-bold tabular-nums">{used}/{max}</span>
      </div>
    </motion.section>
  );
}

/** 30-day revenue sparkline — smooth area curve with a glowing end dot. */
function Sparkline({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const W = 340, H = 96, PAD = 4;
  const { line, area, endX, endY } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.revenue), 1);
    const step = (W - PAD * 2) / Math.max(data.length - 1, 1);
    const pts = data.map((d, i) => ({
      x: PAD + i * step,
      y: H - PAD - (d.revenue / max) * (H - PAD * 2),
    }));
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const cx = (p.x + q.x) / 2;
      d += ` C${cx},${p.y} ${cx},${q.y} ${q.x},${q.y}`;
    }
    return {
      line: d,
      area: `${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`,
      endX: pts[pts.length - 1].x,
      endY: pts[pts.length - 1].y,
    };
  }, [data]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-24 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <motion.path
        d={line} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <circle cx={endX} cy={endY} r="4" fill={ACCENT} />
      <circle cx={endX} cy={endY} r="4" fill={ACCENT} opacity="0.35">
        <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}


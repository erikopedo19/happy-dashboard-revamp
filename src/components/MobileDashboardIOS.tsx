import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Link2,
  Loader2,
  MessageCircle,
  Phone,
  Scissors,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { ReviewAnnouncement } from "@/components/ReviewAnnouncement";
import { RollingText } from "@/components/RollingText";
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

const formatIn = (minutes: number) => {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
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
  const queryClient = useQueryClient();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
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
  const chart = useMemo(() => {
    const max = Math.max(...metrics.spark.map((item) => item.revenue), 1);
    return metrics.spark.map((item) => ({ ...item, height: Math.max(6, Math.round((item.revenue / max) * 64)) }));
  }, [metrics.spark]);
  const topServiceMax = Math.max(...metrics.top_services.map((item) => item.bookings), 1);
  const busiestDay = metrics.week.reduce<(typeof metrics.week)[number] | null>(
    (best, d) => (d.bookings > (best?.bookings ?? 0) ? d : best),
    null,
  );

  const priceOf = (a: TodayAppointment) => Number(a.price ?? a.service?.price ?? 0);
  const completedToday = appointments.filter((a) => a.status === "completed");
  const earnedToday = completedToday.reduce((sum, a) => sum + priceOf(a), 0);
  const bookedToday = appointments.reduce((sum, a) => sum + priceOf(a), 0);
  const goalProgress = Math.min(1, goal > 0 ? bookedToday / goal : 0);

  const upNext = appointments.find((a) => {
    if (a.status === "completed") return false;
    const end = minutesOf(a.appointment_time) + (a.service?.duration || 30);
    return end > nowMinutes;
  });
  const upNextStart = upNext ? minutesOf(upNext.appointment_time) : 0;
  const inProgress = !!upNext && upNextStart <= nowMinutes;
  const phone = upNext?.customer?.phone?.replace(/[^\d+]/g, "") || "";
  const hasUpNext = !!upNext && !inProgress;

  // Intro: rolling countdown → fades, then the page sections push in.
  const [introGone, setIntroGone] = useState(false);
  useEffect(() => {
    if (!hasUpNext || introGone) return;
    const id = window.setTimeout(() => setIntroGone(true), 2100);
    return () => window.clearTimeout(id);
  }, [hasUpNext, introGone]);

  const markDone = async (id: string) => {
    setCompleting(id);
    haptic("medium");
    const { error } = await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    setCompleting(null);
    if (error) {
      haptic("error");
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    haptic("success");
    toast({ title: "Marked as done" });
    await queryClient.invalidateQueries({ queryKey: ["mobile-dashboard-today", user?.id, today] });
    void queryClient.invalidateQueries({ queryKey: ["mobile-dashboard-metrics", user?.id, today] });
  };

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F2F2F7] text-[#1C1C1E] dark:bg-black dark:text-white">
      <header className="relative z-20 shrink-0 bg-[#F2F2F7] px-5 pb-1.5 pt-5 dark:bg-black">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">{format(new Date(), "EEEE, MMM d")}</p>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              aria-label="Open profile settings"
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#E5E5EA] text-sm font-bold text-[#1C1C1E] ring-1 ring-black/10 dark:bg-[#2C2C2E] dark:text-white dark:ring-white/10"
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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-[#F2F2F7] via-[#F2F2F7]/70 to-transparent dark:from-black dark:via-black/70" />
      <main className="h-full space-y-4 overflow-y-auto overscroll-contain px-4 pb-32 pt-1">
        <h1 className="truncate px-1 text-[30px] font-bold leading-tight tracking-[-0.035em]">Hi, {displayName}</h1>
        <ReviewAnnouncement />

        {/* Intro — rolling countdown, fades into the page */}
        <AnimatePresence>
          {!introGone && hasUpNext && upNext && (
            <motion.button
              type="button"
              onClick={() => setIntroGone(true)}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, height: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full overflow-hidden rounded-[30px] p-6 text-left ring-1 ring-[#FF5A6E]/25"
              style={{ background: "linear-gradient(160deg, #5A1630 0%, #2A1120 55%, #121214 100%)" }}
            >
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[#FF2D46]/30 blur-3xl" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Next appointment in</p>
              <RollingText
                text={formatIn(upNextStart - nowMinutes).replace(/^in /, "")}
                className="mt-3.5 text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums"
              />
              <p className="mt-4 truncate text-[14px] text-white/70">
                {upNext.customer?.name || "Walk-in"} · {upNext.service?.name || "Service"} · {upNext.appointment_time.slice(0, 5)}
              </p>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          className="space-y-4"
          variants={revealParent}
          initial="hidden"
          animate="show"
        >
        {/* Up next — live */}
        <motion.section
          variants={revealItem}
          className={cn(
            "relative overflow-hidden rounded-[30px] p-5 ring-1",
            upNext ? "text-white ring-[#FF5A6E]/25" : "bg-white ring-black/[0.06] dark:bg-[#1C1C1E] dark:ring-white/[0.08]",
          )}
          style={upNext ? { background: "linear-gradient(160deg, #5A1630 0%, #2A1120 55%, #121214 100%)" } : undefined}
        >
          {upNext ? (
            <>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-[#30D158] opacity-60" />
                    <span className="relative h-2 w-2 rounded-full bg-[#30D158]" />
                  </span>
                  {inProgress ? "In the chair" : "Up next"}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-white/70">
                  {inProgress ? "Now" : formatIn(upNextStart - nowMinutes)}
                </span>
              </div>
              <p className="mt-4 truncate text-[26px] font-bold tracking-[-0.03em]">{upNext.customer?.name || "Walk-in"}</p>
              <p className="mt-0.5 truncate text-[14px] text-white/60">
                {upNext.service?.name || "Service"} · {upNext.appointment_time.slice(0, 5)}
                {priceOf(upNext) > 0 && ` · ${money.format(priceOf(upNext))}`}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => markDone(upNext.id)}
                  disabled={completing === upNext.id}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold text-white active:scale-[0.98] transition disabled:opacity-60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_12px_26px_rgba(255, 45, 70,0.35)]"
                  style={{ background: "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)" }}
                >
                  {completing === upNext.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Mark done
                </button>
                {phone && (
                  <>
                    <a href={`tel:${phone}`} aria-label="Call client" onClick={() => haptic("light")} className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/10 active:scale-95 transition">
                      <Phone className="h-[18px] w-[18px]" />
                    </a>
                    <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer" aria-label="Message client" onClick={() => haptic("light")} className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/10 active:scale-95 transition">
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </a>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                <CalendarDays className="h-6 w-6 text-[#8E8E93]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{appointments.length ? "You're done for today" : "Your day is clear"}</p>
                <p className="mt-0.5 text-[13px] text-[#8E8E93]">Share your link to fill open slots.</p>
              </div>
            </div>
          )}
        </motion.section>

        {/* Quick actions — Control Center style */}
        <motion.section variants={revealItem} className="grid grid-cols-4 gap-3">
          <QuickTile icon={CalendarPlus} label="Book" primary onClick={() => navigate("/agenda")} />
          <QuickTile icon={Link2} label="Share link" onClick={shareLink} />
          <QuickTile icon={Scissors} label="Services" onClick={() => navigate("/services")} />
          <QuickTile icon={UsersRound} label="Clients" onClick={() => navigate("/customers")} />
        </motion.section>

        {!alertsOn && (
          <motion.button
            type="button"
            variants={revealItem}
            onClick={turnOnAlerts}
            className="flex w-full items-center gap-3 rounded-[24px] bg-white dark:bg-[#1C1C1E] p-4 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FF2D46]">
              <BellRing className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Turn on booking alerts</span>
              <span className="block text-[12px] text-[#8E8E93]">Get a push the moment a client books or cancels.</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#636366]" />
          </motion.button>
        )}

        {/* Stat bento — today at a glance */}
        <motion.section variants={revealItem} className="grid grid-cols-2 gap-3">
          <MiniStat icon={CircleDollarSign} label="Today" value={money.format(metrics.today_revenue)} accent />
          <MiniStat icon={CalendarDays} label="Bookings today" value={String(metrics.today_bookings)} />
          <MiniStat icon={UsersRound} label="Upcoming" value={String(metrics.upcoming_bookings)} onClick={() => navigate("/agenda")} />
          <MiniStat icon={Check} label="Completion" value={`${metrics.completion_rate}%`} />
        </motion.section>

        {/* Today + daily goal */}
        <motion.section variants={revealItem} className="grid grid-cols-[1.25fr_1fr] gap-3">
          <div className="rounded-[26px] bg-white dark:bg-[#1C1C1E] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E8E93]">Today</p>
              <Trend value={metrics.revenue_change} />
            </div>
            <p className="mt-2 text-[30px] font-bold leading-none tracking-[-0.04em] tabular-nums">{money.format(bookedToday || metrics.today_revenue)}</p>
            <p className="mt-1.5 text-[12px] text-[#8E8E93]">
              {appointments.length} booked · {completedToday.length} done · {money.format(earnedToday)} earned
            </p>
            <div className="mt-4 flex h-16 items-end gap-1" aria-label="14 day revenue chart">
              {chart.map((item, index) => (
                <div key={item.date} className="flex h-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 4 }}
                    animate={{ height: item.height }}
                    transition={{ delay: index * 0.02, duration: 0.35 }}
                    className={cn("w-full rounded-full", index === chart.length - 1 ? "bg-[#FF2D46]" : "bg-[#D1D1D6] dark:bg-[#3A3A3C]")}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingGoal(true)}
            className="flex flex-col items-center justify-center rounded-[26px] bg-white dark:bg-[#1C1C1E] p-4 active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E] transition"
          >
            <GoalRing progress={goalProgress} />
            <p className="mt-2 text-[12px] font-semibold text-[#1C1C1E] dark:text-white">Daily goal</p>
            <p className="text-[11px] tabular-nums text-[#8E8E93]">{money.format(goal)}</p>
          </button>
        </motion.section>

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
              <div className="flex items-center gap-2 rounded-[22px] bg-white dark:bg-[#1C1C1E] p-2 pl-4">
                <Target className="h-4 w-4 shrink-0 text-[#FF5A6E]" />
                <input
                  name="goal"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  defaultValue={goal}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[#1C1C1E] outline-none dark:text-white"
                />
                <button type="submit" className="h-10 rounded-[14px] bg-[#FF2D46] px-4 text-[13px] font-semibold">Save</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Free plan meter */}
        {!bookingLimit.loading && !bookingLimit.isPremium && (
          <PlanMeter limit={bookingLimit} />
        )}

        {/* Revenue pulse — 30 day sparkline */}
        {metrics.spark.length > 1 && (
          <motion.section variants={revealItem} className="overflow-hidden rounded-[26px] bg-white ring-1 ring-black/[0.05] dark:bg-[#1C1C1E] dark:ring-white/[0.06]">
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8E8E93]">Revenue · 30 days</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums">{money.format(metrics.revenue_30d)}</p>
                  <Trend value={metrics.revenue_change} />
                </div>
              </div>
              <button type="button" onClick={() => navigate("/reports")} className="flex items-center gap-0.5 text-[13px] font-semibold text-[#FF5A6E]">
                Reports<ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Sparkline data={metrics.spark} />
          </motion.section>
        )}

        {/* Today's schedule */}
        <motion.section variants={revealItem}>
          <SectionTitle title="Today's schedule" action="Agenda" onClick={() => navigate("/agenda")} />
          <div className="mt-3 overflow-hidden rounded-[26px] bg-white dark:bg-[#1C1C1E]">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-9 text-center">
                <motion.span
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[38px] leading-none"
                  role="img"
                  aria-label="barber pole"
                >
                  💈
                </motion.span>
                <p className="mt-3 text-[15px] font-semibold">No bookings yet</p>
                <p className="mt-1 text-[13px] text-[#8E8E93]">New bookings will appear here.</p>
              </div>
            ) : (
              appointments.slice(0, 8).map((appointment, index) => {
                const done = appointment.status === "completed";
                const isNext = appointment.id === upNext?.id;
                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => navigate("/agenda")}
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F2F2F7] dark:active:bg-[#2C2C2E]", index > 0 && "border-t border-black/[0.05] dark:border-white/[0.06]")}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-14 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-bold tabular-nums",
                        isNext ? "bg-[#FF2D46] text-white" : "bg-[#F2F2F7] text-[#1C1C1E]/85 dark:bg-[#2C2C2E] dark:text-white/85"
                      )}
                    >
                      {appointment.appointment_time.slice(0, 5)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-[15px] font-semibold", done && "text-[#1C1C1E]/45 line-through dark:text-white/45")}>{appointment.customer?.name || "Walk-in"}</p>
                      <p className="truncate text-[12px] text-[#8E8E93]">{appointment.service?.name || "Service"}</p>
                    </div>
                    {done ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#30D158]/15">
                        <Check className="h-3.5 w-3.5 text-[#30D158]" />
                      </span>
                    ) : priceOf(appointment) > 0 ? (
                      <span className="text-[13px] font-semibold tabular-nums text-[#1C1C1E]/70 dark:text-white/70">{money.format(priceOf(appointment))}</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#636366]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </motion.section>

        {/* This week */}
        <motion.section variants={revealItem} className="rounded-[26px] bg-white dark:bg-[#1C1C1E] px-4 py-4">
          <SectionTitle title="This week" action="Reports" onClick={() => navigate("/reports")} />
          <WeekBars week={metrics.week} today={today} onOpen={() => navigate("/agenda")} />
          <div className="mt-4 grid grid-cols-7 gap-1">
            {metrics.week.map((day) => {
              const date = new Date(`${day.date}T12:00:00`);
              const active = day.date === today;
              return (
                <button key={day.date} type="button" onClick={() => navigate("/agenda")} className="flex min-w-0 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#8E8E93]">{format(date, "EEEEE")}</span>
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold", active ? "bg-[#FF2D46] text-white" : "bg-[#F2F2F7] text-[#1C1C1E] dark:bg-[#2C2C2E] dark:text-[#F2F2F7]")}>
                    {format(date, "d")}
                  </span>
                  <span className={cn("text-[11px] font-bold", day.bookings ? "text-[#1C1C1E] dark:text-white" : "text-[#636366]")}>{day.bookings}</span>
                </button>
              );
            })}
          </div>
          {busiestDay && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#F2F2F7] px-3.5 py-2.5 dark:bg-[#2C2C2E]">
              <TrendingUp className="h-4 w-4 shrink-0 text-[#FF5A6E]" />
              <p className="truncate text-[13px] font-medium">
                <span className="font-bold">{format(new Date(`${busiestDay.date}T12:00:00`), "EEEE")}</span> is your busiest day · {busiestDay.bookings} bookings
              </p>
            </div>
          )}
        </motion.section>

        {/* 30-day snapshot — grouped iOS list */}
        <motion.section variants={revealItem}>
          <SectionTitle title="Last 30 days" action="Reports" onClick={() => navigate("/reports")} />
          <div className="mt-3 overflow-hidden rounded-[26px] bg-white dark:bg-[#1C1C1E] divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            <StatRow icon={CircleDollarSign} label="Revenue" value={money.format(metrics.revenue_30d)} detail={`${money.format(metrics.avg_ticket_30d)} avg ticket`} />
            <StatRow icon={CalendarDays} label="Bookings" value={metrics.bookings_30d.toString()} detail={`${metrics.upcoming_bookings} upcoming`} />
            <StatRow icon={UsersRound} label="Clients" value={metrics.total_customers.toString()} detail={`+${metrics.new_customers_30d} new · ${metrics.returning_customers_30d} returning`} />
            <StatRow icon={Check} label="Completion" value={`${metrics.completion_rate}%`} detail={`${metrics.cancelled_30d} cancelled`} />
          </div>
          <OutcomeBar completed={metrics.completed_30d} cancelled={metrics.cancelled_30d} upcoming={Math.max(0, metrics.bookings_30d - metrics.completed_30d - metrics.cancelled_30d)} />
          <ClientMix fresh={metrics.new_customers_30d} returning={metrics.returning_customers_30d} />
        </motion.section>

        {metrics.top_services.length > 0 && (
          <motion.section variants={revealItem} className="rounded-[26px] bg-white dark:bg-[#1C1C1E] px-4 py-4">
            <SectionTitle title="Top services" action="Services" onClick={() => navigate("/services")} />
            <div className="mt-4 space-y-4">
              {metrics.top_services.map((service) => (
                <div key={service.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold">{service.name}</span>
                    <span className="shrink-0 text-[12px] font-semibold text-[#8E8E93]">{service.bookings} · {money.format(service.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <div className="h-full rounded-full" style={{ width: `${(service.bookings / topServiceMax) * 100}%`, backgroundColor: ACCENT }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
        </motion.div>
      </main>
      </div>
    </div>
  );
}

function WeekBars({ week, today, onOpen }: { week: Array<{ date: string; bookings: number }>; today: string; onOpen: () => void }) {
  const max = Math.max(...week.map((d) => d.bookings), 1);
  return (
    <div className="mt-4 flex h-24 items-end gap-1.5" aria-label="Bookings per day this week">
      {week.map((day, i) => {
        const active = day.date === today;
        const h = Math.max(8, Math.round((day.bookings / max) * 88));
        return (
          <button key={day.date} type="button" onClick={onOpen} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <motion.div
              initial={{ height: 4 }}
              animate={{ height: h }}
              transition={{ delay: 0.1 + i * 0.04, type: "spring", stiffness: 260, damping: 26 }}
              className={cn("w-full rounded-full", active ? "bg-[#FF2D46]" : day.bookings ? "bg-[#D1D1D6] dark:bg-[#48484A]" : "bg-[#F2F2F7] dark:bg-[#2C2C2E]")}
            />
          </button>
        );
      })}
    </div>
  );
}

function OutcomeBar({ completed, cancelled, upcoming }: { completed: number; cancelled: number; upcoming: number }) {
  const total = completed + cancelled + upcoming;
  if (!total) return null;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-4 px-4 pb-4">
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }} className="h-full origin-left rounded-full bg-[#30D158]" style={{ width: seg(completed) }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="h-full origin-left rounded-full bg-[#FF2D46]" style={{ width: seg(upcoming) }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.16 }} className="h-full origin-left rounded-full bg-[#D1D1D6] dark:bg-[#48484A]" style={{ width: seg(cancelled) }} />
      </div>
      <div className="mt-2.5 flex items-center gap-4 text-[11px] font-medium text-[#8E8E93]">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#30D158]" />{completed} done</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#FF2D46]" />{upcoming} ahead</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#D1D1D6] dark:bg-[#48484A]" />{cancelled} cancelled</span>
      </div>
    </div>
  );
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", positive ? "bg-[#163A25] text-[#30D158]" : "bg-[#421F25] text-[#FF453A]")}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </div>
  );
}

function GoalRing({ progress }: { progress: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[84px] w-[84px]">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-[#E5E5EA] dark:text-[#2C2C2E]" />
        <motion.circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={ACCENT}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[17px] font-bold tabular-nums">
        {Math.round(progress * 100)}%
      </span>
    </div>
  );
}

function QuickTile({ icon: Icon, label, primary = false, onClick }: { icon: typeof CalendarDays; label: string; primary?: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <span
        className={cn("flex h-[62px] w-full items-center justify-center rounded-[20px]", !primary && "bg-white dark:bg-[#1C1C1E]")}
        style={primary ? { background: "linear-gradient(180deg,#FF5A6E 0%,#FF2D46 55%,#E0152F 100%)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(255, 45, 70,0.35)" } : undefined}
      >
        <Icon className={cn("h-6 w-6", primary ? "text-white" : "text-[#1C1C1E] dark:text-white")} />
      </span>
      <span className="text-[11px] font-medium text-[#1C1C1E]/75 dark:text-white/75">{label}</span>
    </motion.button>
  );
}

function StatRow({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FF2D46]">
        <Icon className="h-[18px] w-[18px] text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{label}</p>
        <p className="truncate text-[12px] text-[#8E8E93]">{detail}</p>
      </div>
      <span className="text-[17px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ title, action, onClick }: { title: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      <button type="button" onClick={onClick} className="flex items-center gap-0.5 text-[14px] font-semibold text-[#FF5A6E]">
        {action}<ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Free-plan meter — strict 20 bookings/mo cap with upgrade CTA. */
function PlanMeter({ limit }: { limit: ReturnType<typeof useBookingLimit> }) {
  const navigate = useNavigate();
  const { used, limit: max, atLimit, nearLimit } = limit;
  const pct = Math.min(1, used / max);
  const r = 30;
  const c = 2 * Math.PI * r;
  const color = atLimit ? "#FF2D46" : nearLimit ? "#FF9F0A" : "#30D158";
  return (
    <motion.section
      variants={revealItem}
      className={cn(
        "flex items-center gap-4 rounded-[26px] p-4 ring-1",
        atLimit
          ? "bg-[#FF2D46]/[0.07] ring-[#FF2D46]/25 dark:bg-[#FF2D46]/[0.12]"
          : "bg-white ring-black/[0.05] dark:bg-[#1C1C1E] dark:ring-white/[0.06]",
      )}
    >
      <div className="relative h-[72px] w-[72px] shrink-0">
        <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-[#E5E5EA] dark:text-[#2C2C2E]" />
          <motion.circle
            cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums">
          {used}/{max}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {atLimit ? <Zap className="h-3.5 w-3.5 text-[#FF2D46]" /> : <Crown className="h-3.5 w-3.5 text-[#FF9F0A]" />}
          <p className={cn("text-[15px] font-semibold", atLimit && "text-[#FF2D46] dark:text-[#FF6B7E]")}>
            {atLimit ? "You're on the limit" : `${used} of ${max} free bookings`}
          </p>
        </div>
        <p className="mt-0.5 text-[12px] text-[#8E8E93]">
          {atLimit ? "Free plan reached — upgrade for unlimited bookings." : `${max - used} left this month · Pro is unlimited`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => { haptic("light"); navigate("/pricing"); }}
        className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-[#FF2D46] px-3.5 text-[12px] font-bold text-white active:scale-95 transition"
      >
        Upgrade<ChevronRight className="h-3.5 w-3.5" />
      </button>
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

/** Compact stat tile for the today bento grid. */
function MiniStat({ icon: Icon, label, value, accent, onClick }: { icon: typeof CalendarDays; label: string; value: string; accent?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      variants={revealItem}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={!onClick}
      className="rounded-[24px] bg-white p-4 text-left ring-1 ring-black/[0.04] transition active:bg-[#F7F7FA] disabled:cursor-default dark:bg-[#1C1C1E] dark:ring-white/[0.05] dark:active:bg-[#2C2C2E]"
    >
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-[10px]", accent ? "bg-[#FF2D46]" : "bg-[#F2F2F7] dark:bg-[#2C2C2E]")}>
        <Icon className={cn("h-4 w-4", accent ? "text-white" : "text-[#8E8E93]")} />
      </span>
      <p className="mt-3 truncate text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="mt-1.5 truncate text-[11px] font-medium text-[#8E8E93]">{label}</p>
    </motion.button>
  );
}

/** New vs returning clients — animated split bar. */
function ClientMix({ fresh, returning }: { fresh: number; returning: number }) {
  const total = fresh + returning;
  if (!total) return null;
  const pct = Math.round((returning / total) * 100);
  return (
    <div className="mt-3 rounded-[26px] bg-white p-4 dark:bg-[#1C1C1E]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold">New vs returning clients</p>
        <p className="text-[12px] font-semibold tabular-nums text-[#8E8E93]">{pct}% come back</p>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(fresh / total) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full bg-[#FF9F0A]"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(returning / total) * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="h-full bg-[#FF2D46]"
        />
      </div>
      <div className="mt-3 flex items-center gap-4 text-[12px] font-medium">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF9F0A]" />New · {fresh}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#FF2D46]" />Returning · {returning}</span>
      </div>
    </div>
  );
}

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
  Link2,
  Loader2,
  MessageCircle,
  Phone,
  Scissors,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { ReviewAnnouncement } from "@/components/ReviewAnnouncement";
import { RollingText } from "@/components/RollingText";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const ACCENT = "#FF375F";
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
  const ready = introGone || !hasUpNext;

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
    <div className="flex h-full flex-col overflow-hidden bg-black text-white">
      <header className="relative z-20 shrink-0 bg-black px-5 pb-1.5 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">{format(new Date(), "EEEE, MMM d")}</p>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              aria-label="Open profile settings"
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#2C2C2E] text-sm font-bold text-white ring-1 ring-white/10"
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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-black via-black/70 to-transparent" />
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
              exit={{ opacity: 0, y: -22, scale: 0.97, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative w-full overflow-hidden rounded-[30px] p-6 text-left"
              style={{ background: "linear-gradient(160deg, #4A1228 0%, #25101A 55%, #121214 100%)" }}
            >
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-[#FF375F]/25 blur-3xl" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Next appointment in</p>
              <RollingText
                text={formatIn(upNextStart - nowMinutes).replace(/^in /, "")}
                className="mt-2 text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums"
              />
              <p className="mt-3 truncate text-[14px] text-white/60">
                {upNext.customer?.name || "Walk-in"} · {upNext.service?.name || "Service"} · {upNext.appointment_time.slice(0, 5)}
              </p>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.div
          className="space-y-4"
          variants={revealParent}
          initial="hidden"
          animate={ready ? "show" : "hidden"}
        >
        {/* Up next — live */}
        <motion.section
          variants={revealItem}
          className="relative overflow-hidden rounded-[30px] p-5"
          style={{ background: upNext ? "linear-gradient(160deg, #4A1228 0%, #221019 55%, #121214 100%)" : "#1C1C1E" }}
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
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold text-white active:scale-[0.98] transition disabled:opacity-60 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),0_12px_26px_rgba(255,55,95,0.35)]"
                  style={{ background: "linear-gradient(180deg,#FF5C7C 0%,#FF375F 55%,#E11D48 100%)" }}
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2C2C2E]">
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
            className="flex w-full items-center gap-3 rounded-[24px] bg-[#1C1C1E] p-4 text-left active:bg-[#2C2C2E] transition"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FF375F]">
              <BellRing className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Turn on booking alerts</span>
              <span className="block text-[12px] text-[#8E8E93]">Get a push the moment a client books or cancels.</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#636366]" />
          </motion.button>
        )}

        {/* Today + daily goal */}
        <motion.section variants={revealItem} className="grid grid-cols-[1.25fr_1fr] gap-3">
          <div className="rounded-[26px] bg-[#1C1C1E] p-4">
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
                    className="w-full rounded-full"
                    style={{ backgroundColor: index === chart.length - 1 ? ACCENT : "#3A3A3C" }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingGoal(true)}
            className="flex flex-col items-center justify-center rounded-[26px] bg-[#1C1C1E] p-4 active:bg-[#2C2C2E] transition"
          >
            <GoalRing progress={goalProgress} />
            <p className="mt-2 text-[12px] font-semibold text-white">Daily goal</p>
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
              <div className="flex items-center gap-2 rounded-[22px] bg-[#1C1C1E] p-2 pl-4">
                <Target className="h-4 w-4 shrink-0 text-[#FB7185]" />
                <input
                  name="goal"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  defaultValue={goal}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none"
                />
                <button type="submit" className="h-10 rounded-[14px] bg-[#FF375F] px-4 text-[13px] font-semibold">Save</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Today's schedule */}
        <motion.section variants={revealItem}>
          <SectionTitle title="Today's schedule" action="Agenda" onClick={() => navigate("/agenda")} />
          <div className="mt-3 overflow-hidden rounded-[26px] bg-[#1C1C1E]">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-9 text-center">
                <CalendarDays className="h-7 w-7 text-[#8E8E93]" />
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
                    className={cn("flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#2C2C2E]", index > 0 && "border-t border-white/[0.06]")}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-14 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-bold tabular-nums",
                        isNext ? "bg-[#FF375F] text-white" : "bg-[#2C2C2E] text-white/85"
                      )}
                    >
                      {appointment.appointment_time.slice(0, 5)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-[15px] font-semibold", done && "text-white/45 line-through")}>{appointment.customer?.name || "Walk-in"}</p>
                      <p className="truncate text-[12px] text-[#8E8E93]">{appointment.service?.name || "Service"}</p>
                    </div>
                    {done ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#30D158]/15">
                        <Check className="h-3.5 w-3.5 text-[#30D158]" />
                      </span>
                    ) : priceOf(appointment) > 0 ? (
                      <span className="text-[13px] font-semibold tabular-nums text-white/70">{money.format(priceOf(appointment))}</span>
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
        <motion.section variants={revealItem} className="rounded-[26px] bg-[#1C1C1E] px-4 py-4">
          <SectionTitle title="This week" action="Reports" onClick={() => navigate("/reports")} />
          <WeekBars week={metrics.week} today={today} onOpen={() => navigate("/agenda")} />
          <div className="mt-4 grid grid-cols-7 gap-1">
            {metrics.week.map((day) => {
              const date = new Date(`${day.date}T12:00:00`);
              const active = day.date === today;
              return (
                <button key={day.date} type="button" onClick={() => navigate("/agenda")} className="flex min-w-0 flex-col items-center gap-2">
                  <span className="text-[10px] font-semibold text-[#8E8E93]">{format(date, "EEEEE")}</span>
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold", active ? "bg-[#FF375F] text-white" : "bg-[#2C2C2E] text-[#F2F2F7]")}>
                    {format(date, "d")}
                  </span>
                  <span className={cn("text-[11px] font-bold", day.bookings ? "text-white" : "text-[#636366]")}>{day.bookings}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* 30-day snapshot — grouped iOS list */}
        <motion.section variants={revealItem}>
          <SectionTitle title="Last 30 days" action="Reports" onClick={() => navigate("/reports")} />
          <div className="mt-3 overflow-hidden rounded-[26px] bg-[#1C1C1E] divide-y divide-white/[0.06]">
            <StatRow icon={CircleDollarSign} label="Revenue" value={money.format(metrics.revenue_30d)} detail={`${money.format(metrics.avg_ticket_30d)} avg ticket`} />
            <StatRow icon={CalendarDays} label="Bookings" value={metrics.bookings_30d.toString()} detail={`${metrics.upcoming_bookings} upcoming`} />
            <StatRow icon={UsersRound} label="Clients" value={metrics.total_customers.toString()} detail={`+${metrics.new_customers_30d} new · ${metrics.returning_customers_30d} returning`} />
            <StatRow icon={Check} label="Completion" value={`${metrics.completion_rate}%`} detail={`${metrics.cancelled_30d} cancelled`} />
          </div>
          <OutcomeBar completed={metrics.completed_30d} cancelled={metrics.cancelled_30d} upcoming={Math.max(0, metrics.bookings_30d - metrics.completed_30d - metrics.cancelled_30d)} />
        </motion.section>

        {metrics.top_services.length > 0 && (
          <motion.section variants={revealItem} className="rounded-[26px] bg-[#1C1C1E] px-4 py-4">
            <SectionTitle title="Top services" action="Services" onClick={() => navigate("/services")} />
            <div className="mt-4 space-y-4">
              {metrics.top_services.map((service) => (
                <div key={service.name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] font-semibold">{service.name}</span>
                    <span className="shrink-0 text-[12px] font-semibold text-[#8E8E93]">{service.bookings} · {money.format(service.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#2C2C2E]">
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
              className={cn("w-full rounded-full", active ? "bg-[#FF375F]" : day.bookings ? "bg-[#48484A]" : "bg-[#2C2C2E]")}
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
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.08 }} className="h-full origin-left rounded-full bg-[#FF375F]" style={{ width: seg(upcoming) }} />
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.16 }} className="h-full origin-left rounded-full bg-[#48484A]" style={{ width: seg(cancelled) }} />
      </div>
      <div className="mt-2.5 flex items-center gap-4 text-[11px] font-medium text-[#8E8E93]">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#30D158]" />{completed} done</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#FF375F]" />{upcoming} ahead</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#48484A]" />{cancelled} cancelled</span>
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
        <circle cx="42" cy="42" r={r} fill="none" stroke="#2C2C2E" strokeWidth="9" />
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
        className={cn("flex h-[62px] w-full items-center justify-center rounded-[20px]", !primary && "bg-[#1C1C1E]")}
        style={primary ? { background: "linear-gradient(180deg,#FF5C7C 0%,#FF375F 55%,#E11D48 100%)", boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(255,55,95,0.35)" } : undefined}
      >
        <Icon className="h-6 w-6 text-white" />
      </span>
      <span className="text-[11px] font-medium text-white/75">{label}</span>
    </motion.button>
  );
}

function StatRow({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FF375F]">
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
      <button type="button" onClick={onClick} className="flex items-center gap-0.5 text-[14px] font-semibold text-[#FB7185]">
        {action}<ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

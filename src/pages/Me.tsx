import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  Calendar, Heart, Scissors, ChevronRight, ArrowRight, Loader2, CalendarDays, Users, BarChart3, Search,
  LogOut, Shield, Settings, BellRing, Flame, Award, Zap,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ClientMobileDock } from "@/components/ClientMobileDock";
import { ScreenLoader } from "@/components/ScreenLoader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/beui-tabs";
import { useRoleSwitch } from "@/hooks/use-role-switch";
import { PushToggle } from "@/components/PushToggle";

interface BookingRow {
  id: string;
  appointment_date: string;
  status: string;
  service_name: string | null;
  barber_id: string;
  barber_name: string | null;
}

const Me = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setRole, switching } = useRoleSwitch();
  const [waitlistAlerts, setWaitlistAlerts] = useState(true);
  const [waitlistSaving, setWaitlistSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("notify_cancellation_alerts")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setWaitlistAlerts(data.notify_cancellation_alerts ?? true);
    })();
  }, [user]);

  const toggleWaitlistAlerts = async (next: boolean) => {
    if (!user) return;
    setWaitlistAlerts(next);
    setWaitlistSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert({ id: user.id, notify_cancellation_alerts: next }, { onConflict: "id" });
    setWaitlistSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      setWaitlistAlerts(!next);
    }
  };


  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["me-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_bookings");
      if (error) throw error;
      return (data || []) as BookingRow[];
    },
  });

  const stats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter(
      (b) => new Date(b.appointment_date) >= new Date() && b.status !== "cancelled"
    ).length;
    const counts = new Map<string, { name: string; count: number }>();
    bookings.forEach((b) => {
      const key = b.barber_id;
      const cur = counts.get(key);
      counts.set(key, {
        name: b.barber_name || "Barber",
        count: (cur?.count || 0) + 1,
      });
    });
    let best: { name: string; count: number } | null = null;
    counts.forEach((v) => {
      if (!best || v.count > best.count) best = v;
    });
    return { total, upcoming, best };
  }, [bookings]);

  const favoritesCount = (() => {
    try {
      return (JSON.parse(localStorage.getItem("favoriteBarbers") || "[]") as string[]).length;
    } catch {
      return 0;
    }
  })();

  if (loading) {
    return <ScreenLoader />;
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: "/me" }} />;

  const initials = (user.user_metadata?.full_name || user.email || "?")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  const name = user.user_metadata?.full_name || "Welcome";

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F2F2F7] text-[#1C1C1E] dark:bg-[#000] dark:text-white">
      <div className="h-full overflow-y-auto overscroll-contain pb-32">
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-[max(env(safe-area-inset-top),20px)]">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={riseSpring}
          className="px-1 pt-2 text-[34px] font-bold tracking-[-0.03em]"
        >
          Settings
        </motion.h1>

        {/* Barber mode hero */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.04, ...riseSpring }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { haptic("medium"); setRole("barber"); }}
          disabled={switching}
          className="group relative block w-full overflow-hidden rounded-[32px] bg-[#0B0B0F] p-6 text-left text-white disabled:opacity-80"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(255,45,70,0.55)_0%,rgba(255,45,70,0.12)_40%,transparent_70%)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#FF9500]/20 blur-3xl" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 opacity-[0.12]"
            animate={{ rotate: [0, -8, 0] }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
          >
            <Scissors className="h-44 w-44" strokeWidth={1.2} />
          </motion.div>
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_30px_-8px_rgba(255,45,70,0.7)]">
              <Scissors className="h-7 w-7" />
            </div>
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FF8A98]">Barber mode</p>
            <p className="mt-1 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em]">Run your chair.</p>
            <p className="mt-1.5 text-[15px] text-white/60">Agenda, bookings and clients in one place.</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {[{ I: CalendarDays, l: "Agenda" }, { I: Users, l: "Clients" }, { I: BarChart3, l: "Reports" }].map(({ I, l }) => (
                <span key={l} className="flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[12.5px] font-medium text-white/80 backdrop-blur-md">
                  <I className="h-3.5 w-3.5" />{l}
                </span>
              ))}
            </div>
            <div className="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-[18px] bg-white text-[16px] font-semibold text-[#0B0B0F]">
              {switching ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Switch to barber mode <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-0.5" /></>}
            </div>
          </div>
        </motion.button>

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...riseSpring }}>
          <Link to="/settings" className="flex items-center gap-4 rounded-[24px] bg-white p-4 active:bg-black/[0.03] dark:bg-[#1C1C1E] dark:active:bg-white/[0.04]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#8E8E93] to-[#636366] text-[20px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-semibold tracking-[-0.02em]">{name}</p>
              <p className="truncate text-[13px] text-[#8E8E93]">{user.email}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#C7C7CC] dark:text-[#48484A]" />
          </Link>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            <StatCard label="Bookings" value={isLoading ? "—" : stats.total} />
            <StatCard label="Upcoming" value={isLoading ? "—" : stats.upcoming} />
            <StatCard label="Favorites" value={favoritesCount} />
          </div>
        </motion.div>

        {/* Streaks & Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, ...riseSpring }}
          className="overflow-hidden rounded-[24px] bg-white p-4 dark:bg-[#1C1C1E]"
        >
          <Tabs defaultValue="streak" className="w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wide text-[#8E8E93] font-semibold">Progress</p>
              <TabsList className="bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                <TabsTrigger value="streak" className="text-xs px-2.5 py-1">Streak</TabsTrigger>
                <TabsTrigger value="badges" className="text-xs px-2.5 py-1">Badges</TabsTrigger>
                <TabsTrigger value="stats" className="text-xs px-2.5 py-1">Stats</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="streak" className="mt-0">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF9500] to-[#FF2D55] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF2D55]/20"
                >
                  <Flame className="w-6 h-6 text-white fill-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {stats.best ? `${stats.best.count} visit streak` : "Start your streak"}
                  </p>
                  <p className="text-[12px] text-[#8E8E93]">
                    {stats.best
                      ? `Keep booking ${stats.best.name} to unlock rewards`
                      : "Book your first appointment to begin"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="badges" className="mt-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD60A] to-[#FFB800] flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {stats.total >= 5 ? "Regular" : stats.total >= 1 ? "Rookie" : "No badges yet"}
                  </p>
                  <p className="text-[12px] text-[#8E8E93]">
                    {stats.total >= 5
                      ? "You're a regular. Keep it up!"
                      : `${5 - stats.total} more booking${5 - stats.total !== 1 ? "s" : ""} to earn Regular`}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {stats.total} lifetime bookings
                  </p>
                  <p className="text-[12px] text-[#8E8E93]">
                    {stats.upcoming} upcoming · {stats.best?.name ?? "—"} is your favorite
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        <Group title="Bookings" delay={0.16}>
          <Row to="/my-bookings" tint="#007AFF" icon={<Calendar className="h-[18px] w-[18px]" />} label="My bookings" />
          <Row to="/favorites" tint="#FF2D55" icon={<Heart className="h-[18px] w-[18px]" />} label="Favorites" />
          <Row to="/find-barber" tint="#5856D6" icon={<Search className="h-[18px] w-[18px]" />} label="Find a barber" />
        </Group>

        <Group title="Notifications" delay={0.2}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Tile tint="#FF3B30"><BellRing className="h-[18px] w-[18px]" /></Tile>
            <div className="min-w-0 flex-1">
              <div className="text-[16px]">Cancellation alerts</div>
              <div className="text-[12px] text-[#8E8E93]">When a waitlist spot opens</div>
            </div>
            <Switch checked={waitlistAlerts} onCheckedChange={toggleWaitlistAlerts} disabled={waitlistSaving} />
          </div>
          <div className="border-t border-black/[0.06] px-4 dark:border-white/[0.06]">
            <PushToggle />
          </div>
        </Group>

        <Group title="Account" delay={0.24}>
          <Row to="/settings" tint="#8E8E93" icon={<Settings className="h-[18px] w-[18px]" />} label="Account settings" />
          <Row tint="#34C759" icon={<Shield className="h-[18px] w-[18px]" />} label="Privacy" disabled />
        </Group>

        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, ...riseSpring }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-white text-[16px] font-medium text-[#FF3B30] dark:bg-[#1C1C1E]"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </motion.button>
      </div>
      </div>

      <ClientMobileDock />
    </div>
  );
};

const riseSpring = { type: "spring" as const, stiffness: 380, damping: 32 };

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] bg-white px-3 py-3.5 dark:bg-[#1C1C1E]">
      <p className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">{value}</p>
      <p className="text-[12px] font-medium text-[#8E8E93]">{label}</p>
    </div>
  );
}

function Group({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ...riseSpring }}>
      <p className="mb-2 px-4 text-[13px] font-medium uppercase tracking-[0.04em] text-[#8E8E93]">{title}</p>
      <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#1C1C1E]">{children}</div>
    </motion.section>
  );
}

function Tile({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-white" style={{ backgroundColor: tint }}>
      {children}
    </div>
  );
}

function Row({
  to, icon, label, disabled, tint,
}: { to?: string; icon: React.ReactNode; label: string; disabled?: boolean; tint: string }) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${disabled ? "opacity-50" : "active:bg-black/[0.04] dark:active:bg-white/[0.05]"}`}>
      <Tile tint={tint}>{icon}</Tile>
      <span className="flex-1 text-[16px]">{label}</span>
      {!disabled && <ChevronRight className="h-4 w-4 text-[#C7C7CC] dark:text-[#48484A]" />}
    </div>
  );
  if (disabled || !to) return <div className="border-t border-black/[0.06] first:border-t-0 dark:border-white/[0.06]">{inner}</div>;
  return <Link to={to} className="block border-t border-black/[0.06] first:border-t-0 dark:border-white/[0.06]">{inner}</Link>;
}

export default Me;

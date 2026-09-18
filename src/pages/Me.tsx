import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  Loader2, Calendar, Heart, Star, Scissors, ChevronRight,
  LogOut, Bell, Shield, Sparkles, Settings, BellRing, Flame, Award, Zap,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ClientMobileDock } from "@/components/ClientMobileDock";
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: "/me" }} />;

  const initials = (user.user_metadata?.full_name || user.email || "?")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white pb-28">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] via-[#5856D6] to-[#AF52DE]" />
        <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="flex items-center gap-4"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-2xl font-bold border border-white/30 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[24px] font-bold truncate">
                {user.user_metadata?.full_name || "Welcome"}
              </h1>
              <p className="text-[13px] text-white/80 truncate">{user.email}</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 space-y-4 relative">
        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 380, damping: 30 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatCard icon={<Calendar className="w-4 h-4" />} label="Bookings" value={isLoading ? "—" : stats.total} />
          <StatCard icon={<Sparkles className="w-4 h-4" />} label="Upcoming" value={isLoading ? "—" : stats.upcoming} />
          <StatCard icon={<Heart className="w-4 h-4 text-[#FF2D55]" />} label="Favorites" value={favoritesCount} />
        </motion.div>

        {/* Streaks & Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 380, damping: 30 }}
          className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 overflow-hidden"
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
                      ? "You're a regular — keep it up"
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

        {/* Action list */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 380, damping: 30 }}
          className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 overflow-hidden"
        >
          <Row to="/my-bookings" icon={<Calendar className="w-5 h-5 text-[#007AFF]" />} label="My bookings" />
          <Row to="/favorites" icon={<Heart className="w-5 h-5 text-[#FF2D55]" />} label="Favorites" />
          <Row to="/find-barber" icon={<Scissors className="w-5 h-5 text-[#5856D6]" />} label="Find a barber" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 380, damping: 30 }}
          className="rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 overflow-hidden"
        >
          <Row to="/settings" icon={<Settings className="w-5 h-5 text-[#8E8E93]" />} label="Account settings" />
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">Cancellation alerts</div>
              <div className="text-[11px] text-[#8E8E93]">Email me when a spot opens on a waitlist I joined</div>
            </div>
            <Switch checked={waitlistAlerts} onCheckedChange={toggleWaitlistAlerts} disabled={waitlistSaving} />
          </div>
          <div className="px-4 border-b border-black/5 dark:border-white/5">
            <PushToggle />
          </div>
          <Row icon={<Shield className="w-5 h-5 text-[#34C759]" />} label="Privacy" disabled />
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 380, damping: 30 }}
          onClick={() => setRole("barber")}
          disabled={switching}
          className="w-full rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 flex items-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#FF2D55] flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">Switch to barber mode</div>
            <div className="text-[11px] text-[#8E8E93]">Manage bookings, agenda & your chair</div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 380, damping: 30 }}
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="w-full rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-4 flex items-center justify-center gap-2 text-[#FF3B30] font-semibold active:scale-[0.98] transition-transform"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </motion.button>
      </div>

      <ClientMobileDock />
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 p-3 text-center">
      <div className="w-8 h-8 mx-auto rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center mb-1">
        {icon}
      </div>
      <p className="text-[18px] font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[#8E8E93] font-medium">{label}</p>
    </div>
  );
}

function Row({
  to, icon, label, disabled,
}: { to?: string; icon: React.ReactNode; label: string; disabled?: boolean }) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-black/5 dark:border-white/5 last:border-0 ${disabled ? "opacity-60" : "active:bg-black/5 dark:active:bg-white/5"} transition-colors`}>
      <div className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="flex-1 font-medium text-[15px] text-[#1C1C1E] dark:text-[#F2F2F7]">{label}</span>
      {!disabled && <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />}
    </div>
  );
  if (disabled || !to) return <div>{inner}</div>;
  return <Link to={to}>{inner}</Link>;
}

export default Me;

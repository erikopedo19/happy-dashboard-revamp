import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StreakCelebrationView, type StreakDay } from "./StreakCelebrationView";

const REVIEW_ANNOUNCEMENT_KEY = "cutzio:review-announcement-shown";

function useStreakInfo() {
  const { user } = useAuth();
  const { data: dates } = useQuery({
    queryKey: ["booking-streak-days", user?.id],
    queryFn: async () => {
      if (!user) return [] as string[];
      const since = format(subDays(new Date(), 120), "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("user_id", user.id)
        .gte("appointment_date", since);
      const set = new Set<string>((data || []).map((r) => r.appointment_date as string));
      return Array.from(set).sort();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!dates) return null;
    const set = new Set(dates);
    const today = new Date();
    const key = (d: Date) => format(d, "yyyy-MM-dd");
    let start = set.has(key(today)) ? 0 : set.has(key(subDays(today, 1))) ? 1 : -1;
    let streak = 0;
    if (start >= 0) for (; start < 365 && set.has(key(subDays(today, start))); start++) streak++;
    const week: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return { key: key(d), letter: format(d, "EEEEE"), date: d.getDate(), active: set.has(key(d)) };
    });
    const prefix = format(today, "yyyy-MM-");
    const booked = dates
      .filter((d) => d.startsWith(prefix))
      .map((d) => Number(d.slice(8, 10)))
      .filter((d) => d <= today.getDate());
    return {
      streak,
      week,
      month: { year: today.getFullYear(), monthIndex: today.getMonth(), booked, today: today.getDate() },
    };
  }, [dates]);
}

function useStreakPrefs() {
  const { user } = useAuth();
  const offKey = user ? `cutzio:streak-anim-off:${user.id}` : "";
  const isOff = () =>
    !!user && (user.user_metadata?.streak_animation_off === true || !!localStorage.getItem(offKey));
  const save = (showAgain: boolean) => {
    if (!user) return;
    if (showAgain) {
      localStorage.removeItem(offKey);
      if (user.user_metadata?.streak_animation_off) {
        supabase.auth.updateUser({ data: { streak_animation_off: false } }).catch(() => {});
      }
      return;
    }
    localStorage.setItem(offKey, "1");
    supabase.auth.updateUser({ data: { streak_animation_off: true } }).catch(() => {});
  };
  return { isOff, save };
}

/** Plays the streak animation on demand (e.g. tapping the Streak card in Settings). */
export function StreakPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const info = useStreakInfo();
  const { save } = useStreakPrefs();
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && info && (
        <StreakCelebrationView
          streak={info.streak}
          week={info.week}
          month={info.month}
          onClose={(showAgain) => {
            save(showAgain);
            onClose();
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Shows the streak celebration once a day while the barber's booking streak is alive, until they opt out. */
export function StreakCelebration() {
  const { user } = useAuth();
  const info = useStreakInfo();
  const { isOff } = useStreakPrefs();
  const [open, setOpen] = useState(false);
  const lastKey = user ? `cutzio:streak-anim-last:${user.id}` : "";

  useEffect(() => {
    if (!user || !info || info.streak < 1 || isOff()) return;
    // Don't stack on top of the welcome tour or the reviews announcement.
    if (sessionStorage.getItem("cutzio:welcome-tour-shown")) return;
    if (!localStorage.getItem(REVIEW_ANNOUNCEMENT_KEY)) return;
    const today = format(new Date(), "yyyy-MM-dd");
    if (localStorage.getItem(lastKey) === today) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(lastKey, today);
      setOpen(true);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, info, lastKey]);

  return <StreakPlayer open={open} onClose={() => setOpen(false)} />;
}

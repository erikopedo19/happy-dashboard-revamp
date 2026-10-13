import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Check, Crown, MapPin, Sparkles, Star, Users } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";

const PRO_FEATURES = [
  { icon: CalendarClock, label: "Unlimited bookings & clients" },
  { icon: Users, label: "Team members & stylists" },
  { icon: MapPin, label: "Map listing & discoverability" },
  { icon: Sparkles, label: "Reports, branding & no-show protection" },
];

const DISMISS_KEY = "subscription_reminder_dismissed";
const LAST_SHOWN_KEY = "subscription_reminder_last_shown";

interface SubscriptionReminderDrawerProps {
  forceOpen?: boolean;
}

export function SubscriptionReminderDrawer({ forceOpen }: SubscriptionReminderDrawerProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_end")
        .eq("user_id", user.id)
        .maybeSingle();

      setSubscribed(!!data?.subscribed);
      setEndDate(data?.subscription_end ?? null);

      if (data?.subscription_end) {
        const end = new Date(data.subscription_end);
        const diffDays = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
        setDaysRemaining(diffDays);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading || !endDate || daysRemaining === null) return;

    // Show if expiring within 7 days, or expired (even after `subscribed` flipped to false)
    const shouldShow = subscribed ? daysRemaining <= 7 : daysRemaining <= 0;
    if (!shouldShow) return;

    // Check if dismissed recently (within 3 days) or shown today already
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
      const now = Date.now();

      if (dismissed && now - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;
      if (lastShown && now - Number(lastShown) < 24 * 60 * 60 * 1000) return;
    } catch { /* ignore */ }

    const timer = setTimeout(() => {
      setOpen(true);
      try {
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      } catch { /* ignore */ }
    }, 1500);

    return () => clearTimeout(timer);
  }, [loading, subscribed, endDate, daysRemaining]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
    setOpen(false);
  };

  const handleManage = () => {
    if (STRIPE_PORTAL_LINK) {
      window.open(STRIPE_PORTAL_LINK, "_blank", "noopener,noreferrer");
    } else {
      navigate("/pricing");
    }
    setOpen(false);
  };

  const visible = !!endDate && daysRemaining !== null && (subscribed ? daysRemaining <= 7 : daysRemaining <= 0);
  if (loading || !visible) return null;

  const isExpired = daysRemaining <= 0;

  const tabLabel = isExpired
    ? "Expired"
    : daysRemaining <= 1
      ? "Expires tomorrow"
      : "Expires this week";

  const formattedDate = new Date(endDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : handleDismiss())}>
      <DrawerContent className="bg-white shadow-none dark:bg-[#1C1C1E]">
        <div className="mx-auto w-full max-w-md px-5 pb-9 pt-3">
          {/* Status tab */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="flex justify-center"
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em]",
                isExpired
                  ? "bg-[#FF2D46]/15 text-[#FF2D46]"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              )}
            >
              <Crown className="h-3 w-3" />
              {tabLabel}
            </span>
          </motion.div>

          {/* iOS-style squircle icon */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
            className="mx-auto mt-5 grid h-[76px] w-[76px] place-items-center rounded-[22px] bg-[#FF2D46]/15 text-[#FF2D46]"
          >
            <Crown className="h-9 w-9" strokeWidth={1.75} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 26 }}
          >
            <h2 className="mt-4 text-center text-[24px] font-bold leading-tight tracking-[-0.02em] text-[#1C1C1E] dark:text-white">
              {isExpired ? "Your Pro membership has ended" : "Your Pro membership is ending"}
            </h2>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-[14px] leading-relaxed text-[#8E8E93] dark:text-white/55">
              {isExpired
                ? "Your plan ended on " + formattedDate + ". Renew to get everything back instantly. Nothing was lost."
                : "Your plan ends " + formattedDate + ". Renew now and everything stays exactly as it is. There will be no gap."}
            </p>
          </motion.div>

          {/* iOS grouped card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, type: "spring", stiffness: 280, damping: 28 }}
            className="mt-5 overflow-hidden rounded-[20px] bg-black/[0.035] ring-1 ring-black/[0.04] dark:bg-white/[0.06] dark:ring-white/[0.07]"
          >
            <p className="px-4 pb-1.5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93] dark:text-white/40">
              {isExpired ? "Paused with Pro" : "Included with Pro"}
            </p>
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {PRO_FEATURES.map((f, i) => (
                <motion.li
                  key={f.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FF2D46]/10 text-[#FF2D46]">
                    <f.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-[#1C1C1E]/85 dark:text-white/85">{f.label}</span>
                  <Check className="h-4 w-4 text-[#FF2D46]" strokeWidth={2.5} />
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, type: "spring", stiffness: 280, damping: 26 }}
          >
            <button
              type="button"
              onClick={handleManage}
              className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FF2D46] text-[16px] font-semibold text-white transition active:scale-[0.98] active:bg-[#E0152F]"
            >
              {isExpired ? "Renew Cutzioo Pro" : "Keep Pro: Renew"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-1 w-full py-2.5 text-center text-[14px] font-medium text-[#8E8E93] transition hover:text-[#1C1C1E] dark:text-white/45 dark:hover:text-white/80"
            >
              Remind me later
            </button>
            <p className="flex items-center justify-center gap-1 text-center text-[11px] text-[#AEAEB2] dark:text-white/30">
              <Star className="h-3 w-3 fill-current" /> 4.8 from barbers on Cutzioo · cancel anytime
            </p>
          </motion.div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default SubscriptionReminderDrawer;

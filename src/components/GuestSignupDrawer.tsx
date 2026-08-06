import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gift, CreditCard, Check } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

const DISMISSED_KEY = "cutzio_guest_signup_dismissed_at";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

// Routes where a sign-up nudge would get in the way
const MUTED_PREFIXES = ["/auth", "/onboarding", "/book/", "/manage/", "/review/", "/waitlist/", "/site/", "/.lovable"];
// Exact routes where the nudge should never show (landing page)
const MUTED_EXACT = ["/"];

const PERKS = [
  "Full access to bookings, agenda & clients",
  "Your own booking link in under a minute",
  "Cancel any time — nothing to unsubscribe",
];

/**
 * Shown to signed-out (guest) visitors: one free trial month, no credit card.
 * iOS-style spring entrance, dismissal remembered for 3 days.
 */
export function GuestSignupDrawer() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const muted =
    MUTED_EXACT.includes(location.pathname) ||
    MUTED_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (loading || user || muted) return;
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || "0");
    if (dismissedAt && Date.now() - dismissedAt < THREE_DAYS) return;
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, [loading, user, muted]);

  useEffect(() => {
    if (user && open) setOpen(false);
  }, [user, open]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setOpen(false);
  };

  if (loading || user || muted) return null;

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-6 pb-8 pt-2">
          <motion.div
            initial={{ scale: 0.86, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[26px] bg-gradient-to-br from-rose-400 to-rose-600"
          >
            <Gift className="h-8 w-8 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, type: "spring", stiffness: 240, damping: 24 }}
            className="text-center text-[24px] font-bold tracking-tight text-[#1C1C1E] dark:text-white"
          >
            Your first month is free
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.11, type: "spring", stiffness: 240, damping: 24 }}
            className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 dark:bg-white/[0.08]"
          >
            <CreditCard className="h-3.5 w-3.5 text-[#8E8E93] dark:text-white/50" />
            <span className="text-[12.5px] font-medium text-[#8E8E93] dark:text-white/60">
              No credit card needed
            </span>
          </motion.div>

          <div className="mt-6 space-y-2">
            {PERKS.map((p, i) => (
              <motion.div
                key={p}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16 + i * 0.06, type: "spring", stiffness: 260, damping: 24 }}
                className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-black/[0.03] px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.04]"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                  <Check className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1C1C1E]/80 dark:text-white/80">{p}</span>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, type: "spring", stiffness: 260, damping: 24 }}
            whileTap={{ scale: 0.975 }}
            onClick={() => {
              haptic("medium");
              setOpen(false);
              navigate("/auth");
            }}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-black text-[16px] font-semibold text-white dark:bg-white dark:text-black"
          >
            Start free month
          </motion.button>

          <button
            onClick={dismiss}
            className="mt-3 w-full py-2 text-center text-[13px] font-medium text-[#8E8E93] transition-opacity active:opacity-60 dark:text-white/40"
          >
            Maybe later
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default GuestSignupDrawer;

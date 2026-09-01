import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { haptic } from "@/lib/haptics";

const SHOWN_KEY = "cutzio:free-upgrade-banner-shown";
const FIVE_MIN = 5 * 60 * 1000;

const MUTED_PREFIXES = ["/auth", "/onboarding", "/book/", "/manage/", "/review/", "/waitlist/", "/site/", "/pricing", "/.lovable"];

/**
 * Slim top banner reminding active free users about the $9 Premium plan.
 * Appears once per day and disappears on its own after 5 minutes.
 */
export function FreeUpgradeBanner() {
  const { user, loading } = useAuth();
  const { loading: premiumLoading, isPremium } = usePremium();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const muted = MUTED_PREFIXES.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (loading || premiumLoading || !user || isPremium || muted) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(SHOWN_KEY) === today) return;
    localStorage.setItem(SHOWN_KEY, today);
    setOpen(true);
    const t = setTimeout(() => setOpen(false), FIVE_MIN);
    return () => clearTimeout(t);
  }, [loading, premiumLoading, user, isPremium, muted]);

  if (!user || isPremium) return null;

  return (
    <AnimatePresence>
      {open && !muted && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 top-0 z-[60] px-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
        >
          <div className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-[#141417]/95 px-3.5 py-2.5 shadow-lg backdrop-blur-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-white">
                Premium for $9/month
              </p>
              <p className="truncate text-[11.5px] text-white/50">
                Unlimited bookings, your own website & reports
              </p>
            </div>
            <button
              onClick={() => {
                haptic("medium");
                setOpen(false);
                navigate("/pricing");
              }}
              className="h-8 shrink-0 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-black active:opacity-80"
            >
              Upgrade
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FreeUpgradeBanner;

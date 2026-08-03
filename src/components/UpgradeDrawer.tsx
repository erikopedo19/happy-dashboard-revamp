import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Check, X } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { usePremium } from "@/hooks/use-premium";
import { motion } from "framer-motion";

const OPENS_KEY = "cutzio_upgrade_opens";
const SHOWN_KEY = "cutzio_upgrade_shown_count";
const LAST_KEY = "cutzio_upgrade_last_shown";
const DISMISSED_KEY = "cutzio_upgrade_dismissed_at";

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

const PERKS = [
  "Animated premium button themes",
  "Automatic review request emails",
  "Bigger banner & photo uploads",
  "Priority support from the team",
];

/**
 * Suggests Pro to free users:
 *  - first time on the 3rd app open
 *  - again after 5 more opens
 *  - after that, at most once every 10 days
 * Dismissing ("Maybe later" / close) is persisted so it stays hidden
 * for 10 days across sessions. Pro users never see it.
 */
export function UpgradeDrawer() {
  const navigate = useNavigate();
  const { loading, isPremium } = usePremium();
  const [open, setOpen] = useState(false);

  // Hide immediately if the user becomes Pro while the drawer is open
  useEffect(() => {
    if (isPremium && open) setOpen(false);
  }, [isPremium, open]);

  useEffect(() => {
    if (loading || isPremium) return;

    const num = (k: string) => Number(localStorage.getItem(k) || "0");
    const opens = num(OPENS_KEY) + 1;
    localStorage.setItem(OPENS_KEY, String(opens));

    const shown = num(SHOWN_KEY);
    const last = num(LAST_KEY);
    const dismissedAt = num(DISMISSED_KEY);
    const now = Date.now();

    // A persisted dismissal keeps it hidden for 10 days, whatever the session
    if (dismissedAt && now - dismissedAt < TEN_DAYS) return;

    let due = false;
    if (shown === 0) due = opens >= 3;
    else if (shown === 1) due = opens >= 8; // 5 opens after the first prompt
    else due = now - last >= TEN_DAYS;

    if (!due) return;
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(SHOWN_KEY, String(shown + 1));
      localStorage.setItem(LAST_KEY, String(now));
    }, 1200);
    return () => clearTimeout(t);
  }, [loading, isPremium]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setOpen(false);
  };

  if (loading || isPremium) return null;


  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DrawerContent className="rounded-t-[32px] border-white/10 bg-[#0A0A0A] text-white">
        <div className="mx-auto w-full max-w-md px-6 pb-8 pt-2">
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/20" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-900/30"
          >
            <Crown className="h-8 w-8 text-[#1C1C1E]" />
          </motion.div>

          <h2 className="text-center text-[22px] font-bold tracking-tight">Go Pro</h2>
          <p className="mx-auto mt-1 max-w-[280px] text-center text-[13px] text-white/50">
            Unlock the tools that keep your chair full.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2">
            {PERKS.map((p) => (
              <div
                key={p}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-3"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-[14px] text-white/80">{p}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setOpen(false);
              navigate("/pricing");
            }}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-black text-white text-[16px] font-semibold shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)]"
          >
            <Sparkles className="h-4 w-4" />
            See Pro plans
          </motion.button>

          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full text-center text-[13px] font-medium text-white/40"
          >
            Maybe later
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default UpgradeDrawer;

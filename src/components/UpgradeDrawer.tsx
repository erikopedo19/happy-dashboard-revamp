import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Check, X, BarChart3, TrendingUp, Mail, Image, Headphones } from "lucide-react";
import { Button } from "@heroui/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { usePremium } from "@/hooks/use-premium";
import { motion } from "framer-motion";

const OPENS_KEY = "cutzio_upgrade_opens";
const SHOWN_KEY = "cutzio_upgrade_shown_count";
const LAST_KEY = "cutzio_upgrade_last_shown";
const DISMISSED_KEY = "cutzio_upgrade_dismissed_at";

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

const PERKS = [
  { label: "Reports", path: "/reports", icon: "BarChart3" },
  { label: "Revenue Tracker", path: "/reports", icon: "TrendingUp" },
  { label: "Animated premium button themes", path: "/settings", icon: "Sparkles" },
  { label: "Automatic review request emails", path: "/settings?tab=messages", icon: "Mail" },
  { label: "Bigger banner & photo uploads", path: "/settings?tab=booking", icon: "Image" },
  { label: "Priority support from the team", path: "/settings?tab=general", icon: "Headphones" },
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
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-6 pb-8 pt-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg shadow-amber-900/30"
          >
            <Crown className="h-8 w-8 text-[#1C1C1E]" />
          </motion.div>

          <h2 className="text-center text-[22px] font-bold tracking-tight text-[#1C1C1E] dark:text-white">Go Pro</h2>
          <p className="mx-auto mt-1 max-w-[280px] text-center text-[13px] text-[#8E8E93] dark:text-white/50">
            Unlock the tools that keep your chair full.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2">
            {PERKS.map((p) => {
              const IconComponent = {
                BarChart3,
                TrendingUp,
                Sparkles,
                Mail,
                Image,
                Headphones,
              }[p.icon] as any;
              return (
                <Button
                  key={p.label}
                  variant="light"
                  onPress={() => {
                    setOpen(false);
                    navigate(p.path);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-black/[0.03] dark:border-white/[0.06] dark:bg-white/[0.04] px-4 py-3 text-left justify-start h-auto"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-500 dark:text-amber-300">
                    {IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-[14px] text-[#1C1C1E]/80 dark:text-white/80">{p.label}</span>
                </Button>
              );
            })}
          </div>

          <Button
            onPress={() => {
              setOpen(false);
              navigate("/pricing");
            }}
            className="mt-6 h-14 w-full rounded-full bg-black text-white text-[16px] font-semibold shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)]"
          >
            <Sparkles className="h-4 w-4" />
            See Pro plans
          </Button>

          <Button
            variant="light"
            onPress={dismiss}
            className="mt-3 w-full text-center text-[13px] font-medium text-[#8E8E93] dark:text-white/40 h-auto py-2"
          >
            Maybe later
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default UpgradeDrawer;

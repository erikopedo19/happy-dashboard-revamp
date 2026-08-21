import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, X, Bell, Star, Unlock } from "lucide-react";
import { Button } from "@heroui/react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { usePremium } from "@/hooks/use-premium";
import { motion } from "framer-motion";

const OPENS_KEY = "cutzio_upgrade_opens";
const SHOWN_KEY = "cutzio_upgrade_shown_count";
const LAST_KEY = "cutzio_upgrade_last_shown";
const DISMISSED_KEY = "cutzio_upgrade_dismissed_at";

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

const TIMELINE = [
  { icon: Unlock, title: "Today", body: "Full access to reports, themes, review emails and priority support." },
  { icon: Bell, title: "Day 5", body: "We'll remind you before the trial ends — check your inbox." },
  { icon: Star, title: "Day 7", body: "You'll be charged unless you cancel anytime before." },
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
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");

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

  const price = plan === "annual" ? { today: "€0.00", after: "€6.99/mo billed yearly" } : { today: "€0.00", after: "€9.99/mo" };

  if (loading || isPremium) return null;


  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DrawerContent className="border-white/[0.06] bg-[#0B0B0D] text-white">
        <div className="relative mx-auto w-full max-w-md px-6 pb-8 pt-3">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(80%_60%_at_50%_120%,rgba(225,29,72,0.35),transparent_70%)]" />

          <div className="relative flex items-start justify-between">
            <span className="text-[11px] leading-tight text-white/40">Restore<br />purchase</span>
            <button
              onClick={dismiss}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition active:scale-95"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative mx-auto mt-1 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FF7A45] to-[#E11D48] shadow-[0_16px_40px_-16px_rgba(225,29,72,0.8)]"
          >
            <Crown className="h-8 w-8 text-white" />
          </motion.div>

          <h2 className="relative mt-4 text-center text-[22px] font-bold leading-tight tracking-tight">
            Here&apos;s how your 7 days
            <br />free trial works
          </h2>

          <div className="relative mx-auto mt-4 flex w-fit items-center rounded-full bg-white/[0.08] p-1">
            {(["annual", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`relative h-9 rounded-full px-5 text-[14px] font-semibold transition-colors ${
                  plan === p ? "text-black" : "text-white/60"
                }`}
              >
                {plan === p && (
                  <motion.span layoutId="paywall-plan" transition={{ type: "spring", stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full bg-white" />
                )}
                <span className="relative z-10">{p === "annual" ? "Annual" : "Monthly"}</span>
              </button>
            ))}
          </div>

          <div className="relative mt-6 space-y-4">
            {TIMELINE.map((t) => (
              <div key={t.title} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <t.icon className="h-4 w-4 text-white" />
                  <span className="mt-1 w-[3px] flex-1 rounded-full bg-gradient-to-b from-[#FF7A45] to-[#E11D48]" />
                </div>
                <div className="pb-1">
                  <p className="text-[15px] font-semibold">{t.title}</p>
                  <p className="text-[12.5px] leading-snug text-white/45">{t.body}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-[#FF7A45]" />
              <p className="text-[15px] font-semibold">Unlimited bookings, unlocked</p>
            </div>
          </div>

          <Button
            onPress={() => {
              setOpen(false);
              navigate(`/pricing?plan=${plan}&trial=1`);
            }}
            className="relative mt-6 h-14 w-full rounded-full bg-[#EDEDED] text-[16px] font-semibold text-black"
          >
            Try for {price.today}
          </Button>

          <p className="relative mt-2.5 text-center text-[12px] text-white/45">
            First 7 days free, then {price.after}
          </p>

          <Button
            variant="light"
            onPress={dismiss}
            className="relative mt-1 w-full text-center text-[13px] font-medium text-white/35 h-auto py-2"
          >
            Maybe later
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default UpgradeDrawer;

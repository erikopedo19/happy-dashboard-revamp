import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { usePremium } from "@/hooks/use-premium";
import { STRIPE_PAYMENT_LINK, STRIPE_PAYMENT_LINK_YEARLY, STRIPE_TRIAL_ENABLED, plans } from "@/lib/billingsdk-config";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";

const OPENS_KEY = "cutzio_upgrade_opens";
const SHOWN_KEY = "cutzio_upgrade_shown_count";
const LAST_KEY = "cutzio_upgrade_last_shown";
const DISMISSED_KEY = "cutzio_upgrade_dismissed_at";

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

type DrawerPlanKey = "yearly" | "monthly";

const PRO_PLAN = plans.find(({ id }) => id === "pro");
const MONTHLY_TOTAL = PRO_PLAN ? `€${PRO_PLAN.monthlyPrice}` : "€8.99";
const YEARLY_TOTAL = PRO_PLAN ? `€${PRO_PLAN.yearlyPrice}` : "€89.90";
const YEARLY_PER_MONTH = PRO_PLAN
  ? `€${(Number(PRO_PLAN.yearlyPrice) / 12).toFixed(2)}`
  : "€7.49";

const MONTHLY_OPTION = {
  key: "monthly" as const,
  title: "Monthly",
  total: MONTHLY_TOTAL,
  cadence: "per month",
  billing: `${MONTHLY_TOTAL} billed every month`,
};

const ALL_PLAN_OPTIONS: {
  key: DrawerPlanKey;
  title: string;
  total: string;
  cadence: string;
  billing: string;
}[] = [
  {
    key: "yearly",
    title: "Annual",
    total: YEARLY_TOTAL,
    cadence: "per year",
    billing: `${YEARLY_PER_MONTH}/mo billed yearly (${YEARLY_TOTAL}/year)`,
  },
  MONTHLY_OPTION,
];

const PLAN_OPTIONS = ALL_PLAN_OPTIONS.filter((option) =>
  option.key === "yearly" ? !!STRIPE_PAYMENT_LINK_YEARLY : !!STRIPE_PAYMENT_LINK
);

const PERKS = [
  "Unlimited bookings",
  "Reports, teams and your own website",
  "Cancel anytime. No charge after you cancel.",
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
  const [plan, setPlan] = useState<DrawerPlanKey>(PLAN_OPTIONS[0]?.key ?? "monthly");

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
    haptic("light");
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setOpen(false);
  };

  const selectedPlan = PLAN_OPTIONS.find((option) => option.key === plan) ?? PLAN_OPTIONS[0] ?? MONTHLY_OPTION;
  const yearlySaving = PRO_PLAN
    ? Math.round((1 - Number(PRO_PLAN.yearlyPrice) / (Number(PRO_PLAN.monthlyPrice) * 12)) * 100)
    : 0;

  if (loading || isPremium) return null;

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DrawerContent className="border-border bg-background text-foreground">
        <div className="mx-auto w-full max-w-md px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <p className="text-[13px] font-semibold text-primary">Cutzioo Pro</p>
            <h2 className="mt-1 text-[28px] font-bold leading-[1.1] tracking-tight">Grow without limits.</h2>

            <ul className="mt-6 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-[15px]">
                  <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 space-y-2" role="radiogroup" aria-label="Choose a plan">
              {(PLAN_OPTIONS.length ? PLAN_OPTIONS : [MONTHLY_OPTION]).map((option) => {
                const selected = option.key === selectedPlan.key;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    key={option.key}
                    onClick={() => {
                      haptic("selection");
                      setPlan(option.key);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                      selected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <span>
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        {option.title}
                        {option.key === "yearly" && yearlySaving > 0 && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                            Save {yearlySaving}%
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{option.billing}</span>
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums">{option.total}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                haptic("medium");
                setOpen(false);
                navigate(`/pricing?plan=${selectedPlan.key}`);
              }}
              className="mt-6 h-14 w-full rounded-full bg-primary text-[16px] font-semibold text-primary-foreground transition active:scale-[0.98]"
            >
              {STRIPE_TRIAL_ENABLED ? "Start free trial" : "Continue"}
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="mt-2 h-11 w-full text-[14px] font-medium text-muted-foreground"
            >
              Not now
            </button>
          </motion.div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default UpgradeDrawer;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X, Check, Crown, Star, CalendarClock, Users, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PAYMENT_LINK, STRIPE_PAYMENT_LINK_YEARLY, STRIPE_TRIAL_ENABLED } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const PERKS = [
  { icon: CalendarClock, label: "Unlimited bookings & clients" },
  { icon: Users, label: "Team members, stylists & payouts" },
  { icon: MapPin, label: "Map listing & discoverability" },
  { icon: Sparkles, label: "Reports, branding & no-show protection" },
];

type PlanKey = "yearly" | "monthly";

const ALL_OPTIONS: {
  key: PlanKey;
  title: string;
  price: string;
  perMonth: string;
  sub: string;
  badge?: string;
}[] = [
  {
    key: "yearly",
    title: "Yearly",
    price: "€89.90",
    perMonth: "€7.49 / month",
    sub: "billed once a year",
    badge: "Best value",
  },
  {
    key: "monthly",
    title: "Monthly",
    price: "€8.99",
    perMonth: "€8.99 / month",
    sub: "billed every month",
  },
];

const OPTIONS = ALL_OPTIONS.filter((o) => (o.key === "yearly" ? !!STRIPE_PAYMENT_LINK_YEARLY : !!STRIPE_PAYMENT_LINK));

const getRequestedPlan = (value: string | null): PlanKey | undefined => {
  const key = value === "annual" ? "yearly" : value;
  return (key === "yearly" || key === "monthly") && OPTIONS.some((option) => option.key === key)
    ? key
    : undefined;
};

const spring = { type: "spring" as const, stiffness: 320, damping: 28 };

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const requestedPlan = getRequestedPlan(searchParams.get("plan"));
  const [plan, setPlan] = useState<PlanKey>(requestedPlan ?? OPTIONS[0]?.key ?? "monthly");
  const [freeTrial, setFreeTrial] = useState(STRIPE_TRIAL_ENABLED);

  useEffect(() => {
    if (requestedPlan) setPlan(requestedPlan);
  }, [requestedPlan]);

  const active = OPTIONS.find((o) => o.key === plan) ?? OPTIONS[0];

  async function handleContinue() {
    haptic("medium");
    const { data: { user } } = await supabase.auth.getUser();
    const link = plan === "yearly" && STRIPE_PAYMENT_LINK_YEARLY
      ? STRIPE_PAYMENT_LINK_YEARLY
      : STRIPE_PAYMENT_LINK;
    const url = new URL(link);
    if (user?.email) url.searchParams.set("prefilled_email", user.email);
    if (user?.id) url.searchParams.set("client_reference_id", user.id);
    url.searchParams.set("success_url", `${window.location.origin}/pricing/success`);
    toast.info("Opening secure checkout…");
    window.location.href = url.toString();
  }

  const rise = (i: number) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring, delay: reduceMotion ? 0 : i * 0.06 },
  });

  return (
    <div className="min-h-dvh bg-[#F2F2F7] text-[#1C1C1E] dark:bg-black dark:text-white">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-5">
        <span className="text-[15px] font-bold tracking-tight">
          Cutzioo <span className="text-[#0A84FF]">PRO</span>
        </span>
        <button
          type="button"
          onClick={() => { haptic("light"); navigate(-1); }}
          className="grid h-9 w-9 place-items-center rounded-full bg-black/[0.06] text-[#8E8E93] transition hover:bg-black/10 active:scale-95 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
          aria-label="Close pricing"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-lg px-5 pb-40">
        {/* Hero — iOS app-icon squircle + headline */}
        <motion.div {...rise(0)} className="mt-8 flex flex-col items-center text-center">
          <div className="grid h-[84px] w-[84px] place-items-center rounded-[24px] bg-gradient-to-b from-[#FF5A5F] to-[#D3001B] shadow-[0_18px_40px_-10px_rgba(211,0,27,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]">
            <Crown className="h-10 w-10 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="mt-5 text-[32px] font-bold leading-[1.08] tracking-[-0.03em]">
            Your craft.<br />Without limits.
          </h1>
          <p className="mt-2.5 max-w-[300px] text-[15px] leading-relaxed text-[#8E8E93] dark:text-white/55">
            All your bookings and clients in one place. Less admin — more time behind the chair.
          </p>
        </motion.div>

        {/* Plans — iOS grouped list */}
        <motion.section {...rise(1)} className="mt-8" aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93] dark:text-white/40">
            Choose your plan
          </h2>
          <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-black/[0.05] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
              {OPTIONS.map((o) => {
                const isActive = plan === o.key;
                return (
                  <li key={o.key}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => { haptic("selection"); setPlan(o.key); }}
                      className={cn(
                        "relative flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors",
                        isActive && "bg-[#0A84FF]/[0.06] dark:bg-[#0A84FF]/10"
                      )}
                    >
                      {/* iOS radio */}
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2 transition",
                          isActive
                            ? "bg-[#0A84FF] ring-[#0A84FF]"
                            : "bg-transparent ring-black/15 dark:ring-white/20"
                        )}
                      >
                        {isActive && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className="flex-1">
                        <span className="flex items-center gap-2 text-[16px] font-semibold">
                          {o.title}
                          {o.badge && (
                            <span className="rounded-full bg-[#34C759]/15 px-2 py-0.5 text-[11px] font-bold text-[#248A3D] dark:text-[#30D158]">
                              {o.badge}
                            </span>
                          )}
                        </span>
                        <span className="block text-[13px] text-[#8E8E93] dark:text-white/45">{o.perMonth}</span>
                      </span>
                      <span className="text-right">
                        <strong className="block text-[17px] font-bold tracking-tight">{o.price}</strong>
                        <span className="block text-[11px] text-[#8E8E93] dark:text-white/40">{o.sub}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.section>

        {/* Included — iOS grouped card */}
        <motion.section {...rise(2)} className="mt-6" aria-labelledby="included-heading">
          <h2 id="included-heading" className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93] dark:text-white/40">
            Included with Pro
          </h2>
          <div className="overflow-hidden rounded-[20px] bg-white ring-1 ring-black/[0.05] dark:bg-[#1C1C1E] dark:ring-white/[0.08]">
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
              {PERKS.map((p) => (
                <li key={p.label} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0A84FF]/12 text-[#0A84FF]">
                    <p.icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="flex-1 text-[15px] font-medium">{p.label}</span>
                  <Check className="h-4 w-4 text-[#34C759]" strokeWidth={2.5} />
                </li>
              ))}
              {STRIPE_TRIAL_ENABLED && (
                <li className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158]">
                    <Star className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium" id="trial-label">7-day free trial</span>
                    <span className="block text-[12px] text-[#8E8E93] dark:text-white/45">No charge today · cancel anytime</span>
                  </span>
                  <Switch
                    aria-labelledby="trial-label"
                    checked={freeTrial}
                    onCheckedChange={setFreeTrial}
                    className="data-[state=checked]:bg-[#34C759]"
                  />
                </li>
              )}
            </ul>
          </div>
        </motion.section>

        {/* Rating */}
        <motion.p {...rise(3)} className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-[#8E8E93] dark:text-white/45">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <strong className="font-semibold text-[#1C1C1E] dark:text-white">4.8</strong>
          from barbers on Cutzioo
        </motion.p>
      </main>

      {/* Sticky frosted footer */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-black/[0.06] bg-[#F2F2F7]/80 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-black/70">
        <div className="mx-auto w-full max-w-lg px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
          <p className="pb-2 text-center text-[12px] text-[#8E8E93] dark:text-white/45" aria-live="polite">
            {active
              ? `${active.title} · ${active.price} ${freeTrial && STRIPE_TRIAL_ENABLED ? "after your free trial" : `· ${active.sub}`}`
              : "Secure payment by Stripe"}
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] text-[17px] font-semibold text-white shadow-[0_12px_28px_-8px_rgba(10,132,255,0.55)] transition active:scale-[0.98] active:bg-[#0066d6]"
          >
            Continue
          </button>
          <p className="flex items-center justify-center gap-1.5 pt-2.5 text-[11px] text-[#AEAEB2] dark:text-white/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure payment by Stripe · cancel anytime
          </p>
        </div>
      </footer>
    </div>
  );
}

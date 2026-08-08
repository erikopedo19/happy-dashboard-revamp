import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles, Crown, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PAYMENT_LINK, STRIPE_PAYMENT_LINK_YEARLY, STRIPE_TRIAL_ENABLED } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const PERKS = [
  "Unlimited bookings & clients",
  "Map listing & discovery",
  "Custom branding and themes",
  "Team members & stylists",
  "Reports, analytics & review emails",
];

type PlanKey = "yearly" | "monthly";

const ALL_OPTIONS: {
  key: PlanKey;
  title: string;
  price: string;
  perMonth: string;
  sub: string;
  badge?: string;
  reason: string;
}[] = [
  {
    key: "yearly",
    title: "Yearly",
    price: "€89.90",
    perMonth: "€7.49 / month",
    sub: "billed once a year",
    badge: "SAVE 17%",
    reason: "Best value — two months free compared to paying monthly.",
  },
  {
    key: "monthly",
    title: "Monthly",
    price: "€8.99",
    perMonth: "€8.99 / month",
    sub: "billed every month",
    reason: "Maximum flexibility — cancel whenever you want.",
  },
];

// Only offer plans that have a real Stripe checkout link behind them.
const OPTIONS = ALL_OPTIONS.filter((o) => (o.key === "yearly" ? !!STRIPE_PAYMENT_LINK_YEARLY : !!STRIPE_PAYMENT_LINK));

export default function Pricing() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanKey>(OPTIONS[0]?.key ?? "monthly");
  const [freeTrial, setFreeTrial] = useState(STRIPE_TRIAL_ENABLED);
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

  return (
    <div className="min-h-screen bg-[#08080A] text-white flex flex-col">
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 mx-auto w-full max-w-md px-6 pb-52 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="pt-6"
        >
          <div className="w-14 h-14 rounded-3xl bg-rose-500/15 flex items-center justify-center mb-6">
            <Crown className="w-7 h-7 text-rose-400" />
          </div>
          <h1 className="text-[34px] leading-[1.05] font-bold tracking-tight">
            Choose your plan
            <br />
            <span className="text-white/40">Cutzioo Pro</span>
          </h1>
        </motion.div>

        {/* Plans */}
        <div className="mt-7 space-y-3">
          {OPTIONS.map((o) => {
            const isActive = plan === o.key;
            return (
              <button
                key={o.key}
                onClick={() => { haptic("selection"); setPlan(o.key); }}
                className={cn(
                  "relative w-full rounded-[26px] p-5 text-left transition-all active:scale-[0.985]",
                  isActive
                    ? "bg-white/[0.09] ring-2 ring-rose-400/70"
                    : "bg-white/[0.035] ring-1 ring-white/10"
                )}
              >
                {o.badge && (
                  <span className="absolute -top-2 right-5 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide">
                    {o.badge}
                  </span>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold">{o.title}</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-[26px] font-bold tabular-nums leading-none">{o.price}</span>
                      <span className="text-[12px] text-white/40">{o.sub}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-white/50 tabular-nums">{o.perMonth}</div>
                  </div>
                  <span
                    className={cn(
                      "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition",
                      isActive ? "border-rose-400 bg-rose-400" : "border-white/25"
                    )}
                  >
                    {isActive && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                  </span>
                </div>
                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-2xl bg-black/30 px-3.5 py-2.5 text-[12.5px] leading-snug text-white/60"
                  >
                    {o.reason}
                  </motion.p>
                )}
              </button>
            );
          })}
        </div>

        {STRIPE_TRIAL_ENABLED && (
          <div className="mt-4 rounded-[26px] bg-white/[0.05] px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold">Start with 7 days free</div>
              <div className="text-[13px] text-white/45">No charge today, cancel any time</div>
            </div>
            <Switch
              checked={freeTrial}
              onCheckedChange={(v) => { haptic("selection"); setFreeTrial(v); }}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>
        )}

        {/* Everything included */}
        <p className="mt-8 text-[12px] uppercase tracking-wider text-white/35">Everything included</p>
        <ul className="mt-3 space-y-3">
          {PERKS.map((p, i) => (
            <motion.li
              key={p}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 260, damping: 24 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-rose-400" strokeWidth={3} />
              </div>
              <span className="text-[15px] text-white/80">{p}</span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-7 flex items-center gap-2 text-[12.5px] text-white/35">
          <ShieldCheck className="w-4 h-4" />
          Secure payment by Stripe · cancel anytime
        </div>
      </div>

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.08] bg-[#08080A]/95 backdrop-blur-xl z-50">
        <div
          className="mx-auto w-full max-w-md px-6 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
        >
          <div className="bg-gradient-to-r from-rose-500/10 to-purple-500/10 rounded-2xl p-4 mb-4 border border-white/[0.08]">
            <p className="text-center text-[13px] text-white/70 font-medium">
              {active
                ? `${active.title} · ${active.price} ${freeTrial && STRIPE_TRIAL_ENABLED ? "after your 7-day free trial" : active.sub}`
                : "Select a plan"}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="w-full h-14 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[16px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-[0_8px_24px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_32px_rgba(244,63,94,0.5)] border border-rose-400/20"
          >
            <Sparkles className="w-4 h-4" />
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

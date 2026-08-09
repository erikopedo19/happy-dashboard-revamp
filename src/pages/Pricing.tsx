import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Check, Crown, Star, CalendarClock, Users, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PAYMENT_LINK, STRIPE_PAYMENT_LINK_YEARLY, STRIPE_TRIAL_ENABLED } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

const PERKS = [
  { icon: CalendarClock, label: "Unlimited bookings & clients" },
  { icon: Users, label: "Team members, stylists & map listing" },
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
    <div className="min-h-screen bg-gradient-to-b from-rose-600 to-rose-700">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 30 }}
        className="min-h-screen mt-3 rounded-t-[32px] bg-[#0B0B0E] text-white flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8">
          <div className="flex justify-end">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center active:scale-95 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-[76px] h-[76px] rounded-[22px] bg-rose-500/15 ring-1 ring-rose-400/25 flex items-center justify-center">
              <Crown className="w-9 h-9 text-rose-400" />
            </div>
            <h1 className="mt-5 text-[27px] leading-[1.15] font-bold tracking-tight">
              All your bookings and clients
              <br />in one place
            </h1>

            <div className="mt-5 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-[26px] font-bold leading-none tabular-nums">4.8</span>
              <span className="text-[12px] text-white/40 self-end pb-0.5">from barbers on Cutzioo</span>
            </div>
          </div>

          {/* Feature list card */}
          <div className="mt-7 rounded-[22px] bg-white/[0.04] ring-1 ring-white/[0.07] divide-y divide-white/[0.06]">
            {PERKS.map((p) => (
              <div key={p.label} className="flex items-center gap-3 px-4 py-3.5">
                <p.icon className="w-[18px] h-[18px] text-white/45 shrink-0" />
                <span className="text-[14.5px] text-white/85">{p.label}</span>
              </div>
            ))}
          </div>

          {STRIPE_TRIAL_ENABLED && (
            <div className="mt-4 rounded-[22px] bg-white/[0.04] ring-1 ring-white/[0.07] px-4 py-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="text-[14.5px] font-semibold">Start with 7 days free</div>
                <div className="text-[12.5px] text-white/40">No charge today, cancel any time</div>
              </div>
              <Switch
                checked={freeTrial}
                onCheckedChange={(v) => { haptic("selection"); setFreeTrial(v); }}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          )}

          {/* Highlight offer block */}
          <div className="mt-5 rounded-[26px] bg-rose-500/[0.08] ring-1 ring-rose-400/20 p-4">
            <div className="mt-3.5 space-y-2.5">
              {OPTIONS.map((o) => {
                const isActive = plan === o.key;
                return (
                  <button
                    key={o.key}
                    onClick={() => { haptic("selection"); setPlan(o.key); }}
                    className={cn(
                      "w-full rounded-[18px] px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.985]",
                      isActive
                        ? "bg-[#141418] ring-2 ring-rose-400/70"
                        : "bg-[#111114] ring-1 ring-white/[0.06]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition",
                          isActive ? "border-rose-400 bg-rose-400" : "border-white/25"
                        )}
                      >
                        {isActive && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold flex items-center gap-2">
                          {o.title}
                          {o.badge && (
                            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                              {o.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-white/40">{o.perMonth}</div>
                      </div>
                    </div>
                    <span className="text-[17px] font-bold tabular-nums shrink-0">{o.price}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleContinue}
              className="mt-4 w-full h-[52px] rounded-full bg-rose-500 text-white text-[16px] font-semibold active:scale-[0.98] transition"
            >
              Continue
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[12.5px] text-white/35">
            <ShieldCheck className="w-4 h-4" />
            {active
              ? `${active.title} · ${active.price} ${freeTrial && STRIPE_TRIAL_ENABLED ? "after your free trial" : active.sub}`
              : "Secure payment by Stripe"}
          </div>
          <p className="mt-1 text-center text-[12px] text-white/25">Secure payment by Stripe · cancel anytime</p>
          <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }} />
        </div>
      </motion.div>
    </div>
  );
}

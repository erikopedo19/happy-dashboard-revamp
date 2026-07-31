import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles, Crown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PAYMENT_LINK } from "@/lib/billingsdk-config";
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

const OPTIONS: { key: PlanKey; title: string; price: string; sub: string; badge?: string }[] = [
  { key: "yearly", title: "Yearly Access", price: "€89.90/yr", sub: "€7.49/mo · save 17%", badge: "BEST OFFER" },
  { key: "monthly", title: "Monthly Access", price: "€8.99/mo", sub: "Cancel anytime" },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [freeTrial, setFreeTrial] = useState(true);

  async function handleContinue() {
    haptic("medium");
    const { data: { user } } = await supabase.auth.getUser();
    const url = new URL(STRIPE_PAYMENT_LINK);
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

      <div className="flex-1 mx-auto w-full max-w-md px-6 pb-10 flex flex-col">
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
            Unlock everything
            <br />
            <span className="text-white/40">in Cutzioo Pro</span>
          </h1>
        </motion.div>

        <ul className="mt-7 space-y-3.5">
          {PERKS.map((p, i) => (
            <motion.li
              key={p}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 24 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-rose-400" strokeWidth={3} />
              </div>
              <span className="text-[15px] text-white/80">{p}</span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-8 rounded-3xl bg-white/[0.05] px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold">Enable Free Trial</div>
            <div className="text-[13px] text-white/45">7 days free, then billed</div>
          </div>
          <Switch
            checked={freeTrial}
            onCheckedChange={setFreeTrial}
            className="data-[state=checked]:bg-rose-500"
          />
        </div>

        <div className="mt-4 space-y-3">
          {OPTIONS.map((o) => {
            const active = plan === o.key;
            return (
              <button
                key={o.key}
                onClick={() => { haptic("selection"); setPlan(o.key); }}
                className={cn(
                  "relative w-full rounded-3xl px-5 py-4 text-left transition-all active:scale-[0.98]",
                  active ? "bg-white/[0.08] ring-2 ring-white" : "bg-white/[0.04] ring-1 ring-white/10"
                )}
              >
                {o.badge && (
                  <span className="absolute -top-2 right-5 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wide">
                    {o.badge}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-semibold">{o.title}</div>
                    <div className="text-[13px] text-white/45">{o.sub}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-semibold tabular-nums">{o.price}</span>
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        active ? "border-white bg-white" : "border-white/25"
                      )}
                    >
                      {active && <span className="w-2 h-2 rounded-full bg-black" />}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          className="mt-6 w-full h-14 rounded-full bg-white text-black text-[16px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Sparkles className="w-4 h-4" />
          Continue
        </button>

        <p className="mt-3 text-center text-[12px] text-white/35">
          Cancel anytime · Secure payment by Stripe
        </p>
      </div>
    </div>
  );
}

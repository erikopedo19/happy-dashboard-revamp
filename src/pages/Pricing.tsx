import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X, Check, Crown, Star, CalendarClock, Users, ShieldCheck, ArrowUpRight, ArrowRight } from "lucide-react";
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

const getRequestedPlan = (value: string | null): PlanKey | undefined => {
  const key = value === "annual" ? "yearly" : value;
  return (key === "yearly" || key === "monthly") && OPTIONS.some((option) => option.key === key)
    ? key
    : undefined;
};

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

  return (
    <div className="pricing-screen">
      <motion.div
        initial={{ y: reduceMotion ? 0 : 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="pricing-shell"
      >
        <header className="pricing-header">
          <div className="pricing-wordmark">
            Cutzioo <span className="pricing-badge">PRO</span>
          </div>
          <button
            type="button"
            onClick={() => { haptic("light"); navigate(-1); }}
            className="pricing-close"
            aria-label="Close pricing"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.75} />
          </button>
        </header>

        <main className="pricing-scroll" aria-labelledby="pricing-title" tabIndex={0}>
          <div className="pricing-intro">
            <p className="pricing-eyebrow">More room to grow</p>
            <h1 id="pricing-title">Your craft.<br />Without limits.</h1>
            <p className="pricing-description">All your bookings and clients in one place.<br />A little less admin. More time behind the chair.</p>
          </div>

          <motion.div
            className="pricing-pass"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.36, delay: reduceMotion ? 0 : 0.04 }}
          >
            <div className="pricing-pass-orbit" aria-hidden="true" />
            <div className="pricing-pass-top">
              <span className="pricing-pass-icon"><Crown aria-hidden="true" size={22} strokeWidth={1.75} /></span>
              <span className="pricing-eyebrow">The Pro membership</span>
              <ArrowUpRight aria-hidden="true" size={20} strokeWidth={1.75} />
            </div>
            <div className="pricing-pass-title">Made for your<br /><span>next chapter.</span></div>
            <div className="pricing-pass-bottom">
              <span>Unlimited bookings. All yours.</span>
              <span className="pricing-pass-bars" aria-hidden="true" />
            </div>
          </motion.div>

          {/* Feature list card */}
          <section className="pricing-benefits" aria-labelledby="pricing-benefits-title">
            <h2 id="pricing-benefits-title" className="pricing-eyebrow">Included with Pro</h2>
            <ul>
              {PERKS.map((p, index) => (
                <motion.li
                  key={p.label}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: reduceMotion ? 0 : Math.min(index + 2, 10) * 0.04 }}
                >
                  <span className="pricing-benefit-icon"><p.icon aria-hidden="true" size={20} strokeWidth={1.75} /></span>
                  <span>{p.label}</span>
                  <Check className="pricing-benefit-check" aria-hidden="true" size={18} strokeWidth={1.75} />
                </motion.li>
              ))}
            </ul>
          </section>

          {STRIPE_TRIAL_ENABLED && (
            <div className="pricing-trial">
              <div>
                <label htmlFor="pricing-free-trial">Start with 7 days free</label>
                <p id="pricing-trial-description">No charge today, cancel any time</p>
              </div>
              <Switch
                id="pricing-free-trial"
                aria-describedby="pricing-trial-description"
                checked={freeTrial}
                onCheckedChange={(v) => { setFreeTrial(v); }}
                className="pricing-trial-switch data-[state=checked]:bg-rose-500"
              />
            </div>
          )}

          {/* Highlight offer block */}
          <section className="pricing-offer" aria-labelledby="pricing-plan-title">
            <div className="pricing-section-heading">
              <h2 id="pricing-plan-title" className="pricing-eyebrow">Your membership</h2>
              <span>Cancel anytime</span>
            </div>
            <div className="pricing-options" role="group" aria-labelledby="pricing-plan-title">
              {OPTIONS.map((o) => {
                const isActive = plan === o.key;
                return (
                  <button
                    type="button"
                    key={o.key}
                    aria-pressed={isActive}
                    onClick={() => { haptic("selection"); setPlan(o.key); }}
                    className={cn("pricing-plan", isActive && "pricing-plan-selected")}
                  >
                    <span className="pricing-plan-check" aria-hidden="true">
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.12 }}
                        >
                          <Check size={14} strokeWidth={1.75} />
                        </motion.span>
                      )}
                    </span>
                    <span className="pricing-plan-details">
                      <span className="pricing-plan-title">
                        {o.title}
                        {o.badge && <span className="pricing-plan-badge">{o.badge}</span>}
                      </span>
                      <span className="pricing-plan-caption">{o.perMonth}</span>
                    </span>
                    <span className="pricing-plan-price">
                      <strong>{o.price}</strong>
                      <span>{o.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="pricing-rating">
            <Star aria-hidden="true" size={15} strokeWidth={1.75} />
            <strong>4.8</strong>
            <span>from barbers on Cutzioo</span>
          </div>
        </main>

        <footer className="pricing-footer">
          <p className="pricing-billing-summary" id="pricing-billing-summary" aria-live="polite" aria-atomic="true">
            {active
              ? `${active.title} · ${active.price} ${freeTrial && STRIPE_TRIAL_ENABLED ? "after your free trial" : active.sub}`
              : "Secure payment by Stripe"}
          </p>
          <button
            type="button"
            onClick={handleContinue}
            aria-describedby="pricing-billing-summary"
            className="pricing-continue"
          >
            Continue to checkout
            <ArrowRight aria-hidden="true" size={20} strokeWidth={1.75} />
          </button>
          <p className="pricing-secure">
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.75} />
            Secure payment by Stripe · cancel anytime
          </p>
        </footer>
      </motion.div>
    </div>
  );
}

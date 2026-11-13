import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Check, CalendarClock, ChevronRight, CreditCard, ShieldCheck, Database, Building2, Palette, Users, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { AddonAdvisor } from "@/components/AddonAdvisor";

import { PlanChangeOverlay, type PlanChangeItem } from "@/components/PlanChange";
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "text-emerald-500" },
  canceling: { label: "Ending", tone: "text-amber-500" },
  expired: { label: "Expired", tone: "text-destructive" },
  none: { label: "Free", tone: "text-muted-foreground" },
};

const money = (amount?: number | null, currency = "EUR") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

const FREE_PLAN_LOSSES = [
  { icon: CalendarClock, label: "New bookings through your link are capped at 20 per month" },
  { icon: Building2, label: "Rent & Staff: see 5 listings per tab and apply to 2" },
  { icon: Palette, label: "Custom booking themes are Pro-only; free saves use the default" },
  { icon: Users, label: "The Teams page is Pro-only" },
  { icon: BarChart3, label: "Reports & Analytics are Pro-only" },
  { icon: Globe, label: "Website tools are Pro-only" },
];

const DOWNGRADE_ITEMS: PlanChangeItem[] = [
  { name: "Bookings through your link", after: "20 / month" },
  { name: "Teams page", after: "Gone" },
  { name: "Reports & Analytics", after: "Gone" },
  { name: "Website tools", after: "Gone" },
  { name: "Custom booking themes", after: "Default" },
];

type ManageAction = "cancel" | "resume";
type ManageResult =
  | { kind: "fallback" }
  | { kind: "error" }
  | { kind: "success"; subscriptionEnd: string | null; emailPending: boolean };

async function manageSubscription(action: ManageAction): Promise<ManageResult> {
  const { data, error } = await supabase.functions.invoke("manage-subscription", {
    body: { action },
  });
  let errorCode = typeof data?.error === "string" ? data.error : undefined;

  if (!errorCode && error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null);
      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
      ) {
        errorCode = payload.error;
      }
    }
  }

  if (errorCode === "no_stripe_subscription") return { kind: "fallback" };
  if (error || errorCode || data?.ok !== true) return { kind: "error" };
  return { kind: "success", subscriptionEnd: data.subscription_end ?? null, emailPending: data.email_pending === true };
}

export function SubscriptionPanel({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const navigate = useNavigate();
  // MobileSettings embeds this inside an always-dark (#0A0A0C) surface that
  // does not flip with the theme, so theme tokens would turn invisible in
  // light mode. Use explicit dark-appropriate colors there.
  const isMobile = variant === "mobile";
  const titleColor = isMobile ? "text-white" : "text-foreground";
  const labelColor = isMobile ? "text-white/50" : "text-muted-foreground";
  const { loading, error, data, status, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noRecurringPlan, setNoRecurringPlan] = useState(false);
  const [planAnim, setPlanAnim] = useState<{ mode: "downgrade" | "kept"; end: string | null } | null>(null);

  const shell = "rounded-2xl border border-border bg-card p-5";

  if (loading) {
    return (
      <div className={shell}>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your subscription…
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-1/2 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-1/3 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
           <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[15px] font-semibold">Couldn't load your plan</p>
            <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
            <Button onClick={() => refresh()} variant="outline" className="mt-3 rounded-full h-9">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPro = status === "active" || status === "canceling";
  // Pro granted by Cutzioo (gift, promo or admin) has no Stripe subscription,
  // so there is nothing to renew, cancel or pay for.
  const isComplimentary = isPro && (noRecurringPlan || data?.has_recurring_subscription === false || !data?.stripe_subscription_id);
  const s = STATUS_LABEL[isComplimentary ? "active" : status];
  const paymentIssue = !isComplimentary && (data?.billing_status === "past_due" || data?.billing_status === "unpaid");
  const recurringActive = isPro && !isComplimentary && status === "active";
  const headline = paymentIssue
    ? "Your last payment failed. Update your card to avoid losing Pro."
    : isComplimentary
      ? "Pro was added to your account without a recurring payment."
      : status === "canceling"
        ? `Pro ends on ${fmt(data?.subscription_end)}. You will not be charged again.`
        : recurringActive
          ? `Renews automatically on ${fmt(data?.subscription_end)}.`
          : status === "expired"
            ? "Your Pro access has ended. Renew anytime to unlock Pro again."
            : "Upgrade for unlimited bookings, teams, reports and your website.";

  async function setAutoRenew(enabled: boolean, fromOverlay = false): Promise<boolean> {
    haptic("selection");
    setBusy(true);
    try {
      const result = await manageSubscription(enabled ? "resume" : "cancel");
      if (result.kind === "error") {
        toast.error("Couldn't update auto-renewal. Please try again.");
        return false;
      }
      if (result.kind === "fallback") {
        setNoRecurringPlan(true);
        setConfirmOpen(false);
        return false;
      }
      if (!fromOverlay) {
        setPlanAnim({ mode: enabled ? "kept" : "downgrade", end: result.subscriptionEnd ?? data?.subscription_end ?? null });
      }
      if (result.emailPending) toast.info("Your membership was updated; the confirmation email is pending.");
      await refresh();
      window.dispatchEvent(new Event("premium:refresh"));
      return true;
    } catch {
      toast.error("Couldn't update auto-renewal. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    setBusy(true);
    try {
      const result = await manageSubscription("cancel");
      if (result.kind === "error") {
        toast.error("Couldn't cancel your subscription. Please try again.");
        return;
      }
      if (result.kind === "fallback") {
        setNoRecurringPlan(true);
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      const subscriptionEnd = result.kind === "success"
        ? result.subscriptionEnd ?? data?.subscription_end
        : data?.subscription_end;
      setPlanAnim({ mode: "downgrade", end: subscriptionEnd ?? null });
      if (result.emailPending) toast.info("Cancellation is confirmed; the confirmation email is pending.");
      await refresh();
      window.dispatchEvent(new Event("premium:refresh"));
    } catch {
      toast.error("Couldn't cancel your subscription. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const openBilling = async () => {
    haptic("light");
    setBusy(true);
    try {
      const { data: portal, error: portalError } = await supabase.functions.invoke("manage-subscription", { body: { action: "portal" } });
      if (!portalError && portal?.url) {
        window.location.assign(portal.url);
        return;
      }
      let code = portal?.error as string | undefined;
      if (portalError && "context" in portalError) {
        try { code = (await (portalError as { context: Response }).context.json())?.error ?? code; } catch { /* ignore */ }
      }
      if (code === "no_stripe_subscription" || code === "no_customer") {
        setNoRecurringPlan(true);
        return;
      }
      if (STRIPE_PORTAL_LINK) window.location.assign(STRIPE_PORTAL_LINK);
      else toast.error("Stripe billing management is not available yet. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`space-y-7 ${titleColor}`} aria-labelledby="subscription-title">
      <div className="px-1">
        <p className={`text-[12px] font-semibold uppercase ${labelColor}`}>Manage</p>
        <h2 id="subscription-title" className="mt-1 text-[30px] font-bold leading-tight">Subscription</h2>
      </div>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="mb-5 grid w-full grid-cols-3">
          <TabsTrigger value="plan">My plan</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="advisor">Add-ons</TabsTrigger>
        </TabsList>
        <TabsContent value="advisor"><AddonAdvisor /></TabsContent>
        <TabsContent value="terms">
          <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            {[
              ["Renewal", "Paid plans renew automatically at the shown price until you cancel."],
              ["Cancellation", "Cancel anytime. You keep Pro until the paid period ends and are not charged again."],
              ["Refunds", "Partly used periods are not refunded unless the law requires it. Duplicate or mistaken charges are refunded."],
            ].map(([label, text]) => (
              <div key={label} className="border-b border-border px-4 py-3.5 last:border-b-0">
                <p className="text-[15px] font-semibold">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <Button variant="ghost" onClick={() => navigate("/terms#subscriptions")} className="mt-3 w-full justify-between rounded-2xl px-4 text-primary">
            Read full subscription terms <ChevronRight className="h-4 w-4" />
          </Button>
        </TabsContent>
        <TabsContent value="plan" className="space-y-5">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-muted-foreground">Current plan</p>
                  <p className="mt-1 truncate text-[28px] font-bold leading-tight">{isPro ? data?.subscription_tier || "Cutzioo Pro" : "Free"}</p>
                </div>
                <span className={`rounded-full bg-muted px-3 py-1 text-[13px] font-semibold ${paymentIssue ? "text-destructive" : s.tone}`}>{paymentIssue ? "Payment issue" : s.label}</span>
              </div>
              <p className="mt-3 text-[14px] leading-5 text-muted-foreground">{headline}</p>
            </div>
            {[
              [isPro ? "Price" : "Bookings included", isComplimentary ? "No recurring payment" : isPro ? money(data?.renewal_amount, data?.renewal_currency) : "20 / month"],
              [status === "canceling" || isComplimentary ? "Pro access until" : "Next renewal", isPro ? fmt(data?.subscription_end) : "—"],
              ["Automatic renewal", recurringActive ? "On" : "Off"],
            ].map(([label, value]) => (
              <div key={label} className="flex min-h-14 items-center justify-between gap-4 border-t border-border px-5 py-3">
                <span className="text-[15px]">{label}</span>
                <span className="text-right text-[15px] tabular-nums text-muted-foreground">{value}</span>
              </div>
            ))}
            <div className="space-y-2 border-t border-border p-4">
              {paymentIssue ? (
                <Button disabled={busy} onClick={openBilling} className="h-12 w-full rounded-2xl text-[15px]"><CreditCard />Update payment method</Button>
              ) : status === "canceling" && !isComplimentary ? (
                <Button disabled={busy} onClick={() => setAutoRenew(true)} className="h-12 w-full rounded-2xl text-[15px]">{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Turn renewal back on</Button>
              ) : recurringActive ? (
                <Button disabled={busy} variant="outline" onClick={() => { haptic("warning"); setConfirmOpen(true); }} className="h-12 w-full rounded-2xl text-[15px] text-destructive">Cancel subscription</Button>
              ) : (
                <Button onClick={() => navigate("/pricing")} className="h-12 w-full rounded-2xl text-[15px]"><ShieldCheck />{isComplimentary ? "Subscribe to keep Pro" : status === "expired" ? "Renew Cutzioo Pro" : "Upgrade to Pro"}</Button>
              )}
              {isPro && !isComplimentary && !paymentIssue && (
                <Button variant="ghost" disabled={busy} onClick={openBilling} className="h-11 w-full justify-between rounded-2xl px-3 text-[15px] font-normal text-primary">
                  <span className="flex items-center gap-2"><CreditCard />Payment methods & invoices</span><ChevronRight className="text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          <p className={`px-4 text-[12px] leading-5 ${labelColor}`}>Payments are processed securely by Stripe. Your data is kept if you move to Free.</p>
        </TabsContent>
      </Tabs>

      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent className="z-[90] mx-auto max-h-[92dvh] w-full max-w-xl overflow-hidden border-white/[0.08] bg-white text-[#1C1C1E] shadow-none dark:bg-[#1C1C1E] dark:text-white">
          <div className="mx-auto w-full max-w-xl overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 md:px-8">
            <div className="mb-4 text-center">
              <DrawerTitle className="text-[22px] font-bold tracking-tight">Cancel Cutzioo Pro?</DrawerTitle>
              <DrawerDescription className="mt-1.5 text-[13px]">
                Your Pro access continues until the end of your current billing period.
              </DrawerDescription>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.025] dark:border-white/[0.07] dark:bg-white/[0.04]">
              {[
                { icon: CalendarClock, text: `Pro stays active until ${fmt(data?.subscription_end)}` },
                { icon: ShieldCheck, text: "You won't be charged again" },
                { icon: Database, text: "Your data is kept. Renew anytime to get everything back." },
                { icon: ShieldCheck, text: "Cancel anytime, no fees" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 border-b border-black/[0.06] px-3.5 py-3 last:border-b-0 dark:border-white/[0.06]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#FF2D46]/15 text-[#FF2D46]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] leading-snug text-[#1C1C1E]/85 dark:text-white/85">{text}</span>
                </div>
              ))}
            </div>

            <section className="mt-5">
              <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8E8E93] dark:text-white/45">
                What you'll lose
              </h3>
              <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.025] dark:border-white/[0.07] dark:bg-white/[0.04]">
                {FREE_PLAN_LOSSES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 border-b border-black/[0.06] px-3.5 py-2.5 last:border-b-0 dark:border-white/[0.06]">
                    <Icon className="h-4 w-4 shrink-0 text-[#FF2D46]" />
                    <span className="text-[13px] leading-snug text-[#1C1C1E]/85 dark:text-white/85">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-5 space-y-1.5">
              <Button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-12 w-full rounded-2xl bg-[#FF2D46] text-[15px] font-semibold text-white shadow-none hover:bg-[#E0152F]"
              >
                Keep Pro
              </Button>
              <button
                type="button"
                onClick={cancelSubscription}
                disabled={busy}
                className="flex h-10 w-full items-center justify-center gap-2 text-[14px] font-medium text-[#FF2D46] transition hover:text-[#E0152F] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel subscription
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <PlanChangeOverlay
        mode={planAnim?.mode ?? null}
        endLabel={fmt(planAnim?.end)}
        items={DOWNGRADE_ITEMS}
        onKeep={() => setAutoRenew(true, true)}
        onClose={() => setPlanAnim(null)}
      />
    </section>
  );
}

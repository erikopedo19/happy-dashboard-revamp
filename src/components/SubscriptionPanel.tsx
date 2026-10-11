import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Check, CalendarClock, ChevronRight, CreditCard, ShieldCheck, Database, Building2, Palette, Users, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { AddonAdvisor } from "@/components/AddonAdvisor";

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

type ManageAction = "cancel" | "resume";
type ManageResult =
  | { kind: "fallback" }
  | { kind: "error" }
  | { kind: "success"; subscriptionEnd: string | null };

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
  return { kind: "success", subscriptionEnd: data.subscription_end ?? null };
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
  const s = STATUS_LABEL[status];

  const summary = (
    <div className="space-y-6">
      <div>
        <p className={`mb-2 px-4 text-[12px] font-medium uppercase ${labelColor}`}>At a glance</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
          {[
            ["Plan", isPro ? data?.subscription_tier || "Cutzioo Pro" : "Free plan"],
            ["Status", s.label],
            ["Started", fmt(data?.subscription_start)],
            [status === "canceling" ? "Access ends" : "Next renewal", isPro ? fmt(data?.subscription_end) : "—"],
            ["Amount", isPro ? money(data?.renewal_amount, data?.renewal_currency) : "—"],
            ["Auto-renew", isPro ? (data?.auto_renew && !data?.cancel_at_period_end ? "On" : "Off") : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
              <span className="text-[15px]">{label}</span>
              <span className="min-w-0 text-right text-[15px] text-muted-foreground tabular-nums break-words">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <p className={`px-4 text-[12px] leading-5 ${labelColor}`}>
        {status === "canceling" ? "Your plan remains available until the access end date." : isPro ? "Your subscription details update when a billing change is confirmed." : "Upgrade to Pro for unlimited bookings and your website."}
      </p>
    </div>
  );

  async function setAutoRenew(enabled: boolean) {
    haptic("selection");
    setBusy(true);
    try {
      const result = await manageSubscription(enabled ? "resume" : "cancel");
      if (result.kind === "error") {
        toast.error("Couldn't update auto-renewal. Please try again.");
        return;
      }
      if (result.kind === "fallback") {
        const { error: rpcError } = await supabase.rpc("set_subscription_auto_renew", { _enabled: enabled });
        if (rpcError) {
          toast.error("Couldn't update auto-renewal. Please try again.");
          return;
        }
      }
      toast.success(enabled ? "Auto-renewal turned on" : "Auto-renewal turned off");
      await refresh();
    } catch {
      toast.error("Couldn't update auto-renewal. Please try again.");
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
        const { error: rpcError } = await supabase.rpc("cancel_subscription_at_period_end");
        if (rpcError) {
          toast.error("Couldn't cancel your subscription. Please try again.");
          return;
        }
      }
      setConfirmOpen(false);
      const subscriptionEnd = result.kind === "success"
        ? result.subscriptionEnd ?? data?.subscription_end
        : data?.subscription_end;
      toast.success(`Pro cancelled. You keep it until ${fmt(subscriptionEnd)}.`);
      await refresh();
    } catch {
      toast.error("Couldn't cancel your subscription. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const openBilling = () => {
    haptic("light");
    if (STRIPE_PORTAL_LINK) {
      window.open(STRIPE_PORTAL_LINK, "_blank", "noopener,noreferrer");
      return;
    }
    navigate("/pricing");
  };

  return (
    <section className={`space-y-7 ${titleColor}`} aria-labelledby="subscription-title">
      <div className="px-1">
        <p className={`text-[12px] font-semibold uppercase ${labelColor}`}>Manage</p>
        <h2 id="subscription-title" className="mt-1 text-[30px] font-bold leading-tight">Subscription</h2>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="mb-5 grid w-full grid-cols-3">
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="advisor">Add-ons</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">{summary}</TabsContent>
        <TabsContent value="advisor"><AddonAdvisor /></TabsContent>
        <TabsContent value="manage" className="space-y-7">
      <div>
        <p className={`mb-2 px-4 text-[12px] font-medium uppercase ${labelColor}`}>Your plan</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-3">
            <span className="text-[16px]">Current plan</span>
            <span className="max-w-[55%] truncate text-right text-[16px] text-muted-foreground">
              {isPro ? data?.subscription_tier || "Cutzioo Pro" : "Free plan"}
            </span>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-3">
            <span className="text-[16px]">Status</span>
            <span className={`text-[16px] font-semibold ${s.tone}`}>{s.label}</span>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
            <span className="text-[16px]">{isPro ? "Renewal amount" : "Bookings included"}</span>
            <span className="text-right text-[16px] tabular-nums text-muted-foreground">
              {isPro ? money(data?.renewal_amount, data?.renewal_currency) : "20 / month"}
            </span>
          </div>
        </div>
      </div>

      {isPro ? (
        <>
          <div>
            <p className={`mb-2 px-4 text-[12px] font-medium uppercase ${labelColor}`}>Billing</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[16px]">Auto-renew</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {data?.auto_renew && !data?.cancel_at_period_end ? "Renews automatically" : "Will not renew"}
                  </p>
                </div>
                <Switch
                  disabled={busy}
                  checked={!!data?.auto_renew && !data?.cancel_at_period_end}
                  onCheckedChange={setAutoRenew}
                  className="data-[state=checked]:bg-primary"
                  aria-label="Auto-renew subscription"
                />
              </div>
              <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 py-3">
                <span className="flex items-center gap-2 text-[16px]"><CalendarClock className="h-4 w-4 text-muted-foreground" />{status === "canceling" ? "Access ends" : "Renewal date"}</span>
                <span className="text-right text-[16px] text-muted-foreground">{fmt(data?.subscription_end)}</span>
              </div>
              <Button variant="ghost" onClick={openBilling} className="h-14 w-full justify-between rounded-none border-0 px-4 text-[16px] font-normal text-primary shadow-none">
                <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Manage payment methods</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <p className={`mt-2 px-4 text-[12px] leading-5 ${labelColor}`}>Billing changes are handled securely through Stripe.</p>
          </div>

          {(status === "active" || status === "canceling") && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
              {status === "canceling" ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => setAutoRenew(true)}
                  className="h-14 w-full rounded-none border-0 bg-[#FF2D46] text-[16px] font-semibold text-white shadow-none hover:bg-[#E0152F]"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resume Pro
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => { haptic("warning"); setConfirmOpen(true); }} className="h-14 w-full rounded-none border-0 text-[16px] font-normal text-destructive shadow-none hover:text-destructive">
                  Cancel subscription
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <p className={`mb-2 px-4 text-[12px] font-medium uppercase ${labelColor}`}>Cutzioo Pro</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            {["Unlimited bookings", "Team members and stylists", "Reports, analytics and your website"].map((feature) => (
              <div key={feature} className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary"><Check className="h-4 w-4" /></span>
                <span className="text-[15px]">{feature}</span>
              </div>
            ))}
            <Button onClick={() => navigate("/pricing")} className="h-14 w-full rounded-none border-0 bg-primary px-4 text-[16px] text-primary-foreground shadow-none hover:bg-primary/90">
              <ShieldCheck className="h-4 w-4" />{status === "expired" ? "Renew Cutzioo Pro" : "Upgrade to Pro"}
            </Button>
          </div>
        </div>
      )}

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
    </section>
  );
}

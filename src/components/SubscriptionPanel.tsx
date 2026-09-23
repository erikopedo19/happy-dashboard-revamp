import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Check, CalendarClock, ChevronRight, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { STRIPE_PORTAL_LINK } from "@/lib/billingsdk-config";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

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

export function SubscriptionPanel() {
  const navigate = useNavigate();
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

  async function setAutoRenew(enabled: boolean) {
    haptic("selection");
    setBusy(true);
    const { error: e } = await supabase.rpc("set_subscription_auto_renew", { _enabled: enabled });
    setBusy(false);
    if (e) return toast.error("Couldn't update auto-renewal. Please try again.");
    toast.success(enabled ? "Auto-renewal turned on" : "Auto-renewal turned off");
    await refresh();
  }

  async function cancelSubscription() {
    setBusy(true);
    const { error: e } = await supabase.rpc("cancel_subscription_at_period_end");
    setBusy(false);
    setConfirmOpen(false);
    if (e) return toast.error("Couldn't cancel your subscription. Please try again.");
    toast.success("Subscription set to cancel at the end of the period");
    await refresh();
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
    <section className="space-y-7 text-foreground" aria-labelledby="subscription-title">
      <div className="px-1">
        <p className="text-[12px] font-semibold uppercase text-muted-foreground">Manage</p>
        <h2 id="subscription-title" className="mt-1 text-[30px] font-bold leading-tight">Subscription</h2>
      </div>

      <div>
        <p className="mb-2 px-4 text-[12px] font-medium uppercase text-muted-foreground">Your plan</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
            <p className="mb-2 px-4 text-[12px] font-medium uppercase text-muted-foreground">Billing</p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
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
            <p className="mt-2 px-4 text-[12px] leading-5 text-muted-foreground">Billing changes are handled securely through Stripe.</p>
          </div>

          {status === "active" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="h-14 w-full rounded-none border-0 text-[16px] font-normal text-destructive shadow-none hover:text-destructive">
                Cancel subscription
              </Button>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="mb-2 px-4 text-[12px] font-medium uppercase text-muted-foreground">Cutzioo Pro</p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep full access until {fmt(data?.subscription_end)}. After that your account moves back to the free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cancelSubscription(); }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

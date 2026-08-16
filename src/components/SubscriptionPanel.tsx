import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Loader2, AlertCircle, RefreshCw, Check, CalendarClock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  active: { label: "Active", tone: "bg-emerald-500/15 text-emerald-500" },
  canceling: { label: "Cancels at period end", tone: "bg-amber-500/15 text-amber-500" },
  expired: { label: "Expired", tone: "bg-red-500/15 text-red-500" },
  none: { label: "Free plan", tone: "bg-muted text-muted-foreground" },
};

export function SubscriptionPanel() {
  const navigate = useNavigate();
  const { loading, error, data, status, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const shell =
    "rounded-3xl border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] p-5";

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
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
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

  return (
    <div className="rounded-3xl border border-[#E5E5EA] dark:border-[#2C2C2E] bg-gradient-to-b from-white to-[#FAFAFC] dark:from-[#1C1C1E] dark:to-[#141416] overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-rose-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] font-semibold">{isPro ? data?.subscription_tier || "Cutzioo Pro" : "Free plan"}</p>
              <Badge className={`rounded-full text-[11px] border-0 ${s.tone}`}>{s.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status === "canceling"
                ? `Access ends ${fmt(data?.subscription_end)}`
                : status === "active"
                ? `Renews ${fmt(data?.subscription_end)}`
                : status === "expired"
                ? `Expired on ${fmt(data?.subscription_end)}`
                : "Upgrade to unlock everything in Cutzioo"}
            </p>
          </div>
        </div>
      </div>

      {isPro && (
        <>
          {/* Timeline */}
          <div className="px-5 pb-1">
            <div className="rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="flex-1 h-[3px] rounded-full bg-gradient-to-r from-rose-500 to-rose-500/30" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                <div className="flex-1 h-[3px] rounded-full bg-muted-foreground/20" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>Started<br /><span className="text-foreground font-medium">{fmt(data?.subscription_start)}</span></span>
                <span className="text-center">Current period</span>
                <span className="text-right">
                  {status === "canceling" ? "Ends" : "Renews"}
                  <br />
                  <span className="text-foreground font-medium">{fmt(data?.subscription_end)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 pt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Auto-renewal</p>
                <p className="text-xs text-muted-foreground">
                  {data?.auto_renew && !data?.cancel_at_period_end ? "Your plan renews automatically" : "Your plan will not renew"}
                </p>
              </div>
              <Switch
                disabled={busy}
                checked={!!data?.auto_renew && !data?.cancel_at_period_end}
                onCheckedChange={setAutoRenew}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Renewal amount</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {data?.renewal_amount != null
                  ? `${data.renewal_currency === "EUR" ? "€" : ""}${Number(data.renewal_amount).toFixed(2)}`
                  : "—"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="rounded-full h-11 flex-1"
                onClick={() =>
                  STRIPE_PORTAL_LINK
                    ? window.open(STRIPE_PORTAL_LINK, "_blank", "noopener,noreferrer")
                    : navigate("/pricing")
                }
              >
                Manage subscription
              </Button>
              {status === "active" && (
                <Button
                  variant="ghost"
                  className="rounded-full h-11 flex-1 text-red-500 hover:text-red-600"
                  onClick={() => setConfirmOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel plan
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {!isPro && (
        <div className="p-5 pt-0">
          <ul className="space-y-2 mb-4">
            {["Unlimited bookings", "Team members & stylists", "Reports & analytics"].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-rose-500" /> {f}
              </li>
            ))}
          </ul>
          <Button onClick={() => navigate("/pricing")} className="w-full rounded-full h-11 bg-rose-500 hover:bg-rose-600 text-white">
            {status === "expired" ? "Renew Cutzioo Pro" : "Upgrade to Pro"}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll keep full access until {fmt(data?.subscription_end)}. After that your account moves back to the free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); cancelSubscription(); }}
              disabled={busy}
              className="rounded-full bg-red-500 hover:bg-red-600"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

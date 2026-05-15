import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { PricingTableOne } from "@/components/billingsdk/pricing-table-one";
import { plans, STRIPE_PAYMENT_LINK } from "@/lib/billingsdk-config";

interface SubState {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

export function SubscriptionCard() {
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [sub, setSub] = useState<SubState>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
  });

  async function refresh() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSub(data as SubState);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      toast.success("Welcome to Pro! Refreshing your status…");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(refresh, 1500);
    }
  }, []);

  async function handlePlanSelect(planId: string) {
    if (planId === "free") return;
    if (planId !== "pro") return;
    setActing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const url = new URL(STRIPE_PAYMENT_LINK);
      if (user?.email) url.searchParams.set("prefilled_email", user.email);
      if (user?.id) url.searchParams.set("client_reference_id", user.id);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      toast.info("Opening secure Stripe checkout…");
    } finally {
      setActing(false);
    }
  }

  async function openPortal() {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open billing portal");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking subscription…
        </CardContent>
      </Card>
    );
  }

  if (sub.subscribed) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-rose-500" />
                Cutzio Pro
              </CardTitle>
              <CardDescription>
                Active until{" "}
                {sub.subscription_end
                  ? new Date(sub.subscription_end).toLocaleDateString()
                  : "—"}
                . Manage or cancel renewal anytime from the Stripe portal.
              </CardDescription>
            </div>
            <Badge>{sub.subscription_tier ?? "Pro"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={openPortal} disabled={acting}>
            {acting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Manage subscription
          </Button>
          <Button variant="outline" onClick={refresh} disabled={acting}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <PricingTableOne
          plans={plans}
          title="Upgrade your plan"
          description="Unlock map discovery, unlimited bookings, and team tools."
          onPlanSelect={handlePlanSelect}
          size="small"
          theme="minimal"
          className="w-full"
        />
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={acting}>
            <RefreshCw className="h-4 w-4" /> I've already paid — refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

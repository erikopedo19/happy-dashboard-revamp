import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Loader2, ExternalLink } from "lucide-react";

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
      toast.success("Subscription activated!");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(refresh, 1500);
    } else if (params.get("canceled") === "true") {
      toast.info("Checkout canceled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function startCheckout() {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start checkout");
    } finally {
      setActing(false);
    }
  }

  async function openPortal() {
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to open portal");
    } finally {
      setActing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>
              Cutzio Pro — $19/month. Cancel anytime.
            </CardDescription>
          </div>
          {sub.subscribed && <Badge>{sub.subscription_tier ?? "Pro"}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking status…
          </div>
        ) : sub.subscribed ? (
          <>
            <p className="text-sm text-muted-foreground">
              Active until{" "}
              {sub.subscription_end
                ? new Date(sub.subscription_end).toLocaleDateString()
                : "—"}
              . Manage or cancel from the customer portal.
            </p>
            <div className="flex gap-2">
              <Button onClick={openPortal} disabled={acting}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                Manage subscription
              </Button>
              <Button variant="outline" onClick={refresh} disabled={acting}>
                Refresh
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              You're on the free plan. Upgrade to unlock Pro features.
            </p>
            <Button onClick={startCheckout} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4 mr-1" />}
              Subscribe — $19/month
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

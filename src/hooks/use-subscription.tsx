import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubStatus = "active" | "canceling" | "expired" | "none";

export interface SubscriptionRow {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  subscription_start: string | null;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
  renewal_amount: number | null;
  renewal_currency: string;
}

export interface SubscriptionState {
  loading: boolean;
  error: string | null;
  data: SubscriptionRow | null;
  status: SubStatus;
  isPremium: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionRow | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: row, error: err } = await supabase
      .from("subscribers")
      .select(
        "subscribed, subscription_tier, subscription_end, subscription_start, auto_renew, cancel_at_period_end, renewal_amount, renewal_currency"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (err) {
      setError("We couldn't load your subscription right now.");
      setData(null);
    } else {
      setData((row as unknown as SubscriptionRow) ?? null);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("premium:refresh", onRefresh);
    return () => window.removeEventListener("premium:refresh", onRefresh);
  }, [load]);

  const end = data?.subscription_end ? new Date(data.subscription_end) : null;
  const notExpired = !end || end > new Date();

  let status: SubStatus = "none";
  if (data) {
    if (data.subscribed && notExpired) status = data.cancel_at_period_end || !data.auto_renew ? "canceling" : "active";
    else status = "expired";
  }

  return {
    loading,
    error,
    data,
    status,
    isPremium: status === "active" || status === "canceling",
    refresh: load,
  };
}

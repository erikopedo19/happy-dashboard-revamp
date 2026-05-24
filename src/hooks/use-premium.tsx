import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PremiumState {
  loading: boolean;
  isPremium: boolean;
  tier: string | null;
  endDate: string | null;
  refresh: () => Promise<void>;
}

const LIMITS = {
  freeServices: 5,
  freeCustomers: 50,
  freeBookingsPerMonth: 20,
};

export function usePremium(): PremiumState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const load = async () => {
    if (!user) {
      setLoading(false);
      setIsPremium(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const active = !!data?.subscribed &&
        (!data?.subscription_end || new Date(data.subscription_end) > new Date());
      setIsPremium(active);
      setTier(data?.subscription_tier ?? null);
      setEndDate(data?.subscription_end ?? null);
    } catch {
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const onFocus = () => load();
    const onRefresh = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("premium:refresh", onRefresh);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("premium:refresh", onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { loading, isPremium, tier, endDate, refresh: load };
}

export const PREMIUM_LIMITS = LIMITS;

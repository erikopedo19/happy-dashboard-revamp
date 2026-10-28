import { useQuery } from "@tanstack/react-query";
import { addMonths, format, startOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePremium, PREMIUM_LIMITS } from "@/hooks/use-premium";

export interface BookingLimitState {
  loading: boolean;
  isPremium: boolean;
  /** Non-cancelled bookings in the current calendar month. */
  used: number;
  limit: number;
  /** At or over the free plan limit — new bookings should be gated. */
  atLimit: boolean;
  /** Within 5 of the limit — show the warning state. */
  nearLimit: boolean;
}

export function useBookingLimit(): BookingLimitState {
  const { user } = useAuth();
  const { loading: premiumLoading, isPremium } = usePremium();
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const nextMonthStart = format(startOfMonth(addMonths(new Date(), 1)), "yyyy-MM-dd");

  const { data: used = 0, isLoading } = useQuery({
    queryKey: ["bookings-this-month", user?.id, monthStart],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await (supabase as any)
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("appointment_date", monthStart)
        .neq("status", "cancelled");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const limit = PREMIUM_LIMITS.freeBookingsPerMonth;
  return {
    loading: premiumLoading || isLoading,
    isPremium,
    used,
    limit,
    atLimit: !isPremium && used >= limit,
    nearLimit: !isPremium && used >= limit - 5 && used < limit,
  };
}

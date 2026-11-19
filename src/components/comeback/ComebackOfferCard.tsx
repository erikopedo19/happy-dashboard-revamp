import { useQuery } from "@tanstack/react-query";
import { ComebackCoupon } from "@/components/comeback/ComebackCoupon";
import { fetchProgressByToken, fetchPublicOffer } from "@/lib/comeback";

/**
 * A shop's comeback coupon, shown to a client. A booking `token` shows that client's stamps once that
 * visit is completed; otherwise the empty card for `businessId`. Renders nothing when the shop has no live coupon.
 */
export function ComebackOfferCard({ businessId, token, shopName, className }: {
  businessId?: string | null; token?: string | null; shopName?: string | null; className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["comeback-offer", token ?? null, businessId ?? null],
    enabled: !!(token || businessId),
    staleTime: 60_000,
    queryFn: async () =>
      (token ? await fetchProgressByToken(token) : null) ?? (businessId ? await fetchPublicOffer({ businessId }) : null),
  });
  if (!data) return null;
  const completed = "completed" in data ? data.completed : undefined;
  return <ComebackCoupon offer={data} shopName={shopName} completed={completed} className={className} />;
}

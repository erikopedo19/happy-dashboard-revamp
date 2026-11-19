import { useQuery } from "@tanstack/react-query";
import { ComebackCoupon } from "@/components/comeback/ComebackCoupon";
import { fetchProgressByToken, fetchPublicOffer } from "@/lib/comeback";

/**
 * A shop's comeback coupon, shown to a client. With a booking `token` it shows that client's stamps;
 * with only a `businessId` it shows the empty card. Renders nothing when the shop has no live coupon.
 */
export function ComebackOfferCard({ businessId, token, shopName, className }: {
  businessId?: string | null; token?: string | null; shopName?: string | null; className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["comeback-offer", token ?? null, businessId ?? null],
    enabled: !!(token || businessId),
    staleTime: 60_000,
    queryFn: async () => (token ? fetchProgressByToken(token) : fetchPublicOffer({ businessId: businessId! })),
  });
  if (!data) return null;
  const completed = "completed" in data ? data.completed : undefined;
  return <ComebackCoupon offer={data} shopName={shopName} completed={completed} className={className} />;
}

export type SubscriptionAction = "cancel" | "resume";

export interface StripeSubscriptionSummary {
  id: string;
  status: string;
  created?: number;
  current_period_end?: number | null;
}

const MANAGEABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function form(obj: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) params.append(key, String(value));
  }
  return params;
}

export function subscriptionListPath(customerId: string) {
  const query = new URLSearchParams({
    customer: customerId,
    status: "all",
    limit: "10",
  });
  return `/subscriptions?${query.toString()}`;
}

export function customerSearchPath(email: string) {
  const query = new URLSearchParams({ email, limit: "10" });
  return `/customers?${query.toString()}`;
}

export function newestEligibleSubscription(
  subscriptions: StripeSubscriptionSummary[],
) {
  return [...subscriptions]
    .filter((subscription) => MANAGEABLE_STATUSES.has(subscription.status))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0] ?? null;
}

export function subscriptionUpdateForm(action: SubscriptionAction) {
  return form({ cancel_at_period_end: action === "cancel" });
}

export function periodEndIso(epochSeconds?: number | null) {
  return epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null;
}

export function subscriptionStatus(row: { subscribed: boolean; subscription_end: string | null; stripe_subscription_id: string | null; has_recurring_subscription?: boolean; auto_renew: boolean; cancel_at_period_end: boolean } | null, now = Date.now()): "active" | "canceling" | "expired" | "none" {
  if (!row) return "none";
  if (!row.subscribed || (row.subscription_end && Date.parse(row.subscription_end) <= now)) return "expired";
  if (!row.stripe_subscription_id || row.has_recurring_subscription === false) return "active";
  return row.cancel_at_period_end || !row.auto_renew ? "canceling" : "active";
}
export type BillingSubscription = {
  id: string; customer: string | { id: string }; status: string; created?: number;
  cancel_at_period_end?: boolean; canceled_at?: number | null;
  current_period_start?: number; current_period_end?: number;
  items?: { data?: Array<{ current_period_start?: number; current_period_end?: number; quantity?: number; price?: { unit_amount?: number; currency?: string } }> };
};
export function epochIso(value?: number | null) {
  return value && Number.isFinite(value) ? new Date(value * 1000).toISOString() : null;
}
export function customerId(value: string | { id: string }) { return typeof value === 'string' ? value : value.id; }
export function subscriptionFields(sub: BillingSubscription, existingEnd?: string | null, now = Date.now()) {
  const item = sub.items?.data?.[0];
  const end = epochIso(sub.current_period_end ?? item?.current_period_end);
  const current = sub.status === 'active' || sub.status === 'trialing';
  // A failed renewal must not extend access into an unpaid period or remove paid time.
  const accessEnd = current ? end : existingEnd ?? null;
  const paidTimeRemains = !!accessEnd && Date.parse(accessEnd) > now;
  const subscribed = current || (sub.status === 'past_due' && paidTimeRemains);
  return {
    stripe_subscription_id: sub.id, stripe_customer_id: customerId(sub.customer),
    billing_status: sub.status, subscribed, subscription_tier: subscribed ? 'Pro' : null,
    subscription_start: epochIso(sub.current_period_start ?? item?.current_period_start),
    subscription_end: accessEnd,
    cancel_at_period_end: sub.status === 'canceled' || !!sub.cancel_at_period_end,
    auto_renew: sub.status !== 'canceled' && !sub.cancel_at_period_end,
    renewal_amount: item?.price?.unit_amount == null ? null : item.price.unit_amount * (item.quantity ?? 1) / 100,
    renewal_currency: (item?.price?.currency ?? 'eur').toUpperCase(),
  };
}
export function cancellationKey(sub: BillingSubscription) {
  return `cancel:${sub.id}:${sub.canceled_at ?? sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? 0}`;
}
export function isSubscriptionCheckout(session: { mode?: string; payment_status?: string; status?: string }) {
  return session.mode === 'subscription' && session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status ?? '');
}

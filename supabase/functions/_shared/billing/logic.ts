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
// A paid renewal starts a new period, so both expiry emails must be allowed to send again.
export function renewalResetFields(renewed: boolean) {
  return renewed ? { expiration_email_sent_at: null, expiry_reminder_sent_at: null } : {};
}

// Cancelling a paid-up plan keeps Pro until the period ends. A plan whose payment
// failed is ended now, so Stripe stops retrying the failed charge.
export function cancelMode(status: string): 'period_end' | 'immediate' | null {
  if (status === 'active' || status === 'trialing') return 'period_end';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete' || status === 'paused') return 'immediate';
  return null;
}

// "Pro expires soon" / "Pro has expired" emails are only for plans that are really
// ending: gifted Pro (no Stripe subscription) or a Stripe plan that won't renew.
// Auto-renewing members get the renewal receipt instead.
export type ExpiryEmailRow = { stripe_subscription_id?: string | null; cancel_at_period_end?: boolean | null; auto_renew?: boolean | null };
export const REALLY_ENDING_FILTER = 'stripe_subscription_id.is.null,cancel_at_period_end.eq.true,auto_renew.eq.false';
export function planIsReallyEnding(row: ExpiryEmailRow) {
  return !row.stripe_subscription_id || row.cancel_at_period_end === true || row.auto_renew === false;
}

// When a member cancels, every other live plan they have is stopped too, so a
// duplicate subscription can never keep charging after they cancel.
export function otherLiveSubscriptions(all: BillingSubscription[], primaryId: string) {
  const seen = new Set<string>([primaryId]);
  return all.filter((s) => {
    if (seen.has(s.id) || !cancelMode(s.status)) return false;
    seen.add(s.id);
    return true;
  });
}

// Gifted Pro has no card payments, so cancelling never charges anything.
// Remaining dated time is kept; an open-ended gift ends now.
export function giftedCancelFields(end: string | null, now = Date.now()) {
  const nowIso = new Date(now).toISOString();
  const base = { pro_cancelled_at: nowIso, auto_renew: false, cancel_at_period_end: true, updated_at: nowIso };
  if (end && Date.parse(end) > now) return { ...base, endsNow: false as const };
  return { ...base, subscribed: false, subscription_tier: null, subscription_end: nowIso, expiration_email_sent_at: nowIso, endsNow: true as const };
}

// After cancelling, record the plan that still gives paid time (a paid-up plan
// ending at period end) before any plan that was ended immediately.
export function membershipAfterCancel(results: BillingSubscription[]) {
  const live = results.filter((s) => cancelMode(s.status) !== null);
  const pick = (list: BillingSubscription[]) => [...list].sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0) || (b.created ?? 0) - (a.created ?? 0))[0];
  return pick(live) ?? pick(results) ?? null;
}

// Merge plans found on the linked Stripe customer and on every customer with the member's email.
export function uniqueSubscriptions(lists: BillingSubscription[][]) {
  const byId = new Map<string, BillingSubscription>();
  for (const list of lists) for (const sub of list) if (!byId.has(sub.id)) byId.set(sub.id, sub);
  return [...byId.values()];
}

export type AdminMembership = {
  subscribed: boolean;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id?: string | null;
  billing_status?: string | null;
  auto_renew?: boolean;
  cancel_at_period_end?: boolean;
  pro_cancelled_at?: string | null;
};

export function adminMembershipState(sub: AdminMembership | null, now = Date.now()) {
  const paid = !!sub?.stripe_subscription_id;
  const paymentIssue = paid && ['past_due', 'unpaid', 'incomplete'].includes(sub?.billing_status ?? '');
  const renewingPlan = paid && ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(sub?.billing_status ?? 'active');
  const active = !!sub?.subscribed && (!sub.subscription_end || Date.parse(sub.subscription_end) > now);
  const ending = paid ? !!sub?.cancel_at_period_end : !!sub?.pro_cancelled_at;
  return {
    paid,
    paymentIssue,
    ending,
    canCancel: (renewingPlan || active) && (!ending || paymentIssue),
    label: ending ? 'Renewal off' : paymentIssue ? 'Payment issue' : renewingPlan ? 'Recurring Pro' : active ? 'Gifted Pro' : 'Free',
  };
}
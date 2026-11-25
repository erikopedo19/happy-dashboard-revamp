import { expect, test } from 'bun:test';
import { adminMembershipState } from './admin-subscription.ts';
const now = Date.parse('2026-11-25T15:02:00Z');
const paid = { subscribed:true, subscription_end:'2026-12-25T00:00:00Z', stripe_customer_id:'cus_test', stripe_subscription_id:'sub_test', billing_status:'active', cancel_at_period_end:false };
test('Superadmin can cancel a recurring Pro plan regardless of its Stripe Checkout payment method', () => {
  expect(adminMembershipState(paid, now).canCancel).toBe(true);
});
test('Superadmin can cancel failed-payment plans even when Pro is locked', () => {
  for (const billing_status of ['past_due', 'unpaid', 'incomplete']) expect(adminMembershipState({ ...paid, subscribed:false, billing_status }, now).canCancel).toBe(true);
});
test('a completed cancellation is shown as renewal off, not a new active plan', () => {
  const state = adminMembershipState({ ...paid, cancel_at_period_end:true }, now);
  expect(state.ending).toBe(true);
  expect(state.canCancel).toBe(false);
});
test('gifted Pro is cancellable but free accounts are not', () => {
  expect(adminMembershipState({ ...paid, stripe_subscription_id:null }, now).canCancel).toBe(true);
  expect(adminMembershipState(null, now).canCancel).toBe(false);
});
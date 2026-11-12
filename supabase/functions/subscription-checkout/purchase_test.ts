import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { hasPurchaseConsent, blocksNewCheckout, shouldApplySubscription, SUBSCRIPTION_TERMS_VERSION } from '../_shared/billing/purchase.ts';
Deno.test('checkout requires explicit agreement to the current subscription terms', () => {
  assertEquals(hasPurchaseConsent({ terms_accepted: true, terms_version: SUBSCRIPTION_TERMS_VERSION }), true);
  assertEquals(hasPurchaseConsent({ terms_accepted: false, terms_version: SUBSCRIPTION_TERMS_VERSION }), false);
  assertEquals(hasPurchaseConsent({ terms_accepted: true, terms_version: '2026-01-01' }), false);
});
Deno.test('a past-due or unpaid subscription blocks a second paid subscription', () => {
  assertEquals(blocksNewCheckout('past_due'), true);
  assertEquals(blocksNewCheckout('unpaid'), true);
  assertEquals(blocksNewCheckout('canceled'), false);
});
Deno.test('ending a replaced duplicate cannot remove Pro from the live subscription', () => {
  assertEquals(shouldApplySubscription('sub_live', { id: 'sub_old', status: 'canceled' }), false);
  assertEquals(shouldApplySubscription('sub_live', { id: 'sub_live', status: 'canceled' }), true);
});
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { subscriptionFields, cancellationKey, isSubscriptionCheckout, renewalResetFields, cancelMode, planIsReallyEnding } from '../_shared/billing/logic.ts';
import { verifyStripeSignature } from './signature.ts';
import { newestSubscription } from '../_shared/billing/service.ts';
const start = Date.parse('2026-10-24T00:00:00Z') / 1000;
const end = Date.parse('2026-11-24T00:00:00Z') / 1000;
const sub = { id:'sub_test', customer:'cus_test', status:'active', current_period_start:start, current_period_end:end, items:{data:[{price:{unit_amount:899,currency:'eur'},quantity:1}]} };
Deno.test('renewal grants Pro through the paid period and records actual amount', () => {
  const fields=subscriptionFields(sub,null,start*1000);
  assertEquals(fields.subscribed,true);
  assertEquals(fields.subscription_end,'2026-11-24T00:00:00.000Z');
  assertEquals(fields.renewal_amount,8.99);
  assertEquals(fields.auto_renew,true);
});
Deno.test('cancellation stops renewal but preserves paid access', () => {
  const fields=subscriptionFields({...sub,cancel_at_period_end:true},null,start*1000);
  assertEquals(fields.subscribed,true);
  assertEquals(fields.auto_renew,false);
  assertEquals(fields.cancel_at_period_end,true);
  assertEquals(fields.subscription_end,'2026-11-24T00:00:00.000Z');
});
Deno.test('resume clears cancellation without charging again',()=>{
  assertEquals(subscriptionFields({...sub,cancel_at_period_end:false},null,start*1000).auto_renew,true);
});
Deno.test('failed renewal never extends an unpaid period',()=>{
  const fields=subscriptionFields({...sub,status:'past_due'},'2026-10-24T00:00:00.000Z',start*1000);
  assertEquals(fields.subscribed,false);
  assertEquals(fields.subscription_end,'2026-10-24T00:00:00.000Z');
});
Deno.test('failure keeps remaining previously paid time',()=>{
  assertEquals(subscriptionFields({...sub,status:'past_due'},'2026-11-24T00:00:00.000Z',start*1000).subscribed,true);
});
Deno.test('ended membership loses Pro and auto renewal',()=>{
  const fields=subscriptionFields({...sub,status:'canceled'},null,start*1000);
  assertEquals(fields.subscribed,false);assertEquals(fields.auto_renew,false);
});
Deno.test('unpaid or unrelated checkout cannot grant a membership',()=>{
  assertEquals(isSubscriptionCheckout({mode:'payment',status:'complete',payment_status:'paid'}),false);
  assertEquals(isSubscriptionCheckout({mode:'subscription',status:'complete',payment_status:'unpaid'}),false);
  assertEquals(isSubscriptionCheckout({mode:'subscription',status:'complete',payment_status:'paid'}),true);
});
Deno.test('cancellation emails dedupe across app and Stripe notification',()=>{
  assertEquals(cancellationKey({...sub,canceled_at:start}),`cancel:sub_test:${start}`);
  assertEquals(cancellationKey({...sub,canceled_at:start+1}) === cancellationKey({...sub,canceled_at:start}),false);
});
Deno.test('Stripe rejects replayed signatures and accepts any matching rotated signature',async()=>{
  const payload='{"id":"evt_test"}';const t=start;const secret='fixture-secret-not-a-credential';
  const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(`${t}.${payload}`)));
  const sig=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  assertEquals(await verifyStripeSignature(payload,`t=${t},v1=invalid,v1=${sig}`,secret,t*1000),true);
  assertEquals(await verifyStripeSignature(payload,`t=${t},v1=${sig}`,secret,(t+301)*1000),false);
  assertEquals(await verifyStripeSignature(payload+' ',`t=${t},v1=${sig}`,secret,t*1000),false);
});
Deno.test('renewal re-enables the expiry reminder and expired emails for the new period', () => {
  assertEquals(renewalResetFields(true),{ expiration_email_sent_at:null, expiry_reminder_sent_at:null });
  assertEquals(renewalResetFields(false),{});
});

Deno.test('cancelling a paid-up plan keeps Pro until the period ends', () => {
  assertEquals(cancelMode('active'), 'period_end');
});
Deno.test('cancelling after a failed payment ends the plan now so no retry charge happens', () => {
  assertEquals(cancelMode('past_due'), 'immediate');
  assertEquals(cancelMode('unpaid'), 'immediate');
});
Deno.test('an already ended plan cannot be cancelled again', () => {
  assertEquals(cancelMode('canceled'), null);
});
Deno.test('an unpaid or incomplete live plan is selected for cancellation ahead of an ended plan', () => {
  for (const status of ['unpaid', 'incomplete']) {
    assertEquals(newestSubscription([
      { id:'sub_ended', customer:'cus_test', status:'canceled', created:200 },
      { id:'sub_pending', customer:'cus_test', status, created:100 },
    ])?.id, 'sub_pending');
  }
});

Deno.test('expiry emails skip auto-renewing Stripe plans', () => {
  assertEquals(planIsReallyEnding({ stripe_subscription_id: 'sub_1', cancel_at_period_end: false, auto_renew: true }), false);
});
Deno.test('expiry emails go to cancelled Stripe plans', () => {
  assertEquals(planIsReallyEnding({ stripe_subscription_id: 'sub_1', cancel_at_period_end: true, auto_renew: false }), true);
});
Deno.test('expiry emails go to gifted Pro with an end date', () => {
  assertEquals(planIsReallyEnding({ stripe_subscription_id: null, cancel_at_period_end: false, auto_renew: true }), true);
});

import { otherLiveSubscriptions, giftedCancelFields } from '../_shared/billing/logic.ts';
Deno.test('cancelling stops every other live duplicate plan, not just the newest', () => {
  const subs = [
    { id: 'sub_new', customer: 'cus_1', status: 'active' },
    { id: 'sub_dup', customer: 'cus_1', status: 'active' },
    { id: 'sub_late', customer: 'cus_2', status: 'past_due' },
    { id: 'sub_old', customer: 'cus_1', status: 'canceled' },
    { id: 'sub_dup', customer: 'cus_1', status: 'active' },
  ];
  assertEquals(otherLiveSubscriptions(subs, 'sub_new').map((s) => s.id), ['sub_dup', 'sub_late']);
});
Deno.test('cancelling gifted Pro keeps remaining dated time and never charges', () => {
  const now = Date.parse('2026-11-22T10:00:00Z');
  const kept = giftedCancelFields('2026-12-09T00:00:00Z', now);
  assertEquals(kept.endsNow, false);
  assertEquals(kept.auto_renew, false);
  assertEquals('subscribed' in kept, false);
});
Deno.test('cancelling open-ended gifted Pro ends it now', () => {
  const now = Date.parse('2026-11-22T10:00:00Z');
  const ended = giftedCancelFields(null, now);
  assertEquals(ended.endsNow, true);
  const fields = ended as { subscribed?: boolean; subscription_end?: string };
  assertEquals(fields.subscribed, false);
  assertEquals(fields.subscription_end, '2026-11-22T10:00:00.000Z');
});

import { membershipAfterCancel, uniqueSubscriptions } from '../_shared/billing/logic.ts';
import { shouldApplySubscription } from '../_shared/billing/purchase.ts';

Deno.test('cancelling keeps the paid-up plan as the membership, not the plan ended for a failed payment', () => {
  const paidUp = { id: 'sub_paid', customer: 'cus_1', status: 'active', cancel_at_period_end: true, current_period_end: 2_000_000_000, created: 1 };
  const failed = { id: 'sub_failed', customer: 'cus_1', status: 'canceled', current_period_end: 1_900_000_000, created: 2 };
  assertEquals(membershipAfterCancel([failed, paidUp])?.id, 'sub_paid');
  assertEquals(membershipAfterCancel([failed])?.id, 'sub_failed');
});

Deno.test('a paused plan is ended immediately on cancel so it can never resume charging', () => {
  assertEquals(cancelMode('paused'), 'immediate');
});

Deno.test('plans on the linked customer and on email-matched customers are all considered once', () => {
  const a = { id: 'sub_a', customer: 'cus_1', status: 'active' };
  const b = { id: 'sub_b', customer: 'cus_2', status: 'active' };
  assertEquals(uniqueSubscriptions([[a], [a, b]]).map((s) => s.id), ['sub_a', 'sub_b']);
});

Deno.test('an old ended Stripe plan cannot remove gifted Pro from a member with no linked plan', () => {
  assertEquals(shouldApplySubscription(null, { id: 'sub_old', status: 'canceled' }), false);
  assertEquals(shouldApplySubscription(null, { id: 'sub_new', status: 'active' }), true);
});

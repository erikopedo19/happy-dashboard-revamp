import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { subscriptionFields, cancellationKey, isSubscriptionCheckout } from '../_shared/billing/logic.ts';
import { verifyStripeSignature } from './signature.ts';
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

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, stripeRequest, syncSubscription, findSubscriptions, newestSubscription, cancellationEmail, sendBillingEmail } from '../_shared/billing/service.ts';
import { isSubscriptionCheckout, cancelMode, otherLiveSubscriptions, giftedCancelFields, type BillingSubscription } from '../_shared/billing/logic.ts';
import { MembershipRequest, MembershipRequestError, resolveMembershipTarget } from './request.ts';
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
async function voidOpenInvoices(subscriptionId: string) {
  const open = await stripeRequest(`/invoices?${new URLSearchParams({ subscription: subscriptionId, status: 'open', limit: '20' })}`);
  for (const invoice of open.data ?? []) await stripeRequest(`/invoices/${encodeURIComponent(invoice.id)}/void`, new URLSearchParams());
}
async function stopSubscription(sub: BillingSubscription) {
  const mode = cancelMode(sub.status);
  if (mode === 'immediate') {
    await stripeRequest(`/subscriptions/${encodeURIComponent(sub.id)}`, undefined, undefined, 'DELETE');
    await voidOpenInvoices(sub.id);
  } else if (mode === 'period_end' && !sub.cancel_at_period_end) {
    await stripeRequest(`/subscriptions/${encodeURIComponent(sub.id)}`, new URLSearchParams({ cancel_at_period_end: 'true' }));
  }
}
type SubscriberRow = { subscribed?: boolean | null; subscription_end?: string | null; pro_cancelled_at?: string | null } | null;
// Gifted Pro (no Stripe plan): nothing is ever charged, so cancel only changes access.
async function manageGifted(admin: ReturnType<typeof adminClient>, userId: string, email: string, row: SubscriberRow, action: 'cancel' | 'resume') {
  const now = Date.now();
  const end = row?.subscription_end ?? null;
  const live = !!row?.subscribed && (!end || Date.parse(end) > now);
  if (!live) return json({ ok:false, error:'no_membership' });
  if (action === 'resume') {
    if (!row?.pro_cancelled_at || !end) return json({ ok:true, gifted:true, subscribed:true, subscription_end:end, email_pending:false });
    const { error } = await admin.from('subscribers').update({ pro_cancelled_at: null, auto_renew: true, cancel_at_period_end: false, updated_at: new Date(now).toISOString() }).eq('user_id', userId);
    if (error) throw error;
    return json({ ok:true, gifted:true, subscribed:true, subscription_end:end, email_pending:false });
  }
  if (row?.pro_cancelled_at) return json({ ok:true, gifted:true, subscribed:true, subscription_end:end, email_pending:false });
  const { endsNow, ...fields } = giftedCancelFields(end, now);
  const { error } = await admin.from('subscribers').update(fields).eq('user_id', userId);
  if (error) throw error;
  const accessEnd = endsNow ? fields.updated_at : end;
  let emailPending = false;
  try { await sendBillingEmail(admin, userId, email, `gift-cancel:${userId}:${end ?? 'open'}`, endsNow ? 'ended' : 'cancelled', accessEnd); }
  catch { emailPending = true; console.error('Gifted cancellation email pending'); }
  return json({ ok:true, gifted:true, subscribed:!endsNow, subscription_end:accessEnd, email_pending:emailPending });
}
serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' },405);
  try {
    const admin = adminClient();
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    if (!token) return json({ error:'not_authenticated' },401);
    const { data, error } = await admin.auth.getUser(token);
    const caller = data.user;
    if (error || !caller?.email) return json({ error:'not_authenticated' },401);
    const parsed = MembershipRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error:'invalid_request', details:parsed.error.flatten().fieldErrors },400);
    const body = parsed.data;
    const action = body.action;
    const user = await resolveMembershipTarget(caller, body, async () => {
      const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession:false },
      });
      const { data: allowed, error: permissionError } = await client.rpc('is_super_admin');
      return !permissionError && allowed === true;
    }, async id => {
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(id);
      if (targetError) return null;
      return target.user;
    });
    const { data: subscriber, error: lookupError } = await admin.from('subscribers').select('stripe_customer_id,stripe_subscription_id,email,subscribed,subscription_end,pro_cancelled_at').eq('user_id',user.id).maybeSingle();
    if (lookupError) throw lookupError;
    let subscription;
    let all: BillingSubscription[] = [];
    if (body.session_id && action === 'sync') {
      if (typeof body.session_id !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(body.session_id)) return json({ error:'invalid_session' },400);
      const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(body.session_id)}`);
      if (session.client_reference_id !== user.id) return json({ error:'not_authorized' },403);
      if (!isSubscriptionCheckout(session)) return json({ ok:true, pending:true });
      subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(session.subscription)}`);
    } else if (subscriber?.stripe_customer_id) {
      all = await findSubscriptions(subscriber.stripe_customer_id);
      subscription = newestSubscription(all) ?? all.find(s => cancelMode(s.status));
    }
    if (!subscription) {
      const customers = await stripeRequest(`/customers?${new URLSearchParams({ email:user.email, limit:'100' })}`);
      const found = await Promise.all((customers.data ?? []).map((c: {id:string}) => findSubscriptions(c.id)));
      all = [...all, ...found.flat()];
      subscription = newestSubscription(all) ?? all.find(s => cancelMode(s.status));
    }
    if (!subscription) {
      if (action === 'sync') return json({ ok:true, pending:false, has_subscription:false });
      if (action === 'cancel' || action === 'resume') return await manageGifted(admin, user.id, user.email, subscriber, action);
      return json({ ok:false, error:'no_stripe_subscription' });
    }
    if (action === 'portal') {
      const portal = await stripeRequest('/billing_portal/sessions',new URLSearchParams({ customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id, return_url:'https://cutzioo.com/settings' }));
      return json({ ok:true, url:portal.url });
    }
    const wasCancelling = !!subscription.cancel_at_period_end;
    if (action === 'cancel' || action === 'resume') {
      const mode = cancelMode(subscription.status);
      if (!mode) return await manageGifted(admin, user.id, user.email, subscriber, action);
      if (action === 'cancel' && mode === 'immediate') {
        // Failed payment: end the plan now and clear the unpaid bill, so the member is never charged after cancelling.
        subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(subscription.id)}`, undefined, undefined, 'DELETE');
        await voidOpenInvoices(subscription.id);
      } else if (action === 'resume' && mode === 'immediate') {
        return json({ ok:false, error:'payment_update_required' });
      } else if (wasCancelling !== (action === 'cancel')) {
        subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(subscription.id)}`,new URLSearchParams({ cancel_at_period_end:String(action==='cancel') }));
      }
      // Any duplicate live plan is stopped too, so nothing is charged after cancelling.
      if (action === 'cancel') {
        for (const extra of otherLiveSubscriptions(all, subscription.id)) await stopSubscription(extra);
      }
    }
    const { applied, ...fields } = await syncSubscription(admin,user.id,user.email,subscription);
    if (action === 'cancel' && !applied) return json({ error:'membership_sync_pending' },409);
    let emailPending = false;
    if (applied && (action === 'sync' || (action === 'cancel' && (!wasCancelling || subscription.status === 'canceled')))) {
      try { await cancellationEmail(admin,user.id,user.email,subscription,fields.subscription_end); }
      catch { emailPending = true; console.error('Cancellation confirmation pending; webhook will retry'); }
    }
    if (applied && action === 'resume' && wasCancelling) {
      try { await sendBillingEmail(admin,user.id,user.email,`resume:${subscription.id}:${subscription.current_period_end}:${subscription.canceled_at ?? 0}`,'resumed',fields.subscription_end); }
      catch { emailPending = true; }
    }
    return json({ ok:true, ...fields, email_pending:emailPending });
  } catch(error) {
    if (error instanceof MembershipRequestError) return json({ error:error.code },error.status);
    console.error('Membership operation failed',error instanceof Error ? error.message : 'unknown');
    return json({ error:'subscription_update_failed' },502);
  }
});

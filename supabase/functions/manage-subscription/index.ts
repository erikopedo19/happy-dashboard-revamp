import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminClient, stripeRequest, syncSubscription, findSubscriptions, newestSubscription, cancellationEmail, sendBillingEmail } from '../_shared/billing/service.ts';
import { isSubscriptionCheckout } from '../_shared/billing/logic.ts';
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' },405);
  try {
    const admin = adminClient();
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    if (!token) return json({ error:'not_authenticated' },401);
    const { data, error } = await admin.auth.getUser(token);
    const user = data.user;
    if (error || !user?.email) return json({ error:'not_authenticated' },401);
    const body = await req.json();
    const action = body.action;
    if (!['cancel','resume','sync','portal'].includes(action)) return json({ error:'invalid_action' },400);
    const { data: subscriber, error: lookupError } = await admin.from('subscribers').select('stripe_customer_id,stripe_subscription_id,email').eq('user_id',user.id).maybeSingle();
    if (lookupError) throw lookupError;
    let subscription;
    if (body.session_id && action === 'sync') {
      if (typeof body.session_id !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(body.session_id)) return json({ error:'invalid_session' },400);
      const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(body.session_id)}`);
      if (session.client_reference_id !== user.id) return json({ error:'not_authorized' },403);
      if (!isSubscriptionCheckout(session)) return json({ ok:true, pending:true });
      subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(session.subscription)}`);
    } else if (subscriber?.stripe_customer_id) {
      subscription = newestSubscription(await findSubscriptions(subscriber.stripe_customer_id));
    }
    if (!subscription) {
      const customers = await stripeRequest(`/customers?${new URLSearchParams({ email:user.email, limit:'100' })}`);
      const all = await Promise.all((customers.data ?? []).map((c: {id:string}) => findSubscriptions(c.id)));
      subscription = newestSubscription(all.flat());
    }
    if (!subscription) return action === 'sync' ? json({ ok:true, pending:false, has_subscription:false }) : json({ error:'no_stripe_subscription' },404);
    if (action === 'portal') {
      const portal = await stripeRequest('/billing_portal/sessions',new URLSearchParams({ customer: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id, return_url:'https://cutzioo.com/settings' }));
      return json({ ok:true, url:portal.url });
    }
    if (action === 'cancel' || action === 'resume') {
      if (!['active','trialing','past_due'].includes(subscription.status)) return json({ error:'no_stripe_subscription' },404);
      subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(subscription.id)}`,new URLSearchParams({ cancel_at_period_end:String(action==='cancel') }));
    }
    const fields = await syncSubscription(admin,user.id,user.email,subscription);
    let emailPending = false;
    if (action === 'cancel' || action === 'sync') {
      try { await cancellationEmail(admin,user.id,user.email,subscription,fields.subscription_end); }
      catch { emailPending = true; console.error('Cancellation confirmation pending; webhook will retry'); }
    }
    if (action === 'resume') {
      try { await sendBillingEmail(admin,user.id,user.email,`resume:${subscription.id}:${subscription.current_period_end}:${subscription.canceled_at ?? 0}`,'resumed',fields.subscription_end); }
      catch { emailPending = true; }
    }
    return json({ ok:true, ...fields, email_pending:emailPending });
  } catch(error) {
    console.error('Membership operation failed',error instanceof Error ? error.message : 'unknown');
    return json({ error:'subscription_update_failed' },502);
  }
});

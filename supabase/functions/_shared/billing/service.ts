import { createClient } from 'npm:@supabase/supabase-js@2';
import { BillingSubscription, subscriptionFields, cancellationKey } from './logic.ts';
export const adminClient = () => createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
export async function stripeRequest(path: string, body?: URLSearchParams) {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('payment_config_missing');
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' }, body,
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('Stripe request failed', response.status, data.error?.code ?? data.error?.type);
    throw new Error('payment_provider_unavailable');
  }
  return data;
}
export async function sendBillingEmail(admin: ReturnType<typeof adminClient>, userId: string, email: string, key: string, kind: string, end: string | null, amount?: number | null, currency = 'EUR') {
  const { data: claimed, error } = await admin.rpc('claim_billing_email', { p_key: key, p_user_id: userId, p_kind: kind });
  if (error) throw error;
  if (!claimed) return;
  try {
    const brevo = Deno.env.get('BREVO_API_KEY');
    const gateway = Deno.env.get('LOVABLE_API_KEY');
    if (!brevo || !gateway) throw new Error('email_config_missing');
    const date = end ? new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
    const subject = kind === 'renewal' ? 'Your Cutzioo Pro renewal is confirmed' : kind === 'resumed' ? 'Cutzioo Pro auto-renewal is back on' : kind === 'ended' ? 'Your Cutzioo Pro subscription has ended' : 'Your Cutzioo Pro cancellation is confirmed';
    const detail = kind === 'renewal'
      ? `Your payment${amount != null ? ` of ${new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)}` : ''} is confirmed.${date ? ` Pro access is available until ${date}.` : ''}`
      : kind === 'resumed' ? `Auto-renewal is enabled.${date ? ` Your next renewal date is ${date}.` : ''}`
      : kind === 'ended' ? 'Your subscription has ended and your account is now on the free plan. Your saved data is kept.'
      : `Auto-renewal is off. You will not be charged for another subscription period.${date ? ` Your Pro access continues until ${date}.` : ''} Your saved data is kept.`;
    const response = await fetch('https://connector-gateway.lovable.dev/brevo/smtp/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Connection-Api-Key': brevo, Authorization: `Bearer ${gateway}` },
      body: JSON.stringify({ sender: { email: 'hello@cutzioo.com', name: 'Cutzioo' }, to: [{ email }], subject,
        htmlContent: `<h1>${subject}</h1><p>${detail}</p><p><a href="https://cutzioo.com/settings">Manage your membership</a></p>`,
        textContent: `${subject}\n\n${detail}\n\nManage your membership: https://cutzioo.com/settings`,
        headers: { 'idempotencyKey': key },
      }),
    });
    await response.text();
    if (!response.ok) throw new Error('confirmation_email_failed');
    const { error: sentError } = await admin.from('billing_email_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('delivery_key', key);
    if (sentError) throw sentError;
  } catch (error) {
    await admin.from('billing_email_deliveries').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('delivery_key', key);
    throw error;
  }
}
export async function syncSubscription(admin: ReturnType<typeof adminClient>, userId: string, email: string, sub: BillingSubscription) {
  const { data: old, error: lookupError } = await admin.from('subscribers').select('subscription_end, stripe_subscription_id, cancel_at_period_end').eq('user_id', userId).maybeSingle();
  if (lookupError) throw lookupError;
  const fields = subscriptionFields(sub, old?.subscription_end);
  const { error } = await admin.from('subscribers').upsert({ user_id: userId, email, ...fields, updated_at: new Date().toISOString(), ...(fields.subscribed && sub.status === 'active' ? { payment_failed_at: null, expiration_email_sent_at: null, expiry_reminder_sent_at: null } : {}) }, { onConflict: 'user_id' });
  if (error) throw error;
  return fields;
}
export async function cancellationEmail(admin: ReturnType<typeof adminClient>, userId: string, email: string, sub: BillingSubscription, end: string | null) {
  if (sub.cancel_at_period_end) await sendBillingEmail(admin, userId, email, cancellationKey(sub), 'cancelled', end);
  if (sub.status === 'canceled') await sendBillingEmail(admin, userId, email, `ended:${sub.id}`, 'ended', end);
}
export async function findSubscriptions(customer: string) {
  const result = await stripeRequest(`/subscriptions?${new URLSearchParams({ customer, status: 'all', limit: '100' })}`);
  return (result.data ?? []) as BillingSubscription[];
}
export function newestSubscription(subs: BillingSubscription[]) {
  return [...subs].filter(s => ['active', 'trialing', 'past_due', 'unpaid', 'canceled'].includes(s.status)).sort((a,b) => {
    const live = (s: BillingSubscription) => ['active','trialing','past_due'].includes(s.status) ? 1 : 0;
    return live(b)-live(a) || (b.created ?? 0)-(a.created ?? 0);
  })[0] ?? null;
}

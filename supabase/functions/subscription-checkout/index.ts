import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminClient, stripeRequest, findSubscriptions, newestSubscription } from '../_shared/billing/service.ts';
import { hasPurchaseConsent, blocksNewCheckout } from '../_shared/billing/purchase.ts';
const json = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  try {
    const admin=adminClient();
    const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    if(!token) return json({error:'not_authenticated'},401);
    const {data,error}=await admin.auth.getUser(token);
    const user=data.user;
    if(error||!user?.email) return json({error:'not_authenticated'},401);
    const body=await req.json();
    if(!hasPurchaseConsent(body)) return json({error:'terms_required'},400);
    if(body.plan!=='monthly') return json({error:'plan_unavailable'},400);
    const origin = new URL(typeof body.return_origin === 'string' ? body.return_origin : 'https://cutzioo.com').origin;
    if(!['https://cutzioo.com','https://www.cutzioo.com','https://happy-ios-dash.lovable.app','http://localhost:8080'].includes(origin) && !/^https:\/\/[a-zA-Z0-9-]+\.lovable\.app$/.test(origin)) return json({error:'invalid_return_url'},400);
    const {data:row,error:rowError}=await admin.from('subscribers').select('stripe_customer_id').eq('user_id',user.id).maybeSingle();
    if(rowError) throw rowError;
    // Check the linked customer and every customer with this email; a separate customer can still bill twice.
    const emailCustomers=(await stripeRequest(`/customers?${new URLSearchParams({email:user.email,limit:'100'})}`)).data ?? [];
    const customers=[...new Map([...(row?.stripe_customer_id?[{id:row.stripe_customer_id}]:[]),...emailCustomers].map((customer:{id:string})=>[customer.id,customer])).values()];
    for(const customer of customers ?? []) {
      if((await findSubscriptions(customer.id)).some(sub => blocksNewCheckout(sub.status))) return json({error:'subscription_exists'},409);
    }
    const {data:attempt,error:claimError}=await admin.rpc('claim_subscription_checkout',{p_user_id:user.id,p_plan:body.plan,p_origin:origin,p_terms_version:body.terms_version});
    if(claimError || !attempt) throw claimError ?? new Error('checkout_claim_failed');
    if(attempt.return_origin!==origin || attempt.plan!==body.plan || attempt.terms_version!==body.terms_version) return json({error:'checkout_pending'},409);
    if(attempt.stripe_session_id) {
      const existing=await stripeRequest(`/checkout/sessions/${encodeURIComponent(attempt.stripe_session_id)}`);
      if(existing.status==='open' && existing.url) return json({url:existing.url});
      return json({error:existing.status==='complete'?'subscription_exists':'checkout_pending'},409);
    }
    // Use the existing configured price; never invent a new charge or product.
    const link=await stripeRequest('/payment_links/plink_1TXJD81j0n3P0aipWd1Elsom/line_items?limit=10');
    const price=link.data?.[0]?.price;
    if(price?.unit_amount!==899||price?.currency!=='eur'||price?.recurring?.interval!=='month') throw new Error('price_configuration_mismatch');
    const form=new URLSearchParams({mode:'subscription','line_items[0][price]':price.id,'line_items[0][quantity]':'1',client_reference_id:user.id,'subscription_data[metadata][user_id]':user.id,success_url:`${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/payment-failed?type=subscription&reason=cancelled&back=%2Fpricing`});
    form.set('expires_at',String(Math.floor(Date.parse(attempt.expires_at)/1000)));
    for(const prefix of ['metadata','subscription_data[metadata]']) {
      form.set(`${prefix}[terms_version]`,attempt.terms_version);
      form.set(`${prefix}[terms_accepted_at]`,attempt.accepted_at);
    }
    if(customers?.[0]?.id) form.set('customer',customers[0].id); else form.set('customer_email',user.email);
    const session=await stripeRequest('/checkout/sessions',form,`subscription-checkout:${attempt.checkout_key}`);
    const {error:saveError}=await admin.from('subscription_checkout_attempts').update({stripe_session_id:session.id}).eq('user_id',user.id).eq('checkout_key',attempt.checkout_key);
    if(saveError) throw saveError;
    return json({url:session.url});
  }catch(error){console.error('Checkout failed',error instanceof Error?error.message:'unknown');return json({error:'checkout_unavailable'},502);}
});

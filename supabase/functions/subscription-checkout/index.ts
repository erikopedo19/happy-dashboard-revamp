import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { adminClient, stripeRequest, findSubscriptions, newestSubscription } from '../_shared/billing/service.ts';
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
    if(body.plan!=='monthly') return json({error:'plan_unavailable'},400);
    const origin = new URL(typeof body.return_origin === 'string' ? body.return_origin : 'https://cutzioo.com').origin;
    if(!['https://cutzioo.com','https://www.cutzioo.com','https://happy-ios-dash.lovable.app','http://localhost:8080'].includes(origin) && !/^https:\/\/[a-zA-Z0-9-]+\.lovable\.app$/.test(origin)) return json({error:'invalid_return_url'},400);
    const {data:row,error:rowError}=await admin.from('subscribers').select('stripe_customer_id').eq('user_id',user.id).maybeSingle();
    if(rowError) throw rowError;
    const customers= row?.stripe_customer_id ? [{id:row.stripe_customer_id}] : (await stripeRequest(`/customers?${new URLSearchParams({email:user.email,limit:'100'})}`)).data;
    for(const customer of customers ?? []) {
      const sub=newestSubscription(await findSubscriptions(customer.id));
      if(sub && ['active','trialing','past_due'].includes(sub.status)) return json({error:'subscription_exists'},409);
    }
    // Use the existing configured price; never invent a new charge or product.
    const link=await stripeRequest('/payment_links/plink_1TXJD81j0n3P0aipWd1Elsom/line_items?limit=10');
    const price=link.data?.[0]?.price;
    if(price?.unit_amount!==899||price?.currency!=='eur'||price?.recurring?.interval!=='month') throw new Error('price_configuration_mismatch');
    const form=new URLSearchParams({mode:'subscription','line_items[0][price]':price.id,'line_items[0][quantity]':'1',client_reference_id:user.id,'subscription_data[metadata][user_id]':user.id,success_url:`${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/payment-failed?type=subscription&reason=cancelled&back=%2Fpricing`});
    if(customers?.[0]?.id) form.set('customer',customers[0].id); else form.set('customer_email',user.email);
    const session=await stripeRequest('/checkout/sessions',form);
    return json({url:session.url});
  }catch(error){console.error('Checkout failed',error instanceof Error?error.message:'unknown');return json({error:'checkout_unavailable'},502);}
});

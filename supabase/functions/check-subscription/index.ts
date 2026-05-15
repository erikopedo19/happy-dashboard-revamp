import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2024-11-20.acacia",
    });
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error } = await supabaseAuth.auth.getUser(token);
    if (error || !userData.user?.email) throw new Error("Unauthenticated");
    const user = userData.user;

    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let subscribed = false;
    let tier: string | null = null;
    let endDate: string | null = null;
    let customerId: string | null = null;

    if (customers.data[0]) {
      customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subs.data[0]) {
        subscribed = true;
        tier = "Pro";
        endDate = new Date(subs.data[0].current_period_end * 1000).toISOString();
      }
    }

    await supabaseAdmin.from("subscribers").upsert(
      {
        user_id: user.id,
        email: user.email!,
        stripe_customer_id: customerId,
        subscribed,
        subscription_tier: tier,
        subscription_end: endDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return new Response(
      JSON.stringify({ subscribed, subscription_tier: tier, subscription_end: endDate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user?.email) throw new Error("Unauthenticated");
    const user = userData.user;

    // find or create customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email!, metadata: { user_id: user.id } });
      customerId = c.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Cutzio Pro — Monthly" },
            unit_amount: 1900,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings?subscribed=true`,
      cancel_url: `${origin}/settings?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

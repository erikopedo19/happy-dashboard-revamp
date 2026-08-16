// Stripe Connect — handles Stripe account linking for Cutzioo barbers
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const { method } = req;
    const url = new URL(req.url);

    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response("Invalid authorization token", { status: 401 });
    }

    if (method === "POST") {
      // Create Stripe Connect account link
      const body = await req.json();
      const { return_url } = body;

      // Check if user already has a connected account
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      let accountId = profile?.stripe_account_id;

      if (!accountId) {
        // Create new Connect account
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: "individual",
          business_profile: {
            url: `https://cutzioo.com`,
          },
        });

        accountId = account.id;

        // Save account ID to profile
        await supabase
          .from("profiles")
          .update({ stripe_account_id: accountId })
          .eq("id", user.id);
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${return_url}?refresh=true`,
        return_url: `${return_url}?success=true`,
        type: "account_onboarding",
      });

      return new Response(JSON.stringify({ url: accountLink.url }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (method === "GET") {
      // Check Stripe Connect status
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_account_id) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      try {
        const account = await stripe.accounts.retrieve(profile.stripe_account_id);
        const detailsSubmitted = account.details_submitted;
        const chargesEnabled = account.charges_enabled;

        return new Response(JSON.stringify({
          connected: true,
          details_submitted: detailsSubmitted,
          charges_enabled: chargesEnabled,
        }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        // Account might not exist or access issue
        return new Response(JSON.stringify({ connected: false }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: (error as Error).message 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
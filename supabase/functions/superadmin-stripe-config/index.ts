// Superadmin Stripe Configuration Management
// Allows superadmins to securely update Stripe environment variables
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify superadmin access
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is superadmin
    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Not authorized - superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "get_config") {
      // Return current Stripe configuration (without exposing full secret key)
      return new Response(JSON.stringify({
        platform_fee: 25, // Default platform fee in cents
        has_secret_key: !!Deno.env.get("STRIPE_SECRET_KEY"),
        has_publishable_key: !!Deno.env.get("STRIPE_PUBLISHABLE_KEY"),
        has_webhook_secret: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_config") {
      // Validate required fields
      const { secretKey, publishableKey, platformFee, webhookSecret } = body;
      
      if (!secretKey || !publishableKey) {
        return new Response(JSON.stringify({ error: "Secret key and publishable key are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate Stripe key format
      if (!secretKey.startsWith("sk_")) {
        return new Response(JSON.stringify({ error: "Invalid secret key format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!publishableKey.startsWith("pk_")) {
        return new Response(JSON.stringify({ error: "Invalid publishable key format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // In a real implementation, you would update environment variables here
      // For Supabase, this typically requires updating via dashboard or CLI
      console.log("Stripe configuration update requested (would need to be set in Supabase dashboard)");
      
      return new Response(JSON.stringify({ 
        success: true,
        message: "Configuration received. Please set these values in your Supabase dashboard environment variables:",
        variables: {
          STRIPE_SECRET_KEY: secretKey,
          STRIPE_PUBLISHABLE_KEY: publishableKey,
          STRIPE_WEBHOOK_SECRET: webhookSecret || "",
          PLATFORM_FEE_CENTS: platformFee || 25,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Superadmin Stripe config error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
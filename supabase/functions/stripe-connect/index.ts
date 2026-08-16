// Stripe Connect onboarding for app owners (barbers/shops).
// Actions: status | onboard | dashboard
// Requires a signed-in user; the connected account always belongs to that user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_API = "https://api.stripe.com/v1";

function form(obj: Record<string, string | number | boolean | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, String(v));
  return p;
}

async function stripe(path: string, body?: URLSearchParams, method = "POST") {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: body ? method : "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Stripe ${path} failed [${res.status}]: ${text}`);
    throw new Error(`[${res.status}]: ${text}`);
  }
  return JSON.parse(text);
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return json({ error: "STRIPE_SECRET_KEY is not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.error("No authorization token provided");
      return json({ error: "Not authenticated" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) {
      console.error("User authentication failed:", userErr);
      return json({ error: "Not authenticated" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    const returnUrl = typeof body.return_url === "string" ? body.return_url : "";

    console.log(`Processing stripe-connect action: ${action} for user: ${user.id}`);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_account_id, currency, business_name, full_name, sender_email")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return json({ error: "Failed to fetch profile", details: profileError.message }, 500);
    }
    
    if (!profile) {
      console.error("No profile found for user:", user.id);
      return json({ error: "No profile found. Please complete your profile first." }, 400);
    }

    let accountId: string | null = profile?.stripe_account_id ?? null;

    const syncFromAccount = async (acct: any) => {
      const fields = {
        stripe_account_id: acct.id,
        stripe_charges_enabled: !!acct.charges_enabled,
        stripe_payouts_enabled: !!acct.payouts_enabled,
        stripe_details_submitted: !!acct.details_submitted,
        payments_enabled: !!acct.charges_enabled && !!acct.payouts_enabled,
        stripe_onboarded_at: acct.details_submitted ? new Date().toISOString() : null,
      };
      await admin.from("profiles").update(fields).eq("id", user.id);
      return fields;
    };

    if (action === "status") {
      if (!accountId) return json({ connected: false });
      
      try {
        console.log("Fetching account status for:", accountId);
        const acct = await stripe(`/accounts/${accountId}`);
        const fields = await syncFromAccount(acct);
        
        return json({
          connected: true,
          account_id: acct.id,
          charges_enabled: fields.stripe_charges_enabled,
          payouts_enabled: fields.stripe_payouts_enabled,
          details_submitted: fields.stripe_details_submitted,
          requirements_due: acct.requirements?.currently_due ?? [],
        });
      } catch (stripeError) {
        console.error("Stripe status error:", stripeError);
        return json({ 
          connected: false, 
          error: `Failed to fetch account status: ${(stripeError as Error).message}` 
        }, 500);
      }
    }

    if (action === "onboard") {
      try {
        if (!accountId) {
          console.log("Creating new Stripe account for user:", user.id);
          const acct = await stripe(
            "/accounts",
            form({
              type: "express",
              email: profile?.sender_email || user.email,
              "business_profile[name]": profile?.business_name || profile?.full_name || "",
              "capabilities[card_payments][requested]": "true",
              "capabilities[transfers][requested]": "true",
            }),
          );
          accountId = acct.id;
          console.log("Created Stripe account:", accountId);
          
          const { error: updateError } = await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
          if (updateError) {
            console.error("Failed to update profile with stripe_account_id:", updateError);
            return json({ error: "Failed to save account ID" }, 500);
          }
        }

        console.log("Creating account link for:", accountId);
        const link = await stripe(
          "/account_links",
          form({
            account: accountId!,
            refresh_url: returnUrl || "https://cutzioo.com/settings",
            return_url: returnUrl || "https://cutzioo.com/settings",
            type: "account_onboarding",
          }),
        );
        
        if (!link.url) {
          console.error("No URL returned from account_links creation");
          return json({ error: "Failed to generate onboarding link" }, 500);
        }
        
        console.log("Successfully created account link");
        return json({ url: link.url });
      } catch (stripeError) {
        console.error("Stripe onboarding error:", stripeError);
        return json({ error: `Stripe onboarding failed: ${(stripeError as Error).message}` }, 500);
      }
    }

    if (action === "dashboard") {
      if (!accountId) {
        console.error("No connected account for dashboard action");
        return json({ error: "No connected account" }, 400);
      }
      
      try {
        console.log("Creating dashboard link for:", accountId);
        const link = await stripe(`/accounts/${accountId}/login_links`, form({}));
        
        if (!link.url) {
          console.error("No URL returned from login_links creation");
          return json({ error: "Failed to generate dashboard link" }, 500);
        }
        
        console.log("Successfully created dashboard link");
        return json({ url: link.url });
      } catch (stripeError) {
        console.error("Stripe dashboard error:", stripeError);
        return json({ error: `Stripe dashboard failed: ${(stripeError as Error).message}` }, 500);
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("stripe-connect error:", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

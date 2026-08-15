// Stripe Connect onboarding for app owners (barbers/shops).
// Actions: status | onboard | dashboard
// Requires a signed-in user; the connected account always belongs to that user.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY is not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    const returnUrl = typeof body.return_url === "string" ? body.return_url : "";

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_account_id, currency, business_name, full_name, sender_email")
      .eq("id", user.id)
      .maybeSingle();

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
    }

    if (action === "onboard") {
      if (!accountId) {
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
        await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
      }

      const link = await stripe(
        "/account_links",
        form({
          account: accountId!,
          refresh_url: returnUrl || "https://cutzioo.com/settings",
          return_url: returnUrl || "https://cutzioo.com/settings",
          type: "account_onboarding",
        }),
      );
      return json({ url: link.url });
    }

    if (action === "dashboard") {
      if (!accountId) return json({ error: "No connected account" }, 400);
      const link = await stripe(`/accounts/${accountId}/login_links`, form({}));
      return json({ url: link.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("stripe-connect error:", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

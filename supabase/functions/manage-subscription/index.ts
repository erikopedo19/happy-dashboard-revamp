import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  customerSearchPath,
  newestEligibleSubscription,
  periodEndIso,
  subscriptionListPath,
  subscriptionUpdateForm,
  type StripeSubscriptionSummary,
} from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
const STRIPE_API = "https://api.stripe.com/v1";

async function stripe(path: string, body?: URLSearchParams) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`Stripe ${path} failed [${response.status}]: ${text}`);
    throw new Error(`Stripe request failed with ${response.status}`);
  }
  return JSON.parse(text);
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    if (!STRIPE_SECRET_KEY) {
      return json({ error: "STRIPE_SECRET_KEY is not configured" }, 500);
    }
    if (!/^(sk|rk)_(live|test)_/.test(STRIPE_SECRET_KEY)) {
      return json({ error: "STRIPE_SECRET_KEY has an invalid format" }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "not_authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: userData, error: authError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) return json({ error: "not_authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "cancel" && action !== "resume") {
      return json({ error: "invalid_action" }, 400);
    }

    const { data: subscriber, error: subscriberError } = await admin
      .from("subscribers")
      .select("stripe_customer_id, email")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subscriberError) {
      console.error("Subscriber lookup failed:", subscriberError);
      return json({ error: "subscriber_lookup_failed" }, 500);
    }

    const findSubscription = async (customerId: string) => {
      const result = await stripe(subscriptionListPath(customerId));
      return newestEligibleSubscription(
        Array.isArray(result?.data) ? result.data : [],
      );
    };

    let subscription = subscriber?.stripe_customer_id
      ? await findSubscription(subscriber.stripe_customer_id)
      : null;

    if (!subscription && subscriber?.email) {
      const customerResult = await stripe(customerSearchPath(subscriber.email));
      const customers = Array.isArray(customerResult?.data) ? customerResult.data : [];
      const subscriptions = await Promise.all(
        customers
          .filter((customer: { id?: string }) => customer?.id)
          .map((customer: { id: string }) => findSubscription(customer.id)),
      );
      subscription = newestEligibleSubscription(
        subscriptions.filter(Boolean) as StripeSubscriptionSummary[],
      );
    }

    if (!subscription) return json({ error: "no_stripe_subscription" }, 404);

    const cancelAtPeriodEnd = action === "cancel";
    const updated = await stripe(
      `/subscriptions/${encodeURIComponent(subscription.id)}`,
      subscriptionUpdateForm(action),
    );
    const subscriptionEnd = periodEndIso(
      updated?.current_period_end ?? subscription.current_period_end,
    );

    const { error: updateError } = await admin
      .from("subscribers")
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        auto_renew: !cancelAtPeriodEnd,
        subscription_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Subscriber sync failed after Stripe update:", updateError);
      return json({ error: "subscription_state_sync_failed" }, 500);
    }

    return json({
      ok: true,
      cancel_at_period_end: cancelAtPeriodEnd,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    console.error("manage-subscription failed:", error);
    return json({ error: "subscription_update_failed" }, 502);
  }
});

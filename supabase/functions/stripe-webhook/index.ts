// Stripe webhook — verifies signature with STRIPE_WEBHOOK_SECRET only.
// Updates `subscribers` table on subscription lifecycle events.
// No STRIPE_SECRET_KEY required.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const encoder = new TextEncoder();

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === v1;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Missing signature config", { status: 400 });

  const body = await req.text();
  const ok = await verifyStripeSignature(body, sig, secret);
  if (!ok) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(body);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const upsert = async (email: string, fields: Record<string, unknown>) => {
    const { data: existing } = await supabase
      .from("subscribers")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (!existing) {
      // Look up user_id from auth.users via admin API
      const { data: list } = await supabase.auth.admin.listUsers();
      const u = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (!u) return;
      await supabase.from("subscribers").insert({ email, user_id: u.id, ...fields });
    } else {
      await supabase.from("subscribers").update(fields).eq("email", email);
    }
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const email = s.customer_email || s.customer_details?.email;
        if (email) {
          await upsert(email, {
            subscribed: true,
            subscription_tier: "Pro",
            stripe_customer_id: s.customer,
            subscription_end: s.expires_at ? new Date(s.expires_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const inv = event.data.object;
        const email = inv.customer_email;
        const periodEnd = inv.lines?.data?.[0]?.period?.end;
        if (email) {
          await upsert(email, {
            subscribed: true,
            subscription_tier: "Pro",
            stripe_customer_id: inv.customer,
            subscription_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const o = event.data.object;
        const email = o.customer_email;
        if (email) {
          await upsert(email, { subscribed: false, updated_at: new Date().toISOString() });
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});

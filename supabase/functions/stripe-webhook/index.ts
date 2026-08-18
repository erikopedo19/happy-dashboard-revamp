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
    // Helper to find email from a customer id by checking existing subscribers row
    const emailFromCustomer = async (cid: string | null | undefined) => {
      if (!cid) return null;
      const { data } = await supabase.from("subscribers").select("email").eq("stripe_customer_id", cid).maybeSingle();
      return data?.email ?? null;
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        // Marketplace (Connect) checkout — booking / product sale, not a subscription.
        if (s.metadata?.lovable_kind === "marketplace") {
          await supabase
            .from("payments")
            .update({
              status: s.payment_status === "paid" ? "paid" : "pending",
              amount_subtotal: s.amount_subtotal ?? 0,
              amount_tax: s.total_details?.amount_tax ?? 0,
              amount_total: s.amount_total ?? 0,
              currency: (s.currency ?? "eur").toLowerCase(),
              stripe_payment_intent_id: s.payment_intent ?? null,
              customer_email: s.customer_details?.email ?? s.customer_email ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_session_id", s.id);
          break;
        }
        const email = s.customer_email || s.customer_details?.email;
        if (email) {
          await upsert(email, {
            subscribed: true,
            subscription_tier: "Pro",
            stripe_customer_id: s.customer,
            // We'll get the accurate period end from invoice.payment_succeeded; leave null here.
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object;
        if (s.metadata?.lovable_kind === "marketplace") {
          await supabase
            .from("payments")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("stripe_session_id", s.id);
        }
        break;
      }
      case "account.updated": {
        const acct = event.data.object;
        const active = !!acct.charges_enabled && !!acct.payouts_enabled;
        await supabase
          .from("profiles")
          .update({
            stripe_charges_enabled: !!acct.charges_enabled,
            stripe_payouts_enabled: !!acct.payouts_enabled,
            stripe_details_submitted: !!acct.details_submitted,
            payments_enabled: active,
            ...(active ? { stripe_onboarded_at: new Date().toISOString() } : {}),
          })
          .eq("stripe_account_id", acct.id);
        break;
      }

      // Connect account created/authorized for the platform.
      case "account.application.authorized": {
        const acctId = event.account;
        if (acctId) {
          await supabase
            .from("profiles")
            .update({ stripe_details_submitted: true })
            .eq("stripe_account_id", acctId);
        }
        break;
      }

      // Barber disconnected the account from the platform.
      case "account.application.deauthorized": {
        const acctId = event.account;
        if (acctId) {
          await supabase
            .from("profiles")
            .update({
              stripe_charges_enabled: false,
              stripe_payouts_enabled: false,
              stripe_details_submitted: false,
              payments_enabled: false,
              stripe_account_id: null,
            })
            .eq("stripe_account_id", acctId);
        }
        break;
      }

      // Capability flips (card_payments / transfers) — keep payout status live.
      case "capability.updated": {
        const acctId = event.account;
        const cap = event.data.object;
        if (acctId && cap?.id === "card_payments") {
          const enabled = cap.status === "active";
          await supabase
            .from("profiles")
            .update({
              stripe_charges_enabled: enabled,
              payments_enabled: enabled,
              ...(enabled ? { stripe_onboarded_at: new Date().toISOString() } : {}),
            })
            .eq("stripe_account_id", acctId);
        }
        if (acctId && cap?.id === "transfers") {
          await supabase
            .from("profiles")
            .update({ stripe_payouts_enabled: cap.status === "active" })
            .eq("stripe_account_id", acctId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object;
        const email = inv.customer_email || (await emailFromCustomer(inv.customer));
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
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const email = await emailFromCustomer(sub.customer);
        if (email) {
          const active = sub.status === "active" || sub.status === "trialing";
          await upsert(email, {
            subscribed: active,
            subscription_tier: active ? "Pro" : null,
            stripe_customer_id: sub.customer,
            subscription_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const o = event.data.object;
        const email = o.customer_email || (await emailFromCustomer(o.customer));
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

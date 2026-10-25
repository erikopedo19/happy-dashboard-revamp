// Stripe webhook — verifies signature with STRIPE_WEBHOOK_SECRET only.
// Updates `subscribers` table on subscription lifecycle events.
// No STRIPE_SECRET_KEY required.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { stripeRequest, syncSubscription, cancellationEmail, sendBillingEmail, newestSubscription, findSubscriptions } from "../_shared/billing/service.ts";
import { isSubscriptionCheckout } from "../_shared/billing/logic.ts";
import { verifyStripeSignature } from "./signature.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Missing signature config", { status: 400 });

  const body = await req.text();
  const ok = await verifyStripeSignature(body, sig, secret);
  if (!ok) return new Response("Invalid signature", { status: 401 });

  let event;
  try { event = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const resolveSubscriber = async (object: any, sub: any) => {
    const cid = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const { data: existing, error } = await supabase.from("subscribers").select("user_id,email").eq("stripe_customer_id", cid).maybeSingle();
    if (error) throw error;
    if (existing) return existing;
    const uid = object.client_reference_id || sub.metadata?.user_id;
    if (uid) {
      const { data, error } = await supabase.auth.admin.getUserById(uid);
      if (error || !data.user?.email) throw new Error("subscriber_not_found");
      return { user_id: uid, email: data.user.email };
    }
    const customer = await stripeRequest(`/customers/${encodeURIComponent(cid)}`);
    const email = object.customer_email || customer.email;
    if (!email) throw new Error("subscriber_not_found");
    // Legacy Payment Links may not have user metadata; page through all auth users.
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (user?.email) return { user_id: user.id, email: user.email };
      if (data.users.length < 1000) break;
    }
    throw new Error("subscriber_not_found");
  };

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed": {
        const s = event.data.object;
        // Marketplace (Connect) checkout — booking / product sale, not a subscription.
        if (s.metadata?.lovable_kind === "marketplace") {
          const paid = s.payment_status === "paid";
          const { data: paymentRows, error: paymentError } = await supabase
            .from("payments")
            .update({
              status: event.type === "checkout.session.async_payment_failed" ? "failed" : paid ? "paid" : "pending",
              amount_subtotal: s.amount_subtotal ?? 0,
              amount_tax: s.total_details?.amount_tax ?? 0,
              amount_total: s.amount_total ?? 0,
              currency: (s.currency ?? "eur").toLowerCase(),
              stripe_payment_intent_id: s.payment_intent ?? null,
              customer_email: s.customer_details?.email ?? s.customer_email ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_session_id", s.id)
            .select("appointment_id, amount_total");

          if (paymentError) throw paymentError;

          // Mark the linked appointment as paid so it shows as paid on the agenda.
          const appointmentId = paymentRows?.[0]?.appointment_id ?? s.metadata?.appointment_id ?? null;
          if (paid && appointmentId) {
            const { error: appointmentError } = await supabase
              .from("appointments")
              .update({
                payment_status: "paid",
                paid_at: new Date().toISOString(),
                paid_amount: (s.amount_total ?? 0) / 100,
                updated_at: new Date().toISOString(),
              })
              .eq("id", appointmentId);
            if (appointmentError) throw appointmentError;
          }
          break;
        }

        if (isSubscriptionCheckout({ ...s, status: s.status ?? "complete" }) && s.subscription) {
          const sub = await stripeRequest(`/subscriptions/${encodeURIComponent(s.subscription)}`);
          const owner = await resolveSubscriber(s, sub);
          await syncSubscription(supabase, owner.user_id, owner.email, sub);
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

      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const object = event.data.object;
        const subscriptionEvent = event.type.startsWith("customer.subscription.");
        const sid = subscriptionEvent ? object.id : object.subscription ?? object.parent?.subscription_details?.subscription;
        // Ignore one-time invoices and marketplace sales.
        if (!sid) break;
        const sub = await stripeRequest(`/subscriptions/${encodeURIComponent(typeof sid === "string" ? sid : sid.id)}`);
        const owner = await resolveSubscriber(object, sub);
        const fields = await syncSubscription(supabase, owner.user_id, owner.email, sub);
        if (event.type === "invoice.payment_failed") {
          const { error } = await supabase.from("subscribers").update({ payment_failed_at: new Date().toISOString() }).eq("user_id", owner.user_id);
          if (error) throw error;
        }
        if ((event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") && object.paid && ['subscription_create', 'subscription_cycle'].includes(object.billing_reason)) {
          await sendBillingEmail(supabase, owner.user_id, owner.email, `invoice:${object.id}`, "renewal", fields.subscription_end, (object.amount_paid ?? 0) / 100, (object.currency ?? "eur").toUpperCase());
        }
        if (subscriptionEvent) await cancellationEmail(supabase, owner.user_id, owner.email, sub, fields.subscription_end);
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

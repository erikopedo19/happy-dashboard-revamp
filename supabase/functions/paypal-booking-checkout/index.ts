// PayPal booking payments. The client pays the barber's OWN PayPal account directly
// ("pay another account"): Cutzioo's PayPal app runs checkout but never holds the money.
// Actions: create (start checkout) | capture (after the buyer approves) | cancel.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { isAllowedReturnOrigin, PAYPAL_CURRENCIES, toMinor, toPayPalAmount, verifyCapture } from "./logic.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/paypal";
const TERMS_VERSION = "2026-11-22";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

class PayPalError extends Error {
  constructor(public status: number, public body: string) { super(`PayPal ${status}: ${body}`); }
}

async function paypal(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const paypalKey = Deno.env.get("PAYPAL_API_KEY");
  if (!lovableKey || !paypalKey) throw new Error("PayPal is not configured");
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": paypalKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`PayPal ${path} failed [${res.status}]: ${text}`);
    throw new PayPalError(res.status, text);
  }
  return text ? JSON.parse(text) : {};
}

const CreateSchema = z.object({
  action: z.literal("create"),
  business_id: z.string().uuid(),
  appointment_id: z.string().uuid(),
  customer_email: z.string().trim().email().max(255),
  customer_name: z.string().trim().min(1).max(120).optional(),
  terms_accepted: z.literal(true),
  return_path: z.string().max(300).regex(/^\/[^\s]*$/),
  return_origin: z.string().url().max(200),
});
const OrderSchema = z.object({
  action: z.enum(["capture", "cancel"]),
  order_id: z.string().trim().min(5).max(64).regex(/^[A-Z0-9]+$/),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  try {
    const raw = await req.json().catch(() => ({}));

    if (raw?.action === "create") {
      const parsed = CreateSchema.safeParse(raw);
      if (!parsed.success) return json({ error: "invalid_request", details: parsed.error.flatten().fieldErrors }, 400);
      const b = parsed.data;
      const origin = new URL(b.return_origin).origin;
      if (!isAllowedReturnOrigin(origin)) return json({ error: "invalid_return_url" }, 400);

      const { data: profile } = await admin
        .from("profiles")
        .select("id, currency, business_name, full_name, paypal_email, paypal_enabled")
        .eq("id", b.business_id)
        .maybeSingle();
      if (!profile?.paypal_enabled || !profile.paypal_email) {
        return json({ error: "paypal_not_set_up", message: "This barber doesn't accept PayPal yet." }, 409);
      }
      const currency = String(profile.currency || "EUR").toUpperCase();
      if (!PAYPAL_CURRENCIES.has(currency)) {
        return json({ error: "currency_unsupported", message: `PayPal can't take payments in ${currency}.` }, 409);
      }

      // The price always comes from the saved booking (all services, loyalty discount), never from the browser.
      const { data: appt } = await admin
        .from("appointments")
        .select("id, user_id, service_id, price, status, payment_status, services(name, price)")
        .eq("id", b.appointment_id)
        .maybeSingle();
      if (!appt || appt.user_id !== b.business_id) return json({ error: "booking_not_found", message: "Booking not found." }, 404);
      if (appt.status === "cancelled") return json({ error: "booking_cancelled", message: "This booking was cancelled." }, 409);
      if (appt.payment_status === "paid") return json({ error: "already_paid", message: "This booking is already paid." }, 409);
      const service = (appt as any).services;
      const amount = Number(appt.price ?? service?.price ?? 0);
      if (!(amount >= 1)) return json({ error: "price_missing", message: "This booking has no price to pay online." }, 400);
      const label = String(service?.name ?? "Booking").slice(0, 120);
      const value = toPayPalAmount(amount, currency);
      const shopName = String(profile.business_name || profile.full_name || "Cutzioo").slice(0, 120);

      const { data: payment, error: insertError } = await admin
        .from("payments")
        .insert({
          business_id: b.business_id,
          kind: "booking",
          provider: "paypal",
          service_id: appt.service_id,
          appointment_id: appt.id,
          quantity: 1,
          description: label,
          customer_name: b.customer_name ?? null,
          customer_email: b.customer_email,
          currency: currency.toLowerCase(),
          amount_subtotal: toMinor(amount, currency),
          amount_total: toMinor(amount, currency),
          application_fee_amount: 0,
          paypal_payee_email: profile.paypal_email,
          status: "pending",
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
        })
        .select("id")
        .single();
      if (insertError || !payment) throw insertError ?? new Error("payment_insert_failed");

      const back = `${origin}${b.return_path}`;
      const sep = back.includes("?") ? "&" : "?";
      const order = await paypal("/v2/checkout/orders", {
        method: "POST",
        headers: { "PayPal-Request-Id": `cutzioo-order-${payment.id}`, Prefer: "return=representation" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: appt.id,
            custom_id: payment.id,
            invoice_id: `cutzioo-${payment.id}`,
            description: `${label} · ${shopName}`.slice(0, 127),
            amount: { currency_code: currency, value },
            payee: { email_address: profile.paypal_email },
          }],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: shopName.slice(0, 127),
                user_action: "PAY_NOW",
                shipping_preference: "NO_SHIPPING",
                return_url: `${back}${sep}paypal=return`,
                cancel_url: `${back}${sep}paypal=cancel`,
              },
            },
          },
        }),
      });
      const approve = (order.links ?? []).find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href;
      await admin.from("payments").update({ paypal_order_id: order.id, updated_at: new Date().toISOString() }).eq("id", payment.id);
      if (!approve) return json({ error: "paypal_unavailable", message: "PayPal didn't return a payment page." }, 502);
      return json({ url: approve, order_id: order.id });
    }

    const parsed = OrderSchema.safeParse(raw);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);
    const { action, order_id } = parsed.data;

    const { data: payment } = await admin
      .from("payments")
      .select("id, status, appointment_id, currency, amount_total, paypal_payee_email")
      .eq("paypal_order_id", order_id)
      .eq("provider", "paypal")
      .maybeSingle();
    if (!payment) return json({ error: "payment_not_found" }, 404);
    if (payment.status === "paid") return json({ status: "paid" });

    if (action === "cancel") {
      if (payment.status === "pending") {
        await admin.from("payments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", payment.id);
      }
      return json({ status: "cancelled" });
    }

    let order: any;
    try {
      order = await paypal(`/v2/checkout/orders/${order_id}/capture`, {
        method: "POST",
        headers: { "PayPal-Request-Id": `cutzioo-capture-${payment.id}`, Prefer: "return=representation" },
      });
    } catch (e) {
      if (e instanceof PayPalError && e.status === 422 && e.body.includes("ORDER_ALREADY_CAPTURED")) {
        order = await paypal(`/v2/checkout/orders/${order_id}`);
      } else if (e instanceof PayPalError && e.status === 422) {
        const declined = e.body.includes("INSTRUMENT_DECLINED");
        await admin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", payment.id);
        return json({ status: "failed", reason: declined ? "declined" : "not_approved" }, 402);
      } else {
        throw e;
      }
    }

    const currency = String(payment.currency).toUpperCase();
    const minorFactor = ["HUF"].includes(currency) ? 1 : 100;
    const expected = toPayPalAmount(payment.amount_total / minorFactor, currency);
    const check = verifyCapture(order, { value: expected, currency, payeeEmail: payment.paypal_payee_email ?? "" });
    if (!check.ok) {
      console.error("PayPal capture rejected", order_id, check.reason);
      await admin.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", payment.id);
      return json({ status: "failed", reason: check.reason }, 402);
    }

    const now = new Date().toISOString();
    const payer = order.payer?.email_address ?? null;
    await admin.from("payments").update({
      status: "paid",
      paypal_capture_id: check.captureId,
      ...(payer ? { customer_email: payer } : {}),
      updated_at: now,
    }).eq("id", payment.id);
    if (payment.appointment_id) {
      await admin.from("appointments").update({
        payment_status: "paid",
        paid_at: now,
        paid_amount: payment.amount_total / minorFactor,
        updated_at: now,
      }).eq("id", payment.appointment_id);
    }
    return json({ status: "paid" });
  } catch (e) {
    console.error("paypal-booking-checkout error:", e);
    if (e instanceof PayPalError) return json({ error: "paypal_error", status: e.status, details: e.body.slice(0, 800) }, 502);
    return json({ error: "paypal_unavailable", message: "PayPal checkout couldn't start. Please try again." }, 500);
  }
});

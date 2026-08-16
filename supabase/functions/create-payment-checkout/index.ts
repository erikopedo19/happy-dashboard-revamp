// Creates a Stripe Checkout Session for a booking or a product sale.
// - Money is routed to the owner's connected Stripe account (destination charge)
// - A flat 25-minor-unit platform fee is deducted from the owner's payout
// - Stripe Tax calculates sales tax from the buyer's location (separate line)
// - Terms of Service + Privacy Policy acceptance is mandatory
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_API = "https://api.stripe.com/v1";

/** Flat platform fee in the smallest currency unit (e.g. 25 = $0.25 / €0.25). */
export const PLATFORM_FEE_MINOR = 25;
const TERMS_VERSION = "2026-08-14";

const BodySchema = z.object({
  business_id: z.string().uuid(),
  kind: z.enum(["booking", "product"]),
  product_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  appointment_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  customer_name: z.string().trim().min(1).max(120).optional(),
  customer_email: z.string().trim().email().max(255),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy." }),
  }),
  success_url: z.string().url().max(500),
  cancel_url: z.string().url().max(500),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function stripe(path: string, params: URLSearchParams) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
    },
    body: params,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Stripe ${path} failed [${res.status}]: ${text}`);
    throw new Error(`[${res.status}]: ${text}`);
  }
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!STRIPE_SECRET_KEY) return json({ error: "Payments are not configured." }, 500);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const b = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, currency, business_name, full_name, stripe_account_id, stripe_charges_enabled, payments_enabled")
      .eq("id", b.business_id)
      .maybeSingle();

    if (!profile) return json({ error: "Business not found." }, 404);
    if (!profile.stripe_account_id || !profile.stripe_charges_enabled) {
      return json({ error: "This business has not finished setting up online payments yet." }, 409);
    }

    const currency = String(profile.currency || "eur").toLowerCase();

    // Price and label are always resolved server-side — never trusted from the client.
    let unitAmount = 0;
    let label = "";
    let taxCode = "txcd_99999999"; // General - Tangible Goods

    if (b.kind === "product") {
      if (!b.product_id) return json({ error: "product_id is required." }, 400);
      const { data: product } = await admin
        .from("products")
        .select("id, name, price, is_active, user_id, stock")
        .eq("id", b.product_id)
        .maybeSingle();
      if (!product || product.user_id !== b.business_id || product.is_active === false) {
        return json({ error: "Product is not available." }, 404);
      }
      if (typeof product.stock === "number" && product.stock < b.quantity) {
        return json({ error: "Not enough stock available." }, 409);
      }
      unitAmount = Math.round(Number(product.price) * 100);
      label = product.name;
    } else {
      if (!b.service_id) return json({ error: "service_id is required." }, 400);
      const { data: service } = await admin
        .from("services")
        .select("id, name, price, user_id, deleted_at")
        .eq("id", b.service_id)
        .maybeSingle();
      if (!service || service.user_id !== b.business_id || service.deleted_at) {
        return json({ error: "Service is not available." }, 404);
      }
      unitAmount = Math.round(Number(service.price ?? 0) * 100);
      label = service.name;
      taxCode = "txcd_20030000"; // General - Services
    }

    if (!unitAmount || unitAmount < 100) {
      return json({ error: "This item cannot be paid online (price is missing or too low)." }, 400);
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("customer_email", b.customer_email);
    params.append("success_url", b.success_url);
    params.append("cancel_url", b.cancel_url);
    params.append("line_items[0][quantity]", String(b.quantity));
    params.append("line_items[0][price_data][currency]", currency);
    params.append("line_items[0][price_data][unit_amount]", String(unitAmount));
    // "exclusive" makes Stripe Tax show tax as its own line on top of the price.
    params.append("line_items[0][price_data][tax_behavior]", "exclusive");
    params.append("line_items[0][price_data][product_data][name]", label);
    params.append("line_items[0][price_data][product_data][tax_code]", taxCode);
    // Stripe Tax: rate is derived from the buyer's address collected at checkout.
    params.append("automatic_tax[enabled]", "true");
    params.append("automatic_tax[liability][type]", "self");
    params.append("billing_address_collection", "required");
    params.append("tax_id_collection[enabled]", "true");
    // Destination charge: the owner gets the payout, we keep a flat platform fee.
    params.append("payment_intent_data[application_fee_amount]", String(PLATFORM_FEE_MINOR));
    params.append("payment_intent_data[transfer_data][destination]", profile.stripe_account_id);
    params.append(
      "payment_intent_data[description]",
      `${label} — ${profile.business_name || profile.full_name || "Cutzioo"}`,
    );
    params.append("metadata[lovable_kind]", "marketplace");
    params.append("metadata[business_id]", b.business_id);
    params.append("metadata[terms_version]", TERMS_VERSION);

    const session = await stripe("/checkout/sessions", params);

    await admin.from("payments").insert({
      business_id: b.business_id,
      kind: b.kind,
      product_id: b.product_id ?? null,
      service_id: b.service_id ?? null,
      appointment_id: b.appointment_id ?? null,
      quantity: b.quantity,
      description: label,
      customer_name: b.customer_name ?? null,
      customer_email: b.customer_email,
      currency,
      amount_subtotal: unitAmount * b.quantity,
      amount_total: unitAmount * b.quantity,
      application_fee_amount: PLATFORM_FEE_MINOR,
      stripe_session_id: session.id,
      stripe_account_id: profile.stripe_account_id,
      status: "pending",
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    });

    return json({ url: session.url, session_id: session.id });
  } catch (e) {
    console.error("create-payment-checkout error:", e);
    return json({ error: "Could not start checkout.", details: String((e as Error).message ?? e) }, 500);
  }
});

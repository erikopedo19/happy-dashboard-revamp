// Boost your barbershop — €3 one-off Stripe payment that sends a short
// "time for a haircut" reminder to up to 25 past clients.
/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const SENDER_EMAIL = "hello@cutzioo.com";
const SENDER_NAME = "Cutzioo";
const APP_URL = "https://cutzioo.com";
const LOGO_URL =
  "https://cutzioo.com/__l5e/assets-v1/73db5242-2eb7-4a09-ae43-1ef5358c6085/cutzioo-check.png";
const MAX_EMAILS = 25;
const BOOST_PRICE_CENTS = 300;

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

function reminderHtml(opts: { name: string; shop: string; url: string }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:24px;border:1px solid #e5e5ea;">
      <tr><td style="padding:32px 32px 0;">
        <img src="${LOGO_URL}" width="34" height="34" alt="" style="display:block;border:0;border-radius:10px;" />
      </td></tr>
      <tr><td style="padding:20px 32px 0;">
        <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;">Time for a fresh cut, ${esc(
          opts.name
        )}?</h1>
      </td></tr>
      <tr><td style="padding:14px 32px 0;font-size:15px;line-height:1.7;color:#48484a;">
        It's been a while since your last visit to <strong>${esc(opts.shop)}</strong>.
        Grab a slot that suits you — booking takes about 20 seconds.
      </td></tr>
      <tr><td style="padding:26px 32px 8px;">
        <a href="${opts.url}" style="display:block;text-align:center;background:#1c1c1e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 24px;border-radius:14px;">Book your appointment</a>
      </td></tr>
      <tr><td style="padding:18px 32px 34px;text-align:center;font-size:12px;line-height:1.6;color:#a1a1a6;">
        You're receiving this because you have booked with ${esc(opts.shop)} before.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // --- auth ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (!STRIPE_SECRET_KEY.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ error: "Payments are not configured yet. Add a valid Stripe secret key." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    // --- 1. create the €3 checkout session ---
    if (action === "checkout") {
      const origin = String(body?.origin ?? APP_URL).replace(/\/$/, "");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: BOOST_PRICE_CENTS,
              product_data: {
                name: "Boost your barbershop",
                description: `Reminder email to up to ${MAX_EMAILS} past clients`,
              },
            },
          },
        ],
        customer_email: user.email ?? undefined,
        metadata: { kind: "boost", user_id: user.id },
        success_url: `${origin}/settings?boost_session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/settings?boost=cancelled`,
      });

      await admin.from("boost_campaigns").insert({
        user_id: user.id,
        stripe_session_id: session.id,
        status: "pending",
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 2. verify payment and send the reminders (idempotent) ---
    if (action === "claim") {
      const sessionId = String(body?.session_id ?? "");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "session_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: campaign } = await admin
        .from("boost_campaigns")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!campaign) {
        return new Response(JSON.stringify({ error: "Boost not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (campaign.status === "sent") {
        return new Response(
          JSON.stringify({ ok: true, alreadySent: true, sent: campaign.emails_sent }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ error: "Payment not completed" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // reserve so a double click cannot send twice
      const { data: reserved } = await admin
        .from("boost_campaigns")
        .update({ status: "sending" })
        .eq("id", campaign.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!reserved) {
        return new Response(JSON.stringify({ ok: true, alreadySent: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("business_name, full_name, booking_link")
        .eq("id", user.id)
        .maybeSingle();

      const shop = profile?.business_name || profile?.full_name || "your barber";
      const bookingUrl = profile?.booking_link ? `${APP_URL}/${profile.booking_link}` : APP_URL;

      const { data: customers } = await admin
        .from("customers")
        .select("name, email, created_at")
        .eq("user_id", user.id)
        .not("email", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      const seen = new Set<string>();
      const recipients = (customers ?? [])
        .filter((c: any) => {
          const e = String(c.email ?? "").trim().toLowerCase();
          if (!e || !e.includes("@") || seen.has(e)) return false;
          seen.add(e);
          return true;
        })
        .slice(0, MAX_EMAILS);

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
      let sent = 0;

      if (LOVABLE_API_KEY && BREVO_API_KEY) {
        for (const c of recipients) {
          const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": BREVO_API_KEY,
            },
            body: JSON.stringify({
              sender: { name: SENDER_NAME, email: SENDER_EMAIL },
              to: [{ email: c.email }],
              subject: `Ready for your next cut at ${shop}?`,
              htmlContent: reminderHtml({
                name: (c.name || "there").split(" ")[0],
                shop,
                url: bookingUrl,
              }),
            }),
          });
          if (res.ok) sent++;
          else console.error("Brevo send failed", res.status, await res.text());
        }
      } else {
        console.error("Missing LOVABLE_API_KEY or BREVO_API_KEY — cannot send boost emails");
      }

      await admin
        .from("boost_campaigns")
        .update({ status: "sent", emails_sent: sent, completed_at: new Date().toISOString() })
        .eq("id", campaign.id);

      return new Response(JSON.stringify({ ok: true, sent, total: recipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("boost-barbershop error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

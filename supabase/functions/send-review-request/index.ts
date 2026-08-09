// Sends automated review-request emails for premium barbers who enabled the feature.
// Invoked on a schedule by pg_cron. Idempotent per appointment.
// Uses the Brevo connector via the Lovable gateway (same setup as send-booking-confirmation).
/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const SENDER_EMAIL = "booking@cutzioo.com";
const SENDER_FALLBACK_NAME = "Cutzio";
const APP_URL = "https://cutzioo.com";

type Candidate = {
  appointment_id: string;
  business_id: string;
  cancel_token: string;
  customer_email: string;
  customer_name: string | null;
  service_name: string | null;
  appointment_date: string;
  appointment_time: string;
  business_name: string;
  brand_color: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function renderEmail(c: Candidate) {
  const link = `${APP_URL}/review/${c.cancel_token}`;
  const accent = c.brand_color || "#0A84FF";
  const svc = c.service_name ? ` for your ${escapeHtml(c.service_name)}` : "";
  const name = c.customer_name ? escapeHtml(c.customer_name.split(" ")[0]) : "there";
  const biz = escapeHtml(c.business_name);
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<a href="${link}?rating=${n}" style="display:inline-block;margin:0 3px;padding:8px 10px;text-decoration:none;font-size:22px;color:#c7c7cc;">★</a>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e5ea;">
      <tr><td style="padding:36px 32px 8px;text-align:center;">
        <div style="font-size:12px;color:#8e8e93;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;margin-bottom:10px;">Feedback</div>
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#1c1c1e;letter-spacing:-0.01em;">How was your visit?</h1>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#48484a;text-align:center;">
          Hi ${name}, thanks for choosing <strong style="color:#1c1c1e;">${biz}</strong>${svc}. Your feedback takes 10 seconds and really helps.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 4px;text-align:center;">
        ${stars}
      </td></tr>
      <tr><td style="padding:12px 32px 28px;text-align:center;">
        <a href="${link}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:14px;">Leave a review</a>
      </td></tr>
      <tr><td style="padding:0 32px 28px;text-align:center;">
        <div style="height:1px;background:#e5e5ea;margin-bottom:16px;"></div>
        <div style="font-size:11px;color:#8e8e93;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">
          Powered by <span style="color:${accent};font-weight:700;">Cutzioo</span>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!LOVABLE_API_KEY || !BREVO_API_KEY || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Brevo connector or Supabase env not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  async function sendViaBrevo(to: string, toName: string, subject: string, html: string, fromName: string) {
    const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: fromName || SENDER_FALLBACK_NAME, email: SENDER_EMAIL },
        replyTo: { email: SENDER_EMAIL, name: fromName || SENDER_FALLBACK_NAME },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // Test mode
  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }
  if (body?.test && body?.to) {
    const sample: Candidate = {
      appointment_id: "00000000-0000-0000-0000-000000000000",
      business_id: "00000000-0000-0000-0000-000000000000",
      cancel_token: "test-token",
      customer_email: body.to,
      customer_name: body.name || "there",
      service_name: body.service_name || "Haircut",
      appointment_date: new Date().toISOString().slice(0, 10),
      appointment_time: "12:00:00",
      business_name: body.business_name || "Cutzio Test",
      brand_color: body.brand_color || "#0A84FF",
    };
    const { ok, status, data } = await sendViaBrevo(
      body.to,
      sample.customer_name || body.to,
      `[TEST] How was your visit to ${sample.business_name}?`,
      renderEmail(sample),
      sample.business_name,
    );
    await admin.from("email_logs").insert({
      recipient_email: body.to,
      status: ok ? "sent" : `brevo_${status}`,
      error_message: ok ? null : JSON.stringify(data).slice(0, 500),
      email_type: "review_request_test",
    });
    return new Response(JSON.stringify({ test: true, ok, status, data }), {
      status: ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: candidates, error: candErr } = await admin.rpc("get_pending_review_requests");
  if (candErr) {
    return new Response(JSON.stringify({ error: candErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (candidates || []) as any[];
  if (rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter to premium subscribers only.
  const businessIds = Array.from(new Set(rows.map((r) => r.business_id)));
  const { data: subs } = await admin
    .from("subscribers")
    .select("user_id, subscribed, subscription_end")
    .in("user_id", businessIds);

  const now = Date.now();
  const premium = new Set(
    (subs || [])
      .filter((s: any) => s.subscribed && (!s.subscription_end || new Date(s.subscription_end).getTime() > now))
      .map((s: any) => s.user_id),
  );

  let sent = 0;
  let failed = 0;

  for (const c of rows as Candidate[]) {
    if (!premium.has(c.business_id)) continue;
    try {
      const { ok, status, data } = await sendViaBrevo(
        c.customer_email,
        c.customer_name || c.customer_email,
        `How was your visit to ${c.business_name}?`,
        renderEmail(c),
        c.business_name,
      );

      if (!ok) {
        failed++;
        await admin.from("email_logs").insert({
          recipient_email: c.customer_email,
          status: `brevo_${status}`,
          error_message: JSON.stringify(data).slice(0, 500),
          email_type: "review_request",
        });
        continue;
      }

      await admin.rpc("mark_review_email_sent", { _appointment_id: c.appointment_id });
      await admin.from("email_logs").insert({
        recipient_email: c.customer_email,
        status: "sent",
        email_type: "review_request",
      });
      sent++;
    } catch (e) {
      failed++;
      await admin.from("email_logs").insert({
        recipient_email: c.customer_email,
        status: "error",
        error_message: String((e as Error).message).slice(0, 500),
        email_type: "review_request",
      });
    }
  }

  return new Response(JSON.stringify({ sent, failed, considered: rows.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

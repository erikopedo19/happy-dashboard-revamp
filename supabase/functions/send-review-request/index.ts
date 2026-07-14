// Sends automated review-request emails for premium barbers who enabled the feature.
// Invoked on a schedule by pg_cron (see setup SQL). Idempotent per appointment.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  sender_email: string;
  sender_name: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const renderEmail = (c: Candidate) => {
  const link = `${APP_URL}/review/${c.cancel_token}`;
  const brand = c.brand_color || "#e0c4a8";
  const svc = c.service_name ? ` for your ${escapeHtml(c.service_name)}` : "";
  const name = c.customer_name ? escapeHtml(c.customer_name.split(" ")[0]) : "there";
  const biz = escapeHtml(c.business_name);
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1c1e">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06)">
        <tr><td style="background:${brand};padding:32px;text-align:center;color:#ffffff">
          <h1 style="margin:0;font-size:22px;font-weight:700">How was your visit?</h1>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 12px;font-size:16px">Hi ${name},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3a3a3c">
            Thanks for choosing <strong>${biz}</strong>${svc}. Your feedback helps them improve and helps other clients pick with confidence. It only takes 10 seconds.
          </p>
          <p style="text-align:center;margin:28px 0">
            <a href="${link}" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:600;font-size:15px">Rate your visit</a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#8e8e93;text-align:center">
            Or paste this link into your browser:<br/><a href="${link}" style="color:#8e8e93;word-break:break-all">${link}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;text-align:center;color:#8e8e93;font-size:11px">
          Sent by ${biz} · powered by Cutzioo
        </td></tr>
      </table>
    </td></tr></table></body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!resendKey || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Test mode: send a sample review email to a specified address.
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
      business_name: body.business_name || "Cutzioo Test",
      brand_color: body.brand_color || "#e0c4a8",
      sender_email: "noreply@cutzioo.com",
      sender_name: body.business_name || "Cutzioo",
    };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${sample.sender_name} <${sample.sender_email}>`,
        to: [body.to],
        subject: `[TEST] How was your visit to ${sample.business_name}?`,
        html: renderEmail(sample),
      }),
    });
    const text = await res.text();
    await admin.from("email_logs").insert({
      recipient_email: body.to,
      status: res.ok ? "sent" : `resend_${res.status}`,
      error_message: res.ok ? null : text.slice(0, 500),
      email_type: "review_request_test",
    });
    return new Response(JSON.stringify({ test: true, ok: res.ok, status: res.status, body: text.slice(0, 500) }), {
      status: res.ok ? 200 : 500,
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

  const rows = (candidates || []) as Candidate[];
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

  for (const c of rows) {
    if (!premium.has(c.business_id)) continue;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${c.sender_name} <${c.sender_email}>`,
          to: [c.customer_email],
          subject: `How was your visit to ${c.business_name}?`,
          html: renderEmail(c),
        }),
      });

      if (!res.ok) {
        failed++;
        const body = await res.text();
        await admin.from("email_logs").insert({
          recipient_email: c.customer_email,
          status: `resend_${res.status}`,
          error_message: body.slice(0, 500),
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

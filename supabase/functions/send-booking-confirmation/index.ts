/* eslint-disable */
declare const Deno: {
  env: { get(key: string): string | undefined };
};

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

function render(template: string, vars: Record<string, string | number | undefined>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Brevo connector not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    const body = await req.json();
    const {
      userId,
      customerEmail,
      customerName,
      customerPhone,
      businessName,
      serviceName,
      appointmentDate,
      appointmentTime,
      price,
      notes,
      bookingId,
      accentColor,
      stylistName,
      stylistTitle,
      senderEmail,
      senderName,
    } = body;

    if (!businessName || !serviceName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Load user's customizable template if present
    let template: any = null;
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await supabase
        .from("message_templates")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      template = data;
    }

    if (template && template.enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vars = {
      customerName: customerName || "there",
      customerEmail,
      customerPhone,
      businessName,
      serviceName,
      appointmentDate,
      appointmentTime,
      price,
      stylistName,
    };

    const subject = render(
      template?.email_subject || "Booking Confirmation - {{businessName}}",
      vars,
    );
    const bodyText = render(
      template?.email_body ||
        "Hi {{customerName}}, your {{serviceName}} appointment with {{businessName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}.",
      vars,
    );
    const smsText = render(
      template?.sms_body ||
        "{{businessName}}: Your {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} is confirmed.",
      vars,
    );
    const accent = template?.accent_color || accentColor || "#2563eb";

    const fromEmail = senderEmail || "noreply@cutzioo.com";
    const fromName = senderName || businessName;

    // Wrap user's plaintext body in nice HTML shell
    const htmlBody = escapeHtml(bodyText).replace(/\n/g, "<br>");
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
  <tr><td style="background:${accent};padding:36px 30px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(businessName)}</h1>
  </td></tr>
  <tr><td style="padding:36px 30px;color:#1d1d1f;font-size:15px;line-height:1.6;">
    ${htmlBody}
    ${bookingId ? `<p style="margin:24px 0 0 0;padding-top:18px;border-top:1px solid #e5e5e7;color:#86868b;font-size:12px;">Booking Reference: #${escapeHtml(String(bookingId))}</p>` : ""}
  </td></tr>
  <tr><td style="padding:24px;text-align:center;border-top:1px solid #e5e5e7;">
    <p style="margin:0;color:#86868b;font-size:12px;">Sent by ${escapeHtml(fromName)}</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    const results: { email?: any; sms?: any } = {};

    if (customerEmail) {
      const emailRes = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: customerEmail, name: customerName || customerEmail }],
          subject,
          htmlContent: html,
          textContent: bodyText,
        }),
      });
      const emailData = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.error("Brevo email failed:", emailRes.status, emailData);
        results.email = { error: emailData };
      } else {
        results.email = emailData;
      }
    }

    if (customerPhone) {
      const smsRes = await fetch(`${GATEWAY_URL}/transactionalSMS/sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: (fromName || "Booking").substring(0, 11),
          recipient: customerPhone,
          content: smsText,
          type: "transactional",
        }),
      });
      const smsData = await smsRes.json().catch(() => ({}));
      if (!smsRes.ok) {
        console.error("Brevo SMS failed:", smsRes.status, smsData);
        results.sms = { error: smsData };
      } else {
        results.sms = smsData;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

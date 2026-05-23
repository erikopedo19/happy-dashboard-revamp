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

function render(t: string, v: Record<string, any>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (v[k] == null ? "" : String(v[k])));
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildHtml(opts: {
  businessName: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  price?: number | string | null;
  notes?: string | null;
  manageUrl?: string | null;
  accent: string;
  bookingId?: string;
}) {
  const {
    businessName, customerName, serviceName, appointmentDate, appointmentTime,
    price, notes, manageUrl, accent, bookingId,
  } = opts;

  const cancelUrl = manageUrl ? `${manageUrl}` : "";
  const rescheduleUrl = manageUrl ? `${manageUrl}` : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e5e5ea;box-shadow:0 20px 60px rgba(0,0,0,0.08);">
      <!-- Header -->
      <tr><td style="padding:36px 32px 24px;text-align:center;background:linear-gradient(135deg, #fff0f3 0%, #ffffff 60%);">
        <div style="display:inline-block;width:64px;height:64px;border-radius:20px;background:${accent};color:#ffffff;font-size:26px;font-weight:700;line-height:64px;text-align:center;margin-bottom:16px;box-shadow:0 8px 24px ${accent}44;">
          ${escapeHtml(businessName.charAt(0).toUpperCase())}
        </div>
        <div style="font-size:12px;color:#8e8e93;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;font-weight:600;">Booking Confirmed</div>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#1c1c1e;letter-spacing:-0.02em;line-height:1.3;">${escapeHtml(businessName)}</h1>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:8px 32px 4px;">
        <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#48484a;">
          Hi <strong style="color:#1c1c1e;">${escapeHtml(customerName || "there")}</strong>, your appointment is all set. We look forward to seeing you.
        </p>
      </td></tr>

      <!-- Details Card -->
      <tr><td style="padding:0 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;border:1px solid #e5e5ea;border-radius:20px;overflow:hidden;">
          <tr><td style="padding:20px 22px;border-bottom:1px solid #e5e5ea;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Service</div>
            <div style="font-size:17px;font-weight:600;color:#1c1c1e;">${escapeHtml(serviceName)}${price != null ? ` <span style="color:${accent};font-weight:700;">· €${escapeHtml(String(price))}</span>` : ""}</div>
          </td></tr>
          <tr>
            <td style="padding:20px 22px;width:50%;border-right:1px solid #e5e5ea;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Date</div>
              <div style="font-size:15px;font-weight:600;color:#1c1c1e;">${escapeHtml(appointmentDate)}</div>
            </td>
            <td style="padding:20px 22px;width:50%;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Time</div>
              <div style="font-size:15px;font-weight:600;color:#1c1c1e;">${escapeHtml(appointmentTime)}</div>
            </td>
          </tr>
          ${notes ? `<tr><td colspan="2" style="padding:18px 22px;border-top:1px solid #e5e5ea;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Note</div>
            <div style="font-size:14px;color:#48484a;line-height:1.5;">${escapeHtml(notes)}</div>
          </td></tr>` : ""}
        </table>
      </td></tr>

      <!-- Actions -->
      ${manageUrl ? `<tr><td style="padding:28px 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;width:50%;">
              <a href="${escapeHtml(rescheduleUrl)}" style="display:block;text-align:center;background:${accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:16px 0;border-radius:16px;box-shadow:0 4px 16px ${accent}33;">Reschedule</a>
            </td>
            <td style="padding-left:8px;width:50%;">
              <a href="${escapeHtml(cancelUrl)}" style="display:block;text-align:center;background:#f2f2f7;color:#1c1c1e;text-decoration:none;font-weight:600;font-size:14px;padding:15px 0;border-radius:16px;border:1px solid #d1d1d6;">Cancel</a>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#8e8e93;">Manage your booking anytime — no login needed.</p>
      </td></tr>` : ""}

      <!-- Divider -->
      <tr><td style="padding:24px 32px 0;">
        <div style="height:1px;background:#e5e5ea;"></div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 32px 32px;text-align:center;">
        ${bookingId ? `<span style="font-size:11px;color:#aeaeb2;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.04em;">REF · ${escapeHtml(String(bookingId).slice(0, 8))}</span>
        <div style="height:16px;"></div>` : ""}
        <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
          <div style="font-size:12px;color:#8e8e93;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">
            Powered by <span style="color:${accent};font-weight:700;">Cutzioo</span>
          </div>
          <div style="font-size:11px;color:#aeaeb2;margin-top:4px;letter-spacing:0.02em;">cutzioo.com</div>
        </a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Brevo connector not configured." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 });
    }

    const body = await req.json();
    const {
      userId, customerEmail, customerName, customerPhone, businessName, serviceName,
      appointmentDate, appointmentTime, price, notes, bookingId,
      accentColor, manageUrl, cancelToken,
    } = body;

    if (!businessName || !serviceName) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    let template: any = null;
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await supabase.from("message_templates").select("*").eq("user_id", userId).maybeSingle();
      template = data;
    }

    if (template?.enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accent = template?.accent_color || accentColor || "#e0c4a8";
    const finalManageUrl = manageUrl || (cancelToken ? `${APP_URL}/manage/${cancelToken}` : null);

    const vars = { customerName: customerName || "there", customerEmail, customerPhone, businessName, serviceName, appointmentDate, appointmentTime, price };

    const subject = render(template?.email_subject || "Your booking at {{businessName}} is confirmed", vars);
    const smsText = render(
      template?.sms_body || "{{businessName}}: {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} confirmed.",
      vars
    ) + (finalManageUrl ? ` Manage: ${finalManageUrl}` : "");

    const html = buildHtml({
      businessName, customerName: customerName || "there", serviceName,
      appointmentDate, appointmentTime, price, notes,
      manageUrl: finalManageUrl, accent, bookingId,
    });

    const textBody = `${subject}\n\nHi ${customerName || "there"},\n\n${serviceName} on ${appointmentDate} at ${appointmentTime}${price != null ? ` · €${price}` : ""}\n\n${finalManageUrl ? `Manage your booking: ${finalManageUrl}\n\n` : ""}Powered by Cutzioo — https://cutzioo.com`;

    const results: any = {};

    if (customerEmail) {
      const emailRes = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: businessName || SENDER_FALLBACK_NAME, email: SENDER_EMAIL },
          replyTo: { email: SENDER_EMAIL, name: businessName || SENDER_FALLBACK_NAME },
          to: [{ email: customerEmail, name: customerName || customerEmail }],
          subject,
          htmlContent: html,
          textContent: textBody,
        }),
      });
      const data = await emailRes.json().catch(() => ({}));
      if (!emailRes.ok) {
        console.error("Brevo email failed:", emailRes.status, data);
        results.email = { error: data, status: emailRes.status };
      } else results.email = data;
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
          sender: (businessName || "Booking").substring(0, 11),
          recipient: customerPhone,
          content: smsText,
          type: "transactional",
        }),
      });
      const data = await smsRes.json().catch(() => ({}));
      if (!smsRes.ok) results.sms = { error: data, status: smsRes.status };
      else results.sms = data;
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});

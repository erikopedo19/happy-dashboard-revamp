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
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e8e8ea;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141416;border-radius:24px;overflow:hidden;border:1px solid #25252a;">
      <tr><td style="padding:40px 32px 28px;text-align:center;background:linear-gradient(135deg, ${accent}22 0%, transparent 70%);">
        <div style="display:inline-block;width:56px;height:56px;border-radius:18px;background:${accent};color:#0a0a0b;font-size:28px;font-weight:800;line-height:56px;text-align:center;margin-bottom:18px;">
          ${escapeHtml(businessName.charAt(0).toUpperCase())}
        </div>
        <div style="font-size:13px;color:#9a9aa3;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Booking confirmed</div>
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.02em;">${escapeHtml(businessName)}</h1>
      </td></tr>

      <tr><td style="padding:8px 32px 4px;">
        <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#c8c8cf;">
          Hi <strong style="color:#fff;">${escapeHtml(customerName || "there")}</strong>, your appointment is locked in. See you soon.
        </p>
      </td></tr>

      <tr><td style="padding:0 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c20;border:1px solid #28282d;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:18px 20px;border-bottom:1px solid #28282d;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a7a83;margin-bottom:4px;">Service</div>
            <div style="font-size:16px;font-weight:600;color:#fff;">${escapeHtml(serviceName)}${price != null ? ` <span style="color:${accent};font-weight:700;">· €${escapeHtml(String(price))}</span>` : ""}</div>
          </td></tr>
          <tr>
            <td style="padding:18px 20px;width:50%;border-right:1px solid #28282d;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a7a83;margin-bottom:4px;">Date</div>
              <div style="font-size:15px;font-weight:600;color:#fff;">${escapeHtml(appointmentDate)}</div>
            </td>
            <td style="padding:18px 20px;width:50%;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a7a83;margin-bottom:4px;">Time</div>
              <div style="font-size:15px;font-weight:600;color:#fff;">${escapeHtml(appointmentTime)}</div>
            </td>
          </tr>
          ${notes ? `<tr><td colspan="2" style="padding:16px 20px;border-top:1px solid #28282d;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7a7a83;margin-bottom:4px;">Note</div>
            <div style="font-size:14px;color:#c8c8cf;">${escapeHtml(notes)}</div>
          </td></tr>` : ""}
        </table>
      </td></tr>

      ${manageUrl ? `<tr><td style="padding:24px 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:6px;width:50%;">
              <a href="${escapeHtml(rescheduleUrl)}" style="display:block;text-align:center;background:${accent};color:#0a0a0b;text-decoration:none;font-weight:700;font-size:14px;padding:15px 0;border-radius:14px;">Reschedule</a>
            </td>
            <td style="padding-left:6px;width:50%;">
              <a href="${escapeHtml(cancelUrl)}" style="display:block;text-align:center;background:transparent;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 0;border-radius:14px;border:1px solid #38383e;">Cancel</a>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#7a7a83;">Manage your booking anytime, no login needed.</p>
      </td></tr>` : ""}

      ${bookingId ? `<tr><td style="padding:18px 32px 0;text-align:center;">
        <span style="font-size:11px;color:#5a5a63;font-family:'SF Mono',Menlo,monospace;">REF · ${escapeHtml(String(bookingId).slice(0, 8))}</span>
      </td></tr>` : ""}

      <tr><td style="padding:28px 32px 32px;text-align:center;border-top:1px solid #1f1f23;">
        <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
          <img src="${APP_URL}/cutzioo-logo.webp" alt="Cutzioo" width="44" height="44" style="display:block;margin:0 auto 10px;border-radius:10px;" />
          <div style="font-size:11px;color:#8a8a93;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
            Powered by <span style="color:${accent};">Cutzioo</span>
          </div>
          <div style="font-size:10px;color:#5a5a63;margin-top:4px;">cutzioo.com</div>
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

    const textBody = `${subject}\n\nHi ${customerName || "there"},\n\n${serviceName} on ${appointmentDate} at ${appointmentTime}${price != null ? ` · €${price}` : ""}\n\n${finalManageUrl ? `Manage your booking: ${finalManageUrl}\n\n` : ""}Sent by cutzioo.com`;

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

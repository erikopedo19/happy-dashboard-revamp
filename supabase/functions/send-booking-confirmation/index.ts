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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="margin:0;padding:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1c;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e8e8ec;">

          <!-- Subtle brand mark -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="display:inline-block;width:40px;height:40px;border-radius:12px;background:${accent};opacity:0.9;"></div>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:18px 32px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:#8c8c92;">Booking confirmed</p>
              <h1 style="margin:0;font-size:26px;font-weight:650;letter-spacing:-0.02em;line-height:1.2;color:#121214;">${escapeHtml(businessName)}</h1>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding:22px 32px 0;">
              <p style="margin:0;font-size:16px;line-height:1.6;color:#4a4a50;text-align:center;">
                Hi ${escapeHtml(customerName || "there")},<br>you're booked for <strong style="color:#121214;">${escapeHtml(serviceName)}</strong>.
              </p>
            </td>
          </tr>

          <!-- Appointment card -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafb;border-radius:20px;border:1px solid #eeeff2;">
                <tr>
                  <td style="padding:22px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:0 0 14px;font-size:13px;color:#6e6e77;text-transform:uppercase;letter-spacing:0.04em;">Date</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;font-size:18px;font-weight:650;color:#121214;">${escapeHtml(appointmentDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 14px;font-size:13px;color:#6e6e77;text-transform:uppercase;letter-spacing:0.04em;">Time</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;font-size:18px;font-weight:650;color:#121214;">${escapeHtml(appointmentTime)}</td>
                      </tr>
                      ${price != null ? `<tr>
                        <td style="padding:0 0 14px;font-size:13px;color:#6e6e77;text-transform:uppercase;letter-spacing:0.04em;">Price</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;font-size:18px;font-weight:650;color:${accent};">€${escapeHtml(String(price))}</td>
                      </tr>` : ""}
                      ${notes ? `<tr>
                        <td style="padding:0 0 8px;font-size:13px;color:#6e6e77;text-transform:uppercase;letter-spacing:0.04em;">Note</td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;color:#3a3a3f;line-height:1.55;">${escapeHtml(notes)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Actions -->
          ${manageUrl ? `<tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 8px;">
                    <a href="${escapeHtml(rescheduleUrl)}" style="display:block;text-align:center;background:#121214;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 0;border-radius:14px;">Reschedule</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <a href="${escapeHtml(cancelUrl)}" style="display:block;text-align:center;background:#ffffff;color:#ff3b30;text-decoration:none;font-weight:600;font-size:15px;padding:14px 0;border-radius:14px;border:1px solid #e8e8ec;">Cancel</a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#8c8c92;">No login needed.</p>
            </td>
          </tr>` : ""}

          <!-- Divider & footer -->
          <tr>
            <td style="padding:30px 32px 32px;text-align:center;">
              <div style="height:1px;background:#eeeff2;margin-bottom:22px;"></div>
              ${bookingId ? `<div style="font-size:11px;color:#9a9aa2;font-family:'SF Mono',SFMono-Regular,monospace;letter-spacing:0.04em;margin-bottom:10px;">REF · ${escapeHtml(String(bookingId).slice(0, 8))}</div>` : ""}
              <a href="${APP_URL}" style="text-decoration:none;font-size:11px;color:#8c8c92;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">
                Powered by <span style="color:${accent};font-weight:700;">Cutzioo</span>
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    const { cancelToken, accentColor } = body as { cancelToken?: string; accentColor?: string };

    if (!cancelToken) {
      return new Response(JSON.stringify({ success: false, error: "cancelToken required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfigured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authenticate the caller by validating the cancel token against the database.
    // Use the DB row as the source of truth for all email/SMS fields — never trust caller input.
    const { data: apptRow, error: apptErr } = await supabase
      .from("appointments")
      .select("id, user_id, appointment_date, appointment_time, price, notes, customer_id, service_id, created_at")
      .eq("cancel_token", cancelToken)
      .maybeSingle();

    if (apptErr || !apptRow) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    // Only allow sending for freshly-created bookings (the trigger fires immediately).
    const createdMs = new Date(apptRow.created_at as string).getTime();
    if (Date.now() - createdMs > 15 * 60 * 1000) {
      return new Response(JSON.stringify({ success: false, error: "Token expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const [{ data: customer }, { data: service }, { data: profile }] = await Promise.all([
      supabase.from("customers").select("name, email, phone").eq("id", apptRow.customer_id).maybeSingle(),
      supabase.from("services").select("name, price").eq("id", apptRow.service_id).maybeSingle(),
      supabase.from("profiles").select("business_name, full_name, brand_color, sender_email, sender_name").eq("id", apptRow.user_id).maybeSingle(),
    ]);

    const userId = apptRow.user_id;
    const customerEmail = customer?.email ?? null;
    const customerName = customer?.name ?? "there";
    const customerPhone = customer?.phone ?? null;
    const businessName = profile?.business_name || profile?.full_name || "Cutzioo";
    const serviceName = service?.name || "Service";
    const price = apptRow.price ?? service?.price ?? null;
    const notes = apptRow.notes ?? null;
    const bookingId = String(apptRow.id).slice(0, 8);
    const appointmentDate = new Date(apptRow.appointment_date as string).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    const appointmentTime = String(apptRow.appointment_time).slice(0, 5);

    let template: any = null;
    const { data: tplData } = await supabase.from("message_templates").select("*").eq("user_id", userId).maybeSingle();
    template = tplData;

    if (template?.enabled === false) {
      return new Response(JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accent = template?.accent_color || accentColor || profile?.brand_color || "#e0c4a8";
    const finalManageUrl = `${APP_URL}/manage/${cancelToken}`;

    const vars = { customerName, customerEmail, customerPhone, businessName, serviceName, appointmentDate, appointmentTime, price };

    const subject = render(template?.email_subject || "Your booking at {{businessName}} is confirmed", vars);
    const smsText = render(
      template?.sms_body || "{{businessName}}: {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} confirmed.",
      vars
    ) + ` Manage: ${finalManageUrl}`;

    const html = buildHtml({
      businessName, customerName, serviceName,
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

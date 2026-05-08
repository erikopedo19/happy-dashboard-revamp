/* eslint-disable */
declare const Deno: {
  env: { get(key: string): string | undefined };
};

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Brevo connector not configured (missing LOVABLE_API_KEY or BREVO_API_KEY).",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 503 },
      );
    }

    const {
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
      accentColor = "#1a1a1a",
      stylistName,
      stylistTitle,
      senderEmail,
      senderName,
    } = await req.json();

    if (!businessName || !serviceName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const fromEmail = senderEmail || "noreply@brevo.com";
    const fromName = senderName || businessName;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Booking Confirmation</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
  <tr><td style="background:${accentColor};padding:44px 30px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:28px;font-weight:600;letter-spacing:-0.02em;">Booking Confirmed</h1>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <p style="margin:0 0 20px 0;color:#1d1d1f;font-size:17px;">Hi ${customerName || "there"},</p>
    <p style="margin:0 0 30px 0;color:#6e6e73;font-size:15px;line-height:1.5;">Your appointment with <strong style="color:#1d1d1f">${businessName}</strong> is confirmed.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;border-radius:14px;padding:24px;margin-bottom:30px;"><tr><td>
      <h2 style="margin:0 0 16px 0;color:#1d1d1f;font-size:20px;font-weight:600;letter-spacing:-0.01em;">${serviceName}</h2>
      <p style="margin:0 0 8px 0;color:#6e6e73;font-size:14px;"><strong style="color:#1d1d1f">Date:</strong> ${appointmentDate}</p>
      <p style="margin:0 0 8px 0;color:#6e6e73;font-size:14px;"><strong style="color:#1d1d1f">Time:</strong> ${appointmentTime}</p>
      ${price ? `<p style="margin:0 0 8px 0;color:#6e6e73;font-size:14px;"><strong style="color:#1d1d1f">Price:</strong> €${price}</p>` : ""}
      ${stylistName ? `<p style="margin:0 0 8px 0;color:#6e6e73;font-size:14px;"><strong style="color:#1d1d1f">Stylist:</strong> ${stylistName}${stylistTitle ? ` (${stylistTitle})` : ""}</p>` : ""}
      ${customerPhone ? `<p style="margin:0 0 8px 0;color:#6e6e73;font-size:14px;"><strong style="color:#1d1d1f">Phone:</strong> ${customerPhone}</p>` : ""}
      ${notes ? `<p style="margin:8px 0 0 0;color:#6e6e73;font-size:14px;font-style:italic;"><strong style="color:#1d1d1f">Notes:</strong> ${notes}</p>` : ""}
      ${bookingId ? `<p style="margin:20px 0 0 0;padding-top:20px;border-top:1px solid #e5e5e7;color:#86868b;font-size:12px;">Booking Reference: #${bookingId}</p>` : ""}
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:30px;text-align:center;border-top:1px solid #e5e5e7;">
    <p style="margin:0;color:#86868b;font-size:13px;">Thank you for choosing ${businessName}.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    const results: { email?: any; sms?: any } = {};

    // EMAIL via Brevo
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
          subject: `Booking Confirmation - ${businessName}`,
          htmlContent: html,
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

    // SMS via Brevo (if phone provided)
    if (customerPhone) {
      const smsText = `${businessName}: Your ${serviceName} appointment is confirmed for ${appointmentDate} at ${appointmentTime}.${bookingId ? ` Ref #${bookingId}` : ""}`;
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

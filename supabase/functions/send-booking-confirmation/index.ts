/* eslint-disable */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Email service not configured. Please set RESEND_API_KEY in Supabase Dashboard > Project Settings > Edge Functions > Secrets.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        }
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
    } = await req.json();

    if (!customerEmail || !businessName || !serviceName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - ${businessName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: ${accentColor}; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Booking Confirmed!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px;">Hi ${customerName || "there"},</p>
                    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px;">Your appointment with <strong>${businessName}</strong> is confirmed.</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                      <tr><td>
                        <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${serviceName}</h2>
                        <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;"><strong>Date:</strong> ${appointmentDate}</p>
                        <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;"><strong>Time:</strong> ${appointmentTime}</p>
                        ${price ? `<p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;"><strong>Price:</strong> €${price}</p>` : ""}
                        ${stylistName ? `<p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;"><strong>Stylist:</strong> ${stylistName}${stylistTitle ? ` (${stylistTitle})` : ""}</p>` : ""}
                        ${customerPhone ? `<p style="margin: 0 0 8px 0; color: #666666; font-size: 14px;"><strong>Phone:</strong> ${customerPhone}</p>` : ""}
                        ${notes ? `<p style="margin: 8px 0 0 0; color: #666666; font-size: 14px; font-style: italic;"><strong>Notes:</strong> ${notes}</p>` : ""}
                        ${bookingId ? `<p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999999; font-size: 12px;">Booking Reference: #${bookingId}</p>` : ""}
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; color: #666666; font-size: 14px;">Thank you for choosing ${businessName}!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [customerEmail],
        subject: `Booking Confirmation - ${businessName}`,
        html,
      }),
    });

    const responseData = await res.json().catch(() => ({ error: "Failed to parse response" }));

    if (!res.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(`Resend API error: ${responseData.error || res.statusText}`);
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

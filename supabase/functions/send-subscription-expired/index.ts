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
const SENDER_EMAIL = "hello@cutzioo.com";
const SENDER_NAME = "Cutzioo";
const APP_URL = "https://cutzioo.com";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function html(name: string, endedOn: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;border:1px solid #e5e5ea;overflow:hidden;">
<tr><td style="padding:36px 32px 8px;text-align:center;">
  <div style="display:inline-block;width:56px;height:56px;border-radius:18px;background:#FF375F;color:#fff;font-size:26px;line-height:56px;margin-bottom:16px;">★</div>
  <h1 style="margin:0;font-size:23px;font-weight:700;letter-spacing:-0.02em;">Your Cutzioo subscription has expired</h1>
</td></tr>
<tr><td style="padding:16px 32px 0;">
  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#48484a;">Hi <strong style="color:#1c1c1e;">${esc(name || "there")}</strong>,</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#48484a;">
    Your Cutzioo Pro plan ended on <strong style="color:#1c1c1e;">${esc(endedOn)}</strong>. Your account is still here — it's just back on the free plan,
    so Pro features like unlimited bookings, teams and analytics are paused.
  </p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#48484a;">
    Renewing takes less than a minute and everything picks up right where you left off.
  </p>
</td></tr>
<tr><td style="padding:20px 32px 36px;text-align:center;">
  <a href="${APP_URL}/pricing" style="display:inline-block;background:#FF375F;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;border-radius:999px;">Renew Cutzioo Pro</a>
  <p style="margin:16px 0 0;font-size:12px;color:#8e8e93;">Questions? Just reply to this email.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!BREVO_API_KEY || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing_config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Subscriptions that ended and were never notified
  const { data: rows, error } = await supabase
    .from("subscribers")
    .select("id, user_id, email, subscription_end")
    .lt("subscription_end", new Date().toISOString())
    .is("expiration_email_sent_at", null)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const row of rows ?? []) {
    if (!row.email) continue;

    // Claim the row first so a retry can never double-send.
    const { data: claimed } = await supabase
      .from("subscribers")
      .update({ expiration_email_sent_at: new Date().toISOString(), subscribed: false })
      .eq("id", row.id)
      .is("expiration_email_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();

    const endedOn = new Date(row.subscription_end).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });

    try {
      const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Connection-Api-Key": BREVO_API_KEY },
        body: JSON.stringify({
          sender: { email: SENDER_EMAIL, name: SENDER_NAME },
          to: [{ email: row.email }],
          subject: "Your Cutzioo subscription has expired",
          htmlContent: html(profile?.full_name ?? "", endedOn),
        }),
      });
      if (res.ok) sent++;
      else {
        // Release the claim so it can be retried next run.
        await supabase.from("subscribers").update({ expiration_email_sent_at: null }).eq("id", row.id);
      }
    } catch {
      await supabase.from("subscribers").update({ expiration_email_sent_at: null }).eq("id", row.id);
    }
  }

  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

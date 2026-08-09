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
const SENDER_NAME = "Cutzioo Team";
const APP_URL = "https://cutzioo.com";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildHtml(name: string, trialEnds: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e5e5ea;box-shadow:0 20px 60px rgba(0,0,0,0.08);">
      <tr><td style="padding:40px 32px 24px;text-align:center;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:20px;background:#FF375F;color:#fff;font-size:30px;line-height:64px;text-align:center;margin-bottom:20px;box-shadow:0 8px 24px rgba(255,55,95,0.35);">★</div>
        <div style="font-size:12px;color:#8e8e93;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px;font-weight:600;">A gift from the developers</div>
        <h1 style="margin:0;font-size:26px;font-weight:700;color:#1c1c1e;letter-spacing:-0.02em;line-height:1.25;">You've been awarded 1 month of Cutzioo Premium — on us.</h1>
      </td></tr>

      <tr><td style="padding:0 32px 8px;">
        <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#48484a;">
          Hi <strong style="color:#1c1c1e;">${esc(name || "there")}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#48484a;">
          Welcome to Cutzioo. To thank you for signing up, our team has activated a
          <strong style="color:#1c1c1e;">complimentary Premium trial</strong> on your account — no credit card, no strings attached.
          Everything unlocked, for a full month.
        </p>
      </td></tr>

      <tr><td style="padding:8px 32px 4px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;border:1px solid #e5e5ea;border-radius:20px;overflow:hidden;">
          <tr><td style="padding:20px 22px;border-bottom:1px solid #e5e5ea;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Plan</div>
            <div style="font-size:17px;font-weight:600;color:#1c1c1e;">Premium <span style="color:#FF375F;font-weight:700;">· Free for 30 days</span></div>
          </td></tr>
          <tr><td style="padding:20px 22px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8e8e93;margin-bottom:6px;font-weight:600;">Trial ends</div>
            <div style="font-size:15px;font-weight:600;color:#1c1c1e;">${esc(trialEnds)}</div>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:28px 32px 8px;text-align:center;">
        <a href="${APP_URL}/admin" style="display:inline-block;background:#FF375F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:14px;box-shadow:0 8px 20px rgba(255,55,95,0.35);">Open your dashboard</a>
      </td></tr>

      <tr><td style="padding:24px 32px 40px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#8e8e93;text-align:center;">
          Questions? Just reply to this email — a human on our team will get back to you.
        </p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1a6;">© Cutzioo · Made with care by the team</p>
  </td></tr>
</table>
</body></html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    // Identify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;
    const email = user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email on account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Only send once
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, welcome_email_sent")
      .eq("id", user.id)
      .maybeSingle();

    if (prof?.welcome_email_sent) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    // Grant premium trial via subscribers table (upsert)
    await admin.from("subscribers").upsert(
      {
        user_id: user.id,
        email,
        subscribed: true,
        subscription_tier: "premium_trial",
        subscription_end: trialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

    // Send email via Brevo
    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      console.error("Missing gateway credentials");
    } else {
      const html = buildHtml(
        (prof?.full_name || (user.user_metadata as any)?.full_name || "").split(" ")[0] || "there",
        trialEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      );
      const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email }],
          subject: "🎁 Your free month of Cutzioo Premium is active",
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("Brevo send failed", res.status, txt);
      }
    }

    await admin.from("profiles").update({ welcome_email_sent: true }).eq("id", user.id);

    // --- Internal admin notification (not a user-facing feature) ---
    try {
      if (LOVABLE_API_KEY && BREVO_API_KEY) {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true });

        const method =
          (user.app_metadata as any)?.provider ||
          ((user.identities || [])[0] as any)?.provider ||
          "email";
        const created = new Date(user.created_at || new Date().toISOString());
        const when = created.toISOString().replace("T", " ").slice(0, 19) + " UTC";

        const rows: [string, string][] = [
          ["User #", String(count ?? "?")],
          ["Email", email],
          ["User ID", user.id],
          ["Signup method", String(method)],
          ["Date & time", when],
        ];

        const adminHtml = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1c1e;">
<table cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden;width:100%;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e5e5ea;">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8e8e93;font-weight:600;">Cutzioo · Internal</div>
<div style="font-size:19px;font-weight:700;margin-top:4px;">New account created</div>
</td></tr>
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:12px 24px;border-bottom:1px solid #f2f2f7;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8e8e93;font-weight:600;">${esc(k)}</div>
<div style="font-size:15px;font-weight:600;margin-top:2px;">${esc(v)}</div></td></tr>`
  )
  .join("")}
</table></body></html>`;

        const adminRes = await fetch(`${GATEWAY_URL}/smtp/email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { name: "Cutzioo Signups", email: SENDER_EMAIL },
            to: [{ email: "erikballiu19@gmail.com" }],
            subject: `New signup #${count ?? "?"} · ${email}`,
            htmlContent: adminHtml,
          }),
        });
        if (!adminRes.ok) console.error("Admin notify failed", adminRes.status, await adminRes.text());
      }
    } catch (notifyErr) {
      console.error("Admin notify error", notifyErr);
    }

    // Refresh any listeners
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

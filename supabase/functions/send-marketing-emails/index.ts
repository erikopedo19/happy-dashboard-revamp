// Scheduled marketing email engine (Brevo via Lovable gateway).
// Campaigns: welcome_24h, activation_setup, inactive_14d, milestone_200, monthly_recap.
// Hard cap: 30 emails per calendar day (UTC). Per user: max 1 per day, max 2 per rolling 7 days.
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
const LOGO_URL = "https://cutzioo.com/__l5e/assets-v1/73db5242-2eb7-4a09-ae43-1ef5358c6085/cutzioo-check.png";
const DAILY_CAP = 30;

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function shell(opts: {
  kicker: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e5ea;">
      <tr><td style="padding:32px 32px 0;">
        <img src="${LOGO_URL}" width="34" height="34" alt="Cutzioo" style="display:block;border:0;width:34px;height:34px;border-radius:10px;" />
      </td></tr>
      <tr><td style="padding:18px 32px 4px;">
        <div style="font-size:11px;color:#8e8e93;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;margin-bottom:10px;">${esc(opts.kicker)}</div>
        <h1 style="margin:0;font-size:23px;font-weight:700;color:#1c1c1e;letter-spacing:-0.02em;line-height:1.3;">${opts.title}</h1>
      </td></tr>
      <tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.7;color:#48484a;">${opts.body}</td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <a href="${opts.ctaUrl}" style="display:block;text-align:center;background:#1c1c1e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 24px;border-radius:14px;">${esc(opts.ctaLabel)}</a>
      </td></tr>
      <tr><td style="padding:20px 32px 36px;text-align:center;font-size:12px;line-height:1.6;color:#a1a1a6;">
        ${opts.footer ?? "You're receiving this because you have a Cutzioo account."}
      </td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:12px;color:#a1a1a6;">© Cutzioo</p>
  </td></tr>
</table>
</body></html>`;
}

function barChart(weekly: Array<{ label: string; booked: number; cancelled: number }>) {
  const rows = (weekly ?? []).filter(Boolean);
  if (!rows.length) return "";
  const max = Math.max(1, ...rows.map((r) => Number(r.booked ?? 0) + Number(r.cancelled ?? 0)));
  const bars = rows
    .map((r) => {
      const booked = Number(r.booked ?? 0);
      const cancelled = Number(r.cancelled ?? 0);
      const bw = Math.round((booked / max) * 100);
      const cw = Math.round((cancelled / max) * 100);
      return `<tr>
  <td style="padding:6px 10px 6px 0;font-size:12px;color:#8e8e93;white-space:nowrap;">${esc(r.label)}</td>
  <td style="padding:6px 0;">
    <div style="background:#1c1c1e;height:10px;border-radius:6px;width:${bw}%;min-width:2px;display:block;"></div>
    ${cancelled > 0 ? `<div style="background:#e5b3b3;height:6px;border-radius:6px;width:${cw}%;min-width:2px;display:block;margin-top:4px;"></div>` : ""}
  </td>
  <td align="right" style="padding:6px 0 6px 10px;font-size:12px;color:#48484a;white-space:nowrap;">${booked}${cancelled > 0 ? ` · <span style="color:#c0392b;">${cancelled}</span>` : ""}</td>
</tr>`;
    })
    .join("");
  return `<div style="margin-top:18px;padding:16px 18px;border:1px solid #e5e5ea;border-radius:16px;">
  <div style="font-size:12px;color:#8e8e93;margin-bottom:8px;">Weekly activity</div>
  <table width="100%" cellpadding="0" cellspacing="0">${bars}</table>
  <div style="margin-top:10px;font-size:11px;color:#a1a1a6;">
    <span style="display:inline-block;width:8px;height:8px;background:#1c1c1e;border-radius:2px;"></span> Booked
    &nbsp;&nbsp;<span style="display:inline-block;width:8px;height:8px;background:#e5b3b3;border-radius:2px;"></span> Cancelled
  </div>
</div>`;
}

type Campaign = {
  key: string;
  subject: (ctx: any) => string;
  html: (ctx: any) => string;
};

const CAMPAIGNS: Record<string, Campaign> = {
  welcome_24h: {
    key: "welcome_24h",
    subject: () => "Your Cutzioo agenda is ready — take 2 minutes",
    html: (c) =>
      shell({
        kicker: "Getting started",
        title: `Welcome aboard, ${esc(c.firstName)} 👋`,
        body: `<p style="margin:0 0 14px;">Your account is live. Barbers who set up their booking link on day one get their first online booking within 48 hours.</p>
<p style="margin:0 0 14px;">Three quick things:</p>
<ol style="margin:0 0 6px;padding-left:20px;"><li style="margin-bottom:6px;">Add your services and prices</li><li style="margin-bottom:6px;">Set your working hours</li><li>Share your booking link with clients</li></ol>`,
        ctaLabel: "Finish my setup",
        ctaUrl: `${APP_URL}/admin`,
      }),
  },
  activation_setup: {
    key: "activation_setup",
    subject: () => "You're one step from taking bookings online",
    html: (c) =>
      shell({
        kicker: "Almost there",
        title: "Your booking link isn't live yet",
        body: `<p style="margin:0 0 14px;">Hi ${esc(c.firstName)}, your Cutzioo account is set up but clients can't book you yet.</p>
<p style="margin:0;">Publish your link and drop it in your Instagram bio — that single change is what most barbers say doubled their bookings.</p>`,
        ctaLabel: "Publish my booking link",
        ctaUrl: `${APP_URL}/settings`,
      }),
  },
  inactive_14d: {
    key: "inactive_14d",
    subject: () => "Your chair has been quiet — let's fill it",
    html: (c) =>
      shell({
        kicker: "We miss you",
        title: "Come back and keep your bookings in one place",
        body: `<p style="margin:0 0 14px;">Hi ${esc(c.firstName)}, we haven't seen a booking on your Cutzioo agenda in a while.</p>
<p style="margin:0 0 14px;">Share your link once and clients book themselves — no DMs, no missed calls, no double bookings.</p>
<p style="margin:0;padding:14px 16px;background:#f2f2f7;border-radius:14px;font-size:14px;">🎁 Reach <strong>200 appointments</strong> on Cutzioo and we'll give you <strong>a free month of Premium</strong>.</p>`,
        ctaLabel: "Open my agenda",
        ctaUrl: `${APP_URL}/agenda`,
      }),
  },
  milestone_200: {
    key: "milestone_200",
    subject: (c) => `You're ${c.remaining} appointments from a free month`,
    html: (c) =>
      shell({
        kicker: "Milestone",
        title: `${c.total} appointments and counting`,
        body: `<p style="margin:0 0 14px;">Nice work, ${esc(c.firstName)}. You've booked <strong>${c.total}</strong> appointments through Cutzioo.</p>
<p style="margin:0;padding:14px 16px;background:#f2f2f7;border-radius:14px;font-size:14px;">Hit <strong>200</strong> and your next month of Premium is on us — just <strong>${c.remaining}</strong> to go.</p>`,
        ctaLabel: "Keep booking",
        ctaUrl: `${APP_URL}/agenda`,
      }),
  },
  login_tips_3d: {
    key: "login_tips_3d",
    subject: () => "3 quick wins while you were away",
    html: (c) =>
      shell({
        kicker: "Quick tips",
        title: `A few minutes today, ${esc(c.firstName)}`,
        body: `<p style="margin:0 0 14px;">You haven't opened Cutzioo for a few days. Here are three small things that make the biggest difference:</p>
<ol style="margin:0 0 14px;padding-left:20px;">
  <li style="margin-bottom:8px;"><strong>Pin your booking link</strong> in your Instagram bio and WhatsApp status.</li>
  <li style="margin-bottom:8px;"><strong>Block your days off</strong> so clients never book you on a break.</li>
  <li><strong>Turn on review requests</strong> — ratings bring in new clients on their own.</li>
</ol>
<p style="margin:0;font-size:14px;color:#8e8e93;">We only send this once a month.</p>`,
        ctaLabel: "Open Cutzioo",
        ctaUrl: `${APP_URL}/agenda`,
      }),
  },
  monthly_recap: {
    key: "monthly_recap",
    subject: () => "Your Cutzioo month in numbers",
    html: (c) =>
      shell({
        kicker: "Monthly recap",
        title: "Here's how last month went",
        body: `<p style="margin:0 0 16px;">Hi ${esc(c.firstName)}, a quick look at your last full month on Cutzioo.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;border-radius:16px;">
  <tr><td style="padding:16px 18px;font-size:14px;color:#8e8e93;">Booked</td><td align="right" style="padding:16px 18px;font-size:17px;font-weight:700;">${c.month}</td></tr>
  <tr><td style="padding:0 18px 12px;font-size:14px;color:#8e8e93;">Cancelled</td><td align="right" style="padding:0 18px 12px;font-size:17px;font-weight:700;color:#c0392b;">${c.cancelled}</td></tr>
  <tr><td style="padding:0 18px 16px;font-size:14px;color:#8e8e93;">All time</td><td align="right" style="padding:0 18px 16px;font-size:17px;font-weight:700;">${c.total}</td></tr>
</table>
${barChart(c.weekly)}
<p style="margin:16px 0 0;font-size:14px;">Share your booking link again this week — it's the easiest way to grow next month's number.</p>`,
        ctaLabel: "View my dashboard",
        ctaUrl: `${APP_URL}/admin`,
      }),
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    if (!LOVABLE_API_KEY || !BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: "Email gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    // Remaining budget for today (UTC)
    const { data: budget, error: budgetErr } = await admin.rpc("marketing_emails_sent_today");
    if (budgetErr) throw budgetErr;
    let remainingBudget = DAILY_CAP - Number(budget ?? 0);
    if (remainingBudget <= 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "daily cap reached" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidates, error: candErr } = await admin.rpc("marketing_email_candidates", {
      _limit: remainingBudget,
    });
    if (candErr) throw candErr;

    // Resolve emails from auth.users
    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map<string, string>();
    for (const u of usersPage?.users ?? []) if (u.email) emailById.set(u.id, u.email);

    // --- Re-engagement tips: inactive 3+ days, at most once per calendar month,
    // and never for anyone who has been away for more than 15 days.
    const allCandidates: any[] = [...((candidates ?? []) as any[])];
    const alreadyQueued = new Set(allCandidates.map((c) => c.user_id));
    const now = Date.now();
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const tipsUserIds: string[] = [];
    for (const u of usersPage?.users ?? []) {
      if (!u.email || alreadyQueued.has(u.id)) continue;
      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
      if (!last) continue;
      const days = (now - last) / 86_400_000;
      if (days < 3 || days > 15) continue;
      tipsUserIds.push(u.id);
    }
    if (tipsUserIds.length) {
      const { data: tipProfiles } = await admin
        .from("profiles")
        .select("id, full_name, deleted_at")
        .in("id", tipsUserIds.slice(0, 200));
      for (const p of tipProfiles ?? []) {
        if ((p as any).deleted_at) continue;
        allCandidates.push({
          user_id: (p as any).id,
          campaign: "login_tips_3d",
          full_name: (p as any).full_name,
          period,
        });
      }
    }

    let sent = 0;
    const results: any[] = [];

    for (const c of allCandidates) {
      if (remainingBudget <= 0) break;
      const email = emailById.get(c.user_id);
      const campaign = CAMPAIGNS[c.campaign];
      if (!email || !campaign) continue;

      const ctx = {
        firstName: String(c.full_name || "there").split(" ")[0] || "there",
        total: Number(c.total_appointments ?? 0),
        month: Number(c.month_appointments ?? 0),
        cancelled: Number(c.cancelled_appointments ?? 0),
        weekly: (c.weekly_counts ?? []) as any[],
        remaining: Math.max(1, 200 - Number(c.total_appointments ?? 0)),
      };

      if (dryRun) {
        results.push({ email, campaign: c.campaign, dryRun: true });
        remainingBudget--;
        continue;
      }

      // Reserve the slot first — the unique index (user_id, campaign, period)
      // makes a duplicate send impossible even if two runs overlap.
      const { data: reserved, error: reserveErr } = await admin
        .from("marketing_email_log")
        .insert({
          user_id: c.user_id,
          campaign: c.campaign,
          period: c.period ?? "",
          recipient_email: email,
          status: "sending",
        })
        .select("id")
        .maybeSingle();

      if (reserveErr || !reserved) {
        results.push({ email, campaign: c.campaign, skipped: "already sent" });
        continue;
      }

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
          subject: campaign.subject(ctx),
          htmlContent: campaign.html(ctx),
        }),
      });

      const ok = res.ok;
      if (!ok) console.error("Brevo send failed", c.campaign, res.status, await res.text());

      if (ok) {
        await admin.from("marketing_email_log").update({ status: "sent" }).eq("id", reserved.id);
      } else {
        // release the reservation so the campaign can be retried later
        await admin.from("marketing_email_log").delete().eq("id", reserved.id);
      }

      if (ok) {
        sent++;
        remainingBudget--;
      }
      results.push({ email, campaign: c.campaign, ok });
    }

    return new Response(JSON.stringify({ ok: true, sent, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-marketing-emails error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

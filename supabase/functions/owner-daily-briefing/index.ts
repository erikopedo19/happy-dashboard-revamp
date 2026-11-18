// Morning briefing for the Cutzioo owner: yesterday's sales, bookings and open tasks,
// written by Lovable AI and emailed once per day at 9:00 Athens time.
/* eslint-disable */
declare const Deno: { env: { get(k: string): string | undefined }; serve: (h: (r: Request) => Response | Promise<Response>) => void };
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";
// @ts-ignore
import { briefingDates, localDayRangeUtc, money, shouldSendNow } from "./logic.ts";

const OWNER_EMAIL = "erikballiu19@gmail.com";
const OWNER_ID = "4b74e9f1-2628-4292-889b-aa3082eef7a3";
const CAMPAIGN = "owner_briefing";
const LOGO = "https://cutzioo.com/__l5e/assets-v1/73db5242-2eb7-4a09-ae43-1ef5358c6085/cutzioo-check.png";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sum = (rows: any[] | null, k: string) => (rows || []).reduce((a, r) => a + Number(r[k] || 0), 0);

async function gatherFacts(admin: any, now: Date) {
  const { today, yesterday, weekAgo } = briefingDates(now);
  const y = localDayRangeUtc(yesterday);

  const [created, cancelled, visits, paidInShop, cardPayments, signups, todays, unpaid, failed] = await Promise.all([
    admin.from("appointments").select("id, user_id").gte("created_at", y.start).lt("created_at", y.end).limit(5000),
    admin.from("appointments").select("id").eq("status", "cancelled").gte("updated_at", y.start).lt("updated_at", y.end).limit(5000),
    admin.from("appointments").select("price, status").eq("appointment_date", yesterday).neq("status", "cancelled").limit(5000),
    admin.from("appointments").select("paid_amount").gte("paid_at", y.start).lt("paid_at", y.end).limit(5000),
    admin.from("payments").select("amount_total, application_fee_amount, currency").in("status", ["paid", "succeeded", "complete"]).gte("created_at", y.start).lt("created_at", y.end).limit(5000),
    admin.from("profiles").select("id").gte("created_at", y.start).lt("created_at", y.end).limit(5000),
    admin.from("appointments").select("user_id, appointment_time").eq("appointment_date", today).neq("status", "cancelled").order("appointment_time").limit(5000),
    admin.from("appointments").select("price").gte("appointment_date", weekAgo).lte("appointment_date", yesterday).neq("status", "cancelled").eq("payment_status", "unpaid").limit(5000),
    admin.from("subscribers").select("email, billing_status, payment_failed_at").or("billing_status.in.(past_due,unpaid),payment_failed_at.not.is.null").limit(50),
  ]);
  for (const r of [created, cancelled, visits, paidInShop, cardPayments, signups, todays, unpaid, failed]) if (r.error) throw r.error;

  // Pro subscription income from Stripe invoices paid yesterday.
  let proIncomeCents = 0, proInvoices = 0;
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (key) {
    const qs = new URLSearchParams({ status: "paid", limit: "100", "created[gte]": String(Date.parse(y.start) / 1000), "created[lt]": String(Date.parse(y.end) / 1000) });
    const r = await fetch(`https://api.stripe.com/v1/invoices?${qs}`, { headers: { Authorization: `Bearer ${key}` } });
    if (r.ok) {
      const d = await r.json();
      for (const inv of d.data || []) if ((inv.amount_paid || 0) > 0) { proIncomeCents += inv.amount_paid; proInvoices++; }
    } else console.error("stripe invoices", r.status);
  }

  const failedRows = (failed.data || []).filter((s: any) => ["past_due", "unpaid"].includes(s.billing_status) || (s.payment_failed_at && Date.parse(s.payment_failed_at) > now.getTime() - 30 * 864e5));
  return {
    yesterday, today,
    sales: {
      pro_subscription_income: money(proIncomeCents), pro_payments: proInvoices,
      card_payments_total: money(sum(cardPayments.data, "amount_total")), card_payments: cardPayments.data.length,
      platform_fees: money(sum(cardPayments.data, "application_fee_amount")),
      marked_paid_in_shop: money(Math.round(sum(paidInShop.data, "paid_amount") * 100)),
    },
    bookings: {
      new_bookings_made: created.data.length,
      shops_with_new_bookings: new Set(created.data.map((a: any) => a.user_id)).size,
      cancellations: cancelled.data.length,
      visits_yesterday: visits.data.length,
      value_of_visits_yesterday: money(Math.round(sum(visits.data, "price") * 100)),
      new_signups: signups.data.length,
    },
    open_tasks: {
      todays_bookings: todays.data.length,
      shops_busy_today: new Set(todays.data.map((a: any) => a.user_id)).size,
      first_booking_today: todays.data[0]?.appointment_time?.slice(0, 5) ?? null,
      unpaid_visits_last_7_days: unpaid.data.length,
      unpaid_value_last_7_days: money(Math.round(sum(unpaid.data, "price") * 100)),
      failed_pro_payments: failedRows.length,
      failed_payment_accounts: failedRows.slice(0, 5).map((s: any) => s.email),
    },
  };
}

const schema = {
  type: "object", additionalProperties: false, required: ["subject", "summary", "highlights", "todo"],
  properties: {
    subject: { type: "string" },
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    todo: { type: "array", items: { type: "string" } },
  },
};

async function writeBriefing(facts: unknown, runId?: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw Object.assign(new Error("AI is not configured."), { status: 500 });
  const gw = createLovableAiGatewayRunIdFetch(runId);
  const res = await gw.fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", stream: true, store: false,
      reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
      instructions: "You write a short morning briefing for the owner of Cutzioo, a barbershop booking app. Use ONLY the numbers given; never invent figures. subject: under 60 characters, include the most important number. summary: 2 friendly sentences on how yesterday went. highlights: 2-4 short bullets about sales and bookings. todo: 1-4 short, concrete actions for today based on open tasks (today's bookings, unpaid visits, failed Pro payments); if nothing needs attention say so in one bullet. Plain English, no emojis, no markdown, never use the word 'boost'.",
      input: `Data (JSON):\n${JSON.stringify(facts)}`,
      text: { format: { type: "json_schema", name: "owner_briefing", strict: true, schema } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = `AI request failed (${res.status}).`;
    try { msg = JSON.parse(t)?.error?.message || JSON.parse(t)?.message || msg; } catch {}
    throw Object.assign(new Error(msg), { status: res.status });
  }
  const reader = res.body!.getReader(); const dec = new TextDecoder();
  let buf = "", text = "", failed = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        else if (ev.type === "response.failed" || ev.type === "error") failed = ev.response?.error?.message || ev.message || "failed";
        else if (ev.type === "response.refusal.delta") failed = "The AI declined to write the briefing.";
      } catch {}
    }
  }
  if (failed || !text) throw Object.assign(new Error(failed || "No briefing was returned."), { status: 502 });
  return JSON.parse(text) as { subject: string; summary: string; highlights: string[]; todo: string[] };
}

const stat = (label: string, value: unknown) =>
  `<td style="padding:12px 14px;background:#f2f2f7;border-radius:14px;width:50%;"><div style="font-size:11px;color:#8e8e93;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">${esc(label)}</div><div style="font-size:20px;font-weight:700;margin-top:4px;">${esc(value)}</div></td>`;
const list = (items: string[]) => items.map((t) => `<tr><td style="padding:0 0 8px;font-size:14px;line-height:1.55;color:#3a3a3c;">• ${esc(t)}</td></tr>`).join("");

function renderEmail(f: any, b: { summary: string; highlights: string[]; todo: string[] }) {
  const day = new Date(`${f.yesterday}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 14px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;border:1px solid #e5e5ea;">
<tr><td style="padding:28px 28px 0;"><img src="${LOGO}" width="32" height="32" alt="Cutzioo" style="border-radius:9px;display:block;"/></td></tr>
<tr><td style="padding:16px 28px 0;"><div style="font-size:11px;color:#8e8e93;letter-spacing:.12em;text-transform:uppercase;font-weight:600;">Morning briefing · ${esc(day)}</div>
<p style="margin:10px 0 0;font-size:16px;line-height:1.6;">${esc(b.summary)}</p></td></tr>
<tr><td style="padding:20px 28px 0;"><table width="100%" cellpadding="0" cellspacing="6">
<tr>${stat("Pro income", f.sales.pro_subscription_income)}${stat("Card payments", f.sales.card_payments_total)}</tr>
<tr>${stat("New bookings", f.bookings.new_bookings_made)}${stat("New sign-ups", f.bookings.new_signups)}</tr>
<tr>${stat("Today's bookings", f.open_tasks.todays_bookings)}${stat("Failed payments", f.open_tasks.failed_pro_payments)}</tr>
</table></td></tr>
<tr><td style="padding:20px 28px 0;"><div style="font-size:13px;font-weight:700;margin-bottom:8px;">Yesterday</div><table width="100%" cellpadding="0" cellspacing="0">${list(b.highlights)}</table></td></tr>
<tr><td style="padding:12px 28px 0;"><div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#d1365a;">To do today</div><table width="100%" cellpadding="0" cellspacing="0">${list(b.todo)}</table></td></tr>
<tr><td style="padding:22px 28px 8px;"><a href="https://cutzioo.com/superadmin/dashboard" style="display:block;text-align:center;background:#1c1c1e;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 22px;border-radius:14px;">Open admin</a></td></tr>
<tr><td style="padding:14px 28px 28px;text-align:center;font-size:11.5px;color:#a1a1a6;">Written by AI from your app's numbers · sent daily at 9:00 Athens time</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  // Only the signed-in owner can send outside 9:00 or resend today's briefing.
  let isOwner = false;
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(auth.slice(7)).catch(() => ({ data: null }));
    isOwner = data?.user?.email?.toLowerCase() === OWNER_EMAIL;
  }
  if ((body.force || body.preview) && !isOwner) return json({ error: "Only the owner can do this." }, 403);
  const force = isOwner && (body.force === true || body.preview === true);
  const now = new Date();
  if (!shouldSendNow(now, force)) return json({ ok: true, skipped: "not_9am_athens" });

  const { today } = briefingDates(now);
  if (isOwner && body.preview === true) {
    try {
      const facts = await gatherFacts(admin, now);
      const b = await writeBriefing(facts, getLovableAiGatewayRunId(req));
      return json({ ok: true, facts, briefing: b });
    } catch (e: any) { console.error(e); return json({ error: e.message || "Failed." }, e.status || 500); }
  }

  // Claim today's briefing so it is written and sent at most once per day.
  if (force && body.resend === true) await admin.from("marketing_email_log").delete().eq("user_id", OWNER_ID).eq("campaign", CAMPAIGN).eq("period", today);
  const { data: claim, error: claimErr } = await admin.from("marketing_email_log")
    .insert({ user_id: OWNER_ID, campaign: CAMPAIGN, recipient_email: OWNER_EMAIL, status: "briefing_pending", period: today })
    .select("id").single();
  if (claimErr) {
    if (claimErr.code === "23505") return json({ ok: true, skipped: "already_sent_today" });
    console.error(claimErr); return json({ error: "Could not start the briefing." }, 500);
  }

  try {
    const facts = await gatherFacts(admin, now);
    const b = await writeBriefing(facts, getLovableAiGatewayRunId(req));
    const brevo = Deno.env.get("BREVO_API_KEY");
    if (!brevo) throw Object.assign(new Error("Email is not configured."), { status: 500 });
    const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": brevo },
      body: JSON.stringify({ sender: { name: "Cutzioo", email: "hello@cutzioo.com" }, to: [{ email: OWNER_EMAIL }], subject: b.subject.slice(0, 90), htmlContent: renderEmail(facts, b) }),
    });
    if (!res.ok) throw Object.assign(new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`), { status: 502 });
    await admin.from("marketing_email_log").update({ status: "briefing_sent" }).eq("id", claim.id);
    return json({ ok: true, sent: true, subject: b.subject });
  } catch (e: any) {
    console.error("briefing failed", e?.status, e?.message);
    // Release the claim so the owner can retry; the next scheduled run is tomorrow.
    await admin.from("marketing_email_log").delete().eq("id", claim.id);
    return json({ error: e?.message || "Briefing failed." }, e?.status && e.status >= 400 ? e.status : 500);
  }
});

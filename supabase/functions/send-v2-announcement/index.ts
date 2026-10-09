// One-off "Cutzioo v2" announcement to the 50 most active shop owners.
// Each recipient is logged once (campaign v2_launch, period "once"), so re-runs never duplicate.
/* eslint-disable */
declare const Deno: { env: { get(key: string): string | undefined } };
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LIMIT = 50;
const LOGO = "https://cutzioo.com/__l5e/assets-v1/73db5242-2eb7-4a09-ae43-1ef5358c6085/cutzioo-check.png";
const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const html = (name: string) => `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:24px;border:1px solid #e5e5ea;">
<tr><td style="padding:32px 32px 0;"><img src="${LOGO}" width="34" height="34" alt="Cutzioo" style="border-radius:10px;display:block;"/></td></tr>
<tr><td style="padding:18px 32px 4px;"><div style="font-size:11px;color:#8e8e93;letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:10px;">Introducing</div>
<h1 style="margin:0;font-size:26px;font-weight:700;letter-spacing:-.02em;">Cutzioo v2 is here ✨</h1></td></tr>
<tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.7;color:#48484a;">
<p style="margin:0 0 14px;">Hi ${esc(name)}, you're one of our most active barbers — so you're hearing it first. We rebuilt Cutzioo to feel like a real iPhone app.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;border-radius:16px;margin-bottom:14px;">
<tr><td style="padding:16px 18px 6px;font-size:14px;">✓ <strong>Fresh redesign</strong> — cleaner, faster, smoother</td></tr>
<tr><td style="padding:0 18px 6px;font-size:14px;">✓ <strong>Drag & drop agenda</strong> — move or swap bookings, clients get the new time by email</td></tr>
<tr><td style="padding:0 18px 6px;font-size:14px;">✓ <strong>Barbershop map</strong> — pin your shop so nearby clients find you</td></tr>
<tr><td style="padding:0 18px 6px;font-size:14px;">✓ <strong>Swipe to find a barber</strong> — clients discover you in seconds</td></tr>
<tr><td style="padding:0 18px 16px;font-size:14px;">✓ <strong>Smart add-on advice</strong> in Subscription</td></tr>
</table>
<p style="margin:0;">Open the app and pin your location — it's the quickest way to get new clients from the map.</p></td></tr>
<tr><td style="padding:28px 32px 8px;"><a href="https://cutzioo.com/admin" style="display:block;text-align:center;background:#1c1c1e;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 24px;border-radius:14px;">Explore Cutzioo v2</a></td></tr>
<tr><td style="padding:20px 32px 36px;text-align:center;font-size:12px;color:#a1a1a6;">You're receiving this because you have a Cutzioo account.</td></tr>
</table></td></tr></table></body></html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY"), BREVO = Deno.env.get("BREVO_API_KEY");
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  if (!LOVABLE || !BREVO) return json({ error: "Email not configured" }, 500);
  const dry = (await req.json().catch(() => ({})))?.dry_run === true;

  // Rank owners by appointments in the last 90 days.
  const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("appointments").select("user_id").gte("appointment_date", since).range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    for (const r of data ?? []) if (r.user_id) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    if (!data || data.length < 1000) break;
  }
  const { data: sent } = await admin.from("marketing_email_log").select("user_id").eq("campaign", "v2_launch");
  const done = new Set((sent ?? []).map((r: any) => r.user_id));
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = new Map((usersPage?.users ?? []).map((u: any) => [u.id, u]));
  const byBookings = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  // Top up with the most recently active sign-ins when fewer than 50 have bookings.
  const byLogin = [...users.values()].filter((u: any) => u.last_sign_in_at && !counts.has(u.id))
    .sort((a: any, b: any) => +new Date(b.last_sign_in_at) - +new Date(a.last_sign_in_at)).map((u: any) => u.id);
  const ranked = [...byBookings, ...byLogin]
    .filter((id) => !done.has(id) && (users.get(id) as any)?.email).slice(0, LIMIT);
  const { data: profiles } = await admin.from("profiles").select("id, full_name, deleted_at").in("id", ranked.length ? ranked : ["00000000-0000-0000-0000-000000000000"]);
  const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const results: any[] = [];
  for (const id of ranked) {
    const p: any = pmap.get(id);
    if (p?.deleted_at) continue;
    const email = (users.get(id) as any).email as string;
    const first = String(p?.full_name || "there").split(" ")[0] || "there";
    if (dry) { results.push({ email, appointments: counts.get(id) }); continue; }
    const { data: r, error } = await admin.from("marketing_email_log")
      .insert({ user_id: id, campaign: "v2_launch", period: "once", recipient_email: email, status: "sending" }).select("id").maybeSingle();
    if (error || !r) continue;
    const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE}`, "X-Connection-Api-Key": BREVO },
      body: JSON.stringify({ sender: { name: "Cutzioo", email: "hello@cutzioo.com" }, to: [{ email }], subject: "Cutzioo v2 is here — redesigned, with new features", htmlContent: html(first) }),
    });
    if (res.ok) await admin.from("marketing_email_log").update({ status: "sent" }).eq("id", r.id);
    else { console.error("send failed", res.status, await res.text()); await admin.from("marketing_email_log").delete().eq("id", r.id); }
    results.push({ ok: res.ok });
  }
  return json({ ok: true, candidates: ranked.length, sent: results.filter((r) => r.ok).length, dry, results: dry ? results : undefined });
});

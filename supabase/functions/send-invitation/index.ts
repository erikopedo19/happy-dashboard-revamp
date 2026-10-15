import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { canSendInvitation, escapeHtml } from "./logic.ts";

const Body = z.object({ token: z.string().uuid() });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Please sign in to invite a colleague." }, 401);
    const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return json({ error: "Invitation service is unavailable." }, 503);
    // Use caller RLS, not elevated credentials, to read the saved invitation.
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !user) return json({ error: "Please sign in again." }, 401);
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid invitation token." }, 400);
    const { data: invite, error } = await client.from("invitations").select("org_id,email,role,status,expires_at").eq("token", parsed.data.token).maybeSingle();
    if (error || !invite || !canSendInvitation(invite, user.id)) return json({ error: "This invitation is unavailable or has expired." }, 403);
    if (!z.string().email().safeParse(invite.email).success) return json({ error: "Invalid recipient email." }, 400);
    const { data: org } = await client.from("organizations").select("name").eq("created_by", user.id).limit(1).maybeSingle();
    const name = escapeHtml(org?.name || "your salon");
    const link = `https://cutzioo.com/onboarding?invite=${encodeURIComponent(parsed.data.token)}`;
    const lovable = Deno.env.get("LOVABLE_API_KEY"), brevo = Deno.env.get("BREVO_API_KEY");
    if (!lovable || !brevo) return json({ error: "Email is not configured. Copy the invitation link instead." }, 503);
    const response = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": brevo },
      body: JSON.stringify({ sender: { name: "Cutzioo", email: "hello@cutzioo.com" }, to: [{ email: invite.email }], subject: `You're invited to join ${org?.name || "a salon"} on Cutzioo`,
        htmlContent: `<!doctype html><html><body style="font-family:-apple-system,Arial,sans-serif;background:#f2f2f7;padding:32px;color:#1c1c1e"><main style="max-width:480px;margin:auto"><h1>Join ${name}</h1><p>You've been invited to join your colleagues on Cutzioo.</p><p><a href="${link}" style="display:inline-block;background:#ff375f;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none">Accept invitation</a></p><p>Sign in or create an account using the email address this invitation was sent to.</p><p>This invitation expires in seven days. If you weren't expecting it, you can ignore this email.</p></main></body></html>`,
        textContent: `You've been invited to join ${org?.name || "a salon"} on Cutzioo. Accept: ${link}. Use the email address this was sent to. If you weren't expecting it, ignore this message.` }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Invitation provider failed", response.status, details);
      return json({ error: "Email delivery failed. Retry or copy the invitation link.", status: response.status, details }, response.status);
    }
    return json({ success: true });
  } catch {
    return json({ error: "Invitation could not be sent. Please retry." }, 500);
  }
});
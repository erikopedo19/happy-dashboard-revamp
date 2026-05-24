// superadmin-users: list users + manage subscriptions. Caller must be the super admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPER_ADMIN_EMAIL = "erikballiu19@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function requireSuperAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  if (data.user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const me = await requireSuperAdmin(req);
  if (!me) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const isMutation = req.method === "POST";

    if (!isMutation) {
      const all: any[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) throw error;
        all.push(...(data.users ?? []));
        if (!data.users || data.users.length < 200) break;
        page++;
        if (page > 25) break;
      }
      const ids = all.map((u) => u.id);

      const [{ data: profiles }, { data: subs }] = await Promise.all([
        admin.from("profiles").select("id, full_name, business_name, avatar_url, role").in("id", ids),
        admin.from("subscribers").select("user_id, email, subscribed, subscription_tier, subscription_end, stripe_customer_id, updated_at"),
      ]);
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const sByUser = new Map((subs ?? []).filter((s: any) => s.user_id).map((s: any) => [s.user_id, s]));
      const sByEmail = new Map((subs ?? []).map((s: any) => [(s.email ?? "").toLowerCase(), s]));

      const rows = all.map((u) => {
        const profile = pMap.get(u.id) ?? {};
        const sub = sByUser.get(u.id) ?? sByEmail.get((u.email ?? "").toLowerCase()) ?? null;
        const active = !!sub?.subscribed && (!sub?.subscription_end || new Date(sub.subscription_end) > new Date());
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          full_name: (profile as any).full_name ?? null,
          business_name: (profile as any).business_name ?? null,
          avatar_url: (profile as any).avatar_url ?? null,
          role: (profile as any).role ?? null,
          subscription: sub ? { ...sub, active } : null,
        };
      });

      return new Response(JSON.stringify({ users: rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: upsert subscription
    const body = await req.json().catch(() => ({}));
    const { user_id, email, subscribed, subscription_tier, subscription_end } = body ?? {};
    if (!user_id || !email) {
      return new Response(JSON.stringify({ error: "user_id and email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tier = subscription_tier ?? "Pro";
    const endIso = subscription_end ?? null;
    const sub = !!subscribed;

    // Find any existing row by user_id OR email (some rows may have been created by Stripe with email only).
    const { data: existingRows, error: findErr } = await admin
      .from("subscribers")
      .select("id, user_id, email")
      .or(`user_id.eq.${user_id},email.eq.${email}`);
    if (findErr) throw findErr;

    let savedId: string | null = null;
    if (existingRows && existingRows.length > 0) {
      // Keep the first row, update it; delete any duplicates to avoid drift.
      const [keep, ...dupes] = existingRows;
      const { error: upErr } = await admin
        .from("subscribers")
        .update({
          user_id,
          email,
          subscribed: sub,
          subscription_tier: sub ? tier : null,
          subscription_end: endIso,
          updated_at: new Date().toISOString(),
        })
        .eq("id", keep.id);
      if (upErr) throw upErr;
      savedId = keep.id;
      if (dupes.length) {
        await admin.from("subscribers").delete().in("id", dupes.map((d: any) => d.id));
      }
    } else {
      const { data: ins, error: insErr } = await admin
        .from("subscribers")
        .insert({
          user_id,
          email,
          subscribed: sub,
          subscription_tier: sub ? tier : null,
          subscription_end: endIso,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      savedId = ins.id;
    }

    // Drop a celebratory notification when premium is granted.
    if (sub) {
      const untilStr = endIso ? ` until ${new Date(endIso).toLocaleDateString()}` : "";
      await admin.from("notifications").insert({
        user_id,
        type: "premium_granted",
        title: `🎁 You unlocked ${tier} from Cutzioo`,
        body: `All premium features are now unlocked${untilStr}. Enjoy!`,
      });
    }

    // Verify by re-reading
    const { data: verify } = await admin
      .from("subscribers")
      .select("user_id, email, subscribed, subscription_tier, subscription_end")
      .eq("id", savedId!)
      .maybeSingle();

    return new Response(JSON.stringify({ ok: true, subscriber: verify }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("superadmin-users error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

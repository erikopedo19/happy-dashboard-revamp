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

      const [{ data: profiles }, { data: subs }, { data: authSettings }, { data: fakeShopsSettings }, { count: fakeShopsCount }] = await Promise.all([
        admin.from("profiles").select("id, full_name, business_name, avatar_url, role").in("id", ids),
        admin.from("subscribers").select("user_id, email, subscribed, subscription_tier, subscription_end, stripe_customer_id, updated_at"),
        admin.from("app_settings").select("value").eq("key", "auth").maybeSingle(),
        admin.from("app_settings").select("value").eq("key", "fake_shops").maybeSingle(),
        admin.from("fake_barbershops").select("*", { count: "exact", head: true }),
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

      return new Response(JSON.stringify({
        users: rows,
        settings: {
          auth: authSettings?.value ?? { show_google_button: true },
          fake_shops: { ...(fakeShopsSettings?.value ?? { enabled: false }), count: fakeShopsCount ?? 0 },
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: upsert subscription
    const body = await req.json().catch(() => ({}));

    if (body?.action === "update_auth_settings") {
      const showGoogleButton = body?.show_google_button !== false;
      const { error } = await admin
        .from("app_settings")
        .upsert({
          key: "auth",
          value: { show_google_button: showGoogleButton },
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, settings: { auth: { show_google_button: showGoogleButton } } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "update_fake_shops_settings") {
      const enabled = body?.enabled === true;
      const { error } = await admin
        .from("app_settings")
        .upsert({
          key: "fake_shops",
          value: { enabled },
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, settings: { fake_shops: { enabled } } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "generate_fake_shops") {
      const count = Math.max(1, Math.min(200, Number(body?.count ?? 20)));
      const shops = buildFakeShops(count);
      const { error, data } = await admin.from("fake_barbershops").insert(shops).select("id");
      if (error) throw error;
      const { count: total } = await admin.from("fake_barbershops").select("*", { count: "exact", head: true });
      return new Response(JSON.stringify({ ok: true, generated: data?.length ?? 0, total: total ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "clear_fake_shops") {
      const { error } = await admin.from("fake_barbershops").delete().gt("created_at", "1900-01-01");
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, total: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (body?.action === "gift_newcomers") {
      const days = Number(body?.days ?? 10);
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const endIso = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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

      const newcomers = all.filter((u) =>
        u.email?.toLowerCase() !== SUPER_ADMIN_EMAIL &&
        new Date(u.created_at).getTime() >= cutoff
      );

      const { data: existing } = await admin
        .from("subscribers")
        .select("id, user_id, email, subscribed, subscription_end");

      const activeIds = new Set((existing ?? []).filter((s: any) =>
        s.subscribed && (!s.subscription_end || new Date(s.subscription_end) > new Date())
      ).map((s: any) => s.user_id));
      const activeEmails = new Set((existing ?? []).filter((s: any) =>
        s.subscribed && (!s.subscription_end || new Date(s.subscription_end) > new Date())
      ).map((s: any) => (s.email ?? "").toLowerCase()));
      const eligible = newcomers.filter((u) => !activeIds.has(u.id) && !activeEmails.has((u.email ?? "").toLowerCase()));

      for (const u of eligible) {
        const existingSub = (existing ?? []).find((s: any) =>
          s.user_id === u.id || (s.email ?? "").toLowerCase() === (u.email ?? "").toLowerCase()
        );

        if (existingSub?.id) {
          const { error } = await admin
            .from("subscribers")
            .update({
              user_id: u.id,
              email: u.email,
              subscribed: true,
              subscription_tier: "Pro",
              subscription_end: endIso,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);
          if (error) throw error;
        } else {
          const { error } = await admin
            .from("subscribers")
            .insert({
              user_id: u.id,
              email: u.email,
              subscribed: true,
              subscription_tier: "Pro",
              subscription_end: endIso,
            });
          if (error) throw error;
        }
      }

      if (eligible.length) {
        await admin.from("notifications").insert(eligible.map((u) => ({
          user_id: u.id,
          type: "premium_granted",
          title: "🎁 You got 10 days of Cutzioo Pro",
          body: `Welcome to Cutzioo. Your premium features are unlocked until ${new Date(endIso).toLocaleDateString()}.`,
        })));
      }

      return new Response(JSON.stringify({ ok: true, gifted: eligible.length, subscription_end: endIso }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

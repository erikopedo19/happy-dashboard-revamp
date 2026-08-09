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

type FakeShop = {
  name: string; description: string; city: string; country: string; locale: string;
  latitude: number; longitude: number;
};

const FAKE_POOLS: Record<string, { shops: string[]; bios: string[]; cities: { city: string; lat: number; lng: number }[]; country: string }> = {
  el: {
    country: "Greece",
    shops: ["Κουρείο Ακρόπολις", "Barber Olympus", "Το Ξυράφι", "Aegean Cuts", "Κουρείο Ερμής", "Athens Fade Co.", "Barbershop Παρθενών", "Λευκός Πύργος Cuts", "Kolonaki Grooming", "Kifisia Blades"],
    bios: [
      "Παραδοσιακό κούρεμα με μοντέρνο στιλ στην καρδιά της Αθήνας.",
      "Ζεστό ξύρισμα, κλασικά fade και ολίγον από ρακή. Καλώς ήρθες.",
      "Δύο γενιές κουρέων. Το ραντεβού σου είναι πάντα έτοιμο.",
      "Skin fades, γενειάδες και καφές freddo από νωρίς το πρωί.",
    ],
    cities: [
      { city: "Athens", lat: 37.9838, lng: 23.7275 },
      { city: "Thessaloniki", lat: 40.6401, lng: 22.9444 },
      { city: "Patras", lat: 38.2466, lng: 21.7346 },
      { city: "Heraklion", lat: 35.3387, lng: 25.1442 },
    ],
  },
  it: {
    country: "Italy",
    shops: ["Barberia Roma", "Il Rasoio d'Oro", "Milano Cuts", "Barberia Napoli", "Firenze Blades", "La Bottega del Barbiere", "Barberia Vespa"],
    bios: [
      "Rasatura calda, cura della barba e un espresso mentre aspetti.",
      "Taglio classico italiano dal 1998, sempre su appuntamento.",
      "Studio moderno, fade precisi e styling per ogni occasione.",
    ],
    cities: [
      { city: "Rome", lat: 41.9028, lng: 12.4964 },
      { city: "Milan", lat: 45.4642, lng: 9.19 },
      { city: "Naples", lat: 40.8518, lng: 14.2681 },
    ],
  },
  es: {
    country: "Spain",
    shops: ["Barbería Madrid", "El Corte del Rey", "Barcelona Fade", "Sevilla Blades", "La Navaja"],
    bios: [
      "Cortes clásicos y modernos con toque mediterráneo.",
      "Afeitado a navaja, tratamiento de barba y buen café.",
      "Estilo urbano en el corazón de la ciudad.",
    ],
    cities: [
      { city: "Madrid", lat: 40.4168, lng: -3.7038 },
      { city: "Barcelona", lat: 41.3874, lng: 2.1686 },
      { city: "Valencia", lat: 39.4699, lng: -0.3763 },
    ],
  },
  fr: {
    country: "France",
    shops: ["Barbier de Paris", "Le Rasoir", "Lyon Cuts", "Marseille Blades", "Coupe & Style"],
    bios: [
      "Coupes soignées et rasage traditionnel au coeur de la ville.",
      "L'art du barbier depuis trois générations.",
      "Ambiance feutrée, service impeccable.",
    ],
    cities: [
      { city: "Paris", lat: 48.8566, lng: 2.3522 },
      { city: "Lyon", lat: 45.7640, lng: 4.8357 },
      { city: "Marseille", lat: 43.2965, lng: 5.3698 },
    ],
  },
  en: {
    country: "United Kingdom",
    shops: ["London Fade Co.", "Sharp & Co Barbers", "The Gentlemen's Cut", "East End Blades", "Soho Barbershop"],
    bios: [
      "Skin fades, beard sculpting and a proper cup of coffee.",
      "Classic barbering with a modern edge since 2015.",
      "Walk-ins welcome, appointments recommended.",
    ],
    cities: [
      { city: "London", lat: 51.5074, lng: -0.1278 },
      { city: "Manchester", lat: 53.4808, lng: -2.2426 },
      { city: "Birmingham", lat: 52.4862, lng: -1.8904 },
    ],
  },
  de: {
    country: "Germany",
    shops: ["Berliner Barbier", "Hamburg Cuts", "Der Rasierer", "München Blades"],
    bios: [
      "Klassische Herrenschnitte und Bartpflege in entspannter Atmosphäre.",
      "Präzise Fades und Nassrasur mit heißen Tüchern.",
    ],
    cities: [
      { city: "Berlin", lat: 52.52, lng: 13.405 },
      { city: "Hamburg", lat: 53.5511, lng: 9.9937 },
      { city: "Munich", lat: 48.1351, lng: 11.582 },
    ],
  },
};

const BRAND_COLORS = ["#e0c4a8", "#0A84FF", "#FF375F", "#30D158", "#FF9F0A", "#BF5AF2", "#5E5CE6", "#64D2FF"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function buildFakeShops(count: number): FakeShop[] {
  const pools = Object.entries(FAKE_POOLS);
  const out: FakeShop[] = [];
  for (let i = 0; i < count; i++) {
    const [locale, pool] = pick(pools);
    const spot = pick(pool.cities);
    const name = pick(pool.shops);
    const bio = pick(pool.bios);
    const jitter = () => (Math.random() - 0.5) * 0.08;
    out.push({
      name,
      description: bio,
      city: spot.city,
      country: pool.country,
      locale,
      latitude: spot.lat + jitter(),
      longitude: spot.lng + jitter(),
    });
  }
  return out;
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

      const [{ data: profiles }, { data: subs }, { data: authSettings }, { data: fakeShopsSettings }, { data: totalBookingsData }, { count: fakeShopsCount }] = await Promise.all([
        admin.from("profiles").select("id, full_name, business_name, avatar_url, role, website_design_requested, heard_from").in("id", ids),
        admin.from("subscribers").select("user_id, email, subscribed, subscription_tier, subscription_end, stripe_customer_id, updated_at"),
        admin.from("app_settings").select("value").eq("key", "auth").maybeSingle(),
        admin.from("app_settings").select("value").eq("key", "fake_shops").maybeSingle(),
        admin.rpc("get_total_bookings"),
        admin.from("fake_barbershops").select("*", { count: "exact", head: true }),
      ]);
      const totalBookings = Number(totalBookingsData ?? 0);
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
          website_design_requested: (profile as any).website_design_requested ?? false,
          heard_from: (profile as any).heard_from ?? null,
          subscription: sub ? { ...sub, active } : null,
        };
      });

      return new Response(JSON.stringify({
        users: rows,
        totalBookings: totalBookings ?? 0,
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
      const shops = buildFakeShops(count).map((s) => ({
        ...s,
        brand_color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
        rating: Math.round((4.2 + Math.random() * 0.8) * 10) / 10,
        rating_count: Math.floor(20 + Math.random() * 400),
      }));
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

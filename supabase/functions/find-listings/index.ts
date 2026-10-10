// Finds public chair-rental, shop-space and staff-wanted listings near the user
// with Firecrawl web search, then uses Lovable AI to keep only real listings.
/* eslint-disable */
declare const Deno: { env: { get(k: string): string | undefined }; serve: (h: (r: Request) => Response | Promise<Response>) => void };
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, getLovableAiGatewayResponseHeaders } from "../_shared/run-id.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
};
const json = (b: unknown, status = 200, extra?: Headers) => {
  const h = new Headers(extra); Object.entries(cors).forEach(([k, v]) => h.set(k, v)); h.set("Content-Type", "application/json");
  return new Response(JSON.stringify(b), { status, headers: h });
};
const COOLDOWN_HOURS = 6;

const schema = {
  type: "object", additionalProperties: false, required: ["listings"],
  properties: {
    listings: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["source_index", "kind", "profession", "title", "short_description", "location", "price_text", "contact_phone"],
        properties: {
          source_index: { type: "integer" },
          kind: { type: "string", enum: ["rent", "space", "job"] },
          profession: { type: "string", enum: ["barber", "salon", "nails"] },
          title: { type: "string" },
          short_description: { type: "string" },
          location: { type: ["string", "null"] },
          price_text: { type: ["string", "null"] },
          contact_phone: { type: ["string", "null"] },
        },
      },
    },
  },
};

async function reverseCity(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lng}`, { headers: { "User-Agent": "Cutzioo/1.0 (cutzioo.com)" } });
    const j = await r.json();
    const a = j?.address ?? {};
    return a.city || a.town || a.municipality || a.county || a.state || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sbUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sbUser.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in to search for listings." }, 401);

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat), lng = Number(body.lng);
    let city = typeof body.city === "string" ? body.city.slice(0, 60).trim() : "";
    if (!city && Number.isFinite(lat) && Number.isFinite(lng)) city = (await reverseCity(lat, lng)) ?? "";
    if (!city) return json({ error: "We couldn't tell where you are. Allow location or type a city." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - COOLDOWN_HOURS * 3600_000).toISOString();
    const { count } = await admin.from("listings").select("id", { count: "exact", head: true })
      .eq("ai_found", true).ilike("location", `%${city}%`).gte("created_at", since);
    if ((count ?? 0) > 0) return json({ city, added: 0, cached: true });

    const LOVABLE = Deno.env.get("LOVABLE_API_KEY"), FC = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE || !FC) return json({ error: "Listing search is not set up yet." }, 500);

    const queries = [
      `ενοικίαση καρέκλας κουρείο ${city}`,
      `ζητείται κουρέας ${city}`,
      `ζητείται κομμώτρια κομμωτήριο ${city}`,
      `ζητείται nail artist ${city}`,
      `κουρείο κομμωτήριο προς ενοικίαση ${city}`,
    ];
    const results: { url: string; title: string; description: string }[] = [];
    for (const q of queries) {
      const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE}`, "X-Connection-Api-Key": FC },
        body: JSON.stringify({ query: q, limit: 6, tbs: "qdr:m", country: "GR" }),
      });
      if (!r.ok) { console.error("firecrawl", r.status, await r.text()); if (r.status === 402 || r.status === 403) break; continue; }
      const j = await r.json();
      const items = j?.data?.web ?? j?.data ?? [];
      for (const it of items) if (it?.url && !results.some((x) => x.url === it.url)) results.push({ url: it.url, title: String(it.title ?? ""), description: String(it.description ?? "").slice(0, 500) });
    }
    if (!results.length) return json({ city, added: 0 });

    const gw = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const res = await gw.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST", signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        instructions: "You sort public web search results for a barber app. Keep ONLY results that are a single, specific, current listing: a chair/booth for rent in a barbershop or salon (kind=rent), a whole shop/space for rent suited to a barbershop, hair or nail salon (kind=space), or a job opening for a barber, hairdresser or nail artist (kind=job). Drop directories, category pages, articles, social profiles and anything unrelated. Never invent facts: use only what the title/snippet says; use null when unknown. Write title and short_description (max 25 words) in English. profession: barber, salon (hairdresser) or nails.",
        input: `City: ${city}\n\nResults:\n${results.map((r, i) => `[${i}] ${r.title}\n${r.url}\n${r.description}`).join("\n\n")}`,
        text: { format: { type: "json_schema", name: "listings", strict: true, schema } },
      }),
    });
    const aig = getLovableAiGatewayResponseHeaders(res.headers);
    if (!res.ok) {
      const msg = res.status === 402 ? "AI credits have run out. Please try again later." : res.status === 429 ? "Too many requests — try again in a minute." : "Couldn't search right now.";
      return json({ error: msg }, res.status, aig);
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
          else if (ev.type === "response.refusal.delta") failed = "declined";
        } catch {}
      }
    }
    if (failed || !text) return json({ error: "Couldn't sort the results right now." }, 502, aig);

    const parsed = JSON.parse(text);
    const rows = (parsed.listings ?? []).map((l: any) => {
      const src = results[l.source_index]; if (!src) return null;
      let host = ""; try { host = new URL(src.url).hostname.replace(/^www\./, ""); } catch {}
      return {
        kind: l.kind, profession: l.profession,
        title: String(l.title).slice(0, 120), short_description: String(l.short_description ?? "").slice(0, 300),
        location: l.location ? `${l.location}${l.location.includes(city) ? "" : `, ${city}`}` : city,
        latitude: Number.isFinite(lat) ? lat : null, longitude: Number.isFinite(lng) ? lng : null,
        price_text: l.price_text, contact_phone: l.contact_phone,
        source_url: src.url, source_name: host, ai_found: true, published: true,
      };
    }).filter(Boolean);
    if (rows.length) {
      const { error } = await admin.from("listings").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
      if (error) console.error(error);
    }
    return json({ city, added: rows.length }, 200, aig);
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
});

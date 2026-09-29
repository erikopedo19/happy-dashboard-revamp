// Recommends Cutzioo subscription add-ons for a salon using Lovable AI.
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

const CATALOG = [
  { id: "pro", name: "Cutzioo Pro", desc: "Unlimited bookings (free plan caps at 20/month), full agenda, reports." },
  { id: "microsite", name: "Salon website", desc: "Premium mini-website for the shop with reviews, social links and booking." },
  { id: "card_payments", name: "Card payments", desc: "Clients pay by card when booking, paid out to the shop via Stripe." },
  { id: "client_reminders", name: "Past-client reminder (€3)", desc: "One-off €3 email to up to 25 past clients inviting them back." },
  { id: "reviews", name: "Review requests", desc: "Automatic requests for ratings after appointments." },
  { id: "team", name: "Team agenda", desc: "Multiple stylists, each with their own schedule and booking link." },
  { id: "push", name: "Push notifications", desc: "Instant alerts on the phone for new and changed bookings." },
];

const schema = {
  type: "object", additionalProperties: false, required: ["summary", "recommendations"],
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["id", "reason", "priority"],
        properties: {
          id: { type: "string", enum: CATALOG.map((c) => c.id) },
          reason: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
  },
};

const json = (b: unknown, status = 200, extra?: Headers) => {
  const h = new Headers(extra); Object.entries(cors).forEach(([k, v]) => h.set(k, v)); h.set("Content-Type", "application/json");
  return new Response(JSON.stringify(b), { status, headers: h });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in." }, 401);

    const body = await req.json().catch(() => ({}));
    const size = String(body.size ?? "").slice(0, 40);
    const volume = String(body.volume ?? "").slice(0, 40);
    const goals = (Array.isArray(body.goals) ? body.goals : []).map((g: unknown) => String(g).slice(0, 60)).slice(0, 8);
    const notes = String(body.notes ?? "").slice(0, 500);
    if (!size || !volume) return json({ error: "Please choose salon size and booking volume." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured." }, 500);

    const gw = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const res = await gw.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST", signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        instructions: "You advise barbershop and salon owners using the Cutzioo booking app. Recommend 2-4 add-ons ONLY from the catalog, most impactful first. Each reason: one friendly sentence under 25 words tied to their inputs. Summary: one sentence. Answer in the same language as the owner's notes if given, else English. Never use the word 'boost'.",
        input: `Catalog:\n${CATALOG.map((c) => `- ${c.id}: ${c.name} — ${c.desc}`).join("\n")}\n\nSalon size: ${size}\nMonthly bookings: ${volume}\nGoals: ${goals.join(", ") || "none given"}\nNotes: ${notes || "none"}`,
        text: { format: { type: "json_schema", name: "addon_recs", strict: true, schema } },
      }),
    });
    const aig = getLovableAiGatewayResponseHeaders(res.headers);
    if (!res.ok) {
      const t = await res.text();
      let msg = "Couldn't get recommendations right now.";
      try { msg = JSON.parse(t)?.error?.message || JSON.parse(t)?.message || msg; } catch {}
      if (res.status === 402) msg = "AI credits have run out. Please try again later.";
      if (res.status === 429) msg = "Too many requests — please try again in a minute.";
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
          else if (ev.type === "response.refusal.delta") failed = "The request was declined.";
        } catch {}
      }
    }
    if (failed || !text) return json({ error: failed || "No recommendation was returned." }, 502, aig);
    const parsed = JSON.parse(text);
    const recs = parsed.recommendations
      .map((r: any) => { const c = CATALOG.find((x) => x.id === r.id); return c ? { ...r, name: c.name, desc: c.desc } : null; })
      .filter(Boolean);
    return json({ summary: parsed.summary, recommendations: recs }, 200, aig);
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
});

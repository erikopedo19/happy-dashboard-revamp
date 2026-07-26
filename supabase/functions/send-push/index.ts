// send-push: fans out a notification to web push subscriptions and APNs device tokens
// Called by DB trigger on notifications insert. No JWT (public endpoint, no PII in payload).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendNotification } from "npm:web-push-neo@0.1.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// ---------- APNs (token-based auth) ----------
let cachedApnsJwt: { token: string; iat: number } | null = null;

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string) {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getApnsJwt(): Promise<string | null> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const pem = Deno.env.get("APNS_PRIVATE_KEY");
  if (!keyId || !teamId || !pem) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && now - cachedApnsJwt.iat < 2400) return cachedApnsJwt.token;

  const header = { alg: "ES256", kid: keyId };
  const claims = { iss: teamId, iat: now };
  const enc = (o: any) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const data = `${enc(header)}.${enc(claims)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(pem),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(data));
  const token = `${data}.${b64url(sigBuf)}`;
  cachedApnsJwt = { token, iat: now };
  return token;
}

async function sendApns(token: string, title: string, body: string) {
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  const sandbox = (Deno.env.get("APNS_USE_SANDBOX") ?? "true") === "true";
  const jwt = await getApnsJwt();
  if (!jwt || !bundleId) return { skipped: true };
  const host = sandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      "authorization": `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: "default", badge: 1 } }),
  });
  return { ok: res.ok, status: res.status };
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_id, appointment_id, title: reqTitle, body: reqBody, type: reqType } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });

    // Authenticate the request by requiring a freshly-created matching notification row
    // (the DB trigger writes the row and then calls this function). Use DB-stored title/body.
    let q = sb.from("notifications").select("title, body, type, appointment_id, created_at")
      .eq("user_id", user_id)
      .gt("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    if (appointment_id) q = q.eq("appointment_id", appointment_id);
    const { data: notif } = await q.maybeSingle();

    let title = reqTitle ?? "Notification";
    let body = reqBody ?? "";
    let type = reqType ?? "default";

    if (notif) {
      title = notif.title ?? title;
      body = notif.body ?? body;
      type = notif.type ?? type;
    } else if (!reqTitle || !reqBody) {
      // Trigger always sends title/body; if missing and no recent DB row, reject.
      return new Response(JSON.stringify({ error: "no recent matching notification" }), { status: 401, headers: corsHeaders });
    }

    const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:xmaxerikopedo19@gmail.com";

    console.log("send-push", { user_id, appointment_id, title, body, type, hasVapid: !!(vapidPub && vapidPriv) });

    // Web Push
    let webResults: any[] = [];
    if (vapidPub && vapidPriv) {
      const { data: subs } = await sb.from("push_subscriptions").select("*").eq("user_id", user_id);
      const payload = JSON.stringify({
        title,
        body,
        tag: appointment_id ?? type ?? "booking",
        url: "/admin",
      });
      webResults = await Promise.all((subs ?? []).map(async (s: any) => {
        try {
          const res = await sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            {
              vapidDetails: {
                subject: vapidSubject,
                publicKey: vapidPub,
                privateKey: vapidPriv,
              },
              TTL: 3600,
            },
          );
          const status = (res as any)?.statusCode ?? (res as any)?.status ?? (res as any)?.response?.statusCode;
          if (status === 404 || status === 410) {
            await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
          return { endpoint: s.endpoint, ok: status ? status < 400 : true, status };
        } catch (err: any) {
          // Clean up dead subscriptions
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
          return { endpoint: s.endpoint, ok: false, status: err?.statusCode };
        }
      }));
    }

    // APNs
    let apnsResults: any[] = [];
    const { data: tokens } = await sb.from("device_tokens").select("*").eq("user_id", user_id);
    apnsResults = await Promise.all((tokens ?? []).map(async (t: any) => {
      const r = await sendApns(t.token, title, body);
      if (r && (r as any).status === 410) {
        await sb.from("device_tokens").delete().eq("token", t.token);
      }
      return { token: t.token.slice(0, 8) + "…", ...r };
    }));

    return new Response(JSON.stringify({ ok: true, web: webResults, apns: apnsResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});

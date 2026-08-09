import { supabase } from "@/integrations/supabase/client";

let cachedVapid: string | null = null;
async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapid) return cachedVapid;
  try {
    const { data, error } = await (supabase as any).functions.invoke("vapid-public-key");
    if (error || !data?.key) return null;
    cachedVapid = data.key as string;
    return cachedVapid;
  } catch { return null; }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerSW() {
  if (!pushSupported()) return null;
  return await navigator.serviceWorker.register("/sw.js");
}

export async function enableBookingPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "Push not supported on this device/browser" };
  const vapid = await getVapidPublicKey();
  if (!vapid) return { ok: false, reason: "Server missing VAPID public key — add VAPID_PUBLIC_KEY secret" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not signed in" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, reason: perm === "denied" ? "Notifications are blocked. Enable them in your browser/site settings to receive alerts." : "Permission not granted" };
  }

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) return { ok: false, reason: "Could not register service worker" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }

  const json: any = sub.toJSON();
  await (supabase as any).from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: "endpoint" });

  return { ok: true };
}

export async function disableBookingPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await (supabase as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isBookingPushEnabled() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  return !!sub && Notification.permission === "granted";
}

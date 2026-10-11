import { supabase } from "@/integrations/supabase/client";
import { isNative, nativePlatform } from "./native";

type DeviceToken = {
  token: string;
  platform: "ios" | "android" | "expo" | "ios_liveactivity_start";
};

declare global {
  interface Window {
    __CUTZIO_PUSH__?: DeviceToken;
    __CUTZIO_LIVE_ACTIVITY__?: DeviceToken;
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

const pending = new Map<string, DeviceToken>();
const savedFor = new Set<string>();

async function saveToken(device: DeviceToken) {
  pending.set(device.token, device);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const key = `${user.id}:${device.token}`;
  if (savedFor.has(key)) {
    pending.delete(device.token);
    return;
  }
  const { error } = await supabase
    .from("device_tokens")
    .upsert({ user_id: user.id, token: device.token, platform: device.platform }, { onConflict: "token" });
  if (!error) {
    savedFor.add(key);
    pending.delete(device.token);
  }
}

async function registerCapacitorPush() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const platform = nativePlatform() === "android" ? "android" : "ios";

  await PushNotifications.addListener("registration", ({ value }) => {
    void saveToken({ token: value, platform });
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const url = (notification.data as { url?: string } | undefined)?.url;
    if (url && url.startsWith("/")) window.location.assign(url);
  });

  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive === "granted") await PushNotifications.register();
}

// Boots native push for both shells: the Capacitor app registers directly,
// and the Expo WebView wrapper injects its Expo push token into the page.
export function initNativePush() {
  if (typeof window === "undefined") return;

  const onExpoToken = () => {
    if (window.__CUTZIO_PUSH__?.token) void saveToken(window.__CUTZIO_PUSH__);
  };
  const onLiveActivityToken = () => {
    if (window.__CUTZIO_LIVE_ACTIVITY__?.token) {
      void saveToken(window.__CUTZIO_LIVE_ACTIVITY__);
    }
  };
  window.addEventListener("cutzio-push-token", onExpoToken);
  window.addEventListener("cutzio-live-activity-token", onLiveActivityToken);
  onExpoToken();
  onLiveActivityToken();
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "cutzio-push-request" }));
  }

  if (isNative()) void registerCapacitorPush().catch(() => {});

  // Tokens can arrive before sign-in — retry once a session exists.
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      for (const device of pending.values()) void saveToken(device);
    }
  });
}

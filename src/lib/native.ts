import { Capacitor } from "@capacitor/core";

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const nativePlatform = () => {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
};

/**
 * Boots native-only chrome (status bar + splash screen).
 * Safe no-op in the browser / Lovable preview.
 */
export async function initNativeShell() {
  // Expo WebView bridge — not Capacitor, but still a native shell.
  const inExpoWebView = typeof window !== "undefined" && !!(window as any).ReactNativeWebView;
  if (!isNative() && !inExpoWebView) return;

  document.documentElement.classList.add("is-native");
  if (isNative()) {
    document.documentElement.classList.add(`platform-${nativePlatform()}`);
  } else if (inExpoWebView) {
    document.documentElement.classList.add("platform-expo");
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const syncTheme = async () => {
      const dark = document.documentElement.classList.contains("dark");
      await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      if (nativePlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: dark ? "#0B0B0F" : "#F2F2F7" });
      }
    };
    await StatusBar.setOverlaysWebView({ overlay: true });
    await syncTheme();
    setTimeout(() => void syncTheme(), 100);
    new MutationObserver(() => void syncTheme()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  } catch {
    /* plugin unavailable */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Give the first paint a beat so the app fades in instead of flashing.
    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 350 }).catch(() => {}), 450);
  } catch {
    /* plugin unavailable */
  }
}

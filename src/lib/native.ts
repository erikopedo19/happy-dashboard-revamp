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
  if (!isNative()) return;

  document.documentElement.classList.add("is-native");
  document.documentElement.classList.add(`platform-${nativePlatform()}`);

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (nativePlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0B0B0F" });
    }
    await StatusBar.setOverlaysWebView({ overlay: true });
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

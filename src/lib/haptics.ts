/**
 * Lightweight haptic feedback helper.
 *
 * Uses the Vibration API where available (Android / Chrome) and falls back to
 * a silent no-op on devices that don't support it (most iOS Safari builds).
 */

import { isNative } from "./native";


export type HapticStyle =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  selection: 6,
  success: [10, 40, 18],
  warning: [16, 60, 16],
  error: [24, 50, 24, 50, 24],
};

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

async function nativeHaptic(style: HapticStyle) {
  const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
  switch (style) {
    case "selection":
      return Haptics.selectionStart().then(() => Haptics.selectionEnd());
    case "light":
      return Haptics.impact({ style: ImpactStyle.Light });
    case "medium":
      return Haptics.impact({ style: ImpactStyle.Medium });
    case "heavy":
      return Haptics.impact({ style: ImpactStyle.Heavy });
    case "success":
      return Haptics.notification({ type: NotificationType.Success });
    case "warning":
      return Haptics.notification({ type: NotificationType.Warning });
    case "error":
      return Haptics.notification({ type: NotificationType.Error });
  }
}

export function haptic(style: HapticStyle = "light") {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    if (isNative()) {
      void nativeHaptic(style).catch(() => {});
      return;
    }
    const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === "function") {
      nav.vibrate(PATTERNS[style] ?? PATTERNS.light);
    }
  } catch {
    /* no-op */
  }
}


export const hapticSelection = () => haptic("selection");
export const hapticImpact = () => haptic("medium");
export const hapticSuccess = () => haptic("success");
export const hapticWarning = () => haptic("warning");

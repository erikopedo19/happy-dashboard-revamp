import confetti from "canvas-confetti";
import { playBookingConfirmed } from "./sounds";

// canvas-confetti uses rAF + canvas — fine on iOS 15+. Below that it can
// glitch in WKWebView, so we check the OS version from the UA (allowed, it's
// just a capability check). Non-iOS platforms always fire.
const iosMajor = (): number | null => {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (!/iP(hone|ad|od)/.test(ua)) return null;
  const match = ua.match(/OS (\d+)_/);
  return match ? Number(match[1]) : null;
};

export function fireBookingConfetti() {
  // Springy confirm chime — plays even where the confetti itself is skipped.
  playBookingConfirmed();
  const v = iosMajor();
  if (v !== null && v < 15) return;
  const colors = ["#FF2D46", "#FF5A6E", "#E0152F", "#FFD0DA", "#FFFFFF"];
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.55 },
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 45,
      spread: 110,
      startVelocity: 26,
      scalar: 0.8,
      origin: { y: 0.55 },
      colors,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
  }, 220);
}

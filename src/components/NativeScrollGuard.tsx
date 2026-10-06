import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    __cutzioScrollCheck?: () => Record<string, unknown>;
  }
}

const isNativeShell = () =>
  typeof window !== "undefined" &&
  (document.documentElement.classList.contains("is-native") || !!(window as any).ReactNativeWebView);

/**
 * Keeps the app from behaving like a scrolling web page inside the Expo/Capacitor shell.
 * - When the content fits the screen (ignoring the safe-area padding), the document must not move:
 *   we snap it back to the top and toggle `no-doc-scroll` so the dead scroll stops.
 * - It re-evaluates on every resize / route change, so it never leaves a stale lock behind.
 * - `window.__cutzioScrollCheck()` returns a report you can run from a debugger to see why a page scrolls.
 */
export function NativeScrollGuard() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isNativeShell()) return;
    const root = document.documentElement;

    const metrics = () => {
      const cs = getComputedStyle(document.body);
      const bodyPadTop = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      const scrollHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
      const max = Math.max(0, scrollHeight - window.innerHeight);
      const tolerance = bodyPadTop + 6;
      let fits = max <= tolerance;
      let innerScroller = false;
      if (!fits && max <= 160) {
        // A dominant inner list already absorbs panning — the leftover document
        // overshoot is what makes the whole app rubber-band and show gaps.
        innerScroller = [...document.body.querySelectorAll<HTMLElement>("*")].some((el) => {
          const oy = getComputedStyle(el).overflowY;
          return (
            (oy === "auto" || oy === "scroll") &&
            el.scrollHeight > el.clientHeight + 8 &&
            el.clientHeight >= window.innerHeight * 0.5
          );
        });
        if (innerScroller) fits = true;
      }
      return { bodyPadTop, scrollHeight, innerHeight: window.innerHeight, max, tolerance, fits, innerScroller };
    };

    const apply = () => {
      const m = metrics();
      root.classList.toggle("no-doc-scroll", m.fits);
      if (m.fits && window.scrollY > 0) window.scrollTo(0, 0);
    };

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    window.__cutzioScrollCheck = () => {
      const m = metrics();
      const tooTall = [...document.body.querySelectorAll<HTMLElement>("*")]
        .filter((el) => el.getBoundingClientRect().bottom > window.innerHeight + m.tolerance && getComputedStyle(el).position !== "fixed")
        .slice(0, 8)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
      return { ...m, scrollY: window.scrollY, locked: root.classList.contains("no-doc-scroll"), overflowingElements: tooTall };
    };

    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(document.body);
    ro?.observe(root);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
    const settle = window.setTimeout(schedule, 400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("scroll", schedule);
      root.classList.remove("no-doc-scroll");
      delete window.__cutzioScrollCheck;
    };
  }, [pathname]);

  return null;
}

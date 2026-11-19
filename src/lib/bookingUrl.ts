import { isNative } from "@/lib/native";

export const PUBLIC_HOST = "cutzioo.com";
const PUBLIC_ORIGIN = `https://${PUBLIC_HOST}`;

/** First path segments owned by the app; a shop with one of these slugs keeps the /book/ prefix. */
const RESERVED = new Set([
  "auth", "c", "choose-mode", "onboarding", "book", "b", "manage", "review", "waitlist", "bookingforms",
  "find-barber", "find-barbershop", "my-bookings", "me", "favorites", "aggelies", "events", "app",
  "superadmin", "admin", "agenda", "customers", "choose-role", "complete-profile", "stylists", "teams",
  "reports", "services", "settings", "recap", "pricing", "payment-failed", "brand", "booking-page",
  "microsite", "site", "dbprevstats07", "terms", "privacy", "login", "products", "landing",
]);

const bookingPath = (slug: string) => (RESERVED.has(slug) ? `/book/${slug}` : `/${slug}`);

/** True for a shop's short public page (/<slug>), which shows no app chrome. */
export function isPublicBookingPath(pathname: string) {
  const m = /^\/([^/]+)\/?$/.exec(pathname);
  return !!m && !RESERVED.has(m[1]);
}

/** Dev servers and editor previews keep their own origin so links stay testable there. */
export function shareOrigin() {
  if (typeof window === "undefined" || isNative() || (window as any).ReactNativeWebView) return PUBLIC_ORIGIN;
  const { protocol, hostname, origin } = window.location;
  const devOrPreview = protocol === "http:" || /lovable|netlify\.app$|vercel\.app$/.test(hostname);
  return devOrPreview ? origin : PUBLIC_ORIGIN;
}

/** Link a shop hands out: https://cutzioo.com/<slug>. */
export function publicBookingUrl(slug?: string | null) {
  const s = (slug || "").trim();
  return s ? `${shareOrigin()}${bookingPath(s)}` : "";
}

/** Same link as people read it: Cutzioo.com/<slug>. */
export function displayBookingUrl(slug?: string | null) {
  const s = (slug || "").trim();
  return s ? `Cutzioo.com${bookingPath(s)}` : "";
}

// Writes public/sitemap.xml with the static marketing pages plus one entry per
// public barber profile (/b/:slug). Never fails the build: if Supabase can't be
// reached, the static pages are still written.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const SITE = "https://cutzioo.com";
const today = new Date().toISOString().slice(0, 10);

const STATIC = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/find-barber", changefreq: "daily", priority: "0.9" },
  { loc: "/find-barbershop", changefreq: "daily", priority: "0.9" },
  { loc: "/bookingforms", changefreq: "daily", priority: "0.8" },
  { loc: "/aggelies", changefreq: "daily", priority: "0.6" },
  { loc: "/auth", changefreq: "monthly", priority: "0.4" },
  { loc: "/terms", changefreq: "yearly", priority: "0.2" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.2" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function fetchBarbers() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/rpc/list_public_profiles`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return [...new Set(rows.map((r) => r.booking_link).filter(Boolean))];
  } catch (err) {
    console.warn(`[sitemap] barber profiles skipped: ${err.message}`);
    return [];
  }
}

const slugs = await fetchBarbers();
const urls = [
  ...STATIC,
  ...slugs.map((s) => ({ loc: `/b/${encodeURIComponent(s)}`, changefreq: "weekly", priority: "0.8" })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${esc(SITE + u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join("\n")}
</urlset>
`;

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`[sitemap] wrote ${urls.length} urls (${slugs.length} barber pages)`);

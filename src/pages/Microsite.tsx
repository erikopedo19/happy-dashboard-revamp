import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Seo, SITE } from "@/components/Seo";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
};

type Service = { id: string; name: string; price: number | null; duration: number | null };

type SiteData = {
  profile: Record<string, any>;
  microsite: Record<string, any> | null;
  services: Service[];
  reviews: Review[];
};

// Free-to-use Unsplash photos (Unsplash License) shown when the barber hasn't uploaded their own.
const IMG = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?q=70&w=${w}&auto=format&fit=crop`;
const STOCK = {
  hero: IMG("1503951914875-452162b0f3f1", 1200),
  gallery: [
    IMG("1622286342621-4bd786c2447c", 600),
    IMG("1622288432450-277d0fef5ed6", 600),
    IMG("1599351431202-1e0f0137899a", 600),
    IMG("1621605815971-fbc98d665033", 600),
  ],
};

// Public site data is cached on the device so repeat visits render instantly
// and only hit the database once per TTL window.
const CACHE_TTL = 10 * 60 * 1000;
const cacheKey = (slug: string) => `cutzio:site:${slug}`;
const readCache = (slug: string): { at: number; data: SiteData } | null => {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeCache = (slug: string, data: SiteData) => {
  try {
    localStorage.setItem(cacheKey(slug), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage full or disabled */
  }
};

const onAccent = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170 ? "#000000" : "#FFFFFF";
};

/** Paste-up poster panel — the page is a stack of these, each with a rotated spray tag. */
const Card = ({ tag, id, children, className }: { tag: string; id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={"st-card " + (className || "")}>
    <span className="st-tag">{tag}</span>
    <div className="mt-4">{children}</div>
  </section>
);

const Microsite = () => {
  const params = useParams();
  const [slug, setSlug] = useState("");
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const parts = window.location.hostname.split(".");
    const reserved = new Set(["www", "app", "admin", "api", "id-preview--d3037d9e-a098-4a0c-984e-428e241859a9"]);
    let resolved = params.slug || "";
    if (!resolved && parts.length >= 3 && !reserved.has(parts[0])) resolved = parts[0];
    setSlug(resolved);
  }, [params.slug]);

  useEffect(() => {
    if (!slug) return;
    const cached = readCache(slug);
    if (cached) {
      setData(cached.data);
      setLoading(false);
      if (Date.now() - cached.at < CACHE_TTL) return;
    }
    let alive = true;
    (async () => {
      const { data: res, error } = await supabase.rpc("get_microsite_by_slug", { _slug: slug });
      if (!alive) return;
      const site = res as unknown as SiteData | null;
      if (error || !site?.profile) {
        if (!cached) setNotFound(true);
      } else {
        setData(site);
        writeCache(slug, site);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="street-site flex min-h-screen items-center justify-center">
        <p className="st-mono text-[14px] tracking-[0.2em]">LOADING…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="street-site flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Seo title="404 – Site not found | Cutzioo" description="This barber doesn't have a published site yet." path={`/site/${slug}`} noindex />
        <h1 className="st-display text-[44px]"><span className="st-outline">404</span> <span className="st-word-accent">NOT FOUND</span></h1>
        <p className="st-mono mt-3 text-[13px] opacity-70">This barber doesn't have a published site yet.</p>
        <a href="https://cutzioo.com" className="st-link st-mono mt-6 text-[13px]">&lt;&lt; back to cutzioo.com</a>
      </div>
    );
  }

  const m = data.microsite || {};
  const p = data.profile;
  const businessName: string = p.business_name || "Studio";
  const headline: string = m.headline || businessName;
  const tagline: string = m.tagline || p.description || "Sharp cuts, easy booking.";
  const about: string = m.about || "";
  const hero: string = m.hero_url || p.banner_url || STOCK.hero;
  const logo: string | null = m.logo_url || p.avatar_url || null;
  const ownGallery: string[] = Array.isArray(m.gallery) ? m.gallery.filter(Boolean) : [];
  const gallery = ownGallery.length ? ownGallery : STOCK.gallery;
  const bookingUrl = `/book/${p.booking_link}`;
  const rating = Number(p.rating) || 5;
  const reviewCount: number = p.rating_count || 0;
  const reviews = Array.isArray(data.reviews) ? data.reviews.slice(0, 6) : [];
  const services = Array.isArray(data.services) ? data.services : [];
  const address: string | null = m.address || p.address || null;
  const place = address ? address.split(",").slice(-1)[0].trim() : null;
  const socials = [
    m.instagram && { href: m.instagram, label: "Instagram" },
    m.tiktok && { href: m.tiktok, label: "TikTok" },
    m.facebook && { href: m.facebook, label: "Facebook" },
    m.whatsapp && {
      href: String(m.whatsapp).startsWith("http") ? m.whatsapp : `https://wa.me/${String(m.whatsapp).replace(/[^0-9]/g, "")}`,
      label: "WhatsApp",
    },
    m.website_url && { href: m.website_url, label: "Website" },
  ].filter(Boolean) as { href: string; label: string }[];
  const accent: string = /^#[0-9a-f]{6}$/i.test(p.brand_color || "") && p.brand_color.toUpperCase() !== "#0A84FF" ? p.brand_color : "#FF2D46";
  const accentFg = onAccent(accent);
  const price = (v: number | null) => `$${Number(v || 0).toFixed(0)}`;
  const stars = (n: number) => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));
  const counter = String(Math.max(reviewCount, 1) * 137 + services.length * 11).padStart(6, "0");

  const nav = [
    about && { href: "#about", label: "About" },
    services.length > 0 && { href: "#services", label: "Prices" },
    { href: "#work", label: "Gallery" },
    reviews.length > 0 && { href: "#reviews", label: "Reviews" },
    { href: "#visit", label: "Visit" },
  ].filter(Boolean) as { href: string; label: string }[];

  const ticker = [
    `★ NOW BOOKING ONLINE ★`,
    `${businessName.toUpperCase()}`,
    `RATED ${rating.toFixed(1)}/5`,
    services[0] ? `${services[0].name.toUpperCase()} FROM ${price(services[0].price)}` : null,
    place ? `LIVE IN ${place.toUpperCase()}` : null,
    `WALK IN FRESH`,
  ].filter(Boolean).join("  ///  ");

  const words = headline.split(/\s+/).filter(Boolean);
  const headMain = words.slice(0, -1).join(" ");
  const headLast = words[words.length - 1] || businessName;

  return (
    <div id="top" className="street-site min-h-screen overflow-x-clip pb-24 md:pb-0" style={{ "--accent": accent, "--accent-fg": accentFg } as React.CSSProperties}>
      <Seo
        title={`${businessName}${place ? ` – Barber in ${place}` : ""} | Official Site`}
        description={`${tagline} Book ${businessName} online in seconds.`}
        path={`/site/${slug}`}
        image={hero}
        jsonLd={{ "@context": "https://schema.org", "@type": "HairSalon", name: businessName, url: `${SITE}/site/${slug}`, image: hero, ...(address && { address }), ...(p.phone && { telephone: p.phone }) }}
      />
      <div className="st-grain" aria-hidden />

      {/* marquee */}
      <div className="st-marquee" aria-hidden>
        <div className="st-marquee-track">
          <span>{ticker}  ///  </span><span>{ticker}  ///  </span>
        </div>
      </div>

      <div className="mx-auto max-w-[820px] px-4 py-8 md:py-12">
        {/* masthead */}
        <header className="relative text-center">
          <div className="st-mist" aria-hidden />
          {logo && <img src={logo} alt={`${businessName} logo`} className="mx-auto mb-4 h-16 w-16 border-2 border-white/25 object-cover shadow-[4px_4px_0_rgba(0,0,0,0.6)]" />}
          <p className="st-mono text-[11px] uppercase tracking-[0.3em] opacity-70">{place ? `est. fresh — ${place}` : "est. fresh"}</p>
          <h1 className="st-display st-spray-in mt-2 text-[52px] md:text-[84px]">
            {headMain && <span className="st-outline">{headMain} </span>}
            <span className="st-word-accent">{headLast}</span>
          </h1>
          <div className="st-drips mx-auto max-w-[280px]" aria-hidden />
          <p className="st-mono mt-4 text-[14px] opacity-80">// {tagline}</p>
          <nav className="st-mono mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px] uppercase tracking-[0.18em]">
            {nav.map((l) => <a key={l.href} href={l.href} className="st-link">{l.label}</a>)}
          </nav>
        </header>

        <div className="st-stripe mt-7" aria-hidden />

        {/* hero print, taped to the wall */}
        <div className="st-spray-in mt-7" style={{ animationDelay: "0.15s" }}>
          <div className="st-hero">
            <span className="st-tape" style={{ top: -10, left: 20, transform: "rotate(-38deg)" }} aria-hidden />
            <span className="st-tape" style={{ top: -10, right: 20, transform: "rotate(38deg)" }} aria-hidden />
            <img src={hero} alt={businessName} {...{ fetchpriority: "high" }} decoding="async" className="st-hero-img" />
            <span className="st-hero-stencil">Fresh cuts — book online</span>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3 text-center">
          <Link to={bookingUrl} className="st-btn text-[19px]">Book an appointment</Link>
          <p className="st-mono text-[12px] opacity-70">
            <span style={{ color: accent }}>{stars(rating)}</span> {rating.toFixed(1)} · {reviewCount} reviews{place ? ` · ${place}` : ""}
          </p>
        </div>

        <div className="mt-9 space-y-7">
          {about && (
            <Card tag="About us" id="about">
              {about.split(/\n\n+/).map((para, i) => (
                <p key={i} className={"text-[15px] leading-relaxed text-white/80" + (i ? " mt-3" : "")}>{para}</p>
              ))}
            </Card>
          )}

          {services.length > 0 && (
            <Card tag="Price list" id="services">
              <ul>
                {services.map((s, i) => (
                  <li key={s.id} className="st-price-row">
                    <span className="font-bold uppercase tracking-wide">{s.name}{i === 0 && <span className="st-fresh">Fresh</span>}</span>
                    {s.duration ? <span className="st-mono text-[11px] opacity-50">{s.duration}m</span> : null}
                    <span className="st-dots" aria-hidden />
                    <span className="st-display text-[17px]" style={{ color: accent }}>{price(s.price)}</span>
                    <Link to={bookingUrl} className="st-link st-mono text-[12px]">book&gt;</Link>
                  </li>
                ))}
              </ul>
              <p className="st-mono mt-4 text-[11px] uppercase tracking-[0.14em] opacity-50">* no hidden fees — book online 24/7</p>
            </Card>
          )}

          <Card tag="The work" id="work">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {gallery.slice(0, 8).map((g, i) => (
                <figure key={g + i} className="st-pic">
                  <img src={g} alt={`${businessName} haircut ${i + 1}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                </figure>
              ))}
            </div>
          </Card>

          {reviews.length > 0 && (
            <Card tag="The wall — client tags" id="reviews">
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="st-note">
                    <p className="st-mono text-[11.5px] uppercase tracking-[0.12em] opacity-70">
                      <span className="font-bold text-white">{r.reviewer_name || "anonymous"}</span> · {new Date(r.created_at).toLocaleDateString("en-US")}
                      <span className="ml-2" style={{ color: accent }}>{stars(r.rating)}</span>
                    </p>
                    {r.comment && <p className="mt-1.5 text-[15px] leading-snug text-white/85">"{r.comment}"</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card tag="Find us" id="visit">
            <dl className="st-mono grid grid-cols-[86px_1fr] gap-y-2.5 text-[13px]">
              {address && (<><dt className="font-bold uppercase tracking-[0.12em] opacity-60">Addr:</dt><dd><a className="st-link" href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">{address}</a></dd></>)}
              {m.hours && (<><dt className="font-bold uppercase tracking-[0.12em] opacity-60">Hours:</dt><dd className="whitespace-pre-line">{m.hours}</dd></>)}
              {p.phone && (<><dt className="font-bold uppercase tracking-[0.12em] opacity-60">Phone:</dt><dd><a className="st-link" href={`tel:${p.phone}`}>{p.phone}</a></dd></>)}
              {socials.length > 0 && (<><dt className="font-bold uppercase tracking-[0.12em] opacity-60">Links:</dt><dd className="flex flex-wrap gap-x-4">{socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="st-link">{s.label}</a>)}</dd></>)}
            </dl>
            <div className="mt-5 text-center">
              <Link to={bookingUrl} className="st-btn">Book online now</Link>
            </div>
          </Card>
        </div>

        {/* footer */}
        <footer className="st-mono mt-10 space-y-4 text-center text-[11px]">
          <div className="st-stripe" aria-hidden />
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="st-badge">Cuts served {counter}</span>
            <a href="https://cutzioo.com" target="_blank" rel="noreferrer" className="st-badge st-badge-accent">Made with Cutzioo</a>
          </div>
          <p className="opacity-50">© {new Date().getFullYear()} {businessName} · all rights reserved · <a href="#top" className="st-link">back to top ^</a></p>
        </footer>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 bg-[#0B0B0D] p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden" style={{ borderColor: accent }}>
        <Link to={bookingUrl} className="st-btn flex w-full justify-center text-[16px]">Book appointment</Link>
      </div>
    </div>
  );
};

export default Microsite;
